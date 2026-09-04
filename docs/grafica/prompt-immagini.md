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

## 16. Icone delle schede della Partita (9) — `ui/scheda-<chiave>.png` (128×128, trasparente) — richieste il 2026-09-04
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

## 17. Icone delle azioni (32) — `ui/azione-<chiave>.png` (128×128, trasparente) — richieste il 2026-09-04
Stile delle icone di navigazione §7.1 (tratto bianco spesso, ombra rossa sfalsata, nessun testo, nessun numero salvo dove indicato). L'app le
mostra a 20–26 px dentro i pulsanti a tassello (fondo rosso quando il pulsante è acceso, bianco/nero quando è spento: il tratto bianco
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

## 18. Spilli delle mappe (14) — `ui/spillo-<tipo>.png` (128×128, trasparente) — richiesti il 2026-09-04 (Fase 13)
Stile delle icone di navigazione §7.1: simbolo bianco con contorno nero dentro una goccia da mappa (punta in basso) di colore pieno per tipo
(passaggio blu, negozio verde, forziere oro, tesoro viola, boss rosso, miniboss arancio, sicura azzurro, scorciatoia grigio, Confidente rosa,
attività giallo, ristorante marrone, distributore ciano, treno verde scuro, nota bianco). Senza testo. L'app usa un SVG in codice se manca il file.
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
| `spillo-distributore.png` | distributore automatico | distributore con lattina |
| `spillo-treno.png` | stazione della metropolitana | vagone stilizzato |
| `spillo-nota.png` | nota generica | foglietto con puntina |

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
