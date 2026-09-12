// ============================================================
// LibriPage — catalogo Royal e avanzamento per sessioni
// ============================================================

import { Link } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Selettore } from '../components/shared/Selettore';
import { opzioniDaNomi } from '../utils/selettore';
import { getLibri, impostaProgressoLibro } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import { PulsanteVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione, IconaSegno } from '../components/shared/IconaAzione';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { NotaPuntiDote } from '../components/shared/NotaPuntiDote';
import { DoveSiTrova } from '../components/mappe/DoveSiTrova';
import { AggiungiAlCatalogo, CorreggiElemento } from '../components/guida/AzioniCatalogo';
import { IconaCategoria } from '../components/guida/IconaCategoria';
import { ChipDisponibilita } from '../components/guida/ChipDisponibilita';
import { NOME_DOTE } from '../utils/citta';
import type { LibroDto, LibriDto } from '../types';

type StatoFiltro = 'tutti' | 'da-iniziare' | 'in-corso' | 'completati';

const chiaveCoda = (partitaId: number, libroChiave: string) => `${partitaId}:${libroChiave}`;

export function LibriPage() {
  useDocumentTitle('Libri');
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  const partitaIdRef = useRef(partitaId);
  useEffect(() => { partitaIdRef.current = partitaId; }, [partitaId]);
  const dati = useCarica(() => getLibri(partitaId ?? undefined), [partitaId]);
  const datiRef = useRef<LibriDto | null>(null);
  useEffect(() => { datiRef.current = dati.dati; }, [dati.dati]);
  const [ricerca, setRicerca] = useState('');
  const [stato, setStato] = useState<StatoFiltro>('tutti');
  const [dote, setDote] = useState('');
  const [selezionato, setSelezionato] = useState<string | null>(null);
  const [mostraFatti, setMostraFatti] = useState(false);
  const [fonteSelezionata, setFonteSelezionata] = useState(0);
  const [desiderati, setDesiderati] = useState<Record<string, number>>({});
  const [occupati, setOccupati] = useState<Record<string, boolean>>({});
  const pannelloRef = useRef<HTMLElement | null>(null);
  const desideratiRef = useRef(new Map<string, number>());
  const confermatiRef = useRef(new Map<string, number>());
  const inVoloRef = useRef(new Set<string>());

  const sostituisciLibro = (libro: LibroDto) => {
    const correnti = datiRef.current;
    if (!correnti) return;
    const nuovi = {
      ...correnti,
      libri: correnti.libri.map((l) => l.chiave === libro.chiave ? libro : l),
      completati: correnti.libri.reduce((n, l) => n + (l.chiave === libro.chiave ? Number(libro.fatto) : Number(l.fatto)), 0),
      sessioniFatte: correnti.libri.reduce((n, l) => n + (l.chiave === libro.chiave ? libro.progresso : l.progresso), 0),
    };
    datiRef.current = nuovi;
    dati.imposta(nuovi);
  };

  const eseguiCoda = async (libro: LibroDto) => {
    if (!partitaId) return;
    const partitaCorrente = partitaId;
    const coda = chiaveCoda(partitaCorrente, libro.chiave);
    if (inVoloRef.current.has(coda)) return;
    inVoloRef.current.add(coda);
    confermatiRef.current.set(coda, libro.progresso);
    setOccupati((x) => ({ ...x, [coda]: true }));
    try {
      while (true) {
        const confermato = confermatiRef.current.get(coda) ?? libro.progresso;
        const desiderato = desideratiRef.current.get(coda) ?? confermato;
        if (desiderato === confermato || partitaIdRef.current !== partitaCorrente) break;
        const aggiornato = await impostaProgressoLibro(partitaCorrente, libro.chiave, desiderato);
        confermatiRef.current.set(coda, aggiornato.progresso);
        if (partitaIdRef.current === partitaCorrente) sostituisciLibro(aggiornato);
      }
    } catch (err) {
      const confermato = confermatiRef.current.get(coda) ?? libro.progresso;
      desideratiRef.current.set(coda, confermato);
      setDesiderati((x) => ({ ...x, [coda]: confermato }));
      if (partitaIdRef.current === partitaCorrente) notifica('error', err instanceof Error ? err.message : 'Aggiornamento del libro fallito.');
    } finally {
      inVoloRef.current.delete(coda);
      setOccupati((x) => ({ ...x, [coda]: false }));
    }
  };

  const accoda = (libro: LibroDto, valore: number) => {
    if (!partitaId) return;
    const desiderato = Math.min(Math.max(valore, 0), libro.totaleSessioni);
    const coda = chiaveCoda(partitaId, libro.chiave);
    desideratiRef.current.set(coda, desiderato);
    setDesiderati((x) => ({ ...x, [coda]: desiderato }));
    void eseguiCoda(libro);
  };

  const visibili = useMemo(() => {
    const q = ricerca.trim().toLocaleLowerCase('it');
    return (dati.dati?.libri ?? []).filter((l) => {
      const progresso = partitaId ? desiderati[chiaveCoda(partitaId, l.chiave)] ?? l.progresso : l.progresso;
      if (q && !`${l.nome} ${l.nomeIt ?? ''} ${l.dove} ${l.sblocca ?? ''}`.toLocaleLowerCase('it').includes(q)) return false;
      if (dote && l.dote !== dote) return false;
      if (stato === 'da-iniziare' && progresso !== 0) return false;
      if (stato === 'in-corso' && (progresso === 0 || l.fatto)) return false;
      if (stato === 'completati' && !l.fatto) return false;
      return true;
    });
  }, [dati.dati, desiderati, ricerca, stato, dote, partitaId]);

  const libroSelezionato = dati.dati?.libri.find((l) => l.chiave === selezionato) ?? null;
  const posizione = libroSelezionato?.posizioni[fonteSelezionata] ?? null;
  useEffect(() => {
    if (libroSelezionato) pannelloRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [libroSelezionato]);
  const d = dati.dati;
  const daFare = visibili.filter((l) => !l.fatto);
  const fatti = visibili.filter((l) => l.fatto);

  /** La scheda di un libro. È la stessa nei due gruppi — da leggere e completati — quindi sta
   *  scritta una volta sola. */
  const scheda = (libro: LibroDto) => {
    const coda = partitaId ? chiaveCoda(partitaId, libro.chiave) : libro.chiave;
    const progresso = partitaId ? desiderati[coda] ?? libro.progresso : libro.progresso;
    // «Lettura rapida» non tocca il libro stesso: è il pomeriggio che rende il doppio, e quel
    // pomeriggio lo si spende sugli altri.
    const passo = d?.letturaRapida && libro.chiave !== 'lettura-rapida' ? 2 : 1;
    const percentuale = Math.round((progresso / libro.totaleSessioni) * 100);
    const titolo = libro.nomeIt ?? libro.nome;
    return <li key={libro.chiave} className={`card relative flex min-w-0 flex-col gap-3 overflow-hidden ${libro.fatto ? 'border-success/50' : ''}`}>
      <div className="flex items-start gap-3">
        {/* La stessa icona di categoria di Film e Videogiochi, non un quadrato rosso col libretto
            disegnato a mano: era l'unica delle tre pagine sorelle a non passare da `IconaCategoria`,
            quindi la grafica di Codex non poteva sostituirla nemmeno quando arriva. */}
        <IconaCategoria categoria="libri" dimensione={44} />
        <div className="min-w-0 flex-1"><h2 className="m-0 text-lg leading-tight">{titolo}</h2>{libro.nomeIt && libro.nomeIt !== libro.nome && <p className="m-0 text-xs text-text-muted">{libro.nome}</p>}</div>
        <span className="flex flex-col items-end gap-1">
          <span className={`chip ${libro.fatto ? 'chip--attivo' : ''}`}>{libro.fatto ? 'Completato' : progresso ? 'In corso' : 'Da leggere'}</span>
          {/* «Dal 18 aprile» era prosa che nessuno leggeva: adesso e' una regola, e la scheda dice
              se il libro in questa partita si puo' gia' comprare. */}
          <ChipDisponibilita disponibilita={libro.disponibilita ?? undefined} compatto />
        </span>
      </div>
      <div><div className="mb-1 flex justify-between text-xs text-text-secondary"><span>{progresso} di {libro.totaleSessioni} sessioni</span><span>{percentuale}%</span></div><div className="visore-mappa__progresso" role="progressbar" aria-label={`Progresso ${titolo}`} aria-valuemin={0} aria-valuemax={libro.totaleSessioni} aria-valuenow={progresso}><span className="visore-mappa__progresso-barra" style={{ width: `${percentuale}%` }} /></div></div>
      {/* **Il gesto è la sessione**, e sono i due pulsanti larghi uguali. In mezzo ci stava
          «Completa», grande il triplo di «+» e «−»: prendeva il posto del gesto che si fa a ogni
          lettura per farne uno che si fa una volta e che «+» fa comunque in due tocchi. Con
          quattro sessioni al massimo, non serviva. */}
      {partitaId && <div className="grid grid-cols-2 gap-2" aria-label={`Avanzamento ${titolo}`}>
        {/* Il passo è quanto rende **un pomeriggio**, e da quando «Lettura rapida» è letto un
            pomeriggio rende il doppio. Il requisito del libro non si muove: quel che cambia è che
            ci arrivi in metà delle volte. Il tetto resta il totale, così l'ultimo tocco su un
            libro da tre fermo a due lo chiude senza sforare. */}
        <PulsanteVisivo tono="secondario" icona={<IconaAzione chiave="meno" dimensione={20} />} titolo="Togli"
          disabled={progresso === 0} onClick={() => accoda(libro, Math.max(progresso - passo, 0))} aria-label={`Togli una sessione a ${titolo}`} />
        <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Sessione"
          disabled={progresso >= libro.totaleSessioni} onClick={() => accoda(libro, Math.min(progresso + passo, libro.totaleSessioni))} aria-label={`Aggiungi una sessione a ${titolo}`} />
        {occupati[coda] && <span className="col-span-2 text-center text-xs text-text-muted" role="status">Salvataggio…</span>}
      </div>}
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm"><dt className="text-text-muted">Dove</dt><dd className="m-0">{libro.dove}</dd><dt className="text-text-muted">Effetto</dt><dd className="m-0">{libro.sblocca ?? (libro.dote ? `${NOME_DOTE[libro.dote]}${libro.note ? ` ${'♪'.repeat(Math.min(4, libro.note))}` : ''}` : 'Bonus speciale')}</dd>
        {/* **Il luogo sbloccato e' un riferimento, quindi ci si va.** Prima era una frase dentro
            «Effetto» — «Sblocca scorciatoie a Yongen-Jaya» — che diceva dove andare senza portarti. */}
        {libro.sbloccaLuogo && <><dt className="text-text-muted">Apre</dt><dd className="m-0"><Link to={`/guida/citta/${libro.sbloccaLuogo}`}>{libro.sbloccaLuogoNome ?? libro.sbloccaLuogo}</Link></dd></>}{libro.prezzo !== null && <><dt className="text-text-muted">Prezzo</dt><dd className="m-0">{libro.prezzo === 0 ? 'Gratis' : `${libro.prezzo.toLocaleString('it-IT')} ¥`}</dd></>}</dl>
      {libro.dettagli && <p className="m-0 text-xs text-text-secondary">{libro.dettagli}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-2">
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="posizione" dimensione={20} />} titolo="Mostra posizione"
          onClick={() => { setSelezionato(libro.chiave); setFonteSelezionata(0); }} />
        <CorreggiElemento tipo="libro" chiave={libro.chiave} onSalvato={() => void dati.ricarica()} />
        <a href={libro.fonte} target="_blank" rel="noreferrer" className="credito self-center">fonte</a>
      </div>
    </li>;
  };

  return <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
    {d && <div className="flex flex-col gap-4">
      <IntestazionePagina titolo="Libri" sottotitolo={partitaId
        ? <>Segna ogni sessione letta nella partita «{attiva?.nome}». Bonus e luoghi si sbloccano soltanto quando il volume è completato.</>
        : <>Tutti i 46 libri di Persona 5 Royal, con sessioni, benefici e provenienza. Attiva una partita per registrarne l’avanzamento.</>} />

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Riepilogo lettura">
        <div className="kpi-tile"><span className="kpi-value">{d.completati}</span><span className="kpi-label kpi-label--segno"><IconaSegno chiave="completati" />completati</span></div>
        <div className="kpi-tile"><span className="kpi-value">{d.libri.length - d.completati}</span><span className="kpi-label kpi-label--segno"><IconaSegno chiave="iniziati" />da completare</span></div>
        <div className="kpi-tile"><span className="kpi-value">{d.sessioniFatte}</span><span className="kpi-label kpi-label--segno"><IconaSegno chiave="sessioni" />sessioni fatte</span></div>
        <div className="kpi-tile"><span className="kpi-value">{d.sessioniTotali}</span><span className="kpi-label kpi-label--segno"><IconaSegno chiave="sessioni" />sessioni totali</span></div>
      </section>

      {partitaId && <NotaPuntiDote cosa="quali libri hai letto e a che punto sei" />}

      {/* Senza questa riga i numeri calerebbero da soli fra una visita e l'altra — un libro da tre
          sessioni che all'improvviso ne chiede due — e sembrerebbe un errore dell'app invece che
          l'effetto di un libro che hai letto tu. */}
      {d.letturaRapida && (
        <p className="m-0 flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-[13px] text-text-secondary" role="status">
          <IconaAzione chiave="libro" dimensione={18} />
          <span>Hai letto <strong>Lettura rapida</strong>: da qui in avanti una sessione di lettura vale doppia, quindi
          ogni altro libro si finisce in metà pomeriggi. Le sessioni già fatte restano quelle che erano —
          l’effetto non è retroattivo — e «+» avanza di due per volta.</span>
        </p>
      )}

      <section className="pannello-filtri grid gap-2 md:grid-cols-[minmax(220px,1fr)_auto_auto]" aria-label="Filtri libri">
        <input className="form-input" type="search" value={ricerca} onChange={(e) => setRicerca(e.target.value)} placeholder="Cerca titolo, luogo o beneficio…" aria-label="Cerca libri" />
        <Selettore etichetta="Stato lettura" valore={stato} opzioni={[{ chiave: 'tutti', nome: 'Tutti gli stati' }, { chiave: 'da-iniziare', nome: 'Da iniziare' }, { chiave: 'in-corso', nome: 'In corso' }, { chiave: 'completati', nome: 'Completati' }]} onCambia={(k) => setStato(k as StatoFiltro)} />
        <Selettore etichetta="Dote" valore={dote} vuoto="Tutte le Doti" opzioni={opzioniDaNomi(NOME_DOTE)} onCambia={setDote} />
      </section>

      {libroSelezionato && <section ref={pannelloRef} className="flex scroll-mt-20 flex-col gap-2" aria-label={`Posizione di ${libroSelezionato.nomeIt ?? libroSelezionato.nome}`}>
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="m-0">Dove ottenere “{libroSelezionato.nomeIt ?? libroSelezionato.nome}”</h2><button type="button" className="btn btn-ghost btn-sm touch" onClick={() => setSelezionato(null)}>Chiudi</button></div>
        {libroSelezionato.posizioni.length > 1 && <div className="flex flex-wrap gap-2">{libroSelezionato.posizioni.map((p, i) => <button key={`${p.tipo}/${p.chiave}`} type="button" className={`chip touch ${i === fonteSelezionata ? 'chip--attivo' : ''}`} onClick={() => setFonteSelezionata(i)}>{p.etichetta}</button>)}</div>}
        {posizione ? <DoveSiTrova tipo={posizione.tipo} chiave={posizione.chiave} titolo={posizione.etichetta} altezza={300} /> : <div className="card"><h3 className="m-0 text-base">Posizione non disponibile</h3><p className="mb-0 text-sm text-text-secondary">Questo libro si ottiene come ricompensa o evento e non ha un punto territoriale verificato.</p></div>}
      </section>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-sm text-text-secondary">{visibili.length} libri mostrati{fatti.length > 0 ? ` · ${daFare.length} da leggere` : ''}</p>
        {/* Il catalogo si corregge mentre si gioca: quello che aggiungi qui resta anche quando i
            dati della guida vengono aggiornati. C'era solo nei Negozi. */}
        <AggiungiAlCatalogo tipo="libro" titolo="Aggiungi un libro" onSalvato={() => void dati.ricarica()} />
      </div>
      {/* Da leggere e completati **separati**, con i completati chiusi: in partita si guarda cosa
          manca, e un libro finito in mezzo agli altri è rumore che si legge ogni volta. */}
      <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2 xl:grid-cols-3" aria-label="Libri da leggere">
        {daFare.map(scheda)}
      </ul>
      {daFare.length === 0 && <p className="m-0 text-sm text-text-muted" role="status">Nessun libro da leggere con questi filtri.</p>}
      {fatti.length > 0 && <section className="flex flex-col gap-3" aria-label="Libri completati">
        <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="completati" dimensione={20} />}
          titolo={`${mostraFatti ? 'Nascondi' : 'Mostra'} i completati`} dettaglio={fatti.length}
          attivo={mostraFatti} onClick={() => setMostraFatti((v) => !v)} />
        {mostraFatti && <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2 xl:grid-cols-3" aria-label="Libri già completati">
          {fatti.map(scheda)}
        </ul>}
      </section>}
    </div>}
  </PageState>;
}
