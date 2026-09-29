// ============================================================
// VociAgenda — le voci dell'utente dentro «Di giorno» / «Di sera»: cose da fare (con spunta) ed eventi (senza)
// ============================================================
//
// Stanno nella stessa lista delle azioni della guida, con lo stesso passo di riga, e si distinguono dal cartellino
// («La mia», «Evento», «Scadenza», «Promemoria»). Le voci senza partita valgono per tutte le partite e lo dichiarano.
// ============================================================

import { IconaCategoria } from './IconaCategoria';
import { GestiVoce, PulsanteMenuVoce, type GestoVoce } from './MenuVoce';
import { NOME_TIPO_EVENTO } from '../../utils/percorso';
import type { AzioneUtenteDto, EventoUtenteDto } from '../../types';

/** Categoria del cartiglio: la trama per ciò che succede, gli appunti per una scadenza, il segno generico per un promemoria. */
const ICONA_EVENTO: Record<EventoUtenteDto['tipo'], string> = { evento: 'trama', scadenza: 'esame', promemoria: 'altro' };

interface PropsMenu {
  menuAperto: boolean;
  onMenu: (aperto: boolean) => void;
  gesti: GestoVoce[];
  occupato: boolean;
}

/** Cosa da fare dell'utente: spunta per partita, testo, note, menu dei gesti. */
export function VoceMia({ a, partitaId, onSpunta, menuAperto, onMenu, gesti, occupato }: PropsMenu & { a: AzioneUtenteDto; partitaId: number | null; onSpunta: (fatta: boolean) => void }) {
  return (
    <li className={`azione flex flex-wrap items-start gap-2 py-1.5 ${a.fatta ? 'opacity-60' : ''}`}>
      {/* la casella da sola è 20 px: l'etichetta attorno la rende toccabile per 44 senza cambiarne l'aspetto */}
      {partitaId && <label className="touch flex items-start justify-center shrink-0 -my-1 pr-1 cursor-pointer"><input type="checkbox" className="w-5 h-5 mt-2 shrink-0" checked={a.fatta} disabled={occupato} onChange={(e) => onSpunta(e.target.checked)} aria-label={`Fatto: ${a.azione.slice(0, 60)}`} /></label>}
      <IconaCategoria categoria={a.tipo} dimensione={40} />
      <div className="flex flex-col gap-0.5 text-[13px] min-w-0 flex-1">
        <span className={a.fatta ? 'line-through' : ''}>{a.azione}</span>
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="chip chip--attivo text-[11px]">La mia</span>
          {a.note && <span className="text-[12px] text-text-secondary">{a.note}</span>}
          {a.partitaId === null && <span className="text-[11px] text-text-muted">tutte le partite</span>}
        </span>
      </div>
      <PulsanteMenuVoce voce={a.azione} aperto={menuAperto} onCambia={onMenu} disabled={occupato} uscita="elimina" />
      {menuAperto && <GestiVoce gesti={gesti} disabled={occupato} etichetta={`Gesti per: ${a.azione.slice(0, 60)}`} />}
    </li>
  );
}

/** Evento dell'utente: niente spunta (è qualcosa che succede, non da fare), cartellino del tipo, menu dei gesti. */
export function VoceEvento({ e, menuAperto, onMenu, gesti, occupato }: PropsMenu & { e: EventoUtenteDto }) {
  return (
    <li className="azione flex flex-wrap items-start gap-2 py-1.5">
      <IconaCategoria categoria={ICONA_EVENTO[e.tipo]} dimensione={40} />
      <div className="flex flex-col gap-0.5 text-[13px] min-w-0 flex-1">
        <span>{e.titolo}</span>
        <span className="flex flex-wrap items-center gap-1.5">
          <span className={`chip text-[11px] ${e.tipo === 'scadenza' ? 'chip--oro' : 'chip--attivo'}`}>{NOME_TIPO_EVENTO[e.tipo]}</span>
          {e.dettaglio && <span className="text-[12px] text-text-secondary">{e.dettaglio}</span>}
          {e.partitaId === null && <span className="text-[11px] text-text-muted">tutte le partite</span>}
        </span>
      </div>
      <PulsanteMenuVoce voce={e.titolo} aperto={menuAperto} onCambia={onMenu} disabled={occupato} uscita="elimina" />
      {menuAperto && <GestiVoce gesti={gesti} disabled={occupato} etichetta={`Gesti per: ${e.titolo.slice(0, 60)}`} />}
    </li>
  );
}
