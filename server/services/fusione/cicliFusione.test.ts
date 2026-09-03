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
});
