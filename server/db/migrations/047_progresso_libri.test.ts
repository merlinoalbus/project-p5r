import { closeDb, initDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from './index.js';
import { migration047 } from './047_progresso_libri.js';

describe('migration047 progresso libri', () => {
  afterEach(() => closeDb());

  it('aggiorna un DB pre-047 e porta le vecchie spunte al totale del libro', () => {
    const db = initDb(':memory:');
    runMigrations(db, migrations.filter((m) => m.id < 47));
    db.prepare("INSERT INTO partita (id,nome,created_at,updated_at) VALUES (1,'Vecchia','ora','ora')").run();
    db.prepare(`INSERT INTO libro (chiave,ordine,nome,dove,sessioni,fonte) VALUES ('prova',1,'Prova','Biblioteca',2,'fonte')`).run();
    db.prepare(`INSERT INTO libro (chiave,ordine,nome,dove,sessioni,fonte) VALUES ('senza-totale',2,'Senza totale','Biblioteca',NULL,'fonte')`).run();
    db.prepare("INSERT INTO lettura_partita (partita_id,tipo,chiave,updated_at) VALUES (1,'libro','prova','prima')").run();
    db.prepare("INSERT INTO lettura_partita (partita_id,tipo,chiave,updated_at) VALUES (1,'libro','senza-totale','prima')").run();
    runMigrations(db, [migration047]);
    expect(db.pragma('user_version', { simple: true })).toBe(47);
    expect(db.prepare("SELECT avanzamento FROM progresso_libro_partita WHERE partita_id=1 AND libro_chiave='prova'").get()).toEqual({ avanzamento: 2 });
    expect(db.prepare("SELECT avanzamento FROM progresso_libro_partita WHERE partita_id=1 AND libro_chiave='senza-totale'").get()).toEqual({ avanzamento: 1 });
  });

  it('crea le tabelle anche su un database nuovo e applica la cascata della partita', () => {
    const db = initDb(':memory:');
    runMigrations(db);
    db.prepare("INSERT INTO partita (id,nome,created_at,updated_at) VALUES (1,'Nuova','ora','ora')").run();
    db.prepare("INSERT INTO progresso_libro_partita VALUES (1,'prova',1,'ora')").run();
    db.prepare('DELETE FROM partita WHERE id=1').run();
    expect(db.prepare('SELECT COUNT(*) n FROM progresso_libro_partita').get()).toEqual({ n: 0 });
  });
});
