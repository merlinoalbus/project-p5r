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

/** Vero se la causa ha un movimento automatico in vigore. */
export const yenAutomaticoAttivo = (p: number, c: CausaYen): boolean => !!attiva(p, c);

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
  const r = attiva(p, causa);
  return r ? restituisci(p, r, motivo) : null;
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
 * restituite, poi i guadagni tolti: così il saldo finisce dove sarebbe senza la voce, con il tetto a zero applicato una volta sola.
 */
export function restituisciYenAutomaticiDellaVoce(p: number, voceUid: string, motivo: string): void {
  richiedeTransazione('La restituzione degli yen della voce');
  const righe = prepared("SELECT * FROM utente.yen_automatico WHERE partita_id = ? AND causa_tipo = 'voce' AND causa_chiave LIKE ? AND annullato_il IS NULL ORDER BY applicato, rowid")
    .all(p, `${voceUid}:%`) as RigaYenAutomatico[];
  for (const r of righe) if (r.causa_chiave.startsWith(`${voceUid}:`)) restituisci(p, r, motivo);
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
  const inVigore = attiva(p, causa);
  if (!r) { if (inVigore) restituisci(p, inVigore, momento === 'eliminazione' ? 'richiesta-eliminata' : 'richiesta-non-completata'); return; }
  if (inVigore || !Number.isSafeInteger(r.yen) || (r.yen as number) <= 0 || yenPropostiInSospeso(p, 'richiesta', chiave)) return;
  if (momento === 'ripristino') {
    const ultima = prepared('SELECT annullo_motivo FROM utente.yen_automatico WHERE partita_id = ? AND causa_tipo = ? AND causa_chiave = ? ORDER BY rowid DESC LIMIT 1').get(p, causa.tipo, causa.chiave) as { annullo_motivo: string | null } | undefined;
    if (ultima?.annullo_motivo !== 'richiesta-eliminata') return;
  }
  muoviYenAutomatico(p, causa, r.yen as number, `Ricompensa della Richiesta «${r.nome}»`);
}
