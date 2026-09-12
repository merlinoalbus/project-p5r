// ============================================================
// Test API — voce 5 del piano «struttura, non frasi»: il server legge i valori, non le frasi
// ============================================================
//
// Orari come presenza del negozio, sedi di negozi e attività, luoghi nel catalogo, effetti
// dichiarati di libri e film, raccolta sulle planimetrie dei Palazzi, obiettivi dei dedali dei
// Memento (timbri e richieste), richieste per dedalo, prossimo cruciverba, letture rifiutate
// quando non disponibili, ricerca degli articoli per categorie, stato e disponibilità.
// ============================================================

import request from 'supertest';
import { closeDb, initDb, getDb } from '../db/dbService.js';
import { caricaPacchetto } from '../services/pacchetto/pacchettoGioco.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import type { AttivitaTutteDto, CruciverbaTuttiDto, DungeonDettaglioDto, DungeonRiassuntoDto, ElementoCatalogoDto, LibriDto, LuogoOpzioneDto, NegozioDettaglioDto, NegozioRiassuntoDto, QuartiereDettaglioDto, RicercaArticoliDto, RichiesteDto, TimbriDedaloDto, VideogiochiDto } from '../../shared/types.js';

const app = createApp();
const partita = async (dati: Record<string, unknown>) => ((await request(app).post('/api/partite').send(dati)).body.data as { id: number }).id;

describe('voce 5 — il server legge i valori del catalogo', () => {
  beforeAll(() => { const db = initDb(':memory:'); caricaPacchetto(db); invalidaCacheTraduzioni(); });
  afterAll(() => closeDb());

  it('la presenza di un negozio sono i suoi orari; la sede e il programma punti sono nel DTO', async () => {
    const senza = (await request(app).get('/api/compendio/negozi')).body.data as NegozioRiassuntoDto[];
    const untouchable = senza.find((n) => n.chiave === 'untouchable')!;
    expect(untouchable.orariStrutturati).toMatchObject({ giorni: ['giovedi', 'sabato', 'domenica'], fasce: ['sera'] });
    expect(untouchable.orariTesto).toMatch(/^Solo di sera, giovedì, sabato e domenica/);
    expect(untouchable.sedeChiave).toBe('shibuya/untouchable');
    expect(untouchable.sedeNome).toBe('Untouchable');
    expect(untouchable.condizioni?.map((c) => c.tipo)).toEqual(['giorno-settimana', 'fascia']);
    expect(senza.find((n) => n.chiave === 'tanaka-affari-loschi')).toMatchObject({ sedeChiave: null, programmaPunti: { calcolo: 'rango-cliente' } });
    expect(senza.find((n) => n.chiave === 'vestiti-usati-kichijoji')?.programmaPunti).toMatchObject({ calcolo: 'manuale' });
    // giovedì 15 dicembre di sera Untouchable è aperto, di giorno no; Takemi il contrario
    const sera = await partita({ nome: 'Sera', dataGioco: '12-15', fasciaGioco: 'sera' });
    const giorno = await partita({ nome: 'Giorno', dataGioco: '12-15', fasciaGioco: 'giorno' });
    const diSera = (await request(app).get(`/api/compendio/negozi?partita=${sera}`)).body.data as NegozioRiassuntoDto[];
    const diGiorno = (await request(app).get(`/api/compendio/negozi?partita=${giorno}`)).body.data as NegozioRiassuntoDto[];
    expect(diSera.find((n) => n.chiave === 'untouchable')?.disponibilita?.stato).toBe('disponibile');
    expect(diGiorno.find((n) => n.chiave === 'untouchable')?.disponibilita?.stato).toBe('bloccato');
    expect(diGiorno.find((n) => n.chiave === 'clinica-takemi')?.disponibilita?.stato).toBe('disponibile');
    expect(diSera.find((n) => n.chiave === 'clinica-takemi')?.disponibilita?.stato).toBe('bloccato');
    // un articolo eredita gli orari (daNegozio) e porta lo sblocco che era del negozio
    const takemi = (await request(app).get(`/api/compendio/negozi/clinica-takemi?partita=${sera}`)).body.data as NegozioDettaglioDto;
    const a = takemi.articoliElenco[0];
    expect(a.disponibilita?.requisiti.some((r) => r.daNegozio && r.tipo === 'fascia')).toBe(true);
    expect(a.condizioni?.some((c) => c.tipo === 'confidente')).toBe(true);
  });

  it('la ricerca degli articoli filtra per più categorie, per stato d’acquisto e per disponibilità', async () => {
    const id = await partita({ nome: 'Ricerca', dataGioco: '12-15', fasciaGioco: 'sera' });
    const libriEGiochi = (await request(app).get('/api/compendio/articoli?categorie=libro,videogioco')).body.data as RicercaArticoliDto;
    expect(libriEGiochi.totale).toBe(37);
    expect(libriEGiochi.articoli.every((x) => x.categoria === 'libro' || x.categoria === 'videogioco')).toBe(true);
    const bloccati = (await request(app).get(`/api/compendio/articoli?partita=${id}&disponibilita=bloccati`)).body.data as RicercaArticoliDto;
    expect(bloccati.totale).toBeGreaterThan(0);
    expect(bloccati.articoli.every((x) => x.disponibilita?.stato === 'bloccato')).toBe(true);
    const disponibili = (await request(app).get(`/api/compendio/articoli?partita=${id}&disponibilita=disponibili`)).body.data as RicercaArticoliDto;
    expect(disponibili.totale + bloccati.totale).toBe(576);
    const primo = disponibili.articoli[0];
    await request(app).put(`/api/partite/${id}/acquisti`).send({ articolo: primo.chiave, fatto: true });
    const acquistati = (await request(app).get(`/api/compendio/articoli?partita=${id}&stato=acquistati`)).body.data as RicercaArticoliDto;
    expect(acquistati.articoli.map((x) => x.chiave)).toEqual([primo.chiave]);
    expect(((await request(app).get(`/api/compendio/articoli?partita=${id}&stato=da-acquistare`)).body.data as RicercaArticoliDto).totale).toBe(575);
    expect((await request(app).get('/api/compendio/articoli?categoria=libro')).status).toBe(200);
  });

  it('i luoghi: elenco per la scelta della sede, negozi e attività dalle sedi, il tipo «luogo» nel catalogo', async () => {
    const luoghi = (await request(app).get('/api/compendio/luoghi')).body.data as LuogoOpzioneDto[];
    expect(luoghi.length).toBe(93);
    expect(luoghi.find((l) => l.chiave === 'shibuya/untouchable')).toMatchObject({ quartiere: 'shibuya', quartiereNome: 'Shibuya', tipo: 'negozio' });
    const shibuya = (await request(app).get('/api/compendio/citta/shibuya')).body.data as QuartiereDettaglioDto;
    const untouchable = shibuya.luoghi.find((l) => l.chiave === 'shibuya/untouchable')!;
    expect(untouchable.negozi).toEqual([{ chiave: 'untouchable', nome: 'Untouchable' }]);
    expect(untouchable.negozio).toBe('untouchable');
    expect(untouchable.origine).toBe('seed');
    expect(shibuya.luoghi.find((l) => l.chiave === 'shibuya/diner')?.attivita).toEqual([{ chiave: 'studio-diner-shibuya', nome: expect.any(String) }]);
    // un luogo nuovo dell'utente, nascosto e riportato in elenco dei rimossi
    const creato = (await request(app).post('/api/catalogo/luogo').send({ nome: 'Chiosco di prova', tipo: 'ristorante', quartiere_chiave: 'shibuya', cosa_offre: 'Ramen', giorni_json: ['sabato', 'giovedi', 'giovedi'] })).body.data as ElementoCatalogoDto;
    expect(creato.chiave).toBe('shibuya/u-chiosco-di-prova');
    // i giorni (migrazione 080) viaggiano come elenco di chiavi e stanno in tabella come JSON, senza doppioni e nell'ordine della settimana
    expect(getDb().prepare('SELECT giorni_json FROM luogo WHERE chiave = ?').pluck().get(creato.chiave)).toBe('["giovedi","sabato"]');
    expect(creato.dati.giorni_json).toBe('["giovedi","sabato"]');
    expect((await request(app).post('/api/catalogo/luogo').send({ nome: 'Giorno finto', tipo: 'negozio', quartiere_chiave: 'shibuya', giorni_json: ['lunedi', 'ferragosto'] })).status).toBe(400);
    const modificato = (await request(app).put(`/api/catalogo/luogo/${encodeURIComponent('shibuya/untouchable')}`).send({ giorni_json: ['lunedi'] })).body.data as ElementoCatalogoDto;
    expect(modificato.origine).toBe('utente');
    const dopo = ((await request(app).get('/api/compendio/citta/shibuya')).body.data as QuartiereDettaglioDto).luoghi.find((l) => l.chiave === 'shibuya/untouchable')!;
    expect(dopo.giorni).toEqual(['lunedi']);
    expect(dopo.giorniTesto).toBe('solo il lunedì');
    // il ripristino legge un'istantanea di PRIMA della 080 (con la frase `giorni`, senza `giorni_json`) e ricava le chiavi
    getDb().prepare('UPDATE luogo SET seed_json = ? WHERE chiave = ?').run(JSON.stringify({ ...JSON.parse(getDb().prepare('SELECT seed_json FROM luogo WHERE chiave = ?').pluck().get('shibuya/untouchable') as string), giorni_json: undefined, giorni: 'giovedì, sabato, domenica (per il Confidente Iwai)' }), 'shibuya/untouchable');
    expect((await request(app).delete(`/api/catalogo/luogo/${encodeURIComponent('shibuya/untouchable')}`)).body.data.esito).toBe('ripristinata');
    const ripristinato = ((await request(app).get('/api/compendio/citta/shibuya')).body.data as QuartiereDettaglioDto).luoghi.find((l) => l.chiave === 'shibuya/untouchable')!;
    expect(ripristinato.origine).toBe('seed');
    expect(ripristinato.giorni).toEqual(['giovedi', 'sabato', 'domenica']);
    expect(((await request(app).get('/api/compendio/citta/shibuya')).body.data as QuartiereDettaglioDto).luoghi.some((l) => l.chiave === creato.chiave && l.origine === 'utente')).toBe(true);
    expect((await request(app).post('/api/catalogo/luogo').send({ nome: 'Altrove', tipo: 'negozio', quartiere_chiave: 'atlantide' })).status).toBe(400);
    await request(app).put(`/api/catalogo/luogo/${encodeURIComponent('shibuya/diner')}/nascosta`).send({ nascosta: true });
    expect(((await request(app).get('/api/compendio/citta/shibuya')).body.data as QuartiereDettaglioDto).luoghi.some((l) => l.chiave === 'shibuya/diner')).toBe(false);
    const rimossi = (await request(app).get('/api/catalogo/luogo?nascosti=1')).body.data as ElementoCatalogoDto[];
    expect(rimossi.map((r) => r.chiave)).toEqual(['shibuya/diner']);
    await request(app).put(`/api/catalogo/luogo/${encodeURIComponent('shibuya/diner')}/nascosta`).send({ nascosta: false });
    // i rimossi di un negozio: solo i suoi articoli
    await request(app).put(`/api/catalogo/articolo/${encodeURIComponent('untouchable/kogatana-nera')}/nascosta`).send({ nascosta: true });
    expect(((await request(app).get('/api/catalogo/articolo?nascosti=1&negozio=untouchable')).body.data as ElementoCatalogoDto[]).map((r) => r.chiave)).toEqual(['untouchable/kogatana-nera']);
    expect(((await request(app).get('/api/catalogo/articolo?nascosti=1&negozio=leblanc')).body.data as ElementoCatalogoDto[])).toEqual([]);
    await request(app).put(`/api/catalogo/articolo/${encodeURIComponent('untouchable/kogatana-nera')}/nascosta`).send({ nascosta: false });
  });

  it('scrivendo la sede il quartiere segue; gli orari e il programma punti si salvano come valori', async () => {
    const n = (await request(app).post('/api/catalogo/negozio').send({ nome: 'Bottega di prova', tipo: 'misto', sede_chiave: 'kichijoji/jazz-jin', orari_json: { giorni: ['domenica'], fasce: ['sera'] }, programma_punti_json: { nome: 'Punti', unita: 'punti', calcolo: 'manuale' } })).body.data as ElementoCatalogoDto;
    expect(n.dati).toMatchObject({ luogo_chiave: 'kichijoji', sede_chiave: 'kichijoji/jazz-jin' });
    const scheda = (await request(app).get(`/api/compendio/negozi/${n.chiave}`)).body.data as NegozioDettaglioDto;
    expect(scheda.orariStrutturati).toEqual({ giorni: ['domenica'], fasce: ['sera'], chiusoConPioggia: false, nota: null });
    expect(scheda.orariTesto).toBe('Solo di sera, solo la domenica');
    expect(scheda.programmaPunti).toEqual({ nome: 'Punti', unita: 'punti', calcolo: 'manuale' });
    expect((await request(app).post('/api/catalogo/negozio').send({ nome: 'Altrove', sede_chiave: 'nessun/luogo' })).status).toBe(400);
    const a = (await request(app).post('/api/catalogo/attivita').send({ nome: 'Prova al jazz', tipo: 'lavoro', sede_chiave: 'kichijoji/jazz-jin', paga_yen: 3000 })).body.data as ElementoCatalogoDto;
    expect(a.dati).toMatchObject({ luogo_chiave: 'kichijoji', tracciamento: 'svolta', paga_yen: 3000 });
    expect((await request(app).post('/api/catalogo/attivita').send({ nome: 'Studio pagato', tipo: 'studio', paga_yen: 100 })).status).toBe(400);
    expect((await request(app).post('/api/catalogo/film').send({ nome: 'Al cinema due volte', dove: 'cinema', sessioni: 2 })).status).toBe(400);
  });

  it('la correzione di alcuni campi soltanto vale per ogni tipo, e non cancella gli effetti ricavati dalla migrazione', async () => {
    // ogni tipo accetta un PUT parziale (film e attività portano una rifinitura, che non deve rompere la forma parziale)
    const casi: Array<[string, string, Record<string, unknown>]> = [
      ['negozio', 'untouchable', { note: 'prova' }], ['articolo', 'untouchable/kogatana-nera', { verificato: true }], ['libro', 'il-magnifico-ladro', { verificato: true }],
      ['film', 'cinema-le-sedici-domande', { verificato: true }], ['attivita', 'freccette', { verificato: true }], ['luogo', 'shibuya/diner', { verificato: true }],
      ['domanda', '05-19', { note: 'prova' }], ['cruciverba', '04-18-0', { risposta_en: 'Semesters' }],
    ];
    for (const [tipo, chiave, corpo] of casi) {
      const r = await request(app).put(`/api/catalogo/${tipo}/${encodeURIComponent(chiave)}`).send(corpo);
      expect(r.status, `${tipo}/${chiave}`).toBe(200);
    }
    expect((await request(app).put('/api/catalogo/film/cinema-le-sedici-domande').send({ sessioni: 3 })).status).toBe(400);
    expect((await request(app).put('/api/catalogo/attivita/freccette').send({ paga_yen: 100 })).status).toBe(400);
    // il modulo rimanda tutti i campi vecchi (dote, note, effetto_json nullo, sblocca nullo): gli effetti ricavati dalla prosa restano
    const yoncha = (await request(app).put('/api/catalogo/libro/esplorando-yoncha-4').send({ nome: 'Esplorando Yoncha 4', dote: null, note: null, sblocca: null, effetto_json: null, condizioni_json: [] })).body.data as ElementoCatalogoDto;
    expect(JSON.parse(String(yoncha.dati.effetti_json))).toEqual([{ effetto: { famiglia: 'sblocca-luogo', luogo: 'yongen-jaya' } }]);
    const studio = (await request(app).put('/api/catalogo/attivita/studio-leblanc').send({ nome: 'Studio al Leblanc', doti_json: [{ dote: 'conoscenza', note: null, condizione: '2 punti, 3 con la pioggia' }] })).body.data as ElementoCatalogoDto;
    expect((JSON.parse(String(studio.dati.effetti_json)) as unknown[]).length).toBe(2);
    // se la Dote cambia davvero, la voce semplice si rifà e le altre restano
    const ladro = (await request(app).put('/api/catalogo/libro/il-magnifico-ladro').send({ dote: 'coraggio', note: 2 })).body.data as ElementoCatalogoDto;
    expect(JSON.parse(String(ladro.dati.effetti_json))).toEqual([{ effetto: { famiglia: 'dote', dote: 'coraggio', note: 2 } }]);
    const vague = (await request(app).put('/api/catalogo/libro/vague').send({ dote: 'fascino', note: 1, effetto_json: null })).body.data as ElementoCatalogoDto;
    expect(JSON.parse(String(vague.dati.effetti_json))).toEqual([{ effetto: { famiglia: 'dote', dote: 'fascino', note: 1 } }, { effetto: { famiglia: 'sblocca-luogo', luogo: 'harajuku' } }]);
    // un PUT che tocca un solo campo vecchio legge gli altri dalla riga: la prima visione resta
    const sedici = (await request(app).put('/api/catalogo/film/cinema-le-sedici-domande').send({ note_successive: 0 })).body.data as ElementoCatalogoDto;
    expect(JSON.parse(String(sedici.dati.effetti_json))).toEqual([{ effetto: { famiglia: 'dote', dote: 'coraggio', note: 3 } }]);
    // il negozio non accetta più condizioni: la sua presenza sono gli orari
    const n = (await request(app).put('/api/catalogo/negozio/untouchable').send({ condizioni_json: [{ tipo: 'data', dal: '12-01' }] })).body.data as ElementoCatalogoDto;
    expect('condizioni_json' in n.dati).toBe(false);
    // ripristini
    for (const [tipo, chiave] of [['libro', 'il-magnifico-ladro'], ['libro', 'vague'], ['libro', 'esplorando-yoncha-4'], ['attivita', 'studio-leblanc'], ['film', 'cinema-le-sedici-domande']]) await request(app).delete(`/api/catalogo/${tipo}/${encodeURIComponent(chiave)}`);
  });

  it('libri, film e attività portano gli effetti dichiarati, dove si comprano e dove si svolgono', async () => {
    const libri = (await request(app).get('/api/compendio/libri')).body.data as LibriDto;
    const vague = libri.libri.find((l) => l.chiave === 'vague')!;
    expect(vague.effetti[0].effetto).toEqual({ famiglia: 'sblocca-luogo', luogo: 'harajuku' });
    expect(vague.sbloccaLuogo).toBe('harajuku');
    expect(vague.effettiTesto[0]).toBe('Sblocca Harajuku');
    expect(vague.negozi).toEqual([{ articolo: 'libreria-taiheido/vague', negozio: 'libreria-taiheido', negozioNome: 'Libreria Taiheido', prezzo: 1800 }]);
    const ladro = libri.libri.find((l) => l.chiave === 'il-magnifico-ladro')!;
    expect(ladro.effettiTesto).toEqual(['Conoscenza ♪♪♪']);
    const a = (await request(app).get('/api/compendio/attivita')).body.data as AttivitaTutteDto;
    expect(a.lavori.find((x) => x.chiave === 'lavoro-crossroads')).toMatchObject({ pagaYen: 7200, pagaMassima: 12000, tracciamento: 'svolta', sedeChiave: 'shinjuku/crossroads', sedeNome: 'Bar Crossroads' });
    expect(a.attivita.find((x) => x.chiave === 'studio-leblanc')?.effetti.map((e) => e.testo)).toEqual(['Conoscenza ♪♪ (non disponibile in caso di pioggia)', 'Conoscenza ♪♪♪ (solo nei giorni di pioggia)']);
    const vg = (await request(app).get('/api/compendio/videogiochi')).body.data as VideogiochiDto;
    expect(vg.videogiochi.find((v) => v.chiave === 'videogioco-punch-ouch')?.negozi).toEqual([{ articolo: 'super-baron/punch-ouch', negozio: 'super-baron', negozioNome: expect.any(String), prezzo: 5300 }]);
    expect(vg.videogiochi.every((v) => v.tracciamento === 'sessioni')).toBe(true);
    expect(a.film.every((f) => Array.isArray(f.effetti))).toBe(true);
  });

  it('una lettura non ancora disponibile non si registra (409), e con la pioggia lo studio vale di più', async () => {
    const presto = await partita({ nome: 'Undici aprile', dataGioco: '04-11' });
    const rifiutata = await request(app).put(`/api/partite/${presto}/letture`).send({ tipo: 'libro', chiave: 'il-magnifico-ladro', avanzamento: 1 });
    expect(rifiutata.status).toBe(409);
    expect(rifiutata.body.error.code).toBe('lettura-non-disponibile');
    const tardi = await partita({ nome: 'Dicembre', dataGioco: '12-15' });
    expect((await request(app).put(`/api/partite/${tardi}/letture`).send({ tipo: 'libro', chiave: 'il-magnifico-ladro', avanzamento: 1 })).status).toBe(200);
    // azzerare è sempre permesso
    expect((await request(app).put(`/api/partite/${presto}/letture`).send({ tipo: 'libro', chiave: 'il-magnifico-ladro', avanzamento: 0 })).status).toBe(200);
  });

  it('i Palazzi contano la raccolta sulle planimetrie; i Memento gli obiettivi dei dedali, timbri compresi', async () => {
    const id = await partita({ nome: 'Raccolta' });
    const elenco = (await request(app).get(`/api/compendio/dungeon?partita=${id}`)).body.data as DungeonRiassuntoDto[];
    const kamoshida = elenco.find((d) => d.chiave === 'kamoshida')!;
    expect(kamoshida.raccolta.totale).toBeGreaterThan(0);
    expect(kamoshida.raccolta).toMatchObject({ presi: 0, mappeComplete: 0 });
    expect(kamoshida.raccolta.mappe).toBeGreaterThan(0);
    const scheda = (await request(app).get(`/api/compendio/dungeon/kamoshida?partita=${id}`)).body.data as DungeonDettaglioDto;
    // le planimetrie con collezionabili sono l'albero del Palazzo: la somma è la raccolta
    expect(scheda.planimetrie.length).toBe(scheda.raccolta.mappe);
    expect(scheda.planimetrie.reduce((s, m) => s + m.n, 0)).toBe(scheda.raccolta.totale);
    expect(scheda.planimetrie.every((m) => m.n === m.spilli.length && m.presi === 0)).toBe(true);
    const conSpilli = scheda.planimetrie[0];
    expect(conSpilli.spilli[0]).toMatchObject({ raccolto: false, colore: expect.stringMatching(/^#/) });
    // le planimetrie legate alle aree portano gli stessi conteggi
    for (const m of scheda.aree.flatMap((a) => a.mappe)) expect(m.n).toBe(m.spilli.length);
    // segnare uno spillo raccolto muove la raccolta
    await request(app).put(`/api/partite/${id}/spilli/${conSpilli.spilli[0].id}`).send({ raccolto: true });
    const dopo = (await request(app).get(`/api/compendio/dungeon/kamoshida?partita=${id}`)).body.data as DungeonDettaglioDto;
    expect(dopo.raccolta.presi).toBe(1);
    expect(dopo.planimetrie.find((m) => m.chiave === conSpilli.chiave)?.presi).toBe(1);
    expect(scheda.aree.every((a) => a.dedalo === null)).toBe(true);
    // senza partita i conteggi della partita sono nulli
    const senza = (await request(app).get('/api/compendio/dungeon/kamoshida')).body.data as DungeonDettaglioDto;
    expect(senza.raccolta.presi).toBeNull();
    expect(senza.planimetrie.every((m) => m.presi === null && m.spilli.every((s) => s.raccolto === null))).toBe(true);

    // Memento: timbri dichiarati + richieste per dedalo
    const mementos = (await request(app).get(`/api/compendio/dungeon/mementos?partita=${id}`)).body.data as DungeonDettaglioDto;
    const aiyatsbus = mementos.aree.find((a) => a.chiave === 'mementos-02-aiyatsbus')!;
    expect(aiyatsbus.dedalo?.timbri).toEqual({ totale: 8, raccolti: 0 });
    expect(aiyatsbus.dedalo?.richieste.length).toBeGreaterThan(0);
    expect(aiyatsbus.dedalo?.obiettivi).toEqual({ totale: 8 + aiyatsbus.dedalo!.richieste.length, fatti: 0 });
    const qimranut = mementos.aree.find((a) => a.chiave === 'mementos-01-qimranut')!;
    expect(qimranut.dedalo?.timbri).toEqual({ totale: null, raccolti: null });
    expect(mementos.raccolta.totale).toBe(mementos.aree.reduce((s, a) => s + (a.dedalo?.obiettivi.totale ?? 0), 0));
    // i timbri si segnano, con il tetto della guida e l'evento al completamento
    let t = (await request(app).put(`/api/partite/${id}/timbri`).send({ area: 'mementos-02-aiyatsbus', raccolti: 3 })).body.data as TimbriDedaloDto;
    expect(t).toEqual({ area: 'mementos-02-aiyatsbus', raccolti: 3, totale: 8, completato: false });
    t = (await request(app).put(`/api/partite/${id}/timbri`).send({ area: 'mementos-02-aiyatsbus', raccolti: 20 })).body.data as TimbriDedaloDto;
    expect(t).toEqual({ area: 'mementos-02-aiyatsbus', raccolti: 8, totale: 8, completato: true });
    const storico = (await request(app).get(`/api/partite/${id}/storico`)).body.data as { eventi: Array<{ tipo: string }> };
    expect(storico.eventi.filter((e) => e.tipo === 'timbri-dedalo')).toHaveLength(1);
    const conTimbri = (await request(app).get(`/api/compendio/dungeon/mementos?partita=${id}`)).body.data as DungeonDettaglioDto;
    expect(conTimbri.aree.find((a) => a.chiave === 'mementos-02-aiyatsbus')?.dedalo?.obiettivi.fatti).toBe(8);
    expect((await request(app).put(`/api/partite/${id}/timbri`).send({ area: 'kamoshida-01-cancello-del-castello-ingresso', raccolti: 1 })).status).toBe(400);
    expect((await request(app).put(`/api/partite/${id}/timbri`).send({ area: 'mementos-01-qimranut', raccolti: 1 })).body.error.code).toBe('timbri-non-dichiarati');
    expect((await request(app).put(`/api/partite/${id}/timbri`).send({ area: 'mementos-02-aiyatsbus', raccolti: -1 })).status).toBe(400);
  });

  it('le richieste sono ordinate per dedalo e l’elenco porta i dedali con i conteggi', async () => {
    const id = await partita({ nome: 'Richieste' });
    const r = (await request(app).get(`/api/compendio/richieste?partita=${id}`)).body.data as RichiesteDto;
    expect(r.dedali.length).toBeGreaterThan(1);
    expect(r.dedali.map((d) => d.ordine)).toEqual([...r.dedali.map((d) => d.ordine)].sort((a, b) => a - b));
    expect(r.dedali.reduce((s, d) => s + d.totale, 0)).toBe(r.richieste.filter((x) => x.areaChiave).length);
    const ordini = r.richieste.filter((x) => x.areaOrdine !== null).map((x) => x.areaOrdine as number);
    expect(ordini).toEqual([...ordini].sort((a, b) => a - b));
    expect(r.richieste[0].areaNome).toBeTruthy();
    await request(app).put(`/api/partite/${id}/richieste`).send({ richiesta: r.richieste[0].chiave, stato: 'completata' });
    const dopo = (await request(app).get(`/api/compendio/richieste?partita=${id}`)).body.data as RichiesteDto;
    expect(dopo.dedali.find((d) => d.chiave === r.richieste[0].areaChiave)?.completate).toBe(1);
  });

  it('il cruciverba conosce il giorno della partita e il prossimo da risolvere', async () => {
    const id = await partita({ nome: 'Cruciverba', dataGioco: '05-10' });
    const c = (await request(app).get(`/api/compendio/cruciverba?partita=${id}`)).body.data as CruciverbaTuttiDto;
    expect(c.dataGioco).toBe('05-10');
    expect(c.prossimo).toBeTruthy();
    expect(c.prossimo!.giorno >= '05-10').toBe(true);
    await request(app).put(`/api/partite/${id}/cruciverba`).send({ data: c.prossimo!.giorno, fatto: true });
    const dopo = (await request(app).get(`/api/compendio/cruciverba?partita=${id}`)).body.data as CruciverbaTuttiDto;
    expect(dopo.prossimo?.giorno).not.toBe(c.prossimo!.giorno);
    expect(((await request(app).get('/api/compendio/cruciverba')).body.data as CruciverbaTuttiDto).prossimo).toBeNull();
  });
});
