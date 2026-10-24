# Iweleth e il Palazzo di Maruki nelle guide Royal (2026-10-24)

Richiesta dell'utente, passata dal PM: «Verifica con le guide Royal». Sola lettura, nessun commit. Dati dell'app: copia di p5s `p5s-2026-10-23-1935Z` (schema 138) e la stessa copia con le migrazioni fino alla 199.

## 0. Una distinzione da fare subito

La domanda parla del «Palazzo di Maruki (Iweleth)». **Nei dati dell'app e nelle guide sono due cose diverse:**

| | Che cos'è | Nell'app |
|---|---|---|
| **Palazzo di Maruki** | il Palazzo del terzo semestre (gennaio–febbraio), sovrano il dott. Takuto Maruki | dungeon `maruki`, tipo `palazzo`: 12 infiltrazioni, 12 aree, finestra 01-02 → 02-03; boss finale `maruki-12-eden-modello-psi-cognitivo-eden/3` |
| **Dedalo di Iweleth** | l'ultima area dei Memento («Profondità dei Memento» e Mondo del Clifoto, fino a Yaldabaoth), dal 24/12 | dungeon `iweleth`, nato come `palazzo` dalla pagina AllGameStaff «Dedalo di Iweleth»; dalla migrazione 175 (`cf1f3fc8`, D3) esiste solo come dedalo dei Memento `mementos-08-iweleth`, con 16 aree e 12 infiltrazioni nell'«Archivio del Palazzo di Iweleth» (`dedalo_confluenza`) |

Rispondo per tutti e due. La domanda del PM («Palazzo come gli altri o dedalo?») riguarda **Iweleth**; Maruki è già un Palazzo e le guide lo confermano.

---

## 1. Le fonti Royal

| # | Fonte | Indirizzo | Che cosa dice (breve) |
|---|---|---|---|
| F1 | AllGameStaff, guida italiana, la pagina da cui l'app ha preso i dati | `https://www.allgamestaff.it/persona-5-royal/dedalo-di-iweleth/` (indicata in `dungeon.fonti_json` di `iweleth`) | La pagina si intitola **«Dedalo di Iweleth»**, non «Palazzo». Contiene le Profondità dei Memento (Corridoio della prigione, Vuoto cavernoso, Santuario con il Santo Graal) e il Mondo del Clifoto (Cammino per il Santo Graal I–IV, Yaldabaoth «Dio del Controllo»). Non ho potuto riaprirla: la conosco dai dati dell'app |
| F2 | Samurai Gamers, «Path of Iweleth» | `https://samurai-gamers.com/persona-5/path-of-iweleth-guide/` | «A Mementos dungeon and strategy guide for the Path of Iweleth»: un **percorso dei Memento**, 1 area, nessun posto sicuro, nessuna richiesta, nessun fiore, nessuna Persona esclusiva; sblocco 12/24 «Begin the Depths of Mementos»; fra Sheriruth e Da'at |
| F3 | Samurai Gamers, «Mission list» (percorsi dei Memento) | `https://samurai-gamers.com/persona-5/mission-list/` | Elenca otto percorsi con richieste (Qimranut, Aiyatsbus, Chemdah, Kaitul, Akzeriyyuth, Adyeshach, Sheriruth, Da'at): **Iweleth non c'è**, perché non ha richieste |
| F4 | Samurai Gamers, Profondità dei Memento, Royal | `https://samurai-gamers.com/persona-5/p5r-depths-of-mementos-guide` | Sezioni «Prison Passageway 1–7» e «Path to the Shrine», safe room nei passaggi 2, 4 e 7; boss scriptato: il Tesoro dei Memento (Holy Grail). Nessuna data, nessun Iweleth |
| F5 | Samurai Gamers, Profondità dei Memento, guida del gioco base | `https://samurai-gamers.com/persona-5/mementos-dungeon-walkthrough/` | «Start: Saturday, December 24», «Deadline: –», livello consigliato 70, nessun lockpick |
| F6 | Samurai Gamers, elenco dei boss dei Palazzi | `https://samurai-gamers.com/persona-5/boss-palace-guide/` | Nell'elenco «Palace Boss Guides» compaiono Holy Grail e **Yaldabaoth (God of Secrets)**; elencate come guide dei Palazzi anche «Depths of Mementos» e «World of Qlipoth» |
| F7 | Samurai Gamers, walkthrough di dicembre | `https://samurai-gamers.com/persona-5/p5r-december-walkthrough/` | 24/12: «Metaverse: Depths of Mementos» (si sconfigge il Santo Graal; Igor 9→10) e poi «Metaverse: Qlipoth World» (si sconfigge Yaldabaoth). Nessun giorno di infiltrazione per Iweleth |
| F8 | Samurai Gamers, guida Royal del Palazzo di Maruki | `https://samurai-gamers.com/persona-5/p5r-maruki-palace-guide/` | Pagina propria («Maruki Palace Overview and Infiltration Guide»), con infiltrazioni datate 1/2, 1/9, 1/12, «Main Infiltration» e «Outcome Model Eden (2/3)» |
| F9 | Samurai Gamers, walkthrough di gennaio e febbraio | `https://samurai-gamers.com/persona-5/p5r-january-walkthrough/`, `…/p5r-february-walkthrough/` | Voci «Maruki Palace – … Infiltration» il 1/2 (nel walkthrough «???»), 1/9, 1/12, 1/26 («Reach treasure area of the cognitive palace»); 2/3 «Maruki Palace – Boss Battle» |
| F10 | Gfinity, elenco dei Palazzi | `https://www.gfinityesports.com/guides/persona-5-royal-palaces` | Maruki è il nono Palazzo, «Center of Melancholy»; riga: visto a ottobre, accesso il 2 gennaio, 5 visite minime, **scadenza 6 gennaio** (senza altra spiegazione) |
| F11 | Samurai Gamers, boss | `https://samurai-gamers.com/persona-5/azathoth-boss-guide/`, `…/adam-kadmon-boss-guide/` | I due boss finali di Maruki («first boss in ???», «second and final boss in ???») |

Tutte inglesi tranne F1, e quasi tutte dello stesso sito; i walkthrough sono percorsi d'autore. Pagine di Samurai Gamers non lette in questo giro: le pagine di Qlipoth World e del Santo Graal.

---

## 2. Come le guide trattano Iweleth

**Non è un Palazzo.** Le due guide lo trattano come parte dei Memento:
- AllGameStaff la chiama «Dedalo di Iweleth» (F1); l'app l'aveva importata come `palazzo` per errore di classificazione e la 175 l'ha corretta.
- Samurai Gamers: «Path of Iweleth», un percorso dei Memento di una sola area, senza richieste né Persona esclusive (F2, F3). Nessuna pagina lo chiama «Palazzo», «Palace of Iweleth» o «Palazzo di Maruki (Iweleth)». Nessuna pagina dà un livello di sicurezza né un Tesoro.

**Struttura.** Qui le due guide **non coincidono sulla divisione**:
- Samurai Gamers separa tre cose: il percorso di Iweleth (1 area, vuota), le **Profondità dei Memento** (Prison Passageway 1–7, Path to the Shrine, Holy Grail, F4/F5) e il **Mondo del Clifoto / Qlipoth World** (Yaldabaoth, F6/F7). L'ordine dei percorsi è Sheriruth → Iweleth → Da'at.
- AllGameStaff le mette tutte sotto «Dedalo di Iweleth»: Entrata, Corridoio della prigione I–V, Vuoto cavernoso I–II, Santuario, poi Piazza stazione di Shibuya / Mondo del Clifoto e Cammino per il Santo Graal I–IV (le 16 aree e le 12 infiltrazioni dell'app).

**Date.** Sblocco il **24/12**, per tutte e due (F2, F5, F7); **nessuna scadenza** («Deadline: –», F5); nessun biglietto di sfida né soglia di visite. Nel walkthrough il 24/12 il Santo Graal e Yaldabaoth si affrontano il giorno stesso (F7). L'app ha oggi `finestra_dal = 12-24` e nessuna fine: coincide.

**Un'incongruenza fra le fonti.** L'app dice «tramite l'Area 14 del Dedalo di Sheriruth: una parete si apre»; Samurai Gamers dice che si arriva iniziando le Profondità dei Memento il 24/12 e non nomina nessuna parete (la richiesta «Head Honcho» è data da una sua pagina all'Area 14 di Sheriruth e da un'altra a Da'at 14).

## 3. Come le guide trattano il Palazzo di Maruki

**È un Palazzo come gli altri** per le guide: ha la sua pagina (F8), le sue voci di infiltrazione nei walkthrough (F9), un posto fra i Palazzi (F10, «ninth palace») e due boss con guida (F11). Con due differenze:

1. **Si entra dai Memento**: la «Main Infiltration» dice di salire fino all'area 15 di Da'at (F8). Il Palazzo non è però un'area dei Memento: ha i suoi livelli, i suoi posti sicuri e i suoi boss.
2. **Non ha il nome all'inizio**: le guide lo scrivono «???» finché un evento ne rivela il nome (F8, F9); la guida italiana usa «??? Ingresso», «??? Percorso di prova», «??? Auditorium»… come l'app. Nessuna fonte letta dà un nome in gioco.

**Struttura (F8):**
1. Prima infiltrazione (1/2): ingresso, ascensore, percorso di prova, nemici.
2. Seconda (1/9): auditorium, boss Cendrillon, «Locate the Treasure Persona Diamond and Orichalcum» (il testo è sospetto: sembra copiato da un altro Palazzo).
3. Terza (1/12): gruppo dei Loa, auditorium con rampino, Dionysus e Chimera, magazzino, sala monitor, posto sicuro, Cu Chulainn e Scathach.
4. Infiltrazione principale (dai Memento, Da'at 15): sala monitor, reparto di ricerca, posto sicuro del laboratorio, stanze dei colori, sala dei trattamenti, Twilight Recovery (posto sicuro), giardino.
5. Sequenza finale «Outcome Model Eden (2/3)»: rampino, spirale, boss, boss finale.
I boss: tre tentacoli, **Azathoth** (circa 6.000 PV), il dott. Maruki (circa 8.000 PV), **Adam Kadmon**; livello consigliato almeno 85.
**Sicurezza e Tesoro:** nessuna pagina nomina un livello di sicurezza («security door» è solo un puzzle) né descrive un Tesoro o la sua forma. Nessun biglietto di sfida (F10 dice solo la regola generale: dopo il tesoro si manda il biglietto e il giorno dopo c'è il boss).

**Date.**
- Accesso: **2 gennaio** (F8, F10).
- Walkthrough d'autore: 1/2, 1/9, 1/12, 1/26 («treasure area») e boss **2/3** (F9). F9 scrive anche «infiltration mission starts» il 13/1, in contrasto con il 2/1.
- Scadenza: **6 gennaio** solo in F10, senza spiegazione, e **incompatibile con il walkthrough** (infiltrazioni il 9/1, 12/1 e 26/1, boss il 3/2). Nessuna fonte letta dice che il gioco imponga un limite.
- L'app: finestra 01-02 → 02-03 e «scadenza 3 febbraio, il percorso va assicurato entro il 2 febbraio»; boss finale Eden. Il 2/2 non compare in nessuna fonte Royal letta (nel registro dell'Esperto c'è «assicurare il percorso entro il 2/2»: viene dall'AllGameStaff).

---

## 4. Che cosa cambierebbe nell'app se seguissimo le guide

| Ipotesi | Effetto |
|---|---|
| **Iweleth resta dedalo dei Memento** (le guide lo dicono; stato attuale dopo la 175) | **Nessun cambiamento.** Il 24/12 resta lo sblocco, nessuna scadenza, nessuna infiltrazione datata |
| Iweleth tornasse Palazzo | Contrario alle guide: avrebbe bisogno di una scadenza, di un biglietto e di infiltrazioni che le fonti non danno. Non lo propongo |
| **Dividere Iweleth in tre nodi** come fa Samurai Gamers: percorso di Iweleth (1 area vuota), Profondità dei Memento (Prison Passageway 1–7, Santuario) e Mondo del Clifoto (Yaldabaoth) | Cambia solo la presentazione dell'«Archivio del Palazzo di Iweleth» nel dedalo (le 16 aree e le 12 infiltrazioni si ripartirebbero fra due nodi sotto Iweleth). AllGameStaff, la fonte dell'app, non le divide: non è richiesto da nessuna decisione |
| **Maruki resta Palazzo** | Nessun cambiamento di classe. Possibile aggiunta: dichiarare nella nota del Palazzo che l'accesso passa dai Memento (Da'at 15) e che il nome compare dopo un evento; la scadenza resta 3/2 salvo decisione |
| Scadenza di Maruki | Le fonti Royal non confermano il 2/2; il 6/1 di Gfinity contraddice il walkthrough. Resta senza prova: **non cambiare il 3/2** senza una seconda fonte |

## 5. La proposta, in una riga

**Iweleth resta un dedalo dei Memento (come dicono AllGameStaff e Samurai Gamers) e il Palazzo di Maruki resta un Palazzo (01-02 → 02-03): nessun cambiamento di classificazione; la scadenza di Maruki e la divisione di Iweleth in tre nodi si decidono solo con una seconda fonte.**

## 6. Domande in una riga per l'utente

1. «Il dedalo di Iweleth resta unico (come l'AllGameStaff) o lo dividiamo in percorso, Profondità dei Memento e Mondo del Clifoto (come Samurai Gamers)?»
2. «La scadenza di Maruki resta il 3 febbraio (guida italiana), anche se Gfinity dice il 6 gennaio e nessuna fonte Royal dice il 2 febbraio?»

## 7. Limiti

- Non ho riaperto la pagina AllGameStaff (F1): quel che dico viene dai dati dell'app e dall'indirizzo di `fonti_json`. Samurai Gamers e Gfinity sono secondari e in inglese; i walkthrough sono percorsi d'autore. Le pagine di Qlipoth World e del Santo Graal non sono state lette.
- Nessun test e nessuna migrazione eseguiti.
