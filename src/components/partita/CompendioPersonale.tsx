// ============================================================
// CompendioPersonale — Persona registrate nel compendio della Stanza di Velluto
// ============================================================

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { aggiornaCompendio, getCompendioPartita, getPersone } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { PageState } from '../shared/PageState';
import { CampoRicerca } from '../shared/CampoRicerca';
import { IconBersaglio } from '../shared/iconeGuida';

interface Props {
  partitaId: number;
}

/** Elenco completo del compendio con spunta "registrata" e percentuale di completamento. */
export function CompendioPersonale({ partitaId }: Props) {
  const tutte = useCarica(() => getPersone(), []);
  const registrate = useCarica(() => getCompendioPartita(partitaId), [partitaId]);
  const [q, setQ] = useState('');
  const [soloMancanti, setSoloMancanti] = useState(false);
  const [occupato, setOccupato] = useState<number | null>(null);

  const setRegistrate = new Map((registrate.dati ?? []).map((r) => [r.personaId, r]));
  const lista = useMemo(() => {
    const testo = q.trim().toLowerCase();
    return (tutte.dati ?? []).filter((p) => (!testo || p.nome.toLowerCase().includes(testo) || p.nomeIt.toLowerCase().includes(testo) || p.arcanaNome.toLowerCase().includes(testo)) && (!soloMancanti || !setRegistrate.has(p.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutte.dati, q, soloMancanti, registrate.dati]);

  const totale = tutte.dati?.length ?? 0;
  const fatte = registrate.dati?.length ?? 0;

  const cambia = async (personaId: number, registrata: boolean) => {
    setOccupato(personaId);
    try {
      registrate.imposta(await aggiornaCompendio(partitaId, personaId, { registrata }));
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
    } finally {
      setOccupato(null);
    }
  };

  return (
    <PageState isLoading={tutte.caricamento || registrate.caricamento} error={tutte.errore ?? registrate.errore} onRetry={() => { void tutte.ricarica(); void registrate.ricarica(); }}>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="kpi-tile">
          <span className="kpi-label">Completamento</span>
          <span className="kpi-value">{totale ? Math.round((fatte / totale) * 100) : 0}%</span>
          <span className="text-[12px] text-text-muted">{fatte} di {totale}</span>
        </div>
        <CampoRicerca valore={q} onCambia={setQ} segnaposto="Cerca Persona…" />
        <button type="button" className={`chip chip--icona touch ${soloMancanti ? 'chip--attivo' : ''}`} onClick={() => setSoloMancanti((v) => !v)} aria-pressed={soloMancanti}><IconBersaglio size={14} />Solo mancanti</button>
      </div>
      <ul className="m-0 p-0 list-none card py-0 divide-y divide-border-light">
        {lista.map((p) => {
          const r = setRegistrate.get(p.id);
          return (
            <li key={p.id} className="flex items-center gap-3 py-1">
              <label className="touch flex items-center justify-center cursor-pointer">
                <input type="checkbox" className="w-6 h-6" checked={!!r} disabled={occupato === p.id} onChange={(e) => void cambia(p.id, e.target.checked)} aria-label={`${p.nomeIt} registrata`} />
              </label>
              <span className="w-9 text-right text-[12px] text-text-muted">Liv. {p.livello}</span>
              <Link to={`/compendio/persona/${p.id}`} className="font-semibold no-underline text-text hover:text-primary flex-1">{p.nomeIt}{p.nomeIt !== p.nome && <span className="text-[12px] font-normal text-text-muted"> {p.nome}</span>}</Link>
              <span className="chip">{p.arcanaNome}</span>
              {r?.livelloRegistrato !== null && r?.livelloRegistrato !== undefined && <span className="text-[12px] text-text-secondary">reg. liv. {r.livelloRegistrato}</span>}
            </li>
          );
        })}
      </ul>
    </PageState>
  );
}
