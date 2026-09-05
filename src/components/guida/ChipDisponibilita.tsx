// ============================================================
// ChipDisponibilita — stato di un articolo o di un negozio alla data corrente della partita (Fase 15.18)
// ============================================================
//
// Bloccato: la guida pone una condizione che la partita non soddisfa (data, Palazzo, Dote, rango di un Confidente, richiesta,
// meteo, giorno, stagione). Da verificare: condizione che l'app non sa leggere dai dati («dopo aver pescato una volta»).
// Disponibile: nessun chip, per non sporcare l'elenco. Il titolo riporta ogni requisito con il suo dettaglio.
// ============================================================

import type { DisponibilitaDto } from '../../types';
import { IconaAzione } from '../shared/IconaAzione';
import { motiviDisponibilita } from '../../utils/disponibilita';

export function ChipDisponibilita({ disponibilita: d, compatto }: { disponibilita: DisponibilitaDto | undefined; compatto?: boolean }) {
  if (!d || d.stato === 'disponibile') return null;
  const motivi = motiviDisponibilita(d);
  if (d.stato === 'bloccato') {
    return (
      <span className={`chip chip--icona chip--bloccata ${compatto ? 'text-[11px]' : ''}`} title={motivi} aria-label={`Non ancora disponibile: ${motivi}`}>
        <IconaAzione chiave="bloccato" dimensione={compatto ? 12 : 14} />Non ancora
      </span>
    );
  }
  return (
    <span className={`chip chip--icona ${compatto ? 'text-[11px]' : ''}`} title={motivi} aria-label={`Da verificare: ${motivi}`}>
      <IconaAzione chiave="aperti" dimensione={compatto ? 12 : 14} />Da verificare
    </span>
  );
}
