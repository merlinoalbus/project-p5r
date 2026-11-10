// ============================================================
// trattiGuida — l'effetto di un tratto ha un testo solo: quello della guida (decisione dell'utente del 01/11, «Quella della guida»)
// ============================================================
//
// I 90 tratti hanno la loro scheda nella guida (blocco `dati_guida.sfide`, `tratti.elenco`: nome, `nomeEn` = nome canonico della skill del
// tratto, effetto, categoria, «di chi»). La descrizione della guida è l'UNICA descrizione dell'effetto, mostrata ovunque: la scheda «Tratti»
// delle Sfide, la scheda Persona, le pagine delle skill, la fusione. Il punto di modifica è la riga del tratto nelle Sfide (correzione del
// tipo `tratto`); la resa `traduzione/effettoSkill` della skill di un tratto non si legge più, non
// compare in Traduzioni e non si scrive (`traduzioniService`). Nessun testo da tenere allineato a mano: i nomi coincidono già (90 su 90).
// ============================================================

import { datiGuidaCorretti } from './datiGuida.js';
import { prepared } from '../db/dbService.js';

interface TrattoDelBlocco { nome: string; nomeEn?: string | null; effetto: string }
/** Il tratto della guida per una skill: `chiave` è il suo nome nella guida (la chiave della riga nelle Sfide), `effetto` il testo da mostrare. */
export interface TrattoDellaGuida { chiave: string; effetto: string }

let ultimo: { blocco: unknown; mappa: Map<string, TrattoDellaGuida> } | null = null;

/** I tratti della guida per nome canonico della skill, dal blocco corretto (una mappa per versione del blocco, che è condiviso e congelato). */
function mappa(): Map<string, TrattoDellaGuida> {
  const g = datiGuidaCorretti<{ tratti?: { elenco?: ReadonlyArray<TrattoDelBlocco> } }>('sfide');
  if (!ultimo || ultimo.blocco !== g) {
    const m = new Map<string, TrattoDellaGuida>();
    for (const x of g?.tratti?.elenco ?? []) if (x.nomeEn && typeof x.effetto === 'string') m.set(x.nomeEn, { chiave: x.nome, effetto: x.effetto });
    ultimo = { blocco: g, mappa: m };
  }
  return ultimo.mappa;
}

/** Il tratto della guida della skill (solo per le skill di elemento `trait` che la guida descrive), o null. */
export function trattoDellaGuida(skill: { nome: string; elemento: string }): TrattoDellaGuida | null {
  return skill.elemento === 'trait' ? mappa().get(skill.nome) ?? null : null;
}

/** Le chiavi `effettoSkill` (il testo inglese dell'effetto) usate SOLO da skill dei tratti descritti dalla guida: la loro resa non si legge più.
 *  Un testo condiviso con una skill che non è un tratto resta in Traduzioni (oggi nessuno: 0 su 90). */
export function effettiDeiTrattiDellaGuida(): Set<string> {
  const nomi = mappa();
  return new Set((prepared(`SELECT s.nome, s.effetto FROM skill s WHERE s.elemento = 'trait'
    AND NOT EXISTS (SELECT 1 FROM skill a WHERE a.effetto = s.effetto AND a.elemento <> 'trait')`).all() as Array<{ nome: string; effetto: string }>)
    .filter((s) => nomi.has(s.nome)).map((s) => s.effetto));
}
