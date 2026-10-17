// ============================================================
// Test 105 — la guida del quiz delle attività: la colonna nasce, il Triple Seven ha il suo quiz anche nell'istantanea di una
// riga corretta, il lavoro dell'utente non si tocca, una seconda passata non cambia niente
// ============================================================

import { closeDb, initDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from './index.js';
import { QUIZ_TRIPLE_SEVEN, migration105 } from './105_quiz_delle_attivita.js';
import { normalizzaQuiz } from '../../../shared/quizAttivita.js';

afterEach(() => closeDb());

/** Inserisce un'attività minima con la chiave data e, se indicata, l'istantanea della guida. */
function attivita(db: ReturnType<typeof initDb>, chiave: string, seed: string | null = null, origine = 'seed'): void {
  db.prepare("INSERT INTO attivita (chiave, ordine, nome, tipo, luogo, doti_json, regole, fonte, verificato, origine, seed_json) VALUES (?, 1, ?, 'lavoro', 'Shibuya', '[]', '', 'guida', 1, ?, ?)").run(chiave, chiave, origine, seed);
}

it('nasce quiz_json; il Triple Seven ha il quiz, gli altri no; il quiz è già nella forma normalizzata', () => {
  const db = initDb(':memory:');
  runMigrations(db, migrations.filter((m) => m.id < 105));
  attivita(db, 'lavoro-triple-seven');
  attivita(db, 'lavoro-rafflesia');
  runMigrations(db);
  expect(db.pragma('user_version', { simple: true })).toBe(migrations[migrations.length - 1].id);
  expect(JSON.parse(db.prepare("SELECT quiz_json FROM attivita WHERE chiave = 'lavoro-triple-seven'").pluck().get() as string)).toEqual(QUIZ_TRIPLE_SEVEN);
  expect(db.prepare("SELECT quiz_json FROM attivita WHERE chiave = 'lavoro-rafflesia'").pluck().get()).toBeNull();
  expect(normalizzaQuiz(QUIZ_TRIPLE_SEVEN)).toEqual(QUIZ_TRIPLE_SEVEN);
  // ogni prodotto ha la sua risposta, nessun nome ripetuto
  expect(new Set(QUIZ_TRIPLE_SEVEN.voci.map((v) => v.oggetto)).size).toBe(12);
});

it('le risposte seguono la tabella incollata dall\'utente, voce per voce; i due abbinamenti incerti lo dicono', () => {
  // nome della lista dell'utente (quello dell'oggetto quando coincide) → posizione, come nella tabella del 2026-10-17
  const perNomeDellaLista = Object.fromEntries(QUIZ_TRIPLE_SEVEN.voci.map((v) => [v.nota ? v.oggetto : (v.altroNome ?? v.oggetto), v.risposta]));
  expect(perNomeDellaLista).toEqual({
    'Black Donut': 'Vicino alla descrizione dello zucchero di canna', // Near the brown sugar description.
    'Boy Chance': 'Sul retro, sul logo dell’azienda', // Back of the company logo.
    'BW Panda Pan': 'Vicino alla coda', // Near the tail.
    'Cow Milk': 'Accanto al logo dell’azienda', // Next to the company logo.
    'Edo Rice Ball': 'Sul retro', // Behind.
    'Horse Racing Newspaper': 'Sul retro, vicino alla sezione dei commenti', // On the back, by the comments section.
    'India Ink': 'Sul lato destro, guardandolo di fronte', // Right side, when viewed from the front.
    'Skeleton Umbrella': 'Dietro il manico', // Behind the handle.
    'Super Duper Vanilla Cup': 'Accanto all’illustrazione del personaggio', // Side of the character illustration.
    'Tiger Pattern Pants': 'Sull’etichetta cucita all’interno', // On the tag lining.
    'Tokyo Food Tour': 'Sul retro della copertina', // On the back cover.
    'Zebra Ramen': 'Vicino alle informazioni sulla zebra', // Next to the zebra info.
  });
  const incerte = QUIZ_TRIPLE_SEVEN.voci.filter((v) => v.nota !== null);
  expect(incerte.map((v) => v.oggetto)).toEqual(['Boy Chance', 'Tokyo Food Tour']);
  for (const v of incerte) {
    expect(v.altroNome).toBe('Black Box o Shonen Trip');
    expect(v.nota).toMatch(/^Abbinamento incerto/);
  }
});

it('una riga corretta dall\'utente: il quiz va nella riga e nell\'istantanea; un quiz già scritto dall\'utente resta; ripetere non cambia niente', () => {
  const db = initDb(':memory:');
  runMigrations(db, migrations.filter((m) => m.id < 105));
  attivita(db, 'lavoro-triple-seven', JSON.stringify({ nome: 'Commesso al Triple Seven', tipo: 'lavoro' }), 'utente');
  runMigrations(db);
  const r = db.prepare("SELECT quiz_json, seed_json FROM attivita WHERE chiave = 'lavoro-triple-seven'").get() as { quiz_json: string; seed_json: string };
  expect(JSON.parse(r.quiz_json)).toEqual(QUIZ_TRIPLE_SEVEN);
  expect(JSON.parse(JSON.parse(r.seed_json).quiz_json as string)).toEqual(QUIZ_TRIPLE_SEVEN);
  expect(JSON.parse(r.seed_json).nome).toBe('Commesso al Triple Seven');
  // un quiz dell'utente non si sovrascrive, e una seconda passata non tocca nulla
  db.prepare("UPDATE attivita SET quiz_json = '{\"giorni\":[7],\"spiegazione\":\"\",\"domanda\":\"mio\",\"voci\":[],\"esiti\":[]}' WHERE chiave = 'lavoro-triple-seven'").run();
  const prima = db.prepare('SELECT * FROM attivita').all();
  migration105.up(db);
  expect(db.prepare('SELECT * FROM attivita').all()).toEqual(prima);
});

it('un\'istantanea illeggibile resta com\'era', () => {
  const db = initDb(':memory:');
  runMigrations(db, migrations.filter((m) => m.id < 105));
  attivita(db, 'lavoro-triple-seven', '{rotto', 'utente');
  runMigrations(db);
  expect(db.prepare("SELECT seed_json FROM attivita WHERE chiave = 'lavoro-triple-seven'").pluck().get()).toBe('{rotto');
  expect(db.prepare("SELECT quiz_json IS NOT NULL FROM attivita WHERE chiave = 'lavoro-triple-seven'").pluck().get()).toBe(1);
});
