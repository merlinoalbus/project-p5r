// ============================================================
// timbriService — i timbri raccolti nei dedali dei Memento, per partita
// ============================================================
//
// L10-02 (risposta dell'utente Q8 A, migrazione 382): la guida dà i timbri per dedalo, e il totale sta nel dedalo
// (`dungeon_area.timbri_totale`, solo i dedali dei Memento; null = la guida non dà un numero). Quanti ne ha presi la partita sta in
// `timbri_dedalo_partita` (file delle partite, utente 003), per dedalo: `area_chiave` vale la chiave del dedalo (utente 070), come
// `richiesta.area_chiave`. Il valore si tiene fra zero e il totale; l'evento si registra ogni volta che il totale viene raggiunto salendo
// (come per le richieste completate). Un dedalo senza totale non ha niente da contare: la scrittura viene rifiutata col motivo, invece di
// sparire.
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';
import { verificaPartita } from './verificaPartita.js';
import { registraEvento } from './storicoService.js';
import type { TimbriDedaloDto } from '../../shared/types.js';

/** Il blocco di `dati_guida` con la fonte di ogni totale e il motivo dei dedali senza (migrazione 382). */
export const BLOCCO_TIMBRI = 'timbri-dei-dedali';

/** Ciò che la migrazione 382 ha scritto per ogni dedalo: il totale della guida con la sua fonte, o il motivo per cui non c'è. */
const schemaFonte = z.object({ totale: z.number().int().min(0).nullable(), fonte: z.string().min(1).nullable(), motivo: z.string().min(1).nullable() });
const schemaDedali = z.record(z.string(), schemaFonte);
const schemaDichiarati = z.object({ totale: z.number().int().min(0), fonte: z.string().min(1) });
type FonteTimbri = z.infer<typeof schemaFonte>;
interface BloccoTimbri { dedali?: Record<string, FonteTimbri>; dichiarati?: z.infer<typeof schemaDichiarati> }

/**
 * Il blocco delle fonti dei timbri (vuoto se non c'è). Ogni parte esce solo se ha la forma attesa: se il JSON non si legge, o una parte (le fonti
 * dei dedali, il dichiarato della guida) ha un'altra forma, lo si scrive nel log con la chiave e quella parte manca. I totali dei timbri restano
 * comunque quelli del dedalo: mancano solo la fonte da mostrare, il dichiarato della guida o il motivo dei dedali senza.
 */
export function bloccoTimbri(): BloccoTimbri {
  const json = prepared('SELECT json FROM dati_guida WHERE chiave = ?').pluck().get(BLOCCO_TIMBRI) as string | undefined;
  if (!json) return {};
  let grezzo: unknown;
  try { grezzo = JSON.parse(json); } catch (e) {
    logger.error({ chiave: BLOCCO_TIMBRI, errore: e instanceof Error ? e.message : String(e) }, 'blocco dei timbri illeggibile in dati_guida: senza fonti, dichiarato né motivi');
    return {};
  }
  const b = grezzo && typeof grezzo === 'object' ? grezzo as Record<string, unknown> : {};
  const dedali = schemaDedali.safeParse(b.dedali);
  const dichiarati = schemaDichiarati.safeParse(b.dichiarati);
  if (!dedali.success) logger.error({ chiave: BLOCCO_TIMBRI, parte: 'dedali', errore: dedali.error.message }, 'fonti dei timbri dei dedali con un’altra forma: non si mostrano');
  if (!dichiarati.success) logger.error({ chiave: BLOCCO_TIMBRI, parte: 'dichiarati', errore: dichiarati.error.message }, 'timbri dichiarati dalla guida con un’altra forma: non si mostrano');
  return { ...(dedali.success ? { dedali: dedali.data } : {}), ...(dichiarati.success ? { dichiarati: dichiarati.data } : {}) };
}

/** La fonte del totale di un dedalo, finché il totale è quello della guida (un totale scritto dall'utente non ha la fonte della guida). */
export function fonteDelTotale(blocco: BloccoTimbri, dedalo: string, totale: number | null): string | null {
  const f = blocco.dedali?.[dedalo];
  return f && totale !== null && f.totale === totale ? f.fonte : null;
}

/** I timbri raccolti nella partita, per dedalo (i dedali senza riga non compaiono). Non verifica la partita. */
export function timbriPartita(partitaId: number): Map<string, number> {
  return new Map((prepared('SELECT area_chiave, raccolti FROM timbri_dedalo_partita WHERE partita_id = ?').all(partitaId) as Array<{ area_chiave: string; raccolti: number }>).map((r) => [r.area_chiave, r.raccolti]));
}

/** I timbri raccolti nella partita in tutti i dedali con un totale, ciascuno entro il suo totale (le sfide del Covo li contano). */
export function timbriRaccoltiInTutto(partitaId: number): number {
  return (prepared(`SELECT COALESCE(SUM(MIN(t.raccolti, d.timbri_totale)), 0) FROM timbri_dedalo_partita t
    JOIN dungeon_area d ON d.chiave = t.area_chiave JOIN dungeon g ON g.chiave = d.dungeon_chiave
    WHERE t.partita_id = ? AND g.tipo = 'mementos' AND d.timbri_totale IS NOT NULL`).pluck().get(partitaId) as number);
}

interface RigaDedalo { chiave: string; nome: string; timbri_totale: number | null; tipo: string }

/** Imposta i timbri raccolti in un dedalo dei Memento (0 = azzera); evento ogni volta che il totale viene raggiunto salendo. */
export function impostaTimbri(partitaId: number, dedalo: string, raccolti: number): TimbriDedaloDto {
  verificaPartita(partitaId);
  const d = prepared('SELECT a.chiave, a.nome, a.timbri_totale, g.tipo FROM dungeon_area a JOIN dungeon g ON g.chiave = a.dungeon_chiave WHERE a.chiave = ?').get(dedalo) as RigaDedalo | undefined;
  if (!d || d.tipo !== 'mementos') {
    // un'area di un dedalo, o un'infiltrazione di un Palazzo, non è un dedalo: lo si dice
    if (d || prepared('SELECT 1 FROM area_dedalo WHERE chiave = ?').get(dedalo)) throw httpErrors.badRequest('non-un-dedalo', `'${dedalo}' non è un dedalo dei Memento: i timbri si contano nel dedalo.`);
    throw httpErrors.notFound('dedalo-non-trovato', `Il dedalo '${dedalo}' non esiste.`);
  }
  if (!Number.isInteger(raccolti) || raccolti < 0) throw httpErrors.badRequest('timbri-non-validi', 'I timbri raccolti sono un intero non negativo.');
  if (d.timbri_totale === null) {
    const motivo = bloccoTimbri().dedali?.[dedalo]?.motivo;
    throw httpErrors.badRequest('timbri-non-dichiarati', `${d.nome} non ha un totale di timbri${motivo ? ` (${motivo})` : ''}: impostalo nel dedalo per contarli.`);
  }
  const totale = d.timbri_totale;
  const valore = Math.min(raccolti, totale);
  const adesso = nowIso();
  getDb().transaction(() => {
    const prima = Math.min((prepared('SELECT raccolti FROM timbri_dedalo_partita WHERE partita_id = ? AND area_chiave = ?').get(partitaId, dedalo) as { raccolti: number } | undefined)?.raccolti ?? 0, totale);
    if (valore === 0) prepared('DELETE FROM timbri_dedalo_partita WHERE partita_id = ? AND area_chiave = ?').run(partitaId, dedalo);
    else prepared('INSERT INTO timbri_dedalo_partita (partita_id, area_chiave, raccolti, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, area_chiave) DO UPDATE SET raccolti = excluded.raccolti, updated_at = excluded.updated_at').run(partitaId, dedalo, valore, adesso);
    if (valore >= totale && prima < totale) {
      registraEvento(partitaId, 'timbri-dedalo', `${d.nome}: tutti i timbri raccolti`, `${totale} timbri su ${totale}.`, { dedalo, raccolti: valore });
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  return { dedalo, raccolti: valore, totale, completato: valore >= totale };
}
