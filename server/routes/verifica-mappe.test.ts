// ============================================================
// Test della verifica completa del codice (2026-10-03), lotto mappe e guida: B1 chiavi dei punti, B2/B1' cache dei dati di gioco,
// B2' semafori senza cache vecchia, B3 genitore nell'importazione, B4 arrivi ricollegati, B5 immagini dei pin eliminati,
// B6 nomi nelle condizioni annidate, B7 voci descrittive, B8 figli di Tokyo, B9/B10 transazioni ed errori, B12 pareggi, B14 riferimenti.
// ============================================================

import request from 'supertest';
import { closeDb, getDb } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { invalidaCacheDiGioco } from '../services/cacheDiGioco.js';
import { elencaDungeon, raccoltaMappe } from '../services/dungeonService.js';
import { confidenti } from '../services/partiteService.js';
import { impostaEventoStoria } from '../services/semaforiService.js';
import { statoDisponibilitaPartita, valutaRequisitiSpillo } from '../services/disponibilitaService.js';
import { aggiungiImmagineSpillo, impostaImmagineMappa, creaMappa, creaSpillo, dettaglioMappa, eliminaMappa, eliminaSpillo, elencaMappe, esportaMappe, importaMappe } from '../services/mappe/mappeService.js';
import { salvaImmagine } from '../services/immaginiService.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();
const PNG = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');
const nuovaPartita = async (nome: string) => (await request(app).post('/api/partite').send({ nome })).body.data.id as number;
const immaginiSpillo = () => getDb().prepare("SELECT COUNT(*) FROM immagine WHERE ambito = 'spillo'").pluck().get() as number;

describe('verifica mappe e guida', () => {
  beforeAll(() => { dbDiProva(); });
  afterAll(() => closeDb());

  it('B1: un punto con un nome lungo nasce con una chiave che le sue rotte accettano; un nome senza lettere non lascia un trattino in fondo', async () => {
    const area = (await request(app).post('/api/compendio/dungeon/kamoshida/aree').send({ nome: 'Area di prova B1' })).body.data.chiave as string;
    const lungo = await request(app).post(`/api/compendio/aree/${area}/punti`).send({ nome: 'Forziere '.repeat(33).trim(), tipo: 'forziere' });
    expect(lungo.status).toBe(201);
    const chiave = lungo.body.data.chiave as string;
    expect(chiave.length).toBeLessThanOrEqual(200 - 6);
    expect((await request(app).put(`/api/compendio/punti/${chiave}`).send({ descrizione: 'modificabile' })).status).toBe(200);
    expect((await request(app).delete(`/api/compendio/punti/${chiave}`)).status).toBe(204);
    const vuoto = await request(app).post(`/api/compendio/aree/${area}/punti`).send({ nome: '???', tipo: 'forziere' });
    expect(vuoto.status).toBe(201);
    expect(vuoto.body.data.chiave).toBe(`${area}-punto`);
    // un'area con la chiave più lunga possibile (194 caratteri) contiene comunque punti raggiungibili
    const lunga = (await request(app).post('/api/compendio/dungeon/kamoshida/aree').send({ nome: 'Sala '.padEnd(300, 'x') })).body.data.chiave as string;
    expect(lunga.length).toBe(194);
    for (let i = 0; i < 2; i++) {
      const p = await request(app).post(`/api/compendio/aree/${lunga}/punti`).send({ nome: 'Forziere nascosto dietro la statua', tipo: 'forziere' });
      expect(p.status).toBe(201);
      expect((p.body.data.chiave as string).length).toBeLessThanOrEqual(200);
      expect((await request(app).put(`/api/compendio/punti/${p.body.data.chiave}`).send({ descrizione: 'ok' })).status).toBe(200);
    }
  });

  it('B2/B1\': le finestre dei Palazzi si rileggono quando il DB di gioco cambia (registro unico delle cache)', () => {
    const prima = elencaDungeon().find((d) => d.chiave === 'kamoshida')!.finestra;
    const riga = getDb().prepare("SELECT json FROM dati_guida WHERE chiave = 'finestre-dungeon'").pluck().get() as string;
    const dati = JSON.parse(riga) as { finestre: Array<{ dungeon: string; dal?: string; al?: string | null }> };
    const nuova = dati.finestre.map((f) => (f.dungeon === 'kamoshida' ? { ...f, dal: '04-20' } : f));
    getDb().prepare("UPDATE dati_guida SET json = ? WHERE chiave = 'finestre-dungeon'").run(JSON.stringify({ ...dati, finestre: nuova }));
    try {
      expect(elencaDungeon().find((d) => d.chiave === 'kamoshida')!.finestra).toEqual(prima); // ancora in cache
      invalidaCacheDiGioco();
      expect(elencaDungeon().find((d) => d.chiave === 'kamoshida')!.finestra?.dal).toBe('04-20');
    } finally {
      getDb().prepare("UPDATE dati_guida SET json = ? WHERE chiave = 'finestre-dungeon'").run(riga);
      invalidaCacheDiGioco();
    }
  });

  it('B2\': i semafori dei Confidenti vedono un evento segnato anche se la data della partita non cambia', async () => {
    const id = await nuovaPartita('Semafori');
    const statoCaffe = () => confidenti(id).find((c) => c.chiave === 'sojiro')!.semafori.find((s) => s.rango === 3)!.requisiti.find((r) => r.tipo === 'evento')!.stato;
    expect(statoCaffe()).not.toBe('verde');
    const prima = getDb().prepare('SELECT updated_at FROM partita WHERE id = ?').pluck().get(id);
    impostaEventoStoria(id, 'caffe-leblanc', true); // non tocca partita.updated_at
    expect(getDb().prepare('SELECT updated_at FROM partita WHERE id = ?').pluck().get(id)).toBe(prima);
    expect(statoCaffe()).toBe('verde');
  });

  it('B3: con «sovrascrivi» una mappa che il pacchetto dichiara radice torna radice', () => {
    creaMappa(undefined, { nome: 'Padre B3', tipo: 'luogo' });
    const figlia = creaMappa(undefined, { nome: 'Figlia B3', tipo: 'luogo', genitore: 'padre-b3' });
    expect(getDb().prepare('SELECT genitore_chiave FROM mappa WHERE chiave = ?').pluck().get(figlia.chiave)).toBe('padre-b3');
    const pacchetto = esportaMappe(figlia.chiave);
    const sola = { ...pacchetto, mappe: pacchetto.mappe.filter((m) => m.chiave === figlia.chiave).map((m) => ({ ...m, genitore: null })) };
    importaMappe(sola, { sovrascrivi: true });
    expect(getDb().prepare('SELECT genitore_chiave FROM mappa WHERE chiave = ?').pluck().get(figlia.chiave)).toBeNull();
  });

  it('B4: reimportando una mappa, i passaggi di altre mappe ritrovano lo spillo d\'arrivo reinserito', () => {
    const arrivo = creaMappa(undefined, { nome: 'Arrivo B4', tipo: 'luogo' });
    const partenza = creaMappa(undefined, { nome: 'Partenza B4', tipo: 'luogo' });
    const porta = creaSpillo(arrivo.chiave, { tipo: 'passaggio', nome: 'Porta B4', x: 40, y: 40 } as Parameters<typeof creaSpillo>[1]) as { id: number };
    const uscita = creaSpillo(partenza.chiave, { tipo: 'passaggio', nome: 'Uscita B4', x: 10, y: 10, destinazione: { mappa: arrivo.chiave, spillo: porta.id } } as Parameters<typeof creaSpillo>[1]) as { id: number };
    const arrivoDi = () => getDb().prepare('SELECT spillo_arrivo_id FROM spillo_destinazione WHERE spillo_id = ?').pluck().get(uscita.id) as number | null;
    expect(arrivoDi()).toBe(porta.id);
    const pacchetto = esportaMappe(arrivo.chiave);
    importaMappe({ ...pacchetto, mappe: pacchetto.mappe.filter((m) => m.chiave === arrivo.chiave) }, { sovrascrivi: true });
    const nuovaPorta = getDb().prepare("SELECT id FROM spillo WHERE mappa_chiave = ? AND nome = 'Porta B4'").pluck().get(arrivo.chiave) as number;
    expect(nuovaPorta).not.toBe(porta.id);
    expect(arrivoDi()).toBe(nuovaPorta);
  });

  it('B5: eliminando un pin o una mappa se ne vanno anche le schermate caricate; la pianta di un quartiere resta', () => {
    const m = creaMappa(undefined, { nome: 'Immagini B5', tipo: 'luogo' });
    const a = creaSpillo(m.chiave, { tipo: 'nota', nome: 'Pin A', x: 10, y: 10 } as Parameters<typeof creaSpillo>[1]) as { id: number };
    const b = creaSpillo(m.chiave, { tipo: 'nota', nome: 'Pin B', x: 60, y: 60 } as Parameters<typeof creaSpillo>[1]) as { id: number };
    const base = immaginiSpillo();
    aggiungiImmagineSpillo(a.id, 'image/png', PNG);
    aggiungiImmagineSpillo(b.id, 'image/png', PNG);
    expect(immaginiSpillo()).toBe(base + 2);
    eliminaSpillo(a.id);
    expect(immaginiSpillo()).toBe(base + 1);
    salvaImmagine('mappa', m.chiave, 'image/png', PNG);
    eliminaMappa(m.chiave);
    expect(immaginiSpillo()).toBe(base);
    expect(getDb().prepare("SELECT COUNT(*) FROM immagine WHERE ambito = 'mappa' AND chiave = ?").pluck().get(m.chiave)).toBe(0);
    // la mappa di un quartiere condivide la chiave con la pianta del quartiere: eliminarla non la tocca
    const quartiere = getDb().prepare("SELECT substr(m.chiave, 7) FROM mappa m JOIN quartiere q ON q.chiave = substr(m.chiave, 7) WHERE m.chiave LIKE 'citta-%' LIMIT 1").pluck().get() as string;
    salvaImmagine('mappa', `citta-${quartiere}`, 'image/png', PNG);
    eliminaMappa(`citta-${quartiere}`);
    expect(getDb().prepare("SELECT COUNT(*) FROM immagine WHERE ambito = 'mappa' AND chiave = ?").pluck().get(`citta-${quartiere}`)).toBe(1);
  });

  it('B6: dentro un gruppo le condizioni si descrivono coi nomi, non con le chiavi', async () => {
    const id = await nuovaPartita('Nomi annidati');
    const nome = getDb().prepare("SELECT nome FROM confidente WHERE chiave = 'sojiro'").pluck().get() as string;
    expect(nome).not.toBe('sojiro');
    const esito = valutaRequisitiSpillo([{ tipo: 'gruppo', modo: 'tutte', condizioni: [{ tipo: 'confidente', confidente: 'sojiro', rango: 3 }], testo: 'gruppo' }], statoDisponibilitaPartita(id));
    expect(esito.requisiti[0].dettaglio).toContain(nome);
  });

  it('B7: uno stato rimasto su una voce descrittiva non conta per la raccolta del Palazzo', async () => {
    const id = await nuovaPartita('Voci descrittive');
    const pin = getDb().prepare(`SELECT s.id, s.uid, s.mappa_chiave FROM spillo s WHERE s.collezionabile = 1 AND s.mappa_chiave IN (SELECT chiave FROM mappa WHERE chiave LIKE 'dungeon-kamoshida%' OR genitore_chiave LIKE 'dungeon-kamoshida%') LIMIT 1`).get() as { id: number; uid: string; mappa_chiave: string };
    const altro = getDb().prepare("SELECT chiave FROM punto_interesse WHERE tipo = 'altro' LIMIT 1").pluck().get() as string;
    const voce = getDb().prepare('SELECT voce_chiave FROM spillo WHERE id = ?').pluck().get(pin.id);
    getDb().prepare('UPDATE spillo SET voce_chiave = ? WHERE id = ?').run(altro, pin.id);
    getDb().prepare("INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at) VALUES (?, ?, 'ottenuto', '2026-10-03')").run(id, altro);
    try {
      const raccolto = [...raccoltaMappe('kamoshida', id).perMappa.values()].flatMap((m) => m.spilli).find((s) => s.id === pin.id)!.raccolto;
      expect(raccolto).toBe(false);
    } finally {
      getDb().prepare('UPDATE spillo SET voce_chiave = ? WHERE id = ?').run(voce, pin.id);
    }
  });

  it('B8: Tokyo elenca tanti figli quanti ne conta, senza il nodo dei Memento', () => {
    const tokyo = getDb().prepare("SELECT genitore_chiave FROM mappa WHERE chiave = 'citta-mementos'").pluck().get() as string;
    const d = dettaglioMappa(tokyo);
    expect(d.figli.map((f) => f.chiave)).not.toContain('citta-mementos');
    expect(d.figli.length).toBe(elencaMappe().find((m) => m.chiave === d.chiave)!.numeroFigli);
    expect(d.figli.length).toBeGreaterThan(5);
  });

  it('B9: immagine e righe che la legano nascono insieme o per niente', () => {
    const m = creaMappa(undefined, { nome: 'Transazioni B9', tipo: 'luogo' });
    const pin = creaSpillo(m.chiave, { tipo: 'nota', nome: 'Pin B9', x: 20, y: 20 } as Parameters<typeof creaSpillo>[1]) as { id: number };
    const base = immaginiSpillo();
    getDb().exec("CREATE TEMP TRIGGER blocca_b9 BEFORE INSERT ON main.spillo_immagine BEGIN SELECT RAISE(ABORT, 'bloccato dal test'); END;");
    try {
      expect(() => aggiungiImmagineSpillo(pin.id, 'image/png', PNG)).toThrow();
    } finally {
      getDb().exec('DROP TRIGGER temp.blocca_b9');
    }
    expect(immaginiSpillo()).toBe(base);
    getDb().exec("CREATE TEMP TRIGGER blocca_b9m BEFORE UPDATE OF immagine_chiave ON main.mappa BEGIN SELECT RAISE(ABORT, 'bloccato dal test'); END;");
    try {
      expect(() => impostaImmagineMappa(m.chiave, 'image/png', PNG)).toThrow();
    } finally {
      getDb().exec('DROP TRIGGER temp.blocca_b9m');
    }
    expect(getDb().prepare("SELECT COUNT(*) FROM immagine WHERE ambito = 'mappa' AND chiave = ?").pluck().get(m.chiave)).toBe(0);
  });

  // B10 (errori del negozio di un pin) sta in `negozio-del-pin.test.ts`: serve sostituire `dettaglioNegozio` per provocare un guasto
  // che solo lui produce.

  it('B12: a pari ordine decide la chiave, anche quando il nome ordinerebbe diversamente', () => {
    creaMappa(undefined, { nome: 'Zeta B12', tipo: 'luogo', ordine: 77 });
    creaMappa(undefined, { nome: 'Ápice B12', tipo: 'luogo', ordine: 77 });
    const radici = elencaMappe().filter((m) => m.chiave === 'zeta-b12' || m.chiave === 'apice-b12').map((m) => m.chiave);
    expect(radici).toEqual(['apice-b12', 'zeta-b12']);
  });

  it('B14: eliminando un luogo dell\'utente, i pin che lo citavano perdono il riferimento', async () => {
    const quartiere = getDb().prepare('SELECT chiave FROM quartiere LIMIT 1').pluck().get() as string;
    const luogo = (await request(app).post('/api/catalogo/luogo').send({ quartiere_chiave: quartiere, nome: 'Luogo B14', tipo: 'altro' })).body.data.chiave as string;
    const m = creaMappa(undefined, { nome: 'Mappa B14', tipo: 'luogo' });
    const pin = creaSpillo(m.chiave, { tipo: 'ristorante', nome: 'Rimanda al luogo', x: 30, y: 30, riferimento: { tipo: 'luogo', chiave: luogo } } as Parameters<typeof creaSpillo>[1]) as { id: number };
    expect(getDb().prepare('SELECT riferimento_chiave FROM spillo WHERE id = ?').pluck().get(pin.id)).toBe(luogo);
    expect((await request(app).delete(`/api/catalogo/luogo/${encodeURIComponent(luogo)}`)).status).toBe(200);
    expect(getDb().prepare('SELECT riferimento_tipo, riferimento_chiave FROM spillo WHERE id = ?').get(pin.id)).toEqual({ riferimento_tipo: null, riferimento_chiave: null });
  });

  it('B14: eliminando un negozio dell\'utente, i pin che lo citavano perdono il riferimento', async () => {
    const negozio = (await request(app).post('/api/catalogo/negozio').send({ nome: 'Negozio B14' })).body.data.chiave as string;
    const m = creaMappa(undefined, { nome: 'Mappa B14 negozio', tipo: 'luogo' });
    const pin = creaSpillo(m.chiave, { tipo: 'negozio', nome: 'Rimanda al negozio', x: 40, y: 40, riferimento: { tipo: 'negozio', chiave: negozio } } as Parameters<typeof creaSpillo>[1]) as { id: number };
    expect(getDb().prepare('SELECT riferimento_chiave FROM spillo WHERE id = ?').pluck().get(pin.id)).toBe(negozio);
    expect((await request(app).delete(`/api/catalogo/negozio/${encodeURIComponent(negozio)}`)).status).toBe(200);
    expect(getDb().prepare('SELECT riferimento_tipo, riferimento_chiave FROM spillo WHERE id = ?').get(pin.id)).toEqual({ riferimento_tipo: null, riferimento_chiave: null });
  });
});
