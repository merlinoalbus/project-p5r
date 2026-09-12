// ============================================================
// campi — i campi elementari dei moduli: testo, numero, testo lungo; la griglia; il blocco senza label
// ============================================================

import type { ReactNode } from 'react';
import { testoDi, type Dati } from './base';

interface PropsCampo {
  nome: string;
  etichetta: string;
  dati: Dati;
  imposta: (patch: Dati) => void;
  tipo?: 'testo' | 'numero' | 'testolungo';
  aiuto?: string;
  disabilitato?: boolean;
  /** Occupa tutta la riga della griglia. */
  largo?: boolean;
  max?: number;
  segnaposto?: string;
}

/** Un campo di testo, numero o testo lungo, con la sua etichetta e l'aiuto. */
export function Campo({ nome, etichetta, dati, imposta, tipo = 'testo', aiuto, disabilitato, largo, max, segnaposto }: PropsCampo) {
  const valore = testoDi(dati[nome]);
  const classe = `editor-mappa__campo ${largo || tipo === 'testolungo' ? 'sm:col-span-2' : ''}`;
  return (
    <label className={classe}>
      {etichetta}
      {tipo === 'testolungo'
        ? <textarea className="form-input" rows={2} maxLength={max ?? 2000} value={valore} disabled={disabilitato} placeholder={segnaposto} onChange={(e) => imposta({ [nome]: e.target.value })} />
        : <input className="form-input" type={tipo === 'numero' ? 'number' : 'text'} min={tipo === 'numero' ? 0 : undefined} maxLength={max ?? 400} value={valore} disabled={disabilitato} placeholder={segnaposto}
          onChange={(e) => imposta({ [nome]: tipo === 'numero' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value })} />}
      {aiuto && <span className="text-[11px] text-text-muted">{aiuto}</span>}
    </label>
  );
}

/** La griglia dei campi: una colonna sul telefono, due da tablet in su. */
export function Griglia({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{children}</div>;
}

/** Un contenitore senza `<label>` per i campi che portano da sé la propria etichetta (Selettore, tessere). */
export function Blocco({ children, largo }: { children: ReactNode; largo?: boolean }) {
  return <div className={`editor-mappa__campo ${largo ? 'sm:col-span-2' : ''}`}>{children}</div>;
}
