// ============================================================
// Collegamenti fra i punti della guida e i pin delle planimetrie (richiesta dell'utente, 2026-10-01)
// ============================================================
//
// «Che ci siano elementi raccoglibili sui palazzi che siano slegati dai pin non è corretto... lo stato di questi punti deve
// essere integrato (ove possibile) con gli elementi in mappa.» Poi: «lascia i punti come sono senza fare riconciliazioni...
// li sistemo io via via a mano». Quindi niente abbinamenti automatici: il collegamento lo fa l'utente dalla guida
// (`collegaPinAlPunto`), uno o più pin per punto, e il collegamento sta sul pin (`riferimento = punto`). Da lì lo stato è uno
// solo: segnare il punto segna i suoi pin, raccogliere tutti i pin segna il punto (`impostaRaccolto`, `impostaStatoPunto`).
// ============================================================

import type { AppDatabase } from '../../db/dbService.js';

/** I pin (sulle planimetrie, non gli elementi della guida senza mappa) collegati a un punto. */
export function pinDelPuntoGuida(db: AppDatabase, punto: string): Array<{ id: number; uid: string }> {
  return db.prepare("SELECT id, uid FROM spillo WHERE riferimento_tipo = 'punto' AND riferimento_chiave = ? AND mappa_chiave IS NOT NULL AND uid IS NOT NULL ORDER BY id")
    .all(punto) as Array<{ id: number; uid: string }>;
}

/**
 * Quando un punto riceve i suoi pin, i due stati che fino a quel momento vivevano separati si uniscono, in ogni partita:
 * un punto già segnato segna i suoi pin, un punto con tutti i pin già raccolti risulta segnato. Non toglie niente.
 * Va eseguita con il file delle partite attaccato (`utente`); senza, non fa niente.
 */
export function allineaStatiPunto(db: AppDatabase, punto: string, adesso: string): void {
  const tabelle = new Set((db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>).map((r) => r.name));
  if (!tabelle.has('punto_partita') || !tabelle.has('spillo_partita') || !tabelle.has('partita')) return;
  const uids = pinDelPuntoGuida(db, punto).map((p) => p.uid);
  if (uids.length === 0) return;
  const segnato = db.prepare('SELECT 1 FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?');
  const raccolto = db.prepare('SELECT 1 FROM spillo_partita WHERE partita_id = ? AND spillo_uid = ? AND raccolto = 1');
  const raccogli = db.prepare(`INSERT INTO spillo_partita (partita_id, spillo_uid, raccolto, updated_at) VALUES (?, ?, 1, ?)
    ON CONFLICT(partita_id, spillo_uid) DO UPDATE SET raccolto = 1, updated_at = excluded.updated_at`);
  const segna = db.prepare("INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at, automatico) VALUES (?, ?, 'ottenuto', ?, 0) ON CONFLICT(partita_id, punto_chiave) DO NOTHING");
  for (const { id: partita } of db.prepare('SELECT id FROM partita').all() as Array<{ id: number }>) {
    if (segnato.get(partita, punto)) {
      for (const u of uids) if (!raccolto.get(partita, u)) raccogli.run(partita, u, adesso);
    } else if (uids.every((u) => raccolto.get(partita, u))) {
      segna.run(partita, punto, adesso);
    }
  }
}
