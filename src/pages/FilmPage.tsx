// ============================================================
// FilmPage — cinema, DVD e avanzamento per sessioni/visioni
// ============================================================
//
// La scheda dice dove si vede (la pellicola per il cinema, il disco per il DVD), quando è in
// programmazione (le condizioni, non una frase), che cosa dà la prima visione e — al cinema —
// quanto rende rivederlo (gli effetti dichiarati «dalla seconda volta in poi»). Un DVD si
// completa in più sessioni; al cinema una visione basta e le rivisioni si contano senza tetto.
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { descriviRequisitoSpillo } from '../../shared/condizioniSpillo';
import { Selettore } from '../components/shared/Selettore';
import { Segmenti } from '../components/shared/Segmenti';
import { CampoRicerca } from '../components/shared/CampoRicerca';
import { opzioniDaNomi } from '../utils/selettore';
import { getFilm, impostaProgressoFilm } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useCodaProgresso } from '../hooks/useCodaProgresso';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { avvisaDotiDaSegnare } from '../utils/dotiDaSegnare';
import { PageState } from '../components/shared/PageState';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { NotaPuntiDote } from '../components/shared/NotaPuntiDote';
import { IconaCategoria } from '../components/guida/IconaCategoria';
import { ChipDisponibilita } from '../components/guida/ChipDisponibilita';
import { ComandiProgressoLettura } from '../components/guida/ComandiProgressoLettura';
import { AggiungiAlCatalogo, CorreggiElemento } from '../components/guida/AzioniCatalogo';
import { ModificaGuida } from '../components/guida/ModificaGuida';
import { NOME_DOTE } from '../utils/citta';
import { PulsanteVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';
import { TesseraKpi } from '../components/shared/TesseraKpi';
import { CatalogoDaCompletare, PannelloPosizione } from '../components/guida/CatalogoDaCompletare';
import { STATI_LETTURA, formattaYen, haDote, passaStato, type StatoLettura } from '../utils/letture';
import type { FilmDto, FilmDvdDto } from '../types';

type SupportoFiltro = 'tutti' | 'cinema' | 'dvd';
const SUPPORTI: ReadonlyArray<{ chiave: SupportoFiltro; nome: string }> = [{ chiave: 'tutti', nome: 'Cinema e DVD' }, { chiave: 'cinema', nome: 'Solo cinema' }, { chiave: 'dvd', nome: 'Solo DVD' }];
/** Il titolo da mostrare: il nome del catalogo (il solo nome del film). */
const nomeFilm = (film: FilmDto) => film.nome;

/**
 * Pagina di film e DVD: carica i titoli per la partita attiva, mostra i conteggi di riepilogo e i
 * filtri (testo su titolo, effetti e dettagli; supporto; Dote; stato della visione), poi le
 * schede divise fra da vedere e completati (questi ripiegati). Le visioni e le sessioni passano
 * da una coda per titolo che invia una richiesta per volta e aggiorna i conteggi della pagina;
 * «Mostra posizione» apre, sopra gli elenchi, il pannello con la mappa del luogo scelto e ci scorre.
 */
export function FilmPage({ soloChiave }: { soloChiave?: string } = {}) {
  // R10-27: nel pannello sopra il diario `soloChiave` mostra il titolo citato dalla voce, nell'elenco filtrato su di lui (senza intestazione,
  // riepilogo e filtri: sono dell'elenco, e il titolo è uno)
  useDocumentTitle('Film e DVD');
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  const dati = useCarica(() => getFilm(partitaId ?? undefined), [partitaId]);
  const [ricerca, setRicerca] = useState('');
  const [stato, setStato] = useState<StatoLettura>('tutti');
  const [supporto, setSupporto] = useState<SupportoFiltro>('tutti');
  const [dote, setDote] = useState('');
  const [selezionato, setSelezionato] = useState<string | null>(null);
  const [posizioneSelezionata, setPosizioneSelezionata] = useState(0);
  const pannelloRef = useRef<HTMLElement | null>(null);

  // Le pressioni rapide su visioni e sessioni: una richiesta per volta per film insegue l'ultimo valore chiesto, nella partita di partenza.
  const coda = useCodaProgresso<FilmDto>(partitaId, {
    invia: impostaProgressoFilm,
    // il film aggiornato sostituisce il suo nei dati correnti, con i conteggi della pagina
    applica: (film) => dati.imposta((correnti): FilmDvdDto => {
      const elenco = correnti.film.map((f) => f.chiave === film.chiave ? film : f);
      return {
        ...correnti,
        film: elenco,
        iniziati: elenco.filter((f) => f.iniziato).length,
        completati: elenco.filter((f) => f.fatto).length,
        sessioniCompletamentoFatte: elenco.reduce((n, f) => n + Math.min(f.progresso, f.totaleSessioni), 0),
        visioniRegistrate: elenco.reduce((n, f) => n + f.progresso, 0),
      };
    }),
    // la visione dà le sue Doti: si segnano a mano, l'avviso le ricorda
    dopoOgniInvio: (film) => avvisaDotiDaSegnare(film.daSegnare, film.nome),
    messaggioErrore: 'Aggiornamento della visione fallito.',
    segnalaErrore: (m) => notifica('error', m),
  });
  /** Mette in coda il nuovo avanzamento del titolo: mai sotto zero e, per un DVD, mai oltre le sessioni che lo completano; al cinema non c'è tetto. */
  const accoda = (film: FilmDto, valore: number) => coda.accoda(film, film.dove === 'dvd' ? Math.min(Math.max(valore, 0), film.totaleSessioni) : Math.max(valore, 0));

  /** Se il titolo è completato con quell'avanzamento: al cinema basta una visione, un DVD vuole tutte le sue sessioni. */
  const completatoCon = (film: FilmDto, progresso: number) => (film.dove === 'cinema' ? progresso > 0 : progresso >= film.totaleSessioni);
  const progressoDi = coda.valore;

  const visibili = useMemo(() => {
    const q = ricerca.trim().toLocaleLowerCase('it');
    return (dati.dati?.film ?? []).filter((f) => {
      if (soloChiave && f.chiave !== soloChiave) return false;
      const progresso = progressoDi(f);
      if (q && !`${f.nome} ${(f.nomiAltri ?? []).join(' ')} ${f.effettiTesto.join(' ')} ${f.dettagli ?? ''}`.toLocaleLowerCase('it').includes(q)) return false;
      if (supporto !== 'tutti' && f.dove !== supporto) return false;
      if (dote && !haDote(f.effetti, dote)) return false;
      return passaStato(stato, progresso, completatoCon(f, progresso));
    });
  }, [dati.dati, progressoDi, ricerca, stato, supporto, dote, soloChiave]);

  const filmSelezionato = dati.dati?.film.find((f) => f.chiave === selezionato) ?? null;
  const posizione = filmSelezionato?.posizioni[posizioneSelezionata] ?? null;
  useEffect(() => { if (filmSelezionato) pannelloRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }); }, [filmSelezionato]);
  const d = dati.dati;
  // il titolo della voce si vede anche se già completato: non finisce nella piega dei completati
  const daFare = soloChiave ? visibili : visibili.filter((f) => !completatoCon(f, progressoDi(f)));
  const fatti = soloChiave ? [] : visibili.filter((f) => completatoCon(f, progressoDi(f)));

  /** La scheda di un titolo: la stessa nei due gruppi, quindi scritta una volta sola. */
  const scheda = (film: FilmDto) => {
    const titolo = nomeFilm(film);
    const progresso = progressoDi(film);
    const iniziato = progresso > 0;
    const completato = completatoCon(film, progresso);
    const cinema = film.dove === 'cinema';
    const quando = (film.condizioni ?? []).map((c) => c.tipo === 'avviso' ? descriviRequisitoSpillo(c) : c.testo).join(' · ');
    return <li key={film.chiave} className={`card relative flex min-w-0 flex-col gap-3 overflow-hidden ${completato ? 'border-success/50' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Il disco per i DVD, la pellicola per il cinema: la figura dice dove si guarda. */}
        <IconaCategoria categoria={cinema ? 'film' : 'dvd'} dimensione={44} etichetta={cinema ? 'Al cinema' : 'In DVD'} />
        <div className="min-w-0 flex-1"><h2 className="m-0 text-lg leading-tight">{film.catalogo ? <Link className="touch inline-flex items-center" to={film.catalogo.casa}>{titolo}</Link> : titolo}</h2><p className="m-0 text-xs text-text-secondary">{cinema ? 'Cinema' : 'DVD'}{quando ? ` · ${quando}` : ''}</p></div>
        <span className="flex flex-col items-end gap-1">
          <span className={`chip ${completato ? 'chip--attivo' : ''}`}>{completato ? 'Completato' : iniziato ? 'In corso' : cinema ? 'Da vedere' : 'Da iniziare'}</span>
          <ChipDisponibilita disponibilita={film.disponibilita ?? undefined} compatto />
        </span>
      </div>
      <ComandiProgressoLettura titolo={titolo} tipo={cinema ? 'cinema' : 'dvd'} progresso={progresso} totale={film.totaleSessioni}
        partita={partitaId !== null} occupato={coda.occupato(film)} disponibilita={film.disponibilita} onCambia={(valore) => accoda(film, valore)} />
      <dl className="dl-scheda m-0 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
        <dt className="text-text-muted">Che cosa fa</dt>
        <dd className="m-0">{film.effettiTesto.length ? <ul className="m-0 list-none p-0">{film.effettiTesto.map((t, i) => <li key={i}>{t}</li>)}</ul> : 'Nessun effetto dichiarato'}</dd>
        {!cinema && <><dt className="text-text-muted">Visioni</dt><dd className="m-0">{film.totaleSessioni} per completarlo</dd></>}
        {!!film.negozi?.length && <><dt className="text-text-muted">In vendita da</dt><dd className="m-0 flex flex-wrap gap-1">{film.negozi.map((n) => <Link key={n.articolo} to={`/guida/negozi/${encodeURIComponent(n.negozio)}`} className="chip chip--attivo touch no-underline">{n.negozioNome}{n.prezzo === null ? '' : ` · ${formattaYen(n.prezzo)}`}</Link>)}</dd></>}
        {!film.negozi?.length && film.prezzo !== null && <><dt className="text-text-muted">Prezzo</dt><dd className="m-0">{formattaYen(film.prezzo)}</dd></>}
      </dl>
      {film.notaPrezzo && <p className="m-0 text-xs text-text-secondary">{film.notaPrezzo}</p>}
      {film.dettagli && <p className="m-0 text-xs text-text-secondary">{film.dettagli}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-2">
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="posizione" dimensione={20} />} titolo="Mostra posizione"
          onClick={() => { setSelezionato(film.chiave); setPosizioneSelezionata(0); }} aria-label={`Mostra posizione di ${titolo}`} />
        <CorreggiElemento tipo="film" chiave={film.chiave} onSalvato={() => void dati.ricarica()} />
        <ModificaGuida tipo="film-posizioni" chiave={film.chiave} cosa={`dove si vede «${titolo}»`} etichetta="Posizioni" onSalvato={() => void dati.ricarica()} />
      </div>
    </li>;
  };

  return <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
    {d && <CatalogoDaCompletare
      soloChiave={soloChiave}
      intestazione={<IntestazionePagina titolo="Film e DVD" sottotitolo={partitaId
        ? <>Registra visioni e sessioni nella partita «{attiva?.nome}». Al cinema una visione basta e rivedere può valere ancora; un DVD si completa in più sessioni.</>
        : <>I {d.film.length} titoli al cinema e in DVD di Persona 5 Royal, con quando si vedono, che cosa danno e dove. Attiva una partita per registrarne le visioni.</>} />}
      riepilogo={{ etichetta: 'Riepilogo film e DVD', tessere: <>
        <TesseraKpi valore={d.iniziati} segno="iniziati" etichetta="titoli iniziati" />
        <TesseraKpi valore={d.completati} segno="completati" etichetta="completati" />
        <TesseraKpi valore={`${d.sessioniCompletamentoFatte}/${d.sessioniObiettivo}`} segno="sessioni" etichetta="sessioni obiettivo" />
        <TesseraKpi valore={d.visioniRegistrate} segno="visioni" etichetta="visioni registrate" />
      </> }}
      avvisi={partitaId && <NotaPuntiDote cosa="quali titoli hai visto e quante volte"
        dettaglio="Al cinema prima visione e successive possono valere diverso: l’avviso dice quanto." />}
      filtri={{ etichetta: 'Filtri film e DVD', contenuto: <>
        <div className="filtri-articoli__riga">
          <CampoRicerca valore={ricerca} onCambia={setRicerca} segnaposto="Cerca titolo o effetto…" />
          <Selettore compatto etichetta="Dote" valore={dote} vuoto="Tutte le Doti" opzioni={opzioniDaNomi(NOME_DOTE)} onCambia={setDote} />
        </div>
        <div className="filtri-articoli__riga">
          <Segmenti etichetta="Supporto" valore={supporto} opzioni={SUPPORTI} onCambia={setSupporto} />
          <Segmenti etichetta="Stato visione" valore={stato} opzioni={STATI_LETTURA} onCambia={setStato} />
        </div>
      </> }}
      posizione={filmSelezionato && <PannelloPosizione rif={pannelloRef}
        titolo={<>Dove vedere “{nomeFilm(filmSelezionato)}”</>} etichetta={`Posizione di ${nomeFilm(filmSelezionato)}`}
        modifica={<ModificaGuida tipo="film-posizioni" chiave={filmSelezionato.chiave} cosa={`dove si vede «${nomeFilm(filmSelezionato)}»`} soloIcona onSalvato={() => void dati.ricarica()} />}
        onChiudi={() => setSelezionato(null)}
        scelte={filmSelezionato.posizioni.map((p) => ({ chiave: `${p.ruolo}/${p.tipo}/${p.chiave}`, etichetta: <>{p.ruolo === 'noleggio' ? 'Noleggio · ' : p.ruolo === 'visione' ? 'Visione · ' : ''}{p.etichetta}</> }))}
        indice={posizioneSelezionata} onIndice={setPosizioneSelezionata} posizione={posizione}
        assente="Non esiste ancora un punto territoriale verificato per questo titolo." />}
      conteggio={`${visibili.length} titoli mostrati${fatti.length > 0 ? ` · ${daFare.length} da vedere` : ''}`}
      aggiungi={<AggiungiAlCatalogo tipo="film" titolo="Aggiungi un film o un DVD" onSalvato={() => void dati.ricarica()} />}
      daFare={daFare} fatti={fatti} scheda={scheda}
      testi={{ elenco: 'Film e DVD da vedere', sezioneFatti: 'Film e DVD completati', elencoFatti: 'Film e DVD già completati', vuoto: 'Nessun titolo da vedere con questi filtri.', vuotoSolo: 'Questo titolo non è nel catalogo.' }}
    />}
  </PageState>;
}
