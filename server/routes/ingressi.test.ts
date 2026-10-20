// ============================================================
// ingressi.test.ts — ingresso di un quartiere sulla mappa: salvataggio e validazione delle coordinate, rinomina e reseed, ripristino alla rimozione, trasporto nel pacchetto mappe
// ============================================================

import request from 'supertest';
import {createApp} from '../bootstrap.js';
import {closeDb,getDb} from '../db/dbService.js';
import { regoleAllAvvio } from '../services/pacchetto/pacchettoGioco.js';
import { dbDiProva } from '../../test/dbDiProva.js';
const app=createApp();
beforeEach(()=>{dbDiProva();});afterEach(()=>closeDb());
const url='/api/compendio/citta/shibuya/ingresso';
// L2: l'ingresso sta in un'Area del quartiere (Central Street per Shibuya); la mappa del quartiere non è più un ingresso (400)
it('salva ingresso con coordinate anche agli estremi e mantiene destinazione dopo rinomina e reseed',async()=>{
 expect((await request(app).put(url).send({mappa:'shibuya',x:0,y:100,zoom:3})).body.error.code).toBe('ingresso-senza-area');
 expect((await request(app).put(url).send({area:'central-street',x:0,y:100,zoom:3})).status).toBe(200);
 await request(app).put('/api/mappe/shibuya-central-street').send({nome:'Central Street Est'});
 regoleAllAvvio(getDb());
 const q=(await request(app).get('/api/compendio/citta/shibuya')).body.data;
 expect(q.ingresso).toEqual({mappa:'shibuya-central-street-est',nome:'Shibuya › Central Street Est',x:0,y:100,zoom:3,area:{slug:'central-street',nome:'Central Street'}});
 expect((await request(app).get('/api/compendio/citta')).body.data.find((v:{chiave:string})=>v.chiave==='shibuya').ingresso).toEqual(q.ingresso);
 expect((await request(app).delete(url)).status).toBe(204);expect((await request(app).get('/api/compendio/citta/shibuya')).body.data.ingresso).toBeNull();
});
it('rifiuta valori e riferimenti non validi senza alterare ingresso salvato; eliminare destinazione ripristina il default',async()=>{
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==','base64');
 const area=(await request(app).post('/api/aree/citta/shibuya/central-street/planimetrie?etichetta=prova').set('Content-Type','image/png').send(png).expect(201)).body.data;
 const m=area.planimetrie.find((p:{etichetta:string|null})=>p.etichetta==='prova');
 await request(app).put(url).send({mappa:m.chiave,x:20,y:35,zoom:2});
 for(const patch of [{x:-1},{y:101},{zoom:8},{x:'20'}])expect((await request(app).put(url).send({mappa:m.chiave,x:20,y:35,zoom:2,...patch})).status).toBe(400);
 expect((await request(app).put(url).send({mappa:'inesistente',x:20,y:35,zoom:2})).status).toBe(404);
 expect((await request(app).get('/api/compendio/citta/shibuya')).body.data.ingresso.x).toBe(20);
 // la planimetria dell'ingresso si elimina con la conferma, e l'ingresso se ne va con lei
 expect((await request(app).delete('/api/mappe/'+m.chiave)).body.error.code).toBe('planimetria-d-ingresso');
 await request(app).delete('/api/mappe/'+m.chiave+'?conferma=1').expect(204);expect((await request(app).get('/api/compendio/citta/shibuya')).body.data.ingresso).toBeNull();
});
it('trasporta ingresso con il pacchetto mappe e non sovrascrive una configurazione personale durante il seed',async()=>{
 await request(app).put(url).send({area:'central-street',x:21,y:34,zoom:2.5});
 const pacchetto=(await request(app).get('/api/mappe/esporta?radice=shibuya')).body.data;
 expect(pacchetto.ingressi).toEqual([{quartiere:'shibuya',mappa:'shibuya-central-street',x:21,y:34,zoom:2.5,area:'citta/shibuya/central-street'}]);
 await request(app).delete(url);
 expect((await request(app).post('/api/mappe/importa').send({pacchetto,sovrascrivi:false})).status).toBe(200);
 expect((await request(app).get('/api/compendio/citta/shibuya')).body.data.ingresso.x).toBe(21);
 const err=await request(app).post('/api/mappe/importa').send({pacchetto:{...pacchetto,ingressi:[{...pacchetto.ingressi[0],y:110}]},sovrascrivi:true});expect(err.status).toBe(400);
 expect((await request(app).get('/api/compendio/citta/shibuya')).body.data.ingresso.y).toBe(34);
});
