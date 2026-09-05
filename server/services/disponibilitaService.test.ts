// ============================================================
// Test disponibilitaService — dai testi della guida ai requisiti dei semafori, e valutazione alla data corrente
// ============================================================

import path from 'node:path';
import { closeDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from './seed/caricaSeed.js';
import { invalidaCacheTraduzioni } from './traduzioniService.js';
import { dataSbloccoQuartiere, requisitiDaTesto, valutaDisponibilita, type StatoDisponibilita } from './disponibilitaService.js';

// il valutatore dei semafori traduce i nomi (Confidenti, arcani) leggendo il glossario dal DB
beforeAll(() => { const db = initDb(':memory:'); runMigrations(db); caricaSeed(db, path.resolve(import.meta.dirname, '../../data/seed')); invalidaCacheTraduzioni(); });
afterAll(() => closeDb());

function stato(sovrascrivi: Partial<StatoDisponibilita> = {}): StatoDisponibilita {
  return {
    doti: new Map([['fascino', 1], ['coraggio', 1], ['conoscenza', 1], ['perizia', 1], ['gentilezza', 1]]),
    arcaniInScorta: new Set(), personeConAbilita: new Set(), bossGestiti: new Set(), richiesteCompletate: new Set(),
    ranghiConfidenti: new Map([['sojiro', 1], ['iwai', 0]]), dataGioco: '04-20', fasciaGioco: 'giorno', meteoOggi: 'Sereno', conferme: new Set(), giornoSettimana: 'mercoledi',
    sbloccoQuartieri: new Map([['akihabara', { nome: 'Akihabara', dal: '08-31' }], ['shinjuku', { nome: 'Shinjuku', dal: '06-18' }], ['kichijoji', { nome: 'Kichijoji', dal: null }]]),
    ...sovrascrivi,
  };
}

describe('requisitiDaTesto', () => {
  it('riconosce date, Palazzi, Doti, Confidenti, richieste, pioggia, giorno della settimana, stagione e intervalli', () => {
    expect(requisitiDaTesto('dal 18 aprile')).toEqual([{ tipo: 'data', dal: '04-18', testo: 'dal 18 aprile' }]);
    expect(requisitiDaTesto('dal primo settembre')).toEqual([{ tipo: 'data', dal: '09-01', testo: 'dal primo settembre' }]);
    // «domenica 8 maggio» da solo (televendite) vale solo quel giorno
    expect(requisitiDaTesto('domenica 8 maggio')).toEqual([{ tipo: 'intervallo', dal: '05-08', al: '05-08', testo: 'domenica 8 maggio' }]);
    expect(requisitiDaTesto('Disponibile dalla domenica 5 giugno, quando si sblocca Kichijoji')[0]).toMatchObject({ tipo: 'data', dal: '06-05' });
    expect(requisitiDaTesto('dopo Palazzo di Kaneshiro')).toEqual([{ tipo: 'palazzo', dungeon: 'kaneshiro', testo: 'dopo Palazzo di Kaneshiro' }]);
    expect(requisitiDaTesto('dopo il primo Palazzo (Kamoshida)')[0]).toMatchObject({ tipo: 'palazzo', dungeon: 'kamoshida' });
    expect(requisitiDaTesto('richiede Fascino Rango 3')).toEqual([{ tipo: 'dote', dote: 'fascino', rango: 3, testo: 'richiede Fascino Rango 3' }]);
    expect(requisitiDaTesto('richiede le tre statistiche almeno al livello 3; fonte non italiana').map((r) => r.tipo === 'dote' ? r.dote : r.tipo)).toEqual(['conoscenza', 'coraggio', 'perizia']);
    expect(requisitiDaTesto('Rango Confidente Sojiro 6')).toEqual([{ tipo: 'confidente', confidente: 'sojiro', rango: 6, testo: 'Rango Confidente Sojiro 6' }]);
    // senza nome: è il Confidente del negozio
    expect(requisitiDaTesto('Rango Confidente 3', { confidenteNegozio: 'iwai' })).toEqual([{ tipo: 'confidente', confidente: 'iwai', rango: 3, testo: 'Rango Confidente 3' }]);
    expect(requisitiDaTesto('richiede rango massimo del Confidente Haru, Imperatrice')[0]).toMatchObject({ tipo: 'confidente', confidente: 'haru', rango: 10 });
    expect(requisitiDaTesto('Rango Confidente Sojiro 9, richiede il completamento della richiesta Lo zio ingordo')).toEqual([
      { tipo: 'confidente', confidente: 'sojiro', rango: 9, testo: 'Rango Confidente Sojiro 9, richiede il completamento della richiesta Lo zio ingordo' },
      { tipo: 'richiesta', richiesta: 'Lo zio ingordo', testo: 'Rango Confidente Sojiro 9, richiede il completamento della richiesta Lo zio ingordo' },
    ]);
    expect(requisitiDaTesto('solo nei giorni di pioggia')).toEqual([{ tipo: 'piove', testo: 'solo nei giorni di pioggia' }]);
    // la fascia della giornata si legge insieme al resto della frase
    expect(requisitiDaTesto('solo la domenica sera')).toEqual([{ tipo: 'fascia', fascia: 'sera', testo: 'solo la domenica sera' }, { tipo: 'giorno-settimana', giorni: ['domenica'], testo: 'solo la domenica sera' }]);
    expect(requisitiDaTesto('solo di sera')).toEqual([{ tipo: 'fascia', fascia: 'sera', testo: 'solo di sera' }]);
    expect(requisitiDaTesto('Aperto solo di giorno')).toEqual([{ tipo: 'fascia', fascia: 'giorno', testo: 'Aperto solo di giorno' }]);
    expect(requisitiDaTesto('esclusivamente di sera')).toEqual([{ tipo: 'fascia', fascia: 'sera', testo: 'esclusivamente di sera' }]);
    // «al giorno» è una quantità, non una fascia
    expect(requisitiDaTesto('un succo al giorno')).toEqual([]);
    expect(requisitiDaTesto('solo in inverno')).toEqual([{ tipo: 'stagione', stagione: 'inverno', testo: 'solo in inverno' }]);
    expect(requisitiDaTesto('scambio disponibile dal 26 al 30 luglio')).toEqual([{ tipo: 'intervallo', dal: '07-26', al: '07-30', testo: 'scambio disponibile dal 26 al 30 luglio' }]);
    expect(requisitiDaTesto('scambio disponibile dal 22 gennaio al 2 febbraio')[0]).toMatchObject({ tipo: 'intervallo', dal: '01-22', al: '02-02' });
  });

  it('arco di un Palazzo, sblocco di un quartiere, più Doti in una frase, intervallo di giorni della settimana', () => {
    // l'arco di Madarame comincia quando Kamoshida è stato completato; quello di Kamoshida dall'inizio del gioco
    expect(requisitiDaTesto("a partire dall'arco del Palazzo di Madarame")).toEqual([{ tipo: 'palazzo', dungeon: 'kamoshida', testo: "a partire dall'arco del Palazzo di Madarame" }]);
    expect(requisitiDaTesto('a partire dall’arco del Palazzo di Shido')[0]).toMatchObject({ tipo: 'palazzo', dungeon: 'niijima' });
    expect(requisitiDaTesto("Durante l'arco del Palazzo di Niijima (Casinò)")[0]).toMatchObject({ tipo: 'palazzo', dungeon: 'okumura' });
    expect(requisitiDaTesto("a partire dall'arco del Palazzo di Kamoshida")).toEqual([]);
    expect(requisitiDaTesto('Disponibile da quando si sblocca Akihabara')).toEqual([{ tipo: 'quartiere', quartiere: 'akihabara', testo: 'Disponibile da quando si sblocca Akihabara' }]);
    expect(requisitiDaTesto("dopo aver scoperto l'area di Kichijoji")[0]).toMatchObject({ tipo: 'quartiere', quartiere: 'kichijoji' });
    // con la data esplicita vale la data, non il quartiere
    expect(requisitiDaTesto('Disponibile dal 5 giugno, quando si sblocca Kichijoji')).toEqual([{ tipo: 'data', dal: '06-05', testo: 'Disponibile dal 5 giugno, quando si sblocca Kichijoji' }]);
    expect(requisitiDaTesto('richiede Coraggio Rango 2, Conoscenza Rango 2 e Perizia Rango 2').map((r) => r.tipo === 'dote' ? `${r.dote}${r.rango}` : r.tipo)).toEqual(['coraggio2', 'conoscenza2', 'perizia2']);
    expect(requisitiDaTesto('Solo dal lunedì al venerdì, di sera; non disponibile in caso di pioggia')).toEqual([
      { tipo: 'fascia', fascia: 'sera', testo: 'Solo dal lunedì al venerdì, di sera; non disponibile in caso di pioggia' },
      { tipo: 'giorno-settimana', giorni: ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi'], testo: 'Solo dal lunedì al venerdì, di sera; non disponibile in caso di pioggia' },
      { tipo: 'meteo', condizione: 'non-piove', testo: 'Solo dal lunedì al venerdì, di sera; non disponibile in caso di pioggia' },
    ]);
    // «Rango Confidente Gemelle 3»: il Confidente delle Gemelle Custodi
    expect(requisitiDaTesto("Richiede il Rango Confidente Gemelle 3 (sblocco dell'Isolamento)")).toEqual([{ tipo: 'confidente', confidente: 'gemelle', rango: 3, testo: "Richiede il Rango Confidente Gemelle 3 (sblocco dell'Isolamento)" }]);
    // testi reali del seed: la coda «rango massimo» è descrittiva, l'inciso tra parentesi non produce requisiti, il grado di partenza non è una condizione
    expect(requisitiDaTesto('Rango Confidente Sojiro 10, rango massimo')).toEqual([{ tipo: 'confidente', confidente: 'sojiro', rango: 10, testo: 'Rango Confidente Sojiro 10, rango massimo' }]);
    expect(requisitiDaTesto('solo se la mansarda del Leblanc non viene pulita (altrimenti si ottiene dopo aver pulito la mansarda del Leblanc, dal 18 aprile)').map((r) => r.tipo)).toEqual(['ignoto']);
    expect(requisitiDaTesto('rango cliente Iniziale')).toEqual([]);
    expect(requisitiDaTesto('dopo il primo Palazzo (Kamoshida)')[0]).toMatchObject({ tipo: 'palazzo', dungeon: 'kamoshida' });
    // modalità di acquisto e orari non sono condizioni
    expect(requisitiDaTesto('scambio con Proteine d’importazione')).toEqual([]);
    expect(requisitiDaTesto('Disponibile fin dai primi giorni a Shibuya')).toEqual([]);
    expect(requisitiDaTesto('Disponibile dal primo ottobre: richiede il Laptop rotto (Yumenoshima, in vendita dal primo settembre) riparato con il Set di strumenti da PC (Akiba, Akihabara)')).toEqual([{ tipo: 'data', dal: '10-01', testo: 'Disponibile dal primo ottobre: richiede il Laptop rotto (Yumenoshima, in vendita dal primo settembre) riparato con il Set di strumenti da PC (Akiba, Akihabara)' }]);
  });

  it('la data di sblocco di un quartiere si legge solo se il testo della Guida comincia con una data', () => {
    expect(dataSbloccoQuartiere('18 giugno (evento di trama)')).toBe('06-18');
    expect(dataSbloccoQuartiere('31 agosto (evento di trama)')).toBe('08-31');
    expect(dataSbloccoQuartiere('Confidente Emperor (Yusuke) Rango 3')).toBeNull();
    expect(dataSbloccoQuartiere(null)).toBeNull();
  });

  it('scarta il rumore (posizione, prezzo, rifornimenti) e marca «ignoto» ciò che non sa leggere', () => {
    expect(requisitiDaTesto('sempre disponibile')).toEqual([]);
    expect(requisitiDaTesto('rifornimento il primo del mese')).toEqual([]);
    expect(requisitiDaTesto('Sottopasso di Shibuya, Shujin Academy')).toEqual([]);
    expect(requisitiDaTesto('30 punti negozio')).toEqual([]);
    expect(requisitiDaTesto('dopo aver pescato una volta')).toEqual([{ tipo: 'ignoto', testo: 'dopo aver pescato una volta' }]);
    expect(requisitiDaTesto('rango cliente Oscuro')).toEqual([{ tipo: 'ignoto', testo: 'rango cliente Oscuro' }]);
    expect(requisitiDaTesto('dal 18 aprile, oppure gratis pulendo la mansarda del Leblanc').map((r) => r.tipo)).toEqual(['data', 'ignoto']);
  });
});

describe('valutaDisponibilita', () => {
  it('data: bloccato prima, disponibile dal giorno indicato; senza giorno corrente è ignoto', () => {
    expect(valutaDisponibilita(['dal 18 aprile'], stato({ dataGioco: '04-16' })).stato).toBe('bloccato');
    expect(valutaDisponibilita(['dal 18 aprile'], stato({ dataGioco: '04-18' })).stato).toBe('disponibile');
    // calendario di gioco: gennaio viene dopo dicembre
    expect(valutaDisponibilita(['dal 9 gennaio'], stato({ dataGioco: '12-22' })).stato).toBe('bloccato');
    expect(valutaDisponibilita(['dal 9 gennaio'], stato({ dataGioco: '01-10' })).stato).toBe('disponibile');
    expect(valutaDisponibilita(['dal 18 aprile'], stato({ dataGioco: null })).stato).toBe('ignoto');
  });

  it('Palazzo, Dote, Confidente e richiesta usano lo stesso valutatore dei semafori', () => {
    expect(valutaDisponibilita(['dopo Palazzo di Kamoshida'], stato()).stato).toBe('bloccato');
    expect(valutaDisponibilita(['dopo Palazzo di Kamoshida'], stato({ bossGestiti: new Set(['kamoshida']) })).stato).toBe('disponibile');
    expect(valutaDisponibilita([null, 'richiede Fascino Rango 3'], stato()).stato).toBe('bloccato');
    expect(valutaDisponibilita([null, 'richiede Fascino Rango 3'], stato({ doti: new Map([['fascino', 3]]) })).stato).toBe('disponibile');
    expect(valutaDisponibilita([null, 'Rango Confidente Sojiro 6'], stato()).stato).toBe('bloccato');
    expect(valutaDisponibilita([null, 'Rango Confidente Sojiro 6'], stato({ ranghiConfidenti: new Map([['sojiro', 6]]) })).stato).toBe('disponibile');
    const richiesta = valutaDisponibilita([null, 'richiede il completamento della richiesta Lo zio ingordo'], stato());
    expect(richiesta.stato).toBe('bloccato');
    expect(richiesta.requisiti[0]).toMatchObject({ tipo: 'richiesta', stato: 'rosso', manuale: false });
    // il dettaglio non invita a «confermare qui»: nella scheda degli articoli non c'è alcuna conferma
    expect(richiesta.requisiti[0].dettaglio).not.toMatch(/conferma qui/);
    expect(valutaDisponibilita(['dopo Palazzo di Kamoshida'], stato()).requisiti[0].dettaglio).toBe('Palazzo di Kamoshida: segna il boss come sconfitto nella Guida');
    expect(valutaDisponibilita([null, 'richiede il completamento della richiesta Lo zio ingordo'], stato({ richiesteCompletate: new Set(['lo zio ingordo']) })).stato).toBe('disponibile');
  });

  it('fascia della giornata: «solo di sera» è bloccato di giorno, disponibile di sera; senza fascia resta «ignoto»', () => {
    expect(valutaDisponibilita([null, 'solo di sera'], stato()).stato).toBe('bloccato');
    expect(valutaDisponibilita([null, 'solo di sera'], stato()).requisiti[0]).toMatchObject({ tipo: 'fascia', stato: 'rosso', dettaglio: 'Solo di sera: ora è giorno' });
    expect(valutaDisponibilita([null, 'solo di sera'], stato({ fasciaGioco: 'sera' })).stato).toBe('disponibile');
    expect(valutaDisponibilita([null, 'aperto solo di giorno'], stato({ fasciaGioco: 'sera' })).stato).toBe('bloccato');
    expect(valutaDisponibilita([null, 'solo di sera'], stato({ fasciaGioco: null })).stato).toBe('ignoto');
    // «solo la domenica sera»: entrambe le condizioni devono valere
    expect(valutaDisponibilita([null, 'solo la domenica sera'], stato({ fasciaGioco: 'sera', giornoSettimana: 'domenica' })).stato).toBe('disponibile');
    expect(valutaDisponibilita([null, 'solo la domenica sera'], stato({ fasciaGioco: 'giorno', giornoSettimana: 'domenica' })).stato).toBe('bloccato');
  });

  it('pioggia, giorno della settimana, stagione e intervallo', () => {
    expect(valutaDisponibilita([null, 'solo nei giorni di pioggia'], stato({ meteoOggi: 'Sereno' })).stato).toBe('bloccato');
    expect(valutaDisponibilita([null, 'solo nei giorni di pioggia'], stato({ meteoOggi: 'Pioggia' })).stato).toBe('disponibile');
    expect(valutaDisponibilita([null, 'solo la domenica'], stato({ giornoSettimana: 'mercoledi' })).stato).toBe('bloccato');
    expect(valutaDisponibilita([null, 'solo la domenica'], stato({ giornoSettimana: 'domenica' })).stato).toBe('disponibile');
    expect(valutaDisponibilita([null, 'solo in inverno'], stato({ dataGioco: '04-20' })).stato).toBe('bloccato');
    expect(valutaDisponibilita([null, 'solo in inverno'], stato({ dataGioco: '12-25' })).stato).toBe('disponibile');
    expect(valutaDisponibilita([null, 'scambio disponibile dal 26 al 30 luglio'], stato({ dataGioco: '07-28' })).stato).toBe('disponibile');
    expect(valutaDisponibilita([null, 'scambio disponibile dal 26 al 30 luglio'], stato({ dataGioco: '08-02' })).stato).toBe('bloccato');
  });

  it('quartiere: bloccato prima della data della Guida, disponibile dopo; senza data resta «ignoto»', () => {
    expect(valutaDisponibilita(['Disponibile da quando si sblocca Akihabara'], stato({ dataGioco: '06-20' })).stato).toBe('bloccato');
    const dopo = valutaDisponibilita(['Disponibile da quando si sblocca Akihabara'], stato({ dataGioco: '09-02' }));
    expect(dopo.stato).toBe('disponibile');
    expect(dopo.requisiti[0]).toMatchObject({ tipo: 'data', stato: 'verde' });
    expect(dopo.requisiti[0].dettaglio.startsWith('Akihabara: ')).toBe(true);
    const senzaData = valutaDisponibilita(["dopo aver scoperto l'area di Kichijoji"], stato());
    expect(senzaData.stato).toBe('ignoto');
    expect(senzaData.requisiti[0].dettaglio).toBe('Kichijoji: la Guida non indica una data di sblocco');
    // arco del Palazzo: disponibile quando il Palazzo precedente è completato
    expect(valutaDisponibilita(["a partire dall'arco del Palazzo di Madarame"], stato()).stato).toBe('bloccato');
    expect(valutaDisponibilita(["a partire dall'arco del Palazzo di Madarame"], stato({ bossGestiti: new Set(['kamoshida']) })).stato).toBe('disponibile');
    expect(valutaDisponibilita(["a partire dall'arco del Palazzo di Kamoshida"], stato()).stato).toBe('disponibile');
    // televendita: solo quel giorno
    expect(valutaDisponibilita([null, 'domenica 24 aprile'], stato({ dataGioco: '04-24' })).stato).toBe('disponibile');
    expect(valutaDisponibilita([null, 'domenica 24 aprile'], stato({ dataGioco: '04-25' })).stato).toBe('bloccato');
  });

  it('senza condizioni è disponibile; una condizione non leggibile lascia «ignoto» senza nascondere', () => {
    expect(valutaDisponibilita([null, null], stato())).toEqual({ stato: 'disponibile', requisiti: [] });
    const r = valutaDisponibilita([null, 'dopo aver pescato una volta'], stato());
    expect(r.stato).toBe('ignoto');
    expect(r.requisiti[0]).toMatchObject({ tipo: 'manuale', stato: 'grigio' });
  });
});
