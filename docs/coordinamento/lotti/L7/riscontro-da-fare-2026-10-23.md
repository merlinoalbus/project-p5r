# L7 e L6 — riscontro delle voci «da-fare»

Analisi dati, 2026-10-23, sola lettura. Incarico del PM: le «97 voci L7 da-fare» (escluse BON-06, BON-07, BON-08) e le «23 voci L6 da-fare residue». Per ogni voce:
già soddisfatta → chiusa con nota; serve una modifica di dati → valore corretto con la prova Royal; serve codice → scritto qui.

## 1. Esito in una riga

| Perimetro | Voci | Chiuse ora | Valore corretto con prova | Non decidibili | Serve codice |
|---|---:|---:|---:|---:|---|
| L7 `da-fare` senza le 3 voci BON | 97 | **2** (PROP-0001 e PROP-0017, già in vigore) | §5 (6 dati) | 2 voci (`AMBULANTE`, `SEMI`), più 9 proposte | nessuno nuovo (§7) |
| L6 `da-fare` | **0** | — | — | — | — |

- **L6**: nel piano non ci sono voci L6 `da-fare` (31 voci L6: 26 `chiuso-codice`, 5 `chiuso`). Le «23» sono le `L6-RIC-*`, già `chiuso-codice`: l'impronta della riga è cambiata e **i fatti di gioco restano da verificare**.
  Le ho riscontrate lo stesso, sui fatti, nel §6. Non ho toccato il loro stato.
- **Perimetro**: dei 100 `da-fare` di L7, 3 sono BON-06/07/08 (escluse). Delle 97 rimaste, **92 sono il contenuto di BON-07 e BON-08**: le 87 `L7-PROP-*` sono «le 87 proposte di abbinamento» di BON-07
  e le 5 `L7-TANAKA-*` sono il consenso di Tanaka che BON-08 toglie. Un agente lavora su quelle aree con la migrazione 142 in arrivo: **non ho chiuso nessuna di queste voci** (salvo le due già in vigore) e le ho
  riscontrate come controprova indipendente, senza scrivere sui dati. Le altre 5 (`SAKAI`, `AMBULANTE`, `MOTHMAN`, `CARTA-MEDIA`, `SEMI`) sono le identità che alimentano quelle proposte.

## 2. Dati, fonti e limiti

- **Dati**: copia di p5s `dati-p5s/p5s-2026-10-23-1935Z/` (gioco schema 138) nella scratchpad, in sola lettura; inventario `inventario-atomico-L7.json`. I riscontri valgono **prima** delle migrazioni nuove.
  Mentre lavoravo sono comparse nel repository le migrazioni 142–146 di BON-07/08: le ho lette a lavoro finito e le confronto nel §8.
- **Fonti Royal**: guida AllGameStaff letta il 23/10 (scambi con i venditori nascosti, Memento/Jose, negozi speciali, elenco dei negozi, oggetti, accessori, Palazzo di Sae) e il registro dell'Esperto (G-029, G-031, G-034).
  **Alcune letture sono riassunti del modello e non il testo integrale** (lo dichiaro dove pesa): `negozi-speciali` (Jose, Tanaka), e le pagine `oggetti` e `accessori` oltre una certa riga. Le conferme di Tanaka vengono anche da G-034 (Esperto, alta).
- **Limiti**: non ho verificato le 15 proposte con identità riservata (fuori da Git). Le categorie dei catalogo (consumabile, materiale, arma…) non sono tutte attestate dalla guida: dove non lo sono, scrivo «non decidibile».

## 3. Le 10 voci che non sono proposte

| Voce | Criterio | Riscontro | Esito |
|---|---|---|---|
| `L7-SAKAI` Risolvere identità offerte Sakai | fonte, costo, risultati e condizioni attestati | Finestre, oggetto dato e ricevuto: 16 su 16 uguali alla guida (riscontro delle 97 voci `NODO`). Restano 5 identità: Veste nera = materiale mutageno (la guida: «usabile per la Trasmutazione»), non `protezione/veste-nera`; La fattorizzazione = `libro/la-fattorizzazione` (G-034 punto 10), non `altro/…`; Razione militare = oggetto di recupero (consumabile); Crostatina angelo = oggetto per la rianimazione, venduto da Taisho Store d'inverno (finestra del Sakai 11–17/12: compatibile); Maschera del ladro = l'oggetto che Discount Rocinante vende dal 1/9 al 10/10 (finestra 19–24/9: compatibile), ma non è provato se sia l'accessorio o il «regalo»; Distintivo dell'angelo = accessorio (la guida lo dà come ricompensa del Sakai) | **Valore corretto** per Veste nera, La fattorizzazione, Razione militare, Crostatina angelo; **non decidibile**: Maschera del ladro e quale dei due `distintivo-dellangelo` |
| `L7-AMBULANTE` Separare varianti offerte Ambulante | nessuna fusione nominale | La guida elenca **10 articoli** (Portafortuna croce, Portafortuna teschio, Specchio del rimbotto…); il DB ne ha 13 (in più `portafortuna-a-croce`, `portafortuna-a-teschio`, `specchio-del-rimbalzo`). Prezzi, Fascino e orari sono uguali su tutti. Non si fonde per nome: serve sapere quale grafia è quella italiana del gioco | **Non decidibile** (Esperto) |
| `L7-MOTHMAN` Documentare soglia e premi alternativi | nessuna soglia dedotta dalla spunta | La fonte dice «Replica d'arma, poi Balsamo vitale dal 5° scambio»; la guida dice cinque scambi con Replica d'arma e **poi** Balsamo vitale («dopo cinque scambi»). La soglia è quindi il **6° scambio**, non il 5°. Lo stesso baratto è nella proposta PROP-0006 | **Valore corretto**: «Replica d'arma per cinque scambi, poi Balsamo vitale» (media: una sola pagina) |
| `L7-CARTA-MEDIA` Quantità non attestata | non sostituire NULL con una quantità inventata | La voce del Palazzo dice «Carta abilità Media.» senza numero. Il catalogo ha `carta-abilita/media`. Nessun collegamento oggi, quindi nessuna quantità inventata | **Già soddisfatta**; la quantità resta NULL quando BON-07 scrive PROP-0061. Non la chiudo: dipende da quella scrittura |
| `L7-SEMI` Identificare Tavola dei semi | nessuna promozione per solo nome | La guida di Niijima la chiama «oggetto saccheggiabile» (due occorrenze lette, Area riservata allo staff) e non dice che cosa si ottiene; il catalogo non ha un oggetto con quel nome | **Non decidibile**: nessuna corrispondenza di inventario provata, e non va promossa |
| `L7-TANAKA-TRANSAZIONE`, `-RICEVUTA`, `-RIPRISTINO`, `-IMPORT`, `-CONSENSO` | obblighi del flusso con consenso (CAS, ricevuta, ripristino, import/export, consenso) | Sono i cinque pezzi del flusso «decisione unitaria con consenso». BON-08 lo sostituisce con una migrazione diretta («vince il dato di Royal»): `ConfrontoTanaka` e `DecisioneTanaka` escono. Il registro creato dalla 141 è vuoto | **Superate da BON-08**: chiuderle quando la 142 è applicata. Nessun codice nuovo |

## 4. Le 87 proposte di abbinamento (controprova per BON-07 e BON-08)

Legenda: **Conferma** = la proposta è giusta secondo i dati e la guida; **Scarta** = l'alternativa va rifiutata; **Valore** = dato da correggere; **ND** = non decidibile con le fonti lette; **Riservata** = identità fuori da Git.

### 4.1 Già in vigore (chiuse)
| Proposta | Riga | Riscontro | Esito |
|---|---|---|---|
| 0001 | `friggitoria-hagoromo/katsu-a-pezzettoni` → `consumabile/katsu-a-pezzettoni` | l'articolo ha già quel catalogo; la guida: consumabile da 150 ¥, solo domenica sera | **Chiusa** |
| 0017 | `panetteria-yon-germain/sandwich-inzuppato` → `consumabile/sandwich-inzuppato` | l'articolo ha già quel catalogo; la guida: consumabile da 2.000 ¥, solo con la pioggia, un oggetto diverso dal «Sandwich» dei cibi | **Chiusa** |

### 4.2 Gachapon: sei baratti da creare (0002–0007)
La guida elenca gli stessi sei baratti della fonte. Gli articoli `gachapon-akihabara/scambio-*` non esistono ancora. **Conferma (crea)** per tutte e 6; la 0006 con la soglia del §3 (Mothman).

### 4.3 Sakai: costi e identità (0008–0016)
| Proposta | Candidato | Esito | Prova |
|---|---|---|---|
| 0008, 0009 | `accessorio/distintivo-dellangelo` e `…-2` (due righe dell'equipaggiamento) | **ND** su quale tenere: sono lo stesso accessorio | la guida: accessorio, ricompensa del Sakai; i due candidati sono doppioni |
| 0010 | Razione militare → `consumabile/razione-militare` | **Conferma** | oggetto di recupero nella guida |
| 0011 | Razione militare → `materiale/razione-militare` | **Scarta / fondi** con la 0010 | stessa voce, categoria del listino |
| 0012 | Crostatina angelo → `consumabile/crostatina-angelo` | **Conferma** | «oggetti per la rianimazione», Taisho Store, 1.800 ¥, d'inverno |
| 0013 | Crostatina angelo → `regalo/crostatina-angelo` | **Scarta / fondi** con la 0012 | stesso oggetto del listino Taisho |
| 0014, 0015 | Maschera del ladro → i due accessori dell'equipaggiamento | **ND** | la guida non dice se il costo sia l'accessorio |
| 0016 | Maschera del ladro → `regalo/maschera-del-ladro` (listino Rocinante) | **ND (media)**: è l'unico oggetto acquistabile nella finestra | Rocinante lo vende dal 1/9 al 10/10 |

### 4.4 Tanaka: piano 10+8 (0018–0045)
La guida (G-034, Esperto, alta; `negozi-speciali`) ha **18 articoli**: tutti i nomi e i prezzi coincidono con il piano. Non sono pronti da scrivere perché la migrazione è di BON-08, ma **tutte le 28 sono confermate**.
| Azione | Proposte | Riscontro |
|---|---|---|
| **Nascondi** (10) | 0018 Atom Match, 0021 Black Stone, 0022 Condenser Lens, 0024 Dispel Ring, 0028 Hercules Anklet, 0029 Heros Eyepatch, 0038 Magic Rosary, 0041 Nirvana Ring, 0043 Retribution Mirror, 0044 Roland Medal | **Conferma**: nessuno è nella guida di Royal |
| **Crea** (8) | 0026 Fotocamera spirituale 5.000; 0033 Magatama ciclonico, 0034 del gelo, 0035 divino, 0036 elettrico, 0037 esplosivo (6.000 ciascuno); 0039 Maschera sorridente 5.000; 0045 Spec. spirit. oscuro 5.000 | **Conferma** |
| **Collega** (10) | 0019 Black Kogatana → Kogatana nera 1.000; 0020 Black Robe → Veste nera 500; 0023 Crown of Salvation → Corona della salvezza 990.000; 0025 Five-Inch Nail → Chiodo ossidato (la guida 5.000, il DB 2.000: **Valore** 5.000); 0027 Gemme elementali → Magatama infernale 6.000; 0030 Holy Cloth → Sacra Sindone 10.000; 0031 Homunculus → Homunculus (**Valore** 5.000, non 120.000); 0032 Inspired Hand Mirror → Spec. senso spirit. 5.000; 0040 Model Gun → Replica d'arma 1.000; 0042 Ouija Board → Tavola Ouija 10.000 | **Conferma** (prezzi del DB uguali alla guida tranne 0025 e 0031) |

### 4.5 Contenuti dei forzieri (voci dei Palazzi, 0051–0087, escluse le riservate)
| Proposte | Riga | Esito | Prova |
|---|---|---|---|
| 0051, 0055, 0063, 0074, 0076, 0080, 0084, 0086 | Catena di perline → `consumabile/catena-di-perline` | **Conferma** (8) | la guida: oggetto per il recupero HP, forzieri nei Palazzi e nei Dedali, venduto anche nel Palazzo di Niijima |
| 0052, 0056, 0064, 0075, 0077, 0081, 0085, 0087 | Catena di perline → `arma/catena-di-perline` | **Scarta** (8) | è la stessa Catena di perline, con la categoria del listino |
| 0053 | Veste nera (Futaba) → `materiale/veste-nera` | **Conferma (media)** | il mutageno per la Trasmutazione, come per Jose e il Sakai |
| 0054 | Veste nera → `protezione/veste-nera` | **Scarta (media)** | stessa ragione |
| 0078, 0079, 0082, 0083 | Kogatana nera (Niijima, Shido) → `materiale/…` e `arma/…` | **ND** | la guida non dice se esista una Kogatana nera come arma |
| 0058 | Kamoshida, seme della bramosia → `chiave/recupero-2-seme-della-bramosia` | **Conferma** | catalogo presente, certa |
| 0060 | Madarame → Perlina rigenerante | **Conferma** | la guida: oggetto per la rianimazione (50% HP), forzieri a Madarame |
| 0061 | Madarame → Carta abilità Media | **Conferma, quantità NULL** | la voce dice «Carta abilità Media.» senza numero |
| 0062 | Madarame → Yuibitachi | **Conferma** | catalogo presente, certa |
| 0065 | Madarame → Fiala delle vertigini S ×3 | **Conferma** | catalogo presente; la quantità 3 è nella voce |

### 4.6 Identità riservata (15)
0046, 0047, 0048 (catalogo), 0049, 0050 (ricompensa), 0057, 0059, 0066–0073 (voci): **Riservata**. Le 10 «certe» fra queste (0057, 0059, 0066–0073) restano alla migrazione delle certe di BON-07; non le ho viste.

### 4.7 Conteggio
87 proposte: **2 chiuse** (0001, 0017); **conferme** 6 (Gachapon) + 28 (Tanaka) + 8 (Catena) + 0053 + 0058 + 0060 + 0061 + 0062 + 0065 + 0010 + 0012 = **50**; **scarte** 8 (arma) + 0054 + 0011 + 0013 = **11**; **non decidibili** 0008, 0009, 0014, 0015, 0016, 0078, 0079, 0082, 0083 = **9**; **riservate** 15. Totale 2 + 50 + 11 + 9 + 15 = 87.

## 5. Valori da correggere (in sintesi, con la prova)

| Dato | Oggi | Valore corretto | Prova |
|---|---|---|---|
| Five-Inch Nail (Tanaka) | 2.000 ¥ | Chiodo ossidato 5.000 ¥ | G-034, guida di Tanaka |
| Homunculus (Tanaka) | 120.000 ¥ | 5.000 ¥ | G-034 punto 2 |
| Sakai: risultato della finestra 26/6–2/7 | `protezione/veste-nera` | `materiale/veste-nera` | la guida: usabile per la Trasmutazione |
| Sakai: La fattorizzazione | `altro/la-fattorizzazione` | `libro/la-fattorizzazione` | G-034 punto 10 |
| Sakai: costi Razione militare e Crostatina angelo | vuoti | `consumabile/razione-militare` e `consumabile/crostatina-angelo` | §4.3 |
| Mothman | «dal 5° scambio» | cinque scambi con Replica d'arma, poi Balsamo vitale (dal 6°) | guida degli scambi, media |

## 6. L6: le 23 voci `L6-RIC` (già `chiuso-codice`; riscontro dei fatti di gioco)

Valori correnti letti nella copia; confronto con le decisioni registrate (L6 §8b, L5 §10, G-018, G-029, G-031) e con la guida.

| Voce | Dato corrente | Esito |
|---|---|---|
| luogo Destinyland (Maihama) | `almeno-una[lettura{parchi-divertimento}, data{10-11}]` | **Coincide** con L6 §8b; la data 10-11 resta a certezza media (G-018) |
| luogo Cancello Shujin | nessuna condizione; la frase dice «Confidente attivo dal 26 luglio» | **Coincide**: il cancello non si chiude con i fatti di Makoto |
| luogo Bancarella di Chihaya | nessuna condizione | **Coincide**: nessuna chiusura della strada |
| luogo negozio di Jose | `richiesta{un-ex-piuttosto-appiccicoso}` | **Coincide** con G-029/G-031 |
| luogo Okumura Foods | `data{09-15}`, nessun «al» | **Coincide** con G-031 |
| luogo Sala giochi di Akihabara | nessuna condizione | **Coincide**: il blocco di Shinya e della Richiesta non è applicato alla sede |
| 8 negozi di Shibuya (37 Gradi, Prossimo Asso, Rafflesia, Big Bang Burger, Taiheido, Rocinante, Aohige, Triple Seven) | condizioni vuote; la frase dice «dal 18 aprile» | **Coincide** per le condizioni: nessuna DATA 04-18 propria. **Nota**: la guida non dà nessuna data di apertura dei negozi (solo date per singolo oggetto), quindi la frase «Disponibile dal 18 aprile» non è un dato Royal: il negozio si apre col quartiere |
| negozi Akindo, Tokobushiya, Akiba | condizioni vuote; frasi «dal 2 settembre», «dal primo settembre» | **Coincide** per le condizioni. **Valore**: le frasi non sono nella guida (nessuna data di apertura dei negozi, solo «1° ottobre» per il Set di strumenti da PC di Akiba): vanno tolte o tenute come nota, il quartiere apre il 31/8 |
| attività Sfida pesca Guardiano di Ichigaya | nessuno sblocco, nessuna condizione | **ND**: la voce è una ricerca aperta (esche, comparsa, cattura, soglie) |
| attività Sfida Big Bang Burger | i tre articoli hanno soglie distinte (Rango 2, 3, 4 di Coraggio, Conoscenza e Perizia) | **Coincide** per le soglie sugli articoli; la progressione fra le sfide non è attestata nelle letture fatte (**ND**) |
| articoli Sakai: Elisir del padre, Frusta decorativa | finestre e costo in `costo_json`, separati dalla condizione | **Coincide** (l'effetto è un altro rilievo: «Diverso» nel riscontro delle voci `NODO`) |
| articolo Sakai: Veste nera | finestra 26/6–2/7, costo Panino con yakisoba | finestra e costo **coincidono**; l'identità del risultato è BON-07 (§3) |
| articolo Succo Aojiru del chiosco KiyasuKu | solo `giorno-settimana{domenica}` | **Coincide**: nessun calendario assoluto né conferma automatica |

## 7. Modifiche di dati e codice

- **Dati** (tutte di BON-07/08, non scritte da me): i valori del §5 e le scelte del §4; la migrazione 142 dovrebbe anche togliere dai negozi le frasi «Disponibile dal 18 aprile» (Shibuya) e «dal 2 settembre» / «dal primo settembre» (Akihabara) o tenerle come nota (§6).
- **Codice**: nessuno nuovo. Le cinque voci `L7-TANAKA-*` descrivono il flusso con consenso che BON-08 rimuove; non vanno implementate.
- **Chiusura in `stato.json`**: fatta a mano per `L7-PROP-0001` e `L7-PROP-0017`. Le altre restano `da-fare`.

## 8. Confronto con le migrazioni 142–146 (comparse durante il lavoro; lette, non applicate alla mia copia)

BON-07 e BON-08 hanno scritto nel frattempo le migrazioni 142 (Tanaka), 144 (abbinamenti), 146 (correzioni Royal) e 143 (residui L5). Le ho lette dopo aver finito i riscontri.
**Concordano con i miei verdetti**, salvo i punti seguenti.

| Punto | Mio verdetto | Migrazioni 142–146 | Esito del confronto |
|---|---|---|---|
| Tanaka, 28 proposte e prezzi (Chiodo ossidato 5.000, Homunculus 5.000) | conferma tutte | la 142 applica il piano 10+8 con quei valori | **Concordo** |
| Catena di perline (8 consumabili, 8 armi scartate), Veste nera dei forzieri, Razione militare, Crostatina angelo, Gachapon, Sandwich, Katsu, semi, Perlina, Yuibitachi, Fiala ×3 | conferma / scarta come in §4 | la 144 conferma le stesse scelte | **Concordo** |
| Kogatana nera nei forzieri di Niijima e Shido (0078, 0079, 0082, 0083) | non decidibile | la 144 le risolve come `materiale/kogatana-nera` (mutageno) | **Concordo** (Jose, Sakai e Tanaka la danno come mutageno; certezza media). Il mio «non decidibile» cade |
| Tre varianti del Venditore ambulante | non decidibile (quale grafia) | la 144 fonde sulle grafie della guida (Portafortuna croce, Portafortuna teschio, Specchio del rimbotto) e nasconde i tre duplicati | **Concordo**: la grafia italiana è quella della guida. Il mio «non decidibile» cade |
| Distintivo dell'angelo e Maschera del ladro del Sakai | non decidibili | la 144 le lascia all'utente (5 proposte) | **Concordo** |
| Effetti di Frusta decorativa ed Elisir del padre, nota della riga Nirvana | valore corretto (§5) | la 146 li scrive | **Concordo** |
| **Carta abilità Media** (`madarame-06-sala-del-tesoro-atrio/4`) | quantità NULL: la voce dice «Carta abilità Media.» senza numero | la 144 scrive **quantità 1** («una carta, testo della voce») | **Conflitto da decidere**: il criterio di `L7-CARTA-MEDIA` dice «non sostituire NULL con una quantità inventata». Nel gioco la ricompensa è verosimilmente una carta, ma il numero non è attestato: serve la decisione del PM, oppure la prova del numero |

**Non coperti dalle migrazioni 142–146** (restano da fare):
- il risultato del Sakai della finestra 26/6–2/7: `protezione/veste-nera` → `materiale/veste-nera`;
- il risultato del Sakai della finestra 26/7–30/7: `altro/la-fattorizzazione` → `libro/la-fattorizzazione`;
- la soglia di Mothman: cinque scambi con Replica d'arma, poi Balsamo vitale (dal 6°), nel nuovo articolo della 144;
- le frasi «Disponibile dal 18 aprile» (8 negozi di Shibuya) e «dal 2 settembre» / «dal primo settembre» (Akindo, Tokobushiya, Akiba), che la guida non conferma (§6).
