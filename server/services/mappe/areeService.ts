// ============================================================
// areeService — le Aree del mondo (L2, 2026-10-20): Città → Quartiere → Area → Planimetrie → Luoghi
// ============================================================
//
// Un'Area raccoglie le planimetrie (versioni) della stessa zona di un quartiere — o della città, per lo staff che nessuna fonte
// colloca — e ne dice nome, ordine e planimetria predefinita (tabella `area`, migrazione 109). Questo servizio la legge per le
// pagine (elenco del contenitore, pagina dell'Area, planimetrie da collocare) e la scrive (creazione con la prima planimetria,
// versioni, rinomina, ordine, ripristino, eliminazione nel cestino, collocazione). Le rotte sono generiche sul contenitore
// (`/api/aree/:contenitore/:chiave/…`): in L2 il contenitore è `citta`, con la chiave di un quartiere o `tokyo` per la città; L3
// aggiungerà `dungeon` senza rotte nuove (lotti/L2/modifiche.md §3).
// ============================================================

import { getDb, nowIso, prepared } from '../../db/dbService.js';
import { HttpError, httpErrors } from '../../utils/httpError.js';
import { slug } from '../../../shared/slug.js';
import { verificaPartita } from '../verificaPartita.js';
import { invalidaCacheDiGioco } from '../cacheDiGioco.js';
import { conCestino, registraRipristinoCestino } from '../cestinoService.js';
import { chiaveMappa, idMappa, sincronizzaPercorsiMappe } from './percorsiMappe.js';
import { creaMappa, creaSpillo, eliminaMappa, eliminaSpillo, impostaImmagineMappa } from './mappeService.js';
import { caricataDellaMappa, illustrazioneDellaMappa, immaginiCaricateDelleMappe, urlCaricata } from './immagineMappa.js';
import { casaDellArea, casaDellaMappa, conAree, contenitoreDi, contestoAree, type ContestoAree, type RigaArea } from './casaMappa.js';
import type { AreaDettaglioDto, AreaRiassuntoDto, ElementoAreaDto, MappaDaCollocareDto, PlanimetriaAreaDto, RuoloImmagine } from '../../../shared/types.js';

/** I contenitori ammessi nelle rotte, in L2: la città (Tokyo) e i suoi quartieri. */
export const CONTENITORI_AREA = ['citta'] as const;
export type ContenitoreRotta = (typeof CONTENITORI_AREA)[number];

/** Dove sta un'Area: la colonna che la lega al contenitore, la sua chiave e la mappa che lo illustra (pin di passaggio, genitore). */
export interface Contenitore { colonna: 'quartiere_chiave' | 'citta_chiave'; chiave: string; mappa: string; nome: string }

/**
 * Il contenitore indicato dalla rotta: `citta/tokyo` è la città, `citta/<quartiere>` un quartiere. 404 `quartiere-non-trovato` se
 * il quartiere non c'è (o è l'ingresso dei Memento, che non ha Aree).
 */
export function contenitoreDaRotta(contenitore: ContenitoreRotta, chiave: string): Contenitore {
  if (contenitore === 'citta' && chiave === 'tokyo') return { colonna: 'citta_chiave', chiave: 'tokyo', mappa: 'tokyo', nome: 'Tokyo' };
  const q = chiave === 'mementos' ? undefined : prepared('SELECT chiave, nome FROM quartiere WHERE chiave = ?').get(chiave) as { chiave: string; nome: string } | undefined;
  if (!q) throw httpErrors.notFound('quartiere-non-trovato', `Il quartiere '${chiave}' non esiste.`);
  return { colonna: 'quartiere_chiave', chiave: q.chiave, mappa: `citta-${q.chiave}`, nome: q.nome };
}

/** La riga di un'Area del contenitore per slug; 404 `area-non-trovata` se manca. */
export function rigaArea(c: Contenitore, slug: string): RigaArea {
  const a = conAree() ? prepared(`SELECT * FROM area WHERE ${c.colonna} = ? AND slug = ?`).get(c.chiave, slug) as RigaArea | undefined : undefined;
  if (!a) throw httpErrors.notFound('area-non-trovata', `Nessuna Area '${slug}' in ${c.nome}.`);
  return a;
}

interface RigaPlanimetria { chiave: string; nome: string; immagine_chiave: string | null; asset: string | null; ruolo_immagine: RuoloImmagine; versione_etichetta: string | null; versione_ordine: number | null; area_chiave: string }

/** Le planimetrie di un'Area, nell'ordine delle versioni (a parità, per chiave). */
function planimetrieDi(area: string): RigaPlanimetria[] {
  return prepared('SELECT chiave, nome, immagine_chiave, asset, ruolo_immagine, versione_etichetta, versione_ordine, area_chiave FROM mappa WHERE area_chiave = ? ORDER BY versione_ordine, chiave').all(area) as RigaPlanimetria[];
}

/** I conteggi letti una volta per una risposta che descrive più Aree. */
interface ContestoElenco { aree: ContestoAree; spilli: Map<string, number>; ingressi: Set<string>; caricate: Map<string, string> }

function contestoElenco(): ContestoElenco {
  return {
    aree: contestoAree(),
    spilli: new Map((prepared('SELECT mappa_chiave AS chiave, COUNT(*) AS n FROM spillo GROUP BY mappa_chiave').all() as Array<{ chiave: string; n: number }>).map((r) => [r.chiave, r.n])),
    ingressi: new Set((prepared('SELECT area_chiave FROM quartiere_ingresso WHERE area_chiave IS NOT NULL').all() as Array<{ area_chiave: string }>).map((r) => r.area_chiave)),
    caricate: immaginiCaricateDelleMappe(),
  };
}

/** Il riassunto di un'Area: contenitore, nome, ordine, predefinita con la sua illustrazione, conteggi, passaggio, ingresso, stato. */
function riassuntoArea(a: RigaArea, c: Contenitore, ctx: ContestoElenco): AreaRiassuntoDto {
  const planimetrie = planimetrieDi(a.chiave);
  const chiavi = planimetrie.map((p) => p.chiave);
  // il pin di passaggio verso l'Area sull'illustrazione del contenitore: il primo (per id) che porta a una sua planimetria
  const passaggio = chiavi.length === 0 ? undefined : prepared(`SELECT id, x, y FROM spillo WHERE mappa_chiave = ? AND riferimento_tipo = 'mappa'
    AND riferimento_chiave IN (${chiavi.map(() => '?').join(', ')}) ORDER BY id LIMIT 1`).get(c.mappa, ...chiavi) as { id: number; x: number; y: number } | undefined;
  return {
    chiave: a.chiave, contenitore: contenitoreDi(a, ctx.aree), slug: a.slug, nome: a.nome, nomeRivisto: a.nome_rivisto === 1, ordine: a.ordine,
    predefinita: a.planimetria_predefinita ? chiaveMappa(a.planimetria_predefinita) : null,
    illustrazione: a.planimetria_predefinita ? illustrazioneDellaMappa(a.planimetria_predefinita, getDb(), ctx.caricate) : { immagineUrl: null, asset: null },
    numeroPlanimetrie: planimetrie.length, numeroSpilli: chiavi.reduce((n, k) => n + (ctx.spilli.get(k) ?? 0), 0),
    passaggio: passaggio ? { spillo: passaggio.id, x: passaggio.x, y: passaggio.y } : null,
    ingresso: ctx.ingressi.has(a.chiave), origine: a.origine, modificata: a.seed_json !== null, daVerificare: a.da_verificare === 1,
    casa: casaDellArea(a) ?? '',
  };
}

/** Le Aree di un contenitore, nel loro ordine (a parità, per slug). */
export function areeDelContenitore(c: Contenitore): AreaRiassuntoDto[] {
  if (!conAree()) return [];
  const ctx = contestoElenco();
  return (prepared(`SELECT * FROM area WHERE ${c.colonna} = ? ORDER BY ordine, slug`).all(c.chiave) as RigaArea[]).map((a) => riassuntoArea(a, c, ctx));
}

/** Quante Aree ha ogni quartiere (per le schede de La città). */
export function numeroAreePerQuartiere(): Map<string, number> {
  if (!conAree()) return new Map();
  return new Map((prepared('SELECT quartiere_chiave AS chiave, COUNT(*) AS n FROM area WHERE quartiere_chiave IS NOT NULL GROUP BY quartiere_chiave').all() as Array<{ chiave: string; n: number }>).map((r) => [r.chiave, r.n]));
}

/** I nomi dei luoghi, negozi e Confidenti segnati dai pin di un'Area, dal catalogo (non dal pin). */
const NOMI_ELEMENTI: Record<ElementoAreaDto['tipo'], string> = {
  luogo: 'SELECT nome FROM luogo WHERE chiave = ?',
  attivita: 'SELECT nome FROM luogo WHERE chiave = ?',
  negozio: 'SELECT nome FROM negozio WHERE chiave = ?',
  confidente: 'SELECT nome FROM confidente WHERE chiave = ?',
};

/**
 * La pagina di un'Area: il riassunto, le versioni con immagine e pin, gli elementi segnati sulle sue planimetrie e le Aree (o i
 * quartieri) vicine, cioè dove portano i suoi passaggi. Con `partitaId` la partita deve esistere (404 come altrove).
 */
export function dettaglioArea(contenitore: ContenitoreRotta, chiave: string, slug: string, partitaId?: number): AreaDettaglioDto {
  if (partitaId !== undefined) verificaPartita(partitaId);
  const c = contenitoreDaRotta(contenitore, chiave);
  const a = rigaArea(c, slug);
  const ctx = contestoElenco();
  const planimetrie = planimetrieDi(a.chiave);
  const proprie = new Set(planimetrie.map((p) => p.chiave));
  const versioni: PlanimetriaAreaDto[] = planimetrie.map((p, i) => {
    const img = caricataDellaMappa(p, ctx.caricate);
    return { chiave: chiaveMappa(p.chiave), nome: p.nome, etichetta: p.versione_etichetta, ordine: p.versione_ordine ?? i, predefinita: p.chiave === a.planimetria_predefinita,
      numeroSpilli: ctx.spilli.get(p.chiave) ?? 0, immagineUrl: img ? urlCaricata(img) : null, asset: p.asset, ruoloImmagine: p.ruolo_immagine };
  });
  const segnaposti = planimetrie.map(() => '?').join(', ');
  const pin = planimetrie.length === 0 ? [] : prepared(`SELECT id, mappa_chiave, riferimento_tipo, riferimento_chiave FROM spillo WHERE mappa_chiave IN (${segnaposti})
    AND riferimento_tipo IN ('luogo', 'negozio', 'attivita', 'confidente', 'mappa') AND riferimento_chiave IS NOT NULL ORDER BY mappa_chiave, ordine, id`).all(...proprie) as
    Array<{ id: number; mappa_chiave: string; riferimento_tipo: ElementoAreaDto['tipo'] | 'mappa'; riferimento_chiave: string }>;
  const elementi: ElementoAreaDto[] = [];
  const vicine: AreaDettaglioDto['vicine'] = [];
  const viste = new Set<string>();
  for (const s of pin) {
    if (s.riferimento_tipo !== 'mappa') {
      const nome = (prepared(NOMI_ELEMENTI[s.riferimento_tipo]).get(s.riferimento_chiave) as { nome: string } | undefined)?.nome;
      if (nome) elementi.push({ tipo: s.riferimento_tipo, chiave: s.riferimento_chiave, nome, spillo: s.id, planimetria: chiaveMappa(s.mappa_chiave) });
      continue;
    }
    // un passaggio: dove porta, una volta per destinazione (un'Area vicina, o la mappa di un quartiere), lei esclusa
    const meta = prepared('SELECT * FROM mappa WHERE chiave = ?').get(idMappa(s.riferimento_chiave)) as
      { chiave: string; nome: string; tipo: string; entita_tipo: string | null; entita_chiave: string | null; area_chiave: string | null } | undefined;
    if (!meta || proprie.has(meta.chiave)) continue;
    const areaMeta = meta.area_chiave ? ctx.aree.aree.get(meta.area_chiave) : undefined;
    const chiaveVista = areaMeta ? `area:${areaMeta.chiave}` : `mappa:${meta.chiave}`;
    if (viste.has(chiaveVista)) continue;
    viste.add(chiaveVista);
    const quartiere = areaMeta?.quartiere_chiave ?? (meta.tipo === 'quartiere' && meta.entita_tipo === 'quartiere' ? meta.entita_chiave : null);
    vicine.push({ nome: areaMeta?.nome ?? meta.nome, quartiereNome: quartiere ? ctx.aree.nomiQuartieri.get(quartiere) ?? null : null,
      casa: areaMeta ? casaDellArea(areaMeta) ?? casaDellaMappa(meta, ctx.aree) : casaDellaMappa(meta, ctx.aree) });
  }
  return { ...riassuntoArea(a, c, ctx), planimetrie: versioni, elementi, vicine };
}

// ---- Scritture ----

/** Gli slug che non possono essere di un'Area: sono segmenti delle rotte delle Aree (gli stessi della 109). */
const SLUG_RISERVATI = new Set(['ordine', 'da-collocare', 'nuova']);

/** Il nome dato, senza spazi ai bordi; 400 `nome-vuoto` se non resta niente. */
function nomeValido(nome: string): string {
  const n = nome.trim();
  if (!n) throw httpErrors.badRequest('nome-vuoto', 'Il nome dell’area non può essere vuoto.');
  return n;
}

/** Lo slug di un'Area nuova nel contenitore: dal nome, 400 se riservato, con `-2`, `-3`… se è già preso. */
function slugLibero(c: Contenitore, nome: string): string {
  const base = slug(nome);
  if (!base) throw httpErrors.badRequest('nome-vuoto', 'Il nome dell’area deve contenere almeno una lettera o una cifra.');
  if (SLUG_RISERVATI.has(base)) throw httpErrors.badRequest('slug-riservato', `«${nome}» darebbe all’area l’indirizzo «${base}», riservato alle funzioni dell’app: scegli un altro nome.`);
  const usati = new Set(prepared(`SELECT slug FROM area WHERE ${c.colonna} = ?`).pluck().all(c.chiave) as string[]);
  let candidato = base; let n = 2;
  while (usati.has(candidato)) candidato = `${base}-${n++}`;
  return candidato;
}

/** Gli errori di `creaMappa` che dicono «chiave o percorso già presi»: con un altro nome si riprova. */
const CHIAVE_PRESA = new Set(['mappa-esistente', 'percorso-gia-usato', 'nome-mappa-duplicato']);

/**
 * Una planimetria nuova sotto la mappa del contenitore, col nome dato; se la chiave che ne deriva è già presa (un'altra mappa,
 * un percorso o un indirizzo di prima) riprova con «Nome (2)», «Nome (3)»… La chiave interna.
 */
function creaPlanimetria(c: Contenitore, nome: string): string {
  for (let n = 1; n < 100; n++) {
    const tentativo = n === 1 ? nome : `${nome} (${n})`;
    try {
      return idMappa(creaMappa(undefined, { nome: tentativo, tipo: 'luogo', genitore: c.mappa, asset: null }, { dallArea: true }).chiave);
    } catch (err) {
      if (err instanceof HttpError && CHIAVE_PRESA.has(err.code)) continue;
      throw err;
    }
  }
  throw httpErrors.conflict('mappa-esistente', `Non c’è un nome libero per la planimetria «${nome}».`);
}

/** Lega la planimetria all'Area come versione `ordine`, con l'etichetta (vuota = nessuna). */
function legaVersione(mappa: string, area: string, ordine: number, etichetta: string | null | undefined): void {
  prepared('UPDATE mappa SET area_chiave = ?, versione_ordine = ?, versione_etichetta = ?, updated_at = ? WHERE chiave = ?').run(area, ordine, etichetta?.trim() || null, nowIso(), mappa);
}

/** La prossima posizione in fondo al contenitore. */
function ordineInFondo(c: Contenitore): number {
  return prepared(`SELECT COALESCE(MAX(ordine) + 100, 0) FROM area WHERE ${c.colonna} = ?`).pluck().get(c.chiave) as number;
}

/** L'immagine di una planimetria nuova: tipo, byte e conferma dei pezzi come nell'editor (una mappa nuova non ne ha). */
export interface ImmagineNuova { mime: string; contenuto: Buffer }

/**
 * Crea un'Area con la sua prima planimetria e l'immagine (R2-23): in una transazione l'Area (dell'utente, in fondo al contenitore),
 * la planimetria sotto la mappa del contenitore (ruolo dedotto, L1), e — se c'è il punto — il pin di passaggio sull'illustrazione
 * del contenitore, col nome dell'Area. Un errore (immagine non valida, nome vuoto o riservato) non lascia niente.
 */
export function creaArea(contenitore: ContenitoreRotta, chiave: string, dati: { nome: string; immagine: ImmagineNuova; x?: number; y?: number; etichetta?: string }): AreaDettaglioDto {
  const c = contenitoreDaRotta(contenitore, chiave);
  const nome = nomeValido(dati.nome);
  const slugArea = slugLibero(c, nome);
  const chiaveArea = `citta/${c.chiave}/${slugArea}`;
  getDb().transaction(() => {
    prepared(`INSERT INTO area (chiave, quartiere_chiave, dungeon_chiave, citta_chiave, slug, nome, nome_rivisto, ordine, planimetria_predefinita, origine, seed_json, da_verificare, updated_at)
      VALUES (?, ?, NULL, ?, ?, ?, 0, ?, NULL, 'utente', NULL, 0, ?)`).run(chiaveArea, c.colonna === 'quartiere_chiave' ? c.chiave : null, c.colonna === 'citta_chiave' ? c.chiave : null, slugArea, nome, ordineInFondo(c), nowIso());
    const mappa = creaPlanimetria(c, nome);
    legaVersione(mappa, chiaveArea, 0, dati.etichetta);
    impostaImmagineMappa(mappa, dati.immagine.mime, dati.immagine.contenuto);
    prepared('UPDATE area SET planimetria_predefinita = ? WHERE chiave = ?').run(mappa, chiaveArea);
    if (dati.x !== undefined && dati.y !== undefined) {
      creaSpillo(c.mappa, { tipo: 'passaggio', nome, x: dati.x, y: dati.y, riferimento: { tipo: 'mappa', chiave: chiaveMappa(mappa) } });
    }
  })();
  invalidaCacheDiGioco();
  return dettaglioArea(contenitore, chiave, slugArea);
}

/** Aggiunge una planimetria in coda alle versioni dell'Area (R2-24), con l'immagine; `predefinita` la fa aprire per prima. */
export function aggiungiPlanimetria(contenitore: ContenitoreRotta, chiave: string, slugArea: string, dati: { immagine: ImmagineNuova; etichetta?: string; predefinita?: boolean }): AreaDettaglioDto {
  const c = contenitoreDaRotta(contenitore, chiave);
  const a = rigaArea(c, slugArea);
  getDb().transaction(() => {
    const ordine = prepared('SELECT COALESCE(MAX(versione_ordine) + 1, 0) FROM mappa WHERE area_chiave = ?').pluck().get(a.chiave) as number;
    const etichetta = dati.etichetta?.trim();
    const mappa = creaPlanimetria(c, etichetta ? `${a.nome} — ${etichetta}` : `${a.nome} ${ordine + 1}`);
    legaVersione(mappa, a.chiave, ordine, etichetta);
    impostaImmagineMappa(mappa, dati.immagine.mime, dati.immagine.contenuto);
    if (dati.predefinita || !a.planimetria_predefinita) prepared('UPDATE area SET planimetria_predefinita = ?, updated_at = ? WHERE chiave = ?').run(mappa, nowIso(), a.chiave);
  })();
  invalidaCacheDiGioco();
  return dettaglioArea(contenitore, chiave, slugArea);
}

/** La copia dei valori della guida, presa alla prima correzione di un'Area del pacchetto (come `luogo.seed_json`, 071). */
function seedJson(a: RigaArea): string {
  return JSON.stringify({ nome: a.nome, nome_rivisto: a.nome_rivisto, planimetria_predefinita: a.planimetria_predefinita });
}

/**
 * Corregge un'Area: il nome (lo slug, e quindi l'indirizzo, non cambia), la planimetria predefinita (una delle sue) e «Tieni» per
 * un'Area da verificare (`daVerificare: false`). La prima correzione di un'Area della guida ne conserva i valori, che «Ripristina»
 * rimette (R2-28).
 */
export function aggiornaArea(contenitore: ContenitoreRotta, chiave: string, slugArea: string, dati: { nome?: string; predefinita?: string; daVerificare?: false }): AreaDettaglioDto {
  const c = contenitoreDaRotta(contenitore, chiave);
  const a = rigaArea(c, slugArea);
  const nome = dati.nome === undefined ? undefined : nomeValido(dati.nome);
  let predefinita: string | undefined;
  if (dati.predefinita !== undefined) {
    predefinita = idMappa(dati.predefinita);
    if (!prepared('SELECT 1 FROM mappa WHERE chiave = ? AND area_chiave = ?').get(predefinita, a.chiave)) {
      throw httpErrors.badRequest('planimetria-di-altra-area', 'La planimetria predefinita si sceglie fra le versioni dell’area.');
    }
  }
  const cambiaGuida = (nome !== undefined && nome !== a.nome) || (predefinita !== undefined && predefinita !== a.planimetria_predefinita);
  getDb().transaction(() => {
    if (cambiaGuida && a.origine === 'seed' && a.seed_json === null) prepared('UPDATE area SET seed_json = ? WHERE chiave = ?').run(seedJson(a), a.chiave);
    if (nome !== undefined && nome !== a.nome) prepared('UPDATE area SET nome = ?, nome_rivisto = 1 WHERE chiave = ?').run(nome, a.chiave);
    if (predefinita !== undefined) prepared('UPDATE area SET planimetria_predefinita = ? WHERE chiave = ?').run(predefinita, a.chiave);
    if (dati.daVerificare === false) prepared('UPDATE area SET da_verificare = 0 WHERE chiave = ?').run(a.chiave);
    prepared('UPDATE area SET updated_at = ? WHERE chiave = ?').run(nowIso(), a.chiave);
  })();
  invalidaCacheDiGioco();
  return dettaglioArea(contenitore, chiave, slugArea);
}

/** Rimette i valori della guida di un'Area corretta (R2-28); 409 se l'Area è dell'utente o non è stata corretta. */
export function ripristinaArea(contenitore: ContenitoreRotta, chiave: string, slugArea: string): AreaDettaglioDto {
  const c = contenitoreDaRotta(contenitore, chiave);
  const a = rigaArea(c, slugArea);
  if (a.origine === 'utente') throw httpErrors.conflict('area-dell-utente', 'L’area l’hai creata tu: non ci sono valori della guida da rimettere.');
  if (a.seed_json === null) throw httpErrors.conflict('area-non-modificata', 'L’area ha già i valori della guida.');
  const prima = JSON.parse(a.seed_json) as { nome: string; nome_rivisto: number; planimetria_predefinita: string | null };
  // la predefinita di prima, se è ancora una sua versione; altrimenti resta quella di adesso
  const predefinita = prima.planimetria_predefinita && prepared('SELECT 1 FROM mappa WHERE chiave = ? AND area_chiave = ?').get(prima.planimetria_predefinita, a.chiave)
    ? prima.planimetria_predefinita : a.planimetria_predefinita;
  prepared('UPDATE area SET nome = ?, nome_rivisto = ?, planimetria_predefinita = ?, seed_json = NULL, updated_at = ? WHERE chiave = ?')
    .run(prima.nome, prima.nome_rivisto, predefinita, nowIso(), a.chiave);
  invalidaCacheDiGioco();
  return dettaglioArea(contenitore, chiave, slugArea);
}

/** Riordina le Aree del contenitore: l'elenco deve avere tutti i loro slug, ognuno una volta; `ordine` diventa 100·i. */
export function riordinaAree(contenitore: ContenitoreRotta, chiave: string, slugs: readonly string[]): AreaRiassuntoDto[] {
  const c = contenitoreDaRotta(contenitore, chiave);
  const presenti = prepared(`SELECT slug FROM area WHERE ${c.colonna} = ?`).pluck().all(c.chiave) as string[];
  if (slugs.length !== presenti.length || new Set(slugs).size !== slugs.length || slugs.some((s) => !presenti.includes(s))) {
    throw httpErrors.badRequest('ordine-non-valido', 'L’ordine deve elencare tutte le aree del posto, ognuna una volta.');
  }
  getDb().transaction(() => {
    slugs.forEach((s, i) => prepared(`UPDATE area SET ordine = ?, updated_at = ? WHERE ${c.colonna} = ? AND slug = ?`).run(100 * i, nowIso(), c.chiave, s));
  })();
  invalidaCacheDiGioco();
  return areeDelContenitore(c);
}

/** L'ordine e le etichette delle versioni di un'Area: `ordine` elenca tutte le sue planimetrie (chiavi pubbliche), una volta. */
export function aggiornaVersioni(contenitore: ContenitoreRotta, chiave: string, slugArea: string, dati: { ordine?: readonly string[]; etichette?: Readonly<Record<string, string | null>> }): AreaDettaglioDto {
  const c = contenitoreDaRotta(contenitore, chiave);
  const a = rigaArea(c, slugArea);
  const proprie = new Set(planimetrieDi(a.chiave).map((p) => p.chiave));
  const interne = (chiavi: readonly string[]) => chiavi.map((k) => idMappa(k));
  if (dati.ordine) {
    const ordine = interne(dati.ordine);
    if (ordine.length !== proprie.size || new Set(ordine).size !== ordine.length || ordine.some((k) => !proprie.has(k))) {
      throw httpErrors.badRequest('ordine-non-valido', 'L’ordine deve elencare tutte le planimetrie dell’area, ognuna una volta.');
    }
  }
  const etichette = Object.entries(dati.etichette ?? {}).map(([k, e]) => [idMappa(k), e] as const);
  if (etichette.some(([k]) => !proprie.has(k))) throw httpErrors.badRequest('planimetria-di-altra-area', 'Le etichette sono delle versioni di questa area.');
  getDb().transaction(() => {
    interne(dati.ordine ?? []).forEach((k, i) => prepared('UPDATE mappa SET versione_ordine = ? WHERE chiave = ?').run(i, k));
    for (const [k, e] of etichette) prepared('UPDATE mappa SET versione_etichetta = ? WHERE chiave = ?').run(e?.trim() || null, k);
    prepared('UPDATE area SET updated_at = ? WHERE chiave = ?').run(nowIso(), a.chiave);
  })();
  invalidaCacheDiGioco();
  return dettaglioArea(contenitore, chiave, slugArea);
}

/** Che cosa un'Area si porta via eliminandola (per la conferma). */
export interface ContenutiArea { planimetrie: number; pin: number; passaggi: number; ingresso: boolean; elementi: number }

function contenutiArea(a: RigaArea): { riepilogo: ContenutiArea; planimetrie: string[]; passaggi: number[] } {
  const planimetrie = planimetrieDi(a.chiave).map((p) => p.chiave);
  const segnaposti = planimetrie.map(() => '?').join(', ');
  const pin = planimetrie.length ? prepared(`SELECT COUNT(*) FROM spillo WHERE mappa_chiave IN (${segnaposti})`).pluck().get(...planimetrie) as number : 0;
  const elementi = planimetrie.length ? prepared(`SELECT COUNT(*) FROM spillo WHERE mappa_chiave IN (${segnaposti}) AND riferimento_tipo IN ('luogo', 'negozio', 'attivita', 'confidente')`).pluck().get(...planimetrie) as number : 0;
  // i passaggi che arrivano alle sue planimetrie da fuori (da lei stessa se ne vanno con le planimetrie)
  const passaggi = planimetrie.length ? prepared(`SELECT id FROM spillo WHERE riferimento_tipo = 'mappa' AND riferimento_chiave IN (${segnaposti}) AND mappa_chiave NOT IN (${segnaposti})`).pluck().all(...planimetrie, ...planimetrie) as number[] : [];
  const ingresso = !!prepared('SELECT 1 FROM quartiere_ingresso WHERE area_chiave = ?').get(a.chiave);
  return { riepilogo: { planimetrie: planimetrie.length, pin, passaggi: passaggi.length, ingresso, elementi }, planimetrie, passaggi };
}

/**
 * Elimina un'Area (R2-26): con contenuti — pin sulle sue planimetrie, passaggi che arrivano da fuori, l'ingresso del quartiere,
 * elementi — chiede conferma (409 `area-con-contenuti` con il riepilogo). Con la conferma (o senza contenuti) va nel cestino come
 * `area-fisica`, con le planimetrie (gli stessi passi dell'eliminazione di una mappa), i passaggi che vi portavano e l'ingresso; da
 * lì si rimette com'era. Per un'Area da verificare è «Rimuovi».
 */
export function eliminaArea(contenitore: ContenitoreRotta, chiave: string, slugArea: string, conferma: boolean): void {
  const c = contenitoreDaRotta(contenitore, chiave);
  const a = rigaArea(c, slugArea);
  const { riepilogo, planimetrie, passaggi } = contenutiArea(a);
  if (!conferma && (riepilogo.pin > 0 || riepilogo.passaggi > 0 || riepilogo.ingresso || riepilogo.elementi > 0)) {
    // il riepilogo in parole, al singolare e al plurale (difetto FUN2-4): «1 planimetria, 1 pin e 1 passaggio da un’altra mappa»
    const parti = [
      riepilogo.planimetrie === 1 ? '1 planimetria' : `${riepilogo.planimetrie} planimetrie`,
      `${riepilogo.pin} pin`,
      ...(riepilogo.passaggi > 0 ? [riepilogo.passaggi === 1 ? '1 passaggio da un’altra mappa' : `${riepilogo.passaggi} passaggi da altre mappe`] : []),
    ];
    const elenco = parti.length > 1 ? `${parti.slice(0, -1).join(', ')} e ${parti[parti.length - 1]}` : parti[0];
    throw httpErrors.conflict('area-con-contenuti', `L’area «${a.nome}» ha ${elenco}${riepilogo.ingresso ? ', ed è l’ingresso del quartiere' : ''}: eliminandola va tutto nel cestino.`, { ...riepilogo });
  }
  const vicine = prepared(`SELECT slug FROM area WHERE ${c.colonna} = ? ORDER BY ordine, slug`).pluck().all(c.chiave) as string[];
  const i = vicine.indexOf(a.slug);
  conCestino({ tipo: 'area-fisica', chiave: a.chiave, nome: a.nome, contesto: c.nome, vicini: { prima: i > 0 ? vicine[i - 1] : null, dopo: i >= 0 && i < vicine.length - 1 ? vicine[i + 1] : null } }, () => getDb().transaction(() => {
    for (const id of passaggi) eliminaSpillo(id);
    prepared('DELETE FROM quartiere_ingresso WHERE area_chiave = ?').run(a.chiave);
    for (const k of planimetrie) eliminaMappa(k, { dallArea: true });
    prepared('DELETE FROM area WHERE chiave = ?').run(a.chiave);
  })());
  invalidaCacheDiGioco();
}

// Rimessa dal cestino: il registro riporta Area, planimetrie, pin, passaggi e ingresso com'erano. Se qualche riga dell'albero delle
// mappe non è tornata (toccata dopo l'eliminazione), i percorsi si ricalcolano, come per una mappa.
registraRipristinoCestino('area-fisica', (_chiave, _vicini, saltate) => {
  if (saltate.some((s) => s.tabella === 'mappa' || s.tabella === 'mappa_percorso' || s.tabella === 'mappa_alias')) sincronizzaPercorsiMappe(getDb());
  invalidaCacheDiGioco();
});

/**
 * Colloca una planimetria del mondo senza Area (R2-27): in coda alle versioni di un'Area esistente del contenitore, o come prima di
 * un'Area nuova; se non è già sotto la mappa del contenitore ci si sposta (i percorsi si ricalcolano, il vecchio resta come alias).
 */
export function collocaPlanimetria(dati: { mappa: string; quartiere: string; area?: string; nuova?: { nome: string }; etichetta?: string }): AreaDettaglioDto {
  const c = contenitoreDaRotta('citta', dati.quartiere);
  const mappa = idMappa(dati.mappa);
  const r = prepared('SELECT chiave, tipo, genitore_chiave, area_chiave FROM mappa WHERE chiave = ?').get(mappa) as { chiave: string; tipo: string; genitore_chiave: string | null; area_chiave: string | null } | undefined;
  if (!r) throw httpErrors.notFound('mappa-non-trovata', 'La planimetria da collocare non esiste.');
  if (r.area_chiave) throw httpErrors.conflict('planimetria-gia-collocata', 'La planimetria appartiene già a un’area: si sposta dalla pagina della sua area.');
  if ((dati.area === undefined) === (dati.nuova === undefined)) throw httpErrors.badRequest('colloca-non-valido', 'Indica un’area esistente oppure il nome di un’area nuova.');
  let slugArea: string;
  getDb().transaction(() => {
    if (dati.nuova) {
      const nome = nomeValido(dati.nuova.nome);
      slugArea = slugLibero(c, nome);
      prepared(`INSERT INTO area (chiave, quartiere_chiave, dungeon_chiave, citta_chiave, slug, nome, nome_rivisto, ordine, planimetria_predefinita, origine, seed_json, da_verificare, updated_at)
        VALUES (?, ?, NULL, ?, ?, ?, 0, ?, ?, 'utente', NULL, 0, ?)`).run(`citta/${c.chiave}/${slugArea}`, c.colonna === 'quartiere_chiave' ? c.chiave : null, c.colonna === 'citta_chiave' ? c.chiave : null, slugArea, nome, ordineInFondo(c), mappa, nowIso());
      legaVersione(mappa, `citta/${c.chiave}/${slugArea}`, 0, dati.etichetta);
    } else {
      const a = rigaArea(c, dati.area!);
      slugArea = a.slug;
      const ordine = prepared('SELECT COALESCE(MAX(versione_ordine) + 1, 0) FROM mappa WHERE area_chiave = ?').pluck().get(a.chiave) as number;
      legaVersione(mappa, a.chiave, ordine, dati.etichetta);
      if (!a.planimetria_predefinita) prepared('UPDATE area SET planimetria_predefinita = ? WHERE chiave = ?').run(mappa, a.chiave);
    }
    if (r.genitore_chiave !== c.mappa) {
      prepared('UPDATE mappa SET genitore_chiave = ?, updated_at = ? WHERE chiave = ?').run(c.mappa, nowIso(), mappa);
      sincronizzaPercorsiMappe(getDb());
    }
  })();
  invalidaCacheDiGioco();
  return dettaglioArea('citta', c.chiave, slugArea!);
}

/**
 * Le planimetrie del mondo senza Area (figlie di Tokyo o di un quartiere, `luogo` o `area`): dopo la 109 nessuna, ma una mappa
 * importata da un pacchetto di prima o tolta da un'Area finisce qui, e «Colloca» la assegna.
 */
export function mappeDaCollocare(): MappaDaCollocareDto[] {
  if (!conAree()) return [];
  const caricate = immaginiCaricateDelleMappe();
  return (prepared(`SELECT m.chiave, m.nome, m.immagine_chiave, m.asset, g.nome AS genitore_nome, (SELECT COUNT(*) FROM spillo s WHERE s.mappa_chiave = m.chiave) AS spilli
      FROM mappa m JOIN mappa g ON g.chiave = m.genitore_chiave AND g.tipo IN ('citta', 'quartiere') AND COALESCE(g.entita_chiave, '') <> 'mementos'
      WHERE m.tipo IN ('luogo', 'area') AND m.area_chiave IS NULL ORDER BY g.nome, m.ordine, m.chiave`).all() as
      Array<{ chiave: string; nome: string; immagine_chiave: string | null; asset: string | null; genitore_nome: string | null; spilli: number }>)
    .map((m) => {
      const img = caricataDellaMappa(m, caricate);
      return { chiave: chiaveMappa(m.chiave), nome: m.nome, genitoreNome: m.genitore_nome, numeroSpilli: m.spilli, immagineUrl: img ? urlCaricata(img) : null, asset: m.asset };
    });
}
