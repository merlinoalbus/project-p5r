// @vitest-environment jsdom
// ============================================================
// Test PassaggiMappa — i collegamenti si leggono nei due versi, e portano dove dicono
// ============================================================

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PassaggiMappa } from './PassaggiMappa';
import type { MappaDto, MappaRiassuntoDto, SpilloDto } from '../../types';

const riassunto = (extra: Partial<MappaRiassuntoDto> & { chiave: string; nome: string }): MappaRiassuntoDto =>
  ({ tipo: 'luogo', genitore: 'quartiere', nomeRivisto: false, ordine: 0, immagineUrl: null, asset: null, entita: null, origine: 'seed', numeroSpilli: 0, numeroFigli: 0, updatedAt: '', ...extra });

const spillo = (extra: Partial<SpilloDto> & { id: number; nome: string }): SpilloDto =>
  ({ mappaChiave: 'sottopasso', tipo: 'passaggio', tipoNome: 'Passaggio', colore: '#abc', descrizione: '', x: 50, y: 50, riferimento: null, collezionabile: false, ordine: 0, origine: 'utente', raccolto: false, dettaglio: null, condizioni: [], immagini: [], updatedAt: '', ...extra });

const albero: MappaRiassuntoDto[] = [
  riassunto({ chiave: 'quartiere', nome: 'Shibuya', tipo: 'quartiere', genitore: null }),
  riassunto({ chiave: 'sottopasso', nome: 'Sottopasso' }),
  riassunto({ chiave: 'banchina', nome: 'Banchina della metropolitana' }),
];

const mappa = (extra: Partial<MappaDto> = {}): MappaDto => ({
  ...riassunto({ chiave: 'sottopasso', nome: 'Sottopasso' }),
  larghezza: null, altezza: null, note: '', genitoreNome: 'Shibuya',
  percorso: [{ chiave: 'quartiere', nome: 'Shibuya' }, { chiave: 'sottopasso', nome: 'Sottopasso' }],
  figli: [], spilli: [], arrivi: [], ...extra,
});

// lo spillo «laterale» che l'albero non mostrava: porta a una sorella, non a una figlia
const versoBanchina = spillo({ id: 1, nome: 'Banchina Metro', destinazione: { mappa: 'banchina', spillo: null }, destinazioneNomi: { mappa: 'Banchina della metropolitana', spillo: null } });

it('elenca le uscite, dice che rapporto ha l’arrivo e ci porta', async () => {
  const onVai = vi.fn();
  render(<PassaggiMappa mappa={mappa({ spilli: [versoBanchina] })} albero={albero} occupato={false} onVai={onVai} onCreaPassaggio={vi.fn()} />);
  const voce = screen.getByRole('button', { name: /Apri Banchina della metropolitana, dove porta «Banchina Metro»/ });
  expect(voce).toHaveTextContent('Banchina Metro → Banchina della metropolitana');
  expect(screen.getByText('allo stesso livello o altrove')).toBeInTheDocument();
  await userEvent.click(voce);
  expect(onVai).toHaveBeenCalledWith('banchina');
});

it('un’uscita senza ritorno è segnalata, e il ritorno si crea dalla mappa che lo deve portare', () => {
  render(<PassaggiMappa mappa={mappa({ spilli: [versoBanchina] })} albero={albero} occupato={false} onVai={vi.fn()} onCreaPassaggio={vi.fn()} />);
  expect(screen.getByText(/Di là non si torna/)).toHaveTextContent('il ritorno si crea da «Banchina della metropolitana»');
});

it('con il ritorno dichiarato l’avviso sparisce', () => {
  render(<PassaggiMappa mappa={mappa({ spilli: [versoBanchina], arrivi: [{ spilloId: 9, tipo: 'passaggio', nome: 'Sottopasso', mappa: 'banchina', mappaNome: 'Banchina della metropolitana' }] })} albero={albero} occupato={false} onVai={vi.fn()} onCreaPassaggio={vi.fn()} />);
  expect(screen.queryByText(/Di là non si torna/)).not.toBeInTheDocument();
});

it('elenca chi porta qui e offre di creare il passaggio mancante nella direzione giusta', async () => {
  const onVai = vi.fn(); const onCrea = vi.fn();
  render(<PassaggiMappa mappa={mappa({ arrivi: [{ spilloId: 9, tipo: 'treno', nome: 'Sottopasso', mappa: 'banchina', mappaNome: 'Banchina della metropolitana' }] })} albero={albero} occupato={false} onVai={onVai} onCreaPassaggio={onCrea} />);
  await userEvent.click(screen.getByRole('button', { name: /Apri Banchina della metropolitana, da cui porta «Sottopasso»/ }));
  expect(onVai).toHaveBeenCalledWith('banchina');
  expect(screen.getByText('Da qui non si torna là.')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Crea il passaggio verso Banchina della metropolitana' }));
  expect(onCrea).toHaveBeenCalledWith('banchina');
});

it('riconosce il genitore e le figlie, e segnala due spilli uguali verso la stessa mappa', () => {
  const versoSu = spillo({ id: 2, nome: 'Uscita', tipo: 'uscita', tipoNome: 'Uscita', destinazione: { mappa: 'quartiere', spillo: null }, destinazioneNomi: { mappa: 'Shibuya', spillo: null } });
  render(<PassaggiMappa
    mappa={mappa({ spilli: [versoSu, versoBanchina, { ...versoBanchina, id: 3 }], figli: [riassunto({ chiave: 'banchina', nome: 'Banchina della metropolitana', genitore: 'sottopasso' })] })}
    albero={albero} occupato={false} onVai={vi.fn()} onCreaPassaggio={vi.fn()} />);
  expect(screen.getByText('la mappa che contiene questa')).toBeInTheDocument();
  expect(screen.getAllByText('contenuta in questa')).toHaveLength(2);
  expect(screen.getAllByText('Due spilli «Banchina Metro» portano alla stessa mappa.')).toHaveLength(2);
});

it('senza spostamenti e senza arrivi lo dice, invece di mostrare due elenchi vuoti', () => {
  render(<PassaggiMappa mappa={mappa({ spilli: [spillo({ id: 4, nome: 'Nota', tipo: 'nota', tipoNome: 'Nota' })] })} albero={albero} occupato={false} onVai={vi.fn()} onCreaPassaggio={vi.fn()} />);
  expect(screen.getByText('Nessuno spillo di spostamento: da questa mappa non si esce.')).toBeInTheDocument();
  expect(screen.getByText('Nessuno spillo di altre mappe porta qui: ci si arriva solo dall’albero.')).toBeInTheDocument();
});
