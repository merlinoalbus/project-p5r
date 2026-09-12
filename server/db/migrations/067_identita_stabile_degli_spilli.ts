// ============================================================
// 067 — ogni spillo ha un'identità stabile (uid), che sopravvive all'esportazione
// ============================================================
//
// Con le partite in un file a parte (066) lo stato «raccolto» di uno spillo non può più
// appoggiarsi a `spillo.id`: l'id è un contatore del file di gioco, e un pacchetto importato o un
// `gioco.db` sostituito ricrea gli spilli con numeri diversi. L'`uid` è l'impronta dell'identità
// dello spillo (`identitaSpillo.ts`: mappa, tipo, nome, posizione, riferimento), quindi due file
// discesi dagli stessi dati — l'istanza migrata in proprio e il pacchetto del repository — danno
// lo stesso uid allo stesso spillo, e «l'ho raccolto» segue lo spillo da un file all'altro. I
// pacchetti mappe lo portano con sé (`esportaMappe`/`importaMappe`). Ogni inserimento
// dell'applicazione lo assegna subito (`assegnaUidMancanti`), e l'avvio ripassa gli spilli senza
// uid: nessun trigger casuale, che darebbe uid diversi per file.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { assegnaUidMancanti } from '../../services/mappe/identitaSpillo.js';

export const migration067: Migration = {
  id: 67,
  name: 'identita_stabile_degli_spilli',
  up(db) {
    const colonne = (db.prepare('PRAGMA table_info(spillo)').all() as Array<{ name: string }>).map((c) => c.name);
    if (!colonne.includes('uid')) db.exec('ALTER TABLE spillo ADD COLUMN uid TEXT');
    // un file passato per una stesura provvisoria di questa migrazione porta un trigger casuale: via
    db.exec('DROP TRIGGER IF EXISTS spillo_uid_automatico');
    assegnaUidMancanti(db);
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_spillo_uid ON spillo(uid)');
  },
};
