// ============================================================
// Collegamenti fra i punti della guida e i pin delle planimetrie (richiesta dell'utente, 2026-10-01)
// ============================================================
//
// «Che ci siano elementi raccoglibili sui palazzi che siano slegati dai pin non è corretto... lo stato di questi punti deve
// essere integrato (ove possibile) con gli elementi in mappa.» Poi: «lascia i punti come sono senza fare riconciliazioni...
// li sistemo io via via a mano». Quindi niente abbinamenti automatici: il collegamento lo fa l'utente dalla guida
// (`collegaPinAlPunto`) o dall'editor delle mappe: uno o più pin per punto e, dalla 098, una o più voci per pin (`spillo_voce`;
// prima era il campo `voce_chiave` della 094, e prima ancora il riferimento, che i pin con una destinazione o un Confidente
// avevano già occupato). Da lì gli stati si legano: segnare il punto segna i suoi pin, raccogliere tutti i pin segna il punto
// (`impostaRaccolto`, `impostaStatoPunto`); un pin con più voci è fatto quando tutte le sue voci sono segnate, e ogni voce si
// segna da sola (scelta dell'utente, 2026-10-09: «Voci indipendenti»).
// ============================================================

import type { AppDatabase } from '../../db/dbService.js';
import { getDb, prepared } from '../../db/dbService.js';
import { httpErrors, type HttpError } from '../../utils/httpError.js';
import { puntoDescrittivo } from '../../../shared/spilli.js';
import { palazzoDiOgniMappa } from '../palazziService.js';
import { vociDelPin, vociDelPinSql } from './voceDelPin.js';
import { allineaEnigmaDellaVoce, allineaRaccoltoDelPin, passiDi, pinDelPuntoGuida, quanteVociDelPin } from './statiGuida.js';

export { vociDelPin, vociDelPinSql };
export { allineaEnigma, allineaEnigmaDellaVoce, allineaEnigmaInOgniPartita, allineaRaccoltoDelPin, enigmaDi, passiDaSegnare, passiDi, pinDelPuntoGuida, quanteVociDelPin, scriviStatoVoce, segnaPassiDellEnigma } from './statiGuida.js';

/**
 * Le regole del collegamento di un pin a una voce, le stesse per ogni strada che lo scrive — la guida (`collegaPinAlPunto`),
 * l'editor delle mappe, il pacchetto delle mappe (rilievo della revisione, 2026-10-01): la voce esiste, non è descrittiva e non
 * è un Enigma con i suoi passi, e il pin sta su una planimetria del Palazzo della voce. Un pin che ha già altre voci si collega
 * anche a questa (098, scelta dell'utente del 2026-10-09: prima si rifiutava con «già collegato»).
 * Restituisce l'errore da lanciare, o `null` se il collegamento è ammesso (chi importa un pacchetto lo scarta e lo conta).
 */
export function erroreVoceDelPin(pin: { nome: string; mappa: string | null }, puntoChiave: string): HttpError | null {
  const p = prepared('SELECT p.nome, p.tipo, a.dungeon_chiave FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave WHERE p.chiave = ?').get(puntoChiave) as { nome: string; tipo: string; dungeon_chiave: string } | undefined;
  if (!p) return httpErrors.notFound('punto-non-trovato', `Il punto '${puntoChiave}' non esiste.`);
  if (puntoDescrittivo(p.tipo)) return httpErrors.badRequest('punto-descrittivo', `«${p.nome}» è una voce descrittiva della guida: non ha pin.`);
  // un Enigma con i suoi passi non ha pin suoi: stanno sui passi (scelta dell'utente, 2026-10-01)
  if (passiDi(getDb(), puntoChiave).length > 0) return httpErrors.badRequest('enigma-con-passi', `«${p.nome}» è un Enigma con i suoi passi: i pin si collegano ai passi.`);
  if (!pin.mappa || palazzoDiOgniMappa().get(pin.mappa) !== p.dungeon_chiave) {
    return httpErrors.badRequest('pin-fuori-dal-palazzo', `«${pin.nome}» non sta su una planimetria di questo Palazzo.`);
  }
  return null;
}

/** Le partite ci sono (il file `utente` è attaccato, con le sue tabelle)? Senza, chi allinea gli stati non fa niente. */
function conPartite(db: AppDatabase): boolean {
  if (!db.prepare("SELECT 1 FROM pragma_database_list WHERE name = 'utente'").get()) return false;
  const tabelle = new Set((db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>).map((r) => r.name));
  return tabelle.has('punto_partita') && tabelle.has('spillo_partita') && tabelle.has('partita');
}

/**
 * Quando un punto riceve i suoi pin, i due stati che fino a quel momento vivevano separati si uniscono, in ogni partita:
 *   - un punto già segnato segna i pin che hanno solo lui; un pin con altre voci è fatto quando lo sono tutte;
 *   - un punto non segnato i cui pin che hanno **solo lui** ci sono e sono tutti raccolti risulta segnato (e, se è un passo, il
 *     suo Enigma lo segue). Un pin con altre voci non conta: il suo «raccolto» parla di quelle (voci indipendenti, 2026-10-09),
 *     e segue le sue voci, tra cui ora questa ancora da fare. È la stessa regola di `impostaRaccolto`.
 * Un pin che ha solo questo punto, raccolto o no, non perde niente.
 * Va eseguita con il file delle partite attaccato (`utente`); senza, non fa niente.
 */
export function allineaStatiPunto(db: AppDatabase, punto: string, adesso: string): void {
  if (!conPartite(db)) return;
  const pin = pinDelPuntoGuida(db, punto);
  if (pin.length === 0) return;
  const soloSuoi = pin.filter((p) => quanteVociDelPin(db, p.id) === 1);
  const segnato = db.prepare('SELECT 1 FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?');
  const raccolto = db.prepare('SELECT 1 FROM spillo_partita WHERE partita_id = ? AND spillo_uid = ? AND raccolto = 1');
  const segna = db.prepare("INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at, automatico) VALUES (?, ?, 'ottenuto', ?, 0) ON CONFLICT(partita_id, punto_chiave) DO NOTHING");
  for (const { id: partita } of db.prepare('SELECT id FROM partita').all() as Array<{ id: number }>) {
    const giaSegnato = !!segnato.get(partita, punto);
    if (!giaSegnato && soloSuoi.length > 0 && soloSuoi.every((p) => raccolto.get(partita, p.uid))) {
      segna.run(partita, punto, adesso);
      // un passo segnato: il suo Enigma lo segue
      allineaEnigmaDellaVoce(db, partita, punto, adesso);
    }
    // segnato, i suoi pin seguono le loro voci; non segnato, solo quelli con altre voci (gli altri restano com'erano)
    for (const p of pin) if (giaSegnato || quanteVociDelPin(db, p.id) > 1) allineaRaccoltoDelPin(db, partita, p, adesso);
  }
}

/**
 * Quando un pin perde una voce, in ogni partita il suo «raccolto» segue le voci che gli restano (se ne ha ancora: fatte tutte,
 * il pin è fatto). Senza più voci resta com'era, come quando si scollegava l'unica voce.
 */
export function allineaPinScollegato(db: AppDatabase, pin: { id: number; uid: string | null }, adesso: string): void {
  if (!pin.uid || !conPartite(db)) return;
  for (const { id: partita } of db.prepare('SELECT id FROM partita').all() as Array<{ id: number }>) allineaRaccoltoDelPin(db, partita, { id: pin.id, uid: pin.uid }, adesso);
}

