// ============================================================
// ChipDisponibilita — stato di un articolo o di un negozio alla data corrente della partita (Fase 15.18)
// ============================================================
//
// Bloccato: la guida pone una condizione che la partita non soddisfa (data, Palazzo, Dote, rango di un Confidente, richiesta,
// meteo, giorno, stagione). Da verificare: condizione che l'app non sa leggere dai dati («dopo aver pescato una volta»).
// Disponibile: nessun chip, per non sporcare l'elenco. Il titolo riporta ogni requisito con il suo dettaglio.
// ============================================================

import type { DisponibilitaDto } from '../../types';
import { IconaAzione, IconaSegno } from '../shared/IconaAzione';
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
  // **«Da verificare» non vuol dire niente per una condizione che l'app capisce benissimo.**
  //
  // L'etichetta era una sola per tutto quello che non e' ne' disponibile ne' bloccato, e nata per
  // un caso solo: la condizione che l'app **non sa leggere** — «dopo aver pescato una volta»,
  // scritta in prosa nella guida. Li' «da verificare» e' onesto: va guardato a mano.
  //
  // Ma «Yusuke Kitagawa in squadra» l'app la capisce: sa che cosa serve e dove sta scritto. Quello
  // che manca non e' una verifica, e' il **dato** — nella partita quel Ladro non e' ancora stato
  // segnato. Dire «da verificare» mandava a controllare cosa, e come? Qui si dice invece che cosa
  // fare, e il titolo porta il dettaglio con la pagina dove si segna.
  const nonLeggibili = (d.requisiti ?? []).some((r) => r.stato === 'grigio' && (r.tipo === 'manuale'));
  return nonLeggibili ? (
    <span className={`chip chip--icona ${compatto ? 'text-[11px]' : ''}`} title={motivi} aria-label={`Da verificare: ${motivi}`}>
      <IconaSegno chiave="da-verificare" dimensione={compatto ? 12 : 14} />Da verificare
    </span>
  ) : (
    <span className={`chip chip--icona ${compatto ? 'text-[11px]' : ''}`} title={motivi} aria-label={`Da segnare nella partita: ${motivi}`}>
      <IconaSegno chiave="da-verificare" dimensione={compatto ? 12 : 14} />Da segnare
    </span>
  );
}
