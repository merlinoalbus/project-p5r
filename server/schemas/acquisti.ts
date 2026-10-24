import { z } from 'zod';
import { dataGioco, dote, uidVoce } from './comuni.js';
import { bodyAnteprimaSessionePesca } from './pesca.js';
import { ATTIVITA_PESCA, REGOLA_PESCA } from '../../shared/pesca.js';
import { schemaValutazionePresenza } from '../../shared/valutazioneAcquisto.js';

const uid = z.string().regex(/^[0-9a-f]{32}$/,'Identità non valida.');
const revisione = z.string().regex(/^[0-9a-f]{64}$/,'Revisione non valida.');
const chiave = z.string().trim().min(1).max(200);
const momento = z.object({giorno:dataGioco,fascia:z.enum(['giorno','sera']),ordine:z.number().int().min(0).max(1_000_000)}).strict();
const fonte = z.discriminatedUnion('tipo',[
  z.object({tipo:z.literal('manuale')}).strict(),
  z.object({tipo:z.literal('diario'),voceUid:uidVoce,effettoUid:uid}).strict(),
]);
const scelta = z.discriminatedUnion('tipo',[
  z.object({tipo:z.literal('nuova')}).strict(),z.object({tipo:z.literal('collega'),acquistoId:uid}).strict(),
]);
const rapportoLegacy = z.object({tipo:z.enum(['rappresenta','ulteriore']),firma:revisione,valutazione:schemaValutazionePresenza.optional()}).strict().nullable();
const acquisto = {
  operazioneId:uid,articolo:chiave,momento,variante:dote,fortuna:z.boolean().nullable(),fonte,scelta,rapportoLegacy,
};
export const bodyAnteprimaAcquisto = z.object(acquisto).strict();
export const bodyRegistraAcquisto = z.object({...acquisto,revisioneAcquistiAttesa:revisione}).strict();
export const bodyAnteprimaAnnullaProvenienza = z.object({operazioneId:uid,provenienzaId:uid}).strict();
export const bodyAnnullaProvenienza = bodyAnteprimaAnnullaProvenienza.extend({revisioneAcquistiAttesa:revisione}).strict();
export const bodyAnteprimaRimozioneLegacy = z.object({operazioneId:uid,articolo:chiave}).strict();
export const bodyRimozioneLegacy = bodyAnteprimaRimozioneLegacy.extend({revisioneAcquistiAttesa:revisione}).strict();
const riferimentoProposta = z.object({id:z.number().int().positive(),uid}).strict();
const decisione = z.discriminatedUnion('tipo',[
  z.object({tipo:z.literal('applica'),proposte:z.array(riferimentoProposta).min(1).max(100)}).strict(),
  z.object({tipo:z.literal('scarta'),proposte:z.array(riferimentoProposta).min(1).max(100)}).strict(),
  z.object({tipo:z.literal('non-conteggiata'),proposte:z.array(riferimentoProposta).min(1).max(100)}).strict(),
  z.object({tipo:z.literal('ignota'),proposte:z.array(riferimentoProposta).min(1).max(100)}).strict(),
  z.object({tipo:z.literal('gia-conteggiata'),proposta:riferimentoProposta,quantita:z.number().int().positive().max(9_999_999)}).strict(),
  z.object({tipo:z.literal('applica-effetto'),proposta:riferimentoProposta,acquisto:bodyAnteprimaAcquisto.optional(),revisioneAcquistiAttesa:revisione.optional(),pesca:bodyAnteprimaSessionePesca.optional(),revisionePescaAttesa:revisione.optional()}).strict(),
]);
export const bodyAnteprimaDecisioneProposte = z.object({operazioneId:uid,decisione}).strict();
export const bodyDecisioneProposte = bodyAnteprimaDecisioneProposte.extend({revisioneProposteAttesa:revisione}).strict();
const doteNote = z.object({dote,note:z.union([z.literal(1),z.literal(2),z.literal(3)])}).strict();
export const effettoVoce = z.discriminatedUnion('tipo',[
  z.object({tipo:z.literal('dote'),dote,note:z.union([z.literal(1),z.literal(2),z.literal(3)])}).strict(),
  z.object({tipo:z.literal('lettura'),categoria:z.enum(['libro','film','videogioco']),chiave,almeno:z.number().int().positive().nullable()}).strict(),
  z.object({tipo:z.literal('turno'),attivita:chiave,doti:z.array(doteNote).min(1).max(20).optional()}).strict(),
  z.object({tipo:z.literal('acquisto'),articolo:chiave,variante:dote.nullable(),fortuna:z.boolean().nullable().optional(),sostituisceDoti:z.array(uid).max(20).refine((x)=>new Set(x).size===x.length,'Gli effetti sostituiti devono essere distinti.')}).strict(),
  z.object({tipo:z.literal('pesca'),regola:z.literal(REGOLA_PESCA),attivita:z.literal(ATTIVITA_PESCA),sostituisceTurni:z.array(uid).max(20),sostituisceDoti:z.array(uid).max(20)}).strict(),
  z.object({tipo:z.literal('fortuna'),dote}).strict(),
  z.object({tipo:z.literal('storia'),evento:chiave}).strict(),
  z.object({tipo:z.literal('persona'),persona:z.number().int().positive()}).strict(),
  z.object({tipo:z.literal('domanda'),domanda:z.number().int().positive()}).strict(),
  z.object({tipo:z.literal('cruciverba'),data:z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/)}).strict(),
  z.object({tipo:z.literal('richiesta'),richiesta:chiave}).strict(),
  z.object({tipo:z.literal('articolo'),articolo:chiave}).strict(),
  z.object({tipo:z.literal('invito'),invito:z.string().regex(/^[a-z0-9-]+\/(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/)}).strict(),
]);
export const bodySalvaEffettiVoce = z.object({revisioneEffettiAttesa:revisione,effetti:z.array(z.object({uid:uid.nullable(),effetto:effettoVoce}).strict()).max(100)}).strict();
export const bodyAnteprimaDecisioneEffettoVoce = z.object({operazioneId:uid,decisione:z.enum(['conferma','scarta']),effetto:effettoVoce.optional()}).strict();
export const bodyDecisioneEffettoVoce = bodyAnteprimaDecisioneEffettoVoce.extend({revisionePropostaAttesa:revisione}).strict();
