# Proposta: titolo verificato soltanto in un contesto

Stato: analisi, nessuna implementazione o modifica al database. Ambito: `nativo-rmap-153-4-0`, titolo «Ripostiglio» verificato per F153_004_00; F153_051_00 associato alla risorsa ma senza titolo verificato. Non estendere il nome del primo campo al secondo.

## Problema verificato nel codice

`shared/types.ts` impone `nome:string` per ogni contesto, sia nel DTO sia nel pacchetto. `mappeService.ts` valida la stessa proprietà come stringa non vuota. `mappa_presentazione` conserva già il JSON dei contesti: nessun vincolo SQL impone un titolo.

`nomePresentazioneMappa` usa tutti i titoli disponibili come nome quando manca una selezione. Inserire soltanto il contesto noto trasformerebbe quindi «Ripostiglio» nel nome incondizionato. `SelettoreContestoMappa` distingue la selezione valida da quella invalida soltanto attraverso la presenza del titolo: un contesto valido senza titolo verrebbe erroneamente dichiarato estraneo alla mappa.

## Contratto minimo raccomandato

Cambiare esclusivamente `nome` in `string | null` nel tipo di contesto condiviso. Conservare obbligatori `id`, `campo`, `texpack`, con le identità provate dalle fonti. `null` significa «contesto associato, titolo non ricostruito», non «contesto inesistente». Non ammettere stringa vuota, proprietà mancante o testo segnaposto nel dato nominale.

Registrare entrambi i contesti della risorsa: quello F153_004_00 con `nome:"Ripostiglio"`; quello F153_051_00 con `nome:null`. Texpack e identificativi vanno ripresi dal reperto verificato relativo a questa precisa immagine, senza dedurli da altre risorse dello stesso campo.

Non aggiungere un flag ridondante `richiedeSelezione`: la copertura parziale si ricava dalla presenza di almeno un nome nullo. Non rinominare la riga `mappa` in «Ripostiglio».

## Risoluzione e presentazione

Introdurre una risoluzione esplicita della selezione con stati `assente`, `nominato`, `senza-titolo`, `non-valido` (eventualmente `multiplo` per combinazioni valide di titoli differenti). La selezione valida senza titolo mantiene il proprio valore nel selettore. Non usare il titolo come prova di validità dell'ID.

Un titolo contestuale può essere usato come intestazione solo se è stata ricevuta una selezione esplicita non vuota, tutti gli ID appartengono alla risorsa e tutti hanno lo stesso nome non nullo. Una selezione mista noto/ignoto non autorizza il titolo noto. ID sconosciuti, duplicati o segmenti vuoti sono invalidi. I raggruppamenti di contesti con identico titolo noto possono conservare il comportamento attuale; i contesti senza titolo restano scelte separate e non vengono fusi per il valore nullo.

Per questa risorsa con copertura parziale:

- nessuna selezione: intestazione del palazzo verificato e descrizione di ruolo «Planimetria»; stato esplicito «Il nome dipende dal contesto». Nessun «Ripostiglio» usato come nome generale;
- selezione F153_004_00: intestazione «Ripostiglio»;
- selezione F153_051_00: stessa intestazione geografica verificata, stato «Nome non ricostruito per questo contesto»;
- selezione non valida: avviso specifico di selezione non riconosciuta, senza prendere il primo contesto noto.

«Planimetria» e «Nome non ricostruito» sono etichette dell'interfaccia, non nomi inventati del luogo e non dati da salvare in `mappa.nome`. Il titolo tecnico originale resta nel dato diagnostico finché non esiste evidenza completa, ma non deve essere usato come ripiego pubblico. Il nome del palazzo deve provenire dalla gerarchia canonica già verificata; non ricavarlo da codici o somiglianze. Se serve distinguere la risorsa in un elenco, usare la miniatura e il relativo percorso, non un piano inventato.

Nel selettore è lecito mostrare «Ripostiglio» come opzione esplicitamente associata al suo contesto; l'altra opzione usa «Contesto con nome non ricostruito» come stato. Prima opzione «Seleziona un contesto» per la copertura parziale, non «Mostra tutti i nomi». Un eventuale elenco di alternative deve evidenziare anche il contesto senza titolo. Negli elenchi generali non presentare il solo titolo noto come identità della risorsa.

Per le 19 risorse con tutti i titoli noti il comportamento attuale delle alternative rimane invariato. L'assenza di una selezione non va interpretata come il contesto del salvataggio corrente: tale collegamento non è stato verificato.

## Persistenza, importazione ed esportazione

Nessuna nuova migrazione SQL: `mappa_presentazione.contesti_json` supporta già `null`. DTO e pacchetto condividono lo stesso tipo. Validazione Zod: stringa non vuota oppure null, mai campo facoltativo. Reader e writer devono conservare null senza filtri. L'esportazione deve mantenere entrambi i contesti, senza convertirli nel nome della mappa.

Aggiornare anche il tipo e la guardia del tool `scripts/atlas-organization.ts`: l'attuale `!c.nome` rifiuta null. Accettare esplicitamente null o stringa valida, mantenendo unicità degli ID e controlli sugli altri campi. Inserimento tramite piano approvato e updater idempotente; nessuna nuova immagine, connessione, coordinata o rinomina canonica. I pacchetti correnti con sole stringhe rimangono validi senza conversione.

## Verifiche richieste prima dell'integrazione

1. Import/export roundtrip conserva esattamente il nome nullo e le due identità; respinge vuoto, nome mancante e ID duplicato. Reseed e secondo updater non alterano il risultato.
2. Test helper: assenza di selezione; noto selezionato; ignoto valido selezionato; ID estraneo; combinazione noto/ignoto; ID ripetuto; combinazione di titoli diversi. «Ripostiglio» diventa intestazione soltanto nel caso autorizzato.
3. Test UI del selettore: contesto ignoto rimane selezionato e non mostra l'errore «non appartiene». Entrambe le opzioni sono raggiungibili.
4. Verifica tutte le superfici che usano i nomi: albero, elenco, scheda mappa, breadcrumb, selettori dell'editor, accessi dalle sezioni. Nessun ripiego diretto sul nome tecnico e nessuna attribuzione incondizionata del titolo noto. I gruppi di immagini restano invariati.
5. Regressione sulle 19 risorse completamente nominate, build, typecheck e test. Su copia del database controllare invarianti di immagini, ID, pin, destinazioni, alias e note: il solo cambiamento consentito è il JSON della presentazione approvata.

Limite dichiarato: questa estensione rende utilizzabile l'evidenza parziale senza falsificarla. Non risolve il titolo ancora sconosciuto di F153_051_00 e non deve essere rendicontata come identificazione nominale completa di entrambi i contesti.
