// ============================================================
// Il cestino dalle API (2026-10-16): ogni eliminazione della guida e delle mappe (area, voce, planimetria, area di un dedalo) finisce
// nel cestino e si rimette com'era — l'impronta di OGNI tabella dei due file torna identica —, con l'ordine delle aree e delle voci
// senza doppioni anche se nel frattempo è cambiato qualcosa; elenco, eliminazione definitiva e svuotamento.
// ============================================================
//
// Richiesta dell'utente: «Cestino con ripristino» per aree dei Palazzi, voci della guida, planimetrie e aree dei dedali (dopo che
// tre aree del Palazzo di Madarame eliminate per errore si sono dovute ricostruire a mano dal WAL di produzione).
// ============================================================

import { createHash } from 'node:crypto';
import request from 'supertest';
import { closeDb, getDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { dbDiProva } from '../../test/dbDiProva.js';
import { idMappa } from '../services/mappe/percorsiMappe.js';
import type { EsitoRipristinoCestinoDto, VoceCestinoDto, VoceCollegabileDto } from '../../shared/types.js';

const app = createApp();
const PARTITA = 900;
const ADESSO = '2026-10-16T12:00:00.000Z';

beforeAll(() => {
  dbDiProva();
  prepared('INSERT INTO utente.partita (id, nome, created_at, updated_at) VALUES (?, ?, ?, ?)').run(PARTITA, 'Prova del cestino', ADESSO, ADESSO);
});
afterAll(() => closeDb());
afterEach(async () => { await request(app).delete('/api/impostazioni/cestino').expect(200); });

/**
 * L'impronta dei due file: per ogni tabella (tranne quelle del cestino) l'hash del multiinsieme delle righe, BLOB compresi.
 * Due impronte uguali = stessi dati, riga per riga, in ogni tabella.
 */
function impronta(): Record<string, string> {
  const db = getDb();
  const out: Record<string, string> = {};
  for (const schema of ['main', 'utente']) {
    for (const { name } of db.prepare(`SELECT name FROM ${schema}.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT IN ('cestino', 'cestino_partite')`).all() as Array<{ name: string }>) {
      const righe = (db.prepare(`SELECT * FROM ${schema}."${name}"`).all() as Array<Record<string, unknown>>)
        .map((r) => JSON.stringify(r, (_k, v: unknown) => (Buffer.isBuffer(v) ? `blob:${v.toString('hex')}` : v as never))).sort();
      out[`${schema}.${name}`] = createHash('sha1').update(righe.join('\n')).digest('hex');
    }
  }
  return out;
}

/** Le tabelle la cui impronta è diversa. */
const diverse = (a: Record<string, string>, b: Record<string, string>) => Object.keys({ ...a, ...b }).filter((k) => a[k] !== b[k]).sort();

const cestino = async (): Promise<VoceCestinoDto[]> => (await request(app).get('/api/impostazioni/cestino').expect(200)).body.data as VoceCestinoDto[];
const ripristina = async (id: number): Promise<EsitoRipristinoCestinoDto> => (await request(app).post(`/api/impostazioni/cestino/${id}/ripristina`).expect(200)).body.data as EsitoRipristinoCestinoDto;

/** Segna nella partita di prova le voci date e i pin collegati a loro (stato da rimettere). */
function segnaProgressi(voci: readonly string[]): void {
  const punto = prepared("INSERT OR IGNORE INTO utente.punto_partita (partita_id, punto_chiave, stato, updated_at, automatico) VALUES (?, ?, 'ottenuto', ?, 0)");
  const pin = prepared('INSERT OR IGNORE INTO utente.spillo_partita (partita_id, spillo_uid, raccolto, updated_at) VALUES (?, ?, 1, ?)');
  for (const v of voci) {
    punto.run(PARTITA, v, ADESSO);
    for (const { uid } of prepared('SELECT s.uid FROM spillo_voce sv JOIN spillo s ON s.id = sv.spillo_id WHERE sv.voce_chiave = ? AND s.uid IS NOT NULL').all(v) as Array<{ uid: string }>) pin.run(PARTITA, uid, ADESSO);
  }
}

describe('ogni eliminazione va nel cestino e si rimette com\'era (impronta identica di ogni tabella)', () => {
  it('un\'area della guida di un Palazzo, con voci, pin collegati, legami alle planimetrie e spunte', async () => {
    // un'infiltrazione legata ad Aree del Palazzo (L3, `infiltrazione_area`) con pin sulle loro planimetrie; i pin si collegano alle sue
    // voci dall'API, con le regole dell'app (`vociCollegabili`)
    const chiave = (prepared(`SELECT a.chiave FROM dungeon_area a
      WHERE EXISTS (SELECT 1 FROM infiltrazione_area ia JOIN mappa m ON m.area_chiave = ia.area_chiave JOIN spillo s ON s.mappa_chiave = m.chiave WHERE ia.infiltrazione_chiave = a.chiave AND s.uid IS NOT NULL)
        AND (SELECT count(*) FROM punto_interesse p WHERE p.area_chiave = a.chiave) >= 3
      ORDER BY a.chiave LIMIT 1`).get() as { chiave: string }).chiave;
    const pin = prepared(`SELECT s.id FROM spillo s JOIN mappa m ON m.chiave = s.mappa_chiave JOIN infiltrazione_area ia ON ia.area_chiave = m.area_chiave
      WHERE ia.infiltrazione_chiave = ? AND s.uid IS NOT NULL ORDER BY s.id`).all(chiave) as Array<{ id: number }>;
    let collegati = 0;
    for (const { id } of pin) {
      const voce = ((await request(app).get(`/api/mappe/spilli/${id}/voci-collegabili`).expect(200)).body.data as VoceCollegabileDto[]).find((x) => x.area === chiave);
      if (!voce) continue;
      await request(app).put(`/api/compendio/punti/${encodeURIComponent(voce.chiave)}/pin/${id}`).expect(200);
      if (++collegati === 4) break;
    }
    const area = prepared(`SELECT a.chiave, a.nome, d.nome AS dungeon,
        (SELECT count(*) FROM punto_interesse p WHERE p.area_chiave = a.chiave) AS voci,
        (SELECT count(*) FROM spillo_voce sv JOIN punto_interesse p ON p.chiave = sv.voce_chiave WHERE p.area_chiave = a.chiave) AS legami,
        (SELECT count(*) FROM infiltrazione_area ia WHERE ia.infiltrazione_chiave = a.chiave) AS mappe
      FROM dungeon_area a JOIN dungeon d ON d.chiave = a.dungeon_chiave WHERE a.chiave = ?`).get(chiave) as { chiave: string; nome: string; dungeon: string; voci: number; legami: number; mappe: number };
    expect(area.voci).toBeGreaterThanOrEqual(3);
    expect(area.legami).toBeGreaterThan(0);
    expect(area.mappe).toBeGreaterThan(0);
    segnaProgressi((prepared('SELECT chiave FROM punto_interesse WHERE area_chiave = ?').all(area.chiave) as Array<{ chiave: string }>).map((r) => r.chiave));
    const prima = impronta();

    await request(app).delete(`/api/compendio/aree/${encodeURIComponent(area.chiave)}`).expect(204);
    // L3: i legami con le Aree (`infiltrazione_area`) se ne vanno con l'infiltrazione; `mappa_entita` non si tocca più
    expect(diverse(prima, impronta())).toEqual(expect.arrayContaining(['main.dungeon_area', 'main.punto_interesse', 'main.spillo_voce', 'main.infiltrazione_area', 'utente.punto_partita']));
    expect(diverse(prima, impronta())).not.toContain('main.mappa_entita');
    const [v] = await cestino();
    expect(v).toMatchObject({ tipo: 'area', chiave: area.chiave, nome: area.nome, contesto: area.dungeon, partite: 'presente' });
    const quante = Object.fromEntries(v.contenuto.map((c) => [c.tabella, c.quante]));
    expect(quante).toMatchObject({ dungeon_area: 1, punto_interesse: area.voci, spillo_voce: area.legami, infiltrazione_area: area.mappe, punto_partita: area.voci });
    // il nome per l'utente col numero giusto: una sola area al singolare, le voci al plurale
    const etichetta = Object.fromEntries(v.contenuto.map((c) => [c.tabella, c.etichetta]));
    expect(etichetta).toMatchObject({ dungeon_area: 'infiltrazione', punto_interesse: 'voci della guida', punto_partita: 'spunte delle voci nelle partite',
      infiltrazione_area: area.mappe === 1 ? 'legame infiltrazione-area' : 'legami infiltrazione-area' });
    expect(v.byte).toBeGreaterThan(0);

    const esito = await ripristina(v.id);
    expect(esito).toMatchObject({ tipo: 'area', chiave: area.chiave, saltate: [], partiteMancanti: false });
    expect(diverse(prima, impronta())).toEqual([]);
    expect(await cestino()).toEqual([]);
  });

  it('una voce della guida che è un Enigma: i passi tornano suoi, con il loro ordine e il loro stato', async () => {
    // un Enigma con tre passi, creati dall'API in un'area con altre voci
    const area = (prepared('SELECT area_chiave AS chiave FROM punto_interesse WHERE area_dedalo_chiave IS NULL GROUP BY area_chiave HAVING count(*) >= 2 ORDER BY area_chiave LIMIT 1').get() as { chiave: string }).chiave;
    const crea = async (corpo: Record<string, unknown>) => (await request(app).post(`/api/compendio/aree/${encodeURIComponent(area)}/punti`).send(corpo).expect(201)).body.data as { chiave: string; nome: string };
    const enigma = await crea({ nome: 'Enigma del cestino', tipo: 'puzzle' });
    const passi: string[] = [];
    for (const n of [1, 2, 3]) passi.push((await crea({ nome: `Passo ${n}`, tipo: 'oggetto', contenitore: enigma.chiave })).chiave);
    expect(prepared('SELECT count(*) AS n FROM punto_interesse WHERE contenitore_chiave = ?').get(enigma.chiave)).toEqual({ n: 3 });
    segnaProgressi([enigma.chiave, ...passi.slice(0, 2)]);
    const prima = impronta();

    await request(app).delete(`/api/compendio/punti/${encodeURIComponent(enigma.chiave)}`).expect(204);
    // i passi restano, voci dell'area in fondo
    expect(prepared('SELECT count(*) AS n FROM punto_interesse WHERE contenitore_chiave = ?').get(enigma.chiave)).toEqual({ n: 0 });
    expect(prepared(`SELECT count(*) AS n FROM punto_interesse WHERE chiave IN (?, ?, ?)`).get(...passi)).toEqual({ n: 3 });
    const [v] = await cestino();
    expect(v).toMatchObject({ tipo: 'voce', chiave: enigma.chiave, nome: enigma.nome });
    expect(v.contesto).toContain(' · ');

    expect((await ripristina(v.id)).saltate).toEqual([]);
    expect(diverse(prima, impronta())).toEqual([]);
  });

  it('una planimetria con pin, figlie e immagini (BLOB) e lo stato dei pin nelle partite', async () => {
    const m = prepared(`SELECT m.chiave, m.nome, (SELECT count(*) FROM spillo s WHERE s.mappa_chiave = m.chiave AND s.uid IS NOT NULL) AS pin,
        (SELECT count(*) FROM mappa f WHERE f.genitore_chiave = m.chiave) AS figlie
      FROM mappa m WHERE m.genitore_chiave IS NOT NULL
        -- non una mappa la cui immagine è anche la pianta di un quartiere o di un'area (quella resta: eliminaImmagineDellaMappa)
        AND m.chiave NOT LIKE 'citta-%' AND m.chiave NOT IN (SELECT chiave FROM dungeon_area)
        -- L2: non una planimetria del mondo, che si elimina con la sua Area
        AND m.area_chiave IS NULL
      ORDER BY pin DESC LIMIT 1`).get() as { chiave: string; nome: string; pin: number; figlie: number };
    expect(m.pin).toBeGreaterThan(0);
    // una mappa figlia, creata dall'API: con l'eliminazione diventa radice, col ripristino torna figlia
    // (l'API risponde con la chiave pubblica, di percorso: la riga si trova con `idMappa`, come fa l'app)
    const figlia = { chiave: idMappa(((await request(app).post('/api/mappe').send({ nome: 'Figlia del cestino', tipo: 'generica', genitore: m.chiave }).expect(201)).body.data as { chiave: string }).chiave) };
    expect(prepared('SELECT genitore_chiave FROM mappa WHERE chiave = ?').get(figlia.chiave)).toEqual({ genitore_chiave: m.chiave });
    // un'immagine di base e una schermata di un pin, con contenuto: devono tornare byte per byte
    const contenuto = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1, 2, 3, 250, 251, 252, 253, 254, 255]);
    prepared(`INSERT INTO immagine (ambito, chiave, nome_file, mime, byte, created_at, contenuto) VALUES ('mappa', ?, 'x.png', 'image/png', ?, ?, ?)
      ON CONFLICT (ambito, chiave) DO UPDATE SET contenuto = excluded.contenuto, byte = excluded.byte`).run(m.chiave, contenuto.length, ADESSO, contenuto);
    prepared('UPDATE mappa SET immagine_chiave = ? WHERE chiave = ?').run(m.chiave, m.chiave);
    const pin = prepared('SELECT id, uid FROM spillo WHERE mappa_chiave = ? AND uid IS NOT NULL ORDER BY id LIMIT 1').get(m.chiave) as { id: number; uid: string };
    prepared("INSERT INTO immagine (ambito, chiave, nome_file, mime, byte, created_at, contenuto) VALUES ('spillo', 'prova-schermata', 'y.png', 'image/png', ?, ?, ?)").run(contenuto.length, ADESSO, contenuto);
    prepared("INSERT INTO spillo_immagine (spillo_id, ordine, immagine_chiave, didascalia, updated_at) VALUES (?, 0, 'prova-schermata', 'prova', ?)").run(pin.id, ADESSO);
    prepared('INSERT OR IGNORE INTO utente.spillo_partita (partita_id, spillo_uid, raccolto, updated_at) VALUES (?, ?, 1, ?)').run(PARTITA, pin.uid, ADESSO);
    const prima = impronta();

    await request(app).delete(`/api/mappe/${encodeURIComponent(m.chiave)}`).expect(204);
    expect(prepared("SELECT ambito, chiave FROM immagine WHERE (ambito = 'mappa' AND chiave = ?) OR (ambito = 'spillo' AND chiave = 'prova-schermata')").all(m.chiave)).toEqual([]);
    expect(prepared('SELECT genitore_chiave FROM mappa WHERE chiave = ?').get(figlia.chiave)).toEqual({ genitore_chiave: null });
    const [v] = await cestino();
    expect(v).toMatchObject({ tipo: 'mappa', chiave: m.chiave, nome: m.nome, partite: 'presente' });
    expect(v.contenuto.find((c) => c.tabella === 'immagine')?.quante).toBe(2);

    expect((await ripristina(v.id)).saltate).toEqual([]);
    expect(diverse(prima, impronta())).toEqual([]);
    expect((prepared('SELECT contenuto FROM immagine WHERE ambito = ? AND chiave = ?').get('mappa', m.chiave) as { contenuto: Buffer }).contenuto.equals(contenuto)).toBe(true);
  });

  it('un\'area di un dedalo dei Memento, con le voci, le Richieste che vi stavano e i timbri', async () => {
    const ad = prepared(`SELECT ad.chiave, ad.nome, ad.dedalo_chiave, (SELECT count(*) FROM punto_interesse p WHERE p.area_dedalo_chiave = ad.chiave) AS voci
      FROM area_dedalo ad ORDER BY voci DESC LIMIT 1`).get() as { chiave: string; nome: string; dedalo_chiave: string; voci: number };
    expect(ad.voci).toBeGreaterThan(0);
    // una Richiesta collocata in quest'area: con l'eliminazione resta da collocare, col ripristino torna qui
    const richiesta = (prepared('SELECT chiave FROM richiesta ORDER BY chiave LIMIT 1').get() as { chiave: string } | undefined)?.chiave;
    expect(richiesta).toBeDefined();
    prepared('UPDATE richiesta SET area_dedalo_chiave = ? WHERE chiave = ?').run(ad.chiave, richiesta);
    segnaProgressi((prepared('SELECT chiave FROM punto_interesse WHERE area_dedalo_chiave = ?').all(ad.chiave) as Array<{ chiave: string }>).map((r) => r.chiave));
    prepared('UPDATE area_dedalo SET timbri_totale = 3 WHERE chiave = ?').run(ad.chiave);
    prepared('INSERT OR REPLACE INTO utente.timbri_dedalo_partita (partita_id, area_chiave, raccolti, updated_at) VALUES (?, ?, 2, ?)').run(PARTITA, ad.chiave, ADESSO);
    const prima = impronta();

    await request(app).delete(`/api/compendio/aree-dedalo/${encodeURIComponent(ad.chiave)}`).expect(204);
    expect(prepared('SELECT area_dedalo_chiave FROM richiesta WHERE chiave = ?').get(richiesta)).toEqual({ area_dedalo_chiave: null });
    const [v] = await cestino();
    expect(v).toMatchObject({ tipo: 'area-dedalo', chiave: ad.chiave, nome: ad.nome, partite: 'presente' });
    expect(v.contenuto.find((c) => c.tabella === 'timbri_dedalo_partita')?.quante).toBe(1);

    expect((await ripristina(v.id)).saltate).toEqual([]);
    expect(diverse(prima, impronta())).toEqual([]);
    expect(prepared('SELECT area_dedalo_chiave FROM richiesta WHERE chiave = ?').get(richiesta)).toEqual({ area_dedalo_chiave: ad.chiave });
  });
});

describe('quel che cambia dopo l\'eliminazione', () => {
  it('una planimetria figlia rinominata dopo torna sotto la sua mappa col nome nuovo, e i percorsi si ricalcolano', async () => {
    // L2: non una planimetria del mondo, che si elimina con la sua Area (da sola è 409 `ultima-planimetria`); e non una variante nativa
    // col suffisso della chiave nel percorso (`…-nativo-rmap-…`), che le figlie non ripetono: qui si prova il percorso della figlia
    const m = prepared(`SELECT m.chiave FROM mappa m WHERE m.genitore_chiave IS NOT NULL AND m.chiave NOT LIKE 'citta-%'
      AND m.chiave NOT IN (SELECT chiave FROM dungeon_area) AND m.area_chiave IS NULL
      AND m.chiave NOT IN (SELECT mappa_chiave FROM mappa_percorso WHERE chiave LIKE '%nativo-rmap-%') ORDER BY m.chiave LIMIT 1`).get() as { chiave: string };
    const figlia = idMappa(((await request(app).post('/api/mappe').send({ nome: 'Figlia da rinominare', tipo: 'generica', genitore: m.chiave }).expect(201)).body.data as { chiave: string }).chiave);
    await request(app).delete(`/api/mappe/${encodeURIComponent(m.chiave)}`).expect(204);
    // dopo l'eliminazione la figlia è radice: la si rinomina (cambia anche il suo percorso)
    await request(app).put(`/api/mappe/${encodeURIComponent(figlia)}`).send({ nome: 'Figlia rinominata' }).expect(200);
    const [v] = await cestino();
    const esito = await ripristina(v.id);
    expect(prepared('SELECT nome, genitore_chiave FROM mappa WHERE chiave = ?').get(figlia)).toEqual({ nome: 'Figlia rinominata', genitore_chiave: m.chiave });
    // i percorsi derivati non hanno bloccato niente: saltati e ricalcolati, coerenti con l'albero di adesso
    expect(esito.saltate.map((s) => s.tabella)).toContain('mappa_percorso');
    // il nome delle righe saltate concorda col numero
    const percorsi = esito.saltate.find((s) => s.tabella === 'mappa_percorso')!;
    expect(percorsi.etichetta).toBe(percorsi.quante === 1 ? 'percorso di una mappa' : 'percorsi delle mappe');
    const percorso = (prepared('SELECT chiave FROM mappa_percorso WHERE mappa_chiave = ?').get(figlia) as { chiave: string }).chiave;
    const percorsoGenitore = (prepared('SELECT chiave FROM mappa_percorso WHERE mappa_chiave = ?').get(m.chiave) as { chiave: string }).chiave;
    expect(percorso).toContain('figlia-rinominata');
    expect(percorso.startsWith(percorsoGenitore)).toBe(true);
    expect(prepared('SELECT count(*) AS n FROM mappa m LEFT JOIN mappa_percorso p ON p.mappa_chiave = m.chiave WHERE p.chiave IS NULL').get()).toEqual({ n: 0 });
  });
});

describe('l\'ordine dopo il ripristino', () => {
  it('un\'area torna al suo posto anche se nel frattempo se n\'è aggiunta un\'altra: l\'ordine resta senza buchi né doppioni', async () => {
    const d = prepared('SELECT dungeon_chiave AS chiave FROM dungeon_area GROUP BY dungeon_chiave HAVING count(*) >= 4 ORDER BY dungeon_chiave LIMIT 1').get() as { chiave: string };
    const aree = () => (prepared('SELECT chiave, ordine FROM dungeon_area WHERE dungeon_chiave = ? ORDER BY ordine').all(d.chiave) as Array<{ chiave: string; ordine: number }>);
    const prima = aree();
    const tolta = prima[1];
    await request(app).delete(`/api/compendio/aree/${encodeURIComponent(tolta.chiave)}`).expect(204);
    // dopo l'eliminazione: una nuova in cima (le altre scendono di uno, quindi i loro «ordine» non sono più quelli del registro)
    const nuova = (await request(app).post(`/api/compendio/dungeon/${d.chiave}/aree`).send({ nome: 'Area nuova del cestino', dopo: null }).expect(201)).body.data as { chiave: string };
    const [v] = await cestino();
    await ripristina(v.id);
    const dopo = aree();
    expect(dopo.map((a) => a.ordine)).toEqual(dopo.map((_a, i) => i));
    // la nuova in cima, poi quelle di prima nel loro ordine, con quella rimessa al suo posto fra le sue vicine
    expect(dopo.map((a) => a.chiave)).toEqual([nuova.chiave, ...prima.map((a) => a.chiave)]);
  });

  it('una voce torna al suo posto; se una voce nuova ha preso il suo posto, quelle da lì in giù scendono di uno', async () => {
    const area = prepared(`SELECT p.area_chiave AS chiave FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave JOIN dungeon d ON d.chiave = a.dungeon_chiave
      WHERE d.tipo = 'palazzo' AND p.contenitore_chiave IS NULL AND p.area_dedalo_chiave IS NULL
      GROUP BY p.area_chiave HAVING count(*) >= 3 ORDER BY p.area_chiave LIMIT 1`).get() as { chiave: string };
    const voci = () => (prepared('SELECT chiave, ordine FROM punto_interesse WHERE area_chiave = ? AND contenitore_chiave IS NULL AND area_dedalo_chiave IS NULL ORDER BY ordine, chiave').all(area.chiave) as Array<{ chiave: string; ordine: number }>);
    const prima = voci();
    const ultima = prima[prima.length - 1];
    await request(app).delete(`/api/compendio/punti/${encodeURIComponent(ultima.chiave)}`).expect(204);
    // una voce nuova messa proprio al posto di quella eliminata
    const nuova = (await request(app).post(`/api/compendio/aree/${encodeURIComponent(area.chiave)}/punti`).send({ nome: 'Voce nuova del cestino', tipo: 'oggetto', ordine: ultima.ordine }).expect(201)).body.data as { chiave: string; ordine: number };
    expect(nuova.ordine).toBe(ultima.ordine);
    const [v] = await cestino();
    await ripristina(v.id);
    const dopo = voci();
    expect(dopo.find((x) => x.chiave === ultima.chiave)!.ordine).toBe(ultima.ordine);
    expect(dopo.find((x) => x.chiave === nuova.chiave)!.ordine).toBe(ultima.ordine + 1);
    expect(new Set(dopo.map((x) => x.ordine)).size).toBe(dopo.length);
  });
});

describe('il posto delle voci', () => {
  it('una voce torna subito dopo la voce che la precedeva, anche se quella nel frattempo è stata spostata', async () => {
    const area = prepared(`SELECT p.area_chiave AS chiave FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave JOIN dungeon d ON d.chiave = a.dungeon_chiave
      WHERE d.tipo = 'palazzo' AND p.contenitore_chiave IS NULL AND p.area_dedalo_chiave IS NULL
      GROUP BY p.area_chiave HAVING count(*) >= 4 ORDER BY p.area_chiave DESC LIMIT 1`).get() as { chiave: string };
    const voci = () => (prepared('SELECT chiave FROM punto_interesse WHERE area_chiave = ? AND contenitore_chiave IS NULL AND area_dedalo_chiave IS NULL ORDER BY ordine, chiave').all(area.chiave) as Array<{ chiave: string }>).map((r) => r.chiave);
    const prima = voci();
    const [terzultima, penultima, ultima] = prima.slice(-3);
    await request(app).delete(`/api/compendio/punti/${encodeURIComponent(ultima)}`).expect(204);
    // dopo l'eliminazione la penultima sale di un posto (scambia con la terzultima)
    await request(app).put(`/api/compendio/punti/${encodeURIComponent(penultima)}/sposta`).send({ verso: -1 }).expect(200);
    expect(voci().slice(-2)).toEqual([penultima, terzultima]);
    const [v] = await cestino();
    await ripristina(v.id);
    // la voce rimessa sta subito dopo quella che la precedeva quando fu eliminata
    expect(voci().slice(-3)).toEqual([penultima, ultima, terzultima]);
  });
});

describe('il primo e l\'ultimo', () => {
  it('un\'area del dedalo che era la prima torna la prima, anche se nel frattempo un\'altra è salita in cima', async () => {
    const dedalo = (prepared('SELECT dedalo_chiave AS d FROM area_dedalo GROUP BY dedalo_chiave HAVING count(*) >= 3 ORDER BY dedalo_chiave LIMIT 1').get() as { d: string }).d;
    const aree = () => (prepared('SELECT chiave FROM area_dedalo WHERE dedalo_chiave = ? ORDER BY ordine').all(dedalo) as Array<{ chiave: string }>).map((r) => r.chiave);
    const [prima, seconda, terza] = aree();
    await request(app).delete(`/api/compendio/aree-dedalo/${encodeURIComponent(prima)}`).expect(204);
    // la terza sale di un posto: ora è in cima
    await request(app).put(`/api/compendio/aree-dedalo/${encodeURIComponent(terza)}/sposta`).send({ verso: -1 }).expect(200);
    expect(aree().slice(0, 2)).toEqual([terza, seconda]);
    const [v] = await cestino();
    await ripristina(v.id);
    // era la prima: torna in cima; lo spostamento fatto dopo resta (la terza davanti alla seconda)
    expect(aree().slice(0, 3)).toEqual([prima, terza, seconda]);
    expect((prepared('SELECT ordine FROM area_dedalo WHERE dedalo_chiave = ? ORDER BY ordine').all(dedalo) as Array<{ ordine: number }>).map((r) => r.ordine)).toEqual(aree().map((_k, i) => i));
  });

  it('una voce che era la prima torna in cima; una che era l\'ultima, senza più la sua precedente, torna in fondo', async () => {
    const area = prepared(`SELECT p.area_chiave AS chiave FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave JOIN dungeon d ON d.chiave = a.dungeon_chiave
      WHERE d.tipo = 'palazzo' AND p.contenitore_chiave IS NULL AND p.area_dedalo_chiave IS NULL
      GROUP BY p.area_chiave HAVING count(*) >= 5 ORDER BY p.area_chiave LIMIT 1`).get() as { chiave: string };
    const voci = () => (prepared('SELECT chiave FROM punto_interesse WHERE area_chiave = ? AND contenitore_chiave IS NULL AND area_dedalo_chiave IS NULL ORDER BY ordine, chiave').all(area.chiave) as Array<{ chiave: string }>).map((r) => r.chiave);
    const iniziali = voci();
    const [primaVoce, , terzaVoce] = iniziali;
    await request(app).delete(`/api/compendio/punti/${encodeURIComponent(primaVoce)}`).expect(204);
    // la terza (ora seconda) sale in cima
    await request(app).put(`/api/compendio/punti/${encodeURIComponent(terzaVoce)}/sposta`).send({ verso: -1 }).expect(200);
    expect(voci()[0]).toBe(terzaVoce);
    let [v] = await cestino();
    await ripristina(v.id);
    expect(voci()[0]).toBe(primaVoce);
    expect(voci()[1]).toBe(terzaVoce);

    // l'ultima e poi la penultima nel cestino: rimessa solo l'ultima, la sua precedente non c'è, ma era l'ultima → in fondo
    const ora = voci();
    const [penultima, ultima] = ora.slice(-2);
    await request(app).delete(`/api/compendio/punti/${encodeURIComponent(ultima)}`).expect(204);
    await request(app).delete(`/api/compendio/punti/${encodeURIComponent(penultima)}`).expect(204);
    v = (await cestino()).find((x) => x.chiave === ultima)!;
    await ripristina(v.id);
    expect(voci().at(-1)).toBe(ultima);
    expect(voci()).not.toContain(penultima);
  });
});

describe('le rotte del cestino', () => {
  it('chiave occupata → 409 con l\'involucro d\'errore e niente cambia; id che non c\'è → 404; id non valido → 400', async () => {
    const a = prepared('SELECT * FROM dungeon_area ORDER BY chiave LIMIT 1').get() as { chiave: string; dungeon_chiave: string; nome: string };
    await request(app).delete(`/api/compendio/aree/${encodeURIComponent(a.chiave)}`).expect(204);
    // una riga nuova con la stessa chiave, creata dopo
    prepared("INSERT INTO dungeon_area (chiave, dungeon_chiave, ordine, nome) VALUES (?, ?, 99, 'Un''altra')").run(a.chiave, a.dungeon_chiave);
    const prima = impronta();
    const [v] = await cestino();
    const r = await request(app).post(`/api/impostazioni/cestino/${v.id}/ripristina`).expect(409);
    expect(r.body.error).toMatchObject({ code: 'cestino-chiavi-occupate' });
    expect(r.body.error.message).toContain(a.nome);
    expect(diverse(prima, impronta())).toEqual([]);
    expect(await cestino()).toHaveLength(1);
    prepared('DELETE FROM dungeon_area WHERE chiave = ?').run(a.chiave);
    expect((await ripristina(v.id)).chiave).toBe(a.chiave);

    expect((await request(app).post('/api/impostazioni/cestino/999999/ripristina').expect(404)).body.error.code).toBe('cestino-non-trovato');
    expect((await request(app).delete('/api/impostazioni/cestino/999999').expect(404)).body.error.code).toBe('cestino-non-trovato');
    await request(app).post('/api/impostazioni/cestino/abc/ripristina').expect(400);
  });

  it('eliminare per sempre un elemento (204) e svuotare il cestino ({ eliminati })', async () => {
    const voci = (prepared('SELECT chiave FROM punto_interesse WHERE contenitore_chiave IS NULL ORDER BY chiave LIMIT 2').all() as Array<{ chiave: string }>).map((r) => r.chiave);
    for (const k of voci) await request(app).delete(`/api/compendio/punti/${encodeURIComponent(k)}`).expect(204);
    const elenco = await cestino();
    expect(elenco.map((v) => v.chiave)).toEqual([...voci].reverse());
    await request(app).delete(`/api/impostazioni/cestino/${elenco[0].id}`).expect(204);
    expect((await cestino()).map((v) => v.chiave)).toEqual([voci[0]]);
    expect((await request(app).delete('/api/impostazioni/cestino').expect(200)).body.data).toEqual({ eliminati: 1 });
    expect(await cestino()).toEqual([]);
    // tolte per sempre: le voci non tornano
    expect(prepared(`SELECT count(*) AS n FROM punto_interesse WHERE chiave IN (?, ?)`).get(...voci)).toEqual({ n: 0 });
  });
});
