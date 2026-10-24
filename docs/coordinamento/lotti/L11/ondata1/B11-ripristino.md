# B11 «Modifica / Ripristina senza dipendenze» — scheda di implementazione

Analisi di sola lettura, 2026-10-24, ramo `newreview`. Per l'implementatore Sonnet del blocco B11 del lotto L11 (voci R11-15/5, 15/6, 15/8, 15/9, 15/10, 15/11, 15/12).
Niente codice scritto, niente test, niente commit.

Metodo: `CLAUDE.md`, `lotti/L11/{requisiti,modifiche,preparazione-2026-10-23}.md` letti; codice letto riga per riga nei file citati
(servizi, rotte, pagine FE, moduli del catalogo, OpenAPI, migrazioni di riferimento); dati misurati in sola lettura su una copia di gioco a
versione 146 nello scratchpad della sessione (24 quartieri, 53 trofei, 5 Doti con 25 ranghi, blocchi `dati_guida` `personaggi`, `sfide`,
`completamento`, `oggetti-guida`, `jose`). Le righe `file:riga` sono quelle lette oggi nel worktree. Dove non ho letto scrivo «da verificare».
Nota di versione: il worktree ha già migrazioni di gioco fino alla 167 (non alla 153): il numero della nuova migrazione NON si riserva, si
prende il primo libero al momento del commit (`server/db/migrations/index.ts:183`, `index.test.ts` vuole id consecutivi).

---

## 1. Esito in breve

- **Nessuna delle sette voci è già soddisfatta per intero.** Due sono parziali con prova (Oggetti, ranghi delle Doti); cinque sono da fare.
- Il meccanismo «Ripristina» che esiste oggi (`origine` + `seed_json` su tabelle) va bene per i dati che stanno in **righe** (quartieri, trofei,
  Doti) e non è applicabile ai dati che stanno in **blocchi JSON di `dati_guida`** (personaggi, sfide, completamento, e i testi di fabbricazione,
  armi, abiti e Jose dentro `oggetti-guida`/`jose`): per questi si raccomanda la tabella `correzione_dati_guida` per percorso (§3.4, alternative §3.11).
- Un solo servizio (`server/services/ripristinoService.ts`) con un registro dichiarativo di «oggetti modificabili», **una** famiglia di rotte
  (`/api/correzioni`, 4 rotte, un nuovo file di router, quindi nessun conflitto con `routes/compendio.ts` di L8) e **un** componente FE
  (`ModificaGuida`) che si monta nelle sette pagine.
- Tre trappole da conoscere prima di scrivere (dettaglio nei rischi): (1) il nome di un quartiere ha copie in `mappa.nome` e nei nomi dei
  percorsi: la correzione deve propagarsi; (2) alcuni campi dei blocchi sono **chiavi** di altre tabelle (`attrezzo` delle ricette, `nome` dei
  premi del Covo, `chiave` di personaggi e sfide): non si rendono modificabili; (3) i nomi delle Doti e dei ranghi oggi si leggono dalla tabella
  `traduzione`, con un «Ripristina» che legge il pacchetto del repository: va portata una sola fonte (decisione D2).

---

## 2. Tabella delle voci

| Voce | Dominio | Stato oggi | Prova di oggi / modifica precisa |
|---|---|---|---|
| **R11-15/5** | Oggetti | **PARZIALE** | Già soddisfatto: identità del catalogo (Modifica + Ripristina), offerte e scambi (nel negozio), note storiche, costo del regalo G-034. Da fare: testi di fabbricazione, personalizzazione armi, abiti (introduzione, lavanderia, «dove»), blocco Jose (via `correzione_dati_guida`); frase «Creato da te» per gli oggetti nati nell'app; FE dei legami delle ricette; `trasformazione_oggetto` (8 righe) senza scrittura. «Tesori» (`tesoro`, `tesoro_modificatore`) non è degli Oggetti ma di R11-15/3 → B17 dopo L8. Dettaglio §4.1 |
| **R11-15/6** | Città | **DA FARE** | `nome` e `descrizione` del quartiere non hanno scrittori (`cittaService.ts:85-99` scrive solo `condizioni_json`; `routes/compendio.ts:215-235` solo ingresso e sblocco). Già a posto: sblocco (Modifica + Ripristina, `QuartierePage.tsx:58-82`, `cittaService.ts:85-99`) e ingresso (`routes/compendio.ts:215,217`, nessun valore della guida: Ripristina non compare). Modifica: colonne `origine/seed_json/updated_at` su `quartiere`, tipo `quartiere` nel registro, propagazione a `mappa.nome`. §4.2 |
| **R11-15/8** | Personaggi | **DA FARE** | `routes/compendio.ts:126-130` solo GET su `datiGuida('personaggi')`; `PersonaggiPage.tsx:27-66` senza gesti di modifica del testo (`ImmagineEntita … modificabile` riguarda solo l'immagine, righe 37-38). Modifica: blocco `personaggi` con `correzione_dati_guida`, tipi `personaggio` e `gruppo-personaggi`; coordinare con L8 B2 sul campo `persona` (escluso). §4.3 |
| **R11-15/9** | Sfide | **DA FARE** | `sfideService.ts:8-16` sola lettura; `SfidePage.tsx:34,61,91,110` sezioni senza modulo. Modifica: blocco `sfide`, 8 tipi. §4.4 |
| **R11-15/10** | Trofei | **DA FARE** | tabella `trofeo` senza `origine/seed_json` (`migrations/019_trofei.ts:17-28`); nessun `UPDATE trofeo` fuori dalle migrazioni; `completamentoService.ts:17-36` sola lettura. Modifica: colonne + tipo `trofeo`. §4.5 |
| **R11-15/11** | Completamento | **DA FARE** | `completamentoService.ts:26-36` e `CompletamentoPage.tsx:155-201`, `CovoPage.tsx:122-168` sola lettura. Modifica: blocco `completamento`, 9 tipi. §4.6 |
| **R11-15/12** | Ranghi delle Doti | **PARZIALE** | Nomi di Dote e di rango modificabili solo da Impostazioni › Traduzioni (`TraduzioniEditor.tsx:7,43`, `routes/traduzioni.ts:21-27`), con Ripristina che legge il pacchetto del repository (`traduzioniService.ts:117,128-137`); soglie (`dote_sociale_rango.soglia`) non modificabili (nessun `UPDATE dote_sociale*`). Modifica: tipo `dote` (nome, 5 ranghi con nome e soglia), lettura dei nomi dalla colonna (D2), pencil in `DotiSociali.tsx:160-189`. §4.7 |

Voci già soddisfatte per intero: **nessuna**. Prove parziali con `file:riga` nelle schede e nell'elenco di verifica (§5).

---

## 3. Disegno unico

### 3.1 Principi (dal codice e dalle regole del repository)

1. **Un punto di modifica, letto ovunque** (memoria «Un punto di modifica»): le correzioni cambiano il dato che i servizi già leggono; non nascono pannelli
   di revisione, tabelle di proposte, conferme (memoria «Consolidare, non scaricare», BON-11).
2. **Valore della guida = il valore che il DB aveva prima della prima correzione** (regola dei dati del 21/10: la fonte è il DB dell'istanza).
   Niente ricarica dal pacchetto del repository.
3. **Ripristina non elimina mai**: rimette il valore della guida; per un oggetto nato nell'app («Creato da te») Ripristina non compare e la scheda lo dice
   (requisiti.md, caso dubbio 5). Oggi solo `ModuloCatalogo.tsx:188` lo dice («Riga aggiunta da te.»).
4. **Campi nuovi dei DTO sempre opzionali** (`?:`): i test esistenti costruiscono DTO letterali e `npm run typecheck` (`tsc -b tsconfig.full.json`) include `tsconfig.test.json`.

### 3.2 Due modalità nello stesso servizio

| Modalità | Per quali dati | Dove sta la correzione | Dove sta il valore della guida | Chi legge |
|---|---|---|---|---|
| **riga** | `quartiere`, `trofeo`, `dote_sociale` (+ `dote_sociale_rango`), `trasformazione_oggetto` | **nella colonna stessa** (UPDATE sul posto): i servizi non cambiano | `seed_json` della riga (fotografia dei soli campi registrati alla prima correzione), `origine = 'utente'` | tutti gli SQL esistenti (`FROM quartiere`, `FROM trofeo`, …) |
| **blocco** | `dati_guida`: `personaggi`, `sfide`, `completamento`, `oggetti-guida`, `jose` | in `correzione_dati_guida`, **sopra** il blocco, che non si riscrive mai | il blocco stesso (`dati_guida.json`) | i servizi di lettura passati a `datiGuidaCorretti()` (§3.6) |

Il pattern «riga» è quello di `luogo`/`libro`/`area`/`dungeon` (`catalogoService.ts:515`, `areeService.ts:412-455`, `dungeonService.ts:527-573`):
modificata = `origine = 'utente' AND seed_json IS NOT NULL`. Ripristina rimette `seed_json` e, se tutti i campi tornano uguali alla fotografia,
azzera `seed_json` e rimette `origine = 'seed'`.

### 3.3 Migrazione (testo DDL; il numero è il primo libero al commit)

File `server/db/migrations/<N>_correzioni_guida.ts`, registrata in `server/db/migrations/index.ts` (import + array `migrations`, riga 183). Idempotente, nessun dato
di gioco cambia salvo il punto D2 (Doti):

```ts
export const migrationN: Migration = {
  id: N, name: 'correzioni_guida',
  up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS main.correzione_dati_guida (
      blocco      TEXT NOT NULL,   -- chiave di dati_guida: 'personaggi' | 'sfide' | 'completamento' | 'oggetti-guida' | 'jose'
      percorso    TEXT NOT NULL,   -- vedi §3.4, es. 'personaggi/[chiave=joker]/armi/mischia'
      valore_json TEXT NOT NULL,   -- il valore scritto dall'utente (JSON)
      guida_json  TEXT NOT NULL,   -- il valore del blocco alla prima correzione (JSON; 'null' se non c'era)
      updated_at  TEXT NOT NULL,
      PRIMARY KEY (blocco, percorso)
    ) WITHOUT ROWID`);
    db.exec('CREATE INDEX IF NOT EXISTS main.correzione_dati_guida_blocco ON correzione_dati_guida (blocco)');
    for (const t of ['quartiere', 'trofeo', 'dote_sociale', 'trasformazione_oggetto']) {
      if (!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type='table' AND name=?").get(t)) continue;
      const col = (db.prepare(`PRAGMA main.table_info(${t})`).all() as Array<{ name: string }>).map((c) => c.name);
      if (!col.includes('origine')) db.exec(`ALTER TABLE main.${t} ADD COLUMN origine TEXT NOT NULL DEFAULT 'seed' CHECK (origine IN ('seed','utente'))`);
      if (!col.includes('seed_json')) db.exec(`ALTER TABLE main.${t} ADD COLUMN seed_json TEXT`);
      if (!col.includes('updated_at')) db.exec(`ALTER TABLE main.${t} ADD COLUMN updated_at TEXT`);
    }
    // solo se D2 = (A): i nomi delle Doti e dei ranghi passano alla colonna, e le 30 righe di `traduzione` si tolgono (vedi §4.7)
  },
};
```

Idiomi presi da `112_voce_boss_finale.ts` (controllo `PRAGMA table_info` prima di `ALTER`) e `035_catalogo_utente.ts`/`051_catalogo_utente_esteso.ts`
(`origine ... DEFAULT 'seed'`). `ALTER TABLE ADD COLUMN ... NOT NULL DEFAULT 'seed' CHECK(...)` è ammesso da SQLite (default costante). Nessuna ricostruzione di
tabella. Il runner (`migrationRunner.ts`) applica la migrazione dentro una transazione col controllo delle chiavi esterne prima/dopo. Nessuna migrazione utente (`partite.db` non cambia).

### 3.4 Percorso nei blocchi e algoritmo di lettura

**Grammatica** (una stringa, segmenti separati da `/`):
- proprietà: `armi`, `mischia` (identificatore `[A-Za-z][A-Za-z0-9]*`);
- elemento di un array scelto per un campo-selettore: `[campo=valore]` con `valore` codificato con `encodeURIComponent` (es. `[nome=Gelo%20Totale]`);
- il valore finale è un **valore scalare** (stringa, numero, booleano, null) o un **array di stringhe** (sostituito per intero).

Esempi: `personaggi/[chiave=joker]/armi/mischia`; `sfide/battaglieSfida/elenco/[chiave=…]/regole`; `completamento/covo/premi/[nome=…]/costo`;
`oggetti-guida/abiti/elenco/[nome=…]/dove`; `jose/timbri/descrizione`.

**Regola sui selettori**: si usa sempre un campo che nessun altro servizio riscrive. **Mai `catalogoChiave`** nei blocchi di oggetti:
`trasferisciFontiCatalogo` la riscrive nel blocco quando un oggetto viene eliminato o fuso (`catalogoOggettiRiferimenti.ts:11-18`); per gli abiti il selettore è il `nome` della guida,
ed è il server a risolverlo dalla `chiave` del catalogo che il FE conosce (registro: `risolviSelettore`).

**Funzioni pure** in un nuovo `shared/percorsoGuida.ts` (nessuna dipendenza, importabile dal server e dagli script di verifica):
`analizzaPercorso(p): Segmento[]`, `risolvi(base, segmenti): { trovato: boolean; valore: unknown; puntatore: Array<string | number> }`,
`impostaImmutabile(base, puntatore, valore): unknown`, `uguali(a, b): boolean` (confronto JSON profondo).

**`datiGuidaCorretti<T>(chiave)`** in `server/services/datiGuida.ts` (accanto a `datiGuida`, riga 38; stessa cache, stessa invalidazione):
1. `base = datiGuida(chiave)`; se non ci sono righe in `correzione_dati_guida` per il blocco (o la tabella manca: uno schema di prima della migrazione) **restituisce `base`
   stesso** (stesso oggetto: nessun cambio di comportamento dove non c'è correzione);
2. altrimenti, per ogni correzione in ordine di `percorso`: **risolve il percorso sulla base** (non sul risultato parziale: così una correzione del campo-selettore, per
   esempio `…/[nome=A]/nome`, non rompe le altre correzioni dello stesso elemento), ottiene un puntatore a indici, e applica il valore sul clone;
3. salta (e conta come «orfana») una correzione il cui percorso non si risolve più o il cui valore ha un tipo diverso da quello della guida (`typeof`/`Array.isArray`):
   significa che il blocco è cambiato sotto la correzione (per esempio L8 B2 sul campo `persona`); non si cancella mai in silenzio;
4. congela in profondità (stessa `congela` del file) e mette in cache; la cache si svuota nella funzione già registrata da `invalidaDatiGuida` (riga 63): ogni scrittura
   del servizio chiama `invalidaCacheDiGioco()` (`cacheDiGioco.ts:26`), quindi anche chi scrive da fuori (`atterraggioPalazziService.ts:117,129`, `dungeonService.ts:625`) la svuota.

`bloccoGuidaDi` (usato dalle migrazioni, `datiGuida.ts:50`) **non** applica correzioni: le migrazioni lavorano sul blocco della guida.

### 3.5 `server/services/ripristinoService.ts`

Un solo file pubblico (le definizioni possono stare in `server/services/ripristino/registro.ts`, ma l'API è questa):

```ts
export const TIPI_MODIFICABILI = [ /* §3.12 */ ] as const;
export type TipoModificabile = (typeof TIPI_MODIFICABILI)[number];

/** Elenco delle sole correzioni attive (riga con seed_json + righe di correzione_dati_guida), per tipo se indicato; le orfane segnate. */
export function elencaCorrezioni(tipo?: TipoModificabile): RiepilogoCorrezioneDto[];
/** La scheda di modifica: campi con valore attuale, valore della guida e `modificato` per campo. 404 tipo-non-modificabile / elemento-della-guida-non-trovato. */
export function schedaCorrezione(tipo: TipoModificabile, chiave: string): SchedaCorrezioneDto;
/** Corregge i soli campi inviati (chiave = `percorso` del campo). Un valore uguale a quello della guida toglie la correzione di quel campo. */
export function correggi(tipo: TipoModificabile, chiave: string, campi: Record<string, unknown>): SchedaCorrezioneDto;
/** Rimette il valore della guida: per tutti i campi dell'oggetto, o solo per `campi`. 409 nessuna-correzione se non c'è niente da rimettere. */
export function ripristina(tipo: TipoModificabile, chiave: string, campi?: string[]): EsitoRipristinoDto;
```

**Funzionamento di `correggi`** (tutto in `getDb().transaction(...)`, poi `invalidaCacheDiGioco()`):
1. `def = definizione(tipo)`; valida ogni campo contro il registro (nome del percorso ammesso, tipo, lunghezza, nullable, enumerazioni): 400 `campo-non-modificabile` / `valore-non-valido`; `def.valida?.(chiave, valoriFusi)` per gli invarianti (soglie delle Doti, §4.7).
2. **riga**: legge la riga (404 se manca); alla prima correzione (`seed_json IS NULL AND origine = 'seed'`) salva `seed_json = JSON.stringify(fotografia dei campi registrati)`; `UPDATE` dei soli campi cambiati; `origine = 'utente'`, `updated_at = nowIso()`; propagazioni del tipo (`def.propaga`, es. `mappa.nome` del quartiere); se dopo l'UPDATE tutti i campi coincidono con la fotografia → `seed_json = NULL, origine = 'seed'`.
3. **blocco**: per ogni campo, `risolvi(base, percorso)` (404 `elemento-della-guida-non-trovato` se non c'è); se il valore coincide con la guida → `DELETE` della riga di correzione; altrimenti `INSERT … ON CONFLICT(blocco, percorso) DO UPDATE SET valore_json, updated_at` **lasciando intatto `guida_json`** della prima correzione.
4. Risponde con `schedaCorrezione(tipo, chiave)`.

**Funzionamento di `ripristina`**: stessa transazione. **riga**: rimette i campi della fotografia (tutti o i richiesti), con i controlli del tipo (per `trasformazione`: i due oggetti del catalogo devono esistere ancora, altrimenti 409 `oggetto-originale-mancante`, già usato in `catalogoService.ts:620`); azzera `seed_json` se la riga è tornata identica. **blocco**: `DELETE FROM correzione_dati_guida WHERE blocco = ? AND percorso IN (…)` (il valore della guida è il blocco, che non è mai stato toccato).

**Cestino**: **non serve**, in linea con tutti i «Ripristina» esistenti (`catalogoService.ts:578`, `areeService.ts:450`, `dungeonService.ts:564`, `noteStoricheService.ts:60-71`): non si elimina un oggetto, si sostituisce un valore con quello della guida. Il valore dell'utente che si perde si mostra **prima** nella conferma del FE (D7). Nessun registro in `cestinoService.ts` (`ETICHETTE`, righe 105-120) da aggiornare: né i quartieri, né i trofei, né le Doti si eliminano da interfaccia.

**Concorrenza**: un solo utente; nessuna precondizione sul testo attuale (a differenza di `modificaNotaStorica`, che la chiede per un caso specifico). Si lascia così, salvo decisione contraria.

### 3.6 Lettori da passare a `datiGuidaCorretti` (e quelli da lasciare sulla guida)

| Blocco | Lettore | Riga | Azione |
|---|---|---|---|
| `personaggi` | `routes/compendio.ts` `router.get('/personaggi')` | 126-130 (la `datiGuida` a 127) | passa a `datiGuidaCorretti` (modifica di una riga + import: file condiviso, §7) |
| `personaggi` | `squadraService.ts` `giocabili()` | 30 | passa (il nome del Ladro nella squadra) |
| `personaggi` | `suggerimentiService.ts` `personaggiDiConfidente` | 153 | **resta** sulla guida (usa solo `chiave` e `confidente`, identità) |
| `sfide` | `sfideService.ts` `sfide()` | 8 | passa |
| `sfide` | `fontiRicompenseOggetti.ts` | 61 | passa (nome e ricompense mostrati come fonte di un oggetto) |
| `completamento` | `completamentoService.ts` `completamento()` | 28 | passa |
| `completamento` | `fontiRicompenseOggetti.ts` | 56 | passa (testo); la **chiave** `r.nome` dei premi del Covo resta quella della guida perché `nome` non è modificabile (§4.6) |
| `oggetti-guida` | `compendioService.ts` `oggettiGuida()` | 26 | passa |
| `oggetti-guida` | `fontiRicompenseOggetti.ts` | 50 | passa (effetto della ricetta); `attrezzo` non modificabile |
| `oggetti-guida` | `catalogoOggettiLetture.ts` | 107 (SQL grezzo) | **resta** (identità `catalogoChiave`) |
| `oggetti-guida` | `catalogoOggettiProposte.ts` `ricettaEsistente` | 47 | **resta** (cerca `attrezzo`) |
| `oggetti-guida`, `sfide`, … | `snapshotProposteOggetti.ts` | 21 (SQL grezzo) | **resta** (snapshot delle proposte sulla guida) |
| `jose` | `richiesteService.ts` | 61 | passa |

Verifica prima di chiudere: `grep -rn "datiGuida<\|datiGuida(" server shared --include=*.ts` (esclusi test e migrazioni) per controllare che non resti un lettore di
testo mostrato che salta la correzione.

### 3.7 Rotte (nuovo router, nuova area OpenAPI)

File nuovi: `server/routes/correzioni.ts`, `server/schemas/correzioni.ts`, `server/openapi/descrizioni/correzioni.ts`. Registrazioni in file condivisi (piccole, §7):
`server/routes/index.ts` (import + riga `['/api/correzioni', correzioniRouter]` in `ROUTER_DI_AREA`, riga 29), `server/openapi/descrizioni/index.ts` (voce in `AREE` riga 27 e `...DESCRIZIONI_CORREZIONI` in `DESCRIZIONI` riga 47).

| Rotta | Schema zod (`server/schemas/correzioni.ts`) | Risposta |
|---|---|---|
| `GET /api/correzioni` | query `{ tipo?: enum(TIPI_MODIFICABILI) }` `.strict()` | `RiepilogoCorrezioneDto[]` |
| `GET /api/correzioni/:tipo/:chiave` | params `{ tipo: enum, chiave: string.min(1).max(300) }` | `SchedaCorrezioneDto` |
| `PUT /api/correzioni/:tipo/:chiave` | params come sopra; body `{ campi: record(string.max(300), valore) }` `.strict()`, `valore = string.max(6000) \| number \| boolean \| null \| array(string.max(600)).max(60)` | `SchedaCorrezioneDto` |
| `POST /api/correzioni/:tipo/:chiave/ripristina` | params come sopra; body `{ campi?: array(string.max(300)).max(60) }` `.strict()` (il client invia `{}`) | `EsitoRipristinoDto` |

Le chiavi con `/` (es. `abito` per `catalogoChiave`) si inviano con `encodeURIComponent`, come fanno già i client del catalogo (Express decodifica i parametri).
Il tipo del campo si controlla nel servizio con il registro, non nello schema (lo schema è uguale per tutti i tipi).

**Descrizioni OpenAPI** (`openapi.test.ts:36` vuole 1:1 rotta↔descrizione, `:61` che ogni `…Dto` citato esista in `shared/`, `:67` che le scritture dichiarino il corpo, ultimo test che
ogni codice d'errore dichiarato compaia come letterale nel server): una voce per rotta con `sommario` (≤120 caratteri, senza punto finale), `descrizione` (≥20 caratteri),
`risposta` che cita `SchedaCorrezioneDto`/`RiepilogoCorrezioneDto`/`EsitoRipristinoDto`, e gli `errori` seguenti (tutti da scrivere come letterali nel servizio):
`[404,'tipo-non-modificabile']`, `[404,'elemento-della-guida-non-trovato']`, `[400,'campo-non-modificabile']`, `[400,'valore-non-valido']`, `[409,'nessuna-correzione']`,
`[409,'soglie-non-valide']`, `[409,'oggetto-originale-mancante']`, `[409,'guida-non-disponibile']` (blocco assente). Nessuna rotta è una GET che scrive: nessun `senzaProva`.
`AREE['/api/correzioni'] = { nome: 'Correzioni alla guida', descrizione: 'Modifica e ripristino dei dati della guida che non hanno una pagina di catalogo propria.' }`.

### 3.8 DTO in `shared/types.ts` (da aggiungere **in fondo**, per ridurre i conflitti)

```ts
export const TIPI_MODIFICABILI = ['quartiere','trofeo','dote','trasformazione',
  'personaggio','gruppo-personaggi','sfide-battaglie','battaglia-sfida','boss-segreto','sfide-magnate','magnate-sfida','tratto','sfide-tratti','sfide-quiz-tv',
  'finale','covo','covo-sfida','covo-premio','dlc','meteo','completamento-sezione',
  'fabbricazione','ricetta','armi','arma-effetto','arma-progressione','abiti','abito','jose'] as const;
export type TipoModificabile = (typeof TIPI_MODIFICABILI)[number];
export type TipoCampoCorrezione = 'testo' | 'testolungo' | 'numero' | 'booleano' | 'elenco' | 'scelta' | 'oggetto';
export type ValoreCampoCorrezione = string | number | boolean | null | string[];
export interface CampoCorrezioneDto {
  percorso: string;            // chiave del campo nel corpo della PUT e in `campi` del ripristino
  etichetta: string; gruppo?: string; aiuto?: string;
  tipo: TipoCampoCorrezione;
  nullable?: boolean; max?: number; min?: number;
  opzioni?: Array<{ chiave: string; nome: string }>;   // per 'scelta'
  valore: ValoreCampoCorrezione; valoreGuida: ValoreCampoCorrezione; modificato: boolean;
}
export interface SchedaCorrezioneDto {
  tipo: TipoModificabile; chiave: string; nome: string; modalita: 'riga' | 'blocco';
  campi: CampoCorrezioneDto[]; modificata: boolean;
  /** Percorsi la cui guida è cambiata dopo la correzione (guida_json ≠ valore attuale del blocco). */
  guidaCambiata: string[]; aggiornata: string | null; nota?: string | null;
}
export interface RiepilogoCorrezioneDto { tipo: TipoModificabile; chiave: string; nome: string; campi: string[]; aggiornata: string | null; orfana: boolean }
export interface EsitoRipristinoDto { tipo: TipoModificabile; chiave: string; campiRipristinati: string[]; scheda: SchedaCorrezioneDto }
```
Più i campi **opzionali** `modificato?: boolean` su `DoteSocialePartitaDto` (riga 622: per mostrare il pencil «corretta»), `TrofeoDto` (1143) e `QuartiereDettaglioDto` (1807) se la UI vuole il segno; per i blocchi
la scheda si legge all'apertura della finestra (come `CorreggiElemento`, `AzioniCatalogo.tsx:56-77`), senza aggiungere metadati alle risposte `res.json(dati)`.

### 3.9 Frontend

**Client**: `src/services/api/correzioni.ts` — `getCorrezioni(tipo?)`, `getSchedaCorrezione(tipo, chiave)`, `correggiGuida(tipo, chiave, campi)`, `ripristinaGuida(tipo, chiave, campi?)`; `export * from './correzioni'` in `src/services/api/index.ts` (accanto a riga 15). I tipi arrivano da `src/types.ts` (`export type * from '../shared/types'`).

**Componente**: `src/components/guida/ModificaGuida.tsx`, sulla forma di `CorreggiElemento` (`AzioniCatalogo.tsx:56-77`) e del guscio di `ModuloCatalogo` (`ModuloCatalogo.tsx:167-229`):
- `ModificaGuida({ tipo, chiave, titolo?, compatto?, soloIcona?, onSalvato })`: un `PulsanteVisivo` (icona `modifica`, come `AzioniCatalogo.tsx`) che, **al clic**, chiama `getSchedaCorrezione` e apre un `Modal` (`titolo`, `aperta`, `onChiudi`, `larga`, `azioni`: stessa firma di `ModuloCatalogo.tsx:167-172`).
- Campi: `testo`/`numero`/`testolungo` con `Campo` + `Griglia` + `Blocco` di `src/components/guida/moduli/campi.tsx` (adattando `dati`/`imposta` a un oggetto indicizzato per `percorso`); `booleano` con una casella «Confermato» come `ModuloCatalogo.tsx:219-224`; `scelta` con `Selettore` (`ricerca="mai"`, come `ModuloGenerico.tsx`); `elenco` con un nuovo `CampoElenco` in `moduli/campi.tsx` (righe + «Togli» + «Aggiungi», sul modello di `EditorRisposte` in `ModuloGenerico.tsx:11-35`); `oggetto` (solo `trasformazione`) con `SceltaCatalogoOggetto` (`src/components/catalogo/SceltaCatalogoOggetto.tsx`: props da verificare).
- Piede della finestra: `Annulla` | «Ripristina i valori della guida» (solo se `scheda.modificata`) | `Salva` (attivo solo con differenze e valori validi). Sotto ogni campo modificato: «Guida: <valoreGuida>» e un «Rimetti questo» (chiama `ripristinaGuida(tipo, chiave, [percorso])`). Banner se `guidaCambiata.length`.
- Conferma del ripristino (D7): seconda pressione con il testo «Perdi la tua versione: …» e il valore che si perde; nessun cestino.
- Testo per i dati nati nell'app (nessuno dei tipi di B11 lo è, ma l'oggetto del catalogo sì): vedi §4.1, «Creato da te».
- Formati: griglia a una colonna sotto 640 px, due da `sm`; bersagli `touch` (≥44 px); scorrimento interno della finestra come le altre `Modal`. Da verificare dal vivo a 1280/768/375 (regola «Tre formati») e a 1366×657, 1280×689 (regola «Altezze realistiche»).

**Montaggi** (uno per pagina, §4): `QuartierePage.tsx:240` (riga di azioni), `CompletamentoPage.tsx:46` (`Trofeo`) e sezioni 155-201, `CovoPage.tsx:122,143,162`, `SfidePage.tsx:34,61,91,110`, `PersonaggiPage.tsx:27`, `OggettiPage.tsx:41,71,101`, `DotiSociali.tsx:160`.

### 3.10 Interazione con «Importa» e con i backup

- Le correzioni stanno **in `gioco.db`** (tabella `correzione_dati_guida` e colonne `origine/seed_json`): «Importa» **sostituisce `gioco.db`** (`pacchettoGiocoService.ts:371-413`: anteprima, `copiaDiSicurezza()` a :377, `installaDatabase` a :383, migrazioni, regole d'avvio) e **non unisce**: dopo l'import le correzioni sono quelle del file importato. Le correzioni dell'istanza di prima restano nella copia di sicurezza creata a :377 e nei backup di avvio. Questa è la lettura di R11-16/R11-17 decisa il 24/10: non serve estendere `ricaricaPacchetto` (`pacchetto/pacchettoGioco.ts:194`, usata solo dai test); le tre tabelle con le nuove colonne ne sarebbero comunque coperte dal ramo generico `origine/seed_json` (:207-208), `correzione_dati_guida` no e non serve.
- L'anteprima dell'import (`pacchettoGiocoService.ts:283-296`) elenca già per costruzione la tabella nuova fra `differenze` (conteggi diversi) o `tabelleAssenti` (pacchetto più vecchio): l'utente vede che sta per perdere correzioni senza codice nuovo. Un conteggio esplicito «N correzioni della tua istanza non sono nel file» è opzionale (D9, B10).
- Un file importato più vecchio della migrazione la riceve vuota dalle migrazioni (`riapriIstanza` + `regoleAllAvvio`); un file più nuovo con correzioni le porta.

### 3.11 Alternative valutate per i blocchi JSON (raccomandazione: percorso)

| Alternativa | Pro | Contro | Esito |
|---|---|---|---|
| **A. Tabella `correzione_dati_guida` per percorso** | granularità di campo («Ripristina» di un campo o di un oggetto); il blocco della guida resta intatto e continua a essere riscritto dalle migrazioni/`trasferisciFontiCatalogo` senza toccare il lavoro dell'utente; il valore della guida è sempre il blocco; lettura con un solo punto (`datiGuidaCorretti`); tabella minuscola (decine di righe) | serve un overlay in lettura e un registro dei percorsi; correzioni orfane se il blocco cambia forma (gestite e mostrate) | **raccomandata** |
| B. Colonna `seed_json`/`origine` in `dati_guida` (copia del blocco intero alla prima correzione, correzione scritta nel blocco) | nessun overlay; lettura invariata | copia da 178 KB (`oggetti-guida`) o 67 KB (`sfide`) per ogni blocco toccato; Ripristina solo a blocco intero (si perderebbero anche le altre correzioni); i writer che riscrivono il blocco (`catalogoOggettiRiferimenti.ts:17`, `dungeonService.ts:761`, `atterraggioPalazziService.ts:127`) lasciano la copia vecchia: ritorni involontari | scartata |
| C. Copia del blocco per l'utente (`dati_guida` con chiave `<blocco>@utente`) letta al posto della guida | semplice | divergenza silenziosa: una correzione della guida dopo la copia non arriva più; stesso difetto di B su `oggetti-guida` (riferimenti al catalogo riscritti solo sul blocco della guida) | scartata |
| D. Trasformare i blocchi in tabelle | scrive e ripristina come le altre righe | riscrive i lettori di cinque pagine; fuori dal perimetro di B11 e contro la scelta del §7 punto 5 di `modifiche.md` | scartata |

Resta come regola di coerenza: l'identità di un elemento (i campi che altre tabelle usano come chiave) **non è modificabile** in B11; se l'utente vuole cambiarla è un
lavoro diverso (migrazione dei riferimenti).

### 3.12 Il registro dei tipi (tutto in un array, `server/services/ripristino/registro.ts`)

Per ogni tipo: modalità, fonte, **selettore** (cosa identifica l'elemento nell'URL e nel percorso), **campi modificabili** (percorso, tipo, nullable), **esclusi** e perché, dove si monta.
Tipi di campo: `testo` (≤400, tolti gli spazi ai capi), `testolungo` (≤4000), `numero` (intero ≥0, nullable dove indicato), `booleano`, `elenco` (array di stringhe non vuote, ≤60 voci ≤600), `scelta`, `oggetto`.
Un campo `nullable` accetta il vuoto e lo salva come `null`; un campo non nullable rifiuta il vuoto salvo che la guida abbia già `''`.

| Tipo | Modalità · fonte · chiave | Campi modificabili | Esclusi (motivo) | Si monta in |
|---|---|---|---|---|
| `quartiere` | riga · `quartiere` · `quartiere.chiave` (23 visibili, `mementos` escluso: `cittaService.ts:41`) | `nome` (testo), `descrizione` (testolungo) | `sblocco`, `sblocco_data` (frasi legacy che L11 toglie, non mostrate), `condizioni_json` (ha il suo editor e Ripristina: `cittaService.ts:85-99`), `fonte`, `ordine` | `QuartierePage.tsx` |
| `trofeo` | riga · `trofeo` · `trofeo.chiave` (53) | `nome`, `nome_en` (nullable), `tipo` (scelta: bronzo/argento/oro/platino), `descrizione` (testolungo), `come` (testolungo), `mancabile` (scelta tri-stato: non detto/sì/no → `NULL/1/0`), `quando` (nullable), `fonte`, `verificato` | `ordine`, `chiave` (chiave di `trofeo_partita`) | `CompletamentoPage.tsx` scheda Trofei |
| `dote` | riga · `dote_sociale` + `dote_sociale_rango` · `dote_sociale.chiave` (5) | `nome`; per rango 1..5: `rango/<n>/nome` (testo ≤40), `rango/<n>/soglia` (numero) | `ordine`, numero dei ranghi (fisso a 5 dal vincolo `CHECK (rango BETWEEN 1 AND 5)`) | `DotiSociali.tsx` |
| `trasformazione` | riga · `trasformazione_oggetto` · `dungeon_chiave` (8) | `cristallo_chiave`, `anello_chiave` (`oggetto`, nullable), `solo_ng_plus` (booleano), `fonte` | `dungeon_chiave` | scheda Oggetto › «Dove si trova» (`TrasformazioniDiJose.tsx`) — ultimo passo (D5) |
| `personaggio` | blocco `personaggi` · `personaggi/[chiave=…]` (27) | `nome`, `nomeCodice` (nullable), `arcano` (nullable), `ruolo` (testolungo), `presentazione` (testolungo), `armi/mischia`, `armi/distanza` (nullable), `battaglia` (testolungo, nullable), `scuola` (nullable), `eta` (nullable), `doppiatori/jp`, `doppiatori/en` (nullable), `fonte`, `verificato` | `chiave`, `ordine`; `confidente` e `giocabile` (struttura: `squadraService.ts:30-33` e i collegamenti ai Confidenti); **`persona`** (L8 B2 lo trasforma in chiavi di `persona.id`: `L8/modifiche.md:94-95`); `campiDaFontiSecondarie`, `fontiSecondarie` (metadati) | `PersonaggiPage.tsx:27` |
| `gruppo-personaggi` | blocco `personaggi` · `gruppi/[nome=…]` (4) | `nome` | `membri` (elenco di chiavi) | `PersonaggiPage.tsx:73` |
| `sfide-battaglie` | blocco `sfide` · `sfide/battaglieSfida` (sezione) | `introduzione` (testolungo), `sblocco` (testolungo), `regoleGenerali` (testolungo), `fonte` | `elenco` | `SfidePage.tsx:34` |
| `battaglia-sfida` | blocco `sfide` · `…/battaglieSfida/elenco/[chiave=…]` (7) | `nome`, `nomeIt` (nullable), `regole` (testolungo), `nemici` (elenco), `punteggi` (nullable, testolungo), `ricompense` (elenco), `strategia` (testolungo), `livelloConsigliato` (nullable), `fonte`, `verificato` | `chiave` (chiave di `ricompensa_oggetto` con `fonte_tipo = 'sfida'`: `fontiRicompenseOggetti.ts:60-65`), `oggettiRicompensa` (calcolato) | `SfidePage.tsx:34` |
| `boss-segreto` | blocco `sfide` · `…/bossSegreti/[chiave=…]` (3) | `nome`, `dove`, `quando`, `requisiti` (elenco), `livelloConsigliato` (nullable), `mosse`, `resistenze`, `debolezze`, `strategia`, `ricompense` (elenco), `statistiche/hp`, `statistiche/sp` (numero), `statistiche/pe`, `statistiche/denaro`, `statistiche/bottino` (testo), `nota` (nullable), `fonte`, `verificato` | `chiave` (come sopra) | `SfidePage.tsx:61` |
| `sfide-magnate` | blocco `sfide` · `…/magnate` (sezione) | `dove`, `quando`, `sfidanti`, `difficolta` (elenco), `regole/struttura`, `regole/valoreCarte`, `regole/inizioManche`, `regole/ruoliEScambi`, `regole/passare`, `regole/bancarotta`, `regole/rivoluzione`, `regole/regolaOtto`, `regole/joker`, `ricompensaFinale`, `effettiRelazioni`, `note`, `fonte` | `ricompensePosizione` (tabella annidata), `sfide` (tipo a parte) | `SfidePage.tsx:91` |
| `magnate-sfida` | blocco `sfide` · `…/magnate/sfide/[nome=…]` (20) | `nome`, `condizione`, `ricompensa` | — | `SfidePage.tsx:91` |
| `tratto` | blocco `sfide` · `…/tratti/elenco/[nome=…]` (90) | `nome`, `nomeEn` (nullable), `effetto` (testolungo), `categoria` (nullable), `personaggio` (nullable) | — | `SfidePage.tsx:110` |
| `sfide-tratti`, `sfide-quiz-tv` | blocco `sfide` · `…/tratti` e `…/quizTv` | `introduzione`, `fonte`, `verificato`; per il quiz anche `numeroDomandeTotali` (numero, nullable) | `elenco` | `SfidePage.tsx:110,136` |
| `finale` | blocco `completamento` · `completamento/finali/[chiave=…]` (6) | `nome`, `condizioni` (elenco), `date` (elenco), `descrizione` (testolungo), `fonte` | `chiave` | `CompletamentoPage.tsx:155` |
| `covo` | blocco `completamento` · `…/covo` (sezione) | `introduzione`, `medaglie` (testolungo), `fonte` | `sfide`, `premi` | `CovoPage.tsx:122` |
| `covo-sfida` | blocco `completamento` · `…/covo/sfide/[nome=…]` (52) | `nome`, `requisito`, `medaglie` (numero, nullable) | — | `CovoPage.tsx:143` |
| `covo-premio` | blocco `completamento` · `…/covo/premi/[nome=…]` (36) | `costo` (numero, nullable), `sblocco` (nullable), `effetto` (nullable) | **`nome`**: è la chiave di `ricompensa_oggetto` con `fonte_tipo = 'covo'` (`fontiRicompenseOggetti.ts:56-58`, `completamentoService.ts:32`); `oggettiRicompensa` | `CovoPage.tsx:162` |
| `dlc` | blocco `completamento` · `…/dlc/[nome=…]` (12) | `nome`, `contenuto` (testolungo), `note` (nullable), `fonte` | — | `CompletamentoPage.tsx:168` |
| `meteo` | blocco `completamento` · `…/meteo/[condizione=…]` (11) | `condizione`, `effetti` (elenco), `fonte` | — | `CompletamentoPage.tsx:173` |
| `completamento-sezione` | blocco `completamento` · `chiave ∈ {ng, differenze, tempo}` | `ng`: `nuovaPartitaPlus/trasferito`, `…/nonTrasferito` (elenco), `…/note`, `…/fonte`; `differenze`: `differenzeRoyal` (elenco); `tempo`: `tempo/fasce`, `tempo/regole` (elenco), `tempo/fonte` | — | `CompletamentoPage.tsx:178,193` |
| `fabbricazione` | blocco `oggetti-guida` · `…/fabbricazione` (sezione) | `introduzione`, `sblocco` (nullable), `regole` (elenco), `fonte` | `ricette` | `OggettiPage.tsx:41` |
| `ricetta` | blocco `oggetti-guida` · `…/fabbricazione/ricette/[attrezzo=…]` (10) | `effetto` (testolungo), `sblocco` (nullable), `fonte`, `verificato` | **`attrezzo`** (chiave di `ricetta_materiale.ricetta` e di `ricompensa_oggetto` `fonte_tipo = 'ricetta'`: `catalogoOggettiProposte.ts:47`, `fontiRicompenseOggetti.ts:50-54`); `materiali`/`prodotti` (storico testuale; la fonte strutturata sono `ricetta_materiale` e `ricompensa_oggetto`, §4.1) | `OggettiPage.tsx:56` |
| `armi` | blocco `oggetti-guida` · `…/personalizzazioneArmi` (sezione) | `introduzione`, `requisiti`, `costi` (testolungo, nullable), `note` (elenco), `fonte` | `effetti`, `progressioneConfidente` | `OggettiPage.tsx:71` |
| `arma-effetto` | blocco `oggetti-guida` · `…/personalizzazioneArmi/effetti/[nome=…]` (8) | `nome`, `effetto` (testolungo), `costo` (nullable, testo) | — | `OggettiPage.tsx:86` |
| `arma-progressione` | blocco `oggetti-guida` · `…/progressioneConfidente/[rango=…]` (5) | `abilita`, `effetto` | `rango` | `OggettiPage.tsx:93` |
| `abiti` | blocco `oggetti-guida` · `…/abiti` (sezione) | `introduzione` (nullable), `lavanderia/dove`, `lavanderia/costo`, `lavanderia/regole` (elenco), `lavanderia/fonte` | `elenco` | `OggettiPage.tsx:101` |
| `abito` | blocco `oggetti-guida` · `…/abiti/elenco/[nome=…]` (55), chiave nell'URL = chiave del catalogo; il server risolve il `nome` della guida dall'elemento con `catalogoChiave` uguale | `dove` (testo) | `nome` e `per` (vengono dal catalogo: si correggono nella scheda dell'oggetto, già a posto: `compendioService.ts:70-73`); `catalogoChiave` (riscritta da `trasferisciFontiCatalogo`) | `OggettiPage.tsx:119` |
| `jose` | blocco `jose` · `jose` (sezione) | `introduzione`, `fiori/descrizione`, `fiori/oggettoSpeciale`, `timbri/descrizione`, `timbri/totale`, `timbri/ricompensaCompletamento`, `timbri/trofei` (elenco), `bossSegreto/nome`, `bossSegreto/condizione`, `bossSegreto/abilita`, `bossSegreto/ricompensa` (elenco), le `bossSegreto/statistiche/*` testuali | `scambi` (sostituito dal listino quando il catalogo c'è: `richiesteService.ts:62-63`); i campi che nel blocco possono essere una stringa o `null` invece di un oggetto (`JoseDto`, `shared/types.ts:2125`) si espongono solo se l'elemento è un oggetto | `RichiestePage` foglio Jose (file da verificare) |

---

## 4. Schede per dominio

### 4.1 Oggetti (R11-15/5)

**Già soddisfatto (prova):**
- *Identità del catalogo* (nome, nomi altri, nome originale, categoria, sottocategoria, effetto, descrizione, statistiche): `PUT /api/catalogo-oggetti/:categoria/:slug` (`routes/catalogoOggetti.ts:51`) → `aggiornaOggetto` (`catalogoOggettiScritture.ts:35-48`, conserva `seed_json` alla prima correzione, riga 40); `POST …/ripristina` (`routes/catalogoOggetti.ts:54`) → `ripristinaOggetto` (`catalogoOggettiScritture.ts:50-78`); FE: «Modifica» e «Ripristina» in `OggettoPage.tsx:81-84` (Ripristina compare solo se `o.modificato`, riga 83; `modificato = seed_json !== null`, `catalogoOggettiLetture.ts:64`), modulo a :154.
- *Offerte e scambi* (prezzo, `costo_json`, condizioni, per negozio): vivono in `articolo` e si modificano nella pagina del negozio: `NegozioPage.tsx:94` (`ModuloCatalogo tipo="articolo"`), «Ripristina i valori della guida» in `ModuloCatalogo.tsx:175-177` → `POST /api/catalogo/:tipo/:chiave/ripristina` (`routes/catalogo.ts:88`) → `ripristinaElemento` (`catalogoService.ts:578`). La pagina Oggetto rimanda lì (`OfferteDellOggetto.tsx:25`, `Link to={casa}`). La sezione «Scambi» di `OggettiPage.tsx:127-139` mostra solo i listini con il link («Apri il listino»): nessun dato proprio. Jose compreso (suo listino `negozio` `jose`).
- *Note storiche*: `routes/catalogoOggetti.ts:28-36` + `NoteStoricheOfferta.tsx:27-36`, con la precondizione sul testo attuale (`noteStoricheService.ts:49-71`).
- *Costo del regalo G-034* (un solo caso): `routes/catalogoOggetti.ts:19` (`ripristina-costo`); non è un meccanismo generale e non si estende (è dei Confidenti, L9/B16).

**Da fare in B11:**
1. **Testi della guida** di fabbricazione, personalizzazione armi, abiti (introduzione, lavanderia, «dove» di ciascun abito) e il blocco Jose: tipi `fabbricazione`, `ricetta`, `armi`, `arma-effetto`, `arma-progressione`, `abiti`, `abito`, `jose` (tabella §3.12). Montare `ModificaGuida` in `OggettiPage.tsx`: nell'intestazione di `SchedaFabbricazione` (`:41`), su ogni riga ricetta (`:56`), nell'intestazione di `SchedaArmi` (`:71`) e su `p.effetti`/`progressioneConfidente` (`:86,93`), in `SchedaAbiti` (`:101`: introduzione, carta Lavanderia, una matita per riga abito a `:119`). Il «dove» degli abiti è l'unico campo del blocco che la pagina mostra oltre a nome e «per», che vengono dal catalogo (`compendioService.ts:70-73`).
2. **«Creato da te»**: per un oggetto con `origine === 'utente'` e `!modificato` la pagina oggi nasconde Ripristina in silenzio (`OggettoPage.tsx:83`, il campo `origine` è già nel DTO: `catalogoOggettiLetture.ts:63`). Aggiungere una riga di testo sotto «Gestione oggetto»: «Creato da te: non c'è un valore della guida da rimettere.» (stessa frase del server `catalogoService.ts:587`).
3. **Legami delle ricette** (materiali in `ricetta_materiale`, 23 righe; prodotti in `ricompensa_oggetto` con `fonte_tipo = 'ricetta'`, 10 righe): la rotta c'è (`PUT /api/catalogo-oggetti/legami`, `routes/catalogoOggetti.ts:37`, `riga_tipo` `'ricetta'` e `'ricompensa'` con chiave `ricetta/<attrezzo>`: `catalogoOggettiProposte.ts:200,205-208`; `bodyLegameOggetto` richiede quantità tranne per il prodotto di una ricetta, `schemas/catalogoOggetti.ts:56-57`) ma **nessuna pagina la usa per le ricette**: `ContenutoDellaVoce` accetta solo `voce` o `fonte {tipo:'ricompensa'}` (`ContenutoDellaVoce.tsx:9`). Estendere il tipo delle `Props` a `{ ricetta: string }` e montarlo in `SchedaFabbricazione` accanto a `OggettiCollegati` (`OggettiPage.tsx:57-59`). **Ripristina dei legami**: oggi non esiste un valore della guida strutturato (il blocco ha solo testo e quantità, `materiali: [{nome, quantita}]`); D4.
4. **`trasformazione_oggetto`** (8 righe, relazioni informative di Jose): nessuna scrittura (`trasformazioniOggetti.ts` sola lettura; solo `trasferisciFontiCatalogo` aggiorna le due chiavi, `catalogoOggettiRiferimenti.ts:10`). Tipo `trasformazione` (modalità riga, colonne come §3.3) montato in `TrasformazioniDiJose.tsx` (scheda Oggetto, `OggettoPage.tsx:124`). Ultimo passo del blocco; D5.
5. **«Tesori»**: in `docs/analisi/2026-10-20-piano-razionalizzazione.md` (righe 60-67) i tesori (`tesoro` 9 righe, `tesoro_modificatore`, ricette speciali, DLC) sono sotto «Persona e compendio», non sotto «Oggetti»: li legge `compendioService.ts:228-230` e `fusione/motoreFusione.ts:87,90`, senza scrittori. Appartengono a R11-15/3 → B17 dopo L8. In B11 **non** si toccano (D6).

### 4.2 Città — quartieri (R11-15/6)

**Prova che manca**: `routes/compendio.ts:215,217` (ingresso), `:229,233` (sblocco) sono le uniche scritture; `cittaService.ts:85-99` scrive solo `condizioni_json`; la pagina mostra il nome come titolo (`QuartierePage.tsx:229`) e la descrizione (`:237`) senza gesti. Già a posto e da non toccare: sblocco con «Ripristina la condizione della guida» (`QuartierePage.tsx:58-82`, `cittaService.ts:92-99`) e ingresso (nessun valore della guida: Ripristina non compare, e va detto nell'elenco di verifica).

**Modifica precisa**:
- Colonne `origine/seed_json/updated_at` su `quartiere` (§3.3). Tipo `quartiere` del registro: campi `nome`, `descrizione`; fotografia `seed_json = { nome, descrizione, mappa_nome }`.
- **Propagazione del nome** (obbligatoria, stessa transazione): il nome del quartiere ha copie: `mappa.nome` della mappa `citta-<chiave>` (24 su 24 uguali oggi; la chiave si calcola con `chiaveImmagineQuartiere`, `cittaService.ts:35`, non con `mappa.entita_*` che B9 sta togliendo) e `mappa_percorso.nome`, derivato dai nomi della catena di mappe (`percorsiMappe.ts:57-58` lettura, `:61-64` ricostruzione con `sincronizzaPercorsiMappe`). L'implementatore deve **prima leggere** `sincronizzaPercorsiMappe` per intero (non l'ho letta oltre riga 70) e scegliere fra: aggiornare `mappa.nome` e rigenerare i percorsi con quella funzione, oppure aggiornare direttamente `mappa_percorso.nome` della riga. Il nome nelle Aree e nelle case si legge già da `quartiere.nome` (`casaMappa.ts:43`).
- «Ripristina» riporta anche `mappa.nome` (e i percorsi) al valore in fotografia.
- Montaggio: `ModificaGuida tipo="quartiere" chiave={q.chiave}` nella riga di azioni di `QuartierePage.tsx:240-241` (accanto a «Ingresso» e «Aggiungi area»); `onSalvato={() => dati.ricarica()}`.
- Letture: nessun cambio (`elencaQuartieri`/`dettaglioQuartiere` leggono già le colonne: `cittaService.ts:103-113,116-134`).

### 4.3 Personaggi (R11-15/8)

Dati: `dati_guida.personaggi` = 27 personaggi + 4 gruppi, 26 KB. Elementi con `chiave` unica (27/27), gruppi con `nome` unico (4/4).
- Tipi `personaggio` e `gruppo-personaggi` (§3.12). `persona` **escluso**: L8 B2 lo riscrive in chiavi (`L8/modifiche.md:94-95`, `PersonaggioDto.persona: Array<{id, nome}>`, e `PersonaDelPersonaggio.tsx`, `PersonaggiPage.tsx:80`); `giocabile` e `confidente` esclusi (D3).
- Lettura: `routes/compendio.ts:127` e `squadraService.ts:30` passano a `datiGuidaCorretti` (§3.6). Il `nome` corretto compare anche nella squadra.
- Montaggio: dentro la sezione «Più dettagli» di `Personaggio` (`PersonaggiPage.tsx:27-66`, accanto a «Scheda Confidente»/«fonte», righe 57-60) una matita «Modifica» per personaggio; sul titolo di gruppo (`PersonaggiPage.tsx:93`) una matita per il nome.
- **Coordinamento con L8 B2** (`L8/preparazione-2026-10-23.md`, B2 «Persona del gruppo»): B2 modifica `PersonaggiPage.tsx`, `PersonaDelPersonaggio.tsx` e la forma del blocco; il montaggio di B11 in quel file va fatto **dopo** B2 o con un merge manuale; il registro non ha il campo `persona`, e `datiGuidaCorretti` salta le correzioni che non si risolvono più, quindi B2 non rompe B11.

### 4.4 Sfide (R11-15/9)

Dati: `dati_guida.sfide` (5 sezioni, 67 KB): `battaglieSfida` (7), `bossSegreti` (3), `magnate` (20 sfide, tabelle), `tratti` (90), `quizTv`. Tutte le collezioni hanno selettore unico (7/7, 3/3, 20/20, 90/90).
- Tipi `sfide-battaglie`, `battaglia-sfida`, `boss-segreto`, `sfide-magnate`, `magnate-sfida`, `tratto`, `sfide-tratti`, `sfide-quiz-tv` (§3.12). `chiave` di battaglie e boss **esclusa**: `ricompensa_oggetto` (47 righe `fonte_tipo = 'sfida'`) la usa (`fontiRicompenseOggetti.ts:60-65`, `sfideService.ts:11-12`).
- Lettura: `sfideService.ts:8` e `fontiRicompenseOggetti.ts:61` passano a `datiGuidaCorretti`.
- Montaggio (`SfidePage.tsx`): intestazione di `SchedaBattaglie` (`:34`, sezione `sfide-battaglie`) e una matita per carta (`battaglia-sfida`); una per carta in `SchedaBoss` (`:61`); in `SchedaMagnate` (`:91`) una matita sulla sezione e una per ogni sfida di Magnate se si mostra l'elenco (`magnate.sfide`: oggi reso in modo generico dai campi, `:91-108`, da verificare come lo si disegna); `SchedaTratti` (`:110`): introduzione e una matita per riga della tabella (90 righe: icona sola, `touch`).

### 4.5 Trofei (R11-15/10)

Dati: `trofeo` (53 righe, schema `019_trofei.ts:17-28`), chiave `chiave` usata da `trofeo_partita` (0 righe sulla copia, ma scritta da `completamentoService.ts:38-50`: **non toccare**).
- Colonne §3.3; tipo `trofeo` (§3.12) con `mancabile` come scelta tri-stato; `tipo` come scelta a quattro valori (stessi del `CHECK`).
- Lettura: `completamentoService.ts:17,31` (`dto(r, ottenuti)`, `SELECT * FROM trofeo`) già legge le colonne; nessun cambio.
- Montaggio: `CompletamentoPage.tsx:46-88` (`Trofeo`), matita accanto al nome (riga ~60), `onSalvato` che ricarica `dati` (`dati.ricarica`, la pagina usa `useCarica`, riga 101).
- Gli eventi già scritti nello storico (`registraEvento(... 'Trofeo ottenuto: <nome>')`, `completamentoService.ts:47`) restano com'erano: sono testo storico.

### 4.6 Completamento e Covo (R11-15/11)

Dati: `dati_guida.completamento` (7 sezioni, 44 KB): `finali` (6), `covo` (sfide 52, premi 36), `dlc` (12), `meteo` (11), `nuovaPartitaPlus`, `differenzeRoyal`, `tempo`.
- Tipi `finale`, `covo`, `covo-sfida`, `covo-premio`, `dlc`, `meteo`, `completamento-sezione` (§3.12). **`nome` dei premi del Covo escluso**: è la chiave della fonte `covo` delle ricompense (`completamentoService.ts:32`, `fontiRicompenseOggetti.ts:56-58`).
- Lettura: `completamentoService.ts:28` e `fontiRicompenseOggetti.ts:56` passano a `datiGuidaCorretti`.
- Montaggio: `CompletamentoPage.tsx` `finali` (`:155-166`, una matita per `li`), `dlc` (`:168`), `meteo` (`:173`), `ng` (`:178`), `tempo` (`:193`) con la matita nel titolo della sezione; **Covo**: `CovoPage.tsx:122` (introduzione/medaglie), `:143-160` (una per sfida), `:162-185` (una per premio).
- Le 52 sfide del Covo hanno `medaglie: null` per tutte (commento in `CovoPage.tsx:42-51`): il campo si espone come numero nullable.

### 4.7 Ranghi delle Doti (R11-15/12)

Stato: `dote_sociale` (5: `chiave`, `nome`, `ordine`), `dote_sociale_rango` (25: `rango`, `nome`, `soglia`, `CHECK (rango BETWEEN 1 AND 5)`). **I nomi non si leggono dalle colonne**: `ranghiDote` usa `t('rangoDote', 'dote/rango')` (`partiteService.ts:194-197`, ignora `r.nome`), `dotiSociali` usa `t('doteSociale', chiave)` (`:208-216`), `nomeDote` (`:219-222`), l'evento di rango (`:247`), `compendioService.ts:208`; invece `azioniStrutturateService.ts:110,175` legge `dote_sociale.nome` direttamente. Sulla copia colonna e `traduzione` coincidono sempre (5/5 e 25/25). Le **soglie** si leggono dalla colonna (`partiteService.ts:195`) e non hanno scrittori.

**Decisione D2 (raccomandata A)**: la colonna diventa l'unica fonte dei nomi.
- Migrazione (stessa del §3.3, dopo le `ALTER`): per ogni Dote e rango `UPDATE … SET nome = COALESCE((SELECT testo FROM traduzione WHERE ambito = 'doteSociale' AND chiave = …), nome)` (e `rangoDote` con chiave `'dote/rango'`), poi `DELETE FROM traduzione WHERE ambito IN ('doteSociale','rangoDote')` (30 righe: oggi 0 con `fonte = 'utente'`, ma la migrazione deve comunque copiare prima di togliere); log con i conteggi.
- Letture da cambiare: `partiteService.ts:196,214,221,247` (da `t(...)` alla colonna: `SELECT nome` già presente alle righe 195 e 210) e `compendioService.ts:208`.
- Perché: con la sola `traduzione` il «Ripristina» legge `percorsoPacchettoDb()` (`traduzioniService.ts:117,128-137`), cioè il pacchetto del repository, contro la regola del 21/10; e i due ambiti resterebbero modificabili da un secondo punto (`TraduzioniEditor.tsx:20` li elenca fra gli ambiti).
- Alternativa B (non raccomandata): lasciare `t()` e scrivere in `traduzione`; richiede comunque un `seed_json` altrove per un Ripristina senza pacchetto.

**Tipo `dote`** (modalità riga: `dote_sociale` + `dote_sociale_rango`): fotografia in `dote_sociale.seed_json = { nome, ranghi: [{ rango, nome, soglia }] }`; campi `nome`, `rango/<n>/nome`, `rango/<n>/soglia`. **Invarianti** nel servizio: rango 1 con soglia 0; soglie strettamente crescenti; soglia ≤ 100000; nome rango 1–40 caratteri; altrimenti 409 `soglie-non-valide` (letterale nel codice). `progressoDote` (`partiteService.ts:200-205`) e `quotaVersoProssimoRango` (`src/utils/doti.ts:12-20`) leggono i ranghi dal DTO: nessun altro cambio; i punti delle partite (`dote_sociale_partita.punti`) non si toccano, il rango si ricalcola.
- DTO: `DoteSocialePartitaDto.modificato?: boolean` (riga 622 di `shared/types.ts`) se si vuole il segno nella scheda.
- Montaggio: matita «Modifica ranghi» accanto al titolo del rango in `CartaDote` (`DotiSociali.tsx:160-189`, riga ~167-172), `onSalvato` che chiama `ricarica` (`useCarica` a riga 45). La finestra mostra 5 righe (nome, soglia) con `gruppo = 'Rango n'`.

---

## 5. Elenco di verifica `lotti/L11/verifica-modificabile.md` — schema e esito di oggi

**Schema (righe e colonne)** del file che B11 consegna a fine lotto. Una riga per **oggetto** (non per pagina). Colonne:

| Colonna | Contenuto |
|---|---|
| Dominio · Oggetto | come in tabella sotto |
| Dato (tabella o blocco) | `quartiere`, `dati_guida.sfide`, … |
| Dove si modifica | pagina › gesto (un solo punto) |
| Modifica oggi / dopo B11 | sì / no / parziale |
| Ripristina oggi / dopo B11 | sì / no / n.a. (nato nell'app, la scheda lo dice) |
| Prova di oggi | `file:riga` letti |
| Prova dopo B11 | rotta + componente + riga del montaggio (compilata a fine lavoro) |
| Esito finale | verificato da (agente distinto), data, come (statico/dal vivo) — a carico del revisore avversariale |

**Esito di oggi, oggetto per oggetto** (domini di B11):

| Dominio · Oggetto | Dato | Dove si modifica | Modifica oggi | Ripristina oggi | Prova di oggi |
|---|---|---|---|---|---|
| Oggetti · identità catalogo | `catalogo_oggetto` | Pagina Oggetto › Modifica | sì | sì | `OggettoPage.tsx:81-84,154`, `routes/catalogoOggetti.ts:51,54`, `catalogoOggettiScritture.ts:35-78` |
| Oggetti · identità nata nell'app | `catalogo_oggetto` `origine='utente'` | Pagina Oggetto | sì | n.a., **ma non lo dice** (Ripristina nascosto in silenzio) | `OggettoPage.tsx:83`; frase solo in `ModuloCatalogo.tsx:188` |
| Oggetti · offerte e scambi (prezzo, costo, condizioni; Jose compreso) | `articolo` | Pagina Negozio › Correggi | sì | sì | `NegozioPage.tsx:94`, `ModuloCatalogo.tsx:175-177`, `routes/catalogo.ts:88`, `catalogoService.ts:578` |
| Oggetti · note storiche | `nota_storica` | Pagina Oggetto/negozio | sì | sì | `routes/catalogoOggetti.ts:28-36`, `NoteStoricheOfferta.tsx:27-36` |
| Oggetti · costo regalo G-034 | `confidente_regalo` | scheda Confidente | solo un caso | solo un caso | `routes/catalogoOggetti.ts:19` (resto: B16) |
| Oggetti · contenuto forzieri e ricompense | `voce_oggetto`, `ricompensa_oggetto` | scheda del Palazzo/Richiesta | sì (legami) | no (nessun valore della guida strutturato) | `ContenutoDellaVoce.tsx:9,40-54`, `routes/catalogoOggetti.ts:37` |
| Oggetti · fabbricazione: testi | `dati_guida.oggetti-guida.fabbricazione` | — | **no** | no | `OggettiPage.tsx:41-68` (sola lettura) |
| Oggetti · fabbricazione: materiali e prodotti | `ricetta_materiale`, `ricompensa_oggetto` (ricetta) | — | no (rotta sì, FE no) | no | `routes/catalogoOggetti.ts:37`, `ContenutoDellaVoce.tsx:9` |
| Oggetti · personalizzazione armi | `…oggetti-guida.personalizzazioneArmi` | — | **no** | no | `OggettiPage.tsx:71-98` |
| Oggetti · abiti: «dove», introduzione, lavanderia | `…oggetti-guida.abiti` | — | **no** | no | `OggettiPage.tsx:101-124` |
| Oggetti · abiti: nome e «per» | `catalogo_oggetto` | Pagina Oggetto | sì | sì | `compendioService.ts:70-73` |
| Oggetti · trasformazioni di Jose | `trasformazione_oggetto` | — | **no** | no | `trasformazioniOggetti.ts` (sola lettura) |
| Oggetti · blocco Jose (testi) | `dati_guida.jose` | — | **no** | no | `richiesteService.ts:61-64` |
| (B17) Tesori | `tesoro`, `tesoro_modificatore` | — | no | no | `compendioService.ts:228-230` — fuori da B11 (D6) |
| Città · quartiere nome | `quartiere.nome` | — | **no** | no | `cittaService.ts:85-99`, `QuartierePage.tsx:229` |
| Città · quartiere descrizione | `quartiere.descrizione` | — | **no** | no | `QuartierePage.tsx:237` |
| Città · quartiere sblocco | `quartiere.condizioni_json` | Pagina Quartiere › Sblocco | sì | sì | `routes/compendio.ts:229,233`, `QuartierePage.tsx:58-82` |
| Città · quartiere ingresso | `quartiere_ingresso` | Pagina Quartiere › Ingresso | sì | n.a. (non ha un valore della guida) | `routes/compendio.ts:215,217`, `QuartierePage.tsx:240` |
| Personaggi · scheda (23 campi testuali) × 27 | `dati_guida.personaggi` | — | **no** | no | `routes/compendio.ts:126-130`, `PersonaggiPage.tsx:27-66` |
| Personaggi · ritratto (immagine) | `immagine` | Pagina Personaggi › immagine | sì | n.a. | `PersonaggiPage.tsx:37-38` |
| Personaggi · gruppi (4) | `dati_guida.personaggi.gruppi` | — | **no** | no | `PersonaggiPage.tsx:89-93` |
| Sfide · battaglie (7) + intro | `dati_guida.sfide` | — | **no** | no | `SfidePage.tsx:34-58`, `sfideService.ts:8-16` |
| Sfide · boss segreti (3) | idem | — | **no** | no | `SfidePage.tsx:61-89` |
| Sfide · Magnate | idem | — | **no** | no | `SfidePage.tsx:91-108` |
| Sfide · tratti (90) | idem | — | **no** | no | `SfidePage.tsx:110-134` |
| Sfide · quiz TV (introduzione) | idem | — | **no** | no | `shared/types.ts:1138` (nessun modulo in `SfidePage.tsx`; da verificare dove si mostra) |
| Trofei · scheda (53) | `trofeo` | — | **no** | no | `migrations/019_trofei.ts:17-28`, `completamentoService.ts:17,31` |
| Completamento · finali (6) | `dati_guida.completamento` | — | **no** | no | `CompletamentoPage.tsx:155-166` |
| Completamento · Covo: intro, sfide (52), premi (36) | idem | — | **no** | no | `CovoPage.tsx:122,143,162` |
| Completamento · DLC (12), meteo (11), NG+, differenze, tempo | idem | — | **no** | no | `CompletamentoPage.tsx:168-201` |
| Doti · nome della Dote | `traduzione` `doteSociale` | Impostazioni › Traduzioni (non la pagina Doti) | parziale | parziale (legge il pacchetto del repository) | `TraduzioniEditor.tsx:7,43`, `traduzioniService.ts:107-137` |
| Doti · nome del rango (25) | `traduzione` `rangoDote` | idem | parziale | parziale | `partiteService.ts:196` |
| Doti · soglia del rango (25) | `dote_sociale_rango.soglia` | — | **no** | no | `partiteService.ts:195` (sola lettura) |

Righe «sì/sì» già a posto: 7. Righe «no»: 22 oggetti o gruppi di oggetti. Dopo B11 la colonna «Modifica» deve essere «sì» ovunque tranne dove la tabella dei tipi lo esclude con motivo (identità e strutture, §3.12), e «Ripristina» «sì» ovunque abbia un valore della guida.

---

## 6. Come si verifica senza test

Regola del repository (CLAUDE.md, procedura obbligatoria punto 2-3): zero test nuovi o eseguiti; typecheck + lint verdi, build senza errori; il runtime non si dichiara verificato se non osservato; nessuna prova in scrittura sui dati dell'utente.

1. **Statica**: `npm run typecheck` (compila anche i test), `npm run lint`, `npm run build`. Il lint e il typecheck coprono: i tipi del registro, l'esaustività di `TIPI_MODIFICABILI`, i DTO opzionali.
2. **Controlli di sola lettura sulla copia nello scratchpad** (script Node, `better-sqlite3` con `{ readonly: true }`, mai su `data/`), da scrivere nello scratchpad e da non committare:
   - *registro ↔ dati*: per ogni tipo a blocco, per ogni elemento reale del blocco (27, 4, 7, 3, 20, 90, 6, 52, 36, 12, 11, 10, 8, 5, 55, …) e per ogni campo del registro, il percorso si risolve e il tipo del valore coincide con quello dichiarato (stringa/numero/booleano/array di stringhe, `null` solo dove `nullable`); stampa i campi che non si risolvono. È il controllo che impedisce un registro scritto «a occhio»;
   - *chiavi*: i campi esclusi come identità (`attrezzo`, `nome` dei premi del Covo, `chiave` di sfide e personaggi) sono davvero quelli che compaiono come `fonte_chiave` in `ricompensa_oggetto` o come `personaggio_chiave` nelle partite (confronto di insiemi, sola lettura);
   - *unicità dei selettori*: ogni selettore è unico nella sua collezione (già misurato oggi: tutti unici; rifarlo sulla copia più recente);
   - *Doti*: nomi e soglie della copia soddisfano gli invarianti (rango 1 a 0, soglie crescenti) e `dote_sociale_rango.nome = traduzione` per 25/25.
3. **Funzioni pure** (`shared/percorsoGuida.ts`) con `npx tsx -e` su oggetti in memoria (nessun DB): idempotenza di `impostaImmutabile`, `risolvi` sul puntatore dopo una correzione del campo-selettore, no-op con zero correzioni (`datiGuidaCorretti` che restituisce lo **stesso** oggetto di `datiGuida`: confronto per identità).
4. **Migrazione**: si prova sulla **copia** nello scratchpad (non sui dati dell'utente): conteggi prima/dopo identici su tutte le tabelle tranne le colonne aggiunte e le 30 righe di `traduzione` (se D2 = A), `PRAGMA foreign_key_check` invariato, seconda esecuzione idempotente; le impronte (`impronta.cjs`, `impronta-mondo.cjs`) restano nello scratchpad delle sessioni: usare quelle per diario, Kamoshida, Madarame e mondo (R11-21).
5. **Dal vivo** (a cura dell'utente, o del revisore avversariale con il browser aperto sull'app, **senza scritture sui dati reali**: su una copia o con una correzione che si ripristina subito): una correzione e un Ripristina per tipo, a 1280/768/375 e a 1366×657/1280×689; dopo ogni correzione verificare che la pagina del dominio **e** i lettori secondari mostrino il valore nuovo (squadra per il nome del personaggio; oggetto per la ricompensa di sfida/Covo; mappa e percorsi per il nome del quartiere; scheda Doti per nomi e soglie).
6. **Importa** (R11-16/17, lettura del 24/10): verifica solo statica e documentale: le correzioni sono in `gioco.db` e quindi nella copia di sicurezza creata a `pacchettoGiocoService.ts:377`; l'anteprima elenca la tabella fra le differenze (`:285-286`). Nessun import di prova sui dati reali.
7. **Revisione avversariale** (procedura, punto 2): un agente distinto confronta questa scheda e le istruzioni dell'utente con il codice, cerca controesempi (un lettore che salta la correzione; una chiave resa modificabile; una scrittura fuori dalla transazione; una rotta senza descrizione OpenAPI).

---

## 7. Ordine dei passi e file condivisi con altri blocchi

**Prima di cominciare**: `git status` e `git branch --show-current`; leggere `STATO-ATTUALE.md`; controllare quale numero di migrazione è libero; verificare con L8 se B2 è già consegnato (decide l'ordine del passo 8).

| # | Passo | File | Condivisi |
|---|---|---|---|
| 1 | Migrazione §3.3 (+ D2 per le Doti) e registrazione | `server/db/migrations/<N>_correzioni_guida.ts` | **`migrations/index.ts`** (un proprietario alla volta: B8, B9, B12, B13, B15 e L8/L9/L10 la toccano) |
| 2 | Funzioni pure + DTO | `shared/percorsoGuida.ts` (nuovo); `shared/types.ts` (in fondo) | **`shared/types.ts`** (B3, B5, B7, B8, B9, B10) |
| 3 | Overlay e passaggio dei lettori (§3.6) | `server/services/datiGuida.ts`; `sfideService.ts`, `completamentoService.ts`, `compendioService.ts` (riga 26), `richiesteService.ts` (61), `squadraService.ts` (30), `fontiRicompenseOggetti.ts` (50,56,61); **una riga** in `routes/compendio.ts:127` | **`routes/compendio.ts`** (B3, B5, B7 + L8); `compendioService.ts` (L8) |
| 4 | Servizio e registro: modalità riga (quartiere, trofeo, dote, trasformazione), modalità blocco | `server/services/ripristinoService.ts` (+ `ripristino/registro.ts`) | — |
| 5 | Schemi, rotte, descrizioni OpenAPI | `server/schemas/correzioni.ts`, `server/routes/correzioni.ts`, `server/openapi/descrizioni/correzioni.ts` | **`routes/index.ts`**, **`openapi/descrizioni/index.ts`** (B3, B5, B7 aggiungono descrizioni) |
| 6 | Doti: letture dalla colonna | `partiteService.ts:196,214,221,247`, `compendioService.ts:208` | `partiteService.ts` (L10) |
| 7 | FE: client, `ModificaGuida`, `CampoElenco` | `src/services/api/correzioni.ts`, `src/services/api/index.ts`, `src/components/guida/ModificaGuida.tsx`, `src/components/guida/moduli/campi.tsx` | `services/api/index.ts` (B3 aggiungerà il client della ricerca) |
| 8 | Montaggi in ordine di rischio crescente: Trofei → Doti → Città → Sfide → Completamento e Covo → Oggetti → Personaggi (ultimo, dopo L8 B2) | pagine di §3.9 | **`PersonaggiPage.tsx`, `PersonaDelPersonaggio.tsx`** (L8 B2); `OggettiPage.tsx` (L7/L8) |
| 9 | Ricette: legami in FE; `trasformazione`; frase «Creato da te» | `ContenutoDellaVoce.tsx`, `OggettiPage.tsx`, `TrasformazioniDiJose.tsx`, `OggettoPage.tsx` | `OggettoPage.tsx` |
| 10 | Controlli §6.1-6.3, tabella di verifica §5 compilata, aggiornamento di `docs/ROADMAP.md` (stato) e, se serve, `DECISIONI.md` | `lotti/L11/verifica-modificabile.md` | — |

Un solo commit/push a fine lotto (procedura, punto 3). Il PM aggiorna Regia e STATO.

Conflitti da evitare per nome: il file `server/routes/compendio.ts` si tocca in **una riga** (127); L8 B3/B4 vi aggiungono rotte di Persona/Ombre: fare il merge a mano. Non toccare `catalogoService.ts` né `ModuloCatalogo.tsx`: B11 non aggiunge un tipo a `TIPI_CATALOGO` (`shared/types.ts:3057`) per non propagare fino a `cestinoService.ts`, `riepilogoCatalogo`, `MieiDati.tsx`.

---

## 8. Decisioni da confermare

| # | Decisione | Raccomandazione |
|---|---|---|
| D1 | Meccanismo per i blocchi JSON: tabella per percorso / `seed_json` sul blocco / copia del blocco | **Tabella `correzione_dati_guida` per percorso** (§3.11) |
| D2 | Nomi delle Doti e dei ranghi: colonna come unica fonte (migrazione che copia e toglie le 30 righe di `traduzione`) oppure scrivere in `traduzione` | **Colonna**; evita il «Ripristina» dal pacchetto del repository e un secondo punto di modifica |
| D3 | Perimetro dei campi: solo testi, numeri, flag e elenchi di stringhe; esclusi identità (`chiave`, `attrezzo`, `nome` dei premi Covo, `catalogoChiave`), struttura (`ordine`, `membri`, `confidente`, **`giocabile`** dei personaggi, tabelle annidate) e `persona` (L8) | Confermare in particolare `giocabile` e `confidente`, oggi senza altro punto di modifica |
| D4 | «Ripristina» dei legami delle ricette (`ricetta_materiale`, ricompense di ricetta): non c'è un valore della guida strutturato | Rimandare: Modifica sì, Ripristina no con avviso; oppure, come passo opzionale, una fotografia dei legami alla prima modifica in `correzione_dati_guida` (richiede un gancio in `catalogoOggettiProposte.ts` di L7) |
| D5 | `trasformazione_oggetto` (8) e blocco Jose nel perimetro di B11 | Sì, ultimo passo; sono «Oggetti: scambi (Jose compreso)» del piano |
| D6 | «Tesori» (`tesoro`, `tesoro_modificatore`): non sono di B11 ma di R11-15/3 | Confermare lo spostamento a B17 (dopo L8) |
| D7 | Niente cestino su «Ripristina», con conferma che mostra il valore dell'utente che si perde | Sì (uguale a tutti i Ripristina esistenti) |
| D8 | `verificato` e `campiDaFontiSecondarie`: restano manuali (campo `verificato` modificabile, nessun cambio automatico) | Sì |
| D9 | Conteggio «N correzioni dell'istanza non nel file» nell'anteprima dell'import | Opzionale, in B10 |
| D10 | Il nome del quartiere si propaga a `mappa.nome` e ai nomi dei percorsi | Obbligatorio; ordine con B9 (`mappa.entita_*`) |
| D11 | Famiglia di rotte `/api/correzioni` con area OpenAPI propria, al posto di rotte per dominio dentro `routes/compendio.ts` | Sì (evita conflitti con L8) |
| D12 | Montaggio in `PersonaggiPage.tsx` dopo L8 B2 | Sì |

---

## 9. Rischi

1. **Nome del quartiere con copie** (`mappa.nome`, `mappa_percorso.nome`, `casaMappa.ts:43` legge già la colonna): senza propagazione l'indice delle mappe e i percorsi mostrano il nome vecchio. `sincronizzaPercorsiMappe` non letta per intero.
2. **Chiavi mascherate da testo**: `attrezzo`, `nome` dei premi del Covo, `chiave` di sfide e personaggi sono usati come chiavi di `ricetta_materiale`, `ricompensa_oggetto`, `membro_squadra_partita`. Se un campo-chiave diventasse modificabile, le ricompense collegate sparirebbero in silenzio. Il registro li esclude; il controllo §6.2 lo verifica contro i dati.
3. **Selettore `catalogoChiave`**: riscritto nel blocco da `trasferisciFontiCatalogo` (`catalogoOggettiRiferimenti.ts:11-18`) all'eliminazione o fusione di un oggetto: usare `nome`.
4. **Correzioni orfane**: se L8 B2 (o una migrazione) cambia la forma di un blocco, una correzione può non risolversi più: salta e viene segnalata (`orfana: true` in `GET /api/correzioni`), mai cancellata in silenzio.
5. **Lettori che saltano l'overlay**: una pagina che legge il blocco da un altro punto (SQL grezzo, snapshot) mostrerebbe il valore della guida. L'elenco §3.6 è stato fatto con grep per nome: letture composte a runtime non le vedrei (limite).
6. **Doti**: la migrazione toglie 30 righe di `traduzione`; se un'altra parte del codice leggesse quegli ambiti (grep fatto oggi: solo `partiteService.ts` e `compendioService.ts`) resterebbe senza nome. I test non toccano gli ambiti (grep sui `.test.ts`: nessun riferimento oltre alle tabelle di partita).
7. **Soglie delle Doti**: cambiare una soglia sposta il rango mostrato nelle partite esistenti senza scrivere eventi `dote-rango`; è voluto (il rango è derivato), ma va detto nella finestra.
8. **Importa** sostituisce `gioco.db`: le correzioni fatte dopo il backup scelto si perdono (e viceversa); l'anteprima lo mostra solo come differenza di conteggi (D9).
9. **Conflitti di file** (§7): `shared/types.ts`, `migrations/index.ts`, `routes/index.ts`, `openapi/descrizioni/index.ts`, `src/services/api/index.ts` e le pagine toccate da L8; un solo proprietario alla volta.
10. **OpenAPI**: `openapi.test.ts` fallisce se una rotta non ha descrizione o se un codice d'errore dichiarato non è letterale nel server: scrivere i codici nel servizio **prima** di dichiararli.
11. **Cache**: `datiGuidaCorretti` deve svuotarsi con `invalidaCacheDiGioco()`; ogni scrittura del servizio la chiama dopo la transazione. Dimenticarlo = correzione che compare solo dopo un riavvio.
12. **Repo pubblico**: nessun nome di utente o di partita nei dati di prova, nei testi di esempio o nei documenti.

---

## 10. Limiti

- Dati misurati su una copia a gioco 146 nello scratchpad; le migrazioni 147-167 e il lavoro dell'utente su p5s possono aver cambiato conteggi e contenuti dei blocchi (la forma dei blocchi l'ho verificata sulla copia, non sul DB vivo, che non ho aperto).
- Non ho letto: `sincronizzaPercorsiMappe` oltre riga 70; `shared/riferimentiCatalogoGuida.ts`; `RichiestePage.tsx` e `TrasformazioniDiJose.tsx`; le props di `SceltaCatalogoOggetto` e di `Selettore`/`Modal` oltre gli usi letti; i file di test (non ho eseguito niente, né typecheck né lint né build). «Nessun test da modificare» è una previsione: i campi nuovi dei DTO sono opzionali e le funzioni esistenti non cambiano firma, ma solo il typecheck lo conferma.
- I lettori sono cercati con grep per nome (`datiGuida<`, `datiGuida(`, `FROM dote_sociale`, `traduzione`): non vedono letture composte a runtime.
- Le righe `file:riga` sono di oggi nel worktree con modifiche non committate di altre sessioni; possono spostarsi (in particolare `shared/types.ts`, `migrations/index.ts`, `QuartierePage.tsx`).
- La stima di quali campi un utente voglia modificare è mia: l'elenco dei campi è il più ampio compatibile con le regole di identità; l'utente può restringerlo (D3).
- Il significato di «tesori» nella voce R11-15/5 l'ho dedotto dal piano del 20/10 (righe 60-67); da confermare (D6).

---

## 11. Test da toccare per farli compilare

Nessuno previsto. Se il typecheck ne indicasse (per esempio un test che costruisce `DoteSocialePartitaDto`, `TrofeoDto` o `QuartiereDettaglioDto` con un tipo chiuso, o che mocka `datiGuida` con una firma diversa), le modifiche si limitano a far compilare (senza eseguire né cancellare) e si elencano qui al momento: candidati da controllare, `src/components/partita/DotiSociali.test.tsx`, i test di `routes/personaggi.test.ts`, `routes/sfide.test.ts`, `routes/completamento.test.ts`, `server/services/datiGuida.test.ts` (non letti).
