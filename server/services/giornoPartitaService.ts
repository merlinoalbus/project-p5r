// ============================================================
// giornoPartitaService — l'unica regola che cambia il giorno di gioco di una partita (R10-16)
// ============================================================
//
// Tutte le strade passano da qui: «Segna come giorno corrente» (Oggi, Home e Guida giorno per giorno: `PUT /partite/:id/giorno`),
// il Calendario e la correzione manuale nel Riepilogo (`PUT /partite/:id` con `dataGioco`) e il cambio automatico alla spunta
// dell'ultima attività (`avanzaSeGiornoCompleto`). La regola:
//   1. il giorno deve esistere nel percorso (404 `giorno-non-trovato`); solo la data tolta (`null`) salta il controllo;
//   2. un giorno nuovo comincia di mattina: la fascia torna a «giorno»; rimarcare lo stesso giorno non cambia nulla;
//   3. il cambio entra nello storico, nella stessa transazione;
//   3b. la Fortuna di Chihaya accesa finisce (`chiudiFortunaPerCambioGiorno`), nella stessa transazione;
//   4. i suggerimenti del giorno si leggono dalla data di gioco (`suggerimentiOggi`): non hanno copia da aggiornare lato server, e il
//      client li rilegge a ogni partita restituita con un giorno diverso (`aggiornaLocale` in `partitaStore`).
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { verificaPartita } from './verificaPartita.js';
import { registraEvento } from './storicoService.js';
import { chiudiFortunaPerCambioGiorno } from './fortunaService.js';

/** Come si presenta il cambio nello storico: titolo e dettaglio di default se la strada non ne ha di suoi. */
export interface DescrizioneCambioGiorno {
  titolo?: string;
  dettaglio?: string;
}

/** Il cambio avvenuto: `cambiato` è falso se il giorno era già quello (nessuna modifica, nessun evento). */
export interface EsitoCambioGiorno {
  cambiato: boolean;
  da: string | null;
  a: string | null;
}

/** Cambia il giorno di gioco della partita secondo la regola unica; restituisce se e come è cambiato. */
export function cambiaGiornoPartita(partitaId: number, data: string | null, descrizione: DescrizioneCambioGiorno = {}): EsitoCambioGiorno {
  verificaPartita(partitaId);
  return getDb().transaction((): EsitoCambioGiorno => {
    const da = (prepared('SELECT data_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null }).data_gioco;
    // lo stesso giorno non è un cambio: nemmeno il controllo (un salvataggio del Riepilogo rimanda la data com'è)
    if (da === data) return { cambiato: false, da, a: data };
    if (data !== null && !prepared('SELECT 1 FROM giorno WHERE data = ?').get(data)) {
      throw httpErrors.notFound('giorno-non-trovato', `Nessun giorno del percorso il ${data}.`);
    }
    prepared("UPDATE partita SET data_gioco = ?, fascia_gioco = 'giorno', updated_at = ? WHERE id = ?").run(data, nowIso(), partitaId);
    registraEvento(
      partitaId, 'percorso',
      descrizione.titolo ?? (data ? `Giorno di gioco: ${data}` : 'Giorno di gioco tolto'),
      descrizione.dettaglio ?? (data ? `La partita passa da ${da ?? 'nessun giorno'} al ${data}, di giorno.` : `Il giorno di gioco ${da ?? ''} è stato tolto.`),
      { da, a: data },
    );
    chiudiFortunaPerCambioGiorno(partitaId);
    return { cambiato: true, da, a: data };
  })();
}
