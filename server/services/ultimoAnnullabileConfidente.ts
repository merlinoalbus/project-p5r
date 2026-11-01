// ============================================================
// ultimoAnnullabileConfidente — l'ultima registrazione di un Confidente che «Annulla ultimo» toglie, letta dallo storico (L10-05)
// ============================================================
//
// Prima la pila di «Annulla ultimo» stava nella pagina (stato di React) e si perdeva ricaricando. Ora la legge dallo storico della partita
// (`evento_partita`), l'unico registro: ogni registrazione annullabile scrive il suo evento, nella stessa transazione, con i dati per riconoscerla.
//   - `confidente-punti`: i punti di una risposta o di un'uscita segnati dalla pagina Confidenti (`incontriService.aggiornaConfidenteDallaPagina`),
//     con `punti` (l'aumento), `rango`, `puntiDopo` e il momento di gioco (`data`, `fascia`) dell'incontro;
//   - `regalo`: l'azione «Regala» (`regaloAzioneService.regala`), con la consegna (`consegna`, l'id di `regalo_partita`), `catalogo`, `punti`,
//     `rango` e `puntiDopo`.
// L'ultima è l'evento più recente del Confidente fra questi due tipi e `confidente-rango` (un cambio di rango azzera i punti: dopo, niente da
// togliere). È annullabile solo se il Confidente è ancora allo stesso rango e con gli stessi punti di subito dopo la registrazione (`puntiDopo`):
// un'altra variazione dei punti non registrata qui (il Diario, una correzione) la rende non annullabile, e così una registrazione già annullata
// (il suo evento se n'è andato) o le registrazioni di prima di L10-05, che `puntiDopo` non ce l'hanno. Un regalo vale finché la sua consegna c'è.
// Annullata l'ultima, il suo evento se ne va e torna annullabile quella di prima (se i punti tornano quelli di allora): la pila di prima.
// Gli id di `evento_partita` si riusano (l'evento annullato era l'ultimo, il prossimo prende il suo id): l'annullo lo riconosce da id e `created_at`.
// ============================================================

import { prepared } from '../db/dbService.js';
import { consegnaDaAnnullare } from './regaliPartita.js';
import type { UltimoAnnullabileConfidenteDto } from '../../shared/types.js';

/** I tipi di evento che contano per l'ultima registrazione: i due annullabili e il cambio di rango, che chiude la pila. */
const TIPI = ['confidente-punti', 'regalo', 'confidente-rango'] as const;
/** Tolleranza sul confronto dei punti (sono arrotondati al centesimo). */
const EPSILON = 0.005;

interface RigaEvento { id: number; tipo: (typeof TIPI)[number]; dati_json: string; created_at: string; confidente: string | null }

/** Lo stato del Confidente con cui confrontare l'evento: rango e punti di adesso. */
export interface StatoConfidente { chiave: string; rango: number; punti: number }

const numero = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** L'ultima registrazione annullabile, dall'evento più recente del Confidente fra quelli che contano; null se non ce n'è una. */
function daEvento(partitaId: number, e: RigaEvento, stato: StatoConfidente): UltimoAnnullabileConfidenteDto | null {
  if (e.tipo === 'confidente-rango') return null;
  let d: Record<string, unknown>;
  try { d = JSON.parse(e.dati_json) as Record<string, unknown>; } catch { return null; }
  const punti = numero(d.punti), rango = numero(d.rango), puntiDopo = numero(d.puntiDopo);
  if (punti === null || rango === null || puntiDopo === null) return null;
  if (rango !== stato.rango || Math.abs(stato.punti - puntiDopo) > EPSILON) return null;
  if (e.tipo === 'confidente-punti') return punti > 0 ? { evento: e.id, creatoIl: e.created_at, tipo: 'punti', punti } : null;
  const consegna = numero(d.consegna), catalogo = typeof d.catalogo === 'string' ? d.catalogo : null;
  if (consegna === null || catalogo === null || punti < 0) return null;
  if (!consegnaDaAnnullare(partitaId, stato.chiave, catalogo, consegna)) return null;
  return { evento: e.id, creatoIl: e.created_at, tipo: 'regalo', punti, regalo: catalogo, consegna };
}

/** Gli ultimi eventi che contano, uno per Confidente (con `chiave`, di quel Confidente solo), in una lettura sola. */
function ultimiEventi(partitaId: number, chiave?: string): Map<string, RigaEvento> {
  const filtro = chiave === undefined ? '' : " AND json_extract(dati_json, '$.confidente') = ?";
  const righe = prepared(`SELECT e.id, e.tipo, e.dati_json, e.created_at, json_extract(e.dati_json, '$.confidente') AS confidente FROM utente.evento_partita e
    WHERE e.id IN (SELECT MAX(id) FROM utente.evento_partita WHERE partita_id = ? AND tipo IN (${TIPI.map(() => '?').join(', ')})
      AND json_valid(dati_json)${filtro} GROUP BY json_extract(dati_json, '$.confidente'))`)
    .all(partitaId, ...TIPI, ...(chiave === undefined ? [] : [chiave])) as RigaEvento[];
  return new Map(righe.filter((r) => typeof r.confidente === 'string').map((r) => [r.confidente as string, r]));
}

/** L'ultima registrazione annullabile di ciascun Confidente dato (assente se non ce n'è una), per i DTO dei Confidenti della partita. */
export function ultimiAnnullabili(partitaId: number, stati: readonly StatoConfidente[]): Map<string, UltimoAnnullabileConfidenteDto> {
  const eventi = ultimiEventi(partitaId, stati.length === 1 ? stati[0].chiave : undefined);
  const out = new Map<string, UltimoAnnullabileConfidenteDto>();
  for (const s of stati) {
    const e = eventi.get(s.chiave);
    const u = e ? daEvento(partitaId, e, s) : null;
    if (u) out.set(s.chiave, u);
  }
  return out;
}

/** L'ultima registrazione annullabile del Confidente adesso (rango e punti letti dalla partita); null se non ce n'è una. */
export function ultimoAnnullabile(partitaId: number, chiave: string): UltimoAnnullabileConfidenteDto | null {
  const r = prepared('SELECT rango, punti FROM utente.confidente_partita WHERE partita_id = ? AND confidente_chiave = ?').get(partitaId, chiave) as { rango: number; punti: number } | undefined;
  return ultimiAnnullabili(partitaId, [{ chiave, rango: r?.rango ?? 0, punti: r?.punti ?? 0 }]).get(chiave) ?? null;
}
