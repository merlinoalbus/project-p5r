// ============================================================
// SezioneDellArea — il riquadro di uno dei quattro elementi di un'area di un dedalo dei Memento (2026-10-12)
// ============================================================
//
// Progetto approvato dall'utente («Approvo»): ogni area ha quattro elementi — Timbri, Persona, Richieste, Trama — e ognuno sta in
// un riquadro con la sua icona (`ui/sezione-<chiave>`, consegna di Codex `docs/grafica/consegna-2026-10-12-memento.md`; senza il
// file, un segno disegnato qui), il nome, il conto e una nota breve.
// ============================================================

import type { ReactNode } from 'react';
import { AssetImg } from '../shared/AssetImg';

export type ChiaveSezione = 'timbri' | 'persona' | 'richieste' | 'trama';

/** Il segno di riserva di una sezione, se l'icona di Codex non c'è: l'iniziale in un tondo. */
function Riserva({ chiave }: { chiave: ChiaveSezione }) {
  return <span aria-hidden className="inline-flex size-[22px] items-center justify-center rounded-full border border-primary/60 text-[11px] font-bold uppercase text-primary-testo">{chiave[0]}</span>;
}

interface Props {
  chiave: ChiaveSezione;
  titolo: string;
  /** Il conto da leggere accanto al titolo («2/3», «3/9 catturate»); niente se vuoto. */
  conto?: string;
  /** Una nota breve accanto al conto («un tocco per timbro», «non contano»). */
  nota?: string;
  /** Comandi in testa al riquadro, a destra (in «Modifica la guida»). */
  azioni?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Il riquadro di un elemento dell'area: intestazione con icona, titolo, conto e nota, poi il contenuto. */
export function SezioneDellArea({ chiave, titolo, conto, nota, azioni, children, className = '' }: Props) {
  return (
    <section className={`flex min-w-0 flex-col gap-2 rounded-lg border border-border-light bg-white/[0.03] p-2.5 ${className}`} aria-label={`${titolo} dell’area`}>
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <AssetImg nome={`ui/sezione-${chiave}`} alt="" decorativa className="size-[22px] shrink-0 object-contain" fallback={<Riserva chiave={chiave} />} />
        {/* il separatore fuori dallo span: dentro, il nome accessibile perdeva lo spazio («Persona· 1/3») */}
        <h3 className="m-0 text-[14px] font-semibold leading-tight">{titolo}{conto ? <>{' · '}<span className="tabular-nums text-text-secondary">{conto}</span></> : null}</h3>
        {nota && <span className="text-[11px] text-text-muted">{nota}</span>}
        {azioni && <span className="ml-auto flex flex-wrap items-center gap-1.5">{azioni}</span>}
      </header>
      {children}
    </section>
  );
}
