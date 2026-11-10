// ============================================================
// utente 070 — i timbri raccolti passano dall'area al suo dedalo (L10-02, migrazione di gioco 377)
// ============================================================
//
// Dalla 377 il totale dei timbri sta nel dedalo (`dungeon_area.timbri_totale`) e `timbri_dedalo_partita.area_chiave` vale la chiave del
// DEDALO (`dungeon_area.chiave`), come già `richiesta.area_chiave`. Le righe che una partita aveva per un'area di un dedalo (099, utente 018)
// diventano una riga per il suo dedalo, con la SOMMA dei raccolti delle sue aree (più quella di una riga già per il dedalo, se c'era) e
// l'ultimo `updated_at`: niente si perde. Il valore non si taglia al totale: lo fa la lettura (`timbriService`), e un totale corretto dopo
// ritrova i timbri. Una riga la cui chiave non è né un'area né un dedalo dei dati di gioco resta com'è (lo segnala il controllo degli orfani
// del pacchetto). Nei dati del 10/11: 0 righe. Idempotente (dopo la prima, nessuna riga è per un'area). Non legge colonne tolte da altre
// migrazioni di gioco (solo `area_dedalo.chiave`, `area_dedalo.dedalo_chiave`).
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

interface RigaTimbri { partita_id: number; area_chiave: string; raccolti: number; updated_at: string }

export const utente070: Migration = {
  id: 70,
  name: 'timbri_per_dedalo',
  up(db) {
    if (!db.prepare("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = 'timbri_dedalo_partita'").get()) return;
    if (!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'area_dedalo'").get()) return;
    const daConvertire = db.prepare(`SELECT t.partita_id, t.area_chiave, t.raccolti, t.updated_at, ad.dedalo_chiave AS dedalo FROM utente.timbri_dedalo_partita t
      JOIN main.area_dedalo ad ON ad.chiave = t.area_chiave ORDER BY t.partita_id, ad.dedalo_chiave, t.area_chiave`).all() as Array<RigaTimbri & { dedalo: string }>;
    if (daConvertire.length === 0) return;
    const totaleRaccoltiPrima = (db.prepare('SELECT COALESCE(SUM(raccolti), 0) FROM utente.timbri_dedalo_partita').pluck().get() as number);
    const leggi = db.prepare('SELECT raccolti, updated_at FROM utente.timbri_dedalo_partita WHERE partita_id = ? AND area_chiave = ?');
    const togli = db.prepare('DELETE FROM utente.timbri_dedalo_partita WHERE partita_id = ? AND area_chiave = ?');
    const scrivi = db.prepare('INSERT INTO utente.timbri_dedalo_partita (partita_id, area_chiave, raccolti, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, area_chiave) DO UPDATE SET raccolti = excluded.raccolti, updated_at = excluded.updated_at');
    const somme = new Map<string, { partita: number; dedalo: string; raccolti: number; updated: string; aree: string[] }>();
    for (const r of daConvertire) {
      const k = `${r.partita_id}\0${r.dedalo}`;
      if (!somme.has(k)) {
        // una riga già per il dedalo (una scrittura dopo la 377 senza questa migrazione) si somma: non si perde
        const gia = leggi.get(r.partita_id, r.dedalo) as { raccolti: number; updated_at: string } | undefined;
        somme.set(k, { partita: r.partita_id, dedalo: r.dedalo, raccolti: gia?.raccolti ?? 0, updated: gia?.updated_at ?? '', aree: [] });
      }
      const s = somme.get(k)!;
      s.raccolti += r.raccolti;
      if (r.updated_at > s.updated) s.updated = r.updated_at;
      s.aree.push(r.area_chiave);
      togli.run(r.partita_id, r.area_chiave);
    }
    for (const s of somme.values()) scrivi.run(s.partita, s.dedalo, s.raccolti, s.updated);
    const totaleRaccoltiDopo = (db.prepare('SELECT COALESCE(SUM(raccolti), 0) FROM utente.timbri_dedalo_partita').pluck().get() as number);
    if (totaleRaccoltiDopo !== totaleRaccoltiPrima) throw new Error(`utente 070: i timbri raccolti erano ${totaleRaccoltiPrima}, dopo la conversione ${totaleRaccoltiDopo}; nessuna modifica applicata.`);
    logger.info({ righeDiArea: daConvertire.length, righeDiDedalo: somme.size, raccolti: totaleRaccoltiDopo, dedali: [...somme.values()].map((s) => ({ partita: s.partita, dedalo: s.dedalo, raccolti: s.raccolti, aree: s.aree })) },
      'migrazione utente 070: i timbri raccolti passano dalle aree ai dedali');
  },
};
