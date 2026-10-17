// ============================================================
// Copiare più voci insieme in un'altra area dello stesso Palazzo (2026-10-18)
// ============================================================
//
// Richiesta dell'utente: «non è possibile copiare gli elementi di un'area in un'altra area... ma solo spostare... attiva anche la
// modalità copia». Scelte: «Voce, passi e schede» e «Le altre aree dello stesso Palazzo». Ogni copia è una voce nuova in fondo
// all'area d'arrivo, coi passi dell'Enigma e le schede della guida senza mappa (immagini duplicate), collegata agli stessi pin delle
// planimetrie con uno stato suo («ogni copia deve avere il suo stato distinto»; il pin segue le regole delle voci indipendenti).
// ============================================================

import request from 'supertest';
import { closeDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { salvaImmagine } from '../services/immaginiService.js';
import type { DungeonDettaglioDto, PuntiCopiatiDto, PuntoInteresseDto } from '../../shared/types.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();
const URL = '/api/compendio/punti/copia-in-area';
const INGRESSO = 'kamoshida-01-cancello-del-castello-ingresso';
const SALA = 'kamoshida-02-sala-centrale';

interface RigaVoce { chiave: string; area_chiave: string; ordine: number; tipo: string; nome: string; descrizione: string; esauribile: number; dettagli_json: string; fonte: string; contenitore_chiave: string | null }

describe('copiare più voci insieme in un\'altra area del Palazzo', () => {
  let partita: number;
  /** Crea una voce nell'area data (dentro un Enigma se indicato) e la restituisce. */
  const nuova = async (area: string, nome: string, tipo: string, extra: Record<string, unknown> = {}) =>
    (await request(app).post(`/api/compendio/aree/${area}/punti`).send({ nome, tipo, ...extra }).expect(201)).body.data as PuntoInteresseDto;
  /** La riga salvata di una voce. */
  const riga = (chiave: string) => prepared('SELECT chiave, area_chiave, ordine, tipo, nome, descrizione, esauribile, dettagli_json, fonte, contenitore_chiave FROM punto_interesse WHERE chiave = ?').get(chiave) as RigaVoce | undefined;
  /** Le voci di un'area fuori da ogni Enigma, nell'ordine della guida. */
  const elenco = (area: string) => prepared('SELECT chiave FROM punto_interesse WHERE area_chiave = ? AND contenitore_chiave IS NULL ORDER BY ordine, chiave').pluck().all(area) as string[];
  /** Le schede della guida senza mappa di una voce. */
  const schedeDi = (voce: string) => prepared("SELECT id, uid, area_guida_chiave, ruolo_guida, tipo, nome, descrizione, origine FROM spillo WHERE mappa_chiave IS NULL AND riferimento_tipo = 'punto' AND riferimento_chiave = ? ORDER BY id").all(voce) as Array<{ id: number; uid: string; area_guida_chiave: string; ruolo_guida: string; tipo: string; nome: string; descrizione: string; origine: string }>;
  /** Le immagini di una scheda: chiave, asset, didascalia e il contenuto dell'immagine. */
  const immaginiDi = (spillo: number) => prepared(`SELECT si.ordine, si.immagine_chiave, si.asset, si.didascalia, i.mime, i.byte, i.contenuto FROM spillo_immagine si
    LEFT JOIN immagine i ON i.ambito = 'spillo' AND i.chiave = si.immagine_chiave WHERE si.spillo_id = ? ORDER BY si.ordine, si.id`).all(spillo) as Array<{ ordine: number; immagine_chiave: string | null; asset: string | null; didascalia: string; mime: string | null; byte: number | null; contenuto: Buffer | null }>;

  beforeAll(async () => {
    dbDiProva();
    partita = ((await request(app).post('/api/partite').send({ nome: 'Copia voci' })).body.data as { id: number }).id;
  });
  afterAll(() => closeDb());

  it('le copie sono voci nuove in fondo all\'area nell\'ordine della guida, con passi e schede (immagini duplicate); gli originali restano com\'erano', async () => {
    const a = await nuova(INGRESSO, 'Forziere da copiare', 'forziere', { descrizione: 'Dietro la statua', esauribile: true });
    const enigma = await nuova(INGRESSO, 'Enigma da copiare', 'puzzle');
    const passo1 = await nuova(INGRESSO, 'Primo passo', 'meccanismo', { contenitore: enigma.chiave });
    const passo2 = await nuova(INGRESSO, 'Secondo passo', 'meccanismo', { contenitore: enigma.chiave });
    // una voce della guida dell'ingresso con la sua scheda senza mappa (dal pacchetto), a cui si aggiungono due immagini
    const scheda = prepared(`SELECT s.id, s.riferimento_chiave AS voce FROM spillo s JOIN punto_interesse p ON p.chiave = s.riferimento_chiave
      WHERE s.mappa_chiave IS NULL AND s.area_guida_chiave = ? AND s.riferimento_tipo = 'punto' AND p.contenitore_chiave IS NULL ORDER BY s.id LIMIT 1`).get(INGRESSO) as { id: number; voce: string };
    expect(scheda).toBeDefined();
    salvaImmagine('spillo', `prova-copia-${scheda.id}`, 'image/png', Buffer.from('immagine della scheda'));
    prepared("INSERT INTO spillo_immagine (spillo_id, ordine, immagine_chiave, asset, didascalia, updated_at) VALUES (?, 0, ?, NULL, 'la schermata', 'x')").run(scheda.id, `prova-copia-${scheda.id}`);
    prepared("INSERT INTO spillo_immagine (spillo_id, ordine, immagine_chiave, asset, didascalia, updated_at) VALUES (?, 1, NULL, 'asset/prova.png', 'un asset', 'x')").run(scheda.id);
    // la destinazione della scheda va con lei; un'immagine senza contenuto nel database (solo il nome del file) non si copia
    prepared('INSERT INTO spillo_destinazione (spillo_id, mappa_chiave, x, y, zoom) VALUES (?, NULL, 12, 34, 2)').run(scheda.id);
    prepared("INSERT INTO immagine (ambito, chiave, nome_file, mime, byte, created_at, contenuto) VALUES ('spillo', ?, 'perso.png', 'image/png', 0, 'x', NULL)").run(`perso-${scheda.id}`);
    prepared("INSERT INTO spillo_immagine (spillo_id, ordine, immagine_chiave, asset, didascalia, updated_at) VALUES (?, 2, ?, NULL, 'file perso', 'x')").run(scheda.id, `perso-${scheda.id}`);
    // una scheda di un passo: va con la copia del passo
    const schedaPasso = Number(prepared(`INSERT INTO spillo (mappa_chiave, area_guida_chiave, ruolo_guida, tipo, nome, descrizione, x, y, riferimento_tipo, riferimento_chiave, ordine, origine, updated_at)
      VALUES (NULL, ?, 'punto', 'meccanismo', 'Scheda del passo', 'leva', 0, 0, 'punto', ?, 99, 'utente', 'x')`).run(INGRESSO, passo2.chiave).lastInsertRowid);
    // stato nella partita e un pin di planimetria collegato all'originale: restano suoi
    await request(app).put(`/api/partite/${partita}/punti`).send({ punto: a.chiave, stato: 'ottenuto' }).expect(200);
    const pin = prepared("SELECT s.id FROM spillo s JOIN mappa m ON m.chiave = s.mappa_chiave WHERE s.mappa_chiave IS NOT NULL ORDER BY s.id LIMIT 1").pluck().get() as number;
    prepared('INSERT INTO spillo_voce (spillo_id, voce_chiave) VALUES (?, ?)').run(pin, a.chiave);
    prepared("INSERT INTO utente.spillo_partita (partita_id, spillo_uid, raccolto, updated_at) VALUES (?, (SELECT uid FROM spillo WHERE id = ?), 1, 'x')").run(partita, pin);

    const attese = elenco(INGRESSO).filter((c) => [a.chiave, enigma.chiave, scheda.voce].includes(c));
    expect(attese).toEqual([scheda.voce, a.chiave, enigma.chiave]);
    const primaIngresso = elenco(INGRESSO);
    const primaSala = elenco(SALA);
    const originaliPrima = [scheda.voce, a.chiave, enigma.chiave, passo1.chiave, passo2.chiave].map(riga);
    const schedaPrima = schedeDi(scheda.voce);
    const immaginiPrima = immaginiDi(scheda.id);

    // chieste in disordine: arrivano nell'ordine della guida
    const r = await request(app).post(URL).send({ chiavi: [enigma.chiave, a.chiave, scheda.voce], area: SALA });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    const esito = r.body.data as PuntiCopiatiDto;
    expect(esito.area).toBe(SALA);
    expect(esito.copiate.map((c) => c.origine)).toEqual(attese);
    expect(esito.copiate.map((c) => [c.passi, c.schede])).toEqual([[0, schedaPrima.length], [0, 0], [2, 1]]);
    const copie = esito.copiate.map((c) => c.copia);
    expect(new Set([...copie, ...attese]).size).toBe(6);
    // in fondo alla sala, nell'ordine; l'ingresso non cambia
    expect(elenco(SALA)).toEqual([...primaSala, ...copie]);
    expect(elenco(INGRESSO)).toEqual(primaIngresso);
    // gli originali non cambiano
    expect([scheda.voce, a.chiave, enigma.chiave, passo1.chiave, passo2.chiave].map(riga)).toEqual(originaliPrima);
    // ogni copia ha i campi dell'originale, area, posto e chiave suoi, fonte «utente»
    for (const [i, c] of esito.copiate.entries()) {
      const o = riga(c.origine)!; const k = riga(c.copia)!;
      expect(k).toEqual({ ...o, chiave: c.copia, area_chiave: SALA, ordine: k.ordine, fonte: 'utente', contenitore_chiave: null });
      expect(k.ordine).toBe(prepared('SELECT ordine FROM punto_interesse WHERE chiave = ?').pluck().get(copie[i]));
    }
    expect(riga(copie[1])).toMatchObject({ nome: 'Forziere da copiare', descrizione: 'Dietro la statua', esauribile: 1 });
    // i passi copiati stanno nell'Enigma copiato, nel loro ordine
    const passiCopia = prepared('SELECT nome, area_chiave, ordine, fonte FROM punto_interesse WHERE contenitore_chiave = ? ORDER BY ordine').all(copie[2]);
    expect(passiCopia).toEqual([{ nome: 'Primo passo', area_chiave: SALA, ordine: riga(passo1.chiave)!.ordine, fonte: 'utente' }, { nome: 'Secondo passo', area_chiave: SALA, ordine: riga(passo2.chiave)!.ordine, fonte: 'utente' }]);
    // le schede: copie nella sala, riferite alla copia, con un uid loro; le originali restano all'ingresso con le loro immagini
    const schedaCopia = schedeDi(copie[0]);
    expect(schedaCopia.map((s) => ({ ...s, id: 0, uid: '' }))).toEqual(schedaPrima.map((s) => ({ ...s, id: 0, uid: '', area_guida_chiave: SALA, origine: 'utente' })));
    expect(schedaCopia.every((s) => /^[0-9a-f]{32}$/.test(s.uid) && !schedaPrima.some((o) => o.uid === s.uid || o.id === s.id))).toBe(true);
    expect(schedeDi(scheda.voce)).toEqual(schedaPrima);
    const immaginiCopia = immaginiDi(schedaCopia[0].id);
    // la schermata e l'asset sì; quella senza contenuto no
    expect(immaginiPrima.map((i) => i.didascalia)).toEqual(['la schermata', 'un asset', 'file perso']);
    expect(immaginiCopia.map((i) => ({ ...i, immagine_chiave: i.immagine_chiave ? 'chiave' : null }))).toEqual(immaginiPrima.slice(0, 2).map((i) => ({ ...i, immagine_chiave: i.immagine_chiave ? 'chiave' : null })));
    expect(prepared('SELECT mappa_chiave, x, y, zoom FROM spillo_destinazione WHERE spillo_id = ?').get(schedaCopia[0].id)).toEqual({ mappa_chiave: null, x: 12, y: 34, zoom: 2 });
    expect(immaginiCopia[0].immagine_chiave).not.toBe(immaginiPrima[0].immagine_chiave);
    expect(immaginiCopia[0].contenuto!.toString()).toBe('immagine della scheda');
    expect(immaginiDi(scheda.id)).toEqual(immaginiPrima);
    const passoCopia2 = prepared("SELECT chiave FROM punto_interesse WHERE contenitore_chiave = ? AND nome = 'Secondo passo'").pluck().get(copie[2]) as string;
    expect(schedeDi(passoCopia2)).toMatchObject([{ area_guida_chiave: SALA, nome: 'Scheda del passo', descrizione: 'leva', origine: 'utente' }]);
    expect(schedeDi(passo2.chiave).map((s) => s.id)).toEqual([schedaPasso]);
    // il pin di planimetria è anche della copia, ma ogni voce ha il suo stato: la copia parte da fare, l'originale resta ottenuto, e il
    // pin (due voci, una da fare) non è più fatto — le «voci indipendenti» del 2026-10-09
    const dungeon = (await request(app).get(`/api/compendio/dungeon/kamoshida?partita=${partita}`).expect(200)).body.data as DungeonDettaglioDto;
    const sala = dungeon.aree.find((x) => x.chiave === SALA)!.punti;
    expect(sala.find((p) => p.chiave === copie[1])).toMatchObject({ stato: null });
    expect(dungeon.aree.find((x) => x.chiave === INGRESSO)!.punti.find((p) => p.chiave === a.chiave)).toMatchObject({ stato: 'ottenuto' });
    expect(prepared('SELECT voce_chiave FROM spillo_voce WHERE spillo_id = ? ORDER BY voce_chiave').pluck().all(pin)).toContain(a.chiave);
    expect(prepared('SELECT voce_chiave FROM spillo_voce WHERE spillo_id = ? ORDER BY voce_chiave').pluck().all(pin)).toContain(copie[1]);
    expect(prepared('SELECT COUNT(*) FROM spillo_voce WHERE voce_chiave IN (?, ?)').pluck().get(copie[0], copie[2])).toBe(0);
    expect(prepared('SELECT COALESCE(MAX(sp.raccolto), 0) FROM utente.spillo_partita sp JOIN spillo s ON s.uid = sp.spillo_uid WHERE sp.partita_id = ? AND s.id = ?').pluck().get(partita, pin)).toBe(0);
    // eliminare la copia non tocca l'originale né la sua immagine
    await request(app).delete(`/api/compendio/punti/${encodeURIComponent(copie[0])}`).expect(204);
    expect(schedeDi(scheda.voce)).toEqual(schedaPrima);
    expect(immaginiDi(scheda.id)[0].contenuto!.toString()).toBe('immagine della scheda');
  });

  it('tutto o niente: stessa area, passi, altri Palazzi, Memento, voci o aree che non ci sono fermano tutte; ripetizioni e liste vuote si rifiutano', async () => {
    const v = await nuova(INGRESSO, 'Resta sola', 'storia');
    const enigma = await nuova(SALA, 'Enigma della sala', 'puzzle');
    const passo = await nuova(SALA, 'Passo della sala', 'meccanismo', { contenitore: enigma.chiave });
    const terza = prepared("SELECT chiave FROM dungeon_area WHERE dungeon_chiave = 'kamoshida' ORDER BY ordine LIMIT 1 OFFSET 2").pluck().get() as string;
    const voci = () => prepared('SELECT COUNT(*) FROM punto_interesse').pluck().get() as number;
    const schede = () => prepared('SELECT COUNT(*) FROM spillo').pluck().get() as number;
    const prima = [voci(), schede()];
    const prova = async (corpo: Record<string, unknown>) => { const r = await request(app).post(URL).send(corpo); return [r.status, r.body.error?.code]; };
    expect(await prova({ chiavi: [v.chiave], area: INGRESSO })).toEqual([400, 'copia-nella-stessa-area']);
    expect(await prova({ chiavi: [v.chiave, enigma.chiave], area: SALA })).toEqual([400, 'copia-nella-stessa-area']);
    expect(await prova({ chiavi: [v.chiave, passo.chiave], area: terza })).toEqual([400, 'passo-segue-enigma']);
    expect(await prova({ chiavi: [v.chiave, 'voce-che-non-esiste'], area: SALA })).toEqual([404, 'punto-non-trovato']);
    const altro = prepared("SELECT chiave FROM dungeon_area WHERE dungeon_chiave = 'madarame' ORDER BY ordine LIMIT 1").pluck().get() as string;
    expect(await prova({ chiavi: [v.chiave], area: altro })).toEqual([400, 'area-di-altro-palazzo']);
    expect(await prova({ chiavi: [v.chiave], area: 'area-che-non-esiste' })).toEqual([404, 'area-non-trovata']);
    const trama = prepared("SELECT chiave FROM punto_interesse WHERE tipo = 'trama' AND area_chiave = 'mementos-02-aiyatsbus' LIMIT 1").pluck().get() as string;
    expect(await prova({ chiavi: [trama], area: 'mementos-03-chemdah' })).toEqual([400, 'area-solo-nei-palazzi']);
    expect((await request(app).post(URL).send({ chiavi: [v.chiave, v.chiave], area: SALA })).status).toBe(400);
    expect((await request(app).post(URL).send({ chiavi: [], area: SALA })).status).toBe(400);
    expect([voci(), schede()]).toEqual(prima);
    // la stessa voce copiata due volte: due voci con chiavi diverse
    const r1 = (await request(app).post(URL).send({ chiavi: [v.chiave], area: SALA }).expect(201)).body.data as PuntiCopiatiDto;
    const r2 = (await request(app).post(URL).send({ chiavi: [v.chiave], area: SALA }).expect(201)).body.data as PuntiCopiatiDto;
    expect(r1.copiate[0].copia).not.toBe(r2.copiate[0].copia);
    expect(riga(r2.copiate[0].copia)).toMatchObject({ nome: 'Resta sola', area_chiave: SALA });
  });
});
