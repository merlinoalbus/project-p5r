// ============================================================
// pezziMappa — i pezzi delle planimetrie: zone dell'immagine scelte dall'utente, cancellate e posate altrove con condizioni (102),
// in una o più copie (103)
// ============================================================
//
// Richiesta dell'utente (2026-10-14): selezionare col mouse i pezzi che nelle planimetrie del gioco sono disegnati a parte (parti
// mobili, come i muri in fondo al Museo 2P di Madarame), toglierli dalla vista ordinaria e posarli nel punto giusto della mappa,
// della stessa dimensione, con le condizioni dei pin che decidono quando si vedono. «devo poter selezionare io aree da gestire
// come pezzi»: le zone le sceglie l'utente nell'editor, qui non si riconosce niente da sé.
// Dal 2026-10-15 (103): «vorrei poter usare un pezzo una volta recuperato e definito per inserirlo più volte nella mappa». Il pezzo
// è il **ritaglio** (`pezzo_mappa`: zona e nome, la zona sempre cancellata); le **copie** (`copia_pezzo`) sono le sue pose, ognuna
// con posizione, rotazione, specchio, etichetta e condizioni proprie. Scelte dell'utente: condizioni per copia; eliminata
// l'ultima copia se ne va il ritaglio (la zona torna visibile); nome del ritaglio più etichetta facoltativa della copia.
// Tutto in pixel dell'immagine; chi chiama passa la mappa (chiave interna) e le sue dimensioni (`mappeService`).
// ============================================================

import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { LIMITI_GUIDA } from '../../../shared/limitiGuida.js';
import { getDb, nowIso, prepared } from '../../db/dbService.js';
import { httpErrors } from '../../utils/httpError.js';
import { descriviRequisitoSpillo, leggiCondizioniSalvate, normalizzaCondizioniSpillo, type NomiCondizioni, type RequisitoSpillo } from '../../../shared/condizioniSpillo.js';
import { valutaRequisitiSpillo, type StatoDisponibilita } from '../disponibilitaService.js';
import type { CopiaPezzoDto, DatiAggiornaCopiaPezzo, DatiCopiaPezzo, DatiNuovoPezzoMappa, DatiPezzoMappa, PezzoMappaDto, PezzoPacchetto, RotazionePezzo } from '../../../shared/types.js';
import { ingombroPezzo } from '../../../shared/pezziMappa.js';

/** Il ritaglio (102, senza la posa dalla 103). */
export interface RigaPezzo {
  id: number; uid: string; mappa_chiave: string; nome: string;
  sorgente_x: number; sorgente_y: number; larghezza: number; altezza: number; ordine: number; updated_at: string;
}

/** Una copia posata di un ritaglio (103). */
export interface RigaCopia {
  id: number; uid: string; pezzo_id: number; etichetta: string; x: number; y: number;
  rotazione: RotazionePezzo; specchio_orizzontale: number; specchio_verticale: number;
  condizioni_json: string | null; ordine: number; updated_at: string;
}

/** Un intero di pixel dell'immagine (le planimetrie arrivano a 2048: il tetto lascia margine alle immagini caricate). */
const pixel = z.number().int().min(0).max(20000);
const dimensione = z.number().int().min(1).max(20000);
/** Le forme di un pezzo: zona d'origine, posizione, rotazione e specchio (le usano le rotte, `schemas/mappe.ts`, e il pacchetto). */
export const schemaSorgentePezzo = z.object({ x: pixel, y: pixel, larghezza: dimensione, altezza: dimensione });
export const schemaPosizionePezzo = z.object({ x: pixel, y: pixel });
export const schemaRotazionePezzo = z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]);
export const schemaSpecchioPezzo = z.object({ orizzontale: z.boolean(), verticale: z.boolean() });
/** Il massimo delle copie di un ritaglio (un pacchetto rovinato non deve riempire il file di gioco). */
export const MASSIMO_COPIE = 200;

const ordinePacchetto = z.number().int().min(0).max(9999);
const condizioniPacchetto = z.array(z.unknown()).max(20).optional();
const copiaPacchetto = z.object({
  uid: z.string().max(64).optional(), etichetta: z.string().max(LIMITI_GUIDA.spillo.nome).optional(), posizione: schemaPosizionePezzo,
  rotazione: schemaRotazionePezzo, specchio: schemaSpecchioPezzo, condizioni: condizioniPacchetto, ordine: ordinePacchetto,
});
/** Il pezzo della 103: il ritaglio con le sue copie (almeno una). */
const pezzoPacchetto = z.object({
  uid: z.string().max(64).optional(), nome: z.string().max(LIMITI_GUIDA.spillo.nome), sorgente: schemaSorgentePezzo, ordine: ordinePacchetto,
  copie: z.array(copiaPacchetto).min(1).max(MASSIMO_COPIE),
});
/** Il pezzo della 102 (la posa accanto alla zona): si legge come un ritaglio con una copia, senza uid (l'uid era del pezzo). */
const pezzoPacchetto102 = z.object({
  uid: z.string().max(64).optional(), nome: z.string().max(LIMITI_GUIDA.spillo.nome), sorgente: schemaSorgentePezzo, posizione: schemaPosizionePezzo,
  rotazione: schemaRotazionePezzo, specchio: schemaSpecchioPezzo, condizioni: condizioniPacchetto, ordine: ordinePacchetto,
}).transform((p) => ({ uid: p.uid, nome: p.nome, sorgente: p.sorgente, ordine: p.ordine, copie: [{ posizione: p.posizione, rotazione: p.rotazione, specchio: p.specchio, condizioni: p.condizioni, ordine: 0 }] }));
/** I pezzi di una mappa in un pacchetto delle mappe: la forma (della 103, o della 102); le condizioni si ripuliscono all'importazione
 *  come quelle dei pin. Un oggetto con `copie` è della 103; senza, con la posa accanto alla zona, della 102. */
export const schemaPezziPacchetto = z.array(z.union([pezzoPacchetto, pezzoPacchetto102])).max(500);
/** Un pezzo del pacchetto già letto (forma della 103), con le condizioni ripulite da chi chiama. */
export type PezzoDaImportare = Omit<z.infer<typeof pezzoPacchetto>, 'copie'> & { copie: Array<Omit<z.infer<typeof copiaPacchetto>, 'condizioni'> & { condizioni?: RequisitoSpillo[] }> };

/** Le dimensioni dell'immagine della mappa, in pixel. */
export interface DimensioniMappa { larghezza: number; altezza: number }

/** Le tabelle ci sono dalla 102 e dalla 103: nei test e nei file di prima possono mancare (con la sola 102 i pezzi non si leggono). */
export function conPezzi(): boolean {
  return !!prepared("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'copia_pezzo'").get();
}

/** La copia per l'API: con lo stato della partita (`st`) porta l'esito delle condizioni, come i pin. */
export function copiaDto(r: RigaCopia, nomi: NomiCondizioni, st?: StatoDisponibilita | null): CopiaPezzoDto {
  const condizioni = leggiCondizioniSalvate(r.condizioni_json).map((c) => ({ ...c, testo: descriviRequisitoSpillo(c, nomi) }));
  return {
    id: r.id, uid: r.uid, pezzoId: r.pezzo_id, etichetta: r.etichetta,
    posizione: { x: r.x, y: r.y }, rotazione: r.rotazione,
    specchio: { orizzontale: r.specchio_orizzontale === 1, verticale: r.specchio_verticale === 1 },
    condizioni, ...(st ? { disponibilita: valutaRequisitiSpillo(condizioni, st, nomi) } : {}),
    ordine: r.ordine, updatedAt: r.updated_at,
  };
}

/** Il ritaglio per l'API, con le sue copie (ognuna, con la partita, con l'esito delle sue condizioni). */
export function pezzoDto(r: RigaPezzo, copie: readonly RigaCopia[], nomi: NomiCondizioni, st?: StatoDisponibilita | null): PezzoMappaDto {
  return {
    id: r.id, uid: r.uid, nome: r.nome,
    sorgente: { x: r.sorgente_x, y: r.sorgente_y, larghezza: r.larghezza, altezza: r.altezza },
    ordine: r.ordine, updatedAt: r.updated_at,
    copie: copie.map((c) => copiaDto(c, nomi, st)),
  };
}

/** I ritagli di una mappa, nel loro ordine. */
export function righePezzi(mappa: string): RigaPezzo[] {
  if (!conPezzi()) return [];
  return prepared('SELECT * FROM pezzo_mappa WHERE mappa_chiave = ? ORDER BY ordine, id').all(mappa) as RigaPezzo[];
}

/** Le copie di un ritaglio, nel loro ordine. */
export function righeCopie(pezzo: number): RigaCopia[] {
  return prepared('SELECT * FROM copia_pezzo WHERE pezzo_id = ? ORDER BY ordine, id').all(pezzo) as RigaCopia[];
}

/** I ritagli di una mappa con le loro copie, nel loro ordine (due letture, non una per pezzo). */
function righeConCopie(mappa: string): Array<{ pezzo: RigaPezzo; copie: RigaCopia[] }> {
  const pezzi = righePezzi(mappa);
  if (pezzi.length === 0) return [];
  const copie = new Map<number, RigaCopia[]>();
  for (const c of prepared('SELECT c.* FROM copia_pezzo c JOIN pezzo_mappa p ON p.id = c.pezzo_id WHERE p.mappa_chiave = ? ORDER BY c.ordine, c.id').all(mappa) as RigaCopia[]) {
    const elenco = copie.get(c.pezzo_id);
    if (elenco) elenco.push(c); else copie.set(c.pezzo_id, [c]);
  }
  return pezzi.map((pezzo) => ({ pezzo, copie: copie.get(pezzo.id) ?? [] }));
}

/** I pezzi di una mappa per l'API, con le copie. */
export function pezziDellaMappa(mappa: string, nomi: NomiCondizioni, st?: StatoDisponibilita | null): PezzoMappaDto[] {
  return righeConCopie(mappa).map(({ pezzo, copie }) => pezzoDto(pezzo, copie, nomi, st));
}

/** La riga di un ritaglio; 404 se non c'è. */
export function rigaPezzo(id: number): RigaPezzo {
  const r = conPezzi() ? prepared('SELECT * FROM pezzo_mappa WHERE id = ?').get(id) as RigaPezzo | undefined : undefined;
  if (!r) throw httpErrors.notFound('pezzo-non-trovato', `Il pezzo ${id} non esiste.`);
  return r;
}

/** La riga di una copia; 404 se non c'è. */
export function rigaCopia(id: number): RigaCopia {
  const r = conPezzi() ? prepared('SELECT * FROM copia_pezzo WHERE id = ?').get(id) as RigaCopia | undefined : undefined;
  if (!r) throw httpErrors.notFound('copia-non-trovata', `La copia ${id} non esiste.`);
  return r;
}

type Sorgente = { x: number; y: number; larghezza: number; altezza: number };
type Posa = { posizione: { x: number; y: number }; rotazione: RotazionePezzo };

/** La zona d'origine dentro l'immagine (400 `pezzo-fuori-immagine`). */
function verificaZona(s: Sorgente, dim: DimensioniMappa): void {
  if (s.x + s.larghezza > dim.larghezza || s.y + s.altezza > dim.altezza) {
    throw httpErrors.badRequest('pezzo-fuori-immagine', `La zona del pezzo esce dall'immagine (${dim.larghezza}×${dim.altezza} px).`);
  }
}

/** L'ingombro della copia posata, ruotata, dentro l'immagine (400 `pezzo-fuori-immagine`). */
function verificaPosa(s: Sorgente, p: Posa, dim: DimensioniMappa, quale = 'Il pezzo posato'): void {
  const ingombro = ingombroPezzo(s.larghezza, s.altezza, p.rotazione);
  if (p.posizione.x + ingombro.larghezza > dim.larghezza || p.posizione.y + ingombro.altezza > dim.altezza) {
    throw httpErrors.badRequest('pezzo-fuori-immagine', `${quale} esce dall'immagine (${dim.larghezza}×${dim.altezza} px): spostalo più dentro.`);
  }
}

/** Vero se la zona sta nell'immagine (la regola di `verificaZona`, senza errore: per il pacchetto). */
export function zonaNellImmagine(s: Sorgente, dim: DimensioniMappa): boolean {
  try { verificaZona(s, dim); return true; } catch { return false; }
}

/** Vero se l'ingombro della copia sta nell'immagine (la regola di `verificaPosa`, senza errore: per il pacchetto). */
export function posaNellImmagine(s: Sorgente, p: Posa, dim: DimensioniMappa): boolean {
  try { verificaPosa(s, p, dim); return true; } catch { return false; }
}

/** Quanti ritagli ha una mappa. */
export function quantiPezzi(mappa: string): number {
  return conPezzi() ? prepared('SELECT COUNT(*) FROM pezzo_mappa WHERE mappa_chiave = ?').pluck().get(mappa) as number : 0;
}

/** Quante copie posate ha una mappa, fra tutti i suoi ritagli. */
export function quanteCopie(mappa: string): number {
  return conPezzi() ? prepared('SELECT COUNT(*) FROM copia_pezzo c JOIN pezzo_mappa p ON p.id = c.pezzo_id WHERE p.mappa_chiave = ?').pluck().get(mappa) as number : 0;
}

/** Le mappe che hanno almeno un ritaglio. */
export function mappeConPezzi(): string[] {
  return conPezzi() ? prepared('SELECT DISTINCT mappa_chiave FROM pezzo_mappa ORDER BY mappa_chiave').pluck().all() as string[] : [];
}

/** Toglie tutti i pezzi di una mappa con le loro copie (anche senza contare sulla cascata delle chiavi esterne). */
export function eliminaPezziDellaMappa(mappa: string): void {
  if (!conPezzi()) return;
  prepared('DELETE FROM copia_pezzo WHERE pezzo_id IN (SELECT id FROM pezzo_mappa WHERE mappa_chiave = ?)').run(mappa);
  prepared('DELETE FROM pezzo_mappa WHERE mappa_chiave = ?').run(mappa);
}

/**
 * I pezzi (102) sono ritagli in pixel dell'immagine che la mappa mostra: un'altra immagine (sostituita, o tolta e rimpiazzata
 * dall'asset o da nessuna) li ritaglierebbe da zone sbagliate. Scelta dell'utente del 2026-10-14 («Chiedere conferma ed
 * eliminarli»), dal lotto L1 la stessa per ogni strada che cambia l'immagine mostrata (editor, rotta generica, da URL, scarico
 * della pianta, rimozioni): senza `conferma` 409 `mappa-con-pezzi` con i conteggi; con la conferma la funzione restituita toglie
 * i pezzi con le loro copie, e va chiamata nella stessa transazione del cambio d'immagine. `blocco`: l'operazione tocca più mappe
 * insieme (rimozione in blocco), e i dettagli contano anche le mappe.
 */
export function confermaPezzi(mappe: readonly string[], conferma: boolean, cosa: 'sostituendola' | 'togliendola', blocco = false): () => void {
  const toccate = [...new Set(mappe)].filter((m) => quantiPezzi(m) > 0);
  if (toccate.length === 0) return () => {};
  if (!conferma) {
    const pezzi = toccate.reduce((n, m) => n + quantiPezzi(m), 0);
    const copie = toccate.reduce((n, m) => n + quanteCopie(m), 0);
    const chi = toccate.length === 1 ? 'La mappa ha' : `${toccate.length} mappe hanno`;
    const azione = blocco ? 'togliendo le immagini' : cosa;
    throw httpErrors.conflict('mappa-con-pezzi', `${chi} ${pezzi === 1 ? '1 pezzo ritagliato' : `${pezzi} pezzi ritagliati`} dall’immagine di prima (${copie === 1 ? '1 copia posata' : `${copie} copie posate`}): ${azione} ${pezzi === 1 ? 'verrà eliminato' : 'verranno eliminati'} con le copie.`,
      blocco ? { mappe: toccate.length, pezzi, copie } : { pezzi, copie });
  }
  return () => { for (const m of toccate) eliminaPezziDellaMappa(m); };
}

/** Le condizioni come vanno salvate: normalizzate e in JSON, o null se non ne resta nessuna. */
function jsonCondizioni(condizioni: RequisitoSpillo[] | null | undefined): string | null {
  const pulite = normalizzaCondizioniSpillo(condizioni ?? []);
  return pulite.length > 0 ? JSON.stringify(pulite) : null;
}

/** Un uid nuovo, 32 esadecimali come quelli dei pin. */
const uidNuovo = (): string => randomBytes(16).toString('hex');
/** Un uid del pacchetto che si può tenere: ben formato e non già preso in quella tabella. */
const uidTenibile = (uid: string | undefined, tabella: 'pezzo_mappa' | 'copia_pezzo'): uid is string =>
  typeof uid === 'string' && /^[0-9a-f]{32}$/.test(uid) && !prepared(`SELECT 1 FROM ${tabella} WHERE uid = ?`).get(uid);

/** Segna la modifica sulla mappa (la data dell'ultima modifica la leggono l'editor e l'esportazione). */
const toccaMappa = (mappa: string, adesso: string): void => { prepared('UPDATE mappa SET updated_at = ? WHERE chiave = ?').run(adesso, mappa); };

/** Inserisce una copia di un ritaglio: senza posizione sta sulla zona d'origine, senza ordine va in fondo. */
function inserisciCopia(pezzo: RigaPezzo, dati: DatiCopiaPezzo, adesso: string, uid = uidNuovo()): number {
  const ordine = dati.ordine ?? (prepared('SELECT COALESCE(MAX(ordine), -1) + 1 FROM copia_pezzo WHERE pezzo_id = ?').pluck().get(pezzo.id) as number);
  const posizione = dati.posizione ?? { x: pezzo.sorgente_x, y: pezzo.sorgente_y };
  const info = prepared(`INSERT INTO copia_pezzo (uid, pezzo_id, etichetta, x, y, rotazione, specchio_orizzontale, specchio_verticale, condizioni_json, ordine, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(uid, pezzo.id, dati.etichetta?.trim() ?? '', posizione.x, posizione.y, dati.rotazione ?? 0,
    dati.specchio?.orizzontale ? 1 : 0, dati.specchio?.verticale ? 1 : 0, jsonCondizioni(dati.condizioni), ordine, adesso);
  return Number(info.lastInsertRowid);
}

/**
 * Crea un pezzo dalla zona scelta, con la sua prima copia: il ritaglio in fondo ai pezzi della mappa, senza nome «Pezzo N»; la
 * copia, senza posizione, dove stava la zona (si sposta dopo). Le condizioni le verifica chi chiama (`verificaCondizioni` dei pin).
 */
export function creaPezzo(mappa: string, dim: DimensioniMappa, dati: DatiNuovoPezzoMappa): RigaPezzo {
  const copia = dati.copia ?? {};
  verificaZona(dati.sorgente, dim);
  verificaPosa(dati.sorgente, { posizione: copia.posizione ?? { x: dati.sorgente.x, y: dati.sorgente.y }, rotazione: copia.rotazione ?? 0 }, dim);
  const quanti = prepared('SELECT COUNT(*) FROM pezzo_mappa WHERE mappa_chiave = ?').pluck().get(mappa) as number;
  const ordine = dati.ordine ?? (prepared('SELECT COALESCE(MAX(ordine), -1) + 1 FROM pezzo_mappa WHERE mappa_chiave = ?').pluck().get(mappa) as number);
  const adesso = nowIso();
  const info = prepared(`INSERT INTO pezzo_mappa (uid, mappa_chiave, nome, sorgente_x, sorgente_y, larghezza, altezza, ordine, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(uidNuovo(), mappa, dati.nome?.trim() || `Pezzo ${quanti + 1}`, dati.sorgente.x, dati.sorgente.y, dati.sorgente.larghezza, dati.sorgente.altezza, ordine, adesso);
  const pezzo = rigaPezzo(Number(info.lastInsertRowid));
  inserisciCopia(pezzo, copia, adesso);
  toccaMappa(mappa, adesso);
  return pezzo;
}

/**
 * Corregge un ritaglio: i campi assenti restano; un nome vuoto lascia quello di prima. Cambiando la zona si riverifica sull'immagine
 * anche l'ingombro di ogni copia (la dimensione è quella della zona).
 */
export function aggiornaPezzo(id: number, dim: DimensioniMappa, dati: DatiPezzoMappa): RigaPezzo {
  const r = rigaPezzo(id);
  const sorgente = dati.sorgente ?? { x: r.sorgente_x, y: r.sorgente_y, larghezza: r.larghezza, altezza: r.altezza };
  if (dati.sorgente) {
    verificaZona(sorgente, dim);
    righeCopie(id).forEach((c, i) => verificaPosa(sorgente, { posizione: { x: c.x, y: c.y }, rotazione: c.rotazione }, dim, `La copia ${i + 1} del pezzo`));
  }
  const adesso = nowIso();
  getDb().transaction(() => {
    prepared('UPDATE pezzo_mappa SET nome = ?, sorgente_x = ?, sorgente_y = ?, larghezza = ?, altezza = ?, ordine = ?, updated_at = ? WHERE id = ?')
      .run(dati.nome?.trim() || r.nome, sorgente.x, sorgente.y, sorgente.larghezza, sorgente.altezza, dati.ordine ?? r.ordine, adesso, id);
    toccaMappa(r.mappa_chiave, adesso);
  })();
  return rigaPezzo(id);
}

/** Elimina un ritaglio con tutte le sue copie (404 se non c'è): la sua zona torna visibile nell'immagine di base. */
export function eliminaPezzo(id: number): void {
  const r = rigaPezzo(id);
  getDb().transaction(() => {
    prepared('DELETE FROM copia_pezzo WHERE pezzo_id = ?').run(id);
    prepared('DELETE FROM pezzo_mappa WHERE id = ?').run(id);
    toccaMappa(r.mappa_chiave, nowIso());
  })();
}

/** Aggiunge una copia a un ritaglio (404 se non c'è): l'ingombro deve stare nell'immagine. Le condizioni le verifica chi chiama. */
export function creaCopia(pezzoId: number, dim: DimensioniMappa, dati: DatiCopiaPezzo): RigaCopia {
  const pezzo = rigaPezzo(pezzoId);
  const sorgente = { x: pezzo.sorgente_x, y: pezzo.sorgente_y, larghezza: pezzo.larghezza, altezza: pezzo.altezza };
  verificaPosa(sorgente, { posizione: dati.posizione ?? { x: sorgente.x, y: sorgente.y }, rotazione: dati.rotazione ?? 0 }, dim, 'La copia');
  const quante = prepared('SELECT COUNT(*) FROM copia_pezzo WHERE pezzo_id = ?').pluck().get(pezzoId) as number;
  if (quante >= MASSIMO_COPIE) throw httpErrors.badRequest('troppe-copie', `Un pezzo ha al massimo ${MASSIMO_COPIE} copie.`);
  const adesso = nowIso();
  const id = getDb().transaction(() => {
    const nuova = inserisciCopia(pezzo, dati, adesso);
    toccaMappa(pezzo.mappa_chiave, adesso);
    return nuova;
  })();
  return rigaCopia(id);
}

/**
 * Corregge una copia: i campi assenti restano; l'ingombro si riverifica sull'immagine. Con `nomePezzo` (non vuoto) rinomina anche
 * il ritaglio, nella stessa transazione.
 */
export function aggiornaCopia(id: number, dim: DimensioniMappa, dati: DatiAggiornaCopiaPezzo): RigaCopia {
  const c = rigaCopia(id);
  const pezzo = rigaPezzo(c.pezzo_id);
  const posizione = dati.posizione ?? { x: c.x, y: c.y };
  const rotazione = dati.rotazione ?? c.rotazione;
  verificaPosa({ x: pezzo.sorgente_x, y: pezzo.sorgente_y, larghezza: pezzo.larghezza, altezza: pezzo.altezza }, { posizione, rotazione }, dim, 'La copia');
  const adesso = nowIso();
  getDb().transaction(() => {
    prepared(`UPDATE copia_pezzo SET etichetta = ?, x = ?, y = ?, rotazione = ?, specchio_orizzontale = ?, specchio_verticale = ?, condizioni_json = ?, ordine = ?, updated_at = ? WHERE id = ?`)
      .run(dati.etichetta === undefined ? c.etichetta : dati.etichetta.trim(), posizione.x, posizione.y, rotazione,
        dati.specchio ? (dati.specchio.orizzontale ? 1 : 0) : c.specchio_orizzontale, dati.specchio ? (dati.specchio.verticale ? 1 : 0) : c.specchio_verticale,
        dati.condizioni === undefined ? c.condizioni_json : jsonCondizioni(dati.condizioni), dati.ordine ?? c.ordine, adesso, id);
    const nome = dati.nomePezzo?.trim();
    if (nome && nome !== pezzo.nome) prepared('UPDATE pezzo_mappa SET nome = ?, updated_at = ? WHERE id = ?').run(nome, adesso, pezzo.id);
    toccaMappa(pezzo.mappa_chiave, adesso);
  })();
  return rigaCopia(id);
}

/**
 * Elimina una copia (404 se non c'è). Scelta dell'utente (2026-10-15, «Se ne va il ritaglio»): eliminata l'ultima copia, se ne va
 * anche il ritaglio e la sua zona torna visibile nell'immagine di base. Dice se il ritaglio se n'è andato.
 */
export function eliminaCopia(id: number): { pezzoEliminato: boolean } {
  const c = rigaCopia(id);
  const pezzo = rigaPezzo(c.pezzo_id);
  return getDb().transaction(() => {
    prepared('DELETE FROM copia_pezzo WHERE id = ?').run(id);
    const restano = prepared('SELECT COUNT(*) FROM copia_pezzo WHERE pezzo_id = ?').pluck().get(pezzo.id) as number;
    if (restano === 0) prepared('DELETE FROM pezzo_mappa WHERE id = ?').run(pezzo.id);
    toccaMappa(pezzo.mappa_chiave, nowIso());
    return { pezzoEliminato: restano === 0 };
  })();
}

/** I pezzi di una mappa come li porta il pacchetto delle mappe: ogni ritaglio con le sue copie. */
export function pezziPerPacchetto(mappa: string): PezzoPacchetto[] {
  return righeConCopie(mappa).map(({ pezzo: r, copie }) => ({
    uid: r.uid, nome: r.nome, sorgente: { x: r.sorgente_x, y: r.sorgente_y, larghezza: r.larghezza, altezza: r.altezza }, ordine: r.ordine,
    copie: copie.map((c) => {
      const condizioni = leggiCondizioniSalvate(c.condizioni_json);
      return {
        uid: c.uid, ...(c.etichetta ? { etichetta: c.etichetta } : {}), posizione: { x: c.x, y: c.y }, rotazione: c.rotazione,
        specchio: { orizzontale: c.specchio_orizzontale === 1, verticale: c.specchio_verticale === 1 }, ...(condizioni.length > 0 ? { condizioni } : {}), ordine: c.ordine,
      };
    }),
  }));
}

/**
 * I pezzi di un pacchetto che stanno nell'immagine della mappa d'arrivo: un ritaglio con la zona fuori si scarta con tutte le sue
 * copie, una copia che esce si scarta da sola, e un ritaglio rimasto senza copie si scarta (un ritaglio senza copie non esiste).
 * Senza dimensioni (la mappa non ha un'immagine leggibile) si scarta tutto. Conta ritagli e copie scartati.
 */
export function pezziNellImmagine(pezzi: readonly PezzoDaImportare[], dim: DimensioniMappa | null): { dentro: PezzoDaImportare[]; pezziScartati: number; copieScartate: number } {
  const dentro: PezzoDaImportare[] = [];
  let pezziScartati = 0;
  let copieScartate = 0;
  for (const p of pezzi) {
    const copie = dim && zonaNellImmagine(p.sorgente, dim) ? p.copie.filter((c) => posaNellImmagine(p.sorgente, c, dim)) : [];
    copieScartate += p.copie.length - copie.length;
    if (copie.length === 0) { pezziScartati++; continue; }
    dentro.push({ ...p, copie });
  }
  return { dentro, pezziScartati, copieScartate };
}

/**
 * Sostituisce i pezzi di una mappa con quelli di un pacchetto (dentro la transazione dell'importazione). Le condizioni arrivano già
 * ripulite da chi chiama (le chiavi assenti dalla Guida si scartano, come per i pin), e i pezzi già verificati sull'immagine
 * (`pezziNellImmagine`). Gli uid del pacchetto (dei ritagli e delle copie) si tengono se validi e liberi, altrimenti se ne fanno di
 * nuovi. La forma la controlla `schemaPezziPacchetto`. Dice quanti ritagli e quante copie ha scritto.
 */
export function sostituisciPezzi(mappa: string, pezzi: readonly PezzoDaImportare[]): { pezzi: number; copie: number } {
  // L3 (andata e ritorno identica del pacchetto, lotti/L3/modifiche.md §2.3): un pezzo o una copia che torna con lo stesso uid riprende
  // il suo id e, se nulla è cambiato, la sua ultima modifica (e il testo delle condizioni com'era salvato)
  const pezziPrima = new Map((prepared('SELECT * FROM pezzo_mappa WHERE mappa_chiave = ?').all(mappa) as RigaPezzo[]).map((r) => [r.uid, r]));
  const copiePrima = new Map((prepared('SELECT c.* FROM copia_pezzo c JOIN pezzo_mappa p ON p.id = c.pezzo_id WHERE p.mappa_chiave = ?').all(mappa) as Array<RigaCopiaSalvata>).map((r) => [r.uid, r]));
  eliminaPezziDellaMappa(mappa);
  const adesso = nowIso();
  let copie = 0;
  for (const p of pezzi) {
    const uid = uidTenibile(p.uid, 'pezzo_mappa') ? p.uid! : uidNuovo();
    const prima = pezziPrima.get(uid);
    const uguale = !!prima && prima.nome === p.nome && prima.sorgente_x === p.sorgente.x && prima.sorgente_y === p.sorgente.y && prima.larghezza === p.sorgente.larghezza
      && prima.altezza === p.sorgente.altezza && prima.ordine === p.ordine;
    const id = prima && !prepared('SELECT 1 FROM pezzo_mappa WHERE id = ?').get(prima.id) ? prima.id : null;
    const info = prepared(`INSERT INTO pezzo_mappa (id, uid, mappa_chiave, nome, sorgente_x, sorgente_y, larghezza, altezza, ordine, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, uid, mappa, p.nome, p.sorgente.x, p.sorgente.y, p.sorgente.larghezza, p.sorgente.altezza, p.ordine, uguale ? prima!.updated_at : adesso);
    const ritaglio = rigaPezzo(Number(info.lastInsertRowid));
    for (const c of p.copie) {
      const nuova = inserisciCopia(ritaglio, c, adesso, uidTenibile(c.uid, 'copia_pezzo') ? c.uid : uidNuovo());
      riprendiCopiaDiPrima(nuova, copiePrima);
      copie++;
    }
  }
  return { pezzi: pezzi.length, copie };
}

/** Una copia com'è salvata (le colonne che `riprendiCopiaDiPrima` confronta). */
interface RigaCopiaSalvata { id: number; uid: string; pezzo_id: number; etichetta: string; x: number; y: number; rotazione: number; specchio_orizzontale: number; specchio_verticale: number; condizioni_json: string | null; ordine: number; updated_at: string }

/** La copia appena reinserita riprende id, testo delle condizioni e ultima modifica di quella di prima con lo stesso uid, se è uguale. */
function riprendiCopiaDiPrima(id: number, prima: ReadonlyMap<string, RigaCopiaSalvata>): void {
  const ora = prepared('SELECT * FROM copia_pezzo WHERE id = ?').get(id) as RigaCopiaSalvata;
  const p = prima.get(ora.uid);
  if (!p) return;
  const condizioniUguali = JSON.stringify(leggiCondizioniSalvate(p.condizioni_json)) === JSON.stringify(leggiCondizioniSalvate(ora.condizioni_json));
  const uguale = condizioniUguali && p.etichetta === ora.etichetta && p.x === ora.x && p.y === ora.y && p.rotazione === ora.rotazione
    && p.specchio_orizzontale === ora.specchio_orizzontale && p.specchio_verticale === ora.specchio_verticale && p.ordine === ora.ordine;
  const idLibero = p.id !== id && !prepared('SELECT 1 FROM copia_pezzo WHERE id = ?').get(p.id);
  prepared('UPDATE copia_pezzo SET id = ?, condizioni_json = ?, updated_at = ? WHERE id = ?')
    .run(idLibero ? p.id : id, condizioniUguali ? p.condizioni_json : ora.condizioni_json, uguale ? p.updated_at : ora.updated_at, id);
}
