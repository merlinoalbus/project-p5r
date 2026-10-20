// ============================================================
// Schemi zod — mappe e spilli dell'editor (Fase 13.1)
// ============================================================

import { z } from 'zod';
import { LIMITI_GUIDA } from '../../shared/limitiGuida.js';
import { schemaDestinazioneSpillo } from '../services/mappe/destinazioniSpillo.js';
import { schemaPosizionePezzo, schemaRotazionePezzo, schemaSorgentePezzo, schemaSpecchioPezzo } from '../services/mappe/pezziMappa.js';
import { TIPI_MAPPA, TIPI_RIFERIMENTO, TIPI_SPILLO } from '../../shared/spilli.js';
import { normalizzaRequisitoSpillo, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';
import { idParam } from './comuni.js';

const chiaveMappa = z.string().regex(/^[a-z0-9][a-z0-9-]{0,179}$/);
const riferimento = z.object({ tipo: z.enum(TIPI_RIFERIMENTO), chiave: z.string().min(1).max(200) }).nullable();
const entita = z.object({ tipo: z.string().min(1).max(40), chiave: z.string().min(1).max(200) }).nullable();
// Stesso schema ricorsivo per tutte le condizioni dell’app; nessun testo interpretato.
export const condizioneSpillo = z.custom<RequisitoSpillo>(v => normalizzaRequisitoSpillo(v) !== null, 'Condizione non valida')
  // la descrizione è solo documentazione (OpenAPI): la forma la controlla `normalizzaRequisitoSpillo`
  .meta({ description: 'Una condizione `RequisitoSpillo` (shared/condizioniSpillo.ts), validata e normalizzata da `normalizzaRequisitoSpillo`. Il campo `tipo` sceglie la forma: gruppo (`modo` tutte o almeno-una, `condizioni` annidate), non, data, intervallo, fascia, piove, meteo, giorno-settimana, stagione, quartiere, arco, palazzo, dote, confidente, squadra, richiesta, lettura, articolo, attivita, rango-cliente, punti-negozio, evento, contatore, persona-arcano, persona-abilita, spillo, voce-guida (queste ultime due solo nei pin).' })
  .transform(v => normalizzaRequisitoSpillo(v)!);

const condizioni = z.array(condizioneSpillo).max(20).nullable().optional();

export const paramsMappa = z.object({ chiave: chiaveMappa });
export const paramsSpillo = z.object({ id: idParam });
export const queryEsporta = z.object({ radice: chiaveMappa.optional() });
export const queryDidascalia = z.object({ didascalia: z.string().max(300).optional() });
export const bodyImmagineSpillo = z.object({ didascalia: z.string().max(300).optional(), ordine: z.number().int().min(0).max(999).optional() });
/** La partita e, da L4 (§1.4), l'infiltrazione guardata: il contesto dei pin di rigenerabili di più infiltrazioni. */
export const queryMappa = z.object({ partita: idParam.optional(), infiltrazione: z.string().min(1).max(160).optional() });
/** L3 «planimetria della voce»: le voci della guida sulla planimetria, con lo stato della partita se indicata. */
export const queryGuidaMappa = z.object({ partita: idParam.optional() });
/** Sostituire l'immagine di una mappa con dei pezzi (102): `eliminaPezzi=1` conferma che se ne vanno con l'immagine di prima. */
export const queryImmagineMappa = z.object({ eliminaPezzi: z.enum(['0', '1']).optional() });
export const bodyCreaMappa = z.object({
  chiave: chiaveMappa.optional(), nome: z.string().min(1).max(LIMITI_GUIDA.mappa.nome), tipo: z.enum(TIPI_MAPPA), genitore: chiaveMappa.nullable().optional(), ordine: z.number().int().min(0).max(9999).optional(),
  asset: z.string().max(200).nullable().optional(), larghezza: z.number().int().positive().nullable().optional(), altezza: z.number().int().positive().nullable().optional(), entita: entita.optional(), note: z.string().max(LIMITI_GUIDA.mappa.note).optional(),
  // 15.24: con un genitore, `passaggio` crea anche lo spillo «passaggio» nella mappa genitore e `ritorno` quello verso il genitore nella nuova mappa
  passaggio: z.boolean().optional(), ritorno: z.boolean().optional(),
});
export const bodyAggiornaMappa = bodyCreaMappa.omit({ chiave: true, passaggio: true, ritorno: true }).partial();
/** L'insieme delle aree della guida contenute in una planimetria (vuoto = nessuna). */
export const bodyAreeMappa = z.object({ aree: z.array(z.string().trim().min(1).max(160)).max(200) });
/** Raggruppamento di una planimetria: la stanza a cui appartiene e che cosa mostra la sua versione. */
export const bodyPresentazioneMappa = z.object({
  gruppoId: z.string().max(200).nullable().optional(), gruppoNome: z.string().max(LIMITI_GUIDA.mappa.gruppoNome).optional(), etichetta: z.string().max(LIMITI_GUIDA.mappa.etichetta).nullable().optional(),
});
/** La stanza di una planimetria: `con` = entra nella stanza di quella, `null` = diventa una stanza a sé. */
export const bodyStanzaMappa = z.object({ con: chiaveMappa.nullable(), nome: z.string().trim().min(1).max(LIMITI_GUIDA.mappa.gruppoNome).optional() });
/** Riordino in blocco delle mappe figlie di un genitore (`null` = radici): l'elenco è il nuovo ordine. */
export const bodyRiordinaMappe = z.object({ genitore: chiaveMappa.nullable(), chiavi: z.array(chiaveMappa).max(500) });
/** Passaggio verso un'altra mappa creato dall'albero dell'editor (15.24): il server sceglie un punto libero. */
export const bodyCreaPassaggio = z.object({ destinazione: chiaveMappa });
export const bodyCreaSpillo = z.object({
  soloPosizione: z.boolean().optional(),
  destinazione: schemaDestinazioneSpillo.nullable().optional(),
  tipo: z.enum(TIPI_SPILLO), nome: z.string().min(1).max(LIMITI_GUIDA.spillo.nome), descrizione: z.string().max(LIMITI_GUIDA.spillo.descrizione).optional(), x: z.number().min(0).max(100), y: z.number().min(0).max(100),
  riferimento: riferimento.optional(), collezionabile: z.boolean().optional(), ordine: z.number().int().min(0).max(9999).optional(), condizioni,
});
export const bodyAggiornaSpillo = bodyCreaSpillo.partial().extend({ mappa: chiaveMappa.optional() });
/** Il segno di un pin; `infiltrazione` (L4, §3.2) è il contesto per un pin di rigenerabili di più infiltrazioni (null = quella in corso). */
export const bodyRaccolto = z.object({ raccolto: z.boolean(), infiltrazione: z.string().min(1).max(160).optional() });

/** I pezzi delle planimetrie (102): le forme di zona, posizione, rotazione e specchio stanno col servizio, che le usa anche per il pacchetto.
 *  Dalla 103 il pezzo è il ritaglio (nome, zona, ordine) e le copie sono le sue pose (etichetta, posizione, rotazione, specchio, condizioni). */
export const paramsPezzo = z.object({ id: idParam });
export const paramsCopiaPezzo = z.object({ id: idParam });
// Tutti `strict`: un campo che non appartiene a quella parte (la posizione o le condizioni mandate al ritaglio, come faceva il
// contratto della 102) è un 400, non un 200 che lo perde senza dirlo (nota F8 del validatore).
export const bodyCreaCopiaPezzo = z.object({
  etichetta: z.string().trim().max(LIMITI_GUIDA.spillo.nome).optional(), posizione: schemaPosizionePezzo.optional(),
  rotazione: schemaRotazionePezzo.optional(), specchio: schemaSpecchioPezzo.optional(), condizioni, ordine: z.number().int().min(0).max(9999).optional(),
}).strict();
/** La correzione di una copia: con `nomePezzo` anche il nome del ritaglio, nella stessa transazione. */
export const bodyAggiornaCopiaPezzo = bodyCreaCopiaPezzo.extend({ nomePezzo: z.string().trim().max(LIMITI_GUIDA.spillo.nome).optional() }).strict();
export const bodyAggiornaPezzo = z.object({
  nome: z.string().trim().max(LIMITI_GUIDA.spillo.nome).optional(), sorgente: schemaSorgentePezzo.optional(), ordine: z.number().int().min(0).max(9999).optional(),
}).strict();
/** La creazione di un pezzo: la zona e (facoltativa) la sua prima copia. */
export const bodyCreaPezzo = bodyAggiornaPezzo.extend({ sorgente: schemaSorgentePezzo, copia: bodyCreaCopiaPezzo.optional() }).strict();
export const queryRiferimenti = z.object({ tipo: z.enum(TIPI_RIFERIMENTO), q: z.string().max(120).optional().default(''), limite: z.coerce.number().int().min(1).max(100).optional() });
export const bodyImporta = z.object({ pacchetto: z.object({ versione: z.literal(1), mappe: z.array(z.object({ chiave: z.string(), nome: z.string(), tipo: z.string() }).passthrough()).max(2000), immagini: z.record(z.string(), z.object({ mime: z.string(), base64: z.string() })).optional() }).passthrough(), sovrascrivi: z.boolean().optional() });
