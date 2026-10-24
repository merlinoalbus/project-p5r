// ============================================================
// 186 — la fotografia delle affinità delle Persona, per «Ripristina» (L8 · R8-10/1)
// ============================================================
//
// Le affinità di una Persona (`persona_affinita`) diventano correggibili dalla scheda Persona (`PUT /api/compendio/persona/:id/affinita`) e si
// rimettono come le dà la guida (`POST …/ripristina`). Per poterlo fare la tabella conserva com'era ogni riga:
//   - `seed_codice`: il codice della guida (`-`, `wk`, `rs`, `nu`, `rp`, `ab`), riempito qui con il valore di oggi di ogni riga;
//   - `origine`: `seed` finché la riga vale quello della guida, `utente` dopo una correzione (torna `seed` rimettendo la guida).
// Le 27 forme del gruppo (`del_party = 1`, migrazione 170) hanno le loro 10 righe in questa stessa tabella e seguono la stessa regola.
// Nessun valore di `codice` cambia: la migrazione aggiunge due colonne e copia. Idempotente (ogni colonna si aggiunge solo se manca; la copia
// riempie solo i `seed_codice` ancora vuoti). Solo `main`: non scrive in `utente`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

export const migration186: Migration = {
  id: 186, name: 'affinita_persona_fotografia',
  up(db) {
    const colonne = () => (db.prepare("SELECT name FROM pragma_table_info('persona_affinita', 'main')").all() as Array<{ name: string }>).map((c) => c.name);
    if (colonne().length === 0) throw new Error('186:manca la tabella persona_affinita; nessuna modifica applicata.');
    const conta = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
    const prima = { righe: conta('SELECT COUNT(*) AS n FROM main.persona_affinita'), persone: conta('SELECT COUNT(DISTINCT persona_id) AS n FROM main.persona_affinita'), forme: conta('SELECT COUNT(DISTINCT a.persona_id) AS n FROM main.persona_affinita a JOIN main.persona p ON p.id = a.persona_id WHERE p.del_party = 1') };
    const impronta = () => (db.prepare("SELECT group_concat(persona_id || ':' || elemento || ':' || codice, '|') AS s FROM (SELECT persona_id, elemento, codice FROM main.persona_affinita ORDER BY persona_id, elemento)").get() as { s: string | null }).s;
    const improntaPrima = impronta();

    if (!colonne().includes('origine')) db.exec("ALTER TABLE main.persona_affinita ADD COLUMN origine TEXT NOT NULL DEFAULT 'seed' CHECK (origine IN ('seed', 'utente'))");
    if (!colonne().includes('seed_codice')) db.exec('ALTER TABLE main.persona_affinita ADD COLUMN seed_codice TEXT');
    const copiate = db.prepare('UPDATE main.persona_affinita SET seed_codice = codice WHERE seed_codice IS NULL').run().changes;

    // controlli: nessun codice cambiato, nessuna riga persa, ogni riga ha la fotografia, nessuna correzione dell'utente inventata
    if (impronta() !== improntaPrima) throw new Error('186:i codici delle affinità sono cambiati; annullata.');
    if (conta('SELECT COUNT(*) AS n FROM main.persona_affinita') !== prima.righe) throw new Error('186:il numero delle affinità è cambiato; annullata.');
    if (conta('SELECT COUNT(*) AS n FROM main.persona_affinita WHERE seed_codice IS NULL') !== 0) throw new Error('186:restano affinità senza fotografia; annullata.');
    if (conta("SELECT COUNT(*) AS n FROM main.persona_affinita WHERE origine = 'seed' AND seed_codice <> codice") !== 0) throw new Error('186:una riga «seed» ha un codice diverso dalla fotografia; annullata.');
    logger.info({ ...prima, copiate }, '[migration186] fotografia delle affinità delle Persona');
  },
};
