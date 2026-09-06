import request from 'supertest';
import path from 'node:path';
import {createApp} from '../bootstrap.js';
import {initDb,closeDb,getDb} from '../db/dbService.js';
import {runMigrations} from '../db/migrationRunner.js';
import {caricaSeed} from '../services/seed/caricaSeed.js';
import type {MappaDto,SpilloDto} from '../../shared/types.js';

const app=createApp();
beforeAll(()=>{const db=initDb(':memory:');runMigrations(db);caricaSeed(db,path.resolve(import.meta.dirname,'../../data/seed'));});
afterAll(()=>{closeDb();});

it('risolve Attività e luogo sullo stesso luogo conservando dettagli, condizioni e pacchetti',async()=>{
  const luogo=getDb().prepare("SELECT chiave,quartiere_chiave,cosa_offre,quando FROM luogo WHERE tipo='attivita' LIMIT 1").get() as {chiave:string;quartiere_chiave:string;cosa_offre:string;quando:string|null};
  expect(luogo).toBeTruthy();
  await request(app).post('/api/mappe').send({chiave:'attivita-narrative',nome:'Attività narrative',tipo:'luogo'}).expect(201);
  const partita=(await request(app).post('/api/partite').send({nome:'Verifica attività',fasciaGioco:'giorno'})).body.data.id as number;
  for(const tipo of ['attivita','luogo'] as const){
    const response=await request(app).post('/api/mappe/attivita-narrative/spilli').send({tipo:'attivita',nome:'Interazione '+tipo,x:20,y:30,riferimento:{tipo,chiave:luogo.chiave},condizioni:[{tipo:'fascia',fascia:'sera'}]});
    expect(response.status).toBe(201);
    const s=response.body.data as SpilloDto;
    expect(s.dettaglio).toMatchObject({tipo,luogo:{chiave:luogo.chiave,quartiere:luogo.quartiere_chiave,cosaOffre:luogo.cosa_offre,quando:luogo.quando}});
  }
  const spilli=async()=>((await request(app).get(`/api/mappe/attivita-narrative?partita=${partita}`)).body.data as MappaDto).spilli;
  expect((await spilli()).every(s=>s.disponibilita?.stato==='bloccato')).toBe(true);
  await request(app).put(`/api/partite/${partita}`).send({fasciaGioco:'sera'}).expect(200);
  expect((await spilli()).every(s=>s.disponibilita?.stato==='disponibile')).toBe(true);
  const pacchetto=(await request(app).get('/api/mappe/esporta?radice=attivita-narrative')).body.data;
  expect(pacchetto.mappe[0].spilli.map((s:SpilloDto)=>s.riferimento?.tipo)).toEqual(['attivita','luogo']);
  await request(app).delete('/api/mappe/attivita-narrative').expect(204);
  const imported=await request(app).post('/api/mappe/importa').send({pacchetto});
  expect(imported.status).toBe(200);
  expect(imported.body.data).toMatchObject({mappe:1,spilli:2,saltate:[],condizioniScartate:0});
  expect((await spilli()).map(s=>s.dettaglio?.tipo)).toEqual(['attivita','luogo']);
});
