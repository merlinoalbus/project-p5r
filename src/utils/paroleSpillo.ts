// ============================================================
// paroleSpillo — come si chiama e come si dice lo stato di un pin nel visore e nella sua scheda (`VisoreMappa`, `SchedaSpillo`)
// ============================================================

import type { SchedaContenutoGuidaDto } from '../../shared/organizzazioneMappe';
import { categoriaSpillo, parolaDelloStato } from '../../shared/spilli';
import { arrivoSpillo, nomeMetaSpillo } from './navigazioneMappa';
import type { SpilloDto } from '../types';

/** Come si chiama un pin nell'etichetta, negli elenchi e nella scheda: un passaggio col nome del posto in cui porta, letto dal vivo
 *  (L2, decisione dell'utente: «chiamandolo con il suo nome… e non con mappa»); gli altri col loro nome. Il nome proprio di un
 *  passaggio, se diverso, resta come nota nella scheda. */
export const nomePin = (s: SpilloDto | SchedaContenutoGuidaDto) => ('mappaChiave' in s ? nomeMetaSpillo(s) : null) ?? s.nome;

/** La parola di un pin segnato: lo stato delle sue voci della guida («ottenuto», «esaurito») se ne ha — quello comune, o «segnato»
 *  se differiscono (098) —, che è anche quello dei pulsanti, altrimenti quella del tipo («raccolto», «aperto», «parlato»…). */
export function parolaSegnato(s: SpilloDto | SchedaContenutoGuidaDto): string {
  const stati = [...new Set(s.voci.map((v) => v.stato))];
  if (stati.length === 0) return parolaDelloStato(s);
  return stati.length === 1 && stati[0] ? stati[0] : 'segnato';
}

/** Il segno D15 di un pin nell'elenco: nessuno se non è segnato, il cerchio barrato se le sue voci sono tutte «esaurito», la spunta
 *  altrimenti (come `parolaSegnato`). */
export function segnoSpillo(s: SpilloDto): 'fatto' | 'esaurito' | null {
  if (!s.raccolto) return null;
  return parolaSegnato(s) === 'esaurito' ? 'esaurito' : 'fatto';
}

/** Un pin di spostamento con un arrivo raggiungibile (porta, scala, rampino, passaggio…): serve a spostarsi e non si segna, nemmeno con
 *  le voci della guida che ha (richiesta dell'utente, 2026-10-20, strada (b) del PM): quelle si segnano dalla guida. */
export function passaggioConArrivo(s: SpilloDto | SchedaContenutoGuidaDto): boolean {
  return 'mappaChiave' in s && categoriaSpillo(s.tipo) === 'spostamento' && !s.destinazioneNonDisponibile && arrivoSpillo(s) !== null;
}
