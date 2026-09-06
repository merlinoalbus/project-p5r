import { closeDb, initDb } from '../../db/dbService.js';
import { runMigrations } from '../../db/migrationRunner.js';
import { importaMappe, aggiornaSpillo, rettificaNomiSpilliSeed } from './mappeService.js';
import { RETTIFICHE_NOMI_SEED } from './rettificheNomiSeed.js';
import type { EsportazioneMappeDto } from '../../../shared/types.js';
type Nodo=EsportazioneMappeDto['mappe'][number];
const nodo=(chiave:string,spilli:Nodo['spilli']=[]):Nodo=>({chiave,nome:chiave,tipo:'generica',genitore:null,ordine:0,immagine:null,asset:null,larghezza:null,altezza:null,entita:null,note:'',spilli});
const pacchetto=(versione:'prima'|'dopo'):EsportazioneMappeDto=>({versione:1,mappe:[nodo('citta-yongen-jaya',RETTIFICHE_NOMI_SEED.filter(r=>r.mappa==='citta-yongen-jaya').map(r=>structuredClone(r[versione]))),nodo('yongen-java-banchina-della-metropolitana',RETTIFICHE_NOMI_SEED.filter(r=>r.mappa!=='citta-yongen-jaya').map(r=>structuredClone(r[versione]))),nodo('destinazione')]});
const setup=()=>{const db=initDb(':memory:');runMigrations(db);importaMappe(pacchetto('prima'),{origine:'seed'});return db;};
describe('rettifiche circoscritte dei nomi base',()=>{
 afterEach(()=>closeDb());
 it('corregge quattro testi e conserva ogni ID, dipendente e posizione dopo due reseed',()=>{
  const db=setup();const prima=db.prepare('SELECT * FROM spillo ORDER BY id').all() as Array<Record<string,unknown>>;
  const id=prima[0].id;const partita=db.prepare("INSERT INTO partita(nome,created_at,updated_at) VALUES('P','t','t')").run().lastInsertRowid;
  db.prepare("INSERT INTO spillo_partita VALUES(?,?,1,'t')").run(partita,id);
  db.prepare("INSERT INTO spillo_destinazione VALUES(?,'destinazione',10,20,1)").run(id);
  const dip=()=>['spillo_partita','spillo_destinazione','spillo_immagine'].map(t=>db.prepare('SELECT * FROM '+t+' ORDER BY 1').all());
  const originali=dip();const nuovo=pacchetto('dopo');
  for(let i=0;i<2;i++){
   importaMappe(nuovo,{origine:'seed',pacchettiSeed:[nuovo]});
   expect(db.prepare('SELECT * FROM spillo ORDER BY id').all()).toEqual(prima.map(r=>({...r,nome:String(r.nome).replace('Yongen-Java','Yongen-Jaya'),descrizione:String(r.descrizione).replace('Yongen-Java','Yongen-Jaya')})));
   expect(dip()).toEqual(originali);expect(db.pragma('foreign_key_check')).toEqual([]);
  }
 });
 it('mantiene erede spostato, testi personali e identità storica senza ricrearlo',()=>{
  const db=setup();const id=(db.prepare('SELECT id FROM spillo ORDER BY id LIMIT 1').get() as {id:number}).id;
  aggiornaSpillo(id,{mappa:'destinazione',nome:'Uscita preferita',descrizione:'Nota personale',x:21,y:43});
  const prima=db.prepare('SELECT * FROM spillo WHERE id=?').get(id);const nuovo=pacchetto('dopo');
  for(let i=0;i<2;i++)importaMappe(nuovo,{origine:'seed',pacchettiSeed:[nuovo]});
  expect(db.prepare('SELECT * FROM spillo WHERE id=?').get(id)).toEqual(prima);
  expect(db.prepare('SELECT count(*) n FROM spillo').get()).toEqual({n:4});
  expect(db.prepare("SELECT count(*) n FROM spillo WHERE mappa_chiave='citta-yongen-jaya'").get()).toEqual({n:1});
 });
 it('preserva la personalizzazione sul posto senza fondere gli ingressi alla stessa mappa',()=>{
  const db=setup();const id=(db.prepare('SELECT id FROM spillo ORDER BY id LIMIT 1').get() as {id:number}).id;
  aggiornaSpillo(id,{nome:'Nome scelto',descrizione:'Da conservare'});const prima=db.prepare('SELECT * FROM spillo WHERE id=?').get(id);
  const nuovo=pacchetto('dopo');for(let i=0;i<2;i++)importaMappe(nuovo,{origine:'seed',pacchettiSeed:[nuovo]});
  expect(db.prepare('SELECT * FROM spillo WHERE id=?').get(id)).toEqual(prima);
  expect(db.prepare("SELECT x,y FROM spillo WHERE mappa_chiave='citta-yongen-jaya' ORDER BY x").all()).toEqual([{x:76.8,y:83.4},{x:88.3,y:6.8}]);
 });
 it('non applica la rettifica a record seed divergenti',()=>{
  const db=setup();db.prepare("UPDATE spillo SET descrizione='Descrizione diversa' WHERE id=(SELECT min(id) FROM spillo)").run();
  const prima=db.prepare('SELECT * FROM spillo ORDER BY id LIMIT 1').get();
  expect(rettificaNomiSpilliSeed()).toHaveLength(3);
  expect(db.prepare('SELECT * FROM spillo ORDER BY id LIMIT 1').get()).toEqual(prima);
 });
 it('non sceglie un erede quando due sorgenti condividono la nuova identità',()=>{
  const db=setup();const id=(db.prepare('SELECT id FROM spillo ORDER BY id LIMIT 1').get() as {id:number}).id;
  aggiornaSpillo(id,{mappa:'destinazione',nome:'Personale'});const prima=db.prepare('SELECT * FROM spillo WHERE id=?').get(id);
  const nuovo=pacchetto('dopo');const altro:EsportazioneMappeDto={versione:1,mappe:[nodo('altra-sorgente',[structuredClone(RETTIFICHE_NOMI_SEED[0].dopo)])]};
  importaMappe(nuovo,{origine:'seed',pacchettiSeed:[nuovo,altro]});
  expect(db.prepare('SELECT * FROM spillo WHERE id=?').get(id)).toEqual(prima);
  expect(db.prepare("SELECT count(*) n FROM spillo WHERE mappa_chiave='citta-yongen-jaya'").get()).toEqual({n:2});
 });
 it('non estende la whitelist a una sorgente con contenuto differente',()=>{
  const db=setup();const id=(db.prepare('SELECT id FROM spillo ORDER BY id LIMIT 1').get() as {id:number}).id;
  aggiornaSpillo(id,{mappa:'destinazione'});const nuovo=pacchetto('dopo');nuovo.mappe[0].spilli[0].descrizione='Contenuto nuovo non certificato';
  importaMappe(nuovo,{origine:'seed',pacchettiSeed:[nuovo]});
  expect(db.prepare("SELECT count(*) n FROM spillo WHERE mappa_chiave='citta-yongen-jaya'").get()).toEqual({n:2});
 });
});
