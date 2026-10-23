// ============================================================
// Copia congelata della rimozione di un pin con il suo registro nel Cestino (stato del 23/10/2026)
// ============================================================
//
// Le migrazioni non importano i servizi vivi (F5): questo modulo riproduce, con il formato che oggi produce l'app, la rimozione
// di UN pin che ha una sola riga da registrare — la sua. È la sequenza di `eliminaSpillo` (mappeService) dentro `conCestino`
// (cestinoService) per un pin senza immagini, voci, destinazioni, sedi, stati nelle partite o altri figli:
//   riga del Cestino  = { tipo 'pin', chiave = uid del pin, nome, contesto = `nomePercorso(mappa_chiave)` (il nome di `mappa_percorso`), riepilogo {"spillo":1},
//                         registro [{ tabella:'spillo', op:'D', prima:<riga intera>, seq:0 }], con_partite 0, vicini NULL };
//   si scrive PRIMA la fotografia, poi si toglie il pin.
// Se il pin ha qualunque altro dato collegato, o non è più quello atteso, non si fa nulla: il registro non descriverebbe tutto
// e la rimozione ordinaria dell'app resta la via. Non importa nulla dal codice vivo: il ripristino lo fa l'app con il suo codice.
// ============================================================

import { randomBytes } from 'node:crypto';
import type { AppDatabase } from '../dbService.js';

export interface PinAtteso {
  id: number;
  uid: string;
  tipo: string;
  mappa: string;
  origine: 'seed' | 'utente';
  riferimento: readonly [tipo: string | null, chiave: string | null];
}

export type EsitoRimozionePin = { esito: 'rimosso' | 'gia-fatta' } | { esito: 'saltata'; motivo: string };

const NOMI_SCHEMI = (db: AppDatabase): string[] => (db.prepare('PRAGMA database_list').all() as Array<{ name: string }>).map((s) => s.name).filter((n) => n === 'main' || n === 'utente');

/** Quante righe collegate al pin hanno le tabelle dei due file: figli per chiave esterna e per `spillo_id`/`spillo_uid`/`spillo_arrivo_id`. */
function righeCollegate(db: AppDatabase, id: number, uid: string): string[] {
  const trovate: string[] = [];
  for (const schema of NOMI_SCHEMI(db)) {
    const tabelle = db.prepare(`SELECT name FROM ${schema}.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`).all() as Array<{ name: string }>;
    for (const { name } of tabelle) {
      if (schema === 'main' && name === 'spillo') continue;
      const colonne = new Set((db.prepare(`SELECT name FROM pragma_table_info(?, ?)`).all(name, schema) as Array<{ name: string }>).map((c) => c.name));
      const figli = schema === 'main'
        ? (db.prepare('SELECT "from" AS da FROM pragma_foreign_key_list(?, ?) WHERE "table" = ?').all(name, schema, 'spillo') as Array<{ da: string }>).map((f) => f.da)
        : [];
      for (const c of new Set([...figli, ...['spillo_id', 'spillo_arrivo_id'].filter((x) => colonne.has(x))])) {
        const n = (db.prepare(`SELECT COUNT(*) AS n FROM ${schema}."${name}" WHERE "${c}" = ?`).get(id) as { n: number }).n;
        if (n) trovate.push(`${schema}.${name}.${c}=${n}`);
      }
      if (colonne.has('spillo_uid')) {
        const n = (db.prepare(`SELECT COUNT(*) AS n FROM ${schema}."${name}" WHERE spillo_uid = ?`).get(uid) as { n: number }).n;
        if (n) trovate.push(`${schema}.${name}.spillo_uid=${n}`);
      }
    }
  }
  return trovate;
}

/** Rimuove il pin atteso scrivendo prima la sua fotografia nel Cestino. Va chiamata dentro la transazione della migrazione. */
export function rimuoviPinNelCestino(db: AppDatabase, atteso: PinAtteso): EsitoRimozionePin {
  const riga = db.prepare('SELECT * FROM main.spillo WHERE id = ?').get(atteso.id) as Record<string, unknown> | undefined;
  if (!riga) return { esito: 'gia-fatta' };
  if (riga.uid !== atteso.uid || riga.tipo !== atteso.tipo || riga.mappa_chiave !== atteso.mappa || riga.origine !== atteso.origine
    || (riga.riferimento_tipo ?? null) !== atteso.riferimento[0] || (riga.riferimento_chiave ?? null) !== atteso.riferimento[1]) {
    return { esito: 'saltata', motivo: 'il pin non corrisponde più a identità e riferimento attesi' };
  }
  if (!/^[0-9a-f]{32}$/.test(atteso.uid)) return { esito: 'saltata', motivo: 'identità stabile del pin assente' };
  if (db.prepare("SELECT 1 FROM main.cestino WHERE tipo = 'pin' AND chiave = ?").get(atteso.uid)) return { esito: 'saltata', motivo: 'il pin ha già una riga nel Cestino' };
  const collegate = righeCollegate(db, atteso.id, atteso.uid);
  if (collegate.length) return { esito: 'saltata', motivo: `il pin ha dati collegati (${collegate.join(', ')}): serve la rimozione ordinaria dell'app` };
  // Il contesto è quello dell'app: `nomePercorso(mappa_chiave)`, cioè il nome di `mappa_percorso`; la chiave stessa se la mappa non ha un percorso.
  const haPercorsi = !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'mappa_percorso'").get();
  const percorso = haPercorsi ? db.prepare('SELECT nome FROM main.mappa_percorso WHERE mappa_chiave = ?').get(atteso.mappa) as { nome: string } | undefined : undefined;
  const contesto = percorso?.nome ?? atteso.mappa;
  const registro = [{ tabella: 'spillo', op: 'D', prima: riga, seq: 0 }];
  db.prepare(`INSERT INTO main.cestino (uid, tipo, chiave, nome, contesto, riepilogo_json, registro_json, con_partite, vicini_json, eliminato_il)
    VALUES (?, 'pin', ?, ?, ?, ?, ?, 0, NULL, ?)`)
    .run(randomBytes(16).toString('hex'), atteso.uid, String(riga.nome), contesto, JSON.stringify({ spillo: 1 }), JSON.stringify(registro), new Date().toISOString());
  if (db.prepare('DELETE FROM main.spillo WHERE id = ? AND uid IS ?').run(atteso.id, atteso.uid).changes !== 1) throw new Error('rimozione del pin: l\'identità non coincide più, transazione annullata');
  return { esito: 'rimosso' };
}
