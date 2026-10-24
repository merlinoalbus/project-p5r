// ============================================================
// istantaneaPersona — confronto fra l'esemplare in scorta e l'istantanea registrata nel compendio della partita
// ============================================================

import { CHIAVI_STATISTICHE } from '../../shared/statistiche';
import type { CompendioPartitaDto, PersonaPossedutaDto } from '../types';

/** Confronta l'esemplare con l'istantanea del compendio: assente, da aggiornare o aggiornata. */
export function statoIstantanea(p: PersonaPossedutaDto, c: CompendioPartitaDto | undefined): 'assente' | 'da-aggiornare' | 'aggiornata' {
  if (!c || !c.registrata || c.livelloRegistrato === null) return 'assente';
  const stesseSkill = c.skill.length === p.skill.length && c.skill.every((s, i) => s.id === p.skill[i]?.id);
  const stessoBonus = CHIAVI_STATISTICHE.every((k) => c.bonus[k] === p.bonus[k]);
  const stesseOsservate = (c.osservate === null) === (p.osservate === null) && (!c.osservate || !p.osservate || (c.osservate.livello === p.osservate.livello && CHIAVI_STATISTICHE.every((k) => c.osservate![k] === p.osservate![k])));
  return c.livelloRegistrato === p.livello && stesseSkill && stessoBonus && stesseOsservate && (c.tratto?.id ?? null) === (p.tratto?.id ?? null) && c.carica === p.carica ? 'aggiornata' : 'da-aggiornare';
}
