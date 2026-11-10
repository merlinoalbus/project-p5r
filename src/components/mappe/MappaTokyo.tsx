// ============================================================
// MappaTokyo — la mappa di viaggio del gioco, ricostruita e viva col calendario
// ============================================================
//
// È la schermata di viaggio di Persona 5 Royal: fondo rosso, la rete delle linee a colori pieni
// con le fermate a pallino, e ogni quartiere come la propria sagoma ritagliata col bordo bianco,
// appoggiata su una targa nera col nome. Il disegno di ciascuno è **originale** — lo sprite `_lm`
// di `P5_MAPDATA.SPD`: il 105 di Shibuya, il Kabukichō di Shinjuku, la ruota di Odaiba, il
// Kaminarimon di Asakusa — ritagliato con l'alfa vera.
//
// Il bordo bianco non è una cornice: è un contorno che segue la sagoma, ottenuto con quattro
// ombre portate sull'alfa. Un riquadro bianco rettangolare sarebbe un'altra cosa, e nel gioco non
// c'è. Le targhe portano il solo nome italiano: le etichette giapponesi ci sarebbero, estratte lì
// accanto, ma questa è una guida italiana.
//
// Quel che la rende una guida e non un poster è il **tempo**, e il tempo tocca i posti, non i
// binari. La rete c'è tutta dal primo giorno, come nel gioco: ogni fermata è un pallino bianco.
// Quando un quartiere si sblocca, sul suo pallino spuntano la sagoma e la targa; finché non si
// sblocca resta il solo pallino. L'11 aprile Shinjuku è un pallino e basta — apre il 18 giugno —
// e il Palazzo di Kamoshida c'è dall'11 aprile al 2 maggio (finestra modificabile dalla sua pagina, 2026-10-04) e poi
// sparisce. Le condizioni vengono
// dall'esito `disponibile` del server: qui non si rivalutano date o progressi. Senza partita si vede tutto, e lo si dice.
//
// **Posizioni e tracciati sono autorati**, e sta scritto in `collocazioneTokyo.ts`: nel foglio del
// gioco non ci sono, e le «tratte» di `metropolitana.json` (l'estrazione dell'atlante, `data/atlas/extracted/`) sono raggiungibilità, non binari.
// ============================================================

import { Link } from 'react-router-dom';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import type { DungeonRiassuntoDto, QuartiereRiassuntoDto } from '../../types';
import { dataConArticolo } from '../../../shared/condizioniSpillo';
import { dataGiocoConArticolo } from '../../utils/dateGioco';
import { urlMappa } from '../../utils/navigazioneMappa';
import {
  COVO_TOKYO, LINEE_TOKYO, QUARTIERI_TOKYO, RADICI_TOKYO, SENZA_SCHEDA_TOKYO, type Collocazione,
} from './collocazioneTokyo';
import { SEGNO_COVO, nascondiSegnoAssente, segnoPalazzo, segnoQuartiere, useRisolviSegno } from './segniMappa';
import { PAGINA_COVO } from '../../utils/covo';
import type { CovoNellaPartita } from '../../hooks/useCovoNellaPartita';
import { Modal } from '../shared/Modal';
import { usePartitaStore } from '../../stores/partitaStore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { contornoSagoma } from '../../utils/contornoSagoma';
import { collocaCartellini, raggruppaCartellini, type Ostacolo } from '../../utils/raggruppaCartellini';

/** Il contorno che segue la sagoma, non un riquadro: quattro ombre portate sull'alfa.
 *
 * Bianco a riposo, oro quando ci passi sopra. L'oro non e' decorazione: su una mappa fatta di
 * sagome accostate serve capire **quale** si sta per aprire, e un semplice ingrandimento non
 * basta quando due cartellini si sfiorano. */
const CONTORNO = contornoSagoma('#fff', 1, true);
const CONTORNO_ORO = contornoSagoma('#ffd23f', 2, true) + ' brightness(1.05)';

interface Props {
  /** Unisce in un «+n» i cartellini troppo vicini e, a mappa non ingrandita, li tiene lontani da bordi e comandi (Città, Home, scheda «Oggi»). */
  raggruppaVicini?: boolean;
  quartieri: QuartiereRiassuntoDto[];
  dungeon?: DungeonRiassuntoDto[];
  /** Data della partita in MM-GG. Senza, si mostra il mondo intero. */
  dataGioco?: string | null;
  /** Il Covo dei Ladri nella partita, dall'esito della sua Area (`useCovoNellaPartita`; la data — dal 5 maggio — sta nei dati, migrazione
   *  303): `undefined` finché non è arrivato (la fermata non si disegna), `null` se l'Area non c'è (nessuna data: la fermata c'è). */
  covo?: CovoNellaPartita | null;
  /** La chiave accesa: si illumina d'oro e passa davanti alle vicine. La stessa che accende la
   *  scheda corrispondente, perché mappa e schede sono **una** selezione vista in due modi. */
  evidenziato?: string | null;
  onEvidenzia?: (chiave: string | null) => void;
  /** Se c'e', il clic su un cartellino passa di qui prima di cambiare pagina: chi ospita la mappa
   *  decide che farne (la scheda «Oggi» ci scende di livello senza uscire).
   *
   *  **Restituisce `true` solo se l'ha davvero gestito.** Non tutti i posti della mappa hanno una
   *  planimetria d'atlante da aprire lì dentro: il Covo dei Ladri porta alla sua pagina della
   *  guida, i Memento e i Palazzi alla loro scheda. Quando l'ospite risponde `false` il clic
   *  resta quello di un collegamento normale e la pagina cambia — prima veniva annullato comunque
   *  e quei cartellini non facevano niente.
   *
   *  Con l'indirizzo arriva la **destinazione esplicita** (L2, 2026-10-20): la planimetria, il punto e lo spillo su cui scendere,
   *  non un indirizzo da interpretare. Un quartiere porta alla sua pagina (`?ingresso=1`), ma chi scende sul posto — «Oggi» — va
   *  dritto all'area d'ingresso col suo centro; null dove non c'è nulla su cui scendere (il Covo). */
  onApri?: (href: string, destinazione: DestinazioneTokyo | null) => boolean;
  className?: string;
  /** Schermata senza scorrimento (Home, scheda «Oggi», da 768 px): il blocco occupa l'altezza che gli
   *  lascia la colonna e la mappa si stringe finché mappa, legenda e riga delle fermate chiuse ci
   *  stanno. Senza, il tetto di larghezza era sull'altezza della finestra (68vh) e nella colonna la
   *  mappa usciva di 50-70 px: la pagina scorreva insieme alla guida, due barre per un gesto. */
  riempi?: boolean;
}

/** Altezza degli elementi visibili fra quelli dati, più gli intervalli fra loro (il `gap` del contenitore). */
function altezzaVisibili(elementi: HTMLElement[], contenitore: HTMLElement): { altezza: number; quanti: number } {
  const visibili = elementi.filter((f) => getComputedStyle(f).display !== 'none');
  const intervallo = parseFloat(getComputedStyle(contenitore).rowGap) || 0;
  return { altezza: visibili.reduce((s, f) => s + f.getBoundingClientRect().height, 0) + Math.max(0, visibili.length - 1) * intervallo, quanti: visibili.length };
}

/** Larghezza della mappa perché il blocco stia nella sua altezza (schermata senza scorrimento).
 *
 *  Il blocco ha l'altezza che gli lascia la colonna e la sua larghezza intera: la riga delle fermate
 *  chiuse sta lì, a tutta larghezza, e la sua altezza non dipende dalla mappa. Mappa (10:7) e legenda
 *  stanno nel contenitore `mappa`, a cui si dà la larghezza: la legenda va a capo in più righe quanto più
 *  è stretto, quindi si misura e si ricalcola — partendo dalla colonna intera la larghezza può solo
 *  scendere e si ferma in pochi passaggi.
 *
 *  La larghezza si scrive sull'elemento, non nello stato: il calcolo è sincrono (prima del disegno, e
 *  senza aspettare fotogrammi, che in una scheda in secondo piano non arrivano) e si osservano la
 *  colonna e il blocco, la cui misura non dipende dalla mappa: niente giri di `ResizeObserver`. */
function useLarghezzaCheSta(attivo: boolean, contenuto: string) {
  const blocco = useRef<HTMLDivElement>(null);
  const mappa = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const b = blocco.current;
    const m = mappa.current;
    // senza `matchMedia` (ambienti senza motore di layout) non c'è una schermata da riempire: la mappa resta alla sua misura
    if (!b || !m || !attivo || typeof window.matchMedia !== 'function') return;
    // la schermata senza scorrimento c'è da 768 px: sotto, la pagina scorre e la mappa torna alla sua misura
    const schermo = window.matchMedia('(min-width: 768px)');
    /** Sotto i 768 px toglie la larghezza imposta; sopra parte dalla larghezza del blocco e la
     *  riduce (al più 8 passi) finché la mappa 10:7 più la legenda, che va a capo di conseguenza,
     *  stanno nell'altezza rimasta, con un minimo di 240 px. */
    const calcola = () => {
      const colonna = b.parentElement;
      if (!schermo.matches || !colonna) { m.style.width = ''; return; }
      const massima = b.clientWidth;
      // quel che sta nel blocco oltre alla mappa (la riga delle fermate chiuse), con l'intervallo che lo separa
      const fuori = altezzaVisibili(([...b.children] as HTMLElement[]).filter((f) => f !== m), b);
      const disponibile = b.clientHeight - fuori.altezza - (fuori.quanti > 0 ? parseFloat(getComputedStyle(b).rowGap) || 0 : 0);
      let larghezza = massima;
      for (let passo = 0; passo < 8; passo++) {
        m.style.width = `${larghezza}px`;
        // il primo figlio è la cornice della mappa; il resto (la legenda) va a capo secondo questa larghezza
        const [cornice, ...altri] = [...m.children] as HTMLElement[];
        const legenda = altezzaVisibili(altri, m);
        const spazio = disponibile - legenda.altezza - (legenda.quanti > 0 ? parseFloat(getComputedStyle(m).rowGap) || 0 : 0);
        // un pavimento: sotto i 240 px la mappa non si legge più (schermi al limite: lì resta lo scorrimento della pagina)
        const nuova = Math.max(240, Math.min(massima, Math.floor((spazio * 10) / 7)));
        if (!cornice || nuova >= larghezza - 1) break;
        larghezza = nuova;
      }
      m.style.width = `${larghezza}px`;
    };
    calcola();
    const oss = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(calcola);
    // la colonna e il blocco: la loro misura non dipende dalla larghezza data alla mappa, quindi nessun giro
    if (b.parentElement) oss?.observe(b.parentElement);
    oss?.observe(b);
    schermo.addEventListener('change', calcola);
    return () => { oss?.disconnect(); schermo.removeEventListener('change', calcola); m.style.width = ''; };
    // `contenuto` cambia quando compaiono o spariscono legenda e riga delle fermate: si rimisura
  }, [attivo, contenuto]);
  return { blocco, mappa };
}


/** Sulla targa va il nome, non la qualifica.
 *
 * «Palazzo di Okumura» è una targa larga il doppio di «Okumura», e su una mappa la larghezza è
 * spazio tolto ai vicini: nove targhe così, in fila, si accavallavano fra loro e sopra i
 * quartieri. Il nome per intero resta nel `title` e nella scheda, dove non costa niente. */
function nomeSullaTarga(nome: string): string {
  return nome.replace(/^(Palazzo|Dedalo) di /, '');
}

/** Dove scende chi apre un cartellino restando nella sua pagina: una mappa, col centro (l'ingresso di un quartiere) o con lo spillo
 *  d'arrivo (l'atterraggio di un Palazzo). */
export interface DestinazioneTokyo { mappa: string; centro: { x: number; y: number; zoom: number } | null; spillo: number | null }

interface Segno {
  chiave: string;
  /** Su che cosa scende chi apre il cartellino restando nella sua pagina (`onApri`); null se non c'è. */
  destinazione: DestinazioneTokyo | null;
  /** Per il `title` e per il testo alternativo: quello lungo. */
  nome: string;
  /** Sulla targa: quello corto. */
  targa: string;
  /** L'indirizzo del disegno, già risolto dal segno del posto (`segniMappa.ts`); null se manca: resta la targa. */
  src: string | null;
  dove: Collocazione;
  href: string;
  presente: boolean;
  quando: string | null;
  /** Un Palazzo si distingue: la targa è rossa invece che nera. */
  palazzo: boolean;
}

/** Un posto in cui si può andare: la sagoma, la targa, e l'oro quando è quello scelto.
 *
 * Ci finiscono **solo** i luoghi raggiungibili. Quelli chiusi — non ancora sbloccati dal
 * calendario, o fermate che la guida non ha come scheda — restano il solo pallino bianco della
 * rete: una figura con la targa dice «vieni qui», e dirlo a proposito di un posto dove non si può
 * entrare è una promessa che la mappa non mantiene. Il nome resta comunque, sul pallino. */
function Cartellino({ s, posizione, acceso, onEvidenzia, onApri }: { s: Segno; posizione: { x: number; y: number }; acceso: boolean; onEvidenzia?: (k: string | null) => void; onApri?: (href: string, destinazione: DestinazioneTokyo | null) => boolean }) {
  const filtro = acceso ? CONTORNO_ORO : CONTORNO;
  // I cartellini si sfiorano: senza alzarlo, quello illuminato d'oro finisce sotto al vicino e
  // il bordo si vede a metà. `z-30` lo porta davanti, e la targa con lui.
  // Resta un collegamento vero — si apre in una scheda nuova, si copia, lo legge uno screen reader
  // come tale — ma chi ospita la mappa puo' intercettare il clic per scendere di livello **restando
  // dov'e'**: nella scheda «Oggi» della partita cambiare pagina vorrebbe dire perdere il contesto
  // del giorno.
  return <Link
    to={s.href}
    onClick={onApri ? (e) => { if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0 && onApri(s.href, s.destinazione)) e.preventDefault(); } : undefined}
    className={`spillo-tokyo group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center no-underline hover:z-30 ${acceso ? 'z-30' : 'z-10'}`}
    style={{ left: `${posizione.x}%`, top: `${posizione.y}%`, width: `${s.dove.scala}%` }}
    title={s.quando ? `${s.nome} — ${s.quando}` : s.nome}
    onMouseEnter={() => onEvidenzia?.(s.chiave)}
    onMouseLeave={() => onEvidenzia?.(null)}
    onFocus={() => onEvidenzia?.(s.chiave)}
    onBlur={() => onEvidenzia?.(null)}
  >
    {s.src && <img src={s.src} alt="" aria-hidden onError={nascondiSegnoAssente}
      className={`w-full object-contain transition-transform duration-150 group-hover:scale-[1.18] ${acceso ? 'scale-[1.18]' : ''}`}
      style={{ filter: filtro }} />}
    {/* Due cose, e tutte e due servono a non far toccare le targhe fra loro.
        **Va a capo**: restava su una riga sola, e «Odaiba / Seaside Park» occupava un quinto della
        tela — su una mappa la larghezza è spazio tolto ai vicini.
        **Il corpo è in `cqw`, cioè in frazioni della tela**, non in pixel a scaglioni. Con una
        misura fissa la targa cresceva *in proporzione* quando la tela si stringeva, e a 780 px
        tornavano dodici sovrapposizioni che a 1020 px non c'erano: una collocazione buona a una
        larghezza e sbagliata all'altra. Legandola alla tela, le proporzioni non cambiano più e una
        sola tabella di posizioni vale a ogni larghezza. **Con un minimo di 12 px** (il testo minimo dell'app: le targhe non sono fra i quattro segni fitti da 11 px): sul telefono la
        tela scende a 343 px e l'1,65% erano 5,4 px, un testo che non si legge — e una targa che non
        si legge è solo rumore sopra la mappa (misurato il 2026-09-13). Sotto quella soglia le targhe
        smettono di rimpicciolire e si distanziano da sole, perché il minimo vale per tutte. */}
    <span className={`mappa-tokyo__targa -mt-[6%] w-max max-w-[7em] text-center rounded-[2px] border-[max(1px,0.19cqw)] px-[0.5em] py-[0.12em] font-display text-[max(12px,1.65cqw)] uppercase leading-[1.05] tracking-[0.05em] shadow-[0_2px_6px_rgba(0,0,0,0.7)] group-hover:border-mappa-oro group-hover:text-mappa-oro ${
      s.palazzo ? 'bg-mappa-palazzo' : 'bg-black'} ${
      acceso ? 'border-mappa-oro text-mappa-oro' : 'border-white text-white'}`}>{s.targa}</span>
  </Link>;
}

/** Le linee, sempre tutte, con le fermate a pallino bianco.
 *
 * I binari non dipendono dal giorno: la rete di Tokyo c'è tutta dal primo giorno, e spezzarla dove
 * un quartiere non è ancora sbloccato faceva sembrare la mappa incompleta invece che in attesa.
 * Quel che compare col calendario è **il posto**, non la ferrovia: finché non si sblocca al suo
 * pallino non c'è nient'altro, e quando si sblocca ci spuntano sopra la sagoma e la targa.
 *
 * Il pallino porta il nome in un `<title>`, ed è l'unico posto in cui il nome di una fermata
 * chiusa resta leggibile: la fermata non ha cartellino perché non ci si può andare, ma sapere
 * *cosa* è quel punto — e da quando apre — è metà del motivo per cui si guarda una mappa in una
 * guida. Perciò questo `<svg>` non è più `aria-hidden`.
 */
function Rete({ nomi }: { nomi: Map<string, string> }) {
  const linee = LINEE_TOKYO.map((linea) => {
    const giro = linea.anello ? [...linea.fermate, linea.fermate[0]] : linea.fermate;
    const nodi = giro.map((f) => QUARTIERI_TOKYO[f]).filter(Boolean);
    return {
      chiave: linea.nome, colore: linea.colore, nome: linea.nome, nodi,
      punti: nodi.map((c) => `${c.x},${c.y}`).join(' '),
    };
  }).filter((l) => l.nodi.length > 1);
  const fermate = new Map<string, Collocazione>();
  for (const linea of LINEE_TOKYO) {
    for (const f of linea.fermate) if (QUARTIERI_TOKYO[f]) fermate.set(f, QUARTIERI_TOKYO[f]);
  }
  return <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="presentation"
    className="absolute inset-0 h-full w-full [&>polyline]:pointer-events-none">
    {/* Tre passate: il bordo scuro che stacca la linea dal fondo rosso, il colore, e i pallini
        bianchi delle fermate. È così che due linee incrociate restano leggibili senza disegnare
        gli incroci a mano. */}
    {linee.map((l) => <polyline key={`b-${l.chiave}`} points={l.punti} fill="none"
      stroke="#1a0004" strokeWidth={13} strokeLinecap="round" strokeLinejoin="round"
      vectorEffect="non-scaling-stroke" />)}
    {linee.map((l) => <polyline key={l.chiave} points={l.punti} fill="none"
      stroke={l.colore} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"><title>{l.nome}</title></polyline>)}
    {[...fermate].map(([chiave, n]) => <circle key={`f-${chiave}`}
      cx={n.x} cy={n.y} r={0.85} fill="#fff" stroke="#1a0004" strokeWidth={0.25}>
      {nomi.has(chiave) && <title>{nomi.get(chiave)}</title>}
    </circle>)}
  </svg>;
}

const ZOOM_MAX = 4;
const ZOOM_PASSO = 1.4;

/** Lo spostamento della tela rispetto al centro del riquadro, in pixel; la vista è questo più l'ingrandimento. */
type Spostamento = { x: number; y: number };
interface Vista { zoom: number; pan: Spostamento }

/** La mappa di viaggio: rete delle linee, cartellini dei luoghi aperti alla data della partita (più
 * il Covo), zoom con pulsanti, rotellina (solo da ingrandita o con Ctrl/Cmd: a ingrandimento 1 la pagina scorre), pizzico a due dita e
 * doppio clic per adattare, trascinamento quando ingrandita, e una legenda di collegamenti. I luoghi non ancora aperti si elencano sotto, in linea
 * o, con `riempi`, come conteggio con una finestra di dettaglio; senza `dataGioco` si mostra tutto e
 * lo si dice. `evidenziato`/`onEvidenzia` condividono la selezione con le schede dell'ospite e
 * `onApri` può intercettare il clic sui cartellini. */
export function MappaTokyo({ quartieri, dungeon = [], dataGioco, covo, evidenziato, onEvidenzia, onApri, className = '', riempi = false, raggruppaVicini = true }: Props) {
  // «Nessuna partita attiva» solo quando l'elenco delle partite è arrivato (L1-07): mentre arriva non è vero
  const partiteCaricate = usePartitaStore((s) => s.caricata);
  // Zoom e trascinamento. Il minimo è 1 — la mappa intera nel riquadro — perché la tela è già
  // disegnata alla misura giusta: rimpicciolirla non aggiunge niente da vedere, ingrandirla sì.
  const cornice = useRef<HTMLDivElement>(null);
  // Zoom e spostamento in un solo valore, letto anche da un riferimento aggiornato **subito** a ogni scrittura: la rotellina e i
  // gesti arrivano più volte fra un disegno e l'altro, e i loro gestori non devono né rileggere uno stato vecchio né
  // ri-registrarsi a ogni cambio di vista.
  const [vista, setVista] = useState<Vista>({ zoom: 1, pan: { x: 0, y: 0 } });
  const vistaRef = useRef(vista);
  const imposta = useCallback((v: Vista) => { vistaRef.current = v; setVista(v); }, []);
  const { zoom, pan } = vista;
  /** I puntatori appoggiati sulla mappa (un dito, o due per il pizzico) e il gesto in corso, con la vista di partenza. */
  const puntatori = useRef(new Map<number, { x: number; y: number }>());
  const gesto = useRef<
    | { tipo: 'sposta'; x: number; y: number; pan: Spostamento }
    | { tipo: 'pizzica'; distanza: number; zoom: number; pan: Spostamento; mx: number; my: number }
    | null
  >(null);

  /** Lo spostamento non può portare la tela fuori dal riquadro: a zoom 1 non c'è margine, a zoom
   *  maggiori il margine è quanto la tela sborda da ciascun lato. Senza questo, un trascinamento
   *  lascia il riquadro vuoto e non c'è modo di capire dove si è finiti. */
  const limita = useCallback((p: { x: number; y: number }, z: number) => {
    const r = cornice.current?.getBoundingClientRect();
    if (!r) return p;
    const mx = Math.max(0, (r.width * z - r.width) / 2);
    const my = Math.max(0, (r.height * z - r.height) / 2);
    return { x: Math.max(-mx, Math.min(mx, p.x)), y: Math.max(-my, Math.min(my, p.y)) };
  }, []);

  /** Zoom attorno a un punto: quel punto resta fermo sotto il dito o sotto il cursore.
   *
   * La tela è trasformata con `translate(pan) scale(z)` e l'origine al centro, quindi un punto `p`
   * della tela finisce in `p·z + pan`. Perché il punto sotto il cursore non si muova mentre `z`
   * cambia in `z'`, lo spostamento deve diventare `s − (s − pan)·z'/z`, dove `s` è la posizione
   * del cursore rispetto al centro del riquadro. Senza questo conto lo zoom parte sempre dal
   * centro, e ingrandire un cartellino ai bordi lo spinge fuori dal riquadro.
   *
   * Un solo calcolo, fuori dagli aggiornatori di stato (React può eseguirli più volte: lo fa apposta in modalità severa, e
   * lo spostamento finirebbe moltiplicato); la vista di partenza si legge dal riferimento, che è sempre l'ultima scritta.
   * I pulsanti ingrandiscono attorno al centro: `sx = sy = 0`. */
  const zoomVerso = useCallback((fattore: number, sx: number, sy: number) => {
    const { zoom: z, pan: p } = vistaRef.current;
    const nuovo = Math.min(ZOOM_MAX, Math.max(1, z * fattore));
    if (nuovo === z) return;
    const k = nuovo / z;
    imposta({ zoom: nuovo, pan: limita({ x: sx - (sx - p.x) * k, y: sy - (sy - p.y) * k }, nuovo) });
  }, [limita, imposta]);
  const cambiaZoom = useCallback((fattore: number) => zoomVerso(fattore, 0, 0), [zoomVerso]);

  const adatta = useCallback(() => imposta({ zoom: 1, pan: { x: 0, y: 0 } }), [imposta]);

  /** La rotellina, registrata a mano perché React la registra **passiva**: con un listener passivo
   *  `preventDefault` non ha effetto e la pagina scorre mentre si cerca di ingrandire la mappa.
   *  È lo stesso motivo, e la stessa soluzione, del visore dell'atlante. Si registra una volta sola: la vista la legge dal riferimento. */
  useEffect(() => {
    const el = cornice.current;
    if (!el) return;
    /** Ingrandisce (rotella in su) o riduce attorno al cursore. A ingrandimento 1 la rotellina resta della pagina, che deve poter
     *  scorrere con il mouse sopra la mappa: la si cattura solo con la mappa ingrandita o con Ctrl/Cmd (da lì arriva anche il pizzico del trackpad). */
    const suRotella = (e: WheelEvent) => {
      if (vistaRef.current.zoom <= 1 && !e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomVerso(e.deltaY < 0 ? ZOOM_PASSO : 1 / ZOOM_PASSO, e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2);
    };
    el.addEventListener('wheel', suRotella, { passive: false });
    return () => el.removeEventListener('wheel', suRotella);
  }, [zoomVerso]);

  /** La posizione di un punto dello schermo rispetto al centro del riquadro (l'origine della tela). */
  const dalCentro = (x: number, y: number) => {
    const r = cornice.current?.getBoundingClientRect();
    return r ? { x: x - r.left - r.width / 2, y: y - r.top - r.height / 2 } : { x: 0, y: 0 };
  };

  /** Riparte dai puntatori appoggiati adesso: due o più sono un pizzico, uno solo uno spostamento (se la mappa è ingrandita e il dito
   *  non è partito da un cartellino), nessuno niente. Si richiama a ogni dito che si appoggia o si alza, così il gesto riparte dalla vista di quel momento. */
  const riparti = (spostaConsentito: boolean) => {
    const dita = [...puntatori.current.values()];
    const v = vistaRef.current;
    if (dita.length >= 2) {
      const [a, b] = dita;
      const m = dalCentro((a.x + b.x) / 2, (a.y + b.y) / 2);
      gesto.current = { tipo: 'pizzica', distanza: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), zoom: v.zoom, pan: v.pan, mx: m.x, my: m.y };
    } else if (dita.length === 1 && v.zoom > 1 && spostaConsentito) {
      gesto.current = { tipo: 'sposta', x: dita[0].x, y: dita[0].y, pan: v.pan };
    } else gesto.current = null;
  };

  const iniziaTrascinamento = (e: ReactPointerEvent<HTMLDivElement>) => {
    // il mouse è un puntatore solo: un rilascio avvenuto fuori dal riquadro, senza cattura, non deve lasciare un «dito» fantasma
    if (e.pointerType !== 'touch') puntatori.current.clear();
    puntatori.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // un dito partito da un cartellino o da un comando è un clic, non uno spostamento; un secondo dito è comunque un pizzico
    riparti(!(e.target as HTMLElement).closest('a, button'));
    if (!gesto.current) return;
    // i puntatori del gesto restano della mappa anche fuori dal suo riquadro
    for (const id of puntatori.current.keys()) {
      try { e.currentTarget.setPointerCapture(id); } catch { /* il puntatore non c'è più */ }
    }
  };

  const muoviTrascinamento = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!puntatori.current.has(e.pointerId)) return;
    puntatori.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesto.current;
    if (!g) return;
    if (g.tipo === 'sposta') {
      imposta({ zoom: vistaRef.current.zoom, pan: limita({ x: g.pan.x + (e.clientX - g.x), y: g.pan.y + (e.clientY - g.y) }, vistaRef.current.zoom) });
      return;
    }
    // Il pizzico: lo zoom segue il rapporto fra le distanze dei due dita, e il punto della tela che stava sotto il loro centro
    // all'inizio resta sotto il centro di adesso (così il pizzico ingrandisce attorno alle dita e due dita che scivolano insieme spostano).
    const [a, b] = [...puntatori.current.values()];
    const zoomNuovo = Math.min(ZOOM_MAX, Math.max(1, g.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / g.distanza)));
    const m = dalCentro((a.x + b.x) / 2, (a.y + b.y) / 2);
    const k = zoomNuovo / g.zoom;
    imposta({ zoom: zoomNuovo, pan: limita({ x: m.x - (g.mx - g.pan.x) * k, y: m.y - (g.my - g.pan.y) * k }, zoomNuovo) });
  };

  const fineTrascinamento = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!puntatori.current.delete(e.pointerId)) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    // alzato un dito del pizzico, quello che resta sposta (se la mappa è ancora ingrandita)
    riparti(true);
  };

  // i segni dei posti (sagome, stemmi, il Covo) dal manifesto, anche con la grafica predefinita spenta: senza, la metro restava di
  // sole linee e nodi (UX-2, decisione del PM del 2026-10-20)
  const risolvi = useRisolviSegno();
  const { presenti, assenti, nomiFermate } = useMemo(() => {
    const segni: Segno[] = [];
    for (const q of quartieri) {
      const dove = QUARTIERI_TOKYO[q.chiave];
      if (!dove) continue;
      segni.push({
        chiave: q.chiave, nome: q.nome, targa: q.nome, src: risolvi(segnoQuartiere(q.chiave)), dove, palazzo: false,
        // Si entra **nella pagina del quartiere**, l'unica che apre Shibuya (L2, R2-15; decisione del PM del 2026-10-20): arrivando
        // dalla metro (`ingresso=1`) la pagina apre in una finestra l'area d'ingresso configurata, sul suo punto e col suo zoom,
        // che è dove l'utente vuole atterrare toccando il quartiere qui; dalle schede si arriva senza la finestra.
        href: `/guida/citta/${encodeURIComponent(q.chiave)}?ingresso=1`,
        // Chi scende sul posto senza cambiare pagina («Oggi») va dritto all'ingresso, col suo centro; senza ingresso,
        // sull'illustrazione del quartiere.
        destinazione: q.ingresso
          ? { mappa: q.ingresso.mappa, centro: { x: q.ingresso.x, y: q.ingresso.y, zoom: q.ingresso.zoom }, spillo: null }
          : q.mappaChiave ? { mappa: q.mappaChiave, centro: null, spillo: null } : null,
        presente: q.disponibile !== false,
        // Testo e motivo del valutatore, non la data legacy: potrebbe essere solo una delle vie in OR.
        quando: q.bloccoMotivo ?? q.sbloccoCondizione?.testo ?? null,
      });
    }
    for (const d of dungeon) {
      const dove = RADICI_TOKYO[`dungeon-${d.chiave}`];
      if (!dove) continue;
      const f = d.finestra;
      segni.push({
        chiave: `dungeon-${d.chiave}`, nome: d.nome, targa: nomeSullaTarga(d.nome),
        // Le radici del Metaverso — gli otto Palazzi e i Memento — non stanno nel foglio della mappa
        // di viaggio, perché nel gioco lì non compaiono, e tengono la loro illustrazione, che
        // l'utente ha chiesto di lasciare com'è. La targa scura le distingue dai quartieri: sono
        // posti dell'altro mondo, non fermate del treno.
        src: risolvi(segnoPalazzo(d.chiave)), dove, palazzo: true,
        // Dove si atterra lo dicono le regole del Palazzo per il giorno della partita (2026-10-04): una planimetria, centrata
        // sul pin d'arrivo se c'è. Senza una regola che copra il giorno, la scheda del Palazzo (L3, §4.1: prima `/guida/mondo/dungeon/<k>`,
        // che finiva nella griglia delle planimetrie); con la regola il redirect della casa porta all'area, col pin (R3-35).
        href: d.atterraggio
          ? urlMappa(d.atterraggio.mappa, d.atterraggio.spillo !== null ? { spillo: d.atterraggio.spillo } : undefined)
          // dalla metro si arriva dove si è nel Palazzo (UX3-4, decisione del PM del 2026-10-20): la prima infiltrazione non completata
          // della partita, come dal diario; tutte completate, o senza partita, la prima. I Memento restano senza (non hanno infiltrazioni)
          : `/guida/dungeon/${encodeURIComponent(d.chiave)}${d.tipo === 'mementos' ? '' : '?infiltrazione=in-corso'}`,
        destinazione: d.atterraggio ? { mappa: d.atterraggio.mappa, centro: null, spillo: d.atterraggio.spillo } : null,
        // Un Palazzo **concluso** (Tesoro e boss finale) non c'è più, anche dentro la sua finestra: come nel gioco dopo il furto, e come
        // l'ingresso dalla città, chiuso a Palazzo concluso (`palazziService`). Dal 2026-10-20 (L4 §8.10) gli effetti seguono il concluso,
        // non il completato (che vale solo per anello e percentuale); `completato` resta per le risposte di prima, senza `concluso`.
        presente: d.disponibile !== false,
        quando: d.concluso ? `concluso: ${d.concluso}` : f ? (f.al ? `${dataConArticolo(f.dal, 'da')} ${dataConArticolo(f.al, 'a')}` : dataConArticolo(f.dal, 'da')) : null,
      });
    }
    // Il Covo dei Ladri: nel gioco si apre dal menu, dal 5 maggio, e non si raggiunge in metro (registro dell'Esperto della guida, G-004;
    // L2), quindi la fermata porta alla pagina delle sfide. C'è **quando c'è la sua Area** nella partita (richiesta dell'utente del
    // 2026-10-29: «far sì che compaia in mappa solo da quella data in poi»): la data sta una volta nei dati, sull'Area (migrazione 303), e
    // qui arriva solo l'esito, come per quartieri e Palazzi; prima della data va fra le mete «non ancora nel mondo», col suo perché.
    // Finché l'esito non è arrivato non si disegna. Il segno è la voce 4 di `docs/grafica/fabbisogno.md`: senza il file resta la targa.
    if (covo !== undefined) {
      segni.push({
        chiave: 'covo', nome: 'Covo dei Ladri', targa: 'Covo dei Ladri', destinazione: null,
        src: risolvi(SEGNO_COVO), dove: COVO_TOKYO, palazzo: false, href: PAGINA_COVO,
        presente: covo === null || covo.disponibile,
        quando: covo?.quando ?? null,
      });
    }
    // Il nome di ogni fermata, cartellino o non cartellino. Serve ai pallini: quando una fermata
    // è chiusa — non ancora sbloccata, o senza una scheda nella guida — il pallino è tutto quel
    // che resta, e senza il nome sarebbe un puntino muto.
    const nomi = new Map<string, string>();
    for (const s of segni) if (QUARTIERI_TOKYO[s.chiave]) nomi.set(s.chiave, s.quando && !s.presente ? `${s.nome} — ${s.quando}` : s.nome);
    // Le fermate che il gioco ha e la guida no: Ginza, Kanda, Nagatachō, Akasaka-Mitsuke,
    // Aoyama-Itchōme, la spiaggia di Miura. Restano **solo il pallino**, col nome sopra. Avevano
    // sagoma e targa come le altre e non si potevano aprire: una figura con la targa dice «vieni
    // qui», e non è vero. Toglierle del tutto lascerebbe la Yamanote senza mezze fermate.
    for (const [chiave, nome] of Object.entries(SENZA_SCHEDA_TOKYO)) {
      if (QUARTIERI_TOKYO[chiave] && !nomi.has(chiave)) nomi.set(chiave, nome);
    }
    return { presenti: segni.filter((s) => s.presente), assenti: segni.filter((s) => !s.presente), nomiFermate: nomi };
  }, [quartieri, dungeon, covo, risolvi]);
  const [elencoAssenti, setElencoAssenti] = useState(false);
  // Cartellini troppo vicini alla misura di adesso: diventano un gruppo «+n» con l'elenco dei nomi (regola dei bersagli, vedi
  // `raggruppaCartellini`). La misura della tela (non ingrandita) si legge dal riquadro e si segue quando cambia; senza motore di
  // layout (prove) resta zero e nessuno si raggruppa.
  // Con la mappa non ingrandita anche i comandi dello zoom (riquadro in basso a destra) contano: un cartellino a meno di mezza area di tocco
  // da loro, o dal bordo, si sposta verso l'interno del minimo necessario (`collocaCartellini`). Ingrandita, la tela si sposta sotto i
  // comandi e i cartellini restano dove sono.
  const comandi = useRef<HTMLDivElement>(null);
  const [misura, setMisura] = useState({ w: 0, h: 0, comandi: null as Ostacolo | null });
  useLayoutEffect(() => {
    const el = cornice.current;
    if (!el) return;
    const leggi = () => {
      const c = comandi.current;
      const o = c ? { x: c.offsetLeft, y: c.offsetTop, w: c.offsetWidth, h: c.offsetHeight } : null;
      setMisura((m) => (m.w === el.clientWidth && m.h === el.clientHeight && JSON.stringify(m.comandi) === JSON.stringify(o)
        ? m : { w: el.clientWidth, h: el.clientHeight, comandi: o }));
    };
    leggi();
    if (typeof ResizeObserver === 'undefined') return;
    const oss = new ResizeObserver(leggi);
    oss.observe(el);
    if (comandi.current) oss.observe(comandi.current);
    return () => oss.disconnect();
  }, []);
  const { singoli, gruppi } = useMemo(() => {
    const punti = presenti.map((s) => ({ chiave: s.chiave, x: s.dove.x, y: s.dove.y }));
    if (raggruppaVicini && zoom === 1) return collocaCartellini(punti, misura.w, misura.h, misura.comandi ? [misura.comandi] : []);
    const r = raggruppaCartellini(punti, raggruppaVicini ? misura.w * zoom : 0, raggruppaVicini ? misura.h * zoom : 0);
    const dove = new Map(punti.map((p) => [p.chiave, p]));
    return { singoli: r.singoli.map((k) => dove.get(k)!), gruppi: r.gruppi };
  }, [presenti, misura, zoom, raggruppaVicini]);
  const [gruppoAperto, setGruppoAperto] = useState<string | null>(null);
  const gruppoScelto = gruppi.find((g) => g.chiave === gruppoAperto) ?? null;
  const perChiave = useMemo(() => new Map(presenti.map((s) => [s.chiave, s])), [presenti]);
  /** Il clic su un collegamento verso un cartellino: stessa regola del cartellino singolo (l'ospite può gestirlo senza cambiare pagina). */
  const alClic = (s: Segno) => (e: ReactMouseEvent) => {
    setGruppoAperto(null);
    if (onApri && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0 && onApri(s.href, s.destinazione)) e.preventDefault();
  };
  const { blocco, mappa } = useLarghezzaCheSta(riempi, `${presenti.length}/${assenti.length}/${dataGioco ?? ''}`);

  // Il tetto di larghezza sta **sul blocco**, non sulla sola cornice: sotto la mappa c'è la riga
  // delle fermate non ancora aperte, che è lunga, e messa in una colonna larga quanto vuole
  // spingeva l'intera colonna a 1750 px buttando le schede fuori dallo schermo. Con il tetto qui
  // la riga va a capo dentro la misura della mappa, che è dove deve stare.
  return <div ref={blocco} className={`blocco-mappa-tokyo flex flex-col gap-2 ${riempi ? 'blocco-mappa-tokyo--riempi' : ''} ${className}`}>
    {/* Mappa e legenda stanno insieme: la loro larghezza è quella della mappa (e il contenitore «mappaTokyo»
        con cui targhe e legenda decidono se comparire); la riga delle fermate chiuse sta sotto, nel blocco. */}
    <div ref={mappa} className="blocco-mappa-tokyo__mappa flex flex-col gap-2">
    {/* Il riquadro: bordo, fondo e proporzione fissa, come ogni altra mappa dell'app. Dentro, una
        tela che si ingrandisce e si trascina — questa mappa era l'unica a non farlo, e su una tela
        piena di sagome accostate lo zoom non è un lusso: è il modo di leggere le targhe piccole e
        di separare due cartellini che si sfiorano.
        Su uno schermo stretto la mappa si vede **tutta**, piccola, e si ingrandisce: prima si
        allargava a forza a 680 px e si scorreva, ma quella larghezza minima su un telefono
        schiacciava la tela — 680×231 invece di 680×476 — e le posizioni, che sono percentuali di
        una tela 10:7, finivano tutte nel posto sbagliato. Così invece le proporzioni non cambiano
        mai, e la collocazione verificata vale a ogni larghezza. */}
    <div ref={cornice}
      className={`mappa-tokyo ${zoom > 1 ? 'mappa-tokyo--spostabile' : ''}`}
      onDoubleClick={adatta}
      onPointerDown={iniziaTrascinamento} onPointerMove={muoviTrascinamento}
      onPointerUp={fineTrascinamento} onPointerCancel={fineTrascinamento}
    >
      <div
        className="mappa-tokyo__tela"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, '--zoom-tokyo': zoom } as CSSProperties}
        // `group`, non `img`: dentro ci sono i cartellini da toccare, e un `img` li renderebbe invisibili ai lettori di schermo
        role="group"
        aria-label={`Mappa di Tokyo con ${presenti.length} mete raggiungibili`}
      >
        {/* Le macchie più scure sono la terraferma, come nella schermata del gioco: danno un fondo
            alla rete invece di lasciarla galleggiare su un rosso piatto. */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden className="absolute inset-0 h-full w-full">
          <path fill="#c00016" d="M14 22 L36 8 L58 12 L76 20 L88 34 L84 52 L92 62 L74 80 L52 78 L34 88 L16 66 L8 44 Z" />
          <path fill="#cc0a1c" d="M26 34 L46 26 L62 36 L58 56 L40 66 L26 56 Z" />
        </svg>
        <Rete nomi={nomiFermate} />
        {/* Fra i presenti c'è anche il Covo dei Ladri, quando la sua Area è nel mondo (dal 5 maggio, dai dati: vedi sopra). */}
        {singoli.map((c) => {
          const s = perChiave.get(c.chiave);
          return s ? <Cartellino key={c.chiave} s={s} posizione={c} acceso={evidenziato === c.chiave} onEvidenzia={onEvidenzia} onApri={onApri} /> : null;
        })}
        {/* Cartellini che alla misura di adesso si toccano: una pastiglia «+n» per gruppo, che apre l'elenco dei nomi. Resta della
            grandezza del tocco (34 px più l'imbottitura) a ogni ingrandimento: nella tela che scala la si riporta a misura. */}
        {gruppi.map((g) => {
          const nomi = g.chiavi.map((k) => perChiave.get(k)?.nome ?? k);
          const acceso = evidenziato != null && g.chiavi.includes(evidenziato);
          return (
            <button key={g.chiave} type="button"
              className={`spillo-tokyo-gruppo absolute z-20 ${acceso ? 'spillo-tokyo-gruppo--acceso' : ''}`}
              style={{ left: `${g.x}%`, top: `${g.y}%`, transform: `translate(-50%, -50%) scale(${1 / zoom})` }}
              aria-label={`${g.chiavi.length} mete vicine: ${nomi.join(', ')}`} aria-haspopup="dialog" aria-expanded={gruppoAperto === g.chiave}
              title={nomi.join(', ')}
              onClick={() => setGruppoAperto(g.chiave)}>
              <span className="spillo-mappa__gruppo">+{g.chiavi.length}</span>
            </button>
          );
        })}
      </div>
      {/* Gli stessi comandi del visore, nello stesso angolo: chi ha imparato lì li ritrova qui. */}
      <div ref={comandi} className="visore-mappa__controlli">
        <button type="button" className="visore-mappa__controllo" onClick={() => cambiaZoom(ZOOM_PASSO)} disabled={zoom >= ZOOM_MAX} aria-label="Ingrandisci">+</button>
        <span className="visore-mappa__zoom" aria-live="polite">{Math.round(zoom * 100)}%</span>
        <button type="button" className="visore-mappa__controllo" onClick={() => cambiaZoom(1 / ZOOM_PASSO)} disabled={zoom <= 1} aria-label="Riduci">−</button>
        {/* Sempre premibile, ma dice anche quando non c'e' niente da fare: a ingrandimento 1 e senza
            spostamento la mappa e' gia' tutta nel riquadro, e premendo non succede nulla — il che,
            senza una spiegazione, si legge come un pulsante rotto. */}
        <button type="button" className="visore-mappa__controllo" onClick={adatta} aria-label="Adatta alla finestra"
          title={zoom === 1 && pan.x === 0 && pan.y === 0 ? 'La mappa è già tutta nel riquadro' : 'Adatta alla finestra'}>⤢</button>
      </div>
    </div>
    {/* Sul telefono la tela scende sotto i 340 px e le targhe non ci stanno: rimpicciolite si
        leggono a 5 px, portate a una misura leggibile si sovrappongono fra loro. Sotto quella
        soglia spariscono dalla mappa — che resta un'immagine pulita — e i nomi diventano questo
        elenco, che è anche un bersaglio vero da 44 px invece di un cartellino di dodici
        (misurato il 2026-09-13: «Yongen-Jaya» e «Shibuya» si toccavano a 331 px di tela). */}
    <ul className="mappa-tokyo__legenda m-0 p-0 list-none" aria-label="Quartieri e Palazzi raggiungibili sulla mappa">
      {presenti.map((s) => (
        <li key={s.chiave}>
          <Link to={s.href} className="chip chip--icona no-underline"
            onClick={onApri ? (e) => { if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0 && onApri(s.href, s.destinazione)) e.preventDefault(); } : undefined}
            onMouseEnter={() => onEvidenzia?.(s.chiave)} onMouseLeave={() => onEvidenzia?.(null)}>{s.nome}</Link>
        </li>
      ))}
    </ul>
    </div>
    {dataGioco && assenti.length > 0 && (riempi ? (
      // Nella schermata senza scorrimento l'elenco per esteso (una trentina di nomi, 144 px su una colonna
      // di 360) spingeva la pagina a scorrere insieme alla guida: qui resta il conto, e i nomi — con il
      // perché scritto per esteso, che al passaggio del mouse col dito non si legge — stanno nella finestra.
      <p className="m-0 flex flex-wrap items-center gap-x-2 testo-12 text-text-muted">
        <span>Non ancora nel mondo, {dataGiocoConArticolo(dataGioco, 'a')}: {assenti.length === 1 ? '1 meta' : `${assenti.length} mete`}.</span>
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="dettagli" dimensione={20} />} titolo="Quali" aria-label={`Quali mete non sono ancora nel mondo (${assenti.length})`} onClick={() => setElencoAssenti(true)} />
      </p>
    ) : <p className="m-0 testo-12 text-text-muted">
      {/* Non spariscono e basta: si dice **quali**, altrimenti la mappa sembra incompleta invece
          che aggiornata al giorno della partita. Il perché sta sul nome, al passaggio del mouse:
          da quando le condizioni non sono più solo date — un rango di Confidente, un libro da
          leggere — scriverle tutte per esteso faceva venti righe di testo sotto la mappa. */}
      Non ancora nel mondo, {dataGiocoConArticolo(dataGioco, 'a')}: {assenti.map((s, i) => <span key={s.chiave}>
        {i > 0 && ' · '}<span className="cursor-help underline decoration-dotted underline-offset-2" title={s.quando ?? 'condizione non indicata'}>{s.nome}</span>
      </span>)}
    </p>)}
    {elencoAssenti && dataGioco && (
      <Modal aperta titolo={`Non ancora nel mondo, ${dataGiocoConArticolo(dataGioco, 'a')}`} onChiudi={() => setElencoAssenti(false)}>
        <ul className="m-0 p-0 list-none flex flex-col divide-y divide-border-light testo-13">
          {assenti.map((s) => (
            <li key={s.chiave} className="flex flex-wrap items-baseline justify-between gap-x-3 py-1.5">
              <span>{s.nome}</span>
              <span className="testo-12 text-text-muted">{s.quando ?? 'condizione non indicata'}</span>
            </li>
          ))}
        </ul>
      </Modal>
    )}
    {gruppoScelto && (
      <Modal aperta titolo={`${gruppoScelto.chiavi.length} mete vicine`} onChiudi={() => setGruppoAperto(null)}>
        <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
          {gruppoScelto.chiavi.map((k) => {
            const s = perChiave.get(k);
            if (!s) return null;
            return (
              <li key={k}>
                <Link to={s.href} className="chip chip--icona touch no-underline" onClick={alClic(s)}
                  onMouseEnter={() => onEvidenzia?.(s.chiave)} onMouseLeave={() => onEvidenzia?.(null)}>{s.nome}</Link>
              </li>
            );
          })}
        </ul>
      </Modal>
    )}
    {!dataGioco && partiteCaricate && <p className="m-0 testo-12 text-text-muted">
      Nessuna partita attiva: la mappa mostra il mondo intero, quartieri e Palazzi compresi.
    </p>}
  </div>;
}
