// ============================================================
// CondizioniSpillo — le condizioni di uno spillo nel visore, con i semafori della partita
// ============================================================
//
// Con una partita attiva ogni condizione porta il semaforo del server (verde/rosso/grigio) e la
// sua spiegazione; senza partita si legge il solo testo, che è **generato** dallo stato della
// condizione (`descriviRequisitoSpillo`), non scritto da nessuno. L'editor delle condizioni è
// uno solo per tutta l'app: `guida/CondizioniEditor`.
// ============================================================

import type { CondizioneSpilloDto, DisponibilitaDto, SemaforoRequisitoDto } from '../../types';
import { IconaAzione } from '../shared/IconaAzione';

const COLORE: Record<SemaforoRequisitoDto['stato'], string> = { verde: 'bg-success', rosso: 'bg-error', grigio: 'bg-text-muted' };
const NOME_STATO: Record<SemaforoRequisitoDto['stato'], string> = { verde: 'soddisfatta', rosso: 'non soddisfatta', grigio: 'non verificabile' };

/** Condizioni dello spillo nel visore: con la partita i semafori del server, altrimenti il solo testo. */
export function CondizioniSpilloElenco({ condizioni, disponibilita, compatto }: { condizioni: CondizioneSpilloDto[]; disponibilita?: DisponibilitaDto; compatto?: boolean }) {
  if (condizioni.length === 0) return null;
  const testo = compatto ? 'text-[11px]' : 'text-[12px]';
  return (
    <div className={`flex flex-col gap-0.5 ${testo}`} role="group" aria-label="Condizioni di visibilità">
      <span className="flex items-center gap-1 text-text-muted uppercase tracking-wide text-[10px]"><IconaAzione chiave="bloccato" dimensione={12} />Visibile solo</span>
      <ul className="m-0 p-0 list-none flex flex-col gap-0.5">
        {condizioni.map((c, i) => {
          const esito = disponibilita?.requisiti[i];
          return (
            <li key={`${c.tipo}-${i}`} className="flex items-start gap-1.5">
              {esito && <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${COLORE[esito.stato]}`} role="img" aria-label={`Condizione ${NOME_STATO[esito.stato]}`} title={NOME_STATO[esito.stato]} />}
              <span className="min-w-0 flex-1">
                <span className="block">{c.testo}</span>
                {esito && esito.stato !== 'verde' && <span className="block text-text-muted">{esito.dettaglio}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
