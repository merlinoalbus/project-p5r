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
import { GestiVoce, PulsanteMenuVoce, type GestoVoce } from './MenuVoce';
import { NOME_TIPO_EVENTO } from '../../utils/percorso';
import type { AzionePercorsoDto, GenereVoce } from '../../types';

/** Categoria del cartiglio: la trama per ciò che succede, gli appunti per una scadenza, il segno generico per un promemoria. */
const ICONA_EVENTO: Record<Exclude<GenereVoce, 'azione'>, string> = { promemoria: 'altro' };

interface Props {
  e: AzionePercorsoDto & { genere: Exclude<GenereVoce, 'azione'> };
  menuAperto: boolean;
  onMenu: (aperto: boolean) => void;
  gesti: GestoVoce[];
  occupato: boolean;
  dichiarazioni?: ReactNode;
  /** Riordino per trascinamento: la maniglia ⠿ (in testa alla riga), il riferimento della riga e le classi dello stato di trascinamento. */
  maniglia?: ReactNode;
  rifRiga?: (el: HTMLElement | null) => void;
  classeRiga?: string;
}

/** Evento, scadenza o promemoria: niente spunta (è qualcosa che succede, non da fare), cartellino del genere, menu dei gesti. */
export function VoceEvento({ e, menuAperto, onMenu, gesti, occupato, dichiarazioni, maniglia, rifRiga, classeRiga }: Props) {
  return (
    <li id={`voce-${e.uid}`} ref={rifRiga} className={`azione flex flex-wrap items-start gap-2 py-1.5 ${classeRiga ?? ''}`}>
      {maniglia}
      <IconaCategoria categoria={ICONA_EVENTO[e.genere]} dimensione={40} />
      <div className="flex flex-col gap-0.5 text-[13px] min-w-0 flex-1">
        <span>{e.azione}</span>
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="chip text-[11px] chip--attivo">{NOME_TIPO_EVENTO[e.genere]}</span>
          {e.note && <span className="text-[12px] text-text-secondary">{e.note}</span>}
        </span>
        {dichiarazioni}
      </div>
      <PulsanteMenuVoce voce={e.azione} aperto={menuAperto} onCambia={onMenu} disabled={occupato} />
      {menuAperto && <GestiVoce gesti={gesti} disabled={occupato} etichetta={`Gesti per: ${e.azione.slice(0, 60)}`} voce={e.uid} />}
    </li>
  );
}
