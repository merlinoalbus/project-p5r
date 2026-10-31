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
//   - Posizione, dimensione e posto dell'icona si ricordano per dispositivo (`localStorage` con try/catch, mai dati); sul telefono (< 640 px)
//     la finestra è larga quanto lo schermo. Sempre dentro la finestra visibile, anche quando questa cambia (ridimensionamento, rotazione).
//   - Un tocco su un appunto scrive il suo testo negli appunti di sistema (`copiaTesto`: `writeText` con il ripiego dell'evento `copy`) e
//     dice «Copiato»; poi Ctrl+V nel Diario (o «Incolla qui» nel menu ⋯ di una voce) lo incolla come ogni blocco copiato dal Diario.
//   - Gestione: «+» (richiesta dell'utente, 2026-10-31: «aggiungere agli appunti fissi un nuovo elemento cliccando su + (prende quello che
//     attualmente ci sta in memoria) e mi fa indicare un breve testo di riferimento») legge gli appunti di sistema (`readText`, dentro il
//     gesto) e apre il modulo con il solo titolo, già col fuoco, e l'anteprima del testo letto; se il browser non li lascia leggere
//     (permesso negato, telefono senza l'API, contesto non sicuro) o sono vuoti, lo stesso modulo ha il campo del testo da incollare a mano e
//     un avviso che dice perché. Per ogni appunto la matita: titolo, testo, sposta su/giù, elimina con conferma. Con molti appunti, la
//     ricerca per titolo.
// ============================================================

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as KeyboardEventReact, type PointerEvent as PointerEventReact, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useAppuntiFissiStore } from '../../stores/appuntiFissiStore';
import { useAppuntiDiarioStore } from '../../stores/appuntiDiarioStore';
import { notifica } from '../../stores/notificationStore';
import { conferma, CHIUDI_SENZA_SALVARE } from '../../stores/confermaStore';
import { useMedia } from '../../hooks/useMedia';
import { copiaTesto } from '../../utils/scritturaAppunti';
import { leggiAppunti } from '../../utils/appuntiDiario';
import { IconaAzione } from '../shared/IconaAzione';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { CampoRicerca } from '../shared/CampoRicerca';
import { Spinner } from '../shared/PageState';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';
import { LIMITE_TESTO_APPUNTO, LIMITE_TITOLO_APPUNTO, type AppuntoFissoDto } from '../../../shared/appuntiFissi';

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
  try {
    const v = JSON.parse(window.localStorage.getItem(CHIAVE_GEOMETRIA) ?? 'null') as Partial<Record<keyof Geometria, unknown>> | null;
    if (!v || typeof v !== 'object') return dentro(base, telefono);
    const num = (k: keyof Geometria) => (typeof v[k] === 'number' && Number.isFinite(v[k]) ? (v[k] as number) : base[k]);
    return dentro({ x: num('x'), y: num('y'), w: num('w'), h: num('h'), ix: num('ix'), iy: num('iy') }, telefono);
  } catch { return dentro(base, telefono); }
}
function scriviGeometria(g: Geometria): void {
  try { window.localStorage.setItem(CHIAVE_GEOMETRIA, JSON.stringify(g)); } catch { /* senza memoria del dispositivo si riparte dal posto predefinito */ }
}

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
 *  chiede solo il titolo — o col testo da incollare a mano e il perché in `avviso`), la modifica di un appunto. */
type Modulo = { tipo: 'aggiungi'; titolo: string; testo: string; n: number; daAppunti?: boolean; avviso?: string } | { tipo: 'modifica'; id: number } | null;

function FinestraAppuntiFissiReale() {
  const stato = useAppuntiFissiStore((s) => s.stato);
  const elenco = useAppuntiFissiStore((s) => s.elenco);
  const caricamento = useAppuntiFissiStore((s) => s.caricamento);
  const errore = useAppuntiFissiStore((s) => s.errore);
  const proposta = useAppuntiFissiStore((s) => s.proposta);
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
    if (e.key !== 'Escape' || e.nativeEvent.isComposing) return;
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
  /** Un passo su o giù; il fuoco resta sul gesto, o va sull'opposto se al bordo il gesto sparisce. */
  const sposta = (a: AppuntoFissoDto, verso: -1 | 1) => {
    void useAppuntiFissiStore.getState().sposta(a.id, verso).then(() => requestAnimationFrame(() => {
      const nome = (v: -1 | 1) => `${v === -1 ? 'Sposta su' : 'Sposta giù'} «${a.titolo}»`;
      const trova = (v: -1 | 1) => [...(finestra.current?.querySelectorAll<HTMLButtonElement>('button[aria-label]') ?? [])].find((b) => b.getAttribute('aria-label') === nome(v));
      (trova(verso) ?? trova(verso === -1 ? 1 : -1))?.focus();
    })).catch((err: unknown) => notifica('error', err instanceof Error ? err.message : 'Non spostato.'));
  };
  const [cerca, setCerca] = useState('');
  const conRicerca = (elenco?.length ?? 0) >= SOGLIA_RICERCA;
  const visibili = useMemo(() => {
    if (!elenco) return [];
    const q = conRicerca ? perCercare(cerca.trim()) : '';
    return q ? elenco.filter((a) => perCercare(a.titolo).includes(q)) : elenco;
  }, [elenco, cerca, conRicerca]);

  if (stato === 'chiusa') return null;
  const n = elenco?.length ?? 0;
  const ridotta = stato === 'ridotta';
  const pulsante = 'btn btn-ghost btn-sm touch shrink-0';

  return createPortal(
    <>
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
            <ModuloAppunto key={modulo.n} titoloIniziale={modulo.titolo} testoIniziale={modulo.testo} etichetta="Nuovo appunto" onSporco={segnaSporco}
              daAppunti={modulo.daAppunti} avviso={modulo.avviso}
              onAnnulla={() => void lasciaModulo()}
              onSalva={async (d) => {
                const nuovo = await useAppuntiFissiStore.getState().aggiungi(d);
                sporco.current = false;
                setModulo(null);
                useAppuntiFissiStore.getState().togliProposta();
                notifica('success', `Salvato negli appunti fissi: «${nuovo.titolo}».`);
              }} />
          )}
          {/* in una riga a sé: il campo cresce in larghezza, non in altezza nella colonna del corpo */}
          {conRicerca && <div className="flex shrink-0"><CampoRicerca valore={cerca} onCambia={setCerca} segnaposto="Cerca per titolo" /></div>}
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
          {elenco !== null && elenco.length > 0 && visibili.length === 0 && <p className="m-0 testo-13 text-text-muted">Nessun appunto con «{cerca.trim()}» nel titolo.</p>}
          {visibili.length > 0 && (
            <ul className="m-0 p-0 list-none flex flex-col gap-1.5" aria-label="Appunti fissi: un tocco copia negli appunti">
              {visibili.map((a) => {
                const i = elenco!.indexOf(a);
                const inModifica = modulo?.tipo === 'modifica' && modulo.id === a.id;
                return (
                  <li key={a.id} className="flex flex-col gap-1.5">
                    <div className="appunti-fissi__voce">
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
                      <ModuloAppunto key={`m${a.id}`} titoloIniziale={a.titolo} testoIniziale={a.testo} etichetta={`Modifica «${a.titolo}»`} onSporco={segnaSporco}
                        onAnnulla={() => void lasciaModulo()}
                        onSalva={async (d) => {
                          await useAppuntiFissiStore.getState().modifica(a.id, d);
                          sporco.current = false;
                          setModulo(null);
                          notifica('success', 'Appunto salvato.');
                        }}
                        altri={(
                          <>
                            {i > 0 && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="su" dimensione={20} />} titolo="Sposta su" aria-label={`Sposta su «${a.titolo}»`}
                              onClick={() => sposta(a, -1)} />}
                            {i >= 0 && i < n - 1 && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="giu" dimensione={20} />} titolo="Sposta giù" aria-label={`Sposta giù «${a.titolo}»`}
                              onClick={() => sposta(a, 1)} />}
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
              })}
            </ul>
          )}
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
  /** Il nome del gruppo per il lettore di schermo. */
  etichetta: string;
  /** Il modulo dice qui se ha modifiche non salvate. */
  onSporco: (sporco: boolean) => void;
  onSalva: (d: { titolo: string; testo: string }) => Promise<void>;
  onAnnulla: () => void;
  /** Altri comandi accanto a Salva e Annulla (sposta, elimina). */
  altri?: ReactNode;
  /** Il testo è quello letto dagli appunti di sistema: si chiede solo il titolo, il testo si mostra in anteprima (non si modifica qui). */
  daAppunti?: boolean;
  /** Perché il testo va incollato a mano (gli appunti non si sono potuti leggere, o erano vuoti). */
  avviso?: string;
}

function ModuloAppunto({ titoloIniziale, testoIniziale, etichetta, onSporco, onSalva, onAnnulla, altri, daAppunti = false, avviso }: PropsModulo) {
  const [titolo, setTitolo] = useState(titoloIniziale);
  const [testo, setTesto] = useState(testoIniziale);
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
  useEffect(() => { onSporco(titolo !== titoloIniziale || testo !== testoIniziale); }, [titolo, testo, titoloIniziale, testoIniziale, onSporco]);
  const salva = async () => {
    const t = titolo.trim();
    if (!t) { setProblema('Scrivi un titolo.'); return; }
    if (!testo.trim()) { setProblema('Incolla o scrivi il testo dell’appunto.'); return; }
    setProblema(null);
    setOccupato(true);
    try { await onSalva({ titolo: t, testo }); } catch (err) {
      setProblema(err instanceof Error && err.message ? err.message : 'Appunto non salvato.');
    } finally { setOccupato(false); }
  };
  return (
    <form role="group" aria-label={etichetta} className="flex flex-col gap-2 rounded-md border border-border p-2" onSubmit={(e) => { e.preventDefault(); void salva(); }}>
      <label className="campo" htmlFor={`${id}-t`}>
        <span className="campo__etichetta">Titolo</span>
        {/* il titolo prende il fuoco: dal Diario arriva proposto, e lo si cambia prima di salvare */}
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
          <div role="region" aria-labelledby={`${id}-a`} tabIndex={0} className="appunti-fissi__anteprima testo-13">{lettura.anteprima}</div>
        </div>
      ) : (
        <label className="campo" htmlFor={`${id}-x`}>
          <span className="campo__etichetta">Testo</span>
          <textarea id={`${id}-x`} className="form-input min-h-28 testo-13" value={testo} maxLength={LIMITE_TESTO_APPUNTO} rows={5} onChange={(e) => setTesto(e.target.value)}
            placeholder="Incolla qui il testo copiato dal Diario" spellCheck={false} />
        </label>
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
