// ============================================================
// Un Palazzo completato è completato, qualunque sia la data (richiesta dell'utente, 2026-09-30)
// ============================================================
//
// «Gli interruttori che si attivano al completamento di un Palazzo non verificano lo stato effettivo… (così come
// la visibilità dello stesso sulla mappa) se un palazzo è completato al 100% bisogna che gli eventi diano quel
// palazzo come completato a prescindere dalla data di scadenza», con l'Ombra di Kamoshida segnata raccolta sulla
// mappa. Poi (2026-09-30) il boss della Guida scattava col Tesoro del Palazzo o col boss finale e si segnava e toglieva da
// solo (superato il 2026-10-04, qui sotto); resta la scelta dell'utente: l'ingresso sparisce a Palazzo completato.
//
// Dal 2026-10-04 (scelta dell'utente: «devono essere entrambe valide le condizioni sono in AND non in OR», poi «Tesoro +
// boss + raccolto tutto») servono tutte e tre insieme: Tesoro del Palazzo raccolto, boss finale sconfitto (spillo raccolto
// o segnato nella Guida) e il 100% del raccolto. Il boss da solo non basta più: si può affrontare più volte dentro un Palazzo.
// E il boss della Guida non si segna più da solo raccogliendo Tesoro o boss («Togli l'automatismo», utente 017).
// ============================================================

import request from 'supertest';
import { closeDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { creaMappa } from '../services/mappe/mappeService.js';
import { statoPartitaSemafori, valuta } from '../services/semaforiService.js';
import { bossFinali, palazziCompletati, statoPalazzi } from '../services/palazziService.js';
import type { DungeonRiassuntoDto, MappaDto } from '../../shared/types.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();

/** Le planimetrie di un Palazzo: l'albero sotto `dungeon-<chiave>`. */
const albero = (dungeon: string): string[] => (prepared(`WITH RECURSIVE a(chiave) AS (SELECT ? UNION ALL SELECT m.chiave FROM mappa m JOIN a ON m.genitore_chiave = a.chiave) SELECT chiave FROM a`)
  .all(`dungeon-${dungeon}`) as Array<{ chiave: string }>).map((r) => r.chiave);
/** I collezionabili delle planimetrie di un Palazzo, con tipo e uid. */
const collezionabili = (dungeon: string) => {
  const mappe = albero(dungeon);
  return prepared(`SELECT id, uid, tipo FROM spillo WHERE collezionabile = 1 AND uid IS NOT NULL AND mappa_chiave IN (${mappe.map(() => '?').join(',')})`).all(...mappe) as Array<{ id: number; uid: string; tipo: string }>;
};

describe('Palazzo completato: Tesoro, boss finale e raccolto tutto, insieme', () => {
  let partita: number;
  /** Vero se la voce della guida `punto` (il boss) risulta segnata nella partita di prova. */
  const bossGuida = (punto: string) => !!prepared('SELECT 1 FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').get(partita, punto);
  /** Segna (o toglie il segno) dello spillo nella partita di prova, pretendendo il 200. */
  const segna = (spillo: number, raccolto: boolean) => request(app).put(`/api/partite/${partita}/spilli/${spillo}`).send({ raccolto }).expect(200);
  /** Valuta, sullo stato dei semafori della partita, un requisito di Confidente «Completare il Palazzo» del dungeon dato. */
  const requisito = (dungeon: string) => valuta({ confidente_chiave: 'prova', rango: 1, indice: 0, tipo: 'palazzo', dati_json: JSON.stringify({ dungeon }), testo: 'Completare il Palazzo' }, statoPartitaSemafori(partita, new Map(), new Map()));
  /** Segna raccolti, direttamente, i collezionabili del Palazzo che rispondono al filtro (per preparare il resto del 100%). */
  const raccogliTutti = (dungeon: string, filtro: (s: { tipo: string }) => boolean = () => true) => {
    for (const s of collezionabili(dungeon).filter(filtro)) prepared("INSERT INTO spillo_partita (partita_id, spillo_uid, raccolto, updated_at) VALUES (?, ?, 1, 'x') ON CONFLICT(partita_id, spillo_uid) DO UPDATE SET raccolto = 1").run(partita, s.uid);
  };
  /** Crea uno spillo dato sulla prima planimetria del Palazzo e lo restituisce. */
  const spilloNuovo = async (dungeon: string, tipo: string, nome: string) => {
    const mappa = creaMappa(undefined, { nome: `${nome} di prova (${dungeon})`, tipo: 'area', genitore: `dungeon-${dungeon}` });
    return (await request(app).post(`/api/mappe/${mappa.chiave}/spilli`).send({ tipo, nome, x: 50, y: 50 })).body.data as { id: number };
  };

  beforeAll(async () => {
    dbDiProva();
    partita = ((await request(app).post('/api/partite').send({ nome: 'Prova Palazzi' })).body.data as { id: number }).id;
    // il giorno dopo il furto: la data non deve contare
    prepared("UPDATE partita SET data_gioco = '04-22' WHERE id = ?").run(partita);
  });
  afterAll(() => closeDb());

  it('il boss finale raccolto sulla mappa da solo non completa il Palazzo, e non segna niente nella Guida', async () => {
    const finale = bossFinali().get('kamoshida')!;
    expect(finale.punti.length).toBeGreaterThan(0);
    // come nei dati veri: l'area finale di Kamoshida non è legata a nessuna planimetria, ma Kamoshida non ha boss
    // intermedi, e l'«Ombra di Kamoshida» messa su una planimetria qualunque del Palazzo è il boss finale
    expect(finale.unico).toBe(true);
    const boss = await spilloNuovo('kamoshida', 'boss', 'Ombra di Kamoshida');
    await segna(boss.id, true);
    // raccogliere il boss non segna più da solo il boss della Guida (scelta dell'utente, 2026-10-04: «Togli l'automatismo»)
    expect(finale.punti.some(bossGuida)).toBe(false);
    // il boss si può affrontare più volte: da solo non dice che il Palazzo è finito (rilievo dell'utente, 2026-10-04)
    expect(palazziCompletati(partita).has('kamoshida')).toBe(false);
    const esito = requisito('kamoshida');
    expect(esito.stato).toBe('rosso');
    // si dice che cosa manca: il Tesoro e il resto del raccolto, non il boss
    expect(esito.dettaglio).toMatch(/^Palazzo di Kamoshida: non risulta completato — manca il Tesoro del Palazzo raccolto, tutto il raccolto \(\d+\/\d+\) \(Guida → Palazzi\)$/);
    await segna(boss.id, false);
    expect(finale.punti.some(bossGuida)).toBe(false);
  });

  it('Tesoro, boss finale e 100% insieme completano il Palazzo; ne manca uno e non è completato', async () => {
    const finale = bossFinali().get('kamoshida')!;
    const tesoro = collezionabili('kamoshida').find((s) => s.tipo === 'tesoro-palazzo')!;
    expect(tesoro).toBeTruthy();
    // Kamoshida non ha boss intermedi: ogni spillo «Boss» delle sue planimetrie vale come il finale
    const bossi = collezionabili('kamoshida').filter((s) => s.tipo === 'boss');
    expect(bossi.length).toBeGreaterThan(0);
    // tutto raccolto tranne il Tesoro
    raccogliTutti('kamoshida', (s) => s.tipo !== 'tesoro-palazzo');
    expect(statoPalazzi(partita).get('kamoshida')).toEqual({ completato: null, manca: expect.stringMatching(/^il Tesoro del Palazzo raccolto, tutto il raccolto \(\d+\/\d+\)$/) });
    // il Tesoro: ora valgono tutte e tre
    await segna(tesoro.id, true);
    const n = collezionabili('kamoshida').length;
    expect(palazziCompletati(partita).get('kamoshida')).toBe(`Tesoro, boss finale e raccolto tutto (${n}/${n})`);
    expect(requisito('kamoshida')).toMatchObject({ stato: 'verde', dettaglio: `Palazzo di Kamoshida: completato (Tesoro, boss finale e raccolto tutto (${n}/${n}))` });
    // l'elenco dei Palazzi e la scheda lo dicono, col perché: la mappa di Tokyo lo toglie anche dentro la sua finestra
    const elenco = async (q = `?partita=${partita}`) => ((await request(app).get(`/api/compendio/dungeon${q}`)).body.data as DungeonRiassuntoDto[]).find((d) => d.chiave === 'kamoshida')!;
    expect((await elenco()).completato).toBe(palazziCompletati(partita).get('kamoshida'));
    expect((await request(app).get(`/api/compendio/dungeon/kamoshida?partita=${partita}`)).body.data.completato).toBe(palazziCompletati(partita).get('kamoshida'));
    expect((await elenco('')).completato).toBeNull();
    // il Tesoro non ha segnato niente nella Guida
    expect(finale.punti.some(bossGuida)).toBe(false);
    // tolti gli spilli del boss finale: non è più completato, e mancano il boss e il resto del raccolto
    for (const b of bossi) await segna(b.id, false);
    expect(statoPalazzi(partita).get('kamoshida')).toEqual({ completato: null, manca: `il boss finale sconfitto, tutto il raccolto (${n - bossi.length}/${n})` });
    for (const b of bossi) await segna(b.id, true);
    expect(palazziCompletati(partita).has('kamoshida')).toBe(true);
  });

  it('senza spilli «Boss» sulla mappa il boss finale si dice sconfitto dalla Guida; togliere il Tesoro non lo cancella', async () => {
    // Okumura senza spilli «Boss» sulle planimetrie: il boss si può dire sconfitto solo dalla Guida
    const mappe = albero('okumura');
    prepared(`DELETE FROM spillo WHERE tipo = 'boss' AND mappa_chiave IN (${mappe.map(() => '?').join(',')})`).run(...mappe);
    const finale = bossFinali().get('okumura')!;
    if (!collezionabili('okumura').some((s) => s.tipo === 'tesoro-palazzo')) await spilloNuovo('okumura', 'tesoro-palazzo', 'Tesoro del Palazzo');
    const tesoro = collezionabili('okumura').find((s) => s.tipo === 'tesoro-palazzo')!;
    raccogliTutti('okumura', (s) => s.tipo !== 'tesoro-palazzo');
    await segna(tesoro.id, true);
    // il Tesoro non segna il boss: manca solo quello
    expect(finale.punti.some(bossGuida)).toBe(false);
    expect(statoPalazzi(partita).get('okumura')).toEqual({ completato: null, manca: 'il boss finale sconfitto' });
    // segnato dall'utente nella Guida: ora sì
    await request(app).put(`/api/partite/${partita}/punti`).send({ punto: finale.punti[0], stato: 'ottenuto' }).expect(200);
    expect(palazziCompletati(partita).get('okumura')).toMatch(/^Tesoro, boss finale e raccolto tutto \(\d+\/\d+\)$/);
    // togliere e rimettere il Tesoro non tocca il boss della Guida
    await segna(tesoro.id, false);
    expect(prepared('SELECT stato FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').get(partita, finale.punti[0])).toEqual({ stato: 'ottenuto' });
    expect(statoPalazzi(partita).get('okumura')?.manca).toBe('il Tesoro del Palazzo raccolto, tutto il raccolto (' + (collezionabili('okumura').length - 1) + '/' + collezionabili('okumura').length + ')');
    await segna(tesoro.id, true);
    expect(palazziCompletati(partita).has('okumura')).toBe(true);
  });

  it('con lo spillo del boss collegato alla voce del boss finale, il Tesoro raccolto non raccoglie il boss né completa il Palazzo', async () => {
    // il caso del validatore: prima il Tesoro segnava il boss della Guida, e la voce segnata raccoglieva il pin collegato
    const finale = bossFinali().get('niijima')!;
    const mappe = albero('niijima');
    prepared(`DELETE FROM spillo WHERE tipo = 'boss' AND mappa_chiave IN (${mappe.map(() => '?').join(',')})`).run(...mappe);
    const tesoro = collezionabili('niijima').find((s) => s.tipo === 'tesoro-palazzo') ?? await spilloNuovo('niijima', 'tesoro-palazzo', 'Tesoro del Palazzo');
    const boss = await spilloNuovo('niijima', 'boss', 'Sae Niijima');
    await request(app).put(`/api/compendio/punti/${encodeURIComponent(finale.punti[0])}/pin/${boss.id}`).send({}).expect(200);
    raccogliTutti('niijima', (s) => s.tipo !== 'tesoro-palazzo' && s.tipo !== 'boss');
    await segna(tesoro.id, true);
    /** Vero se lo spillo del boss risulta raccolto nella partita. */
    const bossRaccolto = () => !!prepared('SELECT 1 FROM spillo_partita WHERE partita_id = ? AND spillo_uid = (SELECT uid FROM spillo WHERE id = ?) AND raccolto = 1').get(partita, boss.id);
    expect(finale.punti.some(bossGuida)).toBe(false);
    expect(bossRaccolto()).toBe(false);
    expect(statoPalazzi(partita).get('niijima')?.manca).toMatch(/^il boss finale sconfitto, tutto il raccolto/);
    // segnato dall'utente dalla Guida: il pin collegato lo segue, e il Palazzo è completato
    await request(app).put(`/api/partite/${partita}/punti`).send({ punto: finale.punti[0], stato: 'ottenuto' }).expect(200);
    expect(bossRaccolto()).toBe(true);
    expect(palazziCompletati(partita).get('niijima')).toMatch(/^Tesoro, boss finale e raccolto tutto \(\d+\/\d+\)$/);
  });

  it('senza lo spillo «Tesoro del Palazzo» un Palazzo non si completa, nemmeno al 100% e col boss segnato', async () => {
    const mappe = albero('madarame');
    prepared(`DELETE FROM spillo WHERE tipo = 'tesoro-palazzo' AND mappa_chiave IN (${mappe.map(() => '?').join(',')})`).run(...mappe);
    raccogliTutti('madarame');
    const finale = bossFinali().get('madarame')!;
    await request(app).put(`/api/partite/${partita}/punti`).send({ punto: finale.punti[0], stato: 'ottenuto' }).expect(200);
    expect(statoPalazzi(partita).get('madarame')).toEqual({ completato: null, manca: 'lo spillo «Tesoro del Palazzo» sulle planimetrie' });
    expect(requisito('madarame').dettaglio).toBe('Palazzo di Madarame: non risulta completato — manca lo spillo «Tesoro del Palazzo» sulle planimetrie (Guida → Palazzi)');
  });

  it('un boss che non è il finale non vale come boss sconfitto (Shido: i boss intermedi prima dell’Aula magna)', async () => {
    const finale = bossFinali().get('shido')!;
    expect(finale.unico).toBe(false);
    const intermedio = prepared(`SELECT pi.chiave FROM punto_interesse pi JOIN dungeon_area a ON a.chiave = pi.area_chiave
      WHERE a.dungeon_chiave = 'shido' AND pi.tipo = 'boss' AND a.chiave <> ? LIMIT 1`).get(finale.area) as { chiave: string } | undefined;
    expect(intermedio).toBeTruthy();
    // Shido con Tesoro e tutto raccolto, ma con i soli boss intermedi: gli spilli «Boss» delle sue planimetrie non sono il finale
    const mappe = albero('shido');
    prepared(`DELETE FROM spillo WHERE tipo = 'boss' AND mappa_chiave IN (${mappe.map(() => '?').join(',')})`).run(...mappe);
    if (!collezionabili('shido').some((s) => s.tipo === 'tesoro-palazzo')) await spilloNuovo('shido', 'tesoro-palazzo', 'Tesoro del Palazzo');
    const akechi = await spilloNuovo('shido', 'boss', 'Akechi');
    raccogliTutti('shido', (s) => s.tipo !== 'tesoro-palazzo');
    await request(app).put(`/api/partite/${partita}/punti`).send({ punto: intermedio!.chiave, stato: 'ottenuto' }).expect(200);
    const tesoro = collezionabili('shido').find((s) => s.tipo === 'tesoro-palazzo')!;
    // Tesoro raccolto e tutto il resto: Akechi, raccolto, non vale come boss finale
    await segna(tesoro.id, true);
    expect(prepared('SELECT 1 FROM spillo_partita WHERE partita_id = ? AND spillo_uid = (SELECT uid FROM spillo WHERE id = ?) AND raccolto = 1').get(partita, akechi.id)).toBeTruthy();
    expect(statoPalazzi(partita).get('shido')?.manca).toMatch(/il boss finale sconfitto/);
    // il boss finale segnato dall'utente nella Guida sì
    await request(app).put(`/api/partite/${partita}/punti`).send({ punto: finale.punti[0], stato: 'ottenuto' }).expect(200);
    expect(palazziCompletati(partita).get('shido')).toMatch(/^Tesoro, boss finale e raccolto tutto \(\d+\/\d+\)$/);
  });

  it('l’ingresso vero (lo spillo della Shujin modificato a mano, senza più collegamento) sparisce a Palazzo completato', async () => {
    // lo spillo 1616: oggi «punto sensibile» senza riferimento; la sua identità di seed è il passaggio verso dungeon-kamoshida
    const vero = prepared("SELECT id, mappa_chiave, riferimento_tipo FROM spillo WHERE seed_identita_json LIKE '%\"dungeon-kamoshida\"%' AND mappa_chiave NOT LIKE 'dungeon-%'").get() as { id: number; mappa_chiave: string; riferimento_tipo: string | null };
    expect(vero.riferimento_tipo).toBeNull();
    // Kamoshida è completato dal secondo test (Tesoro, boss e 100%): siamo il 22 aprile, dentro la finestra 11/4–2/5 (097)
    expect(palazziCompletati(partita).has('kamoshida')).toBe(true);
    const spillo = ((await request(app).get(`/api/mappe/${vero.mappa_chiave}?partita=${partita}`)).body.data as MappaDto).spilli.find((s) => s.id === vero.id)!;
    expect(spillo.disponibilita?.stato).toBe('bloccato');
    expect(spillo.disponibilita?.requisiti.at(-1)?.dettaglio).toMatch(/Palazzo di Kamoshida: completato \(Tesoro, boss finale e raccolto tutto .*\), non ci si entra più/);
  });

  it('l’ingresso a un Palazzo completato sparisce dalla mappa, anche prima della scadenza; non prima che sia completato', async () => {
    const citta = prepared("SELECT chiave FROM mappa WHERE chiave LIKE 'citta-%' LIMIT 1").get() as { chiave: string };
    const ingresso = (await request(app).post(`/api/mappe/${citta.chiave}/spilli`).send({ tipo: 'passaggio', nome: 'Palazzo di Kaneshiro', x: 20, y: 20, riferimento: { tipo: 'mappa', chiave: 'dungeon-kaneshiro' } })).body.data as { id: number };
    /** Rilegge la mappa della città con la partita e restituisce la disponibilità del pin d'ingresso al Palazzo di Kaneshiro. */
    const stato = async () => ((await request(app).get(`/api/mappe/${citta.chiave}?partita=${partita}`)).body.data as MappaDto).spilli.find((s) => s.id === ingresso.id)!.disponibilita;
    expect((await stato())?.stato).not.toBe('bloccato');
    // il boss finale segnato nella Guida da solo non basta più
    const finale = bossFinali().get('kaneshiro')!;
    await request(app).put(`/api/partite/${partita}/punti`).send({ punto: finale.punti[0], stato: 'ottenuto' }).expect(200);
    expect((await stato())?.stato).not.toBe('bloccato');
    // con Tesoro e tutto il raccolto sì
    if (!collezionabili('kaneshiro').some((s) => s.tipo === 'tesoro-palazzo')) await spilloNuovo('kaneshiro', 'tesoro-palazzo', 'Tesoro del Palazzo');
    raccogliTutti('kaneshiro');
    const dopo = await stato();
    expect(dopo?.stato).toBe('bloccato');
    expect(dopo?.requisiti.at(-1)?.dettaglio).toMatch(/completato \(Tesoro, boss finale e raccolto tutto \(\d+\/\d+\)\), non ci si entra più/);
    // dentro il Palazzo le planimetrie restano consultabili: i passaggi fra le sue stanze non spariscono
    const interna = albero('kaneshiro').find((k) => k !== 'dungeon-kaneshiro')!;
    const passaggio = (await request(app).post(`/api/mappe/${interna}/spilli`).send({ tipo: 'passaggio', nome: 'Verso la radice', x: 10, y: 10, riferimento: { tipo: 'mappa', chiave: 'dungeon-kaneshiro' } })).body.data as { id: number };
    const dentro = ((await request(app).get(`/api/mappe/${interna}?partita=${partita}`)).body.data as MappaDto).spilli.find((s) => s.id === passaggio.id)!;
    expect(dentro.disponibilita?.stato).not.toBe('bloccato');
  });

  it('i Memento non si completano sulla mappa: anche con un boss segnato nella Guida restano sulla mappa di Tokyo', async () => {
    // il boss finale dei Memento secondo la regola; se il pacchetto non ne ha, se ne crea uno nell'ultima area
    // (la Guida è modificabile al 100%: il caso è possibile)
    if (!bossFinali().get('mementos')) {
      const area = prepared("SELECT chiave FROM dungeon_area WHERE dungeon_chiave = 'mementos' ORDER BY ordine DESC LIMIT 1").pluck().get() as string;
      prepared("INSERT INTO punto_interesse (chiave, area_chiave, ordine, tipo, nome, descrizione, esauribile, dettagli_json, fonte) VALUES ('mementos-boss-di-prova', ?, 999, 'boss', 'Boss di prova', '', 0, '{}', '')").run(area);
    }
    const punto = bossFinali().get('mementos')!.punti[0];
    prepared("INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at) VALUES (?, ?, 'ottenuto', 'x') ON CONFLICT DO NOTHING").run(partita, punto);
    // i Memento non hanno planimetrie: per la regola restano completati dal boss segnato nella Guida, come prima
    expect(palazziCompletati(partita).get('mementos')).toBe('boss finale segnato nella Guida');
    // per l'elenco no, perché non è un Palazzo
    const memento = ((await request(app).get(`/api/compendio/dungeon?partita=${partita}`)).body.data as DungeonRiassuntoDto[]).find((d) => d.chiave === 'mementos')!;
    expect(memento.completato).toBeNull();
    expect((await request(app).get(`/api/compendio/dungeon/mementos?partita=${partita}`)).body.data.completato).toBeNull();
    prepared('DELETE FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').run(partita, punto);
  });
});
