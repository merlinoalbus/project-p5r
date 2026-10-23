// ============================================================
// utente 035 — il regalo è un'azione sola (R10-18): la consegna ricorda i punti dati e l'acquisto segnato insieme
// ============================================================
//
// `regalo_partita` registrava solo la consegna (nome, chiave del catalogo, istante). L'azione unica «Regala» dà anche i punti al Confidente e,
// se l'oggetto non risulta comprato, può segnare l'acquisto: per poterla annullare identica la riga ricorda che cosa ha fatto.
// Solo colonne nuove, tutte nulle: nessuna riga esistente cambia (le consegne già date restano com'erano, senza punti né acquisto da disfare).
//   punti_dati       i punti che il regalo ha dato al Confidente (con i moltiplicatori), null se non ne ha dati
//   rango_al_regalo  il rango del Confidente quando ha dato i punti: se è cambiato, i punti erano già ripartiti da zero e non si tolgono
//   acquisto_articolo l'articolo che l'azione ha segnato come comprato, null se non ha segnato niente
//   data_gioco / fascia_gioco il momento di gioco della consegna (la «data» dell'azione)
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const utente035: Migration = {
  id: 35,
  name: 'regalo_con_punti_e_acquisto',
  up(db) {
    const colonne = new Set((db.prepare('PRAGMA utente.table_info(regalo_partita)').all() as Array<{ name: string }>).map((c) => c.name));
    for (const [nome, tipo] of [['punti_dati', 'REAL'], ['rango_al_regalo', 'INTEGER'], ['acquisto_articolo', 'TEXT'], ['data_gioco', 'TEXT'], ['fascia_gioco', 'TEXT']] as const) {
      if (!colonne.has(nome)) db.exec(`ALTER TABLE utente.regalo_partita ADD COLUMN ${nome} ${tipo}`);
    }
  },
};
