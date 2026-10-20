# L4 «Avanzamento unico» — analisi dell'app attuale

Autore: sessione «Analisi app attuale» (2026-10-20).
Cartella di sviluppo `C:\Repository\project-p5r\.claude\worktrees\pensive-burnell-b50941` (`newreview`, modifiche L1 in corso:
in `DungeonDettaglioPage.tsx` le righe valgono ±5), `data/gioco.db` aperto in sola lettura, FE e BE interrogati solo con GET.

**Le strade di scrittura (segnare una voce o un pin) non le ho provate nell'app.** Avrei dovuto creare ed eliminare una partita di prova,
e la memoria dell'utente chiede il suo permesso per eliminarla. Le ricostruisco quindi dal codice e dai test esistenti, con file:riga.
Le prove dal vivo spettano a Test funzionali e Test no-reg, con la partita di prova.

Fonti incrociate: `requisiti.md` (R4-01…R4-37), `dati.md` di L4.

## 0. Fatti che contano per il progetto
1. **Lo stato è scritto in due posti.** Lo stato della voce sta in `utente.punto_partita` (`ottenuto` | `esaurito`, colonna `automatico`
   che nessuno usa più: `schemaUtente.ts:60`, `migrazioniUtente/017`). Quello del pin sta in `utente.spillo_partita` (`raccolto` per
   `spillo_uid`, `migrazioniUtente/002`). Una dozzina di procedure li riallinea dopo ogni scrittura (`server/services/mappe/statiGuida.ts`,
   `collegamentiGuida.ts`).
2. **La lettura è un OR.** Un pin risulta preso se ha `spillo_partita.raccolto=1` **oppure** se tutte le sue voci sono gestite. Vale in
   quattro punti:
   - `mappeService.dettagliSpillo` (`mappeService.ts:360-364`);
   - `dungeonService.raccoltaMappe` (`dungeonService.ts:146`);
   - `disponibilitaService.spilliSegnati` (`:157-161`);
   - `palazziService.valutaPalazzo` (`palazziService.ts:119`).

   Basta un `raccolto=1` rimasto indietro perché il pin risulti fatto anche con le voci aperte.
3. **Strade di scrittura che possono produrre divergenze** voce/pin (§2). Le prime due sono le più frequenti:
   - togliere il segno da un pin con una sola voce **cancella la voce**, anche se era «esaurito», e lascia `raccolto=1` sugli altri pin
     della stessa voce (`mappeService.ts:1376`, `:1383` riallinea solo i pin con più voci);
   - una voce con più pin si segna solo quando tutti i suoi pin «solo suoi» sono raccolti (`:1373-1375`);
   - `eliminaSpillo` (`:1321-1330`), l'import delle mappe (`:1774-1788`, `:1882-1891`), il ripristino dal cestino e la sostituzione del
     pacchetto non ricalcolano;
   - le schede senza mappa sono escluse da `pinDelPuntoGuida` (`statiGuida.ts:15-18`);
   - il server non lega «esaurito» a `esauribile`;
   - l'interfaccia ricalcola il raccolto includendo le descrittive (`useMappaPartita.ts:101`).
4. **Il completamento conta i pin, non le voci.**
   - La percentuale del Palazzo e quella della planimetria contano i pin `collezionabile=1` di categoria `consumabile` (`shared/spilli.ts:60`:
     dialogo, forziere, forziere-raro, tesoro-palazzo, seme-bramosia, oggetto, oggetto-chiave, timbro, boss, miniboss). Nemico, meccanismo,
     porta, sicura e punto sensibile **non contano** (`:61-64`). Riferimenti: `dungeonService.ts:135-160`, scritta in
     `GuidaDellArea.tsx:382`.
   - «Palazzo completato» vuole tre cose (`palazziService.ts:117-132`): Tesoro, cioè **pin** `tesoro-palazzo` raccolti e non voce (`:121`);
     boss finale; tutti i pin presi.
   - «Area completata» (FE `src/utils/completamentoAree.ts:18-31`) conta invece **le voci** non descrittive. **Un'area senza voci non è mai
     completata**, mentre una planimetria senza collezionabili sì (`dungeonService.ts:131-133`). Le regole di completamento sono quindi
     quattro, diverse fra loro (§3). R4-21 le porta a una: permanenti più tesoro e boss.
5. **Doppi conteggi.** Ogni pin collezionabile di ogni planimetria conta. Le versioni della stessa stanza con lo stesso forziere contano
   due volte, e `gruppiPlanimetrie.ts:65-66` somma le versioni. Una voce copiata condivide i pin, che restano «da fare» finché non è
   segnata anche la copia (`copiaPinDellaVoce` `dungeonService.ts:846-854` → `allineaStatiPunto`). Riguarda R4-24.
6. **Le «schede senza mappa»** sono righe di `spillo` con `mappa_chiave IS NULL`, `area_guida_chiave` valorizzata e `ruolo_guida`
   `'punto'` o `'sezione'` (CHECK in `042_contenuti_guida.ts:23`). Restano sul riferimento `punto` senza passare da `spillo_voce`
   (094:11-12, 098:13), hanno un loro `spillo_partita`, e la loro posizione viene da `marcatore_mappa`.
   - Lettori: `contenutiGuidaService.contenutiMappa` (`:51-67`), `mappeService.schedeContenutiGuida` (`:408-414`), `elementoSpilloDto`
     (`:401-403`).
   - Interfaccia: `ContenutiGuidaMappa.tsx:23, 36-37` nel pannello del visore, `SchedaContenutoGuida.tsx:28-31`.
   - API: `GET /api/mappe/contenuti/:chiave?partita=` (`routes/mappe.ts:28`).
   - Il commento in `mappeService.ts:405-406` ne conta 187; `dati.md` §7 ne misura **154** (149 legate a una voce, 5 senza riferimento).
7. **Non esiste il carattere permanente/rigenerabile.** I tipi di voce stanno in tre elenchi paralleli:
   - `shared/types.ts:1765` (`PuntoInteresseDto['tipo']`);
   - `server/schemas/guidaDungeon.ts:19` (`TIPI_PUNTO`);
   - `src/utils/dungeon.ts:7, 14` (`COLORE_TIPO`, `NOME_TIPO`; per esempio «Nemico» = `ombra-sciagura`, «Enigma» = `puzzle`, «Forziere raro»
     = `forziere-chiuso`).

   Le regole stanno in `shared/spilli.ts`:
   - `spilloPerPunto` (`:262-277`): tipo della voce → tipo del pin;
   - `PIN_DEL_PUNTO` e `puntoDaCollegare` (`:286-298`);
   - «Altro» è descrittiva fuori dai dedali (`TIPO_PUNTO_DESCRITTIVO` `:305`, `puntoDescrittivo` `:308-310`);
   - Enigma = `puzzle` (`:314-316`).

   Lo stato non ha una dimensione per infiltrazione: un rigenerabile oggi ha un solo stato per partita.
8. **«Esaurito» non si vede.** Si riconosce solo dal testo: « · esaurito» in `GuidaDellArea.tsx:267`, «Nella Guida: esaurito» e
   `parolaSegnato` nel visore (`VisoreMappa.tsx:1033-1037, 1135-1146`). L'opacità e l'etichetta «segnata» sono le stesse di «ottenuto».
   Riguarda R4-34.

## 1. Schema coinvolto (righe dal codice)
- **`punto_interesse`** (gioco), nata in `013_dungeon.ts:35-45`: chiave `<infiltrazione>/<ordine>`, `area_chiave`, `ordine`, `tipo` (testo
  libero), `nome`, `descrizione`, `esauribile` (`:42`), `dettagli_json`, `fonte`. Colonne aggiunte dopo:
  - `contenitore_chiave`, il passo dell'Enigma (`095_passi_degli_enigmi.ts:21-25`);
  - `area_dedalo_chiave` (`099:40`);
  - `persona_area_dedalo` (`101:142-143`).
- **`punto_partita`** (partite): nasce in `013:53-59`; schema attuale in `schemaUtente.ts:60`; colonna `automatico` aggiunta dall'utente 006
  e svuotata dalla 017; l'utente 019 toglie le Persona dei Memento.
- **`spillo_partita`** (partite): nasce in `027:50-56`, l'utente 002 la ricostruisce per uid. `schemaUtente.ts:64` crea ancora
  `spillo_id`, ed è la 002 a convertirla.
- **`spillo`** (gioco): `027:32-46`, più `condizioni_json` (029), `solo_posizione` (041), `area_guida_chiave` e `ruolo_guida` (042),
  `nativo_json` (046), `uid` (067).
- **`spillo_voce`** (098): `098_voci_dei_pin.ts:27-32`, con PK `(spillo_id, voce_chiave)` e cascata da entrambi i lati.
  Regola di lettura in `voceDelPin.ts`:
  - `vociDelPinSql` (`:20-23`);
  - `vociGestite` (`:31-37`);
  - `vociDiOgniPin` (`:52-60`);
  - `fattoPerVoci` (`:71-73`);
  - `uidFattiPerVoci` (`:76-84`).
- **Cestino**: CHECK in `104_cestino.ts:30`; `cestino_partite` dall'utente 021.

## 2. Strade di scrittura dello stato
Primitive in `server/services/mappe/statiGuida.ts`:
- `scriviStatoVoce` (`:74-79`);
- `allineaRaccoltoDelPin` (`:31-39`);
- `allineaEnigma`, `allineaEnigmaDellaVoce`, `allineaEnigmaInOgniPartita` (`:82-106`);
- `segnaPassiDellEnigma` (`:113-119`).

In `collegamentiGuida.ts`: `allineaStatiPunto` (`:64-82`, in ogni partita) e `allineaPinScollegato` (`:88-91`).

| # | Strada | UI (file:riga) | API | Servizio | Rischio di divergenza |
|---|---|---|---|---|---|
| 1 | Spunta della voce: Ottenuto, Esaurito (solo se esauribile), Riapri | `GuidaDellArea.tsx:293-295` (`cambiaStato` in `DungeonDettaglioPage.tsx:≈182-196`); popup e scheda del visore `AzioniVoce` (`VisoreMappa.tsx:1052-1061`) → `useMappaPartita.statoPunto` (`:92-108`); `SchedaContenutoGuida.tsx:31` | `PUT /api/partite/:id/punti` (`partite.ts:159-162`) | `dungeonService.impostaStatoPunto` (`:350-375`): rifiuta le descrittive e le Persona dei Memento; Enigma e passi; evento | le schede senza mappa non si riallineano |
| 2 | Spunta del pin | casella in «Da raccogliere» (`RaccoltaPlanimetrie.tsx:48-54, 87`); `AzioniStato` del visore solo per i pin **senza** voci (`VisoreMappa.tsx:1067-1088`, `useMappaPartita.raccolto` `:77-88`); `SchedaContenutoGuida.tsx:30` | `PUT /api/partite/:id/spilli/:spilloId` (`partite.ts:181-184`) | `mappeService.impostaRaccolto` (`:1333-1390`): con più voci le segna tutte o le riapre tutte; con una voce vedi §0.3 | **sì** (§0.3) |
| 3 | Collega o scollega pin↔voce | `GuidaDellArea.tsx:191-202`; editor `EditorMappaPage.tsx:231, 669` | `PUT`/`DELETE /api/compendio/punti/:k/pin/:spillo` (`compendio.ts:290-297`) | `collegaPinAlPunto` (`dungeonService.ts:1005-1034`), con le regole di `erroreVoceDelPin` (`collegamentiGuida.ts:34-46`) | collegando, un pin raccolto può segnare la voce in **ogni** partita |
| 4 | Pin creato, modificato o eliminato dall'editor | `EditorMappaPage` | `POST /:k/spilli`, `PUT`/`DELETE /spilli/:id` | `creaSpillo` (`:1235-1260`), `aggiornaSpillo` (`:1268-1318`), `eliminaSpillo` (`:1321-1330`) | l'eliminazione non ricalcola la voce |
| 5 | Copia voci in un'altra infiltrazione | `GuidaDellArea` → `TrasferisciVociInArea` | `POST /compendio/punti/copia-in-area` (`:282-285`) | `copiaPuntiInArea` (`:865-899`), `copiaSchedeDellaVoce` (`:806-837`) | la copia nasce senza stato sugli stessi pin: il pin torna «da fare» |
| 6 | Sposta voci | idem | `POST /punti/sposta-in-area`, `PUT /punti/:k/sposta` | `spostaPuntiInArea` (`:763-781`), `spostaPunto` (`:977-994`) | nessuno (la chiave resta) |
| 7 | Correggi voce (tipo, Enigma, esauribile) | `GuidaDellArea` | `PUT /compendio/punti/:k` | `aggiornaPunto` (`:902-959`) | «esaurito» resta se `esauribile` diventa falso; una voce resa descrittiva tiene lo stato |
| 8 | Crea o elimina voce, elimina infiltrazione | `GuidaDellArea`, `PlanimetriePalazzo` | `POST /aree/:k/punti`, `DELETE /punti/:k`, `DELETE /aree/:k` | `creaPunto` (`:1073-1101`), `staccaPunto` (`:1110-1119`), `eliminaPunto` (`:1134-1151`), `eliminaArea` (`:420-431`) | un passo nuovo riapre l'Enigma |
| 9 | Ripristino dal cestino | Impostazioni › Cestino | `routes/impostazioni.ts:121` | `cestinoService.ripristinaDalCestino` (`:283-386`, «cambiata-dopo» `:330-345`) | nessun riallineamento voce↔pin |
| 10 | Import del pacchetto delle mappe | editor › importa | `POST /api/mappe/importa` | `importaMappe` (`:1628-`, pin tolti `:1774-1788`) | `spillo_partita` orfani; un pin con meno voci non si riallinea |
| 11 | Sostituzione di `gioco.db` | Impostazioni › Pacchetto | — | `pacchettoGiocoService.ts:77, 80` (solo elenco degli orfani) | nessun ricalcolo |
| 12 | Seed e sincronizzazione | avvio | — | `sincronizzaMappe.ts:136-160` (schede dai marcatori) | non tocca gli stati |

## 3. Completamento e lettori a valle
| Livello | Dove | Che cosa conta | Senza niente da contare |
|---|---|---|---|
| Planimetria | `dungeonService.raccoltaMappe` 135-160 | pin collezionabili | completa (131-133) |
| Stanza | `PlanimetriePalazzo.tsx:196, 378-380` | aree **oppure** raccolta | — |
| Infiltrazione («area» della guida) | FE `completamentoAree.ts:18-31` | voci non descrittive con uno stato («Storia» conta, «Altro» no) | **mai** completata |
| Area di un dedalo | `shared/dedali.ts:39-54` | Trama, Richieste, timbri | completata |
| Palazzo | `palazziService.valutaPalazzo` 117-132, `statoPalazzi` 135-156 | collezionabili + Tesoro (solo pin) + boss finale | non si completa |
| Intestazione | `DungeonDettaglioPage.tsx:≈325, 395-399, 439-441` | presi/totale dei pin | — |

`completamentoService.ts` riguarda i trofei, non c'entra.

Lettori a valle (R4-25):
- **MappaTokyo**: `presente: !d.completato` (`MappaTokyo.tsx:396-397`). I dati vengono da `getDungeons` (`CittaPage.tsx:52-54`,
  `OggiMappa.tsx:54-56`).
- **Pin d'ingresso bloccati**: `mappeService.senzaIngressoAPalazzoCompletato` (`:290-300`), `palazzoDiIngresso` (`palazziService.ts:171-177`).
- **Requisito «Completare il Palazzo»**: `semaforiService.ts:84-86, 121-130`, usato da `partiteService.ts:291` e `disponibilitaService.ts:124,
  300-304`.
- **Condizione «Pin di una mappa»**: `shared/condizioniSpillo.ts:118`, valutata in `disponibilitaService.ts:270-280` (su `spilliSegnati`).
- **Condizione «Voce della guida»**: `condizioniSpillo.ts:122`, valutata in `disponibilitaService.ts:281-291` (su `vociGestite` + catture).
  Elenchi per l'editor in `nomiCondizioni.ts:72-78, 94-101` (rotte `condizioni.ts:71, 77`).
- **Elenco dei Palazzi**: `DungeonPage.tsx:47, 61, 78` (anello, «N esauribili», «N segnati»).
- **Suggerimenti**: `suggerimentiService.ts:181-185` non leggono stati.

## 4. Interfaccia: dove si vede e si cambia lo stato (percorsi dell'utente)
| # | Dove | Cosa vede o fa | Schermata «prima» |
|---|---|---|---|
| A1 | Scheda del Palazzo › colonna centrale › guida dell'infiltrazione (`GuidaDellArea`) | riga: tipo, « · esauribile», « · {stato}», passi n/N (`:267`), opacità se segnata (`:263`), «N pin» o «da collegare» (`:269-271`); pulsanti Ottenuto/Esaurito/Riapri (`:293-295`); «Anche le segnate (N)» (`:394`) | `01-palazzo-madarame-infiltrazione-2`, `04-palazzo-kamoshida` |
| A2 | Scheda del Palazzo › «Da raccogliere» (`RaccoltaPlanimetrie`) | caselle per pin, per planimetria, «Nel resto del Palazzo», «Anche i raccolti» | `01-…` (colonna destra) |
| A3 | Scheda del Palazzo › colonna sinistra | ✓ per stanza «per aree o per raccolta», «N raccolti · completa» | `L3/…/02-palazzo-madarame` |
| A4 | Intestazione | anello 99% (Madarame p1), «86 da raccogliere», «17 planimetrie · 16 complete» | `L3/…/02-…` |
| A5 | Visore › popup di un pin con più voci (Entrata del Museo, pin 2092, 4 voci) | una riga per voce con il suo stato e «Riapri», «Visibile solo: Voce … segnata», «Dettagli» | `02-pin-piu-voci-entrata-museo` |
| A6 | Visore › pin 777 (Giardino centrale, 4 voci, coppia del caso dubbio 2 di L3) | idem | `03-pin-777-giardino` |
| A7 | Visore › pannello › «Contenuti della guida» (schede senza mappa) | voci e schede della planimetria, segnabili | `02-…` (pannello sinistro) |
| A8 | La città › mappa di Tokyo | Kamoshida completato → non c'è più | `06-citta-palazzi` |
| A9 | Guida › Completamento | trofei (non i Palazzi) | `05-completamento` |

Schermate: cartella `lotti/L4/schermate-prima/`, 30 PNG (6 viste × 5 misure: 1280x800, 768x1024, 375x812, 1366x657, 1280x689), partita 1
al 06-01, sola lettura.

## 5. DTO
- **`shared/types.ts`**:
  - `StatoPunto` (1760);
  - `PuntoInteresseDto` (1762-1789: `tipo` 1765, `esauribile`, `stato`, `marcatore`, `pin`, `contenitore`, `areaDedalo`, `persona`);
  - `PinDelPuntoDto` (1796), `VoceCollegabileDto` (1799);
  - `AreaDungeonDto` (1801-1821: `mappe[]` con `n`, `presi`, `spilli`), `SpilloRaccoltaDto` (1824-1832);
  - `DungeonRiassuntoDto` (1867-1899: `punti`, `esauribili`, `gestiti`, `raccolta`, `completato`), `DungeonDettaglioDto` (1934-1951);
  - `DettaglioSpilloDto.punto` (2073), `VoceDelPinDto` (2081);
  - `SpilloDto.raccolto` (2158), `SpilloDto.voci` (2164);
  - `EsportazioneMappeDto.spilli[].voci` (2295).
- **`shared/organizzazioneMappe.ts`**: `SchedaContenutoGuidaDto` (6), `PuntoGuidaMappaDto` (10-12), `AreaGuidaMappaDto` (13),
  `ContenutiMappaDto` (14).
- Nessun DTO ha il carattere della voce né lo stato per infiltrazione.

## 6. Test coinvolti
**Server**
- `guida-pin.test.ts` (70, 84, 106, 144, 163, 181, 195, 210, 237, 254, 273, 294, 314, 368, 385, 470-602);
- `condizioni-voce.test.ts` (51-162);
- `condizioni-pin.test.ts` (61-354, in particolare 117 «lo stato si legge dalla voce»);
- `palazzo-completato.test.ts` (63-223);
- `enigmi-guida.test.ts` (59-256);
- `copia-voci-area.test.ts` (46, 140), `sposta-voce-area.test.ts` (39-142);
- `cestino.test.ts` (64, 107, 130, 165, 215-286);
- `aree-eliminabili.test.ts` (33, 59, 106);
- `guida-modificabile.test.ts:55`, `mappe-editor.test.ts:174`, `verifica-mappe.test.ts:133` (B7), `dungeon.test.ts:73`,
  `aree-dei-dedali.test.ts` (65, 97), `planimetrie-palazzo.test.ts:64`, `sulla-mappa-palazzo.test.ts:32`;
- migrazioni 094, 095, 098, utente 017 e 019;
- `cestinoService.test.ts:77-224`, `disponibilitaService.test.ts`.
- `completamento.test.ts` riguarda solo i trofei.

**FE**
- `DungeonDettaglioPage.test.tsx` (76, 173, 198-254, 401, 417, 869-1002 con 950 «planimetria vuota completa»);
- `VisoreMappa.test.tsx` (46, 85, 131, 707, 717, 731, 742, 813);
- `RaccoltaPlanimetrie.test.tsx:16`, `completamentoAree.test.ts:13-51`;
- `GuidaDellArea.test.tsx` (68, 195, 234-312, 314-420, 517-635);
- `useMappaPartita.test.tsx` (99, 112, 143), `SchedaContenutoGuida.test.tsx` (24, 30), `ContenutiGuidaAccesso.test.tsx` (56-109),
  `SchedaSpilloStato.test.tsx` (16, 35, 45);
- `MappaTokyo.test.tsx:37`;
- `shared/condizioniSpillo.test.ts:113-160`, `shared/spilli.test.ts:65-111`.

Molti di questi test fissano le regole di oggi (OR, pin con una voce, area senza voci mai completa) che L4 cambia: l'elenco va passato a
Stesura per il piano dei test.

## 7. Cosa cambierà per l'utente
1. Segnare dal pin o dalla voce diventa **la stessa azione**: non vedrà più un pin fatto con la voce aperta, o il contrario.
2. Un **permanente** (forziere, porta, scorciatoia…) segnato in un'infiltrazione risulta segnato in tutte. Un **rigenerabile** (oggetto,
   ombra-sciagura) si ripropone a ogni infiltrazione, e il pin mostra lo stato dell'infiltrazione che si guarda. Oggi ogni voce ha un solo
   stato per partita.
3. La percentuale e il 100% si calcolano su permanenti, tesoro e boss. Oggi contano i pin collezionabili, comprese le versioni doppie,
   mentre porte e meccanismi non contano.
4. «Esaurito» diventa riconoscibile; ogni voce mostra se è permanente o rigenerabile.
5. Le 154 schede senza mappa smettono di essere elementi a sé: le 149 legate diventano la loro voce, le 5 libere vanno in un elenco da
   approvare.
6. Invariati: testi, ordine, uid e posizioni dei pin; le spunte già date (nessuna voce segnata in migrazione: decisione dell'utente).

## 8. Segnalazioni per Stesura modifiche (fatti, non progetto)
- **A.** Le quattro regole di completamento (§3) vanno ridotte a una. Oggi la percentuale è sui pin e l'«area completata» sulle voci:
  cambiare base cambia le percentuali di Kamoshida e Madarame. R4-28 chiede di spiegare ogni differenza voce per voce.
- **B.** Il «Tesoro» si riconosce dal **pin** `tesoro-palazzo` (`palazziService.ts:121`), non dalla voce: con lo stato sulla voce serve una
  voce Tesoro per ogni Palazzo.
- **C.** Togliere il segno da un pin con una sola voce cancella anche un «esaurito» dato dalla guida (`mappeService.ts:1376`).
- **D.** `useMappaPartita.ts:101` ricalcola il raccolto con regole diverse dal server (include le descrittive): due valutatori.
- **E.** I tipi di voce sono definiti in tre posti (§0.7): il carattere permanente/rigenerabile va messo in un posto solo, condiviso.

## 9. Revisione dell'implementazione BE — **provvisoria** (richiesta del PM, 2026-10-20, stato del codice alle 06:48)
Autore: Analisi app attuale. Lettura del codice non committato della cartella di sviluppo, confrontato con `modifiche.md` (§0–§3, §8.1–§8.14)
e `be.md`. **Le prove sulle API (§9.3) non sono ancora fatte**: alle 06:48 il 3201 era fermo con un errore di import. `dungeonService.ts:22`
importa `fissaStatoDeiPinCheRestanoSenzaVoci`, che `statiGuida.ts` (salvato alle 06:48:14) non esporta più: BE sta ancora lavorando, e la copia
fresca `dati-produzione/2026-10-20-0440Z` non è ancora installata sul 3201. Rifaccio il §9.3 quando BE la installa.

### 9.1 Conforme (nel codice)
- **§1.1, §2.1:** `shared/caratteriVoce.ts` (un posto solo per il carattere) e la migrazione 111 (`punto_interesse.carattere`, tutta NULL).
- **§2.2:** migrazione utente 022 `divergenza_partita` (con test), presente in `RIFERIMENTI_PARTITE` (`pacchettoGiocoService.ts:82-83`) e fra
  le etichette del cestino (`cestinoService.ts:89`).
- **§8.11** (NR4-1, ogni pin tiene il suo stato):
  - migrazione utente **023** `spillo_partita_infiltrazione`. Il numero è diverso dal progetto, che prevedeva la 022: la 022 era già
    applicata, quindi si va avanti in coda, ed è motivato nel file;
  - `statoVoce` (`statiGuida.ts:241-251`): una voce con pin è fatta se tutti i suoi pin lo sono, k/N, con lo specchio in `punto_partita`;
  - `segnaIlPin` (`:541-553`) segna solo quel pin, nel contesto se è condiviso;
  - `scriviStatoVoce` (`:510-536`) segna o riapre tutti i pin della voce e rifà lo specchio delle voci toccate;
  - `statoDelPin` (`:329-341`) legge la riga per infiltrazione solo per i pin condivisi.
- **§8.10** («concluso» / «completato»):
  - `palazziService.ts` ha i due livelli, `palazziConclusi` (`:193`) per gli effetti e `MOTIVO_CONCLUSO`;
  - `shared/completamentoGuida.ts` ha `palazzoConcluso` e `palazzoCompletato`;
  - il Tesoro è fatto solo con **tutti** i pin `tesoro-palazzo` (`:137`, §8.14 Madarame 811 + 2300);
  - la mappa di Tokyo FE legge `concluso` (`MappaTokyo.tsx:407-408`).
- **§3.2:** rotte `GET /api/partite/:id/divergenze` e `DELETE …/divergenze/:spilloUid` (`partite.ts:189-192`),
  `GET /api/compendio/dungeon/:k/copie` (`compendio.ts:240`), schede da sistemare (`:244`, `:247`).

### 9.2 Manca o è diverso (da confermare a lavoro BE finito)
- **AP4-1 · bassa · Memento non identici.** Il riassunto dei dungeon (`dungeonService.ts:265`) emette `concluso: … : null` **anche per i
  Memento** (`palazzo = r.tipo === 'palazzo'`): è una chiave nuova nella loro risposta, contro R4-30. Vale la regola già decisa per L3 (NR3-1,
  strada (a)): i campi nuovi sono assenti per i Memento, non vuoti. `completato` invece c'era già prima. Da verificare sull'API
  (`GET /api/compendio/dungeon` e `/dungeon/mementos` prima/dopo).
- **AP4-2 · media · §8.14 non implementato.** Nessuna traccia di `dungeon.voce_boss_finale`: niente colonna nella migrazione 111, niente
  lettori, e nessuna scelta «Modifica › Boss finale». Il boss finale si riconosce ancora con l'euristica `bossFinali`/`eBossFinale`
  (`palazziService.ts:56-93`): basta una qualsiasi voce `boss` dell'infiltrazione più alta, e con `unico` qualunque pin `boss`, compreso il
  1657 del tutorial di Kamoshida. Le conseguenze previste dal §8.14:
  - Niijima, Shido, Maruki e Iweleth si concludono con la **prima** fase;
  - la partita «Tutorial» vede Kamoshida concluso per caso.

  Se BE ci sta ancora lavorando, il punto si chiude da solo. La 111 è già applicata ai dati di sviluppo: la colonna andrà in una migrazione
  nuova, perché le migrazioni sono append-only (come è stato fatto per la 023).
- **AP4-3 · bassa.** `spillo_partita_infiltrazione` manca:
  - in `RIFERIMENTI_PARTITE` (`pacchettoGiocoService.ts:61-100`): un pin o un'infiltrazione che spariscono la lasciano orfana senza che la
    verifica lo dica;
  - fra le `ETICHETTE` del cestino (`cestinoService.ts:69-90`).

  `divergenza_partita` invece c'è in tutte e due.
- **AP4-4 · bassa · test mancante.** La migrazione utente 023 non ha un file di test. Le altre lo hanno, e §8.11 lo chiede: 90 righe in
  Madarame p1, nessuna riga di `spillo_partita`/`punto_partita` cambiata.
- **Nota per FE (non è un difetto):** la rotta «Collega a una voce» è `PUT /api/compendio/schede/:id/voce` (`compendio.ts:247`), mentre il
  §8.8 scrive `PUT …/schede/:id { voce }`. FE deve usare quella del codice, oppure si allinea il progetto.

### 9.3 Prove sulle API — **fatte** (2026-10-20 ~07:20, anteprima del Collaudo 3302: istantanea delle 04:55Z con L3+L4 non committati, copia 0440Z, migrazioni fino alla 111 e utente 023; solo GET; script ed esito in `scratchpad/l4api/`)

> **Base superata (avviso del Collaudo, ~07:30).** L'utente ha deciso che la fonte dei dati è p5s; la nuova base è
> `dati-produzione/p5s-2026-10-20-0503Z/`, dove Kamoshida è chiuso al 100% sulla partita 1. La tabella qui sotto viene dalla copia
> 0440Z; il **secondo giro (§9.3b)** la sostituisce per tutto ciò che dipende dai dati.

#### 9.3b Secondo giro sulla base p5s-0503Z (2026-10-20 ~07:45; anteprima 3302 sulla 0503Z, installata alle 05:09Z, codice invariato: pensive alle 04:55, L3+L4; solo GET, stessi script; esito in `scratchpad/l4api/esito-0503Z.json` e `kn-0503Z.txt`, il primo giro è in `esito-0440Z.json`)

| # | Prova | Esito sulla 0503Z | Cambia rispetto alla 0440Z? |
|---|---|---|---|
| 1 | Memento identici | **No: AP4-1 confermato.** `concluso` presente nel riassunto e nel dettaglio dei Memento; `completamento` e `daVerificare` assenti | no |
| 2 | Completamento | Kamoshida p1 **concluso e completato 71/71**, `daVerificare` 0. Kamoshida p2 71/71. Madarame p1 82/82. Madarame p2, Niijima, Shido, Maruki e Iweleth: nessuno stato (oggetti 82, 34, 64, 56, 29) | **sì**: Kamoshida p1 passa da 56/71 a 71/71. Sulla base nuova la regola «completato» di L4 non toglie più il completato a Kamoshida p1, quindi **sui dati attuali NR4-2 non si vede** (da far riprovare a no-reg sulla 0503Z) |
| 3 | k/N | nessuna voce parziale: Kamoshida p1 111 voci con `avanzamento`, Madarame p1 e p2 169 | **sì**: spariscono le 3 voci in corso di Kamoshida p1 |
| 4 | Pin condivisi per infiltrazione | come prima: le Installazioni Artistiche di 153-2-0 sono fatte sia nella 1ª che nella 4ª infiltrazione in p1; il caso misto resta da provare su una partita di prova (Test funzionali) | no |
| 5 | Divergenze | `GET /api/partite/1/divergenze?dungeon=kamoshida` → **[]** | **sì**: da 4 (583, 1992, 1993, 615) a 0 |
| 6 | Schede da sistemare | Kamoshida 1, 14, 15, 16; Madarame 28 | no (sono dati di gioco) |
| 7 | Copie | `[]` | no |
| 8 | Tempi | Kamoshida 28 ms, Madarame 25 ms, planimetria con contesto 42 ms | no |

**AP4-3 non verificabile in questo giro**: il codice dell'anteprima è quello delle 04:55, che non contiene la correzione vista su pensive alle ~07:20. Va verificato alla prossima istantanea con il codice nuovo.
AP4-1, AP4-2 e AP4-4 dipendono dal codice e restano aperti.

| # | Prova | Esito |
|---|---|---|
| 1 | Memento identici | **No: AP4-1 confermato.** `GET /api/compendio/dungeon` e `/dungeon/mementos` portano la chiave `concluso` anche per i Memento (riassunto e dettaglio); `completamento` e `daVerificare` invece sono assenti, corretto |
| 2 | Completamento | Kamoshida p1 **concluso** («Tesoro e boss finale»), **non completato** 56/71, `daVerificare` 4. Kamoshida p2 concluso e completato 71/71. Madarame p1 concluso e completato **82/82** oggetti: sono le 101 voci permanenti unite dai pin, conteggio per oggetto (R4-24). Il boss viene ancora dall'euristica (AP4-2), ma su Madarame dà lo stesso esito di §8.14, perché la voce in ordine 19 sta nell'ultima infiltrazione. Madarame p2 niente. Niijima, Shido, Maruki e Iweleth non hanno stati nelle partite: l'effetto di AP4-2 sulle loro fasi non si vede sui dati, resta dal codice |
| 3 | k/N | Kamoshida p1: **3 voci in corso** (Recupero 2 Seme della Bramosia 1/4, Sconfiggi i Capitani delle Guardie 2/4, Raccogli Forziere 1/3), come da §8.11.9. Madarame p1 e p2: nessuna voce parziale. Campi `avanzamento {fatti, totale}` e `condivise` sulle voci |
| 4 | Pin condivisi per infiltrazione | Sulla planimetria 153-2-0 i pin delle Installazioni Artistiche hanno `contestoInfiltrazione` e stato per infiltrazione (1ª e 4ª fatti in p1). In p1 sono tutti fatti, in p2 nessuno: sui dati reali non c'è un caso «fatto nella 2ª, da fare nella 4ª». È un caso per Test funzionali, su una partita di prova |
| 5 | Divergenze | `GET /api/partite/1/divergenze?dungeon=kamoshida` → 4: pin 583, 1992, 1993, 615 (come §8.11.6) |
| 6 | Schede da sistemare | Kamoshida 1, 14, 15, 16; Madarame 28 |
| 7 | Copie | `GET /dungeon/madarame/copie` → `[]` |
| 8 | Tempi | scheda di Kamoshida 25 ms, di Madarame 29 ms, planimetria con contesto ~30 ms |

**Stato dei difetti a chiusura della revisione (codice di pensive alle ~07:20, che è più avanti dell'istantanea):**
- **AP4-1:** confermato sull'API, ancora presente nel codice (`dungeonService.ts:272`).
- **AP4-2:** confermato, `voce_boss_finale` assente.
- **AP4-3:** **corretto da BE su pensive** (`pacchettoGiocoService.ts:87-88`, `cestinoService.ts:92`), da verificare alla prossima istantanea.
- **AP4-4:** aperto (manca il test della 023).
Tutte in sola lettura (GET), più i gesti su una partita di prova solo se Test funzionali non li ha già fatti:
1. Memento identici prima/dopo (chiavi comprese).
2. Kamoshida p1 concluso e non completato (56/71); Madarame p1 concluso e completato (101/101) con `voce_boss_finale` dopo §8.14.
3. Installazioni Artistiche k/N.
4. Pin condivisi di Madarame per infiltrazione.
5. Le 4 divergenze di Kamoshida p1.
6. `schedeDaSistemare`: Kamoshida 4, Madarame 1.
7. `GET /copie` vuoto.
8. Tempi della scheda.
