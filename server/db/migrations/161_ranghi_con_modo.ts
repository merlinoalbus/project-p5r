// ============================================================
// 161 — modo di avanzamento dei ranghi dei Confidenti (R9-07b, G-020)
// ============================================================
//
// `confidente_rango` dice solo quanti punti servono per salire; non dice COME si sale. Aggiunge due colonne:
//   `modo`  = 'punti' (soglia in punti), 'evento' (un evento o una condizione propria), 'automatico' (con la trama), 'richieste' (con le
//             richieste dei Memento completate), 'velluto' (fusione alla Stanza di Velluto);
//   `fonte` = da dove viene il dato ('G-020').
// Regole (G-020 §7): ogni rango con una soglia in punti è 'punti'; senza soglia è 'evento', tranne: Igor, Morgana e Sae, tutti automatici con la
// trama; le Gemelle, tutte a fusione; Mishima, automatico ai ranghi 1-2 e poi 'richieste'; Akechi e Maruki, il 9→10 è automatico. Yoshida non ha
// soglie (ogni discorso è un rango): tutti 'evento'. Igor, Morgana, Sae, Gemelle e Mishima non avevano righe: ne ricevono nove (rango 1-9, soglia 0),
// perché il loro modo sia scritto in un posto solo. La soglia in punti non cambia mai. Idempotente: una riga con `fonte` già scritta non si tocca.
// ============================================================

import type { Migration } from '../migrationRunner.js';

const FONTE = 'G-020';
const SENZA_RIGHE: Record<string, (rango: number) => string> = {
  igor: () => 'automatico', morgana: () => 'automatico', sae: () => 'automatico', gemelle: () => 'velluto',
  mishima: (rango) => (rango <= 2 ? 'automatico' : 'richieste'),
};
/** Ranghi a soglia zero che non sono 'evento'. */
const AUTOMATICI: ReadonlyArray<readonly [string, number]> = [['akechi', 9], ['maruki', 9]];

export const migration161: Migration = {
  id: 161, name: 'ranghi_con_modo',
  up(db) {
    const colonne = new Set((db.prepare("PRAGMA main.table_info(confidente_rango)").all() as Array<{ name: string }>).map((c) => c.name));
    if (!colonne.has('modo')) db.exec("ALTER TABLE main.confidente_rango ADD COLUMN modo TEXT NOT NULL DEFAULT 'punti' CHECK (modo IN ('punti', 'evento', 'automatico', 'richieste', 'velluto'))");
    if (!colonne.has('fonte')) db.exec('ALTER TABLE main.confidente_rango ADD COLUMN fonte TEXT');
    const esiste = db.prepare('SELECT 1 FROM main.confidente WHERE chiave = ?');
    const inserisci = db.prepare('INSERT OR IGNORE INTO main.confidente_rango (confidente_chiave, rango, punti_necessari, modo, fonte) VALUES (?, ?, 0, ?, ?)');
    for (const [chiave, modo] of Object.entries(SENZA_RIGHE)) {
      if (!esiste.get(chiave)) continue;
      for (let rango = 1; rango <= 9; rango++) inserisci.run(chiave, rango, modo(rango), FONTE);
    }
    db.exec(`UPDATE main.confidente_rango SET modo = 'punti', fonte = '${FONTE}' WHERE fonte IS NULL AND punti_necessari > 0;
      UPDATE main.confidente_rango SET modo = 'evento', fonte = '${FONTE}' WHERE fonte IS NULL AND punti_necessari = 0`);
    const automatico = db.prepare("UPDATE main.confidente_rango SET modo = 'automatico' WHERE confidente_chiave = ? AND rango = ? AND punti_necessari = 0 AND fonte = ?");
    for (const [chiave, rango] of AUTOMATICI) automatico.run(chiave, rango, FONTE);
  },
};
