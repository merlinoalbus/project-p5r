# Cicli di foto e ripristino dei dati — collaudo di L3 (istanza 3301/5473, `newreview-l3`)

La procedura è in `collaudo/PROCEDURA-DATI.md`. La base è `L3-base-p5s-20261020-0948Z`, cioè la copia di p5s 0948Z installata su fd988a3e (`fd988a3e/LEGGIMI.md`).

## Ciclo 1 — Test funzionali (F3-23, AP3-3, UX3-4/P3), codice d5eb9650
- 10:13:04Z: foto `foto/L3-ciclo1-funzionali`, identica alla base (`ciclo1-foto.txt`).
- Scritture del tester dalle 10:13:31Z alle 10:14:12Z. Nel BE.log ci sono 17 chiamate, tutte dichiarate (`ciclo1-ripristino.txt`, `BE-ciclo1.log`):
  - PUT e «ripristina» della Caserma di Okumura;
  - POST di `prova-funzionali-ap3-3`, con 3 PUT rifiutati con 409 e 2 accettati, poi DELETE e cestino 18;
  - partita 3: POST, 3 PUT dei punti, PUT del giorno;
  - attivazione della partita 1 e DELETE della 3.
- Impronta dopo le prove contro la foto (`ciclo1-differenze.txt`): cambiano solo 2 righe, nessun'altra tabella.
  - `area` dungeon/okumura/caserma: solo `updated_at`, perché il nome è ripristinato e `seed_json`/`nome_rivisto` sono uguali;
  - `partita` 1: solo `updated_at`.
- 10:14:39Z `ripristina` → `RIPRISTINO OK`. Dopo il riavvio del BE: health ok, impronta **IDENTICA** alla foto e alla base. Il FE è rimasto acceso.
- **Ciclo 1 chiuso.** Esiti del tester: F3-23, AP3-3, UX3-4 e P3 ✅.

## Ciclo 2 — Test layout, caso L3-L10 «Da collocare», codice 48d7a958
Piano in `ciclo2-da-collocare-piano.md`.
- 11:55:37Z: foto `foto/L3-ciclo2-da-collocare`, identica alla base (`ciclo2-foto.txt`).
- Preparazione (`ciclo2-preparazione.txt`):
  - **strada (a)**, 11:55:44Z: `POST /api/mappe/importa` di una mappa figlia di `dungeon-madarame` → HTTP 200, ma l'importazione le crea un'Area (`dungeon/madarame/planimetria-di-prova-da-collocare`). La lista resta vuota: è il comportamento previsto, quindi la strada non serve. L'importazione è stata tolta con il ripristino della foto (11:56:16Z);
  - **strada (b)**, a BE fermo: `stato-ciclo2-L3.cjs` toglie dall'Area «Museo 2P» la versione non predefinita `nativo-rmap-153-3-3` («Livello 3»: 2 pin, non è la planimetria iniziale di nessuna infiltrazione);
  - dopo il riavvio, `GET /api/aree/da-collocare` ha 1 riga, «Museo 2P - Livello 3», sotto il Palazzo di Madarame.
- Test layout ha fatto solo letture: la sezione alle 6 misure, «Colloca» aperta e chiusa con Annulla a 1366, 1024, 768 e 375.
- Dopo le misure, contro la foto (`ciclo2-differenze.txt`):
  - `mappa`: la sola riga staccata (`area_chiave`, `versione_ordine` e `versione_etichetta` → null);
  - `immagine_miniatura` +1: la cache dell'immagine 463 a 160 px;
  - nel BE.log nessuna scrittura.
- 11:59:09Z `ripristina` → `RIPRISTINO OK`. Dopo il riavvio del BE: health ok, «Da collocare» di nuovo vuota, impronta **IDENTICA** alla foto e alla base 0948Z.
- **Ciclo 2 chiuso.**
