import type { FortunaPartitaDto } from '../../shared/fortuna';

/**
 * La Fortuna di un consumo, letta dallo stato della partita (R10-10/2) invece di chiederla all'utente: `true` se quel giorno era
 * accesa proprio sulla Dote del consumo, `false` se non lo era, `null` se lo stato non basta a dirlo (un giorno passato di cui la
 * partita non ricorda niente).
 */
export function fortunaDelConsumo(stato: FortunaPartitaDto | null, giorno: string, variante: string, oggi: string | null): boolean | null {
  if (!stato || !giorno || !variante) return null;
  if (stato.dote !== null && stato.giorno === giorno) return stato.dote === variante;
  return giorno === oggi ? false : null;
}
