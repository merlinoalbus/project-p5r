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
//   - ricevute: le voci del Diario spuntate con l'effetto «oggetto ricevuto» (`oggetto_ottenuto_partita`, utente 046) e i turni con un esito
//     che dà oggetti (`oggetto_esito_turno`, utente 053: la sfida della Big Bang Burger vinta);
//   - regalate: le consegne che hanno usato una copia (`regalo_partita.copia_consumata`, utente 052);
//   - consumate (Ondata 5, lotto F-bis): le copie usate da un turno con un esito che consuma o bruciate in un Isolamento
//     (`consumo_oggetto_partita`, utente 054) e quelle cedute negli scambi (l'acquisto di un'offerta che costa oggetti: Sakai, Gachapon, Super
//     Baron), lette dall'acquisto e dal costo dell'offerta. Il regalo resta nel suo registro: la consegna è già il consumo, e non si copia.
//   - Ondata 5 (lotto F-bis): ricevute anche dai doni dei Confidenti che la partita ha già meritato (`doniConfidentiOttenuti`, dal rango e dal
//     giorno della partita: nessuna copia del dato in un'altra tabella) e dalle Richieste completate (`ricompensa_oggetto` di fonte «richiesta»,
//     una volta per Richiesta finché resta completata: la stessa lettura degli «Oggetti ottenuti», così il pannello e le copie non divergono).
// `disponibili` = possedute − regalate − consumate, mai sotto zero (un acquisto annullato a parte dopo il regalo non porta a un numero negativo).
// `dettaglioCopie` dà le stesse cifre divise per provenienza (comprate, ricevute, regalate, cedute, usate): le mostra il pannello «Oggetti
// ottenuti», così il numero che vede chi gioca è quello della scelta dell'esito e della finestra «Regala».
// ============================================================

import { prepared } from '../db/dbService.js';
import { articoloDelListino, lettureListiniCondivisi } from './listiniCondivisi.js';
import type { CopieOggettoDto } from '../../shared/types.js';
import { doniConfidentiOttenuti, type DonoConfidenteOttenuto } from './doniConfidenti.js';

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
  const d = dettaglioCopie(partitaId, catalogo);
  return { possedute: d.comprate + d.ricevute, regalate: d.regalate, consumate: d.cedute + d.usate, disponibili: d.disponibili };
}

/** Le copie dell'oggetto divise per provenienza: comprate (anche dentro un set), ricevute (voci, turni, doni, Richieste), regalate, cedute
 *  negli scambi, usate (turni e Isolamento) e quelle che restano (mai sotto zero). */
export interface DettaglioCopie { comprate: number; ricevute: number; regalate: number; cedute: number; usate: number; disponibili: number }

/** Le copie dell'oggetto del catalogo `catalogo` nella partita, per provenienza (la base di `copieDellOggetto`). `doni`: i doni dei Confidenti
 *  della partita già letti da chi chiama per molti oggetti (`doniConfidentiOttenuti(partitaId)`, revisione di O11-1: una sola valutazione per
 *  elenco); senza, si leggono i soli doni di questo oggetto. */
export function dettaglioCopie(partitaId: number, catalogo: string, doni?: readonly DonoConfidenteOttenuto[]): DettaglioCopie {
  const letture = lettureListiniCondivisi();
  const oggettoDi = prepared('SELECT catalogo_chiave FROM main.articolo WHERE chiave = ?').pluck();
  const nelSet = prepared("SELECT quantita FROM main.ricompensa_oggetto WHERE fonte_tipo = 'articolo' AND fonte_chiave = ? AND catalogo_chiave = ?").pluck();
  const costoDi = prepared('SELECT costo_json FROM main.articolo WHERE chiave = ?').pluck();
  // comprate: l'articolo dell'oggetto e il contenuto dei set
  let comprate = 0;
  // Ondata 5 (lotto F-bis, censimento 33): le copie cedute negli scambi (i baratti di Sakai, gli scambi del Gachapon e del Super Baron: l'offerta
  // costa oggetti, `costo_json` di tipo «oggetti»): ogni acquisto di quell'offerta consuma le copie del costo. Si legge dall'acquisto e dal
  // costo dell'offerta (un dato in un solo punto), senza una riga in più in un altro registro
  let cedute = 0;
  for (const [chiave, n] of copiePerArticolo(partitaId)) {
    // una vecchia chiave di un listino condiviso vale l'offerta del listino
    const canonica = articoloDelListino(chiave, letture);
    const oggetto = (oggettoDi.get(canonica) ?? oggettoDi.get(chiave)) as string | null | undefined;
    if (oggetto === catalogo) comprate += n;
    const contenuto = (nelSet.get(canonica, catalogo) ?? (canonica !== chiave ? nelSet.get(chiave, catalogo) : undefined)) as number | null | undefined;
    if (typeof contenuto === 'number' && contenuto > 0) comprate += n * contenuto;
    const costo = (costoDi.get(canonica) ?? costoDi.get(chiave)) as string | null | undefined;
    if (costo) {
      try {
        const c = JSON.parse(costo) as { tipo?: unknown; oggetti?: unknown };
        if (c.tipo === 'oggetti' && Array.isArray(c.oggetti)) for (const o of c.oggetti as Array<{ chiave?: unknown; quantita?: unknown }>) {
          if (o.chiave === catalogo && typeof o.quantita === 'number' && o.quantita > 0) cedute += n * o.quantita;
        }
      } catch { /* un costo illeggibile non cede niente: si legge come «nessun costo in oggetti» */ }
    }
  }
  let ricevute = 0;
  if (tabellaUtente('oggetto_ottenuto_partita')) {
    ricevute += (prepared('SELECT COALESCE(SUM(quantita), 0) FROM utente.oggetto_ottenuto_partita WHERE partita_id = ? AND catalogo_chiave = ?').pluck().get(partitaId, catalogo) as number);
  }
  // Ondata 5 (lotto G, utente 053): ricevute dai turni con un esito che dà oggetti (la sfida della Big Bang Burger vinta)
  if (tabellaUtente('oggetto_esito_turno')) {
    ricevute += (prepared('SELECT COALESCE(SUM(quantita), 0) FROM utente.oggetto_esito_turno WHERE partita_id = ? AND catalogo_chiave = ?').pluck().get(partitaId, catalogo) as number);
  }
  // Ondata 5 (lotto F-bis): i doni dei Confidenti già meritati (il rango e il giorno della partita lo dicono)
  ricevute += (doni ?? doniConfidentiOttenuti(partitaId, catalogo)).filter((d) => d.catalogo === catalogo).reduce((n, d) => n + d.quantita, 0);
  // Ondata 5 (lotto F-bis): le ricompense delle Richieste completate, una volta per Richiesta (la lettura di `oggettiOttenutiPartita`)
  if (tabellaUtente('richiesta_partita')) {
    ricevute += (prepared(`SELECT COALESCE(SUM(COALESCE(ro.quantita, 1)), 0) FROM utente.richiesta_partita rp
      JOIN main.richiesta r ON r.chiave = rp.richiesta_chiave
      JOIN main.ricompensa_oggetto ro ON ro.fonte_tipo = 'richiesta' AND ro.fonte_chiave = r.chiave
      WHERE rp.partita_id = ? AND rp.stato = 'completata' AND ro.catalogo_chiave = ?`).pluck().get(partitaId, catalogo) as number);
  }
  const regalate = colonnaUtente('regalo_partita', 'copia_consumata')
    ? prepared('SELECT COUNT(*) FROM utente.regalo_partita WHERE partita_id = ? AND catalogo_chiave = ? AND copia_consumata = 1').pluck().get(partitaId, catalogo) as number
    : 0;
  // Ondata 5 (lotto F-bis, utente 054): le copie usate da un turno con un esito che consuma o bruciate in un Isolamento
  const usate = tabellaUtente('consumo_oggetto_partita')
    ? prepared('SELECT COALESCE(SUM(quantita), 0) FROM utente.consumo_oggetto_partita WHERE partita_id = ? AND catalogo_chiave = ?').pluck().get(partitaId, catalogo) as number
    : 0;
  return { comprate, ricevute, regalate, cedute, usate, disponibili: Math.max(0, comprate + ricevute - regalate - cedute - usate) };
}
