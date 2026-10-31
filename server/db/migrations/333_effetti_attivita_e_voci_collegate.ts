// ============================================================
// Migrazione 333 — attività: le Doti dichiarate solo in prosa diventano esiti scelti alla spunta; voci del Diario collegate alle loro
// attività (le voci lasciate dalla 312 che ora hanno un'attività con gli effetti strutturati)
// ============================================================
//
// Richiesta dell'utente: completare ciò che era dichiarato e non fatto, «integrato senza ulteriori passaggi» (voci di piano R9-10/2 «Effetti
// strutturati delle attività» e R12-01/7 «Le attività che danno Doti generano il promemoria»). Decisione dell'utente per biliardo e Gun About:
// la Dote si SCEGLIE ALLA SPUNTA; senza note documentate la scelta comprende anche la quantità.
//
// Censimento sulla copia dei dati portata alla 327 (34 attività): 22 con Doti strutturate (effetti o esiti), 4 con Doti in prosa
// (`doti_json`): biliardo e sala giochi Gun About (Dote senza nome), esperimenti clinici di Takemi (Coraggio, quantità ignota), Triple Seven
// (la prosa ripete gli effetti). Che cosa fa:
//   (1) attività, solo se ancora come lette e mai corrette dall'utente (`origine = 'seed'`, `seed_json IS NULL`):
//       - biliardo e Gun About: `esiti_json` nel modo «scelta» con un esito per Dote e note (Conoscenza, Fascino, Coraggio, Perizia; mai la
//         Gentilezza) × ♪/♪♪/♪♪♪: alla spunta si sceglie la Dote ottenuta e quante note, o «Senza punti». La prosa in `doti_json` esce, il
//         paragrafo «Note sulle Doti» dice la regola. Fonte: https://www.allgamestaff.it/persona-5-royal/biliardo/ («ogni partita aumenta
//         casualmente una statistica sociale, tranne la Gentilezza», senza quantità); per Gun About nessuna pagina della guida dà Dote o note:
//         vale la stessa scelta, per decisione dell'utente;
//       - freccette: le note variano da 1 a 3 (https://www.allgamestaff.it/persona-5-royal/freccette/: «1 nota a sessione; le sfide speciali
//         fino a 2 in più, al massimo 3»): la Perizia ♪ fissa di `effetti_json` diventa tre esiti scelti alla spunta;
//       - studio al Diner: il Frui-te, che il Diario della guida dà come «Fascino +1, Conoscenza +2» (voce del 07-06; lo stesso valore in
//         https://samurai-gamers.com/persona-5/charm-guide/), diventa un esito, senza condizioni sul meteo: nessuna fonte dice che cosa dà con la
//         pioggia, quindi nessun esito «con la pioggia» (non si ricava per analogia); Caffè bollente e Sandwich a sorpresa restano in parole
//         (nessuna fonte dà le note);
//       - esperimenti di Takemi: il Coraggio ♪ è già nel Confidente (`confidente_dote_incontro`, ranghi 1-8, come la guida di Takemi): la prosa
//         esce, un dato ha un solo punto di modifica. Il Triple Seven non si tocca: è stato corretto dall'utente (`origine = 'utente'`);
//   (2) voci del Diario, con la scrittura di `convertiVoce` (effetti attesi uno per uno, registro di transizione e delle operazioni) e solo se
//       sono ancora come lette (giorno, testo, note, tipo, collegamento, effetti) e mai modificate dall'utente; mai una voce citata da una
//       partita, salvo il solo collegamento della voce del 05-03 (sotto). `updated_at` della voce non cambia (il periodo validato si riconosce
//       da lì):
//       - 07-12 «Biliardo… per Fascino +2»: la Dote fissa esce e il turno porta l'esito «Fascino ♪♪» (proposto alla spunta, non raddoppiato);
//       - 07-06 «Studiare al Diner con un Frui-te»: la Dote fissa esce e il turno porta l'esito «Studio con il Frui-te»;
//       - 06-05 «Freccette e biliardo»: collegata alle freccette, con il turno delle freccette e quello del biliardo (la guida li dice tutti e due);
//       - 12-01 e 12-03 «In alternativa: Jazz Club…»: collegate al Jazz Club (un solo elemento; il Jazz Club non conta turni);
//       - 01-26, 01-27, 01-30 «Massaggio da Kawakami, poi allenamento libero in palestra»: collegate alla palestra, di cui hanno già il turno;
//       - 05-03 «Studia sul tavolino del Leblanc» (spuntata nella partita): il collegamento passa dalla Dote Conoscenza all'attività dello studio
//         al Leblanc, di cui ha il turno; testo, effetti e spunte restano come sono;
//       le proposte «riferimento mancante» che il collegamento supera si chiudono come superate (solo se ancora uguali a quelle lette).
//       Delle 38 voci lasciate dalla 312 se ne collegano 7 (06-05, 12-01, 12-03, 01-26, 01-27, 01-30, 05-03), 4 erano già collegate e 27
//       restano senza collegamento, con il motivo nell'audit; le voci del 07-12 e del 07-06 non sono fra le 38 (erano già collegate);
//   (3) audit in `dati_guida.audit-333-attivita-e-voci`: attività e voci scritte, saltate col motivo, e le voci della 312 lasciate con il motivo.
// Le partite non si scrivono mai: lo schema `utente` deve risultare identico (impronta di ogni riga), o la migrazione si annulla. Idempotente:
// la seconda volta ogni attività e ogni voce è «già applicata» e l'audit non si riscrive.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { canonico, chiudiProposta, convertiVoce, tabellePartiteConVoce, type Esito } from './fbisOndata5.js';
import { normalizzaEffettoVoce, type EffettoVoce } from '../../../shared/effettiVoce.js';
import { normalizzaEsitiAttivita, type EsitiAttivita, type EsitoAttivita } from '../../../shared/esitiAttivita.js';
import type { DoteChiave } from '../../../shared/doti.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-333-attivita-e-voci';
const LOTTO = 'attivita-333';
const errore = (motivo: string): never => { throw new Error(`333: ${motivo}; nessuna modifica applicata.`); };

// ---------- (1) attività ----------

/** Le Doti che biliardo e Gun About possono dare (la guida: «tranne la Gentilezza»), nell'ordine della guida. */
const DOTI_A_CASO: ReadonlyArray<{ dote: DoteChiave; nome: string }> = [
  { dote: 'conoscenza', nome: 'Conoscenza' }, { dote: 'fascino', nome: 'Fascino' }, { dote: 'coraggio', nome: 'Coraggio' }, { dote: 'perizia', nome: 'Perizia' },
];
const NOME_NOTE = { 1: '1 nota', 2: '2 note', 3: '3 note' } as const;
/** Un esito per Dote e note, raggruppati per Dote: alla spunta si tocca «Fascino · 2 note», o «Senza punti». */
const ESITI_DOTE_A_SCELTA: EsitiAttivita = {
  modo: 'scelta',
  esiti: DOTI_A_CASO.flatMap(({ dote, nome }) => ([1, 2, 3] as const).map((note): EsitoAttivita => ({
    chiave: `${dote}-${note}`, nome: `${nome} · ${NOME_NOTE[note]}`, gruppo: nome, articolo: null, condizioni: [], doti: [{ dote, note }], premi: null,
  }))),
};
const ESITI_FRECCETTE: EsitiAttivita = {
  modo: 'scelta',
  esiti: [
    { chiave: 'perizia-1', nome: '1 nota', gruppo: null, articolo: null, condizioni: [], doti: [{ dote: 'perizia', note: 1 }], premi: null },
    { chiave: 'perizia-2', nome: '2 note (con le sfide speciali)', gruppo: null, articolo: null, condizioni: [], doti: [{ dote: 'perizia', note: 2 }], premi: null },
    { chiave: 'perizia-3', nome: '3 note (con le sfide speciali, il massimo)', gruppo: null, articolo: null, condizioni: [], doti: [{ dote: 'perizia', note: 3 }], premi: null },
  ],
};
/** Il Frui-te come lo dà la fonte (voce del Diario del 07-06: «Fascino +1, Conoscenza +2»; samurai-gamers.com/persona-5/charm-guide/: +1 Fascino,
 *  +2 Conoscenza), senza condizioni sul meteo: nessuna fonte dice che cosa dà con la pioggia, e la combinazione non si ricava per analogia. */
const ESITI_FRUI_TE: EsitoAttivita[] = [
  { chiave: 'frui-te', nome: 'Studio con il Frui-te', gruppo: null, articolo: null, condizioni: [], doti: [{ dote: 'conoscenza', note: 2 }, { dote: 'fascino', note: 1 }], premi: null },
];

/** Gli esiti del Diner come letti sulla copia (studio e Bistecca nostalgica, con e senza pioggia): i nuovi si aggiungono dopo. */
const ESITI_DINER_LETTI = '{"modo":"scelta","esiti":[{"chiave":"studio","nome":"Studio","gruppo":null,"articolo":null,"condizioni":[{"tipo":"meteo","condizione":"non-piove"}],"doti":[{"dote":"conoscenza","note":2}],"premi":null},{"chiave":"studio-pioggia","nome":"Studio con la pioggia","gruppo":null,"articolo":null,"condizioni":[{"tipo":"piove"}],"doti":[{"dote":"conoscenza","note":3}],"premi":null},{"chiave":"bistecca","nome":"Studio con la Bistecca nostalgica","gruppo":null,"articolo":"diner-shibuya/bistecca-nostalgica","condizioni":[{"tipo":"meteo","condizione":"non-piove"}],"doti":[{"dote":"conoscenza","note":2},{"dote":"gentilezza","note":1}],"premi":null},{"chiave":"bistecca-pioggia","nome":"Studio con la Bistecca nostalgica e la pioggia","gruppo":null,"articolo":"diner-shibuya/bistecca-nostalgica","condizioni":[{"tipo":"piove"}],"doti":[{"dote":"conoscenza","note":3},{"dote":"gentilezza","note":1}],"premi":null}]}';
const esitiDinerDopo = (): EsitiAttivita => {
  const letti = normalizzaEsitiAttivita(JSON.parse(ESITI_DINER_LETTI));
  if (!letti) return errore('gli esiti del Diner letti non sono validi');
  return { modo: letti.modo, esiti: [...letti.esiti, ...ESITI_FRUI_TE] };
};

interface AttivitaDati {
  chiave: string;
  /** I valori letti sulla copia: l'attività si scrive solo se è ancora così. `paragrafo`: il paragrafo dei dettagli che cambia (null = nessuno). */
  prima: { doti: string; effetti: string | null; esiti: string | null; paragrafo: string | null };
  dopo: { doti: string; effetti: string | null; esiti: () => EsitiAttivita | null; paragrafo: string | null };
  motivo: string;
}
const ATTIVITA: AttivitaDati[] = [
  {
    chiave: 'biliardo',
    prima: { doti: '[{"dote":null,"note":null,"condizione":"Ogni partita garantisce un incremento CASUALE di una dote tra Conoscenza, Fascino, Coraggio e Perizia (esclusa la Gentilezza); la fonte non specifica il numero di note per vittoria"}]', effetti: '[]', esiti: null,
      paragrafo: 'Note sulle Doti: Ogni partita garantisce un incremento CASUALE di una dote tra Conoscenza, Fascino, Coraggio e Perizia (esclusa la Gentilezza); la fonte non specifica il numero di note per vittoria' },
    dopo: { doti: '[]', effetti: '[]', esiti: () => ESITI_DOTE_A_SCELTA,
      paragrafo: 'Note sulle Doti: ogni partita aumenta a caso una Dote fra Conoscenza, Fascino, Coraggio e Perizia (mai la Gentilezza) e la guida non dice di quante note: alla spunta si scelgono la Dote e le note ottenute.' },
    motivo: 'Dote a caso esclusa la Gentilezza, note non documentate: Dote e note si scelgono alla spunta (decisione dell’utente)',
  },
  {
    chiave: 'sala-giochi-gun-about-akihabara',
    prima: { doti: '[{"dote":null,"note":null,"condizione":"Non è stato possibile confermare se Gun About assegni punti diretti a una dote sociale al di fuori delle scene del Confidente Shinya; le fonti consultate lo trattano solo come sfondo narrativo del Confidente Torre"}]', effetti: '[]', esiti: null,
      paragrafo: 'Note sulle Doti: Non è stato possibile confermare se Gun About assegni punti diretti a una dote sociale al di fuori delle scene del Confidente Shinya; le fonti consultate lo trattano solo come sfondo narrativo del Confidente Torre' },
    dopo: { doti: '[]', effetti: '[]', esiti: () => ESITI_DOTE_A_SCELTA,
      paragrafo: 'Note sulle Doti: nessuna pagina della guida dice quale Dote dia una partita né di quante note: come per il biliardo, alla spunta si scelgono la Dote ottenuta (mai la Gentilezza) e le note, oppure «Senza punti».' },
    motivo: 'Dote non documentata: come per il biliardo, Dote e note si scelgono alla spunta (decisione dell’utente)',
  },
  {
    chiave: 'freccette',
    prima: { doti: '[]', effetti: '[{"effetto":{"famiglia":"dote","dote":"perizia","note":1}}]', esiti: null, paragrafo: null },
    dopo: { doti: '[]', effetti: '[]', esiti: () => ESITI_FRECCETTE, paragrafo: null },
    motivo: 'la guida dà da 1 a 3 note di Perizia a sessione (le sfide speciali fino a 2 in più): le note si scelgono alla spunta',
  },
  {
    chiave: 'studio-diner-shibuya',
    prima: { doti: '[]', effetti: '[]', esiti: ESITI_DINER_LETTI,
      paragrafo: 'Altri effetti: Ordinando piatti specifici si guadagnano punti anche in altre doti: \'Bistecca nostalgica\' -> Gentilezza; \'Caffè bollente\' -> Coraggio; \'Frui-te\' -> Fascino; \'Sandwich a sorpresa\' -> Coraggio (lentamente).' },
    dopo: { doti: '[]', effetti: '[]', esiti: esitiDinerDopo,
      paragrafo: 'Altri effetti: anche il Caffè bollente e il Sandwich a sorpresa danno Coraggio (il Sandwich lentamente), ma nessuna fonte dice quante note.' },
    motivo: 'il Frui-te dà Fascino ♪ (Diario della guida, 07-06: «Fascino +1, Conoscenza +2»): un esito come la Bistecca nostalgica',
  },
  {
    chiave: 'esperimenti-clinici-takemi',
    prima: { doti: '[{"dote":"coraggio","note":null,"condizione":"Partecipare ai test aumenta il Coraggio e il rango del Confidente; quantità non specificata dalla fonte"}]', effetti: null, esiti: null, paragrafo: null },
    dopo: { doti: '[]', effetti: null, esiti: () => null, paragrafo: null },
    motivo: 'il Coraggio ♪ dei test è quello dei passaggi di rango di Takemi (ranghi 1-8), già nel Confidente: la prosa esce',
  },
];

interface RigaAttivita { doti_json: string; effetti_json: string | null; esiti_json: string | null; dettagli: string | null; origine: string; seed_json: string | null }
interface EsitoScrittura { chiave: string; esito: string; motivo?: string; prima?: unknown; dopo?: unknown }

/** I dettagli con il paragrafo `prima` sostituito da `dopo` (paragrafi separati da una riga vuota); undefined se `prima` non c'è una volta sola. */
function dettagliCon(dettagli: string | null, prima: string | null, dopo: string | null): string | null | undefined {
  if (prima === null || dopo === null) return dettagli;
  const paragrafi = dettagli?.split('\n\n') ?? [];
  if (paragrafi.filter((p) => p === prima).length !== 1) return undefined;
  return paragrafi.map((p) => (p === prima ? dopo : p)).join('\n\n');
}
/** Due `esiti_json` dicono la stessa cosa (null = nessun esito). */
function stessiEsiti(json: string | null, atteso: string | null): boolean {
  if (json === null || atteso === null) return json === atteso;
  try { return canonico(JSON.parse(json)) === canonico(JSON.parse(atteso)); } catch { return false; }
}

function scriviAttivita(db: AppDatabase, a: AttivitaDati): EsitoScrittura {
  const nuovi = a.dopo.esiti();
  if (nuovi !== null) {
    const valido = normalizzaEsitiAttivita(JSON.parse(canonico(nuovi)));
    if (!valido || canonico(valido) !== canonico(nuovi)) errore(`gli esiti nuovi di ${a.chiave} non sono nella forma dell'app`);
  }
  const esitiDopo = nuovi === null ? null : JSON.stringify(nuovi);
  const r = db.prepare('SELECT doti_json, effetti_json, esiti_json, dettagli, origine, seed_json FROM main.attivita WHERE chiave = ?').get(a.chiave) as RigaAttivita | undefined;
  if (!r) return { chiave: a.chiave, esito: 'attività assente: niente da fare' };
  const paragrafiOra = r.dettagli?.split('\n\n') ?? [];
  if (r.doti_json === a.dopo.doti && r.effetti_json === a.dopo.effetti && stessiEsiti(r.esiti_json, esitiDopo)
    && (a.dopo.paragrafo === null || paragrafiOra.includes(a.dopo.paragrafo))) return { chiave: a.chiave, esito: 'già applicata' };
  if (r.origine !== 'seed' || r.seed_json !== null) return { chiave: a.chiave, esito: 'saltata: attività corretta dall’utente' };
  if (r.doti_json !== a.prima.doti) return { chiave: a.chiave, esito: 'saltata: Doti in prosa diverse da quelle lette' };
  if (r.effetti_json !== a.prima.effetti) return { chiave: a.chiave, esito: 'saltata: effetti diversi da quelli letti' };
  if (!stessiEsiti(r.esiti_json, a.prima.esiti)) return { chiave: a.chiave, esito: 'saltata: esiti diversi da quelli letti' };
  const dettagli = dettagliCon(r.dettagli, a.prima.paragrafo, a.dopo.paragrafo);
  if (dettagli === undefined) return { chiave: a.chiave, esito: 'saltata: il paragrafo dei dettagli non è quello letto' };
  if (db.prepare(`UPDATE main.attivita SET doti_json = ?, effetti_json = ?, esiti_json = ?, dettagli = ?
    WHERE chiave = ? AND doti_json = ? AND effetti_json IS ? AND esiti_json IS ? AND dettagli IS ? AND origine = 'seed' AND seed_json IS NULL`)
    .run(a.dopo.doti, a.dopo.effetti, esitiDopo, dettagli, a.chiave, r.doti_json, r.effetti_json, r.esiti_json, r.dettagli).changes !== 1) errore(`l'attività ${a.chiave} non è stata scritta`);
  return { chiave: a.chiave, esito: 'scritta', motivo: a.motivo,
    prima: { doti_json: r.doti_json, effetti_json: r.effetti_json, esiti_json: r.esiti_json, dettagli: r.dettagli },
    dopo: { doti_json: a.dopo.doti, effetti_json: a.dopo.effetti, esiti_json: esitiDopo, dettagli } };
}

// ---------- (2) voci del Diario ----------

interface Rif { tipo: string; chiave: string }
interface VoceDati {
  uid: string; data: string;
  prima: { azione: string; note: string | null; tipo: string; riferimento: Rif | null; effetti: EffettoVoce[] };
  dopo: { tipo: string; riferimento: Rif };
  /** Gli indici degli effetti di `prima` che escono, e quelli nuovi (in coda). */
  togli: number[]; aggiungi: EffettoVoce[];
  /** Le proposte «da completare» che il collegamento supera (`effetti` com'erano lette). */
  chiudi: Array<{ id: string; effetti: string }>;
  /** Cambia solo il collegamento, anche se una partita cita la voce (testo, effetti e spunte restano come sono). */
  soloCollegamento?: true;
  motivo: string;
}
const turno = (attivita: string, esito?: string): EffettoVoce => (esito ? { tipo: 'turno', attivita, esito } : { tipo: 'turno', attivita });
const dote = (d: DoteChiave, note: 1 | 2 | 3): EffettoVoce => ({ tipo: 'dote', dote: d, note } as EffettoVoce);
const PALESTRA = 'allenamento-palestra-protein-lovers';
const MASSAGGIO = 'Massaggio da Kawakami, poi allenamento libero in palestra';
const VOCI: VoceDati[] = [
  { uid: '90d97b0613581f6e79bc5ec5bb69cb3c', data: '07-12',
    prima: { azione: 'Biliardo a Kichijoji, minigioco Penguin Sniper (800 yen) per Fascino +2', note: 'Primo trofeo di bronzo', tipo: 'attivita', riferimento: { tipo: 'attivita', chiave: 'biliardo' },
      effetti: [dote('fascino', 2), turno('biliardo')] },
    dopo: { tipo: 'attivita', riferimento: { tipo: 'attivita', chiave: 'biliardo' } }, togli: [0, 1], aggiungi: [turno('biliardo', 'fascino-2')], chiudi: [],
    motivo: 'la Dote del biliardo si sceglie alla spunta: il Fascino ♪♪ della guida diventa l’esito proposto del turno (non raddoppiato dalla Dote fissa)' },
  { uid: '4e2b4e55c07ed7d170a158d963393c82', data: '07-06',
    prima: { azione: 'Studiare al Diner con un Frui-te', note: 'Fascino +1, Conoscenza +2', tipo: 'attivita', riferimento: { tipo: 'attivita', chiave: 'studio-diner-shibuya' },
      effetti: [dote('fascino', 1), turno('studio-diner-shibuya', 'studio')] },
    dopo: { tipo: 'attivita', riferimento: { tipo: 'attivita', chiave: 'studio-diner-shibuya' } }, togli: [0, 1], aggiungi: [turno('studio-diner-shibuya', 'frui-te')],
    chiudi: [{ id: 'L13-4b-4e2b4e55-01-a-riferimento-mancante', effetti: '[]' }],
    motivo: 'il Frui-te è un esito dello studio al Diner (Fascino ♪ e Conoscenza ♪♪): il turno lo porta, la Dote fissa esce' },
  { uid: '010c2a0fb7b8ae58b6ac05bbb7ed4e64', data: '06-05',
    prima: { azione: 'Freccette e biliardo a Kichijoji: acquisizione di Staffetta rango 2', note: null, tipo: 'attivita', riferimento: null, effetti: [] },
    dopo: { tipo: 'attivita', riferimento: { tipo: 'attivita', chiave: 'freccette' } }, togli: [], aggiungi: [turno('freccette'), turno('biliardo')],
    chiudi: [{ id: 'L13-4b-010c2a0f-01-a-riferimento-mancante', effetti: '[]' }],
    motivo: 'la guida dice freccette (lo scopo: la Staffetta) e biliardo nella stessa voce: collegata alle freccette, con il turno di ciascuna' },
  { uid: 'c5c33a6f705a88398c9fbfbead352691', data: '12-01',
    prima: { azione: 'In alternativa: Jazz Club con Magibolle (+1 a tutte le statistiche)', note: null, tipo: 'attivita', riferimento: null, effetti: [] },
    dopo: { tipo: 'attivita', riferimento: { tipo: 'attivita', chiave: 'jazz-club-kichijoji' } }, togli: [], aggiungi: [],
    chiudi: [{ id: 'L13-4b-c5c33a6f-01-a-riferimento-mancante', effetti: '[]' }],
    motivo: 'la voce è l’alternativa di un’altra e nomina un solo elemento, il Jazz Club (che non conta turni)' },
  { uid: '660197950000dd1289c3f91eefec73e6', data: '12-03',
    prima: { azione: 'In alternativa: Jazz Club con Onni-bolle', note: null, tipo: 'attivita', riferimento: null, effetti: [] },
    dopo: { tipo: 'attivita', riferimento: { tipo: 'attivita', chiave: 'jazz-club-kichijoji' } }, togli: [], aggiungi: [],
    chiudi: [{ id: 'L13-4b-66019795-01-a-riferimento-mancante', effetti: '[]' }],
    motivo: 'la voce è l’alternativa di un’altra e nomina un solo elemento, il Jazz Club (che non conta turni)' },
  ...([['13cc185cdca5d4cf4cd854225da1e263', '01-26'], ['675beb30fbe7551abf7c1dfc092410b2', '01-27'], ['cda3fef63d0da9f5df9f24782eaf293f', '01-30']] as const).map(([uid, data]): VoceDati => ({
    uid, data, prima: { azione: MASSAGGIO, note: null, tipo: 'dote', riferimento: null, effetti: [turno(PALESTRA)] },
    dopo: { tipo: 'attivita', riferimento: { tipo: 'attivita', chiave: PALESTRA } }, togli: [], aggiungi: [], chiudi: [],
    motivo: 'il massaggio di Kawakami non è un’attività; l’elemento della voce con il suo turno è la palestra',
  })),
  { uid: '865c3aa8b9e10f1f08b60174b51a52bb', data: '05-03',
    prima: { azione: 'Studia sul tavolino del Leblanc', note: null, tipo: 'dote', riferimento: { tipo: 'dote', chiave: 'conoscenza' }, effetti: [turno('studio-leblanc')] },
    dopo: { tipo: 'dote', riferimento: { tipo: 'attivita', chiave: 'studio-leblanc' } }, togli: [], aggiungi: [], chiudi: [], soloCollegamento: true,
    motivo: 'la voce ha il turno dello studio al Leblanc: il collegamento passa dalla Dote all’attività (come la voce del 04-22); spunte ed effetti restano' },
];

/** Le due voci riscritte che NON sono fra le 38 lasciate dalla 312 (erano già collegate: cambiano il turno e la Dote fissa). */
const VOCE_0712 = '90d97b0613581f6e79bc5ec5bb69cb3c';
const VOCE_0706 = '4e2b4e55c07ed7d170a158d963393c82';
/** Le 27 voci lasciate dalla 312 che restano senza collegamento, con il perché (per l'audit); le 7 collegate qui sopra e le 4 già collegate
 *  (`GIA_COLLEGATE`) non ci sono: 7 + 4 + 27 = 38. */
const LASCIATE: Array<{ uid: string; motivo: string }> = [
  ...['89945ce3', '3a904494', '4b9004ca', 'fa5715cd', 'ff6244fb', '649f05c5', '8b7a4204'].map((uid) => ({ uid, motivo: 'gru «L’artiglio» della sala giochi di Akihabara: nessuna attività la modella e non dà Doti (la guida di Shinya dice solo 300 ¥ e la bambola Burger-kun; le bambole non sono nel catalogo)' })),
  ...['f1090d7d', 'acc53b98', '0ae5dbd4', '17be4e9b', '658d1ba1', '1d925111', 'c43450b5'].map((uid) => ({ uid, motivo: 'due attività in alternativa nella stessa voce («X o Y»): il collegamento a una sola sarebbe forzato e il turno sbaglierebbe yen e Doti se si è fatta l’altra' })),
  { uid: 'c4bd6486', motivo: 'banchetto (raccolta del cibo): nessuna attività lo modella' },
  { uid: '464fa2de', motivo: 'indagine nei Vicoli: è una Richiesta, non un’attività (e la voce è stata modificata dall’utente)' },
  { uid: '76f36ddb', motivo: 'esplorazione dei negozi di Akihabara: più negozi, nessuna attività' },
  { uid: '2f46171a', motivo: 'scambio di Sakai (negozio, non attività): la voce dice 2 Ofuda, guida e articolo uno per uno' },
  { uid: '64b80866', motivo: 'scambio di Sakai (negozio, non attività): la voce dice 3 Ofuda, guida e articolo uno per uno' },
  { uid: 'aff05c4e', motivo: 'Power Intuition 1/3 del 12/12 dopo quello del 9/12: da verificare in partita (nessuna modifica)' },
  { uid: '73ddcb9b', motivo: 'consegna delle Tessere al Super Baron: un negozio con più articoli, non un’attività' },
  ...['e75d7478', 'b51b7e49', 'c78e5d98', '766971a1', '30ceb0e3'].map((uid) => ({ uid, motivo: '«Cammino del Santo Graal»: un percorso dei Memento, non un’attività' })),
  { uid: '04d94d62', motivo: '«Il Mondo» della Stanza di Velluto: un Arcano, non un’attività' },
];
/** Le voci lasciate dalla 312 che erano già collegate prima di questa migrazione (da migrazioni successive alla 312 o dall'origine). */
const GIA_COLLEGATE: Array<{ uid: string; motivo: string }> = [
  { uid: '2890a52c', motivo: 'nuova Richiesta dei Memento: già collegata alla sua Richiesta' },
  { uid: 'b8efc7f0', motivo: 'già collegata allo studio al Leblanc, con il suo turno' },
  { uid: '0d1f1318', motivo: 'già collegata al Triple Seven, con il suo turno' },
  { uid: '0a231982', motivo: 'già collegata a Star Forneus; le tessere dei videogiochi non sono dati del videogioco' },
];

interface RigaVoce { data: string; genere: string; azione: string; note: string | null; tipo: string; riferimento_tipo: string | null; riferimento_chiave: string | null;
  riferimento_testo: string | null; aggiunta_da: string | null; testo_precedente_json: string | null; da_rivedere: number; updated_at: string }
const rigaVoce = (db: AppDatabase, uid: string): RigaVoce | undefined => db.prepare(`SELECT data, genere, azione, note, tipo, riferimento_tipo, riferimento_chiave, riferimento_testo,
  aggiunta_da, testo_precedente_json, da_rivedere, updated_at FROM main.voce_giornata WHERE uid = ?`).get(uid) as RigaVoce | undefined;
const rifDi = (v: RigaVoce): Rif | null => (v.riferimento_tipo && v.riferimento_chiave ? { tipo: v.riferimento_tipo, chiave: v.riferimento_chiave } : null);
const effettiDi = (db: AppDatabase, uid: string): Array<EffettoVoce | null> =>
  (db.prepare('SELECT dati_json FROM main.voce_effetto WHERE voce_uid = ? ORDER BY ordine').pluck().all(uid) as string[]).map((j) => { try { return normalizzaEffettoVoce(JSON.parse(j)); } catch { return null; } });
const stessiEffetti = (a: ReadonlyArray<EffettoVoce | null>, b: readonly EffettoVoce[]): boolean => a.length === b.length && a.every((e, i) => e !== null && canonico(e) === canonico(b[i]));

/** Perché la voce risulta modificata dall'utente (null = mai): aggiunta da lui, testo corretto, segnata da rivedere, copiata o spostata, o con
 *  effetti salvati da lui (un'operazione sugli effetti che non porta il lotto o il numero di una migrazione e non è una proposta applicata). */
function modificataDallUtente(db: AppDatabase, uid: string, v: RigaVoce): string | null {
  if (v.aggiunta_da !== null) return 'aggiunta dall’utente';
  if (v.testo_precedente_json !== null || v.da_rivedere !== 0) return 'testo corretto o segnata da rivedere';
  if (esisteTabella(db, 'operazione_voci_diario')
    && db.prepare("SELECT 1 FROM main.operazione_voci_diario WHERE instr(richiesta_json, ?) > 0 OR instr(COALESCE(esito_json, ''), ?) > 0 LIMIT 1").get(uid, uid)) return 'copiata, spostata o incollata dall’utente';
  if (esisteTabella(db, 'operazione_effetti_voce')) {
    const applicate = esisteTabella(db, 'proposta_conversione_voce')
      ? (db.prepare("SELECT esito_json FROM main.proposta_conversione_voce WHERE voce_uid = ? AND stato = 'applicata'").pluck().all(uid) as Array<string | null>).flatMap((j) => {
        try { const e = JSON.parse(j ?? 'null') as { dati?: { effettiVoce?: unknown } } | null; return e?.dati?.effettiVoce !== undefined ? [canonico(e.dati.effettiVoce)] : []; } catch { return []; }
      })
      : [];
    for (const p of db.prepare('SELECT payload_json FROM main.operazione_effetti_voce WHERE voce_uid = ?').pluck().all(uid) as string[]) {
      let payload: unknown;
      try { payload = JSON.parse(p); } catch { return 'operazione sugli effetti illeggibile'; }
      const firma = payload && typeof payload === 'object' ? payload as { lotto?: unknown; migrazione?: unknown } : {};
      if (typeof firma.lotto === 'string' || typeof firma.migrazione === 'string' || typeof firma.migrazione === 'number') continue;
      if (!applicate.includes(canonico(payload))) return 'effetti salvati dall’utente';
    }
  }
  return null;
}

/** L'attività del collegamento c'è ed è visibile; per un turno nuovo, l'attività conta i turni e, se il turno dice un esito, lo dichiara. */
function problemaCollegamento(db: AppDatabase, x: VoceDati): string | null {
  const r = db.prepare('SELECT nascosto FROM main.attivita WHERE chiave = ?').get(x.dopo.riferimento.chiave) as { nascosto: number } | undefined;
  if (x.dopo.riferimento.tipo !== 'attivita' || !r || r.nascosto !== 0) return `l'attività ${x.dopo.riferimento.chiave} non c'è o è nascosta`;
  for (const e of x.aggiungi) {
    if (e.tipo !== 'turno') return `effetto nuovo di tipo ${e.tipo} non previsto`;
    const a = db.prepare('SELECT tracciamento, nascosto, esiti_json FROM main.attivita WHERE chiave = ?').get(e.attivita) as { tracciamento: string; nascosto: number; esiti_json: string | null } | undefined;
    if (!a || a.nascosto !== 0 || a.tracciamento !== 'svolta') return `l'attività ${e.attivita} non conta i turni`;
    if (e.esito) {
      let esiti: EsitiAttivita | null;
      try { esiti = normalizzaEsitiAttivita(JSON.parse(a.esiti_json ?? 'null')); } catch { esiti = null; }
      if (!esiti?.esiti.some((y) => y.chiave === e.esito)) return `l'attività ${e.attivita} non dichiara l'esito ${e.esito}`;
    }
  }
  return null;
}

interface EsitoVoce { uid: string; data: string; esito: string; motivo?: string; prima?: unknown; dopo?: unknown; proposte?: Esito[] }

function scriviVoce(db: AppDatabase, x: VoceDati, partite: string[] | null, adesso: string): EsitoVoce {
  const base = { uid: x.uid, data: x.data };
  for (const e of [...x.prima.effetti, ...x.aggiungi]) { const n = normalizzaEffettoVoce(JSON.parse(canonico(e))); if (!n || canonico(n) !== canonico(e)) errore(`effetto non nella forma dell'app nell'elenco (${x.uid})`); }
  for (const i of x.togli) if (!Number.isInteger(i) || i < 0 || i >= x.prima.effetti.length) errore(`indice da togliere ${i} fuori dagli effetti di ${x.uid}`);
  const atteso = [...x.prima.effetti.filter((_, i) => !x.togli.includes(i)), ...x.aggiungi];
  const v = rigaVoce(db, x.uid);
  if (!v) return { ...base, esito: 'voce assente: niente da fare' };
  const letti = effettiDi(db, x.uid);
  if (v.tipo === x.dopo.tipo && canonico(rifDi(v)) === canonico(x.dopo.riferimento) && stessiEffetti(letti, atteso)) return { ...base, esito: 'già applicata' };
  if (v.data !== x.data || v.genere !== 'azione' || v.azione !== x.prima.azione || v.note !== x.prima.note || v.tipo !== x.prima.tipo
    || canonico(rifDi(v)) !== canonico(x.prima.riferimento) || v.riferimento_testo !== null) return { ...base, esito: 'saltata: giorno, testo, note, tipo o collegamento diversi da quelli letti' };
  if (!stessiEffetti(letti, x.prima.effetti)) return { ...base, esito: 'saltata: effetti diversi da quelli letti' };
  const modificata = modificataDallUtente(db, x.uid, v);
  if (modificata) return { ...base, esito: `saltata: ${modificata}` };
  const problema = problemaCollegamento(db, x);
  if (problema) return { ...base, esito: `saltata: ${problema}` };
  let prima: unknown, dopo: unknown;
  if (x.soloCollegamento) {
    // solo il collegamento: nessun effetto cambia, le spunte della partita restano valide come sono (l'annullo legge le ricevute)
    if (x.togli.length || x.aggiungi.length) errore(`la voce ${x.uid} cambia gli effetti: non è un solo collegamento`);
    if (partite === null) return { ...base, esito: 'saltata: schema delle partite non attaccato' };
    if (db.prepare('UPDATE main.voce_giornata SET tipo = ?, riferimento_tipo = ?, riferimento_chiave = ? WHERE uid = ? AND tipo = ? AND riferimento_tipo IS ? AND riferimento_chiave IS ?')
      .run(x.dopo.tipo, x.dopo.riferimento.tipo, x.dopo.riferimento.chiave, x.uid, v.tipo, v.riferimento_tipo, v.riferimento_chiave).changes !== 1) errore(`la voce ${x.uid} non è stata collegata`);
    prima = { tipo: v.tipo, riferimento: rifDi(v) };
    dopo = { tipo: x.dopo.tipo, riferimento: x.dopo.riferimento };
  } else {
    const conv = convertiVoce(db, {
      uid: x.uid, data: x.data, azione: x.prima.azione, lotto: LOTTO, motivo: x.motivo,
      attesi: x.prima.effetti.map((effetto, i) => ({ uid: null, effetto, ...(x.togli.includes(i) ? { togli: true as const } : {}) })),
      togli: [],
      aggiungi: x.aggiungi.map((effetto, i) => ({ seme: `L13-333:${x.uid}:${i}`, effetto })),
      collega: { tipoPrima: x.prima.tipo, riferimentoPrima: x.prima.riferimento, tipo: x.dopo.tipo, riferimento: x.dopo.riferimento },
    }, partite, adesso);
    if (conv.esito.startsWith('saltata')) return { ...base, esito: conv.esito };
    if (!conv.esito.startsWith('convertita')) errore(`la voce ${x.uid} non risulta scritta (${conv.esito})`);
    prima = conv.prima; dopo = conv.dopo;
  }
  const riletta = rigaVoce(db, x.uid)!;
  if (riletta.tipo !== x.dopo.tipo || canonico(rifDi(riletta)) !== canonico(x.dopo.riferimento) || riletta.updated_at !== v.updated_at || riletta.azione !== v.azione
    || riletta.note !== v.note || riletta.riferimento_testo !== null || !stessiEffetti(effettiDi(db, x.uid), atteso)) errore(`la voce ${x.uid} riletta non è quella attesa`);
  const proposte = x.chiudi.map((p) => chiudiProposta(db, { id: p.id, voce: x.uid, effetti: p.effetti, modo: 'superata', da: null, perche: `collegamento all'attività ${x.dopo.riferimento.chiave} applicato dalla migrazione 333` }, adesso));
  return { ...base, esito: 'scritta', motivo: x.motivo, prima, dopo, proposte };
}

// ---------- verifica e audit ----------

/** L'impronta di tutto lo schema `utente` (ogni tabella, ogni riga): alla fine deve essere identica. */
function improntaPartite(db: AppDatabase): string {
  const h = createHash('sha256');
  for (const t of (db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table' ORDER BY name").all() as Array<{ name: string }>).map((x) => x.name)) {
    h.update(`#${t}\n`);
    for (const r of db.prepare(`SELECT * FROM utente."${t}"`).iterate()) h.update(JSON.stringify(r) + '\n');
  }
  return h.digest('hex');
}

/** L'audit: la prima esecuzione sempre, le successive solo se hanno cambiato qualcosa. */
function scriviAudit(db: AppDatabase, esecuzione: Record<string, unknown>, cambiato: boolean): void {
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
  if (vecchio && !cambiato) return;
  let esecuzioni: unknown[] = [];
  if (vecchio) { try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; } }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(AUDIT, JSON.stringify({
      migrazione: 333, lotto: LOTTO,
      fonti: {
        biliardo: 'https://www.allgamestaff.it/persona-5-royal/biliardo/',
        freccette: 'https://www.allgamestaff.it/persona-5-royal/freccette/',
        takemi: 'https://www.allgamestaff.it/persona-5-royal/guida-rango-confidente-di-tae-takemi-morte/',
        shinya: 'https://www.allgamestaff.it/persona-5-royal/guida-rango-confidente-di-shinya-torre/',
        fruiTe: 'Diario della guida, voce del 07-06 («Studiare al Diner con un Frui-te»: «Fascino +1, Conoscenza +2») e https://samurai-gamers.com/persona-5/charm-guide/ (+1 Fascino, +2 Conoscenza); nessuna fonte per la pioggia: nessun esito con la pioggia',
      },
      // le 38 voci lasciate dalla 312: 7 collegate da questa migrazione, 4 già collegate, 27 senza collegamento (le voci del 07-06 e del 07-12
      // che questa migrazione riscrive non sono fra le 38)
      voci312: { totale: 38, collegate: VOCI.filter((v) => v.uid !== VOCE_0712 && v.uid !== VOCE_0706).map((v) => v.uid.slice(0, 8)), giaCollegate: GIA_COLLEGATE, senzaCollegamento: LASCIATE },
      fuoriDalle38: [VOCE_0706.slice(0, 8), VOCE_0712.slice(0, 8)],
      esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }],
    }));
}

export const migration333: Migration = {
  id: 333,
  name: 'effetti_attivita_e_voci_collegate',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['voce_giornata', 'voce_effetto', 'attivita', 'dati_guida']) if (!esisteTabella(db, t)) { logger.warn({ migrazione: 333, tabella: t }, 'tabella assente: niente da fare'); return; }
    const adesso = new Date().toISOString();
    const partiteAttaccate = (db.prepare('PRAGMA database_list').all() as Array<{ name: string }>).some((s) => s.name === 'utente');
    const partitePrima = partiteAttaccate ? improntaPartite(db) : null;
    const partite = tabellePartiteConVoce(db);
    // prima le attività (gli esiti nuovi), poi le voci che li citano
    const attivita = ATTIVITA.map((a) => scriviAttivita(db, a));
    const voci = VOCI.map((x) => scriviVoce(db, x, partite, adesso));
    if (partiteAttaccate && improntaPartite(db) !== partitePrima) errore('le partite risultano cambiate');
    const scritte = attivita.filter((a) => a.esito === 'scritta').length;
    const collegate = voci.filter((v) => v.esito === 'scritta').length;
    const cambiato = scritte + collegate > 0;
    if (cambiato) invalidaCacheDiGioco();
    scriviAudit(db, { attivita, voci }, cambiato);
    logger.info({ migrazione: 333, attivitaScritte: scritte, vociScritte: collegate, saltate: [...attivita, ...voci].filter((x) => x.esito.startsWith('saltata')).length },
      'attività con le Doti scelte alla spunta e voci del Diario collegate alle loro attività');
  },
};
