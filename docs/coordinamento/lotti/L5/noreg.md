# L5 «Luoghi, negozi, orari» — test no-reg

Sessione «Test no-reg — team p5s». Esiti grezzi in `esiti-noreg/`.

## 0. Base «prima» di L5 (richiesta del Manager; 2026-10-20 07:51 locali)
- **Dati**: copia di p5s `p5s-2026-10-20-0533Z` (gioco `8a0c5a56…` 108, partite `f1554be9…` 21), avviata su una copia mia col codice di L4
  committato `b83c30ac` (porta 3290, 108 → 112, partite 21 → 23). È lo stato da cui parte L5.
- **Strumento**: `l5-base.cjs` (in `esiti-noreg/base-prima/`, con l'uscita `l5-base.json`). DB in sola lettura e solo GET.
  - Righe complete di `luogo`, `negozio`, `articolo`, pin del mondo (sotto `tokyo`), `acquisto_partita`, `punti_negozio_partita`,
    `cestino`, `mappa_entita` dei luoghi.
  - Risposte di `/compendio/luoghi`, `/compendio/negozi?partita=1`, dettaglio dei 61 negozi, `/catalogo/luogo`, `/catalogo/negozio`, e le
    **54 mappe del mondo** con la partita 1 (per ogni pin: nome, tipo, x, y, riferimento, disponibilità, raccolto).
  - Con un secondo file confronta campo per campo.
- **Conteggi della base** (il M §1.3 dà gli attesi «dopo»):

  | Misura | Base |
  |---|---|
  | luoghi | **93**, colonne di oggi senza `area_chiave` / `orari_json` / `solo_eventi_confidente` |
  | negozi | **61**, con sede **57**, nessuna `eccezione_orari_json` |
  | articoli | **587** |
  | pin del mondo | **298**, di cui **54** con riferimento `luogo` |
  | acquisti p1 | **7** |
  | punti negozio | **0** |
  | cestino | **0** righe |
- **Impronte** (sha256, primi 16):

  | Dato | Impronta |
  |---|---|
  | `db.luogo` | `20707b18ea384b28` |
  | `db.negozio` | `d155c5e6313e5da9` |
  | `db.articolo` | `822a4fcc1afdb72b` |
  | `db.pinMondo` | `a82320e4594d9546` |
  | `db.acquisti` | `bdb748f76a40b0f6` |
  | `db.legamiLuoghi` | `158d563db42223be` |
  | `api.luoghi` | `4490227e9c15c576` |
  | `api.negozi` | `f530c4ae482469f5` |
  | `api.catalogoLuogo` | `3dd10945572c8fbf` |
  | `api.catalogoNegozio` | `3815d336555701b3` |
  | `api.mappeMondo` | `c8f915d874d3e93c` |

  La seconda lettura è identica. In `api.negoziDettaglio` varia solo il `requestId` dell'unica risposta 404, quella di
  `distributore-shujin-cancello-1`: è un negozio **nascosto** dall'utente (`nascosto = 1`), quindi il 404 è normale. Nel confronto il
  `requestId` si ignora.
- **Anteprima del Collaudo** (3302, gioco 113, solo GET alle 05:51Z): tutte le risposte API del perimetro di L5 sono **identiche** a quelle
  della mia copia.
- **Lavoro da preservare** sulla stessa base: diario 255/342, Kamoshida 169/359, Madarame 227/254, impronta `ff3033cb…` (Analisi dati);
  stato visibile e 75 «Sulla mappa» come in `L2/noreg.md` §0-ter.

## 1. Casi (dal piano, «Per i tester», e dal M §1.3)
| # | Pronto | Caso | Atteso |
|---|---|---|---|
| N5-1 | B1 (M5) | Conteggi del M §1.3 sulla copia | luoghi 93; con area **42** (da collocare 51, 13 con proposta); negozi con sede **58** (+`prossimo-asso`), 3 in elenco; **4** eccezioni di orario (Chiesa di Kanda domenica, Super Muramasa, Mran Mran, Fioraio Sukebe), nessuna per il Leblanc; pin di luogo 54 + 11 = **65**; Sakura Residence `solo_eventi_confidente='futaba'` |
| N5-2 | B1 | Idempotenza | Una seconda esecuzione scrive 0 righe |
| N5-3 | B1 | Pin dell'utente e del mondo | 298 pin con mappa, x, y, condizioni, nome e descrizione identici; `riferimento` cambiato **solo** sugli 11 pin omonimi seed. **Nessun pin dell'utente cambiato** (colonne comuni) |
| N5-4 | B1 | Lavoro da preservare | Impronta `ff3033cb…` identica (escluse le 4 colonne nuove del diario); stato visibile p1/p2 0; acquisti 7 e punti negozio 0 invariati |
| N5-5 | B3 | Pin del mondo nel visore | Le 54 mappe del mondo con la partita 1 (`l5-base.cjs`): stessi pin nelle stesse posizioni. Per i pin di luogo cambia solo quanto dichiarato (nome e descrizione dal luogo); i 75 «Sulla mappa» restano 75/75 |
| N5-6 | B4 | Acquisti, listini, «Dove si trova» | I 7 acquisti di p1 sugli stessi articoli; dettaglio dei 61 negozi uguale salvo sede e orari dichiarati; nessuna divergenza di orario fra scheda, visore e quartiere |
| N5-7 | B5 | Cestino | Righe del cestino di prima identiche; CHECK con `luogo` e `negozio`. Su una partita di prova: eliminare e rimettere un luogo dell'utente, e «Ripristina» su un luogo della guida corretto, tornano allo stato di prima |
| N5-8 | B6 | Giro completo (M §6.5) | Tutto quanto sopra, più pacchetto mappe esporta → importa identico, Memento identici e Vitest mirati |
