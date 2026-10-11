// ============================================================
// timbriService — i timbri raccolti nelle aree dei dedali dei Memento, per partita
// ============================================================
//
// Il totale sta nell'area del dedalo (`area_dedalo.timbri_totale`, migrazione 099: prima era del dedalo, 077) e lo imposta
// chi gioca; quanti ne ha presi la partita sta in `timbri_dedalo_partita` (file delle partite, utente 003), per area del
// dedalo (utente 018). Il valore si tiene fra zero e il totale; l'evento si registra ogni volta che il totale viene
// raggiunto salendo (come per le richieste completate). Un'area senza timbri non ha niente da contare: la scrittura viene
// rifiutata invece di sparire.
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { verificaPartita } from './verificaPartita.js';
import { registraEvento } from './storicoService.js';
import type { TimbriDedaloDto } from '../../shared/types.js';

interface RigaArea { chiave: string; nome: string; dedalo_nome: string; timbri_totale: number | null }

/** I timbri raccolti nella partita, per area del dedalo (le aree senza riga non compaiono). Non verifica la partita. */
export function timbriPartita(partitaId: number): Map<string, number> {
  return new Map((prepared('SELECT area_chiave, raccolti FROM timbri_dedalo_partita WHERE partita_id = ?').all(partitaId) as Array<{ area_chiave: string; raccolti: number }>).map((r) => [r.area_chiave, r.raccolti]));
}

/** Imposta i timbri raccolti in un'area del dedalo (0 = azzera); evento ogni volta che il totale viene raggiunto salendo. */
export function impostaTimbri(partitaId: number, area: string, raccolti: number): TimbriDedaloDto {
  verificaPartita(partitaId);
  const a = prepared('SELECT ad.chiave, ad.nome, d.nome AS dedalo_nome, ad.timbri_totale FROM area_dedalo ad JOIN dungeon_area d ON d.chiave = ad.dedalo_chiave WHERE ad.chiave = ?').get(area) as RigaArea | undefined;
  if (!a) {
    // una chiave di un'area della guida (un dedalo, o un'area di un Palazzo) non è un'area del dedalo: lo si dice
    if (prepared('SELECT 1 FROM dungeon_area WHERE chiave = ?').get(area)) throw httpErrors.badRequest('non-un-area-del-dedalo', `'${area}' non è un'area di un dedalo dei Memento: i timbri si contano nelle aree dei dedali.`);
    throw httpErrors.notFound('area-dedalo-non-trovata', `L'area del dedalo '${area}' non esiste.`);
  }
  if (!Number.isInteger(raccolti) || raccolti < 0) throw httpErrors.badRequest('timbri-non-validi', 'I timbri raccolti sono un intero non negativo.');
  if (a.timbri_totale === null) throw httpErrors.badRequest('timbri-non-dichiarati', `«${a.nome}» di ${a.dedalo_nome} non ha timbri: impostane il totale nell'area.`);
  const totale = a.timbri_totale;
  const valore = Math.min(raccolti, totale);
  const adesso = nowIso();
  getDb().transaction(() => {
    const prima = (prepared('SELECT raccolti FROM timbri_dedalo_partita WHERE partita_id = ? AND area_chiave = ?').get(partitaId, area) as { raccolti: number } | undefined)?.raccolti ?? 0;
    if (valore === 0) prepared('DELETE FROM timbri_dedalo_partita WHERE partita_id = ? AND area_chiave = ?').run(partitaId, area);
    else prepared('INSERT INTO timbri_dedalo_partita (partita_id, area_chiave, raccolti, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, area_chiave) DO UPDATE SET raccolti = excluded.raccolti, updated_at = excluded.updated_at').run(partitaId, area, valore, adesso);
    if (valore >= totale && prima < totale) {
      registraEvento(partitaId, 'timbri-dedalo', `${a.dedalo_nome} · ${a.nome}: tutti i timbri raccolti`, `${totale} timbri su ${totale}.`, { area, raccolti: valore });
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  return { area, raccolti: valore, totale, completato: valore >= totale };
}
