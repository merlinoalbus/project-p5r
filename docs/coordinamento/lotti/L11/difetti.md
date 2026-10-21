# L11 — riscontri operativi ancora aperti

## UI-ASSET-01 — vecchio chunk durante il cambio di rilascio

Il21ottobre2026 alle19:40Z, durante il passaggio al frontend814b17d8,
Galaxy ha osservato un errore di importazione del vecchio chunk della Guida
navigando da una pagina già aperta. Il reload ha caricato il frontend nuovo;
nessun altro errore/warning osservato successivamente nelle pagine visitate.

È un riscontro reale di continuità durante il rilascio, non una prova della
causa o dell’introduzione in I71. Studiare gestione degli asset e recupero
dell’errore prima della bonifica, preservando le modifiche non salvate. Nessun
test, aggiornamento automatico forzato o soluzione arbitraria già applicato.
