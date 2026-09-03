// ============================================================
// Test alberoFusione — piani ricorsivi: foglie, consumo della scorta, profondità, livello, coerenza col motore
// ============================================================

import path from 'node:path';
import { closeDb, initDb } from '../../db/dbService.js';
import { runMigrations } from '../../db/migrationRunner.js';
import { caricaSeed } from '../seed/caricaSeed.js';
import { creaContesto, fondi, invalidaMotoreFusione, ricettePer, type Contesto, type PersonaFusione } from './motoreFusione.js';
import { pianiFusione, pianoCoerente, prezzoEvocazione, type Disponibilita, type NodoPiano } from './alberoFusione.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../../data/seed');

function perNome(ctx: Contesto, nome: string): PersonaFusione {
  const p = ctx.ammesse.find((x) => x.nome === nome);
  if (!p) throw new Error(`Persona ${nome} non ammessa`);
  return p;
}
const vuota = (): Disponibilita => ({ scorta: new Map(), registro: new Set() });
function foglie(n: NodoPiano): NodoPiano[] {
  return n.modo === 'fusione' ? n.figli.flatMap(foglie) : [n];
}

describe('alberoFusione', () => {
  let ctx: Contesto;
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaMotoreFusione();
    ctx = creaContesto([]);
  });
  afterAll(() => closeDb());

  it('bersaglio già in scorta → un solo piano "scorta" a costo zero', () => {
    const jack = perNome(ctx, 'Jack Frost');
    const disp = vuota();
    disp.scorta.set(jack.id, 1);
    const piani = pianiFusione(jack, ctx, disp, { profondita: 3, alternative: 5, catture: true, livelloMax: null });
    expect(piani).toHaveLength(1);
    expect(piani[0].radice.modo).toBe('scorta');
    expect(piani[0].costo).toBe(0);
    expect(piani[0].fusioni).toBe(0);
  });

  it('con due ingredienti in scorta il piano è una fusione gratuita; senza catture le foglie costano l\'evocazione', () => {
    const jack = perNome(ctx, 'Jack Frost');
    const [ric] = ricettePer(jack, ctx);
    const disp = vuota();
    for (const i of ric.ingredienti) disp.scorta.set(i.id, 1);
    const piani = pianiFusione(jack, ctx, disp, { profondita: 2, alternative: 3, catture: false, livelloMax: null });
    expect(piani[0].costo).toBe(0);
    expect(piani[0].radice.modo).toBe('fusione');
    expect(piani[0].fusioni).toBe(1);
    expect(foglie(piani[0].radice).every((f) => f.modo === 'scorta')).toBe(true);
    expect(pianoCoerente(piani[0].radice, ctx)).toBe(true);

    // stessi ingredienti solo nel Registro: costo = somma dei prezzi di evocazione
    const disp2 = vuota();
    for (const i of ric.ingredienti) disp2.registro.add(i.id);
    const piani2 = pianiFusione(jack, ctx, disp2, { profondita: 2, alternative: 3, catture: false, livelloMax: null });
    expect(piani2[0].costo).toBe(ric.ingredienti.reduce((t, i) => t + prezzoEvocazione(i), 0));
    expect(piani2[0].evocazioni).toBe(2);
    expect(prezzoEvocazione(perNome(ctx, 'Arsène'))).toBe(27 + 126 + 2147);
  });

  it('un esemplare in scorta si usa una volta sola: la seconda occorrenza va evocata o catturata', () => {
    // Cerca un bersaglio con una ricetta "stesso arcano" fra due Persona di cui una in scorta e l'altra assente
    const jack = perNome(ctx, 'Jack Frost');
    const ric = ricettePer(jack, ctx).find((x) => x.tipo !== 'tesoro')!;
    const [a, b] = ric.ingredienti;
    const disp = vuota();
    disp.scorta.set(a.id, 1);
    disp.registro.add(b.id);
    const piani = pianiFusione(jack, ctx, disp, { profondita: 1, alternative: 3, catture: false, livelloMax: null, ampiezza: 200 });
    const primo = piani.find((p) => p.radice.modo === 'fusione' && p.radice.figli.some((f) => f.persona.id === a.id) && p.radice.figli.some((f) => f.persona.id === b.id))!;
    expect(primo).toBeDefined();
    expect(primo.costo).toBe(prezzoEvocazione(b));
    // scorta con lo stesso esemplare per entrambe le posizioni impossibile: se a===b non capita nel dataset (ingredienti distinti)
    expect(a.id).not.toBe(b.id);
    // consumo: due copie richieste della stessa Persona in scorta con un solo esemplare → il secondo uso paga
    const conta = new Map<number, number>();
    for (const f of foglie(primo.radice)) conta.set(f.persona.id, (conta.get(f.persona.id) ?? 0) + (f.modo === 'scorta' ? 1 : 0));
    for (const [id, n] of conta) expect(n).toBeLessThanOrEqual(disp.scorta.get(id) ?? 0);
  });

  it('profondità e livello massimo sono rispettati; le catture compaiono solo se ammesse', () => {
    const target = perNome(ctx, 'Titania'); // livello 56
    const disp = vuota();
    const conCatture = pianiFusione(target, ctx, disp, { profondita: 2, alternative: 4, catture: true, livelloMax: 60 });
    expect(conCatture.length).toBeGreaterThan(0);
    for (const p of conCatture) {
      expect(p.profondita).toBeLessThanOrEqual(2);
      expect(pianoCoerente(p.radice, ctx)).toBe(true);
      const controlla = (n: NodoPiano) => {
        if (n.modo === 'fusione') {
          expect(n.persona.livello).toBeLessThanOrEqual(60);
          n.figli.forEach(controlla);
        } else if (n.modo === 'cattura') {
          expect(n.persona.livello).toBeLessThanOrEqual(60);
          expect(n.persona.rara || n.persona.speciale).toBe(false);
        }
      };
      controlla(p.radice);
    }
    // ordinamento per costo
    for (let i = 1; i < conCatture.length; i++) expect(conCatture[i].costo).toBeGreaterThanOrEqual(conCatture[i - 1].costo);
    // senza catture né disponibilità non esiste alcun piano
    expect(pianiFusione(target, ctx, disp, { profondita: 2, alternative: 4, catture: false, livelloMax: 60 })).toEqual([]);
    // livello massimo troppo basso: nessun piano (Titania è livello 56)
    expect(pianiFusione(target, ctx, disp, { profondita: 3, alternative: 2, catture: true, livelloMax: 30 })).toEqual([]);
  });

  it('Persona rara: nessuna fusione (solo scorta o registro); speciale: unica fusione dalla ricetta speciale', () => {
    const regent = perNome(ctx, 'Regent');
    expect(pianiFusione(regent, ctx, vuota(), { profondita: 3, alternative: 3, catture: true, livelloMax: null })).toEqual([]);
    const disp = vuota();
    disp.registro.add(regent.id);
    const daRegistro = pianiFusione(regent, ctx, disp, { profondita: 3, alternative: 3, catture: true, livelloMax: null });
    expect(daRegistro).toHaveLength(1);
    expect(daRegistro[0].radice.modo).toBe('registro');

    const alice = perNome(ctx, 'Alice');
    const piani = pianiFusione(alice, ctx, vuota(), { profondita: 2, alternative: 3, catture: true, livelloMax: null });
    expect(piani.length).toBeGreaterThan(0);
    expect(piani[0].radice.modo).toBe('fusione');
    expect(piani[0].radice.tipo).toBe('speciale');
    expect(piani[0].radice.figli.map((f) => f.persona.nome).sort()).toEqual(['Belial', 'Nebiros']);
    const [belial, nebiros] = piani[0].radice.figli;
    expect(fondi(belial.persona, nebiros.persona, ctx)!.risultato.nome).toBe('Alice');
  });

  it('più alternative distinte, tutte coerenti, in tempi ragionevoli su un bersaglio di alto livello', () => {
    const target = perNome(ctx, 'Satanael'); // speciale, livello 95, ingredienti alti
    const inizio = Date.now();
    const piani = pianiFusione(target, ctx, vuota(), { profondita: 3, alternative: 3, catture: true, livelloMax: null });
    const durata = Date.now() - inizio;
    expect(durata).toBeLessThan(15_000);
    const firme = new Set(piani.map((p) => JSON.stringify(p.radice, (k, v) => (k === 'persona' ? v.id : v))));
    expect(firme.size).toBe(piani.length);
    for (const p of piani) expect(pianoCoerente(p.radice, ctx)).toBe(true);
  });
});
