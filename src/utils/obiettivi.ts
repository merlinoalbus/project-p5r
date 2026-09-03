// ============================================================
// Obiettivi — costanti e collegamenti condivisi (fuori dai componenti per il fast refresh)
// ============================================================

/** Priorità di un obiettivo: 2 alta, 1 normale, 0 bassa. */
export const PRIORITA: ReadonlyArray<{ v: number; l: string }> = [
  { v: 2, l: 'Alta' },
  { v: 1, l: 'Normale' },
  { v: 0, l: 'Bassa' },
];

/** Collegamento al piano di fusione della Persona con le skill dell'obiettivo già selezionate. */
export function linkPiano(o: { personaId: number; skill: Array<{ id: number }> }): string {
  const skill = o.skill.map((s) => s.id).join(',');
  return `/fusione?vista=piani&piani=${o.personaId}${skill ? `&skill=${skill}` : ''}`;
}
