import { closeDb, initDb } from '../../db/dbService.js';
import { runMigrations } from '../../db/migrationRunner.js';
import { importaMappe, aggiornaSpillo } from './mappeService.js';
import type { EsportazioneMappeDto } from '../../../shared/types.js';
const nodo=(chiave:string,x=20):EsportazioneMappeDto['mappe'][number]=>({chiave,nome:chiave,tipo:'generica',genitore:null,ordine:0,immagine:null,asset:null,larghezza:null,altezza:null,entita:null,note:'',spilli:[{tipo:'nota',nome:'Seed unico',descrizione:'',collezionabile:false,ordine:0,x,y:30,riferimento:null}]});
describe('reseed di spilli trasferiti',()=>{
 afterEach(()=>closeDb());
 it('conserva ID, posizione scelta e dipendenti dopo trasferimento e due ricaricamenti',()=>{
  const db=initDb(':memory:');runMigrations(db);
  const p={versione:1 as const,mappe:[nodo('sorgente'),{...nodo('destinazione'),spilli:[]}]};
  importaMappe(p,{origine:'seed'});
  const id=(db.prepare('SELECT id FROM spillo').get() as {id:number}).id;
  aggiornaSpillo(id,{mappa:'destinazione',x:70,y:80,nome:'Nome personale'});
  const t='2026-09-06';const partita=db.prepare('INSERT INTO partita(nome,created_at,updated_at) VALUES(?,?,?)').run('Prova',t,t).lastInsertRowid;
  db.prepare('INSERT INTO spillo_partita VALUES(?,?,1,?)').run(partita,id,t);
  db.prepare('INSERT INTO spillo_immagine(spillo_id,ordine,asset,didascalia,updated_at) VALUES(?,0,?,?,?)').run(id,'personale','Nota',t);
  db.prepare('INSERT INTO spillo_destinazione (spillo_id,mappa_chiave,x,y,zoom) VALUES(?,?,?,?,?)').run(id,'sorgente',10,20,1);
  const snapshot=()=>['spillo','spillo_partita','spillo_immagine','spillo_destinazione'].map(tabella=>db.prepare('SELECT * FROM '+tabella).all());
  const prima=snapshot();
  importaMappe(p,{origine:'seed',pacchettiSeed:[p]});expect(snapshot()).toEqual(prima);
  importaMappe(p,{origine:'seed',pacchettiSeed:[p]});expect(snapshot()).toEqual(prima);
  expect(db.pragma('foreign_key_check')).toEqual([]);
 });
 it('non sopprime un altro punto con posizione diversa né sorgenti uguali in pacchetti distinti',()=>{
  const db=initDb(':memory:');runMigrations(db);
  const p={versione:1 as const,mappe:[nodo('sorgente'),{...nodo('destinazione'),spilli:[]}]};
  importaMappe(p,{origine:'seed'});const id=(db.prepare('SELECT id FROM spillo').get() as {id:number}).id;
  aggiornaSpillo(id,{mappa:'destinazione',x:70,y:80});
  const diverso={versione:1 as const,mappe:[nodo('altro-punto',21)]};
  importaMappe(diverso,{origine:'seed',pacchettiSeed:[p,diverso]});
  expect(db.prepare("SELECT count(*) n FROM spillo WHERE mappa_chiave='altro-punto'").get()).toEqual({n:1});
  const uguale={versione:1 as const,mappe:[nodo('altra-sorgente')]};
  importaMappe(uguale,{origine:'seed',pacchettiSeed:[p,uguale]});
  expect(db.prepare("SELECT count(*) n FROM spillo WHERE mappa_chiave='altra-sorgente'").get()).toEqual({n:1});
 });
 it('non sceglie un erede quando due righe utente hanno la stessa identità storica',()=>{
  const db=initDb(':memory:');runMigrations(db);
  const p={versione:1 as const,mappe:[nodo('sorgente'),{...nodo('destinazione'),spilli:[]}]};
  importaMappe(p,{origine:'seed'});const id=(db.prepare('SELECT id FROM spillo').get() as {id:number}).id;
  aggiornaSpillo(id,{mappa:'destinazione'});
  db.prepare("INSERT INTO spillo(mappa_chiave,tipo,nome,x,y,origine,updated_at,seed_identita_json) SELECT mappa_chiave,tipo,nome,x,y,origine,updated_at,seed_identita_json FROM spillo WHERE id=?").run(id);
  importaMappe(p,{origine:'seed',pacchettiSeed:[p]});
  expect(db.prepare("SELECT count(*) n FROM spillo WHERE mappa_chiave='sorgente'").get()).toEqual({n:1});
  expect(db.prepare("SELECT count(*) n FROM spillo WHERE origine='utente'").get()).toEqual({n:2});
 });
});

