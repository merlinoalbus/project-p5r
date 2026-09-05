// ============================================================
// Test condizioni di visibilità degli spilli — descrizione in italiano e normalizzazione (Fase 15.22)
// ============================================================

import { dataLeggibile, dataSbloccoQuartiere, dataValida, descriviRequisitoSpillo, normalizzaCondizioniSpillo, normalizzaRequisitoSpillo, ordineGioco } from './condizioniSpillo';

describe('descriviRequisitoSpillo', () => {
  it('usa lo stesso stile dei requisiti della guida e i nomi quando li ha', () => {
    expect(dataLeggibile('04-18')).toBe('18 aprile');
    expect(dataLeggibile('dal 18 aprile')).toBe('dal 18 aprile');
    expect(descriviRequisitoSpillo({ tipo: 'data', dal: '04-18' })).toBe('dal 18 aprile');
    expect(descriviRequisitoSpillo({ tipo: 'intervallo', dal: '07-26', al: '07-30' })).toBe('solo dal 26 luglio al 30 luglio');
    expect(descriviRequisitoSpillo({ tipo: 'intervallo', dal: '04-24', al: '04-24' })).toBe('solo il 24 aprile');
    expect(descriviRequisitoSpillo({ tipo: 'palazzo', dungeon: 'madarame' })).toBe('dopo il Palazzo di Madarame');
    expect(descriviRequisitoSpillo({ tipo: 'dote', dote: 'coraggio', rango: 3 })).toBe('Coraggio Rango 3');
    expect(descriviRequisitoSpillo({ tipo: 'confidente', confidente: 'sojiro', rango: 4 }, { confidenti: { sojiro: 'Sojiro Sakura' } })).toBe('Rango Confidente Sojiro Sakura 4');
    expect(descriviRequisitoSpillo({ tipo: 'confidente', confidente: 'sojiro', rango: 4 })).toBe('Rango Confidente sojiro 4');
    expect(descriviRequisitoSpillo({ tipo: 'richiesta', richiesta: 'zio-ingordo' }, { richieste: { 'zio-ingordo': 'Lo zio ingordo' } })).toBe('richiesta «Lo zio ingordo» completata');
    expect(descriviRequisitoSpillo({ tipo: 'piove' })).toBe('solo nei giorni di pioggia');
    expect(descriviRequisitoSpillo({ tipo: 'meteo', condizione: 'non-piove' })).toBe('non disponibile in caso di pioggia');
    expect(descriviRequisitoSpillo({ tipo: 'giorno-settimana', giorni: ['lunedi', 'martedi', 'domenica'] })).toBe('solo lunedì, martedì e domenica');
    expect(descriviRequisitoSpillo({ tipo: 'giorno-settimana', giorni: ['domenica'] })).toBe('solo domenica');
    expect(descriviRequisitoSpillo({ tipo: 'stagione', stagione: 'inverno' })).toBe('solo in inverno');
    expect(descriviRequisitoSpillo({ tipo: 'quartiere', quartiere: 'akihabara' }, { quartieri: { akihabara: 'Akihabara' } })).toBe('da quando si sblocca Akihabara');
    expect(descriviRequisitoSpillo({ tipo: 'fascia', fascia: 'sera' })).toBe('solo di sera');
    expect(descriviRequisitoSpillo({ tipo: 'fascia', fascia: 'giorno' })).toBe('solo di giorno');
  });
});

describe('dataSbloccoQuartiere', () => {
  it('legge la data solo quando il testo della Guida comincia con una data: gli altri quartieri non sono calcolabili', () => {
    expect(dataSbloccoQuartiere('18 giugno (evento di trama)')).toBe('06-18');
    expect(dataSbloccoQuartiere('31 agosto (evento di trama)')).toBe('08-31');
    expect(dataSbloccoQuartiere('5 giugno (Domenica 6/05, scena di trama con Ryuji Sakamoto subito dopo la confessione di Madarame); esclusivo Persona 5 Royal')).toBe('06-05');
    expect(dataSbloccoQuartiere('1° settembre (lettura libro)')).toBe('09-01');
    expect(dataSbloccoQuartiere('Confidente Emperor (Yusuke) Rango 3')).toBeNull();
    expect(dataSbloccoQuartiere('lettura del libro "Vague" (Libreria Taiheido, Shibuya, 700¥) oppure invito di Mishima del 3 agosto')).toBeNull();
    expect(dataSbloccoQuartiere(null)).toBeNull();
    expect(dataSbloccoQuartiere('')).toBeNull();
  });
});

describe('normalizzaRequisitoSpillo', () => {
  it('accetta solo condizioni calcolabili e ben formate', () => {
    expect(normalizzaRequisitoSpillo({ tipo: 'data', dal: '04-18' })).toEqual({ tipo: 'data', dal: '04-18' });
    expect(normalizzaRequisitoSpillo({ tipo: 'data', dal: '18 aprile' })).toBeNull();
    expect(normalizzaRequisitoSpillo({ tipo: 'data', dal: '13-01' })).toBeNull();
    // il calendario di gioco: 30 giorni in aprile, 28 in febbraio; il periodo va da aprile a marzo, la fine non precede l'inizio
    expect(dataValida('04-30')).toBe(true);
    expect(dataValida('04-31')).toBe(false);
    expect(dataValida('02-29')).toBe(false);
    expect(ordineGioco('01-09')).toBeGreaterThan(ordineGioco('12-22'));
    expect(normalizzaRequisitoSpillo({ tipo: 'data', dal: '04-31' })).toBeNull();
    expect(normalizzaRequisitoSpillo({ tipo: 'intervallo', dal: '12-22', al: '01-09' })).toEqual({ tipo: 'intervallo', dal: '12-22', al: '01-09' });
    expect(normalizzaRequisitoSpillo({ tipo: 'intervallo', dal: '08-20', al: '06-01' })).toBeNull();
    expect(normalizzaRequisitoSpillo({ tipo: 'intervallo', dal: '04-24', al: '04-24' })).toEqual({ tipo: 'intervallo', dal: '04-24', al: '04-24' });
    expect(normalizzaRequisitoSpillo({ tipo: 'dote', dote: 'coraggio', rango: 6 })).toBeNull();
    expect(normalizzaRequisitoSpillo({ tipo: 'dote', dote: 'fortuna', rango: 2 })).toBeNull();
    expect(normalizzaRequisitoSpillo({ tipo: 'confidente', confidente: 'sojiro', rango: 10 })).toEqual({ tipo: 'confidente', confidente: 'sojiro', rango: 10 });
    expect(normalizzaRequisitoSpillo({ tipo: 'confidente', confidente: 'Sojiro Sakura', rango: 1 })).toBeNull();
    expect(normalizzaRequisitoSpillo({ tipo: 'giorno-settimana', giorni: ['domenica', 'festivo'] })).toEqual({ tipo: 'giorno-settimana', giorni: ['domenica'] });
    // tutti i giorni = nessuna condizione
    expect(normalizzaRequisitoSpillo({ tipo: 'giorno-settimana', giorni: ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'] })).toBeNull();
    expect(normalizzaRequisitoSpillo({ tipo: 'meteo', condizione: 'piove' })).toBeNull();
    expect(normalizzaRequisitoSpillo({ tipo: 'fascia', fascia: 'sera' })).toEqual({ tipo: 'fascia', fascia: 'sera' });
    expect(normalizzaRequisitoSpillo({ tipo: 'fascia', fascia: 'notte' })).toBeNull();
    // le condizioni non calcolabili dall'app non esistono per gli spilli
    expect(normalizzaRequisitoSpillo({ tipo: 'manuale', testo: 'dopo aver pescato' })).toBeNull();
    expect(normalizzaRequisitoSpillo({ tipo: 'ignoto', testo: 'x' })).toBeNull();
    expect(normalizzaRequisitoSpillo('dal 18 aprile')).toBeNull();
  });

  it('l’elenco scarta doppioni e voci non valide, con un massimo', () => {
    const lista = normalizzaCondizioniSpillo([{ tipo: 'piove' }, { tipo: 'piove' }, { tipo: 'stagione', stagione: 'monsone' }, { tipo: 'stagione', stagione: 'estate' }]);
    expect(lista).toEqual([{ tipo: 'piove' }, { tipo: 'stagione', stagione: 'estate' }]);
    expect(normalizzaCondizioniSpillo('niente')).toEqual([]);
    expect(normalizzaCondizioniSpillo(Array.from({ length: 30 }, (_, i) => ({ tipo: 'data', dal: `04-${String((i % 28) + 1).padStart(2, '0')}` })), 3)).toHaveLength(3);
  });
});
