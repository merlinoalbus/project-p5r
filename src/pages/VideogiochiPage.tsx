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
import { getVideogiochi } from '../services/api/compendio';
import { impostaProgressoVideogioco } from '../services/api/partite';
import { usePartitaStore } from '../stores/partitaStore';
import { useCarica } from '../hooks/useCarica';
import { useCodaProgresso } from '../hooks/useCodaProgresso';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { notifica } from '../stores/notificationStore';
import { avvisaDotiDaSegnare } from '../utils/dotiDaSegnare';
import { PageState } from '../components/shared/PageState';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { NotaPuntiDote } from '../components/shared/NotaPuntiDote';
import { CampoRicerca } from '../components/shared/CampoRicerca';
import { IconaCategoria } from '../components/guida/IconaCategoria';
import { AssetImg } from '../components/shared/AssetImg';
import { ChipDisponibilita } from '../components/guida/ChipDisponibilita';
import { AggiungiAlCatalogo, CorreggiElemento } from '../components/guida/AzioniCatalogo';
import { DoveSiTrova } from '../components/mappe/DoveSiTrova';
import { PulsanteVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione, IconaSegno, type ChiaveSegno } from '../components/shared/IconaAzione';
import { bloccata, formattaYen, motivoBlocco, prezzoChip } from '../utils/letture';
import type { VideogiocoDto } from '../types';

function Numero({ valore, etichetta, segno }: { valore: number | string; etichetta: string; segno: ChiaveSegno }) {
  return (
    <span className="card flex flex-col gap-0.5 px-3 py-2">
      <span className="font-display text-[21px] leading-none tabular-nums">{valore}</span>
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-text-muted"><IconaSegno chiave={segno} dimensione={14} />{etichetta}</span>
    </span>
  );
}

function Scheda({ g, partitaId, occupato, progresso, onCambia, onCorretto, onPosizione }: { g: VideogiocoDto; partitaId: number | null; occupato: boolean; progresso: number; onCambia: (g: VideogiocoDto, passo: number) => void; onCorretto: () => void; onPosizione: () => void }) {
  const totale = g.totaleRound;
  const percentuale = totale > 0 ? Math.round((progresso / totale) * 100) : 0;
  const nonAncora = bloccata(g.disponibilita);
  return (
    <li className={`card relative flex min-w-0 flex-col gap-3 overflow-hidden ${g.fatto ? 'border-success/50' : ''}`}>
      <div className="flex items-start gap-3">
        {/* L'illustrazione del gioco (`attivita/<chiave>`, la stessa della pagina delle attività); finché non c'è, l'icona dei
            videogiochi. Prima c'era sempre l'icona: le sette illustrazioni consegnate non si sarebbero viste da nessuna parte. */}
        <AssetImg nome={`attivita/${g.chiave}`} alt="" decorativa className="shrink-0 rounded-md object-contain" style={{ width: 56, height: 56 }}
          fallback={<span className="shrink-0"><IconaCategoria categoria="minigiochi" dimensione={44} /></span>} />
        <div className="min-w-0 flex-1">
          <h3 className="m-0 text-lg leading-tight">{g.nome}</h3>
          <p className="m-0 text-xs text-text-secondary">{g.sedeNome ?? g.luogo}</p>
        </div>
        <span className="flex flex-col items-end gap-1">
          <span className={`chip ${g.fatto ? 'chip--attivo' : ''}`}>{g.fatto ? 'Completato' : g.iniziato ? 'In corso' : 'Da giocare'}</span>
          <ChipDisponibilita disponibilita={g.disponibilita ?? undefined} compatto />
        </span>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs text-text-secondary">
          <span>{progresso} di {totale} round</span>
          <span className="tabular-nums">{percentuale}%</span>
        </div>
        <div className="visore-mappa__progresso" role="progressbar" aria-label={`Progresso ${g.nome}`} aria-valuemin={0} aria-valuemax={totale} aria-valuenow={progresso}>
          <span className="visore-mappa__progresso-barra" style={{ width: `${percentuale}%` }} />
        </div>
      </div>

      {/* Il gesto è il round: due pulsanti larghi uguali. Con il gioco non ancora disponibile il «+»
          resta spento e il motivo sta sotto. */}
      {partitaId && (
        <div className="grid grid-cols-2 gap-2" role="group" aria-label={`Avanzamento ${g.nome}`}>
          <PulsanteVisivo tono="secondario" icona={<IconaAzione chiave="meno" dimensione={20} />} titolo="Togli"
            disabled={progresso === 0} onClick={() => onCambia(g, -1)} aria-label={`Togli un round a ${g.nome}`} />
          <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Round"
            disabled={progresso >= totale || (nonAncora && progresso === 0)} onClick={() => onCambia(g, +1)} aria-label={`Aggiungi un round a ${g.nome}`} />
          {nonAncora && progresso === 0 && <p className="col-span-2 m-0 text-xs text-text-secondary" role="note">Non ancora giocabile: {motivoBlocco(g.disponibilita)}</p>}
          {occupato && <span className="col-span-2 text-center text-xs text-text-muted" role="status">Salvataggio…</span>}
        </div>
      )}

      <dl className="dl-scheda m-0 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
        <dt className="text-text-muted">Che cosa fa</dt>
        <dd className="m-0">{g.effettiTesto.length ? g.effettiTesto.join(' · ') : 'Nessun effetto dichiarato'}</dd>
        {g.negozi.length > 0 && <><dt className="text-text-muted">In vendita da</dt><dd className="m-0 flex flex-wrap gap-1">{g.negozi.map((n) => <Link key={n.articolo} to={`/guida/negozi/${encodeURIComponent(n.negozio)}`} className="chip chip--attivo touch no-underline">{n.negozioNome}{prezzoChip(n.prezzo)}</Link>)}</dd></>}
        {g.negozi.length === 0 && g.costo !== null && g.costo > 0 && <><dt className="text-text-muted">Costo</dt><dd className="m-0">{formattaYen(g.costo)}</dd></>}
      </dl>
      {g.dettagli && <p className="m-0 whitespace-pre-line text-xs text-text-secondary">{g.dettagli}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-2">
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="posizione" dimensione={20} />}
          titolo="Mostra posizione" onClick={onPosizione} aria-label={`Mostra posizione di ${g.nome}`} />
        <CorreggiElemento tipo="videogioco" chiave={g.chiave} onSalvato={onCorretto} />
      </div>
    </li>
  );
}

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

  /** Le pressioni rapide sul «+» si mettono in coda, non si perdono: il numero mostrato è quello chiesto, e una sola richiesta
   *  per volta lo insegue finché non lo raggiunge — nella partita in cui è partita (`useCodaProgresso`, rilievo A1). */
  const coda = useCodaProgresso<VideogiocoDto>(partitaId, {
    invia: impostaProgressoVideogioco,
    applica: (nuovo) => dati.imposta((correnti) => ({ ...correnti, videogiochi: correnti.videogiochi.map((x) => (x.chiave === nuovo.chiave ? nuovo : x)) })),
    // il gioco completato dà le sue Doti: si segnano a mano, l'avviso le ricorda
    dopoOgniInvio: (nuovo) => avvisaDotiDaSegnare(nuovo.daSegnare, nuovo.nome),
    messaggioErrore: 'Aggiornamento fallito.',
    segnalaErrore: (m) => notifica('error', m),
  });

  const q = ricerca.trim().toLocaleLowerCase('it');
  const visibili = useMemo(() => giochi.filter((g) => !q || `${g.nome} ${g.sedeNome ?? ''} ${g.luogo} ${g.effettiTesto.join(' ')}`.toLocaleLowerCase('it').includes(q)), [giochi, q]);
  const daFare = visibili.filter((g) => !g.fatto);
  const fatti = visibili.filter((g) => g.fatto);
  const roundFatti = giochi.reduce((s, g) => s + g.progresso, 0);
  const roundTotali = giochi.reduce((s, g) => s + g.totaleRound, 0);
  const scelto = giochi.find((g) => g.chiave === selezionato) ?? null;

  /** Un round in più o in meno, contato sull'ultimo valore chiesto. */
  const cambia = (g: VideogiocoDto, passo: number) => {
    const base = coda.valore(g);
    const desiderato = Math.min(Math.max(base + passo, 0), g.totaleRound);
    if (desiderato !== base) coda.accoda(g, desiderato);
  };

  // Le stesse colonne di Libri e Film: due da tablet in su, tre su desktop largo.
  const griglia = 'm-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2 xl:grid-cols-3';

  return (
    <PageState isLoading={dati.caricamento && !dati.dati} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {dati.dati && (
        <div className="flex flex-col gap-4">
          <IntestazionePagina titolo="Videogiochi"
            sottotitolo={`I giochi retro della soffitta e delle sale di Akihabara: ogni round alza una Dote, e i contenuti collegati si sbloccano solo a gioco finito.${partitaId ? ` Nella partita «${attiva?.nome}».` : ' Attiva una partita per segnare i round.'}`} />

          <div className="flex flex-wrap gap-2">
            <Numero valore={giochi.length} etichetta="Giochi" segno="iniziati" />
            <Numero valore={giochi.filter((g) => g.fatto).length} etichetta="Completati" segno="completati" />
            <Numero valore={`${roundFatti}/${roundTotali}`} etichetta="Round" segno="round" />
          </div>

          {partitaId && <NotaPuntiDote cosa="quali giochi hai finito e a che round sei" />}

          <div className="filtri-articoli__riga">
            <CampoRicerca valore={ricerca} onCambia={setRicerca} segnaposto="Cerca per nome, luogo o effetto…" />
            <AggiungiAlCatalogo tipo="videogioco" titolo="Aggiungi un videogioco" onSalvato={() => void dati.ricarica()} />
          </div>

          {scelto && (
            <section className="flex flex-col gap-2" aria-label={`Posizione di ${scelto.nome}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="m-0 font-display text-[17px] uppercase leading-none">Dove si gioca a «{scelto.nome}»</h2>
                <button type="button" className="btn btn-ghost btn-sm touch" onClick={() => setSelezionato(null)}>Chiudi</button>
              </div>
              <DoveSiTrova tipo="attivita" chiave={scelto.chiave} titolo={scelto.nome} altezza={300} />
            </section>
          )}

          <section className="flex flex-col gap-2" aria-label="Da giocare">
            <h2 className="m-0 font-display text-[17px] uppercase leading-none">Da giocare · {daFare.length}</h2>
            {daFare.length === 0
              ? <p className="m-0 text-[13px] text-text-muted" role="status">{giochi.length === 0 ? 'Nessun gioco nel catalogo.' : q ? 'Nessun gioco da fare con questo testo.' : 'Finiti tutti.'}</p>
              : <ul className={griglia} aria-label="Videogiochi da giocare">
                  {daFare.map((g) => <Scheda key={g.chiave} g={g} partitaId={partitaId} occupato={coda.occupato(g)} progresso={coda.valore(g)} onCambia={cambia} onCorretto={() => void dati.ricarica()} onPosizione={() => setSelezionato(g.chiave)} />)}
                </ul>}
          </section>

          {fatti.length > 0 && (
            <section className="flex flex-col gap-2" aria-label="Completati">
              <button type="button" className="btn btn-ghost btn-sm touch self-start" aria-expanded={mostraFatti} onClick={() => setMostraFatti((v) => !v)}>
                {mostraFatti ? 'Nascondi' : 'Mostra'} i completati · {fatti.length}
              </button>
              {mostraFatti && (
                <ul className={griglia} aria-label="Videogiochi completati">
                  {fatti.map((g) => <Scheda key={g.chiave} g={g} partitaId={partitaId} occupato={coda.occupato(g)} progresso={coda.valore(g)} onCambia={cambia} onCorretto={() => void dati.ricarica()} onPosizione={() => setSelezionato(g.chiave)} />)}
                </ul>
              )}
            </section>
          )}
        </div>
      )}
    </PageState>
  );
}
