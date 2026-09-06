import type { EsportazioneMappeDto } from '../../../shared/types.js';
export const RETTIFICHE_NOMI_SEED: Array<{mappa:string;prima:EsportazioneMappeDto['mappe'][number]['spilli'][number];dopo:EsportazioneMappeDto['mappe'][number]['spilli'][number]}> = [
  {
    "mappa": "citta-yongen-jaya",
    "prima": {
      "tipo": "passaggio",
      "nome": "Yongen-Java Banchina della metropolitana",
      "descrizione": "Sottopasso verso Yongen-Java Banchina della metropolitana",
      "x": 88.3,
      "y": 6.8,
      "riferimento": {
        "tipo": "mappa",
        "chiave": "yongen-java-banchina-della-metropolitana"
      },
      "collezionabile": false,
      "ordine": 0,
      "immagini": [
        {
          "asset": "spilli/citta-yongen-jaya/2-1",
          "didascalia": ""
        }
      ]
    },
    "dopo": {
      "tipo": "passaggio",
      "nome": "Yongen-Jaya Banchina della metropolitana",
      "descrizione": "Sottopasso verso Yongen-Jaya Banchina della metropolitana",
      "x": 88.3,
      "y": 6.8,
      "riferimento": {
        "tipo": "mappa",
        "chiave": "yongen-java-banchina-della-metropolitana"
      },
      "collezionabile": false,
      "ordine": 0,
      "immagini": [
        {
          "asset": "spilli/citta-yongen-jaya/2-1",
          "didascalia": ""
        }
      ]
    }
  },
  {
    "mappa": "citta-yongen-jaya",
    "prima": {
      "tipo": "passaggio",
      "nome": "Yongen-Java Banchina della metropolitana",
      "descrizione": "Vicolo verso Yongen-Java Banchina della metropolitana",
      "x": 76.8,
      "y": 83.4,
      "riferimento": {
        "tipo": "mappa",
        "chiave": "yongen-java-banchina-della-metropolitana"
      },
      "collezionabile": false,
      "ordine": 0,
      "immagini": [
        {
          "asset": "spilli/citta-yongen-jaya/3-1",
          "didascalia": ""
        }
      ]
    },
    "dopo": {
      "tipo": "passaggio",
      "nome": "Yongen-Jaya Banchina della metropolitana",
      "descrizione": "Vicolo verso Yongen-Jaya Banchina della metropolitana",
      "x": 76.8,
      "y": 83.4,
      "riferimento": {
        "tipo": "mappa",
        "chiave": "yongen-java-banchina-della-metropolitana"
      },
      "collezionabile": false,
      "ordine": 0,
      "immagini": [
        {
          "asset": "spilli/citta-yongen-jaya/3-1",
          "didascalia": ""
        }
      ]
    }
  },
  {
    "mappa": "yongen-java-banchina-della-metropolitana",
    "prima": {
      "tipo": "passaggio",
      "nome": "Yongen-Java Vicoli",
      "descrizione": "Scale mobili verso Yongen-Java Vicoli",
      "x": 75.2,
      "y": 22.1,
      "riferimento": {
        "tipo": "mappa",
        "chiave": "citta-yongen-jaya"
      },
      "collezionabile": false,
      "ordine": 0
    },
    "dopo": {
      "tipo": "passaggio",
      "nome": "Yongen-Jaya Vicoli",
      "descrizione": "Scale mobili verso Yongen-Jaya Vicoli",
      "x": 75.2,
      "y": 22.1,
      "riferimento": {
        "tipo": "mappa",
        "chiave": "citta-yongen-jaya"
      },
      "collezionabile": false,
      "ordine": 0
    }
  },
  {
    "mappa": "yongen-java-banchina-della-metropolitana",
    "prima": {
      "tipo": "passaggio",
      "nome": "Yongen-Java Vicoli",
      "descrizione": "Sottopasso verso Yongen-Java Vicoli",
      "x": 80.8,
      "y": 28.5,
      "riferimento": {
        "tipo": "mappa",
        "chiave": "citta-yongen-jaya"
      },
      "collezionabile": false,
      "ordine": 0
    },
    "dopo": {
      "tipo": "passaggio",
      "nome": "Yongen-Jaya Vicoli",
      "descrizione": "Sottopasso verso Yongen-Jaya Vicoli",
      "x": 80.8,
      "y": 28.5,
      "riferimento": {
        "tipo": "mappa",
        "chiave": "citta-yongen-jaya"
      },
      "collezionabile": false,
      "ordine": 0
    }
  }
];
