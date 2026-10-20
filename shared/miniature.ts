// ============================================================
// Miniature delle immagini servite dal database (L1, variante «miniature», 2026-10-21)
// ============================================================
//
// La rotta che serve il file di un'immagine (`GET /api/immagini/:ambito/:chiave/file`) accetta `l`, la larghezza in pixel, e
// risponde con una WebP ridotta, generata la prima volta e poi tenuta in cache nel database (`immagine_miniatura`, migrazione 108).
// Le viste che mostrano un'immagine in piccolo (schede de La città, intestazioni, indice e griglie delle Mappe) la chiedono con
// `srcset` e `sizes`, e il browser sceglie la misura per la larghezza e la densità dello schermo; visore ed editor restano a piena
// risoluzione. Le misure sono un insieme chiuso: la cache non cresce senza limiti e un URL inventato non genera niente.
// ============================================================

/** Le larghezze ammesse per una miniatura, in pixel, dalla più piccola. */
export const LARGHEZZE_MINIATURA = [160, 320, 640, 1024] as const;

/** Una larghezza ammessa. */
export type LarghezzaMiniatura = (typeof LARGHEZZE_MINIATURA)[number];

/** Vero se `l` è una delle larghezze ammesse. */
export function larghezzaMiniaturaAmmessa(l: number): l is LarghezzaMiniatura {
  return (LARGHEZZE_MINIATURA as readonly number[]).includes(l);
}

/** Vero se l'URL è il file di un'immagine servita dal database (`…/api/immagini/<ambito>/<chiave>/file`, relativo o con l'origine
 *  davanti), l'unico che ha miniature. `blob:` e `data:` non cominciano né con `/` né con `http`, quindi non passano. */
function dalDatabase(url: string): boolean {
  return /^(?:https?:\/\/[^/?#]+)?(?:\/[^?#]*?)?\/api\/immagini\/[^?#]+\/file(?:[?#]|$)/.test(url);
}

/**
 * L'URL della miniatura larga `l` di un'immagine del database: aggiunge `l` (con `&` se c'è già una query, come la versione `?v=`,
 * altrimenti con `?`); un `l` già presente si sostituisce. Gli altri URL — asset statici `/asset/…`, `blob:`, `data:`, indirizzi
 * esterni — restano invariati, perché non hanno miniature.
 */
export function urlMiniatura(url: string, l: LarghezzaMiniatura): string {
  if (!dalDatabase(url)) return url;
  const [base, frammento] = url.split('#', 2) as [string, string | undefined];
  const [percorso, query = ''] = base.split('?', 2) as [string, string | undefined];
  const parti = query.split('&').filter((p) => p.length > 0 && !p.startsWith('l='));
  parti.push(`l=${l}`);
  return `${percorso}?${parti.join('&')}${frammento !== undefined ? `#${frammento}` : ''}`;
}

/**
 * Il valore di `srcset` con le miniature alle larghezze date (tutte, se non dette): `"<url&l=160> 160w, <url&l=320> 320w, …"`.
 * Stringa vuota per un URL che non è del database: la vista allora usa solo `src`.
 */
export function srcsetMiniature(url: string, larghezze: readonly LarghezzaMiniatura[] = LARGHEZZE_MINIATURA): string {
  if (!dalDatabase(url)) return '';
  return larghezze.map((l) => `${urlMiniatura(url, l)} ${l}w`).join(', ');
}
