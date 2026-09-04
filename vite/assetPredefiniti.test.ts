// ============================================================
// Test plugin asset predefiniti — scansione della cartella e chiavi canoniche
// ============================================================

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scansionaAsset } from './assetPredefiniti';

function creaAlbero(radice: string, file: string[]) {
  for (const f of file) {
    const pieno = path.join(radice, f);
    fs.mkdirSync(path.dirname(pieno), { recursive: true });
    fs.writeFileSync(pieno, 'x');
  }
}

describe('scansionaAsset', () => {
  let dir: string;
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p5r-asset-')); });
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  it('cartella assente o vuota → manifest vuoto (l\'app resta funzionante senza grafica)', () => {
    expect(scansionaAsset(path.join(dir, 'non-esiste'), '/asset', () => 'T')).toEqual({ generato: 'T', totale: 0, file: {} });
    expect(scansionaAsset(dir).totale).toBe(0);
  });

  it('mappa le chiavi in slug, ignora i file non immagine e preferisce webp a png', () => {
    creaAlbero(dir, [
      'arcani/fool.png', 'arcani/Fool.webp', 'arcani/icona/fool.png', 'arcani/fool-senza-testo.png',
      'persona/Jack Frost.png', "persona/Jack-o'-Lantern.webp", 'confidenti/ryuji.png',
      'README.md', 'ui/nav-home.PNG', 'ui/rango-max.svg', 'sfondi/pattern-nero.jpeg', 'appunti.txt',
    ]);
    const m = scansionaAsset(dir, '/asset', () => 'T');
    expect(m.totale).toBe(9);
    expect(m.file['arcani/fool']).toBe('/asset/arcani/Fool.webp');
    expect(m.file['arcani/icona/fool']).toBe('/asset/arcani/icona/fool.png');
    expect(m.file['arcani/fool-senza-testo']).toBe('/asset/arcani/fool-senza-testo.png');
    expect(m.file['persona/jack-frost']).toBe('/asset/persona/Jack%20Frost.png');
    expect(m.file['persona/jack-o-lantern']).toBe("/asset/persona/Jack-o'-Lantern.webp");
    expect(m.file['ui/nav-home']).toBe('/asset/ui/nav-home.PNG');
    expect(m.file['ui/rango-max']).toBe('/asset/ui/rango-max.svg');
    expect(m.file['sfondi/pattern-nero']).toBe('/asset/sfondi/pattern-nero.jpeg');
    expect(m.file['readme']).toBeUndefined();
    expect(m.file['appunti']).toBeUndefined();
  });
});
