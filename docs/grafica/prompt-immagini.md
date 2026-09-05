# Prompt per la generazione degli asset grafici — stile Persona 5 Royal

Versione 3 — 2026-09-04: questo documento elenca SOLO gli asset ancora da consegnare (le sezioni conservano la numerazione storica). Le
specifiche degli asset già consegnati sono in `archivio-grafico.md`; i riferimenti di stile per il lavoro nuovo in `riferimenti-visivi.md`.

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
| `spillo-tesoro.png` | tesoro collezionabile | gemma sfaccettata |
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
