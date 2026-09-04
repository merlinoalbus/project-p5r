# Bonus della Stanza di Velluto — regole numeriche (Fase 4.2, integrate in 5.4)

## Integrazione 2026-09-03 sera (Fase 5.4) — fusione, materiali e Allarme
- **La fusione non trasferisce livelli né statistiche dei materiali**: il livello del risultato si calcola sui livelli base delle specie
  («使用するのは現在Lvではなく、各ペルソナに設定されている初期Lv», wikiwiki.jp/persona5r ベルベットルーム; kamigame 合体の法則; guide EN).
  Eccezione: la fusione con Demone del Tesoro legge il livello attuale del Tesoro (kamigame 宝魔合体). Il carry-over per giri successivi esiste
  in Persona 5 Strikers (力の蓄積), non in Royal. Affidabilità **alta**.
- **Bonus di livello del Confidente alla fusione** (omoteura.com ギロチン刑): livelli extra della Persona creata per fase del Matto e rango
  dell'arcano — Matto 1–5: ranghi 1–3 → +1…+2, 4+ → +2; Matto 6–9: 1–2 → +1, 3–4 → +2, 5–6 → +3, 7+ → +4; Matto 10: 1–2 → +1…+2,
  3–5 → +2…+3, 6–8 → +4…+5, 9–10 → +5…+6. Ogni livello +3 punti casuali (le statistiche «gialle» nella schermata si possono rimescolare
  uscendo e rientrando). Affidabilità **media** (fonte singola con intervalli osservati).
- **Punti dell'Allarme alla Ghigliottina** (wikiwiki.jp 合体警報): +15 (ingredienti normali), +20 (una Persona gialla), +25 (due gialle);
  1–3 skill possono mutare in versioni superiori; la Persona creata è «gialla» (carica). Affidabilità **alta**.
- **Forca con Allarme**: game-kouryaku.info riporta «i moltiplicatori normali raddoppiano» (e 2 skill trasferite), wikiwiki riporta la scala
  fissa 2/3/5/7: l'app usa la scala fissa e segnala la divergenza. Incidente: +5 (normale) / +10 (una gialla) / +15 (due gialle), nessuna EXP;
  con l'Allarme lo stesso bersaglio può essere potenziato più volte al giorno. Affidabilità **alta**.
- **Ciclo per il 99 in Royal** (wikiwiki.jp おすすめ強化, altema, puni-perpetual, ameblo): Chihaya rango 8 (禁忌・天運占い) + Ryuji rango 7 (瞬殺);
  Allarme → fusione di due Persona qualsiasi → gialla → Forca sul bersaglio → incidente +10; ~20–28 cicli per un livello 80+ (1–2 ore).


Censimento del 2026-09-03 (fonti e affidabilità per ogni regola). Costanti e funzioni in `shared/bonusVelluto.ts`; stato per partita da `GET /api/fusione/velluto`.
Nell'app: sconto del Registro applicato ai costi di ricette e piani; bonus EXP del Confidente nel calcolatore e nel pannello «Stanza di Velluto»;
calcolatori «Forca e Isolamento»; interruttore dell'Allarme salvato nella partita; sblocchi delle Gemelle.


Documento di riferimento per l'ottimizzatore dei bonus di fusione (Fase 4). Copre 9 argomenti; per ognuno: regola/numeri, condizioni ed eccezioni Royal, fonti, affidabilità, e un paragrafo su come modellarlo nell'app `project-p5r-main`. Gli estratti grezzi sono in `raw/`. Dove le fonti divergono, sono riportate **entrambe le versioni**, senza sceglierne una.

Legenda affidabilità: **alta** = confermata da 2+ fonti indipendenti (idealmente EN + JP) o da codice/dati primari; **media** = una fonte primaria solida o due fonti che si limitano a citarsi a vicenda; **bassa** = una sola fonte debole, o dato dedotto/non isolato.

---

## 1. Bonus EXP del Confidente sulla fusione

### Regola generale
Quando una Persona viene creata/potenziata e la sua Arcana corrisponde all'Arcana di un Confidente con cui Joker ha legame, la Persona riceve EXP bonus proporzionale al **rango** di quel Confidente. **Non è un'esclusiva del Confidente Forza**: fandom.com/wiki/Confidant (sezione "Role") afferma esplicitamente che *ogni* Confidente allineato all'Arcana del risultato dà il bonus — affidabilità **alta** (fonte diretta, wikitext).

### Numeri — due tabelle trovate, riferite a meccaniche potenzialmente diverse

**Tabella A — "fusione/hanging" generica** (megamitensei.fandom.com/wiki/Experience, sezione *Persona 5 / Royal → Fusion*, che cita a sua volta wikiwiki.jp sia per P5 sia per P5R con la stessa tabella):

| Rango Confidente | 0 (nessuno) | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Moltiplicatore EXP | ×1.0 | ×1.15 | ×1.3 | ×1.5 | ×1.7 | ×2.0 | ×2.15 | ×2.3 | ×2.5 | ×2.7 | ×3.0 |

Affidabilità: **media** (fonte aggregatore unico, per quanto citi due pagine JP identiche per P5 e P5R — nessuna riverifica diretta indipendente sulla pagina JP sorgente).

**Tabella B — Forca/Potenziamento per sacrificio** (wikiwiki.jp, pagina specifica sul Potenziamento; trovata **indipendentemente da due agenti di ricerca diversi**, con valori coincidenti):

| Rango Confidente ricevente | Igor non al rango massimo | Igor al rango massimo |
|---|---|---|
| 1 | ×1.25 | ×1.5 |
| 5 | ×2.25 | ×2.75 |
| 10 | ×3.5 | ×4.0 |

Moltiplicatori aggiuntivi, cumulativi con la tabella B:
- Sacrificio della **stessa Arcana** del ricevente: **×1.5**
- Sacrificio è un **Demone del Tesoro** di Arcana diversa: **×3**
- Sacrificio è un **Demone del Tesoro della stessa Arcana**: **×5**
- Teorico massimo cumulato (rango MAX + Igor MAX + Tesoro stessa Arcana): **×4.0 × ×5 = ×20** (nessuna fonte conferma che i moltiplicatori si sommino esattamente così; è un limite superiore plausibile, non verificato).

Affidabilità: **alta** per la struttura generale (2 fonti indipendenti concordi sui valori di riferimento), **media** per la certezza che i moltiplicatori si combinino per moltiplicazione pura.

**Divergenza aperta**: non è chiaro se la Tabella A (fusione a 2 ingredienti) e la Tabella B (Forca/sacrificio) descrivano davvero due meccaniche distinte, oppure se una delle due fonti stia descrivendo la stessa meccanica con un'approssimazione/traduzione diversa. La pagina JP citata da fandom per la Tabella A si chiama letteralmente "ペルソナ強化" (Persona Strengthening), lo stesso termine usato per la Forca — sospetto quindi che le due tabelle si sovrappongano parzialmente, ma non è verificabile con le fonti raccolte. **Riportare entrambe nell'app, etichettate per meccanica, senza fonderle.**

**Durante il Fusion Alarm**, i moltiplicatori della Forca sono **sostituiti** (non cumulati) da una scala fissa — vedi § 2 e § 3.

### Punti statistica per livello guadagnato
- Ogni livello guadagnato (da battaglia, fusione o Forca) distribuisce **+3 punti statistica totali**, casuali tra le 5 statistiche (FR/MA/RS/AG/FO) — confermato indipendentemente da wikiwiki.jp (via due agenti) e dalla guida pixelflood.it già in uso nel progetto. Affidabilità **media-alta**.
- Formula cumulativa trovata (GameFAQs + wikiwiki.jp): punti statistica totali di una Persona di livello L ≈ **L×3 + 7** (coerente con +3/livello a partire da una base di 10 punti a livello 1). Affidabilità **media** (2 fonti, nessuna verifica su dataset di gioco reale).
- Cap: **99 punti per statistica** (confermato da più fonti, GameFAQs esplicito per P5R). Il valore "90 senza equipaggiamento speciale, 99 con equip" e "304 punti totali massimi a livello 99" provengono solo da pixelflood.it — nessuna fonte EN indipendente li conferma né li smentisce. Affidabilità **media**.
- Eccezioni: alcune Persona con statistiche base più alte del normale (Agathion, Shiki-ouji, Koumokuten, Black Rider, Dominion) possono superare il totale-cap "standard" a parità di livello — fonte GameFAQs/wikiwiki.jp, affidabilità **media**.

### Come modellarlo nell'app
La tabella `confidente_rango` (migrazione 004) già traccia i ranghi. Aggiungere una tabella `confidente_bonus_fusione(confidente_chiave, rango, moltiplicatore_fusione, moltiplicatore_forca_no_igor, moltiplicatore_forca_igor_max)` per separare esplicitamente le due meccaniche (A e B) senza fonderle, con un campo note per segnalare l'incertezza sulla sovrapposizione. Il moltiplicatore da usare per l'ottimizzatore va scelto per default sulla Tabella B (più corroborata), con la Tabella A disponibile come alternativa configurabile.

---

## 2. Allarme delle fusioni (Fusion Alarm)

### Attivazione
- Sbloccato dopo aver assicurato la rotta al Tesoro nel Palazzo di Kaneshiro e aver tentato di uscire (prima data possibile: 21 giugno).
- Trigger **probabilistico**, non un numero fisso di battaglie: cresce con le vittorie accumulate nel Metaverso (incluso l'Instakill del Confidente Carro/Ryuji, rango 7). wikiwiki.jp: "più vittorie si accumulano, più sale la probabilità" (nessuna percentuale esatta pubblicata).
- **Trigger aggiuntivo**: la lettura "Proibita — Fortuna Celeste" del Confidente Fortuna (Chihaya, rango 8), a pagamento, fa scattare l'allarme immediatamente nel mondo reale e aumenta la probabilità che scatti anche nel Metaverso lo stesso giorno.
- Affidabilità: **alta** (wikiwiki.jp + fandom.com concordi sul meccanismo generale).

### Durata e reset
- Nessun numero fisso di operazioni o giorni. Resta attivo finché non avviene un incidente (che espelle forzatamente il giocatore), oppure finché non si esce dalla Stanza (ma solo *dopo* aver eseguito almeno un'operazione) o si parla ai gemelli custodi.
- Se scattato nel mondo reale, resta attivo anche entrando nel Metaverso; se scattato nel Metaverso, tornare al mondo reale lo interrompe.
- Durante l'allarme non si possono mostrare a Justine le Persona richieste per il Confidente Forza.
- Affidabilità: **alta**.

### Effetto sulla fusione normale (Ghigliottina)
- La Persona fusa ottiene **statistiche extra** oltre al normale +3/livello, e i **Demoni del Tesoro sono trattati come 5 livelli più alti** del reale, permettendo fusioni altrimenti irraggiungibili.
- Le skill del risultato hanno una possibilità di **mutare in versioni potenziate/diverse** (es. *Null Ice* → *Repel Ice*); alcune skill di fascia alta mutano in skill completamente diverse.
- La Persona fusa durante l'allarme resta **"carica"** (nome scritto in oro) per il resto dell'allarme, e viene considerata potenziata per fusioni successive nello stesso allarme (anche in fusione di rete).
- Se una Persona "carica" viene riusata in un'altra fusione: **incidente quasi garantito** con una sola carica (altrimenti bonus statistico); **incidente sempre garantito** con due Persona cariche. In caso di incidente le skill/il Tratto mutano in uno di ~11 set a tema (1 carica) o ~14 set a tema (2 cariche) — es. set elementali "Bloodline" con Boost+Amp+Concentrate+Drain dello stesso elemento.
- Affidabilità: **alta** (wikitext primario fandom.com/wiki/Fusion_alarm, verificato direttamente).

### Forca (Gallows)
- Skill ereditate: **1 casuale** normalmente → **1-3 casuali** durante l'allarme, con il numero randomizzato in anticipo (non scelto). Confermato anche da fandom.com/wiki/Skill_Inheritance, indipendente dalla pagina Fusion Alarm.
- EXP: i moltiplicatori normali (Tabella B, § 1) sono **sostituiti** durante l'allarme da una scala fissa, trovata identica da due agenti indipendenti su wikiwiki.jp:

| Sacrificio | Moltiplicatore normale | Moltiplicatore durante Allarme |
|---|---|---|
| Persona qualsiasi, Arcana diversa | ×1.0 (× rango Confidente) | **×2** |
| Persona della stessa Arcana | ×1.5 (× rango Confidente) | **×3** |
| Demone del Tesoro, Arcana diversa | ×3 | **×5** |
| Demone del Tesoro, stessa Arcana | ×5 | **×7** |

- Il limite di **1 Forca/Persona al giorno di gioco** salta durante l'allarme (si può ripetere sulla stessa Persona finché non avviene un incidente).
- **Incidente alla Forca**: nessuna EXP guadagnata, ma bonus statistico casuale garantito: **+5 punti** (sacrificio "normale"), **+10 punti** (una Persona "carica" coinvolta), **+15 punti** (entrambe "cariche" — in questo caso l'incidente è garantito al 100%). Fonte fandom.com dà "5 o 10" (senza il caso "entrambe cariche"); wikiwiki.jp (via agente) dà "5/10/15" — **divergenza riportata**: il valore "15" non è confermato dalla fonte EN diretta.
- Affidabilità: **alta** per la tabella 2×/3×/5×/7× (2 fonti indipendenti concordi); **media** per il bonus +15 in caso di doppia carica.

### Sedia elettrica (itemizzazione)
- Con l'allarme attivo (senza incidente): l'oggetto ottenuto è **un tier sopra il normale, in modo garantito** (non casuale): skill card mono-bersaglio → multi-bersaglio (o viceversa più forte), accessori con skill/statistiche superiori, equipaggiamento in versione più forte. Questo corrisponde esattamente al campo `oggettoAllarme` già presente nel dataset dell'app: un oggetto alternativo/potenziato garantito, non un drop probabilistico.
- Con **incidente** (forzabile ripetendo la Sedia consecutivamente): l'oggetto ottenuto è diverso da quello annunciato — per itemizzazione di Persona *non* cariche, tabella per fascia di livello del sacrificio:

| Livello Persona sacrificata | Ricompense possibili |
|---|---|
| fino a 35 | Megido/Divine Grace (skill card), Alluring/Mighty/Lucky Belt, uno dei 5 incensi base (ST/MA/EN/AG/LU) |
| 36–55 | Heat Up/Ailment Boost (skill card), Hell/Almighty Ring, Miracle Belt, incensi Ambergris |
| 56+ | Life Aid/Fortify Spirit/Amrita Shower/Angelic Grace (skill card), Deadly Fury Belt, incensi Nirvana |

Per itemizzazione di Persona **cariche** con incidente: sempre una skill card, dal pool Boost/Amp/Resist/Null/Repel/Drain/Dodge/Evade di ogni elemento (incluse combinazioni normalmente impossibili come Psy Amp), con regole di probabilità legate alle resistenze/debolezze della Persona sacrificata.
- Affidabilità: **alta** (wikitext primario fandom, con tabella esplicita).

### Isolamento
- Il bonus statistico dell'incenso (vedi § 4) viene **raddoppiato** se l'incenso è acceso durante l'allarme (deve essere attivo al momento dell'accensione, non al ritiro). Confermato da due fonti indipendenti. Affidabilità **alta**.

### Rischio di incidente e come si azzera
- Probabilità iniziale **0%** per ciascun metodo (Ghigliottina/Forca/Sedia) a inizio allarme.
- Ogni uso dello stesso metodo la fa crescere molto; ripetere lo **stesso metodo due volte consecutive** rende l'incidente pressoché garantito. Alternare metodi diversi riduce il rischio.
- Ogni evocazione dal Registro durante l'allarme aumenta il rischio **per tutte le operazioni contemporaneamente**; una fonte (thegamer.com, non confermata altrove) afferma che una seconda evocazione durante lo stesso allarme garantisce il fallimento del tentativo successivo — affidabilità **media** solo per questa soglia specifica.
- L'incidente **non è mai una perdita secca**: ogni struttura ha un esito compensativo alternativo (vedi sopra per Ghigliottina/Forca/Sedia).
- Reset: parlando ai gemelli, uscendo dalla Stanza dopo almeno un'operazione, o al verificarsi di un incidente stesso (che espelle il giocatore).

### Come modellarlo nell'app
Aggiungere uno stato di sessione "Allarme attivo" con contatore di operazioni per metodo (Ghigliottina/Forca/Sedia/Registro) da cui derivare un rischio di incidente crescente (curva non pubblicata: si può modellare come soglia — 1° uso sicuro, 2° uso consecutivo dello stesso metodo = rischio alto/quasi certo). Nella UI dell'ottimizzatore, quando l'Allarme è attivo, applicare la scala fissa 2×/3×/5×/7× alla Forca invece della Tabella B, e raddoppiare il bonus incenso. Il campo `oggettoAllarme` già nel dataset può essere presentato come "risultato garantito della Sedia durante l'Allarme, se non capita l'incidente".

---

## 3. Forca / Potenziamento (Gallows / Strengthening)

### Formula EXP
Non esiste una formula matematica "grezza" pubblicata da fonti di datamining. Il meccanismo documentato (wikiwiki.jp, con esempi numerici verificati da un agente di ricerca):

```
EXP ottenuta = EXP_base(livello_iniziale_sacrificio) × moltiplicatore_rango_confidente(× Igor) × bonus_arcana × bonus_tesoro
```

- **EXP base**: dipende dal **livello iniziale** (di creazione/registrazione) del Persona sacrificato, *non* dal livello attuale se elevato successivamente.
- **Penalità del 50%**: se il livello *attuale* del sacrificio supera il livello *attuale* del ricevente, l'EXP ottenuta viene dimezzata. Esempi citati (wikiwiki.jp): Pixie Lv2 + Arsène Lv1→28 EXP; stesso caso con Arsène portato a Lv3 attuale→14 EXP (dimezzata); Pixie Lv2 + Mandrake Lv3→130 EXP; con Pixie portato a Lv4 (pari al sacrificio)→260 EXP (raddoppio, penalità rimossa). Regola pratica: livellare il sacrificio prima di usarlo **non aiuta** e può dimezzare la resa.
- **Moltiplicatore per rango del Confidente** dell'Arcana del ricevente, **bonus arcana corrispondente** (×1.5) e **bonus Demone del Tesoro** (×3/×5): vedi Tabella B al § 1.
- **Durante il Fusion Alarm**: sostituiti dalla scala 2×/3×/5×/7× (§ 2).
- Difficoltà Merciless: EXP tagliata a **1/3** (fonte fandom.com, non riscontrata sul wiki JP — affidabilità **media**).

Affidabilità complessiva: **alta** per i moltiplicatori e gli esempi numerici (fonte primaria coerente al suo interno); **nessuna fonte** per una formula base "grezza" completa e pubblica.

### Skill trasferite
- P5 vanilla: **1 skill casuale** dal sacrificio al ricevente (non scelta dal giocatore, ma "manipolabile" ripetendo il sacrificio finché non esce quella desiderata; vincolata dal tipo di ereditarietà del ricevente).
- P5 Royal: **1-3 skill casuali** (il numero stesso è randomizzato) — solo **durante il Fusion Alarm**; fuori Allarme resta 1. Confermato da fandom.com/wiki/Skill_Inheritance in modo indipendente dalla pagina Fusion Alarm.

### Limiti
- Un Persona ricevente può essere potenziata **una volta al giorno di gioco** (limite per singolo Persona, non globale). Aggirabile registrando/eliminando/ri-evocando a pagamento la Persona per ripetere l'operazione più volte nello stesso giorno.
- Durante il Fusion Alarm il limite giornaliero salta (finché non avviene un incidente).
- Non risulta un costo Yen diretto per l'esecuzione della Forca in sé (solo per l'eventuale workaround di ri-evocazione dal Registro, che segue la formula standard § 5).
- Il vincolo "la Persona ricevente non può superare il livello del protagonista" è documentato **per la fusione in generale**, non specificamente per la Forca; si applica probabilmente anche qui salvo sblocco di **Special Treatment** (Forza rango 5, § 6).

Affidabilità: **alta** per il limite giornaliero e il workaround; **bassa/non confermata** per l'applicabilità esatta del vincolo di livello alla sola Forca.

### Come modellarlo nell'app
Aggiungere alla pipeline di ottimizzazione un modulo "Forca" separato dalla fusione a 2 ingredienti, con: EXP stimata = base(livello iniziale sacrificio) × moltiplicatore(rango, arcana-match, tesoro, allarme); flag "penalità 50%" quando livello attuale sacrificio > livello attuale ricevente; contatore giornaliero per Persona ricevente. Utile per suggerire sequenze "sacrifica Demone del Tesoro della stessa Arcana durante l'Allarme" come percorso EXP più efficiente individuato dalle fonti.

---

## 4. Isolamento / Addestramento (Lockdown) con incenso

### Sblocco e durata del training-resistenza
- Sbloccato al **rango 3** del Confidente Forza.
- Durata (in giorni di gioco, esclusi giorni con eventi di trama maggiori) — **due versioni divergenti**:
  - Fandom EN (fonte diretta, wikitext verificato): **5 giorni** se non è ancora sbloccato alcun rango pertinente, **2 giorni** al rango massimo del Confidente corrispondente all'Arcana della Persona in training. Solo questi due punti dati, nessuna tabella intermedia.
  - wikiwiki.jp (via agente di ricerca): tabella granulare — non sbloccato = 5 giorni; rango 1-3 = 4 giorni; rango 4-6 = 3 giorni; rango 7-9 = 2 giorni; rango MAX = 1 giorno.
  - **Divergenza aperta**: riportare entrambe; la versione JP è più granulare e plausibile ma non incrociata con una seconda fonte.
- Limite di sicurezza: Caroline & Justine avvisano via telefono quando il rischio di perdere la Persona è vicino — **fandom generico**: "circa 10 giorni"; **wikiwiki.jp**: avviso esplicito al **9° giorno**, con perdita permanente se non ritirata entro il giorno successivo (10°/11°). Riportare entrambe.
- Skill appresa: in P5R dipende dal **livello della Persona** al momento del deposito (non dai giorni trascorsi, e non modificabile ricaricando):

| Livello Persona | Skill appresa |
|---|---|
| 1–25 | Schiva X (Dodge) |
| 26–33 | Super Schiva X (Evade) |
| 34–52 | Resistenza X (Resist) |
| 53–62 | Nullifica X (Null) |
| 63–74 | Riflette X (Repel) |
| 75+ | Assorbe X (Drain) |

Copertura reale della debolezza solo da Lv34 in su; nessuna skill copre debolezze da Arma da fuoco (Gun). Confermato **indipendentemente** da fandom.com (fonte diretta) e wikiwiki.jp (via agente) — affidabilità **alta**.

- **Verifica della regola "resistenze da giorni di isolamento" (ipotesi della richiesta originale)**: **NON confermata** nella forma "più giorni in isolamento = resistenza più alta". La progressione debolezza→normale→resistente→nullo→assorbe→riflette dipende dal **livello della Persona**, fissato al momento del deposito, non dalla durata del soggiorno. La durata (rango Confidente) influenza solo *quanto tempo* serve per ottenere la skill, non *quale* skill si ottiene. Probabile fraintendimento/confusione con altri titoli della serie o con una semplificazione della vera meccanica.

### Incenso
Tabella tipi/prezzi (wikiwiki.jp, via agente; parzialmente confermata da fandom.com per la fascia Nirvana):

| Incenso | Prezzo | Effetto |
|---|---|---|
| Incenso base (FR/MA/RS/AG/FO, uno per statistica) | ¥4.000 | +1 alla statistica indicata |
| Musk (5 combinazioni: FR+MA, FR+AG, MA+RS, MA+FO, RS+AG) | ¥8.000 | +1 a due statistiche |
| Rasta Sandalwood (disponibile dal 1° ottobre) | ¥14.000 | +1 a FR, MA, AG |
| Ambergris (scambio 80 fiori di Mementos, non acquistabile a Yen) | — | **+2** alla statistica |
| Nirvana (scambio 80 fiori di Mementos, dal 30 ottobre) | — | **+3** alla statistica |

- L'incenso impiega **2 giorni** per avere effetto (non contando giorni con eventi di trama maggiori); va riacceso ogni 2 giorni per restare continuamente efficace; se la Persona viene ritirata il giorno dopo l'applicazione l'effetto va perso.
- Acquistabile da: Home Shopping Program, Jose's Shop, negozio di incensi Mantra Ganda a Kichijoji.
- **+1 punto casuale "gratuito" al giorno anche senza incenso**, solo dall'isolamento in sé: fonte singola wikiwiki.jp, **non confermata da fonte EN** — affidabilità **media**.
- Durante il **Fusion Alarm**, il bonus statistico dell'incenso è **raddoppiato** (vedi § 2). Esempio numerico dal wiki JP: 2 giorni con Rasta Sandalwood + Nirvana (totale +3 base) durante l'Allarme = +2 (bonus giornaliero base) + 6 (incenso ×2) = **+8 in 2 giorni**, scalando linearmente (+16 in 4 giorni, +24 in 6 giorni) — affidabilità **media** (fonte singola con calcolo interno coerente).

Affidabilità complessiva: **alta** per la tabella incenso/prezzi e la tabella livello→skill; **media** per il bonus giornaliero senza incenso e per il numero esatto dei giorni di allerta/perdita.

### Come modellarlo nell'app
Estendere il modulo isolamento esistente (già menzionato in `docs/riferimenti/manipolazione-statistiche.md`) con: tabella incensi (nome, prezzo, statistiche, delta), calcolo giorni-effetto (2gg/ciclo), flag "Allarme attivo → raddoppia", e una tabella separata "skill di resistenza per fascia di livello" da usare per pianificare quale Persona mandare in isolamento in base al livello attuale, non ai giorni di permanenza.

---

## 5. Prezzo di evocazione dal Registro del Prigioniero (compendio)

### Formula in uso nell'app
`27·L² + 126·L + 2147` (L = livello della Persona). Confermata **testualmente identica** nel codice sorgente del tool community `chinhodado/persona5_calculator` (`FusionCalculator.ts`, funzione `getApproxCost`), usato come una delle fonti dati del progetto (`data/seed/sorgenti/chinhodado`).

**Attenzione critica**: l'autore del tool dichiara esplicitamente nel proprio repository che *"the cost is estimated and is not accurate"* — non è una formula datamined esatta, ma un'approssimazione pensata solo per **ordinare** le ricette per costo relativo, non per riprodurre il prezzo esatto mostrato in gioco. Inoltre lo stesso tool usa la formula identica sia per la versione P5 vanilla (`index.html`) sia per Royal (`indexRoyal.html`) — **nessuna correzione specifica per Royal** è stata applicata dall'autore. Nessuna fonte di datamining pubblico (Reddit, GameFAQs, wikiwiki.jp) è stata trovata a conferma o smentita cifra-per-cifra.

Affidabilità: **media** (fonte di terze parti affidabile ma esplicitamente marcata come approssimata dal suo stesso autore).

### Sconti
- **Nessuna fonte trovata** che leghi uno sconto sul prezzo di evocazione al rango di un Confidente (né Matto/Igor né Forza/Gemelle Custodi). L'ipotesi della richiesta originale non risulta confermata.
- Sconto realmente documentato, legato alla **percentuale di completamento del Compendio** (confermato da due fonti indipendenti — wikiwiki.jp e un thread GameFAQs "Compendium discounts" senza smentite):

| % Compendio registrato | Sconto sul prezzo di evocazione |
|---|---|
| 25% | 10% |
| 50% | 15% |
| 75% | 25% |
| 100% | 50% |

- Le **Persona DLC** hanno il primo richiamo gratuito indipendentemente da livello o percentuale di completamento; dal secondo richiamo in poi si paga normalmente. I DLC non contano ai fini della percentuale di completamento complessiva.

Affidabilità: **alta** per lo sconto da % Compendio; **media-alta** per l'assenza di sconto legato ai Confidenti (assenza di prova su ricerca mirata, non prova assoluta di assenza).

### Come modellarlo nell'app
Mantenere la formula attuale come stima (etichettarla esplicitamente come "approssimata" nell'interfaccia, coerentemente con quanto dichiara la fonte). Aggiungere il moltiplicatore di sconto per % Compendio come funzione separata `scontoCompendio(percentualeRegistrata): number`, applicabile a `prezzoEvocazione()` in `alberoFusione.ts`/`motoreFusione.ts`. Non implementare sconti legati a Confidenti finché non emerge una fonte primaria.

---

## 6. Bonus del Confidente Forza (Gemelle Custodi / Caroline & Justine → Lavenza)

Tabella rango→sblocco per **Persona 5 Royal** (fandom.com/wiki/Confidant/Caroline_%26_Justine, wikitext diretto, confermata anche da dualshockers.com):

| Rango | Sblocco | Effetto |
|---|---|---|
| 1 | **Group Guillotine** | Fusione di gruppo: combinare **3 Persona** in una nuova |
| 2 | — | — |
| 3 | **Lockdown** | Sblocca l'isolamento/addestramento con resistenza elementale (§ 4) |
| 4 | — | — |
| 5 | **Special Treatment** | A pagamento, permette di fondere Persona di **livello superiore** a quello del protagonista |
| 6 | — | — |
| 7 | — | — |
| 8 | **Guillotine Booster** | Aumenta il numero di combinazioni possibili nella fusione di gruppo (Group Guillotine) |
| 9 | — | — |
| MAX (10) | **VIP Treatment** | Riduce il costo in Yen di Special Treatment |

Nessuna fonte riporta il costo esatto in Yen di Special Treatment né la percentuale di sconto di VIP Treatment.

**Differenze da P5 vanilla** (eccezione Royal, importante): l'ordine è diverso. In vanilla: rango 3 = Lockdown, rango 5 = Guillotine Booster, rango 8 = **Isolation** (sblocca skill di resistenza più forti da Lockdown — Null/Evade), rango MAX = Special Treatment (senza VIP Treatment separato). In Royal, "Isolation" del vanilla non compare come voce separata; Special Treatment arriva prima (rango 5) e VIP Treatment (lo sconto) diventa il nuovo bonus di rango MAX.

Al completamento del Confidente: si sblocca la fusione di **Zaou-Gongen**; Lavenza consegna la **Cell Key** il 19 marzo, che riporta tutti gli sblocchi della Stanza di Velluto già ottenuti in New Game+.

Affidabilità: **alta** (wikitext diretto + fonte secondaria concorde).

### Come modellarlo nell'app
Aggiungere una tabella `forza_rango_sblocco(rango, chiave_sblocco)` con i valori sopra, e flag booleani derivati (`fusioneGruppoSbloccata`, `lockdownSbloccato`, `fusioneSopraLivelloSbloccata`, `guillotineBoosterSbloccato`) da usare come precondizioni nell'ottimizzatore (es. non proporre piani con fusione di gruppo se il rango Forza è < 1, o Persona sopra livello se < 5).

---

## 7. Bonus di altri Confidenti sulla Stanza di Velluto

- **Regola generale confermata** (fandom.com/wiki/Confidant, sezione "Role", fonte diretta): l'EXP bonus di fusione (§ 1) si applica per **qualunque** Confidente allineato all'Arcana del risultato, non solo per Forza. Affidabilità **alta**.
- **Velocità del training in Lockdown** (§ 4): dipende dal rango del Confidente dell'**Arcana della Persona messa in isolamento**, non necessariamente Forza. Affidabilità **media** (fandom + allgamestaff.it, senza tabella numerica incrociata).
- **Confidente Fortuna (Chihaya Mifune), rango 8**: la lettura "Proibita — Fortuna Celeste" (a pagamento) fa scattare il Fusion Alarm immediatamente nel mondo reale e ne aumenta la probabilità nel Metaverso lo stesso giorno — un effetto indiretto ma concreto sulla Stanza di Velluto. Affidabilità **alta** (wikiwiki.jp).
- **Confidente Carro (Ryuji Sakamoto), rango 7**: l'abilità Instakill contribuisce (come le vittorie in battaglia normali) a incrementare la probabilità cumulata di Fusion Alarm. Affidabilità **alta**.
- **Confidente Folle**: una fonte fandom (tabella benefici per Arcano, non incrociata) elenca tra i benefici del Folle "Bonus EXP for fusion" e "Increases Persona stock capacity". **Incertezza terminologica**: nel gioco il Folle è il protagonista stesso (non un Confidente classico con schermata propria); non è chiaro se la fonte si riferisca a un meccanismo reale o sia un artefatto di trascrizione della tabella. La tabella JP della Forca (§ 1, Tabella B) cita separatamente un moltiplicatore legato al "rango di Igor", la cui esatta natura non è verificata (potrebbe riferirsi a un indicatore di progressione complessiva del "Wild Card", non a un vero rango consultabile). **Affidabilità bassa** su questo punto specifico: segnalato come area da chiarire con ulteriore ricerca mirata, non da modellare nell'app allo stato attuale.
- Nessun'altra fonte, tra quelle consultate, attribuisce funzioni strutturali dirette nella Stanza di Velluto a Confidenti diversi da Forza, Fortuna e Carro. Assenza di prova, non prova di assenza: non sono state verificate singolarmente tutte le pagine dei ~22 Confidenti.

### Come modellarlo nell'app
Trattare l'EXP bonus di fusione come funzione di *qualsiasi* Confidente allineato all'Arcana risultante (non solo Forza), pescando dal rango già tracciato in `confidente_partita`. Aggiungere una nota informativa (non un moltiplicatore numerico, mancano i dati) sull'effetto Fortuna/Carro sul Fusion Alarm, utile solo come suggerimento testuale ("rango Fortuna alto → puoi forzare l'Allarme a pagamento").

---

## 8. Cicli di fusione con Demoni del Tesoro

### Meccanismo
Fondere un Demone del Tesoro con una Persona normale produce una Persona della **stessa Arcana della Persona partner**, spostata di **±1 o ±2 posizioni** nella lista ordinata per livello di quell'Arcana — **non sempre ±1 fisso**: l'offset dipende dalla combinazione specifica Demone del Tesoro × Arcana, secondo una tabella di modificatori. Il calcolo si basa (secondo una fonte, non incrociata) sul **livello attuale** della Persona partner, non sul livello base — a differenza della fusione normale a 2 ingredienti che di norma usa il livello base; questa differenza **non è confermata da una seconda fonte** ed è quindi da trattare con cautela.

**L'app implementa già questo meccanismo**: `shared/types.ts` (`tesori: { nomi, modificatori }`), `server/services/fusione/motoreFusione.ts` (mappa `arcana → modificatori[]` per ciascun tesoro, usata nel calcolo della fusione rara) e la migrazione/seed corrispondenti. La tabella di modificatori per Arcano recuperata dal wiki fandom durante questa ricerca **non deve sostituire** i dati già presenti nel dataset dell'app (che derivano da fonti dati strutturate come aqiu384/chinhodado), ma può servire da **verifica incrociata** — con l'avvertenza che la trascrizione manuale dalla tabella wiki grezza (23 colonne) non è stata validata riga per riga in questa ricerca.

Affidabilità: **alta** per il meccanismo generale (fandom + guide di terze parti concordi); **media** per il dettaglio "livello attuale vs livello base" del calcolo.

### Lista Demoni del Tesoro in Persona 5 Royal (9 totali)

| Nome | Livello | Arcana | Location (Palazzo / Mementos) |
|---|---|---|---|
| Regent | 10 | Imperatore | Palazzo di Madarame; Mementos — Qimranut, Aiyatsbus, Chemdah, (Royal: anche Da'at) |
| Queen's Necklace | 15 | Imperatrice | Palazzo di Kaneshiro; Mementos — Kaitul |
| Stone of Scone | 20 | Fortuna | Palazzo di Futaba; Mementos — Akzeriyyuth |
| Koh-i-Noor | 25 | Sacerdotessa | Palazzo di Okumura; Mementos — Adyeshach |
| Orlov | 30 | Forza | Palazzo di Niijima; Mementos — Sheriruth |
| Emperor's Amulet | 35 | Appeso | Palazzo di Shido; Mementos — Sheriruth (dopo Shido) |
| Hope Diamond | 40 | Morte | Palazzo di Shido (Royal, molto raro); Depths of Mementos/Da'at (Royal) |
| Crystal Skull | 50 | Matto | Palazzo di Shido (Royal, raro); Qliphoth World/Da'at (Royal) |
| Orichalcum (unico nuovo in Royal) | 60 | Fede | Palazzo di Maruki |

**Councillor è l'unico Arcano di Persona 5 Royal senza un Demone del Tesoro associato.**

### Disponibilità e prezzo
- I Demoni del Tesoro **non si possono ottenere tramite fusione**: solo tramite negoziazione/cattura in Palazzi e Mementos (in Royal la battaglia parte automaticamente e si uniscono da soli, senza poter chiedere oggetti). Non usabili in battaglia né potenziabili via Forca.
- Una volta catturati, si registrano nel Compendio come qualsiasi altra Persona — presumibilmente rievocabili a pagamento con la formula standard (§ 5), ma **nessuna fonte conferma un prezzo dedicato o diverso** per loro.

### Uso pratico
Permette di ottenere una Persona di un rango specifico in un'Arcana **senza dover possedere/fondere in cascata** tutti gli ingredienti intermedi fino a quel rango — un vantaggio di "scorciatoia" nella catena di fusione. **Nessuna fonte quantifica un risparmio preciso in Yen o EXP** rispetto alla catena normale; il vantaggio documentato è di praticità/tempo, non economico dimostrato con numeri.

### Come modellarlo nell'app
Il motore di pianificazione (`alberoFusione.ts`) già considera le fusioni con Demoni del Tesoro come un nodo `'fusione'` di tipo `'tesoro'`. Da aggiungere: una nota nell'ottimizzatore che segnali quando un piano con Demone del Tesoro è significativamente più corto (in numero di fusioni) di un piano equivalente a catena, così da tradurre concretamente il "risparmio" (non quantificabile in Yen dalle fonti, ma quantificabile in **numero di operazioni risparmiate**, dato che il motore già calcola).

---

## 9. Manipolazione delle statistiche — integrazione numerica

Integra `docs/riferimenti/manipolazione-statistiche.md` (guida pixelflood.it) con verifica incrociata:

| Dato | Valore | Fonte pixelflood | Conferma incrociata | Affidabilità |
|---|---|---|---|---|
| Cap per statistica | 99 | sì | GameFAQs esplicito per P5R ("each stat maxes at 99") | **alta** |
| Cap senza equip speciale | 90 | sì | nessuna fonte EN trovata | **media** (solo pixelflood) |
| Punti totali massimi a Lv99 | 304 | sì | nessuna fonte EN trovata | **media** (solo pixelflood) |
| Reroll uscendo/rientrando dalla schermata risultati | sì, prima di confermare | sì | TheGamer.com conferma indipendentemente ("select the same sacrificial Persona and see a different set of stats increased") | **alta** |
| Punti per level-up | +3 totali, distribuzione casuale | implicito nella guida | wikiwiki.jp (2 agenti indipendenti) conferma "+3 punti totali per livello"; GameFAQs conferma la formula cumulativa L×3+7 | **media-alta** |
| Utilizzabile una sola volta per fusione | sì | sì | non contraddetta da altre fonti | **media** (non riverificata) |

**Nota di cautela**: una fonte (GameFAQs/ScreenRant, via agente) riporta "10 punti stat" per un'esecuzione Forca "dorata" (Persona carica) durante il Fusion Alarm — ma questo è il bonus-incidente della Forca (§ 3, coerente col valore "+10" già riportato lì), **non** il tasso per singolo livello: nessuna contraddizione reale col "+3/livello", solo dati di granularità diversa che vanno tenuti distinti nell'app.

### Come modellarlo nell'app
Nessuna modifica strutturale necessaria: la guida esistente resta valida. Aggiungere solo un campo `fonteAffidabilita` nei dati derivati (per distinguere i numeri "solo pixelflood" da quelli incrociati) se l'app espone questi dettagli all'utente finale, così da segnalare dove il dato è meno certo.
