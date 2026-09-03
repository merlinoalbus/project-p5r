// ============================================================
// PersonaDettaglioPage — scheda completa di una Persona
// ============================================================

import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useCarica } from '../hooks/useCarica';
import { aggiungiPosseduta, getPersona, isApiError } from '../services/api';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import { ImmagineEntita } from '../components/shared/ImmagineEntita';
import { AffinitaGriglia } from '../components/compendio/AffinitaGriglia';
import { StatisticheBarre } from '../components/compendio/StatisticheBarre';
import { ElementoChip } from '../components/compendio/ElementoChip';
import { IconChevronLeft } from '../components/shared/icons';
import type { RicettaSpecialeDto } from '../types';
import { statistichePerLivello } from '../../shared/statistiche';
import { getFusioniCon, getRicettePer, getPossedute } from '../services/api';
import { RicettaRiga } from '../components/fusione/RicettaRiga';

function Ricetta({ r }: { r: RicettaSpecialeDto }) {
  return (
    <div className="flex flex-wrap items-center gap-1 text-[13px]">
      {r.ingredienti.map((i, idx) => (
        <span key={i.id} className="flex items-center gap-1">
          <Link to={`/compendio/persona/${i.id}`} className="chip touch no-underline">{i.nome}</Link>
          {idx < r.ingredienti.length - 1 && <span className="text-text-muted">+</span>}
        </span>
      ))}
      <span className="text-text-muted mx-1">→</span>
      <Link to={`/compendio/persona/${r.risultato.id}`} className="chip chip--attivo touch no-underline">{r.risultato.nome}</Link>
    </div>
  );
}

/** Anteprima delle ricette per ottenere la Persona e delle fusioni in cui è ingrediente, con i collegamenti al calcolatore. */
function SezioneFusione({ personaId, rara, partitaId, livelloProtagonista }: { personaId: number; rara: boolean; partitaId: number | null; livelloProtagonista: number | null }) {
  const per = useCarica(() => (rara ? Promise.resolve(null) : getRicettePer(personaId, { partita: partitaId ?? undefined, limite: 5 })), [personaId, partitaId, rara]);
  const con = useCarica(() => getFusioniCon(personaId, { partita: partitaId ?? undefined, limite: 5 }), [personaId, partitaId]);
  const scorta = useCarica(() => (partitaId ? getPossedute(partitaId) : Promise.resolve([])), [partitaId]);
  const inScorta = useMemo(() => new Set((scorta.dati ?? []).map((x) => x.personaId)), [scorta.dati]);
  return (
    <section className="card flex flex-col gap-3">
      <h2 className="m-0 text-[15px] font-semibold">Fusione</h2>
      {rara ? (
        <p className="m-0 text-[13px] text-text-secondary">Demone del Tesoro: non si ottiene per fusione, ma fuso con una Persona normale ne sposta il rango nell'arcano.</p>
      ) : per.dati ? (
        <div>
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <span className="text-[13px] text-text-secondary">Come ottenerla: <strong className="text-text">{per.dati.totale}</strong> ricette{per.dati.totale > 0 ? ' (le più economiche)' : ''}</span>
            <span className="flex gap-3">
              {per.dati.totale > 5 && <Link to={`/fusione?vista=ricette&ricette=${personaId}`} className="text-[13px] text-primary">Tutte le ricette →</Link>}
              <Link to={`/fusione?vista=piani&piani=${personaId}`} className="text-[13px] text-primary">Piano di fusione →</Link>
            </span>
          </div>
          {per.dati.ricette.length > 0 && (
            <ul className="m-0 p-0 list-none divide-y divide-border-light">
              {per.dati.ricette.map((r) => <RicettaRiga key={r.ingredienti.map((i) => i.id).join('-')} ricetta={r} inScorta={inScorta} mostraRisultato={false} />)}
            </ul>
          )}
        </div>
      ) : per.caricamento ? <span className="text-[13px] text-text-muted">Calcolo delle ricette…</span> : null}
      {con.dati && (
        <div>
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <span className="text-[13px] text-text-secondary">Come ingrediente: <strong className="text-text">{con.dati.totale}</strong> fusioni possibili</span>
            {con.dati.totale > 5 && <Link to={`/fusione?vista=con&con=${personaId}`} className="text-[13px] text-primary">Tutte le fusioni →</Link>}
          </div>
          <ul className="m-0 p-0 list-none divide-y divide-border-light">
            {con.dati.ricette.map((r) => <RicettaRiga key={r.ingredienti.map((i) => i.id).join('-') + r.risultato.id} ricetta={r} inScorta={inScorta} />)}
          </ul>
        </div>
      )}
      {livelloProtagonista !== null && <p className="m-0 text-[12px] text-text-muted">Nel calcolatore puoi limitare i risultati al livello {livelloProtagonista} del protagonista.</p>}
    </section>
  );
}

/** Scheda Persona: identità, statistiche, affinità, skill, tratto, fusioni, esecuzione, Mementos. */
export function PersonaDettaglioPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const personaId = Number(id);
  const { dati: p, caricamento, errore, ricarica } = useCarica(() => getPersona(personaId), [personaId]);
  useDocumentTitle(p ? p.nomeIt : 'Persona');
  const attiva = usePartitaStore((s) => s.attiva);
  const [livello, setLivello] = useState<number | null>(null);
  const [occupato, setOccupato] = useState(false);
  const livelloScelto = p ? Math.min(99, Math.max(p.livello, livello ?? p.livello)) : 1;
  const statisticheAlLivello = p ? statistichePerLivello(p.statistiche, p.livello, livelloScelto) : null;

  const aggiungi = async () => {
    if (!attiva || !p) return;
    setOccupato(true);
    try {
      await aggiungiPosseduta(attiva.id, p.id, { livello: livelloScelto });
      notifica('success', `${p.nomeIt} aggiunta alla scorta di «${attiva.nome}».`);
    } catch (err) {
      if (isApiError(err, 'persona-gia-posseduta')) notifica('warning', 'Questa Persona è già nella scorta.');
      else notifica('error', err instanceof Error ? err.message : 'Operazione fallita.');
    } finally {
      setOccupato(false);
    }
  };

  return (
    <PageState isLoading={caricamento} error={errore} onRetry={() => void ricarica()}>
      {p && (
        <div className="flex flex-col gap-4">
          <button type="button" className="btn btn-ghost self-start -ml-2" onClick={() => navigate(-1)}>
            <IconChevronLeft size={18} /> Indietro
          </button>

          <div className="card flex flex-col sm:flex-row gap-4">
            <div className="flex sm:flex-col gap-3 items-start">
              <ImmagineEntita ambito="persona" chiave={p.nome} etichetta={p.nome} dimensione={240} forma="orizzontale" modificabile className="max-w-full" />
              <ImmagineEntita ambito="arcana" chiave={p.arcana} etichetta={p.arcanaNome} dimensione={72} forma="carta" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="m-0 text-2xl font-bold">{p.nomeIt}</h1>
                {p.nomeIt !== p.nome && <span className="chip" title="Nome nella localizzazione inglese">{p.nome}</span>}
                <span className="chip chip--attivo">{p.arcanaNome}</span>
                <span className="chip">Livello {p.livello}</span>
                {p.dlc && <span className="chip">DLC{p.dlcSet ? ` ${p.dlcSet}` : ''}</span>}
                {p.rara && <span className="chip">Demone del Tesoro</span>}
                {p.speciale && <span className="chip">Fusione speciale</span>}
                {p.richiedeConfidenteMax && <span className="chip">Richiede Confidente al massimo</span>}
              </div>
              <div className="text-[13px] text-text-secondary flex flex-wrap gap-x-4 gap-y-1">
                <span>Eredità: <strong className="text-text">{p.ereditaNome ?? '—'}</strong></span>
                {p.notaNome && <span className="text-warning">{p.notaNome}</span>}
                {p.areeMementos.length > 0 && (
                  <span>Mementos: <strong className="text-text">{p.areeMementos.map((a) => a.nome).join(', ')}</strong>{p.pianiMementos ? ` — ${p.pianiMementos}` : ''}</span>
                )}
                {p.negoziazione && <span>Ombra: <strong className="text-text">{p.negoziazione.titoloNome}</strong></span>}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="text-[13px] text-text-secondary flex items-center gap-2">
                  Livello
                  <input type="number" min={p.livello} max={99} className="form-input w-[84px]" value={livelloScelto} onChange={(e) => setLivello(Math.min(99, Math.max(p.livello, Number(e.target.value) || p.livello)))} aria-label="Livello per la stima delle statistiche" />
                </label>
                <input type="range" min={p.livello} max={99} value={livelloScelto} onChange={(e) => setLivello(Number(e.target.value))} className="flex-1 min-w-[140px] touch" aria-label="Livello (cursore)" />
              </div>
              <StatisticheBarre
                statistiche={statisticheAlLivello ?? p.statistiche}
                base={livelloScelto > p.livello ? p.statistiche : undefined}
                didascalia={livelloScelto > p.livello ? `Stima al livello ${livelloScelto}: +3 punti per livello ripartiti in proporzione alle statistiche base (livello ${p.livello}); in gioco la ripartizione varia.` : `Statistiche base al livello ${p.livello}.`}
              />
              {attiva && !p.rara && (
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <button type="button" className="btn btn-primary" disabled={occupato} onClick={() => void aggiungi()}>
                    Aggiungi alla scorta al livello {livelloScelto}
                  </button>
                </div>
              )}
            </div>
          </div>

          <section className="card">
            <h2 className="m-0 mb-3 text-[15px] font-semibold">Affinità</h2>
            <AffinitaGriglia affinita={p.affinita} />
          </section>

          <section className="card">
            <h2 className="m-0 mb-3 text-[15px] font-semibold">Skill</h2>
            <ul className="m-0 p-0 list-none flex flex-col divide-y divide-border-light">
              {p.skill.map((s) => (
                <li key={s.id} className="py-2 flex items-start gap-3">
                  <span className={`w-14 shrink-0 text-[12px] font-bold ${s.livello === 0 ? 'text-primary' : 'text-text-secondary'}`}>{s.livello === 0 ? 'Innata' : `Liv. ${s.livello}`}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to={`/skill/${s.id}`} className="font-semibold no-underline text-text hover:text-primary">{s.nomeIt}</Link>
                      {s.nomeIt !== s.nome && <span className="text-[12px] text-text-muted">{s.nome}</span>}
                      <ElementoChip elemento={s.elemento} nome={s.elementoNome} piccolo />
                      <span className="text-[12px] text-text-muted">{s.costo.testo}</span>
                    </div>
                    <div className="text-[13px] text-text-secondary">{s.effettoNome}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {p.trattoDettaglio && (
            <section className="card">
              <h2 className="m-0 mb-2 text-[15px] font-semibold">Tratto</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <Link to={`/skill/${p.trattoDettaglio.id}`} className="font-semibold no-underline text-text hover:text-primary">{p.trattoDettaglio.nomeIt}</Link>
                {p.trattoDettaglio.nomeIt !== p.trattoDettaglio.nome && <span className="text-[12px] text-text-muted">{p.trattoDettaglio.nome}</span>}
              </div>
              <div className="text-[13px] text-text-secondary">{p.trattoDettaglio.effettoNome}</div>
            </section>
          )}

          <SezioneFusione personaId={p.id} rara={p.rara} partitaId={attiva?.id ?? null} livelloProtagonista={attiva?.livelloProtagonista ?? null} />

          {(p.ricettaSpeciale || p.ingredienteDi.length > 0) && (
            <section className="card flex flex-col gap-3">
              <h2 className="m-0 text-[15px] font-semibold">Fusioni speciali</h2>
              {p.ricettaSpeciale && (
                <div>
                  <div className="text-[12px] text-text-muted mb-1">Si ottiene con</div>
                  <Ricetta r={p.ricettaSpeciale} />
                </div>
              )}
              {p.ingredienteDi.length > 0 && (
                <div>
                  <div className="text-[12px] text-text-muted mb-1">È ingrediente di</div>
                  <div className="flex flex-col gap-1">{p.ingredienteDi.map((r) => <Ricetta key={r.risultato.id} r={r} />)}</div>
                </div>
              )}
            </section>
          )}

          <section className="card">
            <h2 className="m-0 mb-2 text-[15px] font-semibold">Esecuzione (Stanza di Velluto)</h2>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px]">
              <dt className="text-text-muted">Normale</dt>
              <dd className="m-0"><strong>{p.oggetto}</strong>{p.oggettoDescrizione && <span className="text-text-secondary"> — {p.oggettoDescrizione}</span>}</dd>
              <dt className="text-text-muted">Con Allarme</dt>
              <dd className="m-0"><strong>{p.oggettoAllarme}</strong>{p.oggettoAllarmeDescrizione && <span className="text-text-secondary"> — {p.oggettoAllarmeDescrizione}</span>}</dd>
              {p.carteDaEsecuzione.length > 0 && (
                <>
                  <dt className="text-text-muted">Carte abilità</dt>
                  <dd className="m-0 flex flex-wrap gap-1">{p.carteDaEsecuzione.map((c) => <Link key={c.id} to={`/skill/${c.id}`} className="chip touch no-underline">{c.nome}</Link>)}</dd>
                </>
              )}
            </dl>
          </section>
        </div>
      )}
    </PageState>
  );
}
