import { datiGuida, type Congelato } from './datiGuida.js';
import { ricompensePerFonte } from './catalogoOggettiLetture.js';
import { httpErrors } from '../utils/httpError.js';
import type { SfideDto } from '../../shared/types.js';

/** La guida resta congelata; i riferimenti sono letti in blocco, senza interpretare ricompense o punteggi. */
export function sfide(): Congelato<SfideDto> {
  const guida = datiGuida<SfideDto>('sfide');
  if (!guida) throw httpErrors.notFound('sfide-non-disponibili', 'I dati delle sfide non sono caricati.');
  const chiavi = [...guida.battaglieSfida.elenco, ...guida.bossSegreti].map((r) => r.chiave);
  const premi = ricompensePerFonte('sfida', chiavi);
  return { ...guida,
    battaglieSfida: { ...guida.battaglieSfida, elenco: guida.battaglieSfida.elenco.map((r) => ({ ...r, oggettiRicompensa: premi.get(r.chiave) ?? [] })) },
    bossSegreti: guida.bossSegreti.map((r) => ({ ...r, oggettiRicompensa: premi.get(r.chiave) ?? [] })),
  };
}
