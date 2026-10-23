// ============================================================
// 156 — le voci d'acquisto che nominano senza ambiguità l'articolo lo segnano comprato (R10-01/6, R10-08, R10-12)
// ============================================================
//
// Delle 100 voci d'acquisto del Diario, 23 (31 articoli in tutto) dicono nel testo quale articolo si compra e da un solo negozio: ogni nome citato è un
// articolo di quel negozio, il prezzo scritto nella voce (se c'è) è quello dell'articolo, e il testo non è una vendita, un'offerta
// opzionale, un set di televendita né una ricompensa. Ognuna riceve un effetto «articolo» per ogni articolo citato (origine «regola»):
// spuntare la voce lo segna comprato con la regola unica del negozio (`impostaAcquisto`: se l'articolo non è ancora disponibile
// nella partita la spunta non si ferma), togliere la spunta lo toglie, e gli yen del prezzo restano un promemoria. L'Aojiru ha i suoi
// consumi (migrazione 147). Restano senza effetto: gli elenchi di un negozio («sblocco del negozio», «acquisti vari»), le vendite, i
// «ricomprare», le voci «consigliata» e quelle il cui articolo non esiste nel catalogo (Pietra Sacra: è un evento, 154).
// Testo, ordine, uid e spunte delle voci non cambiano; le spunte già date non riapplicano niente. Idempotente.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { aggiungiEffettoAllaVoce } from './aggiungiEffettoVoce.js';

const ABBINAMENTI: ReadonlyArray<{ voce: string; testo: string; articoli: readonly string[] }> = [
  { voce: '3c0aa9ebe48abd01', testo: "Yongen-Jaya. Al negozio dell'usato", articoli: ['yumenoshima/lettore-dvd'] },
  { voce: '84ede5808ffdc89c', testo: 'Libreria Taiheido: comprare La pul', articoli: ['libreria-taiheido/la-pulizia-del-cuore', 'libreria-taiheido/storia-di-buchiko', 'libreria-taiheido/arte-della-persuasione'] },
  { voce: '3a33d3710eeda9d6', testo: 'Centro Commerciale Sott. - Fioraio', articoli: ['fiorista-rafflesia/bionutrienti'] },
  { voce: '7c9da107e39b28fa', testo: 'Shibuya - Central Street. Libreria', articoli: ['libreria-taiheido/minaccia-medjed', 'libreria-taiheido/vague'] },
  { voce: '18d5cfd8ad3f5dfb', testo: 'Shujin Academy - Edificio principa', articoli: ['negozio-scolastico/panino-con-yakisoba'] },
  { voce: 'f1ac0c9a14c5ce8f', testo: 'Libreria Taiheido: comprare Eredit', articoli: ['libreria-taiheido/eredita-dell-impiccato', 'libreria-taiheido/luoghi-della-movida'] },
  { voce: 'ce24e628c048218c', testo: 'Comprare Melon Pan (1.000 yen) e u', articoli: ['panetteria-yon-germain/sandwich', 'panetteria-yon-germain/melon-pan'] },
  { voce: 'bfa39e5f0a2c42fb', testo: 'Friggitoria di Kichijoji (di front', articoli: ['friggitoria-hagoromo/katsu-a-pezzettoni'] },
  { voce: '87acfa6f8f9981e6', testo: 'Shinjuku: fioraio, Megafertilizzan', articoli: ['fioraio-sukebe/megafertilizzante'] },
  { voce: 'c53bab05a0e0fb4b', testo: 'Libreria: comprare Incontri spettr', articoli: ['libreria-taiheido/incontri-spettrali'] },
  { voce: 'b03c047705c0b8b2', testo: 'Negozio di articoli sportivi al ce', articoli: ['prossimo-asso/esperto-a-biliardo'] },
  { voce: 'c86dca879c818737', testo: 'Libreria Taiheido: Un acquario al ', articoli: ['libreria-taiheido/un-acquario-al-giorno', 'libreria-taiheido/vedetta-lacustre'] },
  { voce: 'b3c03352750e50bf', testo: "Negozio dell'usato: Gambla Goemon", articoli: ['yumenoshima/gambla-goemon'] },
  { voce: '107b17a02f2d35ca', testo: 'Negozio scolastico: comprare il Pa', articoli: ['negozio-scolastico/pane-autunnale'] },
  { voce: '95d89b2c533ae279', testo: 'Yongen-Jaya: comprare un Laptop ro', articoli: ['yumenoshima/laptop-rotto'] },
  { voce: '4bcd502b354c0ce1', testo: 'Libreria Taiheido: Santuari di Tok', articoli: ['libreria-taiheido/santuari-di-tokyo', 'libreria-taiheido/cieli-notturni', 'libreria-taiheido/pagine-ammuffite'] },
  { voce: 'f34017086c256b18', testo: 'Jinbocho: comprare il libro Spadac', articoli: ['libreria-nagiuri/spadaccino-provetto'] },
  { voce: '2e83ab7efc9c9562', testo: 'Comprare il libro Esplorando Nakan', articoli: ['libreria-taiheido/esplorando-nakano'] },
  { voce: '07c9458551be4baf', testo: 'Libreria Hinokuniya di Shinjuku: l', articoli: ['hinokuniya/maestro-a-freccette'] },
  { voce: '0d1dbf76815b4b70', testo: 'Con la pioggia, comprare il Frulla', articoli: ['prossimo-asso/frullato-iperproteico'] },
  { voce: '525c2d45a1f20995', testo: 'Centro commerciale: comprare Prote', articoli: ['prossimo-asso/proteine-d-importazione'] },
  { voce: 'e3f1515aa0db4607', testo: 'Jinbocho: comprare il libro Compre', articoli: ['libreria-nagiuri/comprendere-il-cuore'] },
  { voce: 'd09b757199803ffb', testo: 'Centro Commerciale Sotterraneo (Fi', articoli: ['fiorista-rafflesia/bionutrienti'] },
];

export const migration156: Migration = {
  id: 156,
  name: 'acquisti_dalle_voci',
  up(db) {
    let aggiunti = 0, saltati = 0;
    for (const a of ABBINAMENTI) {
      for (const articolo of a.articoli) {
        // l'articolo deve esistere nel catalogo del negozio (e non essere l'Aojiru): altrimenti la voce resta com'è
        if (!db.prepare('SELECT 1 FROM main.articolo WHERE chiave=?').get(articolo)) { saltati++; continue; }
        const esito = aggiungiEffettoAllaVoce(db, '156', a.voce, a.testo, { tipo: 'articolo', articolo }, articolo);
        if (esito === 'aggiunto') aggiunti++; else if (esito === 'saltato') saltati++;
      }
    }
    logger.info({ aggiunti, saltati }, '156: articoli comprati dalle voci d’acquisto');
  },
};
