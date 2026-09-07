# Matrice inventari guida — Lotto B 5.2

Matrice operativa delle famiglie richieste dalle guide ufficiali. I conteggi degli articoli
provengono dal seed `data/seed/negozi.json` (60 punti, 575 articoli); Libri, Film/DVD e
Videogiochi hanno cataloghi autonomi e avanzamento per partita.

| Famiglia | Conteggio / fonte dati | UI canonica | Posizione | Stato |
|---|---:|---|---|---|
| Armi da mischia | 143 articoli, `negozi.json` categoria `arma` | Negozi → filtro categoria | `DoveSiTrova` sul negozio selezionato | consultabile |
| Armi a distanza | sottoinsieme categoria `arma`, distinto dal testo del catalogo | Negozi → ricerca/filtro | negozio | consultabile |
| Protezioni | 62 articoli, categoria `protezione` | Negozi → Protezioni | negozio | consultabile |
| Accessori | 72 articoli, categoria `accessorio` | Negozi → Accessori | negozio | consultabile |
| Abiti | catalogo abiti in `OggettiPage` | Oggetti → Abiti e lavanderia | testo/negozio quando presente | consultabile |
| Carte abilità | catalogo carte nel negozio/compendio; non duplicare la riga negozio | Negozi → ricerca | negozio | consultabile |
| Regali | 55 articoli, categoria `regalo` | Negozi → Regali | negozio | consultabile |
| Oggetti chiave | `OggettiPage` → Chiave e materiali | Oggetti | collegamento articolo/negozio se presente | consultabile |
| Materiali | 35 articoli, categoria `materiale` + `OggettiPage` | Oggetti → Chiave e materiali | negozio/articolo | consultabile |
| Consumabili e cibo | 101 consumabili, 37 cibi | Oggetti → Consumabili; Negozi → filtro | negozio/articolo | consultabile |
| Libri / DVD / Videogiochi | 46 libri, 30 film/DVD, videogiochi dal catalogo attività | pagine autonome con sessioni/round | pannello unico `DoveSiTrova` | completamento per partita |

Regola di non duplicazione: la scheda dell'oggetto resta nel catalogo della famiglia; il prezzo,
la disponibilità temporale e l'acquisto restano nella scheda del negozio. La mappa mostra solo
la posizione selezionata, non un visore per ogni riga. Un contenuto bloccato resta documentabile
nel catalogo, ma non è presente sulla mappa attiva e l'azione è rifiutata dal backend.


---

## Aggiornamento del 7 settembre 2026 (Opus): l'archivio degli equipaggiamenti

Matrice scritta da Codex e valida; questa parte la completa su un punto che le mancava, e che era
**la lacuna vera** delle prime tre famiglie.

Armi, protezioni e accessori non stanno solo negli scaffali dei negozi. L'app ha un secondo
archivio — la tabella `oggetto`, **223 pezzi** — con quello che i negozi non dicono: l'effetto di
ciascuno, le statistiche, e **chi lo può equipaggiare**. Era già tradotto per intero (223 nomi
italiani su 223, più le descrizioni) e aveva la sua API `/compendio/oggetti`, ma **nessuna pagina la
chiamava**: il sottotitolo di Oggetti rimandava al Compendio, dove quei pezzi non ci sono.

| Famiglia | Nell'archivio | Dove si consulta ora |
|---|---:|---|
| Armi da mischia | 36 | Oggetti → **Equipaggiamento** |
| Armi a distanza | 32 | Oggetti → Equipaggiamento (filtro «Arma a distanza») |
| Protezioni | 30 | Oggetti → Equipaggiamento |
| Accessori | 125 | Oggetti → Equipaggiamento |

**Non è un doppione dei negozi**, ed è la regola di non duplicazione della matrice applicata a
questo caso: qui c'è che cos'è e a chi serve, nella scheda del negozio c'è quanto costa e quando si
trova. La colonna «Per» mostra i volti di chi può indossarlo invece della frase; dove non c'è
vincolo dice «Tutti» e basta, perché i dieci volti ripetuti su 125 accessori non dicono niente.

Da correggere anche una riga della matrice: le famiglie del catalogo dei negozi si chiamano al
**singolare** (`arma`, `protezione`, `accessorio`, `regalo`, `materiale`), e questo aveva un effetto
che non si vedeva — le illustrazioni di categoria, che si chiamano al plurale, non venivano trovate
per nessuna di quelle 367 righe. Lo risolve `chiaveCategoria()` in `src/utils/categorie.ts`.
