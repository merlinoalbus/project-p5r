// ============================================================
// PersonaggiPage — il cast senza spoiler: Ladri Fantasma, Stanza di Velluto, Confidenti, terzo semestre (Fase 10.3)
// ============================================================

import { useMemo, useState } from 'react';
import { getPersonaggi } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PageState } from '../components/shared/PageState';
import { FilaScorrevole } from '../components/shared/FilaScorrevole';
import { ImmagineEntita } from '../components/shared/ImmagineEntita';
import type { PersonaggioDto } from '../types';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { PersonaDelPersonaggio } from '../components/guida/PersonaDelPersonaggio';
import { getPersone } from '../services/api';
import { CollegamentoVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';
import { useSuggerimenti } from '../stores/suggerimentiStore';
import { classiSuggerito } from '../utils/suggerimenti';
import { TargaSuggerito } from '../components/shared/Suggerito';

function Personaggio({ p, idCompendio }: { p: PersonaggioDto; idCompendio: Map<string, number> }) {
  const [aperto, setAperto] = useState(false);
  const sugg = useSuggerimenti();
  const secondari = new Set(p.campiDaFontiSecondarie);
  const nota = (campo: string) => (secondari.has(campo) ? <span className="text-[11px] text-text-muted" title="Dato da fonte secondaria, non dalla guida italiana"> (fonte secondaria)</span> : null);
  return (
    <li className={`card flex gap-3 min-w-0 ${classiSuggerito(sugg.evidenziato('personaggi', p.chiave))}`}>
      {/* stesso riquadro per tutti: i Confidenti usano la loro immagine, gli altri (Protagonista, Stanza di Velluto, Jose) il ritratto del personaggio, caricabile allo stesso modo */}
      {p.confidente
        ? <ImmagineEntita ambito="confidente" chiave={p.confidente} etichetta={p.nome} dimensione={88} forma="carta" modificabile />
        : <ImmagineEntita ambito="personaggio" chiave={p.chiave} etichetta={p.nome} dimensione={88} forma="carta" modificabile />}
      <div className="flex flex-col gap-1 text-[13px] min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="text-[16px]">{p.nome}</strong>
          {sugg.evidenziato('personaggi', p.chiave) && <TargaSuggerito motivo={sugg.motivo('personaggi', p.chiave)} compatta />}
          {p.nomeCodice && <span className="chip chip--attivo">{p.nomeCodice}</span>}
          {p.arcano && <span className="chip">{p.arcano}</span>}
          {p.giocabile && <span className="chip text-[11px]">giocabile</span>}
        </div>
        <p className="m-0">{p.ruolo}</p>
        {p.persona.length > 0 && <PersonaDelPersonaggio personaggio={p.nome} persone={p.persona} idCompendio={idCompendio} />}
        <button type="button" className="text-left text-[12px] text-primary touch self-start" onClick={() => setAperto((v) => !v)} aria-expanded={aperto}>{aperto ? 'Meno dettagli' : 'Più dettagli'}</button>
        {aperto && (
          <div className="flex flex-col gap-1">
            {p.presentazione && <p className="m-0 text-text-secondary">{p.presentazione}</p>}
            {(p.armi.mischia || p.armi.distanza) && <p className="m-0"><strong>Armi:</strong> {[p.armi.mischia, p.armi.distanza].filter(Boolean).join(' · ')}{nota('armi')}</p>}
            {p.battaglia && <p className="m-0"><strong>In battaglia:</strong> {p.battaglia}{nota('battaglia')}</p>}
            {(p.scuola || p.eta) && <p className="m-0"><strong>Scuola/età:</strong> {[p.scuola, p.eta].filter(Boolean).join(' · ')}{nota('scuola')}{nota('eta')}</p>}
            {(p.doppiatori.jp || p.doppiatori.en) && <p className="m-0"><strong>Doppiatori:</strong> {[p.doppiatori.jp ? `JP ${p.doppiatori.jp}` : null, p.doppiatori.en ? `EN ${p.doppiatori.en}` : null].filter(Boolean).join(' · ')}{nota('doppiatori')}</p>}
            <div className="flex flex-wrap gap-2 items-center">
              {p.confidente && <CollegamentoVisivo tono="secondario" compatto icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo="Scheda Confidente" to={`/confidenti/${p.confidente}`} />}
              {p.fonte && <a href={p.fonte} target="_blank" rel="noreferrer" className="credito">fonte</a>}
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

export function PersonaggiPage() {
  useDocumentTitle('Personaggi');
  const dati = useCarica(() => getPersonaggi(), []);
  const d = dati.dati;
  const [gruppo, setGruppo] = useState<string>('');
  const perChiave = useMemo(() => new Map((d?.personaggi ?? []).map((p) => [p.chiave, p])), [d]);
  const compendio = useCarica(() => getPersone(), []);
  const idCompendio = useMemo(() => new Map((compendio.dati ?? []).flatMap((p) => [[p.nomeIt, p.id] as [string, number], [p.nome, p.id] as [string, number], [p.nomeIt.toLowerCase(), p.id] as [string, number]])), [compendio.dati]);
  const gruppi = useMemo(() => (d?.gruppi ?? []).filter((g) => !gruppo || g.nome === gruppo), [d, gruppo]);
  return (
    <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {d && (
        <div className="flex flex-col gap-3">
          <IntestazionePagina titolo="Personaggi" sottotitolo="Il cast di Persona 5 Royal presentato senza spoiler: chi sono, il loro ruolo, le Persona, le armi e il ruolo in battaglia; ogni Confidente rimanda alla sua scheda con risposte e abilità." />
          <FilaScorrevole role="tablist" aria-label="Gruppi">
            <button type="button" role="tab" aria-selected={gruppo === ''} className={`chip touch ${gruppo === '' ? 'chip--attivo' : ''}`} onClick={() => setGruppo('')}>Tutti</button>
            {d.gruppi.map((g) => <button key={g.nome} type="button" role="tab" aria-selected={gruppo === g.nome} className={`chip touch ${gruppo === g.nome ? 'chip--attivo' : ''}`} onClick={() => setGruppo(g.nome)}>{g.nome} ({g.membri.length})</button>)}
          </FilaScorrevole>
          {gruppi.map((g) => (
            <section key={g.nome} className="flex flex-col gap-2">
              <h2 className="m-0 text-[15px] font-semibold">{g.nome}</h2>
              <ul className="m-0 p-0 list-none grid gap-2 grid-cols-[minmax(0,1fr)] xl:grid-cols-2" aria-label={g.nome}>
                {g.membri.map((m) => perChiave.get(m)).filter((p): p is PersonaggioDto => !!p).map((p) => <Personaggio key={`${g.nome}-${p.chiave}`} p={p} idCompendio={idCompendio} />)}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PageState>
  );
}
