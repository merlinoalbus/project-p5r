# Stato del lavoro — Atlante del mondo P5R

File di avanzamento tenuto da Claude. Sostituisce `ATLANTE-CONSEGNA.md` come punto di ripresa:
la consegna resta come fotografia del 6 settembre 2026, questo file dice **dove siamo adesso**.

**Verifiche finali:** a carico di Codex, che risponde in `docs/ESITOVERIFICHE.md` (stessa cartella).
Quando dichiaro una fase **PRONTA PER VERIFICA** Codex la revisiona e scrive lì le evidenze;
io intanto proseguo con la fase successiva e recepisco i rilievi appena arrivano.

**Canale:** il ramo `lavoro/atlante-mondo` su `github`. Faccio `git push` a ogni dichiarazione di
pronto e a ogni punto di lavoro significativo; faccio `git pull` prima di leggere
`ESITOVERIFICHE.md`. Se una dichiarazione non è stata spinta, non è arrivata.

- Worktree: `C:\Repository\project-p5r-main`, ramo `lavoro/atlante-mondo`
- App: BE 3101 / FE 5273 (`bash scripts/start-all.sh`), DB `data/project-p5r.db` (1 partita dell'utente)
- Piano completo: le 5 fasi sono descritte qui sotto in sintesi; il dettaglio è nel piano approvato

---

## Quadro di partenza (misurato il 6 settembre 2026)

| | valore |
|---|---|
| nodi mappa a runtime | 344 (308 dal seed + 36 contenitori generati all'avvio) |
| pin | 387, di cui **303 senza mappa**, e solo **5 su 3 delle 301 planimetrie native** |
| `spillo_destinazione` (punti di arrivo) | 0 righe |
| `mappa_entita` | 0 righe |
| `condizioni_json` valorizzati | 0 su 387 |
| etichette ancora tecniche | 51 |
| famiglie di omonimi | 62 famiglie / 179 nodi, 10 distinti |
| suite test | 533 PASS, 1 FAIL |

Decisioni dell'utente che governano il lavoro:
1. la bozza attuale delle mappe **non va preservata**: il livello mappe si ricostruisce ex novo.
   Restano intatti partite, catalogo, Persona e i contenuti editoriali della guida;
2. i **segnalini restano quelli dell'app** (`public/asset/ui/spillo-*.png`): i segnalini gialli
   originali del gioco non si usano. Gli atlanti `ICON_*.BIN` servono solo a capire *cosa
   significa* ogni pin nativo, non a disegnarlo;
3. verifiche finali a Codex, in parallelo.

---

## Fase 0 — Sblocco delle fonti e test rosso · **IN CORSO**

Obiettivo: portare in chiaro le fonti native mai usate e chiudere l'unico test rosso.

| passo | stato | esito |
|---|---|---|
| ripristino dei 1480 originali dai CPK | ✅ fatto | `python tools/p5r-map-export/restore_originals.py` → «Originali ripristinati e verificati: 1480» in `data/atlas/extracted/originali/` (ignorati da git, rigenerabili a hash verificati) |
| correzione `server/routes/mappe-editor.test.ts:55` | ✅ fatto | la chiave pubblica del Dedalo è `memento` (percorso derivato dal nome di seed «Memento»), non più `mementos-i-dedali`; da riconfermare con la suite completa |
| `whole_map_names.py` — nomi ufficiali IT delle mappe d'insieme | ⬜ da fare | da `FLDWHOLEMAPTABLE.FTD` + `FLDWHOLEMAPTABLEDNG.FTD` |
| `dungeon_place_index.py` — indice luoghi dei dungeon | ⬜ da fare | da `FLDDNGPLACENO.FTD` + `FLDATDNGPLACENO.FTD`; sblocca i 59 nomi residui e i 16 `???` di Maruki |
| `map_icons.py` — atlanti icone per la semantica dei pin | ⬜ da fare | 178 `ICON_*.BIN`, indicizzati da `nativeType` |
| `subway_network.py` — rete della metropolitana | ⬜ da fare | da `FLDLMAPSTATION/LINE/FARE.FTD` |

### Risorse sbloccate dal ripristino

Erano nell'archivio compresso e non erano mai state portate in chiaro:

| risorsa | n | a cosa serve |
|---|---|---|
| `BASE/FIELD/PANEL/ROADMAP/ICON_*.BIN` | 178 | dà il significato certo dei 104 `nativeType` dei 1429 pin nativi |
| `IT/FIELD/PANEL/FLDWHOLEMAPTABLE(.DNG).FTD` | 2 | nomi ufficiali italiani delle mappe d'insieme |
| `BASE/FIELD/FTD/FLDDNGPLACENO.FTD` | 190 record | i nomi mancanti dei dungeon |
| `BASE/FIELD/FTD/FLDATDNGPLACENO.FTD` | — | luoghi dei Memento |
| `IT/…/LMAP/FLDLMAPSTATION/LINE/FARE.FTD` | 3 | stazioni, linee e tratte della metropolitana |
| `IT/…/MIDDLE_MAP/FLDMDLMAPITEM.FTD` | — | voci della mappa intermedia |

---

## Fase 1 — Organizzazione dell'atlante · ⬜ da iniziare

Nomi corretti, gerarchia completa, deduplicazione secondo il record nativo di presentazione
(`texpack` + `texelem` + indice titolo + offset), non secondo il titolo. Pacchetto seed
autosufficiente, migrazione per il ruolo dell'immagine, reset e ricarica dei soli dati mappe,
indice a schede con presentazione uniforme degli omonimi.

## Fase 2 — Pin di tutti i tipi · ⬜ da iniziare

Semantica certificata degli ID icona nativi, certificazione del riferimento pin↔planimetria,
import dei pin per tutte le categorie richieste (negozi, confidenti, attività, oggetti, passaggi,
stazioni, rampino, scorciatoie, salvataggio).

## Fase 3 — Collegamenti effettivi · ⬜ da iniziare

Proiezione 3D→2D certificata per mappa, collegamenti con partenza e arrivo precisi, condizioni
narrative da giorno/momento/meteo, accessi dalle altre sezioni dell'app.

## Fase 4 — Specifica grafica per Codex · ⬜ da iniziare

Prompt per i soli asset che risultano davvero mancanti dopo le fasi 1-3, nello stile degli
esistenti, in `docs/grafica/prompt-immagini.md` e `docs/grafica/stato-generazione-asset.md`.

---

## Registro delle dichiarazioni di pronto

| data | fase | dichiarazione |
|---|---|---|
| — | — | nessuna ancora |
