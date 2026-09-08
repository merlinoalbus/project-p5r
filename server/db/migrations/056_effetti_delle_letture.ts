// ============================================================
// 056 — leggere, vedere e giocare alzano davvero le Doti
// ============================================================
//
// Segnalato usando l'app: cinque visioni registrate di un film che dà «Coraggio ♪♪♪» hanno lasciato
// Coraggio a zero. Non era un difetto di una pagina: i punti li toccavano soltanto tre posti — i
// pulsanti della scheda Doti, la risposta giusta in classe, e la spunta di un'azione nella guida
// del giorno — mentre `impostaLettura` scriveva l'avanzamento e un evento nello storico, e basta.
// Il risultato è che la scheda prometteva un effetto che il tracciamento non applicava mai.
//
// Il trigger giusto è il **conseguimento**: un libro finito, un film visto, un gioco completato. È
// lì che il gioco dà le note, ed è lì che l'app deve darle.
//
// Questa migrazione porta le due colonne che servono a farlo bene:
//
// **`film.note_successive`** — quante note vale una visione *dopo* la prima. Al cinema un film si
// rivede, e la guida lo dice riga per riga («prima visione: +3; visioni successive: +1»), ma la
// riga di un film aveva **un** solo campo `note`: quella distinzione viveva solo nella prosa dei
// dettagli, quindi l'app non poteva applicarla nemmeno volendo. Resta `NULL` dove la guida non
// dichiara nulla, e `NULL` vuol dire «le visioni successive non danno niente» — che è quello che
// l'app faceva finora, quindi nessuna partita esistente cambia da sola.
//
// **`effetto_lettura_partita`** — quali punti sono stati dati, per che cosa e a quale
// conseguimento. Serve a **togliere esattamente quello che si è dato**: disfare una lettura deve
// restituire quei punti, non un ricalcolo. Fra il momento in cui li dai e quello in cui li togli il
// mondo attorno può essere cambiato — leggere «Anima da cineasta» alza di uno scalino i punti di
// film e DVD, «Lettura rapida» cambia le sessioni — e ricalcolare restituirebbe più o meno del
// dovuto, lasciando punti fantasma in una partita lunga. È lo stesso motivo per cui
// `azione_partita` conserva i suoi effetti dalla fase 12.
//
// `ordine` distingue la prima visione dalle successive, così togliere una visione toglie **l'ultima**
// e non una qualsiasi: al cinema la prima vale più delle altre, e restituire la prima quando si
// disfa la terza sarebbe un regalo.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type Database from 'better-sqlite3';

function aggiungiColonna(db: Database.Database, tabella: string, colonna: string, tipo: string): void {
  const gia = (db.prepare(`PRAGMA table_info(${tabella})`).all() as Array<{ name: string }>).some((c) => c.name === colonna);
  if (!gia) db.exec(`ALTER TABLE ${tabella} ADD COLUMN ${colonna} ${tipo}`);
}

export const migration056: Migration = {
  id: 56,
  name: 'effetti_delle_letture',
  up(db) {
    aggiungiColonna(db, 'film', 'note_successive', 'INTEGER');
    db.exec(`
CREATE TABLE IF NOT EXISTS effetto_lettura_partita (
  partita_id  INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL,               -- 'libro' | 'film' | 'videogioco'
  chiave      TEXT NOT NULL,
  ordine      INTEGER NOT NULL,            -- 1 = primo conseguimento, 2 = secondo…
  dote_chiave TEXT NOT NULL,
  punti       INTEGER NOT NULL,
  note        INTEGER NOT NULL,
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (partita_id, tipo, chiave, ordine, dote_chiave)
);
CREATE INDEX IF NOT EXISTS idx_effetto_lettura_partita ON effetto_lettura_partita(partita_id, tipo, chiave);
`);
  },
};
