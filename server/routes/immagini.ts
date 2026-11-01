// ============================================================
// Route /api/immagini — manifesto della grafica predefinita, caricamento, importazione da URL, lettura, rimozione
// ============================================================
//
// Caricamento: PUT /api/immagini/:ambito/:chiave con il file come corpo
// grezzo (Content-Type image/*), fino a 8 MB. Il frontend usa
// `fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })`.
// Le immagini vivono nel database (migrazione 079): il file si risponde dal contenuto della riga,
// con un ETag stabile finché la riga non cambia.
// ============================================================

import { createHash } from 'node:crypto';
import express, { Router, type Response } from 'express';
import { validate } from '../middleware/validate.js';
import { bodyDaUrl, paramsImmagine, queryConfermaPezzi, queryFileImmagine, queryImmagini, queryRimozioneImmagini } from '../schemas/immagini.js';
import { MISURE_AMMESSE, etagMiniatura, miniaturaDi, miniaturaInCache } from '../services/miniatureService.js';
import { larghezzaMiniaturaAmmessa, type LarghezzaMiniatura } from '../../shared/miniature.js';
import {
  MAX_BYTE_IMMAGINE, eliminaImmagine, eliminaImmaginiAmbito, elencaImmagini, fileImmagine, importaImmagineDaUrl, leggiImmagine, manifestoPredefinite, metadatiFileImmagine, salvaImmagine,
} from '../services/immaginiService.js';
import { httpErrors } from '../utils/httpError.js';
import { impostaImmagineMappa, mappaEsiste, scaricaImmagineMappa } from '../services/mappe/mappeService.js';

const router = Router();

/**
 * L9-01: un SVG caricato è un documento che può contenere script, servito dalla stessa origine dell'app. Dentro un `<img>` o uno sfondo
 * CSS il browser non esegue mai i suoi script, e lì queste intestazioni non contano: l'app lo vede come prima. Aperto da solo (l'indirizzo
 * del file in una scheda) senza intestazioni eseguirebbe i suoi script con l'origine dell'app; con la CSP `sandbox` e `script-src 'none'`
 * non esegue nulla e non carica nulla da fuori, e `Content-Disposition: attachment` lo fa scaricare invece di aprirlo. Gli altri formati
 * (PNG, JPEG, WEBP, GIF, e le miniature WebP) non portano codice e restano come sono.
 */
function intestazioniDelFile(res: Response, mime: string, chiave: string): void {
  if (mime !== 'image/svg+xml') return;
  res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox");
  // il nome del file: la chiave con i soli caratteri sicuri in un'intestazione (le chiavi sono già slug, è una garanzia in più)
  res.setHeader('Content-Disposition', `attachment; filename="${chiave.replace(/[^A-Za-z0-9._-]/g, '_')}.svg"`);
}

router.get('/', validate({ query: queryImmagini }), (req, res) => {
  res.json(elencaImmagini(req.query.ambito));
});

/**
 * La grafica predefinita nel database, nella forma del manifest degli asset (chiave → URL versionato).
 * L5-08: l'ETag è l'impronta del contenuto che conta (`totale` e `file`: ogni URL porta la versione dell'immagine, quindi basta a dire se
 * qualcosa è cambiato), NON del corpo intero. Il corpo porta anche `generato`, l'ora della risposta (`nowIso()`): due letture di seguito, senza
 * nessuna scrittura, hanno corpi diversi, e l'ETag automatico di Express (calcolato sul corpo) non coincideva mai, così il 304 non scattava.
 * Con l'ETag stabile e `no-cache` (rivalida a ogni richiesta, mai servito dalla cache senza chiedere) un manifest invariato risponde 304 senza
 * corpo, e una sostituzione si vede subito; prima `no-store` impediva anche di mandare `If-None-Match`.
 */
router.get('/manifest', (_req, res) => {
  const manifesto = manifestoPredefinite();
  res.setHeader('Cache-Control', 'private, no-cache');
  res.setHeader('ETag', `"${createHash('sha1').update(JSON.stringify({ totale: manifesto.totale, file: manifesto.file })).digest('base64url')}"`);
  // con l'ETag già scelto `res.json` risponde 304 da solo se `If-None-Match` coincide (Express confronta con `req.fresh`)
  res.json(manifesto);
});

// Rimozione multipla: tutte le immagini caricate di un ambito (query `ambito`) o di tutti gli ambiti di caricamento; le mappe con
// pezzi che perderebbero la loro immagine chiedono conferma (L1, F5: 409 `mappa-con-pezzi`, `eliminaPezzi=1`).
router.delete('/', validate({ query: queryRimozioneImmagini }), (req, res) => {
  const q = req.query;
  res.json({ eliminate: eliminaImmaginiAmbito(q.ambito, { eliminaPezzi: q.eliminaPezzi === '1' }) });
});

router.get('/:ambito/:chiave/file', validate({ params: paramsImmagine, query: queryFileImmagine }), async (req, res) => {
  const { v, l } = req.query;
  // la larghezza della miniatura (L1, variante «miniature»): solo le misure ammesse, ogni altro valore è un 400 (un URL inventato
  // non genera niente e la cache non cresce senza limiti)
  const larghezza = l === undefined ? null : Number(l);
  if (larghezza !== null && (!/^\d+$/.test(l!) || !larghezzaMiniaturaAmmessa(larghezza))) {
    throw httpErrors.badRequest('larghezza-non-ammessa', `Larghezza della miniatura non ammessa: usa una di ${MISURE_AMMESSE} pixel.`);
  }
  const ambito = String(req.params.ambito);
  const chiave = String(req.params.chiave);
  // R12-03: prima i soli metadati (id, mime, byte, data): bastano per l'ETag, per il 304 e per una miniatura già in cache. Il contenuto
  // dell'originale (anche diversi MB, letto sul thread del server) si carica solo quando va davvero inviato o ridotto.
  const meta = metadatiFileImmagine(ambito, chiave);
  // URL versionato (`?v=`): il contenuto può restare in cache per un anno perché ogni sostituzione cambia l'URL; senza versione,
  // rivalidazione a ogni richiesta con l'ETag (id + byte + data), così una sostituzione è visibile subito.
  const versionato = typeof v === 'string' && v.length > 0;
  res.setHeader('Cache-Control', versionato ? 'private, max-age=31536000, immutable' : 'private, no-cache');
  if (larghezza === null) {
    const etag = `"${meta.id}-${meta.byte}-${meta.createdAt}"`;
    res.setHeader('ETag', etag);
    if (req.headers['if-none-match'] === etag) { res.status(304).end(); return; }
    const f = fileImmagine(ambito, chiave);
    intestazioniDelFile(res, f.mime, chiave);
    res.type(f.mime);
    res.send(f.contenuto);
    return;
  }
  // con la larghezza: la miniatura WebP (dalla cache o generata ora), o l'originale quando non c'è niente da ridurre o il generatore
  // non c'è; l'ETag porta anche la generazione dell'algoritmo e la larghezza, e si confronta prima di generare
  const etag = etagMiniatura(meta, larghezza as LarghezzaMiniatura);
  res.setHeader('ETag', etag);
  if (req.headers['if-none-match'] === etag) { res.status(304).end(); return; }
  // già in cache: si risponde con la riga della miniatura, senza leggere l'originale
  const inCache = miniaturaInCache(meta, larghezza as LarghezzaMiniatura);
  if (inCache) {
    res.setHeader('X-Miniatura', inCache.esito);
    intestazioniDelFile(res, inCache.mime, chiave);
    res.type(inCache.mime);
    res.send(inCache.contenuto);
    return;
  }
  // da generare, o da servire com'è: qui serve il contenuto (la lettura è sincrona, nessuna sostituzione può intervenire fra i due passi)
  const f = fileImmagine(ambito, chiave);
  const m = await miniaturaDi({ id: f.id, contenuto: f.contenuto, mime: f.mime, byte: f.byte, createdAt: f.createdAt }, larghezza as LarghezzaMiniatura);
  res.setHeader('X-Miniatura', m.esito);
  intestazioniDelFile(res, m.mime, chiave);
  res.type(m.mime);
  res.send(m.contenuto);
});

router.put(
  '/:ambito/:chiave',
  validate({ params: paramsImmagine, query: queryConfermaPezzi }),
  express.raw({ type: 'image/*', limit: MAX_BYTE_IMMAGINE }),
  (req, res) => {
    const mime = (req.headers['content-type'] ?? '').split(';')[0].trim();
    if (!Buffer.isBuffer(req.body)) throw httpErrors.badRequest('corpo-non-immagine', 'Il corpo della richiesta deve essere un file immagine (Content-Type image/*).');
    const ambito = req.params.ambito;
    const chiave = String(req.params.chiave);
    // L1: l'immagine di una mappa che esiste passa dalla stessa strada dell'editor (pezzi da confermare, dimensioni, ruolo): prima
    // questa rotta la salvava e basta, e il ruolo dipendeva da chi l'aveva caricata
    if (ambito === 'mappa' && mappaEsiste(chiave)) {
      impostaImmagineMappa(chiave, mime, req.body, { eliminaPezzi: req.query.eliminaPezzi === '1' });
      res.status(201).json(leggiImmagine(ambito, chiave));
      return;
    }
    res.status(201).json(salvaImmagine(ambito, chiave, mime, req.body));
  },
);

router.post('/:ambito/:chiave/da-url', validate({ params: paramsImmagine, query: queryConfermaPezzi, body: bodyDaUrl }), async (req, res) => {
  const ambito = req.params.ambito;
  const chiave = String(req.params.chiave);
  const url = req.body.url;
  // L1 (F5 del validatore): l'immagine di una mappa che esiste, scaricata da un indirizzo scelto dall'utente, segue la strada
  // dell'editor come il caricamento qui sopra (pezzi da confermare, dimensioni, ruolo, la mappa diventa dell'utente)
  if (ambito === 'mappa' && mappaEsiste(chiave)) {
    await scaricaImmagineMappa(chiave, url, { eliminaPezzi: req.query.eliminaPezzi === '1' });
    res.status(201).json(leggiImmagine(ambito, chiave));
    return;
  }
  res.status(201).json(await importaImmagineDaUrl(ambito, chiave, url));
});

// L1 (F5): togliere l'immagine che una mappa con pezzi mostra chiede la stessa conferma (409 `mappa-con-pezzi`, `?eliminaPezzi=1`)
router.delete('/:ambito/:chiave', validate({ params: paramsImmagine, query: queryConfermaPezzi }), (req, res) => {
  eliminaImmagine(String(req.params.ambito), String(req.params.chiave), { eliminaPezzi: req.query.eliminaPezzi === '1' });
  res.status(204).end();
});

export default router;
