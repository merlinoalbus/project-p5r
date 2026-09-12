// ============================================================
// Test definizioni — con quali valori parte ogni modulo e che cosa manda all'API (senza interfaccia)
// ============================================================

import { ORARI_SEMPRE } from '../../../../shared/orariNegozio';
import * as def from './definizioni';
import type { ElementoCatalogoDto } from '../../../types';

const riga = (tipo: ElementoCatalogoDto['tipo'], dati: Record<string, unknown>): ElementoCatalogoDto => ({ tipo, chiave: 'k', nome: 'n', origine: 'seed', modificata: false, nascosta: false, aggiornata: null, dati });

describe('negozio', () => {
  it('parte con gli orari «sempre» e senza programma punti; legge gli orari salvati come JSON', () => {
    expect(def.negozio.iniziali(null)).toMatchObject({ tipo: 'altro', orari_json: ORARI_SEMPRE, programma_punti_json: null, sede_chiave: null });
    const d = def.negozio.iniziali(riga('negozio', { nome: 'X', orari_json: '{"giorni":["domenica"],"fasce":[],"chiusoConPioggia":true,"nota":null}', programma_punti_json: '{"nome":"Tessera","unita":"punti","calcolo":"manuale"}' }));
    expect(d.orari_json).toEqual({ giorni: ['domenica'], fasce: [], chiusoConPioggia: true, nota: null });
    expect(d.programma_punti_json).toEqual({ nome: 'Tessera', unita: 'punti', calcolo: 'manuale' });
  });
  it('non è valido senza nome, né con un programma punti senza nome', () => {
    expect(def.negozio.valido({ ...def.negozio.iniziali(null), nome: ' ' })).toBe(false);
    expect(def.negozio.valido({ ...def.negozio.iniziali(null), nome: 'X', programma_punti_json: { nome: '', unita: 'punti', calcolo: 'manuale' } })).toBe(false);
    expect(def.negozio.valido({ ...def.negozio.iniziali(null), nome: 'X' })).toBe(true);
  });
  it('non manda condizioni né sblocco: la presenza sono gli orari', () => {
    const corpo = def.negozio.prepara({ ...def.negozio.iniziali(null), nome: ' Chiosco ', gestore: '' });
    expect(corpo).toMatchObject({ nome: 'Chiosco', gestore: null, orari_json: ORARI_SEMPRE });
    expect(corpo).not.toHaveProperty('condizioni_json');
    expect(corpo).not.toHaveProperty('sblocco');
  });
});

describe('articolo', () => {
  it('una riga esistente senza collegamento è «a mano»; una nuova aspetta la scelta', () => {
    expect(def.articolo.iniziali(null, 'untouchable')).toMatchObject({ negozio_chiave: 'untouchable', _aMano: false, _collegato: null });
    expect(def.articolo.iniziali(riga('articolo', { negozio_chiave: 'u', nome: 'X', oggetto_fonte: null }))).toMatchObject({ _aMano: true });
    expect(def.articolo.iniziali(riga('articolo', { negozio_chiave: 'u', nome: 'X', oggetto_fonte: 'libri', oggetto_chiave: 'l' }))).toMatchObject({ _aMano: false, oggetto_fonte: 'libri' });
  });
  it('con l’oggetto collegato manda il legame e non i campi copiati; i valori temporanei non partono', () => {
    const collegato = { chiave: 'l', fonte: 'libri', categoria: 'libro', nome: 'Libro', nomeIt: null, effetto: 'E', statistiche: 'S', per: null, prezzo: 100 };
    const corpo = def.articolo.prepara({ ...def.articolo.iniziali(null, 'u'), _collegato: collegato, nome: 'Libro', categoria: 'libro', effetto_json: { famiglia: 'descrittivo', testo: 'x' }, statistiche: 'copia' });
    expect(corpo).toMatchObject({ oggetto_fonte: 'libri', oggetto_chiave: 'l', effetto_json: null, effetto: null, statistiche: null });
    expect(Object.keys(corpo).some((k) => k.startsWith('_'))).toBe(false);
  });
  it('un legame salvato che l’archivio non ha più si conserva: non si scollega in silenzio', () => {
    const d = def.articolo.iniziali(riga('articolo', { negozio_chiave: 'u', nome: 'X', oggetto_fonte: 'libri', oggetto_chiave: 'sparito' }));
    expect(def.articolo.valido(d)).toBe(true);
    expect(def.articolo.prepara(d)).toMatchObject({ oggetto_fonte: 'libri', oggetto_chiave: 'sparito', effetto_json: null });
    // scegliendo la via «a mano» il legame cade davvero
    expect(def.articolo.prepara({ ...d, _aMano: true, oggetto_fonte: null, oggetto_chiave: null })).toMatchObject({ oggetto_fonte: null, oggetto_chiave: null });
  });
  it('a mano manda la dichiarazione e la frase che ne discende', () => {
    const corpo = def.articolo.prepara({ ...def.articolo.iniziali(null, 'u'), _aMano: true, nome: 'Bibita', effetto_json: { famiglia: 'ripristina', risorsa: 'sp', misura: 'assoluta', valore: 100, bersaglio: 'un-alleato' } });
    expect(corpo).toMatchObject({ effetto: 'Ripristina 100 SP di un alleato', oggetto_fonte: null });
  });
});

describe('film', () => {
  it('al cinema la visione è una; in DVD cadono le voci «ripetuto»', () => {
    const voci = [{ effetto: { famiglia: 'dote', dote: 'fascino', note: 2 }, ripetuto: true }];
    expect(def.film.prepara({ ...def.film.iniziali(null), nome: 'F', sessioni: 5, effetti_json: voci })).toMatchObject({ dove: 'cinema', sessioni: 1, effetti_json: voci });
    const dvd = def.film.prepara({ ...def.film.iniziali(null), nome: 'F', dove: 'dvd', sessioni: 2, effetti_json: voci });
    expect(dvd.sessioni).toBe(2);
    expect((dvd.effetti_json as Array<{ ripetuto?: boolean }>)[0].ripetuto).toBeUndefined();
  });
  it('legge gli effetti salvati e scarta le voci senza famiglia', () => {
    const d = def.film.iniziali(riga('film', { nome: 'F', dove: 'dvd', sessioni: 2, effetti_json: '[{"effetto":{"famiglia":"dote","dote":"fascino","note":2}},{"effetto":{}}]' }));
    expect(d.effetti_json).toEqual([{ effetto: { famiglia: 'dote', dote: 'fascino', note: 2 } }]);
  });
});

describe('attività e videogioco', () => {
  it('la paga è dei lavori; il conteggio segue il tipo', () => {
    const base = def.attivita.iniziali(null);
    expect(base).toMatchObject({ tipo: 'altro', tracciamento: 'nessuno', fascia: 'entrambe' });
    expect(def.attivita.prepara({ ...base, nome: 'A', tipo: 'studio', paga_yen: 100 })).toMatchObject({ paga_yen: null, paga_massima: null });
    expect(def.attivita.prepara({ ...base, nome: 'A', tipo: 'lavoro', paga_yen: 3500, paga_massima: 7400, tracciamento: 'svolta' })).toMatchObject({ paga_yen: 3500, paga_massima: 7400, tracciamento: 'svolta' });
  });
  it('il videogioco ha il tipo fissato, un round almeno e il conteggio per sessioni', () => {
    const d = def.videogioco.iniziali(null);
    expect(d).toMatchObject({ tipo: 'videogioco', sessioni: 1, _tipoFisso: 'videogioco' });
    expect(def.videogioco.valido({ ...d, nome: 'V', sessioni: 0 })).toBe(false);
    expect(def.videogioco.prepara({ ...d, nome: 'V', tracciamento: 'nessuno' })).toMatchObject({ tipo: 'videogioco', tracciamento: 'sessioni' });
  });
});

describe('domanda e cruciverba', () => {
  it('le risposte vuote cadono e le altre si rinumerano; il quesito d’esame resta', () => {
    const corpo = def.domanda.prepara({ ...def.domanda.iniziali(null), data: '04-12', domanda: 'Q', risposte_json: [{ ordine: 1, testo: ' ' }, { ordine: 2, testo: 'B', domanda: 'quesito' }, { ordine: 3, testo: 'C' }] });
    expect(corpo.risposte_json).toEqual([{ ordine: 1, testo: 'B', domanda: 'quesito' }, { ordine: 2, testo: 'C' }]);
    // «Che cosa dà» e «Note» vuoti partono come stringa vuota: lo schema del server non ammette null
    expect(corpo).toMatchObject({ ricompensa: '', note: '', tipo: 'classe' });
    // «Chi la fa» parte vuoto: una domanda nuova non si attribuisce a un docente per sbaglio
    expect(def.domanda.iniziali(null).chi).toBe('');
    expect(corpo.chi).toBe('');
    expect(def.cruciverba.prepara({ ...def.cruciverba.iniziali(null), data: '04-18', indizio: 'I', risposta: 'R' })).toMatchObject({ risposta_en: null });
    expect(def.domanda.valido({ ...def.domanda.iniziali(null), data: '04-12' })).toBe(false);
    expect(def.cruciverba.valido({ ...def.cruciverba.iniziali(null), data: '04-18', indizio: 'I', risposta: 'R' })).toBe(true);
  });
});
