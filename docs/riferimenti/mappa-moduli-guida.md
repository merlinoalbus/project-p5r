# Mappa dei moduli — dalla guida allgamestaff all'app

Fonte indice: https://www.allgamestaff.it/persona-5-royal/indice/ (guida italiana completa).
Obiettivo dichiarato dall'utente: **rendere la guida un'app**, arricchita con funzionalità ad hoc, usata da tablet
durante la partita per aggiornare lo stato di gioco e ottenere subito la risposta/scelta migliore.

Ogni sezione della guida diventa un **modulo** con tabelle proprie di conoscenza (dati di gioco, ricaricabili)
e, dove serve, tabelle di tracking legate a `partita_id` (dati dell'utente, per partite multiple).

| Sezione guida | Modulo app | Conoscenza | Tracking per partita | Fase |
|---|---|---|---|---|
| Personae: abilità, tratti, come ottenerle | Compendio, Skill | persona, skill, tratto, affinità, Mementos | compendio personale, Persona possedute con skill/livello | 0 |
| Stanza di Velluto, Demoni del Tesoro | Fusione | tabella arcana, ricette speciali, modificatori rari, eredità | obiettivi, piani salvati | 1–4 |
| Confidenti (23) + Regali | Confidenti | rango → bonus, risposte migliori per dialogo, regali graditi, disponibilità | sbloccato, rango, punti, regali fatti | 0 (base) → 6 |
| Doti sociali (Fascino, Coraggio, Perizia, Gentilezza, Conoscenza) | Doti sociali | soglie di rango, azioni che danno punti | punteggio corrente con pulsanti +/– | 0 |
| Interrogazioni ed Esami | Domande in classe | data → domanda → risposta corretta | segnate come fatte | 6 |
| Soluzione per settimana, Gestione del tempo | Calendario | eventi per data, scadenze, consigli | data corrente, avanzamento | 6 |
| Palazzi, Memento (Dedali), Richieste | Dungeon | boss, debolezze, richieste, tesori | completamento | 7 |
| Battaglia, Ombre sciagura, Speciali, danno tecnico | Aiuto in battaglia | debolezze ombre, tabella tecnica, negoziazione | — | 7 |
| Negozi, Oggetti, Armi, Accessori, Abiti | Inventario | cataloghi | posseduti | 8 |
| Mini-giochi, Intrattenimento, Lavori | Attività | benefici per doti sociali | completati | 8 |
| Trofei, Finali, Covo dei Ladri | Varie | condizioni | avanzamento | 9 |

Le fasi 6+ sono successive alla Fase 5 concordata; il modello dati di Fase 0 le prevede (moduli isolati, chiave `partita_id`).

## Nomi italiani degli Arcani (dalla guida, confermati)
Matto, Mago, Papessa, Imperatrice, Imperatore, Ierofante, Amanti, Carro, Giustizia, Eremita, Fortuna, Forza,
Appeso, Morte, Temperanza, Diavolo, Torre, Stella, Luna, Sole, Giudizio, Mondo, Fede, Consigliere.
