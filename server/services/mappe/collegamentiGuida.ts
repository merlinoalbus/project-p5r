// ============================================================
// Collegamenti fra i punti della guida e i pin delle planimetrie (richiesta dell'utente, 2026-10-01)
// ============================================================
//
// «Che ci siano elementi raccoglibili sui palazzi che siano slegati dai pin non è corretto... lo stato di questi punti deve
// essere integrato (ove possibile) con gli elementi in mappa.» Poi: «lascia i punti come sono senza fare riconciliazioni...
// li sistemo io via via a mano». Quindi niente abbinamenti automatici: il collegamento lo fa l'utente dalla guida
// (`collegaPinAlPunto`), uno o più pin per punto, e il collegamento sta sul pin (`voce_chiave`, dalla 094: prima era il
// riferimento, che i pin con una destinazione o un Confidente avevano già occupato). Da lì lo stato è uno
// solo: segnare il punto segna i suoi pin, raccogliere tutti i pin segna il punto (`impostaRaccolto`, `impostaStatoPunto`).
// ============================================================

import type { AppDatabase } from '../../db/dbService.js';
import { prepared } from '../../db/dbService.js';
import { httpErrors, type HttpError } from '../../utils/httpError.js';
import { puntoDescrittivo } from '../../../shared/spilli.js';
import { palazzoDiOgniMappa } from '../palazziService.js';
import { VOCE_DEL_PIN, voceDelPin } from './voceDelPin.js';

export { VOCE_DEL_PIN, voceDelPin };

/**
 * Le regole del collegamento di un pin a una voce, le stesse per ogni strada che lo scrive — la guida (`collegaPinAlPunto`),
 * l'editor delle mappe (un riferimento «punto» in ingresso), il pacchetto delle mappe (rilievo della revisione, 2026-10-01):
 * la voce esiste e non è descrittiva, il pin sta su una planimetria del Palazzo della voce, e non è già di un'altra voce.
 * Restituisce l'errore da lanciare, o `null` se il collegamento è ammesso (chi importa un pacchetto lo scarta e lo conta).
 */
export function erroreVoceDelPin(pin: { nome: string; mappa: string | null; voce: string | null }, puntoChiave: string): HttpError | null {
  const p = prepared('SELECT p.nome, p.tipo, a.dungeon_chiave FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave WHERE p.chiave = ?').get(puntoChiave) as { nome: string; tipo: string; dungeon_chiave: string } | undefined;
  if (!p) return httpErrors.notFound('punto-non-trovato', `Il punto '${puntoChiave}' non esiste.`);
  if (puntoDescrittivo(p.tipo)) return httpErrors.badRequest('punto-descrittivo', `«${p.nome}» è una voce descrittiva della guida: non ha pin.`);
  if (!pin.mappa || palazzoDiOgniMappa().get(pin.mappa) !== p.dungeon_chiave) {
    return httpErrors.badRequest('pin-fuori-dal-palazzo', `«${pin.nome}» non sta su una planimetria di questo Palazzo.`);
  }
  if (pin.voce && pin.voce !== puntoChiave) {
    const nome = (prepared('SELECT nome FROM punto_interesse WHERE chiave = ?').get(pin.voce) as { nome: string } | undefined)?.nome ?? pin.voce;
    return httpErrors.conflict('pin-gia-collegato', `«${pin.nome}» è già collegato al punto «${nome}»: scollegalo prima.`);
  }
  return null;
}

/** I pin (sulle planimetrie, non gli elementi della guida senza mappa) collegati a un punto. */
export function pinDelPuntoGuida(db: AppDatabase, punto: string): Array<{ id: number; uid: string }> {
  return db.prepare(`SELECT id, uid FROM spillo WHERE ${VOCE_DEL_PIN} = ? AND mappa_chiave IS NOT NULL AND uid IS NOT NULL ORDER BY id`)
    .all(punto) as Array<{ id: number; uid: string }>;
}

/**
 * Quando un punto riceve i suoi pin, i due stati che fino a quel momento vivevano separati si uniscono, in ogni partita:
 * un punto già segnato segna i suoi pin, un punto con tutti i pin già raccolti risulta segnato. Non toglie niente.
 * Va eseguita con il file delle partite attaccato (`utente`); senza, non fa niente.
 */
export function allineaStatiPunto(db: AppDatabase, punto: string, adesso: string): void {
  if (!db.prepare("SELECT 1 FROM pragma_database_list WHERE name = 'utente'").get()) return;
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
