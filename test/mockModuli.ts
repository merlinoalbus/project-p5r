// ============================================================
// mockModuli — i moduli finti dei test del frontend, costruiti dal modulo vero
// ============================================================
//
// Prima ogni test riscriveva a mano il suo `services/api` finto (62 file), con `urlImmagine` — una funzione pura — rifatta in
// cinque varianti in 18 file, e `notificationStore` ridotto a `{ notifica }` in 33 (rilievo T1 della verifica completa,
// 2026-10-04). Qui il modulo finto parte da quello vero (`importOriginal`):
//   - le funzioni che il test passa sostituiscono quelle vere;
//   - quelle pure (nessuna rete) restano vere: `urlImmagine`, `queryString`, `ApiError`, `isApiError`, `payloadDellaBusta`;
//   - ogni altra funzione dell'API, se il test la chiama senza averla simulata, fallisce dicendo quale: prima era `undefined`
//     e l'errore era un «is not a function» lontano dalla causa;
//   - un sostituto per una funzione che il modulo non ha fa fallire il test: un refuso non passa più in silenzio.
//
// Le factory di `vi.mock` vengono portate in cima al file, prima degli import: per questo i due costruttori sono anche globali
// (li registra `test/setup.ts`), e si usano così:
//   vi.mock('../services/api', (vero) => moduloApi(vero, { getPartite, creaPartita }));
//   vi.mock('../stores/notificationStore', (vero) => moduloNotifiche(vero, { notifica }));
// ============================================================

import { vi } from 'vitest';

type Modulo = Record<string, unknown>;
type ImportaVero = () => Promise<unknown>;

/** Le esportazioni del barrel dell'API che non toccano la rete: restano quelle vere. */
const PURE_API = new Set(['ApiError', 'isApiError', 'queryString', 'urlImmagine', 'payloadDellaBusta']);

/** Fa fallire il test se fra i sostituti c'è un nome che il modulo vero non esporta (un refuso non passa in silenzio). */
function controllaSostituti(vero: Modulo, sostituti: Modulo, modulo: string): void {
  const estranei = Object.keys(sostituti).filter((nome) => !(nome in vero));
  if (estranei.length) throw new Error(`${modulo} finto: ${estranei.join(', ')} non esiste nel modulo vero`);
}

/** Il barrel `services/api` finto: i sostituti dati, le funzioni pure vere, le altre che falliscono dicendo il proprio nome. */
export async function moduloApi(importaVero: ImportaVero, sostituti: Modulo = {}): Promise<Modulo> {
  const vero = (await importaVero()) as Modulo;
  controllaSostituti(vero, sostituti, 'services/api');
  const finto: Modulo = {};
  for (const [nome, valore] of Object.entries(vero)) {
    if (nome in sostituti) finto[nome] = sostituti[nome];
    else if (PURE_API.has(nome) || typeof valore !== 'function') finto[nome] = valore;
    else finto[nome] = vi.fn(() => Promise.reject(new Error(`API non simulata in questo test: ${nome}`)));
  }
  return finto;
}

/** `stores/notificationStore` finto: lo store vero, con `notifica` (o quel che il test passa) sostituito. */
export async function moduloNotifiche(importaVero: ImportaVero, sostituti: Modulo = { notifica: vi.fn() }): Promise<Modulo> {
  const vero = (await importaVero()) as Modulo;
  controllaSostituti(vero, sostituti, 'stores/notificationStore');
  return { ...vero, ...sostituti };
}
