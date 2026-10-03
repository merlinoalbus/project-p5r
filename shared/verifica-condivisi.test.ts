// ============================================================
// Test della verifica completa del codice (2026-10-03), lotto condivisi: B1" giorni dei luoghi, B9" effetti validati per famiglia
// ============================================================

import { descriviGiorni } from './orariNegozio.js';
import { congiunzione } from './testo.js';
import { FAMIGLIE_EFFETTO, descriviEffetto, normalizzaEffettoOggetto } from './effettiOggetto.js';
import { normalizzaVociEffetto } from './effettiCatalogo.js';
import { effettoPredefinito } from '../src/utils/effetti.js';

describe('B1": descriviGiorni', () => {
  it('nessun giorno = nessuna limitazione: stringa vuota, non « e undefined»', () => {
    expect(descriviGiorni([])).toBe('');
  });

  it('domenica è femminile: «alla domenica», «solo la domenica»; gli altri «al», «solo il»', () => {
    expect(descriviGiorni(['giovedi', 'venerdi', 'sabato', 'domenica'])).toBe('dal giovedì alla domenica');
    expect(descriviGiorni(['lunedi', 'martedi', 'mercoledi'])).toBe('dal lunedì al mercoledì');
    expect(descriviGiorni(['domenica'])).toBe('solo la domenica');
    expect(descriviGiorni(['martedi'])).toBe('solo il martedì');
  });

  it('giorni sparsi: elenco italiano, nell\'ordine della settimana', () => {
    expect(descriviGiorni(['sabato', 'lunedi', 'mercoledi'])).toBe('lunedì, mercoledì e sabato');
    expect(descriviGiorni(['venerdi', 'sabato'])).toBe('venerdì e sabato');
  });

  it('congiunzione condivisa', () => {
    expect([congiunzione([]), congiunzione(['a']), congiunzione(['a', 'b']), congiunzione(['a', 'b', 'c'])]).toEqual(['', 'a', 'a e b', 'a, b e c']);
  });
});

describe('B9": effetti validati per famiglia', () => {
  it('ogni effetto predefinito dell\'editor è valido e resta identico', () => {
    for (const { chiave } of FAMIGLIE_EFFETTO) {
      const e = effettoPredefinito(chiave);
      expect(normalizzaEffettoOggetto(e), chiave).toEqual(e);
    }
  });

  it('un effetto senza i campi della sua famiglia è rifiutato (prima un regalo senza `graditoA` faceva cadere le descrizioni)', () => {
    expect(normalizzaEffettoOggetto({ famiglia: 'regalo' })).toBeNull();
    expect(normalizzaEffettoOggetto({ famiglia: 'ripristina', risorsa: 'hp', misura: 'assoluta', valore: 10 })).toBeNull();
    expect(normalizzaEffettoOggetto({ famiglia: 'statistica', statistica: 'forza', valore: '3' })).toBeNull();
    expect(normalizzaEffettoOggetto({ famiglia: 'cura-stato', stato: 'inventato', bersaglio: 'un-alleato' })).toBeNull();
    expect(normalizzaEffettoOggetto({ famiglia: 'sconosciuta' })).toBeNull();
    expect(normalizzaEffettoOggetto(null)).toBeNull();
  });

  it('i campi in più si tolgono', () => {
    expect(normalizzaEffettoOggetto({ famiglia: 'resiste-stato', stato: 'sonno', estraneo: 1 })).toEqual({ famiglia: 'resiste-stato', stato: 'sonno' });
  });

  it('la lettura scarta le voci non valide invece di farle arrivare a descriviEffetto', () => {
    const voci = normalizzaVociEffetto([{ effetto: { famiglia: 'regalo' } }, { effetto: { famiglia: 'dote', dote: 'Coraggio', note: 2.4 } }]);
    expect(voci).toEqual([{ effetto: { famiglia: 'dote', dote: 'coraggio', note: 2 } }]);
    expect(() => voci.map((v) => descriviEffetto(v.effetto))).not.toThrow();
  });
});
