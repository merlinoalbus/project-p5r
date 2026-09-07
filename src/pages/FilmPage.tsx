// ============================================================
// FilmPage — cinema, DVD e avanzamento per sessioni/visioni
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { getFilm, impostaProgressoFilm } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { DoveSiTrova } from '../components/mappe/DoveSiTrova';
import { IconaCategoria } from '../components/guida/IconaCategoria';
import { ChipDisponibilita } from '../components/guida/ChipDisponibilita';
import { AggiungiAlCatalogo, CorreggiElemento } from '../components/guida/AzioniCatalogo';
import { NOME_DOTE } from '../utils/citta';
import { PulsanteVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';
import type { FilmDto, FilmDvdDto } from '../types';

type StatoFiltro = 'tutti' | 'da-iniziare' | 'in-corso' | 'completati';
type SupportoFiltro = 'tutti' | 'cinema' | 'dvd';
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
  const [stato, setStato] = useState<StatoFiltro>('tutti');
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

  const visibili = useMemo(() => {
    const q = ricerca.trim().toLocaleLowerCase('it');
    return (dati.dati?.film ?? []).filter((f) => {
      const progresso = partitaId ? desiderati[chiaveCoda(partitaId, f.chiave)] ?? f.progresso : f.progresso;
      const iniziato = progresso > 0;
      const completato = f.dove === 'cinema' ? iniziato : progresso >= f.totaleSessioni;
      if (q && !`${f.nome} ${f.nomeIt ?? ''} ${f.periodo} ${f.dettagli ?? ''}`.toLocaleLowerCase('it').includes(q)) return false;
      if (supporto !== 'tutti' && f.dove !== supporto) return false;
      if (dote && f.dote !== dote) return false;
      if (stato === 'da-iniziare' && iniziato) return false;
      if (stato === 'in-corso' && (!iniziato || completato)) return false;
      if (stato === 'completati' && !completato) return false;
      return true;
    });
  }, [dati.dati, desiderati, ricerca, stato, supporto, dote, partitaId]);

  const filmSelezionato = dati.dati?.film.find((f) => f.chiave === selezionato) ?? null;
  const posizione = filmSelezionato?.posizioni[posizioneSelezionata] ?? null;
  useEffect(() => { if (filmSelezionato) pannelloRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }); }, [filmSelezionato]);
  const d = dati.dati;
  const completatoFilm = (film: FilmDto) => {
    const progresso = partitaId ? desiderati[chiaveCoda(partitaId, film.chiave)] ?? film.progresso : film.progresso;
    return film.dove === 'cinema' ? progresso > 0 : progresso >= film.totaleSessioni;
  };
  const daFare = visibili.filter((f) => !completatoFilm(f));
  const fatti = visibili.filter(completatoFilm);

  /** La scheda di un titolo: la stessa nei due gruppi, quindi scritta una volta sola. */
  const scheda = (film: FilmDto) => {
    const titolo = nomeFilm(film);
    const coda = partitaId ? chiaveCoda(partitaId, film.chiave) : film.chiave;
    const progresso = partitaId ? desiderati[coda] ?? film.progresso : film.progresso;
    const iniziato = progresso > 0;
    const completato = film.dove === 'cinema' ? iniziato : progresso >= film.totaleSessioni;
    const percentuale = film.dove === 'cinema' ? Number(iniziato) * 100 : Math.round((progresso / film.totaleSessioni) * 100);
    return <li key={film.chiave} className={`card relative flex min-w-0 flex-col gap-3 overflow-hidden ${completato ? 'border-success/50' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Il disco per i DVD, la pellicola per il cinema: la figura era la stessa per tutti e
            due, e sono due cose diverse — dove si guarda, quante sessioni, che prezzo. */}
        <IconaCategoria categoria={film.dove === 'dvd' ? 'dvd' : 'film'} dimensione={44} />
        <div className="min-w-0 flex-1"><h2 className="m-0 text-lg leading-tight">{titolo}</h2>{film.nomeIt && film.nomeIt !== film.nome && <p className="m-0 text-xs text-text-muted">{film.nome}</p>}<p className="m-0 text-xs text-text-secondary">{film.periodo}</p></div>
        <span className="flex flex-col items-end gap-1">
          <span className={`chip ${completato ? 'chip--attivo' : ''}`}>{completato ? 'Completato' : iniziato ? 'In corso' : film.dove === 'cinema' ? 'Da vedere' : 'Da iniziare'}</span>
          <ChipDisponibilita disponibilita={film.disponibilita ?? undefined} compatto />
        </span>
      </div>
      <div><div className="mb-1 flex justify-between text-xs text-text-secondary"><span>{film.dove === 'cinema' ? `${progresso} ${progresso === 1 ? 'visione' : 'visioni'}` : `${progresso} di ${film.totaleSessioni} sessioni`}</span><span>{film.dove === 'cinema' ? 'Cinema' : 'DVD'}</span></div><div className="visore-mappa__progresso" role="progressbar" aria-label={`Progresso ${titolo}`} aria-valuemin={0} aria-valuemax={film.dove === 'cinema' ? Math.max(1, progresso) : film.totaleSessioni} aria-valuenow={progresso}><span className="visore-mappa__progresso-barra" style={{ width: `${percentuale}%` }} /></div></div>
      {/* Due pulsanti larghi uguali: il gesto è la visione. In mezzo c'era «Completa», grande il
          triplo, per una cosa che «+» fa comunque — e che al cinema vuol dire una sola visione. */}
      {partitaId && <div className="grid grid-cols-2 gap-2" aria-label={`Avanzamento ${titolo}`}>
        <PulsanteVisivo tono="secondario" icona={<IconaAzione chiave="meno" dimensione={20} />} titolo="Togli" disabled={progresso === 0} onClick={() => accoda(film, progresso - 1)} aria-label={`Togli una ${film.dove === 'cinema' ? 'visione' : 'sessione'} a ${titolo}`} />
        <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo={film.dove === 'cinema' ? "Visione" : "Sessione"} disabled={film.dove === 'dvd' && progresso >= film.totaleSessioni} onClick={() => accoda(film, progresso + 1)} aria-label={`Aggiungi una ${film.dove === 'cinema' ? 'visione' : 'sessione'} a ${titolo}`} />
        {occupati[coda] && <span className="col-span-2 text-center text-xs text-text-muted" role="status">Salvataggio…</span>}
      </div>}
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm"><dt className="text-text-muted">Effetto</dt><dd className="m-0">{film.dote ? `${NOME_DOTE[film.dote]}${film.note ? ` ${'♪'.repeat(Math.min(4, film.note))}` : ''}` : 'Bonus speciale'}</dd>{film.prezzo !== null && <><dt className="text-text-muted">Prezzo</dt><dd className="m-0">{film.prezzo.toLocaleString('it-IT')} ¥</dd></>}</dl>
      {film.dettagli && <p className="m-0 text-xs text-text-secondary">{film.dettagli}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-ghost btn-sm touch" onClick={() => { setSelezionato(film.chiave); setPosizioneSelezionata(0); }} aria-label={`Mostra posizione di ${titolo}`}>Mostra posizione</button>
        <CorreggiElemento tipo="film" chiave={film.chiave} onSalvato={() => void dati.ricarica()} />
        <a href={film.fonte} target="_blank" rel="noreferrer" className="credito self-center">fonte</a>
      </div>
    </li>;
  };

  return <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
    {d && <div className="flex flex-col gap-4">
      <IntestazionePagina titolo="Film e DVD" sottotitolo={partitaId
        ? <>Registra sessioni e rivisioni nella partita «{attiva?.nome}». I contenuti collegati si sbloccano soltanto al completamento; un DVD richiede due sessioni.</>
        : <>Tutti i film al cinema e i DVD di Persona 5 Royal, con periodi, Doti e luoghi. Attiva una partita per registrarne le visioni.</>} />

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Riepilogo film e DVD">
        <div className="kpi-tile"><span className="kpi-value">{d.iniziati}</span><span className="kpi-label">titoli iniziati</span></div>
        <div className="kpi-tile"><span className="kpi-value">{d.completati}</span><span className="kpi-label">completati</span></div>
        <div className="kpi-tile"><span className="kpi-value">{d.sessioniCompletamentoFatte}/{d.sessioniObiettivo}</span><span className="kpi-label">sessioni obiettivo</span></div>
        <div className="kpi-tile"><span className="kpi-value">{d.visioniRegistrate}</span><span className="kpi-label">visioni registrate</span></div>
      </section>

      <section className="pannello-filtri grid gap-2 md:grid-cols-[minmax(220px,1fr)_auto_auto_auto]" aria-label="Filtri film e DVD">
        <input className="form-input" type="search" value={ricerca} onChange={(e) => setRicerca(e.target.value)} placeholder="Cerca titolo, periodo o luogo…" aria-label="Cerca film e DVD" />
        <select className="form-input" value={supporto} onChange={(e) => setSupporto(e.target.value as SupportoFiltro)} aria-label="Supporto"><option value="tutti">Cinema e DVD</option><option value="cinema">Solo cinema</option><option value="dvd">Solo DVD</option></select>
        <select className="form-input" value={stato} onChange={(e) => setStato(e.target.value as StatoFiltro)} aria-label="Stato visione"><option value="tutti">Tutti gli stati</option><option value="da-iniziare">Da iniziare</option><option value="in-corso">In corso</option><option value="completati">Completati</option></select>
        <select className="form-input" value={dote} onChange={(e) => setDote(e.target.value)} aria-label="Dote"><option value="">Tutte le Doti</option>{Object.entries(NOME_DOTE).map(([k, nome]) => <option key={k} value={k}>{nome}</option>)}</select>
      </section>

      {filmSelezionato && <section ref={pannelloRef} className="flex scroll-mt-20 flex-col gap-2" aria-label={`Posizione di ${nomeFilm(filmSelezionato)}`}>
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="m-0">Dove vedere “{nomeFilm(filmSelezionato)}”</h2><button type="button" className="btn btn-ghost btn-sm touch" onClick={() => setSelezionato(null)}>Chiudi</button></div>
        {filmSelezionato.posizioni.length > 1 && <div className="flex flex-wrap gap-2">{filmSelezionato.posizioni.map((p, i) => <button key={`${p.ruolo}/${p.tipo}/${p.chiave}`} type="button" className={`chip touch ${i === posizioneSelezionata ? 'chip--attivo' : ''}`} onClick={() => setPosizioneSelezionata(i)}>{p.ruolo === 'noleggio' ? 'Noleggio · ' : p.ruolo === 'visione' ? 'Visione · ' : ''}{p.etichetta}</button>)}</div>}
        {posizione ? <DoveSiTrova tipo={posizione.tipo} chiave={posizione.chiave} titolo={posizione.etichetta} altezza={300} /> : <div className="card"><h3 className="m-0 text-base">Posizione non disponibile</h3><p className="mb-0 text-sm text-text-secondary">Non esiste ancora un punto territoriale verificato per questo titolo.</p></div>}
      </section>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-sm text-text-secondary">{visibili.length} titoli mostrati{fatti.length > 0 ? ` · ${daFare.length} da vedere` : ''}</p>
        {/* Il catalogo si corregge mentre si gioca, e non solo nei Negozi: rilievo dell'utente. */}
        <AggiungiAlCatalogo tipo="film" titolo="Aggiungi un film o un DVD" onSalvato={() => void dati.ricarica()} />
      </div>
      <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2 xl:grid-cols-3" aria-label="Film e DVD da vedere">
        {daFare.map(scheda)}
      </ul>
      {daFare.length === 0 && <p className="m-0 text-sm text-text-muted" role="status">Nessun titolo da vedere con questi filtri.</p>}
      {/* I completati in un gruppo chiuso: in partita si guarda quel che manca. */}
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
