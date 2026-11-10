// ============================================================
// contenutiGuidaService — le sezioni della guida dei Palazzi viste da una mappa: destinazioni e percorsi
// ============================================================
//
// Una vecchia mappa d'area (alias in `guida_alias`) oggi è una sezione della guida dentro la mappa del suo
// Palazzo: qui si risolve dove porta un percorso. L'elenco dei contenuti della guida di una mappa (`GET /api/mappe/contenuti/:chiave`)
// non c'è più: nessuna pagina lo chiamava (L12-04, Q20); i contenuti si leggono dalla scheda del Palazzo.
// ============================================================

import { prepared } from '../../db/dbService.js';
import { httpErrors } from '../../utils/httpError.js';
import { chiaveMappa, idMappa } from './percorsiMappe.js';
import { casaDellaMappa, casaDelPalazzo, contestoAree, type RigaPerCasa } from './casaMappa.js';
import { radiceDelPalazzo } from './alberoMappe.js';
import type { DestinazioneGuidaDto, RisoluzioneMappaDto } from '../../../shared/organizzazioneMappe.js';

/**
 * Dove si apre la sezione di guida di un'infiltrazione: la mappa del suo Palazzo, il nome (quello dell'infiltrazione: da L3 il nome
 * della sezione non è più quello di `guida_mappa`, tolta da L11 · B9, R3-09) e la casa — la scheda del Palazzo sull'infiltrazione,
 * `/guida/dungeon/<k>?infiltrazione=<i>` (L3 §3.2); per i Memento, che non hanno scheda di Palazzo, il visore com'era (R3-12). Null se
 * l'infiltrazione non esiste o se il Palazzo non ha esattamente una mappa radice.
 */
export function destinazioneGuida(area: string): DestinazioneGuidaDto | null {
  const r = prepared("SELECT a.chiave,a.dungeon_chiave,a.nome,d.tipo FROM dungeon_area a JOIN dungeon d ON d.chiave=a.dungeon_chiave WHERE a.chiave=?").get(area) as { chiave: string; dungeon_chiave: string; nome: string; tipo: string } | undefined;
  if (!r) return null;
  // la mappa radice del Palazzo è `dungeon-<chiave>` (senza genitore, tipo palazzo o dedalo): la sua esistenza è la prova che ce n'è una
  const radice = radiceDelPalazzo(r.dungeon_chiave);
  if (!prepared("SELECT 1 FROM mappa WHERE chiave=? AND genitore_chiave IS NULL AND tipo IN ('palazzo','dedalo')").get(radice)) return null;
  const mappaPalazzo = chiaveMappa(radice);
  // la scheda del Palazzo; per i Memento il visore com'era
  const casa = r.tipo === 'palazzo' ? `${casaDelPalazzo(r.dungeon_chiave)}?infiltrazione=${encodeURIComponent(area)}` : `/guida/mappe/${encodeURIComponent(mappaPalazzo)}?area=${encodeURIComponent(area)}`;
  return { area, dungeon: r.dungeon_chiave, mappaPalazzo, nome: r.nome, casa };
}

/**
 * Che cosa apre un percorso di mappa: se è l'alias di una vecchia mappa d'area con una destinazione valida, la sezione di
 * guida; altrimenti la mappa con quella chiave (404 se non esiste).
 */
export function risolviPercorsoMappa(chiave: string): RisoluzioneMappaDto {
  const guida = prepared('SELECT area_chiave FROM guida_alias WHERE chiave=?').get(chiave) as { area_chiave: string } | undefined;
  if (guida) {
    const d = destinazioneGuida(guida.area_chiave);
    if (d) return { tipo: 'guida', ...d };
  }
  const mappa = idMappa(chiave);
  const riga = prepared('SELECT * FROM mappa WHERE chiave=?').get(mappa) as RigaPerCasa | undefined;
  if (!riga) throw httpErrors.notFound('mappa-non-trovata','La mappa o il contenuto richiesto non esiste.');
  // L2: la casa della mappa a cui porta la chiave (o l'alias): un alias vecchio di una versione apre l'Area su quella versione
  return { tipo: 'mappa', mappa: chiaveMappa(mappa), casa: casaDellaMappa(riga, contestoAree()) };
}
