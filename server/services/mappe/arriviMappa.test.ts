// ============================================================
// Test — gli spilli di altre mappe che portano su questa
// ============================================================
//
// Una mappa conosce da sé solo le proprie vie d'uscita. Il verso opposto — chi porta qui — non era
// leggibile da nessuna parte, e un collegamento a senso unico restava invisibile.
// ============================================================

import { closeDb, initDb } from '../../db/dbService.js';
import { runMigrations } from '../../db/migrationRunner.js';
import { importaMappe, dettaglioMappa, aggiornaSpillo, creaSpillo } from './mappeService.js';
import type { EsportazioneMappeDto } from '../../../shared/types.js';

const mappa = (chiave: string, genitore: string | null = null): EsportazioneMappeDto['mappe'][number] =>
  ({ chiave, nome: chiave, tipo: 'generica', genitore, ordine: 0, immagine: null, asset: null, larghezza: null, altezza: null, entita: null, note: '', spilli: [] });

afterEach(() => closeDb());

function atlante() {
  const db = initDb(':memory:');
  runMigrations(db);
  importaMappe({ versione: 1, mappe: [mappa('quartiere'), mappa('sottopasso', 'quartiere'), mappa('banchina', 'quartiere')] }, { origine: 'seed' });
  return db;
}

it('gli arrivi vengono sia dal riferimento «mappa» sia dalla destinazione, senza ripetere lo stesso spillo', () => {
  atlante();
  // il passaggio vecchio maniera: solo il riferimento alla mappa
  creaSpillo('sottopasso', { tipo: 'passaggio', nome: 'Banchina Metro', x: 50, y: 50, riferimento: { tipo: 'mappa', chiave: 'banchina' } });
  // e quello nuovo, con la destinazione vera: porta entrambi i collegamenti e va contato una volta sola
  const conDestinazione = creaSpillo('quartiere', { tipo: 'treno', nome: 'Alla banchina', x: 10, y: 10, riferimento: { tipo: 'mappa', chiave: 'banchina' } });
  aggiornaSpillo(conDestinazione.id, { destinazione: { mappa: 'banchina', spillo: null } });

  const arrivi = dettaglioMappa('banchina').arrivi;
  expect(arrivi).toHaveLength(2);
  // la chiave è quella leggibile del percorso, la stessa che usano gli indirizzi delle pagine
  expect(arrivi.map((a) => `${a.mappa}:${a.nome}:${a.tipo}`).sort()).toEqual(['quartiere-sottopasso:Banchina Metro:passaggio', 'quartiere:Alla banchina:treno']);
  expect(arrivi.every((a) => a.mappaNome.length > 0)).toBe(true);
});

it('una mappa non si conta fra i propri arrivi, e chi non è citato da nessuno ha l’elenco vuoto', () => {
  atlante();
  const s = creaSpillo('sottopasso', { tipo: 'passaggio', nome: 'Giro su sé stesso', x: 50, y: 50 });
  aggiornaSpillo(s.id, { destinazione: { mappa: 'sottopasso', spillo: null } });
  expect(dettaglioMappa('sottopasso').arrivi).toEqual([]);
  expect(dettaglioMappa('quartiere').arrivi).toEqual([]);
});

it('l’elenco segue lo spillo: sparisce se cambia destinazione e se lo spillo si sposta di mappa', () => {
  atlante();
  const s = creaSpillo('sottopasso', { tipo: 'passaggio', nome: 'Banchina', x: 50, y: 50, riferimento: { tipo: 'mappa', chiave: 'banchina' } });
  expect(dettaglioMappa('banchina').arrivi).toHaveLength(1);
  aggiornaSpillo(s.id, { mappa: 'quartiere' });
  expect(dettaglioMappa('banchina').arrivi.map((a) => a.mappa)).toEqual(['quartiere']);
  aggiornaSpillo(s.id, { riferimento: null });
  expect(dettaglioMappa('banchina').arrivi).toEqual([]);
});
