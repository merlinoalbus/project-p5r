# L2, giro 2 — FUN2-9 («Colloca» propone il quartiere del genitore), misura di layout (Test layout multi device, 2026-10-20)

Collaudo BE 3301 / FE 5473 sul commit **f19a117f**, dati base p5s-2026-10-20-0503Z. Ciclo **L2g2-ciclo9-funzionali-layout** del Collaudo:
stato pronto alle 05:21Z, con Central Street (`shibuya-central-street`, genitore Shibuya, 24 pin) tolta dalla sua area; mie misure fino alle
**05:22:38Z**; poi Test funzionali, ultimo, conferma «Colloca». Nessuna scrittura da parte mia: la finestra è stata aperta 6 volte e chiusa
sempre con **Annulla**, e dopo le misure `GET /api/aree/da-collocare` dava ancora Central Street. Grafica predefinita in tutte le misure.

| misura | sezione «Planimetrie da collocare (1)» | «Colloca» | finestra «Colloca Central Street» | quartiere proposto | schermata |
|---|---|---|---|---|---|
| 1280×800 | 1020×142 | 98×44 | 520×376 centrata | **Shibuya** | `FUN2-9-colloca-1280x800.jpg` |
| 1366×657 | 1106×142 | 98×44 | 520×376 (141 dal fondo) | **Shibuya** | — |
| 1280×689 | 1020×142 | 98×44 | 520×376 (157 dal fondo) | **Shibuya** | — |
| 1024×690 | 764×142 | 98×44 | 520×376 (157 dal fondo) | **Shibuya** | — |
| 768×1024 | 726×142 | 98×44 | 520×376 centrata | **Shibuya** | `FUN2-9-colloca-768x1024.jpg` |
| 375×812 | 333×142 | 98×44 | **foglio dal basso 375×375** | **Shibuya** | `FUN2-9-colloca-foglio-375x812.jpg` |
- Campi della finestra: Chiudi 44×44; Quartiere e Area 478×44 (333×44 a 375); Etichetta 478×45; Annulla e Colloca 91×44.
- Nessun bersaglio sotto i 44 px, nessuno scorrimento orizzontale, nessun elemento oltre il bordo, nessun testo a una lettera per riga.
- Il campo «Area» resta «Scegli un'area»: l'area la sceglie chi colloca.
- **Esito FUN2-9 (layout): a posto.** Il quartiere proposto è quello del genitore a tutte le misure. Nel ciclo 6, su 2222d51f, era Yongen-Jaya
  per una planimetria di Kichijoji.
