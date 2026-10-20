---
name: feedback-tre-formati
description: "Ogni elemento del frontend di project-p5r va ottimizzato per desktop, tablet e mobile (uso ottimale dello spazio), verificato a tre larghezze in ogni lotto"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 0ad57037-18c4-48bd-b9e8-ef8e261a65a1
  modified: 2026-09-12T08:35:50.154Z
---

L'utente (2026-09-12) ha chiesto che «tutti gli elementi di FE devono essere ottimizzati per Desktop, Tablet e Mobile. Ottimizzati significa che devono fare uso ottimale dello spazio disponibile» e che questo sia parte integrante di ogni piano.

**Why:** l'app si usa da tablet e cellulare durante la partita e da desktop per l'editing; layout «che non si rompono» ma con colonne vuote o controlli minuscoli erano già stati contestati («la parte grafica e le funzionalità di FE non sono state minimamente riviste», «e non ottimizzato»).

**How to apply:** per ogni pagina o componente toccato progettare esplicitamente i tre formati (≥1024, 768-1023, <768 px): più colonne e filtri in linea su desktop, due colonne su tablet, colonna piena e fogli dal basso su mobile, bersagli ≥44 px. Verificare a runtime a 1280/768/375 px (`resize_window`) overflow orizzontale, altezze e spazio sprecato, e chiederlo al validatore come criterio bloccante. Vedi [[project-flusso-di-lavoro-p5r]].
