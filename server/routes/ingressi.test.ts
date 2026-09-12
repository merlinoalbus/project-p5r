import request from 'supertest';
import {createApp} from '../bootstrap.js';
import {initDb,closeDb,getDb} from '../db/dbService.js';
import { caricaPacchetto, regoleAllAvvio } from '../services/pacchetto/pacchettoGioco.js';
const app=createApp();
beforeEach(()=>{const db=initDb(':memory:');caricaPacchetto(db);});afterEach(()=>closeDb());
const url='/api/compendio/citta/shibuya/ingresso';
it('salva ingresso con coordinate anche agli estremi e mantiene destinazione dopo rinomina e reseed',async()=>{
 expect((await request(app).put(url).send({mappa:'shibuya',x:0,y:100,zoom:3})).status).toBe(200);
 await request(app).put('/api/mappe/shibuya').send({nome:'Shibuya Centro'});
 regoleAllAvvio(getDb());
 const q=(await request(app).get('/api/compendio/citta/shibuya')).body.data;
 expect(q.ingresso).toEqual({mappa:'shibuya-centro',nome:'Shibuya Centro',x:0,y:100,zoom:3});expect(q.mappaChiave).toBe('shibuya-centro');
 expect((await request(app).get('/api/compendio/citta')).body.data.find((v:{chiave:string})=>v.chiave==='shibuya').ingresso).toEqual(q.ingresso);
 expect((await request(app).delete(url)).status).toBe(204);expect((await request(app).get('/api/compendio/citta/shibuya')).body.data.ingresso).toBeNull();
});
it('rifiuta valori e riferimenti non validi senza alterare ingresso salvato; eliminare destinazione ripristina il default',async()=>{
 const m=(await request(app).post('/api/mappe').send({nome:'Ingresso test',tipo:'area',genitore:'shibuya'})).body.data;
 await request(app).put(url).send({mappa:m.chiave,x:20,y:35,zoom:2});
 for(const patch of [{x:-1},{y:101},{zoom:8},{x:'20'}])expect((await request(app).put(url).send({mappa:m.chiave,x:20,y:35,zoom:2,...patch})).status).toBe(400);
 expect((await request(app).put(url).send({mappa:'inesistente',x:20,y:35,zoom:2})).status).toBe(404);
 expect((await request(app).get('/api/compendio/citta/shibuya')).body.data.ingresso.x).toBe(20);
 await request(app).delete('/api/mappe/'+m.chiave);expect((await request(app).get('/api/compendio/citta/shibuya')).body.data.ingresso).toBeNull();
});
it('trasporta ingresso con il pacchetto mappe e non sovrascrive una configurazione personale durante il seed',async()=>{
 await request(app).put(url).send({mappa:'shibuya',x:21,y:34,zoom:2.5});
 const pacchetto=(await request(app).get('/api/mappe/esporta?radice=shibuya')).body.data;
 expect(pacchetto.ingressi).toEqual([{quartiere:'shibuya',mappa:'shibuya',x:21,y:34,zoom:2.5}]);
 await request(app).delete(url);
 expect((await request(app).post('/api/mappe/importa').send({pacchetto,sovrascrivi:false})).status).toBe(200);
 expect((await request(app).get('/api/compendio/citta/shibuya')).body.data.ingresso.x).toBe(21);
 const err=await request(app).post('/api/mappe/importa').send({pacchetto:{...pacchetto,ingressi:[{...pacchetto.ingressi[0],y:110}]},sovrascrivi:true});expect(err.status).toBe(400);
 expect((await request(app).get('/api/compendio/citta/shibuya')).body.data.ingresso.y).toBe(34);
});
