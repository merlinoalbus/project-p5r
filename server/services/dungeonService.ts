// ============================================================
// dungeonService — Palazzi e Dedali: schede, aree, punti di interesse con stato per partita, marcatori delle mappe (Fase 7.1)
// ============================================================
//
// Dalla voce 5 del piano «struttura, non frasi» (2026-09-12) la percentuale di un Palazzo è la
// **raccolta sulle planimetrie**: i collezionabili (`spillo.collezionabile`) di tutte le mappe
// dell'albero `dungeon-<chiave>` e quanti ne ha presi la partita («raccolto» per uid, oppure il
// punto della guida già gestito). Per i Memento contano gli obiettivi dei dedali: i timbri
// dichiarati dalla guida (migrazione 077) e le richieste di quel dedalo.
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { t } from './traduzioniService.js';
import { registraEvento } from './storicoService.js';
import type { AreaDungeonDto, DedaloDto, DungeonDettaglioDto, DungeonRiassuntoDto, PuntoInteresseDto, SpilloRaccoltaDto, StatoPunto, StatoRichiesta } from '../../shared/types.js';
import { chiaveMappa, nomePercorso } from './mappe/percorsiMappe.js';
import { DEFINIZIONI_SPILLO, type TipoSpillo } from '../../shared/spilli.js';
import { timbriPartita } from './timbriService.js';
import { slug } from '../../shared/slug.js';

interface RigaDungeon { chiave: string; tipo: 'palazzo' | 'mementos'; ordine: number; nome: string; sovrano: string; arcana_sovrano: string; data_sblocco: string; data_scadenza: string; furto_consigliato: string; livello_consigliato: string; note: string; fonti_json: string }
interface RigaArea { chiave: string; dungeon_chiave: string; ordine: number; nome: string; descrizione: string; timbri_totale: number | null }
interface RigaPunto { chiave: string; area_chiave: string; ordine: number; tipo: PuntoInteresseDto['tipo']; nome: string; descrizione: string; esauribile: number; dettagli_json: string; fonte: string }

function statiPartita(partitaId: number | undefined): Map<string, StatoPunto> {
  if (partitaId === undefined) return new Map();
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  return new Map((prepared('SELECT punto_chiave, stato FROM punto_partita WHERE partita_id = ?').all(partitaId) as Array<{ punto_chiave: string; stato: StatoPunto }>).map((r) => [r.punto_chiave, r.stato]));
}

function marcatori(): Map<string, { x: number; y: number }> {
  return new Map((prepared('SELECT punto_chiave, x, y FROM marcatore_mappa').all() as Array<{ punto_chiave: string; x: number; y: number }>).map((r) => [r.punto_chiave, { x: r.x, y: r.y }]));
}

/** Le planimetrie native dell'atlante legate a ogni area della guida (`mappa_entita`, `entita_tipo = 'area'`). */
function mappeDelleAree(dungeonChiave: string): Map<string, Array<{ chiave: string; nome: string }>> {
  const righe = prepared(`SELECT e.entita_chiave AS area, m.chiave AS mappa
    FROM mappa_entita e
    JOIN mappa m ON m.chiave = e.mappa_chiave
    JOIN dungeon_area a ON a.chiave = e.entita_chiave
    WHERE e.entita_tipo = 'area' AND a.dungeon_chiave = ?
    ORDER BY a.ordine, m.ordine, m.chiave`).all(dungeonChiave) as Array<{ area: string; mappa: string }>;
  const out = new Map<string, Array<{ chiave: string; nome: string }>>();
  for (const r of righe) {
    const elenco = out.get(r.area) ?? [];
    elenco.push({ chiave: r.mappa, nome: nomePercorso(r.mappa) });
    out.set(r.area, elenco);
  }
  return out;
}

// ---- La raccolta sulle planimetrie ----

interface RaccoltaMappa { n: number; presi: number | null; spilli: SpilloRaccoltaDto[] }
export interface RaccoltaDungeon { perMappa: Map<string, RaccoltaMappa>; totale: number; presi: number | null; mappe: number; mappeComplete: number | null }

/** Le mappe dell'albero del Palazzo: la radice `dungeon-<chiave>` e tutte le discendenti. */
function mappeDelPalazzo(dungeonChiave: string): string[] {
  return (prepared(`WITH RECURSIVE albero(chiave) AS (
      SELECT chiave FROM mappa WHERE chiave = ?
      UNION ALL
      SELECT m.chiave FROM mappa m JOIN albero a ON m.genitore_chiave = a.chiave
    ) SELECT chiave FROM albero`).all(`dungeon-${dungeonChiave}`) as Array<{ chiave: string }>).map((r) => r.chiave);
}

/** I collezionabili di ogni mappa del Palazzo e, con la partita, quanti sono raccolti.
 *  Una mappa senza collezionabili è completa per definizione e non conta fra le mappe. */
export function raccoltaMappe(dungeonChiave: string, partitaId?: number): RaccoltaDungeon {
  const mappe = mappeDelPalazzo(dungeonChiave);
  const perMappa = new Map<string, RaccoltaMappa>();
  if (mappe.length === 0) return { perMappa, totale: 0, presi: partitaId === undefined ? null : 0, mappe: 0, mappeComplete: partitaId === undefined ? null : 0 };
  const raccolti = partitaId === undefined ? null : new Set((prepared('SELECT spillo_uid FROM spillo_partita WHERE partita_id = ? AND raccolto = 1').all(partitaId) as Array<{ spillo_uid: string }>).map((r) => r.spillo_uid));
  // un punto della guida già gestito (ottenuto/esaurito) conta come raccolto anche sulla mappa: è la regola del visore
  const puntiGestiti = partitaId === undefined ? null : new Set((prepared('SELECT punto_chiave FROM punto_partita WHERE partita_id = ?').all(partitaId) as Array<{ punto_chiave: string }>).map((r) => r.punto_chiave));
  const righe = prepared(`SELECT id, uid, mappa_chiave, tipo, nome, riferimento_tipo, riferimento_chiave FROM spillo WHERE collezionabile = 1 AND mappa_chiave IN (${mappe.map(() => '?').join(',')}) ORDER BY mappa_chiave, ordine, id`).all(...mappe) as Array<{ id: number; uid: string; mappa_chiave: string; tipo: string; nome: string; riferimento_tipo: string | null; riferimento_chiave: string | null }>;
  for (const r of righe) {
    const raccolto = raccolti === null ? null : raccolti.has(r.uid) || (r.riferimento_tipo === 'punto' && !!r.riferimento_chiave && !!puntiGestiti?.has(r.riferimento_chiave));
    const m = perMappa.get(r.mappa_chiave) ?? { n: 0, presi: raccolti === null ? null : 0, spilli: [] };
    m.n += 1;
    if (raccolto && m.presi !== null) m.presi += 1;
    m.spilli.push({ id: r.id, uid: r.uid, tipo: r.tipo, nome: r.nome, colore: DEFINIZIONI_SPILLO[r.tipo as TipoSpillo]?.colore ?? '#888888', raccolto });
    perMappa.set(r.mappa_chiave, m);
  }
  let totale = 0; let presi = 0; let complete = 0;
  for (const m of perMappa.values()) { totale += m.n; presi += m.presi ?? 0; if (m.presi !== null && m.presi >= m.n) complete += 1; }
  return { perMappa, totale, presi: partitaId === undefined ? null : presi, mappe: perMappa.size, mappeComplete: partitaId === undefined ? null : complete };
}

// ---- Gli obiettivi dei dedali dei Memento ----

function richiestePerArea(dungeonChiave: string, partitaId?: number): Map<string, DedaloDto['richieste']> {
  const stati = partitaId === undefined ? new Map<string, StatoRichiesta>() : new Map((prepared('SELECT richiesta_chiave, stato FROM richiesta_partita WHERE partita_id = ?').all(partitaId) as Array<{ richiesta_chiave: string; stato: StatoRichiesta }>).map((r) => [r.richiesta_chiave, r.stato]));
  const out = new Map<string, DedaloDto['richieste']>();
  for (const r of prepared('SELECT r.chiave, r.nome, r.area_chiave FROM richiesta r JOIN dungeon_area a ON a.chiave = r.area_chiave WHERE a.dungeon_chiave = ? ORDER BY a.ordine, r.ordine').all(dungeonChiave) as Array<{ chiave: string; nome: string; area_chiave: string }>) {
    const elenco = out.get(r.area_chiave) ?? [];
    elenco.push({ chiave: r.chiave, nome: r.nome, stato: stati.get(r.chiave) ?? null });
    out.set(r.area_chiave, elenco);
  }
  return out;
}

/** Gli obiettivi di un dedalo: i timbri dichiarati e le richieste; null dove non ce n'è nessuno di misurabile. */
function dedaloDto(a: RigaArea, richieste: DedaloDto['richieste'], timbri: Map<string, number> | null): DedaloDto | null {
  const totale = (a.timbri_totale ?? 0) + richieste.length;
  if (totale === 0) return null;
  const raccolti = timbri === null ? null : Math.min(timbri.get(a.chiave) ?? 0, a.timbri_totale ?? Number.MAX_SAFE_INTEGER);
  const fatti = timbri === null ? null : (a.timbri_totale === null ? 0 : (raccolti ?? 0)) + richieste.filter((r) => r.stato === 'completata').length;
  return { timbri: { totale: a.timbri_totale, raccolti: a.timbri_totale === null ? null : raccolti }, richieste, obiettivi: { totale, fatti } };
}

function raccoltaMementos(dungeonChiave: string, partitaId?: number): DungeonRiassuntoDto['raccolta'] {
  const aree = prepared('SELECT * FROM dungeon_area WHERE dungeon_chiave = ? ORDER BY ordine').all(dungeonChiave) as RigaArea[];
  const richieste = richiestePerArea(dungeonChiave, partitaId);
  const timbri = partitaId === undefined ? null : timbriPartita(partitaId);
  let totale = 0; let fatti = 0; let dedali = 0; let complete = 0;
  for (const a of aree) {
    const d = dedaloDto(a, richieste.get(a.chiave) ?? [], timbri);
    if (!d) continue;
    dedali += 1; totale += d.obiettivi.totale; fatti += d.obiettivi.fatti ?? 0;
    if (d.obiettivi.fatti !== null && d.obiettivi.fatti >= d.obiettivi.totale) complete += 1;
  }
  return { totale, presi: partitaId === undefined ? null : fatti, mappe: dedali, mappeComplete: partitaId === undefined ? null : complete };
}

function mappePresenti(): Map<string, string | null> {
  return new Map((prepared("SELECT chiave, origine_url FROM immagine WHERE ambito = 'mappa'").all() as Array<{ chiave: string; origine_url: string | null }>).map((r) => [r.chiave, r.origine_url ?? null]));
}

/** Le finestre trascritte in `finestre-dungeon`, lette una volta sola: dicono alla mappa di Tokyo quando un Palazzo c'è. */
let finestreCache: Map<string, { dal: string; al: string | null }> | null = null;

function finestreDungeon(): Map<string, { dal: string; al: string | null }> {
  if (finestreCache) return finestreCache;
  finestreCache = new Map();
  const riga = prepared("SELECT json FROM dati_guida WHERE chiave = 'finestre-dungeon'").get() as { json: string } | undefined;
  if (riga) {
    try {
      const dati = JSON.parse(riga.json) as { finestre?: Array<{ dungeon: string; dal?: string | null; al?: string | null }> };
      for (const f of dati.finestre ?? []) {
        if (f.dal) finestreCache.set(f.dungeon, { dal: f.dal, al: f.al ?? null });
      }
    } catch { /* trascrizione illeggibile: si resta senza finestre, non si indovina */ }
  }
  return finestreCache;
}

/** Da chiamare quando i dati di gioco vengono ricaricati: la trascrizione può essere cambiata. */
export function invalidaFinestreDungeon(): void { finestreCache = null; }

function riassunto(r: RigaDungeon, stati: Map<string, StatoPunto>, partitaId: number | undefined): DungeonRiassuntoDto {
  const conPartita = partitaId !== undefined;
  const punti = prepared('SELECT p.chiave, p.esauribile, p.tipo FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave WHERE a.dungeon_chiave = ?').all(r.chiave) as Array<{ chiave: string; esauribile: number; tipo: string }>;
  const raccolta = r.tipo === 'mementos' ? raccoltaMementos(r.chiave, partitaId) : (({ totale, presi, mappe, mappeComplete }) => ({ totale, presi, mappe, mappeComplete }))(raccoltaMappe(r.chiave, partitaId));
  return {
    chiave: r.chiave, tipo: r.tipo, ordine: r.ordine, nome: r.nome, sovrano: r.sovrano, arcanaSovrano: r.arcana_sovrano, arcanaSovranoNome: r.arcana_sovrano ? t('arcana', r.arcana_sovrano) : '',
    date: { sblocco: r.data_sblocco, scadenza: r.data_scadenza, furtoConsigliato: r.furto_consigliato },
    finestra: finestreDungeon().get(r.chiave) ?? null, livelloConsigliato: r.livello_consigliato,
    aree: (prepared('SELECT COUNT(*) AS n FROM dungeon_area WHERE dungeon_chiave = ?').get(r.chiave) as { n: number }).n,
    punti: punti.length, esauribili: punti.filter((p) => p.esauribile === 1).length,
    gestiti: conPartita ? punti.filter((p) => stati.has(p.chiave)).length : null,
    raccolta,
  };
}

export function elencaDungeon(partitaId?: number): DungeonRiassuntoDto[] {
  const stati = statiPartita(partitaId);
  return (prepared('SELECT * FROM dungeon ORDER BY ordine').all() as RigaDungeon[]).map((r) => riassunto(r, stati, partitaId));
}

/**
 * Le planimetrie del Palazzo come si gestiscono: **tutte** quelle dell'albero (radice esclusa, che è
 * la mappa del Palazzo e non una stanza), nel loro ordine logico — quello che si cambia trascinando
 * — con i collezionabili di ognuna e l'area della guida a cui è legata.
 *
 * Prima qui arrivavano solo le mappe che avevano qualcosa da raccogliere, perché servivano solo a
 * fare la percentuale: le altre — le inquadrature alternative, le stanze vuote, i ritagli che nessun
 * campo usa — non comparivano da nessuna parte, e non c'era modo di ordinarle né di toglierle.
 */
function planimetrieDelPalazzo(dungeonChiave: string, raccolta: RaccoltaDungeon, partitaId?: number): DungeonDettaglioDto['planimetrie'] {
  const righe = prepared(`WITH RECURSIVE albero(chiave) AS (
      SELECT chiave FROM mappa WHERE chiave = ?
      UNION ALL
      SELECT m.chiave FROM mappa m JOIN albero a ON m.genitore_chiave = a.chiave
    )
    SELECT m.chiave, m.ordine, e.entita_chiave AS area, a.nome AS area_nome
    FROM mappa m JOIN albero t ON t.chiave = m.chiave
    LEFT JOIN mappa_entita e ON e.mappa_chiave = m.chiave AND e.entita_tipo = 'area'
    LEFT JOIN dungeon_area a ON a.chiave = e.entita_chiave
    WHERE m.chiave <> ?
    ORDER BY m.ordine, m.chiave`).all(`dungeon-${dungeonChiave}`, `dungeon-${dungeonChiave}`) as Array<{ chiave: string; ordine: number; area: string | null; area_nome: string | null }>;
  return righe.map((r) => {
    const m = raccolta.perMappa.get(r.chiave);
    return {
      chiave: chiaveMappa(r.chiave), nome: nomePercorso(r.chiave), ordine: r.ordine,
      area: r.area && r.area_nome ? { chiave: r.area, nome: r.area_nome } : null,
      n: m?.n ?? 0, presi: partitaId === undefined ? null : (m?.presi ?? 0), spilli: m?.spilli ?? [],
    };
  });
}

export function dettaglioDungeon(chiave: string, partitaId?: number): DungeonDettaglioDto {
  const r = prepared('SELECT * FROM dungeon WHERE chiave = ?').get(chiave) as RigaDungeon | undefined;
  if (!r) throw httpErrors.notFound('dungeon-non-trovato', `Il dungeon '${chiave}' non esiste.`);
  const stati = statiPartita(partitaId);
  const marc = marcatori();
  const mappe = mappePresenti();
  const native = mappeDelleAree(chiave);
  const raccolta = r.tipo === 'mementos' ? null : raccoltaMappe(chiave, partitaId);
  const richieste = r.tipo === 'mementos' ? richiestePerArea(chiave, partitaId) : null;
  const timbri = r.tipo === 'mementos' && partitaId !== undefined ? timbriPartita(partitaId) : null;
  const aree = (prepared('SELECT * FROM dungeon_area WHERE dungeon_chiave = ? ORDER BY ordine').all(chiave) as RigaArea[]).map((a): AreaDungeonDto => ({
    chiave: a.chiave, ordine: a.ordine, nome: a.nome, descrizione: a.descrizione, mappa: mappe.has(a.chiave),
    mappe: (native.get(a.chiave) ?? []).map((m) => {
      const rm = raccolta?.perMappa.get(m.chiave);
      return { chiave: chiaveMappa(m.chiave), nome: m.nome, n: rm?.n ?? 0, presi: partitaId === undefined ? null : (rm?.presi ?? 0), spilli: rm?.spilli ?? [] };
    }),
    punti: (prepared('SELECT * FROM punto_interesse WHERE area_chiave = ? ORDER BY ordine').all(a.chiave) as RigaPunto[]).map((p): PuntoInteresseDto => ({
      chiave: p.chiave, ordine: p.ordine, tipo: p.tipo, nome: p.nome, descrizione: p.descrizione, esauribile: p.esauribile === 1, dettagli: JSON.parse(p.dettagli_json) as Record<string, unknown>, fonte: p.fonte,
      stato: stati.get(p.chiave) ?? null, marcatore: marc.get(p.chiave) ?? null,
    })),
    dedalo: richieste ? dedaloDto(a, richieste.get(a.chiave) ?? [], timbri) : null,
  }));
  const planimetrie = raccolta ? planimetrieDelPalazzo(chiave, raccolta, partitaId) : [];
  return { ...riassunto(r, stati, partitaId), note: r.note, fonti: JSON.parse(r.fonti_json) as string[], aree, planimetrie };
}

/** Stato di un punto nella partita: 'ottenuto', 'esaurito' oppure null per azzerare. */
export function impostaStatoPunto(partitaId: number, puntoChiave: string, stato: StatoPunto | null): PuntoInteresseDto {
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  const p = prepared('SELECT p.*, a.nome AS area_nome, d.nome AS dungeon_nome FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave JOIN dungeon d ON d.chiave = a.dungeon_chiave WHERE p.chiave = ?').get(puntoChiave) as (RigaPunto & { area_nome: string; dungeon_nome: string }) | undefined;
  if (!p) throw httpErrors.notFound('punto-non-trovato', `Il punto '${puntoChiave}' non esiste.`);
  const adesso = nowIso();
  getDb().transaction(() => {
    const prima = (prepared('SELECT stato FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').get(partitaId, puntoChiave) as { stato: StatoPunto } | undefined)?.stato ?? null;
    if (stato === null) prepared('DELETE FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').run(partitaId, puntoChiave);
    else prepared('INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, punto_chiave) DO UPDATE SET stato = excluded.stato, updated_at = excluded.updated_at').run(partitaId, puntoChiave, stato, adesso);
    if (stato !== null && stato !== prima) {
      registraEvento(partitaId, 'punto-dungeon', `${p.dungeon_nome} · ${p.area_nome}: ${p.nome} ${stato === 'ottenuto' ? 'ottenuto' : 'esaurito'}`, p.descrizione.slice(0, 200), { punto: puntoChiave, tipo: p.tipo, stato });
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  const marc = marcatori().get(puntoChiave) ?? null;
  return { chiave: p.chiave, ordine: p.ordine, tipo: p.tipo, nome: p.nome, descrizione: p.descrizione, esauribile: p.esauribile === 1, dettagli: JSON.parse(p.dettagli_json) as Record<string, unknown>, fonte: p.fonte, stato, marcatore: marc };
}

/** Posiziona (o rimuove con null) lo spillo di un punto sulla mappa della sua area (coordinate in percentuale). */
export function impostaMarcatore(puntoChiave: string, posizione: { x: number; y: number } | null): { x: number; y: number } | null {
  if (!prepared('SELECT 1 FROM punto_interesse WHERE chiave = ?').get(puntoChiave)) throw httpErrors.notFound('punto-non-trovato', `Il punto '${puntoChiave}' non esiste.`);
  if (posizione === null) {
    prepared('DELETE FROM marcatore_mappa WHERE punto_chiave = ?').run(puntoChiave);
    return null;
  }
  const x = Math.max(0, Math.min(100, posizione.x));
  const y = Math.max(0, Math.min(100, posizione.y));
  prepared("INSERT INTO marcatore_mappa (punto_chiave, x, y, updated_at, origine) VALUES (?, ?, ?, ?, 'utente') ON CONFLICT(punto_chiave) DO UPDATE SET x = excluded.x, y = excluded.y, updated_at = excluded.updated_at, origine = 'utente'").run(puntoChiave, x, y, nowIso());
  return { x, y };
}

// ---- Correzione dei testi della guida (fase «tutto modificabile») ----
//
// La sezione dei Palazzi era l'unica parte della guida in sola lettura: negozi, luoghi, libri,
// film e attività hanno il loro modulo da un pezzo, mentre dungeon, aree e punti si potevano solo
// guardare. Una trascrizione fatta a mano da un sito ha refusi, frasi tagliate e nomi discutibili,
// e chi gioca deve poterli correggere dove li legge, senza aprire il database.
//
// Le correzioni sono **dati di gioco** (stanno in `gioco.db`), quindi entrano nel pacchetto quando
// lo si rigenera, e valgono per ogni partita: non sono avanzamento.

export interface DatiDungeon { nome?: string; sovrano?: string; dataSblocco?: string; dataScadenza?: string; furtoConsigliato?: string; livelloConsigliato?: string; note?: string }

/** Testi della scheda di un Palazzo (o dei Memento). */
export function aggiornaDungeon(chiave: string, dati: DatiDungeon): DungeonDettaglioDto {
  const r = prepared('SELECT * FROM dungeon WHERE chiave = ?').get(chiave) as RigaDungeon | undefined;
  if (!r) throw httpErrors.notFound('dungeon-non-trovato', `Il dungeon '${chiave}' non esiste.`);
  prepared(`UPDATE dungeon SET nome = ?, sovrano = ?, data_sblocco = ?, data_scadenza = ?, furto_consigliato = ?, livello_consigliato = ?, note = ? WHERE chiave = ?`).run(
    dati.nome?.trim() || r.nome, dati.sovrano ?? r.sovrano, dati.dataSblocco ?? r.data_sblocco, dati.dataScadenza ?? r.data_scadenza,
    dati.furtoConsigliato ?? r.furto_consigliato, dati.livelloConsigliato ?? r.livello_consigliato, dati.note ?? r.note, chiave);
  return dettaglioDungeon(chiave);
}

export interface DatiArea { nome?: string; descrizione?: string }

/** Nome e descrizione di un'area della guida. */
export function aggiornaArea(chiaveArea: string, dati: DatiArea): AreaDungeonDto {
  const a = prepared('SELECT * FROM dungeon_area WHERE chiave = ?').get(chiaveArea) as RigaArea | undefined;
  if (!a) throw httpErrors.notFound('area-non-trovata', `L'area '${chiaveArea}' non esiste.`);
  prepared('UPDATE dungeon_area SET nome = ?, descrizione = ? WHERE chiave = ?').run(dati.nome?.trim() || a.nome, dati.descrizione ?? a.descrizione, chiaveArea);
  const scheda = dettaglioDungeon(a.dungeon_chiave);
  return scheda.aree.find((x) => x.chiave === chiaveArea)!;
}

export interface DatiPunto { nome?: string; descrizione?: string; tipo?: PuntoInteresseDto['tipo']; esauribile?: boolean; ordine?: number }

/** Un punto della guida (sicura, enigma, boss…): testo, tipo, esauribilità, posto nell'elenco. */
export function aggiornaPunto(puntoChiave: string, dati: DatiPunto): PuntoInteresseDto {
  const p = prepared('SELECT * FROM punto_interesse WHERE chiave = ?').get(puntoChiave) as RigaPunto | undefined;
  if (!p) throw httpErrors.notFound('punto-non-trovato', `Il punto '${puntoChiave}' non esiste.`);
  prepared('UPDATE punto_interesse SET nome = ?, descrizione = ?, tipo = ?, esauribile = ?, ordine = ? WHERE chiave = ?').run(
    dati.nome?.trim() || p.nome, dati.descrizione ?? p.descrizione, dati.tipo ?? p.tipo, dati.esauribile === undefined ? p.esauribile : (dati.esauribile ? 1 : 0), dati.ordine ?? p.ordine, puntoChiave);
  const r = prepared('SELECT * FROM punto_interesse WHERE chiave = ?').get(puntoChiave) as RigaPunto;
  return { chiave: r.chiave, ordine: r.ordine, tipo: r.tipo, nome: r.nome, descrizione: r.descrizione, esauribile: r.esauribile === 1, dettagli: JSON.parse(r.dettagli_json) as Record<string, unknown>, fonte: r.fonte, stato: null, marcatore: marcatori().get(puntoChiave) ?? null };
}

/** Un punto in più, dove la guida non l'aveva trascritto: nasce in fondo all'area. */
export function creaPunto(chiaveArea: string, dati: DatiPunto & { nome: string; tipo: PuntoInteresseDto['tipo'] }): PuntoInteresseDto {
  if (!prepared('SELECT 1 FROM dungeon_area WHERE chiave = ?').get(chiaveArea)) throw httpErrors.notFound('area-non-trovata', `L'area '${chiaveArea}' non esiste.`);
  const base = `${chiaveArea}-${slug(dati.nome)}`;
  let chiave = base;
  for (let i = 2; prepared('SELECT 1 FROM punto_interesse WHERE chiave = ?').get(chiave); i++) chiave = `${base}-${i}`;
  const ordine = dati.ordine ?? ((prepared('SELECT COALESCE(MAX(ordine), -1) AS n FROM punto_interesse WHERE area_chiave = ?').get(chiaveArea) as { n: number }).n + 1);
  prepared("INSERT INTO punto_interesse (chiave, area_chiave, ordine, tipo, nome, descrizione, esauribile, dettagli_json, fonte) VALUES (?, ?, ?, ?, ?, ?, ?, '{}', 'utente')")
    .run(chiave, chiaveArea, ordine, dati.tipo, dati.nome.trim(), dati.descrizione ?? '', dati.esauribile ? 1 : 0);
  return aggiornaPunto(chiave, {});
}

/**
 * Toglie un punto della guida e quel che le partite ne avevano segnato.
 *
 * Lo spillo che lo rappresentava sulla mappa **resta** — è un posto sulla planimetria, e cancellarlo
 * porterebbe via anche il disegno — ma perde il riferimento. Con lui se ne va il suo «raccolto» per
 * partita (rilievo della revisione, 2026-09-18): lasciarlo avrebbe tenuto un collezionabile orfano
 * segnato preso, che continuava a contare nella percentuale del Palazzo mentre la conferma diceva
 * che le segnature sparivano.
 */
export function eliminaPunto(puntoChiave: string): void {
  if (!prepared('SELECT 1 FROM punto_interesse WHERE chiave = ?').get(puntoChiave)) throw httpErrors.notFound('punto-non-trovato', `Il punto '${puntoChiave}' non esiste.`);
  getDb().transaction(() => {
    prepared('DELETE FROM punto_partita WHERE punto_chiave = ?').run(puntoChiave);
    prepared('DELETE FROM marcatore_mappa WHERE punto_chiave = ?').run(puntoChiave);
    prepared("DELETE FROM spillo_partita WHERE spillo_uid IN (SELECT uid FROM spillo WHERE riferimento_tipo = 'punto' AND riferimento_chiave = ? AND uid IS NOT NULL)").run(puntoChiave);
    prepared("UPDATE spillo SET riferimento_tipo = NULL, riferimento_chiave = NULL WHERE riferimento_tipo = 'punto' AND riferimento_chiave = ?").run(puntoChiave);
    prepared('DELETE FROM punto_interesse WHERE chiave = ?').run(puntoChiave);
  })();
}
