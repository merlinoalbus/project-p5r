# Prompt per la generazione degli asset grafici — stile Persona 5 Royal

Le regole comuni e i prompt degli asset dell'app, per generarli o rigenerarli. La numerazione delle sezioni è stabile e condivisa
con `archivio-grafico.md`, che tiene le sezioni degli asset consegnati da tempo (per esempio §10, Persona del compendio, con la regola
dei nomi dei file); i riferimenti di stile sono in `riferimenti-visivi.md`.

Regole valide per TUTTI gli asset:
- **Originali, ispirati allo stile**: nessuna copia delle illustrazioni ufficiali Atlus; i link servono all'IA grafica (o a chi la guida) come ispirazione di stile, palette e composizione.
- **Ogni testo dentro l'immagine è in italiano** (nomi degli Arcani, etichette, sigle). **Per OGNI asset che contiene testo esiste la variante senza testo** con suffisso `-senza-testo` (es. `arcani/fool-senza-testo.png`): se il generatore sbaglia le lettere, consegna quella e il testo lo sovrappone l'app con il proprio font. Le sole parole non italiane ammesse dentro le immagini sono le sigle `P5R`, `DLC` e l'abbreviazione `MAX`.
- Nota sui Confidenti (§9): per scelta dell'utente i ritratti sono generati da IA "ispirati" ai personaggi del gioco (aspetto descritto a parole, link alla fonte come ispirazione), non copie delle illustrazioni ufficiali.
- Consegna in `public/asset/<categoria>/<nome-file>` con i nomi indicati; PNG con trasparenza dove richiesto, altrimenti WEBP/PNG. Le dimensioni sono quelle di consegna: genera più grande e ridimensiona. **Basta copiare i file**: il manifest (`/asset/manifest.json`) è generato automaticamente dal plugin Vite (`vite/assetPredefiniti.ts`, chiave = percorso senza estensione in slug), l'app li usa come grafica predefinita (preferenza in Impostazioni, attiva di default) e resta perfettamente funzionante se un file manca. Vedi `public/asset/README.md`.
- Palette dell'app (`src/tailwind.css`): nero `#0b0b0e`, superficie `#23232d`, rosso `#e5352b`, bianco `#ececf1`, grigio `#6f6f80`. Colori degli elementi: Fisico `#c9a227`, Arma da fuoco `#8f8f9a`, Fuoco `#f0552b`, Ghiaccio `#5ec8f2`, Elettricità `#f2d94e`, Vento `#5fd67a`, Psichico `#e06bd6`, Nucleare `#4dd7c9`, Sacro `#f5f0c8`, Oscurità `#a05cf0`, Quasi-divino `#ffffff`, Guarigione `#7fe0a5`, Alterazione `#d9a066`, Supporto `#8ab4f8`, Passiva `#b0b0c0`.

## 0. Blocco di stile comune (da anteporre a ogni prompt)

```
Stile grafico ispirato all'interfaccia di Persona 5 Royal (Atlus): estetica "pop punk" e anarchica, palette
dominata da rosso acceso (#e5352b), nero profondo (#0b0b0e) e bianco, forme irregolari con angoli tagliati in
diagonale, silhouette piatte ad alto contrasto, retini a punti (halftone) e texture da stampa, lettering
sbilenco simile a ritagli di giornale, stelle e schizzi come accenti. Illustrazione vettoriale pulita, bordi
netti, nessuna sfumatura fotorealistica, nessun rumore. Riferimenti di stile: menu di battaglia
https://static.wikia.nocookie.net/megamitensei/images/3/34/Persona_5_menu.png/revision/latest?cb=20161221113959 ,
principi dichiarati dall'art director https://personacentral.com/persona-5-panel-concept-development-ui/ ,
HUD ufficiale https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1687950/ss_ed4f15d50417a60b5d4b712c8eb0ea1d8ba876bc.1920x1080.jpg
```

Prompt negativo comune:
```
fotorealismo, 3D render, sfumature morbide, testo inglese, testo giapponese, loghi ufficiali Atlus/Sega,
personaggi copiati dal gioco, watermark, firma, bordi sfocati, colori pastello, rumore, JPEG artifacts
```

## 14. Personaggi non Confidenti (5) — `personaggi/<chiave>.png` (768×1024, trasparente) — richiesti il 2026-09-04
Stesse regole e stile dei ritratti «fedeli» dei Confidenti (§9, variante `-fedele`): mezzo busto, sfondo trasparente, nessun testo.
Chiavi cablate in Guida → Personaggi (cast) e Guida → Sfide (boss segreti).
| File | Personaggio | Descrizione per il prompt |
|---|---|---|
| `joker.png` | Protagonista (Joker) | studente con capelli neri arruffati e occhiali, uniforme della Shujin; sguardo sereno; in alternativa la maschera bianca da ladro fantasma |
| `caroline.png` | Caroline | gemella custode della Stanza di Velluto con divisa blu e cappello, benda sull'occhio sinistro, manganello, espressione severa |
| `justine.png` | Justine | gemella custode con divisa blu e cappello, benda sull'occhio destro, cartella con appunti, espressione calma |
| `jose.png` | Jose | bambino misterioso dei Mementos con tuta bianca, cappello e piccola auto giocattolo |
| `lavenza.png` | Lavenza | assistente della Stanza di Velluto con abito blu, lunghi capelli biondi e il grande libro dei Compendi |

## 15. Persona dei personaggi giocabili (27) — `persona-gruppo/<slug>.png` (768×768, trasparente) — richieste il 2026-09-04
Stile identico alle Persona del compendio (§10): figura intera o mezzo busto su fondo trasparente, palette del gioco, nessun testo. Arsène e
Satanael usano già gli asset del compendio (`persona/arsene.png`, `persona/satanael.png`) e non vanno rifatti. L'app li mostra nella scheda
del personaggio (Guida → Personaggi): striscia con la Persona iniziale e le evoluzioni, click per vederne una in grande.
| File | Persona | Personaggio e fase |
|---|---|---|
| `captain-kidd.png` | Captain Kidd | Ryuji Sakamoto — iniziale |
| `seiten-taisei.png` | Seiten Taisei | Ryuji Sakamoto — seconda forma (risveglio) |
| `william.png` | William | Ryuji Sakamoto — terza forma (Royal) |
| `carmen.png` | Carmen | Ann Takamaki — iniziale |
| `ecate.png` | Ecate | Ann Takamaki — seconda forma (risveglio) |
| `celestine.png` | Célestine | Ann Takamaki — terza forma (Royal) |
| `zorro.png` | Zorro | Morgana — iniziale |
| `mercurio.png` | Mercurio | Morgana — seconda forma (risveglio) |
| `diego.png` | Diego | Morgana — terza forma (Royal) |
| `goemon.png` | Goemon | Yusuke Kitagawa — iniziale |
| `kamu-susano-o.png` | Kamu Susano-o | Yusuke Kitagawa — seconda forma (risveglio) |
| `gorokichi.png` | Gorokichi | Yusuke Kitagawa — terza forma (Royal) |
| `ioanna.png` | Ioanna | Makoto Niijima — iniziale |
| `anat.png` | Anat | Makoto Niijima — seconda forma (risveglio) |
| `agnes.png` | Agnes | Makoto Niijima — terza forma (Royal) |
| `necronomicon.png` | Necronomicon | Futaba Sakura — iniziale |
| `prometeo.png` | Prometeo | Futaba Sakura — seconda forma (risveglio) |
| `al-azif.png` | Al Azif | Futaba Sakura — terza forma (Royal) |
| `milady.png` | Milady | Haru Okumura — iniziale |
| `astarte.png` | Astarte | Haru Okumura — seconda forma (risveglio) |
| `lucy.png` | Lucy | Haru Okumura — terza forma (Royal) |
| `robin-hood.png` | Robin Hood | Goro Akechi — iniziale |
| `loki.png` | Loki | Goro Akechi — seconda forma (risveglio) |
| `ervardo.png` | Ervardo | Goro Akechi — terza forma (Royal) |
| `cenerentola.png` | Cenerentola | Kasumi Yoshizawa — iniziale |
| `vanadis.png` | Vanadis | Kasumi Yoshizawa — seconda forma (risveglio) |
| `ella.png` | Ella | Kasumi Yoshizawa — terza forma (Royal) |

## 16. Icone delle schede della Partita e della Fusione (18) — `ui/scheda-<chiave>.png` (128×128, trasparente) — richieste il 2026-09-04
Stile delle icone di navigazione §7.1 (tratto bianco spesso, ombra rossa sfalsata, nessun testo). L'app le mostra a 16 px accanto al nome
della scheda; senza il file usa un'icona SVG in codice. Un solo file per scheda (lo stato attivo lo dà lo sfondo rosso del tassello).
| File | Scheda | Soggetto |
|---|---|---|
| `scheda-doti.png` | Doti sociali | stella a cinque punte |
| `scheda-confidenti.png` | Confidenti | due volti di profilo |
| `scheda-scorta.png` | Scorta | due carte sovrapposte |
| `scheda-compendio.png` | Compendio personale | libro aperto |
| `scheda-obiettivi.png` | Obiettivi | bersaglio con freccia |
| `scheda-piani.png` | Piani salvati | blocco degli appunti con spunta |
| `scheda-cicli.png` | Cicli | due frecce in cerchio |
| `scheda-storico.png` | Storico | orologio da taschino |
| `scheda-riepilogo.png` | Riepilogo | tre barre di altezza crescente |
| `scheda-oggi.png` | Oggi (guida del giorno corrente con la mappa) | calendario con il giorno cerchiato e un piccolo spillo a goccia |
| `scheda-fusione-calcolatore.png` | Fusione → Calcolatore A + B | due carte che si fondono in una scintilla |
| `scheda-fusione-ricette.png` | Fusione → Come ottenere | ampolla da alchimista |
| `scheda-fusione-con.png` | Fusione → Fusioni con… | ramificazione da una carta |
| `scheda-fusione-piani.png` | Fusione → Piano di fusione | blocco degli appunti con albero |
| `scheda-fusione-skill.png` | Fusione → Cerca per skill | stella con lente |
| `scheda-fusione-cicli.png` | Fusione → Cicli di fusione | frecce in cerchio |
| `scheda-fusione-forca.png` | Fusione → Forca e Isolamento | ghigliottina stilizzata |
| `scheda-fusione-speciali.png` | Fusione → Ricette speciali | pergamena con sigillo |

## 17. Icone delle azioni (48) — `ui/azione-<chiave>.png` (128×128, trasparente) — richieste il 2026-09-04
Stile delle icone di navigazione §7.1 (tratto bianco spesso, ombra rossa sfalsata, nessun testo, nessun numero salvo dove indicato). L'app le
mostra a 28–48 px dentro i pulsanti a tassello (32 px compatti, 40 px normali, 48 px negli interruttori a colonna, 28 px nel popup dello spillo; fondo rosso quando il pulsante è acceso, bianco/nero quando è spento: il tratto bianco
con contorno nero deve leggersi su entrambi) e a 14 px nei chip dei filtri; senza il file usa un'icona SVG in codice. Un file per chiave.
| File | Uso nell'app | Soggetto |
|---|---|---|
| `azione-regalo.png` | Regalo a un Confidente | pacco regalo con fiocco |
| `azione-uscita.png` | Uscita insieme | porta aperta con freccia che esce |
| `azione-annulla-ultimo.png` | Annulla l’ultimo incremento | freccia curva che torna indietro |
| `azione-sbloccato.png` | Confidente sbloccato | lucchetto aperto |
| `azione-bloccato.png` | Confidente bloccato | lucchetto chiuso |
| `azione-note.png` | Note personali | foglietto con matita |
| `azione-modifica.png` | Modifica | matita inclinata |
| `azione-sms.png` | Invito accettato via SMS | fumetto con tre puntini |
| `azione-esame-primo.png` | Primo agli esami | medaglia con il numero 1 |
| `azione-esame-top10.png` | Fra i primi dieci agli esami | podio a tre gradini con una stella |
| `azione-fortuna.png` | Lettura della fortuna di Chihaya | sfera di cristallo con stelle |
| `azione-libro.png` | Libro a resa maggiorata | libro aperto |
| `azione-evoca.png` | Evoca dal Registro | scintille attorno a una carta |
| `azione-esegui.png` | Esegui l’anello o il passo | triangolo di avvio |
| `azione-allarme.png` | Allarme della Stanza di Velluto | sirena lampeggiante |
| `azione-elimina.png` | Elimina | cestino |
| `azione-ricalcola.png` | Ricalcola il piano | freccia circolare |
| `azione-riapri.png` | Riapri l’obiettivo | freccia circolare aperta con punto |
| `azione-albero.png` | Mostra l’albero del piano | tre nodi collegati a ramo |
| `azione-ricetta.png` | Come ottenere la Persona | ampolla da alchimista |
| `azione-piano.png` | Piano di fusione | blocco degli appunti con spunta |
| `azione-scheda.png` | Apri la scheda | riquadro con freccia in alto a destra |
| `azione-raggiunto.png` | Segna raggiunto / raggiunti | spunta in cerchio |
| `azione-annulla.png` | Annulla / annullati | croce in cerchio |
| `azione-tutti.png` | Tutti (filtro) | elenco puntato |
| `azione-aperti.png` | Aperti (filtro) | cerchio vuoto |
| `azione-obiettivo.png` | Nuovo obiettivo / solo mancanti | bersaglio con freccia |
| `azione-carica-altri.png` | Carica altre voci | freccia in basso con base |
| `azione-seleziona.png` | Seleziona tutte le voci | doppia spunta |
| `azione-deseleziona.png` | Deseleziona | quadratino con croce |
| `azione-riprova.png` | Riprova dopo un errore | freccia circolare con punto esclamativo |
| `azione-registra.png` | Registra nel compendio | libro chiuso con segnalibro e spunta |
| `azione-indietro.png` | Indietro | freccia verso sinistra |
| `azione-carica.png` | Carica un file / sostituisci | freccia verso l'alto su una base |
| `azione-url.png` | Importa da un indirizzo | anello di catena |
| `azione-chiudi.png` | Chiudi | croce |
| `azione-attiva.png` | Attiva la partita | interruttore acceso |
| `azione-mappa.png` | Posiziona o togli uno spillo | spillo da mappa |
| `azione-ingrandisci.png` | Ingrandisci la mappa | lente con più |
| `azione-riduci.png` | Riduci la mappa | lente con meno |
| `azione-adatta.png` | Adatta la mappa all'area | riquadro con quattro frecce |
| `azione-calendario.png` | Imposta la data di gioco / vai a oggi | calendario con un giorno evidenziato |
| `azione-esaurito.png` | Segna un punto come esaurito | scrigno aperto e vuoto |
| `azione-accettata.png` | Richiesta accettata | stretta di mano |
| `azione-negozio.png` | Articoli in vendita | insegna con borsa della spesa |
| `azione-filtri.png` | Apre e chiude il pannello dei filtri del Compendio (acceso quando è aperto, con il conteggio dei filtri attivi accanto) | imbuto stilizzato con tre linee che vi scendono dentro |
| `azione-copia.png` | Copia lo spillo selezionato negli appunti dell'editor delle mappe (2026-09-05) | due fogli sovrapposti, quello davanti con l'angolo piegato |
| `azione-incolla.png` | Incolla lo spillo copiato in un punto della mappa (strumento dell'editor, 2026-09-05) | tavoletta con la molletta e un foglio che vi entra |

### 17.1 Specifiche e prompt completi delle 2 icone da consegnare (richieste il 2026-09-05, 15.20)

Specifiche comuni, ricavate dalle icone delle azioni già consegnate e approvate (`azione-registra.png`: libro con spunta; `azione-elimina.png`: cestino), da rispettare per entrambi i file:
- PNG 128×128, RGBA con alfa reale (niente scacchiera finta, niente fondo); generare più grande e ridurre con lo stesso fattore sui due assi.
- Soggetto centrato che occupa circa l'80% del quadrato, forme piatte riempite di bianco `#ececf1` con contorno nero `#0b0b0e` spesso e uniforme, angoli leggermente tagliati in diagonale; **ombra rossa `#e5352b` sfalsata** in basso a destra come un secondo strato di carta, senza sfumature né trasparenze parziali.
- Deve leggersi a 14 px (chip dei filtri) e a 28–48 px dentro i pulsanti a tassello, su fondo rosso (pulsante acceso), bianco e nero: il contorno nero e il riempimento bianco non vanno invertiti.
- Nessun testo, nessun numero, nessun marchio; nessuna icona di sistema riconoscibile (niente logo di appunti di Windows o macOS).
- Distinte fra loro e dalle icone consegnate: la copia mostra DUE fogli, l'incolla UNA tavoletta con molletta; niente libro (registra), niente foglietto con matita (note), niente freccia curva (annulla l'ultimo incremento).
- Prompt negativo comune del §0 in coda a ogni prompt.

Prompt pronti (anteporre il blocco di stile del §0):

```
[blocco di stile] Icona di azione per l'interfaccia di Persona 5 Royal, PNG 128×128 con sfondo trasparente: due fogli rettangolari sovrapposti e leggermente sfalsati, quello davanti con l'angolo in alto a destra piegato e due righe corte (barre) al centro, quello dietro visibile solo lungo due lati. Forme piatte bianche #ececf1 con contorno nero #0b0b0e spesso, angoli tagliati in diagonale, ombra rossa #e5352b sfalsata in basso a destra. Nessun testo, nessun marchio. → azione-copia.png
```
```
[blocco di stile] Icona di azione per l'interfaccia di Persona 5 Royal, PNG 128×128 con sfondo trasparente: una tavoletta portablocco verticale con la molletta metallica in alto e un foglio che vi entra dall'alto a sinistra, inclinato, con l'angolo che sporge oltre il bordo; due righe corte (barre) sul foglio. Forme piatte bianche #ececf1 con contorno nero #0b0b0e spesso, angoli tagliati in diagonale, ombra rossa #e5352b sfalsata in basso a destra. Nessun testo, nessun marchio. → azione-incolla.png
```

Verifica di consegna: 128×128 esatti, alfa nativo, leggibilità a 14 px e a 40 px su fondo rosso, bianco e nero, nome del file identico alla chiave dell'azione (`ui/azione-copia.png`, `ui/azione-incolla.png`).

## 18. Spilli delle mappe (34) — `ui/spillo-<tipo>.png` (128×128, trasparente) — richiesti il 2026-09-04 (Fase 13), `spillo-dialogo` aggiunto il 2026-09-05, 14 nuovi il 2026-09-05 (15.24)
Stile delle icone di navigazione §7.1: simbolo bianco con contorno nero dentro una goccia da mappa (punta in basso) di colore pieno per tipo
(passaggio blu, negozio verde, forziere oro, tesoro viola, boss rosso, miniboss arancio, sicura azzurro, scorciatoia grigio, Confidente rosa,
attività giallo, ristorante marrone, distributore ciano, treno verde scuro, nota bianco, nemico bordeaux, oggetto chiave blu,
punto sensibile arancio vivo, tesoro del Palazzo cremisi, Seme della Bramosia magenta, dialogo indaco). Senza testo. L'app usa un SVG in codice se manca il file.
Colori dei 14 nuovi (goccia piena, stessi esadecimali del registro `shared/spilli.ts`): sigarette grigio caldo `#78716c`, cercalavoro ambra scura `#d97706`,
lavoro verde petrolio `#0d9488`, terme ciano chiaro `#67e8f9`, lavanderia lavanda `#c4b5fd`, cinema blu notte `#1e3a8a`, biblioteca bruno `#7c2d12`,
culto viola scuro `#4c1d95`, sala giochi lime `#84cc16`, casa pesca `#fdba74`, timbro rosa lilla `#f0abfc`, meccanismo ardesia `#64748b`,
rampino magenta scuro `#a21caf`, porta rosso scuro `#b91c1c`. Ogni soggetto deve restare riconoscibile a 20 px e distinto dagli spilli già consegnati.
| File | Tipo di spillo | Soggetto |
|---|---|---|
| `spillo-passaggio.png` | ingresso/passaggio verso un'altra mappa | porta ad arco con freccia |
| `spillo-negozio.png` | negozio | insegna con borsa della spesa |
| `spillo-forziere.png` | forziere | scrigno chiuso |
| ~~`spillo-tesoro.png`~~ | (tipo «Tesoro» tolto il 2026-10-01: ridondante col Tesoro del Palazzo) | — |
| `spillo-boss.png` | boss | teschio con corona |
| `spillo-miniboss.png` | miniboss | teschio semplice |
| `spillo-sicura.png` | stanza sicura | scudo con spunta |
| `spillo-scorciatoia.png` | scorciatoia | frecce che si incrociano |
| `spillo-confidente.png` | Confidente | due volti di profilo |
| `spillo-attivita.png` | attività | stella a cinque punte |
| `spillo-ristorante.png` | ristorante o caffè | tazza fumante |
| `spillo-distributore.png` | distributore automatico di bevande (nella palette «Bevande», etichetta della mappa del gioco; file già consegnato, invariato) | distributore con lattina |
| `spillo-treno.png` | stazione della metropolitana | vagone stilizzato |
| `spillo-nota.png` | nota generica | foglietto con puntina |
| `spillo-nemico.png` | nemico | maschera d'Ombra minacciosa, distinta dai teschi di boss e miniboss |
| `spillo-oggetto-chiave.png` | oggetto chiave | chiave antica |
| `spillo-punto-sensibile.png` | punto sensibile | mirino sopra un nucleo vulnerabile crepato |
| `spillo-tesoro-palazzo.png` | tesoro principale del Palazzo | corona-reliquia radiante su piedistallo, distinta dalla gemma di tesoro |
| `spillo-seme-bramosia.png` | Seme della Bramosia | pietra-teschio crepata con viticci e richiami alle tre varianti rossa, verde e blu |
| `spillo-dialogo.png` | dialogo con un personaggio che non è un Confidente | fumetto di dialogo con tre puntini, distinto dal foglietto con puntina della nota e dai due volti del Confidente |
| `spillo-sigarette.png` | distributore di sigarette / tabaccaio («Sigarette» sulla mappa del gioco) | sigaretta accesa con un filo di fumo davanti a un piccolo distributore a colonna; niente marchi, niente testo |
| `spillo-cercalavoro.png` | espositore delle riviste di annunci di lavoro («Cercalavoro») | rivista aperta con righe di annunci e una lente d'ingrandimento sull'angolo |
| `spillo-lavoro.png` | posto di un lavoro part-time (fioraio, gyudon, konbini, bar) | valigetta da lavoro con targhetta vuota, distinta dalla borsa della spesa del negozio |
| `spillo-terme.png` | bagno pubblico (terme) | vasca vista di lato con tre volute di vapore (il simbolo giapponese delle terme, senza caratteri) |
| `spillo-lavanderia.png` | lavanderia a gettoni | lavatrice frontale con oblò rotondo e due manopole |
| `spillo-cinema.png` | cinema | ciak da regista aperto (asta a strisce e tavoletta) |
| `spillo-biblioteca.png` | biblioteca | tre libri, due in piedi e uno inclinato, con dorsi visibili |
| `spillo-culto.png` | chiesa o tempio (Chiesa di Kanda, tempio di Kichijoji, santuario) | torii a due traverse; niente croci né simboli religiosi espliciti oltre il portale |
| `spillo-sala-giochi.png` | sala giochi | joypad con croce direzionale a sinistra e due pulsanti a destra |
| `spillo-casa.png` | abitazione (casa di Sojiro, soffitta del Leblanc, case dei Confidenti) | casetta con tetto a due falde e porta al centro |
| `spillo-timbro.png` | Timbro dei Mementos (postazione fissa per piano, Royal) | timbro a mano con impugnatura e base larga sopra una riga d'inchiostro |
| `spillo-meccanismo.png` | meccanismo da azionare (leva, interruttore, pannello, quadro) | leva verticale con pomello rotondo su una base a semicerchio |
| `spillo-rampino.png` | punto di aggancio del rampino (Royal) | rampino a tre punte con un tratto di corda che sale, distinto dalla chiave dell'oggetto chiave |
| `spillo-porta.png` | porta chiusa o serratura | porta a battente con buco della serratura a goccia; niente chiave (che identifica l'oggetto chiave) |

### 18.1 Specifiche e prompt completi dei 14 spilli da consegnare (richiesti il 2026-09-05, 15.24)

Specifiche comuni, ricavate dagli spilli già consegnati e approvati (`spillo-negozio.png`, `spillo-dialogo.png`…), da rispettare per ognuno dei 14 file:
- PNG 128×128, RGBA con alfa reale (niente scacchiera finta, niente fondo opaco); generare più grande e ridurre con lo stesso fattore sui due assi.
- Forma: goccia da mappa con la punta in basso al centro, che occupa l'85–90% dell'altezza come negli spilli consegnati; riempimento **pieno** del colore del tipo (esadecimale sotto); contorno nero netto (`#0b0b0e`) di spessore uniforme; **ombra rossa `#e5352b` sfalsata** in basso a destra, come un secondo strato di carta, senza sfumature.
- Simbolo al centro della parte tonda: bianco `#ececf1` con contorno nero, forme piatte, tratto spesso, riconoscibile a 20 px (nell'app lo spillo è alto 40 px sulla mappa e 12–20 px nei pallini di legenda); niente dettagli sottili, niente prospettiva, niente sfumature.
- Nessun testo, nessun numero, nessun marchio, nessun personaggio; simboli religiosi espliciti esclusi (per `culto` basta il torii).
- Ogni soggetto deve restare distinto dagli spilli già consegnati (borsa = negozio, chiave = oggetto chiave, tazza = ristorante, lattina in distributore = Bevande, fumetto = dialogo, foglietto = nota, stella = attività).
- Prompt negativo comune del §0 in coda a ogni prompt.

Prompt pronti (anteporre il blocco di stile del §0):

```
[blocco di stile] Spillo da mappa per Persona 5 Royal, PNG 128×128 con sfondo trasparente: goccia con la punta in basso, riempimento pieno grigio caldo #78716c, contorno nero netto, ombra rossa #e5352b sfalsata in basso a destra. Al centro un simbolo bianco #ececf1 con contorno nero, piatto e spesso: una sigaretta accesa vista di lato con un filo di fumo a due volute, appoggiata davanti a un piccolo distributore automatico a colonna stilizzato. Nessun testo, nessun marchio. → spillo-sigarette.png
```
```
[blocco di stile] Spillo da mappa per Persona 5 Royal, PNG 128×128 con sfondo trasparente: goccia con la punta in basso, riempimento pieno ambra scura #d97706, contorno nero netto, ombra rossa #e5352b sfalsata in basso a destra. Al centro un simbolo bianco #ececf1 con contorno nero, piatto e spesso: una rivista aperta con tre righe di annunci (barre) e una lente d'ingrandimento appoggiata sull'angolo in basso a destra. Nessun testo leggibile, solo barre. → spillo-cercalavoro.png
```
```
[blocco di stile] Spillo da mappa per Persona 5 Royal, PNG 128×128 con sfondo trasparente: goccia con la punta in basso, riempimento pieno verde petrolio #0d9488, contorno nero netto, ombra rossa #e5352b sfalsata in basso a destra. Al centro un simbolo bianco #ececf1 con contorno nero, piatto e spesso: una valigetta da lavoro rettangolare con manico ad arco e una targhetta vuota al centro; distinta dalla borsa della spesa del negozio (niente manici morbidi). Nessun testo. → spillo-lavoro.png
```
```
[blocco di stile] Spillo da mappa per Persona 5 Royal, PNG 128×128 con sfondo trasparente: goccia con la punta in basso, riempimento pieno ciano chiaro #67e8f9, contorno nero netto, ombra rossa #e5352b sfalsata in basso a destra. Al centro un simbolo bianco #ececf1 con contorno nero, piatto e spesso: una vasca da bagno pubblico vista di lato con tre volute di vapore che salgono (il segno giapponese delle terme, senza caratteri). Nessun testo. → spillo-terme.png
```
```
[blocco di stile] Spillo da mappa per Persona 5 Royal, PNG 128×128 con sfondo trasparente: goccia con la punta in basso, riempimento pieno lavanda #c4b5fd, contorno nero netto, ombra rossa #e5352b sfalsata in basso a destra. Al centro un simbolo bianco #ececf1 con contorno nero, piatto e spesso: una lavatrice frontale con oblò rotondo grande e due manopole in alto. Nessun testo. → spillo-lavanderia.png
```
```
[blocco di stile] Spillo da mappa per Persona 5 Royal, PNG 128×128 con sfondo trasparente: goccia con la punta in basso, riempimento pieno blu notte #1e3a8a, contorno nero netto, ombra rossa #e5352b sfalsata in basso a destra. Al centro un simbolo bianco #ececf1 con contorno nero, piatto e spesso: un ciak da regista aperto, con l'asta a strisce diagonali bianche e nere e la tavoletta sotto. Nessun testo. → spillo-cinema.png
```
```
[blocco di stile] Spillo da mappa per Persona 5 Royal, PNG 128×128 con sfondo trasparente: goccia con la punta in basso, riempimento pieno bruno #7c2d12, contorno nero netto, ombra rossa #e5352b sfalsata in basso a destra. Al centro un simbolo bianco #ececf1 con contorno nero, piatto e spesso: tre libri, due in piedi e uno inclinato appoggiato agli altri, con i dorsi visibili e una riga per dorso. Nessun testo. → spillo-biblioteca.png
```
```
[blocco di stile] Spillo da mappa per Persona 5 Royal, PNG 128×128 con sfondo trasparente: goccia con la punta in basso, riempimento pieno viola scuro #4c1d95, contorno nero netto, ombra rossa #e5352b sfalsata in basso a destra. Al centro un simbolo bianco #ececf1 con contorno nero, piatto e spesso: un portale torii con due traverse orizzontali e due pilastri, la traversa superiore leggermente incurvata. Nessuna croce, nessun altro simbolo religioso, nessun testo. → spillo-culto.png
```
```
[blocco di stile] Spillo da mappa per Persona 5 Royal, PNG 128×128 con sfondo trasparente: goccia con la punta in basso, riempimento pieno lime #84cc16, contorno nero netto, ombra rossa #e5352b sfalsata in basso a destra. Al centro un simbolo bianco #ececf1 con contorno nero, piatto e spesso: un joypad orizzontale con croce direzionale a sinistra e due pulsanti rotondi a destra. Nessun testo. → spillo-sala-giochi.png
```
```
[blocco di stile] Spillo da mappa per Persona 5 Royal, PNG 128×128 con sfondo trasparente: goccia con la punta in basso, riempimento pieno pesca #fdba74, contorno nero netto, ombra rossa #e5352b sfalsata in basso a destra. Al centro un simbolo bianco #ececf1 con contorno nero, piatto e spesso: una casetta con tetto a due falde, una porta rettangolare al centro e un piccolo camino. Nessun testo. → spillo-casa.png
```
```
[blocco di stile] Spillo da mappa per Persona 5 Royal, PNG 128×128 con sfondo trasparente: goccia con la punta in basso, riempimento pieno rosa lilla #f0abfc, contorno nero netto, ombra rossa #e5352b sfalsata in basso a destra. Al centro un simbolo bianco #ececf1 con contorno nero, piatto e spesso: un timbro a mano con impugnatura tonda e base larga, sopra una riga d'inchiostro orizzontale. Nessun testo, nessuna lettera sulla base. → spillo-timbro.png
```
```
[blocco di stile] Spillo da mappa per Persona 5 Royal, PNG 128×128 con sfondo trasparente: goccia con la punta in basso, riempimento pieno ardesia #64748b, contorno nero netto, ombra rossa #e5352b sfalsata in basso a destra. Al centro un simbolo bianco #ececf1 con contorno nero, piatto e spesso: una leva verticale con pomello rotondo in cima, innestata su una base a semicerchio. Nessun testo. → spillo-meccanismo.png
```
```
[blocco di stile] Spillo da mappa per Persona 5 Royal, PNG 128×128 con sfondo trasparente: goccia con la punta in basso, riempimento pieno magenta scuro #a21caf, contorno nero netto, ombra rossa #e5352b sfalsata in basso a destra. Al centro un simbolo bianco #ececf1 con contorno nero, piatto e spesso: un rampino a tre punte ricurve con un tratto di corda che sale verso l'alto; distinto dalla chiave antica dell'oggetto chiave. Nessun testo. → spillo-rampino.png
```
```
[blocco di stile] Spillo da mappa per Persona 5 Royal, PNG 128×128 con sfondo trasparente: goccia con la punta in basso, riempimento pieno rosso scuro #b91c1c, contorno nero netto, ombra rossa #e5352b sfalsata in basso a destra. Al centro un simbolo bianco #ececf1 con contorno nero, piatto e spesso: una porta a battente chiusa, vista frontale, con il buco della serratura a goccia; nessuna chiave. Nessun testo. → spillo-porta.png
```

Verifica di consegna (come per gli spilli precedenti): 128×128 esatti, alfa nativo, punta della goccia al centro del bordo inferiore, leggibilità a 20 px su fondo chiaro e scuro, nome del file identico alla chiave del tipo (`ui/spillo-<tipo>.png`).

### 18.2 I due varchi — `spillo-velluto`, `spillo-mementos` (consegnati il 2026-09-08)

**Questa riga arriva in ritardo, ed è il ritardo a renderla necessaria.** L'utente aveva chiesto il
pin della Stanza di Velluto; io non l'ho mai censito. Le due immagini sono state generate lo stesso
e sono entrate su `main` dentro un commit intitolato «rende inequivocabile l'icona acquisto», cioè
senza una riga, da nessuna parte, che dicesse che cosa fossero. Il risultato prevedibile: sono
rimaste **immagini orfane** — presenti in `public/asset`, mai chieste dal codice — e non se n'è
accorto nessuno, perché non c'era niente con cui confrontarle. La regola «una chiave nasce con la
sua riserva SVG e la sua riga di censimento» serve a questo, e qui l'ho saltata io.

| File | Tipo | Colore | Soggetto |
|---|---|---|---|
| `spillo-velluto.png` | `velluto` — «Stanza di Velluto» | indaco `#3730a3` | porta della cella con le sbarre, socchiusa |
| `spillo-mementos.png` | `mementos` — «Ingresso ai Memento» | bordeaux `#7f1d1d` | tornello della metropolitana visto di fronte |

Sono i due **varchi**, e hanno un gruppo loro nella tavolozza invece di stare fra gli spostamenti:
un `passaggio` porta da una stanza all'altra, questi due da un mondo all'altro.

**Quel che manca non è più l'immagine, è il dato.** I tipi sono dichiarati in `shared/spilli.ts` e
disponibili nell'editor, ma nel seed non esiste nessun luogo «Stanza di Velluto» da marcare: in P5R
ci si entra dalle Safe Room, e l'unico riferimento sorgato è un marcatore nel Palazzo di Shido
descritto come «esaminando la porta principale… si attiva la Stanza di Velluto». Finché quel dato
non c'è, il pin esiste e non si vede.

## 19. Mappe di base della città (25) — `mappe/<chiave>.png` (2048×1536, opache) — richieste il 2026-09-04 (Fase 13)
Piante ILLUSTRATE originali in stile guida strategica (vista dall'alto leggermente prospettica, sagome nere degli edifici, strade chiare,
accenti rossi), NON ricalcate da mappe ufficiali né da screenshot: sono le immagini di base su cui l'editor delle mappe posiziona gli spilli,
e vengono pubblicate nel repository. Nessun testo dentro l'immagine (nomi e spilli li mette l'app).
| File | Mappa | Soggetto |
|---|---|---|
| `tokyo.png` | Vista d'insieme di Tokyo | mappa stilizzata con i quartieri del gioco come isole collegate dalle linee della metropolitana, senza testo |
| `citta-yongen-jaya.png` | Yongen-Jaya | pianta stilizzata del quartiere con le vie principali e sagome degli edifici tipici (senza testo: i nomi dei luoghi li mette l'app con gli spilli) |
| `citta-shibuya.png` | Shibuya | pianta stilizzata del quartiere con le vie principali e sagome degli edifici tipici (senza testo: i nomi dei luoghi li mette l'app con gli spilli) |
| `citta-shinjuku.png` | Shinjuku | pianta stilizzata del quartiere con le vie principali e sagome degli edifici tipici (senza testo: i nomi dei luoghi li mette l'app con gli spilli) |
| `citta-kichijoji.png` | Kichijoji | pianta stilizzata del quartiere con le vie principali e sagome degli edifici tipici (senza testo: i nomi dei luoghi li mette l'app con gli spilli) |
| `citta-akihabara.png` | Akihabara | pianta stilizzata del quartiere con le vie principali e sagome degli edifici tipici (senza testo: i nomi dei luoghi li mette l'app con gli spilli) |
| `citta-shujin-academy.png` | Shujin Academy (scuola) | pianta stilizzata del quartiere con le vie principali e sagome degli edifici tipici (senza testo: i nomi dei luoghi li mette l'app con gli spilli) |
| `citta-kanda-jinbocho.png` | Kanda / Jinbocho | pianta stilizzata del quartiere con le vie principali e sagome degli edifici tipici (senza testo: i nomi dei luoghi li mette l'app con gli spilli) |
| `citta-ikebukuro.png` | Ikebukuro | pianta stilizzata del quartiere con le vie principali e sagome degli edifici tipici (senza testo: i nomi dei luoghi li mette l'app con gli spilli) |
| `citta-harajuku.png` | Harajuku | pianta stilizzata del quartiere con le vie principali e sagome degli edifici tipici (senza testo: i nomi dei luoghi li mette l'app con gli spilli) |
| `citta-ueno.png` | Ueno | pianta stilizzata del quartiere con le vie principali e sagome degli edifici tipici (senza testo: i nomi dei luoghi li mette l'app con gli spilli) |
| `citta-inokashira-park.png` | Parco Inokashira | pianta stilizzata del quartiere con le vie principali e sagome degli edifici tipici (senza testo: i nomi dei luoghi li mette l'app con gli spilli) |
| `citta-odaiba.png` | Odaiba / Seaside Park | pianta stilizzata del quartiere con le vie principali e sagome degli edifici tipici (senza testo: i nomi dei luoghi li mette l'app con gli spilli) |
| `citta-shinagawa.png` | Shinagawa | pianta stilizzata del quartiere con le vie principali e sagome degli edifici tipici (senza testo: i nomi dei luoghi li mette l'app con gli spilli) |
| `citta-nakano.png` | Nakano | pianta stilizzata del quartiere con le vie principali e sagome degli edifici tipici (senza testo: i nomi dei luoghi li mette l'app con gli spilli) |
| `citta-ogikubo.png` | Ogikubo | pianta stilizzata del quartiere con le vie principali e sagome degli edifici tipici (senza testo: i nomi dei luoghi li mette l'app con gli spilli) |
| `citta-yokohama-chinatown.png` | Chinatown (Yokohama) | pianta stilizzata del quartiere con le vie principali e sagome degli edifici tipici (senza testo: i nomi dei luoghi li mette l'app con gli spilli) |
| `citta-maihama.png` | Maihama | pianta stilizzata del quartiere con le vie principali e sagome degli edifici tipici (senza testo: i nomi dei luoghi li mette l'app con gli spilli) |
| `citta-roppongi.png` | Roppongi | pianta stilizzata del quartiere con le vie principali e sagome degli edifici tipici (senza testo: i nomi dei luoghi li mette l'app con gli spilli) |
| `citta-tsukishima.png` | Tsukishima | pianta stilizzata del quartiere con le vie principali e sagome degli edifici tipici (senza testo: i nomi dei luoghi li mette l'app con gli spilli) |
| `citta-meiji-shrine.png` | Santuario Meiji | pianta stilizzata del quartiere con le vie principali e sagome degli edifici tipici (senza testo: i nomi dei luoghi li mette l'app con gli spilli) |
| `citta-ichigaya.png` | Ichigaya | pianta stilizzata del quartiere con le vie principali e sagome degli edifici tipici (senza testo: i nomi dei luoghi li mette l'app con gli spilli) |
| `citta-suidobashi.png` | Suidobashi (Dome Town) | pianta stilizzata del quartiere con le vie principali e sagome degli edifici tipici (senza testo: i nomi dei luoghi li mette l'app con gli spilli) |
| `citta-asakusa.png` | Asakusa | pianta stilizzata del quartiere con le vie principali e sagome degli edifici tipici (senza testo: i nomi dei luoghi li mette l'app con gli spilli) |
| `citta-mementos.png` | Mementos (ingresso) | pianta stilizzata del quartiere con le vie principali e sagome degli edifici tipici (senza testo: i nomi dei luoghi li mette l'app con gli spilli) |

## 20. Icona della sezione «Mappe» della Guida (1) — `guida/mappe.png` (256×256, trasparente) — richiesta il 2026-09-04 (Fase 13.4)
Stessa famiglia delle icone delle sezioni della Guida (§13): tratto bianco spesso con ombra rossa sfalsata, nessun testo.
| File | Uso nell'app | Soggetto |
|---|---|---|
| `guida/mappe.png` | piastrella «Mappe» nell'indice della Guida (Tokyo, quartieri, Palazzi e Dedali a livelli) | mappa ripiegata con uno spillo a goccia piantato sopra |

### Aggiunta del 2026-09-05 — dialoghi (corretta su conferma utente)
ui/spillo-dialogo.png (consegnato come `spillo-dialoghi.png`, rinominato al merge del 2026-09-05: l'app cerca `ui/spillo-dialogo`) — 128×128 PNG RGBA. Spillo completo a goccia gialla come spillo-attivita, fumetto bianco con tre punti neri al posto della stella, contorno nero e accento rosso. Alfa reale generato nativamente, nessuno scontorno; solo ridimensionamento proporzionale.
Prompt Imagegen: Create a transparent-background PNG asset. One complete yellow map pin, same family and silhouette as spillo-attivita: yellow teardrop, black outline, narrow red accent offset to right. Replace star with a white speech balloon outlined black containing three black dots. Flat solid colors. Actual native transparent alpha background, no painted checkerboard. Square canvas, complete uncropped marker, transparent margins.

## 21. Icone delle azioni nuove (6) — `ui/azione-<chiave>.png` (128×128, trasparente) — richieste il 2026-09-07 (rifacimento delle pagine)
Stesse regole della §17: tratto bianco spesso, ombra rossa sfalsata, nessun testo, leggibili su fondo rosso acceso e su fondo scuro. Sono i sei
gesti comparsi rifacendo Libri, Film, Videogiochi, Richieste, Palazzi e Mappe: **nessun pulsante dell'app resta di solo testo**, e finché il file
non c'è al suo posto sta un'icona SVG disegnata in codice (`iconeGuida.tsx`), che è una riserva, non il traguardo.
| File | Uso nell'app | Soggetto |
|---|---|---|
| `azione-piu.png` | Aggiungi una sessione di lettura, una visione, un round | segno «+» spesso dentro un cerchio aperto |
| `azione-meno.png` | Togli una sessione, una visione, un round | segno «−» spesso dentro un cerchio aperto |
| `azione-completati.png` | Mostra o nascondi il gruppo dei completati | elenco di tre righe con due spunte a sinistra |
| `azione-dettagli.png` | Apri i dettagli di una scheda (Richieste, Palazzi) | foglio con l'angolo piegato e una lente d'ingrandimento sovrapposta |
| `azione-pianta.png` | Vista «pianta della guida» di un'area | planimetria schematica: rettangolo con una parete interna e un'apertura |
| `azione-posizione.png` | «Mostra posizione» di un libro o di un film | spillo da mappa a goccia con il foro tondo |

### Aggiunta del 2026-10-01 — ordine della giornata (2) — stesse regole
Richiesta dell'utente: l'ordine esatto delle voci di «Di giorno» / «Di sera», con «Sposta su» e «Sposta giù» nel menu di ogni voce e nella
finestra di una voce. Finché il file manca, la riserva SVG è in `iconeGuida.tsx` (`IconSu`, `IconGiu`).

| File | Uso nell'app | Soggetto |
|---|---|---|
| `azione-su.png` | «Sposta su» una voce della giornata (un posto prima) | freccia spessa verso l'alto sopra una riga orizzontale corta |
| `azione-giu.png` | «Sposta giù» una voce della giornata (un posto dopo) | freccia spessa verso il basso sotto una riga orizzontale corta |

### Aggiunta del 2026-10-25 — parti illeggibili (1) — stesse regole
Lotto B della revisione UX/UI: tutti i pulsanti hanno un'icona. Quando condizioni, effetti o quiz salvati contengono parti che l'editor non sa
rappresentare, il pulsante «Usa le … leggibili e scarta le altre parti» tiene il leggibile e butta il resto: non è «ricalcola» né «elimina».
Finché il file manca, la riserva SVG è l'imbuto di `iconeGuida.tsx` (`IconFiltro`), la stessa figura dei filtri: il file va distinto da quella.

| File | Uso nell'app | Soggetto |
|---|---|---|
| `azione-scarta.png` | «Usa le condizioni / gli effetti / il quiz leggibili e scarta le altre parti» (moduli del catalogo e delle attività) | foglio verticale tagliato in diagonale a metà altezza: la metà alta resta intera con due righe corte, la metà bassa si stacca e cade inclinata verso il basso a destra, con tre trattini di movimento |

Prompt pronto (anteporre il blocco di stile del §0): `[blocco di stile] Icona di azione per l'interfaccia di Persona 5 Royal, PNG 128×128 con sfondo trasparente: un foglio rettangolare verticale tagliato in diagonale a metà altezza; la metà superiore resta ferma con due righe corte (barre), la metà inferiore si stacca e cade inclinata in basso a destra, con tre trattini di movimento. Forme piatte bianche #ececf1 con contorno nero #0b0b0e spesso, angoli tagliati in diagonale, ombra rossa #e5352b sfalsata in basso a destra. Nessun testo, nessun marchio; niente forbici, niente cestino, niente imbuto. → azione-scarta.png`

> **Superato** (§29): la chiave `scarta` ha otto usi, fra cui «Scarta» una proposta intera e «Cancella ricerca» del Diario,
> che vuole di proposito la figura del filtro. Il soggetto valido, già consegnato, è l'imbuto con un pezzetto espulso: il
> prompt qui sopra non va generato.

### Aggiunta del 2026-10-25 — ricevute della spunta (2) — stesse regole
Richiesta dell'utente: le ricevute degli effetti della spunta di una voce del Diario non stanno più sempre aperte sotto la voce, ma dietro
un pulsantino a sola icona nella colonna dei comandi, con il numero delle ricevute in un distintivo. Prima l'icona era quella degli
appunti (`azione-piano`), che nell'app vuol dire piani di fusione e domande in classe: serve una figura propria. Finché il file manca, la
riserva SVG è lo scontrino di `iconeGuida.tsx` (`IconRicevuta`). Il distintivo col numero lo disegna l'app: la figura non porta cifre.

| File | Uso nell'app | Soggetto |
|---|---|---|
| `azione-ricevute.png` | «Ricevute degli effetti della spunta» di una voce del Diario (apre l'elenco delle ricevute) | scontrino verticale con il bordo basso a denti di sega e tre righe orizzontali di importi, l'ultima più corta |

Prompt pronto (anteporre il blocco di stile del §0): `[blocco di stile] Icona di azione per l'interfaccia di Persona 5 Royal, PNG 128×128 con sfondo trasparente: uno scontrino di cassa verticale con il bordo inferiore strappato a denti di sega e tre righe orizzontali di importi, l'ultima più corta. Forme piatte bianche #ececf1 con contorno nero #0b0b0e spesso, angoli tagliati in diagonale, ombra rossa #e5352b sfalsata in basso a destra. Nessun testo, nessuna cifra, nessun marchio; niente appunti con la molletta, niente libro. → azione-ricevute.png`

### Aggiunta del 2026-10-26 — Taglia (appunti del Diario) — stesse regole
Richiesta dell'utente: copiare, tagliare e incollare voci del Diario con gli appunti di sistema («Sì, anche Taglia»). «Taglia» è un gesto nuovo
della barra delle voci selezionate e del menu della voce; fino all'immagine la riserva SVG sono le forbici di `iconeGuida.tsx` (`IconForbici`).

| File | Uso | Soggetto |
|---|---|---|
| `azione-taglia.png` | «Taglia» le voci selezionate del Diario (si spostano incollandole) | forbici aperte viste di lato, due anelli in basso a sinistra e lame incrociate verso l'alto a destra |

Prompt pronto (anteporre il blocco di stile del §0): `[blocco di stile] Icona di azione per l'interfaccia di Persona 5 Royal, PNG 128×128 con sfondo trasparente: un paio di forbici aperte viste di lato, i due anelli in basso a sinistra e le lame incrociate che puntano in alto a destra. Forme piatte bianche #ececf1 con contorno nero #0b0b0e spesso, angoli tagliati in diagonale, ombra rossa #e5352b sfalsata in basso a destra. Nessun testo, nessun marchio; niente fogli né linee tratteggiate. → azione-taglia.png`

## 22. Icone di categoria (22) — `ui/categoria-<chiave>.png` (128×128, trasparente) — richieste il 2026-09-07
Le figure che stanno **dentro il cartiglio rosso a taglio diagonale** delle schede: tipo di negozio, categoria di oggetto, tipo di attività, tipo di
azione del percorso. L'app le mostra a 18–44 px sopra il cartiglio, quindi il soggetto deve leggersi anche piccolo: silhouette piena, niente
dettagli sottili, nessun testo. Erano — e finché il file manca restano — icone SVG in codice: il libretto sui Libri, la pellicola sui Film, il pad sui
Videogiochi. L'utente le ha indicate per nome: «anche l'icona dei libri… dei DVD, del film al cinema, del videogame… ogni elemento grafico
provvisorio deve essere sostituito con la relativa grafica generata».
| File | Uso nell'app | Soggetto |
|---|---|---|
| `categoria-libri.png` | Libri (catalogo e schede) | libro chiuso di taglio, con il segnalibro |
| `categoria-film.png` | Film e DVD | bobina di pellicola con la coda di nastro |
| `categoria-dvd.png` | Titolo in DVD | disco con il riflesso a spicchio |
| `categoria-minigiochi.png` | Videogiochi e mini-giochi | pad da sala giochi con leva e due tasti |
| `categoria-lavori.png` | Lavori part-time | valigetta con la maniglia |
| `categoria-studio.png` | Studio | quaderno aperto con la penna |
| `categoria-armi.png` | Negozio di armi | pugnale con il filo in evidenza |
| `categoria-protezioni.png` | Protezioni | scudo a punta |
| `categoria-accessori.png` | Accessori | anello con una gemma |
| `categoria-oggetti.png` | Oggetti | sacchetto della spesa |
| `categoria-regali.png` | Regali | pacchetto con il fiocco |
| `categoria-abiti.png` | Abiti e costumi | gruccia con una giacca |
| `categoria-cibo.png` | Cibo | ciotola di ramen fumante |
| `categoria-online.png` | Acquisti online | monitor con il carrello |
| `categoria-distributore.png` | Distributore automatico | lattina con la linguetta |
| `categoria-materiali.png` | Materiali | ingranaggio e barretta di metallo |
| `categoria-misto.png` | Negozio misto | insegna con la tendina a righe |
| `categoria-cura.png` | Oggetti di cura | fiala con la croce |
| `categoria-sp.png` | Recupero SP | goccia con il bagliore |
| `categoria-stato.png` | Stati alterati | scudo incrinato |
| `categoria-battaglia.png` | Oggetti da battaglia | saetta spezzata |
| `categoria-esplorazione.png` | Esplorazione | bussola |

**Consegnate il 2026-09-07** (candidato `grafica-categorie-finali-v1`, verificate: 128×128 RGBA, alfa reale, nessun oro). Le chiavi dei dati che
dicono la stessa cosa al singolare — `arma`, `protezione`, `accessorio`, `regalo`, `materiale`, `abito`, `libro`, `lavoro`, `mini-gioco`,
`videogioco` — sono ricondotte a queste figure da `chiaveCategoria()` (`src/utils/categorie.ts`): **non serve un file per ogni sinonimo**.

## 23. Fregi decorativi delle sezioni (10) — `decori/<chiave>.png` (1024×1024, trasparente) — richiesti il 2026-09-07
**Immagini decorative e basta**: stanno nel fondo di una carta, sfumate al 16% di opacità e mascherate verso il testo, per alleggerire le sezioni
che sono per forza di prosa. Non portano informazione, non contengono testo e non devono competere con il contenuto: silhouette larghe, poco
dettaglio, un solo soggetto ben riconoscibile anche a metà trasparenza. Il file assente non rompe niente: al suo posto resta una macchia rossa
del tema. Richiesta dell'utente: «nelle pagine di puro testo pensa a delle immagini puramente decorative… immagini a tema con il contenuto dei
paragrafi».
| File | Sezione | Soggetto |
|---|---|---|
| `battaglia-negoziazione.png` | Aiuto in battaglia → Quando e come | maschera d'Ombra e un fumetto vuoto che si sovrappongono |
| `battaglia-regole.png` | Aiuto in battaglia → Regole | mano di carte da negoziazione a ventaglio |
| `battaglia-tecnico.png` | Danno tecnico → Esiti del colpo | impatto a stella con onde concentriche |
| `battaglia-staffetta.png` | Staffetta | due silhouette che si passano il testimone |
| `battaglia-speciali.png` | Speciali | due sagome spalla a spalla dentro un lampo |
| `battaglia-assalto.png` | Rapina, Assalto e Parla | sagoma in corsa con il mantello e il mirino |
| `battaglia-ombre-sciagura.png` | Ombre sciagura | ombra con l'aura a raggi e gli occhi accesi |
| `battaglia-mietitore.png` | Il Mietitore | figura incappucciata con le catene |
| `battaglia-demoni-tesoro.png` | Demoni del Tesoro | forziere con le gambe che scappa |
| `jose-fiori.png` | Richieste → foglio di Jose | bambino con l'auto giocattolo e i fiori dei Mementos |
| `jose-scambi.png` | Richieste → tabella degli scambi | banco di scambio con fiori e timbri, formato a fascia (1536×864) |

## 24. Icone di categoria delle azioni del giorno (11) — `ui/categoria-<chiave>.png` (128×128, trasparente) — richieste il 2026-09-07
Stesse regole della §22 (128×128 trasparente, bianco/grigio/nero/rosso, nessun oro, nessun testo, silhouette leggibile a 20 px).
Sono le categorie rimaste fuori dal censimento precedente, e si vedono **nella pagina più usata dell'app**: la Guida del giorno mostra l'icona
dell'azione a 40 px, e su tredici tipi di azione uno solo — `dvd` — aveva la sua figura. Gli altri dodici restano sul cartiglio rosso di riserva,
che accanto alle illustrazioni nuove è esattamente la mescolanza di stili che l'utente ha respinto («devi integrarle bene… non lasciare questa
merda»). Il numero fra parentesi è quante volte quel tipo compare nel percorso di una partita intera: è l'ordine con cui conviene generarle.
| File | Uso nell'app | Soggetto |
|---|---|---|
| `categoria-confidente.png` | Azione «Confidente» del giorno (272) | due sagome di profilo affiancate, quella davanti con la mascherina |
| `categoria-dote.png` | Azione «Dote» (140), scheda «Staffetta e Speciali» | stella piena a cinque punte con il bagliore su una punta |
| `categoria-attivita.png` | Azione «Attività» (95) | sagoma in corsa vista di lato, con la scia |
| `categoria-trama.png` | Azione «Trama» (87) | biglietto da visita dei Ladri Fantasma, con l'angolo piegato |
| `categoria-acquisto.png` | Azione «Acquisto» (82) | portafoglio aperto con due monete che escono |
| `categoria-esame.png` | Azione «Esame» (70) | foglio con la matita di traverso e una spunta grande |
| `categoria-palazzo.png` | Azione «Palazzo» (58) | castello con due torri e il portone centrale |
| `categoria-altro.png` | Azione generica (34), negozio «Altro», oggetto «Altro» | rombo pieno con tre punti in fila al centro |
| `categoria-velluto.png` | Azione «Stanza di Velluto» (18), scheda «Ombre per area» | chiave lunga con l'anello a farfalla |
| `categoria-richiesta.png` | Azione «Richiesta» (9), intestazione delle Richieste dei Mementos | foglio strappato con il teschio stampato sopra |
| `categoria-oggetti-chiave.png` | Colonna «Tipo» degli oggetti chiave | chiave tozza con la testa a corona |

Vanno tenute **distinte fra loro e dalle §22**: `velluto` (chiave) non è `oggetti-chiave` (chiave tozza a corona) e nessuna delle due è
`categoria-armi`; `esame` (foglio + matita + spunta) non è `studio` (quaderno aperto con penna); `palazzo` (castello) non è `protezioni` (scudo).

## 25. Figure delle schede a tessera (13) — `ui/scheda-<chiave>.png` e `ui/categoria-<chiave>.png` (128×128, trasparente) — richieste il 2026-09-07
Stesse regole della §16 e della §22: 128×128 trasparente, bianco/grigio/nero/rosso, **niente oro**, nessun testo, un solo
soggetto pieno leggibile a 28 px.

**Perché servono.** Le barre che scelgono la vista di una pagina — Fusione, Oggetti, Trofei e finali, Sfide, Richieste — erano
pastiglie di testo con un'iconcina da 16 px accanto, o senza niente. Rilievo dell'utente: «rapporto grafica/testo pessimo… va
dato più spazio all'immagine, come nel secondo screen… questo su tutti i pulsanti». Ora sono tessere con la **figura sopra e
l'etichetta sotto**, come le schede della Partita, e a 28 px la figura è il segno che si riconosce da lontano. Ognuna ha già la
sua riserva SVG: queste immagini la sostituiscono.
| File | Scheda | Soggetto |
|---|---|---|
| `scheda-trofei.png` | Trofei e finali → Trofei | coppa a due manici su base bassa |
| `scheda-finali.png` | → Finali | maschera che si solleva, con la cordicella |
| `scheda-dlc.png` | → DLC | pacchetto con la freccia che scende dentro |
| `scheda-meteo.png` | → Meteo | nuvola con un raggio che esce da dietro |
| `scheda-nuova-partita.png` | → Nuova Partita+ | freccia che gira in cerchio con una stella nel mezzo |
| `scheda-tempo.png` | → Tempo e fasce | clessidra con la sabbia a metà |
| `scheda-sfide-battaglia.png` | Sfide → Battaglie Sfida | due lame incrociate dentro un cerchio spezzato |
| `scheda-boss.png` | → Boss segreti | sagoma incappucciata con due occhi accesi |
| `scheda-magnate.png` | → Magnate | cilindro con la moneta appoggiata al bordo |
| `scheda-tratti.png` | → Tratti | gemma sfaccettata con un bagliore |
| `scheda-jose.png` | Richieste → foglio di Jose | cappello tondo con un fiore infilato nella fascia |
| `scheda-personalizzazione.png` | Oggetti → Personalizzazione armi | lima e pugnale incrociati |
| `scheda-scambi.png` | Oggetti → Scambi | due frecce che si scambiano attorno a un fiore |

Le tre della Guida che restano — `categoria-oggetti-chiave` (scheda «Chiave e materiali») e `categoria-richiesta` (foglio
delle Richieste) — sono già nella §24 e non si ripetono qui.

**Riepilogo di quel che manca, in un posto solo (2026-09-07, sera).** Consegnate e integrate: §21 (6 azioni), §22 (22
categorie), §23 (11 fregi). **Da generare: 24 immagini** — le 11 della §24 e le 13 di questa §25. Nell'ordine in cui pesano
per chi gioca: prima `categoria-confidente`, `categoria-dote`, `categoria-attivita`, `categoria-trama`, `categoria-acquisto`,
`categoria-esame`, `categoria-palazzo` (la Guida del giorno le mostra a 40 px a ogni partita), poi le tredici delle tessere,
infine `categoria-altro`, `categoria-velluto`, `categoria-richiesta`, `categoria-oggetti-chiave`.

## 26. Illustrazioni delle attività e dei lavori (23) — `attivita/<chiave>.png` (256×256, trasparente) — richieste il 2026-09-07
Una figura per ogni attività e per ogni lavoro. L'app le mostra **a 56 px nella riga dell'elenco** e più grandi nella scheda
aperta. Regole comuni: 256×256 trasparente, bianco/grigio/nero/rosso, niente oro, nessun testo dentro l'immagine, un soggetto solo.

**Il prompt di ciascuna è il testo che l'app le mette accanto**, non una scena descritta da noi: richiesta dell'utente —
«devono essere legati al loro contesto… il prompt deve contenere riferimenti al testo associato all'icona». Qui sotto ogni
voce riporta **le stesse parole che legge chi gioca** in quella riga — nome, tipo, dove, quando, costo, Doti, come si sblocca,
regole, effetti — prese dal seed senza parafrasi. L'illustrazione nasce da quelle: se il testo dice «interagendo con la sedia
tra scrivania e letto», la sedia c'è; quello che il testo non dice non va inventato.

Questo elenco si rigenera dai dati, quindi resta vero anche quando una scheda viene corretta.

### `attivita/allenamento-camera-leblanc.png` — Allenamento in camera (Leblanc)
- **Tipo:** Allenamento
- **Dove:** Leblanc, mansarda
- **Quando:** Di sera
- **Costo:** gratuito
- **Come si sblocca:** Dal 18 aprile, interagendo con la sedia tra scrivania e letto (dopo aver pulito la mansarda)
- **Regole:** Gratuito, disponibile la sera in mansarda.
- **Altri effetti:** Aumenta permanentemente gli HP massimi del protagonista: visite 1-4 = +5HP; 5-8 = +6HP; 9-12 = +7HP; 13-15 = +8HP; 16+ = +8HP. In Royal i bonus si mantengono in Nuova Partita+.

### `attivita/allenamento-palestra-protein-lovers.png` — Allenamento in palestra (Protein Lovers Gym)
- **Tipo:** Allenamento
- **Dove:** Shibuya, Protein Lovers Gym
- **Quando:** Giorno e sera
- **Costo:** 2000 ¥
- **Come si sblocca:** Rango 5 di Ryuji oppure Rango 8 di Ann
- **Regole:** 2.000 yen a visita.
- **Altri effetti:** Aumenta HP e SP massimi: visite 1-4 = +3HP/+2SP; 5-8 = +5HP/+3SP; 9-12 = +7HP/+5SP; 13-15 = +9HP/+7SP; 16+ = +9HP/+7SP. Le proteine acquistabili aumentano ulteriormente l'effetto: Frullato proteico 2…
- **Premi:** Premio 'La leggenda del Drago Nascente' nel Covo dei Ladri.

### `attivita/esperimenti-clinici-takemi.png` — Esperimenti clinici di Tae Takemi
- **Tipo:** Altro
- **Dove:** Yongen-Jaya, ambulatorio Takemi
- **Quando:** Di sera
- **Costo:** gratuito
- **Doti:** Coraggio
- **Come si sblocca:** Legato al Confidente dell'Eremita (Takemi)

### `attivita/jazz-club-kichijoji.png` — Jazz Club di Kichijoji
- **Tipo:** Altro
- **Dove:** Kichijoji, jazz club
- **Quando:** Di sera
- **Costo:** 3000 ¥
- **Come si sblocca:** Rango Confidente 4 con Akechi; disponibile dal 26 giugno
- **Regole:** Ingresso serale a 3.000 yen. Frequentarlo regolarmente sottrae tempo ad altri Confidenti (es. Kawakami).
- **Altri effetti:** Invitando un compagno: punti Affetto (bonus se si porta una Persona dell'Arcano corrispondente) piu un cocktail settimanale che modifica temporaneamente statistiche/abilita di combattimento: Lunedi '…
- **Premi:** Nelle serate con cantante si sblocca la versione vocale di 'No More What Ifs' nel Covo dei Ladri.

### `attivita/tempio-vecchio-kichijoji.png` — Tempio Vecchio di Kichijoji (meditazione)
- **Tipo:** Altro
- **Dove:** Kichijoji, Tempio Vecchio
- **Quando:** Di giorno
- **Costo:** gratuito
- **Come si sblocca:** Dal 6 giugno
- **Regole:** Gratuito, disponibile di giorno.
- **Altri effetti:** Aumenta permanentemente l'SP massimo (non una dote sociale): 3 SP le prime volte, +3 SP extra ogni 3 meditazioni, fino a un massimo di 12 SP per sessione dal 10 utilizzo.
- **Premi:** Trofeo 'A Serene Experience'.

### `attivita/curry-leblanc.png` — Cucinare il curry a Leblanc
- **Tipo:** Cibo
- **Dove:** Leblanc
- **Quando:** Giorno e sera
- **Come si sblocca:** Rango 4 del Confidente di Sojiro
- **Regole:** Si esamina il frigorifero in Leblanc; disponibile domenica, lunedi, mercoledi e venerdi secondo fonti secondarie.
- **Altri effetti:** Il curry preparato puo essere consumato come oggetto prima delle esplorazioni nei Palazzi/Mementos per bonus in combattimento (dettaglio non verificato su fonte italiana).

### `attivita/caffe-leblanc.png` — Preparazione del caffe a Leblanc
- **Tipo:** Cibo
- **Dove:** Leblanc
- **Quando:** Giorno e sera
- **Costo:** gratuito
- **Doti:** Fascino
- **Regole:** Interagire con il bancone/sifone del caffe a sinistra del locale.

### `attivita/lavoro-crossroads.png` — Bar Crossroads (izakaya, Shinjuku)
- **Tipo:** Lavoro
- **Dove:** Shinjuku, quartiere a luci rosse
- **Quando:** Di sera
- **Costo:** gratuito
- **Paga:** 7.200 yen a turno (12.000 yen di domenica)
- **Doti:** Gentilezza
- **Come si sblocca:** Confidente di Ichiko Ohya avviato; Gentilezza Rango 3; Perizia Rango 3
- **Regole:** Solo turni serali.
- **Altri effetti:** La domenica si puo ottenere un punto bonus in una dote a scelta parlando con i clienti al bancone (Coraggio, Perizia, Fascino; la Conoscenza non risulta tra le opzioni secondo le fonti consultate). G…

### `attivita/lavoro-ore-no-beko.png` — Cameriere al Ore no Beko (ciotole di manzo)
- **Tipo:** Lavoro
- **Dove:** Shibuya, Central Street
- **Quando:** Di sera
- **Costo:** gratuito
- **Paga:** 3.600 yen a turno (fino a 8.800 yen con ordini perfetti)
- **Doti:** Perizia
- **Regole:** Solo turni serali, nessun requisito. Compagni: Ryuji (giorni dispari), Yoshida (giorni pari).
- **Altri effetti:** Quiz a memoria sugli ordini dei clienti.

### `attivita/lavoro-triple-seven.png` — Commesso al Triple Seven
- **Tipo:** Lavoro
- **Dove:** Shibuya, Central Street
- **Quando:** Di giorno
- **Costo:** gratuito
- **Paga:** 3.500 yen a turno (fino a 7.400 yen con quiz perfetto)
- **Doti:** Fascino
- **Regole:** Turni diurni, nessun requisito. Compagni incontrabili al lavoro: Haru, Yoshizawa, Makoto, Mishima, Yusuke, Ann, Ryuji.
- **Altri effetti:** Quiz a memoria sui codici a barre il 7, 17 e 27 del mese; superarlo perfettamente aumenta la paga.

### `attivita/lavoro-rafflesia.png` — Fioraio Rafflesia
- **Tipo:** Lavoro
- **Dove:** Shibuya, centro commerciale sotterraneo
- **Quando:** Di giorno
- **Costo:** gratuito
- **Paga:** 3.200 yen a turno (fino a 7.800 yen con bouquet perfetti)
- **Doti:** Gentilezza
- **Come si sblocca:** Fascino Rango 2
- **Regole:** Solo turni diurni. Compagni: Yusuke (giorni dispari), Haru (giorni pari).
- **Altri effetti:** Mercoledi e sabato: creazione di bouquet personalizzati in base alle preferenze del cliente (colore, dimensione, significato dei fiori); il libro 'Enciclopedia floreale' aiuta a interpretare il lingu…

### `attivita/lettura-metropolitana.png` — Lettura in metropolitana
- **Tipo:** Lettura
- **Dove:** Metropolitana, tragitto casa-scuola
- **Quando:** Di giorno
- **Costo:** gratuito
- **Altri effetti:** Se seduto, leggere durante il tragitto in metropolitana non consuma tempo di gioco: e uno dei modi piu efficienti per avanzare nella lettura dei libri posseduti (una sessione/segnalibro per tragitto).

### `attivita/bagno-pubblico-yongen-jaya.png` — Bagno pubblico (sento) di Yongen-Jaya
- **Tipo:** Mini-gioco
- **Dove:** Yongen-Jaya, vicoli
- **Quando:** Di sera
- **Doti:** Fascino, Fascino
- **Regole:** Attivita serale; nessun costo indicato dalle fonti consultate.
- **Altri effetti:** Nei giorni di pioggia il bagno e quasi vuoto: si puo scegliere di prolungare la permanenza per un possibile punto Fascino extra, con il rischio di svenire e perdere il Fascino guadagnato in cambio di…
- **Premi:** Trofeo 'Getting the Vapors'.

### `attivita/biliardo.png` — Biliardo
- **Tipo:** Mini-gioco
- **Dove:** Kichijoji, Penguin Sniper
- **Quando:** Di sera
- **Costo:** 800 ¥
- **Doti:** Dote variabile
- **Regole:** Si puo invitare un compagno per guadagnare punti Confidente; i bonus non sono influenzati da Persona dello stesso Arcano ne dai risultati scolastici.
- **Altri effetti:** Aumenta il Rango Tecnico condiviso dalla squadra: piu danni con attacchi tecnici, maggiore probabilita di atterramento (100% a Rango 4) e piu combinazioni elementali.
- **Premi:** 1 partita: trofeo 'A Hustler's Journey'; 5 sessioni: premio 'Pool Shark Pup' nel Covo dei Ladri.

### `attivita/freccette.png` — Freccette
- **Tipo:** Mini-gioco
- **Dove:** Kichijoji, Penguin Sniper
- **Quando:** Di sera
- **Costo:** 800 ¥
- **Doti:** Perizia ♪
- **Come si sblocca:** 5 giugno, evento con Ryuji Sakamoto
- **Regole:** Ogni sessione costa 800 yen e comprende due partite (modalita 301/501/701); la difficolta varia in base al rango Staffetta del compagno scelto.
- **Altri effetti:** Aumenta il rango Staffetta (baton pass) del compagno invitato: piu danni, recupero HP/SP e bonus offensivi concatenati nei combattimenti; rango massimo 3 per personaggio. Due alleati casuali assiston…
- **Premi:** 1 partita: trofeo 'Occhio di falco'; 10 partite: premio 'Amante delle freccette' nel Covo dei Ladri.

### `attivita/centro-battute-yongen-jaya.png` — Gabbie di Battuta
- **Tipo:** Mini-gioco
- **Dove:** Yongen-Jaya, backstreets
- **Quando:** Giorno e sera
- **Costo:** 500 ¥
- **Doti:** Perizia
- **Regole:** 5 palle a sessione; premere il tasto al momento giusto per colpire.
- **Altri effetti:** Tre livelli di difficolta per velocita della palla: Beginner 70km/h (500 yen), Intermediate 90km/h (1.000 yen), Advanced 130km/h (3.000 yen). Il libro 'La scienza del baseball' (Hinokuniya, 2.800 yen…
- **Premi:** Homerun: Beginner = accessorio Muscle Anklet (Potenza +2); Intermediate = Anger Bandana; Advanced = Holy Cape (evasione Bless triplicata). 5 homerun su qualsia…

### `attivita/pesca-ichigaya.png` — Pesca al laghetto di Ichigaya
- **Tipo:** Mini-gioco
- **Dove:** Ichigaya, laghetto
- **Quando:** Giorno e sera
- **Costo:** 3000 ¥
- **Doti:** Perizia
- **Come si sblocca:** 6 luglio (evento con Ryuji), oppure leggendo il libro 'Vedetta lacustre'
- **Regole:** Costo 3.000 yen di giorno, 1.000 yen di sera. Prima sessione: 7 Boilie piccole gratis + 3 Boilie medie a fine sessione. Si regola direzione/potenza/distanza del lancio, poi si mantiene l'icona del ga…
- **Altri effetti:** Numero di tentativi = Rango Perizia + 2. I pesci catturati fruttano da 20 a 5.500 punti (Covo dei Ladri) a seconda di specie/dimensione.
- **Premi:** Libro 'Lo zen della pesca' aggiunge mirino e Terzo Occhio per identificare pesci speciali.

### `attivita/sala-giochi-gun-about-akihabara.png` — Sala giochi: Gun About (Akihabara)
- **Tipo:** Mini-gioco
- **Dove:** Akihabara, sala giochi
- **Quando:** Di giorno
- **Doti:** Dote variabile
- **Come si sblocca:** Legato al Confidente della Torre (Shinya Oda); avviabile dal 4 settembre tramite la richiesta Mementos 'I baro non vincono mai'
- **Regole:** Shinya e presente all'arcade il lunedi, martedi e giovedi pomeriggio dopo scuola.
- **Altri effetti:** Il Confidente Torre (Shinya) potenzia l'uso delle armi da fuoco nei combattimenti (limite munizioni, abbattimenti a distanza).

### `attivita/sfida-big-bang-burger.png` — Sfida Big Bang Burger
- **Tipo:** Sfida
- **Dove:** Shibuya, Central Street, Big Bang Burger
- **Quando:** Giorno e sera
- **Costo:** 1500 ¥
- **Doti:** Coraggio, Conoscenza, Perizia
- **Come si sblocca:** Tre sfide progressive: Comet Burger (Coraggio/Conoscenza/Perizia Rango 2), Gravity Burger (Rango 3), Cosmo Town Burger (Rango 4)
- **Regole:** Ogni tentativo costa circa 1.500 yen; costi/soglie possono variare tra le tre sfide (dato non confermato con precisione).
- **Altri effetti:** Ricompense: Comet Burger = accessorio '2nd Mate Badge' (+10 HP) + 3 oggetti Big Bang Burger; Cosmo Town Burger = accessorio 'Captain Badge' (+50 HP) + 10 oggetti Big Bang Burger. Anche il solo tentat…

### `attivita/sfida-pesca-guardiano-ichigaya.png` — Sfida: Guardiano e Boss di Ichigaya
- **Tipo:** Sfida
- **Dove:** Ichigaya, laghetto
- **Quando:** Giorno e sera
- **Costo:** 1200 ¥
- **Come si sblocca:** Guardiano: Perizia Rango 4; Boss: dopo cattura del Guardiano, Perizia Rango 5
- **Regole:** Richiede l'esca speciale 'Boilie sospetto' (1.200 punti). Il Guardiano compare al 7 tentativo in condizioni normali, ma gia al 1 tentativo con pioggia o neve di sera.

### `attivita/studio-biblioteca-scuola.png` — Angolo studio della biblioteca scolastica
- **Tipo:** Studio
- **Dove:** Scuola Shujin, biblioteca
- **Quando:** Di giorno
- **Costo:** gratuito
- **Doti:** Conoscenza
- **Come si sblocca:** Disponibile fino al 20 maggio secondo allgamestaff.it (poi sostituito da altre attivita in biblioteca)

### `attivita/studio-diner-shibuya.png` — Studio al Diner di Shibuya
- **Tipo:** Studio
- **Dove:** Shibuya, Diner (Central Street)
- **Quando:** Giorno e sera
- **Doti:** Conoscenza
- **Altri effetti:** Ordinando piatti specifici si guadagnano punti anche in altre doti: 'Bistecca nostalgica' -> Gentilezza; 'Caffe bollente' -> Coraggio; 'Frui-te' -> Fascino; 'Sandwich a sorpresa' -> Coraggio (lentame…

### `attivita/studio-leblanc.png` — Studio serale a Leblanc
- **Tipo:** Studio
- **Dove:** Leblanc
- **Quando:** Di sera
- **Costo:** gratuito
- **Doti:** Conoscenza

## 27. Segni per gli elementi rimasti spogli (12) — `ui/segno-<chiave>.png` (128×128, trasparente) — richiesti e consegnati il 2026-09-08
<!-- Consegnati da `candidato/grafica-extra-segni-v1`: 13 file 128×128 RGBA, nessuna altra riga toccata.
     Agganciati in `IconaSegno` (`src/components/shared/IconaAzione.tsx`) e usati in Film, Libri,
     Richieste, Videogiochi, Covo, Trofei, Compendio personale, la finestra del Palazzo e il
     cartellino «Da verificare». Restano qui come specifica e tracciabilità. -->
Ultimo giro sulle schermate che l'utente ha segnalato come «scarne a livello grafico»: pulsanti e
riquadri fatti di sola scritta, dove una figura piccola cambia la leggibilità a colpo d'occhio.
Regole comuni: 128×128 trasparente, bianco/grigio/nero/rosso, niente oro, nessun testo, un soggetto
solo. L'app le mostra a **18–24 px** dentro pastiglie e tessere, quindi devono reggere piccole.

**Le tessere dei numeri** (`Numero`, `.kpi-tile`) sono la voce più ripetuta: stanno su Film, Libri,
Videogiochi, Covo dei Ladri, Richieste, Trofei e Home, e oggi sono un numero grande con
un'etichetta minuscola sotto. Il segno va **accanto all'etichetta**, non al posto del numero.
| File | Dove sta, e accanto a che testo | Soggetto |
|---|---|---|
| `segno-iniziati.png` | «Titoli iniziati», «Giochi» | segnalibro appena infilato in un foglio |
| `segno-completati.png` | «Completati», «Risolti» | spunta dentro un cerchio spezzato |
| `segno-sessioni.png` | «Sessioni obiettivo», «0/42» | clessidra bassa con due tacche |
| `segno-visioni.png` | «Visioni registrate» | occhio con la ciglia marcata |
| `segno-round.png` | «Round», «3/20» | pad con la freccia che gira |
| `segno-medaglie.png` | «Medaglie P», «Prezzi 3-10» | medaglia con il nastro corto |
| `segno-catalogo.png` | «Voci di catalogo», «36» | schedario con la linguetta alzata |
| `segno-sfide.png` | «Sfide», «52» | pugno chiuso dentro un cerchio |

**La finestra del Palazzo** (`LineaDelTempo`) è tre pastiglie in fila — «Si apre», «Furto
consigliato», «Scade» — con la data sotto e nient'altro: il colore distingue, la forma no.
| File | Tappa | Soggetto |
|---|---|---|
| `segno-si-apre.png` | «Si apre» | cancello socchiuso con la freccia che entra |
| `segno-furto.png` | «Furto consigliato» | biglietto da visita con l'angolo strappato |
| `segno-scade.png` | «Scade» | clessidra rovesciata con l'ultima sabbia |

**Lo stato di una riga del catalogo**, che oggi è la sola scritta «Da verificare» accanto a nomi di
negozi e articoli presi da fonti secondarie.
| File | Dove | Soggetto |
|---|---|---|
| `segno-da-verificare.png` | chip «Da verificare», «da fonte secondaria» | lente d'ingrandimento su un punto interrogativo |

**Una tessera scoperta, e la sua è una svista vecchia.** `ui/scheda-letture.png` — la scheda
«Letture e giochi» della Partita — non è mai stata censita: la chiave è nata nel codice quando la
scheda è stata aggiunta, e la §16 elenca le altre diciotto ma non lei. È l'unica delle trentuno
tessere dell'app a mostrare ancora la riserva.
| File | Scheda | Soggetto |
|---|---|---|
| `scheda-letture.png` | Partita → «Letture e giochi» | libro chiuso con un pad appoggiato sopra |

Ognuno di questi nasce con la sua riserva SVG in codice: se l'immagine non arriva, il segno c'è
lo stesso e la tessera non resta vuota.

## 28. La tessera della scheda «Denaro e squadra» (1) — `ui/scheda-squadra.png` (256×256, trasparente) — richiesta il 2026-09-08
La Partita ha una scheda nuova — i yen del gruppo e livello ed esperienza dei dieci Ladri — e la sua
tessera è l'unica delle trentadue a mostrare ancora la riserva SVG (tre sagome di persone). Stesse
regole delle tredici della §25: 256×256 trasparente, bianco/grigio/nero/rosso, niente oro, nessun
testo, un soggetto solo, leggibile a 40 px.

| File | Scheda | Soggetto |
|---|---|---|
| `scheda-squadra.png` | Partita → «Denaro e squadra» | tre maschere dei Ladri affiancate sopra una borsa di monete, la maschera centrale un poco più avanti |

Va distinta dalle due tessere vicine: `scheda-confidenti` (due figure che si stringono la mano) e
`scheda-doti` (la stella). Qui il soggetto è **il gruppo con la sua cassa**, non il legame fra due
persone: le maschere dicono chi sono, la borsa dice che la scheda parla anche di soldi.

**Risolta il 2026-09-08. Il primo file su `main` non era il disegno.** Il render mostrato era giusto —
tre maschere, la borsa, le monete, contorni neri — ma il PNG committato ha i toni collassati su un
colore solo: **100% dei pixel opachi rossi**, nessun bianco, nessun nero, contro il 13–21% di rosso
delle altre trentuno (`scheda-doti` 21%, `scheda-confidenti` 15%). Si riconosce ancora il contorno
del disegno, quindi non è un soggetto diverso: è lo stesso, appiattito dopo la generazione.

Scandendo tutti i 257 file di `ui/`, `attivita/` e `decori/` il difetto risulta **isolato a questo
file**: gli altri sette che superano il 90% di rosso sono i `nav-*-attiva`, che sono silhouette
rosse per progetto (`nav-home` 0%, `nav-home-attiva` 100%: la coppia funziona così).

La riesportazione corretta stava **non committata** nel worktree del generatore, e senza guardarci
dentro prima di chiuderlo sarebbe andata persa: 128×128 come le sorelle, 23% rosso / 19% chiaro /
48% scuro, cioè in famiglia con `scheda-letture` (20/21/51). È quella che sta su `main` adesso.

## 29. Icone e illustrazioni degli effetti della voce, delle attività nuove e due riconsegne (18)

Tutti i 18 file sono consegnati. I gruppi A e R sono in `public/asset/ui/` e in uso. Il gruppo B (illustrazioni delle attività) sta
in `docs/grafica/asset-generati/2026-10-29/attivita/` finché non è caricato nel database con `PUT /api/immagini/attivita/<chiave>`
(PNG come corpo, `Content-Type: image/png`). Il gruppo C è in `public/asset/ui/` ma si vede solo dopo l'aggancio nel codice, che
chiede il sì dell'utente. Elenco e soggetti, per rigenerarli:

**Gruppo A — icone con la chiave già nel codice** (`public/asset/ui/`, 128×128, trasparenti). Le prime cinque erano già
in questa sezione (§21, aggiunte dell'1, 25 e 26 ottobre) ma non sono mai arrivate: la consegna del 29 ne riporta i prompt
completi.

| File | Uso nell'app | Soggetto |
|---|---|---|
| `azione-su.png` | «Sposta su di un posto» in 12 elenchi riordinabili (Diario, acquisti, infiltrazioni, aree, regole di Tokyo, editor dei Confidenti) e «Sali al rango» / «Aggiorna il rango» di un Confidente, pulsanti primari rossi a 20–22 px (§21, 2026-10-01) | freccia spessa e slanciata verso l'alto sopra una base orizzontale corta |
| `azione-giu.png` | «Sposta giù di un posto» negli stessi 12 elenchi (§21, 2026-10-01) | lo specchio esatto di `azione-su` |
| `azione-scarta.png` | otto usi col senso di «lasciar fuori»: parti illeggibili nei moduli, «Incolla senza gli effetti segnalati», «Scarta» e «Non applicare» una proposta, «Cancella ricerca» del Diario (§21, 2026-10-25, soggetto **rifatto**) | l'imbuto dei filtri senza le tre righe che entrano, con un pezzetto di carta appallottolato espulso di lato |
| `azione-ricevute.png` | ricevute degli effetti della spunta (§21, 2026-10-25) | scontrino con il bordo basso a denti di sega |
| `azione-taglia.png` | «Taglia» le voci del Diario (§21, 2026-10-26) | forbici aperte viste di lato |
| `scheda-persona-partita.png` | tessera «Persona della partita» (22 px) | maschera da ladro davanti a tre carte a ventaglio |

**Gruppo B — illustrazioni delle attività nuove** (database di gioco, ambito `attivita`, 256×256, trasparenti; stesse regole
della §26, prompt costruiti dal testo della scheda).

| Chiave | Attività | Soggetto |
|---|---|---|
| `attivita/estrazione-lotteria` | Estrazione della lotteria (Shibuya, Piazza della Stazione) | chiosco della lotteria con il biglietto controllato allo sportello |
| `attivita/concimare-pianta` | Concimare la pianta della mansarda (Leblanc) | pianta in vaso sul davanzale e sacchetto di concime |
| `attivita/fabbricazione-strumenti` | Fabbricazione degli strumenti d'infiltrazione (Leblanc, mansarda, sera) | banco di lavoro con lampada, materiali e grimaldello finito |
| `attivita/fabbricazione-kawakami` | Fabbricazione degli strumenti di Kawakami (Leblanc, sera) | bancone con grembiule da domestica piegato e strumenti in fila |

**Gruppo R — riconsegne** (stesso disegno; nel contorno di 3 px nessun pixel con alfa > 8, la soglia della consegna del
2026-09-29): `ui/allerta-ondata-di-calore` e `ui/allerta-ondata-di-gelo`, perché il soggetto tocca il bordo.
`ui/allerta-polline`, `ui/allerta-stagione-influenzale` e `attivita/videogioco-golfer-sarutahiko` hanno solo un alone con
alfa ≤ 4 che non si vede: con quella soglia sono accettati e non vanno rifatti.

**Gruppo C — figure dei tipi di effetto della voce** (`public/asset/ui/`, 128×128): una figura propria per i tipi di effetto
che prima condividevano quella della famiglia, agganciate in `MENU_EFFETTI` (`src/utils/effettiDellaVoce.ts`); senza il file
resta la figura della famiglia (`catenaCategoria` in `src/utils/categorie.ts`).

| File | Tipo di effetto | Soggetto |
|---|---|---|
| `categoria-yen.png` | `yen` | pila di tre monete di sbieco con una quarta che cade |
| `categoria-oggetto-ricevuto.png` | `oggetto` | sacchetto chiuso con una freccia che entra dall'alto |
| `categoria-oggetto-uscito.png` | `uscitaOggetto` | lo stesso sacchetto, aperto, con la freccia che esce di lato |
| `categoria-persona-tolta.png` | `personaTolta` | carta con la maschera tagliata in diagonale, la metà destra che si stacca |
| `categoria-punti-confidente.png` | `puntiConfidente` | due mani che si stringono con tre note musicali che salgono |
| `categoria-trofeo.png` | `trofeo` | coppa a due manici su base a gradino, con una stella sul corpo |

## Priorità e ordine di generazione delle sezioni 30–34 (richieste del 2026-11-18)

24 elementi censiti, **14 da generare ora** e **10 rimandati** (si generano solo se l'utente li chiede). Ordine consigliato:

| Ordine | Sezione | Elementi | Priorità | Motivo |
|---|---|---|---|---|
| 1 | §33 stati vuoti ed errori | `vuoto-ricerca` (serve in 5 punti), poi `vuoto-giornata`, `errore-offline`, `errore-server`, `vuoto-confidenti`, `vuoto-proposte` | alta | oggi sono righe di testo nelle schermate più viste |
| 2 | §31 | `segno-trama-confidente` | alta | l'unico modo di distinguere una Trama collegata a un Confidente dal ritratto di una voce Confidente |
| 3 | §31 | `segno-consigliata`, `segno-non-dovuta` | media | oggi sono testo; il colore da solo non basta |
| 4 | §34 | `intestazione-diario`, `-compendio`, `-fusione`, `-luoghi` | media | lo spazio `illustrazione` è vuoto; le quattro sicure |
| 5 | §30 | `segno-scorta-pronta` | bassa | rinforza un colore con una figura; resta una sola richiesta attiva |
| — | §30 | `segno-scorta-qualunque`, `segno-scorta-precisa` | rimandate | a 16 px sono quasi indistinguibili da `scheda-scorta` e da `scheda-persona-partita` |
| — | §32 | i tre sigilli e le tre varianti `-senza-testo` | rimandati | nessun consumatore nel codice, duplicano il chip «Completato»; solo con il sì dell'utente |
| — | §34 | `intestazione-home`, `intestazione-partita` | rimandate | l'intestazione di Partita ha padding e gap a 0 (`.intestazione--partita`) e sul telefono una riga di 44 px (`max-md:h-11`), quella della Home perde il sottotitolo a schermo basso: misurato il 2026-11-18, con la figura rientrano nel 30% ma costano spazio a schermate di lavoro (§34), quindi non si collegano |

## 30. Segni della scorta di una voce (3: 1 richiesta attiva, 2 rimandate) — `ui/segno-<chiave>.png` (128×128, trasparente) — richiesti il 2026-11-18

**Perché servono.** L'elenco «In scorta» di una voce del Diario (`RequisitiVoce.tsx`) è fatto di chip con l'icona dell'arcano, il nome e un cerchio di
spunta; la testata è la scritta «IN SCORTA», il contatore «n/N» e una barra. Tre cose si dicono oggi solo col colore o col testo: **tutto spuntato** («pronta»
è il solo verde del contatore e della barra, `.scorta-voce--pronta`), **arcano intero** e **Persona precisa** (nel chip la seconda è solo il suffisso « · Nome»).
Il colore da solo non basta (regola dei segni, §27): serve una figura piccola accanto al testo, che il testo non sostituisce.

Stesse regole della §27: 128×128 trasparente, bianco/grigio/nero con **un solo accento rosso** `#e5352b`, niente oro, nessun testo, un soggetto solo,
contorno nero spesso e uniforme, ombra rossa sfalsata in basso a destra, soggetto che occupa l'80% del quadrato (almeno 3 px liberi sul bordo). Chiavi nuove di
`ChiaveSegno` (`IconaAzione.tsx`, oggi 12 chiavi, nessuna di queste): sono **da aggiungere con la riserva SVG, intervento di codice a parte che chiede il sì dell'utente**; la riga nel registro 7 di `fabbisogno.md` c'è già.

| File | Priorità | Dove sta, accanto a che testo | Soggetto | A 16 px | A 24 px |
|---|---|---|---|---|---|
| `segno-scorta-pronta.png` | bassa, **richiesta attiva** | testata di `.scorta-voce` accanto a «n/N» quando tutte le caselle sono spuntate; riga ripiegata di una voce fatta | tre carte da gioco a ventaglio viste di fronte, una grande spunta bianca sulla carta centrale | restano il ventaglio e la spunta, senza dettagli sulle carte | carte distinte, spunta piena |
| `segno-scorta-qualunque.png` | **rimandata** (quasi indistinguibile a 16 px da `scheda-scorta`) | chip di un requisito senza Persona (arcano intero), accanto al nome | pila di tre carte sovrapposte e sfalsate, viste dal dorso; sulla prima una maschera da ladro **vuota** in contorno tratteggiato | tre bordi sfalsati e il tratteggio | maschera tratteggiata leggibile |
| `segno-scorta-precisa.png` | **rimandata** (quasi indistinguibile a 16 px da `scheda-persona-partita`) | chip di un requisito con una Persona specifica, accanto al suffisso « · Nome» | una sola carta frontale con la maschera piena e quattro angoli di mirino che la inquadrano | carta, maschera piena e angoli | mirino a quattro angoli distinti |

Vanno tenuti **distinti fra loro e dalle figure già consegnate**: `scheda-scorta` (due carte sovrapposte: non una pila di tre), `scheda-persona-partita`
(maschera davanti a tre carte a ventaglio), `segno-completati` (spunta dentro un cerchio spezzato), `azione-raggiunto` (spunta in cerchio). Qui la spunta sta **sulle carte**.

Prompt pronti (anteporre il blocco di stile del §0, in coda il prompt negativo del §0):

```
[blocco di stile §0] Segno minuscolo per l'interfaccia di Persona 5 Royal, PNG 128×128 con sfondo trasparente: tre carte da gioco verticali a ventaglio viste di fronte, con una grande spunta bianca sulla carta centrale. Forme piatte bianche #ececf1 con contorno nero #0b0b0e spesso e uniforme, angoli tagliati in diagonale, un solo accento rosso #e5352b nel bordo di una carta, ombra rossa sfalsata in basso a destra. Soggetto all'80% del quadrato, margine libero di almeno 3 px. Nessun testo, nessun numero, niente oro. Deve leggersi a 16 px. → segno-scorta-pronta.png
[prompt negativo §0]
```
```
[blocco di stile §0] Segno minuscolo per l'interfaccia di Persona 5 Royal, PNG 128×128 con sfondo trasparente: una pila di tre carte da gioco sovrapposte e leggermente sfalsate viste dal dorso (motivo a rombi); sulla carta più in alto una maschera da ladro VUOTA disegnata solo in contorno tratteggiato. Forme piatte bianche #ececf1 e grigio #6f6f80 con contorno nero #0b0b0e spesso, angoli tagliati, accento rosso #e5352b nel tratteggio, ombra rossa sfalsata in basso a destra. Nessun testo, niente oro, distinta da due sole carte sovrapposte. Deve leggersi a 16 px. → segno-scorta-qualunque.png
[prompt negativo §0]
```
```
[blocco di stile §0] Segno minuscolo per l'interfaccia di Persona 5 Royal, PNG 128×128 con sfondo trasparente: una sola carta da gioco frontale con una maschera da ladro PIENA al centro, inquadrata da quattro angoli di mirino (due tratti a L per angolo). Forme piatte bianche #ececf1 con contorno nero #0b0b0e spesso, angoli tagliati in diagonale, mirino rosso #e5352b, ombra rossa sfalsata in basso a destra. Nessun testo, niente oro, niente ventaglio di carte. Deve leggersi a 16 px. → segno-scorta-precisa.png
[prompt negativo §0]
```

Verifica di consegna: 128×128 esatti, alfa nativo, nessun pixel con alfa > 8 nel contorno di 3 px, leggibilità a 16 px su fondo `#0b0b0e`, `#23232d` e rosso `#d42d24` (chip spuntato), nome identico alla chiave.

## 31. Segni di stato e di collegamento della voce (3) — `ui/segno-<chiave>.png` (128×128, trasparente) — richiesti il 2026-11-18

**Perché servono.** Tre informazioni della riga d'azione sono solo parole o colore: la voce **Trama collegata a un Confidente** (da `14e44b6a`, il collegamento è facoltativo e non
produce incontro, rango né effetti) mostra nel ritratto da 40 px la stessa faccia di una voce Confidente, e a colpo d'occhio le due non si distinguono (`ImmagineAzione`
in `PartiAzione.tsx`); la **Consigliata** è un chip oro con la sola scritta (`chip--oro`); la **Non dovuta** è una riga di testo (`AzioneGiornata.tsx`). Il lucchetto di
«bloccata» esiste già (`azione-bloccato`) e non si rifà. Stesse regole della §30; le chiavi nuove di `ChiaveSegno` sono **da aggiungere con la riserva SVG, intervento di codice a parte che chiede il sì dell'utente**.
Per `segno-trama-confidente` i «3 px liberi» valgono per l'**alfa del contorno** (nessun pixel con alfa > 8 nei 3 px del bordo del file): il tassello rosso riempie il quadrato *dentro* quel margine, non fino al bordo.
Priorità: `segno-trama-confidente` **alta**; `segno-consigliata` e `segno-non-dovuta` **media**.

| File (priorità) | Dove sta | Soggetto | A 16 px | A 24 px | A 44 px |
|---|---|---|---|---|---|
| `segno-trama-confidente.png` (alta) | angolo in basso a destra del ritratto da 40 px (sovrapposto, 18–20 px) delle voci Trama collegate a un Confidente | tassello quadrato rosso `#e5352b` a taglio diagonale, dentro un biglietto da visita bianco con l'angolo piegato e un anello di catena sul lato sinistro; il tassello **riempie** il quadrato (separa la figura dal ritratto) | biglietto bianco su rosso e anello come un punto | catena distinta | angolo piegato e due righe sul biglietto |
| `segno-consigliata.png` (media) | chip «Consigliata», 14 px, accanto al testo | lampadina a ritaglio con cinque raggi taglienti, **riempita di bianco** (il giallo lo dà il chip dell'app, nella figura niente oro) | lampadina e raggi come tacche | attacco a vite visibile | filamento a zig-zag |
| `segno-non-dovuta.png` (media) | riga «Non dovuta: manca …», 14 px, davanti alla frase | foglio con l'angolo piegato e due righe, attraversato da una barra diagonale spessa rossa che esce dai bordi del foglio | foglio e barra | righe distinte | angolo piegato e barra con bordo nero |

Distinte da `azione-annulla` (croce in cerchio), `segno-da-verificare` (lente su un punto interrogativo), `azione-bloccato` (lucchetto) e `categoria-trama`
(biglietto da visita con l'angolo piegato, senza tassello: **qui il biglietto sta dentro un tassello rosso con la catena**).

Prompt pronti (anteporre il blocco di stile del §0, in coda il prompt negativo del §0):

```
[blocco di stile §0] Segno minuscolo da sovrapporre all'angolo di un ritratto, PNG 128×128 con sfondo trasparente: un tassello quadrato rosso #e5352b con due angoli tagliati in diagonale che riempie il quadrato (almeno 3 px liberi sul bordo), contorno nero #0b0b0e spesso; dentro un biglietto da visita bianco #ececf1 con l'angolo in alto a destra piegato e un anello di catena sul lato sinistro che lo aggancia. Ombra rossa sfalsata in basso a destra solo sul contorno esterno. Nessun testo, nessuna lettera sul biglietto, niente oro. Deve leggersi a 18 px. → segno-trama-confidente.png
[prompt negativo §0]
```
```
[blocco di stile §0] Segno minuscolo per l'interfaccia di Persona 5 Royal, PNG 128×128 con sfondo trasparente: una lampadina a ritaglio riempita di bianco #ececf1 con contorno nero #0b0b0e spesso e cinque raggi taglienti attorno, attacco a vite grigio #6f6f80, filamento a zig-zag; un solo accento rosso #e5352b nei raggi, ombra rossa sfalsata in basso a destra. Nessun testo, niente oro, niente giallo. Deve leggersi a 14 px. → segno-consigliata.png
[prompt negativo §0]
```
```
[blocco di stile §0] Segno minuscolo per l'interfaccia di Persona 5 Royal, PNG 128×128 con sfondo trasparente: un foglio verticale bianco #ececf1 con l'angolo in alto a destra piegato e due righe corte (barre), contorno nero #0b0b0e spesso, attraversato da una barra diagonale spessa rossa #e5352b con bordo nero che esce dai bordi del foglio; ombra rossa sfalsata in basso a destra. Nessun testo, nessun cerchio attorno (non è «annulla»), niente oro. Deve leggersi a 14 px. → segno-non-dovuta.png
[prompt negativo §0]
```

Verifica di consegna: come §30; in più `segno-trama-confidente` deve restare leggibile **sopra** un ritratto qualunque a 18 px (provare su due ritratti chiari e su uno scuro).

## 32. Sigilli di completamento (3 sigilli × 2 varianti = 6, **tutti rimandati: priorità bassa, solo con il sì dell'utente**) — `ui/sigillo-<chiave>.png` e `ui/sigillo-<chiave>-senza-testo.png` (512×192, trasparente) — richiesti il 2026-11-18

**Perché servono.** L'avanzamento è la promessa del Diario («percorso al 100%») e l'app non festeggia mai il traguardo: un Palazzo completato è un chip di testo
(`livello.testo === 'Completato'` in `DungeonPage.tsx` e `DungeonDettaglioPage.tsx`), una giornata con tutte le voci fatte non cambia aspetto (`PercorsoPage.tsx`, la riga
del selettore giorno mostra solo «fatte/azioni»). Un timbro è il segno più P5 per dire «chiuso»: grosso, un po' storto, con i bordi sfaldati dal retino. È l'unico
gruppo di questo giro che porta lettere: **testo solo in italiano, e per ognuno esiste la variante `-senza-testo`** (cornice vuota, il testo lo scrive l'app con il proprio
font se il generatore sbaglia le lettere).

Regole: 512×192, trasparente, **inclinato di circa −6°** dentro il canvas (almeno 3 px liberi su tutti i bordi anche dopo la rotazione); doppio filetto, angoli
tagliati, lettere maiuscole a ritaglio di giornale, usura a retino (puntini) solo **dentro** il segno, mai sul bordo del canvas; colori pieni senza trasparenze parziali
se non sui bordi antialias. Si legge a **96–160 px di larghezza** (sovrapposto all'angolo dell'emblema di un Palazzo o accanto al selettore del giorno): sotto i 96 px
si usa la variante senza testo.

| File | Testo | Dove sta | Colori | Soggetto |
|---|---|---|---|---|
| `sigillo-completato.png` | COMPLETATO | Palazzo o Memento completato (chip `Completato`, sovrapposto all'emblema) | rosso `#e5352b` pieno, filetti neri, testo bianco | timbro rettangolare a doppio filetto, ai lati due piccole stelle |
| `sigillo-concluso.png` | CONCLUSO | Palazzo concluso (Tesoro rubato, non completato al 100%) | bianco `#ececf1` con filetti neri e testo nero, ombra rossa sfalsata | timbro a rombo allungato, con una spunta prima del testo |
| `sigillo-giornata.png` | GIORNATA COMPLETA (due righe) | giornata del Diario con tutte le voci fatte, accanto al selettore del giorno con «fatte/azioni» (`PercorsoPage.tsx`; il chip «Oggi nella partita» compare solo se il giorno mostrato è quello corrente, quindi non è il suo posto) | nero `#0b0b0e` con filetti bianchi, testo bianco, un'unica stella rossa | timbro quasi quadrato, sole e luna ai due lati del testo |
| `…-senza-testo.png` (×3) | — | stessa posizione | stessi colori | stessa cornice, al posto del testo una fascia vuota del colore di fondo |

Distinti da `badge-*` (§7.3, etichette a parallelogramma, non timbri), da `timbro-ottenuto` e `timbro-vuoto` (i Timbri dei Mementos, che sono oggetti di gioco) e da `segno-completati`.

Prompt pronti (anteporre il blocco di stile del §0, in coda il prompt negativo del §0; per la variante senza testo sostituire «testo» con «fascia vuota»):

```
[blocco di stile §0] Timbro di gomma di completamento per l'interfaccia di Persona 5 Royal, PNG 512×192 con sfondo trasparente, inclinato di circa -6 gradi, con almeno 3 px liberi su tutti i bordi del canvas: rettangolo a doppio filetto con angoli tagliati in diagonale, riempimento rosso pieno #e5352b, filetti neri #0b0b0e, due piccole stelle a cinque punte ai lati, al centro la scritta in maiuscolo a ritaglio di giornale bianca "COMPLETATO" (testo in italiano, nessun'altra parola). Usura a retino di puntini solo dentro il timbro. Nessun oro, nessun'altra scritta. → sigillo-completato.png ; variante: stessa cornice con una fascia vuota rossa al posto del testo → sigillo-completato-senza-testo.png
[prompt negativo §0]
```
```
[blocco di stile §0] Timbro di completamento per l'interfaccia di Persona 5 Royal, PNG 512×192 con sfondo trasparente, inclinato di circa -6 gradi, almeno 3 px liberi sui bordi: forma a rombo allungato con angoli tagliati, riempimento bianco #ececf1, filetti e testo neri #0b0b0e, ombra rossa #e5352b sfalsata in basso a destra, a sinistra una spunta spessa, al centro la scritta in maiuscolo "CONCLUSO" (testo in italiano, nessun'altra parola). Usura a retino solo dentro il timbro. Nessun oro. → sigillo-concluso.png ; variante con fascia vuota al posto del testo → sigillo-concluso-senza-testo.png
[prompt negativo §0]
```
```
[blocco di stile §0] Timbro di completamento per l'interfaccia di Persona 5 Royal, PNG 512×192 con sfondo trasparente, inclinato di circa -6 gradi, almeno 3 px liberi sui bordi: forma quasi quadrata con angoli tagliati, riempimento nero #0b0b0e con doppio filetto bianco #ececf1, ai due lati un sole a raggi netti e una luna crescente, al centro su due righe la scritta in maiuscolo bianca "GIORNATA" e "COMPLETA" (testo in italiano, nessun'altra parola), una sola stella rossa #e5352b in alto. Usura a retino solo dentro il timbro. Nessun oro. → sigillo-giornata.png ; variante con fascia vuota al posto delle due righe → sigillo-giornata-senza-testo.png
[prompt negativo §0]
```

Verifica di consegna: 512×192 esatti, alfa nativo, nessun pixel con alfa > 8 nel contorno di 3 px (la rotazione non deve toccare il bordo), lettere accentate assenti (le tre parole non ne hanno), leggibilità del testo a 160 px; se le lettere sono sbagliate si consegna la variante senza testo e si scrive nel registro 7.

## 33. Stati vuoti ed errori nuovi (6, priorità alta) — `illustrazioni/<chiave>.png` (1200×800, trasparente, nel database) — richiesti il 2026-11-18

**Perché servono.** Le illustrazioni di stato esistenti sono otto (`vuoto-persona`, `vuoto-partita`, `vuoto-obiettivi`, `vuoto-piani`, `vuoto-cicli`, `vuoto-storico`, `errore`,
`caricamento`) e coprono le schede della Partita; quel che l'utente vede più spesso resta una riga di testo: il **giorno senza voci** del Diario, la **ricerca senza risultati**
(Diario, scorta, filtri del Compendio), il **«Nessun Confidente è ancora avviabile»**, e i due modi in cui una pagina non si carica — **offline** e **server non raggiungibile** — che
`VistaErrore` rende entrambi con l'unica `errore-senza-testo` anche se i titoli sono già distinti (`titoloPerCausa`, `PageState.tsx`).

**Priorità: alta** (ordine: `vuoto-ricerca`, che serve in cinque punti, poi `vuoto-giornata`, `errore-offline`, `errore-server`, `vuoto-confidenti`, `vuoto-proposte`).

**Regola per le figure nuove di §33 e §34: sono senza lettere, quindi il nome del file è la chiave senza suffisso e non esiste nessuna variante `-senza-testo`.** Le illustrazioni
vecchie che hanno lettere (`vuoto-persona`, `vuoto-partita`, `vuoto-obiettivi`, `vuoto-piani`, `vuoto-cicli`, `vuoto-storico`, `errore`) **restano con il loro nome e con le loro due varianti**. Titolo e suggerimento li scrive sempre l'app
(`EmptyState`, `VistaErrore`). Gli stati che hanno lettere nell'immagine si usano solo nella variante `-senza-testo`: la usano i cinque `EmptyState` di `CicliSalvati`, `ObiettiviPartita`,
`PianiSalvati`, `ScortaPersona` e `StoricoPartita`, la 404, `PartitaPage` e `GestionePartite`. Il nome del file nuovo è la chiave che il codice passa a `illustrazione`; il codice è già collegato e
le figure compaiono da sole quando sono nel database (`PUT /api/immagini/illustrazioni/<chiave>`), con ripiego sull'illustrazione neutra (`EmptyState`), su niente (`FiguraVuoto`) o su `errore-senza-testo` (`VistaErrore`).

Regole comuni (§8): inchiostro bianco e nero più rosso, retino nelle ombre, soggetto **centrato con molto vuoto intorno**, composizione che regge a **80 px di altezza**
(404 e pagine compatte, `max-h-[min(80px,9dvh)]`) e a 200 px (stato vuoto normale); nessun personaggio riconoscibile; nessun testo; almeno 3 px liberi sul bordo.

| File | Dove | Scena |
|---|---|---|
| `vuoto-giornata.png` | giorno senza voci nel Diario (`GiornoGuida.tsx`, fasce vuote) e «giorno non coperto dalle fonti» | agenda aperta a due pagine bianche, sulla sinistra un sole e sulla destra una luna a ritaglio; una matita appoggiata in diagonale e una maschera bianca che sbircia dal bordo |
| `vuoto-ricerca.png` | «Nessuna voce del Diario contiene …» (`RicercaDiario.tsx`), «Nessuna Persona corrisponde ai filtri» (`ScortaPersona.tsx`), filtri del Compendio, delle Skill e del Glossario | grande lente d'ingrandimento che inquadra un foglio vuoto con tre righe tratteggiate, un punto interrogativo a ritaglio che sale, ombra lunga |
| `vuoto-confidenti.png` | «Nessun Confidente è ancora avviabile» (`ConfidentiPartita.tsx`, gruppo degli attivi a inizio partita) | bancone del Leblanc con due sgabelli vuoti e uno smartphone sul piano con una bolla di messaggio a tre puntini; tazza fumante |
| `errore-offline.png` | pagina senza rete (`causa === 'offline'`) | spina elettrica staccata dalla presa con una scintilla rossa fra i due poli, onde di segnale barrate da una diagonale |
| `errore-server.png` | server non raggiungibile (`causa === 'rete'` o `'timeout'`) | torre di tre cassetti di server con un lampo rosso che la attraversa, un lucchetto appeso a un cassetto, filo di fumo; distinta dalla ghigliottina inceppata di `errore` |
| `vuoto-proposte.png` | «Nessuna proposta in questo periodo» (`DaCompletarePage.tsx`, riga di stato sotto i filtri) | cassetta delle lettere aperta e vuota, con un biglietto da visita piegato che pende dalla fessura e un calendario a strappo accanto; ombra lunga |

Distinte da `vuoto-persona` (maschera su un tavolo con lampada), `vuoto-partita` (sedia vuota nella cella), `vuoto-storico` (orologio con pagina strappata) e `errore`.

**Già esistente, non si chiede.** «Nessuna partita ancora» (`GestionePartite.tsx`, Impostazioni) e «Nessuna partita attiva» (`PartitaPage.tsx`) hanno già la figura `illustrazioni/vuoto-partita`
(e `vuoto-partita-senza-testo`) fra i file consegnati: il difetto è nel codice, che non la passa (`PartitaPage` non dà `illustrazione`; `GestionePartite` è una riga di testo). Ricollegamento nel
codice, punto aperto in `fabbisogno.md` e in `ROADMAP.md`.

Prompt pronti (anteporre il blocco di stile del §0, in coda il prompt negativo del §0):

```
[blocco di stile §0] Illustrazione di stato vuoto a due colori, bianco e nero più rosso #e5352b, tratto a inchiostro, retino nelle ombre, PNG 1200×800 con sfondo trasparente, composizione centrata con molto spazio vuoto intorno, silhouette leggibile anche a 80 px di altezza. Scena: un'agenda aperta a due pagine bianche, sulla pagina sinistra un sole a raggi netti e sulla destra una luna crescente a ritaglio, una matita appoggiata in diagonale e una maschera bianca da ladro che sbircia dal bordo dell'agenda. Nessun testo, nessun personaggio riconoscibile, niente oro. → vuoto-giornata.png
[prompt negativo §0]
```
```
[blocco di stile §0] Illustrazione di stato vuoto a due colori, bianco e nero più rosso #e5352b, tratto a inchiostro, retino nelle ombre, PNG 1200×800 con sfondo trasparente, composizione centrata con molto spazio vuoto, silhouette leggibile a 80 px di altezza. Scena: una grande lente d'ingrandimento che inquadra un foglio vuoto con tre righe tratteggiate, un punto interrogativo a ritaglio rosso che sale dal foglio, ombra lunga e inclinata. Nessun testo (il punto interrogativo è un segno, non una parola), niente oro. → vuoto-ricerca.png
[prompt negativo §0]
```
```
[blocco di stile §0] Illustrazione di stato vuoto a due colori, bianco e nero più rosso #e5352b, tratto a inchiostro, retino nelle ombre, PNG 1200×800 con sfondo trasparente, composizione centrata con molto spazio vuoto, silhouette leggibile a 80 px di altezza. Scena: il bancone di un piccolo caffè con due sgabelli vuoti, sul piano uno smartphone con una bolla di messaggio a tre puntini e una tazza fumante. Nessun personaggio, nessun testo, niente oro. → vuoto-confidenti.png
[prompt negativo §0]
```
```
[blocco di stile §0] Illustrazione di errore a due colori, bianco e nero più rosso #e5352b, tratto a inchiostro, retino nelle ombre, PNG 1200×800 con sfondo trasparente, composizione centrata con molto spazio vuoto, silhouette leggibile a 80 px di altezza. Scena: una spina elettrica staccata dalla presa, i due poli separati da una scintilla rossa a forma di stella, in alto tre onde di segnale barrate da una diagonale nera. Nessun testo, niente oro. → errore-offline.png
[prompt negativo §0]
```
```
[blocco di stile §0] Illustrazione di errore a due colori, bianco e nero più rosso #e5352b, tratto a inchiostro, retino nelle ombre, PNG 1200×800 con sfondo trasparente, composizione centrata con molto spazio vuoto, silhouette leggibile a 80 px di altezza. Scena: una torre di tre cassetti di server sovrapposti attraversata da un lampo rosso, un lucchetto appeso al cassetto in mezzo e un filo di fumo che sale dal cassetto in alto; non una ghigliottina. Nessun testo, niente oro. → errore-server.png
[prompt negativo §0]
```

```
[blocco di stile §0] Illustrazione di stato vuoto a due colori, bianco e nero più rosso #e5352b, tratto a inchiostro, retino nelle ombre, PNG 1200×800 con sfondo trasparente, composizione centrata con molto spazio vuoto, silhouette leggibile a 80 px di altezza. Scena: una cassetta delle lettere aperta e vuota, un biglietto da visita piegato che pende dalla fessura, accanto un calendario a strappo con la pagina staccata. Nessun testo, nessun numero leggibile, niente oro. → vuoto-proposte.png
[prompt negativo §0]
```

Consegna: si caricano nel database con `PUT /api/immagini/illustrazioni/<chiave>` (PNG come corpo, `Content-Type: image/png`). Verifica: 1200×800 esatti, alfa nativo, nessun pixel con alfa > 8 nel contorno di 3 px.

## 34. Illustrazioni di intestazione delle pagine principali (4 da generare, priorità media; 2 rimandate) — `illustrazioni/intestazione-<chiave>.png` (512×512, trasparente, nel database) — richieste il 2026-11-18

**Perché servono.** `IntestazionePagina` ha uno spazio per un'illustrazione a destra del titolo (`illustrazione`, classe `intestazione__illustrazione`: altezza `clamp(64px, 11dvh, 120px)` e al più 40vw, 64 px e 26vw sul
telefono), accanto alla riga del titolo. Collegate (ripiego «nulla»: senza il file nessuno spazio, con il file compare da sola): Diario (`PercorsoPage`, non con la ricerca attiva), Compendio, Fusione e
Luoghi (`IndiceLuoghi`, `DungeonPage`, `CittaPage`) con `intestazione-diario`, `-compendio`, `-fusione`, `-luoghi`. **Misurato il 2026-11-18** (figura presente, 1366×657, 1280×689, 1024×690, 768×1024, 375×812): l'intestazione resta al più
al 21,9% dell'altezza della schermata. `intestazione-partita` e `intestazione-home` **non si collegano**: la figura le porta nel 30% (Home al più 12,0%, Partita 11,3%) ma costa spazio a schermate di lavoro (Home 47→78 px a 1366×657 e 38→74 a 375×812;
Partita 46→74 e a 1024 la fila dei dati perde ~92 px di larghezza), vedi `fabbisogno.md`; non si generano se l'utente non lo chiede.

**Una sola figura piena e silhouette alta contrasto**, perché a 64 px di altezza (telefono) e col `drop-shadow` del CSS devono restare un'icona grande, non una scena. Regole comuni:
512×512 trasparente, soggetto che occupa l'85% del quadrato con almeno 3 px liberi su tutti i bordi (anche se poggia su una base), bianco/nero/rosso, retino nelle
ombre, nessun testo, nessun personaggio riconoscibile, niente oro.
| File | Pagina | Soggetto | Distinta da |
|---|---|---|---|
| `intestazione-home.png` (**rimandata**, fino alla misura) | Home | valigetta del ladro aperta da cui sporgono una carta da gioco, una chiave e un biglietto da visita piegato | il logo (`identita/logo`, maschera) |
| `intestazione-partita.png` (**rimandata**, fino alla misura) | Partita | taccuino rilegato con una maschera da ladro sulla copertina e tre segnalibri di lunghezza diversa che sporgono dall'alto | `nav-partita` (maschera sola), `scheda-compendio` (libro aperto) |
| `intestazione-diario.png` | Guida giorno per giorno | calendario da tavolo a spirale con un giorno cerchiato a mano, un sole e una luna ai due lati della testata e una spunta rossa sul giorno | `guida/percorso` (foglio di calendario con freccia), `vuoto-giornata` |
| `intestazione-compendio.png` | Compendio | pila di tre carte Persona viste di fronte, sfalsate, con silhouette di maschere diverse | `arcani/*` (le carte degli Arcani), `nav-compendio` |
| `intestazione-fusione.png` | Fusione | due carte che convergono verso un lampo, sotto il lampo la lama di una ghigliottina | `nav-fusione` (frecce che convergono) |
| `intestazione-luoghi.png` | Luoghi, Palazzi, Mappe | profilo cittadino in un unico blocco: castello a due torri, torre radio e imbocco di un tunnel della metropolitana | `guida/mappe` (mappa ripiegata con spillo), `palazzi/*` (stemmi) |

Prompt pronti (anteporre il blocco di stile del §0, in coda il prompt negativo del §0). I primi due, per `intestazione-home` e `intestazione-partita`, sono **rimandati**: la misura (§34, 2026-11-18) ne sconsiglia il collegamento; si usano solo se l'utente lo chiede.

```
[blocco di stile §0] Illustrazione di intestazione per l'interfaccia di Persona 5 Royal, PNG 512×512 con sfondo trasparente, un unico soggetto centrato a figura piena che occupa l'85% del quadrato, silhouette ad alto contrasto leggibile a 64 px di altezza, bianco e nero più rosso #e5352b, tratto a inchiostro, retino nelle ombre, angoli tagliati. Soggetto: una valigetta da ladro aperta da cui sporgono una carta da gioco, una chiave antica e un biglietto da visita con l'angolo piegato. Nessun testo, nessun personaggio, niente oro. → intestazione-home.png
[prompt negativo §0]
```
```
[blocco di stile §0] Illustrazione di intestazione per l'interfaccia di Persona 5 Royal, PNG 512×512 con sfondo trasparente, un unico soggetto a figura piena all'85% del quadrato, silhouette ad alto contrasto leggibile a 64 px, bianco e nero più rosso #e5352b, tratto a inchiostro, retino nelle ombre. Soggetto: un taccuino rilegato con una maschera da ladro bianca sulla copertina nera e tre segnalibri rossi di lunghezza diversa che sporgono dall'alto. Nessun testo, nessun personaggio, niente oro. → intestazione-partita.png
[prompt negativo §0]
```
```
[blocco di stile §0] Illustrazione di intestazione per l'interfaccia di Persona 5 Royal, PNG 512×512 con sfondo trasparente, un unico soggetto a figura piena all'85% del quadrato, silhouette ad alto contrasto leggibile a 64 px, bianco e nero più rosso #e5352b, tratto a inchiostro, retino nelle ombre. Soggetto: un calendario da tavolo a spirale con un giorno cerchiato a mano e una grande spunta rossa su quel giorno, un sole a raggi netti e una luna crescente ai due lati della testata. Nessun numero leggibile, nessun testo, niente oro. → intestazione-diario.png
[prompt negativo §0]
```
```
[blocco di stile §0] Illustrazione di intestazione per l'interfaccia di Persona 5 Royal, PNG 512×512 con sfondo trasparente, un unico soggetto a figura piena all'85% del quadrato, silhouette ad alto contrasto leggibile a 64 px, bianco e nero più rosso #e5352b, tratto a inchiostro, retino nelle ombre. Soggetto: una pila di tre carte verticali sfalsate viste di fronte, su ognuna la silhouette piena di una maschera diversa; la carta in alto con il bordo rosso. Nessun testo, nessun numero romano, niente oro, non le carte degli Arcani. → intestazione-compendio.png
[prompt negativo §0]
```
```
[blocco di stile §0] Illustrazione di intestazione per l'interfaccia di Persona 5 Royal, PNG 512×512 con sfondo trasparente, un unico soggetto a figura piena all'85% del quadrato, silhouette ad alto contrasto leggibile a 64 px, bianco e nero più rosso #e5352b, tratto a inchiostro, retino nelle ombre. Soggetto: due carte inclinate che convergono verso un lampo rosso e, sotto il lampo, la lama triangolare di una ghigliottina. Nessun testo, niente oro, nessun sangue. → intestazione-fusione.png
[prompt negativo §0]
```
```
[blocco di stile §0] Illustrazione di intestazione per l'interfaccia di Persona 5 Royal, PNG 512×512 con sfondo trasparente, un unico soggetto a figura piena all'85% del quadrato, silhouette ad alto contrasto leggibile a 64 px, bianco e nero più rosso #e5352b, tratto a inchiostro, retino nelle ombre. Soggetto: un profilo cittadino in un unico blocco, a sinistra un castello a due torri, al centro una torre radio a traliccio, a destra l'imbocco ad arco di un tunnel della metropolitana con due binari; nessuna copia di edifici reali. Nessun testo, niente oro. → intestazione-luoghi.png
[prompt negativo §0]
```

Consegna: nel database con `PUT /api/immagini/illustrazioni/<chiave>`. Verifica: 512×512 esatti, alfa nativo, nessun pixel con alfa > 8 nel contorno di 3 px, leggibilità a 64 px di altezza su fondo `#0b0b0e` e `#14141a`.
