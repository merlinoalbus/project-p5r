// ============================================================
// Test navigazioneMappa — dove porta uno spillo: destinazione esplicita, collegamento legacy, arrivo invalidato, solo gli spostamenti
// ============================================================

import { arrivoSpillo, casaConArrivo, casaConInfiltrazione, casaEQuesta, destinazioneMappaSpillo, infiltrazioneDelRitorno, nomeDellaMeta, nomeMetaSpillo, urlCasa } from './navigazioneMappa';
import type { SpilloDto } from '../types';
const legacy = { tipo: 'passaggio', riferimento: { tipo: 'mappa', chiave: 'vecchia' }, dettaglio: { tipo: 'mappa', mappa: { chiave: 'vecchia' } } } as SpilloDto;
it('la destinazione esplicita vince sul vecchio riferimento, e porta lo spillo di arrivo', () => {
  expect(arrivoSpillo({ ...legacy, destinazione: { mappa: 'nuova', spillo: 5 } })).toEqual({ mappa: 'nuova', spillo: 5 });
  expect(destinazioneMappaSpillo({ ...legacy, destinazione: { mappa: 'nuova', spillo: null } })).toBe('nuova');
});
it('non considera raggiungibile un arrivo invalidato', () => {
  expect(destinazioneMappaSpillo({ ...legacy, destinazioneNonDisponibile: true })).toBeNull();
});
it('mantiene il collegamento legacy risolto e scarta quello non risolto', () => {
  expect(destinazioneMappaSpillo(legacy)).toBe('vecchia');
  expect(destinazioneMappaSpillo({ ...legacy, dettaglio: null })).toBeNull();
});
it('solo gli spostamenti portano altrove: un negozio o una nota con un riferimento a una mappa non sono un passaggio', () => {
  expect(destinazioneMappaSpillo({ ...legacy, tipo: 'negozio' })).toBeNull();
  expect(destinazioneMappaSpillo({ ...legacy, tipo: 'nota', destinazione: { mappa: 'nuova', spillo: null } })).toBeNull();
  expect(destinazioneMappaSpillo({ ...legacy, tipo: 'ingresso-palazzo' })).toBe('vecchia');
});

// ---- L2 (2026-10-20): la casa di ogni mappa e il nome della meta ----
describe('urlCasa', () => {
  it('aggiunge l’arrivo con ? o & secondo la casa, e sostituisce un arrivo già presente', () => {
    expect(urlCasa('/guida/citta/shibuya/sottopasso')).toBe('/guida/citta/shibuya/sottopasso');
    expect(urlCasa('/guida/citta/shibuya/sottopasso', { spillo: 7 })).toBe('/guida/citta/shibuya/sottopasso?spillo=7');
    expect(urlCasa('/guida/citta/shibuya/sottopasso?planimetria=shibuya-sottopasso-speciale', { x: 38.29, y: 32.67, zoom: 1 }))
      .toBe('/guida/citta/shibuya/sottopasso?planimetria=shibuya-sottopasso-speciale&x=38.29&y=32.67&zoom=1');
    expect(urlCasa('/guida/mappe/k?spillo=1', { spillo: 2 })).toBe('/guida/mappe/k?spillo=2');
  });
});
describe('casaConArrivo e casaEQuesta (il redirect di /guida/mappe/<k>)', () => {
  it('porta spillo, punto, contesto e area dell’indirizzo vecchio; la versione della casa resta', () => {
    expect(casaConArrivo('/guida/citta/shibuya/sottopasso?planimetria=shibuya-sottopasso-speciale', new URLSearchParams('spillo=42&altro=1')))
      .toBe('/guida/citta/shibuya/sottopasso?planimetria=shibuya-sottopasso-speciale&spillo=42');
    expect(casaConArrivo('/guida/citta/shibuya', new URLSearchParams(''))).toBe('/guida/citta/shibuya');
    expect(casaConArrivo('/guida/citta/shibuya/central-street', new URLSearchParams('x=1&y=2&zoom=3'))).toBe('/guida/citta/shibuya/central-street?x=1&y=2&zoom=3');
  });
  it('una casa che è il visore stesso non reindirizza, qualunque sia la codifica della chiave: niente giri di redirect', () => {
    expect(casaEQuesta('/guida/mappe/kamoshida%2Fprigione', 'kamoshida/prigione')).toBe(true);
    expect(casaEQuesta('/guida/mappe/kamoshida%2Fprigione?spillo=3', 'kamoshida%2Fprigione')).toBe(true);
    expect(casaEQuesta('/guida/citta/shibuya', 'citta-shibuya')).toBe(false);
  });
});
describe('nomeDellaMeta e nomeMetaSpillo (i pin di passaggio col nome del posto)', () => {
  it('l’area se la meta è una sua planimetria, altrimenti il nome della mappa; mai «Mappa»', () => {
    expect(nomeDellaMeta({ nome: 'Vicoli', area: { nome: 'Vicoli' } })).toBe('Vicoli');
    expect(nomeDellaMeta({ nome: 'Yongen-Jaya', area: null })).toBe('Yongen-Jaya');
    const pin1628 = { tipo: 'passaggio', nome: 'Mappa', dettaglio: { tipo: 'mappa', mappa: { chiave: 'citta-yongen-jaya', nome: 'Yongen-Jaya', tipo: 'quartiere', area: null, casa: '/guida/citta/yongen-jaya' } } } as SpilloDto;
    expect(nomeMetaSpillo(pin1628)).toBe('Yongen-Jaya');
    const scala = { tipo: 'passaggio', nome: 'Piano 2', dettaglio: { tipo: 'mappa', mappa: { chiave: 'nativo-002-0-1', nome: 'Edificio principale 2P', tipo: 'luogo', area: { nome: 'Edificio principale 2P / Edificio laboratori 2P' }, casa: '/guida/citta/shujin-academy/x' } } } as SpilloDto;
    expect(nomeMetaSpillo(scala)).toBe('Edificio principale 2P / Edificio laboratori 2P');
    expect(nomeMetaSpillo({ ...pin1628, tipo: 'negozio' } as SpilloDto)).toBeNull();
  });
});

describe('casaConInfiltrazione e infiltrazioneDelRitorno (L3, AP3-4: dritti alla casa, con l’infiltrazione aperta)', () => {
  it('sulla casa di un’area di un Palazzo mette l’infiltrazione e sempre la planimetria; le altre case restano com’erano', () => {
    expect(casaConInfiltrazione('/guida/dungeon/madarame/area/museo-1p', 'm-153-2-0', 'k-04')).toBe('/guida/dungeon/madarame/area/museo-1p?infiltrazione=k-04&planimetria=m-153-2-0');
    expect(casaConInfiltrazione('/guida/dungeon/madarame/area/museo-1p?planimetria=m-153-2-1', 'm-153-2-1', 'k-04')).toBe('/guida/dungeon/madarame/area/museo-1p?planimetria=m-153-2-1&infiltrazione=k-04');
    expect(casaConInfiltrazione('/guida/dungeon/madarame/area/museo-1p', 'm-153-2-0', null)).toBe('/guida/dungeon/madarame/area/museo-1p');
    expect(casaConInfiltrazione('/guida/citta/shibuya/area/x', 'm', 'k-04')).toBe('/guida/citta/shibuya/area/x');
  });
  it('l’infiltrazione viene dalla pagina da cui si è entrati, solo se è la scheda dello stesso Palazzo', () => {
    expect(infiltrazioneDelRitorno('/guida/dungeon/madarame/area/museo-1p', '/guida/dungeon/madarame/area/entrata?infiltrazione=k-04&planimetria=x')).toBe('k-04');
    expect(infiltrazioneDelRitorno('/guida/dungeon/madarame/area/museo-1p', '/guida/dungeon/madarame?infiltrazione=k-04')).toBe('k-04');
    expect(infiltrazioneDelRitorno('/guida/dungeon/madarame/area/museo-1p', '/guida/dungeon/madarame-bis?infiltrazione=k-04')).toBeNull();
    expect(infiltrazioneDelRitorno('/guida/dungeon/madarame/area/museo-1p', '/guida/dungeon/kamoshida?infiltrazione=k-04')).toBeNull();
    expect(infiltrazioneDelRitorno('/guida/dungeon/madarame/area/museo-1p', null)).toBeNull();
    expect(infiltrazioneDelRitorno('/guida/citta/shibuya/area/x', '/guida/dungeon/madarame?infiltrazione=k-04')).toBeNull();
  });
});
