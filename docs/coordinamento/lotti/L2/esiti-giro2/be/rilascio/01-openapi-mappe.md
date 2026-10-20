# 01 — server/openapi/descrizioni/mappe.ts (FUN2-8)

## Modifica 1 di 1 — `PUT /api/mappe/:chiave`: descrizione ed errore 409 `usa-aggiungi-area`

TESTO VECCHIO
~~~~
    descrizione: 'Il genitore non può essere la mappa stessa né una sua discendente. Spostandola, le infiltrazioni sue e delle discendenti devono restare del Palazzo di arrivo. Salvare con il nome segna il nome come rivisto; se la mappa dava il titolo alla sua area, quel titolo si fissa prima del cambio. Riga, legame con l\'entità e percorsi si scrivono in una transazione e la mappa diventa dell\'utente.',
    risposta: 'La mappa aggiornata: `MappaDto`',
    errori: [[404, 'mappa-non-trovata'], [400, 'genitore-non-valido'], [400, 'mappa-fuori-palazzo'], [400, 'area-inesistente'], [400, 'area-di-altro-palazzo']],
~~~~

TESTO NUOVO
~~~~
    descrizione: 'Il genitore non può essere la mappa stessa né una sua discendente. Una mappa senza Area di tipo `luogo` o `area` non entra nel mondo (spostata sotto Tokyo o un quartiere, o resa `luogo`/`area` lì): 409 `usa-aggiungi-area`, come la creazione (FUN2-8, R2-27); le generiche del mondo, i Palazzi e i Memento non cambiano. Spostandola, le infiltrazioni sue e delle discendenti devono restare del Palazzo di arrivo. Salvare con il nome segna il nome come rivisto; se la mappa dava il titolo alla sua area, quel titolo si fissa prima del cambio. Riga, legame con l\'entità e percorsi si scrivono in una transazione e la mappa diventa dell\'utente.',
    risposta: 'La mappa aggiornata: `MappaDto`',
    errori: [[404, 'mappa-non-trovata'], [400, 'genitore-non-valido'], [409, 'usa-aggiungi-area'], [400, 'mappa-fuori-palazzo'], [400, 'area-inesistente'], [400, 'area-di-altro-palazzo']],
~~~~
