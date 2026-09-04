// ============================================================
// Test zip — scrittura «store» con CRC-32 standard e rilettura delle voci
// ============================================================

import { crc32, creaZip, leggiZip } from './zip.js';

describe('zip', () => {
  it('calcola il CRC-32 standard e crea un archivio rileggibile con nomi UTF-8 e contenuti binari', () => {
    expect(crc32(Buffer.from('123456789')).toString(16)).toBe('cbf43926');
    expect(crc32(Buffer.alloc(0))).toBe(0);
    const binario = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1, 2, 3, 255, 254]);
    const zip = creaZip([
      { nome: 'data/seed/mappe/città-prova.json', contenuto: Buffer.from('{"versione":1,"mappe":[]}', 'utf-8'), data: new Date(2026, 8, 4, 12, 30, 10) },
      { nome: 'public/asset/mappe/prova.png', contenuto: binario },
    ]);
    expect(zip.readUInt32LE(0)).toBe(0x04034b50);
    expect(zip.readUInt32LE(zip.length - 22)).toBe(0x06054b50);
    const voci = leggiZip(zip);
    expect(voci.map((v) => v.nome)).toEqual(['data/seed/mappe/città-prova.json', 'public/asset/mappe/prova.png']);
    expect(voci[0].contenuto.toString('utf-8')).toBe('{"versione":1,"mappe":[]}');
    expect(Buffer.compare(voci[1].contenuto, binario)).toBe(0);
    // CRC della voce registrato nell'intestazione locale
    expect(zip.readUInt32LE(14)).toBe(crc32(voci[0].contenuto));
  });

  it('rifiuta un archivio non valido', () => {
    expect(() => leggiZip(Buffer.from('non è uno zip'))).toThrow();
  });
});
