// ============================================================
// Asset Store — manifest degli asset grafici predefiniti (/asset/manifest.json)
// ============================================================
//
// Il manifest è generato dal plugin Vite (vite/assetPredefiniti.ts) leggendo public/asset/.
// Se la richiesta fallisce o il file manca, il manifest resta vuoto e ogni componente usa il proprio
// segnaposto: l'app è pienamente funzionante anche senza alcuna grafica.
// Un asset presente nel manifest ma che non si carica (file corrotto, 404) viene segnato come mancante
// e non più ritentato nella sessione.
// ============================================================

import { create } from 'zustand';
import { usePreferenzeStore } from './preferenzeStore';

export interface ManifestAsset {
  generato: string;
  totale: number;
  file: Record<string, string>;
}

interface AssetState {
  manifest: ManifestAsset | null;
  caricato: boolean;
  mancanti: Record<string, true>;
  carica: () => Promise<void>;
  segnaMancante: (nome: string) => void;
}

/** Manifest degli asset predefiniti, caricato una volta all'avvio. */
export const useAssetStore = create<AssetState>((set, get) => ({
  manifest: null,
  caricato: false,
  mancanti: {},
  carica: async () => {
    try {
      const res = await fetch('/asset/manifest.json', { cache: 'no-cache', signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`manifest ${res.status}`);
      const dati = (await res.json()) as Partial<ManifestAsset>;
      const file = dati && typeof dati.file === 'object' && dati.file !== null ? dati.file : {};
      set({ manifest: { generato: dati.generato ?? '', totale: Object.keys(file).length, file }, caricato: true });
    } catch {
      // Nessun manifest: si prosegue con i segnaposto.
      set({ manifest: { generato: '', totale: 0, file: {} }, caricato: true });
    }
  },
  segnaMancante: (nome) => {
    if (get().mancanti[nome]) return;
    set((s) => ({ mancanti: { ...s.mancanti, [nome]: true } }));
  },
}));

/**
 * URL dell'asset predefinito `nome` (chiave del manifest, es. "arcani/fool"), oppure null se la grafica
 * predefinita è disattivata, il manifest non lo contiene o il file è risultato mancante.
 */
/**
 * URL di più asset con una sola sottoscrizione (stessa regola di `useAsset`): null per ciascun asset
 * disattivato, assente o mancante. Utile per i fotogrammi del caricamento e per le catene di riserva.
 */
export function useAssetMulti(nomi: ReadonlyArray<string | null | undefined>): Array<string | null> {
  const attiva = usePreferenzeStore((s) => s.graficaPredefinita);
  const file = useAssetStore((s) => s.manifest?.file);
  const mancanti = useAssetStore((s) => s.mancanti);
  return nomi.map((nome) => (attiva && nome && file?.[nome] && !mancanti[nome] ? file[nome] : null));
}

export function useAsset(nome: string | null | undefined): string | null {
  const attiva = usePreferenzeStore((s) => s.graficaPredefinita);
  const url = useAssetStore((s) => (nome ? s.manifest?.file[nome] ?? null : null));
  const mancante = useAssetStore((s) => (nome ? s.mancanti[nome] === true : false));
  if (!attiva || !nome || !url || mancante) return null;
  return url;
}
