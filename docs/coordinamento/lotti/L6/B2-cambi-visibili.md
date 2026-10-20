# L6 · B2 (migrazione 118) — cambi visibili sulle partite (R6-21)

Implementazione FE (che fa L6 intero), 2026-10-20. Misura: due BE sulla stessa base, il codice di B0 sulla copia dei dati di prima della 118
(istanza temporanea) e il BE di sviluppo dopo la 118, confrontati su tutte le pagine dei quartieri, i negozi e i Confidenti.

## Impronta del lavoro da preservare
`impronta.cjs` (diario 04-01..06-01, spunte, Kamoshida, Madarame): **identica** prima e dopo (sha256 `57d6bf2649db13bc855c…` su entrambe;
diario 254 voci, 338 spunte, Kamoshida 169 voci / 373 pin, Madarame 225 voci / 261 pin). Pin dei Palazzi e loro condizioni invariati.

## Registro della migrazione (log del BE, `[migration118]`)
23 quartieri con condizione, 19 luoghi con condizione nuova (G-029/G-031, Asakusa per decisione dell'utente), 7 luoghi riscritti (via la
data: Odaiba → Ann 10; gli altri 6 → invito), 6 inviti (`confidente_invito`), 23 requisiti (11 Richieste per chiave, 10 persona-abilita per
id, Tae 04-15 → 04-18, Ohya 06-18 → 07-05), 11 articoli della Clinica 04-15 → 04-16, 10 finestre dei Palazzi nelle colonne (Madarame
lettera entro 06-02). Ogni riga con prima e dopo nel log.

## Partita 1 (06-01)
- Quartiere **Odaiba**: aperto → chiuso. Prima era aperto solo per la via `data{06-01}` (in `sblocco-quartieri` e nel Seaside Park), cioè il
  giorno della partita. Quella data è la **messa in vendita del libro** «Luoghi della movida», non uno sblocco (Analisi dati §4, G-017);
  per **decisione dell'utente** (modifiche §4.1, `L5/dati.md` §10.3) il Seaside Park si apre col libro letto **oppure** con Ann al rango 10, e
  il quartiere con il suo ritrovo. In p1 il libro non è letto e Ann è al rango 5: Manca «Libro letto: Luoghi della movida oppure Rango
  Confidente Ann 10». Correzione elencata nel §5 di modifiche.md.
- Luoghi che si chiudono (condizione nuova con fonte): bagno pubblico e gabbie di battuta (libro «Esplorando Yon-cha 4»), venditore di patate
  dolci (dal 9/10), Jazz Jin (Akechi 4), Mantra Ganda (Gemelle 3), Mercante Sakai (16 finestre), Chiesa di Kanda (dal 28/6), Libreria Nagiuri
  (Hifumi 4 o libro), Museo di Ueno (Yusuke 3), Odaiba Seaside Park, Dome Town (dal 9/6), Asakusa hangout (Ann 7).
- Negozi: venditore di patate dolci, Mantra Ganda, Mercante Sakai, Libreria Nagiuri → bloccati (sede chiusa).
- Semafori dei Confidenti: invariati.

## Partita 2 (04-29)
- Quartieri: nessun cambio.
- Luoghi che si chiudono: gli stessi della p1 (tranne Odaiba, già chiuso) più Protein Lovers (Ryuji 5 o Ann 8), infermeria (dal 13/5),
  Inokashira hangout (Ann 3), monjayaki di Tsukishima (Ryuji 7).
- Negozi: gli stessi 4.
- Semafori dei Confidenti: invariati.

## Non fatto in M6 (scelta motivata)
- Pin d'ingresso con la finestra copiata → `arco`: **non applicato**. `arco` non ha una fine, la finestra sì: il pin resterebbe visibile dopo la
  scadenza (esito non uguale). Sui dati di riferimento non c'è comunque nessuna copia seed (l'unico pin d'ingresso con finestra è dell'utente,
  intatto).
