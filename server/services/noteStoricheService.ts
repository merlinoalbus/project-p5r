// ============================================================
// noteStoricheService — le note storiche della fonte (F6: dati, non codice)
// ============================================================
//
// Una nota storica dice una discordanza della guida (G-034: Homunculus a 120.000 ¥ nella pagina Oggetti, 5.000 ¥ nel listino Royal di
// Tanaka) senza cambiare prezzi, acquisti o progressi. Vive in `nota_storica` (migrazione 139) e si mostra sulle righe legate in
// `nota_storica_legame` (un'offerta, un oggetto del catalogo): un solo punto di modifica, letto da negozi, catalogo e confronto Tanaka.
// Si modifica dall'app e torna al valore della guida con «Ripristina» (`seed_json`), come il costo dei regali: il testo attuale è una
// precondizione esplicita, così una correzione fatta nel frattempo non si sovrascrive per errore.
// ============================================================

import { z } from 'zod';
import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { invalidaCacheDiGioco } from './cacheDiGioco.js';
import type { NotaStoricaOfferta } from '../../shared/types.js';

interface RigaNota { chiave: string; testo: string; fonte: string; versione: number; seed_json: string }

const guida = z.object({ versione: z.number().int(), testo: z.string().min(1), fonte: z.string().min(1) });

/** Il valore della guida (la copia in `seed_json`), o null se la copia non è leggibile. */
function valoreGuida(r: RigaNota): z.infer<typeof guida> | null {
  try { const e = guida.safeParse(JSON.parse(r.seed_json)); return e.success ? e.data : null; } catch { return null; }
}

/** Vero se le tabelle ci sono (uno schema di prima della 139 non ha note storiche). */
function conNote(): boolean {
  return !!prepared("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'nota_storica_legame'").get();
}

/** La nota come DTO, con se è diversa dalla guida. */
function dto(r: RigaNota): NotaStoricaOfferta {
  const g = valoreGuida(r);
  return { id: r.chiave, versione: r.versione, fonte: r.fonte, testo: r.testo, modificata: g !== null && (g.testo !== r.testo || g.fonte !== r.fonte) };
}

/** Le note storiche di una riga (un'offerta per chiave, un oggetto del catalogo per chiave); vuoto se non ne ha. */
export function noteStoricheDi(tipo: 'articolo' | 'catalogo', chiave: string): NotaStoricaOfferta[] {
  if (!conNote()) return [];
  return (prepared(`SELECT n.chiave, n.testo, n.fonte, n.versione, n.seed_json FROM nota_storica n JOIN nota_storica_legame l ON l.nota_chiave = n.chiave
    WHERE l.tipo = ? AND l.chiave = ? ORDER BY n.chiave`).all(tipo, chiave) as RigaNota[]).map(dto);
}

/** La riga della nota, o 404. */
function riga(chiave: string): RigaNota {
  const r = conNote() ? prepared('SELECT chiave, testo, fonte, versione, seed_json FROM nota_storica WHERE chiave = ?').get(chiave) as RigaNota | undefined : undefined;
  if (!r) throw httpErrors.notFound('nota-storica-non-trovata', 'Nota storica non trovata.');
  return r;
}

/** Modifica testo e fonte della nota. 409 se il testo è cambiato da quando la scheda è stata aperta. */
export function modificaNotaStorica(chiave: string, d: { testo: string; fonte: string; testoAttuale: string }): NotaStoricaOfferta {
  const testo = d.testo.trim(), fonte = d.fonte.trim();
  if (!testo || !fonte) throw httpErrors.badRequest('nota-storica-vuota', 'Testo e fonte della nota non possono essere vuoti.');
  getDb().transaction(() => {
    const r = riga(chiave);
    if (r.testo !== d.testoAttuale) throw httpErrors.conflict('nota-storica-cambiata', 'La nota è cambiata: riapri la scheda prima di modificarla.');
    prepared('UPDATE nota_storica SET testo = ?, fonte = ?, updated_at = ? WHERE chiave = ? AND testo = ?').run(testo, fonte, nowIso(), chiave, d.testoAttuale);
  })();
  invalidaCacheDiGioco();
  return dto(riga(chiave));
}

/** «Ripristina»: testo e fonte tornano come li dà la guida. 409 se la copia della guida non è leggibile o se il testo è cambiato nel
 *  frattempo. */
export function ripristinaNotaStorica(chiave: string, testoAttuale: string): NotaStoricaOfferta {
  getDb().transaction(() => {
    const r = riga(chiave);
    const g = valoreGuida(r);
    if (!g) throw httpErrors.conflict('nota-storica-senza-guida', 'Non è disponibile una copia valida della nota della guida.');
    if (r.testo !== testoAttuale) throw httpErrors.conflict('nota-storica-cambiata', 'La nota è cambiata: riapri la scheda prima di ripristinarla.');
    prepared('UPDATE nota_storica SET testo = ?, fonte = ?, updated_at = ? WHERE chiave = ? AND testo = ?').run(g.testo, g.fonte, nowIso(), chiave, testoAttuale);
  })();
  invalidaCacheDiGioco();
  return dto(riga(chiave));
}
