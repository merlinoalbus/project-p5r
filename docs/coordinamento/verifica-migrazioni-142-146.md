# Verifica di controllo delle migrazioni 142–146

Analisi dati, 2026-10-23, sola lettura. Incarico del PM: per ogni migrazione 142–146 contare che cosa cambia e verificare che non tocchi le voci del diario
validate fino al 1° giugno, i Palazzi di Kamoshida e Madarame (voci e pin dell'utente), le spunte e `partite.db`. Confronto con i conteggi di
`docs/coordinamento/memoria-del-progetto/project-lavoro-da-preservare.md`.

## 1. Esito in una riga

**Le migrazioni 142–146 non toccano nessuna delle cose da preservare**: dopo ciascuna, il diario 04-01..06-01, le voci, i pin, i legami e gli stati di Kamoshida e Madarame e le spunte
sono **identici byte per byte** alla base; `partite.db` non cambia nemmeno una riga. Le migrazioni sono idempotenti e lasciano integrità e chiavi esterne pulite. Tre cose da sapere
(§6): la 144 aggiunge collegamenti di contenuto a 16 voci dei due Palazzi; la 143 salta un pin; la 147 esiste ma non è registrata.

## 2. Come ho verificato

- **Base**: copia di p5s `dati-p5s/p5s-2026-10-23-1935Z/` (gioco schema 138, partite 30), copiata nella scratchpad; mai p5s né `data/`.
- **Passo per passo**: con l'avvio vero del backend (`initDb`, connessione condivisa; la 144 la richiede) ho applicato le migrazioni **una alla volta** (139, 140, 141, 142, 143, 144, 145, 146, 147) e,
  alla fine, le migrazioni delle partite 031–033. Dopo ogni passo: hash di ogni tabella dei due file (senza `updated_at`), righe aggiunte, tolte e cambiate per le tabelle toccate, e le misure del lavoro da preservare.
- **Controlli finali sulla copia migrata**: ogni migrazione 139–146 rieseguita una seconda volta (idempotenza), `integrity_check` e `foreign_key_check` su entrambi i file.
- **Strumenti**: script in scratchpad (`verifica-142-146.ts`, `verifica-dettaglio.ts`, `verifica-idempotenza.ts`), fuori dal repository.

## 3. Confronto con i conteggi di riferimento

Base della copia 1935Z contro `project-lavoro-da-preservare.md` (riscontro del 23/10 19:35Z):

| Misura | Documento | Copia (prima) | Dopo 142 | Dopo 143 | Dopo 144 | Dopo 145 | Dopo 146 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Diario 04-01..06-01 (voci) | 255 | **255** | 255 | 255 | 255 | 255 | 255 |
| Spunte | 342 (L10) | **342** | 342 | 342 | 342 | 342 | 342 |
| Kamoshida, voci della guida | 169 | **169** | 169 | 169 | 169 | 169 | 169 |
| Kamoshida, pin dell'utente | 359 | **359** | 359 | 359 | 359 | 359 | 359 |
| Madarame, voci della guida | 226 | **226** | 226 | 226 | 226 | 226 | 226 |
| Madarame, pin dell'utente | 254 | **254** | 254 | 254 | 254 | 254 | 254 |
| Pin dell'utente nei due Palazzi | 613 | **613** | 613 | 613 | 613 | 613 | 613 |

I conteggi coincidono con il documento (che dà Madarame 226 voci perché «Raccogli Installazione Artistica» è nel Cestino dal 20/10). Oltre ai numeri, per **ogni passo** l'impronta (sha256) è identica a quella della base per:
- le 255 voci del diario, escluse le colonne che la 110 ha aggiunto e `updated_at`;
- le 342 spunte;
- per Kamoshida e Madarame: voci della guida, infiltrazioni, pin (utente e tutti), legami pin-voce (`spillo_voce`), stati dei pin (`spillo_partita`) e stati delle voci (`punto_partita`).
Nessuna differenza in nessuno dei 9 passi.

## 4. Che cosa cambia in ogni migrazione

| Migrazione | Che cosa cambia (righe) | Palazzi, diario, spunte | `partite.db` |
|---|---|---|---|
| **139** note storiche | `nota_storica` +1, `nota_storica_legame` +2 | nessuno | nessuno |
| **140** Aree dei luoghi | `luogo.area_chiave` scritta su 21 luoghi (23 restano senza) | nessuno | nessuno |
| **141** registro Tanaka | due tabelle nuove vuote (`decisione_tanaka`, `…_ripristino`) | nessuno | nessuno |
| **142** Tanaka Royal | `articolo` +8 (nuove offerte) e 20 cambiate (10 nascoste, 9 nomi, 2 prezzi, 10 cataloghi); `decisione_tanaka` +1 con la fotografia di prima; `proposta_abbinamento` 28 `da-approvare`→`confermata` | nessuno | nessuno: nessun acquisto di Tanaka (gli acquisti della partita sono 7, di altri negozi) |
| **143** residui L5 | `luogo` +11 (2 distributori, 9 servizi del Covo); `negozio` 3 sedi; **`spillo` 22 pin** con riferimento cambiato (272–275, 349, 359, 375–383, 1564–1566, 1584, 1641, 1769… e il 386 da `negozio` a `dialogo`); `negozio_luogo_extra` +1; `negozio_sede_spillo` +1; `dati_guida` +1 (registro: 36 applicate, 1 saltata) | **0 dei 22 pin è in un Palazzo**: tutti sulle planimetrie del mondo | nessuno |
| **144** abbinamenti | `articolo` +6 (baratti del Gachapon) e 7 cambiati (3 nascosti, 3 cataloghi, 2 costi del Sakai, 1 condizione di pioggia sul Sandwich inzuppato); `catalogo_oggetto` −3 (fusioni) e `cestino` +3; **`voce_oggetto` +26**; `ricompensa_oggetto` +12; `proposta_abbinamento` 54 cambiate (40 `confermata`, 14 `scartata`) | `voce_oggetto` aggiunge collegamenti a voci di Kamoshida (3) e Madarame (13): vedi §6. Voci, pin, legami, stati identici | nessuno |
| **145** pin di Ann nel Cestino | `spillo` −1 (pin 1753, Confidente Ann, planimetria Edificio principale 2P), `cestino` +1, `dati_guida` +1 | nessuno: il pin è nel mondo | nessuno |
| **146** correzioni Royal | `articolo` 2 (effetto e nota di Frusta decorativa ed Elisir del padre); `nota_storica` +1 e `nota_storica_legame` +10; `dati_guida` +1 | nessuno | nessuno |
| **147** Aojiru | **non applicata**: la versione resta 146 | — | — |
| utente **031–033** (fuori dall'incarico) | `fortuna_partita` nuova, 0 righe | — | solo una tabella nuova vuota; **nessuna riga di dato cambia** |

## 5. Idempotenza, integrità, errori

- **Nessun errore e nessun avviso** in tutti i passi. Il Cestino finisce con 2 mappe, 3 oggetti, 2 pin e 1 voce (la voce di Madarame già lì dal 20/10, non toccata).
- **Idempotenza**: rieseguite una seconda volta, le migrazioni 139–146 non cambiano **nessuna tabella** di nessuno dei due file.
- **Integrità**: `integrity_check` ok su `gioco.db` e `partite.db`; **0** violazioni di chiavi esterne in entrambi. Versioni finali: gioco 146, partite 33.

## 6. Da sapere

1. **La 144 aggiunge `voce_oggetto` a voci dei due Palazzi** (Madarame 13, Kamoshida 3, altre 10 negli altri Palazzi). Sono righe nuove di contenuto (che oggetto contiene un forziere), non modificano voce, pin, legami né stati,
   e l'impronta del lavoro resta identica. Ma toccano voci dell'utente in senso additivo: la migrazione si appoggia al piano approvato il 23/10 (intestazione della 144), mentre la regola scritta in L7 era «nessuna
   scrittura sul lavoro dell'utente senza il sì». Se il sì dell'utente è quello del piano, va bene; altrimenti è un punto da confermare.
   Fra le 26 c'è anche `madarame-06-sala-del-tesoro-atrio/4` (Carta abilità Media) con **quantità 1**: la voce dice solo «Carta abilità Media.» e il criterio di `L7-CARTA-MEDIA` vieta una quantità non attestata (già segnalato).
2. **La 143 salta un pin**: `339 → negozio:distributore-shujin-cancello-1`, per «destinazione assente o nascosta»: nella base quel negozio è nascosto. Il resto (36 voci) è applicato. Il cancello della Shujin resta con il pin 339 senza riferimento
   e il piano dei residui L5 (339 sul listino Second Maid) non è completato: serve una decisione sul negozio nascosto.
3. **La 147 non è registrata**: il file `147_aojiru_effetti_consolidati.ts` c'è, ma `server/db/migrations/index.ts` non la importa, quindi non gira. Se è voluta, va registrata; l'ho solo letta.
4. **La 144 gira solo se la connessione è quella condivisa** (`getDb() === db`): altrimenti salta tutto con un avviso e non fa nulla. All'avvio del server lo è; in un'esecuzione con una connessione diversa (per esempio uno strumento esterno) non si applica.
5. **Mothman e Veste nera del Sakai**: le migrazioni non scrivono la soglia di Mothman nel nuovo articolo del Gachapon né correggono il risultato del Sakai per Veste nera e La fattorizzazione (`L7/riscontro-da-fare-2026-10-23.md` §8).

## 7. Limiti

- Copia del 23/10 alle 19:35Z: lavoro dell'utente su p5s successivo non è coperto. Nessuna prova nel browser né con le partite di prova: questa verifica è solo sui dati.
- Non giudico la correttezza semantica delle scelte (abbinamenti, prezzi, Aree): è nei riscontri di L5 e L7.
- Le migrazioni 142–146 sono quelle del repository `newreview` all'ultimo commit visibile (`93e71b7c`); se cambiano, la verifica va rifatta.
