// ============================================================
// Route /api/aree — le Aree del mondo (L2): pagina, creazione con la prima planimetria, versioni, correzioni, ordine, ripristino,
// eliminazione nel cestino, planimetrie da collocare
// ============================================================
//
// Le rotte sono scritte una volta col contenitore come parametro (`/:contenitore/:chiave/…`): in L2 il contenitore è `citta`, con
// la chiave di un quartiere o `tokyo` per la città; L3 aggiungerà `dungeon` senza rotte nuove. Le immagini arrivano come corpo
// grezzo (`image/*`, 8 MB), come nell'editor delle mappe; nome, punto ed etichetta stanno nella query.
// ============================================================

import express, { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { httpErrors } from '../utils/httpError.js';
import { MAX_BYTE_IMMAGINE } from '../services/immaginiService.js';
import {
  aggiornaArea, aggiornaVersioni, aggiungiPlanimetria, collocaPlanimetria, creaArea, dettaglioArea, eliminaArea, mappeDaCollocare, riordinaAree, ripristinaArea,
  type ContenitoreRotta, type ImmagineNuova,
} from '../services/mappe/areeService.js';
import {
  bodyAggiornaArea, bodyColloca, bodyOrdineAree, bodyVersioni, paramsArea, paramsContenitore, queryAggiungiPlanimetria, queryCreaArea, queryDettaglioArea, queryEliminaArea,
} from '../schemas/aree.js';

const router = Router();

/** L'immagine dal corpo grezzo: 400 `immagine-vuota` se manca; il tipo lo controlla il salvataggio (400 `formato-non-ammesso`). */
function immagineDalCorpo(req: express.Request): ImmagineNuova {
  const mime = String(req.headers['content-type'] ?? '').split(';')[0].trim();
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw httpErrors.badRequest('immagine-vuota', 'Invia l’immagine della planimetria come corpo grezzo con Content-Type image/*.');
  return { mime, contenuto: req.body };
}

const corpoImmagine = express.raw({ type: 'image/*', limit: MAX_BYTE_IMMAGINE });
const parametri = (req: express.Request) => [String(req.params.contenitore) as ContenitoreRotta, String(req.params.chiave)] as const;

// rotte senza contenitore, prima di quelle con i parametri
router.get('/da-collocare', (_req, res) => {
  res.json(mappeDaCollocare());
});
router.put('/colloca', validate({ body: bodyColloca }), (req, res) => {
  res.json(collocaPlanimetria(req.body as Parameters<typeof collocaPlanimetria>[0]));
});

router.post('/:contenitore/:chiave', validate({ params: paramsContenitore, query: queryCreaArea }), corpoImmagine, (req, res) => {
  const q = req.query as unknown as { nome: string; x?: number; y?: number; etichetta?: string };
  res.status(201).json(creaArea(...parametri(req), { nome: q.nome, immagine: immagineDalCorpo(req), x: q.x, y: q.y, etichetta: q.etichetta }));
});
router.put('/:contenitore/:chiave/ordine', validate({ params: paramsContenitore, body: bodyOrdineAree }), (req, res) => {
  res.json(riordinaAree(...parametri(req), (req.body as { slug: string[] }).slug));
});

router.get('/:contenitore/:chiave/:slug', validate({ params: paramsArea, query: queryDettaglioArea }), (req, res) => {
  res.json(dettaglioArea(...parametri(req), String(req.params.slug), (req.query as { partita?: number }).partita));
});
router.put('/:contenitore/:chiave/:slug', validate({ params: paramsArea, body: bodyAggiornaArea }), (req, res) => {
  res.json(aggiornaArea(...parametri(req), String(req.params.slug), req.body as Parameters<typeof aggiornaArea>[3]));
});
router.delete('/:contenitore/:chiave/:slug', validate({ params: paramsArea, query: queryEliminaArea }), (req, res) => {
  eliminaArea(...parametri(req), String(req.params.slug), (req.query as { conferma?: boolean }).conferma === true);
  res.status(204).end();
});
router.post('/:contenitore/:chiave/:slug/ripristina', validate({ params: paramsArea }), (req, res) => {
  res.json(ripristinaArea(...parametri(req), String(req.params.slug)));
});
router.post('/:contenitore/:chiave/:slug/planimetrie', validate({ params: paramsArea, query: queryAggiungiPlanimetria }), corpoImmagine, (req, res) => {
  const q = req.query as { etichetta?: string; predefinita?: boolean };
  res.status(201).json(aggiungiPlanimetria(...parametri(req), String(req.params.slug), { immagine: immagineDalCorpo(req), etichetta: q.etichetta, predefinita: q.predefinita === true }));
});
router.put('/:contenitore/:chiave/:slug/planimetrie', validate({ params: paramsArea, body: bodyVersioni }), (req, res) => {
  res.json(aggiornaVersioni(...parametri(req), String(req.params.slug), req.body as Parameters<typeof aggiornaVersioni>[3]));
});

export default router;
