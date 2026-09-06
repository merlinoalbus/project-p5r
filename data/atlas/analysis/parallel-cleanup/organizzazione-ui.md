# Organizzazione UI globale — proposta da validare

Analisi READ-ONLY del checkout C:/Repository/project-p5r-main e dell'API http://localhost:3103/api/mappe/albero. Nessun codice, database o file di altri agenti modificato.

## Evidenza attuale

API: 465 nodi, 23 radici, 426 nodi a profondità1 e 16 a profondità2. L'indice renderizza esclusivamente radici e figli immediati: le planimetrie sotto i quartieri non vengono elencate nello stesso modo delle planimetrie sotto le radici tecniche. La scuola ha cinque planimetrie sotto Tokyo→Shujin e Aula/Biblioteca sotto una radice tecnica diversa. È un problema combinato di dati e presentazione, non assenza delle tre immagini dei piani.

MappaPage.tsx:30-65: IndiceMappe trova radici e figli di un solo livello, conta figli come «mappe», e marca ogni figlio con icona Passaggio. Una sezione editoriale, un piano e una variante diventano visivamente la stessa cosa.

VisoreMappa.tsx:390-408: la sezione si intitola «Livelli» per qualsiasi relazione genitore/figlio; gli elementi hanno tutti icona Passaggio. Non esiste un selettore esplicito di varianti né dei piani fratelli; per cambiare piano bisogna tornare al genitore. I breadcrumbs preservano correttamente la gerarchia, ma ne mostrano integralmente i nomi sporchi provenienti dal DTO.

shared/types.ts:1451 MappaRiassuntoDto descrive chiave, tipo, genitore e immagine, non distingue luogo/planimetria/variante. server/services/mappe/mappeService.ts:51-65 emette tutte le righe mappa senza separazione del ruolo. Di conseguenza non basta filtrare nomi «Risorse native» nel frontend: lascerebbe dati, URL, selettori e conteggi incoerenti.

DestinazioneSpilloEditor.tsx:21 presenta tutte le righe dell'albero come destinazioni di mappa. IngressoQuartiere.tsx:19 filtra opzioni tramite parole nel nome completo: un cambio nomi può alterare le opzioni. Le appartenenze devono provenire da una relazione strutturale, non dal testo visibile.

DungeonPage.tsx:60 promette «N aree collegate» usando il numero delle sezioni della guida: questo numero non dimostra né planimetrie né passaggi.

## Proposta concreta coerente con struttura-unica.md

1. Un solo accesso per luogo. L'indice presenta Tokyo/quartieri e i luoghi metaverso nella loro gerarchia definitiva, senza radici «Risorse native». Ogni luogo mostra il numero di planimetrie fisiche discendenti; le sezioni guida hanno un conteggio distinto. La ricorsione deve coprire qualunque profondità, con mappa parent→children precomputata, protezione cicli e ordine esplicito. Non troncare la scuola a due livelli.
2. Una pagina luogo gestisce i contenitori privi di immagine. Mostra le planimetrie realmente disponibili e i contenuti guida preservati dalla migrazione dei 116 nodi editoriali. Nessun canvas vuoto spacciato per una mappa e nessun pin a griglia per aprire una sezione testuale. Il contenuto guida resta accessibile anche prima della sua localizzazione precisa.
3. Una planimetria apre il visore e mantiene un selettore «Planimetrie del luogo» con tutte le sorelle dello stesso luogo fisico certificato. Usa icona mappa e nomi leggibili; non icona Passaggio. Questa è selezione documentale, non promessa di cammino nel gioco. Il breadcrumb porta al luogo unico.
4. Varianti: introdurre relazione esplicita variante→planimetria/luogo e descrizione della differenza provata. Un piano fisico differente rimane una planimetria separata. Una variante grafica accertata compare nel selettore «Versione della mappa» della medesima planimetria; non crea un secondo luogo o piano. Nomi uguali, indici RMAP e immagini uguali non bastano a creare tale relazione. Nessuna applicazione automatica di giorno/meteo in questo step. Per casi non risolti conservare identità nello storage e rendicontarli: non sostituirli con «Variante 1» né dichiarare pulizia completa.
5. Vecchi URL e accessi guida entrano nello stesso luogo preservando il contenuto richiesto. Un URL di sezione editoriale seleziona la sezione guida nella pagina del palazzo; non apre una stanza arbitraria. Gli ID delle immagini e dei pin non cambiano solo per adeguare la presentazione.
6. Tutti i selettori consumano lo stesso DTO organizzato: indice, visore, editor destinazione, scelta ingresso quartiere, accesso mondo e pulsanti dungeon/città. Escludere sezioni editoriali dall'elenco delle planimetrie; conservare i contenitori come accessi al luogo, non come superfici su cui posizionare arrivi XY. Evitare il matching per parole nei nomi.
7. Nessuna pulizia via espressione regolare in rendering: nomi canonici nel dato, codici tecnici solo in metadati di provenienza/editor diagnostico. Sottotitoli e conteggi devono descrivere ciò che è realmente integrato, senza «aree collegate» se sono soltanto sezioni.

## Confini di questa attività

Non aggiungere pin, condizioni, navigabilità fisica o nuove attività. Non fondere planimetrie sulla somiglianza dei nomi. I 83 nomi nativi irrisolti rimangono lavoro aperto dell'agente nomi: la proposta UI non li risolve e non li nasconde da una verifica di copertura.

## Verifiche richieste prima di dichiarare conclusione

- Ogni nodo censito ha una destinazione verificabile nel modello: luogo, planimetria, variante accertata, contenuto guida migrato; nessun elemento scompare dal conto.
- Scuola: un solo accesso, tutte e sette le risorse contabilizzate, i tre piani reperibili senza cambiare ramo archivio; eventuale stato Aula/Biblioteca esplicitato dall'evidenza, non dedotto.
- Tutti i palazzi: una sola identità di luogo; numero delle immagini originali riconciliato, sezioni guida distinguibili e preservate. Non confondere omonimie con duplicati.
- Test profondità almeno3 e nomi omonimi in luoghi diversi; il selettore non dipende dal testo del nome.
- Vecchi URL tecnici, vecchi URL editoriali, URL correnti, selettori editor e accessi da guida risolvono la stessa identità canonica.
- Conteggi di planimetrie non includono contenitori/editoriali/varianti già rappresentate nel selettore; conteggio risorse conserva comunque tutte le immagini.
- Verifica visiva desktop e larghezza ridotta: breadcrumb, indice, luogo e selector varianti; niente elenco di asset duplicato accanto al mondo.
- Riavvio e reseed non ricreano rami tecnici/editoriali rimossi.

La proposta è pronta per gate di soluzione, non è stata implementata né approvata dal validatore.

## Vincoli ulteriori ricevuti dal coordinatore

Tutte le sezioni originali dell’app (Mappe, La città, Palazzi e Dedali, Negozi, Beni e Inventario) RESTANO con le rispettive schede e contenuti. Il luogo unico aggiunge un accesso geografico comune e non sostituisce o cancella i menu. Le sezioni guida sono accessibili sia dal menu originale sia dal luogo del palazzo. Gli alias tipizzati distinguono destinazione geografica e contenuto guida: nessuna trasformazione implicita di scheda in arrivo XY.

L’agente nomi ha identificato titoli contestuali per una parte delle identità irrisolte: la stessa immagine RMAP può comparire in texpack normali e safe room. Il selettore deve pertanto modellare il contesto del luogo oltre all’immagine; non è ammesso assegnare un unico titolo globale per hash PNG o codice RMAP. La relazione contesto→planimetria conserva chiave del campo, texpack e fonte del titolo. La condivisione dell’immagine non implica condivisione di luogo o pin.

## Implementazione frontend autorizzata e verificata

Realizzata in src del checkout condiviso dopo nuova assegnazione del coordinatore. Nuovi componenti AlberoLuoghi, RisolviMappa, ContenutiGuidaMappa; API client organizzazioneMappe. MappaPage ora rende tutte le profondità, distingue pagina luogo senza immagine dal visore fisico, propone planimetrie sorelle e contenuti guida. Editor risolve preventivamente alias geografici/editoriali. MappaIncorporata preserva la pagina originale della guida e mostra accesso al palazzo per alias editoriali. AccessoMondoPage mostra le guide senza coordinate e senza perdere cataloghi originali. Il visore non chiama Passaggio il rapporto padre/figlio; DungeonPage conta sezioni della guida. Nessuna variante dedotta da immagini uguali.

Validazioni: typecheck completo PASS; 198 test frontend in 62 file PASS; build Vite/TypeScript PASS (avviso bundle >500kB già esistente); ESLint su tutto src PASS; git diff --check src PASS. Aggiornati mock esistenti per nuovo endpoint e aggiunti test profondità/omonimia, alias guida, conservazione contenuti senza coordinate, riquadro editoriale senza abbandonare scheda, contenitore senza canvas falso.

Runtime con nuovo backend non ancora verificato: riavvio istanza3103 resta al coordinatore. Nessuna modifica DB, seed, shared o server da questo agente. Varianti contestuali attendono contratto successivo dell’agente nomi/backend; non dichiarare questa parte completata.

Correzione analisi iniziale: il filtro parole in IngressoQuartiere è ricerca libera dell’utente, non una prova di relazione geografica; non è stato modificato arbitrariamente.

## Titoli contestuali e immagini Covo implementati

Contratto contesti[{id,nome,campo,texpack}] e gruppoImmagini{id,nome,ordine} concordato con backend. I19 casi contestuali non eleggono un titolo canonico: senza scelta tutte le alternative native compaiono, con ?contesto=id il titolo/breadcrumb/alt/documenttitle usa il titolo verificato di quel contesto. Un contesto sconosciuto o misto non viene accettato. I due campi con identico titolo vengono raggruppati solo per presentazione, conservando entrambi gli ID nella scelta; nessuna equivalenza geografica.

Covo: un luogo, cinque immagini selezionabili tramite miniature e ordinale immagine, non piani. Identità/numero risorse invariati. Anche i selettori editor/ingresso e il visore incorporato usano etichette contestuali; i nomi del dato non vengono riscritti dal rendering.

Verifiche: 204/204 test src PASS prima dell’ultimo test aggiuntivo; ultimo test MappaPage esercita URL contesto, cambio selettore, titolo immagine e ripristino alternative con stesso src, 5/5 test file PASS (totale atteso205, suite completa205 non ancora rieseguita). Typecheck, build ed ESLint PASS. Il caso Nuova mappa segnalato dalla suite backend parallela passa sia nell’intera suite src sia isolato. Runtime con nuovo seed/metadati resta da verificare dopo riavvio coordinatore.
