// ============================================================
// Utente 043 — `lettura_partita` tolta: «letto» si calcola dall'avanzamento (L11 · B15, R11-02/13)
// ============================================================
//
// `lettura_partita` era lo specchio derivato di `progresso_libro_partita` / `progresso_film_partita`: dalla R10-20 («letto» si calcola dall'avanzamento, un
// contatore solo) nessun codice la scrive (`attivitaService`) né la legge (`motoreDiario`), e la utente 037 ha già portato al completo l'avanzamento dei
// libri e dei film che avevano una riga (sulla copia dell'istanza: 0 da portare). Questa migrazione riesegue lo stesso controllo come GUARDIA (dove una
// riga ha un avanzamento più basso delle sessioni lo porta al completo: mai si abbassa né si toglie nulla, e lo stato visibile «letto» resta identico),
// poi toglie la tabella. Una riga di un libro o di un film che non esiste più nei dati di gioco non ha un avanzamento da portare e non si conta.
// NON si tocca `turno_partita`: non è un doppione (registro ordinato dei turni, con la chiave di `effetto_lettura_partita` per togliere identico quel
// turno, e la pesca ha `turno_partita.uid`): resta, con motivo. Il registro `FONTI_TOLTE` (server/db/fontiTolte.ts) ha la voce della tabella e
// `RIFERIMENTI_PARTITE` non cita più `lettura_partita`.
// Non scrive in `main`. Prima di una migrazione delle partite il server copia `partite.db` (`runBootBackup`). Idempotente: se la tabella non c'è non
// fa niente. Dopo il DROP controlla che nessun'altra tabella delle partite sia cambiata (salvo i due avanzamenti, solo se la guardia li ha portati).
// ============================================================

import { createHash } from 'node:crypto';
import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

const AVANZAMENTI = ['progresso_libro_partita', 'progresso_film_partita'] as const;
const errore = (motivo: string): never => { throw new Error(`utente 043: ${motivo}; nessuna modifica applicata.`); };
const tabelleUtente = (db: AppDatabase): string[] => db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").pluck().all() as string[];
const haGioco = (db: AppDatabase, t: string): boolean => !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(t);

/** Impronta (conteggio e SHA-256) di ogni riga di una tabella delle partite, nell'ordine di inserimento (o della chiave per le tabelle senza rowid). */
function impronta(db: AppDatabase, t: string): string {
  const colonne = (db.prepare(`PRAGMA utente.table_info("${t}")`).all() as Array<{ name: string }>).map((c) => `"${c.name}"`).join(', ');
  let st; try { st = db.prepare(`SELECT ${colonne} FROM utente."${t}" ORDER BY rowid`); } catch { st = db.prepare(`SELECT ${colonne} FROM utente."${t}"`); }
  const h = createHash('sha256'); let n = 0;
  for (const r of st.iterate()) { h.update(JSON.stringify(r) + '\n'); n++; }
  return `${n}:${h.digest('hex')}`;
}

export const utente043: Migration = {
  id: 43,
  name: 'toglie_lettura_partita',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!tabelleUtente(db).includes('lettura_partita')) return;
    const righe = (db.prepare('SELECT COUNT(*) FROM utente.lettura_partita').pluck().get() as number);
    if (righe > 0 && (!haGioco(db, 'libro') || !haGioco(db, 'film'))) errore('mancano libro e film nei dati di gioco e ci sono righe di lettura_partita da controllare');

    const altre = tabelleUtente(db).filter((t) => t !== 'lettura_partita' && !(AVANZAMENTI as readonly string[]).includes(t));
    const prima = new Map(altre.map((t) => [t, impronta(db, t)]));
    const avanzamentiPrima = new Map(AVANZAMENTI.filter((t) => tabelleUtente(db).includes(t)).map((t) => [t, impronta(db, t)]));

    // guardia (stessa regola della 037): l'avanzamento dei letti è completo, altrimenti si porta al completo
    const adesso = new Date().toISOString();
    let libriPortati = 0, filmPortati = 0;
    if (righe > 0 && avanzamentiPrima.has('progresso_libro_partita')) {
      libriPortati = db.prepare(`INSERT INTO utente.progresso_libro_partita (partita_id, libro_chiave, avanzamento, updated_at)
        SELECT l.partita_id, l.chiave, MAX(COALESCE(b.sessioni, 1), 1), ? FROM utente.lettura_partita l JOIN main.libro b ON b.chiave = l.chiave WHERE l.tipo = 'libro'
        ON CONFLICT(partita_id, libro_chiave) DO UPDATE SET avanzamento = excluded.avanzamento, updated_at = excluded.updated_at
          WHERE progresso_libro_partita.avanzamento < excluded.avanzamento`).run(adesso).changes;
    }
    if (righe > 0 && avanzamentiPrima.has('progresso_film_partita')) {
      filmPortati = db.prepare(`INSERT INTO utente.progresso_film_partita (partita_id, film_chiave, avanzamento, updated_at)
        SELECT l.partita_id, l.chiave, MAX(COALESCE(f.sessioni, 1), 1), ? FROM utente.lettura_partita l JOIN main.film f ON f.chiave = l.chiave WHERE l.tipo = 'film'
        ON CONFLICT(partita_id, film_chiave) DO UPDATE SET avanzamento = excluded.avanzamento, updated_at = excluded.updated_at
          WHERE progresso_film_partita.avanzamento < excluded.avanzamento`).run(adesso).changes;
    }
    // ogni riga di un libro o film che esiste ha ora l'avanzamento completo, o la tabella non si toglie
    if (righe > 0) {
      const incomplete = [
        avanzamentiPrima.has('progresso_libro_partita') ? db.prepare(`SELECT COUNT(*) FROM utente.lettura_partita l JOIN main.libro b ON b.chiave = l.chiave WHERE l.tipo = 'libro'
          AND COALESCE((SELECT avanzamento FROM utente.progresso_libro_partita p WHERE p.partita_id = l.partita_id AND p.libro_chiave = l.chiave), 0) < MAX(COALESCE(b.sessioni, 1), 1)`).pluck().get() as number : 0,
        avanzamentiPrima.has('progresso_film_partita') ? db.prepare(`SELECT COUNT(*) FROM utente.lettura_partita l JOIN main.film f ON f.chiave = l.chiave WHERE l.tipo = 'film'
          AND COALESCE((SELECT avanzamento FROM utente.progresso_film_partita p WHERE p.partita_id = l.partita_id AND p.film_chiave = l.chiave), 0) < MAX(COALESCE(f.sessioni, 1), 1)`).pluck().get() as number : 0,
      ];
      if (incomplete[0]! + incomplete[1]! > 0) errore(`${incomplete[0]! + incomplete[1]!} letture non hanno l'avanzamento completo dopo la guardia`);
    }

    db.exec('DROP TABLE utente.lettura_partita');

    if (tabelleUtente(db).includes('lettura_partita')) errore('la tabella lettura_partita esiste ancora');
    for (const [t, firma] of prima) if (impronta(db, t) !== firma) errore(`la tabella ${t} delle partite è cambiata`);
    if (libriPortati + filmPortati === 0) for (const [t, firma] of avanzamentiPrima) if (impronta(db, t) !== firma) errore(`l'avanzamento ${t} è cambiato senza che la guardia abbia portato niente`);
    logger.info({ migrazione: 'utente-043', righeLetturaPartita: righe, libriPortatiAlCompleto: libriPortati, filmPortatiAlCompleto: filmPortati }, 'lettura_partita tolta: «letto» si calcola dall’avanzamento');
  },
};
