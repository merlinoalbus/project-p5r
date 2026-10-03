// ============================================================
// Schemi zod — correzione dei testi della guida ai Palazzi (dungeon, aree, punti)
// ============================================================
//
// La sezione dei Palazzi era l'unica parte della guida in sola lettura: qui entrano le forme di
// quel che si può correggere. I testi sono dati di gioco, quindi finiscono nel pacchetto.
//
// **I tetti sono misurati sui dati veri, non scelti a occhio** (correzione del 2026-09-18): il
// primo giro ne aveva uno da 200 caratteri sul livello consigliato, dove la guida ne scrive 352
// per Kamoshida — risultato: la scheda del Palazzo non si poteva salvare affatto, perché il modulo
// rimanda indietro anche i campi che non hai toccato. Ora ogni tetto sta molto sopra il massimo
// osservato (la prosa più lunga oggi è una nota da 3938 caratteri), e un test risalva ogni Palazzo
// così com'è per accorgersi subito se un dato nuovo li supera.

import { z } from 'zod';
import { LIMITI_GUIDA } from '../../shared/limitiGuida.js';
import { idParam } from './comuni.js';

const TIPI_PUNTO = ['sicura', 'porta', 'meccanismo', 'forziere', 'forziere-chiuso', 'volonta', 'puzzle', 'miniboss', 'boss', 'ombra-sciagura', 'persona', 'oggetto', 'scorciatoia', 'storia', 'altro'] as const;

export const paramsChiaveGuida = z.object({ chiave: z.string().min(1).max(200) });
export const bodyDungeon = z.object({
  nome: z.string().trim().min(1).max(LIMITI_GUIDA.dungeon.nome).optional(), sovrano: z.string().max(LIMITI_GUIDA.dungeon.sovrano).optional(),
  dataSblocco: z.string().max(LIMITI_GUIDA.dungeon.data).optional(), dataScadenza: z.string().max(LIMITI_GUIDA.dungeon.data).optional(), furtoConsigliato: z.string().max(LIMITI_GUIDA.dungeon.data).optional(),
  livelloConsigliato: z.string().max(LIMITI_GUIDA.dungeon.livello).optional(), note: z.string().max(LIMITI_GUIDA.dungeon.note).optional(),
});
export const bodyArea = z.object({ nome: z.string().trim().min(1).max(LIMITI_GUIDA.area.nome).optional(), descrizione: z.string().max(LIMITI_GUIDA.area.descrizione).optional() });
export const bodyPunto = z.object({
  nome: z.string().trim().min(1).max(LIMITI_GUIDA.punto.nome).optional(), descrizione: z.string().max(LIMITI_GUIDA.punto.descrizione).optional(),
  tipo: z.enum(TIPI_PUNTO).optional(), esauribile: z.boolean().optional(), ordine: z.number().int().min(0).max(9999).optional(),
  /** L'Enigma di cui la voce è un passo (095); null = voce dell'area. */
  contenitore: z.string().min(1).max(200).nullable().optional(),
});
export const bodyNuovoPunto = bodyPunto.extend({ nome: z.string().trim().min(1).max(LIMITI_GUIDA.punto.nome), tipo: z.enum(TIPI_PUNTO) });
/** Una sezione nuova della guida: dove va (`dopo` un'area, `null` in cima, assente in fondo) e, se c'è, la planimetria che la contiene. */
export const bodyNuovaArea = z.object({
  nome: z.string().trim().min(1).max(LIMITI_GUIDA.area.nome), descrizione: z.string().max(LIMITI_GUIDA.area.descrizione).optional(),
  dopo: z.string().min(1).max(200).nullable().optional(), planimetria: z.string().min(1).max(200).optional(),
});
/** Un posto su o giù nella guida dell'area. */
export const bodySpostaPunto = z.object({ verso: z.union([z.literal(-1), z.literal(1)]) });
/** Il pin di una planimetria da collegare o scollegare (`PUT` / `DELETE`). */
export const paramsPinDelPunto = z.object({ chiave: z.string().min(1).max(200), spillo: idParam });
