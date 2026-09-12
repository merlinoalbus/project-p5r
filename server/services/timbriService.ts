// ============================================================
// timbriService — i timbri raccolti nei dedali dei Memento, per partita
// ============================================================
//
// Il totale di un dedalo lo dichiara la guida (`dungeon_area.timbri_totale`, migrazione 077); quanti
// ne ha presi la partita sta in `timbri_dedalo_partita` (file delle partite, migrazione utente 003).
// Il valore si tiene fra zero e il totale; l'evento si registra ogni volta che il totale viene
// raggiunto salendo (come per le richieste completate). Dove la guida non dichiara i timbri (Qimranut,
// Chemdah, Iweleth) non c'è niente da contare: la scrittura viene rifiutata invece di sparire.
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { registraEvento } from './storicoService.js';
import type { TimbriDedaloDto } from '../../shared/types.js';

interface RigaArea { chiave: string; nome: string; dungeon_chiave: string; timbri_totale: number | null }

export function timbriPartita(partitaId: number): Map<string, number> {
  return new Map((prepared('SELECT area_chiave, raccolti FROM timbri_dedalo_partita WHERE partita_id = ?').all(partitaId) as Array<{ area_chiave: string; raccolti: number }>).map((r) => [r.area_chiave, r.raccolti]));
}

/** Imposta i timbri raccolti in un dedalo (0 = azzera); evento ogni volta che il totale viene raggiunto salendo. */
export function impostaTimbri(partitaId: number, area: string, raccolti: number): TimbriDedaloDto {
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  const a = prepared('SELECT chiave, nome, dungeon_chiave, timbri_totale FROM dungeon_area WHERE chiave = ?').get(area) as RigaArea | undefined;
  if (!a) throw httpErrors.notFound('area-non-trovata', `L'area '${area}' non esiste.`);
  if (a.dungeon_chiave !== 'mementos') throw httpErrors.badRequest('non-un-dedalo', `'${area}' non è un dedalo dei Memento: i timbri si contano solo lì.`);
  if (!Number.isInteger(raccolti) || raccolti < 0) throw httpErrors.badRequest('timbri-non-validi', 'I timbri raccolti sono un intero non negativo.');
  if (a.timbri_totale === null) throw httpErrors.badRequest('timbri-non-dichiarati', `La guida non dichiara i timbri di '${a.nome}': non c'è un totale da raggiungere.`);
  const totale = a.timbri_totale;
  const valore = Math.min(raccolti, totale);
  const adesso = nowIso();
  getDb().transaction(() => {
    const prima = (prepared('SELECT raccolti FROM timbri_dedalo_partita WHERE partita_id = ? AND area_chiave = ?').get(partitaId, area) as { raccolti: number } | undefined)?.raccolti ?? 0;
    if (valore === 0) prepared('DELETE FROM timbri_dedalo_partita WHERE partita_id = ? AND area_chiave = ?').run(partitaId, area);
    else prepared('INSERT INTO timbri_dedalo_partita (partita_id, area_chiave, raccolti, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, area_chiave) DO UPDATE SET raccolti = excluded.raccolti, updated_at = excluded.updated_at').run(partitaId, area, valore, adesso);
    if (valore >= totale && prima < totale) {
      registraEvento(partitaId, 'timbri-dedalo', `${a.nome}: tutti i timbri raccolti`, `${totale} timbri su ${totale}.`, { area, raccolti: valore });
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  return { area, raccolti: valore, totale, completato: valore >= totale };
}
