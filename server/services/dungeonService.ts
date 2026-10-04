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
import { verificaPartita } from './verificaPartita.js';
import { t } from './traduzioniService.js';
import { registraEvento } from './storicoService.js';
import { finestreDungeon, invalidaDatiGuida } from './datiGuida.js';
import { radiceDelPalazzo, SQL_SOTTOALBERO, sottoalberoMappe } from './mappe/alberoMappe.js';
import { vociGestite } from './mappe/voceDelPin.js';
import type { AreaDungeonDto, DedaloDto, DungeonDettaglioDto, DungeonRiassuntoDto, PinDelPuntoDto, PuntoInteresseDto, SpilloRaccoltaDto, StatoPunto, StatoRichiesta } from '../../shared/types.js';
import { chiaveMappa, idMappa, nomePercorso } from './mappe/percorsiMappe.js';
import { DEFINIZIONI_SPILLO, puntoDescrittivo, puntoEnigma, type TipoSpillo } from '../../shared/spilli.js';
import { timbriPartita } from './timbriService.js';
import { slug } from '../../shared/slug.js';
import { eliminaImmaginiDeiPin, impostaAreeMappa, staccaAreaDaOgniMappa } from './mappe/mappeService.js';
import { palazziCompletati } from './palazziService.js';
import { allineaEnigmaDellaVoce, allineaEnigmaInOgniPartita, allineaStatiPunto, erroreVoceDelPin, passiDi, pinDelPuntoGuida, scriviStatoVoce, segnaPassiDellEnigma, VOCE_DEL_PIN, voceDelPin } from './mappe/collegamentiGuida.js';

interface RigaDungeon { chiave: string; tipo: 'palazzo' | 'mementos'; ordine: number; nome: string; sovrano: string; arcana_sovrano: string; data_sblocco: string; data_scadenza: string; furto_consigliato: string; livello_consigliato: string; note: string; fonti_json: string }
interface RigaArea { chiave: string; dungeon_chiave: string; ordine: number; nome: string; descrizione: string; timbri_totale: number | null }
interface RigaPunto { chiave: string; area_chiave: string; ordine: number; tipo: PuntoInteresseDto['tipo']; nome: string; descrizione: string; esauribile: number; dettagli_json: string; fonte: string; contenitore_chiave?: string | null }

/** La voce della guida come la vede il client: una sola forma per la scheda del Palazzo e per le risposte delle modifiche. */
function puntoDto(r: RigaPunto, stato: StatoPunto | null, marcatore: { x: number; y: number } | null, pin: PinDelPuntoDto[]): PuntoInteresseDto {
  return { chiave: r.chiave, ordine: r.ordine, tipo: r.tipo, nome: r.nome, descrizione: r.descrizione, esauribile: r.esauribile === 1, dettagli: JSON.parse(r.dettagli_json) as Record<string, unknown>, fonte: r.fonte, stato, marcatore, pin, contenitore: r.contenitore_chiave ?? null };
}

/** Lo stato di ogni punto della guida segnato dalla partita (chiave → stato); vuota senza partita, 404 se la partita non esiste. */
function statiPartita(partitaId: number | undefined): Map<string, StatoPunto> {
  if (partitaId === undefined) return new Map();
  verificaPartita(partitaId);
  return new Map((prepared('SELECT punto_chiave, stato FROM punto_partita WHERE partita_id = ?').all(partitaId) as Array<{ punto_chiave: string; stato: StatoPunto }>).map((r) => [r.punto_chiave, r.stato]));
}

/** I pin delle planimetrie collegati ai punti (tutti, o di un punto solo), in ordine di id. */
function pinDeiPunti(punto?: string): Map<string, PinDelPuntoDto[]> {
  const righe = prepared(`SELECT id, nome, tipo, mappa_chiave, ${VOCE_DEL_PIN} AS voce FROM spillo
    WHERE mappa_chiave IS NOT NULL AND ${VOCE_DEL_PIN} ${punto ? '= ?' : 'IS NOT NULL'} ORDER BY id`)
    .all(...(punto ? [punto] : [])) as Array<{ id: number; nome: string; tipo: string; mappa_chiave: string; voce: string }>;
  const out = new Map<string, PinDelPuntoDto[]>();
  for (const r of righe) {
    const elenco = out.get(r.voce) ?? [];
    elenco.push({ id: r.id, nome: r.nome, tipo: r.tipo, mappa: chiaveMappa(r.mappa_chiave), mappaNome: nomePercorso(r.mappa_chiave) });
    out.set(r.voce, elenco);
  }
  return out;
}

/** Le posizioni dei marcatori dei punti della guida sulla mappa (`marcatore_mappa`): chiave del punto → coordinate. */
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
  return [...sottoalberoMappe([radiceDelPalazzo(dungeonChiave)])];
}

/** I segni della partita che decidono il «raccolto» di un pin: gli uid raccolti e le voci della guida già gestite. */
interface SegniPartita { raccolti: Set<string>; puntiGestiti: Set<string> }

/** Legge i segni della partita: gli uid dei pin segnati «raccolto» e le voci della guida già gestite. */
function segniPartita(partitaId: number): SegniPartita {
  return {
    raccolti: new Set((prepared('SELECT spillo_uid FROM spillo_partita WHERE partita_id = ? AND raccolto = 1').all(partitaId) as Array<{ spillo_uid: string }>).map((r) => r.spillo_uid)),
    // un punto della guida già gestito (ottenuto/esaurito) conta come raccolto anche sulla mappa: è la regola del visore
    puntiGestiti: vociGestite(partitaId),
  };
}

/** I collezionabili di ogni mappa del Palazzo e, con la partita, quanti sono raccolti.
 *  Una mappa senza collezionabili è completa per definizione e non conta fra le mappe.
 *  `segni` li passa chi li ha già letti (l'elenco dei Palazzi li legge una volta per tutti: rilievo P7). */
export function raccoltaMappe(dungeonChiave: string, partitaId?: number, segni?: SegniPartita): RaccoltaDungeon {
  const mappe = mappeDelPalazzo(dungeonChiave);
  const perMappa = new Map<string, RaccoltaMappa>();
  if (mappe.length === 0) return { perMappa, totale: 0, presi: partitaId === undefined ? null : 0, mappe: 0, mappeComplete: partitaId === undefined ? null : 0 };
  const s = partitaId === undefined ? null : segni ?? segniPartita(partitaId);
  const raccolti = s?.raccolti ?? null;
  const puntiGestiti = s?.puntiGestiti ?? null;
  const righe = prepared(`SELECT id, uid, mappa_chiave, tipo, nome, ${VOCE_DEL_PIN} AS voce FROM spillo WHERE collezionabile = 1 AND mappa_chiave IN (${mappe.map(() => '?').join(',')}) ORDER BY mappa_chiave, ordine, id`).all(...mappe) as Array<{ id: number; uid: string; mappa_chiave: string; tipo: string; nome: string; voce: string | null }>;
  for (const r of righe) {
    const raccolto = raccolti === null ? null : raccolti.has(r.uid) || (!!r.voce && !!puntiGestiti?.has(r.voce));
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

/**
 * La raccolta dei Memento nella stessa forma di quella dei Palazzi: al posto delle planimetrie i dedali (le aree con almeno un
 * obiettivo misurabile), al posto dei collezionabili gli obiettivi (timbri e richieste); un dedalo è completo quando sono fatti tutti.
 * Senza partita i conteggi del fatto sono null.
 */
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

/** Le immagini di ambito «mappa» presenti nel database (chiave → URL di origine): dicono quali aree hanno la loro mappa. */
function mappePresenti(): Map<string, string | null> {
  return new Map((prepared("SELECT chiave, origine_url FROM immagine WHERE ambito = 'mappa'").all() as Array<{ chiave: string; origine_url: string | null }>).map((r) => [r.chiave, r.origine_url ?? null]));
}


/** Il riassunto di un Palazzo. `gia` porta quello che chi chiama ha già calcolato: la raccolta (la scheda del Palazzo la calcola
 *  per le planimetrie) e i segni della partita (l'elenco li legge una volta per tutti): prima si ricalcolavano qui (P7). */
function riassunto(r: RigaDungeon, stati: Map<string, StatoPunto>, partitaId: number | undefined, completati: Map<string, string> | null,
  gia: { raccolta?: RaccoltaDungeon | null; segni?: SegniPartita } = {}): DungeonRiassuntoDto {
  const conPartita = partitaId !== undefined;
  const punti = prepared('SELECT p.chiave, p.esauribile, p.tipo FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave WHERE a.dungeon_chiave = ?').all(r.chiave) as Array<{ chiave: string; esauribile: number; tipo: string }>;
  const raccolta = r.tipo === 'mementos' ? raccoltaMementos(r.chiave, partitaId) : (({ totale, presi, mappe, mappeComplete }) => ({ totale, presi, mappe, mappeComplete }))(gia.raccolta ?? raccoltaMappe(r.chiave, partitaId, gia.segni));
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

/** I riassunti di tutti i Palazzi e dei Memento in ordine di gioco; con la partita, anche stati, raccolta e completamento. */
export function elencaDungeon(partitaId?: number): DungeonRiassuntoDto[] {
  const stati = statiPartita(partitaId);
  // i Palazzi completati si calcolano una volta per tutto l'elenco
  const completati = partitaId !== undefined ? palazziCompletati(partitaId) : null;
  // e i segni della partita (pin raccolti, voci gestite), che prima ogni Palazzo rileggeva
  const segni = partitaId !== undefined ? segniPartita(partitaId) : undefined;
  return (prepared('SELECT * FROM dungeon ORDER BY ordine').all() as RigaDungeon[]).map((r) => riassunto(r, stati, partitaId, completati, { segni }));
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
  const righe = prepared(`${SQL_SOTTOALBERO}
    SELECT m.chiave, m.ordine
    FROM mappa m JOIN albero t ON t.chiave = m.chiave
    WHERE m.chiave <> ?
    ORDER BY m.ordine, m.chiave`).all(radiceDelPalazzo(dungeonChiave), radiceDelPalazzo(dungeonChiave)) as Array<{ chiave: string; ordine: number }>;
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

/**
 * La scheda completa di un Palazzo o dei Memento (404 se non esiste): riassunto, note e fonti, aree con le loro planimetrie
 * native e i collezionabili raccolti, punti della guida con stato, marcatore e pin collegati; per i Memento il dedalo di ogni
 * area (timbri e richieste), per i Palazzi l'elenco delle planimetrie. Le letture comuni si fanno una volta per tutta la scheda.
 */
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
    // uno stato rimasto su una voce descrittiva (di prima della scelta) si ignora in lettura, senza cancellarlo
    punti: (prepared('SELECT * FROM punto_interesse WHERE area_chiave = ? ORDER BY ordine, chiave').all(a.chiave) as RigaPunto[])
      .map((p) => puntoDto(p, puntoDescrittivo(p.tipo) ? null : stati.get(p.chiave) ?? null, marc.get(p.chiave) ?? null, pinPunti.get(p.chiave) ?? [])),
    dedalo: richieste ? dedaloDto(a, richieste.get(a.chiave) ?? [], timbri) : null,
  }));
  const planimetrie = raccolta ? planimetrieDelPalazzo(chiave, raccolta, partitaId) : [];
  return { ...riassunto(r, stati, partitaId, partitaId !== undefined ? palazziCompletati(partitaId) : null, { raccolta }), note: r.note, fonti: JSON.parse(r.fonti_json) as string[], aree, planimetrie };
}

/**
 * Stato di un punto nella partita: 'ottenuto', 'esaurito' oppure null per azzerare. Lo stato del punto è quello dei suoi pin
 * (2026-10-01): segnarlo li raccoglie, riaprirlo li riapre. Un Enigma con i suoi passi (095) è risolto quando i passi sono
 * fatti: segnarlo segna i passi, riaprirlo li riapre; e un passo segnato o riaperto porta con sé il suo Enigma.
 */
export function impostaStatoPunto(partitaId: number, puntoChiave: string, stato: StatoPunto | null): PuntoInteresseDto {
  verificaPartita(partitaId);
  const p = prepared('SELECT p.*, a.nome AS area_nome, d.nome AS dungeon_nome FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave JOIN dungeon d ON d.chiave = a.dungeon_chiave WHERE p.chiave = ?').get(puntoChiave) as (RigaPunto & { area_nome: string; dungeon_nome: string }) | undefined;
  if (!p) throw httpErrors.notFound('punto-non-trovato', `Il punto '${puntoChiave}' non esiste.`);
  // una voce descrittiva si legge, non si segna (scelta dell'utente, 2026-10-01); azzerarla resta possibile, per ripulire
  if (stato !== null && puntoDescrittivo(p.tipo)) throw httpErrors.badRequest('punto-descrittivo', `«${p.nome}» è una voce descrittiva della guida: si legge, non si segna.`);
  const adesso = nowIso();
  const db = getDb();
  getDb().transaction(() => {
    const prima = (prepared('SELECT stato FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').get(partitaId, puntoChiave) as { stato: StatoPunto } | undefined)?.stato ?? null;
    // un Enigma con i suoi passi: i passi seguono (risolto = passi fatti)
    segnaPassiDellEnigma(db, partitaId, puntoChiave, stato, adesso);
    scriviStatoVoce(db, partitaId, puntoChiave, stato, adesso);
    // un passo: il suo Enigma segue
    allineaEnigmaDellaVoce(db, partitaId, puntoChiave, adesso);
    if (stato !== null && stato !== prima) {
      registraEvento(partitaId, 'punto-dungeon', `${p.dungeon_nome} · ${p.area_nome}: ${p.nome} ${stato === 'ottenuto' ? 'ottenuto' : 'esaurito'}`, p.descrizione.slice(0, 200), { punto: puntoChiave, tipo: p.tipo, stato });
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  return puntoDto(p, stato, marcatori().get(puntoChiave) ?? null, pinDeiPunti(puntoChiave).get(puntoChiave) ?? []);
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
  // la pulizia riscrive `dati_guida`: la copia in memoria (`datiGuida`) si butta a transazione chiusa, comunque sia finita
  // (dentro la transazione una rilettura la rimetterebbe in memoria con dati che un annullamento toglierebbe)
  try {
    eliminaAreaInTransazione(chiaveArea, a);
  } finally {
    invalidaDatiGuida();
  }
}

/**
 * Il lavoro di `eliminaArea` in una transazione sola: stacca e cancella i punti dell'area, toglie gli spilli della guida senza
 * mappa (con «raccolto» e immagini) che la vincolano, i timbri dei dedali, i legami con le planimetrie e i riferimenti nei testi
 * JSON, poi cancella l'area e fa salire di un posto quelle che la seguivano.
 */
function eliminaAreaInTransazione(chiaveArea: string, a: RigaArea): void {
  getDb().transaction(() => {
    for (const { chiave } of prepared('SELECT chiave FROM punto_interesse WHERE area_chiave = ?').all(chiaveArea) as Array<{ chiave: string }>) staccaPunto(chiave);
    prepared('DELETE FROM punto_interesse WHERE area_chiave = ?').run(chiaveArea);
    // gli spilli della guida (senza mappa) vincolano l'area con RESTRICT: vanno via prima di lei
    if (colonnaSpilloGuida()) {
      prepared('DELETE FROM spillo_partita WHERE spillo_uid IN (SELECT uid FROM spillo WHERE area_guida_chiave = ? AND uid IS NOT NULL)').run(chiaveArea);
      eliminaImmaginiDeiPin('s.area_guida_chiave = ?', chiaveArea);
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
  // qui si riscrive `dati_guida`: chi chiama (`eliminaArea`) butta la copia in memoria a transazione chiusa
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
/** Vero se la tabella esiste nel database di gioco (schema `main`): nei test lo schema può essere indietro. */
function tabellaGioco(nome: string): boolean {
  return !!prepared("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(nome);
}

/** La colonna `spillo.area_guida_chiave` (042): nei test lo schema può essere indietro. */
function colonnaSpilloGuida(): boolean {
  return (prepared('PRAGMA main.table_info(spillo)').all() as Array<{ name: string }>).some((c) => c.name === 'area_guida_chiave');
}
/** Vero se la tabella esiste nel database delle partite (schema `utente`). */
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

export interface DatiPunto { nome?: string; descrizione?: string; tipo?: PuntoInteresseDto['tipo']; esauribile?: boolean; ordine?: number;
  /** L'Enigma di cui la voce diventa un passo (095); null = torna una voce dell'area; assente = invariato. */
  contenitore?: string | null }

/**
 * Le regole di un passo (095, scelte dell'utente del 2026-10-01): l'Enigma è una voce «Enigma» della stessa area, non è a sua
 * volta un passo e non ha pin suoi (i pin stanno sui passi); la voce non è sé stessa né un Enigma con i suoi passi (un livello
 * solo: un Enigma dentro un Enigma non si leggerebbe più).
 */
function verificaEnigma(voce: { chiave: string; nome: string; area_chiave: string } | null, area: string, enigmaChiave: string): void {
  const e = prepared('SELECT chiave, nome, tipo, area_chiave, contenitore_chiave FROM punto_interesse WHERE chiave = ?').get(enigmaChiave) as { chiave: string; nome: string; tipo: string; area_chiave: string; contenitore_chiave: string | null } | undefined;
  if (!e) throw httpErrors.notFound('punto-non-trovato', `L'Enigma '${enigmaChiave}' non esiste.`);
  if (!puntoEnigma(e.tipo)) throw httpErrors.badRequest('non-un-enigma', `«${e.nome}» non è un Enigma: i passi stanno solo dentro un Enigma.`);
  if (e.area_chiave !== area) throw httpErrors.badRequest('enigma-di-altra-area', `«${e.nome}» è di un'altra area: i passi stanno nell'area del loro Enigma.`);
  if (e.contenitore_chiave) throw httpErrors.badRequest('enigma-dentro-enigma', `«${e.nome}» è a sua volta un passo: un Enigma dentro un Enigma non si può.`);
  if (voce) {
    if (voce.chiave === e.chiave) throw httpErrors.badRequest('enigma-dentro-enigma', `«${voce.nome}» non può essere un passo di sé stesso.`);
    if (passiDi(getDb(), voce.chiave).length > 0) throw httpErrors.badRequest('enigma-dentro-enigma', `«${voce.nome}» è un Enigma con i suoi passi: un Enigma dentro un Enigma non si può.`);
  }
  if (pinDelPuntoGuida(getDb(), e.chiave).length > 0) throw httpErrors.conflict('enigma-con-pin', `«${e.nome}» ha dei pin collegati: scollegali (i pin stanno sui passi) prima di dargli dei passi.`);
}

/** Il posto in fondo fra le voci accanto (della stessa area e dello stesso Enigma, o fuori da ogni Enigma). */
function ordineInFondo(area: string, contenitore: string | null): number {
  return (prepared('SELECT COALESCE(MAX(ordine), -1) AS n FROM punto_interesse WHERE area_chiave = ? AND contenitore_chiave IS ?').get(area, contenitore) as { n: number }).n + 1;
}

/** Un punto della guida (sicura, enigma, boss…): testo, tipo, esauribilità, posto nell'elenco, Enigma di cui è un passo. */
export function aggiornaPunto(puntoChiave: string, dati: DatiPunto): PuntoInteresseDto {
  const p = prepared('SELECT * FROM punto_interesse WHERE chiave = ?').get(puntoChiave) as RigaPunto | undefined;
  if (!p) throw httpErrors.notFound('punto-non-trovato', `Il punto '${puntoChiave}' non esiste.`);
  // una voce con pin non diventa descrittiva: le descrittive non hanno pin (si scollegano prima)
  if (dati.tipo && puntoDescrittivo(dati.tipo) && pinDelPuntoGuida(getDb(), puntoChiave).length > 0) {
    throw httpErrors.conflict('punto-con-pin', `«${p.nome}» ha dei pin collegati: scollegali prima di farne una voce descrittiva.`);
  }
  // un Enigma con i suoi passi resta un Enigma: i passi tornerebbero orfani
  if (dati.tipo && !puntoEnigma(dati.tipo) && passiDi(getDb(), puntoChiave).length > 0) {
    throw httpErrors.conflict('enigma-con-passi', `«${p.nome}» ha dei passi: toglili dall'Enigma prima di cambiargli tipo.`);
  }
  const prima = p.contenitore_chiave ?? null;
  const dopo = dati.contenitore === undefined ? prima : dati.contenitore;
  if (dopo !== null && dopo !== prima) verificaEnigma(p, p.area_chiave, dopo);
  const adesso = nowIso();
  const db = getDb();
  db.transaction(() => {
    // cambiando Enigma (o uscendone) la voce va in fondo fra le sue nuove compagne
    const ordine = dati.ordine ?? (dopo !== prima ? ordineInFondo(p.area_chiave, dopo) : p.ordine);
    prepared('UPDATE punto_interesse SET nome = ?, descrizione = ?, tipo = ?, esauribile = ?, ordine = ?, contenitore_chiave = ? WHERE chiave = ?').run(
      dati.nome?.trim() || p.nome, dati.descrizione ?? p.descrizione, dati.tipo ?? p.tipo, dati.esauribile === undefined ? p.esauribile : (dati.esauribile ? 1 : 0), ordine, dopo, puntoChiave);
    // gli Enigmi toccati (lasciato, raggiunto, o il proprio, se cambia tipo e con lui il conto dei passi da segnare) seguono i passi
    for (const enigma of new Set([prima, dopo].filter((x): x is string => x !== null))) allineaEnigmaInOgniPartita(db, enigma, adesso);
  })();
  return leggiPunto(puntoChiave);
}

/**
 * Il DTO di un punto com'è adesso, senza scrivere nulla. Spostamento, collegamento di un pin e creazione lo chiedevano a
 * `aggiornaPunto(chiave, {})` (rilievo B11): un UPDATE con gli stessi valori e il riallineamento degli Enigmi in ogni partita,
 * inutili perché quelle operazioni allineano già quel che toccano (`allineaStatiPunto`, `creaPunto`).
 */
function leggiPunto(puntoChiave: string): PuntoInteresseDto {
  const r = prepared('SELECT * FROM punto_interesse WHERE chiave = ?').get(puntoChiave) as RigaPunto | undefined;
  if (!r) throw httpErrors.notFound('punto-non-trovato', `Il punto '${puntoChiave}' non esiste.`);
  return puntoDto(r, null, marcatori().get(puntoChiave) ?? null, pinDeiPunti(puntoChiave).get(puntoChiave) ?? []);
}

/**
 * Sposta un punto di un posto su o giù nella guida della sua area — fra le voci accanto: quelle fuori da ogni Enigma, o i passi
 * dello stesso Enigma. L'ordine si ricompatta (0, 1, 2…), così eventuali pari merito di una trascrizione vecchia non lasciano
 * lo spostamento senza effetto.
 */
export function spostaPunto(puntoChiave: string, verso: -1 | 1): PuntoInteresseDto {
  const p = prepared('SELECT area_chiave, contenitore_chiave FROM punto_interesse WHERE chiave = ?').get(puntoChiave) as { area_chiave: string; contenitore_chiave: string | null } | undefined;
  if (!p) throw httpErrors.notFound('punto-non-trovato', `Il punto '${puntoChiave}' non esiste.`);
  const elenco = (prepared('SELECT chiave FROM punto_interesse WHERE area_chiave = ? AND contenitore_chiave IS ? ORDER BY ordine, chiave').all(p.area_chiave, p.contenitore_chiave ?? null) as Array<{ chiave: string }>).map((r) => r.chiave);
  const i = elenco.indexOf(puntoChiave);
  const j = i + verso;
  if (j < 0 || j >= elenco.length) {
    const dove = p.contenitore_chiave ? 'del suo Enigma' : 'della sua area';
    throw httpErrors.conflict('punto-al-limite', verso < 0 ? `Il punto è già il primo ${dove}.` : `Il punto è già l’ultimo ${dove}.`);
  }
  [elenco[i], elenco[j]] = [elenco[j], elenco[i]];
  getDb().transaction(() => {
    elenco.forEach((k, n) => prepared('UPDATE punto_interesse SET ordine = ? WHERE chiave = ?').run(n, k));
  })();
  return leggiPunto(puntoChiave);
}

/**
 * Collega (o scollega) un pin di una planimetria a un punto della guida (2026-10-01): «lo stato di questi punti deve essere
 * integrato con gli elementi in mappa». Il collegamento sta sul pin, in un campo suo (`voce_chiave`, 094): così anche un pin
 * che ha già un riferimento — un passaggio con la sua destinazione, un Confidente — può essere di una voce, e il riferimento
 * resta com'è. Un punto può avere più pin, un pin una voce sola. Solo un pin di una planimetria del Palazzo del punto, libero
 * o già di quel punto: un pin di un'altra voce si rifiuta dicendo quale. Collegando, gli stati delle partite si uniscono
 * (`allineaStatiPunto`); scollegando restano come sono, a ciascuno il suo.
 */
export function collegaPinAlPunto(puntoChiave: string, spilloId: number, collega: boolean): PuntoInteresseDto {
  if (!prepared('SELECT 1 FROM punto_interesse WHERE chiave = ?').get(puntoChiave)) throw httpErrors.notFound('punto-non-trovato', `Il punto '${puntoChiave}' non esiste.`);
  const s = prepared('SELECT id, nome, mappa_chiave, riferimento_tipo, riferimento_chiave, voce_chiave FROM spillo WHERE id = ?').get(spilloId) as { id: number; nome: string; mappa_chiave: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null; voce_chiave: string | null } | undefined;
  if (!s) throw httpErrors.notFound('spillo-non-trovato', `Lo spillo ${spilloId} non esiste.`);
  const voce = voceDelPin(s);
  const suoPunto = voce === puntoChiave;
  if (!collega) {
    if (!suoPunto) throw httpErrors.conflict('pin-non-collegato', `«${s.nome}» non è collegato a questo punto.`);
    // un collegamento rimasto nel riferimento (prima della 094) si toglie da lì; il riferimento vero di un pin non si tocca
    if (s.riferimento_tipo === 'punto' && s.riferimento_chiave === puntoChiave) prepared('UPDATE spillo SET riferimento_tipo = NULL, riferimento_chiave = NULL WHERE id = ?').run(spilloId);
    prepared('UPDATE spillo SET voce_chiave = NULL, updated_at = ? WHERE id = ?').run(nowIso(), spilloId);
    return leggiPunto(puntoChiave);
  }
  // le regole sono le stesse dell'editor delle mappe e del pacchetto (`erroreVoceDelPin`)
  const errore = erroreVoceDelPin({ nome: s.nome, mappa: s.mappa_chiave, voce }, puntoChiave);
  if (errore) throw errore;
  const adesso = nowIso();
  getDb().transaction(() => {
    if (!suoPunto) prepared('UPDATE spillo SET voce_chiave = ?, updated_at = ? WHERE id = ?').run(puntoChiave, adesso, spilloId);
    allineaStatiPunto(getDb(), puntoChiave, adesso);
  })();
  return leggiPunto(puntoChiave);
}

/** Un punto in più, dove la guida non l'aveva trascritto: nasce in fondo all'area. */
export function creaPunto(chiaveArea: string, dati: DatiPunto & { nome: string; tipo: PuntoInteresseDto['tipo'] }): PuntoInteresseDto {
  if (!prepared('SELECT 1 FROM dungeon_area WHERE chiave = ?').get(chiaveArea)) throw httpErrors.notFound('area-non-trovata', `L'area '${chiaveArea}' non esiste.`);
  // Come per le aree: la chiave sta nei 200 caratteri che le route dei punti accettano (`paramsChiaveGuida`), suffisso «-N» compreso
  // (fino a «-99999»), altrimenti il punto nascerebbe ma non si potrebbe più modificare, spostare né eliminare. Senza lettere né cifre
  // («???») lo slug è vuoto: si usa «punto», invece di una chiave che finisce con un trattino. Il prefisso dell'area è una convenzione
  // (l'area sta in `area_chiave`): se l'area ha già una chiave lunghissima, si accorcia anche lui, lasciando al nome almeno 8 caratteri.
  const radice = (slug(dati.nome) || 'punto').slice(0, Math.max(8, MAX_CHIAVE_AREA - chiaveArea.length - 1 - 6)).replace(/-+$/, '') || 'punto';
  const prefisso = chiaveArea.slice(0, MAX_CHIAVE_AREA - 6 - 1 - radice.length).replace(/-+$/, '');
  const base = `${prefisso}-${radice}`;
  let chiave = base;
  for (let i = 2; prepared('SELECT 1 FROM punto_interesse WHERE chiave = ?').get(chiave); i++) chiave = `${base}-${i}`;
  // un passo nasce in fondo ai passi del suo Enigma, con le regole dei passi (095)
  const contenitore = dati.contenitore ?? null;
  if (contenitore) verificaEnigma(null, chiaveArea, contenitore);
  const ordine = dati.ordine ?? ordineInFondo(chiaveArea, contenitore);
  getDb().transaction(() => {
    prepared("INSERT INTO punto_interesse (chiave, area_chiave, ordine, tipo, nome, descrizione, esauribile, dettagli_json, fonte, contenitore_chiave) VALUES (?, ?, ?, ?, ?, ?, ?, '{}', 'utente', ?)")
      .run(chiave, chiaveArea, ordine, dati.tipo, dati.nome.trim(), dati.descrizione ?? '', dati.esauribile ? 1 : 0, contenitore);
    // l'Enigma segue i passi: un passo nuovo ancora da fare lo riapre dove era risolto (scelta dell'utente, 2026-10-02)
    if (contenitore) allineaEnigmaInOgniPartita(getDb(), contenitore, nowIso());
  })();
  return leggiPunto(chiave);
}

/**
 * Quello che un punto della guida lascia nel resto dei dati, tolto prima di lui (dentro la transazione di chi chiama): gli stati
 * delle partite, il marcatore, il «raccolto» degli elementi della guida senza mappa che lo citano; i pin delle planimetrie tengono
 * il loro «raccolto» (lo stato vive nei pin, 2026-10-01) e perdono solo il collegamento. Lo usano `eliminaPunto` ed `eliminaArea`,
 * che prima lo scriveva una seconda volta riga per riga (rilievo R4 della verifica, 2026-10-03).
 */
function staccaPunto(puntoChiave: string): void {
  prepared('DELETE FROM punto_partita WHERE punto_chiave = ?').run(puntoChiave);
  prepared('DELETE FROM marcatore_mappa WHERE punto_chiave = ?').run(puntoChiave);
  prepared("DELETE FROM spillo_partita WHERE spillo_uid IN (SELECT uid FROM spillo WHERE riferimento_tipo = 'punto' AND riferimento_chiave = ? AND mappa_chiave IS NULL AND uid IS NOT NULL)").run(puntoChiave);
  prepared("UPDATE spillo SET riferimento_tipo = NULL, riferimento_chiave = NULL WHERE riferimento_tipo = 'punto' AND riferimento_chiave = ?").run(puntoChiave);
  prepared('UPDATE spillo SET voce_chiave = NULL WHERE voce_chiave = ?').run(puntoChiave);
}

/**
 * Toglie un punto della guida e quel che le partite ne avevano segnato, in una transazione (404 se non esiste): ne stacca le
 * tracce (`staccaPunto`), riporta i passi di un Enigma fra le voci dell'area in fondo all'elenco, cancella la voce e riallinea in
 * ogni partita l'Enigma di cui era un passo.
 *
 * I pin che lo rappresentavano sulle planimetrie **restano** — sono posti sulla mappa — e perdono solo il
 * collegamento: dal 2026-10-01 lo stato vive nei pin, e il loro «raccolto» è vero anche senza la voce della guida.
 * Gli elementi della guida senza mappa (strato di prima) invece non esistono fuori dalla guida: il loro «raccolto»
 * se ne va con il punto (rilievo della revisione, 2026-09-18: un collezionabile orfano segnato preso).
 * Un Enigma tolto lascia i suoi passi come voci dell'area, in fondo e nel loro ordine, con il loro stato; un passo tolto lascia
 * il suo Enigma, che segue i passi rimasti (095).
 */
export function eliminaPunto(puntoChiave: string): void {
  const p = prepared('SELECT contenitore_chiave FROM punto_interesse WHERE chiave = ?').get(puntoChiave) as { contenitore_chiave: string | null } | undefined;
  if (!p) throw httpErrors.notFound('punto-non-trovato', `Il punto '${puntoChiave}' non esiste.`);
  getDb().transaction(() => {
    staccaPunto(puntoChiave);
    // i passi di un Enigma tolto restano, voci dell'area con il loro stato (095)
    for (const passo of passiDi(getDb(), puntoChiave)) {
      const area = (prepared('SELECT area_chiave FROM punto_interesse WHERE chiave = ?').get(passo.chiave) as { area_chiave: string }).area_chiave;
      prepared('UPDATE punto_interesse SET contenitore_chiave = NULL, ordine = ? WHERE chiave = ?').run(ordineInFondo(area, null), passo.chiave);
    }
    prepared('DELETE FROM punto_interesse WHERE chiave = ?').run(puntoChiave);
    // un passo tolto: il suo Enigma segue i passi che restano
    if (p.contenitore_chiave) allineaEnigmaInOgniPartita(getDb(), p.contenitore_chiave, nowIso());
  })();
}
