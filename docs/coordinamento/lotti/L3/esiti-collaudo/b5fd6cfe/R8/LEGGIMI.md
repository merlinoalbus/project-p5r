# R8 del giro 1 di L3 — ciclo di scrittura dall'interfaccia su b5fd6cfe (Collaudo + Test funzionali, 2026-10-20 17:21–17:31Z)

Istanza 3301/5473 su `newreview-l3` = b5fd6cfe, base `L3-base-p5s-20261020-0948Z`. Solo file di testo, nessuna immagine. I gesti nel browser, a 1280×800, sono di Test funzionali; il loro esito è nei file di Test funzionali. Qui ci sono foto, scritture, differenze e ripristino.

| File | Contenuto | Esito |
|---|---|---|
| `1-foto.txt` | foto `foto/L3-R8` alle 17:21:59Z | identica alla base 0948Z |
| `2-scritture-be.txt` | scritture del BE.log dopo la foto (dalle 17:22:49.593Z alle 17:29:55.868Z, dichiarate dal tester) con il conteggio per rotta | **114** scritture, tutte dei gesti dichiarati; nessuna risposta 5xx |
| `BE-R8.log` | BE.log del ciclo, integrale | — |
| `3-differenze.txt` | impronta dopo le prove contro la foto e differenze riga per riga | vedi sotto |
| `4-ripristino.txt` | `stop-be`, `ripristina`, `start-be`, impronta | `RIPRISTINO OK`; dopo il riavvio impronta **IDENTICA** alla foto e alla base 0948Z; linea pulita |

## Scritture (`2-scritture-be.txt`)
- **Area:**
  - aggiunta: `POST /api/aree/dungeon/okumura` 201 («Prova R8 area», con la prima planimetria);
  - seconda planimetria: `POST …/prova-r8-area/planimetrie` 201.
- **Infiltrazione:**
  - aggiunta: `POST /api/compendio/dungeon/okumura/aree` 201;
  - aree collegate: `PUT …/okumura-prova-r8-infiltrazione/aree-palazzo` 200.
- **Eliminazioni:** `DELETE /api/aree/dungeon/okumura/caserma` 204 e `DELETE /api/compendio/aree/okumura-03-caserma` 204.
- **Cestino:** 2 × `POST /api/impostazioni/cestino/<id>/ripristina` 200.
- **Diario:** 26 × `PUT /api/compendio/percorso/voci/<uid>` 200 su 11 voci (conferma e togli; due voci 4 volte).
- **Partita di prova:** `POST /api/partite` 201, 77 × `PUT …/punti` 200, `POST /api/partite/1/attiva` 200, `DELETE /api/partite/3` 204.

## Differenze dopo le prove (`3-differenze.txt`)
- **Righe nuove, tutte della prova:**
  - `area` +1 `dungeon/okumura/prova-r8-area`;
  - `dungeon_area` +1 `okumura-prova-r8-infiltrazione`, con le 5 infiltrazioni successive scalate di 1 nell'ordine;
  - `infiltrazione_area` +4, i legami della prova;
  - `mappa`, `mappa_alias` e `mappa_percorso` +2 ciascuna, le due planimetrie;
  - `immagine` +2 (808, 809);
  - `immagine_miniatura` +10, la cache delle letture `?l=`.
- **Righe cambiate:** `updated_at` di `area` interscambio e caserma, per i legami della nuova infiltrazione, e `updated_at` della partita 1, riattivata.
- **Contenuto identico, ordine diverso:** `guida_alias`, `guida_mappa`, `mappa_entita`, `mappa_presentazione`, `pianta_area`, `proposta_infiltrazione_voce` e `punto_interesse`. Per chiave hanno **0 differenze**: cambia solo l'ordine dei rowid, perché eliminazione e ripristino dal cestino reinseriscono le righe. Il contenuto è identico, e torna con quanto il tester ha visto su una copia («le 10 tabelle di Okumura identiche a prima dell'eliminazione, updated_at compresi»).
- **Diario:** `voce_infiltrazione` uguale alla foto, perché ogni conferma è stata tolta. In `partite.db` la partita 3 non c'è più.
- Nessun'altra tabella cambia; il lavoro da preservare non è toccato. Dopo il ripristino tutto è **IDENTICO**.
