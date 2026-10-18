// ============================================================
// Test 106 — le mappe con un'immagine caricata e senza ruolo diventano piante (città e quartieri illustrazioni); il resto no
// ============================================================

import { closeDb, initDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from './index.js';

afterEach(() => closeDb());

it('solo le mappe con immagine e ruolo «nessuna» cambiano; stemmi, ruoli già dati e mappe senza immagine restano', () => {
  const db = initDb(':memory:');
  runMigrations(db, migrations.filter((m) => m.id < 106));
  const mappa = (chiave: string, tipo: string, ruolo: string, immagine: string | null) =>
    db.prepare("INSERT INTO mappa (chiave, nome, tipo, genitore_chiave, ordine, immagine_chiave, origine, note, updated_at, ruolo_immagine) VALUES (?, ?, ?, NULL, 0, ?, 'utente', '', 'x', ?)").run(chiave, chiave, tipo, immagine, ruolo);
  mappa('pianta-caricata', 'area', 'nessuna', 'pianta-caricata');
  mappa('quartiere-caricato', 'quartiere', 'nessuna', 'quartiere-caricato');
  mappa('pianta-vuota', 'area', 'nessuna', null);
  mappa('stemma', 'palazzo', 'emblema', 'stemma');
  mappa('illustrata', 'area', 'illustrazione-editoriale', 'illustrata');
  runMigrations(db);
  const ruoli = Object.fromEntries((db.prepare("SELECT chiave, ruolo_immagine FROM mappa WHERE chiave IN ('pianta-caricata', 'quartiere-caricato', 'pianta-vuota', 'stemma', 'illustrata')").all() as Array<{ chiave: string; ruolo_immagine: string }>).map((r) => [r.chiave, r.ruolo_immagine]));
  expect(ruoli).toEqual({ 'pianta-caricata': 'planimetria-nativa', 'quartiere-caricato': 'illustrazione-editoriale', 'pianta-vuota': 'nessuna', stemma: 'emblema', illustrata: 'illustrazione-editoriale' });
});
