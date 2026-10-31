// ============================================================
// apprendimentoSkill — come una Persona ha una skill, in parole (scheda Persona e scheda skill)
// ============================================================

import type { ModoApprendimento } from '../../shared/types';

/** Come si ha una skill: «Innata», «Liv. N», oppure — per le forme del gruppo — con il risveglio, i ranghi del Confidente o la 3ª forma; «Tratto» se la skill è il tratto della Persona. */
export function etichettaApprendimento(s: { livello: number | null; modo: ModoApprendimento | 'tratto' }): string {
  if (s.livello === 0) return 'Innata';
  if (s.livello !== null) return `Liv. ${s.livello}`;
  return s.modo === 'tratto' ? 'Tratto' : s.modo === 'risveglio' ? 'Risveglio' : s.modo === 'terza-forma' ? '3ª forma' : 'Rango';
}
