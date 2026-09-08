// ============================================================
// 058 — l'articolo di un negozio è un riferimento a un oggetto, non una sua copia
// ============================================================
//
// Fino a qui la tabella `articolo` teneva `nome`, `nome_it`, `per`, `effetto` e `statistiche` come
// **colonne proprie**: mettere in vendita una cosa che l'app già conosceva voleva dire ribatterla a
// mano. Il risultato era prevedibile e c'è nei dati: 575 articoli, 355 oggetti, e l'unico ponte fra
// i due mondi era `oggetti-crosswalk.json`, che li **indovina per nome** e ne aggancia 121. Gli
// altri sono copie che nessuno tiene allineate — due negozi che vendono la stessa cosa possono
// dichiararne due effetti diversi, e non c'è modo di sapere quale sia quello giusto.
//
// L'utente l'ha detto in una riga: «non deve recuperare e copiare le informazioni, deve proprio
// collegare l'oggetto al negozio». Qui si aggiunge il posto dove quel collegamento può stare.
//
// **`oggetto_fonte` + `oggetto_chiave`**, e non una sola colonna, perché gli oggetti dell'app non
// vivono in una tabella sola: gli equipaggiamenti hanno un id numerico, i consumabili e gli oggetti
// chiave della guida si chiamano per nome, libri, film e attività hanno la loro chiave. La coppia
// dice *in quale archivio* e *quale voce*, ed è l'unica forma che li copre tutti senza inventare
// una tabella di mezzo che andrebbe tenuta allineata a sua volta.
//
// **Nullable, e resta nullable.** L'articolo scritto a mano — la cosa che nessuno ha mai censito —
// deve continuare a funzionare esattamente come prima: senza collegamento le colonne copiate sono
// ancora lì e sono ancora la sua descrizione. Rendere il collegamento obbligatorio avrebbe
// invalidato 454 righe esistenti, che è una regressione, non una migrazione.
//
// **`quantita`**: quante se ne possono comprare. Sta qui e non fra i dati di partita perché è un
// limite dell'articolo — l'Untouchable vende un solo modello di quel tipo — non qualcosa che
// cambia da giocatore a giocatore. `NULL` vuol dire «nessun limite dichiarato», che è diverso da
// zero: zero sarebbe «non se ne può comprare nessuno», e non è quel che sappiamo delle 575 righe
// di adesso.
//
// Le colonne copiate **non si toccano e non si svuotano**. Chi legge un articolo collegato deve
// prendere nome, effetto, statistiche e «per chi» dall'oggetto, ma quel comportamento sta nel
// servizio: una migrazione che cancella dati per far posto a una regola nuova è irreversibile, e se
// la regola si rivela sbagliata il dato non torna.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type Database from 'better-sqlite3';

function aggiungiColonna(db: Database.Database, tabella: string, colonna: string, tipo: string): void {
  const gia = (db.prepare(`PRAGMA table_info(${tabella})`).all() as Array<{ name: string }>).some((c) => c.name === colonna);
  if (!gia) db.exec(`ALTER TABLE ${tabella} ADD COLUMN ${colonna} ${tipo}`);
}

export const migration058: Migration = {
  id: 58,
  name: 'articolo_collegato_all_oggetto',
  up(db) {
    aggiungiColonna(db, 'articolo', 'oggetto_fonte', 'TEXT');
    aggiungiColonna(db, 'articolo', 'oggetto_chiave', 'TEXT');
    aggiungiColonna(db, 'articolo', 'quantita', 'INTEGER');
    // Le due colonne si usano sempre insieme: mezzo collegamento non è un collegamento, e una riga
    // con la fonte e senza la chiave (o viceversa) sarebbe un dato che nessuna lettura sa risolvere.
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_articolo_oggetto ON articolo(oggetto_fonte, oggetto_chiave);
    `);
  },
};
