// ============================================================
// SelettoreData — un giorno del calendario di gioco (MM-GG) scelto con giorno e mese, niente da digitare
// ============================================================
//
// Nato nell'editor delle condizioni dei pin; dal 2026-10-04 serve anche alla finestra e alle regole d'atterraggio dei Palazzi
// sulla mappa di Tokyo, e sta qui per servire a tutti e due.
//
// L13 (modelli comuni 2): è l'UNICO modo di dare una data di gioco, ovunque. Prima la disponibilità dei Confidenti, la data della
// partita e l'invito la digitavano a mano («05-18») o ricostruivano mese e giorno con due selettori propri. Ora:
//  - `facoltativa` aggiunge «nessuna» (mese vuoto = nessuna data, valore '') per i campi che possono restare vuoti;
//  - il valore vuoto o non valido non produce più «undefined-NaN»: i selettori mostrano «mese» / «giorno» come segnaposto, il giorno
//    resta spento finché non c'è il mese, e scegliendo il mese il giorno parte dal 1 (o resta quello di prima, ridotto all'ultimo del mese);
//  - il formato del valore non cambia: sempre 'MM-GG' (anno scolastico aprile-marzo, febbraio di 28 giorni), o '' per «nessuna».
// ============================================================

import { GIORNI_NEL_MESE, MESI_GIOCO, dataValida } from '../../../shared/condizioniSpillo';
import { Selettore } from './Selettore';

interface Props {
  etichetta: string;
  valore: string;
  onCambia: (v: string) => void;
  disabilitato?: boolean;
  /** Si può non dare nessuna data: il selettore del mese offre «nessuna» e scegliendola il valore diventa ''. */
  facoltativa?: boolean;
}

/** Giorno e mese del calendario di gioco; i giorni offerti sono quelli del mese scelto (niente 31 aprile). */
export function SelettoreData({ etichetta, valore, onCambia, disabilitato, facoltativa }: Props) {
  // un valore che non è una data del calendario (vuoto o scritto male) si legge come «nessuna scelta»
  const [mese, giorno] = dataValida(valore) ? valore.split('-') : ['', ''];
  const giorni = Array.from({ length: GIORNI_NEL_MESE[mese] ?? 0 }, (_, i) => String(i + 1).padStart(2, '0'));
  /** Cambia il mese tenendo il giorno, ma lo riduce all'ultimo del nuovo mese se lo supera (31 marzo → 30 aprile); senza giorno, il 1. */
  const cambiaMese = (nuovoMese: string) => {
    if (nuovoMese === '') { onCambia(''); return; }
    const massimo = GIORNI_NEL_MESE[nuovoMese] ?? 31;
    onCambia(`${nuovoMese}-${String(Math.min(Math.max(1, Number(giorno) || 1), massimo)).padStart(2, '0')}`);
  };
  return (
    <span className="condizione-data" role="group" aria-label={etichetta}>
      <Selettore compatto ricerca="mai" etichetta={`${etichetta}: giorno`} valore={giorno} disabilitato={disabilitato || mese === ''} segnaposto="giorno" opzioni={giorni.map((g) => ({ chiave: g, nome: String(Number(g)) }))} onCambia={(g) => onCambia(`${mese}-${g}`)} />
      <Selettore compatto ricerca="mai" etichetta={`${etichetta}: mese`} valore={mese} disabilitato={disabilitato} segnaposto="mese" vuoto={facoltativa ? 'nessuna' : undefined} opzioni={MESI_GIOCO.map((m) => ({ chiave: m.numero, nome: m.nome }))} onCambia={cambiaMese} />
    </span>
  );
}
