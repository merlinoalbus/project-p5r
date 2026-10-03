// ============================================================
// zip — archivi ZIP «store» (senza compressione, nomi UTF-8) scritti e letti a flusso: la copia completa dell'istanza
// ============================================================
//
// Formato PKZIP: per ogni voce un local file header + dati, poi la central directory e l'end of central directory record.
// Nessuna compressione: il grosso dell'archivio è il database di gioco con le immagini, che sono già compresse.
//
// **Niente archivi in memoria.** La copia dell'istanza pesa ~300 MB: prima lo ZIP si costruiva come un unico Buffer (ogni file letto
// per intero, poi concatenato: due copie in memoria) con un CRC-32 calcolato in JavaScript byte per byte. Ora le voci passano dal
// disco al file dell'archivio a pezzi, il CRC lo calcola `zlib.crc32` mentre i dati scorrono, e la lettura parte dall'indice in coda
// al file: si estrae una voce alla volta, a flusso, senza caricare l'archivio (rilievi F19/P3' della verifica completa, 2026-10-03).
// ============================================================

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import zlib from 'node:zlib';

const FIRMA_LOCALE = 0x04034b50;
const FIRMA_CENTRALE = 0x02014b50;
const FIRMA_FINE = 0x06054b50;
/** Bit 11 dei flag: nome in UTF-8. */
const FLAG_UTF8 = 0x0800;
/** Limiti del formato senza ZIP64: dimensioni e posizioni su 32 bit, voci su 16. */
const MAX_32 = 0xffffffff;
const MAX_VOCI = 0xffff;

/** Una voce da scrivere: il contenuto in memoria (piccolo: manifesto, testi) oppure un file su disco, letto a flusso. */
export type VoceZip = { nome: string; data?: Date } & ({ contenuto: Buffer; file?: never } | { file: string; contenuto?: never });

/** Una voce dell'indice di un archivio: dove stanno i suoi dati e come verificarli. */
export interface VoceIndiceZip {
  nome: string;
  /** 0 = «store»; ogni altro metodo (compressione) non è supportato. */
  metodo: number;
  dimensione: number;
  crc: number;
  /** Posizione del primo byte dei dati nel file dell'archivio. */
  inizio: number;
}

/** CRC-32 standard (lo stesso dello ZIP) di un contenuto in memoria. */
export function crc32(b: Buffer): number {
  return zlib.crc32(b) >>> 0;
}

function dataDos(d: Date): { ora: number; giorno: number } {
  const anno = Math.max(1980, d.getFullYear());
  return { ora: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2), giorno: ((anno - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() };
}

function intestazioneLocale(nome: Buffer, ora: number, giorno: number, crc: number, dimensione: number): Buffer {
  const b = Buffer.alloc(30);
  b.writeUInt32LE(FIRMA_LOCALE, 0); b.writeUInt16LE(20, 4); b.writeUInt16LE(FLAG_UTF8, 6); b.writeUInt16LE(0, 8);
  b.writeUInt16LE(ora, 10); b.writeUInt16LE(giorno, 12); b.writeUInt32LE(crc, 14);
  b.writeUInt32LE(dimensione, 18); b.writeUInt32LE(dimensione, 22); b.writeUInt16LE(nome.length, 26); b.writeUInt16LE(0, 28);
  return b;
}

function intestazioneCentrale(nome: Buffer, ora: number, giorno: number, crc: number, dimensione: number, offsetLocale: number): Buffer {
  const b = Buffer.alloc(46);
  b.writeUInt32LE(FIRMA_CENTRALE, 0); b.writeUInt16LE(20, 4); b.writeUInt16LE(20, 6); b.writeUInt16LE(FLAG_UTF8, 8); b.writeUInt16LE(0, 10);
  b.writeUInt16LE(ora, 12); b.writeUInt16LE(giorno, 14); b.writeUInt32LE(crc, 16); b.writeUInt32LE(dimensione, 20); b.writeUInt32LE(dimensione, 24);
  b.writeUInt16LE(nome.length, 28); b.writeUInt16LE(0, 30); b.writeUInt16LE(0, 32); b.writeUInt16LE(0, 34); b.writeUInt16LE(0, 36); b.writeUInt32LE(0, 38);
  b.writeUInt32LE(offsetLocale, 42);
  return b;
}

/**
 * Scrive l'archivio in `destinazione`, una voce alla volta. I file delle voci si leggono a pezzi: in memoria c'è un pezzo, non il file.
 * Ogni scrittura è posizionale (la posizione la tiene questa funzione, non il puntatore del file), così il CRC di una voce si può
 * scrivere nella sua intestazione dopo averlo calcolato sui dati, in una sola lettura. Se qualcosa fallisce l'archivio parziale si
 * toglie.
 */
export async function scriviZip(destinazione: string, voci: readonly VoceZip[]): Promise<void> {
  if (voci.length > MAX_VOCI) throw new Error(`troppe voci per uno ZIP senza ZIP64: ${voci.length}`);
  const out = await fsp.open(destinazione, 'w');
  let posizione = 0;
  const scrivi = async (b: Buffer): Promise<void> => {
    for (let fatti = 0; fatti < b.length;) fatti += (await out.write(b, fatti, b.length - fatti, posizione + fatti)).bytesWritten;
    posizione += b.length;
  };
  try {
    const centrale: Buffer[] = [];
    for (const v of voci) {
      const nome = Buffer.from(v.nome.replace(/\\/g, '/'), 'utf-8');
      const { ora, giorno } = dataDos(v.data ?? new Date());
      const inizioLocale = posizione;
      if (inizioLocale > MAX_32) throw new Error('archivio oltre i 4 GiB: serve ZIP64');
      let crc = 0;
      let dimensione: number;
      if (v.file !== undefined) {
        dimensione = (await fsp.stat(v.file)).size;
        if (dimensione > MAX_32) throw new Error(`voce oltre i 4 GiB: ${v.nome}`);
        // il CRC si conosce solo alla fine dei dati: l'intestazione si scrive con 0 e si corregge dopo
        await scrivi(intestazioneLocale(nome, ora, giorno, 0, dimensione));
        await scrivi(nome);
        let letti = 0;
        for await (const pezzo of fs.createReadStream(v.file)) {
          const b = pezzo as Buffer;
          crc = zlib.crc32(b, crc);
          letti += b.length;
          await scrivi(b);
        }
        if (letti !== dimensione) throw new Error(`il file di «${v.nome}» è cambiato mentre si scriveva l'archivio`);
        const campo = Buffer.alloc(4);
        campo.writeUInt32LE(crc >>> 0, 0);
        await out.write(campo, 0, 4, inizioLocale + 14);
      } else {
        dimensione = v.contenuto.length;
        crc = zlib.crc32(v.contenuto);
        await scrivi(intestazioneLocale(nome, ora, giorno, crc >>> 0, dimensione));
        await scrivi(nome);
        await scrivi(v.contenuto);
      }
      centrale.push(intestazioneCentrale(nome, ora, giorno, crc >>> 0, dimensione, inizioLocale), nome);
    }
    const inizioCentrale = posizione;
    for (const b of centrale) await scrivi(b);
    const dimensioneCentrale = posizione - inizioCentrale;
    if (inizioCentrale > MAX_32) throw new Error('archivio oltre i 4 GiB: serve ZIP64');
    const fine = Buffer.alloc(22);
    fine.writeUInt32LE(FIRMA_FINE, 0); fine.writeUInt16LE(0, 4); fine.writeUInt16LE(0, 6); fine.writeUInt16LE(voci.length, 8); fine.writeUInt16LE(voci.length, 10);
    fine.writeUInt32LE(dimensioneCentrale, 12); fine.writeUInt32LE(inizioCentrale, 16); fine.writeUInt16LE(0, 20);
    await scrivi(fine);
    await out.close();
  } catch (err) {
    await out.close().catch(() => {});
    await fsp.rm(destinazione, { force: true });
    throw err;
  }
}

/** Legge esattamente `b.length` byte dalla posizione data, o fallisce: un archivio troncato non si legge a metà. */
async function leggiEsatti(fh: fsp.FileHandle, b: Buffer, posizione: number): Promise<void> {
  for (let letti = 0; letti < b.length;) {
    const { bytesRead } = await fh.read(b, letti, b.length - letti, posizione + letti);
    if (bytesRead === 0) throw new Error('archivio ZIP troncato');
    letti += bytesRead;
  }
}

/** L'indice di un archivio ZIP su disco: legge solo la coda (record di fine e central directory) e le intestazioni locali. */
export async function leggiIndiceZip(percorso: string): Promise<VoceIndiceZip[]> {
  const fh = await fsp.open(percorso, 'r');
  try {
    const { size } = await fh.stat();
    // il record di fine sta negli ultimi 22 byte più un eventuale commento (al più 65535)
    const coda = Buffer.alloc(Math.min(size, 22 + 0xffff));
    if (coda.length < 22) throw new Error('archivio ZIP non valido');
    await leggiEsatti(fh, coda, size - coda.length);
    const fine = coda.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    if (fine < 0 || fine + 22 > coda.length) throw new Error('archivio ZIP non valido');
    const numero = coda.readUInt16LE(fine + 10);
    const dimensioneCentrale = coda.readUInt32LE(fine + 12);
    const inizioCentrale = coda.readUInt32LE(fine + 16);
    if (inizioCentrale + dimensioneCentrale > size) throw new Error('central directory fuori dall\'archivio');
    const centrale = Buffer.alloc(dimensioneCentrale);
    await leggiEsatti(fh, centrale, inizioCentrale);
    const voci: VoceIndiceZip[] = [];
    const locale = Buffer.alloc(30);
    let pos = 0;
    for (let i = 0; i < numero; i++) {
      if (pos + 46 > centrale.length || centrale.readUInt32LE(pos) !== FIRMA_CENTRALE) throw new Error('central directory non valida');
      const metodo = centrale.readUInt16LE(pos + 10);
      const crc = centrale.readUInt32LE(pos + 16);
      const dimensione = centrale.readUInt32LE(pos + 20);
      const lNome = centrale.readUInt16LE(pos + 28), lExtra = centrale.readUInt16LE(pos + 30), lComm = centrale.readUInt16LE(pos + 32);
      const offset = centrale.readUInt32LE(pos + 42);
      const nome = centrale.toString('utf-8', pos + 46, pos + 46 + lNome);
      await leggiEsatti(fh, locale, offset);
      if (locale.readUInt32LE(0) !== FIRMA_LOCALE) throw new Error(`intestazione locale non valida: ${nome}`);
      const inizio = offset + 30 + locale.readUInt16LE(26) + locale.readUInt16LE(28);
      if (inizio + dimensione > size) throw new Error(`voce oltre la fine dell'archivio: ${nome}`);
      voci.push({ nome, metodo, dimensione, crc, inizio });
      pos += 46 + lNome + lExtra + lComm;
    }
    return voci;
  } finally {
    await fh.close();
  }
}

/** Estrae una voce in `destinazione`, a flusso, verificando il CRC: un archivio danneggiato non diventa un file buono a metà. */
export async function estraiVoce(percorso: string, voce: VoceIndiceZip, destinazione: string): Promise<void> {
  if (voce.metodo !== 0) throw new Error(`voce compressa non supportata: ${voce.nome}`);
  const out = await fsp.open(destinazione, 'w');
  try {
    let crc = 0;
    let posizione = 0;
    if (voce.dimensione > 0) {
      for await (const pezzo of fs.createReadStream(percorso, { start: voce.inizio, end: voce.inizio + voce.dimensione - 1 })) {
        const b = pezzo as Buffer;
        crc = zlib.crc32(b, crc);
        for (let fatti = 0; fatti < b.length;) fatti += (await out.write(b, fatti, b.length - fatti, posizione + fatti)).bytesWritten;
        posizione += b.length;
      }
    }
    if (posizione !== voce.dimensione) throw new Error(`voce troncata: ${voce.nome}`);
    if ((crc >>> 0) !== voce.crc) throw new Error(`voce danneggiata (CRC diverso): ${voce.nome}`);
    await out.close();
  } catch (err) {
    await out.close().catch(() => {});
    await fsp.rm(destinazione, { force: true });
    throw err;
  }
}
