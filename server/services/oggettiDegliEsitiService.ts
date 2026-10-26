// ============================================================
// oggettiDegliEsitiService — gli oggetti del catalogo che un esito dà, ricevuti registrando il turno e tolti togliendolo (Ondata 5, lotto G)
// ============================================================
//
// Decisione 21 dell'utente (26 ottobre): «Non sono d'accordo nel rimandare attività a fasi successive»; progetto dell'ondata 5, §7: «estendere
// gli esiti con un trofeo e con premi come oggetti per chiave con quantità; serve anche ai distintivi della Big Bang Burger». L'esito lo
// dichiara l'attività (`attivita.esiti_json`, campo `oggetti` di `shared/esitiAttivita.ts`: un solo punto, la Comet Burger vinta → «Distintivo
// numero due» e 3 «Big Bang Burger»); chi registra il turno (la spunta della voce del Diario o il + del contatore, tutte e due passano da
// `attivitaService.registraTurno`) sceglie l'esito, e gli oggetti entrano nel registro `utente.oggetto_esito_turno` (utente 053), una riga per
// oggetto del turno con le copie. Non è uno stato sì/no ma un registro che somma, come gli oggetti ricevuti dalle voci
// (`oggetto_ottenuto_partita`): la lettura unica degli oggetti ottenuti (`oggettiOttenutiService`) e le copie possedute (`copieOggetti`) li
// sommano agli altri. Togliendo il turno (`togliTurno`, l'unica strada che cancella un turno) le righe se ne vanno.
// Un oggetto che il catalogo non ha (tolto o mai esistito) non entra: nessuna riga orfana nasce da qui. Nessuno yen si muove da qui.
// ============================================================

import { prepared } from '../db/dbService.js';
import { esitiDellAttivita } from './esitiAttivitaService.js';
import { catalogoOggettiDisponibile } from './catalogoOggettiLetture.js';

const TABELLA = 'oggetto_esito_turno';

/** La tabella c'è? (Uno schema di prima della utente 053 non ha oggetti dagli esiti: niente da scrivere né da togliere.) */
const conTabella = (): boolean => !!prepared("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = ?").get(TABELLA);

/**
 * Registrando il turno `ordine` dell'attività con l'esito `esito`: gli oggetti del catalogo che l'esito dà entrano fra quelli ottenuti.
 * Va chiamata dentro la transazione del turno. Le righe rimaste da un turno con lo stesso numero (tolto per un'altra strada) si tolgono prima.
 */
export function segnaOggettiDelTurno(p: number, attivita: string, ordine: number, esito: string | null | undefined): void {
  if (!conTabella()) return;
  togliOggettiDelTurno(p, attivita, ordine);
  if (!esito) return;
  const oggetti = esitiDellAttivita(attivita)?.esiti?.esiti.find((e) => e.chiave === esito)?.oggetti ?? [];
  if (!oggetti.length || !catalogoOggettiDisponibile()) return;
  const nelCatalogo = prepared('SELECT 1 FROM catalogo_oggetto WHERE chiave = ?');
  const inserisci = prepared(`INSERT INTO utente.${TABELLA} (partita_id, attivita_chiave, ordine, catalogo_chiave, quantita, esito_chiave, creato_il) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const adesso = new Date().toISOString();
  for (const o of oggetti) if (nelCatalogo.get(o.oggetto)) inserisci.run(p, attivita, ordine, o.oggetto, o.quantita, esito, adesso);
}

/** Togliendo il turno `ordine` dell'attività: gli oggetti che aveva dato se ne vanno. Va chiamata dentro la transazione del turno. */
export function togliOggettiDelTurno(p: number, attivita: string, ordine: number): void {
  if (!conTabella()) return;
  prepared(`DELETE FROM utente.${TABELLA} WHERE partita_id = ? AND attivita_chiave = ? AND ordine = ?`).run(p, attivita, ordine);
}
