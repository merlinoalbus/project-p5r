// ============================================================
// giornataService — la giornata della guida come canone: voci ordinate, modificabili, spuntabili per uid
// ============================================================
//
// Richiesta dell'utente (2026-09-30): le voci aggiunte finivano sempre in fondo; ora si sceglie il punto esatto e si
// spostano su e giù tutte le voci, azioni della guida comprese; e «le modifiche diventano nuovo canone a tutti gli
// effetti quindi non sono mai singola partita... ma tutte devono alterare i dati iniziali». Le voci stanno nel file di
// gioco (`voce_giornata`, migrazione 092): chi esporta il pacchetto le porta con sé. Azione della guida, cosa da fare ed
// evento sono la stessa cosa: tipo, collegamento verificato, rango atteso, effetti della spunta; eventi, scadenze e
// promemoria si mostrano ma non si spuntano. L'ordine è `ordine` 0, 1, 2… dentro la fascia, senza buchi.
// Le spunte stanno nel file delle partite (`spunta_voce_partita`) e si agganciano all'uid, che non cambia spostando,
// correggendo o cambiando fascia. Eliminare una voce la toglie dalla guida con le sue spunte; se in qualche partita è
// spuntata con effetti si rifiuta, perché quegli effetti resterebbero applicati senza più una spunta da cui disfarli.
// ============================================================

import { randomBytes } from 'node:crypto';
import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { verificaPartita } from './verificaPartita.js';
import { registraEvento } from './storicoService.js';
import { confidenti } from './partiteService.js';
import { applicaEffettiAzione, annullaEffettiAzione, descriviEffettiApplicati, type OpzioniSpunta } from './effettiAzioneService.js';
import { mappaAzione, nomeRiferimento, nomiEffetti, statoAzione, testoEffetti, verificaEffetti } from './azioniStrutturateService.js';
import { atterraggioDelGiorno } from './atterraggioPalazziService.js';
import { normalizzaEffettiAzione, TIPI_AZIONE, TIPI_RIFERIMENTO_AZIONE, type EffettoAzione, type NomiEffettiAzione } from '../../shared/effettiAzione.js';
import type { AzionePercorsoDto, ConfidentePartitaDto, DatiVoceGiornata, EffettiAzioneDto, FasciaGioco, GenereVoce, QuizVoceDto, RiferimentoAzioneDto, TrasferisciVociGiornata, VociTrasferiteDto } from '../../shared/types.js';
import { attivitaConQuiz, quizVoceDto, type AttivitaConQuiz } from './attivitaService.js';
import { conLegami } from './mappe/legamiInfiltrazioni.js';
import { puntoDescrittivo } from '../../shared/spilli.js';
import type { EsitoRevisioneVoce } from '../../shared/types.js';

export interface RigaVoce {
  uid: string; data: string; fascia: string; ordine: number; genere: string; azione: string; note: string | null; tipo: string;
  riferimento_tipo: string | null; riferimento_chiave: string | null; riferimento_testo: string | null; rango_atteso: number | null;
  produce_json: string; indice_guida: number | null; created_at: string; updated_at: string;
  /** L3 §1.4 (migrazione 110; assenti su uno schema di prima): voce aggiunta, corretta o segnalata dal team, da rivedere con l'utente. */
  da_rivedere?: number; aggiunta_da?: string | null; testo_precedente_json?: string | null; motivo_revisione?: string | null;
}

const TIPI = new Set<string>(TIPI_AZIONE.map((t) => t.chiave));
const TIPI_RIF = new Set<string>(TIPI_RIFERIMENTO_AZIONE.map((t) => t.chiave));
const GENERI = new Set<GenereVoce>(['azione', 'evento', 'scadenza', 'promemoria']);

/** La fascia della voce: «sera» se lo è, altrimenti «giorno». */
const fasciaDi = (r: RigaVoce): FasciaGioco => (r.fascia === 'sera' ? 'sera' : 'giorno');
/** Il genere della voce, ricondotto ad «azione» se il valore salvato non è uno di quelli noti. */
const genereDi = (r: RigaVoce): GenereVoce => (GENERI.has(r.genere as GenereVoce) ? (r.genere as GenereVoce) : 'azione');
/** Il tipo d'azione della voce, ricondotto ad «altro» se il valore salvato non è fra i tipi noti. */
function tipoDi(r: RigaVoce): AzionePercorsoDto['tipo'] {
  return (TIPI.has(r.tipo) ? r.tipo : 'altro') as AzionePercorsoDto['tipo'];
}
/** Il collegamento, se è di un tipo che la giornata conosce (un evento scritto prima del 2026-09-30 può averne un altro). */
function riferimentoDi(r: RigaVoce): RiferimentoAzioneDto | null {
  return r.riferimento_tipo && r.riferimento_chiave && TIPI_RIF.has(r.riferimento_tipo) ? { tipo: r.riferimento_tipo as RiferimentoAzioneDto['tipo'], chiave: r.riferimento_chiave } : null;
}
/** Gli effetti della spunta salvati nella voce, normalizzati; un JSON illeggibile non ne dà nessuno. */
function produceDi(r: RigaVoce): EffettoAzione[] {
  try { return normalizzaEffettiAzione(JSON.parse(r.produce_json)); } catch { return []; }
}
/** Il nome del collegamento: quello salvato (la guida lo scrive a modo suo), altrimenti quello dell'elemento. */
function nomeDi(r: RigaVoce, rif: RiferimentoAzioneDto | null): string | null {
  if (!rif) return null;
  if (r.riferimento_testo) return r.riferimento_testo;
  // un elemento nascosto dal catalogo non si collega di nuovo, ma la voce che lo ha già ne tiene il nome
  try { return nomeRiferimento(rif, { ancheNascosti: true }); } catch { return null; }
}

/** Una voce con i campi della guida, senza lo stato nella partita (fatta, effetti, semaforo). */
export interface VoceBase { uid: string; giorno: string; fascia: FasciaGioco; genere: GenereVoce; azione: string; tipo: AzionePercorsoDto['tipo']; riferimento: RiferimentoAzioneDto | null; riferimentoTesto: string | null; rangoAtteso: number | null; note: string | null; produce: EffettoAzione[] }

/** La voce con i soli campi della guida, con i valori fuori catalogo ricondotti a quelli predefiniti; gli effetti li ha
 *  solo un'azione (eventi, scadenze e promemoria non si spuntano). */
export function voceBase(r: RigaVoce): VoceBase {
  const riferimento = riferimentoDi(r);
  return {
    uid: r.uid, giorno: r.data, fascia: fasciaDi(r), genere: genereDi(r), azione: r.azione, tipo: tipoDi(r), riferimento, riferimentoTesto: nomeDi(r, riferimento),
    rangoAtteso: r.rango_atteso, note: r.note, produce: genereDi(r) === 'azione' ? produceDi(r) : [],
  };
}

interface Contesto { fatte: Map<string, EffettiAzioneDto | null>; conf: Map<string, ConfidentePartitaDto> | null; nomi: NomiEffettiAzione; quiz: Map<string, AttivitaConQuiz>;
  /** La partita (L3: per l'infiltrazione che «Entra» apre). */
  partita?: number }

/** La guida del quiz delle attività di cui la voce registra un turno o a cui è collegata (richiesta dell'utente, 2026-10-17:
 *  «quando è previsto lavoro al Convenience Store deve essere consultabile la guida»), una volta sola per attività, con
 *  `oggi` vero se il giorno della voce è uno dei giorni del quiz. */
function quizDellaVoce(v: VoceBase, quiz: Contesto['quiz']): QuizVoceDto[] {
  const chiavi = [...v.produce.flatMap((e) => (e.tipo === 'turno' ? [e.attivita] : [])), ...(v.riferimento?.tipo === 'attivita' ? [v.riferimento.chiave] : [])];
  return [...new Set(chiavi)].flatMap((c) => {
    const q = quiz.get(c);
    return q ? [quizVoceDto(c, q, v.giorno)] : [];
  });
}

/** La voce per l'interfaccia: i campi della guida più la frase degli effetti, la spunta e i suoi effetti nella partita,
 *  il semaforo (solo per le azioni, e solo se ci sono i Confidenti della partita), la mappa collegata e la guida del quiz. */
function voceDto(r: RigaVoce, ctx: Contesto): AzionePercorsoDto {
  const v = voceBase(r);
  const spuntabile = v.genere === 'azione';
  return {
    ...v, produceTesto: testoEffetti(v.produce, ctx.nomi),
    fatta: spuntabile && ctx.fatte.has(r.uid), effetti: ctx.fatte.get(r.uid) ?? null,
    stato: ctx.conf && spuntabile ? statoAzione(v, ctx.conf) : null, mappa: mappaAzione(v),
    // il Palazzo collegato: dove si atterra il giorno della voce, con le regole della mappa di Tokyo (scelta dell'utente, 2026-10-04)
    atterraggio: v.riferimento?.tipo === 'dungeon' ? atterraggioDelGiorno(v.riferimento.chiave, v.giorno) : null,
    quiz: quizDellaVoce(v, ctx.quiz),
    // L3: il campo «Infiltrazioni» (solo per le voci di un Palazzo) e lo stato «da rivedere» (solo se c'è)
    ...campiInfiltrazioni(r, ctx.partita),
    ...campiRevisione(r),
  };
}

// ---- L3: il campo «Infiltrazioni» delle voci di Palazzo (lotti/L3/modifiche.md §2.1.6, §3.4, §4.4) ----
//
// Una voce può descrivere più infiltrazioni: il legame è un insieme **ordinato** (`voce_infiltrazione`, la chiave è la posizione), che
// solo l'utente scrive (nessuna migrazione lo fa) e che non tocca testo, ordine, giorno, fascia, uid né spunte della voce. La stessa
// infiltrazione può tornare, mai in due posizioni di seguito. Accanto, una **proposta**: le righe di G-022 dell'Esperto della guida
// (`proposta_infiltrazione_voce`, 110), oppure, per le voci scritte dopo, le due regole certe calcolate a richiesta.

/** Le infiltrazioni di un Palazzo, in ordine. */
function infiltrazioniDelPalazzo(palazzo: string): Array<{ chiave: string; nome: string; ordine: number }> {
  return prepared('SELECT chiave, nome, ordine FROM dungeon_area WHERE dungeon_chiave = ? ORDER BY ordine, chiave').all(palazzo) as Array<{ chiave: string; nome: string; ordine: number }>;
}

/** L'insieme scelto per la voce, nell'ordine (con il Palazzo di ogni infiltrazione). */
function insiemeDellaVoce(uid: string): Array<{ chiave: string; nome: string; dungeon: string }> {
  return prepared(`SELECT i.chiave, i.nome, i.dungeon_chiave AS dungeon FROM voce_infiltrazione v JOIN dungeon_area i ON i.chiave = v.infiltrazione_chiave
    WHERE v.voce_uid = ? ORDER BY v.ordine`).all(uid) as Array<{ chiave: string; nome: string; dungeon: string }>;
}

/** Le righe della proposta di G-022 per la voce, in ordine (con il Palazzo di ogni infiltrazione). */
function propostaSalvata(uid: string): Array<{ chiave: string; nome: string; dungeon: string; motivo: string; certezza: 'certa' | 'multipla' | 'probabile' }> {
  return prepared(`SELECT i.chiave, i.nome, i.dungeon_chiave AS dungeon, p.motivo, p.certezza FROM proposta_infiltrazione_voce p JOIN dungeon_area i ON i.chiave = p.infiltrazione_chiave
    WHERE p.voce_uid = ? ORDER BY p.ordine`).all(uid) as Array<{ chiave: string; nome: string; dungeon: string; motivo: string; certezza: 'certa' | 'multipla' | 'probabile' }>;
}

/** Vero se il dungeon è un Palazzo (i Memento non hanno il campo: R3-12). */
function ePalazzo(dungeon: string): boolean {
  return !!prepared("SELECT 1 FROM dungeon WHERE chiave = ? AND tipo = 'palazzo'").get(dungeon);
}

/**
 * Il Palazzo della voce, che decide se il campo c'è e quali infiltrazioni ammette (§2.1.6, regola unica): quello del riferimento
 * `dungeon:<k>`; altrimenti quello delle infiltrazioni già nell'insieme; altrimenti quello della sua proposta; altrimenti nessuno.
 */
export function palazzoDellaVoce(r: Pick<RigaVoce, 'uid' | 'riferimento_tipo' | 'riferimento_chiave'>): string | null {
  if (!conLegami()) return null;
  if (r.riferimento_tipo === 'dungeon' && r.riferimento_chiave && ePalazzo(r.riferimento_chiave)) return r.riferimento_chiave;
  const insieme = insiemeDellaVoce(r.uid);
  if (insieme.length > 0) return insieme[0].dungeon;
  const proposta = propostaSalvata(r.uid);
  return proposta.length > 0 ? proposta[0].dungeon : null;
}

/** Il testo confrontabile: minuscolo, senza accenti né punteggiatura, parole separate da uno spazio. */
function normalizzato(testo: string): string {
  return ` ${testo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;
}

/**
 * La proposta per la voce, solo con l'insieme vuoto: le righe di G-022, oppure le regole certe a richiesta — (a) il nome di **una sola**
 * infiltrazione del Palazzo compare nel testo della voce (senza maiuscole, accenti e punteggiatura); (b) la data della voce (`gg/mm`)
 * compare nel nome di **una sola** infiltrazione. Più candidati, o nessuno: nessuna proposta.
 */
export function propostaInfiltrazioni(r: Pick<RigaVoce, 'uid' | 'data' | 'azione' | 'note'>, palazzo: string): AzionePercorsoDto['propostaInfiltrazioni'] {
  const salvata = propostaSalvata(r.uid).filter((p) => p.dungeon === palazzo);
  if (salvata.length > 0) return { infiltrazioni: salvata.map(({ chiave, nome }) => ({ chiave, nome })), motivo: salvata[0].motivo, certezza: salvata[0].certezza };
  const elenco = infiltrazioniDelPalazzo(palazzo);
  const testo = normalizzato(`${r.azione} ${r.note ?? ''}`);
  const perNome = elenco.filter((i) => normalizzato(i.nome).trim() && testo.includes(normalizzato(i.nome)));
  if (perNome.length === 1) return { infiltrazioni: [{ chiave: perNome[0].chiave, nome: perNome[0].nome }], motivo: 'Il nome dell’infiltrazione è nel testo della voce.', certezza: 'certa' };
  const [mm, gg] = r.data.split('-');
  const perData = elenco.filter((i) => new RegExp(`(^|[^0-9])${gg}/${mm}([^0-9]|$)`).test(i.nome));
  if (perData.length === 1) return { infiltrazioni: [{ chiave: perData[0].chiave, nome: perData[0].nome }], motivo: 'La data della voce è nel nome dell’infiltrazione.', certezza: 'certa' };
  return null;
}

/** Le infiltrazioni completate nella partita: almeno una voce da segnare, e tutte segnate (la regola di `completamentoAree.ts`). */
function infiltrazioniCompletate(chiavi: readonly string[], partitaId: number): Set<string> {
  const out = new Set<string>();
  for (const k of new Set(chiavi)) {
    const voci = prepared('SELECT chiave, tipo, area_dedalo_chiave FROM punto_interesse WHERE area_chiave = ?').all(k) as Array<{ chiave: string; tipo: string; area_dedalo_chiave: string | null }>;
    const daSegnare = voci.filter((v) => !puntoDescrittivo(v.tipo, v.area_dedalo_chiave));
    if (daSegnare.length > 0 && daSegnare.every((v) => prepared('SELECT 1 FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').get(partitaId, v.chiave))) out.add(k);
  }
  return out;
}

/**
 * I campi del §3.1 per una voce con un Palazzo; nessuno per le altre (assenti, non vuoti). `infiltrazioneDaAprire` («Entra», §4.4, UX3-1
 * con la decisione del PM): con l'insieme valorizzato la prima non completata, oppure l'ultima; con l'insieme vuoto e una proposta la
 * **prima della proposta**, qualunque sia la certezza; senza insieme né proposta il campo è assente (l'interfaccia apre «in corso»).
 */
function campiInfiltrazioni(r: RigaVoce, partitaId?: number): Partial<AzionePercorsoDto> {
  const palazzo = palazzoDellaVoce(r);
  if (!palazzo) return {};
  const insieme = insiemeDellaVoce(r.uid).map(({ chiave, nome }) => ({ chiave, nome }));
  const proposta = insieme.length === 0 ? propostaInfiltrazioni(r, palazzo) : null;
  let daAprire: string | undefined;
  if (insieme.length > 0) {
    const completate = partitaId === undefined ? new Set<string>() : infiltrazioniCompletate(insieme.map((i) => i.chiave), partitaId);
    daAprire = insieme.find((i) => !completate.has(i.chiave))?.chiave ?? insieme[insieme.length - 1].chiave;
  } else if (proposta && proposta.infiltrazioni.length > 0) daAprire = proposta.infiltrazioni[0].chiave;
  return {
    infiltrazioni: insieme, infiltrazioniDelPalazzo: infiltrazioniDelPalazzo(palazzo),
    propostaInfiltrazioni: proposta,
    ...(daAprire !== undefined ? { infiltrazioneDaAprire: daAprire } : {}),
  };
}

/** Una voce della giornata per uid, com'è nel suo giorno (con la partita, il suo stato): la scheda del Palazzo aperta da una voce
 *  (`?daVoce=`, UX3-1) la legge per dire da quale proposta viene. 404 `voce-non-trovata`. */
export function vocePercorso(uid: string, partitaId?: number): AzionePercorsoDto {
  if (partitaId !== undefined) verificaPartita(partitaId);
  const r = rigaVoce(uid);
  return vociDelGiorno(r.data, partitaId).find((v) => v.uid === uid)!;
}

/** Lo stato «da rivedere» (§1.4) della voce, solo quando c'è qualcosa da dire (assente vale «non da rivedere»). */
function campiRevisione(r: RigaVoce): Partial<AzionePercorsoDto> {
  if (!r.da_rivedere && !r.aggiunta_da && !r.testo_precedente_json && !r.motivo_revisione) return {};
  let testoPrecedente: AzionePercorsoDto['testoPrecedente'] = null;
  if (r.testo_precedente_json) {
    const p = JSON.parse(r.testo_precedente_json) as { azione: string; note: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null; riferimento_testo: string | null };
    const riferimento = riferimentoDi({ ...r, riferimento_tipo: p.riferimento_tipo, riferimento_chiave: p.riferimento_chiave });
    testoPrecedente = { azione: p.azione, note: p.note, riferimento, riferimentoTesto: p.riferimento_testo };
  }
  return { daRivedere: r.da_rivedere === 1, aggiuntaDa: r.aggiunta_da === 'team' ? 'team' : null, motivoRevisione: r.motivo_revisione ?? null, testoPrecedente };
}

/**
 * L'insieme ordinato delle infiltrazioni di una voce (R3-37), anche vuoto («nessuna»): sostituisce quello di prima in una transazione e
 * scrive **solo** `voce_infiltrazione` (testo, ordine, giorno, fascia, uid e spunte della voce restano). Solo infiltrazioni del Palazzo
 * della voce (400 `infiltrazione-di-un-altro-palazzo`), che esistono (400 `infiltrazione-inesistente`); la stessa può tornare, ma non
 * in due posizioni di seguito (400 `infiltrazione-ripetuta-di-seguito`). Una voce senza Palazzo non ha il campo (400 `voce-senza-palazzo`).
 */
export function impostaInfiltrazioniVoce(uid: string, chiavi: readonly string[], partitaId?: number): AzionePercorsoDto {
  if (partitaId !== undefined) verificaPartita(partitaId);
  const r = rigaVoce(uid);
  const palazzo = palazzoDellaVoce(r);
  if (!palazzo) throw httpErrors.badRequest('voce-senza-palazzo', 'Questa voce non riguarda un Palazzo: non ha il campo «Infiltrazioni».');
  for (const k of new Set(chiavi)) {
    const i = prepared('SELECT nome, dungeon_chiave FROM dungeon_area WHERE chiave = ?').get(k) as { nome: string; dungeon_chiave: string } | undefined;
    if (!i) throw httpErrors.badRequest('infiltrazione-inesistente', `L’infiltrazione '${k}' non esiste.`);
    if (i.dungeon_chiave !== palazzo) throw httpErrors.badRequest('infiltrazione-di-un-altro-palazzo', `«${i.nome}» è di un altro Palazzo: la voce si lega alle infiltrazioni del suo.`);
  }
  if (chiavi.some((k, i) => i > 0 && k === chiavi[i - 1])) throw httpErrors.badRequest('infiltrazione-ripetuta-di-seguito', 'La stessa infiltrazione non può stare due volte di seguito: un percorso ci torna dopo un’altra.');
  getDb().transaction(() => {
    prepared('DELETE FROM voce_infiltrazione WHERE voce_uid = ?').run(uid);
    chiavi.forEach((k, i) => prepared('INSERT INTO voce_infiltrazione (voce_uid, ordine, infiltrazione_chiave) VALUES (?, ?, ?)').run(uid, i, k));
  })();
  return vociDelGiorno(r.data, partitaId).find((v) => v.uid === uid)!;
}

/**
 * «Da rivedere» (§1.4, il meccanismo unico con L10): «Tieni il nuovo» (`tieni`) e «Fatto» (`fatto`) tolgono il segno; «Rimetti il
 * precedente» (`rimetti`) rimette i campi com'erano prima della correzione del team (il testo precedente resta) e toglie il segno — solo
 * con un testo precedente (400 `senza-testo-precedente`). Una voce non da rivedere: 409 `voce-non-da-rivedere`.
 */
export function rivediVoce(uid: string, esito: EsitoRevisioneVoce, partitaId?: number): AzionePercorsoDto {
  if (partitaId !== undefined) verificaPartita(partitaId);
  const r = rigaVoce(uid);
  if (r.da_rivedere !== 1) throw httpErrors.conflict('voce-non-da-rivedere', 'Questa voce non è da rivedere.');
  if (esito === 'rimetti') {
    if (!r.testo_precedente_json) throw httpErrors.badRequest('senza-testo-precedente', 'Questa voce non ha un testo precedente da rimettere.');
    const p = JSON.parse(r.testo_precedente_json) as { azione: string; note: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null; riferimento_testo: string | null };
    prepared(`UPDATE voce_giornata SET azione = ?, note = ?, riferimento_tipo = ?, riferimento_chiave = ?, riferimento_testo = ?, da_rivedere = 0, updated_at = ? WHERE uid = ?`)
      .run(p.azione, p.note, p.riferimento_tipo, p.riferimento_chiave, p.riferimento_testo, nowIso(), uid);
  } else {
    prepared('UPDATE voce_giornata SET da_rivedere = 0 WHERE uid = ?').run(uid);
  }
  return vociDelGiorno(r.data, partitaId).find((v) => v.uid === uid)!;
}

/** 404 se la data non è un giorno del percorso. */
function giornoEsiste(data: string): void {
  if (!prepared('SELECT 1 FROM giorno_percorso WHERE data = ?').get(data)) throw httpErrors.notFound('giorno-non-trovato', `Nessun giorno del percorso il ${data}.`);
}

/** Le voci di un giorno nel loro ordine: prima di giorno, poi di sera. */
export function righeDelGiorno(data: string): RigaVoce[] {
  return prepared("SELECT * FROM voce_giornata WHERE data = ? ORDER BY CASE fascia WHEN 'giorno' THEN 0 ELSE 1 END, ordine, uid").all(data) as RigaVoce[];
}

/** Le spunte della partita sulle voci di un giorno (o di tutti i giorni), con gli effetti che hanno applicato. */
export function spuntePartita(partitaId: number | undefined, data?: string): Map<string, EffettiAzioneDto | null> {
  if (partitaId === undefined) return new Map();
  const righe = (data === undefined
    ? prepared('SELECT voce_uid, effetti_json FROM spunta_voce_partita WHERE partita_id = ?').all(partitaId)
    : prepared('SELECT s.voce_uid, s.effetti_json FROM spunta_voce_partita s JOIN voce_giornata v ON v.uid = s.voce_uid WHERE s.partita_id = ? AND v.data = ?').all(partitaId, data)) as Array<{ voce_uid: string; effetti_json: string | null }>;
  return new Map(righe.map((r) => [r.voce_uid, r.effetti_json ? (JSON.parse(r.effetti_json) as EffettiAzioneDto) : null]));
}

/** Le voci di un giorno per l'interfaccia, con lo stato nella partita se indicata. `conf`: i Confidenti, se chi chiama li ha già. */
export function vociDelGiorno(data: string, partitaId?: number, conf?: Map<string, ConfidentePartitaDto> | null): AzionePercorsoDto[] {
  if (partitaId !== undefined) verificaPartita(partitaId);
  const ctx: Contesto = {
    fatte: spuntePartita(partitaId, data),
    conf: conf ?? (partitaId !== undefined ? new Map(confidenti(partitaId).map((c) => [c.chiave, c])) : null),
    nomi: nomiEffetti(), quiz: attivitaConQuiz(), partita: partitaId,
  };
  return righeDelGiorno(data).map((r) => voceDto(r, ctx));
}

/** Per l'indice dei giorni: quante azioni (le voci che si spuntano) ha ogni giorno e quante sono fatte nella partita. */
export function conteggiGiornate(partitaId?: number): Map<string, { azioni: number; fatte: number }> {
  const righe = (partitaId === undefined
    ? prepared("SELECT data, COUNT(*) AS azioni, 0 AS fatte FROM voce_giornata WHERE genere = 'azione' GROUP BY data").all()
    : prepared(`SELECT v.data AS data, COUNT(*) AS azioni, COUNT(s.voce_uid) AS fatte FROM voce_giornata v
        LEFT JOIN spunta_voce_partita s ON s.voce_uid = v.uid AND s.partita_id = ? WHERE v.genere = 'azione' GROUP BY v.data`).all(partitaId)) as Array<{ data: string; azioni: number; fatte: number }>;
  return new Map(righe.map((r) => [r.data, { azioni: r.azioni, fatte: r.fatte }]));
}

/** La riga della voce con quell'uid; 404 se non esiste. */
function rigaVoce(uid: string): RigaVoce {
  const r = prepared('SELECT * FROM voce_giornata WHERE uid = ?').get(uid) as RigaVoce | undefined;
  if (!r) throw httpErrors.notFound('voce-non-trovata', 'Questa voce della giornata non esiste (più).');
  return r;
}

/** Mette la voce al posto `posizione` della fascia (0 = in cima; oltre l'ultimo o omesso = in fondo) e rinumera la fascia. */
function posiziona(data: string, fascia: FasciaGioco, uid: string, posizione?: number): void {
  const altre = (prepared('SELECT uid FROM voce_giornata WHERE data = ? AND fascia = ? AND uid <> ? ORDER BY ordine, uid').all(data, fascia, uid) as Array<{ uid: string }>).map((r) => r.uid);
  const dove = posizione === undefined ? altre.length : Math.max(0, Math.min(Math.trunc(posizione), altre.length));
  altre.splice(dove, 0, uid);
  const scrivi = prepared('UPDATE voce_giornata SET ordine = ? WHERE uid = ?');
  altre.forEach((u, i) => scrivi.run(i, u));
}

/** Rinumera una fascia 0, 1, 2… (dopo che una voce se n'è andata). */
function compatta(data: string, fascia: string): void {
  const scrivi = prepared('UPDATE voce_giornata SET ordine = ? WHERE uid = ?');
  (prepared('SELECT uid FROM voce_giornata WHERE data = ? AND fascia = ? ORDER BY ordine, uid').all(data, fascia) as Array<{ uid: string }>).forEach((r, i) => scrivi.run(i, r.uid));
}

/** Collegamento ed effetti da salvare: quelli nuovi si verificano (devono puntare a elementi che esistono), quelli che la voce ha
 *  già passano come sono (correggere una nota non fallisce se il catalogo ha nascosto il libro collegato). */
function struttura(d: DatiVoceGiornata, r?: RigaVoce): { riferimento?: { tipo: string; chiave: string; testo: string | null } | null; produce?: EffettoAzione[] } {
  const out: { riferimento?: { tipo: string; chiave: string; testo: string | null } | null; produce?: EffettoAzione[] } = {};
  if (d.riferimento !== undefined) {
    if (d.riferimento === null) {
      // «nessun collegamento» a una voce che non ne ha già: invariata (la guida ha voci col solo nome, senza collegamento)
      if (!r || r.riferimento_tipo !== null || r.riferimento_chiave !== null) out.riferimento = null;
    } else {
      // un collegamento nuovo si verifica (400 se punta al nulla) e il suo nome si legge ogni volta dall'elemento, così segue le
      // rinomine del pacchetto; quello che la voce ha già tiene il nome che aveva (la guida lo scrive a modo suo)
      const stesso = r && r.riferimento_tipo === d.riferimento.tipo && r.riferimento_chiave === d.riferimento.chiave;
      if (!stesso) nomeRiferimento(d.riferimento);
      out.riferimento = { tipo: d.riferimento.tipo, chiave: d.riferimento.chiave, testo: stesso ? r!.riferimento_testo : null };
    }
  }
  if (d.produce !== undefined) {
    const normalizzati = normalizzaEffettiAzione(d.produce);
    const stessi = r && normalizzati.length === d.produce.length && JSON.stringify(normalizzati) === JSON.stringify(produceDi(r));
    out.produce = stessi ? normalizzati : verificaEffetti(d.produce);
  }
  return out;
}

/** Il testo senza spazi ai bordi; undefined se non è stato inviato, 400 se resta vuoto. */
function testoValido(x: string | undefined): string | undefined {
  if (x === undefined) return undefined;
  const t = x.trim();
  if (!t) throw httpErrors.badRequest('voce-vuota', 'Il testo della voce non può essere vuoto.');
  return t;
}
/** Le note senza spazi ai bordi: undefined se non inviate (restano com'erano), null se nulle o vuote. */
const noteValide = (n: string | null | undefined) => (n === undefined ? undefined : n === null || n.trim() === '' ? null : n.trim());

/** Aggiunge una voce alla giornata (canone, per tutte le partite), al posto indicato della fascia (in fondo se omesso). */
export function creaVoce(data: string, d: DatiVoceGiornata, partitaId?: number): AzionePercorsoDto {
  // la partita (per rispondere con lo stato) si controlla prima di scrivere: un 404 dopo aver cambiato la guida mentirebbe
  if (partitaId !== undefined) verificaPartita(partitaId);
  giornoEsiste(data);
  const azione = testoValido(d.azione);
  if (!azione) throw httpErrors.badRequest('voce-vuota', 'Scrivi che cosa c\'è da fare o che cosa succede.');
  const genere: GenereVoce = d.genere ?? 'azione';
  const fascia: FasciaGioco = d.fascia ?? 'giorno';
  const { riferimento, produce } = struttura(d);
  const uid = randomBytes(16).toString('hex');
  const adesso = nowIso();
  getDb().transaction(() => {
    prepared(`INSERT INTO voce_giornata (uid, data, fascia, ordine, genere, azione, note, tipo, riferimento_tipo, riferimento_chiave, riferimento_testo, rango_atteso, produce_json, indice_guida, created_at, updated_at)
      VALUES (?, ?, ?, 1000000, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`).run(uid, data, fascia, genere, azione, noteValide(d.note) ?? null, genere === 'azione' ? d.tipo ?? 'altro' : 'altro',
      riferimento?.tipo ?? null, riferimento?.chiave ?? null, riferimento?.testo ?? null, d.rangoAtteso ?? null, JSON.stringify(genere === 'azione' ? produce ?? [] : []), adesso, adesso);
    posiziona(data, fascia, uid, d.posizione);
  })();
  return vociDelGiorno(data, partitaId).find((v) => v.uid === uid)!;
}

/** Modifica una voce: testo, note, genere, tipo, collegamento, rango, effetti, fascia e posto nella fascia. */
export function aggiornaVoce(uid: string, d: DatiVoceGiornata, partitaId?: number): AzionePercorsoDto {
  if (partitaId !== undefined) verificaPartita(partitaId);
  const r = rigaVoce(uid);
  const azione = testoValido(d.azione);
  const genere: GenereVoce = d.genere ?? genereDi(r);
  const fascia: FasciaGioco = d.fascia ?? fasciaDi(r);
  const { riferimento, produce } = struttura(d, r);
  getDb().transaction(() => {
    if (genere !== 'azione' && genereDi(r) === 'azione') {
      // un'azione diventa evento: non si spunta più. Con effetti applicati in una partita no (andrebbero persi senza poterli
      // disfare); senza effetti le sue spunte non servono più e se ne vanno
      const conEffetti = partiteConEffetti(uid);
      if (conEffetti.length) throw httpErrors.conflict('voce-con-effetti', `Questa azione è spuntata con effetti in ${conEffetti.map((n) => `«${n}»`).join(', ')}: togli prima la spunta, poi cambiala in evento.`);
      prepared('DELETE FROM spunta_voce_partita WHERE voce_uid = ?').run(uid);
    }
    prepared(`UPDATE voce_giornata SET azione = ?, note = ?, genere = ?, fascia = ?, tipo = ?, riferimento_tipo = ?, riferimento_chiave = ?, riferimento_testo = ?, rango_atteso = ?, produce_json = ?, updated_at = ? WHERE uid = ?`).run(
      azione ?? r.azione, d.note === undefined ? r.note : noteValide(d.note), genere, fascia, genere === 'azione' ? d.tipo ?? r.tipo : 'altro',
      riferimento === undefined ? r.riferimento_tipo : riferimento?.tipo ?? null, riferimento === undefined ? r.riferimento_chiave : riferimento?.chiave ?? null,
      riferimento === undefined ? r.riferimento_testo : riferimento?.testo ?? null, d.rangoAtteso === undefined ? r.rango_atteso : d.rangoAtteso,
      genere !== 'azione' ? '[]' : produce === undefined ? r.produce_json : JSON.stringify(produce), nowIso(), uid);
    if (fascia !== fasciaDi(r)) {
      // cambia fascia: al posto chiesto, altrimenti in fondo alla fascia nuova; la vecchia si ricompatta
      prepared('UPDATE voce_giornata SET ordine = 1000000 WHERE uid = ?').run(uid);
      posiziona(r.data, fascia, uid, d.posizione);
      compatta(r.data, r.fascia);
    } else if (d.posizione !== undefined) {
      posiziona(r.data, fascia, uid, d.posizione);
    }
  })();
  return vociDelGiorno(r.data, partitaId).find((v) => v.uid === uid)!;
}

/** Sposta una voce di un passo dentro la sua fascia (-1 su, +1 giù); ai bordi non cambia nulla. */
export function spostaVoce(uid: string, verso: -1 | 1, partitaId?: number): AzionePercorsoDto[] {
  if (partitaId !== undefined) verificaPartita(partitaId);
  const r = rigaVoce(uid);
  getDb().transaction(() => {
    compatta(r.data, r.fascia);
    const ora = (prepared('SELECT ordine FROM voce_giornata WHERE uid = ?').get(uid) as { ordine: number }).ordine;
    posiziona(r.data, fasciaDi(r), uid, ora + verso);
  })();
  return vociDelGiorno(r.data, partitaId);
}

/**
 * Copia o sposta una o più voci in un altro giorno e fascia (richiesta dell'utente, 2026-10-12: «copiare elementi del diario...
 * e poterli inserire in un altro giorno o nella parte giorno o nella parte notte a scelta»; scelte «Una o più insieme» e «Sì,
 * anche spostare»). Le voci arrivano in fondo alla fascia, nell'ordine che avevano (giorno, poi giorno prima di sera, poi posto).
 *   - «copia»: ogni voce diventa una voce nuova (uid nuovo) con lo stesso contenuto — genere, testo, note, tipo, collegamento
 *     (col nome che aveva), rango atteso, effetti —, senza spunte e senza legame con la guida d'origine (`indice_guida`);
 *   - «sposta»: le stesse voci cambiano giorno e fascia; uid e spunte delle partite restano; le fasce lasciate si ricompattano;
 *     cambiando data perdono `indice_guida` (resta solo nella stessa data).
 * Tutto in una transazione: una voce che non c'è fa fallire tutto (404) senza aver scritto niente.
 */
export function trasferisciVoci(t: TrasferisciVociGiornata, partitaId?: number): VociTrasferiteDto {
  if (partitaId !== undefined) verificaPartita(partitaId);
  giornoEsiste(t.giorno);
  const righe = t.uid.map(rigaVoce);
  const ordineGiorno = new Map((prepared('SELECT data, ordine FROM giorno_percorso').all() as Array<{ data: string; ordine: number }>).map((r) => [r.data, r.ordine]));
  // l'ordine che avevano: giorno, poi le voci di giorno prima di quelle di sera, poi il posto nella fascia
  righe.sort((a, b) => (ordineGiorno.get(a.data) ?? 0) - (ordineGiorno.get(b.data) ?? 0) || (fasciaDi(a) === fasciaDi(b) ? 0 : fasciaDi(a) === 'giorno' ? -1 : 1) || a.ordine - b.ordine || a.uid.localeCompare(b.uid));
  const adesso = nowIso();
  const arrivate: string[] = [];
  getDb().transaction(() => {
    const lasciate = new Set<string>();
    righe.forEach((r, i) => {
      // dietro a tutte quelle che ci sono già, nell'ordine dell'elenco; la fascia si ricompatta alla fine
      const ordine = 1000000 + i;
      if (t.modo === 'sposta') {
        // `indice_guida` è la posizione nella guida di QUEL giorno (indice unico per data): cambiando data la voce non ne discende
        // più e lo perde, altrimenti urterebbe la voce della guida con lo stesso indice nel giorno d'arrivo o ne prenderebbe il posto
        // per chi cerca per data e indice; nella stessa data (cambia solo fascia) resta, come in «Sposta di giorno/di sera»
        prepared('UPDATE voce_giornata SET data = ?, fascia = ?, ordine = ?, indice_guida = CASE WHEN data = ? THEN indice_guida ELSE NULL END, updated_at = ? WHERE uid = ?')
          .run(t.giorno, t.fascia, ordine, t.giorno, adesso, r.uid);
        lasciate.add(`${r.data}|${r.fascia}`);
        arrivate.push(r.uid);
      } else {
        const uid = randomBytes(16).toString('hex');
        prepared(`INSERT INTO voce_giornata (uid, data, fascia, ordine, genere, azione, note, tipo, riferimento_tipo, riferimento_chiave, riferimento_testo, rango_atteso, produce_json, indice_guida, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`).run(uid, t.giorno, t.fascia, ordine, r.genere, r.azione, r.note, r.tipo,
          r.riferimento_tipo, r.riferimento_chiave, r.riferimento_testo, r.rango_atteso, r.produce_json, adesso, adesso);
        arrivate.push(uid);
      }
    });
    for (const chiave of lasciate) { const [data, fascia] = chiave.split('|'); compatta(data, fascia); }
    compatta(t.giorno, t.fascia);
  })();
  return { giorno: t.giorno, fascia: t.fascia, uid: arrivate, voci: vociDelGiorno(t.giorno, partitaId) };
}

/** Le partite in cui la voce è spuntata con effetti (punti del Confidente, turni, visioni): finché ci sono non la si elimina. */
function partiteConEffetti(uid: string): string[] {
  return (prepared(`SELECT p.nome FROM spunta_voce_partita s JOIN partita p ON p.id = s.partita_id
    WHERE s.voce_uid = ? AND s.effetti_json IS NOT NULL ORDER BY p.nome`).all(uid) as Array<{ nome: string }>).map((r) => r.nome);
}

/**
 * Elimina una voce dalla guida (per sempre, per tutte le partite: scelta dell'utente, «Rimuovi» elimina). Se in qualche partita
 * è spuntata con effetti si rifiuta (409) dicendo dove: gli effetti vanno annullati togliendo prima la spunta, altrimenti
 * resterebbero applicati senza più una spunta da cui disfarli. Le spunte senza effetti se ne vanno con la voce.
 */
export function eliminaVoce(uid: string): void {
  const r = rigaVoce(uid);
  getDb().transaction(() => {
    const conEffetti = partiteConEffetti(uid);
    if (conEffetti.length) {
      throw httpErrors.conflict('voce-con-effetti', `Questa voce è spuntata con effetti in ${conEffetti.length === 1 ? 'una partita' : `${conEffetti.length} partite`} (${conEffetti.map((n) => `«${n}»`).join(', ')}): togli prima la spunta in ciascuna per annullarne gli effetti, poi eliminala.`);
    }
    prepared('DELETE FROM voce_giornata WHERE uid = ?').run(uid);
    prepared('DELETE FROM spunta_voce_partita WHERE voce_uid = ?').run(uid);
    // L3: l'insieme d'infiltrazioni e la proposta della voce se ne vanno con lei (la chiave è l'uid, senza vincolo)
    if (conLegami()) {
      prepared('DELETE FROM voce_infiltrazione WHERE voce_uid = ?').run(uid);
      prepared('DELETE FROM proposta_infiltrazione_voce WHERE voce_uid = ?').run(uid);
    }
    compatta(r.data, r.fascia);
  })();
}

/**
 * Spunta o toglie un'azione nella partita. Alla spunta applica ciò che l'azione produce (`produce`: letture, turni; note del
 * Confidente se `noteRisposta` è indicato, col bonus dell'arcano) e lo registra; togliendo la spunta lo annulla (le letture
 * restano: si disfano dalla loro pagina). Eventi, scadenze e promemoria non si spuntano.
 */
export function spuntaVoce(partitaId: number, uid: string, fatta: boolean, opz: OpzioniSpunta = {}): AzionePercorsoDto {
  verificaPartita(partitaId);
  const r = rigaVoce(uid);
  const v = voceBase(r);
  if (v.genere !== 'azione') throw httpErrors.badRequest('voce-non-spuntabile', 'Un evento, una scadenza o un promemoria non si spuntano.');
  const adesso = nowIso();
  getDb().transaction(() => {
    const precedente = prepared('SELECT effetti_json FROM spunta_voce_partita WHERE partita_id = ? AND voce_uid = ?').get(partitaId, uid) as { effetti_json: string | null } | undefined;
    if (fatta) {
      if (precedente) return; // già spuntata: niente punti una seconda volta
      const effetti = applicaEffettiAzione(partitaId, { ...v, momento: { data: r.data, fascia: v.fascia, origine: 'azione' } }, opz);
      prepared('INSERT INTO spunta_voce_partita (partita_id, voce_uid, fatta_at, effetti_json) VALUES (?, ?, ?, ?)').run(partitaId, uid, adesso, effetti ? JSON.stringify(effetti) : null);
      const dett = [`${v.fascia === 'sera' ? 'Sera' : 'Giorno'} · ${v.tipo}${v.riferimentoTesto ? ` · ${v.riferimentoTesto}` : ''}`];
      if (effetti) dett.push(descriviEffettiApplicati(effetti));
      registraEvento(partitaId, 'percorso', `Percorso ${r.data}: ${v.azione.slice(0, 80)}${v.azione.length > 80 ? '…' : ''}`, `${dett.join(' · ')}.`, { data: r.data, voce: uid, tipo: v.tipo, riferimento: v.riferimento, effetti });
    } else {
      if (precedente?.effetti_json) annullaEffettiAzione(partitaId, JSON.parse(precedente.effetti_json) as EffettiAzioneDto);
      prepared('DELETE FROM spunta_voce_partita WHERE partita_id = ? AND voce_uid = ?').run(partitaId, uid);
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  return vociDelGiorno(r.data, partitaId).find((x) => x.uid === uid)!;
}
