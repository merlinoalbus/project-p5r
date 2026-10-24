# Verifica dell'operato del PM, 24/10

Richiesta dell'utente: «Sospendi tutte le mie approvazioni fino ad una verifica sul tuo operato e le tue affermazioni fino ad ora». La verifica l'ha fatta il PM, su indicazione dell'utente («Fermalo, verifica tu»).

## Esito in breve

| Area | Esito |
|---|---|
| Rilascio di stanotte (9ef4514c + c4eda1e3) | VERO: undicesimo giro approvato, pipeline verde, p5s a 187, controllo in sola lettura nei 5 formati |
| Rilascio di oggi (01f002ba) | Pubblicato su richiesta esplicita dell'utente, pipeline verde, p5s a 229, 13 pagine aperte senza errori. **Le correzioni F1–F4 del dodicesimo giro non sono state riviste da nessun revisore** |
| Prove delle migrazioni | VERO: uscite in scratch coincidono con il documento (138/30 → 229/44; impronte del lavoro da preservare identiche; diario validato identico su tutte le 20 colonne) |
| Voci del piano chiuse oggi (64) | Tutti i commit citati esistono e corrispondono. **1 voce chiusa a torto: R9-10/2** (manca la Dote del curry del Leblanc): riaperta |
| Righe di DECISIONI del 24/10 | 17 righe «U»: fedeli alle risposte dell'utente. 14 righe «IA»: scelte del PM, **non** approvazioni dell'utente (elenco sotto) |
| Rilievo falso passato all'utente | «Attività, libri, film e Richieste non hanno una pagina propria»: FALSO (pagina con `?elemento=` e pagina Oggetto). Non verificato prima di chiederlo |
| Violazioni delle regole | `sed` usato due volte su `stato.json` (regola: niente sed sui documenti) |

## Decisioni prese dal PM (righe «IA» del 24/10) da riconfermare

1. **R9-18:** le domande d'esame vivono solo in `domanda`; `esame_premi` resta con la discordanza annotata.
2. **R9-22:** gli eventi ricavabili leggono data e tipo dalla fonte (chiave); i meteo doppioni vanno in archivio.
3. **R9-14/1:** elenco approvato dal PM delle frasi ripetute tolte dalle 30 attività (con archivio). **Voce dell'11-19:** tolti Moloch e la battaglia con Kasumi.
4. **R9-21/2:** le date di «rango massimo» e di Sae rango 2 restano dati propri del Calendario. **Voce del 14/11:** Arena a 10.000 gettoni (Royal), segno tolto.
5. **Voce del 13/11 sera:** acquisto del Katsu alla friggitoria (dati Royal) invece del testo neutro. **M-C:** Lavenza ×4 → Gemelle, Ustione 17/8 sera, 10-15 non è esame, 10-31 «Cruciverba (Stand)», Hagoromo.
6. **R11-03/3:** tolte le rotte senza client. Fusioni delle Gemelle con Persona non certa: restano informative. Misure della Home fatte dal PM.
7. **Voce del 4/10 di Okumura:** aggiunte tre aree; evento 103 «Infiltrazione estesa».
8. **R11-16/1:** l'effetto proprio dell'attività di Takemi tolto (la Dote vive nel Confidente) perché l'export si reimporti.
9. **R11-17/1:** cinque dati che nessuna pagina mostra restano correggibili solo dal servizio, senza pagina.
10. **R11-01/1:** 46 colonne di gioco dichiarate di archivio; `requisito_partita` (vuota) tolta.
11. **Regole di lavoro:** test adeguati solo per compilare; numero di migrazione preso al commit.
12. **L10:** biliardo rango 3 e cruciverba del 02-01 senza effetto (nessuna fonte con la data).
13. **Dati Royal di L9 (G-020)** applicati.
14. **B12/B15:** colonne tenute con motivo (alcune poi superate dalle decisioni dell'utente).

## Rilievi dei revisori del piano verificati dal PM nel codice (rev12, ee754f35)

Il PM li ha controllati sul codice, non sui commenti.

| Rilievo | Esito | Prova |
|---|---|---|
| Pagine proprie per attività, libri, film e Richieste mancanti | **FALSO** | `AttivitaPage.tsx:153-166`, `RichiestePage.tsx:194-203` (`?elemento=` come pagina), `OggettoPage.tsx:106` (libri e film) |
| La condizione «Persona con abilità» non si salva (verifica per nome) | **CONFERMATO** | `mappeService.ts:1089`: `persona WHERE nome=?` mentre editor e valutatore usano gli id |
| Persona dei dedali dei Memento legate per nome | **CONFERMATO** | `dungeonService.ts:910`: salva `maschera: t('persona', p.nome)`; `maschere.ts:29`: `cercaPersonaPerNome` |
| Posizioni della metro scritte nel codice | **CONFERMATO** | `collocazioneTokyo.ts:41` `QUARTIERI_TOKYO` |
| Eventi di storia scritti nel codice | **CONFERMATO** | `shared/condizioniSpillo.ts:59` `EVENTI_STORIA` |
| Immagini eliminate senza cestino | **CONFERMATO** | `immaginiService.ts:186-187,205`: `DELETE` diretto, nessun `conCestino` |
| Articolo non disponibile ignorato in silenzio alla spunta | **CONFERMATO** | `effettiDiStatoService.ts:105-113`: `continue` senza avviso |
| La ricerca non trova Ombre, esami, domande, cruciverba | **CONFERMATO** | `shared/ricerca.ts:13-18` `TIPI_RICERCA` |
| Il pin copia nome e descrizione del luogo | **CONFERMATO** | `luoghiScritture.ts:70` |
| Dote del curry mancante | **CONFERMATO** | nessuna migrazione scrive effetti per `curry-leblanc` |
| Nel pannello la scheda Confidente è in sola lettura | **CONFERMATO** | `ConfidenteDettaglioPage.tsx:89,208,221` |
| Togliendo la spunta le letture non si annullano | **CONFERMATO** | `effettiAzioneService.ts:6-12,104-112`; scelta del 30/9 superata dalla risposta dell'utente del 24/10 |

| All'uscita dai Memento il riepilogo dice «non è avanzato niente» | **CONFERMATO** | `DungeonDettaglioPage.tsx:218`: per il Memento passa 0 completate e 0 aree; `ritornoDiario.ts:37-45`: la fotografia conosce solo i campi del Palazzo (infiltrazioni, oggetti, tesoro, boss) |
| Il visore non dice l'orario proprio del negozio | **PARZIALE** | `VisoreMappa.tsx:1366`: mostra solo `d.luogo.orariTesto`; non ho riletto `LuogoPage.tsx:121-123` |
| Seconda data di sblocco del Confidente a testo libero | **PARZIALE** | `disponibilitaConfidentiService.ts:11-13`: l'editor scrive `sblocco_data`, `giorni_json`, `luogo`; non ho verificato chi lo mostra |
| «Sblocca un quartiere» offerto ma inutile | **PARZIALE** | `shared/effettiLibro.ts:3-6`: l'effetto è nascosto; non ho riletto l'editor |
| Planimetrie dell'archivio di Iweleth senza visore | **NON VERIFICATO** | `ArchivioDelPalazzo.tsx:45`: il link va a `/guida/mappe/<chiave>`; non ho seguito il rinvio della casa |

| L'albero si chiama «Luoghi della guida» («Luogo» usato con un altro significato) | **CONFERMATO** | `IndiceLuoghi.tsx:2,38` |
| Pin di città senza luogo | **CONFERMATO** | `shared/spilli.ts:167` ammette `confidente`; `luoghiScritture.ts:150`: togliendo un negozio i suoi pin restano senza riferimento |
| Il nome del quartiere è copiato in `mappa.nome` | **CONFERMATO** | `ripristino/righe.ts:74-96`: la mappa lo segue solo se i nomi erano uguali |
| Il regalo ha due «Ripristina» | **CONFERMATO** | `ConfidenteDettaglioPage.tsx:286-287`: `RipristinoCostoRegalo` accanto a `ModificaGuida tipo="regalo"` |

| Campi a testo libero nella correzione (skill «nome @ livello», ingredienti per nome) | **CONFERMATO** | `ripristino/righePersona.ts:61`, `ripristino/righeCompendio.ts:75` |
| Nodi «planimetria» dei Memento nell'indice | **PARZIALE** | `server/services/mappe/gerarchiaMappe.ts:257-263`: le «foglie» diventano nodi `planimetria`; non ho verificato a quali Memento si applichino |

Bilancio: 17 confermati, 4 parziali, 1 falso.

## Cosa resta aperto

- Riconferma dell'utente: righe «U» e «IA» del 24/10.
- R9-10/2: Dote del curry.
- Rilievi dei quattro revisori del piano: da controverificare prima di correggerli (uno era falso).
- Revisione delle correzioni F1–F4, già su p5s.
