// ============================================================
// Test disponibilitaService — dalla prosa della guida agli stati (una volta), e valutazione sulla partita
// ============================================================

import { closeDb, getDb, initDb } from '../db/dbService.js';
import { caricaPacchetto } from './pacchetto/pacchettoGioco.js';
import { invalidaCacheTraduzioni } from './traduzioniService.js';
import { arcoAllaData, dataSbloccoQuartiere, valutaRequisiti, valutaRequisitiSpillo, type RequisitoDisponibilita, type StatoDisponibilita } from './disponibilitaService.js';
import { convertiProsa, migraTestiCondizioni, type ContestoConversione } from '../../shared/migraCondizioni.js';
import { descriviRequisitoSpillo, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';
import { contestoConversione, contestoRiga } from './condizioni/contestoConversione.js';

let ctx: ContestoConversione;
// il valutatore dei semafori traduce i nomi (Confidenti, arcani) leggendo il glossario dal DB
beforeAll(() => { const db = initDb(':memory:'); caricaPacchetto(db); invalidaCacheTraduzioni(); ctx = contestoConversione(getDb()); });
afterAll(() => closeDb());

const FINESTRE = new Map([['kamoshida', { dal: '04-12', al: '05-02' }], ['madarame', { dal: '05-16', al: '06-05' }], ['kaneshiro', { dal: '06-19', al: '07-09' }], ['niijima', { dal: '10-29', al: '11-20' }]]);

function stato(sovrascrivi: Partial<StatoDisponibilita> = {}): StatoDisponibilita {
  return {
    doti: new Map([['fascino', 1], ['coraggio', 1], ['conoscenza', 1], ['perizia', 1], ['gentilezza', 1]]),
    arcaniInScorta: new Set(), personeConAbilita: new Set(), bossGestiti: new Set(), richiesteCompletate: new Set(),
    ranghiConfidenti: new Map([['sojiro', 1], ['iwai', 0]]), membriSquadra: new Set<string>(['ryuji']), membriFuoriSquadra: new Set<string>(['akechi']), dataGioco: '04-20', fasciaGioco: 'giorno', meteoOggi: 'Sereno', conferme: new Set(),
    giornoSettimana: 'mercoledi',
    sbloccoQuartieri: new Map([['akihabara', { nome: 'Akihabara', dal: '08-31' }], ['shinjuku', { nome: 'Shinjuku', dal: '06-18' }], ['kichijoji', { nome: 'Kichijoji', dal: null }]]),
    articoliOttenuti: new Set(), letture: new Set(), contatori: new Map(), attivitaSvolte: new Map(), spesaPerNegozio: new Map(), puntiNegozio: new Map(), eventi: new Set(),
    arcoCorrente: arcoAllaData('04-20', FINESTRE),
    ...sovrascrivi,
  };
}
const conTesto = (c: RequisitoSpillo[]): RequisitoDisponibilita[] => c.map((x) => ({ ...x, testo: descriviRequisitoSpillo(x) }));
/** La stessa strada dei dati: prosa → stati (una volta) → valutazione. */
const daProsa = (testi: string[], st: StatoDisponibilita, extra: Partial<ContestoConversione> = {}) => valutaRequisiti(conTesto(migraTestiCondizioni(testi, { ...ctx, ...extra })), st);

describe('convertiProsa — le frasi della guida diventano stati, o niente', () => {
  it('date, periodi, giorni singoli, mesi', () => {
    expect(migraTestiCondizioni(['dal 18 aprile'])).toEqual([{ tipo: 'data', dal: '04-18' }]);
    expect(migraTestiCondizioni(['dal primo settembre'])).toEqual([{ tipo: 'data', dal: '09-01' }]);
    expect(migraTestiCondizioni(['domenica 8 maggio'])).toEqual([{ tipo: 'intervallo', dal: '05-08', al: '05-08' }]);
    expect(migraTestiCondizioni(['scambio disponibile dal 26 al 30 luglio'])).toEqual([{ tipo: 'intervallo', dal: '07-26', al: '07-30' }]);
    expect(migraTestiCondizioni(['dal 22 gennaio al 2 febbraio'])).toEqual([{ tipo: 'intervallo', dal: '01-22', al: '02-02' }]);
    expect(migraTestiCondizioni(['gennaio'])).toEqual([{ tipo: 'intervallo', dal: '01-01', al: '01-31' }]);
    expect(migraTestiCondizioni(['agosto-settembre'])).toEqual([{ tipo: 'intervallo', dal: '08-01', al: '09-30' }]);
    expect(migraTestiCondizioni(['disponibile fino al 20 maggio secondo allgamestaff.it (poi sostituito)'])).toEqual([{ tipo: 'intervallo', dal: '04-09', al: '05-20' }]);
  });

  it('archi della storia: «a partire dall\'arco» è un arco, «durante l\'arco» è il periodo del Palazzo', () => {
    expect(migraTestiCondizioni(["a partire dall'arco del Palazzo di Madarame"])).toEqual([{ tipo: 'arco', dungeon: 'madarame' }]);
    expect(migraTestiCondizioni(['a partire dall’arco del Palazzo di Shido'])).toEqual([{ tipo: 'arco', dungeon: 'shido' }]);
    expect(migraTestiCondizioni(["Durante l'arco del Palazzo di Niijima (Casinò)"], { finestraArco: (d) => FINESTRE.get(d) ?? null })).toEqual([{ tipo: 'intervallo', dal: '10-29', al: '11-20' }]);
    expect(migraTestiCondizioni(['dopo Palazzo di Kaneshiro'])).toEqual([{ tipo: 'palazzo', dungeon: 'kaneshiro' }]);
    expect(migraTestiCondizioni(['dopo il primo Palazzo (Kamoshida)'])).toEqual([{ tipo: 'palazzo', dungeon: 'kamoshida' }]);
  });

  it('Doti, Confidenti (con alias e col gestore del negozio), richieste con alias di titolo', () => {
    expect(migraTestiCondizioni(['richiede Fascino Rango 3'])).toEqual([{ tipo: 'dote', dote: 'fascino', rango: 3 }]);
    expect(migraTestiCondizioni(['richiede Coraggio Rango 2, Conoscenza Rango 2 e Perizia Rango 2']).map((r) => (r.tipo === 'dote' ? `${r.dote}${r.rango}` : r.tipo))).toEqual(['coraggio2', 'conoscenza2', 'perizia2']);
    expect(migraTestiCondizioni(['Rango Confidente Sojiro 6'])).toEqual([{ tipo: 'confidente', confidente: 'sojiro', rango: 6 }]);
    expect(migraTestiCondizioni(['Rango Confidente 3'], { confidenteNegozio: 'iwai' })).toEqual([{ tipo: 'confidente', confidente: 'iwai', rango: 3 }]);
    expect(migraTestiCondizioni(['richiede rango massimo del Confidente Haru, Imperatrice'])).toEqual([{ tipo: 'confidente', confidente: 'haru', rango: 10 }]);
    expect(migraTestiCondizioni(["Richiede il Rango Confidente Gemelle 3 (sblocco dell'Isolamento)"])).toEqual([{ tipo: 'confidente', confidente: 'gemelle', rango: 3 }]);
    expect(migraTestiCondizioni(['legato al confidente della torre (shinya oda)'])).toEqual([{ tipo: 'confidente', confidente: 'shinya', rango: 1 }]);
    expect(migraTestiCondizioni(['Rango Confidente Sojiro 9, richiede il completamento della richiesta Lo zio ingordo'], ctx)).toEqual([{ tipo: 'confidente', confidente: 'sojiro', rango: 9 }, { tipo: 'richiesta', richiesta: 'lo-zio-ingordo' }]);
    expect(migraTestiCondizioni(["avviabile dal 4 settembre tramite la richiesta mementos 'i baro non vincono mai'"], ctx)).toEqual([{ tipo: 'data', dal: '09-04' }, { tipo: 'richiesta', richiesta: 'i-vincenti-non-imbrogliano' }]);
  });

  it('calendario, meteo, fascia, stagione, quartieri', () => {
    expect(migraTestiCondizioni(['solo nei giorni di pioggia'])).toEqual([{ tipo: 'piove' }]);
    expect(migraTestiCondizioni(['solo la domenica sera'])).toEqual([{ tipo: 'giorno-settimana', giorni: ['domenica'] }, { tipo: 'fascia', fascia: 'sera' }]);
    expect(migraTestiCondizioni(['Aperto solo di giorno'])).toEqual([{ tipo: 'fascia', fascia: 'giorno' }]);
    expect(migraTestiCondizioni(['Solo dal lunedì al venerdì, di sera; non disponibile in caso di pioggia'])).toEqual([{ tipo: 'giorno-settimana', giorni: ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi'] }, { tipo: 'fascia', fascia: 'sera' }, { tipo: 'meteo', condizione: 'non-piove' }]);
    expect(migraTestiCondizioni(['solo in inverno'])).toEqual([{ tipo: 'stagione', stagione: 'inverno' }]);
    expect(migraTestiCondizioni(['Disponibile da quando si sblocca Akihabara'], ctx)).toEqual([{ tipo: 'quartiere', quartiere: 'akihabara' }]);
    // un quartiere senza data nella Guida non è valutabile: si tiene la data esplicita se c'è
    expect(migraTestiCondizioni(['Disponibile dal 5 giugno, quando si sblocca Kichijoji'], { quartiereDatato: () => false })).toEqual([{ tipo: 'data', dal: '06-05' }]);
  });

  it('attività, eventi, letture, grado cliente, punti negozio, contatori', () => {
    expect(migraTestiCondizioni(['dopo aver giocato a biliardo almeno una volta'])).toEqual([{ tipo: 'attivita', attivita: 'biliardo', volte: 1 }]);
    expect(migraTestiCondizioni(['dopo essere andati a pescare a Ichigaya almeno una volta'])).toEqual([{ tipo: 'attivita', attivita: 'pesca-ichigaya', volte: 1 }]);
    expect(migraTestiCondizioni(['dopo la prima esperienza al lavoro dal fioraio Rafflesia'])).toEqual([{ tipo: 'attivita', attivita: 'lavoro-rafflesia', volte: 1 }]);
    expect(migraTestiCondizioni(["dopo l'evento con Makoto"])).toEqual([{ tipo: 'evento', evento: 'evento-makoto' }]);
    expect(migraTestiCondizioni(['dopo la prima creazione di uno strumento'])).toEqual([{ tipo: 'evento', evento: 'primo-strumento-creato' }]);
    expect(migraTestiCondizioni(["dopo aver letto 'Spadaccino provetto'"], ctx)).toEqual([{ tipo: 'lettura', categoria: 'libro', chiave: 'spadaccino-provetto' }]);
    expect(migraTestiCondizioni(['rango cliente Oscuro'], { negozio: 'tanaka-affari-loschi' })).toEqual([{ tipo: 'rango-cliente', negozio: 'tanaka-affari-loschi', rango: 'oscuro' }]);
    expect(migraTestiCondizioni(['grado Nero (spendere oltre 10.000 yen)'], { negozio: 'tanaka-affari-loschi' })).toEqual([{ tipo: 'rango-cliente', negozio: 'tanaka-affari-loschi', rango: 'nero' }]);
    expect(migraTestiCondizioni(['rango cliente Iniziale'], { negozio: 'tanaka-affari-loschi' })).toEqual([]);
    expect(migraTestiCondizioni(['150 punti negozio'], { negozio: 'vestiti-usati-kichijoji' })).toEqual([{ tipo: 'punti-negozio', negozio: 'vestiti-usati-kichijoji', punti: 150 }]);
    expect(migraTestiCondizioni(['dopo essere andati al cinema o aver visto un DVD almeno una volta'])).toEqual([{ tipo: 'contatore', cosa: 'film-completati', almeno: 1 }]);
    expect(migraTestiCondizioni(['dopo il completamento di un videogioco'])).toEqual([{ tipo: 'contatore', cosa: 'videogiochi-completati', almeno: 1 }]);
  });

  it('alternative e gruppi: «oppure» diventa ALMENO UNA; la mansarda è NON dentro un ALMENO UNA', () => {
    expect(migraTestiCondizioni(['rango 5 di ryuji oppure rango 8 di ann'])).toEqual([{ tipo: 'gruppo', modo: 'almeno-una', condizioni: [{ tipo: 'confidente', confidente: 'ryuji', rango: 5 }, { tipo: 'confidente', confidente: 'ann', rango: 8 }] }]);
    expect(migraTestiCondizioni(['solo se la mansarda del Leblanc non viene pulita (altrimenti si ottiene dopo aver pulito la mansarda del Leblanc, dal 18 aprile)'])).toEqual([{ tipo: 'gruppo', modo: 'almeno-una', condizioni: [
      { tipo: 'non', condizione: { tipo: 'evento', evento: 'mansarda-pulita' } },
      { tipo: 'gruppo', modo: 'tutte', condizioni: [{ tipo: 'evento', evento: 'mansarda-pulita' }, { tipo: 'data', dal: '04-18' }] },
    ] }]);
    expect(migraTestiCondizioni(['dopo aver letto tutti gli altri libri di Jinbocho'], { libriJinbocho: () => ['a', 'b', 'c'], chiaveCorrente: 'b' })).toEqual([{ tipo: 'gruppo', modo: 'tutte', condizioni: [{ tipo: 'lettura', categoria: 'libro', chiave: 'a' }, { tipo: 'lettura', categoria: 'libro', chiave: 'c' }] }]);
  });

  it('il rumore non produce condizioni; ciò che non si converte finisce fra le scartate, mai nei dati', () => {
    for (const t of ['sempre disponibile', 'rifornimento il primo del mese', 'scambio con Proteine d’importazione', 'in vendita anche da Jose nei Mementos', 'Disponibile fin dai primi giorni a Shibuya']) expect(convertiProsa([t])).toEqual({ condizioni: [], scartate: [] });
    const e = convertiProsa(['dopo aver fatto una cosa che nessuno registra']);
    expect(e.condizioni).toEqual([]);
    expect(e.scartate).toEqual(['dopo aver fatto una cosa che nessuno registra']);
    // una parte scartata non trascina via le altre
    expect(convertiProsa(['dal 18 aprile; dopo aver fatto una cosa che nessuno registra'])).toEqual({ condizioni: [{ tipo: 'data', dal: '04-18' }], scartate: ['dopo aver fatto una cosa che nessuno registra'] });
  });

  it('tutta la prosa del seed si converte senza scarti', () => {
    const db = getDb();
    const scartate: string[] = [];
    const campi: Record<string, (r: Record<string, unknown>) => Array<string | null>> = {
      negozio: (r) => [r.sblocco as string | null], articolo: (r) => [r.disponibile_dal as string | null, r.condizione as string | null],
      libro: (r) => [r.disponibile_dal as string | null], film: (r) => [r.periodo as string | null], attivita: (r) => [r.sblocco as string | null],
    };
    for (const [t, f] of Object.entries(campi)) for (const r of db.prepare(`SELECT * FROM ${t}`).all() as Array<Record<string, unknown>>) {
      const testi = f(r).map((x) => (x && /^\d{1,2} [a-zà-ù]+$/i.test(x.trim()) ? `dal ${x.trim()}` : x)).filter(Boolean);
      if (testi.length) scartate.push(...convertiProsa(testi, contestoRiga(db, ctx, { tabella: t, chiave: String(r.chiave), negozio_chiave: r.negozio_chiave, confidente_chiave: r.confidente_chiave })).scartate);
    }
    expect(scartate).toEqual([]);
    // e nessuna riga del catalogo porta più una frase
    for (const t of Object.keys(campi)) expect((db.prepare(`SELECT COUNT(*) AS n FROM ${t} WHERE condizioni_json LIKE '%da-configurare%' OR condizioni_json LIKE '%"tipo":"stato"%'`).get() as { n: number }).n).toBe(0);
  });
});

describe('valutaRequisiti — ogni stato sulla partita', () => {
  it('data, periodo, quartiere: bloccato prima, disponibile dal giorno; senza giorno corrente è ignoto', () => {
    expect(daProsa(['dal 18 aprile'], stato({ dataGioco: '04-16' })).stato).toBe('bloccato');
    expect(daProsa(['dal 18 aprile'], stato({ dataGioco: '04-18' })).stato).toBe('disponibile');
    expect(daProsa(['dal 9 gennaio'], stato({ dataGioco: '12-22' })).stato).toBe('bloccato');
    expect(daProsa(['dal 9 gennaio'], stato({ dataGioco: '01-10' })).stato).toBe('disponibile');
    expect(daProsa(['dal 18 aprile'], stato({ dataGioco: null })).stato).toBe('ignoto');
    expect(daProsa(['domenica 24 aprile'], stato({ dataGioco: '04-24' })).stato).toBe('disponibile');
    expect(daProsa(['domenica 24 aprile'], stato({ dataGioco: '04-25' })).stato).toBe('bloccato');
    expect(daProsa(['Disponibile da quando si sblocca Akihabara'], stato({ dataGioco: '08-30' })).stato).toBe('bloccato');
    expect(daProsa(['Disponibile da quando si sblocca Akihabara'], stato({ dataGioco: '08-31' })).stato).toBe('disponibile');
    // il dato materializzato vince sul testo della Guida
    expect(dataSbloccoQuartiere('18 giugno (evento di trama)')).toBe('06-18');
  });

  it('arco della storia: lo dice la data di gioco e le finestre dei Palazzi; il primo arco vale dall\'inizio', () => {
    expect(arcoAllaData('04-09', FINESTRE)).toBe('kamoshida');
    expect(arcoAllaData('05-16', FINESTRE)).toBe('madarame');
    expect(arcoAllaData('06-10', FINESTRE)).toBe('madarame');
    expect(arcoAllaData('11-01', FINESTRE)).toBe('niijima');
    expect(arcoAllaData(null, FINESTRE)).toBeNull();
    expect(daProsa(["a partire dall'arco del Palazzo di Madarame"], stato({ arcoCorrente: 'kamoshida' })).stato).toBe('bloccato');
    expect(daProsa(["a partire dall'arco del Palazzo di Madarame"], stato({ arcoCorrente: 'madarame' })).stato).toBe('disponibile');
    expect(daProsa(["a partire dall'arco del Palazzo di Madarame"], stato({ arcoCorrente: 'niijima' })).stato).toBe('disponibile');
    expect(daProsa(["a partire dall'arco del Palazzo di Kamoshida"], stato({ arcoCorrente: 'kamoshida' })).stato).toBe('disponibile');
    expect(daProsa(["a partire dall'arco del Palazzo di Madarame"], stato({ arcoCorrente: null })).stato).toBe('ignoto');
  });

  it('Doti, Confidenti, richieste, Palazzi, squadra', () => {
    expect(daProsa(['richiede Fascino Rango 3'], stato()).stato).toBe('bloccato');
    expect(daProsa(['richiede Fascino Rango 3'], stato({ doti: new Map([['fascino', 3]]) })).stato).toBe('disponibile');
    expect(daProsa(['Rango Confidente Sojiro 6'], stato({ ranghiConfidenti: new Map([['sojiro', 6]]) })).stato).toBe('disponibile');
    expect(daProsa(['dopo Palazzo di Kamoshida'], stato()).stato).toBe('bloccato');
    expect(daProsa(['dopo Palazzo di Kamoshida'], stato({ bossGestiti: new Set(['kamoshida']) })).stato).toBe('disponibile');
    const richiesta = daProsa(['richiede il completamento della richiesta Lo zio ingordo'], stato());
    expect(richiesta.stato).toBe('bloccato');
    expect(richiesta.requisiti[0].dettaglio).not.toMatch(/conferma qui/);
    // squadra: chi c'è è verde, chi hai detto di non avere è rosso, chi non hai segnato resta grigio
    expect(valutaRequisiti(conTesto([{ tipo: 'squadra', membro: 'ryuji' }]), stato()).stato).toBe('disponibile');
    expect(valutaRequisiti(conTesto([{ tipo: 'squadra', membro: 'akechi' }]), stato()).stato).toBe('bloccato');
    expect(valutaRequisiti(conTesto([{ tipo: 'squadra', membro: 'ann' }]), stato()).requisiti[0].stato).toBe('grigio');
  });

  it('fascia, meteo, giorno della settimana, stagione', () => {
    expect(daProsa(['solo di sera'], stato()).stato).toBe('bloccato');
    expect(daProsa(['solo di sera'], stato({ fasciaGioco: 'sera' })).stato).toBe('disponibile');
    expect(daProsa(['solo di sera'], stato({ fasciaGioco: null })).stato).toBe('ignoto');
    expect(daProsa(['solo nei giorni di pioggia'], stato({ meteoOggi: 'Sereno' })).stato).toBe('bloccato');
    expect(daProsa(['solo nei giorni di pioggia'], stato({ meteoOggi: 'Pioggia' })).stato).toBe('disponibile');
    expect(daProsa(['solo la domenica'], stato({ giornoSettimana: 'mercoledi' })).stato).toBe('bloccato');
    expect(daProsa(['solo la domenica'], stato({ giornoSettimana: 'domenica' })).stato).toBe('disponibile');
    expect(daProsa(['solo in inverno'], stato({ dataGioco: '04-20' })).stato).toBe('bloccato');
    expect(daProsa(['solo in inverno'], stato({ dataGioco: '12-25' })).stato).toBe('disponibile');
  });

  it('attività svolte, eventi, contatori, grado cliente dalla spesa, punti negozio, letture, articoli', () => {
    const biliardo = conTesto([{ tipo: 'attivita', attivita: 'biliardo', volte: 2 }]);
    expect(valutaRequisiti(biliardo, stato({ attivitaSvolte: new Map([['biliardo', 1]]) })).stato).toBe('bloccato');
    expect(valutaRequisiti(biliardo, stato({ attivitaSvolte: new Map([['biliardo', 2]]) })).stato).toBe('disponibile');
    const mansarda = conTesto([{ tipo: 'evento', evento: 'mansarda-pulita' }]);
    expect(valutaRequisiti(mansarda, stato()).stato).toBe('bloccato');
    expect(valutaRequisiti(mansarda, stato({ eventi: new Set(['mansarda-pulita']) })).stato).toBe('disponibile');
    expect(valutaRequisiti(conTesto([{ tipo: 'contatore', cosa: 'film-completati', almeno: 1 }]), stato({ contatori: new Map([['film-completati', 1]]) })).stato).toBe('disponibile');
    const oscuro = conTesto([{ tipo: 'rango-cliente', negozio: 'tanaka-affari-loschi', rango: 'oscuro' }]);
    expect(valutaRequisiti(oscuro, stato({ spesaPerNegozio: new Map([['tanaka-affari-loschi', 49999]]) })).stato).toBe('bloccato');
    const esito = valutaRequisiti(oscuro, stato({ spesaPerNegozio: new Map([['tanaka-affari-loschi', 50000]]) }));
    expect(esito.stato).toBe('disponibile');
    expect(esito.requisiti[0].dettaglio).toMatch(/grado Oscuro/);
    expect(valutaRequisiti(conTesto([{ tipo: 'punti-negozio', negozio: 'vestiti-usati-kichijoji', punti: 150 }]), stato({ puntiNegozio: new Map([['vestiti-usati-kichijoji', 150]]) })).stato).toBe('disponibile');
    expect(valutaRequisiti(conTesto([{ tipo: 'lettura', categoria: 'libro', chiave: 'x' }]), stato({ letture: new Set(['libro/x']) })).stato).toBe('disponibile');
    expect(valutaRequisiti(conTesto([{ tipo: 'articolo', articolo: 'a' }]), stato({ articoliOttenuti: new Set(['a']) })).stato).toBe('disponibile');
  });

  it('gruppi E / O / NON annidati a qualsiasi profondità', () => {
    const c: RequisitoSpillo = { tipo: 'gruppo', modo: 'almeno-una', condizioni: [
      { tipo: 'non', condizione: { tipo: 'evento', evento: 'mansarda-pulita' } },
      { tipo: 'gruppo', modo: 'tutte', condizioni: [{ tipo: 'evento', evento: 'mansarda-pulita' }, { tipo: 'non', condizione: { tipo: 'gruppo', modo: 'almeno-una', condizioni: [{ tipo: 'piove' }] } }] },
    ] };
    expect(valutaRequisiti(conTesto([c]), stato()).stato).toBe('disponibile');
    expect(valutaRequisiti(conTesto([c]), stato({ eventi: new Set(['mansarda-pulita']), meteoOggi: 'Sereno' })).stato).toBe('disponibile');
    expect(valutaRequisiti(conTesto([c]), stato({ eventi: new Set(['mansarda-pulita']), meteoOggi: 'Pioggia' })).stato).toBe('bloccato');
  });

  it('per uno spillo solo la presenza nasconde: un prerequisito rosso lascia il pin, un arco non raggiunto lo toglie', () => {
    expect(valutaRequisitiSpillo(conTesto([{ tipo: 'dote', dote: 'coraggio', rango: 5 }]), stato()).stato).toBe('ignoto');
    expect(valutaRequisitiSpillo(conTesto([{ tipo: 'arco', dungeon: 'niijima' }]), stato({ arcoCorrente: 'kamoshida' })).stato).toBe('bloccato');
    expect(valutaRequisitiSpillo(conTesto([{ tipo: 'gruppo', modo: 'tutte', condizioni: [{ tipo: 'fascia', fascia: 'sera' }, { tipo: 'dote', dote: 'coraggio', rango: 3 }] }]), stato({ fasciaGioco: 'giorno' })).stato).toBe('bloccato');
  });

  it('senza condizioni è disponibile', () => {
    expect(valutaRequisiti([], stato())).toEqual({ stato: 'disponibile', requisiti: [] });
  });
});
