# L8 «Persona e Ombre» — Test user experience

Sessione «Test user experience». Stato: **preparazione** (2026-10-20). Si prova solo col via del Manager e quando BE/FE segnalano «L8 · Bn pronto».
Fonti:
- requisiti.md: R8-07f, R8-28, R8-29 [UX];
- modifiche.md: §1.4 (negoziazione per umore), §2 (una strada di cattura), §5 (interfaccia), §7 (piano dei test, voce UX);
- piano.md, tabella «Per i tester».

Le schermate «prima» di Analisi app sono in `schermate-prima/`:
`01-battaglia`, `02-memento`, `03-richieste`, `04-iweleth`, `05-compendio`, `06-persona-pixie`, `07-partita`, `08-palazzo-kamoshida-persona`,
`09-battaglia-negoziazione` (anche `-pagina-intera`), `10-battaglia-ombre`.

Criteri UX della stesura:
- in battaglia, dal telefono, dall'Ombra alle debolezze e alla registrazione in **due tocchi** (R8-28);
- dalla domanda di negoziazione alla risposta in **due tocchi** (R8-07f);
- nel Palazzo la cattura si segna con **un tocco**, con la stessa piastrella dei Memento (R8-29).

## Percorsi da provare (telefono 375 in battaglia, tablet 768, desktop 1280; 1366×657 e 1280×689)
| # | Percorso (chi gioca) | Criterio | Cosa misuro | «Prima» |
|---|---|---|---|---|
| P1 | **Ombra → debolezze**: Battaglia → «Ombre» → ricerca di un'Ombra (es. Pixie) → carta | R8-28, M §5 | **≤ 2 tocchi** dopo la ricerca; debolezze dal compendio leggibili a colpo d'occhio a 375 (griglia `AffinitaGriglia`, non solo colore); si vede subito se la sua Persona è registrata | `01-battaglia`, `10-battaglia-ombre` |
| P2 | **Pagina Ombra** `/guida/ombra/:chiave` | M §5 | ordine utile in battaglia: Persona (piastrella con immagine al 100%, «Registrata»), debolezze, dove si incontra, personalità con «Negoziazione per <umore>»; piastrelle ≥88 px, tre per riga a 375 | `06-persona-pixie` |
| P3 | **Affinità proprie** (Vendicatore sconfitto, Sole oscuro, Orsacchiotto assassino, Guerriero divino / Potestà) | M §5 (R8-08b) | la nota «propria» si capisce; la griglia unisce compendio e differenze senza confondere | — |
| P4 | **«Dove resta catturabile»** con un Palazzo concluso (partita reale, sola lettura): un'Ombra di Kamoshida | M §5 (R8-15b) | «Non più raggiungibile: il Palazzo è sparito» chiaro; «Dove si cattura ancora» con il percorso (Memento › dedalo › area) e il link; «Solo per fusione» con il link al compendio quando serve; Iweleth mai «Palazzo sparito» | `08-palazzo-kamoshida-persona` |
| P5 | **Negoziazione per umore**: Battaglia → Negoziazione → «Umore» (4 pulsanti) → ricerca della domanda | R8-07f, M §1.4, §5 | **≤ 2 tocchi** dalla domanda alla risposta; il verdetto per l'umore scelto (buona / passabile / cattiva) leggibile a colpo d'occhio a 375, non solo colore; «incerto» e la fonte; con due fonti discordanti si vedono entrambe; le altre risposte in piccolo | `09-battaglia-negoziazione`, `-pagina-intera` |
| P6 | **Negoziazione partendo dall'Ombra**: «Ombra» (ricerca) → l'umore si preseleziona → domanda | R8-07c, M §5 | l'umore preselezionato si vede e si può cambiare; stessi tocchi di P5 | `09-battaglia-negoziazione` |
| P7 | **«Ombre di questo umore»** e il ritorno dalla pagina Ombra alla negoziazione filtrata | R8-07d | il collegamento porta alla vista filtrata; nessun vicolo cieco | — |
| P8 | **Cattura nel Palazzo** (partita di prova sul Collaudo, con foto e ripristino): una voce Ombra/Persona di un Palazzo | R8-29, M §2 | **un tocco** sulla piastrella; stesso aspetto dei Memento (immagine della Persona al 100%); lo stato si aggiorna subito anche in Battaglia, nel compendio e nei Memento; togliere la registrazione chiede la stessa conferma ovunque | `08-palazzo-kamoshida-persona`, `02-memento` |
| P9 | **Cattura in Battaglia e nei Memento** (partita di prova) | M §2 | stessa piastrella e stesso gesto; un tocco su una Persona già registrata non azzera livello, bonus né abilità | `02-memento`, `10-battaglia-ombre` |
| P10 | **Le 2 voci di Kamoshida che non sono Ombre** («Parla con Morgana», «Risveglio Persona di Ryuji») | M §2 | si comportano come oggi; nessuna piastrella di cattura | `08-palazzo-kamoshida-persona` |
| P11 | **Richieste**: il bersaglio con un'Ombra mostra le debolezze del compendio | M §5 | stessa griglia di P1; i bersagli senza Ombra restano in testo | `03-richieste` |
| P12 | **Compendio e scheda Persona**: le Persona del party con «Del party» e il filtro; «Dove si incontra», «Ombre», «Registrata nella partita» | M §5 | segno comprensibile; nessuna azione di fusione sulle Persona del party; nessun impoverimento della scheda | `05-compendio`, `06-persona-pixie` |
| P13 | **Iweleth come dedalo dei Memento** | M §3 | si ritrova dove chi gioca se l'aspetta; nessun link rotto dai percorsi di oggi | `04-iweleth` |
| P14 | **Nomi degli elementi** | M §5 (R8-20c) | nessun «Tuono», «Gelo», «respinge», «Psichico», «Oscurità», «Quasi-divino», «Guarigione» nei testi visibili; nomi uguali in ogni vista | — |

## Quando si prova cosa (piano.md «Per i tester»)
| Pezzo pronto | Casi UX | Note |
|---|---|---|
| B0 + F1 (nomi degli elementi) | P14 (lettura) | sola lettura |
| B2 + F2 (pagina Ombra, debolezze) | P1, P2, P3, P4, P11 | sola lettura sulla base 0533Z |
| B3 + F3 (una strada di cattura) | P8, P9, P10 | solo sul Collaudo, **partita di prova**, con foto e ripristino |
| B4 + F4 (negoziazione) | P5, P6, P7 | sola lettura |
| B5 + F5 (Persona del party) | P12 | sola lettura |
| B6 + F6 (Iweleth) | P13 | sola lettura |
| B7 + F7 (rifinitura) | tutto, in un giro finale | 375/768/1280, 1366×657, 1280×689 |

Dati: le prove si fanno sull'istanza con la base `p5s-2026-10-20-0533Z` (piano), verificata con i conteggi esatti prima di partire (compendio della
partita reale 53/7, come nel piano di no-reg). Le scritture (catture, registrazioni) si fanno solo sul Collaudo, con foto e ripristino; mai sulla
partita dell'utente.

## Esiti
(pezzo per pezzo, appena BE/FE segnalano un pezzo pronto)
