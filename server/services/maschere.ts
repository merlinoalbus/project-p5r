// ============================================================
// maschere — dal nome di una maschera scritto dalla guida alla Persona del compendio
// ============================================================
//
// La guida scrive la maschera delle Ombre in italiano o in inglese («Bicorno», «Pixie», «Jack-o'-lantern»). Il compendio ha il
// nome canonico inglese e la resa italiana in `traduzione`. Lo usano l'indice delle Ombre della guida alla battaglia (Fase 7.3)
// e le Persona dei dedali dei Memento (2026-10-11), che ne mostrano l'immagine.
// Dal lotto L8 la regola di confronto vive in `shared/maschere.ts` (una sola per le scritture nuove); qui resta la lettura dal database.
// ============================================================

import { prepared } from '../db/dbService.js';
import { mappaAmbito } from './traduzioniService.js';
import { cercaPersonaPerNome, costruisciIndicePersone, normalizza } from '../../shared/maschere.js';
import type { PersonaDellaMascheraDto } from '../../shared/types.js';

export { normalizza };

/** L'indice nome (inglese e italiano, normalizzato) → Persona del compendio: si costruisce una volta per richiesta. */
export type IndiceMaschere = ReadonlyMap<string, PersonaDellaMascheraDto>;

/** Costruisce l'indice delle maschere dal compendio e dalle sue traduzioni. */
export function indiceMaschere(): IndiceMaschere {
  return costruisciIndicePersone(prepared('SELECT id, nome FROM persona').all() as Array<{ id: number; nome: string }>, mappaAmbito('persona'));
}

/** La Persona del compendio di una maschera, o null se la guida non ne dice una che il compendio conosca. */
export function personaDellaMaschera(idx: IndiceMaschere, maschera: unknown): PersonaDellaMascheraDto | null {
  return cercaPersonaPerNome(idx, maschera);
}
