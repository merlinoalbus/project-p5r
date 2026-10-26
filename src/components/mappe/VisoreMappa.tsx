// ============================================================
// VisoreMappa — visore a schermo intero (o incorporato) di una mappa a livelli (Fase 13.2)
// ============================================================
//
// Zoom con minimo «adatta» (rotellina attorno al cursore, pulsanti, pinch), trascinamento, doppio click per adattare; spilli con icona per
// tipo a dimensione costante (scala inversa allo zoom) e raggruppamento «+n» degli spilli più vicini di un bersaglio; legenda con filtri e conteggi, ricerca,
// scheda dello spillo con le azioni dell'entità collegata; navigazione fra i livelli (percorso, mappe figlie, passaggi). In uso normale nessun
// click sulla mappa modifica i dati: l'editor (13.3) passa i propri strumenti tramite `editor`.
// ============================================================

import type { SchedaContenutoGuidaDto } from '../../../shared/organizzazioneMappe';
import { areaImmagine, inquadraturaMappa, type AreaMappa } from '../../utils/inquadraturaMappa';
import { areaConPezzi, copiePosate, mascheraZone, nomeCopia, posaDi, statoPezzo, stileImmagineMascherata, stilePezzo } from '../../utils/pezziMappa';
import { raggruppaSpilli, type Punto } from '../../utils/raggruppaSpilli';
import { testoAvanzamento } from '../../utils/gestiVoce';
import { NavigazioneSpillo } from './NavigazioneSpillo';
import { arrivoSpillo, nomeDellaMeta, nomeMetaSpillo, type NavigaMappa } from '../../utils/navigazioneMappa';
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type Ref } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { eOffertaAojiru } from '../../../shared/acquisti';
import { eRifornibile } from '../../../shared/rifornimento';
import { ConsumiAojiru } from '../catalogo/ConsumiAojiru';
import { AcquistiOfferta } from '../catalogo/AcquistiOfferta';
import { annullaRigaAcquisto, togliSegnoSenzaGiorno } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import type { DisponibilitaDto } from '../../types';
import type { MappaDto, SpilloDto, VoceDelPinDto } from '../../types';
import { DEFINIZIONI_SPILLO, TIPI_SPILLO, categoriaSpillo, parolaDelloStato, puntoDescrittivo, ritornoDelloStato, statoDelPin, type TipoSpillo } from '../../../shared/spilli';
import { useImmagineMappa } from '../../hooks/useImmagineMappa';
import { IconaSpillo, PuntoSpillo, SpilloGrafico } from './IconaSpillo';
import { PulsanteVisivo, CollegamentoVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione, IconaSegno } from '../shared/IconaAzione';
import { IconMappa } from '../shared/iconeGuida';
import { AssetImg } from '../shared/AssetImg';
import { Modal } from '../shared/Modal';
import { Selettore } from '../shared/Selettore';
import { ChipDisponibilita } from '../guida/ChipDisponibilita';
import { CostoDellOggetto } from '../catalogo/CostoDellOggetto';
import { OggettiCollegati } from '../catalogo/OggettiCollegati';
import { CondizioniSpilloElenco } from './CondizioniSpillo';
import { ProveNativeSpillo } from './ProveNativeSpillo';
import type { DivergenzaDaVerificare } from '../guida/FinestraDaVerificare';
import { GuidaNelVisore } from './GuidaNelVisore';
import type { ImmagineSpilloDto } from '../../types';
import { useSuggerimenti } from '../../stores/suggerimentiStore';
import { descrizioneImmagineMappa, nomeFiglieMappa, nomeTipoMappa, titoloMappeVicine } from '../../utils/vocabolarioMappe';

export type StatoPuntoMappa = 'ottenuto' | 'esaurito' | null;

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
  /** L3 RG-1: la guida della planimetria da usare (pulsante «Guida» nella barra), nelle planimetrie dei Palazzi; `onCambiato` avvisa chi
   *  ospita il visore di uno stato salvato dalla guida (rilegge la mappa). Senza, il pulsante non c'è. */
  guida?: { onCambiato?: () => void };
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
/** Come si chiama un pin nell'etichetta, negli elenchi e nella scheda: un passaggio col nome del posto in cui porta, letto dal vivo
 *  (L2, decisione dell'utente: «chiamandolo con il suo nome… e non con mappa»); gli altri col loro nome. Il nome proprio di un
 *  passaggio, se diverso, resta come nota nella scheda. */
const nomePin = (s: SpilloDto | SchedaContenutoGuidaDto) => ('mappaChiave' in s ? nomeMetaSpillo(s) : null) ?? s.nome;
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

/** Sotto i 768 px il popup è un foglio dal basso, fisso sullo schermo: deve stare **fuori** dal livello
 *  della mappa, che è trasformato (scala e traslazione) e renderebbe `position: fixed` relativo a sé. */
function useSchermoStretto(): boolean {
  const [stretto, setStretto] = useState(() => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(SCHERMO_STRETTO).matches : false));
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(SCHERMO_STRETTO);
    /** Rilegge la media query e aggiorna lo stato. */
    const aggiorna = () => setStretto(mq.matches);
    // anche su `resize`: l'emulazione del viewport negli strumenti di sviluppo non sempre emette `change`
    mq.addEventListener('change', aggiorna);
    window.addEventListener('resize', aggiorna);
    return () => { mq.removeEventListener('change', aggiorna); window.removeEventListener('resize', aggiorna); };
  }, []);
  return stretto;
}
/** Con `fuori` porta il nodo in un portale su `document.body` (fuori dal livello trasformato della
 * mappa, per il foglio dal basso); altrimenti lo lascia dov'è. */
const inPortale = (fuori: boolean, nodo: ReactNode): ReactNode => (fuori ? createPortal(nodo, document.body) : nodo);

/** Immagine dell'entità collegata (istanza → asset del repository); niente se l'entità non ha immagini nell'app. */
export function ImmagineRiferimento({ immagine, nome, dimensione = 56 }: { immagine: { url: string | null; asset: string | null } | null | undefined; nome: string; dimensione?: number }) {
  if (!immagine || (!immagine.url && !immagine.asset)) return null;
  const stile = { width: dimensione, height: dimensione };
  if (immagine.url) return <img src={immagine.url} alt={`Immagine: ${nome}`} className="object-cover border border-border shrink-0" style={stile} draggable={false} />;
  return <AssetImg nome={immagine.asset} alt={`Immagine: ${nome}`} className="object-cover border border-border shrink-0" style={stile} fallback={null} />;
}

/** Galleria delle schermate di riferimento dello spillo: miniature, ingrandimento in finestra. */
export function GalleriaSpillo({ immagini, nome, compatta }: { immagini: ImmagineSpilloDto[]; nome: string; compatta?: boolean }) {
  const [aperta, setAperta] = useState<ImmagineSpilloDto | null>(null);
  if (immagini.length === 0) return null;
  const d = compatta ? 48 : 72;
  return (
    <>
      <ul className="m-0 p-0 list-none flex flex-wrap gap-1" aria-label={`Schermate di ${nome}`}>
        {immagini.map((i, n) => (
          <li key={i.id}>
            <button type="button" className="p-0 border border-border bg-bg-tertiary block" style={{ width: d, height: d }} onClick={() => setAperta(i)} title={i.didascalia || `Schermata ${n + 1}`} aria-label={`Ingrandisci: ${i.didascalia || `schermata ${n + 1}`}`}>
              {i.url ? <img src={i.url} alt="" className="w-full h-full object-cover" draggable={false} /> : <AssetImg nome={i.asset} alt="" decorativa className="w-full h-full object-cover" fallback={<span className="testo-12 text-text-muted">asset</span>} />}
            </button>
          </li>
        ))}
      </ul>
      <Modal titolo={aperta?.didascalia || nome} aperta={aperta !== null} onChiudi={() => setAperta(null)} larga>
        {aperta && (aperta.url ? <img src={aperta.url} alt={aperta.didascalia || nome} className="max-w-full max-h-[75vh] mx-auto block" /> : <AssetImg nome={aperta.asset} alt={aperta.didascalia || nome} className="max-w-full max-h-[75vh] mx-auto block" fallback={<p className="m-0 testo-13 text-text-muted">Asset «{aperta.asset}» non ancora presente nel repository.</p>} />)}
      </Modal>
    </>
  );
}

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

/** Etichetta leggibile della disponibilità di un articolo: il dato porta già la preposizione («dal 18 aprile», «dopo Palazzo di Madarame», «solo in primavera»), come in ArticoliTabella. */
function disponibilita(a: { disponibileDal: string | null }): string {
  return a.disponibileDal?.trim() || 'sempre';
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
  const tela = useRef<HTMLDivElement | null>(null);
  // id delle istruzioni da tastiera lette dal lettore di schermo (`aria-describedby` della tela): uno per visore, ce ne può essere più d'uno in pagina
  const idIstruzioni = useId();
  const [dim, setDim] = useState<Dimensioni>({ w: 0, h: 0 });
  // l'altezza del popup dello spillo, misurata quando è ancorato al punto (vedi `popupSotto`): per spillo, così una nuova selezione rimisura
  const popupRif = useRef<HTMLDivElement | null>(null);
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
    el.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
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
  const seleziona = useCallback((id: number | null) => { setPopupSoppresso(null); if (editor) editor.onSeleziona(id); else setSelezionatoUso(id); }, [editor]);

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
  const applicaZoom = useCallback((nuovo: number, cx: number, cy: number) => {
    const { zoom: z1, pan: p1, zoomMin: mn, zoomMax: mx } = stato.current;
    const z2 = limita(nuovo, mn, mx);
    const k = z2 / z1;
    setZoomEsplicito(z2);
    setPanEsplicito({ x: cx - (cx - p1.x) * k, y: cy - (cy - p1.y) * k });
  }, []);
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
  const adatta = () => { setZoomEsplicito(null); setPanEsplicito(null); };
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
  /** Porta all'arrivo del pin di spostamento (con lo spillo d'arrivo se indicato). */
  const vaiAllArrivo = (s: SpilloDto) => {
    const a = arrivoSpillo(s);
    if (a) onNaviga(a.mappa, a.spillo ? { spillo: a.spillo } : undefined);
  };
  // L3 RG-1: la guida della planimetria da usare, nelle planimetrie dei Palazzi, fuori dall'editor e dalla scelta dei pin
  const conGuida = !!guida && !editor && !scelta && mappa.area?.contenitore.tipo === 'dungeon';
  const [guidaAperta, setGuidaAperta] = useState<{ top: number; right: number } | null>(null);
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
    centraSu(s);
  };
  // gli stati della mappa (pin e voci): quando cambiano altrove, la guida si rilegge
  const versioneStati = conGuida ? mappa.spilli.map((s) => `${s.id}:${s.raccolto ? 1 : 0}:${s.voci.map((v) => v.stato ?? '').join(',')}`).join('|') : '';
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
  const gesto = useRef<{ tipo: 'trascina'; x: number; y: number; px: number; py: number; mosso: boolean } | { tipo: 'pinch'; d0: number; z0: number; cx: number; cy: number; px: number; py: number } | { tipo: 'spillo'; id: number; mosso: boolean; x: number; y: number }
    | { tipo: 'ritaglia'; x0: number; y0: number } | { tipo: 'pezzo'; id: number; mosso: boolean; x: number; y: number; px0: number; py0: number; w: number; h: number } | null>(null);
  const [trascinato, setTrascinato] = useState<{ id: number; x: number; y: number } | null>(null);
  /** Il rettangolo che si sta ritagliando e il pezzo che si sta trascinando (102), in pixel dell'immagine. */
  const [rettangolo, setRettangolo] = useState<{ x: number; y: number; larghezza: number; altezza: number } | null>(null);
  const [pezzoTrascinato, setPezzoTrascinato] = useState<{ id: number; x: number; y: number } | null>(null);
  const [trascinando, setTrascinando] = useState(false);
  const schermoStretto = useSchermoStretto();
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
    puntatori.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (puntatori.current.size === 2) {
      const [a, b] = [...puntatori.current.values()];
      const r = e.currentTarget.getBoundingClientRect();
      gesto.current = { tipo: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y), z0: zoom, cx: (a.x + b.x) / 2 - r.left, cy: (a.y + b.y) / 2 - r.top, px: pan.x, py: pan.y };
      setRettangolo(null);
    } else if (puntatori.current.size === 1 && !gesto.current) {
      if (editor?.strumento === 'ritaglia' && editor.pezzi) {
        const p = pixel(e.clientX, e.clientY);
        gesto.current = { tipo: 'ritaglia', x0: p.x, y0: p.y };
        setRettangolo({ x: p.x, y: p.y, larghezza: 0, altezza: 0 });
      } else gesto.current = { tipo: 'trascina', x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, mosso: false };
    }
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
      setZoomEsplicito(z2);
      setPanEsplicito({ x: g.cx - (g.cx - g.px) * k, y: g.cy - (g.cy - g.py) * k });
    } else if (g.tipo === 'trascina') {
      const dx = e.clientX - g.x;
      const dy = e.clientY - g.y;
      if (Math.abs(dx) + Math.abs(dy) > 4 && !g.mosso) { g.mosso = true; setTrascinando(true); }
      if (g.mosso) setPanEsplicito({ x: g.px + dx, y: g.py + dy });
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
    if (g.tipo === 'pinch') { if (puntatori.current.size < 2) gesto.current = null; return; }
    gesto.current = null;
    setTrascinando(false);
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
  const annullaGesto = () => { puntatori.current.clear(); gesto.current = null; setTrascinato(null); setRettangolo(null); setPezzoTrascinato(null); setTrascinando(false); };

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
  const misuraPopup = selezionato && altezzaPopupMisurata?.id === selezionato.id ? altezzaPopupMisurata.h : null;
  const altezzaPopup = misuraPopup ?? (selezionato && categoriaSpillo(selezionato.tipo) === 'citta' && selezionato.dettaglio?.negozio ? 438 : 218);
  const yPopup = selezionato ? pan.y + (selezionato.y / 100) * nat.h * zoom : 0;
  // 42 di punta sopra, 14 sotto, e 8 di respiro dal bordo della tela
  const staSopra = yPopup >= altezzaPopup + 42 + 8;
  const staSotto = dim.h - yPopup >= altezzaPopup + 14 + 8;
  const popupSotto = selezionato !== null && !staSopra && (staSotto || misuraPopup === null || dim.h === 0);
  // il foglio solo con l'altezza misurata e la tela misurata: una stima non basta a togliere il popup dal suo punto
  const popupFoglio = selezionato !== null && !schermoStretto && misuraPopup !== null && dim.h > 0 && !staSopra && !staSotto;
  // misurato solo ancorato al punto (largo 260): nel foglio è più largo e più basso, e misurarlo lì lo farebbe saltare da un modo all'altro
  useLayoutEffect(() => {
    const el = popupRif.current;
    if (!el || !selezionato || schermoStretto || popupFoglio) return;
    const h = el.offsetHeight;
    if (h > 0 && (altezzaPopupMisurata?.id !== selezionato.id || altezzaPopupMisurata.h !== h)) setAltezzaPopupMisurata({ id: selezionato.id, h });
  }, [selezionato, schermoStretto, popupFoglio, altezzaPopupMisurata]);
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
  const { singoli, gruppi } = useMemo(
    () => raggruppaSpilli(visibili, { pan: { x: pan.x, y: pan.y }, zoom, nat: { w: nat.w, h: nat.h }, dim: { w: dim.w, h: dim.h } }, { selezionatoId, editor: inEditor }),
    [visibili, pan.x, pan.y, zoom, nat.w, nat.h, dim.w, dim.h, selezionatoId, inEditor],
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
    if (!gruppoScelto) return { sotto: false, dx: 0, altezzaVoci: undefined as number | undefined, foglio: schermoStretto };
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
    const foglio = schermoStretto || dim.h === 0 ? schermoStretto : capiente < CONTORNO + VOCE;
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
  });
  const stileLivello: CSSProperties = { transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, width: nat.w, height: nat.h, '--zoom-mappa': zoom } as CSSProperties;
  const cursore = editor && editor.strumento !== 'seleziona' ? 'cursor-crosshair' : 'cursor-grab';
  const percorsoTesto = mappa.percorso.map((p) => p.nome).join(' › ');

  /** Consultazione da tastiera (WCAG 2.1.1, 2.5.7), solo fuori dall'editor: con la tela a fuoco le frecce spostano la vista, + e − ingrandiscono
   *  e riducono attorno al centro, 0 o Home tornano alla vista intera; Esc chiude il popup del pin aperto (da dentro il popup, anche se è in un
   *  portale: gli eventi React risalgono comunque alla tela) e riporta il fuoco sul pin. Tab/Maiusc+Tab fra i pin e Invio/Spazio sono quelli
   *  nativi dei pulsanti `.spillo-mappa`, con lo stesso `onClick` del tocco. Un tasto già gestito da un controllo interno (la tendina del
   *  Selettore, un campo) non arriva qui come comando: i comandi di vista agiscono solo se il fuoco è sulla tela stessa. */
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
    <div className={`visore-mappa ${incorporato ? 'visore-mappa--incorporato' : 'visore-mappa--intero'} ${pannelloAperto ? '' : 'visore-mappa--pannello-chiuso'} ${className ?? ''}`} data-testid="visore-mappa"
      style={{ '--proporzione-immagine': `${nat.w} / ${nat.h}` } as CSSProperties}>
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
          {azioni}
          {conGuida && <PulsanteVisivo tono={guidaAperta ? 'primario' : 'fantasma'} compatto icona={<IconaAzione chiave="libro" dimensione={20} />} titolo="Guida" aria-pressed={!!guidaAperta} onClick={apriGuida} />}
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
            <SchedaSpillo key={`${partitaId}:${selezionato.id}`} ref={schedaRef} spillo={selezionato} partitaId={partitaId} occupato={occupato} onNaviga={onNaviga} onRaccolto={onRaccolto ? cambiaRaccolto : undefined} onStatoPunto={onStatoPunto ? cambiaStatoPunto : undefined} onAcquisto={onAcquisto ? cambiaAcquisto : undefined} onAcquistiCambiati={onAcquistiCambiati} onChiudi={() => seleziona(null)} onCentra={() => centraSu(selezionato)} />
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
                  <button type="button" className={`visore-mappa__voce ${s.id === selezionatoId ? 'visore-mappa__voce--attiva' : ''} ${s.raccolto ? 'opacity-60' : ''}`} onClick={() => { if (scelta) { scelta.onScegli(s); centraSu(s); return; } seleziona(s.id); centraSu(s); }} aria-pressed={scelta ? scelta.scelti.has(s.id) : s.id === selezionatoId}>
                    <PuntoSpillo tipo={s.tipo} colore={s.colore} />
                    <span className="flex-1 min-w-0 truncate">{nomePin(s)}</span>
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
          onPointerDown={suPointerDown} onPointerMove={suPointerMove} onPointerUp={suPointerUp} onPointerCancel={annullaGesto} onDoubleClick={adatta}
        >
          {!editor && <span id={idIstruzioni} className="sr-only">Frecce per spostare la mappa, più e meno per ingrandire e ridurre, zero o Inizio per la vista intera. Tab per passare da uno spillo all'altro, Invio o Spazio per aprirlo, Esc per chiudere la scheda.{scelta ? '' : " L'elenco degli spilli è nel pannello."}</span>}
          <div className="visore-mappa__livello" style={stileLivello}>
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
                  onClick={(e) => { e.stopPropagation(); if (scelta) { scelta.onScegli(s); return; } if (editor && editor.strumento !== 'seleziona') return; if (vaSubito(s)) { vaiAllArrivo(s); return; } seleziona(attivo && s.id !== popupSoppresso ? null : s.id); }}
                  onDoubleClick={(e) => { if (!visitabile) return; e.stopPropagation(); e.preventDefault(); editor!.onVisita!(visitabile.mappa); }}
                >
                  <SpilloGrafico tipo={s.tipo} colore={s.colore} />
                  <span className="spillo-mappa__etichetta">{nomePin(s)}</span>
                </button>
              );
            })}
            {selezionato && !editor && selezionato.id !== popupSoppresso && (singoli.some((s) => s.id === selezionato.id) || gruppi.some((g) => g.spilli.some((s) => s.id === selezionato.id))) && inPortale(schermoStretto || popupFoglio, (
              <div ref={popupRif} className={`spillo-popup ${popupSotto ? 'spillo-popup--sotto' : ''} ${popupFoglio ? 'spillo-popup--foglio' : ''}`} role="dialog" aria-label={nomePin(selezionato)} style={schermoStretto || popupFoglio ? undefined : { left: `${selezionato.x}%`, top: `${selezionato.y}%`, transform: `scale(${1 / zoom}) translate(calc(-50% + ${popupDx}px), ${popupSotto ? '14px' : 'calc(-100% - 42px)'})`, '--spillo-popup-freccia': `calc(50% - ${popupDx}px)` } as CSSProperties} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
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
                            <span className="shrink-0">Stato nella</span>
                            <Selettore compatto valoreNelNome className="min-w-0 flex-1" etichetta="Stato nella" valore={contesto.chiave} ricerca="mai"
                              opzioni={infiltrazioni.map((i) => ({ chiave: i.chiave, nome: i.nome }))} onCambia={(k) => { if (k && k !== contesto.chiave) onContesto(k); }} />
                          </span>
                        : <span className="block testo-12 text-text-secondary">Stato nella {contesto.nome}</span>;
                    })()}
                    {selezionato.disponibilita && <ChipDisponibilita disponibilita={selezionato.disponibilita} compatto />}
                    {/* L4 (§4.2): pin fatto con una voce non fatta, da prima dell'aggiornamento: il tocco apre la finestra che lo sistema */}
                    {selezionato.daVerificare && onDaVerificare && partitaId && selezionato.uid && (() => {
                      const voce = selezionato.voci.find((v) => v.daVerificare) ?? selezionato.voci[0];
                      return voce ? <PulsanteVisivo compatto className="mt-1 self-start" icona={<IconaSegno chiave="da-verificare" dimensione={20} />} titolo="Da verificare"
                        onClick={() => onDaVerificare({ spilloUid: selezionato.uid!, spilloNome: nomePin(selezionato), mappaNome: mappa.nome, voce: voce.chiave, voceNome: voce.nome, infiltrazioneNome: voce.infiltrazione?.nome ?? null })} /> : null;
                    })()}
                  </div>
                  <button type="button" className="spillo-popup__chiudi" onClick={() => seleziona(null)} aria-label="Chiudi il popup">×</button>
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
                  {categoriaSpillo(selezionato.tipo) === 'spostamento' && <NavigazioneSpillo spillo={selezionato} partitaId={partitaId} onNaviga={onNaviga} nomeMappa={selezionato.destinazioneNomi?.mappa} nomeSpillo={selezionato.destinazioneNomi?.spillo ?? undefined} />}
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
                  onClick={(e) => { e.stopPropagation(); seleziona(null); setGruppoAperto(aperto ? null : g.chiave); }}
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
              <div className={`spillo-popup ${elencoSotto ? 'spillo-popup--sotto' : ''} ${elenco.foglio ? 'spillo-popup--foglio' : ''}`} role="dialog" aria-label={nomeGruppo(gruppoScelto.spilli.length)}
                style={elenco.foglio ? undefined : { left: `${gruppoScelto.x}%`, top: `${gruppoScelto.y}%`, transform: `scale(${1 / zoom}) translate(calc(-50% + ${elencoDx}px), ${elencoSotto ? '26px' : 'calc(-100% - 26px)'})`, '--spillo-popup-freccia': `calc(50% - ${elencoDx}px)` } as CSSProperties}
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
                        onClick={() => { if (scelta) { scelta.onScegli(s); return; } setGruppoAperto(null); if (vaSubito(s)) { vaiAllArrivo(s); return; } seleziona(s.id); }}>
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
          onCambiato={guida?.onCambiato} onChiudi={() => setGuidaAperta(null)} ancora={guidaAperta} versione={versioneStati} />
      )}
    </div>
  );
}

/** I nomi dei pin di spostamento sulla tela, su telefono e tablet (UX2-10): ognuno si sposta in orizzontale quanto basta per stare
 *  nella tela e a sinistra dei comandi dello zoom; quello che coprirebbe un nome già posato si nasconde (`data-coperta`). Prima i pin
 *  selezionati, poi dall'alto in basso. I pin fuori dalla tela restano come sono: un nome trascinato dentro si staccherebbe dal pin. */
function sistemaEtichette(t: HTMLElement): void {
  const etichette = [...t.querySelectorAll<HTMLElement>('.spillo-mappa--spostamento .spillo-mappa__etichetta')];
  for (const e of etichette) { e.style.transform = ''; e.removeAttribute('data-coperta'); }
  const bordo = t.getBoundingClientRect();
  const comandi = t.querySelector<HTMLElement>('.visore-mappa__controlli')?.getBoundingClientRect() ?? null;
  const dentro = (r: DOMRect) => r.right > bordo.left && r.left < bordo.right && r.bottom > bordo.top && r.top < bordo.bottom;
  const misurate = etichette
    .map((e) => ({ e, r: e.getBoundingClientRect(), pin: e.closest('.spillo-mappa')?.getBoundingClientRect() ?? null, primo: !!e.closest('.spillo-mappa--selezionato') }))
    .filter((m) => m.pin && dentro(m.pin))
    .sort((a, b) => Number(b.primo) - Number(a.primo) || a.r.top - b.r.top);
  const posate: Array<{ left: number; right: number; top: number; bottom: number }> = [];
  for (const { e, r, primo } of misurate) {
    let dx = 0;
    if (r.left < bordo.left + 4) dx = bordo.left + 4 - r.left;
    if (r.right > bordo.right - 4) dx = bordo.right - 4 - r.right;
    // accanto ai comandi dello zoom (in colonna a destra) il nome passa a sinistra dei comandi
    if (comandi && r.bottom > comandi.top && r.top < comandi.bottom && r.right + dx > comandi.left - 4) dx = Math.min(dx, comandi.left - 4 - r.right);
    if (dx) e.style.transform = `translateX(${Math.round(dx)}px)`;
    const q = { left: r.left + dx, right: r.right + dx, top: r.top, bottom: r.bottom };
    if (!primo && posate.some((p) => q.left < p.right + 2 && q.right > p.left - 2 && q.top < p.bottom + 1 && q.bottom > p.top - 1)) { e.setAttribute('data-coperta', ''); continue; }
    posate.push(q);
  }
}

type NegozioNelPopup = NonNullable<NonNullable<SpilloDto['dettaglio']>['negozio']>;
type MerceDelNegozio = NegozioNelPopup['articoli'][number];

/**
 * Ondata 5: in vendita in questo momento della partita, anche se la scorta del ciclo è finita (o un ordine di Tanaka è in viaggio): tutte
 * le condizioni sono vere tranne la scorta. Resta in vista con la sua pastiglia («Esaurito: torna lunedì 25 aprile») e i suoi acquisti da
 * annullare: comprato l'ultimo pezzo, la riga non sparisce sotto il dito e non si confonde con ciò che «non è ancora in vendita».
 */
function inVenditaOggi(d: DisponibilitaDto | undefined): boolean {
  if (d === undefined || d.stato === 'disponibile') return true;
  return d.requisiti.some((q) => q.tipo === 'scorta') && d.requisiti.every((q) => q.tipo === 'scorta' || q.stato === 'verde');
}

/** Si compra più volte (scorta che si rinnova, o l'Aojiru con le sue consumazioni): niente nome barrato. */
const ripetibile = (a: MerceDelNegozio): boolean => eOffertaAojiru({ chiave: a.chiave }) || eRifornibile(a.rifornimento?.regola ?? null);

/** Con la partita, l'articolo che si rifornisce si compra come nella pagina del negozio: «Compra», non una spunta da togliere e rimettere. */
const conCompra = (a: MerceDelNegozio, partitaId: number | null): partitaId is number =>
  partitaId !== null && !eOffertaAojiru({ chiave: a.chiave }) && eRifornibile(a.rifornimento?.regola ?? null) && !!a.scorta;

/**
 * Ondata 5 (decisione 21, rilievo della revisione): l'acquisto di un articolo che si rifornisce, nella mappa con lo stesso componente della
 * pagina del negozio (`AcquistiOfferta`): «Compra» aggiunge un acquisto nella sede del pin (`onCompra`, il gesto del visore), «rimasti N di
 * Q», gli acquisti del ciclo e quelli passati, ognuno col suo «Annulla», e il segno «ottenuto» senza giorno. Annullo e segno vanno al server
 * con la sede del pin e poi il pin si rilegge (`onAcquistiCambiati`), come fanno le consumazioni dell'Aojiru.
 */
function AcquistoDellaMerce({ a, partitaId, sede, occupato, onCompra, onAcquistiCambiati }: { a: MerceDelNegozio; partitaId: number; sede: string | null | undefined; occupato: boolean;
  onCompra: (articolo: string) => void; onAcquistiCambiati?: () => void | Promise<void> }) {
  const [lavoro, setLavoro] = useState(false);
  const esegui = async (azione: () => Promise<unknown>) => {
    setLavoro(true);
    try { await azione(); await onAcquistiCambiati?.(); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Annullamento fallito.'); }
    finally { setLavoro(false); }
  };
  return <AcquistiOfferta articolo={a.chiave} nome={a.nome} registrati={a.acquistiRegistrati ?? []} acquistato={a.comprato}
    bloccato={a.disponibilita !== undefined && a.disponibilita.stato !== 'disponibile'} occupato={occupato || lavoro}
    onCambia={(chiave, fatto) => { if (fatto) onCompra(chiave); }} rifornimento={a.rifornimento} scorta={a.scorta}
    onAnnullaRiga={(id) => void esegui(() => annullaRigaAcquisto(partitaId, id, sede))}
    onTogliSegno={(k) => void esegui(() => togliSegnoSenzaGiorno(partitaId, k, sede))} />;
}

/** La merce del negozio **in vendita adesso**, dentro il popup dello spillo di città: nome, prezzo e, con la partita, la casella «comprato»
 *  del pezzo unico o «Compra» per ciò che si rifornisce (Ondata 5), con la scorta della sede del pin. */
function MerceNelPopup({ negozio, spillo, partitaId, occupato, onAcquisto, onAcquistiCambiati }: { negozio: NegozioNelPopup; spillo: SpilloDto; partitaId: number | null; occupato: boolean; onAcquisto?: (spillo: SpilloDto, articoloChiave: string, fatto: boolean) => Promise<void>; onAcquistiCambiati?: () => void | Promise<void> }) {
  const disponibili = negozio.articoli.filter((a) => inVenditaOggi(a.disponibilita));
  const bloccati = negozio.articoli.length - disponibili.length;
  return (
    <div className="flex flex-col gap-1" role="group" aria-label={`Merce di ${negozio.nome}`}>
      <div className="flex items-center justify-between gap-2 testo-12 text-text-muted uppercase tracking-wide">
        <span>{negozio.nome} · {disponibili.length === 1 ? '1 articolo' : `${disponibili.length} articoli`}{partitaId ? ' adesso' : ''}</span>
        {negozio.disponibilita && negozio.disponibilita.stato !== 'disponibile' && <ChipDisponibilita disponibilita={negozio.disponibilita} compatto />}
      </div>
      {disponibili.length === 0
        ? <p className="m-0 testo-12 text-text-secondary">{bloccati > 0 ? 'Niente in vendita in questo momento della partita.' : 'Nessun articolo registrato.'}</p>
        : (
          <ul className="spillo-popup__merce m-0 p-0 list-none flex flex-col">
            {disponibili.map((a) => (
              <li key={a.chiave} className="flex flex-wrap items-center gap-2 py-1 border-b border-border testo-12">
                {/* L'etichetta attorno alla casella è il bersaglio: era l'unica casella dell'app a
                    non averla, e restava un quadratino di 20 px (trovata cercando nel codice, non
                    nelle misure: il criterio dice di misurare l'etichetta, e qui non c'era). */}
                {!eOffertaAojiru({ chiave: a.chiave }) && !(conCompra(a, partitaId) && onAcquistiCambiati) && partitaId && onAcquisto
                  ? <label className="touch flex items-center justify-center shrink-0 -my-1 cursor-pointer"><input type="checkbox" className="w-5 h-5 shrink-0" checked={a.comprato} disabled={occupato} aria-label={`${a.nome} comprato`} onChange={(e) => void onAcquisto(spillo, a.chiave, e.target.checked)} /></label>
                  : <span className="w-5 shrink-0 text-center">{a.comprato && !ripetibile(a) ? '✓' : ''}</span>}
                <div className="min-w-0 flex-1 break-words"><span className={a.comprato && !ripetibile(a) ? 'line-through' : ''} title={`${a.nome} · ${a.categoria}`}>{a.catalogo ? <Link to={a.catalogo.casa} className="touch inline-flex items-center">{a.nome}</Link> : a.nome}</span>
                  {!!a.ricevuti?.length && <OggettiCollegati oggetti={a.ricevuti} />}</div>
                <span className="min-w-0 max-w-full tabular-nums text-text-secondary"><CostoDellOggetto costo={a.costo ?? null} prezzo={a.prezzo} daVerificare={a.costoDaVerificare} /></span>
                {a.disponibilita && a.disponibilita.stato !== 'disponibile' && <ChipDisponibilita disponibilita={a.disponibilita} compatto />}
                {partitaId !== null && onAcquistiCambiati && eOffertaAojiru({ chiave: a.chiave }) && <div className="w-full"><ConsumiAojiru key={`${partitaId}:${spillo.id}:${a.chiave}`} partitaId={partitaId} stato={a.acquisti} onCambiato={onAcquistiCambiati} /></div>}
                {conCompra(a, partitaId) && onAcquisto && onAcquistiCambiati && <div className="w-full"><AcquistoDellaMerce a={a} partitaId={partitaId} sede={negozio.sedeChiave} occupato={occupato}
                  onCompra={(k) => void onAcquisto(spillo, k, true)} onAcquistiCambiati={onAcquistiCambiati} /></div>}
              </li>
            ))}
          </ul>
        )}
      {bloccati > 0 && <span className="testo-12 text-text-muted">{bloccati === 1 ? '1 articolo non ancora in vendita' : `${bloccati} articoli non ancora in vendita`}: nella scheda del negozio.</span>}
    </div>
  );
}

interface PropsAzioni<T extends SpilloDto | SchedaContenutoGuidaDto> { spillo: T; occupato: boolean; onRaccolto?: (spillo: T, raccolto: boolean) => Promise<void>; onStatoPunto?: (spillo: T, voce: string, stato: StatoPuntoMappa) => Promise<void> }

/** La parola di un pin segnato: lo stato delle sue voci della guida («ottenuto», «esaurito») se ne ha — quello comune, o «segnato»
 *  se differiscono (098) —, che è anche quello dei pulsanti, altrimenti quella del tipo («raccolto», «aperto», «parlato»…). */
function parolaSegnato(s: SpilloDto | SchedaContenutoGuidaDto): string {
  const stati = [...new Set(s.voci.map((v) => v.stato))];
  if (stati.length === 0) return parolaDelloStato(s);
  return stati.length === 1 && stati[0] ? stati[0] : 'segnato';
}

/** Un pin di spostamento con un arrivo raggiungibile (porta, scala, rampino, passaggio…): serve a spostarsi e non si segna, nemmeno con
 *  le voci della guida che ha (richiesta dell'utente, 2026-10-20, strada (b) del PM): quelle si segnano dalla guida. */
function passaggioConArrivo(s: SpilloDto | SchedaContenutoGuidaDto): boolean {
  return 'mappaChiave' in s && categoriaSpillo(s.tipo) === 'spostamento' && !s.destinazioneNonDisponibile && arrivoSpillo(s) !== null;
}

/** Che cosa si potrebbe segnare con una partita attiva: le voci della guida, lo stato del pin con la sua parola, gli acquisti. */
function invitoSenzaPartita(s: SpilloDto | SchedaContenutoGuidaDto, negozio: boolean): string {
  const stato = statoDelPin(s);
  const voci = s.voci.length === 1 ? 'segnare la sua voce della guida' : s.voci.length > 1 ? 'segnare le sue voci della guida' : null;
  const cose = [voci ?? (stato ? `segnarne lo stato (${stato})` : null), negozio ? 'segnare gli acquisti' : null].filter((x): x is string => x !== null);
  return cose.join(' e ');
}

/** Una voce descrittiva della guida («Altro» fuori dalle aree dei dedali: lì ogni voce ha uno stato, 099) si legge, non si segna (scelta
 *  dell'utente, 2026-10-01): come nella scheda del Palazzo. */
const VOCE_DESCRITTIVA = <span className="testo-12 text-text-muted">Voce descrittiva della guida: si legge, non si segna.</span>;

/** I pulsanti di una voce della guida: «Ottenuto», «Esaurito» (se esauribile), «Riapri» (se segnata); una descrittiva si legge e basta. */
function AzioniVoce<T extends SpilloDto | SchedaContenutoGuidaDto>({ spillo: s, voce, occupato, onStatoPunto }: { spillo: T; voce: VoceDelPinDto; occupato: boolean; onStatoPunto: (spillo: T, voce: string, stato: StatoPuntoMappa) => Promise<void> }) {
  if (puntoDescrittivo(voce.tipo, voce.areaDedalo)) return VOCE_DESCRITTIVA;
  return (
    <>
      {voce.stato !== 'ottenuto' && <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="raggiunto" dimensione={20} />} titolo="Ottenuto" onClick={() => void onStatoPunto(s, voce.chiave, 'ottenuto')} disabled={occupato} />}
      {voce.esauribile && voce.stato !== 'esaurito' && <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="esaurito" dimensione={20} />} titolo="Esaurito" onClick={() => void onStatoPunto(s, voce.chiave, 'esaurito')} disabled={occupato} />}
      {voce.stato && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Riapri" onClick={() => void onStatoPunto(s, voce.chiave, null)} disabled={occupato} />}
    </>
  );
}

/** Azioni di stato nella partita: per le voci della Guida «Ottenuto/Esaurito/Riapri» (stessi stati della scheda del Palazzo) — con più
 *  voci (098) una riga per voce, col suo nome, che si segna da sola («Voci indipendenti», 2026-10-09) —, altrimenti lo stato del pin
 *  con la parola del tipo («Raccolto», «Aperto», «Parlato», «Incontrato», «Sconfitto», «Azionato»…: `statoDelPin`) e, per toglierlo,
 *  «Richiudi» per porta e forzieri, «Annulla» per gli altri (`ritornoDelloStato`). */
export function AzioniStato<T extends SpilloDto | SchedaContenutoGuidaDto>({ spillo: s, occupato, onRaccolto, onStatoPunto }: PropsAzioni<T>) {
  if (s.voci.length === 1 && puntoDescrittivo(s.voci[0].tipo, s.voci[0].areaDedalo)) return VOCE_DESCRITTIVA;
  if (s.voci.length === 1 && onStatoPunto) return <AzioniVoce spillo={s} voce={s.voci[0]} occupato={occupato} onStatoPunto={onStatoPunto} />;
  if (s.voci.length > 1 && onStatoPunto) {
    return (
      <ul className="m-0 flex w-full list-none flex-col gap-1 p-0" aria-label={`Voci della guida di ${nomePin(s)}`}>
        {s.voci.map((v) => (
          <li key={v.chiave} className="flex flex-wrap items-center gap-1" role="group" aria-label={`Voce: ${v.nome}`}>
            {/* L4 §8.11: la voce col suo contatore dei pin fatti («In corso · 2/8»); lo stato del pin sta sopra */}
            <span className="min-w-0 flex-1 basis-full testo-12 font-semibold break-words">{v.nome}{v.stato ? ` · ${v.stato}` : ''}{testoAvanzamento(v.avanzamento) ? ` · ${testoAvanzamento(v.avanzamento)}` : ''}</span>
            <AzioniVoce spillo={s} voce={v} occupato={occupato} onStatoPunto={onStatoPunto} />
          </li>
        ))}
      </ul>
    );
  }
  // la parola del tipo (tabella scelta dall'utente, 2026-10-03: `shared/spilli.ts` `STATO_PER_TIPO`)
  const stato = statoDelPin(s);
  if (stato === null || !onRaccolto) return null;
  return s.raccolto
    ? <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo={ritornoDelloStato(s).pulsante} onClick={() => void onRaccolto(s, false)} disabled={occupato} />
    : <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="raggiunto" dimensione={20} />} titolo={stato.charAt(0).toUpperCase() + stato.slice(1)} onClick={() => void onRaccolto(s, true)} disabled={occupato} />;
}

interface PropsScheda<T extends SpilloDto | SchedaContenutoGuidaDto> {
  /** Riferimento alla sezione (scorrimento e fuoco da «Dettagli»). */
  ref?: Ref<HTMLElement>;
  spillo: T;
  partitaId: number | null;
  occupato: boolean;
  nonSpaziale?: boolean;
  onNaviga?: NavigaMappa;
  onRaccolto?: (spillo: T, raccolto: boolean) => Promise<void>;
  onStatoPunto?: (spillo: T, voce: string, stato: StatoPuntoMappa) => Promise<void>;
  onAcquisto?: (spillo: T, articoloChiave: string, fatto: boolean) => Promise<void>;
  onAcquistiCambiati?: () => void | Promise<void>;
  onChiudi: () => void;
  onCentra?: () => void;
}

/** Scheda dello spillo selezionato: descrizione, entità collegata e azioni. */
export function SchedaSpillo<T extends SpilloDto | SchedaContenutoGuidaDto>({ ref, spillo: s, partitaId, occupato, onNaviga, onRaccolto, onStatoPunto, onAcquisto, onAcquistiCambiati, onChiudi, onCentra, nonSpaziale = false }: PropsScheda<T>) {
  const acquistabile = Boolean(partitaId && onAcquisto);
  const d = s.dettaglio;
  const negozio = d?.negozio ?? null;
  // Con una partita gli articoli non ancora disponibili (data, Confidente, Dote, Palazzo, meteo…)
  // sono nascosti, con un comando per vederli: stessa regola dei pin, e per la stessa ragione —
  // la vista predefinita è quel che si può comprare oggi, ma «e quello quando arriva?» è una
  // domanda che a una guida si fa. Quando compaiono portano il loro «Non ancora» accanto.
  const [mostraBloccati, setMostraBloccati] = useState(false);
  // Ondata 5: ciò che è esaurito resta in vista (è in vendita, la scorta tornerà): «non ancora in vendita» è solo ciò che le condizioni bloccano
  const bloccati = negozio ? negozio.articoli.filter((a) => !inVenditaOggi(a.disponibilita)).length : 0;
  const articoliVisibili = negozio ? (mostraBloccati ? negozio.articoli : negozio.articoli.filter((a) => inVenditaOggi(a.disponibilita))) : [];
  return (
    <section ref={ref} tabIndex={-1} className="visore-mappa__sezione visore-mappa__scheda" aria-label={`Scheda: ${nomePin(s)}`}>
      <div className="flex items-start gap-2">
        <PuntoSpillo tipo={s.tipo} colore={s.colore} grande />
        <ImmagineRiferimento immagine={d?.immagine} nome={nomePin(s)} />
        <div className="flex-1 min-w-0">
          <h3 className="m-0 font-display testo-20 leading-tight break-words">{nomePin(s)}</h3>
          {/* il nome proprio del pin, se diverso dalla meta, resta come nota (L2: «Banchina Metro», «Piano 2», «Mappa»…) */}
          {nomePin(s) !== s.nome && <p className="m-0 testo-12 text-text-muted">Pin: «{s.nome}»</p>}
          <p className="m-0 testo-12 uppercase tracking-wide text-text-muted">{s.tipoNome}{s.collezionabile ? ' · collezionabile' : ''}{s.raccolto ? ` · ${parolaSegnato(s)}` : ''}</p>
          {s.disponibilita && <ChipDisponibilita disponibilita={s.disponibilita} compatto />}
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onChiudi} aria-label="Chiudi la scheda">×</button>
      </div>
      {s.descrizione && <p className="m-0 testo-13 text-text-secondary whitespace-pre-line">{s.descrizione}</p>}
      {/* L5: la descrizione propria del pin di un luogo, se diversa da quella del luogo */}
      {'notaPin' in s && s.notaPin && <p className="m-0 testo-12 text-text-muted">Nota del pin: {s.notaPin}</p>}
      {s.nativo?.daVerificare && <ProveNativeSpillo nativo={s.nativo} />}
      <CondizioniSpilloElenco condizioni={s.condizioni} disponibilita={s.disponibilita} />
      <GalleriaSpillo immagini={s.immagini} nome={nomePin(s)} />

      {!nonSpaziale && onNaviga && "mappaChiave" in s && <NavigazioneSpillo spillo={s} partitaId={partitaId} onNaviga={onNaviga} nomeMappa={s.destinazioneNomi?.mappa} nomeSpillo={s.destinazioneNomi?.spillo ?? undefined} />}
      {s.voci.length === 1 && (
        <p className="m-0 testo-12 text-text-secondary">
          {s.voci[0].esauribile ? 'Esauribile · ' : ''}{s.voci[0].stato ? `Nella Guida: ${s.voci[0].stato}` : 'Non ancora gestito nella Guida'} · <Link to={`/guida/dungeon/${encodeURIComponent(s.voci[0].dungeon)}`} className="text-primary-testo">scheda del Palazzo</Link>
        </p>
      )}
      {/* più voci (098): ognuna col suo stato; il Palazzo è lo stesso per tutte (lo controlla ogni collegamento) */}
      {s.voci.length > 1 && (
        <div className="flex flex-col gap-0.5 testo-12 text-text-secondary">
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0" aria-label="Voci della guida">
            {s.voci.map((v) => <li key={v.chiave} className="break-words">«{v.nome}»: {v.esauribile ? 'esauribile · ' : ''}{v.stato ? `nella Guida: ${v.stato}` : 'non ancora gestito nella Guida'}</li>)}
          </ul>
          <Link to={`/guida/dungeon/${encodeURIComponent(s.voci[0].dungeon)}`} className="text-primary-testo">scheda del Palazzo</Link>
        </div>
      )}
      {(d?.tipo === 'luogo' || d?.tipo === 'attivita') && d.luogo && (
        <p className="m-0 testo-12 text-text-secondary">
          {/* L5 (T5): la pagina del luogo, col suo nome; gli orari dal luogo */}
          {d.luogo.cosaOffre && d.luogo.cosaOffre !== s.descrizione ? `${d.luogo.cosaOffre} · ` : ''}{d.luogo.orariTesto ? `${d.luogo.orariTesto} · ` : d.luogo.quando ? `${d.luogo.quando} · ` : ''}<Link to={d.luogo.casa ?? `/guida/citta/${encodeURIComponent(d.luogo.quartiere)}`} className="text-primary-testo">{d.luogo.casa ? d.luogo.nome : 'scheda del quartiere'}</Link>
        </p>
      )}
      {negozio && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="testo-12 font-semibold flex items-center gap-1.5 flex-wrap">{negozio.nome} · {articoliVisibili.length} {articoliVisibili.length === 1 ? 'articolo' : 'articoli'}<ChipDisponibilita disponibilita={negozio.disponibilita} compatto /></span>
            {/* L5 (T5): il negozio nella pagina del suo luogo, col suo nome */}
            <Link to={d?.luogo?.negozi?.find((x) => x.chiave === negozio.chiave)?.casa ?? `/guida/negozi/${encodeURIComponent(negozio.chiave)}`} className="testo-12 text-primary-testo">{negozio.nome}</Link>
          </div>
          {bloccati > 0 && (
            <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="bloccato" dimensione={20} />} aria-pressed={mostraBloccati} onClick={() => setMostraBloccati((v) => !v)}
              titolo={mostraBloccati
                ? (bloccati === 1 ? 'Nascondi l’articolo non ancora in vendita' : `Nascondi i ${bloccati} articoli non ancora in vendita`)
                : (bloccati === 1 ? 'Mostra anche l’articolo non ancora in vendita' : `Mostra anche i ${bloccati} articoli non ancora in vendita`)} />
          )}
          {articoliVisibili.length > 0 && (
            <div className="area-scorrevole-x">
              {/* `tabella--adattiva`: nel pannello, largo 280 px, quattro colonne fisse spezzavano
                  l'intestazione lettera per lettera. La regola guarda la larghezza del contenitore,
                  non quella della finestra, quindi qui scatta anche su un monitor largo. */}
              {/* **Una riga per articolo, non una tabella impilata.**
                  La tabella adattiva va bene dove le colonne sono tante e la larghezza c'e'; qui il
                  pannello e' 280 px e impilarla dava quattro etichette maiuscole per ogni articolo —
                  dodici in tre righe — che mangiavano un terzo della larghezza e mandavano a capo
                  «Yaki-Imo leggendario», con la categoria orfana sotto. Le etichette ripetute non
                  dicevano niente che il valore non dicesse gia' da se': un prezzo si riconosce, e
                  una casella accanto al nome si capisce.
                  Qui ogni articolo e' una riga: nome e categoria in alto, prezzo e stato sotto. */}
              <ul className="visore-mappa__merce m-0 list-none p-0" aria-label={`Articoli di ${negozio.nome}`}>
                {articoliVisibili.map((a) => (
                  <li key={a.chiave} className="visore-mappa__merce-riga">
                    {acquistabile && !eOffertaAojiru({ chiave: a.chiave }) && !(conCompra(a, partitaId) && onAcquistiCambiati)
                      ? <label className="touch flex items-center justify-center shrink-0 -my-1 cursor-pointer"><input type="checkbox" className="w-5 h-5 shrink-0" checked={a.comprato} disabled={occupato}
                          onChange={(e) => void onAcquisto!(s, a.chiave, e.target.checked)} aria-label={`${a.nome} comprato`} /></label>
                      : ripetibile(a)
                        // ciò che si compra più volte non ha un «comprato» sì/no: lo dicono «Compra» e gli acquisti qui sotto
                        ? <span className="w-5 shrink-0" aria-hidden="true" />
                        : <span className="w-5 shrink-0 text-center" role="img" aria-label={a.comprato ? 'comprato' : 'non comprato'}>{a.comprato ? '✓' : ''}</span>}
                    <div className="min-w-0 flex-1">
                      <span className={`block testo-13 leading-tight ${a.comprato && !ripetibile(a) ? 'line-through' : ''}`}>
                        {a.catalogo ? <Link to={a.catalogo.casa} className="touch inline-flex items-center">{a.nome}</Link> : a.nome}<span className="text-text-muted no-underline"> · {a.categoria}</span>
                      </span>
                      {!!a.ricevuti?.length && <OggettiCollegati oggetti={a.ricevuti} />}
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 testo-12 text-text-secondary">
                        <span className="tabular-nums"><CostoDellOggetto costo={a.costo ?? null} prezzo={a.prezzo} daVerificare={a.costoDaVerificare} /></span>
                        {/* «sempre» si dice solo quando e' vero: accanto a un cartellino che avvisa
                            del contrario era una contraddizione scritta due volte sulla stessa riga. */}
                        {a.disponibilita && a.disponibilita.stato !== 'disponibile'
                          ? <ChipDisponibilita disponibilita={a.disponibilita} compatto />
                          : <span>{disponibilita(a)}</span>}
                      </span>
                      {partitaId !== null && onAcquistiCambiati && eOffertaAojiru({ chiave: a.chiave }) && <ConsumiAojiru key={`${partitaId}:${s.id}:${a.chiave}`} partitaId={partitaId} stato={a.acquisti} onCambiato={onAcquistiCambiati} />}
                      {acquistabile && conCompra(a, partitaId) && onAcquistiCambiati && <AcquistoDellaMerce a={a} partitaId={partitaId} sede={negozio.sedeChiave} occupato={occupato}
                        onCompra={(k) => void onAcquisto!(s, k, true)} onAcquistiCambiati={onAcquistiCambiati} />}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {d?.tipo === 'confidente' && d.confidente && <CollegamentoVisivo to={`/confidenti/${encodeURIComponent(d.confidente.chiave)}`} tono="secondario" compatto icona={<IconaSpillo tipo="confidente" dimensione={20} />} titolo={d.confidente.nome} dettaglio={d.confidente.arcanaNome} />}
      {d?.tipo === 'richiesta' && d.richiesta && <CollegamentoVisivo to="/guida/richieste" tono="secondario" compatto icona={<IconaAzione chiave="obiettivo" dimensione={20} />} titolo={d.richiesta.nome} dettaglio={d.richiesta.stato ?? 'richiesta dei Mementos'} />}

      <div className="flex flex-wrap gap-1.5">
        {!nonSpaziale && onCentra && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="mappa" dimensione={20} />} titolo="Centra" onClick={onCentra} />}
        {/* un passaggio con arrivo non si segna (le sue voci si segnano dalla guida) */}
        {partitaId && !passaggioConArrivo(s) && <AzioniStato spillo={s} occupato={occupato} onRaccolto={onRaccolto} onStatoPunto={onStatoPunto} />}
      </div>
      {(statoDelPin(s) !== null || s.voci.length > 0 || negozio) && !partitaId && !passaggioConArrivo(s) && <span className="testo-12 text-text-muted">Attiva una <Link to="/partita" className="text-primary-testo">partita</Link> per {invitoSenzaPartita(s, !!negozio)}.</span>}
    </section>
  );
}
