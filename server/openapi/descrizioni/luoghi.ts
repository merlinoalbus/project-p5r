// ============================================================
// descrizioni/luoghi — le rotte di /api/luoghi: posizionare e collocare i luoghi (L5 «Luoghi, negozi, orari», migrazione 115)
// ============================================================

import type { DescrizioniArea } from '../tipi.js';

/** Le descrizioni delle rotte di `server/routes/luoghi.ts` (servizio `luoghiScritture`). */
export const DESCRIZIONI_LUOGHI: DescrizioniArea = {
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
