// ============================================================
// MappaPage — indice delle mappe (albero) e visore a schermo intero di una mappa (Fase 13.2)
// ============================================================

import { ImmaginiLuogo } from '../components/mappe/ImmaginiLuogo';
import { SelettoreContestoMappa } from '../components/mappe/SelettoreContestoMappa';
import { etichetteDistinte, nomePresentazioneMappa, nomeTecnicoMappa, pinDiContenuto, presentaMappa, testoConteggiPin, testoPin, titoloGruppoImmagini } from '../utils/presentazioneMappa';
import { AlberoLuoghi } from '../components/mappe/AlberoLuoghi';
import { ContenutiGuidaMappa } from '../components/mappe/ContenutiGuidaMappa';
import { RisolviMappa } from '../components/mappe/RisolviMappa';
import { haPlanimetria } from '../utils/haPlanimetria';

import { casaConArrivo, casaEQuesta, nomeDellaMeta, urlMappa } from '../utils/navigazioneMappa';
import { useMemo, useState } from 'react';
import { Selettore } from '../components/shared/Selettore';
import type { MappaDto, MappaRiassuntoDto } from '../types';
import { AnteprimaMappa } from '../components/mappe/AnteprimaMappa';
import { centroAccessoMondo, schedaAccessoMondo, titoloSchedaAccessoMondo } from '../utils/accessoMondo';
import { etichettaMappeSorelle, nomeTipoMappa, titoloMappeSorelle } from '../utils/vocabolarioMappe';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useCarica } from '../hooks/useCarica';
import { useMappaPartita } from '../hooks/useMappaPartita';
import { getAlberoMappe, getConteggiAlbero } from '../services/api';
import { usePartitaStore } from '../stores/partitaStore';
import { PageState } from '../components/shared/PageState';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { VisoreMappa } from '../components/mappe/VisoreMappa';
import { CollegamentoVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione, IconaScheda } from '../components/shared/IconaAzione';
import { ritornoMappe } from '../utils/ritornoMappe';

/** Tokyo non ha un visore proprio: la sua mappa è quella disegnata nella Città.
 *
 * Il nodo `tokyo` dell'atlante resta — è il genitore dei quartieri, e senza di lui l'albero non
 * sta in piedi — ma la sua *planimetria* non è più una destinazione: chi ci arrivava vedeva una
 * seconda Tokyo, diversa da quella che aveva appena guardato. Il reindirizzamento è qui e non
 * solo sui collegamenti perché i modi di arrivarci sono tanti (le briciole del visore, «Su:
 * Tokyo», un indirizzo salvato) e vanno tutti a finire nello stesso posto. */
const TOKYO = 'tokyo';
const CITTA = '/guida/citta';

/**
 * Pagina delle mappe: senza chiave nell'URL mostra l'indice; con la chiave `tokyo` (anche quando
 * ci si arriva risolvendo un'altra chiave) reindirizza alla Città; altrimenti risolve la chiave
 * nella mappa vera e ne apre il dettaglio con lo stato della partita attiva.
 *
 * L2 (2026-10-20): ogni mappa ha **una casa**, l'unica pagina che la mostra. Se la casa non è questa pagina — l'illustrazione di un
 * quartiere sta nella pagina del quartiere, una planimetria del mondo nella pagina della sua Area, con la versione — si va lì,
 * portando lo spillo, il punto e il contesto: così ogni indirizzo vecchio (pubbliche, alias, «Sulla mappa» del diario) arriva al
 * posto giusto. Le mappe la cui casa è il visore (Palazzi, Memento) restano qui: nessun giro di redirect.
 */
export function MappaPage() {
  const { chiave } = useParams<{ chiave: string }>();
  const [params] = useSearchParams();
  const attiva = usePartitaStore((s) => s.attiva);
  if (!chiave) return <IndiceMappe />;
  if (chiave === TOKYO) return <Navigate to={CITTA} replace />;
  return <RisolviMappa chiave={chiave}>{(k, casa) => k === TOKYO ? <Navigate to={CITTA} replace />
    : casa && !casaEQuesta(casa, chiave) ? <Navigate to={casaConArrivo(casa, params)} replace />
    : <DettaglioMappa chiave={k} partitaId={attiva?.id ?? null} />}</RisolviMappa>;
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
    /** Mappe e spilli di tutto il sottoalbero sotto una chiave (lei esclusa), con i risultati in cache e l'insieme dei visitati che spezza eventuali cicli contando zero. */
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
    /** R1 (L2): le Aree da verificare (lo staff di Tokyo) nel sottoalbero delle chiavi date, una volta per Area (le sue versioni sono più
     *  mappe), nell'ordine in cui si incontrano. */
    const daVerificare = (chiavi: string[]): Array<{ nome: string; casa: string }> => {
      const trovate = new Map<string, { nome: string; casa: string }>();
      const visti = new Set<string>();
      const coda = [...chiavi];
      while (coda.length) {
        const k = coda.shift()!;
        if (visti.has(k)) continue;
        visti.add(k);
        for (const f of figliDi.get(k) ?? []) {
          if (f.area?.daVerificare && !trovate.has(f.area.chiave)) trovate.set(f.area.chiave, { nome: f.area.nome, casa: f.area.casa });
          coda.push(f.chiave);
        }
      }
      return [...trovate.values()];
    };
    /** E4 (L2): quel che una radice contiene con le parole della gerarchia — quartieri, aree (una volta per Area, le sue versioni sono più
     *  righe di `mappa`), planimetrie —, non il numero di righe di `mappa` («52 mappe» erano 23 quartieri e 29 planimetrie). */
    const contenuto = (chiavi: string[]): string => {
      let quartieri = 0; let planimetrie = 0;
      const aree = new Set<string>();
      const visti = new Set<string>();
      const coda = [...chiavi];
      while (coda.length) {
        const k = coda.shift()!;
        if (visti.has(k)) continue;
        visti.add(k);
        for (const f of figliDi.get(k) ?? []) {
          if (f.tipo === 'quartiere') quartieri++;
          else if (f.tipo !== 'citta') planimetrie++;
          if (f.area) aree.add(f.area.chiave);
          coda.push(f.chiave);
        }
      }
      const parola = (n: number, uno: string, piu: string) => `${n} ${n === 1 ? uno : piu}`;
      if (quartieri > 0) return `${parola(quartieri, 'quartiere', 'quartieri')} · ${parola(aree.size, 'area', 'aree')}`;
      if (aree.size > 0) return `${parola(aree.size, 'area', 'aree')} · ${parola(planimetrie, 'planimetria', 'planimetrie')}`;
      return parola(planimetrie, 'planimetria', 'planimetrie');
    };
    return { conta: (chiave: string) => conta(chiave, new Set()), figliDi, daVerificare, contenuto };
  }, [mappe]);
  const gruppi = useMemo(() => radiciRaggruppate(mappe), [mappe]);
  const totaleMappe = mappe.length;
  // E2 (L3, deciso dall'utente): i pin di tutto l'albero nei tre gruppi, contati dal server (il FE non somma); finché non arrivano
  // l'intestazione dice solo le mappe
  const conteggi = useCarica(() => getConteggiAlbero(), []);
  // Il luogo aperto nel pannello, e la discesa dentro di lui: `['tokyo','citta-shibuya']` vuol
  // dire «sto guardando Shibuya, ci sono arrivato da Tokyo». Il percorso è uno stato della
  // pagina e non dell'indirizzo perché è una sbirciata, non una destinazione: la destinazione è
  // la mappa, e per quella c'è il pulsante che la apre.
  const [percorso, setPercorso] = useState<string[]>([]);
  const gruppoAperto = percorso.length > 0 ? gruppi.find((g) => g.versioni.some((v) => v.chiave === percorso[0])) ?? null : null;
  const nodoAperto = gruppoAperto ? mappe.find((m) => m.chiave === percorso[percorso.length - 1]) ?? null : null;
  /** Il nome con cui presentare una mappa nell'indice: quello del suo gruppo di immagini. */
  const nomeDi = (m: MappaRiassuntoDto) => titoloGruppoImmagini(m);
  // da 1024 px lo spazio fra intestazione ed elenco scende a 12 px: a 1024×690 l'indice sforava di 3 px (LAY2-5)
  return <div className="flex flex-col gap-4 lg:gap-3">
    <IntestazionePagina titolo="Mappe"
      sottotitolo={`Tutte le mappe della guida: Tokyo, i quartieri con le loro aree e le planimetrie dei Palazzi. ${totaleMappe} mappe${conteggi.dati ? ` con ${testoConteggiPin(conteggi.dati.conteggiPin)}` : ''}, raggruppate per il posto a cui appartengono.`} />
    <PageState isLoading={albero.caricamento} error={albero.errore} onRetry={albero.ricarica}>
      {/* **Le radici a sinistra, quel che contengono a destra.**
          Prima ogni radice era una carta con dentro una piega, e aprire i «Luoghi e planimetrie»
          di Tokyo faceva crescere quella cella di quarantasei righe in mezzo a una griglia a tre
          colonne: la carta accanto restava alta due dita, sotto si apriva un buco di mille pixel,
          e l'albero indentato usciva dalla larghezza della colonna. Non era un dettaglio da
          sistemare: una griglia di carte tutte uguali non è il posto dove far crescere un albero.
          Ora le radici sono un elenco stretto e sempre della stessa altezza, e il contenuto del
          luogo scelto sta nel suo pannello, con la sua discesa; il pannello cresce con la pagina,
          senza uno scorrimento suo (UX2-15: una sola barra, quella della pagina). */}
      <div className="grid items-start gap-3 xl:grid-cols-[minmax(240px,300px)_minmax(0,1fr)]">
        <ul className="m-0 grid list-none grid-cols-1 items-start gap-2 p-0 sm:grid-cols-2 xl:grid-cols-1" aria-label="Mappe">
          {gruppi.map(({ chiave, capofila, versioni }) => {
            const sotto = versioni.reduce((acc, v) => {
              const c = totali.conta(v.chiave);
              return { mappe: acc.mappe + c.mappe, spilli: acc.spilli + c.spilli + v.numeroSpilli };
            }, { mappe: 0, spilli: 0 });
            const nome = nomeDi(capofila);
            // E4 ed E5 (L2): i pin con una parola sola (dal rilascio di L3 «pin», `testoPin`), e quel che la radice contiene con le parole
            // della gerarchia. E2 (L3): solo i pin di contenuto della radice e del suo sottoalbero, dal server (`conteggiPin`); passaggi
            // e note nel suggerimento. Le radici dell'indice non hanno versioni raggruppate (una sola per gruppo): vale la capofila.
            // Senza `conteggiPin` (dati di prima) tutti i pin, come prima.
            const pinRadice = capofila.conteggiPin;
            const spilli = testoPin(pinRadice ? pinRadice.contenuto : sotto.spilli);
            const dettaglioPin = pinRadice ? testoConteggiPin(pinRadice) : undefined;
            const riassunto = `${nomeTipoMappa(capofila)} · ${spilli} · ${sotto.mappe > 0 ? totali.contenuto(versioni.map((v) => v.chiave)) : `${versioni.length} versioni`}`;
            const conFigli = versioni.some(v => (totali.figliDi.get(v.chiave) ?? []).length > 0);
            const apribile = conFigli || versioni.length > 1;
            const aperto = gruppoAperto?.chiave === chiave;
            // R1 (L2, decisione del PM): le Aree da verificare sotto questa radice si vedono già sulla sua carta, senza aprire niente
            const daVerificare = totali.daVerificare(versioni.map((v) => v.chiave));
            if (apribile && daVerificare.length > 0) {
              const prima = daVerificare[0];
              // La carta resta il pulsante che apre il pannello, steso su tutta la carta (`after:inset-0`); il chip è un collegamento a sé,
              // sopra di lui: un collegamento dentro un pulsante non si può tenere né toccare da solo.
              return <li key={chiave} className="flex">
                {/* da 1280 px (elenco in una colonna da 300) una griglia di due righe: il chip sotto i conteggi, che così stanno interi su una
                    riga (LAY2-7); sotto, una riga sola col chip a destra */}
                <div className={`card card--cliccabile relative flex w-full items-center gap-3 lg:max-xl:gap-2 xl:grid xl:grid-cols-[72px_minmax(0,1fr)_auto] xl:gap-x-3 xl:gap-y-1 ${aperto ? 'border-primary bg-primary-bg' : ''}`}>
                  <AnteprimaMappa mappa={capofila} className="h-[52px] w-[72px] shrink-0 xl:row-span-2" />
                  {/* da 1024 a 1279 px niente spazio fra nome e conteggi: i conteggi vanno a capo (mai coi puntini, LAY2-7) e la colonna resta
                      nell'altezza dell'anteprima, così l'indice sta in una schermata a 1024×690 (LAY2-5) */}
                  <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 lg:max-xl:gap-0 xl:col-start-2 xl:row-start-1">
                    <button type="button" aria-expanded={aperto} onClick={() => setPercorso(aperto ? [] : [capofila.chiave])}
                      // niente `touch` qui: il bersaglio è la carta intera (`after:inset-0`), e 44 px di riga facevano crescere la carta
                      className={`text-left font-display text-[17px] leading-tight break-words after:absolute after:inset-0 after:content-[''] ${aperto ? 'text-primary' : ''}`}>
                      {nome}<span className="sr-only">, {riassunto}</span>
                    </button>
                    <span className="max-w-full text-[11px] leading-tight text-text-muted" aria-hidden title={dettaglioPin}>{riassunto}</span>
                  </span>
                  {/* a destra, prima della freccia: alto 44 (il bersaglio) sta nell'altezza dell'anteprima e la carta non cresce (a 1024×690
                      l'indice deve stare in una schermata, LAY2-5) */}
                  <Link to={prima.casa} className="chip chip--attivo touch relative z-10 shrink-0 text-[11px] no-underline xl:col-start-2 xl:row-start-2 xl:justify-self-start" title="Nessuna fonte colloca questa area: decidi se tenerla o rimuoverla"
                    aria-label={`${daVerificare.length} da verificare: ${daVerificare.map((a) => a.nome).join(', ')}`}>{daVerificare.length} da verificare</Link>
                  <span aria-hidden className="shrink-0 text-text-muted xl:col-start-3 xl:row-span-2 xl:row-start-1">{aperto ? '▾' : '▸'}</span>
                </div>
              </li>;
            }
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
                      <span className="text-[11px] text-text-muted" title={dettaglioPin}>{riassunto}</span>
                    </span>
                    <span aria-hidden className="shrink-0 text-text-muted">{aperto ? '▾' : '▸'}</span>
                  </button>
                : <Link to={capofila.chiave === TOKYO ? CITTA : capofila.casa || urlMappa(capofila.chiave)} className="card card--cliccabile flex w-full items-center gap-3 no-underline text-text">
                    <AnteprimaMappa mappa={capofila} className="h-[52px] w-[72px] shrink-0" />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="font-display text-[17px] leading-tight break-words">{nome}</span>
                      <span className="text-[11px] text-text-muted" title={dettaglioPin}>{nomeTipoMappa(capofila)} · {spilli}</span>
                    </span>
                  </Link>}
            </li>;
          })}
        </ul>
        {gruppoAperto && nodoAperto
          ? <PannelloLuogo mappe={mappe} figliDi={totali.figliDi} gruppo={gruppoAperto} percorso={percorso}
              nodo={nodoAperto} nome={nomeDi(nodoAperto)} onPercorso={setPercorso} onChiudi={() => setPercorso([])} />
          : <p className="card m-0 hidden text-[13px] text-text-muted xl:block" role="status">
              Scegli una mappa a sinistra per vedere che cosa contiene: quartieri, aree, planimetrie. Da qui si apre la mappa vera e propria.
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
  // la casa del posto (L2): Tokyo è La città, un quartiere la sua pagina, una planimetria la pagina della sua Area
  const destinazione = nodo.chiave === TOKYO ? CITTA : nodo.casa || urlMappa(nodo.chiave);
  return <section className="card flex min-w-0 flex-col gap-3" aria-label={`Dentro ${nome}`}>
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <nav aria-label="Percorso" className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-[12px] text-text-muted">
        {briciole.map((b, i) => <span key={b.chiave} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden>›</span>}
          {i === briciole.length - 1
            ? <span className="font-display text-[16px] uppercase leading-none text-text">{titoloGruppoImmagini(b)}</span>
            : <button type="button" className="touch text-text-secondary underline decoration-dotted underline-offset-2" onClick={() => onPercorso(percorso.slice(0, i + 1))}>{titoloGruppoImmagini(b)}</button>}
        </span>)}
      </nav>
      {/* il gesto porta il nome del posto (L2, M6): «Apri Tokyo», «Apri Shibuya» */}
      <Link to={destinazione} className="btn btn-primary btn-sm touch">Apri {nomeDellaMeta({ nome: nome, area: nodo.area })}</Link>
      <button type="button" className="btn btn-ghost btn-sm touch xl:hidden" onClick={onChiudi}>Chiudi</button>
    </div>
    {/* Le versioni dello stesso luogo — la porzione occidentale, la planimetria intera — sono
        varianti di una figura sola: stanno insieme, in cima, e non sparse fra i figli. */}
    {alRadice && gruppo.versioni.length > 1 && <ImmaginiLuogo mappe={gruppo.versioni} nome={nome} />}
    {/* UX2-15 (L2): nessun riquadro scorrevole qui dentro. Con la griglia in un riquadro alto il 72% dello schermo le barre
        erano due (pagina e pannello) e il fondo del pannello stava sotto lo schermo: la griglia cresce con la pagina, che è
        l'unica a scorrere. */}
    {contenute.length > 0
      ? <div className="p-1">
          <GriglieDelLuogo contenute={contenute} nome={nome} onScendi={(k) => onPercorso([...percorso, k])} />
        </div>
      : <p className="m-0 text-[13px] text-text-muted" role="status">Qui dentro non ci sono altre planimetrie: c’è solo questa.</p>}
    {/* La discesa a riquadri mostra un piano per volta, ed è il modo giusto per scegliere dove
        andare. Chi invece **cerca un nome** — «dov'è finita la banchina di Yongen-Jaya?» — ha
        bisogno di vedere tutto insieme: l'albero completo resta qui sotto, chiuso. Aperto cresce
        con la pagina, senza uno scorrimento suo (UX2-15: una sola barra). */}
    {contenute.length > 0 && <details className="border-t border-border-light pt-2">
      {/* UX3-7 (L3, scelta (a)): il titolo dice quel che c'è sotto; «con tutti i livelli» prometteva le versioni, che qui non ci sono */}
      <summary className="touch cursor-pointer text-[12px] text-text-muted">{nodo.tipo === 'citta' ? 'Elenco dei quartieri e delle aree' : 'Elenco delle aree'}</summary>
      <div className="mt-2 p-1">
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
function LuogoSenzaPlanimetria({ mappa, nome, albero, partitaId }: {
  mappa: MappaDto; nome: string; albero: ReturnType<typeof useCarica<MappaRiassuntoDto[]>>; partitaId: number | null;
}) {
  const contenute = useMemo(
    () => (albero.dati ?? []).filter((m) => m.genitore === mappa.chiave).sort((a, b) => a.ordine - b.ordine || a.chiave.localeCompare(b.chiave)),
    [albero.dati, mappa.chiave],
  );
  const nodo = (albero.dati ?? []).find((m) => m.chiave === mappa.chiave);
  const pinLuogo = nodo ? pinDiContenuto(nodo) : mappa.numeroSpilli;
  return <div className="flex flex-col gap-4">
    <header className="card flex flex-col gap-2">
      <nav aria-label="Percorso della mappa" className="flex flex-wrap items-center gap-1 text-[12px] text-text-muted">
        {mappa.percorso.map((p, i) => <span key={p.chiave} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden>›</span>}
          {i === mappa.percorso.length - 1
            ? <span className="text-text">{p.nome}</span>
            : <Link to={urlMappa(p.chiave)} className="text-text-secondary">{p.nome}</Link>}
        </span>)}
      </nav>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <h1 className="titolo-display m-0 break-words">{nome}</h1>
        <span className="chip text-[11px]">{nomeTipoMappa(mappa)}</span>
        {/* L0: le mappe contenute si contano con la parola della gerarchia (quartieri di Tokyo, aree di un quartiere, planimetrie
            di un Palazzo); i Memento non ne hanno e non le contano */}
        {mappa.tipo !== 'dedalo' && <span className="text-[12px] text-text-muted">
          {mappa.tipo === 'citta'
            ? (contenute.length === 0 ? 'nessun quartiere' : contenute.length === 1 ? 'un quartiere' : `${contenute.length} quartieri`)
            : mappa.tipo === 'quartiere'
              ? (contenute.length === 0 ? 'nessuna area' : contenute.length === 1 ? 'un’area' : `${contenute.length} aree`)
              : (contenute.length === 0 ? 'nessuna planimetria' : contenute.length === 1 ? 'una planimetria' : `${contenute.length} planimetrie`)}
          {/* E2 (L3): i pin di contenuto del luogo, dal suo nodo dell'albero (`conteggiPin`); senza, i suoi pin come prima */}
          {pinLuogo > 0 ? ` · ${testoPin(pinLuogo)}` : ''}
        </span>}
      </div>
      {/* Va detto, invece di lasciarlo capire dall'assenza: questo nodo raccoglie, non disegna. */}
      {contenute.length > 0 && <p className="m-0 text-[13px] text-text-secondary">Questa mappa non ha una pianta sua: raccoglie le mappe qui sotto.</p>}
      <div className="flex flex-wrap gap-2">
        {mappa.entita && <CollegamentoVisivo to={schedaAccessoMondo(mappa.entita.tipo, mappa.entita.chiave)} tono="secondario" compatto icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo={titoloSchedaAccessoMondo(mappa.entita.tipo, mappa.entita.chiave, mappa.nome)} />}
        <CollegamentoVisivo to={`/guida/mappe/${encodeURIComponent(mappa.chiave)}/modifica`} tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica mappa" />
        <TornaAllaPartita partitaId={partitaId} />
      </div>
    </header>
    <PageState isLoading={albero.caricamento} error={albero.errore} onRetry={albero.ricarica}>
      {contenute.length > 0
        ? <GriglieDelLuogo contenute={contenute} nome={nome} />
        : <p className="m-0 text-[13px] text-text-muted" role="status">{mappa.tipo === 'dedalo' ? 'I Memento non hanno planimetrie: i piani si generano a ogni discesa, e i dedali stanno nella loro scheda.' : 'Qui non c’è ancora nessuna planimetria. Puoi aggiungerne una dall’editor.'}</p>}
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
 * Qui davanti vanno **le aree con un nome vero**, con o senza pin (UX3-8, L3), e i fogli
 * dell'estrazione senza nome e senza pin finiscono in un gruppo che si apre a richiesta. Non si
 * buttano: sono planimetrie vere, servono a chi cura l'atlante, ma non sono la risposta alla
 * domanda «dove devo andare».
 */
function GriglieDelLuogo({ contenute: tutte, nome, onScendi }: { contenute: MappaRiassuntoDto[]; nome: string; onScendi?: (chiave: string) => void }) {
  const [mostraFogli, setMostraFogli] = useState(false);
  // Sotto un quartiere si elencano le **aree**, una volta sola (L2): le versioni della stessa Area (il Sottopasso, il Covo) sono un
  // riquadro solo, con la predefinita e «N versioni»; i pin dell'Area si sommano su quel riquadro. E2 (L3): i pin del riquadro sono
  // quelli di contenuto contati dal server (`conteggiPin.contenuto`, `pinDiContenuto`), messi in `numeroSpilli` del riquadro; la sola
  // somma qui è quella delle versioni di un'Area in un riquadro, com'era.
  const { contenute, versioni } = useMemo(() => {
    const conteggio = new Map<string, number>();
    const spilli = new Map<string, number>();
    for (const m of tutte) if (m.area) { conteggio.set(m.area.chiave, (conteggio.get(m.area.chiave) ?? 0) + 1); spilli.set(m.area.chiave, (spilli.get(m.area.chiave) ?? 0) + pinDiContenuto(m)); }
    const scelte = new Map<string, MappaRiassuntoDto>();
    const elenco: MappaRiassuntoDto[] = [];
    for (const m of tutte) {
      if (!m.area) { elenco.push(m); continue; }
      const gia = scelte.get(m.area.chiave);
      if (!gia) { scelte.set(m.area.chiave, m); elenco.push(m); }
      else if (m.area.predefinita) { elenco[elenco.indexOf(gia)] = m; scelte.set(m.area.chiave, m); }
    }
    return { contenute: elenco.map((m) => ({ ...m, numeroSpilli: m.area ? spilli.get(m.area.chiave) ?? pinDiContenuto(m) : pinDiContenuto(m) })), versioni: conteggio };
  }, [tutte]);
  // UX3-8 (decisione del Manager, 2026-10-20; l'utente non trovava la planimetria di prova appena aggiunta): ogni Area o planimetria
  // con un nome vero sta nella griglia, nel suo ordine, anche senza pin («nessun pin»). I fogli dell'estrazione senza nome vero
  // («Planimetria non attribuita») vanno in fondo se hanno pin, e in un gruppo chiuso se non ne hanno: servono a chi cura l'atlante,
  // non sono la risposta alla domanda «dove devo andare».
  const nominate = contenute.filter((m) => !nomeTecnicoMappa(m));
  const tecnicheConPin = contenute.filter((m) => nomeTecnicoMappa(m) && m.numeroSpilli > 0);
  const tecnicheSenzaPin = contenute.filter((m) => nomeTecnicoMappa(m) && m.numeroSpilli === 0);
  const inGriglia = [...nominate, ...tecnicheConPin];
  // I titoli si numerano **una volta sola per il Palazzo**, non una per griglia: le due griglie
  // stanno nella stessa pagina, e numerando ciascuna per conto suo comparivano due «Planimetria
  // non attribuita · 1» a pochi centimetri l'una dall'altra.
  const titoli = new Map(etichetteDistinte(contenute, (t) => senzaPrefisso(t, nome)).map((t, i) => [contenute[i].chiave, t]));
  return <div className="flex flex-col gap-4">
    {inGriglia.length > 0 && <Griglia mappe={inGriglia} nome={nome} titoli={titoli} etichetta={`Contenuto di ${nome}`} onScendi={onScendi} versioni={versioni} />}
    {tecnicheSenzaPin.length > 0 && <section className="flex flex-col gap-2" aria-label="Fogli dell’estrazione senza nome">
      <button type="button" className="btn btn-ghost btn-sm touch self-start" aria-expanded={mostraFogli} onClick={() => setMostraFogli((v) => !v)}>
        {mostraFogli ? 'Nascondi' : 'Mostra'} i fogli dell’estrazione senza nome · {tecnicheSenzaPin.length}
      </button>
      {mostraFogli && <Griglia mappe={tecnicheSenzaPin} nome={nome} titoli={titoli} etichetta={`Fogli dell’estrazione senza nome di ${nome}`} onScendi={onScendi} versioni={versioni} />}
    </section>}
  </div>;
}

/** Il nome del Palazzo non si ripete su ogni riquadro: la pagina si chiama gia' cosi'. */
function senzaPrefisso(titolo: string, nome: string): string {
  const p = `${nome} — `;
  return titolo.startsWith(p) ? titolo.slice(p.length) : titolo;
}

/**
 * Una griglia di anteprime di mappe con il titolo (quello già distinto se arriva, altrimenti
 * calcolato qui senza il nome del Palazzo), il numero di spilli sull'anteprima e quante mappe
 * contiene. Con `onScendi`, una mappa che ne contiene altre diventa un pulsante che scende nel
 * pannello; le altre sono collegamenti al visore.
 */
function Griglia({ mappe, nome, etichetta, titoli, onScendi, versioni }: { mappe: MappaRiassuntoDto[]; nome: string; etichetta: string; titoli?: Map<string, string>; onScendi?: (chiave: string) => void; versioni?: Map<string, number> }) {
  // I titoli arrivano già distinti da chi conosce **tutto** l'elenco (le due griglie di un Palazzo
  // sono la stessa pagina); dove non arrivano, si calcolano qui sull'elenco che c'è.
  const propri = titoli ?? new Map(etichetteDistinte(mappe, (t) => senzaPrefisso(t, nome)).map((t, i) => [mappe[i].chiave, t]));
  return <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-3 2xl:grid-cols-4" aria-label={etichetta}>
    {mappe.map((m) => {
      // una planimetria di un'Area si presenta col nome dell'Area, e con quante versioni ha (L2)
      const titolo = m.area?.nome ?? propri.get(m.chiave) ?? senzaPrefisso(nomePresentazioneMappa(m), nome);
      const nVersioni = m.area ? versioni?.get(m.area.chiave) ?? 1 : 1;
      const dentro = m.numeroFigli > 0;
      // Dentro il pannello dell'indice, un luogo che ne contiene altri **si apre lì**: cambiare
      // pagina per poi tornare indietro, quando si sta ancora scegliendo dove andare, fa perdere
      // il filo. Quelli che non contengono niente sono la fine della discesa e portano al visore.
      const corpo = <>
        <span className="relative">
          <AnteprimaMappa mappa={m} className="aspect-[4/3] w-full" sizes="(min-width: 1536px) 25vw, (min-width: 768px) 33vw, 50vw" />
        </span>
        <span className="flex flex-col gap-0.5">
          {/* Il numero dei pin è il dato che fa scegliere quale aprire: sta in evidenza accanto al nome. Stava sull'anteprima, ma
              con le miniature ritagliate sul disegno (UX2-13) ne copriva un angolo (residuo di L2, ripreso in L3). Decisione del PM
              dopo Test UX: i pin si dicono una volta sola, nel riquadro rosso («N pin», «1 pin», «nessun pin»); sotto restano versioni e
              contenuto, se ci sono. Il titolo tiene almeno 7rem: in una carta stretta (telefono) il riquadro va sotto il titolo invece di
              schiacciarlo sillaba per sillaba. */}
          <span className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
            <span className="min-w-0 flex-[1_1_7rem] break-words text-[13px] font-semibold leading-tight group-hover:text-primary">{titolo}</span>
            <span className="chip chip--attivo shrink-0 text-[11px]">{testoPin(m.numeroSpilli)}</span>
          </span>
          {(nVersioni > 1 || dentro) && <span className="text-[11px] text-text-muted">
            {[nVersioni > 1 ? `${nVersioni} versioni` : null, dentro ? `${m.numeroFigli} dentro` : null].filter(Boolean).join(' · ')}
          </span>}
        </span>
      </>;
      const classi = 'card card--cliccabile group flex w-full flex-col gap-2 text-left no-underline text-text';
      return <li key={m.chiave} className="flex">
        {onScendi && dentro
          ? <button type="button" className={`${classi} touch`} onClick={() => onScendi(m.chiave)} aria-label={`Apri ${titolo}: ${m.numeroFigli} ${m.tipo === 'quartiere' ? (m.numeroFigli === 1 ? 'area' : 'aree') : (m.numeroFigli === 1 ? 'planimetria' : 'planimetrie')} dentro`}>{corpo}</button>
          : <Link to={m.casa || urlMappa(m.chiave)} className={classi}>{corpo}</Link>}
      </li>;
    })}
  </ul>;
}

/**
 * «Torna alla partita» (richiesta dell'utente, 2026-10-04): dal visualizzatore della mappa alla pagina Partita, sulla scheda
 * «Oggi» (correzione dell'utente: «io avevo chiesto di rimandare alla partita»; prima portava alla Home). Solo con una partita
 * attiva; «Chiudi» resta il ritorno alla pagina da cui si è entrati nelle mappe.
 */
function TornaAllaPartita({ partitaId }: { partitaId: number | null }) {
  if (partitaId === null) return null;
  return <CollegamentoVisivo to="/partita?scheda=oggi" tono="fantasma" compatto icona={<IconaScheda chiave="oggi" dimensione={20} />} titolo="Torna alla partita" />;
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

        {!haPlanimetria(mappa) ? <LuogoSenzaPlanimetria mappa={mappa} nome={presentata!.nome} albero={albero} partitaId={partitaId} />
         : <><VisoreMappa
          key={`${mappa.chiave}-${spilloIniziale ?? ''}-${params.get('x') ?? ''}-${params.get('y') ?? ''}-${params.get('zoom') ?? ''}`}
          contenutiPannello={<><SelettoreContestoMappa mappa={mappa} selezione={params.get('contesto')} onCambia={id => { const q = new URLSearchParams(params); if (id) q.set('contesto', id); else q.delete('contesto'); setParams(q, { replace: true }); }} />{mappa.gruppoImmagini ? <ImmaginiLuogo mappe={(albero.dati ?? [mappa]).filter(m => m.gruppoImmagini?.id === mappa.gruppoImmagini!.id)} attuale={mappa.chiave} /> : <nav aria-label={etichettaMappeSorelle(mappa.tipo)}><Selettore etichetta={titoloMappeSorelle(mappa.tipo)} valore={mappa.chiave} opzioni={(albero.dati ?? [mappa]).filter(m => m.chiave === mappa.chiave || (m.genitore === mappa.genitore && haPlanimetria(m))).map(m => ({ chiave: m.chiave, nome: nomePresentazioneMappa(m) }))} onCambia={k => navigate(urlMappa(k))} /></nav>}<ContenutiGuidaMappa mappa={mappa.chiave} area={params.get('area')} dungeon={mappa.entita?.tipo === 'dungeon' ? mappa.entita.chiave : undefined} /></>}
          mappa={presentata!}
          partitaId={partitaId}
          selezioneIniziale={spilloIniziale} puntoIniziale={puntoIniziale}
          onNaviga={(k, arrivo) => navigate(urlMappa(k, arrivo))}
          onRaccolto={raccolto}
          onStatoPunto={statoPunto}
          onAcquisto={acquisto}
          onChiudi={() => navigate(ritornoMappe() ?? '/guida/mappe')}
          ritorno={<TornaAllaPartita partitaId={partitaId} />}
          azioni={<>{mappa.entita && <Link className="btn btn-secondary touch" to={schedaAccessoMondo(mappa.entita.tipo, mappa.entita.chiave)}>{titoloSchedaAccessoMondo(mappa.entita.tipo, mappa.entita.chiave, mappa.nome)}</Link>}<CollegamentoVisivo to={`/guida/mappe/${encodeURIComponent(mappa.chiave)}/modifica`} tono="secondario" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica mappa" /></>}
        /></>}
        {!haPlanimetria(mappa) && <ContenutiGuidaMappa mappa={mappa.chiave} area={params.get('area')} dungeon={mappa.entita?.tipo === 'dungeon' ? mappa.entita.chiave : undefined} />}
      </div>}
    </PageState>
  );
}
