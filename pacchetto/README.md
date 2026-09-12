# Pacchetto di gioco

Un solo file, `gioco.db`: i dati di gioco (compendio, guida, catalogo, mappe, luoghi), nessuna partita. Esiste in due stati:

| Dove | In git | Contenuto | Uso |
|---|---|---|---|
| `pacchetto/gioco.db` | sì (pochi MB) | schema e dati **senza** il contenuto delle immagini | copiato in `DATA_DIR/gioco.db` al primo avvio: l'interfaccia si apre subito; usato anche dai test (`caricaPacchetto`) |
| `pacchetto/completo/gioco.db` | **NO** (`.gitignore`, ~311 MB) | lo stesso **con le immagini dentro** (tabella `immagine`, colonna `contenuto`, migrazione 079) | **il caricamento iniziale completo avviene sempre dall'app**: Impostazioni → Pacchetto di gioco → «Importa un pacchetto» (anteprima, poi il file sostituisce quello dell'istanza sul volume; le partite non si toccano) |

Il file completo non sta su GitHub perché supera il limite di 100 MB (decisione dell'utente del 2026-09-12: niente LFS per
ora, si rivaluta quando il database sarà definitivo). Va conservato qui in locale e passato a mano a chi installa.

Rigenerare entrambi: `npm run pacchetto` (dal completo esistente, migrazioni alla versione corrente) oppure
`npm run pacchetto -- --da-istanza` (fotografia dei dati di gioco dell'istanza locale, `DATA_DIR/gioco.db`).
