// ============================================================
// Font Store — font dell'utente per i ruoli tipografici e regole @font-face generate
// ============================================================
//
// I token CSS (`--font-display`, `--font-menu`, `--font-decor` in tailwind.css) elencano per primi i nomi
// di famiglia "P5R Display" / "P5R Menu" / "P5R Decor": esistono solo se l'utente ha caricato un file per
// quel ruolo nella propria istanza (Impostazioni → Caratteri). Questo store legge lo stato da /api/font e
// scrive le regole `@font-face` in un <style> del documento; senza file caricati le regole non esistono e
// il browser usa i font predefiniti liberi inclusi nell'app (Anton, Bebas Neue, Special Elite, Inter).
// ============================================================

import { create } from 'zustand';
import { getFont } from '../services/api/font';
import { API_BASE_URL } from '../utils/constants';
import type { FontDto, FormatoFont, RuoloFont } from '../types';

/** Nome di famiglia CSS per ogni ruolo (deve coincidere con i token in tailwind.css). */
export const FAMIGLIA_FONT: Record<RuoloFont, string> = { display: 'P5R Display', menu: 'P5R Menu', decor: 'P5R Decor' };

const FORMATO_CSS: Record<FormatoFont, string> = { ttf: 'truetype', otf: 'opentype', woff: 'woff', woff2: 'woff2' };
const ID_STYLE = 'p5r-font-utente';

/** Regole @font-face per i ruoli con un file caricato (la data di aggiornamento nel querystring invalida la cache). */
export function regoleFontFace(elenco: FontDto[]): string {
  return elenco
    .filter((f) => f.presente && f.formato && f.url)
    .map((f) => {
      const url = `${API_BASE_URL}/font/${encodeURIComponent(f.ruolo)}/file?v=${encodeURIComponent(f.aggiornato ?? '')}`;
      return `@font-face { font-family: "${FAMIGLIA_FONT[f.ruolo]}"; src: url("${url}") format("${FORMATO_CSS[f.formato as FormatoFont]}"); font-display: swap; }`;
    })
    .join('\n');
}

function applicaFontFace(elenco: FontDto[]): void {
  if (typeof document === 'undefined') return;
  let style = document.getElementById(ID_STYLE) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = ID_STYLE;
    document.head.appendChild(style);
  }
  style.textContent = regoleFontFace(elenco);
}

interface FontState {
  elenco: FontDto[] | null;
  caricato: boolean;
  /** Legge lo stato dei ruoli dal backend e applica le regole @font-face. */
  carica: () => Promise<void>;
  /** Aggiorna un ruolo dopo un caricamento o una rimozione e riapplica le regole. */
  aggiorna: (font: FontDto) => void;
}

const RUOLI: RuoloFont[] = ['display', 'menu', 'decor'];
const assente = (ruolo: RuoloFont): FontDto => ({ ruolo, presente: false, formato: null, byte: 0, aggiornato: null, url: null });

/** Stato dei font dell'utente, caricato una volta all'avvio. */
export const useFontStore = create<FontState>((set, get) => ({
  elenco: null,
  caricato: false,
  carica: async () => {
    try {
      const elenco = await getFont();
      set({ elenco, caricato: true });
      applicaFontFace(elenco);
    } catch {
      // Backend non raggiungibile o rotta assente: restano i font predefiniti.
      set({ elenco: RUOLI.map(assente), caricato: true });
    }
  },
  aggiorna: (font) => {
    const base = get().elenco ?? RUOLI.map(assente);
    const elenco = base.map((f) => (f.ruolo === font.ruolo ? font : f));
    set({ elenco });
    applicaFontFace(elenco);
  },
}));
