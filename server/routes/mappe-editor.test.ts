// ============================================================
// Test API mappe a livelli e spilli (Fase 13.1): albero dalla guida, spilli dai marcatori, editor, stato «raccolto», immagine, esportazione/importazione
// ============================================================

import path from 'node:path';
import request from 'supertest';
import { closeDb, getDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import { dimensioniImmagine, importaMappe } from '../services/mappe/mappeService.js';
import { leggiZip } from '../utils/zip.js';
import { salvaImmagine } from '../services/immaginiService.js';
import type { EsportazioneMappeDto, MappaDto, MappaRiassuntoDto, SpilloDto } from '../../shared/types.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();

/** PNG 2×3 minimo (intestazione IHDR valida; il contenuto non viene decodificato dal server). */
const PNG_2x3 = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from([0, 0, 0, 13]), Buffer.from('IHDR'), Buffer.from([0, 0, 0, 2, 0, 0, 0, 3, 8, 6, 0, 0, 0]), Buffer.from([0, 0, 0, 0]),
  Buffer.from([0, 0, 0, 0]), Buffer.from('IEND'), Buffer.from([0xae, 0x42, 0x60, 0x82]),
]);

describe('API mappe a livelli (Fase 13.1)', () => {
  let partitaId = 0;
  beforeAll(async () => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaCacheTraduzioni();
    partitaId = ((await request(app).post('/api/partite').send({ nome: 'Mappe' })).body.data as { id: number }).id;
  });
  afterAll(() => closeDb());

  it('costruisce l’albero dalla guida (Tokyo → quartieri, Palazzi/Dedalo → aree) con gli spilli dai marcatori', async () => {
    const albero = (await request(app).get('/api/mappe/albero')).body.data as MappaRiassuntoDto[];
    const tokyo = albero.find((m) => m.chiave === 'tokyo')!;
    expect(tokyo).toMatchObject({ tipo: 'citta', genitore: null, origine: 'seed' });
    const quartieri = albero.filter((m) => m.tipo === 'quartiere');
    expect(quartieri.length).toBeGreaterThan(5);
    expect(quartieri.every((q) => q.genitore === 'tokyo' && q.entita?.tipo === 'quartiere' && q.asset === `mappe/${q.chiave}`)).toBe(true);
    // i figli di Tokyo sono i quartieri della guida più le mappe dei pacchetti dell'utente agganciate a Tokyo (es. una banchina della metropolitana)
    expect(tokyo.numeroFigli).toBe(albero.filter((m) => m.genitore === 'tokyo').length);
    expect(tokyo.numeroFigli).toBeGreaterThanOrEqual(quartieri.length);
    const palazzi = albero.filter((m) => m.tipo === 'palazzo');
    expect(palazzi.length).toBeGreaterThan(3);
    expect(albero.some((m) => m.tipo === 'dedalo' && m.chiave === 'dungeon-mementos')).toBe(true);
    const aree = albero.filter((m) => m.tipo === 'area');
    expect(aree.length).toBeGreaterThan(10);
    // le aree dei Palazzi/Dedali vengono dalla guida (entità «area»); i pacchetti dell'utente possono aggiungere aree anche sotto Tokyo o un quartiere
    const areeDungeon = aree.filter((a) => a.genitore?.startsWith('dungeon-'));
    expect(areeDungeon.length).toBeGreaterThan(10);
    expect(areeDungeon.every((a) => a.entita?.tipo === 'area')).toBe(true);
    // ogni chiave è instradabile (minuscole, cifre, trattini)
    for (const m of albero) expect(m.chiave).toMatch(/^[a-z0-9][a-z0-9-]{1,79}$/);
    // i marcatori del seed sono diventati spilli (punti nelle aree, luoghi nei quartieri)
    expect(aree.reduce((n, a) => n + a.numeroSpilli, 0)).toBeGreaterThan(0);
    expect(quartieri.reduce((n, q) => n + q.numeroSpilli, 0)).toBeGreaterThan(0);
    // passaggi automatici: Tokyo → ogni quartiere, Palazzo → ogni area (da posizionare nell'editor)
    const tokyoDett = (await request(app).get('/api/mappe/tokyo')).body.data as MappaDto;
    // ogni quartiere ha il passaggio automatico da Tokyo; una mappa dell'utente agganciata a Tokyo ma raggiunta da un passaggio
    // posato altrove (es. la banchina della metropolitana da Yongen-Jaya) non ne riceve uno doppio
    const passaggiTokyo = tokyoDett.spilli.filter((s) => s.tipo === 'passaggio' && s.riferimento?.tipo === 'mappa').map((s) => s.riferimento!.chiave);
    for (const q of quartieri) expect(passaggiTokyo).toContain(q.chiave);
    const figlieTokyo = new Set(albero.filter((m) => m.genitore === 'tokyo').map((m) => m.chiave));
    for (const p of passaggiTokyo) expect(figlieTokyo.has(p)).toBe(true);
    const kamoshida = (await request(app).get('/api/mappe/dungeon-kamoshida')).body.data as MappaDto;
    expect(kamoshida.spilli.length).toBe(kamoshida.figli.length);
    expect(kamoshida.spilli.every((s) => s.tipo === 'passaggio' && s.dettaglio?.tipo === 'mappa' && s.x >= 0 && s.x <= 100)).toBe(true);
    // Tokyo: posizioni stimate dalla mappa ufficiale (Shibuya al centro-sinistra); Mementos: discesa verticale in ordine
    expect(tokyoDett.spilli.find((s) => s.riferimento?.chiave === 'citta-shibuya')).toMatchObject({ x: 34.5, y: 49.5 });
    const mementos = (await request(app).get('/api/mappe/dungeon-mementos')).body.data as MappaDto;
    const y = mementos.spilli.map((s) => s.y);
    expect(y).toEqual([...y].sort((a, b) => a - b));
    // la sincronizzazione ripetuta (seed invariato) non duplica i passaggi
    expect(caricaSeed(getDb(), DIR_SEED).caricato).toBe(false);
    expect(((await request(app).get('/api/mappe/tokyo')).body.data as MappaDto).spilli.length).toBe(quartieri.length);
  });

  it('il dettaglio espone percorso, figli, spilli con il dettaglio dell’entità collegata (punto, luogo con negozio e articoli)', async () => {
    const albero = (await request(app).get('/api/mappe/albero')).body.data as MappaRiassuntoDto[];
    const area = albero.find((m) => m.tipo === 'area' && m.numeroSpilli > 0)!;
    const dettaglio = (await request(app).get(`/api/mappe/${area.chiave}?partita=${partitaId}`)).body.data as MappaDto;
    expect(dettaglio.percorso.map((p) => p.chiave)).toEqual([area.genitore, area.chiave]);
    expect(dettaglio.spilli.length).toBe(area.numeroSpilli);
    const spilloPunto = dettaglio.spilli.find((s) => s.riferimento?.tipo === 'punto')!;
    expect(spilloPunto.dettaglio?.tipo).toBe('punto');
    expect(spilloPunto.dettaglio?.punto?.area).toBe(area.chiave);
    expect(spilloPunto.raccolto).toBe(false);
    expect(spilloPunto.x).toBeGreaterThanOrEqual(0);
    expect(spilloPunto.x).toBeLessThanOrEqual(100);
    const quartiere = albero.find((m) => m.tipo === 'quartiere' && m.numeroSpilli > 0)!;
    const q = (await request(app).get(`/api/mappe/${quartiere.chiave}?partita=${partitaId}`)).body.data as MappaDto;
    expect(q.percorso.map((p) => p.chiave)).toEqual(['tokyo', quartiere.chiave]);
    const conNegozio = q.spilli.find((s) => s.dettaglio?.tipo === 'luogo' && s.dettaglio.negozio);
    if (conNegozio) {
      expect(conNegozio.dettaglio!.negozio!.articoli.length).toBeGreaterThan(0);
      expect(conNegozio.dettaglio!.negozio!.articoli[0]).toHaveProperty('comprato', false);
    }
    // per entità
    const perEntita = (await request(app).get(`/api/mappe/entita/quartiere/${quartiere.entita!.chiave}`)).body.data as MappaRiassuntoDto;
    expect(perEntita.chiave).toBe(quartiere.chiave);
    expect((await request(app).get('/api/mappe/entita/quartiere/inesistente')).status).toBe(404);
  });

  it('editor: crea, aggiorna ed elimina mappe e spilli con validazione (coordinate, tipo, genitore ciclico)', async () => {
    const creata = await request(app).post('/api/mappe').send({ chiave: 'prova-negozio', nome: 'Prova negozio', tipo: 'luogo', genitore: 'citta-shibuya', note: 'interno' });
    expect(creata.status).toBe(201);
    expect((creata.body.data as MappaDto)).toMatchObject({ chiave: 'prova-negozio', genitore: 'citta-shibuya', origine: 'utente', percorso: [{ chiave: 'tokyo', nome: 'Tokyo' }, { chiave: 'citta-shibuya', nome: expect.any(String) }, { chiave: 'prova-negozio', nome: 'Prova negozio' }] });
    expect((await request(app).post('/api/mappe').send({ chiave: 'prova-negozio', nome: 'Doppione', tipo: 'luogo' })).status).toBe(409);
    expect((await request(app).post('/api/mappe').send({ chiave: 'Chiave Non Valida', nome: 'x', tipo: 'luogo' })).status).toBe(400);
    expect((await request(app).post('/api/mappe').send({ chiave: 'tipo-errato', nome: 'x', tipo: 'castello' })).status).toBe(400);
    // il genitore non può essere un discendente
    expect((await request(app).put('/api/mappe/citta-shibuya').send({ genitore: 'prova-negozio' })).status).toBe(400);
    const rinominata = (await request(app).put('/api/mappe/prova-negozio').send({ nome: 'Negozio di prova', ordine: 3 })).body.data as MappaDto;
    expect(rinominata).toMatchObject({ nome: 'Negozio di prova', ordine: 3, genitore: 'citta-shibuya' });
    // la mappa compare fra i figli del quartiere
    const shibuya = (await request(app).get('/api/mappe/citta-shibuya')).body.data as MappaDto;
    expect(shibuya.figli.some((f) => f.chiave === 'prova-negozio')).toBe(true);

    const spillo = await request(app).post('/api/mappe/prova-negozio/spilli').send({ tipo: 'forziere', nome: 'Forziere di prova', x: 12.5, y: 80 });
    expect(spillo.status).toBe(201);
    const s = spillo.body.data as SpilloDto;
    expect(s).toMatchObject({ tipo: 'forziere', collezionabile: true, raccolto: false, origine: 'utente', colore: expect.any(String), tipoNome: 'Forziere' });
    expect((await request(app).post('/api/mappe/prova-negozio/spilli').send({ tipo: 'forziere', nome: 'Fuori', x: 150, y: 10 })).status).toBe(400);
    expect((await request(app).post('/api/mappe/prova-negozio/spilli').send({ tipo: 'drago', nome: 'Tipo ignoto', x: 1, y: 1 })).status).toBe(400);
    // tipo «dialogo»: collezionabile per default, senza riferimento; rimosso subito per non alterare i conteggi che seguono
    const dialogo = (await request(app).post('/api/mappe/prova-negozio/spilli').send({ tipo: 'dialogo', nome: 'Passante loquace', x: 30, y: 30 })).body.data as SpilloDto;
    expect(dialogo).toMatchObject({ tipo: 'dialogo', tipoNome: 'Dialogo', colore: '#6366f1', collezionabile: true, raccolto: false, riferimento: null, origine: 'utente' });
    expect((await request(app).delete(`/api/mappe/spilli/${dialogo.id}`)).status).toBe(204);
    // il pacchetto data/seed/mappe/citta-yongen-jaya.json entra col tipo dedicato
    const yongen = (await request(app).get('/api/mappe/citta-yongen-jaya')).body.data as MappaDto;
    expect(yongen.spilli.find((s) => s.nome === 'Poliziotto Dialogo')).toMatchObject({ tipo: 'dialogo', tipoNome: 'Dialogo', origine: 'seed', collezionabile: true, riferimento: null });
    expect((await request(app).post('/api/mappe/prova-negozio/spilli').send({ tipo: 'passaggio', nome: 'Verso il nulla', x: 1, y: 1, riferimento: { tipo: 'mappa', chiave: 'non-esiste' } })).status).toBe(404);
    expect((await request(app).post('/api/mappe/prova-negozio/spilli').send({ tipo: 'negozio', nome: 'Negozio fantasma', x: 1, y: 1, riferimento: { tipo: 'negozio', chiave: 'non-esiste' } })).status).toBe(404);
    const passaggio = (await request(app).post('/api/mappe/prova-negozio/spilli').send({ tipo: 'passaggio', nome: 'Torna a Shibuya', x: 50, y: 95, riferimento: { tipo: 'mappa', chiave: 'citta-shibuya' } })).body.data as SpilloDto;
    expect(passaggio.dettaglio).toMatchObject({ tipo: 'mappa', mappa: { chiave: 'citta-shibuya' } });
    expect(passaggio.collezionabile).toBe(false);
    const spostato = (await request(app).put(`/api/mappe/spilli/${s.id}`).send({ x: 20, y: 70, nome: 'Forziere spostato', collezionabile: false })).body.data as SpilloDto;
    expect(spostato).toMatchObject({ x: 20, y: 70, nome: 'Forziere spostato', collezionabile: false });
    expect((await request(app).get('/api/mappe/prova-negozio')).body.data.spilli).toHaveLength(2);
    expect((await request(app).delete(`/api/mappe/spilli/${passaggio.id}`)).status).toBe(204);
    expect((await request(app).delete(`/api/mappe/spilli/${passaggio.id}`)).status).toBe(404);
    expect((await request(app).get('/api/mappe/prova-negozio')).body.data.spilli).toHaveLength(1);
  });

  it('stato «raccolto» per partita: uno spillo collegato a un punto aggiorna anche il punto della Guida', async () => {
    const albero = (await request(app).get('/api/mappe/albero')).body.data as MappaRiassuntoDto[];
    const area = albero.find((m) => m.tipo === 'area' && m.numeroSpilli > 0)!;
    const prima = (await request(app).get(`/api/mappe/${area.chiave}?partita=${partitaId}`)).body.data as MappaDto;
    const spillo = prima.spilli.find((s) => s.riferimento?.tipo === 'punto')!;
    const raccolto = (await request(app).put(`/api/partite/${partitaId}/spilli/${spillo.id}`).send({ raccolto: true })).body.data as SpilloDto;
    expect(raccolto.raccolto).toBe(true);
    expect(raccolto.dettaglio?.punto?.stato).toBe('ottenuto');
    // senza partita lo stato non compare; con un'altra partita resta non raccolto
    expect((await request(app).get(`/api/mappe/${area.chiave}`)).body.data.spilli.find((s: SpilloDto) => s.id === spillo.id).raccolto).toBe(false);
    const altra = ((await request(app).post('/api/partite').send({ nome: 'Altra' })).body.data as { id: number }).id;
    expect((await request(app).get(`/api/mappe/${area.chiave}?partita=${altra}`)).body.data.spilli.find((s: SpilloDto) => s.id === spillo.id).raccolto).toBe(false);
    const annullato = (await request(app).put(`/api/partite/${partitaId}/spilli/${spillo.id}`).send({ raccolto: false })).body.data as SpilloDto;
    expect(annullato.raccolto).toBe(false);
    expect(annullato.dettaglio?.punto?.stato).toBeNull();
    expect((await request(app).put(`/api/partite/${partitaId}/spilli/999999`).send({ raccolto: true })).status).toBe(404);
    expect((await request(app).put(`/api/partite/${partitaId}/spilli/${spillo.id}`).send({ raccolto: 'sì' })).status).toBe(400);
  });

  it('immagine di base nell’istanza (dimensioni dall’intestazione), esportazione con base64 e importazione idempotente', async () => {
    const conImmagine = await request(app).put('/api/mappe/prova-negozio/immagine').set('Content-Type', 'image/png').send(PNG_2x3);
    expect(conImmagine.status).toBe(200);
    expect(conImmagine.body.data).toMatchObject({ larghezza: 2, altezza: 3 });
    expect((conImmagine.body.data as MappaDto).immagineUrl).toContain('/api/immagini/mappa/prova-negozio/file');
    expect((await request(app).get('/api/immagini/mappa/prova-negozio/file')).status).toBe(200);
    expect((await request(app).put('/api/mappe/prova-negozio/immagine').set('Content-Type', 'text/plain').send('no')).status).toBe(400);

    const pacchetto = (await request(app).get('/api/mappe/esporta')).body.data as EsportazioneMappeDto;
    expect(pacchetto.versione).toBe(1);
    const mia = pacchetto.mappe.find((m) => m.chiave === 'prova-negozio')!;
    expect(mia).toMatchObject({ nome: 'Negozio di prova', genitore: 'citta-shibuya', immagine: 'prova-negozio', larghezza: 2, altezza: 3 });
    expect(mia.spilli).toHaveLength(1);
    expect(pacchetto.immagini?.['prova-negozio']).toMatchObject({ mime: 'image/png', base64: PNG_2x3.toString('base64') });
    // le mappe strutturali del seed non portano immagini dell'istanza finché l'utente non le carica
    expect(pacchetto.mappe.find((m) => m.chiave === 'tokyo')!.immagine).toBeNull();

    // importazione: la stessa chiave senza «sovrascrivi» viene saltata; con «sovrascrivi» sostituisce spilli e nome
    const copia: EsportazioneMappeDto = { versione: 1, mappe: [{ ...mia, nome: 'Importata', spilli: [...mia.spilli, { tipo: 'nota', nome: 'Nota importata', descrizione: '', x: 5, y: 5, riferimento: null, collezionabile: false, ordine: 1 }] }], immagini: {} };
    const saltata = (await request(app).post('/api/mappe/importa').send({ pacchetto: copia })).body.data as { mappe: number; saltate: string[] };
    expect(saltata).toMatchObject({ mappe: 0, saltate: ['prova-negozio'] });
    const sovrascritta = (await request(app).post('/api/mappe/importa').send({ pacchetto: copia, sovrascrivi: true })).body.data as { mappe: number; spilli: number; saltate: string[] };
    expect(sovrascritta).toMatchObject({ mappe: 1, spilli: 2, saltate: [] });
    const dopo = (await request(app).get('/api/mappe/prova-negozio')).body.data as MappaDto;
    expect(dopo.nome).toBe('Importata');
    expect(dopo.spilli.map((s) => s.nome)).toEqual(['Forziere spostato', 'Nota importata']);
    expect(dopo.immagineUrl).toContain('/api/immagini/mappa/prova-negozio/file');
    // una mappa nuova con immagine in base64 e genitore dichiarato dopo di lei
    const nuova: EsportazioneMappeDto = { versione: 1, mappe: [
      { chiave: 'figlia-nuova', nome: 'Figlia', tipo: 'generica', genitore: 'madre-nuova', ordine: 0, immagine: 'figlia-nuova', asset: null, larghezza: null, altezza: null, entita: null, note: '', spilli: [] },
      { chiave: 'madre-nuova', nome: 'Madre', tipo: 'generica', genitore: null, ordine: 0, immagine: null, asset: null, larghezza: null, altezza: null, entita: null, note: '', spilli: [] },
    ], immagini: { 'figlia-nuova': { mime: 'image/png', base64: PNG_2x3.toString('base64') } } };
    expect((await request(app).post('/api/mappe/importa').send({ pacchetto: nuova })).body.data).toMatchObject({ mappe: 2, immagini: 1, saltate: [] });
    expect(((await request(app).get('/api/mappe/figlia-nuova')).body.data as MappaDto).percorso.map((p) => p.chiave)).toEqual(['madre-nuova', 'figlia-nuova']);
    expect((await request(app).post('/api/mappe/importa').send({ pacchetto: { versione: 2, mappe: [] } })).status).toBe(400);
    // chiave o tipo non validi → la mappa finisce in «saltate» senza far fallire il resto
    const mista: EsportazioneMappeDto = { versione: 1, mappe: [
      { chiave: 'Chiave Errata', nome: 'x', tipo: 'generica', genitore: null, ordine: 0, immagine: null, asset: null, larghezza: null, altezza: null, entita: null, note: '', spilli: [] },
      { chiave: 'tipo-errato', nome: 'x', tipo: 'castello' as unknown as 'generica', genitore: null, ordine: 0, immagine: null, asset: null, larghezza: null, altezza: null, entita: null, note: '', spilli: [] },
      { chiave: 'valida-mista', nome: 'Valida', tipo: 'generica', genitore: null, ordine: 0, immagine: null, asset: null, larghezza: null, altezza: null, entita: null, note: '', spilli: [{ tipo: 'nota', nome: 'Ok', descrizione: '', x: 1, y: 1, riferimento: null, collezionabile: false, ordine: 0 }] },
    ] };
    expect((await request(app).post('/api/mappe/importa').send({ pacchetto: mista })).body.data).toMatchObject({ mappe: 1, spilli: 1, saltate: ['Chiave Errata', 'tipo-errato'] });
    expect((await request(app).delete('/api/mappe/valida-mista')).status).toBe(204);

    // eliminazione: i figli restano orfani (genitore null), gli spilli spariscono
    expect((await request(app).delete('/api/mappe/madre-nuova')).status).toBe(204);
    expect(((await request(app).get('/api/mappe/figlia-nuova')).body.data as MappaDto).genitore).toBeNull();
    expect((await request(app).delete('/api/mappe/prova-negozio')).status).toBe(204);
    expect((await request(app).get('/api/mappe/prova-negozio')).status).toBe(404);
  });

  it('il seed non cancella gli spilli aggiunti dall’utente su una mappa del seed (reseed con mappe-editor popolato)', async () => {
    const mio = (await request(app).post('/api/mappe/citta-shibuya/spilli').send({ tipo: 'nota', nome: 'Il mio appunto', x: 33, y: 44 })).body.data as SpilloDto;
    expect(mio.origine).toBe('utente');
    const prima = ((await request(app).get('/api/mappe/citta-shibuya')).body.data as MappaDto).spilli;
    // pacchetto «seed» per la stessa mappa (origine seed): sostituisce i soli spilli di origine seed
    const seed: EsportazioneMappeDto = { versione: 1, mappe: [{ chiave: 'citta-shibuya', nome: 'Shibuya', tipo: 'quartiere', genitore: 'tokyo', ordine: 1, immagine: null, asset: 'mappe/citta-shibuya', larghezza: null, altezza: null, entita: { tipo: 'quartiere', chiave: 'shibuya' }, note: '', spilli: [{ tipo: 'nota', nome: 'Nota del seed', descrizione: '', x: 10, y: 10, riferimento: null, collezionabile: false, ordine: 0 }] }] };
    expect(importaMappe(seed, { origine: 'seed' })).toMatchObject({ mappe: 1, spilli: 1, saltate: [] });
    const dopo = ((await request(app).get('/api/mappe/citta-shibuya')).body.data as MappaDto).spilli;
    expect(dopo.some((s) => s.id === mio.id && s.nome === 'Il mio appunto')).toBe(true);
    expect(dopo.some((s) => s.nome === 'Nota del seed' && s.origine === 'seed')).toBe(true);
    expect(dopo.filter((s) => s.origine === 'seed' && s.nome !== 'Nota del seed')).toHaveLength(0);
    expect(dopo.length).toBe(prima.filter((s) => s.origine === 'utente').length + 1);
    // un pacchetto dell'utente senza «sovrascrivi» salta la mappa esistente; con «sovrascrivi» la sostituisce per intero
    expect((await request(app).post('/api/mappe/importa').send({ pacchetto: seed })).body.data).toMatchObject({ mappe: 0, saltate: ['citta-shibuya'] });
    expect((await request(app).post('/api/mappe/importa').send({ pacchetto: seed, sovrascrivi: true })).body.data).toMatchObject({ mappe: 1, spilli: 1 });
    expect(((await request(app).get('/api/mappe/citta-shibuya')).body.data as MappaDto).spilli.map((s) => s.nome)).toEqual(['Nota del seed']);
  });

  it('ricerca delle entità collegabili per tipo e testo; la pianta scaricata con la chiave della mappa diventa la sua immagine di base', async () => {
    const negozi = (await request(app).get('/api/mappe/riferimenti?tipo=negozio&q=leblanc')).body.data as Array<{ tipo: string; chiave: string; nome: string; dettaglio: string }>;
    expect(negozi.length).toBeGreaterThan(0);
    expect(negozi[0]).toMatchObject({ tipo: 'negozio', chiave: expect.any(String), nome: expect.stringMatching(/Leblanc/i) });
    const punti = (await request(app).get('/api/mappe/riferimenti?tipo=punto&q=cancello&limite=5')).body.data as Array<{ chiave: string; dettaglio: string }>;
    expect(punti.length).toBeGreaterThan(0);
    expect(punti.length).toBeLessThanOrEqual(5);
    expect(punti[0].dettaglio).not.toBe('');
    const confidenti = (await request(app).get('/api/mappe/riferimenti?tipo=confidente&q=ryu')).body.data as Array<{ chiave: string; nome: string; dettaglio: string }>;
    expect(confidenti.some((c) => c.chiave === 'ryuji')).toBe(true);
    expect((await request(app).get('/api/mappe/riferimenti?tipo=drago&q=x')).status).toBe(400);
    // pianta dell'istanza con la chiave della mappa (come fanno «scarica dalla guida» e il caricamento manuale dell'area)
    const area = ((await request(app).get('/api/mappe/albero')).body.data as MappaRiassuntoDto[]).find((m) => m.tipo === 'area' && !m.immagineUrl)!;
    expect((await request(app).put(`/api/immagini/mappa/${encodeURIComponent(area.chiave)}`).set('Content-Type', 'image/png').send(PNG_2x3)).status).toBeLessThan(300);
    const dopo = (await request(app).get(`/api/mappe/${area.chiave}`)).body.data as MappaDto;
    expect(dopo.immagineUrl).toContain(`/api/immagini/mappa/${encodeURIComponent(area.chiave)}/file`);
    const pacchetto = (await request(app).get('/api/mappe/esporta')).body.data as EsportazioneMappeDto;
    expect(pacchetto.mappe.find((m) => m.chiave === area.chiave)!.immagine).toBe(area.chiave);
    expect(pacchetto.immagini?.[area.chiave]?.mime).toBe('image/png');
  });

  it('le immagini scaricate dalle guide entrano nel pacchetto come tutte le altre, con la provenienza annotata (JSON e LEGGIMI)', async () => {
    const area = ((await request(app).get('/api/mappe/albero')).body.data as MappaRiassuntoDto[]).filter((m) => m.tipo === 'area' && !m.immagineUrl)[1];
    salvaImmagine('mappa', area.chiave, 'image/png', PNG_2x3, 'https://omoteura.com/pianta.png');
    const json = (await request(app).get(`/api/mappe/esporta?radice=${area.chiave}`)).body.data as EsportazioneMappeDto;
    expect(json.mappe[0].immagine).toBe(area.chiave);
    expect(json.immagini?.[area.chiave]).toMatchObject({ mime: 'image/png', base64: PNG_2x3.toString('base64') });
    expect(json.provenienze).toEqual([{ mappa: area.chiave, origineUrl: 'https://omoteura.com/pianta.png' }]);
    const zip = await request(app).get(`/api/mappe/esporta.zip?radice=${area.chiave}`).buffer(true).parse((res, cb) => { const parti: Buffer[] = []; res.on('data', (c: Buffer) => parti.push(c)); res.on('end', () => cb(null, Buffer.concat(parti))); });
    const voci = leggiZip(zip.body as Buffer);
    expect(voci.map((v) => v.nome)).toEqual(['LEGGIMI.txt', `data/seed/mappe/${area.chiave}.json`, `public/asset/mappe/${area.chiave}.png`]);
    expect(voci[0].contenuto.toString('utf-8')).toContain(`- ${area.chiave}: https://omoteura.com/pianta.png`);
    const seedArea = JSON.parse(voci[1].contenuto.toString('utf-8')) as EsportazioneMappeDto;
    expect(seedArea.mappe[0]).toMatchObject({ immagine: null, asset: `mappe/${area.chiave}` });
    expect(seedArea.provenienze).toBeUndefined();
  });

  it('schermate degli spilli: caricamento, didascalia, eliminazione; esportazione per luogo (JSON e ZIP per il repository) e reimportazione', async () => {
    const luogo = (await request(app).post('/api/mappe').send({ chiave: 'luogo-zip', nome: 'Luogo ZIP', tipo: 'luogo', genitore: 'citta-shibuya' })).body.data as MappaDto;
    expect(luogo.percorso.map((p) => p.chiave)).toEqual(['tokyo', 'citta-shibuya', 'luogo-zip']);
    const figlia = (await request(app).post('/api/mappe').send({ chiave: 'luogo-zip-interno', nome: 'Interno', tipo: 'generica', genitore: 'luogo-zip' })).body.data as MappaDto;
    expect((await request(app).put('/api/mappe/luogo-zip/immagine').set('Content-Type', 'image/png').send(PNG_2x3)).status).toBe(200);
    const spillo = (await request(app).post('/api/mappe/luogo-zip/spilli').send({ tipo: 'passaggio', nome: 'Scala', x: 10, y: 10, riferimento: { tipo: 'mappa', chiave: figlia.chiave } })).body.data as SpilloDto;
    expect(spillo.immagini).toEqual([]);
    expect(spillo.dettaglio?.immagine).toEqual({ url: null, asset: null });
    // schermate
    const conImmagine = await request(app).post(`/api/mappe/spilli/${spillo.id}/immagini?didascalia=Vista%20dalla%20scala`).set('Content-Type', 'image/png').send(PNG_2x3);
    expect(conImmagine.status).toBe(201);
    const s1 = conImmagine.body.data as SpilloDto;
    expect(s1.immagini).toHaveLength(1);
    expect(s1.immagini[0]).toMatchObject({ didascalia: 'Vista dalla scala', ordine: 0, asset: null });
    expect(s1.immagini[0].url).toContain('/api/immagini/spillo/');
    expect((await request(app).get(s1.immagini[0].url!)).status).toBe(200);
    const s2 = (await request(app).post(`/api/mappe/spilli/${spillo.id}/immagini`).set('Content-Type', 'image/png').send(PNG_2x3)).body.data as SpilloDto;
    expect(s2.immagini.map((i) => i.ordine)).toEqual([0, 1]);
    const rinominata = (await request(app).put(`/api/mappe/spilli/immagini/${s2.immagini[1].id}`).send({ didascalia: 'Seconda', ordine: 0 })).body.data as SpilloDto;
    expect(rinominata.immagini.find((i) => i.didascalia === 'Seconda')).toMatchObject({ ordine: 0 });
    expect((await request(app).post(`/api/mappe/spilli/${spillo.id}/immagini`).set('Content-Type', 'text/plain').send('no')).status).toBe(400);
    // il Confidente collegato espone l'immagine (asset del ritratto)
    const conf = (await request(app).post('/api/mappe/luogo-zip/spilli').send({ tipo: 'confidente', nome: 'Ryuji', x: 20, y: 20, riferimento: { tipo: 'confidente', chiave: 'ryuji' } })).body.data as SpilloDto;
    expect(conf.dettaglio?.immagine).toEqual({ url: null, asset: 'confidenti/ryuji-fedele' });

    // esportazione per luogo: solo il sottoalbero, sempre con le schermate degli spilli
    const pacchettoLuogo = (await request(app).get('/api/mappe/esporta?radice=luogo-zip')).body.data as EsportazioneMappeDto;
    expect(pacchettoLuogo.mappe.map((m) => m.chiave)).toEqual(['luogo-zip', 'luogo-zip-interno']);
    expect(pacchettoLuogo.mappe[0].spilli[0].immagini).toHaveLength(2);
    expect(pacchettoLuogo.mappe[0].spilli[0].immagini!.map((i) => i.didascalia).sort()).toEqual(['Seconda', 'Vista dalla scala']);
    expect(pacchettoLuogo.mappe[0].spilli[0].immagini![0].mime).toBe('image/png');
    expect((await request(app).get('/api/mappe/esporta?radice=non-esiste')).status).toBe(404);

    // ZIP per il repository: LEGGIMI, seed del luogo con asset, immagini come file
    const zip = await request(app).get('/api/mappe/esporta.zip?radice=luogo-zip').buffer(true).parse((res, cb) => { const parti: Buffer[] = []; res.on('data', (c: Buffer) => parti.push(c)); res.on('end', () => cb(null, Buffer.concat(parti))); });
    expect(zip.status).toBe(200);
    expect(zip.headers['content-type']).toContain('application/zip');
    const voci = leggiZip(zip.body as Buffer);
    expect(voci.map((v) => v.nome)).toEqual(['LEGGIMI.txt', 'data/seed/mappe/luogo-zip.json', 'public/asset/mappe/luogo-zip.png', 'public/asset/spilli/luogo-zip/1-1.png', 'public/asset/spilli/luogo-zip/1-2.png']);
    const seedLuogo = JSON.parse(voci[1].contenuto.toString('utf-8')) as EsportazioneMappeDto;
    expect(seedLuogo.immagini).toBeUndefined();
    expect(seedLuogo.mappe[0]).toMatchObject({ chiave: 'luogo-zip', asset: 'mappe/luogo-zip', immagine: null });
    expect(seedLuogo.mappe[0].spilli[0].immagini!.map((i) => i.asset)).toEqual(['spilli/luogo-zip/1-1', 'spilli/luogo-zip/1-2']);
    expect(seedLuogo.mappe[0].spilli[0].immagini!.map((i) => i.didascalia).sort()).toEqual(['Seconda', 'Vista dalla scala']);
    expect(Buffer.compare(voci[2].contenuto, PNG_2x3)).toBe(0);
    expect((await request(app).get('/api/mappe/esporta.zip')).status).toBe(400);

    // reimportazione del seed del luogo in una chiave nuova: gli asset delle schermate diventano righe senza file
    const clonato: EsportazioneMappeDto = { ...seedLuogo, mappe: seedLuogo.mappe.map((m) => ({ ...m, chiave: `${m.chiave}-copia`, genitore: m.genitore === 'luogo-zip' ? 'luogo-zip-copia' : m.genitore })) };
    expect((await request(app).post('/api/mappe/importa').send({ pacchetto: clonato })).body.data).toMatchObject({ mappe: 2, spilli: 2, immagini: 0, saltate: [] });
    const copia = (await request(app).get('/api/mappe/luogo-zip-copia')).body.data as MappaDto;
    expect(copia.asset).toBe('mappe/luogo-zip');
    expect(copia.spilli[0].immagini.map((i) => ({ asset: i.asset, url: i.url }))).toEqual([{ asset: 'spilli/luogo-zip/1-1', url: null }, { asset: 'spilli/luogo-zip/1-2', url: null }]);
    // reimportazione con schermate in base64: file creati nell'istanza
    expect((await request(app).post('/api/mappe/importa').send({ pacchetto: { ...pacchettoLuogo, mappe: pacchettoLuogo.mappe.map((m) => ({ ...m, chiave: `${m.chiave}-b64`, genitore: m.genitore === 'luogo-zip' ? 'luogo-zip-b64' : m.genitore })) } })).body.data).toMatchObject({ mappe: 2, immagini: 3 });
    const b64 = (await request(app).get('/api/mappe/luogo-zip-b64')).body.data as MappaDto;
    expect(b64.spilli[0].immagini.every((i) => i.url?.includes('/api/immagini/spillo/'))).toBe(true);

    // eliminazione della schermata: sparisce anche il file; eliminando lo spillo spariscono le righe
    const dopoElimina = (await request(app).delete(`/api/mappe/spilli/immagini/${rinominata.immagini[0].id}`)).body.data as SpilloDto;
    expect(dopoElimina.immagini).toHaveLength(1);
    expect((await request(app).get(rinominata.immagini[0].url!)).status).toBe(404);
    expect((await request(app).delete(`/api/mappe/spilli/immagini/${rinominata.immagini[0].id}`)).status).toBe(404);
    expect((await request(app).delete(`/api/mappe/spilli/${spillo.id}`)).status).toBe(204);
    for (const k of ['luogo-zip', 'luogo-zip-copia', 'luogo-zip-b64']) expect((await request(app).delete(`/api/mappe/${k}`)).status).toBe(204);
  });

  it('condizioni di visibilità degli spilli: solo quelle calcolabili, validate sulla Guida, valutate con la partita, esportate e reimportate', async () => {
    expect((await request(app).post('/api/mappe').send({ chiave: 'prova-condizioni', nome: 'Prova condizioni', tipo: 'luogo', genitore: 'citta-shibuya' })).status).toBe(201);
    const condizioni = [{ tipo: 'data', dal: '06-18' }, { tipo: 'palazzo', dungeon: 'kamoshida' }, { tipo: 'confidente', confidente: 'sojiro', rango: 3 }, { tipo: 'giorno-settimana', giorni: ['domenica'] }];
    const creato = await request(app).post('/api/mappe/prova-condizioni/spilli').send({ tipo: 'nota', nome: 'Evento estivo', x: 10, y: 10, condizioni });
    expect(creato.status).toBe(201);
    const s = creato.body.data as SpilloDto;
    // ogni condizione torna con il testo in italiano (nomi dalla Guida); senza partita nessuna valutazione
    expect(s.condizioni.map((c) => c.testo)).toEqual(['dal 18 giugno', 'dopo il Palazzo di Kamoshida', 'Rango Confidente Sojiro Sakura 3', 'solo domenica']);
    expect(s.disponibilita).toBeUndefined();
    // gli spilli esistenti restano tutti senza condizioni
    const yongen = (await request(app).get('/api/mappe/citta-yongen-jaya')).body.data as MappaDto;
    expect(yongen.spilli.every((x) => x.condizioni.length === 0)).toBe(true);
    // validazione: condizioni non calcolabili o malformate → 400; chiavi assenti dalla Guida → 404
    const invia = (c: unknown) => request(app).post('/api/mappe/prova-condizioni/spilli').send({ tipo: 'nota', nome: 'x', x: 1, y: 1, condizioni: [c] });
    expect((await invia({ tipo: 'manuale', testo: 'dopo aver pescato' })).status).toBe(400);
    expect((await invia({ tipo: 'dote', dote: 'coraggio', rango: 7 })).status).toBe(400);
    expect((await invia({ tipo: 'data', dal: '18 giugno' })).status).toBe(400);
    expect((await invia({ tipo: 'giorno-settimana', giorni: ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'] })).status).toBe(400);
    expect((await invia({ tipo: 'confidente', confidente: 'nessuno', rango: 1 })).status).toBe(404);
    expect((await invia({ tipo: 'quartiere', quartiere: 'atlantide' })).status).toBe(404);
    // un quartiere esiste ma senza data di sblocco nella Guida (Ueno: Confidente di Yusuke Rango 3) → non calcolabile → 404; Akihabara (31 agosto) → accettato
    expect((await invia({ tipo: 'quartiere', quartiere: 'ueno' })).status).toBe(404);
    const akihabara = await invia({ tipo: 'quartiere', quartiere: 'akihabara' });
    expect(akihabara.status).toBe(201);
    expect((akihabara.body.data as SpilloDto).condizioni[0].testo).toBe('da quando si sblocca Akihabara');
    expect((await request(app).delete(`/api/mappe/spilli/${(akihabara.body.data as SpilloDto).id}`)).status).toBe(204);
    expect((await invia({ tipo: 'richiesta', richiesta: 'richiesta-inesistente' })).status).toBe(404);
    // la richiesta si salva con la chiave ma testo e dettaglio del semaforo usano il nome della Guida
    const primaRichiesta = ((await request(app).get('/api/compendio/richieste')).body.data as { richieste: Array<{ chiave: string; nome: string }> }).richieste[0];
    const conRichiesta = (await invia({ tipo: 'richiesta', richiesta: primaRichiesta.chiave })).body.data as SpilloDto;
    expect(conRichiesta.condizioni[0]).toEqual({ tipo: 'richiesta', richiesta: primaRichiesta.chiave, testo: `richiesta «${primaRichiesta.nome}» completata` });
    const valutata = ((await request(app).get(`/api/mappe/prova-condizioni?partita=${partitaId}`)).body.data as MappaDto).spilli.find((x) => x.id === conRichiesta.id)!;
    expect(valutata.disponibilita?.requisiti[0]).toMatchObject({ tipo: 'richiesta', stato: 'rosso' });
    expect(valutata.disponibilita?.requisiti[0].dettaglio).toContain(primaRichiesta.nome);
    expect(valutata.disponibilita?.requisiti[0].dettaglio).not.toContain(`«${primaRichiesta.chiave}»`);
    expect((await request(app).delete(`/api/mappe/spilli/${conRichiesta.id}`)).status).toBe(204);
    // con la partita: il Palazzo di Kamoshida non è completato → condizione rossa → spillo bloccato (nascosto sulla mappa)
    const con = (await request(app).get(`/api/mappe/prova-condizioni?partita=${partitaId}`)).body.data as MappaDto;
    const conSpillo = con.spilli.find((x) => x.id === s.id)!;
    expect(conSpillo.disponibilita?.stato).toBe('bloccato');
    expect(conSpillo.disponibilita?.requisiti).toHaveLength(4);
    expect(conSpillo.disponibilita?.requisiti[1]).toMatchObject({ tipo: 'palazzo', stato: 'rosso', testo: 'dopo il Palazzo di Kamoshida', dettaglio: 'Palazzo di Kamoshida: segna il boss come sconfitto nella Guida', manuale: false });
    expect(conSpillo.disponibilita?.requisiti[2]).toMatchObject({ tipo: 'confidente', stato: 'rosso' });
    // aggiornamento: solo la pioggia → una condizione meteo; senza condizioni → disponibile
    const pioggia = (await request(app).put(`/api/mappe/spilli/${s.id}`).send({ condizioni: [{ tipo: 'piove' }] })).body.data as SpilloDto;
    expect(pioggia.condizioni).toEqual([{ tipo: 'piove', testo: 'solo nei giorni di pioggia' }]);
    const conPioggia = ((await request(app).get(`/api/mappe/prova-condizioni?partita=${partitaId}`)).body.data as MappaDto).spilli.find((x) => x.id === s.id)!;
    expect(conPioggia.disponibilita?.requisiti[0]).toMatchObject({ tipo: 'meteo' });
    const senza = (await request(app).put(`/api/mappe/spilli/${s.id}`).send({ condizioni: [] })).body.data as SpilloDto;
    expect(senza.condizioni).toEqual([]);
    expect(((await request(app).get(`/api/mappe/prova-condizioni?partita=${partitaId}`)).body.data as MappaDto).spilli.find((x) => x.id === s.id)!.disponibilita).toEqual({ stato: 'disponibile', requisiti: [] });
    // le condizioni restano quando il corpo non le nomina
    await request(app).put(`/api/mappe/spilli/${s.id}`).send({ condizioni: [{ tipo: 'stagione', stagione: 'estate' }] });
    expect(((await request(app).put(`/api/mappe/spilli/${s.id}`).send({ nome: 'Evento rinominato' })).body.data as SpilloDto).condizioni).toEqual([{ tipo: 'stagione', stagione: 'estate', testo: 'solo in estate' }]);
    // esportazione e reimportazione conservano le condizioni; una voce non calcolabile nel pacchetto viene scartata
    const pacchetto = (await request(app).get('/api/mappe/esporta?radice=prova-condizioni')).body.data as EsportazioneMappeDto;
    expect(pacchetto.mappe[0].spilli[0].condizioni).toEqual([{ tipo: 'stagione', stagione: 'estate' }]);
    pacchetto.mappe[0].chiave = 'prova-condizioni-copia';
    (pacchetto.mappe[0].spilli[0].condizioni as unknown[]).push({ tipo: 'manuale', testo: 'scartata' });
    expect((await request(app).post('/api/mappe/importa').send({ pacchetto, sovrascrivi: true })).status).toBe(200);
    const copia = (await request(app).get('/api/mappe/prova-condizioni-copia')).body.data as MappaDto;
    expect(copia.spilli[0].condizioni).toEqual([{ tipo: 'stagione', stagione: 'estate', testo: 'solo in estate' }]);
    expect((await request(app).delete('/api/mappe/prova-condizioni-copia')).status).toBe(204);
    expect((await request(app).delete('/api/mappe/prova-condizioni')).status).toBe(204);
  });

  it('uno spillo del seed a cui l’utente aggiunge condizioni sopravvive al reseed senza doppioni; date e periodi impossibili sono rifiutati', async () => {
    // date inesistenti nel calendario di gioco e periodi con la fine prima dell'inizio → 400
    const invia = (c: unknown) => request(app).post('/api/mappe/citta-yongen-jaya/spilli').send({ tipo: 'nota', nome: 'x', x: 1, y: 1, condizioni: [c] });
    expect((await invia({ tipo: 'data', dal: '04-31' })).status).toBe(400);
    expect((await invia({ tipo: 'intervallo', dal: '08-20', al: '06-01' })).status).toBe(400);
    expect((await invia({ tipo: 'palazzo', dungeon: 'mementos' })).status).toBe(404);
    // lo spillo del seed «Poliziotto Dialogo» riceve una condizione: diventa dell'utente ma ricorda com'era
    const yongen = (await request(app).get('/api/mappe/citta-yongen-jaya')).body.data as MappaDto;
    const poliziotto = yongen.spilli.find((s) => s.nome === 'Poliziotto Dialogo')!;
    expect(poliziotto.origine).toBe('seed');
    const modificato = (await request(app).put(`/api/mappe/spilli/${poliziotto.id}`).send({ condizioni: [{ tipo: 'data', dal: '06-18' }] })).body.data as SpilloDto;
    expect(modificato).toMatchObject({ origine: 'utente', condizioni: [{ tipo: 'data', dal: '06-18', testo: 'dal 18 giugno' }] });
    // reseed forzato (cambio di hash): il pacchetto non reinserisce l'originale, la condizione resta, nessun doppione
    caricaSeed(getDb(), DIR_SEED, true);
    const dopo = (await request(app).get('/api/mappe/citta-yongen-jaya')).body.data as MappaDto;
    expect(dopo.spilli).toHaveLength(yongen.spilli.length);
    expect(dopo.spilli.filter((s) => s.nome === 'Poliziotto Dialogo')).toHaveLength(1);
    expect(dopo.spilli.find((s) => s.nome === 'Poliziotto Dialogo')).toMatchObject({ id: poliziotto.id, origine: 'utente', condizioni: [{ tipo: 'data', dal: '06-18', testo: 'dal 18 giugno' }] });
    // riportato senza condizioni resta dell'utente e il reseed continua a non duplicarlo
    await request(app).put(`/api/mappe/spilli/${poliziotto.id}`).send({ condizioni: [] });
    caricaSeed(getDb(), DIR_SEED, true);
    expect(((await request(app).get('/api/mappe/citta-yongen-jaya')).body.data as MappaDto).spilli.filter((s) => s.nome === 'Poliziotto Dialogo')).toHaveLength(1);
  });

  it('l’importazione scarta e conta le condizioni con chiavi assenti dalla Guida invece di nascondere lo spillo per sempre', async () => {
    const pacchetto: EsportazioneMappeDto = { versione: 1, mappe: [{ chiave: 'prova-import-condizioni', nome: 'Prova import', tipo: 'luogo', genitore: 'citta-shibuya', ordine: 0, immagine: null, asset: null, larghezza: null, altezza: null, entita: null, note: '',
      spilli: [{ tipo: 'nota', nome: 'Spillo importato', descrizione: '', x: 10, y: 10, riferimento: null, collezionabile: false, ordine: 0, condizioni: [{ tipo: 'confidente', confidente: 'nessuno', rango: 1 }, { tipo: 'palazzo', dungeon: 'kamoshida' }, { tipo: 'intervallo', dal: '08-20', al: '06-01' }, { tipo: 'quartiere', quartiere: 'ueno' }] }] }] };
    const esito = (await request(app).post('/api/mappe/importa').send({ pacchetto, sovrascrivi: true })).body.data as { spilli: number; condizioniScartate: number };
    expect(esito.spilli).toBe(1);
    expect(esito.condizioniScartate).toBe(2);
    const mappa = (await request(app).get(`/api/mappe/prova-import-condizioni?partita=${partitaId}`)).body.data as MappaDto;
    // resta solo la condizione valida (il periodo invertito è scartato dalla normalizzazione; Confidente sconosciuto e quartiere senza data dal controllo sulla Guida)
    expect(mappa.spilli[0].condizioni).toEqual([{ tipo: 'palazzo', dungeon: 'kamoshida', testo: 'dopo il Palazzo di Kamoshida' }]);
    expect(mappa.spilli[0].disponibilita?.requisiti).toHaveLength(1);
    expect((await request(app).delete('/api/mappe/prova-import-condizioni')).status).toBe(204);
  });

  it('dimensioniImmagine legge le intestazioni PNG, GIF, JPEG e WEBP', () => {
    expect(dimensioniImmagine(PNG_2x3)).toEqual({ larghezza: 2, altezza: 3 });
    expect(dimensioniImmagine(Buffer.concat([Buffer.from('GIF89a'), Buffer.from([0x10, 0x00, 0x20, 0x00, 0, 0, 0, 0])]))).toEqual({ larghezza: 16, altezza: 32 });
    // JPEG: SOI, APP0 vuoto, SOF0 con altezza 40 e larghezza 60
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8]), Buffer.from([0xff, 0xe0, 0x00, 0x02]), Buffer.from([0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x28, 0x00, 0x3c, 0x01, 0x01, 0x11, 0x00]), Buffer.from([0xff, 0xd9])]);
    expect(dimensioniImmagine(jpeg)).toEqual({ larghezza: 60, altezza: 40 });
    // WEBP VP8X: dimensioni (larghezza − 1, altezza − 1) su 3 byte little-endian
    const vp8x = Buffer.alloc(30);
    vp8x.write('RIFF', 0); vp8x.write('WEBP', 8); vp8x.write('VP8X', 12); vp8x.writeUIntLE(99, 24, 3); vp8x.writeUIntLE(49, 27, 3);
    expect(dimensioniImmagine(vp8x)).toEqual({ larghezza: 100, altezza: 50 });
    expect(dimensioniImmagine(Buffer.from('non è un\'immagine'))).toBeNull();
  });
});
