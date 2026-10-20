// ============================================================
// utente 023 — lo stato per infiltrazione dei pin condivisi dai rigenerabili (L4, NR4-1, lotti/L4/modifiche.md §8.11)
// ============================================================
//
// Dalla revisione del 2026-10-20 (strada (a) del PM) **ogni pin tiene il suo stato** (`spillo_partita`, come prima di L4) e una voce
// con pin è fatta quando lo sono tutti i suoi pin. Un'eccezione: un pin collegato a voci **rigenerabili di più infiltrazioni** (a
// Madarame 40, a Kamoshida nessuno) ha uno stato per infiltrazione, altrimenti raccoglierlo nella 2ª lo segnerebbe anche nella 4ª,
// dove l'oggetto si ripropone (R4-05). Lo stato sta qui, una riga per pin e infiltrazione raccolta; per quei pin la riga di
// `spillo_partita` resta com'è e non si legge più (L11).
// Riempimento: una riga per (partita, pin, infiltrazione) quando il pin è raccolto (`spillo_partita.raccolto = 1`) **e** la voce
// rigenerabile di quell'infiltrazione è segnata (`punto_partita`): sulla copia della produzione Madarame p1 90 righe su 90 coppie,
// p2 0, Kamoshida 0. I casi incoerenti (pin raccolto con la voce non segnata, o il contrario) si contano nel log e non scrivono
// niente. Nessuna riga di `spillo_partita` né di `punto_partita` cambia. Idempotente (`INSERT OR IGNORE`).
// Nella 023 e non nella 022 (dove la metteva il progetto): la 022 era già applicata ai dati di sviluppo, e le migrazioni sono
// append-only.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { sqlCarattereVoce } from '../../../shared/caratteriVoce.js';

export const utente023: Migration = {
  id: 23,
  name: 'stato_del_pin_per_infiltrazione',
  up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS utente.spillo_partita_infiltrazione (
      partita_id           INTEGER NOT NULL,
      spillo_uid           TEXT NOT NULL,
      infiltrazione_chiave TEXT NOT NULL,
      raccolto             INTEGER NOT NULL DEFAULT 1,
      updated_at           TEXT NOT NULL,
      PRIMARY KEY (partita_id, spillo_uid, infiltrazione_chiave)
    )`);
    const c = (schema: string, tabella: string) => !!db.prepare(`SELECT 1 FROM ${schema}.sqlite_master WHERE type = 'table' AND name = ?`).get(tabella);
    if (!c('main', 'punto_interesse') || !c('main', 'spillo_voce') || !c('main', 'spillo') || !c('main', 'dungeon_area') || !c('utente', 'spillo_partita') || !c('utente', 'punto_partita')) return;
    const colonne = new Set((db.prepare('PRAGMA main.table_info(punto_interesse)').all() as Array<{ name: string }>).map((x) => x.name));
    if (!colonne.has('area_dedalo_chiave')) return;
    // i legami pin ↔ voce rigenerabile (pin delle planimetrie, con uid), con l'infiltrazione della voce
    const legami = db.prepare(`SELECT s.uid AS spillo, sv.voce_chiave AS voce, p.area_chiave AS infiltrazione
      FROM main.spillo_voce sv JOIN main.spillo s ON s.id = sv.spillo_id JOIN main.punto_interesse p ON p.chiave = sv.voce_chiave
      WHERE s.uid IS NOT NULL AND s.mappa_chiave IS NOT NULL AND ${sqlCarattereVoce('p', colonne.has('carattere'))} = 'rigenerabile'`).all() as Array<{ spillo: string; voce: string; infiltrazione: string }>;
    const perPin = new Map<string, Map<string, string[]>>();
    for (const l of legami) {
      const inf = perPin.get(l.spillo) ?? perPin.set(l.spillo, new Map()).get(l.spillo)!;
      (inf.get(l.infiltrazione) ?? inf.set(l.infiltrazione, []).get(l.infiltrazione)!).push(l.voce);
    }
    // solo i pin condivisi: rigenerabili di più infiltrazioni
    const condivisi = new Map([...perPin].filter(([, inf]) => inf.size > 1));
    const segnate = new Set((db.prepare('SELECT partita_id AS partita, punto_chiave AS voce FROM utente.punto_partita').all() as Array<{ partita: number; voce: string }>).map((r) => `${r.partita}|${r.voce}`));
    const raccolti = new Set((db.prepare('SELECT partita_id AS partita, spillo_uid AS spillo FROM utente.spillo_partita WHERE raccolto = 1').all() as Array<{ partita: number; spillo: string }>).map((r) => `${r.partita}|${r.spillo}`));
    const partite = db.prepare('SELECT DISTINCT partita_id FROM (SELECT partita_id FROM utente.punto_partita UNION SELECT partita_id FROM utente.spillo_partita)').pluck().all() as number[];
    const inserisci = db.prepare('INSERT OR IGNORE INTO utente.spillo_partita_infiltrazione (partita_id, spillo_uid, infiltrazione_chiave, raccolto, updated_at) VALUES (?, ?, ?, 1, ?)');
    const adesso = new Date().toISOString();
    let righe = 0;
    const incoerenti: Array<{ partita: number; spillo: string; infiltrazione: string; caso: string }> = [];
    for (const partita of partite) {
      for (const [spillo, inf] of condivisi) {
        const raccolto = raccolti.has(`${partita}|${spillo}`);
        for (const [infiltrazione, voci] of inf) {
          const segnata = voci.some((v) => segnate.has(`${partita}|${v}`));
          if (raccolto && segnata) righe += inserisci.run(partita, spillo, infiltrazione, adesso).changes;
          else if (raccolto !== segnata) incoerenti.push({ partita, spillo, infiltrazione, caso: raccolto ? 'pin raccolto, voce non segnata' : 'voce segnata, pin non raccolto' });
        }
      }
    }
    logger.info({ pinCondivisi: condivisi.size, righe, incoerenti }, 'migrazione utente 023: stato per infiltrazione dei pin condivisi dai rigenerabili');
  },
};
