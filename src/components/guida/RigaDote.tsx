// ============================================================
// RigaDote — una Dote con le sue note (♪, ♪♪, ♪♪♪): la scelta usata dagli effetti delle azioni e dalla Dote a ogni incontro
// ============================================================

import { Selettore } from '../shared/Selettore';
import { Segmenti } from '../shared/Segmenti';
import { type DoteNote } from '../../../shared/effettiAzione';
import { DOTI_SOCIALI, type DoteChiave } from '../../../shared/doti';

const NOTE = [{ chiave: '1', nome: '♪' }, { chiave: '2', nome: '♪♪' }, { chiave: '3', nome: '♪♪♪' }] as const;

/** Selettore della Dote e segmenti delle note (1–3) affiancati; ogni cambio passa al genitore la coppia aggiornata. */
export function RigaDote({ dote, onCambia, etichetta }: { dote: DoteNote; onCambia: (d: DoteNote) => void; etichetta: string }) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Selettore className="min-w-[10rem] flex-1" etichetta={etichetta} valore={dote.dote} opzioni={DOTI_SOCIALI.map((d) => ({ chiave: d.chiave, nome: d.nome }))} onCambia={(v) => onCambia({ ...dote, dote: v as DoteChiave })} />
      <Segmenti etichetta="Note" valore={String(dote.note) as '1' | '2' | '3'} opzioni={NOTE} onCambia={(v) => onCambia({ ...dote, note: Number(v) as 1 | 2 | 3 })} />
    </div>
  );
}
