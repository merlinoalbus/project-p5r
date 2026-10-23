// ============================================================
// personeDelGruppo — la guardia unica sulle forme dei Ladri (L8, B2, R8-20)
// ============================================================
//
// Le 27 forme del gruppo (`persona.del_party = 1`) stanno nel compendio per essere consultate, ma non sono Persona che si
// fondono, si evocano dal Registro, si portano nella scorta, si registrano nel compendio della partita né si mettono tra gli
// obiettivi e i piani. L'elenco per i selettori e per i motori le esclude già (`elencaPersona` senza `delGruppo`, istantanea del
// motore di fusione); questa guardia chiude gli ID passati direttamente alle API: un 409 con un messaggio chiaro, mai un 404
// che farebbe credere che la Persona non esista.
// ============================================================

import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { t } from './traduzioniService.js';

/** Il nome originale della Persona se è una forma del gruppo, altrimenti null (anche per un ID che non esiste). */
function nomeSeDelGruppo(personaId: number): string | null {
  const r = prepared('SELECT nome FROM persona WHERE id = ? AND del_party = 1').get(personaId) as { nome: string } | undefined;
  return r?.nome ?? null;
}

/** Vero se l'ID è una forma delle Persona del gruppo. */
export function eDelGruppo(personaId: number): boolean {
  return nomeSeDelGruppo(personaId) !== null;
}

/** 409 `persona-del-gruppo` se l'ID è una forma del gruppo; non fa nulla per le altre e per gli ID inesistenti (ci pensa il 404 del chiamante). */
export function assicuraNonDelGruppo(personaId: number): void {
  const nome = nomeSeDelGruppo(personaId);
  if (nome === null) return;
  throw httpErrors.conflict('persona-del-gruppo', `${t('persona', nome)} è una Persona del gruppo dei Ladri: si consulta nel compendio, ma non si fonde, non si evoca e non entra nella scorta, nel compendio della partita, negli obiettivi o nei piani.`);
}
