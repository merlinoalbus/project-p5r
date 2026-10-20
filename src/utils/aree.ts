// ============================================================
// aree — piccole regole delle Aree del mondo condivise dalle finestre e dalle pagine (L2, 2026-10-20)
// ============================================================

import type { PlanimetriaAreaDto } from '../types';

/** I formati ammessi per l'immagine di una planimetria e il limite del server (8 MB). */
export const FORMATI_PLANIMETRIA = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const MASSIMO_PLANIMETRIA = 8 * 1024 * 1024;

/** Perché un file non va bene come planimetria, o null se va bene. Il server resta il giudice (400 `formato-non-ammesso`,
 *  `immagine-troppo-grande`): il controllo qui risparmia un caricamento lungo da telefono che verrebbe rifiutato. */
export function erroreImmagine(file: File): string | null {
  if (!(FORMATI_PLANIMETRIA as readonly string[]).includes(file.type)) return 'Serve un’immagine PNG, JPEG o WEBP.';
  if (file.size > MASSIMO_PLANIMETRIA) return `L’immagine pesa ${(file.size / 1024 / 1024).toFixed(1)} MB: il massimo è 8 MB.`;
  return null;
}

/** Una mappa del mondo che sta in una pagina della città: Tokyo, un quartiere o una planimetria di un'Area della città o di un
 *  quartiere (la sua casa la calcola il server: `/guida/citta…`). Nell'editor non si creano mappe sciolte dentro di lei (R2-27). */
export function eMappaDelMondo(mappa: { casa: string }): boolean {
  return mappa.casa === '/guida/citta' || mappa.casa.startsWith('/guida/citta/');
}

/** Una mappa con una pagina sua che non è il visore: del mondo (`/guida/citta…`) o, da L3, di un Palazzo (la scheda, `/guida/dungeon/…`:
 *  la radice, o una planimetria nella pagina della sua area con la versione). Lì si va dritti, senza passare dal redirect (AP3-4). */
export function haCasaPropria(mappa: { casa: string }): boolean {
  return eMappaDelMondo(mappa) || mappa.casa.startsWith('/guida/dungeon/');
}

/** La pagina da cui si aggiungono aree e planimetrie accanto a una mappa del mondo (L2, `modifiche.md` §4.6, EditorMappaPage): il
 *  quartiere dell'Area (con «Aggiungi area», e da lì l'Area con «Aggiungi planimetria»); per un'Area della città, che un quartiere
 *  non ce l'ha, la sua pagina («Aggiungi planimetria»); per Tokyo la città, da cui si sceglie il quartiere; per un quartiere la sua
 *  pagina. Null fuori dal mondo. */
export function paginaPerAggiungere(mappa: { casa: string; tipo: string; area?: { casa: string; contenitore: { tipo: string; chiave: string } } | null }): { href: string; testo: string } | null {
  if (!eMappaDelMondo(mappa)) return null;
  const area = mappa.area;
  if (area?.contenitore.tipo === 'quartiere') return { href: `/guida/citta/${encodeURIComponent(area.contenitore.chiave)}`, testo: 'Aggiungi area / planimetria dalla pagina del quartiere' };
  if (area) return { href: area.casa, testo: 'Aggiungi planimetria dalla pagina dell’area' };
  if (mappa.tipo === 'citta') return { href: mappa.casa, testo: 'Aggiungi area / planimetria dalla pagina del quartiere (scegli il quartiere nella città)' };
  return { href: mappa.casa, testo: 'Aggiungi area / planimetria dalla pagina del quartiere' };
}

/** Il nome di una versione: la sua etichetta o, se manca, «Planimetria N» (N da 1, nell'ordine dell'Area). */
export function nomeVersione(p: Pick<PlanimetriaAreaDto, 'etichetta'>, indice: number): string {
  return p.etichetta?.trim() || `Planimetria ${indice + 1}`;
}
