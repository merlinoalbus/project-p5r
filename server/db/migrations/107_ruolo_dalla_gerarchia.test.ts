// ============================================================
// Test 107 — il ruolo dell'immagine di ogni mappa dedotto dalla gerarchia (L1, 2026-10-20)
// ============================================================

import { closeDb, initDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from './index.js';

afterEach(() => closeDb());

it('radici dei Palazzi e dei Memento stemmi; città e quartieri con immagine illustrazioni; le altre con immagine planimetrie; senza immagine «nessuna»', () => {
  const db = initDb(':memory:');
  runMigrations(db, migrations.filter((m) => m.id < 107));
  const mappa = (chiave: string, tipo: string, genitore: string | null, ruolo: string, immagine: string | null, asset: string | null) =>
    db.prepare("INSERT INTO mappa (chiave, nome, tipo, genitore_chiave, ordine, immagine_chiave, asset, origine, note, updated_at, ruolo_immagine) VALUES (?, ?, ?, ?, 0, ?, ?, 'utente', '', 'x', ?)").run(chiave, chiave, tipo, genitore, immagine, asset, ruolo);
  const immagine = (ambito: string, chiave: string) =>
    db.prepare("INSERT INTO immagine (ambito, chiave, nome_file, mime, byte, created_at, contenuto) VALUES (?, ?, 'f.png', 'image/png', 1, 'x', NULL)").run(ambito, chiave);
  immagine('mappa', 'p-radice'); immagine('palazzi', 'p'); immagine('mappe', 'native/x'); immagine('mappa', 'q-caricato');
  mappa('p-radice', 'palazzo', null, 'illustrazione-editoriale', 'p-radice', 'palazzi/p'); // radice con illustrazione caricata: resta stemma
  mappa('memento', 'dedalo', null, 'nessuna', null, null);
  mappa('q-caricato', 'quartiere', null, 'nessuna', 'q-caricato', null);
  mappa('q-vuoto', 'quartiere', null, 'illustrazione-editoriale', null, 'mappe/citta-assente');
  mappa('banchina', 'area', 'q-caricato', 'illustrazione-editoriale', null, 'mappe/native/x'); // il caso di Yongen-Jaya
  mappa('nuova', 'area', 'p-radice', 'planimetria-nativa', null, 'mappe/nuova'); // asset per convenzione che non esiste
  runMigrations(db);
  const ruoli = Object.fromEntries((db.prepare("SELECT chiave, ruolo_immagine FROM mappa WHERE chiave IN ('p-radice', 'memento', 'q-caricato', 'q-vuoto', 'banchina', 'nuova') ORDER BY chiave").all() as Array<{ chiave: string; ruolo_immagine: string }>).map((r) => [r.chiave, r.ruolo_immagine]));
  expect(ruoli).toEqual({ 'p-radice': 'emblema', memento: 'emblema', 'q-caricato': 'illustrazione-editoriale', 'q-vuoto': 'nessuna', banchina: 'planimetria-nativa', nuova: 'nessuna' });
});
