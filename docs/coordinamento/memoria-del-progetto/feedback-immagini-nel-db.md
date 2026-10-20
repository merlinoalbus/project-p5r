---
name: feedback-immagini-nel-db
description: "Tutte le immagini di gioco vivono dentro gioco.db (BLOB); fuori solo compendio e ui. Un solo file gioco.db: iniziale in git, completo fuori da git, caricamento sempre dall'app. Mai attribuire all'utente decisioni non sue."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 0ad57037-18c4-48bd-b9e8-ef8e261a65a1
  modified: 2026-09-12T15:18:55.731Z
---

In project-p5r ogni immagine che non è del compendio (persona, arcani, skill) né dell'interfaccia (`ui/`)
sta DENTRO il database di gioco (`immagine.contenuto`, migrazione 079): mappe, spilli, Confidenti,
personaggi, sfondi, identità, illustrazioni e ogni file caricato.

Il pacchetto di gioco è UN SOLO file `gioco.db` in due stati: `pacchetto/gioco.db` iniziale (in git,
senza il contenuto delle immagini, copiato al primo avvio per aprire l'interfaccia) e
`pacchetto/completo/gioco.db` (326 MB con le immagini, fuori da git, ignorato ed evidenziato in
`pacchetto/README.md`). **Il caricamento iniziale completo avviene sempre con l'importazione dall'app**
(Impostazioni → Pacchetto di gioco), che sostituisce il file sul volume. Niente LFS per ora (2026-09-12).

**Why:** il 2026-09-12 avevo scritto nel piano, sotto «decisioni dell'utente», che gli asset di gioco
restavano png fuori dal DB: l'utente non l'aveva mai chiesto e me l'ha contestato duramente («come lo
giustifichi?»). La sua regola: «tutto il resto va dentro il DB».

**How to apply:** non attribuire mai all'utente una decisione che non ha preso; se una scelta è mia, dirlo e
motivarla prima di costruirci sopra. Quando si tocca il pacchetto o le immagini, il contenitore è
`gioco.db`, non uno ZIP né una cartella; non inventare un secondo formato di pacchetto. Vedi
[[project-flusso-di-lavoro-p5r]].
