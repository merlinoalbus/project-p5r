// Test migrazione 068 — nessuna foglia «da-configurare» sopravvive, né nei dati né in una riga sintetica
import { closeDb, initDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from './index.js';
import { caricaPacchetto } from '../../services/pacchetto/pacchettoGioco.js';

afterEach(() => closeDb());

it('converte una foglia residua in uno stato della partita', () => {
  const db = initDb(':memory:');
  runMigrations(db, migrations.filter((m) => m.id < 68));
  db.exec(`INSERT INTO libro (chiave, ordine, nome, condizioni_json) VALUES ('prova', 1, 'Prova', '[{"tipo":"da-configurare","nota":"dal 18 aprile"}]')`);
  runMigrations(db);
  expect(JSON.parse(db.prepare("SELECT condizioni_json FROM libro WHERE chiave = 'prova'").pluck().get() as string)).toEqual([{ tipo: 'data', dal: '04-18' }]);
});

it('il pacchetto non contiene più «da-configurare» in nessuna tabella con condizioni', () => {
  const db = initDb(':memory:');
  caricaPacchetto(db);
  for (const t of ['attivita', 'libro', 'film', 'negozio', 'articolo', 'spillo', 'luogo']) {
    expect(db.prepare(`SELECT COUNT(*) FROM ${t} WHERE condizioni_json LIKE '%da-configurare%'`).pluck().get(), t).toBe(0);
  }
});
