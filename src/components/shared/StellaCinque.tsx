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
import { CENTRO, RAGGIO, RAGGIO_ETICHETTE, arrotonda, poligonoStella, puntoStella } from './stellaGeometria';

export interface AsseStella {
  chiave: string;
  etichetta: string;
  /** Valore normalizzato fra 0 e 1. */
  valore: number;
  /** Testo sotto l'etichetta (es. «Rango 3», «42»). */
  testo?: ReactNode;
  /** Asset predefinito del badge al vertice (es. `doti/coraggio-senza-testo`), con riserva sull'etichetta. */
  badge?: string;
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
export function StellaCinque({ assi, dimensione = 320, livelli = 5, onScegli, selezionato = null, etichettaAria, animato = true, className }: Props) {
  const n = Math.max(3, assi.length);
  const valori = useValoriAnimati(assi.map((a) => limita(a.valore)), animato);
  const anelli = Array.from({ length: livelli }, (_, k) => poligonoStella(Array.from({ length: n }, () => (RAGGIO * (k + 1)) / livelli)));
  const raggiValori = assi.map((_, i) => RAGGIO * (valori[i] ?? 0));
  const descrizione = assi.map((a) => `${a.etichetta}: ${Math.round(limita(a.valore) * 100)}%`).join(', ');

  return (
    <div className={`relative select-none ${className ?? ''}`} style={{ width: dimensione, height: dimensione, maxWidth: '100%' }}>
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
        const [x, y] = puntoStella(i, n, RAGGIO_ETICHETTE);
        const stile = { left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' } as const;
        const contenuto = (
          <>
            <AssetImg nome={a.badge ?? null} alt="" decorativa className="h-7 w-auto max-w-[96px] object-contain drop-shadow" fallback={<span className="text-[12px] font-semibold uppercase tracking-wide">{a.etichetta}</span>} />
            {a.testo !== undefined && <span className="text-[11px] text-text-secondary leading-tight">{a.testo}</span>}
          </>
        );
        const classi = `absolute flex flex-col items-center gap-0.5 text-center whitespace-nowrap ${selezionato === a.chiave ? 'text-primary' : 'text-text'}`;
        return onScegli ? (
          <button key={a.chiave} type="button" className={`${classi} touch bg-transparent border-0 p-1 cursor-pointer`} style={stile} onClick={() => onScegli(a.chiave)} aria-pressed={selezionato === a.chiave} aria-label={a.etichetta}>
            {contenuto}
          </button>
        ) : (
          <span key={a.chiave} className={classi} style={stile} aria-hidden="true">
            {contenuto}
          </span>
        );
      })}
    </div>
  );
}
