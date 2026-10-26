// ============================================================
// Migrazione 263 — le offerte mancanti dei prezzi che vivevano solo nelle descrizioni (Ondata 5, Lotto E; decisione 21 dell'utente)
// ============================================================
//
// Decisione 21: «Non sono d'accordo nel rimandare attività a fasi successive»; il prezzo vive solo nell'offerta. Censimento completo delle
// descrizioni del catalogo con «Prezzo citato nella pagina Oggetti» senza nessuna offerta visibile (sulla copia dei dati alla 253): 22 oggetti
// senza offerta e 5 doppioni di un oggetto che ha l'offerta. Di quei 22:
//   - 11 hanno un negozio e un periodo nella guida e diventano offerte qui (sotto);
//   - 9 si vendono solo nei set delle televendite: il prezzo citato è quello del set, che è già un'offerta (decisione 4) — nessuna offerta nuova,
//     il testo si toglie con la 265;
//   - 2 restano senza offerta, perché la guida non dice in quale distributore si comprano: Oh! Shiruko (210 ¥) è dato solo a «Distributori
//     automatici», senza luogo; Stufato misterioso (600 ¥) a «Distributori automatici: Akihabara, Electric Town (da Venerdì 9/2)», ma i
//     distributori di Akihabara sono sei e la pagina dei distributori (che li elenca uno per uno) non lo nomina in nessuno. Un'offerta in un
//     distributore scelto da noi sarebbe un dato inventato: il prezzo resta nella descrizione, unico punto, e la scelta va all'utente.
//
// Guida italiana, Oggetti [O] (letta il 2026-10-26), «Distributore militare, Negozio softair Untouchable (Shibuya)», 800 ¥ ciascuno:
//   Razione D, Razione di polpette, Pane nero: 12/7–12/19 · Porzione di frutta: 6/07–8/14 e 11/11–12/6 · Porzione di kebab, Porzione di Mont
//   Blanc, Porzione di osechi: 1/13–2/2 · Porzione di porridge: nessuna data · Porzione di torimeshi: 4/17–6/06 e 6/07–8/14 · Zuppa vegana:
//   11/11–12/6. La Razione militare c'è già (`untouchable/razione-militare`): le nuove offerte stanno nello stesso negozio. Negozi speciali [S]:
//   nessun limite per l'Untouchable, quindi la regola dell'utente (`fallback-utente`).
// [O]: «Takemedic | 3.400 ¥ / 1.700 ¥ | Clinica medica Takemi (Rango Confidente Morte 5)»; come le altre offerte della Clinica: dal 16 aprile,
//   rango 1 e rango 5 di Takemi, nessun limite.
// DVD a noleggio [DVD]: «negozio di videonoleggio Scarlet, situato a Shibuya lungo Central Street», «abbonamento annuale al costo di 4.800 yen»,
//   «non si paga più per ogni singolo noleggio». Il prezzo viveva in 12 dettagli dei DVD, nelle loro 12 schede del catalogo e nel luogo: nasce il
//   negozio nella sede che esiste già (`shibuya/scarlet`) con l'offerta dell'abbonamento (pezzo unico), e «4.800¥» si toglie da «cosa offre» del
//   luogo (i DVD con la 267).
//
// Periodo validato (04-01 → 05-31): la voce del 23 aprile «Negozio di videonoleggio Scarlet: abbonarsi per 4.800 yen» (0b3239d9) non cambia;
// riceve solo una proposta da approvare riga per riga, l'effetto «articolo» con l'abbonamento (decisioni 2 e 18: il prezzo lo scala l'offerta).
// La proposta aperta «yen −4.800» della stessa voce resta com'è (si decide alla revisione: con l'offerta collegata sarebbe un secondo prezzo).
//
// Conservativa: un'offerta, un negozio o una scheda che ci sono già (anche nascosti) non si toccano; «cosa offre» si corregge solo se è il testo
// atteso. Nessuna voce del Diario e nessun dato delle partite cambia (impronta controllata). Idempotente. Audit in `dati_guida.audit-263-offerte`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { FALLBACK_UTENTE, UNICO, type RegolaArticolo } from './rifornimentoOndata5.js';
import { FONTE_DVD, FONTE_OGGETTI, improntaDiario, scriviAudit } from './prezziOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-263-offerte';
const errore = (motivo: string): never => { throw new Error(`263: ${motivo}; nessuna modifica applicata.`); };
type Esito = { chiave: string; esito: string };

const intervallo = (dal: string, al: string) => ({ tipo: 'intervallo', dal, al });
interface OffertaNuova { chiave: string; negozio: string; nome: string; categoria: string; prezzo: number; catalogo: string; condizioni: unknown[]; regola: RegolaArticolo; fonte: string }

const MILITARE = (nome: string, catalogo: string, condizioni: unknown[]): OffertaNuova => ({
  chiave: `untouchable/${catalogo.split('/')[1]}`, negozio: 'untouchable', nome, categoria: 'consumabile', prezzo: 800, catalogo, condizioni, regola: FALLBACK_UTENTE, fonte: FONTE_OGGETTI,
});
const OFFERTE: readonly OffertaNuova[] = [
  MILITARE('Porzione di torimeshi', 'consumabile/porzione-di-torimeshi', [intervallo('04-17', '08-14')]),
  MILITARE('Porzione di frutta', 'consumabile/porzione-di-frutta', [{ tipo: 'gruppo', modo: 'almeno-una', condizioni: [intervallo('06-07', '08-14'), intervallo('11-11', '12-06')] }]),
  MILITARE('Zuppa vegana', 'consumabile/zuppa-vegana', [intervallo('11-11', '12-06')]),
  MILITARE('Razione D', 'consumabile/razione-d', [intervallo('12-07', '12-19')]),
  MILITARE('Razione di polpette', 'consumabile/razione-di-polpette', [intervallo('12-07', '12-19')]),
  MILITARE('Pane nero', 'consumabile/pane-nero', [intervallo('12-07', '12-19')]),
  MILITARE('Porzione di kebab', 'consumabile/porzione-di-kebab', [intervallo('01-13', '02-02')]),
  MILITARE('Porzione di Mont Blanc', 'consumabile/porzione-di-mont-blanc', [intervallo('01-13', '02-02')]),
  MILITARE('Porzione di osechi', 'consumabile/porzione-di-osechi', [intervallo('01-13', '02-02')]),
  MILITARE('Porzione di porridge', 'consumabile/porzione-di-porridge', []),
  { chiave: 'clinica-takemi/takemedic', negozio: 'clinica-takemi', nome: 'Takemedic', categoria: 'consumabile', prezzo: 3_400, catalogo: 'consumabile/takemedic',
    condizioni: [{ tipo: 'data', dal: '04-16' }, { tipo: 'confidente', confidente: 'takemi', rango: 1 }, { tipo: 'confidente', confidente: 'takemi', rango: 5 }], regola: FALLBACK_UTENTE, fonte: FONTE_OGGETTI },
];

// Scarlet: negozio, scheda dell'abbonamento e offerta
const SCARLET = { negozio: 'scarlet', sede: 'shibuya/scarlet', quartiere: 'shibuya', nome: 'Videonoleggio Scarlet', luogo: 'Shibuya, Central Street' };
const ABBONAMENTO_CATALOGO = {
  chiave: 'altro/abbonamento-annuale-di-scarlet', nome: 'Abbonamento annuale di Scarlet',
  effetto: 'Con l’abbonamento i DVD di Scarlet si noleggiano senza pagare ogni noleggio, un DVD alla volta; per guardarli serve la TV CRT della mansarda del Leblanc.',
};
const ABBONAMENTO: OffertaNuova = { chiave: 'scarlet/abbonamento-annuale', negozio: SCARLET.negozio, nome: 'Abbonamento annuale', categoria: 'altro', prezzo: 4_800, catalogo: ABBONAMENTO_CATALOGO.chiave, condizioni: [], regola: UNICO, fonte: FONTE_DVD };
const COSA_OFFRE_PRIMA = 'Noleggio DVD in abbonamento annuale (4.800¥, un DVD alla volta).';
const COSA_OFFRE_DOPO = 'Noleggio DVD in abbonamento annuale (un DVD alla volta).';

const VOCE_SCARLET = '0b3239d98c006197b31530bb9187c475';
const PROPOSTA = {
  id: 'O5E-0b3239d9-01-articolo',
  motivo: 'Ondata 5, lotto E: «abbonarsi per 4.800 yen» è l’acquisto dell’offerta «Abbonamento annuale» del Videonoleggio Scarlet (guida «DVD a noleggio»: abbonamento annuale da 4.800 yen); il prezzo lo scala l’offerta (decisioni 2 e 18). Con questa proposta la proposta «yen −4.800» della stessa voce (L13-4b-0b3239d9-03-b-yen) ripeterebbe il prezzo: va scartata se si approva questa. Periodo validato: solo con il sì dell’utente.',
};

function offerta(db: AppDatabase, o: OffertaNuova): Esito {
  const gia = db.prepare('SELECT nascosto FROM main.articolo WHERE chiave = ?').get(o.chiave) as { nascosto: number } | undefined;
  if (gia) return { chiave: o.chiave, esito: gia.nascosto ? 'offerta già presente ma nascosta: non toccata' : 'offerta già presente' };
  if (!db.prepare('SELECT 1 FROM main.negozio WHERE chiave = ?').get(o.negozio)) return { chiave: o.chiave, esito: `negozio ${o.negozio} assente: nessuna offerta` };
  if (!db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave = ? AND nascosto = 0').get(o.catalogo)) return { chiave: o.chiave, esito: `oggetto ${o.catalogo} assente o nascosto: nessuna offerta` };
  // un'altra offerta visibile dello stesso oggetto nello stesso negozio (aggiunta a mano): non si raddoppia
  const doppia = db.prepare('SELECT chiave FROM main.articolo WHERE negozio_chiave = ? AND catalogo_chiave = ? AND nascosto = 0').pluck().get(o.negozio, o.catalogo) as string | undefined;
  if (doppia) return { chiave: o.chiave, esito: `il negozio ha già un’offerta dello stesso oggetto (${doppia}): nessuna offerta nuova` };
  const ordine = db.prepare('SELECT COALESCE(MAX(ordine), -1) + 1 FROM main.articolo WHERE negozio_chiave = ?').pluck().get(o.negozio) as number;
  db.prepare(`INSERT INTO main.articolo (chiave, negozio_chiave, ordine, nome, categoria, per, prezzo, effetto, statistiche, nota, fonte, verificato, origine, nascosto, updated_at,
      condizioni_json, catalogo_chiave, quantita, rifornimento_json)
    VALUES (?, ?, ?, ?, ?, NULL, ?, NULL, NULL, NULL, ?, 1, 'seed', 0, ?, ?, ?, ?, ?)`)
    .run(o.chiave, o.negozio, ordine, o.nome, o.categoria, o.prezzo, o.fonte, new Date().toISOString(), JSON.stringify(o.condizioni), o.catalogo, o.regola.q, JSON.stringify(o.regola.r));
  return { chiave: o.chiave, esito: `creata (${o.prezzo} ¥, ordine ${ordine})` };
}

function negozioScarlet(db: AppDatabase): Esito[] {
  const esiti: Esito[] = [];
  if (!db.prepare('SELECT 1 FROM main.luogo WHERE chiave = ?').get(SCARLET.sede)) return [{ chiave: SCARLET.negozio, esito: `sede ${SCARLET.sede} assente: nessun negozio` }];
  const gia = db.prepare('SELECT nascosto FROM main.negozio WHERE chiave = ?').get(SCARLET.negozio) as { nascosto: number } | undefined;
  const altro = db.prepare('SELECT chiave FROM main.negozio WHERE sede_chiave = ? AND chiave <> ?').pluck().get(SCARLET.sede, SCARLET.negozio) as string | undefined;
  if (gia) esiti.push({ chiave: SCARLET.negozio, esito: gia.nascosto ? 'negozio già presente ma nascosto' : 'negozio già presente' });
  else if (altro) return [{ chiave: SCARLET.negozio, esito: `la sede ha già il negozio ${altro}: nessun negozio nuovo` }];
  else {
    const ordine = db.prepare('SELECT COALESCE(MAX(ordine), -1) + 1 FROM main.negozio').pluck().get() as number;
    db.prepare(`INSERT INTO main.negozio (chiave, ordine, nome, luogo, luogo_chiave, tipo, gestore, confidente_chiave, note, fonte, origine, nascosto, updated_at, sede_chiave)
      VALUES (?, ?, ?, ?, ?, 'altro', NULL, NULL, NULL, ?, 'seed', 0, ?, ?)`).run(SCARLET.negozio, ordine, SCARLET.nome, SCARLET.luogo, SCARLET.quartiere, FONTE_DVD, new Date().toISOString(), SCARLET.sede);
    esiti.push({ chiave: SCARLET.negozio, esito: `creato (ordine ${ordine}, sede ${SCARLET.sede})` });
  }
  const c = db.prepare(`INSERT INTO main.catalogo_oggetto (chiave, categoria, sottocategoria, nome, nomi_altri_json, nome_originale, effetto, descrizione, statistiche_json, fonte_tipo, fonte_chiave, origine, nascosto, updated_at)
    VALUES (?, 'altro', NULL, ?, '[]', NULL, ?, '', NULL, 'guida', ?, 'seed', 0, ?) ON CONFLICT(chiave) DO NOTHING`)
    .run(ABBONAMENTO_CATALOGO.chiave, ABBONAMENTO_CATALOGO.nome, ABBONAMENTO_CATALOGO.effetto, 'dvd-a-noleggio/Abbonamento annuale', new Date().toISOString()).changes;
  esiti.push({ chiave: ABBONAMENTO_CATALOGO.chiave, esito: c ? 'scheda creata' : 'scheda già presente' });
  esiti.push(offerta(db, ABBONAMENTO));
  // «cosa offre» del luogo: senza il prezzo, che ora vive nell'offerta
  if (haColonna(db, 'luogo', 'cosa_offre') && db.prepare('SELECT 1 FROM main.articolo WHERE chiave = ? AND prezzo = 4800 AND nascosto = 0').get(ABBONAMENTO.chiave)) {
    const l = db.prepare('SELECT cosa_offre, origine FROM main.luogo WHERE chiave = ?').get(SCARLET.sede) as { cosa_offre: string | null; origine: string };
    const testo = l.cosa_offre ?? '';
    if (l.origine === 'seed' && testo.startsWith(COSA_OFFRE_PRIMA)) {
      const nuovo = COSA_OFFRE_DOPO + testo.slice(COSA_OFFRE_PRIMA.length);
      if (db.prepare("UPDATE main.luogo SET cosa_offre = ? WHERE chiave = ? AND cosa_offre = ? AND origine = 'seed'").run(nuovo, SCARLET.sede, testo).changes !== 1) errore('«cosa offre» di Scarlet non si aggiorna');
      esiti.push({ chiave: SCARLET.sede, esito: 'cosa offre: tolto «4.800¥»' });
    } else if (!testo.startsWith(COSA_OFFRE_DOPO)) esiti.push({ chiave: SCARLET.sede, esito: 'cosa offre diverso da quello atteso o corretto dall’utente: non toccato' });
  }
  return esiti;
}

function propostaScarlet(db: AppDatabase): Esito {
  if (!esisteTabella(db, 'proposta_conversione_voce')) return { chiave: PROPOSTA.id, esito: 'tabella delle proposte assente' };
  if (!db.prepare('SELECT 1 FROM main.voce_giornata WHERE uid = ?').get(VOCE_SCARLET)) return { chiave: PROPOSTA.id, esito: 'voce del 23 aprile assente: nessuna proposta' };
  if (!db.prepare('SELECT 1 FROM main.articolo WHERE chiave = ? AND nascosto = 0').get(ABBONAMENTO.chiave)) return { chiave: PROPOSTA.id, esito: 'offerta dell’abbonamento assente: nessuna proposta' };
  if (db.prepare('SELECT 1 FROM main.proposta_conversione_voce WHERE id = ?').get(PROPOSTA.id)) return { chiave: PROPOSTA.id, esito: 'proposta già presente' };
  db.prepare(`INSERT INTO main.proposta_conversione_voce (id, voce_uid, lotto, tipo_proposto, riferimento_tipo, riferimento_chiave, effetti_json, togli_json, motivo, certezza, creata_il)
    VALUES (?, ?, 'ondata-5-E', NULL, NULL, NULL, ?, '[]', ?, 'certa', ?)`)
    .run(PROPOSTA.id, VOCE_SCARLET, JSON.stringify([{ effetto: { tipo: 'articolo', articolo: ABBONAMENTO.chiave }, completa: [], scelte: null }]), PROPOSTA.motivo, new Date().toISOString());
  return { chiave: PROPOSTA.id, esito: 'proposta creata (aperta, da approvare riga per riga)' };
}

export const migration263: Migration = {
  id: 263,
  name: 'offerte_mancanti_dei_prezzi_orfani',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['articolo', 'negozio', 'catalogo_oggetto', 'luogo']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 263, tabella: t }, 'tabella assente: nessuna offerta'); return; }
    }
    if (!haColonna(db, 'articolo', 'rifornimento_json')) { logger.warn({ migrazione: 263 }, 'colonna del rifornimento assente: nessuna offerta'); return; }
    const diarioPrima = improntaDiario(db);
    const esiti: Esito[] = [...OFFERTE.map((o) => offerta(db, o)), ...negozioScarlet(db), propostaScarlet(db)];
    if (improntaDiario(db) !== diarioPrima) errore('le voci del Diario sono cambiate');
    const conteggi = {
      offerteCreate: esiti.filter((e) => e.esito.startsWith('creata')).length,
      negoziCreati: esiti.filter((e) => e.esito.startsWith('creato')).length,
      schedeCreate: esiti.filter((e) => e.esito === 'scheda creata').length,
      proposte: esiti.filter((e) => e.esito.startsWith('proposta creata')).length,
      nonToccati: esiti.filter((e) => /non toccat|assente|nessun/.test(e.esito)).length,
    };
    if (conteggi.offerteCreate + conteggi.negoziCreati + conteggi.schedeCreate) invalidaCacheDiGioco();
    scriviAudit(db, AUDIT, 263, { fonti: [FONTE_OGGETTI, FONTE_DVD], conteggi, esiti });
    logger.info({ migrazione: 263, ...conteggi }, 'Negozi: offerte mancanti dei prezzi orfani (distributore militare, Takemedic, Scarlet)');
  },
};
