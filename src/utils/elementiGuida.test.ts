// ============================================================
// Test elementiGuida — riconoscimento degli elementi dai nomi italiani della guida
// ============================================================

import { chiaveElementoDaTesto } from './elementiGuida';

describe('chiaveElementoDaTesto', () => {
  it('riconosce i nomi della guida, anche con note fra parentesi', () => {
    expect(chiaveElementoDaTesto('Tuono')).toBe('electric');
    expect(chiaveElementoDaTesto('Elettricità')).toBe('electric');
    expect(chiaveElementoDaTesto('Maledizione (dimezza)')).toBe('curse');
    expect(chiaveElementoDaTesto('Oscurità')).toBe('curse');
    expect(chiaveElementoDaTesto('Sacro')).toBe('bless');
    expect(chiaveElementoDaTesto('Benedizione (nullo)')).toBe('bless');
    expect(chiaveElementoDaTesto('Fuoco')).toBe('fire');
    expect(chiaveElementoDaTesto('Ghiaccio')).toBe('ice');
    expect(chiaveElementoDaTesto('Vento')).toBe('wind');
    expect(chiaveElementoDaTesto('Psichico')).toBe('psy');
    expect(chiaveElementoDaTesto('Nucleare')).toBe('nuclear');
    expect(chiaveElementoDaTesto('Fisico')).toBe('phys');
    expect(chiaveElementoDaTesto('Danno fisico')).toBe('phys');
    expect(chiaveElementoDaTesto('Attacchi fisici')).toBe('phys');
    expect(chiaveElementoDaTesto('Psicocinesi')).toBe('psy');
    expect(chiaveElementoDaTesto('Arma da fuoco')).toBe('gun');
    expect(chiaveElementoDaTesto('Armi da fuoco')).toBe('gun');
    expect(chiaveElementoDaTesto('Gelo')).toBe('ice');
    expect(chiaveElementoDaTesto('Quasi-divino')).toBe('almighty');
  });

  it('restituisce null per testi che non sono elementi', () => {
    expect(chiaveElementoDaTesto('nessuna nota')).toBeNull();
    expect(chiaveElementoDaTesto('Sonno')).toBeNull();
    expect(chiaveElementoDaTesto('')).toBeNull();
  });
});
