// ============================================================
// fasceDiarioStore — quali fasce («Di giorno», «Di sera») di quale giorno del Diario sono chiuse (C9, 2026-10-31)
// ============================================================
//
// Richiesta dell'utente: «Voglio poter collassare DI GIORNO e DI SERA e riaprirlo... default aperti...». Ogni fascia di ogni giorno si
// chiude e si riapre dalla sua intestazione (`GiornoGuida`); di base è aperta. Lo stato vale per la sessione: resta passando da una scheda
// all'altra o tornando a un giorno già visto, e si perde ricaricando la pagina (in memoria, niente localStorage). Non tocca i dati: le
// voci di una fascia chiusa restano montate e nascoste (spunte, selezione, copia e incolla continuano a valere).
//
// `mostrate`: le richieste di portare in vista una voce (l'indirizzo `#voce-…` / `?voce=…` di una ricerca o di un ritorno, la voce
// evidenziata dalla mappa) già servite. Una voce cercata in una fascia chiusa la riapre UNA volta: se poi chi gioca richiude la fascia, la
// stessa richiesta non la riapre di nuovo.
// ============================================================

import { create } from 'zustand';
import type { FasciaGioco } from '../types';

/** La chiave di una fascia di un giorno. */
export const chiaveFascia = (giorno: string, fascia: FasciaGioco) => `${giorno}/${fascia}`;

interface StatoFasce {
  /** Le fasce chiuse (`giorno/fascia`); le assenti sono aperte. */
  chiuse: Readonly<Record<string, true>>;
  /** Le richieste di mostrare una voce già servite (chiavi libere di chi le fa). */
  mostrate: Readonly<Record<string, true>>;
  /** Chiude una fascia aperta o riapre una chiusa. */
  alterna: (giorno: string, fascia: FasciaGioco) => void;
  /** Riapre le fasce date, se chiuse (nessun cambiamento se sono già aperte). */
  apri: (giorno: string, fasce: readonly FasciaGioco[]) => void;
  /** Segna servita una richiesta di mostrare una voce. */
  segnaMostrata: (chiave: string) => void;
}

export const useFasceDiarioStore = create<StatoFasce>((set) => ({
  chiuse: {},
  mostrate: {},
  alterna: (giorno, fascia) => set((s) => {
    const k = chiaveFascia(giorno, fascia);
    const chiuse = { ...s.chiuse };
    if (chiuse[k]) delete chiuse[k];
    else chiuse[k] = true;
    return { chiuse };
  }),
  apri: (giorno, fasce) => set((s) => {
    const daAprire = fasce.map((f) => chiaveFascia(giorno, f)).filter((k) => s.chiuse[k]);
    if (daAprire.length === 0) return s;
    const chiuse = { ...s.chiuse };
    for (const k of daAprire) delete chiuse[k];
    return { chiuse };
  }),
  segnaMostrata: (chiave) => set((s) => (s.mostrate[chiave] ? s : { mostrate: { ...s.mostrate, [chiave]: true } })),
}));
