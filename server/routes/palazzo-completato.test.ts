// ============================================================
// Un Palazzo completato è completato, qualunque sia la data (richiesta dell'utente, 2026-09-30)
// ============================================================
//
// «Gli interruttori che si attivano al completamento di un Palazzo non verificano lo stato effettivo… (così come
// la visibilità dello stesso sulla mappa) se un palazzo è completato al 100% bisogna che gli eventi diano quel
// palazzo come completato a prescindere dalla data di scadenza», con l'Ombra di Kamoshida segnata raccolta sulla
// mappa. Poi: il boss della Guida deve scattare col Tesoro del Palazzo o col boss finale; scelte dell'utente:
// il boss della Guida si segna e si toglie da solo, l'ingresso sparisce a Palazzo completato.
// ============================================================

import request from 'supertest';
import { closeDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { creaMappa } from '../services/mappe/mappeService.js';
import { statoPartitaSemafori, valuta } from '../services/semaforiService.js';
import { bossFinali, palazziCompletati } from '../services/palazziService.js';
import type { DungeonRiassuntoDto, MappaDto } from '../../shared/types.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();

/** Le planimetrie di un Palazzo: l'albero sotto `dungeon-<chiave>`. */
const albero = (dungeon: string): string[] => (prepared(`WITH RECURSIVE a(chiave) AS (SELECT ? UNION ALL SELECT m.chiave FROM mappa m JOIN a ON m.genitore_chiave = a.chiave) SELECT chiave FROM a`)
  .all(`dungeon-${dungeon}`) as Array<{ chiave: string }>).map((r) => r.chiave);

describe('Palazzo completato', () => {
  let partita: number;
  /** Vero se la voce della guida `punto` (il boss) risulta segnata nella partita di prova. */
  const bossGuida = (punto: string) => !!prepared('SELECT 1 FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').get(partita, punto);
  /** Segna (o toglie il segno) dello spillo nella partita di prova, pretendendo il 200. */
  const segna = (spillo: number, raccolto: boolean) => request(app).put(`/api/partite/${partita}/spilli/${spillo}`).send({ raccolto }).expect(200);
  /** Valuta, sullo stato dei semafori della partita, un requisito di Confidente «Completare il Palazzo» del dungeon dato. */
  const requisito = (dungeon: string) => valuta({ confidente_chiave: 'prova', rango: 1, indice: 0, tipo: 'palazzo', dati_json: JSON.stringify({ dungeon }), testo: 'Completare il Palazzo' }, statoPartitaSemafori(partita, new Map(), new Map()));

  beforeAll(async () => {
    dbDiProva();
    partita = ((await request(app).post('/api/partite').send({ nome: 'Prova Palazzi' })).body.data as { id: number }).id;
    // il giorno dopo il furto: la data non deve contare
    prepared("UPDATE partita SET data_gioco = '04-22' WHERE id = ?").run(partita);
  });
  afterAll(() => closeDb());

  it('il boss finale raccolto sulla mappa completa il Palazzo e segna il boss della Guida; tolto, si toglie', async () => {
    const finale = bossFinali().get('kamoshida')!;
    expect(finale.punti.length).toBeGreaterThan(0);
    expect(palazziCompletati(partita).has('kamoshida')).toBe(false);
    expect(requisito('kamoshida').stato).toBe('rosso');
    // come nei dati veri: l'area finale di Kamoshida non è legata a nessuna planimetria, ma Kamoshida non ha boss
    // intermedi, e l'«Ombra di Kamoshida» messa su una planimetria qualunque del Palazzo è il boss finale
    expect(finale.unico).toBe(true);
    const mappa = creaMappa(undefined, { nome: 'Stanza del Tesoro di prova', tipo: 'area', genitore: 'dungeon-kamoshida' });
    const boss = (await request(app).post(`/api/mappe/${mappa.chiave}/spilli`).send({ tipo: 'boss', nome: 'Ombra di Kamoshida', x: 50, y: 50 })).body.data as { id: number };
    await segna(boss.id, true);
    expect(palazziCompletati(partita).get('kamoshida')).toBe('boss finale segnato nella Guida');
    expect(finale.punti.every(bossGuida)).toBe(true);
    const esito = requisito('kamoshida');
    expect(esito.stato).toBe('verde');
    expect(esito.dettaglio).toMatch(/completato \(boss finale segnato nella Guida\)/);
    // togliendo il raccolto, e senza nient'altro che dica «finito», il boss della Guida torna non sconfitto
    await segna(boss.id, false);
    expect(finale.punti.some(bossGuida)).toBe(false);
    expect(palazziCompletati(partita).has('kamoshida')).toBe(false);
  });

  it('il boss della Guida segnato a mano resta suo: togliere un raccolto non lo cancella', async () => {
    const finale = bossFinali().get('kamoshida')!;
    // segnato dall'utente nella Guida
    await request(app).put(`/api/partite/${partita}/punti`).send({ punto: finale.punti[0], stato: 'esaurito' }).expect(200);
    // poi il Tesoro raccolto e tolto (per correggere un errore): il segno dell'utente resta, «esaurito» compreso
    const tesoro = prepared("SELECT s.id FROM spillo s WHERE s.tipo = 'tesoro-palazzo' AND s.mappa_chiave IN (" + albero('kamoshida').map(() => '?').join(',') + ') LIMIT 1').get(...albero('kamoshida')) as { id: number };
    await segna(tesoro.id, true);
    await segna(tesoro.id, false);
    expect(prepared('SELECT stato FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').get(partita, finale.punti[0])).toEqual({ stato: 'esaurito' });
    expect(palazziCompletati(partita).get('kamoshida')).toBe('boss finale segnato nella Guida');
  });

  it('l’ingresso vero (lo spillo della Shujin modificato a mano, senza più collegamento) sparisce a Palazzo completato', async () => {
    // lo spillo 1616: oggi «punto sensibile» senza riferimento; la sua identità di seed è il passaggio verso dungeon-kamoshida
    const vero = prepared("SELECT id, mappa_chiave, riferimento_tipo FROM spillo WHERE seed_identita_json LIKE '%\"dungeon-kamoshida\"%' AND mappa_chiave NOT LIKE 'dungeon-%'").get() as { id: number; mappa_chiave: string; riferimento_tipo: string | null };
    expect(vero.riferimento_tipo).toBeNull();
    // Kamoshida è completato dal test precedente (boss segnato a mano): siamo il 22 aprile, dentro la finestra 11/4–2/5 (097)
    const spillo = ((await request(app).get(`/api/mappe/${vero.mappa_chiave}?partita=${partita}`)).body.data as MappaDto).spilli.find((s) => s.id === vero.id)!;
    expect(spillo.disponibilita?.stato).toBe('bloccato');
    expect(spillo.disponibilita?.requisiti.at(-1)?.dettaglio).toMatch(/Palazzo di Kamoshida: completato .*non ci si entra più/);
  });

  it('un boss che non è il finale non completa niente (Shido: i boss intermedi prima dell’Aula magna)', async () => {
    const finale = bossFinali().get('shido')!;
    expect(finale.unico).toBe(false);
    const intermedio = prepared(`SELECT pi.chiave FROM punto_interesse pi JOIN dungeon_area a ON a.chiave = pi.area_chiave
      WHERE a.dungeon_chiave = 'shido' AND pi.tipo = 'boss' AND a.chiave <> ? LIMIT 1`).get(finale.area) as { chiave: string } | undefined;
    expect(intermedio).toBeTruthy();
    prepared("INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at) VALUES (?, ?, 'ottenuto', 'x')").run(partita, intermedio!.chiave);
    expect(palazziCompletati(partita).has('shido')).toBe(false);
    // uno spillo «Boss» su una planimetria senza l'area finale non conta, e non tocca la Guida
    const mappa = creaMappa(undefined, { nome: 'Sala macchine di prova', tipo: 'area', genitore: 'dungeon-shido' });
    const boss = (await request(app).post(`/api/mappe/${mappa.chiave}/spilli`).send({ tipo: 'boss', nome: 'Akechi', x: 50, y: 50 })).body.data as { id: number };
    await segna(boss.id, true);
    expect(palazziCompletati(partita).has('shido')).toBe(false);
    expect(finale.punti.some(bossGuida)).toBe(false);
    // il boss finale nella Guida sì
    prepared("INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at) VALUES (?, ?, 'ottenuto', 'x')").run(partita, finale.punti[0]);
    expect(palazziCompletati(partita).get('shido')).toBe('boss finale segnato nella Guida');
  });

  it('il Tesoro del Palazzo raccolto completa il Palazzo e segna il boss finale della Guida; tolto, si toglie', async () => {
    const finale = bossFinali().get('okumura')!;
    const mappa = creaMappa(undefined, { nome: 'Caveau di prova', tipo: 'area', genitore: 'dungeon-okumura' });
    const tesoro = (await request(app).post(`/api/mappe/${mappa.chiave}/spilli`).send({ tipo: 'tesoro-palazzo', nome: 'Tesoro del Palazzo', x: 50, y: 50 })).body.data as { id: number };
    expect(palazziCompletati(partita).has('okumura')).toBe(false);
    await segna(tesoro.id, true);
    expect(finale.punti.every(bossGuida)).toBe(true);
    expect(palazziCompletati(partita).has('okumura')).toBe(true);
    // l'elenco dei Palazzi lo dice, col perché: la mappa di Tokyo lo toglie anche dentro la sua finestra
    const elenco = async (q = `?partita=${partita}`) => ((await request(app).get(`/api/compendio/dungeon${q}`)).body.data as DungeonRiassuntoDto[]).find((d) => d.chiave === 'okumura')!;
    expect((await elenco()).completato).toBe(palazziCompletati(partita).get('okumura'));
    expect((await request(app).get(`/api/compendio/dungeon/okumura?partita=${partita}`)).body.data.completato).toBe(palazziCompletati(partita).get('okumura'));
    expect((await elenco('')).completato).toBeNull();
    await segna(tesoro.id, false);
    expect(finale.punti.some(bossGuida)).toBe(false);
    expect(palazziCompletati(partita).has('okumura')).toBe(false);
    expect((await elenco()).completato).toBeNull();
  });

  it('i Memento non si completano: anche con un boss segnato nella Guida restano sulla mappa di Tokyo', async () => {
    // il boss finale dei Memento secondo la regola; se il pacchetto non ne ha, se ne crea uno nell'ultima area
    // (la Guida è modificabile al 100%: il caso è possibile)
    if (!bossFinali().get('mementos')) {
      const area = prepared("SELECT chiave FROM dungeon_area WHERE dungeon_chiave = 'mementos' ORDER BY ordine DESC LIMIT 1").pluck().get() as string;
      prepared("INSERT INTO punto_interesse (chiave, area_chiave, ordine, tipo, nome, descrizione, esauribile, dettagli_json, fonte) VALUES ('mementos-boss-di-prova', ?, 999, 'boss', 'Boss di prova', '', 0, '{}', '')").run(area);
    }
    const punto = bossFinali().get('mementos')!.punti[0];
    prepared("INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at) VALUES (?, ?, 'ottenuto', 'x') ON CONFLICT DO NOTHING").run(partita, punto);
    // per la regola generale il dungeon risulterebbe completato; per l'elenco no, perché non è un Palazzo
    expect(palazziCompletati(partita).has('mementos')).toBe(true);
    const memento = ((await request(app).get(`/api/compendio/dungeon?partita=${partita}`)).body.data as DungeonRiassuntoDto[]).find((d) => d.chiave === 'mementos')!;
    expect(memento.completato).toBeNull();
    expect((await request(app).get(`/api/compendio/dungeon/mementos?partita=${partita}`)).body.data.completato).toBeNull();
    prepared('DELETE FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').run(partita, punto);
  });

  it('con tutto raccolto (100%, la stessa regola della scheda del Palazzo) il Palazzo è completato', async () => {
    // un Palazzo senza spilli «Boss» né «Tesoro del Palazzo»: resta solo la raccolta a decidere
    const mappe = albero('madarame');
    const segnaposti = mappe.map(() => '?').join(',');
    prepared(`DELETE FROM spillo WHERE tipo IN ('boss', 'tesoro-palazzo') AND mappa_chiave IN (${segnaposti})`).run(...mappe);
    const da = prepared(`SELECT uid FROM spillo WHERE collezionabile = 1 AND uid IS NOT NULL AND mappa_chiave IN (${segnaposti})`).all(...mappe) as Array<{ uid: string }>;
    expect(da.length).toBeGreaterThan(1);
    for (const s of da.slice(1)) prepared("INSERT INTO spillo_partita (partita_id, spillo_uid, raccolto, updated_at) VALUES (?, ?, 1, 'x')").run(partita, s.uid);
    expect(palazziCompletati(partita).has('madarame')).toBe(false);
    // l'ultimo è collegato a un punto della Guida già gestito: per la scheda è raccolto, e qui pure
    const punto = prepared("SELECT pi.chiave FROM punto_interesse pi JOIN dungeon_area a ON a.chiave = pi.area_chiave WHERE a.dungeon_chiave = 'madarame' AND pi.tipo <> 'boss' LIMIT 1").get() as { chiave: string };
    prepared("UPDATE spillo SET riferimento_tipo = 'punto', riferimento_chiave = ? WHERE uid = ?").run(punto.chiave, da[0].uid);
    prepared("INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at) VALUES (?, ?, 'ottenuto', 'x')").run(partita, punto.chiave);
    expect(palazziCompletati(partita).get('madarame')).toBe(`raccolto tutto (${da.length}/${da.length})`);
    expect(requisito('madarame').stato).toBe('verde');
  });

  it('l’ingresso a un Palazzo completato sparisce dalla mappa, anche prima della scadenza', async () => {
    const citta = prepared("SELECT chiave FROM mappa WHERE chiave LIKE 'citta-%' LIMIT 1").get() as { chiave: string };
    const ingresso = (await request(app).post(`/api/mappe/${citta.chiave}/spilli`).send({ tipo: 'passaggio', nome: 'Palazzo di Kaneshiro', x: 20, y: 20, riferimento: { tipo: 'mappa', chiave: 'dungeon-kaneshiro' } })).body.data as { id: number };
    /** Rilegge la mappa della città con la partita e restituisce la disponibilità del pin d'ingresso al Palazzo di Kaneshiro. */
    const stato = async () => ((await request(app).get(`/api/mappe/${citta.chiave}?partita=${partita}`)).body.data as MappaDto).spilli.find((s) => s.id === ingresso.id)!.disponibilita;
    expect((await stato())?.stato).not.toBe('bloccato');
    const finale = bossFinali().get('kaneshiro')!;
    prepared("INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at) VALUES (?, ?, 'ottenuto', 'x')").run(partita, finale.punti[0]);
    const dopo = await stato();
    expect(dopo?.stato).toBe('bloccato');
    expect(dopo?.requisiti.at(-1)?.dettaglio).toMatch(/completato \(boss finale segnato nella Guida\), non ci si entra più/);
    // dentro il Palazzo le planimetrie restano consultabili: i passaggi fra le sue stanze non spariscono
    const interna = albero('kaneshiro').find((k) => k !== 'dungeon-kaneshiro')!;
    const passaggio = (await request(app).post(`/api/mappe/${interna}/spilli`).send({ tipo: 'passaggio', nome: 'Verso la radice', x: 10, y: 10, riferimento: { tipo: 'mappa', chiave: 'dungeon-kaneshiro' } })).body.data as { id: number };
    const dentro = ((await request(app).get(`/api/mappe/${interna}?partita=${partita}`)).body.data as MappaDto).spilli.find((s) => s.id === passaggio.id)!;
    expect(dentro.disponibilita?.stato).not.toBe('bloccato');
  });
});
