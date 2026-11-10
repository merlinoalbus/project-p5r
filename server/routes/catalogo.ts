// ============================================================
// Route /api/catalogo — righe del catalogo aggiunte o corrette dall'utente (Fase 16.1)
// ============================================================

import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { aggiornaElemento, creaElemento, elencaCatalogo, elencaNascosti, eliminaElemento, leggiElemento, nascondiElemento, riepilogoCatalogo, ripristinaElemento } from '../services/catalogoService.js';
import { eliminaNelCestino } from '../services/luoghiScritture.js';

/** La conferma di un'eliminazione con contenuti (L5, luoghi e negozi). */
const queryConferma = z.object({ conferma: z.enum(['0', '1']).optional() });
import { SCHEMI_CATALOGO, SCHEMI_CATALOGO_PARZIALI, bodyNascondi, bodySalvaPosto, paramsElementoCatalogo, paramsPosto, paramsTipoCatalogo, queryNascosti } from '../schemas/catalogo.js';
import { leggiPosto, salvaPosto } from '../services/postoService.js';
import { httpErrors } from '../utils/httpError.js';
import type { TipoCatalogo } from '../../shared/types.js';

const router = Router();

/** Valida il corpo con lo schema del tipo indicato nel percorso (parziale per la modifica). */
function corpoPerTipo(tipo: TipoCatalogo, corpo: unknown, parziale: boolean): Record<string, unknown> {
  const schema = parziale ? SCHEMI_CATALOGO_PARZIALI[tipo] : SCHEMI_CATALOGO[tipo];
  const esito = schema.safeParse(corpo);
  if (!esito.success) {
    throw httpErrors.badRequest('validation-error', `Dati del ${tipo} non validi: ${esito.error.issues.map((i) => `${i.path.join('.') || 'corpo'} — ${i.message}`).join('; ')}`, { issues: esito.error.issues });
  }
  return esito.data as Record<string, unknown>;
}

// L'agenda del giorno (eventi e cose da fare dell'utente) dal 2026-09-30 è parte della giornata della guida: `/api/compendio/percorso`.

// ---- Catalogo ----

/** Quante righe l'utente ha aggiunto, corretto o nascosto, per tipo. */
router.get('/', (_req, res) => {
  res.json(riepilogoCatalogo());
});

// ---- L3: il posto (luogo, punti vendita e offerte) in una finestra sola ----

/**
 * Per una riga esistente valgono solo i campi mandati: lo schema parziale applica comunque i suoi valori predefiniti (`tipo` «altro»,
 * `cosa_offre` vuoto), che su una modifica cambierebbero in silenzio un campo non toccato.
 */
function soloMandati(tipo: TipoCatalogo, corpo: Record<string, unknown>, esistente: boolean): Record<string, unknown> {
  const dati = corpoPerTipo(tipo, corpo, esistente);
  return esistente ? Object.fromEntries(Object.entries(dati).filter(([k]) => k in corpo)) : dati;
}

/** Il luogo con i suoi punti vendita visibili e le loro offerte, come elementi del catalogo. */
router.get('/posto/:quartiere/:luogo', validate({ params: paramsPosto }), (req, res) => {
  res.json(leggiPosto(`${req.params.quartiere}/${req.params.luogo}`));
});
/** Salva il posto in una transazione; ogni parte passa dallo schema del suo tipo (nuova: completo; esistente: parziale). */
router.put('/posto/:quartiere/:luogo', validate({ params: paramsPosto, body: bodySalvaPosto }), (req, res) => {
  const corpo = req.body as z.infer<typeof bodySalvaPosto>;
  res.json(salvaPosto(`${req.params.quartiere}/${req.params.luogo}`, {
    luogo: corpo.luogo ? soloMandati('luogo', corpo.luogo, true) : undefined,
    regole: corpo.regole,
    puntiVendita: corpo.puntiVendita.map((pv) => ({
      chiave: pv.chiave,
      // la sede la decide il posto: per la validazione di un punto vendita nuovo basta un valore, il servizio la sostituisce
      dati: pv.dati ? soloMandati('negozio', pv.chiave ? pv.dati : { ...pv.dati, sede_chiave: null }, !!pv.chiave) : undefined,
      offerte: pv.offerte.map((o) => ({ chiave: o.chiave, copiaDa: o.copiaDa, dati: soloMandati('articolo', { ...o.dati, negozio_chiave: pv.chiave ?? 'posto' }, !!o.chiave) })),
      offerteTolte: pv.offerteTolte,
    })),
  }));
});

/** Le righe toccate dall'utente; con `?nascosti=1` le sole nascoste (pagina «Rimossi»), anche di un solo negozio. */
router.get('/:tipo', validate({ params: paramsTipoCatalogo, query: queryNascosti }), (req, res) => {
  const q = req.query;
  res.json(q.nascosti ? elencaNascosti(req.params.tipo, { negozio: q.negozio }) : elencaCatalogo(req.params.tipo));
});
router.post('/:tipo', validate({ params: paramsTipoCatalogo }), (req, res) => {
  const tipo = req.params.tipo;
  res.status(201).json(creaElemento(tipo, corpoPerTipo(tipo, req.body, false)));
});
router.get('/:tipo/:chiave', validate({ params: paramsElementoCatalogo }), (req, res) => {
  res.json(leggiElemento(req.params.tipo, req.params.chiave));
});
router.put('/:tipo/:chiave', validate({ params: paramsElementoCatalogo }), (req, res) => {
  const tipo = req.params.tipo;
  res.json(aggiornaElemento(tipo, req.params.chiave, corpoPerTipo(tipo, req.body, true)));
});
router.put('/:tipo/:chiave/nascosta', validate({ params: paramsElementoCatalogo, body: bodyNascondi }), (req, res) => {
  res.json(nascondiElemento(req.params.tipo, req.params.chiave, req.body.nascosta));
});
/** Elimina la riga creata dall'utente oppure riporta al seed quella corretta. L5: per un luogo o un negozio `DELETE` elimina e basta, nel
 *  cestino (409 col riepilogo senza `?conferma=1` se ha contenuti); «Ripristina» è `POST …/ripristina`. */
router.delete('/:tipo/:chiave', validate({ params: paramsElementoCatalogo, query: queryConferma }), (req, res) => {
  const tipo = req.params.tipo;
  if (tipo === 'luogo' || tipo === 'negozio') {
    res.json(eliminaNelCestino(tipo, req.params.chiave, req.query.conferma === '1'));
    return;
  }
  res.json(eliminaElemento(tipo, req.params.chiave));
});
/** L5: «Ripristina i valori della guida» per ogni tipo del catalogo: rimette `seed_json`; non elimina mai. */
router.post('/:tipo/:chiave/ripristina', validate({ params: paramsElementoCatalogo }), (req, res) => {
  res.json(ripristinaElemento(req.params.tipo, req.params.chiave));
});

export default router;
