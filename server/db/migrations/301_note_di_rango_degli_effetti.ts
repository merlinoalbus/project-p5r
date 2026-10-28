// ============================================================
// Migrazione 301 — le note di rango degli effetti «punti a un Confidente» (richiesta dell'utente del 2026-10-28)
// ============================================================
//
// Richiesta dell'utente: «i punti rango andavano gestiti come note non come punti specifici... puoi correggere?». L'effetto della voce
// «puntiConfidente» (nato lo stesso giorno con la utente 055) scriveva punti fissi; ora scrive le note (♪, ♪♪, ♪♪♪, come le risposte nei
// dialoghi) e i punti li calcola la spunta con la regola unica delle risposte (`shared/puntiConfidenti.ts`). Un effetto già salvato con i punti
// non si cambia in silenzio:
//   - si porta in note SOLO se i punti sono esattamente quelli base di una risposta (5 → ♪, 10 → ♪♪, 15 → ♪♪♪), sullo stesso uid e nello stesso
//     posto, con il registro di transizione e quello delle operazioni sugli effetti (prima e dopo);
//   - con altri punti resta com'è (leggibile e mostrato «+N punti»; alla spunta dà i suoi punti come scritti) ed è elencato in questo audit;
//   - le proposte aperte (`proposta_effetto_voce`) con quell'effetto seguono la stessa regola; le decise sono storia e non si toccano.
// Le partite non si toccano: le spunte già date tengono nel registro dei punti (`utente.punti_confidente_voce`) i punti fissi di allora, letti
// e mostrati come prima; l'audit conta quante sono (sola lettura). Idempotente: un effetto già in note non si tocca.
// Audit in `dati_guida.audit-301-note-di-rango`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { canonico, impronta, uidDa } from './fbisOndata5.js';
import { normalizzaEffettoVoce, type EffettoVoce } from '../../../shared/effettiVoce.js';

const AUDIT = 'audit-301-note-di-rango';
const LOTTO = 'note-di-rango-301';
const RICHIESTA = '2026-10-28: «i punti rango andavano gestiti come note non come punti specifici... puoi correggere?»';
const errore = (motivo: string): never => { throw new Error(`301: ${motivo}; nessuna modifica applicata.`); };

/** Le note che valgono esattamente quei punti base (5 per nota), o null. */
const noteDaPunti = (punti: number): 1 | 2 | 3 | null => (punti === 5 ? 1 : punti === 10 ? 2 : punti === 15 ? 3 : null);

type Esito = { voce: string; effetto: string; confidente: string | null; prima: unknown; esito: string; partite?: number };

/** L'effetto letto da un testo JSON: null se illeggibile (resta com'è e si dice nell'audit). */
function leggi(dati: string): EffettoVoce | null {
  try { return normalizzaEffettoVoce(JSON.parse(dati)); } catch { return null; }
}
/** Il JSON grezzo per l'audit (il testo se non si legge). */
function grezzo(dati: string): unknown {
  try { return JSON.parse(dati) as unknown; } catch { return dati; }
}

/** Lo schema delle partite è attaccato e ha la tabella? (sola lettura) */
function tabellaPartite(db: AppDatabase, tabella: string): boolean {
  const schemi = db.prepare('PRAGMA database_list').all() as Array<{ name: string }>;
  return schemi.some((s) => s.name === 'utente') && !!db.prepare("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = ?").get(tabella);
}

/** Quante partite hanno spuntato la voce (sola lettura); 0 senza lo schema delle partite. */
function spunteDellaVoce(db: AppDatabase, voce: string): number {
  if (!tabellaPartite(db, 'spunta_voce_partita')) return 0;
  return (db.prepare('SELECT COUNT(*) AS n FROM utente.spunta_voce_partita WHERE voce_uid = ?').get(voce) as { n: number }).n;
}

/** Gli effetti della voce, nell'ordine (uid ed effetto), per il registro; un effetto illeggibile ferma la migrazione (nessun dato perso). */
function effettiDellaVoce(db: AppDatabase, voce: string): Array<{ uid: string; effetto: EffettoVoce }> {
  return (db.prepare('SELECT uid, dati_json FROM main.voce_effetto WHERE voce_uid = ? ORDER BY ordine').all(voce) as Array<{ uid: string; dati_json: string }>)
    .map((r) => { const e = leggi(r.dati_json); return { uid: r.uid, effetto: e ?? errore(`l'effetto ${r.uid} della voce ${voce} non si legge`) }; });
}

/** (1) Gli effetti delle voci. */
function effettiDelleVoci(db: AppDatabase, adesso: string, esiti: Esito[]): void {
  const righe = db.prepare("SELECT uid, voce_uid, chiave, dati_json FROM main.voce_effetto WHERE tipo = 'puntiConfidente' ORDER BY voce_uid, ordine").all() as
    Array<{ uid: string; voce_uid: string; chiave: string | null; dati_json: string }>;
  const perVoce = new Map<string, typeof righe>();
  for (const r of righe) perVoce.set(r.voce_uid, [...(perVoce.get(r.voce_uid) ?? []), r]);
  for (const [voce, daVedere] of perVoce) {
    const daConvertire: Array<{ uid: string; dopo: EffettoVoce }> = [];
    for (const r of daVedere) {
      const e = leggi(r.dati_json);
      const base = { voce, effetto: r.uid, confidente: r.chiave, prima: grezzo(r.dati_json), partite: spunteDellaVoce(db, voce) };
      if (!e || e.tipo !== 'puntiConfidente') { esiti.push({ ...base, esito: 'illeggibile: lasciato com’era' }); continue; }
      if ('note' in e) continue; // già in note (nuovo, o già portato da questa migrazione)
      const note = noteDaPunti(e.punti);
      if (note === null) { esiti.push({ ...base, esito: `lasciato con i punti fissi (+${e.punti}): non corrispondono a ♪, ♪♪ o ♪♪♪ (5, 10, 15)` }); continue; }
      daConvertire.push({ uid: r.uid, dopo: { tipo: 'puntiConfidente', confidente: e.confidente, note } });
      esiti.push({ ...base, esito: `portato in note: +${e.punti} → ${'♪'.repeat(note)}` });
    }
    if (!daConvertire.length) continue;
    // un altro effetto illeggibile della stessa voce non deve fermare l'avvio: la voce resta com'è e l'audit lo dice
    let prima: ReturnType<typeof effettiDellaVoce>;
    try { prima = effettiDellaVoce(db, voce); }
    catch {
      for (const c of daConvertire) {
        const i = esiti.findIndex((x) => x.voce === voce && x.effetto === c.uid);
        if (i >= 0) esiti[i] = { ...esiti[i]!, esito: 'lasciato con i punti fissi: la voce ha un altro effetto illeggibile' };
      }
      continue;
    }
    for (const c of daConvertire) {
      if (canonico(normalizzaEffettoVoce(JSON.parse(canonico(c.dopo)))) !== canonico(c.dopo)) errore(`effetto in note non valido sulla voce ${voce}`);
      if (db.prepare('UPDATE main.voce_effetto SET dati_json = ?, updated_at = ? WHERE uid = ? AND voce_uid = ?').run(canonico(c.dopo), adesso, c.uid, voce).changes !== 1) errore(`l'effetto ${c.uid} non è stato scritto`);
    }
    // rilettura: gli effetti sono quelli di prima, con le note al posto dei punti nei soli convertiti
    const ora = effettiDellaVoce(db, voce);
    const attesi = prima.map((x) => daConvertire.find((c) => c.uid === x.uid) ? { uid: x.uid, effetto: daConvertire.find((c) => c.uid === x.uid)!.dopo } : x);
    if (canonico(ora) !== canonico(attesi)) errore(`effetti riletti diversi da quelli scritti sulla voce ${voce}`);
    // il registro di transizione: l'impronta degli effetti di adesso (la stessa del salvataggio della guida, `improntaDato`)
    if (esisteTabella(db, 'voce_effetto_transizione')) {
      db.prepare("UPDATE main.voce_effetto_transizione SET impronta = ?, aggiornata_il = ? WHERE voce_uid = ? AND stato = 'convertita'").run(impronta(ora.map((x) => x.effetto)), adesso, voce);
    }
    // il registro delle operazioni sugli effetti, come per ogni salvataggio: la conversione resta nella storia della voce, con prima e dopo
    if (esisteTabella(db, 'operazione_effetti_voce')) {
      db.prepare('INSERT OR IGNORE INTO main.operazione_effetti_voce (id, voce_uid, payload_json, prima_json, dopo_json, creata_il) VALUES (?, ?, ?, ?, ?, ?)')
        .run(uidDa(`${LOTTO}:operazione:${voce}:${canonico(ora)}`), voce, canonico({ lotto: LOTTO, motivo: RICHIESTA }), canonico({ effetti: prima }), canonico({ effetti: ora }), adesso);
    }
  }
}

/** (2) Le proposte aperte con l'effetto (stessa regola; le decise sono storia e non si toccano). */
function proposteAperte(db: AppDatabase, adesso: string, esiti: Esito[]): void {
  if (!esisteTabella(db, 'proposta_effetto_voce')) return;
  const righe = db.prepare("SELECT id, voce_uid, chiave, dati_json FROM main.proposta_effetto_voce WHERE tipo = 'puntiConfidente' AND stato = 'aperta' ORDER BY id").all() as
    Array<{ id: string; voce_uid: string; chiave: string | null; dati_json: string }>;
  for (const r of righe) {
    const e = leggi(r.dati_json);
    const base = { voce: r.voce_uid, effetto: `proposta:${r.id}`, confidente: r.chiave, prima: grezzo(r.dati_json) };
    if (!e || e.tipo !== 'puntiConfidente') { esiti.push({ ...base, esito: 'proposta illeggibile: lasciata com’era' }); continue; }
    if ('note' in e) continue;
    const note = noteDaPunti(e.punti);
    if (note === null) { esiti.push({ ...base, esito: `proposta lasciata con i punti fissi (+${e.punti}): non corrispondono a ♪, ♪♪ o ♪♪♪ (5, 10, 15)` }); continue; }
    if (db.prepare("UPDATE main.proposta_effetto_voce SET dati_json = ?, updated_at = ? WHERE id = ? AND stato = 'aperta'")
      .run(canonico({ tipo: 'puntiConfidente', confidente: e.confidente, note }), adesso, r.id).changes !== 1) errore(`la proposta ${r.id} non è stata scritta`);
    esiti.push({ ...base, esito: `proposta portata in note: +${e.punti} → ${'♪'.repeat(note)}` });
  }
}

/** Le righe del registro dei punti delle partite con i punti fissi di un effetto (sola lettura): restano, lette e mostrate come allora. */
function righeFisseNellePartite(db: AppDatabase): number | null {
  if (!tabellaPartite(db, 'punti_confidente_voce')) return null;
  return (db.prepare("SELECT COUNT(*) AS n FROM utente.punti_confidente_voce WHERE tipo = 'punti' AND json_valid(parametri_json) AND json_type(parametri_json, '$.fissi') IS NOT NULL").get() as { n: number }).n;
}

/** L'audit: la prima esecuzione sempre, le successive solo se hanno cambiato o trovato qualcosa. */
function scriviAudit(db: AppDatabase, esecuzione: Record<string, unknown>, daDire: boolean): void {
  if (!esisteTabella(db, 'dati_guida')) return;
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
  if (vecchio && !daDire) return;
  let esecuzioni: unknown[] = [];
  if (vecchio) { try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; } }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(AUDIT, JSON.stringify({ migrazione: 301, richiesta: RICHIESTA, regola: 'in note solo con punti esattamente 5, 10 o 15; gli altri restano con i punti fissi', esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }] }));
}

export const migration301: Migration = {
  id: 301,
  name: 'note_di_rango_degli_effetti',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'voce_effetto')) { logger.warn({ migrazione: 301 }, 'effetti delle voci assenti: niente da fare'); return; }
    const adesso = new Date().toISOString();
    const esiti: Esito[] = [];
    effettiDelleVoci(db, adesso, esiti);
    proposteAperte(db, adesso, esiti);
    const conteggi = {
      portatiInNote: esiti.filter((e) => e.esito.includes('portat')).length,
      lasciatiConIPunti: esiti.filter((e) => e.esito.includes('lasciat')).length,
      righeFisseNellePartite: righeFisseNellePartite(db),
    };
    scriviAudit(db, { conteggi, esiti }, esiti.length > 0);
    logger.info({ migrazione: 301, ...conteggi }, 'note di rango degli effetti «punti a un Confidente»');
  },
};
