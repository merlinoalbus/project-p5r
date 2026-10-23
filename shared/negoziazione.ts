// ============================================================
// negoziazione — i contratti della negoziazione per umore (L8, B5: R8-07a, R8-07b, R8-07e)
// ============================================================
//
// Una fonte operativa sola, in sei tabelle (`negoziazione_*`): famiglia di domande, variante concreta (Royal, file originale dell'app,
// eventuale ritocco di runtime), risposta, attestazione per umore, carte degli umori, fotografia dell'importazione.
// Questo modulo non ha dipendenze dal server: lo usano la migrazione (che scrive il rapporto), il servizio (che lo rimisura sui dati vivi)
// e, domani, il client. Contiene i tipi delle righe, la valutazione di una cella (principale / alternative / altre provenienze) e la
// riconciliazione dei conteggi, calcolata sulle righe e mai sui totali storici.
//
// Regole di lettura (contratto-negoziazione.md, «Soluzione proposta al gate»):
//  - Royal è la fonte principale sulle corrispondenze attestate; gli esiti dell'app restano come altra provenienza;
//  - Royal vuoto non cancella l'esito dell'app: resta visibile come «solo da P5, non verificato in Royal»;
//  - più esiti Royal nella stessa cella = discordanza visibile, mai il migliore né il peggiore scelto in silenzio;
//  - un esito principale da una cella «non confermata» non si presenta come verificato Royal;
//  - `-` è esito non documentato, non esito neutro: una cella vuota è una cella senza esiti, non un esito.
// ============================================================

import type { EsitoNegoziazione, UmoreNegoziazione } from './elementi.js';

/** Gli umori nell'ordine delle colonne del foglio Royal (cupa, irritabile, timida, giocosa): l'ordine dei dati importati. */
export const UMORI_ORDINE_FONTE: ReadonlyArray<UmoreNegoziazione> = ['cupa', 'irritabile', 'timida', 'giocosa'];

/** Da dove viene una variante di domanda o un'attestazione. */
export type FonteNegoziazione = 'royal' | 'app-originale' | 'runtime';
/** Che cosa dice la fonte dello stato di un esito. Un'assenza di dato non ha stato. */
export type OrigineEsito = 'confermata' | 'ereditata-da-P5-non-confermata' | 'app' | 'runtime';
/** Da dove viene il testo italiano di una variante o di una risposta (`nessuna` = non c'è). */
export type OrigineTesto = 'gioco' | 'resa-app' | 'resa-esperto' | 'nessuna';
export type CertezzaAbbinamento = 'alta' | 'media' | 'bassa';

// ---- Le righe delle tabelle (le stesse del DB, con i JSON già letti) ----

export interface RigaNegDomanda { chiave: string; ordine: number }

export interface NoteVariante {
  /** Royal: i nomi Shadow indicati dalla fonte come classi della tabella (attestazione della fonte, non collegamento alle Ombre). */
  ombreIndicate?: string[];
  /** App: la variante Royal a cui la domanda è abbinata (null = nessuna), con la certezza del giudizio. */
  abbinamentoRoyal?: { variante: string | null; certezza: CertezzaAbbinamento };
  /** La nota del riscontro (per esempio le domande composte). */
  nota?: string;
  /** Domanda composta: le sue risposte contengono più frasi Royal e gli esiti non si attribuiscono a un segmento. */
  composta?: boolean;
  /** Relazioni dimostrate con altre varianti (varianti Royal, domanda dell'app che incorpora). */
  relazioni?: Array<{ con: string; tipo: 'variante-di' | 'incorporata-in' | 'incorpora'; fonte: string }>;
  /** Da dove è stata presa la resa italiana quando non è del gioco. */
  testoDa?: string;
  /** Annotazione editoriale accanto alla resa (per esempio «seconda versione»). */
  annotazioneResa?: string;
}

export interface RigaNegVariante {
  chiave: string;
  domanda_chiave: string;
  /** La resa italiana; null se non c'è. */
  testo: string | null;
  /** Il testo come nella fonte (inglese per Royal, la resa dell'app per il file originale). */
  testo_originale: string;
  testo_origine: OrigineTesto;
  fonte: FonteNegoziazione;
  versione_fonte: string;
  localizzatore: string;
  ordine: number;
  note_json: string;
}

export interface CorrispondenzaRisposta { risposta: string; certezza: CertezzaAbbinamento; fonte: string; composita?: boolean }

export interface RigaNegRisposta {
  chiave: string;
  variante_chiave: string;
  testo: string | null;
  testo_originale: string;
  testo_origine: OrigineTesto;
  /** 0 = il testo non è disponibile nella fonte (R230, due risposte «[…]»). */
  testo_disponibile: number;
  ordine: number;
  corrispondenze_json: string;
}

export interface RigaNegVerdetto {
  chiave: string;
  risposta_chiave: string;
  umore: UmoreNegoziazione;
  /** Null = cella senza esito documentato (assenza di dato, non esito neutro). */
  esito: EsitoNegoziazione | null;
  incerto: number;
  fonte: FonteNegoziazione;
  versione_fonte: string;
  localizzatore: string;
  alternativa: number;
  valore_grezzo: string | null;
  colore_grezzo: string | null;
  origine_indicata_fonte: OrigineEsito | null;
}

export interface RigheNegoziazione {
  domande: RigaNegDomanda[];
  varianti: RigaNegVariante[];
  risposte: RigaNegRisposta[];
  verdetti: RigaNegVerdetto[];
}

// ---- Valutazione di una cella ----

/** Un'attestazione atomica già pronta per la valutazione (le righe `negoziazione_verdetto` con esito). */
export interface AttestazioneNeg {
  chiave: string;
  esito: EsitoNegoziazione;
  incerto: boolean;
  fonte: FonteNegoziazione;
  origine: OrigineEsito | null;
  localizzatore: string;
  valoreGrezzo: string | null;
  /** Di quale risposta è (per le altre provenienze: la risposta dell'app collegata). */
  rispostaChiave: string;
  /** L'abbinamento da cui viene (per le altre provenienze): domanda composta, certezza bassa. */
  composita?: boolean;
  certezza?: CertezzaAbbinamento;
}

/**
 * - `royal`: un solo esito Royal (principale);
 * - `royal-discordante`: più esiti Royal nella stessa cella (multi-esito): niente principale, le alternative sono tutte visibili;
 * - `solo-app`: Royal non documenta la cella, l'app sì: esiti dell'app non verificati in Royal;
 * - `app-discordante`: Royal non documenta e l'app si contraddice: niente principale;
 * - `senza-dato`: nessuna fonte documenta la cella.
 */
export type StatoCella = 'royal' | 'royal-discordante' | 'solo-app' | 'app-discordante' | 'senza-dato';

export interface ValutazioneCella {
  stato: StatoCella;
  principale: AttestazioneNeg | null;
  /** Le alternative quando non c'è un principale (multi-esito, contraddizioni dell'app). */
  alternative: AttestazioneNeg[];
  /** Le attestazioni di altra provenienza (l'app, accanto a Royal), tutte conservate. */
  altre: AttestazioneNeg[];
  /** Una delle altre provenienze dice un esito che Royal non dice. */
  divergenza: boolean;
  /** Il principale (o le alternative) viene dalla classe «unconfirmed» della fonte: esito ereditato da P5, non confermato. */
  nonConfermata: boolean;
}

const nonConf = (a: AttestazioneNeg): boolean => a.origine === 'ereditata-da-P5-non-confermata';
/** Un'attestazione dell'app che non si può attribuire con sicurezza alla risposta Royal (domanda composta, abbinamento basso): resta visibile, non fa «divergenza». */
const nonAttribuibile = (a: AttestazioneNeg): boolean => a.composita === true || a.certezza === 'bassa';
/** Vero se la corrispondenza lega la risposta dell'app alla Royal con sicurezza: né composta né a bassa certezza. */
export const collegamentoSolido = (c: CorrispondenzaRisposta): boolean => c.composita !== true && c.certezza !== 'bassa';

/**
 * Valuta una cella (una risposta × un umore). `royal` sono le attestazioni Royal della cella con esito (le assenze non entrano),
 * `app` quelle delle risposte dell'app collegate (file originale e ritocchi di runtime). Nessuna scelta automatica del migliore o del peggiore.
 */
export function valutaCella(royal: ReadonlyArray<AttestazioneNeg>, app: ReadonlyArray<AttestazioneNeg>): ValutazioneCella {
  if (royal.length === 1) {
    const principale = royal[0]!;
    return { stato: 'royal', principale, alternative: [], altre: [...app], divergenza: app.some((a) => !nonAttribuibile(a) && a.esito !== principale.esito), nonConfermata: nonConf(principale) };
  }
  if (royal.length > 1) {
    const esiti = new Set(royal.map((r) => r.esito));
    return { stato: 'royal-discordante', principale: null, alternative: [...royal], altre: [...app], divergenza: app.some((a) => !nonAttribuibile(a) && !esiti.has(a.esito)), nonConfermata: royal.some(nonConf) };
  }
  if (app.length === 0) return { stato: 'senza-dato', principale: null, alternative: [], altre: [], divergenza: false, nonConfermata: false };
  const distinti = new Set(app.map((a) => a.esito));
  if (distinti.size === 1) return { stato: 'solo-app', principale: app[0]!, alternative: [], altre: app.slice(1), divergenza: false, nonConfermata: false };
  return { stato: 'app-discordante', principale: null, alternative: [...app], altre: [], divergenza: false, nonConfermata: false };
}

// ---- Lettura delle righe (JSON delle colonne) ----

export function leggiNoteVariante(json: string): NoteVariante {
  try { const v = JSON.parse(json) as unknown; return v && typeof v === 'object' ? (v as NoteVariante) : {}; } catch { return {}; }
}

export function leggiCorrispondenze(json: string): CorrispondenzaRisposta[] {
  try {
    const v = JSON.parse(json) as unknown;
    return Array.isArray(v) ? (v as CorrispondenzaRisposta[]).filter((c) => c && typeof c.risposta === 'string') : [];
  } catch { return []; }
}

// ---- Indice delle righe e riconciliazione dei conteggi ----

/** Le righe collegate fra loro una volta, per la valutazione e per la riconciliazione. */
export interface IndiceNegoziazione {
  variantePerChiave: Map<string, RigaNegVariante>;
  rispostaPerChiave: Map<string, RigaNegRisposta>;
  /** Le risposte di ogni variante, in ordine. */
  risposteDi: Map<string, RigaNegRisposta[]>;
  /** Le varianti di ogni famiglia, in ordine. */
  variantiDi: Map<string, RigaNegVariante[]>;
  /** I verdetti di ogni risposta (tutti, assenze comprese). */
  verdettiDi: Map<string, RigaNegVerdetto[]>;
  /** Per ogni risposta Royal: le risposte dell'app collegate (qualunque certezza). */
  collegateApp: Map<string, Array<{ risposta: RigaNegRisposta; corrispondenza: CorrispondenzaRisposta }>>;
  /** Per ogni risposta dell'app: la risposta Royal collegata (se c'è). */
  collegataRoyal: Map<string, CorrispondenzaRisposta[]>;
}

export function costruisciIndice(righe: RigheNegoziazione): IndiceNegoziazione {
  const variantePerChiave = new Map(righe.varianti.map((v) => [v.chiave, v]));
  const rispostaPerChiave = new Map(righe.risposte.map((r) => [r.chiave, r]));
  const risposteDi = new Map<string, RigaNegRisposta[]>();
  for (const r of [...righe.risposte].sort((a, b) => a.ordine - b.ordine)) {
    const l = risposteDi.get(r.variante_chiave) ?? [];
    l.push(r);
    risposteDi.set(r.variante_chiave, l);
  }
  const variantiDi = new Map<string, RigaNegVariante[]>();
  for (const v of [...righe.varianti].sort((a, b) => a.ordine - b.ordine)) {
    const l = variantiDi.get(v.domanda_chiave) ?? [];
    l.push(v);
    variantiDi.set(v.domanda_chiave, l);
  }
  const verdettiDi = new Map<string, RigaNegVerdetto[]>();
  for (const v of righe.verdetti) {
    const l = verdettiDi.get(v.risposta_chiave) ?? [];
    l.push(v);
    verdettiDi.set(v.risposta_chiave, l);
  }
  const collegateApp = new Map<string, Array<{ risposta: RigaNegRisposta; corrispondenza: CorrispondenzaRisposta }>>();
  const collegataRoyal = new Map<string, CorrispondenzaRisposta[]>();
  for (const r of righe.risposte) {
    const v = variantePerChiave.get(r.variante_chiave);
    if (!v || v.fonte === 'royal') continue;
    for (const c of leggiCorrispondenze(r.corrispondenze_json)) {
      const dest = rispostaPerChiave.get(c.risposta);
      if (!dest) continue;
      const l = collegateApp.get(dest.chiave) ?? [];
      l.push({ risposta: r, corrispondenza: c });
      collegateApp.set(dest.chiave, l);
      const m = collegataRoyal.get(r.chiave) ?? [];
      m.push(c);
      collegataRoyal.set(r.chiave, m);
    }
  }
  return { variantePerChiave, rispostaPerChiave, risposteDi, variantiDi, verdettiDi, collegateApp, collegataRoyal };
}

const comeAttestazione = (v: RigaNegVerdetto, extra: Partial<AttestazioneNeg> = {}): AttestazioneNeg => ({
  chiave: v.chiave, esito: v.esito as EsitoNegoziazione, incerto: v.incerto === 1, fonte: v.fonte, origine: v.origine_indicata_fonte, localizzatore: v.localizzatore,
  valoreGrezzo: v.valore_grezzo, rispostaChiave: v.risposta_chiave, ...extra,
});

/** Le attestazioni con esito di una risposta per un umore (le assenze sono righe senza esito e non entrano). */
export function attestazioniDi(indice: IndiceNegoziazione, rispostaChiave: string, umore: UmoreNegoziazione, extra: Partial<AttestazioneNeg> = {}): AttestazioneNeg[] {
  return (indice.verdettiDi.get(rispostaChiave) ?? []).filter((v) => v.umore === umore && v.esito !== null).sort((a, b) => a.alternativa - b.alternativa || a.localizzatore.localeCompare(b.localizzatore)).map((v) => comeAttestazione(v, extra));
}

/** Valuta la cella di una risposta Royal: le sue attestazioni, più quelle delle risposte dell'app collegate. */
export function valutaCellaRoyal(indice: IndiceNegoziazione, rispostaRoyal: string, umore: UmoreNegoziazione): ValutazioneCella {
  const app: AttestazioneNeg[] = [];
  for (const { risposta, corrispondenza } of indice.collegateApp.get(rispostaRoyal) ?? []) {
    app.push(...attestazioniDi(indice, risposta.chiave, umore, { composita: corrispondenza.composita === true, certezza: corrispondenza.certezza }));
  }
  return valutaCella(attestazioniDi(indice, rispostaRoyal, umore), app);
}

/**
 * Valuta la cella di una risposta dell'app: se è legata con sicurezza a una Royal vale la valutazione Royal; se il legame è basso o la domanda è
 * composta (gli esiti non si attribuiscono a un segmento), o non c'è, sono solo le sue attestazioni, senza prendere in prestito l'esito di Royal.
 */
export function valutaCellaApp(indice: IndiceNegoziazione, rispostaApp: string, umore: UmoreNegoziazione): ValutazioneCella {
  const solido = (indice.collegataRoyal.get(rispostaApp) ?? []).find(collegamentoSolido);
  if (solido) return valutaCellaRoyal(indice, solido.risposta, umore);
  return valutaCella([], attestazioniDi(indice, rispostaApp, umore));
}

// ---- Riconciliazione ----

/** Una cella dell'app (risposta × umore) da rivedere: gli esiti dell'app e quelli Royal collegati. */
export interface CellaDaRivedere { risposta: string; umore: UmoreNegoziazione; app: string[]; royal: string[] }

export interface RiconciliazioneNegoziazione {
  /** Le righe misurate ora. */
  righe: {
    famiglie: number;
    varianti: Record<FonteNegoziazione, number>;
    risposte: Record<FonteNegoziazione, number>;
    attestazioni: Record<FonteNegoziazione, number>;
    celleRoyal: number;
    celleRoyalNonConfermate: number;
    risposteSenzaTesto: number;
  };
  /** L'inventario delle celle Royal per umore (GOOD, OK, BAD, multi-esito, vuote, totale). */
  celleRoyalPerUmore: Record<UmoreNegoziazione, { buona: number; passabile: number; cattiva: number; multiEsito: number; vuote: number; totale: number }>;
  /** Le attestazioni del file originale dell'app, confrontate con la cella Royal collegata, per umore. */
  attestazioniApp: Record<UmoreNegoziazione, { totale: number; uguali: number; diverse: number; royalVuoto: number; rispostaNonAbbinata: number; domandaNonAbbinata: number }>;
  attestazioniAppTotali: { totale: number; uguali: number; diverse: number; royalVuoto: number; rispostaNonAbbinata: number; domandaNonAbbinata: number; incerte: number };
  /** Celle dell'app (risposta × umore) con più esiti diversi nel file originale. */
  celleAppContraddittorie: { totale: number; conRoyalSingolo: number; senzaRoyal: Array<{ risposta: string; umore: UmoreNegoziazione }> };
  /** Celle dell'app con Royal documentata e nessun esito coincidente (la rettifica «vale Royal»). */
  celleAppSenzaCoincidenza: number;
  /** Celle dell'app con Royal vuota (e le attestazioni atomiche relative). */
  celleAppConRoyalVuoto: { celle: number; atomiche: number };
  /** Risposte dell'app senza corrispondente: dentro domande abbinate / di domande senza abbinamento. */
  risposteAppSenzaCorrispondenza: { inDomandeAbbinate: number; inDomandeNonAbbinate: number };
  /** Celle Royal documentate su risposte con almeno un'attestazione dell'app collegata, senza attestazione dell'app sulla stessa cella. */
  celleRoyalAggiunte: number;
  /** Domande dell'app (file originale) senza nessuna risposta «buona», e come stanno nella lettura unica. */
  domandeSenzaBuona: { appOriginale: number; royal: number; lettura: number };
  /** Gli elenchi consultabili dietro i conteggi. */
  elenchi: {
    contraddittorie: CellaDaRivedere[];
    senzaCoincidenza: CellaDaRivedere[];
    royalVuote: CellaDaRivedere[];
    /** Le domande dell'app senza «buona» nel file originale, e se la lettura unica ne trova una (da Royal) o no. */
    domandeSenzaBuona: Array<{ variante: string; dopo: 'buona-da-royal' | 'nessuna-buona' }>;
  };
}

const UMORI: ReadonlyArray<UmoreNegoziazione> = UMORI_ORDINE_FONTE;

/** Le risposte Royal collegate ad almeno una risposta dell'app. */
export function riconcilia(righe: RigheNegoziazione): RiconciliazioneNegoziazione {
  const ix = costruisciIndice(righe);
  const varianti = { royal: 0, 'app-originale': 0, runtime: 0 } as Record<FonteNegoziazione, number>;
  const risposte = { royal: 0, 'app-originale': 0, runtime: 0 } as Record<FonteNegoziazione, number>;
  const attestazioni = { royal: 0, 'app-originale': 0, runtime: 0 } as Record<FonteNegoziazione, number>;
  for (const v of righe.varianti) varianti[v.fonte]++;
  for (const r of righe.risposte) { const v = ix.variantePerChiave.get(r.variante_chiave); if (v) risposte[v.fonte]++; }
  for (const v of righe.verdetti) if (v.esito !== null) attestazioni[v.fonte]++;

  // ---- le celle Royal ----
  const celleRoyalPerUmore = Object.fromEntries(UMORI.map((u) => [u, { buona: 0, passabile: 0, cattiva: 0, multiEsito: 0, vuote: 0, totale: 0 }])) as RiconciliazioneNegoziazione['celleRoyalPerUmore'];
  let celleRoyal = 0;
  let nonConfermate = 0;
  let senzaTesto = 0;
  const risposteRoyal = righe.risposte.filter((r) => ix.variantePerChiave.get(r.variante_chiave)?.fonte === 'royal');
  for (const r of risposteRoyal) {
    if (r.testo_disponibile === 0) senzaTesto++;
    for (const u of UMORI) {
      const cella = (ix.verdettiDi.get(r.chiave) ?? []).filter((v) => v.umore === u);
      const conEsito = cella.filter((v) => v.esito !== null);
      const c = celleRoyalPerUmore[u];
      c.totale++;
      celleRoyal++;
      if (conEsito.length === 0) c.vuote++;
      else if (conEsito.length > 1) c.multiEsito++;
      else c[conEsito[0]!.esito as EsitoNegoziazione]++;
      if (conEsito.some((v) => v.origine_indicata_fonte === 'ereditata-da-P5-non-confermata')) nonConfermate++;
    }
  }

  // ---- le attestazioni del file originale dell'app, una per una ----
  const attestazioniApp = Object.fromEntries(UMORI.map((u) => [u, { totale: 0, uguali: 0, diverse: 0, royalVuoto: 0, rispostaNonAbbinata: 0, domandaNonAbbinata: 0 }])) as RiconciliazioneNegoziazione['attestazioniApp'];
  let incerte = 0;
  const celleApp = new Map<string, { risposta: string; umore: UmoreNegoziazione; esiti: string[] }>();
  for (const v of righe.verdetti) {
    if (v.fonte !== 'app-originale' || v.esito === null) continue;
    if (v.incerto === 1) incerte++;
    const t = attestazioniApp[v.umore];
    t.totale++;
    const k = `${v.risposta_chiave}|${v.umore}`;
    const cella = celleApp.get(k) ?? { risposta: v.risposta_chiave, umore: v.umore, esiti: [] };
    cella.esiti.push(v.esito);
    celleApp.set(k, cella);
    const risposta = ix.rispostaPerChiave.get(v.risposta_chiave);
    const variante = risposta ? ix.variantePerChiave.get(risposta.variante_chiave) : undefined;
    const abbinata = leggiNoteVariante(variante?.note_json ?? '{}').abbinamentoRoyal?.variante ?? null;
    const collegamenti = ix.collegataRoyal.get(v.risposta_chiave) ?? [];
    if (!abbinata) { t.domandaNonAbbinata++; continue; }
    if (collegamenti.length === 0) { t.rispostaNonAbbinata++; continue; }
    const atomi = attestazioniDi(ix, collegamenti[0]!.risposta, v.umore);
    if (atomi.length === 0) t.royalVuoto++;
    else if (atomi.some((a) => a.esito === v.esito)) t.uguali++;
    else t.diverse++;
  }
  const tot = { totale: 0, uguali: 0, diverse: 0, royalVuoto: 0, rispostaNonAbbinata: 0, domandaNonAbbinata: 0, incerte };
  for (const u of UMORI) for (const k of ['totale', 'uguali', 'diverse', 'royalVuoto', 'rispostaNonAbbinata', 'domandaNonAbbinata'] as const) tot[k] += attestazioniApp[u][k];

  // ---- celle dell'app: contraddizioni, senza coincidenza, con Royal vuoto ----
  let contraddittorie = 0;
  let conRoyalSingolo = 0;
  const senzaRoyal: Array<{ risposta: string; umore: UmoreNegoziazione }> = [];
  let senzaCoincidenza = 0;
  let royalVuotoCelle = 0;
  let royalVuotoAtomiche = 0;
  const elencoContraddittorie: CellaDaRivedere[] = [];
  const elencoSenzaCoincidenza: CellaDaRivedere[] = [];
  const elencoRoyalVuote: CellaDaRivedere[] = [];
  for (const c of celleApp.values()) {
    const collegamenti = ix.collegataRoyal.get(c.risposta) ?? [];
    const atomi = collegamenti.length ? attestazioniDi(ix, collegamenti[0]!.risposta, c.umore) : [];
    const voce: CellaDaRivedere = { risposta: c.risposta, umore: c.umore, app: c.esiti, royal: atomi.map((a) => a.esito) };
    if (new Set(c.esiti).size > 1) {
      contraddittorie++;
      elencoContraddittorie.push(voce);
      if (atomi.length === 1) conRoyalSingolo++;
      if (atomi.length === 0) senzaRoyal.push({ risposta: c.risposta, umore: c.umore });
    }
    if (collegamenti.length && atomi.length > 0 && !c.esiti.some((e) => atomi.some((a) => a.esito === e))) { senzaCoincidenza++; elencoSenzaCoincidenza.push(voce); }
    if (collegamenti.length && atomi.length === 0) { royalVuotoCelle++; royalVuotoAtomiche += c.esiti.length; elencoRoyalVuote.push(voce); }
  }

  // ---- le risposte dell'app senza corrispondente ----
  let senzaCorrAbbinate = 0;
  let senzaCorrNonAbbinate = 0;
  for (const r of righe.risposte) {
    const v = ix.variantePerChiave.get(r.variante_chiave);
    if (!v || v.fonte !== 'app-originale') continue;
    if ((ix.collegataRoyal.get(r.chiave) ?? []).length > 0) continue;
    if (leggiNoteVariante(v.note_json).abbinamentoRoyal?.variante) senzaCorrAbbinate++;
    else senzaCorrNonAbbinate++;
  }

  // ---- le celle Royal che l'app non aveva ----
  let aggiunte = 0;
  for (const r of risposteRoyal) {
    const collegate = ix.collegateApp.get(r.chiave) ?? [];
    if (collegate.length === 0) continue;
    for (const u of UMORI) {
      if (attestazioniDi(ix, r.chiave, u).length === 0) continue;
      const haApp = collegate.some((c) => attestazioniDi(ix, c.risposta.chiave, u).length > 0);
      if (!haApp) aggiunte++;
    }
  }

  // ---- domande senza nessuna risposta buona ----
  const haBuona = (variante: RigaNegVariante): boolean => (ix.risposteDi.get(variante.chiave) ?? []).some((r) => (ix.verdettiDi.get(r.chiave) ?? []).some((v) => v.esito === 'buona'));
  const appOriginale = righe.varianti.filter((v) => v.fonte === 'app-originale');
  const royalV = righe.varianti.filter((v) => v.fonte === 'royal');
  // La lettura unica: una famiglia ha una «buona» se una sua risposta Royal valutata ne ha una principale o fra le alternative, o se una risposta senza Royal ne ha una nell'app.
  let senzaBuonaLettura = 0;
  const elencoSenzaBuona: RiconciliazioneNegoziazione['elenchi']['domandeSenzaBuona'] = [];
  for (const v of appOriginale) {
    let trovata = false;
    for (const r of ix.risposteDi.get(v.chiave) ?? []) {
      for (const u of UMORI) {
        const val = valutaCellaApp(ix, r.chiave, u);
        if (val.principale?.esito === 'buona' || val.alternative.some((a) => a.esito === 'buona')) { trovata = true; break; }
      }
      if (trovata) break;
    }
    if (!trovata) senzaBuonaLettura++;
    if (!haBuona(v)) elencoSenzaBuona.push({ variante: v.chiave, dopo: trovata ? 'buona-da-royal' : 'nessuna-buona' });
  }

  return {
    righe: {
      famiglie: righe.domande.length, varianti, risposte, attestazioni, celleRoyal, celleRoyalNonConfermate: nonConfermate, risposteSenzaTesto: senzaTesto,
    },
    celleRoyalPerUmore,
    attestazioniApp,
    attestazioniAppTotali: tot,
    celleAppContraddittorie: { totale: contraddittorie, conRoyalSingolo, senzaRoyal },
    celleAppSenzaCoincidenza: senzaCoincidenza,
    celleAppConRoyalVuoto: { celle: royalVuotoCelle, atomiche: royalVuotoAtomiche },
    risposteAppSenzaCorrispondenza: { inDomandeAbbinate: senzaCorrAbbinate, inDomandeNonAbbinate: senzaCorrNonAbbinate },
    celleRoyalAggiunte: aggiunte,
    domandeSenzaBuona: { appOriginale: appOriginale.filter((v) => !haBuona(v)).length, royal: royalV.filter((v) => !haBuona(v)).length, lettura: senzaBuonaLettura },
    elenchi: { contraddittorie: elencoContraddittorie, senzaCoincidenza: elencoSenzaCoincidenza, royalVuote: elencoRoyalVuote, domandeSenzaBuona: elencoSenzaBuona },
  };
}

// ---- I valori attesi dal contratto (misure storiche: riscontro, mai soglia) ----

/** Le misure di `contratto-negoziazione.md`, riverificate dal blocco B1: il rapporto le confronta con quelle viste ora. */
export const ATTESI_CONTRATTO = {
  royal: { domande: 277, risposte: 831, celle: 3324, nonConfermate: 304 },
  celleRoyalPerUmore: {
    cupa: { buona: 239, passabile: 139, cattiva: 97, multiEsito: 1, vuote: 355, totale: 831 },
    irritabile: { buona: 243, passabile: 114, cattiva: 104, multiEsito: 1, vuote: 369, totale: 831 },
    timida: { buona: 212, passabile: 86, cattiva: 53, multiEsito: 0, vuote: 480, totale: 831 },
    giocosa: { buona: 253, passabile: 115, cattiva: 59, multiEsito: 2, vuote: 402, totale: 831 },
  },
  appOriginale: { domande: 230, risposte: 691, attestazioni: 642 },
  attestazioniApp: {
    cupa: { totale: 161, uguali: 113, diverse: 31, royalVuoto: 9, rispostaNonAbbinata: 8, domandaNonAbbinata: 0 },
    irritabile: { totale: 207, uguali: 133, diverse: 34, royalVuoto: 23, rispostaNonAbbinata: 16, domandaNonAbbinata: 1 },
    timida: { totale: 128, uguali: 94, diverse: 16, royalVuoto: 13, rispostaNonAbbinata: 5, domandaNonAbbinata: 0 },
    giocosa: { totale: 146, uguali: 104, diverse: 28, royalVuoto: 10, rispostaNonAbbinata: 4, domandaNonAbbinata: 0 },
  },
  attestazioniAppTotali: { totale: 642, uguali: 444, diverse: 109, royalVuoto: 55, rispostaNonAbbinata: 33, domandaNonAbbinata: 1 },
  celleAppContraddittorie: 24,
  celleAppSenzaCoincidenza: 87,
  celleAppConRoyalVuoto: { celle: 53, atomiche: 55 },
  risposteAppSenzaCorrispondenza: { inDomandeAbbinate: 49, inDomandeNonAbbinate: 3 },
  domandeSenzaBuona: { appOriginale: 52, royal: 10 },
} as const;

/** Il confronto, voce per voce, fra le misure di ora e quelle del contratto: un riscontro, non una soglia. */
export function confrontaConContratto(m: RiconciliazioneNegoziazione): Array<{ voce: string; atteso: number; misurato: number; coincide: boolean }> {
  const voci: Array<{ voce: string; atteso: number; misurato: number }> = [];
  const aggiungi = (voce: string, atteso: number, misurato: number): void => { voci.push({ voce, atteso, misurato }); };
  const A = ATTESI_CONTRATTO;
  aggiungi('Royal: domande', A.royal.domande, m.righe.varianti.royal);
  aggiungi('Royal: righe risposta', A.royal.risposte, m.righe.risposte.royal);
  aggiungi('Royal: celle', A.royal.celle, m.righe.celleRoyal);
  aggiungi('Royal: celle non confermate', A.royal.nonConfermate, m.righe.celleRoyalNonConfermate);
  for (const u of UMORI_ORDINE_FONTE) {
    for (const k of ['buona', 'passabile', 'cattiva', 'multiEsito', 'vuote', 'totale'] as const) aggiungi(`Royal ${u}: ${k}`, A.celleRoyalPerUmore[u][k], m.celleRoyalPerUmore[u][k]);
  }
  aggiungi('App (file originale): domande', A.appOriginale.domande, m.righe.varianti['app-originale']);
  aggiungi('App (file originale): risposte', A.appOriginale.risposte, m.righe.risposte['app-originale']);
  aggiungi('App (file originale): attestazioni', A.appOriginale.attestazioni, m.righe.attestazioni['app-originale']);
  for (const u of UMORI_ORDINE_FONTE) {
    for (const k of ['totale', 'uguali', 'diverse', 'royalVuoto', 'rispostaNonAbbinata', 'domandaNonAbbinata'] as const) aggiungi(`Attestazioni dell'app ${u}: ${k}`, A.attestazioniApp[u][k], m.attestazioniApp[u][k]);
  }
  for (const k of ['totale', 'uguali', 'diverse', 'royalVuoto', 'rispostaNonAbbinata', 'domandaNonAbbinata'] as const) aggiungi(`Attestazioni dell'app: ${k}`, A.attestazioniAppTotali[k], m.attestazioniAppTotali[k]);
  aggiungi('Celle dell\'app contraddittorie', A.celleAppContraddittorie, m.celleAppContraddittorie.totale);
  aggiungi('Celle dell\'app senza esito coincidente con Royal', A.celleAppSenzaCoincidenza, m.celleAppSenzaCoincidenza);
  aggiungi('Celle Royal vuote con esito dell\'app', A.celleAppConRoyalVuoto.celle, m.celleAppConRoyalVuoto.celle);
  aggiungi('Attestazioni atomiche con Royal vuoto', A.celleAppConRoyalVuoto.atomiche, m.celleAppConRoyalVuoto.atomiche);
  aggiungi('Risposte dell\'app senza corrispondente (domande abbinate)', A.risposteAppSenzaCorrispondenza.inDomandeAbbinate, m.risposteAppSenzaCorrispondenza.inDomandeAbbinate);
  aggiungi('Risposte dell\'app senza corrispondente (domande non abbinate)', A.risposteAppSenzaCorrispondenza.inDomandeNonAbbinate, m.risposteAppSenzaCorrispondenza.inDomandeNonAbbinate);
  aggiungi('Domande dell\'app senza risposta buona', A.domandeSenzaBuona.appOriginale, m.domandeSenzaBuona.appOriginale);
  aggiungi('Domande Royal senza risposta buona', A.domandeSenzaBuona.royal, m.domandeSenzaBuona.royal);
  return voci.map((v) => ({ ...v, coincide: v.atteso === v.misurato }));
}

// ---- Contratto dell'API ----

export interface NegAttestazioneDto {
  chiave: string;
  esito: EsitoNegoziazione;
  /** Nemmeno la fonte è certa (il punto interrogativo della cella o il «incerto» dell'app). */
  incerto: boolean;
  fonte: FonteNegoziazione;
  /** `ereditata-da-P5-non-confermata` = classe «unconfirmed» di Royal: esito ereditato dal gioco base, non confermato. */
  origine: OrigineEsito | null;
  localizzatore: string;
  valoreGrezzo: string | null;
  composita: boolean;
  certezza: CertezzaAbbinamento | null;
}

export interface NegCellaDto {
  umore: UmoreNegoziazione;
  stato: StatoCella;
  principale: NegAttestazioneDto | null;
  alternative: NegAttestazioneDto[];
  altre: NegAttestazioneDto[];
  divergenza: boolean;
  nonConfermata: boolean;
}

export interface NegRispostaDto {
  /** Identità stabile della risposta (mai il testo). */
  chiave: string;
  /** La resa italiana (null se non c'è: allora si mostra l'originale e la si dichiara). */
  testo: string | null;
  testoOriginale: string;
  testoOrigine: OrigineTesto;
  /** false = il testo non è disponibile nella fonte (R230). */
  testoDisponibile: boolean;
  /** Le risposte delle altre varianti collegate (chiave, certezza, composita). */
  collegate: CorrispondenzaRisposta[];
  /**
   * Una cella per ognuno degli umori richiesti. Per una risposta dell'app legata con sicurezza a una Royal le celle sono quelle della risposta Royal
   * (`celleDa`) e qui restano vuote: gli esiti dell'app sono fra le `altre` di quella cella, nessuno perso.
   */
  celle: NegCellaDto[];
  /** La risposta Royal di cui valgono le celle, quando qui non sono ripetute. */
  celleDa: string | null;
}

export interface NegVarianteDto {
  chiave: string;
  testo: string | null;
  testoOriginale: string;
  testoOrigine: OrigineTesto;
  fonte: FonteNegoziazione;
  localizzatore: string;
  composta: boolean;
  nota: string | null;
  abbinamento: { variante: string | null; certezza: CertezzaAbbinamento } | null;
  relazioni: NonNullable<NoteVariante['relazioni']>;
  risposte: NegRispostaDto[];
}

export interface NegDomandaDto {
  chiave: string;
  ordine: number;
  /** Il testo da mostrare: la resa italiana della variante principale, o l'originale se non c'è. */
  testo: string;
  testoOrigine: OrigineTesto;
  /** La variante da cui viene il testo da mostrare e le risposte principali. */
  principale: string;
  varianti: NegVarianteDto[];
}

export interface NegUmoreDto {
  umore: UmoreNegoziazione;
  nome: string;
  descrizione: string;
  esempi: Array<Record<string, unknown>>;
  daEvitare: string[];
  fonte: string;
}

export interface NegoziazioneDto {
  /** Gli umori richiesti (uno, o tutti e quattro). */
  umori: UmoreNegoziazione[];
  /** Le carte degli umori richiesti. */
  carte: NegUmoreDto[];
  /** L'umore dedotto dall'Ombra richiesta (la sua personalità valida), con il suo nome. */
  ombra: { chiave: string; nome: string; personalita: string; umore: UmoreNegoziazione | null; negoziabile: boolean | null } | null;
  domande: NegDomandaDto[];
  totale: number;
}

export interface NegoziazioneVerificaDto {
  /** Le misure rifatte ora sulle righe. */
  misurato: RiconciliazioneNegoziazione;
  /** Le misure del contratto (riscontro, non soglia). */
  attesoContratto: typeof ATTESI_CONTRATTO;
  /** Il confronto, voce per voce, fra misurato e atteso. */
  confronto: Array<{ voce: string; atteso: number; misurato: number; coincide: boolean }>;
  /** Il rapporto scritto dall'importazione (fotografia immutabile). */
  importazione: { chiave: string; versioneFormato: number; fonti: unknown; rapporto: unknown } | null;
}
