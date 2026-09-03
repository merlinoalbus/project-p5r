// ============================================================
// seed:normalizza — dai file grezzi (fonte primaria) ai JSON del seed
// ============================================================
//
// Legge data/seed/sorgenti/chinhodado/*.ts, li valuta in una sandbox
// `node:vm` (sono letterali di oggetti TypeScript senza logica) e scrive:
//   data/seed/persona.json     232 Persona normalizzate
//   data/seed/skill.json       525 skill normalizzate
//   data/seed/oggetti.json     223 oggetti da esecuzione
//   data/seed/fusione.json     tabella arcana, ricette speciali, Demoni del
//                              Tesoro, matrice di eredità, set DLC
//   data/seed/traduzioni.json  glossario italiano (arcani, elementi, affinità,
//                              statistiche, tipi di eredità, aree, effetti skill)
//   data/seed/confidenti.json  i 23 Confidenti (chiave, nome, arcano)
//   data/seed/versione.json    versione del seed + commit delle fonti
//
// Chiavi JSON in italiano; i VALORI identificativi (nomi Persona/skill,
// chiavi arcana/elemento/eredità) restano canonici (inglese) e vengono
// resi in italiano tramite `traduzioni.json`. L'output è ordinato per
// nome così i diff restano leggibili.
//
// Gate: effetti skill, descrizioni oggetti, titoli di negoziazione, fonti carta,
// note e fonti esclusive DEVONO avere una traduzione (effettiIt.json,
// oggettiIt.json, negoziazioniIt.json, glossario.ts), altrimenti lo script
// fallisce elencando i mancanti: nessun testo inglese può arrivare all'utente.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { FONTE_CHINHODADO, FONTE_AQIU384 } from './fonti.js';
import { DIR_SEED, percorsoSorgente } from './percorsi.js';
import {
  AFFINITA,
  AREE_MEMENTOS,
  ARCANI,
  COLONNE_EREDITA,
  CONFIDENTI,
  DOTI_SOCIALI,
  ELEMENTI_AFFINITA,
  ELEMENTI_SKILL,
  FONTI_ESCLUSIVE,
  NOTE_PERSONA,
  STATISTICHE,
  TIPI_EREDITA,
  TIPI_OGGETTO,
  VINCOLI_OGGETTO,
  traduciFonteCarta,
} from './glossario.js';

// ---- Tipi dei dati grezzi (fonte chinhodado) ----

interface PersonaGrezza {
  inherits?: string;
  item: string;
  itemr: string;
  level: number;
  arcana: string;
  elems: string[];
  skills: Record<string, number>;
  stats: number[];
  trait: string;
  area?: string;
  floor?: string;
  skillCard?: boolean;
  special?: boolean;
  max?: boolean;
  note?: string;
  rare?: boolean;
  dlc?: boolean;
  personality?: string;
}

interface SkillGrezza {
  effect: string;
  element: string;
  personas?: Record<string, number>;
  fuse?: string[];
  card?: string;
  cost?: number;
  talk?: string;
  unique?: string;
}

interface OggettoGrezzo {
  type: string;
  description: string;
}

interface DatiGrezziRoyal {
  personaMapRoyal: Record<string, PersonaGrezza>;
  skillMapRoyal: Record<string, SkillGrezza>;
  itemMapRoyal: Record<string, OggettoGrezzo>;
  rarePersonaeRoyal: string[];
  rareCombosRoyal: Record<string, number[]>;
  arcana2CombosRoyal: Array<{ source: [string, string]; result: string }>;
  specialCombosRoyal: Array<{ result: string; sources: string[] }>;
  dlcPersonaRoyal: string[][];
  inheritanceChartRoyal: Record<string, string[]>;
}

// ---- Tipi del seed: definiti in shared/seed.ts (usati anche dal backend) ----

export type { PersonaSeed, SkillSeed, OggettoSeed, FusioneSeed, ConfidenteSeed, TraduzioniSeed, Mancanti } from '../../shared/seed.js';
import type { PersonaSeed, SkillSeed, OggettoSeed, FusioneSeed, ConfidenteSeed, TraduzioniSeed, Mancanti } from '../../shared/seed.js';

// ---- Caricamento sandbox ----

function valutaFileTs<T>(file: string, nomi: string[]): T {
  let sorgente = fs.readFileSync(file, 'utf-8');
  // Rimuove l'annotazione di tipo della dichiarazione (`const x: Tipo = …`).
  sorgente = sorgente.replace(/^const (\w+): \w+ = /m, 'const $1 = ');
  const contesto: Record<string, unknown> = {};
  vm.runInNewContext(`${sorgente};\n${nomi.map((n) => `this.${n} = ${n};`).join('\n')}`, contesto, { timeout: 5000 });
  for (const n of nomi) {
    if (contesto[n] === undefined) throw new Error(`${path.basename(file)}: simbolo '${n}' non trovato`);
  }
  return contesto as T;
}

/** Carica tutti i dati grezzi della fonte primaria. */
export function caricaDatiGrezzi(): DatiGrezziRoyal {
  const f = (p: string) => percorsoSorgente(FONTE_CHINHODADO.id, p);
  return {
    ...valutaFileTs<Pick<DatiGrezziRoyal, 'personaMapRoyal'>>(f('data/PersonaDataRoyal.ts'), ['personaMapRoyal']),
    ...valutaFileTs<Pick<DatiGrezziRoyal, 'skillMapRoyal'>>(f('data/SkillDataRoyal.ts'), ['skillMapRoyal']),
    ...valutaFileTs<Pick<DatiGrezziRoyal, 'itemMapRoyal'>>(f('data/ItemDataRoyal.ts'), ['itemMapRoyal']),
    ...valutaFileTs<Omit<DatiGrezziRoyal, 'personaMapRoyal' | 'skillMapRoyal' | 'itemMapRoyal'>>(f('data/Data5Royal.ts'), [
      'rarePersonaeRoyal',
      'rareCombosRoyal',
      'arcana2CombosRoyal',
      'specialCombosRoyal',
      'dlcPersonaRoyal',
      'inheritanceChartRoyal',
    ]),
  };
}

// ---- Correzioni documentate (scripts/seed/correzioniRoyal.json) ----

/** Correzione con fonte: rinomina, livello, affinità, eredità, campi skill. */
export interface CorrezioniRoyal {
  rinominaSkill: Array<{ da: string; a: string; fonte: string }>;
  rinominaOggetti: Array<{ da: string; a: string; fonte: string }>;
  livelliSkill: Array<{ persona: string; skill: string; livello: number; fonte: string }>;
  affinita: Array<{ persona: string; elemento: string; codice: string; fonte: string }>;
  eredita: Array<{ persona: string; tipo: string; fonte: string }>;
  campiSkill: Array<{ skill: string; elemento?: string; costo?: number; fonte: string }>;
}

function leggiCorrezioni(): CorrezioniRoyal {
  const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
  const file = path.join(dir, 'correzioniRoyal.json');
  const vuote: CorrezioniRoyal = { rinominaSkill: [], rinominaOggetti: [], livelliSkill: [], affinita: [], eredita: [], campiSkill: [] };
  if (!fs.existsSync(file)) return vuote;
  const dati = JSON.parse(fs.readFileSync(file, 'utf-8')) as Partial<CorrezioniRoyal>;
  return { ...vuote, ...dati };
}

function rinominaChiave<T>(mappa: Record<string, T>, da: string, a: string, contesto: string): void {
  if (!(da in mappa)) throw new Error(`Correzione ${contesto}: '${da}' non esiste`);
  if (a in mappa) throw new Error(`Correzione ${contesto}: '${a}' esiste già`);
  const valore = mappa[da];
  delete mappa[da];
  mappa[a] = valore;
}

/** Applica le correzioni ai dati grezzi (mutazione in loco). Ogni voce non applicabile è un errore. */
export function applicaCorrezioni(g: DatiGrezziRoyal, c: CorrezioniRoyal = leggiCorrezioni()): void {
  for (const r of c.rinominaSkill) {
    rinominaChiave(g.skillMapRoyal, r.da, r.a, `rinominaSkill`);
    for (const p of Object.values(g.personaMapRoyal)) {
      if (r.da in p.skills) rinominaChiave(p.skills, r.da, r.a, `rinominaSkill (Persona)`);
      if (p.trait === r.da) p.trait = r.a;
      // Le carte abilità da esecuzione portano il nome della skill.
      if (p.item === r.da) p.item = r.a;
      if (p.itemr === r.da) p.itemr = r.a;
    }
    if (r.da in g.itemMapRoyal) rinominaChiave(g.itemMapRoyal, r.da, r.a, `rinominaSkill (oggetto)`);
  }
  for (const r of c.rinominaOggetti) {
    rinominaChiave(g.itemMapRoyal, r.da, r.a, `rinominaOggetti`);
    for (const p of Object.values(g.personaMapRoyal)) {
      if (p.item === r.da) p.item = r.a;
      if (p.itemr === r.da) p.itemr = r.a;
    }
  }
  for (const l of c.livelliSkill) {
    const p = g.personaMapRoyal[l.persona];
    if (!p || !(l.skill in p.skills)) throw new Error(`Correzione livelliSkill: ${l.persona} / ${l.skill} non trovata`);
    p.skills[l.skill] = l.livello;
    const s = g.skillMapRoyal[l.skill];
    if (s?.personas && l.persona in s.personas) s.personas[l.persona] = l.livello;
  }
  for (const a of c.affinita) {
    const p = g.personaMapRoyal[a.persona];
    const idx = ELEMENTI_AFFINITA.findIndex((e) => e.chiave === a.elemento);
    if (!p || idx < 0) throw new Error(`Correzione affinita: ${a.persona} / ${a.elemento} non trovata`);
    p.elems[idx] = a.codice;
  }
  for (const e of c.eredita) {
    const p = g.personaMapRoyal[e.persona];
    if (!p) throw new Error(`Correzione eredita: ${e.persona} non trovata`);
    p.inherits = e.tipo;
  }
  for (const s of c.campiSkill) {
    const sk = g.skillMapRoyal[s.skill];
    if (!sk) throw new Error(`Correzione campiSkill: ${s.skill} non trovata`);
    if (s.elemento !== undefined) sk.element = s.elemento;
    if (s.costo !== undefined) sk.cost = s.costo;
  }
}

// ---- Normalizzazione ----

/** Persona dei compagni di squadra e delle Ombre-boss: fonti `unique` legittime fuori dal compendio. */
const NOMI_PERSONA_COMPAGNI = new Set([
  'Agnes', 'Al Azif', 'Captain Kidd', 'Carmen', 'Celestine', 'Cendrillon', 'Diego', 'Ella', 'Goemon', 'Gorokichi',
  'Hereward', 'Johanna', 'Loki', 'Lucy', 'Milady', 'Necronomicon', 'Robin Hood', 'Satanel', 'William', 'Zorro',
]);

const CODICI_AFFINITA = new Set(Object.keys(AFFINITA));
const ARCANI_VALIDI = new Set(ARCANI.map((a) => a.chiave));

function ordinaPerNome<T extends { nome: string }>(lista: T[]): T[] {
  return [...lista].sort((a, b) => a.nome.localeCompare(b.nome, 'en'));
}

/** Traduce la notazione dei piani di Mementos ("L1-4 (after Palace 7)") in italiano. */
export function traduciPiani(piano: string | undefined): string | null {
  if (!piano) return null;
  return piano
    .replace(/\bafter Palace 7\b/g, 'dopo il Palazzo 7')
    .replace(/\bbefore Palace 7\b/g, 'prima del Palazzo 7')
    .replace(/\bAll\b/g, 'tutti i piani')
    .replace(/\bAny\b/g, 'qualsiasi piano')
    .replace(/\bL(\d)/g, 'piano $1')
    .replace(/\s&\s/g, ' e ')
    .replace(/\?\?\?/g, 'sconosciuto');
}

export function normalizzaPersona(nome: string, g: PersonaGrezza): PersonaSeed {
  if (!ARCANI_VALIDI.has(g.arcana)) throw new Error(`Persona ${nome}: arcana sconosciuto '${g.arcana}'`);
  if (g.elems.length !== ELEMENTI_AFFINITA.length) throw new Error(`Persona ${nome}: attese ${ELEMENTI_AFFINITA.length} affinità`);
  for (const c of g.elems) if (!CODICI_AFFINITA.has(c)) throw new Error(`Persona ${nome}: codice affinità sconosciuto '${c}'`);
  if (g.stats.length !== STATISTICHE.length) throw new Error(`Persona ${nome}: attese ${STATISTICHE.length} statistiche`);
  if (g.inherits !== undefined && !(g.inherits in TIPI_EREDITA)) throw new Error(`Persona ${nome}: tipo eredità sconosciuto '${g.inherits}'`);
  if (g.inherits === undefined && !g.rare) throw new Error(`Persona ${nome}: tipo eredità mancante su Persona non rara`);
  const aree = g.area ? g.area.split(' / ').map((a) => a.trim()) : [];
  for (const a of aree) if (!(a in AREE_MEMENTOS)) throw new Error(`Persona ${nome}: area Mementos sconosciuta '${a}'`);
  const [forza, magia, resistenza, agilita, fortuna] = g.stats;
  return {
    nome,
    arcana: g.arcana,
    livello: g.level,
    eredita: g.inherits ?? null,
    speciale: g.special === true,
    rara: g.rare === true,
    dlc: g.dlc === true,
    richiedeConfidenteMax: g.max === true,
    nota: g.note ?? null,
    oggetto: g.item,
    oggettoAllarme: g.itemr,
    oggettoECarta: g.skillCard === true,
    tratto: g.trait,
    affinita: [...g.elems],
    statistiche: { forza, magia, resistenza, agilita, fortuna },
    skill: Object.entries(g.skills)
      .map(([n, livello]) => ({ nome: n, livello }))
      .sort((a, b) => a.livello - b.livello || a.nome.localeCompare(b.nome, 'en')),
    areeMementos: aree,
    pianiMementos: traduciPiani(g.floor),
  };
}

export function normalizzaSkill(nome: string, g: SkillGrezza): SkillSeed {
  if (!(g.element in ELEMENTI_SKILL)) throw new Error(`Skill ${nome}: elemento sconosciuto '${g.element}'`);
  let costo: SkillSeed['costo'];
  if (g.element === 'passive' || g.element === 'trait' || g.cost === undefined) {
    costo = { tipo: 'nessuno', valore: 0 };
  } else if (g.cost < 100) {
    costo = { tipo: 'hp', valore: g.cost };
  } else {
    costo = { tipo: 'sp', valore: g.cost / 100 };
  }
  return {
    nome,
    elemento: g.element,
    costo,
    effetto: g.effect,
    fontiEsecuzione: [...(g.fuse ?? [])],
    fonteCarta: g.card ?? null,
    negoziazione: g.talk ?? null,
    unica: g.unique ?? null,
  };
}

/** Scompone `type` ("Weapon - Joker only", "Protector - Women only", "Accessory"). */
export function normalizzaOggetto(nome: string, g: OggettoGrezzo): OggettoSeed {
  const [categoria, resto] = g.type.split(' - ').map((s) => s.trim());
  if (!(categoria in TIPI_OGGETTO)) throw new Error(`Oggetto ${nome}: categoria sconosciuta '${g.type}'`);
  let vincolo: string | null = null;
  if (resto) {
    vincolo = resto.replace(/\s+only$/, '');
    if (!(vincolo in VINCOLI_OGGETTO)) throw new Error(`Oggetto ${nome}: vincolo sconosciuto '${resto}'`);
  }
  return { nome, categoria, vincolo, descrizione: g.description };
}

export function normalizzaFusione(g: DatiGrezziRoyal): FusioneSeed {
  const arcani = ARCANI.map((a) => a.chiave);
  const tabella = g.arcana2CombosRoyal.map((c) => {
    for (const x of [c.source[0], c.source[1], c.result]) {
      if (!ARCANI_VALIDI.has(x)) throw new Error(`Tabella arcana: arcana sconosciuto '${x}'`);
    }
    return { a: c.source[0], b: c.source[1], risultato: c.result };
  });
  const tipi = Object.keys(g.inheritanceChartRoyal);
  const matrice: Record<string, boolean[]> = {};
  for (const [tipo, riga] of Object.entries(g.inheritanceChartRoyal)) {
    if (riga.length !== COLONNE_EREDITA.length) throw new Error(`Matrice eredità: riga '${tipo}' con ${riga.length} colonne`);
    matrice[tipo] = riga.map((v) => v === '✓');
  }
  for (const [arcana, mod] of Object.entries(g.rareCombosRoyal)) {
    if (!ARCANI_VALIDI.has(arcana)) throw new Error(`Modificatori tesori: arcana sconosciuto '${arcana}'`);
    if (mod.length !== g.rarePersonaeRoyal.length) throw new Error(`Modificatori tesori: riga '${arcana}' incompleta`);
  }
  return {
    arcani,
    tabella,
    speciali: g.specialCombosRoyal.map((s) => ({ risultato: s.result, ingredienti: [...s.sources] })),
    tesori: { nomi: [...g.rarePersonaeRoyal], modificatori: { ...g.rareCombosRoyal } },
    eredita: { tipi, colonne: COLONNE_EREDITA.map((c) => c.chiave), matrice },
    dlc: g.dlcPersonaRoyal.map((set) => [...set]),
  };
}

// ---- Controlli di coerenza incrociata interna ----

function verificaCoerenza(persone: PersonaSeed[], skill: SkillSeed[], fusione: FusioneSeed, grezzi: DatiGrezziRoyal): void {
  const nomiPersona = new Set(persone.map((p) => p.nome));
  const nomiSkill = new Set(skill.map((s) => s.nome));
  const errori: string[] = [];
  for (const p of persone) {
    for (const s of p.skill) if (!nomiSkill.has(s.nome)) errori.push(`Persona ${p.nome}: skill inesistente '${s.nome}'`);
    if (!nomiSkill.has(p.tratto)) errori.push(`Persona ${p.nome}: tratto inesistente '${p.tratto}'`);
  }
  for (const s of skill) {
    for (const f of s.fontiEsecuzione) if (!nomiPersona.has(f)) errori.push(`Skill ${s.nome}: fonte esecuzione inesistente '${f}'`);
    // `unica` è testo libero: Persona dei compagni (Necronomicon, Robin Hood…), anelli, "Enemies". Nessun vincolo.
    const posseditori = grezzi.skillMapRoyal[s.nome]?.personas ?? {};
    for (const [nome, livello] of Object.entries(posseditori)) {
      const p = grezzi.personaMapRoyal[nome];
      if (!p) {
        errori.push(`Skill ${s.nome}: Persona '${nome}' inesistente nella lista posseditori`);
      } else if (s.elemento === 'trait') {
        // Il tratto proprio sta nel campo `trait`; i Demoni del Tesoro portano
        // in più altri tratti trasferibili, elencati fra le loro skill.
        if (p.trait !== s.nome && p.skills[s.nome] !== livello) errori.push(`Tratto ${s.nome}: non è il tratto di ${nome} (${p.trait})`);
      } else if (p.skills[s.nome] !== livello) {
        errori.push(`Skill ${s.nome}: livello discordante per ${nome} (${p.skills[s.nome]} vs ${livello})`);
      }
    }
  }
  for (const r of fusione.speciali) {
    if (!nomiPersona.has(r.risultato)) errori.push(`Ricetta speciale: risultato inesistente '${r.risultato}'`);
    for (const i of r.ingredienti) if (!nomiPersona.has(i)) errori.push(`Ricetta speciale ${r.risultato}: ingrediente inesistente '${i}'`);
  }
  for (const t of fusione.tesori.nomi) if (!nomiPersona.has(t)) errori.push(`Demone del Tesoro inesistente '${t}'`);
  for (const set of fusione.dlc) for (const n of set) if (!nomiPersona.has(n)) errori.push(`DLC inesistente '${n}'`);
  const speciali = persone.filter((p) => p.speciale).map((p) => p.nome).sort();
  const ricette = fusione.speciali.map((r) => r.risultato).sort();
  if (JSON.stringify(speciali) !== JSON.stringify(ricette)) errori.push(`Persona speciali (${speciali.length}) e ricette speciali (${ricette.length}) non coincidono`);
  if (errori.length) throw new Error(`Incoerenze interne nel dataset:\n - ${errori.join('\n - ')}`);
}

// ---- Esecuzione ----

function leggiJsonAccanto(nome: string): Record<string, string> {
  const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
  const file = path.join(dir, nome);
  if (!fs.existsSync(file)) return {};
  const dati = JSON.parse(fs.readFileSync(file, 'utf-8')) as Record<string, string>;
  delete dati._nota;
  return dati;
}

/** Genera tutti i file del seed. Restituisce le stringhe prive di traduzione (tutte vuote = ok). */
export function normalizzaTutto(): { mancanti: Mancanti } {
  const grezzi = caricaDatiGrezzi();
  applicaCorrezioni(grezzi);
  const persone = ordinaPerNome(Object.entries(grezzi.personaMapRoyal).map(([n, g]) => normalizzaPersona(n, g)));
  const skill = ordinaPerNome(Object.entries(grezzi.skillMapRoyal).map(([n, g]) => normalizzaSkill(n, g)));
  const oggetti = ordinaPerNome(Object.entries(grezzi.itemMapRoyal).map(([n, g]) => normalizzaOggetto(n, g)));
  const fusione = normalizzaFusione(grezzi);
  verificaCoerenza(persone, skill, fusione, grezzi);

  const effettiIt = leggiJsonAccanto('effettiIt.json');
  const oggettiIt = leggiJsonAccanto('oggettiIt.json');
  const negoziazioniIt = leggiJsonAccanto('negoziazioniIt.json');
  const nomiPersona = new Set(persone.map((p) => p.nome));

  const copri = (valori: Iterable<string>, mappa: Record<string, string>, mancanti: string[]): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const v of [...new Set(valori)].sort()) {
      if (mappa[v]) out[v] = mappa[v];
      else mancanti.push(v);
    }
    return out;
  };
  const mancanti: Mancanti = { effetti: [], oggetti: [], negoziazioni: [], fontiCarta: [], note: [], fontiEsclusive: [] };
  const effettiSkill = copri(skill.map((s) => s.effetto), effettiIt, mancanti.effetti);
  const descrizioniOggetti = copri(oggetti.map((o) => o.descrizione), oggettiIt, mancanti.oggetti);
  // Il titolo di negoziazione è "Titolo (Persona)": si traduce il solo titolo.
  const titoliNegoziazione = skill
    .map((s) => s.negoziazione)
    .filter((n): n is string => n !== null)
    .map((n) => n.replace(/\s*\([^)]*\)\s*$/, ''));
  const negoziazioni = copri(titoliNegoziazione, negoziazioniIt, mancanti.negoziazioni);
  const fontiCarta: Record<string, string> = {};
  for (const f of [...new Set(skill.map((s) => s.fonteCarta).filter((x): x is string => x !== null))].sort()) {
    const t = traduciFonteCarta(f);
    if (t) fontiCarta[f] = t;
    else mancanti.fontiCarta.push(f);
  }
  copri(persone.map((p) => p.nota).filter((n): n is string => n !== null), NOTE_PERSONA, mancanti.note);
  for (const u of [...new Set(skill.map((s) => s.unica).filter((x): x is string => x !== null))].sort()) {
    if (!nomiPersona.has(u) && !FONTI_ESCLUSIVE[u] && !NOMI_PERSONA_COMPAGNI.has(u)) mancanti.fontiEsclusive.push(u);
  }

  const traduzioni: TraduzioniSeed = {
    arcani: ARCANI,
    elementiSkill: ELEMENTI_SKILL,
    elementiAffinita: ELEMENTI_AFFINITA,
    affinita: AFFINITA,
    tipiEredita: TIPI_EREDITA,
    colonneEredita: COLONNE_EREDITA,
    statistiche: STATISTICHE,
    tipiOggetto: TIPI_OGGETTO,
    vincoliOggetto: VINCOLI_OGGETTO,
    areeMementos: AREE_MEMENTOS,
    dotiSociali: DOTI_SOCIALI,
    notePersona: NOTE_PERSONA,
    fontiEsclusive: FONTI_ESCLUSIVE,
    effettiSkill,
    descrizioniOggetti,
    negoziazioni,
    fontiCarta,
  };

  // Timestamp stabile: se i dati generati sono identici a quelli già su disco,
  // si conserva il `generatoIl` precedente (rigenerazione idempotente).
  const fileVersione = path.join(DIR_SEED, 'versione.json');
  const precedente = fs.existsSync(fileVersione) ? (JSON.parse(fs.readFileSync(fileVersione, 'utf-8')) as { generatoIl?: string }) : null;
  const confidenti: ConfidenteSeed[] = CONFIDENTI.map((c) => ({ ...c }));
  for (const c of confidenti) if (!ARCANI_VALIDI.has(c.arcana)) throw new Error(`Confidente ${c.chiave}: arcana sconosciuto '${c.arcana}'`);
  const dati: Record<string, unknown> = { 'persona.json': persone, 'skill.json': skill, 'oggetti.json': oggetti, 'fusione.json': fusione, 'traduzioni.json': traduzioni, 'confidenti.json': confidenti };
  const invariati = Object.entries(dati).every(([nome, d]) => {
    const f = path.join(DIR_SEED, nome);
    return fs.existsSync(f) && fs.readFileSync(f, 'utf-8') === JSON.stringify(d, null, 2) + '\n';
  });
  const versione = {
    versione: 1,
    generatoIl: invariati && precedente?.generatoIl ? precedente.generatoIl : new Date().toISOString(),
    fonti: {
      primaria: { id: FONTE_CHINHODADO.id, commit: FONTE_CHINHODADO.commit, licenza: FONTE_CHINHODADO.licenza },
      verifica: { id: FONTE_AQIU384.id, commit: FONTE_AQIU384.commit, licenza: FONTE_AQIU384.licenza },
    },
    conteggi: {
      persona: persone.length,
      skill: skill.length,
      oggetti: oggetti.length,
      ricetteSpeciali: fusione.speciali.length,
      tesori: fusione.tesori.nomi.length,
      confidenti: confidenti.length,
      effettiTradotti: Object.keys(effettiSkill).length,
      descrizioniOggettiTradotte: Object.keys(descrizioniOggetti).length,
      negoziazioniTradotte: Object.keys(negoziazioni).length,
      fontiCartaTradotte: Object.keys(fontiCarta).length,
    },
  };

  fs.mkdirSync(DIR_SEED, { recursive: true });
  const scrivi = (nome: string, contenuto: unknown) => fs.writeFileSync(path.join(DIR_SEED, nome), JSON.stringify(contenuto, null, 2) + '\n');
  for (const [nome, d] of Object.entries(dati)) scrivi(nome, d);
  scrivi('versione.json', versione);
  return { mancanti };
}

const eseguitoDirettamente = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
if (eseguitoDirettamente) {
  try {
    const { mancanti } = normalizzaTutto();
    const totale = Object.values(mancanti).reduce((n, l) => n + l.length, 0);
    const report = path.join(DIR_SEED, 'traduzioni-mancanti.json');
    if (totale > 0) {
      fs.writeFileSync(report, JSON.stringify(mancanti, null, 2) + '\n');
      console.error(`ERRORE: ${totale} stringhe senza traduzione italiana (elenco in ${report})`);
      process.exit(2);
    }
    if (fs.existsSync(report)) fs.unlinkSync(report);
    console.log('seed generato in', DIR_SEED);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
