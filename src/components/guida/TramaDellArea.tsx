// ============================================================
// TramaDellArea — le voci di Trama di un'area di un dedalo dei Memento: una casella da spuntare (2026-10-12)
// ============================================================
//
// Progetto approvato dall'utente: «Trama: una casella da spuntare»; in «Gioca» la pagina ha soltanto i comandi per segnare. La
// casella segna la voce «Ottenuta» (spuntata anche se «Esaurita»); toglierla la riapre. In «Modifica la guida» c'è la guida
// dell'area (`GuidaDellArea`): correggere, spostare, aggiungere ed eliminare le voci, e portarle in un'altra area.
// ============================================================

import { useState } from 'react';
import { GuidaDellArea } from './GuidaDellArea';
import type { AreaDungeonDto, PuntoInteresseDto, StatoPunto } from '../../types';

interface Props {
  /** Il dedalo, con le sole voci di Trama di quest'area in `punti`. */
  dedalo: AreaDungeonDto;
  /** L'area del dedalo e le altre dello stesso dedalo (dove una voce si può spostare). */
  areaDedalo: { chiave: string; nome: string; altre: ReadonlyArray<{ chiave: string; nome: string }> };
  partitaId: number | null;
  modifica: boolean;
  cambiaStato: (p: PuntoInteresseDto, stato: StatoPunto | null) => Promise<boolean>;
  onPuntoAggiornato: (p: PuntoInteresseDto) => void;
  onRicarica: () => Promise<void>;
}

/** In «Gioca» le caselle delle voci; in «Modifica la guida» la guida dell'area. */
export function TramaDellArea({ dedalo, areaDedalo, partitaId, modifica, cambiaStato, onPuntoAggiornato, onRicarica }: Props) {
  const [occupata, setOccupata] = useState<string | null>(null);
  if (modifica) {
    return <GuidaDellArea key={areaDedalo.chiave} area={dedalo} planimetrie={[]} partitaId={partitaId} mappaAperta={null}
      cambiaStato={cambiaStato} onPuntoAggiornato={onPuntoAggiornato} onRicarica={onRicarica} areaDedalo={areaDedalo} />;
  }
  const voci = dedalo.punti;
  if (voci.length === 0) return <p className="m-0 testo-12 text-text-muted">Nessuna voce di Trama in quest’area.</p>;
  /** Spunta o toglie la spunta a una voce. */
  const alterna = async (p: PuntoInteresseDto) => {
    if (!partitaId || occupata) return;
    setOccupata(p.chiave);
    try { await cambiaStato(p, p.stato ? null : 'ottenuto'); } finally { setOccupata(null); }
  };
  return (
    <ul className="m-0 flex list-none flex-col p-0" aria-label={`Trama di ${areaDedalo.nome}`}>
      {voci.map((p) => (
        <li key={p.chiave} className="flex flex-col">
          <label className={`touch flex items-start gap-2.5 py-1.5 testo-13 ${partitaId ? 'cursor-pointer' : ''}`}>
            <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[var(--color-primary)]" checked={!!p.stato} disabled={!partitaId || occupata === p.chiave}
              onChange={() => void alterna(p)} />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className={p.stato ? 'text-text-muted line-through' : ''}>{p.nome}</span>
              {/* due righe: per esteso nel suggerimento e in «Modifica la guida» */}
              {p.descrizione && <span className="line-clamp-2 testo-12 text-text-muted" title={p.descrizione}>{p.descrizione}</span>}
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}
