// ============================================================
// TargaSuggerito — targhetta «Oggi» sugli elementi coinvolti nei suggerimenti del giorno (12.4)
// ============================================================
//
// L'oro non è mai l'unico segnale: la targhetta (con il motivo nel titolo) resta leggibile anche senza distinguere i colori.
// Le classi dell'alone stanno in `src/utils/suggerimenti.ts` (`classiSuggerito`).
// ============================================================

import { IconaAzione } from './IconaAzione';

export function TargaSuggerito({ motivo, compatta }: { motivo?: string | null; compatta?: boolean }) {
  return (
    <span className={`targa-suggerito ${compatta ? 'targa-suggerito--compatta' : ''}`} title={motivo ?? undefined}>
      <IconaAzione chiave="calendario" dimensione={compatta ? 12 : 14} />
      <span>Oggi</span>
    </span>
  );
}
