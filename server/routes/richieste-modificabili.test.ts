// ============================================================
// Le Richieste dei Mementos si modificano, si aggiungono e si eliminano (richiesta dell'utente del 2026-10-11)
// ============================================================
//
// «come faccio a modificare i dettagli relativi alle richieste? non ho un pulsante modifica.» Scelte dell'utente: «Modifica,
// aggiungi, elimina», «In entrambi i posti», «Si elimina e si avvisa» (chi la cita si dice prima; i suoi stati se ne vanno, pin
// e azioni perdono il collegamento, condizioni e requisiti restano da correggere).
// ============================================================

import request from 'supertest';
import { closeDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { dbDiProva } from '../../test/dbDiProva.js';
import { statoDisponibilitaPartita, valutaRequisiti } from '../services/disponibilitaService.js';
import { semaforiConfidente, statoPartitaSemafori } from '../services/semaforiService.js';
import { descriviRequisitoSpillo, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';
import type { CitazioniRichiestaDto, PercorsoGiornoDto, RichiestaDto, RichiesteDto } from '../../shared/types.js';

const app = createApp();
const QIMRANUT = 'mementos-01-qimranut';
const AIYATSBUS = 'mementos-02-aiyatsbus';
const bersaglio = { nome: 'Ombra del cartello', formaDemoniaca: 'Pixie', livello: 12, debolezze: ['Fuoco', ' '], resistenze: ['Vento'], vulnerabileConfusione: true };

/** L'elenco delle Richieste (con la partita, se data). */
const elenco = async (partita?: number) => (await request(app).get(`/api/compendio/richieste${partita ? `?partita=${partita}` : ''}`).expect(200)).body.data as RichiesteDto;
/** Una Richiesta dall'elenco. */
const leggi = async (chiave: string, partita?: number) => (await elenco(partita)).richieste.find((r) => r.chiave === chiave);
/** Una partita nuova. */
const nuovaPartita = async (nome: string) => ((await request(app).post('/api/partite').send({ nome })).body.data as { id: number }).id;
/** O7-1: completare una Richiesta chiede il suo Dedalo aperto nella partita (305); dove il test non parla di questo, i Dedali restano senza
 *  condizione d'apertura (un Dedalo senza condizione non blocca). */
const apriIDedali = () => prepared("UPDATE dungeon_area SET condizioni_json = NULL WHERE dungeon_chiave = 'mementos'").run();

describe('le Richieste modificabili', () => {
  beforeEach(() => { dbDiProva(); });
  afterEach(() => closeDb());

  it('ogni Richiesta del pacchetto si risalva com\'è (i tetti stanno sopra i dati veri)', async () => {
    for (const r of (await elenco()).richieste) {
      const corpo = { nome: r.nome, committente: r.committente, disponibileDal: r.disponibileDal, scadenza: r.scadenza, dedalo: r.areaChiave, areaDedalo: r.areaDedalo, piano: r.piano,
        bersaglio: r.bersaglio, ricompense: r.ricompense, confidente: r.confidente?.chiave ?? null, confidenteRango: r.confidente?.rango ?? null, note: r.note };
      const risposta = await request(app).put(`/api/compendio/richieste/${r.chiave}`).send(corpo);
      expect(risposta.status, `${r.chiave}: ${JSON.stringify(risposta.body)}`).toBe(200);
      const { dedalo: _d, confidenteRango: _c, ...campi } = corpo;
      expect(risposta.body.data).toEqual({ ...r, ...campi, confidente: r.confidente, stato: null });
    }
  });

  it('si aggiunge in un\'area di un dedalo, o da collocare, o senza dedalo; la chiave nasce dal nome e resta; va in fondo', async () => {
    const area = `${QIMRANUT}-area-1`;
    const nuova = (await request(app).post('/api/compendio/richieste').send({ nome: 'Il cartello capovolto', committente: 'Mishima', areaDedalo: area, bersaglio, ricompense: ['Perla', ''], confidente: 'mishima', confidenteRango: 3 }).expect(201)).body.data as RichiestaDto;
    expect(nuova).toMatchObject({ chiave: 'il-cartello-capovolto', areaChiave: QIMRANUT, area: 'Dedalo di Qimranut', areaDedalo: area, areaDedaloNome: 'Area 1',
      bersaglio: { ...bersaglio, debolezze: ['Fuoco'] }, ricompense: ['Perla'], confidente: { chiave: 'mishima', rango: 3 } });
    const ordini = (prepared('SELECT chiave, ordine FROM richiesta ORDER BY ordine DESC LIMIT 1').get() as { chiave: string }).chiave;
    expect(ordini).toBe('il-cartello-capovolto');
    // lo stesso nome (anche con altre maiuscole) no: i requisiti dei Confidenti citano per nome; uno diverso con lo stesso slug ha un'altra chiave
    expect((await request(app).post('/api/compendio/richieste').send({ nome: 'IL CARTELLO CAPOVOLTO', bersaglio })).body.error.code).toBe('nome-gia-usato');
    // anche con una maiuscola accentata (la guida ha «È una figlia o un buono pasto?», citata per nome da Futaba)
    expect((await request(app).post('/api/compendio/richieste').send({ nome: 'è una figlia o un buono pasto?', bersaglio })).body.error.code).toBe('nome-gia-usato');
    expect((await request(app).post('/api/compendio/richieste').send({ nome: 'Il cartello, capovolto!', bersaglio }).expect(201)).body.data).toMatchObject({ chiave: 'il-cartello-capovolto-2', areaChiave: null, areaDedalo: null });
    // un dedalo senza area: da collocare
    const daCollocare = (await request(app).post('/api/compendio/richieste').send({ nome: 'Senza area', dedalo: AIYATSBUS, bersaglio }).expect(201)).body.data as RichiestaDto;
    expect(daCollocare).toMatchObject({ areaChiave: AIYATSBUS, areaDedalo: null });
    const memento = (await request(app).get('/api/compendio/dungeon/mementos').expect(200)).body.data as { aree: Array<{ chiave: string; dedalo: { daCollocare: Array<{ chiave: string }> } }> };
    expect(memento.aree.find((a) => a.chiave === AIYATSBUS)?.dedalo.daCollocare.map((r) => r.chiave)).toEqual(['senza-area']);
    // gli errori: niente nome o bersaglio, area di un altro dedalo, un'area di un Palazzo come dedalo, un Confidente che non c'è
    expect((await request(app).post('/api/compendio/richieste').send({ nome: 'X' })).status).toBe(400);
    expect((await request(app).post('/api/compendio/richieste').send({ nome: 'X', bersaglio: { nome: '' } })).status).toBe(400);
    expect((await request(app).post('/api/compendio/richieste').send({ nome: 'X', bersaglio, dedalo: AIYATSBUS, areaDedalo: area })).body.error.code).toBe('area-di-altro-dedalo');
    expect((await request(app).post('/api/compendio/richieste').send({ nome: 'X', bersaglio, dedalo: 'kamoshida-01-cancello-del-castello-ingresso' })).body.error.code).toBe('non-un-dedalo');
    expect((await request(app).post('/api/compendio/richieste').send({ nome: 'X', bersaglio, confidente: 'nessuno' })).body.error.code).toBe('confidente-non-trovato');
    expect((await request(app).post('/api/compendio/richieste').send({ nome: 'X', bersaglio, areaDedalo: 'nessuna' })).body.error.code).toBe('area-dedalo-non-trovata');
    // il modulo sa dove si può mettere: i nove dedali con le loro aree
    const collocazioni = (await elenco()).collocazioni;
    expect(collocazioni).toHaveLength(9);
    expect(collocazioni[0]).toEqual({ chiave: QIMRANUT, nome: 'Dedalo di Qimranut', aree: [{ chiave: area, nome: 'Area 1' }, { chiave: `${QIMRANUT}-area-2`, nome: 'Area 2' }] });
  });

  it('si corregge: solo i campi mandati; cambiando dedalo resta da collocare nel nuovo e va in fondo; togliendo il Confidente va via il rango', async () => {
    const r = (await elenco()).richieste.find((x) => x.areaChiave === AIYATSBUS && x.confidente)!;
    const corretta = (await request(app).put(`/api/compendio/richieste/${r.chiave}`).send({ committente: 'Un altro', note: 'Note nuove' }).expect(200)).body.data as RichiestaDto;
    expect(corretta).toMatchObject({ chiave: r.chiave, nome: r.nome, committente: 'Un altro', note: 'Note nuove', bersaglio: r.bersaglio, areaDedalo: r.areaDedalo, confidente: r.confidente });
    const spostata = (await request(app).put(`/api/compendio/richieste/${r.chiave}`).send({ dedalo: QIMRANUT, confidente: null }).expect(200)).body.data as RichiestaDto;
    expect(spostata).toMatchObject({ areaChiave: QIMRANUT, area: 'Dedalo di Qimranut', areaDedalo: null, confidente: null });
    expect(prepared('SELECT confidente_rango FROM richiesta WHERE chiave = ?').pluck().get(r.chiave)).toBeNull();
    expect(prepared('SELECT ordine FROM richiesta WHERE chiave = ?').pluck().get(r.chiave)).toBe(prepared('SELECT MAX(ordine) FROM richiesta').pluck().get());
    // con un'area la Richiesta passa nell'area; senza dedalo esce dai Memento
    expect((await request(app).put(`/api/compendio/richieste/${r.chiave}`).send({ areaDedalo: `${QIMRANUT}-area-1` }).expect(200)).body.data).toMatchObject({ areaDedalo: `${QIMRANUT}-area-1` });
    expect((await request(app).put(`/api/compendio/richieste/${r.chiave}`).send({ dedalo: null }).expect(200)).body.data).toMatchObject({ areaChiave: null, areaDedalo: null, area: '' });
    expect((await request(app).put('/api/compendio/richieste/nessuna').send({ note: 'x' })).status).toBe(404);
  });

  it('la prosa della guida sul dove («Dedalo di Aiyatsbus (Area 7) / …») resta finché il dedalo non cambia', async () => {
    const r = prepared("SELECT chiave, area FROM richiesta WHERE area LIKE 'Dedalo di Aiyatsbus (%'").get() as { chiave: string; area: string };
    const area = `${AIYATSBUS}-area-1`;
    expect((await request(app).put(`/api/compendio/richieste/${r.chiave}`).send({ note: 'altro', dedalo: AIYATSBUS }).expect(200)).body.data).toMatchObject({ area: r.area });
    expect((await request(app).put(`/api/compendio/richieste/${r.chiave}/area`).send({ areaDedalo: null }).expect(200)).body.data).toMatchObject({ area: r.area, areaDedalo: null });
    expect((await request(app).put(`/api/compendio/richieste/${r.chiave}/area`).send({ areaDedalo: area }).expect(200)).body.data).toMatchObject({ area: r.area, areaDedalo: area });
    expect((await request(app).put(`/api/compendio/richieste/${r.chiave}`).send({ dedalo: QIMRANUT }).expect(200)).body.data).toMatchObject({ area: 'Dedalo di Qimranut' });
  });

  it('cambiando nome le voci della giornata che la indicano mostrano il nome nuovo', async () => {
    const chiave = 'un-intruso-a-yongen-jaya';
    const testo = () => prepared("SELECT riferimento_testo FROM voce_giornata WHERE riferimento_tipo = 'richiesta' AND riferimento_chiave = ?").pluck().all(chiave);
    // L13 (O7-3, migrazione 312): il nome scritto uguale a quello della Richiesta si è svuotato, la voce lo legge dalla Richiesta (`nomeDi`)
    const voce = prepared("SELECT uid, data FROM voce_giornata WHERE riferimento_tipo = 'richiesta' AND riferimento_chiave = ?").get(chiave) as { uid: string; data: string };
    const mostrato = async () => ((await request(app).get(`/api/compendio/percorso/${voce.data}`)).body.data as PercorsoGiornoDto).azioni.find((a) => a.uid === voce.uid)!.riferimentoTesto;
    expect(testo()).toEqual([null]);
    expect(await mostrato()).toBe('Un intruso a Yongen-Jaya');
    await request(app).put(`/api/compendio/richieste/${chiave}`).send({ nome: 'Un intruso al Leblanc' }).expect(200);
    expect(await mostrato()).toBe('Un intruso al Leblanc');
    expect(testo()).toEqual([null]);
    // un nome scritto diverso segue la rinomina (`richiesteService`, solo dove il nome scritto c'è)
    prepared("UPDATE voce_giornata SET riferimento_testo = 'Un intruso al Leblanc' WHERE riferimento_chiave = ?").run(chiave);
    await request(app).put(`/api/compendio/richieste/${chiave}`).send({ nome: 'Un intruso a Yongen-Jaya' }).expect(200);
    expect(testo()).toEqual(['Un intruso a Yongen-Jaya']);
    // un'altra correzione, senza cambiare nome, non le tocca
    prepared("UPDATE voce_giornata SET riferimento_testo = 'Testo a mano' WHERE riferimento_chiave = ?").run(chiave);
    await request(app).put(`/api/compendio/richieste/${chiave}`).send({ note: 'Nota' }).expect(200);
    expect(testo()).toEqual(['Testo a mano']);
  });

  it('cambiando nome i requisiti dei Confidenti che la citavano per nome la citano per chiave, e la riconoscono ancora', async () => {
    const r = prepared("SELECT chiave, nome FROM richiesta WHERE nome = 'Lo zio ingordo'").get() as { chiave: string; nome: string };
    const prima = prepared("SELECT rango, dati_json, testo FROM confidente_requisito WHERE confidente_chiave = 'sojiro' AND tipo = 'richiesta'").get() as { rango: number; dati_json: string; testo: string };
    expect(JSON.parse(prima.dati_json)).toEqual({ richiesta: 'Lo zio ingordo' });
    await request(app).put(`/api/compendio/richieste/${r.chiave}`).send({ nome: 'Lo zio insaziabile' }).expect(200);
    const dopo = prepared("SELECT dati_json, testo FROM confidente_requisito WHERE confidente_chiave = 'sojiro' AND tipo = 'richiesta'").get() as { dati_json: string; testo: string };
    expect(JSON.parse(dopo.dati_json)).toEqual({ richiesta: r.chiave });
    expect(dopo.testo).toBe(prima.testo.replace('Lo zio ingordo', 'Lo zio insaziabile'));
    // un nome già di un'altra Richiesta no; lo stesso con altre maiuscole sì
    expect((await request(app).put(`/api/compendio/richieste/${r.chiave}`).send({ nome: 'un fidanzato VIOLENTO' })).body.error.code).toBe('nome-gia-usato');
    expect((await request(app).put(`/api/compendio/richieste/${r.chiave}`).send({ nome: 'è una figlia o un buono pasto?' })).body.error.code).toBe('nome-gia-usato');
    expect((await request(app).put(`/api/compendio/richieste/${r.chiave}`).send({ nome: 'Lo Zio Insaziabile' }).expect(200)).body.data.nome).toBe('Lo Zio Insaziabile');
    // completata nella partita, il requisito è verde: la riconosce per chiave
    const partita = await nuovaPartita('Rinomina');
    apriIDedali();
    await request(app).put(`/api/partite/${partita}/richieste`).send({ richiesta: r.chiave, stato: 'completata' }).expect(200);
    const st = statoPartitaSemafori(partita, new Map(), new Map());
    const requisito = semaforiConfidente('sojiro', prima.rango - 1, st).flatMap((s) => s.requisiti).find((q) => q.tipo === 'richiesta');
    expect(requisito).toMatchObject({ stato: 'verde' });
  });

  it('chi la cita si dice prima di eliminarla; eliminata, i suoi stati vanno via, pin e azioni si scollegano, condizioni e requisiti restano da correggere', async () => {
    const partita = await nuovaPartita('Elimina');
    // «Un fidanzato violento»: un requisito di Chihaya (per nome), una voce della giornata (per chiave); in più un pin, una
    // condizione di un libro e uno stato nella partita messi qui
    const r = prepared("SELECT chiave, nome FROM richiesta WHERE nome = 'Un fidanzato violento'").get() as { chiave: string; nome: string };
    // O7-1 (310): «Un fidanzato violento» si accetta solo dal 30 giugno con lo sblocco della voce; qui conta solo che la partita abbia uno stato
    prepared("INSERT INTO richiesta_partita (partita_id, richiesta_chiave, stato, updated_at) VALUES (?, ?, 'accettata', ?)").run(partita, r.chiave, new Date().toISOString());
    const pin = prepared("SELECT id, nome FROM spillo WHERE riferimento_tipo IS NULL AND mappa_chiave IS NOT NULL ORDER BY id LIMIT 1").get() as { id: number; nome: string };
    prepared("UPDATE spillo SET riferimento_tipo = 'richiesta', riferimento_chiave = ? WHERE id = ?").run(r.chiave, pin.id);
    const libro = prepared('SELECT chiave, nome FROM libro ORDER BY chiave LIMIT 1').get() as { chiave: string; nome: string };
    prepared('UPDATE libro SET condizioni_json = ? WHERE chiave = ?').run(JSON.stringify([{ tipo: 'gruppo', modo: 'tutte', condizioni: [{ tipo: 'richiesta', richiesta: r.chiave }] }]), libro.chiave);
    // le azioni della giornata stanno in `voce_giornata` (092); `giorno_percorso.azioni_json` è la copia storica che nessuno legge più:
    // non si conta e non si tocca (rilievo del validatore, 2026-10-11)
    const voci = prepared("SELECT COUNT(*) FROM voce_giornata WHERE riferimento_tipo = 'richiesta' AND riferimento_chiave = ?").pluck().get(r.chiave) as number;
    expect(voci).toBe(1);
    const storica = prepared("SELECT azioni_json FROM giorno_percorso WHERE azioni_json LIKE ?").pluck().get(`%"chiave":"${r.chiave}"%`) as string | undefined;
    const citazioni = (await request(app).get(`/api/compendio/richieste/${r.chiave}/citazioni`).expect(200)).body.data as CitazioniRichiestaDto;
    expect(citazioni).toMatchObject({ partite: 1, pin: [pin.nome] });
    expect(citazioni.condizioni).toContain(`Libro: ${libro.nome}`);
    expect(citazioni.requisiti).toEqual([expect.stringMatching(/, rango \d+$/)]);
    expect(citazioni.azioni).toBe(voci);
    await request(app).delete(`/api/compendio/richieste/${r.chiave}`).expect(204);
    expect(prepared('SELECT COUNT(*) FROM richiesta WHERE chiave = ?').pluck().get(r.chiave)).toBe(0);
    expect(prepared('SELECT COUNT(*) FROM richiesta_partita WHERE richiesta_chiave = ?').pluck().get(r.chiave)).toBe(0);
    expect(prepared('SELECT riferimento_tipo, riferimento_chiave FROM spillo WHERE id = ?').get(pin.id)).toEqual({ riferimento_tipo: null, riferimento_chiave: null });
    expect(prepared("SELECT COUNT(*) FROM voce_giornata WHERE riferimento_tipo = 'richiesta' AND riferimento_chiave = ?").pluck().get(r.chiave)).toBe(0);
    if (storica) expect(prepared("SELECT azioni_json FROM giorno_percorso WHERE azioni_json = ?").pluck().get(storica)).toBe(storica);
    // la condizione resta, ed è grigia (da correggere), non «non completata»
    const condizione: RequisitoSpillo = { tipo: 'richiesta', richiesta: r.chiave };
    const esito = valutaRequisiti([{ ...condizione, testo: descriviRequisitoSpillo(condizione) }], statoDisponibilitaPartita(partita));
    expect(esito.requisiti?.[0]).toMatchObject({ tipo: 'richiesta', stato: 'grigio' });
    expect(esito.requisiti?.[0].dettaglio).toMatch(/non c’è più/);
    // la citava per chiave: ora per nome, perché l'avviso dica quale
    expect(JSON.parse(prepared('SELECT condizioni_json FROM libro WHERE chiave = ?').pluck().get(libro.chiave) as string))
      .toEqual([{ tipo: 'gruppo', modo: 'tutte', condizioni: [{ tipo: 'richiesta', richiesta: r.nome }] }]);
    const perNome: RequisitoSpillo = { tipo: 'richiesta', richiesta: r.nome };
    expect(valutaRequisiti([{ ...perNome, testo: descriviRequisitoSpillo(perNome) }], statoDisponibilitaPartita(partita)).requisiti?.[0])
      .toMatchObject({ stato: 'grigio', dettaglio: `La Richiesta «${r.nome}» non c’è più: correggi quel che la cita` });
    // il requisito di Chihaya resta, grigio, senza conferma a mano
    const st = statoPartitaSemafori(partita, new Map(), new Map());
    const requisito = semaforiConfidente('chihaya', 0, st).flatMap((s) => s.requisiti).find((q) => q.tipo === 'richiesta');
    expect(requisito).toMatchObject({ stato: 'grigio', manuale: false });
    expect((await request(app).get(`/api/compendio/richieste/${r.chiave}/citazioni`)).status).toBe(404);
    expect((await request(app).delete(`/api/compendio/richieste/${r.chiave}`)).status).toBe(404);
    // nell'elenco non c'è più, e il resto sì
    expect(await leggi(r.chiave)).toBeUndefined();
  });

  it('un requisito di un Confidente rimasto su una Richiesta eliminata si corregge: un\'altra Richiesta al suo posto, oppure lo si toglie', async () => {
    const partita = await nuovaPartita('Correggi requisito');
    await request(app).delete('/api/compendio/richieste/un-fidanzato-violento').expect(204);
    /** Il requisito della Richiesta di Chihaya al rango 1, come lo valutano i semafori della partita. */
    const requisito = () => semaforiConfidente('chihaya', 0, statoPartitaSemafori(partita, new Map(), new Map()))[0].requisiti.find((q) => q.indice === 0);
    expect(requisito()).toMatchObject({ tipo: 'richiesta', stato: 'grigio', manuale: false });
    // un'altra Richiesta: il requisito la cita per chiave e il testo ne dice il nome; non completata è rossa, completata verde
    await request(app).put('/api/compendio/confidenti/chihaya/requisiti/1/0').send({ richiesta: 'lo-zio-ingordo' }).expect(204);
    expect(prepared("SELECT dati_json, testo FROM confidente_requisito WHERE confidente_chiave = 'chihaya' AND rango = 1 AND indice = 0").get())
      .toEqual({ dati_json: '{"richiesta":"lo-zio-ingordo"}', testo: 'Completare la richiesta dei Mementos "Lo zio ingordo" prima di poter far salire il Rango Confidente' });
    // citata per chiave, il dettaglio dice il nome
    expect(requisito()).toMatchObject({ stato: 'rosso', dettaglio: 'Richiesta «Lo zio ingordo» non risulta completata (Guida → Richieste)' });
    apriIDedali();
    await request(app).put(`/api/partite/${partita}/richieste`).send({ richiesta: 'lo-zio-ingordo', stato: 'completata' }).expect(200);
    expect(requisito()).toMatchObject({ stato: 'verde', dettaglio: 'Richiesta «Lo zio ingordo» completata' });
    // eliminata anche questa, il requisito che la citava per chiave torna a citarla per nome: l'avviso dice quale, non la chiave
    await request(app).delete('/api/compendio/richieste/lo-zio-ingordo').expect(204);
    expect(prepared("SELECT dati_json FROM confidente_requisito WHERE confidente_chiave = 'chihaya' AND rango = 1 AND indice = 0").pluck().get()).toBe('{"richiesta":"Lo zio ingordo"}');
    expect(requisito()).toMatchObject({ stato: 'grigio', manuale: false, dettaglio: 'La Richiesta «Lo zio ingordo» non c’è più: correggi quel che la cita' });
    // toglierlo: se ne va, con le conferme delle partite; gli altri requisiti del rango tengono il loro indice
    await request(app).delete('/api/compendio/confidenti/chihaya/requisiti/1/0').expect(204);
    expect(requisito()).toBeUndefined();
    expect(prepared("SELECT indice FROM confidente_requisito WHERE confidente_chiave = 'chihaya' AND rango = 1 ORDER BY indice").pluck().all()).toEqual([1, 2]);
    // gli errori: requisito che non c'è, requisito di un altro tipo, Richiesta che non c'è
    expect((await request(app).delete('/api/compendio/confidenti/chihaya/requisiti/1/0')).status).toBe(404);
    expect((await request(app).put('/api/compendio/confidenti/chihaya/requisiti/1/1').send({ richiesta: 'lo-zio-ingordo' })).body.error.code).toBe('requisito-non-di-richiesta');
    expect((await request(app).delete('/api/compendio/confidenti/chihaya/requisiti/1/2')).body.error.code).toBe('requisito-non-di-richiesta');
    expect((await request(app).put('/api/compendio/confidenti/sojiro/requisiti/9/0').send({ richiesta: 'nessuna' })).body.error.code).toBe('richiesta-non-trovata');
  });

  it('O7-1: condizioni proprie per completarla e area della proroga si salvano e si validano; le condizioni di completamento contano fra le citazioni', async () => {
    const chiave = 'un-bullo-che-abbaia-e-morde';
    const area = 'mementos-09-daat-area-1';
    const r = (await request(app).put(`/api/compendio/richieste/${chiave}`).send({ scadenzaData: '12-23',
      proroga: { data: '02-01', condizioni: [{ tipo: 'evento', evento: 'terzo-semestre-avviato' }], areaDedalo: area },
      completamentoCondizioni: [{ tipo: 'richiesta', richiesta: 'un-ex-piuttosto-appiccicoso' }] }).expect(200)).body.data as RichiestaDto;
    expect(r.proroga).toMatchObject({ data: '02-01', areaDedalo: area, areaDedaloNome: 'Piano 1', dedaloNome: "Dedalo di Da'at" });
    expect(r.completamentoCondizioni).toEqual([expect.objectContaining({ tipo: 'richiesta', richiesta: 'un-ex-piuttosto-appiccicoso' })]);
    expect(prepared('SELECT proroga_area_dedalo_chiave AS a, completamento_condizioni_json AS c FROM richiesta WHERE chiave = ?').get(chiave))
      .toEqual({ a: area, c: '[{"tipo":"richiesta","richiesta":"un-ex-piuttosto-appiccicoso"}]' });
    // la Richiesta citata dalle condizioni di completamento lo sa
    expect(((await request(app).get('/api/compendio/richieste/un-ex-piuttosto-appiccicoso/citazioni').expect(200)).body.data as CitazioniRichiestaDto).condizioni)
      .toContain('Richiesta: Un bullo che abbaia e morde (per completarla)');
    // la proroga mandata senza `areaDedalo` (Richiesta salvata per altro) lascia l'area salvata
    await request(app).put(`/api/compendio/richieste/${chiave}`).send({ scadenzaData: '12-23', proroga: { data: '02-01', condizioni: [{ tipo: 'evento', evento: 'terzo-semestre-avviato' }] } }).expect(200);
    expect(prepared('SELECT proroga_area_dedalo_chiave FROM richiesta WHERE chiave = ?').pluck().get(chiave)).toBe(area);
    // un'area che non c'è, una condizione che non si riconosce: niente salvato
    expect((await request(app).put(`/api/compendio/richieste/${chiave}`).send({ scadenzaData: '12-23', proroga: { data: '02-01', condizioni: [], areaDedalo: 'nessuna' } })).body.error.code).toBe('area-dedalo-non-trovata');
    expect((await request(app).put(`/api/compendio/richieste/${chiave}`).send({ completamentoCondizioni: [{ tipo: 'boh' }] })).body.error.code).toBe('condizioni-non-valide');
    // senza condizioni la colonna torna vuota; togliendo la proroga se ne va anche la sua area
    await request(app).put(`/api/compendio/richieste/${chiave}`).send({ completamentoCondizioni: [], scadenzaData: '12-23', proroga: null }).expect(200);
    expect(prepared('SELECT proroga_area_dedalo_chiave AS a, completamento_condizioni_json AS c FROM richiesta WHERE chiave = ?').get(chiave)).toEqual({ a: null, c: null });
  });
});
