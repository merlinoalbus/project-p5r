---
name: feedback-intestazione-30
description: "L'intestazione di una pagina occupa al massimo il 30% dell'altezza della schermata del dispositivo, a ogni formato (telefono compreso); oltre è un difetto da correggere, non da «rivedere»"
metadata:
  node_type: memory
  type: feedback
  originSessionId: cffd8da6-5996-4013-b5ec-2c69430948db
  modified: 2026-10-20T12:10:46.618Z
---

Su ogni dispositivo l'intestazione di una pagina occupa al massimo il **30% dell'altezza della schermata**. Esempi: 375×812 → ≤ 243 px; 768×1024 → ≤ 307 px; 1366×657 → ≤ 197 px; 1024×690 → ≤ 207 px.

L'utente, il 2026-10-20, sulla scheda del Palazzo, dove a 375 l'intestazione era alta 526–740 px: «e va ridotto mi sembra ovvio... l'intestazione deve occupare massimo il 30% di una schermata dispositivo».

**Why:** l'app si usa da telefono e tablet durante la partita; una testata che prende più di metà schermo nasconde la cosa che serve. Avevo messo il caso fra le cose «da rivedere» perché il requisito non dava una soglia per il telefono: per l'utente era ovvio che fosse un difetto.

**How to apply:**
- La soglia del 30% vale per ogni pagina e a ogni misura di prova (1366×657, 1280×689, 1024×690, 1920×1080, 768, 375). È un criterio fisso per Test layout.
- Si riduce senza svilire la grafica: le figure restano al 100%, al massimo più piccole o spostate.
- Un'evidente cattiva usabilità a telefono è un difetto anche senza soglia scritta. Vedi [[feedback-tre-formati]], [[feedback-altezze-realistiche]], [[feedback-regole-ovvie-non-si-testano]].
