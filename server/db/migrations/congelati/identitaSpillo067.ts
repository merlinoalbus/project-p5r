// ============================================================
// Copia congelata di `server/services/mappe/identitaSpillo.ts` al 2026-10-24 (L11 · B9): NON si modifica e NON si importa da altro.
// ============================================================
//
// Le migrazioni 027 (tramite `sincronizzaMappe027`), 066 e 067 assegnano l'uid agli spilli con questa funzione. Prima importavano il
// servizio vivo: una modifica del servizio avrebbe cambiato, di nascosto, cosa fa una migrazione già scritta su una base vecchia.
// Qui l'uid è l'impronta (SHA-256, 32 esadecimali) dell'identità dello spillo — mappa o area della guida, tipo, nome, posizione e
// riferimento — e due spilli con la stessa identità nello stesso file si distinguono in ordine di id (`#2`, `#3`…).
// ============================================================

import { createHash } from 'node:crypto';
import type { AppDatabase } from '../../dbService.js';

export interface IdentitaSpillo { mappa_chiave: string | null; area_guida_chiave?: string | null; tipo: string; nome: string; x: number; y: number; riferimento_tipo: string | null; riferimento_chiave: string | null }

/** La stringa d'identità: gli stessi campi negli stessi posti danno lo stesso uid, in qualunque file. */
export function identitaSpillo(s: IdentitaSpillo): string {
  return [s.mappa_chiave ?? '', s.area_guida_chiave ?? '', s.tipo, s.nome, String(Number(s.x)), String(Number(s.y)), s.riferimento_tipo ?? '', s.riferimento_chiave ?? ''].join('|');
}

/** L'uid di un'identità; `ordinale` > 0 distingue i doppioni con la stessa identità. */
export function uidSpillo(identita: string, ordinale = 0): string {
  return createHash('sha256').update(ordinale > 0 ? `${identita}#${ordinale + 1}` : identita).digest('hex').slice(0, 32);
}

/**
 * Assegna l'uid a ogni spillo che non ce l'ha, in ordine di id, evitando gli uid già presenti nel file (ordinale crescente).
 * Idempotente: chi ha già l'uid non viene toccato. Se la colonna non esiste ancora non fa nulla.
 */
export function assegnaUidMancanti(db: AppDatabase): number {
  const colonne = (db.prepare('PRAGMA main.table_info(spillo)').all() as Array<{ name: string }>).map((c) => c.name);
  if (!colonne.includes('uid')) return 0;
  const area = colonne.includes('area_guida_chiave') ? 'area_guida_chiave' : 'NULL AS area_guida_chiave';
  const senza = db.prepare(`SELECT id, mappa_chiave, ${area}, tipo, nome, x, y, riferimento_tipo, riferimento_chiave FROM main.spillo WHERE uid IS NULL OR uid = '' ORDER BY id`).all() as Array<IdentitaSpillo & { id: number }>;
  if (senza.length === 0) return 0;
  const presi = new Set((db.prepare("SELECT uid FROM main.spillo WHERE uid IS NOT NULL AND uid <> ''").all() as Array<{ uid: string }>).map((r) => r.uid));
  const aggiorna = db.prepare('UPDATE main.spillo SET uid = ? WHERE id = ?');
  for (const s of senza) {
    const identita = identitaSpillo(s);
    let uid = uidSpillo(identita);
    for (let n = 1; presi.has(uid); n++) uid = uidSpillo(identita, n);
    presi.add(uid);
    aggiorna.run(uid, s.id);
  }
  return senza.length;
}
