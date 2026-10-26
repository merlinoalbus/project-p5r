// ============================================================
// Migrazione 277 — l'offerta della Collana cremisi di 37 Gradi Celsius si nasconde: la guida la mette solo da Stoneon (Ondata 5, Lotto F)
// ============================================================
//
// Decisione 21 dell'utente: «Non sono d'accordo nel rimandare attività a fasi successive» (rilievo 7 della revisione del lotto F: un
// difetto noto va corretto o portato all'utente). Guida italiana [Accessori]: «Collana cremisi | Amplifica fuoco | … | 40.000 ¥ | Negozi:
// Cristalloterapia Stoneon, Kichijoji (da Domenica 6/05)»; 37 Gradi Celsius (Shibuya) vende gli anelli e gli strangolini degli HP e degli SP
// massimi, non le collane. Nei dati l'offerta `37-gradi-celsius/collana-cremisi` (40.000 ¥) è una seconda copia della stessa offerta di
// Stoneon, in un negozio sbagliato: si nasconde, come il Braccialetto d'argento dello stesso negozio (lotto C, 252).
//
// Come la nasconde l'app (`catalogoService.nascondiElemento`): `nascosto = 1`, con la fotografia della guida in `seed_json` se non c'è già,
// così «Mostra» la rimette com'era. Conservativa: solo se l'offerta è ancora quella della guida (visibile, `origine = 'seed'`) e nessun dato
// la usa — voci del Diario (`voce_effetto`), acquisti e registri delle partite (ogni colonna che nomina l'articolo): se qualcosa la usa resta
// visibile e l'audit lo dice. Audit `dati_guida.audit-277-collana-37-gradi`. Nessuna voce del Diario cambia. Idempotente.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { FONTE_ACCESSORI, improntaDiario, scriviAuditTesti } from './testiOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-277-collana-37-gradi';
const OFFERTA = '37-gradi-celsius/collana-cremisi';
const errore = (motivo: string): never => { throw new Error(`277: ${motivo}; nessuna modifica applicata.`); };
/** Le colonne della fotografia di un'offerta, come le salva l'app (`catalogoService`, campi scrivibili dell'articolo con il catalogo). */
const CAMPI_FOTO = ['condizioni_json', 'negozio_chiave', 'nome', 'categoria', 'per', 'prezzo', 'prezzo_per_fascia_json', 'quantita', 'rifornimento_json',
  'oggetto_fonte', 'oggetto_chiave', 'catalogo_chiave', 'costo_json', 'nota', 'verificato'] as const;

/** Dove i dati nominano l'offerta: voci del Diario e tabelle (gioco e partite) con una colonna dell'articolo. */
function usi(db: AppDatabase, chiave: string): string[] {
  const trovati: string[] = [];
  if (esisteTabella(db, 'voce_effetto')) {
    const n = db.prepare('SELECT COUNT(*) FROM main.voce_effetto WHERE chiave = ? OR instr(dati_json, ?) > 0').pluck().get(chiave, `"${chiave}"`) as number;
    if (n) trovati.push(`voce_effetto: ${n}`);
  }
  const schemi = (db.prepare('PRAGMA database_list').all() as Array<{ name: string }>).map((d) => d.name).filter((s) => s === 'main' || s === 'utente');
  for (const schema of schemi) {
    const tabelle = db.prepare(`SELECT name FROM ${schema}.sqlite_master WHERE type = 'table' AND name <> 'articolo' AND name NOT LIKE 'sqlite_%'`).pluck().all() as string[];
    for (const t of tabelle) {
      const colonne = (db.prepare(`PRAGMA ${schema}.table_info("${t}")`).all() as Array<{ name: string }>).map((c) => c.name).filter((c) => /articolo/.test(c));
      for (const c of colonne) {
        const n = db.prepare(`SELECT COUNT(*) FROM ${schema}."${t}" WHERE "${c}" = ?`).pluck().get(chiave) as number;
        if (n) trovati.push(`${schema}.${t}.${c}: ${n}`);
      }
    }
  }
  return trovati;
}

/**
 * Nasconde un'offerta della guida come la nasconde l'app (`nascosto = 1`, fotografia in `seed_json` se non c'è), solo se è ancora visibile,
 * della guida e nessun dato la usa; altrimenti resta e l'esito lo dice. La usa anche la 278 (offerta doppia dei Braccialetti tematici).
 */
export function nascondiOffertaDellaGuida(db: AppDatabase, chiave: string, migrazione: number): { esito: string; nascoste: number; usi: string[] } {
  const r = db.prepare('SELECT * FROM main.articolo WHERE chiave = ?').get(chiave) as Record<string, unknown> | undefined;
  const trovati = r ? usi(db, chiave) : [];
  if (!r) return { esito: 'offerta assente', nascoste: 0, usi: trovati };
  if (r.nascosto === 1) return { esito: 'già nascosta', nascoste: 0, usi: trovati };
  if (r.origine !== 'seed') return { esito: 'offerta corretta dall’utente: non toccata', nascoste: 0, usi: trovati };
  if (trovati.length) return { esito: `offerta usata dai dati (${trovati.join('; ')}): resta visibile`, nascoste: 0, usi: trovati };
  const foto = JSON.stringify(Object.fromEntries(CAMPI_FOTO.filter((c) => haColonna(db, 'articolo', c)).map((c) => [c, r[c] ?? null])));
  const nascoste = db.prepare("UPDATE main.articolo SET nascosto = 1, seed_json = COALESCE(seed_json, ?), updated_at = ? WHERE chiave = ? AND nascosto = 0 AND origine = 'seed'")
    .run(foto, new Date().toISOString(), chiave).changes;
  if (nascoste !== 1) throw new Error(`${migrazione}: l’offerta ${chiave} non si nasconde; nessuna modifica applicata.`);
  return { esito: 'nascosta', nascoste, usi: trovati };
}

export const migration277: Migration = {
  id: 277,
  name: 'collana_cremisi_di_37_gradi',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'articolo')) { logger.warn({ migrazione: 277 }, 'articoli assenti: niente da fare'); return; }
    const diarioPrima = improntaDiario(db);
    const { esito, nascoste, usi: trovati } = nascondiOffertaDellaGuida(db, OFFERTA, 277);
    if (improntaDiario(db) !== diarioPrima) errore('le voci del Diario sono cambiate');
    if (nascoste) invalidaCacheDiGioco();
    scriviAuditTesti(db, AUDIT, 277, { fonti: [FONTE_ACCESSORI], offerta: OFFERTA, esito, usi: trovati }, nascoste);
    logger.info({ migrazione: 277, esito }, 'Negozi: Collana cremisi di 37 Gradi Celsius (la guida la mette solo da Stoneon)');
  },
};
