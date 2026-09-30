// ============================================================
// 093 — 25 aprile: «finire Zorro» e «restituirlo e prendere in prestito la Ballerina» diventano due voci distinte
// ============================================================
//
// Nel canone di produzione la voce del 25 aprile «Finire di leggere "Zorro, il fuorilegge" sulla metro e restituirlo in
// Biblioteca.» segnava finita anche «La ballerina seducente»: l'utente ne aveva corretto il testo (in origine «Biblioteca:
// restituire Zorro, il fuorilegge e prendere in prestito La ballerina seducente»), il collegamento era rimasto sulla
// Ballerina e la conversione della migrazione «utente» 007 ne ha ricavato «Ballerina completata + Zorro completato».
// Scelta dell'utente (2026-10-01): «questo evento deve diventare due eventi distinti... uno è finire la lettura di zorro,
// l'altro è consegnare il libro in bibblioteca e prendere in prestito la Ballerina (non leggere solo prendere in prestito)».
//   - la voce della guida (indice d'origine 1) diventa «Finire di leggere "Zorro, il fuorilegge" sulla metro.»: collegata a
//     Zorro, effetto «Zorro completato»;
//   - la voce che l'utente aveva aggiunto per il prestito della Ballerina (se c'è) diventa «Restituire … e prendere in
//     prestito …», collegata alla Ballerina e senza effetti (il prestito non legge); se non c'è, nasce. Sta subito dopo.
// Si applica solo se la voce della guida è ancora com'era nella guida d'origine o com'era nel canone difettoso: una voce
// cambiata in altro modo non si tocca. Le spunte restano alle loro voci (uid invariati).
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

const DATA = '04-25';
const ZORRO = { tipo: 'lettura', categoria: 'libro', chiave: 'zorro-il-fuorilegge', almeno: null };
const BALLERINA = { tipo: 'lettura', categoria: 'libro', chiave: 'la-ballerina-seducente', almeno: null };
/** Gli stati in cui la voce della guida si ripara: com'era nella guida d'origine, o col difetto della conversione. */
const TESTI_RICONOSCIUTI = [
  'Biblioteca: restituire Zorro, il fuorilegge e prendere in prestito La ballerina seducente',
  'Finire di leggere "Zorro, il fuorilegge" sulla metro e restituirlo in Biblioteca.',
];
const EFFETTI_RICONOSCIUTI = [JSON.stringify([ZORRO]), JSON.stringify([BALLERINA, ZORRO])];
/** La voce del prestito aggiunta dall'utente in produzione (uid della sua cosa da fare, «utente» 015). */
const UID_PRESTITO_UTENTE = '6a891ae608f8d27dcf961ca387c6d497';
export const TESTO_LETTURA = 'Finire di leggere "Zorro, il fuorilegge" sulla metro.';
export const TESTO_BIBLIOTECA = 'Restituire "Zorro, il fuorilegge" in Biblioteca e prendere in prestito "La ballerina seducente".';

interface Voce { uid: string; fascia: string; ordine: number; azione: string; produce_json: string; indice_guida: number | null }

export const migration093: Migration = {
  id: 93,
  name: 'zorro_e_ballerina',
  up(db) {
    if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'voce_giornata'").get()) return;
    const guida = db.prepare('SELECT uid, fascia, ordine, azione, produce_json, indice_guida FROM voce_giornata WHERE data = ? AND indice_guida = 1').get(DATA) as Voce | undefined;
    if (!guida || !TESTI_RICONOSCIUTI.includes(guida.azione) || !EFFETTI_RICONOSCIUTI.includes(guida.produce_json)) {
      logger.info({ presente: !!guida }, 'migrazione 093: la voce di Zorro del 25 aprile non è in uno stato riconosciuto, non si tocca');
      return;
    }
    const adesso = new Date().toISOString();
    db.prepare(`UPDATE voce_giornata SET azione = ?, tipo = 'libro', riferimento_tipo = 'libro', riferimento_chiave = 'zorro-il-fuorilegge', riferimento_testo = NULL,
      produce_json = ?, updated_at = ? WHERE uid = ?`).run(TESTO_LETTURA, JSON.stringify([ZORRO]), adesso, guida.uid);

    // la voce del prestito: quella dell'utente se c'è ancora com'era, altrimenti una nuova (uid dall'identità della riparazione)
    const prestito = db.prepare('SELECT uid, azione FROM voce_giornata WHERE uid = ?').get(UID_PRESTITO_UTENTE) as { uid: string; azione: string } | undefined;
    let uid: string;
    if (prestito && /prestito/i.test(prestito.azione) && /ballerina/i.test(prestito.azione)) {
      uid = prestito.uid;
      db.prepare(`UPDATE voce_giornata SET azione = ?, note = NULL, genere = 'azione', fascia = ?, tipo = 'libro', riferimento_tipo = 'libro', riferimento_chiave = 'la-ballerina-seducente',
        riferimento_testo = NULL, rango_atteso = NULL, produce_json = '[]', updated_at = ? WHERE uid = ?`).run(TESTO_BIBLIOTECA, guida.fascia, adesso, uid);
    } else {
      uid = createHash('sha256').update(`riparazione|093|${DATA}|biblioteca`).digest('hex').slice(0, 32);
      db.prepare(`INSERT OR IGNORE INTO voce_giornata (uid, data, fascia, ordine, genere, azione, note, tipo, riferimento_tipo, riferimento_chiave, riferimento_testo, rango_atteso, produce_json, indice_guida, created_at, updated_at)
        VALUES (?, ?, ?, 1000000, 'azione', ?, NULL, 'libro', 'libro', 'la-ballerina-seducente', NULL, NULL, '[]', NULL, ?, ?)`).run(uid, DATA, guida.fascia, TESTO_BIBLIOTECA, adesso, adesso);
    }

    // subito dopo la lettura, e le fasce del giorno compatte (0, 1, 2…)
    const scrivi = db.prepare('UPDATE voce_giornata SET ordine = ? WHERE uid = ?');
    for (const fascia of ['giorno', 'sera']) {
      const voci = (db.prepare('SELECT uid FROM voce_giornata WHERE data = ? AND fascia = ? AND uid <> ? ORDER BY ordine, uid').all(DATA, fascia, uid) as Array<{ uid: string }>).map((r) => r.uid);
      if (fascia === guida.fascia) voci.splice(voci.indexOf(guida.uid) + 1, 0, uid);
      voci.forEach((u, i) => scrivi.run(i, u));
    }
    logger.info({ lettura: guida.uid, biblioteca: uid, dallaVoceDellUtente: uid === UID_PRESTITO_UTENTE }, 'migrazione 093: Zorro e Ballerina in due voci');
  },
};
