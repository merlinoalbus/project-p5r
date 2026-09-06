# Nomi e varianti: copertura completa

{
  "originalRoadmapDDSCodes": 313,
  "metadataCodes": 301,
  "records": 301,
  "missingFromInventory": [],
  "originalCodesOutsidePlanimetries": [
    {
      "code": "RMAP_001_1_1",
      "exclusion": {
        "code": "RMAP_001_1_1",
        "source": "png/BASE/FIELD/PANEL/ROADMAP/RMAP_001_1_1.png",
        "reason": "Risorsa uniforme, vuota o simbolo isolato; non presentata come planimetria",
        "visible_colors": 4
      }
    },
    {
      "code": "RMAP_150_1_0",
      "exclusion": {
        "code": "RMAP_150_1_0",
        "source": "png/BASE/FIELD/PANEL/ROADMAP/RMAP_150_1_0.png",
        "reason": "Risorsa uniforme, vuota o simbolo isolato; non presentata come planimetria",
        "visible_colors": 1
      }
    },
    {
      "code": "RMAP_150_1_1",
      "exclusion": {
        "code": "RMAP_150_1_1",
        "source": "png/BASE/FIELD/PANEL/ROADMAP/RMAP_150_1_1.png",
        "reason": "Risorsa uniforme, vuota o simbolo isolato; non presentata come planimetria",
        "visible_colors": 1
      }
    },
    {
      "code": "RMAP_150_1_2",
      "exclusion": {
        "code": "RMAP_150_1_2",
        "source": "png/BASE/FIELD/PANEL/ROADMAP/RMAP_150_1_2.png",
        "reason": "Risorsa uniforme, vuota o simbolo isolato; non presentata come planimetria",
        "visible_colors": 1
      }
    },
    {
      "code": "RMAP_150_1_3",
      "exclusion": {
        "code": "RMAP_150_1_3",
        "source": "png/BASE/FIELD/PANEL/ROADMAP/RMAP_150_1_3.png",
        "reason": "Risorsa uniforme, vuota o simbolo isolato; non presentata come planimetria",
        "visible_colors": 1
      }
    },
    {
      "code": "RMAP_150_2_0",
      "exclusion": {
        "code": "RMAP_150_2_0",
        "source": "png/BASE/FIELD/PANEL/ROADMAP/RMAP_150_2_0.png",
        "reason": "Risorsa uniforme, vuota o simbolo isolato; non presentata come planimetria",
        "visible_colors": 1
      }
    },
    {
      "code": "RMAP_152_0_0",
      "exclusion": {
        "code": "RMAP_152_0_0",
        "source": "png/BASE/FIELD/PANEL/ROADMAP/RMAP_152_0_0.png",
        "reason": "Risorsa uniforme, vuota o simbolo isolato; non presentata come planimetria",
        "visible_colors": 1
      }
    },
    {
      "code": "RMAP_152_3_0",
      "exclusion": {
        "code": "RMAP_152_3_0",
        "source": "png/BASE/FIELD/PANEL/ROADMAP/RMAP_152_3_0.png",
        "reason": "Risorsa uniforme, vuota o simbolo isolato; non presentata come planimetria",
        "visible_colors": 1
      }
    },
    {
      "code": "RMAP_153_0_0",
      "exclusion": {
        "code": "RMAP_153_0_0",
        "source": "png/BASE/FIELD/PANEL/ROADMAP/RMAP_153_0_0.png",
        "reason": "Risorsa uniforme, vuota o simbolo isolato; non presentata come planimetria",
        "visible_colors": 1
      }
    },
    {
      "code": "RMAP_157_18_0",
      "exclusion": {
        "code": "RMAP_157_18_0",
        "source": "png/BASE/FIELD/PANEL/ROADMAP/RMAP_157_18_0.png",
        "reason": "Risorsa uniforme, vuota o simbolo isolato; non presentata come planimetria",
        "visible_colors": 1
      }
    },
    {
      "code": "RMAP_160_7_0",
      "exclusion": {
        "code": "RMAP_160_7_0",
        "source": "png/BASE/FIELD/PANEL/ROADMAP/RMAP_160_7_0.png",
        "reason": "Risorsa uniforme, vuota o simbolo isolato; non presentata come planimetria",
        "visible_colors": 1
      }
    },
    {
      "code": "RMAP_190_2_3",
      "exclusion": {
        "code": "RMAP_190_2_3",
        "source": "png/BASE/FIELD/PANEL/ROADMAP/RMAP_190_2_3.png",
        "reason": "Risorsa uniforme, vuota o simbolo isolato; non presentata come planimetria",
        "visible_colors": 0
      }
    }
  ],
  "unaccountedOriginalCodes": [],
  "statuses": {
    "nome-campo-verificato": 19,
    "identita-irrisolta": 83,
    "titolo-native-verificato": 199
  },
  "sameTitleFamilies": 55,
  "exactVisibleImageFamilies": 5,
  "mergeApproved": 0
}

## Decisioni utilizzabili

- I titoli nativi dei record sono applicabili conservando provenienza e codici nei metadati.
- Famiglie con stesso titolo: raggruppamento possibile, cancellazione non dimostrata.
- Cinque famiglie con pixel visibili uguali riutilizzano la stessa immagine: nessuna dimostra nodi operativi equivalenti.
- Scuola: conservare tutti e tre i piani RMAP0020 e associarli alla scuola, oltre cancello e tetto. Aula e Biblioteca non vanno usate per sostituire i piani.

## Identita irrisolte

- RMAP_001_2_1 | Shibuya | campi: nessuno | Individuare selettore della risorsa DDS negli script/eventi o configurazione nativa: nessun campo ROADMAP associato. Non assegnare il nome del campo con stesso codice.
- RMAP_002_6_0 | Shujin Academy | campi: nessuno | Verificare associazione texture al campo: FLDPLACENO contiene nome corrispondente major/minor ma ROADMAP non usa questa risorsa; identita del campo non prova utilizzo della texture.
- RMAP_002_8_0 | Shujin Academy | campi: nessuno | Verificare associazione texture al campo: FLDPLACENO contiene nome corrispondente major/minor ma ROADMAP non usa questa risorsa; identita del campo non prova utilizzo della texture.
- RMAP_022_1_0 | Covo dei Ladri | campi: F022_001_00 | Determinare significato dei cinque layer del Covo dal selettore livelli; identita comune Covo dei Ladri verificata, titoli singoli non presenti.
- RMAP_022_1_1 | Covo dei Ladri | campi: F022_001_00 | Determinare significato dei cinque layer del Covo dal selettore livelli; identita comune Covo dei Ladri verificata, titoli singoli non presenti.
- RMAP_022_1_2 | Covo dei Ladri | campi: F022_001_00 | Determinare significato dei cinque layer del Covo dal selettore livelli; identita comune Covo dei Ladri verificata, titoli singoli non presenti.
- RMAP_022_1_3 | Covo dei Ladri | campi: F022_001_00 | Determinare significato dei cinque layer del Covo dal selettore livelli; identita comune Covo dei Ladri verificata, titoli singoli non presenti.
- RMAP_022_1_4 | Covo dei Ladri | campi: F022_001_00 | Determinare significato dei cinque layer del Covo dal selettore livelli; identita comune Covo dei Ladri verificata, titoli singoli non presenti.
- RMAP_150_3_0 | Luogo 150 | campi: F150_003_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_150_3_1 | Luogo 150 | campi: F150_003_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_151_0_0 | Palazzo di Kamoshida | campi: nessuno | Individuare selettore della risorsa DDS negli script/eventi o configurazione nativa: nessun campo ROADMAP associato. Non assegnare il nome del campo con stesso codice.
- RMAP_151_0_1 | Palazzo di Kamoshida | campi: nessuno | Individuare selettore della risorsa DDS negli script/eventi o configurazione nativa: nessun campo ROADMAP associato. Non assegnare il nome del campo con stesso codice.
- RMAP_151_16_0 | Palazzo di Kamoshida | campi: F151_016_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_152_11_0 | Palazzo di Kamoshida | campi: nessuno | Individuare selettore della risorsa DDS negli script/eventi o configurazione nativa: nessun campo ROADMAP associato. Non assegnare il nome del campo con stesso codice.
- RMAP_152_11_1 | Palazzo di Kamoshida | campi: nessuno | Individuare selettore della risorsa DDS negli script/eventi o configurazione nativa: nessun campo ROADMAP associato. Non assegnare il nome del campo con stesso codice.
- RMAP_152_5_0 | Palazzo di Kamoshida | campi: F152_005_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_153_10_0 | Palazzo di Madarame | campi: nessuno | Individuare selettore della risorsa DDS negli script/eventi o configurazione nativa: nessun campo ROADMAP associato. Non assegnare il nome del campo con stesso codice.
- RMAP_153_11_0 | Palazzo di Madarame | campi: nessuno | Individuare selettore della risorsa DDS negli script/eventi o configurazione nativa: nessun campo ROADMAP associato. Non assegnare il nome del campo con stesso codice.
- RMAP_153_12_0 | Palazzo di Madarame | campi: nessuno | Individuare selettore della risorsa DDS negli script/eventi o configurazione nativa: nessun campo ROADMAP associato. Non assegnare il nome del campo con stesso codice.
- RMAP_153_13_0 | Palazzo di Madarame | campi: nessuno | Individuare selettore della risorsa DDS negli script/eventi o configurazione nativa: nessun campo ROADMAP associato. Non assegnare il nome del campo con stesso codice.
- RMAP_153_3_0 | Palazzo di Madarame | campi: F153_051_00, F153_003_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_153_4_0 | Palazzo di Madarame | campi: F153_051_00, F153_004_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_153_5_0 | Palazzo di Madarame | campi: F153_051_00, F153_005_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_153_5_1 | Palazzo di Madarame | campi: nessuno | Individuare selettore della risorsa DDS negli script/eventi o configurazione nativa: nessun campo ROADMAP associato. Non assegnare il nome del campo con stesso codice.
- RMAP_153_6_0 | Palazzo di Madarame | campi: F153_051_00, F153_006_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_153_6_1 | Palazzo di Madarame | campi: F153_051_00, F153_006_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_153_8_0 | Palazzo di Madarame | campi: nessuno | Individuare selettore della risorsa DDS negli script/eventi o configurazione nativa: nessun campo ROADMAP associato. Non assegnare il nome del campo con stesso codice.
- RMAP_153_8_1 | Palazzo di Madarame | campi: nessuno | Individuare selettore della risorsa DDS negli script/eventi o configurazione nativa: nessun campo ROADMAP associato. Non assegnare il nome del campo con stesso codice.
- RMAP_153_8_2 | Palazzo di Madarame | campi: nessuno | Individuare selettore della risorsa DDS negli script/eventi o configurazione nativa: nessun campo ROADMAP associato. Non assegnare il nome del campo con stesso codice.
- RMAP_153_9_0 | Palazzo di Madarame | campi: F153_051_00, F153_009_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_153_9_1 | Palazzo di Madarame | campi: F153_051_00, F153_009_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_153_9_2 | Palazzo di Madarame | campi: F153_051_00, F153_009_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_154_12_0 | Palazzo di Kaneshiro | campi: F154_012_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_154_12_1 | Palazzo di Kaneshiro | campi: F154_012_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_154_12_2 | Palazzo di Kaneshiro | campi: F154_012_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_154_13_0 | Palazzo di Kaneshiro | campi: F154_013_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_154_13_1 | Palazzo di Kaneshiro | campi: F154_013_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_154_13_2 | Palazzo di Kaneshiro | campi: F154_013_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_154_15_0 | Palazzo di Kaneshiro | campi: F154_015_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_154_5_0 | Palazzo di Kaneshiro | campi: F154_051_00, F154_005_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_155_10_0 | Palazzo di Futaba | campi: nessuno | Individuare selettore della risorsa DDS negli script/eventi o configurazione nativa: nessun campo ROADMAP associato. Non assegnare il nome del campo con stesso codice.
- RMAP_155_2_2 | Palazzo di Futaba | campi: nessuno | Individuare selettore della risorsa DDS negli script/eventi o configurazione nativa: nessun campo ROADMAP associato. Non assegnare il nome del campo con stesso codice.
- RMAP_155_2_3 | Palazzo di Futaba | campi: nessuno | Individuare selettore della risorsa DDS negli script/eventi o configurazione nativa: nessun campo ROADMAP associato. Non assegnare il nome del campo con stesso codice.
- RMAP_155_3_2 | Palazzo di Futaba | campi: nessuno | Individuare selettore della risorsa DDS negli script/eventi o configurazione nativa: nessun campo ROADMAP associato. Non assegnare il nome del campo con stesso codice.
- RMAP_156_10_0 | Palazzo di Okumura | campi: F156_051_00, F156_010_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_156_11_2 | Palazzo di Okumura | campi: nessuno | Individuare selettore della risorsa DDS negli script/eventi o configurazione nativa: nessun campo ROADMAP associato. Non assegnare il nome del campo con stesso codice.
- RMAP_156_11_3 | Palazzo di Okumura | campi: nessuno | Individuare selettore della risorsa DDS negli script/eventi o configurazione nativa: nessun campo ROADMAP associato. Non assegnare il nome del campo con stesso codice.
- RMAP_156_12_0 | Palazzo di Okumura | campi: F156_051_00, F156_012_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_156_9_0 | Palazzo di Okumura | campi: F156_051_00, F156_009_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_156_9_1 | Palazzo di Okumura | campi: nessuno | Individuare selettore della risorsa DDS negli script/eventi o configurazione nativa: nessun campo ROADMAP associato. Non assegnare il nome del campo con stesso codice.
- RMAP_157_17_0 | Palazzo di Niijima | campi: F157_017_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_157_3_0 | Palazzo di Niijima | campi: F157_003_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_157_3_1 | Palazzo di Niijima | campi: F157_003_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_157_5_1 | Palazzo di Niijima | campi: F157_051_00, F157_052_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_157_7_1 | Palazzo di Niijima | campi: nessuno | Individuare selettore della risorsa DDS negli script/eventi o configurazione nativa: nessun campo ROADMAP associato. Non assegnare il nome del campo con stesso codice.
- RMAP_159_10_0 | Palazzo di Shido | campi: F159_051_00, F159_010_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_159_10_1 | Palazzo di Shido | campi: F159_051_00, F159_010_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_159_15_0 | Palazzo di Shido | campi: nessuno | Individuare selettore della risorsa DDS negli script/eventi o configurazione nativa: nessun campo ROADMAP associato. Non assegnare il nome del campo con stesso codice.
- RMAP_159_16_0 | Palazzo di Shido | campi: nessuno | Individuare selettore della risorsa DDS negli script/eventi o configurazione nativa: nessun campo ROADMAP associato. Non assegnare il nome del campo con stesso codice.
- RMAP_159_3_0 | Palazzo di Shido | campi: F159_051_00, F159_003_00, F159_004_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_159_3_1 | Palazzo di Shido | campi: F159_051_00, F159_003_00, F159_004_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_159_6_0 | Palazzo di Shido | campi: F159_051_00, F159_006_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_159_6_1 | Palazzo di Shido | campi: F159_051_00, F159_006_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_159_6_2 | Palazzo di Shido | campi: F159_051_00, F159_006_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_159_7_0 | Palazzo di Shido | campi: F159_051_00, F159_007_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_159_8_0 | Palazzo di Shido | campi: F159_008_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_160_10_0 | Mondo del clifoto | campi: F160_010_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_160_10_1 | Mondo del clifoto | campi: F160_010_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_160_4_1 | Mondo del clifoto | campi: nessuno | Individuare selettore della risorsa DDS negli script/eventi o configurazione nativa: nessun campo ROADMAP associato. Non assegnare il nome del campo con stesso codice.
- RMAP_160_4_2 | Mondo del clifoto | campi: nessuno | Individuare selettore della risorsa DDS negli script/eventi o configurazione nativa: nessun campo ROADMAP associato. Non assegnare il nome del campo con stesso codice.
- RMAP_161_2_1 | Profondità dei Memento | campi: nessuno | Individuare selettore della risorsa DDS negli script/eventi o configurazione nativa: nessun campo ROADMAP associato. Non assegnare il nome del campo con stesso codice.
- RMAP_161_2_2 | Profondità dei Memento | campi: nessuno | Individuare selettore della risorsa DDS negli script/eventi o configurazione nativa: nessun campo ROADMAP associato. Non assegnare il nome del campo con stesso codice.
- RMAP_161_4_1 | Profondità dei Memento | campi: nessuno | Individuare selettore della risorsa DDS negli script/eventi o configurazione nativa: nessun campo ROADMAP associato. Non assegnare il nome del campo con stesso codice.
- RMAP_161_4_2 | Profondità dei Memento | campi: nessuno | Individuare selettore della risorsa DDS negli script/eventi o configurazione nativa: nessun campo ROADMAP associato. Non assegnare il nome del campo con stesso codice.
- RMAP_161_6_1 | Profondità dei Memento | campi: nessuno | Individuare selettore della risorsa DDS negli script/eventi o configurazione nativa: nessun campo ROADMAP associato. Non assegnare il nome del campo con stesso codice.
- RMAP_190_1_0 | Memento - aree fisse | campi: F190_001_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_190_2_0 | Memento - aree fisse | campi: F191_011_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_190_3_0 | Memento - aree fisse | campi: F191_061_00, F192_011_00, F193_011_00, F193_061_00, F194_011_00, F194_061_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_190_51_0 | Memento - aree fisse | campi: F191_065_00, F192_015_00, F193_015_00, F193_065_00, F194_015_00, F194_065_00, F195_015_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_190_61_0 | Memento - aree fisse | campi: F192_061_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_190_62_0 | Memento - aree fisse | campi: nessuno | Individuare selettore della risorsa DDS negli script/eventi o configurazione nativa: nessun campo ROADMAP associato. Non assegnare il nome del campo con stesso codice.
- RMAP_192_62_0 | Memento - aree fisse | campi: F192_062_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.
- RMAP_195_11_0 | Memento - aree fisse | campi: F195_011_00 | Titolo assente/ambiguo in fld_texpack_title.ftd: correlare i campi indicati con intestazioni di salvataggio/eventi e selettore layer nativo; conservare riferimento originale.

## Famiglie di immagine identica

[
  {
    "codes": [
      "RMAP_151_2_1",
      "RMAP_151_3_0",
      "RMAP_151_4_0"
    ],
    "sameVisiblePixels": true,
    "sameCanvasPixels": true,
    "sameFieldSets": false,
    "titles": [
      "Vecchio castello 2P",
      "Vecchio castello 2P",
      "Vecchio castello 2P"
    ],
    "mergeApproved": false,
    "reason": "Immagine riutilizzata in campi distinti oppure risorsa senza associazione. Unificabile il file immagine, non dimostrata equivalenza dei nodi di navigazione."
  },
  {
    "codes": [
      "RMAP_155_4_0",
      "RMAP_155_6_0"
    ],
    "sameVisiblePixels": true,
    "sameCanvasPixels": true,
    "sameFieldSets": false,
    "titles": [
      "Camera del Santuario 1P",
      "Camera del Santuario 1P"
    ],
    "mergeApproved": false,
    "reason": "Immagine riutilizzata in campi distinti oppure risorsa senza associazione. Unificabile il file immagine, non dimostrata equivalenza dei nodi di navigazione."
  },
  {
    "codes": [
      "RMAP_159_2_3",
      "RMAP_159_3_0",
      "RMAP_159_9_0"
    ],
    "sameVisiblePixels": true,
    "sameCanvasPixels": true,
    "sameFieldSets": false,
    "titles": [
      "Sala d'ingresso",
      null,
      "Ristorante"
    ],
    "mergeApproved": false,
    "reason": "Immagine riutilizzata in campi distinti oppure risorsa senza associazione. Unificabile il file immagine, non dimostrata equivalenza dei nodi di navigazione."
  },
  {
    "codes": [
      "RMAP_161_4_0",
      "RMAP_161_7_0"
    ],
    "sameVisiblePixels": true,
    "sameCanvasPixels": true,
    "sameFieldSets": false,
    "titles": [
      "Vuoto cavernoso",
      "Vuoto cavernoso"
    ],
    "mergeApproved": false,
    "reason": "Immagine riutilizzata in campi distinti oppure risorsa senza associazione. Unificabile il file immagine, non dimostrata equivalenza dei nodi di navigazione."
  },
  {
    "codes": [
      "RMAP_190_61_0",
      "RMAP_190_62_0"
    ],
    "sameVisiblePixels": true,
    "sameCanvasPixels": true,
    "sameFieldSets": false,
    "titles": [
      null,
      null
    ],
    "mergeApproved": false,
    "reason": "Immagine riutilizzata in campi distinti oppure risorsa senza associazione. Unificabile il file immagine, non dimostrata equivalenza dei nodi di navigazione."
  }
]

## Limite esplicito

La copertura del censimento e completa; la risoluzione semantica dei nomi non lo e. Non sono state inventate etichette per mascherare i casi irrisolti. Non sono stati modificati app, database o esportatore.