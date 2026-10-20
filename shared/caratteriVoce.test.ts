// ============================================================
// Test — il carattere delle voci della guida (L4 «Avanzamento unico», lotti/L4/modifiche.md §1.1, piano dei test §6.1 punto 1)
// ============================================================

import { CARATTERI, NOME_CARATTERE, carattereDaTipo, carattereDellaVoce, eCarattere, sqlCarattereVoce } from './caratteriVoce.js';
import Database from 'better-sqlite3';

describe('carattere delle voci', () => {
  it('la regola del tipo: oggetti e Ombre sciagura si ripropongono (anche un «nemico» futuro), storia e altro sono racconto, il resto è permanente', () => {
    for (const t of ['oggetto', 'ombra-sciagura', 'nemico']) expect(carattereDaTipo(t, null)).toBe('rigenerabile');
    for (const t of ['storia', 'altro']) expect(carattereDaTipo(t, null)).toBe('descrittiva');
    for (const t of ['forziere', 'forziere-chiuso', 'porta', 'scorciatoia', 'sicura', 'meccanismo', 'puzzle', 'volonta', 'boss', 'miniboss', 'trama']) expect(carattereDaTipo(t, null)).toBe('permanente');
  });

  it('le voci dei dedali dei Memento e le Persona non hanno carattere (restano come sono; Persona a L8)', () => {
    for (const t of ['oggetto', 'storia', 'forziere', 'trama', 'persona']) expect(carattereDaTipo(t, 'mementos-dedalo/1')).toBeNull();
    expect(carattereDaTipo('persona', null)).toBeNull();
  });

  it('la scelta dell’utente vince sulla regola; un valore che non è un carattere vale come nessuna scelta; dedali e Persona restano senza', () => {
    expect(carattereDellaVoce({ tipo: 'forziere', areaDedalo: null })).toBe('permanente');
    expect(carattereDellaVoce({ tipo: 'forziere', areaDedalo: null, carattere: 'descrittiva' })).toBe('descrittiva');
    expect(carattereDellaVoce({ tipo: 'ombra-sciagura', areaDedalo: null, carattere: 'permanente' })).toBe('permanente');
    expect(carattereDellaVoce({ tipo: 'storia', areaDedalo: null, carattere: 'boh' })).toBe('descrittiva');
    expect(carattereDellaVoce({ tipo: 'forziere', areaDedalo: 'x', carattere: 'permanente' })).toBeNull();
    expect(carattereDellaVoce({ tipo: 'persona', areaDedalo: null, carattere: 'permanente' })).toBeNull();
    expect(eCarattere('rigenerabile')).toBe(true);
    expect(eCarattere(null)).toBe(false);
  });

  it('i nomi per l’interfaccia', () => {
    expect(CARATTERI.map((c) => NOME_CARATTERE[c])).toEqual(['Permanente', 'Si ripropone', 'Racconto']);
  });

  it('la stessa regola in SQL dà lo stesso carattere della funzione, per ogni tipo, con e senza scelta e nei dedali', () => {
    const db = new Database(':memory:');
    db.exec('CREATE TABLE v (tipo TEXT, area_dedalo_chiave TEXT, carattere TEXT)');
    const tipi = ['oggetto', 'ombra-sciagura', 'nemico', 'storia', 'altro', 'forziere', 'porta', 'boss', 'persona', 'trama'];
    const scelte = [null, 'permanente', 'rigenerabile', 'descrittiva'];
    for (const t of tipi) for (const d of [null, 'dedalo/1']) for (const c of scelte) db.prepare('INSERT INTO v VALUES (?, ?, ?)').run(t, d, c);
    const righe = db.prepare(`SELECT tipo, area_dedalo_chiave, carattere, ${sqlCarattereVoce('v')} AS sql, ${sqlCarattereVoce('v', false)} AS senza FROM v`).all() as Array<{ tipo: string; area_dedalo_chiave: string | null; carattere: string | null; sql: string | null; senza: string | null }>;
    for (const r of righe) {
      expect(r.sql).toBe(carattereDellaVoce({ tipo: r.tipo, areaDedalo: r.area_dedalo_chiave, carattere: r.carattere }));
      expect(r.senza).toBe(carattereDaTipo(r.tipo, r.area_dedalo_chiave));
    }
    db.close();
  });
});
