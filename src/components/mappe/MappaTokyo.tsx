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
// Quel che la rende una guida e non un poster è il **tempo**. L'11 aprile Shinjuku non c'è — apre
// il 18 giugno — e la Yamanote non ci arriva: la linea si spezza invece di passare per il vuoto,
// perché disegnare quel tratto direbbe che si può prendere un treno per un posto che non esiste.
// Il Palazzo di Kamoshida c'è dal 12 aprile al 2 maggio e poi sparisce. Le condizioni vengono
// dalla Fase 2 — `quartiere.sblocco_data` e `finestre-dungeon.json` — valutate con `ordineGioco`,
// la stessa funzione del resto dell'app. Senza partita si vede tutto, e lo si dice.
//
// **Posizioni e tracciati sono autorati**, e sta scritto in `collocazioneTokyo.ts`: nel foglio del
// gioco non ci sono, e le «tratte» di `metropolitana.json` sono raggiungibilità, non binari.
// ============================================================

import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { ordineGioco } from '../../../shared/condizioniSpillo';
import type { DungeonRiassuntoDto, QuartiereRiassuntoDto } from '../../types';
import {
  COVO_TOKYO, LINEE_TOKYO, QUARTIERI_TOKYO, RADICI_TOKYO, SENZA_SCHEDA_TOKYO, type Collocazione,
} from './collocazioneTokyo';

const BASE = '/asset/mappe/lmap/tokyo';

/** Il contorno bianco che segue la sagoma, non un riquadro: quattro ombre portate sull'alfa. */
const CONTORNO = 'drop-shadow(1px 0 0 #fff) drop-shadow(-1px 0 0 #fff) drop-shadow(0 1px 0 #fff) '
  + 'drop-shadow(0 -1px 0 #fff) drop-shadow(0 2px 3px rgba(0,0,0,0.5))';

interface Props {
  quartieri: QuartiereRiassuntoDto[];
  dungeon?: DungeonRiassuntoDto[];
  /** Data della partita in MM-GG. Senza, si mostra il mondo intero. */
  dataGioco?: string | null;
  className?: string;
}

function dentro(oggi: string, dal: string, al: string | null): boolean {
  const g = ordineGioco(oggi);
  return g >= ordineGioco(dal) && (!al || g <= ordineGioco(al));
}

interface Segno {
  chiave: string;
  nome: string;
  png: string;
  /** Immagine di ripiego se il disegno originale non esiste per questo luogo. */
  ripiego: string;
  dove: Collocazione;
  /** Vuoto per le fermate che la guida non ha come scheda: restano cartellini, non collegamenti. */
  href: string;
  presente: boolean;
  quando: string | null;
  /** Un Palazzo si distingue: la targa è rossa invece che nera. */
  palazzo: boolean;
}

function Cartellino({ s }: { s: Segno }) {
  const contenuto = <>
    <img src={`${BASE}/${s.png}`} alt="" aria-hidden
      onError={(e) => {
        const im = e.currentTarget;
        if (im.dataset.ripiego || !s.ripiego) { im.style.visibility = 'hidden'; return; }
        im.dataset.ripiego = '1';
        im.src = s.ripiego;
      }}
      className="w-full object-contain transition-transform group-hover:scale-110"
      style={{ filter: CONTORNO }} />
    <span className={`-mt-[8%] whitespace-nowrap rounded-[2px] border border-white px-[0.4em] py-[0.05em] text-[7px] font-bold uppercase leading-tight tracking-wide text-white shadow-[0_1px_4px_rgba(0,0,0,0.6)] sm:text-[9px] ${
      s.palazzo ? 'bg-[#8b0000]' : 'bg-black'}`}>{s.nome}</span>
  </>;
  const classe = 'group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center no-underline';
  const stile = { left: `${s.dove.x}%`, top: `${s.dove.y}%`, width: `${s.dove.scala}%` };
  const titolo = s.quando ? `${s.nome} — ${s.quando}` : s.nome;
  // Portare a una pagina vuota è peggio che non portare da nessuna parte: le fermate senza scheda
  // restano cartellini.
  return s.href
    ? <Link to={s.href} className={classe} style={stile} title={titolo}>{contenuto}</Link>
    : <div className={classe} style={stile} title={titolo}>{contenuto}</div>;
}

/** Le linee, con le fermate a pallino. Una fermata che oggi non c'è spezza la linea. */
function Rete({ visibili }: { visibili: Set<string> }) {
  const spezzoni = LINEE_TOKYO.flatMap((linea) => {
    const giro = linea.anello ? [...linea.fermate, linea.fermate[0]] : linea.fermate;
    const pezzi: string[][] = [];
    let corrente: string[] = [];
    for (const f of giro) {
      if (visibili.has(f) && QUARTIERI_TOKYO[f]) corrente.push(f);
      else { if (corrente.length > 1) pezzi.push(corrente); corrente = []; }
    }
    if (corrente.length > 1) pezzi.push(corrente);
    return pezzi.map((pezzo, i) => ({
      chiave: `${linea.nome}-${i}`, colore: linea.colore, nome: linea.nome,
      nodi: pezzo.map((f) => QUARTIERI_TOKYO[f]),
      punti: pezzo.map((f) => QUARTIERI_TOKYO[f]).map((c) => `${c.x},${c.y}`).join(' '),
    }));
  });
  return <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden
    className="pointer-events-none absolute inset-0 h-full w-full">
    {/* Tre passate: il bordo scuro che stacca la linea dal fondo rosso, il colore, e i pallini
        delle fermate. È così che due linee incrociate restano leggibili senza disegnare gli
        incroci a mano. */}
    {spezzoni.map((s) => <polyline key={`b-${s.chiave}`} points={s.punti} fill="none"
      stroke="#1a0004" strokeWidth={13} strokeLinecap="round" strokeLinejoin="round"
      vectorEffect="non-scaling-stroke" />)}
    {spezzoni.map((s) => <polyline key={s.chiave} points={s.punti} fill="none"
      stroke={s.colore} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"><title>{s.nome}</title></polyline>)}
    {spezzoni.flatMap((s) => s.nodi.slice(1, -1).map((n, i) => <circle key={`f-${s.chiave}-${i}`}
      cx={n.x} cy={n.y} r={0.7} fill="#ffd23f" stroke="#1a0004" strokeWidth={0.2} />))}
  </svg>;
}

export function MappaTokyo({ quartieri, dungeon = [], dataGioco, className = '' }: Props) {
  const { presenti, assenti } = useMemo(() => {
    const segni: Segno[] = [];
    for (const q of quartieri) {
      const dove = QUARTIERI_TOKYO[q.chiave];
      if (!dove) continue;
      segni.push({
        chiave: q.chiave, nome: q.nome, png: `${q.chiave}.png`,
        ripiego: `/asset/mappe/citta-${q.chiave}.png`, dove, palazzo: false,
        href: `/guida/mondo/quartiere/${encodeURIComponent(q.chiave)}`,
        presente: !dataGioco || !q.sbloccoData || dentro(dataGioco, q.sbloccoData, null),
        quando: q.sbloccoData ? `dal ${q.sbloccoData}` : null,
      });
    }
    for (const d of dungeon) {
      const dove = RADICI_TOKYO[`dungeon-${d.chiave}`];
      if (!dove) continue;
      const f = d.finestra;
      segni.push({
        chiave: `dungeon-${d.chiave}`, nome: d.nome,
        // I Palazzi non stanno nel foglio della mappa di viaggio — nel gioco lì non compaiono — e
        // tengono la loro illustrazione, che l'utente ha chiesto di lasciare com'è.
        png: `../../../palazzi/${d.chiave}.png`, ripiego: '', dove, palazzo: true,
        href: `/guida/mondo/dungeon/${encodeURIComponent(d.chiave)}`,
        presente: !dataGioco || !f || dentro(dataGioco, f.dal, f.al),
        quando: f ? (f.al ? `dal ${f.dal} al ${f.al}` : `dal ${f.dal}`) : null,
      });
    }
    // Le fermate che il gioco ha e la guida no: ci sono sempre, e non portano da nessuna parte.
    for (const [chiave, nome] of Object.entries(SENZA_SCHEDA_TOKYO)) {
      const dove = QUARTIERI_TOKYO[chiave];
      if (!dove || segni.some((s) => s.chiave === chiave)) continue;
      segni.push({ chiave, nome, png: `${chiave}.png`, ripiego: '', dove, palazzo: false,
        href: '', presente: true, quando: null });
    }
    return { presenti: segni.filter((s) => s.presente), assenti: segni.filter((s) => !s.presente) };
  }, [quartieri, dungeon, dataGioco]);

  return <div className={`flex flex-col gap-2 ${className}`}>
    <div
      className="relative w-full overflow-hidden rounded-lg"
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
      <Rete visibili={new Set(presenti.map((s) => s.chiave))} />
      {presenti.map((s) => <Cartellino key={s.chiave} s={s} />)}
      <Link to="/guida/completamento"
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-[2px] border border-white bg-black px-1.5 py-0.5 text-[7px] font-bold uppercase text-white no-underline shadow-[0_2px_8px_rgba(0,0,0,0.6)] sm:text-[9px]"
        style={{ left: `${COVO_TOKYO.x}%`, top: `${COVO_TOKYO.y}%` }}
        title="Covo dei Ladri — la soffitta del Leblanc">Covo dei Ladri</Link>
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
