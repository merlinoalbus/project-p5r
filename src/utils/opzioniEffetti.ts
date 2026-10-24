// ============================================================
// opzioniEffetti — gli elenchi con cui si sceglie PER NOME l'oggetto citato da un effetto della spunta
// ============================================================

import type { OpzioneSelettore } from '../components/shared/Selettore';
import { EVENTI_STORIA } from '../../shared/condizioniSpillo';
import type { ElenchiAzioneDto, ElenchiEffettiVoceDto } from '../types';
import { dataGiocoTesto } from './dateGioco';

/** Gli elenchi da cui si sceglie, più il giorno della voce (le domande di quel giorno vengono per prime). */
export interface ElenchiVoce { azione: ElenchiAzioneDto; effetti: ElenchiEffettiVoceDto; giorno: string }

export const breve = (t: string, n = 80): string => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);

/** Le opzioni più la voce già scelta, se l'elenco non la contiene più: il valore salvato non sparisce dalla vista. */
export function conCorrente(opzioni: OpzioneSelettore[], chiave: string, nome: string): OpzioneSelettore[] {
  return !chiave || opzioni.some((o) => o.chiave === chiave) ? opzioni : [{ chiave, nome }, ...opzioni];
}

/** Gli eventi di storia che si segnano a mano (quelli «entra in squadra» si calcolano dalla squadra), con quello già scelto. */
export function opzioniStoria(corrente: string): OpzioneSelettore[] {
  return conCorrente(EVENTI_STORIA.filter((e) => !('membro' in e)).map((e) => ({ chiave: e.chiave, nome: e.nome })), corrente, 'Evento non più nell’elenco');
}

/** Le domande con il testo, quelle del giorno della voce per prime. */
export function opzioniDomande(el: ElenchiVoce, corrente: number | null): OpzioneSelettore[] {
  const o = el.effetti.domande.map((d) => ({ chiave: String(d.id), nome: breve(d.testo), dettaglio: dataGiocoTesto(d.giorno), gruppo: d.giorno === el.giorno ? 'Di questo giorno' : 'Di altri giorni' }));
  o.sort((a, b) => (a.gruppo === b.gruppo ? 0 : a.gruppo === 'Di questo giorno' ? -1 : 1));
  return conCorrente(o, corrente === null || corrente < 1 ? '' : String(corrente), 'Domanda non più nell’elenco');
}

/** Gli articoli dei negozi con il prezzo; con `negozio`, solo quelli di quel negozio. */
export const opzioniArticoli = (e: ElenchiEffettiVoceDto, negozio?: string): OpzioneSelettore[] => e.articoli.filter((a) => !negozio || a.negozio === negozio)
  .map((a) => ({ chiave: a.chiave, nome: a.nome, dettaglio: a.prezzo !== null ? `¥${a.prezzo.toLocaleString('it-IT')}` : undefined, gruppo: a.negozioNome }));
