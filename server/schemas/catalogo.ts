import { condizioneSpillo } from './mappe.js';
// ============================================================
// Schemi zod — catalogo estensibile dall'utente e agenda del giorno (Fase 16.1)
// ============================================================

import { z } from 'zod';
import { TIPI_CATALOGO } from '../../shared/types.js';
import { FASCE_ORARIO, GIORNI_SETTIMANA_CHIAVI } from '../../shared/orariNegozio.js';
import { FASCE_ATTIVITA, TIPI_ATTIVITA, TRACCIAMENTI_ATTIVITA } from '../../shared/attivita.js';
import { FAMIGLIE_EFFETTO } from '../../shared/effettiOggetto.js';
import { TIPI_LUOGO } from '../../shared/tipiLuogo.js';

const chiaviDi = <T extends { chiave: string }>(elenco: readonly T[]) => elenco.map((e) => e.chiave) as [string, ...string[]];

/** Gli orari di un negozio come valori (shared/orariNegozio). */
export const orariNegozio = z.object({
  giorni: z.array(z.enum(GIORNI_SETTIMANA_CHIAVI)).max(7).default([]),
  fasce: z.array(z.enum(chiaviDi(FASCE_ORARIO))).max(2).default([]),
  chiusoConPioggia: z.boolean().default(false),
  nota: z.string().trim().max(300).nullable().default(null),
});

/** Una voce di effetto (shared/effettiCatalogo): l'effetto dichiarato, se vale alle volte successive, le sue condizioni. */
export const voceEffetto = z.object({
  effetto: z.object({ famiglia: z.enum(chiaviDi(FAMIGLIE_EFFETTO)) }).passthrough(),
  ripetuto: z.boolean().optional(),
  condizioni: z.array(condizioneSpillo).max(20).optional(),
});
const effettiJson = z.array(voceEffetto).max(20).transform((v) => JSON.stringify(v)).optional();

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
  /** **Confermato da te.** Una riga che aggiungi nasce non verificata, ed e' giusto: non viene
   *  dalla guida. Ma finora quel marchio si poteva solo mettere, mai togliere - il campo non era
   *  nel modulo e l'API non lo accettava - quindi ogni cosa inserita restava «da verificare» per
   *  sempre, senza che esistesse un modo di verificarla. */
  
  condizioni_json: z.array(condizioneSpillo).max(20).transform(v=>JSON.stringify(v)).optional(),
  nome: testo(160).min(1),
  luogo: testo(200).default(''),
  luogo_chiave: z.string().max(80).nullable().optional(),
  tipo: z.enum(['armi', 'protezioni', 'accessori', 'oggetti', 'regali', 'abiti', 'cibo', 'online', 'ambulante', 'distributore', 'materiali', 'misto', 'altro']).default('altro'),
  gestore: testo(160).nullable().optional(),
  confidente_chiave: z.string().max(80).nullable().optional(),
  /** La sede: un luogo della città (migrazione 072). */
  sede_chiave: z.string().max(200).nullable().optional(),
  orari_json: orariNegozio.transform((v) => JSON.stringify(v)).optional(),
  programma_punti_json: z.object({ nome: testo(80).min(1), unita: testo(40).min(1), calcolo: z.enum(['manuale', 'rango-cliente']) }).nullable().optional()
    .transform((v) => (v === null || v === undefined ? v : JSON.stringify(v))),
  note: testo(2000).nullable().optional(),
});

/** Campi di un articolo scrivibili dall'utente. */
export const datiArticolo = z.object({
  /** **Confermato da te.** Una riga che aggiungi nasce non verificata, ed e' giusto: non viene
   *  dalla guida. Ma finora quel marchio si poteva solo mettere, mai togliere - il campo non era
   *  nel modulo e l'API non lo accettava - quindi ogni cosa inserita restava «da verificare» per
   *  sempre, senza che esistesse un modo di verificarla. */
  verificato: z.boolean().optional(),
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
  // La dichiarazione strutturata (shared/effettiOggetto). `effetto` resta la frase che ne discende:
  // la ricerca per testo ci passa sopra, e chi legge il database senza l'app deve capire lo stesso.
  effetto_json: z.object({ famiglia: z.string().min(1).max(40) }).passthrough().nullable().optional()
    .transform((v) => (v === null || v === undefined ? v : JSON.stringify(v))),
  effetto: testo(600).nullable().optional(),
  statistiche: testo(400).nullable().optional(),
  nota: testo(600).nullable().optional(),
});

/** Campi di un libro scrivibili dall'utente. */
export const datiLibro = z.object({
  /** **Che cosa apre leggerlo**, dichiarato invece che raccontato.
   *
   * Da non confondere con `condizioni_json`, che e' il verso opposto: quelle dicono quando il
   * libro e' disponibile, questa che cosa il libro sblocca. Per `sblocca-luogo` il luogo e' la
   * chiave di un quartiere, cosi' l'app ci puo' portare. */
  effetto_json: z.object({ famiglia: z.string().min(1).max(40) }).passthrough().nullable().optional()
    .transform((v) => (v === null || v === undefined ? v : JSON.stringify(v))),
  // Le condizioni valgono anche qui. L'editor le mostrava già e finivano nel nulla, perché la
  // colonna non esisteva (migrazione 052): sono la disponibilità, «dal 18 aprile».
  verificato: z.boolean().optional(),
  condizioni_json: z.array(condizioneSpillo).max(20).transform((v) => JSON.stringify(v)).optional(),
  nome: testo(160).min(1),
  nome_it: testo(160).nullable().optional(),
  dove: testo(300).default(''),
  prezzo: z.number().int().min(0).max(9_999_999).nullable().optional(),
  dote: z.enum(['conoscenza', 'fascino', 'coraggio', 'gentilezza', 'perizia']).nullable().optional(),
  // «note» qui e' il numero di note musicali della Dote (1-3), non un testo: e' la colonna del
  // catalogo dei libri e si chiama cosi' da sempre.
  note: z.number().int().min(0).max(9).nullable().optional(),
  sblocca: testo(300).nullable().optional(),
  /** Gli effetti dichiarati (migrazione 074): la Dote che alza, che cosa apre. Senza, si derivano da dote/note. */
  effetti_json: effettiJson,
  sessioni: z.number().int().min(1).max(9).nullable().optional(),
  dettagli: testo(2000).nullable().optional(),
});

/** Le regole che valgono anche quando si corregge un solo campo: al cinema una visione basta, «ripetuto» ha senso solo lì. */
const rifinisciFilm = (d: { dove?: string; sessioni?: number | null; effetti_json?: string }, ctx: z.RefinementCtx) => {
  if (d.dove === 'cinema' && d.sessioni != null && d.sessioni !== 1) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sessioni'], message: 'Un film al cinema si completa in una visione.' });
  if (d.dove === 'dvd' && typeof d.effetti_json === 'string' && d.effetti_json.includes('"ripetuto":true')) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['effetti_json'], message: 'Le visioni successive valgono solo al cinema.' });
};
/** La paga in yen è dei lavori. */
const rifinisciAttivita = (d: { tipo?: string; paga_yen?: number | null; paga_massima?: number | null }, ctx: z.RefinementCtx) => {
  if (d.tipo !== undefined && d.tipo !== 'lavoro' && (d.paga_yen != null || d.paga_massima != null)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['paga_yen'], message: 'La paga vale solo per un lavoro.' });
};

/** Campi di un film o DVD scrivibili dall'utente. */
const datiFilmBase = z.object({
  verificato: z.boolean().optional(),
  condizioni_json: z.array(condizioneSpillo).max(20).transform((v) => JSON.stringify(v)).optional(),
  nome: testo(160).min(1),
  nome_it: testo(160).nullable().optional(),
  dove: z.enum(['cinema', 'dvd']).default('cinema'),
  dote: z.enum(['conoscenza', 'fascino', 'coraggio', 'gentilezza', 'perizia']).nullable().optional(),
  note: z.number().int().min(0).max(9).nullable().optional(),
  // Quanto vale **rivedere** un titolo: al cinema la guida lo dichiara riga per riga («prima
  // visione: +3; visioni successive: +1»), e senza questo campo quella distinzione viveva solo
  // nella prosa dei dettagli, dove l'app non poteva applicarla. Vuoto = rivederlo non da' niente.
  note_successive: z.number().int().min(0).max(9).nullable().optional(),
  effetti_json: effettiJson,
  prezzo: z.number().int().min(0).max(9_999_999).nullable().optional(),
  sessioni: z.number().int().min(1).max(9).nullable().optional(),
  dettagli: testo(2000).nullable().optional(),
});
export const datiFilm = datiFilmBase.superRefine(rifinisciFilm);
export const datiFilmParziale = datiFilmBase.partial().superRefine(rifinisciFilm);

/** Campi di un'attivita' (compresi lavori e videogiochi) scrivibili dall'utente. */
const datiAttivitaBase = z.object({
  verificato: z.boolean().optional(),
  condizioni_json: z.array(condizioneSpillo).max(20).transform((v) => JSON.stringify(v)).optional(),
  nome: testo(160).min(1),
  tipo: z.enum(chiaviDi(TIPI_ATTIVITA)).default('altro'),
  luogo: testo(300).default(''),
  luogo_chiave: z.string().min(1).max(200).nullable().optional(),
  /** La sede: un luogo della città (migrazione 072). */
  sede_chiave: z.string().max(200).nullable().optional(),
  fascia: z.enum(chiaviDi(FASCE_ATTIVITA)).nullable().optional(),
  costo: z.number().int().min(0).max(9_999_999).nullable().optional(),
  sblocco: testo(400).nullable().optional(),
  sessioni: z.number().int().min(1).max(99).nullable().optional(),
  paga_yen: z.number().int().min(0).max(9_999_999).nullable().optional(),
  paga_massima: z.number().int().min(0).max(9_999_999).nullable().optional(),
  dettagli: testo(4000).nullable().optional(),
  effetti_json: effettiJson,
  tracciamento: z.enum(chiaviDi(TRACCIAMENTI_ATTIVITA)).optional(),
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
});
export const datiAttivita = datiAttivitaBase.superRefine(rifinisciAttivita);
export const datiAttivitaParziale = datiAttivitaBase.partial().superRefine(rifinisciAttivita);

/** Campi di un luogo della città scrivibili dall'utente (migrazione 071). */
export const datiLuogo = z.object({
  verificato: z.boolean().optional(),
  condizioni_json: z.array(condizioneSpillo).max(20).transform((v) => JSON.stringify(v)).optional(),
  quartiere_chiave: z.string().min(1).max(80),
  tipo: z.enum(chiaviDi(TIPI_LUOGO)).default('altro'),
  nome: testo(160).min(1),
  cosa_offre: testo(600).default(''),
  quando: z.enum(['giorno', 'sera', 'entrambe']).nullable().optional(),
  /** Le chiavi dei giorni (migrazione 080); vuoto = nessuna limitazione. */
  giorni_json: z.array(z.enum(GIORNI_SETTIMANA_CHIAVI)).max(7).transform((v) => JSON.stringify(GIORNI_SETTIMANA_CHIAVI.filter((g) => v.includes(g)))).optional(),
  note: testo(2000).nullable().optional(),
});

/** Campi di una domanda in classe o d'esame.
 *
 * `risposte_json` arriva come **elenco**, non come testo libero: è la risposta giusta — o la
 * sequenza giusta, per le domande a più passaggi — ed è il dato che l'app usa per dire «rispondi
 * questo». Un campo libero avrebbe fatto scrivere la stessa risposta in dieci modi diversi senza
 * renderne utile nessuno: è lo stesso difetto che avevano le Doti prima del loro editor. */
export const datiDomanda = z.object({
  data: dataGioco,
  tipo: z.enum(['classe', 'esame-medio', 'esame-finale', 'tv', 'altro']).default('classe'),
  chi: testo(120).default(''),
  domanda: testo(600).min(1),
  risposte_json: z.array(z.object({ ordine: z.number().int().min(1).max(20), testo: testo(300).min(1), domanda: testo(600).optional() })).max(20)
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
export const SCHEMI_CATALOGO = { negozio: datiNegozio, articolo: datiArticolo, libro: datiLibro, film: datiFilm, attivita: datiAttivita, luogo: datiLuogo, domanda: datiDomanda, cruciverba: datiCruciverba } as const;
/** Gli stessi, per la correzione di alcuni campi soltanto: film e attività portano la rifinitura sulla forma parziale. */
export const SCHEMI_CATALOGO_PARZIALI = { negozio: datiNegozio.partial(), articolo: datiArticolo.partial(), libro: datiLibro.partial(), film: datiFilmParziale, attivita: datiAttivitaParziale, luogo: datiLuogo.partial(), domanda: datiDomanda.partial(), cruciverba: datiCruciverba.partial() } as const;
export const queryNascosti = z.object({ nascosti: z.enum(['1', 'true']).optional(), negozio: z.string().min(1).max(200).optional() });
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
