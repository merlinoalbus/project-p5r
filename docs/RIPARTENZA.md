# Prompt di ripartenza — project-p5r, Fasi 5-7

Da incollare all'apertura di una chat nuova.

---

Lavori su **project-p5r**, una guida-app per Persona 5 Royal (React + Vite + Tailwind, Express +
better-sqlite3, tutto in italiano). Worktree: `C:\Repository\project-p5r-main`, ramo
`lavoro/atlante-mondo`, remoto `github` (non `origin`). Server: `bash scripts/start-all.sh`
(BE 3101, FE 5273); dopo ogni modifica al backend `bash scripts/restart-be.sh`.

## Come si lavora, e non è negoziabile

**Collabori con Codex (ChatGPT), alla pari.** Il canale è il ramo condiviso e due file:

- `docs/ATLANTE-STATO.md` — lo scrivi tu: cosa hai fatto, i comandi per riprodurlo, i numeri.
- `docs/ESITOVERIFICHE.md` — lo scrive Codex: gli esiti delle sue verifiche.
- `docs/PIANO-FASI-5-7.md` — il piano condiviso, con la divisione dei lotti e le regole.

Regole:
- **chi implementa non verifica, chi verifica non implementa.** Mai la stessa entità sui due lati
  dello stesso pezzo;
- **nessuno tocca il codice dell'altro**: si scrive un rilievo, lo chiude chi ha scritto quel codice;
- si giudica un **tag** `candidato/<nome>`, non l'ultimo commit, così non si verifica un bersaglio
  in movimento;
- `git push` a ogni punto significativo, `git pull` prima di leggere gli esiti. Senza push la
  dichiarazione non è arrivata a nessuno;
- **la generazione delle immagini è esclusiva di Codex.** Tu scrivi i prompt e li verifichi.

Divisione attuale: **lotto A a te** — le pagine del mondo (Mappe, Quartiere, Città, Palazzi,
Accesso al mondo) e i prompt dei pin; **lotto B a Codex** — gli inventari (Negozi, Oggetti,
Attività, Covo dei Ladri).

## Tre regole di metodo, imparate sbagliando

1. **Prima di far generare un'immagine, cerca fra gli originali estratti.** Il pozzo dei Memento
   era già in `IT/FIELD/PANEL/MEMENTOS/MEMENTOS.SPD`, con i nomi degli sprite, e per poco non lo si
   faceva ridisegnare da capo. Gli originali stanno in `data/atlas/extracted/originali/`,
   l'estrattore è `tools/p5r-map-export/lmap_sprites.py`.
2. **Guarda il riferimento prima di costruire.** La mappa di Tokyo e quella dei Memento sono state
   rifatte tre volte perché si è disegnato senza avere sotto gli occhi come le fa il gioco.
3. **Un pezzo per volta, verificato nel browser, e solo dopo il commit.** Il Browser pane a volte
   non riceve i click: si verifica via DOM/JS.

## Dov'è il lavoro

Fasi 0-4 chiuse o dichiarate debito. La **Fase 2 è chiusa per decisione dell'utente**; i residui
sono in coda al piano e non sono blocker. Stato del codice: **574 test verdi**, typecheck e lint
puliti, 28 verificatori su 28.

Fatto e funzionante:
- **mappa di Tokyo** (`src/components/mappe/MappaTokyo.tsx`) costruita con le sagome originali del
  gioco, rete della metropolitana sempre visibile con le fermate a pallino, quartieri che compaiono
  quando si sbloccano, Palazzi quando esistono, click che entra nella mappa del quartiere,
  evidenziazione oro. Posizioni e tracciati sono **autorati** e dichiarati tali in
  `collocazioneTokyo.ts`;
- **mappa dei Memento** (`MappaMemento.tsx`) montata coi pezzi originali: gli otto strati del
  pozzo, il profilo della città, le catene, le venature. Selezione condivisa coi pulsanti dei
  dedali;
- **i Memento sono fuori dall'atlante**: niente in Mappe, niente nella Città, nessun pin da Tokyo.
  Si raggiungono solo da `/guida/dungeon/mementos` e dalle richieste dei Memento.

## Da fare, in quest'ordine

1. **«Palazzi e Dedali» diventa «Palazzi»**, e ci resta il solo Dedalo di Iweleth con le sue mappe.
   Da cambiare anche l'etichetta della piastrella in `src/components/guida/sezioniGuida.tsx`, non
   solo il titolo di `DungeonPage`.
2. **La Città mostra la mappa due volte**: `CittaPage` rende `MappaTokyo` *e* `MappaIncorporata
   chiave="tokyo"`. La seconda va tolta — `MappaTokyo` **è** la mappa di Tokyo — e anche
   `Mappe → Tokyo` deve portare lì invece di aprire un visore alternativo.
3. **Le miniature delle schede dei quartieri sono vuote**: devono usare le stesse sagome della
   mappa composta, `public/asset/mappe/lmap/tokyo/<quartiere>.png`. Oggi `MiniaturaMappa` cerca
   solo `mappe/<chiave>`.
4. **La pagina di dettaglio di un Palazzo va rifatta**: layout molto grafico e moderno, ottimizzato
   per desktop, tablet e mobile. Oggi è una scheda con delle liste.
5. **Un elemento «SCHEDA DEL PALAZZO» sborda dal riquadro** e compare e sparisce senza motivo
   chiaro: capire da dove esce e toglierlo o renderlo stabile.
6. Il resto delle Fasi 5, 6 e 7 come da `docs/PIANO-FASI-5-7.md`.

## Come si consegna

Ogni punto: typecheck, lint, test verdi, **verifica a schermo**, poi commit e push, poi la
dichiarazione in `docs/ATLANTE-STATO.md` con il tag. Niente commit su lavoro che a schermo non
regge — è successo oggi più di una volta ed è la ragione per cui questa nota esiste.
