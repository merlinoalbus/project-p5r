// ============================================================
// Test di guardia — aree che scorrono dentro la pagina (richiesta dell'utente, 2026-09-29)
// ============================================================
//
// «Quando gestisci gli scrollbar dentro altri scrollbar devi accertarti che l'area in cui viene applicato lo scrollbar
// sia ben chiara... da evitare scroll di più barre insieme.» La regola vive in due utility (`area-scorrevole`,
// `area-scorrevole-x`, src/tailwind.css): confine visibile, barra d'accento, `overscroll-behavior: contain`. Questo test
// impedisce che uno scorrimento nuovo nasca senza: nei componenti le classi `overflow-*-auto/scroll` di Tailwind non si
// usano (tranne l'area di lettura principale, che è la pagina stessa), e nel foglio di stile ogni regola che fa scorrere
// qualcosa dichiara anche `overscroll-behavior`.
// ============================================================

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const RADICE = join(__dirname, '..');

/** I percorsi dei file `.ts`/`.tsx` sotto `cartella`, ricorsivamente, esclusi i test. */
function fileTsx(cartella: string): string[] {
  return readdirSync(cartella).flatMap((nome) => {
    const p = join(cartella, nome);
    if (statSync(p).isDirectory()) return fileTsx(p);
    return /\.tsx?$/.test(nome) && !/\.test\.tsx?$/.test(nome) ? [p] : [];
  });
}

/** Tre modi di far scorrere un elemento dal codice: la classe di Tailwind (con o senza variante), la classe arbitraria
 *  (`[overflow-y:auto]`) e lo stile in linea (`overflowY: 'auto'`). Nessuno dei tre porta confine e contenimento. */
const SCORRIMENTI = [
  /(^|[\s"'`])(?:[a-z0-9]+:)*overflow(?:-[xy])?-(?:auto|scroll)(?=[\s"'`]|$)/,
  /\[overflow(?:-[xy])?:(?:auto|scroll)\]/,
  /overflow[XY]?\s*:\s*['"`](?:auto|scroll)['"`]/,
];

/** Le sole eccezioni: l'area di lettura principale scorre come pagina, non dentro un'altra. */
const PAGINA = new Set(['components/layout/MainLayout.tsx']);

describe('aree che scorrono dentro la pagina', () => {
  it('nel codice nessuno scorrimento con classi di Tailwind, classi arbitrarie o stili in linea: si usano area-scorrevole / area-scorrevole-x', () => {
    const trovati: string[] = [];
    for (const f of fileTsx(RADICE)) {
      const rel = relative(RADICE, f).replace(/\\/g, '/');
      if (PAGINA.has(rel)) continue;
      readFileSync(f, 'utf8').split('\n').forEach((riga, i) => { if (SCORRIMENTI.some((re) => re.test(riga))) trovati.push(`${rel}:${i + 1}`); });
    }
    expect(trovati).toEqual([]);
  });

  it('i tre riconoscitori prendono le forme che devono prendere, e non le altre', () => {
    /** Vero se almeno uno dei tre riconoscitori di `SCORRIMENTI` prende il testo `s`. */
    const preso = (s: string) => SCORRIMENTI.some((re) => re.test(s));
    expect(['className="md:overflow-y-auto x"', '"overflow-x-auto"', 'className="[overflow-y:auto]"', "style={{ maxHeight: 4, overflowY: 'auto' }}", 'style={{ overflow: "scroll" }}'].map(preso)).toEqual([true, true, true, true, true]);
    expect(['overflow-hidden', 'area-scorrevole', "overflowY: 'hidden'", 'md:area-scorrevole-x'].map(preso)).toEqual([false, false, false, false]);
  });

  it('l\'area di lettura principale è l\'unico scorrimento di pagina (e c\'è ancora)', () => {
    expect(readFileSync(join(RADICE, 'components/layout/MainLayout.tsx'), 'utf8')).toMatch(/<main className="[^"]*overflow-y-auto/);
  });

  it('nel foglio di stile ogni regola che fa scorrere un contenitore ne contiene anche il gesto (overscroll-behavior)', () => {
    const css = readFileSync(join(RADICE, 'tailwind.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    // blocchi foglia «selettore { dichiarazioni }»: le dichiarazioni non contengono graffe
    const blocchi = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
    const senza = blocchi
      .filter(([, , corpo]) => /overflow(?:-[xy])?\s*:\s*(?:auto|scroll)/.test(corpo) && !/overscroll-behavior/.test(corpo))
      .map(([, selettore]) => selettore.trim().split('\n').pop()!.trim());
    expect(senza).toEqual([]);
  });

  it('le due utility dichiarano confine, contenimento e barra', () => {
    const css = readFileSync(join(RADICE, 'tailwind.css'), 'utf8');
    const verticale = css.match(/@utility area-scorrevole \{([\s\S]*?)\n\}/)?.[1] ?? '';
    const orizzontale = css.match(/@utility area-scorrevole-x \{([\s\S]*?)\n\}/)?.[1] ?? '';
    expect(verticale).toMatch(/overscroll-behavior:\s*contain/);
    expect(verticale).toMatch(/border:\s*1px solid/);
    expect(verticale).toMatch(/scrollbar-color/);
    expect(orizzontale).toMatch(/overscroll-behavior-x:\s*contain/);
    expect(orizzontale).toMatch(/scrollbar-color/);
  });
});
