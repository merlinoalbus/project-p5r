---
name: project-gerarchia-mondo
description: "gerarchia del mondo voluta dall'utente (2026-10-19) — Città → Quartiere → Area → Planimetrie → Luoghi; nei Palazzi le aree della guida sono «Infiltrazioni»"
metadata:
  node_type: memory
  type: project
  originSessionId: e607dac6-f330-471d-b336-bd3dc2c5c00f
  modified: 2026-10-19T21:36:15.260Z
---

Gerarchia del mondo dichiarata dall'utente il 2026-10-19: **Città (Tokyo) → Quartiere → Area → Planimetrie → Luoghi**, dove l'Area è la zona (Central Street, Sottopasso, Vicoli), le Planimetrie sono le immagini/versioni dell'area, i Luoghi sono le attività dentro una planimetria (Untouchable, Diner: oggi tabella `luogo` + pin). Nei Palazzi (stesso giorno): **Città → Palazzo → Area → Planimetria**, con le **Infiltrazioni** (oggi `dungeon_area`, le voci della guida) che si associano alle Aree toccate durante quell'infiltrazione — molti a molti, trasversali; le Aree del Palazzo corrispondono oggi alle «stanze» (gruppi di versioni in `mappa_presentazione`). Memento (stesso giorno): **Città → Memento → Dedalo → Area → Planimetrie random** (nessuna planimetria: si generano a caso), quindi niente pin; gli elementi (Persona/Ombre, Richieste, timbri) stanno nell'area del dedalo — oggi già così (dungeon `mementos`, 9 dedali, `area_dedalo`), ristrutturato di recente: stato del dedalo derivato dalle aree, Persona catturabili lette dal compendio con il tocco collegato al compendio. **I Memento sono il modello di riferimento** da non toccare: Palazzi, Iweleth e Battaglia si allineano a loro. Stati (precisazione dell'utente, stesso giorno): gli elementi impattati da un'infiltrazione possono riattivarsi in quella successiva — **Oggetti e Nemici si rigenerano** (casualmente; i nemici anche spostandosi fra aree), quindi hanno uno stato per infiltrazione; gli elementi permanenti (forzieri, porte, scorciatoie, Safe Room, meccanismi, tesoro, boss) hanno uno stato unico. Regola collegata: l'immagine caricata da «Mappa» è l'immagine di quell'area/planimetria e si vede uguale ovunque.

**Why:** l'AS-IS ha mostrato che «luogo», «area» e «planimetria» hanno più significati (mappe tipo `luogo` = planimetrie, tipo `area` = planimetrie dei Palazzi, tabella `luogo` = esercizi) e generano viste e processi doppi.

**How to apply:** ogni piano, testo o struttura nuova usa questi nomi; è la base del piano di razionalizzazione in preparazione (documento https://claude.ai/artifact/3jwzuzsqKQq8vqu1PimcLS). Vedi [[feedback-tre-formati]].
