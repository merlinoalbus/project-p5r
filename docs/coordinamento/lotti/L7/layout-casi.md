# L7 «Oggetti» — casi di layout (preparati prima del lotto)

Sessione «Test layout multi device», 2026-10-20. Fonti: `requisiti.md` R7-26 [L] (e R7-24, R7-25 per l'uso dal telefono); `modifiche.md`
§5.1–§5.5 e §7.6; `piano.md` «Per i tester».
Strumenti: `strumenti-layout/misura-layout.js` e misura in serie in un iframe (`strumenti-layout/README.md`).
Misure: 1280×800, 1366×657, 1280×689, 1024×690, 768×1024, 375×812. Grafica predefinita, controllata a ogni misura. Solo letture. Le finestre
si aprono e si chiudono con Annulla. Le prove che salvano (acquisto dalla pagina dell'oggetto, conferma o scarto di una proposta) passano dal
Collaudo, con foto e ripristino.

## Casi
| id | vista | cosa si misura | atteso |
|---|---|---|---|
| L7-L01 | **Pagina dell'oggetto** `/guida/oggetto/:categoria/:slug` (nuova): Medicina, un regalo, un libro, un'arma collegata | da 1280 due colonne (intestazione + «Dove si compra» \| «A chi piace» + «Dove si trova»); sotto, una colonna con «Dove si compra» per prima su telefono; nessuno scorrimento orizzontale; statistiche dell'equipaggiamento senza testi a una lettera per riga a 375; azioni «Modifica» e menu ≥ 44 px | R7-26, §5.1 |
| L7-L02 | «Dove si compra» con più negozi (es. un oggetto da 800 ¥ a 900 ¥) | tabella a più colonne da 1024, schede a 375; righe e link alla sezione del negozio ≥ 44 px; «aperto adesso?» e disponibilità della partita che vanno a capo per parole, senza troncare il prezzo | R7-26, R7-08 |
| L7-L03 | «Dove si trova»: forzieri (Palazzo › infiltrazione › area) con lo stato «Preso / Non più ottenibile / Da prendere», ricompense, scambi, ricette | percorso lungo che va a capo per parole a 375 (mai una lettera per riga); chip di stato interi; link ≥ 44 px | R7-26, §5.1 |
| L7-L04 | Pagine di libri, film e videogiochi dentro la pagina dell'oggetto (sezione di lettura) | stessi componenti delle pagine Libri/Film/Videogiochi: nessuna regressione rispetto alla base «prima» di quelle pagine | §5.1, no-reg |
| L7-L05 | **Catalogo** `/guida/oggetti`: ricerca, chip dei gruppi («Tutti», «Equipaggiamento», «Consumabili», «Chiave e materiali», «Regali», «Libri», «Film», «Videogiochi», «Carte abilità»), ordinamento | chip ≥ 44 px; la fila dei chip a 375 va a capo o scorre in orizzontale **dentro** un'area con confine evidente, mai la pagina; elenco lungo (oltre 900 oggetti) che non crea due barre insieme; righe ≥ 44 px; tabella da 1024, schede a 375 | R7-26, R7-25 |
| L7-L06 | Sezioni di oggi del catalogo: «Fabbricazione», «Personalizzazione», «Abiti», «Scambi» | nessuna regressione rispetto alla base «prima» | §5.2, no-reg |
| L7-L07 | **Abbinamenti da approvare** (chip «Da approvare · N» nel catalogo e sezione in Impostazioni) | elenco raggruppato per tipo; a 375 una proposta per scheda; «Conferma», «Scegli un altro oggetto», «Scarta» ≥ 44 px e non fuori dal bordo; motivo e certezza che vanno a capo per parole; se l'elenco scorre dentro la pagina: confine e overscroll contenuto | R7-26, §5.4 |
| L7-L08 | «Scegli un altro oggetto»: finestra con la ricerca nel catalogo | foglio dal basso a 375 (regola di LAY2-3); elenco dei risultati scorrevole con confine e overscroll contenuto; risultati ≥ 44 px | §5.4, R2-42 |
| L7-L09 | Riga «Contenuto» della voce in `GuidaDellArea` (chip dell'oggetto, «Collega a un oggetto», «Togli», chip «Contenuto: proposta») | i chip nuovi non allungano l'intestazione né la riga dell'area: la pagina del Palazzo e la pagina dell'area restano **senza barra di pagina** a 1366×657, 1280×689 e 1024×690, e il visore resta entro metà altezza come nella misura finale di R3-41 di L3; chip ≥ 44 px | no-reg di layout (L3), §5.1 |
| L7-L10 | Link verso l'oggetto: `ArticoliTabella` (listini nella pagina del luogo, L5), regali del Confidente, ricompense delle Richieste e del Covo, popup del pin (`VisoreMappa`, merce), Libri/Film/Videogiochi | link ≥ 44 px dove sono bersagli a sé; nomi lunghi del catalogo (forma estesa, §8.2) senza troncare in tabelle e popup; nessuno scorrimento orizzontale; popup del pin non oltre il bordo del visore a 375 | R7-26, §5.3 |
| L7-L11 | Moduli: `ModuloArticolo` con la scelta dell'oggetto dal catalogo, Modifica/Elimina/Ripristina dell'oggetto | finestre come fogli dal basso a 375; campo di ricerca ed elenco ≥ 44 px; corpo scorrevole con overscroll contenuto | R7-26 |

## Quando (dal piano di Stesura, `piano.md` «Per i tester»)
| pezzo pronto | cosa misuro |
|---|---|
| B0 + F1 | — |
| B2 + F2 | pagina dell'oggetto e catalogo: L7-L01…L7-L05 |
| B3 + F3 | listini e link: L7-L10, L7-L06 |
| B4 + F4 | elenco delle proposte: L7-L07, L7-L08, L7-L09 |
| B5 + F5 | moduli: L7-L11 |
| B6 + F6 | giro completo §7.6 alle sei misure, più le no-reg L7-L04, L7-L06 e L7-L09 |
Si comincia solo con il via del PM o del Manager.

## Base «prima» (da prendere sul collaudo, sola lettura, base p5s)
Viste che L7 tocca e che esistono già: `/guida/oggetti` (con le schede di oggi), `/guida/libri`, `/guida/film`, `/guida/videogiochi`,
`/confidenti/<un Confidente con regali>`, `/guida/richieste`, `/guida/covo`, una pagina di luogo con listino (L5), la scheda di Kamoshida e
la sua area della prigione (riga «Contenuto»), un pin con merce nel visore.
Si misura alle sei misure con lo stesso metodo di L6: orizzontale, `main`, elementi fuori dal bordo, bersagli sotto i 44 px, testi a una
lettera per riga, aree scorrevoli (confine e overscroll).
(compilata qui sotto al termine del giro)
