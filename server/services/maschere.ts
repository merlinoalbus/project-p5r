// ============================================================
// maschere — dal nome di una maschera scritto dalla guida alla Persona del compendio
// ============================================================
//
// La guida scrive la maschera delle Ombre in italiano o in inglese («Bicorno», «Pixie», «Jack-o'-lantern»). Il compendio ha il
// nome canonico inglese e la resa italiana in `traduzione`. Lo usano l'indice delle Ombre della guida alla battaglia (Fase 7.3)
// e le Persona dei dedali dei Memento (2026-10-11), che ne mostrano l'immagine.
// ============================================================

import { prepared } from '../db/dbService.js';
import { mappaAmbito } from './traduzioniService.js';
import type { PersonaDellaMascheraDto } from '../../shared/types.js';

/** Forma di confronto di un nome: minuscolo, senza accenti (decomposizione NFD e rimozione dei segni diacritici), ogni
 *  sequenza di caratteri che non è lettera o cifra ridotta a uno spazio, senza spazi ai bordi. */
export function normalizza(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Varianti di nome usate dalla guida che non coincidono con il compendio (verificate sulle affinità). */
const ALIAS_MASCHERE: Record<string, string> = { norna: 'Norn' };

/** L'indice nome (inglese e italiano, normalizzato) → Persona del compendio: si costruisce una volta per richiesta. */
export type IndiceMaschere = ReadonlyMap<string, PersonaDellaMascheraDto>;

/** Costruisce l'indice delle maschere dal compendio e dalle sue traduzioni. */
export function indiceMaschere(): IndiceMaschere {
  const nomiIt = mappaAmbito('persona');
  const idx = new Map<string, PersonaDellaMascheraDto>();
  for (const p of prepared('SELECT id, nome FROM persona').all() as Array<{ id: number; nome: string }>) {
    const v = { id: p.id, nome: p.nome, nomeIt: nomiIt[p.nome] ?? p.nome };
    idx.set(normalizza(p.nome), v);
    if (nomiIt[p.nome]) idx.set(normalizza(nomiIt[p.nome]), v);
  }
  return idx;
}

/** La Persona del compendio di una maschera, o null se la guida non ne dice una che il compendio conosca. */
export function personaDellaMaschera(idx: IndiceMaschere, maschera: unknown): PersonaDellaMascheraDto | null {
  if (typeof maschera !== 'string' || !maschera.trim()) return null;
  const chiave = normalizza(maschera);
  return idx.get(chiave) ?? (ALIAS_MASCHERE[chiave] ? idx.get(normalizza(ALIAS_MASCHERE[chiave])) : undefined) ?? null;
}
