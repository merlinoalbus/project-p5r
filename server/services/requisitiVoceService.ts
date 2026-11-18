// ============================================================
// requisitiVoceService — i requisiti «da avere in scorta» di una voce del Diario e le loro caselle nella partita
// ============================================================
//
// Richiesta dell'utente: ogni azione del Diario può chiedere un elenco di arcani o di Persona specifiche «da avere in scorta» prima di essere
// spuntata (la Stanza di Velluto, le fusioni dei giorni dopo). L'elenco è del canone: sta nel file di gioco (`voce_requisito_scorta`, con la
// voce, in ordine), lo scrive solo l'editor della voce e lo porta il pacchetto. La casella di ogni requisito sta nel file delle partite
// (`spunta_requisito_voce_partita`, per partita) ed è un promemoria MANUALE: non legge né scrive la scorta (`persona_posseduta`). La spunta
// della voce è consentita solo con tutte le caselle spuntate (`verificaRequisitiVoce`); togliere la spunta è sempre libero, e le caselle
// restano com'erano; una voce già spuntata non si rompe se dopo le si aggiunge un requisito.
//
// `persona_id` 0 nelle caselle = «una Persona qualunque dell'arcano» (il requisito di sola arcano ha `persona_id` NULL nel file di gioco): una
// chiave primaria della partita non ammette NULL. Il modulo non importa il servizio della giornata: è questo a chiamarlo.
// ============================================================

import { prepared, nowIso } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { verificaPartita } from './verificaPartita.js';
import {
  PERSONA_QUALUNQUE, chiaveRequisito, normalizzaRequisitiVoce,
  type RequisitoVoceDto, type RequisitoVoceInput,
} from '../../shared/requisitiVoce.js';

interface RigaRequisito {
  voce_uid: string; arcana_chiave: string; persona_id: number | null;
  arcana_nome: string; persona_nome: string | null;
}

/** Le righe dei requisiti nel loro ordine: arcano e Persona col nome italiano (quello originale se manca la resa). */
const SELECT_REQUISITI = `SELECT r.voce_uid, r.arcana_chiave, r.persona_id,
    COALESCE(NULLIF(ta.testo, ''), r.arcana_chiave) AS arcana_nome, COALESCE(NULLIF(tp.testo, ''), p.nome) AS persona_nome
  FROM voce_requisito_scorta r
  LEFT JOIN traduzione ta ON ta.ambito = 'arcana' AND ta.chiave = r.arcana_chiave
  LEFT JOIN persona p ON p.id = r.persona_id
  LEFT JOIN traduzione tp ON tp.ambito = 'persona' AND tp.chiave = p.nome`;

const idCasella = (persona: number | null): number => persona ?? PERSONA_QUALUNQUE;

/**
 * I requisiti delle voci di un giorno (o di una sola voce, o di tutte), per uid, in ordine; senza partita sono i soli requisiti del canone, con la
 * partita ognuno porta la sua casella (`fatto`). Una voce senza requisiti non compare nella mappa. Si legge una volta per giorno: il
 * contesto della giornata lo passa alle voci.
 */
export function leggiRequisitiVoci(partitaId: number | undefined, ambito: { data?: string; voceUid?: string } = {}): Map<string, RequisitoVoceDto[]> {
  const righe = (ambito.voceUid !== undefined
    ? prepared(`${SELECT_REQUISITI} WHERE r.voce_uid = ? ORDER BY r.voce_uid, r.ordine`).all(ambito.voceUid)
    : ambito.data !== undefined
    ? prepared(`${SELECT_REQUISITI} WHERE r.voce_uid IN (SELECT uid FROM voce_giornata WHERE data = ?) ORDER BY r.voce_uid, r.ordine`).all(ambito.data)
    : prepared(`${SELECT_REQUISITI} ORDER BY r.voce_uid, r.ordine`).all()) as RigaRequisito[];
  const fatte = new Set<string>();
  if (partitaId !== undefined && righe.length > 0) {
    const caselle = (ambito.voceUid !== undefined
      ? prepared('SELECT voce_uid, arcana_chiave, persona_id FROM utente.spunta_requisito_voce_partita WHERE partita_id = ? AND voce_uid = ?').all(partitaId, ambito.voceUid)
      : ambito.data !== undefined
      ? prepared('SELECT voce_uid, arcana_chiave, persona_id FROM utente.spunta_requisito_voce_partita WHERE partita_id = ? AND voce_uid IN (SELECT uid FROM main.voce_giornata WHERE data = ?)').all(partitaId, ambito.data)
      : prepared('SELECT voce_uid, arcana_chiave, persona_id FROM utente.spunta_requisito_voce_partita WHERE partita_id = ?').all(partitaId)) as Array<{ voce_uid: string; arcana_chiave: string; persona_id: number }>;
    for (const c of caselle) fatte.add(`${c.voce_uid}|${chiaveRequisito(c.arcana_chiave, c.persona_id === PERSONA_QUALUNQUE ? null : c.persona_id)}`);
  }
  const out = new Map<string, RequisitoVoceDto[]>();
  for (const r of righe) {
    const dto: RequisitoVoceDto = { arcana: r.arcana_chiave, arcanaNome: r.arcana_nome, persona: r.persona_id, personaNome: r.persona_id === null ? null : r.persona_nome };
    if (partitaId !== undefined) dto.fatto = fatte.has(`${r.voce_uid}|${chiaveRequisito(r.arcana_chiave, r.persona_id)}`);
    const lista = out.get(r.voce_uid);
    if (lista) lista.push(dto); else out.set(r.voce_uid, [dto]);
  }
  return out;
}

/**
 * Verifica un elenco contro i dati di gioco, senza scrivere: forma, doppioni e «arcano intero + sua Persona» (`normalizzaRequisitiVoce`), poi
 * che ogni arcano esista e che ogni Persona esista, sia di quell'arcano e non sia del gruppo (le Persona del gruppo non entrano in scorta).
 * Restituisce l'elenco pulito, oppure la frase del primo problema.
 */
export function controllaRequisitiVoce(input: readonly RequisitoVoceInput[]): { ok: true; requisiti: Array<{ arcana: string; persona: number | null }> } | { ok: false; motivo: string } {
  const n = normalizzaRequisitiVoce(input);
  if (!n.ok) return n;
  for (const r of n.requisiti) {
    if (!prepared('SELECT 1 FROM arcana WHERE chiave = ?').get(r.arcana)) return { ok: false, motivo: `L'arcano «${r.arcana}» non esiste.` };
    if (r.persona === null) continue;
    const p = prepared('SELECT nome, arcana, del_party FROM persona WHERE id = ?').get(r.persona) as { nome: string; arcana: string; del_party: number } | undefined;
    if (!p) return { ok: false, motivo: `La Persona ${r.persona} non esiste.` };
    if (p.del_party === 1) return { ok: false, motivo: `«${p.nome}» è una Persona del gruppo: non entra in scorta, non si può richiedere.` };
    if (p.arcana !== r.arcana) return { ok: false, motivo: `«${p.nome}» non è dell'arcano «${r.arcana}».` };
  }
  return n;
}

/**
 * Sostituisce l'elenco dei requisiti della voce con quello dato (anche vuoto = li toglie tutti), nella transazione di chi chiama. L'ordine si
 * ricompatta (0, 1, 2…). Le caselle dei SOLI requisiti tolti si cancellano in tutte le partite; quelle dei requisiti che restano non si
 * toccano. Solo un'azione ha requisiti: un elenco non vuoto su un promemoria è 400 `requisiti-solo-azione`; un elenco non valido, 400
 * `requisiti-non-validi`. Va chiamata con la voce già scritta (il legame ha chiave esterna sull'uid).
 */
export function salvaRequisitiVoce(uid: string, input: readonly RequisitoVoceInput[], genere: string): void {
  if (genere !== 'azione' && input.length > 0) throw httpErrors.badRequest('requisiti-solo-azione', 'Solo un’azione può avere requisiti da avere in scorta.');
  const c = controllaRequisitiVoce(input);
  if (!c.ok) throw httpErrors.badRequest('requisiti-non-validi', c.motivo);
  const prima = prepared('SELECT arcana_chiave, persona_id FROM voce_requisito_scorta WHERE voce_uid = ?').all(uid) as Array<{ arcana_chiave: string; persona_id: number | null }>;
  const restano = new Set(c.requisiti.map((r) => chiaveRequisito(r.arcana, r.persona)));
  prepared('DELETE FROM voce_requisito_scorta WHERE voce_uid = ?').run(uid);
  c.requisiti.forEach((r, i) => prepared('INSERT INTO voce_requisito_scorta (voce_uid, ordine, arcana_chiave, persona_id) VALUES (?, ?, ?, ?)').run(uid, i, r.arcana, r.persona));
  for (const t of prima) {
    if (restano.has(chiaveRequisito(t.arcana_chiave, t.persona_id))) continue;
    prepared('DELETE FROM utente.spunta_requisito_voce_partita WHERE voce_uid = ? AND arcana_chiave = ? AND persona_id = ?').run(uid, t.arcana_chiave, idCasella(t.persona_id));
  }
}

/**
 * Spunta o toglie la casella di un requisito della voce nella partita. Idempotente: spuntare una casella già spuntata non cambia niente (né il
 * suo momento), toglierne una vuota neppure. Non legge né scrive la scorta. 404 `requisito-non-trovato` se la voce non ha quel requisito
 * (la voce che non esiste è 404 `voce-non-trovata`, la partita 404 `partita-non-trovata`).
 */
export function impostaRequisitoVoce(partitaId: number, uid: string, arcana: string, persona: number | null, fatto: boolean): void {
  verificaPartita(partitaId);
  if (!prepared('SELECT 1 FROM voce_giornata WHERE uid = ?').get(uid)) throw httpErrors.notFound('voce-non-trovata', 'Questa voce non c’è.');
  const esiste = persona === null
    ? prepared('SELECT 1 FROM voce_requisito_scorta WHERE voce_uid = ? AND arcana_chiave = ? AND persona_id IS NULL').get(uid, arcana)
    : prepared('SELECT 1 FROM voce_requisito_scorta WHERE voce_uid = ? AND arcana_chiave = ? AND persona_id = ?').get(uid, arcana, persona);
  if (!esiste) throw httpErrors.notFound('requisito-non-trovato', 'Questa voce non ha questo requisito da avere in scorta.');
  const casella = idCasella(persona);
  if (fatto) {
    const nuova = prepared('INSERT OR IGNORE INTO utente.spunta_requisito_voce_partita (partita_id, voce_uid, arcana_chiave, persona_id, fatto_at) VALUES (?, ?, ?, ?, ?)')
      .run(partitaId, uid, arcana, casella, nowIso()).changes > 0;
    if (nuova) prepared('UPDATE utente.partita SET updated_at = ? WHERE id = ?').run(nowIso(), partitaId);
  } else if (prepared('DELETE FROM utente.spunta_requisito_voce_partita WHERE partita_id = ? AND voce_uid = ? AND arcana_chiave = ? AND persona_id = ?').run(partitaId, uid, arcana, casella).changes > 0) {
    prepared('UPDATE utente.partita SET updated_at = ? WHERE id = ?').run(nowIso(), partitaId);
  }
}

/** La frase di quante caselle mancano, al singolare o al plurale. */
const fraseMancano = (n: number): string => (n === 1 ? 'Manca 1 casella della scorta' : `Mancano ${n} caselle della scorta`);

/**
 * Chiamata dalla spunta della voce (prima spunta, dentro la sua transazione): 409 `requisiti-incompleti` se la voce ha requisiti e nella
 * partita non sono tutti spuntati, con `details { mancano, totale }`. Una voce senza requisiti passa. Non si chiama togliendo la spunta né
 * su una spunta già presente.
 */
export function verificaRequisitiVoce(partitaId: number, uid: string): void {
  const r = prepared(`SELECT COUNT(*) AS totale,
      COALESCE(SUM(CASE WHEN s.voce_uid IS NULL THEN 1 ELSE 0 END), 0) AS mancano
    FROM voce_requisito_scorta q
    LEFT JOIN utente.spunta_requisito_voce_partita s ON s.partita_id = ? AND s.voce_uid = q.voce_uid AND s.arcana_chiave = q.arcana_chiave AND s.persona_id = COALESCE(q.persona_id, 0)
    WHERE q.voce_uid = ?`).get(partitaId, uid) as { totale: number; mancano: number };
  if (r.mancano > 0) throw httpErrors.conflict('requisiti-incompleti', `${fraseMancano(r.mancano)}.`, { mancano: r.mancano, totale: r.totale });
}
