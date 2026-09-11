// ============================================================
// Test statiPartita — la scelta (stato, operatore, valori) e la condizione sono l'una l'inversa dell'altra
// ============================================================

import { STATI_PARTITA, costruisciCondizione, scomponiCondizione, valorePredefinito } from './statiPartita';
import { normalizzaRequisitoSpillo, type RequisitoSpillo } from './condizioniSpillo';

const CAMPIONE: RequisitoSpillo[] = [
  { tipo: 'data', dal: '04-18' }, { tipo: 'intervallo', dal: '04-24', al: '04-24' }, { tipo: 'intervallo', dal: '07-26', al: '07-30' },
  { tipo: 'fascia', fascia: 'sera' }, { tipo: 'piove' }, { tipo: 'meteo', condizione: 'non-piove' }, { tipo: 'giorno-settimana', giorni: ['lunedi', 'domenica'] },
  { tipo: 'stagione', stagione: 'estate' }, { tipo: 'quartiere', quartiere: 'akihabara' }, { tipo: 'arco', dungeon: 'madarame' }, { tipo: 'palazzo', dungeon: 'kamoshida' },
  { tipo: 'dote', dote: 'coraggio', rango: 3 }, { tipo: 'confidente', confidente: 'sojiro', rango: 4 }, { tipo: 'squadra', membro: 'ann' }, { tipo: 'richiesta', richiesta: 'lo-zio-ingordo' },
  { tipo: 'evento', evento: 'mansarda-pulita' }, { tipo: 'contatore', cosa: 'film-completati', almeno: 2 }, { tipo: 'lettura', categoria: 'libro', chiave: 'x' }, { tipo: 'lettura', categoria: 'film', chiave: 'y' },
  { tipo: 'attivita', attivita: 'biliardo', volte: 3 }, { tipo: 'articolo', articolo: 'a/b' }, { tipo: 'rango-cliente', negozio: 'tanaka-affari-loschi', rango: 'nero' }, { tipo: 'punti-negozio', negozio: 'v', punti: 50 },
  { tipo: 'persona-arcano', arcano: 'Fool' }, { tipo: 'persona-abilita', persona: 'Pixie', abilita: 'Dia' },
];

describe('costruisciCondizione / scomponiCondizione', () => {
  it('ogni condizione semplice si scompone in una scelta che la ricostruisce identica', () => {
    for (const c of CAMPIONE) {
      const scelta = scomponiCondizione(c);
      expect(scelta, JSON.stringify(c)).not.toBeNull();
      expect(costruisciCondizione(scelta!), JSON.stringify(c)).toEqual(c);
      // e lo stato scelto esiste nel catalogo, con quell'operatore
      const def = STATI_PARTITA.find((s) => s.chiave === scelta!.stato);
      expect(def, scelta!.stato).toBeDefined();
      expect(def!.operatori.some((o) => o.chiave === scelta!.operatore), `${scelta!.stato}/${scelta!.operatore}`).toBe(true);
    }
  });

  it('gruppi e negazioni non sono scelte: si costruiscono nell\'editor come blocchi', () => {
    expect(scomponiCondizione({ tipo: 'gruppo', modo: 'tutte', condizioni: [{ tipo: 'piove' }] })).toBeNull();
    expect(scomponiCondizione({ tipo: 'non', condizione: { tipo: 'piove' } })).toBeNull();
  });

  it('una scelta incompleta o fuori intervallo non produce una condizione', () => {
    expect(costruisciCondizione({ stato: 'data-gioco', operatore: 'dal', valori: { dal: '04-31' } })).toBeNull();
    expect(costruisciCondizione({ stato: 'data-gioco', operatore: 'tra', valori: { dal: '08-20', al: '06-01' } })).toBeNull();
    expect(costruisciCondizione({ stato: 'dote', operatore: 'almeno', valori: { dote: 'coraggio', rango: 6 } })).toBeNull();
    expect(costruisciCondizione({ stato: 'confidente', operatore: 'almeno', valori: { confidente: '', rango: 1 } })).toBeNull();
    expect(costruisciCondizione({ stato: 'giorno-settimana', operatore: 'in', valori: { giorni: [] } })).toBeNull();
    expect(costruisciCondizione({ stato: 'evento', operatore: 'avvenuto', valori: { evento: 'inventato' } })).toBeNull();
    expect(costruisciCondizione({ stato: 'inesistente', operatore: 'x', valori: {} })).toBeNull();
  });

  it('i valori predefiniti di ogni campo fisso producono subito una condizione valida', () => {
    for (const def of STATI_PARTITA) for (const op of def.operatori) {
      const valori = Object.fromEntries(op.campi.map((c) => [c.nome, valorePredefinito(c.tipo)]));
      const richiedeElenco = op.campi.some((c) => valorePredefinito(c.tipo) === '');
      if (richiedeElenco) continue;
      const c = costruisciCondizione({ stato: def.chiave, operatore: op.chiave, valori });
      expect(c, `${def.chiave}/${op.chiave}`).not.toBeNull();
      expect(normalizzaRequisitoSpillo(c), `${def.chiave}/${op.chiave}`).toEqual(c);
    }
  });
});
