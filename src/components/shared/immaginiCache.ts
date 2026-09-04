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
    p = getImmagini(ambito).then((lista) => { for (const i of lista) if (i.createdAt) datazioni.set(`${ambito}/${i.chiave}`, i.createdAt); return new Set(lista.map((i) => i.chiave)); }).catch(() => new Set<string>());
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

/** Aggiorna la cache di esistenza quando un'immagine viene creata fuori dai riquadri (es. pianta scaricata dalla guida). */
export function segnaImmaginePresente(ambito: AmbitoImmagine, chiave: string): void {
  void chiaviPresenti(ambito).then((set) => set.add(chiave));
  versioniImmagini.set(`${ambito}/${chiave}`, (versioniImmagini.get(`${ambito}/${chiave}`) ?? 0) + 1);
}
