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
import type { AreaDungeonDto, DedaloDto, DungeonDettaglioDto, DungeonRiassuntoDto, PiantaAreaDto, PuntoInteresseDto, SpilloRaccoltaDto, StatoPunto, StatoRichiesta } from '../../shared/types.js';
import { importaImmagineDaUrl } from './immaginiService.js';
import { chiaveMappa, nomePercorso } from './mappe/percorsiMappe.js';
import { DEFINIZIONI_SPILLO, type TipoSpillo } from '../../shared/spilli.js';
import { timbriPartita } from './timbriService.js';

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

interface RigaPianta { area_chiave: string; url: string; pagina: string | null; fonte: string; licenza: string; larghezza: number | null; altezza: number | null; copertura: string; copre_aree_json: string | null; note: string; alternative_json: string }

function pianteAree(): Map<string, RigaPianta> {
  return new Map((prepared('SELECT * FROM pianta_area').all() as RigaPianta[]).map((r) => [r.area_chiave, r]));
}

function piantaDto(r: RigaPianta | undefined): PiantaAreaDto | null {
  if (!r) return null;
  const alternative = (JSON.parse(r.alternative_json) as Array<{ url: string; pagina: string | null; fonte: string }>).map((a) => ({ url: a.url, pagina: a.pagina ?? null, fonte: a.fonte }));
  return { url: r.url, pagina: r.pagina, fonte: r.fonte, licenza: r.licenza, larghezza: r.larghezza, altezza: r.altezza, copertura: r.copertura, note: r.note, alternative };
}

/** Motivi noti dell'assenza di una pianta (campo note delle aree senza url, in `dati_guida`). */
function motiviAssenza(): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of prepared("SELECT chiave, json FROM dati_guida WHERE chiave = 'mappe-assenti'").all() as Array<{ chiave: string; json: string }>) {
    for (const [k, v] of Object.entries(JSON.parse(r.json) as Record<string, string>)) m.set(k, v);
  }
  return m;
}

function mappePresenti(): Map<string, string | null> {
  return new Map((prepared("SELECT chiave, origine_url FROM immagine WHERE ambito = 'mappa'").all() as Array<{ chiave: string; origine_url: string | null }>).map((r) => [r.chiave, r.origine_url ?? null]));
}

/** Fonte effettiva della pianta presente: la principale, un'alternativa o l'indirizzo grezzo se non riconosciuto. */
function piantaScaricata(origine: string | null | undefined, pianta: PiantaAreaDto | null): AreaDungeonDto['piantaScaricata'] {
  if (!origine) return null;
  if (pianta && pianta.url === origine) return { url: origine, fonte: pianta.fonte, pagina: pianta.pagina };
  const alt = pianta?.alternative.find((a) => a.url === origine);
  if (alt) return { url: origine, fonte: alt.fonte, pagina: alt.pagina };
  let host = origine;
  try { host = new URL(origine).hostname.replace(/^www\./, ''); } catch { /* indirizzo non URL: si mostra com'è */ }
  return { url: origine, fonte: host, pagina: null };
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

export function dettaglioDungeon(chiave: string, partitaId?: number): DungeonDettaglioDto {
  const r = prepared('SELECT * FROM dungeon WHERE chiave = ?').get(chiave) as RigaDungeon | undefined;
  if (!r) throw httpErrors.notFound('dungeon-non-trovato', `Il dungeon '${chiave}' non esiste.`);
  const stati = statiPartita(partitaId);
  const marc = marcatori();
  const mappe = mappePresenti();
  const piante = pianteAree();
  const assenti = motiviAssenza();
  const native = mappeDelleAree(chiave);
  const raccolta = r.tipo === 'mementos' ? null : raccoltaMappe(chiave, partitaId);
  const richieste = r.tipo === 'mementos' ? richiestePerArea(chiave, partitaId) : null;
  const timbri = r.tipo === 'mementos' && partitaId !== undefined ? timbriPartita(partitaId) : null;
  const aree = (prepared('SELECT * FROM dungeon_area WHERE dungeon_chiave = ? ORDER BY ordine').all(chiave) as RigaArea[]).map((a): AreaDungeonDto => ({
    chiave: a.chiave, ordine: a.ordine, nome: a.nome, descrizione: a.descrizione, mappa: mappe.has(a.chiave), pianta: piantaDto(piante.get(a.chiave)), piantaScaricata: mappe.has(a.chiave) ? piantaScaricata(mappe.get(a.chiave), piantaDto(piante.get(a.chiave))) : null, piantaAssente: piante.has(a.chiave) ? null : (assenti.get(a.chiave) ?? null),
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
  const planimetrie = raccolta ? [...raccolta.perMappa.entries()].map(([chiave, m]) => ({ chiave: chiaveMappa(chiave), nome: nomePercorso(chiave), n: m.n, presi: m.presi, spilli: m.spilli })) : [];
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

/** Scarica nell'istanza la pianta dell'area dall'URL della guida (poi dalle alternative, se il primo fallisce). */
export async function scaricaPianta(areaChiave: string): Promise<{ area: string; mime: string; byte: number; fonte: string; url: string }> {
  const r = prepared('SELECT * FROM pianta_area WHERE area_chiave = ?').get(areaChiave) as RigaPianta | undefined;
  if (!r) throw httpErrors.notFound('pianta-non-disponibile', `Nessuna pianta collegata per l'area '${areaChiave}'.`);
  const candidati = [{ url: r.url, fonte: r.fonte }, ...(JSON.parse(r.alternative_json) as Array<{ url: string; fonte: string }>).map((a) => ({ url: a.url, fonte: a.fonte }))];
  let ultimo: unknown = null;
  for (const c of candidati) {
    try {
      const img = await importaImmagineDaUrl('mappa', areaChiave, c.url);
      return { area: areaChiave, mime: img.mime, byte: img.byte, fonte: c.fonte, url: c.url };
    } catch (err) {
      ultimo = err;
    }
  }
  throw httpErrors.badRequest('download-fallito', `Impossibile scaricare la pianta di '${areaChiave}' da nessuna delle fonti collegate${ultimo instanceof Error ? `: ${ultimo.message}` : ''}.`);
}
