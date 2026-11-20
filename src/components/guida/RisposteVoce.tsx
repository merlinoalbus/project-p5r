// ============================================================
// RisposteVoce — fra le note di una voce Confidente del diario, le risposte migliori del suo avanzamento
// ============================================================
//
// Progetto dei Confidenti approvato dall'utente (2026-10-24, tavola 4): guardando la voce dal diario si vedono fra le sue note le
// informazioni per un avanzamento ottimale. Una voce con «Rango atteso N» mostra le scelte dell'evento del rango N (`a.dialogo`) con la
// migliore in evidenza. Con una partita, se il Confidente vi sta a un rango diverso (`a.rangoPartita`) e il suo prossimo evento è un altro
// (`a.dialogoPartita`), sotto c'è il rimando alle risposte di quell'evento. Senza rango atteso («Nessuno») la voce non prevede una salita
// di rango e il blocco non c'è (scelta dell'utente, 2026-10-24).
// Sola lettura: i punti li dà la scelta delle note alla spunta (`SceltaNote`).
// ============================================================

import { useState } from 'react';
import type { AzionePercorsoDto, DialogoVoceDto } from '../../types';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { TestoNote } from '../shared/TestoNote';
import { resaPuntiScelta } from '../../../shared/note';
import { eRangoIntermedio, rangoPrimaDellEvento, testoPassoConfidente, titoloPassoConfidente } from '../../../shared/eventiIntermedi';

/** Le scelte di un evento: la (o le) migliori in evidenza, il valore in note (la resa unica `resaPuntiScelta`, col ramo amore dove la guida lo dà). */
function ScelteEvento({ d }: { d: DialogoVoceDto }) {
  const migliore = Math.max(0, ...d.scelte.map((s) => s.punti ?? 0));
  return (
    <ol className="m-0 p-0 list-none flex flex-col gap-1">
      {d.scelte.map((s) => {
        const top = migliore > 0 && s.punti === migliore;
        const valore = resaPuntiScelta(s);
        return (
          <li key={s.ordine} className={`risposta-voce ${top ? 'risposta-voce--migliore' : ''}`} title={s.avviso ?? undefined}>
            <span className="text-text-muted tabular-nums">{s.ordine}.</span>
            <span className={`flex-1 min-w-0 ${s.romantica ? 'text-primary-testo' : ''}`}>{s.testo}{s.romantica ? ' (relazione romantica)' : ''}</span>
            {valore && <span className={`chip testo-12 ${top ? 'chip--attivo' : ''}`}><TestoNote testo={valore} /></span>}
          </li>
        );
      })}
    </ol>
  );
}

/** Il blocco delle risposte migliori della voce: con un rango atteso, o per la voce che rappresenta un evento intermedio (7.5: il server dà
 *  il dialogo solo in questi due casi; senza, la voce non prevede un passo del Confidente). */
export function RisposteVoce({ a }: { a: AzionePercorsoDto }) {
  const [altroAperto, setAltroAperto] = useState(false);
  const d = a.dialogo;
  if (!d) return null;
  const secondario = a.dialogoPartita;
  const evento = eRangoIntermedio(d.rango);
  // fuori passo: la partita non è al rango da cui si gioca questo evento (7 per il 7.5; per un rango N, N - 1)
  const fuoriPasso = a.rangoPartita !== undefined && (evento ? a.rangoPartita !== rangoPrimaDellEvento(d.rango) : a.rangoPartita + 1 !== d.rango);
  return (
    <div className="risposte-voce" role="group" aria-label={evento ? `Risposte migliori, ${testoPassoConfidente(d.rango)}` : `Risposte migliori, evento del rango ${d.rango}`}>
      <span className="risposte-voce__titolo">{evento ? `${titoloPassoConfidente(d.rango)} · risposte migliori` : <>Avanzamento al rango {d.rango} · risposte migliori</>}</span>
      {d.note && <span className="testo-12 text-text-muted">{d.note}</span>}
      <ScelteEvento d={d} />
      {fuoriPasso && a.rangoPartita !== undefined && (
        <span className="testo-12 text-text-secondary">
          Nella tua partita è al rango {a.rangoPartita}
          {secondario && (
            <>
              {' · '}
              <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="dettagli" dimensione={20} />} titolo={<>{altroAperto ? 'Nascondi' : 'Mostra'} le risposte {eRangoIntermedio(secondario.rango) ? `dell’${testoPassoConfidente(secondario.rango)}` : `del rango ${secondario.rango}`}</>} aria-expanded={altroAperto} onClick={() => setAltroAperto((v) => !v)} />
            </>
          )}
        </span>
      )}
      {secondario && altroAperto && (
        <div className="flex flex-col gap-1">
          <span className="risposte-voce__titolo">{titoloPassoConfidente(secondario.rango)} · il tuo prossimo evento</span>
          <ScelteEvento d={secondario} />
        </div>
      )}
    </div>
  );
}
