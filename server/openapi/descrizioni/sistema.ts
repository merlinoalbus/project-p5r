// ============================================================
// descrizioni/sistema — le rotte dell'app fuori dai router di area: salute, configurazione, documentazione
// ============================================================

import type { DescrizioniArea } from '../tipi.js';

/** Le descrizioni delle rotte montate direttamente in `bootstrap.ts`. */
export const DESCRIZIONI_SISTEMA: DescrizioniArea = {
  'GET /api/health': {
    sommario: 'Stato del server e del database',
    descrizione: 'Prova il database con una query banale e ne legge la versione dello schema (`user_version`). Risponde 503 con `status: "degraded"` se il database non risponde: è il controllo usato dall\'HEALTHCHECK di Docker, che guarda solo il codice HTTP. Il motivo del guasto resta nel log, non nella risposta.',
    risposta: '`{ status: "ok" | "degraded", timestamp, db: { ok: true, userVersion } | { ok: false, error } }`',
  },
  'GET /api/config': {
    sommario: 'Configurazione pubblica per il frontend',
    descrizione: 'La versione dell\'app e il nome del gioco, mostrati in Impostazioni → Informazioni.',
    risposta: '`{ appVersion, gioco }`',
  },
  'GET /api/openapi.json': {
    sommario: 'Questo documento OpenAPI 3.1',
    descrizione: 'Costruito alla prima richiesta dalle rotte montate, dagli schemi zod di validazione e dal registro delle descrizioni in italiano. È servito senza la busta `{ data }`, nella forma che i client OpenAPI si aspettano.',
    risposta: 'Il documento OpenAPI, così com\'è (senza busta)',
    rispostaBinaria: 'application/json',
  },
  'GET /api/docs': {
    sommario: 'Documentazione consultabile (Swagger UI)',
    descrizione: 'La pagina HTML di Swagger UI, servita dall\'istanza con i file di `swagger-ui-dist` (nessuna rete esterna). «Prova» è abilitato solo per le GET, perché la pagina parla con i dati veri dell\'istanza.',
    risposta: 'Pagina HTML',
    rispostaBinaria: 'text/html',
  },
};
