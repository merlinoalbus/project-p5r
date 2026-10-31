// ============================================================
// Migrazione 319 — il bagno pubblico del 9, 13 e 16 giugno: l'esito lo dichiara la voce («Bagno normale», Fascino ♪♪)
// ============================================================
//
// L13, ondata 9, lotto O9-2. Istruzione dell'utente del 2026-10-31: «Per il momento vale quello che riporta il testo sul bagno. A meno di
// modifiche successive.». Le tre voci (collegate al bagno dalla 234 con il turno senza esito) cadono di lunedì (13/6) e di giovedì (9/6 e
// 16/6): il calcolo del giorno darebbe il bagno medicinale (Fascino ♪♪♪), il testo delle voci dice Fascino +2. La guida
// (https://www.allgamestaff.it/come-aumentare-il-fascino-in-persona-5-royal/, letta il 2026-10-31) conferma il bagno «rigenerante» il lunedì
// e il giovedì: la condizione dell'esito medicinale è giusta e NON si cambia. Vale la scelta dell'utente sul testo delle voci.
//
// Il modello (nessun caso scritto a mano): una voce può dichiarare l'esito anche per un'attività nel modo automatico, e l'esito dichiarato
// prevale sul calcolo del giorno (`esitiAttivitaService.risolviEsitoTurno`, `dallaVoce`). Questa migrazione scrive quell'esito nelle tre voci:
// il turno senza esito diventa `{ tipo: 'turno', attivita: 'bagno-pubblico-yongen-jaya', esito: 'bagno-normale' }`, con lo STESSO uid e allo
// stesso posto (`convertiVoce` con `modifica`: nessun effetto nuovo in coda, i riferimenti all'effetto restano validi); la Coraggio ♪ della
// pioggia (13/6 e 16/6) resta com'è. Le altre voci del bagno (21/6 martedì, 6/7 mercoledì) restano automatiche.
//
// Conservativa: ogni voce si tocca solo se ha ancora esattamente gli effetti letti il 2026-10-31 sulla copia portata alla 318 (uid, ordine,
// valore: `convertiVoce`), e solo se l'attività dichiara ancora l'esito «bagno-normale» con Fascino ♪♪ (altrimenti nessuna voce si tocca).
// `ancheSpuntata` porta le parole dell'utente: oggi le voci non sono spuntate in nessuna partita, ma la decisione c'è. Le partite non si
// scrivono mai: lo schema `utente` deve risultare identico (impronta di ogni riga), o la migrazione si annulla. Idempotente: la seconda
// volta le voci risultano «già convertite» e non si scrive niente. Audit in `dati_guida.audit-319-bagno-esito-dalla-voce`.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { convertiVoce, tabellePartiteConVoce } from './fbisOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';
import { leggiEsitiAttivita } from '../../../shared/esitiAttivita.js';
import type { EffettoVoce } from '../../../shared/effettiVoce.js';

const AUDIT = 'audit-319-bagno-esito-dalla-voce';
const LOTTO = 'O9-2';
const DECISIONE = 'Per il momento vale quello che riporta il testo sul bagno. A meno di modifiche successive.';
const RICHIESTA = `2026-10-31: «${DECISIONE}» (L13, ondata 9, lotto O9-2)`;
const FONTE = 'https://www.allgamestaff.it/come-aumentare-il-fascino-in-persona-5-royal/';
const ATTIVITA = 'bagno-pubblico-yongen-jaya';
const ESITO = 'bagno-normale';
const AZIONE = 'Bagno pubblico';
const errore = (motivo: string): never => { throw new Error(`319: ${motivo}; nessuna modifica applicata.`); };
const j = (v: unknown) => JSON.stringify(v);

const turnoSenzaEsito: EffettoVoce = { tipo: 'turno', attivita: ATTIVITA };
const turnoBagnoNormale: EffettoVoce = { tipo: 'turno', attivita: ATTIVITA, esito: ESITO };
const coraggio: EffettoVoce = { tipo: 'dote', dote: 'coraggio', note: 1 };

/** Le tre voci, con gli effetti letti il 2026-10-31 (uid dalla 234, derivati dalla voce: uguali su ogni copia) e l'uid del turno da riscrivere. */
const VOCI: ReadonlyArray<{ uid: string; data: string; giorno: string; testo: string; attesi: Array<{ uid: string; effetto: EffettoVoce }>; turno: string }> = [
  { uid: '29c27bf247246474df1dfca749d0daad', data: '06-09', giorno: 'giovedì', testo: 'Fascino +2',
    attesi: [{ uid: 'a7e78ba9d96343b47f36839e57be0ded', effetto: turnoSenzaEsito }], turno: 'a7e78ba9d96343b47f36839e57be0ded' },
  { uid: '2bfee883c4f851300607c11ac6ba07c4', data: '06-13', giorno: 'lunedì', testo: 'Fascino +2, Coraggio +1',
    attesi: [{ uid: '634232a4988ea59fcc62f24db41e6ad8', effetto: coraggio }, { uid: '0ca828680ad4a5908d776f501464a857', effetto: turnoSenzaEsito }], turno: '0ca828680ad4a5908d776f501464a857' },
  { uid: 'b33c622e3fa9d0bd032837a040dcd2bb', data: '06-16', giorno: 'giovedì', testo: 'Fascino +2, Coraggio +1',
    attesi: [{ uid: '5b787393d92687ea5a118df960f77094', effetto: coraggio }, { uid: '12d031a473a49c44248b8ae0ccac99e4', effetto: turnoSenzaEsito }], turno: '12d031a473a49c44248b8ae0ccac99e4' },
];

/** L'impronta di ogni riga dello schema `utente`: deve restare identica. */
function improntaPartite(db: AppDatabase): string {
  const h = createHash('sha256');
  for (const t of (db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table' ORDER BY name").all() as Array<{ name: string }>).map((x) => x.name)) {
    h.update(`#${t}\n`);
    for (const r of db.prepare(`SELECT * FROM utente."${t}"`).iterate()) h.update(JSON.stringify(r) + '\n');
  }
  return h.digest('hex');
}

/** L'attività dichiara ancora l'esito «bagno-normale» con Fascino ♪♪ (e solo quello)? Altrimenti l'esito della voce non direbbe il testo. */
function esitoDichiarato(db: AppDatabase): { ok: boolean; letto: unknown } {
  const r = db.prepare('SELECT * FROM main.attivita WHERE chiave = ?').get(ATTIVITA) as { esiti_json?: string | null } | undefined;
  if (!r) return { ok: false, letto: 'attività assente' };
  const esiti = leggiEsitiAttivita(r.esiti_json ?? null);
  const e = esiti?.esiti.find((x) => x.chiave === ESITO);
  const ok = !!e && e.doti.length === 1 && e.doti[0]!.dote === 'fascino' && e.doti[0]!.note === 2;
  return { ok, letto: e ? { modo: esiti!.modo, chiave: e.chiave, nome: e.nome, doti: e.doti } : esiti ? `esito «${ESITO}» non dichiarato` : 'attività senza esiti' };
}

function scriviAudit(db: AppDatabase, esecuzione: Record<string, unknown>, cambiato: boolean): void {
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
  if (vecchio && !cambiato) return;
  let esecuzioni: unknown[] = [];
  if (vecchio) { try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; } }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(AUDIT, j({
      migrazione: 319, lotto: LOTTO, richiesta: RICHIESTA, fonte: FONTE,
      guida: 'il bagno è «rigenerante» il lunedì e il giovedì: la condizione dell’esito medicinale è corretta e non si cambia; vale la scelta dell’utente sul testo delle voci',
      modello: 'una voce può dichiarare l’esito anche per un’attività nel modo automatico: l’esito dichiarato prevale sul calcolo del giorno (esitiAttivitaService.risolviEsitoTurno, ricevuta `dallaVoce`)',
      regola: 'stesso uid e stesso posto del turno (convertiVoce con modifica); solo sugli effetti letti il 2026-10-31 e se l’attività dichiara ancora «bagno-normale» con Fascino ♪♪; le partite non si scrivono mai',
      lasciati: [
        { voce: '995d18392fe29fc99f144b22dbde8708', data: '06-21', perche: 'martedì: il calcolo del giorno dà già il bagno normale, la voce resta automatica' },
        { voce: '817e560d8cb82f8b861a01329b11aa9c', data: '07-06', perche: 'mercoledì: il calcolo del giorno dà già il bagno normale, la voce resta automatica' },
      ],
      esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }],
    }));
}

export const migration319: Migration = {
  id: 319,
  name: 'bagno_esito_dalla_voce',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['attivita', 'dati_guida', 'voce_giornata', 'voce_effetto', 'voce_effetto_transizione']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 319, tabella: t }, 'tabella assente: niente da fare'); return; }
    }
    const adesso = new Date().toISOString();
    const partiteAttaccate = (db.prepare('PRAGMA database_list').all() as Array<{ name: string }>).some((s) => s.name === 'utente');
    const partitePrima = partiteAttaccate ? improntaPartite(db) : null;
    const partite = tabellePartiteConVoce(db);
    const attivita = esitoDichiarato(db);
    const esiti: Array<{ chiave: string; esito: string; giorno?: string; testo?: string; prima?: unknown; dopo?: unknown }> = attivita.ok
      ? VOCI.map((v) => {
        // il testo della voce letto il 2026-10-31: una voce rinominata o spostata è dell'utente e si salta (`convertiVoce`)
        const e = convertiVoce(db, {
          uid: v.uid, data: v.data, azione: AZIONE, attesi: v.attesi, togli: [], aggiungi: [], lotto: LOTTO,
          modifica: [{ uid: v.turno, effetto: turnoBagnoNormale }],
          ancheSpuntata: { decisione: DECISIONE },
          motivo: `il testo della voce dice «${v.testo}»: vale il bagno normale anche di ${v.giorno} (decisione dell’utente del 2026-10-31; ${FONTE})`,
        }, partite, adesso);
        return { ...e, giorno: v.giorno, testo: v.testo };
      })
      : [{ chiave: `attivita:${ATTIVITA}`, esito: 'saltata: l’attività non dichiara più «bagno-normale» con Fascino ♪♪: nessuna voce toccata', prima: attivita.letto }];
    if (partiteAttaccate && improntaPartite(db) !== partitePrima) errore('le partite risultano cambiate');
    const cambiato = esiti.some((e) => e.esito.startsWith('convertita'));
    const conteggi = { convertite: esiti.filter((e) => e.esito.startsWith('convertita')).length, gia: esiti.filter((e) => e.esito === 'già convertita').length, saltate: esiti.filter((e) => e.esito.startsWith('saltata')).length };
    if (cambiato) invalidaCacheDiGioco();
    scriviAudit(db, { conteggi, esiti, attivita: attivita.letto, improntaPartite: partitePrima }, cambiato);
    logger.info({ migrazione: 319, ...conteggi }, 'Bagno pubblico del 9, 13 e 16 giugno: l’esito lo dichiara la voce');
  },
};
