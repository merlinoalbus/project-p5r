// ============================================================
// AffinitaGriglia — le 10 affinità elementali di una Persona
// ============================================================

import type { AffinitaDto } from '../../types';
import { STILE_AFFINITA, coloreElemento } from '../../utils/elementi';
import { AssetImg } from '../shared/AssetImg';

interface Props {
  affinita: AffinitaDto[];
  /** true: versione compatta per gli elenchi (solo sigle). */
  compatta?: boolean;
}

/** Griglia delle affinità: elemento in alto, codice colorato sotto. */
export function AffinitaGriglia({ affinita, compatta }: Props) {
  if (compatta) {
    return (
      <div className="flex gap-1 flex-wrap" aria-label="Affinità">
        {affinita.map((a) => {
          const stile = STILE_AFFINITA[a.codice] ?? STILE_AFFINITA['-'];
          return (
            <span
              key={a.elemento}
              className={`inline-flex flex-col items-center justify-center w-[42px] h-[46px] rounded-md text-[11px] leading-tight ${stile.classe}`}
              title={`${a.elementoNome}: ${a.codiceNome}`}
            >
              <span style={{ color: coloreElemento(a.elemento) }} className="font-bold">{a.elementoSigla}</span>
              <AssetImg nome={`affinita/${a.codice === '-' ? 'normale' : a.codice}-senza-testo`} alt={a.codiceNome} className="w-6 h-6 object-contain" fallback={<span>{a.codice === '-' ? '—' : a.codiceSigla}</span>} />
            </span>
          );
        })}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-5 lg:grid-cols-10 gap-2" aria-label="Affinità">
      {affinita.map((a) => {
        const stile = STILE_AFFINITA[a.codice] ?? STILE_AFFINITA['-'];
        return (
          <div key={a.elemento} className={`flex flex-col items-center justify-center gap-1 rounded-lg py-2 px-1 text-center ${stile.classe}`} title={`${a.elementoNome}: ${a.codiceNome}`}>
            <AssetImg nome={`elementi/${a.elemento}`} alt="" decorativa className="w-9 h-9 object-contain" fallback={null} />
            <span className="text-[12px] font-bold leading-tight" style={{ color: coloreElemento(a.elemento) }}>{a.elementoNome}</span>
            <AssetImg nome={`affinita/${a.codice === '-' ? 'normale' : a.codice}-senza-testo`} alt="" decorativa className="w-9 h-9 object-contain" fallback={null} />
            <span className="text-[12px] font-semibold leading-tight">{a.codiceNome}</span>
          </div>
        );
      })}
    </div>
  );
}
