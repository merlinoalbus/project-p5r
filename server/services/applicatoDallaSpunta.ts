// ============================================================
// applicatoDallaSpunta — ciò che la spunta di una voce ha applicato ed è ancora in vigore, in parole e col momento (2026-10-26)
// ============================================================
//
// Richiesta dell'utente sulla finestra «Ricevute della spunta» (che mostrava «Incontro e contesto della spunta · data · annullata»):
// «a che serve? … mi serve sapere quando è stata applicata e cosa è stato applicato per annullare in caso di decheck della casella. ma una
// volta annullata l'informazione non mi è più utile... perchè salvarla?».
//
// Le ricevute restano tutte nel database (il server le usa per annullare, ripristinare, raccordare acquisti e pesca e provare gli
// assorbimenti); qui si legge soltanto ciò che conta per chi gioca: le cose che la spunta ha registrato nella partita e che sono ancora
// in vigore. Non tutte tornano com'erano togliendo la spunta: le Doti si segnano a mano (proposte da confermare con «Applica») e le
// letture non tornano indietro (`partiteService`, `effettiAzioneService`); il resto sì. Le fonti, ognuna col suo momento:
//   - le ricevute ATTIVE di `utente.effetto_applicato` (Doti, letture, turni, incontro e punti del Confidente, aperture dei Dedali,
//     consumazioni, pesca, yen proposti con «Applica»). Le annullate no; le puramente tecniche (il «contesto» senza niente dentro, i segni
//     di annullo) nemmeno, né ciò che non ha dato niente (la Dote con «nessuna nota», la lettura già al massimo senza Doti, `puntiUtili`);
//     gli yen mossi da soli si dicono dal loro movimento, non due volte;
//   - gli effetti di stato segnati dalla spunta (`utente.effetto_stato_voce`, `effettiDiStatoApplicati`): Persona, trofeo, sblocco,
//     oggetto, evento di storia, domanda, cruciverba, Richiesta, articolo, invito. Quelli che c'erano già no;
//   - la Fortuna di Chihaya accesa dalla voce (`fortunaAccesaDallaVoce`);
//   - gli yen mossi da soli (`yenAutomaticiDellaVoce`, già letti dalla voce), con l'importo davvero mosso (`fraseMovimentoYen`).
// Le frasi sono quelle dell'app (`descriviEffetti`, `fraseEffettoConNomi`, `fraseMovimentoYen`): nessuna seconda scrittura delle parole.
// Sola lettura.
// ============================================================

import { HttpError } from '../utils/httpError.js';
import { leggiRicevutaEffettiAzione } from './effettiAzioneService.js';
import { articoloConNome, nomiFraseEffetto } from './azioniStrutturateService.js';
import { effettiDiStatoApplicati } from './effettiDiStatoService.js';
import { fortunaAccesaDallaVoce } from './fortunaService.js';
import { descriviEffetti } from '../../shared/descriviEffettiSpunta.js';
import { fraseEffettoConNomi, normalizzaEffettoVoce, type NomiFraseEffetto, type ReceiptEffettoVoceDto, type StatoEffettiVoceDto } from '../../shared/effettiVoce.js';
import { fraseMovimentoYen, type MovimentoYenAutomaticoDto } from '../../shared/yenAutomatici.js';
import type { ApplicatoDallaSpuntaDto, EffettiAzioneDto } from '../../shared/types.js';

/** Il nome del tipo di una ricevuta di punti, quando la sua fotografia non si lascia leggere (la ricevuta resta attiva e va detta). */
const NOME_TIPO: Partial<Record<ReceiptEffettoVoceDto['tipo'], string>> = { dote: 'Dote', lettura: 'Lettura o gioco', turno: 'Turno' };

/** La fotografia dei punti della ricevuta (Doti, letture, turni, incontro, Confidente, aperture), o null se manca; `undefined` se illeggibile. */
function legacyDi(r: ReceiptEffettoVoceDto): EffettiAzioneDto | null | undefined {
  if (r.ricevuta.legacy === undefined || r.ricevuta.legacy === null) return null;
  try { return leggiRicevutaEffettiAzione(JSON.stringify(r.ricevuta.legacy)); }
  catch (e) { if (e instanceof HttpError) return undefined; throw e; }
}

/** Ciò che resta del «contesto» della spunta da dire: l'incontro solo se ha contato davvero (o ha alzato il rango), i punti del Confidente,
 *  le aperture. Un incontro «già contato» senza rango non ha messo niente nella partita: è tecnico. */
function contestoUtile(l: EffettiAzioneDto): EffettiAzioneDto {
  const incontro = l.incontro && (!l.incontro.giaContato || l.incontro.rango) ? l.incontro : undefined;
  return { doti: [], confidente: l.confidente, ...(incontro ? { incontro } : {}), ...(l.apertureDedali?.length ? { apertureDedali: l.apertureDedali } : {}) };
}

/** Ciò che resta di una ricevuta di Doti, letture o turni da dire: via le Doti che non hanno dato niente (la «nessuna nota» scelta alla
 *  spunta, `effettiAzioneService`: «la ricevuta lo ricorda, nessuna proposta»; i punti a zero) e le letture che non sono avanzate (già al
 *  massimo) senza Doti dell'elemento. I turni restano tutti: la spunta ha registrato il turno, anche «senza punti». */
function puntiUtili(l: EffettiAzioneDto): EffettiAzioneDto {
  const doti = l.doti.filter((d) => !(d.scelta && d.note === 0) && d.delta > 0);
  const letture = l.letture?.filter((x) => x.dopo > x.prima || (x.doti?.length ?? 0) > 0);
  return { ...l, doti, ...(l.letture ? { letture } : {}) };
}

/** La frase di una ricevuta attiva, o null se non dice niente a chi gioca. */
function fraseRicevuta(r: ReceiptEffettoVoceDto, nomi: NomiFraseEffetto): string | null {
  if (r.tipo === 'dote' || r.tipo === 'lettura' || r.tipo === 'turno' || r.tipo === 'contesto') {
    const l = legacyDi(r);
    if (l === undefined) return r.tipo === 'contesto' ? null : NOME_TIPO[r.tipo] ?? null;
    if (l === null) return null;
    // la paga dei turni no: gli yen davvero mossi hanno la loro riga (un turno di prima degli yen automatici non ha mosso la paga);
    // se dopo i filtri non resta niente, la riga non c'è (né il pulsante, né il numero)
    return descriviEffetti(r.tipo === 'contesto' ? contestoUtile(l) : puntiUtili(l), { senzaPaga: true }) || null;
  }
  if (r.tipo === 'acquisto') {
    const nome = (r.chiave ? articoloConNome(r.chiave)?.nome : undefined) ?? 'articolo';
    return r.creato ? `Consumazione registrata: ${nome}` : `Consumazione già registrata, collegata alla voce: ${nome}`;
  }
  if (r.tipo === 'pesca') return r.creato ? 'Sessione di pesca a Ichigaya registrata' : 'Sessione di pesca a Ichigaya già registrata, collegata alla voce';
  if (r.tipo === 'yen') {
    // gli yen mossi da soli si dicono dal loro movimento, con l'importo reale; qui solo quelli rimasti alla proposta «Applica»
    if (r.ricevuta.yenAutomatici === true) return null;
    const e = normalizzaEffettoVoce((r.prima as { effetto?: unknown } | null)?.effetto);
    return e?.tipo === 'yen' ? fraseEffettoConNomi(e, nomi) : null;
  }
  return null;
}

/**
 * Le cose che la spunta della voce ha applicato nella partita `p` e che sono in vigore, in ordine di momento. `ricevute` e
 * `movimenti` sono quelli già letti per la voce (`leggiRicevuteEffettiVoce`, `yenAutomaticiDellaVoce`); `fonte` dà le copie degli articoli.
 */
export function applicatoDallaSpunta(p: number, voceUid: string, fonte: StatoEffettiVoceDto, ricevute: readonly ReceiptEffettoVoceDto[], movimenti: readonly MovimentoYenAutomaticoDto[]): ApplicatoDallaSpuntaDto[] {
  const nomi = nomiFraseEffetto();
  // l'articolo comprato senza prezzo nella frase: lo yen davvero scalato ha la sua riga (il movimento), e il prezzo non si ripete
  const nomiSenzaPrezzo: NomiFraseEffetto = { ...nomi, articolo: (k) => { const a = nomi.articolo(k); return a ? { nome: a.nome, prezzo: null } : undefined; } };
  const out: ApplicatoDallaSpuntaDto[] = [];
  for (const r of ricevute) {
    if (r.annullatoIl) continue;
    const testo = fraseRicevuta(r, nomi);
    if (testo) out.push({ id: `ricevuta:${r.id}`, testo, applicatoIl: r.applicatoIl });
  }
  const quantita = (uid: string): number | undefined => { const e = fonte.effetti.find((x) => x.uid === uid)?.effetto; return e?.tipo === 'articolo' ? e.quantita : undefined; };
  for (const s of effettiDiStatoApplicati(p, voceUid, quantita)) out.push({ id: `stato:${s.effettoUid}`, testo: fraseEffettoConNomi(s.effetto, nomiSenzaPrezzo), applicatoIl: s.applicatoIl });
  const fortuna = fortunaAccesaDallaVoce(p, voceUid);
  if (fortuna) out.push({ id: 'fortuna', testo: fraseEffettoConNomi({ tipo: 'fortuna', dote: fortuna.dote }, nomi), applicatoIl: fortuna.accesoIl });
  for (const m of movimenti) out.push({ id: `yen:${m.causa}:${m.chiave}`, testo: `${m.motivo} · ${fraseMovimentoYen(m)}`, applicatoIl: m.creatoIl });
  // in ordine di momento; a parità, nell'ordine delle fonti qui sopra (sort stabile)
  return out.sort((a, b) => (a.applicatoIl < b.applicatoIl ? -1 : a.applicatoIl > b.applicatoIl ? 1 : 0));
}
