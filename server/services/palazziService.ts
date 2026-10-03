// ============================================================
// palazziService — quando un Palazzo è completato, per la partita (richiesta dell'utente, 2026-09-30)
// ============================================================
//
// «Se un palazzo è completato al 100% bisogna che gli eventi diano quel palazzo come completato a prescindere
// dalla data di scadenza» — Kamoshida al 100%, con l'Ombra di Kamoshida segnata raccolta sulla mappa, il 22
// aprile risultava ancora da completare: la condizione guardava solo il boss fra i punti della Guida.
//
// Un Palazzo è completato da **fatti della partita**, mai dalla data. Basta uno di questi:
// - il **boss finale** segnato nella Guida (ottenuto/esaurito);
// - uno spillo «Boss» **finale** segnato raccolto sulle sue planimetrie;
// - lo spillo «Tesoro del Palazzo» raccolto (si prende a Palazzo finito — suggerimento dell'utente);
// - tutto ciò che c'è da raccogliere preso: il 100% della scheda del Palazzo, con la sua stessa regola.
// Il boss **finale**, non uno qualsiasi: Shido ha Akechi e il Mastino prima dell'Aula magna, Maruki Sumire
// prima della fine (rilievo della revisione). Finale = i boss dell'ultima area, in ordine di guida, che ne ha.
//
// Scelte dell'utente (2026-09-30): il boss finale della Guida **si segna da solo** quando si raccoglie il Tesoro
// o il boss finale sulla mappa, e si toglie se si tolgono (salvo che il Palazzo resti completato per il
// resto); l'ingresso al Palazzo **sparisce** dalla mappa a Palazzo completato. Gli archi restano legati alla data.
// ============================================================

import { getDb, prepared } from '../db/dbService.js';
import { leggiCondizioniSalvate, ordineGioco } from '../../shared/condizioniSpillo.js';
import { voceDelPin, vociGestite } from './mappe/voceDelPin.js';
import { allineaEnigmaDellaVoce } from './mappe/statiGuida.js';
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

/** Il completamento **senza** il boss della Guida: serve anche a decidere se il boss della Guida va tolto. */
function completamentoDallaMappa(spilli: SpilloCollezionabile[], finale: BossFinale | undefined, aree: Map<string, Set<string>>, raccolti: Set<string>, puntiGestiti: Set<string>): string | null {
  // la stessa regola della scheda del Palazzo: raccolto, o collegato a un punto della Guida già gestito
  const preso = (s: SpilloCollezionabile) => (!!s.uid && raccolti.has(s.uid)) || (!!s.voce && puntiGestiti.has(s.voce));
  if (spilli.some((s) => eBossFinale(s, finale, aree) && !!s.uid && raccolti.has(s.uid))) return 'boss finale raccolto sulla mappa';
  if (spilli.some((s) => s.tipo === 'tesoro-palazzo' && !!s.uid && raccolti.has(s.uid))) return 'Tesoro del Palazzo raccolto';
  const presi = spilli.filter(preso).length;
  if (spilli.length > 0 && presi >= spilli.length) return `raccolto tutto (${presi}/${spilli.length})`;
  return null;
}

/** I Palazzi completati nella partita, ognuno col perché. */
export function palazziCompletati(partitaId: number): Map<string, string> {
  const out = new Map<string, string>();
  const finali = bossFinali();
  const puntiGestiti = vociGestite(partitaId);
  for (const [dungeon, f] of finali) if (f.punti.some((p) => puntiGestiti.has(p))) out.set(dungeon, 'boss finale segnato nella Guida');
  const palazzi = palazzoDiOgniMappa();
  const raccolti = new Set((prepared('SELECT spillo_uid FROM spillo_partita WHERE partita_id = ? AND raccolto = 1').all(partitaId) as Array<{ spillo_uid: string }>).map((r) => r.spillo_uid));
  const aree = areeDelleMappe();
  for (const [dungeon, spilli] of collezionabiliPerPalazzo(palazzi)) {
    if (out.has(dungeon)) continue;
    const perche = completamentoDallaMappa(spilli, finali.get(dungeon), aree, raccolti, puntiGestiti);
    if (perche) out.set(dungeon, perche);
  }
  return out;
}

/**
 * Dopo un «raccolto» su uno spillo: se è il Tesoro del Palazzo o il boss finale, il boss finale della Guida
 * lo segue (scelta dell'utente). Raccolto → segnato «ottenuto» (se non lo era già). Tolto → si toglie, ma solo
 * se sulla mappa nient'altro dice che il Palazzo è finito (l'altro fra Tesoro e boss, o il 100%).
 * Va chiamata nella transazione di chi segna il raccolto, dopo la scrittura.
 */
export function allineaBossDellaGuida(partitaId: number, spillo: { tipo: string; mappa_chiave: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null; voce_chiave?: string | null; uid: string | null }, raccolto: boolean, adesso: string): void {
  if (!spillo.mappa_chiave || (spillo.tipo !== 'tesoro-palazzo' && spillo.tipo !== 'boss')) return;
  const palazzi = palazzoDiOgniMappa();
  const dungeon = palazzi.get(spillo.mappa_chiave);
  if (!dungeon) return;
  const finale = bossFinali().get(dungeon);
  if (!finale) return;
  const aree = areeDelleMappe();
  const questo: SpilloCollezionabile = { uid: spillo.uid, tipo: spillo.tipo, mappa: spillo.mappa_chiave, voce: voceDelPin(spillo) };
  if (spillo.tipo === 'boss' && !eBossFinale(questo, finale, aree)) return;
  if (raccolto) {
    // `automatico`: è il raccolto a metterlo, e solo un segno così si toglie togliendo il raccolto (utente 006);
    // uno già segnato dall'utente resta com'è, suo
    for (const p of finale.punti) prepared("INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at, automatico) VALUES (?, ?, 'ottenuto', ?, 1) ON CONFLICT(partita_id, punto_chiave) DO NOTHING").run(partitaId, p, adesso);
    // il boss finale può essere un passo di un Enigma (095): l'Enigma segue i suoi passi
    for (const p of finale.punti) allineaEnigmaDellaVoce(getDb(), partitaId, p, adesso);
    return;
  }
  const raccolti = new Set((prepared('SELECT spillo_uid FROM spillo_partita WHERE partita_id = ? AND raccolto = 1').all(partitaId) as Array<{ spillo_uid: string }>).map((r) => r.spillo_uid));
  // i punti della Guida gestiti, **senza** il boss finale: è proprio lui che si sta decidendo se togliere
  const puntiGestiti = new Set([...vociGestite(partitaId)].filter((p) => !finale.punti.includes(p)));
  const spilli = collezionabiliPerPalazzo(palazzi).get(dungeon) ?? [];
  if (completamentoDallaMappa(spilli, finale, aree, raccolti, puntiGestiti)) return;
  // solo il segno messo dal raccolto: un boss segnato a mano non si perde per un raccolto tolto
  for (const p of finale.punti) prepared('DELETE FROM punto_partita WHERE partita_id = ? AND punto_chiave = ? AND automatico = 1').run(partitaId, p);
  for (const p of finale.punti) allineaEnigmaDellaVoce(getDb(), partitaId, p, adesso);
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
