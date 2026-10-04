// ============================================================
// palazziService — quando un Palazzo è completato, per la partita (richiesta dell'utente, 2026-09-30)
// ============================================================
//
// «Se un palazzo è completato al 100% bisogna che gli eventi diano quel palazzo come completato a prescindere
// dalla data di scadenza» — Kamoshida al 100%, con l'Ombra di Kamoshida segnata raccolta sulla mappa, il 22
// aprile risultava ancora da completare: la condizione guardava solo il boss fra i punti della Guida.
//
// Un Palazzo è completato da **fatti della partita**, mai dalla data. Dal 2026-10-04 (scelta dell'utente: «devono essere
// entrambe valide le condizioni sono in AND non in OR», poi «Tesoro + boss + raccolto tutto») servono **tutte e tre**:
// - il **Tesoro del Palazzo**: lo spillo «Tesoro del Palazzo» raccolto. Un Palazzo senza quello spillo sulle planimetrie
//   non si completa finché non lo si mette con l'editor;
// - il **boss finale** sconfitto: il suo spillo raccolto sulla mappa, o il boss segnato nella Guida. Prima il boss bastava
//   da solo, ma si può affrontare più volte dentro un Palazzo (rilievo dell'utente);
// - **tutto il raccolto**: il 100% della scheda del Palazzo, con la sua stessa regola.
// Il boss **finale**, non uno qualsiasi: Shido ha Akechi e il Mastino prima dell'Aula magna, Maruki Sumire
// prima della fine (rilievo della revisione). Finale = i boss dell'ultima area, in ordine di guida, che ne ha.
// I Memento non hanno planimetrie: restano completati dal boss finale segnato nella Guida, come prima.
//
// Il boss finale della Guida **non si segna più da solo** raccogliendo il Tesoro o il boss (scelta dell'utente del
// 2026-10-04, «Togli l'automatismo»: il segno automatico del 2026-09-30 faceva risultare il boss sconfitto senza che
// l'utente l'avesse detto; utente 017 toglie quelli rimasti). Restano le scelte del 2026-09-30: l'ingresso al Palazzo
// **sparisce** dalla mappa a Palazzo completato, e gli archi restano legati alla data.
// ============================================================

import { prepared } from '../db/dbService.js';
import { leggiCondizioniSalvate, ordineGioco } from '../../shared/condizioniSpillo.js';
import { voceDelPin, vociGestite } from './mappe/voceDelPin.js';
import { radiceDelPalazzo, SQL_RADICE_PALAZZO, SQL_SOTTOALBERO } from './mappe/alberoMappe.js';

/** Le mappe di ogni Palazzo: l'albero sotto la radice `dungeon-<chiave>` (mappa → Palazzo). */
export function palazzoDiOgniMappa(): Map<string, string> {
  // tutte le radici dei Palazzi insieme (la regola è quella di `alberoMappe`), con il loro dungeon portato giù per l'albero
  const righe = prepared(`WITH RECURSIVE albero(chiave, dungeon) AS (
      SELECT chiave, substr(chiave, 9) FROM mappa WHERE ${SQL_RADICE_PALAZZO}
      UNION
      SELECT m.chiave, a.dungeon FROM mappa m JOIN albero a ON m.genitore_chiave = a.chiave
    ) SELECT chiave, dungeon FROM albero`).all() as Array<{ chiave: string; dungeon: string }>;
  return new Map(righe.map((r) => [r.chiave, r.dungeon]));
}

/** Il boss finale di un Palazzo: l'area e i suoi punti «boss»; `unico` se nessun'altra area ha boss (niente intermedi). */
export interface BossFinale { area: string; punti: string[]; unico: boolean }

/** Il boss finale di ogni Palazzo: l'ultima area (in ordine di guida) con punti «boss», e quei punti. */
export function bossFinali(): Map<string, BossFinale> {
  const righe = prepared(`SELECT a.dungeon_chiave AS dungeon, a.chiave AS area, a.ordine AS ordine, pi.chiave AS punto
    FROM punto_interesse pi JOIN dungeon_area a ON a.chiave = pi.area_chiave WHERE pi.tipo = 'boss' ORDER BY a.dungeon_chiave, a.ordine, pi.ordine`).all() as Array<{ dungeon: string; area: string; ordine: number; punto: string }>;
  const out = new Map<string, { area: string; ordine: number; punti: string[]; aree: Set<string> }>();
  for (const r of righe) {
    const attuale = out.get(r.dungeon);
    if (!attuale) out.set(r.dungeon, { area: r.area, ordine: r.ordine, punti: [r.punto], aree: new Set([r.area]) });
    else {
      attuale.aree.add(r.area);
      if (r.ordine > attuale.ordine) Object.assign(attuale, { area: r.area, ordine: r.ordine, punti: [r.punto] });
      else if (r.ordine === attuale.ordine) attuale.punti.push(r.punto);
    }
  }
  return new Map([...out].map(([k, v]) => [k, { area: v.area, punti: v.punti, unico: v.aree.size === 1 }]));
}

/** Le aree della guida contenute in ogni planimetria (mappa → aree), per riconoscere dove sta il boss finale. */
function areeDelleMappe(): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  if (!prepared("SELECT 1 FROM sqlite_master WHERE name='mappa_entita'").get()) return out;
  for (const r of prepared("SELECT mappa_chiave, entita_chiave FROM mappa_entita WHERE entita_tipo = 'area'").all() as Array<{ mappa_chiave: string; entita_chiave: string }>) {
    const s = out.get(r.mappa_chiave) ?? new Set<string>();
    s.add(r.entita_chiave);
    out.set(r.mappa_chiave, s);
  }
  return out;
}

interface SpilloCollezionabile { uid: string | null; tipo: string; mappa: string; /** La voce della guida del pin (`voceDelPin`). */ voce: string | null }

/**
 * È il boss finale del suo Palazzo? Se punta a un punto boss finale; se sta sulla planimetria che contiene l'area
 * finale; oppure se il Palazzo **non ha boss intermedi** — allora ogni boss è quello finale. Quest'ultima serve ai
 * dati veri: l'area finale di Kamoshida (come quelle di Madarame e Futaba) non è legata a nessuna planimetria, e
 * l'«Ombra di Kamoshida» messa sulla Stanza del Tesoro va riconosciuta lo stesso (rilievo della revisione). Dove ci
 * sono intermedi (Shido, Maruki) serve il collegamento: uno spillo «Boss» qualunque potrebbe essere Akechi.
 */
function eBossFinale(s: SpilloCollezionabile, finale: BossFinale | undefined, aree: Map<string, Set<string>>): boolean {
  if (s.tipo !== 'boss' || !finale) return false;
  if (s.voce && finale.punti.includes(s.voce)) return true;
  if (aree.get(s.mappa)?.has(finale.area)) return true;
  return finale.unico;
}

/** I collezionabili sulle planimetrie di ogni Palazzo. */
function collezionabiliPerPalazzo(palazzi: Map<string, string>): Map<string, SpilloCollezionabile[]> {
  const colonne = new Set((prepared('PRAGMA main.table_info(spillo)').all() as Array<{ name: string }>).map((c) => c.name));
  const out = new Map<string, SpilloCollezionabile[]>();
  // la voce (094) c'è dal suo turno in poi, come l'uid (067): prima vale il solo riferimento «punto»
  const righe = prepared(`SELECT ${colonne.has('uid') ? 'uid' : 'NULL AS uid'}, tipo, mappa_chiave, riferimento_tipo, riferimento_chiave${colonne.has('voce_chiave') ? ', voce_chiave' : ''} FROM spillo WHERE collezionabile = 1 AND mappa_chiave IS NOT NULL`).all() as Array<{ uid: string | null; tipo: string; mappa_chiave: string; riferimento_tipo: string | null; riferimento_chiave: string | null; voce_chiave?: string | null }>;
  for (const r of righe) {
    const dungeon = palazzi.get(r.mappa_chiave);
    if (!dungeon) continue;
    const elenco = out.get(dungeon) ?? [];
    elenco.push({ uid: r.uid, tipo: r.tipo, mappa: r.mappa_chiave, voce: voceDelPin(r) });
    out.set(dungeon, elenco);
  }
  return out;
}

/** Uno spillo segnato raccolto nella partita. */
const raccolto = (s: SpilloCollezionabile, raccolti: Set<string>): boolean => !!s.uid && raccolti.has(s.uid);

/** Un Palazzo nella partita: il perché del completamento, o null; e, se non è completato, che cosa manca. */
export interface StatoPalazzo { completato: string | null; manca: string | null }

/**
 * Le tre condizioni del completamento di un Palazzo (vedi l'intestazione), tutte insieme: Tesoro raccolto, boss finale
 * sconfitto (spillo raccolto o segnato nella Guida), 100% del raccolto con la regola della scheda.
 */
function valutaPalazzo(spilli: SpilloCollezionabile[], finale: BossFinale | undefined, aree: Map<string, Set<string>>, raccolti: Set<string>, puntiGestiti: Set<string>, bossSegnato: boolean): StatoPalazzo {
  // la stessa regola della scheda del Palazzo: raccolto, o collegato a un punto della Guida già gestito
  const preso = (s: SpilloCollezionabile) => raccolto(s, raccolti) || (!!s.voce && puntiGestiti.has(s.voce));
  const tesori = spilli.filter((s) => s.tipo === 'tesoro-palazzo');
  const tesoro = tesori.length > 0 && tesori.every((s) => raccolto(s, raccolti));
  const boss = bossSegnato || spilli.some((s) => eBossFinale(s, finale, aree) && raccolto(s, raccolti));
  const presi = spilli.filter(preso).length;
  const tutto = spilli.length > 0 && presi >= spilli.length;
  if (tesoro && boss && tutto) return { completato: `Tesoro, boss finale e raccolto tutto (${presi}/${spilli.length})`, manca: null };
  const manca = [
    tesori.length === 0 ? 'lo spillo «Tesoro del Palazzo» sulle planimetrie' : !tesoro ? 'il Tesoro del Palazzo raccolto' : null,
    !boss ? 'il boss finale sconfitto' : null,
    !tutto ? `tutto il raccolto (${presi}/${spilli.length})` : null,
  ].filter((m): m is string => m !== null);
  return { completato: null, manca: manca.join(', ') };
}

/** I Palazzi (e i Memento) della partita: completati col perché, o che cosa manca. */
export function statoPalazzi(partitaId: number): Map<string, StatoPalazzo> {
  const out = new Map<string, StatoPalazzo>();
  const finali = bossFinali();
  const puntiGestiti = vociGestite(partitaId);
  const tipi = new Map((prepared('SELECT chiave, tipo FROM dungeon').all() as Array<{ chiave: string; tipo: string }>).map((r) => [r.chiave, r.tipo]));
  const palazzi = palazzoDiOgniMappa();
  const raccolti = new Set((prepared('SELECT spillo_uid FROM spillo_partita WHERE partita_id = ? AND raccolto = 1').all(partitaId) as Array<{ spillo_uid: string }>).map((r) => r.spillo_uid));
  const aree = areeDelleMappe();
  const collezionabili = collezionabiliPerPalazzo(palazzi);
  for (const [dungeon, tipo] of tipi) {
    const finale = finali.get(dungeon);
    if (tipo === 'mementos') {
      // niente planimetrie: il boss finale segnato nella Guida, come prima del 2026-10-04
      const segnato = !!finale && finale.punti.some((p) => puntiGestiti.has(p));
      out.set(dungeon, segnato ? { completato: 'boss finale segnato nella Guida', manca: null } : { completato: null, manca: 'il boss finale segnato nella Guida' });
      continue;
    }
    const bossSegnato = !!finale && finale.punti.some((p) => puntiGestiti.has(p));
    out.set(dungeon, valutaPalazzo(collezionabili.get(dungeon) ?? [], finale, aree, raccolti, puntiGestiti, bossSegnato));
  }
  return out;
}

/** I Palazzi completati nella partita, ognuno col perché. */
export function palazziCompletati(partitaId: number): Map<string, string> {
  return new Map([...statoPalazzi(partitaId)].flatMap(([k, s]) => (s.completato ? [[k, s.completato] as [string, string]] : [])));
}

/**
 * Il Palazzo in cui porta uno spillo che sta **fuori** da quel Palazzo (l'ingresso dalla città, il passaggio
 * da Tokyo): per riferimento a una mappa o per destinazione. `null` se non porta in un Palazzo o se ci sta già dentro.
 *
 * Un ingresso nato dalla sincronizzazione e poi modificato a mano può aver perso il collegamento: il «Palazzo di
 * Kamoshida» sulla Shujin oggi è un punto sensibile senza riferimento, ma la sua identità di seed dice ancora che
 * era il passaggio verso `dungeon-kamoshida` (rilievo della revisione). Senza collegamento vale quella.
 */
export function palazzoDiIngresso(spillo: { mappa_chiave: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null; seed_identita_json?: string | null }, destinazione: string | null, palazzi: Map<string, string>): string | null {
  const verso = spillo.riferimento_tipo === 'mappa' && spillo.riferimento_chiave ? spillo.riferimento_chiave : destinazione ?? versoDiSeed(spillo.seed_identita_json);
  if (!verso) return null;
  const dungeon = palazzi.get(verso);
  if (!dungeon) return null;
  return spillo.mappa_chiave && palazzi.get(spillo.mappa_chiave) === dungeon ? null : dungeon;
}

/**
 * Dove si entra in un Palazzo (o nei Memento), per «Sulla mappa» di una voce collegata al dungeon (scelta dell'utente,
 * 2026-10-01: «Ingresso in città»). La radice `dungeon-<k>` non ha planimetria, e aprirla mostrava l'elenco nudo
 * delle stanze. Si cerca lo spillo che da fuori porta dentro, con la stessa regola che a Palazzo completato lo blocca
 * (`palazzoDiIngresso`: riferimento, destinazione, identità di seed). Fra più ingressi vince quello aperto nel giorno
 * della voce (le sue condizioni di data: la Shujin ha l'ingresso del solo 11 aprile e quello dal 12 aprile al 2 maggio),
 * poi quello in città, poi il primo. Se il dungeon non ha ingresso sulle mappe, la prima planimetria del Palazzo in
 * ordine logico (quello della scheda del Palazzo); se non ha nemmeno quella, la radice. `null` se il dungeon non ha mappe.
 */
export function ingressoDelPalazzo(dungeon: string, giorno?: string): { chiave: string; spilloId: number | null } | null {
  const radice = radiceDelPalazzo(dungeon);
  if (!prepared('SELECT 1 FROM mappa WHERE chiave = ?').get(radice)) return null;
  const palazzi = palazzoDiOgniMappa();
  const destinazioni = prepared("SELECT 1 FROM sqlite_master WHERE name = 'spillo_destinazione'").get()
    ? new Map((prepared('SELECT spillo_id, mappa_chiave FROM spillo_destinazione WHERE mappa_chiave IS NOT NULL').all() as Array<{ spillo_id: number; mappa_chiave: string }>).map((d) => [d.spillo_id, d.mappa_chiave]))
    : new Map<number, string>();
  const spilli = prepared('SELECT id, mappa_chiave, riferimento_tipo, riferimento_chiave, seed_identita_json, condizioni_json FROM spillo WHERE mappa_chiave IS NOT NULL ORDER BY id')
    .all() as Array<{ id: number; mappa_chiave: string; riferimento_tipo: string | null; riferimento_chiave: string | null; seed_identita_json: string | null; condizioni_json: string | null }>;
  const ingressi = spilli.filter((s) => palazzoDiIngresso(s, destinazioni.get(s.id) ?? null, palazzi) === dungeon);
  /** Vero se lo spillo sta su una mappa della città (chiave «citta-…»). */
  const inCitta = (s: { mappa_chiave: string }) => s.mappa_chiave.startsWith('citta-');
  const aperti = giorno ? ingressi.filter((s) => apertoIl(s.condizioni_json, giorno)) : ingressi;
  const ingresso = aperti.find(inCitta) ?? aperti[0] ?? ingressi.find(inCitta) ?? ingressi[0];
  if (ingresso) return { chiave: ingresso.mappa_chiave, spilloId: ingresso.id };
  // la prima planimetria vera (pianta del gioco o illustrazione), nell'ordine che si cambia trascinando nella scheda
  const prima = prepared(`${SQL_SOTTOALBERO}
    SELECT m.chiave FROM mappa m JOIN albero t ON t.chiave = m.chiave
    WHERE m.chiave <> ? AND m.ruolo_immagine IN ('planimetria-nativa', 'illustrazione-editoriale')
    ORDER BY m.ordine, m.chiave LIMIT 1`).get(radice, radice) as { chiave: string } | undefined;
  return { chiave: prima?.chiave ?? radice, spilloId: null };
}

/** Le condizioni di data dello spillo (in cima, cioè in AND) reggono quel giorno? Le altre non si guardano: qui conta solo
 *  scegliere fra più ingressi quello del giorno, non dire se adesso si entra (quello lo dice la mappa). */
function apertoIl(json: string | null, giorno: string): boolean {
  const oggi = ordineGioco(giorno);
  return leggiCondizioniSalvate(json).every((c) => c.tipo === 'data' ? oggi >= ordineGioco(c.dal)
    : c.tipo === 'intervallo' ? oggi >= ordineGioco(c.dal) && oggi <= ordineGioco(c.al) : true);
}

/** La mappa a cui portava lo spillo quando è nato dal seed (`seed_identita_json.riferimento`), se era una mappa. */
function versoDiSeed(json: string | null | undefined): string | null {
  if (!json) return null;
  try {
    const identita = JSON.parse(json) as { riferimento?: { tipo?: string; chiave?: string } | null };
    return identita.riferimento?.tipo === 'mappa' && identita.riferimento.chiave ? identita.riferimento.chiave : null;
  } catch { return null; }
}
