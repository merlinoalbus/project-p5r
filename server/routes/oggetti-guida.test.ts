// ============================================================
// Test API oggetti della guida (Fase 10.2) — consumabili, chiave e materiali, fabbricazione, personalizzazione, abiti, scambi
// ============================================================

import path from 'node:path';
import request from 'supertest';
import { closeDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import type { OggettiGuidaDto } from '../../shared/types.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();

describe('API oggetti della guida', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaCacheTraduzioni();
  });
  afterAll(() => closeDb());

  it('247 consumabili, 108 oggetti chiave e materiali, 10 ricette, personalizzazione con 8 modifiche, 55 abiti con lavanderia, 5 venditori con 60 offerte', async () => {
    const res = await request(app).get('/api/compendio/oggetti-guida');
    expect(res.status).toBe(200);
    const d = res.body.data as OggettiGuidaDto;
    expect(d.consumabili).toHaveLength(247);
    expect(d.consumabili[0]).toMatchObject({ nome: 'Frutto del diavolo', categoria: 'cura', verificato: true });
    expect(d.consumabili.every((c) => c.effetto.length > 0 && c.fonte.startsWith('http'))).toBe(true);
    expect(d.chiaveEMateriali).toHaveLength(108);
    expect(d.chiaveEMateriali.filter((c) => c.tipo === 'materiale')).toHaveLength(26);
    expect(d.fabbricazione.ricette).toHaveLength(10);
    expect(d.fabbricazione.ricette[0]).toMatchObject({ attrezzo: 'Grimaldello', materiali: [{ nome: 'Gomitolo di seta', quantita: 1 }, { nome: 'Fibbia di latta', quantita: 1 }] });
    expect(d.personalizzazioneArmi.effetti).toHaveLength(8);
    expect(d.personalizzazioneArmi.introduzione).toContain('Untouchable');
    expect(d.abiti.elenco).toHaveLength(55);
    expect(d.abiti.lavanderia.dove).toContain('Yongen-Jaya');
    expect(d.scambi).toHaveLength(5);
    expect(d.scambi.reduce((s, x) => s + x.offerte.length, 0)).toBe(60);
    expect(d.scambi[0]).toMatchObject({ venditore: 'Mercante Sakai', dove: 'Kichijoji' });
  });

  // Il crosswalk e' il ponte fra gli oggetti della guida, che hanno solo un nome, e gli articoli
  // del catalogo, che hanno una chiave e attraverso il negozio arrivano alla mappa. Se smettesse
  // di arricchire la risposta, l'elenco resterebbe identico e il comando «Sulla mappa»
  // scomparirebbe senza che nessun conteggio se ne accorga: qui si pretendono le chiavi esatte.
  it('inietta le chiavi del crosswalk, comprese quelle con la barra e quelle senza posizione', async () => {
    const d = (await request(app).get('/api/compendio/oggetti-guida')).body.data as OggettiGuidaDto;
    const tutti = [...d.consumabili, ...d.chiaveEMateriali];
    const conAggancio = tutti.filter((x) => x.articolo || (x.negozi ?? []).length > 0);
    expect(conAggancio.length).toBeGreaterThan(100);

    const conBarra = tutti.filter((x) => (x.articolo ?? '').includes('/'));
    expect(conBarra.length).toBeGreaterThan(0);
    for (const x of conBarra) expect(x.articolo).toMatch(/^[a-z0-9-]+\/[a-z0-9-]+$/);

    // una delle quattro voci senza posizione: la chiave c'e' lo stesso, ed e' quella che porta il
    // risolutore a dire che una posizione non e' associata
    const soma = tutti.find((x) => x.nome === 'Soma');
    expect(soma?.articolo).toBe('negozio-palazzo-niijima/soma');

    // La forma regge il caso di un oggetto venduto in piu' posti — `negozi` e' una lista, non una
    // chiave — anche se sui dati di oggi non se ne presenta nessuno: tutti gli abbinati passano
    // per il nome dell'articolo, che porta a un negozio solo. Si controlla la forma, non si
    // pretende un dato che non c'e'.
    for (const x of tutti) expect(Array.isArray(x.negozi ?? [])).toBe(true);
  });
});
