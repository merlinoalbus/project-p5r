// ============================================================
// RisposteVoce — fra le note di una voce Confidente del diario, le risposte migliori del suo level up
// ============================================================
//
// Progetto dei Confidenti approvato dall'utente (2026-10-24, tavola 4): guardando la voce dal diario si vedono fra le sue note le
// informazioni per un level up ottimale. Una voce con «Rango atteso N» mostra le scelte dell'evento del rango N (`a.dialogo`) con la
// migliore in evidenza. Con una partita, se il Confidente vi sta a un rango diverso (`a.rangoPartita`) e il suo prossimo evento è un altro
// (`a.dialogoPartita`), sotto c'è il rimando alle risposte di quell'evento (aperte da sole se la voce non ha un rango atteso).
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
            <span className={`flex-1 min-w-0 ${s.romantica ? 'text-primary' : ''}`}>{s.testo}{s.romantica ? ' (relazione romantica)' : ''}</span>
            {valore && <span className={`chip text-[11px] ${top ? 'chip--attivo' : ''}`}>{valore}</span>}
          </li>
        );
      })}
    </ol>
  );
}

/** Il blocco delle risposte migliori della voce (niente se la voce non ha dialoghi da mostrare). */
export function RisposteVoce({ a }: { a: AzionePercorsoDto }) {
  const [altroAperto, setAltroAperto] = useState(false);
  const d = a.dialogo;
  const dp = a.dialogoPartita;
  if (!d && !dp) return null;
  // senza dialogo della voce, quello della partita è il blocco principale
  const principale = d ?? dp!;
  const secondario = d ? dp : undefined;
  return (
    <div className="risposte-voce" role="group" aria-label={`Risposte migliori, evento del rango ${principale.rango}`}>
      <span className="risposte-voce__titolo">
        {d ? `Level up al rango ${d.rango} · risposte migliori` : `Prossimo level up nella tua partita · rango ${principale.rango}`}
      </span>
      {principale.note && <span className="text-[12px] text-text-muted">{principale.note}</span>}
      <ScelteEvento d={principale} />
      {d && a.rangoPartita !== undefined && a.rangoPartita + 1 !== d.rango && (
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
