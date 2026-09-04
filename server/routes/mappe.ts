// ============================================================
// Route /api/mappe — marcatori delle mappe interattive (dati dell'utente, condivisi fra le partite)
// ============================================================

import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { impostaMarcatore, scaricaPianta } from '../services/dungeonService.js';
import { impostaMarcatoreLuogo, scaricaPiantaQuartiere } from '../services/cittaService.js';

const bodyMarcatoreLuogo = z.object({ luogo: z.string().min(1).max(200), x: z.number().min(0).max(100).nullable(), y: z.number().min(0).max(100).nullable() });

const bodyMarcatore = z.object({ punto: z.string().min(1).max(200), x: z.number().min(0).max(100).nullable(), y: z.number().min(0).max(100).nullable() });
const router = Router();

/** Fissa (x, y in percentuale) o rimuove (x/y null) lo spillo del punto sulla mappa della sua area. */
router.put('/marcatori', validate({ body: bodyMarcatore }), (req, res) => {
  const b = req.body as { punto: string; x: number | null; y: number | null };
  res.json({ punto: b.punto, marcatore: impostaMarcatore(b.punto, b.x === null || b.y === null ? null : { x: b.x, y: b.y }) });
});

/** Scarica nell'istanza la pianta dell'area dalla guida collegata nel seed (immagine mai nel repository). */
router.post('/piante/:area/scarica', validate({ params: z.object({ area: z.string().min(1).max(120) }) }), async (req, res) => {
  res.status(201).json(await scaricaPianta(String(req.params.area)));
});

/** Fissa o rimuove lo spillo di un luogo sulla mappa del quartiere. */
router.put('/marcatori-luoghi', validate({ body: bodyMarcatoreLuogo }), (req, res) => {
  const b = req.body as { luogo: string; x: number | null; y: number | null };
  res.json({ luogo: b.luogo, marcatore: impostaMarcatoreLuogo(b.luogo, b.x === null || b.y === null ? null : { x: b.x, y: b.y }) });
});

/** Scarica nell'istanza la mappa del quartiere dalla fonte collegata nel seed. */
router.post('/piante-citta/:quartiere/scarica', validate({ params: z.object({ quartiere: z.string().min(1).max(80) }) }), async (req, res) => {
  res.status(201).json(await scaricaPiantaQuartiere(String(req.params.quartiere)));
});

export default router;
