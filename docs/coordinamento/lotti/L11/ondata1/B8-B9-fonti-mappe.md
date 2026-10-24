# L11 · B8 «Marcatori e piante» e B9 «Legami e presentazione delle mappe» — scheda di implementazione

Analisi dati, 2026-10-24, **sola lettura**. Voci coperte: R11-02/5, /6, /7, /8 (B8) e R11-02/1, /2, /3, /4 (B9). Nessuna modifica a codice o dati del repository; nessun commit; nessun test scritto o eseguito.
Questo è l'unico file scritto nel repository.

Metodo: lettura di `CLAUDE.md`, `lotti/L11/{requisiti,modifiche,app,dati,piano}.md`, `preparazione-2026-10-23.md` (§2, §4.1, §5, §6, §7, §8); lettura del codice citato (le righe sono quelle del worktree il 24/10, HEAD `c68af36e`
più modifiche non committate di altre sessioni: per i file di B8/B9 ho controllato con `git diff` che non sono cambiati dalla lettura; **cercare comunque per simbolo, non solo per riga**);
misure con better-sqlite3 in sola lettura sulla copia `sim-142b` (gioco a `user_version` 146, partite a 30); una **prova a secco in memoria** delle due migrazioni proposte (§3.5, §4.7): la copia è stata letta con
`serialize()` da una connessione `readonly`, il buffer è stato riaperto **in RAM** (con il solo byte di modalità WAL portato a «rollback» nel buffer) e le migrazioni sono state eseguite lì; nessuna scrittura su disco.
Le migrazioni 147–171 presenti nel repository **non toccano** nessuna delle tabelle di questa scheda (grep sui file 164–171 e sulla lista del §0 di `preparazione`), quindi le misure su 146 valgono.

Legenda delle chiavi: **N** = numero della migrazione di B8, **N+1** quella di B9: «primo numero libero dopo L10». Al 24/10 sera il registro arriva alla 171 (file 164–171 di altre sessioni, alcuni non committati) e L8/L9/L10 non sono chiusi:
**non riservare i numeri ora**, prenderli al momento della scrittura.

---

## 1. Riepilogo: voce | stato | prova / modifica precisa

| Voce | Fonte | Stato oggi | Prova (file:riga letti) / modifica |
|---|---|---|---|
| R11-02/5 | `marcatore_mappa` (149 righe) | **NON soddisfatta**: la tabella è viva | Lettori: `dungeonService.ts:129-131` (`marcatori()`, usata a `:378,:409,:445,:455,:506,:1218` → `PuntoInteresseDto.marcatore`, `shared/types.ts:2203`), `contenutiGuidaService.ts:89-100` (`posizioneDaCollocare`). Scrittori: `dungeonService.ts:1414` (DELETE in `staccaPunto`), `:1585` (INSERT in `collegaSchedaAllaVoce`), `sincronizzaMappe.ts:143-145` (solo migrazione 027). **Nessun lettore nel frontend** (grep `src/`, esclusi i test: 0 per `.marcatore` e per `posizioneDaCollocare`). Equivalenza: **149/149** hanno una scheda `spillo` (`mappa_chiave` NULL, riferimento `punto`) con la **stessa posizione** (|Δ|<0,01). Modifica: §3.1 + migrazione §3.5. |
| R11-02/6 | `marcatore_luogo` (47) | **Parziale**: lettori runtime già assenti, restano tabella, DTO e DELETE | Nessun SELECT nel runtime: `luoghiService.ts:164` scrive la costante `marcatore: null`; `cittaService.ts:120` è un commento («non si legge più»); unico scrittore `luoghiScritture.ts:142` (DELETE alla rimozione del luogo) e `sincronizzaMappe.ts:170-172` (solo 027). Equivalenza **non totale**: 42 su 47 hanno un pin ma solo 24 alla stessa posizione (±0,5), 5 non hanno pin → si **archiviano tutte e 47**. Modifica: §3.2 + migrazione §3.5. |
| R11-02/7 | `pianta_area` (84) | **Parziale**: nessun lettore | Unico uso: `dungeonService.ts:748-753` (ripulisce `copre_aree_json` quando si elimina un'infiltrazione; `copre_aree_json` non nullo in 1 riga, `[]`). Nessun lettore FE né API (la rotta di scarico delle piante dei Palazzi è tolta dal 2026-09-18, `EditorMappaPage.tsx:432`). Contiene **provenienza** (URL, pagina, fonte, licenza, alternative) che solo 3 URL su 84 ritrovano in `immagine.origine_url` → **archivio prima del drop**. Modifica: §3.3 + migrazione §3.5. |
| R11-02/8 | `pianta_quartiere` (22) | **Da NON eseguire come «rimuovere»: fonte viva** | Lettori: `cittaService.ts:123` (DTO `QuartiereDettaglioDto.pianta`), `:149` (`scaricaPiantaQuartiere`), `routes/mappe.ts:43-46`, FE `QuartierePage.tsx:255-259` (crediti e link alla pagina), `:186-187` (scarico automatico), `EditorMappaPage.tsx:432-433`. L'URL **non è altrove**: `immagine.origine_url` è NULL per **22/22** immagini `citta-<q>`; fonte/pagina/licenza non hanno un'altra casa. Proposta: **tenuta con motivo** (§3.4, decisione D1). Nessuna migrazione. |
| R11-02/1 | `mappa.entita_tipo/entita_chiave` (139 non nulli) | **NON soddisfatta** | Lettori e scrittori vivi in più di dieci file (§4.1). Equivalenza provata: `area` 105/105 coperti da `infiltrazione_area` + `area_chiave`; `quartiere` 24/24 con chiave `citta-<q>`; `dungeon` 10/10 con chiave `dungeon-<d>` e `genitore_chiave` NULL. Modifica: helper di derivazione + porting + `DROP COLUMN` (§4.1, §4.7). |
| R11-02/2 | `mappa_entita` (135: area 131, luogo 3, quartiere 1) | **NON soddisfatta** | Letta in `mappeService.ts:615,706-714,731,1835`, `accessoMondoService.ts:143`, `fotografiaLuogoDaPin.ts:103,184-187`, `precondizioneRaccordoPin.ts:178,211`; scritta in `mappeService.ts:650-674,750-752,2222-2239,2409`, `luoghiScritture.ts:140,152`, `catalogoService.ts:549` e **dalla regola d'avvio** `collegaLuoghiAllePlanimetrie` (`pacchettoGioco.ts:52`). Equivalenza provata in **entrambe le direzioni** per le 131 righe `area` (0 non coperte) e per le 3 `luogo` via `luogo.area_chiave` (3/3). Modifica: §4.2. |
| R11-02/3 | `mappa_presentazione.gruppo_immagini_json` (219 non vuote) | **NON soddisfatta** | BE `mappeService.ts:124-128,786-837,847-863,877-942,1124-1126,2245-2249`, `areeService.ts:764-765`, `collezioniImmagini.ts:14,20`; FE `etichettaVersione.ts:16,18,29`, `gruppiPlanimetrie.ts:55`, `presentazioneMappa.ts:56,88,94`, `ImmaginiLuogo.tsx:21`, `MappaPage.tsx:69,516`, `AlberoLuoghi.tsx:26,38,95` (questo ultimo lo toglie B5). Equivalenza: etichetta **211/211**, nome 206/211, ordine 202/211 (i 9+5 diversi sono modifiche dell'utente **successive**, dove vale il dato nuovo), **8 fogli senza Area (Memento) non coperti** → si portano su `mappa.versione_*` e si archiviano (§4.3). |
| R11-02/4 | `guida_mappa` (92: `nome`, `note`, `metadata_json`) | **NON soddisfatta**, ma **B** | Unico lettore: `contenutiGuidaService.ts:67-71` (`COALESCE(g.note,'')`, sempre `''`); il nome mostrato è `dungeon_area.nome`. `note` non vuote 0, `metadata_json` non vuoti 0, `nome` diverso da `dungeon_area.nome` in 4 righe (archivio). `guida_alias` (92) **resta**. Modifica: §4.4. |

**Voci già soddisfatte per intero: nessuna.** Parziali (lettori già assenti): R11-02/6 e /7. R11-02/8 si chiude come «tenuta con motivo» solo con il sì dell'utente (D1).

---

## 2. Misure sulla copia `sim-142b` (gioco 146, partite 30)

| Fonte | Righe | Di lavoro dell'utente (`origine='utente'`) | Citata nel cestino (8 righe) | Prova di equivalenza (query sotto) |
|---|---:|---|---|---|
| `marcatore_mappa` | 149 | **0** (149 `seed`); tutte di Palazzi (149/149); 148 su voci senza pin | 0 passi, 0 conteggi | E1: 149/149 con scheda `spillo` stessa posizione |
| `marcatore_luogo` | 47 | **0** (47 `seed`) | 0 | E2: 42 con pin, 24 stessa posizione, 5 senza pin |
| `pianta_area` | 84 (83 `area`, 1 `dungeon`) | n/a (nessuna colonna `origine`) | 0 | E3: 3/84 URL in `immagine.origine_url` |
| `pianta_quartiere` | 22 | n/a | 0 | E4: `origine_url` NULL 22/22; 2 quartieri senza riga (Ikebukuro e Nakano, con il motivo in `dati_guida.mappe-citta-assenti`, letto da `cittaService.ts:127`) |
| `mappa.entita_*` | 139 non nulli: `area` 105, `quartiere` 24, `dungeon` 10 | sulle mappe `utente`: area 41, quartiere 19, dungeon 9 (= 69); `seed`: 70 | 2 passi con le chiavi presenti, **entrambe NULL**; 0 non nulle | E5, E6, E7 |
| `mappa_entita` | 135: area 131, luogo 3, quartiere 1 | `area` 66 `utente` (dichiarata `editor`) + 65 `seed`; `luogo` 3 `regola`; `quartiere` 1 `seed` | 0 | E8, E9, E10 |
| `gruppo_immagini_json` | 219: per tipo di mappa `area` 211 (di cui **8 fogli dei Memento senza `area_chiave`**) e `luogo` 8 | mappe `utente` 42, `seed` 177 | **1 valore non nullo** (voce del cestino che rimette una planimetria del Sottopasso) | E11, E12 |
| `guida_mappa` | 92 | n/a | 0 | E13 |
| `mappa_presentazione` (resta) | 226; `contesti_json` non vuoti 47 | — | 1 passo | — |

Query di prova (tutte eseguite sulla copia; risultato fra parentesi). Sono le stesse che la migrazione usa come **guardie** (§3.5, §4.7).

```sql
-- E1  marcatori di voce senza scheda con la stessa posizione                                  (0)
SELECT m.* FROM marcatore_mappa m WHERE NOT EXISTS (SELECT 1 FROM spillo s
  WHERE s.mappa_chiave IS NULL AND s.riferimento_tipo='punto' AND s.riferimento_chiave=m.punto_chiave
    AND ABS(s.x-m.x)<0.01 AND ABS(s.y-m.y)<0.01);
-- E5  mappe con entita 'area' il cui legame infiltrazione↔area non esiste                       (0 su 105)
SELECT m.chiave FROM mappa m WHERE m.entita_tipo='area' AND NOT EXISTS (SELECT 1 FROM infiltrazione_area ia
  WHERE ia.infiltrazione_chiave=m.entita_chiave AND ia.area_chiave=m.area_chiave);
-- E6  radici irregolari: quartiere ≠ 'citta-'||chiave, dungeon ≠ 'dungeon-'||chiave           (0 su 24 e 0 su 10)
SELECT chiave FROM mappa WHERE entita_tipo='quartiere' AND (tipo<>'quartiere' OR chiave<>'citta-'||entita_chiave);
SELECT chiave FROM mappa WHERE entita_tipo='dungeon' AND (tipo NOT IN ('palazzo','dedalo') OR chiave<>'dungeon-'||entita_chiave);
-- E7  quartieri e dungeon senza radice col nome previsto                                       (0 e 0)
SELECT q.chiave FROM quartiere q WHERE NOT EXISTS (SELECT 1 FROM mappa m WHERE m.chiave='citta-'||q.chiave AND m.tipo='quartiere');
SELECT d.chiave FROM dungeon d WHERE NOT EXISTS (SELECT 1 FROM mappa m WHERE m.chiave='dungeon-'||d.chiave AND m.tipo IN ('palazzo','dedalo') AND m.genitore_chiave IS NULL);
-- E8  righe 'area' di mappa_entita non coperte da infiltrazione_area                           (0 su 131; e 0 legami dell'Area senza riga vecchia)
SELECT e.* FROM mappa_entita e WHERE e.entita_tipo='area' AND NOT EXISTS (SELECT 1 FROM mappa m JOIN infiltrazione_area ia
  ON ia.area_chiave=m.area_chiave AND ia.infiltrazione_chiave=e.entita_chiave WHERE m.chiave=e.mappa_chiave);
-- E9  righe 'luogo' non coperte da luogo.area_chiave = mappa.area_chiave                        (0 su 3)
SELECT e.* FROM mappa_entita e WHERE e.entita_tipo='luogo' AND NOT EXISTS (SELECT 1 FROM luogo l JOIN mappa m ON m.chiave=e.mappa_chiave
  WHERE l.chiave=e.entita_chiave AND l.area_chiave IS NOT NULL AND l.area_chiave=m.area_chiave);
-- E10 riga 'quartiere'                                                                          (0 su 1)
SELECT e.* FROM mappa_entita e WHERE e.entita_tipo='quartiere' AND NOT EXISTS (SELECT 1 FROM mappa m WHERE m.chiave=e.mappa_chiave AND m.chiave='citta-'||e.entita_chiave);
-- E11 gruppi non riproducibili dall'Area/dalla versione                                          (22 = 8 Memento + 9 ordine + 5 nome)
SELECT p.mappa_chiave, p.gruppo_immagini_json FROM mappa_presentazione p JOIN mappa m ON m.chiave=p.mappa_chiave LEFT JOIN area a ON a.chiave=m.area_chiave
 WHERE p.gruppo_immagini_json IS NOT NULL AND (m.area_chiave IS NULL
   OR COALESCE(json_extract(p.gruppo_immagini_json,'$.etichetta'),'')<>COALESCE(m.versione_etichetta,'')
   OR json_extract(p.gruppo_immagini_json,'$.ordine') IS NOT m.versione_ordine OR json_extract(p.gruppo_immagini_json,'$.nome') IS NOT a.nome);
-- E13 schede guida_mappa che dicono altro da dungeon_area                                        (4)
SELECT g.* FROM guida_mappa g LEFT JOIN dungeon_area a ON a.chiave=g.area_chiave
 WHERE a.chiave IS NULL OR g.nome<>a.nome OR g.note<>'' OR g.metadata_json NOT IN ('','{}');
```

Fatti utili ricavati dalle misure:

- **Gruppo ↔ Area è 1:1**: 78 gruppi, 78 Aree, nessun gruppo su due Aree e nessuna Area con due gruppi (E12). 75 id di gruppo su 78 sono la chiave di una mappa della stessa Area, 3 sono `utente:<chiave mappa>` (serve alla compatibilità di `gruppoId`, §4.3).
- **«Ha un gruppo» ⇔ `versione_etichetta` non nulla**, per le planimetrie con Area: 211 con gruppo hanno tutte l'etichetta; le 62 senza gruppo hanno `versione_etichetta` NULL (e `versione_ordine` valorizzato). Quindi dopo aver portato i Memento su `versione_etichetta`, la regola «non entra nelle collezioni se ha una stanza» (`collezioniImmagini.ts:20`) si ricostruisce **identica** con `versione_etichetta IS NOT NULL` (219 = 211 + 8).
- **Convenzione delle radici biiettiva**: ogni `dungeon-*` è un `palazzo`/`dedalo` radice (10/10, `genitore_chiave` NULL), ogni `citta-*` è un `quartiere` (24/24). `alberoMappe.ts:16-24` già dichiara che `radiceDelPalazzo(d) = 'dungeon-'+d` è «la regola con cui il Palazzo si crea e si cerca dappertutto».
- **Il pacchetto iniziale in git (`pacchetto/gioco.db`) è alla versione 93**, prima delle migrazioni 109/110: contiene `marcatore_mappa` 187, `marcatore_luogo` 47, `pianta_area` 107, `mappa_entita` 91, `guida_mappa` 116, `gruppo_immagini_json` non vuoti 227, `mappa.entita_tipo` non nullo 115 (area 81, dungeon 10, quartiere 24), e **non ha** `area`/`infiltrazione_area`. Al primo avvio le migrazioni 94→N girano su questi dati: le guardie delle due migrazioni devono quindi essere **tolleranti** (archiviano ciò che non è coperto invece di fallire), vedi §3.5/§4.7 e il limite L3.

---

## 3. Scheda B8 — marcatori e piante

### 3.1 R11-02/5 `marcatore_mappa`

**Lettori e scrittori vivi (grep su `server/`, `shared/`, `src/`, esclusi test e migrazioni numerate) e porting**

| Dove | Oggi | Porting |
|---|---|---|
| `server/services/dungeonService.ts:129-132` | `marcatori()` legge `SELECT punto_chiave, x, y FROM marcatore_mappa` | **eliminare** la funzione |
| `dungeonService.ts:68,73` | `puntoDto(r, stato, marcatore, pin, …)` mette `marcatore` nel DTO | togliere il parametro `marcatore` (3º) e il campo dall'oggetto `base` |
| `dungeonService.ts:378,409,445,455,506,1218` | `marc = marcatori()`, `marc.get(...)`, `marcatori().get(...)` | togliere `const marc` (378, 445) e il 3º argomento dalle 4 chiamate a `puntoDto` (409, 455, 506, 1218) |
| `dungeonService.ts:1414` (`staccaPunto`) | `DELETE FROM marcatore_mappa WHERE punto_chiave = ?` | togliere la riga; aggiornare il commento a `:1402-1404` («il marcatore») |
| `dungeonService.ts:1585` (`collegaSchedaAllaVoce`) | nella transazione: `UPDATE spillo …` + `INSERT INTO marcatore_mappa … ON CONFLICT DO NOTHING` | **tenere solo l'`UPDATE spillo`** (`:1584`): la posizione resta sulla scheda assorbita (prova E1: è già la stessa); aggiornare il commento di `:1572-1575` («la posizione della scheda diventa la posizione da collocare») |
| `server/services/mappe/contenutiGuidaService.ts:89-100` (`vociDelPalazzo`) | `LEFT JOIN marcatore_mappa mm`, colonne `mm.x, mm.y`, campo `posizioneDaCollocare` | togliere il JOIN, le due colonne e `posizioneDaCollocare` (e `con_pin` se non serve più: oggi serve solo a quel campo); aggiornare il commento `:86-90` |
| `server/services/mappe/sincronizzaMappe.ts:143-145` | legge `marcatore_mappa` per creare i pin (solo 027) | **non toccare in B8**: è protetto da `tabelle.has('marcatore_mappa')`; lo congela B9 (§4.5) |
| `server/services/cestinoService.ts:109` (`ETICHETTE`) | `marcatore_mappa: ['segnaposto di una voce', …]` | **non togliere** (§5) |
| `shared/types.ts:2203` | `PuntoInteresseDto.marcatore` | togliere il campo e il commento |
| `shared/organizzazioneMappe.ts:26-27` | `PuntoGuidaMappaDto.posizioneDaCollocare` | togliere il campo e il commento |
| FE | nessun consumo (`src/`: 0 occorrenze non di test di `.marcatore` e `posizioneDaCollocare`) | nessuna modifica |
| OpenAPI `server/openapi/descrizioni/compendio.ts:374,519,525,531` | testi che citano «marcatore» (voci della guida, `staccaPunto`) | togliere la parola dove descrive il segnaposto tolto |

**Perché non si perde niente** (decisione D2): la posizione di un marcatore è **identica** a quella di una scheda `spillo` senza mappa che cita la voce (E1: 149/149); quelle schede restano nel DB. La «posizione da collocare» non ha lettore FE.
Se un blocco successivo togliesse le schede senza mappa (150 con voce + 4 senza, `modifiche.md` §1.1 punto 2, non coperte da una voce atomica), la posizione sparirebbe con loro: l'archivio di B8 conserva comunque i marcatori **non** ripetuti da una scheda (0 su questa copia).

### 3.2 R11-02/6 `marcatore_luogo`

| Dove | Oggi | Porting |
|---|---|---|
| `server/services/luoghiScritture.ts:142` | `DELETE FROM marcatore_luogo WHERE luogo_chiave = ?` (rimozione di un luogo) | togliere la riga |
| `server/services/luoghiService.ts:164` | `marcatore: null,` nel DTO | togliere la riga |
| `server/services/cittaService.ts:120` | commento «`marcatore_luogo` non si legge più» | riscrivere il commento (la tabella non esiste più) |
| `server/services/mappe/sincronizzaMappe.ts:170-172` | crea i pin dai marcatori (solo 027) | congela B9 |
| `server/services/cestinoService.ts:132` (`ETICHETTE`, era `:130`) | `marcatore_luogo: [...]` | non togliere (§5) |
| `shared/types.ts:1775` | `LuogoDto.marcatore` | togliere il campo e il commento |
| OpenAPI `compendio.ts:286` | «…ciascuno con Confidenti, attività, negozi, marcatore e condizioni» | togliere «marcatore» |
| FE | nessun consumo non di test | nessuna modifica |

Archivio: **tutte le 47 righe** (E2: non tutte le posizioni sono ripetute dai pin).

### 3.3 R11-02/7 `pianta_area`

| Dove | Oggi | Porting |
|---|---|---|
| `server/services/dungeonService.ts:748-753` (`ripulisciRiferimentiTestuali`) | `if (tabellaGioco('pianta_area')) { … UPDATE pianta_area SET copre_aree_json … }` | togliere il blocco; riscrivere il commento `:739-746` («le piante delle altre aree che dicevano di coprirla» non c'è più; restano le Ombre della Battaglia e le «mappe assenti»); `tabellaGioco` resta importata (serve a `dati_guida` subito sotto) |
| `server/services/cestinoService.ts:114` | etichetta `pianta_area` | non togliere (§5) |
| FE, DTO, OpenAPI | nessun riferimento | — |

Archivio: tutte le 84 righe (URL, pagina, fonte, licenza, copertura, `copre_aree_json`, `note`, `alternative_json`), perché è la **provenienza** delle piante e non ha un'altra casa (decisione D7).

### 3.4 R11-02/8 `pianta_quartiere`

**Non si elimina** (D1). Prova di vita: `cittaService.ts:123,149`, `QuartierePage.tsx:186-187,255-259`, `EditorMappaPage.tsx:432-433`; prova di unicità: `immagine.origine_url` NULL su 22/22 (E4).
Cosa fare per chiudere la voce: nessun codice; nell'inventario di B1 la riga «`pianta_quartiere`: **tieni**, motivo: unica fonte dell'URL, della pagina, del credito e della licenza dell'illustrazione del quartiere; lettori `cittaService.ts:123,149`, `QuartierePage.tsx`». Facoltativo (B19): rinominare `PiantaAreaDto` (`shared/types.ts:2459`, oggi usato solo da `QuartiereDettaglioDto.pianta`, con `copertura` sempre `'quartiere'` e `alternative` sempre `[]`) in `PiantaQuartiereDto` e togliere i due campi costanti.
La scelta alternativa (portare l'URL su `immagine.origine_url`) **perde** pagina, fonte e licenza (oggi mostrate a schermo): non la consiglio.

### 3.5 Migrazione B8 — testo esatto

File: `server/db/migrations/<N>_marcatori_e_piante_archiviati.ts`; registrazione: un `import` e una voce in `server/db/migrations/index.ts` (file condiviso, §9). Modello: `160_cestino_catalogo.ts` (nessun import da `server/services/`, impronta prima/dopo, errore prima di ogni modifica).
**Copia di sicurezza**: la fa già `runBootBackup()` (`server/index.ts:52`, prima di `runMigrations` a `:55`); per l'«Importa» la fa `copiaDiSicurezza()` in `sostituisciDatiDiGioco` (`pacchettoGiocoService.ts`, prima di `closeDb()`). La migrazione non ne crea un'altra. Il runner la esegue **in una transazione** con `foreign_keys = OFF` e controlla `foreign_key_check` prima/dopo (`migrationRunner.ts:46-68`).

```ts
import { createHash } from 'node:crypto';
import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

/**
 * L11 · B8 (R11-02/5, /6, /7): i segnaposto delle voci (`marcatore_mappa`), quelli dei luoghi (`marcatore_luogo`) e le piante delle
 * infiltrazioni (`pianta_area`) escono dal modello. Nessuno li legge più (il frontend non li ha mai letti): la posizione di una voce è
 * quella della scheda `spillo` che l'ha assorbita, quella di un luogo è il suo pin, la pianta di un'infiltrazione non si scarica più.
 * Prima del DROP si archivia in `dati_guida` ciò che nessun'altra riga ripete: i segnaposto di voce senza una scheda con la stessa
 * posizione, TUTTI i segnaposto dei luoghi (i pin possono essere stati spostati) e TUTTE le piante (sono la provenienza: URL, fonte,
 * licenza). `pianta_quartiere` NON si tocca: ha lettori vivi. Nessun import da `server/services/`.
 */
const ARCHIVIO = 'archivio-marcatori-e-piante-l11';
const TABELLE = ['marcatore_mappa', 'marcatore_luogo', 'pianta_area'] as const;
/** Le tabelle che questa migrazione non deve cambiare: ogni riga, nell'ordine della chiave, prima e dopo. */
const SENTINELLE: Record<string, string> = {
  mappa: 'SELECT * FROM main.mappa ORDER BY chiave',
  spillo: 'SELECT * FROM main.spillo ORDER BY id',
  spillo_voce: 'SELECT * FROM main.spillo_voce ORDER BY spillo_id, voce_chiave',
  punto_interesse: 'SELECT * FROM main.punto_interesse ORDER BY chiave',
  dungeon_area: 'SELECT * FROM main.dungeon_area ORDER BY chiave',
  luogo: 'SELECT * FROM main.luogo ORDER BY chiave',
  pianta_quartiere: 'SELECT * FROM main.pianta_quartiere ORDER BY quartiere_chiave',
};
const errore = (motivo: string): never => { throw new Error(`B8: ${motivo}; nessuna modifica applicata.`); };
const esiste = (db: AppDatabase, tabella: string): boolean => !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(tabella);
const righe = (db: AppDatabase, sql: string): Array<Record<string, unknown>> => db.prepare(sql).all() as Array<Record<string, unknown>>;
function firma(db: AppDatabase, sql: string): string {
  const h = createHash('sha256'); let n = 0;
  for (const r of db.prepare(sql).iterate()) { h.update(JSON.stringify(r) + '\n'); n++; }
  return `${n}:${h.digest('hex')}`;
}

export const migrationN: Migration = {
  id: 0 /* N: il primo numero libero dopo L10 */, name: 'marcatori_e_piante_archiviati',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    const presenti = TABELLE.filter((t) => esiste(db, t));
    if (presenti.length === 0) return;                                  // già applicata
    if (!esiste(db, 'dati_guida')) errore('manca la tabella dati_guida');
    const sentinelle = Object.keys(SENTINELLE).filter((t) => esiste(db, t));
    const prima = new Map(sentinelle.map((t) => [t, firma(db, SENTINELLE[t]!)]));
    const conti: Record<string, number> = {};
    for (const t of presenti) conti[t] = (db.prepare(`SELECT COUNT(*) AS n FROM main.${t}`).get() as { n: number }).n;

    const archivio: Record<string, unknown> = { versione: 1, migrazione: 'L11-B8', conteggi: conti,
      motivo: 'Fonti senza lettori tolte dal modello; qui resta ciò che nessun\'altra riga ripete (vedi docs/coordinamento/lotti/L11/ondata1/B8-B9-fonti-mappe.md).' };
    if (presenti.includes('marcatore_mappa')) {
      archivio.marcatore_mappa_senza_scheda = righe(db, `SELECT m.* FROM main.marcatore_mappa m WHERE NOT EXISTS (SELECT 1 FROM main.spillo s
        WHERE s.mappa_chiave IS NULL AND s.riferimento_tipo = 'punto' AND s.riferimento_chiave = m.punto_chiave
          AND ABS(s.x - m.x) < 0.01 AND ABS(s.y - m.y) < 0.01) ORDER BY m.punto_chiave`);
    }
    if (presenti.includes('marcatore_luogo')) archivio.marcatore_luogo = righe(db, 'SELECT * FROM main.marcatore_luogo ORDER BY luogo_chiave');
    if (presenti.includes('pianta_area')) archivio.pianta_area = righe(db, 'SELECT * FROM main.pianta_area ORDER BY area_chiave');
    db.prepare('INSERT OR REPLACE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run(ARCHIVIO, JSON.stringify(archivio));

    for (const t of presenti) db.exec(`DROP TABLE main.${t}`);

    // verifiche dopo: archivio completo, tabelle sparite, nient'altro cambiato
    const scritto = JSON.parse(String(db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(ARCHIVIO))) as Record<string, unknown>;
    if (presenti.includes('marcatore_luogo') && (scritto.marcatore_luogo as unknown[]).length !== conti.marcatore_luogo) errore('archivio dei segnaposto dei luoghi incompleto');
    if (presenti.includes('pianta_area') && (scritto.pianta_area as unknown[]).length !== conti.pianta_area) errore('archivio delle piante incompleto');
    for (const t of TABELLE) if (esiste(db, t)) errore(`la tabella ${t} esiste ancora`);
    for (const t of sentinelle) if (firma(db, SENTINELLE[t]!) !== prima.get(t)) errore(`la tabella ${t} è cambiata`);
    logger.info({ migrazione: 'L11-B8', conti, marcatoriDiVoceSenzaScheda: (scritto.marcatore_mappa_senza_scheda as unknown[] | undefined)?.length ?? 0 }, 'segnaposto e piante tolti dal modello');
  },
};
```

Risultato della prova a secco (copia `sim-142b`, in RAM): archivio `marcatore_mappa_senza_scheda` **0**, `marcatore_luogo` **47**, `pianta_area` **84**, blocco da **63 206 byte**; impronte di `mappa`, `spillo`, `spillo_voce`, `punto_interesse`, `infiltrazione_area`, `area`, `luogo`, `guida_alias`, `pianta_quartiere`, `mappa_percorso`, `mappa_alias`, `quartiere`, `cestino` **identiche prima/dopo**.

### 3.6 Verifiche prima/dopo B8 (senza test)

1. **Prima**: conteggi `marcatore_mappa` 149 / `marcatore_luogo` 47 / `pianta_area` 84 / `pianta_quartiere` 22; `dati_guida` 30 blocchi; impronte della tabella del §7 (valori di riferimento sulla copia al §7).
2. **Dopo** (copia migrata): le tre tabelle non esistono; `pianta_quartiere` 22 invariata; `dati_guida` 31 blocchi, il nuovo con `conteggi {marcatore_mappa:149, marcatore_luogo:47, pianta_area:84}`, `marcatore_luogo` 47 voci, `pianta_area` 84 voci, `marcatore_mappa_senza_scheda` 0; impronte delle sentinelle identiche; `PRAGMA foreign_key_check` vuoto; `PRAGMA integrity_check` ok.
3. **Partite**: B8 non scrive in `partite.db` (nessuna tabella utente cita queste fonti: `sqlite_master` utente senza riferimenti, verificato) → impronta di `spillo_partita`, `punto_partita` e `user_version` utente invariate.
4. `npm run typecheck && npm run lint && npm run build` verdi (i riferimenti residui a `marcatore` nei DTO fanno fallire il typecheck: è la prova che non resta un lettore).

---

## 4. Scheda B9 — legami e presentazione delle mappe

### 4.1 R11-02/1 `mappa.entita_tipo` / `entita_chiave`

**Sostituzione**: l'entità di una radice si **deriva** dalla chiave e dal tipo, convenzione provata biiettiva (E6, E7) e già dichiarata in `alberoMappe.ts`:

```ts
// server/services/mappe/alberoMappe.ts (nuovo export; il file importa solo `prepared` dal db, nessun ciclo con casaMappa.ts)
export const radiceDelQuartiere = (quartiere: string): string => `citta-${quartiere}`;
/** L'entità della guida di cui una mappa è la radice: il quartiere (`citta-<q>`, tipo quartiere) o il Palazzo/dedalo (`dungeon-<d>`, tipo palazzo|dedalo); null per le altre.
 *  Sostituisce le colonne `mappa.entita_*`. Non esclude i Memento: chi deve farlo (la casa) lo fa da sé. */
export function entitaDellaRadice(r: { chiave: string; tipo: string }): { tipo: 'quartiere' | 'dungeon'; chiave: string } | null {
  if (r.tipo === 'quartiere' && r.chiave.startsWith('citta-')) return { tipo: 'quartiere', chiave: r.chiave.slice('citta-'.length) };
  if ((r.tipo === 'palazzo' || r.tipo === 'dedalo') && r.chiave.startsWith('dungeon-')) return { tipo: 'dungeon', chiave: r.chiave.slice('dungeon-'.length) };
  return null;
}
```
Il tipo `area` (105) non ha sostituto da derivare: è già `mappa.area_chiave` + `infiltrazione_area` (E5).

**Lettori e scrittori vivi e porting** (grep reale su `server/`, `shared/`, `src/`, esclusi test e migrazioni numerate)

| # | Dove | Oggi | Dopo |
|---|---|---|---|
| 1 | `casaMappa.ts:74` (`RigaPerCasa`), `:79`, `:81` | `entita_tipo/entita_chiave` per la casa di quartiere e Palazzo | `RigaPerCasa = { chiave; tipo; area_chiave? }`; riga 79: `const q = entitaDellaRadice(r); if (q?.tipo === 'quartiere' && q.chiave !== 'mementos') return \`/guida/citta/${encodeURIComponent(q.chiave)}\``; riga 81: `r.tipo === 'palazzo'` + `q?.tipo === 'dungeon' && q.chiave !== 'mementos'` → `casaDelPalazzo(q.chiave)`. Il file resta «senza dipendenze dagli altri servizi» (importa solo `alberoMappe`) |
| 2 | `contenutiGuidaService.ts:29` (`destinazioneGuida`) | `SELECT chiave FROM mappa WHERE entita_tipo='dungeon' AND entita_chiave=?`, `radici.length !== 1` | `const radice = radiceDelPalazzo(r.dungeon_chiave); if (!prepared("SELECT 1 FROM mappa WHERE chiave=? AND genitore_chiave IS NULL AND tipo IN ('palazzo','dedalo')").get(radice)) return null;` poi `chiaveMappa(radice)` |
| 3 | `contenutiGuidaService.ts:64-71` (`contenutiMappa`) | legge `entita_tipo, entita_chiave` e li passa alla query, con `LEFT JOIN guida_mappa` | `SELECT chiave, tipo FROM mappa WHERE chiave=?`; `const dungeon = entitaDellaRadice(m)?.tipo === 'dungeon' ? entitaDellaRadice(m)!.chiave : null`; query: `WHERE (? IS NOT NULL AND a.dungeon_chiave = ?) OR EXISTS(… infiltrazione_area …)` con `(dungeon, dungeon, mappa)`; senza `guida_mappa` (§4.4) |
| 4 | `luoghiScritture.ts:32-36` (`quartiereDellaMappa`) | `SELECT … m.entita_tipo, m.entita_chiave …`; `m.tipo==='quartiere' && m.entita_tipo==='quartiere'` | togliere le due colonne e il tipo a `:33`; `const r = entitaDellaRadice(m); if (r?.tipo === 'quartiere') return { quartiere: r.chiave, area: null };` (stessa semantica, Memento compresi come oggi) |
| 5 | `luoghiScritture.ts:140-141` e `:152` | alla rimozione di un luogo/negozio: `DELETE FROM mappa_entita…`, `UPDATE mappa SET entita_tipo = NULL…` | **togliere le tre righe** |
| 6 | `catalogoService.ts:549-550` (`staccaDalleMappe`) | stesse due operazioni per `luogo`/`negozio` | togliere il blocco `if (tipo === 'luogo' \|\| tipo === 'negozio') {…}` (resta l'`UPDATE spillo` sopra) |
| 7 | `luoghiService.ts:79-85` (`pinDeiLuoghi`) | seleziona `m.entita_tipo, m.entita_chiave` e li passa a `casaDellaMappa` | togliere le due colonne e i due campi |
| 8 | `areeService.ts:272,279` | `meta.tipo==='quartiere' && meta.entita_tipo==='quartiere' ? meta.entita_chiave` | `entitaDellaRadice(meta)?.tipo === 'quartiere' ? entitaDellaRadice(meta)!.chiave : null`; togliere i due campi dal tipo di `:272` |
| 9 | `areeService.ts:679-680` (`mappeDaCollocare`) | `COALESCE(g.entita_chiave,'') <> 'mementos' AND (g.tipo IN ('citta','quartiere') OR (g.tipo='palazzo' AND g.entita_tipo='dungeon'))` | `g.chiave NOT IN ('citta-mementos','dungeon-mementos') AND g.tipo IN ('citta','quartiere','palazzo')` (tutti i `palazzo` sono radici `dungeon`: 9/9) |
| 10 | `accessoMondoService.ts:142-143` (in `cerca()`) | cerca le mappe che hanno quell'entità come propria e le righe di `mappa_entita` | vedi §4.2 (quartiere, dungeon e luogo) |
| 11 | `fotografiaLuogoDaPin.ts:96,103,184,186-187,19,201` | usa `entita_tipo`/`mappa_entita` per le collocazioni e la pertinenza del cestino | vedi §4.2 |
| 12 | `precondizioneRaccordoPin.ts:117,178-181,211-213` | idem, per il raccordo del Venditore ambulante | vedi §4.2 |
| 13 | `censimentoLuoghiCondizioniService.ts:17,91` e `shared/censimentoLuoghiCondizioni.ts:68` | colonne `entita_*` fra quelle lette; fallback `r.entita_tipo === 'quartiere' ? r.entita_chiave : null` | togliere le due colonne dall'elenco (`:17`) e dal tipo; `:91` → `?? (entitaDellaRadice(r)?.tipo === 'quartiere' ? entitaDellaRadice(r)!.chiave : null)` |
| 14 | `mappeService.ts:57` (`RigaMappa`) | include `entita_tipo/entita_chiave` | togliere i due campi |
| 15 | `mappeService.ts:152-170` (`riassunto`) | `entita: r.entita_tipo && r.entita_chiave ? {…} : null` | `radiceDi: entitaDellaRadice(r)` (DTO sotto) e `versione` (§4.3) |
| 16 | `mappeService.ts:611-618` (`mappaPerEntita`) | usa `entita_*` e `mappa_entita` | **è la rotta orfana `GET /api/mappe/entita/:tipo/:chiave`** (B7, R11-03/3): se B7 non è fatto, B9 la rimuove con la sua descrizione OpenAPI (`openapi/descrizioni/mappe.ts:62`); non va riportata |
| 17 | `mappeService.ts:644-684` (`sincronizzaLegameEntita`), `:703-710` (`allineaColonneArea`), `:712-715` (`areeDellaMappa`), `:725-733` (`areePerPacchetto`, ramo senza `conLegami()`) | scrivono `mappa_entita`/colonne `entita_*` | **eliminare** `sincronizzaLegameEntita`, `allineaColonneArea`, `areeDellaMappa` e il ramo morto di `areePerPacchetto` (`conLegami()` è sempre vero dopo la 110) |
| 18 | `mappeService.ts:741-760` (`impostaAreeMappa`) | scrive `mappa_entita` area (fallback per mappe senza Area) | **eliminare** (decisione D6: la rotta risponde 409 `mappa-senza-area`, §4.3) |
| 19 | `mappeService.ts:980-1025` (`creaMappa`), riga `:1011` e `:1014` | scrive `entita_tipo/entita_chiave` nell'INSERT e chiama `sincronizzaLegameEntita` | togliere le due colonne e i due valori dall'INSERT; togliere la chiamata a `:1014`; l'`entita` ammessa in ingresso è solo `area` (D6) e si limita al controllo `verificaAreePalazzo` di `:1003` |
| 20 | `mappeService.ts:1070-1150` (`aggiornaMappa`), `:1105-1132` | UPDATE con `entita_*`, `colonneArea`, `areeDellaMappa`, `sincronizzaLegameEntita` | togliere le due colonne dall'UPDATE (`:1128`), `colonneArea`, il ramo `!legamiNuovi` (`:1105-1113`: usa `areeDellaMappa`) e la chiamata di `:1132`; **resta** il ramo L3 `entita.tipo === 'area'` → `impostaLegamiInfiltrazione` (`:1133-1137`) |
| 21 | `mappeService.ts:1825-1850` (`esportaMappe`) | esporta `entita` e `entitaLegami` | non esportare più `entita` e `entitaLegami` (`:1832-1837,1848,1852`); `areePerPacchetto` resta |
| 22 | `mappeService.ts:2178-2249` (`importaMappe`) | scrive `mappa.entita_*` e `mappa_entita`, riempie `areeDaLegare` | **vedi §4.10**: l'importazione deve **accettare e ignorare** `entita`, `entitaLegami`, `gruppoImmagini` dei pacchetti di prima, e `areeDaLegare` va riempita **sempre** |
| 23 | `mappeService.ts:2409-2411` | `INSERT OR REPLACE INTO mappa_entita … allineaColonneArea` (ramo `!legamiNuovi`) | togliere il ramo (con `legamiNuovi` sempre vero il `continue` a `:2407` lo salta già) |
| 24 | `pacchetto/pacchettoGioco.ts:28,52-53` | importa `riallineaSpilliLuoghi` da `sincronizzaMappe`; `regoleAllAvvio` esegue `collegaLuoghiAllePlanimetrie` | vedi §4.5-4.6 |
| 25 | FE `MappaPage.tsx:366,528,530` | `mappa.entita` → `schedaAccessoMondo(tipo, chiave)`, `titoloSchedaAccessoMondo`, `dungeon={mappa.entita?.tipo==='dungeon' ? mappa.entita.chiave : undefined}` | `mappa.radiceDi` (stessa forma `{ tipo: 'quartiere'\|'dungeon', chiave }`): sostituzione meccanica delle 3 righe |
| 26 | FE `EditorMappaPage.tsx:279-280,433` | `dati.entita?.tipo !== 'quartiere'` / `mappa.entita?.tipo === 'quartiere'` | `dati.radiceDi?.tipo` / `mappa.radiceDi?.tipo` |
| 27 | FE `src/services/api/mappe.ts:12` (`DatiMappaApi.entita`) e `server/schemas/mappe.ts:15,43` | l'API accetta `entita` generico | restringere a `{ tipo: 'area'; chiave }` (D6); l'editor FE non la imposta mai (grep) |
| 28 | OpenAPI `descrizioni/mappe.ts:36,94` | «entità legata»; «le colonne `entita_*` e `mappa_entita` di tipo area non si scrivono più» | riscrivere i due testi (nessun «entità legata»; `entita` ammessa solo `area`) |

Nota di rischio sul punto 11-12: `fotografiaLuogoDaPin` e `precondizioneRaccordoPin` producono **impronte (token CAS) in memoria**, mai persistite: cambiare i campi della fotografia fa fallire con 409 una sola richiesta in volo a cavallo del riavvio. `precondizioneRaccordoPin.ts` serve la rotta `GET /api/mappe/spilli/:id/precondizione-raccordo` (`routes/mappe.ts:153-158`), **senza consumatori nel FE** (`src/`: nessun `precondizione-raccordo` né `revisioneRaccordoAttesa`): se B7/B19 la dichiarano orfana, B9 non deve portarla ma toglierla insieme.

### 4.2 R11-02/2 `mappa_entita`

Equivalenza (E8, E9, E10): le 131 righe `area` coincidono con i 105 legami `infiltrazione_area` **in entrambe le direzioni** (0 non coperte; 0 legami dell'Area senza riga vecchia); le 3 righe `luogo` sono tutte `luogo.area_chiave = mappa.area_chiave` e la mappa è la **planimetria predefinita** dell'Area (3/3); la riga `quartiere` è `citta-yongen-jaya` (convenzione E6).

| Dove | Porting |
|---|---|
| `accessoMondoService.ts:117,134,142-143` (`cerca()`) | sostituire le due righe con: per `r.tipo === 'quartiere'` → `aggiungi(radiceDelQuartiere(r.chiave), null, null, 'entita-mappa', r)`; per `r.tipo === 'dungeon'` → `aggiungi(radiceDelPalazzo(r.chiave), …)`; per `r.tipo === 'luogo'` → la **planimetria predefinita dell'Area del luogo**: `SELECT a.planimetria_predefinita FROM luogo l JOIN area a ON a.chiave = l.area_chiave WHERE l.chiave = ?`. (`aggiungi` ignora già le mappe inesistenti e, a `:161-166`, scarta l'accesso generico se la stessa mappa ha il pin esatto.) **Estensione di comportamento: D4.** Aggiornare i due commenti (`:117`, `:134`) |
| `fotografiaLuogoDaPin.ts` | togliere `collocazioni` (`:19` interfaccia, `:184` query, `:201` ritorno); `:96` → `r.chiave === pin.mappa_chiave`; **eliminare** la riga `:103` (`mappa_entita`); togliere le righe `UNION ALL` di `:186-187` (mappa con `entita_tipo='luogo'`, `mappa_entita`) |
| `precondizioneRaccordoPin.ts` | `:117` → togliere `|| mappaQuartiere.entita_tipo !== 'quartiere' || mappaQuartiere.entita_chiave !== 'shibuya'` (la mappa è già scelta per chiave `citta-shibuya`: resta `mappaQuartiere?.tipo !== 'quartiere'`); eliminare `:178-181` (`associazioni`); togliere i termini `mappa_entita`/`entita_*` di `:211-213` |
| `luoghiScritture.ts:140,152`, `catalogoService.ts:549` | già al §4.1 punti 5-6 |
| `mappeService.ts` | già al §4.1 punti 16-23 |
| **`pacchetto/pacchettoGioco.ts:52`** | la regola d'avvio `collegaLuoghiAllePlanimetrie` **scrive** `mappa_entita` a ogni avvio: va **tolta** da `regoleAllAvvio` (e il campo `luoghiCollegati` di `EsitoRegoleAvvio`: nessun altro consumatore, grep) |
| `server/db/migrations/054_…ts` | la funzione `collegaLuoghiAllePlanimetrie` **resta dov'è** (la 054 la chiama; ritorna 0 se `mappa_entita` manca: `:42-43`); la importa ancora `avvioImmutabile.test.ts:25` |

### 4.3 R11-02/3 `mappa_presentazione.gruppo_immagini_json`

**Sostituzione**: nome della stanza = `area.nome`; ordine = `mappa.versione_ordine`; etichetta = `mappa.versione_etichetta`; stanza di appartenenza = `mappa.area_chiave`. Per gli 8 fogli dei Memento (senza Area) la migrazione porta etichetta e ordine sulle colonne `versione_*` (che per loro oggi sono NULL).

| Dove | Oggi | Dopo |
|---|---|---|
| `mappeService.ts:122-146` (`contestoMappe`), `:110,124-128` | legge `gruppo_immagini_json` nelle presentazioni; passa `gruppoImmagini` a `calcolaCollezioniImmagini` | leggere solo `contesti_json`; nel `.map` delle righe passare `inStanza: r.versione_etichetta !== null` al posto di `gruppoImmagini` |
| `collezioniImmagini.ts:14,20` | `ImmagineCandidataCollezione.gruppoImmagini?`; `if(!r.fisica\|\|r.gruppoImmagini)continue` | campo `inStanza?: boolean`; `if(!r.fisica\|\|r.inStanza)continue` (219 = 211 + 8 **identico**, §2) |
| `mappeService.ts:152-170` (`riassunto`) | spread di `presentazioni.get(...)` con `gruppoImmagini` | solo `contesti`; aggiungere `versione: r.versione_etichetta !== null \|\| r.versione_ordine !== null ? { etichetta: r.versione_etichetta ?? null, ordine: r.versione_ordine ?? 0 } : null` |
| `mappeService.ts:782-813` (`aggiornaPresentazioneMappa`), `:819-863` (`tavoleDelGruppo`, `nomeDelGruppo`, `rinominaGruppo`, `nomeStanzaDaFissare`, `gruppoConNomeRivisto`), `:865` (`GruppoImmagini`), `:877-942` (`impostaStanzaMappa`) | scrivono il gruppo (rotte `PUT /:chiave/presentazione` e `/stanza` per le mappe **senza Area**) | **eliminare tutto** (D6). I Memento non hanno più un gruppo da scrivere |
| `mappeService.ts:1124-1126` (`aggiornaMappa`) | `stanzaDaFissare`/`rinominaGruppo` quando si rinomina una planimetria | togliere: con le Aree il nome della stanza è `area.nome`, indipendente dal nome della planimetria |
| `mappeService.ts:2245-2249` (`importaMappe`) | scrive `gruppo_immagini_json` dal pacchetto | scrivere solo `contesti_json`; accettare e **ignorare** `m.gruppoImmagini` (§4.10) |
| `areeService.ts:764-765` (`presentazioneDellaPlanimetria`, ramo `gruppoId` stringa) | trova l'Area di destinazione con `json_extract(gruppo_immagini_json,'$.id') = ?` | risolvere `gruppoId` come **chiave di planimetria** (pubblica o interna, con prefisso `utente:` tolto): `SELECT a.* FROM mappa m JOIN area a ON a.chiave = m.area_chiave WHERE m.chiave = ?` con `idMappa(...)`. Copre 75/78 id di gruppo reali + i 3 `utente:<chiave>` (compatibilità «best effort» per un client esterno: il FE non chiama più la rotta) |
| `areeService.ts:692-780` | handler delle tre rotte vecchie: restano per le mappe **con Area** | per le mappe senza Area (`planimetriaConArea` → `area: null`) rispondere **409 `mappa-senza-area`** invece di ripiegare sulle funzioni eliminate; aggiornare `routes/mappe.ts:114-137` (le tre rotte) e i testi OpenAPI `mappe.ts:98,110,116` |
| FE `src/utils/etichettaVersione.ts:16,18,29` | `mappa.gruppoImmagini?.etichetta` / `.ordine` | `mappa.versione?.etichetta` / `mappa.versione.ordine` |
| FE `src/utils/presentazioneMappa.ts:9,56,88,94` | `IdentitaMappa` include `gruppoImmagini`; `base` e `titoloGruppoImmagini` usano `gruppoImmagini.nome/nomeRivisto` | `IdentitaMappa` con `area` e `versione`; il nome della stanza è `mappa.area?.nome` (con il filtro `senzaGergo` come oggi); `nomeRivisto` del gruppo scompare (vince il `nomeRivisto` della mappa come già a `:87`) |
| FE `src/utils/gruppiPlanimetrie.ts` | `raggruppaPlanimetrie` legge `gruppoImmagini.id` (`:55`) | **codice morto**: `raggruppaPlanimetrie`, `VersionePlanimetria`, `GruppoPlanimetrie`, `perOrdineDiGuida`, `chiaviInOrdine`, `spostaGruppo`, `spostaVersioneA` non hanno consumatori fuori dal file (grep `src/`, 0, nemmeno test). Eliminarli; **tenere `nomeSenzaPalazzo`** (usata da `AtterraggioTokyo.tsx:23`, `GuidaDellArea.tsx:24`, `GuidaNelVisore.tsx:26`, `DungeonDettaglioPage.tsx:32`) |
| FE `src/components/mappe/ImmaginiLuogo.tsx:21` | ordina con `gruppoImmagini?.ordine` | `m.area?.versioneOrdine` (o `m.versione?.ordine`) |
| FE `src/pages/MappaPage.tsx:516` | `mappa.gruppoImmagini ? <ImmaginiLuogo mappe={…filter(m => m.gruppoImmagini?.id === mappa.gruppoImmagini!.id)} …>` | `mappa.area ? <ImmaginiLuogo mappe={…filter(m => m.area?.chiave === mappa.area!.chiave)} …>` |
| FE `MappaPage.tsx:69,157,286-287`, `AlberoLuoghi.tsx:26,38,95` | `radiciRaggruppate`, `IndiceMappe`, albero | **li sostituisce B5**: B9 parte dopo B5 e non li tocca |
| DTO `shared/types.ts:2606` (`gruppoImmagini`), `:2916` (nel pacchetto) | — | `MappaRiassuntoDto`: togliere `gruppoImmagini`, aggiungere `versione`; pacchetto: `gruppoImmagini?` resta **opzionale in sola lettura** (pacchetti di prima) |

Differenze **visibili** attese (da dichiarare all'utente, non regressioni): (a) il titolo della stanza di 5 planimetrie passa dal nome di gruppo a `area.nome` (4 con `nome_rivisto=1` dell'Area, 1 con il gergo dell'estrattore che il filtro già nasconde); (b) nel visore le versioni di un'Area si mostrano **tutte** insieme (prima solo le 211 con gruppo; le 62 senza erano sciolte); (c) gli 8 fogli dei Memento perdono la striscia di miniature del gruppo e hanno il selettore delle sorelle (D5); il loro nome contiene già gruppo ed etichetta.

### 4.4 R11-02/4 `guida_mappa`

| Dove | Porting |
|---|---|
| `contenutiGuidaService.ts:67-71` | togliere `LEFT JOIN guida_mappa g …` e `COALESCE(g.note,'') note`; `note: a.note` nel mapping `AreaGuidaMappaDto` (`:79`) sparisce |
| `shared/organizzazioneMappe.ts:28` | togliere `note` da `AreaGuidaMappaDto` |
| FE `src/components/mappe/ContenutiGuidaMappa.tsx:50` | togliere `{a.note && <p …>{a.note}</p>}` |
| `sincronizzaMappe.ts:100-101`, `organizzazioneMappe.ts:28` | scrittori solo in 027/042: li congela §4.5 |
| `cestinoService.ts:115` | etichetta: non togliere (§5) |
| `guida_alias` | **resta**: 92 righe, viva (`contenutiGuidaService` per `risolviPercorsoMappa`, `dungeonService`); tutte le `guida_mappa` hanno la riga alias (0 senza) |

Archivio: le 4 `guida_mappa` che dicono altro da `dungeon_area` (nome diverso; `note`/`metadata_json` non vuoti: 0).

### 4.5 Migrazioni vecchie che importano servizi vivi: congelamento

Verifica con grep (`from '../../services|utils|routes'` in `server/db/migrations` e `migrazioniUtente`, esclusi i test): i **servizi vivi** importati sono **dieci file di migrazione**; 130, 131, 135 e 150 (citate in `preparazione` §7.3) importano solo file locali della cartella (`ingressoMemento130.ts`, `informazioniMakoto131.ts`, `storiaAttivita135.ts`, `takemiManifest135.ts`, `abbinamentiCatalogo144.ts`) che a loro volta importano **solo `shared/` e `dbService`** (più `snapshotProposte121.ts` → `utils/httpError`): non dipendono dai servizi che B8/B9 cambiano.

| Migrazione | Importa | Lo cambia B8/B9? | Azione |
|---|---|---|---|
| 027 | `sincronizzaMappe` (+ `organizzazioneMappe`, `presenzaEntita.unisci`, `percorsiMappe`, `identitaSpillo`) | **sì** (si elimina) | **congelare ora** |
| 042 | `riconciliaAreeGuida` | **sì** (si elimina) | **congelare ora** |
| 038 | `sincronizzaPercorsiMappe` | no (percorsiMappe resta e non cambia in B8/B9) | consigliato congelare nello stesso passo (copia di ~40 righe) |
| 066, 067 | `assegnaUidMancanti` | no (`identitaSpillo.ts` resta) | consigliato congelare (copia di ~20 righe) |
| 036, 052, 064, 070 | `contestoConversione` → `datiGuida.bloccoGuidaDi/finestreDaDati` | no | **B12** (cambia `sblocco-quartieri`/`datiGuida`) |
| utente 017 | `statiGuida.allineaEnigmaDellaVoce` | no | **B13** (tocca `statiGuida`) |

Struttura proposta: cartella `server/db/migrations/congelati/` (compilata da `tsconfig.server.json`: `include server/**/*`); ogni file porta in testa «copia congelata di <file> al <data>: non si modifica, non si importa da altro».
- `congelati/sincronizzaMappe027.ts`: `sincronizzaMappe` (era `sincronizzaMappe.ts:74-220`), `POSIZIONI_TOKYO`, `posizionePassaggio`, `VECCHIA_CORRISPONDENZA` e **una copia di `riallineaSpilliLuoghi`** (la chiama dentro il blocco di `marcatore_luogo`), `unisci` (copia di `presenzaEntita.ts`), importa `riconciliaAreeGuida042` e `sincronizzaPercorsiMappe038`, `assegnaUidMancanti067` dai fratelli. Importa ancora da `shared/` (`categoriaSpillo`, `spilloPerPunto`, `spilloPerLuogo`, `leggiCondizioniSalvate`): non sono congelati (limite L5: la 027 gira solo su basi anteriori alla versione 27, e il pacchetto iniziale è alla 93).
- `congelati/organizzazioneMappe042.ts` = `riconciliaAreeGuida` (era `organizzazioneMappe.ts:13-43`).
- `congelati/percorsiMappe038.ts` = `sincronizzaPercorsiMappe` e le sole funzioni che usa (`stmt`, `haPercorsi`, tipo `Nodo`); `httpErrors` resta importato da `utils/httpError`.
- `congelati/identitaSpillo067.ts` = `identitaSpillo`, `uidSpillo`, `assegnaUidMancanti`.
- Le migrazioni 027, 038, 042, 066, 067 cambiano **solo la riga di import**.
- **Estrarre `riallineaSpilliLuoghi`** (`sincronizzaMappe.ts:53-65`, viva: `pacchettoGioco.ts:53` a ogni avvio) in un modulo vivo, es. `server/services/mappe/riallineaSpilliLuoghi.ts` (con `VECCHIA_CORRISPONDENZA`); aggiornare l'import di `pacchettoGioco.ts:28`.
- Poi **eliminare** `server/services/mappe/sincronizzaMappe.ts` (con lo stub `collegaPalazziAiLuoghi`, restituisce 0, provato morto: `preparazione` §6.4) e `organizzazioneMappe.ts`. `presenzaEntita.ts` resta (B19 toglie `applicaPresenzaAiLuoghi`).

Prova che il congelamento non cambia il comportamento (senza test): migrare **da zero** (file vuoto) con il codice prima e dopo e confrontare `sqlite_master` e conteggi/impronte di ogni tabella; migrare la copia della **base v93** (pacchetto iniziale) con il codice prima e dopo e confrontare le impronte (§7).

### 4.6 `regoleAllAvvio` (`pacchetto/pacchettoGioco.ts:44-59`)

- Togliere `luoghiCollegati: prova('collegaLuoghiAllePlanimetrie', …)` (`:52`) e l'import di `:27`; togliere il campo da `EsitoRegoleAvvio` (`:34`).
- `spilliRiallineati` usa il modulo vivo estratto (§4.5); `traduciNomiSpilli` e `assegnaUidMancanti` restano com'erano.
- Nessun altro lettore di quegli esiti (grep: solo `index.ts:69` che li spalma in un log).

### 4.7 Migrazione B9 — testo esatto

File: `server/db/migrations/<N+1>_legami_e_presentazione_delle_mappe.ts`, dopo la B8. Stesse regole (transazione, `foreign_keys=OFF`, copia di avvio, nessun import da `services`). `ALTER TABLE … DROP COLUMN` ha precedenti (`089_…ts:48`, `099_…ts:62`) e funziona sul DDL reale (provato in RAM): nessuna ricostruzione della tabella.

```ts
import { createHash } from 'node:crypto';
import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

/**
 * L11 · B9 (R11-02/1, /2, /3, /4): tolgono dal modello `mappa.entita_tipo/entita_chiave`, `mappa_entita`, `mappa_presentazione.gruppo_immagini_json`
 * e `guida_mappa` (più `organizzazione_mappa_esito`, 0 righe, scritta solo da `riconciliaAreeGuida`). Prima si controlla che il dato nuovo
 * copra il vecchio (E5–E13) e si archivia in `dati_guida` ogni riga non coperta: la migrazione non si ferma per dati inattesi (l'avvio deve partire),
 * ma non perde niente. Gli 8 fogli senza Area che avevano un gruppo (Memento) portano etichetta e ordine sulle colonne `versione_*`.
 */
const ARCHIVIO = 'archivio-legami-e-presentazione-mappe-l11';
const SENTINELLE: Record<string, string> = {
  spillo: 'SELECT * FROM main.spillo ORDER BY id',
  spillo_voce: 'SELECT * FROM main.spillo_voce ORDER BY spillo_id, voce_chiave',
  spillo_destinazione: 'SELECT * FROM main.spillo_destinazione ORDER BY spillo_id',
  punto_interesse: 'SELECT * FROM main.punto_interesse ORDER BY chiave',
  dungeon: 'SELECT * FROM main.dungeon ORDER BY chiave',
  dungeon_area: 'SELECT * FROM main.dungeon_area ORDER BY chiave',
  infiltrazione_area: 'SELECT * FROM main.infiltrazione_area ORDER BY infiltrazione_chiave, area_chiave',
  area: 'SELECT * FROM main.area ORDER BY chiave',
  luogo: 'SELECT * FROM main.luogo ORDER BY chiave',
  quartiere: 'SELECT * FROM main.quartiere ORDER BY chiave',
  quartiere_ingresso: 'SELECT * FROM main.quartiere_ingresso ORDER BY quartiere_chiave',
  guida_alias: 'SELECT * FROM main.guida_alias ORDER BY chiave',
  mappa_percorso: 'SELECT * FROM main.mappa_percorso ORDER BY mappa_chiave',
  mappa_alias: 'SELECT * FROM main.mappa_alias ORDER BY chiave',
  pianta_quartiere: 'SELECT * FROM main.pianta_quartiere ORDER BY quartiere_chiave',
};
/** `mappa` senza le colonne che escono e senza `versione_*` (che cambiano solo per gli 8 fogli dichiarati). */
const MAPPA_RESIDUA = 'SELECT chiave, nome, tipo, genitore_chiave, ordine, immagine_chiave, asset, larghezza, altezza, origine, note, updated_at, ruolo_immagine, nome_rivisto, area_chiave, percorso_fisso FROM main.mappa ORDER BY chiave';
const CONTESTI = 'SELECT mappa_chiave, contesti_json FROM main.mappa_presentazione ORDER BY mappa_chiave';
const errore = (motivo: string): never => { throw new Error(`B9: ${motivo}; nessuna modifica applicata.`); };
const esiste = (db: AppDatabase, t: string): boolean => !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(t);
const haColonna = (db: AppDatabase, t: string, c: string): boolean => (db.prepare(`PRAGMA main.table_info(${t})`).all() as Array<{ name: string }>).some((x) => x.name === c);
const righe = (db: AppDatabase, sql: string): Array<Record<string, unknown>> => db.prepare(sql).all() as Array<Record<string, unknown>>;
const quante = (db: AppDatabase, sql: string): number => (db.prepare(sql).get() as { n: number }).n;
function firma(db: AppDatabase, sql: string): string { const h = createHash('sha256'); let n = 0; for (const r of db.prepare(sql).iterate()) { h.update(JSON.stringify(r) + '\n'); n++; } return `${n}:${h.digest('hex')}`; }

export const migrationN1: Migration = {
  id: 0 /* N+1 */, name: 'legami_e_presentazione_delle_mappe',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!haColonna(db, 'mappa', 'entita_tipo')) return;                           // già applicata
    for (const t of ['mappa', 'mappa_presentazione', 'area', 'infiltrazione_area', 'quartiere', 'dungeon', 'dungeon_area', 'luogo', 'dati_guida']) if (!esiste(db, t)) errore(`manca la tabella ${t}`);
    for (const c of ['area_chiave', 'versione_etichetta', 'versione_ordine']) if (!haColonna(db, 'mappa', c)) errore(`manca la colonna mappa.${c}`);
    const conEntita = esiste(db, 'mappa_entita'), conGuida = esiste(db, 'guida_mappa'), conGruppo = haColonna(db, 'mappa_presentazione', 'gruppo_immagini_json');
    const sentinelle = Object.keys(SENTINELLE).filter((t) => esiste(db, t));
    const prima = new Map(sentinelle.map((t) => [t, firma(db, SENTINELLE[t]!)]));
    const mappaPrima = firma(db, MAPPA_RESIDUA), contestiPrima = firma(db, CONTESTI);
    const conti = { mappa: quante(db, 'SELECT COUNT(*) AS n FROM main.mappa'), presentazione: quante(db, 'SELECT COUNT(*) AS n FROM main.mappa_presentazione'),
      mappaConEntita: quante(db, 'SELECT COUNT(*) AS n FROM main.mappa WHERE entita_tipo IS NOT NULL'),
      mappaEntita: conEntita ? quante(db, 'SELECT COUNT(*) AS n FROM main.mappa_entita') : 0, guidaMappa: conGuida ? quante(db, 'SELECT COUNT(*) AS n FROM main.guida_mappa') : 0,
      gruppi: conGruppo ? quante(db, 'SELECT COUNT(*) AS n FROM main.mappa_presentazione WHERE gruppo_immagini_json IS NOT NULL') : 0 };

    // ---- guardie: ciò che il dato nuovo non copre si archivia (E5–E13) ----
    const archivio: Record<string, unknown> = { versione: 1, migrazione: 'L11-B9', conteggi: conti,
      motivo: 'Fonti tolte dal modello; qui resta ciò che il dato nuovo non ripete (vedi docs/coordinamento/lotti/L11/ondata1/B8-B9-fonti-mappe.md).' };
    archivio.radici_irregolari = righe(db, `SELECT chiave, tipo, entita_tipo, entita_chiave FROM main.mappa WHERE
      (entita_tipo = 'quartiere' AND (tipo <> 'quartiere' OR chiave <> 'citta-' || entita_chiave)) OR (entita_tipo = 'dungeon' AND (tipo NOT IN ('palazzo','dedalo') OR chiave <> 'dungeon-' || entita_chiave))`);
    archivio.mappe_area_non_coperte = righe(db, `SELECT chiave, area_chiave, entita_chiave FROM main.mappa m WHERE entita_tipo = 'area' AND NOT EXISTS
      (SELECT 1 FROM main.infiltrazione_area ia WHERE ia.infiltrazione_chiave = m.entita_chiave AND ia.area_chiave = m.area_chiave)`);
    if (conEntita) {
      archivio.legami_area_non_coperti = righe(db, `SELECT e.* FROM main.mappa_entita e WHERE e.entita_tipo = 'area' AND NOT EXISTS (SELECT 1 FROM main.mappa m JOIN main.infiltrazione_area ia
        ON ia.area_chiave = m.area_chiave AND ia.infiltrazione_chiave = e.entita_chiave WHERE m.chiave = e.mappa_chiave)`);
      archivio.legami_luogo_non_coperti = righe(db, `SELECT e.* FROM main.mappa_entita e WHERE e.entita_tipo = 'luogo' AND NOT EXISTS (SELECT 1 FROM main.luogo l JOIN main.mappa m ON m.chiave = e.mappa_chiave
        WHERE l.chiave = e.entita_chiave AND l.area_chiave IS NOT NULL AND l.area_chiave = m.area_chiave)`);
      archivio.legami_quartiere_non_coperti = righe(db, `SELECT e.* FROM main.mappa_entita e WHERE e.entita_tipo = 'quartiere' AND NOT EXISTS (SELECT 1 FROM main.mappa m WHERE m.chiave = e.mappa_chiave AND m.chiave = 'citta-' || e.entita_chiave)`);
      archivio.altri_legami = righe(db, `SELECT * FROM main.mappa_entita WHERE entita_tipo NOT IN ('area','luogo','quartiere')`);
    }
    if (conGruppo) {
      archivio.gruppi_immagini = righe(db, `SELECT p.mappa_chiave, p.gruppo_immagini_json FROM main.mappa_presentazione p JOIN main.mappa m ON m.chiave = p.mappa_chiave LEFT JOIN main.area a ON a.chiave = m.area_chiave
        WHERE p.gruppo_immagini_json IS NOT NULL AND (m.area_chiave IS NULL OR COALESCE(json_extract(p.gruppo_immagini_json,'$.etichetta'),'') <> COALESCE(m.versione_etichetta,'')
          OR json_extract(p.gruppo_immagini_json,'$.ordine') IS NOT m.versione_ordine OR json_extract(p.gruppo_immagini_json,'$.nome') IS NOT a.nome) ORDER BY p.mappa_chiave`);
    }
    if (conGuida) {
      archivio.guida_mappa = righe(db, `SELECT g.* FROM main.guida_mappa g LEFT JOIN main.dungeon_area a ON a.chiave = g.area_chiave
        WHERE a.chiave IS NULL OR g.nome <> a.nome OR g.note <> '' OR g.metadata_json NOT IN ('','{}') ORDER BY g.area_chiave`);
    }
    db.prepare('INSERT OR REPLACE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run(ARCHIVIO, JSON.stringify(archivio));

    // ---- etichetta e ordine dei fogli senza Area che avevano un gruppo (Memento) → colonne della versione ----
    const portati = conGruppo ? db.prepare(`UPDATE main.mappa SET
        versione_etichetta = (SELECT json_extract(p.gruppo_immagini_json,'$.etichetta') FROM main.mappa_presentazione p WHERE p.mappa_chiave = mappa.chiave),
        versione_ordine = (SELECT json_extract(p.gruppo_immagini_json,'$.ordine') FROM main.mappa_presentazione p WHERE p.mappa_chiave = mappa.chiave)
      WHERE area_chiave IS NULL AND versione_etichetta IS NULL AND versione_ordine IS NULL
        AND EXISTS (SELECT 1 FROM main.mappa_presentazione p WHERE p.mappa_chiave = mappa.chiave AND p.gruppo_immagini_json IS NOT NULL)`).run().changes : 0;

    // ---- tolgono ----
    db.exec('ALTER TABLE main.mappa DROP COLUMN entita_tipo');
    db.exec('ALTER TABLE main.mappa DROP COLUMN entita_chiave');
    if (conGruppo) db.exec('ALTER TABLE main.mappa_presentazione DROP COLUMN gruppo_immagini_json');
    for (const t of ['mappa_entita', 'guida_mappa', 'organizzazione_mappa_esito']) if (esiste(db, t)) db.exec(`DROP TABLE main.${t}`);

    // ---- verifiche dopo ----
    for (const t of sentinelle) if (firma(db, SENTINELLE[t]!) !== prima.get(t)) errore(`la tabella ${t} è cambiata`);
    if (firma(db, MAPPA_RESIDUA) !== mappaPrima) errore('le righe di mappa sono cambiate');
    if (firma(db, CONTESTI) !== contestiPrima) errore('i contesti delle presentazioni sono cambiati');
    if (quante(db, 'SELECT COUNT(*) AS n FROM main.mappa') !== conti.mappa || quante(db, 'SELECT COUNT(*) AS n FROM main.mappa_presentazione') !== conti.presentazione) errore('conteggi cambiati');
    if (haColonna(db, 'mappa', 'entita_tipo') || haColonna(db, 'mappa', 'entita_chiave') || haColonna(db, 'mappa_presentazione', 'gruppo_immagini_json')) errore('una colonna esiste ancora');
    logger.info({ migrazione: 'L11-B9', conti, versioniPortate: portati,
      archiviate: Object.fromEntries(Object.entries(archivio).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, (v as unknown[]).length])) }, 'legami e presentazione delle mappe tolti dal modello');
  },
};
```

Risultato della prova a secco sulla copia (RAM, dopo la B8): guardie `radici_irregolari` 0, `mappe_area_non_coperte` 0, `legami_area_non_coperti` 0, `legami_luogo_non_coperti` 0, `legami_quartiere_non_coperti` 0, `altri_legami` 0; `gruppi_immagini` **22**, `guida_mappa` **4**; **8** versioni portate sui fogli dei Memento (etichette «tela quadrata, disegno minuto — la meno estesa» … ordini 0–7); archivio da **5 293 byte**; `foreign_key_check` vuoto; `integrity_check` ok; `mappa` 316 righe e `mappa_presentazione` 226 invariate; impronte delle 12 sentinelle del §2 identiche; `mappa` residua identica; `contesti_json` identici.
Le sole righe di `mappa` che cambiano sono gli 8 fogli (campi `versione_*`, dichiarati).

### 4.8 DTO in `shared/types.ts` e `shared/organizzazioneMappe.ts` (riepilogo)

| Campo | Riga (24/10) | Azione |
|---|---|---|
| `LuogoDto.marcatore` | `types.ts:1775` | togliere (B8) |
| `PuntoInteresseDto.marcatore` | `types.ts:2203` | togliere (B8) |
| `PuntoGuidaMappaDto.posizioneDaCollocare` | `organizzazioneMappe.ts:26-27` | togliere (B8) |
| `MappaRiassuntoDto.entita` | `types.ts:2622` | sostituire con `radiceDi: { tipo: 'quartiere' \| 'dungeon'; chiave: string } \| null` (B9) |
| `MappaRiassuntoDto.gruppoImmagini` | `types.ts:2606` | togliere; aggiungere `versione: { etichetta: string \| null; ordine: number } \| null` (B9) |
| `AreaGuidaMappaDto.note` | `organizzazioneMappe.ts:28` | togliere (B9) |
| `EsportazioneMappeDto.mappe[]`: `entita`, `entitaLegami`, `gruppoImmagini` | `types.ts:2919, 2910, 2916` | non si esportano più; restano **opzionali in lettura** (`entita?`, `entitaLegami?`, `gruppoImmagini?`) per i pacchetti di prima; `entita` serve ancora a `importaMappe` per ricavare le infiltrazioni di un pacchetto senza `aree` (`:2237-2238`) |
| `LegameEntitaPacchetto` | `types.ts:2896` | tenerlo come tipo di sola lettura, o togliere con `entitaLegami` e fare `unknown` |
| commenti `(mappa_entita)` | `types.ts:2285`, `:2451` area | riscrivere |
| `DatiMappaApi.entita` | `src/services/api/mappe.ts:12` | restringere a `{ tipo: 'area'; chiave: string } \| null` |

### 4.9 Frontend (riepilogo B9)

`MappaPage.tsx:366,528,530` (`radiceDi`), `:516` (stanza da `area`); `EditorMappaPage.tsx:279-280,433` (`radiceDi`); `etichettaVersione.ts`, `presentazioneMappa.ts`, `ImmaginiLuogo.tsx`, `gruppiPlanimetrie.ts` (eliminare il codice morto, tenere `nomeSenzaPalazzo`), `ContenutiGuidaMappa.tsx:50` (`note`). B5 rifà `IndiceMappe`/`AlberoLuoghi`: **B9 FE parte dopo B5**.

### 4.10 Import/export delle mappe (editor) e compatibilità coi pacchetti di prima

- **Esporta**: smette di scrivere `entita`, `entitaLegami`, `gruppoImmagini`; il resto è uguale (Aree, `legami`, `versione`, `aree`).
- **Importa** (`importaMappe`): deve **continuare ad accettare** i pacchetti di prima (R11-05): `entita`, `entitaLegami` e `gruppoImmagini` si leggono e si **ignorano**.
- **Trappola da evitare**: in `mappeService.ts:2227-2244` il riempimento di `areeDaLegare` sta dentro `else if (conEntita) {…}` (`conEntita` = «esiste `mappa_entita`»). Con la tabella tolta **diventerebbe falso** e un pacchetto senza `legami` non legherebbe più le infiltrazioni alle Aree (`:2466-2480` le consumano). Va spostato fuori da quella condizione: calcolare `aree` da `m.aree` (o da `m.entita` di tipo `area`) e fare `areeDaLegare.push(...)` **sempre**.
- Il blocco `:2245-2249` (`contesti`/`gruppo`) diventa: validare e scrivere solo `contesti`.
- La rotta dell'API è invariata; il formato nuovo è un sottoinsieme di quello vecchio (andata e ritorno identica sul modello nuovo).

---

## 5. Cestino, `RIFERIMENTI_PARTITE`, import/export del database

**Registri del cestino** (copia: 8 righe; letto ogni passo di ogni registro): nessuna riga cita `marcatore_mappa`, `marcatore_luogo`, `pianta_area`, `mappa_entita`, `guida_mappa` (0 passi, 0 conteggi nei riepiloghi). Citano: `mappa` (2 righe: il registro porta le chiavi `entita_tipo/entita_chiave` con valore **NULL**, 0 non nulle) e `mappa_presentazione` (1 passo, con `gruppo_immagini_json` **non nullo**: la voce del Sottopasso, che ha anche `area_chiave`, `versione_etichetta`, `versione_ordine` ugualmente salvati).
Dopo il drop:
- il ripristino **non fallisce**: tabella assente → saltata con `non-esiste-piu` (`cestinoService.ts:522`), colonna assente → ignorata in silenzio (`:524-525`); `leggiPassiCestino` e `strutturaTabella` tollerano le tabelle assenti;
- di quella voce tornano la planimetria, la sua Area/versione (che il modello nuovo legge) e la presentazione con i soli `contesti_json`; il valore perso (`gruppo_immagini_json`) è **ridondante** (= `versione_etichetta` «planimetria completa», ordine 1) ed è esattamente il caso che B10 deve **segnalare** con `colonna-rimossa`;
- gli elementi eliminati **prima della migrazione ma dopo questa misura** possono citare le tabelle tolte (ad es. l'eliminazione di una voce con segnaposto registra `marcatore_mappa` e quella di un'infiltrazione registra `pianta_area`): al ripristino saltano con `non-esiste-piu` (B10: `tabella-rimossa`).
- **`ETICHETTE` (`cestinoService.ts:109,111,114,115,132`) NON si toccano**: servono a mostrare i riepiloghi dei registri già salvati. B10 le sposta in un elenco «storico» col motivo, non le cancella.
- `fotografiaCestino` (`fotografiaLuogoDaPin.ts`) e `precondizioneRaccordoPin.ts:195-196`: il secondo esige che ogni tabella citata da un registro del cestino **esista** (`pragma_table_info` vuoto → 409 «tabella di una fotografia non riconoscibile»). Con le tabelle tolte un registro vecchio che le cita farebbe fallire quel raccordo: oggi 0 casi; è un motivo in più per non portarlo (B7/B19) invece di adattarlo.

**`RIFERIMENTI_PARTITE`** (`pacchettoGiocoService.ts:69-128`): **nessuna riga da allineare** per B8/B9 (grep: nessuna riga cita le tabelle o le colonne di queste otto voci; le tabelle utente non le referenziano).

**Import/export del database**: l'export è il backup dell'intero file: le tabelle tolte escono per costruzione. L'«Importa» sostituisce `gioco.db` e riapre con `runMigrations` + `regoleAllAvvio` (`pacchettoGiocoService.ts:370-392`): un file **vecchio** passa dalle migrazioni B8/B9, che ne **archiviano** i dati nei due blocchi `archivio-…-l11` (nessuna perdita, nessun «rifiuto»); `anteprimaPacchetto.tabelleAssenti` (`:286`) e il riepilogo degli scarti sono di B10. `caricaPacchetto`/`ricaricaPacchetto` copiano solo tabelle e colonne comuni (nessuna lista fissa di B8/B9): non cambiano.

---

## 6. Test da toccare

Regola dell'utente (24/10): **modifiche ai test solo per farli compilare**; nessun test eseguito. Elenco da **verificare con `npm run typecheck`** (stima da grep, non esaustiva).

**Da toccare per compilare (rimozione di campi dai DTO tipizzati)**
- B8 (`marcatore`): `server/routes/dungeon.test.ts:41-47,106,109`, `server/routes/piante-citta.test.ts:44,47` (leggono la proprietà `.marcatore`); fixture con `marcatore: null` in `src/components/guida/{AreeDelDedalo,GuidaDellArea,ModuloPersona,PersoneDellArea,TramaDellArea}.test.tsx`, `src/pages/DungeonDettaglioPage.test.tsx` (9 punti), `src/utils/{completamentoAree,dedali}.test.ts`, `src/pages/CittaPage.test.tsx:306` (usa `as`: probabilmente compila).
- B9: `src/utils/presentazioneMappa.test.ts` (7 `gruppoImmagini`), `src/pages/EditorMappaPage.test.tsx` (7), `src/pages/MappaPage.test.tsx` (3, e `note:''` di `ContenutiMappaDto`), `src/components/mappe/{CollezioniImmagini,OrganizzazioneMappe,PassaggiMappa,VisoreMappa,DoveSiTrova,ContenutiGuidaAccesso}.test.tsx`, `src/components/partita/OggiPartita.test.tsx`, `src/hooks/useMappaPartita.test.tsx` (`entita:` di `MappaRiassuntoDto`; `DoveSiTrova`/`AccessoMondoPage` possono riferirsi al DTO dell'accesso, non toccato), `server/services/mappe/collezioniImmagini.test.ts` (2, campo `gruppoImmagini` → `inStanza`), `server/routes/avanzamento-unico.test.ts` (`note`).
- Importazioni da riallineare: `avvioImmutabile.test.ts:26` e `sincronizzaMappe.test.ts:6` (`riallineaSpilliLuoghi` dal modulo vivo), `sincronizzaMappe.test.ts:6`, `visibilitaCondizionale.test.ts:18` (`sincronizzaMappe` dalla copia congelata), `finestreDungeon.test.ts:36` (`collegaPalazziAiLuoghi`, eliminata con lo stub: togliere l'import e l'uso).

**Diventano rossi a runtime (compilano), non si eseguono** — vanno dichiarati «superati dal lotto L11» con un commento (R11-04) senza cancellare il file; conflitto da notare: `R11-04` chiede «nessuna variante rossa lasciata» mentre la decisione del 24/10 vieta di eseguirli: va confermato che il commento basta.
`server/routes/{dungeon,avanzamento-unico,sposta-voce-area,piante-citta}.test.ts` (aspettano `marcatore`), `aree-eliminabili.test.ts`, `immagine-mappa-strade.test.ts`, `scarico-fonte.test.ts` (inseriscono in `pianta_*`/`marcatore_*` con SQL), `server/routes/{mappe-editor,planimetrie-aree-multiple,planimetrie-palazzo,palazzi-aree,nuova-area,stanze-planimetrie,cestino,guida-modificabile,verifica-mappe,aree-dei-dedali,enigmi-guida,guida-pin,accesso-mondo}.test.ts`, `server/services/mappe/{organizzazioneMappe,avvioImmutabile,sincronizzaMappe,visibilitaCondizionale,finestreDungeon}.test.ts` (legami/gruppi/guida_mappa), `src/components/impostazioni/Cestino.test.tsx`. I test di migrazione `095_…test.ts`, `098_…test.ts`, `054_…test.ts`, `109_…test.ts`, `110_…test.ts` girano su schemi fermati alla loro versione e **non** sono toccati dalle migrazioni N/N+1.

---

## 7. Come si verifica SENZA test

Strumenti (sola lettura o su **copia**; nessuna scrittura sui dati dell'utente):

1. **Gate statici**: `npm run typecheck` (che include `tsconfig.test.json`), `npm run lint`, `npm run build`. È la prova primaria che non resti un lettore: ogni campo tolto dal DTO o ogni import verso un file eliminato rompe la compilazione.
2. **Migrazione su copia**: copiare `gioco.db` + `partite.db` nella cartella di lavoro della sessione (non in `data/`), aprire con lo stesso codice di `initDb` e `runMigrations` in uno script a parte (`DATA_DIR` verso la copia), poi confrontare:
   - **prima/dopo B8**: §3.6;
   - **prima/dopo B9**: tabelle sparite (`mappa_entita`, `guida_mappa`, `organizzazione_mappa_esito`), colonne sparite (`mappa.entita_*`, `mappa_presentazione.gruppo_immagini_json`), `mappa` 316, `mappa_presentazione` 226, sentinelle identiche, `dati_guida` +2 blocchi (32), `archivio-legami-e-presentazione-mappe-l11` con `gruppi_immagini` 22 e `guida_mappa` 4, `foreign_key_check` vuoto, `integrity_check` ok;
   - **partite**: `partite.db` non cambia (B8/B9 non lo toccano): impronta di tutte le tabelle e `user_version` utente 30 invariati.
3. **Impronte di riferimento sulla copia `sim-142b` (gioco 146)** — righe:hash (primi 16 esadecimali di SHA-256 su `JSON.stringify(riga)+"\n"` nell'ordine indicato): `mappa` residua `316 84b35ec8687a1663` (senza `versione_*`: `316 037b07eb9e833e85`), `mappa_presentazione` (contesti) `226 8cbe4e272e19ac80`, `spillo` `1911 ba38586e1dde0601`, `spillo_voce` `542 38ee8974438d154f`, `punto_interesse` `960 8c3a90ef28325d30`, `infiltrazione_area` `105 cdc139bfea703388`, `area` `140 51366e9cd9fe3507`, `luogo` `109 4872d8cb72c7791e`, `guida_alias` `92 eca16ddedaeeb45c`, `pianta_quartiere` `22 c967af0905676496`, `cestino` (id,uid,tipo,chiave,eliminato_il,lunghezza registro) `8 f2dd62abe7c45fb0`; partite: `spillo_partita` `797 2ecb7dd5eabc2ade`, `punto_partita` `564 636da9e03a252a40`. Valgono **solo per questa copia**; su un'altra base si rifanno con le stesse query. Gli script `impronta-mondo.cjs` e `impronta-lotto.cjs` (che selezionano colonne per nome e quindi non vedono le colonne tolte) stanno **nello scratchpad delle sessioni, non nel repository**: vanno passati all'implementatore o ricreati.
4. **Confronto dell'output dell'API prima/dopo (sola lettura, su copia)**: script che chiama le funzioni esistenti (`elencaMappe`, `dettaglioMappa` per ogni mappa, `contenutiMappa` per ogni mappa, `risolviAccessoMondo` per ogni quartiere, dungeon e luogo, `dettaglioQuartiere`, `dettaglioDungeon`, `dettaglioLuogo`) con il codice **prima** sulla copia non migrata e con il codice **dopo** sulla copia migrata, e confronta il JSON. Differenze **attese e uniche**: campi tolti (`entita`, `gruppoImmagini`, `marcatore`, `note` dell'area della guida, `posizioneDaCollocare`), campi aggiunti (`radiceDi`, `versione`), i **5 titoli** di stanza (§4.3), le **destinazioni di accesso di 19 luoghi** con Area e senza pin se si adotta D4, le **versioni insieme nel visore**. Qualsiasi altra differenza è un difetto.
5. **Prova della base vecchia** (la più importante, vedi limite L3): copiare `pacchetto/gioco.db` (versione 93) fuori dal repository, applicare 94→N+1 con il codice nuovo e leggere il log delle migrazioni B8/B9 (`archiviate`): atteso che le guardie archivino ciò che non è coperto senza far fallire l'avvio.
6. **Congelamento**: migrare un file vuoto (da zero) e la base v93 con il codice prima e dopo il congelamento di 027/038/042/066/067; `sqlite_master` e impronte uguali.

---

## 8. Decisioni da confermare (default prudente + prova)

| # | Decisione | Default prudente | Cosa si perde / cosa no (prova) |
|---|---|---|---|
| **D1** (§8.5) | `pianta_quartiere`: tenere o portare l'URL su `immagine.origine_url` | **Tenere**, come fonte viva con motivo; la voce R11-02/8 si chiude «tenuta», nessuna migrazione | Tenendola non si perde nulla. Portarla su `origine_url` **perderebbe** pagina, fonte e licenza (oggi mostrate da `QuartierePage.tsx:255-259`): `origine_url` è NULL su 22/22 immagini `citta-<q>` (E4), quindi l'URL oggi vive solo lì |
| **D2** (§8.7a) | `marcatore_mappa`: 148 marcatori su voci senza pin alimentano la «posizione da collocare» che il FE non mostra | **Si tolgono**; la posizione resta sulle schede `spillo`; si tolgono `PuntoInteresseDto.marcatore` e `posizioneDaCollocare` | **Non si perde nulla**: 149/149 marcatori hanno una scheda `spillo` con la stessa posizione (E1); nessun lettore FE. L'archivio prende i marcatori non ripetuti da una scheda (0 oggi). Si perderebbe solo la capacità di mostrare la «posizione da collocare» di una voce **se** un blocco successivo eliminasse anche le schede senza mappa (150+4): da decidere lì |
| **D3** (§8.7b) | DDL utente (`schemaUtente.ts`) | **Lasciarlo come DDL storico di 001 con un commento** («fotografia della 001: lo schema vivo è dato dalle migrazioni»); B8/B9 non lo toccano | Nessuna tabella utente referenzia le fonti di B8/B9 (verificato su `sqlite_master` utente); «allinearlo» modificherebbe una migrazione già applicata (`preparazione` §7.6) |
| **D4** | Sorte dei **4 legami non-area** di `mappa_entita` (luogo 3, quartiere 1) | quartiere: **si tolgono** (derivati da `citta-<q>`, 24/24). luogo: **si sostituiscono con la planimetria predefinita dell'Area del luogo** nella ricerca di accesso (`accessoMondoService.ts:141-143`); si toglie la regola d'avvio `collegaLuoghiAllePlanimetrie` | Le 3 righe sono `luogo.area_chiave = mappa.area_chiave` e la mappa è la predefinita dell'Area (3/3, E9): **nessuna perdita**. **Effetto collaterale da confermare**: 21 luoghi hanno un'Area e nessun pin; 2 dei 3 legami sono fra loro, gli altri **19** oggi ripiegano sulla mappa del quartiere (`posto-dichiarato`) e con la regola nuova porterebbero alla planimetria della loro Area. Se non si vuole l'estensione, l'unica alternativa è tenere le 3 righe in una tabella ridotta (schema non pulito) |
| **D5** | Gli 8 fogli dei Memento che hanno un gruppo | Etichetta e ordine passano su `mappa.versione_*`; l'id e il nome del gruppo si **archiviano** e non servono (il nome di ogni foglio contiene già «Memento - aree fisse — Strutture che i Memento riusano — <etichetta>») | Si perde la striscia di miniature di quel gruppo nel visore (resta il selettore delle sorelle, `MappaPage.tsx:516`); non sono raggiungibili dall'indice (`RADICI_MEMENTO`) |
| **D6** | Le tre rotte vecchie `PUT /api/mappe/:k/aree\|presentazione\|stanza` e l'ingresso `entita` | Restano le versioni **sull'Area**; per le mappe senza Area rispondono **409 `mappa-senza-area`**; si eliminano le tre funzioni di ripiego (`impostaAreeMappa`, `aggiornaPresentazioneMappa`, `impostaStanzaMappa`) e i loro helper; `entita` ammessa solo `{tipo:'area'}`. Proporre al PM di metterle nell'elenco B7 (rotte orfane): **nessun consumatore FE** (`src/services/api/mappe.ts:39-46` senza chiamanti) | Si perde la modifica dei gruppi dei soli Memento (impossibile da FE) e l'`entita` di tipo `quartiere`/`luogo`/`dungeon` scritta dall'API (nessun client la usa). Le descrizioni OpenAPI vanno aggiornate (`openapi.test.ts` vuole 1:1 rotte↔descrizioni) |
| **D7** | `pianta_area` | **Archivio + drop** (84 righe in `dati_guida`) | Si conservano URL, pagina, fonte, licenza, alternative: nulla si perde. Alternativa (solo drop) perde la provenienza di 81 piante (solo 3 URL sono in `immagine.origine_url`) |
| **D8** | `organizzazione_mappa_esito` | **Drop in B9** (0 righe, scritta solo da `riconciliaAreeGuida`) | Nessuna perdita. È nell'elenco di `modifiche.md` §1.1 punto 2 ma **non ha una voce atomica**: chiedere al PM dove assegnarla (B9 è il posto naturale) |
| **D9** | Tecnica | `ALTER TABLE … DROP COLUMN` (precedenti 089, 099; funziona sul DDL reale) invece della ricostruzione della tabella | Nessuna; evita di riscrivere `mappa` e le sue FK |
| **D10** | Titoli di 5 planimetrie e visore | Accettare che il titolo della stanza sia `area.nome` e che il visore raggruppi per Area (§4.3) | Cambia l'aspetto di 5 titoli e mostra anche le 62 versioni prima sciolte: è la regola di L2/L3 («l'Area è la stanza»), da dichiarare all'utente |

---

## 9. Ordine dei passi e file condivisi con altri blocchi

**Serializzazione**: B7 (rotte orfane) → **B8** → B5 → **B9**. B8 e B9 non si sovrappongono nello stesso file di servizio (`dungeonService`/`contenutiGuidaService` per B8; `mappeService`/`casaMappa`/`accessoMondoService`… per B9) ma **condividono** `shared/types.ts` e il registro delle migrazioni: un proprietario alla volta.

B8
1. Codice BE: `dungeonService.ts`, `contenutiGuidaService.ts` (solo `vociDelPalazzo`), `luoghiScritture.ts`, `luoghiService.ts`, commento di `cittaService.ts`.
2. DTO: `types.ts:1775, :2203`, `organizzazioneMappe.ts:26-27`; testi OpenAPI (`compendio.ts:286,374,519,525,531`).
3. Test: solo compilazione (§6).
4. Migrazione B8 + registrazione in `index.ts` (§3.5).
5. Gate: typecheck, lint, build; prova su copia (§3.6, §7).

B9 (dopo B5 e dopo B8)
1. Estrarre `riallineaSpilliLuoghi`; creare `congelati/` e riagganciare gli import di 027, 038, 042, 066, 067; togliere `collegaLuoghiAllePlanimetrie` da `regoleAllAvvio`; eliminare `sincronizzaMappe.ts`/`organizzazioneMappe.ts` solo quando i test sono riagganciati. **Checkpoint**: migrazione da zero e dalla base v93 identiche al codice di prima.
2. `entitaDellaRadice`/`radiceDelQuartiere` in `alberoMappe.ts`; porting dei lettori (§4.1 punti 1-15) **mentre le colonne esistono ancora**: il codice deve funzionare su entrambi gli schemi. **Checkpoint**: confronto dell'output dell'API (§7.4).
3. Gruppo→Area/versione (§4.3), `guida_mappa` (§4.4), scrittori (§4.1 punti 16-23), import/export (§4.10).
4. DTO e FE (§4.8, §4.9); test per compilare.
5. Migrazione B9 + registrazione; gate; prova su copia, sulla base v93 e sul congelamento.

**File condivisi** (un solo proprietario alla volta)
- `shared/types.ts`: B3/B4 (DTO ricerca), B5 (`NodoGerarchiaDto`), B7, B8 (2 campi), B9 (6 punti), B10, B11. Oggi ha già modifiche non committate di altre sessioni: leggerlo fresco prima di editare.
- `server/db/migrations/index.ts`: B8, B9 e L8/L9/L10 in parallelo (oggi con modifiche non committate): un solo `import` + una voce per migrazione, **numero al momento della scrittura**.
- `server/routes/mappe.ts`, `server/schemas/mappe.ts`, `server/openapi/descrizioni/mappe.ts` (e `compendio.ts` per B8): B3, B5, B7, B9. `openapi.test.ts:36` vuole 1:1 rotte↔descrizioni.
- `server/services/cestinoService.ts`: **B8/B9 non lo modificano**; lo cambia B10 (motivi `colonna-rimossa`/`tabella-rimossa`, elenco storico delle etichette). B10 deve sapere che le tabelle tolte da B8/B9 sono: `marcatore_mappa`, `marcatore_luogo`, `pianta_area`, `mappa_entita`, `guida_mappa`, `organizzazione_mappa_esito`; le colonne: `mappa.entita_tipo`, `mappa.entita_chiave`, `mappa_presentazione.gruppo_immagini_json`.
- `server/services/pacchetto/pacchettoGioco.ts`: B9 (`regoleAllAvvio`, import) e B10 (`caricaPacchetto`/`ricaricaPacchetto`, riepilogo degli scarti): serializzare.
- `server/services/pacchettoGiocoService.ts`: B8/B9 **non lo toccano** (nessuna riga di `RIFERIMENTI_PARTITE`).
- `server/services/mappe/mappeService.ts`, `dungeonService.ts`, `contenutiGuidaService.ts`, `luoghiService.ts`: B5, B8, B9 (conflitto alto: B8 → B9).
- FE: `MappaPage.tsx` (B5 riscrive `IndiceMappe` e `radiciRaggruppate`, `:69`, `:157`, `:286-287`; B9 tocca `:366,:516,:528,:530`), `EditorMappaPage.tsx`, `AlberoLuoghi.tsx` (B5 lo toglie).

---

## 10. Rischi

1. **Lavoro dell'utente da preservare** (R11-21). Nessuna delle otto fonti contiene lavoro `origine='utente'` che il dato nuovo non ripeta: `marcatore_*` 0 `utente`; `mappa.entita_*` e `mappa_entita` sulle mappe/legami `utente` (69 e 66) sono tutti coperti da `infiltrazione_area`/convenzione delle radici (E5–E10); `gruppo_immagini_json` di 42 mappe `utente`: le modifiche successive dell'utente sono **già** in `area`/`versione_*` (è il dato nuovo a vincere). Le impronte di diario, Kamoshida e Madarame non sono toccate: le migrazioni non scrivono in `punto_interesse`, `spillo`, `spillo_voce`, `voce_giornata` (sentinelle).
2. **Lettori nascosti**: i grep non vedono `SELECT *` né nomi di colonna costruiti a runtime. Le righe di `mappa` si leggono con `SELECT *` in più punti (`areeService.ts:270`, `fotografiaLuogoDaPin`, `precondizioneRaccordoPin`): un campo letto per nome da quei risultati rompe il typecheck, un campo letto dinamicamente no. Mitigazione: il confronto dell'output dell'API (§7.4) e la prova della base v93.
3. **Base vecchia (v93)**: al primo avvio le migrazioni 94→N+1 girano sui dati del pacchetto iniziale, con cifre diverse da quelle misurate (187 marcatori, 107 piante, 91 `mappa_entita`, 116 `guida_mappa`, 227 gruppi) e **prima** che esistano `area`/`infiltrazione_area` (le crea 109/110, prima della N). Le guardie sono tolleranti (archiviano), ma **non ho potuto eseguirle** su quella base: da fare prima di chiudere (limite L3).
4. **Migrazioni vecchie che importano servizi vivi**: eliminare `sincronizzaMappe.ts`/`organizzazioneMappe.ts` senza la copia congelata fa fallire la 027/042 su una base vecchia; il congelamento di 027 importa ancora i condivisi di `shared/` (non congelati).
5. **Regola d'avvio**: togliere `collegaLuoghiAllePlanimetrie` da `regoleAllAvvio` è necessario (altrimenti scriverebbe in una tabella inesistente: la guardia `tabelle.includes('mappa_entita')` la farebbe tornare 0, ma la regola resterebbe fantasma); `riallineaSpilliLuoghi` deve invece restare **viva** a ogni avvio e dopo ogni import.
6. **Import dei pacchetti di mappe di prima**: il riempimento di `areeDaLegare` sotto `if (conEntita)` (`mappeService.ts:2227`) va reso incondizionato (§4.10), altrimenti la compatibilità cade **in silenzio**.
7. **Test rossi a runtime** (§6) senza poterli eseguire: la decisione del 24/10 e `R11-04` vanno riconciliate dall'utente.
8. **Cestino**: elementi eliminati fra la misura e la migrazione possono citare le tabelle tolte; il ripristino salta quelle righe senza errore (e B10 dovrà dirlo). Il raccordo `precondizioneRaccordoPin` esige che ogni tabella dei registri esista: fallirebbe su un registro vecchio che le cita (oggi nessuno).
9. **Archivi nel DB**: due blocchi nuovi di `dati_guida` (63 KB e 5 KB); vanno dichiarati «di archivio, con motivo» nell'inventario di B1; compaiono nell'export del file.
10. **Migrazioni fatali all'avvio**: un `errore()` della migrazione blocca l'avvio (`runMigrations` è fatale): è voluto (nessuna modifica parziale), ma richiede la prova su copia **prima** del rilascio; la via di ritorno è la copia di avvio (`data/backups`, `runBootBackup`).
11. **Strumenti di verifica fuori dal repository**: `impronta-mondo.cjs`, `impronta-lotto.cjs`, la copia `sim-142b` stanno nello scratchpad delle sessioni; B21 deve ricrearli.
12. **Repo pubblico**: questo documento non cita nomi di utente, di partite né indirizzi; le copie e gli script di misura non vanno committati.

## 11. Limiti

- **L1** Misure su `sim-142b` (p5s portata a gioco 146, partite a 30): conteggi e cestino possono essere cambiati con il lavoro dell'utente e con le migrazioni 147–171 (che non toccano queste tabelle: verificato per 164–171 e per l'elenco dei file che le citano).
- **L2** Grep per nome di tabella/colonna: non vedono `SELECT *` né nomi dinamici; «0 lettori» = nessun riferimento per nome nel codice non di test. Le righe `file:riga` sono del 24/10 con modifiche non committate di altre sessioni nello stesso worktree (per i file di B8/B9 `git diff` rispetto a `2446650e` non mostra modifiche; `shared/types.ts` sì, ha già spostato le righe di circa 26): cercare per simbolo.
- **L3** **Non** ho eseguito le migrazioni sulla base v93 né il codice dell'applicazione (nessun typecheck, lint, build, nessun test): la prova a secco è in RAM sulla copia a gioco 146, con le sole query SQL delle due migrazioni, non con il codice TypeScript scritto qui sopra. Il testo delle migrazioni è stato scritto sul modello della 160 ma **non compilato**.
- **L4** Non ho verificato che le tre rotte vecchie (`/aree`, `/presentazione`, `/stanza`) e `GET /spilli/:id/precondizione-raccordo` non siano chiamate da script esterni al frontend (solo FE e test).
- **L5** Il congelamento copia il codice di migrazione ma non quello di `shared/` che esso usa (`spilloPerPunto`, `categoriaSpillo`, `spilloPerLuogo`, `leggiCondizioniSalvate`): per una base anteriore alla versione 27 il comportamento potrebbe divergere se quei condivisi cambiassero; il pacchetto iniziale è alla 93, quindi nella pratica la 027 non rigira.
- **L6** Non ho letto per intero i requisiti di L2–L10 né i test; l'elenco dei test da toccare (§6) è una stima da grep.
- **L7** Non ho aperto `data/` del worktree. Ho usato script di sola lettura/in memoria nella cartella di lavoro della sessione (`q.cjs`, `q2.cjs`, `prova-b8b9.cjs`) e una copia di `pacchetto/gioco.db` fuori dal repository; nessun file nel repository tranne questo.
