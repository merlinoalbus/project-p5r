// ============================================================
// selezioneRiga — le classi di una riga del Diario selezionata o tagliata (appunti del Diario, 2026-10-26)
// ============================================================

import type { SelezioneRiga } from '../components/guida/MenuVoce';

/** Le classi della riga selezionata o tagliata (`tailwind.css`: `.azione--selezionata`, `.azione--in-taglio`); niente senza selezione. */
export const classeSelezioneRiga = (s: SelezioneRiga | undefined): string => (s ? `${s.selezionata ? 'azione--selezionata' : ''} ${s.inTaglio ? 'azione--in-taglio' : ''}` : '');
