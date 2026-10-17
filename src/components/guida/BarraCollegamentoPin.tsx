// ============================================================
// BarraCollegamentoPin — sopra la mappa principale della scheda del Palazzo, mentre si collegano i pin di una voce della guida
// ============================================================
//
// Richiesta dell'utente (2026-10-18): «Scegliere dalla mappa principale e non dalla mappa in piccolo che compare nel riquadro di
// collegamento del pin… Perchè sdoppiare la mappa? Per altro in questa modalità sarebbe utile visualizzare tutti i pin sulla
// mappa anche quelli nascosti perchè completati in altre aree». Scelta: «i pin nascosti in un altro colore». La mappa principale
// passa in modalità scelta (tutti i pin, i nascosti sbiaditi); qui stanno per chi si sceglie, quanti sono collegati, la
// planimetria (tutte quelle del Palazzo, prima quelle dell'area), la ricerca e «Fatto».
// ============================================================

import { Selettore } from '../shared/Selettore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import type { CollegamentoPin } from './GuidaDellArea';

interface Props {
  collegamento: CollegamentoPin;
  /** La planimetria mostrata e il suo cambio. */
  mappa: string;
  onMappa: (chiave: string) => void;
  ricerca: string;
  onRicerca: (testo: string) => void;
}

/**
 * La barra: «Pin di «voce» · N collegati», planimetria (compatta), ricerca e «Fatto». Sta sopra la mappa anche nella colonna stretta
 * di 1280 px (242 px): per questo la spiegazione del tocco e dei pin grigi la dice la voce, nella colonna accanto, e qui no.
 */
export function BarraCollegamentoPin({ collegamento, mappa, onMappa, ricerca, onRicerca }: Props) {
  const n = collegamento.scelti.size;
  return (
    <section className="scelta-pin" aria-label={`Collegamento dei pin a ${collegamento.nome}`}>
      <p className="m-0 text-[12px] leading-snug">
        Pin di <strong>«{collegamento.nome}»</strong> · <strong>{n === 1 ? '1 collegato' : `${n} collegati`}</strong>
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="min-w-[180px] flex-[2]">
          <Selettore compatto etichetta="Planimetria" valore={mappa} opzioni={[...collegamento.opzioniMappa]} onCambia={onMappa} />
        </span>
        <label className="min-w-[120px] flex-1">
          <span className="sr-only">Cerca un pin sulla mappa</span>
          <input type="search" className="form-input" placeholder="Cerca un pin…" value={ricerca} onChange={(e) => onRicerca(e.target.value)} />
        </label>
        <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Fatto" aria-label="Fatto: chiudi il collegamento dei pin" onClick={collegamento.onFine} />
      </div>
    </section>
  );
}
