# L7 «Oggetti» — Test user experience

Sessione «Test user experience». Stato: **preparazione** (2026-10-20). Si prova solo col via del Manager e quando BE/FE segnalano «L7 · Bn pronto».
Fonti:
- requisiti.md: R7-24, R7-25 [UX]; R7-26 per i formati;
- modifiche.md: §5.1–§5.5 (interfaccia e testi), §7.4 (criterio UX);
- piano.md, tabella «Per i tester».

Le schermate «prima» di Analisi app sono in `schermate-prima/`:
`01-oggetti`, `02-libri`, `03-film`, `04-videogiochi`, `05-negozio-untouchable`, `06-negozi`, `07-confidente-kawakami`, `08-richieste`,
`09-covo-premi`, `10-palazzo-madarame-voci`, `11-pin-big-bang-listino`.

Criterio UX della stesura (M §7.4):
- dal telefono si cerca un oggetto e si vede in un colpo dove comprarlo oggi e a chi regalarlo;
- il catalogo con i filtri resta gestibile;
- le proposte si capiscono e si confermano una per una senza fatica.

## Percorsi da provare (telefono 375 in partita, tablet 768, desktop 1280; 1366×657 e 1280×689)
| # | Percorso (chi gioca) | Criterio | Cosa misuro | «Prima» |
|---|---|---|---|---|
| O1 | **Dal telefono, «dove compro una Medicina oggi?»**: Catalogo → ricerca «Medicina» → pagina dell'oggetto | R7-24, M §5.1 | tocchi dalla Home (obiettivo: ricerca + 1 tocco); «Dove si compra» è la **prima sezione** a 375 e si vede senza scorrere: negozio, prezzo («Da 800 ¥ a 900 ¥»), «Aperto adesso / Chiuso adesso» (L5) e disponibilità della partita (L6); il link porta alla sezione del negozio nella pagina del luogo | `01-oggetti`, `05-negozio-untouchable`, `06-negozi` |
| O2 | **«A chi lo regalo?»**: un regalo (es. un oggetto amato da Kawakami) → «A chi piace» | R7-24, M §5.1 | Confidenti con il gradimento leggibile a colpo d'occhio (non solo colore); link alla pagina del Confidente; «Regala» con la spunta di oggi; a 375 visibile con al più uno scorrimento | `07-confidente-kawakami` |
| O3 | **Il percorso inverso**: pagina del Confidente → regalo → pagina dell'oggetto → «Dove si compra» | M §5.3 | circolare, senza vicoli ciechi; nessun link rotto | `07-confidente-kawakami` |
| O4 | **Catalogo unico**: ricerca per nome (anche i nomi altri), chip dei gruppi («Tutti», «Equipaggiamento», «Consumabili», «Chiave e materiali», «Regali», «Libri», «Film», «Videogiochi», «Carte abilità»), ordinamento | R7-25, M §5.2 | non diventa un elenco ingestibile: risultato in 1–2 tocchi; chip ≥44 px e scorrevoli in orizzontale a 375 con il confine evidente; le sezioni di oggi («Fabbricazione», «Personalizzazione», «Abiti», «Scambi») si ritrovano | `01-oggetti` |
| O5 | **Libri, Film, Videogiochi restano riconoscibili**: avanzamento della partita come oggi; il nome porta alla pagina dell'oggetto | R7-25, M §5.2 | nessun impoverimento rispetto a oggi (stessi dati, stessi gesti) | `02-libri`, `03-film`, `04-videogiochi` |
| O6 | **Forzieri di un Palazzo concluso** (partita reale, sola lettura): un oggetto di un forziere di Kamoshida o Madarame → «Dove si trova» | M §5.1 (R7-11b) | «Preso» / «Non più ottenibile» / «Da prendere» comprensibili; percorso «Palazzo › infiltrazione › area» con link alla scheda del Palazzo; il Seme mancante dice «Si compra da Jose» con la nota «da verificare» | `10-palazzo-madarame-voci` |
| O7 | **Ricompense e scambi**: un premio di una Richiesta, un premio del Covo, uno scambio | M §5.1, §5.3 | «Ricompensa di …», «Scambio: 3 fiori» chiari; link alla Richiesta / al Covo | `08-richieste`, `09-covo-premi` |
| O8 | **«Abbinamenti da approvare»** (partita di prova sul Collaudo, con foto e ripristino): chip «Da approvare · N» → una proposta → «Conferma» / «Scegli un altro oggetto» / «Scarta» | R7-02, R7-03, M §5.4 | si capisce cosa si collega (testo di oggi), la proposta, il motivo e la certezza; su telefono una proposta per scheda; bersagli ≥44 px; dopo la conferma si passa alla successiva senza perdere il segno; il chip scompare a N = 0 | — (nuovo) |
| O9 | **Proposta dalla voce del forziere** (Kamoshida o Madarame, partita di prova) | M §5.4 | chip «Contenuto: proposta» nella voce; confermare lì ha lo stesso effetto che dall'elenco; il testo della voce **non cambia** (R7-21) | `10-palazzo-madarame-voci` |
| O10 | **Popup del pin di un negozio** (Big Bang Burger) → nome di un articolo → pagina dell'oggetto | M §5.3 | il link porta all'oggetto; «in vendita da» al posto di «Articolo» | `11-pin-big-bang-listino` |
| O11 | **Testi e vocabolario** | M §5.5 | «Oggetto» per la cosa; «Articolo» non compare più nell'interfaccia; «Dove si compra», «A chi piace», «Dove si trova» uguali in ogni vista | — |
| O12 | **Formati della pagina dell'oggetto** | M §5.1, R7-26 | ≥1280 due colonne (intestazione + dove si compra | a chi piace + dove si trova); tabelle su desktop, schede su telefono; immagini al 100%; nessuno scroll annidato | — |

## Quando si prova cosa (piano.md «Per i tester»)
| Pezzo pronto | Casi UX | Note |
|---|---|---|
| B2 + F2 (pagina dell'oggetto e catalogo) | O1, O2, O3, O4, O5, O6, O7, O12 | sola lettura sulla base di riferimento |
| B3 + F3 (nomi, prezzi, link) | O10, O11 | sola lettura |
| B4 + F4 (proposte) | O8, O9 | solo sul Collaudo, **partita di prova**, con foto e ripristino |
| B6 + F6 (rifinitura) | tutto il M §7.4 in un giro finale | 375/768/1280, 1366×657, 1280×689 |

Dati: le prove si fanno sull'istanza con la base di riferimento indicata dal piano (oggi `p5s-2026-10-20-0533Z` per L7), verificata con i conteggi
esatti prima di partire. Le scritture (spunta d'acquisto, «Regala», proposte) si fanno solo sul Collaudo, con foto e ripristino; mai sulla partita
dell'utente.

## Esiti
(pezzo per pezzo, appena BE/FE segnalano un pezzo pronto)
