---
name: feedback-altezze-realistiche
description: "le verifiche «pagina in una schermata» vanno fatte ad altezze reali del browser, non a quelle dello schermo"
metadata:
  node_type: memory
  type: feedback
  originSessionId: e607dac6-f330-471d-b336-bd3dc2c5c00f
  modified: 2026-09-29T22:20:57.824Z
---

Quando l'utente chiede che una pagina stia in una schermata (niente barra di pagina, colonne alla stessa altezza), si misura con viewport alte quanto la finestra del browser **meno barre e schede** (~110 px): 1024×690, 1280×689, 1280×720, 1366×657, 1440×789, 1920×969 — oltre a 768 e 375 per la colonna unica.

**Why:** il 2026-09-30 la voce «Palazzo in una schermata» è stata rigettata dal validatore: misurata a 1280×800/1366×768 sembrava a posto, ma sui portatili veri la barra di pagina tornava (l'intestazione occupava il 40-48% dell'altezza utile).

**How to apply:** misurare dal DOM (`main.scrollHeight` vs `clientHeight`) a quelle viewport; se serve cambiare l'aspetto (es. intestazione compatta) portare prima la proposta all'utente. Vedi [[feedback-tre-formati]] e [[feedback-scroll-annidati]].
