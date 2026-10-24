# L5 — proposta di Area per i 44 luoghi senza Area (2026-10-23 sera)

**Decisione dell'utente (23 ottobre sera):** approvate le 16 Aree certe e le 21 esclusioni motivate. Sono approvati anche tutti e 7 i casi incerti: Distributori di Akihabara; Galleria di Kasumi e Mercante Sakai; Aula e Sakura Residence; Venditore di patate dolci e Stazione di Yongen-Jaya. Si applicano con una migrazione conservativa, che scrive l'Area solo se è ancora vuota. Le 21 esclusioni restano senza Area.

Ricerca fatta da un agente distinto, in sola lettura. Fonti: la guida AllGameStaff, i documenti di L5 e la base pubblica `pacchetto/gioco.db`. I pin e le planimetrie citati vanno riscontrati su p5s prima di applicare: la ricerca usa la base pubblica, anteriore alle migrazioni di L5–L7.

**In sintesi:** 23 Aree con prova, 21 esclusioni motivate.

## Esclusioni: il luogo resta senza Area (certezza alta, salvo dove indicato)
- **Quartieri senza planimetrie**: Asakusa (hangout, Skytree), Harajuku (hangout, Takenoko Street), Ichigaya (laghetto), Ikebukuro (planetario), Inokashira (hangout), Maihama (Destinyland), Santuario Meiji (hangout), Nakano Broadway, Ogikubo (ramen), Roppongi (Okumura Foods), Shinagawa (acquario), Suidobashi (Dome Town), Tsukishima (monjayaki), Ueno (museo), Chinatown (hangout).
- **Memento**: l'ingresso e il negozio di Jose; il quartiere non ha planimetrie e i Dedali sono un altro ramo.
- **Libreria Nagiuri**: Jinbocho è un'area a sé, senza planimetria, e non coincide con la Cappella di Kanda.
- **Odaiba Seaside Park**: non è il Cantiere dello stadio (certezza media).
- **Distributori della Shujin**: il luogo riunisce macchine che stanno in più Aree; è una decisione di L5.
- **Stazione di Shibuya**: occupa più planimetrie (certezza media).

## Aree proposte con certezza alta
| Luogo | Area | Prova |
|---|---|---|
| Chiesa di Kanda | Cappella | pin 349 «Chiesa»; guida di Hifumi |
| 37 Gradi Celsius, Tsurukame Diamond, High Sense, Prossimo Asso, Taisho Store | Centro comm. sotterraneo | guida AGS «Negozi nel Centro comm. sotterraneo»; pin 1536–1542 |
| Passaggio del Centro comm. sotterraneo (Ann) | Centro comm. sotterraneo | guida di Ann |
| Bancarella di Chihaya | Quartiere a luci rosse | guida di Chihaya; pin 1561 di fronte |
| Corridoio del 2° piano | Edificio principale 2P / laboratori 2P | guida di Kawakami |
| Infermeria | Edificio principale 1P / laboratori 1P | guida di Maruki; Prima Games |
| Negozio scolastico | Edificio principale 1P / laboratori 1P | pin 293 «Panetteria» |
| Super Muramasa | Vicoli | pin 1589 |
| Gabbie di Battuta | Vicoli | pin 1587 |
| Distributore del bagno pubblico | Vicoli | guida AGS; bagno pubblico pin 1590 |

## Aree proposte con certezza media o bassa (da decidere)
| Luogo | Proposta | Dubbio |
|---|---|---|
| Distributori di Akihabara | Electric Town | È l'unica Area. L'Area non dice quale macchina vende quale listino |
| Galleria di Kasumi (Kichijoji) | Quartiere dello shopping | È l'unica planimetria di Kichijoji; non è provato che la Galleria vi sia disegnata |
| Mercante Sakai | Quartiere dello shopping | Stesso dubbio, per i vicoli centro-occidentali |
| Aula del protagonista | Aula | È deduzione: interrogazioni ed esami si fanno in classe |
| Sakura Residence | Vicoli | La posizione è provata (pin 1641), ma il luogo è visitabile solo negli eventi di Futaba |
| Venditore di patate dolci | Vicoli | Solo una fonte inglese parla di un venditore davanti alla Clinica Takemi |
| Stazione di Yongen-Jaya | Banchina della metropolitana | Legame solo funzionale, planimetria non nativa |

## Applicazione: migrazione 140 (`server/db/migrations/140_aree_dei_luoghi.ts`)
**Conteggio corretto.** I nomi sono quelli approvati, uno per uno, ma i totali del riepilogo erano invertiti. I luoghi collocati sono **21**, non 23. Le esclusioni sono **23**, non 21: i 15 quartieri senza planimetrie contano 17 luoghi, perché Asakusa e Harajuku ne hanno due ciascuno. In tutto 21 + 23 = 44.

Riscontro su una copia di p5s del 23/10 alle 19:35Z, portata allo schema 140:
- **Senza Area:** 44 prima, 23 dopo.
- **Modifiche:** cambiano solo 21 valori di `luogo.area_chiave`; le altre tabelle di `gioco.db` e `partite.db` restano identiche.
- **Idempotenza:** una seconda esecuzione non cambia nulla. Nessuna violazione di chiave esterna.

«Edificio principale / laboratori» è una sola Area per piano (`edificio-principale-1p-edificio-laboratori-1p`, `…-2p-…`), quindi non c'era una scelta da fare:
- Corridoio del 2° piano → 2P;
- Infermeria e Negozio scolastico → 1P.

Restano **senza Area** per decisione dell'utente (esclusioni motivate sopra):
- **Quartieri senza planimetrie:** `asakusa/asakusa-hangout`, `asakusa/tokyo-skytree`, `harajuku/harajuku-hangout`, `harajuku/takenoko-street`, `ichigaya/laghetto-ichigaya`, `ikebukuro/planetario-ikebukuro`, `inokashira-park/inokashira-hangout`, `maihama/destinyland`, `meiji-shrine/meiji-shrine-hangout`, `nakano/nakano-broadway`, `ogikubo/ogikubo-ramen`, `roppongi/okumura-foods-hq`, `shinagawa/shinagawa-acquario`, `suidobashi/dome-town`, `tsukishima/tsukishima-monjayaki`, `ueno/museo-ueno`, `yokohama-chinatown/chinatown-hangout`.
- **Altre esclusioni:** `mementos/ingresso-mementos`, `mementos/negozio-jose`, `kanda-jinbocho/nagiuri`, `odaiba/odaiba-seaside-park`, `shujin-academy/distributori-shujin`, `shibuya/stazione-shibuya`.
