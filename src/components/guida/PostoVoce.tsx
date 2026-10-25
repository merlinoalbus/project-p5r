// ============================================================
// PostoVoce — il posto della voce nella fascia della giornata: elenco riordinabile, anche trascinando
// ============================================================
//
// Richiesta dell'utente: «devo fare un ordinamento esatto». Nella finestra della voce l'elenco della fascia mostra le altre voci
// ferme e la voce che si sta scrivendo evidenziata: si sposta trascinando la maniglia ⠿ (mouse, dito o penna), con le frecce
// su/giù della tastiera sulla maniglia, oppure con i pulsanti ↑ ↓. Variante propria, dedicata a un solo elemento mobile: il
// riordino del diario (`useRiordino`, `Maniglia`) è di un'altra funzione e qui non si tocca.
// ============================================================

import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import type { AzionePercorsoDto, FasciaGioco } from '../../types';

interface Props {
  /** Le altre voci della fascia, nel loro ordine. */
  altre: AzionePercorsoDto[];
  /** Il posto della voce fra le altre (0 = in cima, `altre.length` = in fondo). */
  posto: number;
  testo: string;
  fascia: FasciaGioco;
  disabled: boolean;
  /** Mette la voce a quel posto (0 … `altre.length`). */
  onPosto: (posto: number) => void;
}

interface Trascinamento { id: number; partenza: number; dy: number; target: number; centri: number[] }

/** Il posto della voce nella fascia: l'elenco numerato, con la voce evidenziata che si trascina o sale e scende di un posto per volta. */
export function PostoVoce({ altre, posto, testo, fascia, disabled, onPosto }: Props) {
  const nome = fascia === 'giorno' ? 'di giorno' : 'di sera';
  const gruppo = useRef<HTMLDivElement>(null);
  const righe = useRef<Array<HTMLLIElement | null>>([]);
  const [trascina, setTrascina] = useState<Trascinamento | null>(null);

  /** Un passo; arrivati al bordo il pulsante premuto si spegne: il fuoco passa all'altro, così la tastiera non lo perde. */
  const passo = (verso: -1 | 1) => {
    const nuovo = Math.max(0, Math.min(altre.length, posto + verso));
    if (nuovo === posto) return;
    onPosto(nuovo);
    const alBordo = verso === -1 ? nuovo <= 0 : nuovo >= altre.length;
    if (alBordo) setTimeout(() => gruppo.current?.querySelector<HTMLButtonElement>(`button[aria-label="${verso === -1 ? 'Sposta giù di un posto' : 'Sposta su di un posto'}"]`)?.focus());
  };

  const inizia = (e: PointerEvent<HTMLButtonElement>) => {
    if (disabled || e.button > 0) return;
    // il centro verticale di ogni altra voce, misurato a inizio gesto: la lista non si riordina finché si trascina
    const centri = altre.map((_, k) => {
      const r = righe.current[k]?.getBoundingClientRect();
      return r ? r.top + r.height / 2 : 0;
    });
    e.currentTarget.setPointerCapture(e.pointerId);
    setTrascina({ id: e.pointerId, partenza: e.clientY, dy: 0, target: posto, centri });
  };
  const muovi = (e: PointerEvent<HTMLButtonElement>) => {
    setTrascina((t) => (t && t.id === e.pointerId ? { ...t, dy: e.clientY - t.partenza, target: t.centri.filter((c) => c < e.clientY).length } : t));
  };
  const finisci = (e: PointerEvent<HTMLButtonElement>, conferma: boolean) => {
    if (!trascina || trascina.id !== e.pointerId) return;
    if (conferma && trascina.target !== posto) onPosto(trascina.target);
    setTrascina(null);
  };
  const tasto = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === 'ArrowUp') { e.preventDefault(); passo(-1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); passo(1); }
  };

  // altre voci con, al loro posto, la voce che si scrive e (solo trascinando) il segnaposto dove cadrebbe
  const elenco: Array<{ tipo: 'altra'; k: number } | { tipo: 'questa' } | { tipo: 'slot' }> = [];
  for (let k = 0; k <= altre.length; k++) {
    if (k === posto) elenco.push({ tipo: 'questa' });
    if (trascina && k === trascina.target && trascina.target !== posto) elenco.push({ tipo: 'slot' });
    if (k < altre.length) elenco.push({ tipo: 'altra', k });
  }

  return (
    <div ref={gruppo} className="flex flex-col gap-1" role="group" aria-label={`Posto nella giornata, ${nome}`}>
      <span className="testo-13 text-text-secondary">Posto nella giornata ({nome}): {posto + 1} di {altre.length + 1}</span>
      <ol className="m-0 p-0 list-none flex flex-col border border-border-light rounded-md testo-13 touch-pan-y">
        {elenco.map((r) => {
          if (r.tipo === 'slot') return <li key="slot" aria-hidden="true" className="posto-voce__slot">rilascia qui · posto {trascina!.target + 1}</li>;
          if (r.tipo === 'altra') {
            const v = altre[r.k];
            return (
              <li key={v.uid} ref={(el) => { righe.current[r.k] = el; }} className="flex items-center gap-2 px-2 py-1 min-h-[32px] text-text-muted border-t border-border-light first:border-t-0">
                <span className="w-6 shrink-0 text-right tabular-nums">{r.k < posto ? r.k + 1 : r.k + 2}.</span>
                <span className="flex-1 min-w-0 truncate">{v.azione}</span>
              </li>
            );
          }
          return (
            <li key="questa" aria-current="true" className={`posto-voce__questa flex items-center gap-2 px-2 py-1 bg-primary-bg font-semibold border-t border-border-light first:border-t-0 ${trascina ? 'posto-voce__questa--trascinata' : ''}`}
              style={trascina ? { transform: `translateY(${trascina.dy}px)` } : undefined}>
              <button type="button" className="posto-voce__maniglia touch" disabled={disabled} aria-label="Trascina per spostare la voce (con la tastiera: frecce su e giù)" title="Trascina"
                onPointerDown={inizia} onPointerMove={muovi} onPointerUp={(e) => finisci(e, true)} onPointerCancel={(e) => finisci(e, false)} onKeyDown={tasto}>⠿</button>
              <span className="w-6 shrink-0 text-right tabular-nums">{posto + 1}.</span>
              <span className="flex-1 min-w-0 truncate">{testo}</span>
              <PulsanteVisivo compatto tono="secondario" icona={<IconaAzione chiave="su" dimensione={20} />} titolo="Su" disabled={disabled || posto === 0} onClick={() => passo(-1)} aria-label="Sposta su di un posto" />
              <PulsanteVisivo compatto tono="secondario" icona={<IconaAzione chiave="giu" dimensione={20} />} titolo="Giù" disabled={disabled || posto === altre.length} onClick={() => passo(1)} aria-label="Sposta giù di un posto" />
            </li>
          );
        })}
      </ol>
      {altre.length === 0 && <span className="testo-12 text-text-muted">È l’unica voce di questa fascia.</span>}
    </div>
  );
}
