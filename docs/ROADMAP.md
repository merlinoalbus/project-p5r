# Roadmap — project-p5r

Cosa fa l'app oggi, per aree, e cosa resta aperto. Il dettaglio tecnico di ogni area è in [`ARCHITETTURA.md`](ARCHITETTURA.md), le
regole di comportamento in [`DECISIONI.md`](DECISIONI.md). La storia delle lavorazioni è nella cronologia di git.

Stato: tutte le aree sotto sono **in uso**. L'istanza di preparazione (scrittura dei contenuti) e l'istanza di rilascio (contenuti in
sola lettura, partite per utente) girano dallo stesso codice. Schema dei dati: 333 migrazioni di gioco (l'ultima è la 333), 63 delle partite (l'ultima è la 063).

## Compendio e skill
- Compendio delle Persona Royal (`/compendio`) con scheda di dettaglio: arcano, livello, affinità, skill per livello, statistiche,
  descrizione originale in italiano, immagine; filtri e ricerca su nome canonico e italiano.
- Elenco e scheda delle skill (`/skill`), glossario dei termini (`/compendio/glossario`).
- Persona dei membri del gruppo con le loro forme, nel compendio.
- Rese italiane modificabili da Impostazioni → Traduzioni; ogni dato correggibile ha «Modifica» e «Ripristina».

## Fusione
- Fusione diretta e inversa, ricette speciali e Demoni del Tesoro, costo di evocazione (`/fusione`).
- Alberi di fusione ricorsivi ordinati per costo, a partire da scorta, Registro e Persona catturabili.
- Eredità delle skill, ricerca per skill desiderate con propagazione a catena negli alberi.
- Bonus della Stanza di Velluto: sconti del Registro, EXP dei Confidenti, Forca, Isolamento con incensi, Gemelle, Allarme.
- Piani salvati e obiettivi per Persona.

## Partita
- Più partite, una attiva, cambio dalla barra in alto; dati della partita in una finestra (`/partita`), con il salvataggio di Persona 5 e i
  contenuti scaricabili posseduti (li leggono la Fusione e lo Scaffale con lo scatolone del Leblanc).
- Scorta e compendio personale, Persona della partita, statistiche stimate e registrate.
- Confidenti con rango, punti in note, semafori dei requisiti, inviti, relazione romantica, regali con reazione, doni ricevuti;
  scheda del Confidente (`/confidenti/:chiave`).
- Doti sociali con note e soglie, promemoria «Applica», interruttore della Fortuna.
- Denaro con i movimenti automatici delle voci e quelli a mano; oggetti ottenuti, copie, consumi e uscite.
- Progressi, trofei, storico degli eventi con la provenienza, completamento (`/guida/completamento`).
- Avanzamento automatico di fascia e giorno, meteo per fascia.

## Diario (guida giorno per giorno)
- `/guida/percorso`: le voci di ogni giorno e fascia, in ordine, con gli effetti dichiarati (Doti, Confidenti, acquisti, yen, oggetti,
  trofei, sblocchi, Persona, inviti, letture, pesca, domande, esami) e la spunta che li applica e li annulla.
- Voci con condizione «Si fa solo se», effetti con condizione «Vale solo se», voci con alternative (televendite), esiti scelti alla
  spunta, ricevute della spunta.
- Modifica completa delle voci; copia, taglio e incolla (anche fra giorni) e appunti fissi nella preparazione.
- Calendario degli eventi (`/guida/calendario`) collegato alle voci.

## Mondo, mappe e luoghi
- Mappa di viaggio di Tokyo con quartieri, Palazzi e luoghi; pagine di quartiere, Area e luogo (`/guida/citta`, `/guida/luogo/…`).
- Palazzi (`/guida/dungeon`) con Aree, planimetrie, infiltrazioni, guida delle aree collegata ai pin, stato «concluso» e «completato».
- Memento con dedali, aree, Persona, Richieste e trama.
- Visore ed editor delle mappe (`/guida/mappe`): spilli in quattro categorie, condizioni di visibilità, pezzi delle planimetrie,
  passaggi, esportazione e importazione; «Dove si trova» per ogni cosa del mondo. Una sola guida da usare in ogni visore, su ogni mappa
  con voci della guida (pulsante «Guida»).
- Luoghi della guida (`/guida/mappe`): miniature delle carte dei Palazzi, dei Memento, dei loro Dedali e delle loro aree, da inserire,
  cambiare o togliere nella preparazione (file, Ctrl+V, «Incolla dagli appunti»).
- Cestino delle eliminazioni della guida e delle mappe.

## Negozi, oggetti e attività
- Negozi con orari, sede, listini condivisi, scorta e rifornimento, sconti dal rango di un Confidente (`/guida/negozi`).
- Catalogo degli oggetti con offerte, regali, contenuti, ricette e note storiche (`/guida/oggetti`).
- Attività, lavori, libri, film, videogiochi, cruciverba, con esiti, trofei, oggetti e modificatori dei libri. Le Doti delle attività
  sono strutturate (fisse o scelte alla spunta: la Dote a caso del biliardo e di Gun About, le note delle freccette) e diventano il promemoria
  «Applica» sia alla spunta della voce sia con il + del contatore in Partita → Progressi.
- Richieste dei Memento con sblocco e scadenza (`/guida/richieste`).

## Risposte immediate
- Domande in classe, esami e quiz TV con il premio della guida (`/guida/domande`).
- Aiuto in battaglia e schede delle Ombre (`/guida/battaglia`, `/guida/ombra/:chiave`), negoziazione con le risposte Royal.
- Pesca con regole e visite della partita; Covo dei Ladri, sfide, personaggi.

## Ricerca e strumenti
- Ricerca globale su 25 tipi di cose, dalla barra in alto.
- Impostazioni: partite, traduzioni, correzioni, Cestino, caratteri, grafica predefinita, pacchetto di gioco («Importa»), copia
  dell'istanza, documentazione delle API, «Prepara edizione» del rilascio.
- Interfaccia per desktop, tablet e telefono; installabile a schermo intero.

## Punti aperti

**Lavori aperti**
- **Vecchia lista dei contenuti della guida.** `ContenutiGuidaMappa` (con `SchedaContenutoGuida` e `GET /api/mappe/contenuti/:chiave`)
  non è più montata da nessuna pagina: la tengono in vita soltanto i suoi test (`ContenutiGuidaAccesso.test.tsx`,
  `OrganizzazioneMappe.test.tsx`, `SchedaContenutoGuida.test.tsx`), che non si cancellano senza il sì dell'utente.

**Riservato all'utente**
- Collaudo automatico completo della ricerca globale: lo esegue l'utente.
- Proposte di conversione delle voci del Diario aperte in «Da completare» (periodo dal 1° aprile al 1° giugno): 43 «da verificare» (lo yen
  dello Scaffale del 12 aprile è chiuso dalla 330, con la condizione del salvataggio di Persona 5) e 8
  «probabili», più 4 certe lasciate (le tre «Concimare la pianta…», che dipendono dal tipo di bionutrimenti usato, e lo yen del bagno
  del 26 maggio, da decidere con la sua «da verificare»). Il conteggio va riletto nella pagina prima di decidere.

**Domande all'utente sui doni dei Confidenti**
- I doni hanno la regola della guida, valutata sulla partita (`doniConfidenti.ts`, il dono vale finché la regola vale): i dolci «se
  fidanzata» (10) e i giri choco del 15 febbraio (11) dalla 329, il Rampino di Morgana dal suo passo nel Palazzo di Kamoshida dalla 332; i
  cioccolatini di Ryuji e Sojiro arrivano dall'esito di San Valentino scelto alla spunta della voce del 14 febbraio (331).
- Resta il Sacchetto di carta di Iwai: la guida lo lega alla vendita della medaglia di Kamoshida del 4 maggio (sbirciando nel sacchetto) e
  alla restituzione del 6 maggio. Sono due voci del periodo validato già spuntate: «oggetto ricevuto» e «restituito» su quelle voci
  cambierebbero le partite, quindi decide l'utente.

**Grafica**
- Caricare nell'istanza di preparazione le 4 illustrazioni delle attività nuove (`docs/grafica/asset-generati/2026-10-29/attivita/`:
  estrazione della lotteria, concimare la pianta, fabbricazione degli strumenti, fabbricazione di Kawakami) con
  `PUT /api/immagini/attivita/<chiave>`; poi la cartella si toglie dal repository.
