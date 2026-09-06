// ============================================================
// MappaMemento — l'imbuto che sprofonda, e i dedali che compaiono scendendo
// ============================================================
//
// I Memento non sono una città e non sono un elenco: sono **un imbuto**. Il gioco li disegna come
// un cratere che sprofonda sotto Tokyo — lo skyline nero tutto intorno, il terreno rosso solcato
// da crepe e attraversato da catene, e i dedali come grappoli di edifici che scendono a spirale
// verso il fondo, legati da un filo rosso. Questa è quella forma.
//
// **Il pezzo compare quando il dedalo si sblocca**, come ha chiesto l'utente: finché non lo si è
// aperto al suo posto c'è solo il punto sul filo, e il filo prosegue lo stesso — il pozzo c'è
// tutto dal principio, è la discesa che si guadagna.
//
// Le date dei singoli dedali **restano prosa**. Nel catalogo sono scritte come «Sblocco: 7 maggio
// (Sabato 5/07). Aver completato il Palazzo di Kamoshida», e la maggior parte non è nemmeno una
// data ma una condizione di storia: «Palazzo di Madarame completato». Ricavarne un giorno con
// un'espressione regolare vuol dire sbagliarne qualcuna in silenzio. Quindi non si indovina: la
// frase si mostra com'è, e a decidere se il pezzo c'è è la partita — quali Palazzi ha finito —
// non un'interpretazione del testo. Finché quel dato non è collegato, si mostrano tutti e si dice
// che si stanno mostrando tutti.
//
// Il fondo — il cratere, le crepe, le catene, lo skyline — è **disegnato qui**, non estratto: nel
// foglio degli sprite ci sono soltanto i livelli dell'effetto animato dell'ingresso (una nuvola,
// dei nastri, degli aloni), che qui fanno l'atmosfera e non la struttura.
// ============================================================

import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import type { AreaDungeonDto } from '../../types';

const BASE = '/asset/mappe/lmap/memento';

interface Props {
  aree: AreaDungeonDto[];
  /** Chiavi dei dedali già raggiunti. Vuoto o assente: si mostrano tutti, e lo si dice. */
  sbloccati?: Set<string>;
  className?: string;
}

/** La prima frase della descrizione: è lì che il catalogo scrive quando il dedalo si apre.
 *
 * Non si estrae una data, si taglia una frase: «2 Aree (Area 1 e Area 2) Sblocco: 7 maggio
 * (Sabato 5/07). Aver completato il Palazzo di Kamoshida…» → fino al primo punto. */
function primaFrase(testo: string | null | undefined): string {
  const t = (testo ?? '').trim();
  if (!t) return '';
  const punto = t.indexOf('. ');
  return punto > 0 ? t.slice(0, punto + 1) : t.length > 110 ? `${t.slice(0, 107)}…` : t;
}

/** La spirale della discesa: dal bordo largo in alto fino al fondo stretto.
 *
 * Il raggio si stringe e il passo si accorcia man mano che si scende: è quel che dà l'imbuto.
 * L'oscillazione laterale alterna i lati come nel disegno del gioco, dove i grappoli non cadono
 * in colonna ma si scostano a destra e a sinistra del filo. */
function puntoDellaDiscesa(i: number, quanti: number): { x: number; y: number; scala: number } {
  const t = quanti > 1 ? i / (quanti - 1) : 0;
  const raggio = 30 * (1 - t) ** 1.35;
  return {
    x: 50 + Math.sin(i * 2.1) * raggio,
    y: 10 + t * 82,
    scala: 20 - 9 * t,
  };
}

export function MappaMemento({ aree, sbloccati, className = '' }: Props) {
  const tappe = useMemo(() => aree.map((a, i) => ({
    area: a,
    dove: puntoDellaDiscesa(i, aree.length),
    aperto: !sbloccati || sbloccati.size === 0 || sbloccati.has(a.chiave),
  })), [aree, sbloccati]);
  const filo = tappe.map((t) => `${t.dove.x},${t.dove.y}`).join(' ');

  return <div className={`flex flex-col gap-2 ${className}`}>
    <div className="relative w-full overflow-hidden rounded-lg bg-[#7a0010]" style={{ aspectRatio: '4 / 3' }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden className="absolute inset-0 h-full w-full">
        <defs>
          {/* Il cratere: il rosso si scurisce verso il fondo, ed è quel che fa la profondità. */}
          <radialGradient id="memento-pozzo" cx="50%" cy="96%" r="86%">
            <stop offset="0%" stopColor="#ff4d2e" />
            <stop offset="18%" stopColor="#c40016" />
            <stop offset="55%" stopColor="#8d0011" />
            <stop offset="100%" stopColor="#5c000c" />
          </radialGradient>
        </defs>
        <rect width="100" height="100" fill="url(#memento-pozzo)" />
        {/* Gli anelli concentrici del cratere e le crepe che ne partono. */}
        {[74, 56, 40, 26, 14].map((r) => <ellipse key={r} cx="50" cy="96" rx={r} ry={r * 0.92}
          fill="none" stroke="#6d000d" strokeWidth="0.5" opacity="0.75" />)}
        {Array.from({ length: 13 }, (_, i) => {
          const ang = Math.PI + (i / 12) * Math.PI;
          return <line key={i} x1="50" y1="96" x2={50 + Math.cos(ang) * 95} y2={96 + Math.sin(ang) * 95}
            stroke="#ff2d16" strokeWidth={i % 3 === 0 ? 0.55 : 0.28} opacity="0.6" />;
        })}
      </svg>

      {/* Lo skyline nero: la città che sta sopra, che dal pozzo si vede solo come profilo. */}
      <svg viewBox="0 0 100 22" preserveAspectRatio="none" aria-hidden className="absolute inset-x-0 top-0 h-[16%] w-full">
        <path fill="#0a0006" d={`M0 22 V8 ${Array.from({ length: 34 }, (_, i) => {
          const x = i * 3; const h = 4 + ((i * 7) % 9);
          return `H${x} V${12 - h} H${x + 1.7} V${8 + ((i * 5) % 5)}`;
        }).join(' ')} H100 V0 H0 Z`} />
      </svg>

      {/* Il filo rosso che lega i dedali: il pozzo c'è tutto, anche dove non si è ancora scesi. */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full">
        <polyline points={filo} fill="none" stroke="#1a0004" strokeWidth={5}
          strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <polyline points={filo} fill="none" stroke="#ff2d16" strokeWidth={2.5}
          strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {tappe.filter((t) => !t.aperto).map((t) => <circle key={t.area.chiave}
          cx={t.dove.x} cy={t.dove.y} r={1.1} fill="#3a0008" stroke="#ff2d16" strokeWidth={0.35} />)}
      </svg>

      {/* L'atmosfera del gioco: la texture di rumore e gli aloni della terza texture del foglio. */}
      <img src={`${BASE}/trama-elemento.png`} alt="" aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.07] mix-blend-overlay" />
      <img src={`${BASE}/luce-nuova-elemento.png`} alt="" aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/2 w-[60%] -translate-x-1/2 translate-y-1/4 opacity-40" />

      {tappe.filter((t) => t.aperto).map((t) => <Link
        key={t.area.chiave}
        to={`/guida/mondo/area/${encodeURIComponent(t.area.chiave)}`}
        className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center no-underline"
        style={{ left: `${t.dove.x}%`, top: `${t.dove.y}%`, width: `${t.dove.scala}%` }}
        title={primaFrase(t.area.descrizione) || t.area.nome}
      >
        <span className="whitespace-nowrap rounded-[2px] border border-white bg-black px-[0.45em] py-[0.1em] font-display text-[8px] uppercase leading-tight tracking-[0.04em] text-white shadow-[0_2px_6px_rgba(0,0,0,0.7)] transition-colors group-hover:border-[#ffd23f] group-hover:text-[#ffd23f] sm:text-[10px]">
          {t.area.nome.replace(/^Dedalo di /, '')}
        </span>
      </Link>)}
    </div>

    <p className="m-0 text-[12px] text-text-muted">
      I Memento si aprono il 9 maggio e restano aperti. Ogni dedalo però si guadagna con la storia
      — «Palazzo di Madarame completato», non una data — e finché la partita non tiene quel conto
      la mappa li mostra tutti.
    </p>
    <ol className="m-0 grid list-none gap-1 p-0 sm:grid-cols-2" aria-label="I dedali dei Memento, dall’alto verso il basso">
      {aree.map((a, i) => <li key={a.chiave}>
        <Link to={`/guida/mondo/area/${encodeURIComponent(a.chiave)}`}
          className="flex items-baseline gap-2 rounded px-1 py-0.5 no-underline hover:bg-bg-tertiary">
          <span className="w-[1.7em] shrink-0 text-right font-display text-[14px] tabular-nums text-primary">
            {String(i + 1).padStart(2, '0')}
          </span>
          <span className="min-w-0">
            <span className="text-[13px] text-text">{a.nome}</span>
            <span className="block truncate text-[11px] text-text-muted">{primaFrase(a.descrizione)}</span>
          </span>
        </Link>
      </li>)}
    </ol>
  </div>;
}
