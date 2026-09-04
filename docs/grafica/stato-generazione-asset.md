# Stato della generazione degli asset

Registro richiesto dall’utente il 2026-09-03. Fonte: `prompt-immagini.md`, `riferimenti-visivi.md` e `data/seed/persona.json`.

**665 file richiesti: 640 completati e approvati, 25 ancora da consegnare.** La Fase 11.6 (§13) è completa e validata 37/37.

Le voci degli asset consegnati e approvati sono in `archivio-grafico.md`.

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
- Per ciascuno dei cinque asset `personaggi`, produrre due versioni: `<chiave>.png` come reinterpretazione originale dalla descrizione del §14 e `<chiave>-fedele.png` nello stesso stile, dopo ricerca online del soggetto canonico e traduzione dei suoi tratti riconoscibili in un prompt testuale. Entrambe 768×1024, trasparenti e senza testo.
- Anche per ciascuna delle 27 voci `persona-gruppo`, recuperare prima un riferimento canonico online e tradurne i tratti identificativi in un prompt testuale, senza allegare o copiare l'artwork ufficiale.

## Riepilogo

| Categoria | Richiesti | Completati | Da consegnare |
|---|---:|---:|---:|
| identita | 11 | 11 | 0 |
| sfondi | 4 | 4 | 0 |
| arcani | 72 | 72 | 0 |
| elementi | 16 | 16 | 0 |
| affinita | 12 | 12 | 0 |
| doti | 12 | 12 | 0 |
| ui | 51 | 51 | 0 |
| illustrazioni | 23 | 23 | 0 |
| confidenti | 46 | 46 | 0 |
| persona | 232 | 232 | 0 |
| meteo | 17 | 17 | 0 |
| guida | 15 | 15 | 0 |
| palazzi | 10 | 10 | 0 |
| personaggi | 10 | 10 | 0 |
| ui (schede Partita e Fusione, §16) | 17 | 17 | 0 |
| ui (azioni, §17) | 46 | 46 | 0 |
| persona-gruppo (§15) | 27 | 27 | 0 |
| ui (spilli, §18) | 19 | 19 | 0 |
| mappe (§19) | 25 | 0 | 25 |

## Elenco degli asset da consegnare

### persona-gruppo (§15)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/persona-gruppo/captain-kidd.png` — 768×768 (§15)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/persona-gruppo/seiten-taisei.png` — 768×768 (§15)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/persona-gruppo/william.png` — 768×768 (§15)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/persona-gruppo/carmen.png` — 768×768 (§15)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/persona-gruppo/ecate.png` — 768×768 (§15)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/persona-gruppo/celestine.png` — 768×768 (§15)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/persona-gruppo/zorro.png` — 768×768 (§15)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/persona-gruppo/mercurio.png` — 768×768 (§15)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/persona-gruppo/diego.png` — 768×768 (§15)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/persona-gruppo/goemon.png` — 768×768 (§15)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/persona-gruppo/kamu-susano-o.png` — 768×768 (§15)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/persona-gruppo/gorokichi.png` — 768×768 (§15)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/persona-gruppo/ioanna.png` — 768×768 (§15)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/persona-gruppo/anat.png` — 768×768 (§15)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/persona-gruppo/agnes.png` — 768×768 (§15)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/persona-gruppo/necronomicon.png` — 768×768 (§15)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/persona-gruppo/prometeo.png` — 768×768 (§15)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/persona-gruppo/al-azif.png` — 768×768 (§15)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/persona-gruppo/milady.png` — 768×768 (§15)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/persona-gruppo/astarte.png` — 768×768 (§15)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/persona-gruppo/lucy.png` — 768×768 (§15)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/persona-gruppo/robin-hood.png` — 768×768 (§15)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/persona-gruppo/loki.png` — 768×768 (§15)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/persona-gruppo/ervardo.png` — 768×768 (§15)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/persona-gruppo/cenerentola.png` — 768×768 (§15)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/persona-gruppo/vanadis.png` — 768×768 (§15)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/persona-gruppo/ella.png` — 768×768 (§15)

### ui — spilli (§18)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/spillo-passaggio.png` — 128×128 (§18)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/spillo-negozio.png` — 128×128 (§18)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/spillo-forziere.png` — 128×128 (§18)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/spillo-tesoro.png` — 128×128 (§18)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/spillo-boss.png` — 128×128 (§18)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/spillo-miniboss.png` — 128×128 (§18)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/spillo-sicura.png` — 128×128 (§18)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/spillo-scorciatoia.png` — 128×128 (§18)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/spillo-confidente.png` — 128×128 (§18)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/spillo-attivita.png` — 128×128 (§18)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/spillo-ristorante.png` — 128×128 (§18)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/spillo-distributore.png` — 128×128 (§18)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/spillo-treno.png` — 128×128 (§18)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/spillo-nota.png` — 128×128 (§18)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/spillo-nemico.png` — 128×128 (§18)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/spillo-oggetto-chiave.png` — 128×128 (§18)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/spillo-punto-sensibile.png` — 128×128 (§18)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/spillo-tesoro-palazzo.png` — 128×128 (§18)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/spillo-seme-bramosia.png` — 128×128 (§18)

### mappe (§19)
- [ ] **DA CONSEGNARE** — `public/asset/mappe/tokyo.png` — 2048×1536 (§19)
- [ ] **DA CONSEGNARE** — `public/asset/mappe/citta-yongen-jaya.png` — 2048×1536 (§19)
- [ ] **DA CONSEGNARE** — `public/asset/mappe/citta-shibuya.png` — 2048×1536 (§19)
- [ ] **DA CONSEGNARE** — `public/asset/mappe/citta-shinjuku.png` — 2048×1536 (§19)
- [ ] **DA CONSEGNARE** — `public/asset/mappe/citta-kichijoji.png` — 2048×1536 (§19)
- [ ] **DA CONSEGNARE** — `public/asset/mappe/citta-akihabara.png` — 2048×1536 (§19)
- [ ] **DA CONSEGNARE** — `public/asset/mappe/citta-shujin-academy.png` — 2048×1536 (§19)
- [ ] **DA CONSEGNARE** — `public/asset/mappe/citta-kanda-jinbocho.png` — 2048×1536 (§19)
- [ ] **DA CONSEGNARE** — `public/asset/mappe/citta-ikebukuro.png` — 2048×1536 (§19)
- [ ] **DA CONSEGNARE** — `public/asset/mappe/citta-harajuku.png` — 2048×1536 (§19)
- [ ] **DA CONSEGNARE** — `public/asset/mappe/citta-ueno.png` — 2048×1536 (§19)
- [ ] **DA CONSEGNARE** — `public/asset/mappe/citta-inokashira-park.png` — 2048×1536 (§19)
- [ ] **DA CONSEGNARE** — `public/asset/mappe/citta-odaiba.png` — 2048×1536 (§19)
- [ ] **DA CONSEGNARE** — `public/asset/mappe/citta-shinagawa.png` — 2048×1536 (§19)
- [ ] **DA CONSEGNARE** — `public/asset/mappe/citta-nakano.png` — 2048×1536 (§19)
- [ ] **DA CONSEGNARE** — `public/asset/mappe/citta-ogikubo.png` — 2048×1536 (§19)
- [ ] **DA CONSEGNARE** — `public/asset/mappe/citta-yokohama-chinatown.png` — 2048×1536 (§19)
- [ ] **DA CONSEGNARE** — `public/asset/mappe/citta-maihama.png` — 2048×1536 (§19)
- [ ] **DA CONSEGNARE** — `public/asset/mappe/citta-roppongi.png` — 2048×1536 (§19)
- [ ] **DA CONSEGNARE** — `public/asset/mappe/citta-tsukishima.png` — 2048×1536 (§19)
- [ ] **DA CONSEGNARE** — `public/asset/mappe/citta-meiji-shrine.png` — 2048×1536 (§19)
- [ ] **DA CONSEGNARE** — `public/asset/mappe/citta-ichigaya.png` — 2048×1536 (§19)
- [ ] **DA CONSEGNARE** — `public/asset/mappe/citta-suidobashi.png` — 2048×1536 (§19)
- [ ] **DA CONSEGNARE** — `public/asset/mappe/citta-asakusa.png` — 2048×1536 (§19)
- [ ] **DA CONSEGNARE** — `public/asset/mappe/citta-mementos.png` — 2048×1536 (§19)

### ui — azioni (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-regalo.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-uscita.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-annulla-ultimo.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-sbloccato.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-bloccato.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-note.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-modifica.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-sms.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-esame-primo.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-esame-top10.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-fortuna.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-libro.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-evoca.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-esegui.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-allarme.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-elimina.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-ricalcola.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-riapri.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-albero.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-ricetta.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-piano.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-scheda.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-raggiunto.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-annulla.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-tutti.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-aperti.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-obiettivo.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-carica-altri.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-seleziona.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-deseleziona.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-riprova.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-registra.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-indietro.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-carica.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-url.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-chiudi.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-attiva.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-mappa.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-ingrandisci.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-riduci.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-adatta.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-calendario.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-esaurito.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-accettata.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-negozio.png` — 128×128 (§17)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/azione-filtri.png` — 128×128 (§17)

### ui — schede della Partita (§16)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/scheda-doti.png` — 128×128 (§16)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/scheda-confidenti.png` — 128×128 (§16)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/scheda-scorta.png` — 128×128 (§16)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/scheda-compendio.png` — 128×128 (§16)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/scheda-obiettivi.png` — 128×128 (§16)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/scheda-piani.png` — 128×128 (§16)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/scheda-cicli.png` — 128×128 (§16)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/scheda-storico.png` — 128×128 (§16)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/scheda-riepilogo.png` — 128×128 (§16)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/scheda-fusione-calcolatore.png` — 128×128 (§16)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/scheda-fusione-ricette.png` — 128×128 (§16)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/scheda-fusione-con.png` — 128×128 (§16)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/scheda-fusione-piani.png` — 128×128 (§16)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/scheda-fusione-skill.png` — 128×128 (§16)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/scheda-fusione-cicli.png` — 128×128 (§16)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/scheda-fusione-forca.png` — 128×128 (§16)
- [x] **COMPLETATO — galaxy_task_validator PASS** — `public/asset/ui/scheda-fusione-speciali.png` — 128×128 (§16)

### personaggi
- [x] **COMPLETATO — approvato dall'utente; galaxy_task_validator PASS** — `public/asset/personaggi/joker.png` — 768×1024 (§14)
- [x] **COMPLETATO — approvato dall'utente; galaxy_task_validator PASS** — `public/asset/personaggi/joker-fedele.png` — 768×1024 (§14, variante fedele richiesta dall'utente)
- [x] **COMPLETATO — approvato dall'utente; galaxy_task_validator PASS** — `public/asset/personaggi/caroline.png` — 768×1024 (§14)
- [x] **COMPLETATO — approvato dall'utente; galaxy_task_validator PASS** — `public/asset/personaggi/caroline-fedele.png` — 768×1024 (§14, variante fedele richiesta dall'utente)
- [x] **COMPLETATO — approvato dall'utente; galaxy_task_validator PASS** — `public/asset/personaggi/justine.png` — 768×1024 (§14)
- [x] **COMPLETATO — approvato dall'utente; galaxy_task_validator PASS** — `public/asset/personaggi/justine-fedele.png` — 768×1024 (§14, variante fedele richiesta dall'utente)
- [x] **COMPLETATO — approvato dall'utente; galaxy_task_validator PASS** — `public/asset/personaggi/jose.png` — 768×1024 (§14)
- [x] **COMPLETATO — approvato dall'utente; galaxy_task_validator PASS** — `public/asset/personaggi/jose-fedele.png` — 768×1024 (§14, variante fedele richiesta dall'utente)
- [x] **COMPLETATO — approvato dall'utente; galaxy_task_validator PASS** — `public/asset/personaggi/lavenza.png` — 768×1024 (§14)
- [x] **COMPLETATO — approvato dall'utente; galaxy_task_validator PASS** — `public/asset/personaggi/lavenza-fedele.png` — 768×1024 (§14, variante fedele richiesta dall'utente)
