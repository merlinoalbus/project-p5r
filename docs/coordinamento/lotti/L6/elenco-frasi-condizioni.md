# L6 — elenco delle frasi e proposte di trattamento

Stato: **analisi non applicata**, da approvare prima di qualsiasi conversione. Nessuna migrazione o scrittura sui dati deriva da questo documento.

## Provenienza e limite

Inventario ricostruito in sola lettura dal file pubblico `pacchetto/gioco.db` già versionato, schema 93, sul commit `38411d36`. Non è una copia di p5s e non dimostra lo stato corrente dei dati dell'utente. Il file serve qui solo come fonte storica pubblica delle frasi, non come fonte da importare nell'istanza.

Sono censite tutte le 201 righe del perimetro indicato in `modifiche.md` §4.2: 39 luoghi, 35 negozi, 21 attività, 106 articoli. Le frasi identiche sono raggruppate: 147 gruppi, con tutte le chiavi e il numero di righe. Sono esclusi i campi vuoti e i valori già JSON. Le correzioni strutturate di L5/M6 e le modifiche dell'utente hanno precedenza sulla frase storica.

## Regole della proposta

- Non convertire automaticamente nessuna frase: le frasi restano note.
- Le condizioni dei luoghi restano sulla sede; orari, Confidenti, lavori, articoli e baratti non si fondono in uno sblocco del luogo.
- Le date di vendita dei libri non aprono i posti: contano lettura completata o invito registrato.
- I riferimenti si scelgono per chiave. Se una chiave o una regola non è provata, la riga resta da chiarire: non si inventano eventi o tipi di pin.
- Prima di applicare una proposta, confrontarla con i dati correnti di p5s e produrre il prima/dopo. Il presente inventario non autorizza a sostituire condizioni strutturate già salvate.

## luogo.sblocco

39 righe, 39 frasi distinte.

| Frase storica | Righe e chiavi | Proposta non applicata |
|---|---|---|
| 1 giugno / Confidente Ann Rango 10 | 1 · `odaiba/odaiba-seaside-park` | Già trattato in M6: O(lettura luoghi-della-movida, confidente ann rango 10). Il 1 giugno è vendita del libro, non sblocco. |
| 10 giugno | 1 · `suidobashi/dome-town` | Già trattato in M6: data dal 06-09; la frase storica 10 giugno non deve prevalere. |
| 11 ottobre (evento di trama) o libro dedicato | 1 · `maihama/destinyland` | Usare lo sblocco strutturato e l'eventuale via lettura. La data 10-11 rimane a certezza media; nessuna nuova conversione. |
| 18 aprile (visita alla clinica e dialoghi su farmaci speciali/test clinico) | 1 · `yongen-jaya/clinica-takemi` | Già trattato in M6: sede dal 04-16, Confidente dal 04-18. Non fondere i due eventi. |
| 4 giugno (dopo evento narrativo del 3 giugno); Coraggio Rango 3 per la prima chiamata | 1 · `shujin-academy/corridoio-2-piano-shujin` | Nota su Kawakami, non chiusura del corridoio. Eventuale data/dote va sui requisiti del Confidente. |
| 6 luglio (invito di Ryuji) o lettura libro "Vedetta lacustre" | 1 · `ichigaya/laghetto-ichigaya` | Usare M6: lettura vedetta-lacustre oppure invito registrato ryuji/07-03. La data della frase è superata; non è una via automatica. |
| Confidente Akechi Rango 4 (dal 26 giugno) | 1 · `kichijoji/jazz-jin` | Già trattato in M6: confidente akechi rango 4. Non aggiungere la data della prima disponibilità di Akechi come secondo blocco. |
| Confidente Ann (Amanti) Rango 3 | 1 · `inokashira-park/inokashira-hangout` | Già trattato in M6: confidente ann rango 3. |
| Confidente Ann (Amanti) Rango 7 | 1 · `asakusa/asakusa-hangout` | Già trattato in M6: confidente ann rango 7. |
| Confidente Iwai: 15 agosto consigliato (Coraggio Rango 4 + Persona Arcano Appeso); negozio disponibile prima come semplice esercizio dal Palazzo di Kamoshida in poi | 1 · `shibuya/untouchable` | Già trattato in M6: sede dal 04-17; i prerequisiti di Iwai restano sul Confidente. |
| Confidente Ryuji (Carro) Rango 4 | 1 · `ogikubo/ogikubo-ramen` | Già trattato in M6: confidente ryuji rango 4. |
| Confidente Ryuji (Carro) Rango 7 | 1 · `tsukishima/tsukishima-monjayaki` | Già trattato in M6: confidente ryuji rango 7. |
| Confidente Yoshida: 9 maggio (dopo aver lavorato all'Ore no Beko) | 1 · `shibuya/stazione-piazza-shibuya` | Nota su Yoshida, non chiusura della piazza. Usare i requisiti del Confidente. |
| Confidente Yusuke (Imperatore) Rango 3 | 1 · `ueno/museo-ueno` | Già trattato in M6: confidente yusuke rango 3. |
| Confidente attivo dal 26 luglio (richiede Conoscenza Rango 3) | 1 · `shujin-academy/cancello-shujin` | Nota sul Confidente, non chiusura del cancello della scuola. Non applicare alla sede. |
| Confidente: 5 luglio; lavoro part-time: Confidente Ohya avviato + Gentilezza Rango 3 + Perizia Rango 3 | 1 · `shinjuku/crossroads` | Separare sede, Confidente e lavoro: Ohya/doti sociali sono requisiti del lavoro, non blocchi cumulativi del luogo. |
| Incontro: 23 giugno; svolta: 30 giugno (richiesta Memento "Un fidanzato violento"); primo rango: 30 luglio | 1 · `shinjuku/chihaya-stand` | Nota sugli incontri di Chihaya: i requisiti vanno sul Confidente; non scegliere una delle tre date come sblocco della strada. |
| Rango 3 delle Gemelle custodi (Forza) | 1 · `kichijoji/mantra-ganda` | Già trattato in M6: confidente gemelle rango 3. |
| Ryuji Confidente Rango 5 oppure Ann Confidente Rango 8 | 1 · `shibuya/protein-lovers` | Già trattato in M6: O(confidente ryuji rango 5, confidente ann rango 8). |
| alcuni titoli richiedono attività specifiche sbloccate | 1 · `shinjuku/hinokuniya` | Nota sul catalogo: i requisiti dei singoli libri vanno sugli articoli, non sull'intera libreria. |
| appare casualmente nei Memento | 1 · `mementos/negozio-jose` | La comparsa casuale è nota; M6 usa la Richiesta per lo sblocco con certezza media. Non inventare un tiro casuale o una data. |
| avvio automatico 30 maggio; sviluppo bloccato a rango 5 fino al 12 gennaio (Palazzo di Maruki) | 1 · `kichijoji/kichijoji-galleria-kasumi` | Nota sui ranghi di Kasumi: non è una condizione del luogo. |
| dal 28 giugno; Fascino Rango 3 per il primo incontro (consigliato 2 luglio) | 1 · `kanda-jinbocho/chiesa-kanda` | M6 distingue sede dal 06-28 e Fascino per Hifumi: non bloccare la chiesa con la Dote del Confidente. |
| dal 9 ottobre | 1 · `yongen-jaya/venditore-patate-dolci` | Già trattato in M6: data dal 10-09; il meteo appartiene agli orari/presenza. |
| disponibile una volta raggiunta Shibuya nella storia | 1 · `shibuya/scarlet` | Ereditare lo sblocco di Shibuya; la frase non identifica un evento ulteriore. |
| dopo il primo Palazzo (Kamoshida) | 1 · `mementos/ingresso-mementos` | Proposta da approvare: palazzo kamoshida concluso. Verificare che l'accesso di trama ai Memento non abbia un evento distinto. |
| durante l'infiltrazione al Palazzo di Okumura | 1 · `roppongi/okumura-foods-hq` | Usare le condizioni del quartiere/Palazzo di M6; non dedurre dalla frase un intervallo con fine ignota. |
| lavoro part-time: Fascino Rango 2 (Interessante) | 1 · `shibuya/rafflesia` | Il Fascino rango 2 va sul lavoro-rafflesia, non sulla fioreria. |
| lettura del libro «Shitamachi rinato» | 1 · `asakusa/tokyo-skytree` | Già trattato in M6: lettura shitamachi-rinato. |
| lettura del libro «Vague» | 1 · `harajuku/takenoko-street` | Già trattato in M6: lettura vague. |
| lettura di un libro dedicato (titolo italiano non confermato con certezza; possibile "Cieli notturni", 1.800¥, Libreria Taiheido) oppure invito di Makoto il 30/07 | 1 · `ikebukuro/planetario-ikebukuro` | Usare M6: lettura cieli-notturni oppure invito registrato makoto/07-30. Non ricavare lo sblocco dalla vendita del libro. |
| lettura di un libro dedicato (titolo italiano non reperito nelle fonti consultate) | 1 · `yokohama-chinatown/chinatown-hangout` | Usare M6: lettura dolci-cinesi, con gli inviti alternativi già previsti. |
| libro "Esplorando Nakano" o invito Futaba (Eremita) 9 ottobre | 1 · `nakano/nakano-broadway` | Usare M6: lettura esplorando-nakano oppure invito registrato futaba/10-09. |
| libro "Santuari di Tokyo" o invito Ann (Amanti) 5 agosto | 1 · `meiji-shrine/meiji-shrine-hangout` | Usare M6: lettura santuari-di-tokyo oppure invito registrato ann/08-06. La data della frase è superata. |
| libro "Un acquario al giorno" o invito Akechi (Giustizia) del 28-29 luglio | 1 · `shinagawa/shinagawa-acquario` | Usare M6: lettura un-acquario-al-giorno oppure invito registrato akechi/07-29; non un intervallo 28–29 luglio. |
| libro "Vague" o invito di Mishima (3 agosto) | 1 · `harajuku/harajuku-hangout` | Usare M6: lettura vague oppure invito registrato ryuji/05-29. Il riferimento storico a Mishima è superato dalla fonte di M6. |
| nessun requisito | 1 · `shibuya/triple-seven` | Nessun requisito proprio: lasciare nota/condizioni vuote, con presenza ereditata dalla sede. |
| nessun requisito per il lavoro | 1 · `shibuya/ore-no-beko` | Nessun requisito del lavoro deducibile dalla frase; non aggiungere condizioni alla sede. |
| richiesta Memento "I vincitori non imbrogliano" completata, poi confronto con l'Ombra di Shinya dal 4 settembre; Confidente attivo dal 5 settembre | 1 · `akihabara/sala-giochi-akihabara` | Nota su Shinya: Richiesta/evento del Confidente non devono chiudere tutta la sala giochi. |

## negozio.sblocco

35 righe, 18 frasi distinte.

| Frase storica | Righe e chiavi | Proposta non applicata |
|---|---|---|
| Dal primo settembre, dopo aver letto il libro Pagine ammuffite (Libreria Hinokuniya di Shinjuku) | 1 · `libreria-nagiuri` | Usare lo sblocco della sede (Hifumi rango 4 oppure lettura pagine-ammuffite); il 1 settembre è vendita del libro. |
| Disponibile da quando si sblocca Akihabara | 2 · `super-baron`, `gachapon-akihabara` | Usare la sede e il quartiere strutturati di L5/L6; non duplicare una condizione sul negozio. |
| Disponibile da quando si sblocca Kichijoji | 1 · `tempio-kichijoji` | Usare la sede e il quartiere strutturati di L5/L6; non duplicare una condizione sul negozio. |
| Disponibile da quando si sblocca Shinjuku | 4 · `hinokuniya`, `fioraio-sukebe`, `mran-mran`, `crossroads` | Usare la sede e il quartiere strutturati di L5/L6; non duplicare una condizione sul negozio. |
| Disponibile dal 12 giugno | 1 · `mercante-sakai` | Usare le 16 finestre della sede già definite in M6, non il solo inizio 06-12. |
| Disponibile dal 15 aprile, con l'avvio del Confidente di Takemi (Arcano Morte) | 1 · `clinica-takemi` | Già corretto da M6: sede dal 04-16; Tae dal 04-18. La frase storica 15 aprile non prevale. |
| Disponibile dal 18 aprile | 8 · `37-gradi-celsius`, `prossimo-asso`, `fiorista-rafflesia`, `big-bang-burger`, `libreria-taiheido`, `discount-rocinante`, `farmacia-aohige`, `triple-seven` | Confrontare con sblocco della sede e disponibilità strutturate già presenti. Data della frase come proposta, mai da applicare sopra le condizioni esistenti. |
| Disponibile dal 2 settembre | 2 · `akindo`, `tokobushiya` | Confrontare con sblocco della sede e disponibilità strutturate già presenti. Data della frase come proposta, mai da applicare sopra le condizioni esistenti. |
| Disponibile dal 5 giugno, quando si sblocca Kichijoji | 4 · `friggitoria-hagoromo`, `street-food-houraku`, `mealport`, `penguin-sniper` | Usare la sede e il quartiere strutturati di L5/L6; non duplicare una condizione sul negozio. |
| Disponibile dal 9 ottobre; non disponibile in caso di pioggia | 1 · `venditore-patate-dolci` | Sede dal 10-09 e orari/meteo non-piove separati; non spostare tutto sulle condizioni del negozio. |
| Disponibile dal primo ottobre: richiede il Laptop rotto (Yumenoshima, in vendita dal primo settembre) riparato con il Set di strumenti da PC (Akiba, Akihabara) | 1 · `tanaka-affari-loschi` | Proposta da chiarire: articolo laptop riparato/evento equivalente; comprare il laptop e gli strumenti non prova la riparazione. |
| Disponibile dal primo settembre | 1 · `akiba` | Confrontare con sblocco della sede e disponibilità strutturate già presenti. Data della frase come proposta, mai da applicare sopra le condizioni esistenti. |
| Disponibile dalla domenica 5 giugno, quando si sblocca Kichijoji | 3 · `vestiti-usati-kichijoji`, `stoneon`, `cartoleria-mitsubachi` | Usare la sede e il quartiere strutturati di L5/L6; non duplicare una condizione sul negozio. |
| Durante l'arco del Palazzo di Niijima (Casinò) | 1 · `negozio-palazzo-niijima` | Usare la presenza del Palazzo/sede; non sostituire la finestra finita con arco, che non ha fine. |
| Richiede il Rango Confidente Gemelle 3 (sblocco dell'Isolamento) | 1 · `mantra-ganda` | Usare la sede: confidente gemelle rango 3. |
| Solo dal lunedì al venerdì, di sera; non disponibile in caso di pioggia | 1 · `venditore-ambulante` | Orari: lunedi–venerdi, fascia sera, meteo non-piove. Non sono prerequisiti di sblocco. |
| Solo la domenica | 1 · `chiesa-kanda` | Orari: giorno-settimana [domenica]; apertura della sede separata. |
| Solo la domenica, in date selezionate (prima offerta il 24 aprile) | 1 · `home-shopping-tv` | Date delle offerte nei singoli articoli: non basta una generica domenica dal 04-24. |

## attivita.sblocco

21 righe, 17 frasi distinte.

| Frase storica | Righe e chiavi | Proposta non applicata |
|---|---|---|
| 5 giugno, evento con Ryuji Sakamoto | 1 · `freccette` | Proposta: data dal 06-05, salvo lo sblocco già presente sulla sede; l'evento narrativo resta nota. |
| 6 luglio (evento con Ryuji), oppure leggendo il libro 'Vedetta lacustre' | 1 · `pesca-ichigaya` | Ereditare il laghetto e le sue vie lettura/invito; non aggiungere data 07-06 come via autonoma. |
| Confidente di Ichiko Ohya avviato; Gentilezza Rango 3; Perizia Rango 3 | 1 · `lavoro-crossroads` | Proposta: TUTTE(confidente ohya rango 1, gentilezza rango 3, perizia rango 3). |
| Dal 1 settembre | 5 · `videogioco-punch-ouch`, `videogioco-train-of-life`, `videogioco-power-intuition`, `videogioco-golfer-sarutahiko`, `videogioco-featherman-seeker` | La vendita non equivale al possesso del gioco: verificare la condizione articolo e i dati già strutturati; non convertire la sola data. |
| Dal 18 aprile, interagendo con la sedia tra scrivania e letto (dopo aver pulito la mansarda) | 1 · `allenamento-camera-leblanc` | Proposta: TUTTE(data dal 04-18, evento mansarda-pulita). |
| Dal 26 luglio | 1 · `videogioco-gambla-goemon` | Verificare possesso/acquisto del gioco: non usare la data di vendita come unico requisito per giocarci. |
| Dal 6 giugno | 1 · `tempio-vecchio-kichijoji` | Proposta: data dal 06-06, con sede e orari già separati. |
| Disponibile fino al 20 maggio secondo allgamestaff.it (poi sostituito da altre attivita in biblioteca) | 1 · `studio-biblioteca-scuola` | Proposta da verificare: intervallo 04-11–05-20; la frase fornisce solo la fine, non approva automaticamente l'inizio. |
| Fascino Rango 2 | 1 · `lavoro-rafflesia` | Proposta: dote fascino rango 2, sul lavoro. |
| Guardiano: Perizia Rango 4; Boss: dopo cattura del Guardiano, Perizia Rango 5 | 1 · `sfida-pesca-guardiano-ichigaya` | Non appiattire: due sfide con requisiti diversi, compresa una cattura non rappresentata dal solo rango Perizia. Nota finché la proprietà è definita. |
| Incluso nel Set per retrogaming (Negozio usati Yumenoshima, Yongen-Jaya, dal 5 giugno) | 1 · `videogioco-star-forneus` | Proposta: possesso dell'articolo del Set per retrogaming, scelto per chiave; data di vendita come nota. |
| Legato al Confidente dell'Eremita (Takemi) | 1 · `esperimenti-clinici-takemi` | Riferimento ambiguo: Takemi è Morte, non Eremita. Non convertire prima di chiarire l'effetto richiesto. |
| Legato al Confidente della Torre (Shinya Oda); avviabile dal 4 settembre tramite la richiesta Mementos 'I baro non vincono mai' | 1 · `sala-giochi-gun-about-akihabara` | Separare sala giochi e Confidente Shinya. Non ricavare un requisito dell'attività dai soli eventi narrati. |
| Rango 4 del Confidente di Sojiro | 1 · `curry-leblanc` | Proposta: confidente sojiro rango 4. |
| Rango 5 di Ryuji oppure Rango 8 di Ann | 1 · `allenamento-palestra-protein-lovers` | Usare lo sblocco della sede: O(ryuji rango 5, ann rango 8). |
| Rango Confidente 4 con Akechi; disponibile dal 26 giugno | 1 · `jazz-club-kichijoji` | Usare lo sblocco della sede: akechi rango 4. Data di prima disponibilità come nota. |
| Tre sfide progressive: Comet Burger (Coraggio/Conoscenza/Perizia Rango 2), Gravity Burger (Rango 3), Cosmo Town Burger (Rango 4) | 1 · `sfida-big-bang-burger` | Tre sfide distinte: doti rango 2/3/4 sugli articoli delle sfide, non un blocco unico dell'attività. |

## articolo.condizione

106 righe, 73 frasi distinte.

| Frase storica | Righe e chiavi | Proposta non applicata |
|---|---|---|
| 150 punti negozio | 1 · `vestiti-usati-kichijoji/cintura-di-idaten` | Proposta: punti-negozio, negozio vestiti-usati-kichijoji, almeno 150. |
| 50 punti negozio | 1 · `vestiti-usati-kichijoji/cesta-di-vestiti` | Proposta: punti-negozio, negozio vestiti-usati-kichijoji, almeno 50. |
| Rango Confidente 1 | 2 · `clinica-takemi/takemedic-all`, `clinica-takemi/takemedic-all-v` | Proposta: confidente takemi rango 1; apertura della sede separata. |
| Rango Confidente 10 | 4 · `clinica-takemi/reviv-all`, `clinica-takemi/rinnov-all`, `clinica-takemi/unguento-magico`, `clinica-takemi/unguento-fisico` | Proposta: confidente takemi rango 10; apertura della sede separata. |
| Rango Confidente 3 | 3 · `clinica-takemi/iv-100`, `clinica-takemi/kajaclear-r`, `clinica-takemi/kundaclear-r` | Proposta: confidente takemi rango 3; apertura della sede separata. |
| Rango Confidente 5 | 2 · `clinica-takemi/unguento-vitale`, `clinica-takemi/takemedic-all-z` | Proposta: confidente takemi rango 5; apertura della sede separata. |
| Rango Confidente Sojiro 10, rango massimo | 1 · `leblanc/maestria-del-curry` | Proposta: confidente sojiro rango 10. |
| Rango Confidente Sojiro 2 | 1 · `leblanc/principi-del-caffe` | Proposta: confidente sojiro rango 2. |
| Rango Confidente Sojiro 4 | 1 · `leblanc/curry-del-leblanc` | Proposta: confidente sojiro rango 4. |
| Rango Confidente Sojiro 6 | 1 · `leblanc/maestria-del-caffe` | Proposta: confidente sojiro rango 6. |
| Rango Confidente Sojiro 9, richiede il completamento della richiesta Lo zio ingordo | 1 · `leblanc/precetti-del-curry` | Proposta: confidente sojiro rango 9 e Richiesta citata, da selezionare per chiave. |
| Scambio con Sakai a Kichijoji, barattando un Panino con Yakisoba | 1 · `mercante-sakai/veste-nera` | Nota sul baratto: possesso richiesto e consumo sono cose distinte; non trasformare la frase in consumo automatico. |
| disponibile solo dal 28 agosto al 10 ottobre | 1 · `discount-rocinante/wafer-dei-ladri` | Proposta: intervallo 08-28–10-10. |
| domenica 1 maggio | 1 · `home-shopping-tv/military-ration-set-muscle-workout-set` | Proposta: intervallo di un solo giorno nella data indicata; il giorno della settimana è descrittivo, non una disponibilità di tutte le domeniche. |
| domenica 11 dicembre | 1 · `home-shopping-tv/super-detox-set-fancy-magatama-set` | Proposta: intervallo di un solo giorno nella data indicata; il giorno della settimana è descrittivo, non una disponibilità di tutte le domeniche. |
| domenica 13 novembre | 1 · `home-shopping-tv/instant-spray-set-meditative-set` | Proposta: intervallo di un solo giorno nella data indicata; il giorno della settimana è descrittivo, non una disponibilità di tutte le domeniche. |
| domenica 14 agosto | 1 · `home-shopping-tv/drink-set-floral-gift-set` | Proposta: intervallo di un solo giorno nella data indicata; il giorno della settimana è descrittivo, non una disponibilità di tutte le domeniche. |
| domenica 15 gennaio | 1 · `home-shopping-tv/lucky-worker-bag-lucky-muscle-bag` | Proposta: intervallo di un solo giorno nella data indicata; il giorno della settimana è descrittivo, non una disponibilità di tutte le domeniche. |
| domenica 15 maggio | 1 · `home-shopping-tv/allergy-relief-pack-cosmetic-cure-gift` | Proposta: intervallo di un solo giorno nella data indicata; il giorno della settimana è descrittivo, non una disponibilità di tutte le domeniche. |
| domenica 19 giugno | 1 · `home-shopping-tv/supportive-gift-set-busy-revival-set` | Proposta: intervallo di un solo giorno nella data indicata; il giorno della settimana è descrittivo, non una disponibilità di tutte le domeniche. |
| domenica 2 ottobre | 1 · `home-shopping-tv/pumpkin-ghost-set-haunted-repel-set` | Proposta: intervallo di un solo giorno nella data indicata; il giorno della settimana è descrittivo, non una disponibilità di tutte le domeniche. |
| domenica 22 gennaio | 1 · `home-shopping-tv/talisman-set-sweet-delight-set` | Proposta: intervallo di un solo giorno nella data indicata; il giorno della settimana è descrittivo, non una disponibilità di tutte le domeniche. |
| domenica 22 maggio | 1 · `home-shopping-tv/muscle-plus-set-outdoors-kit` | Proposta: intervallo di un solo giorno nella data indicata; il giorno della settimana è descrittivo, non una disponibilità di tutte le domeniche. |
| domenica 24 aprile | 1 · `home-shopping-tv/spring-awake-set-share-of-spring-set` | Proposta: intervallo di un solo giorno nella data indicata; il giorno della settimana è descrittivo, non una disponibilità di tutte le domeniche. |
| domenica 25 settembre | 1 · `home-shopping-tv/phantom-thief-set-2-phantom-thief-fun-set` | Proposta: intervallo di un solo giorno nella data indicata; il giorno della settimana è descrittivo, non una disponibilità di tutte le domeniche. |
| domenica 26 giugno | 1 · `home-shopping-tv/dark-power-set-cursed-tools-set` | Proposta: intervallo di un solo giorno nella data indicata; il giorno della settimana è descrittivo, non una disponibilità di tutte le domeniche. |
| domenica 27 novembre | 1 · `home-shopping-tv/ishiyaki-potato-set-limited-sweets-set` | Proposta: intervallo di un solo giorno nella data indicata; il giorno della settimana è descrittivo, non una disponibilità di tutte le domeniche. |
| domenica 29 gennaio | 1 · `home-shopping-tv/energetic-set-delicious-revival-set` | Proposta: intervallo di un solo giorno nella data indicata; il giorno della settimana è descrittivo, non una disponibilità di tutte le domeniche. |
| domenica 29 maggio | 1 · `home-shopping-tv/japanese-gift-set-folding-screen-set` | Proposta: intervallo di un solo giorno nella data indicata; il giorno della settimana è descrittivo, non una disponibilità di tutte le domeniche. |
| domenica 3 luglio | 1 · `home-shopping-tv/body-building-set-calm-mind-set` | Proposta: intervallo di un solo giorno nella data indicata; il giorno della settimana è descrittivo, non una disponibilità di tutte le domeniche. |
| domenica 6 novembre | 1 · `home-shopping-tv/sturdy-ointment-set-inner-muscle-set` | Proposta: intervallo di un solo giorno nella data indicata; il giorno della settimana è descrittivo, non una disponibilità di tutte le domeniche. |
| domenica 7 agosto | 1 · `home-shopping-tv/phantom-thief-set-heroic-set` | Proposta: intervallo di un solo giorno nella data indicata; il giorno della settimana è descrittivo, non una disponibilità di tutte le domeniche. |
| domenica 8 maggio | 1 · `home-shopping-tv/relaxation-set-bio-nutrients-set` | Proposta: intervallo di un solo giorno nella data indicata; il giorno della settimana è descrittivo, non una disponibilità di tutte le domeniche. |
| dopo aver creato uno strumento di infiltrazione almeno una volta | 1 · `hinokuniya/abc-dell-artigianato` | Proposta: evento primo-strumento-creato. |
| dopo aver giocato a biliardo almeno una volta | 1 · `prossimo-asso/esperto-a-biliardo` | Proposta: attivita biliardo svolta almeno 1 volta. |
| dopo aver giocato a freccette almeno una volta | 1 · `hinokuniya/maestro-a-freccette` | Proposta: attivita freccette svolta almeno 1 volta. |
| dopo aver lavorato almeno una volta al negozio di fiori Rafflesia | 1 · `hinokuniya/enciclopedia-floreale` | Proposta: attivita lavoro-rafflesia svolta almeno 1 volta. |
| dopo aver letto tutti gli altri libri di Jinbocho | 1 · `libreria-nagiuri/comprendere-il-cuore` | Proposta: TUTTE delle letture dei libri di Jinbocho, per chiave ed escludendo questo libro; elenco da verificare prima della conversione. |
| dopo aver letto “Spadaccino provetto“ | 4 · `libreria-nagiuri/chiamami-capo`, `libreria-nagiuri/casanova-spregiudicato`, `libreria-nagiuri/rivelazioni-eroiche`, `libreria-nagiuri/come-fare-karakuri` | Proposta: lettura del libro Spadaccino provetto, selezionato per chiave. |
| dopo essere andati a pescare a Ichigaya almeno una volta | 1 · `hinokuniya/lo-zen-della-pesca` | Proposta: attivita pesca-ichigaya svolta almeno 1 volta. |
| dopo essere andati al cinema o aver visto un DVD almeno una volta | 1 · `hinokuniya/anima-da-cineasta` | Proposta: contatore film-completati almeno 1. |
| dopo essere stati almeno una volta alle gabbie di battuta | 1 · `hinokuniya/la-scienza-del-baseball` | Proposta: attivita centro-battute-yongen-jaya svolta almeno 1 volta. |
| dopo il completamento di un videogioco | 1 · `hinokuniya/segreti-di-gioco` | Proposta: contatore videogiochi-completati almeno 1. |
| grado Caos (spendere oltre 100.000 yen) | 3 · `tanaka-affari-loschi/model-gun`, `tanaka-affari-loschi/homunculus`, `tanaka-affari-loschi/crown-of-salvation` | Proposta: rango-cliente, negozio tanaka-affari-loschi, rango caos; soglia dal programma del negozio, non dalla frase. |
| grado Nero (spendere oltre 10.000 yen) | 1 · `tanaka-affari-loschi/black-robe` | Proposta: rango-cliente, negozio tanaka-affari-loschi, rango nero. |
| grado Oscurità (spendere oltre 50.000 yen) | 3 · `tanaka-affari-loschi/black-kogatana`, `tanaka-affari-loschi/holy-cloth`, `tanaka-affari-loschi/ouija-board` | Proposta: rango-cliente, negozio tanaka-affari-loschi, rango oscuro. |
| in vendita anche da Jose nei Memento | 1 · `untouchable/kogatana-nera` | Nota di provenienza/assortimento, nessun nuovo blocco. |
| rango cliente Caos | 2 · `tanaka-affari-loschi/dispel-ring`, `tanaka-affari-loschi/roland-medal` | Proposta: rango-cliente, negozio tanaka-affari-loschi, rango caos; soglia dal programma del negozio, non dalla frase. |
| rango cliente Iniziale | 3 · `tanaka-affari-loschi/nirvana-ring`, `tanaka-affari-loschi/black-stone`, `tanaka-affari-loschi/condenser-lens` | Proposta: rango-cliente, negozio tanaka-affari-loschi, rango iniziale. |
| rango cliente Nero | 2 · `tanaka-affari-loschi/hercules-anklet`, `tanaka-affari-loschi/heros-eyepatch` | Proposta: rango-cliente, negozio tanaka-affari-loschi, rango nero. |
| rango cliente Oscuro | 3 · `tanaka-affari-loschi/magic-rosary`, `tanaka-affari-loschi/atom-match`, `tanaka-affari-loschi/retribution-mirror` | Proposta: rango-cliente, negozio tanaka-affari-loschi, rango oscuro. |
| richiede Coraggio Rango 2, Conoscenza Rango 2 e Perizia Rango 2 | 1 · `big-bang-burger/sfida-comet-burger` | Proposta: TUTTE(dote coraggio rango 2, conoscenza stesso rango, perizia stesso rango). |
| richiede Coraggio Rango 3, Conoscenza Rango 3 e Perizia Rango 3 | 1 · `big-bang-burger/sfida-gravity-burger` | Proposta: TUTTE(dote coraggio rango 3, conoscenza stesso rango, perizia stesso rango). |
| richiede Coraggio Rango 4, Conoscenza Rango 4 e Perizia Rango 4 | 1 · `big-bang-burger/sfida-cosmo-tower-burger` | Proposta: TUTTE(dote coraggio rango 4, conoscenza stesso rango, perizia stesso rango). |
| richiede Fascino Rango 2 | 3 · `venditore-ambulante/specchio-della-vendetta`, `venditore-ambulante/portafortuna-a-croce`, `venditore-ambulante/portafortuna-a-teschio` | Proposta: dote fascino rango 2. |
| richiede Fascino Rango 3 | 4 · `venditore-ambulante/cintura-rakshasa`, `venditore-ambulante/cintura-vajra`, `venditore-ambulante/cintura-skanda`, `venditore-ambulante/specchio-del-rimbalzo` | Proposta: dote fascino rango 3. |
| richiede Fascino Rango 5 | 3 · `venditore-ambulante/anello-del-vento`, `venditore-ambulante/piastrina-incisa`, `venditore-ambulante/specchio-di-rappresaglia` | Proposta: dote fascino rango 5. |
| richiede rango massimo del Confidente Haru, Imperatrice | 1 · `big-bang-burger/panino-supernova` | Proposta: confidente haru rango 10. |
| rifornimento il lunedi successivo | 2 · `body-chop/olio-del-recupero`, `body-chop/aroma-rinfrescante` | Nota sul rifornimento, non giorno esclusivo di vendita. |
| scambio con Panino supernova | 1 · `mercante-sakai/elisir-del-padre` | Nota sul baratto: possesso richiesto e consumo sono cose distinte; non trasformare la frase in consumo automatico. |
| scambio con Proteine d'importazione | 1 · `mercante-sakai/frusta-decorativa` | Nota sul baratto: possesso richiesto e consumo sono cose distinte; non trasformare la frase in consumo automatico. |
| sempre acquistabile, oggetto selezionato casualmente | 1 · `untouchable/razione-militare` | Nota di provenienza/assortimento, nessun nuovo blocco. |
| sempre disponibile | 1 · `prossimo-asso/collana-magnetica` | Nessun requisito proprio (da-subito o elenco vuoto); presenza del negozio separata. |
| solo il venerdi | 1 · `negozio-scolastico/panino-con-yakisoba` | Proposta: giorno-settimana, giorni [venerdi]. |
| solo in autunno | 1 · `big-bang-burger/panino-lunare` | Proposta: stagione autunno. |
| solo in estate | 2 · `triple-seven/soba-calmante`, `panetteria-yon-germain/melon-pan` | Proposta: stagione estate. |
| solo in inverno | 2 · `taisho-store/crostatina-angelo`, `venditore-patate-dolci/yaki-imo-leggendario` | Proposta: stagione inverno. |
| solo in primavera | 1 · `big-bang-burger/panino-terrestre` | Proposta: stagione primavera. |
| solo la domenica | 2 · `chiesa-kanda/vino-della-grazia`, `chiesa-kanda/acqua-battesimale` | Proposta: giorno-settimana, giorni [domenica]. |
| solo la domenica sera | 1 · `friggitoria-hagoromo/katsu-a-pezzettoni` | Proposta: TUTTE(giorno-settimana [domenica], fascia sera). |
| solo la domenica, salvo eccezioni (rotazione settimanale fissa) | 1 · `chiosco-kiyasuku/succo-aojiru` | Da chiarire la rotazione e le eccezioni: non convertire in tutte le domeniche senza conferma. |
| solo nei giorni di pioggia | 2 · `taisho-store/natto-rugiadoso`, `prossimo-asso/frullato-iperproteico` | Proposta: piove. |
| solo se la mansarda del Leblanc non viene pulita (altrimenti si ottiene dopo aver pulito la mansarda del Leblanc, dal 18 aprile) | 2 · `libreria-taiheido/il-pensiero-sociale`, `libreria-taiheido/esplorando-yoncha-4` | Non convertire alla cieca: due vie di ottenimento diverse. La pulizia è evento mansarda-pulita, ma non è un blocco unico della vendita. |

## Decisione ancora necessaria

L'approvazione riguarda solo le proposte che richiedono una futura conversione, dopo il confronto con p5s. Le righe già trattate da L5/M6 non richiedono una seconda migrazione; le note di contesto restano note. Nessun consenso è stato presunto e nessuna proposta è dichiarata verificata nel gioco.
