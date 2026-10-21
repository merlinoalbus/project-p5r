// I vecchi identificativi restano validi; il listino condiviso ha una sola fonte modificabile.
// Non dipende dai servizi negozi/luoghi, così acquisti, condizioni e mappe usano gli stessi legami senza cicli.
import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';

export interface LettureListiniCondivisi {
  negozi: Map<string, string>;
  articoli: Map<string, string>;
  sedi: Array<{ negozio: string; luogo: string }>;
  pin: Map<string, { negozio: string; luogo: string }>;
}

/** Un ciclo non diventa un riferimento arbitrario: si segnala il dato da correggere. */
function destinazione(chiave: string, legami: Map<string, string>): string {
  const visti = new Set<string>(); let corrente = chiave;
  while (legami.has(corrente)) {
    if (visti.has(corrente)) throw httpErrors.conflict('listino-condiviso-ciclico', 'Il collegamento del listino forma un ciclo: correggi i riferimenti prima di usarlo.');
    visti.add(corrente); corrente = legami.get(corrente)!;
  }
  return corrente;
}

/** Anche durante la preparazione locale di M7 si possono leggere i servizi già esistenti sullo schema precedente. */
export function lettureListiniCondivisi(): LettureListiniCondivisi {
  const vuote: LettureListiniCondivisi = { negozi: new Map(), articoli: new Map(), sedi: [], pin: new Map() };
  if (!prepared("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'negozio_sede_spillo'").get()) return vuote;
  const negozi = new Map((prepared('SELECT chiave,listino_condiviso FROM negozio WHERE listino_condiviso IS NOT NULL').all() as Array<{ chiave: string; listino_condiviso: string }>).map((r) => [r.chiave, r.listino_condiviso]));
  const articoli = new Map((prepared('SELECT chiave,articolo_condiviso FROM articolo WHERE articolo_condiviso IS NOT NULL').all() as Array<{ chiave: string; articolo_condiviso: string }>).map((r) => [r.chiave, r.articolo_condiviso]));
  for (const k of negozi.keys()) negozi.set(k, destinazione(k, negozi));
  for (const k of articoli.keys()) articoli.set(k, destinazione(k, articoli));
  const sedi = (prepared(`SELECT e.negozio_chiave AS negozio,e.luogo_chiave AS luogo FROM negozio_luogo_extra e
    JOIN negozio n ON n.chiave = e.negozio_chiave JOIN luogo l ON l.chiave = e.luogo_chiave
    WHERE n.nascosto = 0 AND l.nascosto = 0 ORDER BY n.ordine,l.ordine`).all() as Array<{ negozio: string; luogo: string }>);
  // Associazione per uid e sede, non per quartiere: 1769 e 1768 citano lo stesso negozio sulla stessa Area ma solo 1768 è confermato.
  const pin = new Map((prepared(`SELECT e.spillo_uid,e.negozio_chiave AS negozio,e.luogo_chiave AS luogo
    FROM negozio_sede_spillo e JOIN spillo s ON s.uid = e.spillo_uid JOIN mappa m ON m.chiave = s.mappa_chiave
    JOIN luogo l ON l.chiave = e.luogo_chiave JOIN negozio n ON n.chiave = e.negozio_chiave
    WHERE s.riferimento_tipo = 'negozio' AND s.riferimento_chiave = e.negozio_chiave
      AND m.area_chiave = l.area_chiave AND l.nascosto = 0 AND n.nascosto = 0`).all() as Array<{ spillo_uid: string; negozio: string; luogo: string }>)
    .map((r) => [r.spillo_uid, { negozio: r.negozio, luogo: r.luogo }]));
  return { negozi, articoli, sedi, pin };
}

export function listinoDelNegozio(chiave: string, letture: LettureListiniCondivisi): string { return letture.negozi.get(chiave) ?? chiave; }
export function articoloDelListino(chiave: string, letture: LettureListiniCondivisi): string { return letture.articoli.get(chiave) ?? chiave; }

/** Gli acquisti storici si leggono senza riscrivere una data o inserire una seconda spunta. */
export function acquistiCondivisi(acquistati: Iterable<string>, letture: LettureListiniCondivisi): Set<string> {
  const out = new Set(acquistati);
  for (const k of out) out.add(articoloDelListino(k, letture));
  for (const [prima, dopo] of letture.articoli) if (out.has(dopo)) out.add(prima);
  return out;
}

export function articoliEquivalenti(chiave: string, letture: LettureListiniCondivisi): string[] {
  const canonica = articoloDelListino(chiave, letture);
  return [canonica, ...[...letture.articoli].filter(([, dopo]) => dopo === canonica).map(([prima]) => prima)];
}

export function negoziEquivalenti(chiave: string, letture: LettureListiniCondivisi): string[] {
  const canonica = listinoDelNegozio(chiave, letture);
  return [...[...letture.negozi].filter(([, dopo]) => dopo === canonica).map(([prima]) => prima), canonica];
}
