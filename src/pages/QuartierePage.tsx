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
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { aggiornaSbloccoQuartiere, getQuartiere, ripristinaSbloccoQuartiere } from '../services/api';
import { MappaIncorporata } from '../components/mappe/MappaIncorporata';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PageState } from '../components/shared/PageState';
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
import { InvitiConfidente } from '../components/confidenti/InvitiConfidente';
import { ModificaGuida } from '../components/guida/ModificaGuida';
import { IntestazioneScheda } from '../components/shared/IntestazioneScheda';
import { MenuModifica } from '../components/shared/MenuModifica';

function condizioniDiSblocco(sblocco: SbloccoDto | undefined): RequisitoSpillo[] {
  if (!sblocco?.condizioneSalvata) return [];
  return sblocco.condizioneSalvata.tipo === 'gruppo' && sblocco.condizioneSalvata.modo === 'tutte'
    ? sblocco.condizioneSalvata.condizioni
    : [sblocco.condizioneSalvata];
}

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

// L12 (passo 8): nel rilascio (sola lettura) lo sblocco del quartiere non si modifica; `EditorSbloccoQuartiereReale` esce dal bundle (costante di build)
const EditorSbloccoQuartiere: StrumentoDiModifica<typeof EditorSbloccoQuartiereReale> = IN_RILASCIO ? NienteInRilascio : EditorSbloccoQuartiereReale;
function EditorSbloccoQuartiereReale({ chiave, nome, sblocco, onChiudi, onSalvato }: { chiave: string; nome: string; sblocco?: SbloccoDto; onChiudi: () => void; onSalvato: () => void }) {
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
    azioni={<><button type="button" className="btn btn-secondary touch" onClick={onChiudi} disabled={salvando}>Annulla</button><PulsanteVisivo tono="primario" icona={<IconaAzione chiave="registra" dimensione={22} />} titolo={salvando ? 'Salvataggio…' : 'Salva sblocco'} onClick={() => void salva()} disabled={salvando} /></>}>
    <div className="flex flex-col gap-3">
      <p className="m-0 testo-13 text-text-secondary">Gli inviti dei Confidenti restano separati e continuano ad aprire {nome} quando spettano.</p>
      <CondizioniEditor condizioni={condizioni} onCambia={setCondizioni} disabilitato={salvando} />
      {sblocco?.modificato && <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Ripristina la condizione della guida" onClick={() => void ripristina()} disabled={salvando} />}
      {errore && <p className="m-0 testo-13" role="alert">{errore}</p>}
    </div>
  </Modal>;
}
import { AggiungiAlCatalogo, CorreggiElemento } from '../components/guida/AzioniCatalogo';
import { NienteInRilascio, type StrumentoDiModifica } from '../components/shared/SoloPreparazione';

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
    <li id={ancoraLuogo(l.chiave)} className={`card flex flex-col gap-1 testo-13 scroll-mt-20 ${nonAncora ? 'opacity-60' : ''} ${classiSuggerito(sugg.evidenziato('luoghi', l.chiave))}`}>
      <div className="flex flex-wrap items-center gap-2">
        {/* L5 (F4): il nome porta alla pagina del luogo, la fonte unica */}
        {l.casa ? <Link to={l.casa} className="touch inline-flex items-center testo-15 font-bold text-text">{l.nome}</Link> : <strong className="testo-15">{l.nome}</strong>}
        {l.presenza && l.presenza.sbloccato !== false && l.presenza.aperto !== null && <span className={`chip testo-12 ${l.presenza.aperto ? 'chip--dalla-guida' : 'chip--bloccata'}`} title={l.presenza.testo}>{l.presenza.aperto ? 'Aperto adesso' : 'Chiuso adesso'}</span>}
        {l.negozi.length > 1 && <span className="testo-12 text-text-muted">· {l.negozi.length} negozi</span>}
        <span className="chip luogo-tipo" style={{ '--luogo-tipo-colore': COLORE_TIPO_LUOGO[l.tipo] ?? COLORE_TIPO_LUOGO.altro } as React.CSSProperties}><IconaSpillo tipo={definizioneTipoLuogo(l.tipo).icona} dimensione={14} /> {NOME_TIPO_LUOGO[l.tipo] ?? l.tipo}</span>
        {sugg.evidenziato('luoghi', l.chiave) && <TargaSuggerito motivo={sugg.motivo('luoghi', l.chiave)} compatta />}
        {nonAncora && <span className="chip chip--attivo testo-12" title={perche || undefined}>Non ancora nel mondo</span>}
        {!nonAncora && l.condizioni && l.disponibilita && <span className="chip testo-12" title="La condizione scritta dalla guida risulta soddisfatta in questa partita">sbloccato</span>}
        {l.quando && <span className="chip">{l.quando === 'entrambe' ? 'giorno e sera' : l.quando}</span>}
        {!l.verificato && <span className="chip testo-12" title="Dato da fonte secondaria, non confermato sulla guida italiana">da fonte secondaria</span>}
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
          <table className="tabella tabella--adattiva testo-12">
            <thead><tr><th>Piatto</th><th>Prezzo</th><th>Effetto</th></tr></thead>
            <tbody>{l.piatti.map((p) => <tr key={p.nome}><td data-etichetta="Piatto"><strong>{p.nome}</strong></td><td data-etichetta="Prezzo" className="tabular-nums">{p.prezzo !== null ? `${p.prezzo.toLocaleString('it-IT')} ¥` : '—'}</td><td data-etichetta="Effetto">{p.effetto}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {l.negozio && <CollegamentoVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="negozio" dimensione={20} />} titolo="Articoli in vendita" to={l.casa ? urlLuogo(l.chiave, l.negozio) : `/guida/negozi/${l.negozio}`} />}
      {l.note && <p className="m-0 testo-12 text-text-muted">{l.note}</p>}
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
  const [params, setParams] = useSearchParams();
  const attiva = usePartitaStore((s) => s.attiva);
  // La partita serve ai luoghi: senza, non si puo' dire quali a quel punto non ci sono ancora.
  const dati = useCarica(() => getQuartiere(chiave, attiva?.id), [chiave, attiva]);
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
  // L11 (R11-02/8): l'illustrazione del quartiere si legge dalla sua immagine nel database (caricata o grafica predefinita); lo scarico
  // dalla guida e la tabella `pianta_quartiere` non esistono più.
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
          {/* L'illustrazione della mappa del quartiere (regola unica di L1), con sopra la sagoma della mappa di Tokyo, la stessa che si è
              appena toccata: dice «sei nel posto che hai scelto» prima che si legga il titolo (scelta dell'utente, 2026-10-20). L6:
              illustrazione e titolo compatti anche sul telefono; condizioni e descrizione stanno nel corpo, per non allungare l'intestazione
              oltre il 30%. Lotto B: l'intestazione comune delle schede; «Entra» è l'azione di gioco (primaria), ingresso, aree, sblocco e
              testi della guida stanno nel menu «Modifica ⋯». */}
          <IntestazioneScheda ripiego="/guida/citta" titolo={q.nome}
            figura={<IllustrazioneConSegno illustrazione={q.illustrazione} alt={`Illustrazione di ${q.nome}`}
              className="w-[88px] shrink-0 sm:w-[112px] lg:w-[136px]"
              sizes="(min-width: 1024px) 136px, (min-width: 640px) 112px, 88px"
              segno={<SagomaQuartiere chiave={q.chiave} nome={q.nome} larghezza={72} altezza={54} />}
              senza={<SagomaQuartiere chiave={q.chiave} nome={q.nome} larghezza={88} altezza={66} />} />}
            chip={<span className="testo-12 text-text-muted">{q.aree.length === 0 ? 'nessuna area' : q.aree.length === 1 ? 'un’area' : `${q.aree.length} aree`} · {q.luoghi.length} {q.luoghi.length === 1 ? 'luogo' : 'luoghi'}</span>}
            azioni={<>
              {q.ingresso && <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="mappa" dimensione={20} />} titolo={`Entra: ${q.ingresso.area?.nome ?? q.ingresso.nome}`} onClick={() => setEntraAperta(true)} />}
              {!IN_RILASCIO && <MenuModifica cosa={`il quartiere «${q.nome}»`}>
                <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="seleziona" dimensione={20} />} titolo="Ingresso" dettaglio={q.ingresso ? undefined : 'da scegliere'} onClick={() => setFinestra('ingresso')} />
                <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="carica" dimensione={20} />} titolo="Aggiungi area" onClick={() => setFinestra('aggiungi')} />
                {/* la stessa finestra modifica lo sblocco e, se è stato cambiato, lo rimette com'era */}
                {q.sbloccoCondizione && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="bloccato" dimensione={20} />} titolo="Sblocco"
                  dettaglio={q.sbloccoCondizione.modificato ? 'modificato · ripristina' : undefined} aria-label="Modifica sblocco" onClick={() => setFinestra('sblocco')} />}
                {/* L11 · B11 (R11-15/6): nome e descrizione del quartiere, con «Ripristina» ai valori della guida */}
                <ModificaGuida tipo="quartiere" chiave={q.chiave} cosa={`il quartiere «${q.nome}»`} etichetta="Testi della guida" onSalvato={() => void dati.ricarica()} />
              </MenuModifica>}
            </>} />
          {(q.sbloccoCondizione?.testo || q.descrizione) && <section className="card flex flex-col gap-2" aria-label="Disponibilità del quartiere">
              {q.sbloccoCondizione?.testo && <p className="m-0 break-words testo-13"><strong className="text-text-secondary">Si apre:</strong> {q.sbloccoCondizione.testo}{q.sbloccoCondizione.modificato ? <span className="testo-12 text-text-muted"> (sblocco modificato)</span> : null}</p>}
              {q.descrizione && <p className="m-0 testo-13 text-text-secondary">{q.descrizione}</p>}
          </section>}

          {q.sbloccoCondizione?.fonte && <p className="m-0 testo-12 text-text-muted" title={q.sbloccoCondizione.fonte.nota ?? undefined}>Fonte: {q.sbloccoCondizione.fonte.registro}, certezza {q.sbloccoCondizione.fonte.certezza}{q.sbloccoCondizione.fonte.certezza !== 'alta' ? ' — da verificare' : ''}.</p>}
          {q.sbloccoCondizione?.esito === 'falso' && <p className="m-0 testo-13 text-text-secondary">Manca: {q.sbloccoCondizione.manca ?? q.sbloccoCondizione.testo}.</p>}
          <InvitiConfidente filtro={{ apreTipo: 'quartiere', apreChiave: q.chiave }} onCambiato={dati.ricarica} />

          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {/* L'illustrazione del quartiere, con i suoi pin: i passaggi verso le aree e l'uscita verso Tokyo. Si apre adattata e
                centrata (o sullo spillo dell'indirizzo); l'ingresso serve a chi arriva dalla metro, e ha la sua finestra. */}
            <section className="flex flex-col gap-1.5 xl:sticky xl:top-2" aria-label={`Illustrazione di ${q.nome}`}>
              {q.mappaChiave && <MappaIncorporata chiave={q.mappaChiave} nome={q.nome} spilloIniziale={spillo} rivelaSpilloIniziale={spillo !== null && spillo === pinChiesto} versione={`0-${revisione}`} classeVisore="visore-alto-quanto-immagine h-[min(56vh,460px)] md:h-[max(420px,min(64vh,740px))]" />}
              {!IN_RILASCIO && <div className="flex flex-wrap items-center gap-2 testo-12 text-text-muted">
                {q.illustrazione.immagineUrl || q.illustrazione.asset
                  ? <span>Pin e immagine si modificano dall’editor.</span>
                  : <span>Nessuna illustrazione per {q.nome}: carica una tua immagine dall’editor (resta nella tua istanza).</span>}
              </div>}
            </section>

            <div className="flex flex-col gap-4">
            <AreeDelQuartiere quartiere={q} onCambiato={() => dati.ricarica()} onAggiungi={() => setFinestra('aggiungi')} onPinSegnato={mostraPin} />
            <section className="flex flex-col gap-2" aria-label="Luoghi del quartiere">
              {!IN_RILASCIO && <div className="flex flex-wrap items-center gap-1.5"><AggiungiAlCatalogo tipo="luogo" titolo="Aggiungi un luogo" onSalvato={() => void dati.ricarica()} /></div>}
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
              {visibili.length === 0 && <p className="m-0 testo-13 text-text-muted" role="status">Nessun luogo di questo tipo in {q.nome}.</p>}
              {/* L5 (F4, F5): i luoghi del quartiere senza un'Area, con l'area proposta se la migrazione ne ha dedotta una: la loro pagina e
                  «Colloca» */}
              {!IN_RILASCIO && (q.luoghiDaCollocare?.length ?? 0) > 0 && (
                <details className="card testo-13">
                  <summary className="touch cursor-pointer font-semibold text-text-secondary">Luoghi da collocare ({q.luoghiDaCollocare!.length})</summary>
                  <ul className="m-0 flex list-none flex-col gap-1 p-0 pt-1.5" aria-label="Luoghi da collocare">
                    {q.luoghiDaCollocare!.map((l) => <li key={l.chiave} className="flex flex-wrap items-center gap-1.5">
                      {l.casa ? <Link to={l.casa} className="touch inline-flex items-center">{l.nome}</Link> : <span>{l.nome}</span>}
                      {l.areaProposta && <span className="testo-12 text-text-muted">· proposta: {l.areaProposta.nome}</span>}
                      <PulsanteVisivo tono="fantasma" compatto className="ml-auto" icona={<IconaAzione chiave="pianta" dimensione={20} />} titolo="Colloca" aria-label={`Colloca ${l.nome}`} onClick={() => setColloca({ luogo: { chiave: l.chiave, nome: l.nome }, proposta: l.areaProposta?.slug ?? null })} />
                    </li>)}
                  </ul>
                </details>
              )}
            </section>
            </div>
          </div>

          {!IN_RILASCIO && finestra === 'ingresso' && <IngressoQuartiere quartiere={q} aperta onChiudi={() => setFinestra(null)} onSalvato={() => dati.ricarica()} />}
          {colloca && <FinestraColloca luogo={colloca.luogo} proposta={colloca.proposta} aree={q.aree.map((a) => ({ slug: a.slug, nome: a.nome }))} onChiudi={() => setColloca(null)} onFatto={() => void dati.ricarica()} />}
          {finestra === 'aggiungi' && <FinestraAggiungiArea quartiere={q} aperta onChiudi={() => setFinestra(null)} onCreata={(area) => { void dati.ricarica().then(() => { if (area.passaggio) mostraPin(area.passaggio.spillo); }); }} />}
          {!IN_RILASCIO && finestra === 'sblocco' && <EditorSbloccoQuartiere chiave={q.chiave} nome={q.nome} sblocco={q.sbloccoCondizione} onChiudi={() => setFinestra(null)} onSalvato={() => void dati.ricarica()} />}
          {/* L'area d'ingresso nella sua finestra (decisione del PM, 2026-10-20): dalla metro o con «Entra», sul punto e con lo zoom
              dell'ingresso; «Apri l'area» porta alla sua pagina con lo stesso punto, «Chiudi» resta qui e toglie `ingresso=1`. */}
          {q.ingresso && <Modal titolo={`${q.ingresso.area?.nome ?? q.ingresso.nome} — ingresso di ${q.nome}`} aperta={entraAperta || dallaMetro} onChiudi={chiudiEntra} larga
            azioni={<>
              <PulsanteVisivo icona={<IconaAzione chiave="chiudi" dimensione={22} />} titolo="Chiudi" onClick={chiudiEntra} />
              {q.ingresso.area && <CollegamentoVisivo tono="primario" icona={<IconaAzione chiave="mappa" dimensione={22} />} titolo="Apri l’area" to={urlCasa(`/guida/citta/${encodeURIComponent(q.chiave)}/${encodeURIComponent(q.ingresso.area.slug)}`, { x: q.ingresso.x, y: q.ingresso.y, zoom: q.ingresso.zoom })} />}
            </>}>
            <MappaIncorporata chiave={q.ingresso.mappa} nome={q.ingresso.area?.nome ?? q.ingresso.nome} puntoIniziale={{ x: q.ingresso.x, y: q.ingresso.y, zoom: q.ingresso.zoom }} conEditor={false}
              altezza="min(64dvh, 620px)" />
          </Modal>}
        </div>
      )}
    </PageState>
  );
}
