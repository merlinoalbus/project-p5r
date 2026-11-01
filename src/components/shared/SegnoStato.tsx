// ============================================================
// SegnoStato — il segno di una riga chiusa: «fatto» (spunta rossa) o «esaurito» (cerchio barrato grigio)
// ============================================================
//
// Decisione D15 (opzione C, 01/11): una riga fatta o esaurita non si attenua più con l'opacità (abbassava il contrasto del testo a
// 1,9–3,4:1). Mostra a sinistra questo segno e ha il testo barrato in un grigio leggibile (classi `.stato-fatto` e `.stato-esaurito`
// di `tailwind.css`, da mettere sul testo del nome nei punti di chiamata: sono letterali, mai interpolate).
//
// Il segno è decorativo (`aria-hidden`): lo stato a parole c'è già nella riga (chip, «· ottenuto», titolo). `testo` si passa solo dove
// non c'è altro che lo dica: diventa testo per i soli lettori di schermo. `riserva` lascia lo spazio vuoto del segno nelle righe non
// chiuse, per tenere allineato un elenco che alterna righe aperte e chiuse.
// ============================================================

import { IconSpunta } from './iconeGuida';

export type StatoSegno = 'fatto' | 'esaurito';

interface Props {
  /** Lo stato da mostrare; assente = la riga non è chiusa (niente segno, o solo lo spazio se `riserva`). */
  stato: StatoSegno | null | undefined;
  /** Lato in px (default 16). */
  dimensione?: number;
  /** true: senza stato lascia lo spazio del segno, invisibile, per l'allineamento dell'elenco. */
  riserva?: boolean;
  /** Lo stato a parole per i lettori di schermo, solo se la riga non lo dice già. */
  testo?: string;
  /** Margini e allineamento scelti da chi lo mette (classi letterali). */
  className?: string;
}

/** Il segno di una riga fatta (spunta rossa del tema) o esaurita (cerchio barrato in grigio). */
export function SegnoStato({ stato, dimensione = 16, riserva = false, testo, className = '' }: Props) {
  const misura = { width: dimensione, height: dimensione };
  if (!stato) return riserva ? <span className={`segno-stato ${className}`} style={misura} aria-hidden="true" /> : null;
  return (
    <span className={`segno-stato ${stato === 'fatto' ? 'segno-stato--fatto' : 'segno-stato--esaurito'} ${className}`} style={misura}>
      {stato === 'fatto'
        ? <IconSpunta size={dimensione} />
        : (
          <svg width={dimensione} height={dimensione} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" />
          </svg>
        )}
      {testo ? <span className="sr-only">{testo}</span> : null}
    </span>
  );
}
