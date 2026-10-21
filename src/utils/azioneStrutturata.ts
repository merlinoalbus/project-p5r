// ============================================================
// azioneStrutturata — tipo, collegamento, rango atteso ed effetti di un'azione della giornata, come li modifica la finestra
// ============================================================

import type { EffettoAzione, TipoAzione, TipoRiferimentoAzione } from '../../shared/effettiAzione';
import type { AzionePercorsoDto } from '../types';
import type { EffettoVoce, RichiestaSalvaEffettiVoce, StatoEffettiVoceDto } from '../../shared/effettiVoce';

/** I campi strutturati di un'azione; il collegamento può essere a metà (tipo scelto, elemento no) finché si modifica. */
export interface CampiStrutturati {
  tipo: TipoAzione;
  riferimento: { tipo: TipoRiferimentoAzione; chiave: string } | null;
  rangoAtteso: number | null;
  produce: EffettoAzione[];
  fonteEffetti?: StatoEffettiVoceDto;
  effettiVoce?: RichiestaSalvaEffettiVoce['effetti'];
}

export const STRUTTURA_VUOTA: CampiStrutturati = { tipo: 'altro', riferimento: null, rangoAtteso: null, produce: [], effettiVoce: [] };

/** Tipo, collegamento, rango ed effetti di un'azione, pronti per la finestra. */
export function strutturaDi(a: Pick<AzionePercorsoDto, 'tipo' | 'riferimento' | 'rangoAtteso' | 'produce' | 'effettiVoce'>): CampiStrutturati {
  return { tipo: a.tipo, riferimento: a.riferimento ? { tipo: a.riferimento.tipo, chiave: a.riferimento.chiave } : null, rangoAtteso: a.rangoAtteso, produce: a.produce ?? [],
    ...(a.effettiVoce ? { fonteEffetti: a.effettiVoce, ...(a.effettiVoce.stato === 'convertita' ? { effettiVoce: a.effettiVoce.effetti.map(({ uid, effetto }) => ({ uid, effetto })) } : {}) } : {}) };
}

/** L'incontro con un Confidente: alla spunta si chiedono le note ottenute (guida o azione dell'utente). */
export function chiedeNote(a: Pick<AzionePercorsoDto, 'tipo' | 'riferimento'>): boolean {
  return a.tipo === 'confidente' && a.riferimento?.tipo === 'confidente';
}

/** Un collegamento o un effetto ancora da completare ha la chiave vuota: si salva solo quando tutto è scelto. */
export function campiCompleti(c: CampiStrutturati): boolean {
  if (c.riferimento && !c.riferimento.chiave) return false;
  const completi = (e: EffettoVoce) => e.tipo === 'lettura' ? !!e.chiave : e.tipo === 'turno' ? !!e.attivita && (e.doti === undefined || e.doti.length > 0) : e.tipo === 'acquisto' ? !!e.articolo : true;
  return c.effettiVoce ? c.effettiVoce.every((e) => completi(e.effetto)) : c.fonteEffetti ? true : c.produce.every(completi);
}
