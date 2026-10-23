import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

/**
 * R10-20: «letto/visto» si calcola dall'avanzamento (un contatore solo). Le partite che hanno una riga in `lettura_partita` ma un
 * avanzamento inferiore alle sessioni del libro o del film lo vedrebbero tornare «non letto»: per ognuna l'avanzamento si porta al completo
 * (lo stato visibile resta identico: oggi quella riga vale «letto»). Si scrive solo dove l'avanzamento è più basso (mai si abbassa né si
 * toglie nulla) e senza toccare `lettura_partita`, effetti, storico o punti. Sulla copia di p5s del 23/10: 0 righe da portare (tutte le
 * letture già hanno l'avanzamento completo). Idempotente.
 */
export const utente037: Migration = {
  id: 37,
  name: 'letture_complete_dall_avanzamento',
  up(db) {
    const adesso = new Date().toISOString();
    const ok = (t: string) => !!db.prepare("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = ?").get(t);
    const gioco = (t: string) => !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(t);
    if (!ok('lettura_partita') || !gioco('libro') || !gioco('film')) return;
    let libri = 0, film = 0;
    if (ok('progresso_libro_partita')) {
      libri = db.prepare(`INSERT INTO utente.progresso_libro_partita (partita_id, libro_chiave, avanzamento, updated_at)
        SELECT l.partita_id, l.chiave, MAX(COALESCE(b.sessioni, 1), 1), ? FROM utente.lettura_partita l JOIN main.libro b ON b.chiave = l.chiave
        WHERE l.tipo = 'libro' AND true
        ON CONFLICT(partita_id, libro_chiave) DO UPDATE SET avanzamento = excluded.avanzamento, updated_at = excluded.updated_at
          WHERE progresso_libro_partita.avanzamento < excluded.avanzamento`).run(adesso).changes;
    }
    if (ok('progresso_film_partita')) {
      film = db.prepare(`INSERT INTO utente.progresso_film_partita (partita_id, film_chiave, avanzamento, updated_at)
        SELECT l.partita_id, l.chiave, MAX(COALESCE(f.sessioni, 1), 1), ? FROM utente.lettura_partita l JOIN main.film f ON f.chiave = l.chiave
        WHERE l.tipo = 'film' AND true
        ON CONFLICT(partita_id, film_chiave) DO UPDATE SET avanzamento = excluded.avanzamento, updated_at = excluded.updated_at
          WHERE progresso_film_partita.avanzamento < excluded.avanzamento`).run(adesso).changes;
    }
    logger.info({ libriPortatiAlCompleto: libri, filmPortatiAlCompleto: film }, '[utente037] letture complete dall\'avanzamento');
  },
};
