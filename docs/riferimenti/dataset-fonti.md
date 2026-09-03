# Fonti del dataset Persona 5 Royal

Analisi svolta il 2026-09-03 (step 0.1 → prerequisito dello step 0.2). Due fonti open source, indipendenti fra loro.

## Fonte primaria — chinhodado/persona5_calculator (Apache-2.0)
https://github.com/chinhodado/persona5_calculator — file `data/*Royal.ts`, `src/FusionCalculator.ts`, `src/DataUtil.ts`.

| File | Contenuto |
|---|---|
| `PersonaDataRoyal.ts` | 232 Persona: `inherits`, `item`, `itemr` (con Allarme), `level`, `arcana`, `elems` (10: phys gun fire ice elec wind psy nuke bless curse — codici `wk/rs/nu/rp/ab/-`), `skills` {nome: livello, 0 = innata}, `stats` [St Ma En Ag Lu], `trait`, `area`/`floor` (Mementos), flag `special`, `rare`, `skillCard`, `dlc` |
| `SkillDataRoyal.ts` | 525 skill: `effect`, `element`, `cost`, `personas` {nome: livello}, `card`, `fuse` (itemizzazione), `unique` |
| `ItemDataRoyal.ts` | 223 oggetti da itemizzazione |
| `Data5Royal.ts` | `arcana2CombosRoyal` (coppie → arcana), `specialCombosRoyal` (24 ricette), `rarePersonaeRoyal` (9) + `rareCombosRoyal` (arcana → 9 modificatori), `inheritanceChartRoyal` (12 tipi × 12 elementi), `dlcPersonaRoyal` (13 set) |

Regole di fusione implementate in `FusionCalculator.ts` (verificate leggendo il codice):
- speciale (ricetta a ingredienti fissi) → rara (Demone del Tesoro + normale: scorrimento di rango ± nella tabella dell'arcana del normale, saltando speciali/rari) → normale;
- normale, arcana diversi: `livello = 1 + floor((L1+L2)/2)`, prima Persona dell'arcana risultante con livello ≥, escluse speciali/rare;
- normale, stesso arcana: Persona di livello più alto con livello ≤ `livello`, escluse speciali/rare e gli ingredienti;
- costo stimato per ingrediente: `27·L² + 126·L + 2147`;
- Giudizio × {Giustizia, Forza, Carro, Morte} = impossibile; le Persona rare non sono fondibili come risultato.

## Fonte di verifica — aqiu384/megaten-fusion-tool (Unlicense)
https://github.com/aqiu384/megaten-fusion-tool — P5 e P5R condividono `src/app/p5/`, i file Royal hanno prefisso `roy-`.
Copia locale dei file scaricati per l'analisi: scratchpad della sessione (non versionata); lo step 0.2 li riscarica in `data/seed/sorgenti/`.

| File | Contenuto / formato |
|---|---|
| `roy-demon-data.json` | 232 Persona `{inherits, item, itemr, lvl, race, resists (10 char `w - s n r d`), skills {nome: lvl, <2 = innata}, stats [St Ma En Ag Lu], steps, trait}`; 3 con `resmods` |
| `skill-data.json` + `roy-skill-data.json` | skill come `{a:[nome, elemento, bersaglio], b:[rank, costo, potenza, minHit, maxHit, acc, crit, mod], c:[effetto, formato, carta]}`; **il file Royal è un delta che sovrascrive per nome** (378 base + 163 nuove = 541 distinte); costo `1..1000` = % HP, `1001..2000` = SP−1000 |
| `roy-fusion-chart.json` | 24 arcana, tabella triangolare inferiore; `-` = impossibile |
| `roy-element-chart.json` | 9 Demoni del Tesoro × 24 arcana, modificatori ±1/±2 |
| `roy-special-recipes.json` | 24 ricette + 9 tesori (lista vuota) |
| `roy-demon-unlocks.json` | sblocchi: storia, Confidenti rango 10, 25 Persona DLC in 13 set |
| `roy-fusion-prereqs.json`, `roy-party-data.json`, `roy-enemy-data.json` (129 Ombre), `roy-accessories.json` (125) | extra utili per i moduli futuri (battaglia, inventario) |
| `comp-config.json` | ordine stats/resistenze, codici resistenze, matrice di ereditarietà 14 tipi × 12 elementi |

Logica (in `src/app/compendium/fusions/*.ts`): stesse regole della fonte primaria (arcana diversi: primo L ≥ ⌊(A+B)/2⌋+1, se coincide con un ingrediente → successivo; stesso arcana: ultimo L ≤ ⌊(A+B)/2⌋+1, se coincide → precedente; tesori: rango ± offset). Prezzo Persona nel compendio: `2000 + (Σ stats)²`.

## Confronto atteso (da eseguire nello step 0.2)
| Entità | chinhodado | aqiu384 | Azione |
|---|---|---|---|
| Persona | 232 | 232 | confronto campo per campo (livello, arcana, stats, affinità, skill+livello, tratto, eredità, item/itemr) |
| Tabella arcana | 24×24 | 24×24 | confronto completo, incluse coppie impossibili |
| Ricette speciali | 24 | 24 | confronto ingredienti |
| Demoni del Tesoro | 9 × 24 | 9 × 24 | confronto modificatori |
| Ereditarietà | 12 × 12 | 14 × 12 | confronto sui tipi comuni; i 2 tipi extra vanno capiti |
| Skill | 525 | 541 | riconciliazione per nome: le eccedenze attese sono skill dei compagni, Showtime, passive di sistema |

## Limiti comuni (nessuna delle due fonti li modella → vanno da altre fonti/guide)
- numero di skill ereditabili per fusione (in base al numero di ingredienti / Allarme);
- bonus di livello dal rango del Confidente dell'arcano risultante;
- Allarme delle fusioni (statistiche, slot extra, inceppamento), Potenziamento/Forca, Addestramento;
- risposte dei Confidenti, domande in classe, calendario (fonte: guida allgamestaff.it, inserimento dati ad hoc).

## Esito della verifica incrociata e arbitrato (2026-09-03)
Confronto eseguito da `scripts/seed/verificaIncrociata.ts` (report in `data/seed/verifica-incrociata.md`), discrepanze
arbitrate con una terza fonte: Megami Tensei Wiki (sezioni "Persona 5 Royal", wikitext via `api.php`; megatenwiki.com irraggiungibile).

Coincidono al 100%: livello e arcano delle 232 Persona, statistiche, tratti, tabella arcana 24×24 (276 coppie), 24 ricette
speciali, 9 Demoni del Tesoro con 216 modificatori.

Pattern emerso: **chinhodado conserva in più punti i valori di P5 base** (nomi `Absorb…`, `Conceal`, `Stealth`, livelli di
Genbu/Hua Po/Kin-Ki/Kodama/Pixie); **aqiu384 è più fedele a Royal** su nomi e livelli, ma ricostruisce male i nomi degli
oggetti da esecuzione (`Assault Dive Belt`, `Kill Rush Belt`…) e toglie a Power la debolezza all'Arma da fuoco (è l'Ombra a non averla).

Correzioni applicate (tutte in `scripts/seed/correzioniRoyal.json`, con URL): 18 rinomine di skill al nome Royal, 9 livelli
di apprendimento, 5 costi/elementi di skill. Mantenuta la fonte primaria dove confermata (Gatling Blows, Arsène, Power,
eredità di Clotho/Hecatoncheires/Mandrake, nomi degli oggetti) e dove non verificabile (eredità di Macabre e Maria,
Famine's Scream, Summon, Guiding Tendril, Great Aim) — elencate nel file per una futura verifica in gioco.

Restano "solo in aqiu384" le skill dei compagni (Showtime, `Pressing Stance`, `Cripple`…) e alcune passive da accessorio:
non appartengono alle Persona del compendio e non entrano nel seed (moduli futuri: battaglia/inventario).
