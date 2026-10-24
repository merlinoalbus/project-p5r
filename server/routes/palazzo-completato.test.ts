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
// Da L4 (2026-10-20, «Avanzamento unico», lotti/L4/modifiche.md §1.5) «raccolto tutto» è «tutti gli oggetti permanenti» della guida del
// Palazzo (le voci permanenti, una volta ciascun oggetto), il Tesoro è il pin `tesoro-palazzo` con la regola del pin, il boss finale la
// sua voce o il suo pin. La voce del boss finale è permanente: per il 100% serve comunque fatta.
// Dal 2026-10-20 (decisione dell'utente, §8.10) i livelli sono due: **concluso** (Tesoro e boss finale) governa gli effetti —
// ingressi, mappa di Tokyo, requisiti e condizioni —; **completato** (concluso e tutti gli oggetti permanenti) vale solo per l'anello.
// ============================================================

import request from 'supertest';
import { closeDb, getDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { planimetriaDiPalazzo } from '../../test/planimetriaDiPalazzo.js';
import { statoPartitaSemafori, valuta } from '../services/semaforiService.js';
import { palazziCompletati, palazziConclusi, statoPalazzi } from '../services/palazziService.js';
import { modelloAvanzamento } from '../services/mappe/statiGuida.js';
import type { DungeonRiassuntoDto, MappaDto } from '../../shared/types.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();

/** L'ex euristica `bossFinali` del servizio (tolta con L11 R11-02b/2): l'ultima area in ordine di guida con punti «boss» di ogni dungeon, qui solo per trovare la voce da segnare. */
function bossFinali(): Map<string, { area: string; punti: string[]; unico: boolean }> {
  const righe = prepared(`SELECT a.dungeon_chiave AS dungeon, a.chiave AS area, a.ordine AS ordine, pi.chiave AS punto
    FROM punto_interesse pi JOIN dungeon_area a ON a.chiave = pi.area_chiave WHERE pi.tipo = 'boss' ORDER BY a.dungeon_chiave, a.ordine, pi.ordine`).all() as Array<{ dungeon: string; area: string; ordine: number; punto: string }>;
  const out = new Map<string, { area: string; ordine: number; punti: string[]; aree: Set<string> }>();
  for (const r of righe) {
    const attuale = out.get(r.dungeon);
    if (!attuale) out.set(r.dungeon, { area: r.area, ordine: r.ordine, punti: [r.punto], aree: new Set([r.area]) });
    else {
      attuale.aree.add(r.area);
      if (r.ordine > attuale.ordine) Object.assign(attuale, { area: r.area, ordine: r.ordine, punti: [r.punto] });
      else if (r.ordine === attuale.ordine) attuale.punti.push(r.punto);
    }
  }
  return new Map([...out].map(([k, v]) => [k, { area: v.area, punti: v.punti, unico: v.aree.size === 1 }]));
}

/** Le planimetrie di un Palazzo: l'albero sotto `dungeon-<chiave>`. */
const albero = (dungeon: string): string[] => (prepared(`WITH RECURSIVE a(chiave) AS (SELECT ? UNION ALL SELECT m.chiave FROM mappa m JOIN a ON m.genitore_chiave = a.chiave) SELECT chiave FROM a`)
  .all(`dungeon-${dungeon}`) as Array<{ chiave: string }>).map((r) => r.chiave);
/** I collezionabili delle planimetrie di un Palazzo, con tipo e uid. */
const collezionabili = (dungeon: string) => {
  const mappe = albero(dungeon);
  return prepared(`SELECT id, uid, tipo FROM spillo WHERE collezionabile = 1 AND uid IS NOT NULL AND mappa_chiave IN (${mappe.map(() => '?').join(',')})`).all(...mappe) as Array<{ id: number; uid: string; tipo: string }>;
};
/** Le voci permanenti della guida di un Palazzo (L4) e quanti oggetti fanno. */
const permanenti = (dungeon: string) => {
  const m = modelloAvanzamento(getDb());
  const voci = [...m.voci.values()].filter((v) => v.palazzo === dungeon && v.carattere === 'permanente').map((v) => v.chiave);
  return { voci, oggetti: new Set(voci.map((v) => m.oggetto.get(v))).size };
};

describe('Palazzo completato: Tesoro, boss finale e tutti gli oggetti permanenti, insieme', () => {
  let partita: number;
  /** Vero se la voce della guida `punto` (il boss) risulta segnata nella partita di prova. */
  const bossGuida = (punto: string) => !!prepared('SELECT 1 FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').get(partita, punto);
  /** Segna (o toglie il segno) dello spillo nella partita di prova, pretendendo il 200. */
  const segna = (spillo: number, raccolto: boolean) => request(app).put(`/api/partite/${partita}/spilli/${spillo}`).send({ raccolto }).expect(200);
  /** Segna (o riapre) una voce dalla Guida, pretendendo il 200. */
  const voce = (punto: string, stato: 'ottenuto' | null) => request(app).put(`/api/partite/${partita}/punti`).send({ punto, stato }).expect(200);
  /** Valuta, sullo stato dei semafori della partita, un requisito di Confidente «Completare il Palazzo» del dungeon dato. */
  const requisito = (dungeon: string) => valuta({ confidente_chiave: 'prova', rango: 1, indice: 0, tipo: 'palazzo', dati_json: JSON.stringify({ dungeon }), testo: 'Completare il Palazzo' }, statoPartitaSemafori(partita, new Map(), new Map()));
  /** Segna, direttamente, le voci permanenti del Palazzo (tranne quelle date): il resto del 100% (L4). */
  const segnaPermanenti = (dungeon: string, tranne: readonly string[] = []) => {
    for (const v of permanenti(dungeon).voci) if (!tranne.includes(v)) prepared("INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at) VALUES (?, ?, 'ottenuto', 'x') ON CONFLICT DO NOTHING").run(partita, v);
  };
  /** Segna raccolto, direttamente, il pin del Tesoro (che nei dati di prova non ha voci: il suo stato è il suo). */
  const raccogliTesoro = (dungeon: string) => {
    for (const s of collezionabili(dungeon).filter((x) => x.tipo === 'tesoro-palazzo')) prepared("INSERT INTO spillo_partita (partita_id, spillo_uid, raccolto, updated_at) VALUES (?, ?, 1, 'x') ON CONFLICT(partita_id, spillo_uid) DO UPDATE SET raccolto = 1").run(partita, s.uid);
  };
  /** Crea uno spillo dato sulla prima planimetria del Palazzo e lo restituisce. */
  const spilloNuovo = async (dungeon: string, tipo: string, nome: string) => {
    const mappa = planimetriaDiPalazzo(dungeon, { nome: `${nome} di prova (${dungeon})` });
    return (await request(app).post(`/api/mappe/${mappa.chiave}/spilli`).send({ tipo, nome, x: 50, y: 50 })).body.data as { id: number };
  };

  /** La voce del boss finale dichiarata del Palazzo (§8.14, `dungeon.voce_boss_finale`). */
  const bossDi = (dungeon: string) => prepared('SELECT voce_boss_finale FROM dungeon WHERE chiave = ?').pluck().get(dungeon) as string;

  beforeAll(async () => {
    dbDiProva();
    partita = ((await request(app).post('/api/partite').send({ nome: 'Prova Palazzi' })).body.data as { id: number }).id;
    // il giorno dopo il furto: la data non deve contare
    prepared("UPDATE partita SET data_gioco = '04-22' WHERE id = ?").run(partita);
    // §8.14: il pacchetto dei test è di prima della voce «Sconfiggi Kamoshida» di G-027 (la 112 lascia NULL): la voce del boss finale si
    // dichiara con «Modifica › Boss finale», l'unica voce «Boss» del Palazzo in questi dati
    const boss = bossFinali().get('kamoshida')!.punti[0];
    await request(app).put('/api/compendio/dungeon/kamoshida').send({ voceBossFinale: boss }).expect(200);
    expect(bossDi('kamoshida')).toBe(boss);
  });
  afterAll(() => closeDb());

  it('§8.14 — un pin «Boss» che non è della voce del boss finale non conta (il caso del pin del tutorial di Kamoshida), e non segna niente nella Guida', async () => {
    const boss = await spilloNuovo('kamoshida', 'boss', 'Ombra di Kamoshida');
    await segna(boss.id, true);
    // raccogliere il boss non segna più da solo il boss della Guida (scelta dell'utente, 2026-10-04: «Togli l'automatismo»)
    expect(bossGuida(bossDi('kamoshida'))).toBe(false);
    // il boss è solo la voce dichiarata (§8.14): prima, a Kamoshida «unico», bastava qualunque pin «Boss»
    expect(statoPalazzi(partita).get('kamoshida')?.completamento?.boss).toBe(false);
    expect(palazziCompletati(partita).has('kamoshida')).toBe(false);
    expect(palazziConclusi(partita).has('kamoshida')).toBe(false);
    const esito = requisito('kamoshida');
    expect(esito.stato).toBe('rosso');
    // si dice che cosa manca al furto (§8.10): il Tesoro e il boss; gli oggetti permanenti non servono agli effetti
    expect(esito.dettaglio).toBe('Palazzo di Kamoshida: non risulta concluso — manca il Tesoro del Palazzo raccolto, il boss finale sconfitto (Guida → Palazzi)');
    expect(statoPalazzi(partita).get('kamoshida')?.manca).toBe(`il Tesoro del Palazzo raccolto, il boss finale sconfitto, tutti gli oggetti permanenti (0/${permanenti('kamoshida').oggetti})`);
    await segna(boss.id, false);
    expect(bossGuida(bossDi('kamoshida'))).toBe(false);
  });

  it('Tesoro, boss finale e tutti gli oggetti permanenti insieme completano il Palazzo; ne manca uno e non è completato', async () => {
    const boss = bossDi('kamoshida');
    const tesoro = collezionabili('kamoshida').find((s) => s.tipo === 'tesoro-palazzo')!;
    expect(tesoro).toBeTruthy();
    // gli spilli «Boss» delle planimetrie, non collegati alla voce del boss finale
    const bossi = collezionabili('kamoshida').filter((s) => s.tipo === 'boss');
    expect(bossi.length).toBeGreaterThan(0);
    // tutte le voci permanenti (il boss finale compreso), ma non il Tesoro
    segnaPermanenti('kamoshida');
    const n = permanenti('kamoshida').oggetti;
    expect(statoPalazzi(partita).get('kamoshida')).toMatchObject({ concluso: null, mancaPerConcludere: 'il Tesoro del Palazzo raccolto', completato: null, manca: 'il Tesoro del Palazzo raccolto',
      completamento: { oggetti: n, fatti: n, tesoro: false, boss: true, concluso: false, completato: false } });
    // il Tesoro: ora valgono tutte e tre
    const vociPrima = prepared('SELECT COUNT(*) FROM punto_partita WHERE partita_id = ?').pluck().get(partita);
    await segna(tesoro.id, true);
    expect(palazziCompletati(partita).get('kamoshida')).toBe(`Tesoro, boss finale e tutti gli oggetti permanenti (${n}/${n})`);
    expect(palazziConclusi(partita).get('kamoshida')).toBe('Tesoro e boss finale');
    expect(requisito('kamoshida')).toMatchObject({ stato: 'verde', dettaglio: 'Palazzo di Kamoshida: concluso (Tesoro e boss finale)' });
    // l'elenco dei Palazzi e la scheda lo dicono, col perché: la mappa di Tokyo lo toglie anche dentro la sua finestra
    const elenco = async (q = `?partita=${partita}`) => ((await request(app).get(`/api/compendio/dungeon${q}`)).body.data as DungeonRiassuntoDto[]).find((d) => d.chiave === 'kamoshida')!;
    expect((await elenco()).completato).toBe(palazziCompletati(partita).get('kamoshida'));
    expect((await elenco()).concluso).toBe('Tesoro e boss finale');
    expect((await elenco()).completamento).toEqual({ oggetti: n, fatti: n, tesoro: true, boss: true, concluso: true, completato: true });
    const scheda = (await request(app).get(`/api/compendio/dungeon/kamoshida?partita=${partita}`)).body.data as DungeonRiassuntoDto;
    expect(scheda.completato).toBe(palazziCompletati(partita).get('kamoshida'));
    expect(scheda.concluso).toBe('Tesoro e boss finale');
    expect((await elenco('')).completato).toBeNull();
    expect((await elenco('')).concluso).toBeNull();
    expect((await elenco('')).completamento).toEqual({ oggetti: n, fatti: null, tesoro: null, boss: null, concluso: null, completato: null });
    // il Tesoro non ha segnato niente nella Guida
    expect(prepared('SELECT COUNT(*) FROM punto_partita WHERE partita_id = ?').pluck().get(partita)).toBe(vociPrima);
    // riaperto il boss finale nella Guida: non è più né concluso né completato, e mancano il boss e il suo oggetto
    await voce(boss, null);
    expect(statoPalazzi(partita).get('kamoshida')).toMatchObject({ concluso: null, mancaPerConcludere: 'il boss finale sconfitto', completato: null, manca: `il boss finale sconfitto, tutti gli oggetti permanenti (${n - 1}/${n})` });
    // §8.14: gli spilli «Boss» raccolti che non sono della voce del boss finale non dicono il boss sconfitto
    for (const b of bossi) await segna(b.id, true);
    expect(statoPalazzi(partita).get('kamoshida')).toMatchObject({ concluso: null, mancaPerConcludere: 'il boss finale sconfitto' });
    await voce(boss, 'ottenuto');
    expect(palazziCompletati(partita).has('kamoshida')).toBe(true);
  });

  it('senza spilli «Boss» sulla mappa il boss finale si dice sconfitto dalla Guida; togliere il Tesoro non lo cancella', async () => {
    // Okumura senza spilli «Boss» sulle planimetrie: il boss si può dire sconfitto solo dalla Guida (la voce di G-027, migrazione 112)
    const mappe = albero('okumura');
    prepared(`DELETE FROM spillo WHERE tipo = 'boss' AND mappa_chiave IN (${mappe.map(() => '?').join(',')})`).run(...mappe);
    const boss = bossDi('okumura');
    expect(boss).toBe('okumura-10-produzione-armamenti/6');
    if (!collezionabili('okumura').some((s) => s.tipo === 'tesoro-palazzo')) await spilloNuovo('okumura', 'tesoro-palazzo', 'Tesoro del Palazzo');
    const tesoro = collezionabili('okumura').find((s) => s.tipo === 'tesoro-palazzo')!;
    segnaPermanenti('okumura', [boss]);
    await segna(tesoro.id, true);
    // il Tesoro non segna il boss: mancano il boss e il suo oggetto permanente
    const n = permanenti('okumura').oggetti;
    expect(bossGuida(boss)).toBe(false);
    expect(statoPalazzi(partita).get('okumura')).toMatchObject({ completato: null, manca: `il boss finale sconfitto, tutti gli oggetti permanenti (${n - 1}/${n})` });
    // segnato dall'utente nella Guida: ora sì
    await voce(boss, 'ottenuto');
    expect(palazziCompletati(partita).get('okumura')).toBe(`Tesoro, boss finale e tutti gli oggetti permanenti (${n}/${n})`);
    // togliere e rimettere il Tesoro non tocca il boss della Guida
    await segna(tesoro.id, false);
    expect(prepared('SELECT stato FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').get(partita, boss)).toEqual({ stato: 'ottenuto' });
    expect(statoPalazzi(partita).get('okumura')?.manca).toBe('il Tesoro del Palazzo raccolto');
    await segna(tesoro.id, true);
    expect(palazziCompletati(partita).has('okumura')).toBe(true);
  });

  it('con lo spillo del boss collegato alla voce del boss finale, il Tesoro raccolto non fa il boss né completa il Palazzo', async () => {
    // il caso del validatore: prima il Tesoro segnava il boss della Guida, e la voce segnata raccoglieva il pin collegato
    const finale = bossFinali().get('niijima')!;
    // §8.14: il boss finale di Niijima è la Fase 2 (G-027), non la prima fase che bastava prima
    const voceBoss = bossDi('niijima');
    expect(voceBoss).toBe('niijima-14-direzione-sala-del-boss/1');
    const mappe = albero('niijima');
    prepared(`DELETE FROM spillo WHERE tipo = 'boss' AND mappa_chiave IN (${mappe.map(() => '?').join(',')})`).run(...mappe);
    const tesoro = collezionabili('niijima').find((s) => s.tipo === 'tesoro-palazzo') ?? await spilloNuovo('niijima', 'tesoro-palazzo', 'Tesoro del Palazzo');
    const boss = await spilloNuovo('niijima', 'boss', 'Sae Niijima');
    await request(app).put(`/api/compendio/punti/${encodeURIComponent(voceBoss)}/pin/${boss.id}`).send({}).expect(200);
    segnaPermanenti('niijima', finale.punti);
    await segna(tesoro.id, true);
    /** Vero se lo spillo del boss risulta fatto nella partita (§8.11: il suo segno). */
    const bossFatto = async () => ((await request(app).get(`/api/mappe/${prepared('SELECT mappa_chiave FROM spillo WHERE id = ?').pluck().get(boss.id)}?partita=${partita}`)).body.data as MappaDto).spilli.find((s) => s.id === boss.id)!.raccolto;
    expect(bossGuida(voceBoss)).toBe(false);
    expect(await bossFatto()).toBe(false);
    expect(statoPalazzi(partita).get('niijima')?.manca).toMatch(/^il boss finale sconfitto, tutti gli oggetti permanenti/);
    // la prima fase segnata non basta più (§8.14)
    const altre = finale.punti.filter((p) => p !== voceBoss);
    for (const p of altre) await voce(p, 'ottenuto');
    expect(statoPalazzi(partita).get('niijima')?.completamento?.boss).toBe(false);
    // segnato dall'utente dalla Guida: il pin collegato lo segue (il boss è sconfitto), e il Palazzo è completato
    await voce(voceBoss, 'ottenuto');
    expect(await bossFatto()).toBe(true);
    expect(statoPalazzi(partita).get('niijima')?.completamento?.boss).toBe(true);
    expect(palazziCompletati(partita).get('niijima')).toMatch(/^Tesoro, boss finale e tutti gli oggetti permanenti \(\d+\/\d+\)$/);
  });

  it('senza lo spillo «Tesoro del Palazzo» e senza la voce del boss finale (§8.14: NULL) un Palazzo non si conclude, nemmeno al 100% e con un boss segnato', async () => {
    const mappe = albero('madarame');
    prepared(`DELETE FROM spillo WHERE tipo = 'tesoro-palazzo' AND mappa_chiave IN (${mappe.map(() => '?').join(',')})`).run(...mappe);
    segnaPermanenti('madarame');
    // nel pacchetto dei test Madarame non ha la voce «Scontro con Madarame» dell'utente: la 112 lascia NULL
    expect(bossDi('madarame')).toBeNull();
    const finale = bossFinali().get('madarame')!;
    await voce(finale.punti[0], 'ottenuto');
    const manca = 'lo spillo «Tesoro del Palazzo» sulle planimetrie, il boss finale (nessuna voce di boss finale per questo Palazzo)';
    expect(statoPalazzi(partita).get('madarame')).toMatchObject({ concluso: null, mancaPerConcludere: manca, completato: null, manca });
    expect(requisito('madarame').dettaglio).toBe(`Palazzo di Madarame: non risulta concluso — manca ${manca} (Guida → Palazzi)`);
  });

  it('un boss che non è il finale non vale come boss sconfitto (Shido: i boss intermedi prima dell’Aula magna)', async () => {
    const finale = bossFinali().get('shido')!;
    expect(finale.unico).toBe(false);
    const intermedio = prepared(`SELECT pi.chiave FROM punto_interesse pi JOIN dungeon_area a ON a.chiave = pi.area_chiave
      WHERE a.dungeon_chiave = 'shido' AND pi.tipo = 'boss' AND a.chiave <> ? LIMIT 1`).get(finale.area) as { chiave: string } | undefined;
    expect(intermedio).toBeTruthy();
    // Shido con Tesoro e tutto il resto, ma con i soli boss intermedi: gli spilli «Boss» delle sue planimetrie non sono il finale
    const mappe = albero('shido');
    prepared(`DELETE FROM spillo WHERE tipo = 'boss' AND mappa_chiave IN (${mappe.map(() => '?').join(',')})`).run(...mappe);
    if (!collezionabili('shido').some((s) => s.tipo === 'tesoro-palazzo')) await spilloNuovo('shido', 'tesoro-palazzo', 'Tesoro del Palazzo');
    const akechi = await spilloNuovo('shido', 'boss', 'Akechi');
    segnaPermanenti('shido', finale.punti);
    await voce(intermedio!.chiave, 'ottenuto');
    const tesoro = collezionabili('shido').find((s) => s.tipo === 'tesoro-palazzo')!;
    // Tesoro raccolto, Akechi raccolto: non vale come boss finale
    await segna(tesoro.id, true);
    await segna(akechi.id, true);
    expect(prepared('SELECT 1 FROM spillo_partita WHERE partita_id = ? AND spillo_uid = (SELECT uid FROM spillo WHERE id = ?) AND raccolto = 1').get(partita, akechi.id)).toBeTruthy();
    expect(statoPalazzi(partita).get('shido')?.manca).toMatch(/il boss finale sconfitto/);
    // il boss finale segnato dall'utente nella Guida sì (le sue voci, oggetti permanenti anche loro)
    for (const p of finale.punti) await voce(p, 'ottenuto');
    expect(palazziCompletati(partita).get('shido')).toMatch(/^Tesoro, boss finale e tutti gli oggetti permanenti \(\d+\/\d+\)$/);
  });

  it('l’ingresso vero (lo spillo della Shujin modificato a mano, senza più collegamento) sparisce a Palazzo concluso', async () => {
    // lo spillo 1616: oggi «punto sensibile» senza riferimento; la sua identità di seed è il passaggio verso dungeon-kamoshida
    const vero = prepared("SELECT id, mappa_chiave, riferimento_tipo FROM spillo WHERE seed_identita_json LIKE '%\"dungeon-kamoshida\"%' AND mappa_chiave NOT LIKE 'dungeon-%'").get() as { id: number; mappa_chiave: string; riferimento_tipo: string | null };
    expect(vero.riferimento_tipo).toBeNull();
    // Kamoshida è concluso (e completato) dal secondo test: siamo il 22 aprile, dentro la finestra 11/4–2/5 (097)
    expect(palazziConclusi(partita).has('kamoshida')).toBe(true);
    const spillo = ((await request(app).get(`/api/mappe/${vero.mappa_chiave}?partita=${partita}`)).body.data as MappaDto).spilli.find((s) => s.id === vero.id)!;
    expect(spillo.disponibilita?.stato).toBe('bloccato');
    expect(spillo.disponibilita?.requisiti.at(-1)?.dettaglio).toBe('Palazzo di Kamoshida: concluso (Tesoro e boss finale), non ci si entra più');
  });

  it('l’ingresso a un Palazzo concluso sparisce dalla mappa, anche prima della scadenza e senza la raccolta completa; non prima che sia concluso', async () => {
    const citta = prepared("SELECT chiave FROM mappa WHERE chiave LIKE 'citta-%' LIMIT 1").get() as { chiave: string };
    const ingresso = (await request(app).post(`/api/mappe/${citta.chiave}/spilli`).send({ tipo: 'passaggio', nome: 'Palazzo di Kaneshiro', x: 20, y: 20, riferimento: { tipo: 'mappa', chiave: 'dungeon-kaneshiro' } })).body.data as { id: number };
    /** Rilegge la mappa della città con la partita e restituisce la disponibilità del pin d'ingresso al Palazzo di Kaneshiro. */
    const stato = async () => ((await request(app).get(`/api/mappe/${citta.chiave}?partita=${partita}`)).body.data as MappaDto).spilli.find((s) => s.id === ingresso.id)!.disponibilita;
    expect((await stato())?.stato).not.toBe('bloccato');
    // il boss finale segnato nella Guida da solo non basta più
    const finale = bossFinali().get('kaneshiro')!;
    await voce(finale.punti[0], 'ottenuto');
    expect((await stato())?.stato).not.toBe('bloccato');
    // con il Tesoro sì, anche senza gli oggetti permanenti (§8.10: il furto chiude il Palazzo, non la raccolta completa)
    if (!collezionabili('kaneshiro').some((s) => s.tipo === 'tesoro-palazzo')) await spilloNuovo('kaneshiro', 'tesoro-palazzo', 'Tesoro del Palazzo');
    raccogliTesoro('kaneshiro');
    expect(palazziCompletati(partita).has('kaneshiro')).toBe(false);
    const dopo = await stato();
    expect(dopo?.stato).toBe('bloccato');
    expect(dopo?.requisiti.at(-1)?.dettaglio).toBe('Palazzo di Kaneshiro: concluso (Tesoro e boss finale), non ci si entra più');
    // con tutti gli oggetti permanenti il Palazzo è anche completato, e l'ingresso resta chiuso
    segnaPermanenti('kaneshiro');
    expect(palazziCompletati(partita).has('kaneshiro')).toBe(true);
    expect((await stato())?.stato).toBe('bloccato');
    // dentro il Palazzo le planimetrie restano consultabili: i passaggi fra le sue stanze non spariscono
    const interna = albero('kaneshiro').find((k) => k !== 'dungeon-kaneshiro')!;
    const passaggio = (await request(app).post(`/api/mappe/${interna}/spilli`).send({ tipo: 'passaggio', nome: 'Verso la radice', x: 10, y: 10, riferimento: { tipo: 'mappa', chiave: 'dungeon-kaneshiro' } })).body.data as { id: number };
    const dentro = ((await request(app).get(`/api/mappe/${interna}?partita=${partita}`)).body.data as MappaDto).spilli.find((s) => s.id === passaggio.id)!;
    expect(dentro.disponibilita?.stato).not.toBe('bloccato');
  });

  // R11-02b/2 (L11): l'euristica del boss finale è tolta; i Memento non hanno una riga di stato (nessun boss nei dedali): il caso non ha più senso
  it.skip('i Memento non si completano sulla mappa: anche con un boss segnato nella Guida restano sulla mappa di Tokyo', async () => {
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
    // i due livelli del §8.10 coincidono per i Memento (R4-30: invariati)
    expect(palazziConclusi(partita).get('mementos')).toBe('boss finale segnato nella Guida');
    // per l'elenco no, perché non è un Palazzo (e non ha i campi di L4)
    const memento = ((await request(app).get(`/api/compendio/dungeon?partita=${partita}`)).body.data as DungeonRiassuntoDto[]).find((d) => d.chiave === 'mementos')!;
    expect(memento.completato).toBeNull();
    // AP4-1: per i Memento la chiave non c'è (la risposta resta quella di prima, R4-30)
    expect('concluso' in memento).toBe(false);
    expect('completamento' in memento).toBe(false);
    expect((await request(app).get(`/api/compendio/dungeon/mementos?partita=${partita}`)).body.data.completato).toBeNull();
    prepared('DELETE FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').run(partita, punto);
  });

  // ---- §8.10: i due livelli (decisione dell'utente del 2026-10-20), ognuno su una partita nuova ----
  /** Una partita nuova al giorno dato. */
  const partitaNuova = async (nome: string, giorno: string) => {
    const id = ((await request(app).post('/api/partite').send({ nome })).body.data as { id: number }).id;
    prepared('UPDATE partita SET data_gioco = ? WHERE id = ?').run(giorno, id);
    return id;
  };
  /** Segna, direttamente, le voci date nella partita data. */
  const segnaVoci = (p: number, voci: readonly string[]) => {
    for (const v of voci) prepared("INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at) VALUES (?, ?, 'ottenuto', 'x') ON CONFLICT DO NOTHING").run(p, v);
  };
  /** Il Tesoro di Kamoshida raccolto, direttamente, nella partita data. */
  const tesoroKamoshida = (p: number) => {
    for (const s of collezionabili('kamoshida').filter((x) => x.tipo === 'tesoro-palazzo')) prepared("INSERT INTO spillo_partita (partita_id, spillo_uid, raccolto, updated_at) VALUES (?, ?, 1, 'x') ON CONFLICT(partita_id, spillo_uid) DO UPDATE SET raccolto = 1").run(p, s.uid);
  };
  /** L'ingresso vero di Kamoshida (lo spillo della Shujin) nella partita data. */
  const ingressoKamoshida = async (p: number) => {
    const vero = prepared("SELECT id, mappa_chiave FROM spillo WHERE seed_identita_json LIKE '%\"dungeon-kamoshida\"%' AND mappa_chiave NOT LIKE 'dungeon-%'").get() as { id: number; mappa_chiave: string };
    return ((await request(app).get(`/api/mappe/${vero.mappa_chiave}?partita=${p}`)).body.data as MappaDto).spilli.find((s) => s.id === vero.id)!.disponibilita;
  };
  /** Il riassunto di Kamoshida nell'elenco dei Palazzi, per la partita data. */
  const riassuntoKamoshida = async (p: number) => ((await request(app).get(`/api/compendio/dungeon?partita=${p}`)).body.data as DungeonRiassuntoDto[]).find((d) => d.chiave === 'kamoshida')!;
  /** Valuta il requisito «Completare il Palazzo di Kamoshida» nella partita data. */
  const requisitoKamoshida = (p: number) => valuta({ confidente_chiave: 'prova', rango: 1, indice: 0, tipo: 'palazzo', dati_json: JSON.stringify({ dungeon: 'kamoshida' }), testo: 'Completare il Palazzo' }, statoPartitaSemafori(p, new Map(), new Map()));

  it('§8.10: Tesoro e boss finale con oggetti permanenti non segnati (il caso di Kamoshida p1) → concluso, non completato; gli effetti seguono il concluso', async () => {
    const p = await partitaNuova('Concluso non completato', '04-22');
    const finale = bossFinali().get('kamoshida')!;
    const { voci } = permanenti('kamoshida');
    // tutte le voci permanenti tranne 15 (né il boss finale): come le 15 della decisione «1 B»
    const lasciate = voci.filter((v) => !finale.punti.includes(v)).slice(0, 15);
    expect(lasciate).toHaveLength(15);
    segnaVoci(p, voci.filter((v) => !lasciate.includes(v)));
    tesoroKamoshida(p);
    const st = statoPalazzi(p).get('kamoshida')!;
    const c = st.completamento!;
    expect(c).toMatchObject({ tesoro: true, boss: true, concluso: true, completato: false });
    expect(c.fatti).toBeLessThan(c.oggetti);
    expect(st).toMatchObject({ concluso: 'Tesoro e boss finale', mancaPerConcludere: null, completato: null, manca: `tutti gli oggetti permanenti (${c.fatti}/${c.oggetti})` });
    // gli effetti: requisito verde, ingresso chiuso, assente dalla mappa di Tokyo (il riassunto dice concluso); l'anello no
    expect(requisitoKamoshida(p)).toMatchObject({ stato: 'verde', dettaglio: 'Palazzo di Kamoshida: concluso (Tesoro e boss finale)' });
    expect((await ingressoKamoshida(p))?.stato).toBe('bloccato');
    const r = await riassuntoKamoshida(p);
    expect(r.concluso).toBe('Tesoro e boss finale');
    expect(r.completato).toBeNull();
    expect(r.completamento).toMatchObject({ concluso: true, completato: false });
    // nessuna voce segnata al posto dell'utente
    expect(lasciate.some((v) => prepared('SELECT 1 FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').get(p, v))).toBe(false);
  });

  it('§8.10: il Tesoro senza il boss finale → né concluso né completato, anche con tutti gli oggetti permanenti tranne il boss', async () => {
    const p = await partitaNuova('Tesoro senza boss', '04-22');
    const finale = bossFinali().get('kamoshida')!;
    segnaVoci(p, permanenti('kamoshida').voci.filter((v) => !finale.punti.includes(v)));
    tesoroKamoshida(p);
    expect(statoPalazzi(p).get('kamoshida')).toMatchObject({ concluso: null, mancaPerConcludere: 'il boss finale sconfitto', completato: null, completamento: { tesoro: true, boss: false, concluso: false, completato: false } });
    expect(requisitoKamoshida(p)).toMatchObject({ stato: 'rosso', dettaglio: 'Palazzo di Kamoshida: non risulta concluso — manca il boss finale sconfitto (Guida → Palazzi)' });
    expect((await riassuntoKamoshida(p)).concluso).toBeNull();
    expect((await ingressoKamoshida(p))?.requisiti.some((q) => /non ci si entra più/.test(q.dettaglio))).toBe(false);
  });

  it('§8.14 — «Modifica › Boss finale»: solo una voce «Boss» del Palazzo (400 altrimenti, e nei Memento), il primo cambio conserva quella della guida; «Ripristina» la rimette', async () => {
    const guida = bossDi('shido');
    expect(guida).toBe('shido-16-aula-magna-tesoro-e-boss-finali/4');
    const errore = async (dungeon: string, voceBossFinale: string | null) => (await request(app).put(`/api/compendio/dungeon/${dungeon}`).send({ voceBossFinale })).body.error?.code;
    const nonBoss = prepared("SELECT p.chiave FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave WHERE a.dungeon_chiave = 'shido' AND p.tipo <> 'boss' LIMIT 1").pluck().get() as string;
    expect(await errore('shido', nonBoss)).toBe('voce-non-boss');
    expect(await errore('shido', bossDi('okumura'))).toBe('voce-di-un-altro-palazzo');
    expect(await errore('mementos', null)).toBe('boss-finale-dei-memento');
    expect(await errore('shido', 'nessuna-voce')).toBe('punto-non-trovato');
    // un'altra voce «Boss» di Shido (un boss intermedio): la scheda la dice, corretta dall'utente
    const altra = prepared("SELECT p.chiave FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave WHERE a.dungeon_chiave = 'shido' AND p.tipo = 'boss' AND p.chiave <> ? LIMIT 1").pluck().get(guida) as string;
    const scheda = (await request(app).put('/api/compendio/dungeon/shido').send({ voceBossFinale: altra }).expect(200)).body.data as DungeonRiassuntoDto;
    expect(scheda).toMatchObject({ voceBossFinale: { chiave: altra, nome: expect.any(String) }, bossFinaleCorretto: true });
    // un secondo cambio non perde il valore della guida
    await request(app).put('/api/compendio/dungeon/shido').send({ voceBossFinale: null }).expect(200);
    const rimessa = (await request(app).post('/api/compendio/dungeon/shido/ripristina').expect(200)).body.data as DungeonRiassuntoDto;
    expect(rimessa).toMatchObject({ voceBossFinale: { chiave: guida }, bossFinaleCorretto: false });
    expect((await request(app).post('/api/compendio/dungeon/shido/ripristina').expect(409)).body.error.code).toBe('niente-da-ripristinare');
    // i Memento non hanno questi campi
    const memento = ((await request(app).get('/api/compendio/dungeon').expect(200)).body.data as DungeonRiassuntoDto[]).find((d) => d.chiave === 'mementos')!;
    expect(['voceBossFinale', 'bossFinaleCorretto'].filter((k) => k in memento)).toEqual([]);
  });

  // R11-02b/2 (L11) e R8-19b: Iweleth è solo un dedalo, senza boss segnato nella Guida né anello: resta la riga senza effetti, il caso (boss che conclude) non vale più
  it.skip('§8.15 — Iweleth segue la regola del boss dei Memento (113): mai «manca: il boss finale (nessuna voce…)», concluso col boss segnato nella Guida, nessun effetto di Palazzo', async () => {
    const p = await partitaNuova('Iweleth', '12-24');
    const st = () => statoPalazzi(p).get('iweleth')!;
    expect(st().mancaPerConcludere).toBe('il boss finale segnato nella Guida');
    expect(st().manca ?? '').not.toMatch(/nessuna voce di boss finale/);
    const boss = bossFinali().get('iweleth')!.punti[0];
    await request(app).put(`/api/partite/${p}/punti`).send({ punto: boss, stato: 'ottenuto' }).expect(200);
    expect(st()).toMatchObject({ concluso: 'boss finale segnato nella Guida', mancaPerConcludere: null, senzaEffetti: true });
    // nessun effetto: non fra i conclusi (ingressi, requisiti), nessun «concluso» per la mappa di Tokyo
    expect(palazziConclusi(p).has('iweleth')).toBe(false);
    const r = ((await request(app).get(`/api/compendio/dungeon?partita=${p}`).expect(200)).body.data as DungeonRiassuntoDto[]).find((d) => d.chiave === 'iweleth')!;
    expect(r).toMatchObject({ concluso: null, regolaBoss: 'memento', voceBossFinale: null });
    // nessuna voce del boss finale da scegliere
    expect((await request(app).put('/api/compendio/dungeon/iweleth').send({ voceBossFinale: boss })).body.error.code).toBe('boss-finale-dei-memento');
    expect(((await request(app).get(`/api/compendio/dungeon?partita=${p}`).expect(200)).body.data as DungeonRiassuntoDto[]).find((d) => d.chiave === 'kamoshida')!.regolaBoss).toBe('voce-finale');
  });

  it('112 (condizione del PM) — un Palazzo con la regola della voce e senza voce dichiarata è «boss finale da dichiarare»; non Iweleth né un Palazzo con la voce; la dichiarazione lo spegne', async () => {
    const riassunti = async () => new Map(((await request(app).get('/api/compendio/dungeon').expect(200)).body.data as DungeonRiassuntoDto[]).map((d) => [d.chiave, d]));
    let r = await riassunti();
    // nel pacchetto dei test Madarame non ha la voce di G-027 (la 112 lascia NULL)
    expect(bossDi('madarame')).toBeNull();
    expect(r.get('madarame')!.bossFinaleDaDichiarare).toBe(true);
    expect(r.get('iweleth')!.bossFinaleDaDichiarare).toBe(false);
    expect(r.get('okumura')!.bossFinaleDaDichiarare).toBe(false);
    expect('bossFinaleDaDichiarare' in r.get('mementos')!).toBe(false);
    // «Modifica › Boss finale» lo spegne, «Ripristina» lo riaccende (la guida non ha la voce)
    const boss = bossFinali().get('madarame')!.punti[0];
    await request(app).put('/api/compendio/dungeon/madarame').send({ voceBossFinale: boss }).expect(200);
    r = await riassunti();
    expect(r.get('madarame')!.bossFinaleDaDichiarare).toBe(false);
    await request(app).post('/api/compendio/dungeon/madarame/ripristina').expect(200);
    expect((await riassunti()).get('madarame')!.bossFinaleDaDichiarare).toBe(true);
  });

  it('§8.14 — Madarame come nella produzione: due pin «Tesoro» (servono tutti e due) e la voce del boss finale con due pin (fatta a 2/2)', async () => {
    const p = await partitaNuova('Madarame a due tesori', '06-01');
    const infiltrazione = prepared("SELECT chiave FROM dungeon_area WHERE dungeon_chiave = 'madarame' ORDER BY ordine DESC LIMIT 1").pluck().get() as string;
    const voceBoss = ((await request(app).post(`/api/compendio/aree/${infiltrazione}/punti`).send({ nome: 'Scontro con Madarame', tipo: 'boss' }).expect(201)).body.data as { chiave: string }).chiave;
    await request(app).put('/api/compendio/dungeon/madarame').send({ voceBossFinale: voceBoss }).expect(200);
    const sayuri = await spilloNuovo('madarame', 'tesoro-palazzo', 'La vera Sayuri');
    const tesoroEsca = await spilloNuovo('madarame', 'tesoro-palazzo', 'Tesoro del Palazzo');
    const madarame = await spilloNuovo('madarame', 'boss', 'Madarame');
    for (const pin of [sayuri.id, madarame.id]) await request(app).put(`/api/compendio/punti/${encodeURIComponent(voceBoss)}/pin/${pin}`).send({}).expect(200);
    const segnaIn = (spillo: number) => request(app).put(`/api/partite/${p}/spilli/${spillo}`).send({ raccolto: true }).expect(200);
    const c = () => statoPalazzi(p).get('madarame')!.completamento!;
    // il solo pin 811 (il Tesoro preso con la gru): Tesoro ✗
    await segnaIn(tesoroEsca.id);
    expect(c()).toMatchObject({ tesoro: false, boss: false, concluso: false });
    // la voce del boss a 1/2 pin (la Sayuri vera è anche un pin del boss): né boss né Tesoro
    await segnaIn(sayuri.id);
    expect(c()).toMatchObject({ tesoro: true, boss: false, concluso: false });
    // 2/2: il boss è fatto, e Madarame è concluso
    await segnaIn(madarame.id);
    expect(c()).toMatchObject({ tesoro: true, boss: true, concluso: true });
    expect(palazziConclusi(p).get('madarame')).toBe('Tesoro e boss finale');
  });

  it('§8.10: la partita «Tutorial» con il solo boss segnato l’11/04 → Kamoshida resta visibile (il caso del 2026-10-04)', async () => {
    const p = await partitaNuova('Tutorial', '04-11');
    segnaVoci(p, bossFinali().get('kamoshida')!.punti.slice(0, 1));
    expect(statoPalazzi(p).get('kamoshida')).toMatchObject({ concluso: null, mancaPerConcludere: 'il Tesoro del Palazzo raccolto', completamento: { tesoro: false, boss: true, concluso: false } });
    expect((await riassuntoKamoshida(p)).concluso).toBeNull();
    expect((await ingressoKamoshida(p))?.requisiti.some((q) => /non ci si entra più/.test(q.dettaglio))).toBe(false);
  });
});
