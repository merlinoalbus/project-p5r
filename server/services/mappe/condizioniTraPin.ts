// ============================================================
// Le condizioni fra pin: nessun pin dipende da se stesso, nessun giro (scelta dell'utente, 2026-10-03)
// ============================================================
//
// Una condizione «Pin di una mappa» rende un pin visibile secondo lo stato di un altro. Se A dipende da B e B da A — o il giro
// è più lungo, A → B → C → A — può succedere che nessuno dei due si veda e quindi che nessuno dei due si possa più segnare: la
// guida si chiude da sola. L'utente ha scelto di rifiutare il giro al salvataggio (l'editor, l'API, un pacchetto importato),
// nominando i pin che lo formano.
// ============================================================

import type { AppDatabase } from '../../db/dbService.js';
import { httpErrors } from '../../utils/httpError.js';
import { foglieCondizione, leggiCondizioniSalvate, type RequisitoSpillo } from '../../../shared/condizioniSpillo.js';

/** Gli uid dei pin citati da un elenco di condizioni, a qualunque profondità. */
export function pinCitati(condizioni: readonly RequisitoSpillo[]): string[] {
  return [...new Set(condizioni.flatMap(foglieCondizione).flatMap((f) => (f.tipo === 'spillo' ? [f.spillo] : [])))];
}

/**
 * Il giro che si chiuderebbe dando al pin `uid` queste condizioni, come elenco di uid dal pin al pin (`[A, B, A]`), o null.
 * Gli altri pin portano le condizioni salvate.
 */
function giroDiCondizioni(db: AppDatabase, uid: string, condizioni: readonly RequisitoSpillo[]): string[] | null {
  const righe = db.prepare("SELECT uid, condizioni_json FROM spillo WHERE uid IS NOT NULL AND condizioni_json LIKE '%\"spillo\"%'").all() as Array<{ uid: string; condizioni_json: string }>;
  const archi = new Map(righe.map((r) => [r.uid, pinCitati(leggiCondizioniSalvate(r.condizioni_json))]));
  archi.set(uid, pinCitati(condizioni));
  const visti = new Set<string>();
  const cammino: string[] = [];
  /**
   * Visita in profondità i pin citati da `da`: vero appena si torna a `uid`, e intanto il cammino si ricostruisce
   * all'indietro. Ogni pin si visita una volta sola (un pin già visto non ha portato al giro).
   */
  const cerca = (da: string): boolean => {
    for (const verso of archi.get(da) ?? []) {
      if (verso !== uid) {
        if (visti.has(verso)) continue;
        visti.add(verso);
        if (!cerca(verso)) continue;
      }
      cammino.unshift(verso);
      return true;
    }
    return false;
  };
  return cerca(uid) ? [uid, ...cammino] : null;
}

/** Rifiuta (400) le condizioni che farebbero dipendere il pin da se stesso o chiuderebbero un giro, coi nomi dei pin. */
export function verificaGiro(db: AppDatabase, uid: string, condizioni: readonly RequisitoSpillo[]): void {
  const giro = giroDiCondizioni(db, uid, condizioni);
  if (!giro) return;
  /** Il nome del pin per il messaggio; l'uid stesso se il pin non c'è (ancora) nel database. */
  const nome = (u: string) => (db.prepare('SELECT nome FROM spillo WHERE uid = ?').get(u) as { nome: string } | undefined)?.nome ?? u;
  if (giro.length === 2) throw httpErrors.badRequest('condizione-su-se-stesso', `«${nome(uid)}» non può dipendere dal proprio stato: scegli un altro pin.`);
  throw httpErrors.badRequest('condizioni-in-giro', `Le condizioni farebbero un giro fra i pin (${giro.map(nome).join(' → ')}): nessuno di loro potrebbe più comparire. Togli uno dei collegamenti.`);
}
