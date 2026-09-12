// ============================================================
// Test del deposito — l'elenco dei file del NAS e l'importazione che li legge dal mount
// ============================================================
//
// Il deposito è una cartella condivisa montata sul server: il file non passa dal browser, quindi la
// dimensione non incontra i limiti del proxy. Qui si verifica che l'elenco dica la verità (anche quando
// la cartella non c'è) e che il nome del file non possa portare fuori dalla cartella.
// ============================================================

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { config } from '../config.js';
import { anteprimaPacchettoDaDeposito, elencaDeposito, percorsoNelDeposito } from './pacchettoGiocoService.js';

let deposito = '';
const originale = config.depositoDir;

beforeAll(() => {
  deposito = fs.mkdtempSync(path.join(os.tmpdir(), 'p5r-deposito-'));
  (config as { depositoDir: string }).depositoDir = deposito;
});
afterAll(() => {
  (config as { depositoDir: string }).depositoDir = originale;
  fs.rmSync(deposito, { recursive: true, force: true });
});

it('senza cartella configurata lo dice, invece di far credere che sia vuota', () => {
  (config as { depositoDir: string }).depositoDir = '';
  const d = elencaDeposito();
  expect(d).toMatchObject({ disponibile: false, file: [] });
  expect(d.motivo).toContain('DEPOSITO_DIR');
  expect(() => percorsoNelDeposito('gioco.db')).toThrowError(expect.objectContaining({ code: 'deposito-non-configurato' }));
  (config as { depositoDir: string }).depositoDir = deposito;
});

it('una cartella che non si riesce a leggere (NAS non montato) non è «nessun file»', () => {
  (config as { depositoDir: string }).depositoDir = path.join(deposito, 'non-esiste');
  const d = elencaDeposito();
  expect(d.disponibile).toBe(false);
  expect(d.motivo).toContain('non è leggibile');
  expect(d.file).toEqual([]);
  (config as { depositoDir: string }).depositoDir = deposito;
});

it('elenca solo i file che possono essere un pacchetto, dal più recente', () => {
  fs.writeFileSync(path.join(deposito, 'vecchio.db'), 'x'.repeat(10));
  fs.writeFileSync(path.join(deposito, 'gioco.db'), 'y'.repeat(20));
  fs.writeFileSync(path.join(deposito, 'appunti.txt'), 'non sono un pacchetto');
  fs.mkdirSync(path.join(deposito, 'una-cartella.db'), { recursive: true });
  // date diverse, così l'ordine è verificabile
  const ieri = new Date(Date.now() - 86_400_000);
  fs.utimesSync(path.join(deposito, 'vecchio.db'), ieri, ieri);

  const d = elencaDeposito();
  expect(d.disponibile).toBe(true);
  expect(d.cartella).toBe(deposito);
  expect(d.file.map((f) => f.nome)).toEqual(['gioco.db', 'vecchio.db']);
  expect(d.file[0]).toMatchObject({ nome: 'gioco.db', byte: 20 });
  expect(d.file[0].modificatoIl).toMatch(/^\d{4}-/);
});

it('il nome del file non può portare fuori dalla cartella', () => {
  for (const nome of ['../gioco.db', '..\\gioco.db', 'sotto/gioco.db', '..', '.', '']) {
    expect(() => percorsoNelDeposito(nome), nome).toThrowError(expect.objectContaining({ code: expect.stringMatching(/file-non-valido|deposito-non-configurato/) }));
  }
  expect(() => percorsoNelDeposito('mai-visto.db')).toThrowError(expect.objectContaining({ code: 'file-non-trovato' }));
  expect(percorsoNelDeposito('gioco.db')).toBe(path.join(deposito, 'gioco.db'));
});

it('un file depositato che non è un pacchetto viene respinto con il motivo giusto', () => {
  expect(() => anteprimaPacchettoDaDeposito('gioco.db')).toThrowError(expect.objectContaining({ code: 'pacchetto-non-valido' }));
});
