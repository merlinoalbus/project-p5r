// ============================================================
// Test esportaSeed — quel che l'utente corregge deve sopravvivere a un'installazione da zero
// ============================================================
//
// La prova che conta è una sola e vale tutto il pezzo: **esporto, installo da zero, e ritrovo
// tutto**. Non basta che il file esca formalmente giusto; deve reggere il viaggio di ritorno
// attraverso il caricatore, che è il momento in cui un dato si perde davvero — l'ha già fatto
// perdere una volta oggi, con la condizione dei videogiochi che il seed riscriveva.
// ============================================================

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { closeDb, initDb } from '../../db/dbService.js';
import { runMigrations } from '../../db/migrationRunner.js';
import { caricaSeed } from './caricaSeed.js';
import { esportaAttivitaSeed, esportaCruciverbaSeed, esportaDomandeSeed, esportaNegoziSeed } from './esportaSeed.js';
import type { AttivitaSeed, NegoziSeed } from '../../../shared/seed.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../../data/seed');

/** Un'installazione nuova, seminata con il file dei negozi che le passo. */
function installaDaZero(negozi: NegoziSeed): ReturnType<typeof initDb> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p5r-esporta-'));
  try {
    for (const f of fs.readdirSync(DIR_SEED)) if (f.endsWith('.json')) fs.copyFileSync(path.join(DIR_SEED, f), path.join(dir, f));
    fs.writeFileSync(path.join(dir, 'negozi.json'), JSON.stringify(negozi));
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, dir);
    return db;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('esportaNegoziSeed', () => {
  afterEach(() => closeDb());

  it('senza correzioni, l’esportazione è identica al file che c’è già', () => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    const attuale = JSON.parse(fs.readFileSync(path.join(DIR_SEED, 'negozi.json'), 'utf8')) as NegoziSeed;
    // Il file precedente si passa perché l'esportazione non butti via i campi che il database non
    // conosce: nel file dei negozi ce ne sono quattordici con un `nota` che nessuna tabella legge.
    expect(JSON.stringify(esportaNegoziSeed(attuale))).toBe(JSON.stringify(attuale));
  });

  it('porta nel seed quel che l’utente aggiunge, corregge o nasconde', () => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    const adesso = new Date().toISOString();

    // un negozio tutto suo, con un articolo dentro
    db.prepare(`INSERT INTO negozio (chiave, ordine, nome, luogo, luogo_chiave, tipo, gestore, confidente_chiave, orari, sblocco, note, fonte, origine, nascosto, updated_at)
      VALUES ('u-chiosco', 999, 'Chiosco di prova', 'Shibuya', 'shibuya', 'misto', NULL, NULL, 'sempre', NULL, 'aggiunto a mano', 'https://esempio.it', 'utente', 0, ?)`).run(adesso);
    db.prepare(`INSERT INTO articolo (chiave, negozio_chiave, ordine, nome, nome_it, categoria, per, prezzo, effetto, statistiche, disponibile_dal, condizione, nota, fonte, verificato, origine, nascosto, updated_at)
      VALUES ('u-chiosco/u-tè', 'u-chiosco', 1, 'Tè di prova', NULL, 'cibo', 'tutti', 300, 'disseta', NULL, NULL, NULL, NULL, 'https://esempio.it', 0, 'utente', 0, ?)`).run(adesso);

    // una correzione a una riga della guida: cambia il prezzo e passa a 'utente'
    const daCorreggere = db.prepare("SELECT chiave, prezzo FROM articolo WHERE origine = 'seed' AND prezzo IS NOT NULL ORDER BY chiave LIMIT 1").get() as { chiave: string; prezzo: number };
    db.prepare("UPDATE articolo SET prezzo = ?, origine = 'utente' WHERE chiave = ?").run(daCorreggere.prezzo + 111, daCorreggere.chiave);

    // e una riga della guida nascosta
    const daNascondere = db.prepare("SELECT chiave FROM articolo WHERE origine = 'seed' AND chiave <> ? ORDER BY chiave LIMIT 1").get(daCorreggere.chiave) as { chiave: string };
    db.prepare('UPDATE articolo SET nascosto = 1 WHERE chiave = ?').run(daNascondere.chiave);

    const esportato = esportaNegoziSeed(JSON.parse(fs.readFileSync(path.join(DIR_SEED, 'negozi.json'), 'utf8')) as NegoziSeed);
    closeDb();

    const nuovo = installaDaZero(esportato);
    const cerca = (chiave: string) => nuovo.prepare('SELECT chiave, prezzo, origine FROM articolo WHERE chiave = ?').get(chiave) as { chiave: string; prezzo: number; origine: string } | undefined;

    // il negozio aggiunto e il suo articolo ci sono, e adesso sono catalogo: `origine = 'seed'`
    expect(nuovo.prepare("SELECT nome, origine FROM negozio WHERE chiave = 'u-chiosco'").get()).toEqual({ nome: 'Chiosco di prova', origine: 'seed' });
    expect(cerca('u-chiosco/u-tè')).toMatchObject({ prezzo: 300, origine: 'seed' });

    // la correzione è diventata il dato di partenza
    expect(cerca(daCorreggere.chiave)?.prezzo).toBe(daCorreggere.prezzo + 111);

    // la riga nascosta non torna indietro da sola, che è il senso di averla nascosta
    expect(cerca(daNascondere.chiave)).toBeUndefined();
  });

  it('non perde una condizione che nessuna frase saprebbe dire', () => {
    // Il caso vero: `migraTestiCondizioni` legge la prosa, ma una condizione costruita nell'editor
    // può essere un gruppo «almeno una» che nessuna frase esprime. Senza il campo `condizioni` nel
    // seed, al reseed tornerebbe indietro trasformata — ed è un difetto che non si vede, perché il
    // negozio continua a funzionare: si comporta soltanto in un altro modo.
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    const gruppo = [{ tipo: 'gruppo', modo: 'almeno-una', condizioni: [{ tipo: 'data', dal: '04-18' }, { tipo: 'stato', chiave: 'videogioco-completato', confronto: 'almeno', valore: 1 }] }];
    const bersaglio = db.prepare("SELECT chiave FROM articolo WHERE origine = 'seed' ORDER BY chiave LIMIT 1").get() as { chiave: string };
    db.prepare("UPDATE articolo SET condizioni_json = ?, origine = 'utente' WHERE chiave = ?").run(JSON.stringify(gruppo), bersaglio.chiave);

    const esportato = esportaNegoziSeed(JSON.parse(fs.readFileSync(path.join(DIR_SEED, 'negozi.json'), 'utf8')) as NegoziSeed);
    const scritto = esportato.negozi.flatMap((n) => n.articoli).find((a) => a.chiave === bersaglio.chiave);
    expect(scritto?.condizioni).toEqual(gruppo);
    closeDb();

    const nuovo = installaDaZero(esportato);
    const riletto = nuovo.prepare('SELECT condizioni_json FROM articolo WHERE chiave = ?').get(bersaglio.chiave) as { condizioni_json: string };
    expect(JSON.parse(riletto.condizioni_json)).toEqual(gruppo);
  });
});

// ============================================================
// Attività, libri e film: lo stesso viaggio, e la stessa prova
// ============================================================
//
// L'esportazione riguardava i soli negozi, ed era metà del lavoro: le correzioni ai libri, ai film
// e alle attività restavano nel database di quell'istanza. La prova che conta è la stessa — quel
// che esce deve rientrare identico — con in più il tranello che ha fatto perdere mezz'ora: il file
// delle attività ha il rientro a **uno** spazio, `negozi.json` a due, e riscriverlo con l'altro
// cambia tutte e millenovecento le righe per una correzione che ne tocca una.
describe('esportaAttivitaSeed', () => {
  afterEach(() => closeDb());

  it('senza correzioni, l’esportazione è identica al file che c’è già', () => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    const attuale = JSON.parse(fs.readFileSync(path.join(DIR_SEED, 'attivita.json'), 'utf8')) as AttivitaSeed;
    expect(JSON.stringify(esportaAttivitaSeed(attuale))).toBe(JSON.stringify(attuale));
  });

  it('porta nel seed un videogioco aggiunto, con le sue Doti, e lascia fuori quel che è nascosto', () => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    const adesso = new Date().toISOString();
    db.prepare(`INSERT INTO attivita (chiave, ordine, nome, tipo, luogo, luogo_chiave, fascia, costo, sblocco, sessioni, doti_json, altri_effetti, regole, premi, paga, fonte, verificato, origine, nascosto, updated_at)
      VALUES ('u-gioco', 998, 'Gioco di prova', 'videogioco', 'Yongen-Jaya', NULL, 'sera', NULL, NULL, 3, ?, NULL, '', NULL, NULL, 'https://esempio.it', 0, 'utente', 0, ?)`)
      .run(JSON.stringify([{ dote: 'coraggio', note: 3, condizione: null }]), adesso);
    // Un libro della guida che l'utente ha deciso di non vedere: non deve tornare nel seed, o
    // ricomparirebbe da solo alla prossima installazione.
    db.prepare("UPDATE libro SET nascosto = 1 WHERE chiave = 'il-magnifico-ladro'").run();

    const seed = esportaAttivitaSeed();
    const gioco = seed.attivita.find((a) => a.chiave === 'u-gioco');
    expect(gioco?.doti, 'le Doti dichiarate viaggiano nel seed').toEqual([{ dote: 'coraggio', note: 3, condizione: null }]);
    expect(gioco?.sessioni, 'tre round, non il predefinito').toBe(3);
    expect(seed.libri.some((l) => l.chiave === 'il-magnifico-ladro'), 'la riga nascosta resta fuori').toBe(false);
  });
});

describe('esportaDomandeSeed e esportaCruciverbaSeed', () => {
  afterEach(() => closeDb());
  const apri = () => { const db = initDb(':memory:'); runMigrations(db); caricaSeed(db, DIR_SEED); return db; };
  const letto = (f: string) => JSON.parse(fs.readFileSync(path.join(DIR_SEED, f), 'utf8')) as Record<string, unknown>;

  it('senza correzioni l’esportazione è identica ai file che ci sono già', () => {
    apri();
    const domande = letto('domande.json');
    const cruciverba = letto('cruciverba.json');
    expect(JSON.stringify(esportaDomandeSeed(domande))).toBe(JSON.stringify(domande));
    expect(JSON.stringify(esportaCruciverbaSeed(cruciverba))).toBe(JSON.stringify(cruciverba));
  });

  it('porta nel seed la risposta corretta e lascia fuori quel che è nascosto', () => {
    const db = apri();
    // La risposta di una domanda della guida, corretta: è il caso per cui serve tutto questo.
    db.prepare("UPDATE domanda SET risposte_json = ?, origine = 'utente' WHERE chiave = '04-12'")
      .run(JSON.stringify([{ ordine: 1, testo: 'La risposta giusta davvero' }]));
    db.prepare("UPDATE cruciverba SET risposta = 'Trimestri', origine = 'utente' WHERE data = '04-18'").run();
    db.prepare("UPDATE domanda SET nascosto = 1 WHERE chiave = '04-19'").run();

    const domande = esportaDomandeSeed(letto('domande.json'));
    const lista = domande.domande as Array<Record<string, unknown>>;
    const corretta = lista.find((d) => d.data === '04-12');
    expect(corretta?.risposte).toEqual([{ ordine: 1, testo: 'La risposta giusta davvero' }]);
    expect(lista.some((d) => d.data === '04-19')).toBe(false);
    // Le altre due parti del file — esami e premi — restano dov'erano, non si rifanno dal database.
    expect(domande.esami).toBeDefined();
    expect(domande.premi).toBeDefined();

    const cruci = esportaCruciverbaSeed(letto('cruciverba.json'));
    expect((cruci.cruciverba as Array<Record<string, unknown>>).find((c) => c.data === '04-18')?.risposta).toBe('Trimestri');
  });
});
