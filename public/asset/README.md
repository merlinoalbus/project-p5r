# Asset grafici predefiniti

Copiare qui i file generati seguendo `docs/grafica/prompt-immagini.md`, nelle sottocartelle e con i nomi indicati
(`arcani/fool.png`, `arcani/icona/fool.png`, `confidenti/ryuji.png`, `persona/jack-frost.png`, `elementi/fire.png`,
`affinita/wk.png`, `doti/coraggio.png`, `ui/nav-home.png`, `ui/rango-1.png` … `ui/rango-max.png`, `identita/logo-orizzontale.png`,
`sfondi/pattern-nero.webp`, `illustrazioni/vuoto-persona.png`, …).

Non serve registrare nulla: il plugin Vite (`vite/assetPredefiniti.ts`) genera `/asset/manifest.json` leggendo questa
cartella (a ogni richiesta in sviluppo, in build nella cartella di uscita). La chiave di un file è il suo percorso relativo
senza estensione, in slug (minuscolo, senza accenti né apostrofi, spazi → trattini): `persona/Jack Frost.png` e
`persona/jack-frost.png` valgono entrambi `persona/jack-frost`. Estensioni ammesse: webp, png, svg, jpg, jpeg, gif
(a parità di chiave vince webp, poi png, svg, jpg, jpeg, gif). Gli altri file (come questo README) sono ignorati.

Regole d'uso nell'app:
- le immagini caricate dall'utente (Impostazioni / schede) hanno sempre la precedenza sugli asset predefiniti;
- la preferenza "Grafica predefinita" in Impostazioni (attiva di default) può disattivarli sul dispositivo;
- se un asset manca o non si carica, l'app mostra il segnaposto testuale: funziona perfettamente anche a cartella vuota.
