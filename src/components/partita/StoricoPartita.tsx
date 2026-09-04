// ============================================================
// StoricoPartita — cronologia degli eventi della partita con filtri per gruppo, paginazione ed eliminazione
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { eliminaEvento, getStorico } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { GRUPPI_EVENTO, tipiDelGruppo } from '../../../shared/eventi';
import { EmptyState, Spinner } from '../shared/PageState';
import type { EventoPartitaDto } from '../../types';
import { ImmagineEntita } from '../shared/ImmagineEntita';

interface Props {
  partitaId: number;
  /** Numero di eventi per pagina (default 30). */
  perPagina?: number;
  /** Modalità compatta (Riepilogo): niente filtri né eliminazione, solo le ultime voci. */
  compatto?: boolean;
}

type Gruppo = (typeof GRUPPI_EVENTO)[number]['chiave'] | 'tutti';

/** Pagine caricate con «Carica altri», legate al filtro per cui sono state richieste. */
interface PagineExtra {
  chiave: string;
  eventi: EventoPartitaDto[];
  prossimo: number | null;
}

/** Data e ora in italiano, breve. */
function formattaIstante(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function StoricoPartita({ partitaId, perPagina = 30, compatto = false }: Props) {
  const [gruppo, setGruppo] = useState<Gruppo>('tutti');
  const tipi = gruppo === 'tutti' ? undefined : tipiDelGruppo(gruppo);
  const chiave = `${partitaId}|${perPagina}|${gruppo}`;
  const prima = useCarica(() => getStorico(partitaId, { limite: perPagina, prima: undefined, tipi }), [partitaId, perPagina, gruppo]);
  const [extra, setExtra] = useState<PagineExtra | null>(null);
  const [caricamentoAltri, setCaricamentoAltri] = useState(false);
  const [eliminati, setEliminati] = useState<Record<number, true>>({});

  const extraValide = extra && extra.chiave === chiave ? extra : null;
  const eventi = prima.dati ? [...prima.dati.eventi, ...(extraValide?.eventi ?? [])].filter((e) => !eliminati[e.id]) : null;
  const prossimo = extraValide ? extraValide.prossimo : prima.dati?.prossimo ?? null;
  const totale = prima.dati ? Math.max(0, prima.dati.totale - Object.keys(eliminati).length) : 0;

  const caricaAltri = async () => {
    if (prossimo === null) return;
    setCaricamentoAltri(true);
    try {
      const r = await getStorico(partitaId, { limite: perPagina, prima: prossimo, tipi });
      setExtra((e) => ({ chiave, eventi: [...(e && e.chiave === chiave ? e.eventi : []), ...r.eventi], prossimo: r.prossimo }));
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Caricamento fallito.');
    } finally {
      setCaricamentoAltri(false);
    }
  };

  const elimina = async (e: EventoPartitaDto) => {
    if (!window.confirm(`Eliminare la voce «${e.titolo}» dallo storico? La modifica registrata resta valida.`)) return;
    try {
      await eliminaEvento(partitaId, e.id);
      setEliminati((m) => ({ ...m, [e.id]: true }));
      notifica('info', 'Voce eliminata dallo storico.');
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Eliminazione fallita.');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {!compatto && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={`chip touch ${gruppo === 'tutti' ? 'chip--attivo' : ''}`} onClick={() => setGruppo('tutti')} aria-pressed={gruppo === 'tutti'}>Tutti</button>
          {GRUPPI_EVENTO.map((g) => (
            <button key={g.chiave} type="button" className={`chip touch ${gruppo === g.chiave ? 'chip--attivo' : ''}`} onClick={() => setGruppo(g.chiave)} aria-pressed={gruppo === g.chiave}>{g.nome}</button>
          ))}
          {eventi && <span className="ml-auto text-[12px] text-text-muted">{totale} {totale === 1 ? 'evento' : 'eventi'}</span>}
        </div>
      )}
      {prima.errore && <div className="text-[13px] text-error">{prima.errore} <button type="button" className="btn btn-ghost btn-sm" onClick={() => void prima.ricarica()}>Riprova</button></div>}
      {!eventi && !prima.errore && <div className="flex justify-center py-6"><Spinner /></div>}
      {eventi && eventi.length === 0 && (
        compatto
          ? <p className="m-0 text-[13px] text-text-muted">Ancora nessun evento: ogni modifica alla partita comparirà qui.</p>
          : <EmptyState illustrazione="vuoto-storico" title="Nessun evento" hint={gruppo === 'tutti' ? 'Le modifiche a scorta, Confidenti, Doti, compendio e Stanza di Velluto vengono registrate automaticamente.' : 'Nessun evento in questo gruppo.'} />
      )}
      {eventi && eventi.length > 0 && (
        <ol className="m-0 p-0 list-none flex flex-col divide-y divide-border-light" aria-label="Eventi della partita">
          {eventi.map((e) => (
            <li key={e.id} className="py-2 flex items-start gap-3 text-[13px]">
              <time dateTime={e.createdAt} className="shrink-0 w-[92px] text-[12px] text-text-muted tabular-nums pt-0.5">{formattaIstante(e.createdAt)}</time>
              {e.personaNome && <ImmagineEntita ambito="persona" chiave={e.personaNome} etichetta={e.personaNomeIt ?? e.personaNome} dimensione={40} adatta="copri" />}
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{e.titolo}</div>
                {e.dettaglio && <div className="text-text-secondary">{e.dettaglio}</div>}
                <div className="text-[12px] text-text-muted">
                  {e.tipoNome}
                  {e.personaId && <> · <Link to={`/compendio/persona/${e.personaId}`} className="text-primary">{e.personaNomeIt}</Link></>}
                </div>
              </div>
              {!compatto && <button type="button" className="btn btn-ghost btn-sm touch shrink-0" onClick={() => void elimina(e)} aria-label={`Elimina la voce ${e.titolo}`}>Elimina</button>}
            </li>
          ))}
        </ol>
      )}
      {!compatto && prossimo !== null && (
        <div className="flex justify-center">
          <button type="button" className="btn btn-secondary" disabled={caricamentoAltri} onClick={() => void caricaAltri()}>{caricamentoAltri ? 'Caricamento…' : 'Carica altri'}</button>
        </div>
      )}
    </div>
  );
}
