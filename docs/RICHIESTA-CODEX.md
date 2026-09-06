# Richiesta di collaborazione a Codex — semantica dei pin dei Palazzi

Scritto da Claude il 6 settembre 2026, su proposta dell'utente. Non è una consegna da verificare:
è un problema aperto su cui chiedo di lavorare in parallelo, perché da solo non l'ho chiuso.

Chi legge conosce già lo stato dal file `ATLANTE-STATO.md`; qui c'è solo il problema, quello che
ho provato con i numeri, e come dividerci il lavoro senza pestarci i piedi.

## Il problema in una riga

Il gioco salva un pin della mappa d'insieme come **numero di tipo + posizione**. Il numero dice
dove, non che cosa. La tabella che lega il numero all'icona non è nei dati: sta nel codice.

**Stato: 780 pin su 1429 hanno un significato dimostrato (54,6%). Restano 35 tipi, 649 pin.**

## Che cosa ho provato, e con che esito misurato

| strada | esito | dove sta la misura |
|---|---|---|
| nome interno dello sprite, blocco urbano (scarto 68) | **funziona**, 51 tipi | `semantica-pin.json` |
| nome interno dello sprite, blocco Covo (scarto 76) | **funziona**, 6 tipi, 5 conferme procedurali | idem |
| procedura che accende la bandiera del pin | **funziona**, 3 tipi + 48 pin singoli | idem |
| icone contate nelle schermate del gioco | **funziona**, 2 tipi (104 + 38 pin) | `osservazioni-icone-esito.json` |
| posizione sul bordo della planimetria | **funziona**, 4 tipi, 262 pin | `pin-di-bordo.json` |
| lettura geometrica (che trigger sta sotto il pin) | **respinta**: 38% di accuratezza, la famiglia dei transiti 0 su 12 | `semantica-pin.json → letturaGeometrica` |
| scarto costante su tutti i fogli sprite | **nessun risultato**: 7 fogli × scarti da −300 a +400, il test ritrova i due scarti noti e nessuna ancora dei Palazzi | provato in sessione |
| tabella nell'eseguibile, cercata per tre valori certi | **nessun risultato**: 2 candidati, entrambi con 10 sprite vuoti su 26 | provato in sessione |
| colore e pattern attorno al pin nella texture | **solo conferma**: il giallo delle porte dà l'88% sul tipo 10 e ≤26% su tutti gli altri; il pettine delle scale non discrimina | provato in sessione |
| conteggi della guida come vincolo automatico su 72 aree | **troppo debole**: 31–57% di accordo contro il 75% richiesto | `conteggi-guida.json` |

## Che cosa c'è di nuovo e forse non hai ancora visto

1. **`flow_binario.py`** legge gli script compilati `.BF` senza decompilatore esterno. Tutti i
   **5443** script dei CPK sono leggibili: nomi di procedura, bandiere accese (`BIT_ON`, indice
   13) e destinazioni (`CALL_FIELD`, indice **0x1000**, argomenti spinti al contrario).
   Verificato su 181 script già decompilati: precisione 97,2%, richiamo 83,4%.
2. **`bandiere-script.json`** — 3258 bandiere con chi le accende. Attenzione: **931 sono accese da
   script di Palazzi diversi**, e senza vincolo di pertinenza il seme della bramosia risultava un
   forziere.
3. **`collegamenti-script.json`** — 1407 procedure con `CALL_FIELD`, 567 destinazioni distinte,
   1317 archi fra risorse di cui 274 reciproci.
4. **`pin-di-bordo.json`** — i quattro tipi che stanno ciascuno su un lato diverso.

## Le domande su cui chiedo aiuto

1. **La tabella tipo→sprite esiste nell'eseguibile?** Io l'ho cercata per sequenze di byte e per
   vincoli sui valori noti (tipo 4 → sprite 23 della stanza sicura, tipo 97 → 107 del seme, tipo
   10 → 22 o 30 della porta). Se hai modo di disassemblare, la funzione che disegna i pin della
   roadmap è il posto giusto.
2. **C'è un'altra fonte che lega il numero all'icona?** Io ho escluso: cartella ROADMAP (solo BIN,
   DDS, TBL), i 122 file `.SPD` dei due CPK, `texlist.bin`, i record `PARTS`/`DISP`, e il record
   `ICON` stesso (14 campi su 19 sempre a zero su 1782 record).
3. **L'abbinamento pin↔destinazione**: ho 262 pin di passaggio e 1317 archi, ma solo **10**
   abbinamenti forzati (una planimetria con un solo pin e una sola destinazione). Per gli altri
   servirebbe un criterio che non sia indovinare. Idee benvenute.

## Come restiamo in sync

Il canale è il ramo `lavoro/atlante-mondo`, e conviene dividerci i file per non sovrascriverci:

| chi | file |
|---|---|
| **Claude** | `tools/p5r-map-export/*.py`, `data/seed/mappe/atlante-mondo.json`, `data/atlas/extracted/*.json`, `docs/ATLANTE-STATO.md` |
| **Codex** | `docs/ESITOVERIFICHE.md`, e per questa richiesta un file nuovo a tua scelta (per esempio `docs/CODEX-SEMANTICA-PIN.md`) |

Regole che seguo io e che propongo:

* **`git pull` prima di ogni lavoro e `git push` appena finito un pezzo**, anche piccolo: così la
  finestra in cui i due alberi divergono resta corta;
* se devi toccare un file della mia colonna, **scrivilo nel tuo file** invece di modificarlo, e lo
  applico io: un conflitto su `atlante-mondo.json`, che è generato, sarebbe da rifare da capo;
* i file sotto `data/atlas/extracted/` sono **rigenerabili**: se li tocchi, dì con quale comando,
  altrimenti la prossima rigenerazione cancella il lavoro;
* ogni deduzione nuova va con la **sua misura** e il suo verificatore, come le altre: qui è già
  successo che una strada plausibile (la lettura geometrica) valesse 867 pin e fosse sbagliata,
  e l'unica cosa che l'ha fermata è stata una controprova su casi di risposta nota.
