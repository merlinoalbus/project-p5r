// ============================================================
// Test caricaSeed — caricamento reale di data/seed in un DB in memoria
// ============================================================

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { closeDb, initDb } from '../../db/dbService.js';
import { runMigrations } from '../../db/migrationRunner.js';
import { caricaSeed } from './caricaSeed.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../../data/seed');

function n(sql: string): number {
  return (initDb(':memory:').prepare(sql).get() as { n: number }).n;
}

describe('caricaSeed', () => {
  beforeEach(() => {
    const db = initDb(':memory:');
    runMigrations(db);
  });
  afterEach(() => closeDb());

  it('carica il compendio completo e la seconda esecuzione è un no-op', () => {
    const db = initDb(':memory:');
    const esito = caricaSeed(db, DIR_SEED);
    expect(esito.caricato).toBe(true);
    expect(esito.conteggi).toMatchObject({ persona: 232, skill: 525, oggetti: 223, confidenti: 23 });
    expect(n('SELECT COUNT(*) AS n FROM arcana')).toBe(24);
    expect(n('SELECT COUNT(*) AS n FROM persona_affinita')).toBe(232 * 10);
    expect(n('SELECT COUNT(*) AS n FROM fusione_arcana')).toBe(273);
    expect(n('SELECT COUNT(*) AS n FROM fusione_speciale')).toBe(24);
    expect(n('SELECT COUNT(*) AS n FROM tesoro')).toBe(9);
    expect(n('SELECT COUNT(*) AS n FROM tesoro_modificatore')).toBe(9 * 24);
    expect(n('SELECT COUNT(*) AS n FROM eredita_matrice')).toBe(12 * 12);
    expect(n('SELECT COUNT(*) AS n FROM dlc_set')).toBe(13);
    expect(n('SELECT COUNT(*) AS n FROM dote_sociale')).toBe(5);
    expect(n('SELECT COUNT(*) AS n FROM dote_sociale_rango')).toBe(25);
    expect(n('SELECT COUNT(*) AS n FROM confidente_rango')).toBe(18 * 9);
    expect(n("SELECT COUNT(*) AS n FROM traduzione WHERE ambito = 'rangoDote'")).toBe(25);
    expect((db.prepare("SELECT punti_necessari AS p FROM confidente_rango WHERE confidente_chiave = 'ryuji' AND rango = 2").get() as { p: number }).p).toBe(20);
    expect(n("SELECT COUNT(*) AS n FROM traduzione WHERE ambito = 'effettoSkill'")).toBe(512);
    expect(n("SELECT COUNT(*) AS n FROM traduzione WHERE ambito = 'descrizioneOggetto'")).toBe(223);
    expect(n("SELECT COUNT(*) AS n FROM traduzione WHERE ambito = 'negoziazione'")).toBe(120);
    expect(n("SELECT COUNT(*) AS n FROM traduzione WHERE ambito = 'fonteCarta'")).toBe(49);
    // ogni skill delle Persona esiste (vincolo FK) e i tratti sono skill di tipo trait
    expect(n("SELECT COUNT(*) AS n FROM persona p WHERE NOT EXISTS (SELECT 1 FROM skill s WHERE s.nome = p.tratto AND s.elemento = 'trait')")).toBe(0);

    const secondo = caricaSeed(db, DIR_SEED);
    expect(secondo.caricato).toBe(false);
    expect(secondo.hash).toBe(esito.hash);
  });

  it('un reseed forzato mantiene gli id e non sovrascrive le traduzioni dell’utente', () => {
    const db = initDb(':memory:');
    caricaSeed(db, DIR_SEED);
    const prima = db.prepare("SELECT id FROM persona WHERE nome = 'Jack Frost'").get() as { id: number };
    const skillPrima = db.prepare("SELECT id FROM skill WHERE nome = 'Bufu'").get() as { id: number };
    db.prepare("UPDATE traduzione SET testo = 'Il Folle', fonte = 'utente' WHERE ambito = 'arcana' AND chiave = 'Fool'").run();
    db.prepare("UPDATE traduzione SET testo = 'testo modificato dal seed?' WHERE ambito = 'arcana' AND chiave = 'Magician'").run();

    const esito = caricaSeed(db, DIR_SEED, true);
    expect(esito.caricato).toBe(true);
    const dopo = db.prepare("SELECT id FROM persona WHERE nome = 'Jack Frost'").get() as { id: number };
    const skillDopo = db.prepare("SELECT id FROM skill WHERE nome = 'Bufu'").get() as { id: number };
    expect(dopo.id).toBe(prima.id);
    expect(skillDopo.id).toBe(skillPrima.id);
    expect((db.prepare("SELECT testo FROM traduzione WHERE ambito = 'arcana' AND chiave = 'Fool'").get() as { testo: string }).testo).toBe('Il Folle');
    expect((db.prepare("SELECT testo FROM traduzione WHERE ambito = 'arcana' AND chiave = 'Magician'").get() as { testo: string }).testo).toBe('Mago');
    expect(n('SELECT COUNT(*) AS n FROM persona')).toBe(232);
    const seedPersone = JSON.parse(fs.readFileSync(path.join(DIR_SEED, 'persona.json'), 'utf-8')) as Array<{ skill: unknown[] }>;
    expect(n('SELECT COUNT(*) AS n FROM persona_skill')).toBe(seedPersone.reduce((tot, p) => tot + p.skill.length, 0));
  });

  it('i dati utente sopravvivono al reseed (FK stabili)', () => {
    const db = initDb(':memory:');
    caricaSeed(db, DIR_SEED);
    const adesso = new Date().toISOString();
    db.prepare("INSERT INTO partita (nome, attiva, created_at, updated_at) VALUES ('Prova', 1, ?, ?)").run(adesso, adesso);
    const jf = (db.prepare("SELECT id FROM persona WHERE nome = 'Jack Frost'").get() as { id: number }).id;
    const bufu = (db.prepare("SELECT id FROM skill WHERE nome = 'Bufu'").get() as { id: number }).id;
    db.prepare('INSERT INTO persona_posseduta (partita_id, persona_id, livello, created_at, updated_at) VALUES (1, ?, 12, ?, ?)').run(jf, adesso, adesso);
    db.prepare('INSERT INTO persona_posseduta_skill (posseduta_id, slot, skill_id) VALUES (1, 1, ?)').run(bufu);
    caricaSeed(db, DIR_SEED, true);
    const riga = db.prepare('SELECT p.nome, s.nome AS skill FROM persona_posseduta pp JOIN persona p ON p.id = pp.persona_id JOIN persona_posseduta_skill ps ON ps.posseduta_id = pp.id JOIN skill s ON s.id = ps.skill_id').get() as { nome: string; skill: string };
    expect(riga).toEqual({ nome: 'Jack Frost', skill: 'Bufu' });
  });

  it('carica la localizzazione italiana (skill, Persona, termini) negli ambiti dedicati', () => {
    // Copia del seed con una localizzazione di prova iniettata in traduzioni.json
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p5r-seed-loc-'));
    try {
      for (const f of fs.readdirSync(DIR_SEED)) if (f.endsWith('.json')) fs.copyFileSync(path.join(DIR_SEED, f), path.join(dir, f));
      const tr = JSON.parse(fs.readFileSync(path.join(dir, 'traduzioni.json'), 'utf-8')) as Record<string, unknown>;
      tr.skill = { ...(tr.skill as Record<string, string>), Cleave: 'Fendente di prova' };
      tr.persone = { ...(tr.persone as Record<string, string>), 'Jack Frost': 'Jack Frost (prova)' };
      tr.termini = [...(tr.termini as unknown[]), { chiave: 'Baton Pass', nome: 'Passaggio di prova', categoria: 'battaglia', definizione: 'Passa il turno a un alleato.', fonte: 'https://esempio.it' }];
      fs.writeFileSync(path.join(dir, 'traduzioni.json'), JSON.stringify(tr));
      const db = initDb(':memory:');
      const esito = caricaSeed(db, dir);
      expect(esito.caricato).toBe(true);
      expect((db.prepare("SELECT testo FROM traduzione WHERE ambito = 'skill' AND chiave = 'Cleave'").get() as { testo: string }).testo).toBe('Fendente di prova');
      expect((db.prepare("SELECT testo FROM traduzione WHERE ambito = 'persona' AND chiave = 'Jack Frost'").get() as { testo: string }).testo).toBe('Jack Frost (prova)');
      const termine = db.prepare("SELECT testo, extra_json FROM traduzione WHERE ambito = 'termine' AND chiave = 'Baton Pass'").get() as { testo: string; extra_json: string };
      expect(termine.testo).toBe('Passaggio di prova');
      expect(JSON.parse(termine.extra_json)).toMatchObject({ categoria: 'battaglia', definizione: 'Passa il turno a un alleato.' });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fallisce con un errore chiaro se manca un file del seed', () => {
    const db = initDb(':memory:');
    expect(() => caricaSeed(db, path.join(DIR_SEED, 'inesistente'))).toThrow(/file del seed mancante/);
  });
});
