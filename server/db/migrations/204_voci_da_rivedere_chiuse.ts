// ============================================================
// 204 — il segno «da rivedere» tolto alle voci confermate dalle fonti (L11 · R11-10c/1, M-A; elenco: `lotti/L11/M-A-elenco-da-rivedere-2026-10-24.md` §1.1)
// ============================================================
//
// Dodici voci dopo il 1° giugno (5 di Palazzo e 7 d'invito) hanno la fonte che le scioglie (registri dell'Esperto G-022 e G-028): `da_rivedere` passa da 1 a 0.
// Le voci dell'11-14 e dell'11-19 hanno già avuto il testo corretto e il segno tolto (migrazioni 200 e 201); la voce del 13/11 sera dalla 196. L'invito di
// Makoto del 30/7 (`931d1e20…`) NON si tocca (si aspetta la data Royal). Per ogni uid: guardia sull'esistenza, su `da_rivedere = 1`, sulla data attesa e,
// per le voci aggiunte dal team, su `aggiunta_da = 'team'`; una voce diversa (già cambiata dall'utente) si salta senza errore. Non cambiano né `aggiunta_da`,
// né `testo_precedente_json`, né `motivo_revisione`, né testo, ordine, data, fascia, effetti, legami e spunte. Audit in `dati_guida.da-rivedere-chiuse-204`
// (uid → valori di prima). Controllo finale: ogni altra voce del Diario identica (comprese le 255 dal 1° aprile al 1° giugno) e nessuna voce validata toccata.
// ============================================================

import { createHash } from 'node:crypto';
import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';

/** [prefisso dell'uid, data attesa, aggiunta dal team]. */
const VOCI: ReadonlyArray<readonly [string, string, boolean]> = [
  ['65fdbeab5101e606', '06-20', false], ['8c58ad986d8176c6', '06-26', true], ['c9efdb83a3eeb29a', '08-03', false], ['7dd92df212b81bb8', '10-29', false], ['527cf9832e94e93e', '11-24', false],
  ['5812540b65b8999b', '07-02', true], ['9f3faa2a77fae8a2', '07-03', true], ['8665ae2121ab058f', '07-28', true], ['ff984b684560c4881', '07-29', true],
  ['3dae597a78761d7e', '08-06', true], ['4360652c7b720e0a', '10-08', true], ['81e253c5f0b988a8', '10-09', true],
];
const errore = (motivo: string): never => { throw new Error(`204: ${motivo}; nessuna modifica applicata.`); };

function impronte(db: AppDatabase): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of db.prepare('SELECT * FROM main.voce_giornata ORDER BY uid').iterate() as Iterable<Record<string, unknown>>) m.set(String(r.uid), createHash('sha256').update(JSON.stringify(r)).digest('hex'));
  return m;
}

export const migration204: Migration = {
  id: 204, name: 'voci_da_rivedere_chiuse',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'voce_giornata') || !esisteTabella(db, 'dati_guida')) return;
    const prima = impronte(db);
    const chiuse: Record<string, unknown> = {};
    const saltate: string[] = [];
    for (const [prefisso, data, team] of VOCI) {
      const r = db.prepare('SELECT * FROM main.voce_giornata WHERE uid LIKE ?').all(`${prefisso}%`) as Array<Record<string, unknown>>;
      if (r.length > 1) errore(`${r.length} voci cominciano con ${prefisso}`);
      const v = r[0];
      if (!v || v.da_rivedere !== 1 || v.data !== data || (team && v.aggiunta_da !== 'team')) { saltate.push(prefisso); continue; }
      chiuse[String(v.uid)] = { daRivedere: 1, data: v.data, fascia: v.fascia, aggiuntaDa: v.aggiunta_da, motivoRevisione: v.motivo_revisione };
      db.prepare('UPDATE main.voce_giornata SET da_rivedere = 0 WHERE uid = ?').run(v.uid);
    }
    if (Object.keys(chiuse).length === 0) return;
    db.prepare('INSERT OR REPLACE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run('da-rivedere-chiuse-204', JSON.stringify({ versione: 1, motivo: 'Segno «da rivedere» tolto da M-A (L11, R11-10c/1, migrazione 204): uid → valori di prima.', voci: chiuse }));

    const dopo = impronte(db);
    if (dopo.size !== prima.size) errore('il numero delle voci del Diario è cambiato');
    for (const [uid, imp] of prima) if (!(uid in chiuse) && dopo.get(uid) !== imp) errore(`la voce ${uid}, non in elenco, è cambiata`);
    for (const uid of Object.keys(chiuse)) {
      const v = db.prepare('SELECT da_rivedere, data FROM main.voce_giornata WHERE uid = ?').get(uid) as { da_rivedere: number; data: string };
      const idx = (d: string): number => ((Number(d.slice(0, 2)) + 8) % 12) * 100 + Number(d.slice(3, 5));
      if (v.da_rivedere !== 0 || idx(v.data) <= idx('06-01')) errore(`la voce ${uid} non è come attesa`);
    }
    logger.info({ migrazione: 'L11-R11-10c-204', chiuse: Object.keys(chiuse).length, saltate }, 'segni «da rivedere» tolti (M-A)');
  },
};
