// ============================================================
// StatiDaApplicareVoce — gli effetti di stato che una voce già spuntata non ha ancora dato alla partita, con «Applica» (decisione 19)
// ============================================================
//
// Richiesta dell'utente: «se seleziono l'effetto Persona Registrata mi aspetto che sul Compendio risulti flaggata la persona selezionata».
// Decisione 19 (risposte «Subito al salvataggio» e «Elenco da approvare»): gli effetti di stato salvati su una voce già spuntata entrano
// subito nella partita (lo fa il salvataggio); quelli delle spunte di prima mai applicati, gli articoli (muovono yen) e ciò che il gioco non
// permetteva ancora restano qui, voce per voce, e si applicano solo con «Applica»: uno per uno, o tutti insieme. Sotto ogni effetto c'è ciò
// che il gesto fa intorno: la versione di prima che esce («Arsène esce dal Compendio») e gli yen che si scalano da soli. Togliendo la spunta
// tornano come gli altri effetti della voce.
// ============================================================

import { useId, useLayoutEffect, useRef, useState } from 'react';
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
  const idTitolo = useId();
  useLayoutEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);
  const stati = a.statiDaApplicare ?? [];
  if (!stati.length) return null;
  /** `effetti`: gli uid degli effetti da applicare; senza, tutti quelli elencati. */
  const applica = async (effetti?: string[]) => {
    if (blocco.current) return;
    blocco.current = true; setOccupato(true); setErrore(null);
    try {
      const esito = await applicaStatiVoce(partitaId, a.uid, effetti);
      segnalaMutazioneEffetti(partitaId);
      useSuggerimentiStore.getState().invalida();
      if (esito.applicati.length) notifica('success', `Applicato alla partita: ${esito.applicati.join(' · ')}.`);
      // gli avvisi restano finché chi gioca non li chiude (la durata predefinita degli avvisi)
      if (esito.avvisi.length) notifica('warning', esito.avvisi.join(' '));
      if (esito.nonApplicati.length) notifica('warning', esito.nonApplicati.map((x) => `${x.descrizione}: ${x.motivo}`).join(' '));
      if (vivo.current) onCambiata(esito.voce);
    } catch (e) {
      if (vivo.current) setErrore(e instanceof Error ? e.message : 'Effetti non applicati.');
    } finally { blocco.current = false; if (vivo.current) setOccupato(false); }
  };
  const fermo = occupato || bloccata;
  const piu = stati.length > 1;
  return (
    <div role="group" aria-labelledby={idTitolo} className="flex min-w-0 basis-full flex-col gap-1.5 rounded border border-warning p-2 testo-13">
      <p id={idTitolo} className="m-0 text-pretty">Non ancora in questa partita:</p>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {stati.map((s) => (
          <li key={s.effettoUid} className="flex min-w-0 flex-wrap items-start gap-2">
            <div className="flex min-h-11 min-w-0 flex-1 basis-48 flex-col justify-center">
              <span className="break-words text-pretty">{s.descrizione}</span>
              {!!s.dettagli?.length && (
                <ul className="m-0 flex list-disc flex-col gap-0.5 pl-5 testo-12 text-text-secondary">
                  {s.dettagli.map((d) => <li key={d} className="break-words text-pretty">{d}</li>)}
                </ul>
              )}
            </div>
            <PulsanteVisivo tono={piu ? 'secondario' : 'primario'} compatto icona={<IconaAzione chiave="raggiunto" dimensione={20} />} titolo="Applica"
              aria-label={`Applica alla partita: ${s.descrizione}`} disabled={fermo} onClick={() => void applica([s.effettoUid])} />
          </li>
        ))}
      </ul>
      {piu && <PulsanteVisivo tono="primario" compatto className="self-start" icona={<IconaAzione chiave="tutti" dimensione={20} />} titolo="Applica tutti"
        aria-label={`Applica alla partita tutti e ${stati.length}`} disabled={fermo} onClick={() => void applica()} />}
      {errore && <p role="alert" className="m-0 testo-12 text-error-testo">{errore}</p>}
    </div>
  );
}
