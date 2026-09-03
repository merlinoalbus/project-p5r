// ============================================================
// Route /api/mappe — marcatori delle mappe interattive (dati dell'utente, condivisi fra le partite)
// ============================================================

import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { impostaMarcatore } from '../services/dungeonService.js';

const bodyMarcatore = z.object({ punto: z.string().min(1).max(200), x: z.number().min(0).max(100).nullable(), y: z.number().min(0).max(100).nullable() });
const router = Router();

/** Fissa (x, y in percentuale) o rimuove (x/y null) lo spillo del punto sulla mappa della sua area. */
router.put('/marcatori', validate({ body: bodyMarcatore }), (req, res) => {
  const b = req.body as { punto: string; x: number | null; y: number | null };
  res.json({ punto: b.punto, marcatore: impostaMarcatore(b.punto, b.x === null || b.y === null ? null : { x: b.x, y: b.y }) });
});

export default router;
