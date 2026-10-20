// ============================================================
// L3, E2 (decisione dell'utente, 2026-10-20) — i conteggi dei pin dell'indice delle Mappe in tre gruppi: «contenuto», «passaggi» e
// «note», con una sola regola (`gruppoConteggioSpillo`, dalla categoria del tipo). Ogni nodo dell'albero porta i conteggi del suo
// sottoalbero (lui e quel che gli sta sotto, Memento esclusi come nell'albero); la radice dell'indice li ha da `/albero/conteggi`
// ============================================================

import request from 'supertest';
import { closeDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { chiaveMappa } from '../services/mappe/percorsiMappe.js';
import { TIPI_SPILLO, gruppoConteggioSpillo } from '../../shared/spilli.js';
import type { ConteggiPinDto, MappaRiassuntoDto } from '../../shared/types.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();

// La regola scritta per esteso, tipo per tipo, indipendente dal codice: passaggi = la categoria «spostamento» più le porte, note = la
// nota, il resto è contenuto. Le **porte** (`porta`, categoria «informativo») stanno fra i passaggi: l'utente ha accettato «più 695
// passaggi e 228 note», che le conta lì (correzione del PM, 2026-10-20). Rispetto a quella misura a mano (819 / 695 / 228 sui dati di
// 3302) la regola sposta ancora nei passaggi i **punti del rampino** (`rampino`) e la **Stanza di Velluto** (`velluto`), che sono
// spostamenti (e l'**ingresso ai Memento**, `mementos`, che nell'albero non c'è): sulla 0533Z 767 / 747 / 228.
const PASSAGGI = ['passaggio', 'scala', 'uscita', 'treno', 'velluto', 'mementos', 'ingresso-palazzo', 'infiltrazione', 'scorciatoia', 'rampino', 'porta'];
const NOTE = ['nota'];

/** I conteggi attesi del sottoalbero di una mappa (identità interna), Memento esclusi, contati in SQL senza la regola del codice. */
function attesi(identita: string): ConteggiPinDto {
  const lista = (t: string[]) => t.map((x) => `'${x}'`).join(', ');
  const r = prepared(`WITH RECURSIVE memento(chiave) AS (SELECT chiave FROM mappa WHERE chiave IN ('dungeon-mementos', 'citta-mementos')
      UNION SELECT m.chiave FROM mappa m JOIN memento x ON m.genitore_chiave = x.chiave),
    sotto(chiave) AS (SELECT ? UNION SELECT m.chiave FROM mappa m JOIN sotto s ON m.genitore_chiave = s.chiave)
    SELECT COALESCE(SUM(tipo NOT IN (${lista(PASSAGGI)}) AND tipo NOT IN (${lista(NOTE)})), 0) AS contenuto,
      COALESCE(SUM(tipo IN (${lista(PASSAGGI)})), 0) AS passaggi, COALESCE(SUM(tipo IN (${lista(NOTE)})), 0) AS note
    FROM spillo WHERE mappa_chiave IN (SELECT chiave FROM sotto) AND mappa_chiave NOT IN (SELECT chiave FROM memento)`).get(identita) as ConteggiPinDto;
  return r;
}

describe('E2 — conteggi dei pin dell’indice delle Mappe', () => {
  beforeAll(() => { dbDiProva(); });
  afterAll(() => closeDb());

  it('la regola unica: ogni tipo di pin ha il suo gruppo, letto dalla categoria', () => {
    for (const t of TIPI_SPILLO) {
      const atteso = PASSAGGI.includes(t) ? 'passaggi' : NOTE.includes(t) ? 'note' : 'contenuto';
      expect([t, gruppoConteggioSpillo(t)]).toEqual([t, atteso]);
    }
    // le differenze con la misura a mano, dette una per una
    expect(['porta', 'rampino', 'velluto', 'mementos'].map(gruppoConteggioSpillo)).toEqual(['passaggi', 'passaggi', 'passaggi', 'passaggi']);
    // gli altri informativi restano contenuto: la porta è l'unica eccezione alla categoria
    expect(['meccanismo', 'sicura', 'punto-sensibile', 'nemico'].map(gruppoConteggioSpillo)).toEqual(['contenuto', 'contenuto', 'contenuto', 'contenuto']);
    // un tipo che non c'è più (o non ancora) è informativo, quindi contenuto: nessun pin resta fuori dai tre gruppi
    expect(gruppoConteggioSpillo('tipo-inventato')).toBe('contenuto');
  });

  it('ogni nodo dell’albero porta i conteggi del suo sottoalbero: Tokyo, Kamoshida e Madarame come in SQL, e per ogni nodo la somma dei gruppi', async () => {
    const albero = (await request(app).get('/api/mappe/albero').expect(200)).body.data as MappaRiassuntoDto[];
    for (const identita of ['tokyo', 'dungeon-kamoshida', 'dungeon-madarame']) {
      const nodo = albero.find((n) => n.chiave === chiaveMappa(identita));
      expect(nodo, identita).toBeDefined();
      const c = attesi(identita);
      expect(c.contenuto + c.passaggi + c.note, `${identita} senza pin nei dati dei test`).toBeGreaterThan(0);
      expect([identita, nodo!.conteggiPin]).toEqual([identita, c]);
    }
    // una foglia: i conteggi sono i suoi, e la somma è il suo `numeroSpilli` (che resta)
    const figli = new Map<string, MappaRiassuntoDto[]>();
    for (const n of albero) if (n.genitore) figli.set(n.genitore, [...(figli.get(n.genitore) ?? []), n]);
    for (const n of albero) {
      const k = n.conteggiPin!;
      const somma = (figli.get(n.chiave) ?? []).reduce((s, f) => s + f.conteggiPin!.contenuto + f.conteggiPin!.passaggi + f.conteggiPin!.note, n.numeroSpilli);
      expect([n.chiave, k.contenuto + k.passaggi + k.note]).toEqual([n.chiave, somma]);
    }
  });

  it('la radice dell’indice: `/albero/conteggi` dà i tre gruppi dell’albero intero, e la loro somma è il totale degli spilli dell’albero', async () => {
    const albero = (await request(app).get('/api/mappe/albero').expect(200)).body.data as MappaRiassuntoDto[];
    const r = (await request(app).get('/api/mappe/albero/conteggi').expect(200)).body.data as { conteggiPin: ConteggiPinDto };
    const radici = albero.filter((n) => n.genitore === null);
    const somma = (g: keyof ConteggiPinDto) => radici.reduce((s, n) => s + n.conteggiPin![g], 0);
    expect(r.conteggiPin).toEqual({ contenuto: somma('contenuto'), passaggi: somma('passaggi'), note: somma('note') });
    expect(r.conteggiPin.contenuto + r.conteggiPin.passaggi + r.conteggiPin.note).toBe(albero.reduce((s, n) => s + n.numeroSpilli, 0));
  });

  it('un pin nuovo cambia solo il suo gruppo: un passaggio e una porta i passaggi, un forziere il contenuto', async () => {
    const prima = ((await request(app).get('/api/mappe/albero/conteggi').expect(200)).body.data as { conteggiPin: ConteggiPinDto }).conteggiPin;
    const mappa = prepared("SELECT chiave FROM mappa WHERE genitore_chiave = 'dungeon-kamoshida' ORDER BY chiave LIMIT 1").pluck().get() as string;
    const id = (tipo: string) => prepared("INSERT INTO spillo (mappa_chiave, tipo, nome, x, y, uid, updated_at) VALUES (?, ?, 'E2', 50, 50, lower(hex(randomblob(16))), datetime('now'))").run(mappa, tipo).lastInsertRowid;
    const ids = [id('passaggio'), id('forziere'), id('porta')];
    try {
      const dopo = ((await request(app).get('/api/mappe/albero/conteggi').expect(200)).body.data as { conteggiPin: ConteggiPinDto }).conteggiPin;
      expect(dopo).toEqual({ contenuto: prima.contenuto + 1, passaggi: prima.passaggi + 2, note: prima.note });
    } finally {
      for (const i of ids) prepared('DELETE FROM spillo WHERE id = ?').run(i);
    }
  });
});
