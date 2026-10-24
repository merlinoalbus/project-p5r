# L11 · B5 «Albero Tokyo e Palazzi» — scheda di implementazione

Analista in sola lettura, 2026-10-24, ramo `newreview`. Per un implementatore Sonnet: tutto quel che serve per partire. Nessun codice è stato scritto, nessun test è stato eseguito, nessun dato è stato toccato.

**Fonti lette**: `CLAUDE.md`; `lotti/L11/{requisiti,modifiche,preparazione-2026-10-23}.md`; `lotti/L2/analisi-elenco-mappe.md`; `docs/analisi/2026-10-20-piano-razionalizzazione.md`; `src/pages/MappaPage.tsx` (per intero); `AlberoLuoghi.tsx`, `AnteprimaMappa.tsx`, `AreeDellaCitta.tsx`, `FinestraColloca.tsx`, `CittaPage.tsx`, `OggiMappa.tsx`, `DungeonPage.tsx`, `router.tsx`; `server/routes/{mappe,aree}.ts`; `server/services/mappe/{casaMappa,immagineMappa,legamiInfiltrazioni,disponibilitaAree,alberoMappe,contenutiGuidaService,identitaSpillo}.ts`; parti citate di `mappeService.ts`, `areeService.ts`, `cittaService.ts`; `EditorMappaPage.tsx` (zone citate), `utils/aree.ts`, `utils/presentazioneMappa.ts`, `utils/palazzi.ts`; `shared/types.ts` e `shared/spilli.ts` (zone citate); `server/openapi/openapi.test.ts` e `descrizioni/mappe.ts`; `src/test/areeScorrevoli.test.ts`; `stato.json` (voci R11-11…14).
**Dati**: copia `sim-142b` dello scratchpad (`gioco.db`, `user_version` 146), aperta con `better-sqlite3` `{readonly:true}`. Un solo script `tsx` di sola lettura ha importato `shared/spilli.ts` per usare `gruppoConteggioSpillo` sulle righe della copia.

## 0. In breve (le sei cose da sapere prima di iniziare)

1. **Nessuna delle 8 voci è soddisfatta per intero.** Quattro sono parziali con prova (§1): le case (`casa`) di tutti i nodi sono già calcolate dal server, la vista per usarle non c'è.
2. **`MappaTokyo` NON va tolta.** È «la metro» disegnata di `La città` (`CittaPage.tsx:20,80`) e la colonna della scheda «Oggi» (`OggiMappa.tsx:20,69`); il piano di razionalizzazione dice che la metro **resta** e che spariscono «il visore di Tokyo e la riga "Tokyo" dell'indice» (`docs/analisi/2026-10-20-piano-razionalizzazione.md:220`). Il «visore di Tokyo» è **già** irraggiungibile (`MappaPage.tsx:58-59`). Vedi D4.
3. **«Nuova mappa» nei Palazzi è un pulsante che il server rifiuta sempre**: `creaMappa` risponde 409 `usa-aggiungi-area` per qualsiasi figlia di un Palazzo (`mappeService.ts:993-995`). Il pulsante c'è ancora (`EditorMappaPage.tsx:587`). Correzione piccola e sicura (§3.8, D1).
4. **«Da collocare» ha un buco**: l'elenco (`mappeDaCollocare`, `areeService.ts:675-688`) include anche le planimetrie dei Palazzi, ma la finestra «Colloca» sa scegliere solo un quartiere (`AreeDellaCitta.tsx:144`). Oggi 0 righe, ma non si potrebbe assegnarne una di un Palazzo.
5. **I numeri di `modifiche.md` §3 vanno rimisurati**: sulla copia le planimetrie del mondo sono **28** (non 29), le aree dei Palazzi sono **117** con Iweleth (101 senza), le planimetrie dei Palazzi **245** (219 senza Iweleth). Le cifre le calcola il server, il FE non le scrive mai.
6. **La regola E6 («un pin una volta per oggetto») va scelta con attenzione**: «i pin senza riferimento contano per posizione» non deduplica quasi niente, perché le versioni di un'Area sono ritagli diversi (le posizioni non coincidono). Misure e regola prudente in §2.4 e D6.

## 1. Le otto voci

| Voce | Stato | Prova / modifica precisa |
|---|---|---|
| **R11-11/1** albero Città › Quartieri › Aree › Planimetrie | **Da fare** (dati sì, rotta e vista no) | Oggi: `GET /api/mappe/albero` piatto (`routes/mappe.ts:52-54`, `mappeService.ts:228-233`) e `IndiceMappe` a radici + pannello (`MappaPage.tsx:79-254`). Non esiste `gerarchia`. Modifica: §3 (rotta, DTO, query) e §4 (componenti). Tutte le 273 planimetrie con Area e le 23 aree del mondo hanno un posto (§2.3). |
| **R11-11/2** Città › Palazzi › Aree › Planimetrie, infiltrazioni accanto | **Da fare** | I Palazzi sono radici dell'indice con griglia (`MappaPage.tsx:245-247`, `393-434`). Le infiltrazioni per Area esistono già come dato (`AreaRiassuntoDto.infiltrazioni`, `shared/types.ts:1651-1653`; `infiltrazioniDelleAree`, `legamiInfiltrazioni.ts:29-36`) ma l'indice non le porta (`MappaRiassuntoDto` non le ha). Modifica: §3.3 (nodo `accanto`) e §4.2. Caso a parte: 15 infiltrazioni su 91 non toccano nessuna Area (§2.2). |
| **R11-12/1** nodo Quartiere alla sua casa | **Parziale: dato sì, vista no** | La casa c'è: `casaMappa.ts:79` (`/guida/citta/<q>`), nel DTO `casa` (`shared/types.ts:2606`). Nell'indice vecchio un quartiere con figli è un pulsante «scendi» nel pannello (`MappaPage.tsx:482-483`), non un collegamento alla casa; solo dentro `AlberoLuoghi` è un `Link` a `m.casa` (`AlberoLuoghi.tsx:97-103`). Modifica: nel nuovo albero ogni riga ha un `Link` a `nodo.casa` (§4.2). |
| **R11-12/2** nodo Area alla sua casa | **Già soddisfatta nelle viste da sostituire; da conservare** | `AlberoLuoghi.tsx:78` (`capo.casa`), `MappaPage.tsx:484` (`m.casa \|\| urlMappa`), BE `casaMappa.ts:60-66` e `areaRifDellaMappa` `:102-112`. Nessuna modifica BE. Il nuovo albero deve produrre lo stesso indirizzo (`casaDellArea(a)`; per una versione non predefinita `?planimetria=`). |
| **R11-12/3** nodo Palazzo alla sua scheda | **Parziale: dato sì, vista no** | BE `casaMappa.ts:81` e `casaDelPalazzo` `:69-71`. Nell'indice un Palazzo ha sempre figli, quindi apre il pannello (`MappaPage.tsx:225-234`) e non la scheda. Modifica: nuovo albero, `Link` a `casaDelPalazzo(k)`. |
| **R11-12/5** niente nodi di viste alternative | **Parziale** | **Fatto**: visore di Tokyo (`MappaPage.tsx:58-59`; test `MappaPage.test.tsx:370,381`). **Da fare**: riga «Tokyo» che apriva il pannello o la città (`MappaPage.tsx:235`), pannello del luogo con nodo illustrazione e griglia del Palazzo (`PannelloLuogo` `:262-317`, `GriglieDelLuogo` `:393-434`, `Griglia` `:448-488`), `AlberoLuoghi` (§4.7). `MappaTokyo` resta (D4). |
| **R11-13/1** «da collocare» raggiungibile dall'albero | **Parziale** | Lista e gesto esistono: `routes/aree.ts:37,40`, `src/services/api/aree.ts:72,78`, `AreeDellaCitta.tsx:81-95,115-156`, ma solo in fondo a `La città`, e «Colloca» non sa i Palazzi. Modifica: riga «Da collocare» nell'albero e finestra «Colloca» per quartiere **o** Palazzo (§4.3). Oggi 0 elementi (§2.3). |
| **R11-14/1** «Nuova mappa» generica non esiste più | **Parziale** | Nel mondo non c'è (`utils/aree.ts:35-42`, `EditorMappaPage.tsx:585-587`). Nei Palazzi resta ma è inutile (409 del server, `mappeService.ts:993-995`). Modifica: §3.8; resta solo per la radice dei Memento (B6). Decisione D1. |

Fuori da B5 (ma attigue): R11-11/3 e R11-12/4 (Memento, B6, dopo L8). Il punto d'innesto è in §3.5.

## 2. Misure sui dati (copia `sim-142b`, sola lettura)

### 2.1 Conteggi per nodo

| Nodo | Misura |
|---|---|
| Righe di `mappa` | 316 = Tokyo 1 + quartieri 23 + Palazzi 9 + planimetrie con Area 273 + **10 fuori da B5** (§2.3) |
| Tokyo | 1 (`citta`), casa `/guida/citta` |
| Quartieri | 24 in `quartiere`; **23 nell'albero** (`mementos` è «Entrata dei Memento», fuori: `cittaService.ts:41`, `mappeService.ts:179-185`). 8 con aree, **15 senza aree** (foglie: apertura = pagina del quartiere) |
| Aree del mondo | **23** = 22 di quartiere + 1 della città (staff, `da_verificare = 1`, casa `/guida/citta/tokyo/area-riservata-allo-staff`) |
| Planimetrie del mondo | **28** = 26 di quartiere + 2 dello staff (i documenti dicono 29: differenza **da verificare** sull'istanza reale; la copia è p5s 1935Z a gioco 146) |
| Palazzi (`dungeon.tipo='palazzo'`) | **9**, di cui Iweleth (`regola_boss='memento'`) |
| Aree dei Palazzi | **117** = 101 + 16 di Iweleth; Planimetrie dei Palazzi **245** = 219 + 26 |
| Infiltrazioni dei Palazzi (`dungeon_area`) | **91**; legami `infiltrazione_area` 105; 35 aree di Palazzo senza nessuna infiltrazione; **15 infiltrazioni senza nessuna Area** |
| Da collocare (SQL di `mappeDaCollocare`) | **0** |

Per Palazzo (aree / planimetrie / infiltrazioni, di cui senza Area): Kamoshida 10/26/7 (0); Madarame 8/17/5 (0); Kaneshiro 13/27/5 (2); Futaba 18/32/10 (6); Okumura 11/21/10 (0); Niijima 13/26/14 (3); Shido 16/35/16 (4); Iweleth 16/26/12 (0); Maruki 12/35/12 (0).
Altre: aree senza pin 17; 2 aree con nome tecnico «… — Planimetria non attribuita» (Futaba, Shido, 0 pin); ogni area ha almeno una planimetria (0 eccezioni); `planimetria_predefinita` sempre dentro la sua area (0 eccezioni); slug unici per contenitore (0 duplicati); `genitore_chiave` di ogni planimetria coerente col contenitore dell'Area (0 incoerenze).

### 2.2 Infiltrazioni senza Area
15 infiltrazioni (Futaba 6, Niijima 3, Shido 4, Kaneshiro 2) non toccano Aree: se le infiltrazioni comparissero **solo** accanto alle aree, queste 15 non avrebbero un posto nell'albero. Soluzione (D10): ogni Palazzo ha, oltre alle sue aree, un elenco «Infiltrazioni senza area» (campo `senzaArea`, §3.1).

### 2.3 Dimostrazione: ogni mappa, area e planimetria ha un posto
Query (in appendice lo script completo). Esito sulla copia:

| Posto nell'albero | Righe di `mappa` |
|---|---|
| radice Tokyo | 1 |
| nodo quartiere (23) | 23 |
| nodo Palazzo (9) | 9 |
| planimetria sotto la sua Area | **273** (nessuna senza Area valida) |
| riga «Da collocare» | 0 (la SQL di `mappeDaCollocare` dà 0 righe) |
| **fuori da B5** → B6 | 10: `citta-mementos`, `dungeon-mementos` e gli 8 fogli «Memento - aree fisse» (genitore `dungeon-mementos`, nessuna Area) |

Aree: 140 = 23 mondo + 117 Palazzi; tutte con ≥1 planimetria, tutte con contenitore esistente (22 quartieri, la città, 9 Palazzi di tipo `palazzo`). Somma: 1 + 23 + 9 + 273 + 10 = 316.
**I 10 fogli del Memento sono gli unici senza posto fino a B6**: B5 non li colloca e non li fa comparire in «Da collocare» (`mappeDaCollocare` li esclude di proposito: `areeService.ts:679-681`). Va scritto nel resoconto di B5 come limite noto, non come difetto.

### 2.4 Regola E6 (pin una volta per oggetto): misure
Il server oggi conta ogni riga di `spillo` per ogni versione (`mappeService.ts:202-224`). Regola proposta e **misurata**: dentro un'Area, due pin dello stesso gruppo (`gruppoConteggioSpillo`, `shared/spilli.ts:150-153`) sono lo stesso oggetto se hanno lo stesso **riferimento** (`riferimento_tipo:riferimento_chiave`); se non hanno riferimento, se collegano lo stesso **insieme di voci** (`spillo_voce`); altrimenti sono **distinti** (chiave = `uid`, `identitaSpillo.ts`). Non si usa «tipo + nome» (i nomi generici «Nemico», «Salita» gonfiano la deduplicazione) e non si usa la posizione (le versioni sono ritagli diversi: stessa cosa, posizioni diverse).

| Misura | Grezzo | Con la regola |
|---|---:|---:|
| Tutte le planimetrie con Area (1697 pin) | 1697 | 1473 |
| Mondo (Tokyo + quartieri + aree) contenuto / passaggi / note | 157 / 96 / 41 | 150 / 70 / 41 |
| Palazzi (Iweleth compreso) contenuto / passaggi / note | 608 / 651 / 185 | 503 / 567 / 185 |
| Memento (non in B5) | 5 / 12 / 2 | 5 / 12 / 2 |
| Covo dei Ladri (5 versioni) | 10 / 5 / 12 | 10 / 5 / 12 (nessuna differenza) |
| Sottopasso di Shibuya (su questa copia 1 sola versione) | 6 / 10 / 0 | 6 / 5 / 0 (i passaggi con la stessa destinazione) |

Totale radice (mondo + Palazzi, senza Memento) con la regola: **653 pin di contenuto, 637 passaggi, 226 note** (grezzo 765 / 747 / 226). La stima «293 su 1234» di `analisi-elenco-mappe.md` (E6) era per eccesso, come lei stessa avvertiva. Il test richiesto da `modifiche.md` §3 (Covo e Sottopasso, confronto a mano) è eseguibile come **controllo di sola lettura**: il Covo deve restare 10/5/12 e il Sottopasso passare a 6/5/0.

## 3. Back-end

### 3.1 DTO (testo proposto per `shared/types.ts`)
Posizione: subito dopo `MappaDaCollocareDto` (`shared/types.ts:1691-1694`, sezione «Le Aree»), **non** vicino a `MappaRiassuntoDto` (`:2571-2607`, lo tocca B9). `ConteggiPinDto` (`:2566`) e `IllustrazioneDto` (`:1598`) esistono già. Alternativa se si vuole zero conflitti con B3/B9: stesso testo in un nuovo `shared/gerarchiaMappe.ts` (il test OpenAPI cerca i `…Dto` in tutto `shared/`, `openapi.test.ts:60-65`).

```ts
// ---- La gerarchia dei luoghi (L11 B5): Città › Quartieri › Aree › Planimetrie e Città › Palazzi › Aree › Planimetrie ----

/** I tipi di nodo. `memento`, `dedalo` e `area-dedalo` sono per B6 (Memento › Dedali › Aree): B5 non li produce, ma il tipo c'è già. */
export type TipoNodoGerarchia = 'citta' | 'quartiere' | 'area' | 'planimetria' | 'palazzo' | 'infiltrazione' | 'memento' | 'dedalo' | 'area-dedalo' | 'da-collocare';

/** Quel che un nodo contiene, contato dal server (E1, E2, E6): ogni cosa una volta sola, mai sommata dal client. I campi assenti non hanno senso per quel nodo. */
export interface ConteggiNodoDto {
  quartieri?: number; palazzi?: number; aree?: number; planimetrie?: number; infiltrazioni?: number;
  /** I pin: «contenuto» sono i pin veri, «passaggi» e «note» si dicono accanto. Nell'Area ogni oggetto conta una volta (E6, regola di §2.4). */
  pin: ConteggiPinDto;
}

/** Un nodo dell'albero. La `chiave` è quella del suo oggetto: il quartiere, il dungeon, l'Area (la sua chiave piena), la planimetria (chiave pubblica della mappa), l'infiltrazione. */
export interface NodoGerarchiaDto {
  tipo: TipoNodoGerarchia;
  chiave: string;
  /** Il nome da mostrare: quello del posto, mai «Mappa». */
  nome: string;
  /** La casa: l'unica pagina che mostra l'oggetto (calcolata dal server, `casaMappa.ts`). Null solo per «Da collocare», che è un contenitore. */
  casa: string | null;
  /** Solo area: lo slug (serve a «Colloca»). */
  slug?: string;
  /** Solo città, quartiere, Palazzo: la chiave pubblica della mappa che li illustra (`mappaChiave` dei quartieri; per «Colloca»). */
  mappa?: string;
  /** La miniatura col risolutore unico di L1; null per il Palazzo (il segno lo disegna il FE) e per i contenitori. */
  immagine: IllustrazioneDto | null;
  conteggi: ConteggiNodoDto;
  /** Area in attesa della scelta dell'utente (lo staff di Tokyo). */
  daVerificare?: boolean;
  /** Quartiere e Area del mondo con una partita: già aperto? (`null` senza partita). Mai nascosto: si segna. */
  disponibile?: boolean | null;
  bloccoMotivo?: string | null;
  /** Palazzo che si comporta da dedalo (`regola_boss='memento'`: oggi Iweleth). Il FE scrive «Dedalo» accanto al nome. */
  dedalo?: boolean;
  /** Solo planimetria: la versione dentro l'Area. */
  versione?: { etichetta: string | null; ordine: number; predefinita: boolean };
  /** I nodi sotto: quartieri, aree della città e Palazzi sotto Tokyo; aree sotto un quartiere o un Palazzo; planimetrie sotto un'Area. */
  figli: NodoGerarchiaDto[];
  /** Solo area di un Palazzo: le infiltrazioni che la toccano, accanto (tipo `infiltrazione`, senza figli). */
  accanto?: NodoGerarchiaDto[];
  /** Solo Palazzo: le infiltrazioni che non toccano nessuna Area (oggi 15 su 91). */
  senzaArea?: NodoGerarchiaDto[];
  /** Solo «Da collocare»: le planimetrie senza Area, nella forma che «Colloca» già usa. */
  daCollocare?: MappaDaCollocareDto[];
}

/** `GET /api/mappe/gerarchia`: le radici (Tokyo, e in fondo «Da collocare») e i totali dell'intestazione (E1). */
export interface GerarchiaMappeDto {
  radici: NodoGerarchiaDto[];
  totali: { citta: number; quartieri: number; areeMondo: number; planimetrieMondo: number; palazzi: number; areePalazzi: number; planimetriePalazzi: number; infiltrazioni: number; daCollocare: number; pin: ConteggiPinDto };
}
```

### 3.2 Rotta, schema zod, OpenAPI
- **File**: `server/routes/mappe.ts`. La rotta va **prima** di `router.get('/:chiave', …)` (`:100`), accanto a `/albero` (`:52`):
  ```ts
  router.get('/gerarchia', validate({ query: queryGerarchia }), (req, res) => {
    res.json(gerarchiaMappe((req.query as unknown as { partita?: number }).partita));
  });
  ```
  con `import { gerarchiaMappe } from '../services/mappe/gerarchiaMappe.js'` e `queryGerarchia` aggiunto all'import da `../schemas/mappe.js` (`:23`).
- **Schema**: `server/schemas/mappe.ts`, dopo `queryGuidaMappa` (`:38`): `export const queryGerarchia = z.object({ partita: idParam.optional() });`.
- **Chiave riservata**: aggiungere `'gerarchia'` a `CHIAVI_MAPPA_RISERVATE` (`mappeService.ts:627-630`, insieme ordinato alfabeticamente fra `'esporta'` e `'importa'`); senza, una mappa chiamata «Gerarchia» avrebbe la chiave `gerarchia`, oscurata dalla rotta statica. È l'unica riga di B5 in `mappeService.ts` (B9 ci lavora: coordinare, una riga).
- **OpenAPI** (`server/openapi/descrizioni/mappe.ts`, dopo `'GET /api/mappe/albero/conteggi'` `:39`; 1:1 con la rotta, `openapi.test.ts:33-40`; `sommario` ≤ 120 caratteri e senza punto finale, `descrizione` ≥ 20, `risposta` con un `…Dto` che esiste in `shared/`, il codice d'errore deve comparire nei sorgenti server fuori da `openapi`):
  ```ts
  'GET /api/mappe/gerarchia': {
    sommario: 'La gerarchia dei luoghi: Città, quartieri, Palazzi, Aree e planimetrie, con conteggi e casa di ogni nodo',
    descrizione: 'L\'albero dell\'indice `/guida/mappe` (L11). Radice: la città (Tokyo) con i quartieri, le Aree della città da verificare e i Palazzi (Iweleth compreso, con `dedalo: true`); in fondo «Da collocare» (le planimetrie senza Area, con lo stesso contenuto di `GET /api/aree/da-collocare`). Quartiere › Area › planimetrie (versioni); Palazzo › Area › planimetrie, con le infiltrazioni che toccano ogni Area in `accanto` e quelle senza Area in `senzaArea`. Ogni nodo porta la sua `casa` (l\'unica pagina che lo mostra) e i `conteggi` calcolati dal server: ogni oggetto una volta sola, e i pin di un\'Area contano per oggetto (riferimento, poi voci collegate, poi pin) e non per versione. `totali` sono i numeri dell\'intestazione. Con `partita` quartieri e Aree del mondo dicono se sono già aperti (`disponibile`, `bloccoMotivo`): nessun nodo è nascosto. I Memento non ci sono.',
    risposta: '`GerarchiaMappeDto`',
    errori: [[404, 'partita-non-trovata']],
  },
  ```
- **Client FE** (`src/services/api/mappe.ts`, dopo `getConteggiAlbero` `:18`): `export const getGerarchiaMappe = (partita?: number): Promise<GerarchiaMappeDto> => apiGet(\`/mappe/gerarchia${queryString({ partita })}\`);` (importare `GerarchiaMappeDto`).
- **Non si toccano**: `GET /api/mappe/albero` (lo usano l'editor `EditorMappaPage.tsx:98`, `useNomeDelPosto.ts:15`, `AccessoMondoPage.tsx:55`, `DettaglioMappa` `MappaPage.tsx:506`) e `GET /api/mappe/albero/conteggi` (dopo B5 non ha più consumatori FE: `getConteggiAlbero` era solo di `MappaPage.tsx:148`; ma ha il suo test `server/routes/mappe-conteggi-pin.test.ts:73-88`): **si tiene**, si toglie in B19 (D9).

### 3.3 Servizio nuovo `server/services/mappe/gerarchiaMappe.ts`
Modulo foglia: importa e non è importato da nessuno tranne la rotta (nessun giro circolare; `mappeService.ts` è già 2567 righe e in conflitto B8/B9). Funzione `gerarchiaMappe(partitaId?: number): GerarchiaMappeDto`.

**Letture (una volta per richiesta, in blocco; niente query per nodo):**
1. `if (partitaId !== undefined) verificaPartita(partitaId)` (`server/services/verificaPartita.ts`).
2. `const aree = contestoAree()` (`casaMappa.ts:39-46`: mappa `chiave → RigaArea` e nomi dei contenitori); `caricate = immaginiCaricateDelleMappe()` (`immagineMappa.ts:24`).
3. Quartieri: `SELECT q.chiave, q.nome, q.ordine, m.chiave AS mappa FROM quartiere q JOIN mappa m ON m.tipo='quartiere' AND m.entita_tipo='quartiere' AND m.entita_chiave=q.chiave WHERE q.chiave <> 'mementos' ORDER BY q.ordine, q.chiave` (23 righe; stessa regola di `cittaService.ts:41,102-105`).
4. Palazzi: `SELECT chiave, nome, ordine, regola_boss FROM dungeon d WHERE ${SQL_PALAZZI} ORDER BY ordine, chiave`, con `const SQL_PALAZZI = "d.tipo = 'palazzo'"` **in un solo punto** (è il filtro di `utils/palazzi.ts` `soloPalazzi`): quando L8 B7 sposta Iweleth cambia solo questa riga (D3). La mappa radice di un Palazzo è `radiceDelPalazzo(k)` (`alberoMappe.ts:19-21`).
5. Aree: `SELECT * FROM area ORDER BY ordine, slug` (`RigaArea`).
6. Planimetrie: `SELECT chiave, nome, immagine_chiave, asset, ruolo_immagine, area_chiave, versione_etichetta, versione_ordine FROM mappa WHERE area_chiave IS NOT NULL ORDER BY area_chiave, versione_ordine, chiave` (273 righe).
7. Pin: `SELECT s.mappa_chiave, s.tipo, s.id, s.uid, s.riferimento_tipo, s.riferimento_chiave, v.voci FROM spillo s LEFT JOIN (SELECT spillo_id, group_concat(voce_chiave, '|') AS voci FROM spillo_voce GROUP BY spillo_id) v ON v.spillo_id = s.id WHERE s.mappa_chiave IS NOT NULL` (1757 righe). L'ordine dentro `group_concat` non è garantito da SQL: **ordinare le voci in JS** (`split('|').sort().join('|')`) prima di farne chiave.
8. Infiltrazioni: `infiltrazioniDelleAree()` (`legamiInfiltrazioni.ts:29-36`, Map area → infiltrazioni) più `SELECT chiave, nome, ordine, dungeon_chiave FROM dungeon_area WHERE dungeon_chiave IN (<palazzi>) ORDER BY ordine, chiave` per trovare quelle che non compaiono in nessuna lista (`senzaArea`).
9. Da collocare: `mappeDaCollocare()` (`areeService.ts:675`), com'è (include i Palazzi, esclude i Memento).
10. Disponibilità con partita: **esportare** `disponibilitaQuartiere` da `cittaService.ts:46` (oggi `function` non esportata: aggiungere `export`; è già la fonte di `elencaQuartieri`, `:109-112`), chiamata con `st = statoDisponibilitaPartita(partitaId)` una volta; per l'Area stessa regola del suo quartiere (`disponibilitaAree.ts:9-15`; le Aree dei Palazzi e quella della città: `disponibile: true`).
11. Immagini senza una query per nodo: `illustrazioneDellaMappa` (`immagineMappa.ts:54-60`) fa una `SELECT` e un `db.prepare` a ogni chiamata (~440 nodi). Estrarre in `immagineMappa.ts` la parte pura `illustrazioneDaRiga(r, caricate)` (`{ immagineUrl: caricata ? urlCaricata(caricata) : null, asset: r.ruolo_immagine === 'emblema' ? null : r.asset }`) e far chiamare a `illustrazioneDellaMappa` la stessa funzione: stesso risultato, nessuna regressione.

**Costruzione dei nodi e case:**

| Nodo | `chiave` | `casa` | `immagine` | Ordine dei figli |
|---|---|---|---|---|
| Tokyo (`citta`) | `tokyo` | `/guida/citta` | `illustrazioneDaRiga` della mappa `tokyo` (`AnteprimaMappa` ripiega sullo stemma, `AnteprimaMappa.tsx:30-33`) | quartieri per `quartiere.ordine`; poi le Aree della città (`citta_chiave`, oggi 1); poi i Palazzi per `dungeon.ordine` |
| Quartiere | chiave del quartiere | `/guida/citta/<q>` (`casaMappa.ts:79`) | illustrazione di `citta-<q>` | Aree per `ordine, slug` |
| Area del mondo | chiave piena (`citta/shibuya/central-street`) | `casaDellArea(a)` (`casaMappa.ts:60-66`) | quella della sua planimetria predefinita (`area.planimetria_predefinita`) | planimetrie per `versione_ordine, chiave` |
| Palazzo | chiave del dungeon | `casaDelPalazzo(k)` (`casaMappa.ts:69-71`) | `null` (segno = `EmblemaDungeon`) | Aree per `ordine, slug` |
| Area di un Palazzo | chiave piena (`dungeon/madarame/museo-1p`) | `casaDellArea(a)` → `/guida/dungeon/<k>/area/<slug>` | come sopra | planimetrie; `accanto` = le sue infiltrazioni |
| Planimetria | chiave pubblica (`chiaveMappa(interna)`, `percorsiMappe.ts:52`) | `casaDellArea(area, interna)`: `?planimetria=<pubblica>` se non è la predefinita | la sua | — |
| Infiltrazione | chiave di `dungeon_area` | `casaDelPalazzo(k) + '?infiltrazione=' + encodeURIComponent(chiave)` (come `contenutiGuidaService.ts:33`) | `null` | — |

Le chiavi **interne** servono ai join; il DTO porta chiavi pubbliche solo per le planimetrie (come `riassunto`, `mappeService.ts:157`). Il nome della planimetria è `versione.etichetta` oppure «Planimetria N» (lo calcola il FE con `nomeVersione`, `utils/aree.ts:45-47`).
Le 2 aree «Planimetria non attribuita» (Futaba, Shido) restano righe normali nel loro posto (D12, limite noto).

**Conteggi (E1, E2, E6) — regola unica nel servizio:**
- *planimetria*: pin propri, per gruppo, senza deduplicazione (è una versione).
- *Area*: i pin delle sue planimetrie con la regola di §2.4 (chiave = `${gruppo}|${riferimento? 'r:'+tipo+':'+chiave : voci? 'v:'+voci : 'u:'+uid}`; l'`uid` esiste per tutte le righe, `identitaSpillo.ts`).
- *quartiere / Palazzo / Tokyo*: pin propri della mappa-illustrazione (`citta-<q>`, `dungeon-<k>`, `tokyo`) più la somma delle Aree (già deduplicate); `quartieri`, `palazzi`, `aree`, `planimetrie`, `infiltrazioni` contati una volta.
- `totali`: cifre per l'intestazione (§2.1) calcolate sulle stesse liste; `pin` = pin di Tokyo (che comprende i Palazzi); nessuna somma nel client.
Controllo di coerenza da verificare a mano sui dati della copia (non un test): la somma dei `contenuto` delle Aree più i pin propri dei contenitori deve essere uguale a `totali.pin.contenuto`.

### 3.4 Prestazioni
~540 nodi (1 + 23 + 1 + 9 + 140 + 273 + 91 infiltrazioni) → risposta stimata nell'ordine di 100–150 KB: **da misurare**. Nessuna cache a priori (la risposta dipende da `partita`, e `invalidaCacheDiGioco`, `cacheDiGioco.ts:26`, la renderebbe fragile); se serve, memoizzare la parte senza `partita` e svuotarla da `invalidaCacheDiGioco`.

### 3.5 Punto d'innesto per B6 (Memento)
In `gerarchiaMappe()` la lista finale è `const radici = [tokyo, ...(B6: nodoMemento ? [nodoMemento] : []), daCollocare]`: B6 aggiunge **una radice** (come vuole `modifiche.md` §3/E8: «Memento radice accanto a Tokyo»; la memoria di progetto dice invece «Città → Memento»: se il PM sceglie quest'ultima, il nodo va invece fra i `figli` di Tokyo, nello stesso punto). I tipi `memento | dedalo | area-dedalo` sono già nel DTO e la tabella di etichette/icone del FE (§4.2) ha già la voce: B6 non tocca `shared/types.ts`. B6 deve anche portare i 10 fogli di §2.3 sotto il suo nodo.

### 3.6 Iweleth finché L8 non è fatto
Compare **una sola volta**, come Palazzo (è `dungeon.tipo='palazzo'`, come in `DungeonPage` via `soloPalazzi`), con `dedalo: true` (da `regola_boss='memento'`) e con le sue 16 aree e 12 infiltrazioni. Il ramo Memento (B6) non ha ancora il dedalo `mementos-08-iweleth`: B6 dipende da L8 B7 proprio perché lì Iweleth diventa solo dedalo. Quindi **non c'è doppione** in B5. Quando L8 B7 cambia il tipo di Iweleth, `SQL_PALAZZI` lo toglie dai Palazzi da solo (e le sue `area` con `dungeon_chiave='iweleth'` seguono la decisione di L8: da verificare in quel lotto).

### 3.7 Cosa il BE non cambia
`casaMappa.ts`, `mappeDaCollocare`, `collocaPlanimetria`, `elencaMappe`, `conteggiAlbero`, `RisolviMappa` lato server (`contenutiGuidaService.ts:41-52`). Nessuna migrazione, nessuna scrittura.

### 3.8 «Nuova mappa» nell'editor (R11-14/1, FE ma legata al BE)
- Prova del problema: `creaMappa` rifiuta con 409 `usa-aggiungi-area` ogni figlia (anche indiretta) di un Palazzo diverso dai Memento (`mappeService.ts:992-995`; `palazzoDellaMappa('dungeon-madarame')` → `'madarame'`, `alberoMappe.ts:43-51`); il pulsante «Nuova mappa» compare per Palazzi (`EditorMappaPage.tsx:585-587`, perché `paginaPerAggiungere` torna null fuori dal mondo, `utils/aree.ts:36`) e «Crea mappa collegata» idem (`EditorMappaPage.tsx:786`, `:258`).
- Modifica: in `src/utils/aree.ts` estendere `paginaPerAggiungere` ai Palazzi: se `mappa.casa` comincia per `/guida/dungeon/` torna `{ href: <scheda del Palazzo>, testo: 'Aggiungi area / planimetria dalla scheda del Palazzo' }`, dove la scheda è `casa` senza `/area/<slug>…` e senza query (`/^(\/guida\/dungeon\/[^/?#]+)/`). Così per i Palazzi il pulsante diventa il collegamento (come nel mondo), e «Nuova mappa» resta **solo** dove `casa` non è né `/guida/citta…` né `/guida/dungeon/…`: la radice dei Memento (`/guida/mappe/dungeon-mementos`), fino a B6.
- Dipendenze: `EditorMappaPage.tsx:439,713` già usano `paginaPerAggiungere`. Nessun'altra modifica. Il test `EditorMappaPage.test.tsx:816-820` («fuori dal mondo (un Palazzo) “Nuova mappa” e il form completo restano») andrà in rosso a runtime (compila): superato da D1, §7.2.

## 4. Front-end

### 4.1 File
| File | Azione |
|---|---|
| `src/components/mappe/IndiceLuoghi.tsx` | **nuovo**: corpo della pagina `/guida/mappe` (titolo, caricamento, intestazione, albero) |
| `src/components/mappe/AlberoGerarchia.tsx` | **nuovo**: l'albero (righe ricorsive, rami aperti/chiusi) |
| `src/components/mappe/FinestraCollocaPlanimetria.tsx` | **nuovo**: «Colloca» per quartiere o Palazzo (estratta e generalizzata da `AreeDellaCitta.tsx:115-156`) |
| `src/components/mappe/PlanimetrieDaCollocare.tsx` | **nuovo**: la riga «Da collocare» con l'elenco e il gesto (stesso contenuto di `AreeDellaCitta.tsx:81-95`) |
| `src/pages/MappaPage.tsx` | **ridotto**: `if (!chiave) return <IndiceLuoghi />`; tolti `radiciRaggruppate`, `IndiceMappe`, `PannelloLuogo` (§4.5) |
| `src/components/mappe/AreeDellaCitta.tsx` | usa `FinestraCollocaPlanimetria`; stesso aspetto e stessa API (D8) |
| `src/components/mappe/AlberoLuoghi.tsx` | **eliminato** |
| `src/services/api/mappe.ts` | `getGerarchiaMappe` |
| `src/components/guida/sezioniGuida.tsx:25` | titolo e descrizione (D2) |
| `src/utils/aree.ts` | `paginaPerAggiungere` ai Palazzi (§3.8) |
| `src/components/mappe/MappaTokyo.tsx`, `CittaPage.tsx`, `OggiMappa.tsx` | **non toccati** (D4) |
| `src/router.tsx` | **non toccato**: `guida/mappe` resta (`router.tsx:85,87,88`); lo toccano B3/B4 |

### 4.2 Albero: struttura, stato, aspetto
**Pagina** (`IndiceLuoghi`): `useDocumentTitle('Luoghi della guida')`; `const attiva = usePartitaStore(s => s.attiva)`; `const g = useCarica(() => getGerarchiaMappe(attiva?.id), [attiva?.id])`; `IntestazionePagina titolo="Luoghi della guida"` con sottotitolo «Città, Palazzi e Memento con le loro aree.» (testo di `modifiche.md` §3; finché B6 non c'è dice «Città e Palazzi con le loro aree e planimetrie.») più la riga dei totali **composta dai numeri di `g.dati.totali`**, parole al singolare/plurale come in `contenuto()` del vecchio indice: «1 città · 23 quartieri · 23 aree (28 planimetrie) · 9 Palazzi · 117 aree (245 planimetrie) · N pin · più N passaggi e N note» (`testoConteggiPin`, `utils/presentazioneMappa.ts:76-77`; mai «mappe»). `PageState isLoading error onRetry` come in `MappaPage.tsx:162`.

**`AlberoGerarchia({ radici, totali, onRicarica })`**
- Stato: `aperti: Set<string>` con chiave `${tipo}:${chiave}`; all'inizio il nodo Tokyo aperto, tutto il resto chiuso («rami chiusi oltre quartiere/Palazzo»: i quartieri e i Palazzi sono visibili sotto Tokyo, le loro aree no finché non li apri, le planimetrie no finché non apri l'area). Persistenza in `sessionStorage` (chiave `p5r-albero-aperti`, JSON di array, ogni accesso in `try/catch` e fallback in memoria, come `utils/ritornoMappe.ts:21-32`): tornando indietro dalla casa di un nodo (che non è una pagina di mappa, quindi non cambia `ritornoMappe`) l'albero ritrova i rami aperti. Niente `localStorage`.
- Ogni riga, **due gesti separati**: (1) pulsante a sinistra per aprire/chiudere (`<button type="button" aria-expanded aria-controls={id} aria-label="Apri <nome>" className="touch …">`, 44×44, solo se il nodo ha `figli`/`accanto`/`senzaArea`); (2) `<Link to={nodo.casa}>` su miniatura + nome + conteggi, `touch` (alto ≥ 44), `min-w-0 break-words`. Mai un solo bersaglio con due significati (errore del vecchio indice, commento `MappaPage.tsx:163-171,206`).
- Miniatura: `AnteprimaMappa` (`h-9 w-12`, `sizes="48px"`) con `{ immagineUrl, asset, nome, chiave }` presi dal nodo; per `palazzo` `EmblemaDungeon` (`dimensione={36}`, `chiave` = chiave del dungeon: `EmblemaDungeon.tsx:20`); per planimetrie e aree la miniatura è la loro. Le miniature caricano `lazy` e **si montano solo i rami aperti** (rendering condizionale), quindi all'apertura della pagina se ne caricano ~35.
- Righe dei conteggi (`text-[11px] text-text-muted`, dal `conteggi` del nodo, parole del livello, mai «mappe»): Tokyo «23 quartieri · 9 Palazzi»; quartiere «N aree · M planimetrie · K pin» (0 aree: «nessuna area · K pin»); Palazzo «N aree · M planimetrie · I infiltrazioni · K pin»; Area «M planimetrie · K pin»; planimetria «K pin»; con `title` = `testoConteggiPin` per «più N passaggi e N note». Per l'Area il `title` aggiunge «ogni oggetto una volta, anche se sta su più versioni».
- Segni: «Da verificare» (`daVerificare`, stesso chip `chip chip--attivo` di `AreeDellaCitta.tsx:68`); «Non ancora aperto» (`disponibile === false`, con `bloccoMotivo` nel `title`, come `CittaPage.tsx:109`); «Dedalo» (`dedalo`).
- Corpo di un nodo aperto: `<ul id>` con i `figli` ricorsivi; per un'Area di Palazzo, prima delle planimetrie, la riga «Infiltrazioni: A · B · C» con un `Link` ciascuna a `nodo.casa` dell'infiltrazione (`inline-flex touch`); per un Palazzo, dopo le aree, il gruppo «Infiltrazioni senza area (N)» se `senzaArea` non è vuoto.
- Intestazioni di gruppo sotto Tokyo, dedotte dal `tipo` dei figli consecutivi (non c'è un nodo «gruppo» nel DTO): «Quartieri · 23» (sottotitolo: `totali.areeMondo` aree, `totali.planimetrieMondo` planimetrie), «Da verificare» (le aree con `daVerificare`, come `AlberoLuoghi.tsx:64-66,115-121`), «Palazzi · 9» (sottotitolo: `totali.areePalazzi` aree, `totali.planimetriePalazzi` planimetrie).
- Tabella etichette/icone per `tipo` (inclusi `memento`, `dedalo`, `area-dedalo`, per B6) in un oggetto statico: **mai classi Tailwind interpolate** (CLAUDE.md); i rientri sono un array `['', 'pl-3', 'pl-6', 'pl-9']` di classi complete.
- Struttura semantica: liste `<ul>/<li>` annidate con `aria-label` («Quartieri», «Aree di Shibuya», «Planimetrie di Central Street»), niente ruoli ARIA `tree` (richiederebbero la tastiera a frecce): i pulsanti sono raggiungibili con Tab.
- «Da collocare» è l'ultima radice, **sempre presente** (D7): riga chiusa «Da collocare · N»; con N=0 dice «nessuna planimetria da collocare» e non si apre; con N>0 aperta mostra `PlanimetrieDaCollocare`.

**Scorrimento (R11-27, `areeScorrevoli.test.ts`)**: la pagina scorre da sola (una barra, come UX2-15, `MappaPage.tsx:297-299`); un solo livello annidato, il corpo di un nodo **di livello 1** (quartiere o Palazzo aperto) con più di 8 figli: classe `area-scorrevole max-h-[min(60vh,520px)]` (utility di `tailwind.css:1894-1908`: confine, ombre ai bordi, barra d'accento, `overscroll-behavior: contain`). Vietato `overflow-y-auto` e simili nei componenti (il test di guardia li cerca: `areeScorrevoli.test.ts:29-31`). Sotto 8 figli niente area scorrevole (evita bordo e barra inutili).

**Tre formati (misure di progetto, da verificare con il browser)**
- 1280: una colonna a larghezza piena (`max-w` della pagina), riga con toggle 44 + miniatura 48×36 + testo + chip a destra.
- 768: come 1280; i chip vanno a capo sotto il nome.
- 375: toggle 44 + miniatura 48 + testo ≈ 200 px; conteggi a capo sotto il nome; rientro massimo 36 px (3 livelli); nessuno scorrimento orizzontale (`min-w-0` e `break-words` su ogni testo); intestazione della pagina ≤ 30% dell'altezza (regola di progetto): titolo breve, la riga dei totali va a capo e **non** ripete le sezioni.
- Altezze realistiche della regola «Altezze realistiche»: 1366×657, 1280×689, 1024×690 con Tokyo aperto e tutto il resto chiuso: i 23 quartieri + le intestazioni devono stare in una pagina scorrevole senza barre doppie.

### 4.3 «Da collocare» e «Colloca» (R11-13/1)
- `PlanimetrieDaCollocare({ elenco, contenitori, onCollocata })`: riga per `MappaDaCollocareDto` (miniatura, nome, `genitoreNome · N pin`, pulsante «Colloca» come `AreeDellaCitta.tsx:84-93`).
- `FinestraCollocaPlanimetria({ mappa, contenitori, onChiudi, onCollocata })` con `contenitori: Array<{ tipo: 'quartiere' | 'dungeon'; chiave: string; nome: string; mappa?: string; aree?: Array<{ slug: string; nome: string }> }>`. Il contenitore proposto è quello con `mappa === mappaDaCollocare.genitore` (per i quartieri `mappaChiave` come oggi, `AreeDellaCitta.tsx:118`; per i Palazzi il nodo porta `mappa`). Il selettore dice «Quartiere» se i contenitori sono solo quartieri, «Quartiere o Palazzo» altrimenti. Le aree: dal payload dell'albero (`figli` dei nodi, con `slug`) — nessuna chiamata in più; se `aree` manca (uso da `AreeDellaCitta`) si caricano come oggi con `getQuartiere` (`AreeDellaCitta.tsx:123`). Il salvataggio è `collocaPlanimetria({ mappa, quartiere | dungeon, area | nuova, etichetta })` (`src/services/api/aree.ts:78`), che il server già accetta per i Palazzi (`areeService.ts:565-580`; schema `bodyColloca`, `schemas/aree.ts:67-74`).
- Dopo «Colloca» si rilegge l'albero (`g.ricarica()`): la planimetria sparisce da «Da collocare» e compare sotto la sua Area.
- `AreeDellaCitta` mantiene le sue due sezioni («Aree della città» con «Tieni»/«Rimuovi» e le sciolte) e passa a `FinestraCollocaPlanimetria` con soli quartieri: stesso comportamento, un solo modulo (D8). Il test `FinestreAree.test.tsx` (non letto per intero) va controllato a mano: non cambiare etichette né nomi accessibili.

### 4.4 Testi (M3–M5, `L5/app.md:218-220`)
- `sezioniGuida.tsx:25`: `titolo: 'Luoghi della guida'`, `descrizione: 'Città, Palazzi e Memento con le loro aree: l\'albero di tutti i luoghi, con le planimetrie e i pin'` (finché B6 non c'è: senza «Memento»). La stringa «Mappe» sparisce come nome di posto (D2).
- Fuori da B5 ma da non dimenticare: `useDocumentTitle` `«<nome> — Mappe»` in `MappaPage.tsx:508` e `EditorMappaPage.tsx:131` (riga M8/M27, resta come decisione di L5, `L5/app.md:337,343`).

### 4.5 `MappaPage.tsx`: cosa si toglie e cosa resta
- **Si toglie**: `radiciRaggruppate` `:64-76`; `IndiceMappe` `:78-254`; `PannelloLuogo` `:256-317`; il commento e `TOKYO`/`CITTA` restano (usati da `MappaPage` `:40-41,58-59`).
- **Import da togliere** (verificati con `grep` per riga): `testoConteggiPin` e `titoloGruppoImmagini` (`:7`), `AlberoLuoghi` (`:8`), `nomeDellaMeta` (`:13`, solo `:291`), `getConteggiAlbero` (`:24`), `IntestazionePagina` (`:27`, solo `:160`). Restano: `ImmaginiLuogo` (`:296` e `:516`), `etichetteDistinte`/`nomeTecnicoMappa`/`pinDiContenuto`/`testoPin`/`nomePresentazioneMappa` (usati da `GriglieDelLuogo`/`LuogoSenzaPlanimetria`), `AnteprimaMappa` (`:463`), `getAlberoMappe` (`:506`).
- **Resta** (non di B5): `LuogoSenzaPlanimetria` `:329-377`, `GriglieDelLuogo` `:393-434` e `Griglia` `:448-488`. Dopo la rimozione di `PannelloLuogo` le usa soltanto la radice dei Memento (`/guida/mappe/dungeon-mementos`, la cui casa è il visore: `casaMappa.ts:84`); i Palazzi e i quartieri non ci arrivano più perché `MappaPage.tsx:60` li porta alla casa. Il parametro `onScendi` di `GriglieDelLuogo`/`Griglia` (`:393,448,482`) resta senza chiamanti: toglierlo con B6/B19, quando le tre funzioni escono.
- **Righe che B8/B9 toccano** (`:366`, `:528`, `:530`, `mappa.entita`): B5 le sposta soltanto (si perdono ~250 righe sopra). Fare le modifiche con `Edit` mirati e non riscrivendo il file; B8/B9 rileggono il file prima di modificarlo.

### 4.6 Editor
`EditorMappaPage.tsx`: nessuna modifica diretta; la correzione è in `utils/aree.ts` (§3.8). Controllare che `:786-792` (il «Crea mappa collegata» e il collegamento `aggiunta`) mostri per i Palazzi il collegamento, come nel mondo.

### 4.7 Nodi e viste da togliere, e loro importatori
| Da togliere | Dove sta | Importatori / lettori | Esito |
|---|---|---|---|
| visore di Tokyo (la planimetria `tokyo` come destinazione) | già fatto: `MappaPage.tsx:58-59` | `RisolviMappa`/`MappaPage.test.tsx:370,381` | **già fuori**; nessuna modifica |
| «Tokyo» come riga dell'indice (carta che apre il pannello o va a `CITTA`) | `MappaPage.tsx:174-243` (`:235` il ramo che porta a `CITTA`) | solo `IndiceMappe` | sparisce con `IndiceMappe`; Tokyo è la **radice** dell'albero, con casa `/guida/citta` (D8b) |
| nodo illustrazione (la planimetria d'ingresso/illustrazione del quartiere come nodo a sé) | `AlberoLuoghi.tsx:93-96` (famiglie di immagini senza Area), `MappaPage.tsx:296` | `PannelloLuogo` | sparisce; il quartiere è un solo nodo |
| griglia del Palazzo | `GriglieDelLuogo`/`Griglia` dentro `PannelloLuogo` `:300-303` | `PannelloLuogo` (e `LuogoSenzaPlanimetria` per i soli Memento) | sparisce dal pannello; il resto con B6/B19 |
| `PannelloLuogo` | `MappaPage.tsx:262-317` | solo `IndiceMappe` `:245-247` | eliminato |
| `AlberoLuoghi` | `components/mappe/AlberoLuoghi.tsx` (124 righe) | `MappaPage.tsx:8,313`; **test** `CollezioniImmagini.test.tsx:8`, `OrganizzazioneMappe.test.tsx:14` | eliminato; test in §7.2 |
| `radiciRaggruppate` | `MappaPage.tsx:64-76` | solo `IndiceMappe` `:144` | eliminata |
| `MappaTokyo` | `components/mappe/MappaTokyo.tsx` (540 righe) | `CittaPage.tsx:20,80`, `OggiMappa.tsx:20,69`, `MappaTokyo.test.tsx` | **non si toglie** (D4) |

## 5. Indirizzi vecchi che devono continuare a funzionare (R11-22)
B5 **non modifica** nessuno dei file che li reggono; la prova è statica (`git diff` non deve toccare `RisolviMappa.tsx`, `navigazioneMappa.ts`, `casaMappa.ts`, `contenutiGuidaService.ts`, `router.tsx`, `DungeonDettaglioPage.tsx`, `AccessoMondoPage.tsx`, `CovoPage.tsx`).

| Indirizzo vecchio | Come arriva alla casa | Prova |
|---|---|---|
| `/guida/mappe` | indice nuovo (stesso percorso) | `router.tsx:85`, `MappaPage.tsx:57` |
| `/guida/mappe/tokyo` | → `/guida/citta` | `MappaPage.tsx:58-59` |
| `/guida/mappe/<planimetria>` | → casa dell'Area con `?planimetria=` e arrivo (`spillo`, `x`, `y`, `zoom`, `contesto`, `area`) | `MappaPage.tsx:59-60`, `RisolviMappa.tsx:15-17`, `navigazioneMappa.ts:42-50`, server `contenutiGuidaService.ts:41-52` |
| `/guida/mappe/<mappa del quartiere>` | → `/guida/citta/<q>` | `casaMappa.ts:79` |
| `/guida/mappe/<palazzo>` e `/guida/mappe/<palazzo>?area=<infiltrazione>` | → `/guida/dungeon/<k>?area=…` (la scheda legge `infiltrazione` **o** `area`) | `casaMappa.ts:81`, `navigazioneMappa.ts:42-50` (`area` conservato), `DungeonDettaglioPage.tsx:224` |
| alias di una sezione di guida | → scheda del Palazzo `?infiltrazione=` | `contenutiGuidaService.ts:26-35,41-46`, `RisolviMappa.tsx:16` |
| `/guida/mappe/<k>/modifica` | editor | `router.tsx:88` |
| «Apri sull'atlante» da negozi/oggetti/diario (`/guida/mondo/:tipo/:chiave`, `/guida/negozi/:chiave`) | invariati | `router.tsx:86,107`, `AccessoMondoPage.tsx:109` |
| Covo | pagina `/guida/covo` (sfide e premi) e Area `citta/yongen-jaya/covo-dei-ladri` (chiave pubblica fissa `covo-dei-ladri`) | `router.tsx:99`, `AnteprimaMappa.tsx:30-33`; il Covo è sotto Yongen-Jaya nell'albero (5 versioni, `casaDellArea`) |
| `/guida/dungeon/<k>/area/<slug>`, `?infiltrazione=` | scheda con l'area aperta | `router.tsx:80-82` |

Il «Chiudi» di un visore aperto dall'albero torna all'albero: `ritornoMappe.ts:18-20` annota come pagina di ritorno ogni pagina che non è `/guida/mappe/<k>`, l'indice compreso.

## 6. Ordine dei passi e file condivisi con altri blocchi

**Passi (B5 da solo; un commit unico a fine lotto, CLAUDE.md)**
1. BE: DTO in `shared/types.ts` (§3.1); `export` di `disponibilitaQuartiere` (`cittaService.ts:46`); `illustrazioneDaRiga` in `immagineMappa.ts` (§3.3 punto 11); `gerarchiaMappe.ts`; `queryGerarchia`; rotta; riga in `CHIAVI_MAPPA_RISERVATE`; descrizione OpenAPI; `getGerarchiaMappe`. Verifiche: `npm run typecheck`, `npm run lint`.
2. Verifica dati del BE su **copia** (§7.1): totali di §2.1 e di §2.4 uguali a quelli della risposta.
3. FE: `FinestraCollocaPlanimetria` (estrazione da `AreeDellaCitta`, senza cambiare il comportamento di `La città`), `PlanimetrieDaCollocare`, `AlberoGerarchia`, `IndiceLuoghi`; collegare in `MappaPage.tsx`; togliere `IndiceMappe`, `PannelloLuogo`, `radiciRaggruppate`; eliminare `AlberoLuoghi.tsx`; testi M3–M5.
4. `utils/aree.ts` (`paginaPerAggiungere`) — indipendente, parallelizzabile.
5. Test: solo le modifiche minime di §7.2 per far compilare; nessuna esecuzione.
6. `npm run typecheck && npm run lint && npm run build`; osservazione nel browser su istanza **di copia** (§7.3).
7. Aggiornamento di `docs/ROADMAP.md`/`docs/DECISIONI.md` con una riga (D1–D12 «consigliata applicata, da confermare»); il consolidamento è B20.
8. Verifica avversariale da un agente distinto (CLAUDE.md, punto 2), con questo file e `requisiti.md` R11-11…14, R11-26, R11-27 come specifica.

**File condivisi**
| File | Con chi | Regola |
|---|---|---|
| `shared/types.ts` | B3 (DTO ricerca), B7/B8/B9 (DTO tolti) | B5 aggiunge un blocco dopo `:1694`; non tocca `MappaRiassuntoDto` (B9 toglie `gruppoImmagini`, `entita`) |
| `server/routes/mappe.ts` e `server/openapi/descrizioni/mappe.ts` | B3 (ricerca), B7 (rotte orfane: `/entita/:tipo/:chiave` `:84`, `/pezzi/:id` PUT `:177`) | un solo proprietario alla volta; la nuova rotta va prima di `/:chiave` (`:100`) |
| `server/services/mappe/mappeService.ts` | B8, B9 (conflitto alto) | B5 tocca **solo** `CHIAVI_MAPPA_RISERVATE` (`:627-630`) |
| `src/pages/MappaPage.tsx` | B9 (`:366,528,530`), B6 (Memento: `LuogoSenzaPlanimetria`, griglie) | B5 per primo (B9 dipende da B5); modifiche con `Edit`, non riscritture |
| `src/router.tsx`, `src/components/layout/{Topbar,BottomNav,MainLayout}.tsx` | B3/B4 (ricerca) | B5 **non li tocca** |
| `src/components/mappe/AreeDellaCitta.tsx`, `FinestreAree.test.tsx` | — | B5 solo per usare la finestra condivisa |
| `server/services/cittaService.ts`, `immagineMappa.ts` | B3 (percorso/immagine nei risultati) | B5: un `export` e un'estrazione pura |
| `src/utils/aree.ts` | — | solo B5 |
| `docs/ARCHITETTURA.md` | B20 | B5 aggiunge una riga al massimo |

Possibile riuso con B3: il `percorso` «Tokyo › Shibuya › Central Street» della ricerca (R11-08) può usare gli stessi nomi e case di `gerarchiaMappe()` (esportare una mappa chiave → percorso dal servizio): da concordare, non necessario.

## 7. Come si verifica senza test

### 7.1 Controlli statici e sui dati (sola lettura)
- `npm run typecheck` (include `tsconfig.test.json`: vedi §7.2), `npm run lint`, `npm run build`.
- Lettura dei file toccati contro §3–§4 (riga per riga, tre passate, CLAUDE.md globale).
- **Dimostrazione dei posti** (appendice): lo script SQL su una copia deve dare 1 + 23 + 9 + 273 + 0 + 10 (B6) = 316 e 0 eccezioni nei controlli di coerenza.
- **Conteggi della risposta**: far girare `gerarchiaMappe()` con `tsx` su una **copia** (`DATA_DIR` punta a una cartella con una copia di `gioco.db`/`partite.db`; `initDb` applica le migrazioni alla **copia**, mai a `data/`, `server/config.ts:17`) e confrontare con §2.1/§2.4: Tokyo quartieri 23; aree 140; planimetrie 273; Palazzi 9; infiltrazioni 91; `senzaArea` 15; Covo 10/5/12; Sottopasso 6/5/0. Questa è **osservazione di runtime** e va detta tale; se non la si esegue, va scritto «non osservato».
- `git diff --stat` non deve toccare i file di §5.

### 7.2 Test: cosa va in rosso e cosa serve per compilare
Regola: nessun test nuovo o eseguito. R11-04 vieta di cancellare i file, non di dichiarare superato un caso con il suo motivo.
- **Devono compilare** (rompono il typecheck, perché `AlberoLuoghi.tsx` sparisce): `src/components/mappe/CollezioniImmagini.test.tsx` (import `:8`, casi che lo renderizzano `:16,28,37,44`) e `src/components/mappe/OrganizzazioneMappe.test.tsx` (import `:14`, casi `:25,35,48,55,73,161,214`). Modifica minima: togliere l'import e per ogni caso che lo usa commentare il corpo e lasciare `it.skip('SUPERATO da L11/B5: <frase del caso>', () => {})`. I casi che non lo usano restano com'erano.
- **`src/pages/MappaPage.test.tsx`**: compila ancora (mocka `getConteggiAlbero`, che B5 non toglie dal client); i casi dell'indice vecchio diventano superati: `:147` (radice nel pannello), `:169` (R1), `:189` (E4), `:203` (E2), `:219` (UX3-8), `:245` (UX2-15), `:256` (UX3-7), `:391` (LAY2-5). Dichiararli `it.skip` con motivo, senza eseguirli. Restano validi quelli del visore e dei redirect (`:78-145` quelli di «Chiudi»/«Torna alla partita» dei visori, `:272-360`, `:361-480`).
- **`src/pages/EditorMappaPage.test.tsx:816-820`**: da D1.
- **`server/openapi/openapi.test.ts`**: non si modifica; esige la nuova descrizione (§3.2).
- Nessun test server fa riferimento a ciò che B5 toglie; `server/routes/mappe-conteggi-pin.test.ts` resta valido (la rotta `/albero/conteggi` resta).

### 7.3 Browser (solo se si osserva davvero, su istanza di copia o di prova)
Aprire `/guida/mappe` a 1280, 768, 375 e alle altezze realistiche: Tokyo aperto, 23 quartieri visibili; aprire Shibuya (6 aree) e Madarame (8 aree); aprire il Sottopasso/Covo e una Area di Palazzo con infiltrazioni; ogni riga porta alla casa elencata in §5; bersagli ≥ 44 px; nessuno scorrimento orizzontale; un solo scorrimento annidato per volta, con confine e `overscroll-behavior` (Futaba, 18 aree: supera 8 figli). «Colloca» **non** si prova sui dati reali (0 elementi e scrive): su una copia con una planimetria scollegata, oppure si dichiara non osservato. Nessuna prova in scrittura su dati dell'utente.

## 8. Decisioni da confermare (con il default prudente applicato)
- **D1 — «Nuova mappa» nei Palazzi** (§8.9 della preparazione). Default: **tolta anche lì**, sostituita dal collegamento «Aggiungi area / planimetria dalla scheda del Palazzo» (§3.8); il pulsante resta solo per la radice dei Memento fino a B6. Motivo: il server la rifiuta sempre. Alternativa: limitare la voce al mondo e lasciare il pulsante inutile nei Palazzi (non consigliata).
- **D2 — Nome della pagina** (§8.12). Default: **«Luoghi della guida»** (titolo pagina, tessera di `sezioniGuida.tsx:25`, titolo del documento); il percorso `/guida/mappe` non cambia.
- **D3 — Iweleth finché L8 non è fatto**. Default: **una volta sola, fra i Palazzi**, con il segno «Dedalo» (`dedalo: true`); non nel ramo Memento (B6, dopo L8 B7). Quando L8 B7 cambia il suo tipo, `SQL_PALAZZI` lo toglie da solo.
- **D4 — `MappaTokyo` (la metro)**. Default: **non si toglie**; si tolgono il visore di Tokyo (già fatto) e la riga «Tokyo» dell'indice. Se l'utente volesse togliere anche la metro, è un lavoro a parte che riscrive `La città` e la colonna «Oggi» (`CittaPage.tsx`, `OggiMappa.tsx`, Home).
- **D5 — Quartieri e Aree chiusi per la partita**. Default: **mostrati con il segno «Non ancora aperto»** (come `La città`, `CittaPage.tsx:106-110`, e come vuole R11-10b); oggi l'albero piatto nasconde le planimetrie di un quartiere chiuso (`mappeService.ts:230`, `disponibilitaAree.ts:9-15`) ma non il quartiere: incoerente. Alternativa: nasconderle come oggi.
- **D6 — Regola E6**. Default: chiave = riferimento → voci collegate → `uid`, dentro l'Area (§2.4). Alternativa citata da `modifiche.md` («senza riferimento per posizione»): non deduplica quasi nulla (le versioni hanno posizioni diverse). Il test del Covo (nessuna differenza) e del Sottopasso (passaggi 10 → 5) è in §2.4.
- **D7 — «Da collocare» sempre presente** come ultima riga (anche con 0, dice «nessuna planimetria da collocare»), perché R11-13 chiede che sia raggiungibile. Alternativa: mostrarla solo con N>0.
- **D8 — «Colloca»**: una finestra sola (`FinestraCollocaPlanimetria`) per quartiere **e** Palazzo, usata dall'albero e da `La città`. D8b: Tokyo è la **radice** dell'albero (casa `/guida/citta`); i Palazzi stanno sotto Tokyo (`modifiche.md` §3); i Memento (B6) come radice accanto a Tokyo (E8). La memoria di progetto dice «Città → Memento»: scelta per B6.
- **D9 — `GET /api/mappe/albero/conteggi`**: **si tiene** (ha un test, `mappe-conteggi-pin.test.ts:73-88`); si toglie in B19 insieme a `ConteggiAlberoDto` e `getConteggiAlbero`.
- **D10 — Infiltrazioni senza Area (15)**: elenco «Infiltrazioni senza area» sul nodo del Palazzo.
- **D11 — Test**: `it.skip` con motivo e corpo commentato (§7.2), senza cancellare i file né eseguirli (lettura di R11-04; richiede il permesso di «modifiche minime ai test» di §8.2 della preparazione).
- **D12 — Aree con nome tecnico** («… — Planimetria non attribuita», Futaba e Shido): righe normali nel loro posto, nessun gruppo nascosto (oggi stanno in «Fogli dell'estrazione senza nome», UX3-8). Alternativa: raggrupparle in fondo al Palazzo.

## 9. Rischi
1. **Cifre diverse dai documenti** (28 contro 29; 117/245 con Iweleth): il FE non scrive numeri; i documenti vanno aggiornati con le cifre dell'istanza reale, non della copia.
2. **Conflitti di merge** con B8/B9 su `MappaPage.tsx` (si spostano righe) e su `mappeService.ts` (una riga): fare B5 prima, `Edit` mirati.
3. **Regressione di «La città»** estraendo il modulo «Colloca» da `AreeDellaCitta`: stessa API, stessa interfaccia; verificare a mano `FinestreAree.test.tsx` (non letto).
4. **Deduplicazione E6 troppo aggressiva o troppo timida**: misurata (§2.4); il confronto Covo/Sottopasso è il controllo.
5. **Doppione di Iweleth**: escluso in B5 (D3); ricompare se B6 parte prima di L8 B7.
6. **I 10 fogli del Memento** non hanno un posto fino a B6: limite dichiarato, non difetto.
7. **Test in rosso a runtime** dopo B5 (indice vecchio, «Nuova mappa»): dichiararli superati; la verifica avversariale deve saperlo.
8. **Dimensione della risposta** (~540 nodi): da misurare; rendering solo dei rami aperti.
9. **Quartieri chiusi mostrati** (D5): cambia un comportamento visibile (le aree di un quartiere chiuso oggi spariscono dall'indice): da far confermare.
10. **`sessionStorage`** dei rami aperti: se non disponibile l'albero funziona senza memoria (try/catch).
11. **Repo pubblico**: nessun nome utente, nome di partita o indirizzo nei documenti e negli script di verifica.

## 10. Limiti di questa analisi
- Misure sulla copia `sim-142b` (gioco 146); il repository ha migrazioni fino alla 163 (147–163 non sono nella copia): i conteggi vanno rifatti sulla copia aggiornata prima di scrivere cifre nei documenti.
- Non ho eseguito l'app, il typecheck, il lint né alcun test; il solo codice eseguito è stato lo script di sola lettura sulla copia (con `tsx` per importare `shared/spilli.ts`).
- Non ho letto per intero `QuartierePage.tsx`, `AreaPage.tsx`, `DungeonDettaglioPage.tsx`, `FinestreAree.test.tsx`, `MappaTokyo.tsx`: dove li cito è per righe lette con `grep`.
- Il significato di «oggetto» per E6 è ricavato da `spillo`/`spillo_voce` (i 307 pin con riferimento, 371 con voci, 1019 né l'uno né l'altro); la scelta resta D6.
- Il tempo di risposta e il peso del JSON di `gerarchia` sono stime (§3.4).
- «Visore di Tokyo» e «riga Tokyo» interpretati con `piano-razionalizzazione.md:220` e con il codice; se il PM intendesse altro, vedi D4.
- Le righe `file:riga` sono del worktree del 24/10 con lavoro non committato di altre sessioni: possono spostarsi.

## Appendice — script di sola lettura (copia `<COPIA>/gioco.db`, mai `data/`)

```js
// node script.cjs <COPIA>  — better-sqlite3 con { readonly: true }
const D = require('better-sqlite3');
const db = new D(process.argv[2] + '/gioco.db', { readonly: true });
const q = (s) => db.prepare(s).all();

// 1) ogni riga di `mappa` ha un posto
console.log(q(`
WITH p AS (
 SELECT m.chiave,
  CASE
   WHEN m.chiave='tokyo' THEN 'radice:tokyo'
   WHEN m.tipo='quartiere' AND m.entita_tipo='quartiere' AND m.entita_chiave<>'mementos' THEN 'quartiere'
   WHEN m.tipo='palazzo' AND m.entita_tipo='dungeon' AND m.entita_chiave<>'mementos'
        AND EXISTS(SELECT 1 FROM dungeon d WHERE d.chiave=m.entita_chiave AND d.tipo='palazzo') THEN 'palazzo'
   WHEN m.area_chiave IS NOT NULL AND EXISTS(SELECT 1 FROM area a WHERE a.chiave=m.area_chiave AND (a.quartiere_chiave IS NOT NULL
        OR a.citta_chiave IS NOT NULL OR EXISTS(SELECT 1 FROM dungeon d WHERE d.chiave=a.dungeon_chiave AND d.tipo='palazzo'))) THEN 'planimetria-di-area'
   WHEN m.area_chiave IS NULL AND m.genitore_chiave IN (SELECT chiave FROM mappa WHERE tipo IN ('citta','quartiere','palazzo') AND COALESCE(entita_chiave,'')<>'mementos')
        AND (m.tipo IN ('luogo','area') OR m.genitore_chiave IN (SELECT chiave FROM mappa WHERE tipo='palazzo')) THEN 'da-collocare'
   ELSE 'fuori-B5 (Memento, B6)' END AS posto
 FROM mappa m) SELECT posto, count(*) n FROM p GROUP BY posto`));
// atteso sulla copia: radice 1, quartiere 23, palazzo 9, planimetria-di-area 273, da-collocare 0, fuori-B5 10

// 2) ogni area ha almeno una planimetria, un contenitore esistente, e la planimetria coerente col genitore
console.log(q(`SELECT count(*) AS aree_senza_planimetria FROM area a WHERE NOT EXISTS(SELECT 1 FROM mappa m WHERE m.area_chiave=a.chiave)`));
console.log(q(`SELECT m.chiave FROM mappa m JOIN area a ON a.chiave=m.area_chiave WHERE NOT (
  (a.quartiere_chiave IS NOT NULL AND m.genitore_chiave='citta-'||a.quartiere_chiave) OR (a.citta_chiave IS NOT NULL AND m.genitore_chiave='tokyo')
  OR (a.dungeon_chiave IS NOT NULL AND m.genitore_chiave='dungeon-'||a.dungeon_chiave))`));
// atteso: 0 e nessuna riga

// 3) infiltrazioni senza area (devono stare in «Infiltrazioni senza area»)
console.log(q(`SELECT da.dungeon_chiave, count(*) n FROM dungeon_area da JOIN dungeon d ON d.chiave=da.dungeon_chiave AND d.tipo='palazzo'
  WHERE NOT EXISTS(SELECT 1 FROM infiltrazione_area ia WHERE ia.infiltrazione_chiave=da.chiave) GROUP BY da.dungeon_chiave`));
// atteso: futaba 6, kaneshiro 2, niijima 3, shido 4 (somma 15)

// 4) regola E6 su un'Area: pin per gruppo, grezzi e deduplicati (riferimento → voci ordinate → uid)
//    righe: spillo ⨝ mappa(area_chiave) con le voci di spillo_voce; il gruppo è gruppoConteggioSpillo(tipo) di shared/spilli.ts
```
