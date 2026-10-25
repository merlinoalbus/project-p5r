// ============================================================
// CatalogoDaCompletare — l'impaginazione comune di Libri e Film: riepilogo, filtri, posizione, da fare e completati
// ============================================================
//
// LibriPage e FilmPage avevano la stessa struttura scritta due volte (lotto C): intestazione, tessere del riepilogo, avvisi,
// filtri, pannello «Dove ottenere/vedere» con la mappa, la riga del conteggio con «Aggiungi», l'elenco da fare e i completati
// ripiegati dietro un pulsante. Qui c'è la struttura; le pagine passano i loro contenuti (la scheda di un elemento, i filtri,
// i testi) e tengono i loro dati. Con `soloChiave` (il pannello sopra il diario, R10-27) restano solo il pannello della
// posizione e l'elemento citato.
// ============================================================

import { useState, type ReactNode, type Ref } from 'react';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { TitoloSezione } from '../shared/TitoloSezione';
import { IconaAzione } from '../shared/IconaAzione';
import { DoveSiTrova } from '../mappe/DoveSiTrova';
import type { TipoAccessoMondo } from '../../../shared/accessoMondo';

interface Testi {
  /** Nome dell'elenco da fare (es. «Libri da leggere»). */
  elenco: string;
  /** Nome della sezione e dell'elenco dei completati. */
  sezioneFatti: string;
  elencoFatti: string;
  /** Frase quando non resta niente da fare con questi filtri, e quando l'elemento citato non c'è. */
  vuoto: string;
  vuotoSolo: string;
}

interface Props<T> {
  soloChiave?: string;
  intestazione: ReactNode;
  /** Le tessere del riepilogo (`TesseraKpi`) e il nome della sezione. */
  riepilogo: { etichetta: string; tessere: ReactNode };
  /** Note e avvisi fra il riepilogo e i filtri. */
  avvisi?: ReactNode;
  /** Il contenuto della sezione dei filtri e il suo nome. */
  filtri: { etichetta: string; contenuto: ReactNode };
  /** Il pannello della posizione dell'elemento scelto (`PannelloPosizione`), se ce n'è uno. */
  posizione?: ReactNode;
  /** «N libri mostrati · M da leggere» e il pulsante per aggiungere. */
  conteggio: string;
  aggiungi: ReactNode;
  daFare: T[];
  fatti: T[];
  scheda: (elemento: T) => ReactNode;
  testi: Testi;
}

/** La struttura di una pagina di catalogo da completare (Libri, Film e DVD). */
export function CatalogoDaCompletare<T>({ soloChiave, intestazione, riepilogo, avvisi, filtri, posizione, conteggio, aggiungi, daFare, fatti, scheda, testi }: Props<T>) {
  const [mostraFatti, setMostraFatti] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      {!soloChiave && <>
        {intestazione}
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={riepilogo.etichetta}>{riepilogo.tessere}</section>
        {avvisi}
        <section className="filtri-articoli" aria-label={filtri.etichetta}>{filtri.contenuto}</section>
      </>}

      {posizione}

      {!soloChiave && <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-sm text-text-secondary">{conteggio}</p>
        {aggiungi}
      </div>}
      {/* Da fare e completati separati, con i completati chiusi: in partita si guarda cosa manca. */}
      <ul className={`m-0 grid list-none gap-3 p-0 ${soloChiave ? '' : 'md:grid-cols-2 xl:grid-cols-3'}`} aria-label={testi.elenco}>
        {daFare.map(scheda)}
      </ul>
      {daFare.length === 0 && <p className="m-0 text-sm text-text-muted" role="status">{soloChiave ? testi.vuotoSolo : testi.vuoto}</p>}
      {fatti.length > 0 && <section className="flex flex-col gap-3" aria-label={testi.sezioneFatti}>
        <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="completati" dimensione={20} />}
          titolo={`${mostraFatti ? 'Nascondi' : 'Mostra'} i completati`} dettaglio={fatti.length}
          attivo={mostraFatti} aria-expanded={mostraFatti} onClick={() => setMostraFatti((v) => !v)} />
        {mostraFatti && <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2 xl:grid-cols-3" aria-label={testi.elencoFatti}>
          {fatti.map(scheda)}
        </ul>}
      </section>}
    </div>
  );
}

interface PropsPosizione {
  rif?: Ref<HTMLElement>;
  /** Il titolo visibile («Dove ottenere “…”») e il nome della regione. */
  titolo: ReactNode;
  etichetta: string;
  /** Il comando per correggere le posizioni (icona sola). */
  modifica: ReactNode;
  onChiudi: () => void;
  /** Le posizioni fra cui scegliere (le pastiglie compaiono da due in su). */
  scelte: Array<{ chiave: string; etichetta: ReactNode }>;
  indice: number;
  onIndice: (i: number) => void;
  /** La posizione scelta, o null se l'elemento non ne ha una sulla mappa. */
  posizione: { tipo: TipoAccessoMondo; chiave: string; etichetta: string } | null;
  /** La spiegazione quando non c'è una posizione. */
  assente: string;
}

/** Il pannello «Dove ottenere/vedere»: titolo con correzione e chiusura, la scelta della posizione e la mappa. */
export function PannelloPosizione({ rif, titolo, etichetta, modifica, onChiudi, scelte, indice, onIndice, posizione, assente }: PropsPosizione) {
  return (
    <section ref={rif} className="flex scroll-mt-20 flex-col gap-2" aria-label={etichetta}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TitoloSezione variante="display" className="min-w-0">{titolo}</TitoloSezione>
        <span className="flex items-center gap-1">{modifica}<PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="chiudi" dimensione={20} />} titolo="Chiudi" onClick={onChiudi} /></span>
      </div>
      {scelte.length > 1 && <div className="flex flex-wrap gap-2">{scelte.map((p, i) => <button key={p.chiave} type="button" className={`chip touch ${i === indice ? 'chip--attivo' : ''}`} onClick={() => onIndice(i)}>{p.etichetta}</button>)}</div>}
      {posizione
        ? <DoveSiTrova tipo={posizione.tipo} chiave={posizione.chiave} titolo={posizione.etichetta} altezza={300} />
        : <div className="card"><h3 className="m-0 text-base">Posizione non disponibile</h3><p className="mb-0 text-sm text-text-secondary">{assente}</p></div>}
    </section>
  );
}
