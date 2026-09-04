// ============================================================
// DungeonPage — elenco dei Palazzi e dei Dedali con date, punti di interesse e avanzamento nella partita (Fase 7.1)
// ============================================================

import { Link } from 'react-router-dom';
import { getDungeons } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { PageState } from '../components/shared/PageState';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';

export function DungeonPage() {
  useDocumentTitle('Palazzi e Dedali');
  const attiva = usePartitaStore((s) => s.attiva);
  const dati = useCarica(() => getDungeons(attiva?.id), [attiva?.id]);
  return (
    <PageState isLoading={dati.caricamento && !dati.dati} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {dati.dati && (
        <div className="flex flex-col gap-4">
          <IntestazionePagina titolo="Palazzi e Dedali" sottotitolo="Aree e punti di interesse dalla guida allgamestaff (sicure, forzieri, Volontà, enigmi, mini-boss e boss con debolezze). Con una partita attiva segni ciò che hai ottenuto o esaurito; importando le piante delle aree ottieni le mappe interattive." />
          <ul className="m-0 p-0 list-none grid grid-cols-1 md:grid-cols-2 gap-3" aria-label="Dungeon">
            {dati.dati.map((d) => (
              <li key={d.chiave}>
                <Link to={`/guida/dungeon/${d.chiave}`} className="card card--cliccabile no-underline text-text flex flex-col gap-1 h-full">
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-[15px]">{d.nome}</strong>
                    {d.arcanaSovranoNome && <span className="chip">{d.arcanaSovranoNome}</span>}
                    {d.livelloConsigliato && <span className="chip">Livello {d.livelloConsigliato}</span>}
                  </div>
                  {d.sovrano && <span className="text-[13px] text-text-secondary">{d.sovrano}</span>}
                  <span className="text-[12px] text-text-muted">{d.date.sblocco ? `Sblocco ${d.date.sblocco}` : ''}{d.date.scadenza ? ` · scadenza ${d.date.scadenza}` : ''}</span>
                  <span className="text-[12px] text-text-muted">{d.aree} aree · {d.punti} punti · {d.esauribili} esauribili{d.gestiti !== null ? ` · ${d.gestiti} gestiti` : ''}</span>
                  {d.gestiti !== null && d.punti > 0 && (
                    <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={d.punti} aria-valuenow={d.gestiti} aria-label={`Avanzamento in ${d.nome}`}>
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((d.gestiti / d.punti) * 100)}%` }} />
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </PageState>
  );
}
