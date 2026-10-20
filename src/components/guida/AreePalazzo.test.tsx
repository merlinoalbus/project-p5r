/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test AreePalazzo — le Aree di un Palazzo nelle tre forme (L3, §4.2; 2026-10-20)
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AreePalazzo } from './AreePalazzo';
import type { AreaDungeonDto, AreaRiassuntoDto } from '../../types';

/** Un'Area del Palazzo di prova: slug, nome, infiltrazioni che la toccano, raccolta (`presi` null = senza partita) e versioni. */
const areaPalazzo = (slug: string, nome: string, infiltrazioni: Array<{ chiave: string; nome: string; ordine: number }>, raccolta: { n: number; presi: number | null } | null, numeroPlanimetrie = 1): AreaRiassuntoDto => ({
  chiave: `dungeon/kamoshida/${slug}`, contenitore: { tipo: 'dungeon', chiave: 'kamoshida', nome: 'Palazzo di Kamoshida' }, slug, nome, nomeRivisto: false, ordine: 0, predefinita: `m-${slug}`,
  illustrazione: { immagineUrl: null, asset: null }, numeroPlanimetrie, numeroSpilli: raccolta?.n ?? 0, passaggio: null, ingresso: false, origine: 'seed', modificata: false, daVerificare: false,
  casa: `/guida/dungeon/kamoshida/area/${slug}`, infiltrazioni, raccolta: raccolta ?? undefined,
});
/** Un'infiltrazione di prova con le aree che tocca (solo gli slug contano qui). */
const infiltrazione = (chiave: string, nome: string, ordine: number, aree: string[]): AreaDungeonDto => ({
  chiave, ordine, nome, descrizione: '', mappe: [], punti: [], dedalo: null,
  areePalazzo: aree.map((s) => ({ chiave: `dungeon/kamoshida/${s}`, slug: s, nome: s, planimetriaIniziale: null })),
});

const I1 = { chiave: 'k-01', nome: 'Cancello', ordine: 0 };
const I3 = { chiave: 'k-03', nome: 'Cortile', ordine: 2 };
/** Tre aree: «Cancello» toccata da Cortile e Cancello (arrivano fuori ordine), con 2 versioni e 1 su 2 da prendere; «Torre alta» senza
 *  infiltrazioni, tutto raccolto; «Sala» senza niente da raccogliere. Tre infiltrazioni: Torre (k-02) non tocca aree. */
const AREE = [areaPalazzo('cancello', 'Cancello', [I3, I1], { n: 2, presi: 1 }, 2), areaPalazzo('torre-alta', 'Torre alta', [], { n: 2, presi: 2 }), areaPalazzo('sala', 'Sala', [I3], { n: 0, presi: 0 })];
const INFILTRAZIONI = [infiltrazione('k-01', 'Cancello', 0, ['cancello']), infiltrazione('k-02', 'Torre', 1, []), infiltrazione('k-03', 'Cortile', 2, ['cancello', 'sala'])];

const props = (extra: Partial<Parameters<typeof AreePalazzo>[0]> = {}): Parameters<typeof AreePalazzo>[0] => ({
  aree: AREE, infiltrazioni: INFILTRAZIONI, areaScelta: 'cancello', infiltrazioneScelta: 'k-01', completate: new Set<string>(),
  onScegliArea: vi.fn(), onScegliInfiltrazione: vi.fn(), onCollegaAree: vi.fn(), onAggiungiArea: vi.fn(), onRiordina: vi.fn().mockResolvedValue(true), forma: 'colonna', ...extra,
});

it('colonna: ogni area dice numero, nome, versioni, raccolta e le infiltrazioni che la toccano in ordine di guida', () => {
  render(<AreePalazzo {...props()} />);
  const aree = within(screen.getByRole('list', { name: 'Aree' }));
  // le righe: i pulsanti con lo stato premuto (le maniglie non ce l'hanno)
  const righe = aree.getAllByRole('button').filter((b) => b.hasAttribute('aria-pressed'));
  expect(righe).toHaveLength(3);
  expect(righe[0]).toHaveTextContent('2 versioni · 1 da prendere su 2');
  expect(righe[0].querySelector('[data-infiltrazioni-di="cancello"]')!.textContent).toBe('1. Cancello3. Cortile');
  expect(righe[0]).toHaveAttribute('aria-pressed', 'true');
  // tutto raccolto: completa per raccolta, anche senza infiltrazioni completate (2026-10-11)
  expect(righe[1]).toHaveTextContent('2 raccolti · completa');
  expect(righe[1]).toHaveAccessibleName(/^2\. Torre alta \(completata\)/);
  // niente da raccogliere, con una partita: completa
  expect(righe[2]).toHaveTextContent('niente da raccogliere · completa');
  expect(righe[2]).toHaveAccessibleName(/^3\. Sala \(completata\)/);
  // l'area aperta non è completa: né tutto raccolto né tutte le sue infiltrazioni completate
  expect(righe[0]).not.toHaveAccessibleName(/completata/);
});

it('senza partita niente è completo e la raccolta dice solo quanto c’è', () => {
  render(<AreePalazzo {...props({ aree: [areaPalazzo('cancello', 'Cancello', [I1], { n: 2, presi: null }), areaPalazzo('sala', 'Sala', [], { n: 0, presi: null })] })} />);
  const aree = within(screen.getByRole('list', { name: 'Aree' }));
  expect(aree.getByRole('button', { name: /^1\. Cancello/ })).toHaveTextContent('2 da raccogliere');
  expect(aree.getByRole('button', { name: /^2\. Sala/ })).toHaveTextContent('niente da raccogliere');
  expect(aree.getByRole('button', { name: /^2\. Sala/ })).not.toHaveTextContent('completa');
});

it('un’area è completa anche quando tutte le infiltrazioni che la toccano sono completate', () => {
  render(<AreePalazzo {...props({ completate: new Set(['k-01', 'k-03']) })} />);
  expect(within(screen.getByRole('list', { name: 'Aree' })).getByRole('button', { name: /^1\. Cancello \(completata\)/ })).toBeInTheDocument();
});

it('l’area toccata dall’infiltrazione aperta lo dice; toccare un’area la sceglie', () => {
  const p = props({ areaScelta: 'torre-alta', infiltrazioneScelta: 'k-03' });
  render(<AreePalazzo {...p} />);
  const aree = within(screen.getByRole('list', { name: 'Aree' }));
  expect(aree.getByRole('button', { name: /^1\. Cancello/ })).toHaveAccessibleName(/\(toccata dall’infiltrazione aperta\)/);
  expect(aree.getByRole('button', { name: /^3\. Sala/ })).toHaveAccessibleName(/\(toccata dall’infiltrazione aperta\)/);
  expect(aree.getByRole('button', { name: /^2\. Torre alta/ })).not.toHaveAccessibleName(/toccata/);
  fireEvent.click(aree.getByRole('button', { name: /^3\. Sala/ }));
  expect(p.onScegliArea).toHaveBeenCalledWith('sala');
});

it('in coda le infiltrazioni senza aree: si aprono, e «Collega aree» chiede di legarle', () => {
  const p = props();
  render(<AreePalazzo {...p} />);
  const coda = within(screen.getByRole('region', { name: 'Infiltrazioni senza aree' }));
  expect(coda.getByRole('heading', { name: 'Infiltrazioni senza aree · 1' })).toBeInTheDocument();
  fireEvent.click(coda.getByRole('button', { name: '2. Torre' }));
  expect(p.onScegliInfiltrazione).toHaveBeenCalledWith('k-02');
  fireEvent.click(coda.getByRole('button', { name: 'Collega aree a «Torre»' }));
  expect(p.onCollegaAree).toHaveBeenCalledWith('k-02');
});

it('un Palazzo senza aree lo dice, e «Aggiungi area» resta', () => {
  const p = props({ aree: [], areaScelta: null });
  render(<AreePalazzo {...p} />);
  expect(screen.getByRole('status')).toHaveTextContent('Questo Palazzo non ha ancora aree: aggiungine una.');
  expect(screen.queryByRole('button', { name: /^Sposta l’area/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Aggiungi area' }));
  expect(p.onAggiungiArea).toHaveBeenCalled();
});

it('riordino: lo spostamento si vede subito; se il salvataggio non va, torna l’ordine del server', async () => {
  let rispondi!: (ok: boolean) => void;
  const onRiordina = vi.fn(() => new Promise<boolean>((r) => { rispondi = r; }));
  render(<AreePalazzo {...props({ onRiordina })} />);
  const nomi = () => screen.getAllByRole('button', { name: /^Sposta l’area/ }).map((b) => b.getAttribute('aria-label'));
  const maniglia = screen.getByRole('button', { name: 'Sposta l’area «Sala»' });
  maniglia.focus();
  fireEvent.keyDown(maniglia, { key: 'ArrowUp' });
  expect(onRiordina).toHaveBeenCalledWith(['cancello', 'sala', 'torre-alta']);
  expect(nomi()).toEqual(['Sposta l’area «Cancello»', 'Sposta l’area «Sala»', 'Sposta l’area «Torre alta»']);
  // mentre salva, la maniglia è ferma e dice perché
  expect(screen.getByRole('button', { name: 'Sposta l’area «Sala»' })).toHaveAttribute('aria-disabled', 'true');
  rispondi(false);
  await waitFor(() => expect(nomi()).toEqual(['Sposta l’area «Cancello»', 'Sposta l’area «Torre alta»', 'Sposta l’area «Sala»']));
});

it('fila: chip delle aree con l’aperta premuta e quelle toccate dall’infiltrazione aperta evidenziate', () => {
  const p = props({ forma: 'fila', infiltrazioneScelta: 'k-03' });
  render(<AreePalazzo {...p} />);
  const fila = within(screen.getByRole('group', { name: 'Aree · 3' }));
  const chip = fila.getAllByRole('button');
  expect(chip.map((b) => b.getAttribute('title'))).toEqual(['Cancello', 'Torre alta', 'Sala']);
  expect(chip[0]).toHaveAttribute('aria-pressed', 'true');
  // la Sala è toccata da Cortile (aperta) e non è l'area scelta: evidenziata
  expect(chip[2]).toHaveClass('chip--toccata');
  expect(chip[0]).not.toHaveClass('chip--toccata');
  expect(chip[1]).not.toHaveClass('chip--toccata');
  fireEvent.click(chip[1]);
  expect(p.onScegliArea).toHaveBeenCalledWith('torre-alta');
});

it('foglio: «Aree · N» con l’area aperta; il foglio si chiude scegliendo', () => {
  const p = props({ forma: 'foglio' });
  render(<AreePalazzo {...p} />);
  const apri = screen.getByRole('button', { name: /^Aree · 3/ });
  expect(apri).toHaveTextContent('Cancello');
  // LAY3-7 (decisione del PM): il nome dell'area scelta si legge intero e, se serve, va a capo; mai coi puntini
  expect(within(apri).getByText(/^Cancello/).className).not.toMatch(/truncate/);
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.click(apri);
  const foglio = within(screen.getByRole('dialog', { name: 'Aree · 3' }));
  fireEvent.click(foglio.getByRole('button', { name: /^2\. Torre alta/ }));
  expect(p.onScegliArea).toHaveBeenCalledWith('torre-alta');
  expect(screen.queryByRole('dialog')).toBeNull();
});
