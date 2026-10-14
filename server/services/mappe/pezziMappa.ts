// ============================================================
// pezziMappa — i pezzi delle planimetrie: zone dell'immagine scelte dall'utente, cancellate e posate altrove con condizioni (102)
// ============================================================
//
// Richiesta dell'utente (2026-10-14): selezionare col mouse i pezzi che nelle planimetrie del gioco sono disegnati a parte (parti
// mobili, come i muri in fondo al Museo 2P di Madarame), toglierli dalla vista ordinaria e posarli nel punto giusto della mappa,
// della stessa dimensione, con le condizioni dei pin che decidono quando si vedono. «devo poter selezionare io aree da gestire
// come pezzi»: le zone le sceglie l'utente nell'editor, qui non si riconosce niente da sé.
// Tutto in pixel dell'immagine; chi chiama passa la mappa (chiave interna) e le sue dimensioni (`mappeService`).
// ============================================================

import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { LIMITI_GUIDA } from '../../../shared/limitiGuida.js';
import { getDb, nowIso, prepared } from '../../db/dbService.js';
import { httpErrors } from '../../utils/httpError.js';
import { descriviRequisitoSpillo, leggiCondizioniSalvate, normalizzaCondizioniSpillo, type NomiCondizioni, type RequisitoSpillo } from '../../../shared/condizioniSpillo.js';
import { valutaRequisitiSpillo, type StatoDisponibilita } from '../disponibilitaService.js';
import type { DatiPezzoMappa, EsportazioneMappeDto, PezzoMappaDto, RotazionePezzo } from '../../../shared/types.js';
import { ingombroPezzo } from '../../../shared/pezziMappa.js';

export interface RigaPezzo {
  id: number; uid: string; mappa_chiave: string; nome: string;
  sorgente_x: number; sorgente_y: number; larghezza: number; altezza: number; x: number; y: number;
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
/** I pezzi di una mappa in un pacchetto delle mappe: la forma; le condizioni si ripuliscono all'importazione come quelle dei pin. */
export const schemaPezziPacchetto = z.array(z.object({
  uid: z.string().max(64).optional(), nome: z.string().max(LIMITI_GUIDA.spillo.nome), sorgente: schemaSorgentePezzo, posizione: schemaPosizionePezzo,
  rotazione: schemaRotazionePezzo, specchio: schemaSpecchioPezzo, condizioni: z.array(z.unknown()).max(20).optional(), ordine: z.number().int().min(0).max(9999),
})).max(500);

/** Le dimensioni dell'immagine della mappa, in pixel. */
export interface DimensioniMappa { larghezza: number; altezza: number }

/** La tabella c'è dalla 102: nei test e nei file di prima può mancare. */
export function conPezzi(): boolean {
  return !!prepared("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'pezzo_mappa'").get();
}


/** Il pezzo per l'API: con lo stato della partita (`st`) porta l'esito delle condizioni, come i pin. */
export function pezzoDto(r: RigaPezzo, nomi: NomiCondizioni, st?: StatoDisponibilita | null): PezzoMappaDto {
  const condizioni = leggiCondizioniSalvate(r.condizioni_json).map((c) => ({ ...c, testo: descriviRequisitoSpillo(c, nomi) }));
  return {
    id: r.id, uid: r.uid, nome: r.nome,
    sorgente: { x: r.sorgente_x, y: r.sorgente_y, larghezza: r.larghezza, altezza: r.altezza },
    posizione: { x: r.x, y: r.y }, rotazione: r.rotazione,
    specchio: { orizzontale: r.specchio_orizzontale === 1, verticale: r.specchio_verticale === 1 },
    condizioni, ...(st ? { disponibilita: valutaRequisitiSpillo(condizioni, st, nomi) } : {}),
    ordine: r.ordine, updatedAt: r.updated_at,
  };
}

/** I pezzi di una mappa, nel loro ordine. */
export function righePezzi(mappa: string): RigaPezzo[] {
  if (!conPezzi()) return [];
  return prepared('SELECT * FROM pezzo_mappa WHERE mappa_chiave = ? ORDER BY ordine, id').all(mappa) as RigaPezzo[];
}

/** La riga di un pezzo; 404 se non c'è. */
export function rigaPezzo(id: number): RigaPezzo {
  const r = conPezzi() ? prepared('SELECT * FROM pezzo_mappa WHERE id = ?').get(id) as RigaPezzo | undefined : undefined;
  if (!r) throw httpErrors.notFound('pezzo-non-trovato', `Il pezzo ${id} non esiste.`);
  return r;
}

/**
 * Il pezzo come sarà salvato, verificato sull'immagine: la zona d'origine dentro l'immagine (400 `pezzo-fuori-immagine`) e
 * l'ingombro del pezzo posato, ruotato, anche (400 `pezzo-fuori-immagine`). Interi non negativi e dimensioni positive li
 * garantisce lo schema della rotta.
 */
function verificaNellImmagine(p: { sorgente: { x: number; y: number; larghezza: number; altezza: number }; posizione: { x: number; y: number }; rotazione: RotazionePezzo }, dim: DimensioniMappa): void {
  const s = p.sorgente;
  if (s.x + s.larghezza > dim.larghezza || s.y + s.altezza > dim.altezza) {
    throw httpErrors.badRequest('pezzo-fuori-immagine', `La zona del pezzo esce dall'immagine (${dim.larghezza}×${dim.altezza} px).`);
  }
  const ingombro = ingombroPezzo(s.larghezza, s.altezza, p.rotazione);
  if (p.posizione.x + ingombro.larghezza > dim.larghezza || p.posizione.y + ingombro.altezza > dim.altezza) {
    throw httpErrors.badRequest('pezzo-fuori-immagine', `Il pezzo posato esce dall'immagine (${dim.larghezza}×${dim.altezza} px): spostalo più dentro.`);
  }
}

/** Vero se zona e ingombro del pezzo stanno nell'immagine (la stessa regola di `verificaNellImmagine`, senza errore: per il pacchetto). */
export function staNellImmagine(p: { sorgente: { x: number; y: number; larghezza: number; altezza: number }; posizione: { x: number; y: number }; rotazione: RotazionePezzo }, dim: DimensioniMappa): boolean {
  try { verificaNellImmagine(p, dim); return true; } catch { return false; }
}

/** Quanti pezzi ha una mappa. */
export function quantiPezzi(mappa: string): number {
  return conPezzi() ? prepared('SELECT COUNT(*) FROM pezzo_mappa WHERE mappa_chiave = ?').pluck().get(mappa) as number : 0;
}

/** Le condizioni come vanno salvate: normalizzate e in JSON, o null se non ne resta nessuna. */
function jsonCondizioni(condizioni: RequisitoSpillo[] | null | undefined): string | null {
  const pulite = normalizzaCondizioniSpillo(condizioni ?? []);
  return pulite.length > 0 ? JSON.stringify(pulite) : null;
}

/** Un uid nuovo, 32 esadecimali come quelli dei pin. */
const uidNuovo = (): string => randomBytes(16).toString('hex');

/**
 * Crea un pezzo dalla zona scelta: in fondo ai pezzi della mappa; senza posizione sta dove stava nell'immagine (si sposta dopo),
 * senza nome si chiama «Pezzo N». Le condizioni le verifica chi chiama (`verificaCondizioni` dei pin).
 */
export function creaPezzo(mappa: string, dim: DimensioniMappa, dati: DatiPezzoMappa & { sorgente: NonNullable<DatiPezzoMappa['sorgente']> }): RigaPezzo {
  const p = { sorgente: dati.sorgente, posizione: dati.posizione ?? { x: dati.sorgente.x, y: dati.sorgente.y }, rotazione: dati.rotazione ?? 0 };
  verificaNellImmagine(p, dim);
  const quanti = prepared('SELECT COUNT(*) FROM pezzo_mappa WHERE mappa_chiave = ?').pluck().get(mappa) as number;
  const ordine = dati.ordine ?? (prepared('SELECT COALESCE(MAX(ordine), -1) + 1 FROM pezzo_mappa WHERE mappa_chiave = ?').pluck().get(mappa) as number);
  const adesso = nowIso();
  const info = prepared(`INSERT INTO pezzo_mappa (uid, mappa_chiave, nome, sorgente_x, sorgente_y, larghezza, altezza, x, y, rotazione, specchio_orizzontale, specchio_verticale, condizioni_json, ordine, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(uidNuovo(), mappa, dati.nome?.trim() || `Pezzo ${quanti + 1}`, p.sorgente.x, p.sorgente.y, p.sorgente.larghezza, p.sorgente.altezza,
    p.posizione.x, p.posizione.y, p.rotazione, dati.specchio?.orizzontale ? 1 : 0, dati.specchio?.verticale ? 1 : 0, jsonCondizioni(dati.condizioni), ordine, adesso);
  prepared('UPDATE mappa SET updated_at = ? WHERE chiave = ?').run(adesso, mappa);
  return rigaPezzo(Number(info.lastInsertRowid));
}

/** Corregge un pezzo: i campi assenti restano; zona e ingombro si riverificano sull'immagine. Un nome vuoto lascia quello di prima. */
export function aggiornaPezzo(id: number, dim: DimensioniMappa, dati: DatiPezzoMappa): RigaPezzo {
  const r = rigaPezzo(id);
  const sorgente = dati.sorgente ?? { x: r.sorgente_x, y: r.sorgente_y, larghezza: r.larghezza, altezza: r.altezza };
  const posizione = dati.posizione ?? { x: r.x, y: r.y };
  const rotazione = dati.rotazione ?? r.rotazione;
  verificaNellImmagine({ sorgente, posizione, rotazione }, dim);
  const adesso = nowIso();
  getDb().transaction(() => {
    prepared(`UPDATE pezzo_mappa SET nome = ?, sorgente_x = ?, sorgente_y = ?, larghezza = ?, altezza = ?, x = ?, y = ?, rotazione = ?, specchio_orizzontale = ?, specchio_verticale = ?,
      condizioni_json = ?, ordine = ?, updated_at = ? WHERE id = ?`).run(dati.nome?.trim() || r.nome, sorgente.x, sorgente.y, sorgente.larghezza, sorgente.altezza, posizione.x, posizione.y, rotazione,
      dati.specchio ? (dati.specchio.orizzontale ? 1 : 0) : r.specchio_orizzontale, dati.specchio ? (dati.specchio.verticale ? 1 : 0) : r.specchio_verticale,
      dati.condizioni === undefined ? r.condizioni_json : jsonCondizioni(dati.condizioni), dati.ordine ?? r.ordine, adesso, id);
    prepared('UPDATE mappa SET updated_at = ? WHERE chiave = ?').run(adesso, r.mappa_chiave);
  })();
  return rigaPezzo(id);
}

/** Elimina un pezzo (404 se non c'è): la sua zona torna visibile nell'immagine di base. */
export function eliminaPezzo(id: number): void {
  const r = rigaPezzo(id);
  getDb().transaction(() => {
    prepared('DELETE FROM pezzo_mappa WHERE id = ?').run(id);
    prepared('UPDATE mappa SET updated_at = ? WHERE chiave = ?').run(nowIso(), r.mappa_chiave);
  })();
}

/** I pezzi di una mappa come li porta il pacchetto delle mappe. */
export function pezziPerPacchetto(mappa: string): NonNullable<EsportazioneMappeDto['mappe'][number]['pezzi']> {
  return righePezzi(mappa).map((r) => {
    const condizioni = leggiCondizioniSalvate(r.condizioni_json);
    return {
      uid: r.uid, nome: r.nome, sorgente: { x: r.sorgente_x, y: r.sorgente_y, larghezza: r.larghezza, altezza: r.altezza }, posizione: { x: r.x, y: r.y },
      rotazione: r.rotazione, specchio: { orizzontale: r.specchio_orizzontale === 1, verticale: r.specchio_verticale === 1 }, ...(condizioni.length > 0 ? { condizioni } : {}), ordine: r.ordine,
    };
  });
}

/**
 * Sostituisce i pezzi di una mappa con quelli di un pacchetto (dentro la transazione dell'importazione). Le condizioni arrivano già
 * ripulite da chi chiama (le chiavi assenti dalla Guida si scartano, come per i pin). L'uid del pacchetto si tiene se è valido e
 * libero, altrimenti se ne fa uno nuovo. La forma la controlla `schemaPezziPacchetto`.
 */
export function sostituisciPezzi(mappa: string, pezzi: ReadonlyArray<NonNullable<EsportazioneMappeDto['mappe'][number]['pezzi']>[number] & { condizioni?: RequisitoSpillo[] }>): number {
  prepared('DELETE FROM pezzo_mappa WHERE mappa_chiave = ?').run(mappa);
  const adesso = nowIso();
  for (const p of pezzi) {
    const uid = typeof p.uid === 'string' && /^[0-9a-f]{32}$/.test(p.uid) && !prepared('SELECT 1 FROM pezzo_mappa WHERE uid = ?').get(p.uid) ? p.uid : uidNuovo();
    prepared(`INSERT INTO pezzo_mappa (uid, mappa_chiave, nome, sorgente_x, sorgente_y, larghezza, altezza, x, y, rotazione, specchio_orizzontale, specchio_verticale, condizioni_json, ordine, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(uid, mappa, p.nome, p.sorgente.x, p.sorgente.y, p.sorgente.larghezza, p.sorgente.altezza, p.posizione.x, p.posizione.y,
      p.rotazione, p.specchio.orizzontale ? 1 : 0, p.specchio.verticale ? 1 : 0, jsonCondizioni(p.condizioni), p.ordine, adesso);
  }
  return pezzi.length;
}
