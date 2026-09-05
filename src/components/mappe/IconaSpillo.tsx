// ============================================================
// IconaSpillo — icona di uno spillo per tipo: asset `ui/spillo-<tipo>` (prompt §18) con riserva SVG in codice (Fase 13.2)
// ============================================================

import type { CSSProperties, ReactNode } from 'react';
import { AssetImg } from '../shared/AssetImg';
import { useAsset } from '../../stores/assetStore';
import type { TipoSpillo } from '../../../shared/spilli';

interface Props { tipo: TipoSpillo; dimensione?: number; className?: string }

function base(d: number) {
  return { width: d, height: d, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const };
}

/** Riserve SVG (tratto semplice, leggibile a 16–20 px) per tutti i tipi del registro. */
const RISERVA_SPILLO: Record<TipoSpillo, (d: number) => ReactNode> = {
  passaggio: (d) => <svg {...base(d)}><path d="M5 21V9a7 7 0 0 1 14 0v12" /><path d="M9 21v-6h6v6" /><path d="M12 6v4" /><path d="M10 8l2 2 2-2" /></svg>,
  negozio: (d) => <svg {...base(d)}><path d="M4 9l1.5-4h13L20 9" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></svg>,
  forziere: (d) => <svg {...base(d)}><rect x="3" y="8" width="18" height="12" rx="2" /><path d="M3 12h18" /><path d="M7 8V6a5 5 0 0 1 10 0v2" /><path d="M12 12v3" /></svg>,
  tesoro: (d) => <svg {...base(d)}><path d="M6 3h12l4 6-10 12L2 9z" /><path d="M2 9h20" /><path d="M9 3l3 6 3-6" /><path d="M9 9l3 12 3-12" /></svg>,
  'tesoro-palazzo': (d) => <svg {...base(d)}><path d="M4 18h16" /><path d="M5 18l-1.5-9 4.5 3.5L12 5l4 7.5 4.5-3.5L19 18z" /><path d="M12 9.5v.01" /></svg>,
  'seme-bramosia': (d) => <svg {...base(d)}><path d="M12 3l4 5-4 13-4-13z" /><path d="M8 8h8" /><path d="M4.5 5.5l1 1M19.5 5.5l-1 1" /></svg>,
  'oggetto-chiave': (d) => <svg {...base(d)}><circle cx="8" cy="8" r="4" /><path d="M11 11l9 9" /><path d="M17 17l2-2" /><path d="M14.5 14.5l2-2" /></svg>,
  boss: (d) => <svg {...base(d)}><path d="M4 8l3 2 5-6 5 6 3-2-2 9H6z" /><path d="M8 20h8" /><path d="M9 14h.01M15 14h.01" /></svg>,
  miniboss: (d) => <svg {...base(d)}><path d="M12 3a7 7 0 0 0-7 7v4h3v4h8v-4h3v-4a7 7 0 0 0-7-7z" /><path d="M9 11h.01M15 11h.01" /><path d="M10 18v3M14 18v3" /></svg>,
  nemico: (d) => <svg {...base(d)}><path d="M5 4l3 3M19 4l-3 3" /><path d="M12 5a7 7 0 0 0-7 7v3a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4v-3a7 7 0 0 0-7-7z" /><path d="M9 12l1.5 1.5M15 12l-1.5 1.5" /><path d="M10 18l2-2 2 2" /></svg>,
  'punto-sensibile': (d) => <svg {...base(d)}><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="1.6" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>,
  sicura: (d) => <svg {...base(d)}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></svg>,
  scorciatoia: (d) => <svg {...base(d)}><path d="M4 18L20 6" /><path d="M14 6h6v6" /><path d="M4 6l16 12" /><path d="M14 18h6v-6" /></svg>,
  confidente: (d) => <svg {...base(d)}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 5a3 3 0 0 1 0 6" /><path d="M17.5 14.5a5.5 5.5 0 0 1 4 5.5" /></svg>,
  dialogo: (d) => <svg {...base(d)}><path d="M4 5h16v11h-8l-5 4v-4H4z" /><path d="M8 10.5h.01M12 10.5h.01M16 10.5h.01" /></svg>,
  attivita: (d) => <svg {...base(d)}><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></svg>,
  ristorante: (d) => <svg {...base(d)}><path d="M4 9h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" /><path d="M16 11h2a2.5 2.5 0 0 1 0 5h-2" /><path d="M8 3v3M11 3v3" /></svg>,
  distributore: (d) => <svg {...base(d)}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 6h5v7H8z" /><path d="M15 7h1M15 10h1" /><path d="M8 17h8" /></svg>,
  treno: (d) => <svg {...base(d)}><rect x="5" y="3" width="14" height="14" rx="3" /><path d="M5 10h14" /><path d="M9 14h.01M15 14h.01" /><path d="M7 17l-2 4M17 17l2 4" /></svg>,
  nota: (d) => <svg {...base(d)}><path d="M6 4h9l4 4v12H6z" /><path d="M15 4v4h4" /><path d="M9 12h6M9 16h6" /></svg>,
  // ---- Città (15.24): sigaretta col fumo, rivista con lente, valigetta, vasca con vapori, lavatrice, ciak, libri, torii, joypad, casa ----
  sigarette: (d) => <svg {...base(d)}><rect x="3" y="13" width="15" height="4" rx="1" /><path d="M18 15h3" /><path d="M6 10c0-1.5 1.2-2 1.2-3.5M10 10c0-1.5 1.2-2 1.2-3.5" /><path d="M14 13v4" /></svg>,
  cercalavoro: (d) => <svg {...base(d)}><path d="M4 4h11v16H4z" /><path d="M7 8h5M7 11h5M7 14h3" /><circle cx="17" cy="16" r="3" /><path d="M19.2 18.2L22 21" /></svg>,
  lavoro: (d) => <svg {...base(d)}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M3 12h18" /><path d="M12 12v3" /></svg>,
  terme: (d) => <svg {...base(d)}><path d="M3 14h18a9 9 0 0 1-18 0z" /><path d="M8 4c-1.2 2 1.2 3 0 5M12 4c-1.2 2 1.2 3 0 5M16 4c-1.2 2 1.2 3 0 5" /></svg>,
  lavanderia: (d) => <svg {...base(d)}><rect x="4" y="3" width="16" height="18" rx="2" /><circle cx="12" cy="13" r="5" /><path d="M7 6h.01M10 6h.01" /><path d="M9 13.5a3 3 0 0 0 6 0" /></svg>,
  cinema: (d) => <svg {...base(d)}><rect x="3" y="9" width="18" height="11" rx="1" /><path d="M3 9l2-5h14l2 5" /><path d="M8 4l2 5M13 4l2 5" /></svg>,
  biblioteca: (d) => <svg {...base(d)}><path d="M4 4h4v16H4zM9 4h4v16H9z" /><path d="M13.5 5.5l4-1.2 3.5 14.5-4 1.2z" /><path d="M6 8h.01M11 8h.01" /></svg>,
  culto: (d) => <svg {...base(d)}><path d="M3 6h18" /><path d="M5 10h14" /><path d="M7 6v14M17 6v14" /><path d="M12 10v10" /><path d="M6 3l1 3M18 3l-1 3" /></svg>,
  'sala-giochi': (d) => <svg {...base(d)}><rect x="2" y="8" width="20" height="10" rx="4" /><path d="M7 11v4M5 13h4" /><path d="M15 12h.01M17.5 14h.01" /></svg>,
  casa: (d) => <svg {...base(d)}><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>,
  // ---- Palazzi e Mementos (15.24): timbro, leva, rampino, porta con serratura ----
  timbro: (d) => <svg {...base(d)}><path d="M12 3a3 3 0 0 0-3 3c0 2 1.5 3 1.5 5h3C13.5 9 15 8 15 6a3 3 0 0 0-3-3z" /><path d="M6 14h12v3H6z" /><path d="M5 20h14" /></svg>,
  meccanismo: (d) => <svg {...base(d)}><circle cx="12" cy="16" r="4" /><path d="M12 12V6" /><circle cx="12" cy="4.5" r="1.5" /><path d="M4 20h16" /><path d="M12 16h.01" /></svg>,
  rampino: (d) => <svg {...base(d)}><path d="M12 2v8" /><path d="M6 14a6 6 0 0 0 12 0" /><path d="M6 14l-2-3M18 14l2-3" /><path d="M9 14l3-4 3 4" /></svg>,
  porta: (d) => <svg {...base(d)}><rect x="5" y="3" width="14" height="18" rx="1" /><path d="M9 3v18" /><circle cx="14.5" cy="12" r="1.3" /><path d="M14.5 13.3V16" /></svg>,
};

/** Icona di uno spillo (asset quando consegnato, altrimenti riserva SVG). */
export function IconaSpillo({ tipo, dimensione = 20, className }: Props) {
  return <AssetImg nome={`ui/spillo-${tipo}`} alt="" decorativa className={className ?? 'object-contain'} style={{ width: dimensione, height: dimensione }} fallback={(RISERVA_SPILLO[tipo] ?? RISERVA_SPILLO.nota)(dimensione)} />;
}

/**
 * Spillo sulla mappa. Le immagini `ui/spillo-<tipo>` consegnate sono già uno spillo completo (forma e colore compresi):
 * quando l'asset c'è viene mostrato intero, con la punta sul punto ancorato; in sua assenza resta la goccia colorata
 * con il disegno di riserva al centro.
 */
export function SpilloGrafico({ tipo, colore, altezza = 40 }: { tipo: TipoSpillo; colore: string; altezza?: number }) {
  const url = useAsset(`ui/spillo-${tipo}`);
  if (url) return <img src={url} alt="" className="spillo-mappa__figura" style={{ height: altezza }} draggable={false} />;
  return (
    <span className="spillo-mappa__goccia" style={{ '--colore-spillo': colore } as CSSProperties}>
      {(RISERVA_SPILLO[tipo] ?? RISERVA_SPILLO.nota)(18)}
    </span>
  );
}

/** Pallino di legenda, elenco e popup: la stessa immagine dello spillo in piccolo, oppure il cerchio colorato col disegno. */
export function PuntoSpillo({ tipo, colore, grande }: { tipo: TipoSpillo; colore: string; grande?: boolean }) {
  const url = useAsset(`ui/spillo-${tipo}`);
  const dimensione = grande ? 20 : 12;
  if (url) return <img src={url} alt="" className={`spillo-mappa__punto-figura ${grande ? 'spillo-mappa__punto-figura--grande' : ''}`} draggable={false} />;
  return (
    <span className={`spillo-mappa__punto ${grande ? 'spillo-mappa__punto--grande' : ''}`} style={{ background: colore }} aria-hidden="true">
      {(RISERVA_SPILLO[tipo] ?? RISERVA_SPILLO.nota)(dimensione)}
    </span>
  );
}
