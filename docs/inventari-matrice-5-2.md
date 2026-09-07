# Matrice inventari guida — Lotto B 5.2

Matrice operativa delle famiglie richieste dalle guide ufficiali. I conteggi degli articoli
provengono dal seed `data/seed/negozi.json` (60 punti, 575 articoli); Libri, Film/DVD e
Videogiochi hanno cataloghi autonomi e avanzamento per partita.

| Famiglia | Conteggio / fonte dati | UI canonica | Posizione | Stato |
|---|---:|---|---|---|
| Armi da mischia | sottoinsieme categoria `arma`, fonte `armi-da-mischia` (120 nel censimento) | Inventari → Armi da mischia | negozio selezionato | consultabile |
| Armi a distanza | sottoinsieme categoria `arma`, fonte `armi-a-distanza` (18 nel censimento) | Inventari → Armi a distanza | negozio selezionato | consultabile |
| Protezioni | 62 articoli, categoria `protezione` | Negozi → Protezioni | negozio | consultabile |
| Accessori | 72 articoli, categoria `accessorio` | Negozi → Accessori | negozio | consultabile |
| Abiti | catalogo abiti in `OggettiPage` | Oggetti → Abiti e lavanderia | testo/negozio quando presente | consultabile |
| Carte abilità | catalogo carte nel negozio/compendio; non duplicare la riga negozio | Negozi → ricerca | negozio | consultabile |
| Regali | 55 articoli, categoria `regalo` | Negozi → Regali | negozio | consultabile |
| Oggetti chiave | `OggettiPage` → Chiave e materiali | Oggetti | collegamento articolo/negozio se presente | consultabile |
| Materiali | 35 articoli, categoria `materiale` + `OggettiPage` | Oggetti → Chiave e materiali | negozio/articolo | consultabile |
| Consumabili e cibo | 101 consumabili, 37 cibi | Inventari → Consumabili / Cibo | negozio/articolo | consultabile |
| Carte abilità | fonte ufficiale dedicata; non materializzate come articoli negozio | Inventari → Carte abilità, link alla guida | nessun pin senza ancoraggio verificato | consultabile |
| Libri / DVD / Videogiochi | 46 libri, 30 film/DVD, videogiochi dal catalogo attività | pagine autonome con sessioni/round | pannello unico `DoveSiTrova` | completamento per partita |

Regola di non duplicazione: la scheda dell'oggetto resta nel catalogo della famiglia; il prezzo,
la disponibilità temporale e l'acquisto restano nella scheda del negozio. La mappa mostra solo
la posizione selezionata, non un visore per ogni riga. Un contenuto bloccato resta documentabile
nel catalogo, ma non è presente sulla mappa attiva e l'azione è rifiutata dal backend.
