# Raccordi documentali delle fonti Jose e Scambi

## Contratto consegnabile

Originali `43ad8889`, R7-13/13b e M7§2.5: 37scambi Jose dalla fonte completa; gli aggregati sintetici non diventano nuove offerte. Il registro132 collega esplicitamente97nodi:69fonti commerciali e28archivi, senza certificare la correttezza semantica dei collegamenti.

Manifest pubblico congelato `shared/raccordiScambiCatalogo132.json`:97RAW completi e5metadati di gruppo, chiavi letterali di articoli/proposte e rinvii alle fonti complete. Verificati autonomamente dal revisore contro il pacchetto pubblico93: nessuna differenza. Nessun matching per solo nome. Sakai resta con due identità da risolvere; tre fusioni Ambulante, sei baratti Gachapon e rettifiche Tanaka conservano lo stato effettivo delle proposte. Mothman mantiene risultati alternativi; Nirvana sintetico non diventa un pacchetto cumulativo.

La migrazione inserisce soltanto `dati_guida.raccordi-scambi-catalogo-132`, nella stessa transazione delle letture e con CAS sui due JSON sorgente RAW. Nessun UPDATE a fonti, articoli, cataloghi, ricompense, proposte, acquisti o progressi. Una chiave preesistente è preservata anche se illeggibile; il GET segnala il conflitto senza impedire l'avvio.

Il GET riconosce l'intero registro contro percorsi/contesti/target del manifest, rilegge fonti e destinazioni correnti, segnala cambiamenti, assenze, aggiunte, cataloghi eliminati e proposte obsolete. Un riferimento documentale non implica equivalenza semantica. Le fotografie RAW private rimangono nel DB dell'istanza; il DTO restituisce solo campi e diagnostici previsti.

## Interfaccia

Catalogo Oggetti → «Scambi e fonti correnti», caricamento su richiesta. Elenco completo ricercabile e paginato, con filtri iniziali su tutti i riferimenti: nessun archivio, conflitto o alternativa escluso. Assenze e registro non riconosciuto rimangono visibili anche quando non esistono più righe correnti. Rinvii alle fonti complete, offerte/listini e Oggetti; condizioni strutturate e prosa commerciale precedente distinte. QuantitàNULL non diventa1 e costo mancante non diventa gratis.

I collegamenti alle proposte contengono l'identità completa tipo/chiave/catalogo/gruppo. La vista esistente apre il gruppo con tutte le alternative ed evidenzia il candidato; nessuna azione automatica. Link incompleto o proposta non più pendente: errore esplicito, senza scelta sostitutiva. Non sono introdotti nuovi comandi commerciali.

## Gate e controlli prima del rilascio

Tre riesami propri su conservazione/identità, transazione/registro e UI/consumatori. Gate distinto APPROVATO per BE, manifest, GET, FE e append132. Corretti durante il riesame: serializzazione esplicita dei soli quattro campi nel link proposta; filtro/avvisi per identità mancanti anche nei risultati/costi.

Controlli integrati dopo gli ultimi delta e append133: typecheck83837, lint66206, build74741 exit0. Nessun test, migrazione locale o copia DB. Confronto commerciale prima132 solo in memoria:636articoli,1301identità,87proposte,159ricompense e tre blocchi fonte/audit. Restano esiti reali, browser e confronto dopo il rilascio; nessuna chiusura di R7-13 oL7.
