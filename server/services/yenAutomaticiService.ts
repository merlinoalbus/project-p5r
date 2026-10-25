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
  return { causa: causa.tipo, motivo, richiesto, applicato, dopo, creatoIl: adesso };
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
    .map((r) => ({ causa: r.causa_tipo, motivo: r.motivo, richiesto: r.richiesto, applicato: r.applicato, dopo: r.dopo, creatoIl: r.creato_il }));
}

/**
 * Decisione 3 e 18: gli yen di una Richiesta li muove solo la Richiesta completata. Completata (e senza proposte «Applica» in sospeso) → la
 * ricompensa entra da sola; non più completata (riaperta, azzerata, eliminata) → si toglie. `ripristino`: la Richiesta rimessa dal cestino torna
 * completata dove lo era: la ricompensa rientra solo dove l'eliminazione l'aveva tolta (mai per completamenti più vecchi, che non l'avevano mossa).
 */
export function riallineaYenRichiesta(p: number, chiave: string, momento: 'stato' | 'eliminazione' | 'ripristino'): void {
  richiedeTransazione('Il riallineamento degli yen della Richiesta');
  const causa: CausaYen = { tipo: 'richiesta', chiave };
  const r = prepared("SELECT r.nome, r.yen FROM main.richiesta r JOIN utente.richiesta_partita s ON s.richiesta_chiave = r.chiave AND s.partita_id = ? AND s.stato = 'completata' WHERE r.chiave = ?")
    .get(p, chiave) as { nome: string; yen: number | null } | undefined;
  const presente = inVigore(p, causa), accodato = inCoda(p, causa);
  if (!r) {
    // completata e riaperta nello stesso gesto: il movimento in coda non ha toccato il saldo ed esce dalla coda
    if (accodato >= 0) coda!.splice(accodato, 1);
    if (presente) chiudi(p, presente, momento === 'eliminazione' ? 'richiesta-eliminata' : 'richiesta-non-completata');
    return;
  }
  if (presente || accodato >= 0 || !Number.isSafeInteger(r.yen) || (r.yen as number) <= 0 || yenPropostiInSospeso(p, 'richiesta', chiave)) return;
  if (momento === 'ripristino') {
    const ultima = prepared('SELECT annullo_motivo FROM utente.yen_automatico WHERE partita_id = ? AND causa_tipo = ? AND causa_chiave = ? ORDER BY rowid DESC LIMIT 1').get(p, causa.tipo, causa.chiave) as { annullo_motivo: string | null } | undefined;
    if (ultima?.annullo_motivo !== 'richiesta-eliminata') return;
  }
  muoviYenAutomatico(p, causa, r.yen as number, `Ricompensa della Richiesta «${r.nome}»`);
}
