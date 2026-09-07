# Matrice inventari guida — Lotto B 5.2

Matrice operativa delle famiglie richieste dalle guide ufficiali. I conteggi degli articoli
provengono dal seed `data/seed/negozi.json` (60 punti, 575 articoli); Libri, Film/DVD e
Videogiochi hanno cataloghi autonomi e avanzamento per partita.

| Famiglia | Fonte guida | Seed/API | Conteggio | UI canonica | Aggancio mappa | Lacuna / decisione anti-duplicazione |
|---|---|---|---:|---|---|---|
| Armi da mischia | guida armi da mischia | `articolo`, fonte `armi-da-mischia` | 120 | Inventari → Armi da mischia | negozio selezionato | filtro sulla fonte; non duplica la scheda negozio |
| Armi a distanza | guida armi a distanza | `articolo`, fonte `armi-a-distanza` | 18 | Inventari → Armi a distanza | negozio selezionato | filtro sulla fonte; non duplica la scheda negozio |
| Protezioni | guida protezioni | `articolo` / `protezione` | 62 | Inventari → Protezioni | negozio selezionato | dati del catalogo negozi |
| Accessori | guida accessori | `articolo` / `accessorio` | 72 | Inventari → Accessori | negozio selezionato | dati del catalogo negozi |
| Abiti | guida abiti | `oggetti-guida.json` / `OggettiPage` | — | Inventari → Abiti | solo negozio verificato | elenco autonomo; nessuna riga inventata nel catalogo negozi |
| Regali | guida regali | `articolo` / `regalo` | 55 | Inventari → Regali | negozio selezionato | dati del catalogo negozi |
| Oggetti chiave | guida oggetti chiave | `oggetti-guida.json` / `chiaveEMateriali` | 82 | Inventari → Oggetti chiave | solo negozio verificato | elenco autonomo; link alla scheda Oggetti |
| Materiali | guida materiali | `articolo` / `materiale` + `OggettiPage` | 35 | Inventari → Materiali | negozio selezionato | una sola sorgente per ogni riga |
| Consumabili | guida consumabili | `articolo` / `consumabile` | 101 | Inventari → Consumabili | negozio selezionato | dati del catalogo negozi |
| Cibo | guida cibo | `articolo` / `cibo` | 37 | Inventari → Cibo | negozio selezionato | dati del catalogo negozi |
| Carte abilità | guida carte abilità | nessun dataset locale materializzato | — | Inventari → Carte abilità | nessuno | empty state onesto + link alla fonte ufficiale; non classificare cartoline o altri articoli per sottostringa |
| Libri / DVD / Videogiochi | guide libri, DVD e videogiochi | cataloghi autonomi con avanzamento partita | 46 / 30 / attività | pagine autonome | pannello contestuale | completamento per parti/sessioni/round, senza duplicare Inventari |

Regola di non duplicazione: la scheda dell'oggetto resta nel catalogo della famiglia; il prezzo,
la disponibilità temporale e l'acquisto restano nella scheda del negozio. La mappa mostra solo
la posizione selezionata, non un visore per ogni riga. Un contenuto bloccato resta documentabile
nel catalogo, ma non è presente sulla mappa attiva e l'azione è rifiutata dal backend.
