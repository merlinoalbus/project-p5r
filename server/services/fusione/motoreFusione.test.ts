// ============================================================
// Test motoreFusione — regole di fusione sul dataset reale (DB in memoria)
// ============================================================

import path from 'node:path';
import { closeDb, initDb } from '../../db/dbService.js';
import { runMigrations } from '../../db/migrationRunner.js';
import { caricaSeed } from '../seed/caricaSeed.js';
import {
  arcanaRisultato, costoFusione, creaContesto, fondi, fusioniCon, invalidaMotoreFusione, livelloFusione, ricettePer, type Contesto, type PersonaFusione,
} from './motoreFusione.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../../data/seed');

function perNome(ctx: Contesto, nome: string): PersonaFusione {
  const p = ctx.ammesse.find((x) => x.nome === nome);
  if (!p) throw new Error(`Persona ${nome} non ammessa nel contesto`);
  return p;
}

describe('motoreFusione', () => {
  let ctx: Contesto;
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaMotoreFusione();
    ctx = creaContesto([]);
  });
  afterAll(() => closeDb());

  it('esclude le Persona DLC non possedute e le include con il set posseduto', () => {
    expect(ctx.ammesse.some((p) => p.dlc)).toBe(false);
    const tutti = creaContesto([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    expect(tutti.ammesse.filter((p) => p.dlc).length).toBeGreaterThan(0);
    expect(tutti.ammesse.length).toBe(232);
    expect(creaContesto([])).toBe(ctx); // memoizzato
  });

  it('tabella degli arcani: simmetrica, Giudizio + Giustizia senza risultato', () => {
    expect(arcanaRisultato('Fool', 'Magician')).toBe('Death');
    expect(arcanaRisultato('Magician', 'Fool')).toBe('Death');
    expect(arcanaRisultato('Fool', 'Fool')).toBe('Fool');
    expect(arcanaRisultato('Judgement', 'Justice')).toBeNull();
  });

  it('fusione fra arcani diversi: prima Persona dell\'arcano risultante con livello ≥ 1 + ⌊(La+Lb)/2⌋, escluse speciali e rare', () => {
    const arsene = perNome(ctx, 'Arsène'); // Fool 1
    const pixie = perNome(ctx, 'Pixie'); // Lovers 2
    const r = fondi(arsene, pixie, ctx)!;
    expect(r).not.toBeNull();
    expect(r.tipo).toBe('normale');
    expect(r.risultato.arcana).toBe(arcanaRisultato('Fool', 'Lovers'));
    const livello = livelloFusione(arsene, pixie);
    expect(livello).toBe(1 + Math.floor((1 + 2) / 2));
    const lista = ctx.perArcana.get(r.risultato.arcana)!;
    const attesa = lista.find((p) => p.livello >= livello && !p.speciale && !p.rara)!;
    expect(r.risultato.id).toBe(attesa.id);
    expect(r.costo).toBe(costoFusione([arsene, pixie]));
    expect(costoFusione([arsene])).toBe(27 + 126 + 2147);
  });

  it('stesso arcano: la Persona più alta con livello ≤ riferimento, esclusi gli ingredienti', () => {
    const fools = ctx.perArcana.get('Fool')!.filter((p) => !p.speciale && !p.rara);
    const a = fools[2];
    const b = fools[4];
    const r = fondi(a, b, ctx)!;
    expect(r.tipo).toBe('stesso-arcano');
    expect(r.risultato.arcana).toBe('Fool');
    const livello = livelloFusione(a, b);
    expect(r.risultato.livello).toBeLessThanOrEqual(livello);
    expect([a.id, b.id]).not.toContain(r.risultato.id);
    // nessuna Persona normale di Fool più alta del risultato resta sotto il livello di riferimento
    const migliore = [...fools].reverse().find((p) => p.livello <= livello && p.id !== a.id && p.id !== b.id)!;
    expect(r.risultato.id).toBe(migliore.id);
  });

  it('Demone del Tesoro + normale: spostamento di `modificatore` posizioni nell\'arcano della normale', () => {
    const regent = perNome(ctx, 'Regent'); // tesoro
    const lista = ctx.perArcana.get('Magician')!;
    const jack = perNome(ctx, 'Jack Frost');
    const r = fondi(regent, jack, ctx);
    expect(r).not.toBeNull();
    expect(r!.tipo).toBe('tesoro');
    expect(r!.risultato.arcana).toBe('Magician');
    const indice = lista.findIndex((p) => p.id === jack.id);
    const indiceRis = lista.findIndex((p) => p.id === r!.risultato.id);
    expect(indiceRis).not.toBe(indice);
    expect(Math.abs(indiceRis - indice)).toBeGreaterThanOrEqual(1);
    // simmetria degli ingredienti
    expect(fondi(jack, regent, ctx)!.risultato.id).toBe(r!.risultato.id);
    // una Persona rara non è mai un risultato
    expect(r!.risultato.rara).toBe(false);
  });

  it('due Demoni del Tesoro fra loro seguono la fusione normale; stessa Persona con sé stessa → null', () => {
    const regent = perNome(ctx, 'Regent');
    const orlov = perNome(ctx, 'Orlov');
    const r = fondi(regent, orlov, ctx);
    if (r) {
      expect(r.tipo).toBe('normale');
      expect(r.risultato.rara).toBe(false);
    }
    expect(fondi(regent, regent, ctx)).toBeNull();
  });

  it('ricette speciali: A+B a due ingredienti dà il risultato speciale; ricettePer di una speciale è la sua ricetta', () => {
    const alice = ctx.ammesse.find((p) => p.nome === 'Alice')!;
    const ricette = ricettePer(alice, ctx);
    expect(ricette).toHaveLength(1);
    expect(ricette[0].tipo).toBe('speciale');
    expect(ricette[0].ingredienti.map((p) => p.nome).sort()).toEqual(['Belial', 'Nebiros']);
    const [belial, nebiros] = ricette[0].ingredienti;
    expect(fondi(belial, nebiros, ctx)!.risultato.nome).toBe('Alice');
    // una speciale non esce mai da una fusione normale
    for (const p of ctx.ammesse) {
      const r = fondi(p, belial, ctx);
      if (r && r.tipo !== 'speciale') expect(r.risultato.speciale).toBe(false);
    }
  });

  it('Persona rara: nessuna ricetta', () => {
    expect(ricettePer(perNome(ctx, 'Regent'), ctx)).toEqual([]);
  });

  it('fusione inversa coerente con la diretta (ogni ricetta rifusa dà il target; nessuna coppia diretta mancante)', () => {
    const target = perNome(ctx, 'Jack Frost');
    const ricette = ricettePer(target, ctx);
    expect(ricette.length).toBeGreaterThan(0);
    for (const r of ricette) {
      expect(r.ingredienti).toHaveLength(2);
      expect(r.ingredienti.some((i) => i.id === target.id)).toBe(false);
      expect(fondi(r.ingredienti[0], r.ingredienti[1], ctx)!.risultato.id).toBe(target.id);
    }
    // ordinamento per costo crescente
    for (let i = 1; i < ricette.length; i++) expect(ricette[i].costo).toBeGreaterThanOrEqual(ricette[i - 1].costo);
    // completezza: tutte le coppie che danno Jack Frost sono nelle ricette
    const chiavi = new Set(ricette.map((r) => [r.ingredienti[0].id, r.ingredienti[1].id].sort((x, y) => x - y).join('-')));
    for (let i = 0; i < ctx.ammesse.length; i++) {
      for (let j = i + 1; j < ctx.ammesse.length; j++) {
        const r = fondi(ctx.ammesse[i], ctx.ammesse[j], ctx);
        if (r && r.risultato.id === target.id) {
          expect(chiavi.has([ctx.ammesse[i].id, ctx.ammesse[j].id].sort((x, y) => x - y).join('-'))).toBe(true);
        }
      }
    }
  });

  it('fusioniCon elenca ogni risultato ottenibile con una Persona come ingrediente', () => {
    const arsene = perNome(ctx, 'Arsène');
    const lista = fusioniCon(arsene, ctx);
    expect(lista.length).toBeGreaterThan(50);
    expect(lista.every((r) => r.ingredienti[0].id === arsene.id)).toBe(true);
    for (let i = 1; i < lista.length; i++) expect(lista[i].risultato.livello).toBeGreaterThanOrEqual(lista[i - 1].risultato.livello);
  });
});
