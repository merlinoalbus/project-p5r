import request from 'supertest';
import path from 'node:path';
import {createApp} from '../bootstrap.js';
import {initDb,closeDb,prepared,getDb} from '../db/dbService.js';
import {runMigrations} from '../db/migrationRunner.js';
import {caricaSeed} from '../services/seed/caricaSeed.js';
import {leggiZip} from '../utils/zip.js';
const app=createApp();const seed=path.resolve(import.meta.dirname,'../../data/seed');
beforeEach(()=>{const db=initDb(':memory:');runMigrations(db);caricaSeed(db,seed);});afterEach(()=>closeDb());
const crea=async(nome:string,genitore:string)=>{const r=await request(app).post('/api/mappe').send({nome,tipo:'area',genitore});expect(r.status).toBe(201);return r.body.data;};
it('deriva chiave e asset da tutta la gerarchia, preservando i nomi naturali',async()=>{
  const castello=await crea('Castello Imperiale','shibuya');const piano=await crea('Piano 0',castello.chiave);
  expect(castello.chiave).toBe('shibuya-castello-imperiale');expect(piano.chiave).toBe('shibuya-castello-imperiale-piano-0');
  expect(piano.asset).toBe('mappe/shibuya-castello-imperiale-piano-0');expect(piano.nome).toBe('Piano 0');
  const ricerca=(await request(app).get('/api/mappe/riferimenti?tipo=mappa&q=Shibuya%20Piano')).body.data;
  expect(ricerca).toContainEqual(expect.objectContaining({chiave:piano.chiave,nome:'Shibuya › Castello Imperiale › Piano 0'}));
});
it('rinomina e sposta un sottoalbero mantenendo pin, progressi e vecchie URL',async()=>{
  const a=await crea('Castello Imperiale','shibuya'),b=await crea('Piano 0',a.chiave);
  const s=(await request(app).post('/api/mappe/'+b.chiave+'/spilli').send({tipo:'forziere',nome:'Tesoro',x:10,y:20})).body.data;
  // un consumabile non si collega a una mappa: la risoluzione dell'alias si prova su uno spostamento
  const scala=(await request(app).post('/api/mappe/'+b.chiave+'/spilli').send({tipo:'scala',nome:'Scala',x:90,y:90})).body.data;
  const p=(await request(app).post('/api/partite').send({nome:'Progressi'})).body.data;
  await request(app).put('/api/partite/'+p.id+'/spilli/'+s.id).send({raccolto:true});
  await request(app).post('/api/mappe/shibuya/passaggi').send({destinazione:b.chiave});
  const r=await request(app).put('/api/mappe/'+a.chiave).send({nome:'Palazzo Imperiale',genitore:'shinjuku'});expect(r.status).toBe(200);
  expect(r.body.data.chiave).toBe('shinjuku-palazzo-imperiale');
  const dopo=(await request(app).get('/api/mappe/'+b.chiave+'?partita='+p.id)).body.data;
  const aggiornato=await request(app).put('/api/mappe/spilli/'+scala.id).send({nome:'Scala rinominata',riferimento:{tipo:'mappa',chiave:dopo.chiave}});
  expect(aggiornato.status).toBe(200);expect(aggiornato.body.data.riferimento.chiave).toBe(dopo.chiave);
  expect(dopo.chiave).toBe('shinjuku-palazzo-imperiale-piano-0');expect(dopo.spilli.find((x:{id:number})=>x.id===s.id)).toMatchObject({id:s.id,raccolto:true});
  expect((await request(app).get('/api/mappe/shibuya')).body.data.spilli).toContainEqual(expect.objectContaining({riferimento:{tipo:'mappa',chiave:dopo.chiave}}));
  caricaSeed(getDb(),seed);expect((await request(app).get('/api/mappe/'+dopo.chiave)).body.data.nome).toBe('Piano 0');
});
it('rifiuta collisioni e cicli senza modifiche parziali',async()=>{
  const a=await crea('Stanza','shibuya'),b=await crea('Sala','shibuya');
  expect((await request(app).put('/api/mappe/'+b.chiave).send({nome:'Stanza'})).status).toBe(409);
  expect((await request(app).get('/api/mappe/'+b.chiave)).body.data.nome).toBe('Sala');
  expect((await request(app).put('/api/mappe/shibuya').send({genitore:a.chiave})).status).toBe(400);
  expect(prepared('PRAGMA foreign_key_check').all()).toEqual([]);
});
it('esporta le immagini del repository con il percorso attuale anche dopo una rinomina',async()=>{
  await request(app).put('/api/mappe/shibuya').send({nome:'Shibuya Centro'});
  const r=await request(app).get('/api/mappe/esporta.zip?radice=shibuya-centro').buffer(true).parse((res,cb)=>{const v:Buffer[]=[];res.on('data',(b:Buffer)=>v.push(b));res.on('end',()=>cb(null,Buffer.concat(v)));});
  expect(r.status).toBe(200);const zip=leggiZip(r.body as Buffer);
  expect(zip.map(v=>v.nome)).toContain('public/asset/mappe/shibuya-centro.png');
  const json=JSON.parse(zip.find(v=>v.nome==='data/seed/mappe/shibuya-centro.json')!.contenuto.toString());
  expect(json.mappe.find((m: {chiave:string})=>m.chiave==='shibuya-centro').asset).toBe('mappe/shibuya-centro');
  expect(zip.find(v=>v.nome==='public/asset/mappe/shibuya-centro.png')!.contenuto.length).toBeGreaterThan(1000);
});
