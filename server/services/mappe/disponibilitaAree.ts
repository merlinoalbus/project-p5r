import { condizioneEffettivaQuartiere } from '../condizioni/condizioneEffettiva.js';
import { nomiCondizioniMemo } from '../condizioni/nomiCondizioni.js';
import { statoDisponibilitaPartita } from '../disponibilitaService.js';
import { valutaInsieme } from '../condizioni/valutatore.js';
import { condizioneConTesto, type RequisitoSpillo } from '../../../shared/condizioniSpillo.js';
import type { RigaArea } from './casaMappa.js';

/** Un'Area del mondo è raggiungibile solo quando è aperto il quartiere che la contiene. */
export function areaDisponibilePerPartita(a: Pick<RigaArea, 'quartiere_chiave'>, partitaId?: number): boolean {
  if (partitaId === undefined || !a.quartiere_chiave) return true;
  const condizioni = condizioneEffettivaQuartiere(a.quartiere_chiave);
  if (!condizioni) return true;
  const nomi = nomiCondizioniMemo();
  const esito = valutaInsieme(condizioni.map((c: RequisitoSpillo) => condizioneConTesto(c, nomi)), statoDisponibilitaPartita(partitaId));
  return esito.stato !== 'bloccato';
}
