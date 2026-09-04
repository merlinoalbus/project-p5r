// ============================================================
// Test sfondi di sezione — scelta per percorso e variante Allarme
// ============================================================

import { sfondoPerPercorso } from './sfondi';

describe('sfondoPerPercorso', () => {
  it('sceglie lo sfondo dal prefisso del percorso, anche nelle sottopagine', () => {
    expect(sfondoPerPercorso('/fusione')).toBe('sfondi/stanza-velluto');
    expect(sfondoPerPercorso('/compendio/persona/18')).toBe('sfondi/stanza-velluto');
    expect(sfondoPerPercorso('/guida/dungeon/kamoshida')).toBe('sfondi/mementos');
    expect(sfondoPerPercorso('/partita')).toBe('identita/splash-verticale-senza-testo');
    expect(sfondoPerPercorso('/home')).toBe('identita/splash-orizzontale-senza-testo');
    expect(sfondoPerPercorso('/impostazioni')).toBe('sfondi/stanza-velluto');
  });

  it('con l\'Allarme attivo la Fusione passa alla variante dedicata; le altre sezioni non cambiano', () => {
    expect(sfondoPerPercorso('/fusione', true)).toBe('sfondi/stanza-velluto-allarme');
    expect(sfondoPerPercorso('/compendio', true)).toBe('sfondi/stanza-velluto');
  });

  it('percorsi sconosciuti o parziali non hanno sfondo dedicato', () => {
    expect(sfondoPerPercorso('/pagina-inesistente')).toBeNull();
    expect(sfondoPerPercorso('/skillato')).toBeNull();
  });
});
