# L3 — riverifica UX di UX3-12 e UX3-13 su 2df44d30 (Test UX, 2026-10-20, fino alle 15:14Z)

Collaudo FE 5473 / BE 3301, linea `newreview-l3` = 2df44d30. Ho lavorato **in sola lettura**: l'unica azione è stato un tocco su un'area,
che cambia solo la pagina aperta. L'unica scrittura è la cache `immagine_miniatura` (`?l=`).

Misure: 375×812, 768×1024, 1024×690, 1280×689, 1366×657, 1920×1080. Le misure le ho prese in un iframe della stessa origine; le schermate
e il tocco a misura emulata.

## UX3-12 — etichetta breve dal tipo della data: **verificato**
Chip delle date nell'intestazione, testo visibile:

| Misura | Maruki | Shido | Kamoshida |
|---|---|---|---|
| 375, 768 | **«Si apre»** (65 px; prima «Si»), «3 febbraio» | «24 novembre», «Furto», «18 dicembre» | date invariate |
| da 1024 in su | «Si apre» (69–70 px) | «Furto consigliato» (125–127 px) | date invariate |

- «Furto» è l'etichetta breve del tipo e, con l'icona, si capisce.
- Le intestazioni sono invariate: 198–216 px sotto i 1024, 106 da 1024 in su.
- Schermata: `01-ux3-12-maruki-si-apre-375x812.jpg`.

## UX3-13 — aree toccate nella colonna delle aree, da 1280 in su: **verificato**
Le prove sono su Kamoshida «4. Vecchio Castello» (tocca 4 aree) e su Shido «1. Passaggio Centrale / Sala d'Ingresso».

- **Si capisce subito quali aree tocca l'infiltrazione?** Sì.
  - In cima alla colonna delle aree c'è la legenda «Aree toccate da «4. Vecchio Castello» · 4, evidenziate.», con un quadratino uguale al
    segno delle aree.
  - Le aree toccate hanno il bordo rosso tenue (primary al 60%) e lo sfondo leggermente più chiaro.
  - L'area aperta nel visore ha il bordo rosso pieno e lo sfondo rosso, quindi le due cose non si confondono.
  - In ogni area la riga dell'infiltrazione aperta è in rosso (`02-ux3-13-kamoshida-legenda-1280x689.jpg`).
- **Si trova bene quanto prima?** Meglio.
  - La legenda dà il numero («· 4») e il nome dell'infiltrazione.
  - Prima la striscia era tagliata e mostrava a metà un'area sola. Ora le aree si leggono intere nella colonna, che scorre in verticale
    come prima.
  - A 1280×689 si vedono le prime 2–3 aree; le altre si raggiungono scorrendo la colonna, e la legenda dice quante sono.
- **Toccare un'area funziona come prima?** Sì. Il tocco su «3. Vecchio castello 1P» apre
  `/area/vecchio-castello-1p?infiltrazione=kamoshida-01-cancello-del-castello-ingresso`: l'area va nel visore, l'infiltrazione resta
  «4. Vecchio Castello» e la legenda non cambia.
- **Da 1280 in su** (1280, 1366, 1920): legenda presente, striscia assente, nessuno scorrimento orizzontale della pagina.
- **Sotto i 1280 non è cambiato niente.**
  - A 1024×690 le aree toccate restano schede accanto al selettore dell'infiltrazione («2. Cancello del castello», «3. Vecchio ca…»). La
    fila parte dalla prima scheda, non già scorsa, e non c'è la legenda (`03-…`).
  - A 768 e 375 la fila «Aree toccate» va a capo, con i chip interi.
