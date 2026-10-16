// ============================================================
// cestino — le parole del cestino (2026-10-16): che cosa c'è dentro, perché una riga non è tornata, dove si trova
// ============================================================
//
// Richiesta dell'utente: «Cestino con ripristino» per le aree dei Palazzi, le voci della guida, le planimetrie e le aree dei
// dedali, in Impostazioni. Ogni conferma di eliminazione di quegli elementi dice dove finiscono (`NEL_CESTINO`), con le stesse
// parole ovunque; la sezione del cestino usa i nomi dei tipi e dei motivi.
// ============================================================

import type { MotivoSaltataCestinoDto, TipoCestino } from '../types';

/** La frase delle conferme di eliminazione: dove finisce l'elemento e come tornarlo indietro. */
export const NEL_CESTINO = 'Finisce nel cestino (Impostazioni → Cestino): da lì la rimetti com’era.';

/** Il nome di un tipo di elemento del cestino. */
export const NOME_TIPO_CESTINO: Record<TipoCestino, string> = {
  area: 'Area della guida',
  voce: 'Voce della guida',
  mappa: 'Planimetria',
  'area-dedalo': 'Area del dedalo',
};

/**
 * Perché delle righe non sono tornate com'erano, detto all'utente dopo «N etichetta» — al singolare per una sola. Le frasi
 * concordano solo nel numero, non nel genere: l'etichetta può essere «pin», «planimetria», «voci della guida»…
 */
const MOTIVO_SALTATA_CESTINO: Record<MotivoSaltataCestinoDto, readonly [uno: string, molti: string]> = {
  // «le modifiche restano», non «resta com'è»: dopo un'area rimessa al suo posto l'ordine delle vicine si rinumera, e di una riga
  // spostata dopo resta lo spostamento (l'ordine relativo), non il numero
  'cambiata-dopo': ['con modifiche fatte dopo l’eliminazione: le modifiche restano', 'con modifiche fatte dopo l’eliminazione: le modifiche restano'],
  'non-esiste-piu': ['che nel frattempo non c’è più', 'che nel frattempo non ci sono più'],
  'legame-mancante': ['che punta a qualcosa eliminato dopo: non torna', 'che puntano a qualcosa eliminato dopo: non tornano'],
};

/** Il motivo per `quante` righe saltate. */
export function motivoSaltata(motivo: MotivoSaltataCestinoDto, quante: number): string {
  return MOTIVO_SALTATA_CESTINO[motivo][quante === 1 ? 0 : 1];
}
