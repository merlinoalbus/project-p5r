// ============================================================
// VersioniArea — le planimetrie di un'Area come una fila di segmenti sopra il visore (L2, R2-14)
// ============================================================
//
// Un'Area con più planimetrie (il Sottopasso, il Covo, lo staff) le mostra **nella stessa pagina**: scegliere una versione cambia
// solo `?planimetria=` (con `replace`), non il posto. Ogni segmento ha la miniatura (64×48, le miniature di L1), l'etichetta o
// «Planimetria N» e il numero di pin, così una versione vuota si riconosce prima di aprirla.
//
// La fila non va a capo: scorre in orizzontale dentro un bordo evidente, con lo scorrimento contenuto (memoria «Scroll annidati»)
// e una sfumatura sul lato che continua; all'arrivo la versione scelta è portata in vista. Andando a capo, le cinque versioni del
// Covo prendevano due righe e la pagina non stava più in una schermata (LAY2-1; decisione di Stesura, §4.3).
// ============================================================

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnteprimaMappa } from './AnteprimaMappa';
import type { PlanimetriaAreaDto } from '../../types';
import { nomeVersione } from '../../utils/aree';

interface Props {
  /** Il nome dell'Area: la fila si chiama «Versioni di <area>» (dice ai lettori di schermo quel che il chip diceva sotto i 1024 px). */
  nome: string;
  planimetrie: PlanimetriaAreaDto[];
  /** La chiave pubblica della versione mostrata. */
  scelta: string;
  onScegli: (chiave: string) => void;
  /** Quel che sta in fondo alla fila, a destra e fuori dalla parte che scorre (il collegamento alle sfide del Covo da 1024 a 1279 px,
   *  decisione di Stesura, §4.3): la fila si restringe e scorre nello spazio che resta. */
  coda?: ReactNode;
}

/** La fila delle versioni (solo con almeno due planimetrie): segmenti da 44 px e più, quello mostrato premuto. */
export function VersioniArea({ nome, planimetrie, scelta, onScegli, coda }: Props) {
  const fila = useRef<HTMLDivElement | null>(null);
  const [lati, setLati] = useState({ sinistra: false, destra: false });
  /** Da che lato la fila continua oltre il bordo: lì la sfumatura. */
  const misura = useCallback(() => {
    const el = fila.current;
    if (!el) return;
    const sinistra = el.scrollLeft > 1;
    const destra = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setLati((l) => (l.sinistra === sinistra && l.destra === destra ? l : { sinistra, destra }));
  }, []);
  // all'arrivo (e quando cambia) la versione scelta si porta in vista; la misura dei lati segue le dimensioni della fila
  useEffect(() => {
    fila.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [scelta]);
  useEffect(() => {
    const el = fila.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const osserva = new ResizeObserver(misura);
    osserva.observe(el);
    return () => osserva.disconnect();
  }, [misura]);
  if (planimetrie.length < 2) return null;
  const riquadro = (
    <div className={`versioni-area ${coda ? 'min-w-0 flex-1' : ''} ${lati.sinistra ? 'versioni-area--continua-sinistra' : ''} ${lati.destra ? 'versioni-area--continua-destra' : ''}`}>
      <div ref={fila} className="versioni-area__fila" role="group" aria-label={`Versioni di ${nome}`} onScroll={misura}>
        {planimetrie.map((p, i) => (
          <button key={p.chiave} type="button" className="versioni-area__segmento touch" aria-pressed={p.chiave === scelta} onClick={() => onScegli(p.chiave)}>
            <AnteprimaMappa mappa={p} className="h-10 w-[53px] shrink-0" sizes="64px" />
            <span className="flex min-w-0 flex-col items-start text-left">
              <span className="whitespace-nowrap text-[13px] font-semibold leading-tight">{nomeVersione(p, i)}</span>
              <span className="whitespace-nowrap text-[11px] text-text-muted">{p.numeroSpilli === 0 ? 'nessun pin' : p.numeroSpilli === 1 ? '1 pin' : `${p.numeroSpilli} pin`}{p.predefinita ? ' · si apre per prima' : ''}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
  return coda ? <div className="flex items-center gap-2">{riquadro}{coda}</div> : riquadro;
}
