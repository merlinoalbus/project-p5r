// ============================================================
// planimetriaDellaVoce — su quale planimetria sta una voce della guida di un Palazzo (L3, «planimetria della voce», 2026-10-20)
// ============================================================
//
// Regole dell'utente: «i gruppi senza pin devono essere visibili solo nella planimetria dove sono stati inseriti»; «lasciali agganciati alla
// planimetria 1 e dammi la possibilità di spostarli a mano in altre planimetrie durante la mia review». Una regola sola, calcolata alla
// lettura (correzione del PM: niente valori scritti dalla migrazione, così una voce che perde i pin, una voce nuova o una planimetria
// ripristinata non restano mai senza planimetria), usata da tutte le letture:
//   a) una voce **con pin** sta dove stanno i suoi pin (su ognuna di quelle planimetrie; la principale è quella con più pin, a parità la
//      del primo pin);
//   b) **senza pin** e con l'**aggancio a mano** (`punto_interesse.planimetria_chiave`, 114): quella planimetria;
//   c) **senza pin e senza aggancio**: la **planimetria 1** della sua infiltrazione, cioè quella con cui l'infiltrazione si apre: la
//      planimetria iniziale della prima Area toccata nell'ordine (`infiltrazione_area`; senza, la predefinita di quell'Area; la prima Area
//      toccata che ne dà una); se l'infiltrazione non tocca Aree, la predefinita della prima Area del Palazzo che ne ha una. Se non si trova
//      niente, nessuna planimetria.
// Un **Enigma** con i suoi passi (095) sta dove sta almeno uno dei passi, e ogni passo segue la propria regola; la sua planimetria
// principale è quella del primo passo. Le voci dei Memento (e dei loro dedali) non hanno planimetrie: nessuna.
// ============================================================

import type { AppDatabase } from '../../db/dbService.js';

/** Una voce di un Palazzo per la regola: la sua infiltrazione, il Palazzo, l'Enigma di cui è un passo e l'aggancio a mano. */
interface VocePerLaRegola { infiltrazione: string; palazzo: string; contenitore: string | null; aMano: string | null }

/** Un pin di una voce, su una planimetria. */
export interface PinDellaVocePerLaRegola { id: number; uid: string | null; mappa: string; nome: string }

/** Quel che serve alla regola, letto in blocco una volta per risposta. */
export interface PlanimetrieDelleVoci {
  voci: Map<string, VocePerLaRegola>;
  /** I pin di ogni voce sulle planimetrie, in ordine di id. */
  pin: Map<string, PinDellaVocePerLaRegola[]>;
  /** I passi di ogni Enigma, in ordine. */
  passi: Map<string, string[]>;
  /** La planimetria 1 di ogni infiltrazione (passo c, prima parte). */
  primaDellInfiltrazione: Map<string, string>;
  /** La predefinita della prima Area del Palazzo che ne ha una (passo c, seconda parte). */
  primaDelPalazzo: Map<string, string>;
}

/** La planimetria principale di una voce, con il perché. */
export interface PlanimetriaDellaVoce {
  /** Chiave interna della mappa. */
  chiave: string;
  /** Vero se è l'aggancio fatto a mano (b). */
  aMano: boolean;
}

function colonna(db: AppDatabase, tabella: string, nome: string): boolean {
  return (db.prepare(`PRAGMA main.table_info(${tabella})`).all() as Array<{ name: string }>).some((c) => c.name === nome);
}
function tabella(db: AppDatabase, nome: string): boolean {
  return !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(nome);
}

/** Legge in blocco voci dei Palazzi, pin, passi degli Enigmi e planimetrie 1 (tutte le letture usano questa e `planimetriaDellaVoce`). */
export function letturePlanimetrieDelleVoci(db: AppDatabase): PlanimetrieDelleVoci {
  const conAggancio = colonna(db, 'punto_interesse', 'planimetria_chiave');
  const conDedalo = colonna(db, 'punto_interesse', 'area_dedalo_chiave');
  const voci = new Map<string, VocePerLaRegola>();
  const passi = new Map<string, string[]>();
  for (const r of db.prepare(`SELECT p.chiave, p.area_chiave, a.dungeon_chiave, p.contenitore_chiave, ${conAggancio ? 'p.planimetria_chiave' : 'NULL AS planimetria_chiave'}
      FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave JOIN dungeon d ON d.chiave = a.dungeon_chiave
      WHERE d.tipo = 'palazzo' ${conDedalo ? 'AND p.area_dedalo_chiave IS NULL' : ''} ORDER BY p.ordine, p.chiave`).all() as
      Array<{ chiave: string; area_chiave: string; dungeon_chiave: string; contenitore_chiave: string | null; planimetria_chiave: string | null }>) {
    voci.set(r.chiave, { infiltrazione: r.area_chiave, palazzo: r.dungeon_chiave, contenitore: r.contenitore_chiave, aMano: r.planimetria_chiave });
    if (r.contenitore_chiave) (passi.get(r.contenitore_chiave) ?? passi.set(r.contenitore_chiave, []).get(r.contenitore_chiave)!).push(r.chiave);
  }
  const pin = new Map<string, PinDellaVocePerLaRegola[]>();
  const conUid = colonna(db, 'spillo', 'uid');
  const conLegami = tabella(db, 'spillo_voce');
  for (const r of db.prepare(`SELECT DISTINCT l.voce, s.id, ${conUid ? 's.uid' : 'NULL AS uid'}, s.mappa_chiave AS mappa, s.nome FROM (
      ${conLegami ? 'SELECT spillo_id AS id, voce_chiave AS voce FROM spillo_voce UNION ' : ''}
      SELECT id, riferimento_chiave FROM spillo WHERE riferimento_tipo = 'punto' AND riferimento_chiave IS NOT NULL) l
      JOIN spillo s ON s.id = l.id WHERE s.mappa_chiave IS NOT NULL ORDER BY s.id, l.voce`).all() as Array<{ voce: string; id: number; uid: string | null; mappa: string; nome: string }>) {
    if (!voci.has(r.voce)) continue;
    (pin.get(r.voce) ?? pin.set(r.voce, []).get(r.voce)!).push({ id: r.id, uid: r.uid, mappa: r.mappa, nome: r.nome });
  }
  const primaDellInfiltrazione = new Map<string, string>();
  const primaDelPalazzo = new Map<string, string>();
  if (tabella(db, 'infiltrazione_area') && tabella(db, 'area')) {
    for (const r of db.prepare(`SELECT ia.infiltrazione_chiave AS inf, COALESCE(ia.planimetria_iniziale, a.planimetria_predefinita) AS pl
        FROM infiltrazione_area ia JOIN area a ON a.chiave = ia.area_chiave ORDER BY ia.infiltrazione_chiave, ia.ordine, a.ordine, a.chiave`).all() as Array<{ inf: string; pl: string | null }>) {
      if (r.pl && !primaDellInfiltrazione.has(r.inf)) primaDellInfiltrazione.set(r.inf, r.pl);
    }
    for (const r of db.prepare(`SELECT dungeon_chiave AS d, planimetria_predefinita AS pl FROM area WHERE dungeon_chiave IS NOT NULL AND planimetria_predefinita IS NOT NULL
        ORDER BY dungeon_chiave, ordine, chiave`).all() as Array<{ d: string; pl: string }>) {
      if (!primaDelPalazzo.has(r.d)) primaDelPalazzo.set(r.d, r.pl);
    }
  }
  return { voci, pin, passi, primaDellInfiltrazione, primaDelPalazzo };
}

/** La planimetria con più pin della voce (a parità quella del primo pin), o null se non ha pin. */
function principaleDaiPin(pin: PinDellaVocePerLaRegola[] | undefined): string | null {
  if (!pin?.length) return null;
  const conti = new Map<string, number>();
  for (const p of pin) conti.set(p.mappa, (conti.get(p.mappa) ?? 0) + 1);
  let migliore = pin[0].mappa;
  for (const [mappa, n] of conti) if (n > conti.get(migliore)!) migliore = mappa;
  return migliore;
}

/** La planimetria 1 della voce (passo c), o null. */
function planimetriaUno(l: PlanimetrieDelleVoci, v: VocePerLaRegola): string | null {
  return l.primaDellInfiltrazione.get(v.infiltrazione) ?? l.primaDelPalazzo.get(v.palazzo) ?? null;
}

/** I passi di un Enigma (vuoto se la voce non è un Enigma con passi). */
function passiDellEnigma(l: PlanimetrieDelleVoci, voce: string): string[] {
  return l.passi.get(voce) ?? [];
}

/**
 * La planimetria principale di una voce con la regola unica (a, b, c; un Enigma con passi: quella del primo passo). Null per una voce dei
 * Memento o senza nessuna planimetria trovata.
 */
export function planimetriaDellaVoce(l: PlanimetrieDelleVoci, voce: string, visti: Set<string> = new Set()): PlanimetriaDellaVoce | null {
  const v = l.voci.get(voce);
  if (!v || visti.has(voce)) return null;
  visti.add(voce);
  const daiPin = principaleDaiPin(l.pin.get(voce));
  if (daiPin) return { chiave: daiPin, aMano: false };
  for (const passo of passiDellEnigma(l, voce)) {
    const p = planimetriaDellaVoce(l, passo, visti);
    if (p) return { chiave: p.chiave, aMano: false };
  }
  if (v.aMano) return { chiave: v.aMano, aMano: true };
  const uno = planimetriaUno(l, v);
  return uno ? { chiave: uno, aMano: false } : null;
}

/**
 * Tutte le planimetrie su cui una voce compare nel visore: quelle dei suoi pin (a); senza pin, la sua planimetria (b o c); per un Enigma
 * con passi, quelle di tutti i passi, ognuno con la propria regola.
 */
export function planimetrieDellaVoce(l: PlanimetrieDelleVoci, voce: string, visti: Set<string> = new Set()): Set<string> {
  const out = new Set<string>();
  const v = l.voci.get(voce);
  if (!v || visti.has(voce)) return out;
  visti.add(voce);
  const pin = l.pin.get(voce);
  if (pin?.length) {
    for (const p of pin) out.add(p.mappa);
    return out;
  }
  const passi = passiDellEnigma(l, voce);
  if (passi.length) {
    for (const passo of passi) for (const m of planimetrieDellaVoce(l, passo, visti)) out.add(m);
    if (out.size) return out;
  }
  const p = v.aMano ?? planimetriaUno(l, v);
  if (p) out.add(p);
  return out;
}
