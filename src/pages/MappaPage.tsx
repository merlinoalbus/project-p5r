// ============================================================
// MappaPage — indice delle mappe (albero) e visore a schermo intero di una mappa (Fase 13.2)
// ============================================================

import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useCarica } from '../hooks/useCarica';
import { useMappaPartita } from '../hooks/useMappaPartita';
import { getAlberoMappe } from '../services/api';
import { usePartitaStore } from '../stores/partitaStore';
import { PageState } from '../components/shared/PageState';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { VisoreMappa } from '../components/mappe/VisoreMappa';
import { CollegamentoVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';
import { IconaSpillo } from '../components/mappe/IconaSpillo';
import { NOME_TIPO_MAPPA } from '../../shared/spilli';
import type { MappaRiassuntoDto } from '../types';

export function MappaPage() {
  const { chiave } = useParams<{ chiave: string }>();
  const attiva = usePartitaStore((s) => s.attiva);
  return chiave ? <DettaglioMappa chiave={chiave} partitaId={attiva?.id ?? null} /> : <IndiceMappe />;
}

/** Indice: radici (Tokyo, Palazzi, Dedalo) con le mappe figlie. */
function IndiceMappe() {
  useDocumentTitle('Mappe');
  const albero = useCarica(() => getAlberoMappe(), []);
  const radici = useMemo(() => (albero.dati ?? []).filter((m) => !m.genitore), [albero.dati]);
  const figliDi = (chiave: string): MappaRiassuntoDto[] => (albero.dati ?? []).filter((m) => m.genitore === chiave);
  return (
    <div className="flex flex-col gap-4">
      <IntestazionePagina titolo="Mappe" sottotitolo="Tokyo con i quartieri, i Palazzi con le aree, i Dedali: apri una mappa, naviga fra i livelli e segna i collezionabili raccolti." />
      <PageState isLoading={albero.caricamento} error={albero.errore} onRetry={albero.ricarica}>
        <ul className="m-0 p-0 list-none grid gap-3 grid-cols-1 lg:grid-cols-2" aria-label="Mappe">
          {radici.map((r) => {
            const figli = figliDi(r.chiave);
            return (
              <li key={r.chiave} className="card flex flex-col gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link to={`/guida/mappe/${encodeURIComponent(r.chiave)}`} className="font-display text-[20px] no-underline text-text">{r.nome}</Link>
                  <span className="chip text-[11px]">{NOME_TIPO_MAPPA[r.tipo]}</span>
                  <span className="text-[12px] text-text-muted">{r.numeroSpilli} spilli · {figli.length} mappe</span>
                </div>
                {figli.length > 0 && (
                  <ul className="m-0 p-0 list-none flex flex-col divide-y divide-border-light" aria-label={`Mappe di ${r.nome}`}>
                    {figli.map((f) => (
                      <li key={f.chiave}>
                        <Link to={`/guida/mappe/${encodeURIComponent(f.chiave)}`} className="flex items-center gap-2 py-1.5 no-underline text-text touch">
                          <IconaSpillo tipo="passaggio" dimensione={16} />
                          <span className="flex-1 min-w-0 truncate text-[13px]">{f.nome}</span>
                          <span className="text-[11px] text-text-muted">{f.numeroSpilli > 0 ? `${f.numeroSpilli} spilli` : ''}{f.numeroFigli > 0 ? ` · ${f.numeroFigli} mappe` : ''}{!f.immagineUrl && !f.asset ? ' · senza immagine' : ''}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </PageState>
    </div>
  );
}

/** Visore a schermo intero con lo stato della partita attiva. */
function DettaglioMappa({ chiave, partitaId }: { chiave: string; partitaId: number | null }) {
  const navigate = useNavigate();
  const { mappa, caricamento, errore, ricarica, raccolto, statoPunto, acquisto } = useMappaPartita(chiave, partitaId);
  useDocumentTitle(mappa ? `${mappa.nome} — Mappe` : 'Mappa');
  return (
    <PageState isLoading={caricamento && !mappa} error={errore} onRetry={ricarica}>
      {mappa && (
        <VisoreMappa
          key={mappa.chiave}
          mappa={mappa}
          partitaId={partitaId}
          onNaviga={(k) => navigate(`/guida/mappe/${encodeURIComponent(k)}`)}
          onRaccolto={raccolto}
          onStatoPunto={statoPunto}
          onAcquisto={acquisto}
          onChiudi={() => navigate('/guida/mappe')}
          azioni={<CollegamentoVisivo to={`/guida/mappe/${encodeURIComponent(mappa.chiave)}/modifica`} tono="secondario" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica mappa" />}
        />
      )}
    </PageState>
  );
}
