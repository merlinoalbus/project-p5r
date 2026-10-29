import { condizioneEffettivaArea } from '../condizioni/condizioneEffettiva.js';
import { nomiCondizioniMemo } from '../condizioni/nomiCondizioni.js';
import { statoDisponibilitaPartita } from '../disponibilitaService.js';
import { valutaInsieme } from '../condizioni/valutatore.js';
import { condizioneConTesto, type RequisitoSpillo } from '../../../shared/condizioniSpillo.js';
import type { RigaArea } from './casaMappa.js';

/** Un'Area del mondo è raggiungibile solo quando è aperto il quartiere che la contiene e, se ne ha una, vale la sua condizione propria
 *  (`area.condizioni_json`, migrazione 303: il Covo dei Ladri dal 5 maggio). Senza partita è sempre raggiungibile. */
export function areaDisponibilePerPartita(a: Pick<RigaArea, 'quartiere_chiave' | 'condizioni_json'> & { chiave?: string | null }, partitaId?: number): boolean {
  if (partitaId === undefined) return true;
  // senza quartiere e senza condizione propria (le Aree dei Palazzi e della città, di norma) non c'è nulla da valutare: com'era prima
  // della 303, senza leggere inviti né righe per ognuna delle loro planimetrie (l'indice delle Mappe ne conta centinaia)
  if (!a.quartiere_chiave && (a.condizioni_json === null || (a.condizioni_json === undefined && !a.chiave))) return true;
  const condizioni = condizioneEffettivaArea(a);
  if (!condizioni) return true;
  const nomi = nomiCondizioniMemo();
  const esito = valutaInsieme(condizioni.map((c: RequisitoSpillo) => condizioneConTesto(c, nomi)), statoDisponibilitaPartita(partitaId));
  return esito.stato !== 'bloccato';
}
