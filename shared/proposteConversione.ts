// ============================================================
// proposteConversione — le proposte «da completare» sulle voci del Diario (L13, ondata 4a)
// ============================================================
//
// Una proposta dice come convertire una voce scritta a parole in dati: il collegamento («Quale»), eventualmente il tipo, gli effetti da
// aggiungere (con i valori proposti) e quelli da togliere, con la certezza e il motivo. Vive in UNA tabella di gioco
// (`main.proposta_conversione_voce`, migrazione 236): il contenuto non cambia mai (si scrive una volta, da una migrazione), la decisione
// la chiude («applicata» o «scartata») e ne registra l'esito. Applicarla scrive la voce con la STESSA funzione dell'editor
// (`aggiornaVoce`), mai con SQL parallelo; le partite già spuntate ricevono le loro proposte «Applica» come per ogni modifica della voce,
// e le ricevute salvate non si riscrivono. Esiste solo nella preparazione: nel rilascio rotte e interfaccia non ci sono.
//
// Un effetto proposto può chiedere di completare un dato prima di applicarlo (`completa`):
//   - `elemento`: l'oggetto che l'effetto cita (l'articolo del Set A o del Set B, il libro…), fra `scelte` se la proposta le elenca;
//   - `quantita`: le copie comprate o ricevute (articolo, oggetto), che la guida non dice;
//   - `note`: le note della Dote.
// Il campo da completare può arrivare vuoto (l'elemento: '' o 0) o con un valore indicativo: chi applica lo sceglie comunque.
// ============================================================

import { normalizzaEffettoVoce, type EffettoVoce } from './effettiVoce.js';
import type { TipoAzione, TipoRiferimentoAzione } from './effettiAzione.js';
import type { DatiVoceGiornata } from './types.js';

export type CertezzaProposta = 'certa' | 'probabile' | 'da-verificare';
export type StatoProposta = 'aperta' | 'applicata' | 'scartata';
export type CampoDaCompletare = 'elemento' | 'quantita' | 'note';
export const CAMPI_DA_COMPLETARE: readonly CampoDaCompletare[] = ['elemento', 'quantita', 'note'];

/** Il campo con cui ogni effetto cita il suo elemento (quello che `completa: ['elemento']` lascia scegliere). */
export const CAMPO_ELEMENTO: Partial<Record<EffettoVoce['tipo'], string>> = {
  articolo: 'articolo', oggetto: 'oggetto', lettura: 'chiave', turno: 'attivita', richiesta: 'richiesta', trofeo: 'trofeo', sblocco: 'chiave',
  storia: 'evento', invito: 'invito', domanda: 'domanda', persona: 'persona', cruciverba: 'data',
};
/** Un valore valido qualsiasi, solo per verificare la forma di un effetto il cui elemento è ancora da scegliere. */
const SEGNAPOSTO: Record<string, string | number> = { articolo: 'x', oggetto: 'x', chiave: 'x', attivita: 'x', richiesta: 'x', trofeo: 'x', evento: 'x', invito: 'x/04-01', domanda: 1, persona: 1, data: '04-01' };
const VUOTO: Record<string, string | number> = { domanda: 0, persona: 0 };

/** Un effetto proposto: l'effetto (con l'elemento vuoto se è da scegliere), i dati da completare e, se ci sono, gli elementi fra cui scegliere. */
export interface EffettoPropostoDto {
  effetto: EffettoVoce;
  completa: CampoDaCompletare[];
  /** Le chiavi ammesse per l'elemento (per esempio i due articoli del Set A e del Set B); null = qualunque. */
  scelte: string[] | null;
  /** C'è già, identico, fra gli effetti della voce: applicando non si aggiunge una seconda volta. */
  giaPresente: boolean;
}

export interface PropostaConversioneDto {
  id: string;
  voceUid: string;
  giorno: string;
  fascia: 'giorno' | 'sera';
  /** Il testo della voce, com'è adesso. */
  testo: string;
  /** Tipo e collegamento della voce adesso (per mostrare «da … a …»). */
  tipoAttuale: TipoAzione;
  riferimentoAttuale: { tipo: TipoRiferimentoAzione; chiave: string } | null;
  /** Il tipo proposto (null = resta quello della voce). */
  tipo: TipoAzione | null;
  /** Il collegamento proposto (null = resta quello della voce). */
  riferimento: { tipo: TipoRiferimentoAzione; chiave: string } | null;
  effetti: EffettoPropostoDto[];
  /** Gli effetti della voce che la proposta toglie (per UID), con l'effetto se c'è ancora (null = non è più sulla voce: la proposta è superata). */
  togli: Array<{ uid: string; effetto: EffettoVoce | null }>;
  motivo: string;
  certezza: CertezzaProposta;
  /** Da quale elenco di conversione viene (per esempio «L13-4b»). */
  lotto: string;
  stato: StatoProposta;
  decisaIl: string | null;
  /** Leggibile per intero? Se no, `problema` dice perché, e la proposta si può solo scartare. */
  leggibile: boolean;
  problema: string | null;
  /** L'impronta di proposta e voce: applicare o scartare la chiede, così non si decide su una vista vecchia. */
  revisione: string;
}

/** Applicare: gli effetti proposti completati (stesso ordine della proposta) oppure, da «Modifica», i dati della voce come li salva la finestra. */
export interface RichiestaApplicaProposta {
  revisionePropostaAttesa: string;
  effetti?: EffettoVoce[];
  /** Da «Modifica»: la voce come la salva la finestra (`DatiVoceGiornata`), al posto della composizione della proposta. */
  voce?: DatiVoceGiornata;
}
export interface RichiestaScartaProposta { revisionePropostaAttesa: string }

/** I filtri dell'elenco «Da completare»: il periodo (giorni di gioco «MM-GG», estremi compresi) e lo stato. */
export interface FiltroProposte { da?: string; a?: string; stato?: StatoProposta | 'tutte' }

const oggetto = (x: unknown): Record<string, unknown> | null => (x && typeof x === 'object' && !Array.isArray(x) ? x as Record<string, unknown> : null);

/** I campi da completare letti dal dato salvato: solo quelli noti, senza ripetizioni; null se il dato non è un elenco di campi noti. */
export function leggiCampiDaCompletare(x: unknown): CampoDaCompletare[] | null {
  if (x === undefined || x === null) return [];
  if (!Array.isArray(x) || !x.every((c) => typeof c === 'string' && (CAMPI_DA_COMPLETARE as readonly string[]).includes(c)) || new Set(x).size !== x.length) return null;
  return x as CampoDaCompletare[];
}

/** L'elemento che l'effetto cita (chiave o numero, come testo); '' se l'effetto non ne cita uno o è ancora da scegliere. */
export function elementoDi(e: EffettoVoce): string {
  const campo = CAMPO_ELEMENTO[e.tipo];
  if (!campo) return '';
  const v = (e as unknown as Record<string, unknown>)[campo];
  return v === undefined || v === null || v === '' || v === 0 ? '' : String(v);
}

/** L'effetto con un altro elemento (chiave o numero secondo il tipo). */
export function conElemento(e: EffettoVoce, valore: string): EffettoVoce {
  const campo = CAMPO_ELEMENTO[e.tipo];
  if (!campo) return e;
  const numero = campo === 'domanda' || campo === 'persona';
  return { ...e, [campo]: numero ? (valore ? Number(valore) : 0) : valore } as EffettoVoce;
}

/**
 * Un effetto proposto, letto dal dato salvato: integro (`normalizzaEffettoVoce`), oppure con l'elemento ancora da scegliere se la proposta lo
 * chiede (`completa` contiene «elemento»): allora la forma si verifica con un elemento segnaposto e l'effetto torna con l'elemento vuoto.
 * null se non è riconoscibile.
 */
export function leggiEffettoProposto(x: unknown, completa: readonly CampoDaCompletare[]): EffettoVoce | null {
  const o = oggetto(x);
  if (!o || typeof o.tipo !== 'string') return null;
  const campo = CAMPO_ELEMENTO[o.tipo as EffettoVoce['tipo']];
  const vuoto = !!campo && (o[campo] === undefined || o[campo] === null || o[campo] === '' || o[campo] === 0);
  if (campo && vuoto && completa.includes('elemento')) {
    const prova = normalizzaEffettoVoce({ ...o, [campo]: SEGNAPOSTO[campo] });
    return prova ? { ...prova, [campo]: VUOTO[campo] ?? '' } as EffettoVoce : null;
  }
  return normalizzaEffettoVoce(o);
}
