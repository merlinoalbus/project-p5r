// ============================================================
// Asset Store — manifest degli asset grafici predefiniti: public/asset (compendio e interfaccia) + database (grafica di gioco)
// ============================================================
//
// Due sorgenti, un solo manifest: `/asset/manifest.json`, generato dal plugin Vite
// (vite/assetPredefiniti.ts) leggendo `public/asset/` (persona, arcani, ui), e `/api/immagini/manifest`,
// la grafica di gioco che vive nel database (mappe, Confidenti, sfondi, illustrazioni…: migrazione
// 079, decisione dell'utente del 2026-09-12). Le chiavi sono le stesse di sempre (`mappe/tokyo`,
// `sfondi/mementos`), quindi `useAsset` e `AssetImg` non cambiano; a parità di chiave vince il database.
// Se una sorgente fallisce, resta l'altra; senza nessuna delle due ogni componente usa il proprio
// segnaposto: l'app è pienamente funzionante anche senza alcuna grafica.
// Un asset presente nel manifest ma che non si carica (file corrotto, 404) viene segnato come mancante
// e non più ritentato nella sessione.
// ============================================================

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { usePreferenzeStore } from './preferenzeStore';
import { getManifestoImmagini } from '../services/api';
import type { ManifestImmaginiDto } from '../types';


interface AssetState {
  manifest: ManifestImmaginiDto | null;
  caricato: boolean;
  mancanti: Record<string, true>;
  carica: () => Promise<void>;
  segnaMancante: (nome: string) => void;
}

type Sorgente = { generato: string; file: Record<string, string> };
const VUOTA: Sorgente = { generato: '', file: {} };

function sorgente(dati: Partial<ManifestImmaginiDto> | null | undefined): Sorgente {
  return dati && typeof dati.file === 'object' && dati.file !== null ? { generato: dati.generato ?? '', file: dati.file } : VUOTA;
}

/** Il manifest di `public/asset` (compendio e interfaccia); vuoto se manca. */
async function manifestPubblico(): Promise<Sorgente> {
  try {
    const res = await fetch('/asset/manifest.json', { cache: 'no-cache', signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`manifest ${res.status}`);
    return sorgente((await res.json()) as Partial<ManifestImmaginiDto>);
  } catch {
    return VUOTA;
  }
}

/** La grafica di gioco nel database; vuota se il server non risponde. */
async function manifestDatabase(): Promise<Sorgente> {
  try {
    return sorgente(await getManifestoImmagini());
  } catch {
    return VUOTA;
  }
}

/** Manifest degli asset predefiniti, caricato una volta all'avvio. */
export const useAssetStore = create<AssetState>((set, get) => ({
  manifest: null,
  caricato: false,
  mancanti: {},
  carica: async () => {
    const [pubblico, database] = await Promise.all([manifestPubblico(), manifestDatabase()]);
    const file = { ...pubblico.file, ...database.file };
    set({ manifest: { generato: database.generato || pubblico.generato, totale: Object.keys(file).length, file }, caricato: true });
  },
  segnaMancante: (nome) => {
    if (get().mancanti[nome]) return;
    set((s) => ({ mancanti: { ...s.mancanti, [nome]: true } }));
  },
}));

/**
 * URL di più asset con una sola sottoscrizione (stessa regola di `useAsset`): null per ciascun asset
 * disattivato, assente o mancante. Utile per i fotogrammi del caricamento e per le catene di riserva.
 */
export function useAssetMulti(nomi: ReadonlyArray<string | null | undefined>): Array<string | null> {
  const attiva = usePreferenzeStore((s) => s.graficaPredefinita);
  // il risultato si calcola nel selettore e si confronta voce per voce (P4"): iscritti a tutto `mancanti`, ogni file mancante
  // segnato altrove ridisegnava chi usa questi nomi, con un elenco nuovo anche quando non cambiava nulla
  return useAssetStore(useShallow((s) => nomi.map((nome) => (attiva && nome && s.manifest?.file[nome] && !s.mancanti[nome] ? s.manifest.file[nome] : null))));
}

/**
 * URL dell'asset predefinito `nome` (chiave del manifest, es. "arcani/fool" o "mappe/tokyo"), oppure null se la grafica
 * predefinita è disattivata, il manifest non lo contiene o il file è risultato mancante.
 */
export function useAsset(nome: string | null | undefined): string | null {
  const attiva = usePreferenzeStore((s) => s.graficaPredefinita);
  const url = useAssetStore((s) => (nome ? s.manifest?.file[nome] ?? null : null));
  const mancante = useAssetStore((s) => (nome ? s.mancanti[nome] === true : false));
  if (!attiva || !nome || !url || mancante) return null;
  return url;
}
