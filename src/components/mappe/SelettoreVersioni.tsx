// ============================================================
// SelettoreVersioni — le versioni di un'Area in un selettore compatto, con le miniature (L3, R3-41; decisione del PM, 2026-10-20)
// ============================================================
//
// Nella scheda del Palazzo da 1024 px la fila delle versioni (`VersioniArea`, segmenti con miniatura) prendeva una riga di 54–64 px sopra il
// visore. Qui la stessa scelta sta in un pulsante da 44: la miniatura e il nome della versione mostrata, con i suoi pin; al tocco si apre
// l'elenco con le miniature di tutte (l'informazione visiva non si perde: scelta 2 del PM). Scegliere cambia solo `?planimetria=`, come
// nella fila. Sotto i 1024 px resta la fila.
// ============================================================

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { AnteprimaMappa } from './AnteprimaMappa';
import type { PlanimetriaAreaDto } from '../../types';
import { nomeVersione } from '../../utils/aree';

interface Props {
  /** Il nome dell'Area: il selettore si chiama «Versioni di <area>». */
  nome: string;
  planimetrie: PlanimetriaAreaDto[];
  /** La chiave pubblica della versione mostrata. */
  scelta: string;
  onScegli: (chiave: string) => void;
  className?: string;
  /** Un avviso sulla versione mostrata, al posto dei suoi pin nella seconda riga (per esempio «nessun pin: stanno su «Pianta completa»»). */
  avviso?: string;
}

/** Quanti pin, a parole, e se è la versione che si apre per prima. */
const dettaglio = (p: PlanimetriaAreaDto) => `${p.numeroSpilli === 0 ? 'nessun pin' : p.numeroSpilli === 1 ? '1 pin' : `${p.numeroSpilli} pin`}${p.predefinita ? ' · si apre per prima' : ''}`;

/** Il selettore compatto delle versioni (solo con almeno due planimetrie). */
export function SelettoreVersioni({ nome, planimetrie, scelta, onScegli, className = '', avviso }: Props) {
  const [aperto, setAperto] = useState(false);
  const radice = useRef<HTMLDivElement>(null);
  const id = useId();
  // si chiude toccando fuori o con Esc, e il fuoco torna al pulsante
  useEffect(() => {
    if (!aperto) return;
    const fuori = (e: PointerEvent) => { if (!radice.current?.contains(e.target as Node)) setAperto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setAperto(false); radice.current?.querySelector<HTMLButtonElement>('button')?.focus(); } };
    document.addEventListener('pointerdown', fuori);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', fuori); document.removeEventListener('keydown', esc); };
  }, [aperto]);
  // LAY3-8: l'elenco aperto resta dentro la finestra. All'apertura (prima che si disegni) si misurano il pulsante e l'elenco: se sotto
  // c'è posto si apre sotto come prima; se no, dalla parte dove ce n'è di più, alto al massimo quello spazio, e scorre (area scorrevole,
  // overscroll contenuto). Il tetto resta quello di prima: il 60% della finestra, al massimo 420 px.
  const elenco = useRef<HTMLUListElement>(null);
  useLayoutEffect(() => {
    const lista = elenco.current;
    const pulsante = radice.current?.querySelector<HTMLButtonElement>('button');
    if (!aperto || !lista || !pulsante) return;
    const r = pulsante.getBoundingClientRect();
    const tetto = Math.min(window.innerHeight * 0.6, 420);
    const sotto = window.innerHeight - r.bottom - 4 - 8;
    const sopra = r.top - 4 - 8;
    const versoAlto = lista.scrollHeight > sotto && sopra > sotto;
    lista.style.maxHeight = `${Math.floor(Math.max(0, Math.min(tetto, versoAlto ? sopra : sotto)))}px`;
    lista.style.top = versoAlto ? 'auto' : '';
    lista.style.bottom = versoAlto ? 'calc(100% + 4px)' : '';
  }, [aperto]);
  if (planimetrie.length < 2) return null;
  const indice = Math.max(0, planimetrie.findIndex((p) => p.chiave === scelta));
  const corrente = planimetrie[indice];
  return (
    <div ref={radice} className={`relative min-w-0 ${className}`}>
      <button type="button" className="touch flex w-full min-w-0 items-center gap-2 rounded-md border border-border bg-bg px-1 py-0.5 text-left hover:border-primary"
        aria-haspopup="listbox" aria-expanded={aperto} aria-controls={id} aria-label={`Versioni di ${nome}: ${nomeVersione(corrente, indice)}, ${indice + 1} di ${planimetrie.length}`}
        onClick={() => setAperto((v) => !v)}>
        <AnteprimaMappa mappa={corrente} className="h-9 w-12 shrink-0" sizes="48px" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] font-semibold leading-tight">{nomeVersione(corrente, indice)}</span>
          {avviso
            ? <span className="truncate text-[11px] text-warning" title={avviso}>{avviso}</span>
            : <span className="truncate text-[11px] text-text-muted">{dettaglio(corrente)} · versione {indice + 1} di {planimetrie.length}</span>}
        </span>
        <span aria-hidden className="shrink-0 pr-1 text-text-muted">▾</span>
      </button>
      {aperto && (
        <ul ref={elenco} id={id} role="listbox" aria-label={`Versioni di ${nome}`}
          className="absolute left-0 top-[calc(100%+4px)] z-30 m-0 flex max-h-[min(60vh,420px)] w-[max(100%,260px)] list-none flex-col gap-1 area-scorrevole bg-bg-secondary p-1 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
          {planimetrie.map((p, i) => (
            <li key={p.chiave} role="option" aria-selected={p.chiave === scelta}>
              <button type="button" className={`touch flex w-full items-center gap-2 rounded-md border px-1 py-0.5 text-left ${p.chiave === scelta ? 'border-primary bg-primary-bg' : 'border-transparent hover:border-primary'}`}
                onClick={() => { setAperto(false); if (p.chiave !== scelta) onScegli(p.chiave); }}>
                <AnteprimaMappa mappa={p} className="h-10 w-[53px] shrink-0" sizes="64px" />
                <span className="flex min-w-0 flex-col">
                  <span className="text-[13px] font-semibold leading-tight">{nomeVersione(p, i)}</span>
                  <span className="text-[11px] text-text-muted">{dettaglio(p)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
