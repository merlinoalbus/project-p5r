// ============================================================
// Migrazione 023 — statistiche con bonus e istantanea del compendio personale (Fase 12.2)
// ============================================================
//
// Prima: la Persona posseduta conservava valori ASSOLUTI (forza…fortuna, NULL = stima del livello), che restavano fermi quando
// saliva di livello. Ora conserva un BONUS per statistica (colonne bonus_*): le statistiche effettive sono la stima del livello
// più il bonus, e seguono il livello. I valori assoluti già registrati diventano scarti rispetto alla stima (anche negativi, per
// non perdere nulla) e le vecchie colonne vengono azzerate (restano per compatibilità dello schema, mai più lette).
// Il compendio personale conserva un'istantanea (livello, bonus, skill, tratto, carica) presa alla registrazione: l'evocazione
// dal Registro la ripristina. Le righe esistenti vengono riempite con lo stato attuale dell'esemplare in scorta, se c'è.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { CHIAVI_STATISTICHE, statistichePerLivello, type Statistiche } from '../../../shared/statistiche.js';

interface RigaAssoluta {
  id: number; livello: number; forza: number | null; magia: number | null; resistenza: number | null; agilita: number | null; fortuna: number | null;
  livello_base: number; b_forza: number; b_magia: number; b_resistenza: number; b_agilita: number; b_fortuna: number;
}

/** Converte i valori assoluti registrati in bonus (valore − stima del livello) e azzera le vecchie colonne. Esportata per i test. */
export function convertiAssoluteInBonus(db: AppDatabase): number {
  const righe = db.prepare(`SELECT pp.id, pp.livello, pp.forza, pp.magia, pp.resistenza, pp.agilita, pp.fortuna, p.livello AS livello_base,
      p.forza AS b_forza, p.magia AS b_magia, p.resistenza AS b_resistenza, p.agilita AS b_agilita, p.fortuna AS b_fortuna
    FROM persona_posseduta pp JOIN persona p ON p.id = pp.persona_id
    WHERE pp.forza IS NOT NULL OR pp.magia IS NOT NULL OR pp.resistenza IS NOT NULL OR pp.agilita IS NOT NULL OR pp.fortuna IS NOT NULL`).all() as RigaAssoluta[];
  const upd = db.prepare(`UPDATE persona_posseduta SET bonus_forza = ?, bonus_magia = ?, bonus_resistenza = ?, bonus_agilita = ?, bonus_fortuna = ?,
    forza = NULL, magia = NULL, resistenza = NULL, agilita = NULL, fortuna = NULL WHERE id = ?`);
  for (const r of righe) {
    const base: Statistiche = { forza: r.b_forza, magia: r.b_magia, resistenza: r.b_resistenza, agilita: r.b_agilita, fortuna: r.b_fortuna };
    const stima = statistichePerLivello(base, r.livello_base, r.livello);
    const bonus = CHIAVI_STATISTICHE.map((k) => (r[k] === null ? 0 : (r[k] as number) - stima[k]));
    upd.run(...bonus, r.id);
  }
  return righe.length;
}

/** Riempie l'istantanea del compendio con lo stato attuale dell'esemplare in scorta (livello, bonus, skill, tratto, carica). */
export function riempiIstantaneeDallaScorta(db: AppDatabase): number {
  const righe = db.prepare(`SELECT cp.partita_id, cp.persona_id, pp.id AS posseduta_id, pp.livello, pp.bonus_forza, pp.bonus_magia, pp.bonus_resistenza, pp.bonus_agilita, pp.bonus_fortuna,
      pp.tratto_skill_id, pp.carica FROM compendio_partita cp JOIN persona_posseduta pp ON pp.partita_id = cp.partita_id AND pp.persona_id = cp.persona_id WHERE cp.registrata = 1`).all() as Array<{
    partita_id: number; persona_id: number; posseduta_id: number; livello: number; bonus_forza: number; bonus_magia: number; bonus_resistenza: number; bonus_agilita: number; bonus_fortuna: number; tratto_skill_id: number | null; carica: number;
  }>;
  const skillDi = db.prepare('SELECT skill_id FROM persona_posseduta_skill WHERE posseduta_id = ? ORDER BY slot');
  const upd = db.prepare(`UPDATE compendio_partita SET livello_registrato = ?, bonus_forza = ?, bonus_magia = ?, bonus_resistenza = ?, bonus_agilita = ?, bonus_fortuna = ?,
    skill_ids_json = ?, tratto_skill_id = ?, carica = ? WHERE partita_id = ? AND persona_id = ?`);
  for (const r of righe) {
    const skill = (skillDi.all(r.posseduta_id) as Array<{ skill_id: number }>).map((x) => x.skill_id);
    upd.run(r.livello, r.bonus_forza, r.bonus_magia, r.bonus_resistenza, r.bonus_agilita, r.bonus_fortuna, JSON.stringify(skill), r.tratto_skill_id, r.carica, r.partita_id, r.persona_id);
  }
  return righe.length;
}

export const migration023: Migration = {
  id: 23,
  name: 'bonus_statistiche',
  up: (db) => {
    for (const k of CHIAVI_STATISTICHE) db.exec(`ALTER TABLE persona_posseduta ADD COLUMN bonus_${k} INTEGER NOT NULL DEFAULT 0`);
    convertiAssoluteInBonus(db);
    for (const k of CHIAVI_STATISTICHE) db.exec(`ALTER TABLE compendio_partita ADD COLUMN bonus_${k} INTEGER NOT NULL DEFAULT 0`);
    db.exec('ALTER TABLE compendio_partita ADD COLUMN skill_ids_json TEXT');
    db.exec('ALTER TABLE compendio_partita ADD COLUMN tratto_skill_id INTEGER');
    db.exec('ALTER TABLE compendio_partita ADD COLUMN carica INTEGER NOT NULL DEFAULT 0 CHECK (carica IN (0,1))');
    riempiIstantaneeDallaScorta(db);
  },
};
