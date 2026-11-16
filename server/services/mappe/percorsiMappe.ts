// ============================================================
// percorsiMappe — dalla chiave interna di una mappa al suo percorso leggibile, e ritorno
// ============================================================
//
// Ogni mappa ha un'identità interna (la chiave storica) e un percorso fatto dai nomi della sua
// catena di genitori (`mappa_percorso`), che è quello di URL, ricerca ed esportazioni; i percorsi
// di prima restano come alias (`mappa_alias`), così i collegamenti vecchi continuano a funzionare.
// ============================================================

import type Database from 'better-sqlite3';
import type { AppDatabase } from '../../db/dbService.js';
import { getDb } from '../../db/dbService.js';
import { slug } from '../../../shared/slug.js';
import { nomeCompletoPlanimetria } from '../../../shared/nomiPlanimetrie.js';
import { httpErrors } from '../../utils/httpError.js';

interface Nodo { chiave:string; nome:string; tipo:string; genitore_chiave:string|null;
  /** Il percorso pubblico fissato (L2: il Covo spostato sotto Yongen-Jaya tiene `covo-dei-ladri`); null = dalla catena dei genitori. */
  percorso_fisso?:string|null }

// ---- Statement per connessione ----
//
// Queste funzioni ricevono la connessione e sono chiamate per ogni mappa di ogni risposta: compilare
// lo statement a ogni chiamata costerebbe un quarto del tempo dell'albero delle mappe (rilievo P2
// della verifica, 2026-10-03). Gli statement restano per connessione (una connessione nuova ha i suoi).
const statementPerConnessione = new WeakMap<AppDatabase, Map<string, Database.Statement>>();

/** Lo statement di quella SQL su quella connessione: compilato la prima volta, poi ripreso dalla cache della connessione. */
function stmt(db: AppDatabase, sql: string): Database.Statement {
  let cache = statementPerConnessione.get(db);
  if (!cache) { cache = new Map(); statementPerConnessione.set(db, cache); }
  let s = cache.get(sql);
  if (!s) { s = db.prepare(sql); cache.set(sql, s); }
  return s;
}

/** La chiave storica è un'identità interna: URL, ricerca ed esportazioni usano il percorso. */
export function idMappa(chiave:string,db:AppDatabase=getDb()):string {
  return (stmt(db,'SELECT mappa_chiave FROM mappa_percorso WHERE chiave=? UNION ALL SELECT mappa_chiave FROM mappa_alias WHERE chiave=? LIMIT 1').get(chiave,chiave) as {mappa_chiave:string}|undefined)?.mappa_chiave??chiave;
}
/** Il percorso pubblico di una mappa dalla sua chiave interna; la chiave stessa se non c'è (ancora) un percorso. */
export function chiaveMappa(identita:string,db:AppDatabase=getDb()):string {
  return (stmt(db,'SELECT chiave FROM mappa_percorso WHERE mappa_chiave=?').get(identita) as {chiave:string}|undefined)?.chiave??identita;
}
/**
 * Il percorso pubblico di TUTTE le mappe con un percorso, in una sola lettura: per chi risolve centinaia di chiavi in una richiesta
 * (l'indice dei luoghi) senza una query per nodo. Una mappa senza percorso non c'è nella tabella: `chiaveMappa` darebbe l'identità stessa.
 */
export function chiaviPubblicheDelleMappe(db:AppDatabase=getDb()):Map<string,string> {
  const righe=stmt(db,'SELECT mappa_chiave, chiave FROM mappa_percorso').all() as Array<{mappa_chiave:string;chiave:string}>;
  return new Map(righe.map(r=>[r.mappa_chiave,r.chiave]));
}
/** Il nome completo di una mappa con i genitori significativi («Palazzo › Piano»); la chiave stessa se non c'è un percorso. */
export function nomePercorso(identita:string,db:AppDatabase=getDb()):string {
  return (stmt(db,'SELECT nome FROM mappa_percorso WHERE mappa_chiave=?').get(identita) as {nome:string}|undefined)?.nome??identita;
}
/** L'Area e l'etichetta di versione di una planimetria; null se la mappa non sta in un'Area. */
function areaEdEtichetta(identita:string,db:AppDatabase):{area:string;etichetta:string|null}|null {
  return (stmt(db,'SELECT a.nome AS area, m.versione_etichetta AS etichetta FROM mappa m JOIN area a ON a.chiave=m.area_chiave WHERE m.chiave=?').get(identita) as {area:string;etichetta:string|null}|undefined)??null;
}
/**
 * Il nome con cui una planimetria si presenta, col contenitore davanti come `nomePercorso` («Palazzo › Area · etichetta»): l'etichetta
 * è quella scritta in «Modifica area». Senza Area o senza etichetta resta `nomePercorso`. È il punto unico da cui le viste dei
 * Palazzi leggono il nome di una planimetria; l'indirizzo e la ricerca restano sul percorso.
 */
export function nomePercorsoVisibile(identita:string,db:AppDatabase=getDb()):string {
  const percorso=nomePercorso(identita,db);
  const r=areaEdEtichetta(identita,db);
  const completo=r?nomeCompletoPlanimetria(r.area,r.etichetta):null;
  if(!completo)return percorso;
  const pezzi=percorso.split(' › ');
  return pezzi.length>1?`${pezzi[0]} › ${completo}`:completo;
}
/** L'etichetta di versione di una planimetria di un'Area (quella di «Modifica area»), o null. */
export function etichettaDiVersione(identita:string,db:AppDatabase=getDb()):string|null {
  return areaEdEtichetta(identita,db)?.etichetta?.trim()||null;
}
/** Il nome completo di una planimetria senza il contenitore, «Area · etichetta»; null se non ha un'Area o un'etichetta (chi chiama usa
 *  allora il nome della mappa, com'era). */
export function nomeDelPosto(identita:string,db:AppDatabase=getDb()):string|null {
  const r=areaEdEtichetta(identita,db);
  return r?nomeCompletoPlanimetria(r.area,r.etichetta):null;
}
/** Controlla tutto il piano prima di scrivere. Nessun cambio di identità, FK o stato del giocatore. */
export function sincronizzaPercorsiMappe(db:AppDatabase):void {
  const nodi=db.prepare('SELECT chiave,nome,tipo,genitore_chiave,percorso_fisso FROM mappa').all() as Nodo[];
  const indice=new Map(nodi.map(n=>[n.chiave,n]));
  const usati=new Map<string,string>();
  const nomiBase=new Map<string,number>();
  for (const n of nodi) {
    const catena:Nodo[]=[];let c:Nodo|undefined=n;const visti=new Set<string>();
    while(c){if(visti.has(c.chiave))throw httpErrors.badRequest('gerarchia-ciclica','La gerarchia delle mappe contiene un ciclo.');visti.add(c.chiave);catena.unshift(c);c=c.genitore_chiave?indice.get(c.genitore_chiave):undefined;}
    const base=catena.filter(c=>c.tipo!=='citta'||c===n).map(c=>slug(c.nome)).join('-');nomiBase.set(base,(nomiBase.get(base)??0)+1);
  }
  const piano=nodi.map(n=>{
    const catena:Nodo[]=[];let corrente:Nodo|undefined=n;const visti=new Set<string>();
    while(corrente){
      if(visti.has(corrente.chiave))throw httpErrors.badRequest('gerarchia-ciclica','La gerarchia delle mappe contiene un ciclo.');
      visti.add(corrente.chiave);catena.unshift(corrente);
      corrente=corrente.genitore_chiave?indice.get(corrente.genitore_chiave):undefined;
    }
    // un percorso fissato resta quello, col nome della mappa sola: la mappa si presenta come prima di essere spostata
    const significativi=n.percorso_fisso?[n]:catena.filter(c=>c.tipo!=='citta'||c===n);
    let chiave=n.percorso_fisso??significativi.map(c=>slug(c.nome)).join('-');
    // Le varianti native possono condividere il nome del luogo. L'identità è nell'URL, mai nel titolo.
    const aliasBase=stmt(db,'SELECT mappa_chiave FROM mappa_alias WHERE chiave=?').get(chiave) as {mappa_chiave:string}|undefined;
    if (!n.percorso_fisso && /^nativo-rmap-\d+-\d+-\d+$/.test(n.chiave) && ((nomiBase.get(chiave)??0)>1 || (aliasBase && aliasBase.mappa_chiave!==n.chiave))) chiave=chiave+'-'+n.chiave;
    if(!chiave||chiave.length>180)throw httpErrors.badRequest('percorso-troppo-lungo','Il percorso della mappa supera 180 caratteri o non contiene un nome utilizzabile. Abbrevia uno dei nomi.');
    if(usati.has(chiave)&&usati.get(chiave)!==n.chiave)throw httpErrors.conflict('nome-mappa-duplicato','Due mappe producono lo stesso percorso: '+significativi.map(c=>c.nome).join(' › ')+'. Scegli nomi distinti.');
    usati.set(chiave,n.chiave);
    const alias=stmt(db,'SELECT mappa_chiave FROM mappa_alias WHERE chiave=?').get(chiave) as {mappa_chiave:string}|undefined;
    if(alias&&alias.mappa_chiave!==n.chiave)throw httpErrors.conflict('percorso-gia-usato','Questo percorso appartiene già a un’altra mappa, anche tra i collegamenti precedenti.');
    return {id:n.chiave,chiave,nome:significativi.map(c=>c.nome).join(' › ')};
  });
  db.transaction(()=>{
    // Gli alias non puntano mai ad altri alias: le catene di rinomina non creano cicli.
    for(const p of db.prepare('SELECT mappa_chiave,chiave FROM mappa_percorso').all() as Array<{mappa_chiave:string;chiave:string}>)stmt(db,'INSERT OR IGNORE INTO mappa_alias VALUES(?,?)').run(p.chiave,p.mappa_chiave);
    db.prepare('DELETE FROM mappa_percorso').run();
    for(const p of piano){stmt(db,'INSERT INTO mappa_percorso VALUES(?,?,?)').run(p.id,p.chiave,p.nome);stmt(db,'INSERT OR IGNORE INTO mappa_alias VALUES(?,?)').run(p.id,p.id);}
  })();
}
