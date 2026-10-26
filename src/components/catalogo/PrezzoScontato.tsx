// ============================================================
// PrezzoScontato — il prezzo con lo sconto del negozio legato al rango di un Confidente (chiusura dell'ondata 5, revisione B1)
// ============================================================
//
// Lo sconto è un dato del negozio (`negozio.sconto_json`, la Clinica di Takemi a metà prezzo dal rango indicato) e il prezzo scontato lo calcola
// il server (`prezzoScontato` dell'offerta, con la partita): è l'importo che l'acquisto scala. Si dice con lo stesso testo ovunque si compra —
// listino del negozio, pin della mappa (pieno e compatto), «Dove si compra» della scheda dell'oggetto — perché l'importo pagato corrisponda
// sempre a un prezzo visibile. Senza sconto attivo, dove serve, si dice la regola del negozio (da quale rango di quale Confidente vale).
// ============================================================

import { testoSconto } from '../../../shared/scontiNegozi';
import type { ArticoloDto, NegozioRiassuntoDto } from '../../types';

/** «Con lo sconto del 50%: 1.700 ¥», solo se lo sconto vale adesso nella partita. */
export function PrezzoScontato({ scontato, className = '' }: { scontato: ArticoloDto['prezzoScontato']; className?: string }) {
  if (!scontato) return null;
  return <span className={`testo-12 tabular-nums text-pretty text-text-secondary ${className}`}>Con lo sconto del {scontato.percentuale}%: {scontato.prezzo.toLocaleString('it-IT')} ¥</span>;
}

/** Il prezzo scontato se vale adesso; altrimenti la regola dello sconto del negozio («Sconto del 50% dal rango 7 di Takemi»), se il negozio ne ha una. */
export function ScontoDellOfferta({ scontato, sconto, className = '' }: { scontato: ArticoloDto['prezzoScontato']; sconto: NegozioRiassuntoDto['sconto'] | undefined; className?: string }) {
  if (scontato) return <PrezzoScontato scontato={scontato} className={className} />;
  if (!sconto) return null;
  return <span className={`testo-12 text-pretty text-text-muted ${className}`}>{testoSconto(sconto, sconto.confidenteNome)}</span>;
}
