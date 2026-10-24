// ============================================================
// battagliaService — Aiuto in battaglia: dati della guida (dati_guida «battaglia») con l'indice delle Ombre collegato alle Persona (Fase 7.3)
// ============================================================

import { httpErrors } from '../utils/httpError.js';
import { datiGuidaCorretti, type Congelato } from './datiGuida.js';
import { indiceMaschere, personaDellaMaschera } from './maschere.js';
import type { BattagliaDto, OmbraDto } from '../../shared/types.js';

type SeedBattaglia = Omit<BattagliaDto, 'ombre'> & { ombre: Array<Omit<OmbraDto, 'personaCollegata'>> };

/**
 * Sezioni della guida alla battaglia e indice delle Ombre di Palazzi e Dedali con collegamento alla Persona (maschera). Le sezioni di testo portano
 * sopra le correzioni dell'utente (R11-15/4, tipo `battaglia-sezione`); la tabella `ombre` di questo blocco non si corregge (le Ombre sono `ombra`).
 */
export function battaglia(): Congelato<BattagliaDto> {
  const seed = datiGuidaCorretti<SeedBattaglia>('battaglia');
  if (!seed) throw httpErrors.notFound('battaglia-non-disponibile', 'I dati della guida alla battaglia non sono caricati.');
  const idx = indiceMaschere();
  const ombre: Array<Congelato<OmbraDto>> = seed.ombre.map((o) => ({ ...o, personaCollegata: o.persona ? personaDellaMaschera(idx, o.persona) : null }));
  return { ...seed, ombre };
}
