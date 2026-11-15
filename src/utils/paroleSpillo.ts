// ============================================================
// paroleSpillo — come si chiama e come si dice lo stato di un pin nel visore e nella sua scheda (`VisoreMappa`, `SchedaSpillo`)
// ============================================================

import type { SchedaContenutoGuidaDto } from '../../shared/organizzazioneMappe';
import { categoriaSpillo, parolaDelloStato } from '../../shared/spilli';
import { arrivoSpillo, nomeMetaSpillo } from './navigazioneMappa';
import type { SpilloDto } from '../types';

/** Vero se il nome del pin non dice niente di suo: vuoto, «Mappa», o il nome del suo tipo («Passaggio», «Scala», «Uscita»). */
function nomeGenerico(s: SpilloDto | SchedaContenutoGuidaDto): boolean {
  const nome = s.nome.trim().toLowerCase();
  return nome === '' || nome === 'mappa' || nome === s.tipoNome.trim().toLowerCase();
}

/** Come si chiama un pin nell'etichetta, negli elenchi e nella scheda: col suo nome («Salta giù», «Scendi a Livello 0»), che è quello
 *  scritto dall'utente (richiesta del 2026-11-15: i pin di navigazione mostrano il nome del pin, non il posto d'arrivo). Solo un
 *  passaggio senza un nome suo («Mappa», «Passaggio») prende il nome del posto in cui porta, letto dal vivo (decisione del
 *  2026-10-20: «chiamandolo con il suo nome… e non con mappa»). Dove porta lo dice sempre «Vai: …» nella scheda del pin. */
export const nomePin = (s: SpilloDto | SchedaContenutoGuidaDto) => (nomeGenerico(s) && 'mappaChiave' in s ? nomeMetaSpillo(s) : null) ?? s.nome;

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
