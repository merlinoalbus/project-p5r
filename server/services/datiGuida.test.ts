// ============================================================
// Test datiGuida — i blocchi della guida analizzati una volta, condivisi, congelati e buttati quando i dati cambiano (F22/R1)
// ============================================================

import Database from 'better-sqlite3';
import { closeDb, getDb, prepared } from '../db/dbService.js';
import { invalidaCacheDiGioco } from './cacheDiGioco.js';
import { bloccoGuidaDi, datiGuida, finestreDaDati, finestreDungeon, invalidaDatiGuida } from './datiGuida.js';
import { battaglia } from './battagliaService.js';
import { eliminaArea } from './dungeonService.js';
import { dbDiProva } from '../../test/dbDiProva.js';

beforeAll(() => { dbDiProva(); });
afterAll(() => closeDb());

describe('datiGuida', () => {
  it('il blocco si analizza una volta: due letture danno lo stesso oggetto, congelato fino in fondo', () => {
    const a = datiGuida<{ personaggi: Array<{ nome: string }> }>('personaggi')!;
    expect(datiGuida('personaggi')).toBe(a);
    expect(Object.isFrozen(a)).toBe(true);
    expect(Object.isFrozen(a.personaggi[0])).toBe(true);
    // chi provasse a cambiarlo riceve un errore (i moduli sono in modalità rigorosa), e la guida resta com'era
    expect(() => { (a.personaggi[0] as { nome: string }).nome = 'altro'; }).toThrow(TypeError);
    expect(datiGuida<{ personaggi: Array<{ nome: string }> }>('personaggi')!.personaggi[0].nome).not.toBe('altro');
    expect(datiGuida('chiave-che-non-esiste')).toBeNull();
  });

  it('una scrittura su dati_guida si vede dopo l\'invalidazione (il registro comune la chiama a ogni sostituzione dei dati)', () => {
    const prima = datiGuida<{ prova?: number }>('mappe-citta-assenti');
    const riga = prepared("SELECT json FROM dati_guida WHERE chiave = 'mappe-citta-assenti'").pluck().get() as string;
    prepared("UPDATE dati_guida SET json = ? WHERE chiave = 'mappe-citta-assenti'").run(JSON.stringify({ prova: 1 }));
    try {
      expect(datiGuida('mappe-citta-assenti')).toBe(prima); // ancora la copia in memoria
      invalidaCacheDiGioco();
      expect(datiGuida('mappe-citta-assenti')).toEqual({ prova: 1 });
    } finally {
      prepared("UPDATE dati_guida SET json = ? WHERE chiave = 'mappe-citta-assenti'").run(riga);
      invalidaDatiGuida();
    }
  });

  it('eliminare un\'area butta la copia in memoria: la battaglia non indica più quell\'area', () => {
    const ombre = () => battaglia().ombre as Array<{ areaChiave?: string | null }>;
    const conArea = ombre().find((o) => o.areaChiave)!;
    expect(conArea).toBeDefined();
    eliminaArea(conArea.areaChiave!);
    expect(ombre().filter((o) => o.areaChiave === conArea.areaChiave)).toEqual([]);
  });

  it('le finestre dei Palazzi sono quelle con un inizio; una trascrizione illeggibile vale «nessuna finestra»', () => {
    const f = finestreDungeon();
    expect(f.get('kamoshida')?.dal).toMatch(/^\d{2}-\d{2}$/);
    expect(finestreDungeon()).toBe(f);
    expect([...finestreDaDati({ finestre: [{ dungeon: 'a', dal: '04-12', al: null }, { dungeon: 'b', dal: null }, { dungeon: 'c' }, null, 'x'] })]).toEqual([['a', { dal: '04-12', al: null }]]);
    expect(finestreDaDati(null).size).toBe(0);
    expect(finestreDaDati({ finestre: 'non un elenco' }).size).toBe(0);
    const riga = prepared("SELECT json FROM dati_guida WHERE chiave = 'finestre-dungeon'").pluck().get() as string;
    prepared("UPDATE dati_guida SET json = '{rotto' WHERE chiave = 'finestre-dungeon'").run();
    try {
      invalidaDatiGuida();
      expect(finestreDungeon().size).toBe(0);
      expect(bloccoGuidaDi(getDb(), 'finestre-dungeon')).toBeNull();
    } finally {
      prepared("UPDATE dati_guida SET json = ? WHERE chiave = 'finestre-dungeon'").run(riga);
      invalidaDatiGuida();
    }
  });

  it('bloccoGuidaDi legge da un database qualunque, anche senza la tabella', () => {
    const vuoto = new Database(':memory:');
    try {
      expect(bloccoGuidaDi(vuoto, 'finestre-dungeon')).toBeNull();
      vuoto.exec("CREATE TABLE dati_guida (chiave TEXT PRIMARY KEY, json TEXT); INSERT INTO dati_guida VALUES ('x', '{\"a\":1}')");
      expect(bloccoGuidaDi(vuoto, 'x')).toEqual({ a: 1 });
      expect(bloccoGuidaDi(vuoto, 'y')).toBeNull();
    } finally {
      vuoto.close();
    }
  });
});
