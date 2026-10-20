---
name: reference-get-che-scrivono
description: "dalla migrazione 108 (L1) una GET di un'immagine con ?l= scrive una riga di cache in immagine_miniatura: le prove «di sola lettura» nel browser non lo sono del tutto"
metadata:
  node_type: memory
  type: reference
  originSessionId: 79867d53-4ec1-4b44-8379-bf96cb5de1df
  modified: 2026-10-20T01:00:03.814Z
---

Dalla 108 (variante «miniature» di L1) `GET /api/immagini/<ambito>/<chiave>/file?l=<160|320|640|1024>` genera la miniatura alla prima richiesta e la **scrive** in `gioco.db` (`immagine_miniatura`); all'avvio il server ne riscalda 68 (schede). Aprire pagine nel browser (indice, anteprime, schede) su un'istanza di collaudo può quindi aggiungere righe di cache anche senza un solo clic che scrive (2026-10-20: 2 righe sull'istanza di Collaudo 3301 dal giro dei 75 «Sulla mappa»).

**How to apply:** nelle prove «solo lettura» su istanze altrui (Collaudo 3301/5473, `data/` condiviso) dichiarare questo effetto e, se conta, chiedere prima al Collaudo (procedura `p5s-coordinamento/collaudo/PROCEDURA-DATI.md`); nei confronti prima/dopo trattare `immagine_miniatura` come cache (escluderla o verificarla a parte). Vedi [[feedback-prove-sui-dati-reali]].
