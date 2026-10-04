// ============================================================
// SelettoreData — un giorno del calendario di gioco (MM-GG) scelto con giorno e mese, niente da digitare
// ============================================================
//
// Nato nell'editor delle condizioni dei pin; dal 2026-10-04 serve anche alla finestra e alle regole d'atterraggio dei Palazzi
// sulla mappa di Tokyo, e sta qui per servire a tutti e due.
// ============================================================

import { GIORNI_NEL_MESE, MESI_GIOCO } from '../../../shared/condizioniSpillo';
import { Selettore } from './Selettore';

/** Giorno e mese del calendario di gioco; i giorni offerti sono quelli del mese scelto (niente 31 aprile). */
export function SelettoreData({ etichetta, valore, onCambia, disabilitato }: { etichetta: string; valore: string; onCambia: (v: string) => void; disabilitato?: boolean }) {
  const [mese, giorno] = valore.split('-');
  const giorni = Array.from({ length: GIORNI_NEL_MESE[mese] ?? 31 }, (_, i) => String(i + 1).padStart(2, '0'));
  /** Cambia il mese tenendo il giorno, ma lo riduce all'ultimo del nuovo mese se lo supera (31 marzo → 30 aprile). */
  const cambiaMese = (nuovoMese: string) => {
    const massimo = GIORNI_NEL_MESE[nuovoMese] ?? 31;
    onCambia(`${nuovoMese}-${String(Math.min(Number(giorno), massimo)).padStart(2, '0')}`);
  };
  return (
    <span className="condizione-data" role="group" aria-label={etichetta}>
      <Selettore compatto ricerca="mai" etichetta={`${etichetta}: giorno`} valore={giorno} disabilitato={disabilitato} opzioni={giorni.map((g) => ({ chiave: g, nome: String(Number(g)) }))} onCambia={(g) => onCambia(`${mese}-${g}`)} />
      <Selettore compatto ricerca="mai" etichetta={`${etichetta}: mese`} valore={mese} disabilitato={disabilitato} opzioni={MESI_GIOCO.map((m) => ({ chiave: m.numero, nome: m.nome }))} onCambia={cambiaMese} />
    </span>
  );
}
