// ============================================================
// yenAutomatici — gli yen che si muovono da soli, come dato e come frase (L13, decisione 18)
// ============================================================
//
// Decisione 18 dell'utente: le spese delle voci spuntate scalano da sole il saldo della partita, mai sotto zero, e l'azione resta sempre
// possibile anche con il saldo insufficiente o a zero; i guadagni legati a voci ed eventi (paga dei lavori, yen delle Richieste, effetto
// «Yen ricevuti») entrano da soli. Restano manuali i soldi dei combattimenti e delle vendite nei Palazzi e nei Memento.
//
// Il server registra ogni movimento (`utente.yen_automatico`) con l'importo chiesto e quello davvero mosso; qui il DTO che la pagina
// mostra e l'unica frase che lo racconta («Scalati ¥300 dal saldo: la spesa era ¥500, il saldo non bastava»).
// ============================================================

/** Il tetto del saldo della partita (lo stesso del denaro del gruppo, `bodyYen`, e dell'effetto «yen»). */
export const YEN_MASSIMI_SALDO = 9_999_999;

/** Da che cosa nasce un movimento automatico: l'effetto di una voce, un turno di un'attività, una Richiesta completata, un regalo comprato. */
export type CausaYenAutomatico = 'voce' | 'turno' | 'richiesta' | 'regalo';

/** Un movimento automatico ancora in vigore: `richiesto` con il segno (negativo = spesa), `applicato` quello davvero mosso sul saldo. */
export interface MovimentoYenAutomaticoDto {
  causa: CausaYenAutomatico;
  /** La chiave della causa: `voce:effetto` per un effetto della voce, `attività:ordine` per un turno, la chiave della Richiesta, il regalo. */
  chiave: string;
  /** Che cosa l'ha mosso, in parole («Paga del turno: Commesso al Triple Seven», «Acquisti: Arginade ×2»). */
  motivo: string;
  richiesto: number;
  applicato: number;
  /** Il saldo subito dopo il movimento. */
  dopo: number;
  creatoIl: string;
}

/** Un importo come lo scrivono le frasi degli yen automatici («¥5000», «¥12.000»: il separatore it-IT parte da cinque cifre), senza segno. */
export const testoYen = (n: number): string => `¥${Math.abs(n).toLocaleString('it-IT')}`;
const yen = testoYen;

/**
 * La frase di un movimento: «Entrati ¥3.500 nel saldo», «Scalati ¥500 dal saldo», e quando il saldo non bastava (o era al tetto) l'importo
 * davvero mosso con quello chiesto: «Scalati ¥300 dal saldo: la spesa era ¥500, il saldo non bastava», «Nessuno yen scalato: la spesa era
 * ¥500, il saldo era a zero».
 */
export function fraseMovimentoYen(m: Pick<MovimentoYenAutomaticoDto, 'richiesto' | 'applicato'>): string {
  const spesa = m.richiesto < 0;
  if (m.applicato === m.richiesto) return spesa ? `Scalati ${yen(m.applicato)} dal saldo` : `Entrati ${yen(m.applicato)} nel saldo`;
  if (m.applicato === 0) return spesa ? `Nessuno yen scalato: la spesa era ${yen(m.richiesto)}, il saldo era a zero` : `Nessuno yen entrato: il saldo era già al massimo (${yen(YEN_MASSIMI_SALDO)})`;
  return spesa ? `Scalati ${yen(m.applicato)} dal saldo: la spesa era ${yen(m.richiesto)}, il saldo non bastava` : `Entrati ${yen(m.applicato)} nel saldo su ${yen(m.richiesto)}: il saldo è arrivato al massimo`;
}
