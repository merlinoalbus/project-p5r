import { prepared } from '../db/dbService.js';
import { leggiVociEffetto } from '../../shared/effettiCatalogo.js';
import { descriviEffettoAzione, type DoteNote } from '../../shared/effettiAzione.js';
import type { ConfidenteDettaglioDto } from '../../shared/types.js';

/** Lettura canonica condivisa: nessuna copia negli effetti dell'attività. */
export function dotiIncontro(chiave: string): ConfidenteDettaglioDto['dotiIncontro'] {
  const righe = new Map((prepared('SELECT verso_rango, effetti_json FROM confidente_dote_incontro WHERE confidente_chiave = ?').all(chiave) as Array<{ verso_rango: number; effetti_json: string | null }>).map(r => [r.verso_rango, r.effetti_json]));
  return Array.from({ length: 10 }, (_, i) => i + 1).map(rango => {
    const doti = leggiVociEffetto(righe.get(rango) ?? null).filter(v => v.effetto.famiglia === 'dote')
      .map(v => ({ dote: (v.effetto as { dote: string }).dote as DoteNote['dote'], note: Math.min(3, Math.max(1, (v.effetto as { note: number }).note)) as 1 | 2 | 3 }));
    return { rango, doti, testo: doti.map(d => descriviEffettoAzione({ tipo: 'dote', ...d })).join(' · ') };
  });
}
