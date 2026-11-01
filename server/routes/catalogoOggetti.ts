import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { dettaglioOggetto, elencaCatalogoOggetti } from '../services/catalogoOggettiService.js';
import { aggiornaOggetto, creaOggetto, eliminaOggetto, ripristinaOggetto } from '../services/catalogoOggettiScritture.js';
import { impostaLegameOggetto } from '../services/catalogoOggettiProposte.js';
import { verificaPartita } from '../services/verificaPartita.js';
import { z as schema } from 'zod';
import { ripristinaCostoRegalo } from '../services/costoRegaloService.js';
import { modificaNotaStorica, ripristinaNotaStorica } from '../services/noteStoricheService.js';
import { bodyLegameOggetto, bodyNuovoOggetto, bodyOggetto, paramsOggetto, queryCatalogoOggetti } from '../schemas/catalogoOggetti.js';

const router = Router();
const chiave = (params: Record<string, unknown>) => `${String(params.categoria)}/${String(params.slug)}`;

// Le rotte letterali («regali/…», «note-storiche/…», «legami») precedono categoria/slug: non sono oggetti chiamati come loro.
router.post('/regali/:confidente/:ordine/ripristina-costo', validate({
  params: schema.object({ confidente: schema.string().min(1).max(120), ordine: schema.coerce.number().int().nonnegative() }),
  body: schema.object({ costoAttuale: schema.string().max(6000).nullable() }).strict(),
}), (req, res) => {
  res.json(ripristinaCostoRegalo(req.params.confidente, req.params.ordine, req.body.costoAttuale));
});
/** F6: le note storiche della fonte (migrazione 139). Modifica (PUT) e «Ripristina» al valore della guida (POST …/ripristina); il testo
 *  attuale è una precondizione (409 se è cambiato nel frattempo). */
const paramsNotaStorica = schema.object({ chiave: schema.string().regex(/^[a-z0-9][a-z0-9-]{0,119}$/) });
router.put('/note-storiche/:chiave', validate({
  params: paramsNotaStorica,
  body: schema.object({ testo: schema.string().min(1).max(2000), fonte: schema.string().max(500), testoAttuale: schema.string().max(2000) }).strict(),
}), (req, res) => {
  res.json(modificaNotaStorica(req.params.chiave, req.body));
});
router.post('/note-storiche/:chiave/ripristina', validate({ params: paramsNotaStorica, body: schema.object({ testoAttuale: schema.string().max(2000) }).strict() }), (req, res) => {
  res.json(ripristinaNotaStorica(req.params.chiave, req.body.testoAttuale));
});
router.put('/legami', validate({ body: bodyLegameOggetto }), (req, res) => {
  res.json(impostaLegameOggetto(req.body));
});
router.get('/', validate({ query: queryCatalogoOggetti }), (req, res) => {
  const q = req.query;
  if (q.partita !== undefined) verificaPartita(q.partita);
  res.json(elencaCatalogoOggetti({ categoria: q.categoria, q: q.q, nascosti: q.nascosti === '1' }));
});
router.post('/', validate({ body: bodyNuovoOggetto }), (req, res) => {
  res.status(201).json(creaOggetto(req.body));
});
router.get('/:categoria/:slug', validate({ params: paramsOggetto, query: queryCatalogoOggetti }), (req, res) => {
  res.json(dettaglioOggetto(chiave(req.params), req.query.partita));
});
router.put('/:categoria/:slug', validate({ params: paramsOggetto, body: bodyOggetto }), (req, res) => {
  res.json(aggiornaOggetto(chiave(req.params), req.body));
});
router.post('/:categoria/:slug/ripristina', validate({ params: paramsOggetto }), (req, res) => {
  res.json(ripristinaOggetto(chiave(req.params)));
});
router.delete('/:categoria/:slug', validate({ params: paramsOggetto }), (req, res) => {
  res.json(eliminaOggetto(chiave(req.params)));
});

export default router;
