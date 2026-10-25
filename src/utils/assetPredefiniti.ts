// ============================================================
// Asset predefiniti — chiavi del manifest per le entità del gioco
// ============================================================

import { slug } from '../../shared/slug';
import type { AmbitoImmagine } from '../services/api';

export type FormaImmagine = 'quadrata' | 'carta' | 'tonda';
/** Forme del riquadro immagine (l'orizzontale è 4:3, usata per gli artwork di gioco). */
export type FormaRiquadro = FormaImmagine | 'orizzontale';

/** Altezza del riquadro per forma e larghezza: quadrata/tonda 1:1, carta 1:2, orizzontale 4:3. */
export function altezzaPerForma(forma: FormaRiquadro | undefined, larghezza: number): number {
  if (forma === 'carta') return Math.round(larghezza * 2);
  if (forma === 'orizzontale') return Math.round(larghezza * 0.75);
  return larghezza;
}

/**
 * Chiavi del manifest candidate per l'asset predefinito di un'entità, in ordine di preferenza
 * (la seconda è la riserva). Convenzione di docs/grafica/prompt-immagini.md:
 * `persona/<slug>`, `arcani/<chiave>` (carta) e `arcani/icona/<chiave>` (icona), `confidenti/<chiave>-fedele` (ritratto fedele
 * al gioco, mostrato di default) con `confidenti/<chiave>` (versione stilizzata, riserva e alternativa al passaggio del mouse).
 */
export function chiaviAssetPredefinito(ambito: AmbitoImmagine, chiave: string, forma: FormaImmagine, dimensione: number, nomeIt?: string): [string | null, string | null, string?] {
  const s = slug(chiave);
  switch (ambito) {
    // le Persona dei Ladri Fantasma (Arsène, Zorro, Mercurius, Diego…) hanno la figura in `persona-gruppo/`, la stessa che mostra la pagina
    // Personaggi: è la riserva quando `persona/` non ce l'ha (prima il Compendio le lasciava senza immagine).
    // In `persona-gruppo/` la chiave è lo slug del nome ITALIANO (Mercurius → `mercurio`): se differisce dallo slug del nome canonico è la terza chiave
    case 'persona': {
      const sIt = nomeIt ? slug(nomeIt) : s;
      return sIt && sIt !== s ? [`persona/${s}`, `persona-gruppo/${s}`, `persona-gruppo/${sIt}`] : [`persona/${s}`, `persona-gruppo/${s}`];
    }
    // Carta intera per la forma "carta" o i riquadri grandi; icona piccola altrimenti (con l'altra come riserva).
    case 'arcana': return forma === 'carta' || dimensione >= 96 ? [`arcani/${s}`, `arcani/icona/${s}`] : [`arcani/icona/${s}`, `arcani/${s}`];
    case 'confidente': return [`confidenti/${s}-fedele`, `confidenti/${s}`];
    // personaggi senza Confidente (Protagonista, Stanza di Velluto, Jose): la stessa coppia dei
    // Confidenti, ritratto fedele di default e stilizzato come alternativa (prompt §14)
    case 'personaggio': return [`personaggi/${s}-fedele`, `personaggi/${s}`];
    default: return [null, null];
  }
}
