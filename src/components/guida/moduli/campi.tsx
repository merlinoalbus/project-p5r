// ============================================================
// campi — i campi elementari dei moduli: testo, numero, testo lungo; la griglia; il blocco senza label
// ============================================================
//
// L13 (modelli comuni 1 e 5): `Campo` è un involucro sottile sul `CampoTesto` condiviso (etichetta sopra, 44 px, aiuto sotto), `Griglia`
// è la griglia unica delle finestre di modifica (una colonna sotto 768 px, due da lì in su: `.griglia-campi`) e `Blocco` un campo che
// porta da sé il proprio nome. I dati salvati non cambiano: il modulo scambia con `dati`/`imposta` come prima.
// ============================================================

import type { ReactNode } from 'react';
import { testoDi, type Dati } from './base';
import { PulsanteVisivo } from '../../shared/PulsanteVisivo';
import { IconaAzione } from '../../shared/IconaAzione';
import { CampoTesto } from '../../shared/Campo';

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

/** Un campo di testo, numero o testo lungo, con la sua etichetta e l'aiuto (il testo lungo si allunga con quello che contiene). */
export function Campo({ nome, etichetta, dati, imposta, tipo = 'testo', aiuto, disabilitato, largo, max, segnaposto }: PropsCampo) {
  return (
    <CampoTesto etichetta={etichetta} valore={testoDi(dati[nome])} tipo={tipo === 'testolungo' ? 'lungo' : tipo} aiuto={aiuto} disabilitato={disabilitato} largo={largo} massimo={max} segnaposto={segnaposto}
      onCambia={(v) => imposta({ [nome]: tipo === 'numero' ? (v === '' ? null : Number(v)) : v })} />
  );
}

/** La griglia dei campi: una colonna sotto 768 px, due da lì in su; i campi `largo` occupano la riga intera. */
export function Griglia({ children }: { children: ReactNode }) {
  return <div className="griglia-campi">{children}</div>;
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
    <fieldset className="regole-editor campo--largo flex min-w-0 flex-col gap-2">
      <legend>{etichetta}</legend>
      {voci.length === 0 && <p className="m-0 testo-12 text-text-muted">Nessuna voce.</p>}
      {voci.map((v, i) => (
        <div key={i} className="flex flex-wrap items-start gap-2">
          <span className="chip mt-2 shrink-0" aria-hidden>{i + 1}</span>
          <label className="editor-mappa__campo min-w-[200px] flex-[3]">
            <span className="sr-only">{etichetta}: voce {i + 1}</span>
            {lungo
              ? <textarea className="form-input min-h-11" rows={2} maxLength={max} value={v} disabled={disabilitato} onChange={(e) => cambia(i, e.target.value)} aria-label={`${etichetta}: voce ${i + 1}`} />
              : <input className="form-input min-h-11" type="text" maxLength={max} value={v} disabled={disabilitato} onChange={(e) => cambia(i, e.target.value)} aria-label={`${etichetta}: voce ${i + 1}`} />}
          </label>
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" disabled={disabilitato} onClick={() => onCambia(voci.filter((_, j) => j !== i))} aria-label={`Togli la voce ${i + 1} di ${etichetta}`} />
        </div>
      ))}
      <PulsanteVisivo tono="secondario" compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi una voce" disabled={disabilitato || voci.length >= 60}
        onClick={() => onCambia([...voci, ''])} />
    </fieldset>
  );
}

/** Un contenitore senza `<label>` per i campi che portano da sé la propria etichetta (Selettore, tessere). */
export function Blocco({ children, largo }: { children: ReactNode; largo?: boolean }) {
  return <div className={`campo ${largo ? 'campo--largo' : ''}`}>{children}</div>;
}
