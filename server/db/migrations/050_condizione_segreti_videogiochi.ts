import type { Migration } from '../migrationRunner.js';
export const migration050: Migration = { id: 50, name: 'condizione-segreti-videogiochi', up(db) {
  db.prepare(`UPDATE articolo SET condizione = ?, condizioni_json = ? WHERE chiave = 'hinokuniya/segreti-di-gioco' AND origine = 'seed'`).run('dopo il completamento di un videogioco', JSON.stringify([{ tipo: 'stato', chiave: 'videogioco-completato', confronto: 'almeno', valore: 1 }]));
} };
