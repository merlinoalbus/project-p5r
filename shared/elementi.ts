// ============================================================
// elementi — il vocabolario unico di L8 (R8-20c): elementi, tipi di skill, esiti delle affinità, personalità delle Ombre
// ============================================================
//
// Un solo punto di verità per i nomi italiani e per le chiavi stabili: compendio, Battaglia, pagina Ombra, negoziazione e voci
// generate lo leggono da qui. I nomi sono quelli della guida italiana (G-025, certezza alta). Le chiavi sono quelle già in uso nei dati
// (`persona_affinita.elemento`, `skill.elemento`, `traduzione`): non cambiano mai.
//
// Le forme vecchie («Psichico», «Oscurità», «Quasi-divino», «Guarigione», «Tuono», «Gelo», «respinge») sopravvivono SOLO come sinonimi
// in lettura, per riconoscere il testo che la guida (o l'utente) ha già scritto: si riconoscono, ma si mostrano col nome canonico.
// Il testo libero scritto dall'utente non si riscrive mai: `nomeCanonicoNelTesto` serve a chi mostra i dati generati dall'app.
// ============================================================

// ---- Elementi ----

/** Chiavi degli elementi (skill e affinità). `almighty` è solo delle skill: nessuna Persona ha un'affinità Divino. */
export type ChiaveElemento = 'phys' | 'gun' | 'fire' | 'ice' | 'electric' | 'wind' | 'psy' | 'nuclear' | 'bless' | 'curse' | 'almighty';

/** Gli elementi nell'ordine di gioco, con il nome della guida. */
export const ELEMENTI: ReadonlyArray<{ chiave: ChiaveElemento; nome: string }> = [
  { chiave: 'phys', nome: 'Fisico' },
  { chiave: 'gun', nome: 'Arma da fuoco' },
  { chiave: 'fire', nome: 'Fuoco' },
  { chiave: 'ice', nome: 'Ghiaccio' },
  { chiave: 'electric', nome: 'Elettricità' },
  { chiave: 'wind', nome: 'Vento' },
  { chiave: 'psy', nome: 'Psicocinesi' },
  { chiave: 'nuclear', nome: 'Nucleare' },
  { chiave: 'bless', nome: 'Sacro' },
  { chiave: 'curse', nome: 'Maledizione' },
  { chiave: 'almighty', nome: 'Divino' },
];

/** Gli elementi che una Persona può avere in affinità (tutti tranne Divino), nell'ordine di gioco. */
export const ELEMENTI_AFFINITA: ReadonlyArray<{ chiave: ChiaveElemento; nome: string }> = ELEMENTI.filter((e) => e.chiave !== 'almighty');

/** Nome canonico di ogni elemento. */
export const NOME_ELEMENTO = Object.fromEntries(ELEMENTI.map((e) => [e.chiave, e.nome])) as Record<ChiaveElemento, string>;

/** Sigle brevi che cambiano con il vocabolario (le altre restano quelle dei dati): Psicocinesi → Psi, Maledizione → Mal, Divino → Div. */
export const SIGLA_ELEMENTO: Readonly<Partial<Record<ChiaveElemento, string>>> = { psy: 'Psi', curse: 'Mal', almighty: 'Div' };

/** Vero se la stringa è la chiave di un elemento. */
export function eChiaveElemento(v: unknown): v is ChiaveElemento {
  return typeof v === 'string' && Object.hasOwn(NOME_ELEMENTO, v);
}

// ---- Tipi di skill (oltre agli elementi) ----

export type ChiaveTipoSkill = 'ailment' | 'healing' | 'support' | 'passive' | 'trait';

/** I tipi di skill: `nome` è l'etichetta della singola skill, `plurale` l'intestazione di un gruppo. */
export const TIPI_SKILL: ReadonlyArray<{ chiave: ChiaveTipoSkill; nome: string; plurale: string }> = [
  { chiave: 'ailment', nome: 'Alterazione', plurale: 'Alterazioni' },
  { chiave: 'healing', nome: 'Recupero', plurale: 'Recupero' },
  { chiave: 'support', nome: 'Supporto', plurale: 'Supporto' },
  { chiave: 'passive', nome: 'Passiva', plurale: 'Passive' },
  { chiave: 'trait', nome: 'Tratto', plurale: 'Tratti' },
];

export const NOME_TIPO_SKILL = Object.fromEntries(TIPI_SKILL.map((t) => [t.chiave, t.nome])) as Record<ChiaveTipoSkill, string>;

// ---- Esiti delle affinità ----

/** I codici dell'affinità, come in `persona_affinita.codice`. «-» è normale. */
export type CodiceAffinita = 'wk' | 'rs' | 'nu' | 'rp' | 'ab' | '-';

/** Gli esiti dell'affinità nell'ordine di lettura (dal più fragile al più forte). */
export const ESITI_AFFINITA: ReadonlyArray<{ codice: CodiceAffinita; chiave: string; nome: string }> = [
  { codice: 'wk', chiave: 'debole', nome: 'Debole' },
  { codice: 'rs', chiave: 'resiste', nome: 'Resiste' },
  { codice: 'nu', chiave: 'annulla', nome: 'Annulla' },
  { codice: 'rp', chiave: 'riflette', nome: 'Riflette' },
  { codice: 'ab', chiave: 'assorbe', nome: 'Assorbe' },
  { codice: '-', chiave: 'normale', nome: 'Normale' },
];

export const NOME_ESITO_AFFINITA = Object.fromEntries(ESITI_AFFINITA.map((e) => [e.codice, e.nome])) as Record<CodiceAffinita, string>;

/** Vero se il valore è un codice di affinità valido. */
export function eCodiceAffinita(v: unknown): v is CodiceAffinita {
  return typeof v === 'string' && Object.hasOwn(NOME_ESITO_AFFINITA, v);
}

// ---- Personalità delle Ombre (gli «umori» della negoziazione) ----

/** Le quattro personalità del gioco e «sconosciuta», quando nessuna fonte la dice. */
export type PersonalitaOmbra = 'giocosa' | 'timida' | 'irritabile' | 'cupa' | 'sconosciuta';
/** Le sole quattro personalità del gioco (hanno una negoziazione). */
export type UmoreNegoziazione = Exclude<PersonalitaOmbra, 'sconosciuta'>;

export const UMORI: ReadonlyArray<{ chiave: UmoreNegoziazione; nome: string }> = [
  { chiave: 'giocosa', nome: 'Giocosa' },
  { chiave: 'timida', nome: 'Timida' },
  { chiave: 'irritabile', nome: 'Irritabile' },
  { chiave: 'cupa', nome: 'Cupa' },
];

export const PERSONALITA_OMBRA: ReadonlyArray<PersonalitaOmbra> = [...UMORI.map((u) => u.chiave), 'sconosciuta'];

export const NOME_PERSONALITA: Readonly<Record<PersonalitaOmbra, string>> = { giocosa: 'Giocosa', timida: 'Timida', irritabile: 'Irritabile', cupa: 'Cupa', sconosciuta: 'Sconosciuta' };

/** Gli esiti di una risposta di negoziazione (non sono gli esiti dell'affinità). */
export type EsitoNegoziazione = 'buona' | 'passabile' | 'cattiva';
export const ESITI_NEGOZIAZIONE: ReadonlyArray<EsitoNegoziazione> = ['buona', 'passabile', 'cattiva'];

/** Dalla personalità scritta dalla guida («Giocosa», «-», «Non reclutabile», vuota) alla chiave; ciò che non è una delle quattro è «sconosciuta». */
export function personalitaDaTesto(testo: unknown): PersonalitaOmbra {
  if (typeof testo !== 'string') return 'sconosciuta';
  const k = testo.trim().toLowerCase();
  return (UMORI.find((u) => u.chiave === k)?.chiave) ?? 'sconosciuta';
}

// ---- Lettura del testo della guida ----

/** Sinonimi di ogni elemento, vecchi e nuovi: si riconoscono in lettura, non si scrivono più. */
const CORRISPONDENZE: ReadonlyArray<readonly [RegExp, ChiaveElemento]> = [
  // «Fisico», «Danno fisico», «Danni fisici», «Attacchi fisici»
  [/(^|\s)fisic/i, 'phys'],
  [/^(arma|armi|pistol|proiettil|sparo|fuoco d'arma)/i, 'gun'],
  [/^(fuoco|fiamm|ign)/i, 'fire'],
  [/^(ghiacc|gelo|freddo|glaci)/i, 'ice'],
  [/^(tuono|elettr|fulmin|scarica)/i, 'electric'],
  [/^(vento|aria|raffic)/i, 'wind'],
  [/^(psi|psichic|mental)/i, 'psy'],
  [/^(nucle|atomic)/i, 'nuclear'],
  [/^(sacro|benedi|luce|santo)/i, 'bless'],
  [/^(maledi|oscur|tenebr|buio)/i, 'curse'],
  [/^(quasi-?divin|divino|onnipot)/i, 'almighty'],
];

/** Chiave dell'elemento (`fire`, `curse`, …) riconosciuta dal testo della guida, anche con una nota fra parentesi; null se non è un elemento. */
export function chiaveElementoDaTesto(testo: string): ChiaveElemento | null {
  const base = testo.replace(/\(.*?\)/g, '').trim();
  for (const [re, chiave] of CORRISPONDENZE) if (re.test(base)) return chiave;
  return null;
}

/** Sinonimi dell'esito scritti dalla guida fra parentesi («Tuono (respinge)»). */
const ESITI_DA_TESTO: ReadonlyArray<readonly [RegExp, CodiceAffinita]> = [
  [/^(dimezza|resiste|resistenza|riduce)/i, 'rs'],
  [/^(annulla|nullo|nulla|immune)/i, 'nu'],
  [/^(respinge|riflette|rifletti|rimanda)/i, 'rp'],
  [/^(assorbe|assorbito)/i, 'ab'],
  [/^(debole|debolezza)/i, 'wk'],
];

/** L'affinità scritta dalla guida: «Tuono (respinge)» → { elemento: electric, codice: rp }. Il nome senza nota vale `predefinito` (nelle debolezze «wk», nelle resistenze «rs»). Null se non è un elemento o la nota non si riconosce. */
export function affinitaDaTesto(testo: string, predefinito: CodiceAffinita = 'wk'): { elemento: ChiaveElemento; codice: CodiceAffinita } | null {
  const elemento = chiaveElementoDaTesto(testo);
  if (!elemento) return null;
  const nota = /\(\s*([^)]*?)\s*\)/.exec(testo)?.[1];
  if (nota === undefined) return { elemento, codice: predefinito };
  const trovato = ESITI_DA_TESTO.find(([re]) => re.test(nota));
  return trovato ? { elemento, codice: trovato[1] } : null;
}

/**
 * Un elemento della guida riscritto col vocabolario unico («Tuono (respinge)» → «Elettricità (Riflette)»). Il testo che non è un elemento
 * (o ha una nota che non si riconosce) torna identico: non si inventa nulla.
 */
export function nomeCanonicoNelTesto(testo: string): string {
  const a = affinitaDaTesto(testo, '-');
  if (!a) return testo;
  const nota = /\(/.test(testo);
  return nota && a.codice !== '-' ? `${NOME_ELEMENTO[a.elemento]} (${NOME_ESITO_AFFINITA[a.codice]})` : NOME_ELEMENTO[a.elemento];
}

/** Come `nomeCanonicoNelTesto` per un elenco scritto in una riga («Gelo, Tuono (respinge)»): ogni voce separata da virgola si riscrive da sé. */
export function elencoCanonicoNelTesto(testo: string): string {
  return testo.split(',').map((p) => nomeCanonicoNelTesto(p.trim())).join(', ');
}
