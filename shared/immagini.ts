// ============================================================
// Immagini — gli ambiti della tabella `immagine`, condivisi fra server e frontend
// ============================================================
//
// Decisione dell'utente (2026-09-12): tutte le immagini che non sono del compendio (persona, arcani,
// skill) né dell'interfaccia (`ui/`) vivono DENTRO il database di gioco, come contenuto binario della
// tabella `immagine`. Due gruppi di ambiti:
// - **caricamento**: le immagini che l'utente carica per un'entità (un Arcano, un Confidente, la
//   pianta di una mappa…), una per (ambito, chiave), con precedenza sulla grafica predefinita;
// - **predefiniti**: le famiglie della grafica di gioco che stavano in `public/asset/<famiglia>/`
//   e ora stanno nel database, con la chiave del manifesto (`mappe/tokyo`, `sfondi/mementos`,
//   `mappe/lmap/tokyo/akasaka`): il frontend le risolve con lo stesso `useAsset` di prima.
// ============================================================

/** Ambiti delle immagini caricate dall'utente per un'entità. */
export const AMBITI_CARICAMENTO = ['arcana', 'confidente', 'personaggio', 'persona', 'skill', 'mappa', 'spillo', 'altro'] as const;
export type AmbitoCaricamento = (typeof AMBITI_CARICAMENTO)[number];

/** Le famiglie della grafica predefinita che vivono nel database (tutto ciò che non è compendio né `ui/`). */
export const AMBITI_PREDEFINITI = ['affinita', 'attivita', 'confidenti', 'decori', 'doti', 'elementi', 'guida', 'identita', 'illustrazioni', 'mappe', 'meteo', 'palazzi', 'persona-gruppo', 'personaggi', 'sfondi', 'spilli'] as const;
export type AmbitoPredefinito = (typeof AMBITI_PREDEFINITI)[number];

/** Tutti gli ambiti ammessi dalla tabella e dalle rotte. */
export const AMBITI_IMMAGINE = [...AMBITI_CARICAMENTO, ...AMBITI_PREDEFINITI] as const;
export type AmbitoImmagine = (typeof AMBITI_IMMAGINE)[number];

export function ePredefinito(ambito: string): ambito is AmbitoPredefinito {
  return (AMBITI_PREDEFINITI as readonly string[]).includes(ambito);
}

/** Estensioni ammesse per i file della grafica predefinita, in ordine di preferenza a parità di chiave (come il manifest di Vite). */
export const ESTENSIONI_IMMAGINE = ['webp', 'png', 'svg', 'jpg', 'jpeg', 'gif'] as const;

const MIME_PER_ESTENSIONE: Record<string, string> = { webp: 'image/webp', png: 'image/png', svg: 'image/svg+xml', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif' };

/** Il MIME di un'estensione ammessa (minuscola), oppure null. */
export function mimeDaEstensione(estensione: string): string | null {
  return MIME_PER_ESTENSIONE[estensione.toLowerCase()] ?? null;
}
