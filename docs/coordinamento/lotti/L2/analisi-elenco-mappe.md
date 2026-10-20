# «Elenco completo, con tutti i livelli» di /guida/mappe — differenze con i dati veri

Autore: sessione «Analisi app attuale», 2026-10-20 ~09:00, su segnalazione dell'utente girata dal PM.
Il lato visivo (schermate) lo copre Test UX.

## Fonti e metodo
Tutto in sola lettura, solo GET.
- **Istanze:**
  - p5s (https://p5s.nasmerlinoalbus.cloud, codice L1);
  - Collaudo 3301/5473 (L2, base p5s-0533Z);
  - anteprima 3302/5474 (L3+L4 b83c30ac, base p5s-0503Z).
- **Dati:** `GET /api/mappe/albero` di ogni istanza; `GET /api/mappe/:chiave` di tutte le 308 mappe di 3301, per gli spilli per tipo; `GET /api/compendio/citta`.
- **Simulazione:** gli script in scratchpad `mappe/` emulano in testo quello che disegnano `MappaPage` e `AlberoLuoghi`.
- **Codice letto** (pensive, uguale a quello delle istanze per le parti citate):
  - `src/pages/MappaPage.tsx`: intestazione `:121-135`; carte `:147-173, 194, 202`; pannello e Elenco `:221-276`; griglia `:349-425`;
  - `src/components/mappe/AlberoLuoghi.tsx`: `:24-26, 55-90`;
  - `src/utils/vocabolarioMappe.ts:17-35`;
  - `shared/spilli.ts:320`.

**I numeri non sono inventati, ma non sono quello che sembrano.** Per ognuna delle 308 mappe di 3301, `numeroSpilli` dell'albero e gli spilli del
dettaglio coincidono (0 differenze), e i totali sono le somme delle righe. Quello che non torna è **cosa** si conta e **con quale parola**. A
questo si aggiungono tre problemi di struttura, che non riguardano i conteggi.

## Cosa c'è davvero (gerarchia)
| | p5s (L1) | 3301 (L2) | 3302 (L3+L4) |
|---|---|---|---|
| Righe di `mappa` nell'albero | 308 | 308 | 307 (manca la «Prova» dell'utente, che non è nella 0503Z) |
| Città / quartieri | 1 / 23 | 1 / 23 | 1 / 23 |
| Aree del mondo / loro planimetrie | — (nessuna Area) | 23 / 29 | 23 / 29 |
| Palazzi: Aree / planimetrie | — | — (nessuna Area) | 101 / 219 (Kamoshida 10/26, Madarame 8/17, Kaneshiro 13/27, Futaba 18/32, Okumura 11/21, Niijima 13/26, Shido 16/35, Maruki 12/35) + Iweleth 16/26 |
| Memento | assente dall'indice | assente | assente |
| Spilli | 1742 | 1742 | 1742 |

Dei 1742 spilli, **695 servono a muoversi** (339 passaggi, 163 porte, 110 scale, 57 scorciatoie, 12 uscite, 7 infiltrazioni, 2 ingressi
al Palazzo, 5 treni) e **228 sono note**. Ne restano 819 di contenuto. A Madarame i 260 spilli sono 72 di movimento e 188 di contenuto; a
Kamoshida 369 = 106 + 263.

## Differenze, una per una
| # | Cosa si vede | Cosa è vero | Fonte nel codice | Istanze | Lotto |
|---|---|---|---|---|---|
| E1 | Intestazione «**308 mappe** con 1742 spilli» (3302: 307) | Le «mappe» sono **righe della tabella `mappa`**: ogni versione di un'Area conta come una mappa, e così le radici dei Palazzi. Nella gerarchia ci sono 1 città, 23 quartieri, 23 Aree del mondo con 29 planimetrie, 8 Palazzi con 101 Aree e 219 planimetrie, più Iweleth con 16 Aree e 26 planimetrie | `MappaPage.tsx:121` `totaleMappe = mappe.length` | tutte | **L11** (R11-11, R11-26: conteggi accanto ai nodi). Prima va deciso cosa contare |
| E2 | «… con **1742 spilli**» | Somma di **tutti** gli spilli, compresi i 695 di movimento e le 228 note; per l'utente i «pin» sono gli oggetti, i nemici, le voci | `MappaPage.tsx:122` `totaleSpilli = Σ numeroSpilli` | tutte | **L11**. **Decisione per l'utente o il PM**: si contano tutti gli spilli, o solo quelli di contenuto (senza movimento e note)? |
| E3 | Carta di Madarame «260 spilli · **17 mappe**» | **8 Aree** e 17 planimetrie (versioni comprese). L'Elenco completo dello stesso Palazzo mostra **8** voci, e la griglia del pannello 8 carte con «N versioni»: **la stessa cosa contata in tre modi** | `MappaPage.tsx:147-150, 173` (`conta` somma 1 per ogni mappa discendente: `:91-96`) contro `AlberoLuoghi.tsx:54-70` (una voce per Area) e `GriglieDelLuogo` `:356-365` | 3302 (in 3301 e p5s i Palazzi non hanno Aree: lì le 17 voci sono davvero 17 planimetrie sciolte) | **L3** (le carte dei Palazzi devono dire «8 aree · 17 planimetrie», con la parola della gerarchia come `LuogoSenzaPlanimetria` `:308-316`) |
| E4 | Carta di Tokyo «298 spilli · **52 mappe**» (p5s 271 · 47) | 23 quartieri + 29 planimetrie = 52 righe; le Aree sono 23. L'Elenco mostra 23 quartieri più l'Area dello staff, e sotto ogni quartiere le **Aree** («Aree di Shibuya (6)»), non le 7 mappe di Shibuya | come E3 | 3301, 3302 (p5s: il Covo è fra le radici, quindi Tokyo ne ha 5 di meno) | **L2** (sulle carte del mondo la parola giusta è «quartieri / aree / planimetrie», L2 M12/M16) |
| E5 | Nell'Elenco, un'Area con più versioni ha «5 versioni · 27 **pin**»; un'Area con una sola versione **nessun conteggio**; i quartieri nessun conteggio | Stessa grandezza chiamata «pin» qui e «spilli» nell'intestazione, nelle carte e nella griglia; il conteggio compare solo nelle Aree con più versioni | `AlberoLuoghi.tsx:78` (`{membri.length > 1 && … pin}`) | 3301, 3302 | **L2** (riga introdotta da L2: stessa parola e stesso conteggio su ogni riga, oppure nessuno) |
| E6 | I «pin» di un'Area sono la somma sulle sue versioni | Le versioni sono immagini diverse dello stesso posto: lo stesso oggetto può stare su due versioni ed essere contato due volte. Su 1234 spilli di Aree con più versioni, 293 hanno stesso tipo, nome, riferimento e voci di uno spillo di un'altra versione della stessa Area. Esempio: a Kamoshida, «Vecchio castello 3P», il forziere della voce `kamoshida-01-cancello-del-castello-ingresso-razzia-la-cappella` sta su 2 versioni. **Stima per eccesso**: i nomi generici («Nemico», «Salita») gonfiano il numero | `AlberoLuoghi.tsx:70` `pin = Σ numeroSpilli` delle versioni; `GriglieDelLuogo` `:356` | 3302 (e 3301 per le Aree del mondo) | **L11**, insieme a E2. Da verificare con l'Esperto o Test funzionali su un'Area concreta prima di correggere |
| E7 | In fondo ai quartieri di Tokyo, «**Area riservata allo staff** · 2 versioni · 0 pin · Da verificare», allo stesso livello dei quartieri | Un'Area attaccata direttamente alla città salta un livello (Città › Quartiere › Area). È l'Area dello staff in attesa della scelta dell'utente (R1 di L2) | dati: genitore `tokyo`, Area `citta/tokyo/area-riservata-allo-staff` | 3301, 3302 | **L2** (decisione dell'utente già aperta; finché non arriva, l'Elenco dovrebbe mostrarla fra le «da verificare», non fra i quartieri) |
| E8 | I Memento non ci sono; c'è invece «**Dedalo di Iweleth**» come Palazzo, con 16 Aree e 26 planimetrie | R11-11: Memento › Dedali › Aree, senza planimetrie. Iweleth sta fra i Palazzi (`tipo: 'palazzo'`) | dati: radice `dedalo-di-iweleth` `tipo palazzo`; nessuna mappa `dedalo` nell'albero | tutte | **L11** (albero completo); per Iweleth, **L4 §8.15** (Stesura: «Iweleth con la regola dei Memento», BE al lavoro). Da decidere dove sta Iweleth nell'albero |
| E9 | Il nome dell'Area è diverso da quello delle sue planimetrie: «Museo, 1P» (con la virgola) contro «Museo 1P», «Sala del Tesoro - Atrio» contro «Sala del Tesoro - Atrio - Livello 0» | Nome dell'Area preso dai dati di L3 (`area.nome`), non dal nome della planimetria | dati: tabella `area` dei Palazzi (migrazione di L3) | 3302 | **L3** (controllare i nomi delle 101 Aree dei Palazzi e delle 16 di Iweleth; per Madarame la virgola c'è in «Museo, 1P» e «Museo, 2P») |
| E10 | In 3301 e su p5s l'Elenco di un Palazzo **non è una lista piatta** (correzione di Test UX, V1). Le planimetrie con un `gruppoImmagini` escono come blocchi di miniature **senza titolo**: il titolo `<h3>` si scrive solo quando manca il gruppo esplicito. Così i livelli di Museo 1P sembrano dell'Entrata del Museo | I Palazzi di 3301 e di p5s non hanno Aree; i gruppi di immagini sostituiscono le Aree, ma senza nome | `AlberoLuoghi.tsx:90` (`{!m.gruppoImmagini && <h3>…}`, poi `ImmaginiLuogo`); dati: `gruppo_immagini_json` dei Palazzi | 3301, p5s | **già corretto da L3** (3302 raggruppa per Area, col nome). Resta per L11 R11-02: togliere `gruppo_immagini_json` dei Palazzi. Vedi V1 sotto |
| E11 | Su p5s, il Covo dei Ladri e le sue quattro versioni sono cinque **radici** dell'indice, accanto a Tokyo e ai Palazzi | Il Covo è un'Area di Yongen-Jaya | dati: genitore `null` in p5s | p5s | **già corretto da L2** (3301 e 3302 lo mettono sotto Yongen-Jaya). Nessuna azione |
| E12 | Kamoshida conta una planimetria «**Prova**» in più (p5s, 3301: 27 mappe; 3302: 26) | È il caso di prova dell'utente (`palazzo-di-kamoshida-prova`, bacheca: si toglie solo con il suo via). In 3301 non ha un'Area, quindi in L3 finirebbe fra le «da collocare» | dati | p5s, 3301 | nessun difetto; da ricordare quando si confrontano i numeri |

## Proposta di ripartizione
- **L2:** E4 e E5 (parole e conteggi delle righe che L2 ha introdotto); E7 (resta sulla decisione dell'utente R1).
- **L3:** E3 (carte dei Palazzi «aree · planimetrie»); E9 (nomi delle Aree dei Palazzi).
- **L11:** E1, E2 e E6 (cosa conta l'indice e con quali numeri, R11-26); E8 (Memento e Iweleth nell'albero, R11-11).
- **Decisioni da prendere:** cosa conta «spilli» (E2); dove sta Iweleth (E8).

## Script (scratchpad di Analisi app, `mappe/`)
- `albero-<istanza>.json`: albero delle tre istanze.
- `spilli-c3301.json`: spilli per mappa e per tipo.
- `simula.cjs`: testo delle carte e dell'Elenco.
- `sim-<istanza>-{tokyo,madarame,kamoshida}.txt`: esiti della simulazione.

## Lato visivo (Test UX, 2026-10-20, 05:35–05:48Z)
Tutto in sola lettura: su p5s nessun clic che scrive e localStorage vuoto prima e dopo; le pagine chiedono miniature `?l=`, che scrivono la
cache come a ogni visita. Percorso: `/guida/mappe` → radice (Tokyo o Madarame) → per Shibuya, tocco sulla carta Shibuya nel pannello di Tokyo →
«Elenco completo, con tutti i livelli» aperto. Misure: 1280×800, 768×1024, 375×812.

### Schermate (`schermate-elenco-mappe/`, 28 file)
| | Tokyo | Shibuya | Madarame |
|---|---|---|---|
| p5s (L1) | `p5s-tokyo-{1280,768,375}.jpg` | `p5s-shibuya-{1280,768,375}.jpg` | `p5s-madarame-{1280,768,375}.jpg` (+ `-1280-b`, più in basso) |
| 5473 (L2) | `5473-tokyo-{1280,768,375}.jpg` | `5473-shibuya-{1280,768,375}.jpg` | `5473-madarame-{1280,768,375}.jpg` |
| 5474 (L3+L4) | `5474-tokyo-{1280,768,375}.jpg` | `5474-shibuya-{1280,768,375}.jpg` | `5474-madarame-{1280,768,375}.jpg` |

### Testo esatto
- **Sommario**, uguale ovunque: «Elenco completo, con tutti i livelli».
- **Tokyo**, quartieri con il loro sotto-sommario.
  - p5s, sotto-sommario «Aree e planimetrie (N)»: Yongen-Jaya (2), Shibuya (7), Shinjuku (1), Kichijoji (1), Akihabara (1),
    Shujin Academy (8), Kanda / Jinbocho (1), Odaiba / Seaside Park (1).
    Senza sotto-sommario: Ikebukuro, Harajuku, Ueno, Parco Inokashira, Shinagawa, Nakano, Ogikubo, Chinatown, Maihama, Roppongi,
    Tsukishima, Santuario Meiji, Ichigaya, Suidobashi, Asakusa.
    In fondo, **senza titolo**: «porzione occidentale», «planimetria completa».
  - 5473 e 5474, identici: stessi quartieri; sotto-sommario «Aree di Yongen-Jaya (3)», «Aree di Shibuya (6)», «Aree di Shinjuku (1)»,
    «Aree di Kichijoji (1)», «Aree di Akihabara (1)», «Aree di Shujin Academy (8)», «Aree di Kanda / Jinbocho (1)»,
    «Aree di Odaiba / Seaside Park (1)».
    In fondo: «Area riservata allo staff · 2 versioni · 0 pin · Da verificare» (E7).
    Dentro «Aree di Shibuya (6)»: Piazza della stazione · Sottopasso «2 versioni · 16 pin» · Central Street · Centro comm. sotterraneo ·
    Tornello della linea Ginza · Banchina della metropolitana.
- **Shibuya**, pannello del quartiere.
  - p5s: «Piazza della stazione», poi due figure **senza titolo** «inquadratura orientale» e «planimetria completa» (sono il **Sottopasso**),
    Central Street, Centro comm. sotterraneo, Tornello della linea Ginza, Banchina della metropolitana. La griglia sopra dice «Sottopasso · 16 spilli».
  - 5473 e 5474: Piazza della stazione · Sottopasso «2 versioni · 16 pin» · Central Street · Centro comm. sotterraneo ·
    Tornello della linea Ginza · Banchina della metropolitana.
- **Madarame**.
  - p5s e 5473, identici: Entrata del Museo | Livello 0 | Livello 1 | Livello 0 | Livello 1 | Livello 2 | Livello 3 | Esterno |
    Livello 0 | Livello 1 | Livello -2 | Livello -1 | Livello 0 | Il Labirinto Contorto | Livello 0 | Livello 1 | Livello 2.
    La griglia sopra dice invece «Museo 1P · 1», «Museo 1P · 2», «Museo 2P - Livello 0…3», «Giardino centrale / Museo, 2P — Esterno»,
    «Sala del Tesoro - Galleria - Livello 0 / -1 / -2».
  - 5474: Entrata del Museo · Museo, 1P «2 versioni · 55 pin» · Museo, 2P «4 versioni · 63 pin» · Giardino centrale ·
    Sala del Tesoro - Atrio «2 versioni · 32 pin» · Sala del Tesoro - Galleria «3 versioni · 37 pin» · Il Labirinto Contorto ·
    Sala Principale «3 versioni · 41 pin».

### Cosa vede l'utente che è falso o disallineato (oltre a E1–E12)
| # | Cosa si vede | Istanze | Nota |
|---|---|---|---|
| V1 | Nell'Elenco di Madarame i gruppi senza titolo fanno sembrare i due livelli di **Museo 1P** livelli dell'«Entrata del Museo»; poi blocchi «Livello 0…3», «Esterno», «Livello -2, -1, 0» senza dire di quale stanza. La Galleria va «-2, -1, 0», la griglia sopra «0, -1, -2». **È la frase dell'utente «non rispondente al vero»** | p5s, **5473** | Su 5473 resta perché i Palazzi non hanno Aree (E10); si chiude con L3 (UX2-14) |
| V2 | Nell'Elenco di Shibuya su p5s le due versioni del **Sottopasso** stanno sotto «Piazza della stazione», e il Sottopasso non ha titolo | p5s | Corretto da L2 (5473, 5474) |
| V3 | Le figure dell'Elenco dei Palazzi sono riquadri **grigi** (`bg-neutral-700`, 112×96) con la tela 2048 intera: disegno minuscolo in un angolo, grafica diversa dalle carte nere della griglia. **È il «disallineata al resto»** | p5s, 5473 | 5474 non ha figure nell'Elenco; la carta della griglia ha lo stesso problema del disegno piccolo (UX2-13, a BE) |
| V4 | L'Elenco scorre in un **riquadro suo** (`max-h-[420px]`: misurato 418/1712 su Tokyo p5s, 418/1600 su Tokyo 5473/5474, 418/1088 su Madarame 5473) dentro la pagina che scorre già: due barre una dentro l'altra | tutte (sui Palazzi di 5474 solo a 375, dove le 8 righe vanno a capo) | Contro la regola sugli scroll annidati; da misurare con Test layout |
| V5 | Sommario del quartiere che cambia nome: «Aree e planimetrie (7)» su p5s, «Aree di Shibuya (6)» su 5473/5474; i quartieri senza Aree non hanno né sommario né conteggio | tutte | Con E5 |
| V6 | Il titolo «con tutti i livelli» non è vero su 5473/5474 per Tokyo e Shibuya (Aree senza versioni) e su 5474 per i Palazzi (8 Aree, nessun livello): **l'Elenco ripete la griglia** senza figure | 5473, 5474 | UX3-7 (a FE) |
| V7 | A 375, «2 versioni · 32 pin» va a capo accanto ai nomi lunghi («Sala del Tesoro - Atrio»), su due righe allineate male | 5474 | Per Test layout |
| V8 | A 768 e 375 la carta di Tokyo ha il chip «1 da verificare» che tronca il sottotitolo in «Città · 298 spi…» | 5473, 5474 | Per Test layout |
