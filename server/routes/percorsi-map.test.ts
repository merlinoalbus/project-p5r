import request from 'supertest';
import {createApp} from '../bootstrap.js';
import {initDb,closeDb,prepared,getDb} from '../db/dbService.js';
import { caricaPacchetto, regoleAllAvvio } from '../services/pacchetto/pacchettoGioco.js';
const app=createApp();
beforeEach(()=>{const db=initDb(':memory:');caricaPacchetto(db);});afterEach(()=>closeDb());
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
  regoleAllAvvio(getDb());expect((await request(app).get('/api/mappe/'+dopo.chiave)).body.data.nome).toBe('Piano 0');
});
it('rifiuta collisioni e cicli senza modifiche parziali',async()=>{
  const a=await crea('Stanza','shibuya'),b=await crea('Sala','shibuya');
  expect((await request(app).put('/api/mappe/'+b.chiave).send({nome:'Stanza'})).status).toBe(409);
  expect((await request(app).get('/api/mappe/'+b.chiave)).body.data.nome).toBe('Sala');
  expect((await request(app).put('/api/mappe/shibuya').send({genitore:a.chiave})).status).toBe(400);
  expect(prepared('PRAGMA foreign_key_check').all()).toEqual([]);
});
