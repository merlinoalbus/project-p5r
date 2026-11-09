// ============================================================
// 365 — il testo dei requisiti dei Confidenti diventa la nota (L7-02)
// ============================================================
//
// `confidente_requisito.testo` ripeteva in gran parte `dati_json` e in parte raccontava altro. La frase ora si genera dalla condizione (`descriviRequisitoSpillo`: una sola
// sede del dato, e il nome della Richiesta citata è vivo); la colonna resta come NOTA propria del requisito: vuota se ripeteva la struttura, altrimenti col solo testo che
// informa, senza ripetere data o nome della Richiesta (DECISIONI §2: una frase che ripete una condizione strutturata si toglie con archivio; quella che racconta altro resta).
//
// Il dato è un elenco CHIUSO scritto a mano, 189/189 righe (`requisitiNota365.ts`): chiave, testo atteso, esito. La guardia scrive solo se la riga ha ancora il testo
// atteso; ogni scostamento va nel verbale e la riga resta. Le righe `avviso` restano: la frase È il dato.
// `confidente_requisito_guida` non si tocca (impronta prima e dopo): siccome «Ripristina» copia da lì, in `dati_guida.requisiti-nota-guida-v1` si scrive per ogni sua riga la
// nota da usare al ripristino (`confidente|rango|indice` → nota).
//
// Originali in `dati_guida.archivio-frasi-l11` («confidente_requisito.testo»), verbale con l'esito di ogni riga in `dati_guida.audit-l7-365-testo-requisiti`. Idempotente:
// una riga già al testo voluto non si scrive. Nessun import da `server/services/`; non si scrive in `utente`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, improntaTabella } from './pulizieL11.js';
import { archiviaSenzaSovrascrivere, registraAudit } from './archivioL1.js';
import { ESITI_GUIDA_DIVERSI, ESITI_REQUISITI, chiaveRequisito, notaDellEsito } from './requisitiNota365.js';

const errore = (motivo: string): never => { throw new Error(`365: ${motivo}; nessuna modifica applicata.`); };
const MIGRAZIONE = 'L7-02 · 365';
export const CHIAVE_NOTE_GUIDA = 'requisiti-nota-guida-v1';

type Riga = { confidente_chiave: string; rango: number; indice: number; tipo: string; testo: string };

export const migration365: Migration = {
  id: 365,
  name: 'testo_requisiti_generato',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'confidente_requisito') || !esisteTabella(db, 'dati_guida')) return;
    const conGuida = esisteTabella(db, 'confidente_requisito_guida');
    const improntaGuida = conGuida ? improntaTabella(db, 'confidente_requisito_guida') : null;
    const improntaResto = improntaTabella(db, 'confidente_requisito', ['testo']);

    const sql = 'SELECT confidente_chiave, rango, indice, tipo, testo FROM main.';
    const righe = db.prepare(`${sql}confidente_requisito ORDER BY confidente_chiave, rango, indice`).all() as Riga[];
    const perChiave = new Map(righe.map((r) => [chiaveRequisito(r.confidente_chiave, r.rango, r.indice), r]));
    const scrivi = db.prepare('UPDATE main.confidente_requisito SET testo = ? WHERE confidente_chiave = ? AND rango = ? AND indice = ? AND testo = ?');

    const esiti: Array<{ chiave: string; esito: string; prima: string; dopo: string }> = [];
    const scostamenti: Array<{ chiave: string; atteso: string; trovato: string | null }> = [];
    const archivio: Record<string, string> = {};
    let scritte = 0;
    for (const e of ESITI_REQUISITI) {
      const chiave = chiaveRequisito(e.confidente, e.rango, e.indice);
      const r = perChiave.get(chiave);
      if (!r) { scostamenti.push({ chiave, atteso: e.testo, trovato: null }); continue; }
      const dopo = notaDellEsito(e);
      if (r.testo === dopo) { esiti.push({ chiave, esito: e.esito, prima: e.testo, dopo }); continue; }
      if (r.testo !== e.testo) { scostamenti.push({ chiave, atteso: e.testo, trovato: r.testo }); continue; }
      if (scrivi.run(dopo, r.confidente_chiave, r.rango, r.indice, e.testo).changes !== 1) errore(`il requisito ${chiave} non si aggiorna`);
      archivio[chiave] = e.testo;
      scritte++;
      esiti.push({ chiave, esito: e.esito, prima: e.testo, dopo });
    }
    const note = new Set(ESITI_REQUISITI.map((e) => chiaveRequisito(e.confidente, e.rango, e.indice)));
    const fuoriElenco = righe.flatMap((r) => { const chiave = chiaveRequisito(r.confidente_chiave, r.rango, r.indice); return note.has(chiave) ? [] : [{ chiave, testo: r.testo }]; });

    // la mappa per «Ripristina»: una riga della guida con un testo diverso da quello noto resta fuori (al ripristino vale il testo della guida)
    const mappa: Record<string, string> = {};
    const scostamentiGuida: Array<{ chiave: string; atteso: string | null; trovato: string }> = [];
    if (conGuida) {
      const guida = db.prepare(`${sql}confidente_requisito_guida ORDER BY confidente_chiave, rango, indice`).all() as Riga[];
      for (const g of guida) {
        const chiave = chiaveRequisito(g.confidente_chiave, g.rango, g.indice);
        const e = ESITI_GUIDA_DIVERSI.find((x) => chiaveRequisito(x.confidente, x.rango, x.indice) === chiave) ?? ESITI_REQUISITI.find((x) => chiaveRequisito(x.confidente, x.rango, x.indice) === chiave);
        if (!e || e.testo !== g.testo) { scostamentiGuida.push({ chiave, atteso: e?.testo ?? null, trovato: g.testo }); continue; }
        mappa[chiave] = notaDellEsito(e);
      }
    }
    const mappaJson = JSON.stringify(mappa);
    const mappaEsistente = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(CHIAVE_NOTE_GUIDA) as string | undefined;
    if (conGuida && mappaEsistente !== mappaJson) db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json').run(CHIAVE_NOTE_GUIDA, mappaJson);

    if (Object.keys(archivio).length > 0) archiviaSenzaSovrascrivere(db, MIGRAZIONE, 'confidente_requisito.testo', archivio);

    if (improntaResto !== improntaTabella(db, 'confidente_requisito', ['testo'])) errore('le altre colonne dei requisiti sono cambiate');
    if (conGuida && improntaGuida !== improntaTabella(db, 'confidente_requisito_guida')) errore('la copia della guida è cambiata');

    const conteggi = { confrontate: esiti.length + scostamenti.length, scritte, generate: esiti.filter((e) => e.esito === 'generato').length, note: esiti.filter((e) => e.esito === 'nota').length, avvisi: esiti.filter((e) => e.esito === 'avviso').length, scostamenti: scostamenti.length, fuoriElenco: fuoriElenco.length, mappaGuida: Object.keys(mappa).length, scostamentiGuida: scostamentiGuida.length };
    if (scritte > 0 || mappaEsistente !== mappaJson) registraAudit(db, 'audit-l7-365-testo-requisiti', { migrazione: MIGRAZIONE, conteggi, improntaGuida, esiti, scostamenti, fuoriElenco, scostamentiGuida });
    logger.info({ migrazione: 365, ...conteggi }, 'requisiti dei Confidenti: il testo è la nota');
  },
};
