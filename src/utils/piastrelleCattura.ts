// ============================================================
// piastrelleCattura — dalla voce della guida alla piastrella di cattura (L8, R8-29)
// ============================================================

import type { PiastrellaCatturabile } from '../components/guida/PiastrelleCattura';
import type { CompendioPartitaDto, PuntoInteresseDto } from '../types';

/** Una voce Persona di un Palazzo con la sua Persona e la sua Ombra (L8, R8-12): non si segna, si cattura con la piastrella (`PersoneDelPalazzo`)
 *  nella scheda del Palazzo come nella guida del visore; il server rifiuta di segnarla (`cattura-nel-compendio`). */
export const voceDaCatturare = (p: PuntoInteresseDto): boolean => p.tipo === 'persona' && !!p.persona && !!p.ombra;

/** Le Persona catturate di una partita: quelle registrate nel suo compendio (id). La chiamata che lo cambia è `catturaNelCompendio`
 *  (`services/gestiGuida.ts`). */
export const personeRegistrate = (compendio: readonly CompendioPartitaDto[]): number[] => compendio.filter((c) => c.registrata).map((c) => c.personaId);

/** La voce Persona della guida come piastrella: la Persona del compendio, il nome da mostrare e l'Ombra dell'incontro (se non è catturabile dall'incontro, senza il gesto). */
export const comePiastrella = (p: PuntoInteresseDto): PiastrellaCatturabile => ({
  chiave: p.chiave, persona: p.persona, etichetta: p.persona?.nomeIt ?? p.nome, ombra: p.ombra?.chiave, catturabile: p.ombra ? p.ombra.catturabile : true,
});
