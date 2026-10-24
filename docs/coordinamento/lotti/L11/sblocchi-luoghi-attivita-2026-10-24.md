# R11-02/9 — `luogo.sblocco` e `attivita.sblocco`: frase per frase (2026-10-24)

Richiesta del PM. Sola lettura, nessun commit. Dati: copia di p5s migrata fino alla 210 (luoghi 109, di cui **39** con una frase di sblocco; attività 30, di cui **18** con una frase). Fonti Royal: ACE (dati estratti dal gioco; in questo giro letto in modo verbatim solo fino all'8/5, il resto è riassunto di un modello) e Samurai Gamers (SG). La regola «prevale Royal» vale: dove ACE e SG discordano lo scrivo.

## 1. In breve

- **Luoghi (39):** **28 ripetono** una condizione già strutturata (sul luogo, sull'attività, sugli articoli, sul Confidente o sul quartiere); **4 non sono condizioni del luogo** ma racconto del Confidente, già nella sua disponibilità; **7 hanno un'informazione che la struttura non ha** (elenco §2.3).
- **Le 12 senza condizione strutturata:** 4 ripetono altro (quartiere, attività, articoli), 4 sono del Confidente, **4 mancano davvero** (Sala giochi di Akihabara, Piazza della Stazione, Ore no Beko, Crossroads).
- **Attività (18):** **14 ripetono**; **4 hanno un'informazione in più o diversa dal Royal** (§3).
- **Tre frasi hanno una data diversa dal Royal** e dalla struttura (che è già giusta): Ichigaya 6/7 (invito il **3/7**), Meiji 5/8 (invito il **6/8**), Planetario 30/7 (invito il **4/8**, deciso dall'utente). Qui la frase è sbagliata: la struttura no.
- **Una domanda aperta all'utente** (§5): Harajuku, «invito di Mishima 3/8» (SG) contro «invito di Ryuji 29/5» (ACE).

Come si leggono i verdetti: **R** = la condizione c'è già e dice la stessa cosa; **N** = non è una condizione del luogo; **X** = manca una condizione strutturabile.

## 2. I 39 luoghi

### 2.1 R — ripetono (28)

| Luogo | Frase | Dove sta già la condizione |
|---|---|---|
| asakusa/asakusa-hangout | Confidente Ann Rango 7 | `condizioni_json`: confidente ann 7 |
| asakusa/tokyo-skytree | lettura «Shitamachi rinato» | lettura `shitamachi-rinato` |
| harajuku/takenoko-street | lettura «Vague» | lettura `vague` (libro dal 18/5; SG: «Vague», 5/18) |
| inokashira-park/inokashira-hangout | Confidente Ann Rango 3 | ann 3 |
| kichijoji/mantra-ganda | Rango 3 delle Gemelle | gemelle 3 |
| ogikubo/ogikubo-ramen | Ryuji Rango 4 | ryuji 4 |
| tsukishima/tsukishima-monjayaki | Ryuji Rango 7 | ryuji 7 |
| ueno/museo-ueno | Yusuke Rango 3 | yusuke 3 |
| shibuya/protein-lovers | Ryuji 5 oppure Ann 8 | gruppo «almeno una» ryuji 5 / ann 8 |
| shinagawa/shinagawa-acquario | libro o invito Akechi 28-29/7 | lettura + invito `akechi/07-29` (ACE: 7/29; messaggio la sera del 28) |
| nakano/nakano-broadway | libro o invito Futaba 9/10 | lettura + invito `futaba/10-09` (ACE ✓) |
| maihama/destinyland | 11 ottobre o libro | gruppo: lettura `parchi-divertimento` o data 10-11 |
| kichijoji/jazz-jin | Akechi Rango 4 (dal 26/6) | akechi 4; la data 06-26 sta nell'attività Jazz Club |
| odaiba/odaiba-seaside-park | 1 giugno / Ann Rango 10 | gruppo: libro `luoghi-della-movida` (dal 06-01; SG: «Nightlife Hotspots» 6/1) o ann 10 |
| mementos/negozio-jose | appare casualmente nei Memento | richiesta `un-ex-piuttosto-appiccicoso`; «casualmente» è comportamento, non condizione. **Non verificato con il Royal in questo giro** |
| kanda-jinbocho/chiesa-kanda | dal 28/6; Fascino 3 per il primo incontro (consigliato 2/7) | data 06-28. La dote e il «consigliato» sono di Hifumi (`confidente_disponibilita`: Fascino ≥ 3 e Yusuke rango 2) |
| ichigaya/laghetto-ichigaya | 6 luglio (invito di Ryuji) o libro | lettura + invito `ryuji/07-03`. **Data della frase errata**: ACE e SG danno il **3/7** |
| meiji-shrine/meiji-shrine-hangout | libro o invito Ann 5/8 | lettura + invito `ann/08-06`. **Data della frase errata**: ACE **6/8**; SG non ha l'invito di Ann (lo sblocco è il libro «Tokyo Shrines», 9/1) |
| ikebukuro/planetario-ikebukuro | libro (titolo incerto) o invito Makoto 30/7 | lettura `cieli-notturni` + invito `makoto/07-30` (data ora 08-04). **Frase superata**: il 30/7 non vale più. SG conferma il libro: «Museum of Stars», 1.800 ¥, 9/1, libreria di Shibuya |
| yokohama-chinatown/chinatown-hangout | libro dedicato (titolo non reperito) | lettura `dolci-cinesi`. La frase dice «titolo non reperito» ma la struttura lo lega a un libro con la condizione richiesta «Un part-time infernale»: **da confermare con una fonte** |
| shibuya/untouchable | Iwai 15/8 (Coraggio 4, Appeso); negozio prima, dal Palazzo di Kamoshida | data 04-17 per il negozio; la parte «Iwai» è del Confidente (`confidente_disponibilita`: 15/8, Coraggio 4) |
| shinjuku/hinokuniya | alcuni titoli richiedono attività sbloccate | condizioni sui singoli articoli (attività, contatori, eventi): 9 articoli su 9, tutti con condizione |
| shibuya/triple-seven | nessun requisito | `[]` è giusto: SG «Requirement: None». SG aggiunge «sbloccato il 18/4» |
| shibuya/scarlet | disponibile una volta raggiunta Shibuya | il quartiere `shibuya` è già condizione di presenza di ogni luogo |
| shibuya/rafflesia | lavoro part-time: Fascino Rango 2 | attività `lavoro-rafflesia`: dote fascino 2. SG: «Rank 2 Charm», 4/18 |
| suidobashi/dome-town | 10 giugno | data 06-09 (fonte G-029): la struttura anticipa di un giorno la frase, scelta già in registro |
| yongen-jaya/clinica-takemi | 18 aprile (visita, farmaci speciali, test clinico) | data 04-16: scelta dell'utente («il negozio di farmaci dal 16 aprile; Tae come Confidente dal 18», migrazione 118); il 18 è del Confidente |
| yongen-jaya/venditore-patate-dolci | dal 9 ottobre | data 10-09 |

**Conteggio:** 28 R = 24 luoghi con condizione strutturata + 4 senza condizione che ripetono altro (Scarlet, Triple Seven, Rafflesia, Hinokuniya). Gli altri 11 luoghi sono i 4 N (§2.2) e i 7 X (§2.3).

### 2.2 N — non è una condizione del luogo (4)

Sono parte della storia del Confidente, già in `confidente_disponibilita` (data, requisiti) e in `richiesta`. Mettere una condizione sul luogo sarebbe sbagliato (il luogo è accessibile anche senza).

| Luogo | Frase | Fonti Royal |
|---|---|---|
| kichijoji/kichijoji-galleria-kasumi | avvio automatico 30/5; sviluppo bloccato a rango 5 fino al 12/1 | 30/5 confermato (ACE «Faith Rank 1 – Auto» 5/30; SG: dopo la pulizia del parco). La ripresa a **12/1** è confermata da SG (rango 6 «3rd Semester 1/12»). Il «22 dicembre» della nostra disponibilità **non compare** per Kasumi nelle fonti lette. SG la lista dà 5/3: l'errore è segnalato da un commento alla pagina |
| shinjuku/chihaya-stand | incontro 23/6; svolta 30/6; primo rango 30/7 | **Discordano da ACE**: ACE Fortune Rank 0.1 il **28/6**, richiesta («Ending the Boyfriend's Abuse») disponibile il **4/7**, rango 1 il **7/7** (richiede la richiesta completata); SG-Lista: sblocco 22/6. Le date 23/6, 30/6, 30/7 non sono in nessuna fonte |
| shujin-academy/cancello-shujin | Confidente attivo dal 26/7 (Conoscenza 3) | Conoscenza 3: confermata (ACE e SG). **26/7 non compare**: SG 25/6, ACE rango 1 il **27/6** (richiede il Palazzo di Kaneshiro completato) |
| shujin-academy/corridoio-2-piano-shujin | 4/6 (dopo l'evento del 3/6); Coraggio 3 per la prima chiamata | Coraggio 3: confermato. Date: SG sblocco **24/5**, ACE rango 0.1 il **25/5** e rango 1 il **26/5** (sera, Coraggio 3, 5.000 ¥); il corridoio non è nominato (SG «Faculty Lounge», ACE «Staff Room»). Il 3/6 e il 4/6 non sono nelle fonti |

### 2.3 X — manca un'informazione strutturabile (7)

| Luogo | Che cosa manca | Condizione strutturata che sarebbe | Fonte Royal | Certezza |
|---|---|---|---|---|
| akihabara/sala-giochi-akihabara | la richiesta dei Memento e la data | `richiesta i-vincenti-non-imbrogliano` **e** `data dal 09-04`; il resto (Confidente) è nell'attività Gun About | SG: «Winner's Don't Use Cheats», disponibile il **9/4**; primo incontro 9/4 pomeriggio; ACE (riassunto) 9/4. La frase dice «dal 4/9» per l'Ombra e «5/9» per il Confidente: **prevale il 4/9** | alta per la data, media per i nomi |
| shibuya/stazione-piazza-shibuya | «9 maggio, dopo aver lavorato all'Ore no Beko» | `attivita lavoro-ore-no-beko, volte 2` (non una data) | ACE: «Sun Rank 0.1» il **31/5** con «2 shifts at Beef Bowl Job»; SG: sblocco 5/6, «work this job twice». **Il 9/5 non è in nessuna fonte.** La disponibilità di Yoshida dice «dall'inizio di maggio» | alta per i 2 turni; la data **discorda** (5/6 SG, 31/5 ACE) |
| shibuya/ore-no-beko | «nessun requisito per il lavoro» | **sull'attività** `lavoro-ore-no-beko`: dote perizia 2 e data dal 05-06 | SG-Lavori: «Rank 2 Proficiency», sbloccato il **5/6**; ACE: primo turno **5/6** sera. **La frase («nessun requisito») contraddice SG** | data alta; perizia 2 media (solo SG) |
| shinjuku/crossroads | job: Ohya avviata, Gentilezza 3, Perizia 3 | **sull'attività** `lavoro-crossroads`: oggi gentilezza 3, perizia 3, ohya 1. SG: **Gentilezza 3, Perizia 4, Coraggio 3** | SG-Lavori: sbloccato il 24/6, «you will have to start interacting with the Devil Confidant». ACE (riassunto): primo turno l'8/10. La «Confidente: 5 luglio» della frase non è in ACE (Devil rango 1 il 27/6) | media (solo SG per le soglie) |
| harajuku/harajuku-hangout | «invito di Mishima (3/8)» | un invito `mishima/08-03` che apre il luogo (oggi c'è solo `ryuji/05-29`) | SG: «Read Vague or accept Mishima's invitation on 8/3». **ACE: «Chariot Invite Harajuku», 5/29, Palazzo del museo completato**. Le due fonti Royal discordano | **decisione dell'utente** (§5) |
| mementos/ingresso-mementos | «dopo il primo Palazzo (Kamoshida)» | `palazzo kamoshida` oltre alla data 05-07 | non cercato in questo giro; la data 7/5 è una decisione dell'utente (migrazione 130) | media |
| roppongi/okumura-foods-hq | «durante l'infiltrazione al Palazzo di Okumura» | `finestra-palazzo okumura` al posto di `data dal 09-15` (il tipo esiste in `shared/condizioniSpillo.ts`; la frase dice anche quando si chiude) | SG: Palazzo 9/15–9/19; ACE (riassunto): 9/23–9/25: **discordano** | media |

## 3. Le 18 attività

**R (14):** freccette (data 06-05); Jazz Club (akechi 4 + 06-26); allenamento in camera (04-18 + mansarda pulita); curry (sojiro 4); Tempio vecchio (06-06); i sette videogiochi (data + mansarda + Famidrive + sistema + articolo di ciascuno); lavoro Rafflesia (fascino 2); allenamento in palestra (la frase «Ryuji 5 oppure Ann 8» è la condizione del luogo `shibuya/protein-lovers` che l'attività eredita dalla sede).

**Non coperte (4):**

| Attività | Frase | Che cosa manca | Fonte |
|---|---|---|---|
| sala-giochi-gun-about-akihabara | richiesta dei Memento «I baro non vincono mai», avviabile dal 4/9 | `richiesta i-vincenti-non-imbrogliano` (il nome della frase **non è quello della richiesta nel DB**: «I vincenti non imbrogliano») | SG «Winner's Don't Use Cheats» 9/4 (stessa voce del luogo, §2.3) |
| studio-biblioteca-scuola | «fino al 20 maggio secondo AGS» | la **fine**: la struttura ha solo `data dal 04-09`; esiste `intervallo` (dal–al) | **non verificato con il Royal**; la fonte è solo AGS |
| sfida-big-bang-burger | tre sfide con Coraggio/Conoscenza/Perizia rango 2, 3, 4 | la struttura mette le tre doti a rango 2 in AND e perde i ranghi 3 e 4 delle sfide successive | **non verificato con il Royal**; va letto prima se le tre doti valgono tutte o una sola |
| lavoro-crossroads | Ohya avviata, Gentilezza 3, Perizia 3 | SG: Gentilezza 3, **Perizia 4**, **Coraggio 3** | SG-Lavori (§2.3) |

## 4. Regola per toglierle senza perdere informazione

1. **Archivio, non cancellazione.** Ogni frase (le 39 dei luoghi e le 18 delle attività) si copia in `dati_guida` come si è fatto per le colonne tolte dalla 176, 177, 184 e 188, e si registra la colonna in `FONTI_TOLTE` (`colonna-rimossa`). Così nulla si perde, nemmeno le date errate.
2. **Prima di togliere, portare ciò che manca** (nessuna colonna cade finché una riga ha un'informazione che solo la frase conserva):
   - **X** dei luoghi (§2.3) e le 4 attività non coperte (§3): una condizione strutturata scritta con migrazione propria, con le guardie sull'uid e sulla frase attesa. Quelle con una sola fonte (Crossroads, Ore no Beko, Big Bang Burger, biblioteca) vanno all'utente come **domanda**, non come correzione dedotta.
   - **N** (4 luoghi): niente da portare; già nella disponibilità e nelle richieste del Confidente.
   - **R** con la data della frase diversa dal Royal (Ichigaya, Meiji, Planetario): niente da portare; la struttura è già giusta.
3. **Lettori da riscrivere.** Luoghi: `server/services/luoghiService.ts:160` (il DTO `sblocco`), `src/pages/QuartierePage.tsx:118` (mostra la frase: va letta la frase derivata dalla condizione, che oggi esiste solo nel dettaglio, `luoghiService.ts:268-274`: va estesa all'elenco), il modulo «Correggi» (`src/components/guida/moduli/ModuloLuogo.tsx`, `definizioni.ts:196,205`), gli schemi (`server/schemas/catalogo.ts:204,236`), il censimento (`censimentoLuoghiCondizioniService.ts:12,14`), `catalogoService.ts:54`. Attività: `attivitaService.ts:101,107` (DTO), `catalogoService.ts:51` e **`catalogoService.ts:93` (`condizioniDa: sblocco`)**: oggi converte la frase in condizioni quando si ripristina una istantanea vecchia (`seed_json`); tolta la colonna, un ripristino di una istantanea con la frase deve ignorarla senza errore (come già fa la voce `periodo` dei film).
4. **Ordine.** (a) migrazione delle condizioni mancanti; (b) lettori; (c) migrazione che archivia e toglie le colonne; (d) controllo a ricerca invariata e a presenza invariata: per ogni luogo e attività, sulla copia, `presenzaDelLuogo` prima e dopo (stesso sblocco per le partite p1 e p2).

## 5. Domanda per l'utente (una riga)

«Harajuku si apre con l'invito di Mishima del 3/8 (Samurai Gamers) o con quello di Ryuji del 29/5 (dati di gioco ACE, già nel database)?»

## 6. Limiti

- ACE: letto verbatim fino all'8/5 in questo giro; le date successive vengono da un riassunto. I casi dove il solo riferimento è ACE oltre l'8/5 sono segnati «riassunto» o «media».
- Nessuna pagina letta dà il nome «Scarlet», «Hinokuniya» o «Galleria»: per quei luoghi il Royal non dice nulla.
- Non ho riaperto le pagine AllGameStaff per le frasi dei luoghi; ho confrontato con la struttura del database.
