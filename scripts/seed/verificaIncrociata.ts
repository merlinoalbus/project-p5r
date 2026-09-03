// ============================================================
// seed:verifica — confronto del seed con la seconda fonte (aqiu384)
// ============================================================
//
// Confronta i JSON del seed (derivati dalla fonte primaria chinhodado)
// con i file grezzi di aqiu384/megaten-fusion-tool scaricati in
// data/seed/sorgenti/aqiu384 e scrive data/seed/verifica-incrociata.md.
//
// Categorie: Persona (insieme, livello, arcano, statistiche, affinità,
// tratto, eredità, skill con livello, oggetti da esecuzione), tabella
// arcana, ricette speciali, Demoni del Tesoro, matrice di eredità,
// skill (insieme, elemento, costo). Le discrepanze vengono elencate
// tutte; l'esito è "BLOCCANTE" se divergono dati che pilotano il motore
// di fusione (livello, arcano, tabella, ricette, tesori), altrimenti
// "DA RIVEDERE". Lo script esce con 1 solo in caso bloccante.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { FONTE_AQIU384, FONTE_CHINHODADO } from './fonti.js';
import { DIR_SEED, percorsoSorgente } from './percorsi.js';
import type { FusioneSeed, PersonaSeed, SkillSeed } from './normalizzaDataset.js';

// ---- Formati aqiu384 ----

interface DemoneAqiu {
  inherits: string;
  item: string;
  itemr: string;
  lvl: number;
  race: string;
  resists: string;
  skills: Record<string, number>;
  stats: number[];
  trait: string;
}

interface SkillAqiu {
  a: [string, string, string];
  b: number[];
  c: [string, string, string];
}

interface CompConfigAqiu {
  inheritElems: string[];
  inheritTypes: Record<string, string>;
}

/** Mappa codici resistenza aqiu → codici affinità del seed. */
const AFFINITA_AQIU: Record<string, string> = { '-': '-', w: 'wk', s: 'rs', n: 'nu', r: 'rp', d: 'ab' };
/** Mappa elementi aqiu → elementi del seed. */
const ELEMENTI_AQIU: Record<string, string> = {
  phy: 'phys', gun: 'gun', fir: 'fire', ice: 'ice', ele: 'electric', win: 'wind', psy: 'psy', nuk: 'nuclear',
  ble: 'bless', cur: 'curse', alm: 'almighty', ail: 'ailment', rec: 'healing', sup: 'support', pas: 'passive', tra: 'trait',
};
/** Mappa tipi di eredità aqiu (minuscoli) → tipi del seed. */
const EREDITA_AQIU: Record<string, string> = {
  phys: 'Physical', fire: 'Fire', ice: 'Ice', elec: 'Electric', wind: 'Wind', psy: 'Psy', nuke: 'Nuclear',
  bless: 'Bless', curse: 'Curse', healing: 'Healing', ailment: 'Ailment', almighty: 'Almighty',
};

/** Normalizza un nome per il confronto: aqiu384 scrive "Arsene" senza accento. */
function chiaveNome(nome: string): string {
  return nome.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function leggiJson<T>(percorsoRepo: string): T {
  return JSON.parse(fs.readFileSync(percorsoSorgente(FONTE_AQIU384.id, percorsoRepo), 'utf-8')) as T;
}

function leggiSeed<T>(nome: string): T {
  return JSON.parse(fs.readFileSync(path.join(DIR_SEED, nome), 'utf-8')) as T;
}

/** Costo aqiu → costo del seed. */
function costoAqiu(b: number[]): { tipo: 'sp' | 'hp' | 'nessuno'; valore: number } {
  const c = b[1];
  if (!c) return { tipo: 'nessuno', valore: 0 };
  if (c > 2000) return { tipo: 'nessuno', valore: 0 }; // Showtime/gauge
  if (c > 1000) return { tipo: 'sp', valore: c - 1000 };
  return { tipo: 'hp', valore: c };
}

interface Esito {
  categoria: string;
  bloccante: boolean;
  confrontati: number;
  discrepanze: string[];
}

/** Esegue tutti i confronti e restituisce gli esiti per categoria. */
export function confronta(): Esito[] {
  const persone = leggiSeed<PersonaSeed[]>('persona.json');
  const skill = leggiSeed<SkillSeed[]>('skill.json');
  const fusione = leggiSeed<FusioneSeed>('fusione.json');
  const demoni = leggiJson<Record<string, DemoneAqiu>>('src/app/p5/data/roy-demon-data.json');
  const skillBase = leggiJson<Record<string, SkillAqiu>>('src/app/p5/data/skill-data.json');
  const skillRoyal = leggiJson<Record<string, SkillAqiu>>('src/app/p5/data/roy-skill-data.json');
  const chart = leggiJson<{ races: string[]; table: string[][] }>('src/app/p5/data/roy-fusion-chart.json');
  const elementChart = leggiJson<{ elems: string[]; races: string[]; table: number[][] }>('src/app/p5/data/roy-element-chart.json');
  const ricette = leggiJson<Record<string, string[]>>('src/app/p5/data/roy-special-recipes.json');
  const compConfig = leggiJson<CompConfigAqiu>('src/app/p5/data/comp-config.json');

  const esiti: Esito[] = [];
  const nuovo = (categoria: string, bloccante: boolean): Esito => {
    const e: Esito = { categoria, bloccante, confrontati: 0, discrepanze: [] };
    esiti.push(e);
    return e;
  };

  // ---- Persona: insieme ----
  const perNome = new Map(persone.map((p) => [p.nome, p]));
  const demoniPerChiave = new Map(Object.entries(demoni).map(([n, d]) => [chiaveNome(n), d]));
  const insieme = nuovo('Persona — insieme dei nomi (accenti ignorati)', true);
  for (const n of perNome.keys()) if (!demoniPerChiave.has(chiaveNome(n))) insieme.discrepanze.push(`solo nel seed: ${n}`);
  const chiaviSeed = new Set([...perNome.keys()].map(chiaveNome));
  for (const n of Object.keys(demoni)) if (!chiaviSeed.has(chiaveNome(n))) insieme.discrepanze.push(`solo in aqiu384: ${n}`);
  insieme.confrontati = perNome.size;

  // ---- Persona: campi ----
  const livArc = nuovo('Persona — livello e arcano', true);
  const stats = nuovo('Persona — statistiche', false);
  const affinita = nuovo('Persona — affinità', false);
  const tratto = nuovo('Persona — tratto', false);
  const eredita = nuovo('Persona — tipo di eredità', false);
  const oggetti = nuovo('Persona — oggetti da esecuzione', false);
  const skillPersona = nuovo('Persona — skill e livelli di apprendimento', false);
  for (const [nome, p] of perNome) {
    const d = demoniPerChiave.get(chiaveNome(nome));
    if (!d) continue;
    livArc.confrontati++;
    if (d.lvl !== p.livello) livArc.discrepanze.push(`${nome}: livello ${p.livello} vs ${d.lvl}`);
    if (d.race !== p.arcana) livArc.discrepanze.push(`${nome}: arcano ${p.arcana} vs ${d.race}`);
    stats.confrontati++;
    const s = [p.statistiche.forza, p.statistiche.magia, p.statistiche.resistenza, p.statistiche.agilita, p.statistiche.fortuna];
    if (s.join(',') !== d.stats.join(',')) stats.discrepanze.push(`${nome}: [${s}] vs [${d.stats}]`);
    affinita.confrontati++;
    const aff = d.resists.split('').map((c) => AFFINITA_AQIU[c] ?? `?${c}`);
    if (aff.join(',') !== p.affinita.join(',')) affinita.discrepanze.push(`${nome}: [${p.affinita}] vs [${aff}]`);
    tratto.confrontati++;
    if (d.trait !== p.tratto) tratto.discrepanze.push(`${nome}: ${p.tratto} vs ${d.trait}`);
    eredita.confrontati++;
    const er = EREDITA_AQIU[d.inherits] ?? `?${d.inherits}`;
    if ((p.eredita ?? null) !== (p.rara ? p.eredita : er)) eredita.discrepanze.push(`${nome}: ${p.eredita} vs ${er}`);
    oggetti.confrontati++;
    if (d.item !== p.oggetto) oggetti.discrepanze.push(`${nome}: oggetto '${p.oggetto}' vs '${d.item}'`);
    if (d.itemr !== p.oggettoAllarme) oggetti.discrepanze.push(`${nome}: oggetto allarme '${p.oggettoAllarme}' vs '${d.itemr}'`);
    skillPersona.confrontati++;
    // aqiu: livello < 2 = innata (0.x); il tratto compare fra le skill a livello 0 solo se trasferibile (tesori).
    const skAq = new Map(Object.entries(d.skills).filter(([n]) => n !== d.trait).map(([n, l]) => [n, l < 2 ? 0 : l]));
    const skSeed = new Map(p.skill.map((x) => [x.nome, x.livello]));
    for (const [n, l] of skSeed) {
      if (!skAq.has(n)) skillPersona.discrepanze.push(`${nome}: skill '${n}' (lv ${l}) assente in aqiu384`);
      else if (skAq.get(n) !== l) skillPersona.discrepanze.push(`${nome}: skill '${n}' livello ${l} vs ${skAq.get(n)}`);
    }
    for (const n of skAq.keys()) if (!skSeed.has(n)) skillPersona.discrepanze.push(`${nome}: skill '${n}' presente solo in aqiu384`);
  }

  // ---- Tabella arcana ----
  const tabella = nuovo('Tabella arcana (24×24)', true);
  const risultatoSeed = new Map<string, string>();
  for (const r of fusione.tabella) {
    risultatoSeed.set(`${r.a}|${r.b}`, r.risultato);
    risultatoSeed.set(`${r.b}|${r.a}`, r.risultato);
  }
  for (let i = 0; i < chart.races.length; i++) {
    for (let j = 0; j <= i; j++) {
      const a = chart.races[i];
      const b = chart.races[j];
      if (a === b) continue; // stesso arcano: gestito dalla regola, non dalla tabella
      tabella.confrontati++;
      const aq = chart.table[i][j];
      const seed = risultatoSeed.get(`${a}|${b}`) ?? '-';
      if (aq !== seed) tabella.discrepanze.push(`${a} × ${b}: ${seed} vs ${aq}`);
    }
  }
  // Coppie dello stesso arcano: nel seed devono esserci tutte (Arcano × Arcano = Arcano) tranne World.
  for (const a of fusione.arcani) {
    const seed = risultatoSeed.get(`${a}|${a}`);
    if (a !== 'World' && seed !== a) tabella.discrepanze.push(`${a} × ${a}: atteso ${a}, trovato ${seed ?? '-'}`);
  }

  // ---- Ricette speciali ----
  const speciali = nuovo('Ricette speciali', true);
  const ricetteAq = Object.entries(ricette).filter(([, ing]) => ing.length > 0);
  const ricetteSeed = new Map(fusione.speciali.map((r) => [r.risultato, [...r.ingredienti].map(chiaveNome).sort().join(' + ')]));
  speciali.confrontati = ricetteSeed.size;
  for (const [ris, ing] of ricetteAq) {
    const s = ricetteSeed.get(ris);
    const aq = [...ing].map(chiaveNome).sort().join(' + ');
    if (!s) speciali.discrepanze.push(`${ris}: ricetta presente solo in aqiu384 (${aq})`);
    else if (s !== aq) speciali.discrepanze.push(`${ris}: ${s} vs ${aq}`);
  }
  for (const ris of ricetteSeed.keys()) if (!ricette[ris]) speciali.discrepanze.push(`${ris}: ricetta presente solo nel seed`);

  // ---- Demoni del Tesoro ----
  const tesori = nuovo('Demoni del Tesoro — nomi e modificatori', true);
  const tesoriAq = Object.entries(ricette).filter(([, ing]) => ing.length === 0).map(([n]) => n).sort();
  const tesoriSeed = [...fusione.tesori.nomi].sort();
  if (tesoriAq.join(',') !== tesoriSeed.join(',')) tesori.discrepanze.push(`nomi: [${tesoriSeed}] vs [${tesoriAq}]`);
  for (let r = 0; r < elementChart.races.length; r++) {
    const arcana = elementChart.races[r];
    const rigaSeed = fusione.tesori.modificatori[arcana];
    if (!rigaSeed) {
      tesori.discrepanze.push(`${arcana}: modificatori assenti nel seed`);
      continue;
    }
    for (let c = 0; c < elementChart.elems.length; c++) {
      tesori.confrontati++;
      const idx = fusione.tesori.nomi.indexOf(elementChart.elems[c]);
      const vs = idx >= 0 ? rigaSeed[idx] : undefined;
      if (vs !== elementChart.table[r][c]) tesori.discrepanze.push(`${arcana} × ${elementChart.elems[c]}: ${vs} vs ${elementChart.table[r][c]}`);
    }
  }

  // ---- Matrice di eredità ----
  const matrice = nuovo('Matrice di eredità', false);
  const colonneSeed = fusione.eredita.colonne;
  for (const [tipoAq, bit] of Object.entries(compConfig.inheritTypes)) {
    const tipoSeed = EREDITA_AQIU[tipoAq];
    if (!tipoSeed) {
      matrice.discrepanze.push(`tipo '${tipoAq}' presente solo in aqiu384`);
      continue;
    }
    const rigaSeed = fusione.eredita.matrice[tipoSeed];
    if (!rigaSeed) {
      matrice.discrepanze.push(`tipo '${tipoSeed}' assente nel seed`);
      continue;
    }
    for (let i = 0; i < compConfig.inheritElems.length; i++) {
      const el = ELEMENTI_AQIU[compConfig.inheritElems[i]];
      const j = colonneSeed.indexOf(el);
      if (j < 0) continue;
      matrice.confrontati++;
      const vAq = bit[i] === '1';
      if (rigaSeed[j] !== vAq) matrice.discrepanze.push(`${tipoSeed} × ${el}: ${rigaSeed[j]} vs ${vAq}`);
    }
  }

  // ---- Skill ----
  const skillAq = new Map<string, SkillAqiu>();
  for (const s of Object.values(skillBase)) skillAq.set(s.a[0], s);
  for (const s of Object.values(skillRoyal)) skillAq.set(s.a[0], s); // il file Royal sovrascrive per nome
  const skInsieme = nuovo('Skill — insieme dei nomi', false);
  const skCampi = nuovo('Skill — elemento e costo', false);
  const nomiSkillSeed = new Set(skill.map((s) => s.nome));
  skInsieme.confrontati = nomiSkillSeed.size;
  for (const s of skill) {
    const aq = skillAq.get(s.nome);
    if (!aq) {
      skInsieme.discrepanze.push(`solo nel seed: ${s.nome}`);
      continue;
    }
    skCampi.confrontati++;
    const el = ELEMENTI_AQIU[aq.a[1]] ?? `?${aq.a[1]}`;
    if (el !== s.elemento) skCampi.discrepanze.push(`${s.nome}: elemento ${s.elemento} vs ${el}`);
    const c = costoAqiu(aq.b);
    if (c.tipo !== s.costo.tipo || c.valore !== s.costo.valore) skCampi.discrepanze.push(`${s.nome}: costo ${s.costo.tipo} ${s.costo.valore} vs ${c.tipo} ${c.valore}`);
  }
  const soloAq = [...skillAq.keys()].filter((n) => !nomiSkillSeed.has(n)).sort();
  if (soloAq.length) skInsieme.discrepanze.push(`solo in aqiu384 (${soloAq.length}): ${soloAq.join(', ')}`);

  return esiti;
}

/** Scrive il report markdown e restituisce true se ci sono discrepanze bloccanti. */
export function scriviReport(esiti: Esito[]): boolean {
  const righe: string[] = [];
  righe.push('# Verifica incrociata del seed');
  righe.push('');
  righe.push(`Generato il ${new Date().toISOString()}.`);
  righe.push(`Fonte primaria: ${FONTE_CHINHODADO.proprietario}/${FONTE_CHINHODADO.repository} @ ${FONTE_CHINHODADO.commit.slice(0, 7)} (${FONTE_CHINHODADO.licenza}).`);
  righe.push(`Fonte di verifica: ${FONTE_AQIU384.proprietario}/${FONTE_AQIU384.repository} @ ${FONTE_AQIU384.commit.slice(0, 7)} (${FONTE_AQIU384.licenza}).`);
  righe.push('');
  righe.push('Le discrepanze sono espresse come `seed vs aqiu384`.');
  righe.push('');
  righe.push('| Categoria | Confrontati | Discrepanze | Peso |');
  righe.push('|---|---:|---:|---|');
  for (const e of esiti) righe.push(`| ${e.categoria} | ${e.confrontati} | ${e.discrepanze.length} | ${e.bloccante ? 'bloccante' : 'da rivedere'} |`);
  righe.push('');
  for (const e of esiti) {
    if (e.discrepanze.length === 0) continue;
    righe.push(`## ${e.categoria} (${e.discrepanze.length})`);
    righe.push('');
    for (const d of e.discrepanze) righe.push(`- ${d}`);
    righe.push('');
  }
  const bloccanti = esiti.some((e) => e.bloccante && e.discrepanze.length > 0);
  righe.push(`**Esito: ${bloccanti ? 'BLOCCANTE — divergono dati che pilotano il motore di fusione' : 'OK sui dati del motore di fusione'}.**`);
  righe.push('');
  fs.writeFileSync(path.join(DIR_SEED, 'verifica-incrociata.md'), righe.join('\n'));
  return bloccanti;
}

const eseguitoDirettamente = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
if (eseguitoDirettamente) {
  const esiti = confronta();
  const bloccanti = scriviReport(esiti);
  for (const e of esiti) console.log(`${e.categoria}: ${e.confrontati} confrontati, ${e.discrepanze.length} discrepanze${e.bloccante ? ' (bloccante)' : ''}`);
  console.log(`report: ${path.join(DIR_SEED, 'verifica-incrociata.md')}`);
  process.exit(bloccanti ? 1 : 0);
}
