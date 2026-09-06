# Esportatore delle mappe di Persona 5 Royal

Questo tool legge la tua installazione del gioco e ricrea PNG, nomi italiani, tavole riepilogative e galleria locale. Gli archivi del gioco vengono aperti esclusivamente in lettura.

## Avvio

Su questo computer puoi fare doppio clic su **Esporta.cmd**. Usa il Python già disponibile con Codex; se non lo trova, prova `py -3`.

Da terminale, con Python 3.11 o successivo e le dipendenze di `requirements.txt`:

```text
python -m pip install -r requirements.txt
python esporta.py --cpk "C:\Program Files (x86)\Steam\steamapps\common\P5R\CPK" --out "D:\Mappe-P5R"
```

Senza argomenti usa la cartella Steam sopra indicata e salva nella cartella che contiene `tool`. Puoi spostare l'intera cartella `tool` e indicare qualsiasi destinazione con `--out`.

```text
python esporta.py --solo-verifica --out "D:\Mappe-P5R"
python esporta.py --rigenera-galleria --out "D:\Mappe-P5R"
```

Il primo comando controlla un export esistente. Il secondo ricrea nomi, viste leggibili e panoramiche dai file già esportati, poi esegue nuovamente le verifiche. Entrambi leggono gli archivi originali per il confronto indipendente. Per installazioni non standard aggiungi anche `--cpk`.

## Risultati

- `index.html`: galleria delle mappe dei luoghi, con ricerca e filtro.
- `mappe_luoghi`: PNG con nome del luogo, area/piano verificabile e codice originale.
- `panoramiche`: tavole dei luoghi e Palazzi, con aree affiancate.
- `png`: immagini originali con canvas e trasparenza conservati.
- `originali`: risorse decompresse, incluse le tabelle necessarie alla riproduzione.
- `componenti.html`: tasselli, simboli e atlanti separati dalle planimetrie.
- `mappe_indice.csv` e `mappe_indice.json`: nomi, percorsi, limiti e provenienza delle associazioni.
- `manifest.json`: inventario degli archivi e di ogni risorsa estratta, offset e hash.
- `verifica.json`: risultati delle tre passate automatiche.

Le mappe dei Palazzi sono planimetrie di aree e piani già presenti nel gioco. Le panoramiche li affiancano senza inventare collegamenti geometrici. Le sette viste generali dei quartieri sono illustrazioni prospettiche; non sono planimetrie stradali. Gli originali trasparenti sono preservati e le versioni consultabili applicano soltanto un ritaglio dei margini vuoti, bordo e fondo scuro.

## Memento e limiti

Sono incluse le planimetrie fisse disponibili e le Profondità dei Memento. La ricostruzione dei piani procedurali è stata esclusa su richiesta dell'utente. Non viene generata una disposizione inventata dei corridoi e non si rappresenta lo stato di una partita. Le tabelle procedurali sono conservate tra gli originali per eventuali analisi future.

I simboli dinamici del gioco, i nemici, i contenitori e la nebbia di esplorazione non vengono sovrapposti. File vuoti o uniformi non vengono presentati come planimetrie. Per un nome di area assente o ambiguo si mantiene il codice; non si sceglie arbitrariamente tra interpretazioni discordanti. La galleria può includere varianti o risorse non usate dal gioco.

## Verifiche

1. Tutti gli indici CPK, copertura della selezione, dimensioni, hash dei sorgenti e dei PNG, sintassi degli script.
2. Secondo decompressore indipendente e secondo decoder BC1/BC3: confronto dei byte decompressi e dei pixel. Il decoder ammette al massimo una unità per eventuali differenze di arrotondamento RGB565; nell'esportazione consegnata la differenza massima è zero.
3. Confronto pixel di ogni vista consultabile con l'originale, conteggio di tutte le mappe nelle tavole, verifica delle immagini delle tavole e metadati degli archivi invariati.

Un errore di decompressione, formato o copertura interrompe il completamento con codice di uscita 1. Non viene accettato riempimento artificiale a zero.

## Provenienza tecnica

- Il lettore UTF deriva dal parser locale recuperato dal precedente tentativo.
- La trasformazione P5R è documentata nel sorgente [P5RCrypto.cs di CriFsV2Lib](https://github.com/Sewer56/CriFsV2Lib/blob/master/CriFsV2Lib/Encryption/Game/P5RCrypto.cs): si applica soltanto alle voci marcate `CRI_CFATTR:ENCRYPT`, prima della decompressione.
- La denominazione proviene dalle tabelle italiane del gioco: `ROADMAP.TBL` e `FLDWHOLEMAPTABLE.FTD`. I record della tabella texture sono di 72 byte e formano gruppi terminati da sentinella; gli elementi di 16 byte rimandano ai titoli FTD. Il dettaglio di ciascun collegamento è nell'indice JSON.
- Versioni usate e verificate: Pillow 12.3.0, NumPy 2.3.5.

Non è necessario avviare il gioco, installare mod o modificare gli archivi.

## Etichette originali delle interazioni
Il modulo native_labels.py legge le FTD italiane e produce mondo_etichette.json. Dopo mondo_connessioni_evidenze.json, eseguire: python native_labels.py <cartella-export>; quindi python verify_native_labels.py <cartella-export>. Il charset P5R_EFIGS.tsv proviene dalla distribuzione ufficiale Atlus Script Tools; algoritmo e provenienza sono registrati nel JSON. Le chiamate restano comandi separati dal wrapper generale.
Prompt 14 è ancora non risolto. La tabella dei salvataggi è conservata come evidenza autonoma; tre stringhe contengono codici da verificare. Questi dati non certificano collegamenti né posizioni dei luoghi nell’app.

