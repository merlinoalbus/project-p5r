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

import { randomBytes, randomUUID } from 'node:crypto';
import { getDb, nowIso, prepared } from '../db/dbService.js';
import { assegnaUidMancanti } from './mappe/identitaSpillo.js';
import { httpErrors } from '../utils/httpError.js';
import { verificaPartita } from './verificaPartita.js';
import { t } from './traduzioniService.js';
import { registraEvento } from './storicoService.js';
import { finestreDungeon, invalidaDatiGuida } from './datiGuida.js';
import { radiceDelPalazzo, SQL_SOTTOALBERO, sottoalberoMappe } from './mappe/alberoMappe.js';
import { illustrazioneDellaMappa } from './mappe/immagineMappa.js';
import { fattoPerVoci, vociDiOgniPin, vociGestite } from './mappe/voceDelPin.js';
import type { AreaDedaloDto, AreaDungeonDto, DedaloDto, DungeonDettaglioDto, DungeonRiassuntoDto, PinDelPuntoDto, PuntiCopiatiDto, PuntiSpostatiDto, PuntoInteresseDto, RichiestaDelDedaloDto, SpilloRaccoltaDto, StatoPunto, StatoRichiesta, VoceCollegabileDto } from '../../shared/types.js';
import { contoAreaDedalo, contoDedalo, tipoDelDedalo } from '../../shared/dedali.js';
import { chiaveMappa, idMappa, nomePercorso } from './mappe/percorsiMappe.js';
import { DEFINIZIONI_SPILLO, puntoDescrittivo, puntoEnigma, sqlVoceDescrittiva, type TipoSpillo } from '../../shared/spilli.js';
import { timbriPartita } from './timbriService.js';
import { slug } from '../../shared/slug.js';
import { indiceMaschere, personaDellaMaschera, type IndiceMaschere } from './maschere.js';
import { ePersonaDeiMemento, erroreCatturaNelCompendio, vociPersonaCatturate } from './catturePersona.js';
import { eliminaImmaginiDeiPin, impostaAreeMappa, staccaAreaDaOgniMappa } from './mappe/mappeService.js';
import { palazziCompletati, palazzoDiOgniMappa } from './palazziService.js';
import { atterraggioDelGiorno, elencaAtterraggi } from './atterraggioPalazziService.js';
import { allineaEnigmaDellaVoce, allineaEnigmaInOgniPartita, allineaPinScollegato, allineaStatiPunto, erroreVoceDelPin, passiDi, pinDelPuntoGuida, scriviStatoVoce, segnaPassiDellEnigma } from './mappe/collegamentiGuida.js';
import { conCestino, registraRipristinoCestino, type ViciniCestino } from './cestinoService.js';

interface RigaDungeon { chiave: string; tipo: 'palazzo' | 'mementos'; ordine: number; nome: string; sovrano: string; arcana_sovrano: string; data_sblocco: string; data_scadenza: string; furto_consigliato: string; livello_consigliato: string; note: string; fonti_json: string }
interface RigaArea { chiave: string; dungeon_chiave: string; ordine: number; nome: string; descrizione: string }
/** Un'area di un dedalo dei Memento (099). */
interface RigaAreaDedalo { chiave: string; dedalo_chiave: string; ordine: number; nome: string; descrizione: string; timbri_totale: number | null }
interface RigaPunto { chiave: string; area_chiave: string; ordine: number; tipo: PuntoInteresseDto['tipo']; nome: string; descrizione: string; esauribile: number; dettagli_json: string; fonte: string; contenitore_chiave?: string | null; area_dedalo_chiave: string | null }

/**
 * La voce della guida come la vede il client: una sola forma per la scheda del Palazzo e per le risposte delle modifiche. Una
 * voce «Persona» porta la Persona del compendio della sua maschera (2026-10-11): chi ne legge tante passa l'indice costruito una
 * volta, per una voce sola lo si costruisce qui.
 */
function puntoDto(r: RigaPunto, stato: StatoPunto | null, marcatore: { x: number; y: number } | null, pin: PinDelPuntoDto[], letture?: { maschere: IndiceMaschere; areePersone: Map<string, string[]> }): PuntoInteresseDto {
  const dettagli = JSON.parse(r.dettagli_json) as Record<string, unknown>;
  const persona = r.tipo === 'persona' ? personaDellaMaschera(letture?.maschere ?? indiceMaschere(), dettagli.maschera) : null;
  const areeDedalo = r.tipo === 'persona' ? (letture?.areePersone ?? areeDellePersone(r.chiave)).get(r.chiave) ?? [] : [];
  return { chiave: r.chiave, ordine: r.ordine, tipo: r.tipo, nome: r.nome, descrizione: r.descrizione, esauribile: r.esauribile === 1, dettagli, fonte: r.fonte, stato, marcatore, pin, contenitore: r.contenitore_chiave ?? null, areaDedalo: r.area_dedalo_chiave ?? null, persona, areeDedalo };
}

/** Le aree del dedalo in cui si incontra ogni Persona (voce → aree, in ordine di area; migrazione 101); di una voce sola, o di tutte. */
function areeDellePersone(voce?: string): Map<string, string[]> {
  const righe = prepared(`SELECT pa.voce_chiave, pa.area_dedalo_chiave FROM persona_area_dedalo pa JOIN area_dedalo ad ON ad.chiave = pa.area_dedalo_chiave
    ${voce === undefined ? '' : 'WHERE pa.voce_chiave = ?'} ORDER BY ad.ordine, ad.chiave`).all(...(voce === undefined ? [] : [voce])) as Array<{ voce_chiave: string; area_dedalo_chiave: string }>;
  const m = new Map<string, string[]>();
  for (const x of righe) m.set(x.voce_chiave, [...(m.get(x.voce_chiave) ?? []), x.area_dedalo_chiave]);
  return m;
}

/** Lo stato di ogni punto della guida segnato dalla partita (chiave → stato); vuota senza partita, 404 se la partita non esiste. */
function statiPartita(partitaId: number | undefined): Map<string, StatoPunto> {
  if (partitaId === undefined) return new Map();
  verificaPartita(partitaId);
  return new Map((prepared('SELECT punto_chiave, stato FROM punto_partita WHERE partita_id = ?').all(partitaId) as Array<{ punto_chiave: string; stato: StatoPunto }>).map((r) => [r.punto_chiave, r.stato]));
}

/** I pin delle planimetrie collegati ai punti (tutti, o di un punto solo), in ordine di id. Un pin con più voci (098) sta
 *  nell'elenco di ognuna. */
function pinDeiPunti(punto?: string): Map<string, PinDelPuntoDto[]> {
  const righe = prepared(`SELECT s.id, s.nome, s.tipo, s.mappa_chiave, sv.voce_chiave AS voce FROM spillo_voce sv JOIN spillo s ON s.id = sv.spillo_id
    WHERE s.mappa_chiave IS NOT NULL ${punto ? 'AND sv.voce_chiave = ?' : ''} ORDER BY s.id, sv.voce_chiave`)
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
 *  `mappe` e `mappeComplete` contano le planimetrie dell'elenco (la mappa del Palazzo, la radice, esclusa): una planimetria
 *  senza niente da raccogliere è completa (richiesta dell'utente, 2026-10-11: «se una planimetria non ha niente da raccogliere
 *  deve figurare come completata»), come una con tutto raccolto. Prima contavano solo quelle con collezionabili.
 *  `segni` li passa chi li ha già letti (l'elenco dei Palazzi li legge una volta per tutti: rilievo P7). */
export function raccoltaMappe(dungeonChiave: string, partitaId?: number, segni?: SegniPartita): RaccoltaDungeon {
  const mappe = mappeDelPalazzo(dungeonChiave);
  const perMappa = new Map<string, RaccoltaMappa>();
  if (mappe.length === 0) return { perMappa, totale: 0, presi: partitaId === undefined ? null : 0, mappe: 0, mappeComplete: partitaId === undefined ? null : 0 };
  const s = partitaId === undefined ? null : segni ?? segniPartita(partitaId);
  const raccolti = s?.raccolti ?? null;
  const puntiGestiti = s?.puntiGestiti ?? null;
  const righe = prepared(`SELECT id, uid, mappa_chiave, tipo, nome FROM spillo WHERE collezionabile = 1 AND mappa_chiave IN (${mappe.map(() => '?').join(',')}) ORDER BY mappa_chiave, ordine, id`).all(...mappe) as Array<{ id: number; uid: string; mappa_chiave: string; tipo: string; nome: string }>;
  // un pin conta una volta sola anche con più voci: preso quando sono tutte gestite (voci indipendenti, 2026-10-09)
  const voci = raccolti === null ? null : vociDiOgniPin(true);
  for (const r of righe) {
    const raccolto = raccolti === null ? null : raccolti.has(r.uid) || (!!puntiGestiti && fattoPerVoci(voci?.get(r.id) ?? [], puntiGestiti));
    const m = perMappa.get(r.mappa_chiave) ?? { n: 0, presi: raccolti === null ? null : 0, spilli: [] };
    m.n += 1;
    if (raccolto && m.presi !== null) m.presi += 1;
    m.spilli.push({ id: r.id, uid: r.uid, tipo: r.tipo, nome: r.nome, colore: DEFINIZIONI_SPILLO[r.tipo as TipoSpillo]?.colore ?? '#888888', raccolto });
    perMappa.set(r.mappa_chiave, m);
  }
  let totale = 0; let presi = 0;
  for (const m of perMappa.values()) { totale += m.n; presi += m.presi ?? 0; }
  // le planimetrie dell'elenco: complete quelle senza collezionabili e quelle con tutto raccolto
  const radice = radiceDelPalazzo(dungeonChiave);
  const planimetrie = mappe.filter((k) => k !== radice);
  const complete = planimetrie.filter((k) => { const m = perMappa.get(k); return !m || (m.presi !== null && m.presi >= m.n); }).length;
  return { perMappa, totale, presi: partitaId === undefined ? null : presi, mappe: planimetrie.length, mappeComplete: partitaId === undefined ? null : complete };
}

// ---- Le aree dei dedali dei Memento (099) ----
//
// Dedalo → Aree → Elementi (richiesta dell'utente, 2026-10-11). Gli elementi di un'area sono le sue voci della guida, le sue
// Richieste e i suoi timbri; l'area è completata quando lo sono tutti, il dedalo quando lo sono tutte le sue aree. Il calcolo
// è quello condiviso con l'interfaccia (`shared/dedali.ts`).

/** Quel che serve a contare i dedali di un dungeon, letto una volta per tutta la scheda. */
interface LettureDedali {
  /** Le aree di ogni dedalo, in ordine. */
  aree: Map<string, RigaAreaDedalo[]>;
  /** Lo stato di ogni voce di ogni area del dedalo (chiave dell'area → stati). */
  voci: Map<string, Array<{ tipo: string; stato: StatoPunto | null }>>;
  /** Le Richieste di ogni area del dedalo, nell'ordine della guida. */
  richieste: Map<string, RichiestaDelDedaloDto[]>;
  /** Le Richieste di ogni dedalo senza area (da collocare). */
  daCollocare: Map<string, RichiestaDelDedaloDto[]>;
  /** I timbri raccolti per area del dedalo; null senza partita. */
  timbri: Map<string, number> | null;
}

/** Legge aree, voci, Richieste e timbri dei dedali del dungeon; con la partita ogni elemento porta il suo stato. */
function lettureDedali(dungeonChiave: string, partitaId: number | undefined, stati: Map<string, StatoPunto>): LettureDedali {
  const aree = new Map<string, RigaAreaDedalo[]>();
  for (const a of prepared('SELECT ad.* FROM area_dedalo ad JOIN dungeon_area d ON d.chiave = ad.dedalo_chiave WHERE d.dungeon_chiave = ? ORDER BY d.ordine, ad.ordine, ad.chiave').all(dungeonChiave) as RigaAreaDedalo[]) {
    aree.set(a.dedalo_chiave, [...(aree.get(a.dedalo_chiave) ?? []), a]);
  }
  const voci = new Map<string, Array<{ tipo: string; stato: StatoPunto | null }>>();
  for (const v of prepared('SELECT p.chiave, p.tipo, p.area_dedalo_chiave FROM punto_interesse p JOIN dungeon_area d ON d.chiave = p.area_chiave WHERE d.dungeon_chiave = ? AND p.area_dedalo_chiave IS NOT NULL').all(dungeonChiave) as Array<{ chiave: string; tipo: string; area_dedalo_chiave: string }>) {
    voci.set(v.area_dedalo_chiave, [...(voci.get(v.area_dedalo_chiave) ?? []), { tipo: v.tipo, stato: stati.get(v.chiave) ?? null }]);
  }
  const statiRichieste = partitaId === undefined ? new Map<string, StatoRichiesta>() : new Map((prepared('SELECT richiesta_chiave, stato FROM richiesta_partita WHERE partita_id = ?').all(partitaId) as Array<{ richiesta_chiave: string; stato: StatoRichiesta }>).map((r) => [r.richiesta_chiave, r.stato]));
  const richieste = new Map<string, RichiestaDelDedaloDto[]>();
  const daCollocare = new Map<string, RichiestaDelDedaloDto[]>();
  for (const r of prepared('SELECT r.chiave, r.nome, r.area_chiave, r.area_dedalo_chiave FROM richiesta r JOIN dungeon_area d ON d.chiave = r.area_chiave WHERE d.dungeon_chiave = ? ORDER BY d.ordine, r.ordine, r.chiave').all(dungeonChiave) as Array<{ chiave: string; nome: string; area_chiave: string; area_dedalo_chiave: string | null }>) {
    const dto: RichiestaDelDedaloDto = { chiave: r.chiave, nome: r.nome, stato: statiRichieste.get(r.chiave) ?? null };
    const [mappa, chiave] = r.area_dedalo_chiave ? [richieste, r.area_dedalo_chiave] : [daCollocare, r.area_chiave];
    mappa.set(chiave, [...(mappa.get(chiave) ?? []), dto]);
  }
  return { aree, voci, richieste, daCollocare, timbri: partitaId === undefined ? null : timbriPartita(partitaId) };
}

/** Un'area del dedalo come la vede il client: dettagli, timbri, Richieste, conteggio degli elementi e completamento. */
function areaDedaloDto(a: RigaAreaDedalo, l: LettureDedali): AreaDedaloDto {
  const timbri = a.timbri_totale === null ? null : { totale: a.timbri_totale, raccolti: l.timbri === null ? null : Math.min(l.timbri.get(a.chiave) ?? 0, a.timbri_totale) };
  const richieste = l.richieste.get(a.chiave) ?? [];
  const conto = contoAreaDedalo({ voci: l.voci.get(a.chiave) ?? [], richieste, timbri }, l.timbri !== null);
  return { chiave: a.chiave, ordine: a.ordine, nome: a.nome, descrizione: a.descrizione, timbri, richieste, elementi: { totale: conto.totale, fatti: conto.fatti }, completata: conto.completata };
}

/** Un dedalo: le sue aree con gli elementi, le Richieste da collocare, il conteggio e il completamento. */
function dedaloDto(dedaloChiave: string, l: LettureDedali): DedaloDto {
  const aree = (l.aree.get(dedaloChiave) ?? []).map((a) => areaDedaloDto(a, l));
  const conto = contoDedalo(aree, l.timbri !== null);
  return { aree, daCollocare: l.daCollocare.get(dedaloChiave) ?? [], obiettivi: { totale: conto.totale, fatti: conto.fatti }, completato: conto.completato };
}

/**
 * La raccolta dei Memento nella stessa forma di quella dei Palazzi: al posto delle planimetrie i dedali, al posto dei
 * collezionabili gli elementi delle loro aree; un dedalo è completo quando lo sono tutte le sue aree. Senza partita i conteggi
 * del fatto sono null.
 */
function raccoltaMementos(dungeonChiave: string, partitaId: number | undefined, stati: Map<string, StatoPunto>): DungeonRiassuntoDto['raccolta'] {
  const l = lettureDedali(dungeonChiave, partitaId, stati);
  const dedali = (prepared('SELECT chiave FROM dungeon_area WHERE dungeon_chiave = ? ORDER BY ordine').all(dungeonChiave) as Array<{ chiave: string }>).map((d) => dedaloDto(d.chiave, l));
  const totale = dedali.reduce((s, d) => s + d.obiettivi.totale, 0);
  if (partitaId === undefined) return { totale, presi: null, mappe: dedali.length, mappeComplete: null };
  return { totale, presi: dedali.reduce((s, d) => s + (d.obiettivi.fatti ?? 0), 0), mappe: dedali.length, mappeComplete: dedali.filter((d) => d.completato).length };
}



/** Il riassunto di un Palazzo. `gia` porta quello che chi chiama ha già calcolato: la raccolta (la scheda del Palazzo la calcola
 *  per le planimetrie) e i segni della partita (l'elenco li legge una volta per tutti): prima si ricalcolavano qui (P7). */
function riassunto(r: RigaDungeon, stati: Map<string, StatoPunto>, partitaId: number | undefined, completati: Map<string, string> | null,
  gia: { raccolta?: RaccoltaDungeon | null; segni?: SegniPartita } = {}): DungeonRiassuntoDto {
  const conPartita = partitaId !== undefined;
  const punti = prepared('SELECT p.chiave, p.esauribile, p.tipo, p.area_dedalo_chiave FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave WHERE a.dungeon_chiave = ?').all(r.chiave) as Array<{ chiave: string; esauribile: number; tipo: string; area_dedalo_chiave: string | null }>;
  const raccolta = r.tipo === 'mementos' ? raccoltaMementos(r.chiave, partitaId, stati) : (({ totale, presi, mappe, mappeComplete }) => ({ totale, presi, mappe, mappeComplete }))(gia.raccolta ?? raccoltaMappe(r.chiave, partitaId, gia.segni));
  return {
    chiave: r.chiave, tipo: r.tipo, ordine: r.ordine, nome: r.nome, sovrano: r.sovrano, arcanaSovrano: r.arcana_sovrano, arcanaSovranoNome: r.arcana_sovrano ? t('arcana', r.arcana_sovrano) : '',
    date: { sblocco: r.data_sblocco, scadenza: r.data_scadenza, furtoConsigliato: r.furto_consigliato },
    finestra: finestreDungeon().get(r.chiave) ?? null, livelloConsigliato: r.livello_consigliato,
    aree: (prepared('SELECT COUNT(*) AS n FROM dungeon_area WHERE dungeon_chiave = ?').get(r.chiave) as { n: number }).n,
    punti: punti.length, esauribili: punti.filter((p) => p.esauribile === 1).length,
    // le voci descrittive della guida («Altro» fuori dalle aree dei dedali) non hanno stato (scelte dell'utente, 2026-10-01 e 2026-10-11): non contano
    gestiti: conPartita ? punti.filter((p) => !puntoDescrittivo(p.tipo, p.area_dedalo_chiave) && stati.has(p.chiave)).length : null,
    raccolta,
    // solo i Palazzi si completano: i Memento, una volta aperti, restano un posto dove andare
    completato: r.tipo === 'palazzo' ? completati?.get(r.chiave) ?? null : null,
    // dove si atterra toccandolo sulla mappa di Tokyo, per il giorno della partita (2026-10-04)
    atterraggio: atterraggioDelGiorno(r.chiave, giornoDellaPartita(partitaId)),
  };
}

/** Il giorno di gioco (MM-GG) della partita, o null senza partita o se la partita non ha ancora un giorno. */
function giornoDellaPartita(partitaId: number | undefined): string | null {
  if (partitaId === undefined) return null;
  return (prepared('SELECT data_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null } | undefined)?.data_gioco ?? null;
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
  const letture = { maschere: indiceMaschere(), areePersone: areeDellePersone() };
  const native = mappeDelleAree(chiave);
  const raccolta = r.tipo === 'mementos' ? null : raccoltaMappe(chiave, partitaId);
  const dedali = r.tipo === 'mementos' ? lettureDedali(chiave, partitaId, stati) : null;
  // lo stato di una Persona dei Memento è la sua cattura nel compendio (2026-10-12, `catturePersona.ts`), non `punto_partita`
  const catturate = r.tipo === 'mementos' && partitaId !== undefined ? vociPersonaCatturate(partitaId) : new Set<string>();
  /** Lo stato da mostrare di una voce: nessuno per una descrittiva (uno rimasto da prima si ignora, senza cancellarlo); per una
   *  Persona dei Memento «ottenuto» se catturata. */
  const statoDi = (p: RigaPunto): StatoPunto | null => (puntoDescrittivo(p.tipo, p.area_dedalo_chiave) ? null
    : r.tipo === 'mementos' && p.tipo === 'persona' ? (catturate.has(p.chiave) ? 'ottenuto' : null) : stati.get(p.chiave) ?? null);
  const aree = (prepared('SELECT * FROM dungeon_area WHERE dungeon_chiave = ? ORDER BY ordine').all(chiave) as RigaArea[]).map((a): AreaDungeonDto => ({
    chiave: a.chiave, ordine: a.ordine, nome: a.nome, descrizione: a.descrizione,
    mappe: (native.get(a.chiave) ?? []).map((m) => {
      const rm = raccolta?.perMappa.get(m.chiave);
      return { chiave: chiaveMappa(m.chiave), nome: m.nome, n: rm?.n ?? 0, presi: partitaId === undefined ? null : (rm?.presi ?? 0), spilli: rm?.spilli ?? [] };
    }),
    punti: (prepared('SELECT * FROM punto_interesse WHERE area_chiave = ? ORDER BY ordine, chiave').all(a.chiave) as RigaPunto[])
      .map((p) => puntoDto(p, statoDi(p), marc.get(p.chiave) ?? null, pinPunti.get(p.chiave) ?? [], letture)),
    dedalo: dedali ? dedaloDto(a.chiave, dedali) : null,
  }));
  const planimetrie = raccolta ? planimetrieDelPalazzo(chiave, raccolta, partitaId) : [];
  // nei Memento una Persona è «catturata» se è registrata nel compendio della partita (scelte dell'utente, 2026-10-12)
  const personeCatturate = partitaId === undefined || !tabellaUtente('compendio_partita') ? null
    : (prepared('SELECT persona_id FROM compendio_partita WHERE partita_id = ? AND registrata = 1 ORDER BY persona_id').all(partitaId) as Array<{ persona_id: number }>).map((x) => x.persona_id);
  return { ...riassunto(r, stati, partitaId, partitaId !== undefined ? palazziCompletati(partitaId) : null, { raccolta }), note: r.note, fonti: JSON.parse(r.fonti_json) as string[], aree, planimetrie, atterraggi: elencaAtterraggi(chiave), personeCatturate,
    illustrazione: illustrazioneDellaMappa(radiceDelPalazzo(chiave)) };
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
  // una voce descrittiva si legge, non si segna (scelta dell'utente, 2026-10-01); azzerarla resta possibile, per ripulire.
  // Nelle aree dei dedali non ce ne sono: ogni elemento ha uno stato (099, scelta dell'utente del 2026-10-11)
  if (stato !== null && puntoDescrittivo(p.tipo, p.area_dedalo_chiave)) throw httpErrors.badRequest('punto-descrittivo', `«${p.nome}» è una voce descrittiva della guida: si legge, non si segna.`);
  // una Persona dei Memento si cattura nel compendio, non ha uno stato suo (2026-10-12, `catturePersona.ts`); azzerarla resta
  // possibile, per ripulire
  if (stato !== null && ePersonaDeiMemento(puntoChiave)) throw erroreCatturaNelCompendio(p.nome, 'segnare');
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
  if (!a) throw httpErrors.notFound('area-non-trovata', `L'infiltrazione (o il dedalo) '${chiaveArea}' non esiste.`);
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
 * Dal 2026-10-16 l'area va nel **cestino** (`conCestino`) con tutto quel che l'eliminazione tocca, e da lì si rimette.
 */
export function eliminaArea(chiaveArea: string): void {
  const a = prepared('SELECT * FROM dungeon_area WHERE chiave = ?').get(chiaveArea) as RigaArea | undefined;
  if (!a) throw httpErrors.notFound('area-non-trovata', `L'infiltrazione (o il dedalo) '${chiaveArea}' non esiste.`);
  // la pulizia riscrive `dati_guida`: la copia in memoria (`datiGuida`) si butta a transazione chiusa, comunque sia finita
  // (dentro la transazione una rilettura la rimetterebbe in memoria con dati che un annullamento toglierebbe)
  try {
    const vicini = viciniIn(prepared(SQL_FRATELLI_AREA.dungeon_area).all(a.dungeon_chiave) as Array<{ chiave: string }>, chiaveArea);
    conCestino({ tipo: 'area', chiave: chiaveArea, nome: a.nome, contesto: nomeDungeon(a.dungeon_chiave), vicini }, () => eliminaAreaInTransazione(chiaveArea, a));
  } finally {
    invalidaDatiGuida();
  }
}

/** Il nome di un Palazzo (o dei Memento), per il contesto degli elementi del cestino; vuoto se non c'è. */
function nomeDungeon(chiave: string): string {
  return (prepared('SELECT nome FROM dungeon WHERE chiave = ?').get(chiave) as { nome: string } | undefined)?.nome ?? '';
}

/** Dove sta un'area della guida, per il cestino: «Palazzo · Area». */
function contestoAreaGuida(chiaveArea: string): string {
  const r = prepared('SELECT a.nome, d.nome AS dungeon FROM dungeon_area a JOIN dungeon d ON d.chiave = a.dungeon_chiave WHERE a.chiave = ?').get(chiaveArea) as { nome: string; dungeon: string } | undefined;
  return r ? `${r.dungeon} · ${r.nome}` : '';
}

/** Le chiavi di ciò che sta subito prima e subito dopo `chiave` in un elenco già ordinato (per il cestino). */
function viciniIn(elenco: ReadonlyArray<{ chiave: string }>, chiave: string): ViciniCestino {
  const i = elenco.findIndex((r) => r.chiave === chiave);
  return { prima: i > 0 ? elenco[i - 1].chiave : null, dopo: i >= 0 && i < elenco.length - 1 ? elenco[i + 1].chiave : null };
}

/** Le aree della guida di un Palazzo, o le aree di un dedalo, nell'ordine in cui si vedono. */
const SQL_FRATELLI_AREA = { dungeon_area: 'SELECT chiave, ordine FROM dungeon_area WHERE dungeon_chiave = ? ORDER BY ordine, chiave', area_dedalo: 'SELECT chiave, ordine FROM area_dedalo WHERE dedalo_chiave = ? ORDER BY ordine, chiave' } as const;
/** Le voci accanto a una voce: stessa area, stesso Enigma (o nessuno), stessa area del dedalo (o nessuna). */
const SQL_FRATELLI_VOCE = 'SELECT chiave, ordine FROM punto_interesse WHERE area_chiave = ? AND contenitore_chiave IS ? AND area_dedalo_chiave IS ? ORDER BY ordine, chiave';

/**
 * Il posto (indice fra le altre righe, nel loro ordine) di un elemento rimesso dal cestino, dai suoi vicini quando fu eliminato:
 * subito dopo quello che lo precedeva; se era il primo (nessuno prima), in cima; se quello di prima non c'è più, subito prima di
 * quello che lo seguiva; se era l'ultimo (nessuno dopo), in fondo; senza vicini utili, il `ripiego`. Il primo e l'ultimo sono
 * informazioni precise: un'area che era la prima torna la prima anche se nel frattempo le altre sono state riordinate.
 */
function postoDaiVicini(altre: readonly string[], vicini: ViciniCestino | null, ripiego: number): number {
  if (!vicini) return ripiego;
  const dopoDi = vicini.prima ? altre.indexOf(vicini.prima) : -1;
  if (dopoDi >= 0) return dopoDi + 1;
  if (vicini.prima === null) return 0;
  const primaDi = vicini.dopo ? altre.indexOf(vicini.dopo) : -1;
  if (primaDi >= 0) return primaDi;
  if (vicini.dopo === null) return altre.length;
  return ripiego;
}

/**
 * Dopo il ripristino di un'area (della guida o di un dedalo) dal cestino: la si rimette dove stava rispetto alle vicine
 * (`postoDaiVicini`; senza, al suo vecchio posto, al più in fondo); poi l'ordine si rinumera da 0, senza buchi né doppioni. Le righe
 * spostate dall'eliminazione sono già tornate com'erano se nessuno le ha toccate dopo; questo conta quando nel frattempo le aree sono
 * state aggiunte o riordinate.
 */
function rimettiAreaAlPosto(tabella: 'dungeon_area' | 'area_dedalo', chiave: string, vicini: ViciniCestino | null): void {
  const colonna = tabella === 'dungeon_area' ? 'dungeon_chiave' : 'dedalo_chiave';
  const r = prepared(`SELECT ${colonna} AS gruppo, ordine FROM ${tabella} WHERE chiave = ?`).get(chiave) as { gruppo: string; ordine: number } | undefined;
  if (!r) return;
  const altre = (prepared(SQL_FRATELLI_AREA[tabella]).all(r.gruppo) as Array<{ chiave: string }>).map((x) => x.chiave).filter((k) => k !== chiave);
  const posto = postoDaiVicini(altre, vicini, Math.min(r.ordine, altre.length));
  [...altre.slice(0, posto), chiave, ...altre.slice(posto)].forEach((k, n) => prepared(`UPDATE ${tabella} SET ordine = ? WHERE chiave = ? AND ordine <> ?`).run(n, k, n));
}
registraRipristinoCestino('area', (chiave, vicini) => rimettiAreaAlPosto('dungeon_area', chiave, vicini));
registraRipristinoCestino('area-dedalo', (chiave, vicini) => rimettiAreaAlPosto('area_dedalo', chiave, vicini));

/**
 * Dopo il ripristino di una voce: il suo posto viene dai vicini con le stesse regole delle aree (`postoDaiVicini`), in numeri
 * d'ordine: subito dopo la precedente; se era la prima, non dopo la prima di adesso; prima della seguente; se era l'ultima, non prima
 * dell'ultima di adesso; senza vicini utili, il suo vecchio numero. Le voci non tengono l'ordine senza buchi (`ordineInFondo` prende
 * il massimo più uno): si toccano solo se il posto è preso, e allora quelle da lì in giù scendono di uno.
 */
registraRipristinoCestino('voce', (chiave, vicini) => {
  const v = prepared('SELECT area_chiave, contenitore_chiave, area_dedalo_chiave, ordine FROM punto_interesse WHERE chiave = ?').get(chiave) as { area_chiave: string; contenitore_chiave: string | null; area_dedalo_chiave: string | null; ordine: number } | undefined;
  if (!v) return;
  const altre = (prepared(SQL_FRATELLI_VOCE).all(v.area_chiave, v.contenitore_chiave, v.area_dedalo_chiave) as Array<{ chiave: string; ordine: number }>).filter((x) => x.chiave !== chiave);
  const precedente = vicini?.prima ? altre.find((x) => x.chiave === vicini.prima) : undefined;
  const seguente = vicini?.dopo ? altre.find((x) => x.chiave === vicini.dopo) : undefined;
  const prima = altre[0], ultima = altre[altre.length - 1];
  const posto = precedente ? precedente.ordine + 1
    : vicini?.prima === null && prima ? Math.min(v.ordine, prima.ordine)
    : seguente ? seguente.ordine
    : vicini?.dopo === null && ultima ? Math.max(v.ordine, ultima.ordine + 1)
    : v.ordine;
  if (altre.some((x) => x.ordine === posto)) {
    prepared('UPDATE punto_interesse SET ordine = ordine + 1 WHERE area_chiave = ? AND contenitore_chiave IS ? AND area_dedalo_chiave IS ? AND chiave <> ? AND ordine >= ?')
      .run(v.area_chiave, v.contenitore_chiave, v.area_dedalo_chiave, chiave, posto);
  }
  if (posto !== v.ordine) prepared('UPDATE punto_interesse SET ordine = ? WHERE chiave = ?').run(posto, chiave);
});

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
    // i timbri delle partite stanno nelle aree del dedalo (099); le aree se ne vanno con lui (in cascata), le Richieste restano
    if (tabellaUtente('timbri_dedalo_partita')) {
      prepared('DELETE FROM timbri_dedalo_partita WHERE area_chiave = ? OR area_chiave IN (SELECT chiave FROM area_dedalo WHERE dedalo_chiave = ?)').run(chiaveArea, chiaveArea);
    }
    prepared('UPDATE richiesta SET area_dedalo_chiave = NULL WHERE area_dedalo_chiave IN (SELECT chiave FROM area_dedalo WHERE dedalo_chiave = ?)').run(chiaveArea);
    prepared('DELETE FROM area_dedalo WHERE dedalo_chiave = ?').run(chiaveArea);
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
  if (dati.dopo && !elenco.includes(dati.dopo)) throw httpErrors.badRequest('area-non-del-palazzo', `L'infiltrazione '${dati.dopo}' non è di questo Palazzo.`);
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
  /** Tutti i dettagli della voce (2026-10-18): sostituiscono quelli di prima, tranne la `maschera` di una Persona; assenti = invariati. */
  dettagli?: Record<string, unknown>;
  /** L'Enigma di cui la voce diventa un passo (095); null = torna una voce dell'area; assente = invariato. */
  contenitore?: string | null;
  /** L'area del dedalo in cui sta la voce (099): obbligatoria creando una voce di un dedalo, rifiutata fuori dai Memento;
   *  cambiandola la voce (con i passi, se è un Enigma) passa in fondo all'altra area. */
  areaDedalo?: string;
  /** La Persona del compendio (id) di una voce «Persona» (2026-10-11): la maschera della voce diventa il suo nome italiano. */
  persona?: number;
  /** Le aree del dedalo in cui si incontra una Persona di un dedalo (101): obbligatorie creandola (almeno una); correggendola
   *  sostituiscono quelle di prima. Rifiutate per le altre voci. */
  areeDedalo?: string[];
  /** L'area del Palazzo in cui spostare la voce (richiesta dell'utente, 2026-10-12: «devo spostare delle voci da un'area ad
   *  un'altra nel palazzo»): un'altra area dello stesso Palazzo; la voce va in fondo, con i suoi passi se è un Enigma. Non nei
   *  Memento (lì si cambia l'area del dedalo) e non per un passo da solo (si sposta il suo Enigma). */
  area?: string }

/** Vero se l'area della guida è un dedalo dei Memento. */
function eDedalo(areaChiave: string): boolean {
  return !!prepared("SELECT 1 FROM dungeon_area a JOIN dungeon d ON d.chiave = a.dungeon_chiave WHERE a.chiave = ? AND d.tipo = 'mementos'").get(areaChiave);
}

/**
 * Il tipo di una voce deve stare dove sta la voce (2026-10-11): nei dedali solo Persona e Trama («nei memento è tutto random»),
 * e Trama solo nei dedali. 400 altrimenti.
 */
function verificaTipoDellaVoce(tipo: string, dedalo: boolean): void {
  if (dedalo && !tipoDelDedalo(tipo)) throw httpErrors.badRequest('tipo-non-del-dedalo', 'Nei dedali dei Memento una voce è una Persona o Trama: stanze, porte, meccanismi e forzieri cambiano a ogni visita.');
  if (!dedalo && tipo === 'trama') throw httpErrors.badRequest('trama-solo-nei-memento', 'Trama è il tipo delle voci dei dedali dei Memento: nei Palazzi c’è «Storia».');
}

/** I dettagli nuovi di una voce con la `maschera` di prima (se c'era): da qui non si scrive, la decide la Persona del compendio. */
function conMascheraDiPrima(nuovi: Record<string, unknown>, prima: string): string {
  const { maschera: _ignorata, ...resto } = nuovi;
  void _ignorata;
  const vecchia = (JSON.parse(prima) as Record<string, unknown>).maschera;
  return JSON.stringify(vecchia === undefined ? resto : { maschera: vecchia, ...resto });
}

/**
 * I dettagli di una voce «Persona» con la maschera della Persona scelta dal compendio (404 se non esiste, 400 se la voce non è
 * una Persona). `attuali` sono i dettagli della voce che si corregge (assenti creandola): se la Persona scelta è già quella della
 * sua maschera restano come sono; cambiando Persona i dettagli dell'Ombra di prima (resistenze, debolezze, personalità) se ne
 * vanno, perché erano di un'altra maschera.
 */
function dettagliDellaPersona(personaId: number, tipo: string, attuali?: string): string {
  if (tipo !== 'persona') throw httpErrors.badRequest('persona-solo-per-persona', 'Una Persona del compendio si sceglie solo per una voce di tipo Persona.');
  const p = prepared('SELECT nome FROM persona WHERE id = ?').get(personaId) as { nome: string } | undefined;
  if (!p) throw httpErrors.notFound('persona-non-trovata', `La Persona ${personaId} non è nel compendio.`);
  if (attuali !== undefined && personaDellaMaschera(indiceMaschere(), (JSON.parse(attuali) as Record<string, unknown>).maschera)?.id === personaId) return attuali;
  return JSON.stringify({ maschera: t('persona', p.nome) });
}

/**
 * Le aree di una Persona di un dedalo (101): almeno una, tutte del suo dedalo, senza ripetizioni (400 / 404). Una Persona non
 * ha un'area sola: `areaDedalo` per lei si rifiuta.
 */
function verificaAreeDellaPersona(dedalo: string, aree: string[] | undefined, areaDedalo: string | undefined): string[] {
  if (areaDedalo !== undefined) throw httpErrors.badRequest('persona-in-piu-aree', 'Una Persona di un dedalo si incontra in più aree: indicale tutte in «areeDedalo».');
  const elenco = [...new Set(aree ?? [])];
  if (elenco.length === 0) throw httpErrors.badRequest('aree-dedalo-mancanti', 'Una Persona di un dedalo si incontra almeno in un’area: scegline una o più.');
  for (const a of elenco) verificaAreaDedalo(dedalo, a);
  return elenco;
}

/** Sostituisce le aree in cui si incontra una Persona (dentro la transazione di chi chiama). */
function collegaPersonaAlleAree(voce: string, aree: string[]): void {
  prepared('DELETE FROM persona_area_dedalo WHERE voce_chiave = ?').run(voce);
  for (const a of aree) prepared('INSERT INTO persona_area_dedalo (voce_chiave, area_dedalo_chiave) VALUES (?, ?)').run(voce, a);
}

/** L'area del dedalo deve esistere ed essere di quel dedalo (404 / 400). */
function verificaAreaDedalo(dedalo: string, areaDedalo: string): void {
  const a = prepared('SELECT dedalo_chiave, nome FROM area_dedalo WHERE chiave = ?').get(areaDedalo) as { dedalo_chiave: string; nome: string } | undefined;
  if (!a) throw httpErrors.notFound('area-dedalo-non-trovata', `L'area del dedalo '${areaDedalo}' non esiste.`);
  if (a.dedalo_chiave !== dedalo) throw httpErrors.badRequest('area-di-altro-dedalo', `«${a.nome}» è un'area di un altro dedalo: una voce resta nel suo dedalo.`);
}

/**
 * Le regole di un passo (095, scelte dell'utente del 2026-10-01): l'Enigma è una voce «Enigma» della stessa area, non è a sua
 * volta un passo e non ha pin suoi (i pin stanno sui passi); la voce non è sé stessa né un Enigma con i suoi passi (un livello
 * solo: un Enigma dentro un Enigma non si leggerebbe più).
 */
function verificaEnigma(voce: { chiave: string; nome: string; area_chiave: string } | null, area: string, enigmaChiave: string): void {
  const e = prepared('SELECT chiave, nome, tipo, area_chiave, contenitore_chiave FROM punto_interesse WHERE chiave = ?').get(enigmaChiave) as { chiave: string; nome: string; tipo: string; area_chiave: string; contenitore_chiave: string | null } | undefined;
  if (!e) throw httpErrors.notFound('punto-non-trovato', `L'Enigma '${enigmaChiave}' non esiste.`);
  if (!puntoEnigma(e.tipo)) throw httpErrors.badRequest('non-un-enigma', `«${e.nome}» non è un Enigma: i passi stanno solo dentro un Enigma.`);
  if (e.area_chiave !== area) throw httpErrors.badRequest('enigma-di-altra-area', `«${e.nome}» è di un'altra infiltrazione: i passi stanno nell'infiltrazione del loro Enigma.`);
  if (e.contenitore_chiave) throw httpErrors.badRequest('enigma-dentro-enigma', `«${e.nome}» è a sua volta un passo: un Enigma dentro un Enigma non si può.`);
  if (voce) {
    if (voce.chiave === e.chiave) throw httpErrors.badRequest('enigma-dentro-enigma', `«${voce.nome}» non può essere un passo di sé stesso.`);
    if (passiDi(getDb(), voce.chiave).length > 0) throw httpErrors.badRequest('enigma-dentro-enigma', `«${voce.nome}» è un Enigma con i suoi passi: un Enigma dentro un Enigma non si può.`);
  }
  if (pinDelPuntoGuida(getDb(), e.chiave).length > 0) throw httpErrors.conflict('enigma-con-pin', `«${e.nome}» ha dei pin collegati: scollegali (i pin stanno sui passi) prima di dargli dei passi.`);
}

/** L'area del dedalo di una voce (null fuori dai Memento o se la voce non c'è). */
function areaDelPunto(puntoChiave: string): string | null {
  return (prepared('SELECT area_dedalo_chiave FROM punto_interesse WHERE chiave = ?').get(puntoChiave) as { area_dedalo_chiave: string | null } | undefined)?.area_dedalo_chiave ?? null;
}

/** Il posto in fondo fra le voci accanto: della stessa area, dello stesso Enigma (o fuori da ogni Enigma) e della stessa area
 *  del dedalo (099; null fuori dai Memento). */
function ordineInFondo(area: string, contenitore: string | null, areaDedalo: string | null): number {
  return (prepared('SELECT COALESCE(MAX(ordine), -1) AS n FROM punto_interesse WHERE area_chiave = ? AND contenitore_chiave IS ? AND area_dedalo_chiave IS ?').get(area, contenitore, areaDedalo) as { n: number }).n + 1;
}

/**
 * Un'altra area dello stesso Palazzo per la voce (2026-10-12): non nei Memento (lì si cambia l'area del dedalo), un'area che
 * esiste (404), dello stesso Palazzo (400), e non per un passo, che sta nell'area del suo Enigma (`contenitore` non nullo).
 */
function verificaAltraAreaDelPalazzo(p: RigaPunto, dedalo: boolean, contenitore: string | null, area: string): void {
  if (dedalo) throw httpErrors.badRequest('area-solo-nei-palazzi', `«${p.nome}» è una voce dei Memento: lì si cambia l’area del dedalo, non il dedalo.`);
  const destinazione = prepared('SELECT a.nome, a.dungeon_chiave FROM dungeon_area a WHERE a.chiave = ?').get(area) as { nome: string; dungeon_chiave: string } | undefined;
  if (!destinazione) throw httpErrors.notFound('area-non-trovata', `L'infiltrazione (o il dedalo) '${area}' non esiste.`);
  const palazzo = (prepared('SELECT dungeon_chiave FROM dungeon_area WHERE chiave = ?').get(p.area_chiave) as { dungeon_chiave: string }).dungeon_chiave;
  if (destinazione.dungeon_chiave !== palazzo) throw httpErrors.badRequest('area-di-altro-palazzo', `«${destinazione.nome}» è un’infiltrazione di un altro Palazzo: una voce resta nel suo Palazzo.`);
  if (contenitore !== null) throw httpErrors.badRequest('passo-segue-enigma', `«${p.nome}» è un passo: sta nell’infiltrazione del suo Enigma (si sposta l’Enigma, e i passi lo seguono, o la si toglie prima dall’Enigma).`);
}

/**
 * Quel che segue una voce passata in un'altra area (dentro la transazione di chi chiama): la chiave resta (stati delle partite,
 * pin delle planimetrie, marcatore e condizioni la citano per chiave); i passi di un Enigma la seguono; le schede della guida
 * senza mappa (pin con il riferimento «punto» alla voce o a un suo passo, nell'area di prima) passano con lei, altrimenti
 * resterebbero nell'area che ha lasciato.
 */
function seguonoLaVoce(puntoChiave: string, areaPrima: string, areaNuova: string): void {
  prepared('UPDATE punto_interesse SET area_chiave = ? WHERE contenitore_chiave = ?').run(areaNuova, puntoChiave);
  prepared(`UPDATE spillo SET area_guida_chiave = ? WHERE mappa_chiave IS NULL AND area_guida_chiave = ? AND riferimento_tipo = 'punto'
    AND riferimento_chiave IN (SELECT chiave FROM punto_interesse WHERE chiave = ? OR contenitore_chiave = ?)`).run(areaNuova, areaPrima, puntoChiave, puntoChiave);
}

/**
 * Sposta più voci insieme in un'altra area dello stesso Palazzo (richiesta dell'utente, 2026-10-14: «come faccio a spostare più
 * voci del palazzo insieme?»). Le stesse regole della voce singola (`aggiornaPunto` con `area`), per ognuna; arrivano in fondo
 * all'area, nell'ordine che avevano (area di guida, poi posto); una voce che è già lì resta dov'è. Tutto o niente: una voce che
 * non c'è (404) o che non si può spostare (400) fa fallire la richiesta senza aver scritto niente.
 */
export function spostaPuntiInArea(chiavi: string[], area: string): PuntiSpostatiDto {
  const righe = chiavi.map((chiave) => {
    const p = prepared('SELECT * FROM punto_interesse WHERE chiave = ?').get(chiave) as RigaPunto | undefined;
    if (!p) throw httpErrors.notFound('punto-non-trovato', `Il punto '${chiave}' non esiste.`);
    return p;
  });
  const daSpostare = righe.filter((p) => p.area_chiave !== area);
  for (const p of daSpostare) verificaAltraAreaDelPalazzo(p, eDedalo(p.area_chiave), p.contenitore_chiave ?? null, area);
  // nell'ordine della guida: l'area (il suo posto nel Palazzo), poi il posto della voce nell'area
  const ordineArea = new Map((prepared('SELECT chiave, ordine FROM dungeon_area').all() as Array<{ chiave: string; ordine: number }>).map((a) => [a.chiave, a.ordine]));
  daSpostare.sort((a, b) => (ordineArea.get(a.area_chiave) ?? 0) - (ordineArea.get(b.area_chiave) ?? 0) || a.ordine - b.ordine || a.chiave.localeCompare(b.chiave));
  getDb().transaction(() => {
    for (const p of daSpostare) {
      prepared('UPDATE punto_interesse SET area_chiave = ?, ordine = ? WHERE chiave = ?').run(area, ordineInFondo(area, null, null), p.chiave);
      seguonoLaVoce(p.chiave, p.area_chiave, area);
    }
  })();
  return { area, spostate: daSpostare.map((p) => p.chiave) };
}

/** Le colonne di una tabella del file di gioco tranne quelle indicate (lette dallo schema: le migrazioni ne aggiungono). */
function colonneTranne(tabella: string, escluse: readonly string[]): string[] {
  return (prepared(`PRAGMA main.table_info(${tabella})`).all() as Array<{ name: string }>).map((c) => c.name).filter((c) => !escluse.includes(c));
}

/**
 * Copia una riga di `punto_interesse` in un'altra area (dentro la transazione di chi chiama): chiave nuova dal nome, area, posto e
 * Enigma indicati, `fonte` «utente»; tutto il resto (tipo, nome, descrizione, esauribile, dettagli…) com'è. Restituisce la chiave.
 */
function copiaRigaPunto(p: RigaPunto, area: string, ordine: number, contenitore: string | null): string {
  const chiave = chiaveLiberaPunto(area, p.nome);
  const resto = colonneTranne('punto_interesse', ['chiave', 'area_chiave', 'ordine', 'contenitore_chiave', 'area_dedalo_chiave', 'fonte']);
  prepared(`INSERT INTO punto_interesse (chiave, area_chiave, ordine, contenitore_chiave, fonte${resto.map((c) => `, ${c}`).join('')})
    SELECT ?, ?, ?, ?, 'utente'${resto.map((c) => `, ${c}`).join('')} FROM punto_interesse WHERE chiave = ?`).run(chiave, area, ordine, contenitore, p.chiave);
  return chiave;
}

/**
 * Copia le schede della guida senza mappa di una voce (pin con il riferimento «punto», `spillo.area_guida_chiave`) sulla sua copia,
 * con le loro immagini duplicate (una schermata caricata è un'immagine «spillo» propria del pin: la copia ne ha una sua, così
 * togliendola da una delle due l'altra resta) e la loro destinazione, se ne hanno una. Non i collegamenti ai pin (`spillo_voce`, delle
 * planimetrie) né l'atterraggio dei Palazzi. L'uid lo assegna chi chiama, alla fine (`assegnaUidMancanti`).
 */
function copiaSchedeDellaVoce(voce: string, areaPrima: string, copia: string, area: string, adesso: string): number {
  const schede = prepared("SELECT id FROM spillo WHERE mappa_chiave IS NULL AND area_guida_chiave = ? AND riferimento_tipo = 'punto' AND riferimento_chiave = ? ORDER BY ordine, id")
    .pluck().all(areaPrima, voce) as number[];
  const restoSpillo = colonneTranne('spillo', ['id', 'uid', 'seed_identita_json', 'area_guida_chiave', 'riferimento_chiave', 'origine', 'ordine', 'updated_at']);
  const restoImmagine = colonneTranne('immagine', ['id', 'chiave', 'nome_file', 'created_at']);
  const restoDestinazione = colonneTranne('spillo_destinazione', ['spillo_id']);
  for (const id of schede) {
    const ordine = (prepared('SELECT COALESCE(MAX(ordine), -1) + 1 AS n FROM spillo WHERE mappa_chiave IS NULL AND area_guida_chiave = ?').get(area) as { n: number }).n;
    const nuovo = Number(prepared(`INSERT INTO spillo (area_guida_chiave, riferimento_chiave, origine, ordine, updated_at${restoSpillo.map((c) => `, ${c}`).join('')})
      SELECT ?, ?, 'utente', ?, ?${restoSpillo.map((c) => `, ${c}`).join('')} FROM spillo WHERE id = ?`).run(area, copia, ordine, adesso, id).lastInsertRowid);
    // la destinazione (dove porta il pin: mappa e inquadratura, 040), se la scheda ne ha una
    prepared(`INSERT INTO spillo_destinazione (spillo_id${restoDestinazione.map((c) => `, ${c}`).join('')})
      SELECT ?${restoDestinazione.map((c) => `, ${c}`).join('')} FROM spillo_destinazione WHERE spillo_id = ?`).run(nuovo, id);
    for (const img of prepared('SELECT ordine, immagine_chiave, asset, didascalia FROM spillo_immagine WHERE spillo_id = ? ORDER BY ordine, id').all(id) as Array<{ ordine: number; immagine_chiave: string | null; asset: string | null; didascalia: string }>) {
      let chiaveImmagine: string | null = null;
      if (img.immagine_chiave) {
        // dalla 079 le immagini stanno nel database: una senza contenuto avrebbe solo un nome di file che nessuno ha
        const originale = prepared("SELECT nome_file FROM immagine WHERE ambito = 'spillo' AND chiave = ? AND contenuto IS NOT NULL").get(img.immagine_chiave) as { nome_file: string } | undefined;
        if (originale) {
          chiaveImmagine = `${nuovo}-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`;
          const estensione = originale.nome_file.includes('.') ? originale.nome_file.slice(originale.nome_file.lastIndexOf('.')) : '';
          prepared(`INSERT INTO immagine (chiave, nome_file, created_at${restoImmagine.map((c) => `, ${c}`).join('')})
            SELECT ?, ?, ?${restoImmagine.map((c) => `, ${c}`).join('')} FROM immagine WHERE ambito = 'spillo' AND chiave = ?`).run(chiaveImmagine, `${randomUUID()}${estensione}`, adesso, img.immagine_chiave);
        }
      }
      // una schermata il cui file non c'è più non si copia: la riga sarebbe un'immagine rotta
      if (chiaveImmagine === null && img.asset === null) continue;
      prepared('INSERT INTO spillo_immagine (spillo_id, ordine, immagine_chiave, asset, didascalia, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(nuovo, img.ordine, chiaveImmagine, img.asset, img.didascalia, adesso);
    }
  }
  return schede.length;
}

/**
 * Collega la copia di una voce agli stessi pin delle planimetrie dell'originale (`spillo_voce`; segnalazione dell'utente, 2026-10-18:
 * «ha copiato le voci ma non i pin delle voci»). Il pin diventa di tutte e due le voci — si può, sono dello stesso Palazzo
 * (`erroreVoceDelPin`) — e valgono le «voci indipendenti» del 2026-10-09 (`allineaStatiPunto`, come il collegamento a mano): la copia
 * ha il suo stato e parte da fare, l'originale tiene il suo, e il pin è fatto solo quando lo sono tutte le sue voci («se un oggetto è
 * stato raccolto nell'area 3 e poi copiata la voce nell'area 4 deve valere la regola attuale sugli stati del pin», 2026-10-18).
 */
function copiaPinDellaVoce(voce: string, copia: string, adesso: string): number {
  const pin = prepared('SELECT spillo_id FROM spillo_voce WHERE voce_chiave = ? ORDER BY spillo_id').pluck().all(voce) as number[];
  for (const id of pin) {
    prepared('INSERT OR IGNORE INTO spillo_voce (spillo_id, voce_chiave) VALUES (?, ?)').run(id, copia);
    prepared('UPDATE spillo SET updated_at = ? WHERE id = ?').run(adesso, id);
  }
  if (pin.length > 0) allineaStatiPunto(getDb(), copia, adesso);
  return pin.length;
}

/**
 * Copia più voci insieme in un'altra area dello stesso Palazzo (richiesta dell'utente, 2026-10-18: «non è possibile copiare gli
 * elementi di un'area in un'altra area... ma solo spostare... attiva anche la modalità copia»). Scelte dell'utente: la copia porta
 * «Voce, passi e schede» (la voce, i passi dell'Enigma, le schede della guida senza mappa con le loro immagini) e va nelle «altre
 * aree dello stesso Palazzo». Ogni copia è una voce nuova (chiave nuova, `fonte` «utente»), in fondo all'area nell'ordine della
 * guida, collegata agli stessi pin delle planimetrie dell'originale (dal 2026-10-18, `copiaPinDellaVoce`) e con uno stato suo: parte
 * da fare (lo stato dell'originale non si copia). Le regole dello spostamento (`verificaAltraAreaDelPalazzo`: non nei Memento, area esistente dello stesso Palazzo,
 * non un passo) più l'area diversa da quella della voce. Tutto o niente in una transazione.
 */
export function copiaPuntiInArea(chiavi: string[], area: string): PuntiCopiatiDto {
  const righe = chiavi.map((chiave) => {
    const p = prepared('SELECT * FROM punto_interesse WHERE chiave = ?').get(chiave) as RigaPunto | undefined;
    if (!p) throw httpErrors.notFound('punto-non-trovato', `Il punto '${chiave}' non esiste.`);
    return p;
  });
  for (const p of righe) {
    verificaAltraAreaDelPalazzo(p, eDedalo(p.area_chiave), p.contenitore_chiave ?? null, area);
    if (p.area_chiave === area) throw httpErrors.badRequest('copia-nella-stessa-area', `«${p.nome}» è già in quest’infiltrazione: si copia in un’altra infiltrazione dello stesso Palazzo.`);
  }
  // nell'ordine della guida, come lo spostamento
  const ordineArea = new Map((prepared('SELECT chiave, ordine FROM dungeon_area').all() as Array<{ chiave: string; ordine: number }>).map((a) => [a.chiave, a.ordine]));
  righe.sort((a, b) => (ordineArea.get(a.area_chiave) ?? 0) - (ordineArea.get(b.area_chiave) ?? 0) || a.ordine - b.ordine || a.chiave.localeCompare(b.chiave));
  const copiate: PuntiCopiatiDto['copiate'] = [];
  const adesso = nowIso();
  const db = getDb();
  db.transaction(() => {
    for (const p of righe) {
      const copia = copiaRigaPunto(p, area, ordineInFondo(area, null, null), null);
      let schede = copiaSchedeDellaVoce(p.chiave, p.area_chiave, copia, area, adesso);
      let pin = copiaPinDellaVoce(p.chiave, copia, adesso);
      const passi = prepared('SELECT * FROM punto_interesse WHERE contenitore_chiave = ? ORDER BY ordine, chiave').all(p.chiave) as RigaPunto[];
      for (const s of passi) {
        const copiaPasso = copiaRigaPunto(s, area, s.ordine, copia);
        schede += copiaSchedeDellaVoce(s.chiave, p.area_chiave, copiaPasso, area, adesso);
        pin += copiaPinDellaVoce(s.chiave, copiaPasso, adesso);
      }
      // l'Enigma copiato segue i suoi passi (che hanno lo stato dei loro pin)
      if (passi.length > 0) allineaEnigmaInOgniPartita(db, copia, adesso);
      copiate.push({ origine: p.chiave, copia, passi: passi.length, schede, pin });
    }
    assegnaUidMancanti(db);
  })();
  return { area, copiate };
}

/** Un punto della guida (sicura, enigma, boss…): testo, tipo, esauribilità, posto nell'elenco, Enigma di cui è un passo. */
export function aggiornaPunto(puntoChiave: string, dati: DatiPunto): PuntoInteresseDto {
  const p = prepared('SELECT * FROM punto_interesse WHERE chiave = ?').get(puntoChiave) as RigaPunto | undefined;
  if (!p) throw httpErrors.notFound('punto-non-trovato', `Il punto '${puntoChiave}' non esiste.`);
  const areaPrima = p.area_dedalo_chiave ?? null;
  const dedalo = eDedalo(p.area_chiave);
  // il tipo nuovo deve stare dove sta la voce (Persona o Trama nei dedali, Trama solo lì); la Persona scelta vuole una voce Persona
  if (dati.tipo) verificaTipoDellaVoce(dati.tipo, dedalo);
  // nei dedali una Persona sta in più aree e la Trama in una sola (101): passare dall'una all'altra non è una correzione
  if (dedalo && dati.tipo && (dati.tipo === 'persona') !== (p.tipo === 'persona')) {
    throw httpErrors.badRequest('persona-tipo-fisso', `Nei dedali una Persona resta una Persona e una voce di Trama resta Trama: per cambiarla eliminala e aggiungi l’altra.`);
  }
  const personaDelDedalo = dedalo && p.tipo === 'persona';
  if (personaDelDedalo && dati.areaDedalo !== undefined) throw httpErrors.badRequest('persona-in-piu-aree', 'Una Persona di un dedalo si incontra in più aree: indicale tutte in «areeDedalo».');
  if (!personaDelDedalo && dati.areeDedalo !== undefined) throw httpErrors.badRequest('aree-solo-per-persona', 'Più aree insieme le ha solo una Persona di un dedalo: le altre voci stanno in un’area sola.');
  const areePersona = personaDelDedalo && dati.areeDedalo !== undefined ? verificaAreeDellaPersona(p.area_chiave, dati.areeDedalo, undefined) : null;
  // i dettagli scritti a mano (2026-10-18) prendono il posto dei vecchi; la `maschera` resta quella che c'era (la decide la Persona)
  const dettagliScritti = dati.dettagli === undefined ? p.dettagli_json : conMascheraDiPrima(dati.dettagli, p.dettagli_json);
  const dettagli = dati.persona === undefined ? dettagliScritti : dettagliDellaPersona(dati.persona, dati.tipo ?? p.tipo, dettagliScritti);
  // una voce con pin non diventa descrittiva: le descrittive non hanno pin (si scollegano prima); nelle aree dei dedali non ce ne sono
  if (dati.tipo && puntoDescrittivo(dati.tipo, areaPrima) && pinDelPuntoGuida(getDb(), puntoChiave).length > 0) {
    throw httpErrors.conflict('punto-con-pin', `«${p.nome}» ha dei pin collegati: scollegali prima di farne una voce descrittiva.`);
  }
  // un Enigma con i suoi passi resta un Enigma: i passi tornerebbero orfani
  if (dati.tipo && !puntoEnigma(dati.tipo) && passiDi(getDb(), puntoChiave).length > 0) {
    throw httpErrors.conflict('enigma-con-passi', `«${p.nome}» ha dei passi: toglili dall'Enigma prima di cambiargli tipo.`);
  }
  const prima = p.contenitore_chiave ?? null;
  const dopo = dati.contenitore === undefined ? prima : dati.contenitore;
  // un'altra area dello stesso Palazzo (2026-10-12): non nei Memento, e non per un passo (sta nell'area del suo Enigma)
  const cambiaArea = dati.area !== undefined && dati.area !== p.area_chiave;
  const areaGuida = cambiaArea ? dati.area! : p.area_chiave;
  if (cambiaArea) verificaAltraAreaDelPalazzo(p, dedalo, dopo, areaGuida);
  if (dopo !== null && dopo !== prima) verificaEnigma(p, p.area_chiave, dopo);
  // l'area del dedalo (099): un passo sta in quella del suo Enigma; un'altra area si sceglie solo dentro lo stesso dedalo
  if (dati.areaDedalo !== undefined) {
    if (!dedalo) throw httpErrors.badRequest('non-un-dedalo', `«${p.nome}» non è una voce di un dedalo dei Memento: non ha aree del dedalo.`);
    verificaAreaDedalo(p.area_chiave, dati.areaDedalo);
  }
  const areaDopo = dopo !== null ? areaDelPunto(dopo) : (dati.areaDedalo ?? areaPrima);
  if (dati.areaDedalo !== undefined && dati.areaDedalo !== areaDopo) {
    throw httpErrors.badRequest('passo-di-altra-area', `«${p.nome}» è un passo: sta nell'area del suo Enigma (si sposta l'Enigma, e i passi lo seguono).`);
  }
  const adesso = nowIso();
  const db = getDb();
  db.transaction(() => {
    // cambiando Enigma (o uscendone), area del dedalo o area del Palazzo la voce va in fondo fra le sue nuove compagne
    const ordine = dati.ordine ?? (dopo !== prima || areaDopo !== areaPrima || cambiaArea ? ordineInFondo(areaGuida, dopo, areaDopo) : p.ordine);
    prepared('UPDATE punto_interesse SET nome = ?, descrizione = ?, tipo = ?, esauribile = ?, ordine = ?, contenitore_chiave = ?, area_dedalo_chiave = ?, dettagli_json = ?, area_chiave = ? WHERE chiave = ?').run(
      dati.nome?.trim() || p.nome, dati.descrizione ?? p.descrizione, dati.tipo ?? p.tipo, dati.esauribile === undefined ? p.esauribile : (dati.esauribile ? 1 : 0), ordine, dopo, areaDopo, dettagli, areaGuida, puntoChiave);
    if (cambiaArea) seguonoLaVoce(puntoChiave, p.area_chiave, areaGuida);
    // i passi di un Enigma seguono la sua area del dedalo
    if (areaDopo !== areaPrima) prepared('UPDATE punto_interesse SET area_dedalo_chiave = ? WHERE contenitore_chiave = ?').run(areaDopo, puntoChiave);
    if (areePersona) collegaPersonaAlleAree(puntoChiave, areePersona);
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
  const p = prepared('SELECT area_chiave, contenitore_chiave, area_dedalo_chiave FROM punto_interesse WHERE chiave = ?').get(puntoChiave) as { area_chiave: string; contenitore_chiave: string | null; area_dedalo_chiave: string | null } | undefined;
  if (!p) throw httpErrors.notFound('punto-non-trovato', `Il punto '${puntoChiave}' non esiste.`);
  // le voci accanto: della stessa area, dello stesso Enigma (o fuori da ogni Enigma) e della stessa area del dedalo (099)
  const elenco = (prepared('SELECT chiave FROM punto_interesse WHERE area_chiave = ? AND contenitore_chiave IS ? AND area_dedalo_chiave IS ? ORDER BY ordine, chiave').all(p.area_chiave, p.contenitore_chiave ?? null, p.area_dedalo_chiave ?? null) as Array<{ chiave: string }>).map((r) => r.chiave);
  const i = elenco.indexOf(puntoChiave);
  const j = i + verso;
  if (j < 0 || j >= elenco.length) {
    // L0: nei Palazzi le voci stanno in un'infiltrazione, nei dedali dei Memento in un'area
    const dove = p.contenitore_chiave ? 'del suo Enigma' : p.area_dedalo_chiave ? 'della sua area' : 'della sua infiltrazione';
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
 * integrato con gli elementi in mappa». Il collegamento sta in una tabella sua (`spillo_voce`, 098): così anche un pin che ha già
 * un riferimento — un passaggio con la sua destinazione, un Confidente — può essere di una voce, e il riferimento resta com'è.
 * Un punto può avere più pin e un pin più voci (scelta dell'utente, 2026-10-09: prima un pin di un'altra voce si rifiutava).
 * Solo un pin di una planimetria del Palazzo del punto. Collegando, gli stati delle partite si uniscono (`allineaStatiPunto`);
 * scollegando, il pin segue le voci che gli restano (`allineaPinScollegato`), e senza più voci resta com'era.
 * Lo usano la guida e l'editor delle mappe (scelta dell'utente: «Guida ed editor»).
 */
export function collegaPinAlPunto(puntoChiave: string, spilloId: number, collega: boolean): PuntoInteresseDto {
  if (!prepared('SELECT 1 FROM punto_interesse WHERE chiave = ?').get(puntoChiave)) throw httpErrors.notFound('punto-non-trovato', `Il punto '${puntoChiave}' non esiste.`);
  const s = prepared('SELECT id, uid, nome, mappa_chiave, riferimento_tipo, riferimento_chiave FROM spillo WHERE id = ?').get(spilloId) as { id: number; uid: string | null; nome: string; mappa_chiave: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null } | undefined;
  if (!s) throw httpErrors.notFound('spillo-non-trovato', `Lo spillo ${spilloId} non esiste.`);
  const suoPunto = !!prepared('SELECT 1 FROM spillo_voce WHERE spillo_id = ? AND voce_chiave = ?').get(spilloId, puntoChiave);
  // un collegamento rimasto nel riferimento (prima della 094) si toglie da lì; il riferimento vero di un pin non si tocca
  const nelRiferimento = s.riferimento_tipo === 'punto' && s.riferimento_chiave === puntoChiave;
  const adesso = nowIso();
  if (!collega) {
    if (!suoPunto && !nelRiferimento) throw httpErrors.conflict('pin-non-collegato', `«${s.nome}» non è collegato a questo punto.`);
    getDb().transaction(() => {
      if (nelRiferimento) prepared('UPDATE spillo SET riferimento_tipo = NULL, riferimento_chiave = NULL WHERE id = ?').run(spilloId);
      prepared('DELETE FROM spillo_voce WHERE spillo_id = ? AND voce_chiave = ?').run(spilloId, puntoChiave);
      prepared('UPDATE spillo SET updated_at = ? WHERE id = ?').run(adesso, spilloId);
      allineaPinScollegato(getDb(), s, adesso);
    })();
    return leggiPunto(puntoChiave);
  }
  // le regole sono le stesse dell'editor delle mappe e del pacchetto (`erroreVoceDelPin`)
  const errore = erroreVoceDelPin({ nome: s.nome, mappa: s.mappa_chiave }, puntoChiave);
  if (errore) throw errore;
  getDb().transaction(() => {
    if (!suoPunto) {
      prepared('INSERT INTO spillo_voce (spillo_id, voce_chiave) VALUES (?, ?)').run(spilloId, puntoChiave);
      prepared('UPDATE spillo SET updated_at = ? WHERE id = ?').run(adesso, spilloId);
    }
    allineaStatiPunto(getDb(), puntoChiave, adesso);
  })();
  return leggiPunto(puntoChiave);
}

/**
 * Le voci della guida che l'editor delle mappe può collegare a un pin (098, scelta dell'utente: «Guida ed editor»): quelle del
 * Palazzo della sua planimetria che si segnano — non descrittive, non un Enigma coi suoi passi (i pin vanno sui passi) —, tranne
 * le sue; in ordine di guida. Le stesse regole di `erroreVoceDelPin`. Un pin fuori dai Palazzi non ne ha. 404 se il pin non c'è.
 */
export function vociCollegabili(spilloId: number): VoceCollegabileDto[] {
  const s = prepared('SELECT mappa_chiave FROM spillo WHERE id = ?').get(spilloId) as { mappa_chiave: string | null } | undefined;
  if (!s) throw httpErrors.notFound('spillo-non-trovato', `Lo spillo ${spilloId} non esiste.`);
  const dungeon = s.mappa_chiave ? palazzoDiOgniMappa().get(s.mappa_chiave) : undefined;
  if (!dungeon) return [];
  return prepared(`SELECT p.chiave, p.nome, p.tipo, a.chiave AS area, a.nome AS area_nome, p.contenitore_chiave AS enigma
    FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave LEFT JOIN punto_interesse e ON e.chiave = p.contenitore_chiave
    WHERE a.dungeon_chiave = ? AND NOT ${sqlVoceDescrittiva('p')}
      AND NOT EXISTS (SELECT 1 FROM punto_interesse q WHERE q.contenitore_chiave = p.chiave)
      AND NOT EXISTS (SELECT 1 FROM spillo_voce sv WHERE sv.spillo_id = ? AND sv.voce_chiave = p.chiave)
    ORDER BY a.ordine, COALESCE(e.ordine, p.ordine), p.contenitore_chiave IS NOT NULL, p.ordine, p.chiave`)
    .all(dungeon, spilloId)
    .map((r) => { const v = r as { chiave: string; nome: string; tipo: string; area: string; area_nome: string; enigma: string | null }; return { chiave: v.chiave, nome: v.nome, tipo: v.tipo, area: v.area, areaNome: v.area_nome, enigma: v.enigma }; });
}

/**
 * Una chiave libera per una voce nuova dell'area col nome dato (`creaPunto`, `copiaPuntiInArea`). Come per le aree: la chiave sta
 * nei 200 caratteri che le route dei punti accettano (`paramsChiaveGuida`), suffisso «-N» compreso (fino a «-99999»), altrimenti il
 * punto nascerebbe ma non si potrebbe più modificare, spostare né eliminare. Senza lettere né cifre («???») lo slug è vuoto: si usa
 * «punto», invece di una chiave che finisce con un trattino. Il prefisso dell'area è una convenzione (l'area sta in `area_chiave`): se
 * l'area ha già una chiave lunghissima, si accorcia anche lui, lasciando al nome almeno 8 caratteri.
 */
function chiaveLiberaPunto(chiaveArea: string, nome: string): string {
  const radice = (slug(nome) || 'punto').slice(0, Math.max(8, MAX_CHIAVE_AREA - chiaveArea.length - 1 - 6)).replace(/-+$/, '') || 'punto';
  const prefisso = chiaveArea.slice(0, MAX_CHIAVE_AREA - 6 - 1 - radice.length).replace(/-+$/, '');
  const base = `${prefisso}-${radice}`;
  let chiave = base;
  for (let i = 2; prepared('SELECT 1 FROM punto_interesse WHERE chiave = ?').get(chiave); i++) chiave = `${base}-${i}`;
  return chiave;
}

/** Un punto in più, dove la guida non l'aveva trascritto: nasce in fondo all'area. */
export function creaPunto(chiaveArea: string, dati: DatiPunto & { nome: string; tipo: PuntoInteresseDto['tipo'] }): PuntoInteresseDto {
  if (!prepared('SELECT 1 FROM dungeon_area WHERE chiave = ?').get(chiaveArea)) throw httpErrors.notFound('area-non-trovata', `L'infiltrazione (o il dedalo) '${chiaveArea}' non esiste.`);
  const chiave = chiaveLiberaPunto(chiaveArea, dati.nome);
  // un passo nasce in fondo ai passi del suo Enigma, con le regole dei passi (095)
  const contenitore = dati.contenitore ?? null;
  if (contenitore) verificaEnigma(null, chiaveArea, contenitore);
  // in un dedalo dei Memento ogni voce sta in una sua area (099): un passo in quella del suo Enigma
  const dedalo = eDedalo(chiaveArea);
  verificaTipoDellaVoce(dati.tipo, dedalo);
  const dettagli = dati.persona === undefined ? '{}' : dettagliDellaPersona(dati.persona, dati.tipo);
  if (!dedalo && dati.areaDedalo !== undefined) throw httpErrors.badRequest('non-un-dedalo', 'Le aree del dedalo ci sono solo nei dedali dei Memento.');
  // una Persona di un dedalo si incontra in più aree (101): sta nel dedalo, collegata alle sue aree
  const personaDelDedalo = dedalo && dati.tipo === 'persona';
  const areePersona = personaDelDedalo ? verificaAreeDellaPersona(chiaveArea, dati.areeDedalo, dati.areaDedalo) : null;
  if (!personaDelDedalo && dati.areeDedalo !== undefined) throw httpErrors.badRequest('aree-solo-per-persona', 'Più aree insieme le ha solo una Persona di un dedalo: le altre voci stanno in un’area sola.');
  if (dedalo && !personaDelDedalo && dati.areaDedalo === undefined && !contenitore) throw httpErrors.badRequest('area-dedalo-mancante', 'Una voce di un dedalo sta in una delle sue aree: scegli l’area.');
  if (dati.areaDedalo !== undefined) verificaAreaDedalo(chiaveArea, dati.areaDedalo);
  const areaDedalo = contenitore ? areaDelPunto(contenitore) : (dati.areaDedalo ?? null);
  if (contenitore && dati.areaDedalo !== undefined && dati.areaDedalo !== areaDedalo) throw httpErrors.badRequest('passo-di-altra-area', 'Un passo sta nell’area del suo Enigma.');
  const ordine = dati.ordine ?? ordineInFondo(chiaveArea, contenitore, areaDedalo);
  getDb().transaction(() => {
    prepared("INSERT INTO punto_interesse (chiave, area_chiave, ordine, tipo, nome, descrizione, esauribile, dettagli_json, fonte, contenitore_chiave, area_dedalo_chiave) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'utente', ?, ?)")
      .run(chiave, chiaveArea, ordine, dati.tipo, dati.nome.trim(), dati.descrizione ?? '', dati.esauribile ? 1 : 0, dettagli, contenitore, areaDedalo);
    if (areePersona) collegaPersonaAlleAree(chiave, areePersona);
    // l'Enigma segue i passi: un passo nuovo ancora da fare lo riapre dove era risolto (scelta dell'utente, 2026-10-02)
    if (contenitore) allineaEnigmaInOgniPartita(getDb(), contenitore, nowIso());
  })();
  return leggiPunto(chiave);
}

/**
 * Quello che un punto della guida lascia nel resto dei dati, tolto prima di lui (dentro la transazione di chi chiama): gli stati
 * delle partite, il marcatore, il «raccolto» degli elementi della guida senza mappa che lo citano; i pin delle planimetrie tengono
 * il loro «raccolto» (lo stato vive nei pin, 2026-10-01) e perdono solo il collegamento — se hanno altre voci (098), seguono
 * quelle. Lo usano `eliminaPunto` ed `eliminaArea`,
 * che prima lo scriveva una seconda volta riga per riga (rilievo R4 della verifica, 2026-10-03).
 */
function staccaPunto(puntoChiave: string): void {
  prepared('DELETE FROM punto_partita WHERE punto_chiave = ?').run(puntoChiave);
  prepared('DELETE FROM marcatore_mappa WHERE punto_chiave = ?').run(puntoChiave);
  prepared("DELETE FROM spillo_partita WHERE spillo_uid IN (SELECT uid FROM spillo WHERE riferimento_tipo = 'punto' AND riferimento_chiave = ? AND mappa_chiave IS NULL AND uid IS NOT NULL)").run(puntoChiave);
  prepared("UPDATE spillo SET riferimento_tipo = NULL, riferimento_chiave = NULL WHERE riferimento_tipo = 'punto' AND riferimento_chiave = ?").run(puntoChiave);
  // i pin perdono il collegamento a questa voce (le altre restano), e in ogni partita seguono quelle che gli restano
  const pin = prepared('SELECT s.id, s.uid FROM spillo_voce sv JOIN spillo s ON s.id = sv.spillo_id WHERE sv.voce_chiave = ?').all(puntoChiave) as Array<{ id: number; uid: string | null }>;
  prepared('DELETE FROM spillo_voce WHERE voce_chiave = ?').run(puntoChiave);
  for (const p of pin) allineaPinScollegato(getDb(), p, nowIso());
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
 * Dal 2026-10-16 la voce va nel cestino (`conCestino`) e da lì si rimette.
 */
export function eliminaPunto(puntoChiave: string): void {
  const p = prepared('SELECT nome, area_chiave, contenitore_chiave, area_dedalo_chiave FROM punto_interesse WHERE chiave = ?').get(puntoChiave) as { nome: string; area_chiave: string; contenitore_chiave: string | null; area_dedalo_chiave: string | null } | undefined;
  if (!p) throw httpErrors.notFound('punto-non-trovato', `Il punto '${puntoChiave}' non esiste.`);
  const nomeAreaDedalo = p.area_dedalo_chiave ? (prepared('SELECT nome FROM area_dedalo WHERE chiave = ?').get(p.area_dedalo_chiave) as { nome: string } | undefined)?.nome : undefined;
  const contesto = [contestoAreaGuida(p.area_chiave), nomeAreaDedalo].filter(Boolean).join(' · ');
  const vicini = viciniIn(prepared(SQL_FRATELLI_VOCE).all(p.area_chiave, p.contenitore_chiave, p.area_dedalo_chiave) as Array<{ chiave: string }>, puntoChiave);
  conCestino({ tipo: 'voce', chiave: puntoChiave, nome: p.nome, contesto, vicini }, () => getDb().transaction(() => {
    staccaPunto(puntoChiave);
    // i passi di un Enigma tolto restano, voci dell'area con il loro stato (095)
    for (const passo of passiDi(getDb(), puntoChiave)) {
      const { area_chiave: area, area_dedalo_chiave: areaDedalo } = prepared('SELECT area_chiave, area_dedalo_chiave FROM punto_interesse WHERE chiave = ?').get(passo.chiave) as { area_chiave: string; area_dedalo_chiave: string | null };
      prepared('UPDATE punto_interesse SET contenitore_chiave = NULL, ordine = ? WHERE chiave = ?').run(ordineInFondo(area, null, areaDedalo), passo.chiave);
    }
    prepared('DELETE FROM punto_interesse WHERE chiave = ?').run(puntoChiave);
    // un passo tolto: il suo Enigma segue i passi che restano
    if (p.contenitore_chiave) allineaEnigmaInOgniPartita(getDb(), p.contenitore_chiave, nowIso());
  })());
}

// ---- Le aree dei dedali: aggiungere, correggere, spostare, eliminare (099) ----
//
// Richiesta dell'utente (2026-10-11): «devo poter definire in ogni Dedalo delle aree... e in quelle aree devo poter modificare
// gli elementi... i dettagli dell'area». Le aree sono dati di gioco (`gioco.db`): valgono per tutte le partite e vanno nel
// pacchetto, come ogni correzione della guida.

export interface DatiAreaDedalo { nome?: string; descrizione?: string; /** null = l'area non ha timbri. */ timbriTotale?: number | null }

/** Una riga di `area_dedalo` (404 se non c'è). */
function rigaAreaDedalo(chiave: string): RigaAreaDedalo {
  const a = prepared('SELECT * FROM area_dedalo WHERE chiave = ?').get(chiave) as RigaAreaDedalo | undefined;
  if (!a) throw httpErrors.notFound('area-dedalo-non-trovata', `L'area del dedalo '${chiave}' non esiste.`);
  return a;
}

/** L'area del dedalo com'è adesso, senza partita (gli stati li dà la scheda del Memento). */
function leggiAreaDedalo(chiave: string): AreaDedaloDto {
  const a = rigaAreaDedalo(chiave);
  const dungeon = (prepared('SELECT dungeon_chiave FROM dungeon_area WHERE chiave = ?').get(a.dedalo_chiave) as { dungeon_chiave: string }).dungeon_chiave;
  return areaDedaloDto(a, lettureDedali(dungeon, undefined, new Map()));
}

/** Riporta i timbri delle partite dentro il nuovo totale dell'area: senza timbri si tolgono, con meno timbri si riducono. */
function allineaTimbriDelleAree(area: string, totale: number | null): void {
  if (!tabellaUtente('timbri_dedalo_partita')) return;
  if (totale === null) prepared('DELETE FROM timbri_dedalo_partita WHERE area_chiave = ?').run(area);
  else prepared('UPDATE timbri_dedalo_partita SET raccolti = ? WHERE area_chiave = ? AND raccolti > ?').run(totale, area, totale);
}

/** Un'area nuova in fondo al dedalo (404 se il dedalo non c'è, 400 se non è un dedalo dei Memento). */
export function creaAreaDedalo(dedalo: string, dati: { nome: string; descrizione?: string; timbriTotale?: number | null }): AreaDedaloDto {
  if (!prepared('SELECT 1 FROM dungeon_area WHERE chiave = ?').get(dedalo)) throw httpErrors.notFound('area-non-trovata', `Il dedalo '${dedalo}' non esiste.`);
  if (!eDedalo(dedalo)) throw httpErrors.badRequest('non-un-dedalo', 'Le aree si aggiungono solo ai dedali dei Memento.');
  const nome = dati.nome.trim();
  // la chiave sta nei 200 caratteri che le route accettano, suffisso «-N» compreso; senza lettere né cifre lo slug è «area»
  const radice = (slug(nome) || 'area').slice(0, Math.max(1, MAX_CHIAVE_AREA - dedalo.length - 1 - 6)).replace(/-+$/, '') || 'area';
  const base = `${dedalo}-${radice}`;
  let chiave = base;
  for (let i = 2; prepared('SELECT 1 FROM area_dedalo WHERE chiave = ?').get(chiave); i++) chiave = `${base}-${i}`;
  const ordine = (prepared('SELECT COALESCE(MAX(ordine), -1) AS n FROM area_dedalo WHERE dedalo_chiave = ?').get(dedalo) as { n: number }).n + 1;
  prepared('INSERT INTO area_dedalo (chiave, dedalo_chiave, ordine, nome, descrizione, timbri_totale) VALUES (?, ?, ?, ?, ?, ?)').run(chiave, dedalo, ordine, nome, dati.descrizione ?? '', dati.timbriTotale ?? null);
  return leggiAreaDedalo(chiave);
}

/** Nome, dettagli e totale dei timbri di un'area del dedalo; i timbri delle partite seguono il nuovo totale. */
export function aggiornaAreaDedalo(chiave: string, dati: DatiAreaDedalo): AreaDedaloDto {
  const a = rigaAreaDedalo(chiave);
  const timbri = dati.timbriTotale === undefined ? a.timbri_totale : dati.timbriTotale;
  getDb().transaction(() => {
    prepared('UPDATE area_dedalo SET nome = ?, descrizione = ?, timbri_totale = ? WHERE chiave = ?').run(dati.nome?.trim() || a.nome, dati.descrizione ?? a.descrizione, timbri, chiave);
    if (timbri !== a.timbri_totale) allineaTimbriDelleAree(chiave, timbri);
  })();
  return leggiAreaDedalo(chiave);
}

/** Un posto su o giù fra le aree del dedalo; l'ordine si ricompatta (0, 1, 2…). */
export function spostaAreaDedalo(chiave: string, verso: -1 | 1): AreaDedaloDto {
  const a = rigaAreaDedalo(chiave);
  const elenco = (prepared('SELECT chiave FROM area_dedalo WHERE dedalo_chiave = ? ORDER BY ordine, chiave').all(a.dedalo_chiave) as Array<{ chiave: string }>).map((r) => r.chiave);
  const i = elenco.indexOf(chiave);
  const j = i + verso;
  if (j < 0 || j >= elenco.length) throw httpErrors.conflict('area-al-limite', verso < 0 ? 'L’area è già la prima del dedalo.' : 'L’area è già l’ultima del dedalo.');
  [elenco[i], elenco[j]] = [elenco[j], elenco[i]];
  getDb().transaction(() => { elenco.forEach((k, n) => prepared('UPDATE area_dedalo SET ordine = ? WHERE chiave = ?').run(n, k)); })();
  return leggiAreaDedalo(chiave);
}

/**
 * Elimina un'area del dedalo per tutte le partite (scelta dell'utente, 2026-10-11: «Voci via, Richieste da collocare»): le sue
 * voci se ne vanno con quel che le partite ne avevano segnato (come `eliminaPunto`, Enigmi e passi compresi) e i timbri con lei;
 * le Richieste restano nel dedalo, da collocare, con il loro stato. Le aree che la seguivano salgono di un posto.
 * Dal 2026-10-16 l'area va nel cestino (`conCestino`) e da lì si rimette.
 */
export function eliminaAreaDedalo(chiave: string): void {
  const a = rigaAreaDedalo(chiave);
  const vicini = viciniIn(prepared(SQL_FRATELLI_AREA.area_dedalo).all(a.dedalo_chiave) as Array<{ chiave: string }>, chiave);
  conCestino({ tipo: 'area-dedalo', chiave, nome: a.nome, contesto: contestoAreaGuida(a.dedalo_chiave), vicini }, () => getDb().transaction(() => {
    const voci = (prepared('SELECT chiave FROM punto_interesse WHERE area_dedalo_chiave = ?').all(chiave) as Array<{ chiave: string }>).map((r) => r.chiave);
    for (const v of voci) staccaPunto(v);
    // prima i passi, poi gli Enigmi: nessun passo resta a puntare a un Enigma che non c'è
    prepared('DELETE FROM punto_interesse WHERE area_dedalo_chiave = ? AND contenitore_chiave IS NOT NULL').run(chiave);
    prepared('DELETE FROM punto_interesse WHERE area_dedalo_chiave = ?').run(chiave);
    allineaTimbriDelleAree(chiave, null);
    // le Persona (101) stanno nel dedalo: perdono solo il collegamento a quest'area
    prepared('DELETE FROM persona_area_dedalo WHERE area_dedalo_chiave = ?').run(chiave);
    prepared('UPDATE richiesta SET area_dedalo_chiave = NULL WHERE area_dedalo_chiave = ?').run(chiave);
    prepared('DELETE FROM area_dedalo WHERE chiave = ?').run(chiave);
    prepared('UPDATE area_dedalo SET ordine = ordine - 1 WHERE dedalo_chiave = ? AND ordine > ?').run(a.dedalo_chiave, a.ordine);
  })());
}
