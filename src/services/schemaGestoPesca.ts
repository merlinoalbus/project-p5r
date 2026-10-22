import { z } from 'zod';
import { ATTIVITA_PESCA, EVENTI_PESCA, REGOLA_PESCA } from '../../shared/pesca';
import { dataValida } from '../../shared/condizioniSpillo';

const uid = z.string().regex(/^[0-9a-f]{32}$/);
const firma = z.string().regex(/^[0-9a-f]{64}$/);
const numero = z.number().int().min(0).max(1_000_000);
const giorno = z.string().regex(/^\d{2}-\d{2}$/).refine(dataValida);
const momento = z.object({ giorno, fascia: z.enum(['giorno', 'sera']), ordineVisita: numero }).strict();
export const schemaOsservazioneGestoPesca = z.object({
  rangoPeriziaOsservato: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).nullable(),
  provenienzaRango: z.enum(['dichiarato', 'fotografia-corrente-confermata', 'ignoto']),
  tentativiConsumati: numero.nullable(),
  catture: z.array(z.object({ id: uid, specie: z.enum(['guardiano', 'boss', 'altro']), tentativo: numero.min(1).nullable(), posizione: numero.nullable() }).strict()).max(1000).nullable(),
  escaSpecialePosseduta: z.boolean().nullable(), faseTerzoSemestre: z.boolean().nullable(),
  meteo: z.enum(['sereno', 'nuvoloso', 'pioggia', 'neve']).nullable(), allertaGelo: z.boolean().nullable(),
  quota: z.object({ pagata: z.boolean().nullable() }).strict(),
  finale: z.object({ tipo: z.enum(['ignoto', 'uscita-dopo-riscossione', 'uscita-senza-riscossione']), riscossioneUid: uid.nullable(), ripresaDopoRiscossione: z.boolean().nullable() }).strict(),
  perizia: z.object({ esito: z.enum(['ricevuta', 'non-ricevuta', 'ignota']) }).strict(),
  fortuna: z.object({ giorno, attiva: z.boolean().nullable() }).strict(),
}).strict().superRefine((o, ctx) => {
  const errore = (message: string) => ctx.addIssue({ code: 'custom', message });
  if ((o.rangoPeriziaOsservato === null) !== (o.provenienzaRango === 'ignoto')) errore('Rango e provenienza non corrispondono.');
  if (o.rangoPeriziaOsservato !== null && o.tentativiConsumati !== null && o.tentativiConsumati > o.rangoPeriziaOsservato + 2) errore('Tentativi incompatibili con il rango osservato.');
  if (o.catture && new Set(o.catture.map(c => c.id)).size !== o.catture.length) errore('Identità di cattura ripetute.');
  if (o.catture?.some(c => c.tentativo !== null && o.tentativiConsumati !== null && c.tentativo > o.tentativiConsumati)) errore('Cattura successiva ai tentativi osservati.');
  if (o.finale.tipo === 'uscita-senza-riscossione' && o.perizia.esito === 'ricevuta') errore('Finale senza riscossione incompatibile con Perizia ricevuta.');
});
const fonte = z.discriminatedUnion('tipo', [z.object({ tipo: z.literal('manuale') }).strict(), z.object({ tipo: z.literal('diario'), voceUid: uid, effettoUid: uid }).strict()]);
const scelta = z.discriminatedUnion('tipo', [z.object({ tipo: z.literal('nuova') }).strict(), z.object({ tipo: z.literal('collega'), sessioneId: uid }).strict()]);
const turno = z.discriminatedUnion('tipo', [z.object({ tipo: z.literal('nuovo') }).strict(), z.object({ tipo: z.literal('esistente'), ordine: numero.min(1), firmaTurno: firma }).strict(), z.object({ tipo: z.literal('contatore-storico'), firmaContatore: firma }).strict()]);
export const schemaNuovaSessioneGestoPesca = z.object({ operazioneId: uid, momento, fonte, scelta, turno, osservazione: schemaOsservazioneGestoPesca }).strict()
  .refine(r => r.momento.giorno === r.osservazione.fortuna.giorno, 'Fortuna deve riferire la data della sessione.');
export const schemaRegistraSessioneGestoPesca = schemaNuovaSessioneGestoPesca.safeExtend({ revisionePescaAttesa: firma });
const osservazione = z.object({ operazioneId: uid, osservazione: schemaOsservazioneGestoPesca }).strict();
const rimozione = z.object({ operazioneId: uid }).strict();
const fatto = z.object({ operazioneId: uid, valore: z.enum(['avvenuto', 'non-avvenuto', 'ignoto']), momento: momento.nullable(), nota: z.string().max(2000) }).strict();
const esca = z.object({ operazioneId: uid, momento, quantita: numero.min(1) }).strict();
const rettifica = z.object({ operazioneId: uid, saldoOsservato: z.number().int().min(0).max(999_999_999) }).strict();
export const schemaOperazioneGestoPesca = z.discriminatedUnion('azione', [
  z.object({ azione: z.literal('registra-sessione'), richiesta: schemaNuovaSessioneGestoPesca, bersaglio: z.null(), revisionePescaAttesa: firma }).strict(),
  z.object({ azione: z.literal('salva-osservazione'), richiesta: osservazione, bersaglio: uid, revisionePescaAttesa: firma }).strict(),
  z.object({ azione: z.literal('registra-fatto'), richiesta: fatto, bersaglio: z.enum(EVENTI_PESCA), revisionePescaAttesa: firma }).strict(),
  z.object({ azione: z.literal('acquista-esca'), richiesta: esca, bersaglio: z.null(), revisionePescaAttesa: firma }).strict(),
  z.object({ azione: z.literal('rettifica-punti'), richiesta: rettifica, bersaglio: z.null(), revisionePescaAttesa: firma }).strict(),
  ...(['rimuovi-fonte', 'rimuovi-sessione', 'rimuovi-fatto', 'rimuovi-acquisto-esca'] as const).map(azione => z.object({ azione: z.literal(azione), richiesta: rimozione, bersaglio: uid, revisionePescaAttesa: firma }).strict()),
]);
export const schemaRicevutaGestoPesca = z.object({
  operazioneId: uid, partitaId: z.number().int().positive(), azione: z.enum(['registra-sessione', 'salva-osservazione', 'rimuovi-fonte', 'rimuovi-sessione', 'registra-fatto', 'rimuovi-fatto', 'acquista-esca', 'rimuovi-acquisto-esca', 'rettifica-punti']),
  richiesta: z.union([schemaNuovaSessioneGestoPesca, osservazione, rimozione, fatto, esca, rettifica]), bersaglio: z.string().min(1).nullable(),
  sessioneId: uid.nullable(), provenienzaId: uid.nullable(), osservazioneId: uid.nullable(), acquistoEscaId: uid.nullable(), fattoFonteId: uid.nullable(),
  esito: z.enum(['sessione-creata', 'fonte-collegata', 'gia-collegata', 'osservazione-salvata', 'fonte-rimossa', 'sessione-rimossa', 'fatto-registrato', 'fatto-rimosso', 'esca-acquistata', 'acquisto-esca-rimosso', 'punti-rettificati']), creataIl: z.string().min(1),
}).strict();
const ids = z.array(uid).max(100).refine(v => new Set(v).size === v.length);
export const schemaEffettoGestoPesca = z.object({ tipo: z.literal('pesca'), regola: z.literal(REGOLA_PESCA), attivita: z.literal(ATTIVITA_PESCA), sostituisceTurni: ids, sostituisceDoti: ids }).strict()
  .refine(v => !v.sostituisceTurni.some(id => v.sostituisceDoti.includes(id)));
