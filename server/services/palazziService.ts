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
// - il **boss finale** sconfitto: il suo spillo raccolto sulla mappa, o la sua voce segnata nella Guida. Prima il boss bastava
//   da solo, ma si può affrontare più volte dentro un Palazzo (rilievo dell'utente);
// - **tutto il raccolto**: il 100% della scheda del Palazzo, con la sua stessa regola. Da L4 (2026-10-20, «Avanzamento unico») è
//   «tutti gli oggetti permanenti» della guida del Palazzo, con la funzione unica `shared/completamentoGuida.ts`; il Tesoro e il boss
//   finale si leggono con la regola del pin di L4 (§8.11: il suo segno).
// Dal 2026-10-20 (decisione dell'utente, lotti/L4/modifiche.md §8.10) i livelli sono due: **concluso** = Tesoro e boss finale (il
// furto), che governa gli effetti — ingressi, mappa di Tokyo, requisiti e condizioni «Completare il Palazzo» / «dopo il Palazzo di X»
// (`palazziConclusi`) —; **completato** = concluso e tutti gli oggetti permanenti, che vale solo per l'anello, la percentuale e il segno
// «Completato». Nel gioco il Palazzo sparisce dopo il furto e nessuno sblocco dipende dalla raccolta completa (G-026); il boss da
// solo continua a non bastare.
// Il boss **finale**, non uno qualsiasi: Shido ha Akechi e il Mastino prima dell'Aula magna, Maruki Sumire
// prima della fine (rilievo della revisione). Dal 2026-10-20 (L4 §8.14, O4-1 e G-027) è una **voce dichiarata** per Palazzo
// (`dungeon.voce_boss_finale`, migrazione 112, «Modifica › Boss finale» della scheda): fatto quando è fatta quella voce (§8.11: dai suoi
// pin, se ne ha), e nessun altro pin `boss` conta. Prima un'euristica (le voci `boss` dell'ultima infiltrazione, ne bastava una; in un
// Palazzo con boss in una sola infiltrazione qualunque pin `boss`, anche quello del tutorial di Kamoshida). Senza voce dichiarata il
// Palazzo non si conclude. L'euristica è tolta (L11, R11-02b/2): né i Memento (i dedali ammettono solo Persona e Trama, nessun «boss») né
// Iweleth (solo un dedalo, L8 B7) hanno un boss finale da segnare: non si completano e non hanno un anello (la loro riga, se c'è, è senza effetti).
//
// Il boss finale della Guida **non si segna più da solo** raccogliendo il Tesoro o il boss (scelta dell'utente del
// 2026-10-04, «Togli l'automatismo»: il segno automatico del 2026-09-30 faceva risultare il boss sconfitto senza che
// l'utente l'avesse detto; utente 017 toglie quelli rimasti). Restano le scelte del 2026-09-30: l'ingresso al Palazzo
// **sparisce** dalla mappa a Palazzo completato, e gli archi restano legati alla data.
// ============================================================

import { getDb, prepared } from '../db/dbService.js';
import { leggiCondizioniSalvate } from '../../shared/condizioniSpillo.js';
import { copreIlGiorno } from './condizioni/valutatore.js';
import { atterraggioDelGiorno } from './atterraggioPalazziService.js';
import { chiaveMappa, idMappa } from './mappe/percorsiMappe.js';
import { vociDiOgniPin } from './mappe/voceDelPin.js';
import { contaOggetti, modelloAvanzamento, oggettiDelleVoci, statiDellaPartita, statoDelPin, voceFatta, type ModelloAvanzamento, type StatiDellaPartita } from './mappe/statiGuida.js';
import { palazzoCompletato, palazzoConcluso, type CompletamentoPalazzo } from '../../shared/completamentoGuida.js';
import { radiceDelPalazzo, SQL_RADICE_PALAZZO, SQL_SOTTOALBERO } from './mappe/alberoMappe.js';
import { palazzoDiIngresso } from './mappe/ingressoPalazzo.js';
export { palazzoDiIngresso } from './mappe/ingressoPalazzo.js';

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

/** La voce del boss finale dichiarata per ogni Palazzo (`dungeon.voce_boss_finale`, migrazione 112; L4 §8.14); vuota su uno schema
 *  di prima. Un Palazzo senza voce non c'è nella mappa. */
export function vociBossFinale(): Map<string, string> {
  if (!(prepared('PRAGMA main.table_info(dungeon)').all() as Array<{ name: string }>).some((c) => c.name === 'voce_boss_finale')) return new Map();
  return new Map((prepared('SELECT chiave, voce_boss_finale FROM dungeon WHERE voce_boss_finale IS NOT NULL').all() as Array<{ chiave: string; voce_boss_finale: string }>).map((r) => [r.chiave, r.voce_boss_finale]));
}

interface SpilloCollezionabile { id: number; uid: string | null; tipo: string; mappa: string; /** Le voci della guida del pin che si segnano (`vociDiOgniPin(true)`, una o più dalla 098). */ voci: string[] }

/** I collezionabili sulle planimetrie di ogni Palazzo. */
function collezionabiliPerPalazzo(palazzi: Map<string, string>): Map<string, SpilloCollezionabile[]> {
  const colonne = new Set((prepared('PRAGMA main.table_info(spillo)').all() as Array<{ name: string }>).map((c) => c.name));
  const out = new Map<string, SpilloCollezionabile[]>();
  // l'uid c'è dalla 067; le voci che si segnano le legge `vociDiOgniPin`, che si adatta allo schema (098, 094, o il solo riferimento «punto»)
  const righe = prepared(`SELECT id, ${colonne.has('uid') ? 'uid' : 'NULL AS uid'}, tipo, mappa_chiave FROM spillo WHERE collezionabile = 1 AND mappa_chiave IS NOT NULL`).all() as Array<{ id: number; uid: string | null; tipo: string; mappa_chiave: string }>;
  const voci = vociDiOgniPin(true);
  for (const r of righe) {
    const dungeon = palazzi.get(r.mappa_chiave);
    if (!dungeon) continue;
    const elenco = out.get(dungeon) ?? [];
    elenco.push({ id: r.id, uid: r.uid, tipo: r.tipo, mappa: r.mappa_chiave, voci: voci.get(r.id) ?? [] });
    out.set(dungeon, elenco);
  }
  return out;
}

/**
 * Un Palazzo nella partita, sui due livelli del §8.10 (decisione dell'utente del 2026-10-20): `concluso` (Tesoro e boss finale: gli
 * effetti) col perché, o null, e `mancaPerConcludere`; `completato` (concluso e tutti gli oggetti permanenti: anello, percentuale e
 * segno «Completato») col perché, o null, e `manca`. Da L4 anche i numeri della funzione unica (`completamento`). I Memento non hanno
 * una riga (non si completano, R4-30) e Iweleth ne ha una senza effetti.
 */
export interface StatoPalazzo { concluso: string | null; mancaPerConcludere: string | null; completato: string | null; manca: string | null; completamento?: CompletamentoPalazzo;
  /** L4 §8.15: un Palazzo con la regola del boss dei Memento (Iweleth, R8-19b) non entra negli effetti di Palazzo (ingressi, mappa di Tokyo,
   *  requisiti e condizioni): `palazziConclusi` e i semafori lo saltano. */
  senzaEffetti?: true }

/** La regola del boss di ogni dungeon (`dungeon.regola_boss`, migrazione 113): i Palazzi con la regola dei Memento; vuota su uno schema
 *  di prima. */
function palazziColBossDellaGuida(): Set<string> {
  if (!(prepared('PRAGMA main.table_info(dungeon)').all() as Array<{ name: string }>).some((c) => c.name === 'regola_boss')) return new Set();
  return new Set(prepared("SELECT chiave FROM dungeon WHERE tipo = 'palazzo' AND regola_boss = 'memento'").pluck().all() as string[]);
}

/** Il perché di un Palazzo concluso (§8.10). */
export const MOTIVO_CONCLUSO = 'Tesoro e boss finale';

/**
 * Le tre condizioni del completamento di un Palazzo (vedi l'intestazione), tutte insieme, con la funzione unica di L4 (§1.5,
 * `shared/completamentoGuida.ts`): gli **oggetti permanenti** delle voci del Palazzo tutti fatti (ciascuno una volta: prima erano i
 * pin collezionabili, versioni doppie comprese e porte o meccanismi esclusi), il **Tesoro** — il pin `tesoro-palazzo` fatto con la
 * regola del pin (§8.11: il suo segno; segnalazione B), tutti i pin `tesoro-palazzo` del Palazzo — e il **boss finale**: la voce dichiarata
 * (`voceBoss`, §8.14) fatta con la regola del §8.11; senza voce dichiarata il Palazzo non si conclude. Sui due livelli del §8.10
 * (`concluso`, `completato`). Senza partita, i soli numeri del Palazzo.
 */
function valutaPalazzo(dungeon: string, spilli: SpilloCollezionabile[], voceBoss: string | undefined, m: ModelloAvanzamento, s: StatiDellaPartita | null): StatoPalazzo {
  const oggetti = oggettiDelleVoci(m, [...m.voci.values()].filter((v) => v.palazzo === dungeon).map((v) => v.chiave));
  const conto = contaOggetti(oggetti, s);
  const tesori = spilli.filter((x) => x.tipo === 'tesoro-palazzo');
  if (!s) return { concluso: null, mancaPerConcludere: null, completato: null, manca: null, completamento: { ...conto, tesoro: null, boss: null, concluso: null, completato: null } };
  const fattoPin = (x: SpilloCollezionabile) => statoDelPin(m, s, { id: x.id, uid: x.uid }).fatto;
  const tesoro = tesori.length > 0 && tesori.every(fattoPin);
  const boss = !!voceBoss && voceFatta(m, s, voceBoss);
  const completamento: CompletamentoPalazzo = { ...conto, tesoro, boss, concluso: palazzoConcluso({ tesoro, boss }), completato: null };
  completamento.completato = palazzoCompletato(completamento);
  const fatti = conto.fatti ?? 0;
  // che cosa manca al furto (il livello degli effetti) e, in più, alla raccolta (il livello dell'anello)
  const mancaAlFurto = [
    tesori.length === 0 ? 'lo spillo «Tesoro del Palazzo» sulle planimetrie' : !tesoro ? 'il Tesoro del Palazzo raccolto' : null,
    !voceBoss ? 'il boss finale (nessuna voce di boss finale per questo Palazzo)' : !boss ? 'il boss finale sconfitto' : null,
  ].filter((x): x is string => x !== null);
  const mancaAllaRaccolta = conto.oggetti === 0 ? 'le voci permanenti della guida' : fatti < conto.oggetti ? `tutti gli oggetti permanenti (${fatti}/${conto.oggetti})` : null;
  const manca = [...mancaAlFurto, ...(mancaAllaRaccolta ? [mancaAllaRaccolta] : [])];
  return {
    concluso: completamento.concluso ? MOTIVO_CONCLUSO : null,
    mancaPerConcludere: mancaAlFurto.length ? mancaAlFurto.join(', ') : null,
    completato: completamento.completato ? `Tesoro, boss finale e tutti gli oggetti permanenti (${fatti}/${conto.oggetti})` : null,
    manca: completamento.completato ? null : manca.join(', '),
    completamento,
  };
}

/** I Palazzi della partita: completati col perché, o che cosa manca. Senza partita (`partitaId` assente) i soli numeri
 *  dei Palazzi. `m` lo passa chi l'ha già letto. */
export function statoPalazzi(partitaId: number | undefined, m: ModelloAvanzamento = modelloAvanzamento(getDb())): Map<string, StatoPalazzo> {
  const out = new Map<string, StatoPalazzo>();
  const s = partitaId === undefined ? null : statiDellaPartita(getDb(), m, partitaId);
  const tipi =new Map((prepared('SELECT chiave, tipo FROM dungeon').all() as Array<{ chiave: string; tipo: string }>).map((r) => [r.chiave, r.tipo]));
  const palazzi = palazzoDiOgniMappa();
  const collezionabili = collezionabiliPerPalazzo(palazzi);
  const vociBoss = vociBossFinale();
  const colBossDellaGuida = palazziColBossDellaGuida();
  for (const [dungeon, tipo] of tipi) {
    // i Memento non si completano (R4-30): nessuna riga, i lettori che la cercano non trovano niente da concludere
    if (tipo === 'mementos') continue;
    // Iweleth (R8-19b, L8 B7): solo un dedalo; resta la marca tecnica `regola_boss`, senza boss finale, anello né effetti di Palazzo
    if (colBossDellaGuida.has(dungeon)) { out.set(dungeon, { concluso: null, mancaPerConcludere: null, completato: null, manca: null, senzaEffetti: true }); continue; }
    out.set(dungeon, valutaPalazzo(dungeon, collezionabili.get(dungeon) ?? [], vociBoss.get(dungeon), m, s));
  }
  return out;
}

/** I Palazzi completati nella partita (concluso e tutti gli oggetti permanenti: l'anello), ognuno col perché. */
export function palazziCompletati(partitaId: number): Map<string, string> {
  return new Map([...statoPalazzi(partitaId)].flatMap(([k, s]) => (s.completato ? [[k, s.completato] as [string, string]] : [])));
}

/** I Palazzi conclusi nella partita (Tesoro e boss finale: gli effetti, §8.10), ognuno col perché. Li leggono gli ingressi, la mappa
 *  di Tokyo, i requisiti dei Confidenti e le condizioni «Completare il Palazzo» / «dopo il Palazzo di X». */
export function palazziConclusi(partitaId: number): Map<string, string> {
  return new Map([...statoPalazzi(partitaId)].flatMap(([k, s]) => (s.concluso && !s.senzaEffetti ? [[k, s.concluso] as [string, string]] : [])));
}

/**
 * Il Palazzo in cui porta uno spillo che sta **fuori** da quel Palazzo (l'ingresso dalla città, il passaggio
 * da Tokyo): per riferimento a una mappa o per destinazione. `null` se non porta in un Palazzo o se ci sta già dentro.
 *
 * Un ingresso nato dalla sincronizzazione e poi modificato a mano può aver perso il collegamento: il «Palazzo di
 * Kamoshida» sulla Shujin oggi è un punto sensibile senza riferimento, ma la sua identità di seed dice ancora che
 * era il passaggio verso `dungeon-kamoshida` (rilievo della revisione). Senza collegamento vale quella.
 */

/**
 * Dove si entra in un Palazzo (o nei Memento), per «Sulla mappa» di una voce collegata al dungeon (scelta dell'utente,
 * 2026-10-01: «Ingresso in città»). La radice `dungeon-<k>` non ha planimetria, e aprirla mostrava l'elenco nudo
 * delle stanze. Si cerca lo spillo che da fuori porta dentro, con la stessa regola che a Palazzo completato lo blocca
 * (`palazzoDiIngresso`: riferimento, destinazione, identità di seed). Fra più ingressi vince quello aperto nel giorno
 * della voce (le sue condizioni di data: la Shujin ha l'ingresso del solo 11 aprile e quello dal 12 aprile al 2 maggio),
 * poi quello in città, poi il primo. Se il dungeon non ha ingresso sulle mappe, la prima planimetria del Palazzo in
 * ordine logico (quello della scheda del Palazzo); se non ha nemmeno quella, la radice. `null` se il dungeon non ha mappe.
 * Con `ripiego: false` (il Diario per i dungeon che non sono di tipo Palazzo, `destinazioneDellaVoce`) niente prima planimetria né
 * radice: solo uno spillo d'ingresso vero, altrimenti `null`.
 */
export function ingressoDelPalazzo(dungeon: string, giorno?: string, opzioni: { ripiego?: boolean } = {}): { chiave: string; spilloId: number | null } | null {
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
  if (opzioni.ripiego === false) return null;
  // la prima planimetria vera (pianta del gioco o illustrazione), nell'ordine che si cambia trascinando nella scheda
  const prima = prepared(`${SQL_SOTTOALBERO}
    SELECT m.chiave FROM mappa m JOIN albero t ON t.chiave = m.chiave
    WHERE m.chiave <> ? AND m.ruolo_immagine IN ('planimetria-nativa', 'illustrazione-editoriale')
    ORDER BY m.ordine, m.chiave LIMIT 1`).get(radice, radice) as { chiave: string } | undefined;
  return { chiave: prima?.chiave ?? radice, spilloId: null };
}

/**
 * L6 (§4.4, R6-17): dove porta un Palazzo un dato giorno, una regola sola per metro, cartellino del diario e campo `mappa` della voce: la
 * regola d'atterraggio del giorno (`dungeon_atterraggio`, `atterraggioDelGiorno`) se c'è, altrimenti l'ingresso (`ingressoDelPalazzo`).
 * La chiave è quella interna della mappa (come `ingressoDelPalazzo`); null se il Palazzo non ha mappe.
 */
export function destinazionePalazzo(dungeon: string, giorno?: string | null): { chiave: string; spilloId: number | null } | null {
  const atterraggio = atterraggioDelGiorno(dungeon, giorno ?? null);
  if (atterraggio) return { chiave: idMappa(atterraggio.mappa), spilloId: atterraggio.spillo };
  return ingressoDelPalazzo(dungeon, giorno ?? undefined);
}

/**
 * Dove porta «Sulla mappa» di una voce del Diario collegata a un dungeon (o a una richiesta, che porta ai Memento). Per un dungeon di
 * tipo Palazzo la destinazione unica (`destinazionePalazzo`, la stessa della metro e del cartellino). 2026-10-30 («Memento - aree fisse —
 * Strutture che i Memento riusano si può rimuovere»): per un dungeon di altro tipo (i Memento, i cui piani si generano a ogni discesa:
 * le strutture fisse che riusano non sono un posto dove si arriva) vale solo una destinazione vera — la regola d'atterraggio del giorno
 * o uno spillo d'ingresso —, mai il ripiego sulla prima planimetria; senza, `null` e la voce non mostra «Sulla mappa». La regola è il
 * tipo del dungeon, non il nome delle planimetrie.
 */
export function destinazioneDellaVoce(dungeon: string, giorno?: string | null): { chiave: string; spilloId: number | null } | null {
  const d = prepared('SELECT tipo FROM dungeon WHERE chiave = ?').get(dungeon) as { tipo: string } | undefined;
  if (d?.tipo === 'palazzo') return destinazionePalazzo(dungeon, giorno);
  const atterraggio = atterraggioDelGiorno(dungeon, giorno ?? null);
  if (atterraggio) return { chiave: idMappa(atterraggio.mappa), spilloId: atterraggio.spillo };
  return ingressoDelPalazzo(dungeon, giorno ?? undefined, { ripiego: false });
}

/** La stessa destinazione nella forma del campo `atterraggio` (metro, cartellino del diario): la chiave pubblica della mappa e il pin. */
export function atterraggioDelPalazzo(dungeon: string, giorno?: string | null): { mappa: string; spillo: number | null } | null {
  const d = destinazionePalazzo(dungeon, giorno);
  return d ? { mappa: chiaveMappa(d.chiave), spillo: d.spilloId } : null;
}

/** Le condizioni temporali dello spillo, anche annidate, reggono quel giorno? Le altre restano indeterminate: qui conta solo
 *  scegliere fra più ingressi quello del giorno, non dire se adesso si entra (quello lo dice la mappa). */
function apertoIl(json: string | null, giorno: string): boolean {
  // L6: la stessa lettura delle date del valutatore unico (`copreIlGiorno`)
  return copreIlGiorno(leggiCondizioniSalvate(json), giorno);
}
