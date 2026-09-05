// ============================================================
// ArticoliTabella — tabella adattiva degli articoli con prezzo, effetto, statistiche, disponibilità e spunta «acquistato» per partita (Fase 8.2)
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { impostaAcquisto } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { NOME_CATEGORIA_ARTICOLO } from '../../utils/negozi';
import type { ArticoloDto } from '../../types';
import { ChipDisponibilita } from './ChipDisponibilita';

interface Props {
  articoli: ArticoloDto[];
  partitaId: number | null;
  /** Mostra la colonna del negozio (ricerca in tutti i negozi). */
  mostraNegozio?: boolean;
  onCambiato: (a: ArticoloDto) => void;
}

function Spunta({ a, partitaId, onCambiato }: { a: ArticoloDto; partitaId: number; onCambiato: (a: ArticoloDto) => void }) {
  const [occupato, setOccupato] = useState(false);
  const cambia = async (fatto: boolean) => {
    setOccupato(true);
    try { onCambiato(await impostaAcquisto(partitaId, a.chiave, fatto)); } catch (err) { notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.'); } finally { setOccupato(false); }
  };
  return <input type="checkbox" className="w-5 h-5" checked={a.acquistato} disabled={occupato} onChange={(e) => void cambia(e.target.checked)} aria-label={`${a.nomeIt ?? a.nome} acquistato`} />;
}

export function ArticoliTabella({ articoli, partitaId, mostraNegozio = false, onCambiato }: Props) {
  if (articoli.length === 0) return <p className="m-0 text-[13px] text-text-muted">Nessun articolo con questi filtri.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="tabella tabella--adattiva text-[12px]">
        <thead><tr>{partitaId && <th aria-label="Acquistato" />}<th>Articolo</th>{mostraNegozio && <th>Negozio</th>}<th>Categoria</th><th>Per</th><th>Prezzo</th><th>Effetto</th><th>Disponibile</th></tr></thead>
        <tbody>
          {articoli.map((a) => (
            <tr key={a.chiave} className={a.acquistato ? 'opacity-60' : ''}>
              {partitaId && <td data-etichetta="Acquistato"><Spunta a={a} partitaId={partitaId} onCambiato={onCambiato} /></td>}
              <td data-etichetta="Articolo">
                <strong className={a.acquistato ? 'line-through' : ''}>{a.nomeIt ?? a.nome}</strong>
                {a.nomeIt && a.nomeIt !== a.nome && <span className="text-text-muted"> ({a.nome})</span>}
                {a.statistiche && <div className="text-text-secondary">{a.statistiche}</div>}
                {a.nota && <div className="text-text-muted">{a.nota}</div>}
                {!a.verificato && <span className="chip text-[11px]" title="Dato da fonte secondaria">da fonte secondaria</span>}
              </td>
              {mostraNegozio && <td data-etichetta="Negozio"><Link to={`/guida/negozi/${a.negozioChiave}`}>{a.negozioNome}</Link></td>}
              <td data-etichetta="Categoria">{NOME_CATEGORIA_ARTICOLO[a.categoria] ?? a.categoria}</td>
              <td data-etichetta="Per">{a.per ?? '—'}</td>
              <td data-etichetta="Prezzo" className="tabular-nums whitespace-nowrap">{a.prezzo !== null ? `${a.prezzo.toLocaleString('it-IT')} ¥` : '—'}</td>
              <td data-etichetta="Effetto">{a.effetto ?? '—'}{a.condizione && <div className="text-text-muted">{a.condizione}</div>}</td>
              <td data-etichetta="Disponibile"><div className="flex flex-col gap-1 items-start"><ChipDisponibilita disponibilita={a.disponibilita} compatto /><span>{a.disponibileDal ?? '—'}</span></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
