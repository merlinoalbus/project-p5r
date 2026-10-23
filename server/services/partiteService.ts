// ============================================================
// partiteService — partite multiple e tracking (Doti, Confidenti, compendio, Persona possedute)
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { partitaNonTrovata } from './verificaPartita.js';
import { assicuraNonDelGruppo } from './personeDelGruppo.js';
import { verificaCatturaDaIncontro } from './catturePersona.js';
import { CHIAVI_STATISTICHE, origineStima, statisticheStimate, type Osservazione, type Statistiche } from '../../shared/statistiche.js';
import { t } from './traduzioniService.js';
import { skillDto, skillRiassunti } from './compendioService.js';
import { registraEvento } from './storicoService.js';
import { cambiaGiornoPartita } from './giornoPartitaService.js';
import { fortunaSu } from './fortunaService.js';
import { moltiplicaFortuna } from '../../shared/fortuna.js';
import { verificaObiettivi } from './obiettiviService.js';
import { requisitoBloccante, semaforiConfidente } from './semaforiService.js';
import { statoDisponibilitaPartita } from './disponibilitaService.js';
import { meteoOra } from './meteoService.js';
import { regaliDellaPartita, scriviRegaloPartita, type SceltaRegalo } from './regaliPartita.js';
import { conCestinoPrivato } from './cestinoService.js';
import { puntiConfidente as puntiDelModulo, type PiazzamentoEsame } from '../../shared/puntiConfidenti.js';
import { esameCorrente, piazzamentoCorrente } from './piazzamentoEsamiService.js';
import type {
  CompendioPartitaDto, ConfidentePartitaDto, Difficolta, DoteSocialePartitaDto, EffettiAzioneDto, ModificaConfidente, ModificaDote, PartitaDto, PersonaPossedutaDto, RangoDoteDto,
  SemaforiRangoDto, SkillRiassuntoDto,
  FasciaGioco,
} from '../../shared/types.js';

interface RigaPartita {
  id: number; nome: string; note: string; attiva: number; livello_protagonista: number; data_gioco: string | null; fascia_gioco: FasciaGioco; difficolta: Difficolta;
  nuova_partita_plus: number; dlc_posseduti_json: string; allarme_attivo: number; created_at: string; updated_at: string;
}

/** Una riga della tabella `partita` per l'API: flag booleani, DLC posseduti dal JSON, fascia («sera» o «giorno») e meteo del momento. */
function partitaDto(r: RigaPartita): PartitaDto {
  return {
    id: r.id, nome: r.nome, note: r.note, attiva: r.attiva === 1, livelloProtagonista: r.livello_protagonista, dataGioco: r.data_gioco,
    fasciaGioco: r.fascia_gioco === 'sera' ? 'sera' : 'giorno',
    difficolta: r.difficolta, nuovaPartitaPlus: r.nuova_partita_plus === 1, dlcPosseduti: JSON.parse(r.dlc_posseduti_json) as number[],
    allarmeAttivo: r.allarme_attivo === 1, createdAt: r.created_at, updatedAt: r.updated_at,
    meteoOra: meteoOra(r.id, r.data_gioco, r.fascia_gioco === 'sera' ? 'sera' : 'giorno')?.meteo ?? null,
  };
}

/** La riga di una partita; 404 se non esiste (è anche il controllo d'esistenza delle altre funzioni). */
function rigaPartita(id: number): RigaPartita {
  const r = prepared('SELECT * FROM partita WHERE id = ?').get(id) as RigaPartita | undefined;
  if (!r) throw partitaNonTrovata(id);
  return r;
}

// ---- Partite ----

/** Tutte le partite: prima quella attiva, poi le altre dalla modificata più di recente. */
export function elencaPartite(): PartitaDto[] {
  return (prepared('SELECT * FROM partita ORDER BY attiva DESC, updated_at DESC').all() as RigaPartita[]).map(partitaDto);
}

/** Una partita per id (404 se non esiste). */
export function leggiPartita(id: number): PartitaDto {
  return partitaDto(rigaPartita(id));
}

/** Campi modificabili di una partita. */
export interface DatiPartita {
  nome?: string;
  note?: string;
  livelloProtagonista?: number;
  dataGioco?: string | null;
  /** Momento della giornata corrente («giorno» o «sera»): condizioni «solo di sera» di spilli, articoli e negozi. */
  fasciaGioco?: FasciaGioco;
  difficolta?: Difficolta;
  nuovaPartitaPlus?: boolean;
  dlcPosseduti?: number[];
  allarmeAttivo?: boolean;
}

/** Primo giorno del percorso della guida ('MM-GG'): giorno corrente predefinito di una nuova partita. */
function primoGiornoDelGioco(): string | null {
  return (prepared('SELECT data FROM giorno ORDER BY ordine LIMIT 1').get() as { data: string } | undefined)?.data ?? null;
}

/**
 * Crea una partita in una transazione: se è la prima o se `attiva` è richiesto diventa l'attiva (togliendo il segno alle
 * altre); i campi assenti prendono i valori predefiniti (livello 1, primo giorno della guida, giorno, difficoltà normale).
 * Nascono anche le righe delle Doti a zero e dei Confidenti non sbloccati, e l'evento nello storico.
 */
export function creaPartita(dati: DatiPartita & { nome: string; attiva?: boolean }): PartitaDto {
  const db = getDb();
  return db.transaction(() => {
    const adesso = nowIso();
    const nessuna = (prepared('SELECT COUNT(*) AS n FROM partita').get() as { n: number }).n === 0;
    const attiva = dati.attiva || nessuna;
    if (attiva) prepared('UPDATE partita SET attiva = 0 WHERE attiva = 1').run();
    const info = prepared(`INSERT INTO partita (nome, note, attiva, livello_protagonista, data_gioco, fascia_gioco, difficolta, nuova_partita_plus, dlc_posseduti_json, allarme_attivo, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      dati.nome, dati.note ?? '', attiva ? 1 : 0, dati.livelloProtagonista ?? 1, dati.dataGioco ?? primoGiornoDelGioco(), dati.fasciaGioco ?? 'giorno', dati.difficolta ?? 'normale',
      dati.nuovaPartitaPlus ? 1 : 0, JSON.stringify(dati.dlcPosseduti ?? []), dati.allarmeAttivo ? 1 : 0, adesso, adesso,
    );
    const id = Number(info.lastInsertRowid);
    // Doti sociali a zero e Confidenti non sbloccati: righe esplicite così il tracking parte completo.
    for (const d of prepared('SELECT chiave FROM dote_sociale').all() as Array<{ chiave: string }>) {
      prepared('INSERT INTO dote_sociale_partita (partita_id, dote_chiave, punti, updated_at) VALUES (?, ?, 0, ?)').run(id, d.chiave, adesso);
    }
    for (const c of prepared('SELECT chiave FROM confidente').all() as Array<{ chiave: string }>) {
      prepared('INSERT INTO confidente_partita (partita_id, confidente_chiave, sbloccato, rango, note, updated_at) VALUES (?, ?, 0, 0, \'\', ?)').run(id, c.chiave, adesso);
    }
    registraEvento(id, 'partita-creata', `Partita «${dati.nome}» creata`, `Difficoltà ${dati.difficolta ?? 'normale'}${dati.nuovaPartitaPlus ? ', Nuova Partita +' : ''}, protagonista al livello ${dati.livelloProtagonista ?? 1}.`, { livelloProtagonista: dati.livelloProtagonista ?? 1 });
    return partitaDto(rigaPartita(id));
  })();
}

/**
 * Aggiorna i campi indicati di una partita (gli altri restano) in una transazione. Un cambio di livello del protagonista si
 * ricopia sulla riga di Joker nella squadra e va nello storico, come l'inizio e la fine dell'Allarme.
 */
export function aggiornaPartita(id: number, dati: DatiPartita): PartitaDto {
  const r = rigaPartita(id);
  return getDb().transaction(() => {
    // il giorno di gioco cambia solo dalla regola unica (R10-16): giorno esistente, fascia a «giorno», storico. Una fascia scelta
    // nella stessa richiesta vince sul ritorno a «giorno» del giorno nuovo.
    const giornoIndicato = dati.dataGioco !== undefined;
    if (giornoIndicato) cambiaGiornoPartita(id, dati.dataGioco ?? null);
    const dopo = giornoIndicato ? rigaPartita(id) : r;
    prepared(`UPDATE partita SET nome = ?, note = ?, livello_protagonista = ?, data_gioco = ?, fascia_gioco = ?, difficolta = ?, nuova_partita_plus = ?, dlc_posseduti_json = ?, allarme_attivo = ?, updated_at = ? WHERE id = ?`).run(
      dati.nome ?? r.nome, dati.note ?? r.note, dati.livelloProtagonista ?? r.livello_protagonista,
      dopo.data_gioco, dati.fasciaGioco ?? dopo.fascia_gioco, dati.difficolta ?? r.difficolta,
      dati.nuovaPartitaPlus === undefined ? r.nuova_partita_plus : dati.nuovaPartitaPlus ? 1 : 0,
      dati.dlcPosseduti ? JSON.stringify(dati.dlcPosseduti) : r.dlc_posseduti_json,
      dati.allarmeAttivo === undefined ? r.allarme_attivo : dati.allarmeAttivo ? 1 : 0, nowIso(), id,
    );
    if (dati.livelloProtagonista !== undefined && dati.livelloProtagonista !== r.livello_protagonista) {
      // la riga di Joker nella squadra ricopia lo stesso numero (la fonte resta la partita): mai due livelli diversi nel file
      prepared("UPDATE membro_squadra_partita SET livello = ? WHERE partita_id = ? AND personaggio_chiave = 'joker'").run(dati.livelloProtagonista, id);
      registraEvento(id, 'livello-protagonista', `Protagonista al livello ${dati.livelloProtagonista}`, `Da ${r.livello_protagonista} a ${dati.livelloProtagonista}.`, { da: r.livello_protagonista, a: dati.livelloProtagonista });
    }
    if (dati.allarmeAttivo !== undefined && (dati.allarmeAttivo ? 1 : 0) !== r.allarme_attivo) {
      registraEvento(id, 'allarme', dati.allarmeAttivo ? 'Allarme delle fusioni attivo' : 'Allarme delle fusioni terminato', '', { attivo: dati.allarmeAttivo });
    }
    return partitaDto(rigaPartita(id));
  })();
}

/** Rende attiva la partita (404 se non esiste) e toglie il segno a quella che lo era, in una transazione. */
export function attivaPartita(id: number): PartitaDto {
  rigaPartita(id);
  getDb().transaction(() => {
    prepared('UPDATE partita SET attiva = 0 WHERE attiva = 1').run();
    prepared('UPDATE partita SET attiva = 1, updated_at = ? WHERE id = ?').run(nowIso(), id);
  })();
  return partitaDto(rigaPartita(id));
}

/** Elimina una partita (404 se non esiste); se era l'attiva, diventa attiva la più recente fra quelle che restano. */
export function eliminaPartita(id: number): void {
  const r = rigaPartita(id);
  conCestinoPrivato({ tipo: 'partita', chiave: String(id), nome: r.nome, partitaId: id }, () => {
    // La FK fonte→fatto è RESTRICT: le provenienze vanno annotate e rimosse prima
    // del padre, senza affidarsi all'ordine delle cascate di SQLite.
    prepared('DELETE FROM utente.acquisto_provenienza WHERE partita_id=?').run(id);
    prepared('DELETE FROM utente.pesca_provenienza WHERE partita_id=?').run(id);
    prepared('DELETE FROM partita WHERE id = ?').run(id);
    if (r.attiva === 1) {
      // Promuove la partita più recente, se ne resta una.
      const altra = prepared('SELECT id FROM partita ORDER BY updated_at DESC LIMIT 1').get() as { id: number } | undefined;
      if (altra) prepared('UPDATE partita SET attiva = 1 WHERE id = ?').run(altra.id);
    }
  });
}

// ---- Doti sociali ----

/** Punti per scalino: 1 nota = 2, 2 note = 3, 3 note = 5, quarto scalino (libri a resa maggiorata) = 7. */
const PUNTI_SCALINO = [2, 3, 5, 7] as const;

/**
 * Punti per numero di note. Il libro a resa maggiorata porta le 3 note al quarto scalino (7); «Anima da cineasta» (Royal) alza
 * di UNO scalino i punti di film e DVD (2→3, 3→5, 5→7); la Fortuna della Dote (stato della partita, `fortunaService`) moltiplica
 * per 1,5 per difetto, dopo il cinema (2→3, 3→4, 5→7, 7→10).
 */
export function puntiDaNote(note: 1 | 2 | 3, libro = false, fortuna = false, cinema = false): number {
  let scalino = note === 3 && libro ? 4 : note;
  if (cinema) scalino = Math.min(4, scalino + 1);
  const base = PUNTI_SCALINO[scalino - 1];
  return fortuna ? moltiplicaFortuna(base) : base;
}

/** I ranghi di una Dote sociale in ordine, con il nome italiano e la soglia di punti. */
function ranghiDote(chiave: string): RangoDoteDto[] {
  return (prepared('SELECT rango, nome, soglia FROM dote_sociale_rango WHERE dote_chiave = ? ORDER BY rango').all(chiave) as Array<{ rango: number; nome: string; soglia: number }>)
    .map((r) => ({ rango: r.rango, nome: t('rangoDote', `${chiave}/${r.rango}`), soglia: r.soglia }));
}

/** Rango raggiunto con `punti` e distanza dal successivo. */
export function progressoDote(punti: number, ranghi: RangoDoteDto[]): { rango: number; nomeRango: string; sogliaProssima: number | null; mancanti: number | null } {
  let attuale = ranghi[0] ?? { rango: 1, nome: '', soglia: 0 };
  for (const r of ranghi) if (punti >= r.soglia) attuale = r;
  const prossimo = ranghi.find((r) => r.rango === attuale.rango + 1) ?? null;
  return { rango: attuale.rango, nomeRango: attuale.nome, sogliaProssima: prossimo?.soglia ?? null, mancanti: prossimo ? prossimo.soglia - punti : null };
}

/** Le Doti sociali della partita (404 se non esiste) in ordine di gioco: punti (0 se mai segnati), rango raggiunto, distanza dal successivo e ranghi. */
export function dotiSociali(partitaId: number): DoteSocialePartitaDto[] {
  rigaPartita(partitaId);
  return (prepared(`SELECT d.chiave, d.nome, d.ordine, COALESCE(dp.punti, 0) AS punti, dp.updated_at
    FROM dote_sociale d LEFT JOIN dote_sociale_partita dp ON dp.dote_chiave = d.chiave AND dp.partita_id = ? ORDER BY d.ordine`).all(partitaId) as Array<{ chiave: string; nome: string; ordine: number; punti: number; updated_at: string | null }>)
    .map((d) => {
      const ranghi = ranghiDote(d.chiave);
      return { chiave: d.chiave, nome: t('doteSociale', d.chiave), ordine: d.ordine, punti: d.punti, ...progressoDote(d.punti, ranghi), ranghi, updatedAt: d.updated_at };
    });
}

/** Il nome di una Dote sociale («Gentilezza»), per dire che cosa il gioco dà senza toccarla (`DoteDaSegnareDto`). */
export function nomeDote(chiave: string): string {
  if (!prepared('SELECT 1 FROM dote_sociale WHERE chiave = ?').get(chiave)) throw httpErrors.notFound('dote-non-trovata', `La dote sociale '${chiave}' non esiste.`);
  return t('doteSociale', chiave);
}

/**
 * Imposta (`punti`), incrementa (`delta`) o aggiunge le `note` visualizzate in gioco; mai sotto zero.
 *
 * **Solo a mano** (scelta dell'utente, 2026-09-30: «fai che i punti Doti Sociali li sposto solo io manualmente e non
 * automaticamente»): la chiamano la scheda Doti e l'API delle Doti, nient'altro. Spunte, letture, turni, incontri,
 * domande e cruciverba dicono che cosa il gioco dà (`DoteDaSegnareDto`) e lo ricordano, ma non toccano i punti — né
 * aggiungendo né togliendo, nemmeno togliendo la spunta di un'azione di prima.
 */
export function aggiornaDote(partitaId: number, chiave: string, mod: ModificaDote): DoteSocialePartitaDto {
  rigaPartita(partitaId);
  const dote = prepared('SELECT chiave FROM dote_sociale WHERE chiave = ?').get(chiave);
  if (!dote) throw httpErrors.notFound('dote-non-trovata', `La dote sociale '${chiave}' non esiste.`);
  const attuale = (prepared('SELECT punti FROM dote_sociale_partita WHERE partita_id = ? AND dote_chiave = ?').get(partitaId, chiave) as { punti: number } | undefined)?.punti ?? 0;
  // la Fortuna non arriva più dal chiamante: è lo stato della partita (R10-10/2), letto qui per la Dote che si sta segnando
  const incremento = mod.note !== undefined ? puntiDaNote(mod.note, mod.libro, fortunaSu(partitaId, chiave), mod.cinema) : (mod.delta ?? 0);
  const nuovo = Math.max(0, mod.punti !== undefined ? mod.punti : attuale + incremento);
  const ranghi = ranghiDote(chiave);
  const prima = progressoDote(attuale, ranghi);
  const dopo = progressoDote(nuovo, ranghi);
  return getDb().transaction(() => {
    prepared('INSERT INTO dote_sociale_partita (partita_id, dote_chiave, punti, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, dote_chiave) DO UPDATE SET punti = excluded.punti, updated_at = excluded.updated_at').run(partitaId, chiave, nuovo, nowIso());
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), partitaId);
    if (dopo.rango !== prima.rango) {
      registraEvento(partitaId, 'dote-rango', `${t('doteSociale', chiave)}: rango ${dopo.rango} «${dopo.nomeRango}»`, `Da «${prima.nomeRango}» (rango ${prima.rango}) con ${nuovo} punti.`, { dote: chiave, da: prima.rango, a: dopo.rango, punti: nuovo });
    }
    return dotiSociali(partitaId).find((d) => d.chiave === chiave)!;
  })();
}

// ---- Confidenti ----

/** Arrotonda ai centesimi (5 × 1,5 × 1,2 = 9; 7,5 resta 7,5): evita residui binari. */
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Punti Confidente come nel gioco: il calcolo è del modulo unico `shared/puntiConfidenti.ts` (base 5/10/15, regalo 50, uscita 10;
 * ×1,5 arcano, esame solo per i sette Confidenti, ×1,2 invito; intero a ogni passaggio). Il Confidente e il piazzamento all'ultimo esame
 * (`piazzamentoCorrente` della partita, mai il client: il campo `esame` della richiesta non conta più) servono al bonus dell'esame.
 */
export function puntiConfidente(mod: ModificaConfidente, confidente?: string, piazzamento: PiazzamentoEsame | null = null): number {
  return puntiDelModulo({ confidente, noteRisposta: mod.noteRisposta, regalo: mod.regalo, uscita: mod.uscita, bonusArcano: mod.bonusArcano, invito: mod.invito, piazzamento });
}

/** La soglia in punti del rango per il Confidente: > 0 solo dove il rango sale a punti (`modo = 'punti'`, migrazione 161); 0 altrove. */
function sogliaAPunti(chiave: string, rango: number): number {
  const r = prepared('SELECT punti_necessari AS soglia, modo FROM confidente_rango WHERE confidente_chiave = ? AND rango = ?').get(chiave, rango) as { soglia: number | null; modo: string } | undefined;
  return r && r.modo === 'punti' && r.soglia !== null && r.soglia > 0 ? r.soglia : 0;
}

interface RigaConfidentePartita { chiave: string; nome: string; arcana: string; ordine: number; sbloccato: number; rango: number; punti: number; note: string; updated_at: string | null; punti_necessari: number | null; in_scorta: number }

/** I Confidenti con lo stato nella partita; con `chiave`, quel Confidente solo. */
function righeConfidenti(partitaId: number, chiave?: string): RigaConfidentePartita[] {
  const sql = `SELECT c.chiave, c.nome, c.arcana, c.ordine, COALESCE(cp.sbloccato, 0) AS sbloccato, COALESCE(cp.rango, 0) AS rango, COALESCE(cp.punti, 0) AS punti,
      COALESCE(cp.note, '') AS note, cp.updated_at,
      -- R6 sulla 161: Igor, Morgana, Sae, Gemelle e Mishima hanno righe di ranghi solo per il loro modo; senza ranghi a punti né a evento la soglia resta
      -- «nessuna» (NULL), come prima che le righe esistessero («Progressione senza punti…»). Gli altri ranghi a soglia 0 restano 0.
      CASE WHEN cr.modo IN ('automatico', 'richieste', 'velluto')
        AND NOT EXISTS (SELECT 1 FROM confidente_rango x WHERE x.confidente_chiave = c.chiave AND x.modo IN ('punti', 'evento'))
        THEN NULL ELSE cr.punti_necessari END AS punti_necessari,
      EXISTS (SELECT 1 FROM persona_posseduta pp JOIN persona p ON p.id = pp.persona_id WHERE pp.partita_id = ? AND p.arcana = c.arcana) AS in_scorta
    FROM confidente c
    LEFT JOIN confidente_partita cp ON cp.confidente_chiave = c.chiave AND cp.partita_id = ?
    LEFT JOIN confidente_rango cr ON cr.confidente_chiave = c.chiave AND cr.rango = COALESCE(cp.rango, 0)`;
  return (chiave === undefined
    ? prepared(`${sql} ORDER BY c.ordine`).all(partitaId, partitaId)
    : prepared(`${sql} WHERE c.chiave = ?`).all(partitaId, partitaId, chiave)) as RigaConfidentePartita[];
}

/** Il rango di ogni Confidente nella partita (0 se non incontrato): quello che i semafori e la disponibilità devono sapere. */
export function ranghiConfidenti(partitaId: number): Map<string, number> {
  const righe = prepared('SELECT c.chiave, COALESCE(cp.rango, 0) AS rango FROM confidente c LEFT JOIN confidente_partita cp ON cp.confidente_chiave = c.chiave AND cp.partita_id = ? ORDER BY c.ordine').all(partitaId) as Array<{ chiave: string; rango: number }>;
  return new Map(righe.map((r) => [r.chiave, r.rango]));
}

/** I regali consegnati, per Confidente, in una lettura sola (prima una query per Confidente: rilievo P1' della verifica). */
function regaliFatti(partitaId: number, chiave?: string): Map<string, { nomi: string[]; catalogo: string[] }> {
  const perConfidente = new Map<string, { nomi: string[]; catalogo: string[] }>();
  for (const r of regaliDellaPartita(partitaId, chiave)) {
    const l = perConfidente.get(r.confidente) ?? { nomi: [], catalogo: [] };
    l.nomi.push(r.nome); if (r.catalogo && !l.catalogo.includes(r.catalogo)) l.catalogo.push(r.catalogo);
    perConfidente.set(r.confidente, l);
  }
  return perConfidente;
}

/**
 * I DTO delle righe date. Lo stato della partita per i semafori (`statoDisponibilitaPartita`) si calcola una volta e vale per tutte le
 * righe; i ranghi che servono ai requisiti sono quelli di TUTTI i Confidenti, anche quando le righe sono una sola. Prima lo stato
 * stava in una cache di modulo con la firma su `partita.updated_at`, che alcune scritture (i collegamenti alla guida) non toccano:
 * semafori vecchi.
 */
function confidentiDto(partitaId: number, righe: RigaConfidentePartita[], ranghi: Map<string, number>, regali: Map<string, { nomi: string[]; catalogo: string[] }>): ConfidentePartitaDto[] {
  // L6: un requisito è una condizione del vocabolario unico (anche una lettura, un luogo, un invito): lo stato è quello completo del
  // valutatore, con i ranghi di TUTTI i Confidenti
  const stato = { ...statoDisponibilitaPartita(partitaId), ranghiConfidenti: ranghi };
  const esame = esameCorrente(partitaId);
  // i Confidenti con almeno un regalo gradito collegato al catalogo (senza catalogo di oggetti la colonna non c'è: nessuno)
  const conRegaliCatalogo = new Set<string>();
  try {
    for (const r of prepared('SELECT DISTINCT confidente_chiave FROM confidente_regalo WHERE catalogo_chiave IS NOT NULL AND sconsigliato = 0').all() as Array<{ confidente_chiave: string }>) conRegaliCatalogo.add(r.confidente_chiave);
  } catch { /* catalogo degli oggetti non disponibile */ }
  return righe.map((c) => {
    const semafori = semaforiConfidente(c.chiave, c.rango, stato);
    return {
      chiave: c.chiave, nome: c.nome, arcana: c.arcana, arcanaNome: t('arcana', c.arcana), ordine: c.ordine, sbloccato: c.sbloccato === 1, rango: c.rango,
      punti: c.punti, puntiNecessari: c.rango >= 10 ? null : c.punti_necessari,
      mancanti: c.rango >= 10 || c.punti_necessari === null ? null : round2(Math.max(0, c.punti_necessari - c.punti)),
      personaArcanoInScorta: c.in_scorta === 1,
      // R10-11: l'anteprima dei punti sta dietro le stesse regole del server: il rango sale a punti? e dov'è il piazzamento all'ultimo esame
      contaPunti: c.rango > 0 && c.rango < 10 && sogliaAPunti(c.chiave, c.rango) > 0, piazzamentoEsame: esame,
      regaliFatti: regali.get(c.chiave)?.nomi ?? [], regaliFattiCatalogo: regali.get(c.chiave)?.catalogo ?? [], haRegaliCatalogo: conRegaliCatalogo.has(c.chiave),
      note: c.note, semafori, updatedAt: c.updated_at,
      bloccato: bloccoRango(semafori, c.rango + 1),
    };
  });
}

/** Tutti i Confidenti della partita, nell'ordine del gioco. */
export function confidenti(partitaId: number): ConfidentePartitaDto[] {
  rigaPartita(partitaId);
  const righe = righeConfidenti(partitaId);
  return confidentiDto(partitaId, righe, new Map(righe.map((c) => [c.chiave, c.rango])), regaliFatti(partitaId));
}

/**
 * Un Confidente della partita: lo stesso DTO di `confidenti`, ma con i semafori e i regali del solo Confidente chiesto. Prima chi
 * ne voleva uno (la conferma di un requisito, un regalo, i punti) li calcolava tutti e ne teneva uno, fino a tre volte per
 * richiesta (rilievi F21/P1' della verifica completa, 2026-10-03).
 */
export function confidente(partitaId: number, chiave: string): ConfidentePartitaDto {
  rigaPartita(partitaId);
  const righe = righeConfidenti(partitaId, chiave);
  if (righe.length === 0) throw httpErrors.notFound('confidente-non-trovato', `Il Confidente '${chiave}' non esiste.`);
  return confidentiDto(partitaId, righe, ranghiConfidenti(partitaId), regaliFatti(partitaId, chiave))[0];
}

/** Segna un regalo come consegnato (o non consegnato) al Confidente nella partita. */
export function impostaRegaloFatto(partitaId: number, chiave: string, regalo: SceltaRegalo, fatto: boolean): ConfidentePartitaDto {
  rigaPartita(partitaId);
  if (!prepared('SELECT 1 FROM confidente WHERE chiave = ?').get(chiave)) throw httpErrors.notFound('confidente-non-trovato', `Il Confidente '${chiave}' non esiste.`);
  const adesso = nowIso();
  getDb().transaction(() => {
    scriviRegaloPartita(partitaId, chiave, regalo, fatto);
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  return confidente(partitaId, chiave);
}

/** Requisiti non verdi (né confermati) del semaforo di `rango`: il Confidente è bloccato finché non lo sono tutti.
 *  Le avvertenze da controllare nel gioco (`bloccante: false`) non bloccano. */
export function bloccoRango(semafori: SemaforiRangoDto[], rango: number): { rango: number; motivi: string[] } | null {
  const sem = semafori.find((s) => s.rango === rango);
  if (!sem || sem.pronto || sem.requisiti.length === 0) return null;
  const motivi = sem.requisiti.filter((r) => requisitoBloccante(r) && r.stato !== 'verde').map((r) => (r.dettaglio ? `${r.testo} (${r.dettaglio})` : r.testo));
  return motivi.length > 0 ? { rango, motivi } : null;
}

/** Da dove viene un cambio di rango (R10-17): la pagina Confidenti (correzione a mano), la spunta del passaggio nel Diario o la spunta tolta. */
export interface OrigineCambioRango { origine: 'pagina' | 'diario' | 'diario-tolto'; voce?: string }
const TESTO_ORIGINE_RANGO: Record<OrigineCambioRango['origine'], string> = {
  pagina: 'Segnato a mano dalla pagina Confidenti.',
  diario: 'Passaggio spuntato nel Diario.',
  'diario-tolto': 'Passaggio tolto dal Diario: il rango torna com\'era.',
};

/**
 * Aggiorna un Confidente nella partita: rango, sblocco, punti e note. Un rango sopra 0 vale sblocco; salire di rango (o
 * sbloccare) richiede i semafori pronti per ogni rango attraversato, salvo `forza`, che passa e lascia traccia nello storico
 * (409 altrimenti). I punti si impostano, oppure si sommano l'incremento esplicito e quelli calcolati da `puntiConfidente`;
 * al cambio di rango ripartono da zero. Sblocco e cambio di rango vanno nello storico.
 */
export function aggiornaConfidente(partitaId: number, chiave: string, dati: ModificaConfidente, origine?: OrigineCambioRango): ConfidentePartitaDto {
  // `confidente` controlla anche che partita e Confidente esistano (404)
  const attuale = confidente(partitaId, chiave);
  const rango = dati.rango ?? attuale.rango;
  // Invariante: un rango > 0 implica lo sblocco (anche se il client manda sbloccato=false).
  const sbloccato = rango > 0 ? true : (dati.sbloccato ?? attuale.sbloccato);
  // Blocco (specifica 12.3): non si sale a un rango — né si sblocca il Confidente — finché i requisiti dei semafori non sono verdi o
  // confermati. `forza` è la via d'uscita esplicita dell'utente (requisito valutato male, partita importata): passa e resta nello storico.
  const primoRangoDaVerificare = attuale.rango + 1;
  const ultimoRangoDaVerificare = rango > attuale.rango ? rango : sbloccato && !attuale.sbloccato ? 1 : 0;
  const bloccoInfranto: Array<{ rango: number; motivi: string[] }> = [];
  for (let r = primoRangoDaVerificare; r <= ultimoRangoDaVerificare; r++) {
    const blocco = bloccoRango(attuale.semafori, r);
    if (!blocco) continue;
    if (!dati.forza) throw httpErrors.conflict('confidente-bloccato', `${attuale.nome}: rango ${r} non raggiungibile finché i requisiti non sono soddisfatti — ${blocco.motivi.join(' · ')}`, { rango: r, motivi: blocco.motivi });
    bloccoInfranto.push(blocco);
  }
  // Punti verso il rango successivo (R10-11, G-020 §4-5): i punti del motore si accumulano solo dove il rango sale a punti, anche oltre la
  // soglia («evento pronto»: la soglia raggiunta non li ferma). Il passaggio di rango spuntato nel Diario porta avanti l'eccedenza sulla
  // soglia; la correzione a mano dalla pagina imposta i valori e riparte da zero, senza riporto automatico. Un valore esplicito vince.
  const incremento = (dati.deltaPunti ?? 0) + (sogliaAPunti(chiave, attuale.rango) > 0 ? puntiConfidente(dati, chiave, piazzamentoCorrente(partitaId)) : 0);
  let riporto = 0;
  if (origine?.origine === 'diario' && rango > attuale.rango && dati.punti === undefined) {
    riporto = attuale.punti;
    // si riporta solo l'eccedenza sulla soglia di un rango che sale a punti: un rango a evento non porta nulla (i suoi punti vecchi non contano)
    for (let r = attuale.rango; r < rango && riporto > 0; r++) { const soglia = sogliaAPunti(chiave, r); riporto = soglia > 0 ? Math.max(0, riporto - soglia) : 0; }
    riporto = round2(riporto);
  }
  let punti = dati.punti !== undefined ? dati.punti : rango !== attuale.rango ? riporto : attuale.punti + incremento;
  punti = round2(Math.max(0, punti));
  return getDb().transaction(() => {
    prepared(`INSERT INTO confidente_partita (partita_id, confidente_chiave, sbloccato, rango, punti, note, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(partita_id, confidente_chiave) DO UPDATE SET sbloccato = excluded.sbloccato, rango = excluded.rango, punti = excluded.punti, note = excluded.note, updated_at = excluded.updated_at`)
      .run(partitaId, chiave, sbloccato ? 1 : 0, rango, punti, dati.note ?? attuale.note, nowIso());
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), partitaId);
    if (sbloccato && !attuale.sbloccato) registraEvento(partitaId, 'confidente-sbloccato', `${attuale.nome} (${attuale.arcanaNome}) sbloccato`, '', { confidente: chiave });
    for (const b of bloccoInfranto) {
      registraEvento(partitaId, 'confidente-rango', `${attuale.nome}: rango ${b.rango} segnato nonostante i requisiti`, b.motivi.join(' · '), { confidente: chiave });
    }
    if (rango !== attuale.rango) {
      // R10-17/4: l'evento dice anche da dove viene il cambio e in quale giorno di gioco è stato segnato (dettaglio e dati)
      const momento = prepared('SELECT data_gioco, fascia_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null; fascia_gioco: string | null } | undefined;
      const quando = momento?.data_gioco ? ` Giorno di gioco ${momento.data_gioco}${momento.fascia_gioco ? `, ${momento.fascia_gioco}` : ''}.` : '';
      registraEvento(partitaId, 'confidente-rango', `${attuale.nome} (${attuale.arcanaNome}): rango ${rango}${rango === 10 ? ' — massimo' : ''}`,
        `Da rango ${attuale.rango}.${origine ? ` ${TESTO_ORIGINE_RANGO[origine.origine]}` : ''}${riporto > 0 ? ` Riporto di ${riporto} punti sul rango successivo.` : ''}${quando}`,
        { confidente: chiave, da: attuale.rango, a: rango, ...(riporto > 0 ? { riporto } : {}), ...(origine ? { origine: origine.origine, ...(origine.voce ? { voce: origine.voce } : {}) } : {}), ...(momento?.data_gioco ? { data: momento.data_gioco, fascia: momento.fascia_gioco } : {}) });
    }
    return confidente(partitaId, chiave);
  })();
}

/** Annulla esattamente i punti del Confidente applicati spuntando un'azione (della guida o dell'utente). Le Doti no: si
 *  segnano solo a mano, e le spunte di prima — che le avevano alzate — togliendosi non le abbassano (`aggiornaDote`).
 *  Sta qui e non in `percorsoService` perché la usano sia il percorso sia l'agenda, e il percorso legge l'agenda:
 *  tenerla nel percorso chiudeva un giro di import fra i due servizi. */
export function annullaEffetti(partitaId: number, e: EffettiAzioneDto): void {
  if (e.confidente) aggiornaConfidente(partitaId, e.confidente.chiave, { deltaPunti: -e.confidente.punti });
}

// ---- Compendio personale ----

/** Colonne dei valori reali osservati (migrazione 032), presenti su `persona_posseduta` e `compendio_partita`. */
interface ColonneOsservate {
  osservate_livello: number | null; osservate_forza: number | null; osservate_magia: number | null; osservate_resistenza: number | null; osservate_agilita: number | null; osservate_fortuna: number | null;
}
interface RigaCompendio extends ColonneOsservate {
  persona_id: number; nome: string; arcana: string; livello: number; registrata: number; livello_registrato: number | null; updated_at: string;
  bonus_forza: number; bonus_magia: number; bonus_resistenza: number; bonus_agilita: number; bonus_fortuna: number; skill_ids_json: string | null; tratto_skill_id: number | null; carica: number;
}
const SQL_COMPENDIO = `SELECT cp.persona_id, p.nome, p.arcana, p.livello, cp.registrata, cp.livello_registrato, cp.updated_at, cp.bonus_forza, cp.bonus_magia, cp.bonus_resistenza,
  cp.bonus_agilita, cp.bonus_fortuna, cp.skill_ids_json, cp.tratto_skill_id, cp.carica, cp.osservate_livello, cp.osservate_forza, cp.osservate_magia, cp.osservate_resistenza,
  cp.osservate_agilita, cp.osservate_fortuna FROM compendio_partita cp JOIN persona p ON p.id = cp.persona_id`;
const BONUS_ZERO: Statistiche = { forza: 0, magia: 0, resistenza: 0, agilita: 0, fortuna: 0 };
const SIGLE: Record<keyof Statistiche, string> = { forza: 'FR', magia: 'MA', resistenza: 'RS', agilita: 'AG', fortuna: 'FO' };

/** Le statistiche stimate più i bonus, ognuna tenuta fra 1 e 99. */
function sommaBonus(stima: Statistiche, bonus: Statistiche): Statistiche {
  const out = { ...stima };
  for (const k of CHIAVI_STATISTICHE) out[k] = Math.min(99, Math.max(1, stima[k] + bonus[k]));
  return out;
}

/** Valori reali osservati dalla riga (null se mai registrati: livello o una statistica mancanti). */
function osservateDaRiga(r: ColonneOsservate): Osservazione | null {
  if (r.osservate_livello === null || CHIAVI_STATISTICHE.some((k) => r[`osservate_${k}`] === null)) return null;
  return { livello: r.osservate_livello, forza: r.osservate_forza!, magia: r.osservate_magia!, resistenza: r.osservate_resistenza!, agilita: r.osservate_agilita!, fortuna: r.osservate_fortuna! };
}
/** I sei valori da scrivere nelle colonne `osservate_*` (tutti NULL quando non registrati). */
function colonneOsservate(o: Osservazione | null): Array<number | null> {
  return o ? [o.livello, o.forza, o.magia, o.resistenza, o.agilita, o.fortuna] : [null, null, null, null, null, null];
}
/** I valori reali in una riga per lo storico: «livello N: FR x · MA y · …». */
function descriviOsservate(o: Osservazione): string {
  return `livello ${o.livello}: ${CHIAVI_STATISTICHE.map((k) => `${SIGLE[k]} ${o[k]}`).join(' · ')}`;
}
/** Vero se le due osservazioni hanno lo stesso livello e le stesse statistiche (o se mancano entrambe). */
function stesseOsservazioni(a: Osservazione | null, b: Osservazione | null): boolean {
  if (a === null || b === null) return a === b;
  return a.livello === b.livello && CHIAVI_STATISTICHE.every((k) => a[k] === b[k]);
}

/** Una riga del compendio della partita per l'API: nomi tradotti, bonus, valori reali, skill e tratto come riassunti (quelle inesistenti si saltano). */
function compendioDto(r: RigaCompendio): CompendioPartitaDto {
  const skillIds = r.skill_ids_json ? (JSON.parse(r.skill_ids_json) as number[]) : [];
  return {
    personaId: r.persona_id, nome: r.nome, nomeIt: t('persona', r.nome), arcana: r.arcana, arcanaNome: t('arcana', r.arcana), livello: r.livello, registrata: r.registrata === 1, livelloRegistrato: r.livello_registrato,
    bonus: { forza: r.bonus_forza, magia: r.bonus_magia, resistenza: r.bonus_resistenza, agilita: r.bonus_agilita, fortuna: r.bonus_fortuna },
    osservate: osservateDaRiga(r),
    skill: skillIds.map((id) => skillDto(id)).filter((x): x is NonNullable<typeof x> => x !== null),
    tratto: r.tratto_skill_id ? skillDto(r.tratto_skill_id) : null, carica: r.carica === 1, updatedAt: r.updated_at,
  };
}

/** Il compendio personale della partita (404 se non esiste), ordinato per livello e nome della Persona. */
export function compendioPartita(partitaId: number): CompendioPartitaDto[] {
  rigaPartita(partitaId);
  return (prepared(`${SQL_COMPENDIO} WHERE cp.partita_id = ? ORDER BY p.livello, p.nome`).all(partitaId) as RigaCompendio[]).map(compendioDto);
}

interface Istantanea { livello: number; bonus: Statistiche; osservate: Osservazione | null; skillIds: number[]; trattoSkillId: number | null; carica: boolean }

/** Istantanea registrata nel compendio (null se la Persona non è registrata o non ha livello). */
function istantaneaCompendio(partitaId: number, personaId: number): Istantanea | null {
  const r = prepared(`${SQL_COMPENDIO} WHERE cp.partita_id = ? AND cp.persona_id = ? AND cp.registrata = 1`).get(partitaId, personaId) as RigaCompendio | undefined;
  if (!r || r.livello_registrato === null) return null;
  return {
    livello: r.livello_registrato, bonus: { forza: r.bonus_forza, magia: r.bonus_magia, resistenza: r.bonus_resistenza, agilita: r.bonus_agilita, fortuna: r.bonus_fortuna },
    osservate: osservateDaRiga(r),
    skillIds: r.skill_ids_json ? (JSON.parse(r.skill_ids_json) as number[]) : [], trattoSkillId: r.tratto_skill_id, carica: r.carica === 1,
  };
}

/** Scrive l'istantanea nel compendio della partita, segnando la Persona come registrata (crea la riga o la sostituisce). */
function scriviIstantanea(partitaId: number, personaId: number, i: Istantanea, adesso: string): void {
  prepared(`INSERT INTO compendio_partita (partita_id, persona_id, registrata, livello_registrato, bonus_forza, bonus_magia, bonus_resistenza, bonus_agilita, bonus_fortuna, skill_ids_json, tratto_skill_id, carica,
      osservate_livello, osservate_forza, osservate_magia, osservate_resistenza, osservate_agilita, osservate_fortuna, updated_at)
    VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(partita_id, persona_id) DO UPDATE SET registrata = 1, livello_registrato = excluded.livello_registrato, bonus_forza = excluded.bonus_forza, bonus_magia = excluded.bonus_magia,
      bonus_resistenza = excluded.bonus_resistenza, bonus_agilita = excluded.bonus_agilita, bonus_fortuna = excluded.bonus_fortuna, skill_ids_json = excluded.skill_ids_json,
      tratto_skill_id = excluded.tratto_skill_id, carica = excluded.carica, osservate_livello = excluded.osservate_livello, osservate_forza = excluded.osservate_forza,
      osservate_magia = excluded.osservate_magia, osservate_resistenza = excluded.osservate_resistenza, osservate_agilita = excluded.osservate_agilita, osservate_fortuna = excluded.osservate_fortuna,
      updated_at = excluded.updated_at`)
    .run(partitaId, personaId, i.livello, i.bonus.forza, i.bonus.magia, i.bonus.resistenza, i.bonus.agilita, i.bonus.fortuna, JSON.stringify(i.skillIds), i.trattoSkillId, i.carica ? 1 : 0, ...colonneOsservate(i.osservate), adesso);
}

/** Il testo dei bonus dell'esemplare per l'evento di registrazione («con bonus FR +1 MA +2»), vuoto se sono tutti zero. */
function testoBonusRegistrazione(bonus: Statistiche): string {
  const dati = CHIAVI_STATISTICHE.filter((k) => bonus[k] !== 0);
  return dati.length ? ` con bonus ${dati.map((k) => `${SIGLE[k]} ${bonus[k] > 0 ? '+' : ''}${bonus[k]}`).join(' ')}` : '';
}

/**
 * R10-19 (L8 P2): l'UNICA strada con cui una Persona entra o si aggiorna nel compendio della partita. La usano la registrazione a mano
 * (Compendio personale), l'aggiunta alla scorta (anche il risultato di fusione e del Velluto), «Registra» dell'esemplare in scorta e,
 * con L8, la cattura. Va chiamata dentro la transazione di chi la usa: l'evento nello storico si scrive una volta, qui.
 *  - con `istantanea` (esemplare in scorta, valori reali): sostituisce l'istantanea COMPLETA (livello, bonus, skill, tratto, carica,
 *    valori osservati); l'evento dice «registrata» la prima volta e «aggiornata» le volte dopo;
 *  - senza istantanea: inserisce solo se serve (livello indicato, nessun bonus né skill) e NON tocca un'istantanea che c'è già; un
 *    `livello` esplicito su una Persona già registrata aggiorna solo il livello, mai lo azzera (prima il PUT lo riportava a NULL).
 */
export function registraPersona(partitaId: number, personaId: number, opz: { istantanea?: Istantanea; livello?: number | null; dati?: Record<string, unknown> } = {}): { nuova: boolean; aggiornata: boolean } {
  const persona = prepared('SELECT nome FROM persona WHERE id = ?').get(personaId) as { nome: string } | undefined;
  if (!persona) throw httpErrors.notFound('persona-non-trovata', `La Persona ${personaId} non esiste.`);
  assicuraNonDelGruppo(personaId);
  const adesso = nowIso();
  const gia = prepared('SELECT livello_registrato FROM compendio_partita WHERE partita_id = ? AND persona_id = ? AND registrata = 1').get(partitaId, personaId) as { livello_registrato: number | null } | undefined;
  if (opz.istantanea) {
    const i = opz.istantanea;
    scriviIstantanea(partitaId, personaId, i, adesso);
    registraEvento(partitaId, 'compendio-registrata', `${t('persona', persona.nome)} ${gia ? 'aggiornata' : 'registrata'} nel compendio`, `Al livello ${i.livello}${testoBonusRegistrazione(i.bonus)}.`,
      { livello: i.livello, bonus: i.bonus, skillIds: i.skillIds, ...opz.dati }, personaId);
    return { nuova: !gia, aggiornata: !!gia };
  }
  if (gia) {
    if (opz.livello != null && opz.livello !== gia.livello_registrato) {
      prepared('UPDATE compendio_partita SET livello_registrato = ?, updated_at = ? WHERE partita_id = ? AND persona_id = ?').run(opz.livello, adesso, partitaId, personaId);
    }
    return { nuova: false, aggiornata: false };
  }
  registraEvento(partitaId, 'compendio-registrata', `${t('persona', persona.nome)} registrata nel compendio`, opz.livello ? `Al livello ${opz.livello}.` : '', { livello: opz.livello ?? null, ...opz.dati }, personaId);
  // Una riga di compendio può esistere non registrata: si completa senza toccare ciò che c'è (bonus, skill, valori osservati).
  prepared(`INSERT INTO compendio_partita (partita_id, persona_id, registrata, livello_registrato, bonus_forza, bonus_magia, bonus_resistenza, bonus_agilita, bonus_fortuna, skill_ids_json, tratto_skill_id, carica, updated_at)
    VALUES (?, ?, 1, ?, 0, 0, 0, 0, 0, NULL, NULL, 0, ?)
    ON CONFLICT(partita_id, persona_id) DO UPDATE SET registrata = 1, livello_registrato = COALESCE(excluded.livello_registrato, compendio_partita.livello_registrato), updated_at = excluded.updated_at`)
    .run(partitaId, personaId, opz.livello ?? null, adesso);
  return { nuova: true, aggiornata: false };
}

/**
 * Registra o toglie a mano una Persona dal compendio della partita (404 per partita o Persona inesistenti). Togliere cancella
 * la riga; registrare passa da `registraPersona` (solo il livello, senza bonus né skill, e senza toccare una registrazione che c'è
 * già). Restituisce il compendio aggiornato.
 */
export function aggiornaCompendio(partitaId: number, personaId: number, dati: { registrata: boolean; livelloRegistrato?: number | null; ombra?: string }): CompendioPartitaDto[] {
  rigaPartita(partitaId);
  if (!prepared('SELECT 1 FROM persona WHERE id = ?').get(personaId)) throw httpErrors.notFound('persona-non-trovata', `La Persona ${personaId} non esiste.`);
  assicuraNonDelGruppo(personaId);
  // L8 (R8-12/13): il gesto che viene da un incontro (Palazzo, dedalo, Battaglia, pagina Ombra) vale solo per un'Ombra catturabile di quella Persona
  if (dati.registrata && dati.ombra !== undefined) verificaCatturaDaIncontro(dati.ombra, personaId);
  return getDb().transaction(() => {
    if (!dati.registrata) {
      prepared('DELETE FROM compendio_partita WHERE partita_id = ? AND persona_id = ?').run(partitaId, personaId);
    } else {
      // Registrazione manuale o cattura da un incontro (senza esemplare in scorta): livello, senza bonus né skill (l'evocazione usa le innate).
      registraPersona(partitaId, personaId, { livello: dati.livelloRegistrato ?? null, ...(dati.ombra !== undefined ? { dati: { ombra: dati.ombra } } : {}) });
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), partitaId);
    return compendioPartita(partitaId);
  })();
}

// ---- Persona possedute ----

interface RigaPosseduta extends ColonneOsservate {
  id: number; partita_id: number; persona_id: number; livello: number; forza: number | null; magia: number | null; resistenza: number | null;
  agilita: number | null; fortuna: number | null; bonus_forza: number; bonus_magia: number; bonus_resistenza: number; bonus_agilita: number; bonus_fortuna: number;
  tratto_skill_id: number | null; in_squadra: number; carica: number; note: string; created_at: string; updated_at: string;
  nome: string; arcana: string; livello_base: number; b_forza: number; b_magia: number; b_resistenza: number; b_agilita: number; b_fortuna: number;
  /** L'id della skill del tratto del dataset (per nome), quando la partita non ne ha scelto uno. */
  tratto_dataset_id: number | null;
}

const SQL_POSSEDUTA = `SELECT pp.*, p.nome, p.arcana, p.livello AS livello_base, p.forza AS b_forza, p.magia AS b_magia, p.resistenza AS b_resistenza,
  p.agilita AS b_agilita, p.fortuna AS b_fortuna, (SELECT s.id FROM skill s WHERE s.nome = p.tratto) AS tratto_dataset_id
  FROM persona_posseduta pp JOIN persona p ON p.id = pp.persona_id`;

/**
 * Le Persona possedute scelte da `dove` (con i suoi parametri), nell'ordine della query, come DTO. Skill e tratti si leggono in
 * blocco — gli slot di tutte le Persona con una query, i riassunti delle skill con un'altra — invece che con due o tre query per
 * Persona e una per skill (rilievo P2': circa 100 query per una scorta di 12 Persona con 8 skill).
 */
function possedute(dove: string, ...parametri: unknown[]): PersonaPossedutaDto[] {
  const righe = prepared(`${SQL_POSSEDUTA} ${dove}`).all(...parametri) as RigaPosseduta[];
  if (righe.length === 0) return [];
  const slot = prepared('SELECT posseduta_id, slot, skill_id FROM persona_posseduta_skill WHERE posseduta_id IN (SELECT value FROM json_each(?)) ORDER BY posseduta_id, slot')
    .all(JSON.stringify(righe.map((r) => r.id))) as Array<{ posseduta_id: number; slot: number; skill_id: number }>;
  const slotDi = new Map<number, Array<{ slot: number; skill_id: number }>>();
  for (const s of slot) {
    const elenco = slotDi.get(s.posseduta_id);
    if (elenco) elenco.push(s); else slotDi.set(s.posseduta_id, [s]);
  }
  /** Il tratto della Persona: quello scelto nella partita, altrimenti quello del dataset. */
  const tratto = (r: RigaPosseduta) => r.tratto_skill_id ?? r.tratto_dataset_id ?? null;
  const riassunti = skillRiassunti([...slot.map((s) => s.skill_id), ...righe.map(tratto).filter((id): id is number => id !== null)]);
  return righe.map((r) => possedutaDto(r, tratto(r), slotDi.get(r.id) ?? [], riassunti));
}

/** Una Persona posseduta per id (della partita, se data), o null. */
export function possedutaPerId(id: number, partitaId?: number): PersonaPossedutaDto | null {
  return (partitaId === undefined ? possedute('WHERE pp.id = ?', id) : possedute('WHERE pp.id = ? AND pp.partita_id = ?', id, partitaId))[0] ?? null;
}

/**
 * Una Persona posseduta per l'API, dai dati già letti in blocco: skill per slot, statistiche stimate al livello (dai valori
 * reali registrati o dalla base del dataset) più i bonus, origine della stima, tratto e flag della scorta.
 */
function possedutaDto(r: RigaPosseduta, trattoId: number | null, slot: Array<{ slot: number; skill_id: number }>, riassunti: Map<number, SkillRiassuntoDto>): PersonaPossedutaDto {
  // una skill che non esiste più nel dataset resta uno slot senza dati, come prima (`...null` non aggiunge nulla)
  const skill = slot.map((s) => ({ slot: s.slot, ...riassunti.get(s.skill_id) })) as PersonaPossedutaDto['skill'];
  const bonus = { forza: r.bonus_forza, magia: r.bonus_magia, resistenza: r.bonus_resistenza, agilita: r.bonus_agilita, fortuna: r.bonus_fortuna };
  const statisticheBase = CHIAVI_STATISTICHE.every((k) => bonus[k] === 0);
  const base = { forza: r.b_forza, magia: r.b_magia, resistenza: r.b_resistenza, agilita: r.b_agilita, fortuna: r.b_fortuna };
  // 15.26: la stima riparte dai valori reali registrati quando il livello è almeno quello registrato, altrimenti dalla base del dataset
  const osservate = osservateDaRiga(r);
  const stimate = statisticheStimate(base, r.livello_base, osservate, r.livello);
  return {
    id: r.id, personaId: r.persona_id, nome: r.nome, nomeIt: t('persona', r.nome), arcana: r.arcana, arcanaNome: t('arcana', r.arcana), livelloBase: r.livello_base, livello: r.livello,
    statistiche: sommaBonus(stimate, bonus),
    statisticheStimate: stimate,
    bonus,
    statisticheBase,
    osservate,
    origineStima: origineStima(osservate, r.livello),
    statisticheConfermate: osservate !== null && osservate.livello === r.livello && statisticheBase,
    statisticheBaseLivello: base, tratto: trattoId ? (riassunti.get(trattoId) ?? null) : null, inSquadra: r.in_squadra === 1, carica: r.carica === 1, note: r.note, skill, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

/** La scorta della partita (404 se non esiste): prima quelle in squadra, poi per livello decrescente e nome. */
export function personePossedute(partitaId: number): PersonaPossedutaDto[] {
  rigaPartita(partitaId);
  return possedute('WHERE pp.partita_id = ? ORDER BY pp.in_squadra DESC, pp.livello DESC, p.nome', partitaId);
}

/** Dati di una Persona posseduta (creazione/aggiornamento). */
export interface DatiPosseduta {
  livello?: number;
  /** Bonus per statistica (null = azzera). */
  bonus?: Statistiche | null;
  /** Valori reali letti nel gioco a un livello (15.26); null = dimentica quelli registrati. Registrarli azzera i bonus, salvo bonus esplicito. */
  osservate?: Osservazione | null;
  /** Evocazione dal Registro: livello, bonus, valori reali, skill, tratto e carica non indicati vengono dall'istantanea del compendio. */
  daRegistro?: boolean;
  trattoSkillId?: number | null;
  inSquadra?: boolean;
  /** Persona «carica» (nome giallo: creata durante l'Allarme). */
  carica?: boolean;
  note?: string;
  /** Skill conosciute, in ordine di slot (max 8). */
  skillIds?: number[];
  /** Testo libero sull'origine (es. «fusione», «cattura», «Registro»): finisce nello storico. */
  origine?: string;
}

/** Controlla le skill di una Persona posseduta: al massimo 8, nessuna ripetuta (400), tutte esistenti (404). Assenti = niente da controllare. */
function verificaSkill(skillIds: number[] | undefined): void {
  if (!skillIds) return;
  if (skillIds.length > 8) throw httpErrors.badRequest('troppe-skill', 'Una Persona può conoscere al massimo 8 skill.');
  if (new Set(skillIds).size !== skillIds.length) throw httpErrors.badRequest('skill-duplicata', 'La stessa skill compare più volte.');
  for (const id of skillIds) if (!prepared('SELECT 1 FROM skill WHERE id = ?').get(id)) throw httpErrors.notFound('skill-non-trovata', `La skill ${id} non esiste.`);
}

/**
 * Aggiunge una Persona alla scorta della partita (una sola per Persona: 409 se c'è già). Le skill e il tratto si verificano;
 * con `daRegistro` i valori non indicati vengono dall'istantanea del compendio (400 se la Persona non è registrata),
 * altrimenti dal livello base, senza bonus e con le ultime 8 skill apprese fino al livello. In transazione: la riga, gli slot,
 * l'evento nello storico e — se non è un'evocazione dal Registro — la registrazione nel compendio; poi gli obiettivi.
 */
export function aggiungiPosseduta(partitaId: number, personaId: number, dati: DatiPosseduta): PersonaPossedutaDto {
  rigaPartita(partitaId);
  const p = prepared('SELECT id, nome, arcana, livello FROM persona WHERE id = ?').get(personaId) as { id: number; nome: string; arcana: string; livello: number } | undefined;
  if (!p) throw httpErrors.notFound('persona-non-trovata', `La Persona ${personaId} non esiste.`);
  assicuraNonDelGruppo(personaId);
  if (prepared('SELECT 1 FROM persona_posseduta WHERE partita_id = ? AND persona_id = ?').get(partitaId, personaId)) {
    throw httpErrors.conflict('persona-gia-posseduta', 'Questa Persona è già nella scorta della partita.');
  }
  verificaSkill(dati.skillIds);
  if (dati.trattoSkillId && !prepared("SELECT 1 FROM skill WHERE id = ? AND elemento = 'trait'").get(dati.trattoSkillId)) throw httpErrors.badRequest('tratto-non-valido', 'Il tratto indicato non è una skill di tipo tratto.');
  const adesso = nowIso();
  // Evocazione dal Registro: l'istantanea del compendio fornisce i valori non indicati.
  const ist = dati.daRegistro ? istantaneaCompendio(partitaId, personaId) : null;
  if (dati.daRegistro && !ist) throw httpErrors.badRequest('non-registrata', `${t('persona', p.nome)} non è registrata nel compendio di questa partita: non si può evocare dal Registro.`);
  const livello = dati.livello ?? ist?.livello ?? p.livello;
  const osservate = dati.osservate === undefined ? ist?.osservate ?? null : dati.osservate;
  const bonus = dati.bonus ?? ist?.bonus ?? BONUS_ZERO;
  const trattoSkillId = dati.trattoSkillId === undefined ? ist?.trattoSkillId ?? null : dati.trattoSkillId;
  const carica = dati.carica ?? ist?.carica ?? false;
  return getDb().transaction(() => {
    const info = prepared(`INSERT INTO persona_posseduta (partita_id, persona_id, livello, bonus_forza, bonus_magia, bonus_resistenza, bonus_agilita, bonus_fortuna, tratto_skill_id, in_squadra, carica, note,
        osservate_livello, osservate_forza, osservate_magia, osservate_resistenza, osservate_agilita, osservate_fortuna, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(partitaId, personaId, livello, bonus.forza, bonus.magia, bonus.resistenza, bonus.agilita, bonus.fortuna,
      trattoSkillId, dati.inSquadra === false ? 0 : 1, carica ? 1 : 0, dati.note ?? '', ...colonneOsservate(osservate), adesso, adesso);
    const id = Number(info.lastInsertRowid);
    const skillIds = dati.skillIds ?? ist?.skillIds ?? skillInnateFinoAlLivello(personaId, livello);
    skillIds.forEach((sid, i) => prepared('INSERT INTO persona_posseduta_skill (posseduta_id, slot, skill_id) VALUES (?, ?, ?)').run(id, i + 1, sid));
    const giaRegistrata = !!prepared('SELECT 1 FROM compendio_partita WHERE partita_id = ? AND persona_id = ? AND registrata = 1').get(partitaId, personaId);
    registraEvento(partitaId, 'persona-aggiunta', `${t('persona', p.nome)} (${t('arcana', p.arcana)}) aggiunta alla scorta`, `Livello ${livello}${dati.origine ? ` · ${dati.origine}` : ''}.`, { livello, skillIds, origine: dati.origine ?? null }, personaId);
    // Ottenere una Persona la registra nel compendio (come in gioco): l'istantanea è lo stato con cui entra in scorta, attraverso l'unica
    // strada `registraPersona` (R10-19). L'evocazione dal Registro non tocca l'istantanea (ne è la copia); una Persona già registrata non
    // vede riscritta la sua istantanea da un nuovo esemplare (L8 P2: la riscrittura è il gesto esplicito «Registra»).
    if (!dati.daRegistro && !giaRegistrata) registraPersona(partitaId, personaId, { istantanea: { livello, bonus, osservate, skillIds, trattoSkillId, carica } });
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
    verificaObiettivi(partitaId, personaId);
    return possedutaPerId(id)!;
  })();
}

/** Registra (o aggiorna) nel compendio l'istantanea dell'esemplare in scorta: livello, bonus, skill, tratto, carica. */
export function registraPossedutaNelCompendio(partitaId: number, possedutaId: number): CompendioPartitaDto[] {
  rigaPartita(partitaId);
  const r = prepared(`${SQL_POSSEDUTA} WHERE pp.id = ? AND pp.partita_id = ?`).get(possedutaId, partitaId) as RigaPosseduta | undefined;
  if (!r) throw httpErrors.notFound('posseduta-non-trovata', `La Persona posseduta ${possedutaId} non esiste in questa partita.`);
  const adesso = nowIso();
  return getDb().transaction(() => {
    const skillIds = (prepared('SELECT skill_id FROM persona_posseduta_skill WHERE posseduta_id = ? ORDER BY slot').all(r.id) as Array<{ skill_id: number }>).map((x) => x.skill_id);
    const bonus = { forza: r.bonus_forza, magia: r.bonus_magia, resistenza: r.bonus_resistenza, agilita: r.bonus_agilita, fortuna: r.bonus_fortuna };
    registraPersona(partitaId, r.persona_id, { istantanea: { livello: r.livello, bonus, osservate: osservateDaRiga(r), skillIds, trattoSkillId: r.tratto_skill_id, carica: r.carica === 1 }, dati: { possedutaId: r.id } });
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
    return compendioPartita(partitaId);
  })();
}

/** Le ultime 8 skill che la Persona ha appreso fino al livello dato (innate comprese). */
export function skillInnateFinoAlLivello(personaId: number, livello: number): number[] {
  const righe = prepared('SELECT skill_id FROM persona_skill WHERE persona_id = ? AND livello <= ? ORDER BY livello, skill_id').all(personaId, livello) as Array<{ skill_id: number }>;
  return righe.slice(-8).map((r) => r.skill_id);
}

/**
 * Aggiorna una Persona della scorta (404 se non è della partita): i campi assenti restano. Registrare i valori reali azzera i
 * bonus salvo bonus espliciti; le skill indicate sostituiscono tutti gli slot. Livello, skill, valori reali e bonus cambiati
 * vanno nello storico; il compendio non segue (si aggiorna solo con «Registra»). Poi si riverificano gli obiettivi.
 */
export function aggiornaPosseduta(partitaId: number, possedutaId: number, dati: DatiPosseduta): PersonaPossedutaDto {
  rigaPartita(partitaId);
  const r = prepared(`${SQL_POSSEDUTA} WHERE pp.id = ? AND pp.partita_id = ?`).get(possedutaId, partitaId) as RigaPosseduta | undefined;
  if (!r) throw httpErrors.notFound('posseduta-non-trovata', `La Persona posseduta ${possedutaId} non esiste in questa partita.`);
  verificaSkill(dati.skillIds);
  if (dati.trattoSkillId && !prepared("SELECT 1 FROM skill WHERE id = ? AND elemento = 'trait'").get(dati.trattoSkillId)) throw httpErrors.badRequest('tratto-non-valido', 'Il tratto indicato non è una skill di tipo tratto.');
  const adesso = nowIso();
  return getDb().transaction(() => {
    const prima = { forza: r.bonus_forza, magia: r.bonus_magia, resistenza: r.bonus_resistenza, agilita: r.bonus_agilita, fortuna: r.bonus_fortuna };
    const ossPrima = osservateDaRiga(r);
    const oss = dati.osservate === undefined ? ossPrima : dati.osservate;
    // registrare i valori reali azzera i bonus (li comprendono già), a meno che la richiesta non porti bonus espliciti
    const b = dati.bonus === undefined ? (dati.osservate ? BONUS_ZERO : prima) : dati.bonus ?? BONUS_ZERO;
    prepared(`UPDATE persona_posseduta SET livello = ?, bonus_forza = ?, bonus_magia = ?, bonus_resistenza = ?, bonus_agilita = ?, bonus_fortuna = ?, tratto_skill_id = ?, in_squadra = ?, carica = ?, note = ?,
        osservate_livello = ?, osservate_forza = ?, osservate_magia = ?, osservate_resistenza = ?, osservate_agilita = ?, osservate_fortuna = ?, updated_at = ? WHERE id = ?`).run(
      dati.livello ?? r.livello, b.forza, b.magia, b.resistenza, b.agilita, b.fortuna,
      dati.trattoSkillId === undefined ? r.tratto_skill_id : dati.trattoSkillId, dati.inSquadra === undefined ? r.in_squadra : dati.inSquadra ? 1 : 0,
      dati.carica === undefined ? r.carica : dati.carica ? 1 : 0, dati.note ?? r.note, ...colonneOsservate(oss), adesso, possedutaId,
    );
    const skillPrima = (prepared('SELECT skill_id FROM persona_posseduta_skill WHERE posseduta_id = ? ORDER BY slot').all(possedutaId) as Array<{ skill_id: number }>).map((x) => x.skill_id);
    if (dati.skillIds) {
      prepared('DELETE FROM persona_posseduta_skill WHERE posseduta_id = ?').run(possedutaId);
      dati.skillIds.forEach((sid, i) => prepared('INSERT INTO persona_posseduta_skill (posseduta_id, slot, skill_id) VALUES (?, ?, ?)').run(possedutaId, i + 1, sid));
    }
    const nomeIt = t('persona', r.nome);
    if (dati.livello !== undefined && dati.livello !== r.livello) {
      registraEvento(partitaId, 'persona-livello', `${nomeIt} al livello ${dati.livello}`, `Da ${r.livello} a ${dati.livello}.`, { da: r.livello, a: dati.livello, possedutaId }, r.persona_id);
    }
    if (dati.skillIds && (dati.skillIds.length !== skillPrima.length || dati.skillIds.some((id, i) => id !== skillPrima[i]))) {
      const nuove = dati.skillIds.filter((id) => !skillPrima.includes(id)).map((id) => skillDto(id)?.nomeIt ?? String(id));
      const perse = skillPrima.filter((id) => !dati.skillIds!.includes(id)).map((id) => skillDto(id)?.nomeIt ?? String(id));
      const parti = [nuove.length ? `Apprese: ${nuove.join(', ')}` : '', perse.length ? `Dimenticate: ${perse.join(', ')}` : ''].filter(Boolean);
      registraEvento(partitaId, 'persona-skill', `${nomeIt}: skill aggiornate`, parti.length ? `${parti.join(' · ')}.` : 'Ordine degli slot cambiato.', { da: skillPrima, a: dati.skillIds, possedutaId }, r.persona_id);
    }
    if (dati.osservate !== undefined && !stesseOsservazioni(oss, ossPrima)) {
      registraEvento(partitaId, 'persona-statistiche', `${nomeIt}: valori reali ${oss ? 'registrati' : 'dimenticati'}`,
        oss ? `Letti nel gioco al ${descriviOsservate(oss)}. Da qui in su la stima riparte da questi valori${CHIAVI_STATISTICHE.every((k) => b[k] === 0) ? ' e i bonus ripartono da zero' : ''}.` : 'Statistiche di nuovo stimate dalla base del dataset.',
        { da: ossPrima, a: oss, possedutaId }, r.persona_id);
    } else if (dati.bonus !== undefined && CHIAVI_STATISTICHE.some((k) => b[k] !== prima[k])) {
      const senzaBonus = CHIAVI_STATISTICHE.every((k) => b[k] === 0);
      registraEvento(partitaId, 'persona-statistiche', `${nomeIt}: bonus ${senzaBonus ? 'azzerati' : 'aggiornati'}`,
        senzaBonus ? 'Statistiche riportate alla stima del livello.' : `${CHIAVI_STATISTICHE.map((k) => `${SIGLE[k]} ${b[k] > 0 ? '+' : ''}${b[k]}`).join(' · ')}.`, { da: prima, a: b, possedutaId }, r.persona_id);
    }
    // Il compendio NON segue i cambiamenti: come in gioco, l'istantanea si aggiorna solo con «Registra».
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
    verificaObiettivi(partitaId, r.persona_id);
    return possedutaPerId(possedutaId)!;
  })();
}

/** Toglie una Persona dalla scorta (404 se non è della partita) e registra nello storico livello e motivo; il compendio resta. */
export function rimuoviPosseduta(partitaId: number, possedutaId: number, motivo?: string): void {
  rigaPartita(partitaId);
  const r = prepared(`${SQL_POSSEDUTA} WHERE pp.id = ? AND pp.partita_id = ?`).get(possedutaId, partitaId) as RigaPosseduta | undefined;
  if (!r) throw httpErrors.notFound('posseduta-non-trovata', `La Persona posseduta ${possedutaId} non esiste in questa partita.`);
  getDb().transaction(() => {
    // R10-23/2: la riga (con le sue skill, a cascata) va nel Cestino privato; evento e data di modifica restano fuori dalla registrazione
    conCestinoPrivato({ tipo: 'persona-scorta', chiave: String(possedutaId), nome: t('persona', r.nome), contesto: `Livello ${r.livello}`, partitaId },
      () => prepared('DELETE FROM persona_posseduta WHERE id = ?').run(possedutaId));
    registraEvento(partitaId, 'persona-rimossa', `${t('persona', r.nome)} rimossa dalla scorta`, `Era al livello ${r.livello}${motivo ? ` · ${motivo}` : ''}.`, { livello: r.livello, motivo: motivo ?? null }, r.persona_id);
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), partitaId);
  })();
}
