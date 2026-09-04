# Stato della generazione degli asset

Registro richiesto dall’utente il 2026-09-03. Fonte: `prompt-immagini.md`, `riferimenti-visivi.md` e `data/seed/persona.json`.

**521 file richiesti: 235 completati e approvati, 286 ancora da consegnare** (37 aggiunti il 2026-09-04 con la Fase 11.6: §13 di `prompt-immagini.md`).

Navigazione§7.1 completata:12file salvati e approvati. Non rigenerarli.

Arcani completati: tutte le 48 carte, incluse le varianti senza testo, e tutte le 24 icone sono approvate da galaxy_task_validator.

## Generazioni non consegnate

Nessuna. La coppia Appeso è stata consegnata dall’utente come PNG RGBA con alfa reale, ridotta proporzionalmente e approvata da galaxy_task_validator.

## Regole operative

- Non rigenerare né sostituire i file marcati COMPLETATO senza una richiesta esplicita dell’utente.
- Prima di generare un file, controllare questo registro e la sua presenza effettiva.
- Le leggere differenze fra asset sono ammesse dall’utente; alfa reale, soggetti, testo e dimensioni restano obbligatori.
- Nessuna scacchiera finta e nessuno sfondo opaco dove è prevista trasparenza.
- I file presenti soltanto nella cartella delle generazioni sono candidati, non consegne completate.
- Affinità complete:12icone (§5), incluse tutte le varianti senza testo, approvate da galaxy_task_validator.
- Elementi completi:16icone (§4) approvate da galaxy_task_validator; alfa reale e leggibilità32px su chiaro/scuro verificate.
- Sfondi completi: quattro file (§2) approvati da galaxy_task_validator; pattern verificato anche in ripetizione 2×2.
- Identità completa: quattro loghi (§1.1), tre icone (§1.2) e quattro splash (§1.3) approvati da galaxy_task_validator.
- Scale-up in Python autorizzato dall’utente, purché il rapporto di forma sia già corretto: fattore identico sui due assi, nessun ritaglio o deformazione.
- Ordine richiesto dall’utente: completare la categoria `persona` per ultima, dopo illustrazioni, confidenti e meteo.
- Per ciascuno dei 23 Confidenti conservare la versione originale già generata e aggiungere una seconda variante `-fedele`, nello stesso stile ma basata sulle fattezze originali mostrate nella guida Steam indicata dall’utente.
- Per ciascun asset `persona`, recuperare prima un riferimento visivo originale e tradurne i tratti riconoscibili in un prompt testuale preciso per la reinterpretazione richiesta dal §10. Usare lo stesso metodo approvato per i Confidenti fedeli: Imagegen senza riferimento allegato, stile uniforme, alfa nativo prodotto in generazione e nessuno scontorno successivo.

## Riepilogo

| Categoria | Richiesti | Completati | Da consegnare |
|---|---:|---:|---:|
| identita | 11 | 11 | 0 |
| sfondi | 4 | 4 | 0 |
| arcani | 72 | 72 | 0 |
| elementi | 16 | 16 | 0 |
| affinita | 12 | 12 | 0 |
| doti | 12 | 12 | 0 |
| ui | 51 | 47 | 4 |
| illustrazioni | 23 | 15 | 8 |
| confidenti | 46 | 46 | 0 |
| persona | 232 | 57 | 175 |
| meteo | 17 | 17 | 0 |
| guida | 15 | 0 | 15 |
| palazzi | 10 | 0 | 10 |

## Elenco
### ui
- [ ] **DA CONSEGNARE** — `public/asset/ui/nav-guida.png` — 256×256 (§13.1)
- [ ] **DA CONSEGNARE** — `public/asset/ui/nav-guida-attiva.png` — 256×256 (§13.1)
- [ ] **DA CONSEGNARE** — `public/asset/ui/giorno.png` — 256×256 (§13.4)
- [ ] **DA CONSEGNARE** — `public/asset/ui/sera.png` — 256×256 (§13.4)

### illustrazioni
- [ ] **DA CONSEGNARE** — `public/asset/illustrazioni/vuoto-obiettivi.png` — 1200×800 (§13.5)
- [ ] **DA CONSEGNARE** — `public/asset/illustrazioni/vuoto-obiettivi-senza-testo.png` — 1200×800 (§13.5)
- [ ] **DA CONSEGNARE** — `public/asset/illustrazioni/vuoto-piani.png` — 1200×800 (§13.5)
- [ ] **DA CONSEGNARE** — `public/asset/illustrazioni/vuoto-piani-senza-testo.png` — 1200×800 (§13.5)
- [ ] **DA CONSEGNARE** — `public/asset/illustrazioni/vuoto-cicli.png` — 1200×800 (§13.5)
- [ ] **DA CONSEGNARE** — `public/asset/illustrazioni/vuoto-cicli-senza-testo.png` — 1200×800 (§13.5)
- [ ] **DA CONSEGNARE** — `public/asset/illustrazioni/vuoto-storico.png` — 1200×800 (§13.5)
- [ ] **DA CONSEGNARE** — `public/asset/illustrazioni/vuoto-storico-senza-testo.png` — 1200×800 (§13.5)

### guida
- [ ] **DA CONSEGNARE** — `public/asset/guida/percorso.png` — 256×256 (§13.2)
- [ ] **DA CONSEGNARE** — `public/asset/guida/domande.png` — 256×256 (§13.2)
- [ ] **DA CONSEGNARE** — `public/asset/guida/cruciverba.png` — 256×256 (§13.2)
- [ ] **DA CONSEGNARE** — `public/asset/guida/calendario.png` — 256×256 (§13.2)
- [ ] **DA CONSEGNARE** — `public/asset/guida/dungeon.png` — 256×256 (§13.2)
- [ ] **DA CONSEGNARE** — `public/asset/guida/richieste.png` — 256×256 (§13.2)
- [ ] **DA CONSEGNARE** — `public/asset/guida/battaglia.png` — 256×256 (§13.2)
- [ ] **DA CONSEGNARE** — `public/asset/guida/citta.png` — 256×256 (§13.2)
- [ ] **DA CONSEGNARE** — `public/asset/guida/negozi.png` — 256×256 (§13.2)
- [ ] **DA CONSEGNARE** — `public/asset/guida/attivita.png` — 256×256 (§13.2)
- [ ] **DA CONSEGNARE** — `public/asset/guida/completamento.png` — 256×256 (§13.2)
- [ ] **DA CONSEGNARE** — `public/asset/guida/sfide.png` — 256×256 (§13.2)
- [ ] **DA CONSEGNARE** — `public/asset/guida/personaggi.png` — 256×256 (§13.2)
- [ ] **DA CONSEGNARE** — `public/asset/guida/oggetti.png` — 256×256 (§13.2)
- [ ] **DA CONSEGNARE** — `public/asset/guida/confidenti.png` — 256×256 (§13.2)

### palazzi
- [ ] **DA CONSEGNARE** — `public/asset/palazzi/kamoshida.png` — 512×512 (§13.3)
- [ ] **DA CONSEGNARE** — `public/asset/palazzi/madarame.png` — 512×512 (§13.3)
- [ ] **DA CONSEGNARE** — `public/asset/palazzi/kaneshiro.png` — 512×512 (§13.3)
- [ ] **DA CONSEGNARE** — `public/asset/palazzi/futaba.png` — 512×512 (§13.3)
- [ ] **DA CONSEGNARE** — `public/asset/palazzi/okumura.png` — 512×512 (§13.3)
- [ ] **DA CONSEGNARE** — `public/asset/palazzi/niijima.png` — 512×512 (§13.3)
- [ ] **DA CONSEGNARE** — `public/asset/palazzi/shido.png` — 512×512 (§13.3)
- [ ] **DA CONSEGNARE** — `public/asset/palazzi/iweleth.png` — 512×512 (§13.3)
- [ ] **DA CONSEGNARE** — `public/asset/palazzi/maruki.png` — 512×512 (§13.3)
- [ ] **DA CONSEGNARE** — `public/asset/palazzi/mementos.png` — 512×512 (§13.3)

### persona
- [ ] **GENERATO — validazione lotto in corso** — `public/asset/persona/fuu-ki.png` — 768×768
- [ ] **GENERATO — validazione lotto in corso** — `public/asset/persona/izanagi-picaro.png` — 768×768
- [ ] **GENERATO — validazione lotto in corso** — `public/asset/persona/sandman.png` — 768×768
- [ ] **GENERATO — validazione lotto in corso** — `public/asset/persona/naga.png` — 768×768
- [ ] **GENERATO — validazione lotto in corso** — `public/asset/persona/rakshasa.png` — 768×768
- [ ] **GENERATO — validazione lotto in corso** — `public/asset/persona/sui-ki.png` — 768×768
- [ ] **GENERATO — validazione lotto in corso** — `public/asset/persona/anzu.png` — 768×768
- [ ] **GENERATO — validazione lotto in corso** — `public/asset/persona/kaguya-picaro.png` — 768×768
- [ ] **GENERATO — validazione lotto in corso** — `public/asset/persona/kin-ki.png` — 768×768
- [ ] **GENERATO — validazione lotto in corso** — `public/asset/persona/koh-i-noor.png` — 768×768
- [ ] **GENERATO — validazione lotto in corso** — `public/asset/persona/setanta.png` — 768×768
- [ ] **GENERATO — validazione lotto in corso** — `public/asset/persona/isis.png` — 768×768
- [ ] **GENERATO — validazione lotto in corso** — `public/asset/persona/lamia.png` — 768×768
- [ ] **GENERATO — validazione lotto in corso** — `public/asset/persona/orpheus.png` — 768×768
- [ ] **GENERATO — validazione lotto in corso** — `public/asset/persona/take-minakata.png` — 768×768
- [ ] **GENERATO — validazione lotto in corso** — `public/asset/persona/andras.png` — 768×768
- [ ] **GENERATO — validazione lotto in corso** — `public/asset/persona/clotho.png` — 768×768
- [ ] **GENERATO — validazione lotto in corso** — `public/asset/persona/tam-lin.png` — 768×768
- [ ] **GENERATO — validazione lotto in corso** — `public/asset/persona/choronzon.png` — 768×768
- [ ] **GENERATO — validazione lotto in corso** — `public/asset/persona/pisaca.png` — 768×768
- [ ] **GENERATO — validazione lotto in corso** — `public/asset/persona/orpheus-picaro.png` — 768×768
- [ ] **GENERATO — validazione lotto in corso** — `public/asset/persona/principality.png` — 768×768
- [ ] **GENERATO — validazione lotto in corso** — `public/asset/persona/ara-mitama.png` — 768×768
- [ ] **GENERATO — validazione lotto in corso** — `public/asset/persona/ariadne.png` — 768×768
- [ ] **GENERATO — validazione lotto in corso** — `public/asset/persona/neko-shogun.png` — 768×768
- [ ] **GENERATO — validazione lotto in corso** — `public/asset/persona/orlov.png` — 768×768
- [ ] **GENERATO — validazione lotto in corso** — `public/asset/persona/kurama-tengu.png` — 768×768
- [ ] **GENERATO — validazione lotto in corso** — `public/asset/persona/zouchouten.png` — 768×768
- [ ] **GENERATO — validazione lotto in corso** — `public/asset/persona/decarabia.png` — 768×768
- [ ] **GENERATO — validazione lotto in corso** — `public/asset/persona/lilim.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/mitra.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/mothman.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/anubis.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/thunderbird.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/arahabaki.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/emperors-amulet.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/lachesis.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/kaiwan.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/thoth.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/belphegor.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/hell-biker.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/legion.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/white-rider.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/atropos.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/mithras.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/unicorn.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/daisoujou.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/hariti.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/hope-diamond.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/kikuri-hime.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/power.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/red-rider.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/ariadne-picaro.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/hecatoncheires.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/kumbhanda.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/kushinada.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/ose.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/girimehkala.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/queen-mab.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/yurlungur.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/ananta.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/magatsu-izanagi.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/valkyrie.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/byakko.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/pazuzu.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/athena.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/fortuna.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/horus.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/magatsu-izanagi-picaro.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/narcissus.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/rangda.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/bugs.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/koumokuten.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/athena-picaro.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/crystal-skull.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/dakini.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/sarasvati.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/tsukiyomi.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/jatayu.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/seth.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/barong.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/garuda.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/mishaguji.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/norn.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/ganesha.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/skadi.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/okuninushi.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/pale-rider.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/cerberus.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/raja-naga.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/tsukiyomi-picaro.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/asterius.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/parvati.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/titania.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/yatagarasu.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/baphomet.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/melchizedek.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/black-rider.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/trumpeter.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/lilith.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/moloch.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/orichalcum.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/king-frost.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/asterius-picaro.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/chernobog.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/seiryu.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/forneus.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/kali.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/hanuman.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/thor.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/yamata-no-orochi.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/atavaka.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/thanatos.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/oberon.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/quetzalcoatl.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/bishamonten.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/black-frost.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/dominion.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/vasuki.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/lakshmi.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/thanatos-picaro.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/byakhee.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/loa.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/dionysus.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/mot.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/throne.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/macabre.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/mara.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/chimera.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/nebiros.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/abaddon.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/sandalphon.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/asura.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/cu-chulainn.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/kohryu.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/raoul.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/gabriel.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/scathach.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/raphael.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/izanagi-no-okami.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/sraosha.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/vohu-manah.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/zaou-gongen.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/alilat.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/messiah.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/uriel.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/attis.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/baal.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/belial.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/shiva.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/alice.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/cybele.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/surt.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/vishnu.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/ardha.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/hastur.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/odin.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/siegfried.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/ishtar.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/mother-harlot.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/fafnir.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/futsunushi.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/beelzebub.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/michael.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/yoshitsune.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/chi-you.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/izanagi-no-okami-picaro.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/metatron.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/ongyo-ki.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/mada.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/messiah-picaro.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/satan.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/lucifer.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/maria.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/satanael.png` — 768×768
