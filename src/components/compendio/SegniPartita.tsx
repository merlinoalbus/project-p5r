// ============================================================
// SegniPartita — «In scorta · Liv. N» (oro) e «Nel Registro · Liv. N» (rosso) di una Persona nella partita attiva (L10-04)
// ============================================================
//
// Solo con una partita attiva e solo se veri: niente segno vuol dire né in scorta né nel Registro. Li mostrano le piastrelle del
// Compendio e la testa della scheda Persona, dalla lettura unica di `useSegniPersonaPartita`.
// ============================================================

import type { SegniPersona } from '../../hooks/useSegniPersonaPartita';

/** Il testo del segno della scorta. */
const testoScorta = (livello: number): string => `In scorta · Liv. ${livello}`;
/** Il testo del segno del Registro (senza livello se la registrazione non ne ha uno). */
const testoRegistro = (livello: number | null): string => (livello === null ? 'Nel Registro' : `Nel Registro · Liv. ${livello}`);

/** I segni come chip; niente se la Persona non è né in scorta né nel Registro (o senza partita). */
export function SegniPartita({ segni }: { segni?: SegniPersona }) {
  if (!segni) return null;
  return <>
    {segni.scorta !== null && <span className="chip chip--oro">{testoScorta(segni.scorta)}</span>}
    {segni.registro && <span className="chip chip--attivo">{testoRegistro(segni.registro.livello)}</span>}
  </>;
}
