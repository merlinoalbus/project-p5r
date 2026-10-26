// ============================================================
// copieOggetti — le copie di un oggetto che la partita possiede, per i regali (ondata 5, lotto D2; decisione 21 dell'utente)
// ============================================================
//
// Decisione 21 (c): «regalo ripetibile con consumo di copie e oggetti dei set posseduti». Censimento dei regali: D3 («ogni regalo consuma una
// copia? se sì servono le quantità possedute, e gli oggetti presi dai set o ricevuti non si devono ripagare»), RG-Y2 e RG-Y3 (il Set regalo
// giapponese dava Ventaglio, Portachiavi e Flan, che la finestra «Regala» proponeva di ricomprare).
//
// Una lettura sola, nessuna scrittura: le copie si calcolano dalle fonti che la partita ha già, ognuna nel suo registro:
//   - comprate: le righe del registro degli acquisti (utente 051) degli articoli dell'oggetto, con i loro pezzi; un acquisto segnato prima del
//     registro (o in una partita senza data, quindi senza riga) vale una copia;
//   - dentro un set comprato: lo stesso conto per gli articoli che contengono l'oggetto (`ricompensa_oggetto` di fonte «articolo», per
//     esempio i set delle televendite), per le copie del contenuto;
//   - ricevute: le voci del Diario spuntate con l'effetto «oggetto ricevuto» (`oggetto_ottenuto_partita`, utente 046);
//   - regalate: le consegne che hanno usato una copia (`regalo_partita.copia_consumata`, utente 052).
// `disponibili` = possedute − regalate, mai sotto zero (un acquisto annullato a parte dopo il regalo non porta a un numero negativo).
// ============================================================

import { prepared } from '../db/dbService.js';
import { articoloDelListino, lettureListiniCondivisi } from './listiniCondivisi.js';
import type { CopieOggettoDto } from '../../shared/types.js';

const tabellaUtente = (nome: string): boolean => !!prepared("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = ?").get(nome);
const colonnaUtente = (tabella: string, colonna: string): boolean => !!prepared('SELECT 1 FROM pragma_table_info(?, \'utente\') WHERE name = ?').get(tabella, colonna);

/** Le copie comprate nella partita, per chiave d'articolo (come le scrive il registro, o il segno «ottenuto» senza riga). */
function copiePerArticolo(partitaId: number): Map<string, number> {
  const per = new Map<string, number>();
  const conRegistro = tabellaUtente('registro_acquisti');
  if (conRegistro) {
    for (const r of prepared('SELECT articolo_chiave, SUM(quantita) AS n FROM utente.registro_acquisti WHERE partita_id = ? GROUP BY articolo_chiave').all(partitaId) as Array<{ articolo_chiave: string; n: number }>) {
      per.set(r.articolo_chiave, r.n);
    }
  }
  const senzaRiga = conRegistro
    ? `SELECT a.articolo_chiave FROM utente.acquisto_partita a WHERE a.partita_id = ? AND NOT EXISTS (SELECT 1 FROM utente.registro_acquisti r
        WHERE r.partita_id = a.partita_id AND r.articolo_chiave = a.articolo_chiave AND r.ottenuto_qui = 1)`
    : 'SELECT articolo_chiave FROM utente.acquisto_partita WHERE partita_id = ?';
  for (const k of prepared(senzaRiga).pluck().all(partitaId) as string[]) per.set(k, (per.get(k) ?? 0) + 1);
  return per;
}

/** Le copie dell'oggetto del catalogo `catalogo` nella partita. */
export function copieDellOggetto(partitaId: number, catalogo: string): CopieOggettoDto {
  const letture = lettureListiniCondivisi();
  const oggettoDi = prepared('SELECT catalogo_chiave FROM main.articolo WHERE chiave = ?').pluck();
  const nelSet = prepared("SELECT quantita FROM main.ricompensa_oggetto WHERE fonte_tipo = 'articolo' AND fonte_chiave = ? AND catalogo_chiave = ?").pluck();
  let possedute = 0;
  for (const [chiave, n] of copiePerArticolo(partitaId)) {
    // una vecchia chiave di un listino condiviso vale l'offerta del listino
    const canonica = articoloDelListino(chiave, letture);
    const oggetto = (oggettoDi.get(canonica) ?? oggettoDi.get(chiave)) as string | null | undefined;
    if (oggetto === catalogo) possedute += n;
    const contenuto = (nelSet.get(canonica, catalogo) ?? (canonica !== chiave ? nelSet.get(chiave, catalogo) : undefined)) as number | null | undefined;
    if (typeof contenuto === 'number' && contenuto > 0) possedute += n * contenuto;
  }
  if (tabellaUtente('oggetto_ottenuto_partita')) {
    possedute += (prepared('SELECT COALESCE(SUM(quantita), 0) FROM utente.oggetto_ottenuto_partita WHERE partita_id = ? AND catalogo_chiave = ?').pluck().get(partitaId, catalogo) as number);
  }
  const regalate = colonnaUtente('regalo_partita', 'copia_consumata')
    ? prepared('SELECT COUNT(*) FROM utente.regalo_partita WHERE partita_id = ? AND catalogo_chiave = ? AND copia_consumata = 1').pluck().get(partitaId, catalogo) as number
    : 0;
  return { possedute, regalate, disponibili: Math.max(0, possedute - regalate) };
}
