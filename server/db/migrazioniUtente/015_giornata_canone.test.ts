// ============================================================
// Test 092 + utente 015 — la giornata diventa canone: voci con uid nel file di gioco, correzioni e voci dell'utente fuse,
// spunte per uid, l'ordine che l'utente vedeva
// ============================================================

import { createHash } from 'node:crypto';
import { closeDb, initDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from '../migrations/index.js';
import { migrazioniUtente } from './index.js';
import { uidAzioneGuida } from '../migrations/092_giornata_canone.js';

afterEach(() => closeDb());

const GUIDA = [
  { fascia: 'giorno', azione: 'Uno', tipo: 'altro', riferimento: null, riferimentoTesto: null, rangoAtteso: null, note: null, produce: [] },
  { fascia: 'sera', azione: 'Due', tipo: 'altro', riferimento: null, riferimentoTesto: null, rangoAtteso: null, note: 'n2', produce: [] },
  { fascia: 'giorno', azione: 'Tre', tipo: 'altro', riferimento: null, riferimentoTesto: null, rangoAtteso: null, note: null, produce: [] },
  { fascia: 'giorno', azione: 'Quattro', tipo: 'libro', riferimento: { tipo: 'libro', chiave: 'x' }, riferimentoTesto: 'X', rangoAtteso: null, note: null, produce: [{ tipo: 'dote', dote: 'conoscenza', note: 1 }] },
];

/** Un file com'era prima: gioco alla 091 con un giorno della guida, partite alla 014 con spunte, correzioni e voci dell'utente. */
function fileDiPrima() {
  const db = initDb(':memory:');
  runMigrations(db, migrations.filter((m) => m.id < 92), migrazioniUtente.filter((m) => m.id < 15));
  db.prepare(`INSERT INTO main.giorno_percorso (data, ordine, giorno_settimana, fase, trama, vincoli_json, meteo, azioni_json, avvisi_json, fonte, coperto)
    VALUES ('04-12', 1, 'martedi', 'f', '', '[]', NULL, ?, '[]', '', 1), ('04-13', 2, 'mercoledi', 'f', '', '[]', NULL, ?, '[]', '', 1)`)
    .run(JSON.stringify(GUIDA), JSON.stringify([{ ...GUIDA[0], azione: 'Solo' }]));
  db.prepare("INSERT INTO partita (id, nome, attiva, livello_protagonista, created_at, updated_at) VALUES (7, 'Prova', 1, 1, 'x', 'x'), (8, 'Altra', 0, 1, 'x', 'x')").run();
  const spunta = db.prepare("INSERT INTO utente.azione_partita (partita_id, data, indice, updated_at, effetti_json) VALUES (?, '04-12', ?, 't1', ?)");
  spunta.run(7, 0, '{"doti":[]}');
  spunta.run(7, 2, null); // sulla voce che l'utente ha rimosso: se ne va con lei
  const correggi = db.prepare("INSERT INTO utente.correzione_azione_guida (data, indice, originale_json, modifiche_json, nascosta, created_at, updated_at) VALUES ('04-12', ?, ?, ?, ?, 't', 't')");
  correggi.run(1, JSON.stringify(GUIDA[1]), JSON.stringify({ azione: 'Due corretta', fascia: 'giorno', note: null }), 0);
  correggi.run(2, JSON.stringify(GUIDA[2]), '{}', 1);
  correggi.run(3, JSON.stringify({ ...GUIDA[3], azione: 'Vecchio testo' }), JSON.stringify({ azione: 'Non si applica' }), 0); // superata
  db.prepare(`INSERT INTO utente.azione_utente (id, partita_id, data, fascia, tipo, azione, note, produce_json, ordine, created_at, updated_at)
    VALUES (1, 7, '04-12', 'giorno', 'confidente', 'Mia', 'nota mia', '[]', 1, 'c1', 'u1'), (2, NULL, '04-12', 'sera', 'altro', 'Mia di sera', NULL, '[]', 2, 'c2', 'u2')`).run();
  db.prepare("INSERT INTO utente.azione_utente_partita (partita_id, azione_utente_id, fatta_at, effetti_json) VALUES (8, 1, 'f1', '{\"x\":1}')").run();
  db.prepare(`INSERT INTO utente.evento_utente (id, partita_id, data, tipo, fascia, titolo, dettaglio, ordine, created_at, updated_at)
    VALUES (1, NULL, '04-12', 'scadenza', 'giorno', 'Consegna', 'entro sera', 1, 'c3', 'u3')`).run();
  return db;
}

describe('092 — la guida diventa voci con identità stabile', () => {
  it('ogni azione diventa una voce: uid dall\'identità, ordine per fascia, posizione d\'origine; azioni_json resta com\'era', () => {
    const db = fileDiPrima();
    runMigrations(db, migrations, migrazioniUtente.filter((m) => m.id < 15));
    const voci = db.prepare("SELECT uid, fascia, ordine, azione, indice_guida, tipo, riferimento_tipo, riferimento_chiave, riferimento_testo, produce_json, note, genere FROM main.voce_giornata WHERE data = '04-12' ORDER BY indice_guida").all() as Array<Record<string, unknown>>;
    expect(voci.map((v) => [v.azione, v.fascia, v.ordine, v.indice_guida])).toEqual([['Uno', 'giorno', 0, 0], ['Due', 'sera', 0, 1], ['Tre', 'giorno', 1, 2], ['Quattro', 'giorno', 2, 3]]);
    expect(voci[0].uid).toBe(uidAzioneGuida('04-12', 0, 'Uno'));
    expect(voci[3]).toMatchObject({ tipo: 'libro', riferimento_tipo: 'libro', riferimento_chiave: 'x', riferimento_testo: 'X', produce_json: JSON.stringify(GUIDA[3].produce), genere: 'azione' });
    expect(voci[1].note).toBe('n2');
    expect(new Set(voci.map((v) => v.uid)).size).toBe(4);
    expect(JSON.parse(db.prepare("SELECT azioni_json FROM main.giorno_percorso WHERE data = '04-12'").pluck().get() as string)).toEqual(GUIDA);
  });
});

describe('utente 015 — correzioni, voci ed eventi dell\'utente entrano nella guida; spunte per uid', () => {
  it('fonde tutto, rimette l\'ordine che l\'utente vedeva e toglie le tabelle vecchie', () => {
    const db = fileDiPrima();
    runMigrations(db);
    expect(db.pragma('utente.user_version', { simple: true })).toBe(migrazioniUtente.length);
    /** Voci del 12 aprile nella fascia `f`, in ordine, con azione, genere, note e tipo. */
    const fascia = (f: string) => (db.prepare("SELECT azione, genere, note, tipo FROM main.voce_giornata WHERE data = '04-12' AND fascia = ? ORDER BY ordine").all(f) as Array<{ azione: string; genere: string; note: string | null; tipo: string }>);
    // di giorno: l'evento in cima, poi la guida nel suo ordine (Due spostata qui, Tre rimossa, Quattro con la correzione superata lasciata), poi la cosa da fare
    expect(fascia('giorno').map((v) => v.azione)).toEqual(['Consegna', 'Uno', 'Due corretta', 'Quattro', 'Mia']);
    expect(fascia('sera').map((v) => v.azione)).toEqual(['Mia di sera']);
    const giorno = fascia('giorno');
    expect(giorno[0]).toMatchObject({ genere: 'scadenza', note: 'entro sera' });
    expect(giorno[2]).toMatchObject({ genere: 'azione', note: null });
    expect(giorno[4]).toMatchObject({ genere: 'azione', note: 'nota mia', tipo: 'confidente' });
    // l'ordine è 0..n-1 senza buchi
    expect((db.prepare("SELECT ordine FROM main.voce_giornata WHERE data = '04-12' AND fascia = 'giorno' ORDER BY ordine").pluck().all())).toEqual([0, 1, 2, 3, 4]);
    // gli altri giorni non si toccano
    expect(db.prepare("SELECT azione, ordine FROM main.voce_giornata WHERE data = '04-13'").all()).toEqual([{ azione: 'Solo', ordine: 0 }]);

    // spunte per uid: quella della guida (con gli effetti) e quella della cosa da fare; quella della voce rimossa se n'è andata
    const uidDi = (azione: string) => db.prepare('SELECT uid FROM main.voce_giornata WHERE azione = ?').pluck().get(azione) as string;
    expect(db.prepare('SELECT partita_id, voce_uid, fatta_at, effetti_json FROM utente.spunta_voce_partita ORDER BY partita_id').all()).toEqual([
      { partita_id: 7, voce_uid: uidDi('Uno'), fatta_at: 't1', effetti_json: '{"doti":[]}' },
      { partita_id: 8, voce_uid: uidDi('Mia'), fatta_at: 'f1', effetti_json: '{"x":1}' },
    ]);
    for (const t of ['azione_partita', 'azione_utente', 'azione_utente_partita', 'correzione_azione_guida', 'evento_utente', 'ordine_giornata']) {
      expect(db.prepare("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = ?").get(t), t).toBeUndefined();
    }
    expect(db.pragma('utente.foreign_key_check')).toEqual([]);
  });

  it('una voce rimossa ma spuntata con effetti resta nella giornata (per poterli annullare); una spunta senza voce non si converte', () => {
    const db = fileDiPrima();
    db.prepare("UPDATE utente.azione_partita SET effetti_json = '{\"turni\":[]}' WHERE indice = 2").run();
    db.prepare("INSERT INTO utente.azione_partita (partita_id, data, indice, updated_at, effetti_json) VALUES (7, '04-12', 9, 't', '{\"doti\":[]}')").run();
    runMigrations(db);
    const tre = db.prepare("SELECT uid, azione FROM main.voce_giornata WHERE azione = 'Tre'").get() as { uid: string } | undefined;
    expect(tre).toBeTruthy();
    expect(db.prepare('SELECT effetti_json FROM utente.spunta_voce_partita WHERE voce_uid = ?').get(tre!.uid)).toEqual({ effetti_json: '{"turni":[]}' });
    // la spunta all'indice 9 (nessuna azione a quel posto) non ha dove andare: nessuna riga inventata
    expect(db.prepare('SELECT COUNT(*) AS n FROM utente.spunta_voce_partita WHERE partita_id = 7').get()).toEqual({ n: 2 });
  });

  it('rientrante: accanto a un file di gioco che ha già il canone non sovrascrive voci cambiate, non duplica, e mette in fondo le voci nuove', () => {
    const db = fileDiPrima();
    runMigrations(db, migrations, migrazioniUtente.filter((m) => m.id < 15));
    // il canone di un pacchetto esportato dopo: «Due» cambiata, la cosa da fare «Mia» già dentro (in fondo alla fascia di giorno)
    db.prepare("UPDATE main.voce_giornata SET azione = 'Due (canone)', updated_at = 'dopo' WHERE data = '04-12' AND indice_guida = 1").run();
    const uidMia = createHash('sha256').update('utente|azione_utente|1|c1').digest('hex').slice(0, 32);
    db.prepare(`INSERT INTO main.voce_giornata (uid, data, fascia, ordine, genere, azione, tipo, produce_json, created_at, updated_at)
      VALUES (?, '04-12', 'giorno', 9, 'azione', 'Mia (canone)', 'altro', '[]', 'c1', 'dopo')`).run(uidMia);
    expect(() => runMigrations(db)).not.toThrow();
    /** Solo le azioni delle voci del 12 aprile nella fascia `f`, in ordine. */
    const fascia = (f: string) => (db.prepare("SELECT azione FROM main.voce_giornata WHERE data = '04-12' AND fascia = ? ORDER BY ordine").pluck().all(f));
    // Due non è stata toccata (la correzione non si applica a una voce già cambiata) e resta di sera; Tre (intatta) è rimossa;
    // «Mia» non si duplica e tiene il testo del canone; l'evento nuovo va in fondo, dopo le voci che c'erano
    expect(fascia('giorno')).toEqual(['Uno', 'Quattro', 'Mia (canone)', 'Consegna']);
    expect(fascia('sera')).toEqual(['Due (canone)', 'Mia di sera']);
    expect(db.prepare('SELECT COUNT(*) AS n FROM main.voce_giornata WHERE uid = ?').get(uidMia)).toEqual({ n: 1 });
    // la spunta della cosa da fare segue l'uid che il canone ha già
    expect(db.prepare('SELECT partita_id FROM utente.spunta_voce_partita WHERE voce_uid = ?').all(uidMia)).toEqual([{ partita_id: 8 }]);
  });

  it('su un file delle partite nuovo non converte niente e toglie le tabelle vecchie', () => {
    const db = initDb(':memory:');
    runMigrations(db);
    expect(db.prepare("SELECT COUNT(*) FROM utente.sqlite_master WHERE type = 'table' AND name IN ('azione_partita','azione_utente','evento_utente','correzione_azione_guida','azione_utente_partita','ordine_giornata')").pluck().get()).toBe(0);
    expect(db.prepare("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = 'spunta_voce_partita'").get()).toBeTruthy();
  });
});
