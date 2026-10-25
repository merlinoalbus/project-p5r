// ============================================================
// PersonaDettaglioPage — scheda completa di una Persona
// ============================================================

import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useCarica } from '../hooks/useCarica';
import { aggiungiPosseduta, getFusioniCon, getPersona, getPossedute, getRicettePer, isApiError } from '../services/api';
import { ObiettivoModal } from '../components/partita/ObiettiviPartita';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import { ImmagineEntita } from '../components/shared/ImmagineEntita';
import { AffinitaGriglia } from '../components/compendio/AffinitaGriglia';
import { ModificaAffinita } from '../components/compendio/ModificaAffinita';
import { ModificaGuida } from '../components/guida/ModificaGuida';
import { campiPersona } from '../components/compendio/campiPersona';
import { DoveSiIncontra } from '../components/compendio/DoveSiIncontra';
import { StatisticheBarre } from '../components/compendio/StatisticheBarre';
import { ElementoChip } from '../components/compendio/ElementoChip';
import type { RicettaSpecialeDto, SkillAppresaDto } from '../types';
import { CHIAVI_STATISTICHE, MASSIMO_STATISTICA, NOMI_STATISTICHE, statistichePerLivello } from '../../shared/statistiche';
import { slug } from '../../shared/slug';
import { useAsset } from '../stores/assetStore';
import { AssetImg } from '../components/shared/AssetImg';
import { StellaCinque } from '../components/shared/StellaCinque';
import { CorniceArte } from '../components/compendio/CorniceArte';
import { LivelloBadge } from '../components/compendio/LivelloBadge';
import { BadgeStato } from '../components/compendio/PiastrellaPersona';
import { OperatoreRicetta, RicettaRiga } from '../components/fusione/RicettaRiga';
import { PersonaChip } from '../components/fusione/PersonaChip';
import { Modal } from '../components/shared/Modal';
import { PulsanteVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';
import { TitoloSezione } from '../components/shared/TitoloSezione';
import { IntestazioneScheda } from '../components/shared/IntestazioneScheda';
import { MenuModifica } from '../components/shared/MenuModifica';


/** Come si impara una skill: «Innata», «Liv. N», oppure — per le forme del gruppo — con il risveglio, i ranghi del Confidente o la 3ª forma. */
function etichettaApprendimento(s: SkillAppresaDto): string {
  if (s.livello === 0) return 'Innata';
  if (s.livello !== null) return `Liv. ${s.livello}`;
  return s.modo === 'risveglio' ? 'Risveglio' : s.modo === 'terza-forma' ? '3ª forma' : 'Rango';
}

/** Ricetta speciale come riga di tasselli (stessa resa delle ricette di fusione: 14.10). */
function Ricetta({ r }: { r: RicettaSpecialeDto }) {
  return (
    <div className="ricetta-riga__persone">
      {r.ingredienti.map((i, idx) => (
        <span key={i.id} className="ricetta-riga__gruppo">
          <PersonaChip p={i} />
          {idx < r.ingredienti.length - 1 && <OperatoreRicetta tipo="piu" />}
        </span>
      ))}
      <span className="ricetta-riga__gruppo">
        <OperatoreRicetta tipo="risultato" />
        <PersonaChip p={r.risultato} evidenza />
      </span>
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
      <TitoloSezione>Fusione</TitoloSezione>
      {rara ? (
        <p className="m-0 testo-13 text-text-secondary">Demone del Tesoro: non si ottiene per fusione, ma fuso con una Persona normale ne sposta il rango nell'arcano.</p>
      ) : per.dati ? (
        <div>
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <span className="testo-13 text-text-secondary">Come ottenerla: <strong className="text-text">{per.dati.totale}</strong> ricette{per.dati.totale > 0 ? ' (le più economiche)' : ''}</span>
            <span className="flex gap-3">
              {per.dati.totale > 5 && <Link to={`/fusione?vista=ricette&ricette=${personaId}`} className="touch inline-flex items-center testo-13 text-primary-testo">Tutte le ricette →</Link>}
              <Link to={`/fusione?vista=piani&piani=${personaId}`} className="touch inline-flex items-center testo-13 text-primary-testo">Piano di fusione →</Link>
            </span>
          </div>
          {per.dati.ricette.length > 0 && (
            <ul className="m-0 p-0 list-none divide-y divide-border-light">
              {per.dati.ricette.map((r) => <RicettaRiga key={r.ingredienti.map((i) => i.id).join('-')} ricetta={r} inScorta={inScorta} mostraRisultato={false} />)}
            </ul>
          )}
        </div>
      ) : per.caricamento ? <span className="testo-13 text-text-muted">Calcolo delle ricette…</span> : null}
      {con.dati && (
        <div>
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <span className="testo-13 text-text-secondary">Come ingrediente: <strong className="text-text">{con.dati.totale}</strong> fusioni possibili</span>
            {con.dati.totale > 5 && <Link to={`/fusione?vista=con&con=${personaId}`} className="touch inline-flex items-center testo-13 text-primary-testo">Tutte le fusioni →</Link>}
          </div>
          <ul className="m-0 p-0 list-none divide-y divide-border-light">
            {con.dati.ricette.map((r) => <RicettaRiga key={r.ingredienti.map((i) => i.id).join('-') + r.risultato.id} ricetta={r} inScorta={inScorta} />)}
          </ul>
        </div>
      )}
      {livelloProtagonista !== null && <p className="m-0 testo-12 text-text-muted">Nel calcolatore puoi limitare i risultati al livello {livelloProtagonista} del protagonista.</p>}
    </section>
  );
}

/** Scheda Persona: identità, statistiche, affinità, skill, tratto, fusioni, esecuzione, Mementos. */
export function PersonaDettaglioPage() {
  const { id } = useParams();
  const personaId = Number(id);
  const { dati: p, inPrimoCaricamento, errore, ricarica } = useCarica(() => getPersona(personaId), [personaId]);
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
  const tettoAdattato = Math.min(MASSIMO_STATISTICA, Math.max(10, Math.ceil(Math.max(...CHIAVI_STATISTICHE.map((k) => statisticheMostrate[k])) / 10) * 10));
  const tettoStella = scalaUnica ? MASSIMO_STATISTICA : tettoAdattato;
  const assiStella = CHIAVI_STATISTICHE.map((k) => ({ chiave: k, etichetta: NOMI_STATISTICHE[k], valore: statisticheMostrate[k] / tettoStella, badge: `ui/stat-${k}`, testo: statisticheMostrate[k] }));
  const etichettaStella = `${p && livelloScelto > p.livello ? `Statistiche stimate al livello ${livelloScelto}` : `Statistiche al livello ${p?.livello ?? ''}`}, scala 0–${tettoStella}`;
  /** Aggiunge la Persona alla scorta della partita attiva al livello scelto (mai sotto il suo livello base); se è già posseduta avvisa invece di segnalare un errore. */
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
    <PageState isLoading={inPrimoCaricamento} error={errore} onRetry={() => void ricarica()} scheda={{ titolo: 'Persona', ripiego: '/compendio' }}>
      {p && (
        <div className="flex flex-col gap-4">
          {/* Lotto B: l'intestazione comune delle schede, prima dell'immagine (sul telefono il nome stava sotto l'arte, al 71% della
              schermata); le correzioni della guida (Persona, set DLC, Demone del Tesoro, ricetta speciale) nel menu «Modifica ⋯» */}
          <IntestazioneScheda ripiego="/compendio" titolo={p.nomeIt}
            figura={<ImmagineEntita ambito="arcana" chiave={p.arcana} etichetta={p.arcanaNome} dimensione={44} forma="carta" />}
            chip={<>
              <LivelloBadge livello={p.livello} grande />
              {p.rara && <AssetImg nome={`ui/tesoro-${slug(p.nome)}`} alt="" decorativa className="h-12 w-12 object-contain drop-shadow" fallback={null} />}
            </>}
            azioni={<MenuModifica cosa={`la Persona «${p.nomeIt}»`}>
              <ModificaGuida tipo="persona" chiave={String(p.id)} cosa={`la Persona «${p.nomeIt}»`} etichetta="Testi della Persona" campiSpeciali={campiPersona(p.delParty)} onSalvato={() => void ricarica()} />
              {p.dlc && p.dlcSet && <ModificaGuida tipo="dlc-set" chiave={String(p.dlcSet)} cosa={`il set DLC ${p.dlcSet}`} etichetta={`Set DLC ${p.dlcSet}`} onSalvato={() => void ricarica()} />}
              {p.rara && <ModificaGuida tipo="tesoro" chiave={String(p.id)} cosa={`il Demone del Tesoro «${p.nomeIt}»`} etichetta="Demone del Tesoro" onSalvato={() => void ricarica()} />}
              {p.speciale && <ModificaGuida tipo="fusione-speciale" chiave={String(p.id)} cosa={`la ricetta di «${p.nomeIt}»`} etichetta="Ricetta speciale" onSalvato={() => void ricarica()} />}
            </MenuModifica>}>
            <div className="flex items-center gap-2 flex-wrap">
              {p.nomeIt !== p.nome && <span className="chip" title="Nome nella localizzazione inglese">{p.nome}</span>}
              <span className="chip chip--attivo">{p.arcanaNome}</span>
              {p.dlc && <BadgeStato nome="dlc" testo={`DLC${p.dlcSet ? ` ${p.dlcSet}` : ''}`} />}
              {p.rara && <BadgeStato nome="tesoro" testo="Demone del Tesoro" />}
              {p.speciale && <BadgeStato nome="speciale" testo="Fusione speciale" />}
              {p.richiedeConfidenteMax && <span className="chip">Richiede Confidente al massimo</span>}
            </div>
          </IntestazioneScheda>

          <section
            className="hero-persona card relative overflow-hidden flex flex-col lg:flex-row gap-5"
            style={sfondoHero ? { backgroundImage: `linear-gradient(90deg, rgba(11, 11, 14, 0.94), rgba(11, 11, 14, 0.78)), url("${sfondoHero}")` } : undefined}
          >
            <div className="shrink-0 w-full lg:w-[440px]">
              <CorniceArte>
                <ImmagineEntita ambito="persona" chiave={p.nome} etichetta={p.nomeIt} dimensione={280} forma="orizzontale" modificabile />
              </CorniceArte>
              {p.descrizione && (
                <section className="card mt-3 py-2.5 px-3 flex flex-col gap-1" aria-label="Chi è">
                  <span className="testo-12 font-semibold uppercase tracking-[.06em] text-text-muted">Chi è</span>
                  <p className="m-0 testo-13 leading-relaxed text-text-secondary h-[118px] area-scorrevole px-2 py-1">{p.descrizione}</p>
                  {p.fonteDescrizione && <span className="testo-12 text-text-muted">Origine: {p.fonteDescrizione}</span>}
                </section>
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  {/* Sul telefono la scheda Affinità completa arriva dopo immagine, «Chi è» e statistiche, a più di due schermate: in
                      battaglia debole/resiste è la prima cosa che serve, quindi qui c'è la riga compatta (sotto, la scheda intera resta) */}
                  <div className="md:hidden">
                    <AffinitaGriglia affinita={p.affinita} compatta etichetta="Affinità in breve" />
                  </div>
                  <div className="testo-13 text-text-secondary flex flex-wrap gap-x-4 gap-y-1">
                    <span>Eredità: <strong className="text-text">{p.ereditaNome ?? '—'}</strong></span>
                    {p.delParty && (
                      <span>
                        Persona del gruppo: <strong className="text-text">{p.forma}ª forma</strong>
                        {p.derivaDa && <> — deriva da <Link to={`/compendio/persona/${p.derivaDa.id}`} className="touch inline-flex items-center text-primary-testo">{p.derivaDa.nomeIt}</Link></>}
                      </span>
                    )}
                    {p.notaNome && <span className="text-warning">{p.notaNome}</span>}
                    {p.areeMementos.length > 0 && (
                      <span>Mementos: <strong className="text-text">{p.areeMementos.map((a) => a.nome).join(', ')}</strong>{p.pianiMementos ? ` — ${p.pianiMementos}` : ''}</span>
                    )}
                    {p.negoziazione && <span>Ombra: <strong className="text-text">{p.negoziazione.titoloNome}</strong></span>}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="testo-13 text-text-secondary flex items-center gap-2">
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
                  <span className="testo-12 text-text-muted">Tocca la stella per ingrandirla</span>
                </div>
                <Modal titolo={`${p.nomeIt} — statistiche`} aperta={stellaIngrandita} onChiudi={() => setStellaIngrandita(false)} larga>
                  <div className="flex flex-col items-center gap-3">
                    <StellaCinque assi={assiStella} dimensione={460} badgeAltezza={40} etichettaAria={etichettaStella} />
                    <span className="testo-12 text-text-muted">Scala 0–{tettoStella}{scalaUnica ? '' : ` (adattata; massimo ${MASSIMO_STATISTICA})`}</span>
                  </div>
                </Modal>
              <StatisticheBarre
                statistiche={statisticheAlLivello ?? p.statistiche}
                base={livelloScelto > p.livello ? p.statistiche : undefined}
                didascalia={livelloScelto > p.livello ? `Stima al livello ${livelloScelto}: +3 punti per livello ripartiti in proporzione alle statistiche base (livello ${p.livello}); in gioco la ripartizione varia.` : `Statistiche base al livello ${p.livello}.`}
              />
              </div>
              {attiva && !p.rara && !p.delParty && (
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="piu" dimensione={22} />} titolo="Aggiungi alla scorta" dettaglio={`al livello ${livelloScelto}`}
                    disabled={occupato} onClick={() => void aggiungi()} />
                  <PulsanteVisivo tono="secondario" icona={<IconaAzione chiave="obiettivo" dimensione={22} />} titolo="Aggiungi agli obiettivi" onClick={() => setObiettivoAperto(true)} />
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
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <TitoloSezione>Affinità</TitoloSezione>
              {p.affinitaGuida && <span className="chip testo-12">corrette da te</span>}
              <ModificaAffinita personaId={p.id} nome={p.nomeIt} affinita={p.affinita} affinitaGuida={p.affinitaGuida} onCambiato={ricarica} />
            </div>
            <AffinitaGriglia affinita={p.affinita} />
          </section>

          {/* L8 (R8-05, R8-07): dove si incontra e se è registrata nella partita, dalla stessa fonte della Battaglia e dei dedali. Le forme del gruppo non si catturano. */}
          {!p.delParty && <DoveSiIncontra persona={{ id: p.id, nome: p.nome, nomeIt: p.nomeIt }} partitaId={attiva?.id ?? null} />}

          <section className="card">
            <TitoloSezione className="mb-3">Skill</TitoloSezione>
            <ul className="m-0 p-0 list-none flex flex-col divide-y divide-border-light">
              {p.skill.map((s) => (
                <li key={s.id} className="py-2 flex items-start gap-3">
                  <span className={`${p.delParty ? 'w-20' : 'w-14'} shrink-0 testo-12 font-bold ${s.livello === 0 ? 'text-primary-testo' : 'text-text-secondary'}`}>{etichettaApprendimento(s)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to={`/skill/${s.id}`} className="touch inline-flex items-center font-semibold no-underline text-text hover:text-primary-testo">{s.nomeIt}</Link>
                      {s.nomeIt !== s.nome && <span className="testo-12 text-text-muted">{s.nome}</span>}
                      <ElementoChip elemento={s.elemento} nome={s.elementoNome} />
                      <span className="testo-12 text-text-muted">{s.costo.testo}</span>
                    </div>
                    <div className="testo-13 text-text-secondary">{s.effettoNome}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          </div>
          <div className="flex flex-col gap-4">

          {p.trattoDettaglio && (
            <section className="card">
              <TitoloSezione className="mb-2">Tratto</TitoloSezione>
              <div className="flex items-center gap-2 flex-wrap">
                <Link to={`/skill/${p.trattoDettaglio.id}`} className="touch inline-flex items-center font-semibold no-underline text-text hover:text-primary-testo">{p.trattoDettaglio.nomeIt}</Link>
                {p.trattoDettaglio.nomeIt !== p.trattoDettaglio.nome && <span className="testo-12 text-text-muted">{p.trattoDettaglio.nome}</span>}
              </div>
              <div className="testo-13 text-text-secondary">{p.trattoDettaglio.effettoNome}</div>
            </section>
          )}

          {!p.delParty && <SezioneFusione personaId={p.id} rara={p.rara} partitaId={attiva?.id ?? null} livelloProtagonista={attiva?.livelloProtagonista ?? null} />}

          {(p.ricettaSpeciale || p.ingredienteDi.length > 0) && (
            <section className="card flex flex-col gap-3">
              <TitoloSezione>Fusioni speciali</TitoloSezione>
              {p.ricettaSpeciale && (
                <div>
                  <div className="testo-12 text-text-muted mb-1">Si ottiene con</div>
                  <Ricetta r={p.ricettaSpeciale} />
                </div>
              )}
              {p.ingredienteDi.length > 0 && (
                <div>
                  <div className="testo-12 text-text-muted mb-1">È ingrediente di</div>
                  <div className="flex flex-col gap-1">{p.ingredienteDi.map((r) => <Ricetta key={r.risultato.id} r={r} />)}</div>
                </div>
              )}
            </section>
          )}

          {!p.delParty && (
          <section className="card">
            <TitoloSezione className="mb-2">Esecuzione (Stanza di Velluto)</TitoloSezione>
            <dl className="dl-scheda m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 testo-13">
              <dt className="text-text-muted">Normale</dt>
              <dd className="m-0"><strong>{p.oggettoCatalogo ? <Link to={p.oggettoCatalogo.casa} className="touch inline-flex items-center">{p.oggettoCatalogo.nome}</Link> : p.oggettoNomeIt ?? p.oggetto}</strong>{p.oggettoNomeIt && p.oggettoNomeIt !== p.oggetto && <span className="text-text-muted"> ({p.oggetto})</span>}{p.oggettoDescrizione && <span className="text-text-secondary"> — {p.oggettoDescrizione}</span>}</dd>
              <dt className="text-text-muted">Con Allarme</dt>
              <dd className="m-0"><strong>{p.oggettoAllarmeCatalogo ? <Link to={p.oggettoAllarmeCatalogo.casa} className="touch inline-flex items-center">{p.oggettoAllarmeCatalogo.nome}</Link> : p.oggettoAllarmeNomeIt ?? p.oggettoAllarme}</strong>{p.oggettoAllarmeNomeIt && p.oggettoAllarmeNomeIt !== p.oggettoAllarme && <span className="text-text-muted"> ({p.oggettoAllarme})</span>}{p.oggettoAllarmeDescrizione && <span className="text-text-secondary"> — {p.oggettoAllarmeDescrizione}</span>}</dd>
              {p.carteDaEsecuzione.length > 0 && (
                <>
                  <dt className="text-text-muted">Carte abilità</dt>
                  <dd className="m-0 flex flex-wrap gap-1">{p.carteDaEsecuzione.map((c) => <Link key={c.id} to={`/skill/${c.id}`} className="chip touch no-underline">{c.nome}</Link>)}</dd>
                </>
              )}
            </dl>
          </section>
          )}
          </div>
          </div>
        </div>
      )}
    </PageState>
  );
}
