// ============================================================
// Utente 066 — lo sblocco di «Medicina amara» nelle partite che avevano già spuntato la voce del rango 7 di Takemi (decisione del 01/11)
// ============================================================
//
// La migrazione di gioco 341 ha dato alla voce del 28/05 (rango 7 di Takemi, `9b5f96dc…`) l'effetto `sblocco richiesta:medicina-amara`
// (uid `03f88a60…`, derivato da un seme: lo stesso su ogni copia), risposta dell'utente «Dal rango 7 di Takemi». Lo sblocco di una partita è uno
// stato: lo scrive la spunta (`effettiDiStatoService.applicaStato`), e su una voce già spuntata lo scrive il salvataggio dalla guida
// (`motoreDiario.riallineaStatiDellaVoce`), che una migrazione di gioco non chiama. Risposta dell'utente: «Migrazione automatica».
//
// COSA: per ogni partita che esiste (non nel Cestino: una partita nel Cestino non ha più righe nelle tabelle delle partite) e che ha la spunta
// della voce, si scrive ESATTAMENTE quello che avrebbe scritto la spunta:
//   - la riga del «prima» in `effetto_stato_voce` (partita, voce, effetto, tipo `sblocco`, chiave `richiesta:medicina-amara`,
//     `prima_json` = `{"gia":false}`, oppure `{"gia":true}` se lo sblocco c'era già per un'altra via);
//   - se lo sblocco non c'era, la riga di `sblocco_partita` (partita, `richiesta`, `medicina-amara`, la voce, l'ora). Se c'era già, non si tocca:
//     togliendo la spunta resta, come per la spunta normale.
// Conservativa e idempotente: una partita che ha già la riga del «prima» per questo effetto si salta (allineata); una partita con una
// proposta aperta su questo effetto (`da_applicare`, causa `voce` `<voce>:<effetto>`) si salta e si conta, perché la decisione è dell'utente.
// Le altre righe di tutte le tabelle delle partite restano identiche (impronte prima e dopo).
//
// ORDINE: `runMigrations` applica tutte le migrazioni di gioco (`main`) e poi quelle delle partite (`utente`), nella stessa chiamata e con
// l'avvio fermato da un errore: quando la 066 gira, la 341 c'è già. Se l'effetto non c'è (un file di gioco senza la 341, che oggi non può
// arrivare qui), la 066 non scrive niente e lo dice nel log: senza l'effetto nella guida la spunta non avrebbe scritto niente, e lo stato resta
// quello che la spunta lascia. Se poi un file di gioco con la 341 sostituisce quello di prima («Importa»), l'effetto ha lo stesso uid e le
// righe già scritte restano valide.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';

const VOCE = '9b5f96dce094310d91c01c6c26a30fdb';
const EFFETTO = '03f88a6020de55f09a7572e59acce7ff';
const BERSAGLIO = { tipo: 'richiesta', chiave: 'medicina-amara' } as const;
const CHIAVE = `${BERSAGLIO.tipo}:${BERSAGLIO.chiave}`;
const errore = (motivo: string): never => { throw new Error(`utente 066: ${motivo}; nessuna modifica applicata.`); };

const tabella = (db: AppDatabase, schema: 'main' | 'utente', nome: string): boolean =>
  !!db.prepare(`SELECT 1 FROM ${schema}.sqlite_master WHERE type = 'table' AND name = ?`).get(nome);

/** L'impronta di tutte le tabelle delle partite, senza le righe di questo effetto nelle due tabelle che la migrazione scrive. */
function impronta(db: AppDatabase): string {
  const h = createHash('sha256');
  const tabelle = db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").pluck().all() as string[];
  for (const t of tabelle) {
    h.update(`#${t}\n`);
    const filtro = t === 'effetto_stato_voce' ? ` WHERE NOT (voce_uid = '${VOCE}' AND effetto_uid = '${EFFETTO}')`
      : t === 'sblocco_partita' ? ` WHERE NOT (bersaglio_tipo = '${BERSAGLIO.tipo}' AND bersaglio_chiave = '${BERSAGLIO.chiave}')` : '';
    for (const r of db.prepare(`SELECT * FROM utente."${t}"${filtro} ORDER BY rowid`).raw().iterate() as Iterable<unknown[]>) h.update(JSON.stringify(r) + '\n');
  }
  return h.digest('hex');
}

export const utente066: Migration = {
  id: 66,
  name: 'sblocco_di_medicina_amara_nelle_spunte',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!['partita', 'spunta_voce_partita', 'sblocco_partita', 'effetto_stato_voce'].every((t) => tabella(db, 'utente', t))) return;
    // l'effetto della 341, com'è nella guida: senza, la spunta non avrebbe scritto niente
    const effetto = tabella(db, 'main', 'voce_effetto')
      ? db.prepare('SELECT tipo, chiave, dati_json FROM main.voce_effetto WHERE uid = ? AND voce_uid = ?').get(EFFETTO, VOCE) as { tipo: string; chiave: string | null; dati_json: string } | undefined
      : undefined;
    let dati: Record<string, unknown> | null;
    try { dati = effetto ? JSON.parse(effetto.dati_json) as Record<string, unknown> : null; } catch { dati = null; }
    if (!effetto || effetto.tipo !== 'sblocco' || effetto.chiave !== CHIAVE || !dati || dati.bersaglio !== BERSAGLIO.tipo || dati.chiave !== BERSAGLIO.chiave || dati.condizioni !== undefined) {
      logger.info({ migrazione: 'utente 066', motivo: 'effetto della 341 assente o diverso da quello atteso' }, 'sblocco di «Medicina amara»: niente da allineare');
      return;
    }
    const prima = impronta(db);
    const partite = db.prepare('SELECT s.partita_id AS id FROM utente.spunta_voce_partita s JOIN utente.partita p ON p.id = s.partita_id WHERE s.voce_uid = ? ORDER BY s.partita_id').pluck().all(VOCE) as number[];
    const conProposte = tabella(db, 'utente', 'da_applicare')
      ? new Set(db.prepare("SELECT DISTINCT partita_id FROM utente.da_applicare WHERE causa_tipo = 'voce' AND causa_chiave = ? AND stato = 'aperta'").pluck().all(`${VOCE}:${EFFETTO}`) as number[])
      : new Set<number>();
    const adesso = new Date().toISOString();
    const esiti: Array<{ partita: number; esito: string }> = [];
    for (const p of partite) {
      if (db.prepare('SELECT 1 FROM utente.effetto_stato_voce WHERE partita_id = ? AND voce_uid = ? AND effetto_uid = ?').get(p, VOCE, EFFETTO)) { esiti.push({ partita: p, esito: 'già allineata' }); continue; }
      if (conProposte.has(p)) { esiti.push({ partita: p, esito: 'proposta aperta su questo effetto: non toccata' }); continue; }
      // come `leggiPrima` e `applicaStato`: il «prima» è lo stato di adesso; lo sblocco si scrive solo se non c'era
      const gia = !!db.prepare('SELECT 1 FROM utente.sblocco_partita WHERE partita_id = ? AND bersaglio_tipo = ? AND bersaglio_chiave = ?').get(p, BERSAGLIO.tipo, BERSAGLIO.chiave);
      db.prepare('INSERT INTO utente.effetto_stato_voce (partita_id, voce_uid, effetto_uid, tipo, chiave, prima_json, applicato_il) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(p, VOCE, EFFETTO, 'sblocco', CHIAVE, JSON.stringify({ gia }), adesso);
      if (!gia) db.prepare('INSERT INTO utente.sblocco_partita (partita_id, bersaglio_tipo, bersaglio_chiave, voce_uid, creato_il) VALUES (?, ?, ?, ?, ?)').run(p, BERSAGLIO.tipo, BERSAGLIO.chiave, VOCE, adesso);
      esiti.push({ partita: p, esito: gia ? 'sblocco già presente: registrato il prima {"gia":true}' : 'sblocco scritto, prima {"gia":false}' });
    }
    if (impronta(db) !== prima) errore('sono cambiate righe delle partite fuori da questo effetto');
    // le righe di questo effetto: una per partita allineata, e lo sblocco per ognuna (scritto qui o già presente)
    for (const p of partite.filter((x) => !conProposte.has(x))) {
      if (!db.prepare('SELECT 1 FROM utente.effetto_stato_voce WHERE partita_id = ? AND voce_uid = ? AND effetto_uid = ?').get(p, VOCE, EFFETTO)) errore(`manca il «prima» della partita ${p}`);
    }
    logger.info({ migrazione: 'utente 066', partiteConLaSpunta: partite.length, esiti }, 'sblocco di «Medicina amara» nelle partite con la voce del 28/05 spuntata');
  },
};
