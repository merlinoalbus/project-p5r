// ============================================================
// LuogoPage — la pagina di un luogo (L5 «Luoghi, negozi, orari», M §4.1: R5-09, R5-14, R5-17, R5-29, R5-30, R5-33)
// ============================================================
//
// Il luogo è la fonte: qui stanno insieme presenza («Aperto adesso», «Chiuso adesso», «Non ancora nel mondo»), orari (quelli della guida o
// la regola dell'app, con le eccezioni dei negozi), sblocco generato dalla condizione, i listini di tutti i negozi della sede (lo stesso
// `ListinoNegozio` della pagina del negozio, un'ancora `#negozio-<chiave>` per negozio), Confidenti, attività, piatti, note e «Dove si
// trova» (la planimetria del pin con lo spillo selezionato: il pin del luogo si vede sempre, anche chiuso, perché è lo spillo chiesto).
// Formati: da 1280 px due colonne (intestazione e negozi | dove si trova, Confidenti, attività); sotto, una colonna con «Dove si trova» subito
// dopo l'intestazione.
// ============================================================

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
// R10-27: la scheda si mostra anche nel pannello sopra il diario; questi hook, fuori dal pannello, sono quelli di react-router-dom
import { useLocation, useParams } from '../components/scheda/routerScheda';
import { getArea, getElementoCatalogo, getLuogo, getQuartiere } from '../services/api';
import { FinestraAggiungiLuogo } from '../components/mappe/FinestraAggiungiLuogo';
import { FinestraColloca } from '../components/mappe/FinestraColloca';
import { InvitiConfidente } from '../components/confidenti/InvitiConfidente';
import { QuandoConfidente } from '../components/confidenti/DisponibilitaStrutturata';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import { CollegamentoVisivo, PulsanteVisivo } from '../components/shared/PulsanteVisivo';
import { IntestazioneScheda } from '../components/shared/IntestazioneScheda';
import { MenuModifica } from '../components/shared/MenuModifica';
import { IconaAzione } from '../components/shared/IconaAzione';
import { IconaSpillo } from '../components/mappe/IconaSpillo';
import { MappaIncorporata } from '../components/mappe/MappaIncorporata';
import { ListinoNegozio } from '../components/negozi/ListinoNegozio';
import { ModuloCatalogo } from '../components/guida/ModuloCatalogo';
import { CorreggiElemento } from '../components/guida/AzioniCatalogo';
import { PulsanteGuidaQuiz } from '../components/guida/GuidaQuiz';
import { TestoRipiegabile } from '../components/shared/TestoRipiegabile';
import { COLORE_TIPO_LUOGO, NOME_TIPO_LUOGO, ancoraNegozio } from '../utils/citta';
import { NOME_TIPO_NEGOZIO } from '../utils/negozi';
import { definizioneTipoLuogo } from '../../shared/tipiLuogo';
import { descriviOrari } from '../../shared/orariNegozio';
import type { ElementoCatalogoDto, LuogoDettaglioDto, PlanimetriaAreaDto } from '../types';
import { TitoloSezione } from '../components/shared/TitoloSezione';

/** Il badge della presenza: «Non ancora nel mondo», «Chiuso adesso», «Aperto adesso»; niente senza partita. */
function BadgePresenza({ l }: { l: LuogoDettaglioDto }) {
  const p = l.presenza;
  if (!p || p.sbloccato === null) return null;
  if (p.sbloccato === false) return <span className="chip chip--attivo testo-12" title={p.testo}>Non ancora nel mondo</span>;
  if (p.aperto === false) return <span className="chip chip--bloccata testo-12" title={p.testo}>Chiuso adesso</span>;
  return <span className="chip chip--dalla-guida testo-12" title={p.testo}>Aperto adesso</span>;
}

/** La pagina del luogo `/guida/luogo/:quartiere/:luogo`, letta per la partita attiva (si rilegge al cambio di giorno, fascia o meteo). */
export function LuogoPage() {
  const { quartiere = '', luogo = '' } = useParams();
  const chiave = `${quartiere}/${luogo}`;
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  // giorno, fascia e meteo decidono se il luogo è aperto: al cambio si rilegge
  const momento = `${attiva?.dataGioco ?? ''}|${attiva?.fasciaGioco ?? ''}|${attiva?.meteoOra ?? ''}`;
  const dati = useCarica(() => getLuogo(chiave, partitaId ?? undefined), [chiave, partitaId, momento]);
  const l = dati.dati;
  useDocumentTitle(l?.nome ?? 'Luogo');
  // L5 (F4): arrivando con un'ancora (`#negozio-<chiave>` dal vecchio indirizzo del negozio, `#dove-si-trova`) la sezione viene in vista
  // appena la pagina c'è, una volta per ancora
  const { hash } = useLocation();
  const ancoraVista = useRef<string | null>(null);
  useEffect(() => {
    if (!l || !hash || ancoraVista.current === hash) return;
    const el = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!el) return;
    ancoraVista.current = hash;
    el.scrollIntoView?.({ block: 'start' });
  }, [l, hash]);
  // il modulo del catalogo per un articolo (correzione o aggiunta) di un negozio della sede
  const [modulo, setModulo] = useState<{ negozio: string; elemento: ElementoCatalogoDto | null } | null>(null);
  const [versione, setVersione] = useState(0);
  /** Dopo un salvataggio: chiude il modulo, fa rileggere gli articoli nascosti e la pagina. */
  const salvato = () => { setModulo(null); setVersione((v) => v + 1); void dati.ricarica(); };
  // L5 (F5): «Posiziona» con le planimetrie dell'area del luogo, «Colloca» con le aree del quartiere (lette al tocco)
  const [posiziona, setPosiziona] = useState<PlanimetriaAreaDto[] | null>(null);
  const [colloca, setColloca] = useState<Array<{ slug: string; nome: string }> | null>(null);
  /** Legge le planimetrie dell'area del luogo e apre «Posiziona». */
  const apriPosiziona = async () => {
    if (!l?.area || !l.quartiere) return;
    try { setPosiziona((await getArea({ tipo: 'quartiere', chiave: l.quartiere }, l.area.slug)).planimetrie); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Planimetrie non disponibili.'); }
  };
  /** Legge le aree del quartiere e apre «Colloca». */
  const apriColloca = async () => {
    if (!l?.quartiere) return;
    try { setColloca((await getQuartiere(l.quartiere)).aree.map((a) => ({ slug: a.slug, nome: a.nome }))); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Aree non disponibili.'); }
  };
  /** Carica dal catalogo l'articolo da correggere e apre il modulo; un errore va in notifica. */
  const apriArticolo = (negozio: string, articolo: string) => {
    void getElementoCatalogo('articolo', articolo).then((e) => setModulo({ negozio, elemento: e })).catch((err: unknown) => notifica('error', err instanceof Error ? err.message : 'Caricamento fallito.'));
  };

  return (
    <PageState isLoading={dati.caricamento && !l} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {l && (() => {
        const nonAncora = l.presenza?.sbloccato === false;
        const requisiti = l.disponibilita?.requisiti.filter((r) => r.stato === 'rosso') ?? [];
        const eccezioni = l.listini.filter((n) => n.eccezioneOrari);
        return (
          <div className="flex flex-col gap-3 xl:grid xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:items-start">
            {/* la colonna di sinistra da 1280 px; sotto, i suoi blocchi si mescolano a quelli di destra con `order` */}
            <div className="contents xl:flex xl:flex-col xl:gap-3">
              <IntestazioneScheda className="order-1 xl:order-none" aria-label={`Il luogo ${l.nome}`} titolo={l.nome}
                ripiego={l.quartiere ? `/guida/citta/${encodeURIComponent(l.quartiere)}` : '/guida/citta'}
                percorso={<nav className="flex flex-wrap items-center gap-1 testo-12 text-text-muted" aria-label="Percorso">
                  <Link to="/guida/citta" className="touch inline-flex items-center">La città</Link><span aria-hidden="true">›</span>
                  {l.quartiere && <><Link to={`/guida/citta/${encodeURIComponent(l.quartiere)}`} className="touch inline-flex items-center">{l.quartiereNome ?? l.quartiere}</Link><span aria-hidden="true">›</span></>}
                  {l.area && <><Link to={l.area.casa} className="touch inline-flex items-center">{l.area.nome}</Link><span aria-hidden="true" className="max-sm:hidden">›</span></>}
                  {/* sul telefono l'ultima tappa la dice il titolo, subito sotto: la barra sta in una riga */}
                  <span className="text-text-secondary max-sm:hidden">{l.nome}</span>
                </nav>}
                chip={<>
                  <BadgePresenza l={l} />
                  <span className="chip luogo-tipo" style={{ '--luogo-tipo-colore': COLORE_TIPO_LUOGO[l.tipo] ?? COLORE_TIPO_LUOGO.altro } as CSSProperties}><IconaSpillo tipo={definizioneTipoLuogo(l.tipo).icona} dimensione={14} /> {NOME_TIPO_LUOGO[l.tipo] ?? l.tipo}</span>
                  {!l.verificato && <span className="chip testo-12" title="Dato da fonte secondaria, non confermato sulla guida italiana">da fonte secondaria</span>}
                </>}
                azioni={<>
                  {/* il pulsante porta a «Dove si trova» da 640 a 1279 px; sul telefono la sezione viene subito dopo l'intestazione, e da
                      1280 px sta in cima alla colonna di destra: lì il pulsante non c'è */}
                  <PulsanteVisivo tono="fantasma" compatto className="max-sm:hidden xl:hidden" icona={<IconaAzione chiave="posizione" dimensione={20} />} titolo="Dove si trova"
                    onClick={() => document.getElementById('dove-si-trova')?.scrollIntoView({ block: 'start' })} />
                  <MenuModifica cosa={`il luogo «${l.nome}»`}>
                    <CorreggiElemento tipo="luogo" chiave={l.chiave} titolo="Correggi il luogo" onSalvato={() => void dati.ricarica()} />
                  </MenuModifica>
                </>}>
                {/* gli orari del luogo (o la regola dell'app), poi le eccezioni dei negozi della sede */}
                <p className="m-0 testo-13 text-text-secondary"><strong className="text-text">Orari:</strong> {l.orariTesto ?? 'Orari non indicati'}</p>
                {eccezioni.map((n) => <p key={n.chiave} className="m-0 testo-13 text-text-secondary">Il negozio {n.nome}: {descriviOrari(n.eccezioneOrari!)}</p>)}
                {l.soloEventiConfidente && <p className="m-0 testo-13 text-text-secondary">Ci si va solo durante gli eventi di {l.soloEventiConfidente.nome}.</p>}
                {/* R5-20e: lo sblocco generato dalla condizione, mai scritto a mano; i requisiti mancanti della partita */}
                {nonAncora && l.sbloccoTesto && <p className="m-0 testo-13 text-text-secondary">Si apre {l.sbloccoTesto}.</p>}
              </IntestazioneScheda>
              {/* i requisiti mancanti della partita fuori dall'intestazione, che resta entro il 30% della schermata: possono essere lunghi */}
              {nonAncora && requisiti.length > 0 && <ul className="card order-1 m-0 pl-8 testo-12 text-text-secondary xl:order-none" aria-label="Requisiti mancanti">{requisiti.map((r, i) => <li key={i}>{r.testo}{r.dettaglio ? ` — ${r.dettaglio}` : ''}</li>)}</ul>}
              {/* che cosa offre il luogo: fuori dall'intestazione, che resta entro il 30% dell'altezza della schermata */}
              {l.cosaOffre && <p className="card order-1 m-0 testo-13 xl:order-none">{l.cosaOffre}</p>}
              <div className="order-2 xl:order-none"><InvitiConfidente filtro={{ apreTipo: 'luogo', apreChiave: l.chiave }} onCambiato={dati.ricarica} /></div>

              {l.listini.length > 0 && (
                <section className="order-3 flex flex-col gap-3 xl:order-none" aria-label="Negozi qui">
                  {l.listini.length > 1 && <TitoloSezione variante="display">Negozi qui · {l.listini.length}</TitoloSezione>}
                  {l.listini.map((n) => (
                    <section key={n.chiave} id={ancoraNegozio(n.chiave)} className="card flex scroll-mt-20 flex-col gap-2" aria-label={`Negozio ${n.nome}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <TitoloSezione variante="display">{n.nome}</TitoloSezione>
                        <span className="chip">{NOME_TIPO_NEGOZIO[n.tipo] ?? n.tipo}</span>
                        {n.confidente && <Link to={`/confidenti/${n.confidente.chiave}`} className="chip chip--attivo no-underline">{n.confidente.nome}</Link>}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 testo-13 text-text-secondary">
                        {n.gestore && <span><strong className="text-text">Gestore:</strong> {n.gestore}</span>}
                        {n.quiz.map((q) => <PulsanteGuidaQuiz key={q.attivita} voce={q} />)}
                        {n.programmaPunti && <span><strong className="text-text">Programma punti:</strong> {n.programmaPunti.nome} ({n.programmaPunti.unita}{n.programmaPunti.calcolo === 'rango-cliente' ? ', dal rango cliente' : ', si segnano a mano'})</span>}
                      </div>
                      {n.note && <TestoRipiegabile key={n.chiave} testo={n.note} massimo={140} className="min-w-0 whitespace-pre-line break-words testo-13 text-text-secondary" />}
                      <p className="m-0 testo-12 text-text-muted">{n.articoli} articoli{n.verificati < n.articoli ? ` (${n.articoli - n.verificati} da fonte secondaria)` : ''}{partitaId ? ` · ${n.acquistati} acquistati nella partita «${attiva?.nome}»` : ' · attiva una partita per segnare gli acquisti'}.</p>
                      <div className="flex flex-wrap gap-1.5">
                        <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="carica-altri" dimensione={20} />} titolo="Aggiungi un articolo" onClick={() => setModulo({ negozio: n.chiave, elemento: null })} />
                        <CorreggiElemento tipo="negozio" chiave={n.chiave} titolo="Correggi il negozio" onSalvato={() => void dati.ricarica()} />
                      </div>
                      {modulo?.negozio === n.chiave && <ModuloCatalogo tipo="articolo" elemento={modulo.elemento} negozioChiave={n.chiave} onChiudi={() => setModulo(null)} onSalvato={salvato} />}
                      <ListinoNegozio negozio={n} partitaId={partitaId} versione={versione} onModifica={(a) => apriArticolo(n.chiave, a)} onRipristinato={() => void dati.ricarica()}
                        onCambiato={(a) => dati.imposta((attuale) => ({ ...attuale, listini: attuale.listini.map((x) => (x.chiave !== n.chiave ? x : { ...x, articoliElenco: x.articoliElenco.map((y) => (y.chiave === a.chiave ? a : y)), acquistati: x.articoliElenco.filter((y) => (y.chiave === a.chiave ? a.acquistato : y.acquistato)).length })) }))} />
                    </section>
                  ))}
                </section>
              )}
            </div>

            {/* la colonna di destra da 1280 px: dove si trova, Confidenti, attività, piatti, note */}
            <div className="contents xl:flex xl:flex-col xl:gap-3">
              <section id="dove-si-trova" className="card order-2 flex scroll-mt-20 flex-col gap-2 xl:order-none" aria-label="Dove si trova">
                <TitoloSezione variante="display">Dove si trova</TitoloSezione>
                {l.pin
                  ? <>
                    {/* il pin del luogo si vede sempre: è lo spillo chiesto (anche chiuso o non ancora sbloccato, R5-14) */}
                    {/* senza popup all'arrivo: la pagina dice già quel che il popup direbbe (si apre toccando il pin) */}
                    <MappaIncorporata chiave={l.pin.mappa} spilloIniziale={l.pin.spillo} rivelaSpilloIniziale popupIniziale={false} className="h-[min(50dvh,420px)]" />
                    <div className="flex flex-wrap items-center gap-1.5">
                      <CollegamentoVisivo to={l.pin.casa} tono="secondario" compatto icona={<IconaAzione chiave="mappa" dimensione={20} />} titolo="Apri l’area" dettaglio={l.area?.nome} />
                    </div>
                    {(l.altriPin ?? 0) > 0 && (
                      <div className="flex flex-col gap-1 testo-12">
                        <span className="text-text-secondary">Questo luogo ha {l.pins.length} pin:</span>
                        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                          {l.pins.map((p) => <li key={p.spillo}><Link to={p.casa} className="touch inline-flex items-center">{p.mappaNome}{p.notaPin ? ` · ${p.notaPin}` : ''}</Link></li>)}
                        </ul>
                      </div>
                    )}
                  </>
                  : <div className="flex flex-col items-start gap-2">
                    <p className="m-0 testo-13 text-text-muted">{l.area ? `Non ancora posizionato su una planimetria di ${l.area.nome}.` : 'Non ancora posizionato: prima va collocato in un’area del quartiere.'}</p>
                    {/* L5 (F5): «Posiziona» (il tocco sul punto di una planimetria dell'area) o, senza area, «Colloca» */}
                    {l.area
                      ? <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="posizione" dimensione={20} />} titolo="Posiziona" onClick={() => void apriPosiziona()} />
                      : <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="pianta" dimensione={20} />} titolo="Colloca" onClick={() => void apriColloca()} />}
                  </div>}
              </section>

              {(l.confidentiDettaglio.length > 0 || l.attivitaDettaglio.length > 0) && (
                <section className="card order-4 flex flex-col gap-2 xl:order-none" aria-label="Chi e cosa si incontra qui">
                  {l.confidentiDettaglio.length > 0 && <>
                    <TitoloSezione variante="display">Confidenti</TitoloSezione>
                    <ul className="m-0 flex list-none flex-col gap-2 p-0">{l.confidentiDettaglio.map((c) => (
                      <li key={c.chiave} className="flex min-w-0 flex-col gap-0.5">
                        <Link to={c.casa} className="chip chip--attivo touch self-start no-underline">{c.nome} · {c.arcanaNome}</Link>
                        <QuandoConfidente chiave={c.chiave} partita={partitaId ?? undefined} />
                      </li>
                    ))}</ul>
                  </>}
                  {l.attivitaDettaglio.length > 0 && <>
                    <TitoloSezione variante="display">Attività</TitoloSezione>
                    <div className="flex flex-wrap gap-1.5">{l.attivitaDettaglio.map((a) => <Link key={a.chiave} to="/guida/attivita" className="chip touch no-underline">{a.nome}</Link>)}</div>
                  </>}
                </section>
              )}

              {l.piatti && l.piatti.length > 0 && (
                <section className="card order-4 flex flex-col gap-2 xl:order-none" aria-label="Piatti">
                  <TitoloSezione variante="display">Piatti</TitoloSezione>
                  <div className="area-scorrevole-x">
                    <table className="tabella tabella--adattiva testo-12">
                      <thead><tr><th>Piatto</th><th>Prezzo</th><th>Effetto</th></tr></thead>
                      <tbody>{l.piatti.map((p) => <tr key={p.nome}><td data-etichetta="Piatto"><strong>{p.nome}</strong></td><td data-etichetta="Prezzo" className="tabular-nums">{p.prezzo !== null ? `${p.prezzo.toLocaleString('it-IT')} ¥` : '—'}</td><td data-etichetta="Effetto">{p.effetto}</td></tr>)}</tbody>
                    </table>
                  </div>
                </section>
              )}

              {l.note && <section className="card order-4 xl:order-none" aria-label="Note"><p className="m-0 testo-12 text-text-muted">{l.note}</p></section>}
            </div>
            {posiziona && l.quartiere && <FinestraAggiungiLuogo quartiere={l.quartiere} luogo={{ chiave: l.chiave, nome: l.nome }} planimetrie={posiziona} onChiudi={() => setPosiziona(null)} onFatto={() => void dati.ricarica()} />}
            {colloca && <FinestraColloca luogo={{ chiave: l.chiave, nome: l.nome }} aree={colloca} onChiudi={() => setColloca(null)} onFatto={() => void dati.ricarica()} />}
          </div>
        );
      })()}
    </PageState>
  );
}
