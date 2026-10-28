// ============================================================
// azioneStrutturata — tipo, collegamento, rango atteso ed effetti di un'azione della giornata, come li modifica la finestra
// ============================================================

import type { EffettoAzione, TipoAzione, TipoRiferimentoAzione } from '../../shared/effettiAzione';
import type { AzionePercorsoDto } from '../types';
import type { EffettoVoce, RichiestaSalvaEffettiVoce, StatoEffettiVoceDto } from '../../shared/effettiVoce';
import { eInNote, normalizzaEffettoVoce } from '../../shared/effettiVoce';
import { eAttivitaPesca } from '../../shared/pesca';
import type { PropostaConversioneDto } from '../../shared/proposteConversione';

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

/**
 * Tipo, collegamento, rango ed effetti di un'azione, pronti per la finestra: ESATTAMENTE come sono salvati. L13 (ondata 4a): il
 * collegamento non si ricava più dagli effetti all'apertura (salvando, si scriveva un dato che l'utente non aveva toccato); la finestra lo
 * propone con un pulsante (`collegamentoSuggerito`).
 */
export function strutturaDi(a: Pick<AzionePercorsoDto, 'tipo' | 'riferimento' | 'rangoAtteso' | 'produce' | 'effettiVoce'>): CampiStrutturati {
  const effetti = a.effettiVoce?.stato === 'convertita' ? a.effettiVoce.effetti.map(({ uid, effetto }) => ({ uid, effetto })) : undefined;
  const riferimento: CampiStrutturati['riferimento'] = a.riferimento ? { tipo: a.riferimento.tipo, chiave: a.riferimento.chiave } : null;
  return { tipo: a.tipo, riferimento, rangoAtteso: a.rangoAtteso, produce: a.produce ?? [],
    ...(a.effettiVoce ? { fonteEffetti: a.effettiVoce, ...(effetti ? { effettiVoce: effetti } : {}) } : {}) };
}

/**
 * L13 (ondata 4a, «Modifica» di una proposta da completare): la struttura della voce con la proposta già applicata, da rivedere nella
 * finestra prima di salvare. Tipo e collegamento proposti; via gli effetti da togliere; in fondo gli effetti proposti (un effetto identico
 * già presente non si ripete). Gli effetti da completare entrano come sono: la finestra non salva finché non sono completi.
 */
export function strutturaConProposta(s: CampiStrutturati, p: Pick<PropostaConversioneDto, 'tipo' | 'riferimento' | 'effetti' | 'togli'>): CampiStrutturati {
  const righe = (s.effettiVoce ?? []).filter((r) => !r.uid || !p.togli.some((t) => t.uid === r.uid));
  for (const e of p.effetti) if (!righe.some((r) => JSON.stringify(r.effetto) === JSON.stringify(e.effetto))) righe.push({ uid: null, effetto: e.effetto });
  return { ...s, ...(p.tipo ? { tipo: p.tipo } : {}), ...(p.riferimento ? { riferimento: { ...p.riferimento } } : {}), effettiVoce: righe };
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
    case 'personaTolta': return e.persona >= 1;
    // le note (1–3), o i punti fissi di un effetto scritto prima della correzione del 2026-10-28
    case 'puntiConfidente': return !!e.confidente && (eInNote(e) ? e.note >= 1 && e.note <= 3 : e.punti >= 1);
    case 'uscitaOggetto': return !!e.oggetto && e.quantita >= 1;
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
