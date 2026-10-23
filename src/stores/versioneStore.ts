// ============================================================
// versioneStore — «c'è una versione nuova dell'app» (UI-ASSET-01, strato S4)
// ============================================================
//
// Lo accende `utils/versioneApp` (lo script d'ingresso sul server non è più quello caricato) o il router (un file di pagina non c'è più
// sul server). `AvvisoNuovaVersione`, in `MainLayout`, mostra la striscia con «Aggiorna»: l'app non si ricarica mai da sola.
// ============================================================

import { create } from 'zustand';

export type MotivoNuovaVersione = 'versione' | 'chunk';

interface VersioneState {
  nuovaVersione: boolean;
  motivo: MotivoNuovaVersione | null;
  /** Segnala la nuova versione; un motivo «chunk» (una pagina che non si può caricare) non viene declassato a «versione». */
  segnala: (motivo: MotivoNuovaVersione) => void;
}

export const useVersioneStore = create<VersioneState>((set) => ({
  nuovaVersione: false,
  motivo: null,
  segnala: (motivo) => set((s) => ({ nuovaVersione: true, motivo: s.motivo === 'chunk' ? 'chunk' : motivo })),
}));
