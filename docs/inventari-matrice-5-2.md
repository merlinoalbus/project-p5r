# Matrice inventari guida — Lotto B 5.2

Matrice operativa delle famiglie richieste dalle guide ufficiali. I conteggi degli articoli
provengono dal seed `data/seed/negozi.json` (60 punti, 575 articoli); Libri, Film/DVD e
Videogiochi hanno cataloghi autonomi e avanzamento per partita.

| Famiglia | Fonte guida | Seed/API | Conteggio | UI canonica | Aggancio mappa | Lacuna / decisione anti-duplicazione |
|---|---|---|---:|---|---|---|
| Armi da mischia | https://www.allgamestaff.it/persona-5-royal/armi-da-mischia/ | `articolo`, fonte `armi-da-mischia` | 120 | Inventari → Armi da mischia | negozio selezionato | filtro sulla fonte; non duplica la scheda negozio |
| Armi a distanza | https://www.allgamestaff.it/persona-5-royal/armi-a-distanza/ | `articolo`, fonte `armi-a-distanza` | 18 | Inventari → Armi a distanza | negozio selezionato | filtro sulla fonte; non duplica la scheda negozio |
| Protezioni | https://www.allgamestaff.it/persona-5-royal/protezioni/ | `articolo` / `protezione` | 62 | Inventari → Protezioni | negozio selezionato | dati del catalogo negozi |
| Accessori | https://www.allgamestaff.it/persona-5-royal/accessori/ | `articolo` / `accessorio` | 72 | Inventari → Accessori | negozio selezionato | dati del catalogo negozi |
| Abiti | https://www.allgamestaff.it/persona-5-royal/persona-5-royal-abiti/ | `oggetti-guida.json` / `OggettiPage` | 55 | Inventari → Abiti | solo negozio verificato | elenco autonomo; nessuna riga inventata nel catalogo negozi |
| Regali | https://www.allgamestaff.it/persona-5-royal/regali/ | `articolo` / `regalo` | 55 | Inventari → Regali | negozio selezionato | dati del catalogo negozi |
| Oggetti chiave | https://www.allgamestaff.it/persona-5-royal/oggetti-chiave-essenziali/ | `oggetti-guida.json` / `chiaveEMateriali` | 82 | Inventari → Oggetti chiave | solo negozio verificato | elenco autonomo; link alla scheda Oggetti |
| Materiali | https://www.allgamestaff.it/persona-5-royal/tesori/ | `articolo` / `materiale` + `OggettiPage` | 35 | Inventari → Materiali | negozio selezionato | una sola sorgente per ogni riga |
| Consumabili | guida consumabili | `articolo` / `consumabile` | 101 | Inventari → Consumabili | negozio selezionato | dati del catalogo negozi |
| Cibo | guida cibo | `articolo` / `cibo` | 37 | Inventari → Cibo | negozio selezionato | dati del catalogo negozi |
| Carte abilità | https://www.allgamestaff.it/persona-5-royal/carte-abilita/ | nessun dataset locale materializzato | — | Inventari → Carte abilità | nessuno | empty state onesto + link alla fonte ufficiale; non classificare cartoline o altri articoli per sottostringa |
| Libri / DVD / Videogiochi | https://www.allgamestaff.it/persona-5-royal/libri/ · https://www.allgamestaff.it/persona-5-royal/dvd-a-noleggio/ | cataloghi autonomi con avanzamento partita | 46 / 30 / 7 | pagine autonome | pannello contestuale | completamento per parti/sessioni/round, senza duplicare Inventari |

Regola di non duplicazione: la scheda dell'oggetto resta nel catalogo della famiglia; il prezzo,
la disponibilità temporale e l'acquisto restano nella scheda del negozio. La mappa mostra solo
la posizione selezionata, non un visore per ogni riga. Un contenuto bloccato resta documentabile
nel catalogo, ma non è presente sulla mappa attiva e l'azione è rifiutata dal backend.
