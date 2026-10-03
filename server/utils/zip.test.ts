// ============================================================
// Test zip — scrittura «store» a flusso con CRC-32 standard, indice letto dalla coda, estrazione verificata
// ============================================================

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { crc32, estraiVoce, leggiIndiceZip, scriviZip } from './zip.js';

let dir = '';
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p5r-zip-')); });
afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

async function estraiTesto(zip: string, nome: string): Promise<Buffer> {
  const voce = (await leggiIndiceZip(zip)).find((v) => v.nome === nome)!;
  const fuori = path.join(dir, `estratto-${Math.random().toString(36).slice(2)}`);
  await estraiVoce(zip, voce, fuori);
  return fs.readFileSync(fuori);
}

describe('zip', () => {
  it('calcola il CRC-32 standard', () => {
    expect(crc32(Buffer.from('123456789')).toString(16)).toBe('cbf43926');
    expect(crc32(Buffer.alloc(0))).toBe(0);
  });

  it('crea un archivio rileggibile con nomi UTF-8, contenuti in memoria e file letti a flusso', async () => {
    const binario = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1, 2, 3, 255, 254]);
    // un file più grande di un pezzo di lettura (64 KiB): il CRC va calcolato su tutti i pezzi
    const grande = Buffer.alloc(200_000);
    for (let i = 0; i < grande.length; i++) grande[i] = (i * 7919) % 251;
    const fileGrande = path.join(dir, 'grande.bin');
    fs.writeFileSync(fileGrande, grande);
    const zip = path.join(dir, 'prova.zip');
    await scriviZip(zip, [
      { nome: 'dati/città-prova.json', contenuto: Buffer.from('{"versione":1,"mappe":[]}', 'utf-8'), data: new Date(2026, 8, 4, 12, 30, 10) },
      { nome: 'immagini/prova.png', contenuto: binario },
      { nome: 'database/grande.bin', file: fileGrande },
      { nome: 'vuoto.txt', contenuto: Buffer.alloc(0) },
    ]);
    const b = fs.readFileSync(zip);
    expect(b.readUInt32LE(0)).toBe(0x04034b50);
    expect(b.readUInt32LE(b.length - 22)).toBe(0x06054b50);
    const indice = await leggiIndiceZip(zip);
    expect(indice.map((v) => v.nome)).toEqual(['dati/città-prova.json', 'immagini/prova.png', 'database/grande.bin', 'vuoto.txt']);
    expect((await estraiTesto(zip, 'dati/città-prova.json')).toString('utf-8')).toBe('{"versione":1,"mappe":[]}');
    expect(Buffer.compare(await estraiTesto(zip, 'immagini/prova.png'), binario)).toBe(0);
    expect(Buffer.compare(await estraiTesto(zip, 'database/grande.bin'), grande)).toBe(0);
    expect((await estraiTesto(zip, 'vuoto.txt')).length).toBe(0);
    // il CRC della voce letta a flusso è scritto anche nell'intestazione locale, non solo nella central directory
    const grandeIndice = indice.find((v) => v.nome === 'database/grande.bin')!;
    expect(grandeIndice.crc).toBe(crc32(grande));
    const inizioLocale = grandeIndice.inizio - 30 - Buffer.byteLength('database/grande.bin');
    expect(b.readUInt32LE(inizioLocale + 14)).toBe(crc32(grande));
  });

  it('rifiuta un archivio non valido o troncato', async () => {
    const finto = path.join(dir, 'finto.zip');
    fs.writeFileSync(finto, 'non è uno zip');
    await expect(leggiIndiceZip(finto)).rejects.toThrow();
    const zip = path.join(dir, 'vero.zip');
    await scriviZip(zip, [{ nome: 'a.txt', contenuto: Buffer.from('abc') }]);
    const troncato = path.join(dir, 'troncato.zip');
    fs.writeFileSync(troncato, fs.readFileSync(zip).subarray(0, 40));
    await expect(leggiIndiceZip(troncato)).rejects.toThrow();
  });

  it('un contenuto alterato non si estrae (CRC diverso) e non lascia un file a metà', async () => {
    const zip = path.join(dir, 'prova.zip');
    await scriviZip(zip, [{ nome: 'a.txt', contenuto: Buffer.from('contenuto originale') }]);
    const voce = (await leggiIndiceZip(zip))[0];
    const b = fs.readFileSync(zip);
    b[voce.inizio] ^= 0xff;
    fs.writeFileSync(zip, b);
    const fuori = path.join(dir, 'a.txt');
    await expect(estraiVoce(zip, voce, fuori)).rejects.toThrow(/CRC/);
    expect(fs.existsSync(fuori)).toBe(false);
  });

  it('se una voce non si può leggere, l’archivio parziale viene tolto', async () => {
    const zip = path.join(dir, 'prova.zip');
    await expect(scriviZip(zip, [{ nome: 'a.txt', contenuto: Buffer.from('a') }, { nome: 'manca.bin', file: path.join(dir, 'non-esiste.bin') }])).rejects.toThrow();
    expect(fs.existsSync(zip)).toBe(false);
  });
});
