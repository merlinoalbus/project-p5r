// ============================================================
// Un solo elenco chiuso in tutta l'app: nessuna <select> nativa nei sorgenti del frontend
// ============================================================
//
// La regola ESLint lo vieta, ma il lint del frontend non è un cancello obbligatorio: questo test
// lo è. Scandisce `src/**/*.tsx` (test esclusi) e pretende zero tendine native.
// ============================================================

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function sorgenti(cartella: string, raccolti: string[] = []): string[] {
  for (const voce of readdirSync(cartella)) {
    const percorso = join(cartella, voce);
    if (statSync(percorso).isDirectory()) sorgenti(percorso, raccolti);
    else if (percorso.endsWith('.tsx') && !percorso.endsWith('.test.tsx')) raccolti.push(percorso);
  }
  return raccolti;
}

describe('selettori unificati', () => {
  it('nessun file del frontend usa una <select> nativa', () => {
    const colpevoli = sorgenti(join(__dirname)).filter((f) => /<select[\s>]/.test(readFileSync(f, 'utf8')));
    expect(colpevoli).toEqual([]);
  });
});
