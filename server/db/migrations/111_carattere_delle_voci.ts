// ============================================================
// 111 — il carattere delle voci della guida (L4 «Avanzamento unico», lotti/L4/modifiche.md §1.2 e §2.1)
// ============================================================
//
// `punto_interesse.carattere` (permanente | rigenerabile | descrittiva) è la **scelta dell'utente**; NULL vuol dire «vale la regola»
// di `shared/caratteriVoce.ts` (dal tipo: oggetto e Ombra sciagura si ripropongono, storia e altro sono racconto, il resto è
// permanente; dedali e Persona senza carattere). Il carattere non si materializza: tutte le voci nascono NULL, così una correzione
// della regola vale per ogni voce non scelta a mano, e «Ripristina» è rimettere NULL.
// Nessun'altra scrittura: nessuna voce segnata o riaperta, nessuno stato toccato (decisioni dell'utente del 2026-10-20). Il log dice
// quante voci ha ogni carattere per Palazzo, per il confronto con l'analisi dei dati (L4 dati.md §1).
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { sqlCarattereVoce } from '../../../shared/caratteriVoce.js';

export const migration111: Migration = {
  id: 111,
  name: 'carattere_delle_voci',
  up(db) {
    if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'punto_interesse'").get()) return;
    const colonne = (db.prepare('PRAGMA table_info(punto_interesse)').all() as Array<{ name: string }>).map((c) => c.name);
    if (!colonne.includes('carattere')) {
      db.exec("ALTER TABLE punto_interesse ADD COLUMN carattere TEXT CHECK (carattere IN ('permanente', 'rigenerabile', 'descrittiva'))");
    }
    const conti = db.prepare(`SELECT a.dungeon_chiave AS palazzo, COALESCE(${sqlCarattereVoce('p')}, 'senza') AS carattere, COUNT(*) AS voci
      FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave GROUP BY 1, 2 ORDER BY 1, 2`).all() as Array<{ palazzo: string; carattere: string; voci: number }>;
    const perPalazzo: Record<string, Record<string, number>> = {};
    for (const c of conti) (perPalazzo[c.palazzo] ??= {})[c.carattere] = c.voci;
    logger.info({ perPalazzo }, 'migrazione 111: carattere delle voci (dalla regola; nessuna scelta dell\'utente)');
  },
};
