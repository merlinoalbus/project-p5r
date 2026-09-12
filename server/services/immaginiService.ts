// ============================================================
// immaginiService — le immagini dell'istanza, dentro il database (tabella `immagine`)
// ============================================================
//
// Decisione dell'utente (2026-09-12, migrazione 079): il contenuto delle immagini sta nella colonna
// `contenuto` di `immagine`, non su disco. Due gruppi di ambiti (`shared/immagini.ts`):
// - caricamento (arcana, confidente, personaggio, persona, skill, mappa, spillo, altro): una sola
//   immagine per (ambito, chiave), il caricamento successivo sostituisce; precedenza sulla grafica
//   predefinita; è ciò che «Immagini caricate» elenca e rimuove;
// - predefiniti (mappe, confidenti, sfondi, illustrazioni…): la grafica di gioco che stava in
//   `public/asset/`, servita al frontend come manifesto (`manifestoPredefinite`) e per file.
// Formati ammessi: PNG, JPEG, WEBP, GIF, SVG; dimensione massima 8 MB.
// ============================================================

import { randomUUID } from 'node:crypto';
import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { AMBITI_CARICAMENTO, AMBITI_PREDEFINITI, type AmbitoImmagine } from '../../shared/immagini.js';
import type { ImmagineDto } from '../../shared/types.js';
import { idMappa } from './mappe/percorsiMappe.js';

export { AMBITI_CARICAMENTO, AMBITI_IMMAGINE, AMBITI_PREDEFINITI, type AmbitoImmagine } from '../../shared/immagini.js';

const ESTENSIONE_PER_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

/** Dimensione massima accettata (byte). */
export const MAX_BYTE_IMMAGINE = 8 * 1024 * 1024;

interface RigaImmagine { id: number; ambito: string; chiave: string; nome_file: string; mime: string; byte: number; created_at: string; origine_url: string | null; presente: number }
/** Le colonne senza il contenuto: gli elenchi non trasportano i byte. */
const COLONNE = 'id, ambito, chiave, nome_file, mime, byte, created_at, origine_url, (contenuto IS NOT NULL) AS presente';
const segnapostoCaricamento = AMBITI_CARICAMENTO.map(() => '?').join(', ');
const segnapostoPredefiniti = AMBITI_PREDEFINITI.map(() => '?').join(', ');

/** Chiave normalizzata: per le mappe l'identità della mappa (alias e chiavi native). */
function chiaveDi(ambito: string, chiave: string): string {
  return ambito === 'mappa' ? idMappa(chiave) : chiave;
}

export function urlFileImmagine(ambito: string, chiave: string): string {
  return `/api/immagini/${encodeURIComponent(ambito)}/${encodeURIComponent(chiave)}/file`;
}

function dto(r: RigaImmagine): ImmagineDto {
  return { id: r.id, ambito: r.ambito, chiave: r.chiave, mime: r.mime, byte: r.byte, url: urlFileImmagine(r.ambito, r.chiave), createdAt: r.created_at, origineUrl: r.origine_url ?? null };
}

/** Elenco delle immagini: di un ambito, oppure (senza ambito) di tutti gli ambiti di caricamento. */
export function elencaImmagini(ambito?: string): ImmagineDto[] {
  const righe = ambito
    ? (prepared(`SELECT ${COLONNE} FROM immagine WHERE ambito = ? ORDER BY chiave`).all(ambito) as RigaImmagine[])
    : (prepared(`SELECT ${COLONNE} FROM immagine WHERE ambito IN (${segnapostoCaricamento}) ORDER BY ambito, chiave`).all(...AMBITI_CARICAMENTO) as RigaImmagine[]);
  return righe.map(dto);
}

/** Il manifesto della grafica predefinita nel database: chiave del manifesto → URL del file versionato. */
export function manifestoPredefinite(): { generato: string; totale: number; file: Record<string, string> } {
  const righe = prepared(`SELECT ambito, chiave, created_at FROM immagine WHERE contenuto IS NOT NULL AND ambito IN (${segnapostoPredefiniti}) ORDER BY ambito, chiave`).all(...AMBITI_PREDEFINITI) as Array<{ ambito: string; chiave: string; created_at: string }>;
  const file: Record<string, string> = {};
  for (const r of righe) file[`${r.ambito}/${r.chiave}`] = `${urlFileImmagine(r.ambito, r.chiave)}?v=${encodeURIComponent(r.created_at)}`;
  return { generato: nowIso(), totale: righe.length, file };
}

/** Metadati di una immagine, o null. */
export function leggiImmagine(ambito: string, chiave: string): ImmagineDto | null {
  const r = prepared(`SELECT ${COLONNE} FROM immagine WHERE ambito = ? AND chiave = ?`).get(ambito, chiaveDi(ambito, chiave)) as RigaImmagine | undefined;
  return r ? dto(r) : null;
}

/** Contenuto e mime di una immagine (per l'invio); 404 se la riga manca o non ha contenuto. */
export function fileImmagine(ambito: string, chiave: string): { id: number; contenuto: Buffer; mime: string; byte: number; createdAt: string } {
  const r = prepared('SELECT id, mime, byte, created_at, contenuto FROM immagine WHERE ambito = ? AND chiave = ?').get(ambito, chiaveDi(ambito, chiave)) as { id: number; mime: string; byte: number; created_at: string; contenuto: Buffer | null } | undefined;
  if (!r) throw httpErrors.notFound('immagine-non-trovata', `Nessuna immagine per ${ambito}/${chiave}.`);
  if (!r.contenuto) throw httpErrors.notFound('immagine-file-mancante', `L'immagine ${ambito}/${chiave} è registrata ma non ha contenuto.`);
  return { id: r.id, contenuto: r.contenuto, mime: r.mime, byte: r.byte, createdAt: r.created_at };
}

/** Salva (o sostituisce) l'immagine di un'entità; `origineUrl` è l'indirizzo da cui è stata scaricata (null per i file caricati). */
export function salvaImmagine(ambito: AmbitoImmagine, chiave: string, mime: string, contenuto: Buffer, origineUrl: string | null = null): ImmagineDto {
  chiave = chiaveDi(ambito, chiave);
  const estensione = ESTENSIONE_PER_MIME[mime];
  if (!estensione) throw httpErrors.badRequest('formato-non-ammesso', `Formato '${mime}' non ammesso: usa PNG, JPEG, WEBP, GIF o SVG.`);
  if (contenuto.length === 0) throw httpErrors.badRequest('immagine-vuota', 'Il contenuto dell\'immagine è vuoto.');
  if (contenuto.length > MAX_BYTE_IMMAGINE) throw httpErrors.badRequest('immagine-troppo-grande', `L'immagine supera ${MAX_BYTE_IMMAGINE / 1024 / 1024} MB.`);
  // `nome_file` resta per lo schema (NOT NULL) e come nome leggibile: un nome nuovo a ogni sostituzione
  const nomeFile = `${randomUUID()}.${estensione}`;
  getDb().transaction(() => {
    prepared(`INSERT INTO immagine (ambito, chiave, nome_file, mime, byte, created_at, origine_url, contenuto) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(ambito, chiave) DO UPDATE SET nome_file = excluded.nome_file, mime = excluded.mime, byte = excluded.byte, created_at = excluded.created_at, origine_url = excluded.origine_url, contenuto = excluded.contenuto`)
      .run(ambito, chiave, nomeFile, mime, contenuto.length, nowIso(), origineUrl, contenuto);
  })();
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

/** Rimuove le immagini caricate di un ambito, oppure (senza ambito) di tutti gli ambiti di caricamento: la grafica predefinita non si tocca. */
export function eliminaImmaginiAmbito(ambito?: string): number {
  const esito = ambito
    ? prepared('DELETE FROM immagine WHERE ambito = ?').run(ambito)
    : prepared(`DELETE FROM immagine WHERE ambito IN (${segnapostoCaricamento})`).run(...AMBITI_CARICAMENTO);
  return esito.changes;
}

export function eliminaImmagine(ambito: string, chiave: string): void {
  const esito = prepared('DELETE FROM immagine WHERE ambito = ? AND chiave = ?').run(ambito, chiaveDi(ambito, chiave));
  if (esito.changes === 0) throw httpErrors.notFound('immagine-non-trovata', `Nessuna immagine per ${ambito}/${chiave}.`);
}
