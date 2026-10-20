# L5 «Luoghi, negozi, orari» — requisiti

Autore: sessione «Analisi requisiti» (2026-10-20). Fonti: piano (righe 85-86, 88, 90, 92-95, 97-98, 164-167, 191, 202-203, 223, 229,
247, 256-257, 263, 370, 418, 438), memoria «Gerarchia del mondo», «Un punto di modifica», «Tre formati»; DECISIONI 2026-10-20 (D5).
Riletto il 2026-10-20 alla luce delle decisioni prese dopo la prima stesura:
- i due livelli «concluso» e «completato» di L4;
- NR4-1 (a) di L4;
- luogo chiuso nascosto dai menu e nomi nella navigazione;
- inviti dei Confidenti come eventi che sbloccano;
- Odaiba, Asakusa, Clinica;
- UX2-11, spostato in L5;
- le risposte dell'Esperto della guida G-011…G-015, G-018, G-023 e G-026. G-022, G-024 e G-025 non toccano L5.

I criteri aggiunti sono R5-12b, R5-12c, R5-20d e R5-20e; quelli estesi sono R5-20c e i dubbi 3, 7 e 9.
Contesto letto in sola lettura su `prod-20261020/gioco.db` (il censimento vero è di `dati.md`).

## Obiettivo
Il **Luogo** (tabella `luogo`: Untouchable, Diner, distributore) è la **fonte unica** di ciò che riguarda un'attività posizionata nel
mondo: nome, descrizione, quartiere, **Area** (da L2), tipo, **orari e presenza**, sblocco; la sua posizione è **il pin sulla
planimetria**, che non copia più nome né descrizione. Il **Negozio** diventa **il listino di un luogo** (una sola sede), mostrato come
**sezione della pagina del luogo** (D5); i luoghi con più negozi li mostrano tutti. Ogni luogo ha la sua pagina `/guida/luogo/<chiave>`
(orari, sblocco, Confidente, listino, attività, «Dove si trova» con planimetria incorporata). «Aggiungi luogo» dalla planimetria crea
anche il pin. I marcatori vecchi spariscono.

**Fatto quando** (piano, riga 418): scheda e visore dicono la stessa cosa sugli orari; nessun pin della città senza luogo, salvo i
passaggi.

## Perimetro misurato (contesto, da confermare con `dati.md`)
- 93 luoghi (42 con la frase `negozio`), 51 senza Area (ricognizione L2), 7 con doppio pin.
- 61 negozi; il «dove» in quattro forme: frase `luogo` (60), `luogo_chiave` (58), `sede_chiave` (57), frase `luogo.negozio` sui luoghi.
  Orari in due forme sul negozio (`orari` frase 60, `orari_json` 61) e altre sul luogo (`quando`, `giorni`, `giorni_json`).
- Piano: orari di scheda e visore diversi in 23/57; nomi dei negozi nelle voci del diario 11/16 divergenti; frasi «Shibuya, Central
  Street» dei negozi 27/57; 46 luoghi senza pin, 48 pin senza luogo; descrizioni dei pin nativi 40/40 diverse dal luogo.
- Pin non di passaggio sulle mappe del mondo: 113 senza riferimento, 47 → luogo, 17 → negozio, 2 → Confidente, 1 → attività.
- `marcatore_mappa`: 149 righe (marcatori vecchi).

## Criteri di accettazione
Tipo: **F** funzionale, **UX** esperienza, **NR** no-reg, **L** layout.

### Il luogo come fonte unica
- R5-01 [F] Ogni luogo ha quartiere e Area (o è elencato «da collocare»): nessun luogo resta senza Area dopo la migrazione, salvo l'elenco approvabile.
- R5-02 [F] Nome, descrizione, tipo, orari, presenza e sblocco di un luogo si leggono solo dal luogo: pin, scheda del quartiere, pagina dell'Area, negozio, attività, Confidente, libri e film li prendono da lì (elenco dei lettori in `app.md`).
- R5-03 [F] Il pin di un luogo non ha più nome e descrizione propri: mostra quelli del luogo; rinominare il luogo cambia subito il pin in visore, scheda e popup.
- R5-04 [F] Gli orari e la presenza sono strutturati sul luogo (fasce, giorni, eccezioni); la scheda del luogo, il visore (popup del pin) e la scheda del quartiere dicono la stessa cosa per tutti i 57 (o quanti in `dati.md`) luoghi con orari: zero divergenze misurate dopo la migrazione.
- R5-05 [F] Le frasi di orari e presenza di oggi (luogo e negozio) diventano campi strutturati dove esprimono un dato e restano come nota dove aggiungono contesto; i casi dubbi vanno in un elenco da approvare prima della migrazione (piano riga 156-158).
- R5-06 [F] Le frasi «Shibuya, Central Street» che descrivono il «dove» spariscono dalle viste: si legge la sede (quartiere › Area › luogo) dal vivo.
- R5-07 [F] Correggere un luogo si fa da un solo modulo, nella sua pagina, con «Ripristina» al valore della guida; le correzioni sopravvivono a un aggiornamento del pacchetto.

### Il negozio come listino del luogo (D5)
- R5-08 [F] Ogni negozio ha una sola sede (un luogo); le quattro forme del «dove» si riducono a una; i negozi senza sede chiara finiscono in un elenco da approvare.
- R5-09 [F] La pagina del luogo mostra la sezione «Negozio» con il listino (articoli, prezzi, acquisti) di ogni negozio che ha lì la sede; un luogo con più negozi li mostra tutti.
- R5-10 [F] L'indirizzo vecchio `/guida/negozi/<chiave>` rimanda alla pagina del luogo, sulla sezione del negozio; `/guida/negozi` resta come elenco o filtro (vedi dubbio 5).
- R5-11 [F] Il nome del negozio si legge dal negozio ovunque, comprese le voci del diario (dal vivo, senza testo ricopiato): le 11/16 voci divergenti mostrano il nome giusto senza che il testo della voce cambi.
- R5-12 [F] Orari e sblocco del negozio non hanno più una copia propria: valgono quelli del luogo (sede), salvo un'eccezione dichiarata sul negozio se il gioco la prevede (dubbio 3).
- R5-12b [F] **Gli orari sono di quattro ambiti, e non si mescolano**. È la regola dell'Esperto della guida (G-011, G-012, G-013, G-015), che chiude il dubbio 3.
  - **Luogo**: quando il posto è aperto.
  - **Negozio**: un'eccezione dichiarata sul listino, solo dove il gioco la prevede. Per esempio la Chiesa di Kanda vende solo la domenica, con rifornimento la domenica dopo; Super Muramasa e Mran Mran sono aperti solo di giorno; il Fioraio Sukebe solo di sera.
  - **Articolo**: disponibilità per giorno o meteo. Per esempio il Panino con yakisoba solo il venerdì; il Natto rugiadoso, il Sandwich inzuppato e il Frullato iperproteico solo con la pioggia; il venditore ambulante di Shibuya chiuso con la pioggia.
  - **Confidente e attività**: la disponibilità del Confidente sta in L9 (R9-01); per esempio Hifumi la sera di lunedì, mercoledì, sabato e domenica non è l'orario della chiesa. La fascia di un'attività del luogo sta sull'attività; per esempio caffè e curry al Leblanc si preparano la sera, mentre il locale è aperto di giorno.

  Verifiche:
  - la Chiesa di Kanda non prende l'orario di Hifumi;
  - il Leblanc resta «giorno e sera» come luogo, e il «solo sera» è dell'attività «prepara caffè/curry»;
  - la Clinica Takemi è aperta di giorno tutti i giorni (dato già coerente, G-015), e il suo negozio si sblocca il 16/4 mentre Tae il 18/4 (decisione dell'utente, R6-12);
  - **Untouchable** (Esperto, G-032, certezza media): «sera, giovedì, sabato, domenica», che oggi è scritto su luogo e negozio, è la disponibilità di **Iwai**, e va al Confidente (L9). La guida italiana non dà un orario del negozio; la fonte inglese separa il negozio («After School») da Iwai («Evening»), e il distributore militare interno si usa in qualsiasi momento. Come per la Chiesa di Kanda, il luogo segue la **regola dell'app «giorno e sera»**, con lo sblocco al 04-17 (condizione di L6). Verifica: il 06-01, che è un mercoledì, Untouchable è aperto e nei menu; la pagina di Iwai mostra i suoi giorni.
  - **Altri 8 luoghi con orari legati a un Confidente** sulla base 0503Z (Stesura modifiche): Sala giochi di Akihabara (Shinya), Crossroads (Ohya), Chihaya stand (Chihaya), Cancello della Shujin (Makoto), Corridoio del 2° piano (Kawakami), Piazza della stazione di Shibuya e Ore no Beko (Yoshida), Jazz Jin (Akechi). Vale la stessa regola: dove giorni o fascia sono del Confidente, vanno a L9, e il luogo prende il suo orario della guida oppure la regola dell'app. Prima della M5 Analisi dati e l'Esperto li classificano luogo per luogo; fino ad allora restano come oggi e stanno nell'elenco. Verifica: dopo la M5 nessuno di questi 9 luoghi (con Untouchable) ha come orario i giorni o la fascia del suo Confidente, salvo quelli che la classificazione dichiara orari del luogo, con la fonte.
  - Conseguenza per le prove: Untouchable non è più l'esempio di «luogo chiuso». Il nuovo esempio è il **Fioraio Sukebe** (pin 210 sull'illustrazione di Shinjuku, «solo di sera» dalla guida, nessun Confidente): di giorno è nascosto, e `?spillo=210` lo mostra evidenziato. `?spillo=1517` apre Untouchable normalmente. Il conteggio di Central Street al 06-01 si rimisura dopo la M5. I casi di R5-20b e di R10-28b (spillo `?spillo=` di un luogo chiuso) si fanno su un luogo con un orario vero della guida, per esempio il Fioraio Sukebe, solo di sera.
- R5-12c [F] Dove la guida non dà un orario, cioè per i luoghi senza nota, l'app usa una **regola dichiarata dell'app** («aperto giorno e sera»), segnata come tale e **non come dato della guida** (G-011: «non dedurre "sempre aperto" come dato della guida»). La scheda del luogo dice quale delle due cose vale.
- R5-13 [F] Gli acquisti registrati oggi nella partita restano legati allo stesso articolo e si vedono nella sezione del negozio come prima.

### Pin, posizione e pagina del luogo
- R5-14 [F] La posizione di un luogo è il suo pin sulla planimetria: «Dove si trova» nella pagina del luogo mostra la planimetria incorporata sul pin, e il tocco porta alla pagina dell'Area su quel pin.
- R5-15 [F] Dopo la migrazione nessun pin della città (mondo) è senza luogo, salvo i passaggi; i pin senza luogo di oggi diventano luoghi (nuovi o esistenti) o finiscono in un elenco da approvare, mai cancellati.
- R5-16 [F] I luoghi senza pin di oggi compaiono in un elenco «da posizionare» nella pagina del loro quartiere/Area; un luogo con due pin (i 7 di oggi) resta con i suoi pin, segnalato, finché l'utente non sceglie (dubbio 2).
- R5-17 [F] `/guida/luogo/<chiave>` è la casa del luogo: orari, sblocco, Confidente, listino, attività, dove si trova; ogni link a un luogo (pin, schede, «Dove si trova», libri, film, Confidente, attività, diario, ricerca) porta lì; l'ancora dentro la pagina del quartiere sparisce.
- R5-18 [F] «Aggiungi luogo» dalla planimetria (o dall'Area) chiede un luogo esistente o nuovo, poi il punto: il pin nasce collegato.
- R5-19 [F] I marcatori vecchi (`marcatore_mappa`) non sono più letti da nessuna vista; ciò che portano di utile è passato a luoghi o pin (elenco in `dati.md`).
- R5-20 [F] Pin di Confidente e di attività (oggi 2 e 1) restano funzionanti; se sono in un luogo, il pin è quello del luogo e il Confidente/attività si mostra nella pagina del luogo.
- R5-20b [F] **Un luogo chiuso in quel momento non compare nei menu di navigazione**: metro, elenco dei luoghi del quartiere e dell'Area, indice, «vai a». «Chiuso» vuol dire non disponibile per la partita, il giorno e la fascia correnti, secondo orari, presenza e sblocco (R5-04, L6). Decisione dell'utente del 2026-10-20: «luogo chiuso va nascosto dal menu di navigazione». **Eccezione**: lo spillo chiesto dal diario (`?spillo=`, R10-28b) si mostra ed è evidenziato con «non disponibile adesso: …». La pagina del luogo resta raggiungibile dalla ricerca e dai link diretti, con l'indicazione «chiuso adesso». Verifica nella partita di prova: si sceglie un luogo aperto solo di giorno e si passa alla sera; il luogo sparisce dai menu, ricompare tornando al giorno e resta visibile solo se aperto da `?spillo=`.
- R5-20c [F] **Ogni voce di navigazione verso un luogo o un'area porta il suo nome**, mai «Mappa» né un'etichetta generica che si confonde con le mappe. Le parole dell'utente: «chiamandolo con il suo nome... e non con mappa che si confonde con le mappe». Rientra qui anche **UX2-11**, spostato dal PM in L5: il riquadro «Dove si trova» (negozi, attività, libri) oggi dice «Apri sull'atlante» (`src/components/mappe/DoveSiTrova.tsx:113`). Deve dire il nome del posto in cui porta, per esempio «Apri in Central Street». «Atlante» era il nome del visore, che per chi gioca non esiste più come posto. Verifiche:
  - in nessun menu, pulsante, briciola o riquadro «Dove si trova» c'è un'etichetta «Mappa» o «atlante» per un posto;
  - il controllo si fa sul DOM di tutte le viste che navigano verso luoghi e aree, a 1280, 768 e 375;
  - il caso di UX2-11 è Guida → Negozi → Untouchable → «Dove si trova»: il link dice «Apri in Central Street» e porta all'Area Central Street sullo spillo 1517.
- R5-20d [F] **Cosa vuol dire «chiuso»** per R5-20b, con le regole decise dopo la prima stesura:
  - un luogo o un ritrovo che si sblocca con un evento (data, rango, lettura completata di un libro, **invito del Confidente avvenuto**: L6 R6-08c..f, G-018, G-023) è chiuso finché l'evento non c'è;
  - nei quartieri con più ritrovi, l'evento sta sul ritrovo (G-018), e un ritrovo chiuso è nascosto anche se il quartiere è aperto. I casi sono Jinbocho a Kanda (Hifumi rango 4, oppure il libro «Pagine ammuffite»), lo Skytree ad Asakusa (lettura di «Shitamachi rinato») e il Jazz Club a Kichijoji (Akechi rango 4);
  - il **pin d'ingresso di un Palazzo** in città è un passaggio, non un luogo, e sparisce quando il Palazzo è **«concluso»** (Tesoro e boss: L4 R4-22, R4-25), non al 100%;
  - lo stato dei pin del mondo resta **suo**, per partita (L4 R4-09/R4-10): la regola NR4-1 non cambia nulla per i pin dei luoghi.

  Verifiche nella partita di prova:
  - con Jinbocho chiuso e Kanda aperto, Jinbocho non è nei menu, e lo è dopo il rango 4 di Hifumi;
  - con Kamoshida concluso ma non completato, l'ingresso in città non c'è.
- R5-20f [F] **I quattro luoghi rimasti aperti** sono chiusi dall'Esperto della guida (G-031). I loro dati sono questi:
  - **Sakura Residence** (`yongen-jaya/sakura-residence`): luogo **senza sblocco proprio**, segnato «solo durante gli eventi di Futaba», perché non diventa mai visitabile da solo. Gli eventi stanno nel Confidente (L9). Non compare nei menu di navigazione (R5-20b) ed è nell'elenco «da rivedere» (R11-10c). Certezza media.
  - **Mercante Sakai** (`kichijoji/mercante-sakai`): a Kichijoji, nei vicoli della parte centro-occidentale. Ha 16 finestre di presenza come intervalli di date, dal 06-12→06-17 al 01-22→02-02 (vale la tabella della guida, non i 28/1 della fonte inglese). Ogni finestra ha il suo scambio, che è un dato di L7. È «chiuso», quindi nascosto dai menu, fuori dalle finestre.
  - **Jinbocho**: è un'area a sé dentro `kanda-jinbocho`, con un solo negozio, la Libreria Nagiuri, che si apre con l'area: Hifumi rango 4 **oppure** la lettura di «Pagine ammuffite». Dove si compra il libro, Hinokuniya o Taiheido, è una discordanza della guida e va nell'elenco «da rivedere».
  - **Okumura Foods** (`roppongi/okumura-foods-hq`): prima visita il **15/9**, non il 19/9 (G-018 corretto). Dopo non risulta visitabile liberamente, perché gli ingressi al Palazzo passano dal Ritrovo.

  Verifiche: fuori da una finestra il Mercante Sakai non è nei menu, dentro sì; la Sakura Residence non è in nessun menu né in «Luoghi qui», in nessun giorno; la Libreria Nagiuri compare solo con Jinbocho aperto.

  **Come si esprime «solo durante gli eventi di Futaba».** Non con una condizione «manuale»: le decisioni dell'utente lo escludono. Il 2026-09-05 l'utente ha scelto condizioni «limitate a ciò che l'app sa calcolare… niente condizioni "manuali"»; il 2026-09-30 i requisiti «manuali» sono diventati eventi. Proposta prudente: una proprietà strutturata del luogo, «**visitabile solo negli eventi**» (con il Confidente per chiave, Futaba), che lo tiene fuori dai menu di navigazione e da «Luoghi qui» in ogni giorno. La pagina del luogo lo spiega e si raggiunge dagli eventi di rango di Futaba (rango 6 il 16/10, rango 7 il 2/11, rango 10 amore) e dalla ricerca. Non serve nessun segno a mano dell'utente. Da confermare dal PM, se si preferisce un'altra forma che resti nel vocabolario calcolabile.
- R5-20e [F] Un **Confidente può sbloccare un luogo** (R9-07c): l'invito si indica dalla pagina del Confidente. La pagina del luogo mostra lo sblocco come «dopo l'invito di X» e dice se nella partita c'è già, con il collegamento al Confidente. La descrizione si genera dalla condizione (R6-08b), non da una frase.
- R5-21 [F] Eliminare un luogo lo manda nel cestino con il suo pin e i suoi legami (negozi, attività, Confidenti), e lo si rimette al suo posto.

### Lavoro da preservare e non regressione
- R5-22 [NR] I pin delle mappe del mondo restano nella stessa posizione sulla stessa planimetria; i pin creati dall'utente conservano le condizioni di visibilità e i collegamenti; confronto pin per pin prima/dopo.
- R5-23 [NR] Gli stati della partita sui luoghi e sui pin del mondo (visitato, raccolto) restano uguali per p1 e per una partita di prova.
- R5-24 [NR] Il diario 04-01..06-01 (255 voci sulla copia di produzione 0440Z del 2026-10-20; 254 sulla copia precedente) invariato in testo, ordine, giorno, fascia, uid e spunte; le sue voci che portano a negozi o luoghi aprono la pagina del luogo giusta.
- R5-25 [NR] Kamoshida (169 voci) e Madarame (227 voci e 254 pin utente sulla copia 0440Z, impronta 263; 225/252 sulla copia precedente) non toccati: impronta identica.
- R5-26 [NR] Listini, prezzi, acquisti, punti negozio (Programma punti) e scambi funzionano come prima dalla nuova sezione; regali e libri che citano un negozio lo trovano.
- R5-27 [NR] Le condizioni che oggi citano un luogo o un negozio (visibilità dei pin, disponibilità) valutano come prima (il vocabolario unico è di L6).
- R5-28 [NR] Typecheck e lint verdi; test mirati (luoghi, negozi, cittaService, accesso al mondo, migrazioni nuove, pagine Luogo/Negozio/Quartiere) verdi con output grezzo.

### Esperienza e layout
- R5-29 [UX] Dal telefono in partita: da una voce del diario «compra X da Y» si arriva alla sezione del negozio nella pagina del luogo in un tocco, con orari e disponibilità di oggi visibili senza scorrere.
- R5-30 [UX] La pagina del luogo è leggibile in gioco: orari e «aperto adesso?» in cima, poi listino, Confidenti, attività; la grafica resta curata (immagini al 100%).
- R5-31 [UX] Vocabolario di L0: «Luogo» solo per l'attività, «Area» e «Planimetria» come in L2; «Negozio» per il listino.
- R5-32 [L] Pagina del luogo, sezione negozio, «Aggiungi luogo», elenchi «da collocare» e «da posizionare»: nessuno scorrimento orizzontale a 1280, 768, 375; bersagli ≥44 px; listino a più colonne su desktop, colonna piena su telefono; scroll annidati del listino con confine evidente e overscroll contenuto.
- R5-33 [L] A 1366×657 e 1280×689 la pagina del luogo mostra intestazione, orari e inizio del listino nella prima schermata.

## Decisioni coinvolte
| Decisione | Scelta consigliata applicata, da confermare | Effetto sui criteri |
|---|---|---|
| D5 Negozio come pagina | **Sezione della pagina del luogo** (l'indirizzo vecchio rimanda al luogo) | R5-08..R5-13, R5-17 |
| D8 Acquisti e yen | Proposti da confermare | Non applicata qui (L10): L5 non cambia gli acquisti |

## Lavoro dell'utente da preservare toccato dal lotto
- Pin del mondo creati dall'utente (≈185) con condizioni e collegamenti; luoghi e negozi corretti dall'app (`origine='utente'`).
- Diario 04-01..06-01: solo i collegamenti verso luoghi e negozi.
- Kamoshida e Madarame: non toccati.

## Dipendenze
- **L2 consegnato** (Aree del mondo e pagine Quartiere/Area: il luogo si lega all'Area, «Dove si trova» porta all'Area).
- Prepara **L6** (sblocchi e orari strutturati diventano condizioni del vocabolario unico), **L7** (listino → articoli del catalogo unico
  per chiave), **L9** (disponibilità dei Confidenti legata al luogo).

## Casi dubbi da approvare (soluzione prudente proposta)
1. **Luoghi senza Area (51)**: si assegnano all'Area dove sta il loro pin; quelli senza pin restano «da collocare» nel quartiere.
2. **Luoghi con doppio pin (7)**: entrambi i pin restano, collegati al luogo; l'utente sceglie quale tenere (nessuno si cancella).
3. **Negozio con orari diversi dalla sede** (es. un banco che apre solo certe sere dentro un luogo aperto sempre): resta un'eccezione sul
   negozio, mostrata accanto agli orari del luogo, invece di sovrascrivere il luogo. **Chiuso con le risposte dell'Esperto (G-011, G-012,
   G-013, G-015)**: i casi reali sono pochi, e sono eccezioni del negozio (Chiesa di Kanda solo la domenica), disponibilità di un articolo
   (per giorno o meteo), fasce di un'attività (caffè e curry al Leblanc la sera, Ore no Beko e Rafflesia per i lavori) o disponibilità di un
   Confidente (Hifumi). Ognuno sta nel suo ambito (R5-12b).
4. **Pin del mondo senza riferimento (113)**: quelli che corrispondono a un luogo per posizione o nome diventano il suo pin (elenco); gli
   altri diventano luoghi nuovi solo se l'utente approva; quelli puramente decorativi o di passaggio restano come sono.
5. **`/guida/negozi`**: resta come elenco di tutti i negozi con filtro, ogni riga porta alla sezione del luogo (prudente: nessun link
   rotto); la pagina singola sparisce come destinazione.
6. **Negozi senza sede** (61 − 57 con `sede_chiave`): la sede si deduce da `luogo_chiave` o dalla frase; se ambigua, elenco da approvare.
7. **Distributori e luoghi ripetuti** (stesso tipo in più aree): ogni istanza è un luogo a sé con il suo pin; il listino può essere
   condiviso solo in L7 (catalogo unico), non qui. **Esperto della guida (G-014)**: nel gioco i listini dei distributori si ripetono in pochi
   set, quindi un pin di Central Street legato a un listino di Shujin può essere giusto. Dei 5 pin dell'utente legati a listini di Shujin,
   1527, 1547 e 1768 sono coerenti. Due sono da approvare, senza nessuna modifica automatica: **1584** (Vicoli di Yongen-Jaya) andrebbe su
   `distributore-yongen-bagno`; **1769** (Central Street «destra») vende il set C con la Creatura, che oggi nell'app non ha un negozio (L7).
9. **Distributori: rifornimento ogni lunedì**, e i distributori vuoti con ondata di calore o notte torrida (G-011, G-014): è disponibilità
   dell'articolo (R5-12b), da esprimere con le condizioni di L6. Prudente: in L5 solo come nota del luogo; strutturato in L6/L7.
8. **Descrizioni dei pin nativi diverse dal luogo (40/40)**: vince la descrizione del luogo; il testo del pin, se aggiunge contesto, finisce
   come nota del luogo dopo approvazione, mai perso.
