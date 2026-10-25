// ============================================================
// descrizioni/compendio — le rotte di `/api/compendio`: compendio Royal, guida giorno per giorno, città, negozi, Palazzi
// ============================================================
//
// L'area è in gran parte di sola lettura (Persona, skill, oggetti, Confidenti, glossario, blocchi della guida), con
// `?partita=` facoltativo dove la risposta può portare lo stato di una partita. Le scritture sono **canone**: voci della
// giornata, testi dei Palazzi (dungeon, aree, punti, pin collegati), ingresso dei quartieri e Doti al passaggio di rango dei
// Confidenti finiscono nel file di gioco e valgono per tutte le partite.
// ============================================================

import type { DescrizioniArea } from '../tipi.js';

/** Errore comune: `?partita=` indica una partita che non esiste. */
const PARTITA_NON_TROVATA = [404, 'partita-non-trovata'] as const;

/** Le descrizioni delle rotte montate sotto `/api/compendio` (`server/routes/compendio.ts`). */
export const DESCRIZIONI_COMPENDIO: DescrizioniArea = {
  'PUT /api/compendio/percorso/voci/:uid/effetti': {
    sommario: 'Modifica esplicitamente l’intero insieme degli effetti',
    descrizione: 'Corpo strict {revisioneEffettiAttesa,effetti:[{uid,effetto}]}. UID null crea un effetto nuovo. I tre tipi legacy e acquisto passano da un unico writer. L13 (ondata 3): tipi `yen` {importo con segno, non zero; 409 `yen-gia-strutturati` accanto ad articolo, acquisto, pesca o Richiesta; al più uno per voce}, `oggetto` {oggetto, quantita}, `trofeo` {trofeo}, `sblocco` {bersaglio: richiesta|attivita, chiave}; `articolo` accetta `quantita` facoltativa (2–999); `dote.possibili` e `turno.esito` dell’ondata 2. La rimozione di un effetto non cancella fotografie o decisioni personali; le spunte precedenti non vengono rieseguite e ricevono proposte storiche distinte.',
    risposta: '`StatoEffettiVoceDto`', errori: [[409,'effetti-cambiati']],
  },
  'GET /api/compendio/percorso/effetti/proposte': {
    sommario: 'Raccordi documentati degli effetti del Diario',
    descrizione: 'Proposte identificate sulla voce e sui suoi effetti reali, con fonte/motivo e stato corrente. Nessun matching nominale automatico, nessuna conversione di vecchie Doti in consumazioni.',
    risposta: '`PropostaEffettoVoceDto[]`',
  },
  'POST /api/compendio/percorso/effetti/proposte/:id/anteprima': {
    sommario: 'Rivedi conferma o scarto di un raccordo del Diario',
    descrizione: 'Corpo strict RichiestaAnteprimaDecisioneEffettoVoce. Mostra fonte completa e numero delle partite già spuntate, senza toccarne Doti, yen o check.',
    risposta: '`AnteprimaDecisioneEffettoVoceDto`', errori: [[409,'proposta-cambiata']],
  },
  'POST /api/compendio/percorso/effetti/proposte/:id/decisione': {
    sommario: 'Decidi il raccordo degli effetti con CAS',
    descrizione: 'Corpo dell’anteprima più revisionePropostaAttesa. La decisione aggiorna solo il canone mediante il writer unico; per check preesistenti crea proposte personali esplicite. Operazione ID/payload idempotente, nessuna riscrittura delle ricevute storiche.',
    risposta: '`StatoEffettiVoceDto` dopo la decisione', errori: [[409,'proposta-cambiata'],[409,'operazione-diversa']],
  },
  // ---- Compendio: arcani, glossario, regole di fusione ----
  'GET /api/compendio/glossario': {
    sommario: 'Glossario dei codici del compendio con la resa italiana',
    descrizione: 'Serve al frontend per tradurre i codici: arcani, elementi delle skill, elementi e sigle delle affinità, affinità, tipi di eredità, statistiche con sigla, tipi e vincoli degli oggetti, aree di Mementos e Doti sociali nell\'ordine di gioco. La sigla vuota indica che la traduzione non ne ha una.',
    risposta: '`GlossarioDto`',
  },
  'GET /api/compendio/termini': {
    sommario: 'Termini di gioco della localizzazione italiana',
    descrizione: 'Le voci dell\'ambito di traduzione `termine`, ordinate per categoria e poi per nome (confronto italiano). Categoria «altro» quando la voce non ne dichiara una; definizione e fonte sono null se mancano.',
    risposta: 'Elenco di `TermineDto`',
  },
  'GET /api/compendio/fusione/regole': {
    sommario: 'Tutte le regole di fusione in una risposta',
    descrizione: 'Ordine degli arcani, tabella arcano × arcano, ricette delle fusioni speciali (ingredienti nell\'ordine della ricetta), tesori con il modificatore di rango per ogni arcano (0 dove manca), matrice dell\'eredità (tipo × colonna, ammesso sì/no) e Persona di ciascun set DLC nell\'ordine dei set. È la base del motore di fusione lato client.',
    risposta: '`RegoleFusioneDto`',
  },

  // ---- Compendio: Persona, skill, oggetti ----
  'GET /api/compendio/persona': {
    sommario: 'Elenco delle Persona con filtri',
    descrizione: 'Filtri facoltativi: `arcana`, `livelloMin`/`livelloMax` (estremi compresi), `dlc`, `rara`, `speciale`, `skill` (nome canonico di una skill che la Persona impara) e `q`, testo cercato sul nome originale e su quello italiano con la ricerca normalizzata. Ordine: livello, ordine dell\'arcano, nome. Ogni voce porta statistiche e affinità.',
    risposta: 'Elenco di `PersonaRiassuntoDto`',
  },
  'GET /api/compendio/persona/:id': {
    sommario: 'Scheda completa di una Persona',
    descrizione: 'Riassunto più skill apprese per livello, dettaglio del tratto, ricetta speciale (se la Persona ne è il risultato) e ricette di cui è ingrediente, set DLC, carte skill ottenibili con l\'esecuzione, titolo di negoziazione, aree e piani di Mementos, oggetto e oggetto d\'allarme con nome e descrizione tradotti.',
    risposta: '`PersonaDettaglioDto`; `affinitaGuida` porta le affinità come le dà la guida solo se l\'utente ne ha corretta almeno una, altrimenti null.',
    errori: [[404, 'persona-non-trovata']],
  },
  'PUT /api/compendio/persona/:id/affinita': {
    sommario: 'Corregge le affinità di una Persona (la griglia dei 10 elementi)',
    descrizione: 'Corpo strict `{ affinita: [{ elemento, codice }] }` con tutti e 10 gli elementi una volta sola (phys, gun, fire, ice, electric, wind, psy, nuclear, bless, curse; Divino non esiste) e il codice fra `wk`, `rs`, `nu`, `rp`, `ab`, `-`. Cambia solo le righe diverse dall\'attuale: alla prima correzione di una riga `persona_affinita` conserva il valore della guida (`seed_codice`) e passa a origine «utente»; riportare un elemento al valore della guida lo rimette «seed». Una griglia uguale all\'attuale non scrive. Svuota la cache dei dati di gioco: scheda Persona, Ombra, Battaglia, dedali e Stanza di Velluto leggono la stessa tabella, quindi mostrano subito il valore nuovo. Le differenze proprie di un\'Ombra non cambiano. Vale anche per le forme del gruppo.',
    risposta: '`PersonaDettaglioDto` aggiornato',
    errori: [[400, 'validation-error'], [404, 'persona-non-trovata']],
  },
  'POST /api/compendio/persona/:id/affinita/ripristina': {
    sommario: 'Riporta le affinità di una Persona a quelle della guida',
    descrizione: 'Rimette in `codice` il valore conservato in `seed_codice` di ogni riga corretta e riporta l\'origine a «seed». 409 `affinita-della-guida` se nessuna affinità della Persona è stata corretta.',
    risposta: '`PersonaDettaglioDto` aggiornato',
    errori: [[404, 'persona-non-trovata'], [409, 'affinita-della-guida']],
  },
  'GET /api/compendio/skill': {
    sommario: 'Elenco delle skill con filtri',
    descrizione: 'Ordinate per nome. `elemento` filtra in SQL; `q` cerca poi su nome canonico, nome italiano ed effetto (originale e tradotto) con la ricerca normalizzata.',
    risposta: 'Elenco di `SkillRiassuntoDto`',
  },
  'GET /api/compendio/skill/:id': {
    sommario: 'Scheda di una skill',
    descrizione: 'Riassunto della skill con le Persona che la imparano (livello della Persona e livello di apprendimento, in ordine di livello), le Persona da cui si ottiene la carta con l\'esecuzione, la fonte della carta, la negoziazione (titolo tradotto con la Persona fra parentesi) e l\'eventuale esclusività.',
    risposta: '`SkillDettaglioDto`',
    errori: [[404, 'skill-non-trovata']],
  },
  'GET /api/compendio/oggetti': {
    sommario: 'Oggetti del compendio con le rese italiane',
    descrizione: 'Ordinati per categoria e nome, con nome, categoria, vincolo e descrizione tradotti. `categoria` filtra in SQL; `q` cerca sul nome originale e su quello italiano.',
    risposta: 'Elenco di `OggettoDto`',
  },
  'GET /api/compendio/confidenti': {
    sommario: 'Elenco dei Confidenti nell\'ordine di gioco',
    descrizione: 'Chiave, nome, arcano e ordine di ogni Confidente, con il nome italiano dell\'arcano. Lo stato nella partita non c\'è: sta nelle rotte delle partite.',
    risposta: 'Elenco di `ConfidenteDto`',
  },
  'GET /api/compendio/confidenti/:chiave': {
    sommario: 'Scheda completa di un Confidente',
    descrizione: 'Abilità per rango, dialoghi con le scelte (punti, risposte romantiche, avvisi), Dote al passaggio di rango per i ranghi da 1 a 10 (`dotiIncontro`), regali consigliati (con `ordine` e `modificato`) e sconsigliati (`regaliSconsigliati`: `ordine`, `nome`, `modificato`; l’indirizzo per correggerli è `<confidente>:<ordine>` su `/api/correzioni/regalo`), disponibilità, note e fonti. I regali collegati leggono nome dal catalogo, prezzo minimo/massimo e dove dai listini visibili, comprese le sedi aggiuntive. `nomeStorico` e `nota` conservano le indicazioni precedenti; senza offerte il costo resta indicazione della guida (`listinoCollegato: false`), non un prezzo di vendita corrente. Dati di gioco, senza stato di partita né disponibilità commerciale presunta.',
    risposta: '`ConfidenteDettaglioDto`; dopo M7 aggiunge oggettiRicompensa per chiave, con quantità, nota delle condizioni e casa. Sono doni ricevuti dal Confidente, separati dai regali graditi da consegnare; nessun ottenimento o rango viene registrato dalla lettura.',
    errori: [[404, 'confidente-non-trovato']],
  },
  'PUT /api/compendio/confidenti/:chiave/doti-incontro': {
    sommario: 'Imposta la Dote data al passaggio di rango, rango per rango',
    descrizione: 'Per ogni rango indicato sostituisce le voci «dote» che il rango aveva con quelle inviate (da 0 a 5 Doti, note da 1 a 3); i ranghi non inviati restano come sono. Tutto in una transazione. È un dato di gioco: vale per tutte le partite.',
    risposta: '`ConfidenteDettaglioDto` aggiornato',
    errori: [[404, 'confidente-non-trovato']],
  },
  'GET /api/compendio/confidenti/:chiave/disponibilita': {
    sommario: 'Informazioni del Confidente e storico, indipendenti dai requisiti operativi',
    descrizione: 'Sola lettura, no-store. Gli otto campi informativi conservano i valori RAW: giorni/fasce/fonti illeggibili sono segnalati senza impedire l’accesso all’editor. Riporta proposta Makoto, esito della bonifica131, versioni ripristinabili e revisione CAS comprendente riga completa e registro. Registro malformato, identità o catena incoerente:409, nessun reset. Non legge o modifica la partita.',
    risposta: '`EditorInformazioniConfidenteDto`',
    errori: [[404, 'confidente-non-trovato'], [409, 'storico-disponibilita-incoerente'], [409, 'informazioni-confidente-illeggibili']],
  },
  'POST /api/compendio/confidenti/:chiave/disponibilita/anteprima': {
    sommario: 'Anteprima della proposta, PATCH manuale, creazione o ripristino informativo',
    descrizione: 'Sola lettura, no-store. Azioni strict:applica-proposta con ID makoto-calendario-v1; modifica-manuale con i soli valori selezionati e motivo; crea-informazioni con tutti gli otto campi e motivo; ripristina-versione con ID. Ogni azione richiede revisioneAttesa. La proposta conserva obbligatoriamente nelle note i valori correnti esatti di giorni/fasce/data/requisiti, anche sulle varianti, e non modifica i requisiti del rango1. La PATCH conserva i byte degli altri campi e non normalizza elenchi semanticamente invariati. Il ripristino RAW illeggibile è consentito ma segnalato come non validato.',
    risposta: '`AnteprimaInformazioniConfidenteDto`: prima/dopo RAW, campiCambiati, avvertenze e anteprimaAttesa',
    errori: [[404, 'confidente-non-trovato'], [409, 'informazioni-confidente-obsolete'], [409, 'storico-disponibilita-incoerente'], [409, 'proposta-disponibilita-inapplicabile'], [409, 'versione-disponibilita-assente'], [409, 'informazioni-confidente-presenza-diversa']],
  },
  'PUT /api/compendio/confidenti/:chiave/disponibilita': {
    sommario: 'Salva la modifica informativa mostrata nell’anteprima, con storico e CAS',
    descrizione: 'Payload dell’anteprima più anteprimaAttesa e operazioneId UUID. Transazione immediata: verifica registro e identità, riconosce prima del CAS il replay del payload originale, poi confronta CAS/anteprima e aggiorna solo i campi cambiati, insieme alla revisione append-only. Replay identico restituisce l’esito storico e il corrente anche se successivamente cambiato, senza riscriverlo; stesso ID con payload diverso:409. No-op non scrive né aggiunge revisioni. Ripristino recupera una versione esatta, senza cancellare lo storico; creazione e modifica restano distinte. Nessun effetto su requisiti strutturati, semafori, Diario o progressi.',
    risposta: '`EsitoInformazioniConfidenteDto`: esito salvata/invariata/gia-eseguita, versione e corrente',
    errori: [[404, 'confidente-non-trovato'], [409, 'storico-disponibilita-incoerente'], [409, 'informazioni-confidente-obsolete'], [409, 'anteprima-disponibilita-obsoleta'], [409, 'operazione-disponibilita-riutilizzata'], [409, 'informazioni-confidente-cambiate']],
  },
  'GET /api/compendio/confidenti/:chiave/disponibilita-strutturata': {
    sommario: 'Disponibilità strutturata del Confidente, con i luoghi per chiave e, con ?partita=, se è disponibile adesso',
    descrizione: 'Sola lettura, no-store. La struttura (modo, giorni, fasce, eccezioni, «dal», motivo senza luogo, fonte G-036) è la fonte di ciò che l’app valuta; il testo libero resta nelle note. I luoghi sono quelli non nascosti di L5 (`luogo.confidenti_json`). Con `?partita=` aggiunge `oggi`: stato (disponibile, non-disponibile, su-messaggio, trama, sconosciuto), motivo e causa.',
    risposta: '`DisponibilitaConfidenteDto`',
    errori: [[404, 'confidente-non-trovato'], [404, 'disponibilita-non-trovata'], [404, 'partita-non-trovata']],
  },
  'PUT /api/compendio/confidenti/:chiave/disponibilita-strutturata': {
    sommario: 'Cambia la disponibilità strutturata del Confidente (e i suoi luoghi per chiave)',
    descrizione: 'Corpo strict e parziale: modo, giorni, fasce, eccezioni, dal (MM-GG o null), motivoSenzaLuogo, luoghi (chiavi). Alla prima modifica conserva la fotografia della fonte G-036 per «Ripristina». I luoghi si cambiano passando dal luogo (`aggiornaElemento`), con il suo «Ripristina»; una chiave inesistente è 400. Una sola transazione; no-store.',
    risposta: '`DisponibilitaConfidenteDto` aggiornato',
    errori: [[400, 'luogo-non-trovato'], [400, 'modo-non-valido'], [400, 'data-non-valida'], [404, 'confidente-non-trovato'], [404, 'disponibilita-non-trovata']],
  },
  'POST /api/compendio/confidenti/:chiave/disponibilita-strutturata/ripristina': {
    sommario: 'Riporta la disponibilità strutturata alla fonte G-036',
    descrizione: 'Rimette la struttura conservata alla prima modifica e toglie la fotografia. I luoghi non si ripristinano da qui: si ripristinano dal luogo. 409 `disponibilita-della-guida` se non è stata modificata.',
    risposta: '`DisponibilitaConfidenteDto`',
    errori: [[404, 'confidente-non-trovato'], [409, 'disponibilita-della-guida'], [409, 'disponibilita-fotografia-illeggibile']],
  },
  'GET /api/compendio/giorni/:data': {
    sommario: 'Il giorno di gioco come lo vede l’editor (meteo nelle due fasce, nota, trama, vincoli)',
    descrizione: 'Sola lettura. `data` è MM-GG. `modificato` è vero se il giorno è stato cambiato rispetto alla guida. Il giorno della settimana non si salva: si calcola dalla data.',
    risposta: '`GiornoModificabileDto`',
    errori: [[404, 'giorno-non-trovato']],
  },
  'PUT /api/compendio/giorni/:data': {
    sommario: 'Cambia il giorno di gioco: meteo di giorno e di sera, nota, flag «da verificare», trama, vincoli',
    descrizione: 'Corpo strict e parziale. Alla prima modifica la riga conserva com’era la guida (`seed_json`) e passa a origine «utente»; calendario, meteo della guida e guida del percorso leggono la stessa riga. Una modifica che non cambia niente non scrive.',
    risposta: '`GiornoModificabileDto` aggiornato',
    errori: [[404, 'giorno-non-trovato']],
  },
  'POST /api/compendio/giorni/:data/ripristina': {
    sommario: 'Riporta il giorno di gioco alla guida',
    descrizione: 'Rimette i campi conservati alla prima modifica, toglie la fotografia e riporta l’origine a «seed». 409 `giorno-della-guida` se il giorno non è stato modificato.',
    risposta: '`GiornoModificabileDto`',
    errori: [[404, 'giorno-non-trovato'], [409, 'giorno-della-guida'], [409, 'giorno-fotografia-illeggibile']],
  },
  'GET /api/compendio/confidenti/:chiave/ranghi': {
    sommario: 'I ranghi del Confidente: modo di avanzamento e soglia in punti',
    descrizione: 'Sola lettura. Per ogni rango da 1 a 9: modo (punti, evento, automatico, richieste, velluto), soglia in punti (solo per «punti»), fonte e se è stato modificato rispetto alla guida.',
    risposta: 'Elenco di `RangoConfidenteDto`',
    errori: [[404, 'confidente-non-trovato']],
  },
  'PUT /api/compendio/confidenti/:chiave/ranghi/:rango': {
    sommario: 'Cambia il modo e la soglia di un rango del Confidente',
    descrizione: 'Corpo strict `{ modo, puntiNecessari }`. Un rango «a punti» ha una soglia maggiore di zero, gli altri modi soglia zero (G-020). Alla prima modifica conserva la fotografia della guida per «Ripristina»; la fonte diventa «utente». Vale per tutte le partite.',
    risposta: 'Elenco di `RangoConfidenteDto` aggiornato',
    errori: [[400, 'modo-non-valido'], [400, 'soglia-non-valida'], [400, 'soglia-incoerente'], [404, 'confidente-non-trovato'], [404, 'rango-non-trovato']],
  },
  'POST /api/compendio/confidenti/:chiave/ranghi/:rango/ripristina': {
    sommario: 'Riporta il rango del Confidente alla guida',
    descrizione: 'Rimette modo, soglia e fonte conservati alla prima modifica e toglie la fotografia. 409 `rango-della-guida` se il rango non è stato modificato.',
    risposta: 'Elenco di `RangoConfidenteDto`',
    errori: [[404, 'confidente-non-trovato'], [409, 'rango-della-guida'], [409, 'confidente-fotografia-illeggibile']],
  },
  'GET /api/compendio/confidenti/:chiave/abilita': {
    sommario: 'Le abilità del Confidente per rango',
    descrizione: 'Sola lettura. Per ogni rango che ha abilità (o che ne aveva prima di una modifica): l’elenco nell’ordine della guida e se è stato modificato.',
    risposta: 'Elenco di `AbilitaRangoDto`',
    errori: [[404, 'confidente-non-trovato']],
  },
  'PUT /api/compendio/confidenti/:chiave/abilita/:rango': {
    sommario: 'Sostituisce le abilità di un rango del Confidente',
    descrizione: 'Corpo strict `{ abilita: [{ nome, descrizione }] }` (da 0 a 20, nome obbligatorio), nell’ordine dato. Alla prima modifica conserva la fotografia per «Ripristina». Vale per tutte le partite.',
    risposta: 'Elenco di `AbilitaRangoDto` aggiornato',
    errori: [[400, 'rango-non-valido'], [400, 'abilita-non-valide'], [404, 'confidente-non-trovato']],
  },
  'POST /api/compendio/confidenti/:chiave/abilita/:rango/ripristina': {
    sommario: 'Riporta le abilità del rango alla guida',
    descrizione: 'Rimette l’elenco conservato alla prima modifica e toglie la fotografia. 409 `abilita-della-guida` se il rango non è stato modificato.',
    risposta: 'Elenco di `AbilitaRangoDto`',
    errori: [[404, 'confidente-non-trovato'], [409, 'abilita-della-guida']],
  },
  'POST /api/compendio/confidenti/:chiave/doti-incontro/:rango/ripristina': {
    sommario: 'Riporta la Dote a ogni incontro del passaggio alla guida',
    descrizione: 'La scrittura della Dote (`PUT …/doti-incontro`) conserva com’era il passaggio alla prima modifica; qui lo si rimette. 409 `dote-della-guida` se il passaggio non è stato modificato.',
    risposta: '`ConfidenteDettaglioDto` aggiornato',
    errori: [[404, 'confidente-non-trovato'], [409, 'dote-della-guida']],
  },
  'PUT /api/compendio/confidenti/:chiave/dialoghi/:id': {
    sommario: 'Cambia le note e le scelte di un dialogo del Confidente, con i punti',
    descrizione: 'Corpo strict `{ note?, scelte? }`; una scelta ha testo, punti (0-100 o nessuno), testo dei punti, romantica e avviso; le scelte si rinumerano da 1. Alla prima modifica conserva la fotografia per «Ripristina». Vale per tutte le partite.',
    risposta: '`DialogoModificatoDto`',
    errori: [[400, 'scelte-non-valide'], [404, 'confidente-non-trovato'], [404, 'dialogo-non-trovato']],
  },
  'POST /api/compendio/confidenti/:chiave/dialoghi/:id/ripristina': {
    sommario: 'Riporta il dialogo del Confidente alla guida',
    descrizione: 'Rimette note e scelte conservate alla prima modifica e toglie la fotografia. 409 `dialogo-della-guida` se il dialogo non è stato modificato.',
    risposta: '`DialogoModificatoDto`',
    errori: [[404, 'confidente-non-trovato'], [404, 'dialogo-non-trovato'], [409, 'dialogo-della-guida']],
  },
  'POST /api/compendio/confidenti/:chiave/inviti': {
    sommario: 'Crea un invito del Confidente per un giorno, con il posto che apre',
    descrizione: 'Corpo strict `{ data: "MM-GG", apre: { tipo: quartiere|luogo|area, chiave }, condizioni, nota }`. La chiave dell’invito è `<confidente>/<data>`: un solo invito per giorno. Le condizioni sono quelle del vocabolario unico e devono riferirsi a dati esistenti. L’invito nasce senza fotografia della guida: si può togliere (Cestino) e non ha «Ripristina».',
    risposta: '`InvitoDto` (201)',
    errori: [[400, 'data-non-valida'], [400, 'condizione-circolare'], [404, 'confidente-non-trovato'], [404, 'posto-non-trovato'], [404, 'condizione-non-trovata'], [409, 'invito-esistente']],
  },
  'PUT /api/compendio/confidenti/:chiave/inviti/:data': {
    sommario: 'Cambia il posto aperto, le condizioni e la nota di un invito',
    descrizione: 'Corpo strict `{ apre, condizioni, nota }`; la data è la chiave e non si cambia. Per un invito della guida la fotografia resta com’era e `modificato` diventa vero: «Ripristina» rimette posto, condizioni e nota. Vale per tutte le partite.',
    risposta: '`InvitoDto`',
    errori: [[400, 'condizione-circolare'], [404, 'confidente-non-trovato'], [404, 'invito-non-trovato'], [404, 'posto-non-trovato'], [404, 'condizione-non-trovata']],
  },
  'POST /api/compendio/confidenti/:chiave/inviti/:data/ripristina': {
    sommario: 'Riporta l’invito del Confidente alla guida',
    descrizione: 'Rimette posto, condizioni e nota dalla fotografia della guida. 409 `invito-della-guida` se l’invito non è stato modificato, 409 `invito-creato-dall-utente` se non viene dalla guida.',
    risposta: '`InvitoDto`',
    errori: [[404, 'confidente-non-trovato'], [404, 'invito-non-trovato'], [409, 'invito-della-guida'], [409, 'invito-creato-dall-utente'], [409, 'invito-fotografia-illeggibile'], [409, 'invito-fotografia-incompleta']],
  },
  'DELETE /api/compendio/confidenti/:chiave/inviti/:data': {
    sommario: 'Toglie un invito creato dall’utente (finisce nel Cestino)',
    descrizione: 'Solo gli inviti creati dall’utente: uno della guida si modifica o si ripristina (409 `invito-della-guida`). 409 `invito-in-uso` se una partita l’ha già registrato, se un effetto di una voce del Diario lo cita o se la condizione di un altro dato lo cita. Risponde 204.',
    risposta: 'Nessun contenuto (204)',
    errori: [[404, 'confidente-non-trovato'], [404, 'invito-non-trovato'], [409, 'invito-della-guida'], [409, 'invito-in-uso']],
  },

  // ---- Blocchi della guida (dati_guida) ----
  'GET /api/compendio/oggetti-guida': {
    sommario: 'Oggetti della guida: consumabili, chiave e materiali, fabbricazione, abiti, scambi',
    descrizione: 'Mantiene le sezioni storiche della guida. Dopo M7, consumabili, chiave/materiali e abiti leggono nome/alias/riferimento dal catalogo per la chiave della fonte; offerte e prezzo derivano dai listini, vecchi prezzi senza vendita solo come nota. Ricette con prodottiCatalogo e materialiCatalogo, nomi/quantità dai legami; resa non dichiarata della ricetta resta null, non una unità. JSON guida conservato; personalizzazione, lavanderia e prosa degli scambi restano distinti. Il crosswalk per nome è usato solo prima di M7.',
    risposta: '`OggettiGuidaDto`; dopo M7 scambi è vuoto e listiniScambi elenca chiave/nome corrente, sede, numero delle offerte visibili e casa del negozio. Il collegamento storico del negozio risolve la sua sede L5. Nessun listino duplicato, prezzo o acquisto calcolato dal testo della guida; indicazioni precedenti conservate nelle note del negozio e nel suo ripristino. Prima di M7 il contratto storico resta invariato.',
    errori: [[404, 'oggetti-non-disponibili']],
  },
  'GET /api/compendio/personaggi': {
    sommario: 'Personaggi senza spoiler e i loro gruppi',
    descrizione: 'Il blocco `personaggi` della guida, restituito così com\'è.',
    risposta: '`PersonaggiDto`',
    errori: [[404, 'personaggi-non-disponibili']],
  },
  'GET /api/compendio/sfide': {
    sommario: 'Battaglie Sfida, boss segreti, Magnate, tratti e quiz TV',
    descrizione: 'Guida alle sfide, con oggettiRicompensa di Battaglie Sfida e boss segreti letti in blocco dal catalogo dopo M7. Testi, punteggi, requisiti, PE, yen e premi del Covo restano indicazioni originali separate, non identità di oggetti inventate. Nessun ottenimento automatico.',
    risposta: '`SfideDto`',
    errori: [[404, 'sfide-non-disponibili']],
  },
  'GET /api/compendio/completamento': {
    sommario: 'Trofei e sezioni di completamento della guida',
    descrizione: 'Trofei in ordine con le sezioni di consultazione (finali, Covo dei Ladri, DLC, meteo, Nuova Partita+, differenze di Royal, gestione del tempo). Con `?partita=` ogni trofeo dice se è ottenuto e `ottenuti` li conta; senza, sono tutti non ottenuti.',
    risposta: '`CompletamentoDto`; dopo M7 le righe del Covo possono aggiungere oggettiRicompensa per chiave. Arredi e gallerie non diventano oggetti di inventario. I due premi finali mantengono requisiti e ritiro in nota, senza presumerli ottenuti.',
    errori: [[404, 'completamento-non-disponibile'], PARTITA_NON_TROVATA],
  },
  'GET /api/compendio/battaglia': {
    sommario: 'Aiuto in battaglia e indice delle Ombre',
    descrizione: 'Le sezioni della guida alla battaglia (sistema, assalto e hold up, tecnico, staffetta, speciali, negoziazione…) e l\'indice delle Ombre di Palazzi e Dedali: ogni Ombra riceve `personaCollegata`, la Persona del compendio trovata dalla sua maschera per nome inglese o italiano normalizzato (null se l\'Ombra non ha maschera o il nome non corrisponde).',
    risposta: '`BattagliaDto`',
    errori: [[404, 'battaglia-non-disponibile']],
  },
  'GET /api/compendio/ombre': {
    sommario: 'Elenco delle Ombre (L8)',
    descrizione: 'Le Ombre per nome: chiave stabile, nome italiano (e i nomi alternativi, che la ricerca trova), Persona del compendio o nessuna (non reclutabile), personalità (le quattro del gioco o «sconosciuta»), se la Persona si ottiene dall\'incontro (`reclutabile`, `catturabile`) e se ha una negoziazione (`negoziabile`, null se non verificata). Filtri: `q` (nome, nomi alternativi, Persona), `dungeon` (Palazzo o Memento d\'incontro), `personalita`, `persona`. Ogni Ombra porta le debolezze e le altre affinità (dalla Persona del compendio, con le sole differenze proprie dell\'Ombra: nessuna copia) e i luoghi d\'incontro. Con `?partita=` ogni Ombra dice se la sua Persona è registrata (`registrata`) e ogni luogo se è ancora raggiungibile (`raggiungibile`: falso solo per un Palazzo concluso).',
    risposta: '`OmbraSchedaDto[]`',
    errori: [PARTITA_NON_TROVATA],
  },
  'GET /api/compendio/ombre/verifica': {
    sommario: 'Conteggi delle Ombre e rapporto della migrazione',
    descrizione: 'Sola lettura. I conteggi misurati ora (Ombre, con e senza Persona, non catturabili, luoghi, voci collegate, aree dei dedali, per personalità) e il rapporto scritto dalla migrazione che ha creato le Ombre: righe della Battaglia corrette, Ombre con lo stesso nome e personalità diverse, possibili doppioni, voci che non sono Ombre, Ombre senza il nome della guida, personalità completate da G-021. Non c\'è nulla da approvare dall\'interfaccia: sono le decisioni che spettano all\'utente.',
    risposta: '`OmbreVerificaDto`',
    errori: [],
  },
  'GET /api/compendio/negoziazione': {
    sommario: 'Negoziazione per umore: domande, risposte ed esiti (L8)',
    descrizione: 'Il lettore unico della negoziazione. Ogni domanda raccoglie le sue varianti (Royal, file originale dell\'app, eventuali ritocchi); ogni risposta porta, per ogni umore richiesto, una cella: `principale` (l\'esito Royal quando è documentato), `alternative` (quando la fonte si contraddice: celle multi-esito di Royal, esiti dell\'app discordanti dove Royal non dice nulla), `altre` (gli esiti dell\'app, sempre conservati) e `divergenza`. `nonConfermata` avvisa che l\'esito viene dalla classe «unconfirmed» di Royal (ereditato da P5, non confermato). Una cella senza esito (`senza-dato`) resta tale: non è un esito neutro. Una risposta dell\'app legata con sicurezza a una Royal non ripete le celle (`celle` vuote, `celleDa` = la risposta Royal): i suoi esiti sono fra le `altre` di quella cella; le domande composte e l\'abbinamento a bassa certezza (A87) restano con le sole attestazioni dell\'app. Filtri: `umore` (cupa, irritabile, timida, giocosa), oppure `ombra` (la chiave dell\'Ombra: vale la sua personalità valida; sconosciuta o non negoziabile = nessun umore e nessuna domanda, mai una personalità dedotta dal nome), `q` (testo su domande e risposte, anche nell\'originale inglese). Senza `umore` né `ombra`, tutti e quattro gli umori. `domanda` (la chiave di una famiglia) restituisce solo quella, con tutto il dettaglio. `compatto=1` (un umore solo, scelto o dell\'Ombra) è la forma per consultare in battaglia: per ogni domanda le risposte della variante principale con la cella in breve (esito, se è incerto, alternative e divergenze), poche decine di KB invece di circa 800; la ricerca `q` vale sull\'intero corpus. Le rese italiane delle domande nuove sono rese dell\'Esperto, non il testo del gioco (`testoOrigine`).',
    risposta: '`NegoziazioneDto`; con `compatto=1` `NegoziazioneCompattaDto`',
    errori: [[400, 'umore-e-ombra-discordi'], [400, 'umore-richiesto'], [404, 'ombra-non-trovata'], [404, 'negoziazione-non-disponibile']],
  },
  'GET /api/compendio/negoziazione/verifica': {
    sommario: 'Conteggi della negoziazione rimisurati e rapporto dell\'importazione',
    descrizione: 'Sola lettura. I conteggi rifatti ora sulle righe (domande, varianti, risposte, celle Royal per umore, attestazioni dell\'app confrontate con Royal, contraddizioni, rettifiche, domande senza risposta buona), il confronto voce per voce con le misure del contratto (un riscontro, non una soglia) e il rapporto scritto dall\'importazione della migrazione 172 con l\'impronta degli ingressi e gli elenchi consultabili. Non c\'è nulla da approvare dall\'interfaccia.',
    risposta: '`NegoziazioneVerificaDto`',
    errori: [[404, 'negoziazione-non-disponibile']],
  },
  'GET /api/compendio/ombre/:chiave': {
    sommario: 'Scheda di un\'Ombra (L8)',
    descrizione: 'Nome, nomi alternativi, Persona, personalità, affinità (quelle della Persona nel compendio, con le proprie dell\'Ombra dove differiscono, `proprie`: solo le 4 eccezioni di G-019 e le non reclutabili; per queste ultime solo gli elementi noti), dove si incontra (Palazzo e infiltrazione, Memento e dedalo con le aree: unione della guida alla Battaglia, delle voci dei Palazzi e delle voci dei dedali) e le voci della guida che la descrivono. Con `?partita=` dice se la sua Persona è registrata nel compendio della partita, quali luoghi sono ancora raggiungibili e dove si cattura ancora (`raggiungibilita`, R8-15b: un Palazzo concluso è sparito dopo il furto; Iweleth e i Memento non spariscono mai).',
    risposta: '`OmbraDettaglioDto`',
    errori: [[404, 'ombra-non-trovata'], PARTITA_NON_TROVATA],
  },

  // ---- Guida giorno per giorno ----
  'GET /api/compendio/percorso': {
    sommario: 'Indice dei giorni della guida giorno per giorno',
    descrizione: 'Tutti i giorni in ordine, leggeri: giorno della settimana, fase, meteo, numero di avvisi, se il giorno è coperto dalla guida e quante azioni ha (contano solo le voci di genere «azione», le sole che si spuntano). Con `?partita=` anche quante azioni sono fatte e il giorno corrente della partita; senza, `fatte` è 0 e `dataCorrente` è null.',
    risposta: '`PercorsoIndiceDto`',
    errori: [PARTITA_NON_TROVATA],
  },
  'GET /api/compendio/percorso/:data': {
    sommario: 'Scheda di un giorno della guida con le sue voci',
    descrizione: '`data` nel formato MM-GG. Trama, vincoli, meteo, allerte meteo del gioco (`allerte`: una per allerta, con le fasce in cui vale e gli effetti), avvisi e fonte del giorno, le voci in ordine (prima di giorno, poi di sera; una voce che registra un turno di un\'attività con un quiz, o che vi è collegata, ne porta la guida in `quiz`, con `oggi` vero nei giorni del quiz), giorno precedente e successivo. Con `?partita=` le voci dicono se sono fatte, e arrivano il giorno corrente e il meteo della partita per quel giorno; una voce ancora da spuntare porta in `scelteEsito` le scelte che la spunta chiederà (L13: esito del turno di un\'attività con esiti, note di una Dote a valori possibili), valutate al giorno della voce.',
    risposta: '`PercorsoGiornoDto`',
    errori: [[404, 'giorno-non-trovato'], PARTITA_NON_TROVATA],
  },
  'GET /api/compendio/percorso-elenchi': {
    sommario: 'Elenchi per classificare, collegare e dare effetti a un\'azione della giornata',
    descrizione: 'Gli elementi a cui un\'azione si può collegare o che un effetto può nominare: Confidenti (con l\'arcano come dettaglio), dungeon, Richieste, libri, film, videogiochi, attività (con `turni` vero per quelle contate per volte), negozi e Doti. Sono gli stessi elementi che il server accetta salvando una voce; le righe nascoste dal catalogo sono escluse.',
    risposta: '`ElenchiAzioneDto`',
  },
  'GET /api/compendio/percorso-elenchi-effetti': {
    sommario: 'Elenchi per scegliere per nome gli oggetti citati dagli effetti di una voce',
    descrizione: 'Sola lettura. Articoli dei negozi (con negozio e prezzo; l\'Aojiru ha il suo effetto e non c\'è), domande in classe, esami e quiz (con il numero che l\'effetto «domanda» cita), cruciverba per data, inviti dei Confidenti (chiave «confidente/MM-GG») e Persona del compendio. Servono alla finestra della voce per non far digitare chiavi interne.',
    risposta: '`ElenchiEffettiVoceDto`',
  },
  'POST /api/compendio/percorso/:data/voci': {
    sommario: 'Aggiunge una voce alla giornata (canone, per tutte le partite)',
    descrizione: 'La voce entra nella fascia indicata (`giorno` se omessa) al posto `posizione` (0 = in cima; omessa o oltre l\'ultima = in fondo) e la fascia si rinumera senza buchi. Genere predefinito «azione»; tipo ed effetti contano solo per le azioni; collegamento ed effetti si verificano contro la guida (devono puntare a elementi che esistono). `?partita=` facoltativo: si controlla prima di scrivere e la risposta porta lo stato della voce in quella partita.',
    risposta: 'La voce creata, `AzionePercorsoDto`',
    errori: [[400, 'voce-vuota'], [400, 'riferimento-non-valido'], [400, 'riferimento-inesistente'], [400, 'effetto-non-valido'], [400, 'effetto-inesistente'], [404, 'giorno-non-trovato'], PARTITA_NON_TROVATA],
  },
  'GET /api/compendio/percorso/voci/:uid': {
    sommario: 'Una voce della giornata per uid (sola lettura, L3 UX3-1)',
    descrizione: 'La voce com\'è nel suo giorno (`giorno`, fascia, campi del §3.1: insieme delle infiltrazioni, proposta, `infiltrazioneDaAprire`), con `?partita=` anche il suo stato nella partita. La scheda del Palazzo aperta da una voce (`?daVoce=`) la legge per dire da quale proposta viene.',
    risposta: '`AzionePercorsoDto`, con effettiVoce (fonte completa/CAS) e ricevuteEffetti separate dal formato legacy',
    errori: [[404, 'voce-non-trovata'], PARTITA_NON_TROVATA],
  },
  'PUT /api/compendio/percorso/voci/:uid': {
    sommario: 'Modifica una voce della giornata (canone, per tutte le partite)',
    descrizione: 'Si cambiano solo i campi inviati (almeno uno): testo, note (null o vuote le tolgono), genere, fascia, posto nella fascia, tipo, collegamento, rango atteso, effetti. Un collegamento o degli effetti nuovi si verificano; quelli che la voce ha già passano come sono. Cambiando fascia la voce va al posto chiesto o in fondo e la fascia vecchia si ricompatta. Un\'azione che diventa evento perde le spunte, ma se in qualche partita è spuntata con effetti la modifica si rifiuta (409). L3: `infiltrazioni` (da solo, 400 `infiltrazioni-da-sole` con altri campi) è l\'insieme ordinato delle infiltrazioni della voce, anche vuoto: solo del Palazzo della voce, la stessa ammessa più volte ma non di seguito; scrive solo il legame, niente della voce. `?partita=` facoltativo, come per la creazione.',
    risposta: 'La voce aggiornata, `AzionePercorsoDto`. effettiVoce:{effetti:[{uid,effetto}],revisioneEffettiAttesa} salva canone e campi voce nella medesima transazione. Mutuamente esclusivo con produce legacy; senza entrambi, la fonte resta intatta. La creazione usa uid:null senza token fittizio.',
    errori: [[400, 'voce-vuota'], [400, 'riferimento-non-valido'], [400, 'riferimento-inesistente'], [400, 'effetto-non-valido'], [400, 'effetto-inesistente'], [400, 'infiltrazioni-da-sole'], [400, 'voce-senza-palazzo'], [400, 'infiltrazione-inesistente'], [400, 'infiltrazione-di-un-altro-palazzo'], [400, 'infiltrazione-ripetuta-di-seguito'], [404, 'voce-non-trovata'], PARTITA_NON_TROVATA, [409, 'voce-con-effetti']],
  },
  'POST /api/compendio/percorso/voci/:uid/rivista': {
    sommario: 'Esito di «da rivedere» su una voce della giornata (L3 §1.4)',
    descrizione: 'Corpo `{ esito: "tieni" | "rimetti" | "fatto" }`: «Tieni il nuovo» e «Fatto» tolgono il segno; «Rimetti il precedente» rimette testo, note e collegamento com\'erano prima della correzione del team (il testo precedente resta) e toglie il segno, solo con un testo precedente. È il meccanismo unico delle voci aggiunte, corrette o segnalate dal team. `?partita=` facoltativo.',
    risposta: 'La voce, `AzionePercorsoDto`',
    errori: [[404, 'voce-non-trovata'], [409, 'voce-non-da-rivedere'], [400, 'senza-testo-precedente'], PARTITA_NON_TROVATA],
  },
  'PUT /api/compendio/percorso/voci/:uid/sposta': {
    sommario: 'Sposta una voce della giornata di un passo nella sua fascia',
    descrizione: '`verso` -1 sposta su, +1 giù; la fascia si ricompatta prima. Ai bordi non cambia nulla e non è un errore. `?partita=` facoltativo: le voci della risposta portano lo stato in quella partita.',
    risposta: 'Tutte le voci del giorno nel nuovo ordine, elenco di `AzionePercorsoDto`',
    errori: [[404, 'voce-non-trovata'], PARTITA_NON_TROVATA],
  },
  'POST /api/compendio/percorso/voci/trasferisci': {
    sommario: 'Copia o sposta una o più voci della giornata in un altro giorno e fascia',
    descrizione: 'Dal 2026-10-12. `uid` (da 1 a 200, senza ripetizioni), `giorno` (MM-GG), `fascia` (`giorno`/`sera`), `modo` (`copia`/`sposta`). Le voci arrivano in fondo alla fascia, nell\'ordine che avevano (giorno, poi giorno prima di sera, poi posto). «copia» crea voci nuove con lo stesso contenuto (genere, testo, note, tipo, collegamento col suo nome, rango atteso, effetti), senza spunte; «sposta» cambia giorno e fascia alle stesse voci, che tengono uid e spunte delle partite; le fasce lasciate si ricompattano. Canone: vale per tutte le partite. Una voce che non c\'è fa fallire tutto senza scrivere niente. `?partita=` facoltativo: le voci della risposta portano lo stato in quella partita.',
    risposta: '`VociTrasferiteDto`: `giorno`, `fascia`, gli `uid` arrivati in ordine e tutte le voci del giorno di destinazione',
    errori: [[404, 'giorno-non-trovato'], [404, 'voce-non-trovata'], PARTITA_NON_TROVATA],
  },
  'DELETE /api/compendio/percorso/voci/:uid': {
    sommario: 'Elimina una voce della giornata, per tutte le partite',
    descrizione: 'La voce, la fonte degli effetti e le spunte entrano nel cestino comune. Il motore annulla esattamente le ricevute e le sole provenienze possedute, in tutte le partite, prima della cancellazione; un registro non leggibile provoca rollback. I delta Doti/yen restano proposte esplicite, senza applicazione automatica. La fascia si ricompatta e il ripristino recupera il posto relativo ai vicini.',
    risposta: 'Nessun contenuto (204)',
    errori: [[404, 'voce-non-trovata'], [409, 'ricevuta-spunta-illeggibile']],
  },

  // ---- Negozi e articoli ----
  'GET /api/compendio/negozi': {
    sommario: 'Elenco dei negozi',
    descrizione: 'I negozi non nascosti in ordine, con sede, quartiere, gestore, Confidente collegato, orari e conteggi degli articoli dell\'intero catalogo. Con `?partita=` ogni negozio porta anche la sua presenza valutata sugli orari al punto in cui è la partita.',
    risposta: 'Elenco di `NegozioRiassuntoDto`',
    errori: [PARTITA_NON_TROVATA],
  },
  'GET /api/compendio/negozi/:chiave': {
    sommario: 'Scheda di un negozio con i suoi articoli',
    descrizione: 'Il negozio visibile con note e offerte visibili in ordine. Con M7, `catalogo` è il riferimento stabile: nome, categoria, effetto, statistiche e destinatario vengono da quella identità; senza legame valgono i campi della riga. Prezzo e `costo` restano sulla vendita: fiori/oggetti negli scambi, yen altrimenti; un costo illeggibile dà `costoDaVerificare`, non una vendita gratuita. Con `?partita=` arrivano acquisti e disponibilità, conteggio acquistati e guida del quiz dei lavori della sede. Le chiavi degli acquisti restano quelle storiche.',
    risposta: '`NegozioDettaglioDto`; i baratti composti hanno ricevuti con identità, quantità e note letti in blocco, un solo costo e una sola spunta. Non esiste un oggetto-bundle; le alternative di Mothman restano annotate e non sono dedotte dalla spunta.',
    errori: [[404, 'negozio-non-trovato'], PARTITA_NON_TROVATA],
  },
  'GET /api/compendio/articoli': {
    sommario: 'Ricerca degli articoli in tutti i negozi',
    descrizione: 'Con M7, `q` cerca nel nome corrente, nome originale, alias ed effetto del catalogo, nome del negozio e nomi correnti degli oggetti ceduti/ricevuti nei baratti; categorie e destinatario si filtrano sui valori correnti, non sulle copie vecchie della vendita. Prima di M7 conserva il lettore precedente. `categoria` e `categorie` si uniscono; `per` include «tutti». Solo con `?partita=` valgono stato acquistati/da-acquistare e disponibilità (ignoto conta come bloccato). Una sede aggiuntiva aperta può rendere acquistabile il listino comune. Ordine negozio/offerta, massimo 300 risultati; totale prima del limite.',
    risposta: '`RicercaArticoliDto`',
    errori: [PARTITA_NON_TROVATA],
  },

  // ---- Città, luoghi, attività ----
  'GET /api/compendio/luoghi': {
    sommario: 'Tutti i luoghi della città come voci da scegliere',
    descrizione: 'I luoghi non nascosti, in ordine di quartiere e poi di luogo, con tipo e quartiere: sono le opzioni per la sede di un negozio o di un\'attività.',
    risposta: 'Elenco di `LuogoOpzioneDto`',
  },
  'GET /api/compendio/luoghi/:quartiere/:luogo': {
    sommario: 'La pagina di un luogo (L5): presenza, orari, negozi della sede, attività, Confidenti, pin',
    descrizione: 'Il luogo è la fonte (L5 «Luoghi, negozi, orari»). `orari` sono quelli del luogo, o la regola dell\'app «giorno e sera» dove la guida non ne dà (`origine: \'regola-app\'`); `presenza` dice sbloccato e aperto adesso con la funzione unica (sblocco dalle condizioni, orari contro giorno, fascia e meteo della partita; null senza partita). `listini` ha un listino per ogni negozio della sede, con articoli e acquisti della partita; `attivitaDettaglio` le attività che si svolgono qui; `confidentiDettaglio` i Confidenti con arcano e pagina; `pins` tutti i pin del luogo con la casa dell\'area aperta sullo spillo e la nota propria del pin se diversa; `area` l\'Area di L2 (null se «da collocare»).',
    risposta: '`LuogoDettaglioDto`',
    errori: [[404, 'luogo-non-trovato'], [404, 'partita-non-trovata']],
  },
  'GET /api/compendio/inviti': {
    sommario: 'Elenco degli inviti dei Confidenti e del loro stato',
    descrizione: 'Filtra per Confidente o per il posto aperto; un quartiere comprende anche i suoi luoghi. Con `?partita=` ogni invito porta se è registrato, se può essere registrato ora e la condizione mancante, senza modificare la partita.',
    risposta: 'Elenco di `InvitoDto`',
    errori: [PARTITA_NON_TROVATA],
  },
  'GET /api/compendio/citta': {
    sommario: 'Elenco dei quartieri di Tokyo',
    descrizione: 'I quartieri in ordine (escluso l\'ingresso dei Memento, che non è un quartiere) con mappa, punto d\'ingresso, `illustrazione` (l\'immagine della mappa del quartiere con la regola unica di L1: `immagineUrl` della caricata, versionato, poi `asset` dichiarato; la stessa del visore e dell\'indice) e conteggi dei luoghi non nascosti e verificati. Con `?partita=` ogni quartiere dice se è già nel mondo: le regole di sblocco non sono solo date, e solo l\'esito «bloccato» lo nasconde (un dubbio no), con il motivo in `bloccoMotivo`; senza partita sono tutti disponibili.',
    risposta: 'Elenco di `QuartiereRiassuntoDto`',
    errori: [PARTITA_NON_TROVATA],
  },
  'GET /api/compendio/citta/:chiave': {
    sommario: 'Scheda di un quartiere con i suoi luoghi',
    descrizione: 'Il quartiere con mappa (vero se la sua mappa ha un\'immagine caricata, registrata o con la chiave della mappa), `illustrazione` (come nell\'elenco), ingresso, pianta (o il motivo per cui manca) e i luoghi non nascosti in ordine, ciascuno con Confidenti, attività, negozi e condizioni. Con `?partita=` ogni luogo porta la disponibilità valutata sulla partita: la partita serve ai luoghi, non al quartiere.',
    risposta: '`QuartiereDettaglioDto`',
    errori: [[404, 'quartiere-non-trovato'], PARTITA_NON_TROVATA],
  },
  'PUT /api/compendio/citta/:chiave/sblocco': {
    sommario: 'Modifica la condizione propria dello sblocco di un quartiere',
    descrizione: 'Sostituisce la condizione strutturata del quartiere con quelle inviate. Gli inviti dei Confidenti restano separati e continuano a essere gestiti dalla pagina del Confidente; la copia della guida usata da «Ripristina» non viene sovrascritta.',
    risposta: '`SbloccoDto` aggiornato',
    errori: [[404, 'quartiere-non-trovato']],
  },
  'POST /api/compendio/citta/:chiave/sblocco/ripristina': {
    sommario: 'Ripristina lo sblocco del quartiere dalla guida',
    descrizione: 'Riporta la condizione propria del quartiere alla copia salvata dalla guida nella migrazione 120; non modifica gli inviti e non cancella lo snapshot.',
    risposta: '`SbloccoDto` aggiornato',
    errori: [[404, 'quartiere-non-trovato'], [409, 'sblocco-guida-assente']],
  },
  'PUT /api/compendio/citta/:chiave/ingresso': {
    sommario: 'Imposta l\'ingresso del quartiere: un\'Area del quartiere e un punto',
    descrizione: 'Corpo `{ area, x, y, zoom }` (L2): l\'Area per slug, e la planimetria è la sua predefinita in quel momento. Il corpo di prima `{ mappa, x, y, zoom }` resta: la mappa (chiave pubblica o alias) deve esistere e l\'Area si deduce da lei. In tutti e due i casi l\'Area dev\'essere del quartiere: 400 `area-di-altro-quartiere`, o `ingresso-senza-area` per una planimetria senza Area (la mappa del quartiere). `x` e `y` in percentuale (0–100), `zoom` da 1 a 6 (2,5 se omesso). Sostituisce l\'ingresso che il quartiere aveva; la risposta porta anche l\'Area.',
    risposta: 'L\'ingresso com\'è dopo la scrittura, `IngressoQuartiereDto`',
    errori: [[404, 'quartiere-non-trovato'], [404, 'mappa-non-trovata'], [404, 'area-non-trovata'], [400, 'area-di-altro-quartiere'], [400, 'ingresso-senza-area'], [400, 'area-senza-planimetrie']],
  },
  'DELETE /api/compendio/citta/:chiave/ingresso': {
    sommario: 'Toglie il punto d\'ingresso del quartiere',
    descrizione: 'Cancella l\'ingresso del quartiere; se non ne aveva uno non cambia nulla e non è un errore.',
    risposta: 'Nessun contenuto (204)',
    errori: [[404, 'quartiere-non-trovato']],
  },
  'GET /api/compendio/attivita': {
    sommario: 'Attività, lavori, libri e film',
    descrizione: 'Attività visibili, lavori separati, libri e film con posizioni ed effetti; le attività con quiz ne portano la guida. Dopo M7 libri, film e attività videogioco leggono nome e alias dal catalogo e prezzi dalle offerte; senza prezzo di vendita la copia della guida è solo `notaPrezzo`. Con `?partita=` avanzamenti, disponibilità e conteggi. Chiavi, effetti e progressi delle letture restano quelli delle voci originali. L13 (ondata 2): `esiti` (`EsitiAttivitaDto`, null se l\'attività non ne dichiara) elenca gli esiti scelti alla spunta (modo «scelta») o ricavati dalle condizioni (modo «automatico»), con Doti e punti, articolo che dà prezzo e ranghi, premi in parole e, con `?partita=`, se sono già possibili.',
    risposta: '`AttivitaTutteDto`. Le attività con confidenteChiave dichiarano fonteConfidente: identità e link canonici, giorni/fasce/avvertenze della fonte, requisiti del rango1 e del prossimo rango esatto (anche senza requisiti), Doti per passaggio. Disponibilità e condizioni autonome sono null, Doti/effetti generici vuoti. Nessuna partita: prossimoPasso e rangoAttuale null; rango10: nessun prossimo passo. Un conflitto non diventa disponibilità positiva.',
    errori: [PARTITA_NON_TROVATA],
  },
  'GET /api/compendio/libri': {
    sommario: 'Libri con i totali di lettura',
    descrizione: 'Libri visibili in ordine, con posizioni e offerte. Dopo M7 `catalogo`, titolo e alias vengono dalla identità unica e `prezzo` dal minimo delle vendite in yen visibili; il vecchio prezzo senza offerta è soltanto `notaPrezzo`. Con `?partita=` avanzamento e disponibilità, libri finiti, sessioni fatte/totali e Lettura rapida. Le chiavi di avanzamento non cambiano.',
    risposta: '`LibriDto`',
    errori: [PARTITA_NON_TROVATA],
  },
  'GET /api/compendio/film': {
    sommario: 'Film e DVD con i totali di visione',
    descrizione: 'Film/DVD visibili con posizioni ed effetti. Dopo M7 titolo, alias e riferimento sono canonici, `negozi` segue le offerte e `prezzo` le vendite in yen; i costi citati nella guida senza prezzo di vendita sono note, non offerte. Con `?partita=` avanzamento e disponibilità; completamento limitato al totale, visioni al cinema senza tetto. Chiavi ed effetti originali invariati.',
    risposta: '`FilmDvdDto`',
    errori: [PARTITA_NON_TROVATA],
  },
  'GET /api/compendio/videogiochi': {
    sommario: 'Videogiochi con i totali dei round',
    descrizione: 'Attività videogioco visibili, con offerte e round totali (almeno uno). Dopo M7 titolo/alias/riferimento vengono dal catalogo; il costo di acquisto viene dalle offerte, quello della guida senza vendita resta nota. Con `?partita=` avanzamento limitato al totale, disponibilità e conteggi. Chiavi dei progressi ed effetti originali invariati.',
    risposta: '`VideogiochiDto`',
    errori: [PARTITA_NON_TROVATA],
  },
  'GET /api/compendio/cruciverba': {
    sommario: 'Cruciverba di Leblanc',
    descrizione: 'Tutti i cruciverba in ordine di calendario con indizio e risposta. Con `?partita=` ciascuno dice se è risolto, e arrivano la data di gioco e il prossimo da segnare (il primo non risolto da quel giorno in poi); senza, `prossimo` e `dataGioco` sono null.',
    risposta: '`CruciverbaTuttiDto`',
    errori: [PARTITA_NON_TROVATA],
  },

  // ---- Richieste, calendario, domande ----
  'GET /api/compendio/richieste': {
    sommario: 'Richieste dei Mementos con i dati di Jose e i dedali',
    descrizione: 'Richieste ordinate per dedalo e ordine della guida, dati di Jose e dedali con totali/completate. Con `?partita=` stato accettata/completata/null. Dopo M7 oggettiRicompensa porta identità, quantità e collegamento dal catalogo, letti in blocco; ricompense conserva i testi della guida, indipendenti dai legami. Jose.listino legge il normale dettaglio del negozio, con costo in fiori, requisiti e acquisti della partita; scambi è vuoto, non una seconda tabella commerciale. Listino null se rimosso/nascosto, proprietà assente prima di M7. Le aperture dei dedali sono eventi effettivi segnabili in Progressi, non date dedotte; la lettura non registra aperture, acquisti o ricompense ottenute. L13: ogni Richiesta porta `condizioni` (sblocco, con il testo generato), `scadenzaData` e `proroga` (data e condizioni), `ombra` (bersaglio del compendio), `yen` ed `esperienza`; con `?partita=` anche `statoPartita` (`StatoCalcolatoRichiestaDto`: bloccata con i motivi, disponibile, accettata, completata, scaduta; scadenza effettiva, giorni alla scadenza, `accettabile`).',
    risposta: '`RichiesteDto`',
    errori: [PARTITA_NON_TROVATA],
  },
  'GET /api/compendio/calendario': {
    sommario: 'Calendario di gioco con eventi e settimane della guida',
    descrizione: 'I giorni (tutti, o del solo mese `mese` nel formato MM) con meteo, allerte meteo del gioco (`allerte`, come nella scheda del giorno), tempo libero ed eventi, i riassunti delle settimane della guida e l\'elenco dei mesi. Ogni evento dice se è un dato proprio del Calendario che si corregge (`modificabile`, via `/api/correzioni/evento-calendario/:id`) e se è stato corretto (`modificato`); ogni allerta dice se è stata corretta in quel giorno (`modificata`, via `/api/correzioni/allerta-meteo/MM-GG:chiave`). Con `?partita=` arrivano la data di gioco, il giorno corrente e le prossime sei scadenze o esami da quel giorno, con i giorni mancanti.',
    risposta: '`CalendarioDto`',
    errori: [PARTITA_NON_TROVATA],
  },
  'GET /api/compendio/calendario/voci/:uid': {
    sommario: 'Gli eventi del calendario collegati a una voce del Diario',
    descrizione: 'Sola lettura. Per l\'identificativo (`uid`) di una voce del Diario elenca gli eventi del calendario che la citano, in ordine di data e di posizione, ciascuno con la sua certezza (`C`, collegamento certo: sono i soli che la migrazione 164 ha scritto; il tipo ammette anche `D`). Una voce senza eventi collegati, o che non esiste, dà un elenco vuoto: nessun 404. Il collegamento è un dato di gioco (tabella `evento_calendario_voce`), lo stesso che il calendario mostra sotto ogni evento.',
    risposta: 'Elenco di oggetti `{ id, data, tipo, titolo, certezza }` (un evento per riga)',
  },
  'GET /api/compendio/domande': {
    sommario: 'Domande in classe ed esami',
    descrizione: 'Tutte le domande in ordine di anno scolastico (aprile → marzo) e, a pari data, di guida; gli esami con date e domande e i premi. Con `?partita=` ogni domanda dice se è fatta e `prossime` sono le domande non fatte della prima data da oggi in poi.',
    risposta: '`DomandeDto`; dopo M7 domande ed esami aggiungono oggettiRicompensa dai legami del catalogo. I punti Dote restano testo, non oggetti; gli accessori degli esami indicano ritiro e requisiti senza inferire il piazzamento o un ottenimento della partita.',
    errori: [PARTITA_NON_TROVATA],
  },

  // ---- Palazzi e Memento ----
  'GET /api/compendio/dungeon': {
    sommario: 'Elenco dei Palazzi e dei Memento',
    descrizione: 'I riassunti in ordine di gioco: date, finestra di esistenza, livello consigliato, conteggi di aree e punti, raccolta sulle planimetrie (per i Memento gli obiettivi dei dedali). Con `?partita=` anche i punti gestiti, quanto è stato raccolto e, per i Palazzi, i due livelli del completamento (§8.10, decisione dell\'utente del 2026-10-20): `concluso` (Tesoro e boss finale: governa ingressi, mappa di Tokyo, requisiti e condizioni) e `completato` (concluso e tutti gli oggetti permanenti: anello, percentuale e segno «Completato»), ciascuno col perché. Per i Palazzi anche `voceBossFinale`, `bossFinaleCorretto`, `regolaBoss` (§8.14–8.15: `memento` = nessun boss finale da dichiarare, né anello né effetti di Palazzo e senza `concluso`: Iweleth, che vive come dedalo dei Memento) e `bossFinaleDaDichiarare` (regola della voce senza voce dichiarata: il Palazzo non si conclude finché non la si sceglie con «Modifica › Boss finale»).',
    risposta: 'Elenco di `DungeonRiassuntoDto`',
    errori: [PARTITA_NON_TROVATA],
  },
  'GET /api/compendio/dungeon/:chiave': {
    sommario: 'Scheda completa di un Palazzo o dei Memento',
    descrizione: 'Riassunto, note e fonti, aree in ordine con le loro planimetrie e i punti della guida (con i pin collegati); per i Memento il dedalo di ogni area con le sue aree (099: dettagli, timbri, Richieste, conteggio degli elementi e completamento) e le Richieste da collocare, per i Palazzi l\'elenco di tutte le planimetrie. `illustrazione` è l\'immagine caricata sulla radice `dungeon-<chiave>` (URL versionato), con `asset` sempre null: l\'asset della radice è lo stemma, che la scheda mostra già come segno (L1). Con `?partita=` arrivano lo stato dei punti, i collezionabili presi e `personeCatturate` (le Persona registrate nel compendio della partita: nei Memento le «catturate», 2026-10-12); senza, `presi` e `personeCatturate` sono null. Le voci Persona dei dedali portano `areeDedalo` (101). Da L4 («Avanzamento unico»), per i Palazzi: il completamento con la funzione unica (`completamento`: oggetti permanenti, Tesoro, boss finale, `concluso` e `completato` del §8.10; per infiltrazione, planimetria e Area del Palazzo), le voci con carattere, oggetto, «da verificare», `condivise` e lo stato con cui risultano (§8.11: una voce con pin è fatta quando lo sono tutti i suoi pin, con `avanzamento` k/N e il segno di ogni pin in `pin[].fatto`), `daVerificare` (quante divergenze), `schedeDaSistemare` (le schede senza mappa né voce); `raccolta` resta l\'elenco dei collezionabili, con lo stato del pin di L4. `?infiltrazione=` è l\'infiltrazione guardata: il contesto dei pin di rigenerabili di più infiltrazioni (senza, quella in corso). I Memento restano come prima.',
    risposta: '`DungeonDettaglioDto`; dopo M7 ogni voce aggiunge contenuto (identità, quantità, nota e casa), letto in blocco. È distinto da dettagli.contenuto e dallo stato L4. Nessuna modifica a pin, testo o avanzamento durante la lettura.',
    errori: [[404, 'dungeon-non-trovato'], PARTITA_NON_TROVATA],
  },
  'GET /api/compendio/dungeon/:chiave/copie': {
    sommario: 'Le copie di una voce di un Palazzo secondo la regola dell\'utente (L4, sola lettura)',
    descrizione: 'I gruppi di voci identiche secondo la regola dell\'utente (R4-15, 2026-10-20): stessa infiltrazione, stesso tipo, nome, descrizione, dettagli ed Enigma, **stesso insieme di pin** (non vuoto). Sola lettura: in L4 non c\'è fusione (decisione dell\'utente); oggi l\'elenco è vuoto.',
    risposta: '`GruppoCopieDto[]`',
    errori: [[404, 'dungeon-non-trovato']],
  },
  'POST /api/compendio/schede/:id/voce': {
    sommario: '«Crea la voce» da una scheda della guida da sistemare (L4)',
    descrizione: 'Una scheda senza mappa né voce (le «Schede da sistemare» della scheda del Palazzo) diventa una voce nuova, in fondo alla sua infiltrazione, con il suo nome e la sua descrizione e il `tipo` dato; la voce la assorbe (la posizione della scheda è la sua posizione da collocare). Nessuno stato si trasferisce.',
    risposta: '`PuntoInteresseDto` della voce nuova (201)',
    errori: [[404, 'scheda-non-trovata'], [409, 'scheda-gia-sistemata']],
  },
  'PUT /api/compendio/schede/:id/voce': {
    sommario: '«Collega a una voce» una scheda della guida da sistemare (L4)',
    descrizione: 'La scheda senza mappa né voce diventa la voce data, del suo Palazzo, che la assorbe (la posizione della scheda è la posizione da collocare della voce, se non ne ha una). Nessuno stato si trasferisce.',
    risposta: '`PuntoInteresseDto` della voce',
    errori: [[404, 'scheda-non-trovata'], [409, 'scheda-gia-sistemata'], [404, 'punto-non-trovato'], [400, 'voce-di-un-altro-palazzo']],
  },
  'PUT /api/compendio/dungeon/:chiave': {
    sommario: 'Corregge i testi della scheda di un Palazzo',
    descrizione: 'Si cambiano solo i campi inviati (nome, sovrano, date, livello consigliato, note); un nome vuoto lascia quello di prima. È una correzione della guida: vale per tutte le partite ed entra nel pacchetto di gioco. L4 §8.14: `voceBossFinale` («Modifica › Boss finale») sceglie la voce del boss finale del Palazzo fra le sue voci «Boss» (null = nessuna, e il Palazzo non si conclude); il primo cambio conserva il valore della guida per «Ripristina». Nei Memento e nei Palazzi con `regolaBoss` `memento` (Iweleth, §8.15) non c\'è: nessun boss finale da dichiarare (400 `boss-finale-dei-memento`).',
    risposta: 'La scheda aggiornata (senza stato di partita), `DungeonDettaglioDto`',
    errori: [[404, 'dungeon-non-trovato'], [404, 'punto-non-trovato'], [400, 'voce-non-boss'], [400, 'voce-di-un-altro-palazzo'], [400, 'boss-finale-dei-memento']],
  },
  'POST /api/compendio/dungeon/:chiave/ripristina': {
    sommario: '«Ripristina» della scheda di un Palazzo (L4 §8.14)',
    descrizione: 'La voce del boss finale torna quella della guida (G-027, migrazione 112); se quella voce non c\'è più resta nessuna. 409 se la scheda ha già i valori della guida.',
    risposta: 'La scheda aggiornata (senza stato di partita), `DungeonDettaglioDto`',
    senzaCorpo: true,
    errori: [[404, 'dungeon-non-trovato'], [409, 'niente-da-ripristinare']],
  },
  'PUT /api/compendio/dungeon/:chiave/finestra': {
    sommario: 'Cambia la finestra in cui il Palazzo compare sulla mappa di Tokyo',
    descrizione: 'Scrive la voce del Palazzo in `finestre-dungeon` (dati della guida), creandola se manca: `dal` e `al` sono giorni MM-GG del calendario di gioco (aprile → marzo), `al: null` vuol dire senza fine. La stessa finestra decide anche l\'arco corrente delle condizioni. Le altre voci del blocco restano come sono.',
    risposta: 'La finestra salvata, `{ dal, al }`',
    errori: [[404, 'dungeon-non-trovato'], [400, 'data-non-valida'], [400, 'fine-prima-di-inizio']],
  },
  'PUT /api/compendio/dungeon/:chiave/atterraggi': {
    sommario: 'Sostituisce le regole di atterraggio dalla mappa di Tokyo',
    descrizione: 'Le regole si salvano tutte insieme, nell\'ordine dato, che è l\'ordine in cui si provano: vale la prima che copre il giorno della partita (senza partita o senza giorno, la prima senza date). Ogni regola vale sempre (date nulle), da `dal` in poi (`al` nullo), fra `dal` e `al` compresi, o in un giorno solo (`dal` = `al`), e porta a una planimetria di questo Palazzo, centrata sul pin `spillo` se dato. Prima di scrivere si controlla tutto: giorni esistenti, fine non prima dell\'inizio, planimetria del Palazzo (non la mappa d\'insieme), pin su quella planimetria. Un elenco vuoto toglie tutte le regole.',
    risposta: 'Le regole salvate, elenco di `AtterraggioPalazzoDto`',
    errori: [[404, 'dungeon-non-trovato'], [400, 'data-non-valida'], [400, 'fine-senza-inizio'], [400, 'fine-prima-di-inizio'], [404, 'mappa-non-trovata'], [400, 'mappa-fuori-palazzo'], [400, 'spillo-fuori-mappa'], [409, 'schema-non-aggiornato']],
  },
  'POST /api/compendio/dungeon/:chiave/aree': {
    sommario: 'Aggiunge un\'infiltrazione nuova alla guida di un Palazzo',
    descrizione: 'L\'infiltrazione nasce `dopo` quella indicata, in cima con `dopo: null`, in fondo se `dopo` manca; l\'ordine del Palazzo si ricompatta. La chiave si ricava dal nome (resa unica e nei limiti accettati dalle rotte). L3: `areePalazzo` (slug, in ordine) sono le Aree del Palazzo che tocca; `planimetria` (client di prima) aggiunge l\'Area di quella planimetria, che deve essere del Palazzo. È canone: vale per tutte le partite.',
    risposta: '`{ chiave, nome, ordine }` dell\'area creata',
    errori: [[400, 'area-non-del-palazzo'], [400, 'planimetria-non-del-palazzo'], [404, 'dungeon-non-trovato'], [404, 'mappa-non-trovata'], [404, 'area-non-trovata']],
  },
  'PUT /api/compendio/aree/:chiave/aree-palazzo': {
    sommario: 'Le Aree del Palazzo che un\'infiltrazione tocca (L3)',
    descrizione: 'Corpo `{ aree: [...], planimetrieIniziali?: { <area>: <planimetria> | null } }`: le Aree (slug, o chiavi `dungeon/<k>/<slug>`) nell\'ordine in cui l\'infiltrazione le percorre, e per ognuna, se si vuole, la versione da aprire (null = la predefinita). L\'insieme sostituisce quello di prima; un gesto solo, che non sposta voci né pin. Lo stesso legame si scrive anche dall\'area (`PUT /api/aree/dungeon/:k/:slug/infiltrazioni`). `?partita=` facoltativo.',
    risposta: 'L\'infiltrazione com\'è nella scheda del Palazzo, `AreaDungeonDto`',
    errori: [[404, 'area-non-trovata'], [409, 'area-di-un-altro-palazzo'], [400, 'infiltrazione-dei-memento'], [400, 'planimetria-di-altra-area'], [404, 'partita-non-trovata']],
  },
  'PUT /api/compendio/aree/:chiave': {
    sommario: 'Corregge nome e descrizione di un\'infiltrazione (o di un dedalo dei Memento)',
    descrizione: 'Si cambiano solo i campi inviati; un nome vuoto lascia quello di prima. Vale per tutte le partite.',
    risposta: 'L\'infiltrazione (o il dedalo) aggiornata (senza stato di partita), `AreaDungeonDto`',
    errori: [[404, 'area-non-trovata']],
  },
  'DELETE /api/compendio/aree/:chiave': {
    sommario: 'Elimina un\'infiltrazione (o un dedalo dei Memento), per tutte le partite',
    descrizione: 'In una transazione se ne vanno i punti dell\'infiltrazione con quel che le partite ne avevano segnato, gli spilli della guida senza mappa che le appartenevano, i legami con le planimetrie e i riferimenti nei testi della guida; per un dedalo dei Memento anche le sue aree (099) con i timbri delle partite. Le Richieste restano, senza area. Le infiltrazioni (o i dedali) che la seguivano salgono di un posto. Un pacchetto importato dopo la rimette. Dal 2026-10-16 l\'infiltrazione va nel cestino con tutto quel che l\'eliminazione tocca (partite comprese), e da lì si rimette (`/api/impostazioni/cestino`).',
    risposta: 'Nessun contenuto (204)',
    errori: [[404, 'area-non-trovata']],
  },
  'POST /api/compendio/richieste': {
    sommario: 'Aggiunge una Richiesta dei Mementos',
    descrizione: 'Nome e bersaglio (col suo nome) obbligatori; il resto facoltativo: committente, date, `dedalo` e `areaDedalo` (un\'area porta con sé il suo dedalo; senza area la Richiesta resta da collocare nel dedalo), piano, debolezze, resistenze, confusione utile, ricompense, Confidente e rango, note; L13: `condizioni` (vocabolario unico, 400 `condizioni-non-valide`), `scadenzaData`, `proroga` {data, condizioni} (solo con una scadenza), `ombra` (404 `ombra-non-trovata`), `yen`, `esperienza`, `oggetti` [{chiave, quantita}] del catalogo (sostituiscono le ricompense in oggetti; 404 `oggetto-non-trovato`). Il nome è unico (409 `nome-gia-usato`: i requisiti dei Confidenti citano per nome). La chiave nasce dal nome e non cambia più. Va in fondo all\'elenco. Dato di gioco: vale per tutte le partite.',
    risposta: 'La Richiesta creata (senza stato di partita), `RichiestaDto`',
    errori: [[404, 'area-dedalo-non-trovata'], [404, 'area-non-trovata'], [400, 'area-di-altro-dedalo'], [400, 'non-un-dedalo'], [404, 'confidente-non-trovato'], [409, 'nome-gia-usato']],
  },
  'PUT /api/compendio/richieste/:chiave': {
    sommario: 'Corregge una Richiesta dei Mementos',
    descrizione: 'Si cambiano solo i campi inviati; la chiave resta. Cambiando dedalo senza dire l\'area la Richiesta resta da collocare nel dedalo nuovo, e va in fondo all\'elenco. Cambiando nome (che resta unico, 409 `nome-gia-usato`), i requisiti dei Confidenti che la citavano per nome passano a citarla per chiave, col nome nuovo nel testo, e le voci della giornata che la indicano mostrano il nome nuovo. Togliendo il Confidente si toglie anche il rango.',
    risposta: 'La Richiesta aggiornata (senza stato di partita), `RichiestaDto`',
    errori: [[404, 'richiesta-non-trovata'], [404, 'area-dedalo-non-trovata'], [404, 'area-non-trovata'], [400, 'area-di-altro-dedalo'], [400, 'non-un-dedalo'], [404, 'confidente-non-trovato'], [409, 'nome-gia-usato']],
  },
  'GET /api/compendio/richieste/:chiave/citazioni': {
    sommario: 'Chi cita una Richiesta',
    descrizione: 'Per l\'avviso prima di eliminarla: quante partite ne hanno uno stato, i pin che la indicano, le righe con una condizione che la cita (pin, negozi, articoli, libri, film, attività, luoghi, gruppi compresi), i requisiti dei Confidenti (per chiave o per nome) e quante azioni della giornata (`voce_giornata`) la indicano.',
    risposta: '`CitazioniRichiestaDto`',
    errori: [[404, 'richiesta-non-trovata']],
  },
  'DELETE /api/compendio/richieste/:chiave': {
    sommario: 'Elimina una Richiesta, per tutte le partite',
    descrizione: 'Scelta dell\'utente «Si elimina e si avvisa»: in una transazione se ne vanno i suoi stati nelle partite; i pin e le azioni della giornata (`voce_giornata`) che la indicavano perdono il collegamento e restano; le condizioni e i requisiti che la citano restano e diventano grigi, da correggere.',
    risposta: 'Nessun contenuto (204)',
    errori: [[404, 'richiesta-non-trovata']],
  },
  'GET /api/compendio/confidenti/:chiave/requisiti': {
    sommario: 'I requisiti di un Confidente, rango per rango',
    descrizione: 'Per l\'editor della pagina del Confidente: sempre i ranghi da 1 a 10, anche quelli senza requisiti. Ogni requisito è una condizione del vocabolario unico, con la sua frase e la descrizione generata in italiano; `modificato` dice se il rango differisce dalla copia della guida (e quindi si può ripristinare). Dato di gioco: vale per tutte le partite.',
    risposta: '`RequisitiConfidenteDto`',
    errori: [[404, 'confidente-non-trovato']],
  },
  'PUT /api/compendio/confidenti/:chiave/requisiti/:rango': {
    sommario: 'Sostituisce i requisiti di un rango di un Confidente',
    descrizione: 'Corpo `{ requisiti: [{ condizione, testo? }] }` (al più 10): le condizioni del vocabolario unico al posto di quelle di adesso, vuoto per nessun requisito. La frase di ciascuno è `testo` oppure, se manca, la descrizione generata (un avviso tiene il proprio testo). Le conferme a mano delle partite sugli indici che spariscono se ne vanno con loro. Dato di gioco: vale per tutte le partite. Per correggere solo un requisito che cita una Richiesta c\'è la rotta con l\'indice.',
    risposta: '`RequisitiConfidenteDto` aggiornato',
    errori: [[404, 'confidente-non-trovato']],
  },
  'POST /api/compendio/confidenti/:chiave/requisiti/:rango/ripristina': {
    sommario: 'Riporta i requisiti di un rango a come li dà la guida',
    descrizione: 'Rimette nel rango le righe della copia della guida (tabella `confidente_requisito_guida`) e toglie le conferme a mano delle partite sugli indici che non esistono più nella guida. 409 se la copia della guida non è nel file di gioco.',
    risposta: '`RequisitiConfidenteDto` aggiornato',
    senzaCorpo: true,
    errori: [[404, 'confidente-non-trovato'], [409, 'guida-non-disponibile']],
  },
  'PUT /api/compendio/confidenti/:chiave/requisiti/:rango/:indice': {
    sommario: 'Corregge un requisito di un Confidente che cita una Richiesta',
    descrizione: 'Scelta dell\'utente «Requisito correggibile»: un requisito che cita una Richiesta (per esempio eliminata, quindi «da correggere») passa a citare la Richiesta `richiesta`, per chiave. Il testo cambia il nome citato (o diventa la frase standard col nome nuovo). Solo per i requisiti di tipo «richiesta». Dato di gioco: vale per tutte le partite.',
    risposta: 'Nessun contenuto (204)',
    errori: [[404, 'requisito-non-trovato'], [400, 'requisito-non-di-richiesta'], [404, 'richiesta-non-trovata']],
  },
  'DELETE /api/compendio/confidenti/:chiave/requisiti/:rango/:indice': {
    sommario: 'Toglie un requisito di un Confidente che cita una Richiesta',
    descrizione: 'Il requisito se ne va per tutte le partite, con le conferme a mano che ne avevano; gli altri requisiti del rango tengono il loro indice. Solo per i requisiti di tipo «richiesta».',
    risposta: 'Nessun contenuto (204)',
    errori: [[404, 'requisito-non-trovato'], [400, 'requisito-non-di-richiesta']],
  },
  'PUT /api/compendio/richieste/:chiave/area': {
    sommario: 'Colloca una Richiesta in un\'area di un dedalo dei Memento',
    descrizione: 'Le Richieste sono elementi delle aree dei dedali (099). Con `areaDedalo` la Richiesta passa in quell\'area e il suo dedalo diventa quello dell\'area (in fondo alle Richieste, se cambia dedalo); con `null` resta nel suo dedalo ma da collocare, fuori dal conteggio. Dato di gioco: vale per tutte le partite, e lo stato nelle partite resta.',
    risposta: 'La Richiesta aggiornata (senza stato di partita), `RichiestaDto`',
    errori: [[404, 'richiesta-non-trovata'], [404, 'area-dedalo-non-trovata']],
  },
  'POST /api/compendio/dedali/:chiave/aree': {
    sommario: 'Aggiunge un\'area a un dedalo dei Memento',
    descrizione: 'Dedalo → Aree → Elementi (099): l\'area nasce in fondo al dedalo (la chiave del dedalo è quella della sua riga di `dungeon_area`), con nome, dettagli e, se dato, il totale dei timbri (`timbriTotale`, null = senza timbri). La chiave si ricava dal nome. È canone: vale per tutte le partite e va nel pacchetto.',
    risposta: 'L\'area creata (senza stato di partita), `AreaDedaloDto`',
    errori: [[404, 'area-non-trovata'], [400, 'non-un-dedalo']],
  },
  'PUT /api/compendio/aree-dedalo/:chiave': {
    sommario: 'Corregge un\'area di un dedalo: nome, dettagli, timbri',
    descrizione: 'Si cambiano solo i campi inviati; un nome vuoto lascia quello di prima. Con `timbriTotale: null` l\'area resta senza timbri e i conteggi delle partite si tolgono; con un totale più basso quelli che lo superano scendono al totale.',
    risposta: 'L\'area aggiornata (senza stato di partita), `AreaDedaloDto`',
    errori: [[404, 'area-dedalo-non-trovata']],
  },
  'PUT /api/compendio/aree-dedalo/:chiave/sposta': {
    sommario: 'Sposta un\'area di un posto su o giù nel suo dedalo',
    descrizione: 'L\'ordine delle aree del dedalo si ricompatta (0, 1, 2…).',
    risposta: 'L\'area spostata, `AreaDedaloDto`',
    errori: [[404, 'area-dedalo-non-trovata'], [409, 'area-al-limite']],
  },
  'DELETE /api/compendio/aree-dedalo/:chiave': {
    sommario: 'Elimina un\'area di un dedalo, per tutte le partite',
    descrizione: 'Scelta dell\'utente: le voci dell\'area se ne vanno con quel che le partite ne avevano segnato (come eliminando un punto, Enigmi e passi compresi) e i timbri con lei; le Richieste restano nel dedalo da collocare, con il loro stato. Le aree che la seguivano salgono di un posto. L\'area va nel cestino con tutto quel che l\'eliminazione tocca, e da lì si rimette (`/api/impostazioni/cestino`).',
    risposta: 'Nessun contenuto (204)',
    errori: [[404, 'area-dedalo-non-trovata']],
  },
  'POST /api/compendio/aree/:chiave/punti': {
    sommario: 'Aggiunge un punto alla guida di un\'infiltrazione (o di un dedalo)',
    descrizione: 'Il punto (nome e tipo obbligatori) nasce in fondo all\'infiltrazione (o al dedalo), o in fondo ai passi dell\'Enigma indicato in `contenitore`, salvo `ordine` esplicito. La chiave si ricava dal nome. Un passo segue le regole degli Enigmi: l\'Enigma è della stessa infiltrazione, non è a sua volta un passo e non ha pin propri; l\'Enigma si riallinea in ogni partita. In un dedalo dei Memento la voce sta in una delle sue aree (`areaDedalo`, 099; un passo in quella del suo Enigma); fuori dai Memento `areaDedalo` si rifiuta. Nei dedali il tipo è `persona` o `trama`, e `trama` solo lì (2026-10-11). Per una voce `persona` si può indicare `persona` (id del compendio): la maschera della voce diventa il nome italiano di quella Persona. Una Persona di un dedalo (migrazione 101) si incontra in più aree: non ha `areaDedalo` ma `areeDedalo` (almeno una, tutte del suo dedalo). L3 «planimetria della voce»: con `planimetria` (una planimetria del Palazzo dell\'infiltrazione) la voce nasce agganciata a mano lì (404 `mappa-non-trovata`, 400 `planimetria-fuori-dal-palazzo`).',
    risposta: 'Il punto creato, `PuntoInteresseDto`',
    errori: [[400, 'non-un-enigma'], [400, 'enigma-di-altra-area'], [400, 'enigma-dentro-enigma'], [400, 'non-un-dedalo'], [400, 'area-dedalo-mancante'], [400, 'area-di-altro-dedalo'], [400, 'passo-di-altra-area'], [400, 'tipo-non-del-dedalo'], [400, 'trama-solo-nei-memento'], [400, 'persona-solo-per-persona'], [400, 'aree-dedalo-mancanti'], [400, 'persona-in-piu-aree'], [400, 'aree-solo-per-persona'], [404, 'area-non-trovata'], [404, 'area-dedalo-non-trovata'], [404, 'punto-non-trovato'], [404, 'persona-non-trovata'], [409, 'enigma-con-pin'], [404, 'mappa-non-trovata'], [400, 'planimetria-fuori-dal-palazzo']],
  },
  'PUT /api/compendio/punti/:chiave': {
    sommario: 'Corregge un punto della guida',
    descrizione: 'Si cambiano solo i campi inviati: nome (vuoto = invariato), descrizione, tipo, esauribilità, ordine e `contenitore` (l\'Enigma di cui è un passo; null lo riporta fra le voci dell\'area). Un punto con pin non diventa descrittivo, un Enigma con passi non cambia tipo. Cambiando Enigma la voce va in fondo fra le nuove compagne e gli Enigmi toccati si riallineano in ogni partita. In un dedalo dei Memento `areaDedalo` sposta la voce (con i suoi passi, se è un Enigma) in fondo a un\'altra area dello stesso dedalo (099); un passo resta nell\'area del suo Enigma. Nei dedali il tipo nuovo è `persona` o `trama`, e `trama` solo lì (2026-10-11); `persona` (id del compendio) cambia la maschera di una voce Persona, e i dettagli dell\'Ombra di prima se ne vanno. `areeDedalo` sostituisce le aree in cui si incontra una Persona di un dedalo (101); nei dedali una Persona resta Persona e una Trama resta Trama. In un Palazzo `area` sposta la voce in fondo a un\'altra area dello stesso Palazzo (2026-10-12), coi suoi passi se è un Enigma e con le sue schede della guida senza mappa; la chiave resta, e con lei stati delle partite e pin. Non nei Memento (400 `area-solo-nei-palazzi`) e non per un passo (400 `passo-segue-enigma`). `dettagli` (2026-10-18) sostituisce tutti i dettagli della voce (etichetta → testo, numero, elenco o tabella; al più 40): la `maschera` di una Persona resta quella di prima. `carattere` (L4) sceglie il carattere della voce di un Palazzo (`permanente`, `rigenerabile`, `descrittiva`; `null` = «Ripristina», vale la regola del tipo): cambia la propagazione, nessuno stato si riscrive; non per le voci dei dedali né per le Persona (400 `carattere-non-ammesso`). Con carattere, tipo o infiltrazione cambiati gli stati delle partite si riallineano ai pin (§8.11); se la voce era fatta e comincia a leggere i suoi pin, quei pin prendono il segno e la risposta lo dice in `segniAggiunti` (§8.15). L3 «planimetria della voce»: `planimetria` aggancia a mano la voce a una planimetria del suo Palazzo (conta per una voce senza pin: con pin la voce sta dove stanno i pin); null toglie l\'aggancio e la voce torna alla planimetria 1 della sua infiltrazione. 404 `mappa-non-trovata`; 400 `planimetria-fuori-dal-palazzo` per una mappa di un altro Palazzo, la mappa del Palazzo stesso o una voce dei Memento; 400 `enigma-segue-i-passi` per un Enigma con passi (sta dove stanno i passi). Ogni voce di un Palazzo porta `planimetria` `{ chiave, nome, aMano }` con la regola unica.',
    risposta: 'Il punto aggiornato (senza stato di partita), `PuntoInteresseDto`',
    errori: [[400, 'carattere-non-ammesso'],[400, 'area-solo-nei-palazzi'], [404, 'area-non-trovata'], [400, 'area-di-altro-palazzo'], [400, 'passo-segue-enigma'], [400, 'non-un-enigma'], [400, 'enigma-di-altra-area'], [400, 'enigma-dentro-enigma'], [400, 'non-un-dedalo'], [400, 'area-di-altro-dedalo'], [400, 'passo-di-altra-area'], [400, 'tipo-non-del-dedalo'], [400, 'trama-solo-nei-memento'], [400, 'persona-solo-per-persona'], [400, 'persona-in-piu-aree'], [400, 'aree-solo-per-persona'], [400, 'persona-tipo-fisso'], [404, 'area-dedalo-non-trovata'], [404, 'punto-non-trovato'], [404, 'persona-non-trovata'], [409, 'punto-con-pin'], [409, 'enigma-con-passi'], [409, 'enigma-con-pin'], [404, 'mappa-non-trovata'], [400, 'planimetria-fuori-dal-palazzo'], [400, 'enigma-segue-i-passi']],
  },
  'DELETE /api/compendio/punti/:chiave': {
    sommario: 'Elimina un punto della guida, per tutte le partite',
    descrizione: 'Se ne vanno gli stati delle partite e il «raccolto» degli elementi della guida senza mappa che lo citano; i pin delle planimetrie restano con il loro «raccolto» e perdono solo il collegamento. I passi di un Enigma eliminato tornano voci dell\'area, in fondo; eliminando un passo il suo Enigma si riallinea. La voce va nel cestino con tutto quel che l\'eliminazione tocca, e da lì si rimette (`/api/impostazioni/cestino`).',
    risposta: 'Nessun contenuto (204)',
    errori: [[404, 'punto-non-trovato']],
  },
  'POST /api/compendio/punti/sposta-in-area': {
    sommario: 'Sposta più voci della guida insieme in un\'altra infiltrazione dello stesso Palazzo',
    descrizione: 'Corpo `{ chiavi, area }` (da 1 a 500 chiavi, senza ripetizioni; 2026-10-14). Per ogni voce valgono le regole di `area` in `PUT /api/compendio/punti/:chiave`: non nei Memento, un\'infiltrazione che esiste e dello stesso Palazzo, non un passo (i passi seguono il loro Enigma). Le voci arrivano in fondo all\'infiltrazione, nell\'ordine che avevano (infiltrazione, poi posto), coi loro passi e con le loro schede della guida senza mappa; la chiave resta, e con lei stati delle partite e pin. Una voce già in quell\'infiltrazione resta dov\'è. Tutto o niente: un errore su una voce non sposta nessuna.',
    risposta: '`PuntiSpostatiDto`: `area` e le chiavi `spostate`, nell\'ordine d\'arrivo',
    errori: [[400, 'area-solo-nei-palazzi'], [400, 'area-di-altro-palazzo'], [400, 'passo-segue-enigma'], [404, 'area-non-trovata'], [404, 'punto-non-trovato']],
  },
  'POST /api/compendio/punti/copia-in-area': {
    sommario: 'Copia più voci della guida insieme in un\'altra infiltrazione dello stesso Palazzo',
    descrizione: 'Corpo `{ chiavi, area }` come lo spostamento (2026-10-18). Le stesse regole (non nei Memento, infiltrazione esistente dello stesso Palazzo, non un passo) e in più un\'infiltrazione diversa da quella della voce (400 `copia-nella-stessa-area`). Ogni voce diventa una voce nuova (chiave nuova dal nome, `fonte` «utente») in fondo all\'infiltrazione, nell\'ordine della guida, con i passi dell\'Enigma e le schede della guida senza mappa copiati (le immagini delle schede duplicate). La copia si collega agli stessi pin delle planimetrie dell\'originale con uno stato suo: parte da fare (lo stato dell\'originale non si copia) e il pin è fatto quando lo sono tutte le sue voci. Tutto o niente.',
    risposta: '201, `PuntiCopiatiDto`: `area` e per ogni voce `{ origine, copia, passi, schede, pin }` (`pin`: i collegamenti ai pin copiati, passi compresi), nell\'ordine d\'arrivo',
    errori: [[400, 'area-solo-nei-palazzi'], [400, 'area-di-altro-palazzo'], [400, 'passo-segue-enigma'], [400, 'copia-nella-stessa-area'], [404, 'area-non-trovata'], [404, 'punto-non-trovato']],
  },
  'PUT /api/compendio/punti/:chiave/sposta': {
    sommario: 'Sposta un punto di un posto su o giù nella guida dell\'area',
    descrizione: '`verso` -1 su, +1 giù, fra le voci accanto (quelle fuori da ogni Enigma, o i passi dello stesso Enigma); l\'ordine si ricompatta. Oltre il primo o l\'ultimo posto è un errore (409).',
    risposta: 'Il punto spostato, `PuntoInteresseDto`',
    errori: [[404, 'punto-non-trovato'], [409, 'punto-al-limite']],
  },
  'PUT /api/compendio/punti/:chiave/pin/:spillo': {
    sommario: 'Collega un pin di una planimetria a un punto della guida',
    descrizione: 'Il pin deve stare su una planimetria del Palazzo del punto; il punto non può essere descrittivo, né un Enigma con passi, né una Persona dei Memento (la sua cattura sta nel compendio, 400 `cattura-nel-compendio`, dal 2026-10-12). Un punto può avere più pin e un pin più punti (098). Da L4 §8.11 ogni pin tiene il suo segno e una voce con pin è fatta quando lo sono tutti: collegando un pin già segnato a una voce i cui pin sono così tutti fatti, la voce è fatta; un pin nuovo di una voce già fatta prende il segno nelle partite dove la voce era fatta (§8.15), e la risposta le elenca in `segniAggiunti` (eliminando il pin, il segno se ne va con lui). Lo usano la guida e l\'editor delle mappe.',
    risposta: 'Il punto con i pin collegati, `PuntoInteresseDto` (con `segniAggiunti` se un pin nuovo ha preso il segno)',
    senzaCorpo: true,
    errori: [[400, 'punto-descrittivo'], [400, 'cattura-nel-compendio'], [400, 'enigma-con-passi'], [400, 'pin-fuori-dal-palazzo'], [404, 'punto-non-trovato'], [404, 'spillo-non-trovato']],
  },
  'DELETE /api/compendio/punti/:chiave/pin/:spillo': {
    sommario: 'Scollega un pin di una planimetria da un punto della guida',
    descrizione: 'Il pin deve essere collegato a quel punto. Si toglie solo quel collegamento (anche quello vecchio scritto nel riferimento del pin): gli altri punti del pin restano. Da L4 §8.11 il pin tiene il suo segno; la voce si ricalcola dai pin che le restano (senza pin, il suo stato è il suo).',
    risposta: 'Il punto con i pin che restano, `PuntoInteresseDto`',
    errori: [[404, 'punto-non-trovato'], [404, 'spillo-non-trovato'], [409, 'pin-non-collegato']],
  },
};
