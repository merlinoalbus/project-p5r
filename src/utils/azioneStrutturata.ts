// ============================================================
// azioneStrutturata — tipo, collegamento, rango atteso ed effetti di un'azione della giornata, come li modifica la finestra
// ============================================================

import type { EffettoAzione, TipoAzione, TipoRiferimentoAzione } from '../../shared/effettiAzione';
import type { AzionePercorsoDto } from '../types';
import type { EffettoVoce, RichiestaSalvaEffettiVoce, StatoEffettiVoceDto } from '../../shared/effettiVoce';
import { normalizzaEffettoVoce } from '../../shared/effettiVoce';
import { eAttivitaPesca } from '../../shared/pesca';
import { riferimentoDiApertura, uidPrincipaleDiApertura } from './effettoAutomatico';

/** I campi strutturati di un'azione; il collegamento può essere a metà (tipo scelto, elemento no) finché si modifica. */
export interface CampiStrutturati {
  tipo: TipoAzione;
  riferimento: { tipo: TipoRiferimentoAzione; chiave: string } | null;
  rangoAtteso: number | null;
  produce: EffettoAzione[];
  fonteEffetti?: StatoEffettiVoceDto;
  effettiVoce?: RichiestaSalvaEffettiVoce['effetti'];
  /** Solo all'apertura: l'UID dell'effetto principale di una voce con un collegamento salvato di altro genere (che non si tocca). Mai nel salvataggio. */
  uidPrincipale?: string | null;
}

export const STRUTTURA_VUOTA: CampiStrutturati = { tipo: 'altro', riferimento: null, rangoAtteso: null, produce: [], effettiVoce: [] };

/** Tipo, collegamento, rango ed effetti di un'azione, pronti per la finestra. */
export function strutturaDi(a: Pick<AzionePercorsoDto, 'tipo' | 'riferimento' | 'rangoAtteso' | 'produce' | 'effettiVoce'>): CampiStrutturati {
  const effetti = a.effettiVoce?.stato === 'convertita' ? a.effettiVoce.effetti.map(({ uid, effetto }) => ({ uid, effetto })) : undefined;
  let riferimento: CampiStrutturati['riferimento'] = a.riferimento ? { tipo: a.riferimento.tipo, chiave: a.riferimento.chiave } : null;
  let uidPrincipale: string | null = null;
  if (effetti) {
    // Voce salvata SENZA collegamento ma con UN SOLO effetto del genere del tipo: il collegamento si ricava da quell'effetto, così
    // «Quale» lo mostra scelto e cambiarlo riscrive quell'effetto (stesso UID) invece di aggiungerne un secondo.
    // Un collegamento salvato di altro genere (negozio su un lavoro, attività su una Dote) NON si tocca: l'effetto principale si trova
    // lo stesso, con l'UID. Solo all'apertura: dopo un cambio di tipo o di collegamento nessuno dei due ripieghi si applica.
    riferimento = riferimentoDiApertura(a.tipo, riferimento, effetti);
    uidPrincipale = uidPrincipaleDiApertura(a.tipo, riferimento, effetti);
  }
  return { tipo: a.tipo, riferimento, rangoAtteso: a.rangoAtteso, produce: a.produce ?? [],
    ...(uidPrincipale ? { uidPrincipale } : {}),
    ...(a.effettiVoce ? { fonteEffetti: a.effettiVoce, ...(effetti ? { effettiVoce: effetti } : {}) } : {}) };
}

/** L'incontro con un Confidente: alla spunta si chiedono le note ottenute (guida o azione dell'utente). */
export function chiedeNote(a: Pick<AzionePercorsoDto, 'tipo' | 'riferimento'>): boolean {
  return a.tipo === 'confidente' && a.riferimento?.tipo === 'confidente';
}

/** Un effetto con tutto scelto? Appena aggiunto, l'oggetto che cita non c'è ancora (chiave vuota o numero 0): si salva solo quando c'è. */
export function effettoCompleto(e: EffettoVoce): boolean {
  switch (e.tipo) {
    case 'lettura': return !!e.chiave;
    case 'turno': return !!e.attivita && (e.doti === undefined || e.doti.length > 0);
    case 'acquisto': return !!e.articolo;
    case 'storia': return !!e.evento;
    case 'domanda': return e.domanda >= 1;
    case 'cruciverba': return !!e.data;
    case 'richiesta': return !!e.richiesta;
    case 'articolo': return !!e.articolo;
    case 'invito': return !!e.invito;
    case 'persona': return e.persona >= 1;
    case 'yen': return Number.isSafeInteger(e.importo) && e.importo !== 0;
    case 'oggetto': return !!e.oggetto && e.quantita >= 1;
    case 'trofeo': return !!e.trofeo;
    case 'sblocco': return !!e.chiave;
    default: return true;
  }
}

/** Un collegamento o un effetto ancora da completare ha la chiave vuota: si salva solo quando tutto è scelto. */
export function campiCompleti(c: CampiStrutturati): boolean {
  if (c.riferimento && !c.riferimento.chiave) return false;
  const completi = effettoCompleto;
  if (!c.effettiVoce) return c.fonteEffetti ? true : c.produce.every(completi);
  const sostituiti = new Set(c.effettiVoce.flatMap(r => r.effetto.tipo === 'acquisto' ? r.effetto.sostituisceDoti : []));
  return c.effettiVoce.every(({ effetto }) => {
    if (!completi(effetto)) return false;
    if (effetto.tipo !== 'pesca') return true;
    if (!normalizzaEffettoVoce(effetto)) return false;
    return effetto.sostituisceTurni.every(id => c.effettiVoce!.some(r => r.uid === id && r.effetto.tipo === 'turno' && eAttivitaPesca(r.effetto.attivita)))
      && effetto.sostituisceDoti.every(id => c.effettiVoce!.some(r => r.uid === id && r.effetto.tipo === 'dote' && r.effetto.dote === 'perizia'))
      && [...effetto.sostituisceTurni, ...effetto.sostituisceDoti].every(id => { if (sostituiti.has(id)) return false; sostituiti.add(id); return true; });
  });
}
