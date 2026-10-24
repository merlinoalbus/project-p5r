// ============================================================
// descrizioni — il registro in italiano di tutte le rotte, per area, e i nomi delle aree (tag OpenAPI)
// ============================================================
//
// Una rotta senza descrizione, o una descrizione senza rotta, fa fallire `openapi.test.ts`: il registro
// non può restare indietro rispetto ai router.
// ============================================================

import type { AreaApi, DescrizioniArea } from '../tipi.js';
import { DESCRIZIONI_AREE } from './aree.js';
import { DESCRIZIONI_CATALOGO } from './catalogo.js';
import { DESCRIZIONI_CATALOGO_OGGETTI } from './catalogoOggetti.js';
import { DESCRIZIONI_COMPENDIO } from './compendio.js';
import { DESCRIZIONI_CONDIZIONI } from './condizioni.js';
import { DESCRIZIONI_FONT } from './font.js';
import { DESCRIZIONI_FUSIONE } from './fusione.js';
import { DESCRIZIONI_IMMAGINI } from './immagini.js';
import { DESCRIZIONI_IMPOSTAZIONI } from './impostazioni.js';
import { DESCRIZIONI_LUOGHI } from './luoghi.js';
import { DESCRIZIONI_RICERCA } from './ricerca.js';
import { DESCRIZIONI_MAPPE } from './mappe.js';
import { DESCRIZIONI_PARTITE } from './partite.js';
import { DESCRIZIONI_SISTEMA } from './sistema.js';
import { DESCRIZIONI_TRADUZIONI } from './traduzioni.js';
import { DESCRIZIONI_PESCA } from './pesca.js';
import { DESCRIZIONI_CORREZIONI } from './correzioni.js';

/** Le aree dell'API, per prefisso di montaggio (`sistema` per le rotte dell'app): diventano i tag del documento. */
export const AREE: Readonly<Record<string, AreaApi>> = {
  '/api/compendio': { nome: 'Compendio e guida', descrizione: 'Persona, skill, arcani, oggetti, Confidenti, negozi, attività, dungeon, calendario e le altre sezioni della guida; con `?partita=` lo stato della partita.' },
  '/api/traduzioni': { nome: 'Traduzioni', descrizione: 'Le rese italiane dei nomi canonici (skill, Persona, oggetti…) e le loro correzioni.' },
  '/api/partite': { nome: 'Partite', descrizione: 'Le partite e tutto il loro avanzamento: giorno, Doti, Confidenti, scorta di Persona, squadra, spunte, storico.' },
  '/api/immagini': { nome: 'Immagini', descrizione: 'Le immagini dell\'istanza (nel database di gioco): caricamento, lettura, eliminazione, manifest.' },
  '/api/fusione': { nome: 'Fusione', descrizione: 'Il motore di fusione: calcolo diretto e inverso, piani ricorsivi, eredità delle skill, cicli.' },
  '/api/mappe': { nome: 'Mappe', descrizione: 'Le mappe in stile mapgenie: albero, planimetrie, spilli, passaggi, esportazione e importazione.' },
  '/api/font': { nome: 'Caratteri', descrizione: 'I caratteri tipografici caricati dall\'utente.' },
  '/api/impostazioni': { nome: 'Impostazioni e istanza', descrizione: 'Stato dell\'istanza, backup e ripristino, pacchetto di gioco, cartella d\'appoggio.' },
  '/api/catalogo': { nome: 'Catalogo', descrizione: 'Le righe dei dati della guida aggiunte, corrette o nascoste dall\'utente.' },
  '/api/catalogo-oggetti': { nome: 'Catalogo degli oggetti', descrizione: 'Identità degli oggetti, fonti, offerte, contenuti, legami, ripristini e riepilogo della conversione.' },
  '/api/condizioni': { nome: 'Condizioni', descrizione: 'Gli elenchi chiusi e la normalizzazione delle condizioni di disponibilità e visibilità.' },
  '/api/aree': { nome: 'Aree del mondo', descrizione: 'Le Aree dei quartieri e della città (Città → Quartiere → Area → Planimetrie): pagina, creazione, versioni, ordine, ripristino, eliminazione nel cestino, planimetrie da collocare.' },
  '/api/luoghi': { nome: 'Luoghi', descrizione: 'I luoghi della città come fonte (L5): posizionarli su una planimetria con il loro pin e collocarli in un\'Area del quartiere.' },
  '/api/ricerca': { nome: 'Ricerca', descrizione: 'La ricerca globale per nome su tutti gli oggetti della guida, con percorso, pagina e immagine.' },
  '/api/pesca':{nome:'Regole della pesca',descrizione:'Regola della guida modificabile, profili sufficienti e fonti.'},
  '/api/partite/:id/pesca':{nome:'Pesca della partita',descrizione:'Visite, osservazioni, fatti temporali, fonti e contabilità esplicita della pesca.'},
  '/api/correzioni': { nome: 'Correzioni alla guida', descrizione: 'Modifica e ripristino dei dati della guida che non hanno una pagina di catalogo propria: quartieri, trofei, Doti, personaggi, sfide, completamento, testi degli oggetti, Jose.' },
  sistema: { nome: 'Sistema', descrizione: 'Salute del server, configurazione pubblica, questa documentazione.' },
};

/** Tutte le descrizioni, con chiave «METODO /percorso» (sintassi di Express). */
export const DESCRIZIONI: DescrizioniArea = {
  ...DESCRIZIONI_COMPENDIO,
  ...DESCRIZIONI_TRADUZIONI,
  ...DESCRIZIONI_PARTITE,
  ...DESCRIZIONI_PESCA,
  ...DESCRIZIONI_IMMAGINI,
  ...DESCRIZIONI_FUSIONE,
  ...DESCRIZIONI_MAPPE,
  ...DESCRIZIONI_FONT,
  ...DESCRIZIONI_IMPOSTAZIONI,
  ...DESCRIZIONI_CATALOGO,
  ...DESCRIZIONI_CATALOGO_OGGETTI,
  ...DESCRIZIONI_CONDIZIONI,
  ...DESCRIZIONI_AREE,
  ...DESCRIZIONI_LUOGHI,
  ...DESCRIZIONI_RICERCA,
  ...DESCRIZIONI_CORREZIONI,
  ...DESCRIZIONI_SISTEMA,
};
