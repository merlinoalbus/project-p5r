// ============================================================
// ConfidentiPartita — i 23 Confidenti: immagine, arcano, rango, punti verso il prossimo rango, note
// ============================================================

import { useState } from 'react';
import { aggiornaConfidente, getConfidentiPartita } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { PageState } from '../shared/PageState';
import { ImmagineEntita } from '../shared/ImmagineEntita';
import { Modal } from '../shared/Modal';
import type { ConfidentePartitaDto } from '../../types';

interface Props {
  partitaId: number;
}

type Cambio = { sbloccato?: boolean; rango?: number; punti?: number; deltaPunti?: number; note?: string };

/** Griglia dei Confidenti: rango con +/−, punti (+1/+2/+3) con barra verso il rango successivo, sblocco, note, immagini. */
export function ConfidentiPartita({ partitaId }: Props) {
  const { dati, caricamento, errore, ricarica, imposta } = useCarica(() => getConfidentiPartita(partitaId), [partitaId]);
  const [occupato, setOccupato] = useState<string | null>(null);
  const [modifica, setModifica] = useState<ConfidentePartitaDto | null>(null);
  const [note, setNote] = useState('');

  const salva = async (chiave: string, cambio: Cambio): Promise<ConfidentePartitaDto | null> => {
    if (!dati) return null;
    setOccupato(chiave);
    try {
      const agg = await aggiornaConfidente(partitaId, chiave, cambio);
      imposta(dati.map((c) => (c.chiave === chiave ? agg : c)));
      return agg;
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
      return null;
    } finally {
      setOccupato(null);
    }
  };

  const salvaNote = async () => {
    if (!modifica) return;
    const esito = await salva(modifica.chiave, { note });
    if (esito) setModifica(null);
  };

  return (
    <PageState isLoading={caricamento} error={errore} onRetry={() => void ricarica()}>
      <ul className="m-0 p-0 list-none grid gap-3 grid-cols-1 md:grid-cols-2 2xl:grid-cols-3">
        {dati?.map((c) => (
          <li key={c.chiave} className={`card flex flex-col gap-3 ${c.sbloccato ? '' : 'opacity-75'}`}>
            <div className="flex gap-3 items-start">
              <ImmagineEntita ambito="confidente" chiave={c.chiave} etichetta={c.nome} dimensione={72} forma="tonda" modificabile />
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <span className="font-semibold text-[15px] leading-tight">{c.nome}</span>
                <span className="chip self-start">{c.arcanaNome}</span>
              </div>
              <ImmagineEntita ambito="arcana" chiave={c.arcana} etichetta={c.arcanaNome} dimensione={40} forma="carta" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] uppercase tracking-wide text-text-muted flex-1">Rango</span>
              <button type="button" className="btn btn-secondary w-14" disabled={occupato === c.chiave || c.rango === 0} onClick={() => void salva(c.chiave, { rango: c.rango - 1 })} aria-label={`Rango di ${c.nome} meno uno`}>−</button>
              <span className={`text-2xl font-black w-14 text-center tabular-nums ${c.rango === 10 ? 'text-primary' : ''}`}>{c.rango === 10 ? 'MAX' : c.rango}</span>
              <button type="button" className="btn btn-primary w-14" disabled={occupato === c.chiave || c.rango === 10} onClick={() => void salva(c.chiave, { rango: c.rango + 1 })} aria-label={`Rango di ${c.nome} più uno`}>+</button>
            </div>

            {c.rango < 10 && c.puntiNecessari === 0 && (
              <p className="m-0 text-[13px] text-text-muted">Il passaggio al rango {c.rango + 1} non dipende dai punti (storia, richiesta o dote sociale).</p>
            )}
            {c.rango < 10 && c.puntiNecessari !== null && c.puntiNecessari > 0 && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-[13px] flex-wrap">
                  <span className="text-text-muted">Punti verso il rango {c.rango + 1}:</span>
                  <strong className="tabular-nums">{c.punti}</strong>
                  <span className="text-text-secondary">/ {c.puntiNecessari} — mancano <strong className="text-text">{c.mancanti}</strong></span>
                </div>
                {c.puntiNecessari !== null && (
                  <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={c.puntiNecessari} aria-valuenow={c.punti} aria-label={`Progresso di ${c.nome} verso il rango ${c.rango + 1}`}>
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.round((c.punti / c.puntiNecessari) * 100))}%` }} />
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {([1, 2, 3] as const).map((n) => (
                    <button key={n} type="button" className="btn btn-secondary btn-sm flex-1 min-w-[64px]" disabled={occupato === c.chiave} onClick={() => void salva(c.chiave, { deltaPunti: n })} aria-label={`${c.nome}: aggiungi ${n} ${n === 1 ? 'punto' : 'punti'}`}>
                      <span aria-hidden="true">{'♪'.repeat(n)}</span> +{n}
                    </button>
                  ))}
                  <button type="button" className="btn btn-secondary btn-sm min-w-[48px]" disabled={occupato === c.chiave || c.punti === 0} onClick={() => void salva(c.chiave, { deltaPunti: -1 })} aria-label={`${c.nome}: togli un punto`}>−1</button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <label className="flex items-center gap-1.5 text-[13px] text-text-secondary touch">
                <input type="checkbox" className="w-5 h-5" checked={c.sbloccato} disabled={occupato === c.chiave || c.rango > 0} onChange={(e) => void salva(c.chiave, { sbloccato: e.target.checked })} />
                Sbloccato
              </label>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setModifica(c); setNote(c.note); }}>
                {c.note ? 'Note ✎' : 'Aggiungi note'}
              </button>
            </div>
            {c.note && <p className="m-0 text-[12px] text-text-secondary whitespace-pre-wrap line-clamp-2">{c.note}</p>}
          </li>
        ))}
      </ul>
      <Modal
        titolo={modifica ? `Note — ${modifica.nome}` : 'Note'}
        aperta={modifica !== null}
        onChiudi={() => setModifica(null)}
        azioni={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setModifica(null)}>Annulla</button>
            <button type="button" className="btn btn-primary" disabled={occupato !== null} onClick={() => void salvaNote()}>Salva</button>
          </>
        }
      >
        <textarea className="form-input min-h-[140px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Promemoria: prossimi eventi, regali graditi, risposte migliori…" />
      </Modal>
    </PageState>
  );
}
