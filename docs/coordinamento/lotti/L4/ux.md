# L4 «Avanzamento unico» — Test user experience

Sessione «Test user experience». Stato: **preparazione** (2026-10-20). Fonti: requisiti.md (R4-34…R4-37), modifiche.md §4 e §6.4;
«prima» di Analisi app in `schermate-prima/` (`01-palazzo-madarame-infiltrazione-2`, `02-pin-piu-voci-entrata-museo`, `03-pin-777-giardino`,
`04-palazzo-kamoshida`, `05-completamento`, `06-citta-palazzi`). Ogni segnatura si prova **solo su una partita di prova** in locale, poi eliminata;
la partita reale e la produzione solo in lettura.

## Percorsi da provare (tablet 768 in infiltrazione, telefono 375, desktop 1280; 1366×657 e 1280×689)
| # | Percorso (chi gioca) | Criterio | Cosa misuro | «Prima» |
|---|---|---|---|---|
| V1 | **Segnare dal pin** un forziere (permanente) e un oggetto che si ripropone, a Madarame, 2ª infiltrazione | R4-35 | un tocco per segnare e uno per riaprire; lo stato si vede subito su pin, voce, «Da raccogliere» e anello; «Riapre anche: …» chiaro | `02-pin-piu-voci-entrata-museo`, `03-pin-777-giardino` |
| V2 | **Segnare dalla voce** della guida le stesse cose | R4-35, §4.1 | un tocco; il pin cambia insieme; nessuna doppia conferma | `01-palazzo-madarame-infiltrazione-2` |
| V3 | **Leggere il carattere** della voce e del pin: «Permanente», «Si ripropone · in quest'infiltrazione», «Racconto/Letto», «Esaurito» | R4-34 | a colpo d'occhio, senza aprire nulla: chip e icone distinguibili anche a 375; «Esaurito» diverso da «ottenuto»; «Stato nella 2ª infiltrazione» sul pin rigenerabile | stato solo nel testo « · esaurito» (GuidaDellArea 267) |
| V4 | **Pin di più voci**: una riga per voce con carattere, infiltrazione e stato | R4-34, §4.2 | si capisce quale voce si segna; bersagli ≥44 px; popup leggibile a 375 senza scorrimento orizzontale | `02-pin-piu-voci-entrata-museo` |
| V5 | **«Da verificare»**: chip ambra su voce e pin → finestra con «Segna la voce» / «Togli il fatto al pin» | R4-14b, §4.1, §6.4 | spiegazione senza gergo; i due gesti fanno ciò che dicono; sezione «Da verificare (N)» nella scheda | — (nuovo) |
| V6 | **Intestazione del Palazzo**: anello e percentuale, «Tesoro ✓/✗ · Boss ✓/✗», «N da verificare» | §4.3 | numeri coerenti con quello che si è segnato; nessun aumento d'altezza dell'intestazione rispetto a L1/L3 (222 a 1024×690, 170 a 1280×689) | `05-completamento`, `04-palazzo-kamoshida` |
| V7 | **Finestra delle fusioni** (approvazione) | R4-36 | per ogni gruppo le copie affiancate con infiltrazione, testo, pin e stato; leggibile a 768 e 375 (affiancate o impilate con chiarezza) | — (nuovo) |
| V8 | **«Schede da sistemare»**: «Crea la voce» / «Collega a una voce» | §4.3 | gesti chiari, nessuna eliminazione senza cestino | — |
| V9 | **La città / Palazzi**: Palazzo completato sulla metro e nell'elenco | §4.4 | la presenza del Palazzo completato non cambia aspetto in modo inatteso | `06-citta-palazzi` |
| V10 | **Testi** | §4.5, L0 | «Permanente», «Si ripropone», «Racconto», «Letto», «Esaurito», «Anche nella Nª infiltrazione»…; ordinali corretti; «Semi della Bramosia» a Kamoshida (G-005) | — |
| V11 | **Una schermata** a 1366×657 e 1280×689 con i chip nuovi | R4-37 | visore visibile, nessuna barra di pagina nuova | — |

## Esiti
(pezzo per pezzo, appena FE segnala una parte pronta)
