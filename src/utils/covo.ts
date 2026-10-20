// ============================================================
// covo — dove stanno le due facce del Covo dei Ladri (L2, 2026-10-20)
// ============================================================
//
// Nel gioco il Covo dei Ladri non è un posto della città: si apre dall'opzione «Covo dei Ladri» del menu, dal 6/5 (registro
// dell'Esperto della guida, G-004). La fermata della metro porta quindi alla pagina delle sfide e delle Medaglie P (`/guida/covo`);
// le sue cinque planimetrie sono un'Area di Yongen-Jaya (scelta di ordinamento dell'app, D2). Le due pagine si collegano nei due sensi
// e prendono l'indirizzo da qui, una volta sola.
// ============================================================

/** L'Area delle planimetrie del Covo: chiave, quartiere, slug e indirizzo della sua pagina. */
export const COVO_AREA = {
  chiave: 'citta/yongen-jaya/covo-dei-ladri',
  quartiere: 'yongen-jaya',
  slug: 'covo-dei-ladri',
  pagina: '/guida/citta/yongen-jaya/covo-dei-ladri',
} as const;

/** La pagina delle sfide e delle Medaglie P del Covo, meta della fermata della metro. */
export const PAGINA_COVO = '/guida/covo';
