// ============================================================
// Route /api/compendio/confidenti/:chiave/{ranghi,abilita,dialoghi,doti-incontro/…/ripristina} — gli editor dei Confidenti (L9 R9-07/1-4)
// ============================================================

import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { paramsChiaveGuida } from '../schemas/guidaDungeon.js';
import { abilitaDelConfidente, impostaAbilita, impostaDialogo, impostaRango, MODI_RANGO, ranghiDelConfidente, ripristinaAbilita, ripristinaDialogo, ripristinaDoteIncontro, ripristinaRango } from '../services/confidentiScritture.js';
import { dettaglioConfidente } from '../services/compendioService.js';
import { condizioneSpillo } from '../schemas/mappe.js';
import { creaInvito, eliminaInvito, modificaInvito, ripristinaInvito, type CorpoInvito, type CorpoNuovoInvito } from '../services/invitiScritture.js';

const router = Router();

const rango = z.coerce.number().int().min(1).max(10);
const paramsRango = z.object({ chiave: z.string().min(1).max(200), rango });
const paramsDialogo = z.object({ chiave: z.string().min(1).max(200), id: z.coerce.number().int().positive() });

router.get('/confidenti/:chiave/ranghi', validate({ params: paramsChiaveGuida }), (req, res) => { res.json(ranghiDelConfidente(String(req.params.chiave))); });
router.put('/confidenti/:chiave/ranghi/:rango', validate({ params: paramsRango, body: z.object({ modo: z.enum(MODI_RANGO), puntiNecessari: z.number().int().min(0).max(9999) }).strict() }), (req, res) => {
  const p = req.params as unknown as { chiave: string; rango: number };
  res.json(impostaRango(p.chiave, p.rango, req.body as { modo: (typeof MODI_RANGO)[number]; puntiNecessari: number }));
});
router.post('/confidenti/:chiave/ranghi/:rango/ripristina', validate({ params: paramsRango }), (req, res) => {
  const p = req.params as unknown as { chiave: string; rango: number };
  res.json(ripristinaRango(p.chiave, p.rango));
});

router.get('/confidenti/:chiave/abilita', validate({ params: paramsChiaveGuida }), (req, res) => { res.json(abilitaDelConfidente(String(req.params.chiave))); });
router.put('/confidenti/:chiave/abilita/:rango', validate({ params: paramsRango, body: z.object({ abilita: z.array(z.object({ nome: z.string().trim().min(1).max(200), descrizione: z.string().max(2000) }).strict()).max(20) }).strict() }), (req, res) => {
  const p = req.params as unknown as { chiave: string; rango: number };
  res.json(impostaAbilita(p.chiave, p.rango, (req.body as { abilita: Array<{ nome: string; descrizione: string }> }).abilita));
});
router.post('/confidenti/:chiave/abilita/:rango/ripristina', validate({ params: paramsRango }), (req, res) => {
  const p = req.params as unknown as { chiave: string; rango: number };
  res.json(ripristinaAbilita(p.chiave, p.rango));
});

/** «Ripristina» della Dote a ogni incontro (la scrittura è `PUT …/doti-incontro`, che ora conserva la fotografia). */
router.post('/confidenti/:chiave/doti-incontro/:rango/ripristina', validate({ params: paramsRango }), (req, res) => {
  const p = req.params as unknown as { chiave: string; rango: number };
  ripristinaDoteIncontro(p.chiave, p.rango);
  res.json(dettaglioConfidente(p.chiave));
});

const scelta = z.object({ testo: z.string().trim().min(1).max(500), punti: z.number().min(0).max(100).nullable(), puntiTesto: z.string().max(200).nullable(), romantica: z.boolean(), avviso: z.string().max(500).nullable() }).strict();
router.put('/confidenti/:chiave/dialoghi/:id', validate({ params: paramsDialogo, body: z.object({ note: z.string().max(4000).optional(), scelte: z.array(scelta).max(40).optional() }).strict() }), (req, res) => {
  const p = req.params as unknown as { chiave: string; id: number };
  res.json(impostaDialogo(p.chiave, p.id, req.body as Parameters<typeof impostaDialogo>[2]));
});
router.post('/confidenti/:chiave/dialoghi/:id/ripristina', validate({ params: paramsDialogo }), (req, res) => {
  const p = req.params as unknown as { chiave: string; id: number };
  res.json(ripristinaDialogo(p.chiave, p.id));
});

/** Gli inviti del Confidente (R9-07c/1-2): la data è la chiave, quindi sta nel percorso e non si cambia. */
const dataInvito = z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
const paramsInvito = z.object({ chiave: z.string().min(1).max(200), data: dataInvito });
const corpoInvito = z.object({
  apre: z.object({ tipo: z.enum(['quartiere', 'luogo', 'area']), chiave: z.string().min(1).max(200) }).strict(),
  condizioni: z.array(condizioneSpillo).max(20),
  nota: z.string().max(500),
}).strict();
router.post('/confidenti/:chiave/inviti', validate({ params: paramsChiaveGuida, body: corpoInvito.extend({ data: dataInvito }).strict() }), (req, res) => {
  res.status(201).json(creaInvito(String(req.params.chiave), req.body as CorpoNuovoInvito));
});
router.put('/confidenti/:chiave/inviti/:data', validate({ params: paramsInvito, body: corpoInvito }), (req, res) => {
  const p = req.params as unknown as { chiave: string; data: string };
  res.json(modificaInvito(p.chiave, p.data, req.body as CorpoInvito));
});
router.post('/confidenti/:chiave/inviti/:data/ripristina', validate({ params: paramsInvito }), (req, res) => {
  const p = req.params as unknown as { chiave: string; data: string };
  res.json(ripristinaInvito(p.chiave, p.data));
});
router.delete('/confidenti/:chiave/inviti/:data', validate({ params: paramsInvito }), (req, res) => {
  const p = req.params as unknown as { chiave: string; data: string };
  eliminaInvito(p.chiave, p.data);
  res.status(204).end();
});

export default router;
