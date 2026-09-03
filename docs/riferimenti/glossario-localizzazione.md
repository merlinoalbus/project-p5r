# Glossario della localizzazione italiana di Persona 5 Royal

Censimento (2026-09-03) dei termini ufficiali italiani dalla guida allgamestaff.it, integrato nell'app tramite
`scripts/seed/localizzazione-it.json` → `data/seed/traduzioni.json` (`skill`, `persone`, `termini`) → tabella `traduzione`
(ambiti `skill`, `persona`, `termine`). Nell'app: nomi italiani delle skill e delle Persona ovunque (con il nome canonico
inglese in piccolo quando diverso), pagina Compendio → «Glossario dei termini», tutto modificabile in Impostazioni → Traduzioni.
Integrate: 371 skill con nome diverso dall'inglese (438 alta + 34 media + 6 bassa affidabilità, meno quelle identiche), 58 Persona,
56 termini. Le voci a bassa affidabilità (Beast Weaver, Holy Benevolence, Ice Age, Life Wall, Miracle Rush, Thunder Reign) sono
incluse e da verificare in gioco; le 47 skill non reperite restano con il nome canonico.

## Rapporto del censimento

Fonte: guida italiana [allgamestaff.it/persona-5-royal](https://www.allgamestaff.it/persona-5-royal/) (indice completo scorso interamente; 17 pagine analizzate in dettaglio, elencate in `pagine.json`).
Dati canonici di confronto: `C:\Repository\project-p5r-main\data\seed\skill.json` (525 skill), `persona.json` (232 Persona), `traduzioni.json`, `scripts\seed\glossario.ts` — repository letto in sola lettura, nessun file del progetto è stato modificato.

## Metodo

1. **Download**: ogni pagina scaricata con `curl -sL -A "Mozilla/5.0 ..."` in `raw/*.html` (tutte con esito HTTP 200, nessun errore/retry necessario).
2. **Estrazione testo/tabelle**: parsing con `re`/`html.parser` in Python (niente librerie esterne), estraendo tabelle strutturate (nome/costo/effetto/rango/"chi può apprenderla"/carta abilità) dalla pagina `elenco-delle-abilita` (387 righe, 15 tabelle) e dalla pagina `tratti` (90 righe, 8 tabelle), più le 24 tabelle per-arcano della pagina `come-ottenere-tutte-le-personae` (519 righe, nome italiano + livello).
3. **Matching skill EN→IT** (`skill-it.json`), a più segnali indipendenti e incrociati:
   - **Persona+livello**: usando `persona.json` (skill+livello per ciascuna Persona) si individua quale skill inglese è insegnata al livello indicato dalle Persona elencate nella colonna "Chi può apprenderla" della guida (filtrando per elemento).
   - **Segnatura strutturale dell'effetto**: estrazione di tier di danno (minimo/leggero/medio/pesante/grave/colossale), bersaglio (1 nemico/tutti/1 alleato/tutti gli alleati), numero di colpi, alterazione inflitta (via dizionario IT→EN degli stati, vedi sotto) e parole chiave (riflette/assorbe/annulla/cura/aumenta/diminuisce/automatico/critico/uccide/Staffetta), confrontata con l'analogo testo inglese del seed, ristretta per elemento e — quando disponibile — per costo esatto (SP/% HP/Auto).
   - **Famiglie sistemiche**: le abilità passive con nome "Schiva/Evita/Annulla/Riflette/Assorbe/Potenzia/Amplifica + elemento" e "Postrecupero HP/SP [EX]" sono risolte per costruzione diretta del nome inglese (`Dodge/Evade/Null/Repel/Drain/Boost/Amp <Elem>`, `Subrecover HP/SP [EX]`), verificata contro il seed.
   - **Skill tratto** (elemento `trait`, 90 skill): risolte tramite il campo `tratto` del compendio Persona (ogni Persona ha un solo tratto) e, per le skill esclusive di Persona non presenti nel compendio (party members: Necronomicon, Zorro, Carmen, Goemon, Johanna/"Ioanna", Milady, Robin Hood, Loki, Cendrillon, e le forme "Rango Confidente MAX" come Diego/William/Célestine/Gorokichi/Agnes/Al Azif/Lucy/Hereward("Ervardo")/Ella), tramite il campo `unica` di `skill.json` incrociato con il nome del Persona citato nella guida.
   - **Casi speciali risolti a mano** con verifica su costo+effetto: le 6 skill esclusive di rango Confidente di Necronomicon (Analisi, Supporto morale, Turno d'emergenza, Hack prospettico, Acchiappa-tesori, Scansione dei Memento), Sottomissione→Negative Pile, Kouha (nome invariato), Scacco matto→Checkmate, Hyakka Ryouran (nome invariato); le 8 skill esclusive degli "Anelli" di Jose, risolte tramite la pagina `/accessori/` (es. Anello della Lussuria → Coppa del campione → *Champion's Cup*).
   - **Boost di affidabilità**: quando il nome italiano risulta identico al nome inglese (i "mantra" giapponesi non tradotti: Agi, Bufu, Zio, Garu, Mudo, Hama, Kouha, Diarahan, Samarecarm, Mahamaon, Titanomachia, Hyakka Ryouran, ecc.) l'affidabilità è stata portata ad "alta" indipendentemente dal punteggio strutturale, poiché l'identità testuale è un'evidenza forte e indipendente.
   - Alcuni conflitti tra due candidati con punteggio vicino sono stati risolti a mano confrontando elemento/bersaglio/effetto esatto (es. *Fighting Spirit* "Spirito combattivo" fisico vs *High Energy* "Super-energia" magico; *Final Guard* "Egida suprema" vs "Annulla att. fisici"; *Active Support* "Supporto vitale" vs "Postrecupero SP").
4. **Matching nomi Persona EN→IT** (`persona-it.json`): usando le 24 tabelle per-arcano di `come-ottenere-tutte-le-personae` (nome italiano + livello), abbinate al seed per nome diretto (quando invariato) o per coppia (arcano, livello) quando il nome differisce. 232 Persona del seed risolte al 100% (232/232), di cui 59 con nome italiano diverso dall'inglese.
   - Un tentativo di abbinamento "posizionale" (per ordine di elenco) sul gruppo delle Persona-gioiello ("Recipiente ideale"/*Ultimate Vessel*, 9 Persona) e sul gruppo *Potent Hypnosis* ha prodotto accoppiamenti **errati** (ordine della guida non allineato all'ordine del seed): sono stati scartati e sostituiti con il matching arcano+livello, cross-verificato anche sulla pagina `/demoni-del-tesoro/` (che elenca le stesse 9 Persona-gioiello con arcano e livello, dati perfettamente coincidenti).
   - Il persona "Necronomicon" (Fool/Eremita, livello 31) è la Persona iniziale di Futaba: **non è nel compendio `persona.json`** (coincide per arcano/livello con "Kurama Tengu" — falso positivo scartato esplicitamente).
   - 9 nomi della guida (Zorro, Johanna/"Ioanna", Milady, Goemon, Carmen, Captain Kidd, Robin Hood, Loki, Cendrillon) sono le Persona-partner esclusive dei membri del gruppo: **non compaiono in `persona.json`** (compendio di fusione) quindi sono fuori perimetro per `persona-it.json`, pur essendo stati usati per risolvere le rispettive skill tratto tramite il campo `unica`.
5. **Termini di gioco** (`termini-it.json`): estratti per lettura diretta delle pagine `sistema-di-battaglia`, `staffetta`, `ombre-sciagura`, `demoni-del-tesoro`, `stanza-di-velluto`, `speciali`, `richieste-nei-memento`, `gilda-dei-ladri`, `doti-sociali` (nome citato, non riscaricata: dati già presenti e citati in `scripts/seed/glossario.ts`), `accessori`, `carte-abilita`.

## Statistiche — skill-it.json (525 voci, tutte le skill del seed)

| Affidabilità | Conteggio |
|---|---|
| alta | 438 |
| media | 34 |
| bassa | 6 |
| non reperita (nomeIt: null) | 47 |

**Copertura**: 478/525 skill (91%) con corrispondenza italiana proposta.

**Le 47 "non reperite"** sono quasi tutte skill strutturalmente assenti dalla pagina "Elenco delle Abilità" perché non insegnabili da nessuna Persona del compendio elencata lì:
- skill esclusive dei nemici (`unica: "Enemies"`: Famine's Scream, Life Leech, Reverse Rub, Self-destruct, Spirit Leech, Summon, Stomach Blow…);
- ~34 skill passive "generiche" (bonus vari non presenti nella sezione Passive della guida, verosimilmente per limiti di spazio/selezione editoriale della fonte);
- alcune skill esclusive di Persona-partner non nel compendio (es. *Laevateinn*→Loki, *Masquerade*→Ella, *Neo Cadenza*→Orpheus F) che non sono state ritrovate nelle pagine consultate — richiederebbero le pagine dedicate ai singoli boss/eventi, non incluse nel perimetro di questa ricerca.

**Le 6 "bassa"** (Beast Weaver, Holy Benevolence, Ice Age, Life Wall, Miracle Rush, Thunder Reign) hanno un solo candidato strutturale plausibile ma senza conferma incrociata da un voto Persona+livello: la traduzione proposta è verosimile (coerente per elemento/bersaglio/tier di danno) ma non verificata a triplo livello.

**Caso particolare**: "Inferno di fuoco" compare **due volte** nella guida con testo pressoché identico (48 SP e 54 SP): la voce da 54 SP combacia esattamente con *Blazing Hell* (alta); la voce da 48 SP è stata assegnata a *Inferno* solo per coincidenza di costo (54→Blazing Hell è certa, 48→Inferno è "media" perché il seed riporta bersaglio "1 foe" mentre la guida dice "tutti i nemici" per entrambe le righe — possibile imprecisione della fonte, da verificare in gioco).

## Statistiche — termini-it.json (56 voci)

| Categoria | Conteggio |
|---|---|
| battaglia | 31 |
| negoziazione | 6 |
| velluto | 5 |
| fusione | 5 |
| confidenti | 3 |
| luoghi | 3 |
| oggetti | 2 |
| doti | 1 |

Evidenze principali: **Rapina**=Hold Up, **Assalto**=All-Out Attack, **Speciale**=Showtime, **Staffetta**=Baton Pass, **Ombra sciagura**=Sinful Shadow, **Demone del Tesoro**=Treasure Demon, **Mietitore**=Reaper, **Stanza di Velluto**=Velvet Room, **Forca**=Gallows, **Sedia elettrica**=Electric Chair, **Isolamento**=Solitary Confinement, **Registro del Prigioniero**=Compendium, **Allarme Fusione**=Fusion Alarm; mappa completa delle 12 alterazioni di stato (Sonno=Sleep, Paura=Fear, Furia=Rage, Disperazione=Despair, Amnesia=Forget, Confusione=Confuse, Soggiogamento=Brainwash, Vertigini=Dizzy, Fame=Hunger, In fiamme=Burn, Congelamento=Freeze, Folgorazione=Shock) e delle frasi di negoziazione ("Donami il tuo potere", "Fuori i soldi", "Voglio un oggetto").

## Statistiche — persona-it.json (59 voci su 232 Persona del seed)

232/232 Persona del compendio risolte (100%), di cui 59 con nome italiano diverso dall'inglese (es. *Regent*→Reggente, *Queen's Necklace*→Collana della Regina, *Crystal Skull*→Teschio di Cristallo, *Bugs*→Babau, *Thunderbird*→Wakinyan, *Dionysus*→Dioniso, *Beelzebub*→Belzebù, *Cerberus*→Cerbero, *Mandrake*→Mandragora). Le rimanenti 173 hanno nome invariato in italiano.

## Pagine visitate

17 pagine scaricate ed elaborate (elenco completo con titolo in `pagine.json`), oltre alla scansione completa dell'indice (154 link unici individuati). Nessun errore HTTP: tutte le richieste hanno risposto 200 al primo tentativo.

## Incertezze e limiti

- Il matching delle skill è automatizzato con euristiche (voto Persona+livello, segnatura di costo/effetto) integrate da risoluzioni manuali mirate dove l'automatismo era ambiguo; le 34 "media" sono in generale traduzioni letterali plausibili ma senza doppia conferma indipendente.
- Le pagine dei singoli Palazzi/boss (Kamoshida, Madarame, ecc.) e le pagine "Come sconfiggere Lavenza/le Gemelle Custodi" non sono state lette in dettaglio: potrebbero contenere ulteriori nomi di skill "non reperite" legate a boss specifici.
- La grafia "Koropokguru" (pagina Come ottenere tutte le Personae / Demoni del Tesoro) differisce da "Koropokkuru" (pagina Tratti): possibile refuso della fonte; segnalato ma non risolto arbitrariamente.
- "Amuleto dell'Imperatore" compare abbreviato come "Amul. dell'Imperatore" nelle tabelle a colonne strette (Come ottenere tutte le Personae, Demoni del Tesoro): usata la forma estesa, confermata testualmente per esteso nella pagina Tratti.
