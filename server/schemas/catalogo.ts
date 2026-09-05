import { condizioneSpillo } from './mappe.js';
// ============================================================
// Schemi zod — catalogo estensibile dall'utente e agenda del giorno (Fase 16.1)
// ============================================================

import { z } from 'zod';

const dataGioco = z.string().regex(/^\d{2}-\d{2}$/, 'La data del gioco è nel formato MM-GG.');
const testo = (max: number) => z.string().trim().max(max);
const riferimento = z.object({ tipo: z.string().min(1).max(40), chiave: z.string().min(1).max(200) }).nullable().optional();

export const paramsTipoCatalogo = z.object({ tipo: z.enum(['negozio', 'articolo']) });
export const paramsElementoCatalogo = paramsTipoCatalogo.extend({ chiave: z.string().min(1).max(200) });

/** Campi di un negozio scrivibili dall'utente (le colonne della tabella, in snake_case come nel servizio). */
export const datiNegozio = z.object({
  condizioni_json: z.array(condizioneSpillo).max(20).transform(v=>JSON.stringify(v)).optional(),
  nome: testo(160).min(1),
  luogo: testo(200).default(''),
  luogo_chiave: z.string().max(80).nullable().optional(),
  tipo: z.enum(['armi', 'protezioni', 'accessori', 'oggetti', 'regali', 'abiti', 'cibo', 'online', 'ambulante', 'distributore', 'materiali', 'misto', 'altro']).default('altro'),
  gestore: testo(160).nullable().optional(),
  confidente_chiave: z.string().max(80).nullable().optional(),
  orari: testo(200).nullable().optional(),
  sblocco: testo(400).nullable().optional(),
  note: testo(2000).nullable().optional(),
  fonte: testo(400).default(''),
});

/** Campi di un articolo scrivibili dall'utente. */
export const datiArticolo = z.object({
  condizioni_json: z.array(condizioneSpillo).max(20).transform(v=>JSON.stringify(v)).optional(),
  negozio_chiave: z.string().min(1).max(200),
  nome: testo(160).min(1),
  nome_it: testo(160).nullable().optional(),
  categoria: z.enum(['arma', 'protezione', 'accessorio', 'abito', 'consumabile', 'regalo', 'materiale', 'cibo', 'altro']).default('altro'),
  per: testo(80).nullable().optional(),
  prezzo: z.number().int().min(0).max(9_999_999).nullable().optional(),
  effetto: testo(600).nullable().optional(),
  statistiche: testo(400).nullable().optional(),
  disponibile_dal: testo(300).nullable().optional(),
  condizione: testo(300).nullable().optional(),
  nota: testo(600).nullable().optional(),
  fonte: testo(400).default(''),
});

/** Lo schema dipende dal tipo nel percorso: un'unione lascerebbe passare un articolo come negozio, scartandone i campi. */
export const SCHEMI_CATALOGO = { negozio: datiNegozio, articolo: datiArticolo } as const;
export const bodyNascondi = z.object({ nascosta: z.boolean() });

// ---- Agenda ----

export const queryAgenda = z.object({ partita: z.coerce.number().int().positive().optional() });
export const paramsAgendaGiorno = z.object({ data: dataGioco });
export const paramsAgendaVoce = z.object({ id: z.coerce.number().int().positive() });

export const bodyEvento = z.object({
  data: dataGioco,
  tipo: z.enum(['evento', 'scadenza', 'promemoria']).optional(),
  titolo: testo(200).min(1),
  dettaglio: testo(2000).optional(),
  riferimento,
  partitaId: z.number().int().positive().nullable().optional(),
  ordine: z.number().int().min(0).max(9999).optional(),
});
export const bodyAggiornaEvento = bodyEvento.partial();

export const bodyAzione = z.object({
  data: dataGioco,
  fascia: z.enum(['giorno', 'sera']).optional(),
  tipo: z.string().trim().max(40).optional(),
  azione: testo(400).min(1),
  riferimento,
  rangoAtteso: z.number().int().min(1).max(10).nullable().optional(),
  note: testo(600).nullable().optional(),
  partitaId: z.number().int().positive().nullable().optional(),
  ordine: z.number().int().min(0).max(9999).optional(),
});
export const bodyAggiornaAzione = bodyAzione.partial();
export const bodyAzioneFatta = z.object({ partita: z.number().int().positive(), fatta: z.boolean() });
