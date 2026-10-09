// ============================================================
// Il contratto di visibilità dei pin, provato nei due sensi
// ============================================================
//
// La regola: un pin si vede solo se tutte le sue condizioni valgono (2026-09-13: «un oggetto deve essere visibile solo se
// tutte le condizioni danno esito true»; 2026-10-09: le condizioni sono assolute, anche sugli elementi fissi). Un quartiere
// che apre il 18 giugno l'11 aprile non esiste, e i suoi negozi nemmeno: mostrarli manderebbe il giocatore dove non c'è.
//
// Il server distingue: una condizione di presenza che non vale dà «bloccato», un prerequisito che manca «ignoto». Il
// visore nasconde tutti e due, e dal 2026-10-09 anche sugli elementi fissi nativi (porte, forzieri, passaggi…): le
// condizioni di visibilità sono assolute (decisione dell'utente). Senza condizioni scritte un elemento fisso c'è sempre:
// per un pezzo 1130 pin su 1339 sono stati marcati «da configurare» per via della loro bandiera nativa, e comparivano
// grigi; questo test esiste anche perché non ricapiti.
// ============================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { closeDb, getDb, prepared } from '../../db/dbService.js';
import { sincronizzaMappe } from './sincronizzaMappe.js';
import { applicaPresenzaAiLuoghi } from './presenzaEntita.js';
import { nascondeIlPin } from '../../../shared/condizioniSpillo.js';
import { eStrutturale } from '../../../shared/spilli.js';
import { valutaRequisitiSpillo } from '../disponibilitaService.js';
import { dettaglioMappa } from './mappeService.js';
import { dbDiProva } from '../../../test/dbDiProva.js';


describe('visibilità condizionale dei pin', () => {
  beforeAll(() => {
    const db = dbDiProva();
    // il pacchetto e' la fotografia della produzione: la formazione dalla guida (spilli dai marcatori,
    // presenza dei luoghi sui pin) non avviene piu' da sola, qui si chiede esplicitamente
    sincronizzaMappe(db);
    applicaPresenzaAiLuoghi(db);
  });
  afterAll(() => closeDb());

  /** Nome e condizioni decodificate (lista vuota se assenti) di ogni spillo della mappa indicata. */
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

  it('un quartiere disponibile dall’inizio non aggiunge la propria condizione', () => {
    // Yongen-Jaya c'è dal primo giorno: nessuno dei suoi pin deve portare `quartiere`. Quel che
    // può portare è la fascia oraria del singolo locale — la clinica di Takemi, di sera, è
    // chiusa: quella è presenza del locale, non del quartiere. Il test chiedeva «nessuna
    // condizione», e passava soltanto finché la presenza dei luoghi non arrivava fino ai pin.
    // Adesso ci arriva, ed è la cosa giusta: qui si pretende che sia solo presenza e mai il
    // quartiere, che è più stretto di prima, non più largo.
    for (const s of condizioniDi('citta-yongen-jaya')) {
      expect(s.condizioni, s.nome).not.toContainEqual({ tipo: 'quartiere', quartiere: 'yongen-jaya' });
      for (const c of s.condizioni) {
        expect(nascondeIlPin((c as { tipo: string }).tipo), `${s.nome}: ${JSON.stringify(c)}`).toBe(true);
      }
    }
  });

  it('gli elementi fissi delle planimetrie native non hanno condizioni di visibilità', () => {
    // Porte, forzieri, stanze sicure, passaggi, scale: ci sono sempre, anche quando sono chiusi.
    // Il conteggio era su *tutti* i pin nativi, e reggeva solo finché nessuna presenza li
    // raggiungeva; ora un negozio disegnato sulla planimetria eredita l'orario del negozio —
    // è lo stesso negozio dell'illustrazione del quartiere, e se chiude devono sparire tutti e
    // due. Quello che non deve mai avere condizioni è ciò che è strutturale, e la lista non è
    // scritta a mano qui: è `TIPI_STRUTTURALI`, la stessa che protegge il codice.
    // Il pacchetto è la fotografia dell'istanza: la regola vale per ciò che viene dalla guida (origine «seed»).
    // Le finestre che l'utente scrive a mano sui suoi spilli (un nemico solo in certi giorni, un punto di
    // infiltrazione che cambia) sono scelte sue, e il runtime le tratta come i test qui sotto descrivono.
    const conCondizioni = getDb().prepare(`SELECT tipo, nome, condizioni_json FROM spillo
      WHERE mappa_chiave LIKE 'nativo-%' AND origine = 'seed' AND condizioni_json IS NOT NULL AND condizioni_json NOT IN ('', '[]')`)
      .all() as Array<{ tipo: string; nome: string; condizioni_json: string }>;
    expect(conCondizioni.filter((s) => eStrutturale(s.tipo))
      .map((s) => `${s.tipo} «${s.nome}» ${s.condizioni_json}`)).toEqual([]);
    // e quel che le ha, le ha di sola presenza
    for (const s of conCondizioni) {
      for (const c of JSON.parse(s.condizioni_json) as Array<{ tipo: string }>) {
        expect(nascondeIlPin(c.tipo), `${s.tipo} «${s.nome}»`).toBe(true);
      }
    }
    const quanti = getDb().prepare("SELECT COUNT(*) AS n FROM spillo WHERE mappa_chiave LIKE 'nativo-%'")
      .get() as { n: number };
    expect(quanti.n).toBeGreaterThan(1000);
  });

  it('l’unica condizione in uso sugli spilli della guida è la presenza, non il prerequisito', () => {
    const tipi = new Set<string>();
    // come sopra: la regola è quella dei dati della guida; le condizioni scritte dall'utente sui suoi spilli sono sue
    for (const r of getDb().prepare("SELECT condizioni_json FROM spillo WHERE origine = 'seed' AND condizioni_json IS NOT NULL AND condizioni_json NOT IN ('', '[]')")
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
  // Il server distingue due esiti: «bloccato» quando una condizione di presenza non vale (la cosa adesso non c'è),
  // «ignoto» quando manca solo un prerequisito. Il visore li nasconde tutti e due (`nascostoPerCondizioni`).
  // Questi due controlli guardano la distinzione del server, non il seed.

  // Lo stato di una partita all'11 aprile, di giorno, senza doti alzate: il minimo che serve
  // perché la valutazione dia un verdetto invece di un «non so».
  const statoVuoto = {
    dataGioco: '04-11', fasciaGioco: 'giorno', giornoSettimana: 'lunedi',
    sbloccoQuartieri: new Map(), articoliOttenuti: new Set<string>(), letture: new Set<string>(),
  } as unknown as Parameters<typeof valutaRequisitiSpillo>[1];

  it('un prerequisito non soddisfatto dà «ignoto», non «bloccato»: il server distingue, il visore nasconde tutti e due', () => {
    // «serve il grimaldello», con una partita che non ce l'ha: non è una condizione di presenza, quindi lo stato non è
    // «bloccato»; il visore però toglie anche l'«ignoto» (2026-09-13), e dal 2026-10-09 anche su una porta nativa
    const esito = valutaRequisitiSpillo(
      [{ tipo: 'articolo', articolo: 'grimaldello', testo: 'Grimaldello' }],
      statoVuoto);
    expect(esito.stato).not.toBe('bloccato');
    expect(esito.stato).not.toBe('disponibile');
  });

  it('una condizione di presenza non soddisfatta dà invece «bloccato» lato server', () => {
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

  it('in un gruppo misto conta la parte di presenza: «solo di sera e serve il grimaldello» di giorno sparisce', () => {
    // il negozio apre la sera **e** vuole il grimaldello: di giorno non c'è, grimaldello o no.
    // Trattare il gruppo come «misto, quindi non nascondo» lo lasciava visibile di giorno.
    const esito = valutaRequisitiSpillo(
      [{ tipo: 'gruppo', modo: 'tutte', testo: 'misto',
         condizioni: [{ tipo: 'fascia', fascia: 'sera' }, { tipo: 'articolo', articolo: 'grimaldello' }] }],
      statoVuoto);
    expect(esito.stato).toBe('bloccato');
  });

  it('in un «almeno una» con un ramo che tace sulla presenza non si conclude che manchi', () => {
    // «di sera **oppure** col grimaldello»: col grimaldello ci si arriva anche di giorno, quindi
    // dalla sola presenza non si può dire che la cosa non ci sia
    const esito = valutaRequisitiSpillo(
      [{ tipo: 'gruppo', modo: 'almeno-una', testo: 'sera o grimaldello',
         condizioni: [{ tipo: 'fascia', fascia: 'sera' }, { tipo: 'articolo', articolo: 'grimaldello' }] }],
      statoVuoto);
    expect(esito.stato).not.toBe('bloccato');
  });

  it('un negozio disegnato sulla planimetria nativa non è strutturale: di sera chiude e sparisce', () => {
    // gli elementi fissi non ricevono la presenza del luogo (`presenzaEntita`): un negozio sulla planimetria
    // resta un negozio, la riceve, e quando è chiuso il pin non deve esserci
    expect(eStrutturale('negozio')).toBe(false);
    expect(eStrutturale('porta')).toBe(true);
    expect(eStrutturale('passaggio')).toBe(true);
    expect(eStrutturale('attivita')).toBe(false);
  });

  it('anche gli elementi fissi dell’atlante si nascondono quando una condizione scritta su di loro non vale (2026-10-09)', () => {
    // le condizioni di visibilità sono assolute (decisione dell'utente): prima una porta nativa restava in vista marcata
    // «non ancora» (`restaInVista`); ora la condizione scritta direttamente nel database la nasconde come ogni altro pin
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
    // di giorno la condizione «sera» non vale: il pin è bloccato, e senza `restaInVista` il visore lo toglie
    expect(spillo!.disponibilita).toMatchObject({ stato: 'bloccato' });
    expect(spillo!.disponibilita).not.toHaveProperty('restaInVista');
    getDb().prepare('UPDATE spillo SET condizioni_json = NULL WHERE id = ?').run(nativo!.id);
    getDb().prepare('DELETE FROM partita WHERE id = ?').run(partita.id);
  });

  it('un negozio sulla planimetria nativa eredita la presenza del suo luogo, come quello editoriale', () => {
    // e' lo stesso negozio visto da due mappe: se il quartiere non e' ancora aperto devono
    // sparire tutti e due, non uno solo. Prima la presenza si attaccava ai soli pin editoriali
    // e il gemello nativo restava visibile.
    applicaPresenzaAiLuoghi(getDb());
    const nativi = getDb().prepare(`SELECT s.condizioni_json FROM spillo s
      WHERE s.mappa_chiave LIKE 'nativo-%' AND s.tipo = 'negozio'
        AND s.riferimento_chiave LIKE 'akihabara/%'`).all() as Array<{ condizioni_json: string | null }>;
    expect(nativi.length).toBeGreaterThan(0);
    for (const n of nativi) {
      expect(n.condizioni_json).toBeTruthy();
      expect(JSON.parse(n.condizioni_json!)).toContainEqual({ tipo: 'quartiere', quartiere: 'akihabara' });
    }
    // e gli elementi fissi della stessa planimetria restano senza condizioni
    const fissi = getDb().prepare(`SELECT COUNT(*) AS n FROM spillo
      WHERE mappa_chiave LIKE 'nativo-%' AND tipo IN ('porta','forziere','passaggio','scala')
        AND condizioni_json IS NOT NULL AND condizioni_json NOT IN ('', '[]')`).get() as { n: number };
    expect(fissi.n).toBe(0);
  });

  it('il pin di un negozio vale quanto il negozio adesso, non quanto la copia fatta al reseed', () => {
    // Rilievo di Codex. Uno spillo porta le condizioni copiate quando l'atlante è stato
    // sincronizzato; il negozio le sue, che vivono nel catalogo. Fidarsi della sola copia vuol
    // dire che ogni modifica al negozio lascia dietro un pin che dice una cosa non più vera, e
    // nessuno se ne accorge. Qui il negozio viene chiuso **dopo** la sincronizzazione, senza
    // toccare lo spillo: se il pin non se ne accorgesse resterebbe aperto su una porta chiusa.
    const db = getDb();
    const partita = db.prepare("INSERT INTO partita (nome, data_gioco, fascia_gioco, created_at, updated_at) VALUES ('Deriva', '04-20', 'giorno', '', '') RETURNING id").get() as { id: number };
    // I pin dei negozi puntano a un **luogo**, non al negozio: il negozio è agganciato al luogo.
    // È l'errore che avevo fatto io scrivendo la funzione, e la prova serve anche a questo.
    // Serve poi un pin che al 20 aprile **non** sia già bloccato dalle sue condizioni: se
    // partisse bloccato, il test non distinguerebbe la copia dalla verità.
    const candidati = db.prepare(`SELECT s.id, s.mappa_chiave, n.chiave AS riferimento_chiave FROM spillo s
      JOIN negozio n ON n.sede_chiave = s.riferimento_chiave
      WHERE s.riferimento_tipo = 'luogo' AND n.nascosto = 0`).all() as Array<{ id: number; mappa_chiave: string; riferimento_chiave: string }>;
    expect(candidati.length, 'nessun pin agganciato a un negozio: la prova non proverebbe niente').toBeGreaterThan(0);
    /** Stato di disponibilità dello spillo `p` come lo restituisce il dettaglio della sua mappa per la partita di prova. */
    const statoDi = (p: { id: number; mappa_chiave: string }) => dettaglioMappa(p.mappa_chiave, partita.id).spilli.find((s) => s.id === p.id)?.disponibilita?.stato;
    const pin = candidati.find((p) => statoDi(p) !== 'bloccato');
    expect(pin, 'serve un pin di negozio aperto al 20 aprile').toBeTruthy();

    /** Stato attuale del pin di negozio scelto, riletto a ogni chiamata. */
    const statoDelPin = () => statoDi(pin!);
    expect(statoDelPin()).not.toBe('bloccato');

    // ora si chiude il negozio nel catalogo (gli orari: solo di sera, e la partita è di giorno), e **basta**: lo spillo non viene toccato
    const prima = db.prepare('SELECT orari_json FROM negozio WHERE chiave = ?').get(pin!.riferimento_chiave) as { orari_json: string | null };
    db.prepare('UPDATE negozio SET orari_json = ? WHERE chiave = ?')
      .run(JSON.stringify({ giorni: [], fasce: ['sera'], chiusoConPioggia: false, nota: null }), pin!.riferimento_chiave);
    try {
      expect(statoDelPin()).toBe('bloccato');
    } finally {
      db.prepare('UPDATE negozio SET orari_json = ? WHERE chiave = ?').run(prima.orari_json, pin!.riferimento_chiave);
      db.prepare('DELETE FROM partita WHERE id = ?').run(partita.id);
    }
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
