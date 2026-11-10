// ============================================================
// postoService — il posto come lo modifica la sua finestra unica (L3): il luogo, i suoi punti vendita e le loro offerte
// ============================================================
//
// - **Leggere** (`GET /api/catalogo/posto/:quartiere/:luogo`): il luogo, i punti vendita visibili con sede nel luogo e le loro offerte visibili,
//   come elementi del catalogo (gli stessi campi dei moduli), con il segno delle offerte che hanno acquisti nelle partite.
// - **Salvare** (`PUT …`): tutto in una transazione, con le regole di sempre delle scritture del catalogo (`creaElementoNellaTransazione`,
//   `aggiornaElementoNellaTransazione`): prima i punti vendita (un nuovo nasce con la sede nel luogo; uno esistente deve già averla) e le loro
//   offerte, poi il luogo, così un luogo che diventa «negozio» insieme al suo primo punto vendita passa la regola I4. Un'offerta tolta si
//   elimina nel cestino solo se l'hai creata tu, non l'hai corretta e non ha acquisti né risultati; altrimenti si nasconde (si rimette dal
//   Cestino, gli acquisti restano). «Duplica» è una creazione come le altre: la sorgente non cambia, la copia nasce tua.
// ============================================================

import { getDb, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { invalidaCacheDiGioco } from './cacheDiGioco.js';
import { aggiornaElementoNellaTransazione, creaElementoNellaTransazione, eliminaElemento, leggiElemento, nascondiElemento } from './catalogoService.js';
import type { PostoDto, PostoSalvatoDto } from '../../shared/types.js';

/** Un punto vendita del salvataggio, già validato con lo schema del suo tipo (`dati` e `dati` delle offerte nella forma delle colonne). */
export interface PuntoVenditaDaSalvare {
  chiave?: string;
  dati?: Record<string, unknown>;
  offerte: Array<{ chiave?: string; dati: Record<string, unknown>; copiaDa?: string }>;
  offerteTolte?: string[];
}

function luogoEsistente(chiave: string): void {
  if (!prepared('SELECT 1 FROM luogo WHERE chiave = ?').get(chiave)) throw httpErrors.notFound('luogo-non-trovato', `Il luogo '${chiave}' non esiste.`);
}

/** Vero se l'offerta ha acquisti in una partita (registro, segno «ottenuto») o risultati collegati: non si elimina, si nasconde. */
function offertaConAcquisti(chiave: string): boolean {
  const c = (sql: string) => !!prepared(sql).get(chiave);
  const registro = !!prepared("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = 'registro_acquisti'").get();
  return c('SELECT 1 FROM utente.acquisto_partita WHERE articolo_chiave = ? LIMIT 1')
    || (registro && c('SELECT 1 FROM utente.registro_acquisti WHERE articolo_chiave = ? LIMIT 1'))
    || c("SELECT 1 FROM ricompensa_oggetto WHERE fonte_tipo = 'articolo' AND fonte_chiave = ? LIMIT 1");
}

/** Il posto: luogo, punti vendita visibili con sede nel luogo (nell'ordine) e le loro offerte visibili. 404 se il luogo non c'è. */
export function leggiPosto(chiave: string): PostoDto {
  luogoEsistente(chiave);
  const negozi = prepared('SELECT chiave FROM negozio WHERE sede_chiave = ? AND nascosto = 0 ORDER BY ordine, chiave').all(chiave) as Array<{ chiave: string }>;
  return {
    luogo: leggiElemento('luogo', chiave),
    puntiVendita: negozi.map((n) => ({
      negozio: leggiElemento('negozio', n.chiave),
      offerte: (prepared('SELECT chiave FROM articolo WHERE negozio_chiave = ? AND nascosto = 0 ORDER BY ordine, chiave').all(n.chiave) as Array<{ chiave: string }>)
        .map((a) => ({ ...leggiElemento('articolo', a.chiave), conAcquisti: offertaConAcquisti(a.chiave) })),
    })),
  };
}

/** Il punto vendita esistente deve stare in questo luogo (l'editor non sposta un punto vendita altrove). */
function puntoVenditaDelLuogo(chiave: string, luogo: string): void {
  const n = prepared('SELECT sede_chiave FROM negozio WHERE chiave = ?').get(chiave) as { sede_chiave: string | null } | undefined;
  if (!n) throw httpErrors.notFound('negozio-non-trovato', `Il punto vendita '${chiave}' non esiste.`);
  if (n.sede_chiave !== luogo) throw httpErrors.badRequest('punto-vendita-di-altro-luogo', 'Questo punto vendita sta in un altro luogo: si modifica dal suo posto.');
}

/** L'offerta esistente deve essere del punto vendita indicato. */
function offertaDelPuntoVendita(chiave: string, negozio: string): void {
  const a = prepared('SELECT negozio_chiave FROM articolo WHERE chiave = ?').get(chiave) as { negozio_chiave: string } | undefined;
  if (!a) throw httpErrors.notFound('articolo-non-trovato', `L’offerta '${chiave}' non esiste.`);
  if (a.negozio_chiave !== negozio) throw httpErrors.badRequest('offerta-di-altro-punto-vendita', 'Questa offerta è di un altro punto vendita.');
}

/** «Duplica»: i contenuti dell'offerta d'origine (un set, `ricompensa_oggetto` con fonte `articolo`) passano alla copia; l'origine non cambia. */
function copiaContenuti(origine: string, copia: string): void {
  if (!prepared('SELECT 1 FROM articolo WHERE chiave = ?').get(origine)) throw httpErrors.badRequest('offerta-da-copiare-sconosciuta', `L’offerta da copiare '${origine}' non esiste.`);
  prepared(`INSERT INTO ricompensa_oggetto (fonte_tipo, fonte_chiave, catalogo_chiave, quantita, ordine, nota, condizioni_json)
    SELECT fonte_tipo, ?, catalogo_chiave, quantita, ordine, nota, condizioni_json FROM ricompensa_oggetto WHERE fonte_tipo = 'articolo' AND fonte_chiave = ?`).run(copia, origine);
}

/** Toglie un'offerta: nel cestino se è tua, mai corretta e senza acquisti né risultati; altrimenti la nasconde. */
function togliOfferta(chiave: string): void {
  const r = prepared('SELECT origine, seed_json, nascosto FROM articolo WHERE chiave = ?').get(chiave) as { origine: string; seed_json: string | null; nascosto: number };
  if (r.origine === 'utente' && r.seed_json === null && !offertaConAcquisti(chiave)) eliminaElemento('articolo', chiave);
  else if (r.nascosto === 0) nascondiElemento('articolo', chiave, true);
}

/**
 * Salva il posto in una transazione (vedi la testata). `luogo` e i `dati` sono già passati dallo schema del loro tipo; la sede di un punto
 * vendita e il punto vendita di un'offerta li decide il posto, non il corpo. Restituisce il posto riletto e i punti vendita creati.
 */
export function salvaPosto(chiave: string, corpo: { luogo?: Record<string, unknown>; puntiVendita: PuntoVenditaDaSalvare[] }): PostoSalvatoDto {
  luogoEsistente(chiave);
  const creati = getDb().transaction((): string[] => {
    const nuovi: string[] = [];
    for (const pv of corpo.puntiVendita) {
      let negozio: string;
      if (pv.chiave) {
        puntoVenditaDelLuogo(pv.chiave, chiave);
        negozio = pv.chiave;
        if (pv.dati && Object.keys(pv.dati).length) {
          const { sede_chiave: _sede, ...dati } = pv.dati;
          aggiornaElementoNellaTransazione('negozio', negozio, dati);
        }
      } else {
        if (!pv.dati) throw httpErrors.badRequest('punto-vendita-senza-dati', 'Un punto vendita nuovo ha almeno il nome.');
        negozio = creaElementoNellaTransazione('negozio', { ...pv.dati, sede_chiave: chiave }).chiave;
        nuovi.push(negozio);
      }
      const salvate = new Set(pv.offerte.flatMap((o) => (o.chiave ? [o.chiave] : [])));
      if ((pv.offerteTolte ?? []).some((k) => salvate.has(k))) throw httpErrors.badRequest('offerta-tolta-e-salvata', 'Un’offerta non si toglie e si modifica nello stesso salvataggio.');
      for (const tolta of pv.offerteTolte ?? []) {
        offertaDelPuntoVendita(tolta, negozio);
        togliOfferta(tolta);
      }
      for (const o of pv.offerte) {
        if (o.chiave) {
          offertaDelPuntoVendita(o.chiave, negozio);
          aggiornaElementoNellaTransazione('articolo', o.chiave, { ...o.dati, negozio_chiave: negozio });
        } else {
          const nuova = creaElementoNellaTransazione('articolo', { ...o.dati, negozio_chiave: negozio }).chiave;
          if (o.copiaDa) copiaContenuti(o.copiaDa, nuova);
        }
      }
    }
    if (corpo.luogo && Object.keys(corpo.luogo).length) aggiornaElementoNellaTransazione('luogo', chiave, corpo.luogo);
    return nuovi;
  })();
  invalidaCacheDiGioco();
  return { posto: leggiPosto(chiave), creati };
}
