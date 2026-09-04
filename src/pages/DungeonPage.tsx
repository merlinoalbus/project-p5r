// ============================================================
// DungeonPage — Palazzi e Dedali come schede visive: emblema, anello di avanzamento nella partita, date e livello in breve (Fase 7.1, grafica 11.4)
// ============================================================

import { Link } from 'react-router-dom';
import { getDungeons } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { PageState } from '../components/shared/PageState';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { AnelloAvanzamento } from '../components/shared/AnelloAvanzamento';
import { EmblemaDungeon } from '../components/guida/EmblemaDungeon';
import { dataBreve, sintesi } from '../utils/testoBreve';
import { CollegamentoVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';

export function DungeonPage() {
  useDocumentTitle('Palazzi e Dedali');
  const attiva = usePartitaStore((s) => s.attiva);
  const dati = useCarica(() => getDungeons(attiva?.id), [attiva?.id]);
  return (
    <PageState isLoading={dati.caricamento && !dati.dati} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {dati.dati && (
        <div className="flex flex-col gap-4">
          <IntestazionePagina titolo="Palazzi e Dedali" sottotitolo="Aree e punti di interesse dalla guida allgamestaff (sicure, forzieri, Volontà, enigmi, mini-boss e boss con debolezze). Con una partita attiva segni ciò che hai ottenuto o esaurito; le piante delle aree si scaricano al primo accesso e portano gli spilli preposizionati." />
          <ul className="m-0 p-0 list-none grid grid-cols-1 md:grid-cols-2 gap-3" aria-label="Dungeon">
            {dati.dati.map((d) => {
              const quota = d.gestiti !== null && d.punti > 0 ? d.gestiti / d.punti : null;
              return (
                <li key={d.chiave}>
                  <Link to={`/guida/dungeon/${d.chiave}`} className="card card--cliccabile piastrella no-underline text-text flex gap-4 h-full" aria-label={`${d.nome}${d.sovrano ? `, ${d.sovrano}` : ''}`}>
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <EmblemaDungeon chiave={d.chiave} nome={d.nome} arcanaSovrano={d.arcanaSovrano} dimensione={84} />
                      {quota !== null && (
                        <AnelloAvanzamento quota={quota} dimensione={56} spessore={4} etichetta={`Avanzamento in ${d.nome}: ${d.gestiti} punti gestiti su ${d.punti}`}>
                          <span className="font-display text-[15px] leading-none tabular-nums">{Math.round(quota * 100)}%</span>
                        </AnelloAvanzamento>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display uppercase text-[21px] leading-none">{d.nome}</span>
                        {d.arcanaSovranoNome && <span className="chip">{d.arcanaSovranoNome}</span>}
                      </div>
                      {d.sovrano && <span className="text-[13px] text-text-secondary">{d.sovrano}</span>}
                      <div className="flex flex-wrap gap-1.5">
                        {d.date.sblocco && <span className="chip" title={d.date.sblocco}>Sblocco {dataBreve(d.date.sblocco)}</span>}
                        {d.date.scadenza && <span className="chip chip--attivo" title={d.date.scadenza}>Scadenza {dataBreve(d.date.scadenza)}</span>}
                        {d.livelloConsigliato && <span className="chip" title={d.livelloConsigliato}>Livello: {sintesi(d.livelloConsigliato, 36)}</span>}
                      </div>
                      <span className="text-[12px] text-text-muted">{d.aree} aree · {d.punti} punti · {d.esauribili} esauribili{d.gestiti !== null ? ` · ${d.gestiti} gestiti` : ''}</span>
                    </div>
                  </Link>
                  <CollegamentoVisivo to={`/guida/mappe/dungeon-${encodeURIComponent(d.chiave)}`} tono="fantasma" compatto className="mt-1" icona={<IconaAzione chiave="mappa" dimensione={20} />} titolo="Mappa" dettaglio={`${d.aree} aree collegate`} />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </PageState>
  );
}
