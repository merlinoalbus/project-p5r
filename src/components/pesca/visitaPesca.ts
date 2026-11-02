// ============================================================
// visitaPesca — le regole pure del modulo «Registra una visita» in tre passi (L10-09)
// ============================================================
//
// Il foglio della pesca (`RegistraVisitaPesca`, nel registro della pesca e, dal 01/11, in «Da applicare» per la pesca delle voci del
// Diario) raccoglie gli stessi dati del modulo unico di prima: qui si decidono soltanto i valori di partenza (giorno e fascia della
// partita o della voce, ordine dopo l'ultima visita di quella fascia, «visita nuova») e i gesti dei contatori dei pesci. L'elenco dei pesci
// (`SPECIE_PESCA`) e le osservazioni incompatibili (`incoerenzeOsservazionePesca`) stanno in `shared/pesca.ts`, una volta sola per il
// server e per i moduli. La richiesta che ne esce ha la forma di sempre (`NuovaSessionePesca`): il server la valida e la scrive come
// prima, dopo l'anteprima firmata.
// ============================================================

import type { FontePesca, MomentoPesca, NuovaSessionePesca, OsservazionePesca, SceltaTurnoPesca, SessionePescaDto, SpeciePesca, StatoPescaDto } from '../../../shared/pesca';

/** L'ordine (da 0) della prossima visita in quel giorno e in quella fascia: dopo l'ultima già registrata, 0 se non ce n'è. */
export function ordineVisitaSuccessivo(sessioni: readonly SessionePescaDto[], giorno: string, fascia: MomentoPesca['fascia']): number {
  let ultimo = -1;
  for (const s of sessioni) if (s.momento.giorno === giorno && s.momento.fascia === fascia && s.momento.ordineVisita > ultimo) ultimo = s.momento.ordineVisita;
  return Math.min(ultimo + 1, 1_000_000);
}

/** Il giorno della visita cambia anche quello della Fortuna; la Fortuna già letta resta solo se il giorno è lo stesso (come prima). */
export function osservazioneDelGiorno(o: OsservazionePesca, giorno: string): OsservazionePesca {
  return { ...o, fortuna: { giorno, attiva: o.fortuna.giorno === giorno ? o.fortuna.attiva : null } };
}

/** La Fortuna sulla Perizia letta dalla partita, solo se non è già segnata (un valore già dichiarato non si riscrive). */
export function conFortunaDallaPartita(o: OsservazionePesca, dalloStato: boolean | null): OsservazionePesca {
  return o.fortuna.attiva === null && dalloStato !== null ? { ...o, fortuna: { ...o.fortuna, attiva: dalloStato } } : o;
}

/** Quante volte è segnato quel pesce; `null` se i pesci sono «non ricordo». */
export function quantiPesci(o: OsservazionePesca, specie: SpeciePesca): number | null {
  return o.catture === null ? null : o.catture.filter(c => c.specie === specie).length;
}
/** «Nessun pesce»: i pesci sono segnati, e sono zero. */
export const nessunPesce = (o: OsservazionePesca): OsservazionePesca => ({ ...o, catture: [] });
/** «Non ricordo i pesci»: le catture tornano ignote. */
export const pesciIgnoti = (o: OsservazionePesca): OsservazionePesca => ({ ...o, catture: null });
/** «+»: una cattura in più di quel pesce, in coda, con tentativo e ordine non noti (come «Aggiungi la cattura» di prima). */
export function aggiungiPesce(o: OsservazionePesca, specie: SpeciePesca, id: string): OsservazionePesca {
  return { ...o, catture: [...(o.catture ?? []), { id, specie, tentativo: null, posizione: null }] };
}
/** «−»: toglie l'ultima cattura segnata di quel pesce. */
export function togliPesce(o: OsservazionePesca, specie: SpeciePesca): OsservazionePesca {
  if (o.catture === null) return o;
  const i = o.catture.map(c => c.specie).lastIndexOf(specie);
  return i < 0 ? o : { ...o, catture: o.catture.filter((_, k) => k !== i) };
}
/** Tentativo e ordine di una cattura, da «Altri dettagli». */
export function conDettaglioPesce(o: OsservazionePesca, id: string, dettaglio: { tentativo?: number | null; posizione?: number | null }): OsservazionePesca {
  return o.catture === null ? o : { ...o, catture: o.catture.map(c => c.id === id ? { ...c, ...dettaglio } : c) };
}
export const conPerizia = (o: OsservazionePesca, esito: OsservazionePesca['perizia']['esito']): OsservazionePesca => ({ ...o, perizia: { esito } });
export const conQuota = (o: OsservazionePesca, pagata: boolean | null): OsservazionePesca => ({ ...o, quota: { pagata } });
/** Come è finita la visita: con «ritirato i premi» la riscossione ha la sua identità, tenuta se c'era già (come prima). */
export function conFinale(o: OsservazionePesca, tipo: OsservazionePesca['finale']['tipo'], nuovoId: () => string): OsservazionePesca {
  return { ...o, finale: { ...o.finale, tipo, riscossioneUid: tipo === 'uscita-dopo-riscossione' ? o.finale.riscossioneUid ?? nuovoId() : null } };
}

/** Le risposte a «L'avevi già contata nelle attività?»: la prima è sempre «No, è nuova». La domanda si fa solo se ce n'è più d'una. */
export function scelteConto(stato: StatoPescaDto): Array<{ chiave: string; nome: string; dettaglio?: string }> {
  return [{ chiave: 'nuovo', nome: 'No, è nuova' },
    ...stato.contatore.turni.filter(t => t.raccordatoASessione === null).map(t => ({ chiave: `turno:${t.firma}`, nome: `Sì, è la visita contata n. ${t.ordine}`, dettaglio: 'il conto non cambia' })),
    ...(stato.contatore.quoteNonRappresentate > 0 ? [{ chiave: 'storico', nome: 'Sì, è fra quelle contate prima', dettaglio: 'il conto non cambia' }] : [])];
}

/** Il turno della risposta scelta, letto dallo stato fotografato (come il modulo di prima); `null` se non c'è più. */
export function turnoDellaScelta(stato: StatoPescaDto, scelta: string): SceltaTurnoPesca | null {
  if (scelta === 'nuovo') return { tipo: 'nuovo' };
  if (scelta === 'storico') return stato.contatore.quoteNonRappresentate > 0 ? { tipo: 'contatore-storico', firmaContatore: stato.contatore.firma } : null;
  const t = stato.contatore.turni.find(t => `turno:${t.firma}` === scelta && t.raccordatoASessione === null);
  return t ? { tipo: 'esistente', ordine: t.ordine, firmaTurno: t.firma } : null;
}

/** Il turno di una visita già segnata, per aggiungerle una registrazione; `null` se è stato tolto. */
export function turnoDellaVisita(s: SessionePescaDto): SceltaTurnoPesca | null {
  if (s.turno.revocato || !s.turno.firma) return null;
  return s.turno.origine === 'quota-storica' ? { tipo: 'contatore-storico', firmaContatore: s.turno.firma }
    : { tipo: 'esistente', ordine: s.turno.ordine, firmaTurno: s.turno.firma };
}

/** La richiesta della visita, nella forma di sempre: una visita nuova, o una registrazione in più su una visita già segnata. */
export function richiestaVisita({ operazioneId, momento, fonte, collega, turno, osservazione }: {
  operazioneId: string; momento: MomentoPesca; fonte: FontePesca; collega: string | null; turno: SceltaTurnoPesca; osservazione: OsservazionePesca;
}): NuovaSessionePesca {
  return { operazioneId, momento: { ...momento }, fonte: { ...fonte }, scelta: collega ? { tipo: 'collega', sessioneId: collega } : { tipo: 'nuova' }, turno, osservazione: structuredClone(osservazione) };
}

/** «1ª», «2ª»…: l'ordine della visita detto da giocatore. */
export const ordinale = (n: number): string => `${n}ª`;
