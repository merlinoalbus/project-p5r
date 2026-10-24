// ============================================================
// campi — i campi elementari dei moduli: testo, numero, testo lungo; la griglia; il blocco senza label
// ============================================================

import type { ReactNode } from 'react';
import { testoDi, type Dati } from './base';
import { PulsanteVisivo } from '../../shared/PulsanteVisivo';
import { IconaAzione } from '../../shared/IconaAzione';

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

/** Un elenco di testi come righe in ordine: ogni voce ha il suo campo e «Togli», in fondo «Aggiungi» (L11 · B11, modifica dei testi della guida). */
export function CampoElenco({ etichetta, voci, onCambia, disabilitato, max = 2000, lungo = true }: {
  etichetta: string;
  voci: string[];
  onCambia: (voci: string[]) => void;
  disabilitato?: boolean;
  /** Lunghezza massima di una voce. */
  max?: number;
  /** Le voci sono frasi: si scrivono in un campo a più righe. */
  lungo?: boolean;
}) {
  /** Cambia il testo della voce in posizione `i`. */
  const cambia = (i: number, testo: string) => onCambia(voci.map((v, j) => (j === i ? testo : v)));
  return (
    <fieldset className="regole-editor flex min-w-0 flex-col gap-2 sm:col-span-2">
      <legend>{etichetta}</legend>
      {voci.length === 0 && <p className="m-0 text-[12px] text-text-muted">Nessuna voce.</p>}
      {voci.map((v, i) => (
        <div key={i} className="flex flex-wrap items-start gap-2">
          <span className="chip mt-2 shrink-0" aria-hidden>{i + 1}</span>
          <label className="editor-mappa__campo min-w-[200px] flex-[3]">
            <span className="sr-only">{etichetta}: voce {i + 1}</span>
            {lungo
              ? <textarea className="form-input min-h-11" rows={2} maxLength={max} value={v} disabled={disabilitato} onChange={(e) => cambia(i, e.target.value)} aria-label={`${etichetta}: voce ${i + 1}`} />
              : <input className="form-input min-h-11" type="text" maxLength={max} value={v} disabled={disabilitato} onChange={(e) => cambia(i, e.target.value)} aria-label={`${etichetta}: voce ${i + 1}`} />}
          </label>
          <button type="button" className="btn btn-ghost btn-sm touch" disabled={disabilitato} onClick={() => onCambia(voci.filter((_, j) => j !== i))} aria-label={`Togli la voce ${i + 1} di ${etichetta}`}>Togli</button>
        </div>
      ))}
      <PulsanteVisivo tono="secondario" compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi una voce" disabled={disabilitato || voci.length >= 60}
        onClick={() => onCambia([...voci, ''])} />
    </fieldset>
  );
}

/** Un contenitore senza `<label>` per i campi che portano da sé la propria etichetta (Selettore, tessere). */
export function Blocco({ children, largo }: { children: ReactNode; largo?: boolean }) {
  return <div className={`editor-mappa__campo ${largo ? 'sm:col-span-2' : ''}`}>{children}</div>;
}
