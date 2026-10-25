// ============================================================
// TitoloSezione — il titolo (h2) di una sezione, in due varianti (lotto B, revisione UX/UI del 2026-10-25)
// ============================================================
//
// I titoli delle sezioni seguivano cinque ricette scritte a mano (sans 15 grassetto, display 15, display 17, `text-lg`, e un h2 nudo
// che in Libri e Film sembrava testo normale). Ne restano due, con la scala in `tailwind.css` (`.titolo-sezione`):
//
// - `display`: il titolo di un blocco della pagina («Dove si trova», «Negozi qui»), nel carattere display a 17 px — la soglia della
//   regola «Leggibilità prima dello stile» (2026-09-04: i font P5 solo da 17 px in su);
// - `sans` (default): il titolo di un riquadro di contenuto fitto («Skill», «Regali graditi»), in sans grassetto.
//
// Con `azioni` il titolo sta in una riga con i comandi della sezione allineati a destra (vanno a capo se non c'è spazio).
// ============================================================

import type { ReactNode } from 'react';

export type VarianteTitoloSezione = 'display' | 'sans';

interface Props {
  children: ReactNode;
  variante?: VarianteTitoloSezione;
  /** Il livello del titolo: h2 (default) o h3 per una sotto-sezione. */
  livello?: 2 | 3;
  id?: string;
  /** Comandi della sezione, a destra del titolo. */
  azioni?: ReactNode;
  className?: string;
}

/** Titolo di sezione: `display` per i blocchi della pagina, `sans` per i riquadri di contenuto. */
export function TitoloSezione({ children, variante = 'sans', livello = 2, id, azioni, className = '' }: Props) {
  const Tag = livello === 3 ? 'h3' : 'h2';
  const titolo = <Tag id={id} className={`titolo-sezione titolo-sezione--${variante} ${azioni ? 'min-w-0' : className}`}>{children}</Tag>;
  if (!azioni) return titolo;
  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 ${className}`}>
      {titolo}
      <div className="flex flex-wrap items-center gap-1.5">{azioni}</div>
    </div>
  );
}
