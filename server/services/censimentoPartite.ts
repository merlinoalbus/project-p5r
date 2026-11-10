// ============================================================
// censimentoPartite — ogni tabella e ogni colonna «di riferimento» del file delle partite è classificata (L11-04)
// ============================================================
//
// Fra i due file non ci sono chiavi esterne: i riferimenti delle partite verso i dati di gioco li verifica `RIFERIMENTI_PARTITE`
// (`pacchettoGiocoService`), che dice quali righe resterebbero orfane sostituendo `gioco.db`. Un elenco scritto a mano però invecchia:
// le tabelle nate dopo (gli stati delle voci, i punti dei Confidenti, la Fortuna, il piazzamento agli esami…) non c'erano.
//
// Qui il controllo si genera dallo schema reale: per ogni tabella dello schema `utente`, ogni colonna dal nome di riferimento
// (`…_chiave`, `…_uid`, `…_id`, `chiave`, `data`, `dote`, `da_voce`, `acquisto_articolo`) deve stare in `RIFERIMENTI_PARTITE` oppure qui,
// con il motivo per cui non cita una riga di gioco; e ogni tabella deve essere elencata qui (anche senza colonne da dire). Una tabella o
// una colonna nuova non classificata si dice con un avviso nel log all'avvio dell'istanza di preparazione (`server/index.ts`) e nella
// preparazione di un'edizione (`edizioneService`), con l'elenco di ciò che manca; non blocca niente (decisione dell'utente del 01/11).
// `id`, `uid` e `partita_id` sono l'identità della riga e il legame con la partita, ovunque. I valori ammessi delle colonne di tipo delle
// chiavi polimorfe (`tipo`, `causa_tipo`) non sono censiti: un tipo nuovo non si segnala.
// ============================================================

import type { AppDatabase } from '../db/dbService.js';
import { RIFERIMENTI_PARTITE } from './pacchettoGiocoService.js';
import { logger } from '../utils/logger.js';

const INTERNA = 'identità interna del file delle partite';
const OPERAZIONE = 'identità di un’operazione (ricevuta idempotente), non una riga di gioco';
const POLIMORFA = 'chiave polimorfa: le varianti che citano una tabella di gioco stanno in RIFERIMENTI_PARTITE con il filtro sul tipo; '
  + 'le altre sono composte (voce:effetto, attività:turno, tipo:chiave) o non sono righe di gioco (yen, punti pesca, eventi di storia)';
const CALENDARIO = 'giorno del calendario di gioco («MM-GG»), non una riga che una sostituzione possa togliere';
const COSTANTE = 'chiave di un elenco del codice (`shared/`), non del file di gioco';
const ESITO = 'chiave di un esito dichiarato nel JSON dell’attività (`attivita.esiti_json`), non una riga di gioco';
const LADRO = 'Ladro della squadra: è in `dati_guida`, non in una tabella (si verifica con la squadra)';
const ARCHIVIO = 'archivio immutabile delle presenze storiche: riga interna del file delle partite';

/**
 * Le tabelle del file delle partite con le colonne dal nome di riferimento che NON citano una riga di gioco (e il motivo). Una tabella senza
 * colonne da dire c'è lo stesso, vuota: il censimento è per tabella.
 */
export const CENSIMENTO_PARTITE: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  acquisto_legacy_associazione: { articolo_chiave: 'la stessa chiave della riga di `acquisto_partita` (chiave esterna composta), già verificata lì', valutazione_id: ARCHIVIO },
  acquisto_legacy_continuita: {},
  acquisto_legacy_raccordo: { acquisto_id: INTERNA, valutazione_id: ARCHIVIO },
  acquisto_legacy_valutazione: {},
  acquisto_operazione: { operazione_id: OPERAZIONE },
  acquisto_partita: {},
  acquisto_provenienza: { acquisto_id: INTERNA, operazione_id: OPERAZIONE },
  acquisto_registrato: {},
  appunto_fisso: { categoria_id: 'la categoria dell’appunto, in `categoria_appunti` dello stesso file (chiave esterna), non una riga di gioco' },
  attivita_svolta_partita: {},
  beneficio_ciclo: { causa_chiave: POLIMORFA, chiave: POLIMORFA },
  categoria_appunti: {},
  censimento_stato_voce: { chiave: POLIMORFA },
  cestino_partite: { chiave: 'identità dell’elemento nel cestino (partita, fonte, sessione…), non una riga di gioco' },
  ciclo_salvato: {},
  compendio_partita: {},
  confidente_partita: {},
  consumo_oggetto_partita: { esito_chiave: ESITO, evento_id: INTERNA },
  cruciverba_partita: {},
  da_applicare: { causa_chiave: POLIMORFA, chiave: POLIMORFA },
  divergenza_partita: {},
  domanda_partita: {},
  dote_sociale_partita: {},
  effetto_applicato: { chiave: POLIMORFA },
  effetto_lettura_partita: {},
  effetto_stato_voce: { chiave: POLIMORFA },
  esame_piazzamento_partita: {},
  evento_partita: {},
  evento_storia_partita: { evento_chiave: COSTANTE },
  fortuna_partita: {},
  incontro_confidente_partita: { data: CALENDARIO },
  invito_partita: {},
  membro_squadra_partita: { personaggio_chiave: LADRO },
  meteo_partita: { data: CALENDARIO },
  movimento_punti_pesca: { proposta_uid: INTERNA, operazione_id: OPERAZIONE, causa_chiave: POLIMORFA },
  movimento_yen: { proposta_uid: INTERNA, operazione_id: OPERAZIONE, causa_chiave: POLIMORFA },
  obiettivo_partita: {},
  oggetto_esito_turno: { esito_chiave: ESITO },
  oggetto_ottenuto_partita: {},
  partita: {},
  persona_posseduta: {},
  persona_posseduta_skill: { posseduta_id: INTERNA },
  pesca_acquisto_esca: {},
  pesca_cattura: { sessione_id: INTERNA, osservazione_id: INTERNA },
  pesca_fatto_fonte: { evento_chiave: COSTANTE, sessione_id: INTERNA, cattura_id: INTERNA, provenienza_id: INTERNA, operazione_id: OPERAZIONE },
  pesca_operazione: { operazione_id: OPERAZIONE },
  pesca_osservazione: { sessione_id: INTERNA, precedente_id: INTERNA },
  pesca_provenienza: { sessione_id: INTERNA, operazione_id: OPERAZIONE },
  pesca_quota_storica: { sessione_id: INTERNA, turno_uid: INTERNA },
  pesca_sessione: { turno_uid: INTERNA },
  piano_salvato: { obiettivo_id: INTERNA },
  primo_richiamo_speso: { posseduta_id: 'l’esemplare di `persona_posseduta` con cui la Persona è entrata in scorta (identità interna, senza chiave esterna: l’esemplare può andarsene e la riga resta)' },
  progresso_film_partita: {},
  progresso_libro_partita: {},
  progresso_videogioco_partita: {},
  proposta_operazione: { operazione_id: OPERAZIONE },
  punti_confidente_generazione: {},
  punti_confidente_voce: {},
  punti_negozio_partita: {},
  punti_pesca_partita: {},
  punto_partita: {},
  regalo_partita: { registro_id: INTERNA },
  registro_acquisti: {},
  richiesta_partita: {},
  sblocco_partita: {},
  sessione_videogioco_partita: {},
  spillo_partita: {},
  spillo_partita_infiltrazione: {},
  spunta_voce_partita: {},
  timbri_dedalo_partita: {},
  trofeo_esito_turno: { evento_id: INTERNA },
  trofeo_partita: {},
  turno_partita: {},
  turno_voce_partita: {},
  yen_automatico: { causa_chiave: POLIMORFA },
  yen_automatico_inizio: {},
  yen_fuori_registro: { causa_chiave: POLIMORFA },
};

/** Le colonne che sono l'identità della riga o il legame con la partita, in ogni tabella. */
const IDENTITA = new Set(['id', 'uid', 'partita_id']);
/** Un nome di colonna «di riferimento»: deve stare in `RIFERIMENTI_PARTITE` o nel censimento. */
export const eColonnaDiRiferimento = (nome: string): boolean =>
  /(^|_)(chiave|uid|id)$/.test(nome) || ['data', 'dote', 'da_voce', 'acquisto_articolo'].includes(nome);

/** Come una colonna dello schema reale è classificata: riferimento verificato, non riferimento (con il motivo), identità, o niente. */
export interface ColonnaCensita { tabella: string; colonna: string; esito: 'riferimento' | 'non-riferimento' | 'identita' | 'non-censita'; motivo?: string }

/** Tutte le colonne dal nome di riferimento dello schema `utente` reale, con la loro classificazione (per il confronto schema / elenco). */
export function colonneDelCensimento(db: AppDatabase, schema = 'utente'): { tabelleNonCensite: string[]; colonne: ColonnaCensita[] } {
  const riferite = new Set(RIFERIMENTI_PARTITE.map((r) => `${r.tabella}.${r.colonna}`));
  const tabelle = db.prepare(`SELECT name FROM "${schema}".sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).pluck().all() as string[];
  const tabelleNonCensite: string[] = [];
  const colonne: ColonnaCensita[] = [];
  for (const tabella of tabelle) {
    const censita = CENSIMENTO_PARTITE[tabella];
    if (!censita) tabelleNonCensite.push(tabella);
    for (const colonna of db.prepare(`SELECT name FROM pragma_table_info(?, '${schema}')`).pluck().all(tabella) as string[]) {
      if (!eColonnaDiRiferimento(colonna)) continue;
      if (IDENTITA.has(colonna)) colonne.push({ tabella, colonna, esito: 'identita' });
      else if (riferite.has(`${tabella}.${colonna}`)) colonne.push({ tabella, colonna, esito: 'riferimento' });
      else if (censita?.[colonna]) colonne.push({ tabella, colonna, esito: 'non-riferimento', motivo: censita[colonna] });
      else colonne.push({ tabella, colonna, esito: 'non-censita' });
    }
  }
  return { tabelleNonCensite, colonne };
}

/** Ciò che lo schema reale ha e il censimento non classifica: tabelle nuove e colonne di riferimento nuove. Vuoto = tutto classificato. */
export function fuoriDalCensimentoPartite(db: AppDatabase, schema = 'utente'): string[] {
  const { tabelleNonCensite, colonne } = colonneDelCensimento(db, schema);
  return [
    ...tabelleNonCensite.map((t) => `tabella ${t}`),
    ...colonne.filter((c) => c.esito === 'non-censita').map((c) => `colonna ${c.tabella}.${c.colonna}`),
  ];
}

/**
 * Scrive nel log un avviso con ciò che manca, se lo schema delle partite ha tabelle o colonne di riferimento non classificate. Non blocca
 * niente (decisione dell'utente del 01/11: «al massimo warning»): l'avvio e «Prepara edizione» proseguono. Restituisce l'elenco.
 */
export function avvisaCensimentoPartite(db: AppDatabase, schema = 'utente'): string[] {
  const fuori = fuoriDalCensimentoPartite(db, schema);
  if (fuori.length) {
    logger.warn({ fuoriDalCensimento: fuori }, 'censimento delle partite incompleto: ogni tabella va in CENSIMENTO_PARTITE (censimentoPartite.ts) '
      + 'e ogni colonna di riferimento in RIFERIMENTI_PARTITE (pacchettoGiocoService) o nel censimento, con il motivo');
  }
  return fuori;
}
