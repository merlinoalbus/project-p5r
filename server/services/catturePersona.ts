// ============================================================
// catturePersona — la cattura di una Persona è una sola: la registrazione nel compendio della partita (2026-10-12; L8 B6, 2026-10-24)
// ============================================================
//
// Scelte dell'utente: «Se la persona è catturata vale per tutte le aree e i dedali»; «La cattura o meno delle Persona puoi
// valutarla dal compendio... dove vedi se una persona è stata sbloccata o meno nella partita». Rilievo F1 del validatore: lo
// stato di una voce (`punto_partita`) era un secondo modo di segnarla, che l'interfaccia non usa più. Scelta dell'utente sul
// rilievo («Leggono il compendio»):
//   - una voce Persona che si cattura non ha uno stato suo: segnarla dalla guida si rifiuta (`cattura-nel-compendio`),
//     e un pin non vi si collega (il pin la segnerebbe in `punto_partita`);
//   - una condizione «Voce della guida» che la cita è verde se la sua Persona è registrata nel compendio della partita:
//     resta citabile nell'editor delle mappe.
// L8 (R8-12, R8-14): vale per ogni voce Persona da catturare, non più solo per i dedali dei Memento. Una voce è «di cattura» se
//   - sta in un dedalo dei Memento (la sua Persona viene dalla maschera, come prima), oppure
//   - è collegata a un'Ombra con una Persona del compendio (`ombra_voce`: le 38 voci Persona dei Palazzi, Iweleth compreso), oppure
//   - porta una maschera scelta dall'utente (una voce Persona aggiunta a un Palazzo con la sua Persona).
// Le voci Persona che non sono Ombre (le due narrative di Kamoshida, la tabella di Okumura) restano voci come le altre, con lo
// stato in `punto_partita`: non si convertono.
// La Persona di una voce è quella della sua maschera (lo sceglie l'utente dal compendio) e, se la maschera manca, quella
// dell'Ombra; se l'Ombra non è catturabile (Babau/Bugs) la voce non espone il gesto di cattura dall'incontro, ma la Persona resta
// registrabile dal compendio e per fusione.
// ============================================================

import { prepared } from '../db/dbService.js';
import { httpErrors, type HttpError } from '../utils/httpError.js';
import { indiceMaschere, personaDellaMaschera, type IndiceMaschere } from './maschere.js';
import type { PersonaDellaMascheraDto } from '../../shared/types.js';

/** Vera (in SQL) se la voce con l'alias dato è una Persona da catturare (vedi l'intestazione). */
export const sqlVoceDiCattura = (alias: string): string => `(${alias}.tipo = 'persona' AND (
  ${alias}.area_chiave IN (SELECT a.chiave FROM dungeon_area a JOIN dungeon d ON d.chiave = a.dungeon_chiave WHERE d.tipo = 'mementos')
  OR EXISTS (SELECT 1 FROM ombra_voce ov JOIN ombra o ON o.chiave = ov.ombra_chiave WHERE ov.voce_chiave = ${alias}.chiave AND o.persona_id IS NOT NULL)
  OR (CASE WHEN json_valid(${alias}.dettagli_json) THEN COALESCE(json_extract(${alias}.dettagli_json, '$.maschera'), '') ELSE '' END) <> ''))`;

/** Vero se la voce è una Persona da catturare. */
export function eVoceDiCattura(voce: string): boolean {
  return !!prepared(`SELECT 1 FROM punto_interesse p WHERE p.chiave = ? AND ${sqlVoceDiCattura('p')}`).get(voce);
}

/** L'errore per chi segna (o collega a un pin) una Persona da catturare: la sua cattura sta nel compendio. */
export function erroreCatturaNelCompendio(nome: string, cosa: 'segnare' | 'collegare'): HttpError {
  return httpErrors.badRequest('cattura-nel-compendio', cosa === 'segnare'
    ? `«${nome}» è una Persona da catturare: la cattura si segna registrandola nel compendio della partita.`
    : `«${nome}» è una Persona da catturare: la sua cattura sta nel compendio della partita, e non ha pin.`);
}

/** L'Ombra di una voce Persona, con quel che serve a chi mostra il gesto di cattura. */
export interface OmbraDellaVoce { chiave: string; nome: string; catturabile: boolean }

/** Quel che si sa di una voce da catturare: la Persona del compendio e l'Ombra, se c'è. */
export interface VoceDiCattura { voce: string; persona: PersonaDellaMascheraDto | null; ombra: OmbraDellaVoce | null }

interface RigaVoceDiCattura { chiave: string; dettagli_json: string; ombra_chiave: string | null; ombra_nome: string | null; persona_id: number | null; catturabile: number | null }

/**
 * Le voci da catturare (tutte, o quelle date) con la loro Persona: la maschera prima (l'utente può cambiarla dal modulo), poi la
 * Persona dell'Ombra collegata. `idx` si passa se chi chiama lo ha già costruito.
 */
export function vociDiCattura(idx: IndiceMaschere = indiceMaschere(), voci?: readonly string[]): Map<string, VoceDiCattura> {
  const righe = prepared(`SELECT p.chiave, p.dettagli_json, o.chiave AS ombra_chiave, o.nome AS ombra_nome, o.persona_id, o.catturabile
    FROM punto_interesse p LEFT JOIN ombra_voce ov ON ov.voce_chiave = p.chiave LEFT JOIN ombra o ON o.chiave = ov.ombra_chiave
    WHERE ${sqlVoceDiCattura('p')}${voci ? ' AND p.chiave IN (SELECT value FROM json_each(?))' : ''}`).all(...(voci ? [JSON.stringify(voci)] : [])) as RigaVoceDiCattura[];
  const perId = new Map([...idx.values()].map((p) => [p.id, p] as const));
  const out = new Map<string, VoceDiCattura>();
  for (const r of righe) {
    let maschera: unknown = null;
    try { maschera = (JSON.parse(r.dettagli_json) as Record<string, unknown>).maschera; } catch { /* dettagli illeggibili: nessuna maschera */ }
    const persona = personaDellaMaschera(idx, maschera) ?? (r.persona_id !== null ? perId.get(r.persona_id) ?? null : null);
    // il gesto di cattura dall'incontro vale per la Persona dell'Ombra: se la voce ne ha una diversa (scelta dall'utente) l'Ombra non la riguarda
    const ombra = r.ombra_chiave && r.ombra_nome !== null && (r.persona_id === null || persona?.id === r.persona_id)
      ? { chiave: r.ombra_chiave, nome: r.ombra_nome, catturabile: r.catturabile === 1 } : null;
    out.set(r.chiave, { voce: r.chiave, persona, ombra });
  }
  return out;
}

/** Le Persona registrate nel compendio della partita (vuoto se il compendio non c'è). */
export function personeRegistrate(partitaId: number): Set<number> {
  if (!prepared("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = 'compendio_partita'").get()) return new Set();
  return new Set(prepared('SELECT persona_id FROM compendio_partita WHERE partita_id = ? AND registrata = 1').pluck().all(partitaId) as number[]);
}

/** Le voci Persona da catturare la cui Persona è registrata nel compendio della partita (vuoto se il compendio non c'è). `voci` si passa se già lette. */
export function vociPersonaCatturate(partitaId: number, voci?: ReadonlyMap<string, VoceDiCattura>): Set<string> {
  const registrate = personeRegistrate(partitaId);
  if (registrate.size === 0) return new Set();
  const out = new Set<string>();
  for (const v of (voci ?? vociDiCattura()).values()) if (v.persona && registrate.has(v.persona.id)) out.add(v.voce);
  return out;
}

/**
 * Il gesto di cattura che viene da un incontro con un'Ombra (R8-12, R8-13): l'Ombra deve esistere, avere quella Persona ed essere
 * catturabile (la sola Persona collegata non basta: Babau/Bugs si registra dal compendio o per fusione, non dall'incontro). Toglierla
 * dal compendio non passa di qui.
 */
export function verificaCatturaDaIncontro(ombraChiave: string, personaId: number): void {
  const o = prepared('SELECT nome, persona_id, catturabile FROM ombra WHERE chiave = ?').get(ombraChiave) as { nome: string; persona_id: number | null; catturabile: number } | undefined;
  if (!o) throw httpErrors.notFound('ombra-non-trovata', `Non c'è un'Ombra con la chiave «${ombraChiave}».`);
  if (o.persona_id === null || o.persona_id !== personaId) throw httpErrors.badRequest('ombra-e-persona-discordi', `«${o.nome}» non è un'Ombra di questa Persona: non si può catturare da quell'incontro.`);
  if (o.catturabile !== 1) throw httpErrors.badRequest('ombra-non-catturabile', `«${o.nome}» non si cattura negli incontri: la sua Persona si registra dal compendio o per fusione.`);
}
