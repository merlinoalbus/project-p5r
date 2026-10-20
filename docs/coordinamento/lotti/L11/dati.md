# L11 «Pulizia e ricerca» — analisi dati

Analisi dati, 2026-10-20. Sola lettura sulla copia di produzione `…\cffd8da6-…\scratchpad\prod-20261020\` e su `data/` (dev).
Script e uscite (scratchpad `…\161706c7-6e2c-47d6-bdb7-618347ce218c\scratchpad\`): `l11.cjs` → `l11-prod.json` / `l11-dev.json` (riepilogo) e
**`inventario-prod.md` / `inventario-dev.md`** (inventario completo: ogni tabella e colonna con righe, valori non vuoti, distinti, nota «sempre vuota»
o «costante»; 807 colonne su prod). Requisiti: `lotti/L11/requisiti.md`. **I lettori nel codice** (servizi, rotte, viste) sono di Analisi app: questo
documento dà la parte di dati di R11-01; l'incrocio «colonna → lettori» si fa unendo i due inventari.

## 1. Inventario (R11-01)
- Prod: **109 tabelle, 807 colonne** (gioco 584 righe d'inventario, partite 223). Dev: **110 / 816** — in più `immagine_miniatura` (100 righe, migrazione
  108 di L1: miniature webp). Nessun'altra differenza di struttura.
- **Tabelle vuote (13)**: `cestino`, `organizzazione_mappa_esito`, `spillo_immagine`; nelle partite `cestino_partite`, `ciclo_salvato`, `obiettivo_partita`,
  `piano_salvato`, `progresso_videogioco_partita`, `punti_negozio_partita`, `regalo_partita`, `requisito_partita`, `timbri_dedalo_partita`, `trofeo_partita`.
  Attenzione: le tabelle di partita vuote **non sono morte** (funzioni non ancora usate dall'utente): eliminarle solo se nessun codice le scrive.
- **Colonne sempre vuote (25)**: `articolo.effetto_json`, `copia_pezzo.etichetta`, `cruciverba.seed_json/updated_at`, `domanda.seed_json/updated_at`,
  `guida_mappa.note/metadata_json`, `libro.seed_json/updated_at/effetto_json`, `negozio.condizioni_json`, `pianta_area.copre_aree_json`, `trofeo.mancabile`;
  partite: `compendio_partita.tratto_skill_id`, `confidente_partita.note`, `partita.note/dlc_posseduti_json`, `persona_posseduta.forza/magia/resistenza/
  agilita/fortuna/tratto_skill_id/note`. Le colonne `seed_json`/`updated_at` vuote servono a «Ripristina» quando l'utente corregge (dubbio 1): non sono morte.
- **Colonne costanti** (69): elenco in `l11-prod.json`; notevoli per la pulizia: `spillo.ruolo_guida='punto'` (solo schede senza mappa), `spillo.solo_posizione=0`,
  `spillo_destinazione.x/y=0, zoom=1`, `quartiere_ingresso.zoom=1`, `area_dedalo.timbri_totale=0` (il «0/95» del piano), `articolo.quantita` sempre NULL,
  `attivita.quiz_json` una sola riga, `voce_giornata.genere='azione'`, `punto_partita.stato='ottenuto'` e `automatico=0`, `dungeon_atterraggio` solo Kamoshida.
- Peso: `immagine` **≈ 371 MB** su ≈ 380 MB di gioco.db; poi `spillo` 1,3 MB, `dati_guida` 0,5 MB, `giorno_percorso` 0,4 MB.

## 2. Fonti vecchie lasciate dai lotti L2–L10 (da eliminare in L11 dopo la prova «nessun lettore»)
| Fonte | Righe/valori oggi | Lotto che la sostituisce | Nota |
|---|---:|---|---|
| `mappa.entita_tipo/entita_chiave` | 129 (24 quartiere + 105 area) | L2, L3 | |
| `mappa_entita` | 134 (130 area, 3 luogo, 1 quartiere) | L3, L2, L5 | |
| `mappa_presentazione.gruppo_immagini_json` dei Palazzi | 203 (187 + 16 Iweleth) | L3 | i gruppi del mondo (Covo, Sottopasso, staff) diventano versioni in L2 |
| `guida_mappa` | 92 | L3 | `note`, `metadata_json` sempre vuote |
| `marcatore_mappa` | 149 | L4 | posizioni delle schede senza mappa |
| schede senza mappa (`spillo` con `mappa_chiave` NULL) | 154 | L4 | 149 assorbite nelle voci + 5 da elenco |
| `marcatore_luogo` | 47 | L5 | posizioni coperte dai pin |
| `pianta_area` | 84 | L2/L5 | fonte omoteura (screenshot) |
| `pianta_quartiere` | 22 | L2 | fonte wiki |
| `negozio.luogo` (frase), `negozio.luogo_chiave` (= quartiere), `luogo.negozio` (frase) | 60 / 58 / 42 | L5 | la sede è `sede_chiave` |
| frasi di orari/sblocco: `luogo.quando/giorni/sblocco`, `negozio.orari/sblocco`, `attivita.sblocco`, `quartiere.sblocco/sblocco_data`, `confidente_disponibilita.sblocco_data/sblocco_requisiti/luogo` | 41/10/39, 60/35, 21, 20/7, 22/22/23 | L5, L6, L9 | restano come **note** se aggiungono contesto (R6-18): eliminare solo le copie |
| `articolo.condizione` (frase) | 106 | L6 | accanto a 510 JSON |
| `giorno_percorso` (seconda tabella giornaliera) | 346 | L9 | fusa in `giorno` |
| `evento_calendario` | 173 | L9 | diventa voci del diario |
| `esame.domande_json` / righe «serie di domande» in `domanda` | 31 / 12 | L9 | una tabella |
| `dati_guida.oggetti-guida.scambi[Jose]` | 24 | L7 | resta `jose.scambi` (37) |
| `battaglia.ombre` debolezze/resistenze, `dettagli_json.deboleA/resisteA` delle voci | 217 / 161 | L8 | dal compendio (G-019: errori della guida) |
| `spillo_partita` dei pin con voci non descrittive | parte di 748 | L4 | dopo il confronto prima/dopo |
| `confidente_disponibilita.giorni_json` di Yusuke (date) | 1 | L9 | |
Totale righe di tabelle intere da eliminare (marcatori, piante, guida_mappa, mappa_entita area, schede, giorno_percorso, evento_calendario): ≈ 1.200,
più colonne; il piano stimava ≈ 600 (senza `giorno_percorso` ed `evento_calendario`).

## 3. Ricerca globale (R11-07…R11-10): quanti oggetti, per tipo
Quartieri 24 · Aree del mondo 22 (L2) · Planimetrie del mondo 29 · Palazzi 9 · Aree dei Palazzi 101 (+16 Iweleth, L3) · Infiltrazioni 91 (`dungeon_area` dei
Palazzi: 7+5+5+10+10+14+16+12 Iweleth+12; i Memento hanno 9 righe-dedalo nella stessa tabella) · Dedali 9, aree dei dedali 95 · Voci della guida 959 (+ passi) · Luoghi 93 · Negozi 61 · Persona 232 · Ombre ≈ 217
(L8) · Oggetti ≈ 661 + elenco (L7) · Confidenti 23 · Attività 30 · Libri 46 · Film 30 · Richieste 33 · Giorni 346 · Trofei 53. `nascosto` è presente su
luogo, negozio, articolo, libro, film, attività, cruciverba, domanda (oggi sempre 0 tranne dove l'utente ha nascosto: R11-10).
Nomi originali disponibili per la ricerca: `traduzione` (persona 232, skill 490, oggetto 223, negoziazione 120…), `libro.nome` / `nome_it`, `film.nome` / `nome_it`.

## 4. Lavoro da preservare (R11-21)
Impronta diario/Kamoshida/Madarame: `1a71b030…bc4c` identica su prod e dev (oggi); da rigenerare dopo ogni eliminazione. Impronta del mondo
(`impronta-mondo.cjs`, L2) per i pin del mondo. Nessuna delle fonti del §2 contiene il testo delle voci del diario o delle voci/pin dei due Palazzi:
le eliminazioni toccano solo copie e legami vecchi.

## 5. Regole proposte
1. Eliminare per tabella intera solo dopo: (a) il lotto che la sostituisce è consegnato; (b) Analisi app conferma 0 lettori; (c) migrazione append-only con
   copia di sicurezza; (d) impronte identiche prima/dopo.
2. Colonne: eliminare solo le copie; tenere `seed_json`, `origine`, `fonte`, `verificato`, `updated_at` (servono a «Ripristina» e alla provenienza).
3. Tabelle di partita vuote: non eliminare se c'è codice che le scrive (funzioni non ancora usate).
4. Pacchetti vecchi: le tabelle eliminate si accettano all'import e si scartano con riepilogo (R11-05).

## 6. Rimisura sulla copia fresca di produzione (`dati-produzione/2026-10-20-0440Z/`, 2026-10-20)
Sola lettura; `l11.cjs` (→ `l11-0440Z.json` e `l11-0440Z.md`, inventario completo, nel mio scratchpad) più conteggi diretti. Confronto con la copia di produzione precedente.
- **Struttura invariata**: 109 tabelle e 807 colonne, le 13 tabelle vuote e le 25 colonne sempre vuote non cambiano. La copia 0440Z è **prima** delle migrazioni 108–111 e
  022 di sviluppo, quindi niente `immagine_miniatura`, `carattere` né `divergenza_partita`.
- **Colonne costanti**: l'elenco `colonneCostanti` passa da 72 a **73** righe. Si aggiunge `utente.progresso_libro_partita.avanzamento = 2`: è una coincidenza della
  partita, non una colonna morta, e **non** è da eliminare. **Correzione del §1**: il §1 dice «69», ma l'elenco della copia precedente ha **72** righe; vale il conteggio
  dell'elenco.
- **Righe che cambiano (lavoro dell'utente del 19/10 sera)**:
  - voci della guida (`punto_interesse`): da 959 a **961**, le due voci `boss` di Madarame (L8 §11);
  - pin: 2300 e 2301 aggiunti (`spillo` da 1280 a 1284 KB; `punto_interesse` da 360 a 368 KB);
  - `spillo_partita`: da 748 a **752**;
  - diario: da 996 a **997**.
  Restano uguali: le schede senza mappa (154) e le altre fonti vecchie del §2.
- **§3 (ricerca globale)**: «Voci della guida» va letto **961**. Gli altri conteggi non cambiano.
- **§4**: il riferimento dell'impronta diventa `impronta-0440Z.json` (sha256 `bbd9de5d7833f0f9…`, L4 §11.7) al posto di `1a71b030…bc4c`.
- **Elenco «Da rivedere» (R11-10c)**: dati che oggi ci vanno, da questa rimisura e da quelle di L5–L10:
  1. la voce di Igor del 06-01 sera, `9b4f62e2f6694fd5af10a407a455d546`, fuori fascia (Igor «notte»), creata dall'utente (L9 §8);
  2. le due voci `boss` di Madarame con «Gelo» e «respinge» (L8 §11): proposta di testo, mai applicata senza sì. Motivo per l'utente (G-038): «La guida scrive "Gelo" in
     questa scheda e "Ghiaccio" nel resto; proposta: "Ghiaccio" ovunque.» È un'uniformazione dei nomi degli elementi (G-025), non una correzione della fonte;
  3. il forziere `kamoshida-15-torre-centrale-raccogli-forziere-3`, che risulta «non più ottenibile» ma ha il forziere raccolto (L7 §11);
  4. le 4 divergenze pin↔voce di Kamoshida (L4 §11);
  5. le 8 voci di invito (compresa Makoto 07-30, strada (a)) e quella di Kaneshiro dopo il 06-01 (L10 §9.3);
  6. dall'Esperto (G-030, G-031). Il motivo da mostrare all'utente è scritto dall'Esperto:
     - `yongen-jaya/sakura-residence`: «Nella guida la casa di Futaba non è mai visitabile liberamente: la stanza compare solo negli eventi di Futaba (rango 6 del
       16/10, rango 7 del 2/11, rango 10 amore, 15/1). Proposta: luogo senza sblocco proprio.» (G-031, certezza media);
     - libro `pagine-ammuffite` (la lettura che apre il ritrovo di Jinbocho, `kanda-jinbocho/nagiuri`): «La guida dice due negozi diversi: Libreria Hinokuniya
       (pagina Libri) e Libreria Taiheido (elenco dei negozi), dal 1/9. Da verificare in gioco.» (G-031);
     - pin 811 di Madarame («Tesoro del Palazzo», Sala Principale, mappa `nativo-rmap-153-9-0`): «Nota proposta: il dipinto preso qui con la gru è un'esca; il
       vero Sayuri è nel Giardino centrale (pin 2300). Il nome del pin resta il tuo.» (G-030; riguarda L4). È lavoro dell'utente da preservare: solo una nota,
       niente rinomina.
  Gli altri luoghi aperti di L5 sono chiusi (G-031): Mercante Sakai a Kichijoji con 16 finestre, Jinbocho sul luogo `nagiuri`, Okumura `data{09-15}`.
  7. `kichijoji/hagoromo` (G-033, certezza bassa): motivo per l'utente: «La guida dà "Domenica sera" solo per il Katsu a pezzettoni, l'unico articolo; per il negozio non dà
     orari. Proposta: il negozio segue la regola "giorno e sera" e la domenica sera vale per l'articolo.» (L5 §10.7)
  8. `dungeon/madarame/museo-1p` (L3 §9, E9): «L'Area si chiama "Museo, 1P" e la sua planimetria "Museo 1P": i due nomi li hai scritti tu. Proposta: lo stesso nome per
     tutte e due, senza virgola, "Museo 1P".» Stesso caso: `dungeon/madarame/museo-2p` «Museo, 2P» → proposta «Museo 2P».
  9. **Listino di Tanaka** (G-034): le **20 righe** di `tanaka-affari-loschi`, ciascuna con proposta e motivo per l'utente, sono nella tabella di **L7 dati.md §11.1**:
     - 10 da nascondere, perché non esistono in Royal;
     - 10 da abbinare a un articolo della guida (6 «probabili», 2 «possibili», le gemme → 6 Magatama, Homunculus 120.000 → 5.000);
     - 3 articoli nuovi della guida.
     Nessuna scrittura prima del sì.
  10. **Voci di Lavenza e Gemelle legate a Igor** (G-036 B1, L9 §9.2): 4 voci, tutte fuori dal validato. Proposta: riferimento `confidente:igor` → `confidente:gemelle`,
      con il testo invariato e il riferimento di prima conservato. Motivi per l'utente (dall'Esperto):
      | Voce | Giorno | Testo (inizio) | Motivo | Certezza |
      |---|---|---|---|---|
      | `165b8cb392fae0bd067b6ba34b87a8fb` | 06-08 giorno | «Stanza di Velluto: avanzamenti multipli con i Gemelli Custodi» (riferimento «Gemelli Custodi - Forza») | «Le Gemelle custodi sono il Confidente Forza, non Igor (Matto).» | alta |
      | `85cce8fcb43e4ca9a05707de5a8ea993` | 09-06 giorno | «Stanza di Velluto: fusioni con le Gemelle… fino al rango 8 (Forza)» | idem | alta |
      | `d26ea0495813e93e62e5940a9912c419` | 11-06 giorno | «Stanza di Velluto: Gemelle Custodi fino al rango massimo» | idem | alta |
      | `5cb911c7de90d3ee9a9ee47b47e69240` | 01-11 giorno | «Incontro con Lavenza all'infermeria; visita di Sumire» (riferimento «Lavenza - Il Matto») | «La guida tratta Lavenza dentro il Confidente Forza delle Gemelle (le sue scelte di dialogo stanno lì); per Igor è solo la fusione delle Gemelle.» In alternativa la voce resta di trama, senza Confidente: le due scelte vanno mostrate all'utente | media |
  11. **Cruciverba nel giorno sbagliato** (G-037 punto 2, L10 §2): `889aefc170a0719ed508cd8dd37e0d31` (08-16, «Cruciverba (Ustione)») e `a67565bfa0cbe0f9e4af4705974836aa`
      (08-29, «Cruciverba (Hacker)»). Motivo: «La guida mette il cruciverba Ustione il 17/8 e Hacker il 30/8; questa voce è un giorno prima.» Proposta: spostare la voce al
      17/8 e al 30/8. È una voce della guida fuori dal validato: nessuno spostamento senza sì. L'abbinamento per risposta di L10 vale comunque. Certezza alta.
  12. **10-15** `6c8e3422e674dd92e40e71b00d6a734f` (tipo `esame`, «schivare il gesso, prova di Perizia»). Motivo: «Non è una domanda: è il gesso del Prof. Ushimaru, si schiva
      con la Perizia (Fascino +2).» Proposta: tipo da `esame` a effetto della voce (Perizia 1: 33%, 3: 66%, 5: 100%; Fascino +2 se schivato), senza abbinarla a una domanda.
      Certezza alta (G-037 punto 4).
  13. **10-31** `09077817a814017ee5e85ecd6f2fb270` («cruciverba scolastico», tipo `esame`). Motivo: «La guida non ha un "cruciverba scolastico": il 31/10 c'è il tempo libero
      con Kawakami (Rango 5) e la sera il cruciverba "Stand".» Proposta: testo e tipo da rivedere con l'utente. Certezza alta (G-037 punto 5).
  Il punto 3 (forziere) non è un dato di gioco ma uno stato della partita (G-038), e sulla base p5s non ha più casi (§7).

## 7. Base p5s (`dati-produzione/p5s-2026-10-20-0503Z/`, decisione dell'utente: la fonte dei dati è p5s)
- **Struttura**: **110 tabelle, 816 colonne**. In più c'è `immagine_miniatura` (migrazione 108 di L1, già applicata su p5s, 820 KB), come lo sviluppo del §1. Le colonne
  costanti sono 74 righe: si aggiunge `immagine_miniatura.mime = image/webp`. Tabelle e colonne vuote non cambiano.
- **Righe** (lavoro dell'utente su p5s): `punto_partita` da 528 a **564**, `spillo_partita` da 752 a **797**, `evento_partita` da 1284 a **1316**. Restano uguali le voci della guida (961),
  il diario (997) e le schede senza mappa (154).
- **Impronta di riferimento** (§4): `impronta-0503Z.json`, `ff3033cb…` (L4 §11.8).
- **Elenco «Da rivedere»** (§6): il punto 3 (forziere falso positivo) e il punto 4 (le 4 divergenze di Kamoshida) **non hanno più casi** nei dati. L'utente ha segnato le voci:
  si tolgono dall'elenco dei dati e restano solo come casi di prova.
