// @vitest-environment jsdom
// ============================================================
// Test fontStore — regole @font-face generate dai ruoli caricati e stile nel documento
// ============================================================

import { regoleFontFace, useFontStore } from './fontStore';
import type { FontDto } from '../types';

const presente = (ruolo: FontDto['ruolo'], formato: FontDto['formato']): FontDto => ({ ruolo, presente: true, formato, byte: 1000, aggiornato: '2026-09-04T05:00:00.000Z', url: `/api/font/${ruolo}/file` });
const assente = (ruolo: FontDto['ruolo']): FontDto => ({ ruolo, presente: false, formato: null, byte: 0, aggiornato: null, url: null });

describe('fontStore', () => {
  it('genera una regola per ogni ruolo presente con famiglia, formato e data anti-cache', () => {
    const css = regoleFontFace([presente('display', 'ttf'), assente('menu'), presente('decor', 'woff2')]);
    expect(css).toContain('font-family: "P5R Display"');
    expect(css).toContain('/api/font/display/file?v=2026-09-04T05%3A00%3A00.000Z');
    expect(css).toContain('format("truetype")');
    expect(css).toContain('unicode-range: U+0020-007E');
    expect(css).toContain('font-family: "P5R Decor"');
    expect(css).toContain('format("woff2")');
    expect(css).not.toContain('P5R Menu');
    expect(regoleFontFace([assente('display'), assente('menu'), assente('decor')])).toBe('');
  });

  it('aggiorna un ruolo e scrive le regole nello <style> del documento', () => {
    useFontStore.setState({ elenco: [assente('display'), assente('menu'), assente('decor')], caricato: true });
    useFontStore.getState().aggiorna(presente('menu', 'otf'));
    const style = document.getElementById('p5r-font-utente');
    expect(style?.textContent).toContain('"P5R Menu"');
    expect(style?.textContent).toContain('format("opentype")');
    useFontStore.getState().aggiorna(assente('menu'));
    expect(document.getElementById('p5r-font-utente')?.textContent).toBe('');
    expect(useFontStore.getState().elenco?.find((f) => f.ruolo === 'menu')?.presente).toBe(false);
  });
});
