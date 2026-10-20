# L2, giro 2 — LAY2-7 sul rilascio (Test layout multi device, 2026-10-20)

Collaudo BE 3301 / FE 5473 sul commit **872ac9767730e90a37d26a05c22f16991f146d38**: cherry-pick di 126168a0 sopra 62547532, tocca solo
`src/pages/MappaPage.tsx`. Base dati L2-base-p5s-20261020-0533Z; cambia solo la cache `immagine_miniatura`, scritta dalle letture.
Solo letture. Grafica predefinita, controllata a ogni misura. Misura dal DOM in un iframe della stessa origine grande quanto la finestra, con le
animazioni finite. `elementFromPoint` al centro del chip controlla che riceva il tocco.

## Carta di Tokyo nell'indice `/guida/mappe`
| misura | conteggi «Città · 298 spilli · 52 mappe» (visibile/contenuto) | chip «1 da verificare» | riceve il tocco | carta di Tokyo (altre carte) | `main` | orizz. |
|---|---|---|---|---|---|---|
| 1280×800 | **131/131, interi**; chip sotto i conteggi | 91×44, `rgb(229, 53, 43)`, aria «1 da verificare: Area riservata allo staff», `href=/guida/citta/tokyo/area-riservata-allo-staff` | sì | 300×122 (86, 86, 86) | 1127/732 (indice lungo, come prima) | no |
| 1366×657 | **131/131** | stesso | sì | 300×122 (86) | 1127/589 | no |
| 768×1024 | **118/118** («52 mappe» va a capo) | stesso | sì | 364×90 (86) | 964/964 | no |
| 375×812 | **87/87** | stesso | sì | 333×90 (86) | 1169/752 | no |
| in più: 1024×690 | 131/131, in riga col chip | stesso | — | 86 | **622/622** | no |
| in più: 1280×689 | 131/131 | stesso | — | 122 | 1127/621 | no |

- Sul rilascio i conteggi si leggono interi a ogni misura. Prima erano troncati in «Città · …», 49/142 px a 1280 e 1366.
- Il chip resta lo stesso: testo, colore, etichetta, destinazione e altezza 44 px, e riceve il tocco ovunque. È più stretto di 5 px,
  da 96 a 91, per il nuovo posto in cui sta. Non ha effetti: il bersaglio resta ≥ 44 px.
- La carta di Tokyo è più alta delle altre: 122 px da 1280 in su, 90 a 768 e 375. L'indice resta in una schermata a 1024×690 e a 768×1024.
- Le misure coincidono con la misura preliminare su 5373 (126168a0).
- Nessuno scorrimento orizzontale, nessun elemento oltre il bordo della carta.

**Esito LAY2-7 sul rilascio 872ac976: verde.**
