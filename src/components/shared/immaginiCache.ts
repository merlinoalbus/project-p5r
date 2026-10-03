// ============================================================
// immaginiCache — cache locale di esistenza e versioni delle immagini caricate (condivisa fra i riquadri ImmagineEntita)
// ============================================================

import { getImmagini, urlImmagine, type AmbitoImmagine } from '../../services/api';

/** Cache locale di esistenza per ambito (una sola richiesta di elenco per ambito, invalidata a ogni scrittura). */
const elenchi = new Map<string, Promise<Set<string>>>();
/** Versione per (ambito/chiave): cambia a ogni sostituzione così l'URL del file è sempre nuovo, anche fra montaggi. */
export const versioniImmagini = new Map<string, number>();
/** Data di creazione per (ambito/chiave) dall'elenco del server: entra nell'URL del file, che il browser può tenere in cache a lungo. */
const datazioni = new Map<string, string>();

export function chiaviPresenti(ambito: AmbitoImmagine): Promise<Set<string>> {
  let p = elenchi.get(ambito);
  if (!p) {
    const questa: Promise<Set<string>> = getImmagini(ambito)
      .then((lista) => { for (const i of lista) if (i.createdAt) datazioni.set(`${ambito}/${i.chiave}`, i.createdAt); return new Set(lista.map((i) => i.chiave)); })
      .catch(() => {
        // Un elenco fallito (rete giù, server in riavvio) non resta in cache come «nessuna immagine»: i riquadri montati dopo
        // lo richiedono. Si toglie solo se è ancora questa la richiesta registrata (un `azzeraCacheImmagini` nel frattempo
        // può averne già avviata una più nuova). Rilievo A6 della verifica completa, 2026-10-03.
        if (elenchi.get(ambito) === questa) elenchi.delete(ambito);
        return new Set<string>();
      });
    p = questa;
    elenchi.set(ambito, p);
  }
  return p;
}

/** Svuota la cache di esistenza (dopo una rimozione multipla): i riquadri rileggono l'elenco al prossimo montaggio. */
export function azzeraCacheImmagini(ambito?: AmbitoImmagine): void {
  if (ambito) elenchi.delete(ambito);
  else elenchi.clear();
}

/**
 * URL del file con la versione (`?v=<creazione>-<contatore>`): il server risponde con cache immutabile, quindi il browser non richiede
 * più l'immagine finché non cambia (sostituzione → nuova data o contatore → nuovo URL).
 */
export function urlImmagineVersionata(ambito: AmbitoImmagine, chiave: string): string {
  const id = `${ambito}/${chiave}`;
  return `${urlImmagine(ambito, chiave)}?v=${encodeURIComponent(`${datazioni.get(id) ?? 'x'}-${versioniImmagini.get(id) ?? 0}`)}`;
}

/** Registra la data di creazione di un'immagine appena caricata (l'URL versionato cambia subito). */
export function registraImmagine(ambito: AmbitoImmagine, chiave: string, createdAt: string): void {
  datazioni.set(`${ambito}/${chiave}`, createdAt);
}
