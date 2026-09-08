// ============================================================
// effettiOggetto — che cosa fa un oggetto, detto in modo che l'app lo possa leggere
// ============================================================
//
// **Le famiglie qui sotto non sono state inventate: sono state misurate.** Il campo `effetto` era
// libero, e nei dati si vede com'è finita — 523 frasi, 405 diverse fra loro, per dire un numero di
// cose molto minore. «Ripristina 100 SP di un alleato», «Ripristina interamente gli SP di un
// alleato» e «Ridona tutti gli SP a un alleato» sono tre stringhe estranee l'una all'altra e una
// cosa sola: un ripristino di SP su un alleato, con la quantità detta in tre modi.
//
// Peggio: dentro lo stesso campo c'erano **tipi di dato diversi**. Effetti d'uso («Ripristina 100
// SP»), bonus da equipaggiamento («Agilità +2»), affinità elementali («Fiamme debole»), regali con
// la lista di chi li gradisce, Doti alzate, luoghi sbloccati. Un campo di testo era diventato il
// cassetto di sei cose che non si assomigliano.
//
// Classificando le 523 frasi, **25 famiglie ne coprono il 91,6%**. Le 44 che restano fuori sono
// casi singoli — «Amplia le condizioni per gli attacchi tecnici», «Abilita il Terzo Occhio nella
// pesca» — non una famiglia mancante: per quelli c'è `descrittivo`, che è una frase e si sa che lo è.
//
// La frase la compone l'app da `descriviEffetto`: due oggetti che fanno la stessa cosa la
// mostrano identica, e chi cerca «ripristina SP» li trova tutti e due.
// ============================================================

/** Su chi ricade l'effetto. Ricavato dai dati: 89 volte su chi lo usa, 53 su un alleato, 46 su tutti. */
export const BERSAGLI = ['chi-lo-usa', 'un-alleato', 'tutta-la-squadra', 'un-nemico', 'tutti-i-nemici'] as const;
export type Bersaglio = (typeof BERSAGLI)[number];

export const NOME_BERSAGLIO: Record<Bersaglio, string> = {
  'chi-lo-usa': 'chi lo usa',
  'un-alleato': 'un alleato',
  'tutta-la-squadra': 'tutta la squadra',
  'un-nemico': 'un nemico',
  'tutti-i-nemici': 'tutti i nemici',
};

/** Quanto: un numero, una percentuale, o tutto. I dati danno 106 assolute, 23 percentuali, 59 «tutto». */
export const MISURE = ['assoluta', 'percentuale', 'tutto'] as const;
export type Misura = (typeof MISURE)[number];

export const RISORSE = ['hp', 'sp', 'hp-e-sp'] as const;
export type Risorsa = (typeof RISORSE)[number];

export const NOME_RISORSA: Record<Risorsa, string> = { hp: 'HP', sp: 'SP', 'hp-e-sp': 'HP e SP' };

/** Gli stati alterati che i dati nominano davvero, non un elenco preso da un manuale. */
export const STATI_ALTERATI = ['sonno', 'confusione', 'amnesia', 'furia', 'paura', 'disperazione',
  'soggiogamento', 'vertigini', 'in-fiamme', 'congelamento', 'folgorazione', 'fame', 'morte'] as const;
export type StatoAlterato = (typeof STATI_ALTERATI)[number];

export const NOME_STATO: Record<StatoAlterato, string> = {
  sonno: 'Sonno', confusione: 'Confusione', amnesia: 'Amnesia', furia: 'Furia', paura: 'Paura',
  disperazione: 'Disperazione', soggiogamento: 'Soggiogamento', vertigini: 'Vertigini',
  'in-fiamme': 'In fiamme', congelamento: 'Congelamento', folgorazione: 'Folgorazione',
  fame: 'Fame', morte: 'Morte istantanea',
};

/** Le statistiche da equipaggiamento, come le scrivono i dati («Agilità +2», «HP massimi +10»). */
export const STATISTICHE_OGGETTO = ['forza', 'magia', 'resistenza', 'agilita', 'fortuna', 'hp-massimi', 'sp-massimi', 'critico', 'evasione-fisica', 'evasione-magica', 'tutte'] as const;
export type StatisticaOggetto = (typeof STATISTICHE_OGGETTO)[number];

export const NOME_STATISTICA: Record<StatisticaOggetto, string> = {
  forza: 'Forza', magia: 'Magia', resistenza: 'Resistenza', agilita: 'Agilità', fortuna: 'Fortuna',
  'hp-massimi': 'HP massimi', 'sp-massimi': 'SP massimi', critico: 'Critico',
  // Uscite dal residuo: «Evasione fisica più 5», «Evasione magica bassa», «Tutte le statistiche più 5».
  'evasione-fisica': 'Evasione fisica', 'evasione-magica': 'Evasione magica', tutte: 'Tutte le statistiche',
};

/** Le capacita' che un libro apre dentro un'attivita', ricavate dai dodici testi che restavano
 *  prosa: il Terzo Occhio in tre minigiochi, due tiri a biliardo, i trucchi, il linguaggio dei
 *  fiori e gli attacchi tecnici. Non un elenco immaginato: sono quelle che i dati nominano. */
export const FUNZIONI = ['terzo-occhio', 'tiri-speciali', 'tiro-masse', 'trucchi', 'linguaggio-fiori', 'attacchi-tecnici'] as const;
export type Funzione = (typeof FUNZIONI)[number];

export const NOME_FUNZIONE: Record<Funzione, string> = {
  'terzo-occhio': 'il Terzo Occhio', 'tiri-speciali': 'i tiri speciali', 'tiro-masse': 'il tiro masse',
  trucchi: 'i trucchi', 'linguaggio-fiori': 'il linguaggio dei fiori', 'attacchi-tecnici': 'le combinazioni di attacchi tecnici',
};

/** Che cosa si moltiplica, e dove si guadagna di piu'. Anche questi vengono dai testi reali. */
export const RESE = ['lettura', 'fabbricazione'] as const;
export type Resa = (typeof RESE)[number];
export const NOME_RESA: Record<Resa, string> = { lettura: 'la velocità di lettura', fabbricazione: 'gli strumenti creati per sessione' };

export const GUADAGNI = ['film', 'studio'] as const;
export type Guadagno = (typeof GUADAGNI)[number];
export const NOME_GUADAGNO: Record<Guadagno, string> = { film: 'guardando film e DVD', studio: 'studiando' };

/** Quanto è probabile che l'effetto scatti: la guida dice «alta», «media» o non lo dice. */
export const PROBABILITA = ['alta', 'media', 'bassa', 'non-detta'] as const;
export type Probabilita = (typeof PROBABILITA)[number];

/** Un effetto, dichiarato per quello che è invece che descritto in una frase.
 *
 * `descrittivo` non è una scappatoia: è la casella per le 44 frasi che nei dati non formano una
 * famiglia — «Abilita il Terzo Occhio nella pesca» — ed è **dichiarata come tale**, così si vede
 * subito quante ce ne sono e non si confonde con un effetto che l'app sa valutare. */
export type EffettoOggetto =
  | { famiglia: 'ripristina'; risorsa: Risorsa; misura: Misura; valore: number | null; bersaglio: Bersaglio; soloInPostiSicuri?: boolean }
  | { famiglia: 'rianima'; percentuale: number | null; bersaglio: Bersaglio }
  | { famiglia: 'cura-stato'; stato: StatoAlterato | 'tutti'; bersaglio: Bersaglio }
  | { famiglia: 'infliggi-stato'; stato: StatoAlterato; probabilita: Probabilita; bersaglio: Bersaglio }
  | { famiglia: 'resiste-stato'; stato: StatoAlterato }
  | { famiglia: 'previene-stato'; stato: StatoAlterato }
  | { famiglia: 'statistica'; statistica: StatisticaOggetto; valore: number }
  | { famiglia: 'dote'; dote: string; note: number }
  | { famiglia: 'regalo'; graditoA: string[] }
  | { famiglia: 'sblocca-luogo'; luogo: string }
  /** Apre una capacita' dentro un'attivita': il Terzo Occhio alla pesca, i tiri speciali a
   *  biliardo, i trucchi dei videogiochi retro. `dove` e' la chiave dell'attivita', cosi' l'app ci
   *  puo' portare; `null` per quelle che non stanno in un'attivita' sola, come gli attacchi tecnici. */
  | { famiglia: 'sblocca-funzione'; funzione: Funzione; dove: string | null }
  /** Raddoppia una resa: la velocita' di lettura, gli strumenti creati per sessione. */
  | { famiglia: 'moltiplica'; cosa: Resa; fattore: number }
  /** Fa guadagnare di piu' da qualcosa che gia' si faceva: i punti Dote dai film, quelli da studio. */
  | { famiglia: 'aumenta-punti'; dove: Guadagno }
  | { famiglia: 'descrittivo'; testo: string };

const conValore = (misura: Misura, valore: number | null) =>
  misura === 'tutto' ? 'tutti' : misura === 'percentuale' ? `il ${valore ?? 0}%` : String(valore ?? 0);

/** La frase italiana di un effetto: **una sola per ogni effetto uguale**.
 *
 * È il punto dell'esercizio. Finché la frase la scriveva una persona, la stessa cosa aveva tre
 * forme e la ricerca ne trovava una; scritta da qui, due oggetti che fanno la stessa cosa la
 * mostrano identica. */
export function descriviEffetto(e: EffettoOggetto): string {
  switch (e.famiglia) {
    case 'ripristina': {
      const quanto = conValore(e.misura, e.valore);
      const risorsa = NOME_RISORSA[e.risorsa];
      const dove = e.soloInPostiSicuri ? ', solo in posti sicuri' : '';
      return `Ripristina ${quanto} ${risorsa} di ${NOME_BERSAGLIO[e.bersaglio]}${dove}`;
    }
    case 'rianima':
      return `Rianima ${NOME_BERSAGLIO[e.bersaglio]}${e.percentuale !== null ? ` con il ${e.percentuale}% degli HP` : ''}`;
    case 'cura-stato':
      return `Cura ${e.stato === 'tutti' ? 'tutti gli stati alterati' : NOME_STATO[e.stato]} di ${NOME_BERSAGLIO[e.bersaglio]}`;
    case 'infliggi-stato': {
      const p = e.probabilita === 'non-detta' ? '' : `${e.probabilita === 'alta' ? 'Alta' : e.probabilita === 'media' ? 'Media' : 'Bassa'} probabilità di infliggere `;
      return `${p || 'Infligge '}${NOME_STATO[e.stato]} a ${NOME_BERSAGLIO[e.bersaglio]}`;
    }
    case 'resiste-stato': return `Resiste a ${NOME_STATO[e.stato]}`;
    case 'previene-stato': return `Previene ${NOME_STATO[e.stato]}`;
    case 'statistica': return `${NOME_STATISTICA[e.statistica]} ${e.valore >= 0 ? '+' : ''}${e.valore}`;
    case 'dote': return `${e.dote} ${'♪'.repeat(Math.max(1, Math.min(4, e.note)))}`;
    case 'regalo': return e.graditoA.length ? `Regalo, gradito a ${e.graditoA.join(', ')}` : 'Regalo';
    case 'sblocca-luogo': return `Sblocca ${e.luogo}`;
    case 'sblocca-funzione': return `Sblocca ${NOME_FUNZIONE[e.funzione]}${e.dove ? ` in ${e.dove}` : ''}`;
    case 'moltiplica': return `Moltiplica per ${e.fattore} ${NOME_RESA[e.cosa]}`;
    case 'aumenta-punti': return `Aumenta i punti Dote ottenuti ${NOME_GUADAGNO[e.dove]}`;
    case 'descrittivo': return e.testo;
  }
}

/** Le famiglie offerte nel modulo, con l'etichetta e quante frasi coprivano nei dati di partenza. */
export const FAMIGLIE_EFFETTO: ReadonlyArray<{ chiave: EffettoOggetto['famiglia']; nome: string }> = [
  { chiave: 'ripristina', nome: 'Ripristina HP o SP' },
  { chiave: 'rianima', nome: 'Rianima un alleato caduto' },
  { chiave: 'cura-stato', nome: 'Cura uno stato alterato' },
  { chiave: 'infliggi-stato', nome: 'Infligge uno stato alterato' },
  { chiave: 'resiste-stato', nome: 'Resiste a uno stato alterato' },
  { chiave: 'previene-stato', nome: 'Previene uno stato alterato' },
  { chiave: 'statistica', nome: 'Bonus a una statistica' },
  { chiave: 'dote', nome: 'Alza una Dote sociale' },
  { chiave: 'regalo', nome: 'Regalo per un Confidente' },
  { chiave: 'sblocca-luogo', nome: 'Sblocca un luogo' },
  { chiave: 'sblocca-funzione', nome: 'Sblocca una capacità in un’attività' },
  { chiave: 'moltiplica', nome: 'Moltiplica una resa' },
  { chiave: 'aumenta-punti', nome: 'Fa guadagnare più punti Dote' },
  { chiave: 'descrittivo', nome: 'Altro (descritto a parole)' },
];
