// Test migrazione 075 — paga in yen, dettagli, tracciamento; tipo e fascia dentro il catalogo
import { closeDb, initDb } from '../dbService.js';
import { caricaPacchetto } from '../../services/pacchetto/pacchettoGioco.js';
import { componiDettagli, leggiPaga } from './075_attivita_strutturate.js';
import { eFasciaAttivita, eTipoAttivita } from '../../../shared/attivita.js';

afterEach(() => closeDb());

it('legge le quattro forme della paga e compone i dettagli con i loro titoli', () => {
  expect(leggiPaga('3.500 yen a turno (fino a 7.400 yen con quiz perfetto)')).toEqual({ pagaYen: 3500, pagaMassima: 7400 });
  expect(leggiPaga('7.200 yen a turno (12.000 yen di domenica)')).toEqual({ pagaYen: 7200, pagaMassima: 12000 });
  expect(leggiPaga('3.600 yen a turno')).toEqual({ pagaYen: 3600, pagaMassima: null });
  expect(leggiPaga(null)).toEqual({ pagaYen: null, pagaMassima: null });
  expect(componiDettagli({ regole: 'Si gioca.', premi: null, altri_effetti: 'Niente', doti_json: '[{"dote":"perizia","condizione":"1 nota base"},{"dote":null,"condizione":"casuale"}]' }))
    .toBe('Come funziona: Si gioca.\n\nAltri effetti: Niente\n\nNote sulle Doti: Perizia: 1 nota base · casuale');
  expect(componiDettagli({ regole: '', premi: null, altri_effetti: null, doti_json: '[]' })).toBeNull();
});

it('nel pacchetto i quattro lavori hanno la paga, il tracciamento segue il tipo, tipo e fascia sono nel catalogo', () => {
  const db = initDb(':memory:');
  caricaPacchetto(db);
  const righe = db.prepare('SELECT chiave, tipo, fascia, paga, paga_yen, paga_massima, tracciamento, dettagli FROM attivita').all() as Array<{ chiave: string; tipo: string; fascia: string | null; paga: string | null; paga_yen: number | null; paga_massima: number | null; tracciamento: string; dettagli: string | null }>;
  expect(righe.length).toBe(30);
  for (const r of righe) {
    expect(eTipoAttivita(r.tipo), r.chiave).toBe(true);
    expect(r.fascia === null || eFasciaAttivita(r.fascia), r.chiave).toBe(true);
    expect(r.tracciamento, r.chiave).toBe(r.tipo === 'videogioco' ? 'sessioni' : ['mini-gioco', 'lavoro', 'sfida'].includes(r.tipo) ? 'svolta' : 'nessuno');
    if (r.paga) { expect(r.paga_yen, r.chiave).toBeGreaterThan(0); expect(r.paga_massima, r.chiave).toBeGreaterThan(r.paga_yen!); }
  }
  expect(righe.filter((r) => r.paga_yen !== null).length).toBe(4);
  expect(righe.find((r) => r.chiave === 'freccette')?.dettagli).toMatch(/^Come funziona: /);
});
