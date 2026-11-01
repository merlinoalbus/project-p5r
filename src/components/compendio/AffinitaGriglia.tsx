// ============================================================
// AffinitaGriglia — le 10 affinità elementali di una Persona
// ============================================================

import type { AffinitaDto } from '../../types';
import { STILE_AFFINITA, coloreTestoElemento } from '../../utils/elementi';
import { AssetImg } from '../shared/AssetImg';

interface Props {
  affinita: AffinitaDto[];
  /** true: versione compatta per gli elenchi (solo sigle). */
  compatta?: boolean;
  /** Nome del gruppo per i lettori di schermo (predefinito «Affinità»): serve a distinguere due griglie sulla stessa pagina. */
  etichetta?: string;
  /** Con `compatta`: le dieci caselle su una riga sola che si divide la larghezza (piastrella a riga del Compendio sul telefono). */
  fluida?: boolean;
  /** L10-04: le caselle basse della piastrella orizzontale del Compendio (sigla a 12 px e segno piccolo), su una fila di dieci dove la
   *  piastrella è larga e su due file di cinque dove è stretta (`.piastrella-persona__affinita`, che legge la larghezza della piastrella). */
  piastrella?: boolean;
}

/** Griglia delle affinità: elemento in alto, codice colorato sotto. */
export function AffinitaGriglia({ affinita, compatta, etichetta = 'Affinità', fluida, piastrella }: Props) {
  if (piastrella) {
    return (
      <div className="piastrella-persona__affinita" role="group" aria-label={etichetta}>
        {affinita.map((a) => {
          const stile = STILE_AFFINITA[a.codice] ?? STILE_AFFINITA['-'];
          return (
            <span key={a.elemento} className={`flex h-[34px] min-w-0 flex-col items-center justify-center gap-0.5 rounded testo-12 leading-none ${stile.classe}`} title={`${a.elementoNome}: ${a.codiceNome}`}>
              {/* la sigla resta su una riga: nelle caselle da 21 px di 1280 «Arm» e «Nuc» andavano a capo (ne usciva «Ar / m») */}
              <span style={{ color: coloreTestoElemento(a.elemento) }} className="whitespace-nowrap font-bold tracking-tighter">{a.elementoSigla}</span>
              <AssetImg nome={`affinita/${a.codice === '-' ? 'normale' : a.codice}-senza-testo`} alt={a.codiceNome} className="h-4 w-4 object-contain" fallback={<span>{a.codice === '-' ? '—' : a.codiceSigla}</span>} />
            </span>
          );
        })}
      </div>
    );
  }
  if (compatta) {
    return (
      <div className={`flex gap-1 ${fluida ? 'flex-nowrap' : 'flex-wrap'}`} role="group" aria-label={etichetta}>
        {affinita.map((a) => {
          const stile = STILE_AFFINITA[a.codice] ?? STILE_AFFINITA['-'];
          return (
            <span
              key={a.elemento}
              className={`inline-flex flex-col items-center justify-center ${fluida ? 'min-w-0 flex-1 basis-0 h-[44px]' : 'w-[42px] h-[46px]'} rounded-md testo-12 leading-tight ${stile.classe}`}
              title={`${a.elementoNome}: ${a.codiceNome}`}
            >
              <span style={{ color: coloreTestoElemento(a.elemento) }} className="font-bold">{a.elementoSigla}</span>
              <AssetImg nome={`affinita/${a.codice === '-' ? 'normale' : a.codice}-senza-testo`} alt={a.codiceNome} className="w-6 h-6 object-contain" fallback={<span>{a.codice === '-' ? '—' : a.codiceSigla}</span>} />
            </span>
          );
        })}
      </div>
    );
  }
  return (
    <div className="griglia-affinita gap-2" role="group" aria-label={etichetta}>
      {affinita.map((a) => {
        const stile = STILE_AFFINITA[a.codice] ?? STILE_AFFINITA['-'];
        return (
          <div key={a.elemento} className={`flex flex-col items-center justify-center gap-1 rounded-lg py-2 px-1 text-center ${stile.classe}`} title={`${a.elementoNome}: ${a.codiceNome}`}>
            <AssetImg nome={`elementi/${a.elemento}`} alt="" decorativa className="w-9 h-9 object-contain" fallback={null} />
            {/* sul telefono le cinque colonne sono larghe ~60 px e «Elettricità» diventava «Elettri…»: lì si legge la sigla (come
                nella griglia compatta) e il nome intero resta per i lettori di schermo */}
            <span className="testo-12 font-bold leading-tight whitespace-nowrap max-w-full overflow-hidden text-ellipsis" style={{ color: coloreTestoElemento(a.elemento) }} title={a.elementoNome}>
              {a.elementoSigla && <span className="sm:hidden" aria-hidden="true">{a.elementoSigla}</span>}
              <span className={a.elementoSigla ? 'max-sm:sr-only' : undefined}>{a.elementoNome}</span>
            </span>
            <AssetImg nome={`affinita/${a.codice === '-' ? 'normale' : a.codice}-senza-testo`} alt="" decorativa className="w-9 h-9 object-contain" fallback={null} />
            <span className="testo-12 font-semibold leading-tight whitespace-nowrap max-w-full overflow-hidden text-ellipsis">{a.codiceNome}</span>
          </div>
        );
      })}
    </div>
  );
}
