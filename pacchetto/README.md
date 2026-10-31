# Pacchetto di gioco

La fonte dei dati di gioco è il database dell'istanza, `DATA_DIR/gioco.db`. Le correzioni si fanno con l'app (Modifica e
Ripristina) o con migrazioni dirette e conservative in `server/db/migrations/`. Il pacchetto è solo il punto di partenza di
un'istanza nuova.

È un solo file, `gioco.db`: compendio, guida, catalogo, mappe, luoghi e immagini. Non contiene partite, che stanno in `partite.db`.

| Dove | In git | Contenuto | Uso |
|---|---|---|---|
| `pacchetto/gioco.db` | sì (pochi MB) | schema e dati **senza** il contenuto delle immagini | copiato in `DATA_DIR/gioco.db` al primo avvio, quando il file manca, così l'interfaccia si apre subito; lo caricano anche i test |
| `pacchetto/completo/gioco.db` | **no** (`.gitignore`, alcune centinaia di MB) | lo stesso file **con le immagini dentro** (tabella `immagine`, colonna `contenuto`) | si carica dall'app, dalla cartella d'appoggio (vedi sotto) |

Il file completo supera il limite di GitHub per un singolo file: si conserva in locale e si passa a mano a chi installa.

## «Importa»: sostituire `gioco.db` con un file scelto

Impostazioni → Pacchetto di gioco elenca i file presenti nella cartella d'appoggio del server (`DEPOSITO_DIR`; vuota = funzione
spenta). Scelto un file, l'app mostra l'anteprima e chiede conferma; poi:

1. fa una copia di sicurezza del `gioco.db` corrente (`data/backups/prima-del-ripristino-<timbro>`, ne tiene le ultime 3);
2. **sostituisce** `gioco.db` con il file scelto, senza unire i dati;
3. riapre l'istanza: le migrazioni portano avanti un file più vecchio; un file più nuovo del codice viene rifiutato.

`partite.db` non viene toccato. Il file non passa dal browser: lo legge il server dalla cartella d'appoggio.
Le correzioni fatte dopo la data del file importato restano nella copia di sicurezza, non nel database nuovo.

## Rigenerare il pacchetto

- `npm run pacchetto`: porta il pacchetto completo esistente alla versione corrente delle migrazioni e riscrive entrambi i file.
- `npm run pacchetto -- --da-istanza`: rifà il pacchetto dai dati di gioco dell'istanza locale (`DATA_DIR/gioco.db`). È una
  fotografia: ciò che l'istanza ha tolto resta tolto, il cestino non passa.
