import { Router } from 'express';
import type { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { dettaglioOggetto, elencaCatalogoOggetti } from '../services/catalogoOggettiService.js';
import { aggiornaOggetto, creaOggetto, eliminaOggetto, ripristinaOggetto } from '../services/catalogoOggettiScritture.js';
import { confermaPropostaOggetto, elencaProposteOggetti, impostaLegameOggetto, scartaPropostaOggetto } from '../services/catalogoOggettiProposte.js';
import { verificaPartita } from '../services/verificaPartita.js';
import { z as schema } from 'zod';
import { auditConversioneCatalogo } from '../services/auditCatalogoService.js';
import { censimentoScambiCatalogo } from '../services/censimentoScambiCatalogoService.js';
import { ripristinaCostoRegalo } from '../services/costoRegaloService.js';
import { modificaNotaStorica, ripristinaNotaStorica } from '../services/noteStoricheService.js';
import { confrontoTanaka } from '../services/tanakaSnapshotService.js';
import { bodyLegameOggetto, bodyNuovoOggetto, bodyOggetto, bodyPropostaOggetto, paramsOggetto, queryCatalogoOggetti, queryProposteOggetto,
  type DatiCatalogoOggetto, type DatiLegameOggetto, type DatiPropostaOggetto } from '../schemas/catalogoOggetti.js';

const router = Router();
type QueryCatalogo = z.infer<typeof queryCatalogoOggetti>;
const chiave = (params: Record<string, unknown>) => `${String(params.categoria)}/${String(params.slug)}`;

// Le rotte letterali precedono categoria/slug: «proposte/conferma» non è un oggetto chiamato «conferma».
router.get('/audit', (_req, res) => { res.json(auditConversioneCatalogo()); });
router.get('/confronto-tanaka', (_req, res) => {
  res.set('Cache-Control', 'no-store'); res.json(confrontoTanaka());
});
router.get('/censimento-scambi', (_req, res) => {
  res.set('Cache-Control', 'no-store'); res.json(censimentoScambiCatalogo());
});
router.post('/regali/:confidente/:ordine/ripristina-costo', validate({
  params: schema.object({ confidente: schema.string().min(1).max(120), ordine: schema.coerce.number().int().nonnegative() }),
  body: schema.object({ costoAttuale: schema.string().max(6000).nullable() }).strict(),
}), (req, res) => {
  res.json(ripristinaCostoRegalo(String(req.params.confidente), Number(req.params.ordine), (req.body as { costoAttuale: string | null }).costoAttuale));
});
/** F6: le note storiche della fonte (migrazione 139). Modifica (PUT) e «Ripristina» al valore della guida (POST …/ripristina); il testo
 *  attuale è una precondizione (409 se è cambiato nel frattempo). */
const paramsNotaStorica = schema.object({ chiave: schema.string().regex(/^[a-z0-9][a-z0-9-]{0,119}$/) });
router.put('/note-storiche/:chiave', validate({
  params: paramsNotaStorica,
  body: schema.object({ testo: schema.string().min(1).max(2000), fonte: schema.string().min(1).max(500), testoAttuale: schema.string().max(2000) }).strict(),
}), (req, res) => {
  res.json(modificaNotaStorica(String(req.params.chiave), req.body as { testo: string; fonte: string; testoAttuale: string }));
});
router.post('/note-storiche/:chiave/ripristina', validate({ params: paramsNotaStorica, body: schema.object({ testoAttuale: schema.string().max(2000) }).strict() }), (req, res) => {
  res.json(ripristinaNotaStorica(String(req.params.chiave), (req.body as { testoAttuale: string }).testoAttuale));
});
router.get('/proposte', validate({ query: queryProposteOggetto }), (req, res) => {
  res.json(elencaProposteOggetti(req.query as z.infer<typeof queryProposteOggetto>));
});
router.post('/proposte/conferma', validate({ body: bodyPropostaOggetto }), (req, res) => {
  res.json(confermaPropostaOggetto(req.body as DatiPropostaOggetto));
});
router.post('/proposte/scarta', validate({ body: bodyPropostaOggetto }), (req, res) => {
  res.json(scartaPropostaOggetto(req.body as DatiPropostaOggetto));
});
router.put('/legami', validate({ body: bodyLegameOggetto }), (req, res) => {
  res.json(impostaLegameOggetto(req.body as DatiLegameOggetto));
});
router.get('/', validate({ query: queryCatalogoOggetti }), (req, res) => {
  const q = req.query as unknown as QueryCatalogo;
  if (q.partita !== undefined) verificaPartita(q.partita);
  res.json(elencaCatalogoOggetti({ categoria: q.categoria, q: q.q, nascosti: q.nascosti === '1' }));
});
router.post('/', validate({ body: bodyNuovoOggetto }), (req, res) => {
  res.status(201).json(creaOggetto(req.body as DatiCatalogoOggetto));
});
router.get('/:categoria/:slug', validate({ params: paramsOggetto, query: queryCatalogoOggetti }), (req, res) => {
  res.json(dettaglioOggetto(chiave(req.params), (req.query as unknown as QueryCatalogo).partita));
});
router.put('/:categoria/:slug', validate({ params: paramsOggetto, body: bodyOggetto }), (req, res) => {
  res.json(aggiornaOggetto(chiave(req.params), req.body as Partial<DatiCatalogoOggetto>));
});
router.post('/:categoria/:slug/ripristina', validate({ params: paramsOggetto }), (req, res) => {
  res.json(ripristinaOggetto(chiave(req.params)));
});
router.delete('/:categoria/:slug', validate({ params: paramsOggetto }), (req, res) => {
  res.json(eliminaOggetto(chiave(req.params)));
});

export default router;
