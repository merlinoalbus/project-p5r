// ============================================================
// proposteConversioneService — le proposte «da completare» sulle voci del Diario: elenco, applica, scarta (L13, ondata 4a)
// ============================================================
//
// Il modello è in `shared/proposteConversione.ts`, la tabella nella migrazione 236. Solo preparazione: nessuna di queste rotte è
// nell'elenco del giocatore (`server/rilascio/rotteGiocatore.ts`) e l'edizione di rilascio esce con la tabella vuota.
//
// **Applicare** scrive la voce con `aggiornaVoce`, la STESSA funzione della finestra della voce: il collegamento si verifica, gli effetti
// passano da `salvaEffettiVoce` (revisione attesa, UID, verifiche di ogni effetto, regola degli yen), e le partite che hanno già spuntato la
// voce ricevono le loro proposte «Applica» come per ogni altra modifica; le ricevute salvate non si riscrivono. Due modi:
//   - dalla proposta: agli effetti di adesso si tolgono quelli di `togli` e si aggiungono i proposti (completati da chi applica; un effetto
//     già presente, identico, non si aggiunge una seconda volta), con il tipo e il collegamento proposti;
//   - da «Modifica»: la voce come l'ha salvata la finestra (`voce`), che parte dalla proposta e può cambiarla.
// In tutti e due i casi la proposta diventa «applicata» nella stessa transazione, con l'esito (che cosa è stato scritto). **Scartare** la
// chiude e basta. La revisione (impronta di proposta e voce) impedisce di decidere su una vista vecchia.
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { ordineGioco } from '../../shared/condizioniSpillo.js';
import { TIPI_AZIONE, TIPI_RIFERIMENTO_AZIONE, type TipoAzione, type TipoRiferimentoAzione } from '../../shared/effettiAzione.js';
import { normalizzaEffettoVoce, type EffettoVoce } from '../../shared/effettiVoce.js';
import {
  elementoDi, leggiCampiDaCompletare, leggiEffettoProposto,
  type EffettoPropostoDto, type FiltroProposte, type PropostaConversioneDto, type RichiestaApplicaProposta, type RichiestaScartaProposta,
} from '../../shared/proposteConversione.js';
import type { AzionePercorsoDto, DatiVoceGiornata } from '../../shared/types.js';
import { leggiEffettiVoce } from './motoreDiario.js';
import { aggiornaVoce, vocePercorso } from './giornataService.js';
import { improntaDato, jsonCanonico } from './propostePartitaService.js';

interface RigaProposta {
  id: string; voce_uid: string; lotto: string; tipo_proposto: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null;
  effetti_json: string; togli_json: string; motivo: string; certezza: PropostaConversioneDto['certezza']; stato: PropostaConversioneDto['stato'];
  esito_json: string | null; creata_il: string; decisa_il: string | null;
}
interface RigaVoce { uid: string; data: string; fascia: string; ordine: number; azione: string; tipo: string; riferimento_tipo: string | null; riferimento_chiave: string | null }

const TIPI = new Set<string>(TIPI_AZIONE.map((t) => t.chiave));
const TIPI_RIF = new Set<string>(TIPI_RIFERIMENTO_AZIONE.map((t) => t.chiave));

const leggiJson = (raw: string): unknown => { try { return JSON.parse(raw) as unknown; } catch { return undefined; } };

/** La proposta come la legge la pagina: tutto per intero, oppure `leggibile: false` con il motivo (si può solo scartare). */
function propostaDto(r: RigaProposta, v: RigaVoce): PropostaConversioneDto {
  const fonte = leggiEffettiVoce(v.uid);
  const problemi: string[] = [];
  const tipo = r.tipo_proposto === null ? null : TIPI.has(r.tipo_proposto) ? r.tipo_proposto as TipoAzione : (problemi.push(`tipo «${r.tipo_proposto}» sconosciuto`), null);
  const riferimento = r.riferimento_tipo && r.riferimento_chiave
    ? TIPI_RIF.has(r.riferimento_tipo) ? { tipo: r.riferimento_tipo as TipoRiferimentoAzione, chiave: r.riferimento_chiave } : (problemi.push(`collegamento «${r.riferimento_tipo}» sconosciuto`), null)
    : null;
  const effetti: EffettoPropostoDto[] = [];
  const grezzi = leggiJson(r.effetti_json);
  if (!Array.isArray(grezzi)) problemi.push('effetti illeggibili');
  else for (const [i, g] of grezzi.entries()) {
    const o = g && typeof g === 'object' && !Array.isArray(g) ? g as Record<string, unknown> : null;
    const completa = leggiCampiDaCompletare(o?.completa);
    const scelte = o?.scelte === undefined || o?.scelte === null ? null : Array.isArray(o.scelte) && o.scelte.every((s) => typeof s === 'string' && s.length > 0) ? o.scelte as string[] : undefined;
    const effetto = completa ? leggiEffettoProposto(o?.effetto, completa) : null;
    if (!o || !completa || scelte === undefined || !effetto) { problemi.push(`effetto ${i + 1} non riconoscibile`); continue; }
    effetti.push({ effetto, completa, scelte, giaPresente: fonte.effetti.some((e) => jsonCanonico(e.effetto) === jsonCanonico(effetto)) });
  }
  const uidTogli = leggiJson(r.togli_json);
  const togli = Array.isArray(uidTogli) && uidTogli.every((u) => typeof u === 'string')
    ? (uidTogli as string[]).map((uid) => ({ uid, effetto: fonte.effetti.find((e) => e.uid === uid)?.effetto ?? null }))
    : (problemi.push('effetti da togliere illeggibili'), []);
  if (fonte.stato !== 'convertita') problemi.push('gli effetti della voce sono ancora nel formato storico da correggere');
  const riferimentoAttuale = v.riferimento_tipo && v.riferimento_chiave && TIPI_RIF.has(v.riferimento_tipo) ? { tipo: v.riferimento_tipo as TipoRiferimentoAzione, chiave: v.riferimento_chiave } : null;
  return {
    id: r.id, voceUid: v.uid, giorno: v.data, fascia: v.fascia === 'sera' ? 'sera' : 'giorno', testo: v.azione,
    tipoAttuale: (TIPI.has(v.tipo) ? v.tipo : 'altro') as TipoAzione, riferimentoAttuale, tipo, riferimento, effetti, togli,
    motivo: r.motivo, certezza: r.certezza, lotto: r.lotto, stato: r.stato, decisaIl: r.decisa_il,
    leggibile: problemi.length === 0, problema: problemi.length ? problemi.join('; ') : null,
    revisione: improntaDato({ r, v, effetti: fonte.revisione }),
  };
}

const voceDi = (uid: string): RigaVoce | undefined =>
  prepared('SELECT uid, data, fascia, ordine, azione, tipo, riferimento_tipo, riferimento_chiave FROM main.voce_giornata WHERE uid = ?').get(uid) as RigaVoce | undefined;

/** Le proposte del periodo (giorni di gioco, estremi compresi) e dello stato chiesti, nell'ordine del Diario. */
export function elencaProposteConversione(f: FiltroProposte = {}): PropostaConversioneDto[] {
  const stato = f.stato ?? 'aperta';
  const righe = prepared(`SELECT p.*, v.data AS v_data FROM main.proposta_conversione_voce p JOIN main.voce_giornata v ON v.uid = p.voce_uid
    ${stato === 'tutte' ? '' : 'WHERE p.stato = ?'}`).all(...(stato === 'tutte' ? [] : [stato])) as Array<RigaProposta & { v_data: string }>;
  const da = f.da ? ordineGioco(f.da) : -Infinity, a = f.a ? ordineGioco(f.a) : Infinity;
  const voci = new Map<string, RigaVoce>();
  const fuori: Array<{ dto: PropostaConversioneDto; ordine: number }> = [];
  for (const { v_data: data, ...r } of righe) {
    const o = ordineGioco(data);
    if (o < da || o > a) continue;
    let v = voci.get(r.voce_uid);
    if (!v) { v = voceDi(r.voce_uid)!; voci.set(r.voce_uid, v); }
    // la riga senza la colonna in più del JOIN: la revisione è la stessa che `propostaAperta` ricalcola dalla sola tabella
    fuori.push({ dto: propostaDto(r, v), ordine: o * 1e6 + (v.fascia === 'sera' ? 5e5 : 0) + v.ordine });
  }
  return fuori.sort((x, y) => x.ordine - y.ordine || x.dto.id.localeCompare(y.dto.id)).map((x) => x.dto);
}

/** La proposta aperta con la revisione attesa, letta dentro la transazione; 404, 409 se decisa o cambiata. */
function propostaAperta(id: string, revisione: string): { riga: RigaProposta; voce: RigaVoce; dto: PropostaConversioneDto } {
  const riga = prepared('SELECT * FROM main.proposta_conversione_voce WHERE id = ?').get(id) as RigaProposta | undefined;
  if (!riga) throw httpErrors.notFound('proposta-non-trovata', 'Questa proposta non c’è più.');
  if (riga.stato !== 'aperta') throw httpErrors.conflict('proposta-decisa', 'Questa proposta è già stata decisa.');
  const voce = voceDi(riga.voce_uid);
  if (!voce) throw httpErrors.notFound('voce-non-trovata', 'La voce della proposta non esiste più.');
  const dto = propostaDto(riga, voce);
  if (dto.revisione !== revisione) throw httpErrors.conflict('proposta-cambiata', 'La proposta o la voce sono cambiate: rileggi prima di decidere.');
  return { riga, voce, dto };
}

/** Chiude la proposta (solo se ancora aperta) con lo stato e l'esito. */
function chiudi(id: string, stato: 'applicata' | 'scartata', esito: unknown): void {
  if (prepared("UPDATE main.proposta_conversione_voce SET stato = ?, decisa_il = ?, esito_json = ? WHERE id = ? AND stato = 'aperta'").run(stato, nowIso(), esito === null ? null : jsonCanonico(esito), id).changes !== 1) {
    throw httpErrors.conflict('proposta-decisa', 'Questa proposta è già stata decisa.');
  }
}

/** I dati della voce che la proposta scrive (tipo, collegamento, effetti) a partire dagli effetti di adesso; null se non cambia nulla. */
function composizione(dto: PropostaConversioneDto, completati: EffettoVoce[] | undefined): { dati: DatiVoceGiornata; aggiunti: number; giaPresenti: number } {
  const fonte = leggiEffettiVoce(dto.voceUid);
  if (dto.effetti.some((e) => e.completa.length > 0) && completati === undefined) throw httpErrors.badRequest('proposta-da-completare', 'Completa i dati che la proposta chiede prima di applicarla.');
  if (completati !== undefined && completati.length !== dto.effetti.length) throw httpErrors.badRequest('proposta-da-completare', 'Gli effetti completati non corrispondono a quelli della proposta.');
  const finali = dto.effetti.map((p, i) => {
    const e = normalizzaEffettoVoce(completati ? completati[i] : p.effetto);
    if (!e || e.tipo !== p.effetto.tipo) throw httpErrors.badRequest('proposta-da-completare', `L’effetto ${i + 1} della proposta non è completo.`);
    if (p.scelte && !p.scelte.includes(elementoDi(e))) throw httpErrors.badRequest('proposta-fuori-scelta', `L’effetto ${i + 1} va scelto fra quelli che la proposta indica.`);
    // senza «completa», l'effetto è quello della proposta: chi applica non lo riscrive di nascosto
    if (!p.completa.length && jsonCanonico(e) !== jsonCanonico(p.effetto)) throw httpErrors.badRequest('proposta-diversa', `L’effetto ${i + 1} non è quello della proposta: per cambiarlo usa «Modifica».`);
    return e;
  });
  const restano = fonte.effetti.filter((e) => !dto.togli.some((t) => t.uid === e.uid)).map((e) => ({ uid: e.uid as string | null, effetto: e.effetto }));
  let giaPresenti = 0;
  for (const e of finali) {
    if (restano.some((r) => jsonCanonico(r.effetto) === jsonCanonico(e))) giaPresenti += 1;
    else restano.push({ uid: null, effetto: e });
  }
  const cambianoEffetti = restano.length !== fonte.effetti.length || restano.some((r, i) => r.uid !== fonte.effetti[i]?.uid);
  const dati: DatiVoceGiornata = {
    ...(dto.tipo && dto.tipo !== dto.tipoAttuale ? { tipo: dto.tipo } : {}),
    ...(dto.riferimento && (dto.riferimento.tipo !== dto.riferimentoAttuale?.tipo || dto.riferimento.chiave !== dto.riferimentoAttuale?.chiave) ? { riferimento: dto.riferimento } : {}),
    ...(cambianoEffetti ? { effettiVoce: { effetti: restano, revisioneEffettiAttesa: fonte.revisione } } : {}),
  };
  return { dati, aggiunti: finali.length - giaPresenti, giaPresenti };
}

/**
 * Applica la proposta: con `voce` (da «Modifica») scrive quella; altrimenti compone tipo, collegamento ed effetti dalla proposta. In ogni caso
 * con `aggiornaVoce`, e nella stessa transazione la proposta diventa «applicata». Una proposta illeggibile non si applica; una superata (un
 * effetto da togliere che non c'è più) solo da «Modifica».
 */
export function applicaPropostaConversione(id: string, r: RichiestaApplicaProposta, partitaId?: number): { proposta: PropostaConversioneDto; voce: AzionePercorsoDto } {
  return getDb().transaction(() => {
    const { voce, dto } = propostaAperta(id, r.revisionePropostaAttesa);
    if (!dto.leggibile) throw httpErrors.conflict('proposta-illeggibile', `La proposta non si legge per intero (${dto.problema}): si può solo scartare.`);
    // superata (un effetto da togliere non c'è più): dalla proposta no; da «Modifica» sì, perché la voce che si salva l'ha rivista chi applica
    if (r.voce === undefined && dto.togli.some((t) => t.effetto === null)) throw httpErrors.conflict('proposta-superata', 'Un effetto che la proposta toglie non è più sulla voce: la proposta è superata, scartala o usa «Modifica».');
    let esito: Record<string, unknown>;
    let dati: DatiVoceGiornata;
    if (r.voce !== undefined) {
      if (r.effetti !== undefined) throw httpErrors.badRequest('fonti-concorrenti', 'Invia la voce della finestra oppure gli effetti completati, non tutti e due.');
      dati = r.voce;
      esito = { modo: 'modifica', dati };
    } else {
      const c = composizione(dto, r.effetti);
      dati = c.dati;
      esito = { modo: 'proposta', dati, aggiunti: c.aggiunti, giaPresenti: c.giaPresenti, tolti: dto.togli.length };
    }
    const aggiornata = Object.keys(dati).length > 0 ? aggiornaVoce(voce.uid, dati, partitaId) : null;
    chiudi(id, 'applicata', esito);
    const dopo = prepared('SELECT * FROM main.proposta_conversione_voce WHERE id = ?').get(id) as RigaProposta;
    // nessun cambiamento da scrivere (tutto già presente): la voce si rilegge com'è
    return { proposta: propostaDto(dopo, voceDi(voce.uid)!), voce: aggiornata ?? vocePercorso(voce.uid, partitaId) };
  })();
}

/** Scarta la proposta: la voce non cambia. */
export function scartaPropostaConversione(id: string, r: RichiestaScartaProposta): PropostaConversioneDto {
  return getDb().transaction(() => {
    const { voce } = propostaAperta(id, r.revisionePropostaAttesa);
    chiudi(id, 'scartata', null);
    return propostaDto(prepared('SELECT * FROM main.proposta_conversione_voce WHERE id = ?').get(id) as RigaProposta, voceDi(voce.uid)!);
  })();
}
