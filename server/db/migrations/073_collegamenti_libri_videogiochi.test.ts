// Test migrazione 073 — le librerie vendono libri collegati, ogni videogioco ha il suo articolo
import { closeDb, initDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from './index.js';
import { caricaPacchetto } from '../../services/pacchetto/pacchettoGioco.js';
import { chiaveArticoloVideogioco } from './073_collegamenti_libri_videogiochi.js';

afterEach(() => closeDb());

it('collega l’articolo di una libreria al libro omonimo, collega un videogioco già in vendita e crea quello che manca', () => {
  const db = initDb(':memory:');
  runMigrations(db, migrations.filter((m) => m.id < 73));
  db.exec(`INSERT INTO negozio (chiave, ordine, nome, tipo) VALUES ('hinokuniya', 1, 'Hinokuniya', 'oggetti'), ('super-baron', 2, 'Super Baron', 'regali'), ('yumenoshima', 3, 'Yumenoshima', 'materiali');
    INSERT INTO libro (chiave, ordine, nome) VALUES ('vague', 1, 'Vague');
    INSERT INTO articolo (chiave, negozio_chiave, ordine, nome, categoria, condizioni_json) VALUES ('hinokuniya/vague', 'hinokuniya', 1, 'Vague', 'altro', NULL), ('hinokuniya/segnalibro', 'hinokuniya', 2, 'Segnalibro', 'altro', NULL), ('super-baron/punch-ouch', 'super-baron', 1, 'Punch Ouch', 'regalo', '[{"tipo":"quartiere","quartiere":"akihabara"}]');
    INSERT INTO attivita (chiave, ordine, nome, tipo, costo, condizioni_json) VALUES ('videogioco-punch-ouch', 1, 'Punch Ouch', 'videogioco', 5300, '[{"tipo":"data","dal":"09-01"}]'), ('videogioco-star-forneus', 2, 'Star Forneus', 'videogioco', 0, '[{"tipo":"data","dal":"06-05"}]');`);
  runMigrations(db);
  expect(db.prepare("SELECT oggetto_fonte, oggetto_chiave, categoria FROM articolo WHERE chiave = 'hinokuniya/vague'").get()).toEqual({ oggetto_fonte: 'libri', oggetto_chiave: 'vague', categoria: 'libro' });
  expect(db.prepare("SELECT oggetto_fonte, categoria FROM articolo WHERE chiave = 'hinokuniya/segnalibro'").get()).toEqual({ oggetto_fonte: null, categoria: 'altro' });
  // l'articolo tiene la condizione che aveva (il quartiere, dal negozio) e riceve quella dell'attività
  expect(db.prepare("SELECT oggetto_fonte, oggetto_chiave, categoria, condizioni_json FROM articolo WHERE chiave = 'super-baron/punch-ouch'").get()).toEqual({ oggetto_fonte: 'videogiochi', oggetto_chiave: 'videogioco-punch-ouch', categoria: 'videogioco', condizioni_json: '[{"tipo":"quartiere","quartiere":"akihabara"},{"tipo":"data","dal":"09-01"}]' });
  expect(db.prepare('SELECT negozio_chiave, prezzo, categoria, oggetto_chiave, origine FROM articolo WHERE chiave = ?').get(chiaveArticoloVideogioco('videogioco-star-forneus'))).toEqual({ negozio_chiave: 'yumenoshima', prezzo: 0, categoria: 'videogioco', oggetto_chiave: 'videogioco-star-forneus', origine: 'seed' });
});

it('nel pacchetto trenta articoli sono libri e i sette videogiochi hanno un articolo, ciascuno nel suo negozio', () => {
  const db = initDb(':memory:');
  caricaPacchetto(db);
  expect(db.prepare("SELECT COUNT(*) FROM articolo WHERE oggetto_fonte = 'libri' AND categoria = 'libro' AND oggetto_chiave IN (SELECT chiave FROM libro)").pluck().get()).toBe(30);
  const videogiochi = db.prepare("SELECT chiave, negozio_chiave, prezzo, oggetto_chiave FROM articolo WHERE oggetto_fonte = 'videogiochi' ORDER BY chiave").all() as Array<{ chiave: string; negozio_chiave: string; prezzo: number; oggetto_chiave: string }>;
  expect(videogiochi.map((v) => v.chiave)).toEqual(['super-baron/featherman-seeker', 'super-baron/golfer-sarutahiko', 'super-baron/power-intuition', 'super-baron/punch-ouch', 'super-baron/train-of-life', 'yumenoshima/gambla-goemon', 'yumenoshima/star-forneus']);
  const attivita = new Map((db.prepare("SELECT chiave, costo FROM attivita WHERE tipo = 'videogioco'").all() as Array<{ chiave: string; costo: number }>).map((a) => [a.chiave, a.costo]));
  for (const v of videogiochi) { expect(attivita.has(v.oggetto_chiave), v.chiave).toBe(true); expect(v.prezzo, v.chiave).toBe(attivita.get(v.oggetto_chiave)); }
  // i cinque di Super Baron portano sia il quartiere (dal negozio) sia «dal 1 settembre» (dall'attività)
  for (const v of videogiochi.filter((x) => x.negozio_chiave === 'super-baron')) {
    const condizioni = JSON.parse(db.prepare('SELECT condizioni_json FROM articolo WHERE chiave = ?').pluck().get(v.chiave) as string) as unknown[];
    expect(condizioni, v.chiave).toContainEqual({ tipo: 'quartiere', quartiere: 'akihabara' });
    expect(condizioni, v.chiave).toContainEqual({ tipo: 'data', dal: '09-01' });
  }
});
