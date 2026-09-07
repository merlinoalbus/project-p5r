// ============================================================
// 054 — il luogo della guida e la planimetria che porta il suo nome
// ============================================================
//
// «Dove si trova la biblioteca della Shujin?» L'app rispondeva «alla Shujin Academy», e mostrava
// la mappa della scuola senza un punto: venticinque luoghi della guida su ottantasei non hanno uno
// spillo, e per loro la risposta si ferma al quartiere.
//
// Per tre di quei venticinque la risposta c'è già nell'atlante e non era collegata: esiste una
// planimetria nativa che **porta il nome del luogo** ed è figlia della mappa del suo quartiere —
// «Biblioteca» sotto Shujin Academy, «Cancello della scuola» sotto Shujin Academy, «Piazza della
// stazione» sotto Shibuya. Non è un'illazione: è lo stesso posto, detto con le stesse parole,
// dentro lo stesso quartiere.
//
// **Il collegamento si calcola, non si elenca.** Scrivere qui le tre chiavi sarebbe più corto e
// morirebbe subito: l'atlante cresce, e ogni planimetria nuova che porta il nome di un luogo
// dovrebbe ricollegarsi da sola. La regola è stretta apposta — nome uguale (o il nome del luogo
// che comincia con quello della mappa, «Biblioteca scolastica» sopra «Biblioteca»), stessa
// famiglia, e **solo per i luoghi che non hanno già un punto**: dove uno spillo c'è, quello vince,
// perché dice anche il *punto* e non solo la mappa.
//
// Oggi la regola trova tre collegamenti su ottantasei luoghi. È il numero giusto: non stiamo
// indovinando, stiamo raccogliendo quel che l'atlante sapeva già dire.
//
// Restano fuori infermeria e corridoio del 2° piano della Shujin, che una planimetria dedicata non
// ce l'hanno: starebbero su un piano, in un punto che nessun dato dichiara, e **un punto inventato
// su una mappa è peggio di nessun punto**.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type Database from 'better-sqlite3';

/** Nome confrontabile: minuscolo, senza accenti, senza punteggiatura, spazi normalizzati. */
function normalizza(testo: string): string {
  return testo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Collega i luoghi senza spillo alla planimetria del loro quartiere che ne porta il nome.
 *
 * Restituisce quanti collegamenti ha aggiunto (zero se erano già tutti lì). */
export function collegaLuoghiAllePlanimetrie(db: Database.Database): number {
  const tabelle = (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>).map((t) => t.name);
  if (!['luogo', 'mappa', 'mappa_entita', 'spillo'].every((t) => tabelle.includes(t))) return 0;

  const conPunto = new Set((db.prepare("SELECT DISTINCT riferimento_chiave AS c FROM spillo WHERE riferimento_tipo='luogo' AND riferimento_chiave IS NOT NULL").all() as Array<{ c: string }>).map((r) => r.c));
  const luoghi = db.prepare('SELECT chiave, nome, quartiere_chiave FROM luogo').all() as Array<{ chiave: string; nome: string; quartiere_chiave: string }>;
  const figli = new Map<string, Array<{ chiave: string; nome: string }>>();
  for (const m of db.prepare('SELECT chiave, nome, genitore_chiave FROM mappa WHERE genitore_chiave IS NOT NULL').all() as Array<{ chiave: string; nome: string; genitore_chiave: string }>) {
    figli.set(m.genitore_chiave, [...(figli.get(m.genitore_chiave) ?? []), { chiave: m.chiave, nome: m.nome }]);
  }
  const esistenti = new Set((db.prepare('SELECT mappa_chiave, entita_chiave FROM mappa_entita').all() as Array<{ mappa_chiave: string; entita_chiave: string }>).map((r) => `${r.mappa_chiave}|${r.entita_chiave}`));
  const inserisci = db.prepare("INSERT INTO mappa_entita (mappa_chiave, entita_tipo, entita_chiave, fonte_json) VALUES (?, 'luogo', ?, ?)");
  const fonte = JSON.stringify({ origine: 'regola', dichiarata: 'la planimetria porta il nome del luogo, nello stesso quartiere' });

  let aggiunti = 0;
  for (const l of luoghi) {
    if (conPunto.has(l.chiave)) continue;
    const nome = normalizza(l.nome);
    for (const m of figli.get(`citta-${l.quartiere_chiave}`) ?? []) {
      const suo = normalizza(m.nome);
      // Nome uguale, o il nome del luogo che comincia con quello della mappa seguito da altro
      // («Biblioteca scolastica» sopra «Biblioteca»): mai il contrario, che aprirebbe a
      // corrispondenze per una parola qualunque.
      if (suo.length < 5 || !(suo === nome || nome.startsWith(`${suo} `))) continue;
      if (esistenti.has(`${m.chiave}|${l.chiave}`)) continue;
      inserisci.run(m.chiave, l.chiave, fonte);
      esistenti.add(`${m.chiave}|${l.chiave}`);
      aggiunti += 1;
    }
  }
  return aggiunti;
}

export const migration054: Migration = {
  id: 54,
  name: 'luoghi_con_la_loro_planimetria',
  up(db) {
    collegaLuoghiAllePlanimetrie(db);
  },
};
