// ============================================================
// 090 — i requisiti «non verificabili» dei Confidenti diventano eventi della partita o avvertenze
// ============================================================
//
// Sojiro restava fermo al rango 3 perché «aver preparato il caffè al Leblanc» era un requisito
// `manuale`: grigio, bloccante, e confermabile solo dal pulsante nella scheda del Confidente, che
// l'utente non trovava (segnalazione del 2026-09-30). Scelta dell'utente: questi fatti diventano
// **eventi di storia**, interruttori in Partita → Progressi accanto agli altri; il «Condizione
// soddisfatta» del Confidente scrive lo stesso dato.
//
// Cinque righe su sei: il caffè (Sojiro 3), il duello vinto (Akechi 8), la Pietra Sacra (Chihaya 1),
// la chiamata pagata (Kawakami 1), l'Oratore di Shibuya (Yoshida 1). La sesta — la scuola aperta per
// Futaba al rango 4 — non è un fatto da segnare ma un'avvertenza: diventa `avviso`, grigia e **non
// bloccante**. Si toccano solo le righe ancora `manuale`: una riga già cambiata resta com'è.
// Le conferme già date nelle partite diventano eventi con la migrazione utente 012.
// ============================================================

import type { Migration } from '../migrationRunner.js';

/** Il requisito (Confidente, rango, indice) e l'evento di storia che lo soddisfa. La usa anche la migrazione utente 012. */
export const REQUISITI_EVENTO: ReadonlyArray<{ confidente: string; rango: number; indice: number; evento: string }> = [
  { confidente: 'sojiro', rango: 3, indice: 0, evento: 'caffe-leblanc' },
  { confidente: 'akechi', rango: 8, indice: 0, evento: 'duello-akechi-vinto' },
  { confidente: 'chihaya', rango: 1, indice: 2, evento: 'pietra-sacra-comprata' },
  { confidente: 'kawakami', rango: 1, indice: 2, evento: 'chiamata-kawakami-pagata' },
  { confidente: 'yoshida', rango: 1, indice: 1, evento: 'oratore-shibuya-ascoltato' },
];

export const migration090: Migration = {
  id: 90,
  name: 'requisiti_come_eventi',
  up(db) {
    const comeEvento = db.prepare("UPDATE confidente_requisito SET tipo = 'evento', dati_json = ? WHERE confidente_chiave = ? AND rango = ? AND indice = ? AND tipo = 'manuale'");
    for (const r of REQUISITI_EVENTO) comeEvento.run(JSON.stringify({ evento: r.evento }), r.confidente, r.rango, r.indice);
    db.prepare("UPDATE confidente_requisito SET tipo = 'avviso', dati_json = '{}' WHERE confidente_chiave = 'futaba' AND rango = 4 AND indice = 0 AND tipo = 'manuale'").run();
  },
};
