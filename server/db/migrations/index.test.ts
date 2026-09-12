// ============================================================
// Test dei registri delle migrazioni — id unici e consecutivi in ciascuna delle due sequenze
// ============================================================

import { migrations } from './index.js';
import { migrazioniUtente } from '../migrazioniUtente/index.js';

function verificaSequenza(lista: Array<{ id: number; name: string }>, nome: string): void {
  const id = lista.map((m) => m.id);
  expect(new Set(id).size, `${nome}: id ripetuti`).toBe(id.length);
  id.forEach((v, i) => expect(v, `${nome}: buco o disordine alla posizione ${i}`).toBe(i + 1));
  for (const m of lista) expect(m.name, `${nome}: nome vuoto per ${m.id}`).not.toBe('');
}

it('le migrazioni dei dati di gioco sono consecutive da 1 (il runner applica solo quelle oltre user_version: un buco resterebbe per sempre)', () => {
  verificaSequenza(migrations, 'gioco');
  expect(migrations.length).toBeGreaterThanOrEqual(66);
});

it('le migrazioni delle partite sono consecutive da 1', () => {
  verificaSequenza(migrazioniUtente, 'utente');
});
