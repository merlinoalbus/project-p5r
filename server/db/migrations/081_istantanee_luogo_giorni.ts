// ============================================================
// 081 — le istantanee `seed_json` dei luoghi conoscono `giorni_json`, e ogni riga della guida ne ha una
// ============================================================
//
// La 080 ha convertito `luogo.giorni` in `giorni_json`, ma la fotografia della riga della guida
// (`seed_json`, scattata dalla 071 per il «ripristina dalla guida») portava ancora la frase: un
// ripristino avrebbe riscritto `giorni_json` a NULL (vincolo NOT NULL, errore interno) o a `[]`
// (giorni persi). Qui ogni istantanea riceve `giorni_json` (e la stessa nota della 080) dalla sua
// frase; e una riga della guida rimasta senza istantanea (un ripristino l'azzera) la riacquista
// fotografando la riga com'è, come fece la 071. Idempotente.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { giorniDallaFrase } from './080_giorni_luogo_strutturati.js';

/** L'istantanea con `giorni_json` (e la nota) ricavati dalla frase; invariata se già li ha. Esportata per i test. */
export function aggiornaIstantanea(json: string): { istantanea: string; cambiata: boolean } {
  let o: Record<string, unknown>;
  try {
    o = JSON.parse(json) as Record<string, unknown>;
  } catch {
    return { istantanea: json, cambiata: false };
  }
  if (typeof o.giorni_json === 'string') return { istantanea: json, cambiata: false };
  const { giorni, resto } = giorniDallaFrase(typeof o.giorni === 'string' ? o.giorni : null);
  const nota = resto ? `Giorni (dalla guida): ${resto}` : null;
  const note = typeof o.note === 'string' && o.note ? o.note : null;
  o.giorni_json = JSON.stringify(giorni);
  o.note = nota && !(note ?? '').includes(nota) ? (note ? `${note} · ${nota}` : nota) : note;
  return { istantanea: JSON.stringify(o), cambiata: true };
}

export const migration081: Migration = {
  id: 81,
  name: 'istantanee_luogo_giorni',
  up(db) {
    const righe = db.prepare('SELECT chiave, seed_json FROM luogo WHERE seed_json IS NOT NULL').all() as Array<{ chiave: string; seed_json: string }>;
    const scrivi = db.prepare('UPDATE luogo SET seed_json = ? WHERE chiave = ?');
    let aggiornate = 0;
    for (const r of righe) {
      const { istantanea, cambiata } = aggiornaIstantanea(r.seed_json);
      if (cambiata) { scrivi.run(istantanea, r.chiave); aggiornate++; }
    }
    // la fotografia della riga della guida, per chi l'ha persa (stesse colonne della 071)
    const colonne = (db.prepare('PRAGMA table_info(luogo)').all() as Array<{ name: string }>).map((c) => c.name).filter((c) => !['origine', 'nascosto', 'seed_json', 'updated_at'].includes(c));
    const senza = db.prepare("SELECT * FROM luogo WHERE origine = 'seed' AND seed_json IS NULL").all() as Array<Record<string, unknown>>;
    for (const r of senza) scrivi.run(JSON.stringify(Object.fromEntries(colonne.map((c) => [c, r[c] ?? null]))), r.chiave as string);
    logger.info({ istantanee: righe.length, aggiornate, ricreate: senza.length }, 'migrazione 081: istantanee dei luoghi con giorni_json');
  },
};
