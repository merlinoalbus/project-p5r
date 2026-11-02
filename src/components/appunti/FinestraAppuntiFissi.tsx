// ============================================================
// FinestraAppuntiFissi — la finestra fluttuante degli appunti fissi del Diario e la sua icona (2026-10-31, C7)
// ============================================================
//
// Richiesta dell'utente: «mi farebbe comodo avere una sorta di clipboard su finestra fluttuante dove possa io inserire e mantenere salvati
// delle voci che tendono a ripetersi nel diario... per averli a portata di mano quando voglio inserirne una nuova occorrenza»; «deve essere
// possibile spostare la finestra di clipboard, ridurla a icona o riportarla a dimensione originaria, e al click su una voce deve mettermi in
// memoria CTRL+C la relativa voce».
//
//   - Sopra ogni pagina della preparazione (montata una volta in `MainLayout`; nel rilascio non esiste: costante di build qui sotto), in un
//     portal su <body>. Finestra NON modale (`role="dialog"`, `aria-modal="false"`): la pagina sotto resta usabile, il Diario compreso.
//   - Si sposta trascinando la barra del titolo (eventi pointer: mouse, penna e dito), oppure con le frecce sulla maniglia ⠿; si ridimensiona
//     dall'angolo in basso a destra (anche con le frecce). «Riduci a icona» (o Esc) la fa diventare un'icona rotonda, che si trascina a sua
//     volta; un tocco la riporta com'era, bozze comprese (la finestra resta montata, nascosta).
//   - Posizione, dimensione e posto dell'icona si ricordano per dispositivo (`memoriaDispositivo`, mai dati); sul telefono (< 640 px)
//     la finestra è larga quanto lo schermo. Sempre dentro la finestra visibile, anche quando questa cambia (ridimensionamento, rotazione).
//   - Un tocco su un appunto scrive il suo testo negli appunti di sistema (`copiaTesto`: `writeText` con il ripiego dell'evento `copy`) e
//     dice «Copiato»; poi Ctrl+V nel Diario (o «Incolla qui» nel menu ⋯ di una voce) lo incolla come ogni blocco copiato dal Diario.
//   - Gestione: «+» (richiesta dell'utente, 2026-10-31: «aggiungere agli appunti fissi un nuovo elemento cliccando su + (prende quello che
//     attualmente ci sta in memoria) e mi fa indicare un breve testo di riferimento») legge gli appunti di sistema (`readText`, dentro il
//     gesto) e apre il modulo con il solo titolo, già col fuoco, e l'anteprima del testo letto; se il browser non li lascia leggere
//     (permesso negato, telefono senza l'API, contesto non sicuro) o sono vuoti, lo stesso modulo ha il campo del testo da incollare a mano e
//     un avviso che dice perché. Per ogni appunto la matita: titolo, testo, categoria, sposta su/giù, elimina con conferma. Con molti
//     appunti, la ricerca per titolo.
//   - Categorie (richiesta dell'utente, 2026-11-02: «voglio poter raggruppare per categorie (chiudibili e apribili) gli Appunti Fissi nonchè
//     riordinarli con click e trascina all'interno di gruppi o della lista di Appunti fissi»): in cima la lista senza categoria (col suo
//     titolo solo se ci sono categorie), poi le categorie nel loro ordine. L'intestazione di una categoria la apre e la chiude (ricordato per
//     dispositivo); la sua matita la rinomina o la elimina (gli appunti passano in fondo alla lista senza categoria); «Categoria» ne crea una.
//   - Riordino: la maniglia ⠿ di ogni appunto lo trascina dentro il suo gruppo, in un altro o nella lista senza categoria (`useRiordinoCollegato`,
//     come le fasce del Diario: col mouse subito, col dito dopo una pressione lunga, la colonna scorre da sola vicino ai bordi); rilasciato in
//     una categoria chiusa va in fondo e la categoria si apre. Da tastiera, sulla maniglia, ↑/↓ di un posto, e dal primo o dall'ultimo posto
//     al gruppo prima o dopo; Esc annulla. Le categorie si riordinano allo stesso modo dalla loro maniglia. Durante la ricerca il riordino è
//     fermo (la maniglia dice perché); la categoria si cambia anche dalla matita dell'appunto.
// ============================================================

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as KeyboardEventReact, type PointerEvent as PointerEventReact, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { appuntiDelGruppo, useAppuntiFissiStore } from '../../stores/appuntiFissiStore';
import { useRiordinoCollegato, type RiordinoCollegato } from '../../hooks/useRiordino';
import { Maniglia } from '../shared/Maniglia';
import { IconGiu } from '../shared/iconeGuida';
import { useAppuntiDiarioStore } from '../../stores/appuntiDiarioStore';
import { notifica } from '../../stores/notificationStore';
import { conferma, CHIUDI_SENZA_SALVARE } from '../../stores/confermaStore';
import { useMedia } from '../../hooks/useMedia';
import { copiaTesto } from '../../utils/scritturaAppunti';
import { leggiAppunti } from '../../utils/appuntiDiario';
import { leggiMemoriaJson, scriviMemoriaJson } from '../../utils/memoriaDispositivo';
import { IconaAzione } from '../shared/IconaAzione';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { CampoRicerca } from '../shared/CampoRicerca';
import { Selettore } from '../shared/Selettore';
import { Spinner } from '../shared/PageState';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';
import { LIMITE_NOME_CATEGORIA, LIMITE_TESTO_APPUNTO, LIMITE_TITOLO_APPUNTO, type AppuntoFissoDto, type CategoriaAppuntiDto } from '../../../shared/appuntiFissi';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

// ---- geometria della finestra e dell'icona ----

interface Geometria { x: number; y: number; w: number; h: number; ix: number; iy: number }
const CHIAVE_GEOMETRIA = 'p5r.appuntiFissi.finestra';
/** Il margine dal bordo della finestra visibile. */
const MARGINE = 8;
const ICONA = 56;
const MIN_W = 280;
const MIN_H = 220;
/** Il passo delle frecce sulle maniglie (con Maiusc, quattro volte tanto). */
const PASSO = 24;
/** Da quanti pixel un gesto sull'icona è un trascinamento e non un tocco. */
const SOGLIA_TRASCINAMENTO = 6;
/** Da quanti appunti compare la ricerca per titolo. */
const SOGLIA_RICERCA = 8;
/** Quanto resta il segno «Copiato» sulla riga. */
const DURATA_COPIATO = 2000;
const TELEFONO = '(max-width: 639px)';

const vista = () => ({ vw: window.innerWidth, vh: window.innerHeight });
const tra = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/** La geometria di partenza: a destra sotto la barra superiore; sul telefono in basso, sopra la barra di navigazione. */
function predefinita(telefono: boolean): Geometria {
  const { vw, vh } = vista();
  const w = Math.min(380, vw - 2 * MARGINE);
  const h = telefono ? Math.round(vh * 0.6) : Math.min(560, vh - 2 * MARGINE - 80);
  return { x: vw - w - 24, y: telefono ? vh - h - 72 : 84, w, h, ix: vw - ICONA - 16, iy: vh - ICONA - (vw >= 1024 ? 24 : 88) };
}

/** La geometria dentro la finestra visibile: dimensioni fra il minimo e lo spazio che c'è, posizioni con il margine; sul telefono larga quanto lo schermo. */
function dentro(g: Geometria, telefono: boolean): Geometria {
  const { vw, vh } = vista();
  const maxW = Math.max(vw - 2 * MARGINE, 0), maxH = Math.max(vh - 2 * MARGINE, 0);
  const w = telefono ? maxW : tra(g.w, Math.min(MIN_W, maxW), maxW);
  const h = tra(g.h, Math.min(MIN_H, maxH), maxH);
  return {
    w, h,
    x: telefono ? MARGINE : tra(g.x, MARGINE, vw - w - MARGINE),
    y: tra(g.y, MARGINE, vh - h - MARGINE),
    ix: tra(g.ix, MARGINE, vw - ICONA - MARGINE),
    iy: tra(g.iy, MARGINE, vh - ICONA - MARGINE),
  };
}

/** La geometria ricordata sul dispositivo (ogni numero controllato), sopra quella di partenza. Senza memoria, quella di partenza. */
function leggiGeometria(telefono: boolean): Geometria {
  const base = predefinita(telefono);
  const v = leggiMemoriaJson(CHIAVE_GEOMETRIA) as Partial<Record<keyof Geometria, unknown>> | null;
  if (!v || typeof v !== 'object') return dentro(base, telefono);
  const num = (k: keyof Geometria) => (typeof v[k] === 'number' && Number.isFinite(v[k]) ? (v[k] as number) : base[k]);
  return dentro({ x: num('x'), y: num('y'), w: num('w'), h: num('h'), ix: num('ix'), iy: num('iy') }, telefono);
}
/** Ricorda la geometria; senza memoria del dispositivo si riparte dal posto predefinito. */
const scriviGeometria = (g: Geometria): void => scriviMemoriaJson(CHIAVE_GEOMETRIA, g);

/** Il testo per cercare: minuscolo e senza accenti. */
const perCercare = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('it');
/** L'anteprima della riga: la prima voce («• …») di un testo copiato dal Diario, altrimenti la prima riga che dice qualcosa (non il titolo
 *  «Diario P5R · …» né il blocco delle voci in fondo). */
function anteprima(testo: string): string {
  const righe = testo.split(/\r?\n/).map((r) => r.trim()).filter((r) => r && !r.startsWith('[') && !r.startsWith('Diario P5R'));
  return (righe.find((r) => r.startsWith('• ')) ?? righe[0] ?? testo.trim()).slice(0, 160);
}

/** Che cosa ha dato la lettura degli appunti di sistema: il testo, o perché va incollato a mano. */
type Lettura = { testo: string } | { avviso: string };
/** Il motivo, uguale in coda a ogni avviso: che cosa fare adesso. */
const A_MANO = 'incolla qui sotto il testo (tieni premuto nel campo, o Ctrl+V).';

/**
 * Gli appunti di sistema letti con `navigator.clipboard.readText`, dentro il gesto del «+». Non lancia mai: se la lettura non si può fare
 * (contesto non sicuro, browser senza l'API, permesso negato, errore) o non c'è testo, dice perché, e il modulo chiede il testo a mano.
 */
async function leggiDagliAppunti(): Promise<Lettura> {
  if (!window.isSecureContext) return { avviso: `Il browser lascia leggere gli appunti solo su una connessione sicura (https): ${A_MANO}` };
  if (!navigator.clipboard?.readText) return { avviso: `Questo browser non lascia leggere gli appunti alla pagina: ${A_MANO}` };
  let testo: string;
  try {
    testo = await navigator.clipboard.readText();
  } catch (err) {
    const negato = err instanceof DOMException && err.name === 'NotAllowedError';
    return { avviso: negato ? `Lettura degli appunti non permessa: ${A_MANO}` : `Gli appunti non si sono potuti leggere: ${A_MANO}` };
  }
  if (!testo.trim()) return { avviso: `Negli appunti non c’è testo: ${A_MANO}` };
  if (testo.length > LIMITE_TESTO_APPUNTO) return { avviso: `Il testo negli appunti supera i ${LIMITE_TESTO_APPUNTO.toLocaleString('it')} caratteri: ${A_MANO}` };
  return { testo };
}

/** Quanti caratteri del testo letto mostra l'anteprima del modulo (il testo salvato è sempre intero). */
const MAX_ANTEPRIMA = 4000;
/** La riga del blocco delle voci del Diario in fondo al testo (illeggibile: non va nell'anteprima). */
const RE_RIGA_BLOCCO = /P5R-DIARIO-VOCI\.\d+\./;

// ---- la finestra ----

/** La finestra degli appunti fissi e la sua icona (solo nella preparazione). */
export const FinestraAppuntiFissi: StrumentoDiModifica<typeof FinestraAppuntiFissiReale> = IN_RILASCIO ? NienteInRilascio : FinestraAppuntiFissiReale;

/** Che cosa sta facendo il corpo: niente, l'aggiunta (con la proposta del Diario, col testo letto dagli appunti di sistema — `daAppunti`: si
 *  chiede solo il titolo — o col testo da incollare a mano e il perché in `avviso`), la modifica di un appunto, la categoria nuova (`id` null)
 *  o la modifica di una categoria. */
type Modulo = { tipo: 'aggiungi'; titolo: string; testo: string; n: number; daAppunti?: boolean; avviso?: string } | { tipo: 'modifica'; id: number }
  | { tipo: 'categoria'; id: number | null } | null;

/** Un gruppo a schermo: la lista senza categoria (`categoria` null) o una categoria, con i suoi appunti in ordine. `chiave` è il nome
 *  dell'elenco per il riordino («senza», «c<id>»). */
interface Gruppo { chiave: string; categoria: CategoriaAppuntiDto | null; appunti: AppuntoFissoDto[] }
const GRUPPO_SENZA = 'senza';
const chiaveGruppo = (categoriaId: number) => `c${categoriaId}`;

/** La linea del rilascio di un trascinamento sopra la riga (o sotto, per il fondo), come nel Diario; nessuna se si rilascerebbe dov'è già. */
function segnoRilascio(r: RiordinoCollegato, lista: string, ids: readonly string[], id: string): string {
  const { trascinato, rilascio } = r;
  if (trascinato === null || rilascio?.lista !== lista) return '';
  const dove = rilascio.indice;
  if (ids.indexOf(trascinato) === dove) return '';
  const resto = ids.filter((x) => x !== trascinato);
  if (resto[dove] === id) return 'appunti-fissi__rilascio-sopra';
  return dove >= resto.length && resto[resto.length - 1] === id ? 'appunti-fissi__rilascio-sotto' : '';
}

function FinestraAppuntiFissiReale() {
  const stato = useAppuntiFissiStore((s) => s.stato);
  const elenco = useAppuntiFissiStore((s) => s.elenco);
  const caricamento = useAppuntiFissiStore((s) => s.caricamento);
  const errore = useAppuntiFissiStore((s) => s.errore);
  const proposta = useAppuntiFissiStore((s) => s.proposta);
  const categorie = useAppuntiFissiStore((s) => s.categorie);
  const chiuse = useAppuntiFissiStore((s) => s.chiuse);
  const telefono = useMedia(TELEFONO);
  const idTitolo = useId();
  const finestra = useRef<HTMLElement | null>(null);
  const icona = useRef<HTMLButtonElement | null>(null);

  const [g, setG] = useState<Geometria>(() => leggiGeometria(telefono));
  const gRif = useRef(g);
  useLayoutEffect(() => { gRif.current = g; });
  // sempre dentro la finestra visibile: al cambio di formato, al ridimensionamento e alla rotazione
  useEffect(() => {
    const rimetti = () => setG((x) => dentro(x, window.matchMedia?.(TELEFONO).matches ?? false));
    rimetti();
    window.addEventListener('resize', rimetti);
    window.addEventListener('orientationchange', rimetti);
    window.visualViewport?.addEventListener('resize', rimetti);
    return () => {
      window.removeEventListener('resize', rimetti);
      window.removeEventListener('orientationchange', rimetti);
      window.visualViewport?.removeEventListener('resize', rimetti);
    };
  }, [telefono]);

  // ---- trascinamento (spostare la finestra, ridimensionarla, spostare l'icona) ----
  type Gesto = { tipo: 'sposta' | 'ridimensiona' | 'icona'; id: number; px: number; py: number; g: Geometria; mosso: boolean };
  const gesto = useRef<Gesto | null>(null);
  const [trascina, setTrascina] = useState(false);
  /** Vero subito dopo un trascinamento dell'icona: il clic che lo chiude non la riapre. */
  const iconaTrascinata = useRef(false);
  /** L'inizio di un gesto: che cosa si trascina lo dice `data-gesto` dell'elemento (barra, maniglia, icona). */
  const inizia = (e: PointerEventReact<HTMLElement>) => {
    const tipo = e.currentTarget.dataset.gesto as Gesto['tipo'] | undefined;
    if (!tipo || e.button !== 0) return;
    // dalla barra si trascina, non dai suoi comandi
    if (tipo === 'sposta' && (e.target as Element).closest('[data-non-trascina]')) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    gesto.current = { tipo, id: e.pointerId, px: e.clientX, py: e.clientY, g: gRif.current, mosso: false };
  };
  const muovi = (e: PointerEventReact<HTMLElement>) => {
    const t = gesto.current;
    if (!t || t.id !== e.pointerId) return;
    const dx = e.clientX - t.px, dy = e.clientY - t.py;
    if (!t.mosso && Math.hypot(dx, dy) < SOGLIA_TRASCINAMENTO) return;
    if (!t.mosso) { t.mosso = true; setTrascina(true); }
    e.preventDefault();
    const p = t.g;
    const nuova = t.tipo === 'sposta' ? { ...p, x: p.x + dx, y: p.y + dy }
      : t.tipo === 'ridimensiona' ? { ...p, w: p.w + dx, h: p.h + dy }
        : { ...p, ix: p.ix + dx, iy: p.iy + dy };
    setG(dentro(nuova, telefono));
  };
  const finisci = (e: PointerEventReact<HTMLElement>) => {
    const t = gesto.current;
    if (!t || t.id !== e.pointerId) return;
    gesto.current = null;
    if (t.tipo === 'icona') iconaTrascinata.current = t.mosso;
    if (t.mosso) { setTrascina(false); scriviGeometria(gRif.current); }
  };
  /** Le frecce sulle maniglie: spostano (o ridimensionano, con `data-frecce="ridimensiona"`) di un passo; con Maiusc di quattro. */
  const frecce = (e: KeyboardEventReact<HTMLElement>) => {
    const tipo = e.currentTarget.dataset.frecce === 'ridimensiona' ? 'ridimensiona' : 'sposta';
    const passo = e.shiftKey ? PASSO * 4 : PASSO;
    const d = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, -passo], ArrowDown: [0, passo] }[e.key];
    if (!d) return;
    e.preventDefault();
    const p = gRif.current;
    const nuova = dentro(tipo === 'sposta' ? { ...p, x: p.x + d[0], y: p.y + d[1] } : { ...p, w: p.w + d[0], h: p.h + d[1] }, telefono);
    setG(nuova);
    scriviGeometria(nuova);
  };

  // ---- apertura, riduzione, chiusura: dati freschi e fuoco ----
  const precedente = useRef(stato);
  useEffect(() => {
    const prima = precedente.current;
    precedente.current = stato;
    // a ogni apertura l'elenco si rilegge dal server (un altro dispositivo può averlo cambiato)
    if (stato === 'aperta' && (prima !== 'aperta' || useAppuntiFissiStore.getState().elenco === null)) void useAppuntiFissiStore.getState().carica();
    if (stato === 'ridotta' && useAppuntiFissiStore.getState().elenco === null) void useAppuntiFissiStore.getState().carica();
    // il fuoco segue il gesto, non il ritorno sulla pagina (lo stato ricordato al caricamento non lo sposta)
    if (prima === stato) return;
    requestAnimationFrame(() => {
      if (stato === 'aperta' && !finestra.current?.contains(document.activeElement)) finestra.current?.focus({ preventScroll: true });
      else if (stato === 'ridotta') icona.current?.focus({ preventScroll: true });
      else if (stato === 'chiusa') document.querySelector<HTMLElement>('[data-pulsante-appunti-fissi]')?.focus({ preventScroll: true });
    });
  }, [stato]);

  // ---- il modulo nel corpo ----
  const [modulo, setModulo] = useState<Modulo>(null);
  /** Vero se il modulo aperto ha modifiche non salvate (lo dice il modulo stesso). */
  const sporco = useRef(false);
  const segnaSporco = useCallback((s: boolean) => { sporco.current = s; }, []);
  // una proposta del Diario apre l'aggiunta compilata (anche sopra un'altra aggiunta: la proposta è il gesto più recente); si guarda durante
  // il disegno, una volta per proposta (`n` cambia a ogni «Salva negli appunti fissi»)
  const [propostaVista, setPropostaVista] = useState<number | null>(null);
  if (proposta && proposta.n !== propostaVista) {
    setPropostaVista(proposta.n);
    setModulo({ tipo: 'aggiungi', titolo: proposta.titolo, testo: proposta.testo, n: proposta.n });
  }
  /** Lascia il modulo aperto (Annulla, Chiudi): con modifiche non salvate prima lo chiede. */
  const lasciaModulo = useCallback(async (): Promise<boolean> => {
    if (modulo && sporco.current && !(await conferma({ ...CHIUDI_SENZA_SALVARE, testo: 'L’appunto ha modifiche non salvate: chiudendo si perdono.' }))) return false;
    sporco.current = false;
    setModulo(null);
    useAppuntiFissiStore.getState().togliProposta();
    return true;
  }, [modulo]);

  /** «+»: legge gli appunti di sistema (prima di tutto, finché il gesto vale: una conferma in mezzo lo farebbe scadere) e apre l'aggiunta col
   *  solo titolo, o col testo a mano e l'avviso. Una bozza non salvata si chiede prima di sostituirla. */
  const [leggendo, setLeggendo] = useState(false);
  /** Il segno sincrono della lettura in corso: un secondo tocco prima del nuovo disegno non ne apre un'altra. */
  const leggendoRif = useRef(false);
  const aggiungiDagliAppunti = async () => {
    if (leggendoRif.current) return;
    leggendoRif.current = true;
    setLeggendo(true);
    let lettura: Lettura;
    try { lettura = await leggiDagliAppunti(); } finally { leggendoRif.current = false; setLeggendo(false); }
    if (!(await lasciaModulo())) return;
    const chiave = Date.now();
    setModulo('testo' in lettura
      ? { tipo: 'aggiungi', titolo: '', testo: lettura.testo, n: chiave, daAppunti: true }
      : { tipo: 'aggiungi', titolo: '', testo: '', n: chiave, avviso: lettura.avviso });
  };

  const chiudi = async () => { if (await lasciaModulo()) useAppuntiFissiStore.getState().chiudi(); };
  // la chiusura chiesta dal pulsante della barra superiore passa di qui (le bozze non salvate si chiedono prima)
  const richiestaChiusura = useAppuntiFissiStore((s) => s.richiestaChiusura);
  const chiudiRif = useRef(chiudi);
  useLayoutEffect(() => { chiudiRif.current = chiudi; });
  const ultimaRichiesta = useRef(richiestaChiusura);
  useEffect(() => {
    if (richiestaChiusura === ultimaRichiesta.current) return;
    ultimaRichiesta.current = richiestaChiusura;
    void chiudiRif.current();
  }, [richiestaChiusura]);
  const riduci = () => useAppuntiFissiStore.getState().riduci();
  const ripristina = () => {
    if (iconaTrascinata.current) { iconaTrascinata.current = false; return; }
    useAppuntiFissiStore.getState().apri();
  };
  const tasti = (e: KeyboardEventReact<HTMLElement>) => {
    // un Esc già usato più in basso (la maniglia che annulla un trascinamento) non riduce la finestra
    if (e.key !== 'Escape' || e.nativeEvent.isComposing || e.defaultPrevented) return;
    // Esc riduce a icona (le bozze restano); `preventDefault` dice al Diario che il tasto è già stato usato (non annulla la sua selezione)
    e.preventDefault();
    e.stopPropagation();
    riduci();
  };

  // ---- copia, ricerca ----
  const [copiato, setCopiato] = useState<number | null>(null);
  const timerCopiato = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timerCopiato.current) clearTimeout(timerCopiato.current); }, []);
  const tocco = useMedia('(pointer: coarse)');
  const copia = async (a: AppuntoFissoDto) => {
    try {
      await copiaTesto(a.testo);
    } catch (err) {
      notifica('error', `Non copiato: ${err instanceof Error && err.message ? err.message : 'il browser non lo permette'}.`);
      return;
    }
    // negli appunti adesso c'è questo testo: il segno del taglio del Diario non vale più; se è un blocco di voci, Ctrl+V lo può rileggere
    const diario = useAppuntiDiarioStore.getState();
    diario.svuota();
    const voci = leggiAppunti({ testo: a.testo });
    if (voci) diario.segnaScritto();
    setCopiato(a.id);
    if (timerCopiato.current) clearTimeout(timerCopiato.current);
    timerCopiato.current = setTimeout(() => setCopiato(null), DURATA_COPIATO);
    const come = voci ? (tocco ? ': «Incolla qui» nel menu ⋯ di una voce del Diario lo incolla' : ': Ctrl+V nel Diario lo incolla') : '';
    notifica('success', `Copiato «${a.titolo}»${come}.`, 5000);
  };
  const [cerca, setCerca] = useState('');
  const conRicerca = (elenco?.length ?? 0) >= SOGLIA_RICERCA;
  const q = conRicerca ? perCercare(cerca.trim()) : '';
  /** I gruppi a schermo: prima la lista senza categoria, poi le categorie nel loro ordine, ognuno con i suoi appunti in ordine. */
  const gruppi = useMemo<Gruppo[]>(() => {
    if (!elenco) return [];
    return [
      { chiave: GRUPPO_SENZA, categoria: null, appunti: appuntiDelGruppo(elenco, null) },
      ...(categorie ?? []).map((c) => ({ chiave: chiaveGruppo(c.id), categoria: c, appunti: appuntiDelGruppo(elenco, c.id) })),
    ];
  }, [elenco, categorie]);
  /** Gli appunti che la ricerca trova (tutti, senza ricerca). */
  const trovato = (a: AppuntoFissoDto) => !q || perCercare(a.titolo).includes(q);
  /** L'appunto con la matita aperta: resta a vista anche se la ricerca non lo trova (la sua bozza non si nasconde). */
  const inModificaId = modulo?.tipo === 'modifica' ? modulo.id : null;
  const aVista = (a: AppuntoFissoDto) => trovato(a) || a.id === inModificaId;
  /** Un gruppo si vede aperto: la lista senza categoria sempre, una categoria se non è chiusa sul dispositivo; durante la ricerca tutte. */
  const aperto = (gr: Gruppo) => gr.categoria === null || q !== '' || !chiuse.includes(gr.categoria.id);

  // ---- riordino: appunti dentro e fra i gruppi, categorie fra loro ----
  const [spostando, setSpostando] = useState(false);
  const bloccoRiordino = q ? 'Svuota la ricerca per spostare' : spostando ? 'Un momento: sto salvando l’ultimo spostamento' : null;
  /** Uno spostamento salvato: il riordino è fermo finché il server non risponde; un rifiuto si dice (la copia a schermo torna com'era). */
  const esegui = async (fai: () => Promise<void>, errore: string) => {
    setSpostando(true);
    try { await fai(); } catch (err) { notifica('error', err instanceof Error && err.message ? err.message : errore); } finally { setSpostando(false); }
  };
  /** Un passo su o giù nel suo gruppo dalla matita (`i` è il suo posto lì), fermo come il trascinamento durante la ricerca o un salvataggio;
   *  il fuoco resta sul gesto, o va sull'opposto se al bordo il gesto sparisce. */
  const sposta = (a: AppuntoFissoDto, i: number, verso: -1 | 1) => {
    if (bloccoRiordino) { notifica('info', `${bloccoRiordino}.`); return; }
    void esegui(() => useAppuntiFissiStore.getState().sposta(a.id, a.categoriaId, i + verso), 'Non spostato.').then(() => requestAnimationFrame(() => {
      // il gesto si ritrova dall'id dell'appunto e dalla sua chiave, non dal nome: due appunti possono avere lo stesso titolo
      const trova = (v: -1 | 1) => finestra.current?.querySelector<HTMLButtonElement>(`button[data-appunto="${a.id}"][data-gesto="${v === -1 ? 'su' : 'giu'}"]`) ?? undefined;
      (trova(verso) ?? trova(verso === -1 ? 1 : -1))?.focus();
    }));
  };
  const riordino = useRiordinoCollegato(
    gruppi.map((gr) => ({ nome: gr.chiave, ids: gr.appunti.map((a) => String(a.id)) })),
    bloccoRiordino,
    async (id, lista, indice) => {
      const gr = gruppi.find((x) => x.chiave === lista);
      const mosso = elenco?.find((a) => a.id === Number(id));
      if (!gr || !mosso) return;
      const arrivo = gr.categoria?.id ?? null;
      // la bozza della matita aperta vive nella riga dell'appunto, che in un altro gruppo si rimonta: prima si chiede se lasciarla
      if (arrivo !== mosso.categoriaId && mosso.id === inModificaId && !(await lasciaModulo())) return;
      const s = useAppuntiFissiStore.getState();
      // rilasciato in una categoria chiusa: va in fondo e la categoria si apre, così si vede dov'è andato (come le fasce del Diario)
      let posto = indice;
      if (gr.categoria && !aperto(gr)) { posto = gr.appunti.length; s.alterna(gr.categoria.id, true); }
      await esegui(() => s.sposta(mosso.id, arrivo, posto), 'Non spostato.');
    },
  );
  const riordinoCategorie = useRiordinoCollegato(
    [{ nome: 'categorie', ids: (categorie ?? []).map((c) => chiaveGruppo(c.id)) }],
    bloccoRiordino,
    (id, _lista, indice) => esegui(() => useAppuntiFissiStore.getState().spostaCategoria(Number(id.slice(1)), indice), 'Categoria non spostata.'),
  );

  if (stato === 'chiusa') return null;
  const n = elenco?.length ?? 0;
  const nCategorie = categorie?.length ?? 0;
  const ridotta = stato === 'ridotta';
  const pulsante = 'btn btn-ghost btn-sm touch shrink-0';
  const conManiglie = n > 1 || nCategorie > 0;
  const trovati = q ? gruppi.reduce((t, gr) => t + gr.appunti.filter(trovato).length, 0) : n;
  const listaCategorie = categorie ?? [];

  /** La riga di un appunto: maniglia, tocco che copia, matita; sotto, aperto, il modulo di modifica (titolo, testo, categoria, posto, elimina). */
  const rigaAppunto = (a: AppuntoFissoDto, gr: Gruppo, i: number) => {
    const inModifica = modulo?.tipo === 'modifica' && modulo.id === a.id;
    const id = String(a.id);
    return (
      <li key={a.id} ref={riordino.riga(id)} hidden={!aVista(a)}
        className={`flex flex-col gap-1.5 ${riordino.trascinato === id ? 'opacity-50' : ''} ${segnoRilascio(riordino, gr.chiave, gr.appunti.map((x) => String(x.id)), id)}`}>
        <div className="appunti-fissi__voce">
          {conManiglie && <Maniglia etichetta={`Sposta «${a.titolo}»`} id={id} riordino={riordino} />}
          <button type="button" className="appunti-fissi__copia" onClick={() => void copia(a)} aria-label={`Copia «${a.titolo}» negli appunti`}
            title="Copia negli appunti">
            <span className="flex min-w-0 items-baseline gap-2">
              <strong className="testo-14 truncate">{a.titolo}</strong>
              {copiato === a.id && <span className="appunti-fissi__copiato testo-12 shrink-0" aria-hidden="true">Copiato</span>}
            </span>
            <span className="testo-12 text-text-muted truncate">{anteprima(a.testo)}</span>
          </button>
          <button type="button" className={`${pulsante} self-center ${inModifica ? 'btn-primary' : ''}`} aria-label={`Modifica «${a.titolo}»`} title="Modifica, sposta o elimina"
            aria-expanded={inModifica}
            onClick={async () => { if (inModifica) { void lasciaModulo(); return; } if (await lasciaModulo()) setModulo({ tipo: 'modifica', id: a.id }); }}>
            <IconaAzione chiave="modifica" dimensione={20} />
          </button>
        </div>
        {inModifica && (
          <ModuloAppunto key={`m${a.id}`} titoloIniziale={a.titolo} testoIniziale={a.testo} categorie={listaCategorie} categoriaIniziale={a.categoriaId}
            etichetta={`Modifica «${a.titolo}»`} onSporco={segnaSporco}
            onAnnulla={() => void lasciaModulo()}
            onSalva={async (d) => {
              const s = useAppuntiFissiStore.getState();
              await s.modifica(a.id, { titolo: d.titolo, testo: d.testo, ...(d.categoriaId !== a.categoriaId ? { categoriaId: d.categoriaId } : {}) });
              // portato in un'altra categoria, chiusa: la categoria si apre, l'appunto si vede in fondo (senza cambio di categoria lo stato
              // ricordato non si tocca, nemmeno se a schermo la categoria è aperta solo per la ricerca)
              if (d.categoriaId !== null && d.categoriaId !== a.categoriaId) s.alterna(d.categoriaId, true);
              sporco.current = false;
              setModulo(null);
              notifica('success', 'Appunto salvato.');
            }}
            altri={(
              <>
                {i > 0 && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="su" dimensione={20} />} titolo="Sposta su" aria-label={`Sposta su «${a.titolo}»`}
                  data-appunto={a.id} data-gesto="su" onClick={() => sposta(a, i, -1)} />}
                {i < gr.appunti.length - 1 && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="giu" dimensione={20} />} titolo="Sposta giù" aria-label={`Sposta giù «${a.titolo}»`}
                  data-appunto={a.id} data-gesto="giu" onClick={() => sposta(a, i, 1)} />}
                <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina" aria-label={`Elimina «${a.titolo}»`}
                  onClick={async () => {
                    if (!(await conferma({ titolo: 'Eliminare l’appunto?', testo: `«${a.titolo}» esce dagli appunti fissi su tutti i dispositivi. Non va nel Cestino.`, etichetta: 'Elimina' }))) return;
                    try {
                      await useAppuntiFissiStore.getState().elimina(a.id);
                      sporco.current = false;
                      setModulo(null);
                      notifica('success', `Eliminato «${a.titolo}».`);
                      requestAnimationFrame(() => finestra.current?.focus({ preventScroll: true }));
                    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Non eliminato.'); }
                  }} />
              </>
            )} />
        )}
      </li>
    );
  };

  /** Gli appunti di un gruppo; un gruppo vuoto dice come riempirlo (la lista senza categoria vuota si vede solo se ci sono categorie). */
  const corpoGruppo = (gr: Gruppo, idCorpo: string) => {
    const vuoto = gr.appunti.length === 0;
    return (
      <div id={idCorpo} hidden={!aperto(gr)} className="flex flex-col gap-1.5">
        {!vuoto && (
          <ul className="m-0 p-0 list-none flex flex-col gap-1.5" aria-label={gr.categoria ? `Appunti di «${gr.categoria.nome}»: un tocco copia negli appunti` : 'Appunti fissi: un tocco copia negli appunti'}>
            {gr.appunti.map((a, i) => rigaAppunto(a, gr, i))}
          </ul>
        )}
        {vuoto && gr.categoria && !q && n > 0 && <p className="appunti-fissi__vuoto m-0 testo-12 text-text-muted">Nessun appunto: trascinane qui uno con ⠿, o scegli la categoria dalla matita di un appunto.</p>}
        {vuoto && !gr.categoria && !q && <p className="appunti-fissi__vuoto m-0 testo-12 text-text-muted">Nessun appunto senza categoria: trascinane qui uno con ⠿ per toglierlo dalla sua categoria.</p>}
      </div>
    );
  };

  /** Una categoria: maniglia (riordino fra le categorie), intestazione che apre e chiude, matita (rinomina, elimina), poi i suoi appunti. */
  const rigaCategoria = (gr: Gruppo) => {
    const c = gr.categoria!;
    const chiave = gr.chiave;
    const vista = aperto(gr);
    const inModifica = modulo?.tipo === 'categoria' && modulo.id === c.id;
    const idCorpo = `${idTitolo}-${chiave}`;
    // durante la ricerca restano solo le categorie con qualche appunto trovato
    const nascosta = q !== '' && !gr.appunti.some(aVista);
    // categoria d'arrivo vuota o chiusa: non ha righe su cui mostrare la linea, quindi è lei a evidenziarsi
    const bersaglio = riordino.trascinato !== null && riordino.rilascio?.lista === chiave && (gr.appunti.length === 0 || !vista);
    const idsCategorie = listaCategorie.map((x) => chiaveGruppo(x.id));
    return (
      <section key={chiave} hidden={nascosta} aria-label={`Categoria «${c.nome}»`}
        ref={(el) => { riordino.lista(chiave)(el); riordinoCategorie.riga(chiave)(el); }}
        className={`appunti-fissi__gruppo appunti-fissi__categoria ${bersaglio ? 'appunti-fissi__gruppo--bersaglio' : ''} ${riordinoCategorie.trascinato === chiave ? 'opacity-50' : ''} ${segnoRilascio(riordinoCategorie, 'categorie', idsCategorie, chiave)}`}>
        <div className="appunti-fissi__testa">
          {nCategorie > 1 && <Maniglia etichetta={`Sposta la categoria «${c.nome}»`} id={chiave} riordino={riordinoCategorie} />}
          <button type="button" className="appunti-fissi__interruttore touch" aria-expanded={vista} aria-controls={idCorpo}
            title={vista ? `Chiudi la categoria «${c.nome}»` : `Apri la categoria «${c.nome}»`}
            onClick={async () => {
              if (q) return;
              // chiudendo la categoria, la bozza della matita aperta su un suo appunto si nasconderebbe: prima si chiede se lasciarla
              if (vista && gr.appunti.some((a) => a.id === inModificaId) && !(await lasciaModulo())) return;
              useAppuntiFissiStore.getState().alterna(c.id);
            }} aria-disabled={q !== '' || undefined}>
            <span className="appunti-fissi__freccia" aria-hidden="true"><IconGiu size={18} /></span>
            <strong className="testo-14 truncate">{c.nome}</strong>
            <span className="testo-12 text-text-muted tabular-nums shrink-0">{gr.appunti.length}</span>
          </button>
          <button type="button" className={`${pulsante} ${inModifica ? 'btn-primary' : ''}`} aria-label={`Modifica la categoria «${c.nome}»`} title="Rinomina o elimina la categoria"
            aria-expanded={inModifica}
            onClick={async () => { if (inModifica) { void lasciaModulo(); return; } if (await lasciaModulo()) setModulo({ tipo: 'categoria', id: c.id }); }}>
            <IconaAzione chiave="modifica" dimensione={20} />
          </button>
        </div>
        {inModifica && (
          <ModuloCategoria key={`c${c.id}`} nomeIniziale={c.nome} etichetta={`Modifica la categoria «${c.nome}»`} onSporco={segnaSporco}
            onAnnulla={() => void lasciaModulo()}
            onSalva={async (nome) => {
              await useAppuntiFissiStore.getState().rinominaCategoria(c.id, nome);
              sporco.current = false;
              setModulo(null);
              notifica('success', 'Categoria salvata.');
            }}
            altri={(
              <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina" aria-label={`Elimina la categoria «${c.nome}»`}
                onClick={async () => {
                  const k = gr.appunti.length;
                  const resto = k === 0 ? '' : k === 1 ? ' Il suo appunto passa in fondo alla lista senza categoria.' : ` I suoi ${k} appunti passano in fondo alla lista senza categoria.`;
                  if (!(await conferma({ titolo: 'Eliminare la categoria?', testo: `«${c.nome}» esce dagli appunti fissi su tutti i dispositivi.${resto}`, etichetta: 'Elimina' }))) return;
                  try {
                    await useAppuntiFissiStore.getState().eliminaCategoria(c.id);
                    sporco.current = false;
                    setModulo(null);
                    notifica('success', `Eliminata la categoria «${c.nome}».`);
                    requestAnimationFrame(() => finestra.current?.focus({ preventScroll: true }));
                  } catch (err) { notifica('error', err instanceof Error ? err.message : 'Categoria non eliminata.'); }
                }} />
            )} />
        )}
        {corpoGruppo(gr, idCorpo)}
      </section>
    );
  };

  return createPortal(
    <>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Esc riduce la finestra ovunque sia il fuoco dentro */}
      <section ref={finestra} className="appunti-fissi" role="dialog" aria-modal="false" aria-labelledby={idTitolo} tabIndex={-1} hidden={ridotta}
        style={{ left: g.x, top: g.y, width: g.w, height: g.h }} onKeyDown={tasti}>
        <div className={`appunti-fissi__barra ${trascina ? 'appunti-fissi__barra--trascina' : ''}`} data-gesto="sposta"
          onPointerDown={inizia} onPointerMove={muovi} onPointerUp={finisci} onPointerCancel={finisci}>
          <button type="button" className={`${pulsante} text-text-muted`} aria-label="Sposta la finestra degli appunti fissi (frecce)" title="Trascina per spostare, o usa le frecce"
            data-frecce="sposta" onKeyDown={frecce}>
            <span aria-hidden="true" className="testo-18 leading-none">⠿</span>
          </button>
          <h2 id={idTitolo} className="appunti-fissi__titolo font-display uppercase testo-17">
            Appunti fissi{n > 0 && <span className="testo-13 text-text-muted normal-case font-sans tabular-nums"> · {n}</span>}
          </h2>
          <button type="button" data-non-trascina className={pulsante} aria-label="Aggiungi dagli appunti" title="Aggiungi ciò che hai copiato, con un titolo"
            aria-expanded={modulo?.tipo === 'aggiungi'} aria-busy={leggendo} aria-disabled={leggendo} onClick={() => void aggiungiDagliAppunti()}>
            <IconaAzione chiave="piu" dimensione={20} />
          </button>
          <button type="button" data-non-trascina className={pulsante} aria-label="Riduci a icona gli appunti fissi" aria-keyshortcuts="Escape" title="Riduci a icona (Esc)" onClick={riduci}>
            <IconaAzione chiave="meno" dimensione={20} />
          </button>
          <button type="button" data-non-trascina className={pulsante} aria-label="Chiudi gli appunti fissi" title="Chiudi" onClick={() => void chiudi()}>
            <IconaAzione chiave="chiudi" dimensione={20} />
          </button>
        </div>

        <div className="appunti-fissi__corpo">
          {modulo?.tipo === 'aggiungi' && (
            <ModuloAppunto key={modulo.n} titoloIniziale={modulo.titolo} testoIniziale={modulo.testo} categorie={listaCategorie} categoriaIniziale={null}
              etichetta="Nuovo appunto" onSporco={segnaSporco} daAppunti={modulo.daAppunti} avviso={modulo.avviso}
              onAnnulla={() => void lasciaModulo()}
              onSalva={async (d) => {
                const s = useAppuntiFissiStore.getState();
                const nuovo = await s.aggiungi(d);
                // salvato in una categoria chiusa: la categoria si apre, l'appunto nuovo si vede in fondo
                if (d.categoriaId !== null) s.alterna(d.categoriaId, true);
                sporco.current = false;
                setModulo(null);
                useAppuntiFissiStore.getState().togliProposta();
                notifica('success', `Salvato negli appunti fissi: «${nuovo.titolo}».`);
              }} />
          )}
          {/* in una riga a sé: il campo cresce in larghezza, non in altezza nella colonna del corpo; accanto, «Categoria» ne crea una */}
          {elenco !== null && (
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              {conRicerca && <CampoRicerca valore={cerca} onCambia={setCerca} segnaposto="Cerca per titolo" />}
              <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Categoria" aria-label="Nuova categoria"
                title="Crea una categoria per raggruppare gli appunti" aria-expanded={modulo?.tipo === 'categoria' && modulo.id === null}
                onClick={async () => {
                  if (modulo?.tipo === 'categoria' && modulo.id === null) { void lasciaModulo(); return; }
                  if (await lasciaModulo()) setModulo({ tipo: 'categoria', id: null });
                }} />
            </div>
          )}
          {modulo?.tipo === 'categoria' && modulo.id === null && (
            <ModuloCategoria nomeIniziale="" etichetta="Nuova categoria" onSporco={segnaSporco} onAnnulla={() => void lasciaModulo()}
              onSalva={async (nome) => {
                const nuova = await useAppuntiFissiStore.getState().aggiungiCategoria(nome);
                sporco.current = false;
                setModulo(null);
                notifica('success', `Categoria «${nuova.nome}» creata: trascina qui gli appunti con ⠿, o sceglila dalla matita di un appunto.`);
              }} />
          )}
          {errore && (
            <div className="flex flex-col gap-2 testo-13" role="alert">
              <p className="m-0 text-error-testo">{errore}</p>
              <PulsanteVisivo tono="secondario" compatto className="self-start" icona={<IconaAzione chiave="riprova" dimensione={20} />} titolo="Riprova"
                onClick={() => void useAppuntiFissiStore.getState().carica()} />
            </div>
          )}
          {elenco === null && caricamento && <div className="flex justify-center py-6"><Spinner size={28} /></div>}
          {elenco !== null && elenco.length === 0 && modulo?.tipo !== 'aggiungi' && (
            <p className="m-0 testo-13 text-text-secondary">
              Nessun appunto ancora. Copia un testo e tocca <strong>+</strong> per salvarlo con un titolo, oppure dal menu ⋯ di una voce del Diario scegli «Salva negli appunti fissi».
            </p>
          )}
          {elenco !== null && elenco.length > 0 && trovati === 0 && <p className="m-0 testo-13 text-text-muted">Nessun appunto con «{cerca.trim()}» nel titolo.</p>}
          {gruppi.length > 0 && (() => {
            const senza = gruppi[0];
            const bersaglioSenza = riordino.trascinato !== null && riordino.rilascio?.lista === GRUPPO_SENZA && senza.appunti.length === 0;
            return (
              <>
                {/* la lista senza categoria: in cima, col suo titolo solo se ci sono categorie; con categorie resta a schermo anche vuota (è il
                    posto dove rilasciare per togliere la categoria): comparire solo durante il trascinamento sposterebbe le righe sotto il puntatore */}
                <section ref={riordino.lista(GRUPPO_SENZA)} aria-label="Senza categoria" hidden={(senza.appunti.length === 0 && (nCategorie === 0 || n === 0)) || (q !== '' && !senza.appunti.some(aVista))}
                  className={`appunti-fissi__gruppo ${bersaglioSenza ? 'appunti-fissi__gruppo--bersaglio' : ''}`}>
                  {nCategorie > 0 && (
                    <h3 className="appunti-fissi__gruppo-nome m-0 testo-13 text-text-secondary">
                      Senza categoria<span className="text-text-muted tabular-nums"> · {senza.appunti.length}</span>
                    </h3>
                  )}
                  {corpoGruppo(senza, `${idTitolo}-senza`)}
                </section>
                {nCategorie > 0 && (
                  <div ref={riordinoCategorie.lista('categorie')} className="flex flex-col gap-2">
                    {gruppi.slice(1).map((gr) => rigaCategoria(gr))}
                  </div>
                )}
              </>
            );
          })()}
        </div>

        <button type="button" className={`appunti-fissi__maniglia ${telefono ? 'appunti-fissi__maniglia--verticale' : ''}`}
          aria-label={telefono ? 'Cambia l’altezza della finestra degli appunti fissi (frecce)' : 'Ridimensiona la finestra degli appunti fissi (frecce)'}
          title="Trascina per ridimensionare, o usa le frecce" data-gesto="ridimensiona" onPointerDown={inizia} onPointerMove={muovi} onPointerUp={finisci} onPointerCancel={finisci}
          data-frecce="ridimensiona" onKeyDown={frecce}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M13 5 5 13M13 9l-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" /></svg>
        </button>
      </section>

      {ridotta && (
        <button ref={icona} type="button" className="appunti-fissi__icona" style={{ left: g.ix, top: g.iy }} onClick={ripristina}
          data-gesto="icona" onPointerDown={inizia} onPointerMove={muovi} onPointerUp={finisci} onPointerCancel={finisci}
          aria-label={`Riapri gli appunti fissi${n > 0 ? ` (${n})` : ''}`} title="Riapri gli appunti fissi (trascina per spostare l’icona)">
          <IconaAzione chiave="piano" dimensione={26} />
          {n > 0 && <span className="appunti-fissi__numero testo-12" aria-hidden="true">{n}</span>}
        </button>
      )}
    </>,
    document.body,
  );
}

// ---- il modulo di un appunto (aggiunta e modifica) ----

interface PropsModulo {
  titoloIniziale: string;
  testoIniziale: string;
  /** Le categorie fra cui scegliere (nessuna: il campo non c'è) e quella di partenza (null: senza categoria). */
  categorie: readonly CategoriaAppuntiDto[];
  categoriaIniziale: number | null;
  /** Il nome del gruppo per il lettore di schermo. */
  etichetta: string;
  /** Il modulo dice qui se ha modifiche non salvate. */
  onSporco: (sporco: boolean) => void;
  onSalva: (d: { titolo: string; testo: string; categoriaId: number | null }) => Promise<void>;
  onAnnulla: () => void;
  /** Altri comandi accanto a Salva e Annulla (sposta, elimina). */
  altri?: ReactNode;
  /** Il testo è quello letto dagli appunti di sistema: si chiede solo il titolo, il testo si mostra in anteprima (non si modifica qui). */
  daAppunti?: boolean;
  /** Perché il testo va incollato a mano (gli appunti non si sono potuti leggere, o erano vuoti). */
  avviso?: string;
}

function ModuloAppunto({ titoloIniziale, testoIniziale, categorie, categoriaIniziale, etichetta, onSporco, onSalva, onAnnulla, altri, daAppunti = false, avviso }: PropsModulo) {
  const [titolo, setTitolo] = useState(titoloIniziale);
  const [testo, setTesto] = useState(testoIniziale);
  const [categoria, setCategoria] = useState<number | null>(categoriaIniziale);
  const [occupato, setOccupato] = useState(false);
  const [problema, setProblema] = useState<string | null>(null);
  const id = useId();
  // l'anteprima del testo letto: senza la riga del blocco delle voci (illeggibile), al più MAX_ANTEPRIMA caratteri; e quante voci del Diario
  // contiene, che Ctrl+V nel Diario incollerà come voci
  const lettura = useMemo(() => {
    if (!daAppunti) return null;
    const leggibile = testoIniziale.split(/\r?\n/).filter((r) => !RE_RIGA_BLOCCO.test(r)).join('\n').trim();
    const mostrato = leggibile || testoIniziale.trim();
    return {
      anteprima: mostrato.length > MAX_ANTEPRIMA ? `${mostrato.slice(0, MAX_ANTEPRIMA)}…` : mostrato,
      caratteri: testoIniziale.length,
      voci: leggiAppunti({ testo: testoIniziale })?.voci.length ?? 0,
    };
  }, [daAppunti, testoIniziale]);
  useEffect(() => { onSporco(titolo !== titoloIniziale || testo !== testoIniziale || categoria !== categoriaIniziale); },
    [titolo, testo, categoria, titoloIniziale, testoIniziale, categoriaIniziale, onSporco]);
  const salva = async () => {
    const t = titolo.trim();
    if (!t) { setProblema('Scrivi un titolo.'); return; }
    if (!testo.trim()) { setProblema('Incolla o scrivi il testo dell’appunto.'); return; }
    setProblema(null);
    setOccupato(true);
    try { await onSalva({ titolo: t, testo, categoriaId: categoria }); } catch (err) {
      setProblema(err instanceof Error && err.message ? err.message : 'Appunto non salvato.');
    } finally { setOccupato(false); }
  };
  return (
    <form role="group" aria-label={etichetta} className="flex flex-col gap-2 rounded-md border border-border p-2" onSubmit={(e) => { e.preventDefault(); void salva(); }}>
      <label className="campo" htmlFor={`${id}-t`}>
        <span className="campo__etichetta">Titolo</span>
        {/* il titolo prende il fuoco: dal Diario arriva proposto, e lo si cambia prima di salvare */}
        {/* eslint-disable-next-line jsx-a11y/no-autofocus -- fuoco voluto, vedi la riga sopra */}
        <input id={`${id}-t`} className="form-input" value={titolo} maxLength={LIMITE_TITOLO_APPUNTO} autoFocus onChange={(e) => setTitolo(e.target.value)}
          placeholder="Per esempio DOMANDA IN CLASSE" enterKeyHint="done" aria-describedby={avviso ? `${id}-v` : lettura ? `${id}-a` : undefined} />
      </label>
      {avviso && <p id={`${id}-v`} className="m-0 testo-13 text-warning text-pretty">{avviso}</p>}
      {lettura ? (
        <div className="campo">
          <span id={`${id}-a`} className="campo__etichetta">
            Testo dagli appunti
            <span className="font-normal text-text-muted tabular-nums">
              {' · '}{lettura.caratteri.toLocaleString('it')} caratteri{lettura.voci > 0 && ` · ${lettura.voci === 1 ? '1 voce' : `${lettura.voci} voci`} del Diario`}
            </span>
          </span>
          {/* raggiungibile da tastiera (Tab) per scorrere un testo lungo; non si modifica: per un testo diverso, copialo e tocca di nuovo + */}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- un'area che scorre deve prendere il fuoco per scorrere da tastiera, vedi la riga sopra */}
          <div role="region" aria-labelledby={`${id}-a`} tabIndex={0} className="appunti-fissi__anteprima testo-13">{lettura.anteprima}</div>
        </div>
      ) : (
        <label className="campo" htmlFor={`${id}-x`}>
          <span className="campo__etichetta">Testo</span>
          <textarea id={`${id}-x`} className="form-input min-h-28 testo-13" value={testo} maxLength={LIMITE_TESTO_APPUNTO} rows={5} onChange={(e) => setTesto(e.target.value)}
            placeholder="Incolla qui il testo copiato dal Diario" spellCheck={false} />
        </label>
      )}
      {/* la categoria: l'alternativa al trascinamento per portare l'appunto in un altro gruppo (va in fondo a quel gruppo) */}
      {(categorie.length > 0 || categoriaIniziale !== null) && (
        <Selettore etichetta="Categoria" etichettaSopra valore={categoria === null ? '' : String(categoria)} vuoto="Senza categoria"
          opzioni={categorie.map((c) => ({ chiave: String(c.id), nome: c.nome }))} onCambia={(v) => setCategoria(v ? Number(v) : null)} />
      )}
      {problema && <p className="m-0 testo-13 text-error-testo" role="alert">{problema}</p>}
      <div className="flex flex-wrap gap-1.5">
        <PulsanteVisivo type="submit" tono="primario" compatto icona={<IconaAzione chiave="accettata" dimensione={20} />} titolo="Salva" disabled={occupato} />
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" disabled={occupato} onClick={onAnnulla} />
        {altri}
      </div>
    </form>
  );
}

// ---- il modulo di una categoria (nuova e modifica) ----

interface PropsModuloCategoria {
  nomeIniziale: string;
  /** Il nome del gruppo per il lettore di schermo. */
  etichetta: string;
  /** Il modulo dice qui se ha modifiche non salvate. */
  onSporco: (sporco: boolean) => void;
  onSalva: (nome: string) => Promise<void>;
  onAnnulla: () => void;
  /** Altri comandi accanto a Salva e Annulla (elimina). */
  altri?: ReactNode;
}

function ModuloCategoria({ nomeIniziale, etichetta, onSporco, onSalva, onAnnulla, altri }: PropsModuloCategoria) {
  const [nome, setNome] = useState(nomeIniziale);
  const [occupato, setOccupato] = useState(false);
  const [problema, setProblema] = useState<string | null>(null);
  const id = useId();
  useEffect(() => { onSporco(nome !== nomeIniziale); }, [nome, nomeIniziale, onSporco]);
  const salva = async () => {
    const t = nome.trim();
    if (!t) { setProblema('Scrivi il nome della categoria.'); return; }
    setProblema(null);
    setOccupato(true);
    try { await onSalva(t); } catch (err) {
      setProblema(err instanceof Error && err.message ? err.message : 'Categoria non salvata.');
    } finally { setOccupato(false); }
  };
  return (
    <form role="group" aria-label={etichetta} className="flex flex-col gap-2 rounded-md border border-border p-2" onSubmit={(e) => { e.preventDefault(); void salva(); }}>
      <label className="campo" htmlFor={`${id}-n`}>
        <span className="campo__etichetta">Nome della categoria</span>
        {/* eslint-disable-next-line jsx-a11y/no-autofocus -- il modulo si apre per scrivere il nome: il fuoco ci va subito */}
        <input id={`${id}-n`} className="form-input" value={nome} maxLength={LIMITE_NOME_CATEGORIA} autoFocus onChange={(e) => setNome(e.target.value)}
          placeholder="Per esempio SCUOLA" enterKeyHint="done" />
      </label>
      {problema && <p className="m-0 testo-13 text-error-testo" role="alert">{problema}</p>}
      <div className="flex flex-wrap gap-1.5">
        <PulsanteVisivo type="submit" tono="primario" compatto icona={<IconaAzione chiave="accettata" dimensione={20} />} titolo="Salva" disabled={occupato} />
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" disabled={occupato} onClick={onAnnulla} />
        {altri}
      </div>
    </form>
  );
}
