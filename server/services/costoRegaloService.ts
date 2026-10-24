// Ripristino mirato del costo di un regalo (rettifica G-034), senza cambiare identità o consegne del regalo.
// Dalla 212 il regalo è un oggetto del registro dei ripristini (`ripristino/righeConfidenti.ts`): la fotografia `seed_json` è quella del registro
// (`catalogo_chiave`, `dove`, `costo`, `sconsigliato`, `nota` com'erano nella guida). Questo ripristino rimette solo il costo e, se il resto della riga è
// uguale alla fotografia, la riga torna quella della guida (come «Ripristina» del registro).
import { z } from 'zod';
import { getDb, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { invalidaCacheDiGioco } from './cacheDiGioco.js';

const snapshotCosto = z.object({
  versione: z.literal(1), tipo: z.literal('costo-regalo'), confidente: z.literal('shinya'), ordine: z.literal(1),
  nome: z.literal('Modellino di moto'), costo: z.literal('3.600-4.800 yen (fonti discordanti)'),
}).strict();

/** La fotografia del registro: i valori della guida di un regalo corretto. */
const fotografiaRegistro = z.object({
  catalogo_chiave: z.string().nullable().optional(), dove: z.string().nullable().optional(), costo: z.string().nullable(),
  sconsigliato: z.boolean().optional(), nota: z.string().nullable().optional(),
}).passthrough();

export function costoPrecedenteRegalo(snapshot: string | null, confidente: string, ordine: number, nome: string): string | null {
  if (!snapshot) return null;
  let valore: unknown;
  try { valore = JSON.parse(snapshot); } catch { return null; }
  const registro = fotografiaRegistro.safeParse(valore);
  if (registro.success && typeof (valore as { tipo?: unknown }).tipo !== 'string') return registro.data.costo;
  const esito = snapshotCosto.safeParse(valore);
  return esito.success && esito.data.confidente === confidente && esito.data.ordine === ordine && esito.data.nome === nome ? esito.data.costo : null;
}

/** Il costo corrente è una precondizione esplicita: una correzione successiva non viene sovrascritta per errore. */
export function ripristinaCostoRegalo(confidente: string, ordine: number, costoAttuale: string | null): { ripristinato: true } {
  getDb().transaction(() => {
    const r = prepared('SELECT nome,costo,dove,sconsigliato,catalogo_chiave,nota,seed_json FROM confidente_regalo WHERE confidente_chiave = ? AND ordine = ?').get(confidente, ordine) as
      { nome: string; costo: string | null; dove: string | null; sconsigliato: number; catalogo_chiave: string | null; nota: string | null; seed_json: string | null } | undefined;
    if (!r) throw httpErrors.notFound('regalo-non-trovato', 'Regalo non trovato.');
    const precedente = costoPrecedenteRegalo(r.seed_json, confidente, ordine, r.nome);
    if (precedente === null) throw httpErrors.conflict('costo-regalo-senza-snapshot', 'Non è disponibile una copia valida del costo precedente di questo regalo.');
    if (r.costo !== costoAttuale) throw httpErrors.conflict('costo-regalo-cambiato', 'Il costo è cambiato: riapri la scheda prima di ripristinarlo.');
    prepared('UPDATE confidente_regalo SET costo = ? WHERE confidente_chiave = ? AND ordine = ? AND costo IS ?').run(precedente, confidente, ordine, costoAttuale);
    // se, rimesso il costo, la riga è uguale alla fotografia del registro, la riga è di nuovo quella della guida
    try {
      const f = JSON.parse(r.seed_json!) as Record<string, unknown>;
      const uguale = (a: unknown, b: unknown): boolean => (a ?? null) === (b ?? null);
      if (typeof f.tipo !== 'string' && uguale(f.catalogo_chiave, r.catalogo_chiave) && uguale(f.dove, r.dove) && uguale(f.nota, r.nota) && (f.sconsigliato === undefined || f.sconsigliato === (r.sconsigliato === 1))) {
        prepared("UPDATE confidente_regalo SET origine = 'seed', seed_json = NULL, updated_at = NULL WHERE confidente_chiave = ? AND ordine = ?").run(confidente, ordine);
      }
    } catch { /* fotografia di prima della 212: niente da riallineare */ }
  })();
  invalidaCacheDiGioco();
  return { ripristinato: true };
}
