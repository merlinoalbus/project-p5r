// ============================================================
// Test articoli — il filtro come valore: applicazione pura e andata/ritorno con l'indirizzo
// ============================================================

import { FILTRO_VUOTO, categoriePresenti, destinatariPresenti, filtraArticoli, filtroAttivo, filtroDaParametri, parametriDaFiltro } from './articoli';
import type { ArticoloDto } from '../types';

const art = (chiave: string, nome: string, categoria: ArticoloDto['categoria'], per: string | null, extra: Partial<ArticoloDto> = {}): ArticoloDto => ({
  chiave, negozioChiave: 'u', negozioNome: 'Untouchable', nome, nomeIt: null, categoria, per, prezzo: 100, effetto: null, statistiche: null, quantita: null,
  oggettoFonte: null, oggettoChiave: null, disponibileDal: null, condizione: null, nota: null, fonte: '', verificato: true, acquistato: false, ...extra,
});
const articoli = [
  art('a', 'Kogatana nera', 'arma', 'Joker', { acquistato: true, disponibilita: { stato: 'disponibile', requisiti: [] } }),
  art('b', 'Frusta', 'arma', 'Ann', { effetto: 'Sferza', disponibilita: { stato: 'bloccato', requisiti: [] } }),
  art('c', 'Giubbotto', 'protezione', 'tutti'),
  art('d', 'Caffè', 'cibo', null, { nomeIt: 'Caffe di Leblanc' }),
];

describe('filtraArticoli', () => {
  it('senza filtro passa tutto, nell’ordine', () => {
    expect(filtraArticoli(articoli, FILTRO_VUOTO, true).map((a) => a.chiave)).toEqual(['a', 'b', 'c', 'd']);
    expect(filtroAttivo(FILTRO_VUOTO)).toBe(false);
  });
  it('cerca nel nome, nel nome italiano e nell’effetto, senza accenti né maiuscole', () => {
    expect(filtraArticoli(articoli, { ...FILTRO_VUOTO, q: 'CAFFE' }, false).map((a) => a.chiave)).toEqual(['d']);
    expect(filtraArticoli(articoli, { ...FILTRO_VUOTO, q: 'sferza' }, false).map((a) => a.chiave)).toEqual(['b']);
  });
  it('più categorie insieme, e «tutti» vale per ogni destinatario', () => {
    expect(filtraArticoli(articoli, { ...FILTRO_VUOTO, categorie: ['arma', 'cibo'] }, false).map((a) => a.chiave)).toEqual(['a', 'b', 'd']);
    expect(filtraArticoli(articoli, { ...FILTRO_VUOTO, per: 'Ann' }, false).map((a) => a.chiave)).toEqual(['b', 'c']);
  });
  it('stato e disponibilità valgono solo con una partita', () => {
    expect(filtraArticoli(articoli, { ...FILTRO_VUOTO, stato: 'acquistati' }, true).map((a) => a.chiave)).toEqual(['a']);
    expect(filtraArticoli(articoli, { ...FILTRO_VUOTO, stato: 'da-acquistare' }, true).map((a) => a.chiave)).toEqual(['b', 'c', 'd']);
    expect(filtraArticoli(articoli, { ...FILTRO_VUOTO, disponibilita: 'bloccati' }, true).map((a) => a.chiave)).toEqual(['b']);
    expect(filtraArticoli(articoli, { ...FILTRO_VUOTO, disponibilita: 'disponibili' }, true).map((a) => a.chiave)).toEqual(['a', 'c', 'd']);
    expect(filtraArticoli(articoli, { ...FILTRO_VUOTO, stato: 'acquistati', disponibilita: 'bloccati' }, false)).toHaveLength(4);
  });
  it('conta le categorie presenti e nomina i destinatari senza «tutti»', () => {
    expect(categoriePresenti(articoli)).toEqual([{ chiave: 'arma', n: 2 }, { chiave: 'protezione', n: 1 }, { chiave: 'cibo', n: 1 }]);
    expect(destinatariPresenti(articoli)).toEqual(['Joker', 'Ann']);
  });
});

describe('indirizzo', () => {
  it('legge i parametri, anche il vecchio «categoria» singolo, e scarta i valori sconosciuti', () => {
    expect(filtroDaParametri(new URLSearchParams('q=x&categorie=arma,libro&categoria=arma&per=Ann&stato=acquistati&disponibilita=boh')))
      .toEqual({ q: 'x', categorie: ['arma', 'libro'], per: 'Ann', stato: 'acquistati', disponibilita: 'tutti' });
  });
  it('scrive solo ciò che non è «tutto» e conserva gli altri parametri', () => {
    const p = parametriDaFiltro({ q: ' x ', categorie: ['arma'], per: '', stato: 'tutti', disponibilita: 'bloccati' }, new URLSearchParams('altro=1&categoria=vecchio'));
    expect(p.toString()).toBe('altro=1&q=x&categorie=arma&disponibilita=bloccati');
    expect(parametriDaFiltro(FILTRO_VUOTO).toString()).toBe('');
  });
});
