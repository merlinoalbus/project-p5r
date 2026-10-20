# L3 — riverifica UX della scheda del Palazzo su 08da0557 (Test UX, 2026-10-20, fino alle 14:50Z)

Collaudo FE 5473 / BE 3301, linea `newreview-l3` = 08da0557.

**Solo letture.** Elenchi e «Dettagli» aperti e richiusi; nessun salvataggio. L'unica scrittura è la cache `immagine_miniatura` (`?l=`).

**Misure:** 375×812, 768×1024, 1024×690, 1280×689, 1366×657, 1920×1080. Le ho prese in un iframe della stessa origine; le schermate sono a
misura emulata. Le misure di layout sono di Test layout (`esiti-layout/08da0557/esito.md`); qui guardo cosa vede e cosa tocca chi gioca.

**Palazzi provati:** Kamoshida, Maruki, Shido, Niijima, Madarame.

## Cosa funziona
- **L'intestazione resta sotto il 30% (LAY3-5).**
  - Kamoshida 212 px a 375 e 198 a 768.
  - Maruki 216 a 375 e 198 a 768.
  - Shido 208 a 375 e 198 a 768.
  - Niijima 216 a 375 e 198 a 768.
  - Da 1024 in su, 106 px.
- **Niente si perde (LAY3-4, LAY3-5).** «Dettagli dalla guida» è un tocco da 44 px. A Kamoshida contiene tutto ciò che è uscito
  dall'intestazione:
  - «Sulla mappa di Tokyo dall'11 aprile al 2 maggio»;
  - 7 infiltrazioni, 107 da raccogliere, 169 punti, «10 aree · 26 planimetrie · 26 complete»;
  - stato (Tesoro, boss, permanenti 71/71), sovrano, livello consigliato e le tre frasi delle date.

  Le frasi lunghe si aprono con «Mostra tutto», un bersaglio da 44 px; per esempio il livello consigliato si legge intero
  (`02-kamoshida-dettagli-aperti-375x812.jpg`).
- **Grafica al 100%.**

  | Misura | Illustrazione | Stemma |
  |---|---|---|
  | 375 | 94×52 | 28 |
  | da 1280 in su | 102×57 | 40 |

  - A 1024 c'è solo lo stemma da 48.
  - I segni delle date hanno opacità 1, nessuna figura è velata.
  - L'illustrazione è più piccola sotto i 1024, ma intera (`01-…`).
- **Arcana (LAY3-6).** A 375 «Giudizio (Judgement)» di Niijima va a capo intera (135/135); a 768 è 147/147.
- **Visore (LAY3-3).** A 375 è alto 520 px, uno scorrimento sotto i selettori.
- **Selettori (LAY3-7).**
  - Da 1024 in su stanno su una riga.
  - Aperto, l'elenco delle infiltrazioni di Shido mostra i nomi interi, che vanno a capo («1. Passaggio Centrale / Sala d'Ingresso»).
  - C'è la ricerca «Cerca infiltrazione 1 di 16…» e l'elenco resta nella finestra (324–644 su 657) (`04-…`).
  - «Aree · N» a 375 è un bersaglio da 44 px.
- **Versioni (LAY3-8).**
  - A 1366×657 l'elenco delle versioni di Shido va da 325 a 640, e l'ultima voce finisce a 635 su 657.
  - Ogni versione ha la miniatura, il nome intero e i pin («inquadratura meridionale — seconda per ampiezza · nessun pin · si apre per
    prima») (`07-…`).

## Due difetti nuovi
- **UX3-12 (media, FE).** Sotto i 1024 il chip di una data scritta come frase mostra un'abbreviazione dell'etichetta che non si capisce:
  - Maruki «**Si**» (per «Si apre»);
  - Shido «**Furto**» (per «Furto consigliato»).

  Nel DOM ci sono `span.lg:hidden` «Si» e `span.hidden.lg:inline` «Si apre». «Si» si legge come «sì». Da 1024 in su l'etichetta è intera
  («Si apre» 69 px, «Furto consigliato» 125 px). La frase intera c'è solo nel `title`, che col tocco non si vede, e nei «Dettagli»
  (`03-maruki-chip-si-375x812.jpg`). Rimedio: l'etichetta intera anche sotto i 1024; «Si apre» è largo 69 px e ci sta.
- **UX3-13 (media, FE).** A 1280×689 e 1366×657 la fila «Aree toccate» accanto al selettore dell'infiltrazione nasconde quello che
  deve mostrare:
  - è una striscia scorrevole in orizzontale larga 138 px a 1280 e 190 px a 1366;
  - si apre già scorsa (scrollLeft da 6 a 113), quindi l'etichetta «Aree toccate» è tagliata («REE TOCCATE» a Shido 1366) o del tutto fuori
    (Kamoshida 1280);
  - i chip delle aree si vedono a metà: a Kamoshida 1280 c'è un solo chip, «Prigione sotterranea - Tutorial», anche lui fuori;
  - per vederli serve uno scorrimento laterale, che col mouse è un gesto nascosto.

  Misurato su Kamoshida, Madarame e Shido. A 1920×1080 la fila non scorre e si vede tutta; a 1024×690 non c'è. Le aree toccate si leggono
  comunque nella colonna a sinistra, sotto ogni area, quindi non si perde il dato. Si perde però la riga che dice «questa infiltrazione
  passa da qui» (`05-kamoshida-aree-toccate-1280x689.jpg`, `06-…zoom…png`). Rimedio: la fila va a capo sotto i selettori, oppure resta
  solo nella colonna delle aree da 1024 a 1919. La scelta spetta a FE con Stesura.
