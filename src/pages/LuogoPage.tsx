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

import { useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getElementoCatalogo, getLuogo } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import { CollegamentoVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';
import { IconaSpillo } from '../components/mappe/IconaSpillo';
import { MappaIncorporata } from '../components/mappe/MappaIncorporata';
import { ListinoNegozio } from '../components/negozi/ListinoNegozio';
import { ModuloCatalogo } from '../components/guida/ModuloCatalogo';
import { CorreggiElemento } from '../components/guida/AzioniCatalogo';
import { PulsanteGuidaQuiz } from '../components/guida/GuidaQuiz';
import { COLORE_TIPO_LUOGO, NOME_TIPO_LUOGO, ancoraNegozio } from '../utils/citta';
import { NOME_TIPO_NEGOZIO } from '../utils/negozi';
import { definizioneTipoLuogo } from '../../shared/tipiLuogo';
import { descriviOrari } from '../../shared/orariNegozio';
import type { ElementoCatalogoDto, LuogoDettaglioDto } from '../types';

/** Il badge della presenza: «Non ancora nel mondo», «Chiuso adesso», «Aperto adesso»; niente senza partita. */
function BadgePresenza({ l }: { l: LuogoDettaglioDto }) {
  const p = l.presenza;
  if (!p || p.sbloccato === null) return null;
  if (p.sbloccato === false) return <span className="chip chip--attivo text-[12px]" title={p.testo}>Non ancora nel mondo</span>;
  if (p.aperto === false) return <span className="chip chip--bloccata text-[12px]" title={p.testo}>Chiuso adesso</span>;
  return <span className="chip chip--dalla-guida text-[12px]" title={p.testo}>Aperto adesso</span>;
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
  // il modulo del catalogo per un articolo (correzione o aggiunta) di un negozio della sede
  const [modulo, setModulo] = useState<{ negozio: string; elemento: ElementoCatalogoDto | null } | null>(null);
  const [versione, setVersione] = useState(0);
  /** Dopo un salvataggio: chiude il modulo, fa rileggere gli articoli nascosti e la pagina. */
  const salvato = () => { setModulo(null); setVersione((v) => v + 1); void dati.ricarica(); };
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
              <header className="card order-1 flex flex-col gap-1.5 xl:order-none" aria-label={`Il luogo ${l.nome}`}>
                <nav className="flex flex-wrap items-center gap-1 text-[12px] text-text-muted" aria-label="Percorso">
                  <Link to="/guida/citta" className="touch inline-flex items-center">La città</Link><span aria-hidden="true">›</span>
                  {l.quartiere && <><Link to={`/guida/citta/${encodeURIComponent(l.quartiere)}`} className="touch inline-flex items-center">{l.quartiereNome ?? l.quartiere}</Link><span aria-hidden="true">›</span></>}
                  {l.area && <><Link to={l.area.casa} className="touch inline-flex items-center">{l.area.nome}</Link><span aria-hidden="true">›</span></>}
                  <span className="text-text-secondary">{l.nome}</span>
                </nav>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="titolo-display m-0">{l.nome}</h1>
                  <BadgePresenza l={l} />
                  <span className="chip luogo-tipo" style={{ '--luogo-tipo-colore': COLORE_TIPO_LUOGO[l.tipo] ?? COLORE_TIPO_LUOGO.altro } as CSSProperties}><IconaSpillo tipo={definizioneTipoLuogo(l.tipo).icona} dimensione={14} /> {NOME_TIPO_LUOGO[l.tipo] ?? l.tipo}</span>
                  {!l.verificato && <span className="chip text-[11px]" title="Dato da fonte secondaria, non confermato sulla guida italiana">da fonte secondaria</span>}
                </div>
                {/* gli orari del luogo (o la regola dell'app), poi le eccezioni dei negozi della sede */}
                <p className="m-0 text-[13px] text-text-secondary"><strong className="text-text">Orari:</strong> {l.orariTesto ?? 'Orari non indicati'}</p>
                {eccezioni.map((n) => <p key={n.chiave} className="m-0 text-[13px] text-text-secondary">Il negozio {n.nome}: {descriviOrari(n.eccezioneOrari!)}</p>)}
                {l.soloEventiConfidente && <p className="m-0 text-[13px] text-text-secondary">Ci si va solo durante gli eventi di {l.soloEventiConfidente.nome}.</p>}
                {/* R5-20e: lo sblocco generato dalla condizione, mai scritto a mano; i requisiti mancanti della partita */}
                {nonAncora && l.sbloccoTesto && <p className="m-0 text-[13px] text-text-secondary">Si apre {l.sbloccoTesto}.</p>}
                {nonAncora && requisiti.length > 0 && <ul className="m-0 pl-4 text-[12px] text-text-secondary">{requisiti.map((r, i) => <li key={i}>{r.testo}{r.dettaglio ? ` — ${r.dettaglio}` : ''}</li>)}</ul>}
                <div className="flex flex-wrap items-center gap-1.5">
                  <CorreggiElemento tipo="luogo" chiave={l.chiave} titolo="Modifica" onSalvato={() => void dati.ricarica()} />
                  <a href="#dove-si-trova" className="btn btn-ghost btn-sm touch">Dove si trova</a>
                </div>
              </header>
              {/* che cosa offre il luogo: fuori dall'intestazione, che resta entro il 30% dell'altezza della schermata */}
              {l.cosaOffre && <p className="card order-1 m-0 text-[13px] xl:order-none">{l.cosaOffre}</p>}

              {l.listini.length > 0 && (
                <section className="order-3 flex flex-col gap-3 xl:order-none" aria-label="Negozi qui">
                  {l.listini.length > 1 && <h2 className="m-0 font-display text-[17px] uppercase leading-none">Negozi qui · {l.listini.length}</h2>}
                  {l.listini.map((n) => (
                    <section key={n.chiave} id={ancoraNegozio(n.chiave)} className="card flex scroll-mt-20 flex-col gap-2" aria-label={`Negozio ${n.nome}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="m-0 text-[17px]">{n.nome}</h2>
                        <span className="chip">{NOME_TIPO_NEGOZIO[n.tipo] ?? n.tipo}</span>
                        {n.confidente && <Link to={`/confidenti/${n.confidente.chiave}`} className="chip chip--attivo no-underline">{n.confidente.nome}</Link>}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-text-secondary">
                        {n.gestore && <span><strong className="text-text">Gestore:</strong> {n.gestore}</span>}
                        {n.quiz.map((q) => <PulsanteGuidaQuiz key={q.attivita} voce={q} />)}
                        {n.programmaPunti && <span><strong className="text-text">Programma punti:</strong> {n.programmaPunti.nome} ({n.programmaPunti.unita}{n.programmaPunti.calcolo === 'rango-cliente' ? ', dal rango cliente' : ', si segnano a mano'})</span>}
                      </div>
                      {n.note && <p className="m-0 text-[13px] text-text-secondary">{n.note}</p>}
                      <p className="m-0 text-[12px] text-text-muted">{n.articoli} articoli{n.verificati < n.articoli ? ` (${n.articoli - n.verificati} da fonte secondaria)` : ''}{partitaId ? ` · ${n.acquistati} acquistati nella partita «${attiva?.nome}»` : ' · attiva una partita per segnare gli acquisti'}.</p>
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" className="btn btn-secondary btn-sm touch" onClick={() => setModulo({ negozio: n.chiave, elemento: null })}>Aggiungi un articolo</button>
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
                <h2 className="m-0 font-display text-[17px] uppercase leading-none">Dove si trova</h2>
                {l.pin
                  ? <>
                    {/* il pin del luogo si vede sempre: è lo spillo chiesto (anche chiuso o non ancora sbloccato, R5-14) */}
                    {/* senza popup all'arrivo: la pagina dice già quel che il popup direbbe (si apre toccando il pin) */}
                    <MappaIncorporata chiave={l.pin.mappa} spilloIniziale={l.pin.spillo} rivelaSpilloIniziale popupIniziale={false} className="h-[min(50dvh,420px)]" />
                    <div className="flex flex-wrap items-center gap-1.5">
                      <CollegamentoVisivo to={l.pin.casa} tono="secondario" compatto icona={<IconaAzione chiave="mappa" dimensione={20} />} titolo="Apri l’area" dettaglio={l.area?.nome} />
                    </div>
                    {(l.altriPin ?? 0) > 0 && (
                      <div className="flex flex-col gap-1 text-[12px]">
                        <span className="text-text-secondary">Questo luogo ha {l.pins.length} pin:</span>
                        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                          {l.pins.map((p) => <li key={p.spillo}><Link to={p.casa} className="touch inline-flex items-center">{p.mappaNome}{p.notaPin ? ` · ${p.notaPin}` : ''}</Link></li>)}
                        </ul>
                      </div>
                    )}
                  </>
                  : <p className="m-0 text-[13px] text-text-muted">Non ancora posizionato su una planimetria.</p>}
              </section>

              {(l.confidentiDettaglio.length > 0 || l.attivitaDettaglio.length > 0) && (
                <section className="card order-4 flex flex-col gap-2 xl:order-none" aria-label="Chi e cosa si incontra qui">
                  {l.confidentiDettaglio.length > 0 && <>
                    <h2 className="m-0 font-display text-[15px] uppercase leading-none">Confidenti</h2>
                    <div className="flex flex-wrap gap-1.5">{l.confidentiDettaglio.map((c) => <Link key={c.chiave} to={c.casa} className="chip chip--attivo touch no-underline">{c.nome} · {c.arcanaNome}</Link>)}</div>
                  </>}
                  {l.attivitaDettaglio.length > 0 && <>
                    <h2 className="m-0 font-display text-[15px] uppercase leading-none">Attività</h2>
                    <div className="flex flex-wrap gap-1.5">{l.attivitaDettaglio.map((a) => <Link key={a.chiave} to="/guida/attivita" className="chip touch no-underline">{a.nome}</Link>)}</div>
                  </>}
                </section>
              )}

              {l.piatti && l.piatti.length > 0 && (
                <section className="card order-4 flex flex-col gap-2 xl:order-none" aria-label="Piatti">
                  <h2 className="m-0 font-display text-[15px] uppercase leading-none">Piatti</h2>
                  <div className="area-scorrevole-x">
                    <table className="tabella tabella--adattiva text-[12px]">
                      <thead><tr><th>Piatto</th><th>Prezzo</th><th>Effetto</th></tr></thead>
                      <tbody>{l.piatti.map((p) => <tr key={p.nome}><td data-etichetta="Piatto"><strong>{p.nome}</strong></td><td data-etichetta="Prezzo" className="tabular-nums">{p.prezzo !== null ? `${p.prezzo.toLocaleString('it-IT')} ¥` : '—'}</td><td data-etichetta="Effetto">{p.effetto}</td></tr>)}</tbody>
                    </table>
                  </div>
                </section>
              )}

              {l.note && <section className="card order-4 xl:order-none" aria-label="Note"><p className="m-0 text-[12px] text-text-muted">{l.note}</p></section>}
            </div>
          </div>
        );
      })()}
    </PageState>
  );
}
