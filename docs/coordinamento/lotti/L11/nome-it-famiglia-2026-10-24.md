# R11-02/10 — la famiglia `nome_it` (libro, film, articolo): lettori e piano di rimozione (2026-10-24)

Richiesta del PM. Sola lettura, nessun commit. Dati: copia di p5s migrata a HEAD; codice HEAD `32361379` (più le modifiche non committate della working copy). Ambito: **solo** le colonne `libro.nome_it`, `film.nome_it`, `articolo.nome_it` e il campo DTO `nomeIt` di libro, film, articolo. Il `nomeIt` di Persona, Skill, Ombre, Obiettivi è un'altra cosa e **non si tocca**.

## 1. In breve

- `nome_it` è oggi una **copia storica** di `catalogo_oggetto.nome`: la scrittura (`catalogoService.ts:125`) lo riallinea a ogni salvataggio. Provato: libro 46/46, film 14/14 uguali al catalogo; articolo 1 riga diversa (§3).
- I lettori sono **sul lato server 16 punti in 12 file**, **sul lato FE 12 punti in 6 file** (elenco §2). Nessun lettore usa `nome_it` come informazione che il catalogo non abbia: tutti possono leggere `catalogo_oggetto.nome` (o `COALESCE(c.nome, l.nome)` dove il catalogo manca).
- La ricerca resta **identica** se si tolgono i lettori nell'ordine del piano (§4): per libri e film `nome_it` è già coperto dal nome del catalogo (`c.nome`); per gli articoli l'indice non lo legge affatto.
- **Una sola domanda all'utente** (§5), sul nome inglese dell'articolo divergente.

## 2. Elenco completo dei lettori (file:riga)

### 2.1 Server — scrittura e schemi
| Punto | Che cosa fa | Porting |
|---|---|---|
| `server/services/catalogoService.ts:48-50` | elenco colonne ammesse per articolo/libro/film (`nome_it` incluso) | togliere `nome_it` dagli elenchi |
| `catalogoService.ts:125` | `dati.nome = oggetto.nome; dati.nome_it = oggetto.nome;` (riallinea la copia) | togliere solo `dati.nome_it` |
| `catalogoService.ts:304` | `delete d[c]` per `nome_it` fra le colonne del catalogo | togliere dall'elenco |
| `catalogoService.ts:512` | `delete dati.nome_it` | togliere |
| `server/schemas/catalogo.ts:94, 134, 163` | zod: `nome_it: testo(160).nullable().optional()` per articolo, libro, film | togliere le tre righe |
| `server/services/catalogoOggettiProposte.ts:71` | nome di una proposta: `catalogo_nome` poi `nome_it` poi `nome` | togliere il ramo `nome_it` |
| `catalogoOggettiProposte.ts:173` | elenco campi «verificati» `['nome','nome_it']` | togliere `nome_it` |
| `server/services/snapshotProposteOggetti.ts:25` | colonne copiate nello snapshot (`'nome','nome_it',…`) | togliere `nome_it` |
| `server/services/censimentoLuoghiCondizioniService.ts:15` | colonne di `articolo` lette dal censimento | togliere `nome_it` (e `shared/censimentoLuoghiCondizioni.ts` se la riporta) |

### 2.2 Server — lettura (nomi mostrati, ricerca, conversioni)
| Punto | Che cosa fa | Porting |
|---|---|---|
| `server/services/ricerca/indiceRicerca.ts:171` | `altro2 = l.nome_it / f.nome_it` nelle «altre denominazioni» di libri e film | togliere `altro2` (è già nel catalogo, `c.nome`) |
| `server/services/suggerimentiService.ts:117-122` | per ogni articolo indicizza `a.nome` e `a.nome_it` | indicizzare `catalogo.nome`, `nomi_altri_json` (vedi §4 passo 3) |
| `server/services/negoziService.ts:168` | DTO articolo: `nomeIt: oggetto?.nome ?? (r.nome_it \|\| null)` | `nomeIt` sparisce dal DTO; il nome è `nome` |
| `negoziService.ts:286` | filtro `q` senza catalogo: `a.nome_it LIKE ?` | togliere il confronto (il ramo con catalogo non lo usa) |
| `negoziService.ts:314` | filtro `q` sul DTO: `a.nomeIt` | togliere dall'elenco |
| `negoziService.ts:355, 358` | testi di cestino/evento: `prodotto.nomeIt ?? prodotto.nome` | `prodotto.nome` |
| `server/services/attivitaService.ts:160, 176` | DTO libro/film: `nomeIt: oggetto?.nome ?? r.nome_it` | togliere `nomeIt` dai due DTO |
| `attivitaService.ts:50-51` | interfacce riga con `nome_it` | togliere il campo |
| `attivitaService.ts:423, 500` | nome corrente per messaggi: `… (riga as RigaLibro).nome_it ?? riga.nome` | `catalogo.get(chiave)?.nome ?? riga.nome` |
| `server/services/azioniStrutturateService.ts:27` | `COALESCE(l.nome_it,l.nome)` come nome originale per le azioni delle attività | `COALESCE(c.nome, l.nome)` con join sul catalogo |
| `server/services/giornataService.ts:76, 81` | `COALESCE(nome_it, nome)` per articolo (acquisti del giorno) | `COALESCE(c.nome, a.nome)` con join sul catalogo; vedi nota sul difetto latente (§6) |
| `server/services/acquistiService.ts:85` | `catalogo_nome ?? nome_it ?? nome` | togliere il ramo `nome_it` |
| `server/db/acquistiLegacy.ts:94` | `articolo?.nome_it ?? articolo?.nome` | `nome` |
| `server/db/conversioneEffettiAzione.ts:79-83` | nomi di libro e film per la conversione degli effetti: `[r.nome, r.nome_it]` | solo `r.nome` + nome catalogo |
| `server/routes/condizioni.ts:65-66` | elenchi di scelta per l'editor delle condizioni: `COALESCE(nome_it, nome)` | `COALESCE(c.nome, nome)` con join |
| `server/services/condizioni/nomiCondizioni.ts:47-52` | nomi per le condizioni (articoli, letture), con i rami di ripiego `c.nome, nome_it, nome` | togliere `nome_it` dal ripiego e dal ramo senza catalogo |
| `server/services/condizioni/contestoConversione.ts:51-53` | ricerca per nome per la conversione condizioni: `SELECT chiave, nome, nome_it` per libro, film, articolo | togliere `nome_it` |

### 2.3 Tipi condivisi
| `shared/types.ts:1561` (`ArticoloDto`), `:1995` (`LibroDto`), `:2052` (`FilmDto`) | campo DTO `nomeIt: string \| null` | togliere dopo che FE non legge più. La riga 1118 è di `BattagliaSfidaDto`: fuori ambito |

### 2.4 Frontend
| Punto | Uso |
|---|---|
| `src/components/catalogo/LetturaDellOggetto.tsx:43, 53` | titolo di libro/film: `nomeIt ?? nome` |
| `src/components/partita/LettureEGiochi.tsx:127, 129` | nome delle voci di lettura/film |
| `src/pages/FilmPage.tsx:42, 83, 99` | `nomeFilm`, avviso doti, filtro di ricerca `${f.nome} ${f.nomeIt ?? ''} …` |
| `src/pages/LibriPage.tsx:71, 85, 106, 180, 181` | avviso doti, filtro di ricerca, intestazioni |
| `src/components/guida/ArticoliTabella.tsx:40, 79` | `a.nomeIt ?? a.nome`; «Nome originale» se `nomeIt !== nome` |
| `src/hooks/useMappaPartita.ts:132` | messaggi di conferma acquisto: `a.nomeIt ?? a.nome` |
| `src/utils/articoli.ts:48` | etichetta dell'articolo |

Non rientrano: `Calcolatore`, `Fusione*`, `Compendio`, `CicliSalvati`, `PianiSalvati`, `ObiettiviPartita` (sono Persona/Skill/Obiettivi). Prima del passo FE va fatto un `grep` finale su `nomeIt` filtrando solo i tipi `LibroDto`, `FilmDto`, `ArticoloDto` (i tre DTO lo fanno uscire dal compilatore appena tolto il campo: il typecheck indica ogni residuo).

## 3. L'articolo divergente: «Condenser Lens»

Dato (HEAD): negozio `tanaka-affari-loschi`, chiave `condenser-lens`, `nome='Condenser Lens'`, `nome_it='Lente condensante'`, `catalogo_chiave='materiale/lente-condensante-2'`; il catalogo ha `nome='Lente condensante'` e `nomi_altri_json=["Condenser Lens"]`. `origine='utente'`, `nascosto=1` (nascosta dall'utente), prezzo 3600.

- **Nome italiano giusto: «Lente condensante».** È quello della guida italiana (AllGameStaff, dalla cui lista nasce l'app) ed è già il nome del catalogo.
- **Nome inglese del gioco: «Condenser Lens»** (Samurai Gamers e liste dei materiali della versione inglese); nel catalogo è già `nomi_altri_json` e resta trovabile in ricerca.
- La riga non perde nulla: `nome` (colonna articolo) contiene l'inglese, `nome_it` l'italiano uguale al catalogo; dopo la rimozione l'italiano è `catalogo.nome`, l'inglese `catalogo.nomi_altri_json` e la colonna `articolo.nome` (che resta).
- Nessuna decisione sul nome da prendere: il piano non cambia nessun testo.

## 4. Piano di rimozione passo per passo (ricerca identica)

Ordine pensato perché ogni passo compili e si possa fermare dopo ciascuno.

1. **Prova di partenza (BE, sola lettura).** Conteggi: libro `nome_it` ≠ `catalogo.nome` = 0/46, film 0/14, articolo 1/… (la sola Condenser Lens nascosta). Se cambia, si ferma e si guarda la riga.
2. **FE: smettere di leggere `nomeIt`** nei 7 file di §2.4 (`nomeIt ?? nome` → `nome`; i filtri di ricerca di Film e Libri perdono il solo termine `nomeIt`, che coincide con `nome` del DTO perché `nome` è già il nome del catalogo). Il filtro mantiene `nomiAltri`, quindi cerca ancora «Condenser Lens».
3. **BE: i lettori della ricerca.** (a) `indiceRicerca.ts:171` — togliere `altro2`; i libri/film perdono un duplicato di `c.nome` che l'indice già contiene. (b) `suggerimentiService.ts:117-122` — oggi indicizza `a.nome` (inglese per Condenser Lens) e `a.nome_it`; sostituire con `c.nome` e i `nomi_altri_json` del catalogo per le righe con `catalogo_chiave`, `a.nome` per le altre: insieme dei nomi suggeriti **uguale** (italiano + inglese). (c) `negoziService.ts:286` e `314` — togliere `nome_it`/`nomeIt`: nel ramo con catalogo la ricerca usa già `nomi_altri_json`/`nome_originale`; nel ramo senza catalogo `a.nome` copre l'inglese.
4. **BE: nomi mostrati.** `negoziService:168/355/358`, `attivitaService:160/176/423/500`, `acquistiService:85`, `acquistiLegacy:94`, `giornataService:76/81`, `azioniStrutturateService:27`, `conversioneEffettiAzione:79-83`, `condizioni.ts:65-66`, `nomiCondizioni.ts:47-52`, `contestoConversione.ts:51-53`: tutti a `COALESCE(catalogo.nome, colonna nome)` con join su `catalogo_chiave`.
5. **BE: scrittura e schemi.** `catalogoService.ts:48-50, 125, 304, 512`, `schemas/catalogo.ts:94/134/163`, `catalogoOggettiProposte.ts:71/173`, `snapshotProposteOggetti.ts:25`, `censimentoLuoghiCondizioniService.ts:15`. Aggiornare le descrizioni OpenAPI (rotte ↔ descrizioni 1:1).
6. **Tipi condivisi.** Togliere `nomeIt` dai tre DTO (`ArticoloDto`, `LibroDto`, `FilmDto`) in `shared/types.ts`. Il compilatore indica ogni residuo.
7. **Migrazione (ultima).** Con la convenzione già in uso: `ALTER TABLE … DROP COLUMN nome_it` su `libro`, `film`, `articolo` in `server/db/migrations/`, preceduta dalla copia del valore divergente (Condenser Lens: nessuna perdita, l'italiano è `catalogo.nome`) in `dati_guida` come archivio e dalla registrazione in `FONTI_TOLTE` con motivo `colonna-rimossa` per il cestino, come nelle bonifiche precedenti. La migrazione parte **dopo** i passi 2-6 perché il codice non legga più la colonna.
8. **Controllo finale a ricerca invariata** (sola lettura, copia migrata): per un insieme di termini (tutti i nomi `catalogo.nome` + `nomi_altri_json` di libri, film e articoli di ogni negozio) i risultati dell'indice, dei suggerimenti e del filtro dei negozi prima e dopo devono coincidere. Il confronto va fatto prima di rilasciare e lo esegue il verificatore avversariale.

## 5. Domanda per l'utente (una riga)

«Rimuoviamo la colonna `nome_it` da libri, film e articoli (è una copia del nome del catalogo, 46/46, 14/14 e un solo articolo diverso, “Condenser Lens”, nascosto da te, il cui nome italiano è “Lente condensante”): confermi?»

## 6. Limiti e note

- Elenco dei lettori ottenuto con `grep` su `server/`, `shared/`, `scripts/` e `src/` (escluse migrazioni e test): le migrazioni storiche (`db/migrations`, `db/migrazioniUtente`) citano `nome_it` e **non si modificano** (append-only). I test che citano `nomeIt` (`citta.test.ts:113`, `negozi.test.ts:75`) sono nel repository: con «zero test» non si eseguono, ma vanno aggiornati nello stesso lotto perché compilino.
- **Difetto latente:** in `giornataService.ts:76,81` il nome è letto da `articolo` con `COALESCE(nome_it, nome)`: per gli articoli la cui colonna `nome` è vuota (`''`, valore usato dal catalogo unico) il giorno mostra una riga senza nome. Il passo 4 lo risolve perché passa al nome del catalogo.
- Non ho verificato a runtime né eseguito prove di confronto della ricerca: il passo 8 è da fare in fase di implementazione.
