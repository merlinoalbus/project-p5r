// ============================================================
// Test utente 004 — le righe manuali degli eventi «entra in squadra» vanno via; le altre restano
// ============================================================

import { closeDb, initDb, prepared } from '../dbService.js';
import { utente004 } from './004_eventi_calcolati.js';
import { caricaPacchetto } from '../../services/pacchetto/pacchettoGioco.js';
import { creaPartita } from '../../services/partiteService.js';

afterEach(() => closeDb());

it('cancella le righe manuali dei quattro eventi calcolati e lascia gli altri', () => {
  const db = initDb(':memory:');
  caricaPacchetto(db);
  const id = creaPartita({ nome: 'P' }).id;
  for (const e of ['evento-makoto', 'evento-akechi', 'mansarda-pulita']) prepared('INSERT INTO evento_storia_partita (partita_id, evento_chiave, avvenuto, updated_at) VALUES (?, ?, 1, ?)').run(id, e, 't');
  utente004.up(db);
  expect((prepared('SELECT evento_chiave FROM evento_storia_partita ORDER BY evento_chiave').all() as Array<{ evento_chiave: string }>).map((r) => r.evento_chiave)).toEqual(['mansarda-pulita']);
  // idempotente
  utente004.up(db);
  expect((prepared('SELECT COUNT(*) AS n FROM evento_storia_partita').get() as { n: number }).n).toBe(1);
});
