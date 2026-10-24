// ============================================================
// 195 — il cruciverba «Hacker» del 29/8 sera va nel Cestino (L11 · R11-10c/11, decisione D7 dell'utente, 24/10)
// ============================================================
//
// La voce `a67565bf…` del 29/8 sera «Cruciverba (Hacker)» è un doppione di `50780540…` del 30/8 sera (stesso testo, stessa Conoscenza +1, stesso effetto
// cruciverba del 30/8; la guida dà il 30/8). Decisione dell'utente: la voce del 29/8 va nel Cestino, in modo recuperabile; resta quella del 30/8.
// Le migrazioni non possono usare il servizio del Cestino, quindi la riga del Cestino è scritta qui con lo stesso formato dell'eliminazione dal Diario
// (`giornataService.eliminaVoce`): i passi D dei figli (effetti e transizione) e della voce, poi il compattamento dell'ordine della fascia (passi U); in
// `vicini` le voci che le stavano accanto. «Ripristina» dal Cestino riapplica il registro al contrario. Guardie: la voce deve esistere con il testo atteso
// e la sorella del 30/8 pure; se la voce c'è ma è diversa, o ha una riga d'insieme/proposta d'infiltrazione o un collegamento al Calendario, la migrazione
// si ferma senza toccare niente. Senza la voce (già tolta) non fa niente. Le spunte delle partite stanno nell'altro file e non si toccano (sulla base p5s: nessuna).
// ============================================================

import { randomBytes } from 'node:crypto';
import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, improntaTabella } from './pulizieL11.js';

const PREFISSO = 'a67565bf';
const SORELLA = '50780540';
const TESTO = 'Cruciverba (Hacker)';
const errore = (motivo: string): never => { throw new Error(`195: ${motivo}; nessuna modifica applicata.`); };

type Valore = string | number | null | { $blob: string };
type Riga = Record<string, Valore>;
interface Passo { seq: number; tabella: string; op: 'D' | 'U'; prima: Riga; dopo?: Riga }

const serializza = (v: unknown): Valore => v === null || v === undefined ? null : Buffer.isBuffer(v) ? { $blob: v.toString('base64') } : typeof v === 'bigint' ? Number(v) : v as string | number;
const riga = (r: Record<string, unknown>): Riga => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, serializza(v)]));

function righe(db: AppDatabase, tabella: string, uid: string, ordinamento: string): Riga[] {
  if (!esisteTabella(db, tabella)) return [];
  return (db.prepare(`SELECT * FROM main.${tabella} WHERE voce_uid = ? ORDER BY ${ordinamento}`).all(uid) as Array<Record<string, unknown>>).map(riga);
}

export const migration195: Migration = {
  id: 195, name: 'cruciverba_hacker_doppione_nel_cestino',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'voce_giornata') || !esisteTabella(db, 'cestino')) return;
    const voce = db.prepare('SELECT * FROM main.voce_giornata WHERE uid LIKE ?').all(`${PREFISSO}%`) as Array<Record<string, unknown>>;
    if (voce.length === 0) return;
    if (voce.length > 1) errore(`${voce.length} voci cominciano con ${PREFISSO}`);
    const v = voce[0]!;
    const uid = String(v.uid);
    if (v.azione !== TESTO || v.data !== '08-29' || v.fascia !== 'sera') errore(`la voce ${uid} non è «${TESTO}» del 29/8 sera`);
    const sorella = db.prepare('SELECT uid, azione, data, fascia FROM main.voce_giornata WHERE uid LIKE ?').get(`${SORELLA}%`) as { uid: string; azione: string; data: string; fascia: string } | undefined;
    if (!sorella || sorella.azione !== TESTO || sorella.data !== '08-30' || sorella.fascia !== 'sera') errore('la voce sorella del 30/8 sera non c\'è o è diversa: il doppione non è provato');
    for (const t of ['voce_infiltrazione', 'proposta_infiltrazione_voce', 'evento_calendario_voce', 'proposta_effetto_voce']) {
      if (esisteTabella(db, t) && db.prepare(`SELECT 1 FROM main.${t} WHERE voce_uid = ?`).get(uid)) errore(`la voce ha righe in ${t}`);
    }
    if (db.prepare('SELECT 1 FROM main.cestino WHERE tipo = ? AND chiave = ?').get('voce-diario', uid)) return;

    const prima = new Map<string, string>();
    for (const t of ['cruciverba', 'domanda', 'evento_calendario']) if (esisteTabella(db, t)) prima.set(t, improntaTabella(db, t));

    // 1. il registro, nell'ordine dell'eliminazione: figli, voce, poi il compattamento dell'ordine
    const passi: Passo[] = [];
    let seq = 0;
    for (const r of righe(db, 'voce_effetto', uid, 'ordine')) passi.push({ seq: seq++, tabella: 'voce_effetto', op: 'D', prima: r });
    for (const r of righe(db, 'voce_effetto_transizione', uid, 'voce_uid')) passi.push({ seq: seq++, tabella: 'voce_effetto_transizione', op: 'D', prima: r });
    passi.push({ seq: seq++, tabella: 'voce_giornata', op: 'D', prima: riga(v) });
    const sorelleDellaFascia = db.prepare('SELECT * FROM main.voce_giornata WHERE data = ? AND fascia = ? AND uid <> ? ORDER BY ordine, uid').all(v.data, v.fascia, uid) as Array<Record<string, unknown>>;
    const vicini = (db.prepare('SELECT uid FROM main.voce_giornata WHERE data = ? AND fascia = ? ORDER BY ordine, uid').pluck().all(v.data, v.fascia) as string[]);
    const posto = vicini.indexOf(uid);
    sorelleDellaFascia.forEach((s, i) => {
      if (s.ordine !== i) passi.push({ seq: seq++, tabella: 'voce_giornata', op: 'U', prima: riga(s), dopo: riga({ ...s, ordine: i }) });
    });

    // 2. l'eliminazione vera
    db.prepare('DELETE FROM main.voce_effetto WHERE voce_uid = ?').run(uid);
    if (esisteTabella(db, 'voce_effetto_transizione')) db.prepare('DELETE FROM main.voce_effetto_transizione WHERE voce_uid = ?').run(uid);
    db.prepare('DELETE FROM main.voce_giornata WHERE uid = ?').run(uid);
    const scrivi = db.prepare('UPDATE main.voce_giornata SET ordine = ? WHERE uid = ?');
    sorelleDellaFascia.forEach((s, i) => { if (s.ordine !== i) scrivi.run(i, String(s.uid)); });

    // 3. la riga del Cestino
    const conti: Record<string, number> = {};
    for (const p of passi) if (p.op === 'D') conti[p.tabella] = (conti[p.tabella] ?? 0) + 1;
    db.prepare('INSERT INTO main.cestino (uid, tipo, chiave, nome, contesto, riepilogo_json, registro_json, con_partite, vicini_json, eliminato_il) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)')
      .run(randomBytes(16).toString('hex'), 'voce-diario', uid, String(v.azione), `${String(v.data)} · ${String(v.fascia)}`, JSON.stringify(conti), JSON.stringify(passi),
        JSON.stringify({ prima: vicini[posto - 1] ?? null, dopo: vicini[posto + 1] ?? null }), new Date().toISOString());

    // 4. controlli
    const sorellaUid = sorella?.uid ?? '';
    if (db.prepare('SELECT 1 FROM main.voce_giornata WHERE uid = ?').get(uid)) errore('la voce esiste ancora');
    if (!db.prepare('SELECT 1 FROM main.voce_giornata WHERE uid = ?').get(sorellaUid)) errore('la voce del 30/8 sera è sparita');
    for (const [t, imp] of prima) if (improntaTabella(db, t) !== imp) errore(`la tabella ${t} è cambiata`);
    logger.info({ migrazione: 'L11-R11-10c-195', voce: uid, passi: passi.length, conti }, 'cruciverba Hacker del 29/8 nel Cestino');
  },
};
