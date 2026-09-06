// ============================================================
// MappaMemento — il pozzo, montato con i pezzi del gioco
// ============================================================
//
// I Memento sono un imbuto che sprofonda sotto Tokyo, e il gioco lo disegna così: il cratere rosso
// con il centro in basso, gli anelli e le crepe che si irradiano, il profilo della città lungo il
// bordo, le catene, e i grappoli di città divelta stretti al centro che si assottigliano fino alla
// trivella del fondo.
//
// **Ogni pezzo è originale**, da `IT/FIELD/PANEL/MEMENTOS/MEMENTOS.SPD`: gli otto `第N層` sono i
// grappoli, `街並み` il profilo della città, `鎖` le catene, i `血管` («vasi sanguigni») le venature.
// Per un momento erano stati disegnati a mano e per i grappoli era già partito un prompt a Codex:
// erano lì da sempre. La regola che ne resta sta in `docs/grafica/fabbisogno.md`.
//
// **La mappa e le schede sono la stessa selezione.** I pezzi sono piccoli e non è comodo colpirli:
// il dedalo si sceglie dai pulsanti sopra, e qui si accende in oro quello scelto — o si sceglie di
// qui, e i pulsanti seguono. Non è un elenco in più: è la stessa cosa vista in due modi.
// ============================================================

import { useMemo } from 'react';
import type { AreaDungeonDto } from '../../types';
import { BASE_MEMENTO as BASE, STRATI_MEMENTO } from './stratiMemento';

interface Props {
  aree: AreaDungeonDto[];
  /** Il dedalo scelto: si accende in oro e passa davanti agli altri. */
  selezionata?: string | null;
  onSeleziona?: (chiave: string) => void;
  /** Chiavi dei dedali già raggiunti. Vuoto o assente: si mostrano tutti. */
  sbloccati?: Set<string>;
  className?: string;
}

/** Dove cade uno strato nella discesa.
 *
 * Stanno **stretti al centro e molto sovrapposti**: nel disegno del gioco occupano sì e no un
 * quarto della larghezza e formano una colonna unica che si assottiglia. Sparpagliarli sul rosso
 * fa sparire il pozzo e lascia nove disegni buttati sulla tela. */
function posaDelloStrato(i: number, quanti: number) {
  const t = quanti > 1 ? i / (quanti - 1) : 0;
  return {
    x: 50 + (i % 2 === 0 ? -1 : 1) * 4.5 * (1 - t * 0.85),
    y: 17 + t * 70,
    larghezza: 26 - 13 * t,
  };
}

export function MappaMemento({ aree, selezionata, onSeleziona, sbloccati, className = '' }: Props) {
  // L'ordine della discesa è quello del catalogo — Qimranut, Aiyatsbus, Chemdah, Kaitul,
  // Akzeriyyuth, Adyeshach, Sheriruth, Iweleth, Da'at — non quello in cui l'API li consegna. Su
  // una mappa che è una discesa, l'ordine *è* l'informazione: si impone, non si spera.
  const tappe = useMemo(() => [...aree]
    .sort((a, b) => a.ordine - b.ordine)
    .map((a, i, tutte) => ({
      area: a,
      strato: STRATI_MEMENTO[Math.min(i, STRATI_MEMENTO.length - 1)],
      posa: posaDelloStrato(i, tutte.length),
      aperto: !sbloccati || sbloccati.size === 0 || sbloccati.has(a.chiave),
    })), [aree, sbloccati]);

  return <div className={`relative w-full overflow-hidden rounded-lg bg-[#8d0012] ${className}`}
    style={{ aspectRatio: '16 / 10' }}>
    {/* Il cratere: centro in basso al centro, anelli concentrici e crepe che si irradiano su
        tutta la larghezza. È questa la forma della schermata del gioco. */}
    <svg viewBox="0 0 160 100" preserveAspectRatio="none" aria-hidden className="absolute inset-0 h-full w-full">
      <defs>
        <radialGradient id="memento-cratere" cx="50%" cy="100%" r="78%">
          <stop offset="0%" stopColor="#ff5a2a" />
          <stop offset="12%" stopColor="#d5001a" />
          <stop offset="45%" stopColor="#a30015" />
          <stop offset="100%" stopColor="#7a0010" />
        </radialGradient>
      </defs>
      <rect width="160" height="100" fill="url(#memento-cratere)" />
      {[118, 96, 76, 58, 42, 28, 16].map((r) => <ellipse key={r} cx="80" cy="100" rx={r} ry={r * 0.85}
        fill="none" stroke="#8c0011" strokeWidth="0.6" opacity="0.7" />)}
      {Array.from({ length: 17 }, (_, i) => {
        const ang = Math.PI + (i / 16) * Math.PI;
        return <line key={i} x1="80" y1="100" x2={80 + Math.cos(ang) * 150} y2={100 + Math.sin(ang) * 150}
          stroke="#ff3a1a" strokeWidth={i % 2 === 0 ? 0.55 : 0.3} opacity="0.55" />;
      })}
    </svg>

    <img src={`${BASE}/vena-lunga-elemento.png`} alt="" aria-hidden
      className="pointer-events-none absolute left-[26%] top-0 h-full w-auto opacity-60" />
    <img src={`${BASE}/vena-lunga-riflessa-elemento.png`} alt="" aria-hidden
      className="pointer-events-none absolute right-[25%] top-0 h-full w-auto opacity-60" />
    <img src={`${BASE}/vena-basso-destra-elemento.png`} alt="" aria-hidden
      className="pointer-events-none absolute bottom-[6%] right-[2%] w-[34%] opacity-45" />
    <img src={`${BASE}/catena-elemento.png`} alt="" aria-hidden
      className="pointer-events-none absolute -left-[6%] top-[10%] h-[95%] w-auto origin-top-left rotate-[62deg] opacity-80" />
    <img src={`${BASE}/catena-elemento.png`} alt="" aria-hidden
      className="pointer-events-none absolute -right-[6%] top-[12%] h-[95%] w-auto origin-top-right -rotate-[62deg] opacity-80" />
    <img src={`${BASE}/citta-sopra-elemento.png`} alt="" aria-hidden
      className="pointer-events-none absolute inset-x-0 -top-[1%] w-full" />

    {/* Gli strati. Si sovrappongono di proposito, quindi quello scelto deve passare davanti:
        altrimenti l'oro finisce sotto al successivo e si vede a metà. */}
    {tappe.map((t) => t.aperto && (() => {
      const scelto = t.area.chiave === selezionata;
      return <button
        key={t.area.chiave}
        type="button"
        aria-pressed={scelto}
        onClick={() => onSeleziona?.(t.area.chiave)}
        className={`group absolute -translate-x-1/2 -translate-y-1/2 border-0 bg-transparent p-0 ${scelto ? 'z-30' : 'z-10 hover:z-20'}`}
        style={{ left: `${t.posa.x}%`, top: `${t.posa.y}%`, width: `${t.posa.larghezza}%` }}
        title={t.area.nome}
      >
        <img src={`${BASE}/${t.strato}-elemento.png`} alt={t.area.nome}
          className={`w-full transition-transform duration-150 ${
            scelto
              ? 'scale-[1.12] drop-shadow-[0_0_12px_rgba(255,210,63,0.95)]'
              : 'drop-shadow-[0_3px_8px_rgba(0,0,0,0.6)] group-hover:scale-[1.06] group-hover:drop-shadow-[0_0_10px_rgba(255,210,63,0.7)]'
          }`} />
        {scelto && <span className="pointer-events-none absolute left-1/2 top-full -translate-x-1/2 -translate-y-1 whitespace-nowrap rounded-[2px] border-2 border-[#ffd23f] bg-black px-[0.5em] py-[0.12em] font-display text-[11px] uppercase leading-none tracking-[0.05em] text-[#ffd23f] shadow-[0_2px_8px_rgba(0,0,0,0.8)] sm:text-[14px]">
          {t.area.nome.replace(/^Dedalo di /, '')}
        </span>}
      </button>;
    })())}
  </div>;
}
