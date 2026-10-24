// ============================================================
// DialogoRango — un dialogo di rango di un Confidente: le scelte in ordine con le migliori evidenziate
// ============================================================
//
// Nato dentro la scheda del Confidente (`ConfidenteDettaglioPage`) e spostato qui perché lo usa anche la scheda «Confidenti» della
// partita (`DettaglioConfidente`, sezione «Risposte migliori»): stesso componente, stesso comportamento, nessuna copia.
// ============================================================

import type { ReactNode } from 'react';
import type { DialogoConfidenteDto } from '../../types';

/** Un dialogo di rango: scelte in ordine, con le migliori evidenziate (punti massimi), le romantiche e gli avvisi. */
export function DialogoRango({ d, aperto, onToggle, azioni }: { d: DialogoConfidenteDto; aperto: boolean; onToggle: () => void; azioni?: ReactNode }) {
  const max = Math.max(0, ...d.scelte.map((s) => s.punti ?? 0));
  return (
    <li className="border border-border-light rounded-lg">
      {/* Il rango e il conteggio non si spezzano e non si comprimono: senza `shrink-0` la nota in
          mezzo si prendeva tutta la riga e loro finivano incolonnati lettera per lettera — «R a n g
          o 1» alto 135 px sul telefono. La nota, che è la parte elastica, va a capo per prima. */}
      <div className="flex items-center gap-1 pr-2">
      <button type="button" className="min-w-0 flex-1 text-left px-3 py-2 flex flex-wrap items-center gap-x-2 gap-y-1 touch" onClick={onToggle} aria-expanded={aperto}>
        <span className="font-semibold shrink-0 whitespace-nowrap">Rango {d.etichetta}</span>
        <span className="min-w-0 flex-1 text-[12px] text-text-muted">{d.note}</span>
        <span className="shrink-0 whitespace-nowrap text-[12px] text-text-muted">{d.scelte.length} {d.scelte.length === 1 ? 'scelta' : 'scelte'}</span>
      </button>
      {azioni && <div className="flex shrink-0 items-center gap-1">{azioni}</div>}
      </div>
      {/* Un rango senza scelte da fare esiste — il primo e l'ultimo di molti Confidenti — e aprendolo
          restava una striscia di dodici pixel di solo padding: il vuoto non dice che non c'è niente,
          lo fa solo sembrare rotto (rilievo del validatore, 2026-09-13). */}
      {aperto && d.scelte.length === 0 && (
        <p className="m-0 px-3 pb-3 text-[13px] text-text-muted">Nessuna scelta da fare in questo rango.</p>
      )}
      {aperto && d.scelte.length > 0 && (
        <ol className="m-0 px-3 pb-3 list-none flex flex-col gap-1 text-[13px]" aria-label={`Scelte del rango ${d.etichetta}`}>
          {d.scelte.map((s) => (
            <li key={s.ordine} className={`flex flex-wrap items-center gap-2 rounded-md px-2 py-1 ${s.punti !== null && s.punti === max && max > 0 ? 'bg-primary-bg' : ''}`}>
              <span className="text-text-muted w-5">{s.ordine}.</span>
              <span className={s.romantica ? 'text-primary font-semibold' : ''}>{s.testo}</span>
              {s.puntiTesto && <span className="chip" title="Punti secondo la guida">{s.puntiTesto}</span>}
              {s.romantica && <span className="chip chip--attivo" title="Scelta che avvia o riguarda la relazione romantica">romantica</span>}
              {s.avviso && <span className="text-[12px] text-warning">{s.avviso}</span>}
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}
