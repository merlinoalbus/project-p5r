// ============================================================
// 167 — il nome di Iwai è «Munehisa», non «Junichi» (R9-05, G-036 B2)
// ============================================================
//
// «Junichi Iwai» compare in due testi della guida: il titolo di un evento del calendario (rango 1 del 15/8) e il riassunto della settimana 19.
// Il Confidente si chiama già «Munehisa Iwai» e «Junichi» non esiste nella guida (AGS, guida-rango-confidente-di-iwai-appeso). Si sostituisce
// il solo nome «Junichi Iwai» in quei due campi; il resto del testo, gli id e ogni altra riga restano. Le voci del Diario non lo citano.
// Idempotente: dopo la correzione nessuna riga contiene più «Junichi Iwai».
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const migration167: Migration = {
  id: 167, name: 'nome_iwai',
  up(db) {
    db.exec(`UPDATE main.evento_calendario SET titolo = replace(titolo, 'Junichi Iwai', 'Munehisa Iwai') WHERE titolo LIKE '%Junichi Iwai%';
      UPDATE main.settimana_guida SET riassunto = replace(riassunto, 'Junichi Iwai', 'Munehisa Iwai') WHERE riassunto LIKE '%Junichi Iwai%'`);
  },
};
