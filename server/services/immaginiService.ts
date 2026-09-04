// ============================================================
// immaginiService — immagini caricate dall'utente (arcani, Confidenti, Persona…)
// ============================================================
//
// I file vivono in DATA_DIR/immagini/<ambito>/<nome-file>; il DB tiene i
// metadati (tabella `immagine`, UNIQUE per ambito+chiave: una sola immagine
// per entità, il caricamento successivo sostituisce). Formati ammessi:
// PNG, JPEG, WEBP, GIF, SVG; dimensione massima 8 MB.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import type { ImmagineDto } from '../../shared/types.js';

/** Ambiti ammessi per le immagini. */
export const AMBITI_IMMAGINE = ['arcana', 'confidente', 'personaggio', 'persona', 'skill', 'mappa', 'spillo', 'altro'] as const;
export type AmbitoImmagine = (typeof AMBITI_IMMAGINE)[number];

const ESTENSIONE_PER_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

/** Dimensione massima accettata (byte). */
export const MAX_BYTE_IMMAGINE = 8 * 1024 * 1024;

interface RigaImmagine { id: number; ambito: string; chiave: string; nome_file: string; mime: string; byte: number; created_at: string; origine_url: string | null }

function dirImmagini(ambito: string): string {
  return path.join(config.dataDir, 'immagini', ambito);
}

function dto(r: RigaImmagine): ImmagineDto {
  return { id: r.id, ambito: r.ambito, chiave: r.chiave, mime: r.mime, byte: r.byte, url: `/api/immagini/${encodeURIComponent(r.ambito)}/${encodeURIComponent(r.chiave)}/file`, createdAt: r.created_at, origineUrl: r.origine_url ?? null };
}

/** Elenco delle immagini, opzionalmente per ambito. */
export function elencaImmagini(ambito?: string): ImmagineDto[] {
  const righe = ambito
    ? (prepared('SELECT * FROM immagine WHERE ambito = ? ORDER BY chiave').all(ambito) as RigaImmagine[])
    : (prepared('SELECT * FROM immagine ORDER BY ambito, chiave').all() as RigaImmagine[]);
  return righe.map(dto);
}

/** Metadati di una immagine, o null. */
export function leggiImmagine(ambito: string, chiave: string): ImmagineDto | null {
  const r = prepared('SELECT * FROM immagine WHERE ambito = ? AND chiave = ?').get(ambito, chiave) as RigaImmagine | undefined;
  return r ? dto(r) : null;
}

/** Percorso su disco e mime del file di una immagine (per l'invio). */
export function fileImmagine(ambito: string, chiave: string): { percorso: string; mime: string } {
  const r = prepared('SELECT * FROM immagine WHERE ambito = ? AND chiave = ?').get(ambito, chiave) as RigaImmagine | undefined;
  if (!r) throw httpErrors.notFound('immagine-non-trovata', `Nessuna immagine per ${ambito}/${chiave}.`);
  const percorso = path.join(dirImmagini(r.ambito), r.nome_file);
  if (!fs.existsSync(percorso)) throw httpErrors.notFound('immagine-file-mancante', `Il file dell'immagine ${ambito}/${chiave} non è più sul disco.`);
  return { percorso, mime: r.mime };
}

/** Salva (o sostituisce) l'immagine di un'entità; `origineUrl` è l'indirizzo da cui è stata scaricata (null per i file caricati). */
export function salvaImmagine(ambito: AmbitoImmagine, chiave: string, mime: string, contenuto: Buffer, origineUrl: string | null = null): ImmagineDto {
  const estensione = ESTENSIONE_PER_MIME[mime];
  if (!estensione) throw httpErrors.badRequest('formato-non-ammesso', `Formato '${mime}' non ammesso: usa PNG, JPEG, WEBP, GIF o SVG.`);
  if (contenuto.length === 0) throw httpErrors.badRequest('immagine-vuota', 'Il contenuto dell\'immagine è vuoto.');
  if (contenuto.length > MAX_BYTE_IMMAGINE) throw httpErrors.badRequest('immagine-troppo-grande', `L'immagine supera ${MAX_BYTE_IMMAGINE / 1024 / 1024} MB.`);
  const dir = dirImmagini(ambito);
  fs.mkdirSync(dir, { recursive: true });
  const nomeFile = `${randomUUID()}.${estensione}`;
  const percorsoNuovo = path.join(dir, nomeFile);
  fs.writeFileSync(percorsoNuovo, contenuto);
  const precedente = prepared('SELECT * FROM immagine WHERE ambito = ? AND chiave = ?').get(ambito, chiave) as RigaImmagine | undefined;
  try {
    getDb().transaction(() => {
      prepared(`INSERT INTO immagine (ambito, chiave, nome_file, mime, byte, created_at, origine_url) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(ambito, chiave) DO UPDATE SET nome_file = excluded.nome_file, mime = excluded.mime, byte = excluded.byte, created_at = excluded.created_at, origine_url = excluded.origine_url`)
        .run(ambito, chiave, nomeFile, mime, contenuto.length, nowIso(), origineUrl);
    })();
  } catch (err) {
    // Il DB ha rifiutato la riga: nessun file orfano sul disco.
    fs.rmSync(percorsoNuovo, { force: true });
    throw err;
  }
  if (precedente && precedente.nome_file !== nomeFile) {
    fs.rmSync(path.join(dirImmagini(precedente.ambito), precedente.nome_file), { force: true });
  }
  return leggiImmagine(ambito, chiave)!;
}

/** Scarica un'immagine da un URL indicato dall'utente e la salva. */
export async function importaImmagineDaUrl(ambito: AmbitoImmagine, chiave: string, url: string): Promise<ImmagineDto> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw httpErrors.badRequest('url-non-valido', 'L\'URL indicato non è valido.');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw httpErrors.badRequest('url-non-valido', 'Sono ammessi solo URL http/https.');
  let res: Response;
  try {
    res = await fetch(u, {
      signal: AbortSignal.timeout(20_000),
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ProjectP5R/1.0; +https://github.com/merlinoalbus/project-p5r)', Accept: 'image/*,*/*;q=0.8' },
    });
  } catch (err) {
    throw httpErrors.badRequest('download-fallito', `Impossibile scaricare l'immagine: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!res.ok) throw httpErrors.badRequest('download-fallito', `Il server remoto ha risposto ${res.status}.`);
  const mime = (res.headers.get('content-type') ?? '').split(';')[0].trim();
  const contenuto = Buffer.from(await res.arrayBuffer());
  return salvaImmagine(ambito, chiave, mime, contenuto, u.toString());
}

/** Rimuove tutte le immagini caricate di un ambito (o di tutta l'istanza): file e righe; restituisce quante erano. */
export function eliminaImmaginiAmbito(ambito?: string): number {
  const righe = (ambito
    ? prepared('SELECT * FROM immagine WHERE ambito = ?').all(ambito)
    : prepared('SELECT * FROM immagine').all()) as RigaImmagine[];
  getDb().transaction(() => {
    for (const r of righe) prepared('DELETE FROM immagine WHERE id = ?').run(r.id);
  })();
  for (const r of righe) fs.rmSync(path.join(dirImmagini(r.ambito), r.nome_file), { force: true });
  return righe.length;
}

export function eliminaImmagine(ambito: string, chiave: string): void {
  const r = prepared('SELECT * FROM immagine WHERE ambito = ? AND chiave = ?').get(ambito, chiave) as RigaImmagine | undefined;
  if (!r) throw httpErrors.notFound('immagine-non-trovata', `Nessuna immagine per ${ambito}/${chiave}.`);
  prepared('DELETE FROM immagine WHERE id = ?').run(r.id);
  fs.rmSync(path.join(dirImmagini(r.ambito), r.nome_file), { force: true });
}
