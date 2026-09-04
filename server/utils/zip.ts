// ============================================================
// zip — scrittore ZIP minimo (metodo «store», nomi UTF-8) senza dipendenze: pacchetti per il repository delle mappe (Fase 13.3)
// ============================================================
//
// Formato PKZIP: per ogni voce un local file header + dati, poi la central directory e l'end of central directory record.
// Nessuna compressione (le immagini sono già compresse); CRC-32 calcolato con la tabella standard.
// ============================================================

const TABELLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(b: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = TABELLA_CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export interface VoceZip { nome: string; contenuto: Buffer; data?: Date }

function dataDos(d: Date): { ora: number; giorno: number } {
  const anno = Math.max(1980, d.getFullYear());
  return { ora: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2), giorno: ((anno - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() };
}

/** Crea un archivio ZIP (senza compressione) con le voci date; i nomi usano «/» come separatore. */
export function creaZip(voci: VoceZip[]): Buffer {
  const parti: Buffer[] = [];
  const centrale: Buffer[] = [];
  let offset = 0;
  for (const v of voci) {
    const nome = Buffer.from(v.nome.replace(/\\/g, '/'), 'utf-8');
    const { ora, giorno } = dataDos(v.data ?? new Date());
    const crc = crc32(v.contenuto);
    const locale = Buffer.alloc(30);
    locale.writeUInt32LE(0x04034b50, 0); locale.writeUInt16LE(20, 4); locale.writeUInt16LE(0x0800, 6); locale.writeUInt16LE(0, 8);
    locale.writeUInt16LE(ora, 10); locale.writeUInt16LE(giorno, 12); locale.writeUInt32LE(crc, 14);
    locale.writeUInt32LE(v.contenuto.length, 18); locale.writeUInt32LE(v.contenuto.length, 22); locale.writeUInt16LE(nome.length, 26); locale.writeUInt16LE(0, 28);
    parti.push(locale, nome, v.contenuto);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(0, 10);
    c.writeUInt16LE(ora, 12); c.writeUInt16LE(giorno, 14); c.writeUInt32LE(crc, 16); c.writeUInt32LE(v.contenuto.length, 20); c.writeUInt32LE(v.contenuto.length, 24);
    c.writeUInt16LE(nome.length, 28); c.writeUInt16LE(0, 30); c.writeUInt16LE(0, 32); c.writeUInt16LE(0, 34); c.writeUInt16LE(0, 36); c.writeUInt32LE(0, 38); c.writeUInt32LE(offset, 42);
    centrale.push(c, nome);
    offset += locale.length + nome.length + v.contenuto.length;
  }
  const dimensioneCentrale = centrale.reduce((n, b) => n + b.length, 0);
  const fine = Buffer.alloc(22);
  fine.writeUInt32LE(0x06054b50, 0); fine.writeUInt16LE(0, 4); fine.writeUInt16LE(0, 6); fine.writeUInt16LE(voci.length, 8); fine.writeUInt16LE(voci.length, 10);
  fine.writeUInt32LE(dimensioneCentrale, 12); fine.writeUInt32LE(offset, 16); fine.writeUInt16LE(0, 20);
  return Buffer.concat([...parti, ...centrale, fine]);
}

/** Legge le voci di un archivio creato da `creaZip` (o comunque «store»): usato dai test e dall'importazione. */
export function leggiZip(archivio: Buffer): VoceZip[] {
  const fineIdx = archivio.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (fineIdx < 0) throw new Error('archivio ZIP non valido');
  const numero = archivio.readUInt16LE(fineIdx + 10);
  let pos = archivio.readUInt32LE(fineIdx + 16);
  const voci: VoceZip[] = [];
  for (let i = 0; i < numero; i++) {
    if (archivio.readUInt32LE(pos) !== 0x02014b50) throw new Error('central directory non valida');
    const metodo = archivio.readUInt16LE(pos + 10);
    const dimensione = archivio.readUInt32LE(pos + 20);
    const lNome = archivio.readUInt16LE(pos + 28), lExtra = archivio.readUInt16LE(pos + 30), lComm = archivio.readUInt16LE(pos + 32);
    const offset = archivio.readUInt32LE(pos + 42);
    const nome = archivio.toString('utf-8', pos + 46, pos + 46 + lNome);
    if (metodo !== 0) throw new Error(`voce compressa non supportata: ${nome}`);
    const lNomeLoc = archivio.readUInt16LE(offset + 26), lExtraLoc = archivio.readUInt16LE(offset + 28);
    const inizio = offset + 30 + lNomeLoc + lExtraLoc;
    voci.push({ nome, contenuto: archivio.subarray(inizio, inizio + dimensione) });
    pos += 46 + lNome + lExtra + lComm;
  }
  return voci;
}
