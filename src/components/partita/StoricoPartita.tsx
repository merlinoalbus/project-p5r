// ============================================================
// StoricoPartita — cronologia degli eventi della partita con filtri per gruppo, paginazione ed eliminazione
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { eliminaEventi, eliminaEvento, getStorico } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { GRUPPI_EVENTO, tipiDelGruppo } from '../../../shared/eventi';
import { EmptyState, Spinner } from '../shared/PageState';
import type { EventoPartitaDto } from '../../types';
import { ImmagineEntita } from '../shared/ImmagineEntita';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconMappa } from '../shared/iconeGuida';
import type { ReactNode } from 'react';
import { IconaAzione, IconaScheda } from '../shared/IconaAzione';
import { AssetImg } from '../shared/AssetImg';

interface Props {
  partitaId: number;
  /** Numero di eventi per pagina (default 30). */
  perPagina?: number;
  /** Modalità compatta (Riepilogo): niente filtri né eliminazione, solo le ultime voci. */
  compatto?: boolean;
}

type Gruppo = (typeof GRUPPI_EVENTO)[number]['chiave'] | 'tutti';

const ICONE_GRUPPO: Partial<Record<Gruppo, ReactNode>> = { partita: <IconaScheda chiave="riepilogo" dimensione={14} />, doti: <IconaScheda chiave="doti" dimensione={14} />, confidenti: <IconaScheda chiave="confidenti" dimensione={14} />, persona: <IconaScheda chiave="scorta" dimensione={14} />, velluto: <IconaAzione chiave="evoca" dimensione={14} />, obiettivi: <IconaScheda chiave="obiettivi" dimensione={14} />, dungeon: <AssetImg nome="guida/dungeon" alt="" decorativa className="w-[14px] h-[14px] object-contain" fallback={<IconMappa size={14} />} /> };

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
  const [selezionati, setSelezionati] = useState<Record<number, true>>({});
  const [eliminazioneMultipla, setEliminazioneMultipla] = useState(false);

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

  const idSelezionati = Object.keys(selezionati).map(Number).filter((id) => !eliminati[id]);
  const eliminaSelezionati = async () => {
    if (idSelezionati.length === 0) return;
    if (!window.confirm(`Eliminare ${idSelezionati.length} ${idSelezionati.length === 1 ? 'voce' : 'voci'} dallo storico? Le modifiche registrate restano valide.`)) return;
    setEliminazioneMultipla(true);
    try {
      const esito = await eliminaEventi(partitaId, idSelezionati);
      setEliminati((m) => ({ ...m, ...Object.fromEntries(idSelezionati.map((id) => [id, true as const])) }));
      setSelezionati({});
      notifica('info', esito.eliminati === 1 ? 'Voce eliminata dallo storico.' : `${esito.eliminati} voci eliminate dallo storico.`);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Eliminazione fallita.');
    } finally {
      setEliminazioneMultipla(false);
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
          <button type="button" className={`chip chip--icona touch ${gruppo === 'tutti' ? 'chip--attivo' : ''}`} onClick={() => setGruppo('tutti')} aria-pressed={gruppo === 'tutti'}><IconaAzione chiave="tutti" dimensione={14} />Tutti</button>
          {GRUPPI_EVENTO.map((g) => (
            <button key={g.chiave} type="button" className={`chip chip--icona touch ${gruppo === g.chiave ? 'chip--attivo' : ''}`} onClick={() => setGruppo(g.chiave)} aria-pressed={gruppo === g.chiave}>{ICONE_GRUPPO[g.chiave] ?? <IconaAzione chiave="tutti" dimensione={14} />}{g.nome}</button>
          ))}
          {eventi && <span className="ml-auto text-[12px] text-text-muted">{totale} {totale === 1 ? 'evento' : 'eventi'}</span>}
        </div>
      )}
      {prima.errore && <div className="text-[13px] text-error">{prima.errore} <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="riprova" dimensione={20} />} titolo="Riprova" onClick={() => void prima.ricarica()} /></div>}
      {!eventi && !prima.errore && <div className="flex justify-center py-6"><Spinner /></div>}
      {eventi && eventi.length === 0 && (
        compatto
          ? <p className="m-0 text-[13px] text-text-muted">Ancora nessun evento: ogni modifica alla partita comparirà qui.</p>
          : <EmptyState illustrazione="vuoto-storico" title="Nessun evento" hint={gruppo === 'tutti' ? 'Le modifiche a scorta, Confidenti, Doti, compendio e Stanza di Velluto vengono registrate automaticamente.' : 'Nessun evento in questo gruppo.'} />
      )}
      {!compatto && eventi && eventi.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[12px]" role="group" aria-label="Selezione multipla">
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="seleziona" dimensione={20} />} titolo="Seleziona tutte le voci visibili" onClick={() => setSelezionati(Object.fromEntries(eventi.map((e) => [e.id, true as const])))} />
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="deseleziona" dimensione={20} />} titolo="Deseleziona" disabled={idSelezionati.length === 0} onClick={() => setSelezionati({})} />
          <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo={`Elimina selezionate (${idSelezionati.length})`} disabled={idSelezionati.length === 0 || eliminazioneMultipla} onClick={() => void eliminaSelezionati()} />
        </div>
      )}
      {eventi && eventi.length > 0 && (
        <ol className="m-0 p-0 list-none flex flex-col divide-y divide-border-light" aria-label="Eventi della partita">
          {eventi.map((e) => (
            <li key={e.id} className={`py-2 flex items-start gap-3 text-[13px] ${selezionati[e.id] ? 'bg-primary-bg' : ''}`}>
              {!compatto && <input type="checkbox" className="w-5 h-5 mt-0.5 shrink-0" checked={!!selezionati[e.id]} onChange={(ev) => setSelezionati((m) => { const n = { ...m }; if (ev.target.checked) n[e.id] = true; else delete n[e.id]; return n; })} aria-label={`Seleziona la voce ${e.titolo}`} />}
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
              {!compatto && <PulsanteVisivo tono="fantasma" compatto className="shrink-0" icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina" onClick={() => void elimina(e)} aria-label={`Elimina la voce ${e.titolo}`} />}
            </li>
          ))}
        </ol>
      )}
      {!compatto && prossimo !== null && (
        <div className="flex justify-center">
          <PulsanteVisivo icona={<IconaAzione chiave="carica-altri" dimensione={22} />} titolo={caricamentoAltri ? 'Caricamento…' : 'Carica altri'} disabled={caricamentoAltri} onClick={() => void caricaAltri()} />
        </div>
      )}
    </div>
  );
}
