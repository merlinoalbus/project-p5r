# Catalogo dei riferimenti (solo link)

`immagini.json` elenca **soltanto URL** alle immagini ufficiali di Persona 5 Royal (© ATLUS/SEGA) ospitate dal
Megami Tensei Wiki (https://megamitensei.fandom.com). Nessun file protetto è incluso nel repository o nelle immagini
Docker: l'utente, dalle Impostazioni dell'app, può scaricare queste immagini nella **propria istanza** (`DATA_DIR/immagini/`)
per uso personale.

Struttura:

```json
{
  "versione": 1,
  "voci": [
    { "ambito": "arcana", "chiave": "Fool", "url": "https://static.wikia.nocookie.net/…", "fonte": "https://megamitensei.fandom.com/wiki/…", "nota": "facoltativa" }
  ]
}
```

- `ambito`: `arcana` (chiave = chiave canonica dell'arcano, es. `Fool`), `confidente` (chiave del seed, es. `ryuji`), `persona` (nome esatto della Persona, es. `Jack Frost`).
- Le voci con URL incerto portano una `nota`; una voce mancante significa "nessun riferimento trovato" (l'app usa l'asset predefinito o il segnaposto).
- Contenuto attuale: 23 Arcani, 23 Confidenti (icone stile carta), 231 Persona (`mancanti.persona` elenca chi non ha riferimento). Censimento e voci incerte in `docs/riferimenti/catalogo-immagini-wiki.md`.
- Il file viene letto una volta all'avvio del backend (`RIFERIMENTI_DIR`, default `data/riferimenti`); nell'immagine Docker sta in `/app/data/riferimenti`.
