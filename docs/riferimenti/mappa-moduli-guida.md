# Mappa dei moduli — dalla guida allgamestaff all'app

Fonte indice: https://www.allgamestaff.it/persona-5-royal/indice/ (guida italiana completa).
Obiettivo: rendere la guida un'app, arricchita con funzionalità proprie, usata durante la partita per aggiornare lo stato di gioco e
ottenere subito la risposta o la scelta migliore.

Ogni sezione della guida è un **modulo** con tabelle proprie di conoscenza (dati di gioco in `gioco.db`) e, dove serve, tabelle di
tracciamento legate a `partita_id` (dati dell'utente in `partite.db`, per partite multiple).

| Sezione guida | Modulo app | Conoscenza | Tracciamento per partita |
|---|---|---|---|
| Personae: abilità, tratti, come ottenerle | Compendio, Skill | persona, skill, tratto, affinità, Mementos | compendio personale, Persona possedute con skill e livello |
| Stanza di Velluto, Demoni del Tesoro | Fusione | tabella arcana, ricette speciali, modificatori rari, eredità | obiettivi, piani salvati |
| Confidenti (23) + Regali | Confidenti | rango → bonus, risposte migliori per dialogo, regali graditi, disponibilità | sbloccato, rango, punti, regali fatti, relazione |
| Doti sociali (Fascino, Coraggio, Perizia, Gentilezza, Conoscenza) | Doti sociali | soglie di rango, azioni che danno punti | punteggio corrente con pulsanti +/– |
| Interrogazioni ed Esami | Domande in classe | data → domanda → risposta corretta | segnate come fatte, piazzamento |
| Soluzione per settimana, Gestione del tempo | Diario e Calendario | voci per data e fascia, eventi, scadenze | data corrente, spunte, avanzamento |
| Palazzi, Memento (Dedali), Richieste | Palazzi e Memento | aree, planimetrie, boss, debolezze, richieste, tesori | completamento, stato dei pin |
| Battaglia, Ombre sciagura, Speciali, danno tecnico | Aiuto in battaglia | debolezze delle Ombre, tabella tecnica, negoziazione | — |
| Negozi, Oggetti, Armi, Accessori, Abiti | Negozi e catalogo | cataloghi, offerte, rifornimento | acquisti, copie, consumi |
| Mini-giochi, Intrattenimento, Lavori | Attività | esiti, benefici per le Doti | turni, letture, visioni |
| Trofei, Finali, Covo dei Ladri | Completamento | condizioni | avanzamento |

## Nomi italiani degli Arcani (dalla guida, confermati)
Matto, Mago, Papessa, Imperatrice, Imperatore, Ierofante, Amanti, Carro, Giustizia, Eremita, Fortuna, Forza,
Appeso, Morte, Temperanza, Diavolo, Torre, Stella, Luna, Sole, Giudizio, Mondo, Fede, Consigliere.
