---
name: feedback-verifica-dati-freschi
description: "Prima di dire che un'istanza ha i dati nuovi si controllano segni precisi (conteggi e id del LEGGIMI), mai una parola che compare in una risposta"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 2c78c14e-c71b-4b7c-877c-34bbd3e0e5d9
  modified: 2026-10-20T04:56:01.161Z
---

Per stabilire che un'istanza (3201, 3301…) ha una copia nuova della produzione si confrontano i **segni esatti** della copia, presi dal suo
`LEGGIMI.md` o dalla bacheca: numero di voci dei Palazzi (es. Madarame 227), id dei pin nuovi (es. 2300, 2301), data di `gioco.db` e della
copia di avvio in `data/backups`. Una parola trovata nel JSON di una risposta (es. «Igor») non basta: può stare in un altro testo.

**Why:** il 2026-10-20 ho scritto in bacheca che il 3201 aveva la copia fresca perché nella risposta del 06-01 compariva «Igor». Era falso
(225 voci, pin assenti). Test layout e Test funzionali l'hanno scoperto, e ho dovuto correggere bacheca, esiti e difetti.

**How to apply:** prima di qualsiasi prova «sui dati nuovi», almeno due segni numerici della copia verificati via API o in sola lettura sul
DB; se non tornano, la prova si fa sui dati vecchi e lo si scrive. Le verifiche di sola struttura e testi restano valide comunque. Vedi
[[feedback-prove-sui-dati-reali]].
