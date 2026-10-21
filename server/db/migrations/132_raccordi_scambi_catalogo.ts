import type { Migration } from '../migrationRunner.js';
import { CHIAVE_RACCORDI_SCAMBI_132, esitoFonteScambio132, fotografiaFonteScambio132, layoutNodoScambio132,
  leggiBlocchiScambiRaw, MANIFEST_SCAMBI_132, VERSIONE_RACCORDI_SCAMBI_132, type RegistroRaccordiScambi132 } from '../../services/raccordiScambiCatalogoRegistro.js';

/** Raccordi documentali espliciti: nessuna offerta, proposta, fusione o stato della partita viene modificato. */
export const migration132: Migration = {
  id: 132, name: 'Raccordi documentali delle 97 fonti Jose e scambi',
  up(db) {
    db.transaction(() => {
      // Una collisione, anche illeggibile, resta dell'istanza: il GET la segnala senza sovrascriverla né impedire l'avvio.
      if (db.prepare('SELECT 1 FROM dati_guida WHERE chiave=?').get(CHIAVE_RACCORDI_SCAMBI_132)) return;
      const blocchi = leggiBlocchiScambiRaw(db);
      const registro: RegistroRaccordiScambi132 = {
        versione: 1, manifest: VERSIONE_RACCORDI_SCAMBI_132, registratoIl: new Date().toISOString(),
        nodi: MANIFEST_SCAMBI_132.nodi.map((n) => {
          const fonte = fotografiaFonteScambio132(blocchi, n);
          return { ...layoutNodoScambio132(n), fonte, esitoRegistrazione: esitoFonteScambio132(fonte, n) };
        }),
      };
      const jose = blocchi.get('jose')!; const guida = blocchi.get('oggetti-guida')!;
      const esito = db.prepare(`INSERT INTO dati_guida(chiave,json) SELECT ?,?
        WHERE NOT EXISTS (SELECT 1 FROM dati_guida WHERE chiave=?)
        AND (SELECT COUNT(*) FROM dati_guida WHERE chiave='jose')=?
        AND (SELECT json FROM dati_guida WHERE chiave='jose') IS ?
        AND (SELECT COUNT(*) FROM dati_guida WHERE chiave='oggetti-guida')=?
        AND (SELECT json FROM dati_guida WHERE chiave='oggetti-guida') IS ?`)
        .run(CHIAVE_RACCORDI_SCAMBI_132, JSON.stringify(registro), CHIAVE_RACCORDI_SCAMBI_132,
          jose.presente ? 1 : 0, jose.json, guida.presente ? 1 : 0, guida.json);
      if (esito.changes !== 1) throw new Error('Fonti dei raccordi 132 cambiate durante la registrazione: transazione annullata.');
    })();
  },
};
