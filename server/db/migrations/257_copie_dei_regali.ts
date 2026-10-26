// ============================================================
// Migrazione 257 — via le copie: «dove» e «costo» dei regali con il listino, «gradito a» nei testi degli oggetti (ondata 5, lotto D: RG-02, RG-13)
// ============================================================
//
// Decisione 12 dell'utente: «il prezzo vive solo negli articoli e i regali lo leggono da lì». Decisione 13: i destinatari dei regali «ricavati
// da `confidente_regalo`, con le chiavi dei Confidenti». Censimento ECC: RG-13 («il prezzo e il luogo si leggono solo dagli articoli; il testo
// non si mostra quando c'è un listino»: la scheda del Confidente ripeteva sotto il listino «Indicazioni della guida: …», per esempio
// «9.800-9.980¥» o «3.200 yen (High Sense) / 2.980 yen (Televendite)») e RG-02 (13 oggetti del catalogo e i loro 13 articoli scrivevano
// «Regalo, gradito a …» con nomi sbagliati: Robot aspirapolvere «Iwai» contro 9 Confidenti, Castella con Hifumi e Ohya…).
//
// Che cosa fa (solo righe della guida, `origine = 'seed'`; quelle cambiate dall'utente restano com'erano e finiscono nell'audit):
//   (1) `confidente_regalo.dove` e `.costo` diventano null dove l'oggetto del regalo ha almeno un'offerta visibile nel listino: il luogo e il
//       prezzo si leggono dalle offerte. I valori di prima restano nell'audit (riga per riga). Senza un'offerta il testo resta: è l'unico punto;
//   (2) l'effetto «Regalo, gradito a …» di catalogo e articoli diventa «Regalo», come quello degli altri regali: chi lo gradisce lo dice
//       l'elenco dei regali dei Confidenti (la scheda dell'oggetto lo legge da lì, «A chi piace»).
// Nessuna partita e nessuna voce del Diario cambia. Idempotente (agisce solo su testi ancora presenti). Audit in `dati_guida.audit-257-copie`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { scriviAuditRegali } from './regaliOndata5.js';

const AUDIT = 'audit-257-copie';
/** Il testo che diceva a chi piace il regalo (sempre dopo «Regalo, »). */
const GRADITO = /^Regalo, gradito a .+$/;

export const migration257: Migration = {
  id: 257,
  name: 'copie_dei_regali',
  up(db) {
    if (!db.inTransaction) throw new Error('257: manca la transazione della migrazione; nessuna modifica applicata.');
    for (const t of ['confidente_regalo', 'catalogo_oggetto', 'articolo', 'dati_guida']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 257, tabella: t }, 'tabella assente: copie dei regali non tolte'); return; }
    }
    const conListino = 'EXISTS (SELECT 1 FROM main.articolo a WHERE a.catalogo_chiave = g.catalogo_chiave AND a.nascosto = 0)';
    // (1) dove e costo copiati dal listino
    const copie = db.prepare(`SELECT g.confidente_chiave, g.ordine, g.dove, g.costo, g.origine FROM main.confidente_regalo g
      WHERE g.catalogo_chiave IS NOT NULL AND ${conListino} AND (g.dove IS NOT NULL OR g.costo IS NOT NULL) ORDER BY g.confidente_chiave, g.ordine`)
      .all() as Array<{ confidente_chiave: string; ordine: number; dove: string | null; costo: string | null; origine: string }>;
    const tolte: Array<Record<string, unknown>> = [];
    const ferme: Array<Record<string, unknown>> = [];
    const togli = db.prepare("UPDATE main.confidente_regalo SET dove = NULL, costo = NULL WHERE confidente_chiave = ? AND ordine = ? AND origine = 'seed' AND dove IS ? AND costo IS ?");
    for (const r of copie) {
      const indirizzo = `${r.confidente_chiave}:${r.ordine}`;
      if (r.origine !== 'seed') { ferme.push({ indirizzo, dove: r.dove, costo: r.costo, motivo: 'riga cambiata dall’utente: resta com’è (con il listino la scheda non la mostra)' }); continue; }
      if (togli.run(r.confidente_chiave, r.ordine, r.dove, r.costo).changes) tolte.push({ indirizzo, prima: { dove: r.dove, costo: r.costo } });
    }
    const senzaListino = db.prepare(`SELECT COUNT(*) FROM main.confidente_regalo g WHERE NOT (g.catalogo_chiave IS NOT NULL AND ${conListino}) AND (g.dove IS NOT NULL OR g.costo IS NOT NULL)`).pluck().get() as number;

    // (2) «gradito a» nei testi degli oggetti
    const gradito: Array<Record<string, unknown>> = [];
    for (const tabella of ['catalogo_oggetto', 'articolo'] as const) {
      const righe = db.prepare(`SELECT chiave, effetto, origine FROM main.${tabella} WHERE effetto LIKE 'Regalo, gradito a %' ORDER BY chiave`).all() as Array<{ chiave: string; effetto: string; origine: string }>;
      for (const r of righe) {
        if (!GRADITO.test(r.effetto)) continue;
        if (r.origine !== 'seed') { ferme.push({ tabella, chiave: r.chiave, effetto: r.effetto, motivo: 'riga cambiata dall’utente: resta com’è' }); continue; }
        if (db.prepare(`UPDATE main.${tabella} SET effetto = 'Regalo' WHERE chiave = ? AND effetto = ? AND origine = 'seed'`).run(r.chiave, r.effetto).changes) gradito.push({ tabella, chiave: r.chiave, prima: r.effetto });
      }
    }
    const conteggi = {
      copieTolte: tolte.length, copieFerme: ferme.filter((f) => 'indirizzo' in f).length, testoSenzaListino: senzaListino,
      graditoCatalogo: gradito.filter((g) => g.tabella === 'catalogo_oggetto').length, graditoArticoli: gradito.filter((g) => g.tabella === 'articolo').length,
      graditoResiduo: (db.prepare("SELECT COUNT(*) FROM main.catalogo_oggetto WHERE effetto LIKE '%gradito a%'").pluck().get() as number)
        + (db.prepare("SELECT COUNT(*) FROM main.articolo WHERE effetto LIKE '%gradito a%'").pluck().get() as number),
    };
    scriviAuditRegali(db, AUDIT, 257, { conteggi, tolte, gradito, ferme });
    for (const f of ferme) logger.warn({ migrazione: 257, ...f }, 'copia lasciata com’è');
    logger.info({ migrazione: 257, ...conteggi }, 'Regali: luogo e prezzo solo dal listino, destinatari solo dall’elenco dei regali');
  },
};
