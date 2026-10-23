import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';

/**
 * R10-10/2: la migrazione di gioco 147 toglie `fortuna: null` dagli effetti di acquisto della guida. Le proposte «effetto della voce»
 * (aperte e decise) di quegli effetti portano la copia dell'effetto e l'impronta della sua configurazione come revisione: qui si
 * riscrivono entrambe, così restano valide e applicabili (e quella chiusa «già nel saldo» non si riapre). Una migrazione di gioco non
 * scrive in `utente`: lo fa questa, dopo di lei. Si tocca solo la proposta il cui effetto, tolta la chiave `fortuna: null`, è proprio
 * quello corrente della guida. Idempotente.
 */
function ordina(x: unknown): unknown {
  if (Array.isArray(x)) return x.map(ordina);
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).filter(([, y]) => y !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, y]) => [k, ordina(y)]));
  return x ?? null;
}
const json = (v: unknown): string => JSON.stringify(ordina(v));
const oggetto = (testo: string): Record<string, unknown> | null => {
  try { const v = JSON.parse(testo) as unknown; return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null; } catch { return null; }
};

export const utente038: Migration = {
  id: 38,
  name: 'proposte_effetto_senza_fortuna',
  up(db) {
    const righe = db.prepare("SELECT id, causa_chiave, dati_json FROM utente.da_applicare WHERE causa_tipo='voce' AND tipo='effetto-voce'").all() as Array<{ id: number; causa_chiave: string; dati_json: string }>;
    for (const r of righe) {
      const [voce, effetto] = r.causa_chiave.split(':');
      const corrente = db.prepare('SELECT dati_json FROM main.voce_effetto WHERE voce_uid=? AND uid=?').get(voce, effetto) as { dati_json: string } | undefined;
      const nuovo = corrente ? oggetto(corrente.dati_json) : null;
      const dati = oggetto(r.dati_json);
      const vecchio = dati ? oggetto(JSON.stringify(dati.effetto ?? null)) : null;
      if (!nuovo || !dati || !vecchio || !('fortuna' in vecchio) || vecchio.fortuna !== null || 'fortuna' in nuovo) continue;
      const { fortuna: _tolta, ...senza } = vecchio;
      if (json(senza) !== json(nuovo)) continue;
      dati.effetto = nuovo;
      db.prepare('UPDATE utente.da_applicare SET revisione_causa=?, dati_json=? WHERE id=?').run(createHash('sha256').update(json(nuovo)).digest('hex'), json(dati), r.id);
    }
  },
};
