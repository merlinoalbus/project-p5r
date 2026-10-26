// ============================================================
// Migrazione 280 — il chiosco della lotteria, i biglietti e l'estrazione con il trofeo «Soldi facili» (Ondata 5, Lotto G; decisione 21)
// ============================================================
//
// Decisione 21 dell'utente (26 ottobre): «lotteria con esito "vinto/non vinto" alla spunta e trofeo, yen della vincita a mano; un solo chiosco
// della lotteria»; raccomandazione 13 del progetto, approvata con la stessa decisione: «Lotto estivo S» del chiosco e quello di Discount Rocinante
// restano due offerte distinte. Prima di questa migrazione la lotteria non esisteva come dato: c'erano solo il luogo creato dal pin
// (`shibuya/u-banco-della-lotteria-di-shibuya`), il pin 1466 e il trofeo. Fonti in `lotteriaOndata5.ts`. Che cosa fa:
//   (1) il negozio «Chiosco della lotteria» (`lotteria-shibuya`), uno solo per i banchi della guida, nella sede che esiste già; se la sede non
//       c'è il negozio nasce senza sede, con il quartiere. Il luogo (nato dal pin con L5, «Banco della lotteria di Shibuya», «cosa offre» vuoto)
//       prende lo stesso nome, quello delle voci del Diario e del trofeo, e dice che cosa offre (progetto dell'ondata 5, LOT-04, approvato con la
//       decisione 21: «le altre raccomandazioni dell'architetto si applicano»), solo se è ancora com'era; il nome di prima resta nell'audit;
//   (2) cinque offerte, con le schede del catalogo (categoria «altro», la descrizione della guida [OC]): Lotto R e Lotto S 3.000 ¥ dal 04-18,
//       Lotto estivo R ed S 5.000 ¥ dal 07-01 al 07-30, Lotteria gratta e vinci 200 ¥ dal 04-18. La guida non dice quanti biglietti si comprano
//       né quando tornano: vale la regola dell'utente (`fallback-utente`). Il «Lotto estivo S» del chiosco usa la scheda che esiste già
//       (`regalo/lotto-estivo-s`, quella dell'offerta di Rocinante, 500 ¥ dal 09-01 al 10-10, che non cambia prezzo né periodo): un oggetto, due
//       offerte; la scheda e l'offerta di Rocinante passano da «regalo» ad «altro» (la guida lo mette fra gli oggetti chiave, nessun Confidente
//       lo riceve in regalo) e la scheda riceve la descrizione. La discordanza fra le due pagine (5.000 ¥ a luglio contro 500 ¥ da settembre)
//       diventa una nota storica, da verificare in gioco;
//   (3) l'attività «Estrazione della lotteria» (`estrazione-lotteria`), contata per volte, con gli esiti scelti alla spunta [S2, S5]: «Vinto»
//       segna il trofeo «Soldi facili» (`shared/esitiAttivita.ts`, campo `trofeo`); «Non vinto, ricompri il Lotto R» porta l'offerta del Lotto R
//       (la guida: si ricompra solo se non si è vinto; il prezzo si scala registrando il turno, decisione 18); «Non vinto» senza ricomprare
//       (l'ultima verifica). Nessun importo della vincita (decisione 18: a mano, lo dice la scheda dell'attività);
//   (4) il trofeo: dal «come» esce il prezzo «(3.000 yen)», che ora vive nell'offerta del Lotto R (un dato in un solo punto);
//   (5) il pin 1466: dalla descrizione esce «radiofonica», non attestata (L5, `crea-luogo-da-pin.md`: «il nativo non la dimostra»).
// Conservativa: ciò che c'è già (anche nascosto) non si tocca; i testi si correggono solo se sono esattamente quelli attesi e della guida
// (`origine = 'seed'`, `seed_json IS NULL` dove la colonna c'è). Nessuna voce del Diario e nessun dato delle partite cambia (impronta
// controllata). Idempotente. Audit in `dati_guida.audit-280-lotteria`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { FALLBACK_UTENTE, improntaDiario } from './rifornimentoOndata5.js';
import { FONTE_NEGOZI, notaStorica } from './prezziOndata5.js';
import { CHIOSCO, ESTRAZIONE, FONTE_OGGETTI_CHIAVE, FONTE_SETTIMANA_2, FONTE_SETTIMANA_5, FONTE_TROFEI, LOTTO_R, TROFEO, scriviAuditLotteria } from './lotteriaOndata5.js';
import { leggiEsitiAttivita, type EsitiAttivita } from '../../../shared/esitiAttivita.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-280-lotteria';
const errore = (motivo: string): never => { throw new Error(`280: ${motivo}; nessuna modifica applicata.`); };
type Esito = { chiave: string; esito: string };

const DAL_18_APRILE = [{ tipo: 'data', dal: '04-18' }];
const LUGLIO = [{ tipo: 'intervallo', dal: '07-01', al: '07-30' }];
const ESTIVO_S_ESISTENTE = 'regalo/lotto-estivo-s';
const ROCINANTE_ESTIVO_S = 'discount-rocinante/lotto-estivo-s';

interface Biglietto { chiave: string; nome: string; prezzo: number; condizioni: unknown[]; catalogo: string; descrizione: string; nuovaScheda: boolean }
const BIGLIETTI: readonly Biglietto[] = [
  { chiave: LOTTO_R, nome: 'Lotto R', prezzo: 3_000, condizioni: DAL_18_APRILE, catalogo: 'altro/lotto-r', descrizione: 'Dieci numeri casuali per la lotteria annuale Mammoth.', nuovaScheda: true },
  { chiave: `${CHIOSCO.chiave}/lotto-s`, nome: 'Lotto S', prezzo: 3_000, condizioni: DAL_18_APRILE, catalogo: 'altro/lotto-s', descrizione: 'Dieci numeri consecutivi per la lotteria annuale Mammoth.', nuovaScheda: true },
  { chiave: `${CHIOSCO.chiave}/lotto-estivo-r`, nome: 'Lotto estivo R', prezzo: 5_000, condizioni: LUGLIO, catalogo: 'altro/lotto-estivo-r', descrizione: 'Dieci numeri casuali per la lotteria Summer Mammoth.', nuovaScheda: true },
  { chiave: `${CHIOSCO.chiave}/lotto-estivo-s`, nome: 'Lotto estivo S', prezzo: 5_000, condizioni: LUGLIO, catalogo: ESTIVO_S_ESISTENTE, descrizione: 'Dieci numeri consecutivi per la lotteria Summer Mammoth.', nuovaScheda: false },
  { chiave: `${CHIOSCO.chiave}/lotteria-gratta-e-vinci`, nome: 'Lotteria gratta e vinci', prezzo: 200, condizioni: DAL_18_APRILE, catalogo: 'altro/lotteria-gratta-e-vinci', descrizione: 'Un biglietto gratta e vinci per la lotteria Mammoth: il risultato è immediato.', nuovaScheda: true },
];

// la guida [S2, S5] e la voce del 18 aprile: il chiosco è «quello più a sinistra dei tre», provenendo dalla stazione; [OC] dà i nomi dei banchi
const NOTA_NEGOZIO = 'In Piazza della Stazione i banchi della lotteria sono tre: per la guida il chiosco è quello più a sinistra, provenendo dalla stazione. La guida nomina «Lotteria sparsa» (Lotto R, Lotto S e i Lotti estivi) e «Lotteria gratta e vinci».';
// una nota sulla fonte, senza cifre: prezzo e periodo vivono soltanto nelle due offerte (un dato in un solo punto, decisione 4)
const NOTA_ESTIVO_S = {
  chiave: 'lotto-estivo-s-due-offerte',
  testo: 'La guida dà due offerte diverse del Lotto estivo S, in due pagine: una alla Lotteria sparsa di Piazza della Stazione (Oggetti chiave/essenziali) e una a Discount Rocinante (Elenco dei negozi), con prezzi e periodi diversi. Restano due offerte distinte dello stesso oggetto finché non si verifica in gioco; prezzo e periodo sono quelli delle offerte.',
  fonte: 'Guida italiana: «Oggetti chiave/essenziali» ed «Elenco dei negozi»',
};

/** Gli esiti dell'estrazione [S2, S5]: «Vinto» segna il trofeo; «Non vinto, ricompri il Lotto R» paga l'offerta (solo se c'è); nessuna Dote,
 *  nessun importo della vincita (decisione 18: a mano). Nessun «premio» in parole: l'avvertenza sugli yen sta nei dettagli dell'attività. */
const ESITO_VINTO = { chiave: 'vinto', nome: 'Vinto', gruppo: null, articolo: null, condizioni: [], doti: [], premi: null, trofeo: TROFEO };
const ESITO_RICOMPRA = { chiave: 'non-vinto-ricompra', nome: 'Non vinto, ricompri il Lotto R', gruppo: null, articolo: LOTTO_R, condizioni: [], doti: [], premi: null };
const ESITO_NON_VINTO = { chiave: 'non-vinto', nome: 'Non vinto', gruppo: null, articolo: null, condizioni: [], doti: [], premi: null };
const DETTAGLI_ESTRAZIONE = 'Si controlla il biglietto la settimana dopo l’acquisto, al chiosco della lotteria: alla spunta si sceglie «Vinto» (si segna il trofeo «Soldi facili»), «Non vinto, ricompri il Lotto R» (si riprova: il prezzo del biglietto si scala da solo) o «Non vinto» senza ricomprare. La guida non dà le date delle estrazioni né gli importi delle vincite: gli yen vinti si segnano a mano.';
/** Che cosa offre il luogo del chiosco (senza prezzi: vivono nelle offerte). */
const COSA_OFFRE = 'Biglietti della lotteria e verifica delle estrazioni.';
const LUOGO_PRIMA = 'Banco della lotteria di Shibuya';

const COME_PRIMA = 'Comprare un biglietto (3.000 yen) al Chiosco della lotteria in Piazza della Stazione a Shibuya e tornare la settimana successiva a verificare l\'estrazione; ripetere finché non si vince (fattore fortuna).';
const COME_DOPO = 'Comprare un biglietto al Chiosco della lotteria in Piazza della Stazione a Shibuya e tornare la settimana successiva a verificare l\'estrazione; ripetere finché non si vince (fattore fortuna).';
const PIN = { id: 1466, prima: 'Acquisto biglietti della lotteria radiofonica e verifica vincite.', dopo: 'Acquisto biglietti della lotteria e verifica vincite.' };

function negozio(db: AppDatabase, adesso: string): Esito {
  const gia = db.prepare('SELECT nascosto FROM main.negozio WHERE chiave = ?').get(CHIOSCO.chiave) as { nascosto: number } | undefined;
  if (gia) return { chiave: CHIOSCO.chiave, esito: gia.nascosto ? 'negozio già presente ma nascosto' : 'negozio già presente' };
  const sede = db.prepare('SELECT 1 FROM main.luogo WHERE chiave = ?').get(CHIOSCO.sede) ? CHIOSCO.sede : null;
  if (sede) {
    const altro = db.prepare('SELECT chiave FROM main.negozio WHERE sede_chiave = ?').pluck().get(sede) as string | undefined;
    if (altro) return { chiave: CHIOSCO.chiave, esito: `la sede ha già il negozio ${altro}: nessun negozio nuovo` };
  }
  const ordine = db.prepare('SELECT COALESCE(MAX(ordine), -1) + 1 FROM main.negozio').pluck().get() as number;
  db.prepare(`INSERT INTO main.negozio (chiave, ordine, nome, luogo, luogo_chiave, tipo, gestore, confidente_chiave, note, fonte, origine, nascosto, updated_at, condizioni_json, sede_chiave)
    VALUES (?, ?, ?, ?, ?, 'altro', NULL, NULL, ?, ?, 'seed', 0, ?, ?, ?)`)
    .run(CHIOSCO.chiave, ordine, CHIOSCO.nome, CHIOSCO.luogo, CHIOSCO.quartiere, NOTA_NEGOZIO, FONTE_OGGETTI_CHIAVE, adesso, JSON.stringify(DAL_18_APRILE), sede);
  return { chiave: CHIOSCO.chiave, esito: `creato (ordine ${ordine}, sede ${sede ?? 'assente: solo il quartiere'})` };
}

function scheda(db: AppDatabase, b: Biglietto, adesso: string): Esito {
  if (b.nuovaScheda) {
    const c = db.prepare(`INSERT INTO main.catalogo_oggetto (chiave, categoria, sottocategoria, nome, nomi_altri_json, nome_originale, effetto, descrizione, statistiche_json, fonte_tipo, fonte_chiave, origine, nascosto, updated_at)
      VALUES (?, 'altro', NULL, ?, '[]', NULL, '', ?, NULL, 'guida', ?, 'seed', 0, ?) ON CONFLICT(chiave) DO NOTHING`)
      .run(b.catalogo, b.nome, b.descrizione, `oggetti-chiave-essenziali/${b.nome}`, adesso).changes;
    return { chiave: b.catalogo, esito: c ? 'scheda creata' : 'scheda già presente' };
  }
  // la scheda che c'è già (l'offerta di Rocinante): descrizione della guida e categoria «altro», solo se è ancora com'era
  const s = db.prepare('SELECT categoria, descrizione, origine, seed_json FROM main.catalogo_oggetto WHERE chiave = ?').get(b.catalogo) as { categoria: string; descrizione: string; origine: string; seed_json: string | null } | undefined;
  if (!s) return { chiave: b.catalogo, esito: 'scheda assente' };
  if (s.origine !== 'seed' || s.seed_json !== null) return { chiave: b.catalogo, esito: 'scheda corretta dall’utente: non toccata' };
  const regali = esisteTabella(db, 'confidente_regalo') && haColonna(db, 'confidente_regalo', 'catalogo_chiave') ? db.prepare('SELECT COUNT(*) FROM main.confidente_regalo WHERE catalogo_chiave = ?').pluck().get(b.catalogo) as number : 0;
  const parti: string[] = [];
  if (s.categoria === 'regalo' && regali === 0) {
    if (db.prepare("UPDATE main.catalogo_oggetto SET categoria = 'altro', updated_at = ? WHERE chiave = ? AND categoria = 'regalo'").run(adesso, b.catalogo).changes !== 1) errore(`la categoria di ${b.catalogo} non si aggiorna`);
    parti.push('categoria regalo → altro');
  } else if (s.categoria !== 'altro') parti.push(`categoria ${s.categoria} lasciata (${regali} regali la citano)`);
  if (s.descrizione === '') {
    if (db.prepare("UPDATE main.catalogo_oggetto SET descrizione = ?, updated_at = ? WHERE chiave = ? AND descrizione = ''").run(b.descrizione, adesso, b.catalogo).changes !== 1) errore(`la descrizione di ${b.catalogo} non si aggiorna`);
    parti.push('descrizione della guida');
  } else if (s.descrizione !== b.descrizione) parti.push('descrizione diversa: non toccata');
  // l'offerta di Rocinante: la stessa categoria della scheda (prezzo, periodo e regola di rifornimento non cambiano)
  const r = db.prepare('SELECT categoria, origine, seed_json FROM main.articolo WHERE chiave = ? AND catalogo_chiave = ?').get(ROCINANTE_ESTIVO_S, b.catalogo) as { categoria: string; origine: string; seed_json: string | null } | undefined;
  if (r && r.origine === 'seed' && r.seed_json === null && r.categoria === 'regalo' && regali === 0) {
    if (db.prepare("UPDATE main.articolo SET categoria = 'altro', updated_at = ? WHERE chiave = ? AND categoria = 'regalo'").run(adesso, ROCINANTE_ESTIVO_S).changes !== 1) errore('la categoria dell’offerta di Rocinante non si aggiorna');
    parti.push('offerta di Rocinante: categoria regalo → altro');
  }
  return { chiave: b.catalogo, esito: parti.length ? parti.join('; ') : 'scheda già allineata' };
}

function offerta(db: AppDatabase, b: Biglietto, adesso: string): Esito {
  const gia = db.prepare('SELECT nascosto FROM main.articolo WHERE chiave = ?').get(b.chiave) as { nascosto: number } | undefined;
  if (gia) return { chiave: b.chiave, esito: gia.nascosto ? 'offerta già presente ma nascosta: non toccata' : 'offerta già presente' };
  if (!db.prepare('SELECT 1 FROM main.negozio WHERE chiave = ?').get(CHIOSCO.chiave)) return { chiave: b.chiave, esito: 'negozio assente: nessuna offerta' };
  if (!db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave = ? AND nascosto = 0').get(b.catalogo)) return { chiave: b.chiave, esito: `oggetto ${b.catalogo} assente o nascosto: nessuna offerta` };
  const ordine = db.prepare('SELECT COALESCE(MAX(ordine), -1) + 1 FROM main.articolo WHERE negozio_chiave = ?').pluck().get(CHIOSCO.chiave) as number;
  db.prepare(`INSERT INTO main.articolo (chiave, negozio_chiave, ordine, nome, categoria, per, prezzo, effetto, statistiche, nota, fonte, verificato, origine, nascosto, updated_at,
      condizioni_json, catalogo_chiave, quantita, rifornimento_json)
    VALUES (?, ?, ?, ?, 'altro', NULL, ?, NULL, NULL, NULL, ?, 1, 'seed', 0, ?, ?, ?, ?, ?)`)
    .run(b.chiave, CHIOSCO.chiave, ordine, b.nome, b.prezzo, FONTE_OGGETTI_CHIAVE, adesso, JSON.stringify(b.condizioni), b.catalogo, FALLBACK_UTENTE.q, JSON.stringify(FALLBACK_UTENTE.r));
  return { chiave: b.chiave, esito: `creata (${b.prezzo} ¥, ordine ${ordine})` };
}

function estrazione(db: AppDatabase, adesso: string): Esito {
  if (!haColonna(db, 'attivita', 'esiti_json')) return { chiave: ESTRAZIONE, esito: 'colonna degli esiti assente: nessuna attività' };
  if (db.prepare('SELECT 1 FROM main.attivita WHERE chiave = ?').get(ESTRAZIONE)) return { chiave: ESTRAZIONE, esito: 'attività già presente' };
  // il trofeo si cita solo se esiste (altrimenti «Vinto» resta senza trofeo, e l'audit lo dice); «ricompri» solo se l'offerta del Lotto R c'è
  const conTrofeo = !!db.prepare('SELECT 1 FROM main.trofeo WHERE chiave = ?').get(TROFEO);
  const conLottoR = !!db.prepare('SELECT 1 FROM main.articolo WHERE chiave = ? AND nascosto = 0').get(LOTTO_R);
  const { trofeo: _t, ...vintoSenzaTrofeo } = ESITO_VINTO;
  const esiti: EsitiAttivita = { modo: 'scelta', esiti: [conTrofeo ? ESITO_VINTO : vintoSenzaTrofeo, ...(conLottoR ? [ESITO_RICOMPRA] : []), ESITO_NON_VINTO] };
  const json = JSON.stringify(esiti);
  if (JSON.stringify(leggiEsitiAttivita(json)) !== json) errore('gli esiti dell’estrazione non si rileggono validi');
  const sede = db.prepare('SELECT 1 FROM main.luogo WHERE chiave = ?').get(CHIOSCO.sede) ? CHIOSCO.sede : null;
  const ordine = db.prepare('SELECT COALESCE(MAX(ordine), -1) + 1 FROM main.attivita').pluck().get() as number;
  db.prepare(`INSERT INTO main.attivita (chiave, ordine, nome, tipo, luogo, luogo_chiave, fascia, costo, doti_json, fonte, verificato, sessioni, origine, nascosto, updated_at,
      condizioni_json, sede_chiave, dettagli, tracciamento, esiti_json)
    VALUES (?, ?, 'Estrazione della lotteria', 'altro', ?, ?, 'entrambe', NULL, '[]', ?, 1, 1, 'seed', 0, ?, ?, ?, ?, 'svolta', ?)`)
    .run(ESTRAZIONE, ordine, CHIOSCO.luogo, CHIOSCO.quartiere, `${FONTE_SETTIMANA_2} ; ${FONTE_SETTIMANA_5}`, adesso, JSON.stringify(DAL_18_APRILE), sede, DETTAGLI_ESTRAZIONE, json);
  return { chiave: ESTRAZIONE, esito: `creata (ordine ${ordine}${conTrofeo ? ', «Vinto» segna il trofeo' : ', trofeo assente: «Vinto» senza trofeo'}${conLottoR ? ', «Non vinto, ricompri il Lotto R» paga l’offerta' : ', offerta del Lotto R assente: niente «ricompri»'})` };
}

/** Il luogo del chiosco (LOT-04): nome delle voci e del trofeo e «cosa offre», solo se è ancora quello nato dal pin; il nome di prima nell'audit. */
function luogo(db: AppDatabase, adesso: string): Esito & { prima?: { nome: string; cosa_offre: string } } {
  const l = db.prepare('SELECT nome, cosa_offre FROM main.luogo WHERE chiave = ?').get(CHIOSCO.sede) as { nome: string; cosa_offre: string | null } | undefined;
  if (!l) return { chiave: `luogo:${CHIOSCO.sede}`, esito: 'luogo assente' };
  if (l.nome === CHIOSCO.nome && l.cosa_offre === COSA_OFFRE) return { chiave: `luogo:${CHIOSCO.sede}`, esito: 'già rinominato' };
  if (l.nome !== LUOGO_PRIMA || (l.cosa_offre ?? '') !== '') return { chiave: `luogo:${CHIOSCO.sede}`, esito: 'nome o «cosa offre» diversi da quelli nati dal pin: non toccato' };
  if (db.prepare("UPDATE main.luogo SET nome = ?, cosa_offre = ?, updated_at = ? WHERE chiave = ? AND nome = ? AND COALESCE(cosa_offre, '') = ''")
    .run(CHIOSCO.nome, COSA_OFFRE, adesso, CHIOSCO.sede, LUOGO_PRIMA).changes !== 1) errore('il luogo del chiosco non si aggiorna');
  return { chiave: `luogo:${CHIOSCO.sede}`, esito: `rinominato «${CHIOSCO.nome}», con «cosa offre»`, prima: { nome: l.nome, cosa_offre: l.cosa_offre ?? '' } };
}

function trofeoCome(db: AppDatabase): Esito {
  const t = db.prepare('SELECT come, origine, seed_json FROM main.trofeo WHERE chiave = ?').get(TROFEO) as { come: string; origine: string; seed_json: string | null } | undefined;
  if (!t) return { chiave: `trofeo:${TROFEO}`, esito: 'trofeo assente' };
  if (t.come === COME_DOPO) return { chiave: `trofeo:${TROFEO}`, esito: 'già senza prezzo' };
  if (t.origine !== 'seed' || t.seed_json !== null || t.come !== COME_PRIMA) return { chiave: `trofeo:${TROFEO}`, esito: 'testo diverso da quello atteso o corretto dall’utente: non toccato' };
  // il prezzo esce dal testo solo se l'offerta che ora lo porta c'è
  if (!db.prepare('SELECT 1 FROM main.articolo WHERE chiave = ? AND prezzo = 3000 AND nascosto = 0').get(LOTTO_R)) return { chiave: `trofeo:${TROFEO}`, esito: 'offerta del Lotto R assente: prezzo lasciato nel testo' };
  if (db.prepare('UPDATE main.trofeo SET come = ? WHERE chiave = ? AND come = ?').run(COME_DOPO, TROFEO, COME_PRIMA).changes !== 1) errore('il «come» del trofeo non si aggiorna');
  return { chiave: `trofeo:${TROFEO}`, esito: 'prezzo tolto dal «come» (vive nell’offerta del Lotto R)' };
}

function pin(db: AppDatabase, adesso: string): Esito {
  if (!esisteTabella(db, 'spillo')) return { chiave: `spillo:${PIN.id}`, esito: 'tabella assente' };
  const s = db.prepare('SELECT descrizione, riferimento_chiave FROM main.spillo WHERE id = ?').get(PIN.id) as { descrizione: string; riferimento_chiave: string | null } | undefined;
  if (!s) return { chiave: `spillo:${PIN.id}`, esito: 'pin assente' };
  if (s.descrizione === PIN.dopo) return { chiave: `spillo:${PIN.id}`, esito: 'già senza «radiofonica»' };
  if (s.descrizione !== PIN.prima || s.riferimento_chiave !== CHIOSCO.sede) return { chiave: `spillo:${PIN.id}`, esito: 'descrizione o collegamento diversi da quelli attesi: non toccato' };
  if (db.prepare('UPDATE main.spillo SET descrizione = ?, updated_at = ? WHERE id = ? AND descrizione = ?').run(PIN.dopo, adesso, PIN.id, PIN.prima).changes !== 1) errore('la descrizione del pin non si aggiorna');
  return { chiave: `spillo:${PIN.id}`, esito: 'tolto «radiofonica» (non attestato)' };
}

export const migration280: Migration = {
  id: 280,
  name: 'lotteria_chiosco_e_biglietti',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['negozio', 'articolo', 'catalogo_oggetto', 'luogo', 'attivita', 'trofeo']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 280, tabella: t }, 'tabella assente: lotteria non creata'); return; }
    }
    if (!haColonna(db, 'articolo', 'rifornimento_json')) { logger.warn({ migrazione: 280 }, 'colonna del rifornimento assente: lotteria non creata'); return; }
    const adesso = new Date().toISOString();
    const diarioPrima = improntaDiario(db);
    const esiti: Esito[] = [negozio(db, adesso), luogo(db, adesso)];
    for (const b of BIGLIETTI) esiti.push(scheda(db, b, adesso), offerta(db, b, adesso));
    const nota = notaStorica(db, NOTA_ESTIVO_S, [
      { tipo: 'articolo', chiave: `${CHIOSCO.chiave}/lotto-estivo-s` }, { tipo: 'articolo', chiave: ROCINANTE_ESTIVO_S }, { tipo: 'catalogo', chiave: ESTIVO_S_ESISTENTE },
    ]);
    esiti.push({ chiave: `nota:${NOTA_ESTIVO_S.chiave}`, esito: `${nota.creata ? 'creata' : 'già presente'}, ${nota.legami} legami nuovi` });
    esiti.push(estrazione(db, adesso), trofeoCome(db), pin(db, adesso));
    if (improntaDiario(db) !== diarioPrima) errore('le voci del Diario sono cambiate');
    const conteggi = {
      negozi: esiti.filter((e) => e.esito.startsWith('creato')).length,
      luoghi: esiti.filter((e) => e.esito.startsWith('rinominato')).length,
      offerte: esiti.filter((e) => e.esito.startsWith('creata (') && e.chiave.startsWith(`${CHIOSCO.chiave}/`)).length,
      schede: esiti.filter((e) => e.esito === 'scheda creata').length,
      attivita: esiti.filter((e) => e.chiave === ESTRAZIONE && e.esito.startsWith('creata')).length,
      nonToccati: esiti.filter((e) => /non toccat|assente|nessun/.test(e.esito)).length,
    };
    if (conteggi.negozi + conteggi.luoghi + conteggi.offerte + conteggi.schede + conteggi.attivita) invalidaCacheDiGioco();
    scriviAuditLotteria(db, AUDIT, 280, { fonti: [FONTE_OGGETTI_CHIAVE, FONTE_SETTIMANA_2, FONTE_SETTIMANA_5, FONTE_TROFEI, FONTE_NEGOZI], conteggi, esiti });
    logger.info({ migrazione: 280, ...conteggi }, 'Lotteria: chiosco, biglietti ed estrazione con il trofeo «Soldi facili»');
  },
};
