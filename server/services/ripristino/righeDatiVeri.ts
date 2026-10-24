// ============================================================
// righeDatiVeri — i dati di gioco che prima si potevano cambiare solo nel pacchetto (L11 · R11-17/1)
// ============================================================
//
// Un solo punto che raccoglie gli oggetti «a riga» dei gruppi di R11-17/1 (compendio, confidenti e calendario, luoghi e note, Ombre, negoziazione, Dedalo): `righe.ts`
// importa questo elenco e basta. Ogni gruppo ha il suo file e la sua migrazione (le tre colonne `origine`, `seed_json`, `updated_at` sulla riga del padre).
// ============================================================

import { DEFINIZIONI_COMPENDIO } from './righeCompendio.js';
import { DEFINIZIONI_CONFIDENTI_CALENDARIO } from './righeConfidentiCalendario.js';
import { DEFINIZIONI_DEDALO } from './righeDedalo.js';
import { DEFINIZIONI_LUOGHI_NOTE } from './righeLuoghiNote.js';
import { DEFINIZIONI_NEGOZIAZIONE } from './righeNegoziazione.js';

export const DEFINIZIONI_DATI_VERI = { ...DEFINIZIONI_COMPENDIO, ...DEFINIZIONI_CONFIDENTI_CALENDARIO, ...DEFINIZIONI_NEGOZIAZIONE, ...DEFINIZIONI_DEDALO, ...DEFINIZIONI_LUOGHI_NOTE } as const;
