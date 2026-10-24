// ============================================================
// 208 — le note storiche delle «Pagine ammuffite» (L11 · R11-10c/7, M-G; decisione dell'utente del 24/10: «due articoli»)
// ============================================================
//
// La guida italiana si contraddice sul negozio del libro «Pagine ammuffite»: la pagina Libri lo mette alla Libreria Hinokuniya (Shinjuku, 1.800 ¥, dal 1/9, «sblocca
// Jinbocho»), l'elenco dei negozi alla Libreria Taiheido (Shibuya, Central Street); una fonte esterna lo dà a Taiheido (certezza media). L'utente ha deciso di tenere
// entrambi gli articoli, ciascuno con una nota storica sulla contraddizione (G-031 punto 3; documento `lotti/L11/ondate2-6/R11-10c-consolida.md` §3 /7, D4).
// Questa migrazione scrive SOLO due righe di `nota_storica` (una per articolo, con la copia della guida in `seed_json` per «Ripristina») e i loro legami in
// `nota_storica_legame`, con il meccanismo della 139. Nessun articolo, prezzo, condizione, sblocco, acquisto o progresso cambia (impronta di `articolo` e delle altre note
// uguale prima e dopo). Guardie: l'articolo esiste con il suo negozio e l'oggetto `libri/pagine-ammuffite`; la nota non c'è già (idempotente, un testo modificato
// dall'utente non si riscrive); una riga che non passa le guardie si salta senza errore.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, improntaTabella } from './pulizieL11.js';

const FONTE = 'G-031 punto 3; guida italiana (pagina Libri, elenco dei negozi); fonte esterna (criticalhits.com.br); L11 R11-10c/7';

interface Nota { chiave: string; articolo: string; negozio: string; testo: string }

const NOTE: readonly Nota[] = [
  {
    chiave: 'pagine-ammuffite-hinokuniya', articolo: 'hinokuniya/pagine-ammuffite', negozio: 'hinokuniya',
    testo: 'La guida si contraddice su dove comprare «Pagine ammuffite»: la pagina Libri lo mette alla Libreria Hinokuniya (Shinjuku, 1.800 ¥, dal 1/9, sblocca Jinbocho), l’elenco dei negozi alla Libreria Taiheido (Shibuya, Central Street), e una fonte esterna lo dà a Taiheido. Restano entrambi gli articoli, da verificare in gioco. È una nota sulla fonte: non cambia prezzo, condizioni né acquisti.',
  },
  {
    chiave: 'pagine-ammuffite-taiheido', articolo: 'libreria-taiheido/pagine-ammuffite', negozio: 'libreria-taiheido',
    testo: 'La guida si contraddice su dove comprare «Pagine ammuffite»: l’elenco dei negozi lo mette alla Libreria Taiheido (Shibuya, Central Street, 1.800 ¥) e la pagina Libri alla Libreria Hinokuniya (Shinjuku, dal 1/9, sblocca Jinbocho); una fonte esterna lo dà a Taiheido. La guida indica il 1/9 per entrambi, mentre la condizione di questo articolo è dal 18/4. Restano entrambi gli articoli, da verificare in gioco. È una nota sulla fonte: non cambia prezzo, condizioni né acquisti.',
  },
];
const errore = (motivo: string): never => { throw new Error(`208: ${motivo}; nessuna modifica applicata.`); };

export const migration208: Migration = {
  id: 208, name: 'pagine_ammuffite_note_storiche',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['articolo', 'nota_storica', 'nota_storica_legame']) if (!esisteTabella(db, t)) return;
    const articoliPrima = improntaTabella(db, 'articolo');
    const contaNote = (): number => db.prepare('SELECT COUNT(*) FROM main.nota_storica').pluck().get() as number;
    const notePrima = contaNote();
    const legamiPrima = db.prepare('SELECT COUNT(*) FROM main.nota_storica_legame').pluck().get() as number;
    const adesso = new Date().toISOString();
    const scritte: string[] = [];
    const saltate: Record<string, string> = {};
    for (const n of NOTE) {
      const a = db.prepare('SELECT 1 FROM main.articolo WHERE chiave = ? AND negozio_chiave = ? AND oggetto_fonte = ? AND oggetto_chiave = ?').get(n.articolo, n.negozio, 'libri', 'pagine-ammuffite');
      if (!a) { saltate[n.chiave] = 'l’articolo non c’è come atteso'; continue; }
      if (db.prepare('SELECT 1 FROM main.nota_storica WHERE chiave = ?').get(n.chiave)) { saltate[n.chiave] = 'la nota c’è già'; continue; }
      db.prepare('INSERT INTO main.nota_storica (chiave, testo, fonte, versione, seed_json, updated_at) VALUES (?, ?, ?, 1, ?, ?)')
        .run(n.chiave, n.testo, FONTE, JSON.stringify({ versione: 1, testo: n.testo, fonte: FONTE }), adesso);
      db.prepare('INSERT OR IGNORE INTO main.nota_storica_legame (nota_chiave, tipo, chiave) VALUES (?, ?, ?)').run(n.chiave, 'articolo', n.articolo);
      scritte.push(n.chiave);
    }
    if (improntaTabella(db, 'articolo') !== articoliPrima) errore('la tabella articolo è cambiata');
    if (contaNote() !== notePrima + scritte.length) errore('il numero delle note non torna');
    if ((db.prepare('SELECT COUNT(*) FROM main.nota_storica_legame').pluck().get() as number) !== legamiPrima + scritte.length) errore('il numero dei legami non torna');
    logger.info({ migrazione: 'L11-R11-10c-208', scritte: scritte.length, saltate: Object.keys(saltate).length }, 'note storiche delle Pagine ammuffite (M-G)');
  },
};
