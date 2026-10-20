---
name: project-pacchetto-obsoleto
description: "Il «pacchetto di gioco» è un concetto superato: la fonte unica dei dati è il DB che stiamo sistemando (p5s); le correzioni ai dati si fanno direttamente nel DB con le migrazioni, mai con regole «al caricamento del pacchetto»"
metadata:
  node_type: memory
  type: project
  originSessionId: cffd8da6-5996-4013-b5ec-2c69430948db
  modified: 2026-10-20T19:05:29.420Z
---

L'utente, il 2026-10-20 sera: «non esiste più il pacchetto di gioco... esiste solo il db quindi cancella dove devi cancellare direttamente» e «abbiamo il DB con i dati che stiamo sistemando... fine il concetto di pacchetto di gioco è obsoleto».

Precisazione dell'utente: «il pacchetto di gioco dovrebbe essere stato inglobato nel db e poi il db dovrebbe essersi esteso andando a sostituire aggiornare il resto». Il contenuto del pacchetto è già dentro il DB; da lì il DB è cresciuto e ha sostituito o aggiornato tutto il resto. Non esiste una seconda fonte da cui ricaricare.

**Why:** i dati veri sono quelli del DB, curati a mano dall'utente su p5s e corretti dalle migrazioni. Il pacchetto (`pacchetto/gioco.db`, importazione ed esportazione dalle Impostazioni) apparteneva al modello vecchio.

**How to apply:**
- Una correzione ai dati si fa con una migrazione che scrive direttamente nel DB. Niente regole che girano «all'avvio o al caricamento del pacchetto» per ripulire i dati.
- Non si progettano funzioni nuove sul pacchetto. In L11 la voce «rigenerazione di `pacchetto/gioco.db`» non si fa così: si decide con l'utente se togliere il pacchetto dall'app e dalla documentazione (CLAUDE.md lo descrive ancora).
- **Precisazione successiva dell'utente, 2026-10-20**: «Importa» non si toglie; deve sostituire il file DB con un backup locale. Il DB resta la fonte unica. Allineare interfaccia e documentazione al ripristino da backup, senza eseguire ripristini sui dati dell'utente durante lo sviluppo.
- Vedi [[project-dati-attuali-produzione]].
