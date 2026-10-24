# R11-10c/11 (M-C) — dati Royal per le correzioni, e testo della voce del 13/11 sera (D8) (2026-10-24)

Sola lettura, nessun commit. Valori «attuali» letti sulla copia di p5s `p5s-2026-10-23-1935Z` (schema 138/30). Codice: HEAD `ad5825de` (D6 già applicata dalla migrazione 192). Le date sono scritte MM-GG nelle tabelle e GG/MM nel testo.

**Fonti Royal.** Walkthrough e guide Royal di Samurai Gamers (giugno, agosto, ottobre, novembre, gennaio, guide dei Confidenti, dei cruciverba, del gesso, dei negozi speciali), più i risultati di ricerca di RPG Site, Ludo.guide e Critical Hits dove citati. Non c'è nessuna fonte AllGameStaff in questo lavoro. Le pagine di novembre, dicembre e gennaio sono nella versione «Second Edition», scritta sulla versione giapponese del gioco; lo segno dove conta.
**Cautele.** Tutte inglesi, quasi tutte dello stesso sito; i walkthrough sono il percorso dell'autore (le date di un cruciverba o di un incontro sono quelle in cui l'evento compare). Dove le fonti si contraddicono lo scrivo e non scelgo. «Alta» vuol dire almeno due pagine concordanti.

---

## 1. Tabella per la migrazione

| # | Punto | Valore attuale in p5s | Valore Royal (fonte) | Correzione proposta | Certezza |
|---|---|---|---|---|---|
| **M-C1a** | Lavenza ×4, voce `165b8cb3…` del 06-08 giorno | `riferimento_chiave = igor`, `riferimento_testo = «Gemelli Custodi - Forza»`, `rango_atteso = 4`, tipo `velluto`, testo «Stanza di Velluto: avanzamenti multipli con i Gemelli Custodi» | Le gemelle di Royal (Caroline e Justine, «Jailer Twins») sono il Confidente della Forza, non l'Igor del Matto: la pagina di Igor le chiama sue «assistenti» e non ha rango per loro; la pagina della Forza ha il suo elenco di richieste di fusione (`strength-confidant-justine-caroline`) | `riferimento_chiave` da `igor` a `gemelle`; testo, `riferimento_testo`, `rango_atteso`, data e fascia invariati; il riferimento di prima in `testo_precedente_json`; guardia sul valore attuale | alta |
| **M-C1b** | `85cce8fc…` del 09-06 | `igor`, `Gemelle Custodi - Forza`, `rango_atteso = 8`, «fusioni con le Gemelle (Anzu, Kodama, Sudama, Lilim) fino al rango 8 (Forza)» | come sopra | come M-C1a | alta |
| **M-C1c** | `d26ea049…` del 11-06 | `igor`, `rango_atteso = 10`, «Gemelle Custodi fino al rango massimo» | come sopra | come M-C1a | alta |
| **M-C1d** | `5cb911c7…` del 01-11 | `igor`, `riferimento_testo = «Lavenza - Il Matto»`, «Incontro con Lavenza all'infermeria; visita di Sumire» | Lavenza ha un'uscita speciale dedicata, ma è elencata nella pagina della Forza («Lavenza outing», 1/13, scheda «Enduring Soul»), non in quella di Igor (nessuna menzione); nessuna pagina la dice Matto | come M-C1a (`riferimento_chiave` → `gemelle`) | **media**: una sola fonte, e non parla del 1/11 |
| **M-C2** | Cruciverba «Ustione» `889aefc1…` | 08-16, fascia giorno, ordine 1, tipo `dote`, effetto Conoscenza +1, nota «Conoscenza +1» | Il cruciverba compare il **17/8 di sera** (parola chiave «Sunburn»; risposte Lotion, Ouch, SPF, Hot). Walkthrough di agosto e guida dei cruciverba concordano; il 16/8 non ha alcun cruciverba | `data` 08-16 → 08-17, `fascia` giorno → sera, in fondo alla fascia (la sera del 17 ha «Akechi al Jazz Club» a ordine 0: il cruciverba va a ordine 1); effetto invariato; il valore di prima in `dati_guida` (la data non è in `testo_precedente_json`) | alta |
| **M-C3** | Voce del 10-15 `6c8e3422…` | giorno, ordine 0, tipo `esame`, «Schivare il gesso in classe (prova di Perizia)», nota «Fascino +2 se riuscito», effetto Fascino +2 | Il gesso lanciato in classe il 15/10 (sabato, pomeriggio) è un evento fisso in cui la schivata è casuale e dipende dal rango di Perizia: **Fascino +2** per la guida dedicata e la guida del Fascino; **+3** per il walkthrough di ottobre («opzionale») e Ludo.guide. Non è una domanda d'esame | `tipo` da `esame` a `altro`; nota «La schivata è casuale e dipende dalla Perizia; se riesce, Fascino +2»; **effetto invariato (+2)**; il +3 resta come divergenza dichiarata | alta (tipo), **media** (+2 contro +3) |
| **M-C4** | Voce del 10-31 `09077817…` | giorno, ordine 1, tipo `esame`, «Rispondere al cruciverba scolastico (Stand)», effetto Conoscenza +1 | Il cruciverba del 31/10 compare **di sera** (parola chiave «Stalls»: Stalls, Yukata, Yakitori; walkthrough e guida concordano). Il pomeriggio è lezione, la sera cruciverba e freccette. Nessun Kawakami | testo «Cruciverba (Stand)», `tipo` `dote`, `fascia` giorno → sera, davanti a «Freccette a Kichijoji» (come nel walkthrough: prima il cruciverba, poi le freccette; le freccette passano a ordine 1); effetto invariato | alta |
| **M-C5 (M-E)** | Hagoromo | negozio `friggitoria-hagoromo`, sede `kichijoji/hagoromo`, `orari_json` {domenica, sera}; articolo «Katsu a pezzettoni» 150 yen, «Ripristina 30 SP», «dal 5 giugno», «solo la domenica sera»; nota del negozio «…la disponibilità del Katsu è dichiarata sull'articolo (G-033, **da verificare**)»; luogo `kichijoji/hagoromo` con `quando = sera` e `orari_json` NULL | **Tutto confermato**: «Fried Food Shop (Hagoromo Meat Shop)» a Kichijoji, «Chunky Katsu» 150, ripristina 30 PS a un alleato, solo la domenica sera; Kichijoji si apre il 5/6 (domenica) e quella sera il Katsu si compra già (walkthrough di giugno, guida dei negozi speciali, lista dei luoghi) | Togliere «da verificare» dalla nota del negozio scrivendo che la fonte Royal conferma; dare al **luogo** `orari_json = {"giorni":["domenica"],"fasce":["sera"],…}` come il negozio (oggi il luogo risulta aperto sempre, mentre l'unico negozio è aperto solo la domenica sera); testo dell'effetto «Ripristina 30 SP a un alleato» (opzionale) | alta |
| **M-C6** | Voce del 06-05 `bfa39e5f…` (Hagoromo, in più) | giorno, ordine 5, tipo `acquisto`, «Friggitoria di Kichijoji (di fronte al negozio di vestiti usati): comprare Katsu a pezzettoni», nota «150 yen; ripristina 30 SP», nessun effetto | Il Katsu si compra **di domenica sera**; il walkthrough Royal lo mette il 5/6 di sera | `fascia` giorno → sera; effetto `articolo` `friggitoria-hagoromo/katsu-a-pezzettoni` | alta |

**Hacker e il doppione (D7).** Né la guida dei cruciverba né il walkthrough hanno un cruciverba il 29/8; il cruciverba «Hacking» (Breach, Virus, Sin) è il **30/8 di sera**. Conferma che la voce del 29/8 è la copia e quella del 30/8 sera è la giusta.

**Conoscenza dei cruciverba.** Il walkthrough dà Conoscenza +2 per cruciverba, la guida dei cruciverba +1; i dati hanno +1. Lo lascio e lo segnalo (non è un punto di M-C).

### Controlli di sola lettura

- Nessuna di queste voci ha spunte su p1 o p2 e nessuna è del Diario validato (≤ 06-01). Spostare data, fascia e ordine non tocca nessuno stato di partita, che è per `voce_uid`.
- `889aefc1`, `6c8e3422` e `09077817` hanno ciascuna un effetto `dote` (Conoscenza +1, Fascino +2, Conoscenza +1): non si toccano. `bfa39e5f` e `7c081417` non hanno effetti.
- Le tre voci Gemelle e la voce Lavenza non hanno spunte né effetti; dopo il cambio di `riferimento_chiave` l'accumulo dei punti non cambia: `gemelle` ha tutti i ranghi `velluto`, senza punti (migrazione 161).

### Discrepanze Royal da dire, senza correggerle

1. **Date delle voci Gemelle (06-08, 09-06, 11-06).** Le pagine Royal non datano nessun avanzamento di rango delle gemelle: in tutti i walkthrough (giugno, luglio, agosto, settembre, ottobre, dicembre) la Forza resta «rango 1» nelle tabelle e non ci sono richieste di fusione. Sono datati solo il rango 8→9 e il 9→10 del **8/11** (walkthrough di novembre) e le uscite speciali (6/6, 7/6, 15/6…). Il 06-08 non ha alcuna azione della Forza, e il 11-06 è due giorni prima del rango massimo Royal. Non propongo di cambiare le date: l'unica correzione di M-C1 è il riferimento.
2. **Lavenza il 1/11.** Il walkthrough di gennaio non nomina Lavenza l'11/1 («Follow the butterfly» e scene di storia); l'uscita con Lavenza è il 13/1 di sera.
3. **Gesso.** +2 contro +3, vedi M-C3.

---

## 2. Testo serale della voce del 13/11 (D8: «Riscriverla»)

**La voce oggi** (`7c081417…`, 11-13 sera, ordine 0): tipo `palazzo`, riferimento `confidente` `makoto` («Palazzo di Sae Niijima»), `da_rivedere = 1`, motivo «La sera non si entra nei Palazzi: il testo va rivisto (Esperto della guida)», testo «Completare l'infiltrazione del palazzo», nessun effetto, nessun legame con infiltrazioni, nessuna spunta. Lo stesso giorno ha, di giorno (ordine 6), la voce `ebe00e6b…` con tutta l'infiltrazione («Palazzo di Sae: infiltrazione nel casino… avanzamento nell'area staff e nel piano riservato ai soci»); il 14/11 di giorno c'è la continuazione (`dece90bf…`, Lobby del Piano Puntate Alte, anch'essa `da_rivedere = 1`).

**Che cosa dice il Royal.** Nel walkthrough di novembre non c'è nessuna attività nel Palazzo di sera né il 12, né il 13, né il 14. Di domenica 13/11 sera elenca, in ordine: l'oggetto che ridà PS alla friggitoria di Kichijoji («solo la domenica sera»), lo scambio con il mercante Sakai, gli acquisti dalle televendite e l'incontro con Mishima (Luna, 9→10). Nessuna pagina letta dice in modo esplicito che di sera il Palazzo non si può visitare: l'affermazione viene dall'Esperto della guida (G-022, G-028) e dal fatto che nessuna infiltrazione risulta mai di sera.

**Coerenza con i dati di p5s.** Lo scambio con Sakai e le televendite sono già nel giorno del 13/11 (`cfc153ce…`, `c594c2f6…`). Mishima ha il suo ultimo incontro il 3/11 (`67c91e8d…`, rango 10): aggiungerlo il 13/11 sarebbe in conflitto con il Diario. Resta l'acquisto della friggitoria, che è proprio della domenica sera, e il 13/11 è una domenica (2016).

**Testo proposto** (per la migrazione, a BE e al PM):

- `azione`: **«Friggitoria di Kichijoji (solo la domenica sera): comprare Katsu a pezzettoni prima della prossima infiltrazione»**
- `note`: **«150 yen; ripristina 30 PS a un alleato. Il Palazzo non si visita di sera: l'infiltrazione del giorno è nella voce di giorno.»**
- `tipo`: `acquisto` (come la voce del 5/6); `genere`: azione; `fascia`: sera; `ordine`: 0
- `riferimento_tipo`, `riferimento_chiave`, `riferimento_testo`: **tolti** (oggi puntano al Palazzo e a Makoto); nessun legame con infiltrazioni
- `da_rivedere`: 0 e `motivo_revisione` vuoto; il testo di prima («Completare l'infiltrazione del palazzo») e il riferimento di prima in `testo_precedente_json`
- effetto: `articolo` `friggitoria-hagoromo/katsu-a-pezzettoni` (lo stesso di M-C6)

**Perché questa e non un'altra.** (a) Le fonti Royal dicono domenica sera e la friggitoria vende solo allora; (b) l'infiltrazione è già tutta nella voce di giorno, quindi la sera non perde niente; (c) un acquisto non cambia nessun conteggio del Palazzo; (d) non inventa un incontro o una scena che il Diario non ha.
**Alternativa.** Una voce serale generica («Tempo libero: preparare l'infiltrazione del 14/11»), senza acquisto. Ho scelto il Katsu perché ha una fonte Royal datata.

---

## 3. Limiti

- Fonti inglesi, un solo sito principale; nessun accesso ad AllGameStaff né al gioco.
- Per i cruciverba ho verificato che walkthrough e guida concordino su data e fascia; la guida dice che le date sono quelle in cui il cruciverba compare nel booth del Leblanc, non un calendario di pubblicazione.
- Il walkthrough di novembre è la «Second Edition» sulla versione giapponese.
- Non ho eseguito alcuna migrazione né test: le tabelle sono proposte.
