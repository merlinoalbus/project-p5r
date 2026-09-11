# Analisi: che cosa è confuso in mappe, negozi, oggetti, effetti e stati

Data: 2026-09-11. Fatti misurati sul DB locale (`data/project-p5r.db`) e sul codice di `main`.
Nessuna modifica al codice in questo documento: è la diagnosi, e in fondo la proposta.

---

## 1. Collegamento fra mappe — quattro modi per dire «da qui si va là»

Uno spillo può portare a un'altra mappa in **quattro** modi, che convivono nello stesso modulo:

| meccanismo | dove sta | quanti | che cosa dice |
|---|---|---|---|
| A. `riferimento` di tipo `mappa` | `spillo.riferimento_tipo='mappa'` | **153** | «questo spillo è la mappa X» (senza dire dove si arriva) |
| B. `destinazione` | `spillo_destinazione` (mappa + x, y, zoom) | **40** | «da qui si arriva nel punto (x,y) della mappa X» |
| C. `riferimento` di tipo `luogo` → planimetria | `luogo` → `mappa_entita` / `mappa.entita` | 3 luoghi | «questo spillo è un luogo, e quel luogo ha una sua pianta» |
| D. gerarchia `genitore`/`figli` + spillo `passaggio` | `mappa.genitore_chiave` + «Crea mappa collegata» | — | «questa mappa sta dentro quella» |

**A e B non si sovrappongono mai** (0 spilli li hanno entrambi) — ma il modulo li presenta **entrambi, sempre, per ogni spillo**, come se fossero indipendenti. Nella scheda dello spillo si vede:

```
Riferimento                       ← A  (ricerca «Altra mappa», Togli, Apri)
  [select tipo] [Nome, area o quartiere…] [Cerca]
☐ Posizione del luogo (non indica un'attività disponibile)
Mappa e punto di arrivo           ← B  (select su TUTTE le 323 mappe + click sull'immagine + zoom)
  Mappa di arrivo: [Nessuna destinazione ▾]
Condizioni
```

Chi usa l'editor deve capire da solo che:
- per un `passaggio` serve **A** (il riferimento) — è quello che `destinazioneMappaSpillo` usa come ripiego (`src/utils/navigazioneMappa.ts:14`);
- **B** vince su A se c'è (`navigazioneMappa.ts:13`), ma nessuno lo dice;
- «Posizione del luogo» **annulla entrambi** (`navigazioneMappa.ts:11`), ed è una checkbox messa fra i due senza che il testo lo dica;
- «Apri» compare solo se il riferimento è di tipo `mappa`; per un `luogo` con planimetria (C) non c'è nessun «Apri»: la pianta si raggiunge solo dal visore.

Il selettore di B elenca **tutte le 323 mappe** in un `<select>` piatto (`DestinazioneSpilloEditor.tsx:22`), Palazzi e Mementos compresi, per scegliere l'arrivo di un passaggio che quasi sempre è la mappa figlia o la mappa genitore.

Le etichette confondono: «Riferimento» non dice che cosa fa; «Altra mappa» come tipo di riferimento sta accanto a «Negozio», «Luogo», «Punto» — un passaggio e un negozio hanno lo stesso modulo.

**Verdetto:** il dato è sano (nessun conflitto A/B, gerarchia consistente). È il **modulo** che espone quattro modelli insieme invece di chiedere una cosa sola: *«dove porta?»*.

## 2. Negozi — tre entità per un negozio

Un negozio esiste in tre tabelle e in due vocabolari di tipi:

| entità | righe | tipo | che cosa è |
|---|---|---|---|
| `luogo` con `tipo='negozio'` | 31 | vocabolario della guida città (9 tipi) | un posto sulla mappa della città |
| `negozio` | 61 | vocabolario dei negozi (9 tipi: cibo, regali, oggetti…) | un listino |
| spillo `negozio` | 50 | riferimento **dichiarato** `negozio` (`shared/spilli.ts:84`) | il pin |

E i legami sono a metà:
- `luogo.negozio` → `negozio.chiave`: **39** luoghi hanno il listino, ma 31 sono `tipo='negozio'` — quindi 8 listini stanno su luoghi di tipo `attivita`/`servizio`/altro, e **2 luoghi di tipo negozio non hanno listino**;
- `negozio.luogo_chiave` è la relazione **inversa** ridondante, con **4 negozi senza luogo**;
- i 50 spilli `negozio` **non usano mai** il riferimento `negozio` che la definizione dichiara: 36 puntano a un `luogo`, 14 a niente. Il visore li risolve con `luogo.negozio` (`mappeService.ts:159`), quindi funziona — ma la definizione dice una cosa e i dati un'altra;
- `negozio.tipo` ha 9 valori fissi in un enum: i tipi aggiuntivi che hai chiesto non sono un dato ma codice.

**Verdetto:** «negozio» oggi è *un luogo della città* + *un listino separato* + *un pin*, con due chiavi esterne una contro l'altra. Va scelto un verso: **il listino è una proprietà del luogo**, non un'entità parallela.

## 3. Oggetti — cinque archivi e 575 articoli «a mano»

`tuttiGliOggettiSelezionabili()` unisce **cinque fonti**: `equipaggiamento` (tabella `oggetto`, 223 righe: Weapon/Gun/Protector/Accessory), `guida`, `libri`, `film`, `videogiochi`. L'articolo di negozio dovrebbe **collegarsi** a uno di questi (migrazione 058).

Misurato: su 579 articoli, **575 sono «a mano»** e 4 collegati (1 equipaggiamento, 2 guida, 1 libri). Cioè: il collegamento c'è ma i dati non lo usano — ogni Pistola Tkachev venduta da Untouchable è una riga `articolo` con nome/categoria/prezzo copiati, e non punta all'arma nella tabella `oggetto`.

Conseguenze:
- lo stesso oggetto comprato in due negozi sono due righe scollegate;
- «quanto ne ho» (`quantita`, inventario) non ha un oggetto a cui appartenere;
- le statistiche (`articolo.statistiche`, 199 righe di prosa) duplicano ciò che `oggetto` sa già per le armi.

**Verdetto:** il modello giusto c'è (articolo → oggetto), ma la migrazione non ha **agganciato i dati esistenti**: ha aggiunto le colonne e le ha lasciate vuote.

## 4. Effetti — la struttura c'è, i dati sono ancora prosa

| tabella | prosa | strutturato (`effetto_json`) |
|---|---|---|
| `libro` | 24 (`sblocca`) | **23** ✔ |
| `articolo` | **434** (`effetto`) | **0** |

Le 14 famiglie di `shared/effettiOggetto.ts` sono state ricavate misurando **523 frasi** degli articoli — e poi applicate **solo ai libri**. Nel modulo articolo l'editor parametrico esiste, ma i 434 effetti reali restano stringhe che nessuna logica legge. Stessa cosa di prima: struttura nuova, dati vecchi.

E nessuno **consuma** `effetto_json`: leggere «Esplorando Yoncha 4» non sblocca Yongen-Jaya nella mappa; comprare un oggetto con `sblocca-funzione` non cambia niente. Gli effetti sono dichiarazioni inerti.

## 5. Stati — un vocabolario unico, uno stato sparso

Le condizioni (`shared/condizioniSpillo.ts`) hanno **19 tipi**. Quelli che l'app può davvero valutare leggono queste tabelle per partita:

- data / fascia / meteo / stagione → `partita`
- `squadra` → `membro_squadra_partita.in_squadra`
- `confidente`, `dote`, `palazzo`, `richiesta`, `lettura`, `articolo` → le rispettive `*_partita`

Poi ci sono `stato` (chiave + confronto + valore) e `da-configurare` (nota): il primo è un contenitore generico senza catalogo di chiavi — quello che avevi definito «incomprensibile e inusabile» — il secondo è prosa dichiarata. `stato` è stato tolto dall'editor (0 righe), ma il tipo esiste ancora nel dominio e il valutatore lo gestisce.

Il problema di fondo: **le condizioni sono lo stesso vocabolario per spilli, articoli, negozi, libri, film, attività** (giusto), ma **lo stato che le rende vere è sparso**: un pezzo in `partita`, un pezzo in sei tabelle `*_partita`, e gli effetti (§4) che dovrebbero *produrre* stato non scrivono da nessuna parte.

---

## Proposta — un verso solo per ogni cosa

Ordine di intervento, dal più urgente. Ogni punto è un lotto con PR sua, validato prima del successivo.

### P1. Scheda spillo: una domanda, «dove porta?»
Sostituire «Riferimento» + «Posizione del luogo» + «Mappa e punto di arrivo» con un blocco unico governato dal **tipo** dello spillo:
- tipi di **passaggio** (`passaggio`, `scala`, `uscita`, `treno`): un solo campo **«Porta a»** che propone prima figli, genitore e fratelli, poi la ricerca; il punto di arrivo si sceglie *dopo*, sulla mappa scelta, ed è facoltativo (arrivo al centro se manca). A e B diventano una cosa sola: `riferimento=mappa` + `destinazione` scritti insieme.
- tipi di **luogo** (`negozio`, `ristorante`, `casa`, …): un solo campo **«È il luogo»**, con «Apri la pianta» se il luogo ne ha una (C). «Posizione del luogo» diventa la scelta esplicita «segna solo dove sta / porta dentro».
- tipi **collezionabili**: «È il punto» della guida.
- `dialogo`, `nota`, `rampino`, `velluto`: niente da collegare, il blocco non compare.
Il selettore piatto da 323 voci sparisce.

### P2. Negozio = listino del luogo
`negozio.luogo_chiave` resta l'unico legame (via la colonna inversa `luogo.negozio`); i 4 negozi senza luogo ricevono il loro luogo o vengono nascosti; i 50 spilli `negozio` restano riferiti al **luogo** e `shared/spilli.ts` dichiara `luogo` invece di `negozio`. I tipi di negozio diventano una **tabella** (`tipo_negozio`) con interfaccia, così ne aggiungi senza toccare codice.

### P3. Articoli agganciati agli oggetti
Migrazione che collega i 575 articoli «a mano» all'oggetto omonimo dove esiste (armi/armature/accessori → `oggetto`; libri/film/giochi → le loro tabelle), lasciando «a mano» solo i generici. Con report di quanti restano scollegati e perché.

### P4. Effetti degli articoli convertiti come i libri
Stesse regole di 061/062/063 applicate ai 434 `articolo.effetto`, con la stessa cautela (regole che chiedono «la frase parla di questo?», non «contiene la parola?»). Poi, in un lotto separato da concordare: **effetti che agiscono** (leggere → sblocca il luogo; comprare → inventario).

### P5. Stati: catalogo chiuso
Rimuovere dal dominio il tipo `stato` generico e `da-configurare`, oppure dare a `stato` un catalogo di chiavi (`shared/statiPartita.ts`) come fatto per gli effetti. Coerente con «niente campi liberi».
