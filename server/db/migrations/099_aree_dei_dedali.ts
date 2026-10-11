// ============================================================
// 099 — Le aree dei dedali dei Memento: Dedalo → Aree → Elementi
// ============================================================
//
// Richiesta dell'utente (2026-10-11): «devo poter definire in ogni Dedalo delle aree... e in quelle aree devo poter modificare
// gli elementi... i dettagli dell'area e le cose da vedere o da fare... ogni elemento deve avere uno stato... solo quando tutti
// gli elementi di un'area sono in stato completato l'area deve risultare completata. un dedalo diventa completato se tutte le
// sue aree sono completate.» Scelte dell'utente: Richieste e timbri sono «Elementi delle aree»; le voci di oggi vanno «In
// un'area iniziale»; nelle aree dei dedali gli elementi hanno «Tutti» uno stato (anche «Altro»).
//   - `area_dedalo`: le aree di un dedalo (`dungeon_area` dei Memento), con nome, dettagli e il totale dei timbri dell'area
//     (null = l'area non ha timbri). Tolto il dedalo, se ne vanno le sue aree.
//   - `punto_interesse.area_dedalo_chiave` e `richiesta.area_dedalo_chiave`: l'area del dedalo a cui l'elemento appartiene.
//     Tolta l'area, la Richiesta resta nel dedalo «da collocare» (SET NULL); le voci le toglie il servizio, con i loro stati.
//   - Ogni dedalo che ha voci, Richieste o timbri riceve «Area 1» (chiave `<dedalo>-area-1`, deterministica: la migrazione
//     «utente» 018 ci porta i timbri raccolti) con tutte le voci, le Richieste e il totale dei timbri del dedalo.
//   - `dungeon_area.timbri_totale` (077) esce dallo schema: il totale vive nell'area, e una seconda colonna sarebbe una
//     seconda verità.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { aggiungiColonna } from '../colonne.js';

/** La chiave dell'area iniziale di un dedalo: la stessa in ogni file di gioco, così le partite la ritrovano. */
export const chiaveAreaIniziale = (dedalo: string): string => `${dedalo}-area-1`;

export const migration099: Migration = {
  id: 99,
  name: 'aree_dei_dedali',
  up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS area_dedalo (
      chiave        TEXT PRIMARY KEY,
      dedalo_chiave TEXT NOT NULL REFERENCES dungeon_area(chiave) ON DELETE CASCADE,
      ordine        INTEGER NOT NULL,
      nome          TEXT NOT NULL,
      descrizione   TEXT NOT NULL DEFAULT '',
      timbri_totale INTEGER CHECK (timbri_totale IS NULL OR timbri_totale >= 0)
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_area_dedalo_dedalo ON area_dedalo(dedalo_chiave, ordine)');
    aggiungiColonna(db, 'punto_interesse', 'area_dedalo_chiave', 'TEXT REFERENCES area_dedalo(chiave) ON DELETE SET NULL');
    aggiungiColonna(db, 'richiesta', 'area_dedalo_chiave', 'TEXT REFERENCES area_dedalo(chiave) ON DELETE SET NULL');
    db.exec('CREATE INDEX IF NOT EXISTS idx_punto_area_dedalo ON punto_interesse(area_dedalo_chiave)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_richiesta_area_dedalo ON richiesta(area_dedalo_chiave)');

    const conTimbri = (db.prepare('PRAGMA table_info(dungeon_area)').all() as Array<{ name: string }>).some((c) => c.name === 'timbri_totale');
    const dedali = db.prepare(`SELECT chiave${conTimbri ? ', timbri_totale' : ', NULL AS timbri_totale'} FROM dungeon_area WHERE dungeon_chiave = 'mementos' ORDER BY ordine`).all() as Array<{ chiave: string; timbri_totale: number | null }>;
    const creaArea = db.prepare("INSERT OR IGNORE INTO area_dedalo (chiave, dedalo_chiave, ordine, nome, descrizione, timbri_totale) VALUES (?, ?, 0, 'Area 1', '', ?)");
    const voci = db.prepare('UPDATE punto_interesse SET area_dedalo_chiave = ? WHERE area_chiave = ? AND area_dedalo_chiave IS NULL');
    const richieste = db.prepare('UPDATE richiesta SET area_dedalo_chiave = ? WHERE area_chiave = ? AND area_dedalo_chiave IS NULL');
    const quanteVoci = db.prepare('SELECT COUNT(*) AS n FROM punto_interesse WHERE area_chiave = ?');
    const quanteRichieste = db.prepare('SELECT COUNT(*) AS n FROM richiesta WHERE area_chiave = ?');
    let aree = 0; let vociSpostate = 0; let richiesteSpostate = 0;
    for (const d of dedali) {
      const nVoci = (quanteVoci.get(d.chiave) as { n: number }).n;
      const nRichieste = (quanteRichieste.get(d.chiave) as { n: number }).n;
      if (nVoci === 0 && nRichieste === 0 && d.timbri_totale === null) continue;
      const area = chiaveAreaIniziale(d.chiave);
      aree += creaArea.run(area, d.chiave, d.timbri_totale).changes;
      vociSpostate += voci.run(area, d.chiave).changes;
      richiesteSpostate += richieste.run(area, d.chiave).changes;
    }
    if (conTimbri) db.exec('ALTER TABLE dungeon_area DROP COLUMN timbri_totale');
    logger.info({ aree, vociSpostate, richiesteSpostate }, 'migrazione 099: le aree dei dedali, con le voci, le Richieste e i timbri di ogni dedalo nella sua Area 1');
  },
};
