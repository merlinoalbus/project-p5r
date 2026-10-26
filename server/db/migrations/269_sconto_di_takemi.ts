// ============================================================
// Migrazione 269 — lo sconto della Clinica di Takemi in un punto solo, tolte le copie dalle descrizioni (chiusura dell'ondata 5)
// ============================================================
//
// Revisione finale dell'ondata 5, rilievo 4: gli sconti della Clinica di Takemi stavano come prezzi copiati in dieci descrizioni del catalogo
// («Clinica Takemi (Rango Morte 5; sconto 1.700¥)»: la metà esatta del prezzo dell'offerta) e gli yen automatici (decisione 18) scalavano il
// prezzo pieno. Decisione 4: il prezzo vive solo nell'offerta; decisione 21: «Non sono d'accordo nel rimandare attività a fasi successive».
//
// Guida italiana: la pagina del Confidente [Takemi] («Guida rango Confidente di Tae Takemi, Morte», letta il 2026-10-26) dà l'abilità «Sconto»
// al Rango 7: «Riduce il prezzo di tutti gli oggetti in vendita alla clinica»; la pagina Negozi speciali [S]: «Portando avanti il Confidente
// otterremo … uno sconto del 50% sugli acquisti effettuati presso la clinica», senza un rango. Le due pagine non sono in disaccordo (la nota del
// negozio diceva che [S] lo desse «al rango massimo»: non lo dice): lo sconto è del 50% dal Rango 7.
//   1. `negozio.sconto_json` della Clinica = `{ confidente: 'takemi', rango: 7, percentuale: 50 }` (colonna della 254): lo leggono gli yen della
//      spunta e dei turni, il listino della partita («Con lo sconto del 50%: 1.700 ¥») e la scheda del negozio («Sconto del 50% dal rango 7 di
//      Takemi»), e si modifica dal modulo del negozio;
//   2. la nota del negozio perde le frasi che lo sconto e le condizioni degli articoli ora dicono come dati (lo sconto e la sua «discrepanza»,
//      le soglie di rango ripetute dalle condizioni delle offerte): resta la scelta sulla data di apertura;
//   3. dalle dieci descrizioni si toglie solo il frammento dello sconto in yen (il resto, la reperibilità della guida, resta).
// Il numero 269 era libero nel blocco del lotto E (260-269): la revisione finale chiedeva di riempire i buchi del registro.
//
// Conservativa: il negozio e le schede si toccano solo se sono della guida e mai corretti dall'utente e se il testo è quello atteso; uno sconto
// già scritto (anche dall'utente) non si cambia. Nessuna voce del Diario e nessun dato delle partite cambia (le spunte già fatte hanno già mosso i
// loro yen). Idempotente. Audit in `dati_guida.audit-269-sconto-di-takemi`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { improntaDiario, scriviAuditChiusura, scriviColonnaCatalogo, type EsitoColonna } from './chiusuraOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-269-sconto-di-takemi';
const NEGOZIO = 'clinica-takemi';
const SCONTO = { confidente: 'takemi', rango: 7, percentuale: 50 } as const;

const NOTA_PRIMA = 'Ogni rango del Confidente Takemi sblocca nuovi articoli in vendita (Rango 1, 3, 5, 10 come soglie principali). Sconto del 50 percento su tutti gli articoli riportato dalla guida in due punti leggermente diversi: la pagina negozi-speciali lo attribuisce al rango massimo, la pagina del Confidente Takemi lo attribuisce al Rango 7 (abilità Sconto). Segnalata la discrepanza, non risolta con le fonti disponibili. L\'inventario è legato al Rango Confidente di Takemi (nuovi oggetti curativi, consumabili di supporto e strumenti di rianimazione a ogni avanzamento); la guida non indica una data di apertura, la data è quella dell\'avvio del Confidente';
const NOTA_DOPO = 'La guida non indica una data di apertura: la data è quella dell\'avvio del Confidente.';

/** Le descrizioni: testo atteso → testo senza il frammento dello sconto (la metà del prezzo dell'offerta). */
const DESCRIZIONI: ReadonlyArray<{ chiave: string; prima: string; dopo: string }> = [
  { chiave: 'consumabile/recup-ro-50-mg', prima: 'Clinica Takemi, Yongen-Jaya (da 16 aprile; sconto a Rango Morte alto, 400¥)', dopo: 'Clinica Takemi, Yongen-Jaya (da 16 aprile)' },
  { chiave: 'consumabile/recup-ro-100-mg', prima: 'Clinica Takemi (da 16 aprile, sconto 800¥); Televendite', dopo: 'Clinica Takemi (da 16 aprile); Televendite' },
  { chiave: 'consumabile/takemedic', prima: 'Clinica Takemi (Rango Morte 5; sconto 1.700¥)', dopo: 'Clinica Takemi (Rango Morte 5)' },
  { chiave: 'consumabile/takemedic-all', prima: 'Clinica Takemi (Rango Morte 1; sconto 950¥)', dopo: 'Clinica Takemi (Rango Morte 1)' },
  { chiave: 'consumabile/takemedic-all-v', prima: 'Clinica Takemi (Rango Morte 1; sconto 1.800¥)', dopo: 'Clinica Takemi (Rango Morte 1)' },
  { chiave: 'consumabile/takemedic-all-z', prima: 'Clinica Takemi (Rango Morte 5; sconto 4.200¥)', dopo: 'Clinica Takemi (Rango Morte 5)' },
  { chiave: 'consumabile/iv-100', prima: 'Clinica Takemi (Rango Morte 3; sconto 1.800¥)', dopo: 'Clinica Takemi (Rango Morte 3)' },
  { chiave: 'consumabile/unguento-vitale', prima: 'Clinica Takemi (Rango Morte 5; sconto 3.200¥), scambio gacha Kin-Ki kink', dopo: 'Clinica Takemi (Rango Morte 5), scambio gacha Kin-Ki kink' },
  { chiave: 'consumabile/kajaclear-r', prima: 'Clinica Takemi (Rango Morte 3; sconto 1.900¥)', dopo: 'Clinica Takemi (Rango Morte 3)' },
  { chiave: 'consumabile/kundaclear-r', prima: 'Clinica Takemi (Rango Morte 3; sconto 1.900¥)', dopo: 'Clinica Takemi (Rango Morte 3)' },
];

export const migration269: Migration = {
  id: 269,
  name: 'sconto_di_takemi',
  up(db) {
    if (!db.inTransaction) throw new Error('269: manca la transazione della migrazione; nessuna modifica applicata.');
    if (!esisteTabella(db, 'negozio') || !haColonna(db, 'negozio', 'sconto_json')) { logger.warn({ migrazione: 269 }, 'colonna dello sconto assente: niente da fare'); return; }
    const diarioPrima = improntaDiario(db);
    const n = db.prepare('SELECT sconto_json, note, origine, seed_json FROM main.negozio WHERE chiave = ?').get(NEGOZIO) as { sconto_json: string | null; note: string | null; origine: string; seed_json: string | null } | undefined;
    let cambiate = 0;
    let sconto = 'negozio assente';
    let nota = 'negozio assente';
    if (n) {
      const voluto = JSON.stringify(SCONTO);
      if (n.sconto_json === voluto) sconto = 'già scritto';
      else if (n.sconto_json !== null) sconto = `sconto già scritto (${n.sconto_json}): non toccato`;
      else {
        if (db.prepare('UPDATE main.negozio SET sconto_json = ? WHERE chiave = ? AND sconto_json IS NULL').run(voluto, NEGOZIO).changes !== 1) throw new Error('269: lo sconto della Clinica non si scrive; nessuna modifica applicata.');
        cambiate++; sconto = `scritto: ${voluto}`;
      }
      if (n.note === NOTA_DOPO) nota = 'già senza le copie';
      else if (n.origine !== 'seed' || n.seed_json !== null) nota = 'negozio corretto dall’utente: nota non toccata';
      else if (n.note !== NOTA_PRIMA) nota = 'nota diversa da quella attesa: non toccata';
      else {
        if (db.prepare("UPDATE main.negozio SET note = ?, updated_at = ? WHERE chiave = ? AND note = ? AND origine = 'seed' AND seed_json IS NULL").run(NOTA_DOPO, new Date().toISOString(), NEGOZIO, NOTA_PRIMA).changes !== 1) {
          throw new Error('269: la nota della Clinica non si aggiorna; nessuna modifica applicata.');
        }
        cambiate++; nota = 'riscritta senza lo sconto e le soglie di rango ripetute';
      }
    }
    const esiti: EsitoColonna[] = esisteTabella(db, 'catalogo_oggetto') ? DESCRIZIONI.map((d) => scriviColonnaCatalogo(db, d.chiave, 'descrizione', d.prima, d.dopo)) : [];
    cambiate += esiti.filter((e) => e.esito === 'scritto').length;
    if (improntaDiario(db) !== diarioPrima) throw new Error('269: le voci del Diario sono cambiate; nessuna modifica applicata.');
    if (cambiate) invalidaCacheDiGioco();
    const residui = esisteTabella(db, 'catalogo_oggetto') ? db.prepare("SELECT chiave, descrizione FROM main.catalogo_oggetto WHERE descrizione LIKE '%sconto%'").all() : [];
    scriviAuditChiusura(db, AUDIT, 269, { conteggi: { cambiate, descrizioni: esiti.filter((e) => e.esito === 'scritto').length, residuiSconto: residui.length },
      sconto, nota, notaPrima: NOTA_PRIMA, esiti, residui }, cambiate);
    logger.info({ migrazione: 269, cambiate, sconto, nota }, 'Clinica di Takemi: sconto del 50% dal rango 7 come dato del negozio');
  },
};
