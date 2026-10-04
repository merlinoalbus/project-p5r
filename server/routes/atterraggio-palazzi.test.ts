// ============================================================
// Il Palazzo sulla mappa di Tokyo: quando compare e dove si atterra toccandolo (richiesta dell'utente, 2026-10-04)
// ============================================================
//
// «Devi visualizzare l'icona e permettermi di valorizzare per fasce temporali o giorni specifici il punto di atterraggio
// dell'icona della mappa rispetto al mappamondo delle planimetrie.» La finestra (voce di `finestre-dungeon`) si cambia con
// `PUT /dungeon/:chiave/finestra`; le regole d'atterraggio (`dungeon_atterraggio`, 097) con `PUT /dungeon/:chiave/atterraggi`, e
// il riassunto del Palazzo dice dove si atterra nel giorno della partita: la prima regola che lo copre.
// ============================================================

import request from 'supertest';
import { closeDb, getDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { creaMappa, creaSpillo, eliminaMappa, eliminaSpillo, esportaMappe, importaMappe } from '../services/mappe/mappeService.js';
import { regolaCopre } from '../services/atterraggioPalazziService.js';
import { finestreDungeon } from '../services/datiGuida.js';
import { migration097 } from '../db/migrations/097_atterraggio_palazzi.js';
import type { DungeonRiassuntoDto, MappaDto } from '../../shared/types.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();

/** Il riassunto di Kamoshida nell'elenco dei Palazzi, con o senza partita. */
async function kamoshida(partita?: number): Promise<DungeonRiassuntoDto> {
  const r = await request(app).get(`/api/compendio/dungeon${partita ? `?partita=${partita}` : ''}`).expect(200);
  return (r.body.data as DungeonRiassuntoDto[]).find((d) => d.chiave === 'kamoshida')!;
}

describe('regolaCopre: quando vale una regola, nel calendario di gioco', () => {
  it('senza date sempre; col solo inizio da lì in poi (anche dopo capodanno); con inizio e fine fra i due, estremi compresi', () => {
    expect(regolaCopre({ dal: null, al: null }, '04-11')).toBe(true);
    expect(regolaCopre({ dal: null, al: null }, '03-20')).toBe(true);
    expect(regolaCopre({ dal: '04-13', al: null }, '04-12')).toBe(false);
    expect(regolaCopre({ dal: '04-13', al: null }, '04-13')).toBe(true);
    // gennaio viene dopo aprile nel calendario di gioco
    expect(regolaCopre({ dal: '04-13', al: null }, '01-05')).toBe(true);
    expect(regolaCopre({ dal: '04-11', al: '04-11' }, '04-11')).toBe(true);
    expect(regolaCopre({ dal: '04-11', al: '04-11' }, '04-12')).toBe(false);
    expect(regolaCopre({ dal: '12-20', al: '01-10' }, '01-02')).toBe(true);
    expect(regolaCopre({ dal: '12-20', al: '01-10' }, '01-11')).toBe(false);
  });
});

describe('finestra e atterraggio dei Palazzi sulla mappa di Tokyo', () => {
  let prigione: MappaDto;
  let sala: MappaDto;
  let ingresso: MappaDto;
  let altrove: MappaDto;
  let pinPrigione: number;
  let pinSala: number;
  let partita: number;

  beforeAll(async () => {
    dbDiProva();
    prigione = creaMappa(undefined, { nome: 'Prova prigione del tutorial', tipo: 'area', genitore: 'dungeon-kamoshida' });
    sala = creaMappa(undefined, { nome: 'Prova sala del 12 aprile', tipo: 'area', genitore: 'dungeon-kamoshida' });
    ingresso = creaMappa(undefined, { nome: 'Prova ingresso del castello', tipo: 'area', genitore: 'dungeon-kamoshida' });
    altrove = creaMappa(undefined, { nome: 'Galleria di prova', tipo: 'area', genitore: 'dungeon-madarame' });
    pinPrigione = creaSpillo(prigione.chiave, { tipo: 'nota', nome: 'Cella', x: 30, y: 40 } as Parameters<typeof creaSpillo>[1]).id;
    pinSala = creaSpillo(sala.chiave, { tipo: 'nota', nome: 'Sala Centrale', x: 50, y: 50 } as Parameters<typeof creaSpillo>[1]).id;
    partita = ((await request(app).post('/api/partite').send({ nome: 'Prova atterraggio' })).body.data as { id: number }).id;
  });
  afterAll(() => closeDb());

  it('097 porta la finestra di Kamoshida all\'11 aprile; la finestra si cambia, anche senza fine, e torna nel riassunto', async () => {
    expect(finestreDungeon().get('kamoshida')).toEqual({ dal: '04-11', al: '05-02' });
    expect((await kamoshida()).finestra).toEqual({ dal: '04-11', al: '05-02' });
    const r = await request(app).put('/api/compendio/dungeon/kamoshida/finestra').send({ dal: '04-10', al: null }).expect(200);
    expect(r.body.data).toEqual({ dal: '04-10', al: null });
    expect((await kamoshida()).finestra).toEqual({ dal: '04-10', al: null });
    // le altre voci del blocco restano com'erano
    expect(finestreDungeon().get('madarame')).toBeTruthy();
    await request(app).put('/api/compendio/dungeon/kamoshida/finestra').send({ dal: '04-11', al: '05-02' }).expect(200);
    expect((await kamoshida()).finestra).toEqual({ dal: '04-11', al: '05-02' });
  });

  it('un Palazzo senza voce nella finestra ne riceve una', async () => {
    const blocco = JSON.parse(prepared("SELECT json FROM dati_guida WHERE chiave = 'finestre-dungeon'").pluck().get() as string) as { finestre: Array<{ dungeon: string }> };
    const senza = { ...blocco, finestre: blocco.finestre.filter((f) => f.dungeon !== 'madarame') };
    prepared("UPDATE dati_guida SET json = ? WHERE chiave = 'finestre-dungeon'").run(JSON.stringify(senza));
    await request(app).put('/api/compendio/dungeon/madarame/finestra').send({ dal: '05-05', al: '06-05' }).expect(200);
    expect(finestreDungeon().get('madarame')).toEqual({ dal: '05-05', al: '06-05' });
    prepared("UPDATE dati_guida SET json = ? WHERE chiave = 'finestre-dungeon'").run(JSON.stringify(blocco));
  });

  it('la finestra rifiuta date impossibili, fine prima dell\'inizio e dungeon che non esistono', async () => {
    expect((await request(app).put('/api/compendio/dungeon/kamoshida/finestra').send({ dal: '02-30', al: null })).body.error.code).toBe('data-non-valida');
    expect((await request(app).put('/api/compendio/dungeon/kamoshida/finestra').send({ dal: '05-02', al: '04-11' })).body.error.code).toBe('fine-prima-di-inizio');
    expect((await request(app).put('/api/compendio/dungeon/nessuno/finestra').send({ dal: '04-11', al: null })).status).toBe(404);
    expect((await request(app).put('/api/compendio/dungeon/kamoshida/finestra').send({ dal: '4-11', al: null })).status).toBe(400);
    expect(finestreDungeon().get('kamoshida')).toEqual({ dal: '04-11', al: '05-02' });
  });

  it('le regole si salvano nell\'ordine dato, con nomi di planimetria e pin, e tornano nella scheda del Palazzo', async () => {
    const regole = [
      { dal: '04-11', al: '04-11', mappa: prigione.chiave, spillo: pinPrigione },
      { dal: '04-12', al: '04-12', mappa: sala.chiave, spillo: pinSala },
      { dal: null, al: null, mappa: ingresso.chiave, spillo: null },
    ];
    const r = await request(app).put('/api/compendio/dungeon/kamoshida/atterraggi').send({ regole }).expect(200);
    expect(r.body.data).toEqual([
      { dal: '04-11', al: '04-11', mappa: prigione.chiave, mappaNome: expect.stringContaining('Prova prigione del tutorial'), spillo: pinPrigione, spilloNome: 'Cella' },
      { dal: '04-12', al: '04-12', mappa: sala.chiave, mappaNome: expect.stringContaining('Prova sala del 12 aprile'), spillo: pinSala, spilloNome: 'Sala Centrale' },
      { dal: null, al: null, mappa: ingresso.chiave, mappaNome: expect.stringContaining('Prova ingresso del castello'), spillo: null, spilloNome: null },
    ]);
    const scheda = await request(app).get('/api/compendio/dungeon/kamoshida').expect(200);
    expect(scheda.body.data.atterraggi).toEqual(r.body.data);
  });

  it('dove si atterra dipende dal giorno della partita: vale la prima regola che lo copre; senza partita la regola «sempre»', async () => {
    /** Mette la partita di prova nel giorno dato (MM-GG). */
    const giorno = (g: string) => prepared('UPDATE partita SET data_gioco = ? WHERE id = ?').run(g, partita);
    giorno('04-11');
    expect((await kamoshida(partita)).atterraggio).toEqual({ mappa: prigione.chiave, spillo: pinPrigione });
    giorno('04-12');
    expect((await kamoshida(partita)).atterraggio).toEqual({ mappa: sala.chiave, spillo: pinSala });
    giorno('04-20');
    expect((await kamoshida(partita)).atterraggio).toEqual({ mappa: ingresso.chiave, spillo: null });
    expect((await kamoshida()).atterraggio).toEqual({ mappa: ingresso.chiave, spillo: null });
    // l'ordine conta: la regola «sempre» in cima vince su tutte
    await request(app).put('/api/compendio/dungeon/kamoshida/atterraggi').send({ regole: [
      { dal: null, al: null, mappa: ingresso.chiave, spillo: null },
      { dal: '04-11', al: '04-11', mappa: prigione.chiave, spillo: pinPrigione },
    ] }).expect(200);
    giorno('04-11');
    expect((await kamoshida(partita)).atterraggio).toEqual({ mappa: ingresso.chiave, spillo: null });
    // senza una regola che copra il giorno: nessun atterraggio (si apre la scheda del Palazzo)
    await request(app).put('/api/compendio/dungeon/kamoshida/atterraggi').send({ regole: [{ dal: '04-12', al: null, mappa: sala.chiave, spillo: null }] }).expect(200);
    expect((await kamoshida(partita)).atterraggio).toBeNull();
    expect((await kamoshida()).atterraggio).toBeNull();
    // gli altri Palazzi non ne hanno
    const tutti = (await request(app).get('/api/compendio/dungeon').expect(200)).body.data as DungeonRiassuntoDto[];
    expect(tutti.filter((d) => d.chiave !== 'kamoshida').every((d) => d.atterraggio === null)).toBe(true);
  });

  it('le regole sbagliate si rifiutano tutte prima di scrivere, e le salvate restano', async () => {
    const prima = (await request(app).get('/api/compendio/dungeon/kamoshida').expect(200)).body.data.atterraggi;
    /** Manda la regola sbagliata dopo una buona e pretende il rifiuto con lo stato e il codice dati. */
    const prova = async (regola: Record<string, unknown>, codice: string, stato = 400) => {
      const r = await request(app).put('/api/compendio/dungeon/kamoshida/atterraggi').send({ regole: [{ dal: null, al: null, mappa: ingresso.chiave, spillo: null }, regola] });
      expect(r.status).toBe(stato);
      expect(r.body.error.code).toBe(codice);
    };
    await prova({ dal: '04-31', al: null, mappa: sala.chiave, spillo: null }, 'data-non-valida');
    await prova({ dal: null, al: '04-20', mappa: sala.chiave, spillo: null }, 'fine-senza-inizio');
    await prova({ dal: '04-20', al: '04-12', mappa: sala.chiave, spillo: null }, 'fine-prima-di-inizio');
    await prova({ dal: null, al: null, mappa: 'non-esiste', spillo: null }, 'mappa-non-trovata', 404);
    await prova({ dal: null, al: null, mappa: 'dungeon-kamoshida', spillo: null }, 'mappa-fuori-palazzo');
    await prova({ dal: null, al: null, mappa: altrove.chiave, spillo: null }, 'mappa-fuori-palazzo');
    await prova({ dal: null, al: null, mappa: sala.chiave, spillo: pinPrigione }, 'spillo-fuori-mappa');
    await prova({ dal: '4-1', al: null, mappa: sala.chiave, spillo: null }, 'validation-error');
    expect((await request(app).put('/api/compendio/dungeon/nessuno/atterraggi').send({ regole: [] })).status).toBe(404);
    expect((await request(app).get('/api/compendio/dungeon/kamoshida').expect(200)).body.data.atterraggi).toEqual(prima);
  });

  it('il pin d\'arrivo eliminato lascia la regola senza pin; la planimetria eliminata porta via le sue regole', async () => {
    const extra = creaSpillo(sala.chiave, { tipo: 'nota', nome: 'Da togliere', x: 10, y: 10 } as Parameters<typeof creaSpillo>[1]).id;
    const temporanea = creaMappa(undefined, { nome: 'Planimetria da eliminare', tipo: 'area', genitore: 'dungeon-kamoshida' });
    await request(app).put('/api/compendio/dungeon/kamoshida/atterraggi').send({ regole: [
      { dal: '04-12', al: '04-12', mappa: sala.chiave, spillo: extra },
      { dal: '04-13', al: '04-13', mappa: temporanea.chiave, spillo: null },
      { dal: null, al: null, mappa: ingresso.chiave, spillo: null },
    ] }).expect(200);
    eliminaSpillo(extra);
    eliminaMappa(temporanea.chiave);
    const dopo = (await request(app).get('/api/compendio/dungeon/kamoshida').expect(200)).body.data.atterraggi as Array<{ mappa: string; spillo: number | null }>;
    expect(dopo.map((r) => [r.mappa, r.spillo])).toEqual([[sala.chiave, null], [ingresso.chiave, null]]);
  });

  it('reimportata la planimetria, il pin d\'arrivo reinserito con lo stesso uid torna nella regola', async () => {
    await request(app).put('/api/compendio/dungeon/kamoshida/atterraggi').send({ regole: [{ dal: null, al: null, mappa: sala.chiave, spillo: pinSala }] }).expect(200);
    // un pin più nuovo altrove: senza, SQLite ridarebbe al pin reinserito lo stesso id, e non si vedrebbe se la regola lo ritrova
    creaSpillo(ingresso.chiave, { tipo: 'nota', nome: 'Più nuovo', x: 20, y: 20 } as Parameters<typeof creaSpillo>[1]);
    const uid = prepared('SELECT uid FROM spillo WHERE id = ?').pluck().get(pinSala) as string;
    importaMappe(esportaMappe(sala.chiave), { sovrascrivi: true });
    const nuovo = prepared('SELECT id FROM spillo WHERE uid = ?').pluck().get(uid) as number;
    expect(prepared('SELECT 1 FROM spillo WHERE id = ?').get(pinSala)).toBeUndefined(); // il pin è stato davvero tolto e reinserito
    expect(nuovo).toBeGreaterThan(pinSala);
    const regola = (await request(app).get('/api/compendio/dungeon/kamoshida').expect(200)).body.data.atterraggi[0] as { spillo: number | null; spilloNome: string | null };
    expect(regola).toMatchObject({ spillo: nuovo, spilloNome: 'Sala Centrale' });
  });

  it('097 tocca la finestra solo se è ancora quella trascritta in origine, e ripetuta non cambia niente', () => {
    /** Riscrive la data d'inizio della finestra di Kamoshida nel blocco salvato. */
    const scrivi = (dal: string) => {
      const b = JSON.parse(prepared("SELECT json FROM dati_guida WHERE chiave = 'finestre-dungeon'").pluck().get() as string) as { finestre: Array<{ dungeon: string; dal: string }> };
      b.finestre.find((f) => f.dungeon === 'kamoshida')!.dal = dal;
      prepared("UPDATE dati_guida SET json = ? WHERE chiave = 'finestre-dungeon'").run(JSON.stringify(b));
    };
    /** La data d'inizio della finestra di Kamoshida nel blocco salvato. */
    const leggi = () => (JSON.parse(prepared("SELECT json FROM dati_guida WHERE chiave = 'finestre-dungeon'").pluck().get() as string) as { finestre: Array<{ dungeon: string; dal: string }> }).finestre.find((f) => f.dungeon === 'kamoshida')!.dal;
    scrivi('04-12');
    migration097.up(getDb());
    expect(leggi()).toBe('04-11');
    migration097.up(getDb());
    expect(leggi()).toBe('04-11');
    // corretta a mano: resta
    scrivi('04-14');
    migration097.up(getDb());
    expect(leggi()).toBe('04-14');
    // le regole salvate sopravvivono alla migrazione ripetuta
    expect(prepared('SELECT COUNT(*) FROM dungeon_atterraggio').pluck().get()).toBe(1);
  });
});
