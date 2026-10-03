// ============================================================
// Test strutturale — gli aggiornamenti locali di `useCarica` partono dai dati correnti (B3", verifica completa 2026-10-03)
// ============================================================
//
// Dopo un `await`, i dati di `useCarica` letti nel render (`lista.dati`, `dati`, una `d = dati.dati`) sono quelli di prima: un
// secondo gesto completato nel frattempo verrebbe cancellato. Gli aggiornamenti locali usano la forma con funzione,
// `imposta((correnti) => …)`. Il test legge i sorgenti e rifiuta le forme che costruiscono il nuovo valore dai dati del render:
// `imposta(x.dati…)`, `imposta((x.dati ?? [])…)`, `imposta(dati.map/filter…)`, `imposta([nuovo, ...(dati ?? [])])` e
// `imposta({ ...d, … })`. Ogni caso è anche coperto da un test di componente con due gesti ravvicinati.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';

const VIETATI: Array<{ nome: string; re: RegExp }> = [
  { nome: 'imposta((x.dati ?? [])…) o imposta((dati ?? [])…)', re: /\bimposta\(\((?:\w+\.)?dati\b/ },
  { nome: 'imposta(x.dati…) o imposta(dati.map/filter…)', re: /\bimposta\((?:\w+\.dati|dati)\b(?!\s*\))/ },
  { nome: 'imposta([nuovo, ...(dati ?? [])])', re: /\bimposta\(\[[^\]]*\.\.\.\(?(?:\w+\.)?dati\b/ },
  { nome: 'imposta({ ...d, … }) con d presa dal render', re: /\bimposta\(\{\s*\.\.\.[A-Za-z_]\w*\s*[,}]/ },
];

function* sorgenti(dir: string): Generator<string> {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) yield* sorgenti(p);
    else if (/\.tsx?$/.test(p) && !p.includes('.test.')) yield p;
  }
}

describe('aggiornamenti locali di useCarica', () => {
  it('nessun aggiornamento costruito dai dati del render', () => {
    const trovati: string[] = [];
    for (const file of sorgenti(path.resolve(__dirname))) {
      const righe = fs.readFileSync(file, 'utf8').split('\n');
      righe.forEach((riga, i) => {
        for (const v of VIETATI) if (v.re.test(riga)) trovati.push(`${path.relative(process.cwd(), file)}:${i + 1} — ${v.nome}`);
      });
    }
    expect(trovati).toEqual([]);
  });
});
