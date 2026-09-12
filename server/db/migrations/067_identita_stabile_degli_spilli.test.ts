// ============================================================
// Test migrazione 067 — l'uid di uno spillo è deterministico: stesso spillo, stesso uid in ogni file
// ============================================================

import Database from 'better-sqlite3';
import { closeDb, getDb, initDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from './index.js';
import { caricaPacchetto } from '../../services/pacchetto/pacchettoGioco.js';
import { creaSpillo, eliminaSpillo, esportaMappe, impostaRaccolto, importaMappe } from '../../services/mappe/mappeService.js';
import { assegnaUidMancanti, identitaSpillo, uidSpillo } from '../../services/mappe/identitaSpillo.js';
import { creaPartita } from '../../services/partiteService.js';

/** Un file di gioco fermo alla 066 con tre spilli (due con la stessa identità), senza uid. */
function fileAlla066(): Database.Database {
  const db = new Database(':memory:');
  db.prepare('ATTACH DATABASE ? AS utente').run(':memory:');
  runMigrations(db as never, migrations.filter((m) => m.id <= 66));
  db.exec(`INSERT INTO mappa (chiave, nome, tipo, ordine, updated_at) VALUES ('prova', 'Prova', 'quartiere', 1, '2026-01-01')`);
  const ins = db.prepare(`INSERT INTO spillo (mappa_chiave, tipo, nome, descrizione, x, y, collezionabile, ordine, origine, updated_at) VALUES ('prova', 'nota', ?, '', ?, ?, 0, 0, 'utente', '2026-01-01')`);
  ins.run('Uno', 10, 20);
  ins.run('Due', 30, 40);
  ins.run('Due', 30, 40);
  return db;
}

describe('067 — uid deterministico degli spilli', () => {
  it('due file discesi dagli stessi dati danno gli stessi uid, e i doppioni si distinguono in ordine di id', () => {
    const a = fileAlla066(); const b = fileAlla066();
    runMigrations(a as never); runMigrations(b as never);
    const uidA = (a.prepare('SELECT id, uid FROM spillo ORDER BY id').all() as Array<{ id: number; uid: string }>);
    const uidB = (b.prepare('SELECT id, uid FROM spillo ORDER BY id').all() as Array<{ id: number; uid: string }>);
    expect(uidA).toEqual(uidB);
    expect(new Set(uidA.map((r) => r.uid)).size).toBe(3);
    expect(uidA.every((r) => /^[0-9a-f]{32}$/.test(r.uid))).toBe(true);
    const identita = identitaSpillo({ mappa_chiave: 'prova', tipo: 'nota', nome: 'Due', x: 30, y: 40, riferimento_tipo: null, riferimento_chiave: null });
    expect(uidA[1].uid).toBe(uidSpillo(identita));
    expect(uidA[2].uid).toBe(uidSpillo(identita, 1));
    // nessun trigger casuale: un inserimento grezzo resta senza uid finché una regola non glielo assegna
    expect(a.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND name = 'spillo_uid_automatico'").get()).toBeUndefined();
    expect(a.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_spillo_uid'").get()).toBeTruthy();
    a.close(); b.close();
  });

  it('è idempotente e non tocca gli uid già assegnati', () => {
    const db = fileAlla066();
    runMigrations(db as never);
    const prima = db.prepare('SELECT uid FROM spillo ORDER BY id').all();
    expect(assegnaUidMancanti(db as never)).toBe(0);
    runMigrations(db as never);
    expect(db.prepare('SELECT uid FROM spillo ORDER BY id').all()).toEqual(prima);
    db.close();
  });
});

describe('uid nell\'applicazione', () => {
  beforeEach(() => { initDb(':memory:'); caricaPacchetto(getDb()); });
  afterEach(() => closeDb());

  it('il pacchetto porta uid deterministici su tutti gli spilli', () => {
    const righe = getDb().prepare('SELECT mappa_chiave, area_guida_chiave, tipo, nome, x, y, riferimento_tipo, riferimento_chiave, uid FROM spillo ORDER BY id').all() as Array<{ mappa_chiave: string | null; area_guida_chiave: string | null; tipo: string; nome: string; x: number; y: number; riferimento_tipo: string | null; riferimento_chiave: string | null; uid: string }>;
    expect(righe.length).toBeGreaterThan(1000);
    const visti = new Map<string, number>();
    for (const r of righe) {
      const identita = identitaSpillo(r);
      const n = visti.get(identita) ?? 0;
      visti.set(identita, n + 1);
      expect(r.uid).toBe(uidSpillo(identita, n));
    }
  });

  it('uno spillo creato dall\'app riceve subito l\'uid della sua identità, e la stessa identità su un altro file dà lo stesso uid', () => {
    const creato = creaSpillo('citta-shibuya', { tipo: 'nota', nome: 'Appunto di prova', x: 11, y: 22 });
    const uid = getDb().prepare('SELECT uid FROM spillo WHERE id = ?').pluck().get(creato.id) as string;
    expect(uid).toBe(uidSpillo(identitaSpillo({ mappa_chiave: 'citta-shibuya', tipo: 'nota', nome: 'Appunto di prova', x: 11, y: 22, riferimento_tipo: null, riferimento_chiave: null })));
    // un secondo spillo identico si distingue
    const doppio = creaSpillo('citta-shibuya', { tipo: 'nota', nome: 'Appunto di prova', x: 11, y: 22 });
    expect(getDb().prepare('SELECT uid FROM spillo WHERE id = ?').pluck().get(doppio.id)).toBe(uidSpillo(identitaSpillo({ mappa_chiave: 'citta-shibuya', tipo: 'nota', nome: 'Appunto di prova', x: 11, y: 22, riferimento_tipo: null, riferimento_chiave: null }), 1));
  });

  it('«raccolto» segue l\'uid: un pacchetto mappe reimportato lo conserva, eliminare lo spillo pulisce il segno', () => {
    const partita = creaPartita({ nome: 'Prova uid' });
    const creato = creaSpillo('citta-shibuya', { tipo: 'nota', nome: 'Da raccogliere', x: 5, y: 6 });
    impostaRaccolto(partita.id, creato.id, true);
    const uid = getDb().prepare('SELECT uid FROM spillo WHERE id = ?').pluck().get(creato.id) as string;
    expect(getDb().prepare('SELECT raccolto FROM spillo_partita WHERE partita_id = ? AND spillo_uid = ?').pluck().get(partita.id, uid)).toBe(1);
    const pacchetto = esportaMappe('citta-shibuya');
    // (nell'export le mappe portano la chiave pubblica: si cerca lo spillo, non la mappa)
    expect(pacchetto.mappe.flatMap((m) => m.spilli).find((s) => s.nome === 'Da raccogliere')?.uid).toBe(uid);
    eliminaSpillo(creato.id);
    expect(getDb().prepare('SELECT COUNT(*) FROM spillo_partita WHERE spillo_uid = ?').pluck().get(uid)).toBe(0);
    // la mappa esiste già: senza «sovrascrivi» il pacchetto la salterebbe
    importaMappe(pacchetto, { sovrascrivi: true });
    const reimportato = getDb().prepare("SELECT id, uid FROM spillo WHERE nome = 'Da raccogliere'").get() as { id: number; uid: string };
    expect(reimportato.uid).toBe(uid);
  });
});
