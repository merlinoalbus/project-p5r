// ============================================================
// tanakaDecisione — i tipi della decisione unitaria del listino di Tanaka (L7-TANAKA-TRANSAZIONE, RICEVUTA, RIPRISTINO)
// ============================================================

/** I valori di un'offerta che il piano confronta e scrive. */
export interface ValoriOffertaTanaka {
  nome: string;
  categoria: string;
  prezzo: number | null;
  condizioniJson: string | null;
  catalogo: string | null;
  nascosto: boolean;
}

/** Una riga del piano: dove va ciascuna offerta. `aggiorna` = chiave conservata con i valori Royal; `nascondi` = senza riscontro Royal,
 *  nascosta e conservata nell'archivio; `crea` = offerta Royal nuova. */
export interface RigaPianoTanakaDto {
  chiave: string;
  destinazione: 'aggiorna' | 'nascondi' | 'crea';
  /** Il rapporto documentale del manifesto («Abbinamento proposto», «Corrispondenza soltanto possibile», «Nuova offerta proposta»…). */
  rapporto: string;
  prima: ValoriOffertaTanaka | null;
  dopo: ValoriOffertaTanaka | null;
}

/** L'anteprima su cui l'utente dà il consenso: il piano riga per riga, i blocchi e le revisioni da rimandare alla conferma (CAS). */
export interface AnteprimaPianoTanakaDto {
  versione: 1;
  negozio: string;
  fonte: string;
  revisioneConfronto: string;
  /** L'impronta di tutto ciò che il piano tocca o da cui dipende, letta adesso: la conferma la ricontrolla. */
  revisionePiano: string;
  righe: RigaPianoTanakaDto[];
  conteggi: { correnti: number; royal: number; aggiorna: number; crea: number; nascondi: number; attiveDopo: number };
  /** Perché il piano non si può applicare adesso (collisioni, assenze, personalizzazioni, stati già gestiti, decisione già attiva). */
  blocchi: string[];
  applicabile: boolean;
  /** L'operazione della decisione già applicata e non ripristinata, se c'è. */
  decisioneAttiva: string | null;
  /** Le note storiche della fonte legate alle offerte o agli oggetti del piano (Homunculus, G-034), separate dai prezzi. */
  noteStoriche: Array<{ id: string; testo: string; fonte: string; legame: string }>;
}

/** IMPORT: lo stato del listino di Tanaka e del registro delle decisioni in un file di gioco (istanza o pacchetto). */
export interface StatoTanakaFileDto {
  /** Il registro (migrazione 150) c'è. */
  registro: boolean;
  decisioni: number;
  attiva: string | null;
  listino: 'precedente' | 'royal' | 'misto' | 'assente';
  noteStoriche: number;
  /** Fotografie leggibili, versione nota, al più una decisione attiva, ripristini di decisioni esistenti. */
  registroIntegro: boolean;
  problemi: string[];
}

/** La ricevuta di una decisione confermata: il piano mostrato, l'archivio delle 20 offerte di prima, la fotografia di dopo, lo stato. */
export interface RicevutaTanakaDto {
  operazioneId: string;
  versione: 1;
  negozio: string;
  confermataIl: string;
  revisioneConfronto: string;
  revisionePiano: string;
  piano: AnteprimaPianoTanakaDto;
  /** Le 20 identità commerciali precedenti, integre, con i loro prezzi: l'archivio consultabile. */
  archivio: Array<{ chiave: string; riga: Record<string, unknown> | null }>;
  dopo: Record<string, unknown>;
  stato: 'attiva' | 'ripristinata';
  ripristino: { operazioneId: string; ripristinataIl: string } | null;
  /** L'impronta dello stato attuale delle righe toccate: il ripristino la ricontrolla. */
  revisioneStato: string;
}
