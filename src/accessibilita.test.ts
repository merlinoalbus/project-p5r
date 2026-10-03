// ============================================================
// Test strutturale — nessun elemento generico con un nome accessibile senza ruolo (A7, verifica completa 2026-10-03)
// ============================================================
//
// `aria-label` su un `div` o uno `span` senza `role` non viene letto dai lettori di schermo (il ruolo generico non può avere
// un nome): l'etichetta sembra esserci e non c'è. Un contenitore di controlli prende `role="group"`, un segno da solo
// (✓, ◆, un chip con icona) `role="img"`. Il test legge i sorgenti, anche con gli attributi su più righe.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';

const GENERICI = /<(div|span|p|strong|em|small|b|i)\b/g;

function* sorgenti(dir: string): Generator<string> {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) yield* sorgenti(p);
    else if (p.endsWith('.tsx') && !p.includes('.test.')) yield p;
  }
}

/** Il tag di apertura che comincia in `i`, saltando le graffe delle espressioni e le frecce `=>`. */
function tagDa(s: string, i: number): string {
  let profondita = 0;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (c === '{') profondita++;
    else if (c === '}') profondita--;
    else if (c === '>' && profondita === 0 && s[j - 1] !== '=') return s.slice(i, j + 1);
  }
  return '';
}

describe('accessibilità dei sorgenti', () => {
  it('nessun div/span/p con aria-label senza role', () => {
    const trovati: string[] = [];
    for (const file of sorgenti(path.resolve(__dirname))) {
      const s = fs.readFileSync(file, 'utf8');
      for (const m of s.matchAll(GENERICI)) {
        const tag = tagDa(s, m.index);
        if (/\baria-label=/.test(tag) && !/\brole=/.test(tag)) trovati.push(`${path.relative(process.cwd(), file)}:${s.slice(0, m.index).split('\n').length} <${m[1]}>`);
      }
    }
    expect(trovati).toEqual([]);
  });
});
