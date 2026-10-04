// ============================================================
// descrizioni — il registro in italiano di tutte le rotte, per area, e i nomi delle aree (tag OpenAPI)
// ============================================================
//
// Una rotta senza descrizione, o una descrizione senza rotta, fa fallire `openapi.test.ts`: il registro
// non può restare indietro rispetto ai router.
// ============================================================

import type { AreaApi, DescrizioniArea } from '../tipi.js';
import { DESCRIZIONI_CATALOGO } from './catalogo.js';
import { DESCRIZIONI_COMPENDIO } from './compendio.js';
import { DESCRIZIONI_CONDIZIONI } from './condizioni.js';
import { DESCRIZIONI_FONT } from './font.js';
import { DESCRIZIONI_FUSIONE } from './fusione.js';
import { DESCRIZIONI_IMMAGINI } from './immagini.js';
import { DESCRIZIONI_IMPOSTAZIONI } from './impostazioni.js';
import { DESCRIZIONI_MAPPE } from './mappe.js';
import { DESCRIZIONI_PARTITE } from './partite.js';
import { DESCRIZIONI_SISTEMA } from './sistema.js';
import { DESCRIZIONI_TRADUZIONI } from './traduzioni.js';

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
  '/api/condizioni': { nome: 'Condizioni', descrizione: 'Gli elenchi chiusi e la normalizzazione delle condizioni di disponibilità e visibilità.' },
  sistema: { nome: 'Sistema', descrizione: 'Salute del server, configurazione pubblica, questa documentazione.' },
};

/** Tutte le descrizioni, con chiave «METODO /percorso» (sintassi di Express). */
export const DESCRIZIONI: DescrizioniArea = {
  ...DESCRIZIONI_COMPENDIO,
  ...DESCRIZIONI_TRADUZIONI,
  ...DESCRIZIONI_PARTITE,
  ...DESCRIZIONI_IMMAGINI,
  ...DESCRIZIONI_FUSIONE,
  ...DESCRIZIONI_MAPPE,
  ...DESCRIZIONI_FONT,
  ...DESCRIZIONI_IMPOSTAZIONI,
  ...DESCRIZIONI_CATALOGO,
  ...DESCRIZIONI_CONDIZIONI,
  ...DESCRIZIONI_SISTEMA,
};
