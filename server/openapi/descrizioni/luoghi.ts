// ============================================================
// descrizioni/luoghi — le rotte di /api/luoghi: posizionare e collocare i luoghi (L5 «Luoghi, negozi, orari», migrazione 115)
// ============================================================

import type { DescrizioniArea } from '../tipi.js';

/** Le descrizioni delle rotte di `server/routes/luoghi.ts` (servizio `luoghiScritture`). */
export const DESCRIZIONI_LUOGHI: DescrizioniArea = {
  'POST /api/luoghi/da-pin/:id/anteprima': {
    sommario: 'Rivedi la creazione di un luogo da un pin personale già presente',
    descrizione: 'Sola lettura coerente, no-store. Nuovo luogo esplicito (nome, tipo, cosaOffre, orari), oggetti tutti strict, anche gli orari. Risolve quartiere e Area dalle FK reali della planimetria, controlla collisioni e ripristini del cestino e restituisce dati normalizzati, chiave esatta prevista, luoghi correnti del quartiere (nascosti compresi) e token CAS. Nessuna chiave prenotata, nessun RAW o stato privato esposto. Non collega automaticamente luoghi omonimi.',
    risposta: 'AnteprimaLuogoDaPinDto (shared/luogoDaPin.ts)',
    errori: [[400, 'validation-error'], [404, 'spillo-non-trovato'], [409, 'luogo-da-pin-conflitto'], [409, 'luogo-da-pin-duplicato'], [409, 'raccordo-pin-non-ammesso'], [409, 'raccordo-condizioni-non-ammesse']],
  },
  'POST /api/luoghi/da-pin/:id': {
    sommario: 'Crea il luogo e collega il pin esistente con la precondizione dell’anteprima',
    descrizione: 'In una sola transazione IMMEDIATE rilegge pin, relazioni, FK, luoghi, cestino e stati pertinenti nello schema utente attached, confronta la fotografia e crea il luogo utente con chiave e campi identici all’anteprima. Aggiorna soltanto il riferimento e updated_at del pin già presente. Nessun secondo pin, normalizzazione della sorgente, fusione, acquisto o nuovo avanzamento. Collisione, cambiamento o dati diversi causano 409 e rollback totale. Il 201 è una ricevuta minimale costruita prima del commit: dettaglio e ricarica della vista sono operazioni separate. Nessun ritento automatico in caso di risposta incerta.',
    risposta: 'LuogoCreatoDaPinDto (shared/luogoDaPin.ts): esito creato-collegato, chiave/nome del luogo, ID/UID/mappa del pin',
    errori: [[400, 'validation-error'], [404, 'spillo-non-trovato'], [409, 'luogo-da-pin-conflitto'], [409, 'luogo-da-pin-duplicato'], [409, 'luogo-da-pin-precondizione-cambiata'], [409, 'luogo-da-pin-creazione-diversa'], [409, 'raccordo-pin-non-ammesso'], [409, 'raccordo-condizioni-non-ammesse']],
  },
  'POST /api/luoghi/posiziona': {
    sommario: '«Posiziona»: un luogo (esistente o nuovo) con il suo pin su una planimetria del quartiere',
    descrizione: 'R5-18. In una transazione: crea il luogo se si danno i dati di `nuovo` (nome, tipo, cosa offre, orari; nasce nel quartiere della planimetria), crea il pin collegato (riferimento `luogo`, tipo di spillo dal catalogo dei tipi di luogo, nome e descrizione dal luogo) nel punto `x`/`y` (percentuali) e mette il luogo nell\'Area della planimetria. `luogo` e `nuovo` si escludono. La planimetria dev\'essere di un quartiere (una planimetria di un\'Area del quartiere o la sua illustrazione); un luogo esistente dev\'essere di quel quartiere.',
    risposta: 'La pagina del luogo, `LuogoDettaglioDto`',
    errori: [[400, 'luogo-o-nuovo'], [400, 'mappa-fuori-dai-quartieri'], [400, 'luogo-di-altro-quartiere'], [404, 'mappa-non-trovata'], [404, 'luogo-non-trovato'], [409, 'luogo-gia-posizionato']],
  },
  'PUT /api/luoghi/:quartiere/:luogo/area': {
    sommario: '«Colloca»: il luogo in un\'Area del suo quartiere',
    descrizione: 'Un luogo «da collocare» (senza Area) va in un\'Area del suo quartiere (`area`: lo slug); `area: null` lo rimette fra i da collocare. La proposta della pagina del quartiere (l\'unica Area, se è una sola) non si salva finché non si conferma qui.',
    risposta: 'La pagina del luogo, `LuogoDettaglioDto`',
    errori: [[404, 'luogo-non-trovato'], [404, 'area-non-trovata']],
  },
};
