/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test VisoreMappa — spilli con icona, raccolti nascosti, categorie, popup ancorato, scheda del negozio, navigazione (Fase 13.2)
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { VisoreMappa } from './VisoreMappa';
import type { MappaDto, SpilloDto } from '../../types';

function spillo(extra: Partial<SpilloDto> & { id: number; nome: string; tipo: SpilloDto['tipo'] }): SpilloDto {
  return { mappaChiave: 'citta-shibuya', tipoNome: extra.tipo, colore: '#abc', descrizione: '', x: 50, y: 50, riferimento: null, collezionabile: false, ordine: 0, origine: 'seed', raccolto: false, dettaglio: null, condizioni: [], immagini: [], updatedAt: '2026-09-04T00:00:00.000Z', ...extra };
}

const mappa: MappaDto = {
  chiave: 'citta-shibuya', nome: 'Shibuya', tipo: 'quartiere', genitore: 'tokyo', genitoreNome: 'Tokyo', ordine: 1, immagineUrl: null, asset: null, entita: { tipo: 'quartiere', chiave: 'shibuya' }, origine: 'seed',
  numeroSpilli: 4, numeroFigli: 1, updatedAt: '2026-09-04T00:00:00.000Z', larghezza: 1000, altezza: 500, note: '',
  percorso: [{ chiave: 'tokyo', nome: 'Tokyo' }, { chiave: 'citta-shibuya', nome: 'Shibuya' }],
  figli: [{ chiave: 'shibuya-centro', nome: 'Shibuya centro', tipo: 'luogo', genitore: 'citta-shibuya', ordine: 0, immagineUrl: null, asset: null, entita: null, origine: 'utente', numeroSpilli: 0, numeroFigli: 0, updatedAt: '' }],
  spilli: [
    spillo({ id: 1, nome: 'Untouchable', tipo: 'negozio', tipoNome: 'Negozio', x: 20, y: 20, riferimento: { tipo: 'luogo', chiave: 'shibuya/untouchable' }, dettaglio: { tipo: 'luogo', luogo: { chiave: 'shibuya/untouchable', quartiere: 'shibuya', tipo: 'negozio', nome: 'Untouchable', cosaOffre: 'Armi e munizioni', quando: null }, negozio: { chiave: 'untouchable', nome: 'Untouchable', tipo: 'armi', disponibilita: { stato: 'disponibile', requisiti: [] }, articoli: [{ chiave: 'a1', nome: 'Pistola modello Tkachev', categoria: 'arma', prezzo: 12000, disponibileDal: null, comprato: false, disponibilita: { stato: 'disponibile', requisiti: [] } }, { chiave: 'a2', nome: 'Fucile a pompa Governor', categoria: 'arma', prezzo: 48000, disponibileDal: 'dal 18 giugno', comprato: false, disponibilita: { stato: 'bloccato', requisiti: [{ indice: 0, tipo: 'data', stato: 'rosso', testo: 'dal 18 giugno', dettaglio: 'oggi è il 20 aprile', manuale: false, confermato: false }] } }, { chiave: 'a3', nome: 'Proiettili perforanti', categoria: 'munizioni', prezzo: 3000, disponibileDal: null, comprato: false, disponibilita: { stato: 'ignoto', requisiti: [{ indice: 0, tipo: 'manuale', stato: 'grigio', testo: 'rango cliente Oscuro', dettaglio: 'Condizione non verificabile dai dati della partita', manuale: true, confermato: false }] } }] } } }),
    spillo({ id: 2, nome: 'Scrigno raccolto', tipo: 'forziere', tipoNome: 'Forziere', x: 80, y: 80, collezionabile: true, raccolto: true }),
    spillo({ id: 3, nome: 'Verso il centro', tipo: 'passaggio', tipoNome: 'Passaggio', x: 10, y: 90, riferimento: { tipo: 'mappa', chiave: 'shibuya-centro' }, dettaglio: { tipo: 'mappa', mappa: { chiave: 'shibuya-centro', nome: 'Shibuya centro', tipo: 'luogo' }, immagine: { url: '/api/immagini/mappa/shibuya-centro/file', asset: null } }, immagini: [{ id: 31, url: '/api/immagini/spillo/3-a/file', asset: null, didascalia: 'La scala', ordine: 0 }, { id: 32, url: null, asset: 'spilli/citta-shibuya/3-2', didascalia: '', ordine: 1 }] }),
    spillo({ id: 4, nome: 'Scrigno da aprire', tipo: 'forziere', tipoNome: 'Forziere', x: 90, y: 10, collezionabile: true, descrizione: 'Contiene un Panino a mezzaluna.' }),
    spillo({ id: 5, nome: 'Forziere del corridoio', tipo: 'forziere', tipoNome: 'Forziere', x: 40, y: 60, collezionabile: true, riferimento: { tipo: 'punto', chiave: 'kamoshida-02/3' }, dettaglio: { tipo: 'punto', punto: { chiave: 'kamoshida-02/3', tipo: 'forziere', nome: 'Forziere del corridoio', descrizione: '', esauribile: true, dungeon: 'kamoshida', area: 'kamoshida-02', stato: null } } }),
    // spillo con una condizione non soddisfatta alla data corrente della partita: nascosto finché non si chiede di vederlo
    spillo({ id: 6, nome: 'Bancarella estiva', tipo: 'attivita', tipoNome: 'Attività', x: 60, y: 30, condizioni: [{ tipo: 'data', dal: '06-18', testo: 'dal 18 giugno' }], disponibilita: { stato: 'bloccato', requisiti: [{ indice: 0, tipo: 'data', stato: 'rosso', testo: 'dal 18 giugno', dettaglio: 'Disponibile dal 18 giugno, oggi è il 20 aprile', manuale: false, confermato: false }] } }),
  ],
};

function monta(extra: Partial<Parameters<typeof VisoreMappa>[0]> = {}) {
  const onNaviga = vi.fn();
  const onRaccolto = vi.fn().mockResolvedValue(undefined);
  const onStatoPunto = vi.fn().mockResolvedValue(undefined);
  const onAcquisto = vi.fn().mockResolvedValue(undefined);
  render(<MemoryRouter><VisoreMappa mappa={mappa} partitaId={7} onNaviga={onNaviga} onRaccolto={onRaccolto} onStatoPunto={onStatoPunto} onAcquisto={onAcquisto} {...extra} /></MemoryRouter>);
  return { onNaviga, onRaccolto, onStatoPunto, onAcquisto };
}

describe('VisoreMappa', () => {
  it('mostra gli spilli con tipo e nome, nasconde i collezionabili raccolti e li rivela con l’interruttore', () => {
    monta();
    expect(screen.getByRole('button', { name: 'Negozio: Untouchable' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Forziere: Scrigno da aprire' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Scrigno raccolto/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mostra anche i raccolti (1)' }));
    expect(screen.getByRole('button', { name: 'Forziere: Scrigno raccolto (raccolto)' })).toBeInTheDocument();
    // progresso dei collezionabili: 1 su 3
    expect(screen.getByRole('progressbar', { name: 'Collezionabili raccolti' })).toHaveAttribute('aria-valuenow', '33');
    expect(screen.getByText('1 di 3 raccolti · 33%')).toBeInTheDocument();
  });

  it('le categorie filtrano gli spilli; «Nascondi tutti» e «Mostra tutti» agiscono su tutte', () => {
    monta();
    const categorie = within(screen.getByRole('list', { name: 'Categorie degli spilli' }));
    fireEvent.click(categorie.getByRole('button', { name: /Forziere/ }));
    expect(screen.queryByRole('button', { name: 'Forziere: Scrigno da aprire' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Negozio: Untouchable' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Nascondi tutti' }));
    expect(screen.queryByRole('button', { name: 'Negozio: Untouchable' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mostra tutti' }));
    expect(screen.getByRole('button', { name: 'Forziere: Scrigno da aprire' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Negozio: Untouchable' })).toBeInTheDocument();
  });

  it('il click su uno spillo apre il popup ancorato con le azioni: passaggio → apre la mappa collegata', () => {
    const { onNaviga } = monta();
    fireEvent.click(screen.getByRole('button', { name: 'Passaggio: Verso il centro' }));
    const popup = within(screen.getByRole('dialog', { name: 'Verso il centro' }));
    // immagine della mappa collegata e schermate di riferimento nel popup
    expect(popup.getByRole('img', { name: 'Immagine: Verso il centro' })).toHaveAttribute('src', '/api/immagini/mappa/shibuya-centro/file');
    expect(within(popup.getByRole('list', { name: 'Schermate di Verso il centro' })).getAllByRole('button')).toHaveLength(2);
    fireEvent.click(popup.getByRole('button', { name: 'Ingrandisci: La scala' }));
    expect(screen.getByRole('dialog', { name: 'La scala' })).toBeInTheDocument();
    fireEvent.click(popup.getByRole('button', { name: 'Apri: Shibuya centro' }));
    expect(onNaviga).toHaveBeenCalledWith('shibuya-centro');
  });

  it('il popup di un collezionabile permette di segnarlo raccolto; la scheda del negozio elenca gli articoli con prezzo', async () => {
    const { onRaccolto } = monta();
    fireEvent.click(screen.getByRole('button', { name: 'Forziere: Scrigno da aprire' }));
    const popup = within(screen.getByRole('dialog', { name: 'Scrigno da aprire' }));
    expect(popup.getByText('Contiene un Panino a mezzaluna.')).toBeInTheDocument();
    fireEvent.click(popup.getByRole('button', { name: 'Raccolto' }));
    expect(onRaccolto).toHaveBeenCalledWith(expect.objectContaining({ id: 4 }), true);
    fireEvent.click(screen.getByRole('button', { name: 'Negozio: Untouchable' }));
    const scheda = within(await screen.findByRole('region', { name: 'Scheda: Untouchable' }));
    expect(scheda.getByRole('table', { name: 'Articoli di Untouchable' })).toBeInTheDocument();
    expect(scheda.getByText('Pistola modello Tkachev')).toBeInTheDocument();
    expect(scheda.getByText('12.000 ¥')).toBeInTheDocument();
    expect(scheda.getByRole('link', { name: 'scheda del negozio' })).toHaveAttribute('href', '/guida/negozi/untouchable');
    // l'articolo non ancora disponibile alla data corrente è nascosto e conteggiato; quello «da verificare» resta con il chip
    expect(scheda.getByText(/Untouchable · 2 articoli/)).toBeInTheDocument();
    expect(scheda.queryByText('Fucile a pompa Governor')).not.toBeInTheDocument();
    expect(scheda.getByText('Proiettili perforanti')).toBeInTheDocument();
    expect(scheda.getByText('Da verificare')).toHaveAttribute('title', 'rango cliente Oscuro — Condizione non verificabile dai dati della partita');
    fireEvent.click(scheda.getByRole('button', { name: 'Mostra anche l’articolo non ancora disponibile' }));
    expect(scheda.getByText('Fucile a pompa Governor')).toBeInTheDocument();
    expect(scheda.getByText('Non ancora')).toHaveAttribute('title', 'dal 18 giugno — oggi è il 20 aprile');
    expect(scheda.getByText(/Untouchable · 3 articoli/)).toBeInTheDocument();
    fireEvent.click(scheda.getByRole('button', { name: 'Nascondi l’articolo non ancora disponibile' }));
    expect(scheda.queryByText('Fucile a pompa Governor')).not.toBeInTheDocument();
  });

  it('percorso, mappa genitore e mappe figlie navigano; senza partita il collezionabile non è segnabile', () => {
    const { onNaviga } = monta({ partitaId: null });
    fireEvent.click(screen.getByRole('button', { name: 'Tokyo' }));
    expect(onNaviga).toHaveBeenCalledWith('tokyo');
    fireEvent.click(screen.getByRole('button', { name: 'Su: Tokyo' }));
    fireEvent.click(within(screen.getByRole('list', { name: 'Mappe figlie' })).getByRole('button', { name: /Shibuya centro/ }));
    expect(onNaviga).toHaveBeenLastCalledWith('shibuya-centro');
    fireEvent.click(screen.getByRole('button', { name: 'Forziere: Scrigno da aprire' }));
    expect(within(screen.getByRole('dialog', { name: 'Scrigno da aprire' })).queryByRole('button', { name: 'Raccolto' })).not.toBeInTheDocument();
    expect(screen.getByText(/attiva una partita per segnarli/)).toBeInTheDocument();
  });

  it('un punto della Guida si segna «Ottenuto»/«Esaurito» dal popup; gli articoli del negozio si comprano dalla scheda', async () => {
    const { onStatoPunto, onAcquisto } = monta();
    fireEvent.click(screen.getByRole('button', { name: 'Forziere: Forziere del corridoio' }));
    const popup = within(screen.getByRole('dialog', { name: 'Forziere del corridoio' }));
    expect(popup.queryByRole('button', { name: 'Raccolto' })).not.toBeInTheDocument();
    fireEvent.click(popup.getByRole('button', { name: 'Esaurito' }));
    expect(onStatoPunto).toHaveBeenCalledWith(expect.objectContaining({ id: 5 }), 'esaurito');
    await waitFor(() => expect(popup.getByRole('button', { name: 'Ottenuto' })).not.toBeDisabled());
    fireEvent.click(popup.getByRole('button', { name: 'Ottenuto' }));
    expect(onStatoPunto).toHaveBeenLastCalledWith(expect.objectContaining({ id: 5 }), 'ottenuto');
    fireEvent.click(screen.getByRole('button', { name: 'Negozio: Untouchable' }));
    const scheda = within(await screen.findByRole('region', { name: 'Scheda: Untouchable' }));
    fireEvent.click(scheda.getByRole('checkbox', { name: 'Pistola modello Tkachev comprato' }));
    expect(onAcquisto).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), 'a1', true);
  });

  it('i controlli dello zoom stanno sulla mappa: «Riduci» è disattivo al minimo «adatta», «Ingrandisci» lo riattiva', () => {
    monta();
    const riduci = screen.getByRole('button', { name: 'Riduci' });
    expect(riduci).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Ingrandisci' }));
    expect(riduci).not.toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Adatta alla finestra' }));
    expect(riduci).toBeDisabled();
  });

  it('con la partita lo spillo con condizioni non soddisfatte è nascosto; «Mostra anche i non ancora disponibili» lo riporta con i semafori', () => {
    monta();
    expect(screen.queryByRole('button', { name: 'Attività: Bancarella estiva' })).toBeNull();
    const interruttore = screen.getByRole('button', { name: /Mostra anche i non ancora disponibili \(1\)/ });
    expect(interruttore).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(interruttore);
    fireEvent.click(screen.getByRole('button', { name: 'Attività: Bancarella estiva' }));
    const popup = within(screen.getByRole('dialog', { name: 'Bancarella estiva' }));
    expect(popup.getByText('Non ancora')).toHaveAttribute('title', 'dal 18 giugno — Disponibile dal 18 giugno, oggi è il 20 aprile');
    const condizioni = within(popup.getByRole('group', { name: 'Condizioni di visibilità' }));
    expect(condizioni.getByText('dal 18 giugno')).toBeInTheDocument();
    expect(condizioni.getByRole('img', { name: 'Condizione non soddisfatta' })).toBeInTheDocument();
    fireEvent.click(interruttore);
    expect(screen.queryByRole('button', { name: 'Attività: Bancarella estiva' })).toBeNull();
  });

  it('la selezione iniziale su uno spillo non ancora disponibile lo rende visibile con il popup, invece di centrare la mappa sul vuoto', async () => {
    const misura = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 800, height: 600, top: 0, left: 0, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
    try {
      monta({ selezioneIniziale: 6 });
      expect(await screen.findByRole('button', { name: 'Attività: Bancarella estiva' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Mostra anche i non ancora disponibili \(1\)/ })).toHaveAttribute('aria-pressed', 'true');
      expect(await screen.findByRole('dialog', { name: 'Bancarella estiva' })).toBeInTheDocument();
    } finally {
      misura.mockRestore();
    }
  });

  it('senza partita le condizioni non nascondono nulla e si leggono come testo', () => {
    monta({ partitaId: null });
    expect(screen.queryByRole('button', { name: /Mostra anche i non ancora disponibili/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Attività: Bancarella estiva' }));
    const popup = within(screen.getByRole('dialog', { name: 'Bancarella estiva' }));
    expect(within(popup.getByRole('group', { name: 'Condizioni di visibilità' })).getByText('dal 18 giugno')).toBeInTheDocument();
  });
});
