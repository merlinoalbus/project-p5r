// ============================================================
// appuntiFissiStore — gli appunti fissi del Diario e lo stato della loro finestra fluttuante (2026-10-31, C7)
// ============================================================
//
// Richiesta dell'utente: «una sorta di clipboard su finestra fluttuante dove possa io inserire e mantenere salvati delle voci che tendono a
// ripetersi nel diario»; «deve essere possibile spostare la finestra di clipboard, ridurla a icona o riportarla a dimensione originaria».
//
//   - L'elenco viene dal server (`/api/appunti-fissi`, dati utente): qui c'è solo la copia a schermo, riletta a ogni apertura della finestra
//     e dopo un rifiuto «l'elenco è cambiato» (un altro dispositivo). Mai in `localStorage`.
//   - Lo stato della finestra (chiusa, aperta, ridotta a icona) si ricorda PER DISPOSITIVO in `localStorage`, con try/catch: senza (finestra
//     privata, dati bloccati) la finestra parte chiusa e funziona lo stesso. Posizione e dimensione le tiene la finestra (`FinestraAppuntiFissi`).
//   - `proposta`: un appunto da aggiungere già pronto (dal menu della voce del Diario, «Salva negli appunti fissi»): la finestra si apre con
//     il modulo d'aggiunta compilato, il titolo proposto si cambia prima di salvare.
// Solo nella preparazione: chi lo usa sta dietro la costante di build del rilascio, e il modulo esce dal bundle.
// ============================================================

import { create } from 'zustand';
import { creaAppuntoFisso, eliminaAppuntoFisso, getAppuntiFissi, isApiError, modificaAppuntoFisso, riordinaAppuntiFissi } from '../services/api';
import type { AppuntoFissoDto, ModificaAppuntoFisso, NuovoAppuntoFisso } from '../../shared/appuntiFissi';

export type StatoFinestraAppunti = 'chiusa' | 'aperta' | 'ridotta';

const CHIAVE_STATO = 'p5r.appuntiFissi.stato';

function leggiStato(): StatoFinestraAppunti {
  try {
    const v = window.localStorage.getItem(CHIAVE_STATO);
    return v === 'aperta' || v === 'ridotta' ? v : 'chiusa';
  } catch { return 'chiusa'; }
}
function scriviStato(s: StatoFinestraAppunti): void {
  try { window.localStorage.setItem(CHIAVE_STATO, s); } catch { /* senza memoria del dispositivo la finestra riparte chiusa */ }
}

interface StatoAppuntiFissi {
  stato: StatoFinestraAppunti;
  elenco: AppuntoFissoDto[] | null;
  caricamento: boolean;
  errore: string | null;
  /** Un appunto da aggiungere già compilato (dal Diario); `n` cambia a ogni proposta, così il modulo si rimonta anche con lo stesso testo. */
  proposta: (NuovoAppuntoFisso & { n: number }) | null;
  apri: () => void;
  chiudi: () => void;
  /** La chiusura chiesta da fuori (il pulsante della barra superiore): la fa la finestra, che prima chiede delle bozze non salvate. Cambia a ogni richiesta. */
  richiestaChiusura: number;
  chiediChiusura: () => void;
  riduci: () => void;
  /** Apre la finestra con il modulo d'aggiunta compilato. */
  proponi: (p: NuovoAppuntoFisso) => void;
  togliProposta: () => void;
  carica: () => Promise<void>;
  aggiungi: (d: NuovoAppuntoFisso) => Promise<AppuntoFissoDto>;
  modifica: (id: number, d: ModificaAppuntoFisso) => Promise<AppuntoFissoDto>;
  elimina: (id: number) => Promise<void>;
  /** Sposta un appunto di un posto su (-1) o giù (+1). */
  sposta: (id: number, verso: -1 | 1) => Promise<void>;
}

let progressivo = 0;

// `@__PURE__`: lo store non ha effetti alla creazione, quindi nel bundle di rilascio, dove nessuno lo usa (i suoi utenti stanno dietro la
// costante di build), esce con le chiamate all'API che importa (lo controlla `scripts/verifica-bundle-rilascio.ts`)
export const useAppuntiFissiStore = /* @__PURE__ */ create<StatoAppuntiFissi>((set, get) => {
  const imposta = (stato: StatoFinestraAppunti) => { scriviStato(stato); set({ stato }); };
  /** Dopo un rifiuto perché l'appunto o l'elenco non sono più quelli a schermo (un altro dispositivo), si rilegge. */
  const rileggiSeCambiato = (err: unknown) => {
    if (isApiError(err, 'appunto-non-trovato') || isApiError(err, 'ordine-cambiato')) void get().carica();
  };
  return {
    stato: leggiStato(),
    elenco: null,
    caricamento: false,
    errore: null,
    proposta: null,
    apri: () => imposta('aperta'),
    chiudi: () => { imposta('chiusa'); set({ proposta: null }); },
    richiestaChiusura: 0,
    chiediChiusura: () => set((s) => ({ richiestaChiusura: s.richiestaChiusura + 1 })),
    riduci: () => imposta('ridotta'),
    proponi: (p) => { progressivo += 1; set({ proposta: { ...p, n: progressivo } }); imposta('aperta'); },
    togliProposta: () => set({ proposta: null }),
    carica: async () => {
      set({ caricamento: true, errore: null });
      try {
        const elenco = await getAppuntiFissi();
        set({ elenco, caricamento: false });
      } catch (err) {
        set({ caricamento: false, errore: err instanceof Error && err.message ? err.message : 'Appunti fissi non letti.' });
      }
    },
    aggiungi: async (d) => {
      const nuovo = await creaAppuntoFisso(d);
      set((s) => ({ elenco: [...(s.elenco ?? []).filter((a) => a.id !== nuovo.id), nuovo] }));
      return nuovo;
    },
    modifica: async (id, d) => {
      try {
        const agg = await modificaAppuntoFisso(id, d);
        set((s) => ({ elenco: (s.elenco ?? []).map((a) => (a.id === id ? agg : a)) }));
        return agg;
      } catch (err) { rileggiSeCambiato(err); throw err; }
    },
    elimina: async (id) => {
      try {
        await eliminaAppuntoFisso(id);
        set((s) => ({ elenco: (s.elenco ?? []).filter((a) => a.id !== id).map((a, i) => ({ ...a, ordine: i })) }));
      } catch (err) { rileggiSeCambiato(err); throw err; }
    },
    sposta: async (id, verso) => {
      const elenco = get().elenco ?? [];
      const i = elenco.findIndex((a) => a.id === id), j = i + verso;
      if (i < 0 || j < 0 || j >= elenco.length) return;
      const ids = elenco.map((a) => a.id);
      [ids[i], ids[j]] = [ids[j], ids[i]];
      try {
        set({ elenco: await riordinaAppuntiFissi(ids) });
      } catch (err) { rileggiSeCambiato(err); throw err; }
    },
  };
});
