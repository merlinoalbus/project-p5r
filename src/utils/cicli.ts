// ============================================================
// cicli — le parole dei cicli di fusione condivise da Fusione e Partita
// ============================================================

import type { AnelloCicloDto } from '../types';

/** Da dove viene il compagno di un anello del ciclo. Era scritto uguale in CicliFusione e CicliSalvati (rilievo R5‴). */
export const NOME_MODO_PARTNER: Readonly<Record<AnelloCicloDto['partnerModo'], string>> = { scorta: 'dalla scorta', registro: 'dal Registro', cattura: 'da catturare' };
