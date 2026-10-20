# Ricognizione L3 — aree e infiltrazioni dei Palazzi (copia di produzione data/, sola lettura, 2026-10-20)

## Numeri
- Stanze (gruppi `mappa_presentazione.gruppo_immagini_json` + planimetrie sciolte) → **101 aree** negli 8 Palazzi (kamoshida 10, madarame 8, kaneshiro 13, futaba 18, okumura 11, niijima 13, shido 16, maruki 12) + 16 di Iweleth.
- Planimetrie: 219 (+26 Iweleth), profondità 1 ovunque, tutte `planimetria-nativa`. `mappa.entita_*` coerenti con `mappa_entita` (0 divergenze).
- Coppie infiltrazione↔area: **92** dai legami `mappa_entita(entita_tipo='area')` + 1 dal pin 777 di Madarame (153-5-0 «Giardino centrale» → `il-furto-del-cuore-di-madarame`).
- 15 infiltrazioni senza planimetria: kaneshiro -02, -05; futaba -02,-04,-07,-08,-09,-10; niijima -05,-08,-10; shido -02,-12,-13,-15.
- 126 planimetrie senza infiltrazione; 31 aree senza infiltrazione.
- Lavoro da preservare: Kamoshida 169 voci (32 passi Enigma), 302 punto_partita (p1 133, p2 169), 367 spilli (10 seed), 255 spillo_voce, 472 spillo_partita (468 raccolti), 96 spillo_destinazione, 10 pezzi, 10 copie, 3 atterraggi (152-2-0 con spillo 1657, 151-16-0, 151-1-0). Madarame 225 voci (49 passi), 221 punto_partita, 258 spilli (6 seed), 284 spillo_voce, 276 spillo_partita (p1 199/199, p2 0/77), 61 destinazioni, 14 pezzi, 32 copie. Altri Palazzi solo seed.

## Anomalie
- Nessun gruppo mescola genitori/Palazzi. 3 id di gruppo non chiave di mappa (Kamoshida): `utente:nativo-rmap-151-2-0`, `utente:nativo-rmap-151-7-0`, `utente:nativo-rmap-151-9-0` (da `aggiornaPresentazioneMappa`, mappeService.ts:626).
- Ordine versioni ≠ ordine mappe in `152-1-0` (2/0/3/4/1) e `153-7-0` (2/1/0): l'elenco mostra ordine di mappa, `etichettaVersione` ripiega su gruppo.ordine+1.
- Radice `dungeon-kamoshida` con 2 spilli utente (1735→151-1-0, 1816→151-16-0); spillo 1815 su 151-1-0 con riferimento_chiave='dungeon-kamoshida'.
- Madarame: `palazzo-di-madarame-il-labirinto-contorto` tipo `generica` sciolta con immagine caricata.

## Codice coinvolto (server)
mappeService.ts: contestoMappe 76-91, aggiornaPresentazioneMappa 616-645 (+rinominaGruppo 666, nomeDelGruppo 660, tavoleDelGruppo 653, gruppoConNomeRivisto 695), nomeStanzaDaFissare 681-692 (chiamata da aggiornaMappa 891), impostaStanzaMappa 711-770, riordinaMappe 777-806, impostaAreeMappa 575-594, sincronizzaLegameEntita 484-507, verificaAreePalazzo 514, allineaColonneArea 531, areeDellaMappa 540, staccaAreaDaOgniMappa 550, areePerPacchetto 563, import/export 1685-1732/1848, creaMappa 814-845, mappaPerEntita 455.
dungeonService.ts: mappeDelleAree 91-105, planimetrieDelPalazzo 284-307, raccoltaMappe 134-159, creaArea 600-625, eliminaArea 423-434/522-543, cestino tipo 'area' 430, rimettiAreaAlPosto 481-490 (CHECK cestino.tipo: area|voce|mappa|area-dedalo).
palazziService.ts: areeDelleMappe 63-72, eBossFinale 83-88, ingressoDelPalazzo 188-209. contenutiGuidaService 57-66, accessoMondoService 129-146, catalogoService 312, cestinoService 73.
## Codice coinvolto (FE)
gruppiPlanimetrie.ts 49-118, presentazioneMappa.ts 56-75, etichettaVersione.ts 15-29, PlanimetriePalazzo.tsx (263-507: raggruppa, riordino, nuovaSezione, salvaScheda, conteggi, «Nuova planimetria» → editor), completamentoAree.ts, DungeonDettaglioPage.tsx (136 ?area=, 245-321 scelta/collega planimetria, 551-573 «— scegli una planimetria —», 615-619), MappaPage.tsx (72-165 IndiceMappe, 234-279 LuogoSenzaPlanimetria = griglia del Palazzo, 390, 393, 405), AlberoLuoghi 32/56, ImmaginiLuogo 20-31, api mappe.ts 27-36, compendio.ts 125-151, shared/types.ts 2039/2279/1939.
## Link da portare alla scheda `/guida/dungeon/<k>`
RisolviMappa.tsx:13 (80 guida_alias nei Palazzi), MappaIncorporata 65/110, AccessoMondoPage 59/99, contenutiGuidaService destinazioneGuida 22-28, accessoMondoService 129-146 (escludere radice), MappaTokyo 391-393, percorso.ts 36-38 + PartiAzione 44-49, MappaPage 146/189/361/390/268/403, ContenutiGuidaMappa 32/41, BattagliaPage 122, RichiestePage 146 (Memento: non toccare), accessoMondo.ts 14-24.

## DTO
`AreaDungeonDto` (shared/types.ts:1793) è condiviso con i dedali dei Memento: proposta alias `InfiltrazioneDto`, campo nuovo `areePalazzo: AreaPalazzoDto[]` al posto di `planimetrie`, `InfiltrazioneDto.aree: string[]` al posto di `mappe`; non rinominare `DungeonDettaglioDto.aree` (toccherebbe i Memento). Nota: in L1 il campo `AreaDungeonDto.mappa` (booleano morto) è stato rimosso.

## Proposta di schema (migrazione col numero successivo all'ultimo su newreview)
```sql
CREATE TABLE area_palazzo (chiave TEXT PRIMARY KEY, dungeon_chiave TEXT NOT NULL REFERENCES dungeon(chiave) ON DELETE CASCADE,
  nome TEXT NOT NULL, nome_rivisto INTEGER NOT NULL DEFAULT 0, ordine INTEGER NOT NULL,
  planimetria_predefinita TEXT REFERENCES mappa(chiave) ON DELETE SET NULL,
  origine TEXT NOT NULL DEFAULT 'utente' CHECK (origine IN ('seed','utente')), updated_at TEXT NOT NULL);
ALTER TABLE mappa ADD COLUMN area_chiave TEXT REFERENCES area_palazzo(chiave) ON DELETE SET NULL;
ALTER TABLE mappa ADD COLUMN etichetta_versione TEXT;
ALTER TABLE mappa ADD COLUMN ordine_in_area INTEGER;
CREATE TABLE infiltrazione_area (infiltrazione_chiave TEXT NOT NULL REFERENCES dungeon_area(chiave) ON DELETE CASCADE,
  area_chiave TEXT NOT NULL REFERENCES area_palazzo(chiave) ON DELETE CASCADE,
  planimetria_iniziale TEXT REFERENCES mappa(chiave) ON DELETE SET NULL, PRIMARY KEY (infiltrazione_chiave, area_chiave));
```
Migrazione: aree dai gruppi + sciolte (nome = titolo di presentazione di oggi: nomeRivisto ? nome : senzaGergo(nome)); ordine = prima planimetria; ordine_in_area = ordine di mappa visibile oggi; etichetta_versione = gruppo.etichetta o il testo che etichettaVersione mostra oggi; infiltrazione_area = unione per area (92) + coppia del pin 777; planimetria_iniziale = prima planimetria già legata. Pulizia: `mappa_entita` area (130 righe) e `mappa.entita_*='area'` (105), `gruppo_immagini_json` azzerato SOLO sui Palazzi. Voci/spilli/stati/pezzi/destinazioni/atterraggi/chiavi intatti. Test della migrazione con i conteggi sopra.

## Casi ambigui (decidere con la scelta consigliata, registrarla «da confermare», elencarli nel resoconto)
1. Granularità: 95 coppie planimetria×infiltrazione implicite in più (Kamoshida 14, Madarame 11) — accettarle o conservare il legame alla planimetria.
2. Coppia (153-5-0, FUR) dal pin 777.
3. Chiavi nuove `area-<dungeon>-<slug>` per tutte le aree (non riusare id di gruppo).
4. Planimetrie senza infiltrazione in aree con infiltrazioni (151-1-1, 151-6-0 «Scala») ereditano.
5. Le 15 infiltrazioni senza planimetria → «da collocare».
6. Radice dungeon-kamoshida con spilli utente 1735/1816 e spillo 1815.
7. Iweleth (D3 consigliata = solo dedalo dei Memento; lotto L8 o L3): 38 voci su 47 con tipi non ammessi nei dedali (solo persona/trama: shared/dedali.ts:21-23, dungeonService 654-657); 9 Persona doppie con mementos-08-iweleth/7..15; 12 spilli guida con FK RESTRICT; 26 planimetrie/55 spilli; scambio Parte III/IV su 160-4-0/160-5-0; area-8 «???» senza corrispondenza; riga `dungeon iweleth` usata in condizioniSpillo.ts:29, collocazioneTokyo.ts:145, palazzi.ts:5/41, DungeonPage.tsx:5-9/44, migrazione 101:45. Iweleth non ha stato di partita (0 righe).
