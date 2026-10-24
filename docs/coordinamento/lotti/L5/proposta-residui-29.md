# L5 — proposta per i 29 residui (23 ottobre sera)

**Decisione dell'utente (23 ottobre sera).**
- **Certezza alta, approvate tutte:**
  - distributori di Akihabara, di Shinjuku e di Kichijoji;
  - i nove servizi del Covo;
  - Jose del Covo che passa a «dialogo»;
  - le sedi di Tanaka, di Home Shopping e di Jose;
  - il pin 349.
- **Pin dell'utente, approvati tutti e tre:** 339 → `distributore-shujin-cancello-1`; 1584 → `distributore-yongen-bagno` e luogo del bagno pubblico; 1641 → `sakura-residence`.
- **Pin 1769:** passa al listino Nastea (`distributore-yongen-tabaccaio`); il 1768 resta Joylent.
- **Pin 1753 (Ann al 2° piano della Shujin):** va nel Cestino, ripristinabile.
- **Restano senza cambi, come proposto:** il pin 2022 e il pin 1767.

Istruttoria in sola lettura: fonti di Persona 5 Royal sul web e dati letti da una copia di p5s del 23/10 alle 19:35Z, portata allo schema 140. Nessuna migrazione scritta, nessun dato toccato. Il PM aveva indicato 32 voci; in `pianoAtomico` sono **29**: 9 distributori (DISTR), 9 servizi del Covo (COVO), 1 Jose-386, 3 sedi (SEDE), 3 funzioni di pin (FUNZIONE-PIN), 2 pin Confidente (CONFIDENTE-PIN), 2 listini di pin (LISTINO-PIN).

Dove la guida e le altre fonti divergono, vale Royal. Le fonti sono: guida AGS (allgamestaff.it), wiki Fandom, GameFAQs (guida Royal settimana per settimana), Samurai Gamers, RPG Site, Prima Games.

## 0. Come si leggono le prove
- **Certezza alta:** due o più fonti indipendenti concordano.
- **Certezza media:** una fonte, oppure una deduzione per esclusione su dati già nell'app.
- **Posizioni delle macchine:** le fonti le descrivono con punti di riferimento («di fronte al Maid Café»), non con le coordinate dei pin dell'app. Nessuna macchina viene quindi abbinata a un pin solo per posizione o per ordine. Dove l'abbinamento si fa, la prova è per esclusione, e si dice.

## 1. Distributori (DISTR-272, 273, 274, 275, 339, 359, 1564, 1565, 1566)

**Fatto provato (alta).** I distributori sono 30 in tutto in Royal (27 in P5 più 3 a Kichijoji): Yongen 2, Aoyama 7, Shibuya 7, Shinjuku 3, Akihabara 8, Kichijoji 3. Gli assortimenti sono pochi e si ripetono, quindi **una macchina non si riconosce dal suo assortimento**. Per questo l'app ha «listini condivisi».

| Zona | Macchine | Assortimenti | Fonte |
|---|---|---|---|
| Akihabara | 8 (4 davanti al Maid Café, 2 vicino e davanti al negozio otaku, 2 davanti al retrogame) | 6: AGS n. 1…6; il n. 1 compare su tre macchine | GameFAQs P5, Samurai Gamers, Fandom |
| Cancello Shujin | 2, a est del cancello | Sinistra: Joylent, Mad Bull, Muscle Tea, Udagawa Water. Destra: Second Maid, Manta, Earl Green | GameFAQs, Samurai Gamers |
| Kichijoji (solo Royal) | 3 nella zona dello shopping | 2× Second Maid, 1× Dr. Salt NEO, Arginade, Acqua della rinascita | Samurai Gamers, Fandom |
| Shinjuku, luci rosse | 3 | 1× Second Maid; 2× Dr. Salt NEO, Arginade, Acqua della rinascita (in Royal senza Creature) | Samurai Gamers, Fandom |

**Perché Akihabara ha 4 icone per 8 macchine non è documentato.** Non lo deduco.

### Proposte (cambiano dati; migrazione solo dopo il via)
- **272, 273, 274, 275 (Akihabara).** Collegare i quattro pin al luogo `akihabara/distributori-akihabara`, che è già l'unica sede dei sei listini e ha già l'Area Electric Town (migrazione 140). **Nessun listino assegnato a nessun pin**: il collegamento dice «qui ci sono distributori», non quale. Certezza alta sul luogo; un abbinamento pin → listino resta impossibile con le fonti esistenti.
- **1564, 1565, 1566 (Shinjuku).** Creare il luogo `shinjuku/distributori-shinjuku` (tipo `distributore`, Area `citta/shinjuku/quartiere-a-luci-rosse`, descrizione con i due assortimenti) e collegarvi i tre pin. Nessun listino per pin. Certezza alta su assortimenti e numero.
- **359 (Kichijoji).** Creare il luogo `kichijoji/distributori-kichijoji` (tipo `distributore`, Area `citta/kichijoji/quartiere-dello-shopping`, descrizione con i due assortimenti) e collegarvi il pin. Il pin è uno e le macchine tre: la descrizione lo dice, nessuna posizione viene inventata. Certezza alta.
- **339 (cancello Shujin).** Sulla stessa planimetria ci sono due pin: 339, senza collegamento, e 1760, già collegato dall'utente al listino `distributore-shujin-cancello-2` (Joylent). Le macchine sono due e gli assortimenti due: per esclusione 339 ha l'assortimento Second Maid, cioè `distributore-shujin-cancello-1`. Certezza **media**: dipende dal fatto che 1760 sia collegato giusto. Il pin 339 è dell'utente: serve il suo via.

## 2. Listini dei pin 1584 e 1769

- **1584 (Vicoli, Yongen).** Il pin è dell'utente e punta a `distributore-shujin-cortile` (Dr. Salt NEO, Arginade, Acqua della rinascita). Il cortile della Shujin non è a Yongen: il collegamento è sbagliato per posizione geografica. A Yongen le macchine sono due: bagno pubblico (Arginade e Acqua della rinascita) e quella vicino alle gabbie da battuta (Nastea, 1UP, Starvicks). Sulla stessa planimetria 1585 è già «Tabaccaio» e 1590 è il bagno pubblico, a 4 unità da 1584; per esclusione 1584 è la macchina del bagno, quindi il listino `distributore-yongen-bagno` (e il luogo `yongen-jaya/distributore-bagno-pubblico`). Certezza **media-alta** (le fonti sono per assortimento e punto di riferimento; la vicinanza al pin 1590 conferma). È un pin dell'utente: serve il suo via.
- **1769 (Central Street, Shibuya).** Il pin e il gemello 1768 puntano allo stesso listino `distributore-shujin-cancello-2` (Joylent). 1768 ha già la sede `shibuya/distributori-central-street`, 1769 no. Le macchine vicino alla libreria sono tre con tre assortimenti diversi (Second Maid, Joylent, Nastea + Durian-au-Lait e altri) e 1527 è già il Second Maid. Quindi **uno dei due pin che oggi condividono Joylent è un'altra macchina**, e la fonte non dice quale. **Decisione aperta per l'utente** (vedi sotto).

## 3. Servizi del Covo (COVO-375…383) e Jose (JOSE-386)

**Fatto provato (alta).** Il Covo si sblocca il 5/5 dal menu, ha Palace Maker, Galleria, Film, Lettore musicale, Area giochi (Magnate) e Premi. I Premi sono **quattro sezioni a parete**: Vita scolastica, Confidenti, Battaglia, Fantasma (2.420 Medaglie P in tutto). Fonti: Fandom «Thieves Den», AGS, Samurai Gamers. Non è documentato quale sezione stia su quale dei pin 380–383.

**Proposta, più semplice di `covo-distributori-19.md`** (niente anteprima/applica, niente proprietà nuove, nessuna pagina di approvazione nell'app): una migrazione crea nove luoghi di tipo `servizio` nell'Area `citta/yongen-jaya/covo-dei-ladri`, uno per pin, e collega ogni pin al suo luogo. Chiavi `yongen-jaya/covo-<funzione>`; i quattro Premi `covo-premi-8`…`covo-premi-11` (indice nativo del pin), con **lo stesso nome**, «Premi del Covo», e la descrizione «una delle quattro sezioni dei premi: Vita scolastica, Confidenti, Battaglia, Fantasma». Le altre descrizioni sono quelle di `covo-distributori-19.md` §3.
- Orari NULL (regola dell'app); nessuno sblocco inventato oltre «dal menu, dal 5/5».
- Non sono negozi, né attività contabili, né collegate alle sale giochi o alle gallerie della città.

**Jose-386.** In Royal Jose nel Covo è il personaggio-guida all'ingresso («tutorial and FAQ character»), non vende. Il pin è di tipo `negozio` ma senza riferimento. Proposta: cambiare il solo tipo del pin da `negozio` a `dialogo` (tipo già presente per gli incontri), lasciando riferimento NULL e nessuna sede commerciale. Nessun collegamento con il negozio di Jose dei Memento. Certezza alta.

## 4. Sedi (SEDE-tanaka-affari-loschi, SEDE-home-shopping-tv, SEDE-jose)
- **Tanaka:** si usa dal laptop alla scrivania della soffitta del Leblanc, fino al 30/1; il laptop va riparato con il Set di strumenti da PC. Certezza alta (Fandom, AGS, Samurai Gamers).
- **Home Shopping:** solo la domenica, **sulla TV del piano terra del Leblanc** (GameFAQs Royal, Prima Games). ProGameGuides dice anche la TV in camera; la guida Royal lo smentisce, ed è probabile una differenza con P5 originale. Certezza alta sul Leblanc, media sulla TV di camera.
- **Proposta:** `negozio.sede_chiave = yongen-jaya/leblanc` per entrambi (sede funzionale), senza toccare tipo `online`, orari o listino.
- **Jose (Memento):** compare solo nei Memento, in un punto casuale (AGS, Fandom, GameFAQs; primo incontro il 7/5). Proposta: `negozio.jose.sede_chiave = mementos/negozio-jose` (luogo già esistente, Area NULL per decisione già approvata). Certezza alta. Non è il pin 386.

## 5. Funzioni dei pin (FUNZIONE-PIN-349, 1641, 2022)
- **349 (Chiesa).** Il pin è sulla planimetria Cappella, il luogo `kanda-jinbocho/chiesa-kanda` ha l'Area Cappella dalla 140. Hifumi si incontra alla chiesa di Kanda (AGS, RPG Site, Samurai Gamers). Proposta: collegare il pin al luogo. Pin seed. Certezza alta.
- **1641 (Casa di Sojiro).** Il pin è dell'utente, sulla planimetria Vicoli, ed è la casa di Sojiro. Proposta: collegarlo a `yongen-jaya/sakura-residence`, che resta «solo eventi di Futaba» (`solo_eventi_confidente`). Che si possa visitare liberamente **non è documentato**: le fonti la citano solo negli eventi (visita col sushi, arco di Futaba). Certezza media. Pin dell'utente: serve il suo via.
- **2022 (Stanza di Velluto, Central Street).** La Stanza di Velluto non è un negozio né un luogo da visitare: è l'accesso alla fusione. La porta di Shibuya è in Central Street, nel vicolo del negozio di softair, e la fusione è disponibile dal 20/4 (condizione già sul pin). Non è documentata la data esatta di apertura in città in Royal. **Resta un pin senza luogo, per esclusione motivata; nessun dato cambia.** Certezza alta sulla funzione.

## 6. Pin Confidente (CONFIDENTE-PIN-1753, 1767)
- **1767 (Yoshida, Piazza della stazione).** Il pin punta a `yoshida`, sulla planimetria Piazza della stazione, e il luogo `shibuya/stazione-piazza-shibuya` ha già Yoshida. Fonti: AGS e GameFAQs (domenica sera, non con la pioggia, davanti all'edificio Teikyu). Coerente, nessun cambio. Chiusa.
- **1753 (Ann, 2° piano della Shujin).** Il pin punta a `ann` ed è sul 2P della Shujin. Le fonti dicono che Ann si incontra **al centro commerciale sotterraneo di Shibuya** (lunedì, martedì, mercoledì, venerdì, domenica); un punto al 2° piano della Shujin **non è documentato**, mentre il luogo di Ann dell'app è `shibuya/underground-mall-lovers`. Il pin funziona (il riferimento esiste) e non lo tocco. Chiusa con questa nota; vedi la domanda aperta.

## 7. Decisioni davvero aperte per l'utente
1. **Pin 1769** (Central Street): l'assortimento è Joylent come 1768, ma le fonti dicono che le tre macchine vicino alla libreria hanno assortimenti diversi. Quale delle due va cambiata, e a quale listino (Nastea, `distributore-yongen-tabaccaio`)? Se non lo sai, resta com'è.
2. **Pin 1753** (Ann): il pin sta al 2° piano della Shujin, ma Ann si incontra al centro commerciale sotterraneo. Lo lasciamo dov'è?

## 8. Riepilogo per voce

| Voce | Esito | Dati | Certezza |
|---|---|---|---|
| DISTR-272…275 | luogo Akihabara, nessun listino per pin | migrazione dopo il via | alta |
| DISTR-339 | listino `cancello-1`, per esclusione | pin dell'utente, serve il via | media |
| DISTR-359 | nuovo luogo Kichijoji | migrazione dopo il via | alta |
| DISTR-1564…1566 | nuovo luogo Shinjuku, nessun listino per pin | migrazione dopo il via | alta |
| COVO-375…383 | nove luoghi `servizio` nel Covo | migrazione dopo il via | alta sulle funzioni, nessuna categoria per pin |
| JOSE-386 | tipo `negozio` → `dialogo` | migrazione dopo il via | alta |
| SEDE-tanaka, SEDE-home-shopping-tv | sede `yongen-jaya/leblanc` | migrazione dopo il via | alta |
| SEDE-jose | sede `mementos/negozio-jose` | migrazione dopo il via | alta |
| FUNZIONE-PIN-349 | pin → `chiesa-kanda` | migrazione dopo il via | alta |
| FUNZIONE-PIN-1641 | pin → `sakura-residence` | pin dell'utente, serve il via | media |
| FUNZIONE-PIN-2022 | esclusione motivata, nessun cambio | nessuno | alta |
| CONFIDENTE-PIN-1767 | coerente, chiusa | nessuno | alta |
| CONFIDENTE-PIN-1753 | funziona, discordanza di fonte in nota | nessuno | media |
| LISTINO-PIN-1584 | listino `distributore-yongen-bagno` | pin dell'utente, serve il via | media-alta |
| LISTINO-PIN-1769 | domanda aperta | nessuno finché non decide | — |
