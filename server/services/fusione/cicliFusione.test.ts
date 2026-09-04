// ============================================================
// Test cicliFusione — cicli che tornano al bersaglio, partner procurabili, ordinamento per costo, opzioni
// ============================================================

import path from 'node:path';
import { closeDb, initDb } from '../../db/dbService.js';
import { runMigrations } from '../../db/migrationRunner.js';
import { caricaSeed } from '../seed/caricaSeed.js';
import { creaContesto, invalidaMotoreFusione, personaFusione, fondi } from './motoreFusione.js';
import { cicliFusione } from './cicliFusione.js';
import { prezzoEvocazione, type Disponibilita } from './alberoFusione.js';
import { prepared } from '../../db/dbService.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../../data/seed');

function idDi(nome: string): number {
  return (prepared('SELECT id FROM persona WHERE nome = ?').get(nome) as { id: number }).id;
}

describe('cicliFusione', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaMotoreFusione();
  });
  afterAll(() => closeDb());

  it('trova cicli coerenti (ogni anello è una fusione valida, l\'ultimo rigenera il bersaglio) ordinati per costo', () => {
    const ctx = creaContesto([]);
    const jack = personaFusione(idDi('Jack Frost'))!;
    const disp: Disponibilita = { scorta: new Map(), registro: new Set(ctx.ammesse.filter((p) => p.livello <= 30).map((p) => p.id)) };
    const cicli = cicliFusione(jack, ctx, disp, { lunghezzaMax: 3, alternative: 5, catture: false, livelloMax: null });
    expect(cicli.length).toBeGreaterThan(0);
    for (const c of cicli) {
      expect(c.lunghezza).toBeGreaterThanOrEqual(2);
      expect(c.lunghezza).toBeLessThanOrEqual(3);
      expect(c.anelli[0].ingrediente.id).toBe(jack.id);
      expect(c.anelli[c.anelli.length - 1].risultato.id).toBe(jack.id);
      let costo = 0;
      for (let i = 0; i < c.anelli.length; i++) {
        const a = c.anelli[i];
        if (i > 0) expect(a.ingrediente.id).toBe(c.anelli[i - 1].risultato.id);
        const r = fondi(a.ingrediente, a.partner, ctx);
        expect(r?.risultato.id).toBe(a.risultato.id);
        expect(a.partnerModo).toBe('registro');
        expect(a.partnerCosto).toBe(prezzoEvocazione(a.partner));
        costo += a.partnerCosto;
      }
      expect(c.costo).toBe(costo);
      expect(c.evocazioni).toBe(c.lunghezza);
    }
    for (let i = 1; i < cicli.length; i++) expect(cicli[i].costo).toBeGreaterThanOrEqual(cicli[i - 1].costo);
  });

  it('senza partner procurabili non trova nulla; con le catture ammesse usa partner a costo zero; il limite di livello filtra gli intermedi', () => {
    const ctx = creaContesto([]);
    const jack = personaFusione(idDi('Jack Frost'))!;
    expect(cicliFusione(jack, ctx, { scorta: new Map(), registro: new Set() }, { lunghezzaMax: 3, alternative: 3, catture: false, livelloMax: null })).toEqual([]);
    const conCatture = cicliFusione(jack, ctx, { scorta: new Map(), registro: new Set() }, { lunghezzaMax: 3, alternative: 3, catture: true, livelloMax: 20 });
    for (const c of cicliFusione(jack, ctx, { scorta: new Map(), registro: new Set() }, { lunghezzaMax: 5, alternative: 6, catture: true, livelloMax: 20 })) {
      const consumate = new Set([jack.id, ...c.anelli.flatMap((a) => [a.ingrediente.id, a.risultato.id])]);
      for (const a of c.anelli) expect(consumate.has(a.partner.id)).toBe(false);
    }
    expect(conCatture.length).toBeGreaterThan(0);
    for (const c of conCatture) {
      expect(c.costo).toBe(0);
      expect(c.anelli.every((a) => a.partnerModo === 'cattura' && !a.partner.rara && !a.partner.speciale)).toBe(true);
      expect(c.anelli.every((a) => a.risultato.id === jack.id || a.risultato.livello <= 20)).toBe(true);
    }
    // prestazioni: partner gratuiti e lunghezza massima non fanno esplodere la ricerca (potatura a elenco pieno + budget)
    const inizio = Date.now();
    const lunghi = cicliFusione(jack, ctx, { scorta: new Map(), registro: new Set() }, { lunghezzaMax: 5, alternative: 12, catture: true, livelloMax: null });
    expect(Date.now() - inizio).toBeLessThan(3000);
    expect(lunghi.length).toBe(12);
    // la scorta vale come partner gratuito
    const partner = conCatture[0].anelli[0].partner;
    const conScorta = cicliFusione(jack, ctx, { scorta: new Map([[partner.id, 1]]), registro: new Set() }, { lunghezzaMax: 3, alternative: 3, catture: true, livelloMax: 20 });
    expect(conScorta.some((c) => c.anelli.some((a) => a.partner.id === partner.id && a.partnerModo === 'scorta'))).toBe(true);
  });

  it('rispetta il numero minimo di anelli e, con partner distinti, non ripete lo stesso partner nella catena', () => {
    const ctx = creaContesto([]);
    const jack = personaFusione(idDi('Jack Frost'))!;
    const disp: Disponibilita = { scorta: new Map(), registro: new Set(ctx.ammesse.filter((p) => p.livello <= 30).map((p) => p.id)) };
    const lunghi = cicliFusione(jack, ctx, disp, { lunghezzaMax: 4, lunghezzaMin: 3, alternative: 6, catture: false, livelloMax: null });
    expect(lunghi.length).toBeGreaterThan(0);
    for (const c of lunghi) {
      expect(c.lunghezza).toBeGreaterThanOrEqual(3);
      expect(c.lunghezza).toBeLessThanOrEqual(4);
      const partner = c.anelli.map((a) => a.partner.id);
      expect(new Set(partner).size).toBe(partner.length);
      // nessun partner è il bersaglio o una Persona consumata dalla catena (ingredienti e risultati)
      const consumate = new Set([jack.id, ...c.anelli.flatMap((a) => [a.ingrediente.id, a.risultato.id])]);
      for (const id of partner) expect(consumate.has(id)).toBe(false);
    }
    // minimo maggiore del massimo: il minimo viene ridotto al massimo (nessun errore, catene di 2)
    const corti = cicliFusione(jack, ctx, disp, { lunghezzaMax: 2, lunghezzaMin: 5, alternative: 3, catture: false, livelloMax: null });
    for (const c of corti) expect(c.lunghezza).toBe(2);
    // senza il vincolo dei partner distinti l'insieme dei cicli non è mai più piccolo
    const liberi = cicliFusione(jack, ctx, disp, { lunghezzaMax: 4, lunghezzaMin: 3, partnerDistinti: false, alternative: 6, catture: false, livelloMax: null });
    expect(liberi.length).toBeGreaterThanOrEqual(lunghi.length);
  });
});
