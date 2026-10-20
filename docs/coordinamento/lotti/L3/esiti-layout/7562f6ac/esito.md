# L3 — LAY3-5 e riprova di layout su newreview-l3 = 7562f6ac (Test layout multi device, 2026-10-20)

Collaudo FE 5473 / BE 3301, dati uguali alla base. Solo letture.

Metodo: misura dal DOM in un iframe della stessa origine grande quanto la finestra, attendendo `document.fonts.ready` e finendo le animazioni.
- Menu pieno, cioè la barra laterale predefinita: `menuRidotto:false` solo durante le serie, poi la preferenza del browser è tornata identica
  (controllata).
- Partita attiva «Partita Roberto».
- Criterio fisso dell'utente: **intestazione ≤ 30% dell'altezza della finestra**.

## 1. LAY3-5 — intestazione entro il 30%: **verde**
Intestazione (`main header`) misurata in tutte le 532 misure della serie (76 infiltrazioni × 7 misure) e nelle schede senza infiltrazione:

| misura (soglia 30%) | 9 Palazzi | Memento |
|---|---|---|
| 375×812 (243) | **208–220**: Kamoshida, Madarame, Kaneshiro 212; Futaba, Niijima, Shido, Maruki 208; Iweleth 209; Okumura 220 | **136** |
| 768×1024 (307) | **198** in tutti | **156** |
| 1024×690 (207) | 106 | 106 |
| 1280×689 (206) | 106 | 106 |
| 1366×657 (197) | 106 | 106 |
| 1920×1080 (324) | 106 | 106 |

- Nessun caso sopra soglia in 532 + 33 misure.
- Madarame a 375 è 212. FE dichiarava 241 col «Suggerito oggi» della sua partita locale; con la partita del collaudo il chip non c'è.
- Schermata: `LAY3-5-kamoshida-375x812.jpg`.

### Niente si perde sotto i 1024 px
- Ho confrontato le voci dell'intestazione di ogni Palazzo a 1366×657 con l'intestazione e i «Dettagli dalla guida» a 375 e a 768.
  - I «Dettagli» li ho aperti col tocco, e ho premuto ogni «Mostra tutto».
  - Ho controllato i conteggi, «Sulla mappa di Tokyo», Tesoro e boss, sovrano e arcana, le date e le note.
  - **Mancano 0 voci** su 6–9 per Palazzo, nei 9 Palazzi e alle 2 misure.
- «Dettagli dalla guida» 121×44. Dentro i Dettagli aperti: nessun bersaglio sotto i 44, nessun testo tagliato, nessuno scorrimento orizzontale.
- Nell'intestazione a 375 e 768 non ci sono bersagli sotto i 44 né testi a una lettera per riga. Il controllo è rifatto con il filtro che
  tiene conto dei contenitori `display: contents`.
- Testi tagliati nell'intestazione sotto i 1024:
  - Kaneshiro «Diavolo (The Devil) — forma Ombra…» 135/388 e Maruki «Consigliere (Councillor)…» 135–496/2786 sono frasi più larghe di tutto
    lo spazio: regola di LAY3-2, e il testo intero è nei Dettagli;
  - **Niijima «Giudizio (Judgement)» 135/147 a 375** non è una frase lunga: è tagliato di 12 px (da 390 px in su è intero) → **LAY3-6**.
- **Illustrazione e stemma**:
  - illustrazione 94×52 a 375, 126×70 a 768, 102×57 da 1024 (`cover`). La miniatura (96×54, 128×72, 104×58) ha le proporzioni
    dell'originale 1672×941 (1,777); nel riquadro si perde circa 1 px, quindi è la figura intera, solo più piccola;
  - stemma e anello in `contain`, 28–40 px;
  - nessuna immagine rotta;
  - Memento: icone 40–48 px in `contain`. L'illustrazione da 280×280 c'è da 768 in su; a 375 no, ed era così anche prima di LAY3-5.

## 2. R3-41 da 1024 in su: **verde**
| misura (metà) | inizio del visore | `main` |
|---|---|---|
| 1366×657 (328,5) | 327–328 | 589/589 |
| 1280×689 (344,5) | 327–328 | 621/621 |
| 1024×690 (345) | 340 | 622/622 |
| 1280×800 (400) | 327–328 | 732/732 |
| 1920×1080 (540) | 317–327 | 1012/1012 |

Entro metà in 380 su 380. Una sola barra, nessuno scorrimento orizzontale, nessun titolo d'area troncato. Font `loaded` in tutte.

## 3. LAY3-3: **verde**
Visore alto **520** a 375×812 e **560** a 768×1024 in 76 su 76. Comincia a 640–915 a 375 e a 546–735 a 768: più in alto di prima (693–1190 e
676–1008), grazie all'intestazione più bassa.

## 4. LAY3-4: **verde**
Nessun chip di data tagliato nell'intestazione, a nessuna misura. Le date-frase stanno intere nei «Dettagli» con «Mostra tutto».

## 5. Difetti nuovi
- **LAY3-6 (bassa)**: a 375×812, nell'intestazione di Niijima, l'arcana «Giudizio (Judgement)» è tagliata coi puntini (135/147 px). Il gruppo
  del sovrano è largo 135 px e il testo non va a capo (`white-space: nowrap`). Da 390 px in su è intero. Il testo intero è nei «Dettagli», ma
  per LAY3-2 si accorcia solo un testo più largo di tutto lo spazio.
- **LAY3-7 (bassa, da decidere)**: nei selettori compatti della scheda il valore scelto si accorcia coi puntini.
  - Il selettore dell'infiltrazione, da 1024 in su: Shido «1. Passaggio Centrale / Sala d'Ingresso» 100/238 a 1366 e 165/238 a 1024; Iweleth
    100–165/217; Madarame 105–170/183; Futaba, Niijima, Okumura, Kaneshiro 100–105/107–146; Kamoshida 105/146.
  - Il selettore delle versioni a 1366: Kamoshida «18 pin · si apre per prima · versione 2 di 5» 157/213.
  - «Aree · N» a 375: Kamoshida «Prigione sotterranea - Tutorial ▾» 192/218.
  - Aperti, i loro elenchi mostrano i nomi interi, con voci ≥ 44 px e niente tagliato. Il nome dell'area è anche il titolo sotto, intero.
  - Sono i selettori compatti della scelta 2 del PM per R3-41: va deciso se il valore chiuso può accorciarsi o se deve stare intero, per
    esempio su due righe, rispettando R3-41.

## 6. Correzione di quanto avevo dichiarato prima
Negli esiti `765fb2a1/esito.md` e `48d7a958/esito.md` avevo scritto «nessun testo troncato» per la scheda. Il controllo copriva solo
l'intestazione e i titoli d'area (`h3`), non il resto della pagina. I troncamenti di LAY3-7 c'erano già su quei commit. In più, sotto i
1024 px il filtro che scartava gli elementi nascosti trattava come nascosti i contenitori `display: contents`; su 7562f6ac l'ho corretto e ho
rifatto i controlli dell'intestazione a 375 e 768. Le altre misure di quegli esiti (visore, barre, orizzontale, bersagli) non cambiano.

Prove: `misure-grezze.json` (la serie a 532 righe, le immagini dell'intestazione e il confronto desktop/telefono/tablet),
`LAY3-5-kamoshida-375x812.jpg`.
