// Descrizioni C7 (2026-10-31): gli appunti fissi del Diario, le voci che si ripetono tenute a portata di mano in una finestra fluttuante;
// con le categorie (2026-11-02), gruppi apribili e chiudibili riordinati trascinando.
import type { DescrizioniArea } from '../tipi.js';

export const DESCRIZIONI_APPUNTI_FISSI: DescrizioniArea = {
  'GET /api/appunti-fissi': {
    sommario: 'Elenca gli appunti fissi del Diario e le loro categorie',
    descrizione: 'Le categorie nel loro ordine e tutti gli appunti: ognuno sta in una categoria (categoriaId) o nella lista senza categoria (null), e ordine è il posto nel suo gruppo, da 0. Non sono di una partita: gli stessi su ogni dispositivo. Solo nell’istanza di preparazione.',
    risposta: 'AppuntiFissiDto',
  },
  'POST /api/appunti-fissi': {
    sommario: 'Aggiunge un appunto fisso in fondo al suo gruppo',
    descrizione: 'titolo da 1 a 80 caratteri (ripulito dagli spazi ai capi); testo da 1 a 200.000 caratteri, conservato com’è (anche il blocco delle voci che «Copia» del Diario mette in fondo al testo, che Ctrl+V nel Diario riconosce); categoriaId facoltativo (senza, o null: la lista senza categoria). Al massimo 500 appunti (409 troppi-appunti).',
    risposta: 'AppuntoFissoDto creato (201)',
    errori: [[400, 'validation-error'], [404, 'categoria-non-trovata'], [409, 'troppi-appunti']],
  },
  'PUT /api/appunti-fissi/:id/posto': {
    sommario: 'Sposta un appunto fisso in un gruppo e in un posto',
    descrizione: 'categoriaId è il gruppo d’arrivo (null: la lista senza categoria), indice il posto che l’appunto avrà lì, contato dopo averlo tolto dal suo gruppo (oltre la fine: in fondo). Il gruppo di partenza si ricompatta. Un appunto o una categoria che non c’è più (un altro dispositivo) è 404: si rilegge l’elenco.',
    risposta: 'AppuntiFissiDto dopo lo spostamento',
    errori: [[400, 'validation-error'], [404, 'appunto-non-trovato'], [404, 'categoria-non-trovata']],
  },
  'PATCH /api/appunti-fissi/:id': {
    sommario: 'Cambia il titolo, il testo o la categoria di un appunto fisso',
    descrizione: 'Almeno uno fra titolo, testo e categoriaId, con gli stessi limiti dell’aggiunta. Con una categoria diversa l’appunto va in fondo a quel gruppo; altrimenti il posto non cambia.',
    risposta: 'AppuntoFissoDto aggiornato',
    errori: [[400, 'validation-error'], [404, 'appunto-non-trovato'], [404, 'categoria-non-trovata']],
  },
  'DELETE /api/appunti-fissi/:id': {
    sommario: 'Elimina un appunto fisso',
    descrizione: 'L’appunto non va nel Cestino: la finestra chiede conferma prima. L’ordine degli altri del suo gruppo si ricompatta.',
    risposta: 'Nessun contenuto (204)',
    errori: [[404, 'appunto-non-trovato']],
  },
  'POST /api/appunti-fissi/categorie': {
    sommario: 'Aggiunge una categoria degli appunti fissi in fondo alle categorie',
    descrizione: 'nome da 1 a 40 caratteri (ripulito dagli spazi ai capi), unico senza distinguere maiuscole né accenti (409 categoria-esistente). Al massimo 50 categorie (409 troppe-categorie).',
    risposta: 'CategoriaAppuntiDto creata (201)',
    errori: [[400, 'validation-error'], [409, 'categoria-esistente'], [409, 'troppe-categorie']],
  },
  'PATCH /api/appunti-fissi/categorie/:id': {
    sommario: 'Rinomina una categoria degli appunti fissi',
    descrizione: 'Lo stesso nome dell’aggiunta, unico fra le altre categorie. Il posto e gli appunti non cambiano.',
    risposta: 'CategoriaAppuntiDto aggiornata',
    errori: [[400, 'validation-error'], [404, 'categoria-non-trovata'], [409, 'categoria-esistente']],
  },
  'PUT /api/appunti-fissi/categorie/:id/posto': {
    sommario: 'Sposta una categoria degli appunti fissi fra le categorie',
    descrizione: 'indice è il posto che la categoria avrà fra le categorie, contato dopo averla tolta (oltre la fine: in fondo).',
    risposta: 'AppuntiFissiDto dopo lo spostamento',
    errori: [[400, 'validation-error'], [404, 'categoria-non-trovata']],
  },
  'DELETE /api/appunti-fissi/categorie/:id': {
    sommario: 'Elimina una categoria degli appunti fissi',
    descrizione: 'Gli appunti della categoria non si perdono: vanno in fondo alla lista senza categoria, nel loro ordine, nella stessa transazione. La finestra chiede conferma prima.',
    risposta: 'AppuntiFissiDto dopo l’eliminazione',
    errori: [[404, 'categoria-non-trovata']],
  },
};
