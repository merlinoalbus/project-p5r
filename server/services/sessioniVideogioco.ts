import { prepared } from '../db/dbService.js';

/** Fonte unica del fatto «giocato»: una dichiarazione oppure almeno un round, senza duplicare il titolo. */
export function sessioniVideogioco(partitaId?: number): { dichiarate: Set<string>; giocate: Set<string> } {
  if (partitaId === undefined) return { dichiarate: new Set(), giocate: new Set() };
  const dichiarate = new Set((prepared("SELECT s.videogioco_chiave FROM sessione_videogioco_partita s JOIN attivita a ON a.chiave = s.videogioco_chiave WHERE s.partita_id = ? AND a.tipo = 'videogioco'")
    .all(partitaId) as Array<{ videogioco_chiave: string }>).map((r) => r.videogioco_chiave));
  const giocate = new Set(dichiarate);
  for (const r of prepared("SELECT p.videogioco_chiave FROM progresso_videogioco_partita p JOIN attivita a ON a.chiave = p.videogioco_chiave WHERE p.partita_id = ? AND a.tipo = 'videogioco' AND p.avanzamento > 0")
    .all(partitaId) as Array<{ videogioco_chiave: string }>) giocate.add(r.videogioco_chiave);
  return { dichiarate, giocate };
}
