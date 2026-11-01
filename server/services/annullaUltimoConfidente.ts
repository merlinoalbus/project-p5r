// ============================================================
// annullaUltimoConfidente — «Annulla ultimo» del cassetto del Confidente, dallo storico (L10-05)
// ============================================================
//
// Toglie l'ultima registrazione annullabile del Confidente (`ultimoAnnullabileConfidente.ts`), solo se è ancora quella che la pagina ha visto
// (`evento`): un'altra scheda che l'ha già annullata, o una registrazione nuova nel frattempo, danno 409 `niente-da-annullare` e nulla cambia.
// Le vie dell'annullo sono quelle di sempre, con le loro ricevute:
//   - punti di una risposta o di un'uscita: `aggiornaConfidenteDallaPagina` con i punti in meno, che toglie anche l'incontro registrato dalle
//     risposte di quel momento se i punti tornano quelli di prima (il momento è quello dell'evento); poi l'evento esce dallo storico;
//   - regalo: `annullaRegalo` sulla sua consegna (punti, acquisto segnato, yen scalati ed evento).
// Tutto in una transazione.
// ============================================================

import { getDb, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { verificaPartita } from './verificaPartita.js';
import { aggiornaConfidenteDallaPagina } from './incontriService.js';
import { annullaRegalo } from './regaloAzioneService.js';
import { confidente as confidenteDellaPartita } from './partiteService.js';
import { ultimoAnnullabile } from './ultimoAnnullabileConfidente.js';
import type { AnnulloUltimoConfidenteDto } from '../../shared/types.js';

/** Annulla l'ultima registrazione annullabile del Confidente, se è ancora l'evento `evento` scritto in `creatoIl` (gli id dello storico si riusano:
 *  l'id da solo, dopo un annullo fatto da un'altra scheda, potrebbe essere già quello di una registrazione nuova mai vista). */
export function annullaUltimoDelConfidente(partitaId: number, chiave: string, evento: number, creatoIl: string): AnnulloUltimoConfidenteDto {
  verificaPartita(partitaId);
  confidenteDellaPartita(partitaId, chiave); // 404 per partita o Confidente che non esistono
  return getDb().transaction((): AnnulloUltimoConfidenteDto => {
    const ultimo = ultimoAnnullabile(partitaId, chiave);
    if (!ultimo || ultimo.evento !== evento || ultimo.creatoIl !== creatoIl) {
      throw httpErrors.conflict('niente-da-annullare', 'Non c’è più niente da annullare per questo Confidente: l’ultima registrazione è cambiata.', { ultimoAnnullabile: ultimo });
    }
    if (ultimo.tipo === 'regalo') {
      const esito = annullaRegalo(partitaId, chiave, ultimo.regalo!, ultimo.consegna);
      return { confidente: esito.confidente, annullato: { tipo: 'regalo', punti: -esito.punti, regalo: ultimo.regalo } };
    }
    const dati = JSON.parse((prepared('SELECT dati_json FROM utente.evento_partita WHERE id = ? AND partita_id = ?').get(ultimo.evento, partitaId) as { dati_json: string }).dati_json) as { data?: unknown; fascia?: unknown };
    const momento = typeof dati.data === 'string' && typeof dati.fascia === 'string' ? { data: dati.data, fascia: dati.fascia } : undefined;
    const agg = aggiornaConfidenteDallaPagina(partitaId, chiave, { deltaPunti: -ultimo.punti }, momento);
    prepared('DELETE FROM utente.evento_partita WHERE id = ? AND partita_id = ?').run(ultimo.evento, partitaId);
    // tolto l'evento, l'ultima annullabile è quella di prima (se i punti sono tornati quelli di allora)
    return { confidente: { ...agg, ultimoAnnullabile: ultimoAnnullabile(partitaId, chiave) }, annullato: { tipo: 'punti', punti: ultimo.punti } };
  })();
}
