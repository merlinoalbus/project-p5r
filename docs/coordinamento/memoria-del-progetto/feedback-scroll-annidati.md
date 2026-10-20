---
name: feedback-scroll-annidati
description: "Barre di scorrimento dentro altre barre — l'area che scorre deve essere evidente e non deve mai trascinare lo scorrimento del contenitore"
metadata:
  node_type: memory
  type: feedback
  originSessionId: e607dac6-f330-471d-b336-bd3dc2c5c00f
  modified: 2026-09-29T10:14:02.051Z
---

L'utente (2026-09-29): quando c'è una barra di scorrimento dentro un'altra, l'area su cui agisce deve essere ben riconoscibile, e bisogna evitare che più barre scorrano insieme (lo scroll interno arrivato in fondo non deve far partire quello della pagina o del pannello esterno).

**Why:** l'app si usa da tablet e cellulare durante la partita: con il dito non si capisce quale riquadro si sta scorrendo e lo scroll concatenato fa perdere il punto.

**How to apply:** ogni contenitore scorrevole annidato ha un confine visibile (bordo/sfondo/ombra di bordo che segnala il contenuto nascosto) e `overscroll-behavior: contain`; se possibile si evita del tutto l'annidamento. Verificarlo a 1280/768/375 come da [[feedback-tre-formati]].
