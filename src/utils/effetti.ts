// ============================================================
// effetti — le famiglie di effetto come tessere (figura + nome) e l'effetto con cui nasce una famiglia appena scelta
// ============================================================

import { FAMIGLIE_EFFETTO, ICONA_FAMIGLIA_EFFETTO, type EffettoOggetto } from '../../shared/effettiOggetto';
import type { OpzioneIcone } from '../components/shared/SelettoreIcone';

export const OPZIONI_FAMIGLIA: OpzioneIcone[] = FAMIGLIE_EFFETTO.map((f) => ({ chiave: f.chiave, nome: f.nome, categoria: ICONA_FAMIGLIA_EFFETTO[f.chiave] }));

/** L'effetto con cui nasce una famiglia appena scelta: valido, e il caso più comune. */
export function effettoPredefinito(f: EffettoOggetto['famiglia']): EffettoOggetto {
  switch (f) {
    case 'ripristina': return { famiglia: 'ripristina', risorsa: 'hp', misura: 'assoluta', valore: 10, bersaglio: 'chi-lo-usa' };
    case 'rianima': return { famiglia: 'rianima', percentuale: 50, bersaglio: 'un-alleato' };
    case 'cura-stato': return { famiglia: 'cura-stato', stato: 'sonno', bersaglio: 'un-alleato' };
    case 'infliggi-stato': return { famiglia: 'infliggi-stato', stato: 'sonno', probabilita: 'media', bersaglio: 'un-nemico' };
    case 'resiste-stato': return { famiglia: 'resiste-stato', stato: 'sonno' };
    case 'previene-stato': return { famiglia: 'previene-stato', stato: 'sonno' };
    case 'statistica': return { famiglia: 'statistica', statistica: 'forza', valore: 1 };
    case 'dote': return { famiglia: 'dote', dote: 'conoscenza', note: 1 };
    case 'regalo': return { famiglia: 'regalo', graditoA: [] };
    case 'sblocca-luogo': return { famiglia: 'sblocca-luogo', luogo: '' };
    case 'sblocca-funzione': return { famiglia: 'sblocca-funzione', funzione: 'terzo-occhio', dove: null };
    case 'moltiplica': return { famiglia: 'moltiplica', cosa: 'lettura', fattore: 2 };
    case 'aumenta-punti': return { famiglia: 'aumenta-punti', dove: 'film' };
    case 'descrittivo': return { famiglia: 'descrittivo', testo: '' };
  }
}

/** I nomi che servono alle frasi degli effetti: quartieri (sblocca-luogo) e attività (sblocca-funzione). */
export interface NomiPerEffetti {
  quartieri?: Array<{ chiave: string; nome: string }>;
  attivita?: Array<{ chiave: string; nome: string }>;
  confidenti?: Array<{ chiave: string; nome: string }>;
  /** Il caricamento dei nomi è fallito: l'editor lo dice e offre di riprovare. */
  erroreNomi?: string | null;
  riprovaNomi?: () => void;
}
