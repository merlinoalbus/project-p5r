# Ciclo 2 di L3 — caso L3-L10 «Da collocare» con le planimetrie dei Palazzi (preparato, da aprire su richiesta di Test layout)

Istanza 3301/5473 su `newreview-l3` = 48d7a958, dati identici alla base `L3-base-p5s-20261020-0948Z`. Procedura: `collaudo/PROCEDURA-DATI.md`.

## Perché serve una preparazione
Sui dati reali `GET /api/aree/da-collocare` è vuoto: dopo le migrazioni 109 e 110 nessuna planimetria è senza Area. Per i Palazzi «Da collocare» elenca le mappe figlie di `dungeon-<k>` senza `area_chiave`, Memento esclusi (`areeService.ts`, `mappeDaCollocare`). Un gesto dell'utente non le crea: `POST /api/mappe` e `PUT genitore` verso un Palazzo rispondono `409 usa-aggiungi-area` (AP3-3, verde nel ciclo 1). Secondo il codice, ci arrivano solo due casi: una mappa **importata da un pacchetto di prima** o una mappa **tolta da un'Area**.

## Passi, quando Test layout chiede
1. `foto data foto/L3-ciclo2-da-collocare`, con il BE acceso, e confronto con la base.
2. Preparazione dello stato, per la strada (a) del pacchetto:
   - `POST /api/mappe/importa` con `{ pacchetto: { versione: 1, mappe: [{ chiave: "prova-collaudo-da-collocare", nome: "Planimetria di prova da collocare", tipo: "luogo", genitore: "dungeon-madarame", spilli: [] }] } }`;
   - poi `GET /api/aree/da-collocare`: la riga attesa ha `genitoreNome` «Palazzo di Madarame».
   - Se la mappa non compare, perché l'importazione la mette in un'Area o la rifiuta, si passa alla strada (b) e lo si scrive negli esiti.
3. Strada (b), a BE fermo, come nel ciclo 9 di L2 (`lotti/L2/esiti-giro2/collaudo/stato-ciclo9.cjs`):
   - si toglie dalla sua Area una versione **non predefinita** di un'Area di Madarame (`area_chiave`, `versione_ordine` e `versione_etichetta` a NULL), con lo stesso schema del test FUN2-9 di BE;
   - si riavvia il BE e si controlla `GET /api/aree/da-collocare`.
4. Si dice a Test layout «stato pronto, potete misurare»; Test layout misura «La città» → «Planimetrie da collocare (N)» alle sue misure. «Colloca» si prova solo se la chiede.
5. A fine prove:
   - impronta e differenze riga per riga contro la foto, salvate in `ciclo2-differenze.txt`;
   - copia di `BE.log`, `stop-be.sh`, `ripristina`, `start-be.sh`;
   - impronta contro la foto e contro la base: `IDENTICHE` attese;
   - si annota in `cicli-dati.md` e si avvisa Test layout.

Nessuna scrittura su p5s né sulla produzione.
