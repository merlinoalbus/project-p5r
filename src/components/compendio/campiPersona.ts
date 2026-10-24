// ============================================================
// campiPersona — i campi della scheda di correzione della Persona disegnati a modo loro (L11 · R11-15/3)
// ============================================================
//
// La finestra «Modifica» della Persona è `ModificaGuida` (tipo `persona`). Livello e statistiche di base si controllano prima di salvare (interi da 1 a 99),
// l'Arcano si sceglie per nome italiano e le skill con i livelli hanno un editor vero (`CampoSkillPersona`): niente righe senza skill, livelli fuori
// scala o la stessa skill due volte. Il server ricontrolla tutto e i suoi rifiuti si mostrano in italiano nella finestra.
// ============================================================

import { createElement } from 'react';
import type { EditorCampoSpeciale } from '../guida/ModificaGuida';
import { CampoArcanoPersona, CampoSkillPersona } from './EditorCampiPersona';
import { problemaSkill } from './skillPersonaLogica';

/** Un numero intero da 1 a 99 (livello e statistiche di base): il server rifiuta il resto. */
const numero1a99 = (etichetta: string): EditorCampoSpeciale => ({
  errore: (v) => (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 99 ? null : `${etichetta}: serve un numero intero da 1 a 99.`),
});

/** I campi speciali della scheda `persona`. `delGruppo`: le forme del gruppo possono imparare skill anche con risveglio, rango o 3ª forma. */
export function campiPersona(delGruppo: boolean): Record<string, EditorCampoSpeciale> {
  return {
    livello: numero1a99('Livello'),
    forza: numero1a99('Forza'), magia: numero1a99('Magia'), resistenza: numero1a99('Resistenza'), agilita: numero1a99('Agilità'), fortuna: numero1a99('Fortuna'),
    arcana: {
      disegna: (campo, valore, imposta, occupato) => createElement(CampoArcanoPersona, { campo, valore, imposta, occupato }),
    },
    skill: {
      disegna: (_campo, valore, imposta, occupato) => createElement(CampoSkillPersona, { valore, imposta, occupato, delGruppo }),
      errore: (v) => (Array.isArray(v) ? problemaSkill(v) : null),
    },
  };
}
