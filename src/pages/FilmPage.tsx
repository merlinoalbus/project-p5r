// ============================================================
// FilmPage — cinema, DVD e avanzamento per sessioni/visioni
// ============================================================
//
// La scheda dice dove si vede (la pellicola per il cinema, il disco per il DVD), quando è in
// programmazione (le condizioni, non una frase), che cosa dà la prima visione e — al cinema —
// quanto rende rivederlo (gli effetti dichiarati con «anche alle volte successive»). Un DVD si
// completa in più sessioni; al cinema una visione basta e le rivisioni si contano senza tetto.
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { Selettore } from '../components/shared/Selettore';
import { Segmenti } from '../components/shared/Segmenti';
import { CampoRicerca } from '../components/shared/CampoRicerca';
import { opzioniDaNomi } from '../utils/selettore';
import { getFilm, impostaProgressoFilm } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { NotaPuntiDote } from '../components/shared/NotaPuntiDote';
import { DoveSiTrova } from '../components/mappe/DoveSiTrova';
import { IconaCategoria } from '../components/guida/IconaCategoria';
import { ChipDisponibilita } from '../components/guida/ChipDisponibilita';
import { AggiungiAlCatalogo, CorreggiElemento } from '../components/guida/AzioniCatalogo';
import { NOME_DOTE } from '../utils/citta';
import { PulsanteVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione, IconaSegno } from '../components/shared/IconaAzione';
import { STATI_LETTURA, bloccata, formattaYen, haDote, motivoBlocco, passaStato, type StatoLettura } from '../utils/letture';
import type { FilmDto, FilmDvdDto } from '../types';

type SupportoFiltro = 'tutti' | 'cinema' | 'dvd';
const SUPPORTI: ReadonlyArray<{ chiave: SupportoFiltro; nome: string }> = [{ chiave: 'tutti', nome: 'Cinema e DVD' }, { chiave: 'cinema', nome: 'Solo cinema' }, { chiave: 'dvd', nome: 'Solo DVD' }];
const chiaveCoda = (partitaId: number, film: string) => `${partitaId}:${film}`;
const nomeFilm = (film: FilmDto) => film.nomeIt ?? film.nome;

export function FilmPage() {
  useDocumentTitle('Film e DVD');
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  const partitaIdRef = useRef(partitaId);
  useEffect(() => { partitaIdRef.current = partitaId; }, [partitaId]);
  const dati = useCarica(() => getFilm(partitaId ?? undefined), [partitaId]);
  const datiRef = useRef<FilmDvdDto | null>(null);
  useEffect(() => { datiRef.current = dati.dati; }, [dati.dati]);
  const [ricerca, setRicerca] = useState('');
  const [stato, setStato] = useState<StatoLettura>('tutti');
  const [supporto, setSupporto] = useState<SupportoFiltro>('tutti');
  const [dote, setDote] = useState('');
  const [selezionato, setSelezionato] = useState<string | null>(null);
  const [posizioneSelezionata, setPosizioneSelezionata] = useState(0);
  const [mostraFatti, setMostraFatti] = useState(false);
  const [desiderati, setDesiderati] = useState<Record<string, number>>({});
  const [occupati, setOccupati] = useState<Record<string, boolean>>({});
  const pannelloRef = useRef<HTMLElement | null>(null);
  const desideratiRef = useRef(new Map<string, number>());
  const confermatiRef = useRef(new Map<string, number>());
  const inVoloRef = useRef(new Set<string>());

  const sostituisciFilm = (film: FilmDto) => {
    const correnti = datiRef.current;
    if (!correnti) return;
    const elenco = correnti.film.map((f) => f.chiave === film.chiave ? film : f);
    const nuovi: FilmDvdDto = {
      ...correnti,
      film: elenco,
      iniziati: elenco.filter((f) => f.iniziato).length,
      completati: elenco.filter((f) => f.fatto).length,
      sessioniCompletamentoFatte: elenco.reduce((n, f) => n + Math.min(f.progresso, f.totaleSessioni), 0),
      visioniRegistrate: elenco.reduce((n, f) => n + f.progresso, 0),
    };
    datiRef.current = nuovi;
    dati.imposta(nuovi);
  };

  /** Le pressioni rapide si mettono in coda: una richiesta per volta insegue l'ultimo valore chiesto. */
  const eseguiCoda = async (film: FilmDto) => {
    if (!partitaId) return;
    const partitaCorrente = partitaId;
    const coda = chiaveCoda(partitaCorrente, film.chiave);
    if (inVoloRef.current.has(coda)) return;
    inVoloRef.current.add(coda);
    confermatiRef.current.set(coda, film.progresso);
    setOccupati((x) => ({ ...x, [coda]: true }));
    try {
      while (true) {
        const confermato = confermatiRef.current.get(coda) ?? film.progresso;
        const desiderato = desideratiRef.current.get(coda) ?? confermato;
        if (desiderato === confermato || partitaIdRef.current !== partitaCorrente) break;
        const aggiornato = await impostaProgressoFilm(partitaCorrente, film.chiave, desiderato);
        confermatiRef.current.set(coda, aggiornato.progresso);
        if (partitaIdRef.current === partitaCorrente) sostituisciFilm(aggiornato);
      }
    } catch (err) {
      const confermato = confermatiRef.current.get(coda) ?? film.progresso;
      desideratiRef.current.set(coda, confermato);
      setDesiderati((x) => ({ ...x, [coda]: confermato }));
      if (partitaIdRef.current === partitaCorrente) notifica('error', err instanceof Error ? err.message : 'Aggiornamento della visione fallito.');
    } finally {
      inVoloRef.current.delete(coda);
      setOccupati((x) => ({ ...x, [coda]: false }));
    }
  };

  const accoda = (film: FilmDto, valore: number) => {
    if (!partitaId) return;
    const desiderato = film.dove === 'dvd' ? Math.min(Math.max(valore, 0), film.totaleSessioni) : Math.max(valore, 0);
    const coda = chiaveCoda(partitaId, film.chiave);
    desideratiRef.current.set(coda, desiderato);
    setDesiderati((x) => ({ ...x, [coda]: desiderato }));
    void eseguiCoda(film);
  };

  const completatoCon = (film: FilmDto, progresso: number) => (film.dove === 'cinema' ? progresso > 0 : progresso >= film.totaleSessioni);
  const progressoDi = (film: FilmDto) => (partitaId ? desiderati[chiaveCoda(partitaId, film.chiave)] ?? film.progresso : film.progresso);

  const visibili = useMemo(() => {
    const q = ricerca.trim().toLocaleLowerCase('it');
    return (dati.dati?.film ?? []).filter((f) => {
      const progresso = progressoDi(f);
      if (q && !`${f.nome} ${f.nomeIt ?? ''} ${f.effettiTesto.join(' ')} ${f.dettagli ?? ''}`.toLocaleLowerCase('it').includes(q)) return false;
      if (supporto !== 'tutti' && f.dove !== supporto) return false;
      if (dote && !haDote(f.effetti, dote)) return false;
      return passaStato(stato, progresso, completatoCon(f, progresso));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dati.dati, desiderati, ricerca, stato, supporto, dote, partitaId]);

  const filmSelezionato = dati.dati?.film.find((f) => f.chiave === selezionato) ?? null;
  const posizione = filmSelezionato?.posizioni[posizioneSelezionata] ?? null;
  useEffect(() => { if (filmSelezionato) pannelloRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }); }, [filmSelezionato]);
  const d = dati.dati;
  const daFare = visibili.filter((f) => !completatoCon(f, progressoDi(f)));
  const fatti = visibili.filter((f) => completatoCon(f, progressoDi(f)));

  /** La scheda di un titolo: la stessa nei due gruppi, quindi scritta una volta sola. */
  const scheda = (film: FilmDto) => {
    const titolo = nomeFilm(film);
    const coda = partitaId ? chiaveCoda(partitaId, film.chiave) : film.chiave;
    const progresso = progressoDi(film);
    const iniziato = progresso > 0;
    const completato = completatoCon(film, progresso);
    const cinema = film.dove === 'cinema';
    const percentuale = cinema ? Number(iniziato) * 100 : Math.round((progresso / film.totaleSessioni) * 100);
    const nonAncora = bloccata(film.disponibilita);
    const quando = (film.condizioni ?? []).map((c) => c.testo).join(' · ');
    return <li key={film.chiave} className={`card relative flex min-w-0 flex-col gap-3 overflow-hidden ${completato ? 'border-success/50' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Il disco per i DVD, la pellicola per il cinema: la figura dice dove si guarda. */}
        <IconaCategoria categoria={cinema ? 'film' : 'dvd'} dimensione={44} etichetta={cinema ? 'Al cinema' : 'In DVD'} />
        <div className="min-w-0 flex-1"><h2 className="m-0 text-lg leading-tight">{titolo}</h2><p className="m-0 text-xs text-text-secondary">{cinema ? 'Cinema' : 'DVD'}{quando ? ` · ${quando}` : ''}</p></div>
        <span className="flex flex-col items-end gap-1">
          <span className={`chip ${completato ? 'chip--attivo' : ''}`}>{completato ? 'Completato' : iniziato ? 'In corso' : cinema ? 'Da vedere' : 'Da iniziare'}</span>
          <ChipDisponibilita disponibilita={film.disponibilita ?? undefined} compatto />
        </span>
      </div>
      <div><div className="mb-1 flex justify-between text-xs text-text-secondary"><span>{cinema ? `${progresso} ${progresso === 1 ? 'visione' : 'visioni'}` : `${progresso} di ${film.totaleSessioni} sessioni`}</span>{!cinema && <span>{percentuale}%</span>}</div><div className="visore-mappa__progresso" role="progressbar" aria-label={`Progresso ${titolo}`} aria-valuemin={0} aria-valuemax={cinema ? Math.max(1, progresso) : film.totaleSessioni} aria-valuenow={progresso}><span className="visore-mappa__progresso-barra" style={{ width: `${percentuale}%` }} /></div></div>
      {/* Due pulsanti larghi uguali: il gesto è la visione. Al cinema non c'è tetto (le rivisioni
          contano); con il titolo non ancora disponibile il «+» resta spento e il motivo sta sotto. */}
      {partitaId && <div className="grid grid-cols-2 gap-2" aria-label={`Avanzamento ${titolo}`}>
        <PulsanteVisivo tono="secondario" icona={<IconaAzione chiave="meno" dimensione={20} />} titolo="Togli" disabled={progresso === 0} onClick={() => accoda(film, progresso - 1)} aria-label={`Togli una ${cinema ? 'visione' : 'sessione'} a ${titolo}`} />
        <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo={cinema ? 'Visione' : 'Sessione'} disabled={(!cinema && progresso >= film.totaleSessioni) || (nonAncora && progresso === 0)} onClick={() => accoda(film, progresso + 1)} aria-label={`Aggiungi una ${cinema ? 'visione' : 'sessione'} a ${titolo}`} />
        {nonAncora && progresso === 0 && <p className="col-span-2 m-0 text-xs text-text-secondary" role="note">Non ancora {cinema ? 'in programmazione' : 'disponibile'}: {motivoBlocco(film.disponibilita)}</p>}
        {occupati[coda] && <span className="col-span-2 text-center text-xs text-text-muted" role="status">Salvataggio…</span>}
      </div>}
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
        <dt className="text-text-muted">Che cosa fa</dt>
        <dd className="m-0">{film.effettiTesto.length ? <ul className="m-0 list-none p-0">{film.effettiTesto.map((t, i) => <li key={i}>{t}</li>)}</ul> : 'Nessun effetto dichiarato'}</dd>
        {!cinema && <><dt className="text-text-muted">Visioni</dt><dd className="m-0">{film.totaleSessioni} per completarlo</dd></>}
        {film.prezzo !== null && <><dt className="text-text-muted">Prezzo</dt><dd className="m-0">{formattaYen(film.prezzo)}</dd></>}
      </dl>
      {film.dettagli && <p className="m-0 text-xs text-text-secondary">{film.dettagli}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-2">
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="posizione" dimensione={20} />} titolo="Mostra posizione"
          onClick={() => { setSelezionato(film.chiave); setPosizioneSelezionata(0); }} aria-label={`Mostra posizione di ${titolo}`} />
        <CorreggiElemento tipo="film" chiave={film.chiave} onSalvato={() => void dati.ricarica()} />
      </div>
    </li>;
  };

  return <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
    {d && <div className="flex flex-col gap-4">
      <IntestazionePagina titolo="Film e DVD" sottotitolo={partitaId
        ? <>Registra visioni e sessioni nella partita «{attiva?.nome}». Al cinema una visione basta e rivedere può valere ancora; un DVD si completa in più sessioni.</>
        : <>I {d.film.length} titoli al cinema e in DVD di Persona 5 Royal, con quando si vedono, che cosa danno e dove. Attiva una partita per registrarne le visioni.</>} />

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Riepilogo film e DVD">
        <div className="kpi-tile"><span className="kpi-value">{d.iniziati}</span><span className="kpi-label kpi-label--segno"><IconaSegno chiave="iniziati" />titoli iniziati</span></div>
        <div className="kpi-tile"><span className="kpi-value">{d.completati}</span><span className="kpi-label kpi-label--segno"><IconaSegno chiave="completati" />completati</span></div>
        <div className="kpi-tile"><span className="kpi-value">{d.sessioniCompletamentoFatte}/{d.sessioniObiettivo}</span><span className="kpi-label kpi-label--segno"><IconaSegno chiave="sessioni" />sessioni obiettivo</span></div>
        <div className="kpi-tile"><span className="kpi-value">{d.visioniRegistrate}</span><span className="kpi-label kpi-label--segno"><IconaSegno chiave="visioni" />visioni registrate</span></div>
      </section>

      {partitaId && <NotaPuntiDote cosa="quali titoli hai visto e quante volte"
        dettaglio="Al cinema la prima visione e le successive possono valere diverso: lo dicono gli effetti del titolo, e l’app applica quelli." />}

      <section className="filtri-articoli" aria-label="Filtri film e DVD">
        <div className="filtri-articoli__riga">
          <CampoRicerca valore={ricerca} onCambia={setRicerca} segnaposto="Cerca titolo o effetto…" />
          <Selettore compatto etichetta="Dote" valore={dote} vuoto="Tutte le Doti" opzioni={opzioniDaNomi(NOME_DOTE)} onCambia={setDote} />
        </div>
        <div className="filtri-articoli__riga">
          <Segmenti etichetta="Supporto" valore={supporto} opzioni={SUPPORTI} onCambia={setSupporto} />
          <Segmenti etichetta="Stato visione" valore={stato} opzioni={STATI_LETTURA} onCambia={setStato} />
        </div>
      </section>

      {filmSelezionato && <section ref={pannelloRef} className="flex scroll-mt-20 flex-col gap-2" aria-label={`Posizione di ${nomeFilm(filmSelezionato)}`}>
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="m-0">Dove vedere “{nomeFilm(filmSelezionato)}”</h2><button type="button" className="btn btn-ghost btn-sm touch" onClick={() => setSelezionato(null)}>Chiudi</button></div>
        {filmSelezionato.posizioni.length > 1 && <div className="flex flex-wrap gap-2">{filmSelezionato.posizioni.map((p, i) => <button key={`${p.ruolo}/${p.tipo}/${p.chiave}`} type="button" className={`chip touch ${i === posizioneSelezionata ? 'chip--attivo' : ''}`} onClick={() => setPosizioneSelezionata(i)}>{p.ruolo === 'noleggio' ? 'Noleggio · ' : p.ruolo === 'visione' ? 'Visione · ' : ''}{p.etichetta}</button>)}</div>}
        {posizione ? <DoveSiTrova tipo={posizione.tipo} chiave={posizione.chiave} titolo={posizione.etichetta} altezza={300} /> : <div className="card"><h3 className="m-0 text-base">Posizione non disponibile</h3><p className="mb-0 text-sm text-text-secondary">Non esiste ancora un punto territoriale verificato per questo titolo.</p></div>}
      </section>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-sm text-text-secondary">{visibili.length} titoli mostrati{fatti.length > 0 ? ` · ${daFare.length} da vedere` : ''}</p>
        <AggiungiAlCatalogo tipo="film" titolo="Aggiungi un film o un DVD" onSalvato={() => void dati.ricarica()} />
      </div>
      <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2 xl:grid-cols-3" aria-label="Film e DVD da vedere">
        {daFare.map(scheda)}
      </ul>
      {daFare.length === 0 && <p className="m-0 text-sm text-text-muted" role="status">Nessun titolo da vedere con questi filtri.</p>}
      {fatti.length > 0 && <section className="flex flex-col gap-3" aria-label="Film e DVD completati">
        <button type="button" className="btn btn-ghost btn-sm touch self-start" aria-expanded={mostraFatti} onClick={() => setMostraFatti((v) => !v)}>
          {mostraFatti ? 'Nascondi' : 'Mostra'} i completati · {fatti.length}
        </button>
        {mostraFatti && <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2 xl:grid-cols-3" aria-label="Film e DVD già completati">
          {fatti.map(scheda)}
        </ul>}
      </section>}
    </div>}
  </PageState>;
}
