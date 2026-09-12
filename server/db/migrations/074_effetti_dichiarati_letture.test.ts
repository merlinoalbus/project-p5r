// Test migrazione 074 — libri, film e attività dichiarano i loro effetti in un elenco solo
import { closeDb, initDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from './index.js';
import { caricaPacchetto } from '../../services/pacchetto/pacchettoGioco.js';
import { dotiDaEffetti, leggiVociEffetto } from '../../../shared/effettiCatalogo.js';

afterEach(() => closeDb());

const effetti = (db: ReturnType<typeof initDb>, tabella: string, chiave: string) => leggiVociEffetto(db.prepare(`SELECT effetti_json FROM ${tabella} WHERE chiave = ?`).pluck().get(chiave) as string);

it('converte dote+note, note successive, sblocca e le spiegazioni delle attività', () => {
  const db = initDb(':memory:');
  runMigrations(db, migrations.filter((m) => m.id < 74));
  db.exec(`INSERT INTO quartiere (chiave, ordine, nome) VALUES ('harajuku', 1, 'Harajuku');
    INSERT INTO libro (chiave, ordine, nome, dote, note, sblocca) VALUES ('a', 1, 'A', 'Conoscenza', 3, NULL), ('b', 2, 'B', NULL, NULL, 'Sblocca Takenoko Street (Harajuku)'), ('c', 3, 'C', NULL, NULL, 'Raddoppia la velocita di lettura');
    INSERT INTO film (chiave, ordine, nome, dove, dote, note, note_successive, sessioni) VALUES ('cinema-x', 1, 'X', 'cinema', 'coraggio', 3, 1, 2), ('dvd-y', 2, 'Y', 'dvd', 'fascino', 2, NULL, 2);
    INSERT INTO attivita (chiave, ordine, nome, tipo, doti_json) VALUES ('studio-leblanc', 1, 'Studio', 'studio', '[{"dote":"conoscenza","note":null,"condizione":"2 punti, 3 con la pioggia"}]'), ('gioco', 2, 'Gioco', 'videogioco', '[{"dote":"fascino","note":2,"condizione":"2 note per livello"},{"dote":null,"note":null,"condizione":"non confermato"}]');`);
  runMigrations(db);
  expect(effetti(db, 'libro', 'a')).toEqual([{ effetto: { famiglia: 'dote', dote: 'conoscenza', note: 3 } }]);
  expect(effetti(db, 'libro', 'b')).toEqual([{ effetto: { famiglia: 'sblocca-luogo', luogo: 'harajuku' } }]);
  expect(effetti(db, 'libro', 'c')).toEqual([{ effetto: { famiglia: 'descrittivo', testo: 'Raddoppia la velocita di lettura' } }]);
  expect(effetti(db, 'film', 'cinema-x')).toEqual([{ effetto: { famiglia: 'dote', dote: 'coraggio', note: 3 } }, { effetto: { famiglia: 'dote', dote: 'coraggio', note: 1 }, ripetuto: true }]);
  expect(db.prepare("SELECT sessioni FROM film WHERE chiave = 'cinema-x'").pluck().get()).toBe(1);
  expect(db.prepare("SELECT sessioni FROM film WHERE chiave = 'dvd-y'").pluck().get()).toBe(2);
  expect(dotiDaEffetti(effetti(db, 'film', 'cinema-x'))).toEqual([{ dote: 'coraggio', note: 3, condizioni: [] }]);
  expect(dotiDaEffetti(effetti(db, 'film', 'cinema-x'), { successiva: true })).toEqual([{ dote: 'coraggio', note: 1, condizioni: [] }]);
  expect(effetti(db, 'attivita', 'studio-leblanc')).toEqual([{ effetto: { famiglia: 'dote', dote: 'conoscenza', note: 2 }, condizioni: [{ tipo: 'meteo', condizione: 'non-piove' }] }, { effetto: { famiglia: 'dote', dote: 'conoscenza', note: 3 }, condizioni: [{ tipo: 'piove' }] }]);
  expect(effetti(db, 'attivita', 'gioco')).toEqual([{ effetto: { famiglia: 'dote', dote: 'fascino', note: 2 } }]);
});

it('nel pacchetto ogni libro e film con una Dote la dichiara, i film al cinema durano una visione, nessuna chiave maiuscola', () => {
  const db = initDb(':memory:');
  caricaPacchetto(db);
  for (const t of ['libro', 'film']) {
    const righe = db.prepare(`SELECT chiave, dote, note, effetti_json FROM ${t}`).all() as Array<{ chiave: string; dote: string | null; note: number | null; effetti_json: string }>;
    for (const r of righe) {
      const voci = leggiVociEffetto(r.effetti_json);
      if (r.dote && r.note) expect(dotiDaEffetti(voci)[0], `${t}/${r.chiave}`).toMatchObject({ dote: r.dote.toLowerCase(), note: r.note });
      for (const v of voci) if (v.effetto.famiglia === 'dote') expect(v.effetto.dote).toBe(v.effetto.dote.toLowerCase());
    }
  }
  expect(db.prepare("SELECT COUNT(*) FROM film WHERE dove = 'cinema' AND sessioni <> 1").pluck().get()).toBe(0);
  expect(db.prepare("SELECT COUNT(*) FROM film WHERE note_successive IS NOT NULL AND effetti_json NOT LIKE '%\"ripetuto\":true%'").pluck().get()).toBe(0);
  expect(effetti(db, 'libro', 'vague')).toEqual([{ effetto: { famiglia: 'sblocca-luogo', luogo: 'harajuku' } }]);
  expect(effetti(db, 'attivita', 'studio-diner-shibuya')).toHaveLength(2);
  expect(db.prepare("SELECT COUNT(*) FROM attivita WHERE tipo = 'videogioco' AND effetti_json = '[]'").pluck().get()).toBe(0);
});
