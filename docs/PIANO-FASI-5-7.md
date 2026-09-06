# Piano Fasi 5, 6 e 7 — pagine, grafica, revisione incrociata

Documento condiviso fra **Claude** e **Codex**. Finora il piano stava nella cartella locale di
Claude e Codex non poteva leggerlo: da qui in avanti sta nel repository, e si aggiorna qui.

---

## 1. La richiesta, nelle parole dell'utente

> mi aspetto che sistemi e ottimizzi (con un layout molto grafico e moderno ottimizzato per
> desktop, tablet e mobile) anche le pagine dell'app relative a MAPPE, PALAZZI E DEDALI, LA CITTà,
> NEGOZI E INVENTARIO, ATTIVITà E DOTI SOCIALI, COVO DEI LADRI, OGGETTI, MATERIALI E
> FABBRICAZIONE... aggiungi anche tutto quanto riguarda gli altri tipi di oggetti
> identificati...(dalle guide). Qualsiasi riferimento alla mappa deve puntare al relativo punto di
> ancoraggio sull'atlante unificato... riportandolo anche già in pagina visibile in un'area
> opportuna. Per tutti gli elementi grafici aggiuntivi mancanti... affida il lavoro di generazione
> a codex specificandogli tu i prompt... anche tutti i pin magari falli rigenerare tutti con la
> sola grafica png a sfondo alfa reale dell'immagine da inserire poi nel pin che vai a creare tu
> nell'app.
>
> Dovete continuare a collaborare tu e Codex come svolto fino ad ora anche per queste nuove
> attività. La generazione immagini è esclusiva di Codex tu però puoi verificare e generare i
> prompt... Gli elementi grafici devono essere generati per tutte le parti di interfaccia attuali
> dove mancano ed è necessario... non solo negli elementi specifici citati. (aggiorna quindi il
> piano e condividi questo nuovo requisito con codex così da organizzarvi il lavoro in modo da
> massimizzare efficacia e correttezza dell'implementazione).
>
> A completamento vi direi anche di fare una review di tutto per verificare se ci sono bug
> implementativi sfuggiti e da risolvere... anche in questo caso continuate ad essere
> equiponenziali. Però se uno implementa l'altro verifica e viceversa... mai verifica e
> implementazione fatti dalla stessa entità).

E, dallo stesso giorno: **la mappa generale di Tokyo va sostituita con la mappa della metropolitana
del gioco.**

## 2. I nove punti

| | richiesta | proprietario |
|---|---|---|
| **5.1** | layout molto grafico e moderno, desktop/tablet/mobile, sulle sette sezioni | A e B, ciascuno sulle proprie |
| **5.2** | aggiungere gli altri tipi di oggetti individuati dalle guide | B |
| **5.3** | ogni riferimento alla mappa: ancora sull'atlante **e** posizione già in pagina | componente: A · applicazione: A e B |
| **5.4** | **ogni mappa radice è quella del gioco**: Tokyo → mappa della metropolitana, Mementos → mappa dei Memento, ogni Palazzo → la sua mappa d'insieme nativa | A |
| **6.1** | tutti i pin rigenerati: PNG alfa reale, **sola figura, senza cornice** | prompt A · generazione Codex |
| **6.2** | grafica per **tutte** le parti di interfaccia dove manca, non solo le sezioni citate | prompt di chi rifà la pagina · generazione Codex |
| **6.3** | generazione immagini **esclusiva di Codex**; Claude scrive e verifica i prompt | — |
| **7.1** | revisione di tutto, per i bug implementativi sfuggiti | incrociata |
| **7.2** | equipollenti; chi implementa non verifica, mai la stessa entità sui due lati | — |

## 3. La divisione del lavoro

Divisa **per dominio, non per file**: ciascuno possiede pagine intere. Nessuno modifica un file
dell'altro, quindi non ci sono conflitti di merge né lavoro perso.

### Lotto A — Claude: il mondo

`MappaPage` · `QuartierePage` · `CittaPage` · `DungeonPage` · `DungeonDettaglioPage` ·
`AccessoMondoPage` · la sostituzione di Tokyo con la metropolitana (5.4) · il lotto dei pin (6.1).

Sono le pagine dell'atlante: dopo le Fasi 1-3 le conosco riga per riga, e rifarle è dove il lavoro
sui pin diventa finalmente visibile.

### Lotto B — Codex: gli inventari

`NegoziPage` · `NegozioPage` · `OggettiPage` e le altre categorie di oggetti delle guide (5.2) ·
`AttivitaPage` e le doti sociali · il Covo dei Ladri, che oggi non ha una pagina propria e va
individuato.

Ognuna deve usare `DoveSiTrova`: è la richiesta dell'utente — *«Negozi e inventario devono
diventare punti di accesso diretto ai rispettivi luoghi nella mappa»*.

### Le fondamenta, prima di tutto il resto

Due metà rifatte separatamente diventano due applicazioni diverse. Serve una base comune **prima**
che uno dei due cominci a rifare pagine: token di layout e spaziatura, la scheda, la griglia
adattiva, l'intestazione, la barra dei filtri, lo stato vuoto, e `DoveSiTrova`.

**Le scrive Claude, le verifica Codex.** Non perché Claude conti di più: perché `DoveSiTrova` tocca
l'ancora dell'atlante, che è del lotto A. Se le validasse chi le ha scritte non varrebbe niente.

## 4. Come lavoriamo, e come si ottimizza

Sei regole. Le prime tre esistono perché il loro contrario è già costato tornate in Fase 2.

**a) Verifica a lotto chiuso, non a commit.** In Fase 2 Codex ha verificato più volte commit che
Claude aveva già superato: dei sei rilievi di una tornata, due erano risolti prima di essere
scritti. Si adotta la proposta di Codex: chi dichiara pronto mette un tag `candidato/<nome>` e la
verifica giudica **quel tag**. Quel che si spinge dopo non riguarda la tornata in corso.

**b) Nessuno tocca il codice dell'altro.** Un rilievo si scrive, e lo chiude chi ha scritto quel
codice. È ciò che rende reale «chi implementa non verifica», invece che nominale.

**c) Il fabbisogno grafico si raccoglie strada facendo.** Ogni pagina finita aggiunge le proprie
voci mancanti a `docs/grafica/fabbisogno.md`: nome del file di destinazione, dimensione, dove si
usa, perché serve. A Fase 5 conclusa quel file **è già** l'elenco della Fase 6, senza un giro di
censimento a parte. È la risposta all'osservazione dell'utente: non si sa cosa serve finché le
pagine non sono rifatte, e allora lo si scrive mentre lo si scopre.

**d) La generazione grafica va a lotti, non a pezzi singoli.** Codex genera un lotto per volta, su
prompt già verificati. Un prompt sbagliato costa una generazione buttata; verificarlo costa una
lettura.

**e) Il lotto dei pin (6.1) parte subito, in parallelo.** È l'unico pezzo grafico che non dipende
dal rifacimento: i 37 tipi di segnalino sono nel registro `shared/spilli.ts` e non cambiano. Claude
scrive i prompt, Codex li verifica e genera, mentre entrambi lavorano alle pagine.

**f) La Fase 7 non è una seconda revisione di tutto.** Se lungo la strada ciascuno ha verificato il
lotto dell'altro, alla fine resta da guardare solo ciò che attraversa il confine fra i due lotti:
la coerenza visiva, la navigazione fra le sezioni, e i casi che nessuno dei due possiede da solo.

## 5. Ordine

```
fondamenta condivise (A scrive, B verifica)
        │
        ├── 5.1/5.3/5.4 lotto A ──┐
        ├── 5.1/5.2/5.3 lotto B ──┤   in parallelo, verifica incrociata
        └── 6.1 pin (A scrive i prompt, Codex genera) ──┘
        │
   docs/grafica/fabbisogno.md riempito strada facendo
        │
     6.2 generazione dei lotti grafici (Codex)
        │
     7.1 revisione incrociata di ciò che attraversa il confine
```

## 6. Stato

| | |
|---|---|
| fondamenta condivise | in corso — `DoveSiTrova` fatto, typecheck pulito, **da verificare a Codex** |
| lotto A | non iniziato |
| lotto B | non iniziato |
| 6.1 pin | non iniziato |
| `docs/grafica/fabbisogno.md` | non ancora creato |

## 7. Domande aperte a Codex

1. Ti va la divisione, o preferisci scambiare i lotti?
2. I prompt: un file per prompt in `docs/grafica/`, o una tabella unica?
3. Mentre scrivo le fondamenta, cominci a **censire** il lotto B — che dati mostra oggi ogni
   pagina, cosa manca, dove servono immagini? Così non stiamo fermi in due.

---

## 5.4 esteso — «anche la mappa dei Memento va sostituita con quella dei Memento, ecc. ecc.»

L'utente ha allargato il punto il 6 settembre: non è solo Tokyo. **Ogni mappa radice deve essere
la mappa che il gioco usa per quella cosa**, non un'illustrazione editoriale.

Oggi le undici radici stanno così:

| radice | immagine attuale | mappa del gioco |
|---|---|---|
| `tokyo` | `mappe/tokyo` — illustrazione | **da comporre**: non esiste un'unica immagine. Il gioco disegna la schermata di viaggio con gli sprite di `P5_MAPDATA.SPD` (icone dei quartieri: il 105 di Shibuya, il Kabukichō di Shinjuku, la ruota di Odaiba, il Kaminarimon di Asakusa…) più le 31 stazioni e i 64 archi di `metropolitana.json` |
| `dungeon-kamoshida` | `palazzi/kamoshida` — illustrazione | **trovata**: `nativo-rmap-151-0-0`, il castello intero visto d'insieme. Verificata a occhio |
| gli altri 8 Palazzi | `palazzi/<nome>` — illustrazione | **da individuare** |
| `dungeon-mementos` | `palazzi/mementos` — illustrazione | **da individuare** |

### Dove si è arrivati nella ricerca, così non si ricomincia

L'ipotesi «la mappa d'insieme è quella con codice `<campo>-0-<n>`» **regge solo per Kamoshida**:
degli altri dieci Palazzi nessuno ha un figlio con minore 0. Il gioco non numera le mappe
d'insieme in modo uniforme, quindi la strada è un'altra.

La fonte giusta è `nomi-mappe-ufficiali.json`, estratto da `FLDWHOLEMAPTABLE.FTD` e
`FLDWHOLEMAPTABLEDNG.FTD`: la tabella `dungeon` ha **11 record e 98 voci valide** — undici come le
radici. È il menu di viaggio che il gioco mostra sulla mappa d'insieme, e le sue voci dovrebbero
dire quale ROADMAP fa da mappa d'insieme per ciascun Palazzo. **Prossimo passo: leggerla record per
record e incrociarla con i codici delle planimetrie.**

Attenzione a una tentazione: prendere «la planimetria più grande» o «quella con più pin» come
mappa d'insieme. Sarebbe un indovinello, e su undici radici ne sbaglierebbe qualcuna in silenzio —
esattamente il tipo di scorciatoia che in Fase 1 è già stata respinta.
