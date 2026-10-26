// ============================================================
// applicatoDallaSpunta — ciò che togliendo la spunta di una voce si annulla davvero, in parole e col momento (2026-10-26)
// ============================================================
//
// Richiesta dell'utente sulla finestra «Ricevute della spunta» (che mostrava «Incontro e contesto della spunta · data · annullata»):
// «a che serve? … mi serve sapere quando è stata applicata e cosa è stato applicato per annullare in caso di decheck della casella. ma una
// volta annullata l'informazione non mi è più utile... perchè salvarla?».
//
// Le ricevute restano tutte nel database (il server le usa per annullare, ripristinare, raccordare acquisti e pesca e provare gli
// assorbimenti); qui si legge soltanto ciò che conta per chi gioca: le cose che la spunta ha messo nella partita e che togliendola tornano
// com'erano (`motoreDiario.annullaEffettiVoce` e ciò che chiama). Quello che togliendo la spunta resta non si dice. Le fonti, ognuna col suo
// momento:
//   - le ricevute ATTIVE di `utente.effetto_applicato` (le annullate no; una ricevuta illeggibile non si lascia annullare e non si dice):
//       · i turni registrati (`togliTurno`), i punti del Confidente (`annullaEffetti`, a zero no), l'incontro e il rango che la spunta ha dato
//         solo se togliendola se ne vanno davvero (`incontroSiAnnulla`), le aperture dei Dedali (vivono nella spunta);
//       · le Doti (di una Dote, di una lettura, di un turno, dell'incontro) solo per la parte che le proposte «Applica» hanno messo nella
//         partita (`dotiApplicate`): togliendo la spunta l'applicato torna con la proposta inversa, l'aperta si chiude da sola e non aveva messo
//         niente, la scartata nemmeno. Stessa regola degli yen rimasti alla proposta (`fraseYenProposti`);
//       · le letture no: togliendo la spunta non tornano indietro (`annullaEffettiAzione`);
//       · la consumazione e la sessione di pesca solo se la voce è l'unica fonte che le tiene (`fonteUnica`): con un'altra fonte restano;
//   - gli effetti di stato segnati dalla spunta (`effettiDiStatoApplicati`): Persona, trofeo, sblocco, oggetto, evento di storia, domanda,
//     cruciverba, Richiesta, articolo, invito. Non quelli che c'erano già, né quelli che un'altra voce spuntata tiene comunque;
//   - la Fortuna di Chihaya accesa dalla voce e ancora del giorno di gioco (`fortunaAccesaDallaVoce`);
//   - gli yen mossi da soli (`yenAutomaticiDellaVoce`, già letti dalla voce), con l'importo davvero mosso (`fraseMovimentoYen`), se togliendo la
//     spunta tornano (`yenTornano`): un movimento a zero non ha mosso niente. Sono anche nel chip della voce: qui restano nell'elenco completo,
//     con la data, ma senza dire due volte la stessa cosa nella riga («Entrati ¥500 nel saldo», non «Yen ricevuti nella voce · Entrati…»).
// Le frasi sono quelle dell'app (`descriviEffetti`, `fraseEffettoConNomi` al passato, `fraseMovimentoYen`): nessuna seconda scrittura delle
// parole. Sola lettura.
// ============================================================

import { prepared } from '../db/dbService.js';
import { HttpError } from '../utils/httpError.js';
import { leggiRicevutaEffettiAzione } from './effettiAzioneService.js';
import { articoloConNome, nomiFraseEffetto } from './azioniStrutturateService.js';
import { effettiDiStatoApplicati } from './effettiDiStatoService.js';
import { fortunaAccesaDallaVoce } from './fortunaService.js';
import { incontroSiAnnulla } from './incontriService.js';
import { descriviEffetti } from '../../shared/descriviEffettiSpunta.js';
import { nomeDote } from '../../shared/doti.js';
import { fraseEffettoConNomi, normalizzaEffettoVoce, type EffettoConNomiVoce, type NomiFraseEffetto, type ReceiptEffettoVoceDto, type StatoEffettiVoceDto } from '../../shared/effettiVoce.js';
import { fraseMovimentoYen, type MovimentoYenAutomaticoDto } from '../../shared/yenAutomatici.js';
import type { ApplicatoDallaSpuntaDto, EffettiAzioneDto } from '../../shared/types.js';

/** La fotografia dei punti della ricevuta (Doti, letture, turni, incontro, Confidente, aperture), o null se manca o non si lascia leggere
 *  (illeggibile, `annullaEffettiAzione` la rifiuta: togliendo la spunta non si annulla niente, e una riga senza contenuto non informa). */
function legacyDi(r: ReceiptEffettoVoceDto): EffettiAzioneDto | null {
  if (r.ricevuta.legacy === undefined || r.ricevuta.legacy === null) return null;
  try { return leggiRicevutaEffettiAzione(JSON.stringify(r.ricevuta.legacy)); }
  catch (e) { if (e instanceof HttpError) return null; throw e; }
}

/** Per Dote, i punti che le proposte «Applica» della causa `voce:effetto` hanno messo nella partita: applicati (`delta_applicato`) o
 *  dichiarati già nel saldo (`delta_riconosciuto`), al netto delle inverse. Le aperte e le scartate non hanno messo niente. */
function dotiApplicate(p: number, causaChiave: string): Map<string, number> {
  const righe = prepared(`SELECT chiave, SUM(delta_applicato + delta_riconosciuto) AS n FROM utente.da_applicare
    WHERE partita_id = ? AND causa_tipo = 'voce' AND causa_chiave = ? AND tipo = 'dote' AND stato = 'applicata' GROUP BY chiave`).all(p, causaChiave) as Array<{ chiave: string; n: number | null }>;
  return new Map(righe.flatMap((r) => (r.n ?? 0) > 0 ? [[r.chiave, r.n as number] as const] : []));
}

/** Le Doti della ricevuta da dire: solo quelle applicate (`dotiApplicate`), nell'ordine in cui la ricevuta le nomina, con il nome della
 *  ricevuta. Una Dote applicata per intero da una sola voce della ricevuta resta com'era («Perizia ♪♪ · 3 punti»); altrimenti i punti applicati. */
function dotiDaDire(l: EffettiAzioneDto, applicate: ReadonlyMap<string, number>): EffettiAzioneDto['doti'] {
  if (!applicate.size) return [];
  const tutte = [...l.doti, ...(l.letture ?? []).flatMap((x) => x.doti ?? []), ...(l.turni ?? []).flatMap((t) => t.doti), ...(l.incontro?.doti ?? [])];
  const chiavi = [...new Set([...tutte.map((d) => d.chiave), ...applicate.keys()])].filter((k) => applicate.has(k));
  return chiavi.map((chiave) => {
    const n = applicate.get(chiave)!;
    const stesse = tutte.filter((d) => d.chiave === chiave);
    const sola = stesse.length === 1 ? l.doti.find((d) => d.chiave === chiave) : undefined;
    return sola && sola.delta === n ? sola : { chiave, nome: stesse[0]?.nome ?? nomeDote(chiave), delta: n };
  });
}

/** L'incontro da dire: solo ciò che togliendo la spunta se ne va (`incontroSiAnnulla`); le sue Doti sono fra quelle applicate (`dotiDaDire`). */
function incontroDaDire(p: number, inc: NonNullable<EffettiAzioneDto['incontro']>): EffettiAzioneDto['incontro'] {
  const s = incontroSiAnnulla(p, inc);
  if (!s.rango && !s.incontro) return undefined;
  const { rango, ...resto } = inc;
  return { ...resto, doti: [], ...(s.rango && rango ? { rango } : {}) };
}

/** Ciò che di una ricevuta di punti (Dote, lettura, turno, «contesto») togliendo la spunta torna com'era. Le letture no (restano); i turni sì,
 *  senza le loro Doti (dette fra le applicate) e senza la paga (gli yen davvero mossi hanno la loro riga). */
function annullabile(p: number, r: ReceiptEffettoVoceDto, l: EffettiAzioneDto): EffettiAzioneDto {
  const incontro = l.incontro ? incontroDaDire(p, l.incontro) : undefined;
  return {
    doti: dotiDaDire(l, dotiApplicate(p, `${r.voceUid}:${r.effettoUid}`)),
    // i punti del Confidente sono una differenza arrotondata: a zero non hanno messo niente nella partita (niente «+0 punti»)
    confidente: l.confidente && l.confidente.punti > 0 ? l.confidente : null,
    ...(l.turni?.length ? { turni: l.turni.map((t) => ({ ...t, doti: [] })) } : {}),
    ...(incontro ? { incontro } : {}),
    ...(l.apertureDedali?.length ? { apertureDedali: l.apertureDedali } : {}),
  };
}

/** La consumazione o la sessione di pesca della ricevuta se ne va togliendo la spunta solo se la sua fonte c'è ancora e nessun'altra la tiene
 *  (un'altra voce o un segno a mano): `annullaFontiDiarioNellaTransazione` e `rimuoviFontePescaNellaTransazione` tolgono solo la fonte della voce. */
function fonteUnica(p: number, voceUid: string, tipo: 'acquisto' | 'pesca', provenienza: unknown): boolean {
  if (typeof provenienza !== 'string') return false;
  const [tabella, colonna] = tipo === 'acquisto' ? ['acquisto_provenienza', 'acquisto_id'] : ['pesca_provenienza', 'sessione_id'];
  const f = prepared(`SELECT ${colonna} AS fatto FROM utente.${tabella} WHERE partita_id = ? AND id = ?`).get(p, provenienza) as { fatto: string } | undefined;
  if (!f) return false;
  return !prepared(`SELECT 1 FROM utente.${tabella} WHERE partita_id = ? AND ${colonna} = ? AND NOT (tipo = 'diario' AND voce_uid = ?) LIMIT 1`).get(p, f.fatto, voceUid);
}

/** Gli yen proposti con «Applica» per un effetto della voce (`utente.da_applicare`, causa `voce:effetto`, tipo `yen`): quanto le proposte
 *  applicate hanno mosso nel saldo (`delta_applicato`) o dichiarato già nel saldo (`delta_riconosciuto`), al netto delle inverse. */
function yenProposti(p: number, causaChiave: string): { mossi: number; riconosciuti: number } {
  const r = prepared(`SELECT SUM(delta_applicato) AS mossi, SUM(delta_riconosciuto) AS riconosciuti
    FROM utente.da_applicare WHERE partita_id = ? AND causa_tipo = 'voce' AND causa_chiave = ? AND tipo = 'yen' AND stato = 'applicata'`).get(p, causaChiave) as { mossi: number | null; riconosciuti: number | null };
  return { mossi: r.mossi ?? 0, riconosciuti: r.riconosciuti ?? 0 };
}

const yenLeggibili = (n: number): string => `¥${Math.abs(n).toLocaleString('it-IT')}`;

/** La frase degli yen di una ricevuta rimasta alla proposta «Applica», solo per ciò che la proposta ha messo nel saldo (togliendo la spunta
 *  torna con l'inversa): l'importo davvero mosso o dichiarato già nel saldo. Aperta («da applicare»: non ha mosso niente, togliendo la spunta
 *  si chiude da sola), scartata o tornata a zero = nessuna riga. */
function fraseYenProposti(p: number, r: ReceiptEffettoVoceDto, e: Extract<EffettoConNomiVoce, { tipo: 'yen' }>): string | null {
  const s = yenProposti(p, `${r.voceUid}:${r.effettoUid}`);
  if (s.mossi !== 0) return `${fraseMovimentoYen({ richiesto: s.mossi, applicato: s.mossi })} con «Applica»`;
  if (s.riconosciuti !== 0) return e.importo > 0 ? `${yenLeggibili(s.riconosciuti)} ricevuti nella voce, già nel saldo` : `${yenLeggibili(s.riconosciuti)} spesi nella voce, già tolti dal saldo`;
  return null;
}

/** La frase di una ricevuta attiva, o null se togliendo la spunta non si annulla niente che chi gioca veda. */
function fraseRicevuta(p: number, r: ReceiptEffettoVoceDto): string | null {
  if (r.tipo === 'dote' || r.tipo === 'lettura' || r.tipo === 'turno' || r.tipo === 'contesto') {
    const l = legacyDi(r);
    // se dopo i filtri non resta niente, la riga non c'è (né il pulsante, né il numero)
    return l ? descriviEffetti(annullabile(p, r, l), { senzaPaga: true }) || null : null;
  }
  if (r.tipo === 'acquisto') {
    if (!fonteUnica(p, r.voceUid, 'acquisto', r.ricevuta.provenienzaId)) return null;
    const nome = (r.chiave ? articoloConNome(r.chiave)?.nome : undefined) ?? 'articolo';
    return r.creato ? `Consumazione registrata: ${nome}` : `Consumazione collegata alla voce: ${nome}`;
  }
  if (r.tipo === 'pesca') {
    if (!fonteUnica(p, r.voceUid, 'pesca', r.ricevuta.provenienzaId)) return null;
    return r.creato ? 'Sessione di pesca a Ichigaya registrata' : 'Sessione di pesca a Ichigaya collegata alla voce';
  }
  if (r.tipo === 'yen') {
    // gli yen mossi da soli si dicono dal loro movimento, con l'importo reale; qui solo quelli rimasti alla proposta «Applica»
    if (r.ricevuta.yenAutomatici === true) return null;
    const e = normalizzaEffettoVoce((r.prima as { effetto?: unknown } | null)?.effetto);
    return e?.tipo === 'yen' ? fraseYenProposti(p, r, e) : null;
  }
  return null;
}

/** I motivi dei movimenti degli effetti «yen» della voce (`motoreDiario.ricevutaYen`): nella finestra della voce dicono soltanto «yen» e «nella
 *  voce», già detti dalla frase del movimento («Entrati ¥500 nel saldo»), e non si ripetono. Gli altri motivi nominano la causa e restano. */
const MOTIVI_SOLO_YEN = new Set(['Yen ricevuti nella voce', 'Yen spesi nella voce']);

/** Vero se il movimento torna togliendo la spunta: quelli degli effetti della voce (`restituisciYenAutomaticiDellaVoce`) e dei suoi turni
 *  (`restituisciYenDeiTurniDellaVoce`); la ricompensa di una Richiesta solo se togliendo la spunta la Richiesta si riapre davvero (`richieste`:
 *  le Richieste che lo stato della voce revoca); un regalo non lo toglie la spunta. */
function yenTornano(voceUid: string, m: MovimentoYenAutomaticoDto, richieste: ReadonlySet<string>): boolean {
  if (m.applicato === 0) return false;
  if (m.causa === 'voce') return m.chiave.startsWith(`${voceUid}:`);
  if (m.causa === 'turno') return true;
  if (m.causa === 'richiesta') return richieste.has(m.chiave);
  return false;
}

/**
 * Le cose che togliendo la spunta della voce nella partita `p` si annullano, in ordine di momento. `ricevute` e `movimenti` sono quelli già
 * letti per la voce (`leggiRicevuteEffettiVoce`, `yenAutomaticiDellaVoce`); `fonte` dà le copie degli articoli.
 */
export function applicatoDallaSpunta(p: number, voceUid: string, fonte: StatoEffettiVoceDto, ricevute: readonly ReceiptEffettoVoceDto[], movimenti: readonly MovimentoYenAutomaticoDto[]): ApplicatoDallaSpuntaDto[] {
  const nomi = nomiFraseEffetto();
  // l'articolo comprato senza prezzo nella frase: lo yen davvero scalato ha la sua riga (il movimento), e il prezzo non si ripete
  const nomiSenzaPrezzo: NomiFraseEffetto = { ...nomi, articolo: (k) => { const a = nomi.articolo(k); return a ? { nome: a.nome, prezzo: null } : undefined; } };
  const out: ApplicatoDallaSpuntaDto[] = [];
  for (const r of ricevute) {
    if (r.annullatoIl) continue;
    const testo = fraseRicevuta(p, r);
    if (testo) out.push({ id: `ricevuta:${r.id}`, testo, applicatoIl: r.applicatoIl });
  }
  const quantita = (uid: string): number | undefined => { const e = fonte.effetti.find((x) => x.uid === uid)?.effetto; return e?.tipo === 'articolo' ? e.quantita : undefined; };
  const stati = effettiDiStatoApplicati(p, voceUid, quantita);
  for (const s of stati) out.push({ id: `stato:${s.effettoUid}`, testo: fraseEffettoConNomi(s.effetto, nomiSenzaPrezzo, { applicato: true }), applicatoIl: s.applicatoIl });
  const fortuna = fortunaAccesaDallaVoce(p, voceUid);
  if (fortuna) out.push({ id: 'fortuna', testo: fraseEffettoConNomi({ tipo: 'fortuna', dote: fortuna.dote }, nomi, { applicato: true }), applicatoIl: fortuna.accesoIl });
  const richieste = new Set(stati.flatMap((s) => s.effetto.tipo === 'richiesta' ? [s.effetto.richiesta] : []));
  for (const m of movimenti) {
    if (!yenTornano(voceUid, m, richieste)) continue;
    const frase = fraseMovimentoYen(m);
    out.push({ id: `yen:${m.causa}:${m.chiave}`, testo: MOTIVI_SOLO_YEN.has(m.motivo) ? frase : `${m.motivo} · ${frase}`, applicatoIl: m.creatoIl });
  }
  // in ordine di momento; a parità, nell'ordine delle fonti qui sopra (sort stabile)
  return out.sort((a, b) => (a.applicatoIl < b.applicatoIl ? -1 : a.applicatoIl > b.applicatoIl ? 1 : 0));
}
