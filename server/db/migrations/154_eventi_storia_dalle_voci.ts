// ============================================================
// 154 — le voci che nominano senza dubbi un evento di storia lo segnano (R10-04, R10-12, R10-14)
// ============================================================
//
// Sei voci del Diario dicono nel loro testo, senza ambiguità, il fatto che un evento di storia registra (gli eventi che i requisiti dei
// Confidenti chiedono e che nessun altro dato sa dedurre, migrazione 090). A ciascuna si AGGIUNGE l'effetto «storia» con la chiave
// dell'evento (origine «regola»): spuntare la voce segna l'evento, togliere la spunta lo riporta com'era (`effettiDiStatoService`).
//   - 04-17 sera  «…creazione di un singolo Grimaldello»              → primo-strumento-creato
//   - 04-27 sera  «Preparare il caffe al Leblanc» (Sojiro)              → caffe-leblanc
//   - 06-08 sera  «Chiamare Kawakami dal telefono a gettoni (5.000 yen)» → chiamata-kawakami-pagata
//   - 06-28 giorno «Shinjuku: comprare la Pietra Sacra (100.000 yen)»  → pietra-sacra-comprata
//   - 09-02 sera  «riparare il Laptop rotto con il Set di strumenti»   → laptop-riparato
//   - 11-04 sera  «Scontro uno-contro-uno con Akechi nei Mementos» (Akechi 8) → duello-akechi-vinto
// Si scrive solo se la voce è proprio quella (uid e testo), è un'azione con la fonte degli effetti convertita e non ha già
// quell'effetto. Testo, ordine, giorno, fascia e uid delle voci (anche del diario validato fino al 1° giugno) non cambiano, nessuna
// voce nasce, e le spunte già date non riapplicano niente: l'effetto vale dalla prossima spunta (R10-15). Le voci dubbie (oratore di
// Shibuya, sistema per videogiochi, biliardo rango 3, banchi di Niijima, altre chiamate a Kawakami) NON sono toccate. Idempotente.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

const ABBINAMENTI: ReadonlyArray<{ voce: string; testo: string; evento: string }> = [
  { voce: 'cf1e3b48a741a17e529f490a149efdeb', testo: 'creazione di un singolo Grimaldello', evento: 'primo-strumento-creato' },
  { voce: '20449887b636d5a3168b14cb8c1ea7d9', testo: 'Preparare il caffe al Leblanc', evento: 'caffe-leblanc' },
  { voce: 'd9710dea', testo: 'Chiamare Kawakami dal telefono a gettoni (5.000 yen)', evento: 'chiamata-kawakami-pagata' },
  { voce: 'd57dcd1811b7f22289e377dcd40b6b4e', testo: 'comprare la Pietra Sacra', evento: 'pietra-sacra-comprata' },
  { voce: '6c495e2226471e31ec6ceb1be719ea3c', testo: 'riparare il Laptop rotto', evento: 'laptop-riparato' },
  { voce: 'e594b6e0a40d295823b2a39b73443cb2', testo: 'Scontro uno-contro-uno con Akechi nei Mementos', evento: 'duello-akechi-vinto' },
];

/** JSON con le chiavi in ordine (la copia congelata di `jsonCanonico`). */
function ordina(x: unknown): unknown {
  if (Array.isArray(x)) return x.map(ordina);
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b)).map(([k, y]) => [k, ordina(y)]));
  return x ?? null;
}
const json = (v: unknown): string => JSON.stringify(ordina(v));
const sha = (...p: string[]) => createHash('sha256').update(p.join('\0')).digest('hex');

export const migration154: Migration = {
  id: 154,
  name: 'eventi_storia_dalle_voci',
  up(db) {
    const adesso = new Date().toISOString();
    let aggiunti = 0, saltati = 0;
    for (const a of ABBINAMENTI) {
      // l'uid può essere dato per prefisso: deve corrispondere a UNA sola voce
      const voci = db.prepare('SELECT uid, genere, azione FROM main.voce_giornata WHERE uid LIKE ?').all(`${a.voce}%`) as Array<{ uid: string; genere: string; azione: string }>;
      const v = voci.length === 1 ? voci[0]! : undefined;
      const transizione = v ? db.prepare('SELECT stato FROM main.voce_effetto_transizione WHERE voce_uid=?').get(v.uid) as { stato: string } | undefined : undefined;
      if (!v || v.genere !== 'azione' || !v.azione.includes(a.testo) || transizione?.stato !== 'convertita') { saltati++; continue; }
      const presenti = db.prepare('SELECT uid, tipo, dati_json FROM main.voce_effetto WHERE voce_uid=? ORDER BY ordine').all(v.uid) as Array<{ uid: string; tipo: string; dati_json: string }>;
      if (presenti.some((e) => e.tipo === 'storia' && (JSON.parse(e.dati_json) as { evento?: string }).evento === a.evento)) continue;
      const effetto = { tipo: 'storia', evento: a.evento };
      const uid = sha('154-effetto', v.uid, a.evento).slice(0, 32);
      const ordine = ((db.prepare('SELECT MAX(ordine) AS m FROM main.voce_effetto WHERE voce_uid=?').get(v.uid) as { m: number | null }).m ?? -1) + 1;
      db.prepare("INSERT INTO main.voce_effetto(uid,voce_uid,ordine,tipo,chiave,dati_json,origine,updated_at) VALUES(?,?,?,'storia',?,?,'regola',?)").run(uid, v.uid, ordine, a.evento, json(effetto), adesso);
      const elenco = presenti.map((e) => ({ uid: e.uid, tipo: e.tipo }));
      db.prepare('INSERT INTO main.operazione_effetti_voce(id,voce_uid,payload_json,prima_json,dopo_json,creata_il) VALUES(?,?,?,?,?,?)')
        .run(sha('154-operazione', v.uid, a.evento).slice(0, 32), v.uid, json({ migrazione: 154, effetto }), json({ effetti: elenco }), json({ effetti: [...elenco, { uid, tipo: 'storia' }] }), adesso);
      const tutti = (db.prepare('SELECT dati_json FROM main.voce_effetto WHERE voce_uid=? ORDER BY ordine').all(v.uid) as Array<{ dati_json: string }>).map((r) => JSON.parse(r.dati_json) as unknown);
      db.prepare('UPDATE main.voce_effetto_transizione SET impronta=?, aggiornata_il=? WHERE voce_uid=?').run(sha(json(tutti)), adesso, v.uid);
      aggiunti++;
    }
    logger.info({ aggiunti, saltati }, '154: eventi di storia collegati alle voci che li nominano');
  },
};
