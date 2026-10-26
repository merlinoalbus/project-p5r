// ============================================================
// VideogiochiPage — i giochi retro, i round, che cosa alzano e dove si comprano
// ============================================================
//
// **I completati stanno in un gruppo a parte**, chiuso finché non si apre: in una lista sola i
// finiti e i da fare si mescolano, e per sapere quanto manca bisogna contarli a occhio.
// La scheda dice che cosa alza il gioco (gli effetti dichiarati), dove si compra (gli articoli
// collegati) e se in questa partita si può già giocare: se no il «+» resta spento con il motivo.
// ============================================================

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getVideogiochi } from '../services/api';
import { usePartitaStore } from '../stores/partitaStore';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PageState } from '../components/shared/PageState';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { NotaPuntiDote } from '../components/shared/NotaPuntiDote';
import { CampoRicerca } from '../components/shared/CampoRicerca';
import { IconaCategoria } from '../components/guida/IconaCategoria';
import { AssetImg } from '../components/shared/AssetImg';
import { ChipDisponibilita } from '../components/guida/ChipDisponibilita';
import { ComandiVideogioco } from '../components/guida/ComandiVideogioco';
import { AggiungiAlCatalogo, CorreggiElemento } from '../components/guida/AzioniCatalogo';
import { ModificaGuida } from '../components/guida/ModificaGuida';
import { DoveSiTrova } from '../components/mappe/DoveSiTrova';
import { PulsanteVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione, IconaSegno, type ChiaveSegno } from '../components/shared/IconaAzione';
import { formattaYen, prezzoChip } from '../utils/letture';
import type { VideogiocoDto } from '../types';
import { TitoloSezione } from '../components/shared/TitoloSezione';
import { TestoNote } from '../components/shared/TestoNote';

/** Un numero di riepilogo in una carta: il valore in grande e sotto l'etichetta col suo segno. */
function Numero({ valore, etichetta, segno }: { valore: number | string; etichetta: string; segno: ChiaveSegno }) {
  return (
    <span className="card flex flex-col gap-0.5 px-3 py-2">
      <span className="font-display testo-20 leading-none tabular-nums">{valore}</span>
      <span className="flex items-center gap-1.5 testo-12 uppercase tracking-[0.08em] text-text-muted"><IconaSegno chiave={segno} dimensione={14} />{etichetta}</span>
    </span>
  );
}

/**
 * La scheda di un videogioco: illustrazione (o icona dei minigiochi), nome, sede, stato,
 * disponibilità, barra dei round fatti sul totale. Con una partita offre «Togli» e «Round» (il
 * secondo spento a gioco finito o finché non è disponibile, con il motivo sotto) e il segno di
 * salvataggio in corso; poi effetti, negozi che lo vendono o costo, dettagli, posizione e correzione.
 */
function Scheda({ g, partitaId, onSalvata, onCorretto, onPosizione }: { g: VideogiocoDto; partitaId: number | null; onSalvata: (g: VideogiocoDto) => void; onCorretto: () => void; onPosizione: () => void }) {
  return (
    <li className={`card relative flex min-w-0 flex-col gap-3 overflow-hidden ${g.fatto ? 'border-success/50' : ''}`}>
      {/* `flex-wrap` e base minima del testo: il cartellino «Non ancora» con il collegamento «Segna in Progressi» occupa ~217 px senza poter
          stringersi e lasciava al nome della sede 2 px (una lettera per riga, tagliata dalla scheda, 14 casi a 375, 768 e 1280 px);
          ora, se accanto non c'è posto per almeno 9 rem di testo, i cartellini vanno sotto, allineati a destra */}
      <div className="flex flex-wrap items-start gap-3">
        {/* L'illustrazione del gioco (`attivita/<chiave>`, la stessa della pagina delle attività); finché non c'è, l'icona dei
            videogiochi. Prima c'era sempre l'icona: le sette illustrazioni consegnate non si sarebbero viste da nessuna parte. */}
        <AssetImg nome={`attivita/${g.chiave}`} alt="" decorativa className="shrink-0 rounded-md object-contain" style={{ width: 56, height: 56 }}
          fallback={<span className="shrink-0"><IconaCategoria categoria="minigiochi" dimensione={44} /></span>} />
        <div className="min-w-0 flex-[1_1_9rem]">
          <h3 className="m-0 text-lg leading-tight">{g.catalogo ? <Link className="touch inline-flex items-center" to={g.catalogo.casa}>{g.nome}</Link> : g.nome}</h3>
          <p className="m-0 text-xs text-text-secondary">{g.sedeNome ?? g.luogo}</p>
          {g.orariSedeTesto && <p className="m-0 text-xs text-text-secondary">Orari della sede: {g.orariSedeTesto}</p>}
        </div>
        <span className="ml-auto flex max-w-full flex-col items-end gap-1">
          <span className={`chip ${g.fatto ? 'chip--attivo' : ''}`}>{g.fatto ? 'Completato' : g.iniziato ? 'In corso' : 'Da giocare'}</span>
          <ChipDisponibilita disponibilita={g.disponibilita ?? undefined} compatto />
        </span>
      </div>

      <ComandiVideogioco key={`${partitaId}:${g.chiave}`} gioco={g} partitaId={partitaId} onSalvata={onSalvata} />

      <dl className="dl-scheda m-0 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
        <dt className="text-text-muted">Che cosa fa</dt>
        <dd className="m-0">{g.effettiTesto.length ? <TestoNote testo={g.effettiTesto.join(' · ')} /> : 'Nessun effetto dichiarato'}</dd>
        {g.negozi.length > 0 && <><dt className="text-text-muted">In vendita da</dt><dd className="m-0 flex flex-wrap gap-1">{g.negozi.map((n) => <Link key={n.articolo} to={`/guida/negozi/${encodeURIComponent(n.negozio)}`} className="chip chip--attivo touch no-underline">{n.negozioNome}{prezzoChip(n.prezzo)}</Link>)}</dd></>}
        {g.negozi.length === 0 && g.costo !== null && g.costo > 0 && <><dt className="text-text-muted">Costo</dt><dd className="m-0">{formattaYen(g.costo)}</dd></>}
      </dl>
      {g.notaPrezzo && <p className="m-0 text-xs text-text-secondary">{g.notaPrezzo}</p>}
      {g.dettagli && <p className="m-0 whitespace-pre-line text-xs text-text-secondary"><TestoNote testo={g.dettagli} daParole="conteggi" /></p>}
      <div className="mt-auto flex flex-wrap items-center gap-2">
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="posizione" dimensione={20} />}
          titolo="Mostra posizione" onClick={onPosizione} aria-label={`Mostra posizione di ${g.nome}`} />
        <CorreggiElemento tipo="videogioco" chiave={g.chiave} onSalvato={onCorretto} />
      </div>
    </li>
  );
}

/**
 * Pagina dei videogiochi: carica i giochi per la partita attiva, mostra conteggi, ricerca e schede
 * divise fra da giocare e completati. I comandi condivisi con il Catalogo distinguono sessioni e
 * round, serializzando le scritture per partita e titolo; la mappa si apre sopra gli elenchi.
 */
export function VideogiochiPage() {
  useDocumentTitle('Videogiochi');
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  const dati = useCarica(() => getVideogiochi(partitaId ?? undefined), [partitaId]);
  const [ricerca, setRicerca] = useState('');
  const [mostraFatti, setMostraFatti] = useState(false);
  const [selezionato, setSelezionato] = useState<string | null>(null);
  // i giochi sono quelli dei dati della pagina (niente copia locale da riallineare con un effetto)
  const giochi = useMemo(() => dati.dati?.videogiochi ?? [], [dati.dati]);

  const salvaGioco = (nuovo: VideogiocoDto) => dati.imposta((correnti) => ({ ...correnti, videogiochi: correnti.videogiochi.map((x) => (x.chiave === nuovo.chiave ? nuovo : x)) }));

  const q = ricerca.trim().toLocaleLowerCase('it');
  const visibili = useMemo(() => giochi.filter((g) => !q || `${g.nome} ${(g.nomiAltri ?? []).join(' ')} ${g.sedeNome ?? ''} ${g.luogo} ${g.effettiTesto.join(' ')}`.toLocaleLowerCase('it').includes(q)), [giochi, q]);
  const daFare = visibili.filter((g) => !g.fatto);
  const fatti = visibili.filter((g) => g.fatto);
  const roundFatti = giochi.reduce((s, g) => s + g.progresso, 0);
  const roundTotali = giochi.reduce((s, g) => s + g.totaleRound, 0);
  const scelto = giochi.find((g) => g.chiave === selezionato) ?? null;
  const notaComune = dati.dati?.noteCategorie?.videogioco ?? '';

  // Le stesse colonne di Libri e Film: due da tablet in su, tre su desktop largo.
  const griglia = 'm-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2 xl:grid-cols-3';

  return (
    <PageState isLoading={dati.caricamento && !dati.dati} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {dati.dati && (
        <div className="flex flex-col gap-4">
          <IntestazionePagina titolo="Videogiochi"
            sottotitolo={`Sessioni giocate e round completati sono distinti. Il completamento del titolo dà gli effetti dichiarati.${partitaId ? ` Nella partita «${attiva?.nome}».` : ' Attiva una partita per segnare sessioni e round.'}`} />

          <div className="flex flex-wrap gap-2">
            <Numero valore={giochi.length} etichetta="Giochi" segno="iniziati" />
            <Numero valore={giochi.filter((g) => g.fatto).length} etichetta="Completati" segno="completati" />
            <Numero valore={`${roundFatti}/${roundTotali}`} etichetta="Round" segno="round" />
          </div>

          {/* La frase comune ai sette giochi (R9-14/1) sta una volta sola in `dati_guida` e si mostra qui, in testa alla categoria; la matita resta anche
              se la frase è vuota, così si può riscrivere o rimettere quella della guida. */}
          <section className="card flex flex-col gap-1" aria-label="Nota comune ai videogiochi">
            <div className="flex items-start gap-2">
              <p className="m-0 min-w-0 flex-1 whitespace-pre-line text-sm text-text-secondary">{notaComune || 'Nessuna nota comune ai videogiochi.'}</p>
              <ModificaGuida tipo="note-categorie-attivita" chiave="note-categorie-attivita" cosa="la nota comune ai videogiochi" soloIcona onSalvato={() => void dati.ricarica()} />
            </div>
          </section>

          {partitaId && <NotaPuntiDote cosa="quali giochi hai finito e a che round sei" />}

          <div className="filtri-articoli__riga">
            <CampoRicerca valore={ricerca} onCambia={setRicerca} segnaposto="Cerca per nome, luogo o effetto…" />
            <AggiungiAlCatalogo tipo="videogioco" titolo="Aggiungi un videogioco" onSalvato={() => void dati.ricarica()} />
          </div>

          {scelto && (
            <section className="flex flex-col gap-2" aria-label={`Posizione di ${scelto.nome}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <TitoloSezione variante="display">Dove si gioca a «{scelto.nome}»</TitoloSezione>
                <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="chiudi" dimensione={20} />} titolo="Chiudi" onClick={() => setSelezionato(null)} />
              </div>
              <DoveSiTrova tipo="attivita" chiave={scelto.chiave} titolo={scelto.nome} altezza={300} />
            </section>
          )}

          <section className="flex flex-col gap-2" aria-label="Da giocare">
            <TitoloSezione variante="display">Da giocare · {daFare.length}</TitoloSezione>
            {daFare.length === 0
              ? <p className="m-0 testo-13 text-text-muted" role="status">{giochi.length === 0 ? 'Nessun gioco nel catalogo.' : q ? 'Nessun gioco da fare con questo testo.' : 'Finiti tutti.'}</p>
              : <ul className={griglia} aria-label="Videogiochi da giocare">
                  {daFare.map((g) => <Scheda key={`${partitaId}:${g.chiave}`} g={g} partitaId={partitaId} onSalvata={salvaGioco} onCorretto={() => void dati.ricarica()} onPosizione={() => setSelezionato(g.chiave)} />)}
                </ul>}
          </section>

          {fatti.length > 0 && (
            <section className="flex flex-col gap-2" aria-label="Completati">
              <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="completati" dimensione={20} />}
                titolo={`${mostraFatti ? 'Nascondi' : 'Mostra'} i completati`} dettaglio={fatti.length} aria-expanded={mostraFatti} onClick={() => setMostraFatti((v) => !v)} />
              {mostraFatti && (
                <ul className={griglia} aria-label="Videogiochi completati">
                  {fatti.map((g) => <Scheda key={`${partitaId}:${g.chiave}`} g={g} partitaId={partitaId} onSalvata={salvaGioco} onCorretto={() => void dati.ricarica()} onPosizione={() => setSelezionato(g.chiave)} />)}
                </ul>
              )}
            </section>
          )}
        </div>
      )}
    </PageState>
  );
}
