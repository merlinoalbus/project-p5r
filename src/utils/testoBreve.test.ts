// ============================================================
// Test testoBreve — date brevi della guida e sintesi senza tagli a metà parola
// ============================================================

import { dataBreve, sintesi } from './testoBreve';

describe('dataBreve', () => {
  it('tiene la prima parte della data descrittiva', () => {
    expect(dataBreve('12 Aprile (Martedì) — prima infiltrazione esplorativa nel Palazzo')).toBe('12 Aprile');
    expect(dataBreve('2 maggio (ultimo giorno utile; la guida consiglia il furto il 22 aprile)')).toBe('2 maggio');
    expect(dataBreve('22 Aprile (Venerdì 4/22) — giorno in cui…')).toBe('22 Aprile');
    expect(dataBreve('24 dicembre (sabato), tramite l\'Area 14')).toBe('24 dicembre');
  });

  it('accorcia i testi lunghi senza spezzare le parole', () => {
    const breve = dataBreve('Nella tabella di marcia ottimizzata della guida il furto avviene il 15 dicembre');
    expect(breve.endsWith('…')).toBe(true);
    expect(breve).toBe('Nella tabella di marcia…');
  });
});

describe('sintesi', () => {
  it('non taglia mai a metà parola', () => {
    const s = sintesi('parola '.repeat(30).trim(), 50);
    expect(s.endsWith('…')).toBe(true);
    expect(s.slice(0, -1).trim().split(' ').every((p) => p === 'parola')).toBe(true);
  });
});
