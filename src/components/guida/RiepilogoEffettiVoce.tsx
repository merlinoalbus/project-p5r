// ============================================================
// RiepilogoEffettiVoce — «Il gioco dà», raggruppato per tipo (richiesta dell'utente del 2026-10-25)
// ============================================================
//
// L'utente: «Il gioco dà: Acquisto: Arginade ×2 · ¥200: cambiali tu a mano · Acquisto: Acqua della rinascita ×2 · ¥200: cambiali tu a
// mano · In tutto: …» — «Non si capisce niente... non sarebbe possibile formattarlo in modo adeguato? per tutti gli acquisti?». Al posto
// della frase unica, i gruppi che il server costruisce (`AzionePercorsoDto.produceRiepilogo`, `shared/riepilogoEffetti.ts`): l'etichetta
// del gruppo, un elenco con una riga per elemento (nome a sinistra, copie, prezzo o note a destra; su un telefono il dettaglio va a capo
// sotto il nome, mai troncato), il totale degli acquisti e una nota sola per gruppo. Solo lettura: nessun comando.
// ============================================================

import { useId } from 'react';
import type { GruppoRiepilogoEffettiDto } from '../../../shared/riepilogoEffetti';

interface Props {
  gruppi: readonly GruppoRiepilogoEffettiDto[];
  /** Il titolo del riquadro (per chi legge con un lettore di schermo è anche il nome della regione). */
  titolo?: string;
}

/** Un gruppo: etichetta, elenco delle righe, totale e nota. */
function Gruppo({ g }: { g: GruppoRiepilogoEffettiDto }) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span id={id} className="testo-12 font-semibold text-text-secondary break-words">{g.titolo}</span>
      <ul aria-labelledby={id} className="m-0 flex list-none flex-col p-0">
        {g.righe.map((r, i) => (
          <li key={`${i}:${r.nome}`} className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 testo-13">
            <span className="min-w-0 break-words">{r.nome}</span>
            {r.dettaglio && <span className="break-words text-text-secondary tabular-nums">{r.dettaglio}</span>}
          </li>
        ))}
      </ul>
      {g.totale && <p className="m-0 border-t border-border pt-0.5 testo-13 font-semibold tabular-nums break-words">{g.totale}</p>}
      {g.nota && <p className="m-0 testo-12 text-text-muted break-words">{g.nota}</p>}
    </div>
  );
}

/** Il riepilogo della voce: niente se non ci sono gruppi. */
export function RiepilogoEffettiVoce({ gruppi, titolo = 'Il gioco dà' }: Props) {
  const id = useId();
  if (gruppi.length === 0) return null;
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-1.5 rounded-md border border-border bg-bg-tertiary p-2">
      <span id={id} className="testo-12 text-text-muted">{titolo}</span>
      <div className="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))] gap-x-4 gap-y-2">
        {gruppi.map((g) => <Gruppo key={g.chiave} g={g} />)}
      </div>
    </section>
  );
}
