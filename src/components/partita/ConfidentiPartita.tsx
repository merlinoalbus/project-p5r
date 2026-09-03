// ============================================================
// ConfidentiPartita — i 23 Confidenti con immagine, arcano, rango e note
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

/** Griglia dei Confidenti: rango con +/−, sblocco, note; immagini del personaggio e dell'arcano. */
export function ConfidentiPartita({ partitaId }: Props) {
  const { dati, caricamento, errore, ricarica, imposta } = useCarica(() => getConfidentiPartita(partitaId), [partitaId]);
  const [occupato, setOccupato] = useState<string | null>(null);
  const [modifica, setModifica] = useState<ConfidentePartitaDto | null>(null);
  const [note, setNote] = useState('');

  const salva = async (chiave: string, cambio: { sbloccato?: boolean; rango?: number; note?: string }) => {
    if (!dati) return;
    setOccupato(chiave);
    try {
      const agg = await aggiornaConfidente(partitaId, chiave, cambio);
      imposta(dati.map((c) => (c.chiave === chiave ? agg : c)));
      return agg;
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
    } finally {
      setOccupato(null);
    }
  };

  return (
    <PageState isLoading={caricamento} error={errore} onRetry={() => void ricarica()}>
      <ul className="m-0 p-0 list-none grid gap-2 grid-cols-1 md:grid-cols-2 2xl:grid-cols-3">
        {dati?.map((c) => (
          <li key={c.chiave} className={`card flex gap-3 ${c.sbloccato ? '' : 'opacity-70'}`}>
            <ImmagineEntita ambito="confidente" chiave={c.chiave} etichetta={c.nome} dimensione={72} forma="tonda" />
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-[15px]">{c.nome}</span>
                <span className="chip">{c.arcanaNome}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] uppercase tracking-wide text-text-muted">Rango</span>
                <button type="button" className="btn btn-secondary btn-sm w-11" disabled={occupato === c.chiave || c.rango === 0} onClick={() => void salva(c.chiave, { rango: c.rango - 1, sbloccato: c.rango - 1 > 0 ? true : c.sbloccato })} aria-label={`Rango di ${c.nome} meno uno`}>−</button>
                <span className={`text-2xl font-black w-12 text-center tabular-nums ${c.rango === 10 ? 'text-primary' : ''}`}>{c.rango === 10 ? 'MAX' : c.rango}</span>
                <button type="button" className="btn btn-primary btn-sm w-11" disabled={occupato === c.chiave || c.rango === 10} onClick={() => void salva(c.chiave, { rango: c.rango + 1 })} aria-label={`Rango di ${c.nome} più uno`}>+</button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <label className="flex items-center gap-1.5 text-[13px] text-text-secondary touch">
                  <input type="checkbox" checked={c.sbloccato} disabled={occupato === c.chiave || c.rango > 0} onChange={(e) => void salva(c.chiave, { sbloccato: e.target.checked })} />
                  Sbloccato
                </label>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setModifica(c); setNote(c.note); }}>
                  {c.note ? 'Note ✎' : 'Aggiungi note'}
                </button>
              </div>
              {c.note && <p className="m-0 text-[12px] text-text-secondary whitespace-pre-wrap line-clamp-2">{c.note}</p>}
            </div>
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
            <button type="button" className="btn btn-primary" onClick={() => { if (modifica) void salva(modifica.chiave, { note }).then(() => setModifica(null)); }}>Salva</button>
          </>
        }
      >
        <textarea className="form-input min-h-[140px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Promemoria: prossimi eventi, regali graditi, risposte migliori…" />
      </Modal>
    </PageState>
  );
}
