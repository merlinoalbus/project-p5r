# Prova della catena di migrazioni per il rilascio (24 ottobre)

PM, sola lettura sul repository. Commit: `e2dde856`.

**Come è fatta la prova**
- **Dati:** copia dei dati di p5s del 23/10 alle 19:35Z, schema 138 di gioco e 30 utente, copiata in una cartella di scratch.
- **Codice:** il runner vero (`runMigrations` di `server/db/migrationRunner.ts`), lanciato da uno script di scratch con `tsx`.
- **Cosa non è stato toccato:** né la sorgente né p5s.

## Esito

**Esecuzione**
- **Versioni:** da 138/30 a **181/41**, senza nessun errore.
- **Tabelle:** da 157 a 176. Ne cambiano 68: 19 nuove, 7 tolte e archiviate da L11, le altre modificate.
- **Integrità:** `foreign_key_check` vuoto su `main` e su `utente`; `integrity_check` ok su entrambi.
- **Seconda esecuzione:** nessuna tabella cambia, quindi la catena è idempotente.

**Lavoro da preservare, impronte identiche prima e dopo**

| Dato | Righe | Impronta |
|---|---|---|
| Diario validato (04-01…06-01: uid, data, fascia, ordine, testo) | 255 | `09dad66e983602de` |
| Spunte | 342 | `55e1d2313a6e08f3` |
| Eventi della partita (id, partita, tipo, titolo) | 1326 | `2ab6b66eadda88e9` |
| Punti di Kamoshida | 169 | 0 righe diverse |
| Punti di Madarame | 226 | 0 righe diverse |

**Pin del mondo:** cambiano solo i 24 approvati dall'utente il 23/10 (residui di L5 e pin di Ann):
- distributori di Akihabara: 272–275;
- distributori di Shinjuku: 1564–1566;
- distributore di Kichijoji: 359;
- servizi del Covo: 375–383;
- Jose: 386, che diventa `dialogo`;
- pin dei listini: 339, 1584, 1769;
- Chiesa e Sakura: 349, 1641;
- Ann al 2° piano: 1753, che va nel Cestino.

**Dati della partita:** cambiano solo `da_applicare` ed `evento_partita`. Il riallineamento dichiarato delle proposte dell'Aojiru resta a 5 proposte, di cui una chiusa come «già nel saldo». La colonna `voce_uid` (utente 039) parte vuota per gli eventi storici. Le tabelle nuove della partita nascono vuote.

**Limiti**
- La copia è del 23/10 alle 19:35Z e non contiene il lavoro fatto dopo su p5s.
- L'esecuzione HTTP non è stata osservata.

## Seconda prova, sul commit `9ef4514c` (undicesimo giro)

Stessa copia, ripresa intatta dalla sorgente in una cartella di scratch nuova, con lo stesso script e il runner del commit, letto dalla copia ferma.

**Esecuzione**
- **Versioni:** da 138/30 a **187/42**, senza nessun errore.
- **Tabelle:** ne cambiano 71.
- **Integrità:** `foreign_key_check` vuoto su `main` e su `utente`; `integrity_check` ok su entrambi.
- **Seconda esecuzione:** nessuna tabella cambia.

**Lavoro da preservare:** stesse impronte della prima prova.
- diario validato: 255 righe, `09dad66e983602de`;
- spunte: 342 righe, `55e1d2313a6e08f3`;
- eventi: 1326 righe, `2ab6b66eadda88e9`.

**Migrazioni nuove, dai loro registri**

| Migrazione | Cosa cambia |
|---|---|
| 182 | 3 eventi inseriti e 2 collegamenti, più quelli spostati |
| 183 | 6 scadenze anticipate; Madarame con una sola scadenza |
| 184 | nessun conteggio nel registro |
| 185 | Jazz Jin, sede della lettura, 3 effetti e fascino del Big Bang Burger |
| 186 | 2590 affinità di 259 Persona (27 forme del gruppo) copiate come valori della guida |
| 187 | nessun conteggio nel registro |
| utente 042 | `utente.spillo_partita` passa da 797 a 717 righe (80 righe legacy dei pin condivisi) |

**Dati della partita:** oltre a quanto detto nella prima prova, cambia soltanto `spillo_partita`.

**Controlli sulla copia ferma:** typecheck = 0, lint = 0, build = 0.

## Terza prova, sul commit `11fd0134` (dodicesimo giro)

Stessa copia di p5s del 23/10 alle 19:35Z, ripresa intatta, con lo stesso script e il runner letto da una copia ferma del commit.

**Esecuzione**
- **Versioni:** da 138/30 a **227/44**, senza nessun errore.
- **Tabelle:** ne cambiano 98.
- **Integrità:** `foreign_key_check` vuoto su `main` e su `utente`; `integrity_check` ok.
- **Seconda esecuzione:** nessuna tabella cambia.

**Lavoro da preservare:** impronte identiche a prima.
- diario validato: 255 righe, `09dad66e983602de`;
- spunte: 342 righe, `55e1d2313a6e08f3`;
- eventi: 1326 righe, `2ab6b66eadda88e9`.

**Partita:** oltre a quanto già noto (`da_applicare`, `evento_partita`, `spillo_partita` 797 → 717), tolte due tabelle.
- `lettura_partita` (14 righe, utente 043): erano tutte già al completo nell'avanzamento, quindi non si perde nulla.
- `requisito_partita` (vuota, utente 044).

**Lettori:** sulla copia migrata alla 226 un agente ha preparato tutte le 2137 query SQL fisse del server (commit 6fe97f33). Nessuna legge colonne o tabelle tolte.

**F11, impronta completa del diario validato** (richiesta del dodicesimo giro)
- Confronto fra la copia originale e quella migrata alla 227.
- `voce_giornata` dal 04-01 al 06-01: 255 righe in entrambe.
- Colonne: 20 prima e 20 dopo, nessuna aggiunta né tolta.
- Impronta su tutte le colonne: `05c8b52eeab0cff0` prima e dopo.
- Celle diverse, voce per voce e colonna per colonna: 0.

**F7, eventi meteo tolti dalla 211.** Nell'archivio `archivio-eventi-calendario-l11` i doppioni sono 2:
- l'evento 158 del 01-26, «Allerta "ondata di gelo" (26-27 gennaio)»;
- l'evento 160 del 01-27, il secondo giorno.

Per gli stessi giorni `allerta_meteo` ha l'allerta `ondata-di-gelo` sia di giorno sia di sera, con gli stessi effetti: Congelamento, frequenza e ricompense come con il sereno. I due eventi ripetevano quindi l'allerta. Nessuno dei due aveva collegamenti a voci.
