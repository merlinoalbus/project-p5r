// ============================================================
// RisposteVoce — fra le note di una voce Confidente del diario, le risposte migliori del suo level up
// ============================================================
//
// Progetto dei Confidenti approvato dall'utente (2026-10-24, tavola 4): guardando la voce dal diario si vedono fra le sue note le
// informazioni per un level up ottimale. Una voce con «Rango atteso N» mostra le scelte dell'evento del rango N (`a.dialogo`) con la
// migliore in evidenza. Con una partita, se il Confidente vi sta a un rango diverso (`a.rangoPartita`) e il suo prossimo evento è un altro
// (`a.dialogoPartita`), sotto c'è il rimando alle risposte di quell'evento. Senza rango atteso («Nessuno») la voce non prevede una salita
// di rango e il blocco non c'è (scelta dell'utente, 2026-10-24).
// Sola lettura: i punti li dà la scelta delle note alla spunta (`SceltaNote`).
// ============================================================

import { useState } from 'react';
import type { AzionePercorsoDto, DialogoVoceDto } from '../../types';

/** Le scelte di un evento: la (o le) migliori in evidenza, il valore in note o come lo scrive la guida. */
function ScelteEvento({ d }: { d: DialogoVoceDto }) {
  const migliore = Math.max(0, ...d.scelte.map((s) => s.note ?? 0));
  return (
    <ol className="m-0 p-0 list-none flex flex-col gap-1">
      {d.scelte.map((s) => {
        const top = migliore > 0 && s.note === migliore;
        const valore = s.note !== null ? '♪'.repeat(s.note) : s.puntiTesto ?? '';
        return (
          <li key={s.ordine} className={`risposta-voce ${top ? 'risposta-voce--migliore' : ''}`} title={s.avviso ?? undefined}>
            <span className="text-text-muted tabular-nums">{s.ordine}.</span>
            <span className={`flex-1 min-w-0 ${s.romantica ? 'text-primary-testo' : ''}`}>{s.testo}{s.romantica ? ' (relazione romantica)' : ''}</span>
            {valore && <span className={`chip text-[11px] ${top ? 'chip--attivo' : ''}`}>{valore}</span>}
          </li>
        );
      })}
    </ol>
  );
}

/** Il blocco delle risposte migliori della voce: solo con un rango atteso (senza, la voce non prevede una salita di rango). */
export function RisposteVoce({ a }: { a: AzionePercorsoDto }) {
  const [altroAperto, setAltroAperto] = useState(false);
  const d = a.dialogo;
  if (a.rangoAtteso === null || !d) return null;
  const secondario = a.dialogoPartita;
  return (
    <div className="risposte-voce" role="group" aria-label={`Risposte migliori, evento del rango ${d.rango}`}>
      <span className="risposte-voce__titolo">Level up al rango {d.rango} · risposte migliori</span>
      {d.note && <span className="text-[12px] text-text-muted">{d.note}</span>}
      <ScelteEvento d={d} />
      {a.rangoPartita !== undefined && a.rangoPartita + 1 !== d.rango && (
        <span className="text-[12px] text-text-secondary">
          Nella tua partita è al rango {a.rangoPartita}
          {secondario && (
            <>
              {' · '}
              <button type="button" className="btn btn-ghost btn-sm touch" aria-expanded={altroAperto} onClick={() => setAltroAperto((v) => !v)}>
                {altroAperto ? 'Nascondi' : 'Mostra'} le risposte del rango {secondario.rango}
              </button>
            </>
          )}
        </span>
      )}
      {secondario && altroAperto && (
        <div className="flex flex-col gap-1">
          <span className="risposte-voce__titolo">Rango {secondario.rango} · il tuo prossimo evento</span>
          <ScelteEvento d={secondario} />
        </div>
      )}
    </div>
  );
}
