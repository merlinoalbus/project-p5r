---
name: reference-browser-pane-p5r
description: Limiti del Browser pane nelle verifiche di project-p5r — finestra nascosta = click e screenshot non arrivano; come verificare comunque
metadata: 
  node_type: memory
  type: reference
  originSessionId: 63bec0e8-695c-4df0-bfcd-ebd80ca4af36
  modified: 2026-09-30T17:46:18.698Z
---

Nelle verifiche runtime dell'app (FE http://localhost:5273) il Browser pane spesso gira con la finestra di Claude nascosta: `computer left_click` (anche con coordinate corrette e `elementFromPoint` che conferma il bersaglio) non genera alcun evento nella pagina e `screenshot` va in timeout dopo 5 s. `form_input` su una casella di spunta cambia il DOM ma non lo stato React.

**How to apply:** verificare con `read_page`/`find`/`javascript_tool` (lettura del DOM, `getBoundingClientRect` per i 44 px, `read_network_requests` per le chiamate API) e, quando i click del mouse non arrivano, scatenare l'azione con `elemento.click()` da JavaScript (React la gestisce come un click reale; per gli input testuali usare il setter nativo di `value` + evento `input`). Pulire sempre i dati di prova creati sul DB dell'utente (DELETE via API). Vedi [[project-flusso-di-lavoro-p5r]].

Con `resize_window` a una misura più grande del pane (vista «scaled down to fit», es. 1024×690 in un pane da 800) né i click per `ref` né `hover` arrivano alla pagina (`:hover` resta falso); a misura reale (preset `desktop`) i click per `ref` arrivano. Quindi: gesti veri a misura reale (fare prima uno `screenshot`, poi `find` + click per `ref`), misure sotto emulazione; il `:hover` non è verificabile dal vivo — controllare le regole nel CSS servito (`document.styleSheets`) e `matchMedia('(hover: hover) and (pointer: fine)')`. Il menu laterale esiste solo da 1024 px: se il pane è più stretto non c'è a misura reale (2026-09-30).

Con il pane nascosto (`document.visibilityState === 'hidden'`) le animazioni CSS restano ferme al tempo 0: la `.modal-content` rimane a `scale(0.95)` (animazione `scale-in`) e `getBoundingClientRect` dà 41,8 px per bersagli da 44 (2026-09-30, rilievo del validatore). Prima di misurare altezze o larghezze: `document.getAnimations().forEach(a => a.finish())`, poi misurare (e controllare `transform: none`). Gli screenshot invece arrivano.

Anche con `document.visibilityState === 'visible'`, se il pane è nascosto (`tabs_context`: «The Browser pane is currently hidden») il disegno è fermo: `requestAnimationFrame` non parte e i `ResizeObserver` non scattano. Il visore delle mappe non misura la tela e resta a zoom 1 con una traslazione «a tela 0×0» (2026-10-15, falsata una misura anche sull'istanza reale). Prima di misurare: uno `screenshot` (forza un fotogramma), poi la lettura; controllare con `await new Promise(r => requestAnimationFrame(r))` entro un timeout.
