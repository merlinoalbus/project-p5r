// ============================================================
// applicazioniEffetti — l'esito del salvataggio di una voce già spuntata, a parole (L13, decisione 19)
// ============================================================
//
// Segnalazione dell'utente: «al momento non viene aggiornato il Compendio Personale». Dalla decisione 19 gli effetti di stato aggiunti, cambiati o
// tolti nella guida valgono subito nelle partite che hanno la spunta della voce; il server dice che cosa è successo partita per partita
// (`AzionePercorsoDto.applicazioniEffetti`, `StatoEffettiVoceDto.applicazioni`). Qui la notifica che mostra chi salva (la finestra della voce, la
// scheda di una proposta «da completare» applicata, il registro dei gesti per un candidato confermato), così niente resta in silenzio: segnato,
// tolto, già vero, da approvare o non applicato (con il motivo) o, per la Fortuna, non più valido. Un avviso quando qualcosa non è stato
// applicato, altrimenti un'informazione; tutte e due restano a schermo finché l'utente non le chiude (`durata` 0): il testo può elencare più
// partite ed effetti, ed è la conferma che l'utente cerca (WCAG 2.2.1, niente che sparisca prima di averlo letto).
// ============================================================

import type { ApplicazioneStatoPartitaDto } from '../../shared/effettiVoce';

const DICITURA: Record<ApplicazioneStatoPartitaDto['esito'], string> = {
  segnato: 'segnato',
  annullato: 'tolto',
  resta: 'resta nella partita',
  'gia-presente': 'era già vero',
  'fortuna-non-valida': 'non applicata',
  'da-approvare': 'da approvare nella partita',
  'non-applicato': 'non applicato',
};

/** La notifica dell'esito: null senza applicazioni. Raggruppa per partita, nell'ordine del server. */
export function notificaApplicazioni(applicazioni: readonly ApplicazioneStatoPartitaDto[] | undefined): { tipo: 'info' | 'warning'; testo: string; durata: number } | null {
  if (!applicazioni?.length) return null;
  const perPartita = new Map<number, { nome: string; righe: string[] }>();
  for (const a of applicazioni) {
    const g = perPartita.get(a.partitaId) ?? { nome: a.partitaNome, righe: [] };
    // la frase dell'effetto contiene già i due punti («Trofeo ottenuto: …»): l'esito si stacca con una freccia
    // 2026-10-26: gli avvisi (la scorta oltre la capienza, l'esemplare in scorta che resta perché modificato dopo) seguono l'esito
    g.righe.push(`${a.testo} → ${DICITURA[a.esito]}${a.motivo ? ` (${a.motivo})` : ''}${a.avvisi?.length ? ` — ${a.avvisi.map((x) => x.replace(/\.$/, '')).join('; ')}` : ''}`);
    perPartita.set(a.partitaId, g);
  }
  const nonApplicati = applicazioni.some((a) => a.esito === 'da-approvare' || a.esito === 'fortuna-non-valida' || a.esito === 'non-applicato' || !!a.avvisi?.length);
  const testo = [...perPartita.values()].map((g) => `«${g.nome}»: ${g.righe.join('; ')}.`).join(' ');
  return { tipo: nonApplicati ? 'warning' : 'info', testo: `Nelle partite che hanno spuntato la voce. ${testo}`, durata: 0 };
}
