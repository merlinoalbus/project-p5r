// ============================================================
// registro — gli oggetti della guida che si correggono dalla loro pagina e si rimettono com'erano (L11 · B11)
// ============================================================
//
// Un elenco dichiarativo: per ogni tipo di oggetto, dove vive il dato e quali campi si possono correggere.
// Due modalità (scheda B11, §3.2):
//   - «riga»: il dato sta in una riga di tabella (quartiere, trofeo, Dote, trasformazione): la correzione è un UPDATE sul posto e il valore
//     della guida è la fotografia `seed_json` presa alla prima correzione (vedi `righe.ts`);
//   - «blocco»: il dato sta in un blocco JSON di `dati_guida` (personaggi, sfide, completamento, oggetti, Jose): il blocco non si riscrive
//     mai; la correzione è una riga di `correzione_dati_guida` con l'indirizzo del valore (`shared/percorsoGuida.ts`) e il valore della guida
//     è il blocco stesso.
//
// NON si correggono mai (decisione del PM e regola di identità): le chiavi che altre tabelle usano (`chiave` di personaggi, sfide e boss,
// `attrezzo` delle ricette, `nome` dei premi del Covo, `catalogoChiave`), gli ordinamenti, `giocabile` e `confidente` dei personaggi, la
// `persona` dei personaggi (l'ha in carico il lotto L8) e le strutture annidate (membri dei gruppi, tabelle, scambi).
// ============================================================

import type { TipoCampoCorrezione, TipoModificabile } from '../../../shared/types.js';

/** Limiti dei valori accettati (le guide hanno voci di elenco lunghe quasi 750 caratteri: i nemici delle Battaglie Sfida). */
export const LIMITE_TESTO = 600;
export const LIMITE_TESTO_LUNGO = 6000;
export const LIMITE_VOCE_ELENCO = 2000;
export const LIMITE_VOCI = 60;
export const LIMITE_NUMERO = 1000000;

export interface CampoDef {
  /** L'indirizzo del campo dentro l'oggetto (proprietà separate da «/»). */
  p: string;
  e: string;
  t: TipoCampoCorrezione;
  /** Il vuoto si salva come `null`. */
  nullable?: boolean;
  gruppo?: string;
  /** Lunghezza massima di un testo (default: 600 per `testo`, 6000 per `testolungo`) o valore massimo di un numero (default 1000000). */
  max?: number;
  opzioni?: Array<{ chiave: string; nome: string }>;
}

/** Un oggetto che sta in un blocco JSON di `dati_guida`. */
export interface DefBlocco {
  modalita: 'blocco';
  blocco: string;
  etichetta: string;
  /** Le proprietà dalla radice del blocco al contenitore: l'array in cui si sceglie l'elemento (con `sel`) o l'oggetto stesso (senza). */
  radice: string[];
  /** Il campo-selettore con cui l'elemento si indirizza nelle correzioni (valore della guida). Senza: l'oggetto è una sezione. */
  sel?: string;
  /** Il campo che l'URL contiene per scegliere l'elemento (di norma il selettore; per gli abiti è la chiave del catalogo). */
  chiaveCampo?: string;
  /** Per le sezioni: la sola chiave ammessa nell'URL. */
  chiaveFissa?: string;
  /** Il campo che dà il nome all'elemento nella finestra (default `nome`); per le sezioni vale `etichetta`. */
  campoTitolo?: string;
  /** Titolo calcolato dall'elemento della guida (ha la precedenza su `campoTitolo`). */
  titolo?: (elemento: Record<string, unknown>) => string;
  campi: CampoDef[];
  /** Più sezioni sotto lo stesso tipo (Completamento: NG+, differenze, tempo): chiave nell'URL → radice e campi propri. */
  varianti?: Record<string, { etichetta: string; radice: string[]; campi: CampoDef[] }>;
}

const T = (p: string, e: string, o: Partial<CampoDef> = {}): CampoDef => ({ p, e, t: 'testo', ...o });
const L = (p: string, e: string, o: Partial<CampoDef> = {}): CampoDef => ({ p, e, t: 'testolungo', ...o });
const E = (p: string, e: string, o: Partial<CampoDef> = {}): CampoDef => ({ p, e, t: 'elenco', ...o });
const N = (p: string, e: string, o: Partial<CampoDef> = {}): CampoDef => ({ p, e, t: 'numero', ...o });
const B = (p: string, e: string, o: Partial<CampoDef> = {}): CampoDef => ({ p, e, t: 'booleano', ...o });
const FONTE = L('fonte', 'Fonte');
const VERIFICATO = B('verificato', 'Verificato');

/** Gli oggetti a blocco (tutti i tipi tranne quartiere, trofeo, dote e trasformazione). */
export const DEFINIZIONI_BLOCCO: Partial<Record<TipoModificabile, DefBlocco>> = {
  // ---- Personaggi ----
  personaggio: {
    modalita: 'blocco', blocco: 'personaggi', etichetta: 'Personaggio', radice: ['personaggi'], sel: 'chiave',
    campi: [
      T('nome', 'Nome'), T('nomeCodice', 'Nome in codice', { nullable: true }), T('arcano', 'Arcano', { nullable: true }),
      L('ruolo', 'Ruolo'), L('presentazione', 'Presentazione', { nullable: true }),
      T('armi/mischia', 'Arma da mischia', { nullable: true, gruppo: 'Armi' }), T('armi/distanza', 'Arma a distanza', { nullable: true, gruppo: 'Armi' }),
      L('battaglia', 'In battaglia', { nullable: true }), T('scuola', 'Scuola', { nullable: true }), T('eta', 'Età', { nullable: true }),
      T('doppiatori/jp', 'Doppiatore giapponese', { nullable: true, gruppo: 'Doppiatori' }), T('doppiatori/en', 'Doppiatore inglese', { nullable: true, gruppo: 'Doppiatori' }),
      FONTE, VERIFICATO,
    ],
  },
  'gruppo-personaggi': {
    modalita: 'blocco', blocco: 'personaggi', etichetta: 'Gruppo di personaggi', radice: ['gruppi'], sel: 'nome',
    campi: [T('nome', 'Nome del gruppo')],
  },

  // ---- Sfide ----
  'sfide-battaglie': {
    modalita: 'blocco', blocco: 'sfide', etichetta: 'Battaglie Sfida', radice: ['battaglieSfida'], chiaveFissa: 'battaglie',
    campi: [L('introduzione', 'Introduzione'), L('sblocco', 'Come si sblocca'), L('regoleGenerali', 'Regole generali'), FONTE],
  },
  'battaglia-sfida': {
    modalita: 'blocco', blocco: 'sfide', etichetta: 'Battaglia Sfida', radice: ['battaglieSfida', 'elenco'], sel: 'chiave',
    campi: [
      T('nome', 'Nome'), T('nomeIt', 'Nome italiano', { nullable: true }), L('regole', 'Regole'), E('nemici', 'Nemici'),
      L('punteggi', 'Punteggi', { nullable: true }), E('ricompense', 'Ricompense'), L('strategia', 'Strategia'),
      T('livelloConsigliato', 'Livello consigliato', { nullable: true }), FONTE, VERIFICATO,
    ],
  },
  'boss-segreto': {
    modalita: 'blocco', blocco: 'sfide', etichetta: 'Boss segreto', radice: ['bossSegreti'], sel: 'chiave',
    campi: [
      T('nome', 'Nome'), L('dove', 'Dove'), L('quando', 'Quando'), E('requisiti', 'Requisiti'), T('livelloConsigliato', 'Livello consigliato', { nullable: true }),
      E('mosse', 'Mosse'), E('resistenze', 'Resistenze'), E('debolezze', 'Debolezze'), E('strategia', 'Strategia'), E('ricompense', 'Ricompense'),
      N('statistiche/hp', 'HP', { gruppo: 'Statistiche', nullable: true }), N('statistiche/sp', 'SP', { gruppo: 'Statistiche', nullable: true }),
      T('statistiche/pe', 'PE', { gruppo: 'Statistiche', nullable: true }), T('statistiche/denaro', 'Denaro', { gruppo: 'Statistiche', nullable: true }),
      T('statistiche/bottino', 'Bottino', { gruppo: 'Statistiche', nullable: true }),
      L('nota', 'Nota', { nullable: true }), FONTE, VERIFICATO,
    ],
  },
  'sfide-magnate': {
    modalita: 'blocco', blocco: 'sfide', etichetta: 'Magnate', radice: ['magnate'], chiaveFissa: 'magnate',
    campi: [
      L('dove', 'Dove'), L('quando', 'Quando'), L('sfidanti', 'Sfidanti'), E('difficolta', 'Difficoltà'),
      L('regole/struttura', 'Struttura', { gruppo: 'Regole' }), L('regole/valoreCarte', 'Valore delle carte', { gruppo: 'Regole' }),
      L('regole/inizioManche', 'Inizio della manche', { gruppo: 'Regole' }), L('regole/ruoliEScambi', 'Ruoli e scambi', { gruppo: 'Regole' }),
      L('regole/passare', 'Passare', { gruppo: 'Regole' }), L('regole/bancarotta', 'Bancarotta', { gruppo: 'Regole' }),
      L('regole/rivoluzione', 'Rivoluzione', { gruppo: 'Regole' }), L('regole/regolaOtto', 'Regola dell’otto', { gruppo: 'Regole' }),
      L('regole/joker', 'Joker', { gruppo: 'Regole' }),
      L('ricompensaFinale', 'Ricompensa finale'), L('effettiRelazioni', 'Effetti sulle relazioni'), L('note', 'Note'), FONTE,
    ],
  },
  'magnate-sfida': {
    modalita: 'blocco', blocco: 'sfide', etichetta: 'Sfida di Magnate', radice: ['magnate', 'sfide'], sel: 'nome',
    campi: [T('nome', 'Nome'), L('condizione', 'Condizione'), L('ricompensa', 'Ricompensa')],
  },
  tratto: {
    modalita: 'blocco', blocco: 'sfide', etichetta: 'Tratto', radice: ['tratti', 'elenco'], sel: 'nome',
    campi: [T('nome', 'Nome'), T('nomeEn', 'Nome inglese', { nullable: true }), L('effetto', 'Effetto'), T('categoria', 'Categoria', { nullable: true }), T('personaggio', 'Personaggio', { nullable: true })],
  },
  'sfide-tratti': {
    modalita: 'blocco', blocco: 'sfide', etichetta: 'Tratti', radice: ['tratti'], chiaveFissa: 'tratti',
    campi: [L('introduzione', 'Introduzione'), FONTE, VERIFICATO],
  },
  'sfide-quiz-tv': {
    modalita: 'blocco', blocco: 'sfide', etichetta: 'Quiz TV', radice: ['quizTv'], chiaveFissa: 'quiz-tv',
    campi: [L('introduzione', 'Introduzione'), N('numeroDomandeTotali', 'Numero di domande', { nullable: true }), FONTE, VERIFICATO],
  },

  // ---- Completamento e Covo ----
  finale: {
    modalita: 'blocco', blocco: 'completamento', etichetta: 'Finale', radice: ['finali'], sel: 'chiave',
    campi: [T('nome', 'Nome'), E('condizioni', 'Condizioni'), E('date', 'Date'), L('descrizione', 'Descrizione'), FONTE],
  },
  covo: {
    modalita: 'blocco', blocco: 'completamento', etichetta: 'Covo dei Ladri', radice: ['covo'], chiaveFissa: 'covo',
    campi: [L('introduzione', 'Introduzione'), L('medaglie', 'Medaglie'), FONTE],
  },
  'covo-sfida': {
    modalita: 'blocco', blocco: 'completamento', etichetta: 'Sfida del Covo', radice: ['covo', 'sfide'], sel: 'nome',
    campi: [T('nome', 'Nome'), L('requisito', 'Requisito'), N('medaglie', 'Medaglie', { nullable: true })],
  },
  'covo-premio': {
    modalita: 'blocco', blocco: 'completamento', etichetta: 'Premio del Covo', radice: ['covo', 'premi'], sel: 'nome',
    campi: [N('costo', 'Costo', { nullable: true }), L('sblocco', 'Come si sblocca', { nullable: true }), L('effetto', 'Effetto', { nullable: true })],
  },
  dlc: {
    modalita: 'blocco', blocco: 'completamento', etichetta: 'Contenuto scaricabile', radice: ['dlc'], sel: 'nome',
    campi: [T('nome', 'Nome'), L('contenuto', 'Contenuto'), L('note', 'Note', { nullable: true }), FONTE],
  },
  meteo: {
    modalita: 'blocco', blocco: 'completamento', etichetta: 'Meteo', radice: ['meteo'], sel: 'condizione', campoTitolo: 'condizione',
    campi: [T('condizione', 'Condizione'), E('effetti', 'Effetti'), FONTE],
  },
  'completamento-sezione': {
    modalita: 'blocco', blocco: 'completamento', etichetta: 'Sezione del completamento', radice: [], campi: [],
    varianti: {
      ng: { etichetta: 'Nuova Partita+', radice: ['nuovaPartitaPlus'], campi: [E('trasferito', 'Cosa si trasferisce'), E('nonTrasferito', 'Cosa non si trasferisce'), L('note', 'Note'), FONTE] },
      differenze: { etichetta: 'Differenze con Persona 5 base', radice: [], campi: [E('differenzeRoyal', 'Differenze di Royal')] },
      tempo: { etichetta: 'Tempo', radice: ['tempo'], campi: [E('fasce', 'Fasce'), E('regole', 'Regole'), FONTE] },
    },
  },

  // ---- Oggetti: i testi della guida ----
  fabbricazione: {
    modalita: 'blocco', blocco: 'oggetti-guida', etichetta: 'Fabbricazione', radice: ['fabbricazione'], chiaveFissa: 'fabbricazione',
    campi: [L('introduzione', 'Introduzione'), L('sblocco', 'Come si sblocca', { nullable: true }), E('regole', 'Regole'), FONTE],
  },
  ricetta: {
    // Ondata 5, lotto F (decisione 21, migrazione 279): l'effetto della ricetta è quello del prodotto e si corregge sull'oggetto del catalogo
    modalita: 'blocco', blocco: 'oggetti-guida', etichetta: 'Ricetta', radice: ['fabbricazione', 'ricette'], sel: 'attrezzo', campoTitolo: 'attrezzo',
    campi: [L('sblocco', 'Come si sblocca', { nullable: true }), FONTE, VERIFICATO],
  },
  armi: {
    modalita: 'blocco', blocco: 'oggetti-guida', etichetta: 'Personalizzazione delle armi', radice: ['personalizzazioneArmi'], chiaveFissa: 'armi',
    campi: [L('introduzione', 'Introduzione'), L('requisiti', 'Requisiti'), L('costi', 'Costi', { nullable: true }), E('note', 'Note'), FONTE],
  },
  'arma-effetto': {
    modalita: 'blocco', blocco: 'oggetti-guida', etichetta: 'Effetto di personalizzazione', radice: ['personalizzazioneArmi', 'effetti'], sel: 'nome',
    campi: [T('nome', 'Nome'), L('effetto', 'Effetto'), T('costo', 'Costo', { nullable: true })],
  },
  'arma-progressione': {
    modalita: 'blocco', blocco: 'oggetti-guida', etichetta: 'Rango di Iwai', radice: ['personalizzazioneArmi', 'progressioneConfidente'], sel: 'rango',
    titolo: (el) => `Rango ${String(el.rango)}: ${String(el.abilita ?? '')}`,
    campi: [T('abilita', 'Abilità'), L('effetto', 'Effetto')],
  },
  abiti: {
    modalita: 'blocco', blocco: 'oggetti-guida', etichetta: 'Abiti', radice: ['abiti'], chiaveFissa: 'abiti',
    campi: [
      L('introduzione', 'Introduzione', { nullable: true }),
      L('lavanderia/dove', 'Dove', { gruppo: 'Lavanderia' }), L('lavanderia/costo', 'Costo', { gruppo: 'Lavanderia' }),
      E('lavanderia/regole', 'Regole', { gruppo: 'Lavanderia' }), L('lavanderia/fonte', 'Fonte', { gruppo: 'Lavanderia' }),
    ],
  },
  abito: {
    modalita: 'blocco', blocco: 'oggetti-guida', etichetta: 'Abito', radice: ['abiti', 'elenco'], sel: 'nome', chiaveCampo: 'catalogoChiave',
    campi: [L('dove', 'Dove si ottiene')],
  },

  // ---- Aiuto in battaglia (R11-15/4): le sezioni di testo della guida; le tabelle (stati alterati, ranghi, coppie degli Speciali, Demoni del Tesoro) e gli URL delle fonti non si correggono ----
  'battaglia-sezione': {
    modalita: 'blocco', blocco: 'battaglia', etichetta: 'Sezione dell’Aiuto in battaglia', radice: [], campi: [],
    varianti: {
      sistema: {
        etichetta: 'Sistema di battaglia', radice: ['sistema'],
        campi: [
          L('avvioScontro', 'Avvio dello scontro'), E('comandi', 'Comandi'),
          L('esitiColpo/debole', 'Debole', { gruppo: 'Esiti del colpo' }), L('esitiColpo/critico', 'Critico', { gruppo: 'Esiti del colpo' }),
          L('esitiColpo/tecnico', 'Tecnico', { gruppo: 'Esiti del colpo' }), L('esitiColpo/block', 'Block', { gruppo: 'Esiti del colpo' }),
          L('esitiColpo/resiste', 'Resiste', { gruppo: 'Esiti del colpo' }),
          L('unoMore', '1 More'), L('notaFineBattaglia', 'Nota di fine battaglia'),
        ],
      },
      assalto: { etichetta: 'Rapina, Assalto e Parla', radice: ['assaltoEHoldUp'], campi: [L('rapina', 'Rapina'), L('assalto', 'Assalto'), L('holdUp', 'Parla')] },
      staffetta: {
        etichetta: 'Staffetta', radice: ['staffetta'],
        campi: [L('cosaE', 'Che cos’è'), L('disponibilita', 'Disponibilità'), L('effetto', 'Effetto'), L('livelli', 'Livelli'), L('indicatoriVisivi', 'Indicatori'), L('moltiplicatori', 'Moltiplicatori'), L('effettoSpeciale', 'Catena completa')],
      },
      speciali: { etichetta: 'Speciali', radice: ['speciali'], campi: [L('meccanica', 'Meccanica'), L('attivazione', 'Attivazione'), L('proprietaDanno', 'Danno')] },
      negoziazione: {
        etichetta: 'Negoziazione: quando e come', radice: ['negoziazione'],
        campi: [L('quandoSiPuoNegoziare', 'Quando si può negoziare'), L('comeVerificarePersonalita', 'Come verificare la personalità'), E('regole', 'Regole'), L('incertezze', 'Incertezze')],
      },
      sciagura: {
        etichetta: 'Ombre sciagura', radice: ['ombreSciagura'],
        campi: [
          T('nomeOriginale', 'Nome originale'), L('cosaSono', 'Che cosa sono'), L('comeRiconoscerle', 'Come riconoscerle'), E('caratteristiche', 'Caratteristiche'),
          L('comportamentoInBattaglia/turnoProprio', 'Nel loro turno', { gruppo: 'In battaglia' }), L('comportamentoInBattaglia/quandoAttaccate', 'Quando attaccate', { gruppo: 'In battaglia' }),
          L('comportamentoInBattaglia/comeNeutralizzarle', 'Come neutralizzarle', { gruppo: 'In battaglia' }),
          E('effettiStati/immobilizzanti', 'Stati che le immobilizzano', { gruppo: 'Stati' }), L('effettiStati/soggiogamento', 'Soggiogamento', { gruppo: 'Stati' }), L('effettiStati/furia', 'Furia', { gruppo: 'Stati' }),
          L('esplosioneAllaSconfitta/descrizione', 'Descrizione', { gruppo: 'Esplosione alla sconfitta' }), L('esplosioneAllaSconfitta/potenza', 'Potenza', { gruppo: 'Esplosione alla sconfitta' }),
          L('esplosioneAllaSconfitta/eccezioni', 'Eccezioni', { gruppo: 'Esplosione alla sconfitta' }),
          L('ricompense', 'Ricompense'), L('doveCompaiono', 'Dove compaiono'), L('incertezze', 'Incertezze'),
        ],
      },
      mietitore: {
        etichetta: 'Mietitore', radice: ['mietitore'],
        campi: [
          T('categoria', 'Nome'), L('dove', 'Dove e quando'), L('comeSiManifesta', 'Segnali'), T('livelloConsigliato', 'Livello consigliato'), E('abilita', 'Abilità'), E('immunita', 'Immunità'),
          E('debolezze', 'Debolezze', { nullable: true }), E('strategia', 'Strategia'), L('ricompense', 'Ricompense'),
        ],
      },
      tesoro: {
        etichetta: 'Demoni del Tesoro', radice: ['demoniTesoro'],
        campi: [
          T('categoria', 'Nome'), L('cosaSono', 'Che cosa sono'), L('comeCompaiono', 'Come compaiono'), L('primaComparsa', 'Prima comparsa'), L('comportamento', 'Comportamento'),
          L('resistenzeGenerali', 'Resistenze'), E('tecnicheConsigliate', 'Tecniche consigliate'),
        ],
      },
    },
  },

  // ---- Jose ----
  jose: {
    modalita: 'blocco', blocco: 'jose', etichetta: 'Jose', radice: [], chiaveFissa: 'jose',
    campi: [
      L('introduzione', 'Introduzione'),
      L('fiori/descrizione', 'Descrizione', { gruppo: 'Fiori' }), L('fiori/oggettoSpeciale', 'Oggetto speciale', { gruppo: 'Fiori' }),
      L('timbri/descrizione', 'Descrizione', { gruppo: 'Timbri' }), T('timbri/totale', 'Totale', { gruppo: 'Timbri' }),
      L('timbri/ricompensaCompletamento', 'Ricompensa del completamento', { gruppo: 'Timbri' }), E('timbri/trofei', 'Trofei', { gruppo: 'Timbri' }),
      T('bossSegreto/nome', 'Nome', { gruppo: 'Boss segreto' }), L('bossSegreto/condizione', 'Condizione', { gruppo: 'Boss segreto' }),
      E('bossSegreto/abilita', 'Abilità', { gruppo: 'Boss segreto' }), E('bossSegreto/ricompensa', 'Ricompensa', { gruppo: 'Boss segreto' }),
      T('bossSegreto/statistiche/livello', 'Livello', { gruppo: 'Boss segreto: statistiche' }),
      N('bossSegreto/statistiche/hp', 'HP', { gruppo: 'Boss segreto: statistiche' }), N('bossSegreto/statistiche/sp', 'SP', { gruppo: 'Boss segreto: statistiche' }),
      T('bossSegreto/statistiche/pe', 'PE', { gruppo: 'Boss segreto: statistiche' }), T('bossSegreto/statistiche/yen', 'Yen', { gruppo: 'Boss segreto: statistiche' }),
      T('bossSegreto/statistiche/debolezze', 'Debolezze', { gruppo: 'Boss segreto: statistiche' }), T('bossSegreto/statistiche/resistenze', 'Resistenze', { gruppo: 'Boss segreto: statistiche' }),
      T('bossSegreto/statistiche/bottinoGarantito', 'Bottino garantito', { gruppo: 'Boss segreto: statistiche' }),
    ],
  },

  // ---- R11-17/1: i due blocchi di `dati_guida` che prima si cambiavano solo nel pacchetto ----
  // Le note comuni alle categorie di attività: oggi una sola, la frase dei videogiochi (chiave `videogioco`). Una categoria nuova nel blocco si aggiunge qui.
  'note-categorie-attivita': {
    modalita: 'blocco', blocco: 'note-categorie-attivita', etichetta: 'Note delle categorie di attività', radice: [], chiaveFissa: 'note-categorie-attivita',
    campi: [L('videogioco', 'Videogiochi')],
  },
  // I nomi alternativi con cui la ricerca globale trova una voce (per tipo e chiave) e le abbreviazioni che espande. Tipo e chiave sono l'identità e non si correggono;
  // la ricerca legge al più 8 nomi per voce, di al più 80 caratteri.
  'sinonimo-ricerca': {
    modalita: 'blocco', blocco: 'sinonimi-ricerca', etichetta: 'Sinonimi della ricerca', radice: ['sinonimi'], sel: 'chiave',
    titolo: (el) => `${String(el.tipo ?? '')}: ${String(el.chiave ?? '')}`,
    campi: [E('nomi', 'Nomi alternativi')],
  },
  'abbreviazione-ricerca': {
    modalita: 'blocco', blocco: 'sinonimi-ricerca', etichetta: 'Abbreviazione della ricerca', radice: ['abbreviazioni'], sel: 'abbreviazione', campoTitolo: 'abbreviazione',
    campi: [T('abbreviazione', 'Abbreviazione'), T('esteso', 'Forma estesa')],
  },
};
