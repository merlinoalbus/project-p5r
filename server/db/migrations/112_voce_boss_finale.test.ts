// ============================================================
// Test 112 — la voce del boss finale di ogni Palazzo (L4 §8.14, G-027)
// ============================================================

import { closeDb, prepared } from '../dbService.js';
import { migration112, VOCI_BOSS_FINALE } from './112_voce_boss_finale.js';
import { dbDiProva } from '../../../test/dbDiProva.js';

afterEach(() => closeDb());

const voci = () => Object.fromEntries((prepared('SELECT chiave, voce_boss_finale FROM dungeon ORDER BY chiave').all() as Array<{ chiave: string; voce_boss_finale: string | null }>).map((r) => [r.chiave, r.voce_boss_finale]));

it('imposta le voci di G-027 che ci sono; quelle che il pacchetto non ha restano NULL; Iweleth e i Memento senza voce', () => {
  dbDiProva();
  const v = voci();
  // il pacchetto dei test è di prima delle voci dell'utente di Kamoshida e Madarame
  expect([v.kamoshida, v.madarame, v.iweleth, v.mementos]).toEqual([null, null, null, null]);
  for (const p of ['kaneshiro', 'futaba', 'okumura', 'niijima', 'shido', 'maruki']) expect(v[p]).toBe(VOCI_BOSS_FINALE[p]);
  expect(prepared('SELECT COUNT(*) FROM dungeon WHERE seed_json IS NOT NULL').pluck().get()).toBe(0);
});

it('idempotente: una voce già impostata (dall’utente o da un giro di prima) non si tocca', () => {
  const db = dbDiProva();
  const altra = prepared("SELECT p.chiave FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave WHERE a.dungeon_chiave = 'shido' AND p.tipo = 'boss' AND p.chiave <> ? LIMIT 1").pluck().get(VOCI_BOSS_FINALE.shido) as string;
  prepared("UPDATE dungeon SET voce_boss_finale = ? WHERE chiave = 'shido'").run(altra);
  const prima = voci();
  migration112.up(db);
  expect(voci()).toEqual(prima);
});

it('si ferma con un errore leggibile se una voce di G-027 non è una voce «Boss» del suo Palazzo', () => {
  const db = dbDiProva();
  prepared("UPDATE dungeon SET voce_boss_finale = NULL WHERE chiave = 'kaneshiro'").run();
  prepared("UPDATE punto_interesse SET tipo = 'forziere' WHERE chiave = ?").run(VOCI_BOSS_FINALE.kaneshiro);
  expect(() => migration112.up(db)).toThrow(/kaneshiro .*non è una voce «boss»/);
});
