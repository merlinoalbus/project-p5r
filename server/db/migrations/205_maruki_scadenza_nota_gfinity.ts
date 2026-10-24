// ============================================================
// 205 — Maruki: la scadenza resta il 3/2, con la nota della discordanza con Gfinity (L11, decisione dell'utente del 24/10 «Tieni il 3/2»)
// ============================================================
//
// Le guide Royal (analisi `lotti/L11/iweleth-maruki-fonti-royal-2026-10-24.md`) non confermano il 2/2 e il solo elenco di Gfinity dà il 6 gennaio, senza spiegazione
// e in contrasto con il walkthrough (infiltrazioni il 9/1, 12/1 e 26/1, boss il 3/2). L'utente ha deciso di tenere il 3/2. Questa migrazione aggiunge SOLO una frase in
// fondo a `dungeon.note` di `maruki`: nessuna data, finestra o altra colonna cambia. Guardia: il Palazzo esiste e la nota non cita già Gfinity (idempotente).
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, improntaTabella } from './pulizieL11.js';

const FRASE = 'Scadenza: resta il 3 febbraio (confermato dall\'utente il 24/10). La guida Gfinity indica il 6 gennaio, senza spiegazione e in contrasto con il walkthrough Royal (infiltrazioni il 9/1, 12/1 e 26/1, boss il 3/2); nessuna fonte Royal conferma il 2 febbraio.';
const errore = (motivo: string): never => { throw new Error(`205: ${motivo}; nessuna modifica applicata.`); };

export const migration205: Migration = {
  id: 205, name: 'maruki_scadenza_nota_gfinity',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'dungeon')) return;
    const d = db.prepare("SELECT note FROM main.dungeon WHERE chiave = 'maruki'").get() as { note: string } | undefined;
    if (!d || d.note.includes('Gfinity')) return;
    const prima = improntaTabella(db, 'dungeon', ['note']);
    const altre = esisteTabella(db, 'dungeon_area') ? improntaTabella(db, 'dungeon_area') : null;
    db.prepare("UPDATE main.dungeon SET note = ? WHERE chiave = 'maruki'").run(`${d.note.trimEnd()}\n${FRASE}`);
    if (improntaTabella(db, 'dungeon', ['note']) !== prima) errore('altre colonne di dungeon sono cambiate');
    if (altre !== null && improntaTabella(db, 'dungeon_area') !== altre) errore('dungeon_area è cambiata');
    logger.info({ migrazione: 'L11-205' }, 'Maruki: nota sulla scadenza');
  },
};
