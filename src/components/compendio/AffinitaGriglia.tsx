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
              className={`inline-flex flex-col items-center justify-center w-[34px] h-[34px] rounded-md text-[10px] leading-tight ${stile.classe}`}
              title={`${a.elementoNome}: ${a.codiceNome}`}
            >
              <span style={{ color: coloreElemento(a.elemento) }} className="font-bold">{a.elementoSigla}</span>
              <span>{a.codice === '-' ? '—' : a.codiceSigla}</span>
            </span>
          );
        })}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2" aria-label="Affinità">
      {affinita.map((a) => {
        const stile = STILE_AFFINITA[a.codice] ?? STILE_AFFINITA['-'];
        return (
          <div key={a.elemento} className={`flex flex-col items-center justify-center rounded-lg py-2 px-1 ${stile.classe}`} title={`${a.elementoNome}: ${a.codiceNome}`}>
            <span className="text-[11px] font-bold" style={{ color: coloreElemento(a.elemento) }}>{a.elementoNome}</span>
            <span className="text-[13px] inline-flex items-center gap-1">
              <AssetImg nome={`affinita/${a.codice === '-' ? 'normale' : a.codice}-senza-testo`} alt="" decorativa className="w-4 h-4 object-contain" fallback={null} />
              {a.codiceNome}
            </span>
          </div>
        );
      })}
    </div>
  );
}
