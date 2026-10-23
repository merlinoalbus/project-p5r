// Aiuto delle migrazioni di abbinamento voce → effetto (155, 156, 157): aggiunge UN effetto a una voce del Diario, nello stesso modo
// delle 153 e 154 (origine «regola», riga nel registro delle operazioni, impronta della transizione). Copia congelata della logica di
// `salvaEffettiVoce`: non importa servizi. Non riscrive testo, ordine, giorno, fascia né uid della voce; non crea proposte per le
// spunte già date (l'effetto vale dalla prossima spunta). Scrive solo in `main`.

import { createHash } from 'node:crypto';
import type { AppDatabase } from '../dbService.js';

/** JSON con le chiavi in ordine (la copia congelata di `jsonCanonico`). */
function ordina(x: unknown): unknown {
  if (Array.isArray(x)) return x.map(ordina);
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b)).map(([k, y]) => [k, ordina(y)]));
  return x ?? null;
}
export const jsonOrdinato = (v: unknown): string => JSON.stringify(ordina(v));
const sha = (...p: string[]) => createHash('sha256').update(p.join('\0')).digest('hex');

export type EsitoAggiunta = 'aggiunto' | 'presente' | 'saltato';

/**
 * Aggiunge `effetto` alla voce se: la voce è proprio quella (uid intero o prefisso unico) e il suo testo contiene `testo`, è un'azione con
 * la fonte degli effetti convertita, e non ha già lo stesso effetto. `sigla` distingue la migrazione nell'uid dell'effetto.
 */
export function aggiungiEffettoAllaVoce(db: AppDatabase, sigla: string, voce: string, testo: string, effetto: { tipo: string } & Record<string, unknown>, chiave: string): EsitoAggiunta {
  const voci = db.prepare('SELECT uid, genere, azione FROM main.voce_giornata WHERE uid LIKE ?').all(`${voce}%`) as Array<{ uid: string; genere: string; azione: string }>;
  const v = voci.length === 1 ? voci[0]! : undefined;
  const transizione = v ? db.prepare('SELECT stato FROM main.voce_effetto_transizione WHERE voce_uid=?').get(v.uid) as { stato: string } | undefined : undefined;
  if (!v || v.genere !== 'azione' || !v.azione.includes(testo) || transizione?.stato !== 'convertita') return 'saltato';
  const presenti = db.prepare('SELECT uid, tipo, dati_json FROM main.voce_effetto WHERE voce_uid=? ORDER BY ordine').all(v.uid) as Array<{ uid: string; tipo: string; dati_json: string }>;
  const voluto = jsonOrdinato(effetto);
  if (presenti.some((e) => e.tipo === effetto.tipo && jsonOrdinato(JSON.parse(e.dati_json)) === voluto)) return 'presente';
  const adesso = new Date().toISOString();
  const uid = sha(`${sigla}-effetto`, v.uid, voluto).slice(0, 32);
  const ordine = ((db.prepare('SELECT MAX(ordine) AS m FROM main.voce_effetto WHERE voce_uid=?').get(v.uid) as { m: number | null }).m ?? -1) + 1;
  db.prepare("INSERT INTO main.voce_effetto(uid,voce_uid,ordine,tipo,chiave,dati_json,origine,updated_at) VALUES(?,?,?,?,?,?,'regola',?)").run(uid, v.uid, ordine, effetto.tipo, chiave, voluto, adesso);
  const elenco = presenti.map((e) => ({ uid: e.uid, tipo: e.tipo }));
  db.prepare('INSERT INTO main.operazione_effetti_voce(id,voce_uid,payload_json,prima_json,dopo_json,creata_il) VALUES(?,?,?,?,?,?)')
    .run(sha(`${sigla}-operazione`, v.uid, voluto).slice(0, 32), v.uid, jsonOrdinato({ migrazione: sigla, effetto }), jsonOrdinato({ effetti: elenco }), jsonOrdinato({ effetti: [...elenco, { uid, tipo: effetto.tipo }] }), adesso);
  const tutti = (db.prepare('SELECT dati_json FROM main.voce_effetto WHERE voce_uid=? ORDER BY ordine').all(v.uid) as Array<{ dati_json: string }>).map((r) => JSON.parse(r.dati_json) as unknown);
  db.prepare('UPDATE main.voce_effetto_transizione SET impronta=?, aggiornata_il=? WHERE voce_uid=?').run(sha(jsonOrdinato(tutti)), adesso, v.uid);
  return 'aggiunto';
}
