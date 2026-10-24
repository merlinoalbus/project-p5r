# L7 — riscontro delle 97 voci «da-riscontrare» (raccordi delle fonti Jose e Scambi)

Analisi dati, 2026-10-23, sola lettura. Incarico del PM: riscontrare le 97 voci `L7-NODO-*` di `pianoAtomico` (criterio: «esito motivato per
fonte, identità, costo, risultati, condizioni») con la copia di p5s e le fonti Royal. Le voci che toccano **BON-06/07/08** (Tanaka, abbinamenti, pannelli
del catalogo, migrazione 142 in arrivo) sono segnalate «in carico a BON-0x» e non chiuse.

## 1. Esito in una riga

| Gruppo (voci) | Coincide | Diverso | In carico BON-07 | In carico BON-08 |
|---|---:|---:|---:|---:|
| Scambi di Jose, `jose/scambi/0…36` (37) | **37** | 0 | 0 | 0 |
| Mercante Sakai, `oggetti-guida/scambi/0/offerte/0…15` (16) | **9** | **2** | 5 | 0 |
| Venditore ambulante, `…/scambi/1/offerte/0…9` (10) | **6** | 0 | 4 | 0 |
| Gachapon di Akihabara, `…/scambi/2/offerte/0…5` (6) | 0 | 0 | 6 | 0 |
| Tanaka, `…/scambi/3/offerte/0…3` (4) | 0 | 0 | 0 | 4 |
| Archivio sintetico di Jose, `…/scambi/4/offerte/0…23` (24) | **23** | **1** | 0 | 0 |
| **Totale 97** | **75** | **3** | **15** | **4** |

Nessuna voce «non decidibile». Nessuna scrittura su dati o servizi, nessun commit. Le 3 voci «diverso» non le correggo: sono nella proposta (§9).

## 2. Dati, fonti e limiti

- **Dati**: copia di p5s `dati-p5s/p5s-2026-10-23-1935Z/` (gioco schema 138) nella scratchpad, aperta in sola lettura. I 97 nodi sono quelli dell'inventario
  `inventario-atomico-L7.json` (fotografia del 22/10 20:23, schema 137); li ho **ricontrollati sulla copia del 23/10**: i 97 percorsi esistono ancora in
  `dati_guida.jose` (37 scambi) e `dati_guida.oggetti-guida.scambi` (5 gruppi, 60 offerte).
- **Che cosa ho confrontato** per ogni nodo: la riga della fonte (`dati_guida`) contro gli articoli di destinazione (`articolo`, `catalogo_oggetto`): nome (con il nome del
  catalogo per Jose), costo (`costo_json`), effetto, condizioni (`condizioni_json`). Poi la fonte contro le fonti Royal.
- **Fonti Royal** (guida AllGameStaff, lette il 23/10):
  - `scambi-oggetti-curiosi-venditori-nascosti/`: Sakai (16 finestre, oggetto dato e ricevuto), Venditore ambulante (articoli, prezzi, Fascino, giorni, pioggia), Gachapon (6 baratti);
  - `persona-5-royal-guida-ai-memento/`, sezione Jose: 37 articoli con Fiori e Dedalo; Nirvana e Ambra grigia come oggetti separati, ciascuno su **una** statistica;
  - `negozi-speciali/`: Jose e Tanaka. **Questa lettura è un riassunto del modello, non il testo integrale: certezza media.** La conferma di Jose viene dalla pagina dei Memento e da G-034 punto 7 (Esperto, alta).
  - Registro dell'Esperto: G-034 (Jose 37 giuste, Tanaka), G-031 (le 16 finestre del Sakai), G-029 (orari del Venditore ambulante).
- **Limiti**: «Coincide» vale per l'offerta e per le righe di destinazione indicate; non certifico le descrizioni degli effetti riga per riga oltre a quanto scritto
  qui. La pagina del Sakai **non dice** che stia a Kichijoji (lo dice G-031 da altre fonti). I «codici informativi» dell'inventario non sono bug né approvazioni.

## 3. Criteri di esito

- **Coincide**: fonte, identità (l'articolo è l'oggetto giusto), costo, risultati e condizioni dell'articolo corrispondono alla riga della fonte e alla guida; si può chiudere.
- **Diverso**: un dato dell'articolo o dell'archivio contraddice la guida; indico il valore corretto.
- **In carico a BON-0x**: l'esito dipende da ciò che BON-07 (87 proposte di abbinamento, omonimi del catalogo) o BON-08 (Tanaka, migrazione 142) sta cambiando. Do
  comunque i riscontri, ma la voce resta aperta.

## 4. Scambi di Jose (37 voci)

Tutte e 37: l'articolo `jose/<chiave>` del negozio `jose` ha il nome del catalogo uguale a quello della fonte, il costo in Fiori uguale, il requisito (Dedalo) nella nota e nella
condizione `evento:dedalo-<nome>-aperto`, e l'effetto della fonte nella nota. **Identica anche la guida**: 37 articoli, stessi nomi, stessi Fiori, stesso Dedalo, stesso ordine
(pagina dei Memento; G-034 punto 7). Le tre voci `Kogatana nera`, `Replica d'arma` e `Veste nera` (11–13) puntano a `materiale/…`, cioè agli oggetti mutageni per la
Trasmutazione, come dice la guida; gli omonimi del catalogo (`arma/kogatana-nera`, `protezione/veste-nera`) non c'entrano.

| Voce `jose/scambi/N` | Articolo | Fiori | Dedalo | Esito |
|---|---|---:|---|---|
| 0 | Fiala delle vertigini S | 30 | Aiyatsbus | **Coincide** |
| 1 | Fiala del Sonno S | 40 | Aiyatsbus | **Coincide** |
| 2 | Goccia dell'anima | 15 | Aiyatsbus | **Coincide** |
| 3 | Polvere d'anima | 75 | Aiyatsbus | **Coincide** |
| 4 | Kit energetico S | 80 | Aiyatsbus | **Coincide** |
| 5 | Carta bianca | 15 | Chemdah | **Coincide** |
| 6 | Fiala confusione S | 65 | Chemdah | **Coincide** |
| 7 | Fiala del sonno L | 40 | Chemdah | **Coincide** |
| 8 | Ambra grigia MA | 80 | Chemdah | **Coincide** |
| 9 | Ambra grigia AG | 80 | Chemdah | **Coincide** |
| 10 | Ambra grigia FO | 80 | Chemdah | **Coincide** |
| 11 | Kogatana nera | 30 | Chemdah | **Coincide** |
| 12 | Replica d'arma | 30 | Chemdah | **Coincide** |
| 13 | Veste nera | 30 | Chemdah | **Coincide** |
| 14 | Ambra grigia RS | 80 | Kaitul | **Coincide** |
| 15 | Ambra grigia FR | 80 | Kaitul | **Coincide** |
| 16 | Fiala delle vertigini L | 40 | Kaitul | **Coincide** |
| 17 | Fiala della paura S | 65 | Kaitul | **Coincide** |
| 18 | Idaten Ofuda | 70 | Akzeriyyuth | **Coincide** |
| 19 | Kongou Ofuda | 70 | Akzeriyyuth | **Coincide** |
| 20 | Rasetsu Ofuda | 70 | Akzeriyyuth | **Coincide** |
| 21 | Kit energetico L | 210 | Akzeriyyuth | **Coincide** |
| 22 | Anima da masticare | 170 | Akzeriyyuth | **Coincide** |
| 23 | Fiala confusione L | 70 | Akzeriyyuth | **Coincide** |
| 24 | Fiala dell'amnesia S | 30 | Akzeriyyuth | **Coincide** |
| 25 | Fiala della paura L | 70 | Adyeshach | **Coincide** |
| 26 | Fiala soggiogamento S | 70 | Adyeshach | **Coincide** |
| 27 | Nirvana FO | 80 | Adyeshach | **Coincide** |
| 28 | Nirvana AG | 80 | Adyeshach | **Coincide** |
| 29 | Nirvana RS | 80 | Adyeshach | **Coincide** |
| 30 | Nirvana MA | 80 | Adyeshach | **Coincide** |
| 31 | Nirvana FR | 80 | Adyeshach | **Coincide** |
| 32 | Pane per l'anima | 450 | Sheriruth | **Coincide** |
| 33 | Fiala dell'amnesia L | 40 | Sheriruth | **Coincide** |
| 34 | Fiala disperazione S | 100 | Sheriruth | **Coincide** |
| 35 | Soma | 520 | Da'at | **Coincide** |
| 36 | Fiala soggiogamento L | 90 | Da'at | **Coincide** |

## 5. Mercante Sakai (16 voci)

Le **16 finestre** dell'articolo (`intervallo`) sono uguali a quelle della fonte e a quelle della guida e di G-031: 16 su 16. Anche l'oggetto dato e quello ricevuto sono quelli della
guida in tutte le 16. Ciò che separa gli esiti è altro.

| Voce `…/scambi/0/offerte/N` | Finestra | Riceve ← dà (guida) | Costo e identità nel DB | Esito |
|---|---|---|---|---|
| 0 | 12/6–17/6 | Frusta decorativa ← Proteine d'importazione | ok; **effetto** dell'articolo = «Ottenuta in cambio di…» invece di «Arma per Ann: Fo +5» | **Diverso** (effetto) |
| 1 | 26/6–2/7 | Veste nera ← Panino con yakisoba | identità: l'articolo punta a `protezione/veste-nera`, la guida dice materiale mutageno (`materiale/veste-nera`); effetto = «secondo fonte non italiana» | **In carico BON-07** (omonimo) |
| 2 | 11/7–12/7 | Spada Koedo ← Soba calmante | ok | **Coincide** |
| 3 | 26/7–30/7 | La fattorizzazione ← Razione militare | **costo vuoto** (Razione militare è omonima nel catalogo); l'articolo punta a `altro/…`, il libro è `libro/la-fattorizzazione`; proposte 0010/0011 | **In carico BON-07** |
| 4 | 7/8–13/8 | Replica d'arma ← Acqua benedetta | ok | **Coincide** |
| 5 | 22/8–27/8 | Pugno del padre ← Melon pan | ok | **Coincide** |
| 6 | 4/9–6/9 | Ofuda della forza ← Wafer dei ladri | ok | **Coincide** |
| 7 | 19/9–24/9 | Ofuda della magia ← Maschera del ladro | **costo vuoto** (Maschera del ladro compare 3 volte nel catalogo); proposte 0014/0015/0016. Nota: la pagina AGS scrive «attacchi fisici» per l'Ofuda della magia: è un refuso della pagina, il DB dice «magici» | **In carico BON-07** |
| 8 | 2/10–8/10 | Daifuku alla fragola ← Cartolina | ok | **Coincide** |
| 9 | 16/10–22/10 | Spada sangue ardente ← Strumento Girimehkala | ok | **Coincide** |
| 10 | 30/10–5/11 | Distintivo dell'angelo ← Stufato misterioso | l'articolo **non ha catalogo** (`catalogo_chiave` NULL); omonimo nel catalogo; proposte 0008/0009 | **In carico BON-07** |
| 11 | 13/11–17/11 | Ascia Kintaro ← Dango lunare | ok | **Coincide** |
| 12 | 27/11–3/12 | Ofuda del potere ← Yaki-Imo leggendario | ok | **Coincide** |
| 13 | 11/12–17/12 | Mazza fervente ← Crostatina angelo | **costo vuoto** (Crostatina angelo compare 2 volte nel catalogo); proposte 0012/0013 | **In carico BON-07** |
| 14 | 13/1–14/1 | Cintura della forza ← Chimaki speciale | ok | **Coincide** |
| 15 | 22/1–2/2 | Elisir del padre ← Panino supernova | ok; **effetto** = «Ottenuto in cambio di Panino supernova» invece di «Ridona tutti gli HP e gli SP a tutti gli alleati» | **Diverso** (effetto) |

Osservazione: sulle voci 0, 1, 3 e 15 resta una condizione `data` «dal 12/6» in più oltre alla finestra: ridondante (la finestra è sempre più tarda), non sbagliata. Le voci 2, 4–6, 8–9, 11–12 e 14
non hanno differenze.

## 6. Venditore ambulante (10 voci)

Per **tutti e 13 gli articoli** del negozio, prezzo, rango di Fascino (2, 3 o 5) e le condizioni (lunedì–venerdì, sera, non piove) coincidono con la guida e con G-029. Le 10 voci
della fonte sono 10 righe; tre di esse hanno **due articoli** nel DB (le varianti `portafortuna-croce`/`-a-croce`, `portafortuna-teschio`/`-a-teschio`, `specchio-del-rimbotto`/`-del-rimbalzo`),
con proposte 0046–0048 di fusione, che sono di BON-07.

| Voce `…/scambi/1/offerte/N` | Articolo (guida) | Prezzo, Fascino | Esito |
|---|---|---|---|
| 0 | Specchio della vendetta | 8.000 ¥, rango 2 | **Coincide** |
| 1 | Portafortuna croce | 2.000 ¥, rango 2 | **In carico BON-07** (due articoli, PROP-0046) |
| 2 | Portafortuna teschio | 2.000 ¥, rango 2 | **In carico BON-07** (due articoli, PROP-0047) |
| 3 | Cintura Rakshasa | 9.000 ¥, rango 3 | **Coincide** |
| 4 | Cintura Vajra | 9.000 ¥, rango 3 | **Coincide** |
| 5 | Cintura Skanda | 9.000 ¥, rango 3 | **Coincide** |
| 6 | Specchio del rimbotto | 16.000 ¥, rango 3 | **In carico BON-07** (due articoli, PROP-0048) |
| 7 | Anello del vento | 4.000 ¥, rango 5 | **In carico BON-07**: l'articolo punta a `accessorio/anello-del-vento-2`, omonimo dell'equipaggiamento `accessorio/anello-del-vento`; la fusione degli omonimi è di BON-07 |
| 8 | Piastrina incisa | 4.000 ¥, rango 5 | **Coincide** |
| 9 | Specchio di rappresaglia | 24.000 ¥, rango 5 | **Coincide** |

Osservazione: per le voci 0, 3, 4 e 5 il campo `effetto` dell'articolo contiene «Fascino n», cioè il requisito; l'effetto dell'oggetto non è nella pagina AGS, quindi non lo
posso riscontrare. Non cambia l'esito dell'offerta.

## 7. Gachapon di Akihabara (6 voci) — in carico a BON-07

La **fonte coincide con la guida** in tutte e 6 (capsula consegnata e ricompensa: Minidominazione → Dr. Salt NEO; Die-soujou → Riempitivo + Lenzuolo rinfrescante; Decarabia addobbato →
Bevanda energetica + Salsa rancida; Strumento Girimehkala → Curry alla fragola + Stufato misterioso; Kin-Ki kink → Rianidrin + Unguento vitale; Mothman muschiato → Replica d'arma, poi Balsamo
vitale dal 5° scambio). Ma il negozio `gachapon-akihabara` ha **un solo articolo** (la capsula da 500 ¥): le 6 righe di destinazione `…/scambio-*` **non esistono**, e ci sono le proposte
PROP-0002…0007 da approvare. Creare gli scambi è lavoro dell'abbinamento e dei pannelli: **voci aperte, in carico a BON-07** (voci 0, 1, 2, 3, 4, 5).

## 8. Tanaka (4 voci) — in carico a BON-08

Le 4 voci `…/scambi/3/offerte/0…3` sono l'archivio aggregato del listino di Tanaka (gradi e intervalli di prezzo, non offerte operative). Le destinazioni sono le 20 offerte di oggi più 8 nuove
non ancora create (`assente`), con 10 proposte non coincidenti: è esattamente il piano 10+8 della migrazione 142. **Non chiudo**. Per memoria: la guida (`negozi-speciali`, riassunto, certezza
media) elenca 18 articoli con i prezzi del piano (Spec. senso spirit. 5.000 … Corona della salvezza 990.000, Homunculus 5.000).

## 9. Archivio sintetico di Jose (24 voci)

Sono righe di archivio (`copia-sintetica-in-archivio`): aggregano le 37 offerte vere in 24 righe. Ho controllato che coprano tutti i 37 articoli una volta sola (2+2+1+1+1+1+3+3+2+1+1+3+1+1+1+1+1+1+5+1+1+1+1+1 = 37),
con i costi dentro l'intervallo indicato e il Dedalo giusto.

| Voce `…/scambi/4/offerte/N` | Riga dell'archivio | Costo | Articoli veri (costi) | Esito |
|---|---|---|---|---|
| 0 | Fiala vertigini S / Fiala del sonno S | 30-40 Fiori | 2 (30/40) | **Coincide** |
| 1 | Goccia dell'anima / Polvere d'anima | 15-75 Fiori | 2 (15/75) | **Coincide** |
| 2 | Kit energetico S | 80 Fiori | 1 (80) | **Coincide** |
| 3 | Carta bianca | 15 Fiori | 1 (15) | **Coincide** |
| 4 | Fiala confusione S | 65 Fiori | 1 (65) | **Coincide** |
| 5 | Fiala del sonno L | 40 Fiori | 1 (40) | **Coincide** |
| 6 | Ambra grigia (Ma/Ag/Fo +2 a una Persona) | 80 Fiori | 3 (80/80/80) | **Coincide** |
| 7 | Kogatana nera / Replica d'arma / Veste nera | 30 Fiori | 3 (30/30/30) | **Coincide** |
| 8 | Ambra grigia RS/FR (Rs/Fr +2 a una Persona) | 80 Fiori | 2 (80/80) | **Coincide** |
| 9 | Fiala delle vertigini L | 40 Fiori | 1 (40) | **Coincide** |
| 10 | Fiala della paura S | 65 Fiori | 1 (65) | **Coincide** |
| 11 | Ofuda speciali (precisione/elusione/attacco di gruppo) | 70 Fiori | 3 (70/70/70) | **Coincide** |
| 12 | Kit energetico L | 210 Fiori | 1 (210) | **Coincide** |
| 13 | Anima da masticare | 170 Fiori | 1 (170) | **Coincide** |
| 14 | Fiala confusione L | 70 Fiori | 1 (70) | **Coincide** |
| 15 | Fiala dell'amnesia S | 30 Fiori | 1 (30) | **Coincide** |
| 16 | Fiala della paura L | 70 Fiori | 1 (70) | **Coincide** |
| 17 | Fiala soggiogamento S | 70 Fiori | 1 (70) | **Coincide** |
| 18 | Nirvana (**+3 a tutte le statistiche** di una Persona) | 80 Fiori | 5 (80 ciascuno) | **Diverso** |
| 19 | Pane per l'anima | 450 Fiori | 1 (450) | **Coincide** |
| 20 | Fiala dell'amnesia L | 40 Fiori | 1 (40) | **Coincide** |
| 21 | Fiala disperazione S | 100 Fiori | 1 (100) | **Coincide** |
| 22 | Soma | 520 Fiori | 1 (520) | **Coincide** |
| 23 | Fiala soggiogamento L | 90 Fiori | 1 (90) | **Coincide** |

La voce 18 contraddice la guida: la pagina dei Memento elenca **cinque oggetti separati** (Nirvana FO, AG, RS, MA, FR), ciascuno «+3 a una sola statistica» (80 Fiori, Dedalo di Adyeshach), e non
un Nirvana che dia +3 a tutte. Gli articoli veri (voci 27–31 di Jose) sono giusti; la riga aggregata dell'archivio è sbagliata. È il rilievo `divergenza-nirvana-tutte-statistiche` dell'inventario.

## 10. Proposta per le tre voci «diverso» (nessuna scrittura)

| Voce | Dato di oggi | Valore corretto | Prova | Certezza |
|---|---|---|---|---|
| `L7-NODO-oggetti-guida/scambi/0/offerte/0` (Frusta decorativa) | `effetto` = «Ottenuta in cambio di Proteine d importazione» | «Arma per Ann: Fo +5» (il costo è già in `costo_json`) | guida AGS Sakai, 12/6–17/6; stessa riga della fonte «(arma di Ann: Fo +5)» | alta |
| `L7-NODO-oggetti-guida/scambi/0/offerte/15` (Elisir del padre) | `effetto` = «Ottenuto in cambio di Panino supernova» | «Ridona tutti gli HP e gli SP a tutti gli alleati» | guida AGS Sakai, 22/1–2/2; la fonte dice «ripristina tutti gli HP e SP» | alta |
| `L7-NODO-oggetti-guida/scambi/4/offerte/18` (riga d'archivio Nirvana) | «+3 a tutte le statistiche di una Persona» | «cinque Nirvana (FO, AG, RS, MA, FR), ciascuno +3 a una sola statistica» | guida AGS dei Memento, sezione Jose; i cinque articoli veri sono già giusti | alta |

Per la riga d'archivio la correzione non va nella fonte grezza (`dati_guida`, protetta dal confronto in `raccordi-scambi-catalogo-132`), ma in una nota dell'archivio. Gli effetti delle voci 0 e 15 sono due
campi di articoli della guida, non lavoro dell'utente; la scrittura è una correzione di dati di gioco con il testo di prima in nota.

## 11. Voci che restano aperte, e perché

- **In carico a BON-07 (15)**: Sakai 1, 3, 7, 10, 13; Venditore ambulante 1, 2, 6, 7; Gachapon 0, 1, 2, 3, 4, 5. Dipendono dalle 87 proposte e dagli omonimi del catalogo (Veste nera, La fattorizzazione, Maschera del
  ladro, Distintivo dell'angelo, Crostatina angelo, Razione militare, Anello del vento).
- **In carico a BON-08 (4)**: Tanaka 0, 1, 2, 3.
- **Diverso (3)**: Sakai 0 e 15, archivio 18 (§10).
- **Da chiudere come coincide (75)**: Jose 0–36; Sakai 2, 4, 5, 6, 8, 9, 11, 12, 14; Venditore ambulante 0, 3, 4, 5, 8, 9; archivio 0–17 e 19–23.
