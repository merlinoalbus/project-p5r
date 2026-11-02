// ============================================================
// Migrazione 343 — avvisi del giorno: i casi decisi dall'utente il 01/11 (L8-02, dopo la 339)
// ============================================================
//
// La 339 aveva tolto o riscritto le frasi A e B del censimento «L8-02 — avvisi del giorno» (revisione 2) e lasciato le 13 «A (trama/vincolo)»,
// i casi D e quelle legate a un conflitto di dati. Le risposte dell'utente del 1° novembre:
//   - le 13 «A (trama/vincolo)» (#70, #140, #161, #171, #181, #196–#203): «Sì, toglile»;
//   - #67 (Yoshida, 17/07, «Uomo del Popolo») e #182 (Sumire, 12/01): «Togli l'avviso»;
//   - #71 (23/07) e #96 (21/08), Medjed: dopo l'allineamento delle date (342: scadenza del 20 agosto nella trama del 23/07) ripetono per intero
//     la trama del giorno, e si tolgono;
//   - #49 (20/06), Kaneshiro: con la trama allineata all'8 luglio (342) il rango 4 di Morgana è la voce del giorno e il ricatto è la trama;
//     restava solo il termine superato delle «3 settimane»: doppione, si toglie;
//   - #43 (10/06, rango 1 di Akechi) e #174 (24/12, rango 10 di Igor): le voci nuove della 341 dicono la stessa cosa, e gli avvisi si tolgono
//     solo se quelle voci ci sono;
//   - #146 (31/10), Niijima («19 novembre»): il rango 1 di Haru è già nella voce del giorno e la scheda del 31/10 non dice la scadenza,
//     quindi l'avviso diventa «Scadenza del Palazzo di Niijima: 19 novembre».
//   - #69 (20/07, «Richiesta Mementos sbloccata: Le fatiche di una maid»): la voce del 19/07 del rango 8 di Kawakami ha ora l'effetto di
//     sblocco della maid (341), e l'avviso si toglie solo se quell'effetto c'è.
// Resta #1 (9/04, salvataggi di Persona 5: «Anticipo utile, resta»).
//
// COSA (conservativa, idempotente, sul modello della 339): ogni frase si cerca nel suo giorno per testo (gli indici sono cambiati dopo la 339)
// e si toglie o si riscrive solo se c'è una volta sola, parola per parola, nel giorno della guida mai corretto dall'utente (`seed_json IS
// NULL`), e se il dato che la copre c'è (la voce o la trama allineata); altrimenti resta e si conta. Il testo tolto o di prima va
// nell'archivio `dati_guida.archivio-frasi-l11`, colonna `giorno.avvisi_json`, con la chiave «MM-GG #numero» (accanto alle righe della 339,
// che restano). Le altre colonne di `giorno`, gli avvisi degli altri giorni, le voci, gli effetti, il calendario e le partite non cambiano.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { ARCHIVIO_FRASI, archiviaFrasi, archiviate, esisteTabella, haColonna, improntaTabella, type RigheArchiviate } from './pulizieL11.js';
import { diverseFuori, improntaPartite, righePerChiave } from './decisioniDati0111.js';

const COLONNA = 'giorno.avvisi_json';
const errore = (motivo: string): never => { throw new Error(`343: ${motivo}; nessuna modifica applicata.`); };

/** Il dato che deve esserci perché l'avviso sia un doppione: una voce del giorno con quel Confidente e quel rango atteso, una frase della trama,
 *  o l'effetto di una voce (per uid, con la chiave dell'effetto). */
type Copertura = { voce: { confidente: string; rango: number } } | { trama: string } | { effetto: { voce: string; chiave: string } };
interface Avviso { numero: number; data: string; atteso: string; nuovo?: string; copertura?: Copertura }

const togli = (numero: number, data: string, atteso: string, copertura?: Copertura): Avviso => ({ numero, data, atteso, ...(copertura ? { copertura } : {}) });
const GIORNO_SALTATO = 'Nessuna azione: giorno saltato automaticamente dal gioco secondo la fonte';

/** L'elenco approvato: numero del censimento, giorno, testo atteso (com'è dopo la 339), testo nuovo per una riscrittura, dato che lo copre. */
export const AVVISI_343: readonly Avviso[] = [
  // le 13 «A (trama/vincolo)»
  togli(70, '07-21', 'Bersaglio identificato: Futaba Sakura'),
  togli(140, '10-20', 'Nuovi obiettivi: Trova il vero colpevole / Sfuggi alla squadra investigativa'),
  togli(161, '11-18', 'Maruki raggiunge il rango massimo 10 (Consigliere); lettera di sfida inviata per la battaglia del 19 novembre'),
  togli(171, '12-17', 'Scadenza del Palazzo di Shido in questo giorno'),
  togli(181, '01-10', 'Morgana evolve in Diego'),
  ...['02-05', '02-06', '02-07', '02-08', '02-09', '02-10', '02-11', '02-12'].map((data, i) => togli(196 + i, data, GIORNO_SALTATO)),
  // i casi D decisi
  togli(67, '07-17', 'Yoshida sale al rango 7 (Sole, Uomo del Popolo)'),
  togli(182, '01-12', 'Sumire Yoshizawa sale al rango 5 (Fede) ed entra ufficialmente nel gruppo'),
  togli(71, '07-23', 'Scadenza Medjed annunciata: 21 agosto', { trama: 'Medjed annuncia la scadenza del 20 agosto' }),
  togli(96, '08-21', 'Futaba Sakura entra nel gruppo; Medjed viene sventato'),
  togli(69, '07-20', 'Richiesta Mementos sbloccata: Le fatiche di una maid (richiesta di Kawakami)',
    { effetto: { voce: '1e920647bd26510426a49b825398cbeb', chiave: 'richiesta:le-fatiche-di-una-maid-in-cattedra' } }),
  togli(49, '06-20', 'Morgana sale al rango 4 (Mago); ricatto di Kaneshiro: 3 milioni di yen in 3 settimane', { trama: 'chiedendo 3 milioni di yen entro l\'8 luglio' }),
  // i doppioni delle voci nuove della 341
  togli(43, '06-10', 'Confidente sbloccato: Goro Akechi (Giustizia) rango 1, appare dopo la trasmissione', { voce: { confidente: 'akechi', rango: 1 } }),
  togli(174, '12-24', 'Igor (vero) sale al rango massimo 10 (Il Matto): sblocca Impeto Arcano Supremo e la fusione di Vishnu', { voce: { confidente: 'igor', rango: 10 } }),
  // la riscrittura di Niijima
  { numero: 146, data: '10-31', atteso: 'Confidente sbloccato: Haru Okumura (Imperatrice) rango 1; due settimane alla scadenza del 20 novembre per il Palazzo di Niijima',
    nuovo: 'Scadenza del Palazzo di Niijima: 19 novembre' },
];

/** Il dato che copre l'avviso c'è? (Senza copertura dichiarata: sì, la decisione non ne chiede.) */
function coperto(db: AppDatabase, a: Avviso): boolean {
  const c = a.copertura;
  if (!c) return true;
  if ('voce' in c) {
    return !!db.prepare("SELECT 1 FROM main.voce_giornata WHERE data = ? AND riferimento_tipo = 'confidente' AND riferimento_chiave = ? AND rango_atteso = ?").get(a.data, c.voce.confidente, c.voce.rango);
  }
  if ('effetto' in c) return !!db.prepare('SELECT 1 FROM main.voce_effetto WHERE voce_uid = ? AND chiave = ?').get(c.effetto.voce, c.effetto.chiave);
  const trama = db.prepare('SELECT trama FROM main.giorno WHERE data = ?').pluck().get(a.data) as string | undefined;
  return trama !== undefined && trama.includes(c.trama);
}

/** Le righe d'archivio della colonna, come sono oggi (quelle della 339 comprese). */
function archivioDellaColonna(db: AppDatabase): RigheArchiviate {
  const json = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(ARCHIVIO_FRASI) as string | undefined;
  return (json ? (JSON.parse(json) as { colonne?: Record<string, RigheArchiviate> }).colonne?.[COLONNA] : undefined) ?? {};
}

export const migration343: Migration = {
  id: 343,
  name: 'avvisi_del_giorno_decisi',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'giorno') || !haColonna(db, 'giorno', 'avvisi_json')) return;
    if (!esisteTabella(db, 'dati_guida')) errore('manca la tabella dati_guida');

    const altreColonne = improntaTabella(db, 'giorno', ['avvisi_json']);
    const avvisiPrima = new Map((db.prepare('SELECT data, avvisi_json FROM main.giorno').all() as Array<{ data: string; avvisi_json: string }>).map((r) => [r.data, r.avvisi_json]));
    const intatte = ['voce_giornata', 'voce_effetto', 'evento_calendario', 'dungeon'] as const;
    const intattePrima = new Map(intatte.filter((t) => esisteTabella(db, t)).map((t) => [t, improntaTabella(db, t)] as const));
    const datiGuidaPrima = righePerChiave(db, 'dati_guida', ['chiave']);
    const partitePrima = improntaPartite(db);
    const archiviatePrima = archiviate(db, COLONNA);

    const perGiorno = new Map<string, Avviso[]>();
    for (const a of AVVISI_343) perGiorno.set(a.data, [...(perGiorno.get(a.data) ?? []), a]);
    const leggi = db.prepare('SELECT avvisi_json, seed_json FROM main.giorno WHERE data = ?');
    const scrivi = db.prepare('UPDATE main.giorno SET avvisi_json = ? WHERE data = ? AND avvisi_json = ?');
    const archivio: RigheArchiviate = {};
    const tolte: number[] = [], riscritte: number[] = [], giaFatte: number[] = [];
    const restate: Array<{ numero: number; data: string; motivo: string }> = [];
    const giorniCambiati = new Set<string>();

    for (const [data, frasi] of perGiorno) {
      const r = leggi.get(data) as { avvisi_json: string; seed_json: string | null } | undefined;
      let avvisi: unknown;
      try { avvisi = r ? JSON.parse(r.avvisi_json) : null; } catch { avvisi = null; }
      if (!r || !Array.isArray(avvisi)) { for (const f of frasi) restate.push({ numero: f.numero, data, motivo: 'giorno assente o avvisi illeggibili' }); continue; }
      let nuovi: unknown[] = [...avvisi];
      for (const f of frasi) {
        const volte = nuovi.filter((t) => t === f.atteso).length;
        if (volte === 0) {
          // già fatto se la frase non c'è più e, per una riscrittura, c'è quella nuova
          if (f.nuovo === undefined || nuovi.includes(f.nuovo)) giaFatte.push(f.numero);
          else restate.push({ numero: f.numero, data, motivo: 'testo diverso da quello atteso' });
          continue;
        }
        if (volte > 1) { restate.push({ numero: f.numero, data, motivo: 'frase ripetuta nel giorno' }); continue; }
        if (r.seed_json !== null) { restate.push({ numero: f.numero, data, motivo: 'giorno corretto dall\'utente' }); continue; }
        if (!coperto(db, f)) { restate.push({ numero: f.numero, data, motivo: 'manca il dato che la copre (voce o trama allineata)' }); continue; }
        archivio[`${data} #${f.numero}`] = f.atteso;
        if (f.nuovo !== undefined) { const nuovo = f.nuovo; nuovi = nuovi.map((t) => (t === f.atteso ? nuovo : t)); riscritte.push(f.numero); }
        else { nuovi = nuovi.filter((t) => t !== f.atteso); tolte.push(f.numero); }
      }
      const json = JSON.stringify(nuovi);
      if (json === r.avvisi_json) continue;
      if (scrivi.run(json, data, r.avvisi_json).changes !== 1) errore(`il giorno ${data} non si scrive`);
      giorniCambiati.add(data);
    }

    // l'archivio: la colonna si estende, le righe della 339 restano accanto alle nuove (chiavi diverse, «MM-GG #numero»)
    const chiaviNuove = Object.keys(archivio);
    if (chiaviNuove.length) {
      const esistenti = archivioDellaColonna(db);
      const usate = chiaviNuove.filter((k) => k in esistenti);
      if (usate.length) errore(`chiavi d'archivio già usate: ${usate.join(', ')}`);
      archiviaFrasi(db, 'L8-02 · 343', { [COLONNA]: { ...esistenti, ...archivio } }, {
        [`${COLONNA} · 343`]: { elenco: AVVISI_343.length, tolte, riscritte, giaFatte, restate, giorniCambiati: [...giorniCambiati] },
      });
    }

    // le verifiche: archivio = righe di prima + righe nuove, le altre colonne e gli altri giorni identici, il resto intatto
    if (archiviate(db, COLONNA) !== archiviatePrima + chiaviNuove.length) errore(`archivio della colonna ${COLONNA} incompleto`);
    if (improntaTabella(db, 'giorno', ['avvisi_json']) !== altreColonne) errore('le altre colonne di giorno sono cambiate');
    for (const r of db.prepare('SELECT data, avvisi_json FROM main.giorno').all() as Array<{ data: string; avvisi_json: string }>) {
      if (!giorniCambiati.has(r.data) && avvisiPrima.get(r.data) !== r.avvisi_json) errore(`gli avvisi del ${r.data}, fuori dall'elenco, sono cambiati`);
    }
    for (const [t, h] of intattePrima) if (improntaTabella(db, t) !== h) errore(`la tabella ${t} è cambiata`);
    const altre = diverseFuori(datiGuidaPrima, righePerChiave(db, 'dati_guida', ['chiave']), new Set([ARCHIVIO_FRASI]));
    if (altre.length) errore(`altre righe di dati_guida sono cambiate: ${altre.join(', ')}`);
    if (improntaPartite(db) !== partitePrima) errore('le tabelle delle partite sono cambiate');
    logger.info({ migrazione: 343, tolte: tolte.length, riscritte: riscritte.length, giaFatte: giaFatte.length, restate }, 'avvisi del giorno decisi il 01/11');
  },
};
