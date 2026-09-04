// ============================================================
// MeteoIcona — meteo del giorno come icone `meteo/<chiave>` (asset in arrivo) con riserva vettoriale e testo accessibile
// ============================================================

import type { ReactNode } from 'react';
import { AssetImg } from '../shared/AssetImg';
import { IconLuna, IconNebbia, IconNeve, IconNuvola, IconPioggia, IconPolline, IconSole, IconTemporale, IconTermometro, IconTifone } from '../shared/iconeGuida';
import { modificatoreMeteo, segmentiMeteo, type ChiaveMeteo } from '../../utils/meteo';

interface Props {
  meteo: string | null | undefined;
  /** Lato dell'icona in px (default 22). */
  dimensione?: number;
  /** Mostra anche il testo accanto alle icone. */
  conTesto?: boolean;
  className?: string;
}

function riserva(chiave: ChiaveMeteo, size: number): ReactNode {
  switch (chiave) {
    case 'sereno': return <IconSole size={size} />;
    case 'nuvoloso': return <IconNuvola size={size} />;
    case 'pioggia': return <IconPioggia size={size} />;
    case 'temporale': return <IconTemporale size={size} />;
    case 'neve': return <IconNeve size={size} />;
    case 'nebbia': return <IconNebbia size={size} />;
    case 'caldo':
    case 'freddo': return <IconTermometro size={size} />;
    case 'polline': return <IconPolline size={size} />;
    case 'tifone': return <IconTifone size={size} />;
  }
}

/** Icone del meteo (giorno/sera se il testo ha due parti); il testo originale resta nel `title` e, a richiesta, accanto. */
export function MeteoIcona({ meteo, dimensione = 22, conTesto, className }: Props) {
  const segmenti = segmentiMeteo(meteo);
  if (!meteo || segmenti.length === 0) return meteo ? <span className={`text-[12px] text-text-secondary ${className ?? ''}`}>{meteo}</span> : null;
  return (
    <span className={`inline-flex items-center gap-1.5 text-text-secondary ${className ?? ''}`} title={meteo} aria-label={`Meteo: ${meteo}`} role="img">
      {segmenti.map((s, i) => {
        const modificatore = modificatoreMeteo(s.testo);
        return (
          <span key={`${s.chiave}-${i}`} className="inline-flex items-center gap-0.5">
            {i > 0 && <IconLuna size={Math.round(dimensione * 0.6)} className="text-text-muted" />}
            <AssetImg nome={`meteo/${s.chiave}`} alt="" decorativa className="object-contain" style={{ width: dimensione, height: dimensione }} fallback={riserva(s.chiave, dimensione)} />
            {modificatore && <AssetImg nome={`meteo/${modificatore}`} alt="" decorativa className="object-contain" style={{ width: dimensione * 0.8, height: dimensione * 0.8 }} fallback={riserva(modificatore, Math.round(dimensione * 0.8))} />}
          </span>
        );
      })}
      {conTesto && <span className="text-[12px]">{meteo}</span>}
    </span>
  );
}
