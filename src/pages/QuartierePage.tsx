// ============================================================
// QuartierePage — un quartiere: la sua illustrazione, le sue Aree e i suoi luoghi (L2, 2026-10-20)
// ============================================================
//
// Cosa offre ogni luogo, quando è aperto, come si sblocca, quali Confidenti ci si incontrano, che
// piatti si mangiano. Il posizionamento degli spilli e le immagini di base si gestiscono
// nell'editor («Modifica planimetria» nel visore).
//
// L'intestazione porta l'illustrazione del quartiere con sopra la **stessa sagoma** che il lettore ha appena toccato sulla mappa di
// Tokyo (L1), e le azioni del quartiere: «Entra: <area d'ingresso>», «Ingresso», «Aggiungi area». Da 1280 px in su l'illustrazione
// del quartiere con i suoi pin (i passaggi verso le aree) sta a sinistra, le Aree e i luoghi a destra.
//
// L2: questa è **l'unica pagina che apre un quartiere** (R2-15). Arrivando dalla metro (`?ingresso=1`) l'area d'ingresso si apre
// in una finestra, sul punto e con lo zoom dell'ingresso — è lì che si vuole atterrare toccando il quartiere sulla mappa di
// Tokyo —; chiudendola il parametro si toglie (l'indietro non la riapre). Dalle schede de La città, dall'indice e dalle briciole
// si arriva senza: la pagina adattata e centrata. Prima al posto dell'illustrazione si incorporava la planimetria d'ingresso, e
// l'ingresso si configurava in un pannello in fondo alla colonna.
// ============================================================

import { IngressoQuartiere } from '../components/mappe/IngressoQuartiere';
import { AreeDelQuartiere } from '../components/mappe/AreeDelQuartiere';
import { FinestraAggiungiArea } from '../components/mappe/FinestraAggiungiArea';
import { FinestraColloca } from '../components/mappe/FinestraColloca';
import { Modal } from '../components/shared/Modal';
import { urlCasa } from '../utils/navigazioneMappa';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { aggiornaSbloccoQuartiere, getQuartiere, isApiError, ripristinaSbloccoQuartiere, scaricaPiantaQuartiere } from '../services/api';
import { MappaIncorporata } from '../components/mappe/MappaIncorporata';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PageState } from '../components/shared/PageState';
import { IconChevronLeft } from '../components/shared/icons';
import { COLORE_TIPO_LUOGO, NOME_TIPO_LUOGO, ancoraLuogo, urlLuogo } from '../utils/citta';
import { definizioneTipoLuogo, ordinaTipiLuogo } from '../../shared/tipiLuogo';
import { IconaSpillo } from '../components/mappe/IconaSpillo';
import type { LuogoDto } from '../types';
import { PulsanteVisivo, CollegamentoVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';
import { useSuggerimenti } from '../stores/suggerimentiStore';
import { classiSuggerito } from '../utils/suggerimenti';
import { TargaSuggerito } from '../components/shared/Suggerito';
import { SagomaQuartiere } from '../components/mappe/SagomaQuartiere';
import { IllustrazioneConSegno } from '../components/mappe/IllustrazioneConSegno';
import { usePartitaStore } from '../stores/partitaStore';
import { CondizioniEditor } from '../components/guida/CondizioniEditor';
import type { RequisitoSpillo } from '../../shared/condizioniSpillo';
import type { SbloccoDto } from '../../shared/types';

function condizioniDiSblocco(sblocco: SbloccoDto | undefined): RequisitoSpillo[] {
  if (!sblocco?.condizioneSalvata) return [];
  return sblocco.condizioneSalvata.tipo === 'gruppo' && sblocco.condizioneSalvata.modo === 'tutte'
    ? sblocco.condizioneSalvata.condizioni
    : [sblocco.condizioneSalvata];
}

function EditorSbloccoQuartiere({ chiave, nome, sblocco, onChiudi, onSalvato }: { chiave: string; nome: string; sblocco?: SbloccoDto; onChiudi: () => void; onSalvato: () => void }) {
  const [condizioni, setCondizioni] = useState(() => condizioniDiSblocco(sblocco));
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const salva = async () => {
    setSalvando(true); setErrore(null);
    try { await aggiornaSbloccoQuartiere(chiave, condizioni); onSalvato(); onChiudi(); }
    catch (e) { setErrore(e instanceof Error ? e.message : 'Salvataggio non riuscito.'); }
    finally { setSalvando(false); }
  };
  const ripristina = async () => {
    setSalvando(true); setErrore(null);
    try { await ripristinaSbloccoQuartiere(chiave); onSalvato(); onChiudi(); }
    catch (e) { setErrore(e instanceof Error ? e.message : 'Ripristino non riuscito.'); }
    finally { setSalvando(false); }
  };
  return <Modal titolo={`Sblocco di ${nome}`} aperta onChiudi={onChiudi} larga
    azioni={<><button type="button" className="btn btn-secondary touch" onClick={onChiudi} disabled={salvando}>Annulla</button><button type="button" className="btn btn-primary touch" onClick={() => void salva()} disabled={salvando}>{salvando ? 'Salvataggio…' : 'Salva sblocco'}</button></>}>
    <div className="flex flex-col gap-3">
      <p className="m-0 text-[13px] text-text-secondary">Gli inviti dei Confidenti restano separati e continuano ad aprire {nome} quando spettano.</p>
      <CondizioniEditor condizioni={condizioni} onCambia={setCondizioni} disabilitato={salvando} />
      {sblocco?.modificato && <button type="button" className="btn btn-ghost btn-sm touch self-start" onClick={() => void ripristina()} disabled={salvando}>Ripristina la condizione della guida</button>}
      {errore && <p className="m-0 text-[13px]" role="alert">{errore}</p>}
    </div>
  </Modal>;
}
import { AggiungiAlCatalogo, CorreggiElemento } from '../components/guida/AzioniCatalogo';

/**
 * La carta di un luogo del quartiere, con l'ancora `#luogo-…` per arrivarci da fuori: nome, tipo
 * col suo colore e la sua icona, suggerimento, «non ancora nel mondo» (attenuata, con i requisiti
 * mancanti nel titolo) o «sbloccato», fascia, dato non verificato; poi che cosa offre, giorni,
 * sblocco, correzione, Confidenti e attività collegati, tabella dei piatti, rimando agli articoli
 * in vendita e note.
 */
function Luogo({ l, onSalvato }: { l: LuogoDto; onSalvato: () => void }) {
  const sugg = useSuggerimenti();
  // **Il posto che non c'è ancora resta in elenco, e lo dice.** La guida serve anche a sapere che
  // cosa arriverà: toglierlo è quel che fa la mappa — un pin dove non c'è niente manda a cercare
  // a vuoto — ma qui si sta leggendo, non camminando.
  const nonAncora = l.disponibilita != null && l.disponibilita.stato !== 'disponibile';
  const perche = l.disponibilita?.requisiti.filter((r) => r.stato === 'rosso').map((r) => r.dettaglio || r.testo).join(' · ');
  return (
    <li id={ancoraLuogo(l.chiave)} className={`card flex flex-col gap-1 text-[13px] scroll-mt-20 ${nonAncora ? 'opacity-60' : ''} ${classiSuggerito(sugg.evidenziato('luoghi', l.chiave))}`}>
      <div className="flex flex-wrap items-center gap-2">
        {/* L5 (F4): il nome porta alla pagina del luogo, la fonte unica */}
        {l.casa ? <Link to={l.casa} className="touch inline-flex items-center text-[15px] font-bold text-text">{l.nome}</Link> : <strong className="text-[15px]">{l.nome}</strong>}
        {l.presenza && l.presenza.sbloccato !== false && l.presenza.aperto !== null && <span className={`chip text-[11px] ${l.presenza.aperto ? 'chip--dalla-guida' : 'chip--bloccata'}`} title={l.presenza.testo}>{l.presenza.aperto ? 'Aperto adesso' : 'Chiuso adesso'}</span>}
        {l.negozi.length > 1 && <span className="text-[12px] text-text-muted">· {l.negozi.length} negozi</span>}
        <span className="chip luogo-tipo" style={{ '--luogo-tipo-colore': COLORE_TIPO_LUOGO[l.tipo] ?? COLORE_TIPO_LUOGO.altro } as React.CSSProperties}><IconaSpillo tipo={definizioneTipoLuogo(l.tipo).icona} dimensione={14} /> {NOME_TIPO_LUOGO[l.tipo] ?? l.tipo}</span>
        {sugg.evidenziato('luoghi', l.chiave) && <TargaSuggerito motivo={sugg.motivo('luoghi', l.chiave)} compatta />}
        {nonAncora && <span className="chip chip--attivo text-[11px]" title={perche || undefined}>Non ancora nel mondo</span>}
        {!nonAncora && l.condizioni && l.disponibilita && <span className="chip text-[11px]" title="La condizione scritta dalla guida risulta soddisfatta in questa partita">sbloccato</span>}
        {l.quando && <span className="chip">{l.quando === 'entrambe' ? 'giorno e sera' : l.quando}</span>}
        {!l.verificato && <span className="chip text-[11px]" title="Dato da fonte secondaria, non confermato sulla guida italiana">da fonte secondaria</span>}
      </div>
      <p className="m-0">{l.cosaOffre}</p>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-text-secondary">
        {l.giorniTesto && <span><strong className="text-text">Giorni:</strong> {l.giorniTesto}</span>}
        {l.sblocco && <span><strong className="text-text">Sblocco:</strong> {l.sblocco}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-1.5"><CorreggiElemento tipo="luogo" chiave={l.chiave} onSalvato={onSalvato} /></div>
      {(l.confidenti.length > 0 || l.attivita.length > 0) && (
        <div className="flex flex-wrap gap-1.5 items-center">
          {l.confidenti.map((c) => <Link key={c.chiave} to={`/confidenti/${c.chiave}`} className="chip chip--attivo no-underline">{c.nome}</Link>)}
          {l.attivita.map((a) => <Link key={a.chiave} to="/guida/attivita" className="chip no-underline">{a.nome}</Link>)}
        </div>
      )}
      {l.piatti && l.piatti.length > 0 && (
        <div className="area-scorrevole-x">
          <table className="tabella tabella--adattiva text-[12px]">
            <thead><tr><th>Piatto</th><th>Prezzo</th><th>Effetto</th></tr></thead>
            <tbody>{l.piatti.map((p) => <tr key={p.nome}><td data-etichetta="Piatto"><strong>{p.nome}</strong></td><td data-etichetta="Prezzo" className="tabular-nums">{p.prezzo !== null ? `${p.prezzo.toLocaleString('it-IT')} ¥` : '—'}</td><td data-etichetta="Effetto">{p.effetto}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {l.negozio && <CollegamentoVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="negozio" dimensione={20} />} titolo="Articoli in vendita" to={l.casa ? urlLuogo(l.chiave, l.negozio) : `/guida/negozi/${l.negozio}`} />}
      {l.note && <p className="m-0 text-[12px] text-text-muted">{l.note}</p>}
    </li>
  );
}

/**
 * Pagina di un quartiere presa dalla chiave nell'URL: carica il quartiere per la partita attiva e,
 * se la pianta pubblicata della sua illustrazione non è ancora nell'istanza, la scarica.
 * Mostra l'intestazione con l'illustrazione e le azioni, l'illustrazione del quartiere nel visore
 * (con lo spillo dell'indirizzo selezionato), le Aree e i luoghi filtrabili per tipo nell'ordine
 * del catalogo; con `?ingresso=1` la finestra dell'area d'ingresso. Se l'URL porta un'ancora, dopo
 * il caricamento scorre al luogo indicato.
 */
export function QuartierePage() {
  const { chiave = '' } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const attiva = usePartitaStore((s) => s.attiva);
  // La partita serve ai luoghi: senza, non si puo' dire quali a quel punto non ci sono ancora.
  const dati = useCarica(() => getQuartiere(chiave, attiva?.id), [chiave, attiva?.id]);
  const q = dati.dati;
  useDocumentTitle(q?.nome ?? 'Quartiere');
  const [finestra, setFinestra] = useState<'ingresso' | 'aggiungi' | 'sblocco' | null>(null);
  // L5 (F5): «Colloca» di un luogo senza area, con l'area proposta dalla migrazione
  const [colloca, setColloca] = useState<{ luogo: { chiave: string; nome: string }; proposta: string | null } | null>(null);
  // La finestra dell'area d'ingresso: aperta arrivando dalla metro (`?ingresso=1`, se c'è un ingresso) o con «Entra»
  const [entraAperta, setEntraAperta] = useState(false);
  // con uno spillo nell'indirizzo vince lo spillo: la finestra d'ingresso non si apre (condizione di Stesura sulla variante 1)
  const dallaMetro = params.get('ingresso') === '1' && !!q?.ingresso && !params.get('spillo');
  const chiudiEntra = () => {
    setEntraAperta(false);
    if (params.has('ingresso')) { const p = new URLSearchParams(params); p.delete('ingresso'); setParams(p, { replace: true }); }
  };
  // Lo spillo dell'indirizzo (un «Sulla mappa» che porta all'illustrazione del quartiere) si seleziona nel visore, come prima nel
  // visore dell'atlante
  const spillo = Number(params.get('spillo')) || null;
  /** Il pin di passaggio appena creato (con «Aggiungi area» o «Segna sull'illustrazione»): si mostra selezionato, anche se il quartiere
   *  nel mondo non c'è ancora e i suoi pin sarebbero nascosti (UX2-9 d). È un comando di chi guarda, come «Luoghi qui» dell'Area. */
  const [pinChiesto, setPinChiesto] = useState<number | null>(null);
  // la mappa incorporata rilegge i suoi dati solo quando cambia `versione`: senza questo contatore il pin nuovo non c'era nemmeno
  const [revisione, setRevisione] = useState(0);
  const mostraPin = (id: number) => { setPinChiesto(id); setRevisione((r) => r + 1); const p = new URLSearchParams(params); p.delete('ingresso'); p.set('spillo', String(id)); setParams(p, { replace: true }); };
  const [tipo, setTipo] = useState<string>('');
  // Mappa pubblicata ma non ancora nell'istanza: scaricata appena il quartiere è aperto, poi il visore la usa come immagine di base
  // Se la mappa ha dei pezzi ritagliati dall'immagine che mostra (L1, F5: 409 `mappa-con-pezzi`), lo scarico automatico non la
  // sostituisce e non è un errore: la mappa ha già un'immagine con il lavoro dell'utente sopra. Sostituirla resta una scelta
  // esplicita, dall'editor, con la conferma.
  // Scaricata la pianta, il quartiere si rilegge (L1, rilievo G6 del validatore): il visore prende l'immagine nuova dalla sua
  // `versione`, e senza rileggere l'intestazione restava sull'illustrazione di prima — due immagini diverse dello stesso quartiere
  // fino a una ricarica. Rilettura silenziosa (la pagina resta a schermo); col quartiere che ora ha la sua immagine non si riscarica.
  // L2: l'illustrazione si mostra sempre (prima, con un ingresso, al suo posto c'era la planimetria d'ingresso e lo scarico si saltava)
  const download = useCarica(() => (q && !q.mappa && q.pianta
    ? scaricaPiantaQuartiere(q.chiave)
      .then((esito) => { void dati.ricarica(); return esito; })
      .catch((err: unknown) => {
        if (isApiError(err, 'mappa-con-pezzi')) return null;
        // Un rifiuto (4xx: la fonte rifiuta lo scarico, 400 fonte-rifiuta — Fandom risponde 403 anche a un client onesto, LAY-2 —, o
        // un indirizzo che non serve l'immagine) non passa riprovando: in questa visita non si ritenta e non c'è «Riprova»; si dice
        // perché, con la pagina della fonte e l'invito a caricarla dall'editor. Rete e 5xx restano errori, con «Riprova».
        if (isApiError(err) && err.status >= 400 && err.status < 500) return { rifiutata: err.message };
        throw err;
      })
    : Promise.resolve(null)), [q?.chiave, q?.mappa, q?.pianta?.url]);
  const scaricata = !!q && !!download.dati && 'quartiere' in download.dati && download.dati.quartiere === q.chiave;
  const rifiuto = download.dati && 'rifiutata' in download.dati ? download.dati.rifiutata : null;
  // l'errore da mostrare: il rifiuto della fonte (senza «Riprova») o un errore qualunque dello scarico (con «Riprova»)
  const erroreScarico = rifiuto ?? download.errore;
  // I tipi presenti, nell'ordine del catalogo (shared/tipiLuogo), non in quello in cui capitano.
  const tipi = useMemo(() => ordinaTipiLuogo((q?.luoghi ?? []).map((l) => l.tipo)), [q]);
  const visibili = useMemo(() => (q?.luoghi ?? []).filter((l) => !tipo || l.tipo === tipo), [q, tipo]);
  // Dalla scheda di un negozio si arriva con `#luogo-…`: il luogo c'è solo dopo il caricamento, quindi si scorre qui.
  const { hash } = useLocation();
  useEffect(() => {
    if (!q || !hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [q, hash]);
  return (
    <PageState isLoading={dati.caricamento && !q} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {q && (
        <div className="flex flex-col gap-4">
          <button type="button" className="btn btn-ghost btn-sm self-start touch -ml-2" onClick={() => navigate('/guida/citta')}><IconChevronLeft size={16} /> La città</button>

          <header className="card flex flex-col gap-3 sm:flex-row sm:items-start">
            {/* L'illustrazione della mappa del quartiere (regola unica di L1), con sopra la sagoma della mappa di Tokyo, la
                stessa che si è appena toccata: dice «sei nel posto che hai scelto» prima che si legga il titolo (scelta
                dell'utente, 2026-10-20). Sul telefono sta in cima, larga quanto la carta; da 640 px a fianco del titolo. Senza
                illustrazione resta la sola sagoma, com'era. Sul telefono la carta toglie ~64 px (margini e imbottitura) alla
                larghezza della finestra: `sizes` lo dice, perché a densità 2 si scarichi la miniatura da 640 e non quella da 1024. */}
            <IllustrazioneConSegno illustrazione={q.illustrazione} alt={`Illustrazione di ${q.nome}`}
              className="w-full max-w-[420px] self-center sm:w-[220px] sm:self-start lg:w-[200px]"
              sizes="(min-width: 1024px) 200px, (min-width: 640px) 220px, min(420px, calc(100vw - 64px))"
              segno={<SagomaQuartiere chiave={q.chiave} nome={q.nome} larghezza={72} altezza={54} />}
              senza={<SagomaQuartiere chiave={q.chiave} nome={q.nome} larghezza={132} altezza={100} className="self-center sm:self-start" />} />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <h1 className="titolo-display m-0 break-words">{q.nome}</h1>
                <span className="text-[12px] text-text-muted">{q.aree.length === 0 ? 'nessuna area' : q.aree.length === 1 ? 'un’area' : `${q.aree.length} aree`} · {q.luoghi.length} {q.luoghi.length === 1 ? 'luogo' : 'luoghi'}</span>
              </div>
              {q.sblocco && <p className="m-0 text-[13px]"><strong className="text-text-secondary">Si apre:</strong> {q.sblocco}</p>}
              {q.sbloccoCondizione && <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-text-muted"><span>{q.sbloccoCondizione.modificato ? 'Sblocco modificato' : 'Sblocco strutturato'}</span><button type="button" className="btn btn-ghost btn-sm touch" onClick={() => setFinestra('sblocco')}>Modifica sblocco</button>{q.sbloccoCondizione.modificato && <button type="button" className="btn btn-ghost btn-sm touch" onClick={() => setFinestra('sblocco')}>Ripristina</button>}</div>}
              {q.descrizione && <p className="m-0 text-[13px] text-text-secondary">{q.descrizione}</p>}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {q.ingresso && <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="mappa" dimensione={20} />} titolo={`Entra: ${q.ingresso.area?.nome ?? q.ingresso.nome}`} onClick={() => setEntraAperta(true)} />}
                <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="seleziona" dimensione={20} />} titolo="Ingresso" dettaglio={q.ingresso ? undefined : 'da scegliere'} onClick={() => setFinestra('ingresso')} />
                <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="carica" dimensione={20} />} titolo="Aggiungi area" onClick={() => setFinestra('aggiungi')} />
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {/* L'illustrazione del quartiere, con i suoi pin: i passaggi verso le aree e l'uscita verso Tokyo. Si apre adattata e
                centrata (o sullo spillo dell'indirizzo); l'ingresso serve a chi arriva dalla metro, e ha la sua finestra. */}
            <section className="flex flex-col gap-1.5 xl:sticky xl:top-2" aria-label={`Illustrazione di ${q.nome}`}>
              {q.mappaChiave && <MappaIncorporata chiave={q.mappaChiave} nome={q.nome} spilloIniziale={spillo} rivelaSpilloIniziale={spillo !== null && spillo === pinChiesto} versione={`${scaricata && download.dati && 'byte' in download.dati ? download.dati.byte : 0}-${revisione}`} classeVisore="visore-alto-quanto-immagine h-[min(56vh,460px)] md:h-[max(420px,min(64vh,740px))]" />}
              <div className="flex flex-wrap items-center gap-2 text-[12px] text-text-muted">
                {q.pianta ? (
                  // Se lo scarico non riesce lo si dice (prima restava «scaricata nella tua istanza» con un «Riprova» muto accanto)
                  erroreScarico
                    ? <span role="alert">Scaricamento non riuscito: {erroreScarico} L’illustrazione si vede sulla <a href={q.pianta.pagina ?? q.pianta.url} target="_blank" rel="noreferrer" className="credito">pagina della fonte</a> ({q.pianta.fonte}){rifiuto ? '.' : '; puoi riprovare o caricarne una tua dall’editor.'}</span>
                    : <span>Illustrazione da <a href={q.pianta.pagina ?? q.pianta.url} target="_blank" rel="noreferrer" className="credito">{q.pianta.fonte}</a>, scaricata nella tua istanza al primo uso{download.caricamento && !scaricata ? ' (scaricamento in corso…)' : ''}. Pin e immagine si modificano dall’editor.</span>
                ) : (
                  <span>Nessuna illustrazione pubblicata per {q.nome}{q.piantaAssente ? `: ${q.piantaAssente}` : ''}: carica una tua immagine dall’editor (resta nella tua istanza).</span>
                )}
                {download.errore && !rifiuto && q.pianta && <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="riprova" dimensione={20} />} titolo="Riprova" onClick={() => void download.ricarica()} />}
                {erroreScarico && q.pianta && q.mappaChiave && <CollegamentoVisivo tono="fantasma" compatto icona={<IconaAzione chiave="carica" dimensione={20} />} titolo="Carica dall’editor"
                  to={`/guida/mappe/${encodeURIComponent(q.mappaChiave)}/modifica?sezione=mappa`} />}
              </div>
            </section>

            <div className="flex flex-col gap-4">
            <AreeDelQuartiere quartiere={q} onCambiato={() => dati.ricarica()} onAggiungi={() => setFinestra('aggiungi')} onPinSegnato={mostraPin} />
            <section className="flex flex-col gap-2" aria-label="Luoghi del quartiere">
              <div className="flex flex-wrap items-center gap-1.5"><AggiungiAlCatalogo tipo="luogo" titolo="Aggiungi un luogo" onSalvato={() => void dati.ricarica()} /></div>
              {tipi.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" className={`chip touch ${tipo === '' ? 'chip--attivo' : ''}`} onClick={() => setTipo('')} aria-pressed={tipo === ''}>Tutti ({q.luoghi.length})</button>
                  {tipi.map((t) => <button key={t} type="button" className={`chip touch luogo-tipo ${tipo === t ? 'chip--attivo' : ''}`} style={{ '--luogo-tipo-colore': COLORE_TIPO_LUOGO[t] } as React.CSSProperties} onClick={() => setTipo(t)} aria-pressed={tipo === t}>
                    <IconaSpillo tipo={definizioneTipoLuogo(t).icona} dimensione={16} /> {NOME_TIPO_LUOGO[t] ?? t} ({q.luoghi.filter((l) => l.tipo === t).length})
                  </button>)}
                </div>
              )}
              <ul className="m-0 grid list-none grid-cols-1 items-start gap-2 p-0 md:grid-cols-2 xl:grid-cols-1" aria-label="Luoghi">
                {visibili.map((l) => <Luogo key={l.chiave} l={l} onSalvato={() => void dati.ricarica()} />)}
              </ul>
              {visibili.length === 0 && <p className="m-0 text-[13px] text-text-muted" role="status">Nessun luogo di questo tipo in {q.nome}.</p>}
              {/* L5 (F4, F5): i luoghi del quartiere senza un'Area, con l'area proposta se la migrazione ne ha dedotta una: la loro pagina e
                  «Colloca» */}
              {(q.luoghiDaCollocare?.length ?? 0) > 0 && (
                <details className="card text-[13px]">
                  <summary className="touch cursor-pointer font-semibold text-text-secondary">Luoghi da collocare ({q.luoghiDaCollocare!.length})</summary>
                  <ul className="m-0 flex list-none flex-col gap-1 p-0 pt-1.5" aria-label="Luoghi da collocare">
                    {q.luoghiDaCollocare!.map((l) => <li key={l.chiave} className="flex flex-wrap items-center gap-1.5">
                      {l.casa ? <Link to={l.casa} className="touch inline-flex items-center">{l.nome}</Link> : <span>{l.nome}</span>}
                      {l.areaProposta && <span className="text-[12px] text-text-muted">· proposta: {l.areaProposta.nome}</span>}
                      <button type="button" className="btn btn-ghost btn-sm touch ml-auto" aria-label={`Colloca ${l.nome}`} onClick={() => setColloca({ luogo: { chiave: l.chiave, nome: l.nome }, proposta: l.areaProposta?.slug ?? null })}>Colloca</button>
                    </li>)}
                  </ul>
                </details>
              )}
            </section>
            </div>
          </div>

          {finestra === 'ingresso' && <IngressoQuartiere quartiere={q} aperta onChiudi={() => setFinestra(null)} onSalvato={() => dati.ricarica()} />}
          {colloca && <FinestraColloca luogo={colloca.luogo} proposta={colloca.proposta} aree={q.aree.map((a) => ({ slug: a.slug, nome: a.nome }))} onChiudi={() => setColloca(null)} onFatto={() => void dati.ricarica()} />}
          {finestra === 'aggiungi' && <FinestraAggiungiArea quartiere={q} aperta onChiudi={() => setFinestra(null)} onCreata={(area) => { void dati.ricarica().then(() => { if (area.passaggio) mostraPin(area.passaggio.spillo); }); }} />}
          {finestra === 'sblocco' && <EditorSbloccoQuartiere chiave={q.chiave} nome={q.nome} sblocco={q.sbloccoCondizione} onChiudi={() => setFinestra(null)} onSalvato={() => void dati.ricarica()} />}
          {/* L'area d'ingresso nella sua finestra (decisione del PM, 2026-10-20): dalla metro o con «Entra», sul punto e con lo zoom
              dell'ingresso; «Apri l'area» porta alla sua pagina con lo stesso punto, «Chiudi» resta qui e toglie `ingresso=1`. */}
          {q.ingresso && <Modal titolo={`${q.ingresso.area?.nome ?? q.ingresso.nome} — ingresso di ${q.nome}`} aperta={entraAperta || dallaMetro} onChiudi={chiudiEntra} larga
            azioni={<>
              <button type="button" className="btn btn-secondary touch" onClick={chiudiEntra}>Chiudi</button>
              {q.ingresso.area && <Link className="btn btn-primary touch" to={urlCasa(`/guida/citta/${encodeURIComponent(q.chiave)}/${encodeURIComponent(q.ingresso.area.slug)}`, { x: q.ingresso.x, y: q.ingresso.y, zoom: q.ingresso.zoom })}>Apri l’area</Link>}
            </>}>
            <MappaIncorporata chiave={q.ingresso.mappa} nome={q.ingresso.area?.nome ?? q.ingresso.nome} puntoIniziale={{ x: q.ingresso.x, y: q.ingresso.y, zoom: q.ingresso.zoom }} conEditor={false}
              altezza="min(64dvh, 620px)" />
          </Modal>}
        </div>
      )}
    </PageState>
  );
}
