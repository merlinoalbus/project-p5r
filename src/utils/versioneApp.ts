// ============================================================
// versioneApp — riconosce che sul server c'è un'app più nuova di quella caricata (UI-ASSET-01, strato S4)
// ============================================================
//
// Vite mette l'hash nel nome dello script d'ingresso (`/assets/index-<hash>.js`). Lo script caricato dalla scheda è letto una volta
// all'avvio del modulo; `/index.html` (richiesto senza cache) dice quale è sul server adesso: se sono diversi, l'app è stata rilasciata
// di nuovo. In sviluppo gli script non hanno hash e il controllo non fa niente.
// ============================================================

import { useVersioneStore } from '../stores/versioneStore';

const SCRIPT_CARICATO = typeof document === 'undefined'
  ? null
  : document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/index-"]')?.getAttribute('src') ?? null;

/** Vero se `/index.html` sul server indica uno script d'ingresso diverso da quello caricato. Mai un errore: nel dubbio, falso. */
export async function esisteNuovaVersione(): Promise<boolean> {
  if (!import.meta.env.PROD || !SCRIPT_CARICATO) return false;
  try {
    const r = await fetch('/index.html', { cache: 'no-store' });
    if (!r.ok) return false;
    const m = /<script[^>]*type="module"[^>]*src="([^"]*\/assets\/index-[^"]+\.js)"/.exec(await r.text());
    return !!m && m[1] !== SCRIPT_CARICATO;
  } catch {
    return false;
  }
}

/** Controlla a ogni rientro in primo piano, a ogni ritorno online, dopo ogni errore di precarico e ogni 10 minuti. */
export function avviaControlloVersione(): void {
  const controlla = async () => {
    if (useVersioneStore.getState().nuovaVersione) return;
    if (await esisteNuovaVersione()) useVersioneStore.getState().segnala('versione');
  };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void controlla(); });
  window.addEventListener('online', () => void controlla());
  // senza `preventDefault`: l'errore prosegue verso `pigra` e il `loader` della route, che sanno restare sulla pagina di prima
  window.addEventListener('vite:preloadError', () => void controlla());
  window.setInterval(() => void controlla(), 10 * 60_000);
}
