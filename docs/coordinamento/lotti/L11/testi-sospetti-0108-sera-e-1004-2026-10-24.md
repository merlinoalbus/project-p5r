# I due testi sospetti di M-B: 1/8 sera e 4/10 Okumura (2026-10-24)

Richiesta del PM, dopo la decisione dell'utente su Shido (resta il testo). Sola lettura, nessun commit. Dati: copia di p5s migrata fino alla 210. **Nessuna delle due voci è nel diario validato** (04-01..06-01): la correzione non tocca il validato.

## 1. In breve

- **08-01 sera (`62284ab3`)**: il testo è sbagliato su tutte le fonti. La guida italiana mette la serata al **Leblanc a finire il DVD «Prison Escape» (2/2)**; il Royal non ha il Palazzo l'1/8. Correzione proposta: **voce da «Palazzo» a «DVD Prison Escape (2/2)»**, certezza **alta** (guida verbatim). Conseguenza per M-B: i legami 06–09 passano alla voce del giorno, che copre 01–09.
- **10-04 Okumura (`c66a02b6`)**: il testo si ferma alla Linea di smaltimento, ma la guida fa fare **nella stessa visita** anche Fabbrica centrale, Interscambio e Produzione armamenti. Correzione proposta: **aggiungere i tre nomi**, certezza **alta**.
- **Segnalazione di calendario, non di testo:** per Futaba e per Okumura le date dei Palazzi della guida italiana **non coincidono con il Royal** (§4). Non è una correzione di queste due voci: è una domanda per l'utente.
- **Un effetto collaterale** sul 27/7 sera (stesso DVD, §2.4).

## 2. 08-01 sera

### 2.1 Testo attuale
- Voce `62284ab35f052e4dc2bb16daf3b09233`, 08-01, sera, ordine 0: «Proseguire l'esplorazione del palazzo in una sessione prolungata»; riferimento `dungeon:futaba`; nessuna nota; `produce_json` vuoto; proposta M-B: aree 06–09.
- Le altre voci dell'1/8: giorno 0 «Clinica Takemi: comprare Adesivi SP 3» e giorno 1 `f5e781ca` «Palazzo di Futaba: esplorazione del dungeon…». Evento di calendario 76: «Giornata interamente dedicata al Palazzo di Futaba (Tesoro)» (fonte AGS settimana 17).

### 2.2 Che cosa dicono le fonti
| Fonte | Che cosa dice dell'1/8 |
|---|---|
| **Guida italiana** (settimana 17 e pagina del Palazzo di Futaba, verbatim) | Giorno: le nove sezioni del Palazzo (Entrata… Camera del santuario), poi Stanza di Velluto («Cuori in fiamme») e uscita dal Palazzo; «completare l'intero dungeon in una volta sola». **Sera:** «Per la nostra serata, avremo un po' di tempo libero. Non possiamo lasciare il Leblanc, quindi decidiamo di passare il nostro tempo a finire il DVD "Prison Escape"», «Perizia +3», «Progressi del DVD: Prison Escape (2/2) – Completato». «Sessione prolungata» **non compare** in nessun testo letto. |
| **Samurai Gamers** (agosto, verbatim fino all'8/22) | Giorno: noleggio DVD a Shibuya («The Running Dead» restituito, «Rent 31»), acquisti SP al Leblanc. **Sera: Shinjuku, Ohya.** Nessun Palazzo. |
| **ACE** (verbatim 8/01–8/03) | Giorno: «Emperor Invite Leblanc», Chariot Rank 9; **sera: Star Rank 3**. Nessun Palazzo, Tesoro o boss. |

### 2.3 Correzione proposta
| Campo | Prima | Dopo |
|---|---|---|
| `azione` | Proseguire l'esplorazione del palazzo in una sessione prolungata | **Guardare il DVD Prison Escape (2/2)** |
| `note` | — | Perizia +3. Serata libera al Leblanc. |
| `riferimento` | `dungeon:futaba` | `film:dvd-prison-escape` (il film esiste, 2 sessioni) |
| `produce_json` | `[]` | come le visioni DVD del Diario (es. 07-12 Betty «2/2»): `lettura film dvd-prison-escape` |
| legami M-B | 06, 07, 08, 09 | **nessuno** (voce non più di Palazzo) |

**Certezza: alta** per la guida (frase verbatim, due pagine concordi); il Royal **non la contraddice per il Palazzo** (non c'è) ma ha un'altra serata (SG: Ohya a Shinjuku; ACE: Hifumi rango 3), e le due fonti Royal discordano fra loro.

**Perché la guida e non il Royal per la serata:** il Diario tiene il Palazzo di Futaba all'1/8 e al 3/8 secondo la guida (voce del giorno, evento 76, voce del 3/8, e su questo si è deciso l'invito di Makoto al 4/8). Una serata presa dal Royal (Ohya o Hifumi) sarebbe incoerente con la giornata. Se l'utente deciderà di allineare l'intero calendario al Royal (§4), la voce si rifà insieme alle altre.

**Legami della voce del giorno** (`f5e781ca`, per BE/M-B): da aree 01–05 a **01–09** (la guida mette le nove aree sotto un solo giorno e non ha il taglio giorno/sera). Il testo del giorno non cambia.

### 2.4 Effetto collaterale: 27/7 sera
La voce del 27/7 sera «Guardare il DVD Prison Escape» (Perizia +3) ha `lettura film dvd-prison-escape` senza passo («almeno» nullo, cioè visione completa). La guida dice che il 27/7 è la **prima** visione («Progressi del DVD: Prison Escape (1/2) – In corso», «Perizia +3» anche lì) e l'1/8 la seconda. Con la correzione dell'1/8 il film si «completerebbe» due volte. Proposta: il 27/7 diventa «Guardare il DVD Prison Escape (1/2)» con `lettura … almeno 1`, come Betty 07-10; certezza **alta** (guida settimana 16 verbatim). È una voce a parte (non validata): va decisa insieme.
Nota sul valore: la guida dice «Perizia +3» a ogni visione; l'effetto del film nel database è «Perizia +2» (`dvd-prison-escape`, `effetti_json`): non è parte di questo giro, ma è un'altra discordanza guida/DB.

## 3. 10-04 Okumura

### 3.1 Testo attuale
Voce `c66a02b66d02f21793e1f8e0d2f08798`, 04-10, giorno, ordine 3, `dungeon:okumura`: «Palazzo di Okumura: infiltrazione estesa (entrata laterale con mini-boss Fidanzato di Haru + 2 Servobot MDL-WKR, ingresso di Haru/Noir nel gruppo, corridoi del complesso, porta biometrica, Caserma con il Robot capufficio debole al Vento, dintorni del complesso, Linea Esportazioni, Linea di produzione con le presse temporizzate, Linea di smaltimento)». Nessuna nota. Il 10/4 ha altre tre voci di giorno (Biblioteca, Chihaya, Untouchable) e nessuna di sera. Evento di calendario 103 (10/4, «Prima infiltrazione nel Palazzo di Okumura. Haru Okumura si unisce ufficialmente al gruppo»). Proposta M-B: aree 01–10.

### 3.2 Che cosa dicono le fonti
| Fonte | Che cosa dice |
|---|---|
| **Guida italiana** (settimana 25 e pagina del Palazzo di Okumura, indice e corpo verbatim) | Il 4/10 le dieci sezioni **in una sola visita**: 4.1.1 Entrata laterale … 4.1.7 Linea di smaltimento, **4.1.8 Fabbrica centrale** («saliamo in ascensore fino a una nuova area»), **4.1.9 Interscambio** («utilizziamo l'ascensore per raggiungere l'Interscambio»), **4.1.10 Produzione armamenti** («usciamo e percorriamo la rampa a nord»). Nessun «domani» o «giorno dopo» nelle sezioni; chiusura: «Dopo essere usciti dal Palazzo, torneremo al Leblanc, dove riceveremo un messaggio di gruppo». Il riquadro avverte che dopo l'uscita non c'è molto tempo per prepararsi e che il boss «sarà domani». L'ingresso di Haru: «si unirà ufficialmente al party», dopo il mini-boss, sotto Corridoi del complesso. Sera del 4/10: Leblanc, Kawakami, Sojiro, nessun Palazzo. **5/10**: lettera di sfida e strumenti di infiltrazione al Leblanc, nessun Palazzo. **6/10**: «infiltrarci nuovamente», «ultima Safe Room (Produzione armamenti)», Tesoro e boss. |
| **Samurai Gamers** | Nessun Okumura in ottobre: 10/4 Takemi e Sojiro, 10/5 libro e Futaba, 10/6 Shinya (verbatim). Il Palazzo è in settembre; unica traccia di ottobre il trofeo «Spaceport of Greed Obliterated» all'11/10. La sua guida del Palazzo non ha date: due fasi (Side Entrance → Facility Passageway; poi Barracks … Weapon Production Area). |
| **ACE** (riassunto, non verbatim) | «Spaceport Palace > Reach treasure» il 9/23; nessun Palazzo il 4–7/10. |

### 3.3 Correzione proposta
| Campo | Prima | Dopo |
|---|---|---|
| `azione` | …, Linea di produzione con le presse temporizzate, Linea di smaltimento) | …, Linea di produzione con le presse temporizzate, Linea di smaltimento, Fabbrica centrale, Interscambio, Produzione armamenti) |
| legami M-B | 01–10 | **01–10, senza cambiamenti** (ora testo e legami coincidono) |

Aggiungo solo i tre nomi delle aree; non invento altri dettagli. **Certezza: alta** (indice e testo della guida verbatim).

**Evento 103:** il titolo dice «**Prima** infiltrazione nel Palazzo di Okumura», ma la guida ha già un'infiltrazione il 15/9 («Entrata laterale»; «Indaga sulla Splendida ladra») e la visita del 4/10 è la seconda. Proposta (certezza **media**: la guida non usa «prima/seconda»): «Infiltrazione estesa nel Palazzo di Okumura». Il dettaglio («Haru Okumura si unisce ufficialmente al gruppo») è confermato.

## 4. Segnalazione di calendario (non di testo)

Per entrambe le voci la **guida italiana e il Royal non collocano il Palazzo negli stessi giorni**:
- **Futaba:** guida 25/7, 1/8, 3/8; Royal: SG 1ª infiltrazione 7/25, ACE «Reach treasure» 7/26 e «Take treasure» 7/27, completamento richiesto il 7/30.
- **Okumura:** guida 15/9, 4/10, 6/10; Royal: nessun Palazzo in ottobre (SG), ACE tesoro 9/23 (riassunto).
Il Diario segue la guida e la decisione dell'invito di Makoto al 4/8 si basa sul completamento del Palazzo il 3/8. Applicare «prevale Royal» ai giorni dei Palazzi sposterebbe voci, eventi e inviti: è una scelta di calendario per l'utente, non una correzione da fare in questo giro. Le due correzioni qui sopra sono valide **in entrambi i casi** perché si riferiscono a ciò che la guida dice di quel giorno.

## 5. Come scriverle (per BE)

Una migrazione come la 200 e la 204 (correzione di testo con guardie sull'uid, sulla data e sul **testo attuale**, testo precedente in `testo_precedente_json`, impronta di `voce_giornata` per le altre righe uguale prima e dopo): voce 62284ab3 (azione, note, riferimento, produce), voce f5e781ca (solo i legami M-B), voce c66a02b6 (azione), evento 103 (titolo). Il segno «da rivedere» resta a decisione del PM (le due correzioni sono provate dalla guida). Nessuna spunta delle partite: nella copia nessuna riga di p1 o p2 cita i due uid (la ricerca su tutte le colonne di `gioco.db` e `partite.db` trova solo proposta M-B, effetto di transizione ed evento di calendario).

## 6. Limiti

- Guida: i corpi delle sezioni sono letti verbatim con la tecnica a tratti (offset); i riassunti automatici delle pagine si sono rivelati sbagliati in più punti e **non sono stati usati**.
- SG e ACE: ACE verbatim solo fino all'8/5 (e 8/01–8/03 letti verbatim in questo giro); le date di ACE per ottobre vengono da un riassunto.
- Non ho verificato il Royal per il numero di visioni del DVD (la fonte è la guida italiana).
