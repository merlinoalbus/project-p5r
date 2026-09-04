// ============================================================
// StellaCinque — grafico a stella (radar) a N assi in SVG, animato e interattivo
// ============================================================
//
// Usato per le Doti sociali (5 ranghi) e per le statistiche delle Persona (5 valori). La geometria è
// disegnata in codice (nitida a ogni dimensione); ai vertici stanno etichette HTML con badge dagli asset
// (`badge`) e riserva testuale. I valori sono normalizzati fra 0 e 1 e animati con requestAnimationFrame
// (nessuna animazione se il sistema chiede movimento ridotto o se `animato` è false).
// ============================================================

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AssetImg } from './AssetImg';
import { CENTRO, RAGGIO, arrotonda, poligonoStella, puntoStella } from './stellaGeometria';

/** Di quanto (px) il bordo interno della targhetta supera la punta del vertice verso il centro: la targhetta copre la punta. */
const SOVRAPPOSIZIONE = 14;

export interface AsseStella {
  chiave: string;
  etichetta: string;
  /** Valore normalizzato fra 0 e 1. */
  valore: number;
  /** Testo sotto l'etichetta (es. «Rango 3», «42»). */
  testo?: ReactNode;
  /** Asset predefinito del badge al vertice (es. `doti/coraggio-senza-testo`), con riserva sull'etichetta. */
  badge?: string;
  /** Asset grafico sotto il badge (es. tassello del rango `ui/rango-3`), con riserva sul testo. */
  badgeSotto?: string;
}

interface Props {
  assi: AsseStella[];
  /** Lato del riquadro in px (default 320). */
  dimensione?: number;
  /** Anelli della griglia (default 5). */
  livelli?: number;
  /** Se presente i vertici sono pulsanti. */
  onScegli?: (chiave: string) => void;
  selezionato?: string | null;
  etichettaAria: string;
  animato?: boolean;
  /** Altezza in px del badge ai vertici (default 28). */
  badgeAltezza?: number;
  className?: string;
}

const limita = (v: number): number => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

function preferisceMovimentoRidotto(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Interpola i valori verso il bersaglio in ~450 ms (ease-out) dentro requestAnimationFrame; senza animazione
 * (preferenza di sistema, `animato` false, ambiente senza rAF) restituisce direttamente il bersaglio.
 */
function useValoriAnimati(bersaglio: number[], animato: boolean): number[] {
  const attivo = animato && !preferisceMovimentoRidotto() && typeof requestAnimationFrame === 'function';
  const [animati, setAnimati] = useState<number[]>(() => bersaglio.map(() => 0));
  const correnti = useRef(animati);
  const chiave = bersaglio.join('|');
  useEffect(() => {
    if (!attivo) return;
    const partenza = correnti.current.length === bersaglio.length ? correnti.current : bersaglio.map(() => 0);
    const inizio = performance.now();
    let richiesta = 0;
    const passo = (ora: number) => {
      const t = Math.min(1, (ora - inizio) / 450);
      const e = 1 - Math.pow(1 - t, 3);
      const nuovi = bersaglio.map((b, i) => partenza[i] + (b - partenza[i]) * e);
      correnti.current = nuovi;
      setAnimati(nuovi);
      if (t < 1) richiesta = requestAnimationFrame(passo);
    };
    richiesta = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(richiesta);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- la chiave riassume il bersaglio
  }, [chiave, attivo]);
  return attivo ? animati : bersaglio;
}

/** Radar a N assi con griglia, poligono dei valori e vertici etichettati (badge o testo). */
export function StellaCinque({ assi, dimensione = 320, livelli = 5, onScegli, selezionato = null, etichettaAria, animato = true, badgeAltezza = 28, className }: Props) {
  const n = Math.max(3, assi.length);
  const valori = useValoriAnimati(assi.map((a) => limita(a.valore)), animato);
  const anelli = Array.from({ length: livelli }, (_, k) => poligonoStella(Array.from({ length: n }, () => (RAGGIO * (k + 1)) / livelli)));
  const raggiValori = assi.map((_, i) => RAGGIO * (valori[i] ?? 0));
  const descrizione = assi.map((a) => `${a.etichetta}: ${Math.round(limita(a.valore) * 100)}%`).join(', ');
  const altezzaBadge = `${arrotonda((badgeAltezza / dimensione) * 100)}cqw`;

  return (
    <div className={`relative select-none ${className ?? ''}`} style={{ width: dimensione, maxWidth: '100%', aspectRatio: '1 / 1', containerType: 'inline-size' }}>
      <svg viewBox="0 0 100 100" className="block w-full h-full overflow-visible" role="img" aria-label={`${etichettaAria}: ${descrizione}`}>
        {anelli.map((p, k) => (
          <polygon key={k} points={p} fill={k === livelli - 1 ? 'rgba(255,255,255,0.03)' : 'none'} stroke={k === livelli - 1 ? 'var(--color-text-muted)' : 'var(--color-border)'} strokeWidth={k === livelli - 1 ? 0.6 : 0.35} />
        ))}
        {assi.map((a, i) => {
          const [x, y] = puntoStella(i, n, RAGGIO);
          return <line key={a.chiave} x1={CENTRO} y1={CENTRO} x2={arrotonda(x)} y2={arrotonda(y)} stroke="var(--color-border)" strokeWidth={0.35} />;
        })}
        <polygon points={poligonoStella(raggiValori)} fill="var(--color-primary)" fillOpacity={0.38} stroke="var(--color-primary)" strokeWidth={1.1} strokeLinejoin="round" data-testid="stella-valori" />
        {assi.map((a, i) => {
          const [x, y] = puntoStella(i, n, raggiValori[i] ?? 0);
          const attivo = selezionato === a.chiave;
          return <circle key={a.chiave} cx={arrotonda(x)} cy={arrotonda(y)} r={attivo ? 2.2 : 1.5} fill={attivo ? '#fff' : 'var(--color-primary)'} stroke="var(--color-bg)" strokeWidth={0.5} />;
        })}
      </svg>
      {assi.map((a, i) => {
        // Etichetta ancorata al vertice reale del poligono: il bordo della targhetta rivolto al centro tocca il vertice (più un
        // piccolo margine) e la targhetta si estende verso l'esterno lungo l'asse, così la verticale non si allontana e le laterali
        // non coprono il pentagono. dx/dy sono la direzione centro → vertice (−1…1).
        const [x, y] = puntoStella(i, n, RAGGIO);
        const dx = (x - CENTRO) / RAGGIO;
        const dy = (y - CENTRO) / RAGGIO;
        // La targhetta «incappuccia» il vertice: il suo bordo interno passa SOVRAPPOSIZIONE px oltre la punta, verso il centro.
        const stile = { left: `${arrotonda(x)}%`, top: `${arrotonda(y)}%`, transform: `translate(calc(-50% + ${arrotonda(dx * 50)}% - ${arrotonda(dx * SOVRAPPOSIZIONE)}px), calc(-50% + ${arrotonda(dy * 50)}% - ${arrotonda(dy * SOVRAPPOSIZIONE)}px))` } as const;
        // Il tassello del rango sta sempre sul lato esterno (lontano dal centro): angolo destro/sinistro e alto/basso secondo dx/dy.
        const angoloTassello = { [dx >= 0 ? 'right' : 'left']: `calc(${altezzaBadge} * -0.22)`, [dy < 0 ? 'top' : 'bottom']: `calc(${altezzaBadge} * -0.2)` } as const;
        // Il badge scala con la larghezza reale del riquadro (unità di contenitore): stessa proporzione su ogni schermo.
        const contenuto = (
          <>
            <span className="relative inline-block">
              <AssetImg nome={a.badge ?? null} alt="" decorativa className="block w-auto object-contain drop-shadow" style={{ height: altezzaBadge, maxWidth: `calc(${altezzaBadge} * 2.6)` }} fallback={<span className="text-[12px] font-semibold uppercase tracking-wide">{a.etichetta}</span>} />
              {a.badgeSotto && (
                <AssetImg nome={a.badgeSotto} alt="" decorativa className="absolute w-auto object-contain drop-shadow" style={{ height: `calc(${altezzaBadge} * 0.66)`, ...angoloTassello }} fallback={a.testo !== undefined ? <span className="absolute chip chip--attivo text-[10px] leading-none py-0.5 px-1.5" style={{ [dx >= 0 ? 'right' : 'left']: -4, [dy < 0 ? 'top' : 'bottom']: -8 }}>{a.testo}</span> : null} />
              )}
            </span>
            {!a.badgeSotto && a.testo !== undefined && <span className="chip chip--attivo text-[11px] leading-none py-0.5 px-2">{a.testo}</span>}
          </>
        );
        // Nome dell'asse in un suggerimento al passaggio del mouse (o al fuoco): i badge sono icone senza testo.
        const classi = `absolute flex flex-col items-center gap-0.5 text-center whitespace-nowrap con-suggerimento ${selezionato === a.chiave ? 'text-primary' : 'text-text'}`;
        return onScegli ? (
          <button key={a.chiave} type="button" className={`${classi} touch bg-transparent border-0 p-0 cursor-pointer`} style={stile} onClick={() => onScegli(a.chiave)} aria-pressed={selezionato === a.chiave} aria-label={a.etichetta} title={a.etichetta} data-suggerimento={a.etichetta}>
            {contenuto}
          </button>
        ) : (
          <span key={a.chiave} className={classi} style={stile} aria-hidden="true" title={a.etichetta} data-suggerimento={a.etichetta} tabIndex={-1}>
            {contenuto}
          </span>
        );
      })}
    </div>
  );
}
