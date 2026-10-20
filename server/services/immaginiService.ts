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
import type { ImmagineDto, ManifestImmaginiDto } from '../../shared/types.js';
import { idMappa } from './mappe/percorsiMappe.js';
import { scaricaDaUrl } from '../utils/scaricaDaUrl.js';
import { allineaRuoliImmagine, dopoImmagineMappa, dopoRimozioniImmagini, mappeCheLaPerdono } from './mappe/immagineMappa.js';
import { confermaPezzi, mappeConPezzi } from './mappe/pezziMappa.js';
import { eDelleSchede, eliminaMiniatureDi, riscaldaMiniature } from './miniatureService.js';

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

/** L'URL dell'API che serve il file dell'immagine, con ambito e chiave codificati. */
function urlFileImmagine(ambito: string, chiave: string): string {
  return `/api/immagini/${encodeURIComponent(ambito)}/${encodeURIComponent(chiave)}/file`;
}

/** I metadati di un'immagine per il client, con l'URL del file (mai i byte). */
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
export function manifestoPredefinite(): ManifestImmaginiDto {
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
    // le miniature (108) erano dell'immagine di prima: l'`ON CONFLICT DO UPDATE` conserva l'id, e la cascata non scatta
    eliminaMiniatureDi(getDb(), ambito, chiave);
    prepared(`INSERT INTO immagine (ambito, chiave, nome_file, mime, byte, created_at, origine_url, contenuto) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(ambito, chiave) DO UPDATE SET nome_file = excluded.nome_file, mime = excluded.mime, byte = excluded.byte, created_at = excluded.created_at, origine_url = excluded.origine_url, contenuto = excluded.contenuto`)
      .run(ambito, chiave, nomeFile, mime, contenuto.length, nowIso(), origineUrl, contenuto);
    // l'immagine di una mappa vale ovunque da subito, da qualunque strada arrivi (L1): chiave, dimensioni e ruolo della mappa; un
    // asset predefinito che compare può dare un'immagine a chi lo dichiara
    if (ambito === 'mappa') dopoImmagineMappa(getDb(), chiave, contenuto);
    else if ((AMBITI_PREDEFINITI as readonly string[]).includes(ambito)) allineaRuoliImmagine(getDb());
  })();
  // l'illustrazione di una scheda (quartiere, città, radice di un Palazzo) ha subito le sue miniature, fuori dalla transazione e
  // senza far aspettare chi ha caricato
  if (ambito === 'mappa' && eDelleSchede(ambito, chiave)) setImmediate(() => { void riscaldaMiniature([{ ambito, chiave }]); });
  return leggiImmagine(ambito, chiave)!;
}

/** Scarica un'immagine da un URL, senza salvarla: lo scarico condiviso (`scaricaDaUrl`), con il tetto applicato mentre arriva e
 *  l'attesa della risposta distinta dall'inattività. `url` è l'indirizzo d'arrivo, dopo i redirect. */
export async function scaricaImmagine(url: string): Promise<{ contenuto: Buffer; mime: string; url: URL }> {
  return scaricaDaUrl(url, {
    maxByte: MAX_BYTE_IMMAGINE,
    cosa: 'l\'immagine',
    codiceScaricoFallito: 'download-fallito',
    codiceTroppoGrande: 'immagine-troppo-grande',
    accept: 'image/*,*/*;q=0.8',
    attesaRispostaMs: 20_000,
    intestazioni: { 'User-Agent': 'Mozilla/5.0 (compatible; ProjectP5R/1.0; +https://github.com/merlinoalbus/project-p5r)' },
  });
}

/** Scarica un'immagine da un URL indicato dall'utente e la salva, con l'indirizzo d'origine. Per l'immagine di una mappa che
 *  esiste c'è la strada dell'editor (`scaricaImmagineMappa` in mappeService), che chiede conferma dei pezzi. */
export async function importaImmagineDaUrl(ambito: AmbitoImmagine, chiave: string, url: string): Promise<ImmagineDto> {
  const { contenuto, mime, url: u } = await scaricaImmagine(url);
  return salvaImmagine(ambito, chiave, mime, contenuto, u.toString());
}

/**
 * Rimuove le immagini caricate di un ambito, oppure (senza ambito) di tutti gli ambiti di caricamento: la grafica predefinita non si
 * tocca. Le mappe con pezzi (102) che perderebbero l'immagine che mostrano chiedono conferma (L1, F5 del validatore): senza
 * `eliminaPezzi` 409 `mappa-con-pezzi` e niente si toglie; con la conferma i loro pezzi se ne vanno nella stessa transazione.
 */
export function eliminaImmaginiAmbito(ambito?: string, opz: { eliminaPezzi?: boolean } = {}): number {
  return getDb().transaction(() => {
    const tolto = (a: string) => (ambito ? a === ambito : (AMBITI_CARICAMENTO as readonly string[]).includes(a));
    const togliPezzi = confermaPezzi(mappeCheLaPerdono(mappeConPezzi(), (a) => tolto(a)), !!opz.eliminaPezzi, 'togliendola', true);
    const esito = ambito
      ? prepared('DELETE FROM immagine WHERE ambito = ?').run(ambito)
      : prepared(`DELETE FROM immagine WHERE ambito IN (${segnapostoCaricamento})`).run(...AMBITI_CARICAMENTO);
    togliPezzi();
    // le mappe che avevano un'immagine ora tolta tornano alla regola (L1)
    if (esito.changes > 0) dopoRimozioniImmagini(getDb());
    return esito.changes;
  })();
}

/**
 * Elimina l'immagine di un'entità (per le mappe la chiave si riconduce all'identità della mappa); 404 se non c'era. Se era
 * l'immagine mostrata da una mappa con pezzi (la caricata, o l'asset predefinito di una mappa senza caricata), stessa regola
 * dell'editor: 409 `mappa-con-pezzi` senza `eliminaPezzi`, con la conferma i pezzi se ne vanno con lei.
 */
export function eliminaImmagine(ambito: string, chiave: string, opz: { eliminaPezzi?: boolean } = {}): void {
  getDb().transaction(() => {
    const interna = chiaveDi(ambito, chiave);
    if (!prepared('SELECT 1 FROM immagine WHERE ambito = ? AND chiave = ?').get(ambito, interna)) throw httpErrors.notFound('immagine-non-trovata', `Nessuna immagine per ${ambito}/${chiave}.`);
    const togliPezzi = confermaPezzi(mappeCheLaPerdono(mappeConPezzi(), (a, k) => a === ambito && k === interna), !!opz.eliminaPezzi, 'togliendola');
    prepared('DELETE FROM immagine WHERE ambito = ? AND chiave = ?').run(ambito, interna);
    togliPezzi();
    if (ambito === 'mappa') dopoImmagineMappa(getDb(), interna, null);
    else if ((AMBITI_PREDEFINITI as readonly string[]).includes(ambito)) allineaRuoliImmagine(getDb());
  })();
}
