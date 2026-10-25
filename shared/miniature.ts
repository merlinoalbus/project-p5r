// ============================================================
// Miniature delle immagini servite dal database (L1, variante «miniature», 2026-10-20)
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

/**
 * La generazione delle miniature: cambia quando cambia il modo di calcolarle, e con lei la versione delle righe in cache
 * (`immagine_miniatura.versione`), l'ETag e la versione `?v=` degli URL (`versioneImmagine`), così né la cache del
 * database né quella del browser (un anno, immutabile) servono una miniatura dell'algoritmo di prima. `r2` (UX2-13, 2026-10-20):
 * un'immagine con margini trasparenti si ritaglia sul riquadro del disegno.
 */
export const GENERAZIONE_MINIATURE = 'r2';

/**
 * La versione di un'immagine del database negli URL (`?v=`) e nelle righe della cache delle miniature: la sua data con la
 * generazione delle miniature. La usano il manifesto della grafica predefinita (le planimetrie native) e le immagini caricate
 * delle mappe, cioè gli URL a cui le viste aggiungono `l`.
 */
export function versioneImmagine(createdAt: string): string {
  return `${createdAt}~${GENERAZIONE_MINIATURE}`;
}

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

// ============================================================
// Miniature degli asset statici del compendio (R12-03, gruppo «immagini-compendio»)
// ============================================================
//
// Le Persona (`public/asset/persona/`) e le carte e le icone degli arcani (`public/asset/arcani/`) sono PNG da 0,07 a 1,9 MB che le viste
// mostrano in riquadri da 16 a 150 px. Non vivono nel database, quindi non passano dalla rotta delle miniature: il plugin Vite
// (`vite/miniatureAsset.ts`) ne genera le varianti WebP ALLA BUILD, in `/asset/mini/<larghezza>/<famiglia>/<nome>.webp`, e in sviluppo le
// serve al volo. La scelta è fatta per convenzione sul nome (nessun campo nuovo nel manifesto): dall'URL dell'asset si ricava
// quello della variante, e il browser sceglie la misura con `srcset` e `sizes`. L'originale resta per la vista ingrandita.
// La stessa convenzione vale per entrambe le istanze (la preparazione e il rilascio servono gli stessi file statici): nel rilascio
// il database è in sola lettura e non potrebbe generare nulla a richiesta, la build sì.
// ============================================================

/** Le famiglie di `public/asset/` che hanno le varianti: le uniche con file da centinaia di KB. */
export const FAMIGLIE_ASSET_CON_MINIATURE = ['persona', 'arcani'] as const;

/** Le larghezze delle varianti degli asset statici, in pixel (gli originali sono larghi 256 o 768). */
export const LARGHEZZE_MINIATURA_ASSET = [160, 320, 640] as const;

/** Una larghezza ammessa per le varianti degli asset statici. */
export type LarghezzaMiniaturaAsset = (typeof LARGHEZZE_MINIATURA_ASSET)[number];

/** La qualità WebP delle varianti (la stessa delle miniature del database). */
export const QUALITA_MINIATURA_ASSET = 80;

/** `/asset/<famiglia>/<percorso>.<png|jpg|jpeg|webp>`, con una eventuale query che si ignora (il percorso resta codificato come nel manifesto). */
const RE_ASSET_CON_MINIATURE = new RegExp(`^/asset/((?:${FAMIGLIE_ASSET_CON_MINIATURE.join('|')})/[^?#]+)\\.(?:png|jpe?g|webp)(?:[?#].*)?$`, 'i');

/** La parte dell'URL fra `/asset/` e l'estensione (`persona/jack-frost`), o null se l'URL non è di una famiglia con varianti. */
export function percorsoAssetConMiniature(url: string): string | null {
  return RE_ASSET_CON_MINIATURE.exec(url)?.[1] ?? null;
}

/** L'URL della variante larga `l` di un asset statico del compendio, o null se l'asset non ne ha. */
export function urlMiniaturaAsset(url: string, l: LarghezzaMiniaturaAsset): string | null {
  const percorso = percorsoAssetConMiniature(url);
  return percorso === null ? null : `/asset/mini/${l}/${percorso}.webp`;
}

/** Gli attributi di un `<img>` che mostra un'immagine in piccolo: la sorgente di riserva e, se ci sono varianti, `srcset` e `sizes`. */
export interface AttributiMiniatura { src: string; srcSet?: string; sizes?: string }

/**
 * Gli attributi per mostrare `url` in un riquadro largo `dimensione` pixel CSS: per un asset statico del compendio le varianti WebP
 * della build, per un'immagine del database le miniature del server (stesse larghezze di tutte le altre viste), per ogni altro URL
 * (`blob:`, `data:`, famiglie senza varianti, indirizzi esterni) niente: `src` resta l'URL e il comportamento è quello di prima.
 * `sizes` è la larghezza del riquadro, così il browser prende la variante per la sua densità (160 per 1x, 320 per 2x, 640 per 3x).
 * `src` (usato solo da chi non capisce `srcset`) è la variante che copre il riquadro a densità doppia.
 */
export function attributiMiniatura(url: string, dimensione: number): AttributiMiniatura {
  const sizes = `${Math.max(1, Math.round(dimensione))}px`;
  if (percorsoAssetConMiniature(url) !== null) {
    const srcSet = LARGHEZZE_MINIATURA_ASSET.map((l) => `${urlMiniaturaAsset(url, l)} ${l}w`).join(', ');
    const adatta = LARGHEZZE_MINIATURA_ASSET.find((l) => l >= dimensione * 2) ?? LARGHEZZE_MINIATURA_ASSET[LARGHEZZE_MINIATURA_ASSET.length - 1];
    return { src: urlMiniaturaAsset(url, adatta)!, srcSet, sizes };
  }
  // un riquadro oltre i 320 px sta meglio con la 1024 del database; sotto, bastano le prime tre
  const larghezze = dimensione > 320 ? LARGHEZZE_MINIATURA : LARGHEZZE_MINIATURA.filter((l) => l <= 640);
  const srcSet = srcsetMiniature(url, larghezze);
  if (!srcSet) return { src: url };
  const adatta = larghezze.find((l) => l >= dimensione * 2) ?? larghezze[larghezze.length - 1];
  return { src: urlMiniatura(url, adatta), srcSet, sizes };
}
