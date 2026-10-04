// ============================================================
// Gli stati delle voci della guida: i pin di una voce e l'Enigma con i suoi passi (2026-10-01, 095)
// ============================================================
//
// Senza dipendenze dai servizi: lo usano la guida (`dungeonService`), le mappe (`mappeService`, `collegamentiGuida`) e i
// Palazzi (`palazziService`, il boss finale), e nessuno di loro deve richiamarsi in cerchio.
// ============================================================

import type { AppDatabase } from '../../db/dbService.js';
import { puntoDescrittivo } from '../../../shared/spilli.js';
import type { StatoPunto } from '../../../shared/types.js';
import { VOCE_DEL_PIN } from './voceDelPin.js';

/** I pin (sulle planimetrie, non gli elementi della guida senza mappa) collegati a un punto. */
export function pinDelPuntoGuida(db: AppDatabase, punto: string): Array<{ id: number; uid: string }> {
  return db.prepare(`SELECT id, uid FROM spillo WHERE ${VOCE_DEL_PIN} = ? AND mappa_chiave IS NOT NULL AND uid IS NOT NULL ORDER BY id`)
    .all(punto) as Array<{ id: number; uid: string }>;
}

// ---- L'Enigma e i suoi passi (095, scelte dell'utente del 2026-10-01) ----
//
// «Enigma deve diventare un contenitore di sotto elementi che insieme descrivono l'enigma e come sbloccarlo»: i passi sono voci
// vere della stessa area (`punto_interesse.contenitore_chiave`), di qualunque tipo, coi loro pin; l'Enigma è risolto quando i
// passi che si segnano sono tutti fatti — lo stato dell'Enigma, in `punto_partita` come per ogni voce, segue i passi —, e
// segnarlo segna i passi. Un Enigma senza passi da segnare (nessuno, o solo voci descrittive) si segna da sé, come prima.

/** Le partite (e il loro file) ci sono? Senza `utente` attaccato, chi allinea gli stati non fa niente. */
function conPartite(db: AppDatabase): boolean {
  if (!db.prepare("SELECT 1 FROM pragma_database_list WHERE name = 'utente'").get()) return false;
  const tabelle = new Set((db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>).map((r) => r.name));
  return tabelle.has('punto_partita') && tabelle.has('spillo_partita') && tabelle.has('partita');
}

/** I passi di un Enigma, nel loro ordine. */
export function passiDi(db: AppDatabase, enigma: string): Array<{ chiave: string; tipo: string; nome: string }> {
  return db.prepare('SELECT chiave, tipo, nome FROM punto_interesse WHERE contenitore_chiave = ? ORDER BY ordine, chiave').all(enigma) as Array<{ chiave: string; tipo: string; nome: string }>;
}

/** I passi che si segnano (le voci descrittive si leggono e basta): sono loro a risolvere l'Enigma. */
export function passiDaSegnare(db: AppDatabase, enigma: string): string[] {
  return passiDi(db, enigma).filter((p) => !puntoDescrittivo(p.tipo)).map((p) => p.chiave);
}

/** L'Enigma di cui una voce è un passo, o null. */
export function enigmaDi(db: AppDatabase, voce: string): string | null {
  return (db.prepare('SELECT contenitore_chiave FROM punto_interesse WHERE chiave = ?').get(voce) as { contenitore_chiave: string | null } | undefined)?.contenitore_chiave ?? null;
}

/** Scrive lo stato di una voce in una partita e porta con sé i suoi pin: segnata li raccoglie, riaperta li riapre. */
export function scriviStatoVoce(db: AppDatabase, partita: number, voce: string, stato: StatoPunto | null, adesso: string): void {
  if (stato === null) db.prepare('DELETE FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').run(partita, voce);
  // segnato dall'utente: automatico = 0 (utente 006; dal 2026-10-04 nessuno scrive più 1, e utente 017 ha tolto quelli rimasti)
  else db.prepare('INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, punto_chiave) DO UPDATE SET stato = excluded.stato, updated_at = excluded.updated_at, automatico = 0').run(partita, voce, stato, adesso);
  for (const pin of pinDelPuntoGuida(db, voce)) {
    db.prepare(`INSERT INTO spillo_partita (partita_id, spillo_uid, raccolto, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(partita_id, spillo_uid) DO UPDATE SET raccolto = excluded.raccolto, updated_at = excluded.updated_at`).run(partita, pin.uid, stato === null ? 0 : 1, adesso);
  }
}

/** In una partita lo stato dell'Enigma segue i suoi passi: tutti fatti → risolto («ottenuto», o lo stato che aveva già), altrimenti aperto. */
export function allineaEnigma(db: AppDatabase, partita: number, enigma: string, adesso: string): void {
  const passi = passiDaSegnare(db, enigma);
  if (passi.length === 0) return;
  const segnato = db.prepare('SELECT 1 FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?');
  const risolto = passi.every((p) => !!segnato.get(partita, p));
  const statoEnigma = !!segnato.get(partita, enigma);
  if (risolto && !statoEnigma) db.prepare("INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at, automatico) VALUES (?, ?, 'ottenuto', ?, 0)").run(partita, enigma, adesso);
  else if (!risolto && statoEnigma) db.prepare('DELETE FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').run(partita, enigma);
}

/** Dopo lo stato di una voce cambiato in una partita: se è un passo, il suo Enigma lo segue. */
export function allineaEnigmaDellaVoce(db: AppDatabase, partita: number, voce: string, adesso: string): void {
  const enigma = enigmaDi(db, voce);
  if (enigma) allineaEnigma(db, partita, enigma, adesso);
}

/**
 * Quando cambiano i passi di un Enigma (un passo aggiunto, tolto, spostato dentro o fuori, cambiato di tipo), in ogni partita il
 * suo stato segue i passi: un passo nuovo ancora da fare riapre un Enigma risolto (scelta dell'utente, 2026-10-02: «l'Enigma si
 * riapre» — i progressi non cambiano da soli), un passo tolto può risolverlo. Nessun passo viene segnato da qui.
 */
export function allineaEnigmaInOgniPartita(db: AppDatabase, enigma: string, adesso: string): void {
  if (!conPartite(db)) return;
  for (const { id: partita } of db.prepare('SELECT id FROM partita').all() as Array<{ id: number }>) allineaEnigma(db, partita, enigma, adesso);
}

/**
 * Segnare o riaprire un Enigma porta con sé i suoi passi: segnato, i passi ancora da fare diventano «ottenuto» — quelli già
 * segnati restano come sono (un passo «esaurito» non torna «ottenuto», un segno automatico non diventa manuale: rilievo del
 * validatore) —; riaperto, i passi si riaprono tutti. Con i loro pin.
 */
export function segnaPassiDellEnigma(db: AppDatabase, partita: number, enigma: string, stato: StatoPunto | null, adesso: string): void {
  const segnato = db.prepare('SELECT 1 FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?');
  for (const p of passiDaSegnare(db, enigma)) {
    if (stato === null) scriviStatoVoce(db, partita, p, null, adesso);
    else if (!segnato.get(partita, p)) scriviStatoVoce(db, partita, p, 'ottenuto', adesso);
  }
}
