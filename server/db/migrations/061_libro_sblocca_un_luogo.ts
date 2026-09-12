// ============================================================
// 061 — «questo libro sblocca un posto» diventa un riferimento, non una frase
// ============================================================
//
// L'utente ha chiesto come si dice che leggere «Esplorando Yoncha 4» apre le scorciatoie di
// Yongen-Jaya. Non si poteva, e per due errori sovrapposti.
//
// Il primo e' vecchio: il dato c'era — la colonna `sblocca` — ma come **prosa**. «Sblocca
// scorciatoie a Yongen-Jaya» e' una frase che nessuno legge tranne chi guarda la scheda: l'app non
// puo' portarti su quella mappa, non puo' dirti che quel quartiere ti si apre leggendo, non puo'
// metterlo fra i motivi per cui una zona non e' ancora raggiungibile.
//
// Il secondo e' mio, di ieri: ho tolto quel campo dal modulo dicendo che la regola andava scritta
// in «Condizioni». Ma le condizioni di un libro dicono **quando il libro e' disponibile**, non
// **che cosa apre leggendolo** — e' il verso opposto. Tolto il campo, il dato e' rimasto in tabella
// e irraggiungibile.
//
// `effetto_json` esiste gia' per gli articoli (migrazione 059) e regge la dichiarazione
// strutturata di `shared/effettiOggetto.ts`. Qui arriva ai libri, dove la famiglia che serve e'
// `sblocca-luogo` — e il luogo e' la **chiave di un quartiere**, cosi' l'app ci puo' andare.
//
// **La colonna `sblocca` resta.** Dei ventiquattro libri che ce l'hanno, meta' indica un posto e
// meta' no: «Raddoppia la velocita di lettura», «Sblocca il Terzo Occhio nella pesca», «Amplia le
// combinazioni di attacchi tecnici». Quelli non sono luoghi e non vanno forzati a diventarlo: la
// frase resta dov'e' finche' non avranno una famiglia loro. Cancellarla per far posto a una
// struttura che copre meta' dei casi sarebbe perdere dati veri.
//
// La conversione qui sotto e' **conservativa**: assegna la chiave solo quando il nome del
// quartiere compare nel testo in modo inequivocabile. Un dubbio resta prosa.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type Database from 'better-sqlite3';

function aggiungiColonna(db: Database.Database, tabella: string, colonna: string, tipo: string): void {
  const gia = (db.prepare(`PRAGMA table_info(${tabella})`).all() as Array<{ name: string }>).some((c) => c.name === colonna);
  if (!gia) db.exec(`ALTER TABLE ${tabella} ADD COLUMN ${colonna} ${tipo}`);
}

/** Come la guida nomina un posto, e la chiave del quartiere che gli corrisponde.
 *
 * Non e' una lista inventata: sono le parole che compaiono davvero nei ventiquattro `sblocca` dei
 * libri, lette una per una. «Takenoko Street» e' Harajuku, «Seaside Park» e' Odaiba: chi ha scritto
 * la guida usa il nome del posto, non quello del quartiere che lo contiene. */
const NOMI: ReadonlyArray<readonly [RegExp, string]> = [
  [/yongen[- ]?jaya|yoncha/i, 'yongen-jaya'],
  [/takenoko|harajuku/i, 'harajuku'],
  [/seaside park|odaiba/i, 'odaiba'],
  [/shinagawa/i, 'shinagawa'],
  [/chinatown/i, 'yokohama-chinatown'],
  [/santuario meiji|meiji/i, 'meiji-shrine'],
  [/ikebukuro|planetario/i, 'ikebukuro'],
  [/jinbocho/i, 'kanda-jinbocho'],
  [/maihama/i, 'maihama'],
  [/skytree|shitamachi/i, 'asakusa'],
  [/nakano/i, 'nakano'],
  [/ichigaya/i, 'ichigaya'],
];

/** Il quartiere che una frase «Sblocca …» nomina in modo inequivocabile, se esiste; altrimenti null (la frase resta prosa). */
export function quartiereSbloccato(sblocca: string | null | undefined, quartieri: ReadonlySet<string>): string | null {
  if (!sblocca || !/^sblocca/i.test(sblocca.trim())) return null;
  const trovato = NOMI.find(([rx]) => rx.test(sblocca));
  return trovato && quartieri.has(trovato[1]) ? trovato[1] : null;
}

export const migration061: Migration = {
  id: 61,
  name: 'libro_sblocca_un_luogo',
  up(db) {
    aggiungiColonna(db, 'libro', 'effetto_json', 'TEXT');

    const quartieri = new Set((db.prepare('SELECT chiave FROM quartiere').all() as Array<{ chiave: string }>).map((r) => r.chiave));
    const righe = db.prepare("SELECT chiave, sblocca FROM libro WHERE sblocca IS NOT NULL AND trim(sblocca) <> '' AND effetto_json IS NULL")
      .all() as Array<{ chiave: string; sblocca: string }>;
    const scrivi = db.prepare('UPDATE libro SET effetto_json = ? WHERE chiave = ?');
    for (const r of righe) {
      // Solo quando il testo dice «sblocca»: «Aumenta i punti dote guardando film» nomina nessun
      // luogo, e «Raddoppia la velocita di lettura» nemmeno — non vanno interpretati.
      const luogo = quartiereSbloccato(r.sblocca, quartieri);
      if (!luogo) continue;
      scrivi.run(JSON.stringify({ famiglia: 'sblocca-luogo', luogo }), r.chiave);
    }
  },
};
