// Descrizioni C7 (2026-10-31): gli appunti fissi del Diario, le voci che si ripetono tenute a portata di mano in una finestra fluttuante.
import type { DescrizioniArea } from '../tipi.js';

export const DESCRIZIONI_APPUNTI_FISSI: DescrizioniArea = {
  'GET /api/appunti-fissi': {
    sommario: 'Elenca gli appunti fissi del Diario',
    descrizione: 'Tutti gli appunti, nel loro ordine (ordine da 0, poi id). Non sono di una partita: gli stessi su ogni dispositivo. Solo nell’istanza di preparazione.',
    risposta: 'Elenco di AppuntoFissoDto',
  },
  'POST /api/appunti-fissi': {
    sommario: 'Aggiunge un appunto fisso in fondo all’elenco',
    descrizione: 'titolo da 1 a 80 caratteri (ripulito dagli spazi ai capi); testo da 1 a 200.000 caratteri, conservato com’è (anche il blocco delle voci che «Copia» del Diario mette in fondo al testo, che Ctrl+V nel Diario riconosce). Al massimo 500 appunti (409 troppi-appunti).',
    risposta: 'AppuntoFissoDto creato (201)',
    errori: [[400, 'validation-error'], [409, 'troppi-appunti']],
  },
  'PUT /api/appunti-fissi/ordine': {
    sommario: 'Riordina gli appunti fissi',
    descrizione: 'ids sono TUTTI gli appunti, ognuno una volta, nell’ordine voluto. Un id ripetuto è 400 ordine-non-valido; un elenco diverso da quello di adesso (un appunto aggiunto o eliminato da un altro dispositivo) è 409 ordine-cambiato: si rilegge l’elenco e si riprova.',
    risposta: 'Elenco di AppuntoFissoDto nel nuovo ordine',
    errori: [[400, 'ordine-non-valido'], [409, 'ordine-cambiato']],
  },
  'PATCH /api/appunti-fissi/:id': {
    sommario: 'Cambia il titolo o il testo di un appunto fisso',
    descrizione: 'Almeno uno fra titolo e testo, con gli stessi limiti dell’aggiunta. Il posto nell’elenco non cambia.',
    risposta: 'AppuntoFissoDto aggiornato',
    errori: [[400, 'validation-error'], [404, 'appunto-non-trovato']],
  },
  'DELETE /api/appunti-fissi/:id': {
    sommario: 'Elimina un appunto fisso',
    descrizione: 'L’appunto non va nel Cestino: la finestra chiede conferma prima. L’ordine degli altri si ricompatta.',
    risposta: 'Nessun contenuto (204)',
    errori: [[404, 'appunto-non-trovato']],
  },
};
