// ============================================================
// DotiSociali — stella delle cinque Doti + schede compatte con note (+1/+2/+3), modificatori, rango e punti mancanti
// ============================================================
//
// Nel gioco ogni azione mostra 1–3 note: 1 nota = 2 punti, 2 note = 3, 3 note = 5
// (7 con libri a resa maggiorata); la lettura della fortuna di Chihaya moltiplica
// ×1,5 (per difetto). La conversione la fa il backend (`note`, `libro`, `fortuna`).
// La stella (Fase 11.2) mostra l'avanzamento continuo di ogni dote: ranghi completati
// più la quota verso il prossimo; toccare un vertice porta alla scheda della dote.
// ============================================================

import { useState, type ReactNode } from 'react';
import { aggiornaDote, getDoti } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { PageState } from '../shared/PageState';
import { AssetImg } from '../shared/AssetImg';
import { StellaCinque } from '../shared/StellaCinque';
import { avanzamentoDote, quotaVersoProssimoRango } from '../../utils/doti';
import type { DoteSocialePartitaDto, ModificaDote } from '../../types';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { useSuggerimenti } from '../../stores/suggerimentiStore';
import { classiSuggerito } from '../../utils/suggerimenti';
import { TargaSuggerito } from '../shared/Suggerito';

interface Props {
  partitaId: number;
}

function puntiAnteprima(note: 1 | 2 | 3, libro: boolean, fortuna: boolean): number {
  const base = note === 1 ? 2 : note === 2 ? 3 : libro ? 7 : 5;
  return fortuna ? Math.floor(base * 1.5) : base;
}

/** Stella delle Doti con schede compatte: incremento a note, rango attuale e distanza dal rango successivo. */
export function DotiSociali({ partitaId }: Props) {
  const { dati, caricamento, errore, ricarica, imposta } = useCarica(() => getDoti(partitaId), [partitaId]);
  const [occupata, setOccupata] = useState<string | null>(null);
  const [fortuna, setFortuna] = useState(false);
  const [libro, setLibro] = useState(false);
  const [selezionata, setSelezionata] = useState<string | null>(null);
  const sugg = useSuggerimenti();

  const modifica = async (chiave: string, mod: ModificaDote) => {
    if (!dati) return;
    setOccupata(chiave);
    try {
      const agg = await aggiornaDote(partitaId, chiave, mod);
      const prima = dati.find((d) => d.chiave === chiave);
      imposta(dati.map((d) => (d.chiave === chiave ? agg : d)));
      if (prima && agg.rango > prima.rango) notifica('success', `${agg.nome}: nuovo rango ${agg.rango} — ${agg.nomeRango}!`);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
    } finally {
      setOccupata(null);
    }
  };

  const vaiAllaDote = (chiave: string) => {
    setSelezionata(chiave);
    document.getElementById(`dote-${chiave}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  };

  return (
    <PageState isLoading={caricamento} error={errore} onRetry={() => void ricarica()}>
      <div className="grid gap-3 items-start grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(340px,460px)_minmax(0,1fr)] md:h-full md:min-h-0 md:items-stretch">
        <section className="card flex flex-col items-center justify-center gap-2 px-4 pt-3 pb-3 overflow-visible min-w-0 md:min-h-0" aria-label="Stella delle Doti">
          <div className="w-full flex justify-center px-[12%]">
            <StellaCinque
              assi={(dati ?? []).map((d) => ({ chiave: d.chiave, etichetta: d.nome, valore: avanzamentoDote(d), badge: `doti/${d.chiave}`, badgeSotto: `ui/rango-${d.rango}`, testo: `Rango ${d.rango}` }))}
              dimensione={480}
              badgeAltezza={70}
              etichettaAria="Stella delle Doti sociali"
              onScegli={vaiAllaDote}
              selezionato={selezionata}
            />
          </div>
          <div className="w-full flex flex-col items-center gap-1.5" role="group" aria-label="Modificatori delle note">
            <span className="text-[11px] font-semibold uppercase tracking-[.06em] text-text-muted">Modificatori · valgono per tutte le note</span>
            <div className="flex flex-wrap justify-center gap-2">
              <PulsanteVisivo attivo={fortuna} icona={<IconaAzione chiave="fortuna" dimensione={24} />} titolo="Fortuna ×1,5" dettaglio="lettura di Chihaya" onClick={() => setFortuna((v) => !v)} aria-label="Fortuna ×1,5: lettura della fortuna di Chihaya" title="Lettura della fortuna di Chihaya: punti ×1,5 (per difetto)" />
              <PulsanteVisivo attivo={libro} icona={<IconaAzione chiave="libro" dimensione={24} />} titolo="Libro" dettaglio="3 note = 7 punti" onClick={() => setLibro((v) => !v)} aria-label="Libro: 3 note valgono 7 punti" title="Libri a resa maggiorata: 3 note valgono 7 punti" />
            </div>
          </div>
          <p className="m-0 text-[12px] text-text-muted text-center">Tocca un vertice per andare alla dote.</p>
        </section>
        <ul className="m-0 p-0 list-none flex flex-col gap-2 min-w-0 md:min-h-0 md:overflow-y-auto md:pr-1">
          {dati?.map((d) => (
            <li key={d.chiave} id={`dote-${d.chiave}`} className={`card flex flex-col gap-1.5 py-2 transition-colors ${selezionata === d.chiave ? 'border-primary' : ''} ${classiSuggerito(sugg.evidenziato('doti', d.chiave))}`}>
              <CartaDote
                dote={d}
                suggerita={sugg.evidenziato('doti', d.chiave) ? sugg.motivo('doti', d.chiave) : null}
                azioni={(
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {([1, 2, 3] as const).map((n) => (
                      <button
                        key={n}
                        type="button"
                        className="btn btn-primary btn-nota min-w-[64px]"
                        disabled={occupata === d.chiave}
                        onClick={() => void modifica(d.chiave, { note: n, libro, fortuna })}
                        aria-label={`${d.nome}: aggiungi ${n} ${n === 1 ? 'nota' : 'note'} (${puntiAnteprima(n, libro, fortuna)} punti)`}
                      >
                        <span aria-hidden="true">{'♪'.repeat(n)}</span>
                        <span className="text-[13px] opacity-90">+{puntiAnteprima(n, libro, fortuna)}</span>
                      </button>
                    ))}
                    <button type="button" className="btn btn-secondary btn-nota min-w-[46px]" disabled={occupata === d.chiave || d.punti === 0} onClick={() => void modifica(d.chiave, { delta: -1 })} aria-label={`${d.nome}: togli un punto`}>−1</button>
                    <button type="button" className="btn btn-secondary btn-nota min-w-[46px]" disabled={occupata === d.chiave} onClick={() => void modifica(d.chiave, { delta: 1 })} aria-label={`${d.nome}: aggiungi un punto`}>+1</button>
                  </div>
                )}
              />
            </li>
          ))}
        </ul>
      </div>
    </PageState>
  );
}

/** Intestazione compatta della dote: targhetta, rango con titolo, punti, barra e — sulla stessa riga — i pulsanti delle note. */
function CartaDote({ dote: d, azioni, suggerita }: { dote: DoteSocialePartitaDto; azioni?: ReactNode; suggerita?: string | null }) {
  const quota = Math.round(quotaVersoProssimoRango(d) * 100);
  const prossimo = d.ranghi.find((r) => r.rango === d.rango + 1);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <AssetImg nome={`doti/${d.chiave}`} alt={d.nome} className="h-7 w-auto object-contain" fallback={<span className="font-display uppercase text-[20px] leading-none">{d.nome}</span>} />
        <span className="flex items-center gap-1.5">
          <span className="sr-only">Rango {d.rango} · {d.nomeRango}</span>
          <span className="font-display uppercase text-[20px] leading-none" aria-hidden="true">Rango</span>
          <AssetImg nome={`ui/rango-${d.rango}`} alt="" decorativa className="h-9 w-auto object-contain" fallback={<span className="font-display text-[20px] leading-none" aria-hidden="true">{d.rango}</span>} />
          <span className="font-display uppercase text-[20px] leading-none" aria-hidden="true">{d.nomeRango}</span>
        </span>
        {suggerita !== null && suggerita !== undefined && <TargaSuggerito motivo={suggerita} compatta />}
        <span className="ml-auto font-display text-[26px] leading-none tabular-nums">{d.punti}<span className="text-[12px] font-sans text-text-muted"> punti</span></span>
      </div>
      <div className="h-2 bg-bg-tertiary overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={d.sogliaProssima === null ? 100 : quota} aria-label={`Progresso verso il rango ${d.rango + 1}`}>
        <div className="h-full bg-primary transition-[width]" style={{ width: `${d.sogliaProssima === null ? 100 : quota}%` }} />
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[13px] text-text-secondary min-w-0">
          {d.mancanti !== null && prossimo
            ? <>Mancano <strong className="text-text">{d.mancanti}</strong> punti al rango {prossimo.rango} · {prossimo.nome} ({d.sogliaProssima})</>
            : <>Rango massimo raggiunto.</>}
        </div>
        {azioni}
      </div>
    </div>
  );
}
