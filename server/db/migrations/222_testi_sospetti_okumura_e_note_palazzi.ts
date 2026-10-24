// ============================================================
// 222 — voce del 4/10 di Okumura, titolo dell'evento 103 e note sulle date dei Palazzi (L11, M-B; documento `lotti/L11/testi-sospetti-0108-sera-e-1004-2026-10-24.md`)
// ============================================================
//
// 1. Voce `c66a02b6…` (4/10, Okumura): il testo si fermava alla Linea di smaltimento, ma la guida italiana fa fare nella stessa visita anche Fabbrica centrale, Interscambio e
//    Produzione armamenti (verbatim). Si aggiungono in coda alla lista i tre nomi, senza altri dettagli; il testo di prima va in `testo_precedente_json`.
// 2. Evento di calendario 103: il titolo «Prima infiltrazione nel Palazzo di Okumura» diventa «Infiltrazione estesa nel Palazzo di Okumura» (la prima è il 15/9; il 4/10 è la seconda).
// 3. Le date dei Palazzi di Futaba e di Okumura non cambiano (decisione dell'utente: «Resta il percorso»): si aggiunge soltanto una nota in coda a `dungeon.note` sulla differenza dalle date Royal.
// La voce del 1/8 sera NON si tocca (decisione dell'utente: «Lascia com'è»). Guardie sul testo attuale; già corrette: niente. Idempotente. Nessuna voce del Diario validato è toccata.
// ============================================================

import { createHash } from 'node:crypto';
import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';

const PREFISSO = 'c66a02b6';
const FINE_VECCHIA = 'Linea di smaltimento)';
const FINE_NUOVA = 'Linea di smaltimento, Fabbrica centrale, Interscambio, Produzione armamenti)';
const TITOLO_VECCHIO = 'Prima infiltrazione nel Palazzo di Okumura';
const TITOLO_NUOVO = 'Infiltrazione estesa nel Palazzo di Okumura';
const NOTE_PALAZZI: ReadonlyArray<readonly [string, string]> = [
  ['futaba', 'Date nel Diario: il percorso segue la guida italiana (25/7, 1/8, 3/8) e resta così, per decisione dell\'utente. Il Royal le colloca diversamente: Samurai Gamers 1ª infiltrazione il 25/7; i dati di gioco (ACE) tesoro raggiunto il 26/7 e preso il 27/7, completamento richiesto il 30/7.'],
  ['okumura', 'Date nel Diario: il percorso segue la guida italiana (15/9, 4/10, 6/10) e resta così, per decisione dell\'utente. Il Royal le colloca diversamente: Samurai Gamers nessun Palazzo in ottobre; i dati di gioco (ACE, in riassunto) tesoro il 23/9.'],
];
const errore = (motivo: string): never => { throw new Error(`222: ${motivo}; nessuna modifica applicata.`); };

function improntaVoci(db: AppDatabase): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of db.prepare('SELECT * FROM main.voce_giornata ORDER BY uid').iterate() as Iterable<Record<string, unknown>>) m.set(String(r.uid), createHash('sha256').update(JSON.stringify(r)).digest('hex'));
  return m;
}

export const migration222: Migration = {
  id: 222, name: 'testi_sospetti_okumura_e_note_palazzi',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'voce_giornata')) return;
    const prima = improntaVoci(db);
    const fatte: string[] = [];

    const voci = db.prepare('SELECT uid, data, azione, note, riferimento_tipo, riferimento_chiave, riferimento_testo FROM main.voce_giornata WHERE uid LIKE ?').all(`${PREFISSO}%`) as
      Array<{ uid: string; data: string; azione: string; note: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null; riferimento_testo: string | null }>;
    if (voci.length > 1) errore(`${voci.length} voci cominciano con ${PREFISSO}`);
    const v = voci[0];
    let uidToccata: string | null = null;
    if (v && v.data === '10-04' && v.azione.endsWith(FINE_VECCHIA) && !v.azione.includes('Fabbrica centrale')) {
      const precedente = JSON.stringify({ azione: v.azione, note: v.note, riferimento_tipo: v.riferimento_tipo, riferimento_chiave: v.riferimento_chiave, riferimento_testo: v.riferimento_testo });
      db.prepare('UPDATE main.voce_giornata SET azione = ?, testo_precedente_json = ?, updated_at = ? WHERE uid = ?')
        .run(v.azione.slice(0, v.azione.length - FINE_VECCHIA.length) + FINE_NUOVA, precedente, new Date().toISOString(), v.uid);
      uidToccata = v.uid; fatte.push('voce 4/10');
    }

    if (esisteTabella(db, 'evento_calendario')) {
      const info = db.prepare('UPDATE main.evento_calendario SET titolo = ? WHERE id = 103 AND titolo = ?').run(TITOLO_NUOVO, TITOLO_VECCHIO);
      if (info.changes === 1) fatte.push('evento 103');
    }

    if (esisteTabella(db, 'dungeon')) {
      for (const [chiave, nota] of NOTE_PALAZZI) {
        const d = db.prepare('SELECT note FROM main.dungeon WHERE chiave = ?').get(chiave) as { note: string } | undefined;
        if (!d || d.note.includes('Date nel Diario: il percorso segue')) continue;
        db.prepare('UPDATE main.dungeon SET note = ? WHERE chiave = ?').run(d.note ? `${d.note.trimEnd()}\n${nota}` : nota, chiave);
        fatte.push(`dungeon ${chiave}`);
      }
    }
    if (fatte.length === 0) return;

    const dopo = improntaVoci(db);
    if (dopo.size !== prima.size) errore('il numero delle voci del Diario è cambiato');
    for (const [uid, imp] of prima) if (uid !== uidToccata && dopo.get(uid) !== imp) errore(`la voce ${uid}, non in elenco, è cambiata`);
    logger.info({ migrazione: 'L11-222', fatte }, 'testi sospetti di Okumura e note sulle date dei Palazzi');
  },
};
