// ============================================================
// Il contratto di visibilità dei pin, provato nei due sensi
// ============================================================
//
// La regola, come l'ha data l'utente: un pin si nasconde **solo** quando quella cosa, nel momento
// in cui consulti la guida, nel mondo non c'è. Un quartiere che apre il 18 giugno l'11 aprile non
// esiste, e i suoi negozi nemmeno: mostrarli manderebbe il giocatore in un posto che non c'è.
//
// L'altro senso conta quanto il primo, ed è quello che si era sbagliato. Gli elementi fissi —
// porte, forzieri, stanze sicure, passaggi, scale — ci sono sempre, e restano visibili anche
// quando sono chiusi o non ancora raggiunti: una porta chiusa si vede, altrimenti la guida ti
// direbbe dov'è solo dopo che l'hai aperta. Per un pezzo 1130 pin su 1339 sono stati marcati
// «da configurare» per via della loro bandiera nativa, e comparivano grigi: questo test esiste
// perché non ricapiti.
// ============================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import { closeDb, initDb, getDb, prepared } from '../../db/dbService.js';
import { runMigrations } from '../../db/migrationRunner.js';
import { caricaSeed } from '../seed/caricaSeed.js';
import { sincronizzaMappe } from './sincronizzaMappe.js';
import { nascondeIlPin } from '../../../shared/condizioniSpillo.js';
import { valutaRequisitiSpillo } from '../disponibilitaService.js';
import { dettaglioMappa } from './mappeService.js';

const DIR_SEED = path.join('data', 'seed');

describe('visibilità condizionale dei pin', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    sincronizzaMappe(db);
  });
  afterAll(() => closeDb());

  function condizioniDi(mappa: string): Array<{ nome: string; condizioni: unknown[] }> {
    return (getDb().prepare('SELECT nome, condizioni_json FROM spillo WHERE mappa_chiave = ?')
      .all(mappa) as Array<{ nome: string; condizioni_json: string | null }>)
      .map((r) => ({ nome: r.nome, condizioni: r.condizioni_json ? JSON.parse(r.condizioni_json) : [] }));
  }

  it('i luoghi di un quartiere che si sblocca più avanti portano la condizione del quartiere', () => {
    const bloccati = condizioniDi('citta-shinjuku');
    expect(bloccati.length).toBeGreaterThan(0);
    // Il quartiere c'e' sempre; accanto puo' esserci la fascia oraria del locale, che e'
    // anch'essa presenza — un bar solo di sera, di giorno, non c'e'.
    for (const s of bloccati) {
      expect(s.condizioni).toContainEqual({ tipo: 'quartiere', quartiere: 'shinjuku' });
    }
  });

  it('un quartiere disponibile dall’inizio non nasconde niente', () => {
    for (const s of condizioniDi('citta-yongen-jaya')) expect(s.condizioni).toEqual([]);
  });

  it('gli elementi fissi delle planimetrie native non hanno condizioni di visibilità', () => {
    // sono porte, forzieri, stanze sicure, passaggi: ci sono sempre, anche quando sono chiusi
    const fissi = getDb().prepare(`SELECT COUNT(*) AS n FROM spillo
      WHERE mappa_chiave LIKE 'nativo-%' AND condizioni_json IS NOT NULL AND condizioni_json NOT IN ('', '[]')`)
      .get() as { n: number };
    expect(fissi.n).toBe(0);
    const quanti = getDb().prepare("SELECT COUNT(*) AS n FROM spillo WHERE mappa_chiave LIKE 'nativo-%'")
      .get() as { n: number };
    expect(quanti.n).toBeGreaterThan(1000);
  });

  it('l’unica condizione in uso è la presenza, non il prerequisito', () => {
    const tipi = new Set<string>();
    for (const r of getDb().prepare("SELECT condizioni_json FROM spillo WHERE condizioni_json IS NOT NULL AND condizioni_json NOT IN ('', '[]')")
      .all() as Array<{ condizioni_json: string }>) {
      for (const c of JSON.parse(r.condizioni_json) as Array<{ tipo: string }>) tipi.add(c.tipo);
    }
    // La regola generale, non l'elenco del momento: ogni condizione in uso deve essere di
    // presenza. `da-configurare` qui vorrebbe dire che una bandiera nativa e' tornata a
    // nascondere un pin; `dote` o `confidente` che un prerequisito e' tornato a farlo sparire.
    expect(tipi.size).toBeGreaterThan(0);
    for (const t of tipi) expect(nascondeIlPin(t)).toBe(true);
  });

  // ---- Il contratto visto dal runtime, non dai dati -----------------------------------------
  //
  // I dati oggi sono corretti, ma il difetto vero sarebbe un runtime che permette di violarli:
  // basterebbe che qualcuno aggiungesse un prerequisito a una porta perché sparisse dalla mappa.
  // Questi due controlli guardano la valutazione, non il seed.

  // Lo stato di una partita all'11 aprile, di giorno, senza doti alzate: il minimo che serve
  // perché la valutazione dia un verdetto invece di un «non so».
  const statoVuoto = {
    dataGioco: '04-11', fasciaGioco: 'giorno', giornoSettimana: 'lunedi',
    sbloccoQuartieri: new Map(), articoliOttenuti: new Set<string>(), letture: new Set<string>(),
  } as unknown as Parameters<typeof valutaRequisitiSpillo>[1];

  it('un prerequisito non soddisfatto non toglie il pin: la porta resta', () => {
    // «Perizia rango 5» con una partita che non ce l'ha: la porta c'è comunque, e la guida deve
    // dire dov'è prima che tu possa aprirla, non dopo
    // «serve il grimaldello», con una partita che non ce l'ha: la porta c'è comunque, e la guida
    // deve dire dov'è prima che tu possa aprirla, non dopo
    const esito = valutaRequisitiSpillo(
      [{ tipo: 'articolo', articolo: 'grimaldello', testo: 'Grimaldello' }],
      statoVuoto);
    expect(esito.stato).not.toBe('bloccato');
  });

  it('una condizione di presenza non soddisfatta invece lo toglie', () => {
    const esito = valutaRequisitiSpillo(
      [{ tipo: 'fascia', fascia: 'sera', testo: 'solo di sera' }],
      statoVuoto);
    expect(esito.stato).toBe('bloccato');
  });

  it('nessun pin strutturale del seed può essere nascosto da un prerequisito', () => {
    // porte, forzieri, scale, passaggi: se uno di questi avesse una condizione, quella condizione
    // dovrebbe comunque essere di presenza — e oggi non ne hanno nessuna
    const strutturali = getDb().prepare(`SELECT tipo, condizioni_json FROM spillo
      WHERE tipo IN ('porta','forziere','forziere-raro','scala','passaggio','uscita','sicura')
        AND condizioni_json IS NOT NULL AND condizioni_json NOT IN ('', '[]')`)
      .all() as Array<{ tipo: string; condizioni_json: string }>;
    for (const r of strutturali) {
      for (const c of JSON.parse(r.condizioni_json) as Array<{ tipo: string }>) {
        expect(nascondeIlPin(c.tipo)).toBe(true);
      }
    }
  });

  it('una presenza chiusa in un gruppo continua a nascondere', () => {
    // il caso che sfuggiva: `gruppo` non è di per sé una presenza, e guardando solo il tipo
    // esterno una fascia oraria dentro un gruppo smetteva di nascondere — il negozio di sera
    // ricompariva di giorno
    const esito = valutaRequisitiSpillo(
      [{ tipo: 'gruppo', modo: 'tutte', condizioni: [{ tipo: 'fascia', fascia: 'sera' }], testo: 'solo di sera' }],
      statoVuoto);
    expect(esito.stato).toBe('bloccato');
  });

  it('un gruppo che mescola presenza e prerequisito non nasconde', () => {
    // non è né l'una né l'altra cosa: nel dubbio si mostra, perché mostrare qualcosa di troppo si
    // corregge guardando mentre nascondere qualcosa che c'è no
    const esito = valutaRequisitiSpillo(
      [{ tipo: 'gruppo', modo: 'tutte', testo: 'misto',
         condizioni: [{ tipo: 'fascia', fascia: 'sera' }, { tipo: 'articolo', articolo: 'grimaldello' }] }],
      statoVuoto);
    expect(esito.stato).not.toBe('bloccato');
  });

  it('gli elementi fissi dell’atlante non si nascondono nemmeno se qualcuno ci attacca una presenza', () => {
    // l'invariante del runtime: vale per provenienza, non per tipo di segnalino, e passa sopra a
    // qualunque strada di scrittura — API, editor, seed o modifica diretta al database
    const nativo = getDb().prepare("SELECT id, mappa_chiave FROM spillo WHERE nativo_json IS NOT NULL AND tipo = 'porta' LIMIT 1")
      .get() as { id: number; mappa_chiave: string } | undefined;
    expect(nativo).toBeTruthy();
    getDb().prepare('UPDATE spillo SET condizioni_json = ? WHERE id = ?')
      .run(JSON.stringify([{ tipo: 'fascia', fascia: 'sera' }]), nativo!.id);
    prepared("INSERT INTO partita (nome, attiva, livello_protagonista, data_gioco, created_at, updated_at) VALUES ('Prova', 1, 1, '04-11', 'x', 'x')").run();
    const partita = getDb().prepare("SELECT id FROM partita WHERE nome = 'Prova'").get() as { id: number };
    const mappa = dettaglioMappa(nativo!.mappa_chiave, partita.id);
    const spillo = mappa.spilli.find((x) => x.id === nativo!.id);
    expect(spillo).toBeTruthy();
    expect(spillo!.disponibilita?.stato).not.toBe('bloccato');
    getDb().prepare('UPDATE spillo SET condizioni_json = NULL WHERE id = ?').run(nativo!.id);
    getDb().prepare('DELETE FROM partita WHERE id = ?').run(partita.id);
  });

  it('un forziere è collezionabile: lo nasconde il filtro dei raccolti, non una condizione', () => {
    const forzieri = getDb().prepare("SELECT collezionabile, condizioni_json FROM spillo WHERE tipo = 'forziere'")
      .all() as Array<{ collezionabile: number; condizioni_json: string | null }>;
    expect(forzieri.length).toBeGreaterThan(0);
    for (const f of forzieri) {
      // niente condizione: un forziere non sparisce per una bandiera o per un prerequisito
      expect(f.condizioni_json === null || f.condizioni_json === '[]' || f.condizioni_json === '').toBe(true);
      // ed è collezionabile, che è l'unico modo legittimo di toglierlo dalla vista: lo decide il
      // giocatore spuntandolo, e il filtro dei raccolti è volontario
      expect(f.collezionabile).toBe(1);
    }
  });
});
