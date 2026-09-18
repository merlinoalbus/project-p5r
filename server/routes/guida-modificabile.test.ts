// ============================================================
// La sezione dei Palazzi non è più in sola lettura
// ============================================================
//
// Negozi, luoghi, libri e film avevano il loro modulo da un pezzo; dungeon, aree e punti si
// potevano solo guardare, e una trascrizione fatta a mano da un sito ha refusi e frasi tagliate.
// Qui si prova che si correggono davvero, e che quel che si scrive resta nei dati di gioco.
// ============================================================

import request from 'supertest';
import { closeDb, initDb, prepared } from '../db/dbService.js';
import { caricaPacchetto } from '../services/pacchetto/pacchettoGioco.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import { bodyAggiornaMappa } from '../schemas/mappe.js';
import { LIMITI_GUIDA } from '../../shared/limitiGuida.js';
import { creaMappa, aggiornaPresentazioneMappa } from '../services/mappe/mappeService.js';
import { dettaglioDungeon } from '../services/dungeonService.js';
import type { AreaDungeonDto, DungeonDettaglioDto, PuntoInteresseDto } from '../../shared/types.js';

const app = createApp();

describe('correzione dei testi della guida', () => {
  beforeAll(() => { caricaPacchetto(initDb(':memory:')); invalidaCacheTraduzioni(); });
  afterAll(() => closeDb());

  it('i testi del Palazzo si correggono e restano', async () => {
    const r = await request(app).put('/api/compendio/dungeon/kamoshida').send({ nome: 'Castello di Kamoshida', note: 'Nota mia.' });
    expect(r.status).toBe(200);
    expect((r.body.data as DungeonDettaglioDto).nome).toBe('Castello di Kamoshida');
    expect(dettaglioDungeon('kamoshida').note).toBe('Nota mia.');
    // un nome vuoto non cancella il nome
    await request(app).put('/api/compendio/dungeon/kamoshida').send({ nome: '   ' }).expect(400);
  });

  it('nome e descrizione di un’area si correggono dalla scheda', async () => {
    const area = dettaglioDungeon('kamoshida').aree[0];
    const r = await request(app).put(`/api/compendio/aree/${area.chiave}`).send({ nome: 'Cancello', descrizione: 'Si entra da qui.' });
    expect(r.status).toBe(200);
    expect(r.body.data as AreaDungeonDto).toMatchObject({ nome: 'Cancello', descrizione: 'Si entra da qui.' });
  });

  it('un punto della guida si aggiunge, si corregge e si toglie', async () => {
    const area = dettaglioDungeon('kamoshida').aree[0];
    const creato = (await request(app).post(`/api/compendio/aree/${area.chiave}/punti`).send({ nome: 'Sicura dietro la statua', tipo: 'sicura' }).expect(201)).body.data as PuntoInteresseDto;
    expect(creato.nome).toBe('Sicura dietro la statua');
    expect(dettaglioDungeon('kamoshida').aree[0].punti.some((p) => p.chiave === creato.chiave)).toBe(true);

    const corretto = (await request(app).put(`/api/compendio/punti/${creato.chiave}`).send({ descrizione: 'Dietro la statua a destra.', tipo: 'forziere', esauribile: true }).expect(200)).body.data as PuntoInteresseDto;
    expect(corretto).toMatchObject({ tipo: 'forziere', esauribile: true, descrizione: 'Dietro la statua a destra.' });

    await request(app).delete(`/api/compendio/punti/${creato.chiave}`).expect(204);
    expect(dettaglioDungeon('kamoshida').aree[0].punti.some((p) => p.chiave === creato.chiave)).toBe(false);
  });

  it('eliminando un punto se ne va anche il «raccolto» del suo spillo', async () => {
    const partita = (await request(app).post('/api/partite').send({ nome: 'Correzioni' })).body.data as { id: number };
    // un punto della guida agganciato a uno spillo collezionabile, segnato raccolto dalla partita
    const spillo = prepared("SELECT id, uid, riferimento_chiave FROM spillo WHERE riferimento_tipo = 'punto' AND uid IS NOT NULL AND collezionabile = 1 LIMIT 1").get() as { id: number; uid: string; riferimento_chiave: string } | undefined;
    expect(spillo, 'il pacchetto deve avere almeno uno spillo collegato a un punto').toBeTruthy();
    await request(app).put(`/api/partite/${partita.id}/spilli/${spillo!.id}`).send({ raccolto: true }).expect(200);
    expect(prepared('SELECT 1 FROM spillo_partita WHERE partita_id = ? AND spillo_uid = ?').get(partita.id, spillo!.uid)).toBeTruthy();

    await request(app).delete(`/api/compendio/punti/${encodeURIComponent(spillo!.riferimento_chiave)}`).expect(204);
    // lo spillo resta sulla mappa senza riferimento, ma il suo «raccolto» non conta più niente
    expect(prepared('SELECT riferimento_tipo FROM spillo WHERE id = ?').get(spillo!.id)).toMatchObject({ riferimento_tipo: null });
    expect(prepared('SELECT 1 FROM spillo_partita WHERE partita_id = ? AND spillo_uid = ?').get(partita.id, spillo!.uid)).toBeUndefined();
  });

  it('un punto inesistente non si corregge', async () => {
    await request(app).put('/api/compendio/punti/mai-esistito').send({ nome: 'X' }).expect(404);
  });
});

describe('raggruppamento delle planimetrie', () => {
  beforeAll(() => { caricaPacchetto(initDb(':memory:')); invalidaCacheTraduzioni(); });
  afterAll(() => closeDb());

  const gruppoDi = (chiave: string) => {
    const r = prepared('SELECT gruppo_immagini_json FROM mappa_presentazione WHERE mappa_chiave = ?').get(chiave) as { gruppo_immagini_json: string | null } | undefined;
    return r?.gruppo_immagini_json ? JSON.parse(r.gruppo_immagini_json) as { id: string; nome: string; etichetta?: string } : null;
  };

  it('due tavole si dichiarano la stessa stanza, e il nome vale per tutte', async () => {
    const una = creaMappa(undefined, { nome: 'Sala A', tipo: 'area', genitore: 'dungeon-kamoshida' });
    const altra = creaMappa(undefined, { nome: 'Sala A bis', tipo: 'area', genitore: 'dungeon-kamoshida' });
    aggiornaPresentazioneMappa(una.chiave, { gruppoNome: 'Sala del trono', etichetta: 'pianta completa' });
    const id = gruppoDi(una.chiave)!.id;
    await request(app).put(`/api/mappe/${altra.chiave}/presentazione`).send({ gruppoId: id, etichetta: 'porzione nord' }).expect(200);
    expect(gruppoDi(altra.chiave)).toMatchObject({ id, nome: 'Sala del trono', etichetta: 'porzione nord' });

    // rinominare la stanza da una tavola la rinomina su tutte
    await request(app).put(`/api/mappe/${altra.chiave}/presentazione`).send({ gruppoNome: 'Sala del trono — piano alto' }).expect(200);
    expect(gruppoDi(una.chiave)!.nome).toBe('Sala del trono — piano alto');
    expect(gruppoDi(altra.chiave)!.etichetta).toBe('porzione nord');
  });

  it('una tavola può uscire dal raggruppamento e tornare a stare da sola', async () => {
    const sola = creaMappa(undefined, { nome: 'Sala B', tipo: 'area', genitore: 'dungeon-kamoshida' });
    aggiornaPresentazioneMappa(sola.chiave, { gruppoNome: 'Un gruppo' });
    expect(gruppoDi(sola.chiave)).not.toBeNull();
    await request(app).put(`/api/mappe/${sola.chiave}/presentazione`).send({ gruppoId: null }).expect(200);
    expect(gruppoDi(sola.chiave)).toBeNull();
  });
});

// ---- Il caso che era rotto: aprire la matita e salvare senza cambiare niente ----
//
// Il primo giro aveva tetti scelti a occhio (200 caratteri sul livello consigliato, dove la guida
// ne scrive 352): siccome il modulo rimanda indietro anche i campi non toccati, la scheda di un
// Palazzo non si poteva salvare affatto. Questo test risalva ogni Palazzo così com'è: se un dato
// nuovo supera un tetto, si rompe qui e non in mano a chi gioca.

describe('i testi della guida si possono risalvare così come sono', () => {
  beforeAll(() => { caricaPacchetto(initDb(':memory:')); invalidaCacheTraduzioni(); });
  afterAll(() => closeDb());

  it('ogni Palazzo, con le sue aree e i suoi punti, passa la validazione senza modifiche', async () => {
    const dungeon = prepared('SELECT chiave FROM dungeon').all() as Array<{ chiave: string }>;
    expect(dungeon.length).toBeGreaterThan(0);
    for (const { chiave } of dungeon) {
      const d = dettaglioDungeon(chiave);
      await request(app).put(`/api/compendio/dungeon/${chiave}`).send({
        nome: d.nome, sovrano: d.sovrano, dataSblocco: d.date.sblocco, dataScadenza: d.date.scadenza,
        furtoConsigliato: d.date.furtoConsigliato, livelloConsigliato: d.livelloConsigliato, note: d.note,
      }).expect(200);
      for (const a of d.aree) {
        await request(app).put(`/api/compendio/aree/${encodeURIComponent(a.chiave)}`).send({ nome: a.nome, descrizione: a.descrizione }).expect(200);
        for (const p of a.punti) {
          await request(app).put(`/api/compendio/punti/${encodeURIComponent(p.chiave)}`)
            .send({ nome: p.nome, descrizione: p.descrizione, tipo: p.tipo, esauribile: p.esauribile }).expect(200);
        }
      }
    }
  });

  it('anche il nome di ogni mappa dell’atlante sta dentro il tetto dello schema', () => {
    // qui basta lo schema: sono 333 mappe, e la rotta la provano già gli altri test
    const nomi = (prepared('SELECT nome FROM mappa').all() as Array<{ nome: string }>).map((m) => m.nome);
    expect(nomi.length).toBeGreaterThan(100);
    const fuori = nomi.filter((nome) => !bodyAggiornaMappa.safeParse({ nome }).success);
    expect(fuori).toEqual([]);
  });
});

// ---- Un tetto solo, condiviso fra il modulo e la rotta ----
//
// I tetti erano scritti due volte — nello schema e nel `maxLength` del campo — e si sono subito
// disallineati: il campo lasciava scrivere mille caratteri dove la rotta ne accettava duecento, e
// il salvataggio tornava indietro con un 400 (rilievo della revisione, 2026-09-18). Ora `LIMITI_GUIDA`
// è l'unica fonte, e qui si prova che ogni rotta accetta esattamente quella lunghezza e rifiuta il
// carattere in più.

describe('i tetti dei campi valgono davvero, e sono quelli condivisi', () => {
  beforeAll(() => { caricaPacchetto(initDb(':memory:')); invalidaCacheTraduzioni(); });
  afterAll(() => closeDb());

  const lungo = (n: number) => 'x'.repeat(n);

  it('il Palazzo accetta il massimo dichiarato e rifiuta un carattere in più', async () => {
    await request(app).put('/api/compendio/dungeon/kamoshida').send({ nome: lungo(LIMITI_GUIDA.dungeon.nome) }).expect(200);
    await request(app).put('/api/compendio/dungeon/kamoshida').send({ nome: lungo(LIMITI_GUIDA.dungeon.nome + 1) }).expect(400);
    await request(app).put('/api/compendio/dungeon/kamoshida').send({ sovrano: lungo(LIMITI_GUIDA.dungeon.sovrano) }).expect(200);
    await request(app).put('/api/compendio/dungeon/kamoshida').send({ sovrano: lungo(LIMITI_GUIDA.dungeon.sovrano + 1) }).expect(400);
    await request(app).put('/api/compendio/dungeon/kamoshida').send({ livelloConsigliato: lungo(LIMITI_GUIDA.dungeon.livello) }).expect(200);
    await request(app).put('/api/compendio/dungeon/kamoshida').send({ note: lungo(LIMITI_GUIDA.dungeon.note) }).expect(200);
  });

  it('area, punto e mappa seguono gli stessi tetti', async () => {
    const area = dettaglioDungeon('kamoshida').aree[0];
    await request(app).put(`/api/compendio/aree/${encodeURIComponent(area.chiave)}`).send({ nome: lungo(LIMITI_GUIDA.area.nome) }).expect(200);
    await request(app).put(`/api/compendio/aree/${encodeURIComponent(area.chiave)}`).send({ nome: lungo(LIMITI_GUIDA.area.nome + 1) }).expect(400);
    const punto = dettaglioDungeon('kamoshida').aree[0].punti[0];
    await request(app).put(`/api/compendio/punti/${encodeURIComponent(punto.chiave)}`).send({ descrizione: lungo(LIMITI_GUIDA.punto.descrizione) }).expect(200);
    const mappa = creaMappa(undefined, { nome: 'Tetti', tipo: 'area', genitore: 'dungeon-kamoshida' });
    // il nome di una mappa entra nella chiave del percorso: il tetto dello schema è il massimo
    // teorico, ma dentro un Palazzo c'è già il prefisso, e quel che non ci sta lo dice il server
    await request(app).put(`/api/mappe/${mappa.chiave}`).send({ nome: lungo(120) }).expect(200);
    await request(app).put(`/api/mappe/${mappa.chiave}`).send({ nome: lungo(LIMITI_GUIDA.mappa.nome + 1) }).expect(400);
    const troppo = await request(app).put(`/api/mappe/${mappa.chiave}`).send({ nome: lungo(LIMITI_GUIDA.mappa.nome) });
    if (troppo.status !== 200) {
      // non un errore qualsiasi: dice che cosa fare
      expect(troppo.body.error.code).toBe('percorso-troppo-lungo');
      expect(troppo.body.error.message).toMatch(/Abbrevia/);
    }
    await request(app).put(`/api/mappe/${mappa.chiave}/presentazione`).send({ etichetta: lungo(LIMITI_GUIDA.mappa.etichetta) }).expect(200);
  });
});
