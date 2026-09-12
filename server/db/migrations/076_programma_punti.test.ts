// Test migrazione 076 — i due negozi con un programma punti lo dichiarano, gli altri no
import { closeDb, initDb } from '../dbService.js';
import { caricaPacchetto } from '../../services/pacchetto/pacchettoGioco.js';
import { PROGRAMMI_PUNTI } from './076_programma_punti.js';

afterEach(() => closeDb());

it('nel pacchetto solo Kichijoji (manuale) e Tanaka (grado cliente) hanno un programma', () => {
  const db = initDb(':memory:');
  caricaPacchetto(db);
  const righe = db.prepare('SELECT chiave, programma_punti_json FROM negozio WHERE programma_punti_json IS NOT NULL ORDER BY chiave').all() as Array<{ chiave: string; programma_punti_json: string }>;
  expect(righe.map((r) => r.chiave)).toEqual(['tanaka-affari-loschi', 'vestiti-usati-kichijoji']);
  for (const r of righe) expect(JSON.parse(r.programma_punti_json)).toEqual(PROGRAMMI_PUNTI[r.chiave]);
  expect(JSON.parse(righe[1].programma_punti_json).calcolo).toBe('manuale');
  expect(JSON.parse(righe[0].programma_punti_json).calcolo).toBe('rango-cliente');
  // le condizioni «punti negozio» esistenti citano solo il negozio con il programma manuale
  const conPunti = db.prepare("SELECT condizioni_json FROM articolo WHERE condizioni_json LIKE '%punti-negozio%'").all() as Array<{ condizioni_json: string }>;
  expect(conPunti.length).toBeGreaterThan(0);
  for (const a of conPunti) for (const c of JSON.parse(a.condizioni_json) as Array<{ tipo: string; negozio?: string }>) if (c.tipo === 'punti-negozio') expect(c.negozio).toBe('vestiti-usati-kichijoji');
});
