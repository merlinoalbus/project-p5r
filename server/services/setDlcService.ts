// ============================================================
// setDlcService — i set di contenuti scaricabili (`dlc_set`) con le loro Persona, dal punto unico del file di gioco
// ============================================================
//
// La partita segna i set posseduti per id (`utente.partita.dlc_posseduti_json`): li leggono la Fusione (le Persona dei set non posseduti non
// entrano) e le condizioni `dlc-posseduto` (gli effetti della voce dello Scaffale con lo scatolone del Leblanc). Il nome di un set sono le sue
// Persona («Izanagi e Izanagi Picaro»), nell'ordine del set: il set non ha un nome proprio nei dati. Un solo elenco per la finestra della
// partita, l'editor delle condizioni e le frasi delle condizioni. Sola lettura.
// ============================================================

import { prepared } from '../db/dbService.js';
import type { SetDlcDto } from '../../shared/types.js';

/** «A», «A e B», «A, B e C». */
const congiungi = (nomi: readonly string[]): string => (nomi.length > 1 ? `${nomi.slice(0, -1).join(', ')} e ${nomi[nomi.length - 1]}` : nomi[0] ?? '');

/** I set di contenuti scaricabili nell'ordine del file di gioco, con le Persona (in ordine di livello, poi di nome) e il nome che le dice;
 *  vuoto se il file non ha le tabelle dei set. Un set senza Persona si chiama «Set N». */
export function setDlcConPersone(): SetDlcDto[] {
  if (!prepared("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'dlc_set_persona'").get()) return [];
  const set = prepared('SELECT id FROM dlc_set ORDER BY ordine, id').all() as Array<{ id: number }>;
  const persone = new Map<number, string[]>();
  for (const r of prepared('SELECT d.set_id, p.nome FROM dlc_set_persona d JOIN persona p ON p.id = d.persona_id ORDER BY d.set_id, p.livello, p.nome').all() as Array<{ set_id: number; nome: string }>) {
    const elenco = persone.get(r.set_id);
    if (elenco) elenco.push(r.nome); else persone.set(r.set_id, [r.nome]);
  }
  return set.map((s) => {
    const nomi = persone.get(s.id) ?? [];
    return { id: s.id, persone: nomi, nome: nomi.length ? congiungi(nomi) : `Set ${s.id}` };
  });
}
