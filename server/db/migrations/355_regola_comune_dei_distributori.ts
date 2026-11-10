// ============================================================
// 355 — la regola comune dei distributori in un punto solo (L4-01; risposta dell'utente a Q5: A, con la modifica della Decisione 21)
// ============================================================
//
// «Lunedì, 2 pezzi, non col caldo» stava ripetuta in ogni offerta delle macchine. Da qui vive in una riga di `regola_tipo_negozio` (tipo
// `distributore`): pezzi per ciclo, regola di rifornimento (settimanale, lunedì, dalla guida, da verificare in gioco) e condizioni (niente
// ondata di calore né notte torrida). Ogni offerta di una macchina che coincide esattamente con la regola la segue (`articolo.regola_comune`
// = 1): i suoi tre campi restano scritti nella riga, che è quella che leggono la scorta, la disponibilità e il registro degli acquisti, ma
// si cambiano soltanto dalla regola (`regoleNegoziService`). Le altre sono eccezioni per riga e restano come sono, con la loro origine e il
// loro «da verificare»: le regole dell'utente (`fallback-utente`), le tre della guida senza «da verificare», le sei senza condizioni e quella
// con le due condizioni in ordine inverso.
//
// Nessun valore cambia: l'impronta di `articolo` (senza la colonna nuova) è identica prima e dopo, quindi scorte, acquisti e disponibilità
// sono gli stessi. Idempotente: tabella e colonna si creano solo se mancano, la regola si inserisce solo se manca, il segno si ricalcola
// sempre allo stesso modo. Verbale: `dati_guida.audit-l4-01-regola-comune`. Nessun import da `server/services/`; non si scrive in `utente`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna, improntaTabella } from './pulizieL11.js';
import { registraAudit } from './archivioL1.js';

const errore = (motivo: string): never => { throw new Error(`355: ${motivo}; nessuna modifica applicata.`); };

/** La regola dei distributori della guida (Distributori automatici; Decisione 21, migrazioni 243-244). */
export const REGOLA_DISTRIBUTORI = {
  tipo: 'distributore',
  quantita: 2,
  rifornimento_json: JSON.stringify({ tipo: 'settimana', giorno: 'lunedi', daVerificare: true, origine: 'guida' }),
  condizioni_json: JSON.stringify([{ tipo: 'meteo', condizione: 'senza-allerta', allerta: 'ondata-di-calore' }, { tipo: 'meteo', condizione: 'senza-allerta', allerta: 'notte-torrida' }]),
  fonte: 'https://www.allgamestaff.it/persona-5-royal/distributori-automatici/',
} as const;

/** Un JSON con le chiavi in ordine, per confrontare due valori che differiscono solo nell'ordine delle chiavi di un oggetto. */
function canonico(json: string | null): string | null {
  if (json === null) return null;
  const ordina = (v: unknown): unknown => (Array.isArray(v) ? v.map(ordina)
    : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, ordina(x)])) : v);
  try { return JSON.stringify(ordina(JSON.parse(json))); } catch { return `illeggibile:${json}`; }
}

export const migration355: Migration = {
  id: 355,
  name: 'regola_comune_dei_distributori',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!['negozio', 'articolo', 'dati_guida'].every((t) => esisteTabella(db, t)) || !haColonna(db, 'articolo', 'rifornimento_json')) return;
    const prima = improntaTabella(db, 'articolo', ['regola_comune']);

    const tabellaNuova = !esisteTabella(db, 'regola_tipo_negozio');
    if (tabellaNuova) {
      db.exec(`CREATE TABLE main.regola_tipo_negozio (
        tipo              TEXT PRIMARY KEY,
        quantita          INTEGER CHECK (quantita IS NULL OR quantita >= 0),
        rifornimento_json TEXT CHECK (rifornimento_json IS NULL OR json_valid(rifornimento_json)),
        condizioni_json   TEXT CHECK (condizioni_json IS NULL OR json_valid(condizioni_json)),
        fonte             TEXT NOT NULL DEFAULT '',
        updated_at        TEXT NOT NULL
      )`);
    }
    const regolaNuova = !db.prepare('SELECT 1 FROM main.regola_tipo_negozio WHERE tipo = ?').get(REGOLA_DISTRIBUTORI.tipo);
    if (regolaNuova) {
      db.prepare('INSERT INTO main.regola_tipo_negozio (tipo, quantita, rifornimento_json, condizioni_json, fonte, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(REGOLA_DISTRIBUTORI.tipo, REGOLA_DISTRIBUTORI.quantita, REGOLA_DISTRIBUTORI.rifornimento_json, REGOLA_DISTRIBUTORI.condizioni_json, REGOLA_DISTRIBUTORI.fonte, new Date().toISOString());
    }
    const colonnaNuova = !haColonna(db, 'articolo', 'regola_comune');
    if (colonnaNuova) db.exec('ALTER TABLE main.articolo ADD COLUMN regola_comune INTEGER NOT NULL DEFAULT 0 CHECK (regola_comune IN (0, 1))');

    // il segno, dalla regola com'è salvata (una seconda esecuzione, o una regola già cambiata dall'utente, segna con quella)
    const regola = db.prepare('SELECT quantita, rifornimento_json, condizioni_json FROM main.regola_tipo_negozio WHERE tipo = ?').get(REGOLA_DISTRIBUTORI.tipo) as
      { quantita: number | null; rifornimento_json: string | null; condizioni_json: string | null };
    const offerte = db.prepare(`SELECT a.chiave, a.quantita, a.rifornimento_json, a.condizioni_json FROM main.articolo a JOIN main.negozio n ON n.chiave = a.negozio_chiave
      WHERE n.tipo = ? ORDER BY a.chiave`).all(REGOLA_DISTRIBUTORI.tipo) as Array<{ chiave: string; quantita: number | null; rifornimento_json: string | null; condizioni_json: string | null }>;
    const seguono: string[] = [];
    const eccezioni: Array<{ chiave: string; perche: string[] }> = [];
    for (const o of offerte) {
      // le condizioni si confrontano come sono scritte: l'ordine conta (la riga con le due condizioni invertite resta un'eccezione)
      const perche = [
        o.quantita !== regola.quantita ? 'pezzi' : null,
        canonico(o.rifornimento_json) !== canonico(regola.rifornimento_json) ? 'rifornimento' : null,
        canonico(o.condizioni_json) !== canonico(regola.condizioni_json) ? 'condizioni' : null,
      ].filter((x): x is string => x !== null);
      if (perche.length === 0) seguono.push(o.chiave); else eccezioni.push({ chiave: o.chiave, perche });
    }
    const segna = db.prepare('UPDATE main.articolo SET regola_comune = ? WHERE chiave = ? AND regola_comune <> ?');
    let cambiati = 0;
    for (const k of seguono) cambiati += segna.run(1, k, 1).changes;
    for (const e of eccezioni) cambiati += segna.run(0, e.chiave, 0).changes;
    if (improntaTabella(db, 'articolo', ['regola_comune']) !== prima) errore('i valori delle offerte sono cambiati');
    if (!tabellaNuova && !regolaNuova && !colonnaNuova && cambiati === 0) return;

    const daVerificare = db.prepare(`SELECT COUNT(*) FROM main.articolo a JOIN main.negozio n ON n.chiave = a.negozio_chiave
      WHERE n.tipo = ? AND json_valid(a.rifornimento_json) AND json_extract(a.rifornimento_json, '$.daVerificare') = 1`).pluck().get(REGOLA_DISTRIBUTORI.tipo) as number;
    const dettagli = { offerte: offerte.length, seguono: seguono.length, eccezioni: eccezioni.length, daVerificare, cambiati,
      chiaviCheSeguono: seguono, eccezioniPerRiga: eccezioni };
    registraAudit(db, 'audit-l4-01-regola-comune', { migrazione: 'L4-01 · 355', ...dettagli });
    logger.info({ migrazione: 'L4-01-355', offerte: offerte.length, seguono: seguono.length, eccezioni: eccezioni.length, daVerificare }, 'regola comune dei distributori');
  },
};
