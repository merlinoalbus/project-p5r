// ============================================================
// VisoreMappa — visore a schermo intero (o incorporato) di una mappa a livelli (Fase 13.2)
// ============================================================
//
// Zoom con minimo «adatta» (rotellina attorno al cursore, pulsanti, pinch), trascinamento, doppio click per adattare; spilli con icona per
// tipo a dimensione costante (scala inversa allo zoom) e raggruppamento «+n» degli spilli più vicini di un bersaglio; legenda con filtri e conteggi, ricerca,
// scheda dello spillo con le azioni dell'entità collegata; navigazione fra i livelli (percorso, mappe figlie, passaggi). In uso normale nessun
// click sulla mappa modifica i dati: l'editor (13.3) passa i propri strumenti tramite `editor`. Che cosa dicono la scheda e il popup di uno
// spillo sta in `SchedaSpillo`; i nomi dei pin di spostamento sulla tela li posa `sistemaEtichette` (`etichetteSpilli`).
// ============================================================

import { areaImmagine, inquadraturaMappa, type AreaMappa } from '../../utils/inquadraturaMappa';
import { areaConPezzi, copiePosate, mascheraZone, nomeCopia, posaDi, statoPezzo, stileImmagineMascherata, stilePezzo } from '../../utils/pezziMappa';
import { ALTEZZA_GOCCIA, raggruppaSpilli, type Punto } from '../../utils/raggruppaSpilli';
import { annotaPassaggio, consumaPassaggio, passaggioVerso } from '../../utils/passaggioMappe';
import { NavigazioneSpillo } from './NavigazioneSpillo';
import { arrivoSpillo, nomeDellaMeta, type NavigaMappa } from '../../utils/navigazioneMappa';
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { MappaDto, SpilloDto } from '../../types';
import { DEFINIZIONI_SPILLO, TIPI_SPILLO, categoriaSpillo, statoDelPin, type TipoSpillo } from '../../../shared/spilli';
import { useImmagineMappa } from '../../hooks/useImmagineMappa';
import { useMedia } from '../../hooks/useMedia';
import { comportamentoScorrimento } from '../../utils/movimento';
import { ingombroPezzo } from '../../../shared/pezziMappa';
import { IconaSpillo, PuntoSpillo, SpilloGrafico } from './IconaSpillo';
import { PulsanteVisivo, CollegamentoVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione, IconaSegno } from '../shared/IconaAzione';
import { SegnoStato } from '../shared/SegnoStato';
import { IconMappa } from '../shared/iconeGuida';
import { Selettore } from '../shared/Selettore';
import { ChipDisponibilita } from '../guida/ChipDisponibilita';
import { CondizioniSpilloElenco } from './CondizioniSpillo';
import type { DivergenzaDaVerificare } from '../guida/FinestraDaVerificare';
import { GuidaNelVisore } from './GuidaNelVisore';
import { useSuggerimenti } from '../../stores/suggerimentiStore';
import { descrizioneImmagineMappa, nomeFiglieMappa, nomeTipoMappa, titoloMappeVicine } from '../../utils/vocabolarioMappe';
import { AzioniStato, GalleriaSpillo, ImmagineRiferimento, MerceNelPopup, SchedaSpillo, type StatoPuntoMappa } from './SchedaSpillo';
import { nomePin, parolaSegnato, passaggioConArrivo, segnoSpillo } from '../../utils/paroleSpillo';
import { sistemaEtichette } from './etichetteSpilli';

export type { StatoPuntoMappa } from './SchedaSpillo';

/** Strumento attivo dell'editor: selezione e spostamento, aggiunta di un nuovo spillo, incolla dello spillo copiato, ritaglio di
 *  un pezzo della planimetria (102: si trascina un rettangolo sull'immagine). */
export type StrumentoEditor = 'seleziona' | 'aggiungi' | 'incolla' | 'ritaglia';

/** I pezzi della planimetria nell'editor (102): selezione, ritaglio di una zona, spostamento. Coordinate in pixel dell'immagine.
 *  Dalla 103 si seleziona e si sposta una **copia** (gli id sono delle copie); la zona tratteggiata evidenziata è del suo pezzo. */
export interface StrumentiPezzi {
  /** La copia selezionata. */
  selezionatoId: number | null;
  onSeleziona: (copiaId: number | null) => void;
  /** Rettangolo trascinato con lo strumento «ritaglia» (almeno 2 × 2 px, dentro l'immagine). */
  onRitaglia: (zona: { x: number; y: number; larghezza: number; altezza: number }) => void;
  /** Fine del trascinamento di una copia (strumento «seleziona»): il nuovo angolo in alto a sinistra. */
  onSposta: (copiaId: number, x: number, y: number) => void;
}

export interface StrumentiEditor {
  strumento: StrumentoEditor;
  selezionatoId: number | null;
  onSeleziona: (id: number | null) => void;
  /** Click sulla mappa con lo strumento «aggiungi» o «incolla»: coordinate in percentuale dell'immagine. */
  onClickMappa: (x: number, y: number) => void;
  /** Fine del trascinamento di uno spillo (strumento «seleziona»). */
  onSposta: (id: number, x: number, y: number) => void;
  /** Doppio clic su uno spillo di spostamento: apre la mappa d'arrivo, sempre in modifica. Nel
   * visore basta un clic, ma qui il clic seleziona per modificare: senza questo, per visitare il
   * passaggio appena messo bisognava cercare un pulsante in fondo al pannello. */
  onVisita?: (mappa: string) => void;
  /** I pezzi della planimetria (102): senza, i pezzi nell'editor si vedono ma non si toccano. */
  pezzi?: StrumentiPezzi;
}

interface Props {
  mappa: MappaDto;
  partitaId: number | null;
  /** Apertura di un'altra mappa (percorso, figlie, passaggi). */
  onNaviga: NavigaMappa;
  /** Cambio dello stato di uno spillo nella partita (la parola del suo tipo — raccolto, aperto, parlato, incontrato, azionato…: `statoDelPin`). */
  onRaccolto?: (spillo: SpilloDto, raccolto: boolean) => Promise<void> | void;
  /** Stato nella Guida di una voce (un punto di dungeon) collegata allo spillo (ottenuto, esaurito, riaperto): un pin può averne più d'una (098). */
  onStatoPunto?: (spillo: SpilloDto, voce: string, stato: StatoPuntoMappa) => Promise<void> | void;
  /** Acquisto (o riapertura) di un articolo del negozio collegato allo spillo. */
  onAcquisto?: (spillo: SpilloDto, articoloChiave: string, fatto: boolean) => Promise<void> | void;
  onAcquistiCambiati?: () => Promise<void> | void;
  /** L4 (§4.2): apre la finestra «Da verificare» di un pin fatto con una voce non fatta (la apre chi monta il visore). */
  onDaVerificare?: (d: DivergenzaDaVerificare) => void;
  /** L4 §4.2 (§1.4): l'infiltrazione di contesto scelta nel popup di un pin di voci di più infiltrazioni; chi ospita il visore rilegge la
   *  mappa in quell'infiltrazione. Senza, «Stato nella …» resta un testo. */
  onContesto?: (infiltrazione: string) => void;
  onChiudi?: () => void;
  /** Testo del pulsante di chiusura (predefinito «Chiudi»; «Torna alla pagina» per lo schermo intero aperto da una pagina). */
  etichettaChiudi?: string;
  /** Altezza fissa dentro una pagina (home della Partita) invece dello schermo intero. */
  incorporato?: boolean;
  /** Azioni aggiuntive nella barra superiore (es. «Modifica mappa»). */
  azioni?: ReactNode;
  /** Il ritorno alla partita (2026-10-04): nella barra subito prima di «Chiudi», dopo «Pannello». */
  ritorno?: ReactNode;
  editor?: StrumentiEditor;
  /** Nell'editor: applica lo stesso filtro del visore, cioè mostra solo quel che c'è **nel giorno
   *  corrente** della partita attiva. L'editor di regola vede tutto, perché deve poter modificare
   *  anche ciò che nel mondo non c'è ancora; con questo acceso si controlla, senza uscire dalla
   *  modifica, come apparirà la mappa a chi la consulta oggi. Serve una partita attiva. */
  vistaGiornoCorrente?: boolean;
  /** Spillo da selezionare e centrare all'apertura (es. dall'azione della guida). */
  selezioneIniziale?: number | null;
  /** La selezione iniziale l'ha chiesta un **comando** di chi guarda (un tocco su «Luoghi qui» dell'Area), non un indirizzo: se il pin
   *  non è disponibile adesso, la vista dei non disponibili si accende per mostrarlo (UX2-2, L2). Un indirizzo da solo non lo rivela. */
  rivelaSelezione?: boolean;
  puntoIniziale?: {x:number;y:number;zoom:number}|null;
  /** Contenuto del pannello laterale al posto di quello predefinito (editor). */
  pannello?: ReactNode;
  /** Controlli e contenuti accessibili anche nel visore a schermo intero. */
  contenutiPannello?: ReactNode;
  /** Pannello aperto all'inizio anche nel visore incorporato (la pagina dell'Area, L2: «Luoghi qui» è il suo contenuto). */
  pannelloIniziale?: boolean;
  /** Avvisa chi ospita il visore quando l'utente apre o chiude il pannello (la pagina dell'Area ricorda la scelta finché resta lì). */
  onPannello?: (aperto: boolean) => void;
  /** Nella barra il solo titolo (questo), senza le briciole: chi ospita il visore le mostra già (la pagina dell'Area, L2). */
  titolo?: string;
  /** Senza la sezione «Su: …» e delle figlie nel pannello: chi ospita il visore porta le sue (le «Aree vicine» dell'Area, L2). */
  senzaVicine?: boolean;
  /** Elemento davanti al percorso nella barra (es. targhetta «Modifica»). */
  intestazione?: ReactNode;
  className?: string;
  /** Modalità **scelta** (2026-10-01): la mappa serve a scegliere dei pin per una voce della guida, e ci sta dentro. Il
   *  tocco su un pin chiama `onScegli` invece di aprirne il popup; i pin scelti restano evidenziati; si vedono tutti i pin,
   *  raccolti e non ancora disponibili compresi (si sceglie un posto, non si consulta il giorno; con `attenuaNascosti` quelli
   *  sbiaditi). Resta la sola mappa: la testata no, i comandi (planimetria, ricerca, «Fatto») li porta chi la apre — dal
   *  2026-10-18 la barra del collegamento sopra la mappa principale della scheda del Palazzo —, e la ricerca arriva da lì. */
  scelta?: SceltaPin;
  /** L3 RG-1: la guida da usare (pulsante «Guida» nella barra, `GuidaNelVisore`), su ogni mappa che può avere voci della guida (le planimetrie
   *  dei Palazzi, le mappe con pin collegati a voci); `onCambiato` avvisa chi ospita il visore di uno stato salvato dalla guida (rilegge la
   *  mappa). `versione`: cambia quando la pagina ospite salva qualcosa che la guida mostra e che i pin non dicono (una cattura con le piastrelle
   *  della scheda): la guida si rilegge in silenzio. Senza, il pulsante non c'è. */
  guida?: { onCambiato?: () => void; versione?: string | number };
  /** Falso: la selezione iniziale evidenzia e centra il pin senza aprirne il popup, che si apre al primo tocco (la pagina del luogo, L5:
   *  la pagina dice già tutto quel che il popup direbbe, e su una tela bassa il popup diventava un foglio sopra la pagina). */
  popupIniziale?: boolean;
  /** L5 (F3): «Mostra anche i non ancora disponibili» condiviso con chi ospita il visore (la pagina dell'Area e il suo «Luoghi qui»). Senza,
   *  l'interruttore è del visore. */
  nonDisponibili?: { valore: boolean; onCambia: (v: boolean) => void };
}

/** Vedi `Props.scelta`. */
export interface SceltaPin {
  /** Per chi si sceglie (la voce della guida): sta nel nome accessibile dei pin. */
  titolo: string;
  scelti: ReadonlySet<number>;
  onScegli: (spillo: SpilloDto) => void;
  /** Il testo cercato nei comandi della voce: filtra i pin sulla mappa. */
  ricerca?: string;
  /** Mentre si salva un tocco: i pin non rispondono. */
  occupato?: boolean;
  /** I pin che fuori dalla scelta sarebbero nascosti (raccolti, anche per le voci di altre aree, o non ancora disponibili) si
   *  vedono sbiaditi, per distinguerli (scelta dell'utente, 2026-10-18: «i pin nascosti in un altro colore»). */
  attenuaNascosti?: boolean;
}

const FATTORE_ZOOM_MASSIMO = 8;
const PASSO_ROTELLA = 1.15;
/** «2 spilli vicini», ma «1 spillo vicino»: la pastiglia può restare a uno solo quando nell'editor
 *  il pin selezionato esce dalla nube per essere trascinato. */
const nomeGruppo = (n: number) => (n === 1 ? '1 spillo vicino' : `${n} spilli vicini`);
/** Le figlie di una mappa nel pannello, una per posto: le versioni della stessa Area (il Sottopasso ne ha due) sono un'Area sola,
 *  rappresentata dalla sua predefinita (o dalla prima che arriva); le altre figlie restano com'erano (L2). */
function figliPerArea(figli: MappaDto['figli']): MappaDto['figli'] {
  const viste = new Map<string, number>();
  const esito: MappaDto['figli'] = [];
  for (const f of figli) {
    if (!f.area) { esito.push(f); continue; }
    const i = viste.get(f.area.chiave);
    if (i === undefined) { viste.set(f.area.chiave, esito.length); esito.push(f); }
    else if (f.area.predefinita) esito[i] = f;
  }
  return esito;
}
const DIMENSIONE_RISERVA = 1000;

interface Dimensioni { w: number; h: number }

/** Riporta `v` dentro l'intervallo [min, max]. */
const limita = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Larghezza del popup dello spillo sul desktop (`.spillo-popup`): serve a tenerlo dentro la tela. */
const LARGHEZZA_POPUP = 260;
const SCHERMO_STRETTO = '(max-width: 767px)';
/** Sotto i 1024 px c'è la barra inferiore e la guida è un foglio dal basso (come `GuidaNelVisore`): il foglio del pin non può starle sotto. */
const SOTTO_1024 = '(max-width: 1023px)';
/** Traslazione nulla: il raggruppamento fuori dall'editor non dipende dallo spostamento (la traslazione non cambia le distanze). */
const PAN_NULLO: Punto = { x: 0, y: 0 };
/** Dopo un pinch il tocco che lo chiude non è un tocco sul pin sotto il dito: per questi ms i pin ignorano il clic. */
const PAUSA_DOPO_PINCH = 350;

/** Con `fuori` porta il nodo in un portale su `document.body` (fuori dal livello trasformato della
 * mappa, per il foglio dal basso); altrimenti lo lascia dov'è. */
const inPortale = (fuori: boolean, nodo: ReactNode): ReactNode => (fuori ? createPortal(nodo, document.body) : nodo);

/** Uno spillo che le sue condizioni tolgono dalla mappa: non disponibile, quale che sia il tipo (condizioni assolute, 2026-10-09). */
function nascostoPerCondizioni(s: SpilloDto): boolean {
  return s.disponibilita !== undefined && s.disponibilita.stato !== 'disponibile';
}

/** Il motivo per cui uno spillo chiesto con `?spillo=` non è disponibile adesso (R10-28b): le condizioni non soddisfatte e, se non c'è
 *  altro, quelle che la partita non sa verificare (stato «ignoto», prefisso «da verificare»), così la riga non resta senza motivo. */
function motivoNonDisponibile(d: SpilloDto['disponibilita']): string {
  const requisiti = d?.requisiti ?? [];
  const rossi = requisiti.filter((r) => r.stato === 'rosso').map((r) => r.dettaglio || r.testo);
  if (rossi.length > 0) return rossi.join(' · ');
  return requisiti.filter((r) => r.stato === 'grigio').map((r) => `da verificare: ${r.dettaglio || r.testo}`).join(' · ');
}

/** Il visore di una mappa: barra con percorso e strumenti (assente in modalità `scelta`), pannello
 * laterale (legenda con filtri, ricerca, schede; o il `pannello` dell'editor) e tela con immagine e
 * spilli. Lo zoom parte dall'inquadratura «adatta» e arriva a 8 volte tanto; rotellina, pinch,
 * pulsanti e trascinamento lo cambiano, il doppio clic lo riporta ad «adatta». Gli spilli vicini si
 * raggruppano in pastiglie «+n» con l'elenco apribile; fuori dall'editor lo spillo selezionato apre
 * un popup ancorato (o un foglio, se non ci sta o lo schermo è stretto). Gli spilli bloccati dalle
 * condizioni della partita sono nascosti salvo richiesta esplicita, i raccolti salvo «mostra
 * raccolti». Con `editor` il clic e il trascinamento passano agli strumenti dell'editor;
 * `selezioneIniziale` e `puntoIniziale` fissano l'inquadratura d'apertura una volta per mappa. */
export function VisoreMappa({ mappa, partitaId, onNaviga, onRaccolto, onStatoPunto, onAcquisto, onAcquistiCambiati, onDaVerificare, onContesto, onChiudi, etichettaChiudi, incorporato, azioni, ritorno, editor, vistaGiornoCorrente, pannello, contenutiPannello, intestazione, className, selezioneIniziale, rivelaSelezione, puntoIniziale, scelta, pannelloIniziale, onPannello, titolo, senzaVicine, guida, popupIniziale = true, nonDisponibili }: Props) {
  const sugg = useSuggerimenti();
  // L4-07: il passaggio da cui si è arrivati a questa mappa (`passaggioMappe`), letto quando la mappa cambia (anche nello stesso visore, come
  // nella pagina della mappa) e consumato dopo averla mostrata, così non torna più tardi entrando da un'altra strada
  const [ritornoPassaggio, setRitornoPassaggio] = useState(() => ({ mappa: mappa.chiave, passaggio: passaggioVerso(mappa.chiave) }));
  if (ritornoPassaggio.mappa !== mappa.chiave) setRitornoPassaggio({ mappa: mappa.chiave, passaggio: passaggioVerso(mappa.chiave) });
  useEffect(() => { consumaPassaggio(); }, [mappa.chiave]);
  const tela = useRef<HTMLDivElement | null>(null);
  // id delle istruzioni da tastiera lette dal lettore di schermo (`aria-describedby` della tela): uno per visore, ce ne può essere più d'uno in pagina
  const idIstruzioni = useId();
  const [dim, setDim] = useState<Dimensioni>({ w: 0, h: 0 });
  // l'altezza del popup dello spillo, misurata quando è ancorato al punto (vedi `popupSotto`): per spillo, così una nuova selezione rimisura
  const popupRif = useRef<HTMLDivElement | null>(null);
  // L6-13: il popup (o il foglio, che sta in un portale a fine pagina) aperto da tastiera prende il fuoco: senza, il primo pulsante del popup
  // distava decine di tabulazioni dal pin. Vale solo per l'apertura con Invio/Spazio (`click` con `detail` 0): il tocco e il mouse non
  // spostano il fuoco, quindi niente tastiera a schermo né scorrimenti. Il fuoco si dà al popup stesso (`tabIndex -1`, con nome), non al
  // primo pulsante: il lettore di schermo ne annuncia il nome e Tab entra nei suoi comandi.
  const fuocoAlPopup = useRef(false);
  /** Dà il fuoco al popup se è stato chiesto e il fuoco è ancora sul pin (o sulla voce dell'elenco) da cui si è aperto, o è andato perso. */
  const portaFuocoNelPopup = useCallback((el: HTMLElement | null) => {
    if (!el || !fuocoAlPopup.current) return;
    const a = document.activeElement;
    if (!a || a === document.body || a.closest('.spillo-mappa, .visore-mappa__voce')) el.focus({ preventScroll: true });
  }, []);
  /** Aggancia il popup: `popupRif` e, appena nasce (anche quando passa da ancorato a foglio e si ricrea in un altro posto), il fuoco chiesto. */
  const agganciaPopup = useCallback((el: HTMLDivElement | null) => { popupRif.current = el; portaFuocoNelPopup(el); }, [portaFuocoNelPopup]);
  const [altezzaPopupMisurata, setAltezzaPopupMisurata] = useState<{ id: number; h: number } | null>(null);
  const [natCaricata, setNatCaricata] = useState<(Dimensioni & { src: string; img: HTMLImageElement }) | null>(null);
  const [zoomEsplicito, setZoomEsplicito] = useState<number | null>(null);
  const [panEsplicito, setPanEsplicito] = useState<Punto | null>(null);
  const [tipiNascosti, setTipiNascosti] = useState<Set<TipoSpillo>>(new Set());
  const [mostraRaccolti, setMostraRaccolti] = useState(false);
  // Predefinito **spento**: la mappa attiva mostra il mondo com'è adesso. Si accende per chiedere
  // «e dove sarà?», che è una domanda legittima a una guida ma non la vista di partenza.
  // Un pin chiesto con un comando (il tocco su «Luoghi qui» dell'Area) ma non disponibile adesso accende la vista dei non disponibili:
  // altrimenti il tocco non mostrava niente (UX2-2, L2). Solo col comando: un indirizzo arriva da un collegamento e non deve rivelare
  // quel che l'interfaccia nasconde (regola del test «un indirizzo con lo spillo bloccato non lo rivela»).
  const [mostraNonDisponibiliProprio, setMostraNonDisponibiliProprio] = useState(() => !!rivelaSelezione && !!selezioneIniziale && mappa.spilli.some((s) => s.id === selezioneIniziale && nascostoPerCondizioni(s)));
  // L5 (F3): con `nonDisponibili` l'interruttore è di chi ospita il visore (condiviso con «Luoghi qui»)
  const mostraNonDisponibili = nonDisponibili ? nonDisponibili.valore : mostraNonDisponibiliProprio;
  const setMostraNonDisponibili = (v: boolean | ((attuale: boolean) => boolean)) => {
    const nuovo = typeof v === 'function' ? v(mostraNonDisponibili) : v;
    if (nonDisponibili) nonDisponibili.onCambia(nuovo); else setMostraNonDisponibiliProprio(nuovo);
  };
  // condiviso: il pin chiesto con un comando e non disponibile adesso accende l'interruttore di chi ospita (UX2-2), come farebbe il visore
  const rivelaCondiviso = useRef(nonDisponibili);
  useEffect(() => { rivelaCondiviso.current = nonDisponibili; });
  useEffect(() => {
    if (mostraNonDisponibiliProprio && rivelaCondiviso.current && !rivelaCondiviso.current.valore) rivelaCondiviso.current.onCambia(true);
  }, [mostraNonDisponibiliProprio]);
  const [ricerca, setRicerca] = useState('');
  const [selezionatoUso, setSelezionatoUso] = useState<number | null>(selezioneIniziale ?? null);
  /** Il gruppo «+n» aperto, per chiave: l'elenco dice chi c'è dentro e permette di scegliere. */
  const [gruppoAperto, setGruppoAperto] = useState<string | null>(null);
  // Esc chiude l'elenco del gruppo, come ci si aspetta da un riquadro che si apre sopra la mappa.
  useEffect(() => {
    if (!gruppoAperto) return;
    /** Esc chiude l'elenco del gruppo aperto. */
    const suTasto = (e: KeyboardEvent) => { if (e.key === 'Escape' && !e.defaultPrevented && !document.querySelector('.modal-overlay')) setGruppoAperto(null); };
    window.addEventListener('keydown', suTasto);
    return () => window.removeEventListener('keydown', suTasto);
  }, [gruppoAperto]);
  // Incorporato in una pagina lo spazio è poco: il pannello è chiuso finché l'utente non lo apre; a schermo intero è aperto.
  // Stato derivato (nessun effetto che sincronizza): `null` = comportamento predefinito del contesto.
  const [pannelloScelto, setPannelloScelto] = useState<boolean | null>(pannelloIniziale ?? null);
  const pannelloAperto = pannelloScelto ?? !incorporato;
  // «Dettagli» dal popup: apre il pannello (se chiuso) e porta la scheda in vista con il fuoco. A schermo intero il pannello è già aperto e
  // senza scorrimento il pulsante non aveva alcun effetto visibile (scheda sotto la piega nel layout impilato < 860 px e nella mappa incorporata).
  const schedaRef = useRef<HTMLElement | null>(null);
  const [richiestaScheda, setRichiestaScheda] = useState(0);
  /** Apre il pannello e chiede (contatore) di portare in vista la scheda e darle il fuoco. */
  const apriScheda = () => { setPannelloScelto(true); setRichiestaScheda((n) => n + 1); };
  useEffect(() => {
    if (richiestaScheda === 0) return;
    const el = schedaRef.current;
    if (!el) return;
    el.scrollIntoView?.({ block: 'start', behavior: comportamentoScorrimento() });
    el.focus({ preventScroll: true });
  }, [richiestaScheda]);
  const [occupato, setOccupato] = useState(false);
  // L1: l'immagine della mappa ha una regola sola (`useImmagineMappa`): caricata, poi asset dichiarato
  const src = useImmagineMappa(mappa);

  // Dimensioni naturali: dal DTO quando note, altrimenti dall'immagine caricata, altrimenti un quadrato di riserva.
  const caricata = natCaricata?.src === src ? natCaricata : null;
  const nat: Dimensioni = caricata ?? (mappa.larghezza && mappa.altezza ? { w: mappa.larghezza, h: mappa.altezza } : { w: DIMENSIONE_RISERVA, h: DIMENSIONE_RISERVA });
  // I pezzi della planimetria (102): le loro zone d'origine sono cancellate dall'immagine e non contano nell'area visibile, i pezzi
  // posati sì. Le zone si ricavano da una firma, così la scansione dei pixel si rifà solo quando cambiano davvero (non a ogni
  // ricarica della mappa, che arriva con oggetti nuovi).
  const pezzi = mappa.pezzi ?? [];
  const firmaZone = pezzi.map((p) => `${p.sorgente.x},${p.sorgente.y},${p.sorgente.larghezza},${p.sorgente.altezza}`).join(';');
  const zone = useMemo<AreaMappa[]>(() => (firmaZone ? firmaZone.split(';').map((z) => { const [x, y, w, h] = z.split(',').map(Number); return { x, y, w, h }; }) : []), [firmaZone]);
  const areaVisibile = useMemo(() => (caricata ? areaImmagine(caricata.img, zone) : null), [caricata, zone]);
  const maschera = useMemo(() => mascheraZone({ w: nat.w, h: nat.h }, zone.map((z) => ({ sorgente: { x: z.x, y: z.y, larghezza: z.w, altezza: z.h } }))), [nat.w, nat.h, zone]);
  // le copie posate (103): una zona per pezzo, una posa per copia; l'inquadratura comprende tutte le copie
  const posate = useMemo(() => copiePosate(mappa.pezzi ?? []), [mappa.pezzi]);
  const fit = inquadraturaMappa(nat, dim, areaConPezzi(areaVisibile, posate.map((x) => posaDi(x.pezzo, x.copia))), mappa.spilli);
  const zoomMin = fit.zoom;
  const zoomMax = zoomMin * FATTORE_ZOOM_MASSIMO;
  const zoom = zoomEsplicito === null ? zoomMin : limita(zoomEsplicito, zoomMin, zoomMax);
  const pan: Punto = panEsplicito ?? fit.pan;
  // in modalità scelta non c'è selezione (né popup): il tocco sceglie
  const selezionatoId = scelta ? null : editor ? editor.selezionatoId : selezionatoUso;
  // con `popupIniziale` falso, lo spillo della selezione iniziale resta senza popup finché non lo si tocca (o se ne sceglie un altro)
  const [popupSoppresso, setPopupSoppresso] = useState<number | null>(popupIniziale ? null : selezioneIniziale ?? null);
  const seleziona = useCallback((id: number | null) => { fuocoAlPopup.current = false; setPopupSoppresso(null); if (editor) editor.onSeleziona(id); else setSelezionatoUso(id); }, [editor]);

  // Misura dell'area visibile (ResizeObserver quando disponibile; altrimenti finestra).
  useEffect(() => {
    const el = tela.current;
    if (!el) return;
    /** Legge la misura della tela e aggiorna lo stato solo se è cambiata. */
    const misura = () => { const r = el.getBoundingClientRect(); setDim((d) => (d.w === r.width && d.h === r.height ? d : { w: r.width, h: r.height })); };
    if (typeof ResizeObserver === 'undefined') {
      const id = requestAnimationFrame(misura);
      window.addEventListener('resize', misura);
      return () => { cancelAnimationFrame(id); window.removeEventListener('resize', misura); };
    }
    const oss = new ResizeObserver(misura);
    oss.observe(el);
    return () => oss.disconnect();
  }, []);

  // Rotellina non passiva (React registra `wheel` come passivo: `preventDefault` non avrebbe effetto).
  const stato = useRef({ zoom, pan, zoomMin, zoomMax });
  useEffect(() => { stato.current = { zoom, pan, zoomMin, zoomMax }; });
  // L3-06: durante un gesto (trascinamento, pinch) la vista si applica al livello con un fotogramma per volta, senza passare dallo stato:
  // un movimento del dito non ridisegna più tutto il visore. Lo stato (`zoomEsplicito`, `panEsplicito`) si aggiorna una volta sola, alla
  // fine del gesto (`chiudiVista`). I pin e i riquadri nel livello seguono lo zoom vivo con `--zoom-mappa` (vedi `.visore-mappa__livello`).
  const livello = useRef<HTMLDivElement | null>(null);
  const vistaViva = useRef<{ zoom: number; pan: Punto } | null>(null);
  const fotogramma = useRef(0);
  /** Scrive nel livello la vista viva (un fotogramma). */
  const disegnaVista = useCallback(() => {
    fotogramma.current = 0;
    const v = vistaViva.current;
    const el = livello.current;
    if (!v || !el) return;
    el.style.transform = `translate(${v.pan.x}px, ${v.pan.y}px) scale(${v.zoom})`;
    el.style.setProperty('--zoom-mappa', String(v.zoom));
  }, []);
  /** Il gesto in corso porta la vista qui: la si disegna al prossimo fotogramma. */
  const mostraVista = useCallback((z: number, p: Punto) => {
    vistaViva.current = { zoom: z, pan: p };
    if (!fotogramma.current) fotogramma.current = requestAnimationFrame(disegnaVista);
  }, [disegnaVista]);
  /** Fine del gesto: la vista viva passa nello stato (un solo disegno dei componenti). */
  const chiudiVista = useCallback(() => {
    if (fotogramma.current) { cancelAnimationFrame(fotogramma.current); fotogramma.current = 0; }
    const v = vistaViva.current;
    vistaViva.current = null;
    if (!v) return;
    // un semplice trascinamento a vista «adatta» non fissa uno zoom esplicito: lo zoom resta null (e segue «adatta» alla rotazione o al
    // caricamento dell'immagine vera) se lo zoom vivo è quello già disegnato
    if (Math.abs(v.zoom - stato.current.zoom) > 1e-6) setZoomEsplicito(v.zoom);
    setPanEsplicito(v.pan);
  }, []);
  /** Gesto annullato dal sistema (`pointercancel`: il dito è passato allo scorrimento della pagina): la vista viva si scarta e il livello
   *  torna a quella dello stato, senza tenere lo spostamento dei primi movimenti arrivati prima dell'annullo. */
  const scartaVista = useCallback(() => {
    if (fotogramma.current) { cancelAnimationFrame(fotogramma.current); fotogramma.current = 0; }
    const v = vistaViva.current;
    vistaViva.current = null;
    const el = livello.current;
    if (!v || !el) return;
    const { zoom: z, pan: p } = stato.current;
    el.style.transform = `translate(${p.x}px, ${p.y}px) scale(${z})`;
    el.style.setProperty('--zoom-mappa', String(z));
  }, []);
  useEffect(() => () => { if (fotogramma.current) cancelAnimationFrame(fotogramma.current); }, []);
  const applicaZoom = useCallback((nuovo: number, cx: number, cy: number) => {
    const viva = vistaViva.current;
    chiudiVista();
    const { zoom: zs, pan: ps, zoomMin: mn, zoomMax: mx } = stato.current;
    const z1 = viva?.zoom ?? zs;
    const p1 = viva?.pan ?? ps;
    const z2 = limita(nuovo, mn, mx);
    const k = z2 / z1;
    setZoomEsplicito(z2);
    setPanEsplicito({ x: cx - (cx - p1.x) * k, y: cy - (cy - p1.y) * k });
  }, [chiudiVista]);
  useEffect(() => {
    const el = tela.current;
    if (!el) return;
    /** Ingrandisce o riduce attorno al cursore, salvo sopra un popup o un'area scorrevole della tela. */
    const suRotella = (e: WheelEvent) => {
      // Sopra un popup o un'area che scorre (la merce di un negozio, l'elenco di un gruppo di spilli) la rotellina è
      // di quell'area: la fa scorrere, e al capo si ferma lì (`overscroll-behavior: contain`). Prima ingrandiva la
      // mappa sotto, e l'elenco non si poteva scorrere con la rotellina (richiesta dell'utente sugli scroll annidati).
      const area = e.target instanceof Element ? e.target.closest('.spillo-popup, .area-scorrevole') : null;
      if (area && el.contains(area)) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      applicaZoom(stato.current.zoom * (e.deltaY < 0 ? PASSO_ROTELLA : 1 / PASSO_ROTELLA), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('wheel', suRotella, { passive: false });
    return () => el.removeEventListener('wheel', suRotella);
  }, [applicaZoom]);

  /** Torna all'inquadratura «adatta» togliendo zoom e spostamento espliciti. */
  const adatta = () => { vistaViva.current = null; setZoomEsplicito(null); setPanEsplicito(null); };
  // L'inquadratura iniziale (spillo selezionato o punto d'arrivo) si applica **una volta** per mappa e per richiesta, quando l'area
  // è misurata, e ancora una volta quando l'immagine ha le sue dimensioni vere (`nat` parte dalla riserva o dalle dimensioni
  // dichiarate dalla mappa: finché l'immagine non è caricata non si sa dove cade il punto). Prima si
  // riapplicava a ogni ridimensionamento — rotazione del tablet, tastiera che compare — e zoom e spostamenti fatti a mano si
  // perdevano (rilievo A4 della verifica completa, 2026-10-03).
  const inquadraturaApplicata = useRef<string | null>(null);
  // Selezione iniziale: centra lo spillo appena l'area è misurata (rinviato di un tick: nessuno stato impostato durante il render)
  useEffect(() => {
    if (!selezioneIniziale || dim.w === 0) return;
    const chiave = `selezione|${mappa.chiave}|${selezioneIniziale}|${nat.w}x${nat.h}`;
    if (inquadraturaApplicata.current === chiave) return;
    const s = mappa.spilli.find((x) => x.id === selezioneIniziale);
    // Uno spillo bloccato non si apre nemmeno da un indirizzo: era il modo per rivelarlo
    // aggirando il filtro, e un deep link non deve poter fare quello che l'interfaccia non fa.
    // L5 §2 (decisione dell'utente, 2026-10-20): lo spillo chiesto esplicitamente (`?spillo=`, «Sulla mappa») si apre anche chiuso o non
    // ancora sbloccato, evidenziato con «Non disponibile adesso» e il motivo (`spilloChiesto` qui sotto): unica eccezione alla regola
    if (!s) return;
    const id = setTimeout(() => {
      inquadraturaApplicata.current = chiave;
      // uno spillo nascosto perché già raccolto va reso visibile: altrimenti la mappa si centra sul vuoto
      if (s.collezionabile && s.raccolto) setMostraRaccolti(true);
      // Arrivando da uno spostamento la mappa resta **adattata alla finestra** e lo spillo è già
      // selezionato (richiesta dell'utente, 2026-09-11): tutta la mappa si vede, e il popup dice dove sei.
      setSelezionatoUso(s.id);
      setZoomEsplicito(null);
      setPanEsplicito(null);
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selezioneIniziale, dim.w, dim.h, nat.w, nat.h, mappa.chiave, zoomMin]);
  useEffect(() => {
    if (!puntoIniziale || selezioneIniziale || dim.w === 0 || dim.h === 0) return;
    const {x,y,zoom:fattore}=puntoIniziale;
    const chiave = `punto|${mappa.chiave}|${x}|${y}|${fattore}|${nat.w}x${nat.h}`;
    if (inquadraturaApplicata.current === chiave) return;
    const id=setTimeout(()=>{inquadraturaApplicata.current = chiave;const z=stato.current.zoomMin*limita(fattore,1,6);setZoomEsplicito(z);setPanEsplicito({x:dim.w/2-x/100*nat.w*z,y:dim.h/2-y/100*nat.h*z});},0);
    return ()=>clearTimeout(id);
  },[puntoIniziale, selezioneIniziale,dim.w,dim.h,nat.w,nat.h,zoomMin,mappa.chiave]);
  /** Moltiplica lo zoom per `fattore` tenendo fermo il centro della tela (pulsanti + e −). */
  const zoomCentro = (fattore: number) => applicaZoom(zoom * fattore, dim.w / 2, dim.h / 2);
  /** Porta lo spillo al centro della tela, ingrandendo almeno a 2,5 volte l'inquadratura «adatta». */
  const centraSu = (s: SpilloDto) => {
    const z = Math.max(zoom, zoomMin * 2.5);
    setZoomEsplicito(z);
    setPanEsplicito({ x: dim.w / 2 - (s.x / 100) * nat.w * z, y: dim.h / 2 - (s.y / 100) * nat.h * z });
  };
  // Richiesta dell'utente (2026-10-20): «al posto di dare l'opzione raccogli (sulla porta, scala, rampino o altri elementi di spostamento)
  // dovrebbe semplicemente spostarti». Un pin di spostamento con un arrivo, disponibile, al tocco porta subito all'arrivo (nella scheda del
  // Palazzo con la stessa strada dei passaggi del visore, `onNaviga`), anche se ha voci della guida (strada (b) del PM: le voci si segnano
  // dalla guida). Fuori dall'editor e dalla scelta dei pin; uno senza arrivo, o non disponibile, resta com'è.
  const vaSubito = (s: SpilloDto): boolean => {
    if (editor || scelta || !passaggioConArrivo(s)) return false;
    return !(partitaId !== null && s.disponibilita !== undefined && s.disponibilita.stato !== 'disponibile');
  };
  /** L4-07: la navigazione dell'ospite attraverso il pin di spostamento `s`, che annota il passaggio per il ritorno (`passaggioMappe`). */
  const passaDa = (s: SpilloDto): NavigaMappa => (k, arrivo) => {
    annotaPassaggio({ da: mappa.chiave, daNome: mappa.nome, spillo: s.id, spilloNome: s.nome, verso: k });
    onNaviga(k, arrivo);
  };
  /** Porta all'arrivo del pin di spostamento (con lo spillo d'arrivo se indicato). */
  const vaiAllArrivo = (s: SpilloDto) => {
    const a = arrivoSpillo(s);
    if (a) passaDa(s)(a.mappa, a.spillo ? { spillo: a.spillo } : undefined);
  };
  // L3 RG-1: la guida da usare, l'unica del visore (2026-10-31: «il visore doveva già essere unico»), fuori dall'editor e dalla scelta dei pin,
  // su ogni mappa che può avere voci della guida (`GET /api/mappe/:chiave/guida`): una planimetria di un Palazzo (le voci senza pin stanno
  // sulla loro planimetria effettiva, che è sempre una planimetria del Palazzo) o qualunque mappa con un pin collegato a una voce
  const conGuida = !!guida && !editor && !scelta && (mappa.area?.contenitore.tipo === 'dungeon' || mappa.spilli.some((s) => s.voci.length > 0));
  const [guidaAperta, setGuidaAperta] = useState<{ top: number; right: number } | null>(null);
  // la guida è un foglio dal basso sotto i 1024 px (`GuidaNelVisore`): `guidaFoglio` è il suo elemento, per il posto libero sopra di lei
  const sotto1024 = useMedia(SOTTO_1024);
  const guidaFoglio = useRef<HTMLElement | null>(null);
  const guidaSuFoglio = guidaAperta !== null && sotto1024;
  /** Quante volte si è scelto un pin dalla Guida: riporta nella fascia libera sopra il foglio anche lo stesso pin scelto di nuovo. */
  const [richiesteGuida, setRichiesteGuida] = useState(0);
  const pulsanteGuida = useRef<HTMLButtonElement | null>(null);
  /** Chiude la guida (il suo × o Esc, L6-09) e rimette il fuoco sul pulsante «Guida» da cui si era aperta, se il fuoco era dentro la guida. */
  const chiudiGuida = () => {
    const conFuoco = !!guidaFoglio.current?.contains(document.activeElement) || !!document.activeElement?.closest('[data-guida-visore]');
    setGuidaAperta(null);
    if (conFuoco) requestAnimationFrame(() => pulsanteGuida.current?.focus({ preventScroll: true }));
  };
  /** Apre la guida in alto a destra della tela (o la chiude). */
  const apriGuida = () => {
    if (guidaAperta) { setGuidaAperta(null); return; }
    const r = tela.current?.getBoundingClientRect();
    setGuidaAperta({ top: r?.top ?? 80, right: r?.right ?? window.innerWidth });
  };
  /** Dalla guida, un pin della voce: lo rende visibile se un filtro lo nascondeva (raccolto, non disponibile, categoria spenta), lo
   *  seleziona e lo centra. */
  const mostraDallaGuida = (id: number) => {
    const s = mappa.spilli.find((x) => x.id === id);
    if (!s) return;
    if (s.collezionabile && s.raccolto) setMostraRaccolti(true);
    if (nascostoPerCondizioni(s)) setMostraNonDisponibili(true);
    setTipiNascosti((prev) => { if (!prev.has(s.tipo)) return prev; const n = new Set(prev); n.delete(s.tipo); return n; });
    seleziona(s.id);
    // la guida è un foglio che copre il basso della tela (sotto i 1024 px): il pin si centra nella fascia libera sopra di lei (effetto
    // «L3-05») e il suo riquadro non si apre sopra la guida mentre la si sta usando; si apre al tocco sul pin
    if (guidaSuFoglio) setPopupSoppresso(s.id);
    centraSu(s);
    setRichiesteGuida((n) => n + 1);
  };
  // gli stati della mappa (pin e voci): quando cambiano altrove, la guida si rilegge
  // (gli stati dei pin e delle loro voci, più la versione della pagina ospite: le catture fatte con le piastrelle della scheda non toccano i pin)
  const versioneStati = conGuida ? `${guida?.versione ?? ''}#${mappa.spilli.map((s) => `${s.id}:${s.raccolto ? 1 : 0}:${s.voci.map((v) => v.stato ?? '').join(',')}`).join('|')}` : '';
  const spilliQui = useMemo(() => new Set(mappa.spilli.map((s) => s.id)), [mappa.spilli]);

  // Coordinate in percentuale dell'immagine a partire da un punto dello schermo.
  const percentuali = (clientX: number, clientY: number): Punto | null => {
    const el = tela.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const x = ((clientX - r.left - pan.x) / (nat.w * zoom)) * 100;
    const y = ((clientY - r.top - pan.y) / (nat.h * zoom)) * 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) return null;
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  };

  /** Il punto dello schermo in pixel dell'immagine (102: i pezzi), interi e dentro l'immagine. */
  const pixel = (clientX: number, clientY: number): Punto => {
    const r = tela.current?.getBoundingClientRect();
    const x = r ? (clientX - r.left - pan.x) / zoom : 0;
    const y = r ? (clientY - r.top - pan.y) / zoom : 0;
    return { x: Math.round(limita(x, 0, nat.w)), y: Math.round(limita(y, 0, nat.h)) };
  };

  // Puntatori: trascinamento, pinch, click sulla mappa (editor), trascinamento di uno spillo (editor), ritaglio di una zona e
  // trascinamento di un pezzo (editor, 102).
  const puntatori = useRef(new Map<number, Punto>());
  const gesto = useRef<{ tipo: 'trascina'; x: number; y: number; px: number; py: number; z: number; mosso: boolean } | { tipo: 'pinch'; d0: number; z0: number; cx: number; cy: number; px: number; py: number } | { tipo: 'spillo'; id: number; mosso: boolean; x: number; y: number }
    | { tipo: 'ritaglia'; x0: number; y0: number } | { tipo: 'pezzo'; id: number; mosso: boolean; x: number; y: number; px0: number; py0: number; w: number; h: number } | null>(null);
  const [trascinato, setTrascinato] = useState<{ id: number; x: number; y: number } | null>(null);
  /** Il rettangolo che si sta ritagliando e il pezzo che si sta trascinando (102), in pixel dell'immagine. */
  const [rettangolo, setRettangolo] = useState<{ x: number; y: number; larghezza: number; altezza: number } | null>(null);
  const [pezzoTrascinato, setPezzoTrascinato] = useState<{ id: number; x: number; y: number } | null>(null);
  const [trascinando, setTrascinando] = useState(false);
  /** Quando è finito l'ultimo pinch (ms): il tocco che lo chiude non apre il pin sotto il dito (`PAUSA_DOPO_PINCH`). */
  const ultimoPinch = useRef<number | null>(null);
  /** Il clic (`istante` = `timeStamp` dell'evento, stessa scala dei puntatori) viene da un pinch appena finito. */
  const pinchRecente = (istante: number) => ultimoPinch.current !== null && istante - ultimoPinch.current < PAUSA_DOPO_PINCH;
  // sotto i 768 px il popup è un foglio dal basso, fisso sullo schermo: sta **fuori** dal livello della mappa (`inPortale`), che è
  // trasformato (scala e traslazione) e renderebbe `position: fixed` relativo a sé
  const schermoStretto = useMedia(SCHERMO_STRETTO);
  /** Dove va un pezzo trascinato: la posizione di partenza più lo spostamento a schermo diviso per lo zoom, in pixel interi e con
   *  l'ingombro tutto dentro l'immagine. */
  const posizionePezzo = (g: { x: number; y: number; px0: number; py0: number; w: number; h: number }, clientX: number, clientY: number): Punto => ({
    x: Math.round(limita(g.px0 + (clientX - g.x) / zoom, 0, Math.max(0, nat.w - g.w))),
    y: Math.round(limita(g.py0 + (clientY - g.y) / zoom, 0, Math.max(0, nat.h - g.h))),
  });
  /** Il rettangolo fra due punti, in pixel interi. */
  const rettangoloFra = (a: Punto, b: Punto) => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), larghezza: Math.abs(a.x - b.x), altezza: Math.abs(a.y - b.y) });

  /** Registra il puntatore e ne cattura gli eventi: col secondo dito inizia un pinch (distanza,
   * zoom e centro di partenza), col primo un trascinamento — o, con «ritaglia» nell'editor, il rettangolo del pezzo — se non c'è
   * già un gesto in corso. */
  const suPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const nuovo = !puntatori.current.has(e.pointerId);
    puntatori.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (puntatori.current.size === 2) {
      // già avviato in cattura se il secondo dito è caduto su un pin (`suPointerDownCattura`)
      if (nuovo) avviaPinch(e.timeStamp);
    } else if (puntatori.current.size === 1 && !gesto.current) {
      if (editor?.strumento === 'ritaglia' && editor.pezzi) {
        const p = pixel(e.clientX, e.clientY);
        gesto.current = { tipo: 'ritaglia', x0: p.x, y0: p.y };
        setRettangolo({ x: p.x, y: p.y, larghezza: 0, altezza: 0 });
      } else gesto.current = { tipo: 'trascina', x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, z: zoom, mosso: false };
    }
  };
  /** Inizia il pinch con i due puntatori registrati: distanza, zoom e centro di partenza (la vista di partenza è quella viva, se un gesto
   *  precedente non è ancora nello stato). */
  const avviaPinch = (istante: number) => {
    const el = tela.current;
    if (!el || puntatori.current.size < 2) return;
    const [a, b] = [...puntatori.current.values()];
    const r = el.getBoundingClientRect();
    const v = vistaViva.current ?? { zoom, pan };
    ultimoPinch.current = istante;
    gesto.current = { tipo: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y), z0: v.zoom, cx: (a.x + b.x) / 2 - r.left, cy: (a.y + b.y) / 2 - r.top, px: v.pan.x, py: v.pan.y };
    setRettangolo(null);
  };
  /** L3-02: i pin fermano il `pointerdown` (il tocco è loro), e un dito caduto su un pin non entrava fra i puntatori: il pinch non partiva
   *  se anche uno solo dei due cadeva su un pin. In fase di cattura, fuori dall'editor (dove il tocco e il trascinamento dei pin restano
   *  quelli di sempre), si registra ogni dito: il pin riceve comunque il suo tocco, il pinch parte con due dita ovunque. Il primo dito di un
   *  gesto nuovo (`isPrimary`) ripulisce i puntatori rimasti da un gesto che non ha chiuso (un pin tolto dal DOM sotto il dito). */
  const suPointerDownCattura = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (editor) return;
    if (e.isPrimary) { puntatori.current.clear(); gesto.current = null; }
    if (e.pointerType === 'mouse') return;
    const nuovo = !puntatori.current.has(e.pointerId);
    puntatori.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (nuovo && puntatori.current.size === 2) avviaPinch(e.timeStamp);
  };
  /** Fa avanzare il gesto in corso: il pinch scala lo zoom col rapporto fra le distanze tenendo
   * fermo il centro iniziale; il trascinamento sposta la mappa dopo una soglia di 4 px; lo
   * spillo dell'editor segue il puntatore (in percentuali dell'immagine) dopo la stessa soglia. */
  const suPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (puntatori.current.has(e.pointerId)) puntatori.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesto.current;
    if (!g) return;
    if (g.tipo === 'pinch' && puntatori.current.size >= 2) {
      const [a, b] = [...puntatori.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const z2 = limita(g.z0 * (d / Math.max(1, g.d0)), zoomMin, zoomMax);
      const k = z2 / g.z0;
      mostraVista(z2, { x: g.cx - (g.cx - g.px) * k, y: g.cy - (g.cy - g.py) * k });
    } else if (g.tipo === 'trascina') {
      const dx = e.clientX - g.x;
      const dy = e.clientY - g.y;
      if (Math.abs(dx) + Math.abs(dy) > 4 && !g.mosso) { g.mosso = true; setTrascinando(true); }
      if (g.mosso) mostraVista(g.z, { x: g.px + dx, y: g.py + dy });
    } else if (g.tipo === 'spillo') {
      if (Math.abs(e.clientX - g.x) + Math.abs(e.clientY - g.y) > 4) g.mosso = true;
      if (g.mosso) { const p = percentuali(e.clientX, e.clientY); if (p) setTrascinato({ id: g.id, x: p.x, y: p.y }); }
    } else if (g.tipo === 'ritaglia') {
      setRettangolo(rettangoloFra({ x: g.x0, y: g.y0 }, pixel(e.clientX, e.clientY)));
    } else if (g.tipo === 'pezzo') {
      // il pezzo segue il puntatore (spostamento a schermo diviso per lo zoom), sempre tutto dentro l'immagine
      if (Math.abs(e.clientX - g.x) + Math.abs(e.clientY - g.y) > 4) g.mosso = true;
      if (g.mosso) setPezzoTrascinato({ id: g.id, ...posizionePezzo(g, e.clientX, e.clientY) });
    }
  };
  /** Chiude il gesto: il pinch finisce quando resta meno di due dita; uno spillo trascinato
   * nell'editor viene salvato con `onSposta`; un tocco senza movimento chiude l'elenco del gruppo
   * e, secondo lo strumento dell'editor, aggiunge/incolla nel punto o toglie la selezione. */
  const suPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    puntatori.current.delete(e.pointerId);
    const g = gesto.current;
    if (!g) return;
    if (g.tipo === 'pinch') {
      if (puntatori.current.size < 2) {
        // L3-02: finito il pinch il dito rimasto continua a trascinare la mappa dal punto in cui la vista è arrivata (fuori dall'editor,
        // dove il dito rimasto non ha un altro gesto da riprendere); la vista viva passa nello stato
        ultimoPinch.current = e.timeStamp;
        const v = vistaViva.current ?? { zoom, pan };
        chiudiVista();
        const resto = [...puntatori.current.values()][0];
        if (resto && !editor) { gesto.current = { tipo: 'trascina', x: resto.x, y: resto.y, px: v.pan.x, py: v.pan.y, z: v.zoom, mosso: true }; setTrascinando(true); }
        else { gesto.current = null; setTrascinando(false); }
      }
      return;
    }
    gesto.current = null;
    setTrascinando(false);
    if (g.tipo === 'trascina' && g.mosso) chiudiVista();
    if (g.tipo === 'ritaglia') {
      // un tocco senza rettangolo (meno di 2 × 2 px) non ritaglia niente
      const zona = rettangoloFra({ x: g.x0, y: g.y0 }, pixel(e.clientX, e.clientY));
      setRettangolo(null);
      if (zona.larghezza >= 2 && zona.altezza >= 2) editor?.pezzi?.onRitaglia(zona);
      return;
    }
    if (g.tipo === 'pezzo') {
      // la posizione finale dall'evento (non dall'anteprima, che potrebbe essere di un fotogramma prima)
      if (g.mosso) { const fine = posizionePezzo(g, e.clientX, e.clientY); editor?.pezzi?.onSposta(g.id, fine.x, fine.y); }
      setPezzoTrascinato(null);
      return;
    }
    if (g.tipo === 'spillo') {
      if (g.mosso && editor) { const p = percentuali(e.clientX, e.clientY); if (p) editor.onSposta(g.id, p.x, p.y); }
      setTrascinato(null);
      return;
    }
    if (!g.mosso) {
      // Un tocco sulla mappa chiude quel che è aperto: il popup dello spillo **e** l'elenco del
      // gruppo, che prima restava lì (rilievo del validatore, 2026-09-13) — e se il suo tasto di
      // chiusura finiva fuori dal ritaglio non c'era più un modo ovvio di levarlo. Vale anche con
      // «Aggiungi» o «Incolla» in mano, dove prima la chiusura non veniva mai eseguita.
      setGruppoAperto(null);
      if (editor && editor.strumento !== 'seleziona') { const p = percentuali(e.clientX, e.clientY); if (p) editor.onClickMappa(p.x, p.y); }
      else { seleziona(null); editor?.pezzi?.onSeleziona(null); }
    }
  };
  /** Puntatore annullato dal sistema: dimentica puntatori, gesto, spillo e pezzo trascinati e rettangolo senza salvare nulla. */
  const annullaGesto = () => { scartaVista(); puntatori.current.clear(); gesto.current = null; setTrascinato(null); setRettangolo(null); setPezzoTrascinato(null); setTrascinando(false); };

  // Spilli visibili: filtri per tipo, raccolti nascosti, ricerca.
  const tipiPresenti = useMemo(() => TIPI_SPILLO.filter((t) => mappa.spilli.some((s) => s.tipo === t)), [mappa.spilli]);
  // un pin «da verificare» (L4) resta in vista anche raccolto, finché non si sistema: nascosto, il suo anello ambra non si vedrebbe
  const raccoltiNascosti = useMemo(() => mappa.spilli.filter((s) => s.collezionabile && s.raccolto && !s.daVerificare).length, [mappa.spilli]);
  const filtraBloccati = Boolean(partitaId) && (!editor || vistaGiornoCorrente === true);
  // anche le copie dei pezzi (102, 103) senza le loro condizioni: si contano e ricompaiono, in trasparenza, con lo stesso comando dei pin
  const pezziBloccati = useMemo(() => (filtraBloccati ? posate.filter((x) => statoPezzo(x.copia, true, false) === 'nascosto').length : 0), [posate, filtraBloccati]);
  const bloccatiNascosti = useMemo(() => (filtraBloccati ? mappa.spilli.filter(nascostoPerCondizioni).length : 0) + pezziBloccati, [mappa.spilli, filtraBloccati, pezziBloccati]);
  const pezziDaDisegnare = useMemo(() => posate.map((x) => ({ ...x, stato: statoPezzo(x.copia, filtraBloccati, mostraNonDisponibili) })).filter((x) => x.stato !== 'nascosto'), [posate, filtraBloccati, mostraNonDisponibili]);
  /** Nell'editor, i comandi dei pezzi (102): selezione, ritaglio, spostamento (di una copia, 103). */
  const strumentiPezzi = editor?.pezzi ?? null;
  /** Il pezzo della copia selezionata: la sua zona si evidenzia. */
  const pezzoSelezionatoId = strumentiPezzi ? posate.find((x) => x.copia.id === strumentiPezzi.selezionatoId)?.pezzo.id ?? null : null;
  const ricercaNorm = (scelta ? scelta.ricerca ?? '' : ricerca).trim().toLowerCase();
  /** Uno spillo che non soddisfa le sue condizioni non c'è **di regola**, e ricompare solo se lo si chiede.
   *
   * La distinzione è quella che conta, ed è la decisione dell'utente: la mappa attiva mostra il
   * mondo com'è **adesso**, quindi un posto dove non si può ancora andare non ci sta; ma una guida
   * deve poter rispondere anche a «dove sarà», e il comando qui sotto lo chiede in modo esplicito.
   * Quando ricompaiono, i pin bloccati sono **marcati** — grigi, con «non ancora disponibile» nel
   * nome accessibile — così non si confondono mai con quelli veri.
   *
   * Da L5 (§2, decisione dell'utente del 2026-10-20) lo spillo chiesto **esplicitamente** — `?spillo=`, «Sulla mappa» del diario —
   * si mostra anche se chiuso o non ancora sbloccato, evidenziato con «Non disponibile adesso» e il motivo (`spilloChiesto`): è
   * l'unica eccezione, gli altri pin bloccati della mappa restano nascosti.
   *
   * Fuori dalla regola solo l'editor, che deve vedere tutto per poterlo modificare.
   *
   * **Anche il grigio nasconde** (decisione dell'utente, 2026-09-13): «un oggetto deve essere
   * visibile solo se tutte le condizioni danno esito true». Prima il grigio — una condizione che la
   * partita non sa verificare, un Ladro mai segnato in squadra — lasciava la cosa visibile, con
   * l'idea che l'assenza di prova non fosse una prova di blocco; ma in una guida che dice «questo
   * c'è adesso» un forse vale come un no, e il pin di qualcosa che forse non c'è manda a cercarlo
   * lo stesso. Il cartellino «Da segnare» resta, sotto «mostra anche i non disponibili», e porta
   * al punto dove si segna lo stato che manca.
   *
   * **Le condizioni sono assolute** (decisione dell'utente, 2026-10-09): «se ci sta una condizione di visibilità questa deve
   * essere assoluta». Anche una porta o un forziere nativi con una condizione che non vale spariscono; prima restavano in vista
   * marcati «non ancora» (`restaInVista`, 2026-10-03), tolto. Semitrasparente resta solo ciò che è raccolto, o un pin non
   * disponibile richiamato con «mostra anche i non disponibili». `nonDisponibile` marca, `bloccato` nasconde. */
  const nonDisponibile = (s: SpilloDto) => filtraBloccati && s.disponibilita !== undefined && s.disponibilita.stato !== 'disponibile';
  /** Vero se lo spillo va nascosto per le sue condizioni (con il filtro della partita attivo). */
  const bloccato = (s: SpilloDto) => filtraBloccati && nascostoPerCondizioni(s);
  /** Vero se il pin, fuori dalla scelta, sarebbe nascosto (gli stessi criteri di `visibili`): raccolto o non ancora disponibile. In
   *  scelta con `attenuaNascosti` si vede sbiadito. */
  const sbiaditoInScelta = (s: SpilloDto) => !!scelta?.attenuaNascosti && ((s.collezionabile && !!s.raccolto) || bloccato(s));
  // in memoria finché non cambiano spilli o filtri: è l'ingresso del raggruppamento qui sotto, che così non si rifà a ogni disegno (P1")
  const inScelta = scelta !== undefined;
  // L5 §2: lo spillo chiesto esplicitamente dall'indirizzo o da «Sulla mappa» resta in vista anche se chiuso (fuori dall'editor)
  const spilloChiesto = editor ? null : selezioneIniziale ?? null;
  const visibili = useMemo(() => mappa.spilli.filter((s) => !tipiNascosti.has(s.tipo) && (inScelta || ((mostraRaccolti || !(s.collezionabile && s.raccolto && !s.daVerificare)) && (mostraNonDisponibili || s.id === spilloChiesto || !(filtraBloccati && nascostoPerCondizioni(s))))) && (!ricercaNorm || s.nome.toLowerCase().includes(ricercaNorm) || nomePin(s).toLowerCase().includes(ricercaNorm))),
    [mappa.spilli, tipiNascosti, inScelta, mostraRaccolti, mostraNonDisponibili, filtraBloccati, ricercaNorm, spilloChiesto]);
  const selezionato = mappa.spilli.find((s) => s.id === selezionatoId && (mostraNonDisponibili || s.id === spilloChiesto || !bloccato(s))) ?? null;
  // Il popup sta sopra allo spillo; sotto quando in alto non c'è spazio, e scorre in orizzontale quanto basta per restare dentro la
  // tela: la freccia resta sullo spillo. L'altezza è **misurata** (`altezzaPopupMisurata`), non stimata: dalla 094 uno spostamento
  // di una voce della guida ha anche «Ottenuto», e su una tela bassa (il visore incorporato, il tablet) il popup non ci stava
  // più né sopra né sotto e la tela lo tagliava. Quando non sta da nessun lato diventa il foglio, come l'elenco di un gruppo.
  // Prima della misura (il primo disegno) vale la stima di prima: ~215 px, la merce di un negozio di più.
  // un altro pin scelto da tastiera mentre il popup c'è già: il popup resta montato, il fuoco va comunque a lui (L6-13)
  useEffect(() => { portaFuocoNelPopup(popupRif.current); }, [selezionato?.id, portaFuocoNelPopup]);
  const misuraPopup = selezionato && altezzaPopupMisurata?.id === selezionato.id ? altezzaPopupMisurata.h : null;
  const altezzaPopup = misuraPopup ?? (selezionato && categoriaSpillo(selezionato.tipo) === 'citta' && selezionato.dettaglio?.negozio ? 438 : 218);
  const yPopup = selezionato ? pan.y + (selezionato.y / 100) * nat.h * zoom : 0;
  // 42 di punta sopra, 14 sotto, e 8 di respiro dal bordo della tela
  const staSopra = yPopup >= altezzaPopup + 42 + 8;
  const staSotto = dim.h - yPopup >= altezzaPopup + 14 + 8;
  const popupSotto = selezionato !== null && !staSopra && (staSotto || misuraPopup === null || dim.h === 0);
  // il foglio solo con l'altezza misurata e la tela misurata: una stima non basta a togliere il popup dal suo punto
  const popupFoglio = selezionato !== null && !schermoStretto && misuraPopup !== null && dim.h > 0 && !staSopra && !staSotto;
  // L3-05: con la guida aperta come foglio dal basso (sotto i 1024 px) il riquadro del pin è anch'esso un foglio, impilato sopra di lei
  // (altrimenti, ancorato al punto o sotto la guida, sparirebbe)
  const popupSuFoglio = schermoStretto || popupFoglio || guidaSuFoglio;
  // misurato solo ancorato al punto (largo 260): nel foglio è più largo e più basso, e misurarlo lì lo farebbe saltare da un modo all'altro
  useLayoutEffect(() => {
    const el = popupRif.current;
    if (!el || !selezionato || popupSuFoglio) return;
    const h = el.offsetHeight;
    if (h > 0 && (altezzaPopupMisurata?.id !== selezionato.id || altezzaPopupMisurata.h !== h)) setAltezzaPopupMisurata({ id: selezionato.id, h });
  }, [selezionato, popupSuFoglio, altezzaPopupMisurata]);
  /** Di quanto far scorrere un riquadro ancorato a `x` (in percentuale) per tenerlo dentro la tela. */
  const scostamento = useCallback((x: number) => {
    if (dim.w === 0) return 0;
    const px = pan.x + (x / 100) * nat.w * zoom;
    return limita(px, LARGHEZZA_POPUP / 2 + 8, Math.max(LARGHEZZA_POPUP / 2 + 8, dim.w - LARGHEZZA_POPUP / 2 - 8)) - px;
  }, [dim.w, pan.x, nat.w, zoom]);
  const popupDx = selezionato ? scostamento(selezionato.x) : 0;
  const collezionabili = mappa.spilli.filter((s) => s.collezionabile);
  const raccolti = collezionabili.filter((s) => s.raccolto).length;
  const percentualeRaccolti = collezionabili.length > 0 ? Math.round((raccolti / collezionabili.length) * 100) : 0;
  /** Filtri della legenda: rende visibili tutti i tipi. */
  const mostraTutti = () => setTipiNascosti(new Set());
  /** Filtri della legenda: nasconde tutti i tipi presenti sulla mappa. */
  const nascondiTutti = () => setTipiNascosti(new Set(tipiPresenti));

  // Chi si vede sulla mappa e dove: la regola sta in `raggruppaSpilli`, che è pura e si prova sui
  // dati veri del pacchetto invece che a mano (vedi `src/utils/raggruppaSpilli.ts`).
  // Rifatto solo quando cambia qualcosa che conta (P1"): prima girava a ogni disegno, anche per un popup che si apre. Le dipendenze
  // sono i numeri, non gli oggetti — `pan` e `nat` sono oggetti nuovi a ogni disegno anche quando i valori restano quelli.
  const inEditor = editor !== undefined;
  // L3-06: lo spostamento non cambia le distanze fra i pin: il raggruppamento ne dipende solo nell'editor con un pin selezionato (dove
  // `dentroTela` tiene le pastiglie spostate dentro la tela). Altrove si calcola con spostamento nullo e non si rifà a ogni pan.
  const panRaggruppa = inEditor && selezionatoId !== null ? pan : PAN_NULLO;
  const { singoli, gruppi } = useMemo(
    () => raggruppaSpilli(visibili, { pan: { x: panRaggruppa.x, y: panRaggruppa.y }, zoom, nat: { w: nat.w, h: nat.h }, dim: { w: dim.w, h: dim.h } }, { selezionatoId, editor: inEditor }),
    [visibili, panRaggruppa.x, panRaggruppa.y, zoom, nat.w, nat.h, dim.w, dim.h, selezionatoId, inEditor],
  );
  /** Se ingrandendo il gruppo si è sciolto, l'elenco sparisce da sé: nessun effetto da sincronizzare. */
  const gruppoScelto = gruppi.find((g) => g.chiave === gruppoAperto) ?? null;
  // **Quanto è alto l'elenco, e da che parte sta.** Non basta stimarne l'altezza e ribaltarlo: un
  // gruppo può avere molte voci — sul Corridoio del Crepuscolo, alla vista d'insieme, arriva a 17 —
  // e allora non ci sta né sopra né sotto, e la tela lo taglia (rilievo del validatore, 2026-09-13;
  // «Ingrandisci qui» e le ultime voci diventavano irraggiungibili). L'altezza va **legata alla
  // tela**: si sceglie il lato che ha più spazio, e le voci scorrono dentro quello che c'è.
  // La stima delle voci serve solo a preferire il lato consueto — sopra — quando l'elenco ci sta
  // tutto; il resto lo fa `maxHeight`, che non stima niente.
  const elenco = (() => {
    if (!gruppoScelto) return { sotto: false, dx: 0, altezzaVoci: undefined as number | undefined, foglio: schermoStretto || guidaSuFoglio };
    // Il contorno attorno alle voci, contato e non stimato: 26 px di stacco dalla pastiglia, 8 di
    // respiro dal bordo, 2 di bordo e 16 di padding del riquadro, 44 d'intestazione (il tasto di
    // chiusura è alto 44), 44 di «Ingrandisci qui» e i due stacchi da 6 fra le tre parti.
    const CONTORNO = 26 + 8 + 2 + 16 + 44 + 6 + 6 + 44;
    const VOCE = 44;
    const y = pan.y + (gruppoScelto.y / 100) * nat.h * zoom;
    const sopra = y, sotto = Math.max(0, dim.h - y);
    const naturale = CONTORNO + VOCE * gruppoScelto.spilli.length;
    const capiente = Math.max(sopra, sotto);
    // Sul telefono è già un foglio dal basso, e lì il punto sulla mappa non c'entra: il tetto lo dà
    // il foglio (60dvh), non la tela. A schermo largo si passa al foglio solo quando nemmeno una
    // voce ci starebbe dal lato migliore — ancorarlo al punto vorrebbe dire tagliarlo comunque.
    const foglio = guidaSuFoglio || (schermoStretto || dim.h === 0 ? schermoStretto : capiente < CONTORNO + VOCE);
    const verso = sopra >= naturale ? false : sotto >= naturale ? true : sotto > sopra;
    return {
      sotto: verso,
      dx: scostamento(gruppoScelto.x),
      foglio,
      // Con la tela ancora da misurare, o col foglio, non si limita niente in linea: il foglio ha
      // già il suo tetto e il suo scorrimento, e un numero preso dalla tela lo strozzerebbe.
      altezzaVoci: dim.h === 0 || foglio || schermoStretto ? undefined : Math.max(VOCE, (verso ? sotto : sopra) - CONTORNO),
    };
  })();
  const elencoSotto = elenco.sotto;
  const elencoDx = elenco.dx;

  // L3-09: dal tablet in su il foglio non è largo quanto lo schermo (col visore incorporato basso, a 1280 px copriva anche la barra laterale):
  // sta nella colonna del visore, dai bordi della tela, con gli stessi 8 px di margine. Sotto i 768 px il foglio è dello schermo.
  const foglioInColonna = !schermoStretto && ((selezionato !== null && (popupFoglio || guidaSuFoglio)) || (gruppoScelto !== null && elenco.foglio));
  const [colonnaFoglio, setColonnaFoglio] = useState<{ left: number; right: number } | null>(null);
  useLayoutEffect(() => {
    const t = tela.current;
    if (!foglioInColonna || !t) return;
    const r = t.getBoundingClientRect();
    const left = Math.round(r.left) + 8;
    const right = Math.round(document.documentElement.clientWidth - r.right) + 8;
    setColonnaFoglio((c) => (c && c.left === left && c.right === right ? c : { left, right }));
  }, [foglioInColonna, dim.w, dim.h, pannelloAperto]);
  const stileFoglio: CSSProperties | undefined = foglioInColonna && colonnaFoglio ? { left: colonnaFoglio.left, right: colonnaFoglio.right } : undefined;

  // L3-05: sotto i 1024 px un foglio dal basso (il riquadro del pin, la guida) copre la parte bassa della tela: il pin selezionato sta nella
  // fascia libera sopra il foglio, centrato, invece di restare sotto. Solo se non c'è già (un pin visibile non si sposta) e a ogni nuova
  // selezione, apertura della guida o cambio di misure; il pan scelto dopo a mano non si tocca.
  useLayoutEffect(() => {
    const t = tela.current;
    if (!t || !selezionato || editor || scelta || dim.w === 0) return;
    const riquadro = selezionato.id !== popupSoppresso && popupSuFoglio ? popupRif.current : null;
    const fogli = [riquadro, guidaFoglio.current].filter((el): el is HTMLElement => el !== null);
    if (fogli.length === 0) return;
    const r = t.getBoundingClientRect();
    const banda = Math.min(dim.h, Math.min(...fogli.map((f) => f.getBoundingClientRect().top)) - r.top);
    if (banda >= dim.h - 1 || banda < 96) return;
    const px = pan.x + (selezionato.x / 100) * nat.w * zoom;
    const py = pan.y + (selezionato.y / 100) * nat.h * zoom;
    const xBuona = px >= 22 && px <= dim.w - 22;
    if (xBuona && py - ALTEZZA_GOCCIA >= 8 && py <= banda - 12) return;
    // la goccia (alta 38 px, punta sul punto) al centro della fascia
    const y = Math.max(ALTEZZA_GOCCIA + 12, Math.min(banda - 16, (banda + ALTEZZA_GOCCIA) / 2));
    setPanEsplicito({ x: xBuona ? pan.x : dim.w / 2 - (selezionato.x / 100) * nat.w * zoom, y: y - (selezionato.y / 100) * nat.h * zoom });
    // il pan e lo zoom correnti sono quelli di questo disegno; l'effetto riparte solo per selezione, foglio, guida e misure
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selezionato?.id, popupSoppresso, popupSuFoglio, guidaAperta, dim.w, dim.h, richiesteGuida]);

  /** Inoltra il cambio di stato dello spillo a `onRaccolto`, segnando il visore occupato finché dura. */
  const cambiaRaccolto = async (s: SpilloDto, raccolto: boolean) => {
    if (!onRaccolto) return;
    setOccupato(true);
    try { await onRaccolto(s, raccolto); } finally { setOccupato(false); }
  };
  /** Inoltra lo stato del punto della guida a `onStatoPunto`, segnando il visore occupato finché dura. */
  const cambiaStatoPunto = async (s: SpilloDto, voce: string, stato: StatoPuntoMappa) => {
    if (!onStatoPunto) return;
    setOccupato(true);
    try { await onStatoPunto(s, voce, stato); } finally { setOccupato(false); }
  };
  /** Inoltra l'acquisto (o la riapertura) di un articolo a `onAcquisto`, segnando il visore occupato finché dura. */
  const cambiaAcquisto = async (s: SpilloDto, articolo: string, fatto: boolean) => {
    if (!onAcquisto) return;
    setOccupato(true);
    try { await onAcquisto(s, articolo, fatto); } finally { setOccupato(false); }
  };

  // Su telefono e tablet i nomi dei pin di spostamento restano visibili (UX2-6), e su un'illustrazione piccola si coprivano e
  // finivano sotto i comandi dello zoom (UX2-10, L2). Dopo ogni disegno (zoom, spostamento, misure, pin visibili) ognuno si sposta
  // in orizzontale quanto basta per stare nella tela e fuori dai comandi; quello che coprirebbe un nome già posato si nasconde
  // (`data-coperta`) e torna ingrandendo, o toccando il suo pin. Prima i pin selezionati, poi dall'alto in basso.
  useLayoutEffect(() => {
    const t = tela.current;
    if (!t || typeof window === 'undefined' || !window.matchMedia?.('(hover: none)').matches) return;
    sistemaEtichette(t);
    // zoom e spostamento del livello hanno una transizione: le misure buone sono quelle di fine corsa
    const fine = () => sistemaEtichette(t);
    t.addEventListener('transitionend', fine);
    const tardi = window.setTimeout(fine, 400);
    return () => { t.removeEventListener('transitionend', fine); window.clearTimeout(tardi); };
    // L3-06: si misura quando la vista o i pin cambiano davvero (fine di un gesto, zoom, misure, pin visibili, selezione, mappa), non a ogni
    // disegno del visore: durante un gesto lo stato non cambia e le etichette non si rimisurano.
  }, [singoli, zoom, pan.x, pan.y, dim.w, dim.h, selezionatoId, mappa.chiave, trascinato]);
  const stileLivello: CSSProperties = { transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, width: nat.w, height: nat.h, '--zoom-mappa': zoom, '--zoom-base': zoom } as CSSProperties;
  // L3-04: il visore incorporato in una pagina che scorre, alla vista «adatta», lascia il dito scorrere la pagina (sotto i 768 px,
  // `touch-action: pan-y` nel CSS); ingrandito, o nell'editor, il dito è della mappa
  const paginaScorre = !!incorporato && !editor && zoom <= zoomMin + 1e-6;
  const cursore = editor && editor.strumento !== 'seleziona' ? 'cursor-crosshair' : 'cursor-grab';
  const percorsoTesto = mappa.percorso.map((p) => p.nome).join(' › ');

  /** Consultazione da tastiera (WCAG 2.1.1, 2.5.7), solo fuori dall'editor: con la tela a fuoco le frecce spostano la vista, + e − ingrandiscono
   *  e riducono attorno al centro, 0 o Home tornano alla vista intera; Esc chiude il popup del pin aperto (da dentro il popup, anche se è in un
   *  portale: gli eventi React risalgono comunque alla tela) e riporta il fuoco sul pin. Tab/Maiusc+Tab fra i pin e Invio/Spazio sono quelli
   *  nativi dei pulsanti `.spillo-mappa`, con lo stesso `onClick` del tocco. Un tasto già gestito da un controllo interno (la tendina del
   *  Selettore, un campo) non arriva qui come comando: i comandi di vista agiscono solo se il fuoco è sulla tela stessa. */
  // L6-07 (WCAG 2.5.7): nell'editor lo spillo e la copia di un pezzo selezionati si spostano anche con le frecce, non solo trascinando. Un passo
  // è un pixel dell'immagine (per lo spillo in percentuale, almeno 0,1: la risoluzione salvata), con Maiusc dieci. Ogni pressione sposta subito
  // l'oggetto sulla mappa (`trascinato`, `pezzoTrascinato`); il salvataggio, con la stessa chiamata del trascinamento (`onSposta`), parte
  // quando le frecce si fermano: un tasto tenuto premuto non fa una scrittura per ripetizione.
  const salvataggioFrecce = useRef<number | null>(null);
  /** Frecce su uno spillo o su una copia selezionati (il pulsante dello spillo sulla mappa, la voce della copia nel pannello). */
  const spostaConFrecce = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (!editor || editor.strumento !== 'seleziona' || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    const verso = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, [number, number] | undefined>)[e.key];
    const b = e.target instanceof HTMLElement ? e.target : null;
    // solo dai pulsanti dello spillo e della copia selezionati: nei campi e nelle tendine le frecce sono del campo
    if (!verso || !b || b.tagName !== 'BUTTON') return;
    const moltiplicatore = e.shiftKey ? 10 : 1;
    const ed = editor;
    /** Rimanda il salvataggio all'ultima pressione. */
    const programma = (salva: () => void) => {
      if (salvataggioFrecce.current !== null) window.clearTimeout(salvataggioFrecce.current);
      salvataggioFrecce.current = window.setTimeout(() => { salvataggioFrecce.current = null; salva(); }, 400);
    };
    const idSpillo = b.dataset.spilloId !== undefined ? Number(b.dataset.spilloId) : null;
    if (idSpillo !== null && idSpillo === editor.selezionatoId) {
      const s = mappa.spilli.find((x) => x.id === idSpillo);
      if (!s) return;
      e.preventDefault();
      const base = trascinato?.id === idSpillo ? trascinato : s;
      const unPixel = (lato: number) => Math.max(0.1, Math.round(1000 / Math.max(1, lato)) / 10);
      const x = Math.round(limita(base.x + verso[0] * unPixel(nat.w) * moltiplicatore, 0, 100) * 10) / 10;
      const y = Math.round(limita(base.y + verso[1] * unPixel(nat.h) * moltiplicatore, 0, 100) * 10) / 10;
      setTrascinato({ id: idSpillo, x, y });
      programma(() => { ed.onSposta(idSpillo, x, y); setTrascinato(null); });
      return;
    }
    const idCopia = b.dataset.copiaId !== undefined ? Number(b.dataset.copiaId) : null;
    const strumentiCopie = ed.pezzi;
    if (idCopia !== null && strumentiCopie && idCopia === strumentiCopie.selezionatoId) {
      const q = posate.find((z) => z.copia.id === idCopia);
      if (!q) return;
      e.preventDefault();
      const base = pezzoTrascinato?.id === idCopia ? pezzoTrascinato : q.copia.posizione;
      const ing = ingombroPezzo(q.pezzo.sorgente.larghezza, q.pezzo.sorgente.altezza, q.copia.rotazione);
      const x = Math.round(limita(base.x + verso[0] * moltiplicatore, 0, Math.max(0, nat.w - ing.larghezza)));
      const y = Math.round(limita(base.y + verso[1] * moltiplicatore, 0, Math.max(0, nat.h - ing.altezza)));
      setPezzoTrascinato({ id: idCopia, x, y });
      programma(() => { strumentiCopie.onSposta(idCopia, x, y); setPezzoTrascinato(null); });
    }
  };
  /** Chiude il popup del pin `id`; se il fuoco era dentro il popup (tastiera, o il tasto × premuto) lo si rimette sul pin da cui era stato aperto
   *  (se è ancora sulla mappa), perché il popup sparisce con il fuoco dentro. Il tocco su × non cambia: il fuoco su un pulsante non mostra anelli. */
  const chiudiPopup = (id: number) => {
    const conFuoco = !!popupRif.current && popupRif.current.contains(document.activeElement);
    seleziona(null);
    if (conFuoco) requestAnimationFrame(() => tela.current?.querySelector<HTMLElement>(`[data-spillo-id="${id}"]`)?.focus({ preventScroll: true }));
  };
  const suTasto = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (editor || e.defaultPrevented) return;
    if (e.key === 'Escape') {
      // l'elenco di un gruppo lo chiude già il suo ascoltatore; una finestra aperta (galleria) ha la sua Esc
      if (gruppoAperto || document.querySelector('.modal-overlay')) return;
      if (!selezionato || selezionato.id === popupSoppresso) return;
      const id = selezionato.id;
      e.preventDefault();
      seleziona(null);
      // il popup sparisce con il fuoco dentro: lo si rimette sul pin da cui era stato aperto (se è ancora sulla mappa)
      requestAnimationFrame(() => tela.current?.querySelector<HTMLElement>(`[data-spillo-id="${id}"]`)?.focus({ preventScroll: true }));
      return;
    }
    if (e.target !== e.currentTarget || e.ctrlKey || e.metaKey || e.altKey) return;
    // passo di spostamento: un sesto del lato corto della tela, mai meno di 48 px; la vista va nel verso della freccia
    const passo = Math.max(48, Math.min(dim.w, dim.h) / 6);
    const sposta = (dx: number, dy: number) => { e.preventDefault(); setPanEsplicito({ x: pan.x - dx, y: pan.y - dy }); };
    switch (e.key) {
      case 'ArrowLeft': sposta(-passo, 0); break;
      case 'ArrowRight': sposta(passo, 0); break;
      case 'ArrowUp': sposta(0, -passo); break;
      case 'ArrowDown': sposta(0, passo); break;
      case '+': case '=': e.preventDefault(); zoomCentro(1.4); break;
      case '-': case '_': e.preventDefault(); zoomCentro(1 / 1.4); break;
      case '0': case 'Home': e.preventDefault(); adatta(); break;
      default: break;
    }
  };

  return (
    // la proporzione dell'immagine, per chi ospita il visore e vuole la tela alta quanto la figura (`.visore-alto-quanto-immagine`, UX2-6)
    <div className={`visore-mappa ${incorporato ? 'visore-mappa--incorporato' : 'visore-mappa--intero'} ${pannelloAperto ? '' : 'visore-mappa--pannello-chiuso'} ${paginaScorre ? 'visore-mappa--pagina-scorre' : ''} ${className ?? ''}`} data-testid="visore-mappa"
      style={{ '--proporzione-immagine': `${nat.w} / ${nat.h}` } as CSSProperties}
      onKeyDown={editor ? spostaConFrecce : undefined}>
      {editor && <span id={`${idIstruzioni}-sposta`} className="sr-only">Con lo spillo selezionato, le frecce lo spostano di un pixel dell’immagine, con Maiusc di dieci; la posizione si scrive anche nel pannello.</span>}
      {/* in modalità scelta la mappa sta dentro la voce della guida, che porta i comandi: la testata ruberebbe la tela */}
      {!scelta && <header className="visore-mappa__barra">
        <nav className="visore-mappa__percorso" aria-label="Percorso della mappa">
          {intestazione}
          {/* Nel visore incorporato stretto la barra si compatta (2026-10-15): restano il titolo su una riga, troncato,
              e i pulsanti a icone; briciole e tipo tornano nel suggerimento del titolo, il genitore in «Su: …» del pannello. */}
          {titolo ? <span className="visore-mappa__tappa visore-mappa__tappa--attuale"><span className="visore-mappa__titolo">{titolo}</span></span> : mappa.percorso.map((p, i) => (
            <span key={p.chiave} className={`visore-mappa__tappa ${i === mappa.percorso.length - 1 ? 'visore-mappa__tappa--attuale' : ''}`}>
              {i > 0 && <span className="visore-mappa__separatore text-text-muted" aria-hidden="true">›</span>}
              {i < mappa.percorso.length - 1 ? <button type="button" className="visore-mappa__briciola" onClick={() => onNaviga(p.chiave)}>{p.nome}</button> : <span className="visore-mappa__titolo" title={incorporato ? `${percorsoTesto} · ${nomeTipoMappa(mappa)}` : undefined}>{p.nome}</span>}
            </span>
          ))}
          <span className="visore-mappa__tipo chip testo-12">{nomeTipoMappa(mappa)}</span>
        </nav>
        <div className="visore-mappa__strumenti">
          {/* L4-07: arrivati da una mappa sorella attraverso un passaggio, il ritorno porta il nome di quella mappa (mai «Torna») e riporta al
              pin attraversato, con la navigazione dell'ospite; il nome del pin compare solo se le due mappe si chiamano allo stesso modo (le
              planimetrie di un'Area), dove il solo nome non direbbe dove si torna */}
          {ritornoPassaggio.passaggio && !editor && (() => {
            const p = ritornoPassaggio.passaggio;
            return <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="indietro" dimensione={20} />} titolo={p.daNome} dettaglio={p.daNome === mappa.nome ? p.spilloNome : undefined}
              aria-label={`Torna a ${p.daNome}, al passaggio «${p.spilloNome}» da cui sei arrivato`} onClick={() => onNaviga(p.da, { spillo: p.spillo })} />;
          })()}
          {azioni}
          {conGuida && <PulsanteVisivo tono={guidaAperta ? 'primario' : 'fantasma'} compatto icona={<IconaAzione chiave="libro" dimensione={20} />} titolo="Guida" aria-pressed={!!guidaAperta} onClick={apriGuida} ref={pulsanteGuida} />}
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo={pannelloAperto ? 'Nascondi pannello' : 'Pannello'} onClick={() => { setPannelloScelto(!pannelloAperto); onPannello?.(!pannelloAperto); }} aria-expanded={pannelloAperto} aria-controls="visore-mappa-pannello" />
          {ritorno}
          {onChiudi && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="chiudi" dimensione={20} />} titolo={etichettaChiudi ?? 'Chiudi'} onClick={onChiudi} />}
        </div>
      </header>}

      <div className="visore-mappa__corpo">
        <aside id="visore-mappa-pannello" className="visore-mappa__pannello" hidden={!pannelloAperto} aria-label="Pannello della mappa">
          {pannello ?? <>
          {contenutiPannello}
          {selezionato && (
            <SchedaSpillo key={`${partitaId}:${selezionato.id}`} ref={schedaRef} spillo={selezionato} partitaId={partitaId} occupato={occupato} onNaviga={passaDa(selezionato)} onRaccolto={onRaccolto ? cambiaRaccolto : undefined} onStatoPunto={onStatoPunto ? cambiaStatoPunto : undefined} onAcquisto={onAcquisto ? cambiaAcquisto : undefined} onAcquistiCambiati={onAcquistiCambiati} onChiudi={() => seleziona(null)} onCentra={() => centraSu(selezionato)} />
          )}
          {!senzaVicine && (mappa.genitore || mappa.figli.length > 0) && (
            <section className="visore-mappa__sezione">
              <h3 className="visore-mappa__intestazione">{titoloMappeVicine(mappa.tipo)}</h3>
              {mappa.genitore && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="indietro" dimensione={20} />} titolo={`Su: ${mappa.genitoreNome ?? mappa.genitore}`} onClick={() => onNaviga(mappa.genitore!)} />}
              {mappa.figli.length > 0 && (
                <ul className="m-0 p-0 list-none flex flex-col gap-1" aria-label={nomeFiglieMappa(mappa.tipo)}>
                  {figliPerArea(mappa.figli).map((f) => (
                    <li key={f.chiave}>
                      <button type="button" className="visore-mappa__figlia" onClick={() => onNaviga(f.chiave)}>
                        <IconaAzione chiave="mappa" dimensione={18} />
                        <span className="flex-1 min-w-0 truncate">{nomeDellaMeta(f)}</span>
                        <span className="testo-12 text-text-muted">{nomeTipoMappa(f)}{f.numeroSpilli > 0 ? ` · ${f.numeroSpilli}` : ''}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section className="visore-mappa__sezione">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="visore-mappa__intestazione">Categorie</h3>
              {tipiPresenti.length > 0 && (
                <span className="flex gap-1">
                  <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="tutti" dimensione={20} />} titolo="Mostra tutti" onClick={mostraTutti} disabled={tipiNascosti.size === 0} />
                  <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="deseleziona" dimensione={20} />} titolo="Nascondi tutti" onClick={nascondiTutti} disabled={tipiNascosti.size === tipiPresenti.length} />
                </span>
              )}
            </div>
            {/* «pin» e nessun «mappa» (R2-39, UX2-9 b) */}
            {tipiPresenti.length === 0 && <p className="m-0 testo-12 text-text-muted">Nessun pin qui.</p>}
            <ul className="m-0 p-0 list-none visore-mappa__categorie" aria-label="Categorie degli spilli">
              {tipiPresenti.map((t) => {
                const delTipo = mappa.spilli.filter((s) => s.tipo === t);
                const attivo = !tipiNascosti.has(t);
                return (
                  <li key={t}>
                    <button type="button" className={`visore-mappa__categoria ${attivo ? '' : 'visore-mappa__categoria--nascosta'}`} aria-pressed={attivo} title={DEFINIZIONI_SPILLO[t].nome}
                      onClick={() => setTipiNascosti((prev) => { const n = new Set(prev); if (n.has(t)) n.delete(t); else n.add(t); return n; })}>
                      <PuntoSpillo tipo={t} colore={DEFINIZIONI_SPILLO[t].colore} />
                      <span className="flex-1 min-w-0 truncate">{DEFINIZIONI_SPILLO[t].nome}</span>
                      <span className="tabular-nums text-text-muted">{delTipo.length}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {(raccoltiNascosti > 0 || mostraRaccolti) && (
              <button type="button" className={`chip chip--icona touch testo-12 self-start ${mostraRaccolti ? 'chip--attivo' : ''}`} aria-pressed={mostraRaccolti} onClick={() => setMostraRaccolti((v) => !v)}>
                <IconaAzione chiave="raggiunto" dimensione={14} />Mostra anche i raccolti ({raccoltiNascosti})
              </button>
            )}
            {/* Si dice quanti sono **e** si offre di vederli, perché sono due domande diverse:
                «cosa posso fare adesso» — ed è la vista predefinita — e «dove sarà quella cosa»,
                che a una guida si chiede eccome. Acceso, i pin tornano grigi e marcati. */}
            {(bloccatiNascosti > 0 || (filtraBloccati && mostraNonDisponibili)) && (
              <button type="button" className={`chip chip--icona touch testo-12 self-start ${mostraNonDisponibili ? 'chip--attivo' : ''}`} aria-pressed={mostraNonDisponibili} onClick={() => setMostraNonDisponibili((v) => !v)}>
                <IconaAzione chiave="bloccato" dimensione={14} />Mostra anche i non ancora disponibili ({bloccatiNascosti})
              </button>
            )}
            <label className="flex flex-col gap-1 testo-12">
              <span className="sr-only">Cerca uno spillo per nome</span>
              <input type="search" className="form-input" placeholder="Cerca uno spillo…" value={ricerca} onChange={(e) => setRicerca(e.target.value)} />
            </label>
          </section>

          {collezionabili.length > 0 && (
            <section className="visore-mappa__sezione" aria-label="Progresso dei collezionabili">
              <h3 className="visore-mappa__intestazione">Progresso</h3>
              <div className="visore-mappa__progresso" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentualeRaccolti} aria-label="Collezionabili raccolti">
                <span className="visore-mappa__progresso-barra" style={{ width: `${percentualeRaccolti}%` }} />
              </div>
              <span className="testo-12 text-text-secondary">{raccolti} di {collezionabili.length} raccolti · {percentualeRaccolti}%{partitaId ? '' : ' · attiva una partita per segnarli'}</span>
            </section>
          )}

          <section className="visore-mappa__sezione">
            <h3 className="visore-mappa__intestazione">Spilli ({visibili.length}{visibili.length !== mappa.spilli.length ? ` di ${mappa.spilli.length}` : ''})</h3>
            <ul className="m-0 p-0 list-none flex flex-col visore-mappa__elenco" aria-label="Spilli visibili">
              {visibili.map((s) => (
                <li key={s.id}>
                  <button type="button" className={`visore-mappa__voce ${s.id === selezionatoId ? 'visore-mappa__voce--attiva' : ''}`} onClick={() => { if (scelta) { scelta.onScegli(s); centraSu(s); return; } seleziona(s.id); centraSu(s); }} aria-pressed={scelta ? scelta.scelti.has(s.id) : s.id === selezionatoId}>
                    {/* D15: spillo segnato = spunta rossa a sinistra e nome barrato in grigio, o cerchio barrato se le sue voci sono tutte
                        «esaurito» (la parola dello stato sta accanto al tipo); lo spazio del segno c'è in ogni riga */}
                    <SegnoStato stato={segnoSpillo(s)} riserva />
                    <PuntoSpillo tipo={s.tipo} colore={s.colore} />
                    <span className={`flex-1 min-w-0 truncate ${segnoSpillo(s) === 'esaurito' ? 'stato-esaurito' : segnoSpillo(s) === 'fatto' ? 'stato-fatto' : ''}`}>{nomePin(s)}</span>
                    <span className="testo-12 text-text-muted">{s.tipoNome}{s.raccolto ? ` · ${parolaSegnato(s)}` : ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
          </>}
        </aside>

        <div
          ref={tela}
          className={`visore-mappa__tela ${cursore} ${trascinando ? 'cursor-grabbing' : ''}`}
          role="application"
          aria-label={`${nomeTipoMappa(mappa)}: ${percorsoTesto}`}
          // fuori dall'editor la tela prende il fuoco da tastiera (Tab) per spostare e ingrandire la vista; nell'editor resta com'era
          tabIndex={editor ? undefined : 0}
          aria-describedby={editor ? undefined : idIstruzioni}
          onKeyDown={suTasto}
          onPointerDownCapture={suPointerDownCattura} onPointerDown={suPointerDown} onPointerMove={suPointerMove} onPointerUp={suPointerUp} onPointerCancel={annullaGesto} onDoubleClick={adatta}
        >
          {!editor && <span id={idIstruzioni} className="sr-only">Frecce per spostare la mappa, più e meno per ingrandire e ridurre, zero o Inizio per la vista intera. Tab per passare da uno spillo all'altro, Invio o Spazio per aprirlo, Esc per chiudere la scheda.{scelta ? '' : " L'elenco degli spilli è nel pannello."}</span>}
          <div ref={livello} className="visore-mappa__livello" style={stileLivello}>
            {src ? (
              // le zone d'origine dei pezzi (102) sono cancellate sempre (scelta dell'utente): una maschera alfa sull'immagine di base
              <img src={src} alt={descrizioneImmagineMappa(mappa)} className="visore-mappa__immagine" draggable={false} style={stileImmagineMascherata(maschera)} data-zone-cancellate={zone.length || undefined}
                onLoad={(e) => { const img = e.currentTarget; if (img.naturalWidth && img.naturalHeight) setNatCaricata({ src: src!, w: img.naturalWidth, h: img.naturalHeight, img }); }} />
            ) : (
              <div className="visore-mappa__senza-immagine" role="img" aria-label="Nessuna immagine di base">
                <IconMappa size={64} />
                <span className="font-display testo-28">Nessuna immagine di base</span>
                <span className="testo-13 text-text-secondary">Caricala dall'editor oppure sposta gli spilli sulla griglia.</span>
              </div>
            )}
            {/* i pezzi posati (102), sotto i pin: parte del disegno della mappa, ritagliati dalla stessa immagine */}
            {/* nell'editor (102) le zone già ritagliate si vedono tratteggiate: sono cancellate e non si ritagliano di nuovo per sbaglio */}
            {src && strumentiPezzi && pezzi.map((p) => (
              <div key={`zona-${p.id}`} className={`visore-mappa__zona-pezzo ${p.id === pezzoSelezionatoId ? 'visore-mappa__zona-pezzo--selezionata' : ''}`} data-zona-pezzo={p.uid} aria-hidden="true"
                style={{ left: p.sorgente.x, top: p.sorgente.y, width: p.sorgente.larghezza, height: p.sorgente.altezza }} />
            ))}
            {/* ogni copia (103) con la sua posa: stesso ritaglio, posizione, rotazione e specchio propri */}
            {src && pezziDaDisegnare.map(({ pezzo: p, copia: c, indice, stato }) => {
              const posa = posaDi(p, pezzoTrascinato?.id === c.id ? { ...c, posizione: { x: pezzoTrascinato.x, y: pezzoTrascinato.y } } : c);
              const stile = stilePezzo(posa, src, nat);
              const modificabile = !!strumentiPezzi && editor?.strumento === 'seleziona';
              return (
                <div key={c.id} className={`visore-mappa__pezzo ${stato === 'trasparente' ? 'visore-mappa__pezzo--non-disponibile' : ''} ${modificabile ? 'visore-mappa__pezzo--modificabile' : ''} ${c.id === strumentiPezzi?.selezionatoId ? 'visore-mappa__pezzo--selezionato' : ''}`}
                  style={{ ...stile.esterno, pointerEvents: modificabile ? 'auto' : 'none' }} data-pezzo={p.uid} data-copia={c.uid} aria-hidden="true" title={modificabile ? nomeCopia(p, c, indice) : undefined}
                  onPointerDown={modificabile ? (e) => {
                    // come uno spillo: si seleziona subito e, trascinata oltre la soglia, la copia si sposta (salvata al rilascio)
                    e.stopPropagation();
                    strumentiPezzi!.onSeleziona(c.id);
                    const ing = { w: Number(stile.esterno.width), h: Number(stile.esterno.height) };
                    gesto.current = { tipo: 'pezzo', id: c.id, mosso: false, x: e.clientX, y: e.clientY, px0: c.posizione.x, py0: c.posizione.y, ...ing };
                    tela.current?.setPointerCapture?.(e.pointerId);
                  } : undefined}>
                  <div style={stile.interno} />
                </div>
              );
            })}
            {rettangolo && <div className="visore-mappa__ritaglio" data-ritaglio aria-hidden="true" style={{ left: rettangolo.x, top: rettangolo.y, width: rettangolo.larghezza, height: rettangolo.altezza }} />}
            {singoli.map((s) => {
              const pos = trascinato?.id === s.id ? trascinato : s;
              const attivo = s.id === selezionatoId;
              // solo nell'editor, e solo se lo spillo porta davvero da qualche parte
              const visitabile = editor?.onVisita ? arrivoSpillo(s) : null;
              return (
                <button
                  key={s.id}
                  type="button"
                  data-spillo-id={s.id}
                  className={`spillo-mappa ${attivo ? 'spillo-mappa--selezionato' : ''} ${scelta?.scelti.has(s.id) ? 'spillo-mappa--scelto' : ''} ${s.raccolto && !scelta ? 'spillo-mappa--raccolto' : ''} ${nonDisponibile(s) && !scelta ? 'spillo-mappa--bloccato' : ''} ${sbiaditoInScelta(s) ? 'spillo-mappa--nascosto-in-scelta' : ''} ${ricercaNorm ? 'spillo-mappa--trovato' : ''} ${sugg.evidenziato('spilli', s.id) ? 'spillo-mappa--suggerito' : ''} ${categoriaSpillo(s.tipo) === 'spostamento' ? 'spillo-mappa--spostamento' : ''} ${s.daVerificare && !scelta ? 'spillo-mappa--da-verificare' : ''}`}
                  // Con «Aggiungi» o «Incolla» in mano il pin si fa da parte come il gruppo: il tocco
                  // serve a posare uno spillo in quel punto, e prima su un pin esistente non
                  // succedeva nulla, senza nemmeno un segnale (rilievo del validatore, 2026-09-13).
                  style={{ left: `${pos.x}%`, top: `${pos.y}%`, '--colore-spillo': s.colore, transform: `scale(${1 / zoom}) translate(-50%, -100%)`, pointerEvents: editor && editor.strumento !== 'seleziona' ? 'none' : undefined } as CSSProperties}
                  aria-label={scelta ? `${s.tipoNome}: ${nomePin(s)}${sbiaditoInScelta(s) ? (s.raccolto ? ` · ${parolaSegnato(s)}` : ' · non ancora disponibile') : ''}${scelta.scelti.has(s.id) ? ' (collegato: tocca per scollegare)' : ' (tocca per collegare)'}` : `${s.tipoNome}: ${nomePin(s)}${s.raccolto ? ` (${parolaSegnato(s)})` : ''}${s.daVerificare ? ' (da verificare)' : ''}${nonDisponibile(s) ? ' (non ancora disponibile)' : ''}${visitabile ? ' — doppio tocco per aprire l’arrivo' : ''}`}
                  aria-pressed={scelta ? scelta.scelti.has(s.id) : attivo}
                  aria-describedby={editor?.strumento === 'seleziona' && attivo ? `${idIstruzioni}-sposta` : undefined}
                  disabled={scelta?.occupato}
                  title={nomePin(s)}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    if (editor?.strumento === 'seleziona') {
                      editor.onSeleziona(s.id);
                      gesto.current = { tipo: 'spillo', id: s.id, mosso: false, x: e.clientX, y: e.clientY };
                      tela.current?.setPointerCapture?.(e.pointerId);
                    }
                  }}
                  onClick={(e) => { e.stopPropagation(); if (pinchRecente(e.timeStamp)) return; if (scelta) { scelta.onScegli(s); return; } if (editor && editor.strumento !== 'seleziona') return; if (vaSubito(s)) { vaiAllArrivo(s); return; } const apre = !(attivo && s.id !== popupSoppresso); seleziona(apre ? s.id : null); fuocoAlPopup.current = apre && e.detail === 0; }}
                  // L3-01: il doppio tocco su un pin non arriva mai alla tela (dove azzererebbe zoom e posizione); nell'editor, su un passaggio, apre l'arrivo
                  onDoubleClick={(e) => { e.stopPropagation(); if (!visitabile) return; e.preventDefault(); editor!.onVisita!(visitabile.mappa); }}
                >
                  <SpilloGrafico tipo={s.tipo} colore={s.colore} />
                  <span className="spillo-mappa__etichetta">{nomePin(s)}</span>
                </button>
              );
            })}
            {selezionato && !editor && selezionato.id !== popupSoppresso && (singoli.some((s) => s.id === selezionato.id) || gruppi.some((g) => g.spilli.some((s) => s.id === selezionato.id))) && inPortale(popupSuFoglio, (
              <div ref={agganciaPopup} tabIndex={-1} className={`spillo-popup ${popupSotto ? 'spillo-popup--sotto' : ''} ${popupFoglio || guidaSuFoglio ? 'spillo-popup--foglio' : ''} ${guidaSuFoglio ? 'spillo-popup--sopra-guida' : ''}`} role="dialog" aria-label={nomePin(selezionato)} style={popupSuFoglio ? stileFoglio : { left: `${selezionato.x}%`, top: `${selezionato.y}%`, transform: `scale(${1 / zoom}) translate(calc(-50% + ${popupDx}px), ${popupSotto ? '14px' : 'calc(-100% - 42px)'})`, '--spillo-popup-freccia': `calc(50% - ${popupDx}px)` } as CSSProperties} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                <div className="flex items-start gap-2">
                  <PuntoSpillo tipo={selezionato.tipo} colore={selezionato.colore} />
                  <div className="flex-1 min-w-0">
                    <strong className="block testo-13 leading-tight">{nomePin(selezionato)}</strong>
                    <span className="block testo-12 text-text-muted">{selezionato.tipoNome}{selezionato.raccolto ? ` · ${parolaSegnato(selezionato)}` : ''}</span>
                    {/* L4 (§1.4, R4-34): a quale infiltrazione si riferisce lo stato di un pin di voci che si ripropongono */}
                    {/* §4.2: con voci di più infiltrazioni, l'infiltrazione dello stato si sceglie (la pagina rilegge in quella) */}
                    {selezionato.contestoInfiltrazione && (() => {
                      const contesto = selezionato.contestoInfiltrazione;
                      const infiltrazioni = [...new Map(selezionato.voci.filter((v) => v.infiltrazione).map((v) => [v.infiltrazione!.chiave, v.infiltrazione!])).values()];
                      return onContesto && infiltrazioni.length > 1
                        ? <span className="flex w-full items-center gap-1.5 testo-12 text-text-secondary" role="group" aria-label="Infiltrazione dello stato">
                            {/* L7-11: forma neutra, giusta con ogni nome («Corridoio della prigione», «3ª infiltrazione»), e non più larga di prima */}
                            <span className="shrink-0">Stato in</span>
                            <Selettore compatto valoreNelNome className="min-w-0 flex-1" etichetta="Stato in" valore={contesto.chiave} ricerca="mai"
                              opzioni={infiltrazioni.map((i) => ({ chiave: i.chiave, nome: i.nome }))} onCambia={(k) => { if (k && k !== contesto.chiave) onContesto(k); }} />
                          </span>
                        : <span className="block testo-12 text-text-secondary">Stato in: {contesto.nome}</span>;
                    })()}
                    {selezionato.disponibilita && <ChipDisponibilita disponibilita={selezionato.disponibilita} compatto />}
                    {/* L4 (§4.2): pin fatto con una voce non fatta, da prima dell'aggiornamento: il tocco apre la finestra che lo sistema */}
                    {selezionato.daVerificare && onDaVerificare && partitaId && selezionato.uid && (() => {
                      const voce = selezionato.voci.find((v) => v.daVerificare) ?? selezionato.voci[0];
                      return voce ? <PulsanteVisivo compatto className="mt-1 self-start" icona={<IconaSegno chiave="da-verificare" dimensione={20} />} titolo="Da verificare"
                        onClick={() => onDaVerificare({ spilloUid: selezionato.uid!, spilloNome: nomePin(selezionato), mappaNome: mappa.nome, voce: voce.chiave, voceNome: voce.nome, infiltrazioneNome: voce.infiltrazione?.nome ?? null })} /> : null;
                    })()}
                  </div>
                  <button type="button" className="spillo-popup__chiudi" onClick={() => chiudiPopup(selezionato.id)} aria-label="Chiudi il popup">×</button>
                </div>
                {/* L5 §2: lo spillo chiesto che adesso non c'è (chiuso, non ancora sbloccato): lo si dice, col motivo */}
                {selezionato.id === spilloChiesto && nonDisponibile(selezionato) && (
                  <p className="m-0 flex flex-wrap items-center gap-1.5 testo-12" role="status"><span className="chip chip--attivo testo-12">Non disponibile adesso</span><span className="text-text-secondary">{selezionato.presenza?.testo ?? motivoNonDisponibile(selezionato.disponibilita)}</span></p>
                )}
                {selezionato.descrizione && <p className="m-0 testo-12 text-text-secondary spillo-popup__testo">{selezionato.descrizione}</p>}
                {/* L5: la descrizione propria del pin di un luogo, se diversa da quella del luogo */}
                {selezionato.notaPin && <p className="m-0 testo-12 text-text-muted">Nota del pin: {selezionato.notaPin}</p>}
                <CondizioniSpilloElenco condizioni={selezionato.condizioni} disponibilita={selezionato.disponibilita} compatto />
                {(selezionato.immagini.length > 0 || selezionato.dettaglio?.immagine) && (
                  <div className="flex flex-wrap gap-1 items-start">
                    <ImmagineRiferimento immagine={selezionato.dettaglio?.immagine} nome={nomePin(selezionato)} dimensione={48} />
                    <GalleriaSpillo immagini={selezionato.immagini} nome={nomePin(selezionato)} compatta />
                  </div>
                )}
                {/* Quel che il popup offre lo decide la **categoria** dello spillo (richiesta dell'utente,
                    2026-09-11): uno spostamento porta altrove; uno spillo di città mostra la merce del
                    negozio disponibile adesso (o l'attività, o il Confidente); un consumabile si segna
                    fatto; un informativo dice e basta. */}
                {categoriaSpillo(selezionato.tipo) === 'citta' && selezionato.dettaglio?.negozio && <MerceNelPopup negozio={selezionato.dettaglio.negozio} spillo={selezionato} partitaId={partitaId} occupato={occupato} onAcquisto={onAcquisto ? cambiaAcquisto : undefined} onAcquistiCambiati={onAcquistiCambiati} />}
                <div className="flex flex-wrap gap-1">
                  {categoriaSpillo(selezionato.tipo) === 'spostamento' && <NavigazioneSpillo spillo={selezionato} partitaId={partitaId} onNaviga={passaDa(selezionato)} nomeMappa={selezionato.destinazioneNomi?.mappa} nomeSpillo={selezionato.destinazioneNomi?.spillo ?? undefined} />}
                  {/* un pin con uno stato (un consumabile, un meccanismo, una porta…: `statoDelPin`, 2026-10-03), e anche un pin senza
                      collegato a una o più voci della guida (una sicura, un passaggio): lo stato delle voci è il suo (2026-10-01, 098) */}
                  {(statoDelPin(selezionato) !== null || selezionato.voci.length > 0) && partitaId && !passaggioConArrivo(selezionato) && <AzioniStato spillo={selezionato} occupato={occupato} onRaccolto={onRaccolto ? cambiaRaccolto : undefined} onStatoPunto={onStatoPunto ? cambiaStatoPunto : undefined} />}
                  {/* L5 (T5): il pin di un luogo porta alla pagina del luogo, col suo nome (un negozio con sede: alla sua sezione nella pagina) */}
                  {categoriaSpillo(selezionato.tipo) === 'citta' && selezionato.dettaglio?.luogo?.casa && (() => {
                    const l = selezionato.dettaglio.luogo;
                    const n = selezionato.dettaglio.negozio;
                    const casaNegozio = n ? l.negozi?.find((x) => x.chiave === n.chiave)?.casa : undefined;
                    return <CollegamentoVisivo to={casaNegozio ?? l.casa!} tono="secondario" compatto icona={<IconaAzione chiave={n ? 'negozio' : 'scheda'} dimensione={20} />} titolo={l.nome} dettaglio={n && n.nome !== l.nome ? n.nome : l.orariTesto ?? l.quando ?? undefined} />;
                  })()}
                  {categoriaSpillo(selezionato.tipo) === 'citta' && selezionato.dettaglio?.negozio && !selezionato.dettaglio.luogo?.casa && (
                    <CollegamentoVisivo to={`/guida/negozi/${encodeURIComponent(selezionato.dettaglio.negozio.chiave)}`} tono="secondario" compatto icona={<IconaAzione chiave="negozio" dimensione={20} />} titolo={selezionato.dettaglio.negozio.nome} />
                  )}
                  {categoriaSpillo(selezionato.tipo) === 'citta' && selezionato.dettaglio?.tipo === 'confidente' && selezionato.dettaglio.confidente && (
                    <CollegamentoVisivo to={`/confidenti/${encodeURIComponent(selezionato.dettaglio.confidente.chiave)}`} tono="primario" compatto icona={<IconaSpillo tipo="confidente" dimensione={20} />} titolo={selezionato.dettaglio.confidente.nome} dettaglio="scheda del Confidente" />
                  )}
                  {/* uno spillo «Confidente» rimanda ai Confidenti anche se non è ancora collegato a uno preciso (richiesta dell'utente) */}
                  {selezionato.tipo === 'confidente' && selezionato.dettaglio?.tipo !== 'confidente' && (
                    <CollegamentoVisivo to="/confidenti" tono="primario" compatto icona={<IconaSpillo tipo="confidente" dimensione={20} />} titolo="Confidenti" dettaglio="la pagina dei Confidenti" />
                  )}
                  {categoriaSpillo(selezionato.tipo) === 'citta' && (selezionato.dettaglio?.tipo === 'luogo' || selezionato.dettaglio?.tipo === 'attivita') && selezionato.dettaglio.luogo && !selezionato.dettaglio.luogo.casa && !selezionato.dettaglio.negozio && (
                    <CollegamentoVisivo to={`/guida/citta/${encodeURIComponent(selezionato.dettaglio.luogo.quartiere)}`} tono="secondario" compatto icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo={selezionato.dettaglio.luogo.nome} dettaglio={selezionato.dettaglio.luogo.orariTesto ?? selezionato.dettaglio.luogo.cosaOffre ?? 'scheda del quartiere'} />
                  )}
                  {(selezionato.dettaglio?.negozio || selezionato.voci.length > 0 || selezionato.dettaglio?.tipo === 'luogo' || selezionato.dettaglio?.tipo === 'confidente' || selezionato.dettaglio?.tipo === 'richiesta' || selezionato.immagini.length > 0) && (
                    <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo="Dettagli" onClick={apriScheda} />
                  )}
                </div>
              </div>
            ))}
            {/* Il gruppo si apre e dice chi c'è dentro. Prima l'unica sua azione era ingrandire di
                2,2×, e su spilli con le **stesse** coordinate — nel pacchetto ce ne sono 228 coppie su
                74 mappe — la distanza sullo schermo resta zero a qualunque ingrandimento: il gruppo non
                si scioglieva mai e il tocco non faceva niente (rilievo del validatore, 2026-09-13).
                Ora il tocco apre l'elenco, che non dipende dallo zoom; ingrandire resta un comando
                dell'elenco, utile quando gli spilli sono vicini ma non coincidenti. */}
            {gruppi.map((g) => {
              const aperto = gruppoAperto === g.chiave;
              const dentro = g.spilli.some((s) => s.id === selezionatoId);
              return (
                <button
                  key={g.chiave}
                  type="button"
                  className={`spillo-mappa spillo-mappa--gruppo ${aperto || dentro ? 'spillo-mappa--selezionato' : ''}`}
                  // Con «Aggiungi» o «Incolla» in mano il gruppo si fa da parte: il tocco serve a
                  // posare un pin in quel punto, non ad aprire un elenco.
                  // Lo scostamento si scrive **così com'è**, senza moltiplicarlo per lo zoom: dentro
                  // `scale(1/zoom) translate(t)`, con il livello che scala di zoom, quel che arriva
                  // sullo schermo è esattamente `t`. Il fattore che c'era prima amplificava lo
                  // spostamento — misurato: scosto 27 px reso 74 a zoom 2,74 — e nessuno se n'era
                  // accorto perché il calcolo era provato dai test e il **reso** no (rilievo del
                  // validatore, 2026-09-13). Lo stesso valeva per il popup e per l'elenco.
                  style={{ left: `${g.x}%`, top: `${g.y}%`, transform: `scale(${1 / zoom}) translate(calc(-50% + ${g.scosto?.x ?? 0}px), calc(-50% + ${g.scosto?.y ?? 0}px))`, pointerEvents: editor && editor.strumento !== 'seleziona' ? 'none' : undefined }}
                  aria-label={`${nomeGruppo(g.spilli.length)}: ${g.spilli.map((s) => s.nome).join(", ")}`}
                  aria-expanded={aperto}
                  title={g.spilli.map((s) => s.nome).join(', ')}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); if (pinchRecente(e.timeStamp)) return; seleziona(null); setGruppoAperto(aperto ? null : g.chiave); }}
                  onDoubleClick={(e) => e.stopPropagation()}
                >
                  <span className="spillo-mappa__gruppo">+{g.spilli.length}</span>
                </button>
              );
            })}
            {/* L'elenco sta dentro la tela, che ritaglia: come il popup dello spillo scorre in
                orizzontale quanto basta e si ribalta sotto il gruppo quando sopra non c'è posto.
                Senza, a 768 e 1280 l'intestazione e il tasto di chiusura finivano fuori dal
                ritaglio (rilievo del validatore, 2026-09-13). Quanto sia alto e da che parte stia
                lo decide `elenco`, qui sopra, contando il contorno invece di stimarlo. */}
            {gruppoScelto && inPortale(elenco.foglio, (
              <div className={`spillo-popup ${elencoSotto ? 'spillo-popup--sotto' : ''} ${elenco.foglio ? 'spillo-popup--foglio' : ''} ${guidaSuFoglio ? 'spillo-popup--sopra-guida' : ''}`} role="dialog" aria-label={nomeGruppo(gruppoScelto.spilli.length)}
                style={elenco.foglio ? stileFoglio : { left: `${gruppoScelto.x}%`, top: `${gruppoScelto.y}%`, transform: `scale(${1 / zoom}) translate(calc(-50% + ${elencoDx}px), ${elencoSotto ? '26px' : 'calc(-100% - 26px)'})`, '--spillo-popup-freccia': `calc(50% - ${elencoDx}px)` } as CSSProperties}
                onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                <div className="flex items-start gap-2">
                  <strong className="flex-1 testo-13 leading-tight">{gruppoScelto.spilli.length === 1 ? 'Un altro spillo qui' : `${gruppoScelto.spilli.length} spilli qui`}</strong>
                  <button type="button" className="spillo-popup__chiudi touch" onClick={() => setGruppoAperto(null)} aria-label="Chiudi l’elenco">×</button>
                </div>
                <ul className={`m-0 list-none flex flex-col gap-0.5 ${elenco.altezzaVoci === undefined ? 'p-0' : 'area-scorrevole p-0.5'}`} style={elenco.altezzaVoci === undefined ? undefined : { maxHeight: elenco.altezzaVoci }}>
                  {gruppoScelto.spilli.map((s) => (
                    <li key={s.id}>
                      {/* in modalità scelta l'elenco resta aperto: nello stesso punto se ne collegano anche più d'uno */}
                      <button type="button" className={`visore-mappa__voce ${scelta?.scelti.has(s.id) ? 'visore-mappa__voce--attiva' : ''}`} disabled={scelta?.occupato}
                        aria-pressed={scelta ? scelta.scelti.has(s.id) : undefined}
                        onClick={(e) => { if (scelta) { scelta.onScegli(s); return; } setGruppoAperto(null); if (vaSubito(s)) { vaiAllArrivo(s); return; } seleziona(s.id); fuocoAlPopup.current = e.detail === 0; }}>
                        <PuntoSpillo tipo={s.tipo} colore={s.colore} />
                        <span className="flex-1 min-w-0 break-words text-left">{nomePin(s)}</span>
                        <span className="testo-12 text-text-muted shrink-0">{s.tipoNome}{scelta?.scelti.has(s.id) ? ' · collegato' : ''}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {/* Serve solo quando gli spilli sono vicini ma distinti: se hanno le stesse
                    coordinate non si separano nemmeno a 800%, e prometterlo sarebbe una bugia. */}
                {zoom < zoomMax - 1e-6 && (
                  <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="ingrandisci" dimensione={20} />} titolo="Ingrandisci qui"
                    onClick={() => { setGruppoAperto(null); applicaZoom(zoom * 2.2, pan.x + (gruppoScelto.x / 100) * nat.w * zoom, pan.y + (gruppoScelto.y / 100) * nat.h * zoom); }} />
                )}
              </div>
            ))}
          </div>
          <div className="visore-mappa__controlli" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
            <button type="button" className="visore-mappa__controllo" onClick={() => zoomCentro(1.4)} disabled={zoom >= zoomMax - 1e-6} aria-label="Ingrandisci" title="Ingrandisci"><IconaAzione chiave="ingrandisci" dimensione={20} /></button>
            <button type="button" className="visore-mappa__controllo" onClick={() => zoomCentro(1 / 1.4)} disabled={zoom <= zoomMin + 1e-6} aria-label="Riduci" title="Riduci"><IconaAzione chiave="riduci" dimensione={20} /></button>
            <button type="button" className="visore-mappa__controllo" onClick={adatta} aria-label="Adatta alla finestra" title="Adatta alla finestra"><IconaAzione chiave="adatta" dimensione={20} /></button>
            <span className="visore-mappa__zoom tabular-nums" aria-live="polite">{Math.round((zoom / zoomMin) * 100)}%</span>
          </div>
        </div>

      </div>
      {/* L3 RG-1: la guida da usare, fuori dal livello trasformato (finestra fissa sullo schermo, o foglio dal basso) */}
      {conGuida && guidaAperta && (
        <GuidaNelVisore mappa={mappa.chiave} partitaId={partitaId} spilloSelezionato={selezionatoId} spilliQui={spilliQui} onCentra={mostraDallaGuida}
          onCambiato={guida?.onCambiato} onChiudi={chiudiGuida} ancora={guidaAperta} versione={versioneStati} foglioRef={guidaFoglio} />
      )}
    </div>
  );
}

