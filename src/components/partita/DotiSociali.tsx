// ============================================================
// DotiSociali — le 5 doti con note (+1/+2/+3), modificatori, rango e punti mancanti
// ============================================================
//
// Nel gioco ogni azione mostra 1–3 note: 1 nota = 2 punti, 2 note = 3, 3 note = 5
// (7 con libri a resa maggiorata); la lettura della fortuna di Chihaya moltiplica
// ×1,5 (per difetto). La conversione la fa il backend (`note`, `libro`, `fortuna`).
// ============================================================

import { useState } from 'react';
import { aggiornaDote, getDoti } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { PageState } from '../shared/PageState';
import { AssetImg } from '../shared/AssetImg';
import type { DoteSocialePartitaDto, ModificaDote } from '../../types';

interface Props {
  partitaId: number;
}

function puntiAnteprima(note: 1 | 2 | 3, libro: boolean, fortuna: boolean): number {
  const base = note === 1 ? 2 : note === 2 ? 3 : libro ? 7 : 5;
  return fortuna ? Math.floor(base * 1.5) : base;
}

/** Elenco delle Doti sociali con incremento a note, rango attuale e distanza dal rango successivo. */
export function DotiSociali({ partitaId }: Props) {
  const { dati, caricamento, errore, ricarica, imposta } = useCarica(() => getDoti(partitaId), [partitaId]);
  const [occupata, setOccupata] = useState<string | null>(null);
  const [fortuna, setFortuna] = useState(false);
  const [libro, setLibro] = useState(false);

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

  return (
    <PageState isLoading={caricamento} error={errore} onRetry={() => void ricarica()}>
      <div className="flex flex-wrap items-center gap-2 mb-3 text-[13px]">
        <span className="text-text-muted">Modificatori:</span>
        <button type="button" className={`chip touch ${fortuna ? 'chip--attivo' : ''}`} onClick={() => setFortuna((v) => !v)} aria-pressed={fortuna} title="Lettura della fortuna di Chihaya: punti ×1,5 (per difetto)">×1,5 Fortuna</button>
        <button type="button" className={`chip touch ${libro ? 'chip--attivo' : ''}`} onClick={() => setLibro((v) => !v)} aria-pressed={libro} title="Libri a resa maggiorata: 3 note valgono 7 punti">Libro (3 note = 7)</button>
      </div>
      <ul className="m-0 p-0 list-none grid gap-3 grid-cols-1 xl:grid-cols-2">
        {dati?.map((d) => (
          <li key={d.chiave} className="card flex flex-col gap-2">
            <CartaDote dote={d} />
            <div className="flex flex-wrap gap-2">
              {([1, 2, 3] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  className="btn btn-primary flex-1 min-w-[88px]"
                  disabled={occupata === d.chiave || d.rango === 5 && d.mancanti === null && false}
                  onClick={() => void modifica(d.chiave, { note: n, libro, fortuna })}
                  aria-label={`${d.nome}: aggiungi ${n} ${n === 1 ? 'nota' : 'note'} (${puntiAnteprima(n, libro, fortuna)} punti)`}
                >
                  <span aria-hidden="true">{'♪'.repeat(n)}</span>
                  <span className="text-[12px] opacity-90">+{puntiAnteprima(n, libro, fortuna)}</span>
                </button>
              ))}
              <button type="button" className="btn btn-secondary min-w-[56px]" disabled={occupata === d.chiave || d.punti === 0} onClick={() => void modifica(d.chiave, { delta: -1 })} aria-label={`${d.nome}: togli un punto`}>−1</button>
              <button type="button" className="btn btn-secondary min-w-[56px]" disabled={occupata === d.chiave} onClick={() => void modifica(d.chiave, { delta: 1 })} aria-label={`${d.nome}: aggiungi un punto`}>+1</button>
            </div>
          </li>
        ))}
      </ul>
    </PageState>
  );
}

/** Intestazione della dote: nome, rango con titolo, punti, barra verso il rango successivo. */
function CartaDote({ dote: d }: { dote: DoteSocialePartitaDto }) {
  const inizio = d.ranghi.find((r) => r.rango === d.rango)?.soglia ?? 0;
  const fine = d.sogliaProssima ?? inizio;
  const quota = fine > inizio ? Math.min(100, Math.round(((d.punti - inizio) / (fine - inizio)) * 100)) : 100;
  const prossimo = d.ranghi.find((r) => r.rango === d.rango + 1);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2 flex-wrap">
        <AssetImg nome={`doti/${d.chiave}`} alt={d.nome} className="h-7 w-auto object-contain" fallback={<span className="text-[12px] uppercase tracking-wide text-text-muted">{d.nome}</span>} />
        <span className="chip chip--attivo">Rango {d.rango} · {d.nomeRango}</span>
        <span className="ml-auto text-2xl font-black tabular-nums">{d.punti}<span className="text-[12px] font-normal text-text-muted"> punti</span></span>
      </div>
      <div className="h-2.5 rounded-full bg-bg-tertiary overflow-hidden" role="progressbar" aria-valuemin={inizio} aria-valuemax={fine} aria-valuenow={d.punti} aria-label={`Progresso verso il rango ${d.rango + 1}`}>
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${quota}%` }} />
      </div>
      <div className="text-[13px] text-text-secondary">
        {d.mancanti !== null && prossimo
          ? <>Mancano <strong className="text-text">{d.mancanti}</strong> punti al rango {prossimo.rango} · {prossimo.nome} ({d.sogliaProssima})</>
          : <>Rango massimo raggiunto.</>}
      </div>
    </div>
  );
}
