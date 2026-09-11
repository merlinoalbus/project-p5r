// ============================================================
// destinazioniSpillo — dove porta uno spillo di spostamento: una mappa e, se indicato, uno spillo di quella mappa
// ============================================================
//
// Richiesta dell'utente (2026-09-11): «gli spilli che identificano passaggi o spostamenti possono
// collegare la mappa corrente a qualsiasi altra mappa e (se viene selezionato uno spillo di quella
// mappa) devono puntare a quello specifico spillo mettendo lo spillo al centro già selezionato ma
// la mappa sempre adattata alla finestra». Il punto d'arrivo in percentuale con lo zoom, che
// c'era prima, sparisce dall'API: resta nella tabella solo per leggere i pacchetti vecchi.
//
// Nei pacchetti gli id non valgono: lo spillo d'arrivo viaggia come nome + posizione, e
// all'importazione si risolve sullo spillo più vicino di quella mappa (nome uguale preferito).
// ============================================================

import { z } from 'zod';
import { prepared } from '../../db/dbService.js';
import { chiaveMappa, idMappa } from './percorsiMappe.js';
import { httpErrors } from '../../utils/httpError.js';
import type { DestinazionePacchetto, DestinazioneSpillo } from '../../../shared/types.js';

export const schemaDestinazioneSpillo = z.object({
  mappa: z.string().min(1).max(180),
  spillo: z.number().int().positive().nullable().optional(),
}).strict();

/** Dal pacchetto: la forma nuova (spillo per nome e posizione) o quella vecchia (x, y, zoom). */
const schemaPacchetto = z.object({
  mappa: z.string().min(1).max(180),
  spillo: z.object({ nome: z.string().max(160), x: z.number().min(0).max(100), y: z.number().min(0).max(100) }).nullable().optional(),
  x: z.number().min(0).max(100).optional(), y: z.number().min(0).max(100).optional(), zoom: z.number().min(1).max(6).optional(),
}).strict();

/** Una destinazione verificata e non ancora scritta: lo spillo può essere un id o una ricerca da risolvere al salvataggio. */
export interface DestinazioneDaSalvare { mappa: string; spillo: number | null; cerca?: { nome: string | null; x: number; y: number } }

/** Quanto lontano (in percentuale dell'immagine) può stare uno spillo d'arrivo dal punto descritto perché sia «quello». */
const TOLLERANZA = 8;

/** Dall'API: la mappa deve esistere, e lo spillo d'arrivo deve stare su quella mappa. */
export function verificaDestinazioneSpillo(value: unknown, incoming: Set<string> = new Set()): DestinazioneDaSalvare | null | undefined {
  if (value === null || value === undefined) return value;
  const api = schemaDestinazioneSpillo.safeParse(value);
  if (api.success) {
    const mappa = idMappa(api.data.mappa);
    if (!incoming.has(mappa) && !prepared('SELECT 1 FROM mappa WHERE chiave=?').get(mappa)) throw httpErrors.notFound('destinazione-non-trovata', 'La mappa di arrivo non esiste.');
    const spillo = api.data.spillo ?? null;
    if (spillo !== null) {
      const r = prepared('SELECT mappa_chiave FROM spillo WHERE id=?').get(spillo) as { mappa_chiave: string } | undefined;
      if (!r) throw httpErrors.notFound('destinazione-non-trovata', 'Lo spillo di arrivo non esiste.');
      if (r.mappa_chiave !== mappa) throw httpErrors.badRequest('destinazione-non-valida', 'Lo spillo di arrivo deve stare sulla mappa di arrivo.');
    }
    return { mappa, spillo };
  }
  const pacchetto = schemaPacchetto.safeParse(value);
  if (!pacchetto.success) throw httpErrors.badRequest('destinazione-non-valida', 'Indica una mappa di arrivo e, se vuoi, uno spillo di quella mappa.');
  const mappa = idMappa(pacchetto.data.mappa);
  if (!incoming.has(mappa) && !prepared('SELECT 1 FROM mappa WHERE chiave=?').get(mappa)) throw httpErrors.notFound('destinazione-non-trovata', 'La mappa di arrivo non esiste.');
  const d = pacchetto.data;
  if (d.spillo) return { mappa, spillo: null, cerca: { nome: d.spillo.nome, x: d.spillo.x, y: d.spillo.y } };
  if (d.x !== undefined && d.y !== undefined) return { mappa, spillo: null, cerca: { nome: null, x: d.x, y: d.y } };
  return { mappa, spillo: null };
}

/** Lo spillo di `mappa` che meglio corrisponde a nome e posizione: stesso nome se c'è, altrimenti il più vicino entro la tolleranza. */
export function risolviSpilloArrivo(mappa: string, cerca: { nome: string | null; x: number; y: number }): number | null {
  const candidati = prepared('SELECT id, nome, x, y FROM spillo WHERE mappa_chiave=?').all(mappa) as Array<{ id: number; nome: string; x: number; y: number }>;
  const distanza = (s: { x: number; y: number }) => Math.hypot(s.x - cerca.x, s.y - cerca.y);
  const vicini = candidati.filter((s) => distanza(s) <= TOLLERANZA).sort((a, b) => distanza(a) - distanza(b));
  if (cerca.nome) { const conNome = vicini.find((s) => s.nome === cerca.nome); if (conNome) return conNome.id; }
  return vicini[0]?.id ?? null;
}

/** La colonna arriva con la migrazione 065: il seed può caricarsi con lo schema ancora indietro (nei test le migrazioni si applicano a scaglioni). */
function haColonnaArrivo(): boolean {
  return (prepared("SELECT name FROM pragma_table_info('spillo_destinazione')").all() as Array<{ name: string }>).some((c) => c.name === 'spillo_arrivo_id');
}

export function leggiDestinazioneSpillo(id: number): { destinazione: DestinazioneSpillo | null; destinazioneNonDisponibile: boolean } {
  const r = prepared(haColonnaArrivo() ? 'SELECT mappa_chiave, spillo_arrivo_id FROM spillo_destinazione WHERE spillo_id=?' : 'SELECT mappa_chiave, NULL AS spillo_arrivo_id FROM spillo_destinazione WHERE spillo_id=?').get(id) as { mappa_chiave: string | null; spillo_arrivo_id: number | null } | undefined;
  return {
    destinazione: r?.mappa_chiave ? { mappa: chiaveMappa(r.mappa_chiave), spillo: r.spillo_arrivo_id } : null,
    destinazioneNonDisponibile: !!r && r.mappa_chiave === null,
  };
}

/** La destinazione come va scritta in un pacchetto: lo spillo d'arrivo per nome e posizione. */
export function destinazionePerPacchetto(id: number): { destinazione?: DestinazionePacchetto | null; destinazioneNonDisponibile?: boolean } {
  const { destinazione, destinazioneNonDisponibile } = leggiDestinazioneSpillo(id);
  if (destinazioneNonDisponibile) return { destinazione: null, destinazioneNonDisponibile: true };
  if (!destinazione) return {};
  const arrivo = destinazione.spillo ? (prepared('SELECT nome, x, y FROM spillo WHERE id=?').get(destinazione.spillo) as { nome: string; x: number; y: number } | undefined) : undefined;
  return { destinazione: { mappa: destinazione.mappa, spillo: arrivo ? { nome: arrivo.nome, x: arrivo.x, y: arrivo.y } : null } };
}

/** undefined conserva; null toglie. La lapide (`mappa_chiave` nulla) impedisce di ricadere in silenzio su un altro collegamento. */
export function salvaDestinazioneSpillo(id: number, value: DestinazioneDaSalvare | null | undefined, invalidata = false): void {
  if (value === undefined && !invalidata) return;
  if (value === null && !invalidata) { prepared('DELETE FROM spillo_destinazione WHERE spillo_id=?').run(id); return; }
  const mappa = value?.mappa ? idMappa(value.mappa) : null;
  const spillo = value ? (value.spillo ?? (value.cerca && mappa ? risolviSpilloArrivo(mappa, value.cerca) : null)) : null;
  if (!haColonnaArrivo()) {
    // schema ancora alla 064: si conserva il punto descritto, che la 065 convertirà nello spillo più vicino
    prepared(`INSERT INTO spillo_destinazione (spillo_id, mappa_chiave, x, y, zoom) VALUES(?,?,?,?,?) ON CONFLICT(spillo_id) DO UPDATE SET
      mappa_chiave=excluded.mappa_chiave, x=excluded.x, y=excluded.y, zoom=excluded.zoom`).run(id, mappa, value?.cerca?.x ?? 0, value?.cerca?.y ?? 0, 1);
    return;
  }
  prepared(`INSERT INTO spillo_destinazione (spillo_id, mappa_chiave, x, y, zoom, spillo_arrivo_id) VALUES(?,?,?,?,?,?) ON CONFLICT(spillo_id) DO UPDATE SET
    mappa_chiave=excluded.mappa_chiave, x=excluded.x, y=excluded.y, zoom=excluded.zoom, spillo_arrivo_id=excluded.spillo_arrivo_id`).run(id, mappa, 0, 0, 1, spillo);
}
