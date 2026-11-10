// ============================================================
// Migrazione 368 — i Tesori da vendere della guida entrano nel catalogo degli oggetti (L13-03, decisione Q17 = A)
// ============================================================
//
// La pagina «Tesori» della guida (https://www.allgamestaff.it/persona-5-royal/tesori/) elenca 140 Tesori, oggetti che servono solo a essere
// venduti, con prezzo di vendita e reperibilità. Il catalogo ne aveva 14: i 13 premi delle Battaglie sfida (`fonte_chiave` `premio/sfida/...`) e
// il Diamante (`fonte_chiave` `contenuto/shido-14-...`), tutti con `chiave` `altro/<nome>`. Gli altri 126 mancavano anche dal testo libero dei luoghi e delle voci (censimento del 2026-11, 0 occorrenze).
//
// COSA: i 126 mancanti diventano righe di `catalogo_oggetto`, con la stessa forma dei premi delle Sfide:
//   - `chiave` `altro/<nome in minuscolo, senza accenti né apostrofi, con i trattini>` (se la chiave è occupata da un'altra riga, `-2`, `-3`…:
//     come fa il resto del catalogo; un nome uguale a quello di un'altra riga NON abbina le due identità, resta solo segnalato nell'audit);
//   - `categoria` `altro`, `fonte_tipo` `guida`, `fonte_chiave` `tesori/<nome in trattini>` (l'identità con cui la migrazione riconosce la riga);
//   - `nome` come lo scrive la guida (nomi di oggetti: nessuna traduzione); `effetto` vuoto (la guida non dice che un Tesoro faccia altro che
//     vendersi); `descrizione` «tesoro, rivendibile per <prezzo> ¥ · <reperibilità>», la stessa forma delle descrizioni dei premi delle Sfide con
//     l'aggiunta del dove, che è l'unico campo del catalogo che la scheda dell'oggetto mostra (`statistiche` resta vuoto: nessun campo nuovo).
// Ogni prezzo e ogni luogo vengono dalla riga della guida: nessuna stima, nessun prezzo dedotto. Le 140 righe della guida hanno tutte un prezzo.
//
// IL DIAMANTE (la 127ª riga): è già nel catalogo, senza prezzo né luogo (la sua `descrizione` è vuota). Solo se la riga è ancora quella del
// seed, mai toccata dall'utente (`origine` `seed`, `seed_json` nullo) e con la descrizione vuota, riceve la stessa descrizione degli altri
// Tesori: altrimenti non si scrive e l'audit lo dice. Gli altri 13 premi delle Sfide hanno già il prezzo e non si toccano (l'audit li confronta
// con la guida: il prezzo nella loro descrizione deve essere quello della pagina).
//
// CONSERVATIVA E IDEMPOTENTE: una riga si inserisce solo se non c'è già una riga con la sua identità (`fonte_tipo` `guida` e `fonte_chiave`
// `tesori/…`); nessuna riga esistente cambia, salvo la descrizione vuota del Diamante. Su un file di gioco senza `catalogo_oggetto` o senza
// `dati_guida` la migrazione passa e dice «niente da fare» nel log. Non tocca `partite.db`, né il Diario, né i Palazzi.
// Audit in `dati_guida.audit-368-tesori-da-vendere`: fonte, conteggi (140 = 14 già presenti + 126 inseriti), chiavi, omonimi e discordanze.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';

const AUDIT = 'audit-368-tesori-da-vendere';
const FONTE_URL = 'https://www.allgamestaff.it/persona-5-royal/tesori/';
const errore = (motivo: string): never => { throw new Error(`368: ${motivo}; nessuna modifica applicata.`); };

const palazzo = (nome: string): string => `Palazzi: Palazzo di ${nome}`;
const KAMOSHIDA = palazzo('Kamoshida'); const MADARAME = palazzo('Madarame'); const KANESHIRO = palazzo('Kaneshiro'); const FUTABA = palazzo('Futaba');
const OKUMURA = palazzo('Okumura'); const NIIJIMA = palazzo('Niijima'); const SHIDO = palazzo('Shido'); const MARUKI = palazzo('Maruki');
const OTTO_DEDALI = 'Memento: Dedalo di Qimranut, Dedalo di Aiyatsbus, Dedalo di Chemdah, Dedalo di Kaitul, Dedalo di Akzeriyyuth, Dedalo di Adyeshach, Dedalo di Sheriruth, Dedalo di Da\'at';
const SEI_DEDALI = 'Memento: Dedalo di Chemdah, Dedalo di Kaitul, Dedalo di Akzeriyyuth, Dedalo di Adyeshach, Dedalo di Sheriruth, Dedalo di Da\'at';
const PROFONDITA = 'Memento: Profondità dei Memento';
const IWELETH = 'Memento: Profondità dei Memento (Dedalo di Iweleth)';

/** I 126 Tesori mancanti: posizione nella tabella della guida (1-140), nome, prezzo di vendita in yen e reperibilità, come li scrive la pagina. */
const TESORI: ReadonlyArray<readonly [number, string, number, string]> = [
  [1, 'Bicchiere scheggiato', 10, KAMOSHIDA],
  [2, 'Rame sottile', 20, OTTO_DEDALI],
  [3, 'Manette arrugginite', 20, KAMOSHIDA],
  [4, 'Collare con lucchetto', 30, KAMOSHIDA],
  [5, 'Palla al piede', 40, KAMOSHIDA],
  [6, 'Rame forato', 50, OTTO_DEDALI],
  [7, 'Elmetto bucato', 90, KAMOSHIDA],
  [8, 'Spada spuntata', 100, KAMOSHIDA],
  [9, 'Rame scanalato', 100, OTTO_DEDALI],
  [10, 'Portacandele spoglio', 130, KAMOSHIDA],
  [11, 'Strana lanterna', 180, KAMOSHIDA],
  [12, 'Argento sottile', 200, SEI_DEDALI],
  [13, 'Argenteria', 200, KAMOSHIDA],
  [14, 'Brutta scultura', 200, MADARAME],
  [15, 'Ritratto scadente', 210, MADARAME],
  [16, 'Tazzina di porcellana', 220, KAMOSHIDA],
  [17, 'Cornice di plastica', 220, MADARAME],
  [18, 'Tazza senza firma', 230, MADARAME],
  [19, 'Bollitore fuligginoso', 240, MADARAME],
  [20, 'Vaso crepato', 250, MADARAME],
  [21, 'Fascia larga', 260, MADARAME],
  [22, 'Portafogli sgualcito', 320, KANESHIRO],
  [23, 'Corona d\'alloro', 320, KAMOSHIDA],
  [24, 'Tromba benedetta', 340, KAMOSHIDA],
  [25, 'Timbro usurato', 340, KANESHIRO],
  [26, 'Lucchetto inapribile', 350, KANESHIRO],
  [27, 'Bastone dorato', 360, KAMOSHIDA],
  [28, 'Penna senza inchiostro', 360, KANESHIRO],
  [29, 'Calcolatrice da ufficio', 370, KANESHIRO],
  [30, 'Contabanconote', 380, KANESHIRO],
  [31, 'Manopola di cassaforte', 390, KANESHIRO],
  [32, 'Argento forato', 400, SEI_DEDALI],
  [33, 'Moneta antica', 620, KANESHIRO],
  [34, 'Pezzo di pilastro', 640, FUTABA],
  [35, 'Staffa piegata', 650, FUTABA],
  [36, 'Pezzo di sarcofago', 660, FUTABA],
  [37, 'Murale di Sekhmet', 670, FUTABA],
  [38, 'Murale di Ra', 680, FUTABA],
  [39, 'Washi raffinato', 690, MADARAME],
  [40, 'Argento scanalato', 700, SEI_DEDALI],
  [41, 'Mazzo incompleto', 700, NIIJIMA],
  [42, 'Vecchio caleidoscopio', 750, SHIDO],
  [43, 'Palla da discoteca', 750, SHIDO],
  [44, 'Maschera da ballo', 750, SHIDO],
  [45, 'Pennello setole animali', 780, MADARAME],
  [46, 'Moneta rara', 820, KANESHIRO],
  [47, 'Antenna radar', 820, OKUMURA],
  [48, 'Maschera hannya', 860, MADARAME],
  [49, 'Quadro su pergamena', 940, MADARAME],
  [50, 'Onice', 1000, `${KAMOSHIDA}; Memento: Dedalo di Qimranut, Dedalo di Aiyatsbus`],
  [51, 'Maschera della mummia', 1100, FUTABA],
  [52, 'Pendente dello scarabeo', 1200, FUTABA],
  [53, 'Gemelli grigi', 1200, NIIJIMA],
  [54, 'Banconota preziosa', 1300, KANESHIRO],
  [55, 'Statua di Bastet', 1300, FUTABA],
  [56, 'Ruota contorta', 1300, OKUMURA],
  [57, 'Agitadadi automatico', 1300, NIIJIMA],
  [58, 'Vaso canopo', 1400, FUTABA],
  [59, 'Pergamena appesa', 1400, MADARAME],
  [60, 'Pannello solare rotto', 1400, OKUMURA],
  [61, 'Sigaro fumato', 1400, NIIJIMA],
  [62, 'Bussola di bronzo', 1400, SHIDO],
  [63, 'Orologio da taschino', 1400, SHIDO],
  [64, 'Certificato azionario', 1400, KANESHIRO],
  [65, 'Moneta d\'oro', 1500, KANESHIRO],
  [66, 'Quadro a lavatura', 1500, MADARAME],
  [67, 'PCB perforato', 1500, OKUMURA],
  [68, 'Cappello scolorito', 1500, NIIJIMA],
  [69, 'Ukiyo-e', 1600, MADARAME],
  [70, 'Ureo d\'oro', 1700, FUTABA],
  [71, 'Ramo dell\'astronave', 1700, OKUMURA],
  [72, 'Mummia gioiello', 1800, FUTABA],
  [73, 'Perla', 2000, 'Palazzi: Palazzo di Kamoshida, Palazzo di Madarame; Memento: Dedalo di Qimranut, Dedalo di Aiyatsbus'],
  [74, 'Poster sbagliato', 2100, MARUKI],
  [75, 'Cavo USB aggrovigliato', 2200, MARUKI],
  [76, 'Diodo arcobaleno', 2200, OKUMURA],
  [77, 'Nastro allentato', 2300, MARUKI],
  [78, 'Spada torcia', 2300, OKUMURA],
  [79, 'Lampada rotta', 2400, MARUKI],
  [80, 'Anello del croupier', 2400, NIIJIMA],
  [81, 'Drone UFO', 2500, OKUMURA],
  [82, 'Dado d\'avorio', 2500, NIIJIMA],
  [83, 'Astrolabio del saggio', 2600, OKUMURA],
  [84, 'Monocolo d\'argento', 2600, NIIJIMA],
  [85, 'Bastone damasceno', 2700, NIIJIMA],
  [86, 'Lente distorta', 2800, MARUKI],
  [87, 'Forcina tartaruga', 2800, SHIDO],
  [88, 'Misuratore rotto', 2900, MARUKI],
  [89, 'Metallo raro', 2900, OKUMURA],
  [90, 'Scacchiera di marmo', 2900, SHIDO],
  [91, 'Ametista', 3000, 'Palazzi: Palazzo di Madarame, Palazzo di Kaneshiro; Memento: Dedalo di Chemdah'],
  [92, 'Opale', 3000, `${OKUMURA}; Memento: Dedalo di Akzeriyyuth`],
  [93, 'Pietra lunare', 3000, OKUMURA],
  [94, 'Orecchini d\'oro', 3000, NIIJIMA],
  [95, 'Trasformatore', 3000, MARUKI],
  [96, 'Orologio lussuoso', 3100, NIIJIMA],
  [97, 'Puntatore laser', 3100, MARUKI],
  [98, 'Registratore vocale', 3200, MARUKI],
  [99, 'Collana di perle', 3200, SHIDO],
  [100, 'Topazio', 3500, `${NIIJIMA}; Memento: Dedalo di Adyeshach`],
  [101, 'Manganello rotto', 3600, IWELETH],
  [102, 'Termostato rotto', 3500, MARUKI],
  [103, 'Manette rotte', 3500, IWELETH],
  [104, 'Mini sensore acustico', 3600, MARUKI],
  [105, 'Proiettore vecchio', 3700, MARUKI],
  [106, 'Berretto strappato', 3700, IWELETH],
  [107, 'Corno silente', 3800, IWELETH],
  [108, 'Acquamarina', 4000, `${KANESHIRO}; Memento: Dedalo di Chemdah`],
  [109, 'Granato', 4000, `${SHIDO}; Memento: Dedalo di Sheriruth`],
  [110, 'Smeraldo', 4500, `${OKUMURA}; Memento: Dedalo di Akzeriyyuth`],
  [111, 'Filo spinato acuminato', 4500, PROFONDITA],
  [112, 'Megafono Hi-Fi', 4600, PROFONDITA],
  [113, 'Distintivo guardia', 4700, PROFONDITA],
  [114, 'Uniforme da carcerato', 4800, PROFONDITA],
  [115, 'Palla di ferro lucente', 4900, PROFONDITA],
  [116, 'Blocco d\'oro piccolo', 5000, 'Forzieri: Dedalo di Qimranut, Dedalo di Aiyatsbus, Dedalo di Chemdah'],
  [117, 'Turchese', 5000, `${FUTABA}; Memento: Dedalo di Kaitul`],
  [118, 'Zaffiro', 5000, `${NIIJIMA}; Memento: Dedalo di Adyeshach`],
  [119, 'Rubino', 6000, `${FUTABA}; Memento: Dedalo di Kaitul`],
  [120, 'Bracciale d\'argento', 6300, PROFONDITA],
  [121, 'Distintivo dorato', 6400, PROFONDITA],
  [122, 'Emblema d\'oro', 6500, PROFONDITA],
  [123, 'Blocco d\'oro grande', 10000, 'Forzieri: Dedalo di Kaitul, Dedalo di Akzeriyyuth'],
  [124, 'Giada', 12000, `${SHIDO}; Memento: Dedalo di Sheriruth, Dedalo di Da'at`],
  [125, 'Platino', 13000, PROFONDITA],
  [128, 'Blocco d\'oro enorme', 15000, 'Forzieri: Dedalo di Adyeshach, Dedalo di Sheriruth, Dedalo di Da\'at'],
];

/** I 14 Tesori che il catalogo aveva già: chiave, posizione nella guida, prezzo della guida. Il Diamante è l'unico senza prezzo nella descrizione. */
const GIA_PRESENTI: ReadonlyArray<{ chiave: string; posizione: number; prezzo: number; luogo?: string }> = [
  { chiave: 'altro/blocco-di-rame', posizione: 126, prezzo: 13000 },
  { chiave: 'altro/diamante', posizione: 127, prezzo: 14000, luogo: `${MARUKI}; Memento: Dedalo di Sheriruth, Dedalo di Da'at` },
  { chiave: 'altro/blocco-dargento', posizione: 129, prezzo: 30000 },
  { chiave: 'altro/blocco-doro', posizione: 130, prezzo: 42000 },
  { chiave: 'altro/catena-doro', posizione: 131, prezzo: 60000 },
  { chiave: 'altro/mano-doro', posizione: 132, prezzo: 84000 },
  { chiave: 'altro/blocco-di-platino', posizione: 133, prezzo: 100000 },
  { chiave: 'altro/blocco-di-diamante', posizione: 134, prezzo: 185000 },
  { chiave: 'altro/cuore-doro', posizione: 135, prezzo: 200000 },
  { chiave: 'altro/stella-doro', posizione: 136, prezzo: 200000 },
  { chiave: 'altro/luna-dargento', posizione: 137, prezzo: 200000 },
  { chiave: 'altro/nebbia-dargento', posizione: 138, prezzo: 200000 },
  { chiave: 'altro/luna-doro', posizione: 139, prezzo: 1000000 },
  { chiave: 'altro/nebbia-doro', posizione: 140, prezzo: 1000000 },
];
const DIAMANTE = 'altro/diamante';

const norm = (x: string): string => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’`´]/g, '\'').replace(/\s+/g, ' ').trim();
/** Lo stesso slug con cui il catalogo scrive le chiavi dei suoi oggetti (`slug121`): una migrazione non cambia con il codice, quindi è ripetuto qui. */
const slug = (nome: string): string => norm(nome).replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/** Il prezzo con il punto delle migliaia, come lo scrive la guida («13.000»). */
const yen = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const descrizioneTesoro = (prezzo: number, luogo: string): string => `tesoro, rivendibile per ${yen(prezzo)} ¥ · ${luogo}`;

export const migration368: Migration = {
  id: 368,
  name: 'tesori_da_vendere_nel_catalogo',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'catalogo_oggetto') || !esisteTabella(db, 'dati_guida')) {
      logger.warn({ migrazione: 368 }, 'catalogo degli oggetti o dati della guida assenti: niente da fare');
      return;
    }
    // le costanti della migrazione devono dire 140 = 14 + 126, con nomi e posizioni tutti distinti
    const slugNuovi = TESORI.map(([, nome]) => slug(nome));
    if (TESORI.length !== 126 || GIA_PRESENTI.length !== 14 || new Set(slugNuovi).size !== 126) errore('l\'elenco dei Tesori non è 126 nuovi più 14 già presenti, tutti distinti');
    const posizioni = new Set([...TESORI.map((t) => t[0]), ...GIA_PRESENTI.map((g) => g.posizione)]);
    if (posizioni.size !== 140 || [...posizioni].some((p) => p < 1 || p > 140)) errore('le posizioni della guida non sono le 140 righe della tabella');
    if (TESORI.some(([, , prezzo]) => !Number.isInteger(prezzo) || prezzo <= 0)) errore('un prezzo non è un intero positivo');

    const adesso = new Date().toISOString();
    const chiaviOccupate = new Set(db.prepare('SELECT chiave FROM main.catalogo_oggetto').pluck().all() as string[]);
    const perIdentita = db.prepare("SELECT chiave FROM main.catalogo_oggetto WHERE fonte_tipo = 'guida' AND fonte_chiave = ?").pluck();
    const omonimiDi = db.prepare('SELECT chiave, categoria, fonte_tipo, origine FROM main.catalogo_oggetto WHERE lower(nome) = lower(?)');
    const inserisci = db.prepare(`INSERT INTO main.catalogo_oggetto
      (chiave, categoria, sottocategoria, nome, nomi_altri_json, nome_originale, effetto, descrizione, statistiche_json, fonte_tipo, fonte_chiave, origine, seed_json, nascosto, updated_at)
      VALUES (?, 'altro', NULL, ?, '[]', NULL, '', ?, NULL, 'guida', ?, 'seed', NULL, 0, ?)`);

    // le righe che la migrazione non deve toccare: tutte tranne i Tesori che inserisce e la descrizione del Diamante
    const impronteAltre = (): string => JSON.stringify(db.prepare(`SELECT chiave, categoria, sottocategoria, nome, nomi_altri_json, nome_originale, effetto, descrizione, statistiche_json,
      fonte_tipo, fonte_chiave, origine, seed_json, nascosto, updated_at FROM main.catalogo_oggetto
      WHERE NOT (fonte_tipo = 'guida' AND fonte_chiave LIKE 'tesori/%') AND chiave <> ? ORDER BY chiave`).all(DIAMANTE));
    const altrePrima = impronteAltre();
    const righePrima = db.prepare('SELECT COUNT(*) FROM main.catalogo_oggetto').pluck().get() as number;

    // ---- i 126 mancanti ----
    const inserite: string[] = []; const giaPrima: string[] = []; const chiaveCambiata: Array<{ nome: string; chiave: string }> = []; const omonimi: Array<{ nome: string; con: unknown[] }> = [];
    for (const [posizione, nome, prezzo, luogo] of TESORI) {
      const identita = `tesori/${slug(nome)}`;
      const esistente = perIdentita.get(identita) as string | undefined;
      if (esistente) { giaPrima.push(esistente); continue; }
      const base = `altro/${slug(nome)}`; let chiave = base;
      for (let n = 2; chiaviOccupate.has(chiave); n++) chiave = `${base}-${n}`;
      if (chiave !== base) chiaveCambiata.push({ nome, chiave });
      const altri = omonimiDi.all(nome) as unknown[];
      if (altri.length > 0) omonimi.push({ nome, con: altri });
      if (inserisci.run(chiave, nome, descrizioneTesoro(prezzo, luogo), identita, adesso).changes !== 1) errore(`il Tesoro «${nome}» (riga ${posizione}) non si inserisce`);
      chiaviOccupate.add(chiave); inserite.push(chiave);
    }

    // ---- i 14 già presenti: letti come attesi, mai riscritti (salvo la descrizione vuota del Diamante) ----
    const presenti: Array<{ chiave: string; posizione: number; esito: string }> = [];
    for (const g of GIA_PRESENTI) {
      const r = db.prepare('SELECT categoria, fonte_tipo, origine, seed_json, nascosto, descrizione FROM main.catalogo_oggetto WHERE chiave = ?').get(g.chiave) as
        { categoria: string; fonte_tipo: string; origine: string; seed_json: string | null; nascosto: number; descrizione: string } | undefined;
      if (!r) { presenti.push({ chiave: g.chiave, posizione: g.posizione, esito: 'assente dal catalogo: non aggiunto (la guida lo elenca, ma la riga non c\'è; nessuna identità creata da qui)' }); continue; }
      if (g.chiave === DIAMANTE) {
        if (r.descrizione !== '') { presenti.push({ chiave: g.chiave, posizione: g.posizione, esito: `descrizione già scritta, non toccata: «${r.descrizione}»` }); continue; }
        if (r.categoria !== 'altro' || r.fonte_tipo !== 'guida' || r.origine !== 'seed' || r.seed_json !== null) { presenti.push({ chiave: g.chiave, posizione: g.posizione, esito: 'riga non più quella del seed (corretta o di altra origine): non toccata' }); continue; }
        const scritto = db.prepare("UPDATE main.catalogo_oggetto SET descrizione = ?, updated_at = ? WHERE chiave = ? AND descrizione = '' AND origine = 'seed' AND seed_json IS NULL")
          .run(descrizioneTesoro(g.prezzo, g.luogo ?? ''), adesso, g.chiave).changes;
        if (scritto !== 1) errore('la descrizione del Diamante non si scrive');
        presenti.push({ chiave: g.chiave, posizione: g.posizione, esito: `descrizione vuota: scritti prezzo ${yen(g.prezzo)} ¥ e reperibilità della guida` });
        continue;
      }
      const numeri = /(\d{1,3}(?:\.\d{3})*)\s*¥/.exec(r.descrizione);
      const nelCatalogo = numeri ? Number((numeri[1] ?? '').replace(/\./g, '')) : null;
      presenti.push({ chiave: g.chiave, posizione: g.posizione, esito: nelCatalogo === g.prezzo ? `prezzo ${yen(g.prezzo)} ¥ nella descrizione, uguale alla guida: non toccata`
        : `DISCORDANZA: la guida dice ${yen(g.prezzo)} ¥, la descrizione dice «${r.descrizione}»: non toccata` });
    }

    // ---- le prove: cambiano solo le 126 righe nuove e la descrizione del Diamante ----
    if (db.prepare('SELECT COUNT(*) FROM main.catalogo_oggetto').pluck().get() !== righePrima + inserite.length) errore('il numero delle righe del catalogo non torna');
    if (impronteAltre() !== altrePrima) errore('una riga del catalogo diversa dai Tesori è cambiata');

    db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json').run(AUDIT, JSON.stringify({
      migrazione: 368, voce: 'L13-03', decisione: 'Q17 = A', fonte: FONTE_URL,
      conteggi: { righeDellaGuida: 140, giaPresentiNelCatalogo: GIA_PRESENTI.length, daInserire: TESORI.length, inseriti: inserite.length, giaInseritiPrima: giaPrima.length },
      inseriti: inserite, giaInseritiPrima: giaPrima, chiaveCambiataPerOccupazione: chiaveCambiata, omonimiNelCatalogo: omonimi, giaPresenti: presenti,
    }));
    logger.info({ migrazione: 368, inseriti: inserite.length, giaInseritiPrima: giaPrima.length, omonimi: omonimi.length, presenti: presenti.length }, 'Tesori da vendere nel catalogo');
  },
};
