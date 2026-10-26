// ============================================================
// regaloAzioneService — il regalo è un'azione sola (R10-18)
// ============================================================
//
// Prima il regalo erano due gesti che non si parlavano: «Regalo» nella pagina Confidenti dava +50 punti senza dire quale oggetto, e
// «Regalo consegnato» nella scheda del Confidente scriveva la consegna senza punti. Ora si sceglie l'oggetto del catalogo (per chiave) e
// l'azione, in una sola transazione:
//   1. verifica che il Confidente riceva regali e sia già stato incontrato, e che l'oggetto sia un regalo (o nel suo elenco);
//   2. dà i punti (la base della reazione con i moltiplicatori scelti), ma solo dove il Confidente ne conta (rango 1–9 con punti necessari);
//   3. registra la consegna in `regalo_partita`, ricordando punti, rango, momento di gioco, acquisto segnato e copia usata;
//   4. se richiesto, segna comprato l'articolo scelto fra le offerte di quell'oggetto (la stessa `impostaAcquisto` di Negozi);
//   5. scrive l'evento `regalo` nello storico.
// Annullare toglie esattamente ciò che l'azione ha fatto: i punti (se il Confidente è ancora allo stesso rango: cambiando rango i punti
// ripartono da zero e non c'è niente da togliere), l'acquisto che aveva segnato, la consegna e l'evento. Le consegne già date prima
// (punti_dati nullo) si tolgono come sempre, senza toccare punti né acquisti. L13 (decisione 18): l'acquisto segnato insieme al regalo scala da
// solo il prezzo dell'articolo dal saldo (mai sotto zero, il regalo si registra anche con il saldo a zero), e togliendo il regalo torna ciò che
// era stato scalato (`utente.yen_automatico`, con la causa propria della consegna).
//
// Ondata 5 (decisione 21 dell'utente; censimento dei regali RG-09, RG-10, RG-17, RG-18, D2, D3):
//   - ogni oggetto regalo del catalogo si può dare a un Confidente che riceve regali (`confidente.regalabile`): la reazione è quella del suo
//     elenco (`confidente_regalo.reazione`, +3/+2/+1), +1 se l'oggetto non c'è («ogni regalo garantisce almeno 1 punto»); i punti per
//     reazione sono quelli attuali finché non si verificano in gioco (`PUNTI_REGALO_PER_REAZIONE`);
//   - si regala durante un ritrovo: mai a un Confidente al rango 0 (non ancora incontrato);
//   - lo stesso oggetto si può ridare (utente 052): ogni consegna è una riga, e si annulla quella precisa (`id`) o l'ultima;
//   - la consegna usa una copia posseduta (comprata, ricevuta o di un set: `copieOggetti`) se c'è; altrimenti si può segnare l'acquisto, che
//     crea la copia che il regalo usa. Un acquisto che il negozio non registra (pezzo unico già ottenuto) non si paga;
//   - la Cartolina si spedisce (`shared/regali.ts`): +1, mai a un Confidente al rango massimo, mai con la pioggia nella fascia corrente.
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { verificaPartita } from './verificaPartita.js';
import { registraEvento } from './storicoService.js';
import { aggiornaConfidente, confidente as confidenteDellaPartita } from './partiteService.js';
import { nuovaGenerazione } from './puntiCronologici.js';
import { consegnaDaAnnullare, inserisciConsegna, togliConsegna } from './regaliPartita.js';
import { annullaRigaDelRegistro, impostaAcquisto } from './negoziService.js';
import { muoviYenAutomatico, regaloYenGiaNelSaldo } from './yenAutomaticiService.js';
import { copieDellOggetto } from './copieOggetti.js';
import { meteoOra } from './meteoService.js';
import { REAZIONE_CARTOLINA, REAZIONE_FUORI_ELENCO, eReazione, modoDelRegalo, testoReazione } from '../../shared/regali.js';
import type { ReazioneRegalo } from '../../shared/puntiConfidenti.js';
import type { EsitoRegaloDto, RichiestaRegalo } from '../../shared/types.js';

/** Il Confidente riceve regali: la colonna della 255, o (su un file di gioco più vecchio) un elenco di regali. */
export function confidenteRegalabile(chiave: string): boolean {
  const conColonna = (prepared('PRAGMA main.table_info(confidente)').all() as Array<{ name: string }>).some((c) => c.name === 'regalabile');
  if (conColonna) return !!prepared('SELECT 1 FROM confidente WHERE chiave = ? AND regalabile = 1').get(chiave);
  return !!prepared('SELECT 1 FROM confidente_regalo WHERE confidente_chiave = ?').get(chiave);
}

/** La reazione del Confidente all'oggetto: quella del suo elenco (la più alta se l'oggetto vi compare due volte), null se non c'è. */
export function reazioneInElenco(confidente: string, catalogo: string): ReazioneRegalo | null {
  const conColonna = (prepared('PRAGMA main.table_info(confidente_regalo)').all() as Array<{ name: string }>).some((c) => c.name === 'reazione');
  const righe = prepared(`SELECT ${conColonna ? 'reazione' : 'NULL AS reazione'}, sconsigliato FROM confidente_regalo WHERE confidente_chiave = ? AND catalogo_chiave = ?`)
    .all(confidente, catalogo) as Array<{ reazione: number | null; sconsigliato: number }>;
  if (!righe.length) return null;
  // una riga non ancora convertita (file di gioco di prima della 256): «sconsigliato» vale +1, il resto +3 come i 50 punti di sempre
  const valori = righe.map((r) => (eReazione(r.reazione) ? r.reazione : r.sconsigliato === 1 ? 1 : 3));
  return Math.max(...valori) as ReazioneRegalo;
}

/** L'ultima riga del registro degli acquisti di quell'articolo dalla pagina del negozio (per riconoscere quella che il regalo ha appena scritto). */
const ultimaRigaNegozio = (partita: number, articolo: string): number => {
  if (!prepared("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = 'registro_acquisti'").get()) return 0;
  return (prepared("SELECT COALESCE(MAX(id), 0) FROM utente.registro_acquisti WHERE partita_id = ? AND articolo_chiave = ? AND fonte = 'negozio'").pluck().get(partita, articolo) as number);
};

/** Regala `richiesta.catalogo` al Confidente: punti, consegna, eventuale acquisto, storico. Tutto o niente. */
export function regala(partitaId: number, richiesta: RichiestaRegalo): EsitoRegaloDto {
  verificaPartita(partitaId);
  const { confidente, catalogo } = richiesta;
  const conf = prepared('SELECT chiave, nome FROM confidente WHERE chiave = ?').get(confidente) as { chiave: string; nome: string } | undefined;
  if (!conf) throw httpErrors.notFound('confidente-non-trovato', `Il Confidente '${confidente}' non esiste.`);
  if (!confidenteRegalabile(confidente)) throw httpErrors.conflict('confidente-non-regalabile', `${conf.nome} non riceve regali.`);
  const oggetto = prepared('SELECT chiave, nome, nascosto, categoria FROM catalogo_oggetto WHERE chiave = ?').get(catalogo) as { chiave: string; nome: string; nascosto: number; categoria: string } | undefined;
  if (!oggetto) throw httpErrors.notFound('oggetto-non-trovato', 'L’oggetto del regalo non è nel catalogo.');
  if (oggetto.nascosto === 1) throw httpErrors.conflict('oggetto-nascosto', 'Ripristina l’oggetto nel catalogo prima di registrare una consegna.');
  const inElenco = reazioneInElenco(confidente, catalogo);
  if (inElenco === null && oggetto.categoria !== 'regalo') throw httpErrors.conflict('non-e-un-regalo', `«${oggetto.nome}» non è un oggetto da regalare.`);
  const modo = modoDelRegalo(catalogo);
  const reazione: ReazioneRegalo = modo === 'cartolina' ? REAZIONE_CARTOLINA : inElenco ?? REAZIONE_FUORI_ELENCO;

  const prima = confidenteDellaPartita(partitaId, confidente);
  if (prima.rango === 0) throw httpErrors.conflict('confidente-non-incontrato', `${conf.nome} non è ancora stato incontrato: si regala durante un ritrovo.`);
  const momento = prepared('SELECT data_gioco, fascia_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null; fascia_gioco: string | null };
  if (modo === 'cartolina') {
    if (prima.rango >= 10) throw httpErrors.conflict('cartolina-al-massimo', `${conf.nome} è al rango massimo: la Cartolina non si spedisce.`);
    if (meteoOra(partitaId, momento.data_gioco, momento.fascia_gioco === 'sera' ? 'sera' : momento.fascia_gioco ? 'giorno' : null)?.meteo === 'pioggia')
      throw httpErrors.conflict('cartolina-con-pioggia', 'Piove: la Cartolina non si spedisce nei giorni di pioggia.');
  }

  // l'acquisto da segnare: un'offerta di QUESTO oggetto (una copia nuova, anche se l'oggetto era già stato comprato)
  let offertaScelta: string | null = null;
  if (richiesta.acquisto) {
    const offerta = prepared('SELECT chiave FROM articolo WHERE chiave = ? AND catalogo_chiave = ? AND nascosto = 0').get(richiesta.acquisto.articolo, catalogo) as { chiave: string } | undefined;
    if (!offerta) throw httpErrors.badRequest('acquisto-non-dell-oggetto', `L'articolo '${richiesta.acquisto.articolo}' non è un'offerta di «${oggetto.nome}».`);
    offertaScelta = offerta.chiave;
  }
  const copie = copieDellOggetto(partitaId, catalogo);

  return getDb().transaction((): EsitoRegaloDto => {
    // l'acquisto prima della consegna: la copia comprata è quella che il regalo usa. Conta solo se il negozio l'ha registrato davvero
    // (una riga nuova del registro, o il primo segno «ottenuto» in una partita senza data): il pezzo unico già ottenuto non si ricompra
    let articolo: string | null = null;
    let registroId: number | null = null;
    if (offertaScelta) {
      const rigaPrima = ultimaRigaNegozio(partitaId, offertaScelta);
      const eraOttenuto = !!prepared('SELECT 1 FROM acquisto_partita WHERE partita_id = ? AND articolo_chiave = ?').get(partitaId, offertaScelta);
      impostaAcquisto(partitaId, offertaScelta, true, richiesta.acquisto?.sede);
      const rigaDopo = ultimaRigaNegozio(partitaId, offertaScelta);
      if (rigaDopo > rigaPrima) { articolo = offertaScelta; registroId = rigaDopo; }
      else if (!eraOttenuto && prepared('SELECT 1 FROM acquisto_partita WHERE partita_id = ? AND articolo_chiave = ?').get(partitaId, offertaScelta)) articolo = offertaScelta;
    }
    const copiaConsumata = articolo !== null || copie.disponibili > 0;

    // i punti contano dove il Confidente li conta (rango 1–9 con punti necessari): altrove il regalo si registra e basta
    const conPunti = prima.rango > 0 && prima.rango < 10 && prima.puntiNecessari !== null && prima.puntiNecessari > 0;
    let punti = 0;
    if (conPunti) {
      const dopo = aggiornaConfidente(partitaId, confidente, { regalo: true, reazioneRegalo: reazione, bonusArcano: richiesta.bonusArcano, invito: richiesta.invito });
      nuovaGenerazione(partitaId, confidente); // R10-11: un regalo non è un evento del Diario: la base del registro cronologico riparte da qui
      punti = Math.round((dopo.punti - prima.punti) * 100) / 100;
    }
    const { id, causa } = inserisciConsegna(partitaId, confidente, {
      catalogo, nome: oggetto.nome, puntiDati: conPunti ? punti : null, rangoAlRegalo: conPunti ? prima.rango : null, acquistoArticolo: articolo, registroId,
      dataGioco: momento.data_gioco, fasciaGioco: momento.fascia_gioco, copiaConsumata, modo,
    });
    if (articolo) {
      const prezzo = (prepared('SELECT prezzo FROM articolo WHERE chiave = ?').get(articolo) as { prezzo: number | null } | undefined)?.prezzo ?? null;
      // la consegna di prima degli yen automatici, tolta e ridata nello stesso momento di gioco, è la stessa consegna corretta: il suo prezzo
      // era già nel saldo e non si scala (`regaloYenGiaNelSaldo`); in un altro momento è un regalo nuovo e si paga
      if (prezzo != null && prezzo > 0 && !regaloYenGiaNelSaldo(partitaId, confidente, catalogo)) muoviYenAutomatico(partitaId, causa, -prezzo, `Regalo comprato: ${oggetto.nome}`);
    }
    const quando = momento.data_gioco ? ` Giorno di gioco ${momento.data_gioco}${momento.fascia_gioco ? `, ${momento.fascia_gioco}` : ''}.` : '';
    const comeDato = modo === 'cartolina' ? 'Cartolina spedita a' : 'Regalo a';
    const copia = articolo ? ' Segnato anche come comprato.' : copiaConsumata ? ' Usata una copia posseduta.' : '';
    registraEvento(partitaId, 'regalo', `${comeDato} ${conf.nome}: ${oggetto.nome}`,
      `Reazione ${testoReazione(reazione)}. ${conPunti ? `+${punti} punti.` : 'Nessun punto: il rango di questo Confidente non li conta.'}${copia}${quando}`,
      { confidente, catalogo, consegna: id, reazione, modo, punti, acquisto: articolo, ...(momento.data_gioco ? { data: momento.data_gioco, fascia: momento.fascia_gioco } : {}) });
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), partitaId);
    return { confidente: confidenteDellaPartita(partitaId, confidente), punti, acquistato: articolo, consegna: { id, catalogo, reazione, copiaConsumata, modo } };
  })();
}

/**
 * Toglie la consegna (quella con `id`, o l'ultima di quell'oggetto a quel Confidente) e ciò che l'azione aveva fatto (punti, acquisto segnato,
 * evento). Una consegna senza memoria dell'azione si toglie e basta.
 */
export function annullaRegalo(partitaId: number, confidente: string, catalogo: string, id?: number): EsitoRegaloDto {
  verificaPartita(partitaId);
  if (!prepared('SELECT 1 FROM confidente WHERE chiave = ?').get(confidente)) throw httpErrors.notFound('confidente-non-trovato', `Il Confidente '${confidente}' non esiste.`);
  const riga = consegnaDaAnnullare(partitaId, confidente, catalogo, id);
  if (!riga) throw httpErrors.notFound('regalo-non-trovato', 'Questa consegna non risulta nella partita.');
  return getDb().transaction((): EsitoRegaloDto => {
    const prima = confidenteDellaPartita(partitaId, confidente);
    let punti = 0;
    if (riga.punti_dati && riga.punti_dati > 0 && prima.rango === riga.rango_al_regalo) {
      aggiornaConfidente(partitaId, confidente, { deltaPunti: -riga.punti_dati });
      nuovaGenerazione(partitaId, confidente);
      punti = -riga.punti_dati;
    }
    // L13 (decisione 18): togliendo la consegna torna anche il prezzo che il regalo aveva scalato da solo (solo quello davvero scalato)
    togliConsegna(partitaId, riga);
    if (riga.registro_id !== null) {
      // ondata 5: l'acquisto che il regalo aveva scritto è una riga precisa del registro; se è già stata annullata a parte non c'è niente da togliere
      try { annullaRigaDelRegistro(partitaId, riga.registro_id); }
      catch (err) { const code = (err as { code?: string }).code; if (code !== 'acquisto-non-trovato' && code !== 'articolo-non-trovato') throw err; }
    } else if (riga.acquisto_articolo && prepared('SELECT 1 FROM acquisto_partita WHERE partita_id = ? AND articolo_chiave = ?').get(partitaId, riga.acquisto_articolo)) {
      // consegna di prima della 052: se l'acquisto del regalo è già stato annullato a parte e l'oggetto resta comprato soltanto da voci del
      // Diario, non c'è niente da togliere qui (le copie delle voci si tolgono con le loro spunte): l'annullo prosegue con punti ed evento
      try { impostaAcquisto(partitaId, riga.acquisto_articolo, false); }
      catch (err) { if ((err as { code?: string }).code !== 'acquisto-della-voce') throw err; }
    }
    // l'evento della consegna: quello con il suo id; per le consegne di prima, quello dell'oggetto senza id (uno solo per oggetto e Confidente)
    const evento = riga.id !== null && prepared("SELECT 1 FROM evento_partita WHERE partita_id = ? AND tipo = 'regalo' AND json_extract(dati_json, '$.consegna') = ?").get(partitaId, riga.id);
    if (evento) prepared("DELETE FROM evento_partita WHERE partita_id = ? AND tipo = 'regalo' AND json_extract(dati_json, '$.consegna') = ?").run(partitaId, riga.id);
    else prepared("DELETE FROM evento_partita WHERE partita_id = ? AND tipo = 'regalo' AND json_extract(dati_json, '$.confidente') = ? AND json_extract(dati_json, '$.catalogo') = ? AND json_extract(dati_json, '$.consegna') IS NULL")
      .run(partitaId, confidente, catalogo);
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), partitaId);
    return { confidente: confidenteDellaPartita(partitaId, confidente), punti, acquistato: riga.acquisto_articolo };
  })();
}
