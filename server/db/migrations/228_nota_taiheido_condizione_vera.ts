// ============================================================
// 228 — la nota storica di «Pagine ammuffite» alla Taiheido dice la condizione vera (L11, rilievo F3 del revisore)
// ============================================================
//
// La nota `pagine-ammuffite-taiheido`, scritta dalla 208, diceva «la condizione di questo articolo è dal 18/4». La 220 ha portato la condizione dell'articolo
// `libreria-taiheido/pagine-ammuffite` a `[dal 04-18, dal 09-01]`: la frase non è più vera. Qui si riscrive SOLO quella frase, nel testo della nota e nella sua
// copia della guida (`seed_json`, così «Ripristina» riporta il testo vero e la nota non risulta modificata). Il testo di prima resta in questo file (costante
// FRASE_PRIMA) e nella copia di avvio dei dati. Guardie: la nota c'è, il testo è identico a quello scritto dalla 208 e la copia della guida è identica al testo (un testo
// cambiato dall'utente non si tocca); l'articolo ha davvero la condizione della 220 (altrimenti la nota nuova sarebbe falsa). Nessun'altra riga, colonna o
// tabella cambia (impronte di `articolo`, `nota_storica_legame` e delle altre note). Solo `main`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, improntaTabella } from './pulizieL11.js';

const NOTA = 'pagine-ammuffite-taiheido';
const ARTICOLO = 'libreria-taiheido/pagine-ammuffite';
const CONDIZIONE_220 = JSON.stringify([{ tipo: 'data', dal: '04-18' }, { tipo: 'data', dal: '09-01' }]);
const FRASE_PRIMA = 'La guida indica il 1/9 per entrambi, mentre la condizione di questo articolo è dal 18/4.';
const FRASE_DOPO = 'La guida indica il 1/9 per entrambi, e la condizione di questo articolo è dal 18/4 (quella del negozio) e dal 1/9.';
const errore = (motivo: string): never => { throw new Error(`228: ${motivo}; nessuna modifica applicata.`); };

export const migration228: Migration = {
  id: 228, name: 'nota_taiheido_condizione_vera',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['articolo', 'nota_storica', 'nota_storica_legame']) if (!esisteTabella(db, t)) return;
    const n = db.prepare('SELECT testo, seed_json FROM main.nota_storica WHERE chiave = ?').get(NOTA) as { testo: string; seed_json: string } | undefined;
    if (!n || !n.testo.includes(FRASE_PRIMA)) return; // assente o già corretta (o riscritta dall'utente): niente
    const a = db.prepare('SELECT condizioni_json FROM main.articolo WHERE chiave = ?').pluck().get(ARTICOLO) as string | null | undefined;
    if (a !== CONDIZIONE_220) return; // l'articolo non ha la condizione della 220: la frase nuova non sarebbe vera
    let guida: { versione?: number; testo?: string; fonte?: string };
    try { guida = JSON.parse(n.seed_json) as typeof guida; } catch { return; }
    if (guida.testo !== n.testo) return; // la nota è stata modificata dall'utente (o la copia non coincide): non si tocca

    const prima = new Map(['articolo', 'nota_storica_legame'].map((t) => [t, improntaTabella(db, t)]));
    const altre = db.prepare('SELECT chiave, testo, fonte, versione, seed_json FROM main.nota_storica WHERE chiave <> ? ORDER BY chiave').all(NOTA);
    const testo = n.testo.replace(FRASE_PRIMA, FRASE_DOPO);
    const copia = JSON.stringify({ ...guida, testo });
    const esito = db.prepare('UPDATE main.nota_storica SET testo = ?, seed_json = ?, updated_at = ? WHERE chiave = ? AND testo = ?').run(testo, copia, new Date().toISOString(), NOTA, n.testo);
    if (esito.changes !== 1) errore('la nota non è stata aggiornata');
    for (const [t, imp] of prima) if (improntaTabella(db, t) !== imp) errore(`la tabella ${t} è cambiata`);
    const dopo = db.prepare('SELECT chiave, testo, fonte, versione, seed_json FROM main.nota_storica WHERE chiave <> ? ORDER BY chiave').all(NOTA);
    if (JSON.stringify(dopo) !== JSON.stringify(altre)) errore('le altre note sono cambiate');
    logger.info({ migrazione: 'L11-228', nota: NOTA, fraseDiPrima: FRASE_PRIMA }, 'nota storica della Taiheido: la condizione dell’articolo è quella vera');
  },
};
