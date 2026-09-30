// ============================================================
// MenuVoce — i gesti su una voce della giornata (azione, cosa da fare, evento): Modifica, Sposta su/giù, Sposta di fascia, Elimina
// ============================================================
//
// Un solo pulsante a icona per riga (44 px) apre sotto la voce la fila dei gesti: su un telefono quattro pulsanti su ogni
// riga di una giornata da otto azioni coprirebbero il testo, chiusi invece la riga resta com'era. La fila occupa tutta la
// larghezza della riga (sotto casella, immagine e testo) e va a capo da sola sui tre formati.
// ============================================================

import type { ReactNode } from 'react';
import { PulsanteVisivo, type TonoPulsante } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

export interface GestoVoce {
  chiave: string;
  titolo: string;
  icona: ReactNode;
  onClick: () => void;
  tono?: TonoPulsante;
}

interface PropsPulsante {
  /** Testo della voce, per il nome accessibile. */
  voce: string;
  aperto: boolean;
  onCambia: (aperto: boolean) => void;
  disabled?: boolean;
}

/** Il pulsante che apre e chiude i gesti della voce. */
export function PulsanteMenuVoce({ voce, aperto, onCambia, disabled }: PropsPulsante) {
  return (
    <button type="button" className={`btn btn-sm touch shrink-0 self-start ${aperto ? 'btn-primary' : 'btn-ghost'}`} disabled={disabled} aria-expanded={aperto} aria-label={`Modifica, sposta o elimina: ${voce.slice(0, 60)}`} onClick={() => onCambia(!aperto)}>
      <IconaAzione chiave="dettagli" dimensione={20} />
    </button>
  );
}

/** La fila dei gesti, mostrata sotto la voce quando il menu è aperto. */
export function GestiVoce({ gesti, disabled, etichetta, voce }: { gesti: GestoVoce[]; disabled?: boolean; etichetta: string; /** Identità della voce: chi sposta la voce ritrova la sua fila (e ci rimette il fuoco). */ voce?: string }) {
  return (
    // `basis-full`: nella riga (flex a capo) la fila va sotto tutta la voce e ne prende l'intera larghezza, non la colonna stretta del testo
    <div className="flex flex-wrap justify-end gap-1.5 basis-full" role="group" aria-label={etichetta} data-voce={voce}>
      {gesti.map((g) => <PulsanteVisivo key={g.chiave} compatto tono={g.tono ?? 'secondario'} icona={g.icona} titolo={g.titolo} disabled={disabled} onClick={g.onClick} />)}
    </div>
  );
}
