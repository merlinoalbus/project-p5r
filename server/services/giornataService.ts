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
import { registraEvento } from './storicoService.js';
import { confidenti } from './partiteService.js';
import { applicaEffettiAzione, annullaEffettiAzione, descriviEffettiApplicati, type OpzioniSpunta } from './effettiAzioneService.js';
import { mappaAzione, nomeRiferimento, nomiEffetti, statoAzione, testoEffetti, verificaEffetti } from './azioniStrutturateService.js';
import { normalizzaEffettiAzione, TIPI_AZIONE, TIPI_RIFERIMENTO_AZIONE, type EffettoAzione, type NomiEffettiAzione } from '../../shared/effettiAzione.js';
import type { AzionePercorsoDto, ConfidentePartitaDto, DatiVoceGiornata, EffettiAzioneDto, FasciaGioco, GenereVoce, RiferimentoAzioneDto } from '../../shared/types.js';

export interface RigaVoce {
  uid: string; data: string; fascia: string; ordine: number; genere: string; azione: string; note: string | null; tipo: string;
  riferimento_tipo: string | null; riferimento_chiave: string | null; riferimento_testo: string | null; rango_atteso: number | null;
  produce_json: string; indice_guida: number | null; created_at: string; updated_at: string;
}

const TIPI = new Set<string>(TIPI_AZIONE.map((t) => t.chiave));
const TIPI_RIF = new Set<string>(TIPI_RIFERIMENTO_AZIONE.map((t) => t.chiave));
const GENERI = new Set<GenereVoce>(['azione', 'evento', 'scadenza', 'promemoria']);

const fasciaDi = (r: RigaVoce): FasciaGioco => (r.fascia === 'sera' ? 'sera' : 'giorno');
const genereDi = (r: RigaVoce): GenereVoce => (GENERI.has(r.genere as GenereVoce) ? (r.genere as GenereVoce) : 'azione');
function tipoDi(r: RigaVoce): AzionePercorsoDto['tipo'] {
  return (TIPI.has(r.tipo) ? r.tipo : 'altro') as AzionePercorsoDto['tipo'];
}
/** Il collegamento, se è di un tipo che la giornata conosce (un evento scritto prima del 2026-09-30 può averne un altro). */
function riferimentoDi(r: RigaVoce): RiferimentoAzioneDto | null {
  return r.riferimento_tipo && r.riferimento_chiave && TIPI_RIF.has(r.riferimento_tipo) ? { tipo: r.riferimento_tipo as RiferimentoAzioneDto['tipo'], chiave: r.riferimento_chiave } : null;
}
function produceDi(r: RigaVoce): EffettoAzione[] {
  try { return normalizzaEffettiAzione(JSON.parse(r.produce_json)); } catch { return []; }
}
/** Il nome del collegamento: quello salvato (la guida lo scrive a modo suo), altrimenti quello dell'elemento. */
function nomeDi(r: RigaVoce, rif: RiferimentoAzioneDto | null): string | null {
  if (!rif) return null;
  if (r.riferimento_testo) return r.riferimento_testo;
  try { return nomeRiferimento(rif); } catch { return null; }
}

/** Una voce con i campi della guida, senza lo stato nella partita (fatta, effetti, semaforo). */
export interface VoceBase { uid: string; giorno: string; fascia: FasciaGioco; genere: GenereVoce; azione: string; tipo: AzionePercorsoDto['tipo']; riferimento: RiferimentoAzioneDto | null; riferimentoTesto: string | null; rangoAtteso: number | null; note: string | null; produce: EffettoAzione[] }

export function voceBase(r: RigaVoce): VoceBase {
  const riferimento = riferimentoDi(r);
  return {
    uid: r.uid, giorno: r.data, fascia: fasciaDi(r), genere: genereDi(r), azione: r.azione, tipo: tipoDi(r), riferimento, riferimentoTesto: nomeDi(r, riferimento),
    rangoAtteso: r.rango_atteso, note: r.note, produce: genereDi(r) === 'azione' ? produceDi(r) : [],
  };
}

interface Contesto { fatte: Map<string, EffettiAzioneDto | null>; conf: Map<string, ConfidentePartitaDto> | null; nomi: NomiEffettiAzione }

function voceDto(r: RigaVoce, ctx: Contesto): AzionePercorsoDto {
  const v = voceBase(r);
  const spuntabile = v.genere === 'azione';
  return {
    ...v, produceTesto: testoEffetti(v.produce, ctx.nomi),
    fatta: spuntabile && ctx.fatte.has(r.uid), effetti: ctx.fatte.get(r.uid) ?? null,
    stato: ctx.conf && spuntabile ? statoAzione(v, ctx.conf) : null, mappa: mappaAzione(v),
  };
}

function partitaEsiste(partitaId: number): void {
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
}

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
  if (partitaId !== undefined) partitaEsiste(partitaId);
  const ctx: Contesto = {
    fatte: spuntePartita(partitaId, data),
    conf: conf ?? (partitaId !== undefined ? new Map(confidenti(partitaId).map((c) => [c.chiave, c])) : null),
    nomi: nomiEffetti(),
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

function testoValido(x: string | undefined): string | undefined {
  if (x === undefined) return undefined;
  const t = x.trim();
  if (!t) throw httpErrors.badRequest('voce-vuota', 'Il testo della voce non può essere vuoto.');
  return t;
}
const noteValide = (n: string | null | undefined) => (n === undefined ? undefined : n === null || n.trim() === '' ? null : n.trim());

/** Aggiunge una voce alla giornata (canone, per tutte le partite), al posto indicato della fascia (in fondo se omesso). */
export function creaVoce(data: string, d: DatiVoceGiornata, partitaId?: number): AzionePercorsoDto {
  // la partita (per rispondere con lo stato) si controlla prima di scrivere: un 404 dopo aver cambiato la guida mentirebbe
  if (partitaId !== undefined) partitaEsiste(partitaId);
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
  if (partitaId !== undefined) partitaEsiste(partitaId);
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
  if (partitaId !== undefined) partitaEsiste(partitaId);
  const r = rigaVoce(uid);
  getDb().transaction(() => {
    compatta(r.data, r.fascia);
    const ora = (prepared('SELECT ordine FROM voce_giornata WHERE uid = ?').get(uid) as { ordine: number }).ordine;
    posiziona(r.data, fasciaDi(r), uid, ora + verso);
  })();
  return vociDelGiorno(r.data, partitaId);
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
    compatta(r.data, r.fascia);
  })();
}

/**
 * Spunta o toglie un'azione nella partita. Alla spunta applica ciò che l'azione produce (`produce`: letture, turni; note del
 * Confidente se `noteRisposta` è indicato, col bonus dell'arcano) e lo registra; togliendo la spunta lo annulla (le letture
 * restano: si disfano dalla loro pagina). Eventi, scadenze e promemoria non si spuntano.
 */
export function spuntaVoce(partitaId: number, uid: string, fatta: boolean, opz: OpzioniSpunta = {}): AzionePercorsoDto {
  partitaEsiste(partitaId);
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
