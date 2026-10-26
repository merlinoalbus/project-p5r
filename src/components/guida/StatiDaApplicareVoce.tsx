// ============================================================
// StatiDaApplicareVoce — gli effetti di stato aggiunti DOPO la spunta, con il gesto esplicito «Applica alla partita» (2026-10-26)
// ============================================================
//
// Richiesta dell'utente: «se seleziono l'effetto Persona Registrata mi aspetto che sul Compendio risulti flaggata la persona selezionata».
// La voce dello screenshot era già spuntata: gli effetti di stato (Persona nel compendio e in scorta, trofeo, evento, domanda…) si applicavano
// solo spuntando, quindi aggiunti dopo non facevano niente, senza dirlo. Ora la voce li elenca finché la partita non li ha e li applica solo
// da questo pulsante (nessuna scrittura da sola): togliendo la spunta tornano come gli altri effetti della voce.
// ============================================================

import { useLayoutEffect, useRef, useState } from 'react';
import { applicaStatiVoce } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { useSuggerimentiStore } from '../../stores/suggerimentiStore';
import { segnalaMutazioneEffetti } from '../../services/gestiPartita';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import type { AzionePercorsoDto } from '../../types';

interface Props {
  a: AzionePercorsoDto;
  partitaId: number;
  onCambiata: (a: AzionePercorsoDto) => void;
  bloccata?: boolean;
}

export function StatiDaApplicareVoce({ a, partitaId, onCambiata, bloccata }: Props) {
  const [occupato, setOccupato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const blocco = useRef(false);
  const vivo = useRef(true);
  useLayoutEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);
  const stati = a.statiDaApplicare ?? [];
  if (!stati.length) return null;
  const applica = async () => {
    if (blocco.current) return;
    blocco.current = true; setOccupato(true); setErrore(null);
    try {
      const esito = await applicaStatiVoce(partitaId, a.uid);
      segnalaMutazioneEffetti(partitaId);
      useSuggerimentiStore.getState().invalida();
      if (esito.applicati.length) notifica('success', `Applicato alla partita: ${esito.applicati.join(' · ')}.`);
      if (esito.nonApplicati.length) notifica('warning', esito.nonApplicati.map((x) => `${x.descrizione}: ${x.motivo}`).join(' '), 9000);
      if (vivo.current) onCambiata(esito.voce);
    } catch (e) {
      if (vivo.current) setErrore(e instanceof Error ? e.message : 'Effetti non applicati.');
    } finally { blocco.current = false; if (vivo.current) setOccupato(false); }
  };
  return (
    <section className="flex min-w-0 basis-full flex-col gap-1.5 rounded border border-warning p-2 testo-13" aria-label="Effetti non ancora applicati in questa partita">
      <p className="m-0 text-pretty">Aggiunti dopo la spunta, non ancora in questa partita:</p>
      <ul className="m-0 flex list-disc flex-col gap-0.5 pl-5">
        {stati.map((s) => <li key={`${s.effettoUid}:${s.scorta ? 'scorta' : 'stato'}`} className="break-words text-pretty">{s.descrizione}</li>)}
      </ul>
      <PulsanteVisivo tono="primario" compatto className="self-start" icona={<IconaAzione chiave="raggiunto" dimensione={20} />} titolo="Applica alla partita"
        aria-label={`Applica alla partita: ${stati.map((s) => s.descrizione).join(', ')}`} disabled={occupato || bloccata} onClick={() => void applica()} />
      {errore && <p role="alert" className="m-0 testo-12 text-error-testo">{errore}</p>}
    </section>
  );
}
