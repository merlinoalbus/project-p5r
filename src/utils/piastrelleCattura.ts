// ============================================================
// piastrelleCattura — dalla voce della guida alla piastrella di cattura (L8, R8-29)
// ============================================================

import type { PiastrellaCatturabile } from '../components/guida/PiastrelleCattura';
import type { PuntoInteresseDto } from '../types';

/** La voce Persona della guida come piastrella: la Persona del compendio, il nome da mostrare e l'Ombra dell'incontro (se non è catturabile dall'incontro, senza il gesto). */
export const comePiastrella = (p: PuntoInteresseDto): PiastrellaCatturabile => ({
  chiave: p.chiave, persona: p.persona, etichetta: p.persona?.nomeIt ?? p.nome, ombra: p.ombra?.chiave, catturabile: p.ombra ? p.ombra.catturabile : true,
});
