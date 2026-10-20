// ============================================================
// descrizioni/impostazioni — le rotte di /api/impostazioni: stato dell'istanza, scaricamenti, pacchetto di gioco, ripristino
// ============================================================

import type { DescrizioniArea } from '../tipi.js';

/**
 * Le descrizioni delle rotte di `server/routes/impostazioni.ts` (servizi `impostazioniService`, `pacchettoGiocoService`,
 * `depositoService`). Nessun file viaggia nel corpo di una richiesta: i file grossi passano dalla cartella d'appoggio del server
 * (`DEPOSITO_DIR`, il NAS montato). Ogni scaricamento ne lascia lì una copia; importazione e ripristino leggono da lì il file indicato
 * per nome. Importazione e ripristino condividono un lucchetto: una sola sostituzione dei file alla volta (409 `importazione-in-corso`).
 */
export const DESCRIZIONI_IMPOSTAZIONI: DescrizioniArea = {
  'GET /api/impostazioni/istanza': {
    sommario: 'Stato dell\'istanza: versioni dello schema, dimensioni dei database, immagini, caratteri, partite',
    descrizione: 'Versione dell\'app e degli schemi (dati di gioco e partite), nome e dimensione dei due file di database (zero se l\'istanza tiene il database in memoria), immagini con contenuto nel database e loro peso, caratteri caricati, numero di partite e di copie di sicurezza in `data/backups` (copie dell\'avvio e copie fatte prima di un ripristino). `vuota` è vero se non ci sono Persona; `completo` è vero se il database ha immagini (pacchetto completo importato).',
    risposta: '`StatoIstanzaDto`',
  },
  'GET /api/impostazioni/istanza/database': {
    sommario: 'Scarica il database dei dati di gioco: il pacchetto di gioco, immagini comprese, partite escluse',
    descrizione: 'Fa una copia consistente di `gioco.db` con il backup in linea di SQLite (sicuro con il WAL attivo, non ferma le scritture) e la manda come allegato `project-p5r-gioco-<data>.db`. Prima dell\'invio ne lascia una copia nella cartella d\'appoggio, se configurata: il nome depositato arriva nell\'intestazione `X-Deposito-File`, e delle copie generate dall\'app se ne tengono le ultime cinque. Se il deposito non riesce lo scaricamento prosegue lo stesso. Il file è lo stesso che si reimporta come pacchetto di gioco.',
    risposta: 'Il file SQLite dei dati di gioco',
    rispostaBinaria: 'application/vnd.sqlite3',
    senzaProva: 'Non è una semplice lettura: lascia una copia del database (centinaia di MB) nella cartella d\'appoggio, ne toglie le più vecchie oltre il limite, poi manda il file. Si scarica da Impostazioni → Pacchetto di gioco.',
  },
  'GET /api/impostazioni/istanza/completa.zip': {
    sommario: 'Scarica l\'istanza completa in uno ZIP: i due database, i caratteri, il manifesto',
    descrizione: 'Lo ZIP contiene `database/gioco.db` (dati di gioco con le immagini), `database/partite.db` (avanzamento), la cartella `font/` con i caratteri caricati, `manifest.json` con versioni e conteggi e un `LEGGIMI.txt`. L\'archivio si scrive a flusso in un file temporaneo, si manda come allegato `project-p5r-istanza-<data>.zip` e poi si cancella. Come per il database, una copia resta nella cartella d\'appoggio (intestazione `X-Deposito-File`, ultime cinque copie): è il file da usare per il ripristino.',
    risposta: 'L\'archivio ZIP dell\'istanza',
    rispostaBinaria: 'application/zip',
    senzaProva: 'Non è una semplice lettura: lascia una copia dello ZIP (centinaia di MB) nella cartella d\'appoggio, ne toglie le più vecchie oltre il limite, poi manda il file. Si scarica da Impostazioni → Backup e ripristino.',
  },
  'GET /api/impostazioni/istanza/gioco/deposito': {
    sommario: 'I pacchetti di gioco presenti nella cartella d\'appoggio',
    descrizione: 'Elenca i file della cartella d\'appoggio con estensione `.db`, `.sqlite` o `.sqlite3`, dal più recente, con dimensione e data di modifica. Se nessuna cartella è configurata o non è leggibile risponde comunque 200 con `disponibile: false` e il `motivo`, invece di un elenco vuoto che sembrerebbe «nessun file».',
    risposta: '`DepositoFileDto` (disponibile, cartella, motivo, file: `FileDepositoDto[]`)',
  },
  'POST /api/impostazioni/istanza/gioco/deposito/anteprima': {
    sommario: 'Anteprima di un pacchetto di gioco depositato: che cosa cambierebbe importandolo',
    descrizione: 'Non sostituisce nulla e non prende il lucchetto. Il server apre il file dov\'è, in sola lettura, senza copiarlo: controlla la firma SQLite, che ci siano i dati di gioco e non le partite, confronta la versione dello schema con quella che il codice sa leggere (un pacchetto più nuovo è `importabile: false`, uno più vecchio sì, le migrazioni lo portano avanti), conta le righe per tabella rispetto all\'istanza, le immagini, e i riferimenti delle partite che resterebbero senza la loro riga (orfani). `nome` è solo un nome di file della cartella d\'appoggio, senza percorsi.',
    risposta: '`AnteprimaPacchettoDto` (versioni dello schema, databaseByte, importabile, motivo, differenze, tabelleAssenti, immagini, orfani `OrfanoPartiteDto[]`)',
    errori: [[400, 'deposito-non-configurato'], [400, 'file-non-valido'], [404, 'file-non-trovato'], [400, 'pacchetto-non-valido'], [400, 'pacchetto-con-partite']],
  },
  'PUT /api/impostazioni/istanza/gioco/deposito': {
    sommario: 'Importa un backup locale dei dati di gioco (il file delle partite non viene sostituito)',
    descrizione: 'Prende il lucchetto dell\'istanza (409 se è già in corso un\'importazione o un ripristino), copia il backup dalla cartella d\'appoggio in una cartella di lavoro locale, lo verifica per intero (firma, controllo di integrità, solo dati di gioco, schema non più nuovo del codice) e rifà l\'anteprima. Poi salva una copia di sicurezza dell\'istanza in `data/backups/prima-del-ripristino-<data>` (se ne tengono tre), chiude la connessione, mette il file al posto di `gioco.db` e riapre con le migrazioni. Dopo le migrazioni storiche, i nodi legacy `manuale` ancora presenti nei requisiti e nelle colonne delle condizioni vengono recuperati come avvisi non bloccanti nella stessa operazione protetta; i riferimenti alle righe compaiono in `condizioniConvertite`, senza il contenuto delle note. Le altre condizioni non vengono riscritte da questo recupero. Un avviso legacy senza testo valido interrompe l\'importazione senza scartarlo. Seguono le regole dell\'avvio. Il file `partite.db` non viene sostituito. Se qualcosa fallisce a connessione chiusa si torna alla copia di sicurezza e si risponde 400 `importazione-fallita`. Le fasi e l\'esito si leggono anche da `GET /api/impostazioni/istanza/gioco/importazione`, utile quando un proxy chiude la richiesta prima della fine.',
    risposta: '`EsitoImportazionePacchettoDto` (copiaDiSicurezza, versioni dello schema, migrazioniApplicate, immagini, orfani, condizioniConvertite, stato)',
    errori: [
      [409, 'importazione-in-corso'], [400, 'istanza-in-memoria'], [400, 'deposito-non-configurato'], [400, 'file-non-valido'], [404, 'file-non-trovato'],
      [400, 'lettura-fallita'], [400, 'pacchetto-non-valido'], [400, 'pacchetto-con-partite'], [400, 'database-danneggiato'], [400, 'database-estraneo'],
      [400, 'pacchetto-troppo-nuovo'], [400, 'importazione-fallita'],
    ],
  },
  'GET /api/impostazioni/istanza/deposito': {
    sommario: 'I backup dell\'istanza (ZIP) presenti nella cartella d\'appoggio',
    descrizione: 'Elenca i soli file `.zip` della cartella d\'appoggio, dal più recente, con dimensione e data di modifica: un `.db` è un pacchetto di gioco e compare nell\'altro elenco, perché non si «ripristini l\'istanza» con i soli dati di gioco. Senza cartella configurata o leggibile risponde 200 con `disponibile: false` e il `motivo`.',
    risposta: '`DepositoFileDto` (disponibile, cartella, motivo, file: `FileDepositoDto[]`)',
  },
  'PUT /api/impostazioni/istanza/deposito': {
    sommario: 'Ripristina l\'istanza da un file della cartella d\'appoggio (ZIP dell\'istanza o database)',
    descrizione: 'Sostituisce l\'istanza corrente. Prende il lucchetto dell\'istanza (409 se è già in corso un ripristino o un\'importazione), copia il file in una cartella di lavoro locale e lo esamina: uno ZIP deve contenere almeno un database in `database/`; ogni database deve essere SQLite integro, dell\'app e con uno schema non più nuovo del codice. Poi salva una copia di sicurezza in `data/backups/prima-del-ripristino-<data>` (se ne tengono tre), chiude la connessione, mette al loro posto i database presenti (dati di gioco, partite, o il vecchio file unico, che toglie anche il file delle partite) e, per uno ZIP, sostituisce in blocco le cartelle dei caratteri e delle immagini su disco (queste ultime, presenti solo nei backup di prima che le immagini entrassero nel database, alla riapertura vengono assorbite nel database); infine riapre con le migrazioni. Se qualcosa fallisce a connessione chiusa si torna alla copia di sicurezza e si risponde 400 `ripristino-fallito`.',
    risposta: '`EsitoRipristinoDto` (formato, database, partite, immagini, caratteri, copiaDiSicurezza, stato)',
    errori: [
      [409, 'importazione-in-corso'], [400, 'istanza-in-memoria'], [400, 'deposito-non-configurato'], [400, 'file-non-valido'], [404, 'file-non-trovato'],
      [400, 'lettura-fallita'], [400, 'zip-non-valido'], [400, 'zip-senza-database'], [400, 'database-danneggiato'], [400, 'database-estraneo'],
      [400, 'database-troppo-nuovo'], [400, 'ripristino-fallito'],
    ],
  },
  'GET /api/impostazioni/cestino': {
    sommario: 'Gli elementi del cestino: aree, voci della guida, planimetrie e aree dei dedali eliminate, dalla più recente',
    descrizione: 'Ogni eliminazione di un\'infiltrazione, di una voce, di una planimetria o di un\'area di un dedalo finisce qui con tutto quel che si è portata via (cascate comprese, immagini dei pin e delle mappe comprese, stato nelle partite). Per ogni elemento: tipo, chiave, nome, dove stava (`contesto`), quando, le righe tolte per tabella con il nome per l\'utente (`contenuto`), la parte nelle partite (`nessuna`, `presente`, o `mancante` se il file delle partite è stato sostituito dopo) e il peso del registro in byte.',
    risposta: 'Elenco di `VoceCestinoDto`',
  },
  'POST /api/impostazioni/cestino/:id/ripristina': {
    sommario: 'Rimette un elemento del cestino com\'era, ed esce dal cestino',
    descrizione: 'In una transazione riapplica al contrario il registro dell\'eliminazione: le righe tolte tornano, quelle cambiate tornano com\'erano, quelle aggiunte se ne vanno. Quel che è cambiato dopo l\'eliminazione vince: una riga toccata di nuovo resta com\'è, una riga che punta a qualcosa eliminato dopo non torna, e l\'esito le elenca per tabella e motivo (`cambiata-dopo`, `non-esiste-piu`, `legame-mancante`). Una riga del file di gioco con la chiave ormai presa da qualcosa creato dopo blocca tutto (409, niente cambia). Poi l\'ordine delle aree e delle voci vicine si rimette senza doppioni e i percorsi delle mappe si ricalcolano.',
    risposta: '`EsitoRipristinoCestinoDto` (tipo, chiave, nome, rimesse, saltate, partiteMancanti)',
    senzaCorpo: true,
    errori: [[404, 'cestino-non-trovato'], [409, 'cestino-chiavi-occupate'], [409, 'cestino-non-ripristinabile']],
  },
  'DELETE /api/impostazioni/cestino/:id': {
    sommario: 'Toglie per sempre un elemento dal cestino',
    descrizione: 'Se ne va il registro dell\'eliminazione, nel file di gioco e in quello delle partite: l\'elemento non si potrà più rimettere. I dati di gioco e le partite non cambiano.',
    risposta: 'Nessun contenuto (204)',
    errori: [[404, 'cestino-non-trovato']],
  },
  'DELETE /api/impostazioni/cestino': {
    sommario: 'Svuota il cestino',
    descrizione: 'Toglie per sempre ogni elemento del cestino, comprese le parti delle partite rimaste senza la loro riga nel file di gioco (dopo una sostituzione del pacchetto). I dati di gioco e le partite non cambiano.',
    risposta: '`{ eliminati }`: quanti elementi c\'erano',
  },
  'GET /api/impostazioni/istanza/gioco/importazione': {
    sommario: 'A che punto è l\'importazione del pacchetto di gioco, e com\'è finita l\'ultima',
    descrizione: 'Si interroga quando la risposta dell\'importazione non arriva (un proxy può chiudere la richiesta prima che il lavoro finisca). Dice se un\'importazione è in corso, con identificativo, fase (`lettura`, `verifica`, `copia-di-sicurezza`, `sostituzione`, `riapertura`, `controllo`) e ora d\'inizio, e l\'esito dell\'ultima conclusa da quando il server è partito, con l\'esito completo se è riuscita. L\'identificativo cambia a ogni tentativo: confrontandolo con quello letto prima di chiedere l\'importazione si capisce se l\'esito è del proprio tentativo.',
    risposta: '`StatoImportazionePacchettoDto` (inCorso, operazione, fase, iniziataIl, ultima)',
  },
};
