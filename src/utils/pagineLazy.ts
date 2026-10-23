// ============================================================
// pagineLazy — pagine caricate alla prima visita, con precarico e riconoscimento dell'errore di chunk (UI-ASSET-01)
// ============================================================
//
// Quando l'app viene rilasciata, il contenitore nuovo non ha più i file con l'hash vecchio: una scheda rimasta aperta, che importa un file
// di una pagina non ancora visitata, riceve 404 (nginx risponde 404 sotto `/assets/`, non `index.html`) e l'`import()` rifiuta.
// Qui stanno i due primi strati della difesa:
// - il precarico in tempo morto: un modulo già importato resta navigabile anche se il server perde il file;
// - il ritentativo (uno solo, breve) e la classificazione dell'errore, usata da router e riquadri d'errore per restare sulla pagina di prima.
// ============================================================

import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export interface PaginaPigra<P extends object = object> {
  Componente: LazyExoticComponent<ComponentType<P>>;
  /** Importa il modulo (una sola volta: la promessa riuscita resta in cache; una fallita si ritenta alla chiamata dopo). */
  precarica: () => Promise<void>;
}

/** Errore di caricamento di un file dell'app: il messaggio cambia per browser (Chrome, Firefox, Safari). */
export function eErroreDiChunk(e: unknown): boolean {
  const m = e instanceof Error ? `${e.name} ${e.message}` : String(e);
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|ChunkLoadError/i.test(m);
}

/** Un solo ritentativo: un file tolto dal server non torna, e il browser può tenere in memoria anche il fallimento di un `import()`. */
const ATTESE_MS = [600];

async function importaConRitentativo<M>(carica: () => Promise<M>): Promise<M> {
  for (let i = 0; ; i++) {
    try {
      const modulo = await carica();
      if (modulo === undefined) throw new Error('Failed to fetch dynamically imported module (modulo assente)');
      return modulo;
    } catch (e) {
      if (!eErroreDiChunk(e) || i >= ATTESE_MS.length) throw e;
      await new Promise((r) => setTimeout(r, ATTESE_MS[i]));
    }
  }
}

/** Una pagina caricata alla prima visita: il modulo la esporta per nome, `lazy` vuole l'export predefinito. */
export function pigra<M, P extends object = object>(carica: () => Promise<M>, nome: keyof M): PaginaPigra<P> {
  let promessa: Promise<M> | null = null;
  const importa = (): Promise<M> => (promessa ??= importaConRitentativo(carica).catch((e: unknown) => { promessa = null; throw e; }));
  return {
    Componente: lazy(async () => ({ default: (await importa())[nome] as unknown as ComponentType<P> })),
    precarica: async () => { await importa(); },
  };
}

/** Importa le pagine una alla volta in tempo morto (non con connessione lenta o «risparmio dati»). */
export function precaricaInBackground(precaricamenti: ReadonlyArray<() => Promise<void>>): void {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType ?? '')) return;
  const inTempoMorto = (f: () => void) => (typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(f, { timeout: 4000 }) : globalThis.setTimeout(f, 300));
  let i = 0;
  const passo = () => {
    const prossimo = precaricamenti[i++];
    if (!prossimo) return;
    prossimo().catch(() => undefined).finally(() => inTempoMorto(passo));
  };
  inTempoMorto(passo);
}
