// ============================================================
// Migrazione 046 — le prove native di uno spillo, in forma strutturata
// ============================================================
//
// Uno spillo importato dai dati del gioco porta con sé delle prove: il tipo nativo con cui il
// gioco lo identifica, la parte grafica con cui lo disegna, il nome interno di quello sprite e —
// quando il significato non è dimostrato — tutto ciò che si è raccolto perché lo si possa
// verificare guardando le schermate.
//
// Finora quella roba viveva **nella descrizione**, cioè in una frase. Una frase si legge, ma non
// si interroga: non si può chiedere al database quali spilli abbiano il tipo nativo 19, né
// applicare in blocco la risposta dell'utente una volta che ha controllato. E si può cancellare
// senza che nulla se ne accorga, perché è solo testo.
//
// `nativo_json` tiene quelle prove come dato: `{tipoNativo, indicePin, partId, indiceSprite,
// nomeNativo, png, motivoSenzaSprite, daVerificare, prove}`. La descrizione resta, perché è quella
// che l'utente legge, ma non è più l'unico posto dove l'informazione esiste.
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const migration046: Migration = {
  id: 46,
  name: 'evidenze_native_spilli',
  up: (db) => {
    const colonne = db.prepare("SELECT name FROM pragma_table_info('spillo')").all() as Array<{ name: string }>;
    if (!colonne.some((c) => c.name === 'nativo_json')) {
      db.exec('ALTER TABLE spillo ADD COLUMN nativo_json TEXT');
    }
  },
};
