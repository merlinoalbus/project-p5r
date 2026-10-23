// ============================================================
// 166 — l'entità Ombra (L8, B4: R8-01, R8-02, R8-03b, R8-04, R8-08b, R8-09)
// ============================================================
//
// Nasce l'Ombra: chiave stabile, nome italiano, Persona del compendio (o nessuna: non reclutabile), personalità, luoghi d'incontro. Le
// «copie» di oggi (le 217 righe di `dati_guida.battaglia.ombre`, le voci Persona dei dedali dei Memento e dei Palazzi) si raccordano per chiave
// senza perdere una riga: le righe e le voci non cambiano di una virgola (testi, ordine, pin, aree), si aggiungono i collegamenti.
//
//   ombra               l'Ombra (la scelta di modello è in `modelloOmbra.ts`)
//   ombra_luogo         dove si incontra, per Palazzo (infiltrazione) o Memento (dedalo): fonti Battaglia e voci dei Palazzi
//   ombra_voce          la voce Persona della guida che la descrive (una voce, un'Ombra)
//   ombra_luogo_dedalo  (vista) le aree dei dedali dove si incontra: derivate da `persona_area_dedalo`, nessuna copia
//
// Correzioni conservative ai dati (G-035): le due righe di Kaneshiro con Ombra e maschera scambiate e la maschera Mara di «Straziato re dei
// desideri» si correggono in `dati_guida.battaglia` solo se la riga è ancora esattamente quella nota. Il compendio non si tocca. Le debolezze
// non si ricopiano: restano nel compendio; solo le 4 eccezioni di G-019 e le non reclutabili hanno affinità proprie sull'Ombra.
//
// Il rapporto «da approvare» (non abbinate, varianti di personalità, ambigue, voci che non sono Ombre, Ombre senza nome…) sta in `dati_guida`
// (`ombre-l8-166`) ed è letto da `GET /api/compendio/ombre/verifica`. Non tocca `partite.db`. Se `ombra` esiste già non fa nulla.
// Nessun import da `server/services/`.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { costruisciIndicePersone, normalizza } from '../../../shared/maschere.js';
import { correggiRighe, costruisciModello, type RigaBattaglia, type VocePersonalita } from './modelloOmbra.js';

const QUI = path.dirname(fileURLToPath(import.meta.url));

/** Il file delle personalità di G-021 §5, cercato accanto al codice e nei sorgenti (test e sviluppo). */
function leggiPersonalitaG021(): VocePersonalita[] {
  for (const p of [path.join(QUI, 'dati', 'ombre-personalita.json'), path.join(process.cwd(), 'server', 'db', 'migrations', 'dati', 'ombre-personalita.json')]) {
    if (fs.existsSync(p)) return (JSON.parse(fs.readFileSync(p, 'utf8')) as { voci: VocePersonalita[] }).voci;
  }
  throw new Error('166: manca il file delle personalità (server/db/migrations/dati/ombre-personalita.json); nessuna migrazione parziale.');
}

const DDL = [
  `CREATE TABLE ombra (
    chiave                 TEXT PRIMARY KEY,
    nome                   TEXT NOT NULL,
    nomi_altri_json        TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(nomi_altri_json)),
    persona_id             INTEGER REFERENCES persona(id) ON DELETE SET NULL,
    maschera_nota          TEXT,
    personalita            TEXT NOT NULL DEFAULT 'sconosciuta' CHECK (personalita IN ('giocosa', 'timida', 'irritabile', 'cupa', 'sconosciuta')),
    catturabile            INTEGER NOT NULL DEFAULT 1 CHECK (catturabile IN (0, 1)),
    negoziabile            INTEGER CHECK (negoziabile IS NULL OR negoziabile IN (0, 1)),
    nome_negoziazione      TEXT,
    affinita_proprie_json  TEXT CHECK (affinita_proprie_json IS NULL OR json_valid(affinita_proprie_json)),
    livello                INTEGER CHECK (livello IS NULL OR livello > 0),
    note                   TEXT NOT NULL DEFAULT '',
    origine                TEXT NOT NULL DEFAULT 'seed' CHECK (origine IN ('seed', 'utente')),
    seed_json              TEXT CHECK (seed_json IS NULL OR json_valid(seed_json)),
    updated_at             TEXT NOT NULL
  )`,
  'CREATE INDEX idx_ombra_persona ON ombra(persona_id)',
  'CREATE INDEX idx_ombra_nome ON ombra(nome)',
  `CREATE TABLE ombra_luogo (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    ombra_chiave          TEXT NOT NULL REFERENCES ombra(chiave) ON DELETE CASCADE,
    dungeon_chiave        TEXT NOT NULL REFERENCES dungeon(chiave) ON DELETE CASCADE,
    infiltrazione_chiave  TEXT REFERENCES dungeon_area(chiave) ON DELETE CASCADE,
    fonte                 TEXT NOT NULL CHECK (fonte IN ('battaglia', 'voce', 'utente'))
  )`,
  "CREATE UNIQUE INDEX uq_ombra_luogo ON ombra_luogo(ombra_chiave, dungeon_chiave, IFNULL(infiltrazione_chiave, ''), fonte)",
  'CREATE INDEX idx_ombra_luogo_posto ON ombra_luogo(dungeon_chiave, infiltrazione_chiave)',
  `CREATE TABLE ombra_voce (
    voce_chiave   TEXT PRIMARY KEY REFERENCES punto_interesse(chiave) ON DELETE CASCADE,
    ombra_chiave  TEXT NOT NULL REFERENCES ombra(chiave) ON DELETE CASCADE
  )`,
  'CREATE INDEX idx_ombra_voce_ombra ON ombra_voce(ombra_chiave)',
  `CREATE VIEW ombra_luogo_dedalo AS
    SELECT ov.ombra_chiave AS ombra_chiave, da.dungeon_chiave AS dungeon_chiave, ad.dedalo_chiave AS dedalo_chiave, ad.chiave AS area_dedalo_chiave, ov.voce_chiave AS voce_chiave
    FROM ombra_voce ov
    JOIN persona_area_dedalo pad ON pad.voce_chiave = ov.voce_chiave
    JOIN area_dedalo ad ON ad.chiave = pad.area_dedalo_chiave
    JOIN dungeon_area da ON da.chiave = ad.dedalo_chiave`,
];

const CHIAVE_RAPPORTO = 'ombre-l8-166';

export const migration166: Migration = {
  id: 166,
  name: 'modello_ombra',
  up(db: AppDatabase) {
    const esiste = (t: string) => !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(t);
    if (esiste('ombra')) return;
    if (!['persona', 'traduzione', 'dati_guida', 'dungeon', 'dungeon_area', 'area_dedalo', 'persona_area_dedalo', 'punto_interesse'].every(esiste)) {
      throw new Error('166: mancano tabelle di gioco necessarie; nessuna migrazione parziale.');
    }
    for (const sql of DDL) db.exec(sql);

    // ---- gli ingressi ----
    const rigaBattaglia = db.prepare("SELECT json FROM main.dati_guida WHERE chiave = 'battaglia'").get() as { json: string } | undefined;
    if (!rigaBattaglia) {
      logger.warn('[migration166] nessun dato di Battaglia: create le sole tabelle, vuote');
      return;
    }
    const battaglia = JSON.parse(rigaBattaglia.json) as { ombre?: RigaBattaglia[]; demoniTesoro?: { elenco?: Array<{ nome: string }> } } & Record<string, unknown>;
    const righeOriginali = battaglia.ombre ?? [];
    const nomiIt: Record<string, string> = {};
    for (const r of db.prepare("SELECT chiave, testo FROM main.traduzione WHERE ambito = 'persona'").all() as Array<{ chiave: string; testo: string }>) nomiIt[r.chiave] = r.testo;
    const indice = costruisciIndicePersone(db.prepare('SELECT id, nome FROM main.persona').all() as Array<{ id: number; nome: string }>, nomiIt);
    const nomiNegoziazione: Record<string, string> = {};
    for (const r of db.prepare("SELECT chiave, testo FROM main.traduzione WHERE ambito = 'negoziazione' AND chiave IN ('Prankster Leader', 'Torn King of Desires')").all() as Array<{ chiave: string; testo: string }>) nomiNegoziazione[r.chiave] = r.testo;
    const demoniTesoro = new Set((battaglia.demoniTesoro?.elenco ?? []).map((d) => normalizza(d.nome)));

    const dettagli = (json: string): Record<string, unknown> => { try { return JSON.parse(json) as Record<string, unknown>; } catch { return {}; } };
    const testoOnull = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);
    const vociDedalo = (db.prepare(`SELECT p.chiave, p.nome, p.dettagli_json FROM main.punto_interesse p JOIN main.dungeon_area a ON a.chiave = p.area_chiave JOIN main.dungeon d ON d.chiave = a.dungeon_chiave
      WHERE p.tipo = 'persona' AND d.tipo = 'mementos' ORDER BY p.chiave`).all() as Array<{ chiave: string; nome: string; dettagli_json: string }>)
      .map((v) => ({ chiave: v.chiave, nome: v.nome, maschera: testoOnull(dettagli(v.dettagli_json).maschera), personalita: testoOnull(dettagli(v.dettagli_json).personalita) }));
    const vociPalazzo = (db.prepare(`SELECT p.chiave, p.nome, d.chiave AS dungeon_chiave, p.area_chiave FROM main.punto_interesse p JOIN main.dungeon_area a ON a.chiave = p.area_chiave JOIN main.dungeon d ON d.chiave = a.dungeon_chiave
      WHERE p.tipo = 'persona' AND d.tipo <> 'mementos' ORDER BY p.chiave`).all() as Array<{ chiave: string; nome: string; dungeon_chiave: string; area_chiave: string }>)
      .map((v) => ({ chiave: v.chiave, nome: v.nome, dungeonChiave: v.dungeon_chiave, areaChiave: v.area_chiave }));

    // ---- le correzioni alla Battaglia (G-035) e la costruzione ----
    const { righe, correzioni } = correggiRighe(righeOriginali);
    const modello = costruisciModello({ indice, righe, personalitaG021: leggiPersonalitaG021(), vociDedalo, vociPalazzo, demoniTesoro, nomiNegoziazione });
    modello.elenco.correzioniBattaglia = correzioni;
    const confluite = modello.ombre.reduce((s, o) => s + o.righe, 0);
    if (confluite !== righe.length) throw new Error(`166: ${righe.length} righe della Battaglia ma ${confluite} confluite nelle Ombre; nessuna migrazione parziale.`);

    // ---- la scrittura ----
    const adesso = new Date().toISOString();
    const inserisciOmbra = db.prepare(`INSERT INTO main.ombra (chiave, nome, nomi_altri_json, persona_id, maschera_nota, personalita, catturabile, negoziabile, affinita_proprie_json, livello, note, origine, seed_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'seed', ?, ?)`);
    const dungeonEsiste = db.prepare('SELECT 1 FROM main.dungeon WHERE chiave = ?');
    const infiltrazioneDi = db.prepare('SELECT dungeon_chiave FROM main.dungeon_area WHERE chiave = ?');
    const inserisciLuogo = db.prepare('INSERT OR IGNORE INTO main.ombra_luogo (ombra_chiave, dungeon_chiave, infiltrazione_chiave, fonte) VALUES (?, ?, ?, ?)');
    const voceEsiste = db.prepare('SELECT 1 FROM main.punto_interesse WHERE chiave = ?');
    const inserisciVoce = db.prepare('INSERT INTO main.ombra_voce (voce_chiave, ombra_chiave) VALUES (?, ?)');
    let luoghi = 0;
    let luoghiSenzaRiferimento = 0;
    let voci = 0;
    for (const o of modello.ombre) {
      const proprie = o.affinitaProprie && Object.keys(o.affinitaProprie).length ? JSON.stringify(o.affinitaProprie) : null;
      const seed = JSON.stringify({ nome: o.nome, nomiAltri: o.nomiAltri, personaId: o.personaId, macheraNota: o.macheraNota, personalita: o.personalita, catturabile: o.catturabile, negoziabile: o.negoziabile, affinitaProprie: o.affinitaProprie, livello: o.livello, note: o.note });
      inserisciOmbra.run(o.chiave, o.nome, JSON.stringify(o.nomiAltri), o.personaId, o.macheraNota, o.personalita, o.catturabile, o.negoziabile, proprie, o.livello, o.note, seed, adesso);
      for (const l of o.luoghi) {
        if (!dungeonEsiste.get(l.dungeon)) { luoghiSenzaRiferimento++; continue; }
        const infiltrazione = l.infiltrazione && (infiltrazioneDi.get(l.infiltrazione) as { dungeon_chiave: string } | undefined)?.dungeon_chiave === l.dungeon ? l.infiltrazione : null;
        if (l.infiltrazione && !infiltrazione) luoghiSenzaRiferimento++;
        luoghi += inserisciLuogo.run(o.chiave, l.dungeon, infiltrazione, l.fonte).changes;
      }
    }
    for (const l of modello.legami) {
      if (!voceEsiste.get(l.voce)) continue;
      voci += inserisciVoce.run(l.voce, l.ombra).changes;
    }

    // ---- la Battaglia corretta (solo le righe cambiate) ----
    if (correzioni.length > 0) {
      const nuovo = JSON.stringify({ ...battaglia, ombre: righe });
      const n = db.prepare("UPDATE main.dati_guida SET json = ? WHERE chiave = 'battaglia' AND json = ?").run(nuovo, rigaBattaglia.json).changes;
      if (n !== 1) throw new Error('166: la Battaglia è cambiata durante la migrazione; nessuna migrazione parziale.');
    }

    const nonReclutabili = modello.ombre.filter((o) => o.personaId === null).length;
    const conteggi = {
      righeBattaglia: righe.length, ombre: modello.ombre.length, nonReclutabili, abbinateAlCompendio: modello.ombre.length - nonReclutabili,
      luoghi, luoghiSenzaRiferimento, vociDedalo: vociDedalo.length, vociPalazzo: vociPalazzo.length, vociCollegate: voci,
      personalita: Object.fromEntries(['giocosa', 'timida', 'irritabile', 'cupa', 'sconosciuta'].map((p) => [p, modello.ombre.filter((o) => o.personalita === p).length])),
    };
    db.prepare('INSERT OR REPLACE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run(CHIAVE_RAPPORTO, JSON.stringify({ versione: 1, conteggi, ...modello.elenco }));
    logger.info({ conteggi }, '[migration166] entità Ombra');
  },
};
