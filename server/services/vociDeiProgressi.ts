// ============================================================
// vociDeiProgressi — da quale voce del Diario viene ciò che Partita → Progressi mostra (decisione 8: ogni evento nato da una voce ne dice la provenienza)
// ============================================================
//
// Tre letture, una per sezione, con la stessa forma (`VoceDiProvenienzaDto`, la riga «Già nel Diario: voce del 09/04 · …»):
//   - gli eventi di storia: l'effetto «storia» di una spunta ancora attiva che l'ha segnato davvero (non già vero prima della spunta);
//   - le attività svolte: i turni con il legame esplicito alla voce (`turno_voce_partita`, utente 063) della stessa riga del turno e con la
//     spunta ancora attiva. I turni segnati col + del contatore non hanno voce, anche quando riprendono il numero di un turno tolto;
//   - i contatori delle letture: le letture della ricevuta che la spunta ha portato oltre la soglia del contatore (prima sotto, dopo sopra)
//     e che il contatore conta ancora (`elementiDeiContatori`, la stessa definizione che dà il valore).
// Una ricevuta che non si legge non dà provenienza (la pagina resta leggibile). Le voci sono nell'ordine del Diario, senza ripetizioni.
// ============================================================

import { prepared } from '../db/dbService.js';
import type { ContatoreChiave } from '../../shared/condizioniSpillo.js';
import type { CategoriaLettura } from '../../shared/effettiAzione.js';
import type { EffettiAzioneDto, VoceDiProvenienzaDto } from '../../shared/types.js';
import { leggiRicevutaEffettiAzione } from './effettiAzioneService.js';

/** La categoria di lettura che ogni contatore conta. */
const CATEGORIA_DEL_CONTATORE: Record<ContatoreChiave, CategoriaLettura> = {
  'film-completati': 'film', 'film-con-una-visione': 'film', 'libri-letti': 'libro', 'videogiochi-completati': 'videogioco', 'videogiochi-giocati': 'videogioco',
};

/** Aggiunge la voce all'elenco della chiave, una volta sola. */
function aggiungi(mappa: Map<string, VoceDiProvenienzaDto[]>, chiave: string, voce: VoceDiProvenienzaDto): void {
  const elenco = mappa.get(chiave) ?? [];
  if (!elenco.some((v) => v.uid === voce.uid)) mappa.set(chiave, [...elenco, voce]);
}

/** Una spunta attiva con la sua ricevuta leggibile. */
export type RicevutaAttiva = { voce: VoceDiProvenienzaDto; ricevuta: EffettiAzioneDto };

/** Le spunte attive della partita con la loro ricevuta leggibile, nell'ordine del Diario: si leggono una volta per richiesta e si passano a
 *  `vociDeiContatori`. */
export function ricevuteAttive(partitaId: number): RicevutaAttiva[] {
  const righe = prepared('SELECT v.uid, v.data AS giorno, v.azione AS testo, s.effetti_json FROM spunta_voce_partita s JOIN main.voce_giornata v ON v.uid = s.voce_uid WHERE s.partita_id = ? AND s.effetti_json IS NOT NULL ORDER BY v.data, v.fascia, v.ordine')
    .all(partitaId) as Array<{ uid: string; giorno: string; testo: string; effetti_json: string }>;
  return righe.flatMap((r) => {
    let ricevuta: EffettiAzioneDto | null;
    try { ricevuta = leggiRicevutaEffettiAzione(r.effetti_json); } catch { ricevuta = null; }
    return ricevuta ? [{ voce: { uid: r.uid, giorno: r.giorno, testo: r.testo }, ricevuta }] : [];
  });
}

/** Per evento di storia, le voci la cui spunta attiva l'ha segnato (R10-22/3): se l'evento era già segnato prima della spunta non è stata la voce. */
export function vociDegliEventi(partitaId: number): Map<string, VoceDiProvenienzaDto[]> {
  const out = new Map<string, VoceDiProvenienzaDto[]>();
  for (const r of prepared("SELECT s.chiave, v.uid, v.data AS giorno, v.azione AS testo FROM effetto_stato_voce s JOIN main.voce_giornata v ON v.uid = s.voce_uid WHERE s.partita_id = ? AND s.tipo = 'storia' AND json_extract(s.prima_json, '$.gia') = 0 ORDER BY v.data, v.fascia, v.ordine").all(partitaId) as Array<{ chiave: string; uid: string; giorno: string; testo: string }>) {
    aggiungi(out, r.chiave, { uid: r.uid, giorno: r.giorno, testo: r.testo });
  }
  return out;
}

/**
 * Per attività, le voci la cui spunta attiva ha registrato un turno ancora presente: dal legame esplicito `utente.turno_voce_partita` (utente
 * 063, scritto da `registraTurno` con la voce), con la stessa `created_at` della riga del turno. Un turno tolto dal «−» e rifatto dal «+» con lo
 * stesso numero non ha legame (`togliTurno` lo toglie con il turno) e, se ne restasse uno, avrebbe un'altra `created_at`: non è mai della voce.
 */
export function vociDeiTurni(partitaId: number): Map<string, VoceDiProvenienzaDto[]> {
  const out = new Map<string, VoceDiProvenienzaDto[]>();
  for (const r of prepared(`SELECT l.attivita_chiave, v.uid, v.data AS giorno, v.azione AS testo FROM utente.turno_voce_partita l
      JOIN utente.turno_partita t ON t.partita_id = l.partita_id AND t.attivita_chiave = l.attivita_chiave AND t.ordine = l.ordine AND t.created_at = l.created_at
      JOIN utente.spunta_voce_partita s ON s.partita_id = l.partita_id AND s.voce_uid = l.voce_uid
      JOIN main.voce_giornata v ON v.uid = l.voce_uid
      WHERE l.partita_id = ? ORDER BY v.data, v.fascia, v.ordine`).all(partitaId) as Array<{ attivita_chiave: string; uid: string; giorno: string; testo: string }>) {
    aggiungi(out, r.attivita_chiave, { uid: r.uid, giorno: r.giorno, testo: r.testo });
  }
  return out;
}

/** Per contatore, le voci la cui spunta attiva (`ricevute`) ha portato una lettura che il contatore conta (`contati`, da
 *  `elementiDeiContatori`, già letti con lo stato della partita) oltre la sua soglia. */
export function vociDeiContatori(ricevute: readonly RicevutaAttiva[], contati: ReadonlyMap<ContatoreChiave, ReadonlyMap<string, number>>): Map<ContatoreChiave, VoceDiProvenienzaDto[]> {
  const out = new Map<string, VoceDiProvenienzaDto[]>();
  for (const [contatore, elementi] of contati) {
    const categoria = CATEGORIA_DEL_CONTATORE[contatore];
    for (const { voce, ricevuta } of ricevute) {
      for (const l of ricevuta.letture ?? []) {
        const soglia = l.categoria === categoria ? elementi.get(l.chiave) : undefined;
        if (soglia !== undefined && l.prima < soglia && l.dopo >= soglia) aggiungi(out, contatore, voce);
      }
    }
  }
  return out as Map<ContatoreChiave, VoceDiProvenienzaDto[]>;
}
