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

import express, { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { bodyDaUrl, paramsImmagine, queryConfermaPezzi, queryFileImmagine, queryImmagini, queryRimozioneImmagini } from '../schemas/immagini.js';
import { MISURE_AMMESSE, etagMiniatura, miniaturaDi } from '../services/miniatureService.js';
import { larghezzaMiniaturaAmmessa, type LarghezzaMiniatura } from '../../shared/miniature.js';
import {
  MAX_BYTE_IMMAGINE, eliminaImmagine, eliminaImmaginiAmbito, elencaImmagini, fileImmagine, importaImmagineDaUrl, leggiImmagine, manifestoPredefinite, salvaImmagine, type AmbitoImmagine,
} from '../services/immaginiService.js';
import { httpErrors } from '../utils/httpError.js';
import { impostaImmagineMappa, mappaEsiste, scaricaImmagineMappa } from '../services/mappe/mappeService.js';

const router = Router();

router.get('/', validate({ query: queryImmagini }), (req, res) => {
  res.json(elencaImmagini((req.query as { ambito?: string }).ambito));
});

/** La grafica predefinita nel database, nella forma del manifest degli asset (chiave → URL versionato). */
router.get('/manifest', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(manifestoPredefinite());
});

// Rimozione multipla: tutte le immagini caricate di un ambito (query `ambito`) o di tutti gli ambiti di caricamento; le mappe con
// pezzi che perderebbero la loro immagine chiedono conferma (L1, F5: 409 `mappa-con-pezzi`, `eliminaPezzi=1`).
router.delete('/', validate({ query: queryRimozioneImmagini }), (req, res) => {
  const q = req.query as { ambito?: string; eliminaPezzi?: string };
  res.json({ eliminate: eliminaImmaginiAmbito(q.ambito, { eliminaPezzi: q.eliminaPezzi === '1' }) });
});

router.get('/:ambito/:chiave/file', validate({ params: paramsImmagine, query: queryFileImmagine }), async (req, res) => {
  const { v, l } = req.query as { v?: string; l?: string };
  // la larghezza della miniatura (L1, variante «miniature»): solo le misure ammesse, ogni altro valore è un 400 (un URL inventato
  // non genera niente e la cache non cresce senza limiti)
  const larghezza = l === undefined ? null : Number(l);
  if (larghezza !== null && (!/^\d+$/.test(l!) || !larghezzaMiniaturaAmmessa(larghezza))) {
    throw httpErrors.badRequest('larghezza-non-ammessa', `Larghezza della miniatura non ammessa: usa una di ${MISURE_AMMESSE} pixel.`);
  }
  const f = fileImmagine(String(req.params.ambito), String(req.params.chiave));
  // URL versionato (`?v=`): il contenuto può restare in cache per un anno perché ogni sostituzione cambia l'URL; senza versione,
  // rivalidazione a ogni richiesta con l'ETag (id + byte + data), così una sostituzione è visibile subito.
  const versionato = typeof v === 'string' && v.length > 0;
  res.setHeader('Cache-Control', versionato ? 'private, max-age=31536000, immutable' : 'private, no-cache');
  if (larghezza === null) {
    const etag = `"${f.id}-${f.byte}-${f.createdAt}"`;
    res.setHeader('ETag', etag);
    if (req.headers['if-none-match'] === etag) { res.status(304).end(); return; }
    res.type(f.mime);
    res.send(f.contenuto);
    return;
  }
  // con la larghezza: la miniatura WebP (dalla cache o generata ora), o l'originale quando non c'è niente da ridurre o il generatore
  // non c'è; l'ETag porta anche la generazione dell'algoritmo e la larghezza, e si confronta prima di generare
  const etag = etagMiniatura(f, larghezza as LarghezzaMiniatura);
  res.setHeader('ETag', etag);
  if (req.headers['if-none-match'] === etag) { res.status(304).end(); return; }
  const m = await miniaturaDi({ id: f.id, contenuto: f.contenuto, mime: f.mime, byte: f.byte, createdAt: f.createdAt }, larghezza as LarghezzaMiniatura);
  res.setHeader('X-Miniatura', m.esito);
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
    const ambito = String(req.params.ambito) as AmbitoImmagine;
    const chiave = String(req.params.chiave);
    // L1: l'immagine di una mappa che esiste passa dalla stessa strada dell'editor (pezzi da confermare, dimensioni, ruolo): prima
    // questa rotta la salvava e basta, e il ruolo dipendeva da chi l'aveva caricata
    if (ambito === 'mappa' && mappaEsiste(chiave)) {
      impostaImmagineMappa(chiave, mime, req.body, { eliminaPezzi: (req.query as { eliminaPezzi?: string }).eliminaPezzi === '1' });
      res.status(201).json(leggiImmagine(ambito, chiave));
      return;
    }
    res.status(201).json(salvaImmagine(ambito, chiave, mime, req.body));
  },
);

router.post('/:ambito/:chiave/da-url', validate({ params: paramsImmagine, query: queryConfermaPezzi, body: bodyDaUrl }), async (req, res) => {
  const ambito = String(req.params.ambito) as AmbitoImmagine;
  const chiave = String(req.params.chiave);
  const url = (req.body as { url: string }).url;
  // L1 (F5 del validatore): l'immagine di una mappa che esiste, scaricata da un indirizzo scelto dall'utente, segue la strada
  // dell'editor come il caricamento qui sopra (pezzi da confermare, dimensioni, ruolo, la mappa diventa dell'utente)
  if (ambito === 'mappa' && mappaEsiste(chiave)) {
    await scaricaImmagineMappa(chiave, url, { eliminaPezzi: (req.query as { eliminaPezzi?: string }).eliminaPezzi === '1' });
    res.status(201).json(leggiImmagine(ambito, chiave));
    return;
  }
  res.status(201).json(await importaImmagineDaUrl(ambito, chiave, url));
});

// L1 (F5): togliere l'immagine che una mappa con pezzi mostra chiede la stessa conferma (409 `mappa-con-pezzi`, `?eliminaPezzi=1`)
router.delete('/:ambito/:chiave', validate({ params: paramsImmagine, query: queryConfermaPezzi }), (req, res) => {
  eliminaImmagine(String(req.params.ambito), String(req.params.chiave), { eliminaPezzi: (req.query as { eliminaPezzi?: string }).eliminaPezzi === '1' });
  res.status(204).end();
});

export default router;
