// ============================================================
// modelloOmbra — la costruzione (pura, senza database) dell'entità Ombra dalle copie di oggi (L8, B4: R8-01, R8-02, R8-03b, R8-04, R8-08b, R8-09)
// ============================================================
//
// Le «copie» da raccordare per chiave: le 217 righe di `dati_guida.battaglia.ombre`, le 131 voci Persona dei dedali dei Memento e le voci
// Persona dei Palazzi. Qui si decide **chi è la stessa Ombra** e che cosa se ne sa; la migrazione (`163_modello_ombra.ts`) scrive il risultato.
//
// Identità: una Ombra è (nome normalizzato, Persona) e, se la stessa coppia ha personalità diverse in luoghi diversi, una per personalità
// (sono nemici diversi del gioco: la variante si elenca). La Persona è la chiave del compendio; è NULL per le 5 Ombre non reclutabili
// (4 Servobot di Okumura e «Straziato re dei desideri», G-035) e per i casi che nessuna regola abbina — questi ultimi non si indovinano, si
// elencano. Abbinamento, catturabilità e negoziabilità sono tre dati distinti (piano operativo P1).
//
// Nulla si inventa: la personalità che la guida non dà viene da G-021 §5 (dati del gioco Royal) o resta «sconosciuta»; le affinità proprie
// esistono solo per le 4 eccezioni di G-019 e per le non reclutabili; il compendio non si tocca.
// ============================================================

import { slug } from '../../../shared/slug.js';
import { affinitaDaTesto, personalitaDaTesto, type CodiceAffinita, type PersonalitaOmbra } from '../../../shared/elementi.js';
import { cercaPersonaPerNome, normalizza, type IndicePersone, type PersonaDellIndice } from '../../../shared/maschere.js';

// ---- Ingressi ----

/** Una riga di `dati_guida.battaglia.ombre`. */
export interface RigaBattaglia {
  dungeonChiave: string; dungeon?: string; area: string | null; areaChiave: string | null;
  ombra: string | null; persona: string | null; livello: number | null;
  debolezze: string[]; resistenze: string[]; personalita: string | null;
  [altro: string]: unknown;
}
/** Una voce Persona di un dedalo dei Memento. */
export interface VoceDedalo { chiave: string; nome: string; maschera: string | null; personalita: string | null }
/** Una voce Persona di un Palazzo. */
export interface VocePalazzo { chiave: string; nome: string; dungeonChiave: string; areaChiave: string }
/** Una voce di G-021 §5: la personalità di un'Ombra senza personalità nella guida. */
export interface VocePersonalita { dungeon: string; persona: string; ombra: string | null; personalita: string }

export interface IngressoModello {
  indice: IndicePersone;
  righe: ReadonlyArray<RigaBattaglia>;
  personalitaG021: ReadonlyArray<VocePersonalita>;
  vociDedalo: ReadonlyArray<VoceDedalo>;
  vociPalazzo: ReadonlyArray<VocePalazzo>;
  /** I nomi (normalizzati) dei Demoni del Tesoro della guida: la loro negoziazione non è verificata. */
  demoniTesoro: ReadonlySet<string>;
  /** Le rese italiane dei nomi di negoziazione (`traduzione` ambito `negoziazione`, nome inglese → italiano). */
  nomiNegoziazione: Readonly<Record<string, string>>;
}

// ---- Uscite ----

export type FonteLuogo = 'battaglia' | 'voce';

export interface OmbraNuova {
  chiave: string; nome: string; nomiAltri: string[];
  personaId: number | null; macheraNota: string | null;
  personalita: PersonalitaOmbra;
  catturabile: 0 | 1; negoziabile: 0 | 1 | null;
  affinitaProprie: Record<string, CodiceAffinita> | null;
  livello: number | null; note: string;
  luoghi: Array<{ dungeon: string; infiltrazione: string | null; fonte: FonteLuogo }>;
  voci: string[];
  /** Quante righe della Battaglia sono confluite in questa Ombra (la somma su tutte è il numero delle righe: nessuna si perde). */
  righe: number;
}

export interface Elenco {
  /** Le correzioni alle righe della Battaglia (G-035): `{ riga, correzione }`. */
  correzioniBattaglia: Array<{ dungeon: string; ombra: string | null; prima: string; dopo: string }>;
  /** Righe della Battaglia la cui Persona non si abbina al compendio e che non sono fra le 5 non reclutabili. */
  nonAbbinate: string[];
  /** Ombre il cui nome non è indicato dalla guida: si è usato quello della Persona. */
  senzaNomeOmbra: string[];
  /** Stesso nome e stessa Persona con personalità diverse in luoghi diversi: sono tenute come Ombre distinte. */
  variantiPersonalita: Array<{ nome: string; personalita: string[] }>;
  /** Righe o voci che potevano andare a più di un'Ombra: attaccate alla prima, da rivedere. */
  ambigue: string[];
  /** Ombre con la stessa Persona e la stessa personalità ma nomi scritti in modo diverso: forse la stessa Ombra (R8-03). Non si fondono senza approvazione. */
  possibiliDoppioni: Array<{ persona: string; personalita: string; ombre: string[] }>;
  /** Voci Persona dei Palazzi che non sono Ombre (tabelle, eventi di trama). */
  vociNonOmbre: string[];
  /** Voci di dedalo o di Palazzo senza Persona nel compendio. */
  vociSenzaPersona: string[];
  /** Ombre create da una voce perché nessuna riga della Battaglia le conosceva. */
  createDalleVoci: string[];
  /** Testi di affinità che non si riconoscono come elemento. */
  affinitaNonRiconosciute: string[];
  /** Personalità completate da G-021 (chiavi delle Ombre) e Ombre che restano «sconosciuta». */
  personalitaDaG021: string[];
  personalitaSconosciute: string[];
  /** Le 4 Ombre con affinità proprie diverse dalla Persona (G-019) e le 5 non reclutabili. */
  eccezioniAffinita: string[];
  nonReclutabili: string[];
  /** Ombre con la negoziazione da verificare (Demoni del Tesoro). */
  negoziazioneDaVerificare: string[];
}

export interface Modello { ombre: OmbraNuova[]; legami: Array<{ voce: string; ombra: string }>; elenco: Elenco }

// ---- Regole dichiarate ----

/** Affinità proprie dell'Ombra, diverse dalla sua Persona nel gioco (G-019, dati Royal): solo gli elementi che differiscono. Chiave: nome canonico della Persona. */
export const ECCEZIONI_AFFINITA: Readonly<Record<string, Readonly<Record<string, CodiceAffinita>>>> = {
  'Take-Minakata': { electric: 'rp' },
  Mithras: { nuclear: 'rp' },
  Bugs: { fire: 'wk', psy: '-', curse: '-' },
  Power: { gun: '-' },
};

/** L'Ombra la cui Persona è nel compendio ma che nessun incontro permette di catturare (AllGameStaff, settimana 40, nota sulla tabella delle Ombre di Maruki). */
const NON_CATTURABILI_PER_PERSONA: ReadonlySet<string> = new Set(['Bugs']);

const eServobot = (testo: string | null): boolean => !!testo && /^servobot\b/i.test(testo.trim());
const eStraziato = (testo: string | null): boolean => !!testo && normalizza(testo) === 'straziato re dei desideri';

/** I nomi di negoziazione (inglesi) che diventano nomi alternativi di un'Ombra: High Pixie e Mara (G-035). */
const ALIAS_NEGOZIAZIONE: ReadonlyArray<{ persona: string | null; nome: string; en: string }> = [
  { persona: 'High Pixie', nome: 'Maestra degli scherzi', en: 'Prankster Leader' },
  { persona: null, nome: 'Straziato re dei desideri', en: 'Torn King of Desires' },
];

// ---- Correzioni alle righe della Battaglia (G-035) ----

/**
 * Le due righe di Kaneshiro con Ombra e maschera scambiate («Melma nera» ↔ «Fango pulsante», «Pixie superiore» ↔ «Maestra degli scherzi») e la
 * maschera mancante di «Straziato re dei desideri» (Mara). Solo se la riga è ancora esattamente quella nota: una riga già corretta o diversa resta.
 */
export function correggiRighe(righe: ReadonlyArray<RigaBattaglia>): { righe: RigaBattaglia[]; correzioni: Elenco['correzioniBattaglia'] } {
  const correzioni: Elenco['correzioniBattaglia'] = [];
  const out = righe.map((r) => {
    if (r.dungeonChiave === 'kaneshiro' && r.ombra && r.persona) {
      const scambiata = (r.ombra === 'Melma nera' && r.persona === 'Fango pulsante') || (r.ombra === 'Pixie superiore' && r.persona === 'Maestra degli scherzi');
      if (scambiata) {
        correzioni.push({ dungeon: r.dungeonChiave, ombra: r.ombra, prima: `${r.ombra} / ${r.persona}`, dopo: `${r.persona} / ${r.ombra}` });
        return { ...r, ombra: r.persona, persona: r.ombra };
      }
    }
    if (r.dungeonChiave === 'mementos' && eStraziato(r.ombra) && r.persona === null) {
      correzioni.push({ dungeon: r.dungeonChiave, ombra: r.ombra, prima: 'maschera assente', dopo: 'maschera Mara (non reclutabile)' });
      return { ...r, persona: 'Mara' };
    }
    return r;
  });
  return { righe: out, correzioni };
}

// ---- Costruzione ----

interface Preparata {
  riga: RigaBattaglia; persona: PersonaDellIndice | null; nome: string; senzaNome: boolean;
  personalita: PersonalitaOmbra; daG021: boolean; nonReclutabile: boolean; servobot: boolean; straziato: boolean;
}

interface Bozza {
  nome: string; senzaNome: boolean; persona: PersonaDellIndice | null; personalita: PersonalitaOmbra; daG021: boolean;
  nonReclutabile: boolean; servobot: boolean; straziato: boolean; macheraNota: string | null;
  righe: RigaBattaglia[]; luoghi: Map<string, { dungeon: string; infiltrazione: string | null; fonte: FonteLuogo }>;
  voci: string[]; creataDallaVoce: boolean; chiave: string;
}

const chiaveLuogo = (dungeon: string, infiltrazione: string | null, fonte: FonteLuogo): string => `${dungeon}|${infiltrazione ?? ''}|${fonte}`;

function aggiungiLuogo(b: Bozza, dungeon: string, infiltrazione: string | null, fonte: FonteLuogo): void {
  b.luoghi.set(chiaveLuogo(dungeon, infiltrazione, fonte), { dungeon, infiltrazione, fonte });
}

const testoBase = (s: string): string => s.replace(/\s+x\d+$/i, '').replace(/\s*\(.*?\)\s*/g, ' ').trim();

export function costruisciModello(ing: IngressoModello): Modello {
  const { indice } = ing;
  const elenco: Elenco = {
    correzioniBattaglia: [], nonAbbinate: [], senzaNomeOmbra: [], variantiPersonalita: [], ambigue: [], possibiliDoppioni: [], vociNonOmbre: [], vociSenzaPersona: [], createDalleVoci: [],
    affinitaNonRiconosciute: [], personalitaDaG021: [], personalitaSconosciute: [], eccezioniAffinita: [], nonReclutabili: [], negoziazioneDaVerificare: [],
  };

  // 1. Le righe della Battaglia: Persona, nome, personalità (la guida, poi G-021).
  const personaDi = (nome: string | null) => cercaPersonaPerNome(indice, nome);
  const preparate: Preparata[] = ing.righe.map((riga) => {
    const servobot = eServobot(riga.persona) || eServobot(riga.ombra);
    const straziato = eStraziato(riga.ombra);
    const nonReclutabile = servobot || straziato;
    const trovata = personaDi(riga.persona);
    const nome = (riga.ombra && riga.ombra.trim()) || (servobot ? (riga.persona ?? '').trim() : trovata?.nomeIt ?? (riga.persona ?? '').trim());
    let personalita = personalitaDaTesto(riga.personalita);
    let daG021 = false;
    if (personalita === 'sconosciuta') {
      const candidati = ing.personalitaG021.filter((g) => g.dungeon === riga.dungeonChiave
        && ((trovata !== null && personaDi(g.persona)?.id === trovata.id) || (!!g.ombra && !!riga.ombra && normalizza(g.ombra) === normalizza(riga.ombra))));
      const valori = [...new Set(candidati.map((g) => personalitaDaTesto(g.personalita)))].filter((p) => p !== 'sconosciuta');
      if (valori.length === 1) { personalita = valori[0]!; daG021 = true; }
    }
    if (!trovata && !nonReclutabile) elenco.nonAbbinate.push(`${riga.dungeonChiave}: ${riga.ombra ?? '—'} / ${riga.persona ?? '—'}`);
    return { riga, persona: nonReclutabile ? null : trovata, nome, senzaNome: !(riga.ombra && riga.ombra.trim()), personalita, daG021, nonReclutabile, servobot, straziato };
  });

  const nuovaBozza = (p: Preparata, personalita: PersonalitaOmbra, rs: Preparata[]): Bozza => {
    const b: Bozza = {
      nome: p.nome, senzaNome: p.senzaNome, persona: p.persona, personalita, daG021: rs.some((x) => x.daG021 && x.personalita === personalita),
      nonReclutabile: p.nonReclutabile, servobot: p.servobot, straziato: p.straziato,
      macheraNota: p.straziato ? personaDi(p.riga.persona)?.nome ?? null : null,
      righe: rs.map((x) => x.riga), luoghi: new Map(), voci: [], creataDallaVoce: false, chiave: '',
    };
    for (const x of rs) aggiungiLuogo(b, x.riga.dungeonChiave, x.riga.areaChiave, 'battaglia');
    return b;
  };

  // 2. Le righe con il nome dell'Ombra: (nome, Persona), una per personalità se la coppia ne ha di diverse.
  const gruppi = new Map<string, Preparata[]>();
  for (const p of preparate.filter((x) => !x.senzaNome)) {
    const k = `${normalizza(p.nome)}|${p.persona ? p.persona.id : `x:${normalizza(p.riga.persona ?? '')}`}`;
    (gruppi.get(k) ?? gruppi.set(k, []).get(k)!).push(p);
  }
  const bozze: Bozza[] = [];
  for (const k of [...gruppi.keys()].sort()) {
    const rs = gruppi.get(k)!;
    const valori = [...new Set(rs.map((r) => r.personalita).filter((p) => p !== 'sconosciuta'))];
    if (valori.length <= 1) { bozze.push(nuovaBozza(rs[0]!, valori[0] ?? 'sconosciuta', rs)); continue; }
    elenco.variantiPersonalita.push({ nome: rs[0]!.nome, personalita: valori });
    const varianti = valori.map((v) => nuovaBozza(rs.find((r) => r.personalita === v)!, v, rs.filter((r) => r.personalita === v)));
    bozze.push(...varianti);
    const ignote = rs.filter((r) => r.personalita === 'sconosciuta');
    if (ignote.length) {
      elenco.ambigue.push(`${rs[0]!.nome}: ${ignote.length} riga/righe senza personalità attaccate alla variante ${valori[0]} (varianti: ${valori.join(', ')})`);
      for (const x of ignote) { varianti[0]!.righe.push(x.riga); aggiungiLuogo(varianti[0]!, x.riga.dungeonChiave, x.riga.areaChiave, 'battaglia'); }
    }
  }

  // 3. Le righe senza il nome dell'Ombra (Okumura): vanno all'Ombra della stessa Persona se è una sola e compatibile; altrimenti ne nasce una col nome della Persona.
  const anonime = new Map<string, Preparata[]>();
  for (const p of preparate.filter((x) => x.senzaNome)) {
    const k = `${p.persona ? p.persona.id : `x:${normalizza(p.nome)}`}|${p.personalita}`;
    (anonime.get(k) ?? anonime.set(k, []).get(k)!).push(p);
  }
  for (const k of [...anonime.keys()].sort()) {
    const rs = anonime.get(k)!;
    const p0 = rs[0]!;
    const compatibili = p0.persona
      ? bozze.filter((b) => b.persona?.id === p0.persona!.id && (b.personalita === 'sconosciuta' || p0.personalita === 'sconosciuta' || b.personalita === p0.personalita))
      : [];
    if (compatibili.length >= 1) {
      const b = compatibili[0]!;
      if (compatibili.length > 1) elenco.ambigue.push(`${p0.nome} (${p0.riga.dungeonChiave}) senza nome dell'Ombra: poteva andare a ${compatibili.map((c) => c.nome).join(' / ')}`);
      if (b.personalita === 'sconosciuta' && p0.personalita !== 'sconosciuta') { b.personalita = p0.personalita; b.daG021 = p0.daG021; }
      for (const x of rs) { b.righe.push(x.riga); aggiungiLuogo(b, x.riga.dungeonChiave, x.riga.areaChiave, 'battaglia'); }
      continue;
    }
    const b = nuovaBozza(p0, p0.personalita, rs);
    if (!p0.nonReclutabile) elenco.senzaNomeOmbra.push(`${p0.nome} (${p0.riga.dungeonChiave})`);
    bozze.push(b);
  }

  // 4. Le voci Persona dei Palazzi e dei dedali: ognuna a una sola Ombra, per Persona e nome; il resto in elenco.
  const legami: Array<{ voce: string; ombra: Bozza }> = [];
  const senzaPersonalita = (b: Bozza) => b.personalita === 'sconosciuta';
  for (const v of ing.vociDedalo) {
    const p = personaDi(v.maschera);
    if (!p) { elenco.vociSenzaPersona.push(`${v.chiave}: ${v.nome} (maschera «${v.maschera ?? '—'}»)`); continue; }
    let cand = bozze.filter((b) => b.persona?.id === p.id && normalizza(b.nome) === normalizza(v.nome));
    if (cand.length === 0) cand = bozze.filter((b) => b.persona?.id === p.id);
    if (cand.length > 1) {
      const pers = personalitaDaTesto(v.personalita);
      const filtrate = pers === 'sconosciuta' ? [] : cand.filter((b) => b.personalita === pers);
      if (filtrate.length >= 1) cand = filtrate;
      else if (cand.some(senzaPersonalita) && cand.filter(senzaPersonalita).length === 1) cand = cand.filter(senzaPersonalita);
    }
    if (cand.length === 0) {
      const pers = personalitaDaTesto(v.personalita);
      const b: Bozza = {
        nome: v.nome, senzaNome: false, persona: p, personalita: pers, daG021: false, nonReclutabile: false, servobot: false, straziato: false, macheraNota: null,
        righe: [], luoghi: new Map(), voci: [], creataDallaVoce: true, chiave: '',
      };
      bozze.push(b);
      elenco.createDalleVoci.push(`${v.nome} (${p.nome}), dalla voce ${v.chiave}`);
      cand = [b];
    } else if (cand.length > 1) elenco.ambigue.push(`voce ${v.chiave} (${v.nome}): poteva andare a ${cand.map((c) => `${c.nome}/${c.personalita}`).join(' | ')}`);
    legami.push({ voce: v.chiave, ombra: cand[0]! });
  }
  for (const v of ing.vociPalazzo) {
    const parentesi = /\(([^)]*)\)/.exec(v.nome)?.[1]?.replace(/["«»“”]/g, '').trim() ?? null;
    const p = personaDi(testoBase(v.nome)) ?? (parentesi ? personaDi(parentesi) : null);
    if (!p) { elenco.vociNonOmbre.push(`${v.chiave}: ${v.nome}`); continue; }
    let cand = bozze.filter((b) => b.persona?.id === p.id);
    if (cand.length > 1 && parentesi) { const f = cand.filter((b) => normalizza(b.nome) === normalizza(parentesi)); if (f.length >= 1) cand = f; }
    if (cand.length > 1) { const f = cand.filter((b) => [...b.luoghi.values()].some((l) => l.dungeon === v.dungeonChiave)); if (f.length >= 1) cand = f; }
    if (cand.length === 0) {
      const b: Bozza = {
        nome: parentesi && !personaDi(parentesi) ? parentesi : p.nomeIt, senzaNome: !parentesi, persona: p, personalita: 'sconosciuta', daG021: false, nonReclutabile: false, servobot: false,
        straziato: false, macheraNota: null, righe: [], luoghi: new Map(), voci: [], creataDallaVoce: true, chiave: '',
      };
      bozze.push(b);
      elenco.createDalleVoci.push(`${b.nome} (${p.nome}), dalla voce ${v.chiave}`);
      cand = [b];
    } else if (cand.length > 1) elenco.ambigue.push(`voce ${v.chiave} (${v.nome}): poteva andare a ${cand.map((c) => `${c.nome}/${c.personalita}`).join(' | ')}`);
    const b = cand[0]!;
    aggiungiLuogo(b, v.dungeonChiave, v.areaChiave, 'voce');
    legami.push({ voce: v.chiave, ombra: b });
  }
  for (const l of legami) l.ombra.voci.push(l.voce);

  // 5. Le chiavi: lo slug del nome; a parità, la personalità, poi la Persona, poi un numero. L'ordine è quello del nome, così la chiave non dipende dall'ordine dei dati.
  const ordinate = [...bozze].sort((a, b) => (normalizza(a.nome) < normalizza(b.nome) ? -1 : normalizza(a.nome) > normalizza(b.nome) ? 1 : (a.persona?.id ?? 0) - (b.persona?.id ?? 0) || a.personalita.localeCompare(b.personalita)));
  const usate = new Set<string>();
  for (const b of ordinate) {
    const base = slug(b.nome) || 'ombra';
    const candidati = [base, `${base}-${b.personalita}`, `${base}-${slug(b.persona?.nome ?? 'senza-persona')}`];
    let c = candidati.find((x) => !usate.has(x));
    for (let n = 2; !c; n++) { const x = `${base}-${n}`; if (!usate.has(x)) c = x; }
    usate.add(c);
    b.chiave = c;
  }

  // Stessa Persona e stessa personalità ma nomi diversi: forse la stessa Ombra scritta in due modi (non si fonde senza approvazione).
  const perPersona = new Map<string, Bozza[]>();
  for (const b of ordinate) {
    if (!b.persona) continue;
    const k = `${b.persona.id}|${b.personalita}`;
    const gia = perPersona.get(k);
    if (gia) gia.push(b); else perPersona.set(k, [b]);
  }
  for (const [k, bs] of perPersona) {
    if (new Set(bs.map((b) => normalizza(b.nome))).size > 1) elenco.possibiliDoppioni.push({ persona: bs[0]!.persona!.nome, personalita: k.split('|')[1]!, ombre: bs.map((b) => `${b.chiave} («${b.nome}»)`) });
  }

  // 6. I dati propri di ogni Ombra.
  const ombre: OmbraNuova[] = ordinate.map((b) => {
    const note: string[] = [];
    const nomiAltri: string[] = [];
    const nome = b.nome;
    for (const a of ALIAS_NEGOZIAZIONE) {
      const coincide = normalizza(nome) === normalizza(a.nome) && (a.persona === null ? b.persona === null : b.persona?.nome === a.persona);
      if (!coincide) continue;
      const it = ing.nomiNegoziazione[a.en];
      if (it && normalizza(it) !== normalizza(nome)) nomiAltri.push(it);
      nomiAltri.push(a.en);
    }
    let affinita: Record<string, CodiceAffinita> | null = null;
    const eccezione = b.persona ? ECCEZIONI_AFFINITA[b.persona.nome] : undefined;
    if (eccezione) {
      affinita = { ...eccezione };
      note.push('Ha affinità proprie, diverse dalla sua Persona nel gioco (G-019): valgono solo gli elementi indicati, il resto è quello della Persona.');
      elenco.eccezioniAffinita.push(`${b.chiave} (${b.persona!.nome})`);
    }
    if (b.nonReclutabile) {
      affinita = {};
      for (const r of b.righe) {
        for (const [lista, predefinito] of [[r.debolezze, 'wk'], [r.resistenze, 'rs']] as const) {
          for (const t of lista) {
            const a = affinitaDaTesto(t, predefinito);
            if (!a) { elenco.affinitaNonRiconosciute.push(`${b.chiave}: «${t}»`); continue; }
            if (!(a.elemento in affinita)) affinita[a.elemento] = a.codice;
          }
        }
      }
      if (Object.keys(affinita).length === 0) affinita = null;
      elenco.nonReclutabili.push(b.chiave);
      if (b.straziato) note.push('Non reclutabile: obiettivo di una Richiesta, non negoziabile. La maschera Mara è solo descrittiva. Personalità indicata come Irritabile (dati di gioco Royal, certezza media), non verificata.');
      if (b.servobot) note.push('Servobot di Okumura: non reclutabile e non negoziabile.');
    }
    if ((b.senzaNome || b.creataDallaVoce) && !b.servobot) note.push('Il nome dell’Ombra non è indicato dalla guida: è quello della Persona.');
    if (b.persona && NON_CATTURABILI_PER_PERSONA.has(b.persona.nome)) note.push('Non si può reclutare dall’incontro: la Persona si ottiene solo con la fusione (AllGameStaff, settimana 40).');
    const demone = ing.demoniTesoro.has(normalizza(b.nome)) || (b.persona !== null && (ing.demoniTesoro.has(normalizza(b.persona.nomeIt)) || ing.demoniTesoro.has(normalizza(b.persona.nome))));
    if (demone) { note.push('Demone del Tesoro: la sua personalità è nei dati ma la negoziazione va verificata (G-021).'); elenco.negoziazioneDaVerificare.push(b.chiave); }
    if (b.daG021) { note.push('Personalità dai dati del gioco Royal (G-021 §5).'); elenco.personalitaDaG021.push(b.chiave); }
    if (b.personalita === 'sconosciuta') elenco.personalitaSconosciute.push(b.chiave);
    const livelli = b.righe.map((r) => r.livello).filter((x): x is number => typeof x === 'number');
    return {
      chiave: b.chiave, nome, nomiAltri, personaId: b.persona?.id ?? null, macheraNota: b.macheraNota, personalita: b.personalita,
      catturabile: b.nonReclutabile || (b.persona !== null && NON_CATTURABILI_PER_PERSONA.has(b.persona.nome)) ? 0 : 1,
      negoziabile: b.servobot || b.straziato ? 0 : demone ? null : 1,
      affinitaProprie: affinita, livello: livelli.length ? livelli[0]! : null, note: note.join(' '),
      luoghi: [...b.luoghi.values()], voci: b.voci, righe: b.righe.length,
    };
  });
  return { ombre, legami: legami.map((l) => ({ voce: l.voce, ombra: l.ombra.chiave })), elenco };
}
