# Pannelli che chiedono all'utente di rivedere o approvare dati: inventario e piano (23 ottobre sera)

**Da dove nasce.** Il 23/10 sera l'utente ha scritto: «Da Applicare non è mai stato autorizzato per figurare in home page... così come frasi e condizioni non è stato mai autorizzato che venisse gestito come sezione. Anzi era stato chiesto di gestire e ottimizzare e consolidare i dati corretti».

**Come è stato fatto l'inventario.** Un agente distinto ha lavorato in sola lettura sul codice al commit `b4bcf5fb` e su una copia di p5s del 23/10 alle 19:35Z. Il resoconto completo, con file e righe, è stato consegnato al PM; qui c'è la sintesi.

## Cosa risulta

| # | Pannello | Dove compare | Autorizzato? | Decisioni già prese dall'utente |
|---|---|---|---|---|
| 1 | **Da applicare** | Home, Partita › Oggi, Progressi | Solo il principio di D6: le Doti si propongono con «Applica», mai in automatico. La presenza in Home e in Oggi non è autorizzata. Gli yen proposti (D8) non sono mai stati confermati e contrastano con la scelta del 30/09 «Sempre a mano, con promemoria». | 0; 5 proposte aperte, tutte Aojiru |
| 2–3 | Gesti della partita, identità della proposta (identificativi tecnici) | Impostazioni, Guida, dentro 1 | No | nessuna (stanno nel browser) |
| 4 | Collegamenti degli effetti da rivedere | Guida giorno per giorno | No | 5 conferme del 22/10 (non si sa chi le abbia fatte); 15 candidati Aojiru aperti |
| 5 | Consumazioni Aojiru da confermare | Offerta, visore, spunta | Gli acquisti sì; le riconciliazioni e le ricevute no | 0 |
| 6 | **Frasi e condizioni** | Prima voce dell'indice della Guida | No: era chiesto un elenco da rivedere prima della migrazione, non una sezione | 0 |
| 7 | Riconciliazione iniziale del catalogo | Catalogo | No | 0 (sola lettura) |
| 8 | Abbinamenti da approvare | Catalogo, Impostazioni, Palazzo | Non chiaro: con l'utente si è sempre usato «elenco in chat, poi migrazione» | 0; 87 proposte ancora da approvare |
| 9 | Scambi con le fonti (raccordo) | Catalogo | No | 0 (sola lettura) |
| 10–11 | **Confronto e decisione di Tanaka** (consenso) | Catalogo | No; la regola dell'utente è «vince il dato di Royal, sempre», da non mettere in scelta | 0 |
| 12 | Ripristina il costo del regalo | Scheda del Confidente | Non chiesto, ma è il modello «modifica + Ripristina» approvato per la nota di Tanaka | 0 |
| 13 | Editor delle disponibilità del Confidente | Scheda del Confidente | L'editor sì; «Applica la proposta completa» non è chiaro | — |

Fuori perimetro, con decisioni dell'utente del 20/10: proposte d'infiltrazione e finestre da verificare dei Palazzi (R3-37b, R4-14b).

## Il piano: consolidare i dati e togliere i pannelli non autorizzati
È inserito in `stato.json` → `pianoAtomico`, con le voci `BON-01…BON-12`:
- **BON-01:** «Da applicare» resta solo in Partita › Progressi, come elenco D6 leggibile (R10-10/4). Esce da Home (R10-24/6) e da Oggi.
- **BON-02:** si tolgono le viste con identificativi tecnici (pannelli 2 e 3). Il recupero di un'operazione interrotta diventa un messaggio semplice.
- **BON-03:** si toglie il pannello 4. Gli effetti dell'Aojiru si consolidano con una migrazione, dalla rotazione settimanale documentata (ricerca del 23/10). Le 5 conferme del 22/10 restano.
- **BON-04:** il registro delle consumazioni dell'Aojiru resta, senza riconciliazioni né ricevute visibili.
- **BON-05:** si toglie «Frasi e condizioni». I 147 gruppi si consolidano con migrazioni, con la condizione corretta secondo Royal. La frase superata resta come nota storica.
- **BON-06:** si tolgono i pannelli 7 e 9. I registri delle bonifiche restano nel DB come storia, senza essere mostrati.
- **BON-07:** si toglie il pannello 8. Le 87 proposte si consolidano: le 22 «certe» con una migrazione, le altre dopo la ricerca sulle fonti. I 3 doppioni del catalogo si fondono con una migrazione. Restano all'utente, in chat, solo i casi che le fonti non risolvono.
- **BON-08:** Tanaka si porta ai dati Royal con una migrazione diretta (piano 10+8: 10 offerte aggiornate, 8 nuove, 10 nascoste e archiviate nel Cestino). Si toglie il pannello di consenso. Import ed export restano coerenti. Sui dati reali gli acquisti da Tanaka sono 0, quindi la spesa non cambia.
- **BON-09:** il «Ripristina» del costo del regalo resta, come «modifica + Ripristina».
- **BON-10:** l'editor delle disponibilità resta; «Applica la proposta completa» si toglie se i dati vengono consolidati.
- **BON-11:** la regola diventa permanente: niente nuovi pannelli di revisione senza il sì dell'utente.
- **BON-12:** gli yen (D8) restano in sospeso, perché serve una decisione dell'utente (vedi sotto).

## Decisioni dell'utente (23/10 sera)
- **Piano BON-01…11:** approvato («Sì, procedi»).
- **Yen:** «A mano con promemoria», come la scelta del 30/09. Le proposte di yen con «Applica» si tolgono (BON-12).
