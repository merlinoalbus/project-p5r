// ============================================================
// 183 — scadenze dei Palazzi sulle fonti Royal (L9 R9-21; ricerca Royal del 24/10, §3)
// ============================================================
//
// Risposta dell'utente del 24/10: «Anticipa di un giorno» (come Gfinity). Le scadenze di sei Palazzi si anticipano di un giorno: la fine della
// finestra del Palazzo (`dungeon.finestra_al`) e l'evento di scadenza del Calendario che la segue:
//   Kamoshida 2/5 → 1/5 (evento 21) · Kaneshiro 9/7 → 8/7 (60) · Futaba 21/8 → 20/8 (84) · Okumura 11/10 → 10/10 (105) · Niijima 20/11 → 19/11 (129) · Shido 18/12 → 17/12 (139).
// Il testo `data_scadenza` del Palazzo cambia solo nella data iniziale. Madarame resta al 5/6 (evento 40) e ha UNA scadenza: l'evento 32
// («Decisione… entro il 5 giugno», 18/5) diventa un evento di storia (inizio della missione) e l'evento 36 (lettera di sfida al 31/5 «secondo la guida IT»,
// senza fonte Royal e in contrasto con `lettera_entro` = 2/6) esce dal Calendario: la sua riga resta nel rapporto (`dati_guida`).
// Degli altri annunci: 69, 96 e 116 diventano storia (sono annunci di una scadenza, non la scadenza), 82 e 136 consigli (sono termini consigliati).
// Restano scadenze 56 (ricatto di Kaneshiro, da rivedere: nessuna fonte Royal la conferma), 119 (Maruki lascia la scuola), 161 (scelta del finale) e 163 (Maruki).
// Conservativa: ogni riga si scrive solo se ha ancora i valori vecchi (e, per il Palazzo, non è stata modificata dall'utente); solo `main`; idempotente.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

const PALAZZI: ReadonlyArray<{ chiave: string; da: string; a: string; evento: number; giornoDa: string; giornoA: string; testoDa: string; testoA: string }> = [
  { chiave: 'kamoshida', da: '05-02', a: '05-01', evento: 21, giornoDa: '2 maggio', giornoA: '1 maggio', testoDa: '2 maggio', testoA: '1 maggio' },
  { chiave: 'kaneshiro', da: '07-09', a: '07-08', evento: 60, giornoDa: '9 luglio', giornoA: '8 luglio', testoDa: '9 luglio', testoA: '8 luglio' },
  { chiave: 'futaba', da: '08-21', a: '08-20', evento: 84, giornoDa: '21 agosto', giornoA: '20 agosto', testoDa: '21 agosto', testoA: '20 agosto' },
  { chiave: 'okumura', da: '10-11', a: '10-10', evento: 105, giornoDa: '11 ottobre', giornoA: '10 ottobre', testoDa: '11 ottobre', testoA: '10 ottobre' },
  { chiave: 'niijima', da: '11-20', a: '11-19', evento: 129, giornoDa: '20 novembre', giornoA: '19 novembre', testoDa: '20 novembre', testoA: '19 novembre' },
  { chiave: 'shido', da: '12-18', a: '12-17', evento: 139, giornoDa: '18 dicembre', giornoA: '17 dicembre', testoDa: '18 dicembre', testoA: '17 dicembre' },
];
const ANNUNCI_STORIA = [69, 96, 116] as const;
const CONSIGLI = [82, 136] as const;

export const migration183: Migration = {
  id: 183, name: 'scadenze_palazzi_royal',
  up(db) {
    const rapporto: Record<string, unknown> = {};
    const finestra = db.prepare('UPDATE main.dungeon SET finestra_al = ?, data_scadenza = CASE WHEN data_scadenza LIKE ? THEN ? || substr(data_scadenza, ?) ELSE data_scadenza END WHERE chiave = ? AND finestra_al = ? AND seed_json IS NULL');
    const evento = db.prepare("UPDATE main.evento_calendario SET data = ? WHERE id = ? AND tipo = 'scadenza' AND data = ?");
    const esisteGiorno = db.prepare('SELECT 1 FROM main.giorno_calendario WHERE data = ?');
    const spostate: string[] = [];
    for (const p of PALAZZI) {
      if (!esisteGiorno.get(p.a)) continue;
      const f = finestra.run(p.a, `${p.testoDa}%`, p.testoA, p.testoDa.length + 1, p.chiave, p.da).changes;
      const e = evento.run(p.a, p.evento, p.da).changes;
      if (f || e) spostate.push(`${p.chiave}: finestra ${f}, evento ${e}`);
    }
    rapporto.anticipate = spostate;
    // Madarame: una sola scadenza (evento 40, 5/6). 32 → storia, 36 esce (la riga resta nel rapporto).
    rapporto.madarame32 = db.prepare("UPDATE main.evento_calendario SET tipo = 'storia', titolo = 'Inizio della missione: rubare il cuore di Madarame entro il 5 giugno' WHERE id = 32 AND tipo = 'scadenza' AND data = '05-18'").run().changes;
    const e36 = db.prepare("SELECT * FROM main.evento_calendario WHERE id = 36 AND tipo = 'scadenza' AND data = '05-31'").get();
    if (e36) {
      // con le chiavi esterne spente nessuna cascata: i collegamenti dell'evento alle voci si tolgono a mano, e restano nel rapporto con l'evento
      const collegamenti = db.prepare('SELECT voce_uid, certezza FROM main.evento_calendario_voce WHERE evento_id = 36').all();
      db.prepare('DELETE FROM main.evento_calendario_voce WHERE evento_id = 36').run();
      db.prepare('DELETE FROM main.evento_calendario WHERE id = 36').run();
      rapporto.madarame36Tolta = { evento: e36, collegamenti };
    }
    rapporto.storia = ANNUNCI_STORIA.map((id) => db.prepare("UPDATE main.evento_calendario SET tipo = 'storia' WHERE id = ? AND tipo = 'scadenza'").run(id).changes);
    rapporto.consigli = CONSIGLI.map((id) => db.prepare("UPDATE main.evento_calendario SET tipo = 'consiglio' WHERE id = ? AND tipo = 'scadenza'").run(id).changes);
    db.prepare('INSERT OR IGNORE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run('audit-183-scadenze-palazzi', JSON.stringify({ data: '2026-10-24', ...rapporto }));
    logger.info({ anticipate: spostate.length, madarame32: rapporto.madarame32, madarame36: !!e36 }, '[migration183] scadenze dei Palazzi sulle fonti Royal');
  },
};
