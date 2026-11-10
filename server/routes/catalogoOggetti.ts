import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { dettaglioOggetto, elencaCatalogoOggetti } from '../services/catalogoOggettiService.js';
import { aggiornaOggetto, creaOggetto, eliminaOggetto } from '../services/catalogoOggettiScritture.js';
import { impostaLegameOggetto } from '../services/catalogoOggettiLegami.js';
import { verificaPartita } from '../services/verificaPartita.js';
import { z as schema } from 'zod';
import { modificaNotaStorica } from '../services/noteStoricheService.js';
import { bodyLegameOggetto, bodyNuovoOggetto, bodyOggetto, paramsOggetto, queryCatalogoOggetti } from '../schemas/catalogoOggetti.js';

const router = Router();
const chiave = (params: Record<string, unknown>) => `${String(params.categoria)}/${String(params.slug)}`;

// Le rotte letterali («note-storiche/…», «legami») precedono categoria/slug: non sono oggetti chiamati come loro.
/** F6: le note storiche della fonte (migrazione 139). Modifica (PUT); il testo attuale è una precondizione (409 se è cambiato nel frattempo). */
const paramsNotaStorica = schema.object({ chiave: schema.string().regex(/^[a-z0-9][a-z0-9-]{0,119}$/) });
router.put('/note-storiche/:chiave', validate({
  params: paramsNotaStorica,
  body: schema.object({ testo: schema.string().min(1).max(2000), fonte: schema.string().max(500), testoAttuale: schema.string().max(2000) }).strict(),
}), (req, res) => {
  res.json(modificaNotaStorica(req.params.chiave, req.body));
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
router.delete('/:categoria/:slug', validate({ params: paramsOggetto }), (req, res) => {
  res.json(eliminaOggetto(chiave(req.params)));
});

export default router;
