// ============================================================
// Schemi zod — compendio (elenchi e dettagli)
// ============================================================

import { z } from 'zod';
import { boolQuery, dataGioco, dote, idParam, livello, testoRicerca, uidVoce } from './comuni.js';
import { TIPI_AZIONE, TIPI_RIFERIMENTO_AZIONE, type TipoAzione, type TipoRiferimentoAzione } from '../../shared/effettiAzione.js';
import { bodySalvaEffettiVoce } from './acquisti.js';
import { MASSIMO_VOCI_APPUNTI } from '../../shared/appuntiDiario.js';

export const paramsId = z.object({ id: idParam });

export const queryPersona = z.object({
  q: testoRicerca,
  arcana: z.string().trim().min(1).max(40).optional(),
  livelloMin: livello.optional(),
  livelloMax: livello.optional(),
  dlc: boolQuery,
  rara: boolQuery,
  speciale: boolQuery,
  skill: z.string().trim().min(1).max(80).optional(),
  /** Include le forme delle Persona del gruppo (L8): le usa solo il compendio. */
  delGruppo: boolQuery,
});
export type QueryPersona = z.infer<typeof queryPersona>;

export const querySkill = z.object({
  q: testoRicerca,
  elemento: z.string().trim().min(1).max(20).optional(),
});

export const queryOggetti = z.object({
  q: testoRicerca,
  categoria: z.string().trim().min(1).max(20).optional(),
});

// ---- Guida giorno per giorno: le voci della giornata (canone, per tutte le partite) ----

export const paramsGiornoGuida = z.object({ data: dataGioco });
/** Tipo, collegamento, rango atteso ed effetti di una voce della giornata: i valori
 *  ammessi sono gli elenchi chiusi di `shared/effettiAzione.ts`; che gli elementi esistano lo verifica il servizio. */
const campiAzioneStrutturata = {
  tipo: z.enum(TIPI_AZIONE.map((t) => t.chiave) as [TipoAzione, ...TipoAzione[]]).optional(),
  riferimento: z.object({ tipo: z.enum(TIPI_RIFERIMENTO_AZIONE.map((t) => t.chiave) as [TipoRiferimentoAzione, ...TipoRiferimentoAzione[]]), chiave: z.string().trim().min(1).max(200) }).nullable().optional(),
  rangoAtteso: z.number().int().min(1).max(10).nullable().optional(),
  // la descrizione è solo documentazione (OpenAPI): ogni voce la normalizza il servizio con le regole di shared/effettiAzione.ts
  produce: z.array(z.unknown().meta({ description: 'Un effetto `EffettoAzione` (shared/effettiAzione.ts): `{ tipo: "dote", dote, note }`, `{ tipo: "lettura", categoria, chiave, almeno }` oppure `{ tipo: "turno", attivita, doti? }`.' })).max(20).optional(),
  revisioneEffettiAttesa: z.string().regex(/^[0-9a-f]{64}$/).optional(),
  effettiVoce: bodySalvaEffettiVoce.partial({ revisioneEffettiAttesa: true }).strict().optional(),
};
/** Una voce della giornata (azione della guida, cosa da fare, evento): canone, per tutte le partite. */
export const paramsVoceGiornata = z.object({ uid: uidVoce });
const campiVoce = {
  genere: z.enum(['azione', 'promemoria']).optional(),
  // la guida ha azioni fino a ~780 caratteri e note fino a ~820: il margine lascia scrivere senza tagliare
  azione: z.string().trim().min(1).max(2000).optional(),
  note: z.string().trim().max(2000).nullable().optional(),
  fascia: z.enum(['giorno', 'sera']).optional(),
  /** Il posto nella fascia, da 0 (in cima). */
  posizione: z.number().int().min(0).max(500).optional(),
  ...campiAzioneStrutturata,
};
export const bodyNuovaVoce = z.object({ ...campiVoce, azione: z.string().trim().min(1).max(2000) })
  .refine(b => b.produce === undefined || b.effettiVoce === undefined, 'Invia un’unica fonte degli effetti.')
  .refine(b => b.effettiVoce === undefined || (b.effettiVoce.revisioneEffettiAttesa === undefined && b.effettiVoce.effetti.every(e => e.uid === null)), 'Una voce nuova non ha token o UID effetti preesistenti.');
export const bodyAggiornaVoce = z.object({
  ...campiVoce,
  /** L3: l'insieme ordinato delle infiltrazioni della voce (anche vuoto = «nessuna»); si manda da solo. */
  infiltrazioni: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
})
  .refine(b => b.produce === undefined || b.effettiVoce === undefined, 'Invia un’unica fonte degli effetti.')
  .refine(b => b.effettiVoce === undefined || !!b.effettiVoce.revisioneEffettiAttesa, 'Ricarica la revisione della fonte prima di modificarla.')
  .refine((b) => Object.values(b).some((v) => v !== undefined), { message: 'Indica almeno un campo da cambiare (testo, note, genere, fascia, posizione, tipo, collegamento, rango atteso, effetti o infiltrazioni).' });
/** L3 §1.4: l'esito di «da rivedere» su una voce. */
export const bodyRivistaVoce = z.object({ esito: z.enum(['tieni', 'rimetti', 'fatto']) });
export const bodySpostaVoce = z.object({ verso: z.union([z.literal(-1), z.literal(1)]) });
/** Copiare o spostare una o più voci in un altro giorno e fascia (2026-10-12): le voci, in fondo alla fascia, nel loro ordine. */
export const bodyTrasferisciVoci = z.object({
  uid: z.array(uidVoce).min(1).max(200).refine((u) => new Set(u).size === u.length, { message: 'Una voce compare due volte.' }),
  giorno: dataGioco,
  fascia: z.enum(['giorno', 'sera']),
  modo: z.enum(['copia', 'sposta']),
});

// ---- Appunti del Diario (2026-10-26): Copia / Taglia / Incolla con gli appunti di sistema ----

/** Le voci da mettere negli appunti (sola lettura): da 1 a 200, senza ripetizioni. */
export const bodyEsportaAppunti = z.object({
  uid: z.array(uidVoce).min(1).max(MASSIMO_VOCI_APPUNTI).refine((u) => new Set(u).size === u.length, { message: 'Una voce compare due volte.' }),
}).strict();
const fasciaAppunti = z.enum(['giorno', 'sera']);
/** Un effetto della voce negli appunti: l'effetto è libero qui (lo riconosce `normalizzaEffettoVoce` nel servizio, integralmente). */
const effettoAppunti = z.object({
  uid: uidVoce,
  effetto: z.unknown().meta({ description: 'Un effetto `EffettoVoce` (shared/effettiVoce.ts), con tutti i suoi valori.' }),
  origine: z.enum(['seed', 'regola', 'utente']),
}).strict();
/** Una voce negli appunti (`VoceAppunti`, shared/appuntiDiario.ts): forma e limiti; il servizio verifica che ciò che cita esista ancora. */
const voceAppunti = z.object({
  uid: uidVoce,
  origine: z.object({ giorno: dataGioco, fascia: fasciaAppunti, posto: z.number().int().min(0).max(100000), indiceGuida: z.number().int().min(0).max(100000).nullable() }).strict(),
  genere: z.string().min(1).max(20),
  azione: z.string().max(2000),
  note: z.string().max(2000).nullable(),
  tipo: z.string().min(1).max(40),
  riferimento: z.object({ tipo: z.string().min(1).max(40), chiave: z.string().min(1).max(200) }).strict().nullable(),
  riferimentoTesto: z.string().max(400).nullable(),
  rangoAtteso: z.number().int().min(1).max(10).nullable(),
  effetti: z.object({
    stato: z.enum(['convertita', 'legacy-da-correggere']),
    elementi: z.array(effettoAppunti).max(60),
    rawLegacy: z.string().max(200000),
    motivo: z.string().max(2000).nullable(),
  }).strict(),
  infiltrazioni: z.array(z.string().min(1).max(160)).max(60),
  daRivedere: z.boolean(),
}).strict();
/** Il blocco degli appunti (`AppuntiDiario`): formato e versione si controllano nel servizio, con un messaggio che dice che cosa fare. */
const appuntiDiario = z.object({
  formato: z.string().max(40),
  versione: z.number().int().min(0).max(1000),
  modo: z.enum(['copia', 'taglia']),
  taglio: z.string().regex(/^[0-9a-f]{32}$/).optional(),
  creatoIl: z.string().max(40),
  voci: z.array(voceAppunti).min(1).max(MASSIMO_VOCI_APPUNTI),
}).strict();
/** L'anteprima dell'incolla: il blocco, il giorno aperto, la voce selezionata dopo cui incollare (facoltativa). */
export const bodyIncollaAnteprima = z.object({ appunti: appuntiDiario, giorno: dataGioco, dopoUid: uidVoce.optional() }).strict();
/** L'incolla: come l'anteprima, più la conferma dei rilievi del piano mostrato e la scelta «senza gli effetti segnalati». */
export const bodyIncollaVoci = bodyIncollaAnteprima.extend({
  conferma: z.boolean().optional(),
  impronta: z.string().regex(/^[0-9a-f]{64}$/).optional(),
  senzaSegnalati: z.boolean().optional(),
}).strict();
/** L'operazione registrata da annullare. */
export const paramsOperazioneVoci = z.object({ id: z.string().regex(/^[0-9a-f]{32}$/, 'Identità dell’operazione non valida.') });

/** La Dote a ogni incontro di un Confidente, rango per rango: Doti chiuse, note 1–3, al massimo cinque per rango. */
export const bodyDotiIncontro = z.object({
  ranghi: z.array(z.object({
    rango: z.number().int().min(1).max(10),
    doti: z.array(z.object({ dote, note: z.union([z.literal(1), z.literal(2), z.literal(3)]) })).max(5),
  })).min(1).max(10),
});
