import type { AppDatabase } from '../../db/dbService.js';
import { getDb } from '../../db/dbService.js';
import { slug } from '../../../shared/slug.js';
import { httpErrors } from '../../utils/httpError.js';

interface Nodo { chiave:string; nome:string; tipo:string; genitore_chiave:string|null }
/** La chiave storica è un'identità interna: URL, ricerca ed esportazioni usano il percorso. */
export function idMappa(chiave:string,db:AppDatabase=getDb()):string {
  const presente=db.prepare("SELECT 1 FROM sqlite_master WHERE name='mappa_percorso'").get();
  if(!presente)return chiave;
  return (db.prepare('SELECT mappa_chiave FROM mappa_percorso WHERE chiave=? UNION ALL SELECT mappa_chiave FROM mappa_alias WHERE chiave=? LIMIT 1').get(chiave,chiave) as {mappa_chiave:string}|undefined)?.mappa_chiave??chiave;
}
export function chiaveMappa(identita:string,db:AppDatabase=getDb()):string {
  if(!db.prepare("SELECT 1 FROM sqlite_master WHERE name='mappa_percorso'").get())return identita;
  return (db.prepare('SELECT chiave FROM mappa_percorso WHERE mappa_chiave=?').get(identita) as {chiave:string}|undefined)?.chiave??identita;
}
export function nomePercorso(identita:string,db:AppDatabase=getDb()):string {
  return (db.prepare('SELECT nome FROM mappa_percorso WHERE mappa_chiave=?').get(identita) as {nome:string}|undefined)?.nome??identita;
}
/** Controlla tutto il piano prima di scrivere. Nessun cambio di identità, FK o stato del giocatore. */
export function sincronizzaPercorsiMappe(db:AppDatabase):void {
  if(!db.prepare("SELECT 1 FROM sqlite_master WHERE name='mappa_percorso'").get())return;
  const nodi=db.prepare('SELECT chiave,nome,tipo,genitore_chiave FROM mappa').all() as Nodo[];
  const indice=new Map(nodi.map(n=>[n.chiave,n]));
  const usati=new Map<string,string>();
  const piano=nodi.map(n=>{
    const catena:Nodo[]=[];let corrente:Nodo|undefined=n;const visti=new Set<string>();
    while(corrente){
      if(visti.has(corrente.chiave))throw httpErrors.badRequest('gerarchia-ciclica','La gerarchia delle mappe contiene un ciclo.');
      visti.add(corrente.chiave);catena.unshift(corrente);
      corrente=corrente.genitore_chiave?indice.get(corrente.genitore_chiave):undefined;
    }
    const significativi=catena.filter(c=>c.tipo!=='citta'||c===n);
    const chiave=significativi.map(c=>slug(c.nome)).join('-');
    if(!chiave||chiave.length>180)throw httpErrors.badRequest('percorso-troppo-lungo','Il percorso della mappa supera 180 caratteri o non contiene un nome utilizzabile. Abbrevia uno dei nomi.');
    if(usati.has(chiave)&&usati.get(chiave)!==n.chiave)throw httpErrors.conflict('nome-mappa-duplicato','Due mappe producono lo stesso percorso: '+significativi.map(c=>c.nome).join(' › ')+'. Scegli nomi distinti.');
    usati.set(chiave,n.chiave);
    const alias=db.prepare('SELECT mappa_chiave FROM mappa_alias WHERE chiave=?').get(chiave) as {mappa_chiave:string}|undefined;
    if(alias&&alias.mappa_chiave!==n.chiave)throw httpErrors.conflict('percorso-gia-usato','Questo percorso appartiene già a un’altra mappa, anche tra i collegamenti precedenti.');
    return {id:n.chiave,chiave,nome:significativi.map(c=>c.nome).join(' › ')};
  });
  db.transaction(()=>{
    // Gli alias non puntano mai ad altri alias: le catene di rinomina non creano cicli.
    for(const p of db.prepare('SELECT mappa_chiave,chiave FROM mappa_percorso').all() as Array<{mappa_chiave:string;chiave:string}>)db.prepare('INSERT OR IGNORE INTO mappa_alias VALUES(?,?)').run(p.chiave,p.mappa_chiave);
    db.prepare('DELETE FROM mappa_percorso').run();
    for(const p of piano){db.prepare('INSERT INTO mappa_percorso VALUES(?,?,?)').run(p.id,p.chiave,p.nome);db.prepare('INSERT OR IGNORE INTO mappa_alias VALUES(?,?)').run(p.id,p.id);}
  })();
}
