import { z } from 'zod';
import { dataGioco, idParam } from './comuni.js';
import { EVENTI_PESCA } from '../../shared/pesca.js';

const uid = z.string().regex(/^[0-9a-f]{32}$/);
const firma = z.string().regex(/^[0-9a-f]{64}$/);
const numero = z.number().int().min(0).max(1_000_000);
export const schemaMomentoPesca = z.object({ giorno: dataGioco, fascia: z.enum(['giorno', 'sera']), ordineVisita: numero }).strict();
export const schemaOsservazionePesca = z.object({
  rangoPeriziaOsservato: z.union([z.literal(1),z.literal(2),z.literal(3),z.literal(4),z.literal(5)]).nullable(),
  provenienzaRango: z.enum(['dichiarato', 'fotografia-corrente-confermata', 'ignoto']),
  tentativiConsumati: numero.nullable(),
  catture: z.array(z.object({ id: uid, specie: z.enum(['guardiano','boss','altro']), tentativo: numero.min(1).nullable(), posizione: numero.nullable() }).strict()).max(1000).nullable(),
  escaSpecialePosseduta: z.boolean().nullable(), faseTerzoSemestre: z.boolean().nullable(),
  meteo: z.enum(['sereno','nuvoloso','pioggia','neve']).nullable(), allertaGelo: z.boolean().nullable(),
  quota: z.object({ pagata: z.boolean().nullable() }).strict(),
  finale: z.object({ tipo: z.enum(['ignoto','uscita-dopo-riscossione','uscita-senza-riscossione']), riscossioneUid: uid.nullable(), ripresaDopoRiscossione: z.boolean().nullable() }).strict(),
  perizia: z.object({ esito: z.enum(['ricevuta','non-ricevuta','ignota']) }).strict(),
  fortuna: z.object({ giorno: dataGioco, attiva: z.boolean().nullable() }).strict(),
}).strict().superRefine((o, ctx) => {
  const errore = (message: string) => ctx.addIssue({ code: 'custom', message });
  if ((o.rangoPeriziaOsservato === null) !== (o.provenienzaRango === 'ignoto')) errore('Rango e provenienza devono distinguere il dato ignoto.');
  if (o.rangoPeriziaOsservato !== null && o.tentativiConsumati !== null && o.tentativiConsumati > o.rangoPeriziaOsservato + 2) errore('I tentativi consumati superano il limite del rango osservato.');
  if (o.catture && new Set(o.catture.map(c => c.id)).size !== o.catture.length) errore('Ogni cattura deve avere un’identità distinta.');
  if (o.catture?.some(c => c.tentativo !== null && o.tentativiConsumati !== null && c.tentativo > o.tentativiConsumati)) errore('Una cattura non può essere successiva ai tentativi osservati.');
  if (o.finale.tipo === 'uscita-senza-riscossione' && o.perizia.esito === 'ricevuta') errore('Riscossione finale assente e Perizia ricevuta sono osservazioni incompatibili.');
});
const fonte = z.discriminatedUnion('tipo', [z.object({ tipo: z.literal('manuale') }).strict(), z.object({ tipo: z.literal('diario'), voceUid: uid, effettoUid: uid }).strict()]);
const scelta = z.discriminatedUnion('tipo', [z.object({ tipo: z.literal('nuova') }).strict(), z.object({ tipo: z.literal('collega'), sessioneId: uid }).strict()]);
const turno = z.discriminatedUnion('tipo', [z.object({ tipo: z.literal('nuovo') }).strict(), z.object({ tipo: z.literal('esistente'), ordine: numero.min(1), firmaTurno: firma }).strict(), z.object({ tipo: z.literal('contatore-storico'), firmaContatore: firma }).strict()]);
export const bodyAnteprimaSessionePesca = z.object({ operazioneId: uid, momento: schemaMomentoPesca, fonte, scelta, turno, osservazione: schemaOsservazionePesca }).strict();
export const bodyRegistraSessionePesca = bodyAnteprimaSessionePesca.extend({ revisionePescaAttesa: firma }).strict();
export const bodyAnteprimaOsservazionePesca = z.object({ operazioneId: uid, osservazione: schemaOsservazionePesca }).strict();
export const bodySalvaOsservazionePesca = bodyAnteprimaOsservazionePesca.extend({ revisionePescaAttesa: firma }).strict();
export const bodyAnteprimaRimozionePesca = z.object({ operazioneId: uid }).strict();
export const bodyRimozionePesca = bodyAnteprimaRimozionePesca.extend({ revisionePescaAttesa: firma }).strict();
export const bodyAnteprimaFattoPesca = z.object({ operazioneId: uid, valore: z.enum(['avvenuto','non-avvenuto','ignoto']), momento: schemaMomentoPesca.nullable(), nota: z.string().max(2000) }).strict();
export const bodyRegistraFattoPesca = bodyAnteprimaFattoPesca.extend({ revisionePescaAttesa: firma }).strict();
export const bodyAnteprimaAcquistoEsca = z.object({ operazioneId: uid, momento: schemaMomentoPesca, quantita: numero.min(1) }).strict();
export const bodyAcquistoEsca = bodyAnteprimaAcquistoEsca.extend({ revisionePescaAttesa: firma }).strict();
export const bodyAnteprimaRettificaPuntiPesca = z.object({ operazioneId: uid, saldoOsservato: z.number().int().min(0).max(999_999_999) }).strict();
export const bodyRettificaPuntiPesca = bodyAnteprimaRettificaPuntiPesca.extend({ revisionePescaAttesa: firma }).strict();
export const paramsPesca = z.object({ id: idParam }).strict();
export const paramsSessionePesca = z.object({ id: idParam, sessione: uid }).strict();
export const paramsFontePesca = z.object({ id: idParam, fonte: uid }).strict();
export const paramsAcquistoEsca = z.object({ id: idParam, acquisto: uid }).strict();
export const paramsFattoPesca = z.object({ id: idParam, evento: z.enum(EVENTI_PESCA) }).strict();
export const paramsOperazionePesca = z.object({ id: idParam, operazione: uid }).strict();
const fonteRegola = z.string().url().max(1000);
export const schemaDefinizioneRegolaPesca = z.object({
  versione: z.literal(1), quote: z.object({ giorno: numero, sera: numero }).strict(), costoEscaPunti: numero,
  beneficioPerizia: z.object({ note: z.literal(1), puntiBase: numero, bonusFortuna: numero }).strict(),
  fonti: z.array(fonteRegola).min(1).max(50),
  vie: z.array(z.object({ id: z.string().min(1).max(100), specie: z.enum(['guardiano','boss']), faseTerzoSemestre: z.boolean(),
    fascia: z.enum(['giorno','sera']), meteo: z.enum(['normale','pioggia-neve']), guardianoPrecedente: z.enum(['si','no','indifferente']),
    rangoComparsa: z.union([z.literal(1),z.literal(2),z.literal(3),z.literal(4),z.literal(5)]).nullable(), rangoCattura: z.union([z.literal(1),z.literal(2),z.literal(3),z.literal(4),z.literal(5)]), tentativo: z.enum(['primo','settimo']),
    seiCatture: z.boolean(), fonti: z.array(fonteRegola).min(1).max(50), nota: z.string().max(4000),
  }).strict()).min(1).max(100),
}).strict().superRefine((r, ctx) => {
  if(new Set(r.vie.map(v=>v.id)).size!==r.vie.length)ctx.addIssue({code:'custom',message:'Ogni via deve avere una chiave distinta.'});
  if(r.vie.some(v=>v.fonti.some(f=>!r.fonti.includes(f))))ctx.addIssue({code:'custom',message:'Le fonti delle vie devono essere presenti nella regola.'});
  if(r.beneficioPerizia.puntiBase+r.beneficioPerizia.bonusFortuna>999)ctx.addIssue({code:'custom',message:'Il beneficio complessivo supera il limite del mutatore delle Doti.'});
});
export const paramsRegolaPesca = z.object({ chiave: z.string().min(1).max(150) }).strict();
export const bodySalvaRegolaPesca = z.object({ nome: z.string().trim().min(1).max(200), dati: schemaDefinizioneRegolaPesca, revisioneAttesa: firma }).strict();
