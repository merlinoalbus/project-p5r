// ============================================================
// Route /api/catalogo — righe del catalogo aggiunte o corrette dall'utente (Fase 16.1)
// ============================================================

import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { aggiornaElemento, creaElemento, elencaCatalogo, elencaNascosti, eliminaElemento, leggiElemento, nascondiElemento, riepilogoCatalogo } from '../services/catalogoService.js';
import { oggettiSelezionabili, tuttiGliOggettiSelezionabili } from '../services/oggettiSelezionabili.js';
import { SCHEMI_CATALOGO, SCHEMI_CATALOGO_PARZIALI, bodyNascondi, paramsElementoCatalogo, paramsTipoCatalogo, queryNascosti } from '../schemas/catalogo.js';
import { httpErrors } from '../utils/httpError.js';
import type { TipoCatalogo } from '../../shared/types.js';

const router = Router();

/** Valida il corpo con lo schema del tipo indicato nel percorso (parziale per la modifica). */
function corpoPerTipo(tipo: TipoCatalogo, corpo: unknown, parziale: boolean): Record<string, unknown> {
  const schema = parziale ? SCHEMI_CATALOGO_PARZIALI[tipo] : SCHEMI_CATALOGO[tipo];
  const esito = schema.safeParse(corpo);
  if (!esito.success) {
    throw httpErrors.badRequest('dati-non-validi', `Dati del ${tipo} non validi: ${esito.error.issues.map((i) => `${i.path.join('.') || 'corpo'} — ${i.message}`).join('; ')}`, { issues: esito.error.issues });
  }
  return esito.data as Record<string, unknown>;
}

// L'agenda del giorno (eventi e cose da fare dell'utente) dal 2026-09-30 è parte della giornata della guida: `/api/compendio/percorso`.

// ---- Catalogo ----

/** Quante righe l'utente ha aggiunto, corretto o nascosto, per tipo. */
router.get('/', (_req, res) => {
  res.json(riepilogoCatalogo());
});

/** Quello che l'app già sa di una categoria, pronto da agganciare a un negozio invece di riscriverlo.
 *
 * **Sta prima di `/:tipo`, e non è un dettaglio di stile**: `/:tipo` accetta qualunque parola,
 * quindi registrata dopo questa rotta non verrebbe mai raggiunta — `oggetti-di` finirebbe dentro
 * `tipo` e la validazione risponderebbe «tipo di catalogo sconosciuto». */
router.get('/oggetti-di/:categoria', (req, res) => {
  res.json(oggettiSelezionabili(req.params.categoria));
});

/** **Tutto** quello che l'app conosce, senza filtro di categoria.
 *
 * Un negozio non vende una categoria, vende una cosa: chi compila cerca «Il magnifico ladro», non
 * «libro». La categoria arriva con l'oggetto scelto, invece di doverla indovinare prima. */
router.get('/oggetti', (_req, res) => {
  res.json(tuttiGliOggettiSelezionabili());
});

/** Le righe toccate dall'utente; con `?nascosti=1` le sole nascoste (pagina «Rimossi»), anche di un solo negozio. */
router.get('/:tipo', validate({ params: paramsTipoCatalogo, query: queryNascosti }), (req, res) => {
  const q = req.query as unknown as { nascosti?: string; negozio?: string };
  res.json(q.nascosti ? elencaNascosti(req.params.tipo as TipoCatalogo, { negozio: q.negozio }) : elencaCatalogo(req.params.tipo as TipoCatalogo));
});
router.post('/:tipo', validate({ params: paramsTipoCatalogo }), (req, res) => {
  const tipo = req.params.tipo as TipoCatalogo;
  res.status(201).json(creaElemento(tipo, corpoPerTipo(tipo, req.body, false)));
});
router.get('/:tipo/:chiave', validate({ params: paramsElementoCatalogo }), (req, res) => {
  res.json(leggiElemento(req.params.tipo as TipoCatalogo, String(req.params.chiave)));
});
router.put('/:tipo/:chiave', validate({ params: paramsElementoCatalogo }), (req, res) => {
  const tipo = req.params.tipo as TipoCatalogo;
  res.json(aggiornaElemento(tipo, String(req.params.chiave), corpoPerTipo(tipo, req.body, true)));
});
router.put('/:tipo/:chiave/nascosta', validate({ params: paramsElementoCatalogo, body: bodyNascondi }), (req, res) => {
  res.json(nascondiElemento(req.params.tipo as TipoCatalogo, String(req.params.chiave), (req.body as { nascosta: boolean }).nascosta));
});
/** Elimina la riga creata dall'utente oppure riporta al seed quella corretta. */
router.delete('/:tipo/:chiave', validate({ params: paramsElementoCatalogo }), (req, res) => {
  res.json(eliminaElemento(req.params.tipo as TipoCatalogo, String(req.params.chiave)));
});

export default router;
