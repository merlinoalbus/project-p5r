// ============================================================
// /api/condizioni — gli elenchi per l'editor delle condizioni e i progressi che le rendono vere
// ============================================================
//
// Rotte sottili: la logica (elenchi, progressi della partita, anteprima dell'esito, eventi, volte e punti segnati a mano) sta in
// `condizioniService`; qui restano gli schemi e le intestazioni.
// ============================================================

import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { pinConStato, vociCitabili } from '../services/condizioni/nomiCondizioni.js';
import { censimentoLuoghiCondizioni } from '../services/censimentoLuoghiCondizioniService.js';
import { condizioneSpillo } from '../schemas/mappe.js';
import { dataGioco, idParam } from '../schemas/comuni.js';
import {
  elenchiRegole, progressiDellaPartita, segnaEventoStoria, segnaPuntiNegozio, segnaVolteAttivita, valutaCondizioni, valutaGruppiDiCondizioni,
} from '../services/condizioniService.js';
import type { PinConStatoDto, VoceCitabileDto } from '../../shared/types.js';

const router = Router();
const idPartita = idParam;
const chiave = z.string().regex(/^[a-z0-9][a-z0-9-]{0,119}$/);

/** Proiezione mirata per riconciliare gli inventari L5/L6; non converte o corregge dati. */
router.get('/censimento', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(censimentoLuoghiCondizioni());
});

router.get('/elenchi', (_req, res) => {
  res.json(elenchiRegole());
});

/** I pin con uno stato, per la condizione «Pin di una mappa» (2026-10-03): solo l'editor delle mappe li chiede, a parte, perché
 *  sono centinaia e agli altri editor non servono. */
router.get('/spilli', (_req, res) => {
  const spilli: PinConStatoDto[] = pinConStato().map((p) => ({ chiave: p.uid, nome: p.nome, tipo: p.tipo, gruppo: p.mappa, parola: p.parola }));
  res.json(spilli);
});

/** Le voci della guida dei Palazzi e dei Memento, per la condizione «Voce della guida» (2026-10-11): come i pin, solo l'editor delle mappe le chiede. */
router.get('/voci', (_req, res) => {
  const voci: VoceCitabileDto[] = vociCitabili().map((v) => ({ chiave: v.chiave, nome: v.nome, tipo: v.tipo, gruppo: v.posto }));
  res.json(voci);
});

/** L6 (§2, §6.1): l'anteprima dell'esito col valutatore unico (`valutaCondizioni`). */
router.post('/valuta', validate({ body: z.object({ condizioni: z.array(condizioneSpillo).max(20), partita: idPartita, giorno: dataGioco.optional() }) }), (req, res) => {
  const { condizioni, partita, giorno } = req.body;
  res.json(valutaCondizioni(condizioni, partita, giorno));
});

/** L8-03: lo stesso esito di `/valuta` per più gruppi di condizioni in una richiesta sola (`valutaGruppiDiCondizioni`). */
router.post('/valuta-gruppi', validate({ body: z.object({
  partita: idPartita,
  // una chiave ripetuta renderebbe ambigua la risposta (gli esiti sono per chiave): si rifiuta con 400 `validation-error`
  gruppi: z.array(z.object({ chiave: z.string().min(1).max(200), condizioni: z.array(condizioneSpillo).max(20) })).max(200)
    .refine((g) => new Set(g.map((x) => x.chiave)).size === g.length, 'Ogni gruppo deve avere una chiave diversa.'),
}) }), (req, res) => {
  const { partita, gruppi } = req.body;
  res.json(valutaGruppiDiCondizioni(partita, gruppi));
});

router.get('/partite/:partita/progressi', validate({ params: z.object({ partita: idPartita }) }), (req, res) => {
  res.json(progressiDellaPartita(Number(req.params.partita)));
});

router.put('/partite/:partita/eventi/:chiave', validate({ params: z.object({ partita: idPartita, chiave }), body: z.object({ avvenuto: z.boolean() }) }), (req, res) => {
  res.json(segnaEventoStoria(Number(req.params.partita), String(req.params.chiave), req.body.avvenuto));
});

router.put('/partite/:partita/attivita/:chiave', validate({ params: z.object({ partita: idPartita, chiave }), body: z.object({ volte: z.number().int().min(0).max(999),
  // L13: l'esito del turno aggiunto per un'attività che dichiara esiti (null = «senza punti»)
  esito: z.string().regex(/^[a-z0-9][a-z0-9-]{0,59}$/).nullable().optional() }) }), (req, res) => {
  const { volte, esito } = req.body;
  res.json(segnaVolteAttivita(Number(req.params.partita), String(req.params.chiave), volte, esito));
});

router.put('/partite/:partita/punti-negozio/:chiave', validate({ params: z.object({ partita: idPartita, chiave }), body: z.object({ punti: z.number().int().min(0).max(999999) }) }), (req, res) => {
  res.json(segnaPuntiNegozio(Number(req.params.partita), String(req.params.chiave), req.body.punti));
});

export default router;
