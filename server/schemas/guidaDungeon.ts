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
  /** L'area del dedalo della voce (099): solo nei dedali dei Memento. */
  areaDedalo: z.string().min(1).max(200).optional(),
});
export const bodyNuovoPunto = bodyPunto.extend({ nome: z.string().trim().min(1).max(LIMITI_GUIDA.punto.nome), tipo: z.enum(TIPI_PUNTO) });

/** Il totale dei timbri di un'area del dedalo: un intero da 0 al tetto, o null (l'area non ha timbri). */
const timbriTotale = z.number().int().min(0).max(LIMITI_GUIDA.areaDedalo.timbri).nullable();
/** Un'area di un dedalo dei Memento da correggere (099): nome, dettagli, totale dei timbri. */
export const bodyAreaDedalo = z.object({
  nome: z.string().trim().min(1).max(LIMITI_GUIDA.areaDedalo.nome).optional(), descrizione: z.string().max(LIMITI_GUIDA.areaDedalo.descrizione).optional(),
  timbriTotale: timbriTotale.optional(),
});
/** Un'area nuova di un dedalo (099): nasce in fondo. */
export const bodyNuovaAreaDedalo = bodyAreaDedalo.extend({ nome: z.string().trim().min(1).max(LIMITI_GUIDA.areaDedalo.nome) });
/** Una sezione nuova della guida: dove va (`dopo` un'area, `null` in cima, assente in fondo) e, se c'è, la planimetria che la contiene. */
export const bodyNuovaArea = z.object({
  nome: z.string().trim().min(1).max(LIMITI_GUIDA.area.nome), descrizione: z.string().max(LIMITI_GUIDA.area.descrizione).optional(),
  dopo: z.string().min(1).max(200).nullable().optional(), planimetria: z.string().min(1).max(200).optional(),
});
/** Un posto su o giù nella guida dell'area. */
export const bodySpostaPunto = z.object({ verso: z.union([z.literal(-1), z.literal(1)]) });
/** Il pin di una planimetria da collegare o scollegare (`PUT` / `DELETE`). */
export const paramsPinDelPunto = z.object({ chiave: z.string().min(1).max(200), spillo: idParam });

/** Il giorno MM-GG del calendario di gioco (l'esistenza del giorno la controlla il servizio con `dataValida`). */
const giornoGioco = z.string().regex(/^\d{2}-\d{2}$/, 'Il giorno è nel formato MM-GG.');

/** La finestra del Palazzo sulla mappa di Tokyo (2026-10-04): da quando c'è e fino a quando (null = senza fine). */
export const bodyFinestraDungeon = z.object({ dal: giornoGioco, al: giornoGioco.nullable() });

/**
 * Le regole d'atterraggio dalla mappa di Tokyo (2026-10-04), nell'ordine in cui si provano: quando valgono (date nulle = sempre;
 * `al` nullo = da `dal` in poi; `dal` = `al` = un giorno solo), la planimetria del Palazzo (chiave pubblica) e il pin d'arrivo.
 */
export const bodyAtterraggi = z.object({
  regole: z.array(z.object({
    dal: giornoGioco.nullable(),
    al: giornoGioco.nullable(),
    mappa: z.string().trim().min(1).max(200),
    spillo: z.number().int().positive().nullable(),
  })).max(30),
});

/** L'area del dedalo in cui collocare una Richiesta (099); null la toglie dall'area (resta nel dedalo, da collocare). */
export const bodyCollocaRichiesta = z.object({ areaDedalo: z.string().min(1).max(200).nullable() });

/* ---- Le Richieste dei Mementos modificabili (2026-10-11: «Modifica, aggiungi, elimina») ---- */
const R = LIMITI_GUIDA.richiesta;
/** Un elenco di voci brevi (debolezze, resistenze, ricompense): spazi tolti, vuote scartate. */
const elencoVoci = z.array(z.string().trim().max(R.voce)).max(R.voci).transform((v) => v.filter((x) => x.length > 0));
/** Il bersaglio della Richiesta: nome obbligatorio, il resto facoltativo. */
const bersaglio = z.object({
  nome: z.string().trim().min(1).max(R.nome), formaDemoniaca: z.string().trim().max(R.voce).default(''),
  livello: z.number().int().min(1).max(99).nullable().default(null),
  debolezze: elencoVoci.default([]), resistenze: elencoVoci.default([]), vulnerabileConfusione: z.boolean().default(false),
});
/** I campi di una Richiesta da correggere: si cambiano solo quelli inviati. `dedalo` e `areaDedalo` dicono dove sta (null = in
 *  nessun dedalo / da collocare). */
export const bodyRichiesta = z.object({
  nome: z.string().trim().min(1).max(R.nome).optional(), committente: z.string().trim().max(R.breve).optional(),
  disponibileDal: z.string().trim().max(R.breve).optional(), scadenza: z.string().trim().max(R.breve).optional(),
  dedalo: z.string().min(1).max(200).nullable().optional(), areaDedalo: z.string().min(1).max(200).nullable().optional(),
  piano: z.string().trim().max(R.breve).optional(), bersaglio: bersaglio.optional(), ricompense: elencoVoci.optional(),
  confidente: z.string().min(1).max(200).nullable().optional(), confidenteRango: z.number().int().min(1).max(R.rango).nullable().optional(),
  note: z.string().trim().max(R.note).optional(),
});
/** Una Richiesta nuova: nome e bersaglio obbligatori. */
export const bodyNuovaRichiesta = bodyRichiesta.extend({ nome: z.string().trim().min(1).max(R.nome), bersaglio });

/** Un requisito di un Confidente: confidente, rango e indice nel rango (2026-10-11, correzione dei requisiti sulle Richieste). */
export const paramsRequisitoConfidente = z.object({ chiave: z.string().min(1).max(200), rango: z.coerce.number().int().min(1).max(10), indice: z.coerce.number().int().min(0).max(99) });
/** La Richiesta che il requisito cita al posto di quella di prima. */
export const bodyRequisitoRichiesta = z.object({ richiesta: z.string().min(1).max(200) });
