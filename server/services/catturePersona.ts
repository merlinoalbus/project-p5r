// ============================================================
// catturePersona — la cattura delle Persona dei Memento è una sola: la registrazione nel compendio della partita (2026-10-12)
// ============================================================
//
// Scelte dell'utente: «Se la persona è catturata vale per tutte le aree e i dedali»; «La cattura o meno delle Persona puoi
// valutarla dal compendio... dove vedi se una persona è stata sbloccata o meno nella partita». Rilievo F1 del validatore: lo
// stato di una voce (`punto_partita`) era un secondo modo di segnarla, che l'interfaccia non usa più. Scelta dell'utente sul
// rilievo («Leggono il compendio»):
//   - una voce Persona di un dedalo dei Memento non ha uno stato suo: segnarla dalla guida si rifiuta (`cattura-nel-compendio`),
//     e un pin non vi si collega (il pin la segnerebbe in `punto_partita`);
//   - una condizione «Voce della guida» che la cita è verde se la sua Persona (dalla maschera, `maschere.ts`) è registrata nel
//     compendio della partita: resta citabile nell'editor delle mappe.
// Le Persona dei Palazzi (voci «persona» di un Palazzo) non cambiano: si segnano come le altre voci.
// ============================================================

import { prepared } from '../db/dbService.js';
import { httpErrors, type HttpError } from '../utils/httpError.js';
import { indiceMaschere, personaDellaMaschera } from './maschere.js';

/** Vera (in SQL) se la voce con l'alias dato è una Persona di un dedalo dei Memento. */
export const sqlPersonaDeiMemento = (alias: string): string => `(${alias}.tipo = 'persona' AND ${alias}.area_chiave IN
  (SELECT a.chiave FROM dungeon_area a JOIN dungeon d ON d.chiave = a.dungeon_chiave WHERE d.tipo = 'mementos'))`;

/** Vero se la voce è una Persona di un dedalo dei Memento. */
export function ePersonaDeiMemento(voce: string): boolean {
  return !!prepared(`SELECT 1 FROM punto_interesse p WHERE p.chiave = ? AND ${sqlPersonaDeiMemento('p')}`).get(voce);
}

/** L'errore per chi segna (o collega a un pin) una Persona dei Memento: la sua cattura sta nel compendio. */
export function erroreCatturaNelCompendio(nome: string, cosa: 'segnare' | 'collegare'): HttpError {
  return httpErrors.badRequest('cattura-nel-compendio', cosa === 'segnare'
    ? `«${nome}» è una Persona dei Memento: la cattura si segna registrandola nel compendio della partita.`
    : `«${nome}» è una Persona dei Memento: la sua cattura sta nel compendio della partita, e non ha pin.`);
}

/** Le voci Persona dei Memento la cui Persona è registrata nel compendio della partita (vuoto se il compendio non c'è). */
export function vociPersonaCatturate(partitaId: number): Set<string> {
  if (!prepared("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = 'compendio_partita'").get()) return new Set();
  const registrate = new Set(prepared('SELECT persona_id FROM compendio_partita WHERE partita_id = ? AND registrata = 1').pluck().all(partitaId) as number[]);
  if (registrate.size === 0) return new Set();
  const idx = indiceMaschere();
  const out = new Set<string>();
  for (const v of prepared(`SELECT p.chiave, p.dettagli_json FROM punto_interesse p WHERE ${sqlPersonaDeiMemento('p')}`).all() as Array<{ chiave: string; dettagli_json: string }>) {
    let maschera: unknown = null;
    try { maschera = (JSON.parse(v.dettagli_json) as Record<string, unknown>).maschera; } catch { /* dettagli illeggibili: nessuna Persona */ }
    const p = personaDellaMaschera(idx, maschera);
    if (p && registrate.has(p.id)) out.add(v.chiave);
  }
  return out;
}
