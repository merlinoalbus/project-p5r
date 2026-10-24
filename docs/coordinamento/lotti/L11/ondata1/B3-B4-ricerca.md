# L11 · Ondata 1 · B3 (ricerca globale BE) e B4 (ricerca globale FE) — scheda di implementazione

Analisi in sola lettura, 2026-10-24, per un implementatore Sonnet. Ramo `newreview`. Nessun commit, nessun test scritto o eseguito, nessuna scrittura su codice o dati.

Metodo: letti `CLAUDE.md`; `lotti/L11/{requisiti,modifiche,app,dati,piano}.md` e `preparazione-2026-10-23.md` (§4.2, §5, §6, §7, §8); `guida/registro.md` G-038; `lotti/L5/requisiti.md` (R5-20b/c/d/f); `shared/{testo,catalogo,immagini,condizioniSpillo,accessoMondo}.ts`;
`server/services/{luoghiService,cacheDiGioco,datiGuida,traduzioniService,compendioService,catalogoOggettiLetture}.ts`, `server/services/mappe/{casaMappa,immagineMappa,nomiDeiPosti,accessoMondoService}.ts`; `server/{routes,schemas,openapi,bootstrap}`;
`src/components/layout/*`, `src/components/scheda/*`, `src/utils/pannelloScheda.ts`, `src/router.tsx`, `src/stores/assetStore.ts`, le pagine di elenco dei tipi; `stato.json` → `pianoAtomico.voci`.
Misure sulla copia `sim-142b` dello scratchpad (`gioco.db` portato a migrazione 146; il repository ha migrazioni registrate fino alla **167**): sola lettura (`better-sqlite3 {readonly:true}`), mai su `data/`.
Le righe `file:riga` sono quelle lette il 24/10 nel worktree con modifiche non committate di altre sessioni (`shared/types.ts` si è già spostato di 10 righe durante la lettura): rileggere prima di citarle.

---

## 1. Tabella delle voci

Nessuna delle 11 voci è soddisfatta per intero. Soddisfatti alcuni **mattoni** e alcuni **sottopunti** (elencati in §2.1): l'implementatore li riusa, non li riscrive.

| Voce | Stato | Prova (cosa c'è) / modifica precisa (cosa manca) |
|---|---|---|
| **R11-07/1** endpoint di ricerca normalizzata | **da fare** | Prova dell'assenza: `server/routes/index.ts:29-44` (`ROUTER_DI_AREA` senza `/api/ricerca`); grep di `ricercaService`, `api/ricerca`, `RicercaGlobale` in `server/`, `shared/`, `src/` = 0 risultati. Mattoni: `normalizzaTesto` (`shared/testo.ts:6`) e `corrispondeRicerca` (`:17`); registro d'invalidazione (`cacheDiGioco.ts:20,26`). **Modifica**: §3 (`shared/ricerca.ts`, DTO, `schemas/ricerca.ts`, `routes/ricerca.ts`, `services/ricerca/*`, migrazione dei sinonimi, middleware d'invalidazione). |
| **R11-07/3** destinazioni canoniche dei risultati | **parziale** | Case già calcolate: `casaDelLuogo` (`luoghiService.ts:72`), `casaDellArea` (`casaMappa.ts:60`), `casaDelPalazzo` (`:69`), `casaOggetto` (`shared/catalogo.ts:76`); rotte esistenti in `src/router.tsx:68-112` per quartiere, area, Palazzo, luogo, negozio, Confidente, Persona, Skill, oggetto, giorno. **Mancano**: la casa di infiltrazione, dedalo, voce (si risolvono sulla scheda del Palazzo: §4), e dei tipi **senza pagina propria** (Richieste, attività, trofei, sfide): §3.6, decisione D1. Libri, film, videogiochi **hanno già** una pagina (oggetto del catalogo): §2.2. **Modifica**: registro `Record<TipoRicerca, …>` che rende la casa obbligatoria per tipo (§3.7). |
| **R11-08/2** percorso gerarchico | **da fare** | Mattoni: `contestoAree()` (`casaMappa.ts:39`) e `contenitoreDi` (`:49`) danno quartiere/Palazzo di un'Area; `nomiQuartieri`/`nomiDungeon` già letti insieme. **Modifica**: campo `percorso: string[]` costruito alla creazione dell'indice (§3.7, tabella §4); il FE lo unisce con « › ». |
| **R11-08/3** immagini dal risolutore unico | **parziale** | Il risolutore di L1 è `illustrazioneDellaMappa(chiave, db, caricate)` (`immagineMappa.ts:54`) con `immaginiCaricateDelleMappe` (`:24`); FE: `useImmagineMappa` (`src/hooks/useImmagineMappa.ts`) accetta qualunque `{immagineUrl, asset}` e rispetta la grafica predefinita (`useAsset`, `assetStore.ts`). **Modifica**: ogni risultato porta `immagine: IllustrazioneDto \| null`; per i tipi derivati dalle mappe si chiama il risolutore, per gli altri la chiave `asset` per convenzione (§3.8); il FE usa `useImmagineMappa` per tutti. |
| **R11-09/1** ogni tipo ha voce e destinazione | **da fare** | Nessun controllo oggi. **Modifica**: `TIPI_RICERCA` + un `Record<TipoRicerca, CostruttoreTipo>`: un tipo senza costruttore (quindi senza voce e senza casa) **non compila**; controllo statico + procedura di sola lettura per l'utente (§6). |
| **R11-10/1** nascosti rispettati | **parziale** | Le viste filtrano `nascosto = 0`: `luoghiService.ts:98,113,228`, `catalogoOggettiLetture.ts:80`; colonna presente su `luogo`, `negozio`, `attivita`, `libro`, `film`, `catalogo_oggetto`. Misura: `negozio` 1 nascosto, `catalogo_oggetto` 0, `luogo` 0, `attivita` 0. **Modifica**: ogni costruttore di tipo con la colonna filtra come la sua vista (tabella §4). |
| **R11-10b/1** luogo chiuso adesso si trova, con motivo | **parziale** | Mattone: `presenzaDelLuogo` (`luoghiService.ts:125-137`) produce già «Aperto/Chiuso adesso · orari» e «Non ancora nel mondo · motivo» (DTO `PresenzaLuogoDto`); `presenzaDelNegozio` (`:141`); `luogoDto` (`:147`). Il luogo chiuso **non è escluso** da nessuna query della ricerca (non esiste). **Modifica**: con `?partita=` il servizio calcola `stato` solo per i luoghi e negozi del risultato (§3.9); senza partita `stato = null`. |
| **R11-10b/3** aree «da verificare» col loro segno | **parziale** | Colonna `area.da_verificare` (misura: 1 riga, «Area riservata allo staff», contenitore `tokyo`); `areaRifDellaMappa.daVerificare` (`casaMappa.ts:110`); segno in uso: `<span className="chip chip--attivo text-[11px]">Da verificare</span>` (`src/components/mappe/AreeDellaCitta.tsx:68`). **Modifica**: `stato = { tipo: 'da-verificare', testo: 'Da verificare' }` sull'indice (non dipende dalla partita) e lo stesso chip nel FE. |
| **R11-07/2** accesso da ogni pagina | **da fare** | `Topbar.tsx` (header `h-[60px] lg:h-[68px]`) ha logo, selettore partita e, sotto `lg`, i soli pulsanti Guida e Impostazioni (`:41-52`); `BottomNav` filtra `principale` e ne ammette **al massimo 5** (`navigazione.tsx:15`), già 5. **Modifica**: pulsante «Cerca» nella `Topbar` a ogni larghezza, scorciatoia `/`, finestra `RicercaGlobale` montata in `MainLayout` (§5). La `BottomNav` **non** cambia (è piena). |
| **R11-08/1** raggruppamento per tipo | **da fare** | Mattone: etichette dei gruppi degli oggetti `GRUPPI_OGGETTO` (`shared/catalogo.ts:37`). **Modifica**: `ETICHETTE_RICERCA` in `shared/ricerca.ts` + gruppi nella risposta (`GruppoRicercaDto`) + intestazioni nel FE (§3.2, §5). |
| **R11-10b/2** nomi dei posti, mai «Mappa»/«atlante» | **parziale** | Per la ricerca: nessun testo scritto, quindi il vincolo si rispetta **per costruzione** (etichette e testi in `shared/ricerca.ts`). Per l'albero e per i titoli esistenti restano «Mappe» (`src/components/guida/sezioniGuida.tsx:25`, `MappaPage.tsx:160,508`) e «Sulla mappa di Tokyo» (`AtterraggioTokyo.tsx:81`): sono di **B5** (R11-11, «Luoghi della guida»). La voce `R11-10b/2` riguarda «ricerca e albero»: **B4 ne chiude la metà ricerca; la voce si chiude solo con B5** (§8). |

### 2.1 Sottopunti già soddisfatti (da non riscrivere)

- **Apostrofi e punteggiatura dei nomi** («Jack-o'-Lantern» con apostrofo dritto o curvo, trattini): `normalizzaTesto` toglie tutto ciò che non è `[a-z0-9]` e gli accenti (`shared/testo.ts:6-8`) → «jack o lantern». G-038 riga 3 non richiede sinonimi per questo.
- **Varianti di grafia Koropokguru/Koropokkuru e Norna/Norn** (G-038 riga 3): sulla copia `traduzione` ha già `persona/Koropokkuru → «Koropokguru»` e `persona/Norn → «Norna»`; `persona.nome` resta il nome originale. Basta che l'indice usi `t('persona', nome)` come nome e `persona.nome` come nome altro (§3.7): **nessuna riga di sinonimi per queste due Persona**. Vale per tutte le 59 Persona il cui nome italiano differisce dall'originale (misura: 59 su 232).
- **«Jinbocho / Kanda»** (G-038 riga 6): il quartiere si chiama «Kanda / Jinbocho» (`quartiere.chiave = kanda-jinbocho`): la ricerca per parola trova già sia «Kanda» sia «Jinbocho».
- **Nomi in codice dei membri**: sono già nel dato `dati_guida.personaggi[*].nomeCodice` (Skull, Panther, Mona, Fox, Queen, Oracle, Noir, Crow, **Violet** per Kasumi). G-038 vuole comunque un blocco editabile (§3.8): non derivarli dal blocco `personaggi` (sarebbe una seconda fonte).

### 2.2 Scoperte che cambiano il piano di `modifiche.md`

1. **Libri, film e videogiochi hanno già una pagina per ogni elemento**: l'oggetto del catalogo `/guida/oggetto/<categoria>/<slug>` (`casaOggetto`). Misura: `libro` 46/46 con `catalogo_chiave`, `film` 30/30, `attivita` di tipo `videogioco` 7/7; `catalogo_oggetto` categoria `libro` 46, `film` 30, `videogioco` 7. Quindi la decisione §8.10 di `preparazione` («casa dei tipi senza pagina propria») **non riguarda** libri, film e videogiochi (D1).
2. **`invalidaCacheDiGioco` non basta**: la chiamano solo alcuni scrittori (`catalogoService`, `areeService`, `luoghiScritture`, `cestinoService`, `impostazioniService`, `pacchettoGioco`…, elenco con grep al §3.10). **Non la chiamano** `dungeonService` (36 scritture su tabelle indicizzate), `mappeService` (28), `legamiInfiltrazioni` (10), `richiesteService` (5), `atterraggioPalazziService` (3), `traduzioniService` (usa solo la propria `invalidaCacheTraduzioni`), `cittaService` (2). Un indice agganciato solo a `registraCacheDiGioco` resterebbe vecchio dopo aver rinominato una voce, un Palazzo o una traduzione. Soluzione: middleware centrale (§3.10).
3. **La `BottomNav` è piena** (5 voci, tetto dichiarato in `navigazione.tsx:15`): il pulsante «Cerca» sta nella `Topbar`.
4. **`?elemento=<chiave>` esiste solo dentro il pannello della scheda sopra il diario** (`PARAMETRO_ELEMENTO`, `src/utils/pannelloScheda.ts:24`; `PannelloScheda.tsx:48-58` passa `soloChiave` alle pagine). Aperto come pagina normale, `/guida/richieste?elemento=x` non filtra niente. Per Richieste e attività la pagina ha già la modalità `soloChiave` (`RichiestePage.tsx:170,209`, `AttivitaPage.tsx:134,152`): basta farla leggere anche dall'indirizzo (§5.6). Trofei e sfide non l'hanno.
5. **Una voce della guida (`punto_interesse`, 960) non ha pagina propria**: la sua casa è l'infiltrazione del suo Palazzo, `/guida/dungeon/<palazzo>?infiltrazione=<dungeon_area.chiave>`; per i Memento `?area=<dedalo>` (`DungeonDettaglioPage.tsx:224-231`).
6. **Iweleth compare due volte** nei dati (dungeon `iweleth` con `regola_boss = 'memento'` e dedalo `mementos-08-iweleth`): finché L8 B7 non lo sistema la ricerca mostrerà due risultati con lo stesso nome in gruppi diversi («Palazzi e Memento», «Dedali»). Non è un errore dell'indice.
7. **Il `scripts/copertura-accesso.ts`** (`npm run accesso:copertura`, `--dati <cartella>`) è il precedente di una misura di copertura a sola lettura su tutto l'inventario: è il modello del controllo R11-09 (§6), ma **la regola del lotto vieta all'agente di scrivere o eseguire il collaudo completo** (`stato.json` voce `R11-09/collaudo-utente`).

---

## 3. B3 — disegno del backend

### 3.1 File

| File | Nuovo/esistente | Contenuto |
|---|---|---|
| `shared/ricerca.ts` | nuovo | `TIPI_RICERCA`, `TipoRicerca`, `ETICHETTE_RICERCA`, costanti dei limiti, `PARAMETRO_ELEMENTO` |
| `shared/types.ts` | esistente | `import type { TipoRicerca } from './ricerca.js'` + DTO della ricerca (§3.3) |
| `server/schemas/ricerca.ts` | nuovo | `queryRicerca` (§3.4) |
| `server/routes/ricerca.ts` | nuovo | `GET /` (§3.5) |
| `server/routes/index.ts` | esistente | una riga in `ROUTER_DI_AREA` e un `import` |
| `server/openapi/descrizioni/ricerca.ts` | nuovo | `DESCRIZIONI_RICERCA` (§3.6) |
| `server/openapi/descrizioni/index.ts` | esistente | `import`, una voce in `AREE` (`'/api/ricerca'`), uno spread in `DESCRIZIONI` |
| `server/services/ricerca/indiceRicerca.ts` | nuovo | costruzione, memoria e invalidazione dell'indice (§3.7, §3.10) |
| `server/services/ricerca/sinonimiRicerca.ts` | nuovo | lettura e validazione del blocco `sinonimi-ricerca`, regola delle abbreviazioni (§3.8) |
| `server/services/ricerca/statoRicerca.ts` | nuovo | stato dei luoghi e dei negozi con la partita (§3.9) |
| `server/services/ricercaService.ts` | nuovo | `cercaGlobale` (punteggio, gruppi, limite) |
| `server/middleware/indiceRicerca.ts` | nuovo | invalidazione dopo le scritture (§3.10) |
| `server/bootstrap.ts` | esistente | `app.use('/api', indiceRicercaDopoScritture)` prima dei router di area (riga 46) |
| `server/db/migrations/<N>_sinonimi_ricerca.ts` + `index.ts` | nuovo / esistente | inserisce il blocco (§3.8); `<N>` = primo numero libero **al momento del lavoro** (oggi registrate fino alla 167, altre sessioni ne aggiungono) |

Non si tocca `luoghiService.ts`, `casaMappa.ts`, `areeService.ts`, `immagineMappa.ts`: sono importati in sola lettura (così B5, B8 e B9 non confliggono; vedi §8).

### 3.2 `shared/ricerca.ts` (testo proposto)

```ts
// ============================================================
// ricerca — i tipi di oggetto della ricerca globale, le etichette dei gruppi e i limiti: condivisi da server e interfaccia (L11)
// ============================================================
//
// Regola di R11-10b: le etichette dicono il tipo di cosa che si trova, mai «Mappa» né «atlante» per un posto. Un tipo che si aggiunge qui
// senza un costruttore nel server (`Record<TipoRicerca, …>` in `indiceRicerca.ts`) non compila: così ogni tipo ha voci e una casa (R11-09).

/** Nell'ordine in cui il server costruisce l'indice e, a parità di punteggio, l'interfaccia mostra i gruppi. */
export const TIPI_RICERCA = [
  'confidente', 'persona', 'skill', 'oggetto', 'libro', 'film', 'videogioco',
  'luogo', 'negozio', 'attivita', 'quartiere', 'citta', 'area', 'planimetria',
  'palazzo', 'infiltrazione', 'dedalo', 'area-dedalo', 'voce',
  'richiesta', 'giorno', 'trofeo', 'sfida',
] as const;
export type TipoRicerca = (typeof TIPI_RICERCA)[number];

/** Come si chiama un gruppo e un suo elemento (singolare per l'etichetta accessibile di un risultato). Mai «Mappa»/«atlante». */
export const ETICHETTE_RICERCA: Readonly<Record<TipoRicerca, { singolare: string; plurale: string }>> = {
  confidente: { singolare: 'Confidente', plurale: 'Confidenti' },
  persona: { singolare: 'Persona', plurale: 'Persona' },
  skill: { singolare: 'Skill', plurale: 'Skill' },
  oggetto: { singolare: 'Oggetto', plurale: 'Oggetti' },
  libro: { singolare: 'Libro', plurale: 'Libri' },
  film: { singolare: 'Film', plurale: 'Film e DVD' },
  videogioco: { singolare: 'Videogioco', plurale: 'Videogiochi' },
  luogo: { singolare: 'Luogo', plurale: 'Luoghi' },
  negozio: { singolare: 'Negozio', plurale: 'Negozi' },
  attivita: { singolare: 'Attività', plurale: 'Attività' },
  quartiere: { singolare: 'Quartiere', plurale: 'Quartieri' },
  citta: { singolare: 'Città', plurale: 'Città' },
  area: { singolare: 'Area', plurale: 'Aree' },
  planimetria: { singolare: 'Planimetria', plurale: 'Planimetrie' },
  palazzo: { singolare: 'Palazzo', plurale: 'Palazzi e Memento' },
  infiltrazione: { singolare: 'Infiltrazione', plurale: 'Infiltrazioni' },
  dedalo: { singolare: 'Dedalo', plurale: 'Dedali' },
  'area-dedalo': { singolare: 'Area del dedalo', plurale: 'Aree dei dedali' },
  voce: { singolare: 'Voce della guida', plurale: 'Voci della guida' },
  richiesta: { singolare: 'Richiesta', plurale: 'Richieste' },
  giorno: { singolare: 'Giorno', plurale: 'Giorni' },
  trofeo: { singolare: 'Trofeo', plurale: 'Trofei' },
  sfida: { singolare: 'Sfida', plurale: 'Sfide' },
};

export const MIN_CARATTERI_RICERCA = 2;
export const LIMITE_PREDEFINITO_RICERCA = 8;
export const LIMITE_MASSIMO_RICERCA = 50;
/** Il parametro d'indirizzo che dice quale elemento di un elenco mostrare (lo legge il pannello della scheda e, da B4, anche la pagina). */
export const PARAMETRO_ELEMENTO = 'elemento';
```

Una riga di `src/utils/pannelloScheda.ts` (`export const PARAMETRO_ELEMENTO = 'elemento';` a `:24`) diventa `export { PARAMETRO_ELEMENTO } from '../../shared/ricerca';` (fonte unica; tocca un file di L10 R10-27: modifica di una riga, nessun cambiamento di comportamento). Se si preferisce non toccarlo, si lascia la duplicazione e si registra in «Decisioni».

L'ordine dei gruppi nella risposta **non** è quello dell'array: è per punteggio migliore del gruppo, poi per l'ordine dell'array (§3.7). L'array dà l'ordine di costruzione e di parità.

### 3.3 DTO in `shared/types.ts` (testo proposto, in fondo al file, sezione «Ricerca globale (L11)»)

```ts
// ---- Ricerca globale (L11 B3, R11-07…R11-10b) ----

/** Il segno di un risultato: il posto è chiuso adesso o non ancora aperto (con la partita, R11-10b), o l'area è da verificare. `testo` è già scritto
 *  dalla regola unica di L5 (`presenzaDelLuogo`), mai riscritto dall'interfaccia. */
export interface StatoRicercaDto { tipo: 'chiuso-adesso' | 'non-ancora-aperto' | 'da-verificare'; testo: string }

/** Un oggetto trovato. */
export interface RisultatoRicercaDto {
  tipo: TipoRicerca;
  /** Chiave dell'oggetto nel suo tipo (per Persona e Skill l'id come testo): serve alla chiave React e a «Mostra altri». */
  chiave: string;
  /** Il nome come lo mostrano le pagine (italiano). */
  nome: string;
  /** Il nome originale o il sinonimo per cui è stato trovato, se non è il nome mostrato («Queen» per Makoto); null se ha trovato il nome. */
  trovatoCome: string | null;
  /** Il posto nella gerarchia dal contenitore più grande, senza il nome stesso: ['Tokyo', 'Shibuya', 'Central Street']; vuoto per le radici e per i tipi senza gerarchia. */
  percorso: string[];
  /** La pagina dell'oggetto: sempre un indirizzo del router (mai il visore `/guida/mappe/<chiave>`). */
  casa: string;
  /** L'immagine con la regola unica (`immagineMappa.ts` per i posti): la caricata, poi l'asset predefinito; null se il tipo non ha un'immagine. */
  immagine: IllustrazioneDto | null;
  stato: StatoRicercaDto | null;
}

/** I risultati di un tipo: `totale` è quanti corrispondono, `risultati` i migliori fino al limite. */
export interface GruppoRicercaDto { tipo: TipoRicerca; totale: number; risultati: RisultatoRicercaDto[] }

/** La risposta di `GET /api/ricerca`: i gruppi in ordine di miglior corrispondenza; nessun gruppo vuoto. */
export interface RicercaGlobaleDto { q: string; totale: number; gruppi: GruppoRicercaDto[] }
```

In testa a `types.ts` va aggiunto `import type { TipoRicerca } from './ricerca.js';` accanto agli altri `import type` (righe 11-20). `openapi.test.ts` (riga «i tipi …Dto citati nelle risposte esistono in shared/») cerca `export interface/type` in tutti i file di `shared/`: `RicercaGlobaleDto` e `RisultatoRicercaDto` soddisfano il controllo.

### 3.4 Schema zod — `server/schemas/ricerca.ts`

```ts
import { z } from 'zod';
import { idParam } from './comuni.js';
import { LIMITE_MASSIMO_RICERCA, LIMITE_PREDEFINITO_RICERCA, MIN_CARATTERI_RICERCA, TIPI_RICERCA } from '../../shared/ricerca.js';

/** I tipi da cercare, separati da virgola («luogo,negozio»); un tipo che non esiste è un 400. */
const elencoTipi = z.string()
  .transform((s) => s.split(',').map((x) => x.trim()).filter((x) => x.length > 0))
  .pipe(z.array(z.enum(TIPI_RICERCA)).min(1).max(TIPI_RICERCA.length));

/** `GET /api/ricerca`: il testo (≥ 2 caratteri), i tipi (tutti se manca), i risultati per gruppo e la partita per lo stato di luoghi e negozi. */
export const queryRicerca = z.object({
  q: z.string().trim().min(MIN_CARATTERI_RICERCA).max(100),
  tipi: elencoTipi.optional(),
  limite: z.coerce.number().int().min(1).max(LIMITE_MASSIMO_RICERCA).default(LIMITE_PREDEFINITO_RICERCA),
  partita: idParam.optional(),
});
```

Il documento OpenAPI converte lo schema con `z.toJSONSchema(…, { io: 'input', unrepresentable: 'any' })` (`server/openapi/documento.ts:47`): `transform`+`pipe` sono già usati da `elencoInteri` (`comuni.ts`), quindi non danno problemi. Una `q` fatta solo di punteggiatura (`--`) passa lo schema e il servizio risponde con `gruppi: []` (non è un errore).

### 3.5 Rotta — `server/routes/ricerca.ts`

```ts
import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { queryRicerca } from '../schemas/ricerca.js';
import { cercaGlobale } from '../services/ricercaService.js';
import type { TipoRicerca } from '../../shared/ricerca.js';

const router = Router();

/** Ricerca globale per nome (italiano, originale, sinonimi): i risultati raggruppati per tipo con percorso, casa, immagine e stato (R11-07…R11-10b). */
router.get('/', validate({ query: queryRicerca }), (req, res) => {
  const q = req.query as unknown as { q: string; tipi?: TipoRicerca[]; limite: number; partita?: number };
  // lo stato di luoghi e negozi dipende dalla partita: la risposta non si tiene in cache
  res.set('Cache-Control', 'no-store').json(cercaGlobale(q));
});

export default router;
```
In `routes/index.ts`: `import ricercaRouter from './ricerca.js';` e, nell'array, `['/api/ricerca', ricercaRouter],` (dopo `/api/luoghi`, riga 42). La chiave per OpenAPI è `'GET /api/ricerca'` (la rotta `/` di un router con prefisso non aggiunge `/`: `rotte.ts:41`, come `GET /api/font`).

### 3.6 OpenAPI — `server/openapi/descrizioni/ricerca.ts` (testo proposto)

```ts
// ============================================================
// descrizioni/ricerca — la rotta di /api/ricerca: la ricerca globale per nome (L11, R11-07…R11-10b)
// ============================================================

import type { DescrizioniArea } from '../tipi.js';

/** Le descrizioni delle rotte di `server/routes/ricerca.ts` (servizio `ricercaService`). */
export const DESCRIZIONI_RICERCA: DescrizioniArea = {
  'GET /api/ricerca': {
    sommario: 'Cerca per nome in tutta la guida: posti, oggetti, Persona, Confidenti, voci e giorni',
    descrizione: 'Sola lettura. Confronto senza maiuscole, accenti e punteggiatura, sul nome mostrato, sul nome originale e sui sinonimi del blocco `sinonimi-ricerca`; da 2 caratteri, tutte le parole del testo devono comparire nello stesso nome. I risultati sono raggruppati per tipo (`tipi` li limita, separati da virgola) e ordinati per qualità della corrispondenza: nome uguale, nome che comincia così, parola del nome, testo contenuto; i nomi altri contano dopo il nome. Ogni risultato porta il percorso nella gerarchia, la pagina (`casa`), l\'immagine con la regola unica e, per i luoghi e i negozi con `partita`, lo stato «Chiuso adesso» o «Non ancora nel mondo» con il motivo; un\'area «da verificare» porta il suo segno anche senza partita. Le cose nascoste dall\'utente non compaiono; i luoghi chiusi sì (la ricerca è consultazione, non navigazione). `limite` vale per gruppo (8 per predefinito, 50 al massimo); `totale` di ogni gruppo dice quanti corrispondono. Non cerca nei testi lunghi (descrizioni, diario).',
    risposta: 'RicercaGlobaleDto (shared/types.ts): `q`, `totale` e i gruppi `GruppoRicercaDto` con i `RisultatoRicercaDto`',
    errori: [[400, 'validation-error'], [404, 'partita-non-trovata']],
  },
};
```
In `descrizioni/index.ts`: `import { DESCRIZIONI_RICERCA } from './ricerca.js';`, in `AREE` (riga 27 e seguenti): `'/api/ricerca': { nome: 'Ricerca', descrizione: 'La ricerca globale per nome su tutti gli oggetti della guida, con percorso, pagina e immagine.' },` (senza questa voce `openapi.test.ts` fallisce su «ogni area di montaggio ha un nome»), e `...DESCRIZIONI_RICERCA,` in `DESCRIZIONI` (riga 47-62). Vincoli del test già soddisfatti: sommario ≤ 120 caratteri e senza punto finale; descrizione ≥ 20; `risposta` non vuota; `RicercaGlobaleDto` esiste in `shared/`; i codici `'validation-error'` e `'partita-non-trovata'` compaiono come stringhe tra apici in `server/` (`validate.ts`, `verificaPartita.ts:20`). La GET non scrive: nessun `senzaProva`.

### 3.7 Indice in memoria — `server/services/ricerca/indiceRicerca.ts`

```ts
import type { AppDatabase } from '../../db/dbService.js';
import type { IllustrazioneDto } from '../../../shared/types.js';
import type { TipoRicerca } from '../../../shared/ricerca.js';

/** Una riga dell'indice: tutto ciò che serve a trovare un oggetto e a mostrarlo, calcolato una volta. */
export interface VoceIndice {
  tipo: TipoRicerca;
  chiave: string;
  nome: string;
  /** `normalizzaTesto(nome)`; vuoto se il nome non ha lettere latine (la riga non entra nell'indice). */
  nomeN: string;
  /** Nomi originali e sinonimi, col testo da mostrare in «trovato come» e la forma normalizzata (senza doppioni del nome). */
  altri: ReadonlyArray<{ testo: string; n: string }>;
  percorso: readonly string[];
  casa: string;
  immagine: IllustrazioneDto | null;
  /** Per lo stato con la partita: i luoghi e i negozi si valutano con `presenzaDelLuogo`/`presenzaDelNegozio`. */
  presenza: { tipo: 'luogo' | 'negozio'; chiave: string } | null;
  /** Il segno fisso, indipendente dalla partita (area «da verificare»). */
  segno: 'da-verificare' | null;
}

/** I dati che più costruttori leggono: una lettura sola per costruzione dell'indice. */
export interface ContestoIndice {
  db: AppDatabase;
  /** `contestoAree(db)`: Aree, nomi dei quartieri e dei dungeon. */
  aree: ContestoAree;
  /** `immaginiCaricateDelleMappe(db)`. */
  caricate: Map<string, string>;
  /** Chiavi dell'ambito `confidenti` nella tabella `immagine` (per scegliere `-fedele`). */
  assetConfidenti: Set<string>;
  /** Mappa del quartiere → chiave, e planimetria predefinita di ogni Area: una funzione sola, `mappaDelQuartiere` (punto unico che B9 aggiorna). */
  mappaDelQuartiere: Map<string, string>;
  /** Sinonimi del blocco `sinonimi-ricerca` già validati: `tipo|chiave` → nomi. */
  sinonimi: Map<string, string[]>;
  /** Abbreviazioni attestate per gli oggetti. */
  abbreviazioni: ReadonlyArray<{ abbreviazione: string; esteso: string }>;
}

type CostruttoreTipo = (ctx: ContestoIndice) => VoceIndice[];

/** Un costruttore per tipo: aggiungere un tipo a `TIPI_RICERCA` senza il suo costruttore non compila (R11-09/1). */
const COSTRUTTORI: Record<TipoRicerca, CostruttoreTipo> = { /* uno per tipo: tabella §4 */ };

/** Costruisce l'indice leggendo il database (di default quello dell'app, o una copia aperta in sola lettura per i controlli). */
export function costruisciIndice(db?: AppDatabase): VoceIndice[];

/** L'indice in memoria, costruito alla prima richiesta e tenuto fino all'invalidazione. */
export function indiceRicerca(): readonly VoceIndice[];

/** Svuota l'indice: lo chiama `invalidaCacheDiGioco` (registro comune) e il middleware delle scritture (§3.10). */
export const invalidaIndiceRicerca: () => void;   // = registraCacheDiGioco(() => { memoria = null; }), come datiGuida.ts:63
```

Regole di costruzione:
1. Una `VoceIndice` per oggetto; il costruttore salta le righe con `nomeN === ''` e quelle che non hanno una `casa` (non devono esistere: se capita, errore di costruzione che nomina tipo e chiave, mai una voce silenziosamente persa).
2. **Il nome è quello che mostra la pagina**: Persona `t('persona', nome)` (`traduzioniService.ts:52`), Skill `t('skill', nome)`, oggetti `catalogo_oggetto.nome`; il nome originale (`persona.nome`, `skill.nome`, `catalogo_oggetto.nome_originale`, `nomiAltriOggetto(nomi_altri_json)` — `catalogoOggettiLetture.ts:23` — e `libro.nome`/`film.nome` se diversi da `nome_it`) va in `altri`.
3. `altri` non ripete il nome (confronto sulla forma normalizzata) né se stesso; si aggiungono i sinonimi (§3.8) e le espansioni delle abbreviazioni (§3.8).
4. L'indice è **una lista piatta** (circa 4.200 voci sulla copia, §4): la scansione lineare con `includes` costa circa 0,2 ms per ricerca (misura su 6.412 stringhe normalizzate: 200 ricerche in 35 ms); costruire le stringhe normalizzate di 6.412 righe costa circa 26 ms di lettura SQL e normalizzazione. Niente indice invertito, niente dipendenze nuove.
5. **Nessuna chiamata a servizi con stato di partita** nella costruzione: l'indice dipende solo dai dati di gioco (così si può tenere in memoria fino a un'invalidazione).

`cercaGlobale` (in `ricercaService.ts`):

```ts
export interface ParametriRicerca { q: string; tipi?: readonly TipoRicerca[]; limite: number; partita?: number }
export function cercaGlobale(p: ParametriRicerca): RicercaGlobaleDto;

/** Pura: null se la voce non corrisponde; altrimenti il punteggio (più basso = meglio) e il nome altro per cui ha corrisposto. */
export function corrisponde(parole: readonly string[], v: VoceIndice): { punti: number; trovatoCome: string | null } | null;
```
- `parole = normalizzaTesto(q).split(' ')` (se vuoto → `{ q, totale: 0, gruppi: [] }`).
- Una voce corrisponde se **esiste una stringa** (`nomeN` o un `altri[i].n`) che contiene **tutte** le parole (sottostringa). Punteggio, sulla stringa migliore: 0 uguale; 1 comincia (nome); 2 comincia (altro); 3 una parola del nome comincia così; 4 idem per un altro nome; 5 contiene (nome); 6 contiene (altro). `trovatoCome = null` se la corrispondenza è sul nome, altrimenti il `testo` dell'altro nome.
- Ordine nel gruppo: punteggio, poi lunghezza del nome, poi `nome.localeCompare(…, 'it')`. Ordine dei gruppi: punteggio migliore del gruppo, poi ordine di `TIPI_RICERCA`. (Raffina `modifiche.md` §2, che elencava «inizio del nome, parole, nomi altri»: un sinonimo uguale alla ricerca, come «Queen», deve battere un nome che lo contiene.)
- `limite` per gruppo; `totale` del gruppo = tutte le corrispondenze; `totale` generale = somma.
- Non si cerca nel percorso (decisione 4 di `requisiti.md`: solo nomi e titoli).

### 3.8 Immagini, sinonimi e abbreviazioni

**Immagine (`immagine: IllustrazioneDto | null`)** — convenzione per tipo, tutto con il risolutore di L1 o con la chiave `asset` che il FE risolve con `useAsset` (rispetta la preferenza «grafica predefinita»; l'immagine **caricata** dall'utente vince ovunque, come `useImmagineMappa`):
- posti (citta, quartiere, area, planimetria): `illustrazioneDellaMappa(chiaveMappa, db, ctx.caricate)` — mappa del quartiere da `mappaDelQuartiere` (oggi `mappa.tipo='quartiere' AND entita_tipo='quartiere'`, misura: 24/24; coincide con `citta-<chiave>`); Area → `area.planimetria_predefinita` (140/140 esistono); planimetria → la sua chiave; luogo e negozio con sede → quella dell'Area del luogo (`luogo.area_chiave`; 23 luoghi senza Area: `null`);
- `palazzo`: `{ immagineUrl: caricata di dungeon-<k> se c'è, asset: 'palazzi/<k>' }` (lo stemma: `illustrazioneDellaMappa` lo nasconde apposta per le radici con ruolo `emblema`, ma per il Palazzo lo stemma è la sua identità; `palazzi/` ha 10 chiavi nella tabella `immagine`);
- `persona`: caricata (ambito `persona`, chiave `persona.nome`) altrimenti `asset: persona/<slug(persona.nome)>` (come `chiaviAssetPredefinito`, `src/utils/assetPredefiniti.ts`; i file stanno in `public/asset/persona`, che il server non vede: la convenzione basta, il FE ha il segnaposto);
- `confidente`: `asset: confidenti/<chiave>-fedele` se `ctx.assetConfidenti` ha `<chiave>-fedele`, altrimenti `confidenti/<chiave>`;
- `skill`: `asset: elementi/<skill.elemento>` (come `SkillPage.tsx:56`);
- `attivita`: `asset: attivita/<chiave>` (30 immagini predefinite per 30 attività);
- tutti gli altri tipi: `null` (il FE mette l'icona del tipo).
Una funzione `urlImmagineCaricata(ambito, chiave, createdAt)` locale al servizio compone `/api/immagini/<ambito>/<chiave>/file?v=<versioneImmagine(createdAt)>` (stesso formato di `urlCaricata`, `immagineMappa.ts:45`, ma `urlCaricata` è specifica della mappa e non si tocca).

**Blocco `dati_guida.sinonimi-ricerca`** (G-038 B; `modifiche.md` §2) — formato:

```json
{
  "versione": 1,
  "fonte": "G-038 (registro dell'Esperto della guida, 2026-10-20)",
  "sinonimi": [
    { "tipo": "confidente", "chiave": "ryuji",   "nomi": ["Skull"] },
    { "tipo": "confidente", "chiave": "ann",     "nomi": ["Panther"] },
    { "tipo": "confidente", "chiave": "morgana", "nomi": ["Mona"] },
    { "tipo": "confidente", "chiave": "yusuke",  "nomi": ["Fox"] },
    { "tipo": "confidente", "chiave": "makoto",  "nomi": ["Queen"] },
    { "tipo": "confidente", "chiave": "futaba",  "nomi": ["Oracle"] },
    { "tipo": "confidente", "chiave": "haru",    "nomi": ["Noir"] },
    { "tipo": "confidente", "chiave": "akechi",  "nomi": ["Crow"] },
    { "tipo": "confidente", "chiave": "kasumi",  "nomi": ["Sumire", "Violet"] },
    { "tipo": "palazzo", "chiave": "niijima", "nomi": ["Palazzo di Sae"] },
    { "tipo": "palazzo", "chiave": "maruki",  "nomi": ["Palazzo sconosciuto"] },
    { "tipo": "palazzo", "chiave": "mementos", "nomi": ["Mementos"] },
    { "tipo": "area", "chiave": "citta/yongen-jaya/covo-dei-ladri", "nomi": ["Thieves Den", "Covo"] }
  ],
  "abbreviazioni": [
    { "abbreviazione": "Portaf.", "esteso": "Portafortuna" },
    { "abbreviazione": "Amul.", "esteso": "Amuleto" },
    { "abbreviazione": "Spec.", "esteso": "Specchio" }
  ]
}
```
- `tipo` ∈ `TIPI_RICERCA`; `chiave` = la chiave del tipo **come nell'indice**, ma per `persona` e `skill` il **nome originale** (`persona.nome`, `skill.nome`, la stessa chiave di `traduzione`), non l'id numerico. `nomi`: da 1 a 8 voci, al più 80 caratteri, senza doppioni dopo la normalizzazione.
- Una riga che punta a un oggetto che non c'è **non fa errore**: si salta e la procedura §6 la elenca come «in attesa». Vale per le righe di G-038 il cui oggetto nasce dopo: le 27 Persona del gruppo in inglese (Hecate, Mercurius, Johanna, Prometheus, Hereward, Cendrillon, Célestine: oggetti di **L8**, la cui chiave non è ancora decisa), le Ombre (L8), «Joker» (non esiste una voce per il protagonista: decisione D6), «Stanza di Velluto/Velvet Room» (nessun luogo o area con quel nome nei dati: `luogo`, `area`, `mappa`, `attivita` senza risultati sulla copia). **Non inserirle ora**: le aggiungerà chi crea quegli oggetti.
- Le abbreviazioni sono una regola: per ogni oggetto del catalogo il cui `nome` **comincia** per una `abbreviazione` (confronto senza maiuscole, al limite di parola) si aggiunge in `altri` il nome con l'abbreviazione sostituita («Portaf. del supporto» → «Portafortuna del supporto»). Misura: 70 oggetti hanno un'abbreviazione (An. 16, Portaf. 9, Cint. 9, Cav. 6, Spec. 5, Fascia capel. 3, Portafort. 1, Amul. 0…); G-038 ne attesta solo tre: 14 oggetti. Le altre (An., Cint., Cav.…) **non si inventano** (`shared/catalogo.ts:87`, G-024): D5.
- Lettura: `datiGuida<…>('sinonimi-ricerca')` (`datiGuida.ts:38`: congelato, in memoria, svuotato dal registro comune). Se manca o è illeggibile: nessun sinonimo e nessun errore (il blocco è un arricchimento).
- Dove nasce: **una migrazione** (`INSERT OR IGNORE INTO dati_guida(chiave, json) VALUES ('sinonimi-ricerca', ?)`, idempotente e senza toccare altro; una base nuova la riceve dal pacchetto iniziale solo se si rigenera: per questo va in migrazione e non nel file `pacchetto/gioco.db`). Il blocco **ha un lettore** (`sinonimiRicerca.ts`), quindi non aggrava i 18 blocchi senza lettori di R11-01. `OR IGNORE` conserva una futura modifica dell'utente.
- Modificabilità: «modificabile con `correzione_dati_guida`» (`modifiche.md` §4) è di **B11**: B3 deve leggere il blocco **solo** tramite `sinonimiRicerca.ts`, così B11 potrà far leggere lì la versione corretta senza toccare l'indice.

### 3.9 Stato di luoghi e negozi (R11-10b/1) — `server/services/ricerca/statoRicerca.ts`

```ts
/** Lo stato adesso dei luoghi e dei negozi fra i risultati, per la partita; vuoto senza partita. Sola lettura: legge i servizi di L5/L6, non li modifica. */
export function statoDeiRisultati(voci: readonly VoceIndice[], partita: number | undefined): Map<string, StatoRicercaDto>;
```
- `verificaPartita(partita)` (`verificaPartita.ts:20`) → 404 `partita-non-trovata`.
- Solo se fra i risultati restituiti c'è almeno un luogo o un negozio: `st = statoDisponibilitaPartita(partita)` (`disponibilitaService.ts:117`, costoso: una volta per richiesta) e `l = lettureLuoghi(partita, undefined, st)` (`luoghiService.ts:95`).
- Luogo: `luogoDto(l.righe.get(chiave)!, l).presenza` → `sbloccato === false` ⇒ `{ tipo: 'non-ancora-aperto', testo: presenza.testo }`; `aperto === false` ⇒ `{ tipo: 'chiuso-adesso', testo: presenza.testo }`; altrimenti nessuno stato. Negozio con sede: `presenzaDelNegozio(sede, eccezione, l, sbloccoJson)` (`:141`), con i dati di `l.sediNegozi`. Il testo è quello già generato («Chiuso adesso · …», «Non ancora nel mondo · motivo»): `modifiche.md` §2 lo diceva «Non ancora aperto», ma la fonte unica è `presenzaDelLuogo` e il testo non si riscrive in due posti.
- Area `da_verificare` e il suo `segno`: è già nell'indice, indipendente dalla partita: `stato = { tipo: 'da-verificare', testo: 'Da verificare' }`.
- Luoghi con `solo_eventi_confidente` (Sakura Residence, R5-20f): lo stato segue `presenzaDelLuogo`; il testo «solo durante gli eventi di …» non è nel suo risultato: **da verificare** se la pagina del luogo lo dice già (`luogoDto.soloEventiConfidente`, `luoghiService.ts:174`); in v1 non si aggiunge niente.
- La ricerca trova **anche** i luoghi chiusi: nessun filtro su presenza, solo su `nascosto`.

### 3.10 Invalidazione e sincronizzazione — `server/middleware/indiceRicerca.ts`

```ts
import type { NextFunction, Request, Response } from 'express';
import { invalidaIndiceRicerca } from '../services/ricerca/indiceRicerca.js';

/** Le aree dell'API che scrivono dati di gioco indicizzati; `/api/partite` e `/api/fusione` non li toccano. */
const AREE_CHE_SCRIVONO = /^\/(compendio|traduzioni|immagini|mappe|impostazioni|catalogo|catalogo-oggetti|aree|luoghi)(\/|$)/;

/** Dopo ogni scrittura riuscita su un'area che tocca i dati di gioco l'indice si ricostruisce alla prossima ricerca: un punto solo,
 *  invece di chiedere a ogni scrittore (dungeonService, mappeService, traduzioni… non chiamano `invalidaCacheDiGioco`) di ricordarsene. */
export function indiceRicercaDopoScritture(req: Request, res: Response, next: NextFunction): void {
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS' && AREE_CHE_SCRIVONO.test(req.path)) {
    res.on('finish', () => { if (res.statusCode < 400) invalidaIndiceRicerca(); });
  }
  next();
}
```
In `bootstrap.ts` (`:43-46`): `app.use('/api', indiceRicercaDopoScritture);` **prima** del ciclo dei router. Un middleware di app senza `route` non entra nell'elenco di `openapi/rotte.ts` (`rotteDellaPila` salta i layer senza `route`, `rotte.ts:37`).
Tre agganci insieme, perché nessuno copre tutto:
1. `registraCacheDiGioco` (`invalidaIndiceRicerca`): importazione del pacchetto, ripristino di una copia, `caricaPacchetto`, cestino, catalogo, aree, luoghi (chiamano già `invalidaCacheDiGioco`: `pacchettoGioco.ts:183,236`, `impostazioniService.ts:340`, `cestinoService.ts:707`…).
2. Il middleware: tutte le scritture HTTP delle aree sopra, comprese quelle che oggi non invalidano (dungeon: voci, aree, infiltrazioni; mappe: nome/Area/planimetria; traduzioni; immagini caricate: l'URL porta `?v=<createdAt>`).
3. Le migrazioni e le regole d'avvio girano **prima** di `listen`: l'indice si costruisce alla prima richiesta, non serve invalidare.
La ricostruzione è sincrona (`better-sqlite3`), quindi un'invalidazione non può interrompere una costruzione in corso. Il costo di una ricostruzione dopo una scrittura è di qualche decina di ms (la prima ricerca dopo la modifica); le scritture di partita (`/api/partite…`, la pesca, la fusione) **non** invalidano. Una scrittura fatta fuori dall'API (script, `sqlite3` a mano) non si vede finché non si riavvia il server o non si fa un'altra scrittura: limite dichiarato (§9).

---

## 4. Una riga per tipo di oggetto

Conteggi **misurati** sulla copia `sim-142b` (gioco 146); sono quelli che l'indice deve produrre, `nascosto` escluso. `casa` per tipo; `percorso` senza il nome. «B5/B9/B12/L8/L9» = lavoro che cambia la riga.

| Tipo | Tabella e colonne del nome | Altri nomi | Casa | Percorso | Immagine | Nascosto | Conteggio | Dipendenze |
|---|---|---|---|---|---|---|---|---|
| `citta` | `mappa` dove `chiave='tokyo'`: `nome` («Tokyo») | — | `/guida/citta` | `[]` | `illustrazioneDellaMappa('tokyo')` | — | 1 | — |
| `quartiere` | `quartiere.nome` | — (Jinbocho/Kanda già per parole, §2.1) | `/guida/citta/<chiave>` | `['Tokyo']` | `illustrazioneDellaMappa(mappaDelQuartiere)` | — | 24 | B9 toglie `mappa.entita_*`: aggiornare solo `mappaDelQuartiere` |
| `area` | `area.nome` (`da_verificare`, `citta_chiave`, `quartiere_chiave`, `dungeon_chiave`) | sinonimi (Covo dei Ladri) | `casaDellArea(riga)` (`casaMappa.ts:60`): `/guida/citta/<q>/<slug>`, `/guida/citta/tokyo/<slug>`, `/guida/dungeon/<p>/area/<slug>` | quartiere: `['Tokyo', quartiere]`; città: `['Tokyo']`; Palazzo: `['Tokyo', Palazzo]` | planimetria predefinita dell'Area | — | 140 (22 quartieri + 1 città + 117 Palazzi); `da_verificare = 1`: 1 | B9 |
| `planimetria` | `mappa.nome` delle mappe con `area_chiave` e **non** predefinite; nome mostrato = `<Area> — <versione_etichetta>` | `mappa.nome` se diverso | `casaDellArea(area, mappa.chiave)` (`…?planimetria=<chiave pubblica>`) | percorso dell'Area + `[nome Area]` | `illustrazioneDellaMappa(mappa.chiave)` | — | 133 (273 mappe con Area − 140 predefinite, che coincidono con l'Area); **escluse 8** `mappa` senza Area («Memento – aree fisse…», chiave `nativo-rmap-190-*`): la loro casa sarebbe il visore, la vista alternativa che R11-12 elimina; stanno in «Da collocare» dell'albero (B5) | B5 (nome versioni), B9 (`gruppo_immagini_json`) |
| `luogo` | `luogo.nome` | — | `casaDelLuogo(chiave)` (`luoghiService.ts:72`) | `['Tokyo', quartiere, Area?]` | planimetria predefinita dell'Area (23 luoghi senza Area: `null`) | `nascosto = 0` | 109 (0 nascosti) | B12 (colonne frase) non toccano `nome` |
| `negozio` | `negozio.nome` | — | `/guida/negozi/<chiave>` | percorso del luogo sede + `[nome luogo]` (senza sede: `[]`; **non** si legge `negozio.luogo_chiave`, copia che B12 può togliere) | quella del luogo sede | `nascosto = 0` e, con sede, `luogo.nascosto = 0` (sede nascosta: come nelle letture del catalogo, `catalogoOggettiLetture.ts:~151`, da riverificare) | 62 − 1 nascosto = 61 | B12 |
| `palazzo` | `dungeon.nome` (tipo `palazzo` e `mementos`) | sinonimi (Palazzo di Sae, Palazzo sconosciuto, Mementos) | `casaDelPalazzo(chiave)` (`casaMappa.ts:69`) | Palazzo: `['Tokyo']`; Memento: `[]` | `palazzi/<k>` (+ caricata di `dungeon-<k>`) | — | 10 (9 Palazzi + Memento); Iweleth qui e come dedalo | L8 B7 sposta Iweleth |
| `infiltrazione` | `dungeon_area.nome` dove `dungeon.tipo='palazzo'` | — | `/guida/dungeon/<palazzo>?infiltrazione=<chiave>` | `['Tokyo', Palazzo]` | quella del Palazzo | — | 91 | — |
| `dedalo` | `dungeon_area.nome` dove `dungeon.tipo='mementos'` («Dedalo di Qimranut»…) | — | `/guida/dungeon/mementos?area=<chiave>` | `['Memento']` | quella del Memento | — | 9 | L8 B7 |
| `area-dedalo` | `area_dedalo.nome` («Area 1», «Tutorial»…) | — | stessa del dedalo (`?area=<dedalo_chiave>`): l'area non ha indirizzo proprio | `['Memento', nome dedalo]` | quella del Memento | — | 95 | nomi generici: D4 |
| `voce` | `punto_interesse.nome` | — | casa dell'infiltrazione (Palazzo) o del dedalo di `area_chiave` (960/960 puntano a una `dungeon_area`; 33 hanno anche `area_dedalo_chiave`) | `['Tokyo', Palazzo, infiltrazione]` o `['Memento', dedalo]` | nessuna | nessuna colonna `nascosto` | 960 | nomi duplicati («Ombra agente security»): il percorso li distingue |
| `persona` | `persona.id`; nome = `t('persona', persona.nome)` | `persona.nome` (originale); sinonimi | `/compendio/persona/<id>` (`router.tsx`) | `[]` | caricata (`persona`/`persona.nome`) o `persona/<slug>` | nessuna colonna | 232 | L8 (27 Persona del gruppo, gruppi di forme): tipo da aggiungere dopo |
| `skill` | `skill.id`; nome = `t('skill', skill.nome)` | `skill.nome` | `/skill/<id>` | `[]` | `elementi/<elemento>` | — | 525 | L8 (elementi, R8-20c) |
| `oggetto` | `catalogo_oggetto.nome` (categorie diverse da libro/film/videogioco) | `nomi_altri_json`, `nome_originale`, abbreviazioni | `casaOggetto(chiave)` (`shared/catalogo.ts:76`) | `[]` | nessuna | `nascosto = 0` (0 nascosti) | 1298 − 46 − 30 − 7 = **1215** | L7 chiuso; B12 |
| `libro` | `catalogo_oggetto.nome` categoria `libro` | `libro.nome` se diverso | `casaOggetto(chiave)` (pagina esistente, D1) | `[]` | nessuna | `catalogo_oggetto.nascosto = 0` e `libro.nascosto = 0` | 46 | — |
| `film` | `catalogo_oggetto.nome` categoria `film` | `film.nome` se diverso | `casaOggetto(chiave)` | `[]` | nessuna | idem con `film.nascosto` | 30 | — |
| `videogioco` | `catalogo_oggetto.nome` categoria `videogioco` | — | `casaOggetto(chiave)` | `[]` | nessuna | `nascosto = 0` | 7 (le 7 attività di tipo `videogioco` **non** si indicizzano come attività: stesso nome, duplicate) | — |
| `confidente` | `confidente.nome` | sinonimi (nomi in codice, Sumire/Violet) | `/confidenti/<chiave>` | `[]` | `confidenti/<chiave>-fedele` o `confidenti/<chiave>` | nessuna colonna | 23 | L9 (elenco Confidenti, disponibilità) |
| `attivita` | `attivita.nome` (tipo ≠ `videogioco`) | — | `/guida/attivita?elemento=<chiave>` (richiede §5.6) | luogo sede + `[nome luogo]`; senza sede il quartiere (`luogo_chiave`: 1 attività senza né l'una né l'altro: `[]`) | `attivita/<chiave>` | `nascosto = 0` | 30 − 7 = 23 | L9 (pagina attività, `attivita.luogo/sblocco`) |
| `richiesta` | `richiesta.nome` | — | `/guida/richieste?elemento=<chiave>` (§5.6) | `['Memento', dedalo]` da `area_chiave` (33/33) | nessuna | nessuna colonna | 33 | — |
| `giorno` | `giorno_calendario.data` (`MM-GG`); nome = `dataLeggibile(data)` (`shared/condizioniSpillo.ts:266`, «9 aprile») | «Sabato 9 aprile» (con `giorno_settimana`), «04-09», «9/4» | `/guida/percorso/<MM-GG>` | `[]` | nessuna | — | 346 | **L9** sostituisce `giorno_calendario` con `giorno` (R11-02/11): solo il costruttore cambia |
| `trofeo` | `trofeo.nome` | `trofeo.nome_en` | `/guida/completamento?elemento=<chiave>` (§5.6) | `[]` | nessuna | nessuna colonna | 53 | — |
| `sfida` | `dati_guida.sfide`: `battaglieSfida.elenco[*]` (`chiave`, `nome`, `nomeIt`) e `bossSegreti[*]` (`chiave`, `nome`) | `nomeIt`/`nome` se diversi | `/guida/sfide?scheda=battaglie&elemento=<chiave>` o `?scheda=boss&…` | `[]` | `personaggi/<k>` per i boss con ritratto (come `SfidePage.tsx:66`) o nessuna | — | 10 (7 + 3); **fuori** i 90 tratti, le 20 sfide del Magnate e le 52 del Covo: senza `chiave` (D3) | — |

Totale atteso ≈ **4.176** voci sulla copia. Ricontarlo su una copia aggiornata prima del lavoro (le migrazioni 147-167 e il lavoro dell'utente cambiano i numeri).

Tipi da aggiungere dopo (non in B3):
- **L8**: `ombra` (217 in `dati_guida.battaglia.ombre`, pagina Ombra di L8), `persona-gruppo` (27 forme), sinonimi G-038 delle Ombre (nome della negoziazione e inglese) e delle Persona del gruppo.
- **L9**: `giorno` dalla tabella nuova, pagina dell'attività, elenco dei Confidenti, `evento_calendario` (se resta evento collegato), esami.
- Il costruttore del tipo nuovo è l'unica cosa da aggiungere: `TIPI_RICERCA`, `ETICHETTE_RICERCA`, una voce in `COSTRUTTORI` e (se serve) una riga di sinonimi.

---

## 5. B4 — disegno dell'interfaccia

### 5.1 File

| File | Nuovo/esistente | Contenuto |
|---|---|---|
| `src/services/api/ricerca.ts` | nuovo | `cercaGlobale(q, opzioni)` |
| `src/services/api/index.ts` | esistente | `export * from './ricerca';` |
| `src/stores/ricercaStore.ts` | nuovo | stato di apertura e ultima ricerca |
| `src/hooks/useScorciatoiaRicerca.ts` | nuovo | scorciatoia `/` |
| `src/components/ricerca/RicercaGlobale.tsx` | nuovo | finestra: campo, gruppi, righe |
| `src/components/ricerca/PulsanteCerca.tsx` | nuovo | pulsante della `Topbar` |
| `src/components/layout/Topbar.tsx` | esistente | `<PulsanteCerca />` prima di `PartitaSelettore` (riga 41) |
| `src/components/layout/MainLayout.tsx` | esistente | `<RicercaGlobale />` accanto a `<ToastContainer />` (riga 82) e `useScorciatoiaRicerca()` |
| `src/tailwind.css` | esistente | blocco `.ricerca-globale*` accanto a `.pannello-scheda` (`:314-395`) |
| `src/hooks/useElementoDaIndirizzo.ts` | nuovo | evidenzia e scorre `#elemento-<chiave>` (§5.6) |
| `AttivitaPage`, `RichiestePage`, `CompletamentoPage`, `SfidePage` | esistenti | §5.6 |

Nessuna nuova rotta nel router: la ricerca è una sovrapposizione, non una pagina. Nessun cambiamento alla `BottomNav`.

### 5.2 API e store

```ts
// src/services/api/ricerca.ts
import type { RicercaGlobaleDto } from '../../types';
import type { TipoRicerca } from '../../../shared/ricerca';
import { apiGet, queryString } from './_helpers';

/** La ricerca globale; `silent`: l'errore lo mostra la finestra, non un avviso a parte (HttpFetchOptions non ha `signal`: le risposte superate le scarta chi chiama). */
export const cercaGlobale = (q: string, o: { tipi?: readonly TipoRicerca[]; limite?: number; partita?: number } = {}): Promise<RicercaGlobaleDto> =>
  apiGet(`/ricerca${queryString({ q, tipi: o.tipi?.join(','), limite: o.limite, partita: o.partita })}`, { silent: true });
```

```ts
// src/stores/ricercaStore.ts — zustand, come preferenzeStore
interface RicercaState { aperta: boolean; q: string; apri: () => void; chiudi: () => void; impostaQ: (q: string) => void }
```
L'apertura **non** sta nell'indirizzo: «indietro» dal risultato torna alla pagina di partenza (con la partita già attiva nello store) e non riapre la finestra (R11-25).

### 5.3 `RicercaGlobale`

- Montata una volta in `MainLayout`; senza `aperta` non rende niente. `createPortal` su `document.body` come `PannelloScheda.tsx:164` (così sta sopra `BottomNav`, che ha `z-[100]` ed è prima nel DOM: stesso `z-index` `var(--z-popover)`, vince l'ordine del DOM).
- `role="dialog"`, `aria-modal="true"`, `aria-label="Cerca"`; il fuoco entra **sul campo** (`autoFocus` di `CampoRicerca`, `src/components/shared/CampoRicerca.tsx`: su telefono la tastiera si apre, ed è quello che si vuole: «un tocco, tre lettere»); `Tab` resta dentro (copiare le ~12 righe di `tieniIlFuoco`, `PannelloScheda.tsx:130`: non estrarre un hook condiviso, `PannelloScheda` è lavoro di L10); alla chiusura il fuoco torna al pulsante (`PulsanteCerca`).
- `Esc` chiude, ma non se `e.defaultPrevented` o se c'è una finestra aperta (`document.querySelector('.modal-overlay')`, come `PannelloScheda.tsx:113`).
- Ricerca: dopo **200 ms** dall'ultima battuta, con ≥ `MIN_CARATTERI_RICERCA`; ogni richiesta ha una **generazione** e conta solo l'ultima (modello `suggerimentiStore.ts`: `HttpFetchOptions` non ha `signal`); `partita = usePartitaStore((s) => s.attiva?.id)`.
- Stati: meno di 2 caratteri → suggerimento; in attesa → `Spinner` dopo 150 ms (senza spostare la lista); nessun risultato → «Nessun risultato per “…”»; errore → messaggio nella finestra con «Riprova»; mai un avviso a parte.
- Gruppi: intestazione `ETICHETTE_RICERCA[tipo].plurale` + `totale`; `risultati` come righe; se `totale > risultati.length`, pulsante «Mostra tutti (N)» che chiede `tipi=[tipo]&limite=50` e sostituisce solo quel gruppo.
- Riga (un `Link` a tutta larghezza, **≥ 44 px**, classe `touch`): miniatura 44 px (`useImmagineMappa(r.immagine)` + `urlMiniatura(url, 160)` da `shared/miniature`; senza immagine l'icona del tipo da `IconaCategoria`/`iconeGuida`, **mai** `IconMappa` per un posto), nome, «trovato come “Queen”» se `trovatoCome`, percorso (`percorso.join(' › ')`), chip di stato: `chiuso-adesso` e `non-ancora-aperto` con il `testo` del server, `da-verificare` con `<span className="chip chip--attivo text-[11px]">Da verificare</span>` (identico a `AreeDellaCitta.tsx:68`).
- Navigazione: clic/Invio sulla riga → `chiudi()` e il `Link` naviga; `Invio` nel campo apre il primo risultato; frecce su/giù spostano il fuoco fra le righe.
- Nessun testo con «Mappa»/«mappe»/«atlante» (R11-10b/2): il controllo statico del §6.4 lo prova.

### 5.4 Pulsante, scorciatoia, posizione

- `PulsanteCerca`: `<button type="button" className="touch …" aria-label="Cerca" aria-keyshortcuts="/" title="Cerca (/)" onClick={apri}><IconSearch size={22} /></button>` (`IconSearch` esiste: `src/components/shared/icons.tsx:101`). Nella `Topbar` va **a ogni larghezza** (sotto `lg` insieme a Guida e Impostazioni, da `lg` da solo: la `Sidebar` non ha ricerca), prima di `PartitaSelettore`. **A 375 px la riga ha logo (fino a 104 px), selettore partita, Guida, Impostazioni e ora Cerca**: la larghezza va **misurata nel browser a 375 e a 320** (da verificare); se non basta, si riduce il margine (`gap-2`) o il logo, non si toglie un pulsante.
- `useScorciatoiaRicerca` (in `MainLayout`): `keydown` con `e.key === '/'`, senza `ctrl/meta/alt`, non `e.repeat`, e `e.target` non dentro `input, textarea, select, [contenteditable]`, e nessuna finestra aperta (`.modal-overlay`) → `preventDefault()` e `apri()`.
- Altezza dell'intestazione: invariata (60/68 px), quindi la regola «intestazione ≤ 30%» non cambia.

### 5.5 Disposizione e CSS (R11-27)

Blocco `.ricerca-globale` in `src/tailwind.css` accanto a `.pannello-scheda` (`:314-395`), stesse variabili (`--z-popover`, `--color-bg-secondary`, `--radius-lg`):
- **sotto 1024 px**: tutto schermo (`position: fixed; inset: 0; height: 100dvh`, `padding-bottom: env(safe-area-inset-bottom)`), testa con campo e «Chiudi» (≥ 44 px), corpo `overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin` (stessa regola di `.pannello-scheda__corpo`: area scorrevole interna evidente, niente scroll annidato che trascina la pagina);
- **da 1024 px**: pannello a destra a tutta altezza, `width: min(560px, 100vw)`, con velo scuro, come la scheda (coerenza di gesto; D7 per una variante «palette» centrata);
- `min-w-0` e `overflow-wrap:anywhere` sui testi: nessuno scorrimento orizzontale a 1280, 768 e 375; il percorso va a capo (`flex-wrap`), non si tronca con `…` quando è l'unica distinzione fra due voci uguali;
- `prefers-reduced-motion`: niente animazione (come `.pannello-scheda`).
Se la scheda sopra il diario è aperta, la ricerca si apre sopra (stesso `z-index`, DOM successivo) e, navigando, la scheda si lascia con la pagina: nessun codice particolare.

### 5.6 Case senza pagina: `?elemento=` anche come pagina (D1)

Per attività, Richieste, trofei e sfide la casa è l'elenco con `?elemento=<chiave>` (stessa convenzione del pannello). Serve:
- `AttivitaPage` (`:134`) e `RichiestePage` (`:170`): `const solo = soloChiave ?? params.get(PARAMETRO_ELEMENTO) ?? undefined;` e usare `solo` dove oggi c'è `soloChiave` (`AttivitaPage.tsx:152-154`, `RichiestePage.tsx:209-210`). Entrambe leggono già `params` da `routerScheda`: nel pannello `params` è quello della scheda (stesso `elemento`), fuori è il router vero, quindi il cambiamento vale in entrambi i contesti. Fuori dal pannello, sotto l'elemento un collegamento «Tutte le attività» / «Tutte le Richieste» (nome della cosa, mai «Torna»).
- `CompletamentoPage` (trofei) e `SfidePage` (battaglie, boss): `id="elemento-<chiave>"` sulla carta/riga e `useElementoDaIndirizzo()` (nuovo hook: dopo il caricamento dei dati scorre l'elemento al centro e gli dà per qualche secondo la classe `elemento-evidenziato`, CSS nuovo); la scheda giusta si sceglie dal parametro `scheda` già esistente. Non riusare l'alone dorato dei suggerimenti (`classiSuggerito`, «Oggi»): ha un altro significato.
- Libri, film, videogiochi: **nessuna modifica** (pagina dell'oggetto già esistente). Se l'utente preferisce che il tocco apra l'elenco con la scheda di lettura/visione (con le sessioni segnate), si cambia solo la `casa` del costruttore in `/guida/libri?elemento=<chiave>` e si applica lo stesso `solo` a `LibriPage` e `FilmPage` (`soloChiave` già esiste: `LibriPage.tsx:45`, `FilmPage.tsx:51`): D1.

---

## 6. Come si verifica senza test

Regole: zero test nuovi o eseguiti; nessuno script di collaudo scritto o eseguito dall'agente (`R11-09/collaudo-utente`); typecheck, lint e build verdi; il runtime non si dichiara verificato se non osservato; nessuna scrittura di prova sui dati dell'utente.

### 6.1 Statici, a cura dell'implementatore
1. `npm run typecheck` (`tsc -b tsconfig.full.json`, comprende `tsconfig.test.json`), `npm run lint`, `npm run build`. `COSTRUTTORI: Record<TipoRicerca, CostruttoreTipo>` e `ETICHETTE_RICERCA: Record<TipoRicerca, …>` fanno fallire la compilazione se un tipo manca (R11-09/1).
2. **Registro OpenAPI**, senza eseguire `openapi.test.ts`: `grep -n "GET /api/ricerca" server/openapi/descrizioni/*.ts` = 1 risultato; `grep -n "'/api/ricerca'" server/routes/index.ts server/openapi/descrizioni/index.ts` = 1 + 1; rilettura delle quattro regole del test (sommario ≤ 120 e senza punto finale; descrizione ≥ 20; `RicercaGlobaleDto` in `shared/`; codici d'errore come stringhe in `server/`).
3. **Case contro il router**, sola lettura: un `node -e` (non salvato nel repository) che estrae i `path:` da `src/router.tsx` e controlla che ogni modello di casa del §4 (`/guida/citta/:chiave`, `/guida/citta/:chiave/:area`, `/guida/dungeon/:chiave`, `/guida/dungeon/:chiave/area/:slug`, `/guida/luogo/:quartiere/:luogo`, `/guida/negozi/:chiave`, `/guida/oggetto/:categoria/:slug`, `/compendio/persona/:id`, `/skill/:id`, `/confidenti/:chiave`, `/guida/percorso/:data`, `/guida/attivita`, `/guida/richieste`, `/guida/completamento`, `/guida/sfide`, `/guida/citta`) corrisponda a una rotta. Nessuna casa deve cominciare per `/guida/mappe/` (il visore): `grep -rn "guida/mappe" server/services/ricerca/` = 0.
4. **Parole vietate** (R11-10b/2): `grep -rniE "mappa|mappe|atlante" shared/ricerca.ts src/components/ricerca/ src/hooks/useScorciatoiaRicerca.ts src/stores/ricercaStore.ts` = 0 nelle stringhe mostrate (commenti ammessi se non finiscono nel DOM); verifica nel DOM a 1280/768/375 fa parte del collaudo dell'utente.
5. Lettori e scrittori: `grep -rn "indiceRicerca\|invalidaIndiceRicerca" server src` mostra costruzione, middleware, registro d'invalidazione; `grep -n "sinonimi-ricerca" server` mostra migrazione e lettore (nessun blocco senza lettore).
6. Tre riletture del diff (regola dell'utente): nessun import ciclico (`ricerca/*` importa i servizi, nessuno importa `ricerca/*` tranne il middleware e la rotta), nessuna chiave `file:riga` citata nei commenti che non esista.

### 6.2 Misure di sola lettura su una copia (a cura dell'implementatore, con `better-sqlite3 {readonly:true}`)
Per ogni tipo, il conteggio dell'indice deve uguagliare la query SQL del §4 sulla stessa copia. Query di riferimento:
`SELECT COUNT(*) FROM quartiere` (24); `…FROM area` (140); `…FROM mappa m JOIN area a ON a.chiave=m.area_chiave WHERE a.planimetria_predefinita<>m.chiave` (133); `…FROM luogo WHERE nascosto=0` (109); `…FROM negozio WHERE nascosto=0` (61); `…FROM dungeon WHERE tipo IN ('palazzo','mementos')` (10); `…FROM dungeon_area d JOIN dungeon g ON g.chiave=d.dungeon_chiave WHERE g.tipo='palazzo'` (91) e `='mementos'` (9); `…FROM area_dedalo` (95); `…FROM punto_interesse` (960); `…FROM persona` (232); `…FROM skill` (525); `…FROM catalogo_oggetto WHERE nascosto=0 AND categoria NOT IN ('libro','film','videogioco')` (1215) e per categoria (46, 30, 7); `…FROM confidente` (23); `…FROM attivita WHERE nascosto=0 AND tipo<>'videogioco'` (23); `…FROM richiesta` (33); `…FROM giorno_calendario` (346); `…FROM trofeo` (53).
Per ogni casa «a elenco» (`?elemento=`, `?infiltrazione=`, `?area=`) la chiave citata esiste nella tabella (nessun 404 per chiave).

### 6.3 Procedura R11-09 (collaudo «ogni oggetto si trova»: a cura dell'utente o del verificatore avversariale, **non** dell'agente implementatore)
Sola lettura, con il backend avviato su una **copia** dei dati (le GET non scrivono: l'unica eccezione nota è la cache delle miniature `immagine_miniatura`, che le immagini con `?l=` riempiono):
1. Per ogni tipo: elencare le chiavi e i nomi dal DB (query del §6.2).
2. Per ogni oggetto: `GET /api/ricerca?q=<nome>&tipi=<tipo>&limite=50`; il gruppo del tipo deve contenere l'oggetto (stessa `chiave`), con `nome` uguale e `casa` che corrisponde a una rotta del router (§6.1 punto 3).
3. Per i nomi altri e i sinonimi: «Queen» → Makoto Niijima; «Palazzo di Sae» → Palazzo di Niijima; «Skull» → Ryuji; «Koropokguru» e «Koropokkuru» → la stessa Persona; «Portafortuna del supporto» → «Portaf. del supporto»; «Jack o lantern» e «Jack-o’-Lantern» → la stessa Persona.
4. Nascosti: nascondere un negozio e un oggetto **dall'interfaccia, su una copia**, ripetere: non compaiono (R11-10); ripristinare.
5. Luogo chiuso: su una copia con partita di prova, un luogo aperto solo di sera (esempio di R5-20b: il Fioraio Sukebe) si trova sempre; con la partita di giorno ha `stato.tipo = 'chiuso-adesso'` e il motivo; senza `?partita=` `stato = null`. L'area «Area riservata allo staff» ha `stato.tipo = 'da-verificare'`.
6. Per gli indirizzi: `GET` di ogni `casa` come pagina dal browser, nessun 404.
Limite: il controllo vero e completo (tutti gli oggetti, tutti i tipi) è `R11-09/collaudo-utente`, riservato all'utente; qui sono indicati i passi, non eseguiti.

### 6.4 FE senza test
Browser su una copia: ricerca con 3 lettere dal telefono emulato (375×812), risultato, tocco, **Indietro** (la partita resta); a 768 e 1280 il pannello; nessuno scorrimento orizzontale; bersagli ≥ 44 px (`.touch`); l'elenco dei risultati scorre da solo e l'overscroll resta contenuto; la scorciatoia `/` non scatta dentro un campo e non scatta con una finestra aperta. Nota di memoria: il browser nascosto non riceve click né hover (misurare con gesti a misura reale e pulire i dati di prova).

---

## 7. Decisioni da confermare (default prudente applicato)

| # | Decisione | Default prudente (da implementare se non diversamente detto) |
|---|---|---|
| **D1** | «Casa» dei tipi senza pagina (§8.10 di `preparazione`) | **Libri, film, videogiochi**: la pagina dell'oggetto già esistente (`casaOggetto`), zero lavoro FE. **Attività, Richieste, trofei, sfide**: l'elenco con `?elemento=<chiave>` (convenzione già in uso nel pannello), con la lettura del parametro anche fuori dal pannello (§5.6). **Giorni**: `/guida/percorso/<MM-GG>`. **Voci della guida**: la scheda del Palazzo sull'infiltrazione. Alternativa per libri e film: `?elemento=` sull'elenco (modifica solo la `casa` e `LibriPage`/`FilmPage`). |
| **D2** | Nome della pagina «Luoghi della guida» al posto di «Mappe» | **Sì** (è di B5/B4 R11-10b/2, non cambia B3): il titolo e `sezioniGuida.tsx:25` li cambia B5. La ricerca non usa mai quella parola. |
| **D3** | Quali «sfide» si indicizzano | Solo `battaglieSfida.elenco` (7) e `bossSegreti` (3), che hanno `chiave`. Tratti (90), sfide del Magnate (20) e sfide del Covo (52) **no**: nessuna `chiave` stabile; si aggiungono dopo, con una chiave decisa. |
| **D4** | Aree dei dedali («Area 1», «Tutorial») | **Indicizzate** (95), ultime nell'ordine, con il percorso (`Memento › Dedalo di …`) che le distingue; se il rumore è troppo, `area-dedalo` esce dai tipi predefiniti e resta cercabile con `tipi=area-dedalo`. |
| **D5** | Altre abbreviazioni degli oggetti (An., Cint., Cav., Masc., Pend., Reggis., Motocicl., K.: circa 56 oggetti) | **Non si espandono** (G-024: le forme estese devono essere attestate): chiedere all'Esperto della guida una lista come quella di G-038, e aggiungerla al blocco. |
| **D6** | «Joker» (G-038 riga 2) e «Stanza di Velluto/Velvet Room» | Non esiste un oggetto da indicizzare (il protagonista è solo in `dati_guida.personaggi`; nessun luogo con quel nome): **restano «in attesa»**. Proposta: se serve «Joker», aggiungere il tipo `personaggio` per i 5 personaggi senza Confidente (Joker, Caroline, Justine, Jose, Lavenza) in un secondo tempo, con casa `/guida/personaggi?elemento=<chiave>`. |
| **D7** | Aspetto da 1024 px | Pannello a destra come la scheda (riuso dello stile, nessuna sorpresa). Variante «palette» centrata solo se l'utente la chiede. |
| **D8** | «Violet» fra i sinonimi di Kasumi | G-038 elenca **Sumire**; il dato `personaggi.nomeCodice` ha **Violet** (nome in codice vero di Kasumi). Si mettono entrambi nel blocco, ma «Violet» è **da confermare con l'Esperto**. |
| **D9** | Palazzi: percorso `['Tokyo']` | Segue R11-11 («Città › Palazzi»). I Memento hanno percorso `[]`; Iweleth, finché L8 B7 non lo sposta, ha il percorso del Palazzo (e un secondo risultato come dedalo). |
| **D10** | Planimetrie senza Area (8) | **Escluse** dalla ricerca (la loro casa sarebbe il visore): compaiono nella lista «Da collocare» dell'albero (B5/R11-13). |
| **D11** | Test | Nessun test nuovo; nessuna modifica ai test esistenti salvo quelle minime per far compilare (decisione del 24/10). B3 e B4 non rompono nessun export esistente: l'unica modifica a un file di L10 è la riga di `pannelloScheda.ts` (opzionale, §3.2). |

---

## 8. Ordine dei passi e file condivisi con altri blocchi

### 8.1 Ordine

B3 (nessuna dipendenza dagli altri blocchi dell'ondata 1):
1. `shared/ricerca.ts` e DTO in `shared/types.ts` → typecheck.
2. `sinonimiRicerca.ts` + migrazione del blocco (numero libero al momento) + registrazione in `migrations/index.ts`.
3. `indiceRicerca.ts` con i costruttori, **prima i tipi del mondo** (quartiere, citta, area, planimetria, luogo, negozio, palazzo, infiltrazione, dedalo, area-dedalo, voce), poi quelli del catalogo (persona, skill, oggetto, libro, film, videogioco, confidente, attivita, richiesta, giorno, trofeo, sfida): un tipo per volta, typecheck a ogni tipo.
4. `statoRicerca.ts` e `ricercaService.ts` (punteggio, gruppi, limite).
5. `schemas/ricerca.ts`, `routes/ricerca.ts`, `routes/index.ts`, `descrizioni/ricerca.ts`, `descrizioni/index.ts` (insieme: la rotta senza descrizione rompe `openapi.test.ts`).
6. `middleware/indiceRicerca.ts` e `bootstrap.ts`.
7. Controlli §6.1 e §6.2; tre riletture del diff; poi la verifica avversariale del revisore distinto (sulle specifiche originali: `requisiti.md` R11-07…R11-10b, `modifiche.md` §2, G-038, questo documento).

B4 (dopo B3: serve la risposta reale):
1. `api/ricerca.ts` + barrel; `ricercaStore.ts`.
2. `RicercaGlobale.tsx` e `PulsanteCerca.tsx`; CSS.
3. `Topbar.tsx`, `MainLayout.tsx`, `useScorciatoiaRicerca.ts`.
4. `?elemento=` nelle pagine (§5.6) e `useElementoDaIndirizzo.ts` — **dopo** la conferma di D1.
5. Controlli §6.4 su browser a 1280, 768, 375, 1366×657 e 1280×689.

### 8.2 File condivisi (un solo proprietario alla volta)

| File | Chi lo tocca | Come evitare il conflitto |
|---|---|---|
| `shared/types.ts` | B3, B5 (`NodoGerarchiaDto`), B7, B8, B9, B10, B11 | B3 aggiunge una sezione **in fondo** e un `import type`; rileggere il file prima di editare (si sposta). |
| `server/routes/index.ts`, `server/openapi/descrizioni/index.ts` | B3 (una riga ciascuno); B5 e B7 toccano i file **per area** (`mappe.ts`, `compendio.ts`, `catalogo.ts`, `partite.ts`, `immagini.ts`), non questi due | B3 e B7 non confliggono se B7 non cambia `index.ts`; B7 toglie 7 rotte e le loro descrizioni (`mappe.ts:84`, `compendio.ts:81`, `catalogo.ts:45`, `partite.ts:108,114`, `immagini.ts:42`, `mappe.ts:177`): nessuna è usata dalla ricerca. |
| `server/bootstrap.ts` | B3 (una riga) | solo B3 in questa ondata. |
| `server/db/migrations/index.ts` e numero di migrazione | B3 (sinonimi), B8, B9, B11, B12, B13, B15 + L8/L9/L10 | un blocco alla volta; il numero si prende all'ultimo momento (oggi 167 è l'ultima registrata). |
| `server/services/luoghiService.ts`, `casaMappa.ts`, `areeService.ts`, `mappeService.ts`, `dungeonService.ts` | B5, B8, B9 (conflitto alto) | B3 li **importa soltanto**: `casaDellArea`, `casaDelPalazzo`, `casaDelLuogo`, `lettureLuoghi`, `luogoDto`, `presenzaDelNegozio`, `illustrazioneDellaMappa`, `immaginiCaricateDelleMappe`, `contestoAree`. Se B9 cambia una firma, aggiorna i chiamanti dell'indice. |
| `src/pages/MappaPage.tsx`, `src/router.tsx` | B5 | B4 non li tocca (nessuna nuova rotta). B5 cambia titolo e testi «Mappe» → «Luoghi della guida» (`sezioniGuida.tsx:25`, `MappaPage.tsx:160,508`). |
| `src/components/layout/{Topbar,MainLayout}.tsx` | B4; L10 BON-01 tocca la Home | rileggere il file prima di editare. |
| `src/tailwind.css` | tutti | nuovo blocco accanto a `.pannello-scheda`, senza toccare quelle regole. |
| `AttivitaPage`, `RichiestePage`, `CompletamentoPage`, `SfidePage` | B4; L9 per le attività; B11 («Modifica») per sfide e trofei | modifica minima (lettura del parametro e `id`); B11 aggiunge moduli sugli stessi file. |
| `src/utils/pannelloScheda.ts` | L10 (R10-27) | solo la riga di `PARAMETRO_ELEMENTO`, opzionale. |

La voce `R11-10b/2` («ricerca e albero») si chiude con **B4 per la ricerca e B5 per l'albero**: il verificatore deve guardare entrambi prima di segnarla.

---

## 9. Rischi

1. **Indice vecchio dopo una modifica** (il più concreto): `invalidaCacheDiGioco` non è chiamata da `dungeonService`, `mappeService`, `legamiInfiltrazioni`, `richiesteService`, `atterraggioPalazziService`, `traduzioniService`, `cittaService`. Mitigazione: middleware per area (§3.10). Residuo: scritture fuori dall'API (script, accesso diretto al file) non invalidano. Se compare una nuova area che scrive dati indicizzati, va aggiunta a `AREE_CHE_SCRIVONO`.
2. **Dipendenza da B9**: `mappaDelQuartiere` oggi legge `mappa.entita_tipo/entita_chiave`; B9 le toglie. Un solo punto da aggiornare (la funzione), ma B9 deve saperlo. Lo stesso per `negozio.luogo_chiave` (non letto di proposito), `luogo.area_chiave`, `area.planimetria_predefinita`.
3. **Costo della richiesta con la partita**: `statoDisponibilitaPartita` + `lettureLuoghi` non sono leggeri. Si chiamano **solo** se il risultato (già troncato a `limite` per gruppo) contiene luoghi o negozi, una volta per richiesta, con debounce di 200 ms nel FE. Da **misurare** su una copia con partita reale; se pesa, lo stato si chiede in una seconda chiamata solo per le righe visibili.
4. **Rumore**: 960 voci con nomi ripetuti e 95 aree «Area N» possono riempire un gruppo con 2 lettere. Mitigazioni già nel disegno: limite per gruppo (8), ordine per qualità, `totale` visibile, ordine dei gruppi per miglior punteggio, minimo 2 caratteri; da valutare con l'uso (D4).
5. **Doppioni**: Iweleth (Palazzo e dedalo), libri/film/videogiochi (catalogo e tabelle proprie, evitati indicizzando una sola volta dal catalogo), attività di tipo videogioco (escluse). Un nome uguale in due gruppi non è un errore, ma va riguardato dopo L8 B7.
6. **`?elemento=` come pagina**: le pagine Attività e Richieste usano `routerScheda`: la lettura del parametro deve funzionare sia nel pannello sia fuori. Un errore qui rompe la scheda sopra il diario (L10 R10-27). Verifica in browser su entrambi i percorsi prima di dichiararla.
7. **Tipi che nascono dopo (L8/L9)**: righe di sinonimi che puntano a oggetti che non ci sono vengono saltate: nessun errore, ma anche nessun avviso a chi usa l'app; l'elenco «in attesa» sta solo nella procedura §6.3 (e va riletto quando L8 consegna le 27 Persona del gruppo).
8. **Repo pubblico**: nei documenti, nei sinonimi e negli esempi di prova nessun nome utente, nome di partita o indirizzo; i sinonimi sono nomi del gioco. Nelle prove si scrive «email dell'utente», mai il nome.
9. **Regola BON-11**: la ricerca non è un pannello di revisione e non introduce «Da rivedere» (decisione del 24/10): se compaiono azioni di scrittura nella finestra, sono fuori disegno.
10. **Test esistenti** (`src/accessibilita.test.ts`, `src/selettoriUnificati.test.ts`, `server/routes/struttura-server.test.ts`): possono avere regole statiche sulle pagine o sui pulsanti; rileggerle per vedere se il nuovo pulsante o la nuova finestra le violano. Non vanno eseguite né cancellate; si ritoccano solo per far compilare.

## 10. Limiti di questa analisi

- Conteggi misurati su `sim-142b` (gioco 146); le migrazioni 147-167 e il lavoro dell'utente su p5s li cambiano (specie `giorno_calendario`, `evento_calendario`, domande/esami, `attivita`). Ricontare prima di scrivere il controllo §6.2.
- Non ho eseguito typecheck, lint, build, né avviato l'app; nessuna misura di tempo della richiesta con la partita (rischio 3) né della larghezza della `Topbar` a 375 px.
- Ho letto solo le parti delle pagine (`LibriPage`, `FilmPage`, `AttivitaPage`, `RichiestePage`, `CompletamentoPage`, `SfidePage`, `DungeonDettaglioPage`, `LuogoPage`) citate; non ho verificato che `Link` verso `/guida/dungeon/<k>?infiltrazione=<chiave>` selezioni davvero l'infiltrazione per ogni Palazzo (è l'uso già presente in `BattagliaPage.tsx:125`).
- Il formato dei sinonimi è una proposta: il registro G-038 non fissa le chiavi; non ho verificato presso l'Esperto «Violet», «Covo» come sinonimo breve di «Covo dei Ladri», né l'elenco completo delle abbreviazioni.
- Non ho verificato che nessun altro file di `shared/` esporti già un nome `TipoRicerca` o `RisultatoRicercaDto` (grep per `ricerca` solo su nomi di file e sui simboli citati).
- Le righe `file:riga` possono spostarsi: il worktree ha modifiche non committate di altre sessioni.
- La scansione lineare e i tempi (0,2 ms per ricerca, 26 ms di costruzione di base) sono misure su un campione di 6.412 stringhe normalizzate in Node, non sul servizio vero; il costo dei DTO di luoghi e negozi non è incluso.
