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
import type { AreaDungeonDto, DedaloDto, DungeonDettaglioDto, DungeonRiassuntoDto, PinDelPuntoDto, PuntoInteresseDto, SpilloRaccoltaDto, StatoPunto, StatoRichiesta } from '../../shared/types.js';
import { chiaveMappa, idMappa, nomePercorso } from './mappe/percorsiMappe.js';
import { DEFINIZIONI_SPILLO, puntoDescrittivo, type TipoSpillo } from '../../shared/spilli.js';
import { timbriPartita } from './timbriService.js';
import { slug } from '../../shared/slug.js';
import { impostaAreeMappa, staccaAreaDaOgniMappa } from './mappe/mappeService.js';
import { palazziCompletati, palazzoDiOgniMappa } from './palazziService.js';
import { allineaStatiPunto, pinDelPuntoGuida } from './mappe/collegamentiGuida.js';

interface RigaDungeon { chiave: string; tipo: 'palazzo' | 'mementos'; ordine: number; nome: string; sovrano: string; arcana_sovrano: string; data_sblocco: string; data_scadenza: string; furto_consigliato: string; livello_consigliato: string; note: string; fonti_json: string }
interface RigaArea { chiave: string; dungeon_chiave: string; ordine: number; nome: string; descrizione: string; timbri_totale: number | null }
interface RigaPunto { chiave: string; area_chiave: string; ordine: number; tipo: PuntoInteresseDto['tipo']; nome: string; descrizione: string; esauribile: number; dettagli_json: string; fonte: string }

function statiPartita(partitaId: number | undefined): Map<string, StatoPunto> {
  if (partitaId === undefined) return new Map();
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  return new Map((prepared('SELECT punto_chiave, stato FROM punto_partita WHERE partita_id = ?').all(partitaId) as Array<{ punto_chiave: string; stato: StatoPunto }>).map((r) => [r.punto_chiave, r.stato]));
}

/** I pin delle planimetrie collegati ai punti (tutti, o di un punto solo), in ordine di id. */
function pinDeiPunti(punto?: string): Map<string, PinDelPuntoDto[]> {
  const righe = prepared(`SELECT id, nome, tipo, mappa_chiave, riferimento_chiave FROM spillo
    WHERE riferimento_tipo = 'punto' AND mappa_chiave IS NOT NULL${punto ? ' AND riferimento_chiave = ?' : ''} ORDER BY id`)
    .all(...(punto ? [punto] : [])) as Array<{ id: number; nome: string; tipo: string; mappa_chiave: string; riferimento_chiave: string }>;
  const out = new Map<string, PinDelPuntoDto[]>();
  for (const r of righe) {
    const elenco = out.get(r.riferimento_chiave) ?? [];
    elenco.push({ id: r.id, nome: r.nome, tipo: r.tipo, mappa: chiaveMappa(r.mappa_chiave), mappaNome: nomePercorso(r.mappa_chiave) });
    out.set(r.riferimento_chiave, elenco);
  }
  return out;
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

function riassunto(r: RigaDungeon, stati: Map<string, StatoPunto>, partitaId: number | undefined, completati: Map<string, string> | null): DungeonRiassuntoDto {
  const conPartita = partitaId !== undefined;
  const punti = prepared('SELECT p.chiave, p.esauribile, p.tipo FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave WHERE a.dungeon_chiave = ?').all(r.chiave) as Array<{ chiave: string; esauribile: number; tipo: string }>;
  const raccolta = r.tipo === 'mementos' ? raccoltaMementos(r.chiave, partitaId) : (({ totale, presi, mappe, mappeComplete }) => ({ totale, presi, mappe, mappeComplete }))(raccoltaMappe(r.chiave, partitaId));
  return {
    chiave: r.chiave, tipo: r.tipo, ordine: r.ordine, nome: r.nome, sovrano: r.sovrano, arcanaSovrano: r.arcana_sovrano, arcanaSovranoNome: r.arcana_sovrano ? t('arcana', r.arcana_sovrano) : '',
    date: { sblocco: r.data_sblocco, scadenza: r.data_scadenza, furtoConsigliato: r.furto_consigliato },
    finestra: finestreDungeon().get(r.chiave) ?? null, livelloConsigliato: r.livello_consigliato,
    aree: (prepared('SELECT COUNT(*) AS n FROM dungeon_area WHERE dungeon_chiave = ?').get(r.chiave) as { n: number }).n,
    punti: punti.length, esauribili: punti.filter((p) => p.esauribile === 1).length,
    // le voci descrittive della guida (solo «Altro») non hanno stato (scelta dell'utente, 2026-10-01): non contano
    gestiti: conPartita ? punti.filter((p) => !puntoDescrittivo(p.tipo) && stati.has(p.chiave)).length : null,
    raccolta,
    // solo i Palazzi si completano: i Memento, una volta aperti, restano un posto dove andare
    completato: r.tipo === 'palazzo' ? completati?.get(r.chiave) ?? null : null,
  };
}

export function elencaDungeon(partitaId?: number): DungeonRiassuntoDto[] {
  const stati = statiPartita(partitaId);
  // i Palazzi completati si calcolano una volta per tutto l'elenco
  const completati = partitaId !== undefined ? palazziCompletati(partitaId) : null;
  return (prepared('SELECT * FROM dungeon ORDER BY ordine').all() as RigaDungeon[]).map((r) => riassunto(r, stati, partitaId, completati));
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
    SELECT m.chiave, m.ordine
    FROM mappa m JOIN albero t ON t.chiave = m.chiave
    WHERE m.chiave <> ?
    ORDER BY m.ordine, m.chiave`).all(`dungeon-${dungeonChiave}`, `dungeon-${dungeonChiave}`) as Array<{ chiave: string; ordine: number }>;
  // Una planimetria può contenere più aree della guida (2026-09-29): si leggono a parte, in ordine di
  // guida. Con il LEFT JOIN di prima una mappa con due aree sarebbe comparsa due volte nell'elenco.
  const areePerMappa = new Map<string, Array<{ chiave: string; nome: string; ordine: number }>>();
  for (const a of prepared(`SELECT e.mappa_chiave, a.chiave, a.nome, a.ordine FROM mappa_entita e JOIN dungeon_area a ON a.chiave = e.entita_chiave
      WHERE e.entita_tipo = 'area' AND a.dungeon_chiave = ? ORDER BY a.ordine, a.chiave`).all(dungeonChiave) as Array<{ mappa_chiave: string; chiave: string; nome: string; ordine: number }>) {
    const elenco = areePerMappa.get(a.mappa_chiave) ?? [];
    elenco.push({ chiave: a.chiave, nome: a.nome, ordine: a.ordine });
    areePerMappa.set(a.mappa_chiave, elenco);
  }
  return righe.map((r) => {
    const m = raccolta.perMappa.get(r.chiave);
    return {
      chiave: chiaveMappa(r.chiave), nome: nomePercorso(r.chiave), ordine: r.ordine,
      aree: areePerMappa.get(r.chiave) ?? [],
      n: m?.n ?? 0, presi: partitaId === undefined ? null : (m?.presi ?? 0), spilli: m?.spilli ?? [],
    };
  });
}

export function dettaglioDungeon(chiave: string, partitaId?: number): DungeonDettaglioDto {
  const r = prepared('SELECT * FROM dungeon WHERE chiave = ?').get(chiave) as RigaDungeon | undefined;
  if (!r) throw httpErrors.notFound('dungeon-non-trovato', `Il dungeon '${chiave}' non esiste.`);
  const stati = statiPartita(partitaId);
  const marc = marcatori();
  const pinPunti = pinDeiPunti();
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
    punti: (prepared('SELECT * FROM punto_interesse WHERE area_chiave = ? ORDER BY ordine, chiave').all(a.chiave) as RigaPunto[]).map((p): PuntoInteresseDto => ({
      chiave: p.chiave, ordine: p.ordine, tipo: p.tipo, nome: p.nome, descrizione: p.descrizione, esauribile: p.esauribile === 1, dettagli: JSON.parse(p.dettagli_json) as Record<string, unknown>, fonte: p.fonte,
      // uno stato rimasto su una voce descrittiva (di prima della scelta) si ignora in lettura, senza cancellarlo
      stato: puntoDescrittivo(p.tipo) ? null : stati.get(p.chiave) ?? null, marcatore: marc.get(p.chiave) ?? null, pin: pinPunti.get(p.chiave) ?? [],
    })),
    dedalo: richieste ? dedaloDto(a, richieste.get(a.chiave) ?? [], timbri) : null,
  }));
  const planimetrie = raccolta ? planimetrieDelPalazzo(chiave, raccolta, partitaId) : [];
  return { ...riassunto(r, stati, partitaId, partitaId !== undefined ? palazziCompletati(partitaId) : null), note: r.note, fonti: JSON.parse(r.fonti_json) as string[], aree, planimetrie };
}

/** Stato di un punto nella partita: 'ottenuto', 'esaurito' oppure null per azzerare. */
export function impostaStatoPunto(partitaId: number, puntoChiave: string, stato: StatoPunto | null): PuntoInteresseDto {
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  const p = prepared('SELECT p.*, a.nome AS area_nome, d.nome AS dungeon_nome FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave JOIN dungeon d ON d.chiave = a.dungeon_chiave WHERE p.chiave = ?').get(puntoChiave) as (RigaPunto & { area_nome: string; dungeon_nome: string }) | undefined;
  if (!p) throw httpErrors.notFound('punto-non-trovato', `Il punto '${puntoChiave}' non esiste.`);
  // una voce descrittiva si legge, non si segna (scelta dell'utente, 2026-10-01); azzerarla resta possibile, per ripulire
  if (stato !== null && puntoDescrittivo(p.tipo)) throw httpErrors.badRequest('punto-descrittivo', `«${p.nome}» è una voce descrittiva della guida: si legge, non si segna.`);
  const adesso = nowIso();
  getDb().transaction(() => {
    const prima = (prepared('SELECT stato FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').get(partitaId, puntoChiave) as { stato: StatoPunto } | undefined)?.stato ?? null;
    if (stato === null) prepared('DELETE FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').run(partitaId, puntoChiave);
    // segnato dall'utente: non è più il segno automatico del Tesoro o del boss raccolti (utente 006)
    else prepared('INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, punto_chiave) DO UPDATE SET stato = excluded.stato, updated_at = excluded.updated_at, automatico = 0').run(partitaId, puntoChiave, stato, adesso);
    if (stato !== null && stato !== prima) {
      registraEvento(partitaId, 'punto-dungeon', `${p.dungeon_nome} · ${p.area_nome}: ${p.nome} ${stato === 'ottenuto' ? 'ottenuto' : 'esaurito'}`, p.descrizione.slice(0, 200), { punto: puntoChiave, tipo: p.tipo, stato });
    }
    // lo stato del punto è quello dei suoi pin (2026-10-01): segnarlo li raccoglie, riaprirlo li riapre
    for (const pin of pinDelPuntoGuida(getDb(), puntoChiave)) {
      prepared(`INSERT INTO spillo_partita (partita_id, spillo_uid, raccolto, updated_at) VALUES (?, ?, ?, ?)
        ON CONFLICT(partita_id, spillo_uid) DO UPDATE SET raccolto = excluded.raccolto, updated_at = excluded.updated_at`).run(partitaId, pin.uid, stato === null ? 0 : 1, adesso);
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  const marc = marcatori().get(puntoChiave) ?? null;
  return { chiave: p.chiave, ordine: p.ordine, tipo: p.tipo, nome: p.nome, descrizione: p.descrizione, esauribile: p.esauribile === 1, dettagli: JSON.parse(p.dettagli_json) as Record<string, unknown>, fonte: p.fonte, stato, marcatore: marc, pin: pinDeiPunti(puntoChiave).get(puntoChiave) ?? [] };
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

/**
 * Elimina un'area della guida, per tutte le partite (richiesta dell'utente, 2026-09-30: «eliminarla davvero»).
 *
 * Se ne vanno con lei: i suoi punti della guida con quel che le partite ne avevano segnato (come
 * `eliminaPunto`), gli spilli della guida senza mappa che le appartenevano col loro «raccolto», i timbri
 * dei dedali, i legami con le planimetrie (che tengono le altre aree), la pianta e gli alias (in cascata).
 * Le richieste restano, senza area. Le aree che la seguivano salgono di un posto: l'ordine resta senza buchi.
 * I dati di gioco vivono in `gioco.db`: un pacchetto importato dopo la rimette, come ogni correzione della guida.
 */
export function eliminaArea(chiaveArea: string): void {
  const a = prepared('SELECT * FROM dungeon_area WHERE chiave = ?').get(chiaveArea) as RigaArea | undefined;
  if (!a) throw httpErrors.notFound('area-non-trovata', `L'area '${chiaveArea}' non esiste.`);
  getDb().transaction(() => {
    for (const { chiave } of prepared('SELECT chiave FROM punto_interesse WHERE area_chiave = ?').all(chiaveArea) as Array<{ chiave: string }>) {
      prepared('DELETE FROM punto_partita WHERE punto_chiave = ?').run(chiave);
      prepared('DELETE FROM marcatore_mappa WHERE punto_chiave = ?').run(chiave);
      // i pin delle planimetrie tengono il loro «raccolto» (lo stato vive nei pin, 2026-10-01): perdono solo il collegamento
      prepared("DELETE FROM spillo_partita WHERE spillo_uid IN (SELECT uid FROM spillo WHERE riferimento_tipo = 'punto' AND riferimento_chiave = ? AND mappa_chiave IS NULL AND uid IS NOT NULL)").run(chiave);
      prepared("UPDATE spillo SET riferimento_tipo = NULL, riferimento_chiave = NULL WHERE riferimento_tipo = 'punto' AND riferimento_chiave = ?").run(chiave);
    }
    prepared('DELETE FROM punto_interesse WHERE area_chiave = ?').run(chiaveArea);
    // gli spilli della guida (senza mappa) vincolano l'area con RESTRICT: vanno via prima di lei
    if (colonnaSpilloGuida()) {
      prepared('DELETE FROM spillo_partita WHERE spillo_uid IN (SELECT uid FROM spillo WHERE area_guida_chiave = ? AND uid IS NOT NULL)').run(chiaveArea);
      prepared('DELETE FROM spillo WHERE area_guida_chiave = ?').run(chiaveArea);
    }
    if (tabellaUtente('timbri_dedalo_partita')) prepared('DELETE FROM timbri_dedalo_partita WHERE area_chiave = ?').run(chiaveArea);
    staccaAreaDaOgniMappa(chiaveArea);
    ripulisciRiferimentiTestuali(chiaveArea);
    prepared('DELETE FROM dungeon_area WHERE chiave = ?').run(chiaveArea);
    prepared('UPDATE dungeon_area SET ordine = ordine - 1 WHERE dungeon_chiave = ? AND ordine > ?').run(a.dungeon_chiave, a.ordine);
  })();
}

/**
 * I riferimenti all'area che vivono dentro testi JSON, dove nessun vincolo li segue (rilievo della revisione):
 * le piante delle altre aree che dicevano di coprirla, le Ombre della Battaglia che ci costruiscono il
 * collegamento «?area=» (con l'area sparita la scheda aprirebbe in silenzio la prima), e la spiegazione
 * delle mappe assenti. Il nome dell'area sulle Ombre resta: è quel che dice la guida.
 */
function ripulisciRiferimentiTestuali(chiaveArea: string): void {
  if (tabellaGioco('pianta_area')) {
    for (const r of prepared("SELECT area_chiave, copre_aree_json FROM pianta_area WHERE copre_aree_json LIKE ?").all(`%"${chiaveArea}"%`) as Array<{ area_chiave: string; copre_aree_json: string }>) {
      const copre = (JSON.parse(r.copre_aree_json) as string[]).filter((k) => k !== chiaveArea);
      prepared('UPDATE pianta_area SET copre_aree_json = ? WHERE area_chiave = ?').run(JSON.stringify(copre), r.area_chiave);
    }
  }
  if (!tabellaGioco('dati_guida')) return;
  const battaglia = prepared("SELECT json FROM dati_guida WHERE chiave = 'battaglia'").get() as { json: string } | undefined;
  if (battaglia) {
    const dati = JSON.parse(battaglia.json) as { ombre?: Array<{ areaChiave?: string | null }> };
    const toccate = (dati.ombre ?? []).filter((o) => o.areaChiave === chiaveArea);
    for (const o of toccate) o.areaChiave = null;
    if (toccate.length) prepared("UPDATE dati_guida SET json = ? WHERE chiave = 'battaglia'").run(JSON.stringify(dati));
  }
  const assenti = prepared("SELECT json FROM dati_guida WHERE chiave = 'mappe-assenti'").get() as { json: string } | undefined;
  if (assenti) {
    const dati = JSON.parse(assenti.json) as Record<string, unknown>;
    if (chiaveArea in dati) {
      delete dati[chiaveArea];
      prepared("UPDATE dati_guida SET json = ? WHERE chiave = 'mappe-assenti'").run(JSON.stringify(dati));
    }
  }
}
function tabellaGioco(nome: string): boolean {
  return !!prepared("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(nome);
}

/** La colonna `spillo.area_guida_chiave` (042): nei test lo schema può essere indietro. */
function colonnaSpilloGuida(): boolean {
  return (prepared('PRAGMA main.table_info(spillo)').all() as Array<{ name: string }>).some((c) => c.name === 'area_guida_chiave');
}
function tabellaUtente(nome: string): boolean {
  return !!prepared("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = ?").get(nome);
}

/** La lunghezza massima della chiave di un'area: quella che accettano le sue route (`paramsChiaveGuida`). */
const MAX_CHIAVE_AREA = 200;

/**
 * Una sezione nuova della guida di un Palazzo (richiesta dell'utente, 2026-10-01: «come faccio ad aggiungere una nuova
 * sezione di guida ad una planimetria che non ha sezioni di guida autonome?»). Nasce nel posto scelto — `dopo` un'area
 * del Palazzo, `null` in cima, assente in fondo — e l'ordine del Palazzo si ricompatta (0, 1, 2…); con `planimetria` si
 * aggiunge alle aree di quella planimetria (`impostaAreeMappa`, che controlla che sia del Palazzo). È canone: vale per tutte
 * le partite e va nel pacchetto di gioco, come ogni correzione della guida.
 */
export function creaArea(dungeonChiave: string, dati: { nome: string; descrizione?: string; dopo?: string | null; planimetria?: string }): { chiave: string; nome: string; ordine: number } {
  if (!prepared('SELECT 1 FROM dungeon WHERE chiave = ?').get(dungeonChiave)) throw httpErrors.notFound('dungeon-non-trovato', `Il dungeon '${dungeonChiave}' non esiste.`);
  const nome = dati.nome.trim();
  const elenco = (prepared('SELECT chiave FROM dungeon_area WHERE dungeon_chiave = ? ORDER BY ordine, chiave').all(dungeonChiave) as Array<{ chiave: string }>).map((r) => r.chiave);
  if (dati.dopo && !elenco.includes(dati.dopo)) throw httpErrors.badRequest('area-non-del-palazzo', `L'area '${dati.dopo}' non è di questo Palazzo.`);
  // La chiave sta nei 200 caratteri che le route delle aree accettano (`paramsChiaveGuida`), suffisso «-N» compreso (fino a «-99999»): un nome
  // di 300 caratteri darebbe un'area che poi non si modifica né si elimina (rilievo della revisione). Senza lettere né cifre
  // («???») lo slug è vuoto: si usa «area».
  const radice = (slug(nome) || 'area').slice(0, Math.max(1, MAX_CHIAVE_AREA - dungeonChiave.length - 1 - 6)).replace(/-+$/, '') || 'area';
  const base = `${dungeonChiave}-${radice}`;
  let chiave = base;
  // la chiave non deve coincidere con un'area né con un alias della guida (le vecchie mappe d'area, 042)
  const alias = tabellaGioco('guida_alias');
  for (let i = 2; prepared('SELECT 1 FROM dungeon_area WHERE chiave = ?').get(chiave) || (alias && prepared('SELECT 1 FROM guida_alias WHERE chiave = ?').get(chiave)); i++) chiave = `${base}-${i}`;
  const posto = dati.dopo === null ? 0 : dati.dopo === undefined ? elenco.length : elenco.indexOf(dati.dopo) + 1;
  elenco.splice(posto, 0, chiave);
  getDb().transaction(() => {
    prepared('INSERT INTO dungeon_area (chiave, dungeon_chiave, ordine, nome, descrizione) VALUES (?, ?, ?, ?, ?)').run(chiave, dungeonChiave, posto, nome, dati.descrizione ?? '');
    elenco.forEach((k, n) => prepared('UPDATE dungeon_area SET ordine = ? WHERE chiave = ?').run(n, k));
    if (dati.planimetria) {
      const gia = (prepared("SELECT entita_chiave FROM mappa_entita WHERE mappa_chiave = ? AND entita_tipo = 'area'").all(idMappa(dati.planimetria)) as Array<{ entita_chiave: string }>).map((r) => r.entita_chiave);
      impostaAreeMappa(dati.planimetria, [...gia, chiave]);
    }
  })();
  return { chiave, nome, ordine: posto };
}

export interface DatiPunto { nome?: string; descrizione?: string; tipo?: PuntoInteresseDto['tipo']; esauribile?: boolean; ordine?: number }

/** Un punto della guida (sicura, enigma, boss…): testo, tipo, esauribilità, posto nell'elenco. */
export function aggiornaPunto(puntoChiave: string, dati: DatiPunto): PuntoInteresseDto {
  const p = prepared('SELECT * FROM punto_interesse WHERE chiave = ?').get(puntoChiave) as RigaPunto | undefined;
  if (!p) throw httpErrors.notFound('punto-non-trovato', `Il punto '${puntoChiave}' non esiste.`);
  // una voce con pin non diventa descrittiva: le descrittive non hanno pin (si scollegano prima)
  if (dati.tipo && puntoDescrittivo(dati.tipo) && pinDelPuntoGuida(getDb(), puntoChiave).length > 0) {
    throw httpErrors.conflict('punto-con-pin', `«${p.nome}» ha dei pin collegati: scollegali prima di farne una voce descrittiva.`);
  }
  prepared('UPDATE punto_interesse SET nome = ?, descrizione = ?, tipo = ?, esauribile = ?, ordine = ? WHERE chiave = ?').run(
    dati.nome?.trim() || p.nome, dati.descrizione ?? p.descrizione, dati.tipo ?? p.tipo, dati.esauribile === undefined ? p.esauribile : (dati.esauribile ? 1 : 0), dati.ordine ?? p.ordine, puntoChiave);
  const r = prepared('SELECT * FROM punto_interesse WHERE chiave = ?').get(puntoChiave) as RigaPunto;
  return { chiave: r.chiave, ordine: r.ordine, tipo: r.tipo, nome: r.nome, descrizione: r.descrizione, esauribile: r.esauribile === 1, dettagli: JSON.parse(r.dettagli_json) as Record<string, unknown>, fonte: r.fonte, stato: null, marcatore: marcatori().get(puntoChiave) ?? null, pin: pinDeiPunti(puntoChiave).get(puntoChiave) ?? [] };
}

/**
 * Sposta un punto di un posto su o giù nella guida della sua area. L'ordine dell'area si ricompatta (0, 1, 2…), così
 * eventuali pari merito di una trascrizione vecchia non lasciano lo spostamento senza effetto.
 */
export function spostaPunto(puntoChiave: string, verso: -1 | 1): PuntoInteresseDto {
  const p = prepared('SELECT area_chiave FROM punto_interesse WHERE chiave = ?').get(puntoChiave) as { area_chiave: string } | undefined;
  if (!p) throw httpErrors.notFound('punto-non-trovato', `Il punto '${puntoChiave}' non esiste.`);
  const elenco = (prepared('SELECT chiave FROM punto_interesse WHERE area_chiave = ? ORDER BY ordine, chiave').all(p.area_chiave) as Array<{ chiave: string }>).map((r) => r.chiave);
  const i = elenco.indexOf(puntoChiave);
  const j = i + verso;
  if (j < 0 || j >= elenco.length) throw httpErrors.conflict('punto-al-limite', verso < 0 ? 'Il punto è già il primo della sua area.' : 'Il punto è già l’ultimo della sua area.');
  [elenco[i], elenco[j]] = [elenco[j], elenco[i]];
  getDb().transaction(() => {
    elenco.forEach((k, n) => prepared('UPDATE punto_interesse SET ordine = ? WHERE chiave = ?').run(n, k));
  })();
  return aggiornaPunto(puntoChiave, {});
}

/**
 * Collega (o scollega) un pin di una planimetria a un punto della guida (2026-10-01): «lo stato di questi punti deve essere
 * integrato con gli elementi in mappa». Il collegamento sta sul pin (`riferimento = punto`); un punto può averne più d'uno.
 * Solo un pin di una planimetria del Palazzo del punto, libero o già di quel punto: un pin che porta altrove (un luogo, un
 * negozio, un altro punto) si rifiuta dicendo a che cosa è collegato. Collegando, gli stati delle partite si uniscono
 * (`allineaStatiPunto`); scollegando restano come sono, a ciascuno il suo.
 */
export function collegaPinAlPunto(puntoChiave: string, spilloId: number, collega: boolean): PuntoInteresseDto {
  const p = prepared('SELECT p.chiave, p.nome, p.tipo, a.dungeon_chiave FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave WHERE p.chiave = ?').get(puntoChiave) as { chiave: string; nome: string; tipo: string; dungeon_chiave: string } | undefined;
  if (!p) throw httpErrors.notFound('punto-non-trovato', `Il punto '${puntoChiave}' non esiste.`);
  if (collega && puntoDescrittivo(p.tipo)) throw httpErrors.badRequest('punto-descrittivo', `«${p.nome}» è una voce descrittiva della guida: non ha pin.`);
  const s = prepared('SELECT id, nome, mappa_chiave, riferimento_tipo, riferimento_chiave FROM spillo WHERE id = ?').get(spilloId) as { id: number; nome: string; mappa_chiave: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null } | undefined;
  if (!s) throw httpErrors.notFound('spillo-non-trovato', `Lo spillo ${spilloId} non esiste.`);
  const suoPunto = s.riferimento_tipo === 'punto' && s.riferimento_chiave === puntoChiave;
  if (!collega) {
    if (!suoPunto) throw httpErrors.conflict('pin-non-collegato', `«${s.nome}» non è collegato a questo punto.`);
    prepared("UPDATE spillo SET riferimento_tipo = NULL, riferimento_chiave = NULL, updated_at = ? WHERE id = ?").run(nowIso(), spilloId);
    return aggiornaPunto(puntoChiave, {});
  }
  if (!s.mappa_chiave || palazzoDiOgniMappa().get(s.mappa_chiave) !== p.dungeon_chiave) {
    throw httpErrors.badRequest('pin-fuori-dal-palazzo', `«${s.nome}» non sta su una planimetria di questo Palazzo.`);
  }
  if (!suoPunto && s.riferimento_tipo) {
    const altro = s.riferimento_tipo === 'punto' && s.riferimento_chiave
      ? `al punto «${(prepared('SELECT nome FROM punto_interesse WHERE chiave = ?').get(s.riferimento_chiave) as { nome: string } | undefined)?.nome ?? s.riferimento_chiave}»`
      : `a ${s.riferimento_tipo} «${s.riferimento_chiave ?? ''}»`;
    throw httpErrors.conflict('pin-gia-collegato', `«${s.nome}» è già collegato ${altro}: scollegalo prima.`);
  }
  const adesso = nowIso();
  getDb().transaction(() => {
    if (!suoPunto) prepared("UPDATE spillo SET riferimento_tipo = 'punto', riferimento_chiave = ?, updated_at = ? WHERE id = ?").run(puntoChiave, adesso, spilloId);
    allineaStatiPunto(getDb(), puntoChiave, adesso);
  })();
  return aggiornaPunto(puntoChiave, {});
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
 * I pin che lo rappresentavano sulle planimetrie **restano** — sono posti sulla mappa — e perdono solo il
 * collegamento: dal 2026-10-01 lo stato vive nei pin, e il loro «raccolto» è vero anche senza la voce della guida.
 * Gli elementi della guida senza mappa (strato di prima) invece non esistono fuori dalla guida: il loro «raccolto»
 * se ne va con il punto (rilievo della revisione, 2026-09-18: un collezionabile orfano segnato preso).
 */
export function eliminaPunto(puntoChiave: string): void {
  if (!prepared('SELECT 1 FROM punto_interesse WHERE chiave = ?').get(puntoChiave)) throw httpErrors.notFound('punto-non-trovato', `Il punto '${puntoChiave}' non esiste.`);
  getDb().transaction(() => {
    prepared('DELETE FROM punto_partita WHERE punto_chiave = ?').run(puntoChiave);
    prepared('DELETE FROM marcatore_mappa WHERE punto_chiave = ?').run(puntoChiave);
    prepared("DELETE FROM spillo_partita WHERE spillo_uid IN (SELECT uid FROM spillo WHERE riferimento_tipo = 'punto' AND riferimento_chiave = ? AND mappa_chiave IS NULL AND uid IS NOT NULL)").run(puntoChiave);
    prepared("UPDATE spillo SET riferimento_tipo = NULL, riferimento_chiave = NULL WHERE riferimento_tipo = 'punto' AND riferimento_chiave = ?").run(puntoChiave);
    prepared('DELETE FROM punto_interesse WHERE chiave = ?').run(puntoChiave);
  })();
}
