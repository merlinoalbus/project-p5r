// ============================================================
// Asset predefiniti — chiavi del manifest per le entità del gioco
// ============================================================

import { slug } from '../../shared/slug';
import type { AmbitoImmagine } from '../services/api';

export type FormaImmagine = 'quadrata' | 'carta' | 'tonda';

/**
 * Chiavi del manifest candidate per l'asset predefinito di un'entità, in ordine di preferenza
 * (la seconda è la riserva). Convenzione di docs/grafica/prompt-immagini.md:
 * `persona/<slug>`, `arcani/<chiave>` (carta) e `arcani/icona/<chiave>` (icona), `confidenti/<chiave>`.
 */
export function chiaviAssetPredefinito(ambito: AmbitoImmagine, chiave: string, forma: FormaImmagine, dimensione: number): [string | null, string | null] {
  const s = slug(chiave);
  switch (ambito) {
    case 'persona': return [`persona/${s}`, null];
    // Carta intera per la forma "carta" o i riquadri grandi; icona piccola altrimenti (con l'altra come riserva).
    case 'arcana': return forma === 'carta' || dimensione >= 96 ? [`arcani/${s}`, `arcani/icona/${s}`] : [`arcani/icona/${s}`, `arcani/${s}`];
    case 'confidente': return [`confidenti/${s}`, null];
    default: return [null, null];
  }
}
