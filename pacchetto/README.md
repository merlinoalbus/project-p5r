# Pacchetto di gioco

La fonte dei dati di gioco è il database dell'istanza, `DATA_DIR/gioco.db`. Le correzioni si fanno con l'app (Modifica) o con
un intervento diretto e verificato sul database dell'istanza. Il pacchetto è solo il punto di partenza di un'istanza nuova.

Il pacchetto è in git con due file, e nessuno dei due contiene le immagini:

| Dove | Contenuto | Uso |
|---|---|---|
| `pacchetto/gioco.db` | schema e dati di gioco alla versione che il codice legge (`VERSIONE_GIOCO`), senza il contenuto delle immagini, con il cestino e le miniature vuoti | copiato in `DATA_DIR/gioco.db` al primo avvio, quando il file manca, così l'interfaccia si apre subito; lo caricano anche i test |
| `pacchetto/partite-vuoto.db` | il file delle partite senza partite, alla versione che il codice legge (`VERSIONE_PARTITE`), con le sole righe iniziali | modello da cui nasce `partite.db` quando il file non ha tabelle |

Le immagini (tranne compendio e interfaccia, che stanno in `public/asset/`) vivono nella tabella `immagine` di `gioco.db`. Un'istanza nuova le
riceve importando un backup completo dei dati di gioco dall'app.

## «Importa»: sostituire `gioco.db` con un file scelto

Impostazioni → Pacchetto di gioco elenca i file presenti nella cartella d'appoggio del server (`DEPOSITO_DIR`; vuota = funzione
spenta). Scelto un file, l'app mostra l'anteprima e chiede conferma. Il file deve essere un backup dei dati di gioco alla versione
che il codice legge: un file di un'altra versione è rifiutato (`pacchetto-di-altra-versione`), un file con dati di gioco e
partite insieme è rifiutato (`database-gioco-e-partite`). Poi:

1. fa una copia di sicurezza del `gioco.db` corrente (`data/backups/prima-del-ripristino-<timbro>`, ne tiene le ultime 3);
2. **sostituisce** `gioco.db` con il file scelto, senza unire i dati;
3. riapre l'istanza con la verifica delle versioni e le regole sui dati; se qualcosa fallisce, torna alla copia di sicurezza.

`partite.db` non viene toccato. Il file non passa dal browser: lo legge il server dalla cartella d'appoggio.
Le correzioni fatte dopo la data del file importato restano nella copia di sicurezza, non nel database nuovo.

## Rigenerare il pacchetto

`npm run pacchetto` (script `scripts/genera-pacchetto.ts`) rifà `pacchetto/gioco.db` dai dati di gioco dell'istanza
(`DATA_DIR/gioco.db`) senza scriverli. Lavora su una copia consistente: applica le regole sui dati dell'avvio, svuota il cestino
e le miniature, toglie il contenuto delle immagini (restano le righe), compatta il file e ne verifica versione e integrità. È una
fotografia: ciò che l'istanza ha tolto resta tolto, il cestino non passa.

Il file `partite-vuoto.db` non lo genera lo script: è un file del repository, da aggiornare a mano quando cambia la struttura delle
partite (vedi [`docs/DECISIONI.md`](../docs/DECISIONI.md)).
