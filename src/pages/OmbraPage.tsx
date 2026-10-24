// ============================================================
// OmbraPage — la scheda di un'Ombra: Persona e cattura, debolezze dal compendio, dove si incontra, negoziazione (L8, B8, R8-06, R8-07d, R8-15b, R8-28)
// ============================================================
//
// Pensata per la battaglia, dal telefono: in alto la Persona con la piastrella che la cattura (un tocco, la strada unica del compendio), poi le
// debolezze, poi dove si incontra e se lo si può ancora raggiungere, poi la personalità con il collegamento alla sua negoziazione. Le affinità
// vengono dalla Persona del compendio; solo le 4 eccezioni di G-019 e le non reclutabili ne hanno di proprie, dichiarate.
// ============================================================

import { Link, useParams } from 'react-router-dom';
import { getOmbra } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useCatturaPersona } from '../hooks/useCatturaPersona';
import { usePartitaStore } from '../stores/partitaStore';
import { PageState } from '../components/shared/PageState';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { AffinitaGriglia } from '../components/compendio/AffinitaGriglia';
import { AvvisoTogliPersona, PiastrelleCattura } from '../components/guida/PiastrelleCattura';
import { NOME_PERSONALITA } from '../../shared/elementi';
import type { OmbraDettaglioDto, OmbraLuogoDto } from '../../shared/ombre';

/** Il percorso di un luogo: «Palazzo › infiltrazione» o «Memento › dedalo › aree». */
const percorso = (l: OmbraLuogoDto): string => [l.dungeonNome, l.infiltrazione?.nome, l.areeDedalo.length > 0 ? l.areeDedalo.map((a) => a.nome).join(', ') : null].filter(Boolean).join(' › ');

/** I luoghi d'incontro: ognuno un collegamento alla guida del posto; un Palazzo concluso è sparito dopo il furto (R8-15b). */
function Luoghi({ o }: { o: OmbraDettaglioDto }) {
  return (
    <section className="card flex flex-col gap-1.5" aria-label="Dove si incontra">
      <h2 className="m-0 font-display text-[15px] uppercase leading-none">Dove si incontra</h2>
      {o.raggiungibilita && <p className="m-0 text-[13px]" role="status">{o.raggiungibilita.testo}</p>}
      {o.luoghi.length === 0
        ? <p className="m-0 text-[13px] text-text-muted">La guida non dice dove si incontra.</p>
        : (
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
            {o.luoghi.map((l) => (
              <li key={`${l.dungeon}|${l.infiltrazione?.chiave ?? ''}`} className="flex flex-wrap items-center gap-x-2">
                <Link to={l.casa} className={`touch inline-flex min-h-11 items-center text-[13px] ${l.raggiungibile === false ? 'opacity-60' : ''}`}>{percorso(l)}</Link>
                {l.raggiungibile === false && <span className="chip text-[11px]" title={l.motivoNonRaggiungibile}>Non più raggiungibile: il Palazzo è sparito</span>}
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}

export function OmbraPage() {
  const { chiave = '' } = useParams();
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  const dati = useCarica(() => getOmbra(chiave, partitaId ?? undefined), [chiave, partitaId]);
  const cattura = useCatturaPersona(partitaId);
  const o = dati.dati;
  useDocumentTitle(o ? o.nome : 'Ombra');
  return (
    <PageState isLoading={dati.caricamento && !o} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {o && (
        <div className="flex flex-col gap-3">
          <IntestazionePagina indietro={{ etichetta: 'Aiuto in battaglia', to: '/guida/battaglia' }} titolo={o.nome}
            sottotitolo={`${o.persona ? `Maschera ${o.persona.nomeIt}` : o.macheraNota ? `Maschera ${o.macheraNota}, non reclutabile` : 'Non reclutabile'}${o.livello !== null ? ` · livello ${o.livello}` : ''}${o.nomiAltri.length > 0 ? ` · detta anche ${o.nomiAltri.join(', ')}` : ''}`} />
          <section className="card flex flex-col gap-2" aria-label="Persona e cattura">
            <h2 className="m-0 font-display text-[15px] uppercase leading-none">Persona</h2>
            {o.persona ? (
              <div className="flex flex-wrap items-start gap-3">
                <div className="w-[104px] shrink-0">
                  <PiastrelleCattura aria-label={`Cattura di ${o.nome}`} partitaId={partitaId} catturate={cattura.catturate} occupata={cattura.occupata} onTocca={cattura.tocca}
                    voci={[{ chiave: o.chiave, persona: o.persona, etichetta: o.persona.nomeIt, ombra: o.chiave, catturabile: o.catturabile }]} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1 text-[13px]">
                  <span>{!partitaId ? 'Attiva una partita per segnare la cattura.'
                    : cattura.catturate === null ? 'Leggo il compendio…'
                    : cattura.catturate.has(o.persona.id) ? 'Registrata nel compendio della partita.' : o.catturabile ? 'Non ancora registrata: tocca la piastrella quando l’hai catturata.' : 'Non registrata: si ottiene dal compendio o per fusione.'}</span>
                  <Link to={`/compendio/persona/${o.persona.id}`} className="touch inline-flex min-h-11 items-center">Scheda del compendio</Link>
                </div>
              </div>
            ) : <p className="m-0 text-[13px] text-text-muted">Quest’Ombra non è reclutabile: non ha una Persona da catturare.</p>}
            {cattura.daTogliere?.persona && <AvvisoTogliPersona nome={cattura.daTogliere.persona.nomeIt} occupato={cattura.occupata !== null} onConferma={cattura.conferma} onAnnulla={cattura.annulla} />}
            {o.persona && !o.catturabile && <p className="m-0 text-[12px] text-text-muted">L’incontro non espone la cattura: la Persona si registra dal compendio o per fusione.</p>}
          </section>
          <section className="card flex flex-col gap-2" aria-label="Debolezze">
            <h2 className="m-0 font-display text-[15px] uppercase leading-none">Debolezze</h2>
            {o.affinita.length > 0 ? <AffinitaGriglia affinita={o.affinita} /> : <p className="m-0 text-[13px] text-text-muted">La guida non dice a cosa sia debole.</p>}
            {o.affinitaProprie && <p className="m-0 text-[12px] text-text-muted">Alcune affinità sono proprie dell’Ombra: nel gioco sono diverse da quelle della sua Persona{o.persona ? '; le altre vengono dal compendio' : ''}.</p>}
          </section>
          <Luoghi o={o} />
          <section className="card flex flex-col gap-1.5" aria-label="Negoziazione">
            <h2 className="m-0 font-display text-[15px] uppercase leading-none">Negoziazione</h2>
            {o.personalita === 'sconosciuta'
              ? <p className="m-0 text-[13px] text-text-muted">La personalità di quest’Ombra non è nota: nessun umore da proporre.</p>
              : o.negoziabile === false
                ? <p className="m-0 text-[13px] text-text-muted">Personalità {NOME_PERSONALITA[o.personalita].toLowerCase()}, ma quest’Ombra non si negozia.</p>
                : (
                  <div className="flex flex-wrap items-center gap-2 text-[13px]">
                    <span>Personalità <strong>{NOME_PERSONALITA[o.personalita]}</strong></span>
                    <Link to={`/guida/battaglia?scheda=negoziazione&ombra=${encodeURIComponent(o.chiave)}`} className="btn btn-secondary btn-sm touch">Negoziazione per {NOME_PERSONALITA[o.personalita].toLowerCase()}</Link>
                  </div>
                )}
          </section>
          {o.voci.length > 0 && (
            <section className="card flex flex-col gap-1" aria-label="Voci della guida">
              <h2 className="m-0 font-display text-[15px] uppercase leading-none">Nella guida</h2>
              <ul className="m-0 flex list-none flex-wrap gap-x-3 p-0 text-[12px]">
                {o.voci.map((v) => (
                  <li key={v.chiave}><Link to={`/guida/dungeon/${v.dungeon}?${v.dungeon === 'mementos' ? 'area' : 'infiltrazione'}=${encodeURIComponent(v.infiltrazione)}`} className="touch inline-flex min-h-11 items-center">{v.nome}</Link></li>
                ))}
              </ul>
            </section>
          )}
          {o.note && <p className="m-0 text-[12px] text-text-muted">{o.note}</p>}
        </div>
      )}
    </PageState>
  );
}
