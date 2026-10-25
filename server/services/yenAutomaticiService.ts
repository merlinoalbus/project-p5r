// ============================================================
// yenAutomaticiService — gli yen che si muovono da soli (L13, decisione 18)
// ============================================================
//
// Decisione 18 dell'utente (2026-10-25): «gli yen possono anche scendere da soli (senza mai andare sotto zero) ma devono restare cmq
// possibili le azioni anche se il denaro disponibile non basta o è a 0»; i guadagni legati a voci ed eventi (paga dei lavori, ricompense
// delle Richieste, effetto «Yen ricevuti») entrano da soli; «ci sono ovviamente altri soldi dai combattimenti e dalle vendite degli oggetti
// dei palazzi e memento che non possono essere automatici»: quelli, e la modifica diretta del saldo, restano a mano (`squadraService.impostaYen`).
//
// Un solo punto muove il saldo da solo: `muoviYenAutomatico` (al gesto: spunta della voce, turno registrato, Richiesta completata, regalo con
// l'acquisto) e `restituisciYenAutomatico` (togliendo il gesto). Ogni movimento ha la sua riga in `utente.yen_automatico` con l'importo chiesto
// e quello DAVVERO mosso: il saldo non scende sotto zero né sale oltre il tetto (saldo 300, spesa 500 → scalati 300) e il gesto non si ferma
// mai per il saldo. Togliendo il gesto si restituisce solo ciò che era stato scalato, e un guadagno si toglie al più fino a zero (se nel frattempo
// il saldo è sceso): anche l'inverso si registra com'è stato. L'importo si fotografa al gesto (come la quota della pesca): correggere poi il
// prezzo di un articolo o la paga di un lavoro non riscrive i movimenti già fatti.
//
// Un gesto che muove più cause (la spunta di una voce: effetti, turni, Richieste; il suo annullo) le esegue in ordine alla fine (`conYenInOrdine`):
// prima ciò che entra, poi ciò che esce, così il tetto a zero vale una volta sola sul risultato. La voce messa nel cestino chiude i suoi
// movimenti con il motivo `voce-eliminata`; rimessa, li rifà dove il ripristino ha rimesso lo stato che li aveva mossi (`rimettiYenDellaVoceRipristinata`).
//
// Decisioni 2 e 3 restano: gli yen già scritti in un altro dato li muove quel dato (un effetto «yen» accanto a lui è rifiutato dal server,
// `motivoYenGiaStrutturati`), e le ricompense di una Richiesta le muove solo la Richiesta completata (`riallineaYenRichiesta`).
//
// Le proposte «Applica» degli yen nate prima (`utente.da_applicare` di tipo `yen`, con il loro `movimento_yen`) non si toccano: una causa che
// ha ancora una proposta aperta o yen già applicati con una proposta resta in quel registro («in sospeso», `yenPropostiInSospeso`) finché non
// torna a zero, così niente si conta due volte e niente si applica in silenzio.
//
// Le cause nate prima che gli yen si muovessero da soli (utente 049, `yen_automatico_inizio`) erano già nel saldo e non hanno un movimento:
// togliendole non torna niente. Il segno «fuori registro» (`segnaYenFuoriRegistro`, prima di restituire) vale SOLO per la stessa causa nata
// prima, ricavata dal suo momento, e rimettendola il saldo non cambia perché nel gioco non è successo niente di nuovo:
//   - la voce spuntata prima: ogni suo effetto di allora (`voce:effetto`, anche turni e Richieste della voce), così rispuntando la stessa voce
//     i suoi effetti di allora non muovono yen; un effetto aggiunto dopo ha un'altra chiave e si muove come sempre;
//   - la Richiesta completata prima (il momento del completamento, `richiesta_partita.updated_at`): riaprendola e ricompletandola non entra;
//     una Richiesta completata dopo senza movimento (per esempio senza yen scritti in quel momento) non si segna, e ricompletandola entra;
//   - il regalo dato prima con l'acquisto: il segno porta l'oggetto e il momento di gioco della consegna, e vale solo ridandolo nello stesso
//     momento di gioco (la stessa consegna corretta); un regalo dato in un altro momento è un regalo nuovo e si paga;
//   - un turno tolto dal contatore non si segna: il + del contatore è sempre un turno nuovo, nato adesso, e muove i suoi yen.
// ============================================================

import { randomBytes } from 'node:crypto';
import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { voceDellaSpuntaCorrente } from './storicoService.js';
import { YEN_MASSIMI_SALDO, type CausaYenAutomatico, type MovimentoYenAutomaticoDto } from '../../shared/yenAutomatici.js';

export interface CausaYen { tipo: CausaYenAutomatico; chiave: string }
interface RigaYenAutomatico {
  id: string; partita_id: number; causa_tipo: CausaYenAutomatico; causa_chiave: string; voce_uid: string | null; motivo: string;
  richiesto: number; prima: number; applicato: number; dopo: number; creato_il: string; annullato_il: string | null;
}

const limita = (n: number): number => Math.min(YEN_MASSIMI_SALDO, Math.max(0, n));
const saldo = (p: number): number => {
  const r = prepared('SELECT yen FROM utente.partita WHERE id = ?').get(p) as { yen: number } | undefined;
  if (!r) throw httpErrors.notFound('partita-non-trovata', 'La partita non esiste più.');
  if (!Number.isSafeInteger(r.yen) || r.yen < 0) throw httpErrors.conflict('saldo-yen-incoerente', 'Il saldo yen della partita non è un intero valido: nessun movimento viene fatto.');
  return r.yen;
};
const attiva = (p: number, c: CausaYen): RigaYenAutomatico | undefined =>
  prepared('SELECT * FROM utente.yen_automatico WHERE partita_id = ? AND causa_tipo = ? AND causa_chiave = ? AND annullato_il IS NULL').get(p, c.tipo, c.chiave) as RigaYenAutomatico | undefined;
const richiedeTransazione = (cosa: string): void => { if (!getDb().inTransaction) throw new Error(`${cosa} richiede la transazione del gesto.`); };
const stessaCausa = (c: CausaYen, tipo: string, chiave: string): boolean => c.tipo === tipo && c.chiave === chiave;

/** Il motivo con cui si chiudono i movimenti quando la voce va nel cestino: il ripristino della voce li rimette (`rimettiYenDellaVoceRipristinata`). */
export const MOTIVO_VOCE_ELIMINATA = 'voce-eliminata';

/** La causa del regalo: il Confidente e il nome storico della consegna (la chiave di `regalo_partita`), che resta uguale anche quando l'oggetto
 *  del catalogo si fonde in un altro o si elimina (cambia solo `catalogo_chiave`): così la restituzione ritrova sempre il suo movimento. */
export const causaYenRegalo = (confidente: string, regalo: string): CausaYen => ({ tipo: 'regalo', chiave: `${confidente}:${regalo}` });

/** Il momento da cui gli yen si muovono da soli in questo file delle partite (utente 049); null se manca (nessuna causa è «di prima»). */
function inizioRegistro(): string | null {
  return (prepared('SELECT dal FROM utente.yen_automatico_inizio WHERE id = 1').get() as { dal: string } | undefined)?.dal ?? null;
}
/** Vero se una causa nata a `dal` (spunta, turno, consegna del regalo) è di prima che gli yen si muovessero da soli: il saldo di allora la contava già. */
export function nataPrimaDegliYenAutomatici(dal: string | null | undefined): boolean {
  const inizio = inizioRegistro();
  return !!dal && !!inizio && dal < inizio;
}
/** Vero se la causa è «fuori registro»: tolta quando il suo denaro era già nel saldo senza un movimento, rimettendola non si muove niente. */
export const yenFuoriRegistro = (p: number, c: CausaYen): boolean =>
  !!prepared('SELECT 1 FROM utente.yen_fuori_registro WHERE partita_id = ? AND causa_tipo = ? AND causa_chiave = ?').get(p, c.tipo, c.chiave);

/**
 * La causa che si sta togliendo non ha un movimento in vigore (né in coda) perché il suo denaro era già nel saldo (nata prima degli yen
 * automatici, o già fuori registro): si segna, così rimettendola il saldo non cambia. Da chiamare PRIMA della restituzione (una riga già in coda
 * per la restituzione non conta più come in vigore). Chi chiama decide se la causa è davvero di prima (`nataPrimaDegliYenAutomatici`).
 */
export function segnaYenFuoriRegistro(p: number, causa: CausaYen, motivo: string): void {
  richiedeTransazione('Il segno degli yen già nel saldo');
  if (inVigore(p, causa) || inCoda(p, causa) >= 0) return;
  prepared('INSERT OR IGNORE INTO utente.yen_fuori_registro (partita_id, causa_tipo, causa_chiave, motivo, creato_il) VALUES (?, ?, ?, ?, ?)')
    .run(p, causa.tipo, causa.chiave, motivo, nowIso());
}

/**
 * Togliendo la spunta di una voce spuntata prima degli yen automatici: ogni effetto che la voce aveva allora, senza un movimento in vigore,
 * resta fuori registro (`voce:effetto`), anche i turni e le Richieste della voce. Rispuntando la stessa voce quegli effetti non muovono yen
 * (gli articoli, gli yen, la consumazione e la pesca da `muoviYenAutomatico`; i turni da `scartaYenInCoda` nella spunta; la Richiesta dal suo
 * segno di Richiesta completata prima). Un effetto aggiunto dopo ha un'altra chiave e si muove come sempre; uno confermato dopo (un raccordo,
 * con il suo movimento) si restituisce e, rispuntando, si muove di nuovo.
 */
export function segnaYenDellaSpuntaFuoriRegistro(p: number, voceUid: string, fattaIl: string, effetti: readonly string[]): void {
  if (!nataPrimaDegliYenAutomatici(fattaIl)) return;
  for (const e of new Set(effetti)) segnaYenFuoriRegistro(p, { tipo: 'voce', chiave: `${voceUid}:${e}` }, 'spunta-di-prima-tolta');
}
/**
 * Gli effetti della voce i cui yen erano già nel saldo da prima degli yen automatici: senza un movimento in vigore, e nati con una spunta di
 * prima (`fattaIl`, ancora in piedi) o segnati fuori registro togliendola. Vale anche per la voce non spuntata: rispuntandola quegli effetti
 * non muoveranno yen. Per i testi della voce, perché non promettano un movimento che non ci sarà.
 */
export function effettiConYenGiaNelSaldo(p: number, voceUid: string, fattaIl: string | null, effetti: readonly string[]): Set<string> {
  const diPrima = nataPrimaDegliYenAutomatici(fattaIl);
  return new Set(effetti.filter((e) => {
    const causa: CausaYen = { tipo: 'voce', chiave: `${voceUid}:${e}` };
    return !attiva(p, causa) && (diPrima || yenFuoriRegistro(p, causa));
  }));
}

/**
 * L'ordine dei movimenti dentro un gesto che ne fa più d'uno (la spunta di una voce, il suo annullo): `conYenInOrdine` li mette in coda e li
 * esegue alla fine, prima tutto ciò che fa entrare yen (guadagni, spese restituite) e poi ciò che li fa uscire (spese, guadagni tolti). Così il
 * tetto a zero vale una volta sola sul risultato del gesto, qualunque sia la causa (effetto della voce, turno, Richiesta): saldo 0, turno da ¥800
 * e Richiesta da ¥1.000 nella stessa voce → 200, e togliendo la spunta → 0. Fuori da un gesto in coda i movimenti si eseguono subito.
 */
type Differito =
  | { tipo: 'muovi'; p: number; causa: CausaYen; richiesto: number; motivo: string; voceUid: string | null }
  | { tipo: 'restituisci'; p: number; riga: RigaYenAutomatico; motivo: string };
let coda: Differito[] | null = null;
/** Il motivo che vale per ogni restituzione dentro `conMotivoDiRestituzione` (la voce messa nel cestino). */
let motivoForzato: string | null = null;

/** Il movimento in vigore della causa, tenendo conto della coda: una riga già in coda per la restituzione non è più in vigore. */
function inVigore(p: number, c: CausaYen): RigaYenAutomatico | undefined {
  const r = attiva(p, c);
  return r && coda?.some((d) => d.tipo === 'restituisci' && d.riga.id === r.id) ? undefined : r;
}
/** La posizione in coda del movimento ancora da fare della causa (-1 se non c'è). */
const inCoda = (p: number, c: CausaYen): number => coda ? coda.findIndex((d) => d.tipo === 'muovi' && d.p === p && stessaCausa(c, d.causa.tipo, d.causa.chiave)) : -1;

/** Vero se la causa ha un movimento automatico in vigore (o in coda nel gesto in corso). */
export const yenAutomaticoAttivo = (p: number, c: CausaYen): boolean => !!inVigore(p, c) || inCoda(p, c) >= 0;

/**
 * Toglie dalla coda del gesto in corso (`conYenInOrdine`) il movimento ancora da fare della causa, senza toccare il saldo né un movimento già
 * in vigore: vero se c'era. Per la spunta che sa, dopo aver registrato i suoi turni, che uno di quei turni non deve muovere yen (un effetto
 * della voce di prima, o la sfida che l'articolo della stessa voce paga già).
 */
export function scartaYenInCoda(p: number, causa: CausaYen): boolean {
  const i = inCoda(p, causa);
  if (i < 0) return false;
  coda!.splice(i, 1);
  return true;
}

/** Esegue `fn` (un gesto dentro la sua transazione) con i movimenti automatici in coda, poi li esegue in ordine: prima ciò che entra, poi ciò che esce. */
export function conYenInOrdine<T>(fn: () => T): T {
  if (coda) return fn();
  coda = [];
  try {
    const esito = fn();
    const elenco = coda;
    coda = null;
    if (elenco.length) {
      richiedeTransazione('L’ordine dei movimenti automatici degli yen');
      const entra = (d: Differito): boolean => d.tipo === 'muovi' ? d.richiesto > 0 : d.riga.applicato < 0;
      const fatti = new Set<Differito>();
      const fai = (d: Differito): void => {
        if (fatti.has(d)) return;
        fatti.add(d);
        if (d.tipo === 'restituisci') { restituisci(d.p, d.riga, d.motivo); return; }
        // la stessa causa chiusa e rifatta nel gesto (un turno rimasto aperto per un'altra strada): prima si chiude la riga vecchia
        for (const x of elenco) if (x.tipo === 'restituisci' && x.p === d.p && stessaCausa(d.causa, x.riga.causa_tipo, x.riga.causa_chiave)) fai(x);
        esegui(d.p, d.causa, d.richiesto, d.motivo, d.voceUid);
      };
      for (const d of [...elenco.filter(entra), ...elenco.filter((d) => !entra(d))]) fai(d);
    }
    return esito;
  } finally { coda = null; }
}

/** Esegue `fn` con ogni restituzione registrata con `motivo` (la voce messa nel cestino: il suo ripristino rimette quei movimenti). */
export function conMotivoDiRestituzione<T>(motivo: string, fn: () => T): T {
  const prima = motivoForzato;
  motivoForzato = motivo;
  try { return fn(); } finally { motivoForzato = prima; }
}

/**
 * Vero se la causa (come la scrive il registro delle proposte: «voce» con `voce:effetto`, «richiesta» con la chiave) ha ancora yen nel vecchio
 * registro delle proposte «Applica»: una proposta aperta, o yen applicati (o dichiarati già nel saldo) non ancora tornati a zero. Allora quella
 * causa continua a passare dalle proposte, com'era: la proposta aperta resta decidibile e quella applicata ha la sua inversa.
 */
export function yenPropostiInSospeso(p: number, causaTipo: 'voce' | 'richiesta', causaChiave: string): boolean {
  const r = prepared(`SELECT SUM(stato = 'aperta') AS aperte, SUM(CASE WHEN stato = 'applicata' THEN delta_applicato + delta_riconosciuto ELSE 0 END) AS netto
    FROM utente.da_applicare WHERE partita_id = ? AND causa_tipo = ? AND causa_chiave = ? AND tipo = 'yen'`).get(p, causaTipo, causaChiave) as { aperte: number | null; netto: number | null };
  return (r.aperte ?? 0) > 0 || (r.netto ?? 0) !== 0;
}

/**
 * Muove da solo il saldo della partita di `richiesto` yen (negativo = spesa) per la causa: mai sotto zero né oltre il tetto, e il gesto non si
 * ferma mai per il saldo. Registra l'importo chiesto e quello mosso. Zero non registra niente. Una causa ha al più un movimento in vigore.
 */
export function muoviYenAutomatico(p: number, causa: CausaYen, importo: number, motivo: string, voceUid: string | null = voceDellaSpuntaCorrente()): MovimentoYenAutomaticoDto | null {
  richiedeTransazione('Il movimento automatico degli yen');
  if (!Number.isSafeInteger(importo)) throw httpErrors.conflict('yen-automatico-non-valido', 'L’importo da muovere non è un intero valido.');
  // oltre il tetto del saldo un importo non cambia niente in più (il saldo va comunque a zero o al massimo): si registra entro il tetto
  const richiesto = Math.max(-YEN_MASSIMI_SALDO, Math.min(YEN_MASSIMI_SALDO, importo));
  if (richiesto === 0) return null;
  // il suo denaro è già nel saldo da prima degli yen automatici (la stessa causa, nata prima, è fuori registro): rimetterla non è un gesto
  // nuovo nel gioco, e il saldo non cambia. I turni di una voce di prima rispuntata li scarta la spunta (`scartaYenInCoda`), effetto per effetto
  if (yenFuoriRegistro(p, causa)) return null;
  if (inVigore(p, causa) || inCoda(p, causa) >= 0) throw httpErrors.conflict('yen-automatico-gia-attivo', 'Questi yen risultano già mossi: nessun secondo movimento per la stessa causa.');
  // dentro un gesto in coda (`conYenInOrdine`) il movimento si fa alla fine, nel suo ordine: qui si controlla solo che la partita ci sia
  if (coda) { saldo(p); coda.push({ tipo: 'muovi', p, causa, richiesto, motivo, voceUid }); return null; }
  return esegui(p, causa, richiesto, motivo, voceUid);
}
function esegui(p: number, causa: CausaYen, richiesto: number, motivo: string, voceUid: string | null): MovimentoYenAutomaticoDto {
  if (attiva(p, causa)) throw httpErrors.conflict('yen-automatico-gia-attivo', 'Questi yen risultano già mossi: nessun secondo movimento per la stessa causa.');
  const prima = saldo(p), dopo = limita(prima + richiesto), applicato = dopo - prima, adesso = nowIso();
  prepared('INSERT INTO utente.yen_automatico (id, partita_id, causa_tipo, causa_chiave, voce_uid, motivo, richiesto, prima, applicato, dopo, creato_il) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(randomBytes(16).toString('hex'), p, causa.tipo, causa.chiave, voceUid, motivo, richiesto, prima, applicato, dopo, adesso);
  if (applicato !== 0) prepared('UPDATE utente.partita SET yen = ?, updated_at = ? WHERE id = ?').run(dopo, adesso, p);
  return { causa: causa.tipo, chiave: causa.chiave, motivo, richiesto, applicato, dopo, creatoIl: adesso };
}

/**
 * Toglie il movimento in vigore della causa (null se non ce n'è): restituisce solo ciò che era stato scalato, e un guadagno si toglie al più
 * fino a zero. L'inverso si registra com'è stato (`annullo_applicato`), con il motivo.
 */
export function restituisciYenAutomatico(p: number, causa: CausaYen, motivo: string): number | null {
  richiedeTransazione('La restituzione automatica degli yen');
  // un movimento ancora in coda nello stesso gesto non ha toccato il saldo: tolto dalla coda, non c'è niente da restituire
  const i = inCoda(p, causa);
  if (i >= 0) { coda!.splice(i, 1); return 0; }
  const r = inVigore(p, causa);
  return r ? chiudi(p, r, motivo) : null;
}
/** Chiude la riga in vigore (subito, o in coda dentro `conYenInOrdine`), con il motivo forzato se c'è. Null se è in coda. */
function chiudi(p: number, r: RigaYenAutomatico, motivo: string): number | null {
  const m = motivoForzato ?? motivo;
  if (coda) { coda.push({ tipo: 'restituisci', p, riga: r, motivo: m }); return null; }
  return restituisci(p, r, m);
}
function restituisci(p: number, r: RigaYenAutomatico, motivo: string): number {
  const prima = saldo(p), dopo = limita(prima - r.applicato), applicato = dopo - prima, adesso = nowIso();
  if (prepared('UPDATE utente.yen_automatico SET annullato_il = ?, annullo_motivo = ?, annullo_prima = ?, annullo_applicato = ?, annullo_dopo = ? WHERE id = ? AND annullato_il IS NULL')
    .run(adesso, motivo, prima, applicato, dopo, r.id).changes !== 1) throw httpErrors.conflict('yen-automatico-cambiato', 'Il movimento degli yen è cambiato durante l’operazione.');
  if (applicato !== 0) prepared('UPDATE utente.partita SET yen = ?, updated_at = ? WHERE id = ?').run(dopo, adesso, p);
  return applicato;
}

/**
 * Togliendo la spunta di una voce: tutti i movimenti in vigore degli effetti della voce (causa «voce», `voce:effetto`). Prima le spese
 * restituite, poi i guadagni tolti: così il saldo finisce dove sarebbe senza la voce, con il tetto a zero applicato una volta sola (dentro
 * `conYenInOrdine` l'ordine vale anche con i turni e le Richieste che l'annullo toglie dopo).
 */
export function restituisciYenAutomaticiDellaVoce(p: number, voceUid: string, motivo: string): void {
  richiedeTransazione('La restituzione degli yen della voce');
  const righe = prepared("SELECT * FROM utente.yen_automatico WHERE partita_id = ? AND causa_tipo = 'voce' AND causa_chiave LIKE ? AND annullato_il IS NULL ORDER BY applicato, rowid")
    .all(p, `${voceUid}:%`) as RigaYenAutomatico[];
  for (const r of righe) if (r.causa_chiave.startsWith(`${voceUid}:`) && inVigore(p, { tipo: r.causa_tipo, chiave: r.causa_chiave })) chiudi(p, r, motivo);
  // i movimenti degli effetti della voce ancora in coda nello stesso gesto non hanno toccato il saldo: escono dalla coda
  if (coda) coda = coda.filter((d) => !(d.tipo === 'muovi' && d.p === p && d.causa.tipo === 'voce' && d.causa.chiave.startsWith(`${voceUid}:`)));
}

/**
 * Togliendo la spunta di una voce: i movimenti in vigore dei turni che la sua spunta aveva registrato (`voce_uid` della voce) e che l'annullo
 * non ha tolto con il turno. Succede alla voce rimessa dal cestino: la sua spunta torna con le ricevute già annullate, l'annullo non toglie più
 * quel turno, e il movimento rifatto dal ripristino (`rimettiYenDellaVoceRipristinata`) resterebbe in vigore. Così togliendo la spunta la spesa
 * o la paga del turno torna sempre (solo quanto era stato mosso). Da chiamare dopo l'annullo dei turni: quelli già in coda per la restituzione
 * non sono più in vigore e non si chiudono due volte.
 */
export function restituisciYenDeiTurniDellaVoce(p: number, voceUid: string, motivo: string): void {
  richiedeTransazione('La restituzione degli yen dei turni della voce');
  const righe = prepared("SELECT * FROM utente.yen_automatico WHERE partita_id = ? AND causa_tipo = 'turno' AND voce_uid = ? AND annullato_il IS NULL ORDER BY rowid").all(p, voceUid) as RigaYenAutomatico[];
  for (const r of righe) if (inVigore(p, { tipo: r.causa_tipo, chiave: r.causa_chiave })) chiudi(p, r, motivo);
}

/**
 * La voce rimessa dal cestino torna spuntata, con i suoi stati (articoli comprati, turni, Richieste completate) rimessi dal ripristino: gli yen
 * che l'eliminazione aveva restituito (motivo `voce-eliminata`, `conMotivoDiRestituzione`) si muovono di nuovo, con l'importo fotografato al
 * gesto, solo dove lo stato che li aveva mossi è tornato davvero e la causa non ha già un movimento più recente. Gli effetti che il ripristino
 * non rimette da sé (effetto «Yen», consumazione, pesca, biglietto del cinema) tornano con la loro proposta di raccordo, che li muove quando
 * la si conferma (`applicaEffettoStorico`): qui non si toccano, così niente si conta due volte.
 */
export function rimettiYenDellaVoceRipristinata(p: number, voceUid: string): void {
  richiedeTransazione('Il ripristino degli yen della voce');
  if (!prepared('SELECT 1 FROM utente.spunta_voce_partita WHERE partita_id = ? AND voce_uid = ?').get(p, voceUid)) return;
  const righe = (prepared("SELECT * FROM utente.yen_automatico WHERE partita_id = ? AND annullo_motivo = ? AND (voce_uid = ? OR (causa_tipo = 'voce' AND causa_chiave LIKE ?)) ORDER BY rowid")
    .all(p, MOTIVO_VOCE_ELIMINATA, voceUid, `${voceUid}:%`) as RigaYenAutomatico[])
    .filter((r) => r.voce_uid === voceUid || (r.causa_tipo === 'voce' && r.causa_chiave.startsWith(`${voceUid}:`)));
  conYenInOrdine(() => {
    for (const r of righe) {
      const causa: CausaYen = { tipo: r.causa_tipo, chiave: r.causa_chiave };
      // solo l'ultimo movimento della causa, e solo se è proprio quello chiuso dall'eliminazione (mai un movimento più vecchio)
      const ultima = prepared('SELECT id FROM utente.yen_automatico WHERE partita_id = ? AND causa_tipo = ? AND causa_chiave = ? ORDER BY rowid DESC LIMIT 1').get(p, causa.tipo, causa.chiave) as { id: string } | undefined;
      if (ultima?.id !== r.id || inVigore(p, causa) || inCoda(p, causa) >= 0 || !statoTornato(p, voceUid, r)) continue;
      muoviYenAutomatico(p, causa, r.richiesto, r.motivo, r.voce_uid);
    }
  });
}
/** Vero se lo stato che aveva mosso gli yen è tornato con il ripristino della voce. */
function statoTornato(p: number, voceUid: string, r: RigaYenAutomatico): boolean {
  if (r.causa_tipo === 'voce') {
    // l'articolo comprato: la riga dello stato della voce (il ripristino la rimette con l'acquisto); gli altri effetti passano dal raccordo
    return !!prepared("SELECT 1 FROM utente.effetto_stato_voce WHERE partita_id = ? AND voce_uid = ? AND effetto_uid = ? AND tipo = 'articolo'").get(p, voceUid, r.causa_chiave.slice(voceUid.length + 1));
  }
  if (r.causa_tipo === 'turno') {
    const i = r.causa_chiave.lastIndexOf(':'), ordine = Number(r.causa_chiave.slice(i + 1));
    return i > 0 && Number.isSafeInteger(ordine) && !!prepared('SELECT 1 FROM utente.turno_partita WHERE partita_id = ? AND attivita_chiave = ? AND ordine = ?').get(p, r.causa_chiave.slice(0, i), ordine);
  }
  if (r.causa_tipo === 'richiesta') {
    return !!prepared("SELECT 1 FROM main.richiesta r JOIN utente.richiesta_partita s ON s.richiesta_chiave = r.chiave AND s.partita_id = ? AND s.stato = 'completata' WHERE r.chiave = ?").get(p, r.causa_chiave)
      && !yenPropostiInSospeso(p, 'richiesta', r.causa_chiave);
  }
  return false;
}

/** I movimenti in vigore che la voce ha fatto nella partita (i suoi effetti, e i turni e le Richieste segnati dalla sua spunta), in ordine. */
export function yenAutomaticiDellaVoce(p: number, voceUid: string): MovimentoYenAutomaticoDto[] {
  // nell'ordine in cui si sono mossi (rowid: lo stesso istante non li riordina a caso)
  return (prepared("SELECT * FROM utente.yen_automatico WHERE partita_id = ? AND annullato_il IS NULL AND (voce_uid = ? OR (causa_tipo = 'voce' AND causa_chiave LIKE ?)) ORDER BY rowid")
    .all(p, voceUid, `${voceUid}:%`) as RigaYenAutomatico[])
    .filter((r) => r.voce_uid === voceUid || r.causa_chiave.startsWith(`${voceUid}:`))
    .map((r) => ({ causa: r.causa_tipo, chiave: r.causa_chiave, motivo: r.motivo, richiesto: r.richiesto, applicato: r.applicato, dopo: r.dopo, creatoIl: r.creato_il }));
}

/**
 * Decisione 3 e 18: gli yen di una Richiesta li muove solo la Richiesta completata. Completata (e senza proposte «Applica» in sospeso) → la
 * ricompensa entra da sola; non più completata (riaperta, azzerata, eliminata) → si toglie. `ripristino`: la Richiesta rimessa dal cestino torna
 * completata dove lo era: la ricompensa rientra solo dove l'eliminazione l'aveva tolta (mai per completamenti più vecchi, che non l'avevano mossa).
 * `completataIl`: riaprendola (`stato`), il momento in cui era stata completata; solo un completamento di prima degli yen automatici, senza un
 * movimento da togliere, la segna fuori registro (la sua ricompensa era già nel saldo). Una completata dopo senza movimento (nessun yen scritto
 * in quel momento) non si segna: ricompletandola, la ricompensa entra.
 */
export function riallineaYenRichiesta(p: number, chiave: string, momento: 'stato' | 'eliminazione' | 'ripristino', completataIl: string | null = null): void {
  richiedeTransazione('Il riallineamento degli yen della Richiesta');
  const causa: CausaYen = { tipo: 'richiesta', chiave };
  const r = prepared("SELECT r.nome, r.yen FROM main.richiesta r JOIN utente.richiesta_partita s ON s.richiesta_chiave = r.chiave AND s.partita_id = ? AND s.stato = 'completata' WHERE r.chiave = ?")
    .get(p, chiave) as { nome: string; yen: number | null } | undefined;
  const presente = inVigore(p, causa), accodato = inCoda(p, causa);
  if (!r) {
    // completata e riaperta nello stesso gesto: il movimento in coda non ha toccato il saldo ed esce dalla coda
    if (accodato >= 0) { coda!.splice(accodato, 1); return; }
    if (presente) { chiudi(p, presente, momento === 'eliminazione' ? 'richiesta-eliminata' : 'richiesta-non-completata'); return; }
    // riaperta senza un movimento da togliere: se era stata completata prima degli yen automatici la sua ricompensa era già nel saldo, e si
    // segna, così ricompletandola il saldo non cambia. Completata dopo senza movimento: niente da segnare (la ricompensa non era entrata).
    // Una proposta «Applica» di prima resta al suo registro e non si segna
    const yen = (prepared('SELECT yen FROM main.richiesta WHERE chiave = ?').get(chiave) as { yen: number | null } | undefined)?.yen ?? null;
    if (momento === 'stato' && nataPrimaDegliYenAutomatici(completataIl) && yen != null && yen > 0 && !yenPropostiInSospeso(p, 'richiesta', chiave)) segnaYenFuoriRegistro(p, causa, 'richiesta-di-prima-riaperta');
    return;
  }
  if (presente || accodato >= 0 || !Number.isSafeInteger(r.yen) || (r.yen as number) <= 0 || yenPropostiInSospeso(p, 'richiesta', chiave)) return;
  if (momento === 'ripristino') {
    const ultima = prepared('SELECT annullo_motivo FROM utente.yen_automatico WHERE partita_id = ? AND causa_tipo = ? AND causa_chiave = ? ORDER BY rowid DESC LIMIT 1').get(p, causa.tipo, causa.chiave) as { annullo_motivo: string | null } | undefined;
    if (ultima?.annullo_motivo !== 'richiesta-eliminata') return;
  }
  muoviYenAutomatico(p, causa, r.yen as number, `Ricompensa della Richiesta «${r.nome}»`);
}

/**
 * Che cosa fanno gli yen della ricompensa nella partita, per la frase della pagina delle Richieste, ricavato dal registro e dal momento del
 * completamento: `entrati` (completata, la ricompensa è entrata da sola e riaprendola si toglie); `fuori-registro` (il suo denaro era già nel
 * saldo: completata prima degli yen automatici, o riaperta dopo esserlo stata, e completarla o riaprirla non cambia il saldo); `non-entrati`
 * (completata dopo, ma senza movimento: in quel momento la ricompensa non era scritta, e correggere i dati non muove il saldo); null
 * (completandola entrerà da sola). Le proposte «Applica» di prima le dice `yenPropostiInSospeso`.
 */
export function statoYenRichiesta(p: number, chiave: string): 'entrati' | 'fuori-registro' | 'non-entrati' | null {
  const causa: CausaYen = { tipo: 'richiesta', chiave };
  if (attiva(p, causa)) return 'entrati';
  if (yenFuoriRegistro(p, causa)) return 'fuori-registro';
  const completataIl = (prepared("SELECT updated_at FROM utente.richiesta_partita WHERE partita_id = ? AND richiesta_chiave = ? AND stato = 'completata'").get(p, chiave) as { updated_at: string } | undefined)?.updated_at;
  if (completataIl === undefined) return null;
  return nataPrimaDegliYenAutomatici(completataIl) ? 'fuori-registro' : 'non-entrati';
}

/**
 * Il segno del regalo dato prima degli yen automatici con l'acquisto, poi tolto: il Confidente, l'oggetto del catalogo e il momento di gioco della
 * consegna (JSON, così nessuna chiave si confonde con un'altra). Ridando lo stesso oggetto nello stesso momento di gioco è la stessa consegna
 * corretta, il cui prezzo era già nel saldo; in un altro momento è un regalo nuovo e si paga.
 */
const chiaveRegaloDiPrima = (confidente: string, catalogo: string, data: string | null, fascia: string | null): string => JSON.stringify([confidente, catalogo, data, fascia]);
/** Segna la consegna di prima tolta (da chiamare togliendola, solo se era nata prima degli yen automatici e aveva segnato l'acquisto). */
export function segnaRegaloDiPrimaTolto(p: number, confidente: string, catalogo: string, data: string | null, fascia: string | null): void {
  segnaYenFuoriRegistro(p, { tipo: 'regalo', chiave: chiaveRegaloDiPrima(confidente, catalogo, data, fascia) }, 'regalo-di-prima-tolto');
}
/** Il momento di gioco attuale della partita, quello che il regalo registra nella consegna. */
const momentoDellaPartita = (p: number): { data: string | null; fascia: string | null } => {
  const r = prepared('SELECT data_gioco, fascia_gioco FROM utente.partita WHERE id = ?').get(p) as { data_gioco: string | null; fascia_gioco: string | null } | undefined;
  return { data: r?.data_gioco ?? null, fascia: r?.fascia_gioco ?? null };
};
/** Vero se regalando adesso l'oggetto al Confidente il prezzo non si scala: è la consegna di prima, tolta, ridata nello stesso momento di gioco. */
export function regaloYenGiaNelSaldo(p: number, confidente: string, catalogo: string): boolean {
  const m = momentoDellaPartita(p);
  return yenFuoriRegistro(p, { tipo: 'regalo', chiave: chiaveRegaloDiPrima(confidente, catalogo, m.data, m.fascia) });
}
/** Per ogni Confidente, gli oggetti che regalati adesso non scalano il prezzo (`regaloYenGiaNelSaldo`), per la frase della finestra «Regala». */
export function regaliConYenGiaNelSaldo(p: number): Map<string, string[]> {
  const m = momentoDellaPartita(p), out = new Map<string, string[]>();
  for (const { causa_chiave } of prepared("SELECT causa_chiave FROM utente.yen_fuori_registro WHERE partita_id = ? AND causa_tipo = 'regalo'").all(p) as Array<{ causa_chiave: string }>) {
    let k: unknown;
    try { k = JSON.parse(causa_chiave); } catch { continue; }
    if (!Array.isArray(k) || k.length !== 4 || typeof k[0] !== 'string' || typeof k[1] !== 'string' || k[2] !== m.data || k[3] !== m.fascia) continue;
    out.set(k[0], [...(out.get(k[0]) ?? []), k[1]]);
  }
  return out;
}
