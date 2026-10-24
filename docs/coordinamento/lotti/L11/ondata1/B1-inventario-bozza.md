# L11 · B1 · Bozza dell'inventario dei lettori (livello tabella, colonne in esame, blocchi `dati_guida`)

Allegato di `B1-B2-B7-B10.md`. Analisi in sola lettura, 2026-10-24. **È una bozza di baseline**: l'inventario vero (`lotti/L11/inventario-lettori.md`) si rigenera a L10 consegnato
(modifiche.md §1.1) e questa bozza serve a fissare formato, regole e primi esiti. Nessuna riga di questa bozza autorizza un `DROP`: le decisioni «elimina» sono proposte.

## 0. Base della misura e come leggere le cifre

- **Dati**: copia di p5s portata a gioco 146 (`sim-142b`: gioco 101 tabelle / 808 colonne, partite 60 tabelle / 446 colonne; `user_version` utente della copia 30). Righe misurate lì.
- **Codice**: worktree `newreview` al 24/10, che **nel frattempo è avanzato**: migrazioni gioco registrate fino alla 169 e utente fino alla 040 (a inizio giornata erano 153 e 036), con lavoro di altre
  sessioni non committato. Le tabelle create dopo la copia (lette dai file di migrazione, non misurate) sono elencate in §3.
- **Lettori** (colonna `L`) = numero di file di `server/` e `shared/` **non test e non di migrazione** (esclusi `server/db/migrations/`, `server/db/migrazioniUtente/`) con `FROM <t>` o `JOIN <t>` nel testo SQL
  (anche con prefisso `main.`/`utente.`). **Scrittori** (`S`) = file con `INSERT [OR …] INTO`, `REPLACE INTO`, `UPDATE` o `DELETE FROM <t>`. **Citazioni** (`C`) = file che nominano la tabella tra apici (elenchi,
  `RIFERIMENTI_PARTITE`, `ETICHETTE`, `tabelleDi`…): **non contano come lettori**. Per `src/` le tabelle non compaiono (il FE legge DTO): per le colonne il FE si cerca per nome camelCase (§2).
- **Limite noto**: il grep non vede il SQL costruito a runtime (`FROM ${tabella}`) né i `SELECT *`. Regola: ogni tabella con `L = 0` e `C > 0` va verificata a mano. L'ho fatto per quelle sotto: sono marcate «verificata a mano».
- Decisioni: `tieni` · `elimina` (con voce di piano) · `archivio` (motivo obbligatorio) · `verifica` (non ammessa nella consegna finale: l'inventario vero non deve averne).

## 1. Riepilogo

| | gioco | partite | totale |
|---|---:|---:|---:|
| tabelle misurate | 101 | 60 | 161 |
| colonne misurate | 808 | 446 | 1.254 |
| tabelle con `L = 0` (grep per nome) | 6 | 2 | 8 |
| di cui davvero senza lettori runtime dopo la verifica a mano | 3 (`audit_aojiru_136`, `audit_pesca_138`, `organizzazione_mappa_esito`) | 2 (`lettura_partita`, `requisito_partita`) | 5 |
| di cui con lettura dinamica (il grep per nome non la vede: **si tengono**) | 3 (`confidente_requisito_guida`, `decisione_tanaka`, `decisione_tanaka_ripristino`) | 0 | 3 |
| proposte «elimina» (tabella intera) | `giorno_calendario`, `giorno_percorso` (dopo i lettori su `giorno`), `guida_mappa`, `marcatore_luogo`, `marcatore_mappa` (decisione §8.7), `pianta_area`, `organizzazione_mappa_esito`, `mappa_entita` (le 131 righe `area`; le 4 non-area: decisione) | `lettura_partita`, `requisito_partita` | 10 |
| proposte «archivio» | `audit_aojiru_136`, `audit_pesca_138`, blocchi `dati_guida` di §4 | `acquisto_legacy_*` (4, già immutabili per codice) | — |
| `verifica` | `oggetto` (223), `proposta_abbinamento` (87), `pianta_quartiere` (22), `evento_calendario` (173) | — | 4 |

**Due scoperte rispetto alla preparazione del 23/10** (da riportare nell'inventario vero):
1. `utente.lettura_partita` **non ha più lettori né scrittori runtime**: `attivitaService.ts:188` («letto» calcolato dall'avanzamento) e `:403` («la tabella `lettura_partita` non si scrive più»), `motoreDiario.ts:187,210`
   (la fotografia non la usa più). Restano solo il DDL (`server/db/schemaUtente.ts:52`) e due righe di `RIFERIMENTI_PARTITE` (`pacchettoGiocoService.ts:85-86`). R11-02/13 non aspetta più L10 per questa tabella.
2. `utente.requisito_partita` ha solo `DELETE` di pulizia (`requisitiConfidentiService.ts:50,116,131`), nessuna lettura (`semaforiService.ts:68`: «non più letto») e nessuna `INSERT`: elimina dopo aver tolto quei tre `DELETE`.

## 2. Tabelle

Legenda colonne: `L/S/C` come sopra · `sost.` = lotto che ha sostituito o sostituirà la fonte. Dove non scrivo niente in `sost.` la tabella è dato vivo e la decisione è `tieni`.

### 2.1 Dati di gioco (`gioco.db`) — 101 tabelle

| tabella | righe | col | L/S/C | sost. | decisione | nota |
|---|---:|---:|---|---|---|---|
| allerta_meteo | 74 | 5 | 4/0/3 | | tieni | |
| arcana | 24 | 3 | 3/0/16 | | tieni | |
| area | 140 | 13 | 14/3/29 | L2 | tieni | |
| area_dedalo | 95 | 6 | 5/1/4 | | tieni | |
| articolo | 650 | 27 | 24/3/32 | L6/L7 | tieni | colonne vecchie in §2.3 (`condizione`, `nome_it`, `prezzo`…): R11-02/10 |
| attivita | 30 | 33 | 23/1/40 | L5/L6/L9 | tieni | colonne `luogo`, `sblocco`: R11-02/9, §2.3 |
| audit_aojiru_136 | 1 | 9 | 0/0/0 | L7 | archivio | traccia dell'audit della migrazione 136; storia delle bonifiche (BON-06: «restano nel DB come storia»); eliminabile solo su decisione dell'utente |
| audit_pesca_138 | 1 | 10 | 0/0/0 | L7 | archivio | idem, migrazione 138 |
| catalogo_oggetto | 1298 | 15 | 15/2/5 | L7 | tieni | canone degli oggetti |
| cestino | 8 | 11 | 5/1/5 | | tieni | ricostruita dalla 160 |
| confidente | 23 | 4 | 23/0/24 | | tieni | |
| confidente_abilita | 159 | 5 | 1/0/0 | | tieni | |
| confidente_dialogo | 223 | 7 | 1/0/0 | | tieni | |
| confidente_disponibilita | 23 | 9 | 3/1/0 | L9 | tieni | colonne `luogo`, `sblocco_data`, `sblocco_requisiti` in §2.3 (R11-02/9); la 163 ha strutturato la disponibilità |
| confidente_dote_incontro | 39 | 3 | 2/1/2 | | tieni | |
| confidente_invito | 6 | 11 | 2/0/8 | | tieni | |
| confidente_rango | 162 | 3 | 1/0/0 | L9 | tieni | la 161 aggiunge `modo`, `fonte` |
| confidente_regalo | 144 | 10 | 8/3/0 | | tieni | |
| confidente_requisito | 177 | 6 | 4/1/4 | | tieni | |
| confidente_requisito_guida | 177 | 6 | 0/0/2 | | tieni | **verificata a mano**: copia della guida per «Ripristina» (migrazione 119), letta con tabella parametrica (`requisitiConfidentiService.ts:64-68`, `condizioni/importazione.ts:73`) |
| copia_pezzo | 42 | 12 | 1/2/3 | | tieni | |
| cruciverba | 38 | 11 | 2/0/12 | | tieni | |
| dati_guida | 30 | 2 | 7/4/7 | | tieni | blocchi in §4 |
| decisione_tanaka | 1 | 9 | 0/0/1 | | tieni | **verificata a mano**: letta con schema parametrico (`tanakaStatoListino.ts:41`) per l'integrità del registro e l'import |
| decisione_tanaka_ripristino | 0 | 4 | 0/0/1 | | tieni | **verificata a mano**: `tanakaStatoListino.ts:43`; vuota ma parte del registro |
| dlc_set | 13 | 2 | 1/0/0 | | tieni | |
| dlc_set_persona | 25 | 2 | 2/0/0 | | tieni | |
| domanda | 78 | 15 | 4/0/12 | L9 | tieni | |
| dote_sociale | 5 | 3 | 5/0/1 | | tieni | |
| dote_sociale_rango | 25 | 4 | 1/0/0 | | tieni | R11-15/12 |
| dungeon | 10 | 18 | 18/2/20 | | tieni | |
| dungeon_area | 100 | 5 | 22/1/10 | | tieni | |
| dungeon_atterraggio | 3 | 8 | 2/2/6 | | tieni | |
| eredita_matrice | 144 | 3 | 2/0/1 | | tieni | |
| esame | 4 | 7 | 3/0/6 | L9 | tieni | colonna `domande_json` in §2.3 |
| esame_premi | 1 | 2 | 1/0/0 | | tieni | |
| evento_calendario | 173 | 7 | 1/0/0 | L9 | verifica | R11-02/12 e decisione §8.4. Indizio nuovo: la migrazione 164 crea `evento_calendario_voce` (collegamento evento↔voce): fa pensare che gli eventi **restano** (collegati per chiave) → `tieni`. Da confermare con L9 |
| film | 30 | 21 | 11/0/34 | | tieni | |
| film_posizione | 42 | 6 | 1/0/1 | | tieni | |
| fusione_arcana | 273 | 3 | 2/0/0 | | tieni | |
| fusione_speciale | 24 | 1 | 1/0/0 | | tieni | |
| fusione_speciale_ingrediente | 94 | 3 | 2/0/0 | | tieni | |
| giorno_calendario | 346 | 6 | 4/0/0 | L9 (168 `giorno`) | elimina | R11-02/11, **dopo** il blocco F di L9 (lettori: `acquistiService`, `calendarioService`, `disponibilitaService`, … portati a `giorno`) |
| giorno_percorso | 346 | 11 | 7/0/0 | L9 (168 `giorno`) | elimina | R11-02/11; la 168 dichiara che `azioni_json` (299 righe) è copia storica e **non si porta**: va detto nel motivo |
| guida_alias | 92 | 2 | 3/2/3 | | tieni | viva (`dungeonService`, `contenutiGuidaService`) |
| guida_mappa | 92 | 4 | 2/2/3 | L3 | elimina | R11-02/4; unico lettore `contenutiGuidaService.ts:67-71`; scrittori solo 027/042 (`organizzazioneMappe.ts`, `sincronizzaMappe.ts`) → dopo il congelamento |
| immagine | 808 | 9 | 12/3/10 | | tieni | |
| immagine_miniatura | 152 | 9 | 1/1/5 | | tieni | cache scritta anche dalle GET con `?l=` |
| infiltrazione_area | 105 | 5 | 5/4/9 | L3 | tieni | |
| libro | 46 | 22 | 11/0/34 | | tieni | |
| libro_posizione | 48 | 5 | 1/0/1 | | tieni | |
| luogo | 109 | 26 | 26/2/43 | L5 | tieni | colonne vecchie in §2.3 |
| mappa | 316 | 20 | 25/8/32 | L2/L3 | tieni | colonne `entita_tipo/entita_chiave` in §2.3 (R11-02/1) |
| mappa_alias | 685 | 2 | 3/3/4 | | tieni | derivata (`DERIVATE` del cestino) |
| mappa_entita | 135 | 4 | 4/3/9 | L2/L3 | elimina (parziale) | R11-02/2: 131 righe `area` coperte da `infiltrazione_area`; 3 `luogo` + 1 `quartiere` → decisione |
| mappa_percorso | 316 | 3 | 2/2/5 | | tieni | derivata |
| mappa_presentazione | 226 | 3 | 2/1/1 | L2 | tieni | colonna `gruppo_immagini_json` in §2.3 (R11-02/3); `contesti_json` resta |
| marcatore_luogo | 47 | 5 | 1/1/2 | L5 | elimina | R11-02/6; nessun lettore runtime (`luoghiService.ts:164` ha `marcatore: null`); scrittori: DELETE in `luoghiScritture.ts` |
| marcatore_mappa | 149 | 5 | 3/1/3 | L4 | elimina | R11-02/5, **dopo decisione §8.7**; lettori `dungeonService.ts:129-131`, `contenutiGuidaService.ts:89-100`, entrambi senza consumatori FE |
| negozio | 62 | 23 | 26/1/30 | L5 | tieni | colonne vecchie in §2.3 |
| negozio_luogo_extra | 4 | 2 | 3/0/2 | | tieni | |
| negozio_sede_spillo | 4 | 3 | 3/0/6 | | tieni | |
| nota_storica | 2 | 6 | 1/1/3 | | tieni | |
| nota_storica_legame | 12 | 3 | 1/0/1 | | tieni | |
| oggetto | 223 | 6 | 2/0/12 | L7 | verifica | compendio degli oggetti (traduzione ambito `oggetto` 223); lettori `catalogoOggettiLetture.ts`, `compendioService.ts`. Verificare con L7 se è ancora fonte o è già assorbita da `catalogo_oggetto` |
| operazione_effetti_voce | 10 | 6 | 1/1/0 | | tieni | |
| organizzazione_mappa_esito | 0 | 2 | 0/1/1 | L3 | elimina | vuota; l'unico scrittore è `organizzazioneMappe.ts:25,40` (che dipende da `guida_mappa`): sparisce insieme (B9) |
| persona | 232 | 23 | 19/0/28 | L8 | tieni | ricostruita dalla 169 |
| persona_affinita | 2320 | 3 | 2/0/1 | L8 | tieni | |
| persona_area_dedalo | 827 | 2 | 1/1/2 | | tieni | |
| persona_skill | 1614 | 3 | 4/0/1 | L8 | tieni | ricostruita dalla 169 |
| pezzo_mappa | 24 | 10 | 2/1/2 | | tieni | |
| pianta_area | 84 | 11 | 1/1/1 | L2/L5 | elimina | R11-02/7; solo `dungeonService.ts:748-751` (pulizia alla cancellazione di un'area) |
| pianta_quartiere | 22 | 8 | 1/0/1 | L2 | verifica | R11-02/8, decisione §8.5: viva (`cittaService.ts:123,149`, `QuartierePage.tsx`) |
| proposta_abbinamento | 87 | 12 | 4/4/2 | L7 | verifica | BON-07 ha tolto il pannello degli abbinamenti, ma restano 4 file lettori e 4 scrittori (`catalogoOggettiFusione`, `…Proposte`, `…Riferimenti`): stabilire se i dati sono ancora fonte (e di cosa) o archivio |
| proposta_effetto_voce | 20 | 10 | 1/1/0 | L10 | tieni | sorgente di «Da rivedere» (decisione §8.1) |
| proposta_infiltrazione_voce | 102 | 6 | 1/1/2 | L3 | tieni | idem |
| punto_interesse | 960 | 13 | 21/1/9 | | tieni | |
| quartiere | 24 | 11 | 19/1/31 | L6 | tieni | colonne `sblocco`, `sblocco_data` in §2.3 |
| quartiere_ingresso | 2 | 6 | 5/3/1 | | tieni | |
| regola_pesca | 1 | 8 | 2/1/0 | | tieni | |
| ricetta_materiale | 23 | 3 | 3/0/2 | | tieni | |
| richiesta | 33 | 16 | 11/2/24 | | tieni | |
| ricompensa_oggetto | 171 | 6 | 6/1/2 | | tieni | |
| settimana_guida | 42 | 6 | 1/0/0 | L9 | tieni | verificare con L9 se `giorno.settimana` la assorbe |
| skill | 525 | 9 | 11/0/11 | | tieni | |
| skill_fonte_esecuzione | 114 | 2 | 1/0/0 | | tieni | |
| spillo | 1911 | 20 | 29/10/24 | L4 | tieni | **righe** con `mappa_chiave` NULL (154, `ruolo_guida='punto'`) = schede senza mappa: voce a parte (dati.md §2), non della tabella |
| spillo_destinazione | 223 | 6 | 8/3/8 | | tieni | |
| spillo_immagine | 1 | 7 | 5/2/4 | | tieni | |
| spillo_voce | 542 | 2 | 11/2/10 | | tieni | |
| tesoro | 9 | 2 | 2/0/5 | | tieni | |
| tesoro_modificatore | 216 | 3 | 2/0/0 | | tieni | |
| traduzione | 2056 | 6 | 1/1/6 | L8 | tieni | righe degli ambiti `elementoAffinita`/`elementoSkill`: R11-02b/4 |
| trasformazione_oggetto | 8 | 5 | 1/1/1 | | tieni | |
| trofeo | 53 | 11 | 1/0/4 | | tieni | R11-15/10 |
| voce_effetto | 290 | 8 | 5/1/3 | L10 | tieni | |
| voce_effetto_transizione | 998 | 6 | 2/1/0 | | tieni | |
| voce_giornata | 998 | 20 | 11/2/8 | L10 | tieni | colonna `produce_json` in §2.3 |
| voce_infiltrazione | 0 | 3 | 2/1/2 | L3 | tieni | vuota ma scritta da `giornataService.ts` |
| voce_oggetto | 153 | 5 | 3/0/2 | | tieni | |

### 2.2 Dati delle partite (`partite.db`) — 60 tabelle

| tabella | righe | col | L/S/C | sost. | decisione | nota |
|---|---:|---:|---|---|---|---|
| acquisto_legacy_associazione | 7 | 3 | 1/1/1 | | archivio | fotografia legacy immutabile per codice (`ARCHIVI_LEGACY_IMMUTABILI`, `acquistiLegacy.ts`; il cestino la esclude, `cestinoService.ts:72`) |
| acquisto_legacy_continuita | 1 | 6 | 1/1/1 | | archivio | idem |
| acquisto_legacy_raccordo | 0 | 4 | 1/1/1 | | archivio | idem |
| acquisto_legacy_valutazione | 7 | 13 | 1/1/1 | | archivio | idem |
| acquisto_operazione | 0 | 6 | 3/1/2 | | tieni | vuota, scritta da `acquistiService.ts` |
| acquisto_partita | 7 | 3 | 7/3/4 | | tieni | |
| acquisto_provenienza | 0 | 10 | 6/2/2 | | tieni | |
| acquisto_registrato | 0 | 12 | 6/1/3 | | tieni | |
| attivita_svolta_partita | 8 | 4 | 4/1/4 | | tieni | |
| beneficio_ciclo | 0 | 9 | 1/1/3 | | tieni | |
| cestino_partite | 0 | 10 | 4/1/3 | | tieni | |
| ciclo_salvato | 0 | 11 | 1/1/2 | | tieni | vuota con scrittore |
| compendio_partita | 53 | 19 | 6/1/6 | | tieni | |
| confidente_partita | 46 | 7 | 3/1/2 | | tieni | |
| cruciverba_partita | 3 | 3 | 2/1/2 | | tieni | |
| da_applicare | 5 | 24 | 6/2/4 | | tieni | |
| divergenza_partita | 0 | 4 | 2/3/6 | L4 | tieni | sorgente di «Da rivedere» (§8.1) |
| domanda_partita | 12 | 3 | 2/1/2 | | tieni | |
| dote_sociale_partita | 10 | 4 | 2/1/3 | | tieni | |
| effetto_applicato | 0 | 15 | 6/1/4 | | tieni | |
| effetto_lettura_partita | 20 | 8 | 2/1/5 | | tieni | è la tabella viva delle letture |
| evento_partita | 1326 | 8 | 2/4/4 | | tieni | |
| evento_storia_partita | 7 | 4 | 3/1/1 | | tieni | |
| incontro_confidente_partita | 52 | 11 | 2/1/3 | | tieni | |
| invito_partita | 0 | 4 | 1/1/2 | | tieni | |
| lettura_partita | 14 | 4 | 0/0/4 | L10 (R10-20) | **elimina** | **nessun lettore né scrittore runtime** (vedi §1). La migrazione utente deve ricostruire il progresso solo se non già fatto (la utente 037 «letture complete dall'avanzamento» esiste già). Togliere anche `schemaUtente.ts:52` (DDL storico: commento) e le due righe di `RIFERIMENTI_PARTITE` |
| membro_squadra_partita | 4 | 6 | 2/2/1 | | tieni | |
| meteo_partita | 1 | 5 | 1/1/2 | | tieni | |
| movimento_punti_pesca | 0 | 11 | 2/2/2 | | tieni | |
| movimento_yen | 0 | 10 | 1/1/3 | | tieni | |
| obiettivo_partita | 0 | 11 | 2/1/2 | | tieni | |
| partita | 2 | 14 | 27/27/20 | | tieni | |
| persona_posseduta | 7 | 26 | 9/2/4 | | tieni | |
| persona_posseduta_skill | 34 | 3 | 6/2/2 | | tieni | |
| pesca_acquisto_esca | 0 | 8 | 3/1/2 | | tieni | |
| pesca_cattura | 0 | 6 | 2/1/0 | | tieni | |
| pesca_fatto_fonte | 0 | 12 | 1/1/2 | | tieni | |
| pesca_operazione | 0 | 6 | 5/2/3 | | tieni | |
| pesca_osservazione | 0 | 7 | 2/1/0 | | tieni | |
| pesca_provenienza | 0 | 10 | 1/2/3 | | tieni | |
| pesca_quota_storica | 0 | 6 | 2/1/2 | | tieni | |
| pesca_sessione | 0 | 12 | 4/2/3 | | tieni | |
| piano_salvato | 0 | 12 | 2/1/2 | | tieni | vuota con scrittore |
| progresso_film_partita | 3 | 4 | 4/1/3 | | tieni | |
| progresso_libro_partita | 11 | 4 | 4/1/3 | | tieni | |
| progresso_videogioco_partita | 0 | 4 | 5/1/4 | | tieni | |
| proposta_operazione | 0 | 5 | 1/1/3 | | tieni | |
| punti_negozio_partita | 0 | 4 | 3/2/2 | | tieni | |
| punti_pesca_partita | 0 | 3 | 4/1/2 | | tieni | |
| punto_partita | 564 | 5 | 7/4/11 | L4 | tieni | colonna `automatico` (564 righe, tutte 0, 11 file la nominano ma alcuni sono altri `automatico`) → §2.3 |
| regalo_partita | 0 | 5 | 2/4/4 | | tieni | |
| requisito_partita | 0 | 6 | 0/1/3 | L6 | **elimina** | solo `DELETE` (§1); togliere i 3 `DELETE`, il commento di `semaforiService.ts:68`, il DDL (commento) e `RIFERIMENTI_PARTITE` (riga `confidente_chiave`) |
| richiesta_partita | 1 | 4 | 5/1/2 | | tieni | |
| sessione_videogioco_partita | 0 | 3 | 3/1/3 | | tieni | |
| spillo_partita | 797 | 4 | 3/3/11 | L4 | tieni | **righe**: 40 di p1 coincidono con `spillo_partita_infiltrazione` (R11-02b/1), solo dopo il confronto p1/p2 |
| spillo_partita_infiltrazione | 90 | 5 | 1/2/5 | L4 | tieni | |
| spunta_voce_partita | 342 | 4 | 8/1/5 | | tieni | |
| timbri_dedalo_partita | 0 | 4 | 1/2/4 | | tieni | |
| trofeo_partita | 0 | 3 | 1/1/2 | | tieni | scritta da `completamentoService.ts` |
| turno_partita | 11 | 5 | 5/2/6 | | tieni | **non è un doppione**: la pesca la usa (`allocazioniTurniPesca.ts`) |

### 2.3 Colonne in esame (solo le fonti vecchie di R11-02 e R11-02b)

`non vuote` = righe con valore diverso da NULL, '', '[]', '{}', '0' sulla copia a 146. `BE` = file `server/` e `shared/` non test/migrazione che nominano la colonna in snake_case (SQL); `FE` = file
`src/` che la nominano in snake o camelCase. Dove il nome è comune (marcato **rumore**) il conteggio sovrastima: la decisione richiede lettura a mano del lettore.

| colonna | non vuote / righe | BE | FE | scrittori (verificati) | voce | decisione proposta |
|---|---|---|---|---|---|---|
| mappa.entita_tipo, entita_chiave | 139 / 316 (105 area, 24 quartiere, 10 dungeon) | 15 e 14 file (`casaMappa`, `luoghiService`, `areeService`, `mappeService`, `accessoMondoService`, `contenutiGuidaService`…) | 0 (il FE usa `MappaRiassuntoDto.entita`: `MappaPage.tsx`, `EditorMappaPage.tsx`) | `mappeService` (editor), regole d'avvio | R11-02/1 | elimina **dopo** il porting di quartiere/dungeon su `area_chiave`/`dungeon` (B9) |
| mappa_entita (tutte) | 135 | v. §2.1 | | `mappeService.ts`, `luoghiScritture.ts`, `collegaLuoghiAllePlanimetrie` (avvio) | R11-02/2 | v. §2.1 |
| mappa_presentazione.gruppo_immagini_json | 219 / 226 | `mappeService`, `areeService` | `etichettaVersione`, `gruppiPlanimetrie`, `presentazioneMappa`, `MappaPage`, `AlberoLuoghi`, `ImmaginiLuogo` | `mappeService` | R11-02/3 | elimina dopo B5 (l'albero sostituisce `AlberoLuoghi`) |
| guida_mappa.nome / note / metadata_json | 92 / 0 / 0 | `contenutiGuidaService` (JOIN), `organizzazioneMappe`, `sincronizzaMappe` | 0 | 027/042 | R11-02/4 | elimina con la tabella |
| pianta_area.copre_aree_json / alternative_json | 1 / 2 su 84 | `dungeonService` / 0 | 0 | `dungeonService.ts:748-751` | R11-02/7 | con la tabella |
| luogo.quando | 41 / 109 | **rumore** (89 file nominano «quando»); lettore reale `luoghiService.ts:154-157` (schema di prima) | **rumore** | ModuloLuogo (verificare) | R11-02/9 | elimina se copia esatta di `orari_json`/`condizioni_json` (R6-18) |
| luogo.giorni / giorni_json | 10 / 9 | `giorni_json`: 14 file (anche `confidente_disponibilita.giorni_json`: **rumore parziale**) | `ModuloLuogo`, `definizioni`, `EditorDisponibilita` | idem | R11-02b/5 | idem |
| luogo.sblocco | 39 | **rumore** (36 file) | 22 file (`ModuloLuogo`, `QuartierePage.tsx:117` lo mostra) | ModuloLuogo | R11-02/9 | **tieni come nota** (a schermo, §6.3 della preparazione) salvo copia esatta |
| luogo.negozio | 42 | **rumore** | **rumore** | | R11-02/10 | dichiarata morta in `cittaService.ts:5-8`: elimina, dopo lettura a mano |
| luogo.attivita_json | 48 | 1 file (`cittaService.ts`, commento) | 0 | | R11-02/10 | elimina (provata morta) |
| luogo.orari_json | 40 | 15 file | `ModuloLuogo`, `definizioni` | `luoghiScritture` | R11-02b/5 | **tieni** (è la fonte nuova) |
| negozio.luogo (frase) / luogo_chiave (= quartiere) | 61 / 61 | **rumore** / 15 file | `ModuloNegozio`, `NegozioPage`, `NegoziPage` | | R11-02/10 | `luogo_chiave` è letta (`luoghiService.ts:109`): non toccare prima del porting |
| negozio.orari / orari_json | 59 / 61 | **rumore** / 15 | `ModuloNegozio`, `OrariEditor` | | R11-02b/5 | `orari_json` resta (negozi senza sede: `negoziService.ts:61`); `orari` (frase) → copia esatta |
| negozio.sblocco / sblocco_json | 35 / 2 | **rumore** / 7 | `ModuloNegozio` | | R11-02/9 | frase = nota (R6-18) |
| negozio.eccezione_orari_json | 4 | 6 | `ModuloNegozio` | | R11-02b/5 | tieni (L5) |
| attivita.luogo / luogo_chiave / sblocco | 29 / 29 / 18 | **rumore** | `ModuloAttivita`, `AttivitaPage` | | R11-02/9, /10 | idem |
| quartiere.sblocco | 20 / 24 | `cittaService.ts:109,132` (DTO) | non mostrato | | R11-02b/3 | elimina solo se copia esatta di `condizioni_json` (23/24 ce l'hanno) |
| quartiere.sblocco_data | 7 | 12 file (**vivo**: `disponibilitaService.ts:62,90`) | `EditorDisponibilita`, `aperturaTokyo` | | R11-02b/3 | **tieni** finché L9 non lo sposta |
| confidente_disponibilita.luogo / sblocco_data / sblocco_requisiti | 23 / 21 / 22 | `compendioService`, `disponibilitaConfidentiService` (la 163 ha strutturato) | `EditorDisponibilita` | | R11-02/9 | dopo L9: verificare che la 163 li abbia resi ridondanti |
| articolo.condizione (frase) | 106 / 650 | **rumore** (49 file) | **rumore** | | R11-02/10 | elimina se `condizioni_json` (562) la copre; **cestino #22-#24 la citano con valore** (B10) |
| articolo.nome_it | 1 | 17 file (**rumore**: `nome_it` è anche di libri, film…) | 37 file | | R11-02/10 | verificare a mano |
| articolo.prezzo | 560 / 650 | **rumore** (28 file) | 27 file | | R11-02/10 | contro `costo_json` (58): **non** è copia esatta di `costo_json` (560 ≠ 58): non toccare senza L7 |
| articolo.oggetto_fonte / oggetto_chiave | 48 / 48 | 6 / 5 file | `ModuloArticolo` | | R11-02/10 | verificare con L7 (catalogo_chiave 643/650) |
| giorno_percorso.azioni_json | 299 / 346 | `conversioneEffettiAzione`, `richiesteService` | 0 | | R11-02/11 | non si porta (168) |
| giorno_percorso.vincoli_json, avvisi_json, coperto, trama, fase | 127, 227, 299, 346, 346 | `percorsoService`, `compendioService` | `GiornoGuida`, `DungeonPage` (coperto) | | R11-02/11 | portate in `giorno` dalla 168 |
| giorno_calendario.tempo_libero_json, meteo, settimana | 40, 288, 330 | `calendarioService` | | | R11-02/11 | portate in `giorno` dalla 168 |
| esame.domande_json | 4 / 4 | `domandeService` (solo) | 0 | | L9 R9-18 | elimina dopo il porting di `domandeService` |
| voce_giornata.produce_json | 266 / 998 | `giornataService`, `motoreDiario`, `schemaUtente` (**3 file, non zero**) | 0 | | L10 | verificare che L10 l'abbia sostituita prima di eliminare |
| spillo.solo_posizione / ruolo_guida / area_guida_chiave | 0 / 154 / 154 | `contenutiGuidaService`, `mappeService`… | `mappe` | | dati.md §1 | `ruolo_guida`/`area_guida_chiave` valgono solo per le 154 schede senza mappa |
| utente.punto_partita.automatico | 0 / 564 (tutte 0) | 11 file (**rumore**: `automatico` è una parola comune) | 7 | `collegamentiGuida` (verificare) | R11-01 (B1) | ricostruzione della tabella: rischi §7 della preparazione |

## 3. Tabelle nate dopo la copia (lette dai file di migrazione, non misurate)

| tabella | creata da | lotto | decisione |
|---|---|---|---|
| `evento_calendario_voce` | gioco 164 | L9 | tieni (collegamento evento↔voce) |
| `ombra`, `ombra_luogo`, `ombra_voce` | gioco 166 | L8 | tieni |
| `giorno` | gioco 168 | L9 | tieni: è la fonte che sostituisce `giorno_calendario` + `giorno_percorso` |
| `fortuna_partita` | utente 032 | L10 | tieni |
| `effetto_stato_voce` | utente 036 | L10 | tieni |
| `esame_piazzamento_partita` | utente 040 | L9 | tieni |

Rimodellate (stesso nome): `cestino` (160), `persona`, `persona_skill` (169), colonne nuove in `confidente_rango` (161) e `confidente_disponibilita` (163). L'inventario vero le rimisura.

## 4. Blocchi di `dati_guida` (30 sulla copia)

Lettore = la chiave compare, tra apici o come prefisso costante, in un file `server/`, `shared/` o `src/` non test e non di migrazione.

| chiave | byte | lettori | decisione | motivo |
|---|---:|---|---|---|
| battaglia | 180.122 | 28 file | tieni | Ombre (L8) |
| completamento | 43.664 | 49 | tieni | R11-15/11 |
| confidente-disponibilita-editor-v1:makoto | 3.970 | prefisso letto da `disponibilitaConfidentiService.ts:10` | tieni | storico dell'editor |
| finestre-dungeon | 5.941 | 9 | tieni | Palazzi (`atterraggioPalazziService`) |
| jose | 8.488 | 10 | tieni | scambi di Jose |
| mappe-assenti | 3.030 | `dungeonService.ts:763-768` (legge e scrive) | **verifica** | `modifiche.md` §1.1 lo elenca fra i blocchi senza lettori, ma ha un lettore e uno scrittore vivi: capire cosa fa prima di decidere |
| mappe-citta-assenti | 1.783 | `cittaService.ts:125` | tieni | accompagna `pianta_quartiere` (§8.5) |
| oggetti-crosswalk | 26.549 | `compendioService.ts:29` | tieni | ponte degli abbinamenti |
| oggetti-guida | 178.416 | 9 | tieni | |
| personaggi | 26.435 | 30 | tieni | R11-15/8 |
| sblocco-luoghi | 8.730 | 4 | tieni | |
| sblocco-quartieri | 7.962 | 1 (solo un commento, `shared/types.ts:1712`) | **elimina** | R11-02b/3, 0 lettori reali |
| sfide | 67.173 | 21 | tieni | R11-15/9 |
| audit-catalogo-121 | 5.689.103 | 0 | archivio | ≈ 5,7 MB di storia della bonifica 121 |
| audit-bonifica-catalogo-125, audit-bonifica-catalogo-126 | 257 / 2.571 | 0 | archivio | idem |
| bonifica-condizioni-attivita-124, bonifica-condizioni-letture-123, bonifica-finestre-122 | 1.763 / 216 / 259 | 0 | archivio | idem |
| correzioni-royal-l7-146, pin-ann-cestino-145, rettifica-attivita-takemi-135, rettifica-banchi-niijima-134, rettifica-ingresso-memento-130, rettifica-nota-rango1-makoto-133, residui-l5-143 | 239 / 43 / 3.160 / 1.148 / 411 / 784 / 2.746 | 0 | archivio | rettifiche di dati già applicate; restano come storia (BON-06) |
| raccordi-luoghi-l5-approvati, …-128, …-129, raccordi-scambi-catalogo-132 | 998 / 1.052 / 887 / 66.253 | 0 | archivio | raccordi approvati e già applicati dalle migrazioni |

Chiavi senza alcun riferimento letterale: 18 (come in preparazione §4.1). Una però (`confidente-disponibilita-editor-v1:makoto`) è letta per prefisso costante, quindi le «archivio» sono 17: è la ragione per cui il
metodo richiede la verifica a mano delle chiavi composte a runtime. Il caso opposto è `mappe-assenti`: ha riferimenti ma `modifiche.md` §1.1 la dava per eliminabile.

## 5. Cosa NON è in questa bozza (rinviato alla rigenerazione)

- il dettaglio per colonna di tutte le 1.254 colonne (si fa con lo script di `B1-B2-B7-B10.md` §B1.3 sulla copia a L10 consegnato);
- i lettori FE (DTO) per ogni colonna, oltre a quelli citati in §2.3;
- le tabelle di L8, L9, L10 non ancora misurate (§3), le **traduzioni** per ambito (`traduzione`: 2.056 righe) e le colonne «sempre vuote» con `seed_json`/`updated_at` (si tengono: servono a «Ripristina»).
