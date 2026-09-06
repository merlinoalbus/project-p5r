import request from 'supertest';
import {createApp} from '../bootstrap.js';
import {initDb,closeDb,getDb} from '../db/dbService.js';
import {runMigrations} from '../db/migrationRunner.js';
import {TIPI_SPILLO} from '../../shared/spilli.js';
import type {EsportazioneMappeDto} from '../../shared/types.js';

const app=createApp();
beforeEach(async()=>{
  runMigrations(initDb(':memory:'));
  for(const [chiave,nome] of [['partenza','Partenza'],['arrivo','Sala di arrivo']]){
    await request(app).post('/api/mappe').send({chiave,nome,tipo:'luogo'}).expect(201);
  }
});
afterEach(()=>closeDb());
const crea=(extra:Record<string,unknown>={})=>request(app).post('/api/mappe/partenza/spilli').send({tipo:'passaggio',nome:'Attraversamento',x:10,y:20,...extra});
const destinazione={mappa:'arrivo',x:0,y:100,zoom:2};
const leggi=async(id:number)=>(await request(app).get('/api/mappe/partenza')).body.data.spilli.find((s:{id:number})=>s.id===id);

it('tutti i tipi conservano destinazione indipendente dal riferimento, anche nella stessa mappa',async()=>{
  for(const tipo of TIPI_SPILLO){
    const r=await crea({tipo,riferimento:{tipo:'mappa',chiave:'partenza'},destinazione});
    expect(r.status).toBe(201);
    expect(r.body.data).toMatchObject({tipo,riferimento:{tipo:'mappa',chiave:'partenza'},destinazione:{...destinazione,mappa:'sala-di-arrivo'},destinazioneNonDisponibile:false});
  }
  const r=await crea({tipo:'rampino',destinazione:{...destinazione,mappa:'partenza'}});
  expect(r.status).toBe(201);
  expect(r.body.data.destinazione.mappa).toBe('partenza');
  expect((await request(app).get('/api/mappe/arrivo')).body.data.spilli).toHaveLength(0);
});

it('conserva arrivo su patch omessa, risolve rinomina e alias, distingue rimozione esplicita',async()=>{
  const id=(await crea({destinazione})).body.data.id;
  await request(app).put('/api/mappe/arrivo').send({nome:'Nuovo arrivo'}).expect(200);
  const changed=await request(app).put(`/api/mappe/spilli/${id}`).send({nome:'Nuovo nome'});
  expect(changed.body.data.destinazione).toEqual({...destinazione,mappa:'nuovo-arrivo'});
  await request(app).put(`/api/mappe/spilli/${id}`).send({destinazione:{...destinazione,mappa:'sala-di-arrivo'}}).expect(200);
  expect((await leggi(id)).destinazione.mappa).toBe('nuovo-arrivo');
  await request(app).put(`/api/mappe/spilli/${id}`).send({destinazione:null}).expect(200);
  expect(await leggi(id)).toMatchObject({destinazione:null,destinazioneNonDisponibile:false});
});

it('eliminando arrivo conserva pin, tipo e scheda ma segnala il percorso invalidato',async()=>{
  const id=(await crea({tipo:'attivita',riferimento:{tipo:'mappa',chiave:'partenza'},destinazione})).body.data.id;
  await request(app).delete('/api/mappe/arrivo').expect(204);
  expect(await leggi(id)).toMatchObject({tipo:'attivita',destinazione:null,destinazioneNonDisponibile:true,riferimento:{tipo:'mappa',chiave:'partenza'}});
  const pacchetto=(await request(app).get('/api/mappe/esporta?radice=partenza')).body.data;
  expect(pacchetto.mappe[0].spilli[0].destinazioneNonDisponibile).toBe(true);
  await request(app).delete('/api/mappe/partenza').expect(204);
  await request(app).post('/api/mappe/importa').send({pacchetto}).expect(200);
  expect((await request(app).get('/api/mappe/partenza')).body.data.spilli[0].destinazioneNonDisponibile).toBe(true);
});

it('coordinate incomplete, fuori intervallo e mappe assenti non producono modifiche parziali',async()=>{
  const id=(await crea({destinazione})).body.data.id;
  for(const invalid of [{mappa:'arrivo',x:0,y:0},{...destinazione,x:-1},{...destinazione,y:101},{...destinazione,zoom:7},{...destinazione,mappa:'assente'}]){
    const r=await request(app).put(`/api/mappe/spilli/${id}`).send({nome:'Non deve cambiare',destinazione:invalid});
    expect([400,404]).toContain(r.status);
    expect((await leggi(id)).nome).toBe('Attraversamento');
    expect((await leggi(id)).destinazione).toEqual({...destinazione,mappa:'sala-di-arrivo'});
  }
});

it('importa arrivi a mappe successive nel pacchetto e mantiene roundtrip dopo rinomina',async()=>{
  await crea({tipo:'treno',destinazione});
  await request(app).put('/api/mappe/arrivo').send({nome:'Stazione nuova'}).expect(200);
  const pacchetto=(await request(app).get('/api/mappe/esporta')).body.data as EsportazioneMappeDto;
  pacchetto.mappe=pacchetto.mappe.filter(m=>['partenza','arrivo'].includes(m.chiave)).sort((a)=>a.chiave==='partenza'?-1:1);
  expect(pacchetto.mappe[0].spilli[0].destinazione?.mappa).toBe('arrivo');
  await request(app).delete('/api/mappe/partenza').expect(204);
  await request(app).delete('/api/mappe/arrivo').expect(204);
  const r=await request(app).post('/api/mappe/importa').send({pacchetto});
  expect(r.status).toBe(200);
  expect(r.body.data).toMatchObject({mappe:2,spilli:1,saltate:[]});
  expect((await request(app).get('/api/mappe/partenza')).body.data.spilli[0].destinazione).toEqual({...destinazione,mappa:'stazione-nuova'});
});

it('rifiuta un pacchetto con destinazione non valida prima di inserire mappe',async()=>{
  const before=(getDb().prepare('SELECT COUNT(*) AS n FROM mappa').get() as {n:number}).n;
  const pacchetto={versione:1,mappe:[{chiave:'nuova',nome:'Nuova',tipo:'luogo',spilli:[{tipo:'rampino',nome:'Salto',x:10,y:10,destinazione:{...destinazione,mappa:'inesistente'}}]}]};
  const r=await request(app).post('/api/mappe/importa').send({pacchetto});
  expect(r.status).toBe(404);
  expect((getDb().prepare('SELECT COUNT(*) AS n FROM mappa').get() as {n:number}).n).toBe(before);
});
