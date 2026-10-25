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
import { notePossibili } from './effettiVoce.js';

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

/**
 * A che cosa si collega ogni tipo di voce: il tipo decide il collegamento (finestra della voce, tavola approvata il 2026-10-24).
 * `null` = nessun collegamento (domanda/esame, trama, Stanza di Velluto, altro). Il tipo «attività» e il tipo «lavoro» puntano
 * entrambi a un'attività: il primo a un videogioco o a un'altra attività, il secondo a un lavoro contato per turni.
 */
export const RIFERIMENTO_DI_TIPO: Record<TipoAzione, TipoRiferimentoAzione | null> = {
  confidente: 'confidente', dote: 'dote', palazzo: 'dungeon', richiesta: 'richiesta', acquisto: 'negozio', lavoro: 'attivita',
  libro: 'libro', dvd: 'film', attivita: 'attivita', esame: null, trama: null, velluto: null, altro: null,
};

export const CATEGORIE_LETTURA = [
  { chiave: 'libro', nome: 'Libro' }, { chiave: 'film', nome: 'Film o DVD' }, { chiave: 'videogioco', nome: 'Videogioco' },
] as const;
export type CategoriaLettura = (typeof CATEGORIE_LETTURA)[number]['chiave'];

export interface DoteNote { dote: DoteChiave; note: 1 | 2 | 3 }

/** `possibili` (Dote) e `esito` (turno): i valori scelti alla spunta (L13, ondata 2; vedi `shared/effettiVoce.ts` e `shared/esitiAttivita.ts`). */
export type EffettoAzione =
  | { tipo: 'dote'; dote: DoteChiave; note: 1 | 2 | 3; possibili?: Array<1 | 2 | 3> }
  | { tipo: 'lettura'; categoria: CategoriaLettura; chiave: string; almeno: number | null }
  | { tipo: 'turno'; attivita: string; doti?: DoteNote[]; esito?: string };

export const TIPI_EFFETTO_AZIONE = [
  { chiave: 'dote', nome: 'Dote sociale' }, { chiave: 'lettura', nome: 'Lettura o visione' }, { chiave: 'turno', nome: 'Turno di un’attività' },
] as const;

const CATEGORIE = new Set<string>(CATEGORIE_LETTURA.map((c) => c.chiave));

/** Il numero di note se è esattamente 1, 2 o 3; altrimenti null. */
function nota(x: unknown): 1 | 2 | 3 | null {
  return x === 1 || x === 2 || x === 3 ? x : null;
}

/** Una coppia Dote-note valida (Dote riconosciuta, note 1–3) ripulita dei campi in più; altrimenti null. */
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
    if (!d) return null;
    if (o.possibili === undefined) return { tipo: 'dote', ...d };
    const possibili = notePossibili(o.possibili, d.note);
    return possibili ? { tipo: 'dote', ...d, possibili } : null;
  }
  if (o.tipo === 'lettura') {
    if (typeof o.categoria !== 'string' || !CATEGORIE.has(o.categoria) || typeof o.chiave !== 'string' || !o.chiave.trim()) return null;
    const almeno = o.almeno === null || o.almeno === undefined ? null : Number.isInteger(o.almeno) && (o.almeno as number) >= 1 ? (o.almeno as number) : undefined;
    if (almeno === undefined) return null;
    return { tipo: 'lettura', categoria: o.categoria as CategoriaLettura, chiave: o.chiave.trim(), almeno };
  }
  if (o.tipo === 'turno') {
    if (typeof o.attivita !== 'string' || !o.attivita.trim()) return null;
    if (o.esito !== undefined) {
      if (o.doti != null || typeof o.esito !== 'string' || !/^[a-z0-9][a-z0-9-]{0,59}$/.test(o.esito)) return null;
      return { tipo: 'turno', attivita: o.attivita.trim(), esito: o.esito };
    }
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
  /** I nomi degli esiti dichiarati dalle attività, per chiave «attività/esito» (L13). */
  esiti?: Record<string, string>;
  /** Le attività che dichiarano esiti, con il loro modo (L13): il turno dice che l'esito si sceglie alla spunta o vale da solo. */
  modiEsiti?: Record<string, 'scelta' | 'automatico'>;
}

/** «1 nota», «2 note». */
const noteTesto = (n: number): string => `${n} ${n === 1 ? 'nota' : 'note'}`;
/** «2 o 3 note». */
const possibiliTesto = (p: ReadonlyArray<number>): string => `${p.slice(0, -1).join(', ')} o ${p[p.length - 1]} note`;

/** La frase di un effetto: «Gentilezza, 2 note», «Zorro, il fuorilegge: completato», «Turno: Fioraio Rafflesia». */
export function descriviEffettoAzione(e: EffettoAzione, nomi: NomiEffettiAzione = {}): string {
  if (e.tipo === 'dote') return e.possibili ? `${nomeDote(e.dote)}, ${possibiliTesto(e.possibili)}: le scegli alla spunta (proposte ${noteTesto(e.note)})` : `${nomeDote(e.dote)}, ${noteTesto(e.note)}`;
  if (e.tipo === 'lettura') {
    const elenco = e.categoria === 'libro' ? nomi.libri : e.categoria === 'film' ? nomi.film : nomi.videogiochi;
    const nome = elenco?.[e.chiave] ?? e.chiave;
    return `${nome}: ${e.almeno === null ? (e.categoria === 'film' ? 'completato (al cinema: una visione)' : 'completato') : `almeno ${e.almeno} ${e.categoria === 'film' ? (e.almeno === 1 ? 'visione o serata' : 'visioni o serate') : e.almeno === 1 ? 'sessione' : 'sessioni'}`}`;
  }
  const nome = nomi.attivita?.[e.attivita] ?? e.attivita;
  const modo = nomi.modiEsiti?.[e.attivita];
  const esito = e.esito ? ` · esito atteso: ${nomi.esiti?.[`${e.attivita}/${e.esito}`] ?? 'esito non più dichiarato dall’attività'}, lo confermi alla spunta`
    : modo === 'scelta' ? ' · esito da scegliere alla spunta' : modo === 'automatico' ? ' · esito automatico secondo il giorno' : '';
  return `Turno: ${nome}${e.doti?.length ? ` (${e.doti.map((d) => `${nomeDote(d.dote)}, ${noteTesto(d.note)}`).join('; ')})` : ''}${esito}`;
}
