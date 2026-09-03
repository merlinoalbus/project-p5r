// ============================================================
// Test eredita — slot, matrice tipo × elemento, bacino, tratti, copertura di skill desiderate
// ============================================================

import path from 'node:path';
import { closeDb, initDb } from '../../db/dbService.js';
import { runMigrations } from '../../db/migrationRunner.js';
import { caricaSeed } from '../seed/caricaSeed.js';
import { creaContesto, fondi, invalidaMotoreFusione, type Contesto, type PersonaFusione } from './motoreFusione.js';
import { analisiEredita, copre, elementoEreditabile, invalidaEredita, skillAlLivello, slotEreditabili, tipoEredita, trattoDi } from './eredita.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../../data/seed');
function perNome(ctx: Contesto, nome: string): PersonaFusione {
  const p = ctx.ammesse.find((x) => x.nome === nome);
  if (!p) throw new Error(nome);
  return p;
}

describe('eredita', () => {
  let ctx: Contesto;
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaMotoreFusione();
    invalidaEredita();
    ctx = creaContesto([]);
  });
  afterAll(() => closeDb());

  it('slot per totale skill dei genitori (tabella P5/P5R)', () => {
    expect(slotEreditabili(2)).toBe(0);
    expect(slotEreditabili(3)).toBe(1);
    expect(slotEreditabili(5)).toBe(1);
    expect(slotEreditabili(6)).toBe(2);
    expect(slotEreditabili(8)).toBe(2);
    expect(slotEreditabili(9)).toBe(3);
    expect(slotEreditabili(12)).toBe(3);
    expect(slotEreditabili(13)).toBe(4);
    expect(slotEreditabili(16)).toBe(4);
    expect(slotEreditabili(24)).toBe(5);
    expect(slotEreditabili(32)).toBe(6);
    expect(slotEreditabili(42)).toBe(8);
  });

  it('matrice: Fuoco non eredita Ghiaccio (e viceversa), Fisico non eredita magie, Quasi-divino tutto; supporto/passive sempre', () => {
    expect(elementoEreditabile('Fire', 'ice')).toBe(false);
    expect(elementoEreditabile('Ice', 'fire')).toBe(false);
    expect(elementoEreditabile('Fire', 'fire')).toBe(true);
    expect(elementoEreditabile('Physical', 'fire')).toBe(false);
    expect(elementoEreditabile('Physical', 'phys')).toBe(true);
    expect(elementoEreditabile('Physical', 'gun')).toBe(true);
    expect(elementoEreditabile('Almighty', 'curse')).toBe(true);
    for (const tipo of ['Physical', 'Fire', 'Bless', 'Curse', 'Healing', 'Ailment']) {
      expect(elementoEreditabile(tipo, 'support')).toBe(true);
      expect(elementoEreditabile(tipo, 'passive')).toBe(true);
      expect(elementoEreditabile(tipo, 'almighty')).toBe(true);
      expect(elementoEreditabile(tipo, 'trait')).toBe(false);
    }
    expect(elementoEreditabile(null, 'fire')).toBe(false);
    expect(tipoEredita(perNome(ctx, 'Regent').id)).toBeNull();
    expect(tipoEredita(perNome(ctx, 'Arsène').id)).toBe('Curse');
  });

  it('bacino di un ingrediente: innate più apprese fino al livello; tratto della Persona', () => {
    const arsene = perNome(ctx, 'Arsène');
    const base = skillAlLivello(arsene.id, 1).map((s) => s.nome);
    expect(base).toEqual(['Eiha']);
    const l5 = skillAlLivello(arsene.id, 5).map((s) => s.nome);
    expect(l5).toEqual(['Eiha', 'Cleave', 'Sukunda', 'Dream Needle']);
    expect(trattoDi(arsene.id)?.nome).toBe('Pinch Anchor');
  });

  it('analisi di una fusione: slot dal totale, compatibilità per tipo, skill esclusive e già apprese, tratti selezionabili', () => {
    const arsene = perNome(ctx, 'Arsène');
    const pixie = perNome(ctx, 'Pixie');
    const r = fondi(arsene, pixie, ctx)!;
    const ingA = { persona: arsene, skill: skillAlLivello(arsene.id, 7) }; // 5 skill
    const ingB = { persona: pixie, skill: skillAlLivello(pixie.id, 99) };
    const an = analisiEredita(r.risultato, [ingA, ingB]);
    expect(an.totaleSkillGenitori).toBe(ingA.skill.length + ingB.skill.length);
    expect(an.slot).toBe(slotEreditabili(an.totaleSkillGenitori));
    expect(an.slotScelti).toBe(Math.max(0, an.slot - 1));
    expect(an.candidate.every((c) => c.elemento !== 'trait')).toBe(true);
    for (const c of an.candidate) {
      if (c.unica) expect(c.ereditabile).toBe(false);
      if (!c.unica && !c.giaAppresa) expect(c.ereditabile).toBe(elementoEreditabile(an.tipo, c.elemento));
    }
    // i tratti: proprio del risultato più quelli degli ingredienti (senza duplicati)
    expect(an.tratti.length).toBeGreaterThanOrEqual(1);
    expect(an.tratti[0].da).toBeNull();
    expect(an.tratti.some((t) => t.skill.nome === 'Pinch Anchor' && t.da === arsene.id)).toBe(true);
    expect(new Set(an.tratti.map((t) => t.skill.id)).size).toBe(an.tratti.length);
  });

  it('copertura: ok solo se tutte le skill desiderate sono ereditabili (o già apprese) e non superano gli slot scelti', () => {
    const arsene = perNome(ctx, 'Arsène');
    const pixie = perNome(ctx, 'Pixie');
    const r = fondi(arsene, pixie, ctx)!;
    const an = analisiEredita(r.risultato, [{ persona: arsene, skill: skillAlLivello(arsene.id, 7) }, { persona: pixie, skill: skillAlLivello(pixie.id, 99) }]);
    const ereditabili = an.candidate.filter((c) => c.ereditabile && !c.giaAppresa);
    if (ereditabili.length > 0 && an.slotScelti >= 1) {
      expect(copre(an, [ereditabili[0].id]).ok).toBe(true);
      const troppe = ereditabili.slice(0, an.slotScelti + 1).map((c) => c.id);
      if (troppe.length > an.slotScelti) expect(copre(an, troppe).ok).toBe(false);
    }
    const nonNelBacino = skillAlLivello(perNome(ctx, 'Satanael').id, 99)[0];
    const esito = copre(an, [nonNelBacino.id]);
    expect(esito.ok).toBe(false);
    expect(esito.mancanti).toEqual([nonNelBacino.id]);
  });
});
