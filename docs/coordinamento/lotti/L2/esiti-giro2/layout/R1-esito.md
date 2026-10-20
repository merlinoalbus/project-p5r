# L2, giro 2 del validatore — R1, misura di layout (Test layout multi device, 2026-10-20)

Collaudo BE 3301 / FE 5473 sul commit di rilascio **f19a117fe259c9828c9e57343a26cbd2c7802417** (L2 giro 2: BE 5fd97d9f riscritto, FE
b0ebdad0, c43b8bc0, fcff89e3), dati base **p5s-2026-10-20-0503Z**. Solo letture, grafica predefinita (`p5r-preferenze` assente, controllata
a ogni misura). Misura dal DOM, a finestra emulata, con le animazioni finite; schermate in questa cartella.

## Dove sta il segno
- Indice `/guida/mappe` → voce **Tokyo** → sezione richiudibile **«Elenco completo, con tutti i livelli»**, chiusa all'arrivo.
- Dentro la sezione, l'ultima riga dell'elenco: «Area riservata allo staff · 2 versioni · 0 pin · **Da verificare**».
- La riga sta in un'area scorrevole (`max-h-[420px] area-scorrevole`, bordo 1 px, `overscroll-behavior: contain`).
- La griglia visibile di Tokyo (23 carte dei quartieri) non contiene l'area staff: all'arrivo il segno non si vede
  (`R1-indice-arrivo-1280x800.jpg`).
- Aspetto: chip «Da verificare» 90×22, testo rosso `rgb(229, 53, 43)` su fondo trasparente con bordo, lo stesso della carta dell'area
  staff de La città (90×22).

## Misure (riga dell'area staff con la sezione aperta)
| misura | riga | collegamento | chip «Da verificare» | disposizione | scorrimento orizzontale | schermata |
|---|---|---|---|---|---|---|
| 1280×800 | 638×44 | 284×44 | 90×22 | in riga col nome e i conteggi | no | `R1-indice-da-verificare-1280x800.jpg` |
| 1366×657 | 724×44 | 284×44 | 90×22 | in riga | no | — |
| 1024×690 | 694×44 | 284×44 | 90×22 | in riga | no | `R1-indice-da-verificare-1024x690.jpg` |
| 768×1024 | 656×44 | 284×44 | 90×22 | in riga | no | `R1-indice-da-verificare-768x1024.jpg` |
| 375×812 | 273×75 | 273×53 | 90×22 | il chip va sotto il nome, che sta su due righe (157×45) | no | `R1-indice-da-verificare-375x812.jpg` |
- In nessuna misura ci sono elementi oltre il bordo o testi a una lettera per riga; il collegamento è sempre ≥ 44 px di altezza.
- **Esito R1 (layout): a posto ai tre formati e alle altezze dei portatili.**
- **Osservazione per il PM e FE:** il segno si vede solo aprendo «Elenco completo». Se R1 vuole il segno visibile già nella griglia di
  Tokyo, l'area staff non c'è: la griglia mostra solo i quartieri. Va deciso se basta l'elenco.
- **Decisione del PM (2026-10-20):** il segno deve vedersi senza aprire niente (R2-01b e il validatore). FE aggiunge sulla carta di Tokyo,
  nella griglia visibile, un chip «1 da verificare» che porta all'area dello staff. **R1 va rimisurato su quel chip** ai tre formati e alle
  altezze, quando la correzione arriva sul rilascio. Questo esito resta valido per la riga dell'elenco completo.

## Chip sulla carta di Tokyo — misura preliminare su 5373 (commit a7fe0aee di FE, non ancora sul rilascio)
| misura | chip «1 da verificare» (collegamento) | carta di Tokyo | `main` | scorrimento orizzontale |
|---|---|---|---|---|
| 1280×800 | 91×44, `<a href="/guida/citta/tokyo/area-riservata-allo-staff">` | 300×86 | 1091/732 (indice lungo, come prima) | no |
| 1366×657 | 91×44 | 300×86 | 1091/589 | no |
| 1024×690 | 91×44 | 383×86 | **622/622** | no |
| 768×1024 | 91×44 | 364×86 | 964/964 | no |
| 375×812 | 91×44 | 333×86 | 1165/752 | no |
- Il chip si vede subito, senza aprire niente; è un bersaglio da 44 px e porta all'area dello staff. La carta resta alta 86 px, come le altre.
- **Da ripetere sul collaudo di rilascio** quando il Collaudo dà l'hash: è quella la misura che vale per il validatore.

## Chip sulla carta di Tokyo — misura sul rilascio (collaudo 3301/5473, commit **250122406a3c0afc7abd204df0e5a0ec0764a5a6**, cherry-pick di a7fe0aee; dati p5s-0533Z; 2026-10-20 ~05:55Z)
Solo letture, grafica predefinita, finestra emulata con animazioni finite. Si è controllato anche con `elementFromPoint` che il chip
riceve il tocco al suo centro.
| misura | chip «1 da verificare» | collegamento | riceve il tocco | carta di Tokyo (altre carte) | `main` | orizz. | schermata |
|---|---|---|---|---|---|---|---|
| 1280×800 | 96×44, rosso `rgb(229, 53, 43)` | `<a href="/guida/citta/tokyo/area-riservata-allo-staff">`, aria «1 da verificare: Area riservata allo staff» | sì | 300×86 (90, 86, 86) | 1095/732 (indice lungo) | no | `R1-chip-tokyo-1280x800.jpg` |
| 1366×657 | 96×44 | stesso | sì | 300×86 | 1095/589 | no | — |
| 1280×689 | 96×44 | stesso | sì | 300×86 | 1095/621 | no | — |
| 1024×690 | 96×44 | stesso | sì | 383×86 (86, 86, 86) | **622/622** | no | `R1-chip-tokyo-1024x690.jpg` |
| 768×1024 | 96×44 | stesso | sì | 364×86 | 964/964 | no | `R1-chip-tokyo-768x1024.jpg` |
| 375×812 | 96×44 | stesso | sì | 333×86 | 1184/752 | no | `R1-chip-tokyo-375x812.jpg` |
- Hash finale di L2 per il validatore (dal Collaudo): **625475322b745489e5da1a9b674b5fa7b77e795b**. Rispetto a 25012240 cambia solo
  `docs/ROADMAP.md`, quindi queste misure valgono anche per l'hash finale.
- **Esito R1: verde.** Il segno si vede senza aprire niente, a ogni misura; è un bersaglio da 44 px e porta all'area dello staff. La carta
  resta alta come le altre e l'indice a 1024×690 sta in una schermata.
- **Effetto collaterale, non bloccante, aperto come LAY2-7 (bassa):** il chip toglie spazio alla riga dei conteggi della carta di Tokyo.
  «Città · 298 spilli · 52 mappe» si tronca coi puntini: **49/142 px a 1280 e 1366** (si legge «Città · …»), 82/142 a 375, 113/142 a 768,
  132/142 a 1024.

## LAY2-7 dopo la correzione di FE (126168a0) — misura preliminare su 5373 (2026-10-20, solo letture, grafica predefinita)
| misura | conteggi (visibile/contenuto) | chip «1 da verificare» | riceve il tocco | carta di Tokyo (altre) | `main` | orizz. |
|---|---|---|---|---|---|---|
| 1280×800 | 131/131, interi; chip sotto i conteggi | 91×44 | sì | 300×122 (86) | 1127/732 (indice lungo) | no |
| 1366×657 | 131/131 | 91×44 | sì | 300×122 (86) | 1127/589 | no |
| 1280×689 | 131/131 | 91×44 | sì | 300×122 (86) | 1127/621 | no |
| 1024×690 | 131/131, in riga col chip | 91×44 | sì | 383×86 (86) | **622/622** | no |
| 768×1024 | 118/118, «52 mappe» va a capo | 91×44 | sì | 364×90 (86) | 964/964 | no |
| 375×812 | 87/87 | 91×44 | sì | 333×90 (86) | 1169/752 | no |
- I conteggi sono interi a tutte le misure, e il segno R1 resta visibile senza aprire niente.
- La carta di Tokyo è più alta delle altre: 122 da 1280 in su, 90 a 768 e 375. È una scelta di FE, e a 1024×690 la pagina resta
  in una schermata.
- **Da ripetere sull'hash del Collaudo** (cherry-pick con E4, E5, E7), insieme all'«Elenco completo» di Tokyo.
