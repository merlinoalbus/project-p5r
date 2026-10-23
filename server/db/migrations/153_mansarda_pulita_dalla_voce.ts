// ============================================================
// 153 — «Inizia a pulire» (04-09) segna la mansarda pulita (R10-03)
// ============================================================
//
// Il caso del piano: spuntare la voce «Interagisci con la Scatola di cartone scegliendo «Inizia a pulire»» del 9 aprile segna
// l'evento di storia `mansarda-pulita` (lo stesso che leggono i requisiti dei Confidenti e l'interruttore di Partita → Progressi);
// togliere la spunta lo riporta com'era (effetto «storia», `effettiDiStatoService`). L'effetto si AGGIUNGE alla voce (origine
// «regola»): testo, ordine, giorno, fascia e uid non cambiano e le spunte già date non riapplicano niente (l'effetto vale dalla
// prossima spunta). Si scrive solo se la voce è proprio quella (uid e testo), è un'azione con la fonte degli effetti convertita e non
// ha già l'effetto. Idempotente; la riga del registro delle operazioni dice che l'ha fatto la migrazione.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

const VOCE = 'b79da6f663d32b6845e6489065b8e841';
const EVENTO = 'mansarda-pulita';

/** JSON con le chiavi in ordine (la copia congelata di `jsonCanonico`). */
function ordina(x: unknown): unknown {
  if (Array.isArray(x)) return x.map(ordina);
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b)).map(([k, y]) => [k, ordina(y)]));
  return x ?? null;
}
const json = (v: unknown): string => JSON.stringify(ordina(v));
const sha = (...p: string[]) => createHash('sha256').update(p.join('\0')).digest('hex');

export const migration153: Migration = {
  id: 153,
  name: 'mansarda_pulita_dalla_voce',
  up(db) {
    const voce = db.prepare('SELECT genere, azione FROM main.voce_giornata WHERE uid=?').get(VOCE) as { genere: string; azione: string } | undefined;
    const transizione = db.prepare('SELECT stato FROM main.voce_effetto_transizione WHERE voce_uid=?').get(VOCE) as { stato: string } | undefined;
    if (!voce || voce.genere !== 'azione' || !voce.azione.includes('Inizia a pulire') || transizione?.stato !== 'convertita') {
      logger.info({ trovata: !!voce }, '153: voce «Inizia a pulire» non trovata o non convertita: niente da fare');
      return;
    }
    const presenti = db.prepare('SELECT uid, tipo, dati_json FROM main.voce_effetto WHERE voce_uid=? ORDER BY ordine').all(VOCE) as Array<{ uid: string; tipo: string; dati_json: string }>;
    if (presenti.some((e) => e.tipo === 'storia' && (JSON.parse(e.dati_json) as { evento?: string }).evento === EVENTO)) return;
    const adesso = new Date().toISOString();
    const effetto = { tipo: 'storia', evento: EVENTO };
    const uid = sha('153-effetto', VOCE, EVENTO).slice(0, 32);
    const ordine = ((db.prepare('SELECT MAX(ordine) AS m FROM main.voce_effetto WHERE voce_uid=?').get(VOCE) as { m: number | null }).m ?? -1) + 1;
    db.prepare("INSERT INTO main.voce_effetto(uid,voce_uid,ordine,tipo,chiave,dati_json,origine,updated_at) VALUES(?,?,?,'storia',?,?,'regola',?)").run(uid, VOCE, ordine, EVENTO, json(effetto), adesso);
    const elenco = presenti.map((e) => ({ uid: e.uid, tipo: e.tipo }));
    db.prepare('INSERT INTO main.operazione_effetti_voce(id,voce_uid,payload_json,prima_json,dopo_json,creata_il) VALUES(?,?,?,?,?,?)')
      .run(sha('153-operazione', VOCE).slice(0, 32), VOCE, json({ migrazione: 153, effetto }), json({ effetti: elenco }), json({ effetti: [...elenco, { uid, tipo: 'storia' }] }), adesso);
    const tutti = (db.prepare('SELECT dati_json FROM main.voce_effetto WHERE voce_uid=? ORDER BY ordine').all(VOCE) as Array<{ dati_json: string }>).map((r) => JSON.parse(r.dati_json) as unknown);
    db.prepare('UPDATE main.voce_effetto_transizione SET impronta=?, aggiornata_il=? WHERE voce_uid=?').run(sha(json(tutti)), adesso, VOCE);
    logger.info({ voce: VOCE, evento: EVENTO }, '153: effetto «mansarda pulita» aggiunto alla voce «Inizia a pulire»');
  },
};
