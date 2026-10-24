// ============================================================
// modelloNegoziazione — la costruzione (pura, senza database) della negoziazione per umore (L8, B5: R8-07a, R8-07b, R8-07e)
// ============================================================
//
// Gli ingressi: le 277 domande Royal (trascrizione B1), il file originale dell'app (230 domande, 691 risposte, 642 attestazioni), l'abbinamento
// fra i due, le 49 rese italiane di G-021 §2 e — se c'è — la fotografia di runtime (`dati_guida.battaglia.negoziazione.domande`, che le
// migrazioni 083 e 084 hanno già normalizzato: una domanda per testo, un verdetto per carattere, il peggiore). La migrazione (`172_negoziazione_royal.ts`) scrive il
// risultato; qui si decide che cosa diventa che cosa.
//
// Regole (contratto-negoziazione.md):
//  - nulla si perde: ogni riga Royal, ogni risposta e ogni attestazione del file originale diventano righe con la loro coordinata di fonte;
//  - l'identità non viene mai dal testo: una variante è `royal-R<n>` o `app-A<n>`, una risposta `<variante>-<posizione>`; la famiglia raccoglie le
//    varianti dimostrate equivalenti (abbinamento alto o medio, varianti di G-021 §2); l'abbinamento basso (A87) non fonde e le domande composte
//    (A101, A218 e le due metà di R156) restano riconoscibili con le loro risposte;
//  - le celle: ogni cella Royal (anche vuota) è una riga; una cella vuota è assenza di dato, non esito; le quattro multi-esito si scompongono in
//    alternative ordinate senza perdere il valore grezzo;
//  - Royal vince dove è documentata (lettura in `shared/negoziazione.ts`), le attestazioni dell'app restano come altra provenienza;
//  - la resa italiana di una riga Royal non si inventa: viene dalle 49 rese di G-021 (`resa-esperto`) o dalla risposta dell'app collegata
//    con abbinamento sicuro (`resa-app`, con l'indicazione di dove è stata presa); altrimenti manca e si dichiara.
// ============================================================

import { normalizzaDomande } from './083_negoziazione_domande.js';
import type { EsitoNegoziazione, UmoreNegoziazione } from '../../../shared/elementi.js';
import {
  UMORI_ORDINE_FONTE,
  type CertezzaAbbinamento, type CorrispondenzaRisposta, type NoteVariante, type OrigineEsito, type OrigineTesto,
  type RigaNegDomanda, type RigaNegRisposta, type RigaNegVariante, type RigaNegVerdetto, type RigheNegoziazione,
} from '../../../shared/negoziazione.js';

// ---- Gli ingressi ----

export interface RoyalRisposta { n: number; t: string; c: string[]; multi_non_confermate?: number[]; testo_disponibile?: boolean }
export interface RoyalDomanda { R: number; ombre: string[]; q: string; risposte: RoyalRisposta[] }
export interface DomandaApp {
  domanda: string;
  risposte: Array<{ testo: string; verdetti: Array<{ esito: EsitoNegoziazione; tratto: UmoreNegoziazione; incerto?: boolean }> }>;
}
export interface FileAbbinamenti {
  righe: Array<[number, number | null, Array<number | null>, 'a' | 'm' | 'b']>;
  note: Record<string, string>;
  varianti: Array<{ r: number; equivalente_r?: number; incorporata_in_a?: number }>;
  nuove: number[];
}
export interface FileRese { rese: Array<{ R: number; q: string; r: Array<string | null>; nota?: string }> }

export interface IngressoNegoziazione {
  royal: RoyalDomanda[];
  abbinamenti: FileAbbinamenti;
  rese: FileRese;
  appOriginale: DomandaApp[];
  /** La fotografia di runtime già normalizzata (083/084), o null se la guida non la contiene. */
  runtime: DomandaApp[] | null;
}

export const VERSIONE_ROYAL = '2023-03-13';
export const VERSIONE_APP = 'originale-230';
export const VERSIONE_RUNTIME = 'runtime-083-084';

/** Le quattro domande dell'app composte da più frasi Royal: gli esiti non si attribuiscono a un segmento. */
const COMPOSTE_APP: ReadonlySet<number> = new Set([101, 125, 126, 218]);

const CERTEZZA: Record<'a' | 'm' | 'b', CertezzaAbbinamento> = { a: 'alta', m: 'media', b: 'bassa' };
const ESITO_DA_LETTERA: Record<string, EsitoNegoziazione> = { G: 'buona', O: 'passabile', B: 'cattiva' };
const ESITO_DA_PAROLA: Record<string, EsitoNegoziazione> = { GOOD: 'buona', OK: 'passabile', BAD: 'cattiva' };
const GREZZO_DA_LETTERA: Record<string, string> = { G: 'GOOD', O: 'OK', B: 'BAD' };
/** Colonne Excel di ogni risposta Royal (cupa, irritabile, timida, giocosa). */
const COLONNE_EXCEL: ReadonlyArray<ReadonlyArray<string>> = [['F', 'G', 'H', 'I'], ['K', 'L', 'M', 'N'], ['P', 'Q', 'R', 'S']];

export const chiaveRoyal = (r: number): string => `royal-R${r}`;
export const chiaveApp = (a: number): string => `app-A${a}`;

// ---- Le celle Royal ----

interface Atomo { esito: EsitoNegoziazione; incerto: boolean }
export interface CellaAnalizzata { atomi: Atomo[]; origine: OrigineEsito | null; grezzo: string }

/** Una cella della trascrizione: `-` = nessun dato; G O B confermati, g o b non confermati; altro = cella multi-esito (testo grezzo). */
export function analizzaCella(codice: string, multiNonConfermata: boolean): CellaAnalizzata {
  if (codice === '-') return { atomi: [], origine: null, grezzo: '-' };
  if (/^[GOBgob]$/.test(codice)) {
    return {
      atomi: [{ esito: ESITO_DA_LETTERA[codice.toUpperCase()]!, incerto: false }],
      origine: codice === codice.toUpperCase() ? 'confermata' : 'ereditata-da-P5-non-confermata',
      grezzo: GREZZO_DA_LETTERA[codice.toUpperCase()]!,
    };
  }
  const atomi = codice.split('/').map((pezzo) => {
    const incerto = pezzo.includes('?');
    const esito = ESITO_DA_PAROLA[pezzo.replace('?', '').trim().toUpperCase()];
    if (!esito) throw new Error(`cella Royal non riconosciuta: «${codice}»`);
    return { esito, incerto };
  });
  if (atomi.length < 2) throw new Error(`cella Royal non riconosciuta: «${codice}»`);
  return { atomi, origine: multiNonConfermata ? 'ereditata-da-P5-non-confermata' : 'confermata', grezzo: codice };
}

/** Le coordinate Excel di una cella: colonna dell'umore e della risposta, riga = R + 2. */
export const coordinataExcel = (R: number, posizione: number, indiceUmore: number): string => `${COLONNE_EXCEL[posizione - 1]![indiceUmore]!}${R + 2}`;

// ---- Le famiglie ----

class Unione {
  private padre = new Map<string, string>();
  trova(x: string): string {
    if (!this.padre.has(x)) this.padre.set(x, x);
    let r = x;
    while (this.padre.get(r) !== r) r = this.padre.get(r)!;
    let c = x;
    while (this.padre.get(c) !== r) { const n = this.padre.get(c)!; this.padre.set(c, r); c = n; }
    return r;
  }
  unisci(a: string, b: string): void { const ra = this.trova(a); const rb = this.trova(b); if (ra !== rb) this.padre.set(rb, ra); }
}

// ---- Il modello ----

export interface InfoModello {
  /** Famiglie con più di una variante: chiave → varianti. */
  famiglieMultiVariante: Array<{ famiglia: string; varianti: string[] }>;
  /** Le varianti Royal che entrano come domande nuove (le 49 di G-021 §2) con la resa dell'Esperto. */
  nuoveConResa: string[];
  /** Le relazioni documentate fra varianti Royal e domande dell'app. */
  relazioniVarianti: Array<{ variante: string; con: string; tipo: string }>;
  /** Risposte dell'app senza corrispondente, con la domanda: l'elenco consultabile. */
  appSenzaCorrispondente: Array<{ risposta: string; domanda: string; abbinata: boolean }>;
  /** Abbinamenti non fusi o da rivedere. */
  abbinamentiDaRivedere: Array<{ domanda: string; certezza: CertezzaAbbinamento; motivo: string }>;
  /** I ritocchi di runtime rispetto alla normalizzazione 083/084 del file originale. */
  runtime: { presente: boolean; domande: number; risposte: number; attestazioni: number; coincideConBaseline: boolean; variantiAggiunte: string[] };
  /** Le risposte Royal il cui testo non è disponibile nella fonte. */
  testiNonDisponibili: string[];
}

export interface ModelloNegoziazione extends RigheNegoziazione { info: InfoModello }

const canonica = (domande: ReadonlyArray<DomandaApp>): string => JSON.stringify(domande.map((q) => ({
  d: q.domanda, r: q.risposte.map((r) => ({ t: r.testo, v: r.verdetti.map((v) => [v.tratto, v.esito, !!v.incerto]) })),
})));

const TESTO_ASSENTE = new Set(['[...]', '[…]']);

/** Costruisce tutte le righe delle sei tabelle (salvo carte e fotografia) a partire dagli ingressi. */
export function costruisciModelloNegoziazione(ingresso: IngressoNegoziazione): ModelloNegoziazione {
  const { royal, abbinamenti, rese, appOriginale, runtime } = ingresso;

  // ---- controlli sugli ingressi: se non tornano, nessuna migrazione parziale ----
  royal.forEach((q, i) => {
    if (q.R !== i) throw new Error(`negoziazione Royal: la domanda ${i} ha R=${q.R}`);
    if (q.risposte.length !== 3) throw new Error(`negoziazione Royal: R${q.R} ha ${q.risposte.length} risposte`);
    q.risposte.forEach((r, k) => {
      if (r.n !== k + 1 || r.c.length !== 4) throw new Error(`negoziazione Royal: R${q.R} risposta ${k + 1} malformata`);
    });
  });
  if (abbinamenti.righe.length !== appOriginale.length) throw new Error(`abbinamenti: ${abbinamenti.righe.length} righe per ${appOriginale.length} domande dell'app`);
  abbinamenti.righe.forEach(([a, r, ordine], i) => {
    if (a !== i) throw new Error(`abbinamenti: la riga ${i} ha a=${a}`);
    if (ordine.length !== appOriginale[a]!.risposte.length) throw new Error(`abbinamenti: A${a} ha ${ordine.length} posizioni per ${appOriginale[a]!.risposte.length} risposte`);
    if (r !== null && (r < 0 || r >= royal.length)) throw new Error(`abbinamenti: A${a} punta a R${r}`);
    for (const n of ordine) if (n !== null && (n < 1 || n > 3)) throw new Error(`abbinamenti: A${a} punta a una risposta ${n}`);
  });
  const reseDi = new Map(rese.rese.map((x) => [x.R, x]));
  for (const R of abbinamenti.nuove) if (!reseDi.has(R)) throw new Error(`rese: manca la resa di R${R}`);
  if (reseDi.size !== abbinamenti.nuove.length) throw new Error('rese: ce ne sono più delle domande nuove');

  const abbinamentoDi = new Map(abbinamenti.righe.map((x) => [x[0], { r: x[1], ordine: x[2], certezza: CERTEZZA[x[3]] }]));

  // ---- le famiglie: unione delle varianti dimostrate equivalenti ----
  const unione = new Unione();
  for (let a = 0; a < appOriginale.length; a++) unione.trova(`A${a}`);
  for (let r = 0; r < royal.length; r++) unione.trova(`R${r}`);
  for (const [a, r, , cert] of abbinamenti.righe) if (r !== null && cert !== 'b') unione.unisci(`A${a}`, `R${r}`);
  for (const v of abbinamenti.varianti) {
    if (v.equivalente_r !== undefined) unione.unisci(`R${v.r}`, `R${v.equivalente_r}`);
    if (v.incorporata_in_a !== undefined) unione.unisci(`R${v.r}`, `A${v.incorporata_in_a}`);
  }

  // ---- le varianti runtime: solo ciò che differisce dalla normalizzazione 083/084 del file originale ----
  const baseline = normalizzaDomande(appOriginale as Parameters<typeof normalizzaDomande>[0]) as DomandaApp[];
  const baselinePerTesto = new Map(baseline.map((q) => [q.domanda, q]));
  const primaAppPerTesto = new Map<string, number>();
  appOriginale.forEach((q, a) => { if (!primaAppPerTesto.has(q.domanda)) primaAppPerTesto.set(q.domanda, a); });
  const variantiRuntime: Array<{ indice: number; domanda: DomandaApp; appCorrispondente: number | null }> = [];
  (runtime ?? []).forEach((q, i) => {
    const b = baselinePerTesto.get(q.domanda);
    if (b && canonica([b]) === canonica([q])) return;
    variantiRuntime.push({ indice: i, domanda: q, appCorrispondente: primaAppPerTesto.get(q.domanda) ?? null });
  });
  for (const v of variantiRuntime) {
    unione.trova(`Q${v.indice}`);
    if (v.appCorrispondente !== null) unione.unisci(`Q${v.indice}`, `A${v.appCorrispondente}`);
  }

  const membri = new Map<string, string[]>();
  const nodi = [
    ...appOriginale.map((_, a) => `A${a}`),
    ...royal.map((_, r) => `R${r}`),
    ...variantiRuntime.map((v) => `Q${v.indice}`),
  ];
  for (const n of nodi) { const radice = unione.trova(n); const l = membri.get(radice) ?? []; l.push(n); membri.set(radice, l); }
  const ordinePosizione = (n: string): number => (n.startsWith('A') ? Number(n.slice(1)) : n.startsWith('R') ? 100000 + Number(n.slice(1)) : 200000 + Number(n.slice(1)));
  const famiglie = [...membri.values()]
    .map((l) => l.sort((x, y) => ordinePosizione(x) - ordinePosizione(y)))
    .sort((x, y) => ordinePosizione(x[0]!) - ordinePosizione(y[0]!));
  const chiaveFamiglia = (m: string[]): string => {
    const prima = m[0]!;
    return `fam-${prima}`;
  };
  const famigliaDi = new Map<string, string>();
  const domande: RigaNegDomanda[] = famiglie.map((m, i) => {
    const chiave = chiaveFamiglia(m);
    for (const n of m) famigliaDi.set(n, chiave);
    return { chiave, ordine: i + 1 };
  });

  // ---- le varianti, nell'ordine: Royal, app (file originale), runtime ----
  const varianti: RigaNegVariante[] = [];
  const risposte: RigaNegRisposta[] = [];
  const verdetti: RigaNegVerdetto[] = [];
  const ordineInFamiglia = new Map<string, number>();
  const prossimoOrdine = (famiglia: string): number => { const n = (ordineInFamiglia.get(famiglia) ?? 0) + 1; ordineInFamiglia.set(famiglia, n); return n; };

  // Le collegate dell'app a ogni risposta Royal (per la resa italiana presa in prestito e per le corrispondenze).
  const prestito = new Map<string, { testo: string; da: string }>(); // chiave risposta Royal → resa dell'app
  const prestitoDomanda = new Map<number, { testo: string; da: string }>(); // R → resa dell'app
  for (const [a, r, ordine, cert] of abbinamenti.righe) {
    if (r === null || cert === 'b' || COMPOSTE_APP.has(a)) continue;
    if (!prestitoDomanda.has(r)) prestitoDomanda.set(r, { testo: appOriginale[a]!.domanda, da: chiaveApp(a) });
    ordine.forEach((n, i) => {
      if (n === null) return;
      const chiave = `${chiaveRoyal(r)}-${n}`;
      if (!prestito.has(chiave)) prestito.set(chiave, { testo: appOriginale[a]!.risposte[i]!.testo, da: `${chiaveApp(a)}-${i + 1}` });
    });
  }

  const relazioniVarianti: InfoModello['relazioniVarianti'] = [];
  const relazioniDi = new Map<string, NonNullable<NoteVariante['relazioni']>>();
  const aggiungiRelazione = (variante: string, rel: NonNullable<NoteVariante['relazioni']>[number]): void => {
    const l = relazioniDi.get(variante) ?? [];
    l.push(rel);
    relazioniDi.set(variante, l);
    relazioniVarianti.push({ variante, con: rel.con, tipo: rel.tipo });
  };
  for (const v of abbinamenti.varianti) {
    if (v.equivalente_r !== undefined) {
      aggiungiRelazione(chiaveRoyal(v.r), { con: chiaveRoyal(v.equivalente_r), tipo: 'variante-di', fonte: 'G-021 §2' });
      aggiungiRelazione(chiaveRoyal(v.equivalente_r), { con: chiaveRoyal(v.r), tipo: 'variante-di', fonte: 'G-021 §2' });
    }
    if (v.incorporata_in_a !== undefined) {
      aggiungiRelazione(chiaveRoyal(v.r), { con: chiaveApp(v.incorporata_in_a), tipo: 'incorporata-in', fonte: 'G-021 §2' });
      aggiungiRelazione(chiaveApp(v.incorporata_in_a), { con: chiaveRoyal(v.r), tipo: 'incorpora', fonte: 'G-021 §2' });
    }
  }
  const nuoveConResa: string[] = [];
  const testiNonDisponibili: string[] = [];

  const inserisciVariante = (v: Omit<RigaNegVariante, 'ordine' | 'note_json'> & { note: NoteVariante; famiglia: string }): void => {
    const { note, famiglia, ...riga } = v;
    varianti.push({ ...riga, ordine: prossimoOrdine(famiglia), note_json: JSON.stringify(note) });
  };

  // ---- Royal: 277 varianti, 831 risposte, 3324 celle ----
  for (const q of royal) {
    const chiave = chiaveRoyal(q.R);
    const famiglia = famigliaDi.get(`R${q.R}`)!;
    const resa = reseDi.get(q.R);
    const dalApp = prestitoDomanda.get(q.R);
    const note: NoteVariante = { ombreIndicate: q.ombre };
    if (relazioniDi.has(chiave)) note.relazioni = relazioniDi.get(chiave);
    if (resa?.nota) note.annotazioneResa = resa.nota;
    let testo: string | null = null;
    let origine: OrigineTesto = 'nessuna';
    if (resa) { testo = resa.q; origine = 'resa-esperto'; nuoveConResa.push(chiave); }
    else if (dalApp) { testo = dalApp.testo; origine = 'resa-app'; note.testoDa = dalApp.da; }
    inserisciVariante({ chiave, domanda_chiave: famiglia, testo, testo_originale: q.q, testo_origine: origine, fonte: 'royal', versione_fonte: VERSIONE_ROYAL, localizzatore: `R${q.R}`, famiglia, note });
    q.risposte.forEach((r) => {
      const chiaveR = `${chiave}-${r.n}`;
      let testoR: string | null = null;
      let origineR: OrigineTesto = 'nessuna';
      if (resa) { testoR = resa.r[r.n - 1] ?? null; origineR = testoR !== null ? 'resa-esperto' : 'nessuna'; }
      else if (prestito.has(chiaveR)) { testoR = prestito.get(chiaveR)!.testo; origineR = 'resa-app'; }
      const disponibile = r.testo_disponibile !== false;
      if (!disponibile) testiNonDisponibili.push(chiaveR);
      risposte.push({
        chiave: chiaveR, variante_chiave: chiave, testo: testoR, testo_originale: r.t, testo_origine: origineR, testo_disponibile: disponibile ? 1 : 0, ordine: r.n,
        corrispondenze_json: '[]', // le corrispondenze dell'app si aggiungono sotto, quando le risposte dell'app esistono
      });
      UMORI_ORDINE_FONTE.forEach((umore, u) => {
        const cella = analizzaCella(r.c[u]!, r.multi_non_confermate?.includes(u) === true);
        const loc = coordinataExcel(q.R, r.n, u);
        if (cella.atomi.length === 0) {
          verdetti.push({ chiave: `${chiaveR}-${umore}-0`, risposta_chiave: chiaveR, umore, esito: null, incerto: 0, fonte: 'royal', versione_fonte: VERSIONE_ROYAL, localizzatore: loc, alternativa: 0, valore_grezzo: cella.grezzo, colore_grezzo: null, origine_indicata_fonte: null });
          return;
        }
        cella.atomi.forEach((atomo, alt) => {
          verdetti.push({
            chiave: `${chiaveR}-${umore}-${alt}`, risposta_chiave: chiaveR, umore, esito: atomo.esito, incerto: atomo.incerto ? 1 : 0, fonte: 'royal', versione_fonte: VERSIONE_ROYAL,
            localizzatore: loc, alternativa: alt, valore_grezzo: cella.grezzo, colore_grezzo: null, origine_indicata_fonte: cella.origine,
          });
        });
      });
    });
  }

  // ---- il file originale dell'app: 230 varianti, 691 risposte, 642 attestazioni ----
  const appSenzaCorrispondente: InfoModello['appSenzaCorrispondente'] = [];
  const abbinamentiDaRivedere: InfoModello['abbinamentiDaRivedere'] = [];
  appOriginale.forEach((q, a) => {
    const chiave = chiaveApp(a);
    const famiglia = famigliaDi.get(`A${a}`)!;
    const ab = abbinamentoDi.get(a)!;
    const note: NoteVariante = { abbinamentoRoyal: { variante: ab.r !== null ? chiaveRoyal(ab.r) : null, certezza: ab.certezza } };
    const nota = abbinamenti.note[String(a)];
    if (nota) note.nota = nota;
    if (COMPOSTE_APP.has(a)) note.composta = true;
    if (relazioniDi.has(chiave)) note.relazioni = relazioniDi.get(chiave);
    inserisciVariante({ chiave, domanda_chiave: famiglia, testo: q.domanda, testo_originale: q.domanda, testo_origine: 'resa-app', fonte: 'app-originale', versione_fonte: VERSIONE_APP, localizzatore: `A${a}`, famiglia, note });
    if (ab.certezza === 'bassa' || COMPOSTE_APP.has(a) || (nota && /da rivedere|non coincide/i.test(nota))) {
      abbinamentiDaRivedere.push({ domanda: chiave, certezza: ab.certezza, motivo: nota ?? (ab.certezza === 'bassa' ? 'abbinamento a bassa certezza' : 'domanda composta') });
    }
    q.risposte.forEach((r, i) => {
      const chiaveR = `${chiave}-${i + 1}`;
      const n = ab.ordine[i] ?? null;
      const corrispondenze: CorrispondenzaRisposta[] = [];
      if (ab.r !== null && n !== null) {
        const c: CorrispondenzaRisposta = { risposta: `${chiaveRoyal(ab.r)}-${n}`, certezza: ab.certezza, fonte: 'neg-mappa' };
        if (COMPOSTE_APP.has(a)) c.composita = true;
        corrispondenze.push(c);
      } else {
        appSenzaCorrispondente.push({ risposta: chiaveR, domanda: chiave, abbinata: ab.r !== null });
      }
      risposte.push({
        chiave: chiaveR, variante_chiave: chiave, testo: r.testo, testo_originale: r.testo, testo_origine: 'resa-app', testo_disponibile: TESTO_ASSENTE.has(r.testo.trim()) ? 0 : 1, ordine: i + 1,
        corrispondenze_json: JSON.stringify(corrispondenze),
      });
      r.verdetti.forEach((v, j) => {
        verdetti.push({
          chiave: `${chiaveR}-${v.tratto}-${j}`, risposta_chiave: chiaveR, umore: v.tratto, esito: v.esito, incerto: v.incerto ? 1 : 0, fonte: 'app-originale', versione_fonte: VERSIONE_APP,
          localizzatore: `A${a}/risposta/${i}/verdetto/${j}`, alternativa: 0, valore_grezzo: v.esito, colore_grezzo: null, origine_indicata_fonte: 'app',
        });
      });
    });
  });

  // ---- le corrispondenze inverse sulle risposte Royal (le stesse, lette dall'altra parte) ----
  const inverse = new Map<string, CorrispondenzaRisposta[]>();
  for (const r of risposte) {
    if (!r.chiave.startsWith('app-')) continue;
    for (const c of JSON.parse(r.corrispondenze_json) as CorrispondenzaRisposta[]) {
      const l = inverse.get(c.risposta) ?? [];
      l.push({ ...c, risposta: r.chiave });
      inverse.set(c.risposta, l);
    }
  }
  for (const r of risposte) if (r.chiave.startsWith('royal-')) r.corrispondenze_json = JSON.stringify(inverse.get(r.chiave) ?? []);

  // ---- i ritocchi di runtime ----
  const variantiAggiunte: string[] = [];
  for (const { indice, domanda } of variantiRuntime) {
    const chiave = `runtime-Q${indice}`;
    const famiglia = famigliaDi.get(`Q${indice}`)!;
    variantiAggiunte.push(chiave);
    inserisciVariante({ chiave, domanda_chiave: famiglia, testo: domanda.domanda, testo_originale: domanda.domanda, testo_origine: 'resa-app', fonte: 'runtime', versione_fonte: VERSIONE_RUNTIME, localizzatore: `runtime/${indice}`, famiglia, note: { nota: 'Dalla guida alla Battaglia dell\'istanza: diversa dalla normalizzazione 083/084 del file originale.' } });
    domanda.risposte.forEach((r, k) => {
      const chiaveR = `${chiave}-${k + 1}`;
      risposte.push({ chiave: chiaveR, variante_chiave: chiave, testo: r.testo, testo_originale: r.testo, testo_origine: 'resa-app', testo_disponibile: TESTO_ASSENTE.has(r.testo.trim()) ? 0 : 1, ordine: k + 1, corrispondenze_json: '[]' });
      r.verdetti.forEach((v, j) => {
        verdetti.push({
          chiave: `${chiaveR}-${v.tratto}-${j}`, risposta_chiave: chiaveR, umore: v.tratto, esito: v.esito, incerto: v.incerto ? 1 : 0, fonte: 'runtime', versione_fonte: VERSIONE_RUNTIME,
          localizzatore: `runtime/${indice}/risposta/${k}/verdetto/${j}`, alternativa: 0, valore_grezzo: v.esito, colore_grezzo: null, origine_indicata_fonte: 'runtime',
        });
      });
    });
  }

  const multi: Map<string, string[]> = new Map();
  for (const v of varianti) { const l = multi.get(v.domanda_chiave) ?? []; l.push(v.chiave); multi.set(v.domanda_chiave, l); }
  const famiglieMultiVariante = [...multi.entries()].filter(([, l]) => l.length > 1).map(([famiglia, l]) => ({ famiglia, varianti: l }));
  const attestazioniRuntime = (runtime ?? []).reduce((s, q) => s + q.risposte.reduce((t, r) => t + r.verdetti.length, 0), 0);

  return {
    domande, varianti, risposte, verdetti,
    info: {
      famiglieMultiVariante,
      nuoveConResa,
      relazioniVarianti,
      appSenzaCorrispondente,
      abbinamentiDaRivedere,
      runtime: {
        presente: runtime !== null, domande: runtime?.length ?? 0, risposte: (runtime ?? []).reduce((s, q) => s + q.risposte.length, 0), attestazioni: attestazioniRuntime,
        coincideConBaseline: runtime !== null && variantiRuntime.length === 0 && runtime.length === baseline.length, variantiAggiunte,
      },
      testiNonDisponibili,
    },
  };
}

// ---- Le carte degli umori ----

/** Una carta storica della guida (`dati_guida.battaglia.negoziazione.personalita`). */
export interface CartaStorica { nome: string; descrizione?: string; risposteEfficaci?: string[]; risposteDaEvitare?: string[] }

/**
 * Gli esempi di risposta delle carte, come la guida italiana li ha scritti (testo del gioco in italiano), con il riscontro sul dato Royal:
 * G-021 §4. Il riscontro si legge dalla cella Royal collegata, non è scritto a mano: «confermato» se la cella è buona, «smentito» se è passabile o cattiva,
 * «non verificabile» se Royal non ha l'esito (o la frase non è in Royal). Le frasi non si toccano: sono testo del gioco.
 */
const ESEMPI_CARTE: Record<UmoreNegoziazione, Array<{ testo: string; R: number | null; n?: number; nota?: string }>> = {
  giocosa: [{ testo: 'È per l\'automiglioramento', R: 247, n: 3 }, { testo: 'Devo togliermi le scarpe?', R: 236, n: 2 }],
  timida: [{ testo: 'In realtà sono un ragazzino', R: 20, n: 3 }, { testo: 'Non ce n\'è bisogno', R: 243, n: 1, nota: 'abbinamento probabile' }],
  irritabile: [{ testo: 'Perché? Non è così?', R: null }, { testo: 'Senza impegno?', R: 101, n: 2 }],
  cupa: [{ testo: 'Non ho preoccupazioni', R: 52, n: 3 }, { testo: 'Non è priva di significato', R: 15, n: 1 }],
};
/** Le sostituzioni proposte da G-021 §4 (rese dell'Esperto, non testo del gioco). */
const PROPOSTE_CARTE: Partial<Record<UmoreNegoziazione, Array<{ testo: string; R: number; n: number }>>> = {
  timida: [{ testo: 'Voglio restare bambino per sempre.', R: 34, n: 1 }],
  irritabile: [{ testo: 'Cerchi scuse?', R: 3, n: 2 }],
};

interface EsempioCarta {
  testo: string;
  origine: string;
  riscontro: 'confermato' | 'smentito' | 'non-verificabile';
  royal: { variante: string; risposta: string; esito: EsitoNegoziazione | null; nonConfermata: boolean } | null;
  nota?: string;
}

export interface RigaNegUmore { umore: UmoreNegoziazione; nome: string; descrizione: string; esempi_json: string; da_evitare_json: string; fonte: string; versione_fonte: string }

export function costruisciUmori(carte: ReadonlyArray<CartaStorica>, umori: ReadonlyArray<{ chiave: UmoreNegoziazione; nome: string }>, verdetti: ReadonlyArray<RigaNegVerdetto>): RigaNegUmore[] {
  const cella = (R: number, n: number, umore: UmoreNegoziazione): { esito: EsitoNegoziazione | null; nonConfermata: boolean } => {
    const v = verdetti.filter((x) => x.risposta_chiave === `${chiaveRoyal(R)}-${n}` && x.umore === umore && x.esito !== null);
    return { esito: v.length === 1 ? v[0]!.esito : null, nonConfermata: v.some((x) => x.origine_indicata_fonte === 'ereditata-da-P5-non-confermata') };
  };
  return umori.map((u) => {
    const carta = carte.find((c) => c.nome.trim().toLowerCase() === u.chiave);
    const efficaci = carta?.risposteEfficaci ?? [];
    const esempi: EsempioCarta[] = ESEMPI_CARTE[u.chiave].map((e) => {
      const c = e.R !== null && e.n !== undefined ? cella(e.R, e.n, u.chiave) : { esito: null, nonConfermata: false };
      const riscontro = c.esito === 'buona' ? 'confermato' : c.esito === null ? 'non-verificabile' : 'smentito';
      return { testo: e.testo, origine: 'guida-italiana', riscontro, royal: e.R !== null && e.n !== undefined ? { variante: chiaveRoyal(e.R), risposta: `${chiaveRoyal(e.R)}-${e.n}`, esito: c.esito, nonConfermata: c.nonConfermata } : null, ...(e.nota ? { nota: e.nota } : {}) };
    });
    // Gli esempi della carta storica che non sono fra quelli noti restano, senza riscontro.
    for (const t of efficaci) if (!esempi.some((e) => e.testo === t)) esempi.push({ testo: t, origine: 'guida-italiana', riscontro: 'non-verificabile', royal: null });
    const proposte = (PROPOSTE_CARTE[u.chiave] ?? []).map((p) => ({ testo: p.testo, origine: 'resa-esperto', royal: { variante: chiaveRoyal(p.R), risposta: `${chiaveRoyal(p.R)}-${p.n}`, esito: cella(p.R, p.n, u.chiave).esito } }));
    return {
      umore: u.chiave, nome: u.nome, descrizione: carta?.descrizione ?? '',
      esempi_json: JSON.stringify({ esempi, proposte }), da_evitare_json: JSON.stringify(carta?.risposteDaEvitare ?? []),
      fonte: 'guida italiana allgamestaff; riscontro su Royal (G-021 §4)', versione_fonte: 'carta-storica',
    };
  });
}
