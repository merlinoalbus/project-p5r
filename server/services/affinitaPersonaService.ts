// ============================================================
// affinitaPersonaService — correggere le affinità di una Persona (L8 · R8-10/1)
// ============================================================
//
// Le affinità stanno in `persona_affinita(persona_id, elemento, codice)` e le leggono dal compendio la scheda Persona, l'Ombra, la Battaglia e le
// operazioni della Stanza di Velluto: correggerle qui le cambia ovunque, senza altra copia. Ogni riga conserva il valore della guida
// (`seed_codice`, migrazione 186) e dice se è stata corretta (`origine`: `seed` o `utente`): la scheda lo dice («corrette da te», «Guida: …»);
// non c'è un ritorno al valore della guida (decisione dell'utente del 10/11).
// Le differenze proprie di un'Ombra (`ombra.affinita_proprie_json`) non si toccano: restano sopra la griglia della Persona.
// ============================================================

import { getDb, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { invalidaCacheDiGioco } from './cacheDiGioco.js';
import { dettaglioPersona } from './compendioService.js';
import type { ModificaAffinitaPersona } from '../../shared/affinitaPersona.js';
import type { PersonaDettaglioDto } from '../../shared/types.js';

interface RigaAffinita { elemento: string; codice: string; origine: string; seed_codice: string | null }

function esiste(personaId: number): void {
  if (!prepared('SELECT 1 FROM persona WHERE id = ?').get(personaId)) throw httpErrors.notFound('persona-non-trovata', `La Persona ${personaId} non esiste.`);
}

/**
 * Sostituisce la griglia delle affinità con quella data (tutti e 10 gli elementi: la forma la controlla lo schema della rotta). Cambia solo le righe
 * il cui codice è diverso; alla prima correzione di una riga conserva il valore della guida. Una griglia uguale all'attuale non scrive.
 */
export function correggiAffinita(personaId: number, mod: ModificaAffinitaPersona): PersonaDettaglioDto {
  esiste(personaId);
  const attuali = new Map((prepared('SELECT elemento, codice, origine, seed_codice FROM persona_affinita WHERE persona_id = ?').all(personaId) as RigaAffinita[]).map((r) => [r.elemento, r]));
  const daCambiare = mod.affinita.filter((a) => (attuali.get(a.elemento)?.codice ?? '-') !== a.codice);
  if (daCambiare.length === 0) return dettaglioPersona(personaId);
  getDb().transaction(() => {
    const inserisci = prepared("INSERT INTO persona_affinita (persona_id, elemento, codice, origine, seed_codice) VALUES (?, ?, ?, ?, '-')");
    const aggiorna = prepared('UPDATE persona_affinita SET codice = ?, seed_codice = ?, origine = ? WHERE persona_id = ? AND elemento = ?');
    for (const a of daCambiare) {
      const r = attuali.get(a.elemento);
      if (!r) { inserisci.run(personaId, a.elemento, a.codice, a.codice === '-' ? 'seed' : 'utente'); continue; }
      const guida = r.seed_codice ?? r.codice;
      aggiorna.run(a.codice, guida, a.codice === guida ? 'seed' : 'utente', personaId, a.elemento);
    }
  })();
  invalidaCacheDiGioco();
  return dettaglioPersona(personaId);
}
