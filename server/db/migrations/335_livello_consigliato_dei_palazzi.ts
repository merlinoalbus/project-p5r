// ============================================================
// Migrazione 335 — il livello consigliato dei Palazzi: minimo e massimo di Royal, il confronto delle fonti in una nota storica (L8-04, D5)
// ============================================================
//
// Voce di piano L8-04: `dungeon.livello_consigliato` era un testo libero di 100–300 caratteri in 9 casi su 10, con dentro il confronto fra le
// fonti (Futaba: «circa 30-37 (fonti discordanti: allgamestaff indica ~32-37, samurai-gamers indica 18-36, gamerant indica 30-35)»).
// Decisione dell'utente D5 («ok» alla proposta): il livello consigliato diventa un dato, il livello minimo e massimo di Royal, e il confronto
// delle fonti resta, intero, in una nota storica separata (DECISIONI §1: prevale il dato Royal documentato, il superato resta nota storica,
// senza medie né fusioni di versioni).
//
// I numeri, uno per uno, dal testo di oggi (copia del 1° novembre), con il dato della guida italiana di Royal dove c'è:
//   - Kamoshida: la guida non lo dice; l'unico consiglio scritto è «almeno al Livello 10 prima dello scontro finale» → minimo 10 (fonte secondaria: da confermare da Roberto);
//   - Madarame: la guida, «Circa Livello 15-16 durante l'esplorazione» → 15–16 (il 21 per Shiki-Ouji è facoltativo e resta nella nota);
//   - Kaneshiro: «Non indicato esplicitamente»; i livelli dei nemici non sono un consiglio → nessun numero;
//   - Futaba: la guida italiana (allgamestaff) indica 32–37 → 32–37 (le altre due fonti restano nella nota, senza medie);
//   - Okumura: la guida, «circa Lv 41-43 all'ingresso nell'area finale» e «arrivare a Lv 50 prima di affrontare il boss finale» → 41–50;
//   - Niijima: «Party circa livello 45+» (la guida dice solo «medio-alto») → minimo 45 (fonte secondaria: da confermare da Roberto);
//   - Shido: «Non indicato esplicitamente»; il livello dei boss e il consiglio per i Memento dopo il Palazzo non sono un consiglio → nessuno;
//   - Iweleth: «75 (benchmark per i boss principali)» → 75;
//   - Maruki: «Livello 75+ già al primo ingresso» → minimo 75 (lo scontro finale «vicino al livello massimo» non è un numero).
// Il testo di prima si riconosce dalla sua impronta (SHA-256, primi 16 caratteri): un testo diverso (corretto nel frattempo) non riceve numeri
// decisi su un altro testo, ma va comunque, intero, nella nota storica. Un testo vuoto (i Memento) non ha nota.
//
// COSA (dentro la transazione della migrazione, idempotente: tutto avviene solo se la colonna di prima c'è ancora):
//   1. `dungeon.livello_min` e `dungeon.livello_max` (interi da 1 a 99, null = la fonte non lo dice);
//   2. i legami delle note storiche accettano anche il tipo `dungeon` (la tabella si ricostruisce con le stesse righe e lo stesso indice);
//   3. per ogni Palazzo con un testo: la nota storica `livello-dungeon-<chiave>` (testo di prima, «Ripristina» al valore della guida) legata
//      al Palazzo, e i numeri se l'impronta è quella attesa;
//   4. il testo si archivia in `dati_guida.archivio-frasi-l11` e la colonna si toglie (convenzione delle migrazioni 194 e 218); il registro
//      `FONTI_TOLTE` riceve la voce. Le altre colonne di `dungeon`, le aree, i punti della guida (Kamoshida e Madarame compresi) e i pin non
//      cambiano: lo controllano le impronte prima e dopo.
// Scrive solo in `main`.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { archiviaFrasi, archiviate, esisteTabella, haColonna, improntaTabella, righeConValore } from './pulizieL11.js';

/** Il testo di oggi (impronta) e il livello minimo e massimo che ne viene, per Palazzo. */
const LIVELLI: Readonly<Record<string, { impronta: string; min: number | null; max: number | null }>> = {
  kamoshida: { impronta: '727c54394982402b', min: 10, max: null },
  madarame: { impronta: '4f5bb609ebc2e535', min: 15, max: 16 },
  kaneshiro: { impronta: 'be3763724d837c71', min: null, max: null },
  futaba: { impronta: '3b00c1901120e0de', min: 32, max: 37 },
  okumura: { impronta: '2f66c05bdb64cda6', min: 41, max: 50 },
  niijima: { impronta: 'f1945f1217e44916', min: 45, max: null },
  shido: { impronta: '47d307416c85b02b', min: null, max: null },
  iweleth: { impronta: 'ab071b8617af7af6', min: 75, max: 75 },
  maruki: { impronta: 'fc8d012757cd7489', min: 75, max: null },
};
/** Le tabelle che questa migrazione non deve cambiare (Palazzi validati compresi: aree, voci, pin). */
const INTATTE = ['dungeon_area', 'punto_interesse', 'spillo', 'area_dedalo', 'voce_giornata', 'voce_infiltrazione'] as const;
const impronta = (testo: string): string => createHash('sha256').update(testo, 'utf8').digest('hex').slice(0, 16);
const chiaveNota = (dungeon: string): string => `livello-dungeon-${dungeon}`;
const errore = (motivo: string): never => { throw new Error(`335: ${motivo}; nessuna modifica applicata.`); };

export const migration335: Migration = {
  id: 335,
  name: 'livello_consigliato_dei_palazzi',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'dungeon') || !haColonna(db, 'dungeon', 'livello_consigliato')) return;
    for (const t of ['dati_guida', 'nota_storica', 'nota_storica_legame']) if (!esisteTabella(db, t)) errore(`manca la tabella ${t}`);

    const prima = new Map<string, string>([['dungeon', improntaTabella(db, 'dungeon', ['livello_consigliato'])], ['nota_storica_legame', improntaTabella(db, 'nota_storica_legame')]]);
    for (const t of INTATTE) if (esisteTabella(db, t)) prima.set(t, improntaTabella(db, t));
    const noteGia = db.prepare('SELECT COUNT(*) FROM main.nota_storica').pluck().get() as number;

    // 1. le colonne del livello
    if (!haColonna(db, 'dungeon', 'livello_min')) db.exec('ALTER TABLE main.dungeon ADD COLUMN livello_min INTEGER CHECK (livello_min IS NULL OR livello_min BETWEEN 1 AND 99)');
    if (!haColonna(db, 'dungeon', 'livello_max')) db.exec('ALTER TABLE main.dungeon ADD COLUMN livello_max INTEGER CHECK (livello_max IS NULL OR livello_max BETWEEN 1 AND 99)');

    // 2. i legami delle note storiche accettano il Palazzo: stessa tabella, stesse righe, un tipo in più nel controllo
    const sqlLegame = db.prepare("SELECT sql FROM main.sqlite_master WHERE type = 'table' AND name = 'nota_storica_legame'").pluck().get() as string;
    if (!sqlLegame.includes("'dungeon'")) {
      const righeLegame = db.prepare('SELECT COUNT(*) FROM main.nota_storica_legame').pluck().get() as number;
      db.exec(`CREATE TABLE main.nota_storica_legame_335 (
        nota_chiave TEXT NOT NULL REFERENCES nota_storica(chiave) ON DELETE CASCADE,
        tipo        TEXT NOT NULL CHECK (tipo IN ('articolo', 'catalogo', 'dungeon')),
        chiave      TEXT NOT NULL,
        PRIMARY KEY (nota_chiave, tipo, chiave)
      )`);
      db.exec('INSERT INTO main.nota_storica_legame_335 (nota_chiave, tipo, chiave) SELECT nota_chiave, tipo, chiave FROM main.nota_storica_legame ORDER BY rowid');
      db.exec('DROP TABLE main.nota_storica_legame');
      db.exec('ALTER TABLE main.nota_storica_legame_335 RENAME TO nota_storica_legame');
      db.exec('CREATE INDEX IF NOT EXISTS main.nota_storica_legame_riga ON nota_storica_legame (tipo, chiave)');
      if ((db.prepare('SELECT COUNT(*) FROM main.nota_storica_legame').pluck().get() as number) !== righeLegame) errore('i legami delle note storiche non sono tutti passati');
      if (improntaTabella(db, 'nota_storica_legame') !== prima.get('nota_storica_legame')) errore('i legami delle note storiche sono cambiati');
    }

    // 3. la nota storica e i numeri, Palazzo per Palazzo
    const righe = db.prepare('SELECT chiave, livello_consigliato AS testo FROM main.dungeon ORDER BY ordine, chiave').all() as Array<{ chiave: string; testo: string }>;
    const adesso = new Date().toISOString();
    const esiti: Array<{ dungeon: string; nota: boolean; min: number | null; max: number | null; impronta: string | null; riconosciuto: boolean }> = [];
    const notaNuova = db.prepare('INSERT INTO main.nota_storica (chiave, testo, fonte, versione, seed_json, updated_at) VALUES (?, ?, ?, 1, ?, ?)');
    const lega = db.prepare("INSERT INTO main.nota_storica_legame (nota_chiave, tipo, chiave) VALUES (?, 'dungeon', ?)");
    const livello = db.prepare('UPDATE main.dungeon SET livello_min = ?, livello_max = ? WHERE chiave = ?');
    for (const r of righe) {
      const testo = (r.testo ?? '').trim();
      if (!testo) { esiti.push({ dungeon: r.chiave, nota: false, min: null, max: null, impronta: null, riconosciuto: false }); continue; }
      const k = chiaveNota(r.chiave);
      if (db.prepare('SELECT 1 FROM main.nota_storica WHERE chiave = ?').get(k)) errore(`la nota storica ${k} c'è già`);
      notaNuova.run(k, r.testo, '', JSON.stringify({ versione: 1, testo: r.testo, fonte: '' }), adesso);
      lega.run(k, r.chiave);
      const atteso = LIVELLI[r.chiave];
      const impr = impronta(r.testo);
      const riconosciuto = !!atteso && atteso.impronta === impr;
      if (riconosciuto && (atteso.min !== null || atteso.max !== null)) {
        if (atteso.min !== null && atteso.max !== null && atteso.min > atteso.max) errore(`minimo sopra il massimo per ${r.chiave}`);
        livello.run(atteso.min, atteso.max, r.chiave);
      }
      esiti.push({ dungeon: r.chiave, nota: true, min: riconosciuto ? atteso.min : null, max: riconosciuto ? atteso.max : null, impronta: impr, riconosciuto });
    }

    // 4. l'archivio del testo e la colonna
    const testi = righeConValore(db, 'dungeon', 'livello_consigliato');
    const attese = Object.keys(testi).length;
    archiviaFrasi(db, 'L8-04 · 335', { 'dungeon.livello_consigliato': testi }, { 'dungeon.livello_consigliato': { righe: righe.length, conTesto: attese, esiti } });
    db.exec('ALTER TABLE main.dungeon DROP COLUMN "livello_consigliato"');

    // le verifiche: archivio completo, colonna tolta, una nota per testo, il resto identico
    if (archiviate(db, 'dungeon.livello_consigliato') !== attese) errore(`l'archivio di dungeon.livello_consigliato non ha ${attese} righe`);
    if (haColonna(db, 'dungeon', 'livello_consigliato')) errore('la colonna dungeon.livello_consigliato esiste ancora');
    const noteDopo = db.prepare('SELECT COUNT(*) FROM main.nota_storica').pluck().get() as number;
    if (noteDopo - noteGia !== esiti.filter((e) => e.nota).length) errore('le note storiche nuove non sono una per testo');
    if (improntaTabella(db, 'dungeon', ['livello_min', 'livello_max']) !== prima.get('dungeon')) errore('le altre colonne di dungeon sono cambiate');
    for (const t of INTATTE) if (prima.has(t) && improntaTabella(db, t) !== prima.get(t)) errore(`la tabella ${t} è cambiata`);
    const nonRiconosciuti = esiti.filter((e) => e.nota && !e.riconosciuto).map((e) => e.dungeon);
    if (nonRiconosciuti.length) logger.warn({ migrazione: 335, nonRiconosciuti }, 'livello consigliato: testi diversi da quelli letti, solo nota storica (nessun numero)');
    logger.info({ migrazione: 335, esiti }, 'livello consigliato dei Palazzi: minimo e massimo, con il confronto delle fonti nella nota storica');
  },
};
