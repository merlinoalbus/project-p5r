// ============================================================
// immaginiCache — cache locale di esistenza e versioni delle immagini caricate (condivisa fra i riquadri ImmagineEntita)
// ============================================================

import { getImmagini, type AmbitoImmagine } from '../../services/api';

/** Cache locale di esistenza per ambito (una sola richiesta di elenco per ambito, invalidata a ogni scrittura). */
const elenchi = new Map<string, Promise<Set<string>>>();
/** Versione per (ambito/chiave): cambia a ogni sostituzione così l'URL del file è sempre nuovo, anche fra montaggi. */
export const versioniImmagini = new Map<string, number>();

export function chiaviPresenti(ambito: AmbitoImmagine): Promise<Set<string>> {
  let p = elenchi.get(ambito);
  if (!p) {
    p = getImmagini(ambito).then((lista) => new Set(lista.map((i) => i.chiave))).catch(() => new Set<string>());
    elenchi.set(ambito, p);
  }
  return p;
}

/** Svuota la cache di esistenza (dopo una rimozione multipla): i riquadri rileggono l'elenco al prossimo montaggio. */
export function azzeraCacheImmagini(ambito?: AmbitoImmagine): void {
  if (ambito) elenchi.delete(ambito);
  else elenchi.clear();
}

/** Aggiorna la cache di esistenza quando un'immagine viene creata fuori dai riquadri (es. pianta scaricata dalla guida). */
export function segnaImmaginePresente(ambito: AmbitoImmagine, chiave: string): void {
  void chiaviPresenti(ambito).then((set) => set.add(chiave));
  versioniImmagini.set(`${ambito}/${chiave}`, (versioniImmagini.get(`${ambito}/${chiave}`) ?? 0) + 1);
}
