// Ciclo 9: toglie dalla sua Area la planimetria di Central Street, come il test FUN2-9 di BE (a BE fermo, sui dati del collaudo).
const D = require(process.cwd() + '/node_modules/better-sqlite3');
const d = new D('data/gioco.db');
const pianta = 'nativo-rmap-001-3-0';
d.pragma('foreign_keys = OFF');
d.transaction(() => {
  d.prepare('UPDATE area SET planimetria_predefinita = NULL WHERE chiave = ?').run('citta/shibuya/central-street');
  d.prepare('UPDATE mappa SET area_chiave = NULL, versione_ordine = NULL, versione_etichetta = NULL WHERE chiave = ?').run(pianta);
})();
d.pragma('foreign_keys = ON');
console.log(d.prepare('SELECT chiave, area_chiave, genitore_chiave FROM mappa WHERE chiave = ?').get(pianta), d.prepare("SELECT planimetria_predefinita FROM area WHERE chiave = 'citta/shibuya/central-street'").get());
d.close();
