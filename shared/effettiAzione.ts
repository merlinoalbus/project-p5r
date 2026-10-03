// ============================================================
// effettiAzione — che cosa produce un'azione della guida quando la si spunta
// ============================================================
//
// Fino al 2026-09-30 la spunta ricavava i punti dal testo libero delle note («Gentilezza +3»), e
// non sapeva se quel guadagno fosse davvero dell'azione: «restituire Zorro e prendere la
// Ballerina» finiva la Ballerina, «Sbloccare il lavoro» dava la Gentilezza del turno, prendere un
// libro in prestito lo dava già letto (difetti segnalati dall'utente). Ora un'azione dichiara i
// suoi effetti come dato (`produce`), modificabile come ogni altro campo; le note restano testo.
//
// - `dote`: il gioco dà quella Dote delle note indicate (1–3, come le mostra il gioco): l'app la ricorda, l'utente la
//   segna a mano (scelta dell'utente, 2026-09-30);
// - `lettura`: un libro, un film o un videogioco arriva **almeno** a quel punto (`almeno`: sessioni
//   o visioni; null = completato). Non torna mai indietro, e le Doti sono quelle dell'elemento, ricordate una volta
//   sola, da qualunque parte lo si segni. Al cinema, che non ha un totale, null vale «una visione»:
//   ogni spunta che la dichiara conta una visione, contata insieme alle altre spunte (saltare la
//   prima visita della guida non regala una visione mai fatta; togliere e rimettere la spunta non
//   ne aggiunge un'altra);
// - `turno`: si registra un turno di un'attività contata per volte (un lavoro); i punti sono quelli
//   dell'attività, salvo che il turno dichiari Doti proprie (`doti`: il secondo turno al Beef Bowl
//   Shop, la sera con Lala al Crossroads).
// Gli incontri con i Confidenti non stanno qui: li dice il tipo dell'azione e il suo collegamento.
// ============================================================

import { eDote, nomeDote, type DoteChiave } from './doti.js';

/** I tipi di un'azione della giornata (`AzionePercorsoDto.tipo`), con il nome che l'interfaccia mostra. */
export const TIPI_AZIONE = [
  { chiave: 'confidente', nome: 'Confidente' }, { chiave: 'dote', nome: 'Dote sociale' }, { chiave: 'palazzo', nome: 'Palazzo / Mementos' },
  { chiave: 'richiesta', nome: 'Richiesta' }, { chiave: 'acquisto', nome: 'Acquisto' }, { chiave: 'lavoro', nome: 'Lavoro' },
  { chiave: 'libro', nome: 'Libro' }, { chiave: 'dvd', nome: 'DVD / film' }, { chiave: 'attivita', nome: 'Attività' },
  { chiave: 'esame', nome: 'Domanda / esame' }, { chiave: 'trama', nome: 'Trama' }, { chiave: 'velluto', nome: 'Stanza di Velluto' },
  { chiave: 'altro', nome: 'Altro' },
] as const;
export type TipoAzione = (typeof TIPI_AZIONE)[number]['chiave'];

/** A che cosa si può collegare un'azione (`RiferimentoAzioneDto.tipo`). */
export const TIPI_RIFERIMENTO_AZIONE = [
  { chiave: 'confidente', nome: 'Confidente' }, { chiave: 'dungeon', nome: 'Palazzo o Memento' }, { chiave: 'richiesta', nome: 'Richiesta' },
  { chiave: 'libro', nome: 'Libro' }, { chiave: 'film', nome: 'Film o DVD' }, { chiave: 'attivita', nome: 'Attività' },
  { chiave: 'negozio', nome: 'Negozio' }, { chiave: 'dote', nome: 'Dote sociale' },
] as const;
export type TipoRiferimentoAzione = (typeof TIPI_RIFERIMENTO_AZIONE)[number]['chiave'];

export const CATEGORIE_LETTURA = [
  { chiave: 'libro', nome: 'Libro' }, { chiave: 'film', nome: 'Film o DVD' }, { chiave: 'videogioco', nome: 'Videogioco' },
] as const;
export type CategoriaLettura = (typeof CATEGORIE_LETTURA)[number]['chiave'];

export interface DoteNote { dote: DoteChiave; note: 1 | 2 | 3 }

export type EffettoAzione =
  | { tipo: 'dote'; dote: DoteChiave; note: 1 | 2 | 3 }
  | { tipo: 'lettura'; categoria: CategoriaLettura; chiave: string; almeno: number | null }
  | { tipo: 'turno'; attivita: string; doti?: DoteNote[] };

export const TIPI_EFFETTO_AZIONE = [
  { chiave: 'dote', nome: 'Dote sociale' }, { chiave: 'lettura', nome: 'Lettura o visione' }, { chiave: 'turno', nome: 'Turno di un’attività' },
] as const;

const CATEGORIE = new Set<string>(CATEGORIE_LETTURA.map((c) => c.chiave));

function nota(x: unknown): 1 | 2 | 3 | null {
  return x === 1 || x === 2 || x === 3 ? x : null;
}

function doteNote(x: unknown): DoteNote | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const n = nota(o.note);
  return eDote(o.dote) && n ? { dote: o.dote, note: n } : null;
}

/** Un effetto valido o null: ciò che non si sa applicare non entra (un dato storto non diventa punti a caso). */
function normalizzaEffettoAzione(x: unknown): EffettoAzione | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  if (o.tipo === 'dote') {
    const d = doteNote(o);
    return d ? { tipo: 'dote', ...d } : null;
  }
  if (o.tipo === 'lettura') {
    if (typeof o.categoria !== 'string' || !CATEGORIE.has(o.categoria) || typeof o.chiave !== 'string' || !o.chiave.trim()) return null;
    const almeno = o.almeno === null || o.almeno === undefined ? null : Number.isInteger(o.almeno) && (o.almeno as number) >= 1 ? (o.almeno as number) : undefined;
    if (almeno === undefined) return null;
    return { tipo: 'lettura', categoria: o.categoria as CategoriaLettura, chiave: o.chiave.trim(), almeno };
  }
  if (o.tipo === 'turno') {
    if (typeof o.attivita !== 'string' || !o.attivita.trim()) return null;
    if (o.doti === undefined || o.doti === null) return { tipo: 'turno', attivita: o.attivita.trim() };
    // «Doti proprie» vuote non dicono niente: o ci sono, o il turno usa quelle dell'attività
    if (!Array.isArray(o.doti) || o.doti.length === 0) return null;
    const doti = o.doti.map(doteNote);
    if (doti.some((d) => d === null)) return null;
    return { tipo: 'turno', attivita: o.attivita.trim(), doti: doti as DoteNote[] };
  }
  return null;
}

/** Rende un valore qualunque un elenco di effetti validi (le voci storte cadono). */
export function normalizzaEffettiAzione(x: unknown): EffettoAzione[] {
  if (!Array.isArray(x)) return [];
  return x.map(normalizzaEffettoAzione).filter((e): e is EffettoAzione => e !== null);
}

export interface NomiEffettiAzione {
  libri?: Record<string, string>;
  film?: Record<string, string>;
  videogiochi?: Record<string, string>;
  attivita?: Record<string, string>;
}

const noteTesto = (n: number): string => `${n} ${n === 1 ? 'nota' : 'note'}`;

/** La frase di un effetto: «Gentilezza, 2 note», «Zorro, il fuorilegge: completato», «Turno: Fioraio Rafflesia». */
export function descriviEffettoAzione(e: EffettoAzione, nomi: NomiEffettiAzione = {}): string {
  if (e.tipo === 'dote') return `${nomeDote(e.dote)}, ${noteTesto(e.note)}`;
  if (e.tipo === 'lettura') {
    const elenco = e.categoria === 'libro' ? nomi.libri : e.categoria === 'film' ? nomi.film : nomi.videogiochi;
    const nome = elenco?.[e.chiave] ?? e.chiave;
    return `${nome}: ${e.almeno === null ? (e.categoria === 'film' ? 'completato (al cinema: una visione)' : 'completato') : `almeno ${e.almeno} ${e.categoria === 'film' ? (e.almeno === 1 ? 'visione o serata' : 'visioni o serate') : e.almeno === 1 ? 'sessione' : 'sessioni'}`}`;
  }
  const nome = nomi.attivita?.[e.attivita] ?? e.attivita;
  return `Turno: ${nome}${e.doti?.length ? ` (${e.doti.map((d) => `${nomeDote(d.dote)}, ${noteTesto(d.note)}`).join('; ')})` : ''}`;
}
