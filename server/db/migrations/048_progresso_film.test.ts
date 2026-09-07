import { closeDb, initDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from './index.js';
import { migration048 } from './048_progresso_film.js';

function preparaFilm(): void {
  const db = initDb(':memory:');
  runMigrations(db, migrations.filter((m) => m.id < 48));
  db.prepare("INSERT INTO partita (id,nome,created_at,updated_at) VALUES (1,'Vecchia','ora','ora')").run();
  db.prepare("INSERT INTO film (chiave,ordine,nome,dove,periodo,fonte) VALUES ('cinema-le-sedici-domande',1,'Le sedici domande','cinema','Aprile','fonte')").run();
  db.prepare("INSERT INTO film (chiave,ordine,nome,dove,periodo,fonte) VALUES ('cinema-tanktop-millionaire',2,'Tanktop','cinema','Aprile','fonte')").run();
  db.prepare("INSERT INTO film (chiave,ordine,nome,dove,periodo,fonte) VALUES ('cinema-l-amore-chissa',3,'L amore chissà','cinema','Luglio','fonte')").run();
  db.prepare("INSERT INTO film (chiave,ordine,nome,dove,periodo,fonte) VALUES ('cinema-love-possibly',4,'Love Possibly','cinema','Luglio','fonte')").run();
  db.prepare("INSERT INTO film (chiave,ordine,nome,dove,periodo,fonte) VALUES ('cinema-altro',5,'Altro','cinema','Agosto','fonte')").run();
  db.prepare("INSERT INTO film (chiave,ordine,nome,dove,periodo,fonte) VALUES ('dvd-prova',6,'DVD','dvd','Iniziale','fonte')").run();
  db.prepare("INSERT INTO libro (chiave,ordine,nome,dove,sessioni,fonte) VALUES ('libro-prova',1,'Libro','Biblioteca',2,'fonte')").run();
}

function preparaArticolo(origine: 'seed' | 'utente', condizioni = '[{"tipo":"data","data":"04-01"}]'): void {
  const db = initDb();
  db.prepare("INSERT INTO quartiere (chiave,ordine,nome) VALUES ('shinjuku',1,'Shinjuku')").run();
  db.prepare("INSERT INTO negozio (chiave,ordine,nome,luogo,tipo,origine) VALUES ('hinokuniya',1,'Hinokuniya','Shinjuku','libri',?)").run(origine);
  db.prepare("INSERT INTO articolo (chiave,negozio_chiave,ordine,nome,categoria,origine,condizioni_json) VALUES ('hinokuniya/anima-da-cineasta','hinokuniya',1,'Anima da cineasta','altro',?,?)").run(origine, condizioni);
}

describe('migration048 progresso film', () => {
  afterEach(() => closeDb());

  it('migra un alias-only alla chiave canonica e conserva il timestamp', () => {
    preparaFilm();
    const db = initDb();
    db.prepare("INSERT INTO lettura_partita VALUES (1,'film','cinema-tanktop-millionaire','2026-01-01T10:00:00.000Z')").run();
    runMigrations(db, [migration048]);
    expect(db.prepare("SELECT chiave,updated_at FROM lettura_partita WHERE partita_id=1 AND tipo='film'").all()).toEqual([
      { chiave: 'cinema-le-sedici-domande', updated_at: '2026-01-01T10:00:00.000Z' },
    ]);
    expect(db.prepare("SELECT film_chiave,avanzamento FROM progresso_film_partita WHERE partita_id=1").all()).toEqual([
      { film_chiave: 'cinema-le-sedici-domande', avanzamento: 1 },
    ]);
  });

  it('unisce alias e canonica scegliendo deterministicamente il timestamp più recente', () => {
    preparaFilm();
    const db = initDb();
    db.prepare("INSERT INTO lettura_partita VALUES (1,'film','cinema-le-sedici-domande','2026-01-01T09:00:00.000Z')").run();
    db.prepare("INSERT INTO lettura_partita VALUES (1,'film','cinema-tanktop-millionaire','2026-01-01T11:00:00.000Z')").run();
    runMigrations(db, [migration048]);
    expect(db.prepare("SELECT chiave,updated_at FROM lettura_partita WHERE partita_id=1 AND tipo='film'").all()).toEqual([
      { chiave: 'cinema-le-sedici-domande', updated_at: '2026-01-01T11:00:00.000Z' },
    ]);
  });

  it('unisce anche la seconda coppia alias e preserva libri, altri film e storico alla lettera', () => {
    preparaFilm();
    const db = initDb();
    db.prepare("INSERT INTO lettura_partita VALUES (1,'film','cinema-love-possibly','2026-01-02T11:00:00.000Z')").run();
    db.prepare("INSERT INTO lettura_partita VALUES (1,'film','cinema-l-amore-chissa','2026-01-02T09:00:00.000Z')").run();
    db.prepare("INSERT INTO lettura_partita VALUES (1,'film','cinema-altro','altro-film')").run();
    db.prepare("INSERT INTO lettura_partita VALUES (1,'libro','libro-prova','libro')").run();
    const storico = JSON.stringify({ tipo: 'film', chiave: 'cinema-love-possibly' });
    db.prepare("INSERT INTO evento_partita (partita_id,tipo,titolo,dettaglio,dati_json,created_at) VALUES (1,'lettura','Film visto','',?,'ieri')").run(storico);
    runMigrations(db, [migration048]);
    expect(db.prepare("SELECT tipo,chiave,updated_at FROM lettura_partita WHERE partita_id=1 ORDER BY tipo,chiave").all()).toEqual([
      { tipo: 'film', chiave: 'cinema-altro', updated_at: 'altro-film' },
      { tipo: 'film', chiave: 'cinema-l-amore-chissa', updated_at: '2026-01-02T11:00:00.000Z' },
      { tipo: 'libro', chiave: 'libro-prova', updated_at: 'libro' },
    ]);
    expect(db.prepare('SELECT dati_json FROM evento_partita WHERE partita_id=1').get()).toEqual({ dati_json: storico });
  });

  it('porta le vecchie spunte DVD a due sessioni e applica la cascata della partita', () => {
    preparaFilm();
    const db = initDb();
    db.prepare("INSERT INTO lettura_partita VALUES (1,'film','dvd-prova','ora')").run();
    runMigrations(db, [migration048]);
    expect(db.prepare("SELECT sessioni FROM film WHERE chiave='dvd-prova'").get()).toEqual({ sessioni: 2 });
    expect(db.prepare("SELECT avanzamento FROM progresso_film_partita WHERE partita_id=1 AND film_chiave='dvd-prova'").get()).toEqual({ avanzamento: 2 });
    db.prepare('DELETE FROM partita WHERE id=1').run();
    expect(db.prepare('SELECT COUNT(*) n FROM progresso_film_partita').get()).toEqual({ n: 0 });
  });

  it('rifiuta progressi nulli o negativi e applica le cascade alla cancellazione del film', () => {
    preparaFilm();
    const db = initDb();
    runMigrations(db, [migration048]);
    expect(() => db.prepare("INSERT INTO progresso_film_partita VALUES (1,'dvd-prova',0,'ora')").run()).toThrow();
    expect(() => db.prepare("INSERT INTO progresso_film_partita VALUES (1,'dvd-prova',-1,'ora')").run()).toThrow();
    db.prepare("INSERT INTO progresso_film_partita VALUES (1,'dvd-prova',1,'ora')").run();
    db.prepare("INSERT INTO film_posizione VALUES ('dvd-prova',0,'luogo','yongen-jaya/leblanc','Leblanc','visione')").run();
    db.prepare("DELETE FROM film WHERE chiave='dvd-prova'").run();
    expect(db.prepare('SELECT COUNT(*) n FROM progresso_film_partita').get()).toEqual({ n: 0 });
    expect(db.prepare('SELECT COUNT(*) n FROM film_posizione').get()).toEqual({ n: 0 });
  });

  it('vincola tipi, ruoli e chiave primaria delle posizioni', () => {
    preparaFilm();
    const db = initDb();
    runMigrations(db, [migration048]);
    const ins = db.prepare('INSERT INTO film_posizione VALUES (?,?,?,?,?,?)');
    expect(() => ins.run('dvd-prova', 0, 'sconosciuto', 'x', 'X', 'visione')).toThrow();
    expect(() => ins.run('dvd-prova', 0, 'luogo', 'x', 'X', 'sconosciuto')).toThrow();
    ins.run('dvd-prova', 0, 'luogo', 'yongen-jaya/leblanc', 'Leblanc', 'visione');
    expect(() => ins.run('dvd-prova', 0, 'luogo', 'shibuya/scarlet', 'Scarlet', 'noleggio')).toThrow();
  });

  it('materializza la condizione di Anima da cineasta per il catalogo seed già esistente', () => {
    preparaFilm();
    preparaArticolo('seed');
    const db = initDb();
    runMigrations(db, [migration048]);
    expect(db.prepare("SELECT condizioni_json FROM articolo WHERE chiave='hinokuniya/anima-da-cineasta'").get()).toEqual({
      condizioni_json: '[{"tipo":"stato","chiave":"visione-film-dvd-completata","confronto":"almeno","valore":1}]',
    });
  });

  it('non modifica una voce Anima da cineasta di origine utente', () => {
    preparaFilm();
    const precedente = '[{"tipo":"data","data":"04-01"}]';
    preparaArticolo('utente', precedente);
    const db = initDb();
    runMigrations(db, [migration048]);
    expect(db.prepare("SELECT condizioni_json FROM articolo WHERE chiave='hinokuniya/anima-da-cineasta'").get()).toEqual({ condizioni_json: precedente });
  });
});
