import { closeDb, initDb } from '../../db/dbService.js';
import { runMigrations } from '../../db/migrationRunner.js';
import { importaMappe, esportaMappe, dettaglioMappa, elencaMappe } from './mappeService.js';
import type { EsportazioneMappeDto } from '../../../shared/types.js';
describe('titoli contestuali parzialmente ricostruiti',()=>{
 afterEach(()=>closeDb());
 it('conserva null e identità al roundtrip e al reseed, senza rinominare mappa o genitore',()=>{
  const db=initDb(':memory:');runMigrations(db);
  const base={tipo:'generica' as const,genitore:null,ordine:0,immagine:null,asset:null,larghezza:null,altezza:null,entita:null,note:'',spilli:[]};
  const contesti=[{id:'noto',nome:'Ripostiglio',campo:'F153_004_00',texpack:1},{id:'ignoto',nome:null,campo:'F153_051_00',texpack:2}];
  const p:EsportazioneMappeDto={versione:1,mappe:[{...base,chiave:'padre-verificato',nome:'Palazzo verificato'},{...base,chiave:'risorsa-parziale',nome:'Nome conservato',genitore:'padre-verificato',contesti}]};
  importaMappe(p,{origine:'seed'});
  const prima=db.prepare('SELECT * FROM mappa_presentazione').all();
  importaMappe(p,{origine:'seed'});expect(db.prepare('SELECT * FROM mappa_presentazione').all()).toEqual(prima);
  expect(dettaglioMappa('risorsa-parziale')).toMatchObject({nome:'Nome conservato',genitoreNome:'Palazzo verificato',contesti});
  expect(elencaMappe().find(m=>m.nome==='Nome conservato')?.genitoreNome).toBe('Palazzo verificato');
  const out=esportaMappe('padre-verificato');expect(out.mappe.find(m=>m.nome==='Nome conservato')?.contesti).toEqual(contesti);
  importaMappe(out,{sovrascrivi:true});expect(dettaglioMappa('risorsa-parziale').contesti).toEqual(contesti);
  const stable=db.prepare('SELECT * FROM mappa_presentazione').all();
  for(const invalid of [{...contesti[0],nome:''},{id:'noto',campo:'campo',texpack:1},[contesti[0],contesti[0]]]){
   const c=Array.isArray(invalid)?invalid:[invalid];
   const bad={...p,mappe:[{...p.mappe[1],contesti:c}]} as unknown as EsportazioneMappeDto;
   expect(()=>importaMappe(bad,{sovrascrivi:true})).toThrow();
   expect(db.prepare('SELECT * FROM mappa_presentazione').all()).toEqual(stable);
  }
  expect(db.pragma('foreign_key_check')).toEqual([]);
 });
});
