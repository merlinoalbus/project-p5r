// ============================================================
// LibriPage — catalogo Royal e avanzamento per sessioni
// ============================================================
//
// La scheda dice dove si compra (i negozi collegati, con il prezzo, e i luoghi), che cosa fa
// leggerlo (gli effetti dichiarati) e se in questa partita si può già leggere: con il libro non
// ancora disponibile il «+» resta spento e il motivo sta scritto sotto.
// ============================================================

import { Link } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Selettore } from '../components/shared/Selettore';
import { Segmenti } from '../components/shared/Segmenti';
import { CampoRicerca } from '../components/shared/CampoRicerca';
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
import { STATI_LETTURA, bloccata, formattaYen, haDote, motivoBlocco, passaStato, prezzoChip, type StatoLettura } from '../utils/letture';
import type { LibroDto, LibriDto } from '../types';

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
  const [stato, setStato] = useState<StatoLettura>('tutti');
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

  /** Le pressioni rapide si mettono in coda: una richiesta per volta insegue l'ultimo valore chiesto. */
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
      // Nella ricerca entra anche il testo «dove» della guida: per i libri senza negozio né posizione (premi, eventi) è l'unica indicazione.
      if (q && !`${l.nome} ${l.nomeIt ?? ''} ${l.negozi.map((n) => n.negozioNome).join(' ')} ${l.dove} ${l.effettiTesto.join(' ')}`.toLocaleLowerCase('it').includes(q)) return false;
      if (dote && !haDote(l.effetti, dote)) return false;
      return passaStato(stato, progresso, l.fatto);
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

  /** La scheda di un libro: la stessa nei due gruppi, scritta una volta sola. */
  const scheda = (libro: LibroDto) => {
    const coda = partitaId ? chiaveCoda(partitaId, libro.chiave) : libro.chiave;
    const progresso = partitaId ? desiderati[coda] ?? libro.progresso : libro.progresso;
    // «Lettura rapida» non tocca il libro stesso: è il pomeriggio che rende il doppio.
    const passo = d?.letturaRapida && libro.chiave !== 'lettura-rapida' ? 2 : 1;
    const percentuale = Math.round((progresso / libro.totaleSessioni) * 100);
    const titolo = libro.nomeIt ?? libro.nome;
    const nonAncora = bloccata(libro.disponibilita);
    // Dove si compra: i negozi collegati (con il prezzo) e i luoghi che non sono negozi.
    const negoziCollegati = new Set(libro.negozi.map((n) => n.negozio));
    const altrePosizioni = libro.posizioni.filter((p) => !(p.tipo === 'negozio' && negoziCollegati.has(p.chiave)));
    return <li key={libro.chiave} className={`card relative flex min-w-0 flex-col gap-3 overflow-hidden ${libro.fatto ? 'border-success/50' : ''}`}>
      <div className="flex items-start gap-3">
        <IconaCategoria categoria="libri" dimensione={44} />
        <div className="min-w-0 flex-1"><h2 className="m-0 text-lg leading-tight">{titolo}</h2></div>
        <span className="flex flex-col items-end gap-1">
          <span className={`chip ${libro.fatto ? 'chip--attivo' : ''}`}>{libro.fatto ? 'Completato' : progresso ? 'In corso' : 'Da leggere'}</span>
          <ChipDisponibilita disponibilita={libro.disponibilita ?? undefined} compatto />
        </span>
      </div>
      <div><div className="mb-1 flex justify-between text-xs text-text-secondary"><span>{progresso} di {libro.totaleSessioni} sessioni</span><span>{percentuale}%</span></div><div className="visore-mappa__progresso" role="progressbar" aria-label={`Progresso ${titolo}`} aria-valuemin={0} aria-valuemax={libro.totaleSessioni} aria-valuenow={progresso}><span className="visore-mappa__progresso-barra" style={{ width: `${percentuale}%` }} /></div></div>
      {/* Il gesto è la sessione: due pulsanti larghi uguali. Con il libro non ancora disponibile il
          «+» resta spento e il motivo sta sotto, così non si registra una lettura che il gioco non
          permette (il server la rifiuterebbe comunque). */}
      {partitaId && <div className="grid grid-cols-2 gap-2" aria-label={`Avanzamento ${titolo}`}>
        <PulsanteVisivo tono="secondario" icona={<IconaAzione chiave="meno" dimensione={20} />} titolo="Togli"
          disabled={progresso === 0} onClick={() => accoda(libro, Math.max(progresso - passo, 0))} aria-label={`Togli una sessione a ${titolo}`} />
        <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Sessione"
          disabled={progresso >= libro.totaleSessioni || (nonAncora && progresso === 0)} onClick={() => accoda(libro, Math.min(progresso + passo, libro.totaleSessioni))} aria-label={`Aggiungi una sessione a ${titolo}`} />
        {nonAncora && progresso === 0 && <p className="col-span-2 m-0 text-xs text-text-secondary" role="note">Non ancora leggibile: {motivoBlocco(libro.disponibilita)}</p>}
        {occupati[coda] && <span className="col-span-2 text-center text-xs text-text-muted" role="status">Salvataggio…</span>}
      </div>}
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
        <dt className="text-text-muted">Dove</dt>
        <dd className="m-0 flex flex-wrap gap-1">
          {libro.negozi.map((n) => <Link key={n.articolo} to={`/guida/negozi/${encodeURIComponent(n.negozio)}`} className="chip chip--attivo touch no-underline">{n.negozioNome}{prezzoChip(n.prezzo)}</Link>)}
          {altrePosizioni.map((p) => <span key={`${p.tipo}/${p.chiave}`} className="chip">{p.etichetta}</span>)}
          {libro.negozi.length === 0 && altrePosizioni.length === 0 && <span>{libro.dove || 'Non indicato'}</span>}
        </dd>
        <dt className="text-text-muted">Che cosa fa</dt>
        <dd className="m-0">{libro.effettiTesto.length ? libro.effettiTesto.join(' · ') : 'Nessun effetto dichiarato'}</dd>
        {/* Il luogo sbloccato è un riferimento, quindi ci si va. */}
        {libro.sbloccaLuogo && <><dt className="text-text-muted">Apre</dt><dd className="m-0"><Link to={`/guida/citta/${libro.sbloccaLuogo}`}>{libro.sbloccaLuogoNome ?? libro.sbloccaLuogo}</Link></dd></>}
        {libro.negozi.length === 0 && libro.prezzo !== null && <><dt className="text-text-muted">Prezzo</dt><dd className="m-0">{libro.prezzo === 0 ? 'Gratis' : formattaYen(libro.prezzo)}</dd></>}
      </dl>
      {libro.dettagli && <p className="m-0 text-xs text-text-secondary">{libro.dettagli}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-2">
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="posizione" dimensione={20} />} titolo="Mostra posizione"
          onClick={() => { setSelezionato(libro.chiave); setFonteSelezionata(0); }} />
        <CorreggiElemento tipo="libro" chiave={libro.chiave} onSalvato={() => void dati.ricarica()} />
      </div>
    </li>;
  };

  return <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
    {d && <div className="flex flex-col gap-4">
      <IntestazionePagina titolo="Libri" sottotitolo={partitaId
        ? <>Segna ogni sessione letta nella partita «{attiva?.nome}». Gli effetti si applicano quando il volume è completato.</>
        : <>I {d.libri.length} libri di Persona 5 Royal, con sessioni, effetti e dove si comprano. Attiva una partita per registrarne l’avanzamento.</>} />

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Riepilogo lettura">
        <div className="kpi-tile"><span className="kpi-value">{d.completati}</span><span className="kpi-label kpi-label--segno"><IconaSegno chiave="completati" />completati</span></div>
        <div className="kpi-tile"><span className="kpi-value">{d.libri.length - d.completati}</span><span className="kpi-label kpi-label--segno"><IconaSegno chiave="iniziati" />da completare</span></div>
        <div className="kpi-tile"><span className="kpi-value">{d.sessioniFatte}</span><span className="kpi-label kpi-label--segno"><IconaSegno chiave="sessioni" />sessioni fatte</span></div>
        <div className="kpi-tile"><span className="kpi-value">{d.sessioniTotali}</span><span className="kpi-label kpi-label--segno"><IconaSegno chiave="sessioni" />sessioni totali</span></div>
      </section>

      {partitaId && <NotaPuntiDote cosa="quali libri hai letto e a che punto sei" />}

      {d.letturaRapida && (
        <p className="m-0 flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-[13px] text-text-secondary" role="status">
          <IconaAzione chiave="libro" dimensione={18} />
          <span>Hai letto <strong>Lettura rapida</strong>: da qui in avanti una sessione di lettura vale doppia, quindi
          ogni altro libro si finisce in metà pomeriggi. Le sessioni già fatte restano quelle che erano —
          l’effetto non è retroattivo — e «+» avanza di due per volta.</span>
        </p>
      )}

      <section className="filtri-articoli" aria-label="Filtri libri">
        <div className="filtri-articoli__riga">
          <CampoRicerca valore={ricerca} onCambia={setRicerca} segnaposto="Cerca titolo, negozio o effetto…" />
          <Selettore compatto etichetta="Dote" valore={dote} vuoto="Tutte le Doti" opzioni={opzioniDaNomi(NOME_DOTE)} onCambia={setDote} />
        </div>
        <div className="filtri-articoli__riga">
          <Segmenti etichetta="Stato lettura" valore={stato} opzioni={STATI_LETTURA} onCambia={setStato} />
        </div>
      </section>

      {libroSelezionato && <section ref={pannelloRef} className="flex scroll-mt-20 flex-col gap-2" aria-label={`Posizione di ${libroSelezionato.nomeIt ?? libroSelezionato.nome}`}>
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="m-0">Dove ottenere “{libroSelezionato.nomeIt ?? libroSelezionato.nome}”</h2><button type="button" className="btn btn-ghost btn-sm touch" onClick={() => setSelezionato(null)}>Chiudi</button></div>
        {libroSelezionato.posizioni.length > 1 && <div className="flex flex-wrap gap-2">{libroSelezionato.posizioni.map((p, i) => <button key={`${p.tipo}/${p.chiave}`} type="button" className={`chip touch ${i === fonteSelezionata ? 'chip--attivo' : ''}`} onClick={() => setFonteSelezionata(i)}>{p.etichetta}</button>)}</div>}
        {posizione ? <DoveSiTrova tipo={posizione.tipo} chiave={posizione.chiave} titolo={posizione.etichetta} altezza={300} /> : <div className="card"><h3 className="m-0 text-base">Posizione non disponibile</h3><p className="mb-0 text-sm text-text-secondary">Questo libro si ottiene come ricompensa o evento e non ha un punto territoriale verificato.</p></div>}
      </section>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-sm text-text-secondary">{visibili.length} libri mostrati{fatti.length > 0 ? ` · ${daFare.length} da leggere` : ''}</p>
        <AggiungiAlCatalogo tipo="libro" titolo="Aggiungi un libro" onSalvato={() => void dati.ricarica()} />
      </div>
      {/* Da leggere e completati separati, con i completati chiusi: in partita si guarda cosa manca. */}
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
