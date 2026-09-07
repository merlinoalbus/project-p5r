/** @vitest-environment jsdom */

// ============================================================
// IconaSegno — la regola che ogni chiave nasce con la sua riserva, e che l'immagine c'è davvero
// ============================================================
//
// La regola del repository è che **una chiave nuova nasce con due cose**: la riserva SVG in codice
// (se l'immagine non arriva, il segno c'è lo stesso) e la riga nel censimento perché Codex la
// disegni. Fin qui era una consuetudine scritta nei commenti, e una consuetudine si dimentica:
// basta aggiungere una voce all'unione `ChiaveSegno` e la riserva manca, con la tessera che resta
// vuota solo sulle macchine dove il manifest è vuoto — cioè quasi mai in sviluppo, quindi il difetto
// si vede in produzione.
//
// Qui la consuetudine diventa una prova. Le chiavi si leggono **dal sorgente**, non da un elenco
// copiato qui: un elenco copiato invecchia insieme al difetto che dovrebbe trovare.

import fs from 'node:fs';
import path from 'node:path';
import { render } from '@testing-library/react';
import { IconaSegno, type ChiaveSegno } from './IconaAzione';
import { useAssetStore } from '../../stores/assetStore';
import { usePreferenzeStore } from '../../stores/preferenzeStore';

const RADICE = path.resolve(__dirname, '../../..');
const SORGENTE = fs.readFileSync(path.join(RADICE, 'src/components/shared/IconaAzione.tsx'), 'utf8');

/** L'unione `ChiaveSegno` così com'è scritta nel sorgente. */
function chiaviDichiarate(): ChiaveSegno[] {
  const blocco = SORGENTE.split('export type ChiaveSegno =')[1]?.split(';')[0];
  if (!blocco) throw new Error('ChiaveSegno non trovata nel sorgente');
  return [...blocco.matchAll(/'([^']+)'/g)].map((m) => m[1] as ChiaveSegno);
}

const CHIAVI = chiaviDichiarate();

/** Solo il corpo di `RISERVA_SEGNO`: cercare la chiave nell'intero file darebbe per buona una
 *  riserva scritta in una delle altre due tabelle, che è esattamente l'errore da intercettare. */
const RISERVE = SORGENTE.split('const RISERVA_SEGNO')[1]?.split('\n};')[0] ?? '';

beforeEach(() => { usePreferenzeStore.setState({ graficaPredefinita: true }); });

describe('IconaSegno', () => {
  it('l’unione non è vuota (se lo fosse, le prove qui sotto non proverebbero niente)', () => {
    expect(CHIAVI.length).toBeGreaterThanOrEqual(12);
  });

  it.each(CHIAVI)('«%s» ha la sua riserva SVG in codice', (chiave) => {
    expect(RISERVE).toMatch(new RegExp(`(^|\\s)'?${chiave}'?: \\(d\\) =>`, 'm'));
  });

  it.each(CHIAVI)('«%s» ha l’immagine consegnata in public/asset/ui', (chiave) => {
    expect(fs.existsSync(path.join(RADICE, `public/asset/ui/segno-${chiave}.png`))).toBe(true);
  });

  it('senza manifest mostra la riserva, col manifest mostra l’immagine', () => {
    useAssetStore.setState({ caricato: true, mancanti: {}, manifest: { generato: 'T', totale: 0, file: {} } });
    const senza = render(<IconaSegno chiave="completati" />);
    expect(senza.container.querySelector('svg')).not.toBeNull();
    expect(senza.container.querySelector('img')).toBeNull();
    senza.unmount();

    useAssetStore.setState({ caricato: true, mancanti: {}, manifest: { generato: 'T', totale: 1, file: { 'ui/segno-completati': '/asset/ui/segno-completati.png' } } });
    const con = render(<IconaSegno chiave="completati" />);
    expect(con.container.querySelector('img')?.getAttribute('src')).toBe('/asset/ui/segno-completati.png');
  });

  it('è decorativa: il testo accanto dice già tutto, e un doppione lo ripeterebbe al lettore di schermo', () => {
    useAssetStore.setState({ caricato: true, mancanti: {}, manifest: { generato: 'T', totale: 1, file: { 'ui/segno-round': '/asset/ui/segno-round.png' } } });
    const { container } = render(<IconaSegno chiave="round" />);
    const img = container.querySelector('img')!;
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('aria-hidden')).toBe('true');
  });
});
