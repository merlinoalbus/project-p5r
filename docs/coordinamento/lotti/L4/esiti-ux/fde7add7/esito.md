# L4 — UX su fde7add7 (Test UX, 2026-10-20)

Collaudo FE 5473 / BE 3301, linea `newreview-l4` = fde7add7, base 1741Z, partita 1. Solo testo, nessuna schermata (richiesta del PM).

## Parte 1 — letture (sola lettura, nessun salvataggio)
Finestre aperte e richiuse con «Annulla». Il filtro «Mostra anche i raccolti» non scrive: localStorage invariato.

**1. «Completato» con il perché, e l'anello**
- Madarame a 768: l'intestazione dice «100%» nell'anello e «Completato».
  - Il perché sta nel `title` («Tesoro, boss finale e tutti gli oggetti permanenti (82/82)») e nell'`aria-label` («Completato: Tesoro
    raccolto, boss finale sconfitto»).
  - Il chip non si tocca, quindi su telefono e tablet il perché non si vede lì. Si legge per intero nei «Dettagli dalla guida» (provato su
    Kamoshida in L3: «Tesoro raccolto · boss finale sconfitto · Completato: … (71/71)»).
- Anello: `aria-label` «Avanzamento in Palazzo di Madarame: 82 oggetti permanenti fatti su 82», testo «100%».
- Su un Palazzo **concluso ma non completato** la base non ha casi (Kaneshiro 0/26, Kamoshida e Madarame completati). Si vede nel ciclo
  (parte 2) e nell'avviso di «Crea la voce» (punto 7).

**6. Carattere della voce** (Madarame «2. Scopri dov'è il Tesoro», 768 e 375)
- «Racconto» (con il libro), «Si ripropone» (con le frecce), «Permanente» (con il lucchetto): ognuno è un chip con icona e testo, distinto
  anche a 375. Nessun testo tagliato, nessuno scorrimento orizzontale.
- Lo stato si legge nella riga («· letto», «· ottenuto»), con k/N («4/4») e i pin («4 pin»).
- «Anche nella 1ª e 4ª infiltrazione» si capisce. «1ª» e «4ª» sono due bersagli da 44 px.
- Conteggi su questa infiltrazione: Permanente 27, Si ripropone 20, Racconto 21.
- «Esaurito» non c'è nella base (nessuna voce esaurita): va nel ciclo.

**5. Selettore «Stato nella» nel popup** (Entrata del Museo, pin «Installazione Artistica», 768)
- Il popup dice «Installazione Artistica · Oggetto · ottenuto», poi «Stato nella [Scopri dov'è il Tesoro ▾]», un bersaglio da 44 px.
- Il selettore offre le due infiltrazioni in cui il pin conta: «Prima Infiltrazione al Museo» e «Scopri dov'è il Tesoro». Si capisce.
- **Difetto UX4-1**: le righe delle voci nel popup non dicono il carattere. Le due righe sono «Installazioni artistiche · ottenuto · 4/4» e
  «Installazioni Artistiche · ottenuto · 4/4», ognuna con «Riapri»: stesso nome (cambia solo una maiuscola), stesso stato e nessun chip
  «Si ripropone». Non si capisce quale delle due si riapre né perché sono due. R4-34 chiede che nel popup si capisca a colpo d'occhio se
  una voce è permanente o si ripropone.

**7. Schede da sistemare**
- Madarame: «Schede da sistemare (1)» spiega cosa sono. La scheda «Forziere — Fiale delle vertigini S · Nelle profondità del Museo» ha il
  testo e due pulsanti da 44 px, «Crea la voce» e «Collega a una voce».
- **Percorso dell'utente** («Forziere — Fiale delle vertigini S» → «Apri i Forzieri»):
  1. «Collega a una voce» apre una finestra che spiega cosa succede: «La voce scelta prende il posto della scheda, che esce da quest'elenco.
     Nessuno stato si trasferisce.».
  2. «Scegli la voce…» apre un elenco con la ricerca «Cerca voce…», raggruppato per infiltrazione, che comincia da «4. Nelle profondità del
     Museo», quella della scheda.
  3. Scrivendo «Apri i» resta una voce sola, «Apri i Forzieri · Forziere raro», alta 44 px.
  4. Poi «Collega».

  Il percorso è chiaro. Mi sono fermato prima di «Collega».
- Kamoshida, «Crea la voce» su «Cancello del Castello». La finestra dice:
  - «Una voce nuova in fondo a «Vecchio Castello», col nome e la descrizione della scheda. Nessuno stato si trasferisce.»
  - l'avviso di FUN4-1: «La voce nuova conta fra gli oggetti permanenti: in questa partita il Palazzo torna da «Completato» a «Concluso»
    finché non la segni.»
  - tipo proposto «Stanze sicure».

  È chiaro e dice la conseguenza prima del gesto. Chiusa con «Annulla».

## Parte 2 — gesti che scrivono (ciclo del Collaudo)
In attesa di «foto fatta»:
- punto 2, «Da verificare»;
- punto 3, k/N, «Riapri», «Riapre anche», «Segnate anche / Riaperte anche»;
- punto 4, Enigma;
- punto 6, «Esaurito»;
- punto 7, collegamento fino in fondo;
- punto 8, area nuova vuota.
