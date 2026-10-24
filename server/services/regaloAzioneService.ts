// ============================================================
// regaloAzioneService — il regalo è un'azione sola (R10-18)
// ============================================================
//
// Prima il regalo erano due gesti che non si parlavano: «Regalo» nella pagina Confidenti dava +50 punti senza dire quale oggetto, e
// «Regalo consegnato» nella scheda del Confidente scriveva la consegna senza punti. Ora si sceglie l'oggetto del catalogo (per chiave) e
// l'azione, in una sola transazione:
//   1. verifica che l'oggetto sia fra i regali graditi di quel Confidente e che non sia già stato consegnato;
//   2. dà i punti (50 di base con i moltiplicatori scelti), ma solo dove il Confidente ne conta (rango 1–9 con punti necessari);
//   3. registra la consegna in `regalo_partita` per chiave, ricordando punti, rango, momento di gioco e acquisto segnato;
//   4. se richiesto, segna comprato l'articolo scelto fra le offerte di quell'oggetto (la stessa `impostaAcquisto` di Negozi);
//   5. scrive l'evento `regalo` nello storico.
// Annullare toglie esattamente ciò che l'azione ha fatto: i punti (se il Confidente è ancora allo stesso rango: cambiando rango i punti
// ripartono da zero e non c'è niente da togliere), l'acquisto che aveva segnato, la consegna e l'evento. Le consegne già date prima
// (punti_dati nullo) si tolgono come sempre, senza toccare punti né acquisti. I yen restano un promemoria (BON-12): niente movimento.
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { verificaPartita } from './verificaPartita.js';
import { registraEvento } from './storicoService.js';
import { aggiornaConfidente, confidente as confidenteDellaPartita } from './partiteService.js';
import { regaliDellaPartita, scriviRegaloPartita } from './regaliPartita.js';
import { impostaAcquisto } from './negoziService.js';
import type { EsitoRegaloDto, RichiestaRegalo } from '../../shared/types.js';

interface RigaRegalo {
  regalo: string; catalogo_chiave: string | null; punti_dati: number | null; rango_al_regalo: number | null; acquisto_articolo: string | null;
}

/** Le colonne dell'azione unica esistono dalla migrazione utente 035: su un file più vecchio il regalo si registra senza ricordarle. */
function colonneAzione(): boolean {
  return (prepared('PRAGMA utente.table_info(regalo_partita)').all() as Array<{ name: string }>).some((c) => c.name === 'punti_dati');
}

function rigaRegalo(partita: number, confidente: string, catalogo: string): RigaRegalo | undefined {
  return prepared(`SELECT regalo, catalogo_chiave, ${colonneAzione() ? 'punti_dati, rango_al_regalo, acquisto_articolo' : 'NULL AS punti_dati, NULL AS rango_al_regalo, NULL AS acquisto_articolo'}
    FROM regalo_partita WHERE partita_id = ? AND confidente_chiave = ? AND catalogo_chiave = ?`).get(partita, confidente, catalogo) as RigaRegalo | undefined;
}

/** Regala `richiesta.catalogo` al Confidente: punti, consegna, eventuale acquisto, storico. Tutto o niente. */
export function regala(partitaId: number, richiesta: RichiestaRegalo): EsitoRegaloDto {
  verificaPartita(partitaId);
  const { confidente, catalogo } = richiesta;
  const conf = prepared('SELECT chiave, nome FROM confidente WHERE chiave = ?').get(confidente) as { chiave: string; nome: string } | undefined;
  if (!conf) throw httpErrors.notFound('confidente-non-trovato', `Il Confidente '${confidente}' non esiste.`);
  const oggetto = prepared('SELECT chiave, nome, nascosto FROM catalogo_oggetto WHERE chiave = ?').get(catalogo) as { chiave: string; nome: string; nascosto: number } | undefined;
  if (!oggetto) throw httpErrors.notFound('oggetto-non-trovato', 'L’oggetto del regalo non è nel catalogo.');
  if (oggetto.nascosto === 1) throw httpErrors.conflict('oggetto-nascosto', 'Ripristina l’oggetto nel catalogo prima di registrare una consegna.');
  if (!prepared('SELECT 1 FROM confidente_regalo WHERE confidente_chiave = ? AND catalogo_chiave = ? AND sconsigliato = 0').get(confidente, catalogo))
    throw httpErrors.conflict('regalo-non-gradito', `«${oggetto.nome}» non è fra i regali graditi di ${conf.nome}.`);
  if (regaliDellaPartita(partitaId, confidente).some((r) => r.catalogo === catalogo))
    throw httpErrors.conflict('regalo-gia-consegnato', `«${oggetto.nome}» risulta già consegnato a ${conf.nome}: toglila prima di regalarla di nuovo.`);

  // l'acquisto da segnare: un'offerta di QUESTO oggetto che non risulta già comprata
  let articolo: string | null = null;
  if (richiesta.acquisto) {
    const offerta = prepared('SELECT chiave FROM articolo WHERE chiave = ? AND catalogo_chiave = ? AND nascosto = 0').get(richiesta.acquisto.articolo, catalogo) as { chiave: string } | undefined;
    if (!offerta) throw httpErrors.badRequest('acquisto-non-dell-oggetto', `L'articolo '${richiesta.acquisto.articolo}' non è un'offerta di «${oggetto.nome}».`);
    if (!prepared('SELECT 1 FROM acquisto_partita WHERE partita_id = ? AND articolo_chiave = ?').get(partitaId, offerta.chiave)) articolo = offerta.chiave;
  }

  return getDb().transaction((): EsitoRegaloDto => {
    const prima = confidenteDellaPartita(partitaId, confidente);
    // i punti contano dove il Confidente li conta (rango 1–9 con punti necessari): altrove il regalo si registra e basta
    const conPunti = prima.rango > 0 && prima.rango < 10 && prima.puntiNecessari !== null && prima.puntiNecessari > 0;
    let punti = 0;
    if (conPunti) {
      const dopo = aggiornaConfidente(partitaId, confidente, { regalo: true, bonusArcano: richiesta.bonusArcano, invito: richiesta.invito });
      punti = Math.round((dopo.punti - prima.punti) * 100) / 100;
    }
    scriviRegaloPartita(partitaId, confidente, { catalogo }, true);
    const momento = prepared('SELECT data_gioco, fascia_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null; fascia_gioco: string | null };
    if (colonneAzione()) {
      prepared(`UPDATE regalo_partita SET punti_dati = ?, rango_al_regalo = ?, acquisto_articolo = ?, data_gioco = ?, fascia_gioco = ?
        WHERE partita_id = ? AND confidente_chiave = ? AND catalogo_chiave = ?`)
        .run(conPunti ? punti : null, conPunti ? prima.rango : null, articolo, momento.data_gioco, momento.fascia_gioco, partitaId, confidente, catalogo);
    }
    if (articolo) impostaAcquisto(partitaId, articolo, true, richiesta.acquisto?.sede);
    const quando = momento.data_gioco ? ` Giorno di gioco ${momento.data_gioco}${momento.fascia_gioco ? `, ${momento.fascia_gioco}` : ''}.` : '';
    registraEvento(partitaId, 'regalo', `Regalo a ${conf.nome}: ${oggetto.nome}`,
      `${conPunti ? `+${punti} punti.` : 'Nessun punto: il rango di questo Confidente non li conta.'}${articolo ? ' Segnato anche come comprato.' : ''}${quando}`,
      { confidente, catalogo, punti, acquisto: articolo, ...(momento.data_gioco ? { data: momento.data_gioco, fascia: momento.fascia_gioco } : {}) });
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), partitaId);
    return { confidente: confidenteDellaPartita(partitaId, confidente), punti, acquistato: articolo };
  })();
}

/** Toglie la consegna e ciò che l'azione aveva fatto (punti, acquisto segnato, evento). Una consegna senza memoria dell'azione si toglie e basta. */
export function annullaRegalo(partitaId: number, confidente: string, catalogo: string): EsitoRegaloDto {
  verificaPartita(partitaId);
  if (!prepared('SELECT 1 FROM confidente WHERE chiave = ?').get(confidente)) throw httpErrors.notFound('confidente-non-trovato', `Il Confidente '${confidente}' non esiste.`);
  const riga = rigaRegalo(partitaId, confidente, catalogo);
  if (!riga) throw httpErrors.notFound('regalo-non-trovato', 'Questa consegna non risulta nella partita.');
  return getDb().transaction((): EsitoRegaloDto => {
    const prima = confidenteDellaPartita(partitaId, confidente);
    let punti = 0;
    if (riga.punti_dati && riga.punti_dati > 0 && prima.rango === riga.rango_al_regalo) {
      aggiornaConfidente(partitaId, confidente, { deltaPunti: -riga.punti_dati });
      punti = -riga.punti_dati;
    }
    scriviRegaloPartita(partitaId, confidente, { catalogo }, false);
    if (riga.acquisto_articolo && prepared('SELECT 1 FROM acquisto_partita WHERE partita_id = ? AND articolo_chiave = ?').get(partitaId, riga.acquisto_articolo)) {
      impostaAcquisto(partitaId, riga.acquisto_articolo, false);
    }
    prepared("DELETE FROM evento_partita WHERE partita_id = ? AND tipo = 'regalo' AND json_extract(dati_json, '$.confidente') = ? AND json_extract(dati_json, '$.catalogo') = ?")
      .run(partitaId, confidente, catalogo);
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), partitaId);
    return { confidente: confidenteDellaPartita(partitaId, confidente), punti, acquistato: riga.acquisto_articolo };
  })();
}
