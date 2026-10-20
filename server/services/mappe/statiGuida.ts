// ============================================================
// Gli stati delle voci della guida: i pin di una voce e l'Enigma con i suoi passi (2026-10-01, 095)
// ============================================================
//
// Senza dipendenze dai servizi: lo usano la guida (`dungeonService`), le mappe (`mappeService`, `collegamentiGuida`) e i
// Palazzi (`palazziService`, il boss finale), e nessuno di loro deve richiamarsi in cerchio.
// ============================================================

import type { AppDatabase } from '../../db/dbService.js';
import { puntoDescrittivo, sqlVoceDescrittiva } from '../../../shared/spilli.js';
import type { EffettiDelGestoDto, StatoPunto, VoceDelGestoDto } from '../../../shared/types.js';
import { carattereDellaVoce, type CarattereVoce } from '../../../shared/caratteriVoce.js';
import { areaCompletata, infiltrazioneCompletata, type ConteggioOggetti } from '../../../shared/completamentoGuida.js';
import { VOCI_GESTITE_SQL } from './voceDelPin.js';

// ---- L4 «Avanzamento unico» (lotti/L4/modifiche.md §0-§1, rivisti dal §8.11 «NR4-1», 2026-10-20): il modello di lettura ----
//
// **Ogni pin tiene il suo stato** (`spillo_partita`, come prima di L4): l'utente segna gli oggetti uno a uno, e raccogliere un pin non
// deve segnare gli altri pin della stessa voce (NR4-1: «Raccogli e depreda le Installazioni Artistiche», 8 pin). Un'eccezione: un pin
// condiviso da voci **rigenerabili di più infiltrazioni** ha uno stato per infiltrazione (`spillo_partita_infiltrazione`, utente 023),
// letto nell'infiltrazione di contesto (§1.4), perché l'oggetto raccolto nella 2ª si ripropone nella 4ª (R4-05).
// Una voce permanente o rigenerabile **con pin** calcola il suo stato dai suoi pin (`statoVoce`): fatta se lo sono tutti, «in corso
// k/N» se una parte, da fare se nessuno (una rigenerabile legge i pin condivisi nella **sua** infiltrazione). La sua riga in
// `punto_partita` resta come **specchio**, scritta nello stesso gesto (`rifaiSpecchio`: c'è se e solo se la voce è fatta, con il tipo
// di stato scelto — «esaurito» — o «ottenuto»), così diario, Enigmi, condizioni, pacchetto ed export restano coerenti.
// Le voci senza pin, le «Storia» (che tengono il segno e non contano) e le voci dei dedali dei Memento (senza carattere, R4-30) hanno
// il loro stato in `punto_partita`, come prima; i pin delle sole voci senza carattere seguono la regola di prima.
// L'**oggetto** permanente (le voci permanenti unite da pin in comune, §1.3) resta l'unità di conteggio (R4-24): è fatto quando lo
// sono tutte le sue voci; non propaga più lo stato, perché lo fa il pin condiviso.
// Le divergenze conservate dalla migrazione utente 022 (`divergenza_partita`) tengono il chip «Da verificare» sul pin fatto e sulla
// voce (ora «in corso»), finché l'utente non sceglie «Segna la voce» o «Togli il fatto al pin».
// Si calcola in blocco, una volta per richiesta: `modelloAvanzamento` (dati di gioco) e `statiDellaPartita` (stati della partita).

/** Una voce della guida per il modello: carattere effettivo, infiltrazione, Palazzo e se ha uno stato. */
export interface VoceDelModello {
  chiave: string; carattere: CarattereVoce | null; infiltrazione: string; palazzo: string;
  /** «Altro» fuori dai dedali: si legge e basta, nessuno stato (`puntoDescrittivo`). */
  senzaStato: boolean; esauribile: boolean; tipo: string; nome: string; ordine: number;
}
/** Le voci di un pin, divise come le legge il modello. */
export interface VociDelPinModello {
  /** Permanenti e rigenerabili: decidono lo stato del pin. */
  contano: string[];
  /** Senza carattere ma con uno stato (dedali dei Memento, Persona): la regola di prima, se il pin non ne ha che contano. */
  altre: string[];
  /** Racconto (anche «Altro»): non decidono niente. */
  descrittive: string[];
}
/** Un'infiltrazione nel modello. */
export interface InfiltrazioneDelModello { chiave: string; nome: string; palazzo: string; ordine: number }
/** I dati di gioco che decidono gli stati: voci, oggetti permanenti, voci dei pin, infiltrazioni. */
export interface ModelloAvanzamento {
  voci: Map<string, VoceDelModello>;
  /** Voce permanente → chiave dell'oggetto (la chiave minima delle sue voci). */
  oggetto: Map<string, string>;
  /** Chiave dell'oggetto → le sue voci, in ordine di chiave. */
  vociOggetto: Map<string, string[]>;
  /** Pin (id) → le sue voci; i pin senza voci non ci sono. */
  pin: Map<number, VociDelPinModello>;
  /** Uid → id dei pin. */
  idDelPin: Map<string, number>;
  infiltrazioni: Map<string, InfiltrazioneDelModello>;
  /** Palazzo → le sue infiltrazioni, in ordine. */
  infiltrazioniDelPalazzo: Map<string, string[]>;
  /** §8.11: voce → i suoi pin delle planimetrie (con uid), in ordine di id. Le schede della guida senza mappa non ci sono. */
  pinDellaVoce: Map<string, Array<{ id: number; uid: string }>>;
  /** §8.11: i pin condivisi da voci rigenerabili di più infiltrazioni → quelle infiltrazioni, in ordine (stato per infiltrazione). */
  condivisi: Map<number, string[]>;
}

/** Vero se la colonna c'è (le migrazioni e i test possono trovare lo schema di prima). */
function colonna(db: AppDatabase, tabella: string, nome: string): boolean {
  return (db.prepare(`PRAGMA main.table_info(${tabella})`).all() as Array<{ name: string }>).some((c) => c.name === nome);
}

/**
 * Il modello di lettura (dati di gioco), in blocco: le voci con il carattere effettivo, gli oggetti permanenti (componenti connesse
 * del grafo voci permanenti ↔ pin, per Palazzo: `oggettiPermanenti` di §1.3), le voci di ogni pin (`spillo_voce` e il riferimento
 * «punto» dello strato di prima), le infiltrazioni in ordine.
 */
export function modelloAvanzamento(db: AppDatabase): ModelloAvanzamento {
  const conCarattere = colonna(db, 'punto_interesse', 'carattere');
  const conDedalo = colonna(db, 'punto_interesse', 'area_dedalo_chiave');
  const voci = new Map<string, VoceDelModello>();
  for (const r of db.prepare(`SELECT p.chiave, p.tipo, p.nome, p.ordine, p.esauribile, p.area_chiave, a.dungeon_chiave, ${conDedalo ? 'p.area_dedalo_chiave' : 'NULL AS area_dedalo_chiave'}, ${conCarattere ? 'p.carattere' : 'NULL AS carattere'}
    FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave`).all() as Array<{ chiave: string; tipo: string; nome: string; ordine: number; esauribile: number; area_chiave: string; dungeon_chiave: string; area_dedalo_chiave: string | null; carattere: string | null }>) {
    voci.set(r.chiave, {
      chiave: r.chiave, carattere: carattereDellaVoce({ tipo: r.tipo, areaDedalo: r.area_dedalo_chiave, carattere: r.carattere }), infiltrazione: r.area_chiave, palazzo: r.dungeon_chiave,
      senzaStato: puntoDescrittivo(r.tipo, r.area_dedalo_chiave), esauribile: r.esauribile === 1, tipo: r.tipo, nome: r.nome, ordine: r.ordine,
    });
  }
  const infiltrazioni = new Map<string, InfiltrazioneDelModello>();
  const infiltrazioniDelPalazzo = new Map<string, string[]>();
  for (const r of db.prepare('SELECT chiave, nome, dungeon_chiave, ordine FROM dungeon_area ORDER BY dungeon_chiave, ordine, chiave').all() as Array<{ chiave: string; nome: string; dungeon_chiave: string; ordine: number }>) {
    infiltrazioni.set(r.chiave, { chiave: r.chiave, nome: r.nome, palazzo: r.dungeon_chiave, ordine: r.ordine });
    (infiltrazioniDelPalazzo.get(r.dungeon_chiave) ?? infiltrazioniDelPalazzo.set(r.dungeon_chiave, []).get(r.dungeon_chiave)!).push(r.chiave);
  }
  const conTabella = !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'spillo_voce'").get();
  const conUid = colonna(db, 'spillo', 'uid');
  const legami = db.prepare(`SELECT DISTINCT v.id, v.voce, s.mappa_chiave AS mappa, ${conUid ? 's.uid' : 'NULL'} AS uid FROM (${conTabella ? 'SELECT spillo_id AS id, voce_chiave AS voce FROM spillo_voce UNION ' : ''}
    SELECT id, riferimento_chiave FROM spillo WHERE riferimento_tipo = 'punto' AND riferimento_chiave IS NOT NULL) v JOIN spillo s ON s.id = v.id ORDER BY 1, 2`).all() as Array<{ id: number; voce: string; mappa: string | null; uid: string | null }>;
  const pin = new Map<number, VociDelPinModello>();
  // §8.11: i pin di ogni voce (delle planimetrie, con uid) e le infiltrazioni delle rigenerabili di ogni pin
  const pinDellaVoce = new Map<string, Array<{ id: number; uid: string }>>();
  const infiltrazioniRigenerabili = new Map<number, Set<string>>();
  for (const l of legami) {
    const v = voci.get(l.voce);
    if (!v || !l.mappa || !l.uid) continue;
    (pinDellaVoce.get(l.voce) ?? pinDellaVoce.set(l.voce, []).get(l.voce)!).push({ id: l.id, uid: l.uid });
    if (v.carattere === 'rigenerabile') (infiltrazioniRigenerabili.get(l.id) ?? infiltrazioniRigenerabili.set(l.id, new Set()).get(l.id)!).add(v.infiltrazione);
  }
  // unione e ricerca sui nodi «voce» e «pin del Palazzo»: le voci permanenti con un pin in comune sono lo stesso oggetto
  const padre = new Map<string, string>();
  const radice = (x: string): string => { let r = x; while (padre.get(r) !== r) r = padre.get(r)!; let y = x; while (y !== r) { const p = padre.get(y)!; padre.set(y, r); y = p; } return r; };
  const nodo = (n: string) => { if (!padre.has(n)) padre.set(n, n); return n; };
  const unisci = (a: string, b: string) => { const ra = radice(nodo(a)), rb = radice(nodo(b)); if (ra !== rb) { if (ra < rb) padre.set(rb, ra); else padre.set(ra, rb); } };
  for (const v of voci.values()) if (v.carattere === 'permanente') nodo(`v:${v.chiave}`);
  for (const l of legami) {
    const v = voci.get(l.voce);
    if (!v) continue;
    const p = pin.get(l.id) ?? { contano: [], altre: [], descrittive: [] };
    if (v.carattere === 'permanente' || v.carattere === 'rigenerabile') p.contano.push(l.voce);
    else if (v.carattere === null && !v.senzaStato) p.altre.push(l.voce);
    else p.descrittive.push(l.voce);
    pin.set(l.id, p);
    if (v.carattere === 'permanente') unisci(`v:${l.voce}`, `p:${v.palazzo}:${l.id}`);
  }
  // la chiave dell'oggetto: la chiave minima delle sue voci (stabile finché le voci restano)
  const perRadice = new Map<string, string[]>();
  for (const v of voci.values()) if (v.carattere === 'permanente') (perRadice.get(radice(`v:${v.chiave}`)) ?? perRadice.set(radice(`v:${v.chiave}`), []).get(radice(`v:${v.chiave}`))!).push(v.chiave);
  const oggetto = new Map<string, string>();
  const vociOggetto = new Map<string, string[]>();
  for (const elenco of perRadice.values()) {
    elenco.sort();
    vociOggetto.set(elenco[0], elenco);
    for (const k of elenco) oggetto.set(k, elenco[0]);
  }
  const idDelPin = new Map<string, number>();
  if (conUid) for (const r of db.prepare('SELECT id, uid FROM spillo WHERE uid IS NOT NULL').all() as Array<{ id: number; uid: string }>) idDelPin.set(r.uid, r.id);
  const condivisi = new Map<number, string[]>();
  for (const [id, inf] of infiltrazioniRigenerabili) {
    if (inf.size > 1) condivisi.set(id, [...inf].sort((a, b) => (infiltrazioni.get(a)?.ordine ?? 0) - (infiltrazioni.get(b)?.ordine ?? 0) || a.localeCompare(b)));
  }
  return { voci, oggetto, vociOggetto, pin, idDelPin, infiltrazioni, infiltrazioniDelPalazzo, pinDellaVoce, condivisi };
}

/** §8.11: la voce calcola il suo stato dai suoi pin? Sì per una permanente o rigenerabile con almeno un pin sulle planimetrie. */
export function voceDaiPin(m: ModelloAvanzamento, voce: string): boolean {
  const v = m.voci.get(voce);
  return !!v && !v.senzaStato && (v.carattere === 'permanente' || v.carattere === 'rigenerabile') && (m.pinDellaVoce.get(voce)?.length ?? 0) > 0;
}

/** Lo stato di una voce nella partita (§8.11): fatta o no, con quale tipo di stato, e quanti dei suoi pin sono fatti (`totale` 0 =
 *  voce senza pin, con lo stato in `punto_partita`). «In corso» = `0 < fatti < totale`. */
export interface StatoVoce { fatta: boolean; stato: StatoPunto | null; fatti: number; totale: number }

/** Gli stati di una partita, letti una volta: le voci segnate, i pin col loro segno (anche per infiltrazione), le divergenze conservate
 *  e, calcolati, lo stato di ogni voce e gli oggetti fatti. */
export interface StatiDellaPartita {
  partita: number;
  /** Le righe di `punto_partita` (per le voci con pin, lo specchio). */
  segnate: Map<string, StatoPunto>;
  /** Gli uid dei pin con `spillo_partita.raccolto = 1`. */
  raccolti: Set<string>;
  /** I pin condivisi dai rigenerabili: uid → le infiltrazioni in cui sono raccolti (`spillo_partita_infiltrazione`, utente 023). */
  raccoltiPerInfiltrazione: Map<string, Set<string>>;
  /** Le divergenze conservate (utente 022): uid del pin → voci. */
  divergenze: Map<string, string[]>;
  /** Lo stato di ogni voce (`statoVoce`). */
  voci: Map<string, StatoVoce>;
  /** Gli oggetti permanenti fatti: tutte le loro voci fatte (§8.11 punto 5). */
  oggettiFatti: Set<string>;
}

/** La tabella delle divergenze conservate (utente 022) c'è? */
export function conDivergenze(db: AppDatabase): boolean {
  return !!db.prepare("SELECT 1 FROM pragma_database_list WHERE name = 'utente'").get()
    && !!db.prepare("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = 'divergenza_partita'").get();
}

/** La tabella dello stato per infiltrazione dei pin condivisi (utente 023) c'è? */
export function conStatoPerInfiltrazione(db: AppDatabase): boolean {
  return !!db.prepare("SELECT 1 FROM pragma_database_list WHERE name = 'utente'").get()
    && !!db.prepare("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = 'spillo_partita_infiltrazione'").get();
}

/** Legge gli stati di una partita nel modello e calcola lo stato di ogni voce e gli oggetti fatti. */
export function statiDellaPartita(db: AppDatabase, m: ModelloAvanzamento, partita: number): StatiDellaPartita {
  const segnate = new Map((db.prepare('SELECT punto_chiave, stato FROM punto_partita WHERE partita_id = ?').all(partita) as Array<{ punto_chiave: string; stato: StatoPunto }>).map((r) => [r.punto_chiave, r.stato]));
  const raccolti = new Set(db.prepare('SELECT spillo_uid FROM spillo_partita WHERE partita_id = ? AND raccolto = 1').pluck().all(partita) as string[]);
  const raccoltiPerInfiltrazione = new Map<string, Set<string>>();
  if (conStatoPerInfiltrazione(db)) {
    for (const r of db.prepare('SELECT spillo_uid, infiltrazione_chiave FROM spillo_partita_infiltrazione WHERE partita_id = ? AND raccolto = 1').all(partita) as Array<{ spillo_uid: string; infiltrazione_chiave: string }>) {
      (raccoltiPerInfiltrazione.get(r.spillo_uid) ?? raccoltiPerInfiltrazione.set(r.spillo_uid, new Set()).get(r.spillo_uid)!).add(r.infiltrazione_chiave);
    }
  }
  const divergenze = new Map<string, string[]>();
  if (conDivergenze(db)) {
    for (const r of db.prepare('SELECT spillo_uid, voce_chiave FROM divergenza_partita WHERE partita_id = ? ORDER BY spillo_uid, voce_chiave').all(partita) as Array<{ spillo_uid: string; voce_chiave: string }>) {
      (divergenze.get(r.spillo_uid) ?? divergenze.set(r.spillo_uid, []).get(r.spillo_uid)!).push(r.voce_chiave);
    }
  }
  const s: StatiDellaPartita = { partita, segnate, raccolti, raccoltiPerInfiltrazione, divergenze, voci: new Map(), oggettiFatti: new Set() };
  for (const k of m.voci.keys()) s.voci.set(k, statoVoce(m, s, k));
  for (const [oggetto, voci] of m.vociOggetto) if (voci.every((k) => s.voci.get(k)?.fatta)) s.oggettiFatti.add(oggetto);
  return s;
}

/**
 * L'infiltrazione in cui una voce legge (e scrive) il segno di un pin condiviso dai rigenerabili (§8.11, con la regola del §1.4): la
 * sua, se il pin ne ha una rigenerabile lì (sempre, per una rigenerabile); altrimenti — una permanente sullo stesso pin — la più recente
 * prima della sua, o la prima. Null se il pin non è condiviso (il segno è uno solo).
 */
export function infiltrazioneDelPinPerLaVoce(m: ModelloAvanzamento, pinId: number, infiltrazione: string): string | null {
  const elenco = m.condivisi.get(pinId);
  if (!elenco) return null;
  if (elenco.includes(infiltrazione)) return infiltrazione;
  const ordine = m.infiltrazioni.get(infiltrazione)?.ordine ?? 0;
  const prima = elenco.filter((i) => (m.infiltrazioni.get(i)?.ordine ?? 0) < ordine);
  return prima.length ? prima[prima.length - 1] : elenco[0];
}

/** Il segno di un pin letto per una voce (§8.11): nell'infiltrazione della voce se il pin è condiviso dai rigenerabili
 *  (`infiltrazioneDelPinPerLaVoce`), altrimenti il suo. */
export function pinFattoPerLaVoce(m: ModelloAvanzamento, s: Pick<StatiDellaPartita, 'raccolti' | 'raccoltiPerInfiltrazione'>, pin: { id: number; uid: string }, infiltrazione: string): boolean {
  const nel = infiltrazioneDelPinPerLaVoce(m, pin.id, infiltrazione);
  return nel ? !!s.raccoltiPerInfiltrazione.get(pin.uid)?.has(nel) : s.raccolti.has(pin.uid);
}

/** Un «esaurito» rimasto su una voce dei Palazzi che non è più esauribile si legge «ottenuto» (§3.3: la riga non si riscrive). */
function statoLetto(v: VoceDelModello, stato: StatoPunto): StatoPunto {
  return stato === 'esaurito' && !v.esauribile && v.carattere !== null ? 'ottenuto' : stato;
}

/**
 * Lo stato di una voce (§8.11, funzione unica): una permanente o rigenerabile con pin è **fatta** se tutti i suoi pin sono fatti (una
 * rigenerabile legge i pin condivisi nella sua infiltrazione), **in corso k/N** se una parte, **da fare** se nessuno; fatta, ha il tipo
 * di stato del suo specchio (`punto_partita`), o «ottenuto». Le altre voci (senza pin, «Storia», dedali dei Memento) hanno il loro
 * stato in `punto_partita`. Una voce senza stato («Altro» fuori dai dedali) non è mai fatta.
 */
export function statoVoce(m: ModelloAvanzamento, s: Pick<StatiDellaPartita, 'segnate' | 'raccolti' | 'raccoltiPerInfiltrazione'>, voce: string): StatoVoce {
  const v = m.voci.get(voce);
  if (!v || v.senzaStato) return { fatta: false, stato: null, fatti: 0, totale: 0 };
  const riga = s.segnate.get(voce) ?? null;
  if (!voceDaiPin(m, voce)) return { fatta: riga !== null, stato: riga === null ? null : statoLetto(v, riga), fatti: 0, totale: 0 };
  const pin = m.pinDellaVoce.get(voce)!;
  const fatti = pin.filter((p) => pinFattoPerLaVoce(m, s, p, v.infiltrazione)).length;
  const fatta = fatti === pin.length;
  return { fatta, stato: fatta ? statoLetto(v, riga ?? 'ottenuto') : null, fatti, totale: pin.length };
}

/** Una voce è fatta nella partita (`statoVoce`). */
export function voceFatta(m: ModelloAvanzamento, s: StatiDellaPartita, voce: string): boolean {
  return (s.voci.get(voce) ?? statoVoce(m, s, voce)).fatta;
}

/** Lo stato con cui una voce risulta fatta (`statoVoce`); null se non è fatta. */
export function statoDellaVoce(m: ModelloAvanzamento, s: StatiDellaPartita, voce: string): StatoPunto | null {
  return (s.voci.get(voce) ?? statoVoce(m, s, voce)).stato;
}

/** Le voci fatte nella partita (la regola di `voceFatta`), escluse quelle senza stato: la base delle condizioni «Voce della guida». */
export function vociFatte(m: ModelloAvanzamento, s: StatiDellaPartita): Set<string> {
  const out = new Set<string>();
  for (const k of m.voci.keys()) if (voceFatta(m, s, k)) out.add(k);
  return out;
}

/** Gli oggetti permanenti di un insieme di voci (chiavi distinte), ciascuno una volta (R4-24). */
export function oggettiDelleVoci(m: ModelloAvanzamento, voci: Iterable<string>): Set<string> {
  const out = new Set<string>();
  for (const k of voci) { const o = m.oggetto.get(k); if (o) out.add(o); }
  return out;
}

/** Conta gli oggetti (e, con la partita, quelli fatti; null senza). */
export function contaOggetti(oggetti: ReadonlySet<string>, s: StatiDellaPartita | null | undefined): ConteggioOggetti {
  return { oggetti: oggetti.size, fatti: s ? [...oggetti].filter((o) => s.oggettiFatti.has(o)).length : null };
}

/** Gli oggetti permanenti con almeno un pin su ogni mappa data (mappa interna → oggetti): il conto di una planimetria o di un'Area. */
export function oggettiDelleMappe(db: AppDatabase, m: ModelloAvanzamento, mappe: readonly string[]): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  if (mappe.length === 0) return out;
  for (const r of db.prepare(`SELECT id, mappa_chiave FROM spillo WHERE mappa_chiave IN (${mappe.map(() => '?').join(',')})`).all(...mappe) as Array<{ id: number; mappa_chiave: string }>) {
    const voci = m.pin.get(r.id);
    if (!voci) continue;
    const oggetti = oggettiDelleVoci(m, voci.contano);
    if (oggetti.size === 0) continue;
    const insieme = out.get(r.mappa_chiave) ?? new Set<string>();
    for (const o of oggetti) insieme.add(o);
    out.set(r.mappa_chiave, insieme);
  }
  return out;
}

/** Il completamento di una planimetria o di un'Area (oggetti permanenti con un pin lì; senza niente da contare completata). */
export function completamentoDegliOggetti(oggetti: ReadonlySet<string>, s: StatiDellaPartita | null | undefined): { oggetti: number; fatti: number | null; completata: boolean | null } {
  const conto = contaOggetti(oggetti, s);
  return { ...conto, completata: areaCompletata(conto) };
}

/** Le voci di un'infiltrazione (dati di gioco). */
export function vociDellInfiltrazione(m: ModelloAvanzamento, infiltrazione: string): string[] {
  return [...m.voci.values()].filter((v) => v.infiltrazione === infiltrazione).map((v) => v.chiave);
}

/**
 * L'infiltrazione in corso di un Palazzo nella partita (§1.4 punto 2, regola di L3 §4.4): la prima, in ordine, non completata (con la
 * regola unica: oggetti permanenti delle sue voci tutti fatti; senza niente da contare non è mai completata); se lo sono tutte,
 * l'ultima. Null per un Palazzo senza infiltrazioni.
 */
export function infiltrazioneInCorso(m: ModelloAvanzamento, s: StatiDellaPartita, palazzo: string): string | null {
  const elenco = m.infiltrazioniDelPalazzo.get(palazzo) ?? [];
  for (const i of elenco) if (!infiltrazioneCompletata(contaOggetti(oggettiDelleVoci(m, vociDellInfiltrazione(m, i)), s))) return i;
  return elenco[elenco.length - 1] ?? null;
}

/** Lo stato di un pin nella partita (§8.11): fatto, «da verificare», stato proprio (pin senza voci che contano), e l'infiltrazione a
 *  cui si riferisce (pin di rigenerabili). */
export interface StatoDelPin { fatto: boolean; daVerificare: boolean; statoProprio: boolean; contesto: string | null }

/**
 * Lo stato di un pin (§8.11): il suo segno (`spillo_partita`). Un pin condiviso da rigenerabili di più infiltrazioni legge il segno
 * dell'infiltrazione di contesto (§1.4) — la guardata (`contesto`), altrimenti quella in corso; se il pin non ne ha in
 * quell'infiltrazione, quella più recente prima; se nemmeno, la prima. Una divergenza conservata (utente 022) lo mostra «da
 * verificare». I pin delle sole voci senza carattere (dedali dei Memento) con la regola di prima: il segno, o le voci tutte segnate.
 */
export function statoDelPin(m: ModelloAvanzamento, s: StatiDellaPartita, pin: { id: number; uid: string | null }, contesto?: string | null): StatoDelPin {
  const voci = m.pin.get(pin.id);
  const proprio = !!pin.uid && s.raccolti.has(pin.uid);
  if (!voci || voci.contano.length === 0) {
    if (voci && voci.altre.length > 0) return { fatto: proprio || voci.altre.every((v) => s.segnate.has(v)), daVerificare: false, statoProprio: false, contesto: null };
    return { fatto: proprio, daVerificare: false, statoProprio: true, contesto: null };
  }
  const rigenerabili = voci.contano.filter((v) => m.voci.get(v)!.carattere === 'rigenerabile');
  const scelta = infiltrazioneDelPin(m, s, rigenerabili, contesto);
  const fatto = m.condivisi.has(pin.id) ? !!pin.uid && !!scelta && !!s.raccoltiPerInfiltrazione.get(pin.uid)?.has(scelta) : proprio;
  return { fatto, daVerificare: fatto && !!pin.uid && s.divergenze.has(pin.uid), statoProprio: false, contesto: scelta };
}

/** L'infiltrazione delle rigenerabili di un pin che decide il suo stato (§1.4), o null se il pin non ne ha. */
export function infiltrazioneDelPin(m: ModelloAvanzamento, s: StatiDellaPartita | null, rigenerabili: readonly string[], contesto?: string | null): string | null {
  if (rigenerabili.length === 0) return null;
  const sue = [...new Set(rigenerabili.map((v) => m.voci.get(v)!.infiltrazione))].sort((a, b) => (m.infiltrazioni.get(a)?.ordine ?? 0) - (m.infiltrazioni.get(b)?.ordine ?? 0) || a.localeCompare(b));
  if (sue.length === 1) return sue[0];
  const palazzo = m.voci.get(rigenerabili[0])!.palazzo;
  const ctx = contesto && m.infiltrazioni.get(contesto)?.palazzo === palazzo ? contesto : s ? infiltrazioneInCorso(m, s, palazzo) : null;
  if (ctx && sue.includes(ctx)) return ctx;
  const ordineCtx = ctx ? m.infiltrazioni.get(ctx)?.ordine ?? null : null;
  if (ordineCtx !== null) {
    const prima = sue.filter((i) => (m.infiltrazioni.get(i)?.ordine ?? 0) < ordineCtx);
    if (prima.length) return prima[prima.length - 1];
  }
  return sue[0];
}

/** Le voci che leggono il segno di un pin (§8.11): tutte quelle che contano; di un pin condiviso, nell'infiltrazione data, le
 *  permanenti e le rigenerabili di quell'infiltrazione. */
export function vociDelPinNellInfiltrazione(m: ModelloAvanzamento, pinId: number, infiltrazione: string | null): string[] {
  const voci = m.pin.get(pinId);
  if (!voci) return [];
  if (!m.condivisi.has(pinId) || infiltrazione === null) return [...voci.contano];
  return voci.contano.filter((v) => infiltrazioneDelPinPerLaVoce(m, pinId, m.voci.get(v)!.infiltrazione) === infiltrazione);
}

/** Le altre voci che condividono un pin con la voce (§8.11): quelle che un suo gesto può segnare o riaprire («Segnate anche: …»,
 *  «Riapre anche: …»). Dei pin condivisi, quelle che ne leggono il segno nella stessa infiltrazione. */
export function vociCheCondividonoIPin(m: ModelloAvanzamento, voce: string): string[] {
  const v = m.voci.get(voce);
  if (!v || !voceDaiPin(m, voce)) return [];
  const out = new Set<string>();
  for (const p of m.pinDellaVoce.get(voce)!) {
    for (const k of vociDelPinNellInfiltrazione(m, p.id, infiltrazioneDelPinPerLaVoce(m, p.id, v.infiltrazione))) if (k !== voce && voceDaiPin(m, k)) out.add(k);
  }
  return [...out];
}

/** I pin (sulle planimetrie, non gli elementi della guida senza mappa) collegati a un punto (`spillo_voce`, 098). */
export function pinDelPuntoGuida(db: AppDatabase, punto: string): Array<{ id: number; uid: string }> {
  return db.prepare(`SELECT s.id, s.uid FROM spillo_voce sv JOIN spillo s ON s.id = sv.spillo_id
    WHERE sv.voce_chiave = ? AND s.mappa_chiave IS NOT NULL AND s.uid IS NOT NULL ORDER BY s.id`).all(punto) as Array<{ id: number; uid: string }>;
}

/** Quante voci da segnare ha un pin (`spillo_voce`, 098; una descrittiva non conta: non ha stato). */
export function quanteVociDelPin(db: AppDatabase, spilloId: number): number {
  return db.prepare(`SELECT COUNT(*) FROM spillo_voce sv JOIN punto_interesse pi ON pi.chiave = sv.voce_chiave WHERE sv.spillo_id = ? AND NOT ${sqlVoceDescrittiva('pi')}`)
    .pluck().get(spilloId) as number;
}

/**
 * In una partita il «raccolto» di un pin con delle voci segue le sue voci (scelta dell'utente, 2026-10-09: «Voci indipendenti»):
 * fatto quando quelle che si segnano sono **tutte** gestite, altrimenti no. Un pin senza voci da segnare non si tocca: il suo
 * stato è solo suo (una voce descrittiva non ha stato).
 */
export function allineaRaccoltoDelPin(db: AppDatabase, partita: number, pin: { id: number; uid: string }, adesso: string): void {
  const voci = db.prepare(`SELECT sv.voce_chiave FROM spillo_voce sv JOIN punto_interesse pi ON pi.chiave = sv.voce_chiave WHERE sv.spillo_id = ? AND NOT ${sqlVoceDescrittiva('pi')}`)
    .pluck().all(pin.id) as string[];
  if (voci.length === 0) return;
  const gestite = new Set(db.prepare(VOCI_GESTITE_SQL).pluck().all(partita) as string[]);
  const fatto = voci.every((v) => gestite.has(v));
  // si scrive solo se il «raccolto» cambia (L3, andata e ritorno identica del pacchetto: prima un import riscriveva `updated_at` di
  // centinaia di stati uguali, lotti/L1/noreg.md §5)
  db.prepare(`INSERT INTO spillo_partita (partita_id, spillo_uid, raccolto, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(partita_id, spillo_uid) DO UPDATE SET raccolto = excluded.raccolto, updated_at = excluded.updated_at
    WHERE spillo_partita.raccolto IS NOT excluded.raccolto`).run(partita, pin.uid, fatto ? 1 : 0, adesso);
}

// ---- L'Enigma e i suoi passi (095, scelte dell'utente del 2026-10-01) ----
//
// «Enigma deve diventare un contenitore di sotto elementi che insieme descrivono l'enigma e come sbloccarlo»: i passi sono voci
// vere della stessa area (`punto_interesse.contenitore_chiave`), di qualunque tipo, coi loro pin; l'Enigma è risolto quando i
// passi che si segnano sono tutti fatti — lo stato dell'Enigma, in `punto_partita` come per ogni voce, segue i passi —, e
// segnarlo segna i passi. Un Enigma senza passi da segnare (nessuno, o solo voci descrittive) si segna da sé, come prima.

/** Le partite (e il loro file) ci sono? Senza `utente` attaccato, chi allinea gli stati non fa niente. */
function conPartite(db: AppDatabase): boolean {
  if (!db.prepare("SELECT 1 FROM pragma_database_list WHERE name = 'utente'").get()) return false;
  const tabelle = new Set((db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>).map((r) => r.name));
  return tabelle.has('punto_partita') && tabelle.has('spillo_partita') && tabelle.has('partita');
}

/** I passi di un Enigma, nel loro ordine. */
export function passiDi(db: AppDatabase, enigma: string): Array<{ chiave: string; tipo: string; nome: string; area_dedalo_chiave: string | null }> {
  return db.prepare('SELECT chiave, tipo, nome, area_dedalo_chiave FROM punto_interesse WHERE contenitore_chiave = ? ORDER BY ordine, chiave').all(enigma) as Array<{ chiave: string; tipo: string; nome: string; area_dedalo_chiave: string | null }>;
}

/** I passi che si segnano (le voci descrittive si leggono e basta): sono loro a risolvere l'Enigma. */
export function passiDaSegnare(db: AppDatabase, enigma: string): string[] {
  return passiDi(db, enigma).filter((p) => !puntoDescrittivo(p.tipo, p.area_dedalo_chiave)).map((p) => p.chiave);
}

/** L'Enigma di cui una voce è un passo, o null. */
export function enigmaDi(db: AppDatabase, voce: string): string | null {
  return (db.prepare('SELECT contenitore_chiave FROM punto_interesse WHERE chiave = ?').get(voce) as { contenitore_chiave: string | null } | undefined)?.contenitore_chiave ?? null;
}

/** Le altre voci che un gesto ha segnato o riaperto (§8.11): «Segnate anche: …», «Riapre anche: …». */
export interface EffettiDelGesto { segnate: string[]; riaperte: string[] }

/** Una voce per l'interfaccia (§8.11): chiave, nome e infiltrazione. */
export function voceDelGestoDto(m: ModelloAvanzamento, voce: string): VoceDelGestoDto {
  const v = m.voci.get(voce);
  const inf = v ? m.infiltrazioni.get(v.infiltrazione) : undefined;
  return { chiave: voce, nome: v?.nome ?? voce, infiltrazione: { chiave: v?.infiltrazione ?? '', nome: inf?.nome ?? v?.infiltrazione ?? '' } };
}

/** Gli effetti di un gesto per l'interfaccia (`EffettiDelGestoDto`), con nomi e infiltrazioni dal modello di adesso. */
export function effettiDelGestoDto(db: AppDatabase, e: EffettiDelGesto): EffettiDelGestoDto {
  const m = modelloAvanzamento(db);
  return { segnate: e.segnate.map((k) => voceDelGestoDto(m, k)), riaperte: e.riaperte.map((k) => voceDelGestoDto(m, k)) };
}

/**
 * Scrive il segno di un pin in una partita (§8.11): nella riga della sua infiltrazione (`spillo_partita_infiltrazione`) se il pin è
 * condiviso dai rigenerabili e l'infiltrazione è data, altrimenti in `spillo_partita`. Si scrive solo se il segno cambia (L3, andata e
 * ritorno identica del pacchetto); togliere il segno non crea righe nuove. Vero se ha scritto.
 */
export function scriviSegnoDelPin(db: AppDatabase, partita: number, uid: string, infiltrazione: string | null, raccolto: boolean, adesso: string): boolean {
  if (infiltrazione !== null && conStatoPerInfiltrazione(db)) {
    return (raccolto
      ? db.prepare(`INSERT INTO spillo_partita_infiltrazione (partita_id, spillo_uid, infiltrazione_chiave, raccolto, updated_at) VALUES (?, ?, ?, 1, ?)
          ON CONFLICT(partita_id, spillo_uid, infiltrazione_chiave) DO UPDATE SET raccolto = 1, updated_at = excluded.updated_at WHERE spillo_partita_infiltrazione.raccolto IS NOT 1`).run(partita, uid, infiltrazione, adesso)
      : db.prepare('DELETE FROM spillo_partita_infiltrazione WHERE partita_id = ? AND spillo_uid = ? AND infiltrazione_chiave = ?').run(partita, uid, infiltrazione)).changes > 0;
  }
  return (raccolto
    ? db.prepare(`INSERT INTO spillo_partita (partita_id, spillo_uid, raccolto, updated_at) VALUES (?, ?, 1, ?)
        ON CONFLICT(partita_id, spillo_uid) DO UPDATE SET raccolto = 1, updated_at = excluded.updated_at WHERE spillo_partita.raccolto IS NOT 1`).run(partita, uid, adesso)
    : db.prepare('UPDATE spillo_partita SET raccolto = 0, updated_at = ? WHERE partita_id = ? AND spillo_uid = ? AND raccolto = 1').run(adesso, partita, uid)).changes > 0;
}

/**
 * Rifà lo specchio delle voci con pin (§8.11 punto 2): la riga di `punto_partita` c'è se e solo se la voce è fatta (`statoVoce`), con il
 * tipo di stato scelto dal gesto (`scelte`), quello che aveva, o «ottenuto» quando si completa raccogliendo l'ultimo pin. Senza `voci`,
 * tutte le voci con pin (import, cestino, cambi dei legami). Le voci che cambiano portano con sé i loro Enigmi. Restituisce le voci
 * diventate fatte e quelle riaperte.
 */
export function rifaiSpecchio(db: AppDatabase, partita: number, voci: Iterable<string> | null, adesso: string, scelte?: ReadonlyMap<string, StatoPunto>): EffettiDelGesto {
  const m = modelloAvanzamento(db);
  const s = statiDellaPartita(db, m, partita);
  const effetti: EffettiDelGesto = { segnate: [], riaperte: [] };
  const cambiate: string[] = [];
  for (const voce of new Set(voci ?? m.voci.keys())) {
    if (!voceDaiPin(m, voce)) continue;
    const sv = s.voci.get(voce)!;
    const riga = s.segnate.get(voce);
    if (sv.fatta) {
      const voluto = scelte?.get(voce) ?? riga ?? 'ottenuto';
      // segnato dall'utente: automatico = 0 (utente 006; dal 2026-10-04 nessuno scrive più 1)
      if (riga === undefined) {
        db.prepare('INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at, automatico) VALUES (?, ?, ?, ?, 0)').run(partita, voce, voluto, adesso);
        effetti.segnate.push(voce); cambiate.push(voce);
      } else if (riga !== voluto) db.prepare('UPDATE punto_partita SET stato = ?, updated_at = ?, automatico = 0 WHERE partita_id = ? AND punto_chiave = ?').run(voluto, adesso, partita, voce);
    } else if (riga !== undefined) {
      db.prepare('DELETE FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').run(partita, voce);
      effetti.riaperte.push(voce); cambiate.push(voce);
    }
  }
  for (const k of cambiate) allineaEnigmaDellaVoce(db, partita, k, adesso);
  return effetti;
}

/**
 * Scrive lo stato di una voce in una partita (§8.11 punto 4, gesto **sulla voce**):
 * - con pin: «Segna» (o «Esaurito») segna **tutti i suoi pin** (i condivisi nella sua infiltrazione), «Riapri» toglie il segno a tutti;
 *   lo specchio della voce e quello delle altre voci di quei pin si rifanno (le altre possono diventare fatte, o riaprirsi: `effetti`);
 * - senza pin (e le «Storia», i dedali dei Memento): la sua riga, come prima; i pin delle sole voci senza carattere seguono (R4-30).
 * Le divergenze conservate che il gesto risolve se ne vanno.
 */
export function scriviStatoVoce(db: AppDatabase, partita: number, voce: string, stato: StatoPunto | null, adesso: string): EffettiDelGesto {
  const m = modelloAvanzamento(db);
  const v = m.voci.get(voce);
  if (v && voceDaiPin(m, voce)) {
    const toccate = new Set<string>([voce]);
    for (const p of m.pinDellaVoce.get(voce)!) {
      const nel = infiltrazioneDelPinPerLaVoce(m, p.id, v.infiltrazione);
      scriviSegnoDelPin(db, partita, p.uid, nel, stato !== null, adesso);
      for (const k of vociDelPinNellInfiltrazione(m, p.id, nel)) toccate.add(k);
    }
    const effetti = rifaiSpecchio(db, partita, toccate, adesso, stato ? new Map([[voce, stato]]) : undefined);
    pulisciDivergenzeRisolte(db, partita);
    return { segnate: effetti.segnate.filter((k) => k !== voce), riaperte: effetti.riaperte.filter((k) => k !== voce) };
  }
  if (stato === null) db.prepare('DELETE FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').run(partita, voce);
  // segnato dall'utente: automatico = 0 (utente 006; dal 2026-10-04 nessuno scrive più 1, e utente 017 ha tolto quelli rimasti)
  else db.prepare('INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, punto_chiave) DO UPDATE SET stato = excluded.stato, updated_at = excluded.updated_at, automatico = 0').run(partita, voce, stato, adesso);
  for (const pin of pinDelPuntoGuida(db, voce)) {
    const p = m.pin.get(pin.id);
    if (p && p.contano.length === 0 && p.altre.length > 0) allineaRaccoltoDelPin(db, partita, pin, adesso);
  }
  if (stato !== null) pulisciDivergenzeRisolte(db, partita);
  return { segnate: [], riaperte: [] };
}

/**
 * Il gesto **sul pin** (§8.11 punto 4) per un pin con voci che contano: segna o toglie **solo quel pin** (un pin condiviso dai
 * rigenerabili nell'infiltrazione di contesto, `contesto` o quella in corso) e le voci che ne leggono il segno si ricalcolano (k/N): una
 * che si completa diventa fatta, e togliere il segno toglie «fatta» a ogni voce che lo contiene, «esaurito» compreso (R4-11, scelta
 * dell'utente del 2026-10-09). Togliere il segno a un pin «da verificare» vale come «Togli il fatto al pin» (§8.5).
 */
export function segnaIlPin(db: AppDatabase, partita: number, pin: { id: number; uid: string }, raccolto: boolean, contesto: string | null, adesso: string): EffettiDelGesto {
  const m = modelloAvanzamento(db);
  const s = statiDellaPartita(db, m, partita);
  const voci = m.pin.get(pin.id);
  const rigenerabili = (voci?.contano ?? []).filter((v) => m.voci.get(v)!.carattere === 'rigenerabile');
  const nel = m.condivisi.has(pin.id) ? infiltrazioneDelPin(m, s, rigenerabili, contesto) : null;
  scriviSegnoDelPin(db, partita, pin.uid, nel, raccolto, adesso);
  if (!raccolto && conDivergenze(db)) db.prepare('DELETE FROM divergenza_partita WHERE partita_id = ? AND spillo_uid = ?').run(partita, pin.uid);
  const effetti = rifaiSpecchio(db, partita, vociDelPinNellInfiltrazione(m, pin.id, nel), adesso);
  pulisciDivergenzeRisolte(db, partita);
  return effetti;
}

/** Le divergenze conservate di una partita che non lo sono più: la voce è fatta, o il pin non ha più il suo segno. Si tolgono. */
export function pulisciDivergenzeRisolte(db: AppDatabase, partita: number): void {
  if (!conDivergenze(db)) return;
  const righe = db.prepare('SELECT spillo_uid, voce_chiave FROM divergenza_partita WHERE partita_id = ?').all(partita) as Array<{ spillo_uid: string; voce_chiave: string }>;
  if (righe.length === 0) return;
  const m = modelloAvanzamento(db);
  const s = statiDellaPartita(db, m, partita);
  for (const r of righe) if (!s.raccolti.has(r.spillo_uid) || voceFatta(m, s, r.voce_chiave)) {
    db.prepare('DELETE FROM divergenza_partita WHERE partita_id = ? AND spillo_uid = ? AND voce_chiave = ?').run(partita, r.spillo_uid, r.voce_chiave);
  }
}

/**
 * Dopo un cambio dei dati di gioco che tocca i legami fra pin e voci (collegare, scollegare, copiare, spostare o eliminare una voce,
 * cambiarne il carattere, eliminare un pin, importare le mappe) e dopo l'import o il cestino delle partite (§8.11 punto 2): in ogni
 * partita
 * 1. un pin che **cambia forma** — diventa condiviso dai rigenerabili di più infiltrazioni, smette di esserlo, o cambia infiltrazioni —
 *    porta il suo segno nella forma nuova, letto com'era in ogni infiltrazione (`mPrima`: il modello di prima del cambio), così niente
 *    cambia a vista; la riga che la forma nuova non legge più si toglie (per un pin che resta condiviso) o resta (L11, `spillo_partita`);
 * 2. un pin **nuovo** di una voce che era fatta (collegato, creato già della voce, importato) prende il segno, nell'infiltrazione in cui
 *    la voce lo legge: la voce resta fatta, come prima di L4 («un punto già segnato segna i suoi pin»); un pin già segnato collegato a
 *    una voce i cui pin sono così tutti fatti la rende fatta (lo specchio, qui sotto);
 * 3. lo specchio delle voci con pin si rifà (`rifaiSpecchio`), e le divergenze risolte se ne vanno.
 * Un pin che resta senza voci che contano tiene il segno che aveva (§8.3: lo ha già, non si scrive niente). Senza le partite non fa niente.
 */
export function riallineaStati(db: AppDatabase, mPrima: ModelloAvanzamento | null, adesso: string): void {
  if (!conPartite(db)) return;
  const partite = db.prepare('SELECT id FROM partita ORDER BY id').pluck().all() as number[];
  if (mPrima) {
    const mDopo = modelloAvanzamento(db);
    // le letture di prima, per tutte le partite, prima di scrivere
    const prima = new Map(partite.map((p) => [p, statiDellaPartita(db, mPrima, p)]));
    if (conStatoPerInfiltrazione(db)) riportaLaFormaDeiPin(db, mPrima, mDopo, partite, prima, adesso);
    // i pin nuovi delle voci che erano fatte; per una voce che prima non leggeva i pin (senza carattere che conta: il carattere cambiato
    // a mano, «Racconto» → «Permanente») tutti i suoi pin sono nuovi, così il cambio di carattere non perde il segno (§6.3)
    for (const [voce, pin] of mDopo.pinDellaVoce) {
      if (!voceDaiPin(mDopo, voce)) continue;
      // per uid: un pin reimportato con lo stesso uid (e un id nuovo) è lo stesso pin
      const vecchi = new Set(voceDaiPin(mPrima, voce) ? (mPrima.pinDellaVoce.get(voce) ?? []).map((p) => p.uid) : []);
      const nuovi = pin.filter((p) => !vecchi.has(p.uid));
      if (nuovi.length === 0) continue;
      const infiltrazione = mDopo.voci.get(voce)!.infiltrazione;
      for (const partita of partite) {
        if (!prima.get(partita)!.voci.get(voce)?.fatta) continue;
        for (const p of nuovi) scriviSegnoDelPin(db, partita, p.uid, infiltrazioneDelPinPerLaVoce(mDopo, p.id, infiltrazione), true, adesso);
      }
    }
  }
  for (const partita of partite) {
    rifaiSpecchio(db, partita, null, adesso);
    pulisciDivergenzeRisolte(db, partita);
  }
}

/** Le infiltrazioni delle voci rigenerabili di un pin, distinte. */
function infiltrazioniRigenerabiliDelPin(m: ModelloAvanzamento, id: number): string[] {
  return [...new Set((m.pin.get(id)?.contano ?? []).filter((v) => m.voci.get(v)!.carattere === 'rigenerabile').map((v) => m.voci.get(v)!.infiltrazione))];
}

/** Il passo 1 di `riallineaStati`: i pin che cambiano forma (condivisi o no dai rigenerabili, o con altre infiltrazioni) portano il
 *  loro segno nella forma nuova, letto com'era (`prima`) in ogni infiltrazione. */
function riportaLaFormaDeiPin(db: AppDatabase, mPrima: ModelloAvanzamento, mDopo: ModelloAvanzamento, partite: readonly number[], prima: ReadonlyMap<number, StatiDellaPartita>, adesso: string): void {
  const forma = (m: ModelloAvanzamento, id: number) => JSON.stringify(m.condivisi.get(id) ?? null);
  const cambiati = [...new Set([...mPrima.condivisi.keys(), ...mDopo.condivisi.keys()])].filter((id) => forma(mPrima, id) !== forma(mDopo, id));
  if (cambiati.length === 0) return;
  const uidDi = new Map([...mPrima.idDelPin, ...mDopo.idDelPin].map(([uid, id]) => [id, uid]));
  for (const partita of partite) {
    const s = prima.get(partita)!;
    for (const id of cambiati) {
      const uid = uidDi.get(id);
      if (!uid) continue;
      const letto = (inf: string | null) => statoDelPin(mPrima, s, { id, uid }, inf).fatto;
      const nuove = mDopo.condivisi.get(id);
      if (nuove) {
        // un'infiltrazione che il pin prima non aveva fra le sue rigenerabili parte da fare: l'oggetto si ripropone (R4-05; la copia di
        // una voce in un'altra infiltrazione «parte da fare», scelta dell'utente del 2026-10-18); se prima non ne aveva nessuna, il
        // segno vale in tutte, come si vedeva
        const vecchie = infiltrazioniRigenerabiliDelPin(mPrima, id);
        for (const inf of nuove) scriviSegnoDelPin(db, partita, uid, inf, (vecchie.length === 0 || vecchie.includes(inf)) && letto(inf), adesso);
        db.prepare(`DELETE FROM spillo_partita_infiltrazione WHERE partita_id = ? AND spillo_uid = ? AND infiltrazione_chiave NOT IN (${nuove.map(() => '?').join(',')})`).run(partita, uid, ...nuove);
      } else {
        // non più condiviso: il segno nell'infiltrazione delle sue rigenerabili (se ne ha), altrimenti in quella di contesto
        const rigenerabili = (mDopo.pin.get(id)?.contano ?? []).filter((v) => mDopo.voci.get(v)!.carattere === 'rigenerabile');
        scriviSegnoDelPin(db, partita, uid, null, letto(rigenerabili.length ? mDopo.voci.get(rigenerabili[0])!.infiltrazione : null), adesso);
        db.prepare('DELETE FROM spillo_partita_infiltrazione WHERE partita_id = ? AND spillo_uid = ?').run(partita, uid);
      }
    }
  }
}

/**
 * «Togli il fatto al pin» (L4, §3.2): il segno del pin (`spillo_partita.raccolto`, e le righe per infiltrazione di un pin condiviso) si
 * toglie e le sue divergenze conservate se ne vanno; le voci che ne leggevano il segno si ricalcolano (§8.11: una voce fatta si
 * riapre). Vero se c'era qualcosa da togliere.
 */
export function togliIlFattoAlPin(db: AppDatabase, partita: number, uid: string, adesso: string): boolean {
  const divergenze = conDivergenze(db) ? db.prepare('DELETE FROM divergenza_partita WHERE partita_id = ? AND spillo_uid = ?').run(partita, uid).changes : 0;
  const segno = db.prepare('UPDATE spillo_partita SET raccolto = 0, updated_at = ? WHERE partita_id = ? AND spillo_uid = ? AND raccolto = 1').run(adesso, partita, uid).changes
    + (conStatoPerInfiltrazione(db) ? db.prepare('DELETE FROM spillo_partita_infiltrazione WHERE partita_id = ? AND spillo_uid = ?').run(partita, uid).changes : 0);
  const m = modelloAvanzamento(db);
  const id = m.idDelPin.get(uid);
  if (id !== undefined) rifaiSpecchio(db, partita, m.pin.get(id)?.contano ?? [], adesso);
  return divergenze + segno > 0;
}

/** In una partita lo stato dell'Enigma segue i suoi passi: tutti fatti (con la regola di L4 §8.11: un passo con pin è fatto quando lo
 *  sono tutti i suoi pin) → risolto («ottenuto», o lo stato che aveva già), altrimenti aperto. */
export function allineaEnigma(db: AppDatabase, partita: number, enigma: string, adesso: string): void {
  const passi = passiDaSegnare(db, enigma);
  if (passi.length === 0) return;
  const segnato = db.prepare('SELECT 1 FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?');
  const m = modelloAvanzamento(db);
  const s = statiDellaPartita(db, m, partita);
  const risolto = passi.every((p) => voceFatta(m, s, p));
  const statoEnigma = !!segnato.get(partita, enigma);
  if (risolto && !statoEnigma) db.prepare("INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at, automatico) VALUES (?, ?, 'ottenuto', ?, 0)").run(partita, enigma, adesso);
  else if (!risolto && statoEnigma) db.prepare('DELETE FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').run(partita, enigma);
}

/** Dopo lo stato di una voce cambiato in una partita: se è un passo, il suo Enigma lo segue. */
export function allineaEnigmaDellaVoce(db: AppDatabase, partita: number, voce: string, adesso: string): void {
  const enigma = enigmaDi(db, voce);
  if (enigma) allineaEnigma(db, partita, enigma, adesso);
}

/**
 * Quando cambiano i passi di un Enigma (un passo aggiunto, tolto, spostato dentro o fuori, cambiato di tipo), in ogni partita il
 * suo stato segue i passi: un passo nuovo ancora da fare riapre un Enigma risolto (scelta dell'utente, 2026-10-02: «l'Enigma si
 * riapre» — i progressi non cambiano da soli), un passo tolto può risolverlo. Nessun passo viene segnato da qui.
 */
export function allineaEnigmaInOgniPartita(db: AppDatabase, enigma: string, adesso: string): void {
  if (!conPartite(db)) return;
  for (const { id: partita } of db.prepare('SELECT id FROM partita').all() as Array<{ id: number }>) allineaEnigma(db, partita, enigma, adesso);
}

/**
 * Segnare o riaprire un Enigma porta con sé i suoi passi: segnato, i passi ancora da fare diventano «ottenuto» — quelli già
 * segnati restano come sono (un passo «esaurito» non torna «ottenuto», un segno automatico non diventa manuale: rilievo del
 * validatore) —; riaperto, i passi si riaprono tutti. Con i loro pin.
 */
export function segnaPassiDellEnigma(db: AppDatabase, partita: number, enigma: string, stato: StatoPunto | null, adesso: string): void {
  const segnato = db.prepare('SELECT 1 FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?');
  for (const p of passiDaSegnare(db, enigma)) {
    if (stato === null) scriviStatoVoce(db, partita, p, null, adesso);
    else if (!segnato.get(partita, p)) scriviStatoVoce(db, partita, p, 'ottenuto', adesso);
  }
}
