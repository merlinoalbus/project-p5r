// ============================================================
// 078 — le domande del quiz in TV hanno il loro tipo, e gli esami portano i quesiti
// ============================================================
//
// Undici domande avevano `tipo='altro'` e si riconoscevano solo da `chi='Game show in TV'`: una
// frase al posto di un valore. La tabella viene ricostruita (pattern della 044: stessa DDL con il
// CHECK esteso, `id` conservato perché `domanda_partita` lo cita) e quelle righe diventano
// `tipo='tv'`. Nella stessa occasione le righe degli esami (`esame-medio`, `esame-finale`), che
// avevano solo la risposta, ricevono il quesito da `esame.domande_json`: ogni risposta porta
// `domanda`, così un'unica rappresentazione basta a «Scuola oggi» e alla pagina delle domande.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

const VECCHIO = "CHECK (tipo IN ('classe','esame-medio','esame-finale','altro'))";
const NUOVO = "CHECK (tipo IN ('classe','esame-medio','esame-finale','tv','altro'))";

export const migration078: Migration = {
  id: 78,
  name: 'domanda_tipo_tv',
  up(db) {
    const riga = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'domanda'").get() as { sql: string } | undefined;
    if (!riga) return;
    if (riga.sql.includes(VECCHIO)) {
      const colonne = (db.prepare('PRAGMA table_info(domanda)').all() as Array<{ name: string }>).map((c) => `"${c.name}"`).join(', ');
      // gli indici cadono con la tabella: si rileggono prima e si ricreano dopo (idx_domanda_data della 011, idx_domanda_chiave UNIQUE della 055)
      const indici = (db.prepare("SELECT sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'domanda' AND sql IS NOT NULL").all() as Array<{ sql: string }>).map((i) => i.sql);
      db.exec(riga.sql.replace(VECCHIO, NUOVO).replace(/CREATE TABLE "?domanda"?/i, 'CREATE TABLE domanda_nuova'));
      db.exec(`INSERT INTO domanda_nuova (${colonne}) SELECT ${colonne} FROM domanda;`);
      db.exec('PRAGMA legacy_alter_table = ON; DROP TABLE domanda; ALTER TABLE domanda_nuova RENAME TO domanda; PRAGMA legacy_alter_table = OFF;');
      for (const sql of indici) db.exec(sql);
    }
    const tv = db.prepare("UPDATE domanda SET tipo = 'tv' WHERE tipo = 'altro' AND chi = 'Game show in TV'").run().changes;

    // i quesiti degli esami, dalla tabella esame
    let conQuesiti = 0;
    const esami = db.prepare('SELECT domande_json FROM esame').all() as Array<{ domande_json: string }>;
    const perData = new Map<string, Array<{ ordine: number; domanda: string; risposta: string }>>();
    for (const e of esami) {
      let quesiti: Array<{ data: string; ordine: number; domanda: string; risposta: string }> = [];
      try { quesiti = JSON.parse(e.domande_json) as typeof quesiti; } catch { continue; }
      for (const q of quesiti) { if (!perData.has(q.data)) perData.set(q.data, []); perData.get(q.data)!.push({ ordine: q.ordine, domanda: q.domanda, risposta: q.risposta }); }
    }
    const righeEsame = db.prepare("SELECT id, data, risposte_json FROM domanda WHERE tipo IN ('esame-medio','esame-finale')").all() as Array<{ id: number; data: string; risposte_json: string }>;
    const scrivi = db.prepare('UPDATE domanda SET risposte_json = ? WHERE id = ?');
    for (const r of righeEsame) {
      const quesiti = perData.get(r.data);
      if (!quesiti?.length) continue;
      let attuali: Array<{ ordine: number | null; testo: string; domanda?: string }> = [];
      try { attuali = JSON.parse(r.risposte_json) as typeof attuali; } catch { attuali = []; }
      if (attuali.every((a) => a.domanda)) continue;
      const nuove = quesiti.sort((a, b) => a.ordine - b.ordine).map((q, i) => ({ ordine: i + 1, testo: q.risposta, domanda: q.domanda }));
      scrivi.run(JSON.stringify(nuove), r.id);
      conQuesiti++;
    }
    logger.info({ tv, conQuesiti }, 'migrazione 078: domande del quiz in TV e quesiti degli esami');
  },
};
