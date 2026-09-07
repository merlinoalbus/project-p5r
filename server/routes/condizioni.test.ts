import request from 'supertest';
import path from 'node:path';
import {createApp} from '../bootstrap.js';
import {initDb,closeDb,prepared} from '../db/dbService.js';
import {runMigrations} from '../db/migrationRunner.js';
import {caricaSeed} from '../services/seed/caricaSeed.js';
import {valutaRequisiti,statoDisponibilitaPartita} from '../services/disponibilitaService.js';
import {descriviRequisitoSpillo,normalizzaRequisitoSpillo,type RequisitoSpillo} from '../../shared/condizioniSpillo.js';
import {migraTestiCondizioni} from '../../shared/migraCondizioni.js';
const app=createApp();let partita:number;
beforeEach(async()=>{const db=initDb(':memory:');runMigrations(db);caricaSeed(db,path.resolve(import.meta.dirname,'../../data/seed'));partita=(await request(app).post('/api/partite').send({nome:'Regole'})).body.data.id;});
afterEach(()=>closeDb());
const valuta=(r:RequisitoSpillo[])=>valutaRequisiti(r.map(c=>({...c,testo:descriviRequisitoSpillo(c)})),statoDisponibilitaPartita(partita));
it('gruppi AND/OR e blocco prioritario mantengono ignoto quando manca lo stato',async()=>{
  const f=(await request(app).post('/api/condizioni/stati').send({nome:'Pesca effettuata',categoria:'attivita'})).body.data;
  const r:RequisitoSpillo={tipo:'stato',chiave:f.chiave,confronto:'almeno',valore:1};
  const si:RequisitoSpillo={tipo:'dote',dote:'coraggio',rango:1};
  expect(valuta([r]).stato).toBe('ignoto');
  expect(valuta([{tipo:'gruppo',modo:'almeno-una',condizioni:[si,r]}]).stato).toBe('disponibile');
  expect(valuta([{tipo:'gruppo',modo:'tutte',condizioni:[si,r]}]).stato).toBe('ignoto');
  expect(valuta([r,{tipo:'non',condizione:si}]).stato).toBe('bloccato');
  expect((await request(app).put(`/api/condizioni/partite/${partita}/${f.chiave}`).send({valore:1})).status).toBe(200);
  expect(valuta([r]).stato).toBe('disponibile');
  const altra=(await request(app).post('/api/partite').send({nome:'Altra'})).body.data.id;
  expect((await request(app).get(`/api/condizioni/partite/${altra}`)).body.data[0].valore).toBeNull();
  await request(app).put(`/api/condizioni/partite/${partita}/${f.chiave}`).send({valore:0});expect(valuta([r]).stato).toBe('bloccato');
});
it('un negozio bloccato resta consultabile ma non permette acquisti',async()=>{
  const n=(await request(app).post('/api/catalogo/negozio').send({nome:'Negozio test',condizioni_json:[{tipo:'dote',dote:'coraggio',rango:5}]})).body.data;
  const a=(await request(app).post('/api/catalogo/articolo').send({nome:'Prodotto test',negozio_chiave:n.chiave,condizioni_json:[]})).body.data;
  const elenco=(await request(app).get(`/api/compendio/negozi?partita=${partita}`)).body.data;
  const scheda=await request(app).get(`/api/compendio/negozi/${n.chiave}?partita=${partita}`);
  const ricerca=(await request(app).get(`/api/compendio/articoli?q=Prodotto%20test&partita=${partita}`)).body.data;
  expect(elenco.find((x:{chiave:string})=>x.chiave===n.chiave)).toMatchObject({disponibilita:{stato:'bloccato'}});
  expect(scheda.status).toBe(200);
  expect(scheda.body.data).toMatchObject({chiave:n.chiave,disponibilita:{stato:'bloccato'}});
  expect(ricerca).toMatchObject({totale:1,articoli:[{chiave:a.chiave,disponibilita:{stato:'bloccato'}}]});
  const acquisto=await request(app).put(`/api/partite/${partita}/acquisti`).send({articolo:a.chiave,fatto:true});
  expect(acquisto.status).toBe(409);
  expect(acquisto.body.error?.code).toBe('articolo-non-disponibile');
  expect((await request(app).put(`/api/catalogo/articolo/${encodeURIComponent(a.chiave)}`).send({condizioni_json:[{tipo:'stato',chiave:'inesistente',confronto:'uguale',valore:1}]})).status).toBe(404);
  expect((await request(app).put(`/api/catalogo/articolo/${encodeURIComponent(a.chiave)}`).send({condizioni_json:[{tipo:'gruppo',modo:'tutte',condizioni:[]}]})).status).toBe(400);
});
it('articoli ottenuti e letture usano dati reali della partita',()=>{
  const a=prepared('SELECT chiave FROM articolo LIMIT 1').get() as {chiave:string};
  expect(valuta([{tipo:'articolo',articolo:a.chiave}]).stato).toBe('bloccato');
  prepared('INSERT INTO acquisto_partita VALUES(?,?,?)').run(partita,a.chiave,'oggi');
  expect(valuta([{tipo:'articolo',articolo:a.chiave}]).stato).toBe('disponibile');
  prepared('INSERT INTO lettura_partita VALUES(?,?,?,?)').run(partita,'libro','un-libro','oggi');
  expect(valuta([{tipo:'lettura',categoria:'libro',chiave:'un-libro'}]).stato).toBe('disponibile');
});
it('migra soltanto corrispondenze complete e conserva i testi ambigui',()=>{
  expect(migraTestiCondizioni(['dal 18 aprile'])).toEqual([{tipo:'data',dal:'04-18'}]);
  expect(migraTestiCondizioni(['dal 18 aprile oppure Coraggio 3'])).toEqual([{tipo:'da-configurare',nota:'dal 18 aprile oppure Coraggio 3'}]);
  expect(normalizzaRequisitoSpillo({tipo:'gruppo',modo:'almeno-una',condizioni:[{tipo:'dote',dote:'coraggio',rango:3},{tipo:'sbagliato'}]})).toBeNull();
});

it('il pacchetto trasporta gli stati referenziati e rifiuta conflitti senza sovrascrivere dati',async()=>{
  const m=(await request(app).post('/api/mappe').send({chiave:'regole-portabili',nome:'Regole portabili',tipo:'area'})).body.data;
  const f=(await request(app).post('/api/condizioni/stati').send({nome:'Evento portabile',categoria:'evento'})).body.data;
  await request(app).post(`/api/mappe/${m.chiave}/spilli`).send({tipo:'nota',nome:'Porta',x:50,y:50,condizioni:[{tipo:'non',condizione:{tipo:'gruppo',modo:'tutte',condizioni:[{tipo:'stato',chiave:f.chiave,confronto:'uguale',valore:1}]}}]});
  const pacchetto=(await request(app).get(`/api/mappe/esporta?radice=${m.chiave}`)).body.data;
  expect(pacchetto.stati).toEqual([expect.objectContaining({chiave:f.chiave,nome:'Evento portabile'})]);
  prepared('DELETE FROM fatto_gioco WHERE chiave=?').run(f.chiave);
  expect((await request(app).post('/api/mappe/importa').send({pacchetto,sovrascrivi:true})).status).toBe(200);
  expect(prepared('SELECT nome FROM fatto_gioco WHERE chiave=?').get(f.chiave)).toEqual({nome:'Evento portabile'});
  pacchetto.stati[0].nome='Definizione in conflitto';
  expect((await request(app).post('/api/mappe/importa').send({pacchetto,sovrascrivi:true})).status).toBe(409);
  expect(prepared('SELECT nome FROM fatto_gioco WHERE chiave=?').get(f.chiave)).toEqual({nome:'Evento portabile'});
});

it('le richieste dentro gruppi usano la chiave stabile e i dati della partita',()=>{
  const r=prepared('SELECT chiave,nome FROM richiesta LIMIT 1').get() as {chiave:string;nome:string};
  const st=statoDisponibilitaPartita(partita);st.richiesteCompletate.add(r.nome);
  const c:RequisitoSpillo={tipo:'gruppo',modo:'tutte',condizioni:[{tipo:'richiesta',richiesta:r.chiave}]};
  expect(valutaRequisiti([{...c,testo:descriviRequisitoSpillo(c)}],st).stato).toBe('disponibile');
});


it('non trasforma un arco narrativo in un boss e rifiuta blocchi dentro gruppi alternativi',()=>{
  expect(migraTestiCondizioni(["a partire dall'arco del Palazzo di Madarame"])).toEqual([{tipo:'da-configurare',nota:"a partire dall'arco del Palazzo di Madarame"}]);
  expect(normalizzaRequisitoSpillo({tipo:'gruppo',modo:'almeno-una',condizioni:[{tipo:'non',condizione:{tipo:'piove'}},{tipo:'dote',dote:'coraggio',rango:1}]})).toBeNull();
});

it('una condizione importata con riferimento mancante resta ignota',async()=>{
  const m=(await request(app).post('/api/mappe').send({chiave:'vincolo-mancante',nome:'Vincolo mancante',tipo:'area'})).body.data;
  const p=(await request(app).get(`/api/mappe/esporta?radice=${m.chiave}`)).body.data;
  p.mappe[0].spilli=[{tipo:'nota',nome:'Vincolo',x:1,y:1,condizioni:[{tipo:'stato',chiave:'non-esiste',confronto:'uguale',valore:1}]}];
  expect((await request(app).post('/api/mappe/importa').send({pacchetto:p,sovrascrivi:true})).status).toBe(200);
  const s=(await request(app).get(`/api/mappe/${m.chiave}?partita=${partita}`)).body.data.spilli[0];
  expect(s.condizioni[0].tipo).toBe('da-configurare');expect(s.disponibilita.stato).toBe('ignoto');
});

it('il valutatore dei quartieri usa il dato materializzato anche se il testo cambia',()=>{
  prepared("UPDATE quartiere SET sblocco_data='04-01',sblocco='31 dicembre' WHERE chiave='akihabara'").run();
  expect(valuta([{tipo:'quartiere',quartiere:'akihabara'}]).stato).toBe('disponibile');
});


it('un pacchetto oltre 20 condizioni non tronca il blocco finale',async()=>{
  const m=(await request(app).post('/api/mappe').send({chiave:'troppi-vincoli',nome:'Troppi vincoli',tipo:'area'})).body.data;
  const p=(await request(app).get('/api/mappe/esporta?radice='+m.chiave)).body.data;
  const condizioni:RequisitoSpillo[]=Array.from({length:20},(_,i)=>({tipo:'data',dal:'04-'+String(i+1).padStart(2,'0')}));
  condizioni.push({tipo:'non',condizione:{tipo:'dote',dote:'coraggio',rango:1}});
  p.mappe[0].spilli=[{tipo:'nota',nome:'Vincolo',x:1,y:1,condizioni}];
  await request(app).put('/api/partite/'+partita+'/giorno').send({data:'12-01'});
  expect((await request(app).post('/api/mappe/importa').send({pacchetto:p,sovrascrivi:true})).status).toBe(200);
  const s=(await request(app).get('/api/mappe/'+m.chiave+'?partita='+partita)).body.data.spilli[0];
  expect(s.condizioni[0].tipo).toBe('da-configurare');expect(s.disponibilita.stato).toBe('ignoto');
});
