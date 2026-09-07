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
// e il Palazzo di Kamoshida c'è dal 12 aprile al 2 maggio e poi sparisce. Le condizioni vengono
// dalla Fase 2 — `quartiere.sblocco_data` e `finestre-dungeon.json` — valutate con `ordineGioco`,
// la stessa funzione del resto dell'app. Senza partita si vede tutto, e lo si dice.
//
// **Posizioni e tracciati sono autorati**, e sta scritto in `collocazioneTokyo.ts`: nel foglio del
// gioco non ci sono, e le «tratte» di `metropolitana.json` sono raggiungibilità, non binari.
// ============================================================

import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import type { DungeonRiassuntoDto, QuartiereRiassuntoDto } from '../../types';
import { dentroFinestra, quartiereAperto } from './aperturaTokyo';
import {
  COVO_TOKYO, LINEE_TOKYO, QUARTIERI_TOKYO, RADICI_TOKYO, SENZA_SCHEDA_TOKYO, type Collocazione,
} from './collocazioneTokyo';
import { assetPalazzo, assetTokyoQuartiere, nascondiSagomaAssente } from './assetTokyo';

/** Il contorno che segue la sagoma, non un riquadro: quattro ombre portate sull'alfa.
 *
 * Bianco a riposo, oro quando ci passi sopra. L'oro non e' decorazione: su una mappa fatta di
 * sagome accostate serve capire **quale** si sta per aprire, e un semplice ingrandimento non
 * basta quando due cartellini si sfiorano. */
function contorno(colore: string, spessore = 1) {
  const o = [`${spessore}px 0`, `-${spessore}px 0`, `0 ${spessore}px`, `0 -${spessore}px`];
  return o.map((d) => `drop-shadow(${d} 0 ${colore})`).join(' ') + ' drop-shadow(0 2px 3px rgba(0,0,0,0.5))';
}

const CONTORNO = contorno('#fff');
const CONTORNO_ORO = contorno('#ffd23f', 2) + ' brightness(1.05)';

interface Props {
  quartieri: QuartiereRiassuntoDto[];
  dungeon?: DungeonRiassuntoDto[];
  /** Data della partita in MM-GG. Senza, si mostra il mondo intero. */
  dataGioco?: string | null;
  /** La chiave accesa: si illumina d'oro e passa davanti alle vicine. La stessa che accende la
   *  scheda corrispondente, perché mappa e schede sono **una** selezione vista in due modi. */
  evidenziato?: string | null;
  onEvidenzia?: (chiave: string | null) => void;
  className?: string;
}


/** Sulla targa va il nome, non la qualifica.
 *
 * «Palazzo di Okumura» è una targa larga il doppio di «Okumura», e su una mappa la larghezza è
 * spazio tolto ai vicini: nove targhe così, in fila, si accavallavano fra loro e sopra i
 * quartieri. Il nome per intero resta nel `title` e nella scheda, dove non costa niente. */
function nomeSullaTarga(nome: string): string {
  return nome.replace(/^(Palazzo|Dedalo) di /, '');
}

interface Segno {
  chiave: string;
  /** Per il `title` e per il testo alternativo: quello lungo. */
  nome: string;
  /** Sulla targa: quello corto. */
  targa: string;
  /** L'indirizzo del disegno, già risolto: `assetTokyoQuartiere` o `assetPalazzo`. */
  src: string;
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
function Cartellino({ s, acceso, onEvidenzia }: { s: Segno; acceso: boolean; onEvidenzia?: (k: string | null) => void }) {
  const filtro = acceso ? CONTORNO_ORO : CONTORNO;
  // I cartellini si sfiorano: senza alzarlo, quello illuminato d'oro finisce sotto al vicino e
  // il bordo si vede a metà. `z-30` lo porta davanti, e la targa con lui.
  return <Link
    to={s.href}
    className={`group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center no-underline hover:z-30 ${acceso ? 'z-30' : 'z-10'}`}
    style={{ left: `${s.dove.x}%`, top: `${s.dove.y}%`, width: `${s.dove.scala}%` }}
    title={s.quando ? `${s.nome} — ${s.quando}` : s.nome}
    onMouseEnter={() => onEvidenzia?.(s.chiave)}
    onMouseLeave={() => onEvidenzia?.(null)}
    onFocus={() => onEvidenzia?.(s.chiave)}
    onBlur={() => onEvidenzia?.(null)}
  >
    <img src={s.src} alt="" aria-hidden onError={nascondiSagomaAssente}
      className={`w-full object-contain transition-transform duration-150 group-hover:scale-[1.18] ${acceso ? 'scale-[1.18]' : ''}`}
      style={{ filter: filtro }} />
    {/* Due cose, e tutte e due servono a non far toccare le targhe fra loro.
        **Va a capo**: restava su una riga sola, e «Odaiba / Seaside Park» occupava un quinto della
        tela — su una mappa la larghezza è spazio tolto ai vicini.
        **Il corpo è in `cqw`, cioè in frazioni della tela**, non in pixel a scaglioni. Con una
        misura fissa la targa cresceva *in proporzione* quando la tela si stringeva, e a 780 px
        tornavano dodici sovrapposizioni che a 1020 px non c'erano: una collocazione buona a una
        larghezza e sbagliata all'altra. Legandola alla tela, le proporzioni non cambiano più e una
        sola tabella di posizioni vale a ogni larghezza. */}
    <span className={`-mt-[6%] w-max max-w-[7em] text-center rounded-[2px] border-2 px-[0.5em] py-[0.12em] font-display text-[1.65cqw] uppercase leading-[1.05] tracking-[0.05em] shadow-[0_2px_6px_rgba(0,0,0,0.7)] group-hover:border-[#ffd23f] group-hover:text-[#ffd23f] ${
      s.palazzo ? 'bg-[#8b0000]' : 'bg-black'} ${
      acceso ? 'border-[#ffd23f] text-[#ffd23f]' : 'border-white text-white'}`}>{s.targa}</span>
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

export function MappaTokyo({ quartieri, dungeon = [], dataGioco, evidenziato, onEvidenzia, className = '' }: Props) {
  const { presenti, assenti, nomiFermate } = useMemo(() => {
    const segni: Segno[] = [];
    for (const q of quartieri) {
      const dove = QUARTIERI_TOKYO[q.chiave];
      if (!dove) continue;
      segni.push({
        chiave: q.chiave, nome: q.nome, targa: q.nome, src: assetTokyoQuartiere(q.chiave), dove, palazzo: false,
        // Si entra **nella mappa** del quartiere, non nella sua scheda: da una mappa si passa a
        // una mappa. Il risolutore resta il ripiego per i pochi che non hanno un nodo proprio.
        href: q.mappaChiave
          ? `/guida/mappe/${encodeURIComponent(q.mappaChiave)}`
          : `/guida/mondo/quartiere/${encodeURIComponent(q.chiave)}`,
        presente: quartiereAperto(q.sbloccoData, dataGioco),
        quando: q.sbloccoData ? `dal ${q.sbloccoData}` : null,
      });
    }
    for (const d of dungeon) {
      const dove = RADICI_TOKYO[`dungeon-${d.chiave}`];
      if (!dove) continue;
      const f = d.finestra;
      segni.push({
        chiave: `dungeon-${d.chiave}`, nome: d.nome, targa: nomeSullaTarga(d.nome),
        // I Palazzi non stanno nel foglio della mappa di viaggio — nel gioco lì non compaiono — e
        // tengono la loro illustrazione, che l'utente ha chiesto di lasciare com'è.
        src: assetPalazzo(d.chiave), dove, palazzo: true,
        href: `/guida/mondo/dungeon/${encodeURIComponent(d.chiave)}`,
        presente: !dataGioco || !f || dentroFinestra(dataGioco, f.dal, f.al),
        quando: f ? (f.al ? `dal ${f.dal} al ${f.al}` : `dal ${f.dal}`) : null,
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
  }, [quartieri, dungeon, dataGioco]);

  return <div className={`flex flex-col gap-2 ${className}`}>
    {/* Sotto una certa larghezza la mappa non si stringe: si scorre.
        Rimpicciolirla ancora avrebbe fatto due danni insieme — targhe illeggibili e figure grandi
        come un'unghia — per stare dentro uno schermo che comunque non le contiene. Un atlante di
        carta lo si sposta sotto gli occhi, e su un telefono è quel che si fa: 680 px di minimo, e
        il dito scorre. Le proporzioni restano le stesse del desktop, quindi la collocazione
        verificata vale anche qui. */}
    <div className="w-full overflow-x-auto">
    <div
      className="relative w-full min-w-[680px] overflow-hidden rounded-lg [container-type:inline-size]"
      style={{ aspectRatio: '10 / 7', background: '#e2001a' }}
      role="img"
      aria-label={`Mappa di Tokyo con ${presenti.length} luoghi raggiungibili`}
    >
      {/* Le macchie più scure sono la terraferma, come nella schermata del gioco: danno un fondo
          alla rete invece di lasciarla galleggiare su un rosso piatto. */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden className="absolute inset-0 h-full w-full">
        <path fill="#c00016" d="M14 22 L36 8 L58 12 L76 20 L88 34 L84 52 L92 62 L74 80 L52 78 L34 88 L16 66 L8 44 Z" />
        <path fill="#cc0a1c" d="M26 34 L46 26 L62 36 L58 56 L40 66 L26 56 Z" />
      </svg>
      <Rete nomi={nomiFermate} />
      {presenti.map((s) => <Cartellino key={s.chiave} s={s} acceso={evidenziato === s.chiave} onEvidenzia={onEvidenzia} />)}
      <Link to="/guida/completamento"
        className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-[2px] border-2 bg-black px-[0.5em] py-[0.12em] font-display text-[1.65cqw] uppercase leading-[1.05] tracking-[0.05em] no-underline shadow-[0_2px_8px_rgba(0,0,0,0.7)] hover:border-[#ffd23f] hover:text-[#ffd23f] ${
          evidenziato === 'covo' ? 'border-[#ffd23f] text-[#ffd23f]' : 'border-white text-white'}`}
        style={{ left: `${COVO_TOKYO.x}%`, top: `${COVO_TOKYO.y}%` }}
        onMouseEnter={() => onEvidenzia?.('covo')} onMouseLeave={() => onEvidenzia?.(null)}
        onFocus={() => onEvidenzia?.('covo')} onBlur={() => onEvidenzia?.(null)}
        title="Covo dei Ladri — la soffitta del Leblanc">Covo dei Ladri</Link>
    </div>
    </div>
    {dataGioco && assenti.length > 0 && <p className="m-0 text-[12px] text-text-muted">
      {/* Non spariscono e basta: si dice quali e da quando, altrimenti la mappa sembra incompleta
          invece che aggiornata al giorno della partita. */}
      Non ancora nel mondo il {dataGioco}: {assenti.map((s) => `${s.nome} (${s.quando ?? '—'})`).join(' · ')}
    </p>}
    {!dataGioco && <p className="m-0 text-[12px] text-text-muted">
      Nessuna partita attiva: la mappa mostra il mondo intero, quartieri e Palazzi compresi.
    </p>}
  </div>;
}
