// ============================================================
// conversioneEffettiAzione — dalle note di un'azione della guida ai suoi effetti strutturati
// ============================================================
//
// Serve una volta sola, alle migrazioni 086 (azioni della guida) e «utente» 007 (le correzioni
// dell'utente che cambiavano le note, e con esse i punti): la spunta applicava i punti leggendo il
// testo delle note, e ora legge `produce`
// (`shared/effettiAzione.ts`). La conversione rifà ciò che la spunta faceva, tranne dove era
// sbagliata (difetti segnalati dall'utente, 2026-09-30):
// - un libro o un film collegato non si dava più per finito a ogni spunta: prenderlo in prestito,
//   noleggiarlo, comprarlo o ritirarlo non lo legge; «(1/2)» porta a una sessione, «iniziare» pure;
//   «restituire X e prendere Y» finisce X, non Y; «leggere X» è una sessione se un'azione più avanti
//   lo completa, altrimenti lo finisce; al cinema ogni spunta è una visione (`almeno: null`, contata
//   dal motore insieme alle altre spunte);
// - un lavoro che dava una Dote diventa il turno del lavoro (le Doti sono quelle del lavoro, e il contatore
//   dei turni sale), con Doti proprie quando la guida ne scrive di diverse da quelle del lavoro;
// - il resto (bagni, bevande, domande in classe, incontri) resta Dote con le sue note.
// È un punto di partenza fedele alla guida: il dato finale lo corregge l'utente dalla giornata.
// ============================================================

import type { AppDatabase } from './dbService.js';
import type { DoteNote, EffettoAzione } from '../../shared/effettiAzione.js';

const RE_DOTE = /(Conoscenza|Coraggio|Fascino|Gentilezza|Perizia)\s*\+\s*(\d+)/gi;

/** «Perizia +2», «Conoscenza +1, Fascino +1» → Doti con le note (1–3); una Dote conta una volta. */
export function dotiDalTesto(testo: string | null | undefined): DoteNote[] {
  if (!testo) return [];
  const out: DoteNote[] = [];
  for (const m of testo.matchAll(RE_DOTE)) {
    const dote = m[1].toLowerCase() as DoteNote['dote'];
    const note = Math.min(3, Math.max(1, Number(m[2]))) as 1 | 2 | 3;
    if (Number(m[2]) > 0 && !out.some((d) => d.dote === dote)) out.push({ dote, note });
  }
  return out;
}

/** Il minimo che la conversione legge di un'azione (seed, corretta o dell'utente). */
export interface AzioneDaConvertire {
  azione: string;
  tipo: string;
  riferimento: { tipo: string; chiave: string } | null;
  note: string | null;
}

interface Elemento { chiave: string; categoria: 'libro' | 'film'; nomi: string[]; sessioni: number; cinema: boolean }

/** Tutto ciò che serve a convertire, letto una volta dal file di gioco. */
export interface ContestoConversione {
  elementi: Map<string, Elemento>;
  lavori: Map<string, { chiave: string; doti: DoteNote[] }>;
  /** Le azioni della guida in ordine di calendario, per sapere se una lettura si completa più avanti e contare le visioni al cinema. */
  successive: Array<{ data: string; indice: number; azione: AzioneDaConvertire }>;
}

/** Il testo «piano» per i confronti: senza accenti (forma NFD privata dei segni diacritici), apostrofi tipografici resi con `'`, minuscolo. */
const piano = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’`´]/g, "'").toLowerCase();

/** I lavori: un'azione di lavoro punta al lavoro stesso o al negozio dove lo si svolge. */
const LAVORO_DEL_NEGOZIO: Record<string, string> = {
  'triple-seven': 'lavoro-triple-seven', 'fiorista-rafflesia': 'lavoro-rafflesia', crossroads: 'lavoro-crossroads', 'ore-no-beko': 'lavoro-ore-no-beko',
};

/** Le Doti di ogni turno dei lavori, come le scrive la guida a ogni turno («3.200 yen, Gentilezza +2»). */
export const DOTI_DEI_LAVORI: Record<string, DoteNote[]> = {
  'lavoro-triple-seven': [{ dote: 'fascino', note: 2 }],
  'lavoro-rafflesia': [{ dote: 'gentilezza', note: 2 }],
  'lavoro-ore-no-beko': [{ dote: 'perizia', note: 2 }],
  'lavoro-crossroads': [{ dote: 'gentilezza', note: 2 }],
};

/**
 * Legge dal file di gioco il contesto della conversione: libri e film (nomi EN e IT già resi «piani»,
 * sessioni almeno 1, film al cinema), i lavori con le Doti di `DOTI_DEI_LAVORI`, e tutte le azioni del
 * percorso della guida in ordine di calendario con la loro posizione (data, indice nella giornata).
 */
export function contestoConversione(db: AppDatabase): ContestoConversione {
  const elementi = new Map<string, Elemento>();
  for (const r of db.prepare('SELECT chiave, nome, nome_it, sessioni FROM libro').all() as Array<{ chiave: string; nome: string; nome_it: string | null; sessioni: number | null }>) {
    elementi.set(`libro:${r.chiave}`, { chiave: r.chiave, categoria: 'libro', nomi: [r.nome, r.nome_it].filter((n): n is string => !!n).map(piano), sessioni: Math.max(r.sessioni ?? 1, 1), cinema: false });
  }
  for (const r of db.prepare('SELECT chiave, nome, nome_it, sessioni, dove FROM film').all() as Array<{ chiave: string; nome: string; nome_it: string | null; sessioni: number | null; dove: string }>) {
    elementi.set(`film:${r.chiave}`, { chiave: r.chiave, categoria: 'film', nomi: [r.nome, r.nome_it].filter((n): n is string => !!n).map(piano), sessioni: Math.max(r.sessioni ?? 1, 1), cinema: r.dove === 'cinema' });
  }
  const lavori = new Map<string, { chiave: string; doti: DoteNote[] }>();
  for (const r of db.prepare("SELECT chiave FROM attivita WHERE tipo = 'lavoro'").all() as Array<{ chiave: string }>) {
    lavori.set(r.chiave, { chiave: r.chiave, doti: DOTI_DEI_LAVORI[r.chiave] ?? [] });
  }
  const successive: ContestoConversione['successive'] = [];
  for (const g of db.prepare('SELECT data, azioni_json FROM giorno_percorso ORDER BY ordine').all() as Array<{ data: string; azioni_json: string }>) {
    (JSON.parse(g.azioni_json) as AzioneDaConvertire[]).forEach((a, indice) => successive.push({ data: g.data, indice, azione: a }));
  }
  return { elementi, lavori, successive };
}

/** Gli elementi della categoria nominati nel testo, i nomi più lunghi prima (non si contano i pezzi di un nome più lungo). */
function nominati(testo: string, categoria: 'libro' | 'film', ctx: ContestoConversione): string[] {
  const t = piano(testo);
  const candidati: Array<{ chiave: string; nome: string }> = [];
  for (const e of ctx.elementi.values()) if (e.categoria === categoria) for (const n of e.nomi) if (n.length >= 3) candidati.push({ chiave: e.chiave, nome: n });
  candidati.sort((a, b) => b.nome.length - a.nome.length);
  const presi: Array<[number, number]> = [];
  const out: string[] = [];
  for (const c of candidati) {
    let da = 0;
    for (;;) {
      const i = t.indexOf(c.nome, da);
      if (i < 0) break;
      const fine = i + c.nome.length;
      if (!presi.some(([a, b]) => i < b && fine > a)) {
        presi.push([i, fine]);
        if (!out.includes(c.chiave)) out.push(c.chiave);
      }
      da = fine;
    }
  }
  return out;
}

const RE_SENZA_LETTURA = /prestito|noleggi|comprare|compra |acquist|ritirare|scambiare/i;
const RE_COMPLETA = /complet|finire|terminare|termina /i;
const RE_INIZIA = /iniziare|inizia /i;
const RE_LEGGE = /legge|leggi|guarda/i;

/** Quanto porta avanti la lettura di `el` quest'azione: un numero di sessioni, null = completata, undefined = niente. */
function avanzamento(testo: string, el: Elemento, posizione: { data: string; indice: number } | null, ctx: ContestoConversione): number | null | undefined {
  // al cinema ogni spunta è una visione, contata con le altre spunte dal motore (null = «una visione»):
  // «la seconda visita della guida vale due visioni» regalerebbe la prima a chi l'ha saltata
  if (el.cinema) return null;
  const frazione = testo.match(/\((\d+)\s*\/\s*(\d+)\)/);
  if (frazione) {
    const n = Number(frazione[1]);
    return n >= el.sessioni ? null : Math.max(1, n);
  }
  if (RE_COMPLETA.test(testo)) return null;
  if (RE_INIZIA.test(testo)) return el.sessioni > 1 ? 1 : null;
  if (RE_LEGGE.test(testo)) {
    if (el.sessioni <= 1) return null;
    // «Guardare il DVD The Running Dead» e due giorni dopo «Terminare…»: qui è la prima serata
    if (posizione) {
      let dopo = false;
      for (const s of ctx.successive) {
        if (dopo && s.azione.riferimento?.tipo === el.categoria && s.azione.riferimento.chiave === el.chiave && !RE_SENZA_LETTURA.test(s.azione.azione)) return 1;
        if (s.data === posizione.data && s.indice === posizione.indice) dopo = true;
      }
    }
    return null;
  }
  return undefined;
}

/**
 * Gli effetti di lettura di un'azione collegata a un libro o a un film. Passi: «restituire X e
 * prendere/noleggiare Y» finisce solo gli elementi nominati in X (non quello collegato); un'azione di
 * solo prestito, noleggio, acquisto, ritiro o scambio non produce nulla; altrimenti, sul testo fino al
 * primo «;», l'elemento collegato e gli altri della stessa categoria nominati avanzano di quanto dice
 * `avanzamento`. Ogni elemento compare una volta sola.
 */
function letture(a: AzioneDaConvertire, posizione: { data: string; indice: number } | null, ctx: ContestoConversione): EffettoAzione[] {
  const rif = a.riferimento!;
  const categoria = rif.tipo as 'libro' | 'film';
  const out: EffettoAzione[] = [];
  /** Aggiunge la lettura di `chiave` (null = completata) se non c'è già. */
  const aggiungi = (chiave: string, almeno: number | null) => {
    if (!out.some((e) => e.tipo === 'lettura' && e.chiave === chiave)) out.push({ tipo: 'lettura', categoria, chiave, almeno });
  };
  // «restituire X e prendere Y», «restituire X, noleggiare Y»: X è finito, Y è solo preso
  const restituisce = a.azione.match(/restituire\s+(.+?)(?:\s+e\s+|\s*,\s*)(?:prendere|noleggiare)/i);
  if (restituisce) {
    for (const k of nominati(restituisce[1], categoria, ctx)) if (k !== rif.chiave) aggiungi(k, null);
    return out;
  }
  if (RE_SENZA_LETTURA.test(a.azione)) return out;
  // dopo un «;» la guida racconta altro («…(completato); in biblioteca compare il nuovo libro L'eroe con l'arco»)
  const testo = a.azione.split(';')[0];
  const chiavi = [rif.chiave, ...nominati(testo, categoria, ctx).filter((k) => k !== rif.chiave)];
  for (const k of chiavi) {
    const el = ctx.elementi.get(`${categoria}:${k}`);
    if (!el) continue;
    const n = avanzamento(testo, el, posizione, ctx);
    if (n !== undefined) aggiungi(k, n);
  }
  return out;
}

/** Vero se le due liste hanno le stesse Doti con le stesse note, in qualunque ordine. */
const stesseDoti =(a: DoteNote[], b: DoteNote[]): boolean => a.length === b.length && a.every((x) => b.some((y) => y.dote === x.dote && y.note === x.note));

/** Gli effetti di un'azione. `posizione` è il suo posto nella guida (null per le azioni dell'utente). */
export function effettiDellAzione(a: AzioneDaConvertire, posizione: { data: string; indice: number } | null, ctx: ContestoConversione): EffettoAzione[] {
  const rif = a.riferimento;
  if (rif && (rif.tipo === 'libro' || rif.tipo === 'film') && ctx.elementi.has(`${rif.tipo}:${rif.chiave}`)) return letture(a, posizione, ctx);
  const doti = dotiDalTesto(a.note);
  if (a.tipo === 'lavoro' && rif && doti.length) {
    const chiave = rif.tipo === 'attivita' ? rif.chiave : rif.tipo === 'negozio' ? LAVORO_DEL_NEGOZIO[rif.chiave] : undefined;
    const lavoro = chiave ? ctx.lavori.get(chiave) : undefined;
    if (lavoro) return [stesseDoti(doti, lavoro.doti) ? { tipo: 'turno', attivita: lavoro.chiave } : { tipo: 'turno', attivita: lavoro.chiave, doti }];
  }
  // un DVD senza film collegato dà sempre due note (così faceva la spunta)
  return doti.map((d) => ({ tipo: 'dote', dote: d.dote, note: a.tipo === 'dvd' ? 2 : d.note }));
}
