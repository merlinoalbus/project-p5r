# L6 «Condizioni uniche» — casi di layout (preparati prima del lotto)

Sessione «Test layout multi device», 2026-10-20. Fonti: `requisiti.md` R6-31 [L] (e R6-29, R6-30 per l'aspetto); `modifiche.md` §6.1, §6.2 e
§8.6; schermate «prima» di Analisi app in `schermate-prima/` (12 viste × 5 misure).
Strumenti: `strumenti-layout/misura-layout.js` e misura in serie in un iframe (`strumenti-layout/README.md`).
Misure: 1280×800, 1366×657, 1280×689, 1024×690, 768×1024, 375×812. Grafica predefinita. Le finestre si aprono e si chiudono con Annulla:
le prove che salvano passano dal Collaudo, con foto e ripristino.

## Casi
| id | vista | cosa si misura | atteso |
|---|---|---|---|
| L6-L01 | **Editor unico delle condizioni** (`CondizioniEditor`), aperto dal pin dell'editor mappe | scelta del tipo, poi dell'oggetto per nome con ricerca, poi l'anteprima dell'esito. A 375 si apre come **foglio dal basso** (Modal, regola di LAY2-3). Nessuno scorrimento orizzontale; campi, opzioni ed elenco dei risultati ≥ 44 px; elenco dei risultati scorrevole con confine evidente e overscroll contenuto; profondità fino a 4 (gruppi annidati) senza testi a una lettera per riga a 375 | **R6-31**, R6-30 |
| L6-L02 | Editor aperto da **quartiere** («Modifica sblocco» nella pagina del quartiere di L2, con fonte e «Ripristina») | la riga di sblocco nell'intestazione del quartiere non allunga l'intestazione oltre la base; pulsanti ≥ 44 px; foglio dal basso a 375 | R6-31 |
| L6-L03 | Editor da **negozio** (sblocco proprio) e da **catalogo** (articolo, libro, film, attività, videogioco, luogo) | come L6-L01 | R6-31 |
| L6-L04 | **Requisiti dei Confidenti** («Modifica requisiti» nella pagina del Confidente, un rango per riga; sostituisce `CorreggiRequisito`) | righe dei ranghi leggibili a 375, con l'esito («Manca: …») che va a capo per parole; finestra come foglio dal basso | R6-31, R6-29 |
| L6-L05 | **Elenco delle frasi da approvare** | righe ≥ 44 px; se scorre internamente, confine e overscroll contenuto; nessun orizzontale | R6-31 |
| L6-L06 | Testi degli esiti (§6.2): «Manca: Ann al rango 10 oppure leggere "Luoghi della movida"», «Disponibile dall'inizio», «Avviso: …», «Fonte: guida, certezza media — da verificare» | nelle viste che li mostrano (quartiere, schede di La città, metro, libri, negozio, Confidente, calendario, richieste, partita, Oggi) i testi lunghi vanno a capo per parole, senza troncare la parte che dice cosa manca; nessuna crescita di altezza che rompa le pagine «in una schermata» (Palazzi, pagine Area di L2) | R6-29; no-reg di layout |
| L6-L07 | Metro: le date «dal 06-18» diventano «dal 18 giugno» | i cartellini e i timbri «Non ancora aperto · dal …» non vanno su più righe del necessario a 375 e a 768; schede de La città senza testi schiacciati (UX2-7 non deve tornare) | R6-29 |
| L6-L08 | Palazzo: finestra e atterraggio (`AtterraggioTokyo`, date strutturate) | intestazione del Palazzo invariata nelle misure di L3; nessuna barra di pagina nuova a 1366×657, 1280×689, 1024×690 | no-reg di layout (L3) |
| L6-L09 | **Pulsante «Invito avvenuto»** (piano B3+F3) nelle pagine del Confidente, del quartiere e del luogo, con il testo «Non ancora possibile: manca …» | pulsante ≥ 44 px a ogni misura; il testo di ciò che manca va a capo per parole e non spinge il pulsante fuori dal bordo a 375; nessuno scorrimento orizzontale | R6-31; piano L6 «Per i tester» |

## Quando (dal piano di Stesura, `piano.md` «Per i tester»)
| pezzo pronto | cosa misuro |
|---|---|
| B0 + F1 | editor delle condizioni a 375 (foglio dal basso) e a 1280 — L6-L01, L6-L03 |
| B3 + F3 | pulsante «Invito avvenuto» — L6-L09 |
| B4 + F4 | editor dei requisiti dei Confidenti — L6-L04 |
| B5 + F5 | pagina del quartiere con sblocco e fonte — L6-L02, L6-L06, L6-L07 |
| B6 + F6 | giro completo §8.6, alle sei misure, più L6-L05 e L6-L08 |
Si comincia solo con il via del PM.

## Base «prima»
Le schermate «prima» di Analisi app sono in `schermate-prima/`. Prendo le misure dal DOM sul collaudo 5473, in sola lettura, con la base p5s,
sulle stesse 12 viste:
`/guida/citta` (metro), `/guida/citta/odaiba`, `/guida/citta/asakusa`, `/guida/libri`, `/confidenti/takemi`, `/guida/negozi/clinica-takemi`,
`/guida/calendario`, `/guida/dungeon/madarame`, `/guida/richieste`, `/partita`, `/` (mappa di Oggi), editor di un pin con condizioni.

### Risultato (collaudo 3301/5473, L2 giro 2: 25012240 → 625475322b, che cambia solo la ROADMAP; base p5s-0533Z; 2026-10-20, 66 misure)
Solo letture, grafica predefinita in tutte e 66, misura nell'iframe a sei misure. Le prime 26 misure sono state prese prima di un ricaricamento della
scheda; le altre 40 sono state riprese dalla coda.
**In tutte le 66**: nessuno scorrimento orizzontale, nessun elemento oltre il bordo, nessun testo a una lettera per riga, nessuna immagine rotta.

| vista | 1366×657 | 1280×689 | 1024×690 | 1280×800 | 768×1024 | 375×812 | intestazione | aree scorrevoli interne (confine 1 px, overscroll contenuto) |
|---|---|---|---|---|---|---|---|---|
| `/guida/citta` (metro) | 873/589 | 891/621 | 3116/622 | 928/732 | 3336/964 | 5715/752 | 112 (107 a 375) | elenco a fianco della metro 452×484 (1366), 340×506 (1280×689), 340×582 (1280×800) |
| `/guida/citta/odaiba` | 753/589 | 773/621 | 1234/622 | 844/732 | 1518/964 | 1371/752 | 166–175 (385 a 375) | — |
| `/guida/citta/asakusa` | 957/589 | 956/621 | 1279/622 | 956/732 | 1581/964 | 1634/752 | 174–188 (366 a 375) | — |
| `/guida/libri` | 5834/589 | 5934/621 | 8134/622 | 5934/732 | 8208/964 | 15165/752 | 105–107 | — |
| `/confidenti/takemi` | 3115/589 | 3115/621 | 3279/622 | 3167/732 | 3393/964 | 5464/752 | — | — |
| `/guida/negozi/clinica-takemi` | 632/589 | 632/621 | 671/622 | **732/732** | 2716/964 | 4705/752 | 53 | listino `negozio-elenco` 589×212 (1366), 542×212, 404×**160** (1024), 548×292; merce del popup 238×197–307 |
| `/guida/calendario` | 2265/589 | 2265/621 | 2379/622 | 2265/732 | 2452/964 | 3258/752 | 112 (126 a 375) | a 375 fila orizzontale 333×46 (881 di contenuto, senza confine) |
| `/guida/dungeon/madarame` | **589/589** | **621/621** | **622/622** | **732/732** | 2665/964 | 2984/752 | 194 (265 a 1024, 682 a 375) | tre colonne 340–483 di altezza; a 1024 due (301) |
| `/guida/richieste` | 5356/589 | 5476/621 | 7724/622 | 5476/732 | 7894/964 | 14320/752 | 107–112 | — |
| `/partita` | 774/589 | 774/621 | 792/622 | 774/732 | **964/964** | 2634/752 | 103 (171 a 375) | 545×187 (1366), 502×219, 374×170 (1024), 502×330, 360×440 (768); a 375 fila orizzontale 333×65 (1266) |
| `/` → `/home` (Oggi) | 840/589 | 820/621 | 886/622 | 828/732 | 1031/964 | 3171/752 | 47 (130 a 768, 105 a 375) | **456×10 a 1366×657**, 458×189 (1280×689), 342×92 (1024), 458×292, 325×213 (768) |

- **Bersagli sotto i 44 px**, gli stessi in ogni misura, tutti preesistenti:
  - etichette e spilli della metro (13–40 px, nella carta);
  - avatar 40×40 nella Home e nella Partita;
  - collegamenti alle fonti nel testo («www.allgamestaff.it», «Megami Tensei Wiki»);
  - «scheda Doti» 73×16 in Libri;
  - nome del negozio e del quartiere 138×16 / 81×16 nella Clinica Takemi.
  
  Sono gli stessi della base di L2: non sono difetti nuovi.
- **Già noti e preesistenti**:
  - l'area scorrevole della Home alta 10 px a 1366×657, segnalata al PM con la base di L5 (LAY5-1);
  - il listino della Clinica Takemi alto 160–292 px su 3472 di contenuto (base di L5, L5-L01).
- Pagine **in una schermata** da tenere così dopo L6 (L6-L06, L6-L08): Madarame alle quattro misure dei portatili, la Clinica Takemi a
  1280×800 e la Partita a 768×1024.
- Resta da prendere: **l'editor di un pin con condizioni** (L6-L01). Va aperto e chiuso con Annulla dall'editor delle mappe; lo prendo con
  il pezzo B0+F1, quando c'è l'editor nuovo da confrontare.
