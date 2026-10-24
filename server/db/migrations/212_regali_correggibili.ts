// ============================================================
// 212 — i regali dei Confidenti si correggono e si ripristinano (L9 · R9-07/5)
// ============================================================
//
// `confidente_regalo` ha `seed_json`, usato da una sola riga (Shinya, «Modellino di moto»: la fotografia della rettifica G-034 del costo, forma
// `{versione, tipo:'costo-regalo', …, costo}`). Il registro dei ripristini (`ripristinoService`, `righeConfidenti.ts`) legge `seed_json` come «i valori della guida
// presi alla prima correzione» e `NULL` quando il regalo non è corretto. Qui:
//   - si aggiungono `origine` ('seed' | 'utente', default 'seed') e `updated_at` (NULL);
//   - la fotografia di Shinya passa alla forma del registro: `{catalogo_chiave, dove, costo (quello di prima), sconsigliato, nota}` con i valori di adesso salvo il
//     costo, `origine = 'utente'`, `updated_at` = adesso: «Ripristina» (del registro o del costo) rimette il costo di prima, come oggi;
//   - una fotografia che non è né quella nota né nella forma nuova ferma la migrazione.
// Nessuna colonna di dati dei regali cambia: l'impronta di ogni colonna diversa da `origine`, `seed_json` e `updated_at` è identica prima e dopo. Idempotente.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna, improntaTabella } from './pulizieL11.js';

const errore = (motivo: string): never => { throw new Error(`212: ${motivo}; nessuna modifica applicata.`); };

interface RigaRegalo {
  confidente_chiave: string; ordine: number; nome: string; dove: string | null; costo: string | null; sconsigliato: number; catalogo_chiave: string | null; nota: string | null; seed_json: string;
}

export const migration212: Migration = {
  id: 212, name: 'regali_correggibili',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'confidente_regalo')) return;
    const senza = ['seed_json', 'origine', 'updated_at'];
    const prima = improntaTabella(db, 'confidente_regalo', senza);
    const vicine = ['catalogo_oggetto', 'confidente'].filter((t) => esisteTabella(db, t));
    const impronteVicine = new Map(vicine.map((t) => [t, improntaTabella(db, t)]));
    if (!haColonna(db, 'confidente_regalo', 'origine')) db.exec("ALTER TABLE main.confidente_regalo ADD COLUMN origine TEXT NOT NULL DEFAULT 'seed' CHECK (origine IN ('seed', 'utente'))");
    if (!haColonna(db, 'confidente_regalo', 'updated_at')) db.exec('ALTER TABLE main.confidente_regalo ADD COLUMN updated_at TEXT');

    const righe = db.prepare('SELECT confidente_chiave, ordine, nome, dove, costo, sconsigliato, catalogo_chiave, nota, seed_json FROM main.confidente_regalo WHERE seed_json IS NOT NULL').all() as RigaRegalo[];
    let convertite = 0;
    for (const r of righe) {
      let f: Record<string, unknown>;
      try { f = JSON.parse(r.seed_json) as Record<string, unknown>; } catch { return errore(`la fotografia di ${r.confidente_chiave}/${r.ordine} non è leggibile`); }
      if (f.tipo === undefined && typeof f.costo === 'string') continue; // già nella forma del registro
      if (f.tipo !== 'costo-regalo' || f.confidente !== r.confidente_chiave || f.ordine !== r.ordine || f.nome !== r.nome || typeof f.costo !== 'string') errore(`la fotografia di ${r.confidente_chiave}/${r.ordine} non è quella nota`);
      const nuova = { catalogo_chiave: r.catalogo_chiave, dove: r.dove, costo: f.costo as string, sconsigliato: r.sconsigliato === 1, nota: r.nota };
      db.prepare("UPDATE main.confidente_regalo SET seed_json = ?, origine = 'utente', updated_at = ? WHERE confidente_chiave = ? AND ordine = ?")
        .run(JSON.stringify(nuova), new Date().toISOString(), r.confidente_chiave, r.ordine);
      convertite++;
    }

    if (improntaTabella(db, 'confidente_regalo', senza) !== prima) errore('le colonne di dati dei regali sono cambiate');
    for (const [t, imp] of impronteVicine) if (improntaTabella(db, t) !== imp) errore(`la tabella ${t} è cambiata`);
    logger.info({ migrazione: 'L9-R9-07-212', convertite }, 'regali correggibili');
  },
};
