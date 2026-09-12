import { ImmaginiLuogo } from '../components/mappe/ImmaginiLuogo';
import { SelettoreContestoMappa } from '../components/mappe/SelettoreContestoMappa';
import { etichetteDistinte, nomePresentazioneMappa, presentaMappa } from '../utils/presentazioneMappa';
import { AlberoLuoghi } from '../components/mappe/AlberoLuoghi';
import { ContenutiGuidaMappa } from '../components/mappe/ContenutiGuidaMappa';
import { RisolviMappa } from '../components/mappe/RisolviMappa';
import { haPlanimetria } from '../utils/haPlanimetria';
// ============================================================
// MappaPage — indice delle mappe (albero) e visore a schermo intero di una mappa (Fase 13.2)
// ============================================================

import { urlMappa } from '../utils/navigazioneMappa';
import { useMemo, useState } from 'react';
import { Selettore } from '../components/shared/Selettore';
import type { MappaDto, MappaRiassuntoDto } from '../types';
import { AnteprimaMappa } from '../components/mappe/AnteprimaMappa';
import { centroAccessoMondo, schedaAccessoMondo } from '../utils/accessoMondo';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useCarica } from '../hooks/useCarica';
import { useMappaPartita } from '../hooks/useMappaPartita';
import { getAlberoMappe } from '../services/api';
import { usePartitaStore } from '../stores/partitaStore';
import { PageState } from '../components/shared/PageState';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { VisoreMappa } from '../components/mappe/VisoreMappa';
import { CollegamentoVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';
import { NOME_TIPO_MAPPA } from '../../shared/spilli';

/** Tokyo non ha un visore proprio: la sua mappa è quella disegnata nella Città.
 *
 * Il nodo `tokyo` dell'atlante resta — è il genitore dei quartieri, e senza di lui l'albero non
 * sta in piedi — ma la sua *planimetria* non è più una destinazione: chi ci arrivava vedeva una
 * seconda Tokyo, diversa da quella che aveva appena guardato. Il reindirizzamento è qui e non
 * solo sui collegamenti perché i modi di arrivarci sono tanti (le briciole del visore, «Torna a
 * Tokyo», un indirizzo salvato) e vanno tutti a finire nello stesso posto. */
const TOKYO = 'tokyo';
const CITTA = '/guida/citta';

export function MappaPage() {
  const { chiave } = useParams<{ chiave: string }>();
  const attiva = usePartitaStore((s) => s.attiva);
  if (!chiave) return <IndiceMappe />;
  if (chiave === TOKYO) return <Navigate to={CITTA} replace />;
  return <RisolviMappa chiave={chiave}>{k => k === TOKYO ? <Navigate to={CITTA} replace /> : <DettaglioMappa chiave={k} partitaId={attiva?.id ?? null} />}</RisolviMappa>;
}

/** Le radici che sono versioni dello stesso luogo formano una scheda sola, come nell'albero. */
function radiciRaggruppate(mappe: MappaRiassuntoDto[]): Array<{ chiave: string; capofila: MappaRiassuntoDto; versioni: MappaRiassuntoDto[] }> {
  const gruppi: Array<{ chiave: string; capofila: MappaRiassuntoDto; versioni: MappaRiassuntoDto[] }> = [];
  const indice = new Map<string, number>();
  for (const m of mappe.filter(x => !x.genitore)) {
    const id = m.gruppoImmagini ? `esplicito:${m.gruppoImmagini.id}` : m.immagineCollezione ? `presentazione:${m.immagineCollezione.ambito}` : null;
    const posto = id !== null ? indice.get(id) : undefined;
    if (id !== null && posto !== undefined) { gruppi[posto].versioni.push(m); continue; }
    if (id !== null) indice.set(id, gruppi.length);
    gruppi.push({ chiave: id ?? m.chiave, capofila: m, versioni: [m] });
  }
  return gruppi;
}

/** Indice: radici (Tokyo, Palazzi) con le mappe figlie. */
function IndiceMappe() {
  useDocumentTitle('Mappe');
  const albero = useCarica(() => getAlberoMappe(), []);
  const mappe = useMemo(() => albero.dati ?? [], [albero.dati]);
  // discendenti e spilli dell'intero sottoalbero: la scheda dice quanto contiene davvero, non solo il primo livello
  const totali = useMemo(() => {
    const figliDi = new Map<string | null, MappaRiassuntoDto[]>();
    for (const m of mappe) figliDi.set(m.genitore, [...(figliDi.get(m.genitore) ?? []), m]);
    const cache = new Map<string, { mappe: number; spilli: number }>();
    const conta = (chiave: string, visti: Set<string>): { mappe: number; spilli: number } => {
      const salvato = cache.get(chiave);
      if (salvato) return salvato;
      if (visti.has(chiave)) return { mappe: 0, spilli: 0 };
      visti.add(chiave);
      const esito = (figliDi.get(chiave) ?? []).reduce((acc, f) => {
        const sotto = conta(f.chiave, visti);
        return { mappe: acc.mappe + 1 + sotto.mappe, spilli: acc.spilli + f.numeroSpilli + sotto.spilli };
      }, { mappe: 0, spilli: 0 });
      cache.set(chiave, esito);
      return esito;
    };
    return { conta: (chiave: string) => conta(chiave, new Set()), figliDi };
  }, [mappe]);
  const gruppi = useMemo(() => radiciRaggruppate(mappe), [mappe]);
  const totaleMappe = mappe.length;
  const totaleSpilli = useMemo(() => mappe.reduce((s, m) => s + m.numeroSpilli, 0), [mappe]);
  // Il luogo aperto nel pannello, e la discesa dentro di lui: `['tokyo','citta-shibuya']` vuol
  // dire «sto guardando Shibuya, ci sono arrivato da Tokyo». Il percorso è uno stato della
  // pagina e non dell'indirizzo perché è una sbirciata, non una destinazione: la destinazione è
  // la mappa, e per quella c'è il pulsante che la apre.
  const [percorso, setPercorso] = useState<string[]>([]);
  const gruppoAperto = percorso.length > 0 ? gruppi.find((g) => g.versioni.some((v) => v.chiave === percorso[0])) ?? null : null;
  const nodoAperto = gruppoAperto ? mappe.find((m) => m.chiave === percorso[percorso.length - 1]) ?? null : null;
  const nomeDi = (m: MappaRiassuntoDto) => m.gruppoImmagini?.nome ?? nomePresentazioneMappa(m);
  return <div className="flex flex-col gap-4">
    <IntestazionePagina titolo="Mappe"
      sottotitolo={`Tutti i luoghi disegnati della guida: Tokyo, i quartieri e le planimetrie dei Palazzi. ${totaleMappe} mappe con ${totaleSpilli} spilli, raggruppate per il posto a cui appartengono.`} />
    <PageState isLoading={albero.caricamento} error={albero.errore} onRetry={albero.ricarica}>
      {/* **Le radici a sinistra, quel che contengono a destra.**
          Prima ogni radice era una carta con dentro una piega, e aprire i «Luoghi e planimetrie»
          di Tokyo faceva crescere quella cella di quarantasei righe in mezzo a una griglia a tre
          colonne: la carta accanto restava alta due dita, sotto si apriva un buco di mille pixel,
          e l'albero indentato usciva dalla larghezza della colonna. Non era un dettaglio da
          sistemare: una griglia di carte tutte uguali non è il posto dove far crescere un albero.
          Ora le radici sono un elenco stretto e sempre della stessa altezza, e il contenuto del
          luogo scelto sta nel suo pannello, con la sua discesa e il suo scorrimento. */}
      <div className="grid items-start gap-3 xl:grid-cols-[minmax(240px,300px)_minmax(0,1fr)]">
        <ul className="m-0 grid list-none grid-cols-1 items-start gap-2 p-0 sm:grid-cols-2 xl:grid-cols-1" aria-label="Mappe">
          {gruppi.map(({ chiave, capofila, versioni }) => {
            const sotto = versioni.reduce((acc, v) => {
              const c = totali.conta(v.chiave);
              return { mappe: acc.mappe + c.mappe, spilli: acc.spilli + c.spilli + v.numeroSpilli };
            }, { mappe: 0, spilli: 0 });
            const nome = nomeDi(capofila);
            const conFigli = versioni.some(v => (totali.figliDi.get(v.chiave) ?? []).length > 0);
            const apribile = conFigli || versioni.length > 1;
            const aperto = gruppoAperto?.chiave === chiave;
            return <li key={chiave} className="flex">
              {/* La riga è **una scelta**, non un collegamento: apre il pannello. Ad aprire la
                  mappa ci pensa il pulsante nel pannello, che dice quale mappa apre. Un luogo
                  senza niente dentro non ha pannello da mostrare, e allora la riga porta
                  direttamente alla sua planimetria. */}
              {apribile
                ? <button type="button" aria-expanded={aperto} onClick={() => setPercorso(aperto ? [] : [capofila.chiave])}
                    className={`card card--cliccabile touch flex w-full items-center gap-3 text-left ${aperto ? 'border-primary bg-primary-bg' : ''}`}>
                    <AnteprimaMappa mappa={capofila} className="h-[52px] w-[72px] shrink-0" />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className={`font-display text-[17px] leading-tight break-words ${aperto ? 'text-primary' : ''}`}>{nome}</span>
                      <span className="text-[11px] text-text-muted">{NOME_TIPO_MAPPA[capofila.tipo]} · {sotto.spilli} spilli · {sotto.mappe > 0 ? `${sotto.mappe} mappe` : `${versioni.length} versioni`}</span>
                    </span>
                    <span aria-hidden className="shrink-0 text-text-muted">{aperto ? '▾' : '▸'}</span>
                  </button>
                : <Link to={capofila.chiave === TOKYO ? CITTA : urlMappa(capofila.chiave)} className="card card--cliccabile flex w-full items-center gap-3 no-underline text-text">
                    <AnteprimaMappa mappa={capofila} className="h-[52px] w-[72px] shrink-0" />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="font-display text-[17px] leading-tight break-words">{nome}</span>
                      <span className="text-[11px] text-text-muted">{NOME_TIPO_MAPPA[capofila.tipo]} · {sotto.spilli} spilli</span>
                    </span>
                  </Link>}
            </li>;
          })}
        </ul>
        {gruppoAperto && nodoAperto
          ? <PannelloLuogo mappe={mappe} figliDi={totali.figliDi} gruppo={gruppoAperto} percorso={percorso}
              nodo={nodoAperto} nome={nomeDi(nodoAperto)} onPercorso={setPercorso} onChiudi={() => setPercorso([])} />
          : <p className="card m-0 hidden text-[13px] text-text-muted xl:block" role="status">
              Scegli un luogo a sinistra per vedere che cosa contiene: quartieri, piani, planimetrie. Da qui si apre la mappa vera e propria.
            </p>}
      </div>
    </PageState>
  </div>;
}

/** Il pannello del luogo scelto: dove sono, che cosa c'è dentro, e come ci si entra.
 *
 * La discesa avviene **qui dentro**: un quartiere con sette planimetrie si apre nel pannello
 * invece di cambiare pagina, così tornare indietro non costa un caricamento e le briciole in
 * cima dicono sempre da dove si è passati. Aprire la mappa resta un gesto distinto, con un
 * pulsante che dice quale mappa apre: le due cose si confondevano quando erano lo stesso clic. */
function PannelloLuogo({ mappe, figliDi, gruppo, percorso, nodo, nome, onPercorso, onChiudi }: {
  mappe: MappaRiassuntoDto[];
  figliDi: Map<string | null, MappaRiassuntoDto[]>;
  gruppo: { chiave: string; capofila: MappaRiassuntoDto; versioni: MappaRiassuntoDto[] };
  percorso: string[];
  nodo: MappaRiassuntoDto;
  nome: string;
  onPercorso: (p: string[]) => void;
  onChiudi: () => void;
}) {
  const alRadice = percorso.length === 1;
  const contenute = useMemo(
    () => (figliDi.get(nodo.chiave) ?? []).slice().sort((a, b) => a.ordine - b.ordine || a.chiave.localeCompare(b.chiave)),
    [figliDi, nodo.chiave],
  );
  const briciole = percorso.map((k) => mappe.find((m) => m.chiave === k)).filter((m): m is MappaRiassuntoDto => !!m);
  const destinazione = nodo.chiave === TOKYO ? CITTA : urlMappa(nodo.chiave);
  return <section className="card flex min-w-0 flex-col gap-3" aria-label={`Dentro ${nome}`}>
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <nav aria-label="Percorso" className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-[12px] text-text-muted">
        {briciole.map((b, i) => <span key={b.chiave} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden>›</span>}
          {i === briciole.length - 1
            ? <span className="font-display text-[16px] uppercase leading-none text-text">{b.gruppoImmagini?.nome ?? nomePresentazioneMappa(b)}</span>
            : <button type="button" className="touch text-text-secondary underline decoration-dotted underline-offset-2" onClick={() => onPercorso(percorso.slice(0, i + 1))}>{b.gruppoImmagini?.nome ?? nomePresentazioneMappa(b)}</button>}
        </span>)}
      </nav>
      <Link to={destinazione} className="btn btn-primary btn-sm touch">Apri {nodo.chiave === TOKYO ? 'la mappa di Tokyo' : 'questa mappa'}</Link>
      <button type="button" className="btn btn-ghost btn-sm touch xl:hidden" onClick={onChiudi}>Chiudi</button>
    </div>
    {/* Le versioni dello stesso luogo — la porzione occidentale, la planimetria intera — sono
        varianti di una figura sola: stanno insieme, in cima, e non sparse fra i figli. */}
    {alRadice && gruppo.versioni.length > 1 && <ImmaginiLuogo mappe={gruppo.versioni} nome={nome} />}
    {contenute.length > 0
      ? <div className="max-h-[min(72vh,860px)] overflow-y-auto pr-1">
          <GriglieDelLuogo contenute={contenute} nome={nome} onScendi={(k) => onPercorso([...percorso, k])} />
        </div>
      : <p className="m-0 text-[13px] text-text-muted" role="status">Qui dentro non ci sono altre planimetrie: c’è solo questa.</p>}
    {/* La discesa a riquadri mostra un piano per volta, ed è il modo giusto per scegliere dove
        andare. Chi invece **cerca un nome** — «dov'è finita la banchina di Yongen-Jaya?» — ha
        bisogno di vedere tutto insieme: l'albero completo resta qui sotto, chiuso, con il suo
        scorrimento. È lo stesso elenco di prima, ma dentro un contenitore che lo contiene. */}
    {contenute.length > 0 && <details className="border-t border-border-light pt-2">
      <summary className="touch cursor-pointer text-[12px] text-text-muted">Elenco completo, con tutti i livelli</summary>
      <div className="max-h-[420px] overflow-auto pt-2">
        <AlberoLuoghi mappe={mappe} genitore={nodo.chiave} espandibile />
      </div>
    </details>}
  </section>;
}

/** Un luogo che **contiene** mappe invece di esserne una.
 *
 * È il nodo di raccolta — un Palazzo intero, un quartiere con più piante — e non ha una
 * planimetria propria. La pagina c'era già ma era tre collegamenti nudi in fila: «Scheda del
 * luogo», «Modifica luogo» e un elenco puntato di nomi. Chi ci arrivava cliccando un Palazzo
 * dall'indice trovava una lista di titoli e doveva aprirli uno per uno per capire quale fosse
 * quello che cercava.
 *
 * Ora le mappe contenute sono **una griglia di anteprime**: la forma di una pianta la si riconosce
 * a colpo d'occhio, il nome no. Le azioni sono comandi, non collegamenti in fondo alla pagina. */
function LuogoSenzaPlanimetria({ mappa, nome, albero }: {
  mappa: MappaDto; nome: string; albero: ReturnType<typeof useCarica<MappaRiassuntoDto[]>>;
}) {
  const contenute = useMemo(
    () => (albero.dati ?? []).filter((m) => m.genitore === mappa.chiave).sort((a, b) => a.ordine - b.ordine || a.chiave.localeCompare(b.chiave)),
    [albero.dati, mappa.chiave],
  );
  return <div className="flex flex-col gap-4">
    <header className="card flex flex-col gap-2">
      <nav aria-label="Percorso del luogo" className="flex flex-wrap items-center gap-1 text-[12px] text-text-muted">
        {mappa.percorso.map((p, i) => <span key={p.chiave} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden>›</span>}
          {i === mappa.percorso.length - 1
            ? <span className="text-text">{p.nome}</span>
            : <Link to={urlMappa(p.chiave)} className="text-text-secondary">{p.nome}</Link>}
        </span>)}
      </nav>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <h1 className="titolo-display m-0 break-words">{nome}</h1>
        <span className="chip text-[11px]">{NOME_TIPO_MAPPA[mappa.tipo]}</span>
        <span className="text-[12px] text-text-muted">
          {contenute.length === 0 ? 'nessuna planimetria' : contenute.length === 1 ? 'una planimetria' : `${contenute.length} planimetrie`}
          {mappa.numeroSpilli > 0 ? ` · ${mappa.numeroSpilli} spilli` : ''}
        </span>
      </div>
      {/* Va detto, invece di lasciarlo capire dall'assenza: questo nodo raccoglie, non disegna. */}
      <p className="m-0 text-[13px] text-text-secondary">Questo luogo non ha una pianta sua: raccoglie le mappe qui sotto.</p>
      <div className="flex flex-wrap gap-2">
        {mappa.entita && <CollegamentoVisivo to={schedaAccessoMondo(mappa.entita.tipo, mappa.entita.chiave)} tono="secondario" compatto icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo="Scheda del luogo" />}
        <CollegamentoVisivo to={`/guida/mappe/${encodeURIComponent(mappa.chiave)}/modifica`} tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica luogo" />
      </div>
    </header>
    <PageState isLoading={albero.caricamento} error={albero.errore} onRetry={albero.ricarica}>
      {contenute.length > 0
        ? <GriglieDelLuogo contenute={contenute} nome={nome} />
        : <p className="m-0 text-[13px] text-text-muted" role="status">Qui non c’è ancora nessuna planimetria. Puoi aggiungerne una dall’editor.</p>}
    </PageState>
  </div>;
}

/** Le mappe di un Palazzo, divise per **utilita'** e non per ordine di estrazione.
 *
 * La pagina di un Palazzo mostrava trentaquattro riquadri uguali, in fila, con nomi come
 * «Palazzo di Kamoshida — Immagini native che nessun campo usa — tela quadrata, disegno medio —
 * la piu' estesa». Erano tre problemi in uno: le aree vere mescolate agli scarti
 * dell'estrazione, il nome del Palazzo ripetuto trentaquattro volte in una pagina che si chiama
 * col suo nome, e un vocabolario da estrattore («immagini native che nessun campo usa») dato in
 * pasto a chi gioca.
 *
 * Qui davanti vanno **le aree con gli spilli** — quelle in cui c'e' qualcosa da trovare, cioe'
 * quelle per cui si apre una guida — e i fogli senza spilli finiscono in un gruppo che si apre a
 * richiesta. Non si buttano: sono planimetrie vere, servono a chi cura l'atlante, ma non sono la
 * risposta alla domanda «dove devo andare».
 */
function GriglieDelLuogo({ contenute, nome, onScendi }: { contenute: MappaRiassuntoDto[]; nome: string; onScendi?: (chiave: string) => void }) {
  const [mostraSenzaSpilli, setMostraSenzaSpilli] = useState(false);
  // I fogli che l'estrazione ha trovato ma che nessun campo del gioco usa portano un nome che e'
  // una descrizione tecnica — «Immagini native che nessun campo usa — tela larga, disegno minuto»
  // — e non un posto. Hanno spilli, quindi restano fra le aree, ma vanno in fondo: davanti ci
  // stanno le stanze con un nome, che sono quelle che uno cerca.
  const senzaNomeVero = (m: MappaRiassuntoDto) => /nessun campo usa/i.test(nomePresentazioneMappa(m));
  const conSpilli = contenute.filter((m) => m.numeroSpilli > 0)
    .sort((a, b) => Number(senzaNomeVero(a)) - Number(senzaNomeVero(b)));
  const senzaSpilli = contenute.filter((m) => m.numeroSpilli === 0);
  // I titoli si numerano **una volta sola per il Palazzo**, non una per griglia: le due griglie
  // stanno nella stessa pagina, e numerando ciascuna per conto suo comparivano due «Planimetria
  // non attribuita · 1» a pochi centimetri l'una dall'altra.
  const titoli = new Map(etichetteDistinte(contenute, (t) => senzaPrefisso(t, nome)).map((t, i) => [contenute[i].chiave, t]));
  return <div className="flex flex-col gap-4">
    {conSpilli.length > 0 && <Griglia mappe={conSpilli} nome={nome} titoli={titoli} etichetta={`Aree di ${nome}`} onScendi={onScendi} />}
    {senzaSpilli.length > 0 && <section className="flex flex-col gap-2" aria-label="Planimetrie senza spilli">
      <button type="button" className="btn btn-ghost btn-sm touch self-start" aria-expanded={mostraSenzaSpilli} onClick={() => setMostraSenzaSpilli((v) => !v)}>
        {mostraSenzaSpilli ? 'Nascondi' : 'Mostra'} le planimetrie senza spilli · {senzaSpilli.length}
      </button>
      {mostraSenzaSpilli && <Griglia mappe={senzaSpilli} nome={nome} titoli={titoli} etichetta={`Planimetrie di ${nome} senza spilli`} onScendi={onScendi} />}
    </section>}
  </div>;
}

/** Il nome del Palazzo non si ripete su ogni riquadro: la pagina si chiama gia' cosi'. */
function senzaPrefisso(titolo: string, nome: string): string {
  const p = `${nome} — `;
  return titolo.startsWith(p) ? titolo.slice(p.length) : titolo;
}

function Griglia({ mappe, nome, etichetta, titoli, onScendi }: { mappe: MappaRiassuntoDto[]; nome: string; etichetta: string; titoli?: Map<string, string>; onScendi?: (chiave: string) => void }) {
  // I titoli arrivano già distinti da chi conosce **tutto** l'elenco (le due griglie di un Palazzo
  // sono la stessa pagina); dove non arrivano, si calcolano qui sull'elenco che c'è.
  const propri = titoli ?? new Map(etichetteDistinte(mappe, (t) => senzaPrefisso(t, nome)).map((t, i) => [mappe[i].chiave, t]));
  return <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-3 2xl:grid-cols-4" aria-label={etichetta}>
    {mappe.map((m) => {
      const titolo = propri.get(m.chiave) ?? senzaPrefisso(nomePresentazioneMappa(m), nome);
      const dentro = m.numeroFigli > 0;
      // Dentro il pannello dell'indice, un luogo che ne contiene altri **si apre lì**: cambiare
      // pagina per poi tornare indietro, quando si sta ancora scegliendo dove andare, fa perdere
      // il filo. Quelli che non contengono niente sono la fine della discesa e portano al visore.
      const corpo = <>
        <span className="relative">
          <AnteprimaMappa mappa={m} className="aspect-[4/3] w-full" />
          {/* Il numero degli spilli sta **sull'anteprima**, non sotto il nome: e' il dato che fa
              scegliere quale aprire, e nella riga sotto si perdeva in mezzo al resto. */}
          {m.numeroSpilli > 0 && <span aria-hidden className="chip chip--attivo absolute right-1.5 top-1.5 text-[11px]">{m.numeroSpilli}</span>}
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="text-[13px] font-semibold leading-tight group-hover:text-primary">{titolo}</span>
          <span className="text-[11px] text-text-muted">
            {m.numeroSpilli > 0 ? `${m.numeroSpilli} spilli` : 'nessuno spillo'}{dentro ? ` · ${m.numeroFigli} dentro` : ''}
          </span>
        </span>
      </>;
      const classi = 'card card--cliccabile group flex w-full flex-col gap-2 text-left no-underline text-text';
      return <li key={m.chiave} className="flex">
        {onScendi && dentro
          ? <button type="button" className={`${classi} touch`} onClick={() => onScendi(m.chiave)} aria-label={`Apri ${titolo}: ${m.numeroFigli} mappe dentro`}>{corpo}</button>
          : <Link to={urlMappa(m.chiave)} className={classi}>{corpo}</Link>}
      </li>;
    })}
  </ul>;
}

/** Visore a schermo intero con lo stato della partita attiva. */
function DettaglioMappa({ chiave, partitaId }: { chiave: string; partitaId: number | null }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const spilloIniziale = Number(params.get('spillo')) || null; const puntoIniziale = useMemo(() => centroAccessoMondo(params), [params]);
  const { mappa, caricamento, errore, ricarica, raccolto, statoPunto, acquisto } = useMappaPartita(chiave, partitaId);
  const albero = useCarica(getAlberoMappe, [chiave]);
  const presentata = mappa ? presentaMappa(mappa, params.get('contesto')) : null;
  useDocumentTitle(presentata ? `${presentata.nome} — Mappe` : 'Mappa');
  return (
    <PageState isLoading={caricamento && !mappa} error={errore} onRetry={ricarica}>
      {mappa && <div className="flex flex-col gap-4">

        {!haPlanimetria(mappa) ? <LuogoSenzaPlanimetria mappa={mappa} nome={presentata!.nome} albero={albero} />
         : <><VisoreMappa
          key={`${mappa.chiave}-${spilloIniziale ?? ''}-${params.get('x') ?? ''}-${params.get('y') ?? ''}-${params.get('zoom') ?? ''}`}
          contenutiPannello={<><SelettoreContestoMappa mappa={mappa} selezione={params.get('contesto')} onCambia={id => { const q = new URLSearchParams(params); if (id) q.set('contesto', id); else q.delete('contesto'); setParams(q, { replace: true }); }} />{mappa.gruppoImmagini ? <ImmaginiLuogo mappe={(albero.dati ?? [mappa]).filter(m => m.gruppoImmagini?.id === mappa.gruppoImmagini!.id)} attuale={mappa.chiave} /> : <nav aria-label="Planimetrie del luogo"><Selettore etichetta="Planimetrie" valore={mappa.chiave} opzioni={(albero.dati ?? [mappa]).filter(m => m.chiave === mappa.chiave || (m.genitore === mappa.genitore && !!(m.immagineUrl || m.assetOriginale))).map(m => ({ chiave: m.chiave, nome: nomePresentazioneMappa(m) }))} onCambia={k => navigate(urlMappa(k))} /></nav>}<ContenutiGuidaMappa mappa={mappa.chiave} area={params.get('area')} dungeon={mappa.entita?.tipo === 'dungeon' ? mappa.entita.chiave : undefined} /></>}
          mappa={presentata!}
          partitaId={partitaId}
          selezioneIniziale={spilloIniziale} puntoIniziale={puntoIniziale}
          onNaviga={(k, arrivo) => navigate(urlMappa(k, arrivo))}
          onRaccolto={raccolto}
          onStatoPunto={statoPunto}
          onAcquisto={acquisto}
          onChiudi={() => navigate('/guida/mappe')}
          azioni={<>{mappa.entita && <Link className="btn btn-secondary touch" to={schedaAccessoMondo(mappa.entita.tipo, mappa.entita.chiave)}>Scheda del luogo</Link>}<CollegamentoVisivo to={`/guida/mappe/${encodeURIComponent(mappa.chiave)}/modifica`} tono="secondario" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica mappa" /></>}
        /></>}
        {!haPlanimetria(mappa) && <ContenutiGuidaMappa mappa={mappa.chiave} area={params.get('area')} dungeon={mappa.entita?.tipo === 'dungeon' ? mappa.entita.chiave : undefined} />}
      </div>}
    </PageState>
  );
}
