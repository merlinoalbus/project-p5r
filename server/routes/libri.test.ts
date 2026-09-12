// ============================================================
// Test API Libri — avanzamento, completamento canonico e fonti territoriali
// ============================================================

import request from 'supertest';
import { closeDb, getDb, initDb } from '../db/dbService.js';
import { caricaPacchetto, ricaricaPacchetto } from '../services/pacchetto/pacchettoGioco.js';
import { statoDisponibilitaPartita } from '../services/disponibilitaService.js';
import { createApp } from '../bootstrap.js';
import type { LibriDto, LibroDto, StoricoDto } from '../../shared/types.js';

const app = createApp();

describe('API Libri', () => {
  beforeAll(() => { const db = initDb(':memory:'); caricaPacchetto(db); });
  afterAll(() => closeDb());

  it('espone il catalogo completo senza inventare uno stato di partita e valida tutte le posizioni', async () => {
    const d = (await request(app).get('/api/compendio/libri')).body.data as LibriDto;
    expect(d.libri).toHaveLength(46);
    expect(d).toMatchObject({ completati: 0, sessioniFatte: 0, sessioniTotali: 74 });
    expect(d.libri.every((l) => l.progresso === 0 && !l.fatto && l.totaleSessioni >= 1)).toBe(true);
    expect(d.libri.every((l) => l.posizioni.length >= 1)).toBe(true);
    expect(d.libri.find((l) => l.chiave === 'vague')?.posizioni).toEqual([{ tipo: 'negozio', chiave: 'libreria-taiheido', etichetta: 'Libreria Taiheido' }]);
    expect((await request(app).get('/api/compendio/libri?partita=99999')).status).toBe(404);
  });

  it('registra 0, parziale, totale e riduzione senza sbloccare prima del completamento', async () => {
    const id = ((await request(app).post('/api/partite').send({ nome: 'Progresso libri', dataGioco: '12-15' })).body.data as { id: number }).id;
    const chiave = 'il-magnifico-ladro';
    let r = (await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'libro', chiave, avanzamento: 1 })).body.data as LibroDto;
    expect(r).toMatchObject({ progresso: 1, totaleSessioni: 2, fatto: false });
    expect(statoDisponibilitaPartita(id).letture?.has(`libro/${chiave}`)).toBe(false);
    expect((getDb().prepare("SELECT COUNT(*) n FROM lettura_partita WHERE partita_id=? AND tipo='libro' AND chiave=?").get(id, chiave) as { n: number }).n).toBe(0);

    r = (await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'libro', chiave, avanzamento: 2 })).body.data as LibroDto;
    expect(r).toMatchObject({ progresso: 2, fatto: true });
    expect(statoDisponibilitaPartita(id).letture?.has(`libro/${chiave}`)).toBe(true);
    await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'libro', chiave, avanzamento: 2 });
    let storico = (await request(app).get(`/api/partite/${id}/storico?tipi=lettura`)).body.data as StoricoDto;
    expect(storico.totale).toBe(1);

    r = (await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'libro', chiave, avanzamento: 1 })).body.data as LibroDto;
    expect(r).toMatchObject({ progresso: 1, fatto: false });
    await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'libro', chiave, fatto: true });
    storico = (await request(app).get(`/api/partite/${id}/storico?tipi=lettura`)).body.data as StoricoDto;
    expect(storico.totale).toBe(2);
    r = (await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'libro', chiave, fatto: false })).body.data as LibroDto;
    expect(r).toMatchObject({ progresso: 0, fatto: false });
  });

  it('rifiuta contratti ambigui e avanzamenti fuori dal totale', async () => {
    const id = ((await request(app).post('/api/partite').send({ nome: 'Validazione libri' })).body.data as { id: number }).id;
    const url = `/api/partite/${id}/letture`;
    expect((await request(app).put(url).send({ tipo: 'libro', chiave: 'il-magnifico-ladro' })).status).toBe(400);
    expect((await request(app).put(url).send({ tipo: 'libro', chiave: 'il-magnifico-ladro', fatto: true, avanzamento: 2 })).status).toBe(400);
    expect((await request(app).put(url).send({ tipo: 'libro', chiave: 'il-magnifico-ladro', avanzamento: 1.5 })).status).toBe(400);
    expect((await request(app).put(url).send({ tipo: 'libro', chiave: 'il-magnifico-ladro', avanzamento: 3 })).status).toBe(400);
    expect((await request(app).put(url).send({ tipo: 'film', chiave: 'x', avanzamento: 1 })).status).toBe(404);
  });

  it('clampa un progresso quando il seed riduce il totale senza dichiararlo completato', async () => {
    const id = ((await request(app).post('/api/partite').send({ nome: 'Clamp libri' })).body.data as { id: number }).id;
    await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'libro', chiave: 'spadaccino-provetto', avanzamento: 2 });
    getDb().prepare("UPDATE libro SET sessioni=1 WHERE chiave='spadaccino-provetto'").run();
    let libro = ((await request(app).get(`/api/compendio/libri?partita=${id}`)).body.data as LibriDto).libri.find((l) => l.chiave === 'spadaccino-provetto')!;
    expect(libro).toMatchObject({ progresso: 1, totaleSessioni: 1, fatto: false });
    libro = (await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'libro', chiave: 'spadaccino-provetto', avanzamento: 1 })).body.data as LibroDto;
    expect(libro.fatto).toBe(true);
    // il libro torna com'era: le prove seguenti contano su un libro da tre sessioni senza condizioni
    getDb().prepare("UPDATE libro SET sessioni=3 WHERE chiave='spadaccino-provetto'").run();
  });

  /* «Lettura rapida» raddoppia la velocità di lettura, e l'app lo dichiarava senza applicarlo.
   *
   * Il come è la parte che conta, e la prima stesura l'aveva sbagliata dimezzando il requisito di
   * ogni libro: **l'effetto non è retroattivo**. Con quel modello, finire «Lettura rapida» avrebbe
   * completato da solo i libri lasciati a metà — due sessioni su tre diventano due su due — e nel
   * gioco non succede: quelle due sessioni le hai lette alla velocità di prima, e restano due.
   *
   * Quel che raddoppia è quanto rende un pomeriggio **da qui in avanti**. Il requisito del libro
   * non si muove, e non si muove nemmeno quel che hai già letto; a muoversi è il passo. */
  describe('«Lettura rapida»', () => {
    const libri = async (id: number) => (await request(app).get(`/api/compendio/libri?partita=${id}`)).body.data as LibriDto;
    const trova = (d: LibriDto, chiave: string) => d.libri.find((l) => l.chiave === chiave)!;
    // «Lettura rapida» esce il 1º luglio: la partita sta oltre, e un libro da tre sessioni ancora bloccato (un prerequisito) non si può leggere
    const nuovaPartita = async (nome: string) => ((await request(app).post('/api/partite').send({ nome, dataGioco: '12-15' })).body.data as { id: number }).id;
    const leggi = (id: number, chiave: string, avanzamento: number) =>
      request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'libro', chiave, avanzamento });

    it('viene dichiarato appena il libro è letto, e non prima', async () => {
      const id = await nuovaPartita('Lettura rapida');
      expect((await libri(id)).letturaRapida).toBe(false);
      await leggi(id, 'lettura-rapida', 1);
      expect((await libri(id)).letturaRapida).toBe(true);
      // Toglierlo lo riporta indietro: è uno stato della partita, non un interruttore a senso unico.
      await leggi(id, 'lettura-rapida', 0);
      expect((await libri(id)).letturaRapida).toBe(false);
    });

    it('non tocca i requisiti né quello che hai già letto', async () => {
      const id = await nuovaPartita('Lettura rapida non retroattiva');
      const prima = await libri(id);
      const daTre = prima.libri.find((l) => l.sessioni === 3 && l.disponibilita?.stato !== 'bloccato')!;
      await leggi(id, daTre.chiave, 2);

      await leggi(id, 'lettura-rapida', 1);

      const dopo = await libri(id);
      // Il libro chiede ancora tre sessioni, e le due già lette valgono ancora due: né il requisito
      // cala, né il libro si completa da solo. Se lo facesse, l'app regalerebbe una lettura.
      expect(trova(dopo, daTre.chiave)).toMatchObject({ progresso: 2, totaleSessioni: 3, fatto: false });
      // E il totale complessivo resta quello che era, meno nulla.
      expect(dopo.sessioniTotali).toBe(prima.sessioniTotali);
    });

    it('l’ultimo pomeriggio chiude il libro perché ne vale due', async () => {
      const id = await nuovaPartita('Lettura rapida passo doppio');
      const daTre = (await libri(id)).libri.find((l) => l.sessioni === 3 && l.disponibilita?.stato !== 'bloccato')!;
      await leggi(id, daTre.chiave, 1);
      await leggi(id, 'lettura-rapida', 1);
      // Una sessione sola, che ne vale due: da 1 si arriva a 3, cioè al totale. Il passo lo mette
      // la pagina; qui si sorveglia che il server accetti il salto e registri la lettura.
      const esito = await leggi(id, daTre.chiave, 3);
      expect(esito.status).toBe(200);
      expect(trova(await libri(id), daTre.chiave)).toMatchObject({ progresso: 3, totaleSessioni: 3, fatto: true });
    });

    it('il tetto resta il requisito del libro, prima e dopo', async () => {
      const id = await nuovaPartita('Lettura rapida tetto');
      const daTre = (await libri(id)).libri.find((l) => l.sessioni === 3 && l.disponibilita?.stato !== 'bloccato')!;
      await leggi(id, 'lettura-rapida', 1);
      expect((await leggi(id, daTre.chiave, 4)).status).toBe(400);
      expect((await leggi(id, daTre.chiave, 3)).status).toBe(200);
    });
  });

  it('mantiene progresso e posizioni al reseed e cancella il progresso insieme alla partita', async () => {
    const id = ((await request(app).post('/api/partite').send({ nome: 'Persistenza libri', dataGioco: '12-15' })).body.data as { id: number }).id;
    await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'libro', chiave: 'il-magnifico-ladro', avanzamento: 1 });
    ricaricaPacchetto(getDb());
    const d = (await request(app).get(`/api/compendio/libri?partita=${id}`)).body.data as LibriDto;
    expect(d.libri.find((l) => l.chiave === 'il-magnifico-ladro')?.progresso).toBe(1);
    expect((getDb().prepare('SELECT COUNT(*) n FROM libro_posizione').get() as { n: number }).n).toBe(48);
    await request(app).delete(`/api/partite/${id}`);
    expect((getDb().prepare('SELECT COUNT(*) n FROM progresso_libro_partita WHERE partita_id=?').get(id) as { n: number }).n).toBe(0);
  });
});

describe('API Libri — disponibilità', () => {
  beforeAll(() => { const db = initDb(':memory:'); caricaPacchetto(db); });
  afterAll(() => closeDb());
// ============================================================
// La disponibilità di un libro non è più prosa che nessuno legge (migrazione 052)
// ============================================================
//
// «dal 18 aprile» stava scritto nella scheda e basta: l'elenco mostrava come già acquistabile un
// volume che esce mesi dopo. Ora la prosa diventa una regola e la partita la valuta. Il caso
// dell'11 aprile è quello reale della partita di prova dell'utente.
it('un libro che esce il 18 aprile risulta «non ancora» l’11 aprile e disponibile dopo', async () => {
  const partita = await request(app).post('/api/partite').send({ nome: 'Prova condizioni', dataGioco: '04-11' }).expect(201);
  const id = (partita.body.data as { id: number }).id;

  const prima = await request(app).get(`/api/compendio/libri?partita=${id}`).expect(200);
  const magnifico = (prima.body.data.libri as Array<{ chiave: string; disponibilita: { stato: string } | null }>).find((l) => l.chiave === 'il-magnifico-ladro');
  expect(magnifico?.disponibilita?.stato, 'l’11 aprile il libro non è ancora in vendita').toBe('bloccato');

  await request(app).put(`/api/partite/${id}`).send({ dataGioco: '05-20' }).expect(200);
  const dopo = await request(app).get(`/api/compendio/libri?partita=${id}`).expect(200);
  const stesso = (dopo.body.data.libri as Array<{ chiave: string; disponibilita: { stato: string } | null }>).find((l) => l.chiave === 'il-magnifico-ladro');
  expect(stesso?.disponibilita?.stato, 'dal 20 maggio invece c’è').toBe('disponibile');
});
});
