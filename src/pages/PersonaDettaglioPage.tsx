// ============================================================
// PersonaDettaglioPage — scheda completa di una Persona
// ============================================================

import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useCarica } from '../hooks/useCarica';
import { aggiungiPosseduta, getPersona, isApiError } from '../services/api';
import { ObiettivoModal } from '../components/partita/ObiettiviPartita';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import { ImmagineEntita } from '../components/shared/ImmagineEntita';
import { AffinitaGriglia } from '../components/compendio/AffinitaGriglia';
import { StatisticheBarre } from '../components/compendio/StatisticheBarre';
import { ElementoChip } from '../components/compendio/ElementoChip';
import { IconChevronLeft } from '../components/shared/icons';
import type { RicettaSpecialeDto } from '../types';
import { MASSIMO_STATISTICA, statistichePerLivello } from '../../shared/statistiche';
import { ORDINE_STATISTICHE } from '../utils/elementi';
import { slug } from '../../shared/slug';
import { useAsset } from '../stores/assetStore';
import { AssetImg } from '../components/shared/AssetImg';
import { StellaCinque } from '../components/shared/StellaCinque';
import { CorniceArte } from '../components/compendio/CorniceArte';
import { LivelloBadge } from '../components/compendio/LivelloBadge';
import { BadgeStato } from '../components/compendio/PiastrellaPersona';
import { getFusioniCon, getRicettePer, getPossedute } from '../services/api';
import { RicettaRiga } from '../components/fusione/RicettaRiga';
import { Modal } from '../components/shared/Modal';

const NOMI_STATISTICHE: Record<(typeof ORDINE_STATISTICHE)[number], string> = { forza: 'Forza', magia: 'Magia', resistenza: 'Resistenza', agilita: 'Agilità', fortuna: 'Fortuna' };

function Ricetta({ r }: { r: RicettaSpecialeDto }) {
  return (
    <div className="flex flex-wrap items-center gap-1 text-[13px]">
      {r.ingredienti.map((i, idx) => (
        <span key={i.id} className="flex items-center gap-1">
          <Link to={`/compendio/persona/${i.id}`} className="chip touch no-underline">{i.nomeIt}</Link>
          {idx < r.ingredienti.length - 1 && <span className="text-text-muted">+</span>}
        </span>
      ))}
      <span className="text-text-muted mx-1">→</span>
      <Link to={`/compendio/persona/${r.risultato.id}`} className="chip chip--attivo touch no-underline">{r.risultato.nomeIt}</Link>
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
  const [obiettivoAperto, setObiettivoAperto] = useState(false);
  const livelloScelto = p ? Math.min(99, Math.max(p.livello, livello ?? p.livello)) : 1;
  const statisticheAlLivello = p ? statistichePerLivello(p.statistiche, p.livello, livelloScelto) : null;

  const sfondoHero = useAsset('sfondi/mementos');
  // La stella mostra la forma delle statistiche: il tetto segue il valore più alto (arrotondato alla decina), così anche a livello 1 si legge.
  const statisticheMostrate = statisticheAlLivello ?? p?.statistiche ?? { forza: 0, magia: 0, resistenza: 0, agilita: 0, fortuna: 0 };
  const [scalaUnica, setScalaUnica] = useState(true);
  const [stellaIngrandita, setStellaIngrandita] = useState(false);
  const tettoAdattato = Math.min(MASSIMO_STATISTICA, Math.max(10, Math.ceil(Math.max(...ORDINE_STATISTICHE.map((k) => statisticheMostrate[k])) / 10) * 10));
  const tettoStella = scalaUnica ? MASSIMO_STATISTICA : tettoAdattato;
  const assiStella = ORDINE_STATISTICHE.map((k) => ({ chiave: k, etichetta: NOMI_STATISTICHE[k], valore: statisticheMostrate[k] / tettoStella, badge: `ui/stat-${k}`, testo: statisticheMostrate[k] }));
  const etichettaStella = `${p && livelloScelto > p.livello ? `Statistiche stimate al livello ${livelloScelto}` : `Statistiche al livello ${p?.livello ?? ''}`}, scala 0–${tettoStella}`;
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

          <section
            className="hero-persona card relative overflow-hidden flex flex-col lg:flex-row gap-5"
            style={sfondoHero ? { backgroundImage: `linear-gradient(90deg, rgba(11, 11, 14, 0.94), rgba(11, 11, 14, 0.78)), url("${sfondoHero}")` } : undefined}
          >
            <div className="shrink-0 w-full lg:w-[440px]">
              <CorniceArte>
                <ImmagineEntita ambito="persona" chiave={p.nome} etichetta={p.nomeIt} dimensione={280} forma="orizzontale" modificabile />
              </CorniceArte>
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <ImmagineEntita ambito="arcana" chiave={p.arcana} etichetta={p.arcanaNome} dimensione={64} forma="carta" />
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="titolo-display m-0">{p.nomeIt}</h1>
                    <LivelloBadge livello={p.livello} grande />
                    {p.rara && <AssetImg nome={`ui/tesoro-${slug(p.nome)}`} alt="" decorativa className="h-12 w-12 object-contain drop-shadow" fallback={null} />}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {p.nomeIt !== p.nome && <span className="chip" title="Nome nella localizzazione inglese">{p.nome}</span>}
                    <span className="chip chip--attivo">{p.arcanaNome}</span>
                    {p.dlc && <BadgeStato nome="dlc" testo={`DLC${p.dlcSet ? ` ${p.dlcSet}` : ''}`} />}
                    {p.rara && <BadgeStato nome="tesoro" testo="Demone del Tesoro" />}
                    {p.speciale && <BadgeStato nome="speciale" testo="Fusione speciale" />}
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
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-[230px_1fr] items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <button type="button" className="bg-transparent border-0 p-0 cursor-zoom-in" onClick={() => setStellaIngrandita(true)} aria-label="Ingrandisci la stella delle statistiche">
                    <StellaCinque assi={assiStella} dimensione={230} etichettaAria={etichettaStella} />
                  </button>
                  <div className="flex items-center gap-1.5 flex-wrap justify-center" role="group" aria-label="Scala della stella">
                    <button type="button" className={`chip touch ${scalaUnica ? 'chip--attivo' : ''}`} onClick={() => setScalaUnica(true)} aria-pressed={scalaUnica}>Scala 0–{MASSIMO_STATISTICA}</button>
                    <button type="button" className={`chip touch ${scalaUnica ? '' : 'chip--attivo'}`} onClick={() => setScalaUnica(false)} aria-pressed={!scalaUnica}>Adatta (0–{tettoAdattato})</button>
                  </div>
                  <span className="text-[11px] text-text-muted">Tocca la stella per ingrandirla</span>
                </div>
                <Modal titolo={`${p.nomeIt} — statistiche`} aperta={stellaIngrandita} onChiudi={() => setStellaIngrandita(false)} larga>
                  <div className="flex flex-col items-center gap-3">
                    <StellaCinque assi={assiStella} dimensione={460} badgeAltezza={40} etichettaAria={etichettaStella} />
                    <span className="text-[12px] text-text-muted">Scala 0–{tettoStella}{scalaUnica ? '' : ` (adattata; massimo ${MASSIMO_STATISTICA})`}</span>
                  </div>
                </Modal>
              <StatisticheBarre
                statistiche={statisticheAlLivello ?? p.statistiche}
                base={livelloScelto > p.livello ? p.statistiche : undefined}
                didascalia={livelloScelto > p.livello ? `Stima al livello ${livelloScelto}: +3 punti per livello ripartiti in proporzione alle statistiche base (livello ${p.livello}); in gioco la ripartizione varia.` : `Statistiche base al livello ${p.livello}.`}
              />
              </div>
              {attiva && !p.rara && (
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <button type="button" className="btn btn-primary" disabled={occupato} onClick={() => void aggiungi()}>
                    Aggiungi alla scorta al livello {livelloScelto}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setObiettivoAperto(true)}>Aggiungi agli obiettivi</button>
                </div>
              )}
              {attiva && obiettivoAperto && (
                <ObiettivoModal
                  partitaId={attiva.id}
                  personaIniziale={{ id: p.id, nomeIt: p.nomeIt, arcanaNome: p.arcanaNome, livello: p.livello }}
                  onChiudi={() => setObiettivoAperto(false)}
                  onSalvato={() => setObiettivoAperto(false)}
                />
              )}
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-2 items-start">
          <div className="flex flex-col gap-4">
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
                      <ElementoChip elemento={s.elemento} nome={s.elementoNome} />
                      <span className="text-[12px] text-text-muted">{s.costo.testo}</span>
                    </div>
                    <div className="text-[13px] text-text-secondary">{s.effettoNome}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          </div>
          <div className="flex flex-col gap-4">

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
              <dd className="m-0"><strong>{p.oggettoNomeIt ?? p.oggetto}</strong>{p.oggettoNomeIt && p.oggettoNomeIt !== p.oggetto && <span className="text-text-muted"> ({p.oggetto})</span>}{p.oggettoDescrizione && <span className="text-text-secondary"> — {p.oggettoDescrizione}</span>}</dd>
              <dt className="text-text-muted">Con Allarme</dt>
              <dd className="m-0"><strong>{p.oggettoAllarmeNomeIt ?? p.oggettoAllarme}</strong>{p.oggettoAllarmeNomeIt && p.oggettoAllarmeNomeIt !== p.oggettoAllarme && <span className="text-text-muted"> ({p.oggettoAllarme})</span>}{p.oggettoAllarmeDescrizione && <span className="text-text-secondary"> — {p.oggettoAllarmeDescrizione}</span>}</dd>
              {p.carteDaEsecuzione.length > 0 && (
                <>
                  <dt className="text-text-muted">Carte abilità</dt>
                  <dd className="m-0 flex flex-wrap gap-1">{p.carteDaEsecuzione.map((c) => <Link key={c.id} to={`/skill/${c.id}`} className="chip touch no-underline">{c.nome}</Link>)}</dd>
                </>
              )}
            </dl>
          </section>
          </div>
          </div>
        </div>
      )}
    </PageState>
  );
}
