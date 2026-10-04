// ============================================================
// 097 — Dove si atterra toccando un Palazzo sulla mappa di Tokyo, per date; Kamoshida c'è dall'11 aprile
// ============================================================
//
// Richiesta dell'utente (2026-10-04): «devi visualizzare l'icona e permettermi di valorizzare per fasce temporali o giorni
// specifici il punto di atterraggio dell'icona della mappa rispetto al mappamondo delle planimetrie». Nel gioco il Palazzo di
// Kamoshida si visita la prima volta l'11 aprile (Prigione sotterranea, tutorial), il 12 si torna dalla Sala Centrale, e solo
// dopo l'accesso diventa quello di sempre: dove si atterra dipende dal giorno.
//
// `dungeon_atterraggio` tiene le regole di un Palazzo, nell'ordine in cui si provano. Ogni regola dice:
// - quando vale: `dal`/`al` in MM-GG del calendario di gioco (aprile → marzo). Un giorno solo ha `dal` = `al`; `al` nullo vale
//   «da `dal` in poi»; entrambi nulli vale sempre (l'accesso standard, che di solito sta in fondo);
// - dove si atterra: una planimetria del Palazzo (`mappa_chiave`, la chiave interna, stabile anche quando il percorso cambia) e,
//   se c'è, il pin d'arrivo su cui centrarla (`spillo_id`).
// Vale la prima regola che copre il giorno della partita. Le regole sono dati di gioco (stanno in `gioco.db` e viaggiano con
// il pacchetto): eliminando la planimetria se ne vanno anche le sue regole, eliminando il pin la regola resta senza pin.
//
// La finestra di Kamoshida nella voce `finestre-dungeon` di `dati_guida` passa dal 12 all'11 aprile, il giorno della prima
// visita: è quella che decide se il Palazzo compare sulla mappa (e l'arco corrente delle condizioni). Si tocca solo se è
// ancora quella trascritta in origine («04-12»), così una correzione fatta a mano non torna indietro.
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const migration097: Migration = {
  id: 97,
  name: 'atterraggio_palazzi',
  up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS dungeon_atterraggio (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      dungeon_chiave TEXT NOT NULL REFERENCES dungeon(chiave) ON DELETE CASCADE,
      ordine        INTEGER NOT NULL,
      dal           TEXT NULL,
      al            TEXT NULL,
      mappa_chiave  TEXT NOT NULL REFERENCES mappa(chiave) ON DELETE CASCADE,
      spillo_id     INTEGER NULL REFERENCES spillo(id) ON DELETE SET NULL,
      updated_at    TEXT NOT NULL
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_dungeon_atterraggio_dungeon ON dungeon_atterraggio(dungeon_chiave, ordine)');

    const riga = db.prepare("SELECT json FROM dati_guida WHERE chiave = 'finestre-dungeon'").get() as { json: string } | undefined;
    if (!riga) return;
    let dati: { finestre?: Array<{ dungeon?: string; dal?: string }> };
    try {
      dati = JSON.parse(riga.json) as typeof dati;
    } catch {
      return; // una trascrizione illeggibile non si tocca: la legge già come «nessuna finestra» chi la usa
    }
    const kamoshida = dati.finestre?.find((f) => f.dungeon === 'kamoshida');
    if (kamoshida?.dal !== '04-12') return;
    kamoshida.dal = '04-11';
    db.prepare("UPDATE dati_guida SET json = ? WHERE chiave = 'finestre-dungeon'").run(JSON.stringify(dati));
  },
};
