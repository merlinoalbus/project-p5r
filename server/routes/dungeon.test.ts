// ============================================================
// Test API dungeon (Fase 7.1) — seed, schede, stato dei punti per partita con eventi, marcatori delle mappe, reseed stabile
// ============================================================

import request from 'supertest';
import { closeDb, getDb } from '../db/dbService.js';
import { ricaricaPacchetto } from '../services/pacchetto/pacchettoGioco.js';
import { createApp } from '../bootstrap.js';
import type { DungeonDettaglioDto, DungeonRiassuntoDto, PuntoInteresseDto, StoricoDto } from '../../shared/types.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();

describe('API dungeon', () => {
  beforeAll(() => {
    dbDiProva();
  });
  afterAll(() => closeDb());

  it('elenco e scheda: 10 dungeon in ordine, aree e punti con chiave stabile, tipi ammessi, fonti', async () => {
    const lista = (await request(app).get('/api/compendio/dungeon')).body.data as DungeonRiassuntoDto[];
    expect(lista).toHaveLength(10);
    expect(lista.map((d) => d.chiave)).toEqual(['kamoshida', 'madarame', 'kaneshiro', 'futaba', 'okumura', 'niijima', 'shido', 'iweleth', 'maruki', 'mementos']);
    expect(lista[0]).toMatchObject({ nome: 'Palazzo di Kamoshida', tipo: 'palazzo', gestiti: null });
    expect(lista.filter((d) => d.tipo === 'palazzo').reduce((s, d) => s + d.punti, 0)).toBe(524);
    expect(lista.filter((d) => d.tipo === 'palazzo').reduce((s, d) => s + d.aree, 0)).toBe(107);
    expect(lista.find((d) => d.chiave === 'mementos')).toMatchObject({ tipo: 'mementos', aree: 9, punti: 164 });
    const k = (await request(app).get('/api/compendio/dungeon/kamoshida')).body.data as DungeonDettaglioDto;
    expect(k.aree).toHaveLength(18);
    expect(k.aree[0].ordine).toBe(0);
    expect(k.date.scadenza.length).toBeGreaterThan(0);
    const tipi = new Set(['sicura', 'forziere', 'forziere-chiuso', 'volonta', 'puzzle', 'miniboss', 'boss', 'ombra-sciagura', 'persona', 'oggetto', 'scorciatoia', 'altro']);
    for (const a of k.aree) {
      expect(typeof a.mappa).toBe('boolean');
      for (const p of a.punti) {
        expect(p.chiave).toBe(`${a.chiave}/${p.ordine}`);
        expect(tipi.has(p.tipo)).toBe(true);
        expect(p.nome.length).toBeGreaterThan(0);
        expect(p.stato).toBeNull();
        // 7.4b: spillo preposizionato dal seed (percentuali) oppure nessuno
        if (p.marcatore) {
          expect(p.marcatore.x).toBeGreaterThanOrEqual(0); expect(p.marcatore.x).toBeLessThanOrEqual(100);
          expect(p.marcatore.y).toBeGreaterThanOrEqual(0); expect(p.marcatore.y).toBeLessThanOrEqual(100);
        }
      }
    }
    expect(k.aree.flatMap((a) => a.punti).filter((p) => p.marcatore)).toHaveLength(21);
    expect(k.aree.flatMap((a) => a.punti).filter((p) => p.tipo === 'volonta')).toHaveLength(3);
    expect(k.aree.flatMap((a) => a.punti).some((p) => p.tipo === 'boss')).toBe(true);
    expect(k.fonti.every((f) => f.startsWith('http'))).toBe(true);
    expect((await request(app).get('/api/compendio/dungeon/nessuno')).status).toBe(404);
    expect((await request(app).get('/api/compendio/dungeon?partita=99999')).status).toBe(404);
  });

  it('ogni area porta le planimetrie native dell’atlante che le sono legate', async () => {
    // Senza questo campo la scheda del Palazzo non poteva montare la mappa: il risolutore,
    // interrogato sulla chiave di un'area della guida, risponde «contenuto di guida» — corretto
    // per lui — e al posto del visore compariva un riquadro vuoto con dentro un collegamento, su
    // tutte le aree di tutti i Palazzi. Il legame c'è, sta in `mappa_entita`, e va esposto.
    const k = (await request(app).get('/api/compendio/dungeon/kamoshida')).body.data as DungeonDettaglioDto;
    const ingresso = k.aree.find((a) => a.chiave.startsWith('kamoshida-01'))!;
    expect(ingresso.mappe.length).toBeGreaterThan(0);
    // la chiave è quella pubblica del nodo dell'atlante, non quella dell'area della guida
    expect(ingresso.mappe[0].chiave).not.toBe(ingresso.chiave);
    expect(ingresso.mappe[0].nome).toContain('Kamoshida');
    // Le aree senza planimetria nativa restano con l'elenco **vuoto**, non assente: la scheda ci
    // si appoggia per dirlo, invece di mostrare un riquadro muto.
    expect(k.aree.every((a) => Array.isArray(a.mappe))).toBe(true);
    const m = (await request(app).get('/api/compendio/dungeon/mementos')).body.data as DungeonDettaglioDto;
    expect(m.aree.every((a) => a.mappe.length === 0)).toBe(true);
  });

  it('stato dei punti per partita (ottenuto/esaurito/riapri) con evento, avanzamento nell\'elenco, marcatori delle mappe', async () => {
    const id = ((await request(app).post('/api/partite').send({ nome: 'Dungeon' })).body.data as { id: number }).id;
    const k = (await request(app).get(`/api/compendio/dungeon/kamoshida?partita=${id}`)).body.data as DungeonDettaglioDto;
    const forziere = k.aree.flatMap((a) => a.punti).find((p) => p.tipo === 'forziere')!;
    const sicura = k.aree.flatMap((a) => a.punti).find((p) => p.tipo === 'sicura')!;
    let p = (await request(app).put(`/api/partite/${id}/punti`).send({ punto: forziere.chiave, stato: 'ottenuto' })).body.data as PuntoInteresseDto;
    expect(p).toMatchObject({ chiave: forziere.chiave, stato: 'ottenuto' });
    p = (await request(app).put(`/api/partite/${id}/punti`).send({ punto: forziere.chiave, stato: 'ottenuto' })).body.data as PuntoInteresseDto; // idempotente: nessun secondo evento
    expect(p).toMatchObject({ chiave: forziere.chiave, stato: 'ottenuto' });
    p = (await request(app).put(`/api/partite/${id}/punti`).send({ punto: sicura.chiave, stato: 'esaurito' })).body.data as PuntoInteresseDto;
    expect(p.stato).toBe('esaurito');
    const lista = (await request(app).get(`/api/compendio/dungeon?partita=${id}`)).body.data as DungeonRiassuntoDto[];
    expect(lista.find((d) => d.chiave === 'kamoshida')?.gestiti).toBe(2);
    expect(lista.find((d) => d.chiave === 'madarame')?.gestiti).toBe(0);
    const storico = (await request(app).get(`/api/partite/${id}/storico?tipi=punto-dungeon`)).body.data as StoricoDto;
    expect(storico.totale).toBe(2);
    expect(storico.eventi[1].titolo).toContain(forziere.nome);
    p = (await request(app).put(`/api/partite/${id}/punti`).send({ punto: forziere.chiave, stato: null })).body.data as PuntoInteresseDto;
    expect(p.stato).toBeNull();
    expect((await request(app).put(`/api/partite/${id}/punti`).send({ punto: 'x/999', stato: 'ottenuto' })).status).toBe(404);
    expect((await request(app).put(`/api/partite/${id}/punti`).send({ punto: forziere.chiave, stato: 'boh' })).status).toBe(400);
    // marcatori: la rotta che li scriveva non c'è più (nessuno la chiamava, rilievo O10); quello che c'è nel database si legge
    // nella scheda, e senza marcatore il punto non ne ha
    getDb().prepare("INSERT INTO marcatore_mappa (punto_chiave, x, y, updated_at, origine) VALUES (?, 12.5, 80, 'prova', 'utente') ON CONFLICT(punto_chiave) DO UPDATE SET x = excluded.x, y = excluded.y").run(forziere.chiave);
    const k2 = (await request(app).get('/api/compendio/dungeon/kamoshida')).body.data as DungeonDettaglioDto;
    expect(k2.aree.flatMap((a) => a.punti).find((q) => q.chiave === forziere.chiave)?.marcatore).toEqual({ x: 12.5, y: 80 });
    getDb().prepare('DELETE FROM marcatore_mappa WHERE punto_chiave = ?').run(forziere.chiave);
    const k2b = (await request(app).get('/api/compendio/dungeon/kamoshida')).body.data as DungeonDettaglioDto;
    expect(k2b.aree.flatMap((a) => a.punti).find((q) => q.chiave === forziere.chiave)?.marcatore).toBeNull();
    // reseed forzato: chiavi stabili → lo stato della partita resta
    ricaricaPacchetto(getDb());
    const k3 = (await request(app).get(`/api/compendio/dungeon/kamoshida?partita=${id}`)).body.data as DungeonDettaglioDto;
    expect(k3.aree.flatMap((a) => a.punti).find((q) => q.chiave === sicura.chiave)?.stato).toBe('esaurito');
    expect(k3.aree.flatMap((a) => a.punti).length).toBe(58);
  });
});
