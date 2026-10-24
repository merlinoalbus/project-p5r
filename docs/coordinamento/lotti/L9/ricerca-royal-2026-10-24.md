# L9 — Ricerca Royal: moltiplicatori dei punti e Doti delle 7 attività

Analisi dati, 2026-10-24, sola lettura (ricerca sul web e confronto con DB e codice). Richiesta del PM: (2) il ×1,2 dell'invito e il bonus degli esami, (3) le Doti delle 7 attività senza effetti. Regola del progetto: vince il dato Royal documentato. Nessun file di codice o dati toccato; nessun commit.

## 1. Esito in breve

| Domanda | Risposta | Certezza |
|---|---|---|
| Il ×1,2 dell'invito esiste in Royal? | **Sì.** Vale quando la sera prima si risponde **subito «sì»** a un invito arrivato via **SNS** (la chat del gioco, non un'email) per l'uscita del giorno dopo. Se si risponde il giorno dopo non vale | **Alta** (una fonte specifica di Royal che lo dice con le parole e con un esempio numerico; la guida Steam che lo citerebbe non si è aperta) |
| Per chi vale? | Per i punti guadagnati in quell'uscita, **anche per i Confidenti ospiti** diversi da chi ha invitato (come descritto dalla fonte) | Media |
| Bonus degli esami | **×1,5** al primo posto in classifica, **×1,2** nei primi 10, **nessun bonus** da «media o poco più» in giù. Vale per **sette** Confidenti: Ryuji, Ann, Makoto, Haru, Sojiro, Kawakami, Kasumi. **Futaba non c'è.** Dura **fino all'inizio dell'esame successivo** (al 3° trimestre vale il risultato del 2°) | **Alta** (due pagine della stessa wiki di Royal con lo stesso elenco; Twinfinite concorda sul valore e sulla durata) |
| Persona dello stesso Arcano | **×1,5**, basta averla nell'**elenco (Stock)**, non equipaggiata, qualunque livello; più Persona dello stesso Arcano non si sommano | **Alta** (wiki di Royal; Gamerant e il calcolatore concordano sul non equipaggiare) |
| Come si combinano | **Si moltiplicano**: arcano × esame × invito | **Alta** |
| Le 7 attività | **Solo una** dà una Dote propria, **il curry (Coraggio ♪1)**; la pesca dà Perizia ♪1 ma è già gestita dalla regola della pesca; le altre cinque danno **solo effetti non sociali** (HP/SP massimi, statistiche dei compagni, punti Confidente, tempo) | **Alta** (§4) |

## 2. Moltiplicatori

### 2.1 Fonte principale

Wiki giapponese di Persona 5 Royal (`wikiwiki.jp/persona5r`), che distingue Royal dall'originale; pagine lette il 2026-10-24 con l'ultima modifica indicata:

- **«好感度について»** (`https://wikiwiki.jp/persona5r/好感度`, modificata 2024-04-17): contiene tutti i moltiplicatori, con esempi numerici e la regola «si cumulano».
- **«定期試験»** (`https://wikiwiki.jp/persona5r/定期試験`, modificata 2026-10-13): risultati degli esami, moltiplicatori, elenco dei Confidenti, date.
- **«ジャズクラブ»** (modificata 2026-07-22): conferma che nel Jazz Jin il bonus d'esame vale per Ryuji, Ann, Makoto, Haru e Kasumi come ospiti.

Citazioni brevi (giapponese, con la mia traduzione): «上昇率1.5倍» (primo di anno, «tasso di salita ×1,5»); «上昇率1.2倍» (entro il decimo posto); «上昇効果無し» (media o inferiore: nessun effetto); «次の定期試験が始まるまで有効です» (vale fino all'inizio del prossimo esame); «それに即承諾の返答をした場合は» (se a ciò si risponde subito con un sì); «好感度上昇値の1.2倍効果は得られません» (se si risponde dopo non si ottiene l'×1,2); «ストック内に入れておくだけで効果が発生する» (basta tenerla nello Stock).

### 2.2 Cosa dice la fonte, punto per punto

1. **Invito.** «前日夜のSNS»: l'invito arriva la **sera prima via SNS**; rispondere **subito** con un sì dà **×1,2** all'uscita festiva del giorno dopo. Il termine «メール» (email) non compare nella pagina: nell'app e nei documenti si parla di «SMS», ma il gioco usa l'SNS.
2. **Esami.** Primi 10: ×1,2; primo posto: ×1,5; «media o poco più»: nessun moltiplicatore (restano solo le note di Fascino). Elenco esatto: Ryuji Sakamoto, Ann Takamaki, Makoto Niijima, Haru Okumura, Sojiro Sakura, Sadayo Kawakami, Kasumi Yoshizawa. **Futaba Sakura non compare.** La pagina ha anche una nota che parla di «studenti dello Shujin, Kawakami e Sojiro»: non si concilia da sola con Kasumi, ma l'elenco nominativo la include, e il Jazz Jin la cita fra gli ospiti con il bonus.
3. **Arcano.** ×1,5 con una Persona dello stesso Arcano nello Stock; non dipende dal livello; non si somma fra più Persona.
4. **Esempi della pagina:** ♪(5)×1,2×1,5 = ♪♪(9); ♪(5)×1,5×1,5 = ♪♪♪(11,25); invito accettato con tutti i bonus ♪(5)×1,2×1,5×1,2 = ♪♪♪(10,8). Il valore interno di una nota ♪ è 5; la visualizzazione a note non coincide con il valore interno.
5. Gli stessi moltiplicatori valgono anche per 相性占い (oroscopo d'affinità), 縁結び祈願 (preghiera al tempio) e per dormire nel letto con il Confidente (azioni che danno punti).

### 2.3 Riscontri incrociati

| Fonte | Che cosa conferma | Limite |
|---|---|---|
| AllGameStaff, «Ricompense degli esami» (già in G-016c) | Moltiplicatore sui punti dei Confidenti; **sei** nomi: Ryuji, Makoto, Haru, Sojiro, Kawakami, Kasumi; durata fino ai risultati successivi | Omette Ann e non dà i valori |
| Twinfinite (risultato di una ricerca, la pagina non si è aperta) | ×1,5 primo, ×1,2 primi 10, fino all'esame successivo; si somma al bonus dell'Arcano | Cita «gli studenti dello Shujin e Sojiro» senza elenco completo; letto solo come sintesi |
| Fandom Megami Tensei (ricerca) | Stessi valori; per Sojiro conferma che il bonus d'esame si applica | Pagina non apribile (HTTP 402); sintesi di ricerca |
| Walkthrough di aqiu384 (dati estratti dal gioco) | «School-related Confidant Bonus ×1,2 unlocked» al 19/7 e «×1,5 unlocked» al 24/10, nella riga dei risultati degli esami | Non elenca i Confidenti né spiega l'effetto; nessun moltiplicatore per invito o messaggi |
| G-020 (Esperto, già nel registro) | Dai numeri del walkthrough: Ann +26/+18 dopo il 19/7 contro +15/+10 prima: coerente con ×1,2 e con l'inclusione di Ann | Deduzione dell'Esperto, non riletta in questo giro |
| Guida Steam «Complete Confidants Guide» (id 2877810456) | Una sintesi di ricerca le attribuisce ×1,2 per l'invito accettato subito, ×1,5/×1,2 per gli esami, ×1,5 per l'Arcano | **Non riletta**: la pagina ha risposto HTTP 429 in due tentativi; la sintesi non è una lettura |

Altri siti consultati senza trovare moltiplicatori (Gamerant, Push Square, calcolatore delle fusioni): confermano solo il bonus dell'Arcano e che la Persona non va equipaggiata. GameFAQs e PSNProfiles danno HTTP 403.

### 2.4 Arrotondamento (da sapere, certezza media)

La pagina mostra 11,25 come valore del doppio ×1,5, ma i numeri che conosciamo dal gioco (G-020) sono interi: Ann dopo il 19/7 prende +26 invece di +27, che si spiega con il **troncamento a ogni passaggio** (15 → ×1,5 = 22 → ×1,2 = 26,4 → 26). Quindi la regola più coerente è: **base intera, ogni moltiplicatore applicato in sequenza e troncato all'intero**. La fonte non lo scrive esplicitamente: è una deduzione.

### 2.5 Confronto con l'app di oggi

| Punto | App oggi | Royal |
|---|---|---|
| Esame | `server/services/partiteService.ts:264` e `src/utils/punti.ts:19` applicano ×1,5/×1,2 a **tutti** i Confidenti | Solo ai **7** nominati |
| Invito | stesso punto: ×1,2 se `invito` (flag) | Esiste ed è corretto: va **tenuto** (L9 `modifiche.md` lo voleva togliere in attesa di conferma: ora c'è) |
| Arcano | ×1,5 con `bonusArcano` | Corretto; il calcolo del flag deve guardare lo **Stock** (elenco delle Persona possedute), non l'equipaggiamento |
| Arrotondamento | `round2` a due decimali (`partiteService.ts:255`): 7,5 resta 7,5 | Probabilmente intero (troncato a ogni passaggio): da decidere |
| Condizioni dell'invito | il flag è libero | Solo per risposta immediata all'invito SNS della sera prima, per l'uscita festiva del giorno dopo |

## 3. Cosa cambia per L9 (blocchi A e D)

- `shared/puntiConfidenti.ts` (blocco A): base × Arcano (Stock) × esame (solo i 7: Ryuji, Ann, Makoto, Haru, Sojiro, Kawakami, Kasumi) × invito (×1,2 se accettato subito): moltiplicazione in sequenza; esame con `primo`/`primi-10`/`altro`.
- La regola dell'arrotondamento va decisa dal PM prima di scrivere il modulo (§6).
- `utente.esame_piazzamento_partita` resta com'è nel piano; il piazzamento serve per scegliere ×1,5, ×1,2 o nessun bonus. Gli effetti d'esame sulle doti: primi 10 e primo posto danno **Fascino ♪3**, «media o poco più» ♪2 (stessa pagina della wiki; già in G-016c per i primi 10).

## 4. Le Doti delle 7 attività senza effetti

Misura sul DB (copia a 146): le 7 attività hanno `effetti_json='[]'` e `doti_json='[]'` (`allenamento-camera-leblanc`, `allenamento-palestra-protein-lovers`, `curry-leblanc`, `jazz-club-kichijoji`, `lettura-metropolitana`, `sfida-pesca-guardiano-ichigaya`, `tempio-vecchio-kichijoji`). La Dote nel gioco è una statistica sociale (Conoscenza, Gentilezza, Perizia, Coraggio, Fascino); in app l'unità `note` è la nota ♪, che vale 2 punti (la fonte dice che le note non coincidono con i punti reali).

| Attività | Dote | Altri effetti (non sociali) | Fonti | Certezza |
|---|---|---|---|---|
| **Allenamento in camera** (mansarda, dal 18/4) | **Nessuna** | HP massimi permanenti: visite 1–4 +5, 5–8 +6, 9–12 +7, 13–15 +8, dalla 16ª +8 | AllGameStaff `allenamento-casa-e-palestra` e wiki 「トレーニング」 (5/6/7/8, concordi) | Alta |
| **Allenamento in palestra** (Protein Lovers) | **Nessuna** | HP e SP massimi per fase: 3/2, 5/3, 7/5, 9/7, 9/7 (dalla 16ª); proteine +2/+1, +3/+2, +5/+3 in palestra; sblocco: Ryuji rango 5 o Ann rango 8 (la wiki: Carro 4→5 o Amore 7→8) | stesse due fonti, concordi anche su prezzi e sblocco | Alta |
| **Jazz Club** (Jazz Jin) | **Nessuna** | Per ogni uso, il compagno invitato prende **♪1 di punti Confidente** (base) con i moltiplicatori; cocktail del giorno che cambiano livello, HP/SP o statistiche dei Persona dei compagni (raddoppiati nelle serate con cantante); domenica nuova abilità | AllGameStaff `jazz-club`, wiki 「ジャズクラブ」 (22/7/2026), TheGamer, Samurai Gamers | Alta |
| **Tempio Vecchio** (meditazione, dal 6/6) | **Nessuna** | SP massimo permanente: visite 1–3 +3, 4–6 +5, 7–9 +8, dalla 10ª +12 | wiki 「寺」 (28/9/2026) e Samurai Gamers, concordi; TheGamer parla di +5 fisso (fonte più vecchia) | Alta |
| **Lettura in metropolitana** | **Nessuna propria**: la Dote arriva dal **libro** quando lo si finisce (Conoscenza, Perizia, Coraggio… secondo il libro) | Se si è seduti, leggere in metropolitana non consuma tempo di gioco | AllGameStaff `libri` («solo una volta terminato, riceveremo il bonus») | Alta (la Dote sta negli effetti dei libri, L7) |
| **Curry al Leblanc** (dal rango 4 di Sojiro) | **Coraggio ♪1** a ogni curry cucinato (≈2 punti) | Il curry ripristina SP; disponibile quando ci sono gli avanzi: **lun, mer, ven, dom** | Wiki 「喫茶店修行」 («作成するごとに、度胸＋♪1») e tabella 「人間パラメータ」; Samurai Gamers («one point for another social stat, Guts»); sblocco rango 4 confermato dalla wiki | Alta (due fonti indipendenti) |
| **Sfida Guardiano e Boss di Ichigaya** (pesca) | **Perizia ♪1** per la visita con **almeno un pesce** (non per il Guardiano o il Boss in sé) | Punti pesca spendibili nel negozio (Guardiano e Boss 4.500–5.500) | AllGameStaff `pesca-laghetto-ichigaya` e wiki 「釣り」 («一匹でも釣り上げれば器用さ♪1»), concordi | Alta (nota sotto) |

**Nota sulla pesca.** La Perizia della pesca è già gestita dal sistema della pesca di L6/L7: `server/services/pescaLetture.ts:92-96` calcola la «Perizia finale osservata, distinta dalla cattura» dalla regola `ichigaya-royal-v1`, e l'attività `pesca-ichigaya` è il ruolo «visita». L'attività `sfida-pesca-guardiano-ichigaya` ha ruolo «obiettivi». Dare a questa sfida un effetto di Perizia duplicherebbe i punti: **va lasciata senza effetto proprio**, e la voce R9-11 per la pesca è già soddisfatta altrove.

**Per R9-11 in pratica**: dei 7 casi, **uno** va scritto come effetto (`curry-leblanc`: `{effetto: {famiglia: 'dote', dote: 'coraggio', note: 1}}`, il gioco la dà a ogni curry cucinato: nel modello degli effetti una voce senza `ripetuto` vale solo la prima volta e una con `ripetuto` dalla seconda in poi, `shared/effettiCatalogo.ts:16-23,52-55`, quindi servono due voci uguali, una per la prima volta e una `ripetuto`), **uno** è già nel sistema della pesca, **uno** ha la Dote nei libri, **quattro** non danno nessuna Dote e le loro conseguenze (HP/SP massimi, punti Confidente, tempo) non sono Doti: restano descritte come «altri effetti» senza effetto strutturato, oppure con una nuova famiglia di effetti se L10 la prevede (D6). Non serve la scheda dell'Esperto: i valori sono nelle fonti sopra.

**Correzioni a dati dell'app emerse dal confronto** (fuori dall'incarico, da valutare):
1. `tempio-vecchio-kichijoji.altri_effetti` dice «3 SP le prime volte, +3 extra ogni 3 meditazioni, fino a un massimo di 12»: le fonti danno 3, 5, 8 e 12 per le fasce di visite 1–3, 4–6, 7–9, dalla 10ª.
2. `curry-leblanc.altri_effetti` è «dettaglio non verificato»: ora ha una fonte (Samurai Gamers, wiki) e il ripristino di SP.
3. `caffe-leblanc` (non fra le 7): Fascino ♪1 per caffè, dal rango 2 di Sojiro (stessa pagina della wiki).

## 5. Certezze e limiti

- Le letture sono state fatte da pagine web, in parte con uno strumento che le riassume: le citazioni giapponesi sono le frasi lette alla lettera dalla pagina; le traduzioni e le sintesi sono mie. Per il ×1,2 dell'invito ho **una sola fonte specifica e leggibile** (la wiki giapponese di Royal, 「好感度について」); è precisa e con esempi numerici ma non ha un riscontro indipendente in inglese né in italiano. AllGameStaff non lo cita; il riferimento del repository (`docs/riferimenti/confidenti-punti.md`) lo riportava senza fonte.
- Non ho potuto aprire: guida Steam (HTTP 429), Fandom (HTTP 402), GameFAQs, PSNProfiles, Twinfinite (HTTP 403). Le informazioni che vengono da lì sono dichiarate come sintesi di ricerca e non pesano sulla certezza.
- Il walkthrough di aqiu384 non serve a distinguere i Confidenti: dice soltanto quando i moltiplicatori scattano.
- L'arrotondamento a ogni passaggio è una deduzione dai numeri di G-020.
- Le attività che l'app chiama «Lettura in metropolitana» e «Sfida pesca» hanno già effetti gestiti altrove (libri, pesca): va controllato il modello prima di scrivere effetti nuovi.

## 6. Decisioni che restano al PM

1. **Arrotondamento** dei punti: intero con troncamento a ogni moltiplicazione (coerente con i numeri del gioco) oppure decimali come oggi.
2. **Condizione del ×1,2 dell'invito**: tenere il flag libero com'è, oppure agganciarlo all'invito SNS della sera prima (richiede un dato nuovo nella partita: «risposto subito»).
3. **Effetti non sociali** (HP/SP massimi, punti Confidente del Jazz Jin, cocktail): restano testo, oppure L10 introduce una famiglia di effetti.
4. **Pesca**: confermare che la sfida resta senza effetto proprio.

## 7. Fonti

- Wiki giapponese di Persona 5 Royal: [好感度について](https://wikiwiki.jp/persona5r/%E5%A5%BD%E6%84%9F%E5%BA%A6), [定期試験](https://wikiwiki.jp/persona5r/%E5%AE%9A%E6%9C%9F%E8%A9%A6%E9%A8%93), [人間パラメータ](https://wikiwiki.jp/persona5r/%E4%BA%BA%E9%96%93%E3%83%91%E3%83%A9%E3%83%A1%E3%83%BC%E3%82%BF), [喫茶店修行](https://wikiwiki.jp/persona5r/%E5%96%AB%E8%8C%B6%E5%BA%97%E4%BF%AE%E8%A1%8C), [釣り](https://wikiwiki.jp/persona5r/%E9%87%A3%E3%82%8A), [ジャズクラブ](https://wikiwiki.jp/persona5r/%E3%82%B8%E3%83%A3%E3%82%BA%E3%82%AF%E3%83%A9%E3%83%96), [寺](https://wikiwiki.jp/persona5r/%E5%AF%BA), [トレーニング](https://wikiwiki.jp/persona5r/%E3%83%88%E3%83%AC%E3%83%BC%E3%83%8B%E3%83%B3%E3%82%B0).
- AllGameStaff: [Jazz Club](https://www.allgamestaff.it/persona-5-royal/jazz-club/), [Allenamento casa e palestra](https://www.allgamestaff.it/persona-5-royal/allenamento-casa-e-palestra/), [Pesca laghetto Ichigaya](https://www.allgamestaff.it/persona-5-royal/pesca-laghetto-ichigaya/), [Libri](https://www.allgamestaff.it/persona-5-royal/libri/).
- Samurai Gamers: [Leblanc, caffè e curry](https://samurai-gamers.com/persona-5/leblanc-coffee-brewing-and-curry-guide/), [Old Temple](https://samurai-gamers.com/persona-5/old-temple-guide/), [Jazz Jin](https://samurai-gamers.com/persona-5/jazz-jin-bar-guide/), [Pesca](https://samurai-gamers.com/persona-5/mini-game-fishing/).
- TheGamer: [Jazz Club](https://www.thegamer.com/persona-5-royal-jazz-club-guide/), [Kichijoji](https://www.thegamer.com/persona-5-royal-kichijoji-introduction/).
- aqiu384: [walkthrough dei Confidenti](https://aqiu384.github.io/megaten-database/p5r/ace-walkthrough.html).
- Gamerant: [consigli sui Confidenti](https://gamerant.com/persona-5-royal-tips-confidants/); Push Square: [guida ai Confidenti](https://www.pushsquare.com/guides/persona-5-royal-confidants-guide-where-to-find-all-confidants-and-how-to-rank-up-fast); [calcolatore delle fusioni](https://persona5royalfusioncalculator.blog/confidant-guide/).
- Nel repository: `docs/coordinamento/guida/registro.md` (G-016c, G-020), `docs/riferimenti/confidenti-punti.md`.
