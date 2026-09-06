import { calcolaCollezioniImmagini } from './collezioniImmagini.js';
import { closeDb, initDb } from '../../db/dbService.js';
import { runMigrations } from '../../db/migrationRunner.js';
import { importaMappe, elencaMappe, dettaglioMappa } from './mappeService.js';
import type { EsportazioneMappeDto } from '../../../shared/types.js';
describe('collezioni presentative globali',()=>{
 afterEach(()=>closeDb());
 it('ordina con chiave stabile, separa genitori e non include contenitori o gruppi geografici',()=>{
  const r={nome:'Sala',ordine:1,genitore:'palazzo',fisica:true};
  const rows=[{...r,chiave:'b'},{...r,chiave:'a'},{...r,chiave:'altro',genitore:'altro-palazzo'},{...r,chiave:'contenitore',fisica:false},{...r,chiave:'esplicito',gruppoImmagini:{id:'gruppo',nome:'Sala',ordine:0}}];
  const a=calcolaCollezioniImmagini(rows),b=calcolaCollezioniImmagini([...rows].reverse());
  expect(a.get('a')).toMatchObject({indice:1,totale:2});expect(a.get('b')).toMatchObject({indice:2,totale:2});expect(a.get('a')?.ambito).toBe(a.get('b')?.ambito);
  for(const [k,v]of a)expect(b.get(k)).toEqual(v);expect(a.size).toBe(2);
  expect(a.get('a')).not.toHaveProperty('genitore');expect(a.get('a')).not.toHaveProperty('piano');
 });
 it('normalizza le alternative contestuali senza dipendere dalla selezione o ordine dei contesti',()=>{
  const r={nome:'tecnico',ordine:0,genitore:'p',fisica:true};const c=[{id:'a',nome:'Sala A',campo:'A',texpack:1},{id:'b',nome:'Sala B',campo:'B',texpack:2}];
  const out=calcolaCollezioniImmagini([{...r,chiave:'a',contesti:c},{...r,chiave:'b',contesti:[...c].reverse()}]);
  expect(out.get('a')?.totale).toBe(2);expect(out.get('a')?.ambito).toBe(out.get('b')?.ambito);
 });
 it('dettaglio isolato e sottoinsieme dell’albero conservano indice e totale globali senza toccare nomi o relazioni',()=>{
  const db=initDb(':memory:');runMigrations(db);
  const node={nome:'Sala',tipo:'generica' as const,genitore:null,ordine:1,immagine:null,asset:'fixture/pianta',larghezza:100,altezza:100,entita:null,note:'',spilli:[]};
  const p:EsportazioneMappeDto={versione:1,mappe:[{...node,chiave:'nativo-rmap-998-1-1'},{...node,chiave:'nativo-rmap-998-1-0'},{...node,chiave:'nativo-rmap-998-1-2',asset:'mappe/citta-ikebukuro'}]};
  importaMappe(p,{origine:'seed'});const before=db.prepare('SELECT * FROM mappa ORDER BY chiave').all();
  const all=elencaMappe();const one=all.find(m=>m.chiave.endsWith('-b'))??all.find(m=>m.immagineCollezione?.indice===2)!;
  expect(one.immagineCollezione).toMatchObject({indice:2,totale:2});
  expect(dettaglioMappa(one.chiave).immagineCollezione).toEqual(one.immagineCollezione);
  expect(all.filter(m=>m.chiave===one.chiave)[0].immagineCollezione?.totale).toBe(2);
  expect(all.find(m=>m.assetOriginale==='mappe/citta-ikebukuro')?.immagineCollezione).toBeUndefined();
  expect(db.prepare('SELECT * FROM mappa ORDER BY chiave').all()).toEqual(before);
 });
});


