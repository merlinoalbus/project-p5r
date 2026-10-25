// ============================================================
// SceltaImmagine — la scelta del file di una planimetria, con anteprima e i limiti del server (L2, 2026-10-20)
// ============================================================
//
// Le finestre «Aggiungi area» e «Aggiungi planimetria» chiedono la stessa cosa: un'immagine PNG, JPEG o WEBP fino a 8 MB
// (`erroreImmagine` in utils/aree.ts).
// ============================================================

import { useEffect, useId, useMemo } from 'react';
import { FORMATI_PLANIMETRIA, erroreImmagine } from '../../utils/aree';

interface Props {
  file: File | null;
  onCambia: (file: File | null) => void;
  /** Etichetta del campo (predefinita «Immagine della planimetria»). */
  etichetta?: string;
}

/** Il campo del file con l'anteprima dell'immagine scelta e l'eventuale errore (formato o peso). */
export function SceltaImmagine({ file, onCambia, etichetta = 'Immagine della planimetria' }: Props) {
  const id = useId();
  // l'indirizzo locale dell'anteprima vive quanto il file scelto: si libera quando cambia o quando la finestra si chiude
  const anteprima = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (anteprima) URL.revokeObjectURL(anteprima); }, [anteprima]);
  const errore = file ? erroreImmagine(file) : null;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="testo-13 font-semibold">{etichetta}</label>
      <input id={id} type="file" accept={FORMATI_PLANIMETRIA.join(',')} className="form-input touch"
        onChange={(e) => onCambia(e.currentTarget.files?.[0] ?? null)} />
      <span className="testo-12 text-text-muted">PNG, JPEG o WEBP, fino a 8 MB. Resta nella tua istanza.</span>
      {anteprima && !errore && <img src={anteprima} alt="Anteprima dell’immagine scelta" className="max-h-48 w-full rounded border border-border object-contain bg-[#0f0f14]" />}
      {errore && <p className="m-0 testo-13 text-error" role="alert">{errore}</p>}
    </div>
  );
}
