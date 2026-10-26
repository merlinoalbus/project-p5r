// ============================================================
// Migrazione 291 — i DVD: il lettore come condizione, i noleggi di Scarlet come offerte, le voci dei noleggi (Ondata 5, lotto F-bis; decisione 21)
// ============================================================
//
// Censimento F-bis, punto 7: i 12 DVD di Scarlet, il Lettore DVD (Negozio dell'usato Yumenoshima) e l'abbonamento annuale di Scarlet
// incidono sulle letture (i DVD danno Doti guardandoli): nessun film richiedeva il lettore, i noleggi non esistevano come dato e le voci dei
// noleggi non avevano effetti; due voci «restituire X, noleggiare Y» segnavano X come visto per intero (la voce del 09-04 dichiarava finito
// Guy McVer, visto a metà il 08-31). L'abbonamento del 04-23 (periodo validato) ha già la sua proposta (lotto E, `O5E-0b3239d9-01-articolo`).
//
// Che cosa fa:
//   (1) i 12 DVD chiedono il Lettore DVD comprato (condizione «articolo» `yumenoshima/lettore-dvd`, accanto alle loro date), solo se il film è
//       della guida mai corretto dall'utente e l'offerta del lettore c'è;
//   (2) Scarlet ha un'offerta di noleggio per ogni DVD (`scarlet/noleggio-<dvd>`): prezzo 0 (il noleggio è gratuito con l'abbonamento, guida
//       «DVD a noleggio» e voce del 23 aprile), richiede l'abbonamento annuale comprato e le date del DVD, regola di rifornimento
//       `restituzione` (lotto A): il DVD torna disponibile quando è stato visto per intero (`scorteService`, per i film come per i libri della
//       biblioteca). La guida dice anche «un titolo alla volta»: l'app non lo impedisce (un noleggio per DVD, non uno solo in tutto);
//   (3) le voci dei noleggi dopo il 05-31 citano l'offerta del DVD noleggiato (07-09, 07-26, 08-23); nelle due voci «restituire X, noleggiare
//       Y» (07-17, 09-04) l'effetto «X visto per intero» lascia il posto al noleggio di Y (restituire non è guardare). La voce del 10-01
//       («Ritirare il DVD 31») non ha bisogno di un effetto: la restituzione la calcola la regola.
// Conservativa (vedi `fbisOndata5.ts`). Idempotente. Audit in `dati_guida.audit-291-dvd`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import type { EffettoVoce } from '../../../shared/effettiVoce.js';
import { FONTE_DVD, canonico, convertiVoce, creaOfferta, scriviAuditFbis, tabellePartiteConVoce, type Esito } from './fbisOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-291-dvd';
const errore = (motivo: string): never => { throw new Error(`291: ${motivo}; nessuna modifica applicata.`); };
const LETTORE = 'yumenoshima/lettore-dvd';
const ABBONAMENTO = 'scarlet/abbonamento-annuale';
const SCARLET = 'scarlet';
const noleggio = (film: string): string => `${SCARLET}/noleggio-${film.replace(/^dvd-/, '')}`;

const articolo = (a: string): EffettoVoce => ({ tipo: 'articolo', articolo: a });
const lettura = (chiave: string): EffettoVoce => ({ tipo: 'lettura', categoria: 'film', chiave, almeno: null });

/** Le voci dei noleggi dopo il 05-31, come lette il 2026-10-26. */
const VOCI: ReadonlyArray<{ uid: string; data: string; azione: string; togli: { uid: string; film: string } | null; noleggia: string; perche: string }> = [
  { uid: 'adff01bc3339362bcf6b71125c0eb400', data: '07-09', azione: 'Comprare il DVD Betty la grezza a Shibuya', togli: null, noleggia: 'dvd-betty-la-grezza', perche: 'il DVD si noleggia da Scarlet: la voce cita il noleggio' },
  { uid: '7a240cd1791e2af6b8436a5d4c44520e', data: '07-17', azione: 'Central Street: restituire Betty la grezza, noleggiare The Running Dead', togli: { uid: 'dfc51ef9e2b2bf864e85f58008ef5d1b', film: 'dvd-betty-la-grezza' }, noleggia: 'dvd-the-running-dead',
    perche: 'restituire Betty la grezza non è guardarla (finita il 07-12): il «visto per intero» esce, entra il noleggio di The Running Dead' },
  { uid: '96d34646df766184cd0896b7329cde28', data: '07-26', azione: 'Videonoleggio: Prison Escape', togli: null, noleggia: 'dvd-prison-escape', perche: 'il noleggio di Prison Escape' },
  { uid: 'f469cd96eb72b6071cc083b0bf7b71b2', data: '08-23', azione: 'Noleggiare il DVD Guy McVer a Shibuya', togli: null, noleggia: 'dvd-guy-mcver', perche: 'il noleggio di Guy McVer' },
  { uid: 'b98632de5a7f8342dbfec693bc289421', data: '09-04', azione: 'Videonoleggio: restituire Guy McVer, noleggiare 31', togli: { uid: 'b6b42633af1110e1d4a8ccff85888dd9', film: 'dvd-guy-mcver' }, noleggia: 'dvd-31',
    perche: 'restituire Guy McVer non è finirlo (visto 1 volta su 2 il 08-31): il «visto per intero» esce, entra il noleggio di 31' },
];

export const migration291: Migration = {
  id: 291,
  name: 'dvd_lettore_e_noleggi_di_scarlet',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['film', 'articolo', 'negozio', 'catalogo_oggetto', 'voce_giornata', 'voce_effetto']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 291, tabella: t }, 'tabella assente: niente da fare'); return; }
    }
    if (!haColonna(db, 'articolo', 'rifornimento_json') || !haColonna(db, 'film', 'catalogo_chiave')) { logger.warn({ migrazione: 291 }, 'colonne del rifornimento o del catalogo assenti: niente da fare'); return; }
    const adesso = new Date().toISOString();
    const esiti: Esito[] = [];
    const conLettore = !!db.prepare('SELECT 1 FROM main.articolo WHERE chiave = ? AND nascosto = 0').get(LETTORE);
    const conAbbonamento = !!db.prepare('SELECT 1 FROM main.articolo WHERE chiave = ? AND nascosto = 0').get(ABBONAMENTO);
    const film = db.prepare("SELECT chiave, nome, condizioni_json, catalogo_chiave, origine, seed_json FROM main.film WHERE dove = 'dvd' ORDER BY ordine").all() as Array<{ chiave: string; nome: string; condizioni_json: string | null; catalogo_chiave: string | null; origine: string; seed_json: string | null }>;
    const condLettore = { tipo: 'articolo', articolo: LETTORE };
    for (const f of film) {
      const condizioni: unknown[] = (() => { try { const x = JSON.parse(f.condizioni_json ?? '[]') as unknown; return Array.isArray(x) ? x : []; } catch { return []; } })();
      // (1) il lettore
      if (!conLettore) esiti.push({ chiave: `film:${f.chiave}`, esito: 'offerta del lettore assente: condizione non scritta' });
      else if (condizioni.some((c) => canonico(c) === canonico(condLettore))) esiti.push({ chiave: `film:${f.chiave}`, esito: 'chiede già il lettore' });
      else if (f.origine !== 'seed' || f.seed_json !== null) esiti.push({ chiave: `film:${f.chiave}`, esito: 'film corretto dall’utente: non toccato' });
      else {
        const dopo = JSON.stringify([...condizioni, condLettore]);
        if (db.prepare("UPDATE main.film SET condizioni_json = ?, updated_at = ? WHERE chiave = ? AND origine = 'seed' AND seed_json IS NULL").run(dopo, adesso, f.chiave).changes !== 1) errore(`il film ${f.chiave} non si aggiorna`);
        esiti.push({ chiave: `film:${f.chiave}`, esito: 'chiede il Lettore DVD' });
      }
      // (2) il noleggio da Scarlet (le date del DVD e l'abbonamento)
      if (!conAbbonamento || !f.catalogo_chiave) { esiti.push({ chiave: noleggio(f.chiave), esito: !conAbbonamento ? 'abbonamento di Scarlet assente: nessun noleggio' : 'DVD senza scheda del catalogo: nessun noleggio' }); continue; }
      const date = condizioni.filter((c) => (c as { tipo?: unknown }).tipo === 'data' || (c as { tipo?: unknown }).tipo === 'intervallo');
      esiti.push(creaOfferta(db, { chiave: noleggio(f.chiave), negozio: SCARLET, nome: f.nome, categoria: 'altro', prezzo: 0, catalogo: f.catalogo_chiave,
        condizioni: [{ tipo: 'articolo', articolo: ABBONAMENTO }, ...date], quantita: 1, rifornimento: { tipo: 'restituzione', origine: 'guida' }, fonte: FONTE_DVD,
        oggettoFonte: 'film', oggettoChiave: f.chiave }, adesso));
    }
    // (3) le voci dei noleggi
    const partite = tabellePartiteConVoce(db);
    for (const v of VOCI) {
      const a = noleggio(v.noleggia);
      if (!db.prepare('SELECT 1 FROM main.articolo WHERE chiave = ? AND nascosto = 0').get(a)) { esiti.push({ chiave: `voce:${v.data}:${v.uid}`, esito: `saltata: offerta ${a} assente` }); continue; }
      esiti.push(convertiVoce(db, { uid: v.uid, data: v.data, azione: v.azione,
        attesi: v.togli ? [{ uid: v.togli.uid, effetto: lettura(v.togli.film) }] : [], togli: v.togli ? [v.togli.uid] : [],
        aggiungi: [{ seme: `O5-Fbis-291:noleggio:${v.uid}`, effetto: articolo(a) }], motivo: v.perche }, partite, adesso));
    }
    const conteggi = {
      filmConLettore: esiti.filter((e) => e.esito === 'chiede il Lettore DVD').length,
      noleggi: esiti.filter((e) => e.chiave.startsWith(`${SCARLET}/noleggio-`) && e.esito.startsWith('creata')).length,
      vociConvertite: esiti.filter((e) => e.esito.startsWith('convertita')).length,
      vociSaltate: esiti.filter((e) => e.esito.startsWith('saltata')).length,
    };
    const cambiato = conteggi.filmConLettore + conteggi.noleggi + conteggi.vociConvertite > 0;
    if (cambiato) invalidaCacheDiGioco();
    scriviAuditFbis(db, AUDIT, 291, { fonti: [FONTE_DVD], conteggi, esiti,
      nota: 'La voce del 23 aprile (abbonamento, periodo validato) ha la proposta del lotto E (O5E-0b3239d9-01-articolo). «Un titolo alla volta» non è un vincolo dell’app. La voce del 10-01 non ha effetti: la restituzione la calcola la regola.' }, cambiato);
    logger.info({ migrazione: 291, ...conteggi }, 'DVD: lettore come condizione, noleggi di Scarlet, voci dei noleggi');
  },
};
