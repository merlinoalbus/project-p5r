// ============================================================
// VideogiochiPage — i giochi retro, i round e le Doti che alzano
// ============================================================
//
// **Riscritta nella lingua dell'app.** La prima stesura disegnava con la tavolozza cruda di
// Tailwind — `bg-slate-900`, `border-slate-700`, `bg-red-700` — invece dei token di
// `src/tailwind.css`, ed era l'unica pagina del repository a farlo: schede bluastre su un fondo
// che bluastro non è, bersagli tattili da 38 px invece di 44 su un'app che si usa col tablet in
// mano durante la partita, nessun elenco (quindi nessun conteggio per chi legge con uno screen
// reader) e un «7giochi» attaccato. Le pagine gemelle — Libri, Film e DVD — erano già scritte
// com'è scritta ora questa.
//
// **I completati stanno in un gruppo a parte**, chiuso finché non si apre: in una lista sola i
// finiti e i da fare si mescolano, e per sapere quanto manca bisogna contarli a occhio.
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { getVideogiochi } from '../services/api/compendio';
import { impostaProgressoVideogioco } from '../services/api/partite';
import { usePartitaStore } from '../stores/partitaStore';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { IconaCategoria } from '../components/guida/IconaCategoria';
import { ChipDisponibilita } from '../components/guida/ChipDisponibilita';
import { AggiungiAlCatalogo, CorreggiElemento } from '../components/guida/AzioniCatalogo';
import { DoveSiTrova } from '../components/mappe/DoveSiTrova';
import { PulsanteVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione, IconaSegno, type ChiaveSegno } from '../components/shared/IconaAzione';
import { NOME_DOTE } from '../utils/citta';
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
  // Il numero mostrato è quello **chiesto**, non l'ultimo confermato: i tocchi rapidi si vedono
  // subito e la richiesta li insegue (vedi la coda in `VideogiochiPage`).
  const percentuale = totale > 0 ? Math.round((progresso / totale) * 100) : 0;
  return (
    <li className={`card relative flex min-w-0 flex-col gap-3 overflow-hidden ${g.fatto ? 'border-success/50' : ''}`}>
      <div className="flex items-start gap-3">
        <IconaCategoria categoria="minigiochi" dimensione={44} />
        <div className="min-w-0 flex-1">
          <h3 className="m-0 text-lg leading-tight">{g.nome}</h3>
          <p className="m-0 text-xs text-text-secondary">{g.luogo}</p>
        </div>
        <span className="flex flex-col items-end gap-1">
          <span className={`chip ${g.fatto ? 'chip--attivo' : ''}`}>{g.fatto ? 'Completato' : g.iniziato ? 'In corso' : 'Da giocare'}</span>
          <ChipDisponibilita disponibilita={g.disponibilita ?? undefined} compatto />
        </span>
      </div>

      <div>
        {/* Il conteggio dei round si scrive per esteso: la pastiglia «0/3» del primo disegno, in
            una colonna stretta, andava a capo fra lo zero e il tre e si leggeva «0/» e «3». */}
        <div className="mb-1 flex justify-between text-xs text-text-secondary">
          <span>{progresso} di {totale} round</span>
          <span className="tabular-nums">{percentuale}%</span>
        </div>
        <div className="visore-mappa__progresso" role="progressbar" aria-label={`Progresso ${g.nome}`} aria-valuemin={0} aria-valuemax={totale} aria-valuenow={progresso}>
          <span className="visore-mappa__progresso-barra" style={{ width: `${percentuale}%` }} />
        </div>
      </div>

      {/* Il gesto è il round: due pulsanti larghi uguali. «Completa» in mezzo, grande il triplo,
          faceva in un tocco quello che «+» fa comunque, e toglieva spazio al gesto vero. */}
      {partitaId && (
        <div className="grid grid-cols-2 gap-2" aria-label={`Avanzamento ${g.nome}`}>
          <PulsanteVisivo tono="secondario" icona={<IconaAzione chiave="meno" dimensione={20} />} titolo="Togli"
            disabled={progresso === 0} onClick={() => onCambia(g, -1)} aria-label={`Togli un round a ${g.nome}`} />
          <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Round"
            disabled={progresso >= totale} onClick={() => onCambia(g, +1)} aria-label={`Aggiungi un round a ${g.nome}`} />
          {occupato && <span className="col-span-2 text-center text-xs text-text-muted" role="status">Salvataggio…</span>}
        </div>
      )}

      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
        <dt className="text-text-muted">Doti</dt>
        <dd className="m-0">{g.doti.length === 0 ? 'Nessuna' : g.doti.map((d, i) => <span key={i}>{i > 0 ? ' · ' : ''}{d.dote ? NOME_DOTE[d.dote] ?? d.dote : 'Dote variabile'}{d.note !== null ? ` ${'♪'.repeat(Math.min(4, d.note))}` : ''}</span>)}</dd>
        {g.costo !== null && g.costo > 0 && <><dt className="text-text-muted">Costo</dt><dd className="m-0">{g.costo.toLocaleString('it-IT')} ¥</dd></>}
        {g.sblocco && <><dt className="text-text-muted">Si sblocca</dt><dd className="m-0">{g.sblocco}</dd></>}
      </dl>
      {g.premi && <p className="m-0 text-xs text-text-secondary">{g.premi}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-2">
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="posizione" dimensione={20} />}
          titolo="Mostra posizione" onClick={onPosizione} aria-label={`Mostra posizione di ${g.nome}`} />
        <CorreggiElemento tipo="attivita" chiave={g.chiave} onSalvato={onCorretto} />
        {g.fonte && <a href={g.fonte} target="_blank" rel="noreferrer" className="credito self-center">fonte</a>}
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
  const [giochi, setGiochi] = useState<VideogiocoDto[]>([]);
  const [occupati, setOccupati] = useState<Record<string, boolean>>({});
  const [mostraFatti, setMostraFatti] = useState(false);
  const [selezionato, setSelezionato] = useState<string | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (dati.dati) setGiochi(dati.dati.videogiochi); }, [dati.dati]);

  const q = ricerca.trim().toLocaleLowerCase('it');
  const visibili = useMemo(() => giochi.filter((g) => !q || `${g.nome} ${g.luogo} ${g.doti.map((d) => d.dote ?? '').join(' ')}`.toLocaleLowerCase('it').includes(q)), [giochi, q]);
  const daFare = visibili.filter((g) => !g.fatto);
  const fatti = visibili.filter((g) => g.fatto);
  const roundFatti = giochi.reduce((s, g) => s + g.progresso, 0);
  const roundTotali = giochi.reduce((s, g) => s + g.totaleRound, 0);
  const scelto = giochi.find((g) => g.chiave === selezionato) ?? null;

  /** Le pressioni rapide sul «+» si mettono in coda, non si perdono.
   *
   * Il round si segna col tablet in mano mentre si gioca, e cinque tocchi di fila sono la norma:
   * con una richiesta per volta e i pulsanti disabilitati durante l'attesa, i tocchi che cadono
   * nel mezzo sparivano — restava l'ultimo valore confermato, non quello che avevi chiesto. Qui il
   * numero mostrato è **quello che hai chiesto**, e una sola richiesta per volta lo insegue finché
   * non lo raggiunge. È la stessa soluzione dei DVD, dove il difetto era stato trovato prima.
   *
   * L'idea è di Codex (`candidato/lotto-b-v5`), che l'aveva scritta sulla versione precedente
   * della pagina; qui è portata su quella di adesso.
   */
  const desiderati = useRef(new Map<string, number>());
  const confermati = useRef(new Map<string, number>());
  const inVolo = useRef(new Set<string>());
  const [mostrati, setMostrati] = useState<Record<string, number>>({});

  const svuotaCoda = async (g: VideogiocoDto, id: number) => {
    if (inVolo.current.has(g.chiave)) return;
    inVolo.current.add(g.chiave);
    confermati.current.set(g.chiave, g.progresso);
    setOccupati((o) => ({ ...o, [g.chiave]: true }));
    try {
      for (;;) {
        const confermato = confermati.current.get(g.chiave) ?? g.progresso;
        const desiderato = desiderati.current.get(g.chiave) ?? confermato;
        if (desiderato === confermato || partitaId !== id) break;
        const nuovo = await impostaProgressoVideogioco(id, g.chiave, desiderato);
        confermati.current.set(g.chiave, nuovo.progresso);
        setGiochi((xs) => xs.map((x) => (x.chiave === nuovo.chiave ? nuovo : x)));
      }
    } catch (err) {
      // Se il salvataggio fallisce, il numero mostrato torna all'ultimo confermato: mostrare un
      // round che non è stato registrato sarebbe peggio che non mostrarlo.
      const confermato = confermati.current.get(g.chiave) ?? g.progresso;
      desiderati.current.set(g.chiave, confermato);
      setMostrati((m) => ({ ...m, [g.chiave]: confermato }));
      notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
    } finally {
      inVolo.current.delete(g.chiave);
      setOccupati((o) => ({ ...o, [g.chiave]: false }));
    }
  };

  /** Un round in più o in meno. **Il passo si conta sull'ultimo valore chiesto**, non su quello
   *  disegnato: due tocchi nello stesso fotogramma leggerebbero lo stesso numero e varrebbero per
   *  uno solo, che è il difetto che questa coda esiste per togliere. */
  const cambia = (g: VideogiocoDto, passo: number) => {
    if (!partitaId) return;
    const base = desiderati.current.get(g.chiave) ?? g.progresso;
    const desiderato = Math.min(Math.max(base + passo, 0), g.totaleRound);
    if (desiderato === base) return;
    desiderati.current.set(g.chiave, desiderato);
    setMostrati((m) => ({ ...m, [g.chiave]: desiderato }));
    void svuotaCoda(g, partitaId);
  };

  const griglia = 'm-0 grid list-none grid-cols-1 gap-3 p-0 lg:grid-cols-2 2xl:grid-cols-3';

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

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex min-w-[220px] flex-1 flex-col gap-1">
              <span className="sr-only">Cerca fra i videogiochi</span>
              <input type="search" className="form-input" placeholder="Cerca per nome, luogo o Dote…" value={ricerca} onChange={(e) => setRicerca(e.target.value)} />
            </label>
            {/* Un videogioco è un'attività, nel catalogo: si aggiunge con lo stesso modulo. */}
            <AggiungiAlCatalogo tipo="attivita" titolo="Aggiungi un videogioco" onSalvato={() => void dati.ricarica()} />
          </div>

          {/* Un pannello solo, sotto i filtri: la mappa del gioco scelto. Montarne una per scheda
              vorrebbe dire sette visori in pagina, che è quel che rendeva pesante l'indice. */}
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
                  {daFare.map((g) => <Scheda key={g.chiave} g={g} partitaId={partitaId} occupato={!!occupati[g.chiave]} progresso={mostrati[g.chiave] ?? g.progresso} onCambia={cambia} onCorretto={() => void dati.ricarica()} onPosizione={() => setSelezionato(g.chiave)} />)}
                </ul>}
          </section>

          {fatti.length > 0 && (
            <section className="flex flex-col gap-2" aria-label="Completati">
              {/* Chiuso finché non si apre: i completati servono a sapere che ci sono, non a
                  occupare lo schermo davanti a quelli che restano da fare. */}
              <button type="button" className="btn btn-ghost btn-sm touch self-start" aria-expanded={mostraFatti} onClick={() => setMostraFatti((v) => !v)}>
                {mostraFatti ? 'Nascondi' : 'Mostra'} i completati · {fatti.length}
              </button>
              {mostraFatti && (
                <ul className={griglia} aria-label="Videogiochi completati">
                  {fatti.map((g) => <Scheda key={g.chiave} g={g} partitaId={partitaId} occupato={!!occupati[g.chiave]} progresso={mostrati[g.chiave] ?? g.progresso} onCambia={cambia} onCorretto={() => void dati.ricarica()} onPosizione={() => setSelezionato(g.chiave)} />)}
                </ul>
              )}
            </section>
          )}
        </div>
      )}
    </PageState>
  );
}
