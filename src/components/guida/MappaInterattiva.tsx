// ============================================================
// MappaInterattiva — immagine della mappa (importata dall'utente) con zoom/trascinamento e spilli dei punti di interesse (Fase 7.1)
// ============================================================
//
// Coordinate degli spilli in percentuale dell'immagine, così restano valide a ogni zoom e su ogni schermo.
// Modalità «posiziona»: un tocco sulla mappa fissa lo spillo del punto selezionato.
// ============================================================

import { useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { COLORE_TIPO, NOME_TIPO } from '../../utils/dungeon';
import type { PuntoInteresseDto } from '../../types';

/** Elemento posizionabile sulla mappa (punto di interesse di un dungeon o luogo della città). */
export interface PuntoMappa {
  chiave: string;
  nome: string;
  tipo: string;
  /** Gestito (ottenuto/esaurito): mostrato in trasparenza o nascosto. */
  stato: string | null;
  marcatore: { x: number; y: number } | null;
}

interface Props {
  /** URL dell'immagine della mappa (importata dall'utente). */
  src: string;
  punti: PuntoMappa[] | PuntoInteresseDto[];
  /** Etichette e colori per tipo (default: tipi dei dungeon). */
  nomeTipo?: Record<string, string>;
  coloreTipo?: Record<string, string>;
  selezionato: string | null;
  onSeleziona: (chiave: string | null) => void;
  /** In modalità posizionamento un tocco sulla mappa fissa lo spillo del punto selezionato. */
  posizionamento: boolean;
  onPosiziona: (chiave: string, x: number, y: number) => void;
  /** Mostra anche i punti gestiti (ottenuti/esauriti). */
  mostraGestiti: boolean;
}

export function MappaInterattiva({ src, punti, selezionato, onSeleziona, posizionamento, onPosiziona, mostraGestiti, nomeTipo = NOME_TIPO, coloreTipo = COLORE_TIPO }: Props) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const trascina = useRef<{ x: number; y: number; px: number; py: number; mosso: boolean } | null>(null);
  const immagine = useRef<HTMLImageElement | null>(null);

  const suPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    trascina.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, mosso: false };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };
  const suPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!trascina.current) return;
    const dx = e.clientX - trascina.current.x;
    const dy = e.clientY - trascina.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) trascina.current.mosso = true;
    if (trascina.current.mosso) setPan({ x: trascina.current.px + dx, y: trascina.current.py + dy });
  };
  const suPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const t = trascina.current;
    trascina.current = null;
    if (!t || t.mosso || !immagine.current) return;
    // Tocco (senza trascinamento): in modalità posizionamento fissa lo spillo del punto selezionato.
    if (posizionamento && selezionato) {
      const r = immagine.current.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) onPosiziona(selezionato, Math.round(x * 10) / 10, Math.round(y * 10) / 10);
    }
  };
  const suWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.5, Math.min(6, z * (e.deltaY < 0 ? 1.15 : 1 / 1.15))));
  };

  const visibili = (punti as PuntoMappa[]).filter((p) => p.marcatore && (mostraGestiti || !p.stato));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setZoom((z) => Math.min(6, z * 1.25))} aria-label="Ingrandisci">+</button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setZoom((z) => Math.max(0.5, z / 1.25))} aria-label="Riduci">−</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Adatta</button>
        <span className="text-text-muted">Zoom {Math.round(zoom * 100)}% · trascina per spostare{posizionamento ? ' · tocca la mappa per fissare lo spillo del punto selezionato' : ''}</span>
      </div>
      <div
        className={`relative overflow-hidden rounded-lg border border-border-light bg-bg-tertiary h-[min(70vh,640px)] select-none ${posizionamento ? 'cursor-crosshair' : 'cursor-grab'}`}
        onPointerDown={suPointerDown} onPointerMove={suPointerMove} onPointerUp={suPointerUp} onPointerCancel={() => { trascina.current = null; }} onWheel={suWheel}
        role="application" aria-label="Mappa dell'area"
      >
        <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
          <div className="relative inline-block">
            <img ref={immagine} src={src} alt="Mappa dell'area" className="block max-w-none h-[min(70vh,640px)] w-auto pointer-events-none" draggable={false} />
            {visibili.map((p) => (
              <button
                key={p.chiave}
                type="button"
                className={`absolute -translate-x-1/2 -translate-y-full flex flex-col items-center ${p.chiave === selezionato ? 'z-20' : 'z-10'}`}
                style={{ left: `${p.marcatore!.x}%`, top: `${p.marcatore!.y}%` }}
                onClick={(e) => { e.stopPropagation(); onSeleziona(p.chiave === selezionato ? null : p.chiave); }}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label={`${nomeTipo[p.tipo] ?? p.tipo}: ${p.nome}`}
                title={p.nome}
              >
                <span className={`rounded-full border-2 border-white shadow ${p.chiave === selezionato ? 'w-6 h-6' : 'w-4 h-4'} ${p.stato ? 'opacity-50' : ''}`} style={{ background: coloreTipo[p.tipo] ?? '#888', transform: `scale(${1 / Math.max(0.5, zoom)})` }} />
                {p.chiave === selezionato && <span className="mt-0.5 px-1.5 py-0.5 rounded bg-bg text-[11px] whitespace-nowrap border border-border-light" style={{ transform: `scale(${1 / Math.max(0.5, zoom)})`, transformOrigin: 'top center' }}>{p.nome}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
