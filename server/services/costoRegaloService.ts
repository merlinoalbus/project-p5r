// Ripristino mirato della rettifica G-034, senza cambiare identità o consegne del regalo.
import { z } from 'zod';
import { getDb, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { invalidaCacheDiGioco } from './cacheDiGioco.js';

const snapshotCosto = z.object({
  versione: z.literal(1), tipo: z.literal('costo-regalo'), confidente: z.literal('shinya'), ordine: z.literal(1),
  nome: z.literal('Modellino di moto'), costo: z.literal('3.600-4.800 yen (fonti discordanti)'),
}).strict();

export function costoPrecedenteRegalo(snapshot: string | null, confidente: string, ordine: number, nome: string): string | null {
  if (!snapshot) return null;
  let valore: unknown;
  try { valore = JSON.parse(snapshot); } catch { return null; }
  const esito = snapshotCosto.safeParse(valore);
  return esito.success && esito.data.confidente === confidente && esito.data.ordine === ordine && esito.data.nome === nome ? esito.data.costo : null;
}

/** Il costo corrente è una precondizione esplicita: una correzione successiva non viene sovrascritta per errore. */
export function ripristinaCostoRegalo(confidente: string, ordine: number, costoAttuale: string | null): { ripristinato: true } {
  getDb().transaction(() => {
    const r = prepared('SELECT nome,costo,seed_json FROM confidente_regalo WHERE confidente_chiave = ? AND ordine = ?').get(confidente, ordine) as { nome: string; costo: string | null; seed_json: string | null } | undefined;
    if (!r) throw httpErrors.notFound('regalo-non-trovato', 'Regalo non trovato.');
    const precedente = costoPrecedenteRegalo(r.seed_json, confidente, ordine, r.nome);
    if (precedente === null) throw httpErrors.conflict('costo-regalo-senza-snapshot', 'Non è disponibile una copia valida del costo precedente di questo regalo.');
    if (r.costo !== costoAttuale) throw httpErrors.conflict('costo-regalo-cambiato', 'Il costo è cambiato: riapri la scheda prima di ripristinarlo.');
    prepared('UPDATE confidente_regalo SET costo = ? WHERE confidente_chiave = ? AND ordine = ? AND costo IS ?').run(precedente, confidente, ordine, costoAttuale);
  })();
  invalidaCacheDiGioco();
  return { ripristinato: true };
}
