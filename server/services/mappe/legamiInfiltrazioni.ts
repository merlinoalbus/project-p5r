// ============================================================
// legamiInfiltrazioni — i legami infiltrazione ↔ area dei Palazzi (L3, 2026-10-20): letture comuni e l'unica scrittura
// ============================================================
//
// Da L3 un'infiltrazione (`dungeon_area`) tocca delle **Aree** del Palazzo (tabella `area` con `dungeon_chiave`), molti a molti, in
// `infiltrazione_area` (migrazione 110): l'ordine delle aree dentro l'infiltrazione e la versione da aprire (`planimetria_iniziale`,
// null = la predefinita dell'area). È l'unica fonte del legame: `mappa_entita` di tipo area, le colonne `mappa.entita_*` e i gruppi
// d'immagini non ci sono più (tolti da L11 · B9, migrazione 177; prima nessuno li leggeva, R3-09). «Le planimetrie di un'infiltrazione» sono quelle delle
// sue aree, nell'ordine dei legami e poi delle versioni (modifiche §1.2).
//
// Il modulo dipende solo dal database e dai percorsi pubblici: lo usano la scheda del Palazzo, le Aree, la guida sulle mappe,
// l'accesso dal mondo e il pacchetto, senza richiamarsi in cerchio. Su uno schema prima della 110 (test fermi a una migrazione) la
// tabella non c'è e le letture tornano vuote.
// ============================================================

import { getDb, nowIso, prepared } from '../../db/dbService.js';
import { httpErrors } from '../../utils/httpError.js';
import { idMappa } from './percorsiMappe.js';

/** Vero se la tabella dei legami c'è (dalla 110). */
export function conLegami(): boolean {
  return !!prepared("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'infiltrazione_area'").get();
}

/** Un'infiltrazione che tocca un'Area. */
export interface InfiltrazioneDellArea { chiave: string; nome: string; ordine: number }

/** Le infiltrazioni di ogni Area dei Palazzi (di un Palazzo solo, o di tutti), nell'ordine delle infiltrazioni nel Palazzo. */
export function infiltrazioniDelleAree(dungeon?: string): Map<string, InfiltrazioneDellArea[]> {
  const out = new Map<string, InfiltrazioneDellArea[]>();
  if (!conLegami()) return out;
  const righe = prepared(`SELECT ia.area_chiave AS area, i.chiave, i.nome, i.ordine FROM infiltrazione_area ia JOIN dungeon_area i ON i.chiave = ia.infiltrazione_chiave
    ${dungeon === undefined ? '' : 'WHERE i.dungeon_chiave = ?'} ORDER BY i.ordine, i.chiave`).all(...(dungeon === undefined ? [] : [dungeon])) as Array<{ area: string } & InfiltrazioneDellArea>;
  for (const r of righe) out.set(r.area, [...(out.get(r.area) ?? []), { chiave: r.chiave, nome: r.nome, ordine: r.ordine }]);
  return out;
}

/** Un'Area toccata da un'infiltrazione, con la versione da aprire (chiave interna; null = la predefinita). */
export interface AreaDellInfiltrazione { chiave: string; slug: string; nome: string; ordine: number; planimetriaIniziale: string | null; predefinita: string | null }

/** Le Aree di ogni infiltrazione di un Palazzo (o di tutti), nell'ordine dei legami. */
export function areeDelleInfiltrazioni(dungeon?: string): Map<string, AreaDellInfiltrazione[]> {
  const out = new Map<string, AreaDellInfiltrazione[]>();
  if (!conLegami()) return out;
  const righe = prepared(`SELECT ia.infiltrazione_chiave AS inf, a.chiave, a.slug, a.nome, ia.ordine, ia.planimetria_iniziale, a.planimetria_predefinita
    FROM infiltrazione_area ia JOIN area a ON a.chiave = ia.area_chiave JOIN dungeon_area i ON i.chiave = ia.infiltrazione_chiave
    ${dungeon === undefined ? '' : 'WHERE i.dungeon_chiave = ?'} ORDER BY ia.infiltrazione_chiave, ia.ordine, a.ordine, a.chiave`).all(...(dungeon === undefined ? [] : [dungeon])) as
    Array<{ inf: string; chiave: string; slug: string; nome: string; ordine: number; planimetria_iniziale: string | null; planimetria_predefinita: string | null }>;
  for (const r of righe) {
    out.set(r.inf, [...(out.get(r.inf) ?? []), { chiave: r.chiave, slug: r.slug, nome: r.nome, ordine: r.ordine, planimetriaIniziale: r.planimetria_iniziale, predefinita: r.planimetria_predefinita }]);
  }
  return out;
}

/** Le planimetrie (chiavi interne) di ogni infiltrazione di un Palazzo: tutte quelle delle sue aree, nell'ordine dei legami e delle versioni. */
export function planimetrieDelleInfiltrazioni(dungeon: string): Map<string, Array<{ chiave: string; area: string }>> {
  const out = new Map<string, Array<{ chiave: string; area: string }>>();
  if (!conLegami()) return out;
  const righe = prepared(`SELECT ia.infiltrazione_chiave AS inf, m.chiave, m.area_chiave AS area
    FROM infiltrazione_area ia JOIN dungeon_area i ON i.chiave = ia.infiltrazione_chiave JOIN mappa m ON m.area_chiave = ia.area_chiave
    WHERE i.dungeon_chiave = ? ORDER BY ia.infiltrazione_chiave, ia.ordine, ia.area_chiave, m.versione_ordine, m.chiave`).all(dungeon) as Array<{ inf: string; chiave: string; area: string }>;
  for (const r of righe) out.set(r.inf, [...(out.get(r.inf) ?? []), { chiave: r.chiave, area: r.area }]);
  return out;
}

/** Le infiltrazioni di una planimetria: quelle della sua Area, nell'ordine del Palazzo (vuoto senza Area o senza legami). */
export function infiltrazioniDellaMappa(mappaInterna: string): InfiltrazioneDellArea[] {
  if (!conLegami()) return [];
  return prepared(`SELECT i.chiave, i.nome, i.ordine FROM mappa m JOIN infiltrazione_area ia ON ia.area_chiave = m.area_chiave
    JOIN dungeon_area i ON i.chiave = ia.infiltrazione_chiave WHERE m.chiave = ? ORDER BY i.ordine, i.chiave`).all(mappaInterna) as InfiltrazioneDellArea[];
}

/** Le infiltrazioni di ogni planimetria con Area (chiave interna → infiltrazioni), per gli elenchi e il pacchetto. */
export function infiltrazioniDelleMappe(): Map<string, InfiltrazioneDellArea[]> {
  const out = new Map<string, InfiltrazioneDellArea[]>();
  if (!conLegami()) return out;
  const righe = prepared(`SELECT m.chiave AS mappa, i.chiave, i.nome, i.ordine FROM mappa m JOIN infiltrazione_area ia ON ia.area_chiave = m.area_chiave
    JOIN dungeon_area i ON i.chiave = ia.infiltrazione_chiave ORDER BY m.chiave, i.ordine, i.chiave`).all() as Array<{ mappa: string } & InfiltrazioneDellArea>;
  for (const r of righe) out.set(r.mappa, [...(out.get(r.mappa) ?? []), { chiave: r.chiave, nome: r.nome, ordine: r.ordine }]);
  return out;
}

/** L'ordine minimo di partenza per un legame nuovo in fondo a un'infiltrazione. */
function inFondo(infiltrazione: string): number {
  return prepared('SELECT COALESCE(MAX(ordine) + 1, 0) FROM infiltrazione_area WHERE infiltrazione_chiave = ?').pluck().get(infiltrazione) as number;
}

/** Il Palazzo di un'infiltrazione (404 `area-non-trovata` se non c'è: il nome del codice di oggi per le infiltrazioni). */
function palazzoDellInfiltrazione(infiltrazione: string): { dungeon: string; nome: string } {
  const r = prepared('SELECT dungeon_chiave AS dungeon, nome FROM dungeon_area WHERE chiave = ?').get(infiltrazione) as { dungeon: string; nome: string } | undefined;
  if (!r) throw httpErrors.notFound('area-non-trovata', `L'infiltrazione '${infiltrazione}' non esiste.`);
  return r;
}

/**
 * L'unica scrittura dei legami infiltrazione ↔ area (R3-23), dai due lati, un gesto solo che non sposta voci né pin:
 * - **dall'infiltrazione** (`{ infiltrazione, aree, planimetrieIniziali? }`): l'insieme ordinato delle sue Aree (chiavi `area.chiave`); i
 *   legami tolti spariscono, quelli che restano tengono origine e versione iniziale (salvo `planimetrieIniziali`, chiave pubblica di una
 *   planimetria dell'area, `null` = la predefinita), l'ordine diventa quello dato;
 * - **dall'area** (`{ area, infiltrazioni }`): l'insieme delle infiltrazioni che la toccano; i legami nuovi vanno in fondo a ogni
 *   infiltrazione, quelli che restano non si toccano.
 * Un'area di un altro Palazzo è un 409 `area-di-un-altro-palazzo`; una chiave che non esiste un 404. Va chiamata dentro o fuori da una
 * transazione: ne apre una sua (annidata se serve).
 */
export function impostaLegamiInfiltrazione(dati: { infiltrazione: string; aree: readonly string[]; planimetrieIniziali?: Readonly<Record<string, string | null>> } | { area: string; infiltrazioni: readonly string[] }): void {
  const db = getDb();
  const areaDi = (chiave: string) => {
    const a = prepared('SELECT chiave, nome, dungeon_chiave FROM area WHERE chiave = ?').get(chiave) as { chiave: string; nome: string; dungeon_chiave: string | null } | undefined;
    if (!a) throw httpErrors.notFound('area-non-trovata', `Nessuna area '${chiave}'.`);
    return a;
  };
  if ('infiltrazione' in dati) {
    const p = palazzoDellInfiltrazione(dati.infiltrazione);
    const aree = [...new Set(dati.aree)];
    for (const chiave of aree) {
      const a = areaDi(chiave);
      if (a.dungeon_chiave !== p.dungeon) throw httpErrors.conflict('area-di-un-altro-palazzo', `L’area «${a.nome}» non è di questo Palazzo: un’infiltrazione tocca solo aree del suo Palazzo.`);
    }
    const iniziali = new Map<string, string | null>();
    for (const [area, pianta] of Object.entries(dati.planimetrieIniziali ?? {})) {
      if (!aree.includes(area)) throw httpErrors.badRequest('planimetria-di-altra-area', 'La versione da aprire si sceglie per un’area dell’infiltrazione.');
      if (pianta === null) { iniziali.set(area, null); continue; }
      const interna = idMappa(pianta);
      if (!prepared('SELECT 1 FROM mappa WHERE chiave = ? AND area_chiave = ?').get(interna, area)) throw httpErrors.badRequest('planimetria-di-altra-area', 'La versione da aprire è una planimetria dell’area.');
      iniziali.set(area, interna);
    }
    db.transaction(() => {
      const presenti = prepared('SELECT area_chiave FROM infiltrazione_area WHERE infiltrazione_chiave = ?').pluck().all(dati.infiltrazione) as string[];
      for (const k of presenti) if (!aree.includes(k)) prepared('DELETE FROM infiltrazione_area WHERE infiltrazione_chiave = ? AND area_chiave = ?').run(dati.infiltrazione, k);
      aree.forEach((k, i) => {
        if (presenti.includes(k)) prepared('UPDATE infiltrazione_area SET ordine = ? WHERE infiltrazione_chiave = ? AND area_chiave = ? AND ordine <> ?').run(i, dati.infiltrazione, k, i);
        else prepared("INSERT INTO infiltrazione_area (infiltrazione_chiave, area_chiave, ordine, planimetria_iniziale, origine) VALUES (?, ?, ?, NULL, 'utente')").run(dati.infiltrazione, k, i);
        if (iniziali.has(k)) prepared('UPDATE infiltrazione_area SET planimetria_iniziale = ? WHERE infiltrazione_chiave = ? AND area_chiave = ? AND planimetria_iniziale IS NOT ?').run(iniziali.get(k), dati.infiltrazione, k, iniziali.get(k));
      });
      prepared('UPDATE area SET updated_at = ? WHERE chiave IN (SELECT value FROM json_each(?))').run(nowIso(), JSON.stringify([...new Set([...aree, ...presenti.filter((k) => !aree.includes(k))])]));
    })();
    return;
  }
  const a = areaDi(dati.area);
  if (!a.dungeon_chiave) throw httpErrors.badRequest('area-senza-palazzo', 'Le infiltrazioni si legano alle aree dei Palazzi.');
  const infiltrazioni = [...new Set(dati.infiltrazioni)];
  for (const k of infiltrazioni) {
    const p = palazzoDellInfiltrazione(k);
    if (p.dungeon !== a.dungeon_chiave) throw httpErrors.conflict('area-di-un-altro-palazzo', `L’infiltrazione «${p.nome}» è di un altro Palazzo: un’area si lega alle infiltrazioni del suo.`);
  }
  db.transaction(() => {
    const presenti = prepared('SELECT infiltrazione_chiave FROM infiltrazione_area WHERE area_chiave = ?').pluck().all(a.chiave) as string[];
    for (const k of presenti) if (!infiltrazioni.includes(k)) prepared('DELETE FROM infiltrazione_area WHERE infiltrazione_chiave = ? AND area_chiave = ?').run(k, a.chiave);
    for (const k of infiltrazioni) {
      if (!presenti.includes(k)) prepared("INSERT INTO infiltrazione_area (infiltrazione_chiave, area_chiave, ordine, planimetria_iniziale, origine) VALUES (?, ?, ?, NULL, 'utente')").run(k, a.chiave, inFondo(k));
    }
    prepared('UPDATE area SET updated_at = ? WHERE chiave = ?').run(nowIso(), a.chiave);
  })();
}

/**
 * Toglie un'infiltrazione dagli insiemi delle voci del diario (`voce_infiltrazione`) e dalle proposte, e ricompatta le posizioni rimaste
 * di ogni voce toccata (0…n-1), dentro la transazione di chi chiama (l'eliminazione dell'infiltrazione, nel cestino: il ripristino rimette
 * righe e posizioni com'erano). Una voce che l'aveva due volte (N2) perde tutte e due le posizioni.
 */
export function staccaInfiltrazioneDalleVoci(infiltrazione: string): void {
  if (!conLegami()) return;
  for (const tabella of ['voce_infiltrazione', 'proposta_infiltrazione_voce'] as const) {
    const voci = prepared(`SELECT DISTINCT voce_uid FROM ${tabella} WHERE infiltrazione_chiave = ?`).pluck().all(infiltrazione) as string[];
    prepared(`DELETE FROM ${tabella} WHERE infiltrazione_chiave = ?`).run(infiltrazione);
    for (const uid of voci) {
      const posizioni = prepared(`SELECT ordine FROM ${tabella} WHERE voce_uid = ? ORDER BY ordine`).pluck().all(uid) as number[];
      // la chiave è (voce, posizione): si passa da posizioni negative per non scontrarsi con quelle ancora da spostare
      posizioni.forEach((o, i) => { if (o !== i) prepared(`UPDATE ${tabella} SET ordine = ? WHERE voce_uid = ? AND ordine = ?`).run(-1 - i, uid, o); });
      posizioni.forEach((o, i) => { if (o !== i) prepared(`UPDATE ${tabella} SET ordine = ? WHERE voce_uid = ? AND ordine = ?`).run(i, uid, -1 - i); });
    }
  }
}

/** Toglie un'area da ogni infiltrazione e ricompatta l'ordine delle aree rimaste in ciascuna (dentro la transazione di chi chiama). */
export function staccaAreaDalleInfiltrazioni(area: string): void {
  if (!conLegami()) return;
  const toccate = prepared('SELECT infiltrazione_chiave FROM infiltrazione_area WHERE area_chiave = ?').pluck().all(area) as string[];
  prepared('DELETE FROM infiltrazione_area WHERE area_chiave = ?').run(area);
  for (const inf of toccate) {
    (prepared('SELECT area_chiave FROM infiltrazione_area WHERE infiltrazione_chiave = ? ORDER BY ordine, area_chiave').pluck().all(inf) as string[])
      .forEach((k, i) => prepared('UPDATE infiltrazione_area SET ordine = ? WHERE infiltrazione_chiave = ? AND area_chiave = ? AND ordine <> ?').run(i, inf, k, i));
  }
}
