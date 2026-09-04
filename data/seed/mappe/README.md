# Pacchetti delle mappe esportati dall'editor

Ogni file `<chiave>.json` è un pacchetto (formato di `mappe-editor.json`, versione 1) prodotto da «Esporta questo luogo (ZIP)» nell'editor delle mappe:
contiene una mappa con tutte le sue discendenti e i loro spilli; le immagini sono asset in `public/asset/mappe/` (e `public/asset/spilli/` per le schermate degli spilli, se incluse).
I file vengono caricati all'avvio in ordine di nome, dopo `mappe-editor.json`, con origine «seed» (mai sopra le mappe modificate dall'utente).

Nel repository pubblico possono entrare solo immagini proprie o generate: mai schermate o mappe ufficiali del gioco.
