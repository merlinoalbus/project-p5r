// ============================================================
// 052 — condizioni strutturate anche per libri, film e attività
// ============================================================
//
// **Due difetti, la stessa causa.** Il modulo del catalogo mostra l'editor delle condizioni per
// tutte e cinque le famiglie, ma solo `negozio` e `articolo` avevano la colonna dove metterle: per
// un libro, un film o un'attività quello che si scriveva veniva **buttato via in silenzio**, e chi
// lo scriveva non aveva modo di accorgersene. E dall'altra parte, la disponibilità di quelle righe
// restava prosa che nessuno valutava — «dal 18 aprile», «dal 24 aprile», «5 giugno, evento con
// Ryuji Sakamoto» — quindi l'app mostrava come acquistabile oggi un libro che esce a settembre.
//
// La colonna arriva qui, e le righe della guida vengono **tradotte dalla prosa** con lo stesso
// lettore che i negozi usano da sempre: le date sono la parte che sa leggere meglio, ed è la parte
// che qui conta. Dove non capisce non inventa: nessuna condizione, e la riga resta disponibile —
// che è come si comportava prima per tutte.
//
// La traduzione si rifà a ogni avvio sulle righe del seed (`origine = 'seed'`), come per i negozi:
// così una correzione dei testi nella guida si porta dietro anche la regola.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type Database from 'better-sqlite3';
import { migraTestiCondizioni } from '../../../shared/migraCondizioni.js';
import { contestoConversione, contestoRiga } from '../../services/condizioni/contestoConversione.js';

/** Le famiglie toccate e i campi in prosa da cui si ricava la disponibilità. */
const DA_PROSA = {
  libro: ['disponibile_dal'],
  film: ['periodo'],
  attivita: ['sblocco'],
} as const;

/** «18 aprile» in una colonna che si chiama `disponibile_dal` vuol dire «dal 18 aprile».
 *
 * Il lettore delle condizioni riconosce «dal 18 aprile» e non «18 aprile»: senza questa riga i
 * quarantasei libri finivano tutti in `da-configurare`, cioè in un punto interrogativo, quando il
 * dato invece c'era ed era chiarissimo — è il nome della colonna a dire «da». Si aggiunge la
 * preposizione solo quando manca e quando il testo comincia davvero con una data. */
export function conPreposizione(testo: string | null): string | null {
  if (!testo) return testo;
  const t = testo.trim();
  return /^\d{1,2} [a-zà-ù]+$/i.test(t) || /^primo [a-zà-ù]+$/i.test(t) ? `dal ${t}` : t;
}

/** Riscrive `condizioni_json` per le righe della guida (le tue restano come le hai scritte). */
export function sincronizzaCondizioniLetture(db: Database.Database): void {
  const base = contestoConversione(db);
  for (const [tabella, campi] of Object.entries(DA_PROSA)) {
    const colonne = (db.prepare(`PRAGMA table_info(${tabella})`).all() as Array<{ name: string }>).map((c) => c.name);
    if (!colonne.includes('condizioni_json')) continue;
    const conOrigine = colonne.includes('origine');
    const righe = db.prepare(`SELECT * FROM ${tabella}${conOrigine ? " WHERE origine = 'seed' OR condizioni_json IS NULL" : ''}`).all() as Array<Record<string, unknown>>;
    for (const r of righe) {
      const testi = campi.map((c) => conPreposizione((r[c] ?? null) as string | null));
      const condizioni = migraTestiCondizioni(testi, contestoRiga(db, base, { tabella, chiave: String(r.chiave) }));
      db.prepare(`UPDATE ${tabella} SET condizioni_json = ? WHERE chiave = ?`).run(JSON.stringify(condizioni), r.chiave);
    }
  }
}

export const migration052: Migration = {
  id: 52,
  name: 'condizioni_letture_attivita',
  up(db) {
    for (const tabella of Object.keys(DA_PROSA)) {
      const colonne = (db.prepare(`PRAGMA table_info(${tabella})`).all() as Array<{ name: string }>).map((c) => c.name);
      if (!colonne.includes('condizioni_json')) db.exec(`ALTER TABLE ${tabella} ADD COLUMN condizioni_json TEXT`);
    }
    sincronizzaCondizioniLetture(db);
  },
};
