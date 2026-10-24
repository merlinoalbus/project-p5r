// ============================================================
// 207 — i legami voce → infiltrazione delle proposte dichiarate certe (L11 · R11-10c/2, M-B; documento: `lotti/L11/ondate2-6/R11-10c-consolida.md` §3 /2)
// ============================================================
//
// `proposta_infiltrazione_voce` (migrazione 110) ha 102 righe su 37 voci; `voce_infiltrazione` (il dato che la voce legge) ha 0 righe. Questa migrazione fa lo stesso lavoro
// del gesto «Conferma» (`impostaInfiltrazioniVoce`, stessi controlli) SOLO per le 19 voci la cui proposta è dichiarata «certa» (3 con la regola `data-nel-nome`, 16
// `letta-voce-per-voce`), cioè una infiltrazione per voce. NON si applicano le 16 voci «multipla» (81 righe, insiemi ordinati) né le 2 «probabile» (06-20 e 11-19):
// restano come proposta, senza legami.
//
// Per ogni voce dell'elenco: guardia sull'uid e sulla data attesa, sul fatto che non abbia già legami (una scelta dell'utente non si tocca), sulla proposta ancora
// identica (una sola riga, ordine 0, stessa infiltrazione, certezza «certa»), sull'infiltrazione esistente e sul Palazzo (se la voce ha un riferimento «dungeon», è lo
// stesso Palazzo dell'infiltrazione). Una voce che non passa una guardia si salta senza errore e finisce nell'audit. Le righe di proposta NON si cancellano (archivio).
// Non cambiano testo, ordine, data, fascia, effetti, note, `da_rivedere` né spunte di nessuna voce (impronta di `voce_giornata` e della proposta prima e dopo).
// Audit in `dati_guida.legami-infiltrazioni-voci-207`: legami scritti, voci saltate, voci non applicate perché non certe.
// ============================================================

import { createHash } from 'node:crypto';
import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';

/** [uid della voce, data attesa, chiave dell'infiltrazione]: l'elenco delle 19 proposte «certe». */
const CERTE: ReadonlyArray<readonly [string, string, string]> = [
  ['f3d6ddf19b62f76616e3de65ac00f2b9', '04-11', 'kamoshida-1-tutorial-palazzo-11-04'],
  ['e4290542b3376439f92c71b76e18b64e', '04-12', 'kamoshida-tutorial-palazzo-12-04'],
  ['6fd5031403067e22f9306de902cf57a6', '04-15', 'kamoshida-tutorial-palazzo-15-04'],
  ['cdc7e3a818e612b94efe7853135f7617', '04-22', 'kamoshida-rubare-i-desideri-del-cuore'],
  ['3fb31dded3f9581173037ce9d1ec9535', '05-16', 'madarame-01-entrata-del-museo'],
  ['445731a85c54f6d1fa541f10ee8c64d1', '05-16', 'madarame-01-entrata-del-museo'],
  ['cea365dae255a9787afdf99661e5aa0f', '05-19', 'madarame-scopri-dove-il-tesoro'],
  ['464ccfe40659a41b6b201947ed776312', '05-20', 'madarame-disabilita-i-sistemi-di-sicurezza'],
  ['6ebb178b6fc4009d3335635446a2c864', '05-27', 'madarame-nelle-profondita-del-museo'],
  ['b9371f8061aedd71262a200b98d18bd0', '06-01', 'madarame-il-furto-del-cuore-di-madarame'],
  ['5fa87613387914bfcd9c03f664602169', '06-27', 'kaneshiro-04-caveau-sotterraneo'],
  ['c9efdb83a3eeb29a6ceea9a6f6cc2ea2', '08-03', 'futaba-10-santuario-interno-camera-del-vuoto-area-finale-dato-parzialm'],
  ['8d8588deeea8d17f6279c5c26651d08c', '10-06', 'okumura-10-produzione-armamenti'],
  ['527cf9832e94e93e855436191e06f8b6', '11-24', 'shido-01-passaggio-centrale-sala-d-ingresso'],
  ['b7122251a674682657fe627319d36d91', '12-12', 'shido-16-aula-magna-tesoro-e-boss-finali'],
  ['3db90a97fcbc510f8fb97ca5aa142dd2', '02-03', 'maruki-12-eden-modello-psi-cognitivo-eden'],
  ['c3aff3d5cc749a1452814d60bd576b83', '02-03', 'maruki-12-eden-modello-psi-cognitivo-eden'],
  ['ccbbc79f7f8ecf2423794dc9e9683cc6', '02-03', 'maruki-12-eden-modello-psi-cognitivo-eden'],
  ['525ed37ba675f84dee6178c4e473365e', '02-03', 'maruki-12-eden-modello-psi-cognitivo-eden'],
];
const errore = (motivo: string): never => { throw new Error(`207: ${motivo}; nessuna modifica applicata.`); };

function impronta(db: AppDatabase, sql: string): string {
  const h = createHash('sha256');
  let n = 0;
  for (const r of db.prepare(sql).iterate()) { h.update(JSON.stringify(r) + '\n'); n++; }
  return `${n}:${h.digest('hex')}`;
}

export const migration207: Migration = {
  id: 207, name: 'voci_infiltrazioni_certe',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['voce_giornata', 'voce_infiltrazione', 'proposta_infiltrazione_voce', 'dungeon_area', 'dati_guida']) if (!esisteTabella(db, t)) return;
    const vociPrima = impronta(db, 'SELECT * FROM main.voce_giornata ORDER BY uid');
    const propostePrima = impronta(db, 'SELECT * FROM main.proposta_infiltrazione_voce ORDER BY voce_uid, ordine');
    const legamiPrima = db.prepare('SELECT COUNT(*) FROM main.voce_infiltrazione').pluck().get() as number;
    const scritti: Record<string, string> = {};
    const saltate: Record<string, string> = {};
    for (const [uid, data, chiave] of CERTE) {
      const v = db.prepare('SELECT uid, data, riferimento_tipo, riferimento_chiave FROM main.voce_giornata WHERE uid = ?').get(uid) as
        { uid: string; data: string; riferimento_tipo: string | null; riferimento_chiave: string | null } | undefined;
      if (!v) { saltate[uid] = 'voce assente'; continue; }
      if (v.data !== data) { saltate[uid] = `data ${v.data} invece di ${data}`; continue; }
      if (db.prepare('SELECT 1 FROM main.voce_infiltrazione WHERE voce_uid = ?').get(uid)) { saltate[uid] = 'ha già dei legami'; continue; }
      const p = db.prepare('SELECT ordine, infiltrazione_chiave, certezza FROM main.proposta_infiltrazione_voce WHERE voce_uid = ? ORDER BY ordine').all(uid) as
        Array<{ ordine: number; infiltrazione_chiave: string; certezza: string }>;
      if (p.length !== 1 || p[0].ordine !== 0 || p[0].infiltrazione_chiave !== chiave || p[0].certezza !== 'certa') { saltate[uid] = 'la proposta non è più quella attesa'; continue; }
      const i = db.prepare('SELECT dungeon_chiave FROM main.dungeon_area WHERE chiave = ?').get(chiave) as { dungeon_chiave: string } | undefined;
      if (!i) { saltate[uid] = 'infiltrazione assente'; continue; }
      if (v.riferimento_tipo === 'dungeon' && v.riferimento_chiave !== i.dungeon_chiave) { saltate[uid] = `Palazzo diverso (${v.riferimento_chiave} / ${i.dungeon_chiave})`; continue; }
      if (v.riferimento_tipo !== null && v.riferimento_tipo !== 'dungeon') { saltate[uid] = `riferimento ${v.riferimento_tipo}, non un Palazzo`; continue; }
      db.prepare('INSERT INTO main.voce_infiltrazione (voce_uid, ordine, infiltrazione_chiave) VALUES (?, 0, ?)').run(uid, chiave);
      scritti[uid] = chiave;
    }
    const nonApplicate = db.prepare("SELECT certezza, COUNT(DISTINCT voce_uid) AS voci, COUNT(*) AS righe FROM main.proposta_infiltrazione_voce WHERE certezza <> 'certa' GROUP BY certezza ORDER BY certezza").all();
    const n = Object.keys(scritti).length;
    if (n > 0) {
      db.prepare('INSERT OR REPLACE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run('legami-infiltrazioni-voci-207', JSON.stringify({
        versione: 1, motivo: 'Legami voce → infiltrazione scritti da M-B (L11, R11-10c/2, migrazione 207) per le sole proposte «certe»; le «multipla» e le «probabile» restano proposta.', scritti, saltate, nonApplicate,
      }));
    }
    if (impronta(db, 'SELECT * FROM main.voce_giornata ORDER BY uid') !== vociPrima) errore('il Diario è cambiato');
    if (impronta(db, 'SELECT * FROM main.proposta_infiltrazione_voce ORDER BY voce_uid, ordine') !== propostePrima) errore('le proposte sono cambiate');
    if ((db.prepare('SELECT COUNT(*) FROM main.voce_infiltrazione').pluck().get() as number) !== legamiPrima + n) errore('il numero dei legami non torna');
    logger.info({ migrazione: 'L11-R11-10c-207', scritti: n, saltate: Object.keys(saltate).length }, 'legami voce → infiltrazione delle proposte certe (M-B)');
  },
};
