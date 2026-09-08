import { condizioneSpillo } from './mappe.js';
// ============================================================
// Schemi zod — catalogo estensibile dall'utente e agenda del giorno (Fase 16.1)
// ============================================================

import { z } from 'zod';
import { TIPI_CATALOGO } from '../../shared/types.js';

const dataGioco = z.string().regex(/^\d{2}-\d{2}$/, 'La data del gioco è nel formato MM-GG.');
const testo = (max: number) => z.string().trim().max(max);
const riferimento = z.object({ tipo: z.string().min(1).max(40), chiave: z.string().min(1).max(200) }).nullable().optional();

/** I tipi accettati nel percorso. Erano scritti a mano e sono rimasti indietro quando il catalogo
 *  si e' esteso: un `POST /catalogo/libro` rispondeva «atteso negozio|articolo» pur essendo tutto
 *  il resto pronto. Adesso l'elenco e' uno solo, `TIPI_CATALOGO`, e non puo' piu' divergere. */
export const paramsTipoCatalogo = z.object({ tipo: z.enum(TIPI_CATALOGO) });
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
  // Le categorie di un articolo sono i tipi di cosa che un negozio può vendere, e le prime nove non
  // li coprivano: libri, DVD e videogiochi finivano in «altro», e i quattro consumabili che l'app
  // distingue dappertutto — cura, SP, battaglia, stato — sparivano dentro «consumabile».
  // Le etichette italiane stanno in `src/utils/negozi.ts`, le figure in `ui/categoria-*`.
  categoria: z.enum(['arma', 'protezione', 'accessorio', 'abito', 'consumabile', 'regalo', 'materiale', 'cibo',
    'cura', 'sp', 'battaglia', 'stato', 'esplorazione', 'oggetto-chiave', 'libro', 'film', 'dvd', 'videogioco', 'altro']).default('altro'),
  per: testo(80).nullable().optional(),
  prezzo: z.number().int().min(0).max(9_999_999).nullable().optional(),
  // Quante se ne possono comprare. `null` non e' zero: zero direbbe «nessuna», null dice «limite
  // non dichiarato», ed e' quel che sappiamo delle 575 righe che c'erano prima di questo campo.
  quantita: z.number().int().min(0).max(9_999).nullable().optional(),
  // Il collegamento all'oggetto: l'archivio e la sua chiave. Da qui l'articolo legge nome, effetto,
  // statistiche e «per chi» invece di tenerne una copia propria.
  oggetto_fonte: z.enum(['equipaggiamento', 'guida', 'libri', 'film', 'videogiochi']).nullable().optional(),
  oggetto_chiave: testo(200).nullable().optional(),
  // Restano per l'articolo **generico**, quello che nessun archivio conosce e che nasce dentro il
  // negozio. Per un articolo collegato non si scrivono: la lettura li prende dall'oggetto.
  effetto: testo(600).nullable().optional(),
  statistiche: testo(400).nullable().optional(),
  disponibile_dal: testo(300).nullable().optional(),
  condizione: testo(300).nullable().optional(),
  nota: testo(600).nullable().optional(),
  fonte: testo(400).default(''),
});

/** Campi di un libro scrivibili dall'utente. */
export const datiLibro = z.object({
  // Le condizioni valgono anche qui. L'editor le mostrava già e finivano nel nulla, perché la
  // colonna non esisteva (migrazione 052): sono la disponibilità, «dal 18 aprile».
  condizioni_json: z.array(condizioneSpillo).max(20).transform((v) => JSON.stringify(v)).optional(),
  nome: testo(160).min(1),
  nome_it: testo(160).nullable().optional(),
  dove: testo(300).default(''),
  prezzo: z.number().int().min(0).max(9_999_999).nullable().optional(),
  disponibile_dal: testo(300).nullable().optional(),
  dote: z.enum(['conoscenza', 'fascino', 'coraggio', 'gentilezza', 'perizia']).nullable().optional(),
  // «note» qui e' il numero di note musicali della Dote (1-3), non un testo: e' la colonna del
  // catalogo dei libri e si chiama cosi' da sempre.
  note: z.number().int().min(0).max(9).nullable().optional(),
  sblocca: testo(300).nullable().optional(),
  sessioni: z.number().int().min(1).max(9).nullable().optional(),
  dettagli: testo(2000).nullable().optional(),
  fonte: testo(400).default(''),
});

/** Campi di un film o DVD scrivibili dall'utente. */
export const datiFilm = z.object({
  condizioni_json: z.array(condizioneSpillo).max(20).transform((v) => JSON.stringify(v)).optional(),
  nome: testo(160).min(1),
  nome_it: testo(160).nullable().optional(),
  dove: z.enum(['cinema', 'dvd']).default('cinema'),
  periodo: testo(300).default(''),
  dote: z.enum(['conoscenza', 'fascino', 'coraggio', 'gentilezza', 'perizia']).nullable().optional(),
  note: z.number().int().min(0).max(9).nullable().optional(),
  // Quanto vale **rivedere** un titolo: al cinema la guida lo dichiara riga per riga («prima
  // visione: +3; visioni successive: +1»), e senza questo campo quella distinzione viveva solo
  // nella prosa dei dettagli, dove l'app non poteva applicarla. Vuoto = rivederlo non da' niente.
  note_successive: z.number().int().min(0).max(9).nullable().optional(),
  prezzo: z.number().int().min(0).max(9_999_999).nullable().optional(),
  sessioni: z.number().int().min(1).max(9).nullable().optional(),
  dettagli: testo(2000).nullable().optional(),
  fonte: testo(400).default(''),
});

/** Campi di un'attivita' (compresi lavori e videogiochi) scrivibili dall'utente. */
export const datiAttivita = z.object({
  condizioni_json: z.array(condizioneSpillo).max(20).transform((v) => JSON.stringify(v)).optional(),
  nome: testo(160).min(1),
  tipo: testo(60).default('altro'),
  luogo: testo(300).default(''),
  luogo_chiave: z.string().min(1).max(200).nullable().optional(),
  fascia: testo(60).nullable().optional(),
  costo: z.number().int().min(0).max(9_999_999).nullable().optional(),
  sblocco: testo(400).nullable().optional(),
  sessioni: z.number().int().min(1).max(99).nullable().optional(),
  // Le Doti di un'attivita' sono un elenco: `[{dote, note, condizione}]`. Si accetta gia'
  // strutturato e si salva come JSON, come fa il seed.
  doti_json: z.array(z.object({
    dote: z.enum(['conoscenza', 'fascino', 'coraggio', 'gentilezza', 'perizia']).nullable(),
    note: z.number().int().min(0).max(9).nullable(),
    condizione: testo(400).nullable(),
  })).max(10).transform((v) => JSON.stringify(v)).optional(),
  altri_effetti: testo(2000).nullable().optional(),
  regole: testo(2000).default(''),
  premi: testo(2000).nullable().optional(),
  paga: testo(400).nullable().optional(),
  fonte: testo(400).default(''),
});

/** Campi di una domanda in classe o d'esame.
 *
 * `risposte_json` arriva come **elenco**, non come testo libero: è la risposta giusta — o la
 * sequenza giusta, per le domande a più passaggi — ed è il dato che l'app usa per dire «rispondi
 * questo». Un campo libero avrebbe fatto scrivere la stessa risposta in dieci modi diversi senza
 * renderne utile nessuno: è lo stesso difetto che avevano le Doti prima del loro editor. */
export const datiDomanda = z.object({
  data: dataGioco,
  tipo: z.enum(['classe', 'esame-medio', 'esame-finale', 'altro']).default('classe'),
  chi: testo(120).default(''),
  domanda: testo(600).min(1),
  risposte_json: z.array(z.object({ ordine: z.number().int().min(1).max(20), testo: testo(300).min(1) })).max(20)
    .transform((v) => JSON.stringify(v)).optional(),
  ricompensa: testo(200).default(''),
  note: testo(2000).default(''),
  fonte: testo(400).default(''),
});

/** Campi di una riga del cruciverba: l'indizio di quel giorno e la parola che lo risolve. */
export const datiCruciverba = z.object({
  data: dataGioco,
  indizio: testo(400).min(1),
  risposta: testo(200).min(1),
  risposta_en: testo(200).nullable().optional(),
  fonte: testo(400).default(''),
});

/** Lo schema dipende dal tipo nel percorso: un'unione lascerebbe passare un articolo come negozio, scartandone i campi. */
export const SCHEMI_CATALOGO = { negozio: datiNegozio, articolo: datiArticolo, libro: datiLibro, film: datiFilm, attivita: datiAttivita, domanda: datiDomanda, cruciverba: datiCruciverba } as const;
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
