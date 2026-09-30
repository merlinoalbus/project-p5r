// ============================================================
// Test 093 — 25 aprile: «finire Zorro» e «restituirlo e prendere in prestito la Ballerina» in due voci distinte
// ============================================================

import { closeDb, getDb, initDb, prepared } from '../dbService.js';
import { caricaPacchetto } from '../../services/pacchetto/pacchettoGioco.js';
import { migration093, TESTO_BIBLIOTECA, TESTO_LETTURA } from './093_zorro_e_ballerina.js';

afterEach(() => closeDb());

const ZORRO = { tipo: 'lettura', categoria: 'libro', chiave: 'zorro-il-fuorilegge', almeno: null };
const BALLERINA = { tipo: 'lettura', categoria: 'libro', chiave: 'la-ballerina-seducente', almeno: null };
const giorno = () => prepared("SELECT uid, ordine, azione, tipo, riferimento_tipo, riferimento_chiave, produce_json, indice_guida FROM voce_giornata WHERE data = '04-25' AND fascia = 'giorno' ORDER BY ordine").all() as Array<{ uid: string; ordine: number; azione: string; tipo: string; riferimento_tipo: string | null; riferimento_chiave: string | null; produce_json: string; indice_guida: number | null }>;
const uidGuida = () => prepared("SELECT uid FROM voce_giornata WHERE data = '04-25' AND indice_guida = 1").pluck().get() as string;

it('sul canone di produzione (092): la lettura di Zorro e, subito dopo, la restituzione con il prestito della Ballerina (la voce dell\'utente), senza leggerla; le spunte restano', () => {
  initDb(':memory:');
  caricaPacchetto(getDb());
  // Il pacchetto del repository è già alla 93: qui si ricostruisce il 25 aprile com'era nell'export di produzione alla 092
  // (la voce della guida col testo corretto dall'utente, collegata alla Ballerina, «Ballerina + Zorro completati»; la voce
  // del prestito aggiunta dall'utente, di tipo «altro», in fondo alla fascia), e si esegue la migrazione.
  const uid = uidGuida();
  prepared(`UPDATE voce_giornata SET azione = 'Finire di leggere "Zorro, il fuorilegge" sulla metro e restituirlo in Biblioteca.', riferimento_chiave = 'la-ballerina-seducente',
    riferimento_testo = 'La ballerina seducente', produce_json = ?, ordine = 1 WHERE uid = ?`).run(JSON.stringify([BALLERINA, ZORRO]), uid);
  prepared(`UPDATE voce_giornata SET azione = 'Prendere in prestito dalla Bibblioteca il libro: "La ballerina seducente"', tipo = 'altro', riferimento_tipo = NULL,
    riferimento_chiave = NULL, produce_json = '[]', ordine = 3 WHERE uid = '6a891ae608f8d27dcf961ca387c6d497'`).run();
  prepared("UPDATE voce_giornata SET ordine = 2 WHERE data = '04-25' AND indice_guida = 2").run();
  const partita = Number(prepared("INSERT INTO partita (nome, attiva, livello_protagonista, created_at, updated_at) VALUES ('Prova', 0, 1, 'x', 'x')").run().lastInsertRowid);
  prepared("INSERT INTO spunta_voce_partita (partita_id, voce_uid, fatta_at, effetti_json) VALUES (?, ?, 't', NULL), (?, '6a891ae608f8d27dcf961ca387c6d497', 't', NULL)").run(partita, uid, partita);

  migration093.up(getDb());
  expect(prepared('SELECT COUNT(*) AS n FROM spunta_voce_partita WHERE partita_id = ?').get(partita)).toEqual({ n: 2 });
  const voci = giorno();
  const i = voci.findIndex((v) => v.indice_guida === 1);
  expect(voci[i]).toMatchObject({ azione: TESTO_LETTURA, tipo: 'libro', riferimento_tipo: 'libro', riferimento_chiave: 'zorro-il-fuorilegge' });
  expect(JSON.parse(voci[i].produce_json)).toEqual([ZORRO]);
  expect(voci[i + 1]).toMatchObject({ uid: '6a891ae608f8d27dcf961ca387c6d497', azione: TESTO_BIBLIOTECA, tipo: 'libro', riferimento_tipo: 'libro', riferimento_chiave: 'la-ballerina-seducente', produce_json: '[]' });
  // nessuna voce del giorno segna più finita la Ballerina, e la fascia è compatta
  expect(voci.some((v) => JSON.parse(v.produce_json).some((e: { chiave?: string }) => e.chiave === 'la-ballerina-seducente'))).toBe(false);
  expect(voci.map((v) => v.ordine)).toEqual(voci.map((_, k) => k));
  expect(voci.filter((v) => /ballerina/i.test(v.azione))).toHaveLength(1);
});

it('su una guida com\'era (voce d\'origine, nessuna voce dell\'utente): la divide e la voce della Biblioteca nasce; ripetuta non fa altro; le spunte restano', () => {
  initDb(':memory:');
  caricaPacchetto(getDb());
  const uid = uidGuida();
  // la giornata come la dà la guida d'origine: la voce unica, senza la voce dell'utente
  prepared("DELETE FROM voce_giornata WHERE uid <> ? AND data = '04-25' AND indice_guida IS NULL").run(uid);
  prepared("UPDATE voce_giornata SET azione = 'Biblioteca: restituire Zorro, il fuorilegge e prendere in prestito La ballerina seducente', riferimento_chiave = 'la-ballerina-seducente', produce_json = ? WHERE uid = ?").run(JSON.stringify([ZORRO]), uid);
  const partita = Number(prepared("INSERT INTO partita (nome, attiva, livello_protagonista, created_at, updated_at) VALUES ('Prova', 0, 1, 'x', 'x')").run().lastInsertRowid);
  prepared("INSERT INTO spunta_voce_partita (partita_id, voce_uid, fatta_at, effetti_json) VALUES (?, ?, 't', '{}')").run(partita, uid);

  migration093.up(getDb());
  const voci = giorno();
  const i = voci.findIndex((v) => v.uid === uid);
  expect(voci[i]).toMatchObject({ azione: TESTO_LETTURA, riferimento_chiave: 'zorro-il-fuorilegge' });
  expect(voci[i + 1]).toMatchObject({ azione: TESTO_BIBLIOTECA, riferimento_chiave: 'la-ballerina-seducente', produce_json: '[]', indice_guida: null });
  expect(prepared('SELECT COUNT(*) AS n FROM spunta_voce_partita WHERE voce_uid = ?').get(uid)).toEqual({ n: 1 });

  const prima = giorno();
  migration093.up(getDb());
  expect(giorno()).toEqual(prima);
});

it('una voce cambiata in altro modo non si tocca', () => {
  initDb(':memory:');
  caricaPacchetto(getDb());
  const uid = uidGuida();
  prepared("UPDATE voce_giornata SET azione = 'Zorro, a modo mio', produce_json = ? WHERE uid = ?").run(JSON.stringify([BALLERINA, ZORRO]), uid);
  const prima = giorno();
  migration093.up(getDb());
  expect(giorno()).toEqual(prima);
});
