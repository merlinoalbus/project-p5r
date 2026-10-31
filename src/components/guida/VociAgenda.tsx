// ============================================================
// VociAgenda — le voci della giornata che non si spuntano: i promemoria
// ============================================================
//
// Stanno nella stessa lista delle azioni, al loro posto nell'ordine della giornata e con lo stesso passo di riga; si
// distinguono dal cartellino («Promemoria») e non hanno la casella. Un'azione (della guida o aggiunta
// dall'utente: dal 2026-09-30 sono tutte canone, per tutte le partite) è la riga `Azione` di GiornoGuida.
// ============================================================

import { IconaCategoria } from './IconaCategoria';
import type { ReactNode } from 'react';
import { ComandiVoce, TestoSelezioneRiga, type GestoVoce, type SelezioneRiga } from './MenuVoce';
import { classeSelezioneRiga } from '../../utils/selezioneRiga';
import { NOME_TIPO_EVENTO } from '../../utils/percorso';
import { TestoNote } from '../shared/TestoNote';
import type { AzionePercorsoDto, GenereVoce } from '../../types';

/** Categoria del cartiglio: la trama per ciò che succede, gli appunti per una scadenza, il segno generico per un promemoria. */
const ICONA_EVENTO: Record<Exclude<GenereVoce, 'azione'>, string> = { promemoria: 'altro' };

interface Props {
  e: AzionePercorsoDto & { genere: Exclude<GenereVoce, 'azione'> };
  menuAperto: boolean;
  onMenu: (aperto: boolean) => void;
  /** Gesti della voce: assenti = riga di sola lettura, senza menu (istanza di rilascio). */
  gesti?: GestoVoce[];
  occupato: boolean;
  /** Riordino per trascinamento: la maniglia ⠿ (in testa alla riga), il riferimento della riga e le classi dello stato di trascinamento. */
  maniglia?: ReactNode;
  rifRiga?: (el: HTMLElement | null) => void;
  classeRiga?: string;
  /** Appunti del Diario (2026-10-26): la riga selezionata o tagliata e i suoi gestori del puntatore; assente nel rilascio. */
  selezione?: SelezioneRiga;
}

/** Evento, scadenza o promemoria: niente spunta (è qualcosa che succede, non da fare), cartellino del genere, menu dei gesti. */
export function VoceEvento({ e, menuAperto, onMenu, gesti, occupato, maniglia, rifRiga, classeRiga, selezione }: Props) {
  return (
    <li id={`voce-${e.uid}`} ref={rifRiga} className={`azione flex flex-wrap items-start gap-2 py-1.5 ${classeRiga ?? ''} ${classeSelezioneRiga(selezione)}`} {...selezione?.gestori}>
      {maniglia}
      <IconaCategoria categoria={ICONA_EVENTO[e.genere]} dimensione={40} />
      <div className="flex flex-col gap-0.5 testo-13 min-w-0 flex-1">
        <span>{e.azione}<TestoSelezioneRiga s={selezione} /></span>
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="chip testo-12 chip--attivo">{NOME_TIPO_EVENTO[e.genere]}</span>
          {e.note && <span className="testo-12 text-text-secondary"><TestoNote testo={e.note} daParole="guida" /></span>}
        </span>
      </div>
      {/* C9: Modifica ed Elimina a vista, gli altri gesti nel menu a tendina del «⋯» (MenuVoce); sul telefono in una fila a sé in fondo alla voce */}
      {gesti && <span className="comandi-voce__posto"><ComandiVoce voce={e.azione} uid={e.uid} gesti={gesti} aperto={menuAperto} onCambia={onMenu} disabled={occupato} /></span>}
    </li>
  );
}
