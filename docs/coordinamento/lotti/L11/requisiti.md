# L11 «Pulizia e ricerca» — requisiti

Autore: sessione «Analisi requisiti» (2026-10-20). Fonti: piano (righe 26-28, 55-73, 156-158, 192-193, 233-236, 252-253, 372, 424),
memoria «Un punto di modifica», «Test non a ogni run» (i test non si cancellano), «Lavoro da preservare»; requisiti di L2–L10 (le fonti
vecchie lasciate «senza lettori» fino a L11).

## Obiettivo
Chiudere la razionalizzazione: **dati e codice morti eliminati** (marcatori, piante vecchie, colonne frase, tabelle storiche, copie lasciate
senza lettori dai lotti precedenti: piano ≈600 righe); una **ricerca globale** su tutti gli oggetti (quartieri, aree, planimetrie, luoghi,
negozi, Palazzi, infiltrazioni, voci della guida, Persona, Ombre, oggetti, Confidenti, attività, libri, film, Richieste, giorni) che porta
alla loro casa; l'**indice «Mappe»** diventa **l'albero della gerarchia** (Città › Quartiere › Area › Planimetrie; Città › Palazzo › Area ›
Planimetrie; Memento › Dedalo › Area) con le planimetrie visibili sotto ogni area; **«Modifica» con «Ripristina»** su ogni oggetto ancora
senza (chiude l'elenco «Tutto modificabile» del piano); **documenti riscritti** (ARCHITETTURA, ROADMAP, DECISIONI, documentazione delle API).

**Fatto quando** (piano, riga 424): nessuna tabella o colonna senza lettore; ogni oggetto si trova dalla ricerca.

## Criteri di accettazione
Tipo: **F** funzionale, **UX** esperienza, **NR** no-reg, **L** layout.

### Dati e codice morti
- R11-01 [F] Un inventario di ogni tabella e colonna di `gioco.db` e `partite.db` con i suoi lettori (servizi, rotte, viste, import/export, migrazioni) è consegnato; dopo il lotto nessuna tabella o colonna resta senza lettore, salvo quelle dichiarate «di archivio» con motivo.
- R11-02 [F] Le fonti vecchie lasciate dai lotti L2–L10 (es. `mappa.entita_*`, `mappa_entita` di tipo area, `gruppo_immagini_json` dei Palazzi, nome in `guida_mappa`, `marcatore_mappa`, `marcatore_luogo`, `pianta_area`, `pianta_quartiere`, frasi di orari e sblocco, copie di nomi e prezzi, la seconda tabella giornaliera, `evento_calendario`, contatori doppi) sono eliminate con migrazione append-only e copia di sicurezza, ognuna dopo la prova che nessuno la legge.
- R11-02b [F] Fra le fonti vecchie da eliminare, dopo la prova che nessuno le legge, ci sono anche quelle lasciate dalle decisioni prese dopo la prima stesura:
  - le righe di `utente.spillo_partita` dei pin condivisi da rigenerabili, che dopo L4 si leggono da `spillo_partita_infiltrazione` (L4 §8.11);
  - l'euristica del boss finale (`bossFinali`/`eBossFinale`, sostituita da `voce_boss_finale`, L4 §8.14);
  - le frasi di sblocco dei quartieri, sostituite dalle condizioni (L6 R6-08b);
  - i nomi vecchi degli elementi (L8 R8-20c);
  - le copie di orari che L5 ha diviso nei quattro ambiti (R5-12b).

  Le righe dello stato di partita si eliminano solo se un confronto voce per voce e pin per pin conferma che lo stato visibile di p1 e p2 non cambia.
- R11-03 [F] Il codice morto (servizi, componenti, rotte, tipi DTO, utility che leggevano le fonti eliminate) è rimosso; typecheck e lint lo confermano (nessun import orfano, nessuna esportazione inutilizzata segnalata).
- R11-04 [F] I file di test non si cancellano: i test delle parti rimosse si aggiornano al codice nuovo o si dichiarano superati con motivo (regola dell'utente del 2026-10-18); nessuna variante rossa lasciata.
- R11-05 [F] Import ed export del pacchetto non portano più le tabelle eliminate; un pacchetto vecchio che le contiene si importa ancora (le migrazioni le convertono e poi le scartano), con un riepilogo di cosa è stato scartato.
- R11-06 [F] Il cestino continua a rimettere gli elementi eliminati prima di L11 anche se citano colonne rimosse (il ripristino segnala ciò che non può tornare, regola del 2026-10-16).

### Ricerca globale
- R11-07 [F] Una ricerca globale, raggiungibile da ogni pagina (intestazione o barra), trova per nome (italiano e originale, senza accenti e maiuscole) tutti gli oggetti elencati nell'obiettivo e porta alla loro pagina (la casa di L2–L10).
- R11-08 [F] I risultati sono raggruppati per tipo, con il percorso nella gerarchia (es. «Tokyo › Shibuya › Central Street › Untouchable») e l'immagine del risolutore di L1.
- R11-09 [F] Ogni oggetto del catalogo si trova: per ogni tipo, un controllo automatico verifica che tutti gli oggetti abbiano un risultato di ricerca che porta a una pagina esistente (nessun 404).
- R11-10 [F] La ricerca rispetta le cose nascoste (`nascosto`) come le viste di oggi e la grafica predefinita.
- R11-10b [F] La ricerca e l'albero seguono le regole di L5:
  - un luogo chiuso adesso **si trova** dalla ricerca, perché non è un menu di navigazione, ma è segnato «chiuso adesso», con il motivo (R5-20b, R5-20d);
  - risultati e nodi portano il **nome del posto**, mai «Mappa» o «atlante» (R5-20c).

  Le aree «da verificare», come l'Area riservata allo staff sotto Tokyo (L2 R2-01b), compaiono con il loro segno.
- R11-10c [F] **Un elenco unico di ciò che l'utente deve rivedere o verificare**, raggiungibile da Impostazioni o da Progressi, con un collegamento a ogni elemento e il gesto che lo chiude. Raccoglie:
  - le voci del diario «da rivedere» aggiunte o corrette dopo il 06-01 (L3 R3-37c, L10 R10-11j2 e R10-28d);
  - le proposte d'infiltrazione da confermare (R3-37b/c);
  - le divergenze «da verificare» (L4 R4-14b);
  - le aree e i dati «da verificare» (L2 R2-01b; la certezza media di Roppongi e Maihama, L6);
  - le correzioni dei pin dell'utente da approvare (L5, dubbio 7);
  - dalle risposte dell'Esperto della guida e dalle note del PM:
    - la Sakura Residence senza sblocco proprio (G-031);
    - il negozio dove si comprano le «Pagine ammuffite», Hinokuniya o Taiheido (G-031);
    - la nota proposta per il pin 811 di Madarame, «il dipinto preso qui è un'esca» (G-030);
    - le voci del boss di Madarame con «Gelo» e «respinge» scritte dall'utente (L8 R8-20c);
    - il listino di Tanaka, da rifare sui 18 articoli di Royal, con i 20 di oggi affiancati (L7 R7-13b, G-034);
    - gli altri punti di G-028;
  - la scelta per l'invito di Makoto del 30/7: tenere la voce con la condizione scritta, cioè la strada (a) applicata, oppure toglierla e lasciare solo l'evento, la strada (b) (L6 R6-08c3).

  Verifica: ogni elemento segnato in L2–L10 compare nell'elenco, e chiuderlo dall'elenco ha lo stesso effetto del gesto nella sua pagina. **Approvato come decisione del PM (2026-10-20)**: serve all'utente per la sua revisione finale.

### Indice «Mappe» come albero
- R11-11 [F] `/guida/mappe` è l'albero della gerarchia: Città › Quartieri › Aree › Planimetrie; Città › Palazzi › Aree › Planimetrie (con le infiltrazioni accanto); Memento › Dedali › Aree (senza planimetrie); le planimetrie si vedono sotto ogni area.
- R11-12 [F] Ogni nodo dell'albero porta alla casa dell'oggetto (Quartiere, Area, scheda del Palazzo, menù del Dedalo); non esistono più nodi che aprono viste alternative (visore di Tokyo, «Tokyo» come riga dell'indice, nodo illustrazione, griglia del Palazzo).
- R11-13 [F] La lista «da collocare» (mappe senza posto) è raggiungibile dall'albero e ogni voce si assegna da lì.
- R11-14 [F] L'editor delle mappe resta per pin, ritagli, pezzi e passaggi; «Nuova mappa» generica non esiste più (verifica finale, dopo L2/L3).

### «Modifica» e «Ripristina» ovunque
- R11-15 [F] Ogni oggetto dell'elenco «Tutto modificabile» del piano (Calendario, Confidenti, Persona e compendio, Ombre e battaglia, Oggetti, Città, Scuola, Altro: personaggi, sfide, trofei e completamento, ranghi delle Doti) ha «Modifica» nella sua pagina, con lo stesso modulo e «Ripristina» al valore della guida; l'elenco di verifica è consegnato con l'esito oggetto per oggetto.
- R11-16 [F] Le correzioni dell'utente restano dopo un aggiornamento del pacchetto, per ogni tipo (prova su copia: correzione, import del pacchetto, correzione ancora lì).
- R11-17 [F] Nessun dato di gioco resta modificabile solo nel pacchetto.

### Documenti
- R11-18 [F] `docs/ARCHITETTURA.md` descrive il modello finale (entità, fonti uniche, pagine, risolutore d'immagine, vocabolario delle condizioni, diario come motore) senza parti superate.
- R11-19 [F] `docs/ROADMAP.md` segna L0–L11 con lo stato reale; `docs/DECISIONI.md` ha una voce per lotto con le scelte «consigliate applicate, da confermare» e quelle confermate dall'utente distinte.
- R11-20 [F] La documentazione delle API (`server/openapi/`) elenca solo rotte esistenti, con il vocabolario nuovo; gli indirizzi vecchi rimandati (redirect) sono documentati come tali.

### Lavoro da preservare e non regressione
- R11-21 [NR] Diario 04-01..06-01 (255 voci sulla copia di produzione 0440Z del 2026-10-20; 254 sulla copia precedente, segno «validata»), Kamoshida (169 voci) e Madarame (227 voci e 254 pin utente sulla copia 0440Z, impronta 263; 225/252 sulla copia precedente) identici prima e dopo le eliminazioni (impronta), e funzionanti come dopo L10 (prova completa del piano, righe 393-400, con la partita reale copiata e una di prova).
- R11-22 [NR] Ogni indirizzo vecchio documentato nei lotti precedenti (mappe, negozi, griglia del Palazzo, `?area=`, Covo) porta ancora alla casa giusta.
- R11-23 [NR] La navigazione dalla metro, dal diario e dalla ricerca arriva agli stessi Palazzi, infiltrazioni e voci (piano riga 397).
- R11-24 [NR] Typecheck e lint verdi; test mirati delle aree toccate verdi con output grezzo; `npm audit --omit=dev --audit-level=high` verde (gate della pipeline).

### Esperienza e layout
- R11-25 [UX] Dal telefono in partita: la ricerca si apre con un tocco, trova un oggetto scrivendo 3 lettere e porta alla sua pagina; tornando indietro si ritrova la partita.
- R11-26 [UX] L'albero delle Mappe è leggibile e navigabile senza perdersi (rami chiusi per default oltre il quartiere/Palazzo, miniatura e conteggi accanto ai nodi).
- R11-27 [L] Ricerca globale, albero delle Mappe, moduli «Modifica» aggiunti: nessuno scorrimento orizzontale a 1280, 768, 375; bersagli ≥44 px; su telefono la ricerca è a tutto schermo; scroll annidati dell'albero con confine evidente e overscroll contenuto.

## Decisioni coinvolte
Nessuna D1–D8 specifica. Il lotto registra in DECISIONI lo stato finale di D1–D8 (confermate o ancora «da confermare»).

## Lavoro dell'utente da preservare toccato dal lotto
- Tutto il lavoro protetto (diario 04-01..06-01, Kamoshida, Madarame): le eliminazioni non devono toccarne una riga (R11-21).
- Le correzioni fatte dall'utente sui dati di gioco (`origine='utente'`): non si perdono eliminando le copie vecchie.
- Il cestino dell'utente: gli elementi già nel cestino restano ripristinabili (R11-06).

## Dipendenze
- **Alla fine**: dopo la consegna di L0–L10 (ogni lotto lascia le sue fonti vecchie senza lettori; L11 le elimina).
- La ricerca e l'albero usano le pagine (case) introdotte da L2, L3, L5, L7, L8, L9.

## Casi dubbi da approvare (soluzione prudente proposta)
1. **Tabelle storiche o di archivio** (es. `organizzazione_mappa_esito`, `seed_json`, `fonte`, `verificato`): si tengono se servono a
   «Ripristina» o alla provenienza dei dati; si eliminano solo quelle senza lettore e senza valore di provenienza, con elenco.
2. **Righe nel cestino che citano colonne rimosse**: il cestino le conserva così come sono; al ripristino torna ciò che può tornare.
3. **Pacchetti di gioco vecchi**: restano importabili (conversione e scarto), mai rifiutati.
4. **Ricerca dentro i testi** (voci della guida, diario): prudente, solo nomi e titoli nella prima versione; la ricerca nei testi lunghi come
   filtro separato, se l'utente la vuole.
5. **Elenco «Tutto modificabile»**: se un oggetto non ha una fonte della guida (dato nato nell'app), «Ripristina» non compare e lo si dice.
