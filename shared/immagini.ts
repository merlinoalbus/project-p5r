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

/** Ambiti delle immagini caricate dall'utente per un'entità. `dungeon` (O9-5, 2026-10-31: «l'area Memento riporta le voci senza immagini.
 *  Ma io ho generato delle immagini da inserire», «stessa funzione … anche per i palazzi») è la miniatura della carta nella pagina Luoghi:
 *  chiave = `dungeon.chiave` di un Palazzo, `dungeon_area.chiave` di un Dedalo dei Memento o `area_dedalo.chiave` di un'area di un Dedalo
 *  (`AMBITO_MINIATURA_LUOGO`). */
export const AMBITI_CARICAMENTO = ['arcana', 'confidente', 'personaggio', 'persona', 'skill', 'mappa', 'spillo', 'dungeon', 'altro'] as const;

/** L'ambito della miniatura delle carte dei Palazzi, dei Dedali e delle aree dei Dedali nella pagina Luoghi (O9-5): non `mappa`, perché la
 *  chiave di un'area di un Palazzo in «mappa» è già la sua pianta. */
export const AMBITO_MINIATURA_LUOGO = 'dungeon' as const;

/** I formati che una miniatura (e ogni immagine caricata) può avere, come li accetta il server (`immaginiService`): il client li usa per
 *  rifiutare subito un file sbagliato, il server resta l'arbitro (controlla i byte). */
export const MIME_IMMAGINE_AMMESSI = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'] as const;

/** La dimensione massima di un'immagine caricata, in byte (8 MB): la stessa del server (`MAX_BYTE_IMMAGINE`). */
export const MAX_BYTE_IMMAGINE_CARICATA = 8 * 1024 * 1024;

/** Le famiglie della grafica predefinita che vivono nel database (tutto ciò che non è compendio né `ui/`). */
export const AMBITI_PREDEFINITI = ['affinita', 'attivita', 'confidenti', 'decori', 'doti', 'elementi', 'guida', 'identita', 'illustrazioni', 'mappe', 'meteo', 'palazzi', 'persona-gruppo', 'personaggi', 'sfondi', 'spilli'] as const;

/** Tutti gli ambiti ammessi dalla tabella e dalle rotte. */
export const AMBITI_IMMAGINE = [...AMBITI_CARICAMENTO, ...AMBITI_PREDEFINITI] as const;
export type AmbitoImmagine = (typeof AMBITI_IMMAGINE)[number];

/** Estensioni ammesse per i file della grafica predefinita, in ordine di preferenza a parità di chiave (come il manifest di Vite). */
export const ESTENSIONI_IMMAGINE = ['webp', 'png', 'svg', 'jpg', 'jpeg', 'gif'] as const;

const MIME_PER_ESTENSIONE: Record<string, string> = { webp: 'image/webp', png: 'image/png', svg: 'image/svg+xml', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif' };

/** Il MIME di un'estensione ammessa (minuscola), oppure null. */
export function mimeDaEstensione(estensione: string): string | null {
  return MIME_PER_ESTENSIONE[estensione.toLowerCase()] ?? null;
}
