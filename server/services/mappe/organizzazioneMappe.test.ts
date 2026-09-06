import request from 'supertest';
import { createApp } from '../../bootstrap.js';
import path from 'node:path';
import { closeDb, initDb } from '../../db/dbService.js';
import { runMigrations } from '../../db/migrationRunner.js';
import { migrations } from '../../db/migrations/index.js';
import { caricaSeed } from '../seed/caricaSeed.js';
import { contenutiMappa, risolviPercorsoMappa } from './contenutiGuidaService.js';
import { riconciliaAreeGuida } from './organizzazioneMappe.js';
import { importaMappe, dettaglioMappa, esportaMappe, mappaPerEntita } from './mappeService.js';
import { risolviAccessoMondo } from './accessoMondoService.js';
const seed=path.resolve(import.meta.dirname,'../../../data/seed');

describe('organizzazione geografica e contenuti guida',()=>{
 afterEach(()=>closeDb());
 it('converte senza perdere ID, stato, schermate, destinazioni e personalizzazioni; non ricrea le aree al reseed',()=>{
  const db=initDb(':memory:');runMigrations(db,migrations.filter(m=>m.id<42));caricaSeed(db,seed);
  const area=db.prepare("SELECT chiave FROM mappa WHERE entita_tipo='area' LIMIT 1").get() as {chiave:string};
  const s=db.prepare('SELECT id FROM spillo WHERE mappa_chiave=? LIMIT 1').get(area.chiave) as {id:number};
  const t='2026-09-06T00:00:00Z';
  const partita=db.prepare('INSERT INTO partita(nome,created_at,updated_at) VALUES(?,?,?)').run('Fixture',t,t).lastInsertRowid;
  db.prepare('INSERT INTO spillo_partita VALUES(?,?,1,?)').run(partita,s.id,t);
  db.prepare('INSERT INTO spillo_immagine(spillo_id,ordine,asset,didascalia,updated_at) VALUES(?,0,?,?,?)').run(s.id,'fixture','Immagine',t);
  db.prepare('INSERT INTO spillo_destinazione VALUES(?,?,?,?,?)').run(s.id,'tokyo',12,34,2);
  db.prepare('UPDATE mappa SET nome=?,note=? WHERE chiave=?').run('Nome personale','Note personali',area.chiave);
  const ids=db.prepare('SELECT id FROM spillo ORDER BY id').all();
  const stati=db.prepare('SELECT * FROM spillo_partita').all(),immagini=db.prepare('SELECT * FROM spillo_immagine').all(),dest=db.prepare('SELECT * FROM spillo_destinazione').all();
  runMigrations(db);
  expect(db.prepare("SELECT count(*) n FROM mappa WHERE entita_tipo='area'").get()).toEqual({n:0});
  expect(db.prepare('SELECT id FROM spillo ORDER BY id').all()).toEqual(ids);
  expect(db.prepare('SELECT * FROM spillo_partita').all()).toEqual(stati);expect(db.prepare('SELECT * FROM spillo_immagine').all()).toEqual(immagini);expect(db.prepare('SELECT * FROM spillo_destinazione').all()).toEqual(dest);
  expect(db.pragma('foreign_key_check')).toEqual([]);
  const r=risolviPercorsoMappa(area.chiave);expect(r.tipo).toBe('guida');
  if(r.tipo!=='guida')throw new Error('Guida non risolta');
  const contenuti=contenutiMappa(r.mappaPalazzo);const a=contenuti.aree.find(a=>a.chiave===area.chiave)!;
  expect(a.nome).toBe('Nome personale');expect(a.note).toBe('Note personali');expect(a.punti.some(p=>p.id===s.id)).toBe(true);expect(a.punti.every(p=>!('x' in p)&&!('y' in p))).toBe(true);
  expect(risolviAccessoMondo('area',area.chiave).guide?.[0].area).toBe(area.chiave);
  caricaSeed(db,seed);
  expect(db.prepare("SELECT count(*) n FROM mappa WHERE entita_tipo='area'").get()).toEqual({n:0});
  expect(db.prepare('SELECT * FROM spillo_partita').all()).toEqual(stati);
  expect(contenutiMappa(r.mappaPalazzo).aree.find(a=>a.chiave===area.chiave)?.nome).toBe('Nome personale');
  expect(riconciliaAreeGuida(db).convertite).toEqual([]);
 });
 it('rifiuta conversioni che perderebbero una vera immagine o un arrivo configurato',()=>{
  const db=initDb(':memory:');runMigrations(db,migrations.filter(m=>m.id<42));caricaSeed(db,seed);
  const aree=db.prepare("SELECT chiave FROM mappa WHERE entita_tipo='area' LIMIT 2").all() as Array<{chiave:string}>;
  db.prepare('UPDATE mappa SET asset=? WHERE chiave=?').run('pianta-personale',aree[0].chiave);
  const s=db.prepare('SELECT id FROM spillo LIMIT 1').get() as {id:number};
  db.prepare('INSERT INTO spillo_destinazione VALUES(?,?,?,?,?)').run(s.id,aree[1].chiave,20,40,2);
  runMigrations(db);
  for(const a of aree)expect(db.prepare('SELECT 1 FROM mappa WHERE chiave=?').get(a.chiave)).toBeTruthy();
  expect(db.prepare('SELECT mappa_chiave FROM spillo_destinazione WHERE spillo_id=?').get(s.id)).toEqual({mappa_chiave:aree[1].chiave});
  expect(db.pragma('foreign_key_check')).toEqual([]);
 });
 it('una nuova installazione conserva le sezioni senza creare false planimetrie',()=>{
  const db=initDb(':memory:');runMigrations(db);caricaSeed(db,seed);
  const n=db.prepare('SELECT count(*) n FROM dungeon_area').get();
  expect(db.prepare('SELECT count(*) n FROM guida_mappa').get()).toEqual(n);
  expect(db.prepare("SELECT count(*) n FROM mappa WHERE entita_tipo='area'").get()).toEqual({n:0});
  expect(db.prepare('SELECT count(*) n FROM spillo WHERE area_guida_chiave IS NOT NULL').get()).toEqual({n:187});
  const d=db.prepare('SELECT chiave FROM dungeon').all() as Array<{chiave:string}>;
  expect(d.reduce((n,d)=>n+contenutiMappa('dungeon-'+d.chiave).aree.reduce((n,a)=>n+a.punti.length,0),0)).toBe(688);
 });
 it('ricaricare il pacchetto base invariato dopo nuove mappe conserva ID e dipendenti dei vecchi pacchetti',()=>{
  const db=initDb(':memory:');runMigrations(db);caricaSeed(db,seed);
  const t='2026-09-06T00:00:00Z';
  const pacchetto={versione:1 as const,mappe:[{chiave:'fixture-reseed',nome:'Fixture reseed',tipo:'generica' as const,genitore:null,ordine:0,immagine:null,asset:null,larghezza:null,altezza:null,entita:null,note:'',spilli:[{tipo:'nota' as const,nome:'Nota del seed',descrizione:'',x:20,y:30,riferimento:null,collezionabile:false,ordine:0}]}]};
  importaMappe(pacchetto,{origine:'seed'});
  const id=(db.prepare("SELECT id FROM spillo WHERE nome='Nota del seed'").get() as {id:number}).id;
  const partita=db.prepare('INSERT INTO partita(nome,created_at,updated_at) VALUES(?,?,?)').run('Reseed',t,t).lastInsertRowid;
  db.prepare('INSERT INTO spillo_partita VALUES(?,?,1,?)').run(partita,id,t);
  db.prepare('INSERT INTO spillo_immagine(spillo_id,ordine,asset,didascalia,updated_at) VALUES(?,0,?,?,?)').run(id,'mia-schermata','Personale',t);
  db.prepare('INSERT INTO spillo_destinazione VALUES(?,?,?,?,?)').run(id,'tokyo',1,2,3);
  const prima={s:db.prepare('SELECT * FROM spillo WHERE id=?').get(id),stato:db.prepare('SELECT * FROM spillo_partita').all(),immagini:db.prepare('SELECT * FROM spillo_immagine').all(),dest:db.prepare('SELECT * FROM spillo_destinazione').all()};
  importaMappe(pacchetto,{origine:'seed'});
  expect(db.prepare('SELECT * FROM spillo WHERE id=?').get(id)).toEqual(prima.s);
  expect(db.prepare('SELECT * FROM spillo_partita').all()).toEqual(prima.stato);expect(db.prepare('SELECT * FROM spillo_immagine').all()).toEqual(prima.immagini);expect(db.prepare('SELECT * FROM spillo_destinazione').all()).toEqual(prima.dest);
  expect(db.pragma('foreign_key_check')).toEqual([]);
 });

 it('conserva contesti nominali e gruppi immagini senza scegliere un contesto, e non sceglie la prima associazione multipla',()=>{
  const db=initDb(':memory:');runMigrations(db);caricaSeed(db,seed);
  const nodo={chiave:'contesti-fixture',nome:'Contesti fixture',tipo:'generica' as const,genitore:null,ordine:0,immagine:null,asset:null,larghezza:null,altezza:null,entita:null,note:'',spilli:[],contesti:[{id:'campo-a',nome:'Nome A',campo:'F001_001_00',texpack:1},{id:'campo-b',nome:'Nome B',campo:'F001_002_00',texpack:2}],gruppoImmagini:{id:'gruppo-fixture',nome:'Gruppo fixture',ordine:0}};
  importaMappe({versione:1,mappe:[nodo]});
  expect(dettaglioMappa(nodo.chiave)).toMatchObject({nome:nodo.nome,contesti:nodo.contesti,gruppoImmagini:nodo.gruppoImmagini});
  expect(esportaMappe(nodo.chiave).mappe[0]).toMatchObject({contesti:nodo.contesti,gruppoImmagini:nodo.gruppoImmagini});
  const a=(db.prepare('SELECT chiave FROM dungeon_area LIMIT 1').get() as {chiave:string}).chiave;
  db.prepare('INSERT INTO mappa_entita VALUES(?,?,?,?)').run('tokyo','area',a,'{"fixture":true}');
  db.prepare('INSERT INTO mappa_entita VALUES(?,?,?,?)').run(nodo.chiave,'area',a,'{"fixture":true}');
  expect(mappaPerEntita('area',a)).toBeNull();
  expect(risolviAccessoMondo('area',a).destinazioni).toHaveLength(2);
  expect(()=>importaMappe({versione:1,mappe:[{...nodo,contesti:[nodo.contesti[0],nodo.contesti[0]]}]},{sovrascrivi:true})).toThrow();
  expect(dettaglioMappa(nodo.chiave).contesti).toEqual(nodo.contesti);
 });

 it('API guida mantiene immagini, condizioni e stato modificabili sullo stesso ID senza esporre coordinate',async()=>{
  const db=initDb(':memory:');runMigrations(db);caricaSeed(db,seed);const app=createApp();
  const old=db.prepare("SELECT s.* FROM spillo s WHERE area_guida_chiave IS NOT NULL AND ruolo_guida='punto' LIMIT 1").get() as {id:number;area_guida_chiave:string;x:number;y:number};
  const t='2026-09-06T00:00:00Z';const partita=Number(db.prepare("INSERT INTO partita(nome,data_gioco,created_at,updated_at) VALUES('Guida','04-09',?,?)").run(t,t).lastInsertRowid);
  const image=Number(db.prepare("INSERT INTO spillo_immagine(spillo_id,ordine,asset,didascalia,updated_at) VALUES(?,0,'fixture-immagine','Prima',?)").run(old.id,t).lastInsertRowid);
  const modified=await request(app).put('/api/mappe/spilli/'+old.id).send({nome:'Nome editoriale',descrizione:'Descrizione conservata',condizioni:[{tipo:'data',dal:'04-10'}]});
  expect(modified.status).toBe(200);expect(modified.body.data).toMatchObject({id:old.id,areaGuida:old.area_guida_chiave,nome:'Nome editoriale'});
  for(const k of ['x','y','mappaChiave','destinazione','destinazioneNonDisponibile'])expect(modified.body.data).not.toHaveProperty(k);
  const raccolto=await request(app).put(`/api/partite/${partita}/spilli/${old.id}`).send({raccolto:true});expect(raccolto.status).toBe(200);expect(raccolto.body.data.raccolto).toBe(true);
  expect((await request(app).put('/api/mappe/spilli/immagini/'+image).send({didascalia:'Dopo'})).status).toBe(200);
  const dest=risolviPercorsoMappa(old.area_guida_chiave);if(dest.tipo!=='guida')throw new Error('Destinazione errata');
  const url='/api/mappe/contenuti/'+encodeURIComponent(dest.mappaPalazzo);
  const scheda=(await request(app).get(url+'?partita='+partita)).body.data.aree.find((a:{chiave:string})=>a.chiave===old.area_guida_chiave).punti.find((p:{id:number})=>p.id===old.id).scheda;
  expect(scheda.raccolto).toBe(true);expect(scheda.condizioni[0]).toMatchObject({tipo:'data',dal:'04-10'});expect(scheda.disponibilita.stato).toBe('bloccato');expect(scheda.immagini[0]).toMatchObject({id:image,asset:'fixture-immagine',didascalia:'Dopo'});
  db.prepare("UPDATE partita SET data_gioco='04-11' WHERE id=?").run(partita);
  const dopo=contenutiMappa(dest.mappaPalazzo,partita).aree.find(a=>a.chiave===old.area_guida_chiave)!.punti.find(p=>p.id===old.id)!.scheda!;
  expect(dopo.disponibilita?.stato).toBe('disponibile');
  for(const payload of [{x:1},{y:1},{mappa:'tokyo'},{destinazione:{mappa:'tokyo',x:1,y:2,zoom:1}}])expect((await request(app).put('/api/mappe/spilli/'+old.id).send(payload)).status).toBe(400);
  expect(db.prepare('SELECT mappa_chiave,area_guida_chiave,x,y FROM spillo WHERE id=?').get(old.id)).toEqual({mappa_chiave:null,area_guida_chiave:old.area_guida_chiave,x:old.x,y:old.y});
  expect((await request(app).get(url+'?partita=nonvalida')).status).toBe(400);
  expect(contenutiMappa(dest.mappaPalazzo).aree.find(a=>a.chiave===old.area_guida_chiave)!.punti.find(p=>p.id===old.id)!.scheda!.raccolto).toBe(false);
 });

 it('mantiene consultabili e modificabili anche i dettagli personalizzati dei vecchi collegamenti editoriali',()=>{
  const db=initDb(':memory:');runMigrations(db,migrations.filter(m=>m.id<42));caricaSeed(db,seed);
  const link=db.prepare("SELECT s.id,s.riferimento_chiave area FROM spillo s JOIN dungeon_area a ON a.chiave=s.riferimento_chiave WHERE s.riferimento_tipo='mappa' LIMIT 1").get() as {id:number;area:string};
  db.prepare("UPDATE spillo SET nome='Il mio riepilogo',descrizione='Nota del collegamento',origine='utente' WHERE id=?").run(link.id);
  db.prepare("INSERT INTO spillo_immagine(spillo_id,ordine,asset,didascalia,updated_at) VALUES(?,0,'link-personale','Appunto','fixture')").run(link.id);
  runMigrations(db);const d=risolviPercorsoMappa(link.area);if(d.tipo!=='guida')throw new Error('Guida assente');
  const elemento=contenutiMappa(d.mappaPalazzo).aree.find(a=>a.chiave===link.area)!.collegamenti!.find(s=>s.id===link.id)!;
  expect(elemento).toMatchObject({id:link.id,nome:'Il mio riepilogo',descrizione:'Nota del collegamento',areaGuida:link.area});expect(elemento.immagini[0].asset).toBe('link-personale');
  for(const k of ['x','y','mappaChiave','destinazione'])expect(elemento).not.toHaveProperty(k);
 });

});
