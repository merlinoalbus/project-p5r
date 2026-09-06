import { z } from 'zod';
import { prepared } from '../../db/dbService.js';
import { chiaveMappa, idMappa } from './percorsiMappe.js';
import { httpErrors } from '../../utils/httpError.js';
import type { DestinazioneSpillo } from '../../../shared/types.js';

export const schemaDestinazioneSpillo = z.object({
  mappa: z.string().min(1).max(180), x: z.number().min(0).max(100),
  y: z.number().min(0).max(100), zoom: z.number().min(1).max(6),
}).strict();

/** Resolves aliases before storing; optional incoming maps are only for import preflight. */
export function verificaDestinazioneSpillo(value: unknown, incoming: Set<string> = new Set()): DestinazioneSpillo | null | undefined {
  if (value === null || value === undefined) return value;
  const result = schemaDestinazioneSpillo.safeParse(value);
  if (!result.success) throw httpErrors.badRequest('destinazione-non-valida', 'Indica una mappa e un punto di arrivo valido, con ingrandimento tra 1 e 6.');
  const mappa = idMappa(result.data.mappa);
  if (!incoming.has(mappa) && !prepared('SELECT 1 FROM mappa WHERE chiave=?').get(mappa)) {
    throw httpErrors.notFound('destinazione-non-trovata', 'La mappa di arrivo non esiste.');
  }
  return { ...result.data, mappa };
}

export function leggiDestinazioneSpillo(id: number): { destinazione: DestinazioneSpillo | null; destinazioneNonDisponibile: boolean } {
  const r = prepared('SELECT mappa_chiave,x,y,zoom FROM spillo_destinazione WHERE spillo_id=?').get(id) as {mappa_chiave: string|null; x:number; y:number; zoom:number}|undefined;
  return { destinazione: r?.mappa_chiave ? {mappa:chiaveMappa(r.mappa_chiave),x:r.x,y:r.y,zoom:r.zoom}:null,
    destinazioneNonDisponibile: !!r && r.mappa_chiave === null };
}

/** undefined preserves; null removes. Tombstones prevent silently reverting to another link. */
export function salvaDestinazioneSpillo(id:number, value:DestinazioneSpillo|null|undefined, invalidata=false):void {
  if (value === undefined && !invalidata) return;
  if (value === null && !invalidata) { prepared('DELETE FROM spillo_destinazione WHERE spillo_id=?').run(id); return; }
  prepared(`INSERT INTO spillo_destinazione VALUES(?,?,?,?,?) ON CONFLICT(spillo_id) DO UPDATE SET
    mappa_chiave=excluded.mappa_chiave,x=excluded.x,y=excluded.y,zoom=excluded.zoom`).run(id,value?.mappa??null,value?.x??0,value?.y??0,value?.zoom??1);
}
