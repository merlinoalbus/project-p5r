# Stato della generazione degli asset

Registro richiesto dall’utente il 2026-09-03. Fonte: `prompt-immagini.md`, `riferimenti-visivi.md` e `data/seed/persona.json`.

**484 file richiesti: 235 completati e approvati, 249 ancora da consegnare.**

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
| ui | 47 | 47 | 0 |
| illustrazioni | 15 | 15 | 0 |
| confidenti | 46 | 46 | 0 |
| persona | 232 | 0 | 232 |
| meteo | 17 | 0 | 17 |

## Elenco completo

### identita

- [x] **COMPLETATO — approvato** — `public/asset/identita/logo.png` — 1024×1024
- [x] **COMPLETATO — approvato** — `public/asset/identita/logo-senza-testo.png` — 1024×1024
- [x] **COMPLETATO — approvato** — `public/asset/identita/logo-orizzontale.png` — 1600×500
- [x] **COMPLETATO — approvato** — `public/asset/identita/logo-orizzontale-senza-testo.png` — 1600×500
- [x] **COMPLETATO — approvato** — `public/asset/identita/icona-512.png` — 512×512
- [x] **COMPLETATO — approvato** — `public/asset/identita/icona-192.png` — 192×192
- [x] **COMPLETATO — approvato** — `public/asset/identita/icona-32.png` — 32×32
- [x] **COMPLETATO — approvato** — `public/asset/identita/splash-verticale.webp` — 1536×2048
- [x] **COMPLETATO — approvato** — `public/asset/identita/splash-verticale-senza-testo.webp` — 1536×2048
- [x] **COMPLETATO — approvato** — `public/asset/identita/splash-orizzontale.webp` — 2048×1536
- [x] **COMPLETATO — approvato** — `public/asset/identita/splash-orizzontale-senza-testo.webp` — 2048×1536

### sfondi

- [x] **COMPLETATO — approvato** — `public/asset/sfondi/pattern-nero.webp` — 2048×2048
- [x] **COMPLETATO — approvato** — `public/asset/sfondi/stanza-velluto.webp` — 2560×1440
- [x] **COMPLETATO — approvato** — `public/asset/sfondi/stanza-velluto-allarme.webp` — 2560×1440
- [x] **COMPLETATO — approvato** — `public/asset/sfondi/mementos.webp` — 2560×1440

### arcani

- [x] **COMPLETATO — approvato** — `public/asset/arcani/fool.png` — 768×1344
- [x] **COMPLETATO — approvato** — `public/asset/arcani/fool-senza-testo.png` — 768×1344
- [x] **COMPLETATO — approvato** — `public/asset/arcani/magician.png` — 768×1344
- [x] **COMPLETATO — approvato** — `public/asset/arcani/magician-senza-testo.png` — 768×1344
- [x] **COMPLETATO — approvato** — `public/asset/arcani/priestess.png` — 768×1344
- [x] **COMPLETATO — approvato** — `public/asset/arcani/priestess-senza-testo.png` — 768×1344
- [x] **COMPLETATO — approvato** — `public/asset/arcani/empress.png` — 768×1344
- [x] **COMPLETATO — approvato** — `public/asset/arcani/empress-senza-testo.png` — 768×1344
- [x] **COMPLETATO — approvato** — `public/asset/arcani/emperor.png` — 768×1344
- [x] **COMPLETATO — approvato** — `public/asset/arcani/emperor-senza-testo.png` — 768×1344
- [x] **COMPLETATO — approvato** — `public/asset/arcani/hierophant.png` — 768×1344
- [x] **COMPLETATO — approvato** — `public/asset/arcani/hierophant-senza-testo.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/lovers.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/lovers-senza-testo.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/chariot.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/chariot-senza-testo.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/justice.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/justice-senza-testo.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/hermit.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/hermit-senza-testo.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/fortune.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/fortune-senza-testo.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/strength.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/strength-senza-testo.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/hanged.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/hanged-senza-testo.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/death.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/death-senza-testo.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/temperance.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/temperance-senza-testo.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/devil.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/devil-senza-testo.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/tower.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/tower-senza-testo.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/star.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/star-senza-testo.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/moon.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/moon-senza-testo.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/sun.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/sun-senza-testo.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/judgement.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/judgement-senza-testo.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/world.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/world-senza-testo.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/faith.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/faith-senza-testo.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/councillor.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/councillor-senza-testo.png` — 768×1344
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/icona/fool.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/icona/magician.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/icona/priestess.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/icona/empress.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/icona/emperor.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/icona/hierophant.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/icona/lovers.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/icona/chariot.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/icona/justice.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/icona/hermit.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/icona/fortune.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/icona/strength.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/icona/hanged.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/icona/death.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/icona/temperance.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/icona/devil.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/icona/tower.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/icona/star.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/icona/moon.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/icona/sun.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/icona/judgement.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/icona/world.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/icona/faith.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/arcani/icona/councillor.png` — 256×256

### elementi

- [x] **COMPLETATO — approvato** — `public/asset/elementi/phys.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/elementi/gun.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/elementi/fire.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/elementi/ice.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/elementi/electric.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/elementi/wind.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/elementi/psy.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/elementi/nuclear.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/elementi/bless.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/elementi/curse.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/elementi/almighty.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/elementi/healing.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/elementi/ailment.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/elementi/support.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/elementi/passive.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/elementi/trait.png` — 256×256

### affinita

- [x] **COMPLETATO — approvato** — `public/asset/affinita/wk.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/affinita/wk-senza-testo.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/affinita/rs.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/affinita/rs-senza-testo.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/affinita/nu.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/affinita/nu-senza-testo.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/affinita/rp.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/affinita/rp-senza-testo.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/affinita/ab.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/affinita/ab-senza-testo.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/affinita/normale.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/affinita/normale-senza-testo.png` — 256×256

### doti

- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/doti/conoscenza.png` — 512×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/doti/conoscenza-senza-testo.png` — 512×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/doti/fascino.png` — 512×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/doti/fascino-senza-testo.png` — 512×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/doti/coraggio.png` — 512×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/doti/coraggio-senza-testo.png` — 512×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/doti/gentilezza.png` — 512×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/doti/gentilezza-senza-testo.png` — 512×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/doti/perizia.png` — 512×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/doti/perizia-senza-testo.png` — 512×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/doti/stella-vuota.png` — 1024×1024
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/doti/stella-vuota-senza-testo.png` — 1024×1024

### ui

- [x] **COMPLETATO — approvato** — `public/asset/ui/nav-home.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/ui/nav-home-attiva.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/ui/nav-compendio.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/ui/nav-compendio-attiva.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/ui/nav-skill.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/ui/nav-skill-attiva.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/ui/nav-fusione.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/ui/nav-fusione-attiva.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/ui/nav-partita.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/ui/nav-partita-attiva.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/ui/nav-impostazioni.png` — 256×256
- [x] **COMPLETATO — approvato** — `public/asset/ui/nav-impostazioni-attiva.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/rango-1.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/rango-2.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/rango-3.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/rango-4.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/rango-5.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/rango-6.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/rango-7.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/rango-8.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/rango-9.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/rango-max.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/rango-senza-testo.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/badge-allarme.png` — 512×192
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/badge-dlc.png` — 512×192
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/badge-tesoro.png` — 512×192
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/badge-speciale.png` — 512×192
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/badge-nuova-partita.png` — 512×192
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/badge-senza-testo.png` — 512×192
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/badge-allarme-senza-testo.png` — 512×192
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/pulsante-primario.png` — 600×160
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/pulsante-secondario.png` — 600×160
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/cornice-scheda.png` — 1600×1000
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/stat-forza.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/stat-magia.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/stat-resistenza.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/stat-agilita.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/stat-fortuna.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/tesoro-crystal-skull.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/tesoro-koh-i-noor.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/tesoro-queens-necklace.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/tesoro-regent.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/tesoro-stone-of-scone.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/tesoro-orlov.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/tesoro-emperors-amulet.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/tesoro-hope-diamond.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/ui/tesoro-orichalcum.png` — 256×256

### illustrazioni

- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/illustrazioni/vuoto-persona.png` — 1200×800
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/illustrazioni/vuoto-persona-senza-testo.png` — 1200×800
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/illustrazioni/vuoto-partita.png` — 1200×800
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/illustrazioni/vuoto-partita-senza-testo.png` — 1200×800
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/illustrazioni/errore.png` — 1200×800
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/illustrazioni/errore-senza-testo.png` — 1200×800
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/illustrazioni/caricamento.png` — 1200×800
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/illustrazioni/caricamento-1.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/illustrazioni/caricamento-2.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/illustrazioni/caricamento-3.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/illustrazioni/caricamento-4.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/illustrazioni/caricamento-5.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/illustrazioni/caricamento-6.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/illustrazioni/caricamento-7.png` — 256×256
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/illustrazioni/caricamento-8.png` — 256×256

### confidenti

- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/confidenti/igor.png` — 768×1024
- [x] **COMPLETATO — approvato dall’utente** — `public/asset/confidenti/morgana.png` — 768×1024
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/confidenti/ryuji.png` — 768×1024
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/confidenti/ann.png` — 768×1024
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/confidenti/yusuke.png` — 768×1024
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/confidenti/makoto.png` — 768×1024
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/confidenti/futaba.png` — 768×1024
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/confidenti/haru.png` — 768×1024
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/confidenti/akechi.png` — 768×1024
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/confidenti/kasumi.png` — 768×1024
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/confidenti/sojiro.png` — 768×1024
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/confidenti/takemi.png` — 768×1024
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/confidenti/kawakami.png` — 768×1024
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/confidenti/yoshida.png` — 768×1024
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/confidenti/mishima.png` — 768×1024
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/confidenti/ohya.png` — 768×1024
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/confidenti/hifumi.png` — 768×1024
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/confidenti/chihaya.png` — 768×1024
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/confidenti/iwai.png` — 768×1024
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/confidenti/shinya.png` — 768×1024
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/confidenti/gemelle.png` — 768×1024
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/confidenti/sae.png` — 768×1024
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/confidenti/maruki.png` — 768×1024

#### Varianti fedeli ai riferimenti originali

- [x] **COMPLETATO — approvato dall’utente** — `public/asset/confidenti/igor-fedele.png` — 768×1024
- [x] **COMPLETATO — approvato dall’utente** — `public/asset/confidenti/morgana-fedele.png` — 768×1024
- [x] **COMPLETATO — approvato dall’utente** — `public/asset/confidenti/ryuji-fedele.png` — 768×1024
- [x] **COMPLETATO — approvato dall’utente** — `public/asset/confidenti/ann-fedele.png` — 768×1024
- [x] **COMPLETATO — approvato dall’utente** — `public/asset/confidenti/yusuke-fedele.png` — 768×1024
- [x] **COMPLETATO — approvato dall’utente** — `public/asset/confidenti/makoto-fedele.png` — 768×1024
- [x] **COMPLETATO — approvato dall’utente** — `public/asset/confidenti/futaba-fedele.png` — 768×1024
- [x] **COMPLETATO — approvato dall’utente** — `public/asset/confidenti/haru-fedele.png` — 768×1024
- [x] **COMPLETATO — approvato dall’utente** — `public/asset/confidenti/akechi-fedele.png` — 768×1024
- [x] **COMPLETATO — approvato dall’utente** — `public/asset/confidenti/kasumi-fedele.png` — 768×1024
- [x] **COMPLETATO — approvato dall’utente** — `public/asset/confidenti/sojiro-fedele.png` — 768×1024
- [x] **COMPLETATO — approvato dall’utente** — `public/asset/confidenti/takemi-fedele.png` — 768×1024
- [x] **COMPLETATO — approvato dall’utente** — `public/asset/confidenti/kawakami-fedele.png` — 768×1024
- [x] **COMPLETATO — approvato dall’utente** — `public/asset/confidenti/yoshida-fedele.png` — 768×1024
- [x] **COMPLETATO — approvato dall’utente** — `public/asset/confidenti/mishima-fedele.png` — 768×1024
- [x] **COMPLETATO — approvato dall’utente** — `public/asset/confidenti/ohya-fedele.png` — 768×1024
- [x] **COMPLETATO — approvato dall’utente** — `public/asset/confidenti/hifumi-fedele.png` — 768×1024
- [x] **COMPLETATO — approvato dall’utente** — `public/asset/confidenti/chihaya-fedele.png` — 768×1024
- [x] **COMPLETATO — approvato dall’utente** — `public/asset/confidenti/iwai-fedele.png` — 768×1024
- [x] **COMPLETATO — approvato dall’utente** — `public/asset/confidenti/shinya-fedele.png` — 768×1024
- [x] **COMPLETATO — approvato dall’utente** — `public/asset/confidenti/gemelle-fedele.png` — 768×1024
- [x] **COMPLETATO — approvato dall’utente** — `public/asset/confidenti/sae-fedele.png` — 768×1024
- [x] **COMPLETATO — approvato dall’utente** — `public/asset/confidenti/maruki-fedele.png` — 768×1024

### persona

- [ ] **DA CONSEGNARE** — `public/asset/persona/arsene.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/jack-o-lantern.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/pixie.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/agathion.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/mandrake.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/bicorn.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/cait-sith.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/incubus.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/kelpie.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/saki-mitama.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/silky.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/genbu.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/succubus.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/obariyon.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/angel.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/berith.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/hua-po.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/koropokkuru.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/mokoi.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/regent.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/slime.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/apsaras.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/jack-frost.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/kodama.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/koppa-tengu.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/orpheus-f.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/kushi-mitama.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/onmoraki.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/ame-no-uzume.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/ippon-datara.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/orpheus-f-picaro.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/archangel.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/inugami.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/makami.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/queens-necklace.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/shiisaa.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/eligor.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/high-pixie.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/kaguya.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/suzaku.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/matador.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/nekomata.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/orobas.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/sudama.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/black-ooze.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/shiki-ouji.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/flauros.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/leanan-sidhe.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/izanagi.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/nue.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/oni.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/stone-of-scone.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/yaksini.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/orthrus.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/phoenix.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/jikokuten.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/nigi-mitama.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/fuu-ki.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/izanagi-picaro.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/sandman.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/naga.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/rakshasa.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/sui-ki.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/anzu.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/kaguya-picaro.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/kin-ki.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/koh-i-noor.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/setanta.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/isis.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/lamia.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/orpheus.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/take-minakata.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/andras.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/clotho.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/tam-lin.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/choronzon.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/pisaca.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/orpheus-picaro.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/principality.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/ara-mitama.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/ariadne.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/neko-shogun.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/orlov.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/kurama-tengu.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/zouchouten.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/decarabia.png` — 768×768
- [ ] **DA CONSEGNARE** — `public/asset/persona/lilim.png` — 768×768
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

### meteo

- [ ] **DA CONSEGNARE** — `public/asset/meteo/sereno.png` — 256×256
- [ ] **DA CONSEGNARE** — `public/asset/meteo/nuvoloso.png` — 256×256
- [ ] **DA CONSEGNARE** — `public/asset/meteo/pioggia.png` — 256×256
- [ ] **DA CONSEGNARE** — `public/asset/meteo/temporale.png` — 256×256
- [ ] **DA CONSEGNARE** — `public/asset/meteo/neve.png` — 256×256
- [ ] **DA CONSEGNARE** — `public/asset/meteo/nebbia.png` — 256×256
- [ ] **DA CONSEGNARE** — `public/asset/meteo/caldo.png` — 256×256
- [ ] **DA CONSEGNARE** — `public/asset/meteo/freddo.png` — 256×256
- [ ] **DA CONSEGNARE** — `public/asset/meteo/polline.png` — 256×256
- [ ] **DA CONSEGNARE** — `public/asset/meteo/tifone.png` — 256×256
- [ ] **DA CONSEGNARE** — `public/asset/meteo/fascia-mattina.png` — 600×160
- [ ] **DA CONSEGNARE** — `public/asset/meteo/fascia-pausa-pranzo.png` — 600×160
- [ ] **DA CONSEGNARE** — `public/asset/meteo/fascia-dopo-la-scuola.png` — 600×160
- [ ] **DA CONSEGNARE** — `public/asset/meteo/fascia-sera.png` — 600×160
- [ ] **DA CONSEGNARE** — `public/asset/meteo/fascia-notte.png` — 600×160
- [ ] **DA CONSEGNARE** — `public/asset/meteo/fascia-giornata.png` — 600×160
- [ ] **DA CONSEGNARE** — `public/asset/meteo/fascia-senza-testo.png` — 600×160

## Sorgenti degli splash completati

Recuperate le bozze esistenti e generate soltanto le due varianti senza testo mancanti. Esportazione WEBP lossless mediante scale-up Lanczos uniforme autorizzato, senza ritagli o deformazioni. Tutti e quattro i file finali sono approvati.

Cartella sorgenti: `C:/Users/rober/.codex/generated_images/01a06714-03f1-7730-85d6-8727247cf881/`.

| File completato | Sorgente | Dimensioni sorgente | Dimensioni finali |
|---|---|---|---|
| `identita/splash-verticale.webp` | `exec-8049f942-721c-4f6d-b0d7-b230bfc88bf8.png` | 1086×1448 | 1536×2048 |
| `identita/splash-verticale-senza-testo.webp` | `exec-9d710784-38db-487e-96c3-d34f47428f36.png` | 1086×1448 | 1536×2048 |
| `identita/splash-orizzontale.webp` | `exec-9e6fdeb3-c889-4eae-8498-71a593fedea4.png` | 1448×1086 | 2048×1536 |
| `identita/splash-orizzontale-senza-testo.webp` | `exec-422ddca8-f254-4a83-a0c1-48ea7532c3a7.png` | 1448×1086 | 2048×1536 |

## Sorgenti degli sfondi completati

Generati con Imagegen, esportati WEBP lossless mediante ingrandimento proporzionale autorizzato. Per i panorami, il formato16:9 generato è arrotondato a1672×941: contenuto proporzionale2559×1440 e un solo pixel laterale di margine, senza ritaglio.

| File completato | Sorgente nella cartella delle generazioni |
|---|---|
| `sfondi/pattern-nero.webp` | `exec-c7419c50-df39-4ff2-9276-654a24602586.png` |
| `sfondi/stanza-velluto.webp` | `exec-e6dfcaf6-82e6-4d08-89c2-1331ee3143e6.png` |
| `sfondi/stanza-velluto-allarme.webp` | `exec-5e501c5f-8bb4-4299-a653-5e08120e7125.png` |
| `sfondi/mementos.webp` | `exec-27a7dbaf-9b4c-4ea0-9bfa-831d7f2e3d47.png` |

## Sorgenti degli elementi completati

Generati con Imagegen usando il blocco pop punk del §4: tondo nero irregolare, simbolo nei due toni prescritti, contorno nero e riflesso bianco. Prompt esplicito per PNG RGBA con alfa zero fuori dal tondo, senza sfondo o scacchiera. Riduzione proporzionale della tela quadrata a256×256, mantenendo l’alfa nativa, senza scontorno o ritagli. Tutti16 approvati.

| File completato | Sorgente nella cartella delle generazioni |
|---|---|
| `elementi/phys.png` | `exec-cb2c55e0-c7e9-44c1-acf3-33270c9259e4.png` |
| `elementi/gun.png` | `exec-c2f905f1-f21d-462b-9c84-a37f73768a40.png` |
| `elementi/fire.png` | `exec-6c5b8a07-3c4f-4751-9900-bb6544337b03.png` |
| `elementi/ice.png` | `exec-a3e6d421-bdeb-4950-ae36-1ea0927e1d86.png` |
| `elementi/electric.png` | `exec-080520b1-99ae-41d7-a5c2-3429c57acd79.png` |
| `elementi/wind.png` | `exec-4478eeb9-e194-41c1-a717-d698d7985e6c.png` |
| `elementi/psy.png` | `exec-a92f1deb-b4ae-47b8-8c2a-c7ccad7d368c.png` |
| `elementi/nuclear.png` | `exec-824c750b-11e7-4f51-9fbe-91401d1497ba.png` |
| `elementi/bless.png` | `exec-ebfe525b-618d-4230-b603-94c2d36f08a8.png` |
| `elementi/curse.png` | `exec-c04f39fe-656f-4a31-87b2-78c74309bab2.png` |
| `elementi/almighty.png` | `exec-8498cc8c-a230-4f57-82f8-ab64b4b946d8.png` |
| `elementi/healing.png` | `exec-118a233f-cabb-4b15-b2cb-541535d7c808.png` |
| `elementi/ailment.png` | `exec-0ed42c41-2979-452c-8199-5a4ec97fe7ab.png` |
| `elementi/support.png` | `exec-b7533def-28ec-44ce-a294-4a992d15ddb3.png` |
| `elementi/passive.png` | `exec-0cdce92a-7cd8-49d4-88b1-e878b80eb8ed.png` |
| `elementi/trait.png` | `exec-bd7a2a50-c239-4798-89a8-0f78a04f8bdb.png` |

## Sorgenti delle affinità completate

Generazione Imagegen con prompt: tassello nero quadrato ruotato6°, bordo bianco netto, simbolo colorato e sigla bianca italiana; variante con fascia inferiore vuota. Richiesti alfa nativo esterno e interno nero opaco, senza sfondo o scacchiera. Un sottile profilo nero esterno mantiene netto il bordo bianco. I tentativi non conformi di wk-senza-testo sono stati scartati; in tabella è indicata solo la sorgente corretta approvata. Riduzione proporzionale a256×256 senza scontorno.

| File completato | Sorgente nella cartella delle generazioni |
|---|---|
| `affinita/wk.png` | `exec-31c9487d-e52b-4b95-b428-9129c50eaf0f.png` |
| `affinita/wk-senza-testo.png` | `exec-8b433432-544d-4a0c-bda7-0c15a6bf8228.png` |
| `affinita/rs.png` | `exec-40741d57-d318-404a-9f46-9facf4e553b7.png` |
| `affinita/rs-senza-testo.png` | `exec-1d28bf8c-e2c8-4d2f-ac80-3445c9a8b7a4.png` |
| `affinita/nu.png` | `exec-8d071105-b828-498d-9068-29ac74127ec7.png` |
| `affinita/nu-senza-testo.png` | `exec-ca10319b-4548-41fa-a863-e051efbfba63.png` |
| `affinita/rp.png` | `exec-8742fe93-6a1a-4b11-b40e-224aa2ac0188.png` |
| `affinita/rp-senza-testo.png` | `exec-f3b1518b-b658-4ec8-9ece-4ea1d1f656e5.png` |
| `affinita/ab.png` | `exec-54c57e71-0d51-4f91-bf03-41e5a11c113a.png` |
| `affinita/ab-senza-testo.png` | `exec-f9019350-c8ef-4f92-953f-c113edb3c19e.png` |
| `affinita/normale.png` | `exec-0252571e-5237-4fdf-938b-2318464a1fd0.png` |
| `affinita/normale-senza-testo.png` | `exec-54a5122b-b01d-40b8-b6db-d3ce2035697d.png` |

## Sorgenti della navigazione completata

12icone generate con Imagegen: silhouette monocromatica bianca o rossa attiva, soggetti del§7.1, ritagli interni ed esterno con alfa reale; nessun testo. Riduzione uniforme da tela quadrata a256×256, senza scontorno. Verifica finale conclusa con PASS:12icone approvate dal validatore, anche a24px su fondi scuro e grigio medio.

| File già salvato | Sorgente nella cartella delle generazioni |
|---|---|
| `ui/nav-home.png` | `exec-201c6efa-bb86-487e-87e8-184b661f8924.png` |
| `ui/nav-home-attiva.png` | `exec-01c0cc07-030d-430f-b1b9-ec7718bddaee.png` |
| `ui/nav-compendio.png` | `exec-fc0c98d6-1e76-418f-9e0f-4256104f3fe2.png` |
| `ui/nav-compendio-attiva.png` | `exec-642a8e80-1b85-45f4-bb99-c2ed985966fe.png` |
| `ui/nav-skill.png` | `exec-7cdf911c-dbec-4316-886b-f5c38f808553.png` |
| `ui/nav-skill-attiva.png` | `exec-47050b80-b9ef-442b-9587-64a10805bf12.png` |
| `ui/nav-fusione.png` | `exec-08bdf8f8-f6ca-4ebc-9c35-b9074d465948.png` |
| `ui/nav-fusione-attiva.png` | `exec-5f257d09-3140-48cc-90a7-0949cc3d26d9.png` |
| `ui/nav-partita.png` | `exec-f6c316b3-f305-4a20-a36f-2fc3d2e72208.png` |
| `ui/nav-partita-attiva.png` | `exec-2f422c44-fa67-4135-b78b-f1ffe4e12355.png` |
| `ui/nav-impostazioni.png` | `exec-3591e173-da20-4a10-9cf5-163a486b2782.png` |
| `ui/nav-impostazioni-attiva.png` | `exec-efa4b55c-d559-4648-9854-a100fa9ba6d6.png` |

## Sorgenti delle carte degli Arcani

Lotto world, world-senza-testo, faith, faith-senza-testo, councillor, councillor-senza-testo: approvato da galaxy_task_validator; ridimensionamento uniforme senza ritaglio o deformazione.

Lotto moon, moon-senza-testo, sun, sun-senza-testo, judgement, judgement-senza-testo: approvato da galaxy_task_validator; ridimensionamento uniforme senza ritaglio o deformazione.

Lotto devil, devil-senza-testo, tower, tower-senza-testo, star, star-senza-testo: approvato da galaxy_task_validator; ridimensionamento uniforme senza ritaglio o deformazione.

Lotto death, death-senza-testo, temperance, temperance-senza-testo: approvato da galaxy_task_validator; ridimensionamento uniforme senza ritaglio o deformazione.

Lotto hermit, hermit-senza-testo, fortune, fortune-senza-testo, strength, strength-senza-testo: approvato da galaxy_task_validator; ridimensionamento uniforme senza ritaglio o deformazione.

Tutte le 46 carte elencate sotto sono approvate da galaxy_task_validator. Sorgenti native 948×1659, salvo lovers 948×1660: tutti i ridimensionamenti sono proporzionali a 768×1344, con alfa nativo preservato. Per lovers il fattore uniforme 1344/1660 lascia complessivamente 0,58 pixel di margine laterale trasparente; nessun ritaglio o deformazione.

Matto: entrambe le versioni generate con Imagegen, native948×1659 (4:7 esatto), ridotte uniformemente a768×1344 mantenendo alfa reale. Coppia approvata da galaxy_task_validator; non rigenerare. Anche Mago e Papessa sono native948×1659, esportate a768×1344, approvate da galaxy_task_validator.

| File già salvato | Sorgente nella cartella delle generazioni |
|---|---|
| `arcani/fool.png` | `exec-265696a8-13de-43a2-8d6c-76e25442baf7.png` |
| `arcani/fool-senza-testo.png` | `exec-d100b8d0-2ad0-47d6-a679-df1c3786cce5.png` |

| `arcani/magician.png` | `exec-c7aea4a2-c0cd-4807-84de-5dd4088c0dd3.png` |
| `arcani/magician-senza-testo.png` | `exec-91669e9e-5669-4f6d-a715-67c8e0514949.png` |
| `arcani/priestess.png` | `exec-4de2854d-012b-4e85-93bd-124acdb77215.png` |
| `arcani/priestess-senza-testo.png` | `exec-fa0934ae-cf30-47a6-bc9f-85278194fcb4.png` |

| `arcani/empress.png` | `exec-3848edbb-a870-4907-8118-7dbe735208b0.png` |
| `arcani/empress-senza-testo.png` | `exec-baeb8075-9449-4540-916e-49b51644da72.png` |
| `arcani/emperor.png` | `exec-d6a8a83b-d328-43b8-aa6f-4eceeed2012c.png` |
| `arcani/emperor-senza-testo.png` | `exec-9174295a-4a5c-4a08-b8af-c58e707abbf7.png` |
| `arcani/hierophant.png` | `exec-f6615b86-de15-46f9-9799-8e3df6fa5fea.png` |
| `arcani/hierophant-senza-testo.png` | `exec-3c1a8c93-92a8-4630-b102-6834355408f6.png` |

| `arcani/lovers.png` | `exec-61e9f43c-3341-4803-aa48-f4f1c201f212.png` |
| `arcani/lovers-senza-testo.png` | `exec-6d9b8144-12db-4a07-a2b8-5d0582719bd5.png` |
| `arcani/chariot.png` | `exec-d1424084-e7e3-4b6a-b0a4-a9dd10599b09.png` |
| `arcani/chariot-senza-testo.png` | `exec-e6d69e35-f216-410f-90bf-f385156885f6.png` |
| `arcani/justice.png` | `exec-047127b2-b591-4a5c-80e8-52d52de19b40.png` |
| `arcani/justice-senza-testo.png` | `exec-a1cca557-64c0-4505-a871-3e7cead03355.png` |

| `arcani/hermit.png` | `exec-071f260e-dfee-4719-907d-1a1f3eaf9768.png` |
| `arcani/hermit-senza-testo.png` | `exec-dd489381-600e-4574-bd22-58e9f2ff21bd.png` |
| `arcani/fortune.png` | `exec-32f0ded9-9aa4-421d-8401-97748d231e4f.png` |
| `arcani/fortune-senza-testo.png` | `exec-badeadc7-d397-453a-9a18-b1dfd6b69ccc.png` |
| `arcani/strength.png` | `exec-47984c00-e1d3-4cf1-96b0-267439ea05ee.png` |
| `arcani/strength-senza-testo.png` | `exec-c58aab12-6195-48f5-9d7d-32f1a8d4adde.png` |

| `arcani/death.png` | `exec-04731b66-f1ed-4a7f-9315-1efb7bf6c7a4.png` |
| `arcani/death-senza-testo.png` | `exec-12a2700f-6e9d-4156-85d0-595c2ccdd39e.png` |
| `arcani/temperance.png` | `exec-128674fb-8c5a-4401-86a7-f755ac78a3b8.png` |
| `arcani/temperance-senza-testo.png` | `exec-78ab0ab6-5165-40b5-9743-aa7a2661a3c1.png` |

| `arcani/devil.png` | `exec-e76f1051-0166-479f-9041-3f602fdcbaa5.png` |
| `arcani/devil-senza-testo.png` | `exec-b14a9349-316f-406d-8cc3-6b2562872a8d.png` |
| `arcani/tower.png` | `exec-078313cb-8ee5-43a5-95d6-e26870ac82bb.png` |
| `arcani/tower-senza-testo.png` | `exec-b78cef98-7e77-4a84-9afe-a95c51f347f8.png` |
| `arcani/star.png` | `exec-08891e22-ed12-4187-87a5-07790c8ea4b8.png` |
| `arcani/star-senza-testo.png` | `exec-a620c6b3-4246-40ab-a4b3-731c0c923b8d.png` |

| `arcani/moon.png` | `exec-d46fd710-f708-49ca-a0db-d0df4173f5f2.png` |
| `arcani/moon-senza-testo.png` | `exec-f0742aa8-31d5-4f86-a1a9-7aa120cf5b94.png` |
| `arcani/sun.png` | `exec-7f18c539-f59b-4f89-8e31-a30412fb10af.png` |
| `arcani/sun-senza-testo.png` | `exec-e07baf8c-8233-4976-873a-73584ab51845.png` |
| `arcani/judgement.png` | `exec-29398894-03b8-4ab6-a0fb-9a4a063233fe.png` |
| `arcani/judgement-senza-testo.png` | `exec-9c557b00-d2ae-408b-97c6-a4e6c16b99d5.png` |

| `arcani/world.png` | `exec-0501b90f-e93b-4418-a6de-6634fb1512b4.png` |
| `arcani/world-senza-testo.png` | `exec-4c2701d4-357f-44e8-a0d3-ec848914700b.png` |
| `arcani/faith.png` | `exec-f3bbf80f-4783-4a2a-ac26-b013ebcc36fd.png` |
| `arcani/faith-senza-testo.png` | `exec-d536c511-6c62-4eaf-ba1e-5f4f12fc60ab.png` |
| `arcani/councillor.png` | `exec-de982130-04ad-4cb3-8eb1-73f8ef5af731.png` |
| `arcani/councillor-senza-testo.png` | `exec-c15ca141-c236-4b99-9019-3384581fbca5.png` |

| `arcani/hanged.png` | `C:/Users/rober/Downloads/Immagine Codex 3 set 2026, 22_48_29.png` |
| `arcani/hanged-senza-testo.png` | `C:/Users/rober/Downloads/appeso_senza_testo.png` |

## Sorgenti delle icone degli Arcani

Tutte le ventiquattro icone generate con Imagegen, ridotte proporzionalmente a 256×256 e approvate da galaxy_task_validator.

| File salvato | Sorgente |
|---|---|
| `arcani/icona/fool.png` | `exec-8d578fcb-2867-45c3-8fa4-8903a174e855.png` |
| `arcani/icona/magician.png` | `exec-e29629e1-ee40-42d2-96dd-908b434dc3d6.png` |
| `arcani/icona/priestess.png` | `exec-c446fec4-9b0d-4ab8-9b8b-fd65589bbef9.png` |
| `arcani/icona/empress.png` | `exec-b3376a87-5259-4d1b-abb8-9e04ce6ebf6c.png` |

| `arcani/icona/emperor.png` | `exec-0fa3289a-9917-454b-9c2a-e08610e54a0a.png` |
| `arcani/icona/hierophant.png` | `exec-1ca86d18-22f9-4d71-99c1-e54967e1160d.png` |
| `arcani/icona/lovers.png` | `exec-aeb95425-4fa3-4fb3-a64f-ac730b4e7203.png` |
| `arcani/icona/chariot.png` | `exec-00ca9b4a-52c7-4183-8f8b-fd01eb3029e2.png` |

| `arcani/icona/justice.png` | `exec-8b372fa2-9b98-4398-bab1-3c32e09aa7c3.png` |
| `arcani/icona/hermit.png` | `exec-5d34dd63-9c95-4c66-a1b0-f6236e4bcfd8.png` |
| `arcani/icona/fortune.png` | `exec-31609231-08b7-43bb-8f5a-1c2da3e977df.png` |
| `arcani/icona/strength.png` | `exec-26c7343e-fe74-4f5d-a1d2-29a26877b9d3.png` |

| `arcani/icona/hanged.png` | `exec-ff43025e-eff1-4868-b9c1-44a91b007f88.png` |
| `arcani/icona/death.png` | `exec-d47ba379-e66e-41cd-ac4e-da2c0e84c2bb.png` |
| `arcani/icona/temperance.png` | `exec-22dbfd1b-4bf0-4504-ba8c-1e2ff53921f8.png` |
| `arcani/icona/devil.png` | `exec-07d3aacf-200e-429a-a887-7ad82b009ab4.png` |

| `arcani/icona/tower.png` | `exec-52af983c-5365-43ad-97c1-aa5069e9de25.png` |
| `arcani/icona/star.png` | `exec-09acf7e0-dc9b-4ae1-a9b1-d4450e71fb3b.png` |
| `arcani/icona/moon.png` | `exec-a7856ad5-a106-4c68-90d3-e73587bb9904.png` |
| `arcani/icona/sun.png` | `exec-9022e2a9-5b97-4912-a04e-ce6620e4201e.png` |

| `arcani/icona/judgement.png` | `exec-52438b97-888f-41ba-9010-5c381fd77e9a.png` |
| `arcani/icona/world.png` | `exec-deb4bb65-3a82-4349-a9d9-dee651ef2b2d.png` |
| `arcani/icona/faith.png` | `exec-19995e12-8b18-43ed-ab9e-dfdf828ea45f.png` |
| `arcani/icona/councillor.png` | `exec-303b6a2e-0620-45aa-834e-a96265d0b3a2.png` |

## Sorgenti delle Doti sociali

Serie completa §6 generata con Imagegen, adattata proporzionalmente alle dimensioni richieste con alfa reale e approvata da galaxy_task_validator. Categoria Doti completa: 12/12.

| Asset | Sorgente Imagegen |
|---|---|
| `public/asset/doti/conoscenza.png` | `exec-99c519da-06cb-427b-9443-2e5b88be3222.png` |
| `public/asset/doti/conoscenza-senza-testo.png` | `exec-1cbe8281-34da-4a57-8038-268dfc92aa5f.png` |
| `public/asset/doti/fascino.png` | `exec-cfda775c-c1b3-491d-946e-60008de9b930.png` |
| `public/asset/doti/fascino-senza-testo.png` | `exec-71a3f598-ff05-468e-83fa-6cf30dab141e.png` |
| `public/asset/doti/coraggio.png` | `exec-982d7182-71cd-42fc-8832-488d12c3ca6d.png` |
| `public/asset/doti/coraggio-senza-testo.png` | `exec-9c21c81e-7e52-4faf-8167-92e37a0dd384.png` |
| `public/asset/doti/gentilezza.png` | `exec-971e6952-80e3-4058-ac55-2ea884da7cd1.png` |
| `public/asset/doti/gentilezza-senza-testo.png` | `exec-a5102ac8-6f09-4982-b957-550c638fd24f.png` |
| `public/asset/doti/perizia.png` | `exec-447d3eea-bc5f-4f5e-a736-1e7cdd6cc9fb.png` |
| `public/asset/doti/perizia-senza-testo.png` | `exec-06a76dbf-0d78-498b-a494-4d58a791bb16.png` |
| `public/asset/doti/stella-vuota.png` | `exec-bcdf653c-dc96-441d-94f4-3fc283dcaa99.png` |
| `public/asset/doti/stella-vuota-senza-testo.png` | `exec-ff107a48-6c78-4d6d-acc6-ed29fa1197c6.png` |

## Sorgenti UI

### Badge di rango

Serie completa §7.2 (ranghi 1–9, MAX e tassello vuoto) generata con Imagegen, ridotta proporzionalmente a 256×256 e approvata da galaxy_task_validator.

| Asset | Sorgente Imagegen |
|---|---|
| `public/asset/ui/rango-1.png` | `exec-a255a85c-db7c-4cee-95a6-f482d254e14a.png` |
| `public/asset/ui/rango-2.png` | `exec-bad5b3ff-2a22-41af-bb67-59b8c244d35d.png` |
| `public/asset/ui/rango-3.png` | `exec-873edbe3-3a6a-4ff0-b3bb-250b0ee64299.png` |
| `public/asset/ui/rango-4.png` | `exec-41370785-18b9-4406-9f57-c26af9102d41.png` |

| `public/asset/ui/rango-5.png` | `exec-e127f403-3ea7-4c57-b8f1-94376797e8ac.png` |
| `public/asset/ui/rango-6.png` | `exec-a51e37c8-47ad-4e29-bb92-780ae79be015.png` |
| `public/asset/ui/rango-7.png` | `exec-67d71e71-86d5-4304-9a29-179392e9f3f0.png` |
| `public/asset/ui/rango-8.png` | `exec-3bd0b689-7a70-4bc3-b54c-efec1d53e7d4.png` |

| `public/asset/ui/rango-9.png` | `exec-defdb204-081f-4b1a-b6f8-9d361b41b85a.png` |
| `public/asset/ui/rango-max.png` | `exec-8df48fa0-3a82-4410-bbfd-1531b931825f.png` |
| `public/asset/ui/rango-senza-testo.png` | `exec-ec02c6e5-157b-4162-b100-0cef110e8029.png` |

### Badge di stato

Serie completa §7.3 generata con Imagegen, adattata proporzionalmente nel canvas 512×192 con sfondo alfa reale e approvata da galaxy_task_validator.

| Asset | Sorgente Imagegen |
|---|---|
| `public/asset/ui/badge-allarme.png` | `exec-82e63e2b-02d3-43f4-9421-a83211f22df0.png` |
| `public/asset/ui/badge-dlc.png` | `exec-a67d6eaf-1a8a-4ff3-a2ce-43120b8e9d2f.png` |
| `public/asset/ui/badge-tesoro.png` | `exec-f09c9c36-9641-434d-896f-591d634a9513.png` |
| `public/asset/ui/badge-speciale.png` | `exec-d1e5e484-4149-466a-bcce-541a2f3d92a1.png` |
| `public/asset/ui/badge-nuova-partita.png` | `exec-f17a4437-5594-4e40-8961-6a9997c3af64.png` |
| `public/asset/ui/badge-senza-testo.png` | `exec-ea6fa122-fb6b-43f2-ada6-2dc1264f9e8c.png` |
| `public/asset/ui/badge-allarme-senza-testo.png` | `exec-3c30775c-16b0-4db8-bf0d-d2fcc77960a7.png` |

### Pulsanti azione

Lotto §7.4 generato con Imagegen, adattato proporzionalmente a 600×160 con sfondo alfa reale e approvato da galaxy_task_validator.

| Asset | Sorgente Imagegen |
|---|---|
| `public/asset/ui/pulsante-primario.png` | `exec-78737aa2-c111-4951-9aca-6b00ca89579c.png` |
| `public/asset/ui/pulsante-secondario.png` | `exec-e297fedf-d8ac-4c72-a6fc-48c6c3e900a5.png` |

### Cornice scheda Persona

Asset §7.5 generato con Imagegen, adattato proporzionalmente a 1600×1000 con foro centrale e sfondo alfa reali e approvato da galaxy_task_validator.

| Asset | Sorgente Imagegen |
|---|---|
| `public/asset/ui/cornice-scheda.png` | `exec-1faa52cb-9ca2-4ee9-a0b8-70032fa599b9.png` |

### Icone delle statistiche

Lotto §7.6 generato con Imagegen, ridotto proporzionalmente a 256×256 con sfondo alfa reale e approvato da galaxy_task_validator.

| Asset | Sorgente Imagegen |
|---|---|
| `public/asset/ui/stat-forza.png` | `exec-c4ef5cc3-4aa8-4f81-ae4b-bfcc2c94b4ac.png` |
| `public/asset/ui/stat-magia.png` | `exec-5defd285-bd60-40db-a687-c626876d2348.png` |
| `public/asset/ui/stat-resistenza.png` | `exec-c7bf5a50-9147-4581-91fb-b9c583e5e0ef.png` |
| `public/asset/ui/stat-agilita.png` | `exec-a9e5549d-8388-4476-a920-0d92d2020b58.png` |
| `public/asset/ui/stat-fortuna.png` | `exec-3decb667-c8c3-4e4c-836e-79e09592c78d.png` |

### Badge Demone del Tesoro

Lotto §7.7 generato con Imagegen, ridotto proporzionalmente a 256×256 con sfondo alfa reale e approvato da galaxy_task_validator. Categoria UI completa: 47/47.

| Asset | Sorgente Imagegen |
|---|---|
| `public/asset/ui/tesoro-crystal-skull.png` | `exec-0c8d7786-de6e-4bba-9bed-4ae2cf7f1492.png` |
| `public/asset/ui/tesoro-koh-i-noor.png` | `exec-8764867c-8776-4345-bbd8-c74a96a6efaa.png` |
| `public/asset/ui/tesoro-queens-necklace.png` | `exec-7e8f7cf1-e846-4e78-9bb1-62e2dc659953.png` |
| `public/asset/ui/tesoro-regent.png` | `exec-53a91393-ee86-4c09-b233-e770aa1616bf.png` |
| `public/asset/ui/tesoro-stone-of-scone.png` | `exec-7663ce61-b89d-4f22-8ef4-8c4256186368.png` |
| `public/asset/ui/tesoro-orlov.png` | `exec-84c88573-d78b-4d66-8147-860b8fa90d59.png` |
| `public/asset/ui/tesoro-emperors-amulet.png` | `exec-7ee73527-304e-425b-a9ed-106726fa068d.png` |
| `public/asset/ui/tesoro-hope-diamond.png` | `exec-88cef5c4-83c9-4b14-bb72-87cd0cb3d5f4.png` |
| `public/asset/ui/tesoro-orichalcum.png` | `exec-205487b0-d284-453c-a28b-70dc8f1efdef.png` |

### Illustrazioni vuoto Persona

Coppia §8 generata con Imagegen, ridotta proporzionalmente e centrata su canvas 1200×800, con sfondo alfa reale; approvata da galaxy_task_validator.

| Asset | Sorgente Imagegen |
|---|---|
| `public/asset/illustrazioni/vuoto-persona.png` | `exec-12b40677-f3d5-45bf-9d2b-8bdaf0477bc4.png` |
| `public/asset/illustrazioni/vuoto-persona-senza-testo.png` | `exec-2b43f2c8-68d2-4344-b681-07ce3ef545c4.png` |

### Illustrazioni vuoto Partita

Coppia §8 generata con Imagegen, ridotta proporzionalmente e centrata su canvas 1200×800, con sfondo alfa reale; approvata da galaxy_task_validator.

| Asset | Sorgente Imagegen |
|---|---|
| `public/asset/illustrazioni/vuoto-partita.png` | `exec-a5386fc6-0b6f-48df-a6b1-cbdd63bc9416.png` |
| `public/asset/illustrazioni/vuoto-partita-senza-testo.png` | `exec-a47905b0-b41a-400d-8e00-d72421572835.png` |

### Illustrazioni errore

Coppia §8 generata con Imagegen, ridotta proporzionalmente e centrata su canvas 1200×800, con sfondo alfa reale; approvata da galaxy_task_validator.

| Asset | Sorgente Imagegen |
|---|---|
| `public/asset/illustrazioni/errore.png` | `exec-65f896d3-0435-4f59-85ad-1e74ec2857ab.png` |
| `public/asset/illustrazioni/errore-senza-testo.png` | `exec-42a38406-bd2d-48bc-a726-f832611b5d70.png` |

### Illustrazioni caricamento

Lotto §8 generato con Imagegen: illustrazione principale da sorgente 3:2 e otto fotogrammi da sprite sheet 3×3, ridotti proporzionalmente con sfondo alfa reale; approvato da galaxy_task_validator. Categoria illustrazioni completa: 15/15.

| Asset | Sorgente Imagegen |
|---|---|
| `public/asset/illustrazioni/caricamento.png` | `exec-ea4cebf4-98a6-444e-9a86-244323842211.png` |
| `public/asset/illustrazioni/caricamento-1.png` | `exec-296be0d4-1d61-46e0-b057-311b304c5bf5.png` — cella 1 |
| `public/asset/illustrazioni/caricamento-2.png` | `exec-296be0d4-1d61-46e0-b057-311b304c5bf5.png` — cella 2 |
| `public/asset/illustrazioni/caricamento-3.png` | `exec-296be0d4-1d61-46e0-b057-311b304c5bf5.png` — cella 3 |
| `public/asset/illustrazioni/caricamento-4.png` | `exec-296be0d4-1d61-46e0-b057-311b304c5bf5.png` — cella 4 |
| `public/asset/illustrazioni/caricamento-5.png` | `exec-296be0d4-1d61-46e0-b057-311b304c5bf5.png` — cella 5 |
| `public/asset/illustrazioni/caricamento-6.png` | `exec-296be0d4-1d61-46e0-b057-311b304c5bf5.png` — cella 6 |
| `public/asset/illustrazioni/caricamento-7.png` | `exec-296be0d4-1d61-46e0-b057-311b304c5bf5.png` — cella 7 |
| `public/asset/illustrazioni/caricamento-8.png` | `exec-296be0d4-1d61-46e0-b057-311b304c5bf5.png` — cella 8 |

### Confidenti — lotto 1

Primi otto ritratti §9 generati con Imagegen e adattati proporzionalmente a 768×1024 con sfondo alfa reale; approvati da galaxy_task_validator.

| Asset | Sorgente Imagegen |
|---|---|
| `public/asset/confidenti/igor.png` | `exec-80853693-28f3-449c-860d-6bb463bcdfd0.png` |
| `public/asset/confidenti/morgana.png` | `exec-1693f61b-1d49-4aca-868c-2650b71bb30b.png` — fondo convertito in alfa reale |
| `public/asset/confidenti/ryuji.png` | `exec-adff4db2-005c-4c03-8d26-3d55e982404b.png` |
| `public/asset/confidenti/ann.png` | `exec-cb22c942-6d24-41f2-a054-683708de2f75.png` |
| `public/asset/confidenti/yusuke.png` | `exec-3de7658c-25f7-47ce-9371-d21b8e1af436.png` |
| `public/asset/confidenti/makoto.png` | `exec-d0bfa718-89dd-4479-bfe4-11c7dd3d5b65.png` |
| `public/asset/confidenti/futaba.png` | `exec-5ce61061-0534-4afa-a282-b2fe2b204a98.png` |
| `public/asset/confidenti/haru.png` | `exec-b610619b-79fb-4bb4-8123-24ea266310fc.png` |

### Confidenti — lotto 2

Otto ritratti §9 generati con Imagegen e adattati proporzionalmente a 768×1024 con sfondo alfa reale; approvati da galaxy_task_validator.

| Asset | Sorgente Imagegen |
|---|---|
| `public/asset/confidenti/akechi.png` | `exec-a80ac9c4-6718-40b8-86fd-dc785495b1b9.png` |
| `public/asset/confidenti/kasumi.png` | `exec-eb1be64f-a63d-49b7-b420-37e075fa2c11.png` |
| `public/asset/confidenti/sojiro.png` | `exec-510463ad-10cb-49b2-955d-f0700da11819.png` |
| `public/asset/confidenti/takemi.png` | `exec-cf092535-e439-4ae7-a60b-5b65ee6f80e4.png` |
| `public/asset/confidenti/kawakami.png` | `exec-5d2fa746-de09-4234-a225-09e91bb7c02d.png` |
| `public/asset/confidenti/yoshida.png` | `exec-25436948-9335-4232-bb3d-e48cc23d9ed2.png` |
| `public/asset/confidenti/mishima.png` | `exec-87e2eb9c-2c27-4af7-a246-78231f048ba4.png` |
| `public/asset/confidenti/ohya.png` | `exec-5af4d48d-1731-484f-995f-efd97ad6d371.png` |

### Confidenti — lotto 3

Sette ritratti §9 generati con Imagegen e adattati proporzionalmente a 768×1024 con sfondo alfa reale; approvati da galaxy_task_validator.

| Asset | Sorgente Imagegen |
|---|---|
| `public/asset/confidenti/hifumi.png` | `exec-3d2bbcae-7543-4592-8538-f90c10abdced.png` |
| `public/asset/confidenti/chihaya.png` | `exec-008d943c-e94f-4b87-a740-cc4d8388985e.png` |
| `public/asset/confidenti/iwai.png` | `exec-93852958-8968-4fde-94b2-7f4abb3387b3.png` |
| `public/asset/confidenti/shinya.png` | `exec-e4396b97-2c5f-4902-94a9-7e0554e782e7.png` |
| `public/asset/confidenti/gemelle.png` | `exec-e7d3034c-55ba-414e-bb3c-4f2fd6dbadda.png` |
| `public/asset/confidenti/sae.png` | `exec-fbfc10b9-1a8d-46eb-893a-357b0947b059.png` |
| `public/asset/confidenti/maruki.png` | `exec-e53af0ed-3dcd-4574-9115-900254a21a66.png` |

### Confidenti — varianti fedeli ai riferimenti originali

Le 23 varianti sono state generate da Imagegen con prompt testuali ricavati dai riferimenti originali indicati dall’utente, mantenendo il linguaggio grafico dei primi ritratti. I riferimenti non sono stati allegati alla generazione, per evitare fondali incorporati. Tutte le sorgenti sono PNG RGBA con alfa nativo; la sola trasformazione applicata è la riduzione uniforme da 1086×1448 a 768×1024. Nessuno scontorno è stato eseguito. L’intera serie è approvata direttamente dall’utente.

Riferimenti: https://steamcommunity.com/sharedfiles/filedetails/?id=2880260759 e https://steamcommunity.com/sharedfiles/filedetails/?id=3707344584

| Asset | Sorgente Imagegen |
|---|---|
| `public/asset/confidenti/igor-fedele.png` | `exec-27a1daba-c273-4ad6-b71a-2d0a5f2f777a.png` |
| `public/asset/confidenti/morgana-fedele.png` | `exec-d63af62c-3cea-45f4-be7f-c0ef17bcd124.png` |
| `public/asset/confidenti/ryuji-fedele.png` | `exec-04c1f869-9a8a-45d6-aa2a-34fbc15972ba.png` |
| `public/asset/confidenti/ann-fedele.png` | `exec-8c2aff5b-e60b-41ef-a01d-0172092a99c6.png` |
| `public/asset/confidenti/yusuke-fedele.png` | `exec-21236ee4-7709-4fdd-ae05-0901b96b2d06.png` |
| `public/asset/confidenti/makoto-fedele.png` | `exec-b318b87f-6047-4b66-bf86-6d9bdd8a4e32.png` |
| `public/asset/confidenti/futaba-fedele.png` | `exec-9b18ea5d-b184-4f11-a767-5d55033c27dc.png` |
| `public/asset/confidenti/haru-fedele.png` | `exec-809b6c96-947a-4014-9ef7-54d6851eec1b.png` |
| `public/asset/confidenti/akechi-fedele.png` | `exec-3681445f-7746-47f5-8324-b91a132c0f9f.png` |
| `public/asset/confidenti/kasumi-fedele.png` | `exec-31582521-468c-487b-a4c1-64b13450f8d8.png` |
| `public/asset/confidenti/sojiro-fedele.png` | `exec-e38395f9-a202-4f0b-b6f7-a1a40a19c400.png` |
| `public/asset/confidenti/takemi-fedele.png` | `exec-0559d0ac-9442-4911-a804-ec82decfc0ad.png` |
| `public/asset/confidenti/kawakami-fedele.png` | `exec-da052745-2e14-495e-8d2a-75dd8d775ec4.png` |
| `public/asset/confidenti/yoshida-fedele.png` | `exec-7c6b9f19-8f84-4886-8396-0d0e10837153.png` |
| `public/asset/confidenti/mishima-fedele.png` | `exec-7f5ffc37-9e28-47ff-abd5-d42e45f065b0.png` |
| `public/asset/confidenti/ohya-fedele.png` | `exec-ae194786-3cfc-4456-97eb-cc0e02f1a57c.png` |
| `public/asset/confidenti/hifumi-fedele.png` | `exec-5474d538-f952-4af5-bc27-a5aa5b75d30b.png` |
| `public/asset/confidenti/chihaya-fedele.png` | `exec-f623398a-7bce-4d0b-8414-cd3e795b5d9a.png` |
| `public/asset/confidenti/iwai-fedele.png` | `exec-5a228a0d-d42e-42c6-bdf4-3a9291de826b.png` |
| `public/asset/confidenti/shinya-fedele.png` | `exec-47eab5ca-9963-4be2-9ce9-7e34051e1ca8.png` |
| `public/asset/confidenti/gemelle-fedele.png` | `exec-fa5c359e-8536-4387-8250-96048aa5d1ad.png` |
| `public/asset/confidenti/sae-fedele.png` | `exec-d999b525-69b0-4017-a9e7-742a6e9c0acb.png` |
| `public/asset/confidenti/maruki-fedele.png` | `exec-bcf9d92b-885b-4d97-8b3a-ad79af1fd1d4.png` |

## Impronte dei file completati

Rilevano eventuali sostituzioni accidentali dei file approvati.

| File | Modalità | SHA-256 |
|---|---|---|
| `public/asset/identita/logo.png` | RGBA | e8278b29a69fde2345990242d348c036afcc4edd41e61a38b51a7f4cd25cac7a |
| `public/asset/identita/logo-senza-testo.png` | RGBA | 07e77bedfd17487d02269c773a0aa60f9287716a12a2a64809d4c9a8caf5d35d |
| `public/asset/identita/logo-orizzontale.png` | RGBA | acfbf17a0f3038df9319fe76784da816e143f5df7618f47453b6f0701ec9d35e |
| `public/asset/identita/logo-orizzontale-senza-testo.png` | RGBA | 6de5b33f154e35015c5bc91c35fd03ec1cb44cd45a3665f54ca7d4ecfbe8f2ec |
| `public/asset/identita/icona-512.png` | RGB | 3fe220552159e21b2043a414249dae0439ef3d1da698470e5dc92699e4844caa |
| `public/asset/identita/icona-192.png` | RGB | 8e5bcc726be1a6e28d39c42ad6488902641dc1fabc8506ff0b6dbff77da54807 |
| `public/asset/identita/icona-32.png` | RGB | abafbd42006eb708a725699d5d34301da9bd8a0f5f8c4171a39382a5da5f6be0 |
| `public/asset/identita/splash-verticale.webp` | RGB | a3e83a01cfc794a1c62275abfdc9536abcebee6c32bfa1e2d10154b81a75e180 |
| `public/asset/identita/splash-verticale-senza-testo.webp` | RGB | 7f7fcc2f38bfd84143c34cfaa7e2db5486dce4cadfd0fdfdace5fe952f359000 |
| `public/asset/identita/splash-orizzontale.webp` | RGB | a264a0bb4ae25df90d953454678a13fd447f78e023e605b9351f4a3e8b7fff86 |
| `public/asset/identita/splash-orizzontale-senza-testo.webp` | RGB | 3bd061cf6a72604e805295868882c425c2d861a0f8bcd4b927738067272fb730 |
| `public/asset/sfondi/pattern-nero.webp` | RGB | f90a3734a6caedf850b09ef720db40ff32fcf1d1e07193e1e18374998582203d |
| `public/asset/sfondi/stanza-velluto.webp` | RGB | 7cfd0eb39e95e73e7604b9402fed7257c25219ec7d65b733379c4c7ea961e419 |
| `public/asset/sfondi/stanza-velluto-allarme.webp` | RGB | e42b448bad349d033db955db045c6a1526b96d2bbb6d33c4f28d9d91a16df94b |
| `public/asset/sfondi/mementos.webp` | RGB | cd50afe82ecdfe26109c4b50938ead84dbc42223314f6b776f6cea5672fc8d74 |
| `public/asset/elementi/phys.png` | RGBA | cbc2dd2fde7e27954d52ec224aca120cf50faec636172a842d9957968ab10212 |
| `public/asset/elementi/gun.png` | RGBA | 5f058a455492878b430982f8872993ca33aa4499669970a400e7c4494d34fdb9 |
| `public/asset/elementi/fire.png` | RGBA | cd616a0b5f01ff7d18add073c630b758bb78674245b537054ff41377488e4ef7 |
| `public/asset/elementi/ice.png` | RGBA | ae2836542b9fae9553c23c68018c4648a9cb8d8e68d868e123362bb27b47aa81 |
| `public/asset/elementi/electric.png` | RGBA | e7f971d595088ed46a2189a30d1d286df53957b3077d7b3adffab4b5b2ac08ee |
| `public/asset/elementi/wind.png` | RGBA | fe6132932f55e13dec32d7d7b97c1fec656fc91a942eaee51725d74da38f4249 |
| `public/asset/elementi/psy.png` | RGBA | d14fcb4b14598c0246697da60f8d83788755c5a115cd5baae8de536012602dcf |
| `public/asset/elementi/nuclear.png` | RGBA | 105f901fb93bda710173175ee0c5fcbcc3ca22b51738b1fbdd082af1a3d4269b |
| `public/asset/elementi/bless.png` | RGBA | 6f00c6b2f8076cefa12d18306b41836c7947590b447e083eb3d772ed98b02986 |
| `public/asset/elementi/curse.png` | RGBA | b9cd01507150c445cf450d8597492d31e9d383384eb86cad113eef7f20bec43c |
| `public/asset/elementi/almighty.png` | RGBA | 0be7aeadc31304b5d27cb9c79bdc0a7140263d94fc7dad6da6f4904c8954239f |
| `public/asset/elementi/healing.png` | RGBA | fb3cad56d93e91ae6a6b84a13515ff85d9b16994b1363af0c8397fda9dd14584 |
| `public/asset/elementi/ailment.png` | RGBA | 2da1f48472e5dadddf25ee7c4b5d16a9497bc7a51dad0684b7e27f740e6c329d |
| `public/asset/elementi/support.png` | RGBA | 7a916401852cfacd36019a178bc6e1f22d93b975917dcce419efc6c2b71b9758 |
| `public/asset/elementi/passive.png` | RGBA | 2c8509b34f59bf770091d9370e4555b9ca7ffe57ba307c74762558799ba93b28 |
| `public/asset/elementi/trait.png` | RGBA | 1061c67c56eef1e64d3448e03040239003269be5f62dab07193bb4e5e6e878bc |
| `public/asset/affinita/wk.png` | RGBA | 56c62c48398230d065023b7534b89de5ae415b54fefc160946b013de8ccaa415 |
| `public/asset/affinita/wk-senza-testo.png` | RGBA | fa7a8744cb52f675a8591b077605ba49194898e230dd979155bdd663427b0499 |
| `public/asset/affinita/rs.png` | RGBA | f992857c65d6b4efa845cb30b42ba51327568ea8fb701ee48fe37d4a46c28933 |
| `public/asset/affinita/rs-senza-testo.png` | RGBA | c667c3157f9c34aad62094171ae9d2917771216eab62ddb54adffb36fd1e8fcd |
| `public/asset/affinita/nu.png` | RGBA | 86d5ae870f4c5ec28058f4ae64624af5440f47070dbe48fb80f6d9dc2e929c1a |
| `public/asset/affinita/nu-senza-testo.png` | RGBA | f6350736506b140c5304687c51b2d38281ccebf7fdd69ca3ebd186658ef29e16 |
| `public/asset/affinita/rp.png` | RGBA | 1006931f6cebdd8bc6498ed0bc53e902312dcda9ede30514056cb3bd63f1e461 |
| `public/asset/affinita/rp-senza-testo.png` | RGBA | 7e07e10ea80e0157538a20cdc44dff1aa9ee24f1f219e9f981426d98a32cd04c |
| `public/asset/affinita/ab.png` | RGBA | eea62c959a46b1284799d2ae67be139c695b29a56bfa29686a693ab264bfd394 |
| `public/asset/affinita/ab-senza-testo.png` | RGBA | 8c912fbce1328d809623a44bb35b3bf9a10ac7b4baef818c61f1486518dbd1a1 |
| `public/asset/affinita/normale.png` | RGBA | f0033b25d5ac627f27972e778108f219a491b6796b9d0240cd01276061eb8c03 |
| `public/asset/affinita/normale-senza-testo.png` | RGBA | 13ca5cdafd4a1a0c13864914779c99082fadb8d092b2fb9e6a84fabd1970a8fc |
| `public/asset/ui/nav-compendio-attiva.png` | RGBA | 9aab5a6d40ad5ea93ce7c828790a9f040f5d95a904e9106d2079b0f1810ea0ba |
| `public/asset/ui/nav-compendio.png` | RGBA | b408843299d07e22f9468a29e0a3f0b73775d3c82e03d27b2851bea767f2fd9b |
| `public/asset/ui/nav-fusione-attiva.png` | RGBA | 8507e84d337cec97d535f02070e975d9982ce6099329c3fdeb18903953277b03 |
| `public/asset/ui/nav-fusione.png` | RGBA | 4e730d532157ea91d6174b4cc3dcd30912daf08d770ce0714bbc9597095a075d |
| `public/asset/ui/nav-home-attiva.png` | RGBA | 4efa6b5c3b9277c5341bc81cff3e8eb97cb5d0d7813b65ba3bef954368559dce |
| `public/asset/ui/nav-home.png` | RGBA | 7227e96224e27e43d303b4a2967d087b87f076bc3c9492fcd3a8930dc5140b20 |
| `public/asset/ui/nav-impostazioni-attiva.png` | RGBA | a387a96316fd6cc6885ad6a4e4aef434a72c9c14fc9d555f7da305b4e7eed62a |
| `public/asset/ui/nav-impostazioni.png` | RGBA | 711fb36bbfd754200bf21f29676b31966461f0d37c9034e8fc42f5cc7215f7af |
| `public/asset/ui/nav-partita-attiva.png` | RGBA | d6496f5d7735082b6bc30de61772f0ae94dbd0f0ffced28b23bcbe6e20425529 |
| `public/asset/ui/nav-partita.png` | RGBA | 6b3beb9880a2844f9110e6c687a6222f95e897bc20e6c3ba889f56d5020b0e70 |
| `public/asset/ui/nav-skill-attiva.png` | RGBA | 1928cd5fd1219a0b8c466de334ab65fe9f5c4d1c3d9ed44ef4f5cfd08ac62d12 |
| `public/asset/ui/nav-skill.png` | RGBA | c3368148901b1c34e758abd27c8343ae8a634423f87e6dbb276632f5afd5fb24 |
| `public/asset/arcani/fool.png` | RGBA | 48ea96334eadb1642b23721699da7fbbabfff185159ad4bce0c4149187bf3c82 |
| `public/asset/arcani/fool-senza-testo.png` | RGBA | bee5eac865471bd60fa8a7e1fe5b54340e0aea34624604fa85c11497a8363066 |
| `public/asset/arcani/magician.png` | RGBA | 6be887ccf4e303d5e2e9c718c7b6c18a72d5fdbfabeef6e95fdb98ddaa931910 |
| `public/asset/arcani/magician-senza-testo.png` | RGBA | 2e287b83cecd511fe5197dd82fb81bea96a3e61b5b915db6bcb09068316f7136 |
| `public/asset/arcani/priestess.png` | RGBA | e07fd4aae140dc19e40a9f18846477a70c35269a69a498555e410a70e1078622 |
| `public/asset/arcani/priestess-senza-testo.png` | RGBA | 3598eff7d72a20ce20dc7c40fcf669884e8e9a29f234ca885db1c7086c92d759 |
| `public/asset/arcani/empress.png` | RGBA | 0ed4f57b83d24c9adf3be2c92cbb83766739c09e307d9df0171d4c2e4a0250ff |
| `public/asset/arcani/empress-senza-testo.png` | RGBA | c98551ebda8a682c6581dd46478915d77f8d66235b2028c2aeafbf71e900c6d7 |
| `public/asset/arcani/emperor.png` | RGBA | 56205eca17f50ca02242abf65911deb12cd998c2f9e4ba159d4c87ec50e6fb6f |
| `public/asset/arcani/emperor-senza-testo.png` | RGBA | 50e4798f2d8efb50ccbb769803e48c79043791d24d97a956bcad4e49aeb79edd |
| `public/asset/arcani/hierophant.png` | RGBA | d52be6eed183097603490678a1b7cbeae428a5e284578c4f11bc08540b5efb67 |
| `public/asset/arcani/hierophant-senza-testo.png` | RGBA | 134ce917aa23d170a763bfdba16626b1dcbc0746a290199b49afd693fa2f93a3 |
| `public/asset/arcani/lovers.png` | RGBA | b3c3a77e31b6b728582d9861134ce1bf0babb91126016fa19272aa5bf855ad25 |
| `public/asset/arcani/lovers-senza-testo.png` | RGBA | 716c616c8e93bdcdcb682620159ea07698c69b2b54051f37e57dfb55e4239a04 |
| `public/asset/arcani/chariot.png` | RGBA | 7f3542ca847b70eaced42527b8a0a2e48bc912f357505e872a54310dfe401cb2 |
| `public/asset/arcani/chariot-senza-testo.png` | RGBA | 65942e6c73fb0adf78c30e52b8f62e5399558feaac1a49044bd8649148d73983 |
| `public/asset/arcani/justice.png` | RGBA | ebb70c1960f6caa56ba139ebf7751c094f660d06083b68f76ff7925b899c13eb |
| `public/asset/arcani/justice-senza-testo.png` | RGBA | 389aa03a520c56583ceb18150ea26af305120e2f36e24557d7169a1ec1b13db6 |
| `public/asset/arcani/hermit.png` | RGBA | 4e8e5109e438d0e26096edc695950fbf7c6a219f11f56a9e541bff62943f76af |
| `public/asset/arcani/hermit-senza-testo.png` | RGBA | d6393f5da6046bcc56831cb42b1db4d8e026b84b71601484b2261261ab7db8de |
| `public/asset/arcani/fortune.png` | RGBA | 55ed2d1a09be2a72bc80bdbcd437d1929b9248185a2d5265b3736a3b9077f217 |
| `public/asset/arcani/fortune-senza-testo.png` | RGBA | 1e67b821b75925b337184bb1f3ece1c7838a6098ddb3e631ddd9c7efbcdd8ea8 |
| `public/asset/arcani/strength.png` | RGBA | 7c66189aa92c76b1e74c6917dec00684bf8903fa323cd4bd4bd997a127080c9e |
| `public/asset/arcani/strength-senza-testo.png` | RGBA | 46aab0c447226c27210db3a3981481bd07da185625a0c6d077f9a0a4822d553f |
| `public/asset/arcani/death.png` | RGBA | f7d1397205b668cc8995f7ec22faad74da82392025f46db90e8f661472e2cf5d |
| `public/asset/arcani/death-senza-testo.png` | RGBA | e1a49d56a0c6a756d47e9a63fadeb42c9c661784a5dd3f9989f0a5ba7e1366d7 |
| `public/asset/arcani/temperance.png` | RGBA | 98cd97f2f6112e286ce897eee1a41b5aaae9e8e34a9366e15f6a1c0e7c75168c |
| `public/asset/arcani/temperance-senza-testo.png` | RGBA | 54501a61508dca45f12c5817055b78597b7f8e2f663d26ea7b9283d223e96209 |
| `public/asset/arcani/devil.png` | RGBA | 57e97dcbf81a6284e4fb7029500a2d6818fdf47a97252d04f4593593a1656723 |
| `public/asset/arcani/devil-senza-testo.png` | RGBA | 43df95477f74c645c8f8c7f35181dc835aea3883b1bb67ac6a2ffcfeacdc6d44 |
| `public/asset/arcani/tower.png` | RGBA | cc9c4af971a2cac394446c14c1740ec49aea1a96d65a2ff7f6b388c8066735ed |
| `public/asset/arcani/tower-senza-testo.png` | RGBA | 36d8ecaa86771de853753ee4c51abd1807ee42d1ca9492a9c51a07cbc505e4f8 |
| `public/asset/arcani/star.png` | RGBA | 1ebb7a09e0e9780f3feb5f08e82e44a512fe76312010866738a6cf8af588c993 |
| `public/asset/arcani/star-senza-testo.png` | RGBA | 7bf3006e6728e7970ba9b477762393014611977a3235c0fc779ef2034d983454 |
| `public/asset/arcani/moon.png` | RGBA | 051d1e16137d31f204b50109f8f343492f0198fccfa12cf1d2c0b34344c337be |
| `public/asset/arcani/moon-senza-testo.png` | RGBA | a942be3bdc08a77e4ad0720fd1b56f09d50fa54a097a99afd581b7ea08332f14 |
| `public/asset/arcani/sun.png` | RGBA | d6a0f9a8b8ea25a77b5fefa49fd1bdcc20d793c621ff22113b62f988974322a7 |
| `public/asset/arcani/sun-senza-testo.png` | RGBA | 85e95f9b99874ad26838e91750ef894e498d7260a906b09e7f18af0fe5d80a86 |
| `public/asset/arcani/judgement.png` | RGBA | 9a269aaa31c2bc8f33fbd4cc46a401ebaecd7c2bfa59c53ee306a86c58e9b9eb |
| `public/asset/arcani/judgement-senza-testo.png` | RGBA | a7f5fef653c8368e6a70181a9fa74a3d6871daa324cbba5a9665ec80acdea5a0 |
| `public/asset/arcani/world.png` | RGBA | b66565e51e19fac91284325fe439f8853adc0cc2fc00eed4e1a8de0802cecc31 |
| `public/asset/arcani/world-senza-testo.png` | RGBA | 407e97c6923ab1d36df6f6c9b30b56e38cfd5fef09629539a22eddadaabaca7a |
| `public/asset/arcani/faith.png` | RGBA | b3c669d71fc2a8cddf625dc71dca28c4ca4936db5b01762e5a837921a066a491 |
| `public/asset/arcani/faith-senza-testo.png` | RGBA | d0a26fab262c5abc4fe29879f4f2f40816514ea42d035a5dc3778a14ba6b878b |
| `public/asset/arcani/councillor.png` | RGBA | c22ec1d7610d7da3ae2dd5577e210a39d739449fc27ec13bd2390710dc476465 |
| `public/asset/arcani/councillor-senza-testo.png` | RGBA | 6b15b92c03dd4cbf2b73ae6400401e4adc770da7e3630a2b3f4ab7a6fb96e546 |
| `public/asset/arcani/icona/fool.png` | RGBA | 553d0ef83458973864fbffa15d95559dc85ec58c3b18d29c5bbbbd77a349e438 |
| `public/asset/arcani/icona/magician.png` | RGBA | 2d55804e867b1a15a00204cc775d875f80878e0c7e93b7b9624b7bcfb620d4d7 |
| `public/asset/arcani/icona/priestess.png` | RGBA | a44951764131e28c343c8b353a0c1b3ff9a7dad2b52252100635fa7cc66f3a6c |
| `public/asset/arcani/icona/empress.png` | RGBA | a1d755f4974ec407119c5f729701e7a1348201285708ed13a0a7589710dca0b8 |
| `public/asset/arcani/icona/emperor.png` | RGBA | 1c1e8a16e45a552e02f67d4c3f82c79b9627950531bbc68f85d097dd590c0be8 |
| `public/asset/arcani/icona/hierophant.png` | RGBA | 24c83c41de5006cb0d3e545447fc802cfcdb070bb5a4d55a6e5c1435a43d7370 |
| `public/asset/arcani/icona/lovers.png` | RGBA | 4a65cc6bf2d66b7d531f89720f2038461e21fb205dd979111654bddf7d26853a |
| `public/asset/arcani/icona/chariot.png` | RGBA | f31f82da394debdf3fa1bf60be55f9dcc6b619f7af767a71a13d1f0f9c7cd683 |
| `public/asset/arcani/icona/justice.png` | RGBA | b7e3e7a80ac398247f85898e2a4620ff540a1a7b555bbad2c05f6dd763923102 |
| `public/asset/arcani/icona/hermit.png` | RGBA | 37d6d3fead42bcf38b2dd1c0193d3e8ec01e1c88a535d339da52aaa95b68b8b8 |
| `public/asset/arcani/icona/fortune.png` | RGBA | f229f9f10975e5d20480add840b3fb61740f38bb33efd97ff603b05263be1eef |
| `public/asset/arcani/icona/strength.png` | RGBA | 3b98a323ed8daf4f6c1bfaf38ab3a97f358a2f00c95a2b77f3d965ee2a5e1543 |
| `public/asset/arcani/icona/hanged.png` | RGBA | c09f4360912f70b34eebe318cb3949595543f61326986456a788efd600cd665c |
| `public/asset/arcani/icona/death.png` | RGBA | 4b153f73424ddcafa7279cb332553226f7fc3ec1975c282b287b0bd6f38e682d |
| `public/asset/arcani/icona/temperance.png` | RGBA | f103af044044ccefd94fedcb0145da0b2cd1d37c27aa8b744ba7250390e09774 |
| `public/asset/arcani/icona/devil.png` | RGBA | 3d640a60a9aafd6dca6c9e4938764179e0cce4d8c76cd160921b27356e6875a8 |
| `public/asset/arcani/icona/tower.png` | RGBA | 2f8470814910e0c268e5ecdd2db06b4d709542552499f7a671f4a48ad407afc4 |
| `public/asset/arcani/icona/star.png` | RGBA | 9e03edaa5741f0580499ffa2561d9c689997e509bb6d9fec85e881e3c51bf189 |
| `public/asset/arcani/icona/moon.png` | RGBA | 4d967d5f3e102e1afadcc46ef49650ab68124d54f1209b0563fee7de066da752 |
| `public/asset/arcani/icona/sun.png` | RGBA | 86894454133c8f55a1b2493a3860617119f488848c279c80d2b87b0859d2f270 |
| `public/asset/arcani/icona/judgement.png` | RGBA | 7ab57037951dca01ff58dfd01487e793723ad5f8f8deefb8a3456495d25f08fc |
| `public/asset/arcani/icona/world.png` | RGBA | c88f8e42e429928bece1425bc5c3b9e060b2d2af44418bf3cab9dda85e2ffeae |
| `public/asset/arcani/icona/faith.png` | RGBA | 17cdf037cfb9f0ec2812dc51249a2a9b9b8d51061a3b8638b47f9792e23b67a9 |
| `public/asset/arcani/icona/councillor.png` | RGBA | 14211df6657db81137a6085edec86931168d5b84c7f27ad4d507c20e585fe90d |
| `public/asset/doti/conoscenza.png` | RGBA | de1fb36ac2d0015f8ba7cb8ac280ff420d6b1c228bbf5b62544fb7f4bc2d3722 |
| `public/asset/doti/conoscenza-senza-testo.png` | RGBA | fc3efad7333382783ab004c8ddac6642c80097132c33f2f87b2be4193f2451f6 |
| `public/asset/doti/fascino.png` | RGBA | c9930742b6ece36dc6396c0913515bf152f1b075310b26062a49aaa1d9142ede |
| `public/asset/doti/fascino-senza-testo.png` | RGBA | f380fae42b2a109d7d7109610b2425fd9ea185a5b1b7ec335fb41423f843a790 |
| `public/asset/doti/coraggio.png` | RGBA | 78f59244a8e6daff67dd060fe7b470db103a0aef5653b90727323af6b4b27b02 |
| `public/asset/doti/coraggio-senza-testo.png` | RGBA | 50cdb184bc5d95494dea143fd5e362b19d5159edfe65546e6ebe707d15fa6e1f |
| `public/asset/arcani/hanged.png` | RGBA | e73815f35ea10646ac28e0949264368a57ce2fda70de125fbc2c57dcd4063b20 |
| `public/asset/arcani/hanged-senza-testo.png` | RGBA | cb8625dcec88a9b35169cee0245acb79bd683159ffa8723e18e9a4ebe770a120 |
| `public/asset/ui/rango-1.png` | RGBA | 2a5c7f655ee0ef06099bb883880175921f23e49eaeb7a94f12c9283389587880 |
| `public/asset/ui/rango-2.png` | RGBA | 82dc00ef4df7f6608259710a5d849e93c40e70833da89c48550ddd03ba46d45b |
| `public/asset/ui/rango-3.png` | RGBA | 96b2c0e677a641c3df8b6e4561f95a7bd5a235e78435c804379dde48afe7ad3a |
| `public/asset/ui/rango-4.png` | RGBA | 9e699fc9d0fae791db49884cf161b1956d2c91c1b44141ad3353d8ac49bd6f1e |
| `public/asset/ui/rango-5.png` | RGBA | 42af4497f7a71dbc7eb3a75cc2dd6f4f79fb735125294fb1f68ec4f7c0b38ee0 |
| `public/asset/ui/rango-6.png` | RGBA | ea9c98680c33935edecde0fadce4959cb45248658556331ed0b5ecc71f59b013 |
| `public/asset/ui/rango-7.png` | RGBA | 419d99b95ef8f68f57c302dc86c2be2726ce0ee1176284e3ce352d455398224c |
| `public/asset/ui/rango-8.png` | RGBA | b1adf4b218ed2d3757afc6dab81781d67fc370864309f54f1e7decd5d270a648 |
| `public/asset/ui/rango-9.png` | RGBA | f43985bdc0ab49c9c967447e8107b0d725441167e19adbecbc3db6f947bb2734 |
| `public/asset/ui/rango-max.png` | RGBA | 8d11e514995eefb9a379ce9bf869041c8ad43623995e5f1791f962dfb280c4f6 |
| `public/asset/ui/rango-senza-testo.png` | RGBA | 056e7f952a7ca20841fa1ff59ed6ba7a74c001d838e2a080658568cadb156a9d |
| `public/asset/ui/badge-allarme.png` | RGBA | 2d4b016481041c64ab3042157379ae5918d282475d73a8501996476a17ce0c30 |
| `public/asset/ui/badge-dlc.png` | RGBA | e987bc274a0d33b48a1ac31c591bf5d514f6e849c4b8394a9cfb0862ccb76a54 |
| `public/asset/ui/badge-tesoro.png` | RGBA | f16920cabd8ffbcbcfdabb51d9ef508bc7bf1cb8ac81b1743ad0060030a8fc56 |
| `public/asset/ui/badge-speciale.png` | RGBA | be4797a0396baf775d1ccdbfa85c94e5fc36a869077bb0fa588e322f4864cddd |
| `public/asset/ui/badge-nuova-partita.png` | RGBA | 36ef23b39af7a1b329dea0a3396ab54d5c7a9f7dde1904aa41c87a424a621211 |
| `public/asset/ui/badge-senza-testo.png` | RGBA | ea6592631f87098fac4d8f541867d37530251a1fb2ba4fd44929f6c91df78665 |
| `public/asset/ui/badge-allarme-senza-testo.png` | RGBA | fc007bde606d20750e178d120819ed2ce64fad2ee0bcc28f046483e18ab38452 |
| `public/asset/ui/pulsante-primario.png` | RGBA | 1540afa2a2ca918e9ffe59173c070d7729622b36feaddb7a43d421db6820fafe |
| `public/asset/ui/pulsante-secondario.png` | RGBA | 74c98e530ff154125ef472b9f3416f2f62e594a5d291a4a03e204161bb3bf2b4 |
| `public/asset/ui/cornice-scheda.png` | RGBA | a8fcdc926942b84fb24e8b6ecf87e97a04ab5cf11dd274ffa8b8dd3930626d65 |
| `public/asset/ui/stat-forza.png` | RGBA | 1bee5ba36608051f54921f6ee558cb1e3947e303240556e1904ed4bf352230d1 |
| `public/asset/ui/stat-magia.png` | RGBA | c8761f7a8c54e2d41d73de26925952e641e471ec34152eca8607b1a7bc212f2e |
| `public/asset/ui/stat-resistenza.png` | RGBA | 9dc96698f551c2b35cc298476a17fb950548f2eb58670641d8b63dccb88b0b93 |
| `public/asset/ui/stat-agilita.png` | RGBA | c0a6d1ab313d3d60b8df1690b05ffe4692e8915baf0df1cb448c621f097a8b00 |
| `public/asset/ui/stat-fortuna.png` | RGBA | daf519e30c89e20f94b01d2b1aae90544fe81e23d4f2cc9641a0b928f1bf82b4 |
| `public/asset/ui/tesoro-crystal-skull.png` | RGBA | 6b90d53a24b81a73366e3cccc0ca1f1902ecb526b88310b738c142155a1e5686 |
| `public/asset/ui/tesoro-koh-i-noor.png` | RGBA | 0e516937a57d8f63cff5029772cc31d192e273e539c67f079640baf2f8f15f5f |
| `public/asset/ui/tesoro-queens-necklace.png` | RGBA | 56ec140102f10ff247a45c714669626431bae6d3634a411bd2093e3ebde35b5b |
| `public/asset/ui/tesoro-regent.png` | RGBA | eb3616394140d36446e725bd23d000223dc75dc9efc3ffc43ca4cdd529e21599 |
| `public/asset/ui/tesoro-stone-of-scone.png` | RGBA | 5122c8370e23c3bf43872b284b59d6c86912ecfda94853bf57de75ac74ac3b31 |
| `public/asset/ui/tesoro-orlov.png` | RGBA | a29b2d01dd93201c3a13cebcd4d3e228dfcdec9d61e26850ccea8e1c38df3b4b |
| `public/asset/ui/tesoro-emperors-amulet.png` | RGBA | db7e73ed5143077b297274a3dc2d4200bdab6616427a705fa825f425e5ba2fb4 |
| `public/asset/ui/tesoro-hope-diamond.png` | RGBA | e1a0e62de2944791e79e00d47fb97c88d63cbc556fba8ce56ced1738e2edcfab |
| `public/asset/ui/tesoro-orichalcum.png` | RGBA | 5ff4528b0177c4ea26d4c4ebe0d6b4064f5d1a7fe30ab2703437ff179f66eeab |
| `public/asset/doti/gentilezza.png` | RGBA | 8e3f861e50e4b6c119ff36c346d9aced66a441d79b474d27d4f9d071ed8df0bb |
| `public/asset/doti/gentilezza-senza-testo.png` | RGBA | c6560653a850193a849cb49bc3be911fb03ad012366ddd014a55b5716ed8d9a8 |
| `public/asset/doti/perizia.png` | RGBA | a3320c696bd5503d49e047b5c7f158ebe0c6cef5e4716bf21818c1395672f5a1 |
| `public/asset/doti/perizia-senza-testo.png` | RGBA | 96d6742bcd2d836c12f29676bdcefd9641642413d1d6a4dc7dcd3aeb22f58abd |
| `public/asset/doti/stella-vuota.png` | RGBA | 262e04ed68c6454aa5e77acf7cea19fed51ca02dc38603157cbdfd7d5bcedd02 |
| `public/asset/doti/stella-vuota-senza-testo.png` | RGBA | 0373f44ffb735ed30b0cb5c5715c9cbcbbec2b4aedeb7f577a04df5e9813d33f |
| `public/asset/illustrazioni/vuoto-persona.png` | RGBA | 52de5069ad4230c9690561e03dbf3fb47a95442e60601e2bfb8ed8f49fe8ea83 |
| `public/asset/illustrazioni/vuoto-persona-senza-testo.png` | RGBA | 638dc466e5d1980326e37b92d870c32923245eef2f19b003f856f3cebdd4340e |
| `public/asset/illustrazioni/vuoto-partita.png` | RGBA | 295f6e611c4e9ade5f7b07a3220de5d099b33ada1af5f1f20186c0fa8520b04c |
| `public/asset/illustrazioni/vuoto-partita-senza-testo.png` | RGBA | 26bfb31135c1e285c89c23ef83ba9e265677a4afc5b12d603ccbe1ed4d12a317 |
| `public/asset/illustrazioni/errore.png` | RGBA | 60a0ba328fb7061cd10efe8b27660c938582ab448da9a5931120c28d453b2def |
| `public/asset/illustrazioni/errore-senza-testo.png` | RGBA | 31263c17bc9df77b6062a78aedb4c8a39bdf7895cd060d8f4f1fe51e7be3af30 |
| `public/asset/illustrazioni/caricamento.png` | RGBA | 446196ee86eb17b89479b2aa645e4526f61f08ad4bf90f5626a41a56584c2982 |
| `public/asset/illustrazioni/caricamento-1.png` | RGBA | 0f5b254338726132c8d2251b3ad92072141758a7eb383cfac6a2dc9dc6e48b88 |
| `public/asset/illustrazioni/caricamento-2.png` | RGBA | 415e4fb5e7f87319f6b0e84542750a372d06d3f349eaf8cdf0172e8377591a49 |
| `public/asset/illustrazioni/caricamento-3.png` | RGBA | b5598bea9584ed69040b38930968c84714e89d9ca040958348adbb0a0068bff3 |
| `public/asset/illustrazioni/caricamento-4.png` | RGBA | 1fee950e16094f3eab190b3977a6b71b59b70270a974bd619d9bde714d5afbdc |
| `public/asset/illustrazioni/caricamento-5.png` | RGBA | ab43a5345b3636ae19d62637ac1715ca6a9a32f527b8998ca8a78ee6b00e609a |
| `public/asset/illustrazioni/caricamento-6.png` | RGBA | 932e128facd2897217adb882373f0157fb01a57dc3201e5efc9f94d9165868a0 |
| `public/asset/illustrazioni/caricamento-7.png` | RGBA | 50566ee112da8c233200cd4b82c4c94b64962a54f8bb8907abb3ff9df1196ca8 |
| `public/asset/illustrazioni/caricamento-8.png` | RGBA | d93b270ba8d1f3e1a689d198aa298b77a1e0ca6b93cddb46d79409501127161b |
| `public/asset/confidenti/igor.png` | RGBA | 05e8d8c4a24fab808f86de0d8a41bc1a57afce2bfa4c54ce07f2541646db379d |
| `public/asset/confidenti/morgana.png` | RGBA | 6fa790c3c4dd82feb9d7cef72138047b3387d85a2c5303a127c78b2ee1918069 |
| `public/asset/confidenti/ryuji.png` | RGBA | 063cf6b9cd019688141b9f1df4c53237bebaf845d9a0794d1f6e06d89a692f4b |
| `public/asset/confidenti/ann.png` | RGBA | 26b4a7fd38a01699d932c3c419784f564444986fcba4804deaff4e369bd4d6c5 |
| `public/asset/confidenti/yusuke.png` | RGBA | 33ececb619bf492f9ec0ae2f451f6915334ab80bd1c37d93df1eacadd43a85b9 |
| `public/asset/confidenti/makoto.png` | RGBA | 48a6feb961d4a7ab2f05912a659e7cc276d905f8961c085b80cb28177203323b |
| `public/asset/confidenti/futaba.png` | RGBA | 4d89245c2883ab99c7efdcc14e433e298ef72c02cc01ecdbb81285a7c0d62806 |
| `public/asset/confidenti/haru.png` | RGBA | c62b3789f7d353aa8a970663a2015f969d225af6d07d3f69f7e9ec979ec7ccec |
| `public/asset/confidenti/akechi.png` | RGBA | abcf6b7da170c4edd612c4a708d5e4812adae2cb10d2a18064a88cfb839a446f |
| `public/asset/confidenti/kasumi.png` | RGBA | d763f7d29064b4c62b3796ebb3caee5aa0e4b1bafe80f037407cffb44f30f5c0 |
| `public/asset/confidenti/sojiro.png` | RGBA | ab735e8001ba90fa72def90bbd731999958b59128f74f19307e748758c92b8e7 |
| `public/asset/confidenti/takemi.png` | RGBA | eece60151a2913383c8e471c70f43adf20d8f2d75182970f8f82602658a67628 |
| `public/asset/confidenti/kawakami.png` | RGBA | fe9f313b13568a1e2499eebb906ada3a0726270ae7965426862f88880eb49608 |
| `public/asset/confidenti/yoshida.png` | RGBA | d93e671201f10f90b5a036258b540a0b9377f489516899b27145cf2338d904c7 |
| `public/asset/confidenti/mishima.png` | RGBA | 10131ceebffba6355fc065a5266dc1bd627a21128be265b0be45f06f798970ea |
| `public/asset/confidenti/ohya.png` | RGBA | f458f37a6f33bac823373662823860845e82a299013718e84d8656631fb2ccbe |
| `public/asset/confidenti/hifumi.png` | RGBA | f602f397d1295973e0ac839101b6fa87624b321e100f70d50b55987bc9e26794 |
| `public/asset/confidenti/chihaya.png` | RGBA | 69b2e161f7ffa740aa2eb4f4afdf00ade01bc2d2aa8298d9f6316914a217ce0e |
| `public/asset/confidenti/iwai.png` | RGBA | bb0a960a3201d44d28e68b72cedc22907543d73f55ed8773201bf99d62fb09bf |
| `public/asset/confidenti/shinya.png` | RGBA | e924eefd446fb19990a05f9e1801d4bcb2fad2a0378e4b91743e5f26304caee7 |
| `public/asset/confidenti/gemelle.png` | RGBA | 2ed91c653e29eb27922db4294f54ccdfdd0ccd0c2f89bc3f0048dbd869f44a49 |
| `public/asset/confidenti/sae.png` | RGBA | 625a005e436ac93d7e4bf24a8bb2a3e53b9cbcc2721f23c490b27c17274f1ff0 |
| `public/asset/confidenti/maruki.png` | RGBA | 36e4d5353a46d3778db2fc7d5d6905af1d490501a2e9b29a6bee62d8ec3e35d0 |
| `public/asset/confidenti/akechi-fedele.png` | RGBA | 09d93cc95322b2aac4b7ec8f805757509849b10f822e902850a9612da55a03bd |
| `public/asset/confidenti/ann-fedele.png` | RGBA | 2a522b39c18c07844376dd7fbc6a17ec70cfe1e9dafaa7bff7d5bf3f8427bc20 |
| `public/asset/confidenti/chihaya-fedele.png` | RGBA | 5bd3b26cca9c7885b2eb2ae8c0e3d01e5965cdd7319a074ddf552da11e60ad58 |
| `public/asset/confidenti/futaba-fedele.png` | RGBA | 1a85f051347781063fee15dfaa2335c83cae7e2d6a0368399bccfa927f280ffb |
| `public/asset/confidenti/gemelle-fedele.png` | RGBA | 090acb92c59664a52aae48b414dd1716ad9059e9e7c8a2a49fb79d1067448fe3 |
| `public/asset/confidenti/haru-fedele.png` | RGBA | c80c9d361f832b911d95d9161d9a3b55cbcf70c57fd14bba94ddd023e47df4b8 |
| `public/asset/confidenti/hifumi-fedele.png` | RGBA | a8739ad8613e09182c6ce7732ac8b78da79bddaddf7dc8c4ff694305f6171281 |
| `public/asset/confidenti/igor-fedele.png` | RGBA | a4b64dfcff31feaecee69e88191438c19719129682c9bc41bb3101ac5cf1a849 |
| `public/asset/confidenti/iwai-fedele.png` | RGBA | ce41fa68b61e2ba3a9fd9c1e5cd7ff8f703b6e9bcc3f6ba9223f30247a616787 |
| `public/asset/confidenti/kasumi-fedele.png` | RGBA | 0b5215abc4747600e0dafdc2edc34b44c07136fc66765dc9f408ee7c8fbab2cc |
| `public/asset/confidenti/kawakami-fedele.png` | RGBA | 51fdd4f877567b47f24acff3c48ad9229e065d1b9b89935b2f4baedf9bf7537f |
| `public/asset/confidenti/makoto-fedele.png` | RGBA | b9c9cc79bdba1b6a805d52e6f91e5872b8d97e3e0cf33f1b2e86f9bf5b77d6d8 |
| `public/asset/confidenti/maruki-fedele.png` | RGBA | 5dba451f94fa521cb160696e3ccc25184f9aed63d2c95156325301018474c1b4 |
| `public/asset/confidenti/mishima-fedele.png` | RGBA | 51823288d173584795d8c7826a1dd4d79e0ed28838d0955ef33161cf65428914 |
| `public/asset/confidenti/morgana-fedele.png` | RGBA | 5e7d8f2dacb2e30f6b040cf307521d5f41df008d66267a036808c1f707a7a7a7 |
| `public/asset/confidenti/ohya-fedele.png` | RGBA | 07733679d4f5eeb4fbd594db175094ed9ff8b2b5b293c3d72b0b7f8a5761e56d |
| `public/asset/confidenti/ryuji-fedele.png` | RGBA | 2a5e3435d437e032886403346bbcd6f53b84435c3bf1857241cfb842863e0214 |
| `public/asset/confidenti/sae-fedele.png` | RGBA | 16ba8a6cc7bc95ea42403ce05d06f2fbdaf5fdfd8f8b795786802009d6a4ad9b |
| `public/asset/confidenti/shinya-fedele.png` | RGBA | 361a6f5837a425581dff7783ed2e8b2f09a4a96cb87694cf0d66546b40fa62ec |
| `public/asset/confidenti/sojiro-fedele.png` | RGBA | e852dd4d8c20d7aab50c5e1f9e2532e9ec926a744b345176f1cbea8ea62a2347 |
| `public/asset/confidenti/takemi-fedele.png` | RGBA | 1d58dd66e7ed021b340c153035e572900774fa06d0a6671c206d1b4e625fee29 |
| `public/asset/confidenti/yoshida-fedele.png` | RGBA | 5140bc5b3b253eeaf2ed031b78f95574f72a36c5b7ae36b4a66751c0b4893c2f |
| `public/asset/confidenti/yusuke-fedele.png` | RGBA | b1e7eac60d000055ecef9f6431e7714b8eb05bfbe2368fc087af969edf41755c |
