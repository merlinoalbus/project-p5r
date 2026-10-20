// ============================================================
// casaMappa — la «casa» di ogni mappa e la sua Area (L2, 2026-10-20)
// ============================================================
//
// La casa è l'indirizzo dell'**unica pagina** che mostra una mappa (lotti/L2/modifiche.md §1.2): Tokyo → La città, la mappa di un
// quartiere → la pagina del quartiere, una planimetria con un'Area → la pagina dell'Area (con `?planimetria=` se non è la
// predefinita); da L3 la radice di un Palazzo → la sua scheda e una planimetria di un'Area del Palazzo → la scheda con l'Area aperta;
// tutto il resto (Memento, mappe senza Area) → il visore. La regola sta qui, una volta, e viaggia nei DTO: l'interfaccia non
// la ricostruisce, e gli indirizzi vecchi `/guida/mappe/<chiave>` portano qui con il redirect.
//
// Senza dipendenze dagli altri servizi delle mappe (solo il database, i percorsi pubblici e i condivisi): lo usano `mappeService`,
// `areeService`, `cittaService` e i contenuti della guida, e nessuno deve richiamarsi in cerchio.
// ============================================================

import { getDb, type AppDatabase } from '../../db/dbService.js';
import { chiaveMappa } from './percorsiMappe.js';
import { httpErrors } from '../../utils/httpError.js';
import type { AreaRifDto, ContenitoreAreaDto } from '../../../shared/types.js';

/**
 * La casa di L3 per i Palazzi (la scheda del Palazzo, con l'Area aperta) vale solo quando la pagina del FE c'è: BE e FE escono insieme
 * (difetto FUN3-1, 2026-10-20: con la casa nuova e il FE di prima ogni collegamento a una planimetria di un Palazzo finiva in «Pagina
 * non trovata»). Spenta, le mappe dei Palazzi tengono la casa di oggi, il visore `/guida/mappe/<chiave>`. Si accende con la variabile
 * d'ambiente `CASA_SCHEDA_PALAZZI=1` (al rilascio di L3) o, nei test, con `impostaCasaSchedaPalazzi`.
 */
let casaSchedaPalazzi = process.env.CASA_SCHEDA_PALAZZI === '1';
/** Accende o spegne la casa di L3 dei Palazzi (test; in produzione decide la variabile d'ambiente). */
export function impostaCasaSchedaPalazzi(accesa: boolean): void {
  casaSchedaPalazzi = accesa;
}
/** Vero se la casa dei Palazzi è la scheda (L3) invece del visore. */
export function conCasaSchedaPalazzi(): boolean {
  return casaSchedaPalazzi;
}

/** Il nome della città, contenitore delle Aree che non stanno in nessun quartiere (la colonna `area.citta_chiave` ammette solo Tokyo). */
const NOME_CITTA: Record<string, string> = { tokyo: 'Tokyo' };

/** Una riga della tabella `area` (109). */
export interface RigaArea {
  chiave: string; quartiere_chiave: string | null; dungeon_chiave: string | null; citta_chiave: string | null; slug: string; nome: string;
  nome_rivisto: number; ordine: number; planimetria_predefinita: string | null; origine: 'seed' | 'utente'; seed_json: string | null;
  da_verificare: number; updated_at: string;
}

/** Le Aree e i nomi dei loro contenitori, letti una volta per una risposta che descrive molte mappe. */
export interface ContestoAree { aree: Map<string, RigaArea>; nomiQuartieri: Map<string, string>; nomiDungeon: Map<string, string> }

/** Vero se la tabella delle Aree c'è (dalla 109; i test su uno schema di prima non l'hanno). */
export function conAree(db: AppDatabase = getDb()): boolean {
  return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'area'").get();
}

/** Le Aree e i nomi dei contenitori; vuoto su uno schema senza Aree. */
export function contestoAree(db: AppDatabase = getDb()): ContestoAree {
  if (!conAree(db)) return { aree: new Map(), nomiQuartieri: new Map(), nomiDungeon: new Map() };
  return {
    aree: new Map((db.prepare('SELECT * FROM area').all() as RigaArea[]).map((a) => [a.chiave, a])),
    nomiQuartieri: new Map((db.prepare('SELECT chiave, nome FROM quartiere').all() as Array<{ chiave: string; nome: string }>).map((q) => [q.chiave, q.nome])),
    nomiDungeon: new Map((db.prepare('SELECT chiave, nome FROM dungeon').all() as Array<{ chiave: string; nome: string }>).map((d) => [d.chiave, d.nome])),
  };
}

/** Il contenitore di un'Area: la città, il quartiere o il Palazzo, con il suo nome. */
export function contenitoreDi(a: RigaArea, ctx: ContestoAree): ContenitoreAreaDto {
  if (a.citta_chiave) return { tipo: 'citta', chiave: a.citta_chiave, nome: NOME_CITTA[a.citta_chiave] ?? a.citta_chiave };
  if (a.quartiere_chiave) return { tipo: 'quartiere', chiave: a.quartiere_chiave, nome: ctx.nomiQuartieri.get(a.quartiere_chiave) ?? a.quartiere_chiave };
  return { tipo: 'dungeon', chiave: a.dungeon_chiave ?? '', nome: ctx.nomiDungeon.get(a.dungeon_chiave ?? '') ?? a.dungeon_chiave ?? '' };
}

/**
 * La casa di un'Area: `/guida/citta/<quartiere>/<slug>` (o `/guida/citta/tokyo/<slug>` per un'Area della città); per un'Area di un
 * Palazzo (L3) la scheda del Palazzo con l'Area aperta, `/guida/dungeon/<palazzo>/area/<slug>`. Con `?planimetria=<chiave pubblica>`
 * se si vuole una versione che non è la predefinita. Null solo per una riga senza contenitore (il CHECK della tabella lo esclude).
 */
export function casaDellArea(a: RigaArea, planimetria?: string | null): string | null {
  const contenitore = a.citta_chiave ?? a.quartiere_chiave;
  // un'Area di un Palazzo con la casa di L3 spenta (FUN3-1): la casa è quella della planimetria, il visore
  if (!contenitore && a.dungeon_chiave && !casaSchedaPalazzi) {
    const mappa = planimetria ?? a.planimetria_predefinita;
    return mappa ? `/guida/mappe/${encodeURIComponent(chiaveMappa(mappa))}` : null;
  }
  const base = contenitore ? `/guida/citta/${encodeURIComponent(contenitore)}/${encodeURIComponent(a.slug)}`
    : a.dungeon_chiave ? `/guida/dungeon/${encodeURIComponent(a.dungeon_chiave)}/area/${encodeURIComponent(a.slug)}` : null;
  if (!base) return null;
  return planimetria && planimetria !== a.planimetria_predefinita ? `${base}?planimetria=${encodeURIComponent(chiaveMappa(planimetria))}` : base;
}

/** La casa di un Palazzo (L3): la sua scheda. I Memento non hanno una scheda di Palazzo: restano nel visore. */
export function casaDelPalazzo(dungeon: string): string {
  return `/guida/dungeon/${encodeURIComponent(dungeon)}`;
}

/** I campi di una riga di `mappa` che servono alla casa. */
export interface RigaPerCasa { chiave: string; tipo: string; entita_tipo: string | null; entita_chiave: string | null; area_chiave?: string | null }

/** La casa di una mappa, con la regola del §1.2 (vedi l'intestazione). */
export function casaDellaMappa(r: RigaPerCasa, ctx: ContestoAree): string {
  if (r.chiave === 'tokyo' && r.tipo === 'citta') return '/guida/citta';
  if (r.tipo === 'quartiere' && r.entita_tipo === 'quartiere' && r.entita_chiave && r.entita_chiave !== 'mementos') return `/guida/citta/${encodeURIComponent(r.entita_chiave)}`;
  // L3: la radice di un Palazzo (non dei Memento, che è un `dedalo`) → la scheda del Palazzo
  if (casaSchedaPalazzi && r.tipo === 'palazzo' && r.entita_tipo === 'dungeon' && r.entita_chiave && r.entita_chiave !== 'mementos') return casaDelPalazzo(r.entita_chiave);
  const area = r.area_chiave ? ctx.aree.get(r.area_chiave) : undefined;
  const dellArea = area ? casaDellArea(area, r.chiave) : null;
  return dellArea ?? `/guida/mappe/${encodeURIComponent(chiaveMappa(r.chiave))}`;
}

/**
 * L'ingresso di un quartiere è un'Area del quartiere più un punto (R2-21): la planimetria indicata deve stare in un'Area di quel
 * quartiere. 400 `area-di-altro-quartiere` se è di un'Area di un altro posto, 400 `ingresso-senza-area` se non ha un'Area (la mappa
 * del quartiere, una planimetria da collocare). Vale per la PUT dell'ingresso e per l'importazione (difetto FUN2-1). Su uno schema
 * senza Aree non controlla niente.
 */
export function verificaIngressoNelQuartiere(quartiere: string, mappaInterna: string, db: AppDatabase = getDb()): void {
  if (!conAree(db)) return;
  const a = db.prepare('SELECT a.quartiere_chiave, a.nome FROM mappa m JOIN area a ON a.chiave = m.area_chiave WHERE m.chiave = ?').get(mappaInterna) as
    { quartiere_chiave: string | null; nome: string } | undefined;
  if (!a) throw httpErrors.badRequest('ingresso-senza-area', 'L’ingresso di un quartiere sta in una delle sue aree: questa planimetria non appartiene a nessuna area.');
  if (a.quartiere_chiave !== quartiere) throw httpErrors.badRequest('area-di-altro-quartiere', `L’area «${a.nome}» non è di questo quartiere: l’ingresso si sceglie fra le sue aree.`);
}

/** L'Area di una planimetria con la sua versione, per i DTO; null se la mappa non ha un'Area. */
export function areaRifDellaMappa(r: { chiave: string; area_chiave?: string | null; versione_etichetta?: string | null; versione_ordine?: number | null }, ctx: ContestoAree): AreaRifDto | null {
  const a = r.area_chiave ? ctx.aree.get(r.area_chiave) : undefined;
  if (!a) return null;
  return {
    chiave: a.chiave, contenitore: contenitoreDi(a, ctx), slug: a.slug, nome: a.nome,
    versioneEtichetta: r.versione_etichetta ?? null, versioneOrdine: r.versione_ordine ?? 0, predefinita: a.planimetria_predefinita === r.chiave,
    casa: casaDellArea(a, r.chiave) ?? `/guida/mappe/${encodeURIComponent(chiaveMappa(r.chiave))}`,
    // L2, R1 del giro 1: l'indice `/guida/mappe` mostra «Da verificare» come la pagina dell'Area
    daVerificare: a.da_verificare === 1,
  };
}
