// ============================================================
// ChipDisponibilita — stato di un articolo o di un negozio alla data corrente della partita (Fase 15.18)
// ============================================================
//
// Bloccato: la guida pone una condizione che la partita non soddisfa (data, Palazzo, Dote, rango di un Confidente, richiesta,
// meteo, giorno, stagione). Da verificare: condizione che l'app non sa leggere dai dati («dopo aver pescato una volta»).
// Disponibile: nessun chip, per non sporcare l'elenco. Il titolo riporta ogni requisito con il suo dettaglio.
// ============================================================

import { Link } from 'react-router-dom';
import type { DisponibilitaDto } from '../../types';
import { IconaAzione, IconaSegno } from '../shared/IconaAzione';
import { motiviDisponibilita } from '../../utils/disponibilita';

/** Dove si va per segnare quel che manca: la scheda della Partita che tiene quel dato.
 *
 * Non e' una pagina sola perche' non e' un dato solo — un Ladro in squadra si segna in «Denaro e
 * squadra», un rango di Confidente altrove — e mandare tutti nello stesso posto vorrebbe dire far
 * cercare a mano proprio quello che il cartellino prometteva di risparmiare. */
function destinazione(grigi: DisponibilitaDto['requisiti']): string {
  const tipo = grigi[0]?.tipo;
  switch (tipo) {
    case 'squadra': return '/partita?scheda=squadra';
    case 'confidente': return '/partita?scheda=confidenti';
    case 'dote': return '/partita?scheda=doti';
    case 'persona-arcano': case 'persona-abilita': return '/partita?scheda=scorta';
    case 'richiesta': return '/guida/richieste';
    default: return '/partita?scheda=oggi';
  }
}

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
  // **Il cartellino parla di questa riga, non di quella sopra.** Un articolo eredita le condizioni
  // del negozio — a bottega chiusa non si compra niente — ma se l'unica cosa in sospeso e' del
  // negozio, l'avviso e' gia' scritto sul negozio, tre righe piu' su. Ripeterlo su ogni articolo
  // riempiva il pannello di cartellini identici, e un elenco dove tutto e' segnalato non segnala
  // piu' niente: sembrava che i tre articoli avessero un problema ciascuno, e non ne avevano.
  const proprie = (d.requisiti ?? []).filter((r) => !r.daNegozio);
  const grigiProprie = proprie.filter((r) => r.stato === 'grigio');
  if (grigiProprie.length === 0 && proprie.every((r) => r.stato !== 'rosso')) return null;
  const nonLeggibili = grigiProprie.some((r) => r.tipo === 'manuale');
  return nonLeggibili ? (
    <span className={`chip chip--icona ${compatto ? 'text-[11px]' : ''}`} title={motivi} aria-label={`Da verificare: ${motivi}`}>
      <IconaSegno chiave="da-verificare" dimensione={compatto ? 12 : 14} />Da verificare
    </span>
  ) : (
    // **Un avviso che dice «segna» e non porta dove si segna e' mezzo avviso.** Il dettaglio
    // nominava la pagina — «Partita → Denaro e squadra» — ma restava testo in un `title`: bisognava
    // leggerlo, ricordarselo e cercarsela a mano. Qui il cartellino e' il collegamento.
    <Link to={destinazione(grigiProprie)} className={`chip chip--icona no-underline ${compatto ? 'text-[11px]' : ''}`} title={motivi} aria-label={`Da segnare nella partita: ${motivi}`}>
      <IconaSegno chiave="da-verificare" dimensione={compatto ? 12 : 14} />Da segnare
    </Link>
  );
}
