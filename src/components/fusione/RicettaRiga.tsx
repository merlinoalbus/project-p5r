// ============================================================
// RicettaRiga — una ricetta di fusione: tasselli degli ingredienti (con evidenza della scorta), operatori, risultato, tipo, costo
// ============================================================

import { PersonaChip } from './PersonaChip';
import { IconSpunta } from '../shared/iconeGuida';
import type { RicettaFusioneDto } from '../../types';
import { formattaYen } from '../../utils/punti';

const NOME_TIPO: Record<RicettaFusioneDto['tipo'], string> = {
  normale: 'Normale',
  'stesso-arcano': 'Stesso arcano',
  tesoro: 'Demone del Tesoro',
  speciale: 'Speciale',
};

/** Operatore fra i tasselli: «+» fra gli ingredienti, freccia verso il risultato. */
export function OperatoreRicetta({ tipo }: { tipo: 'piu' | 'risultato' }) {
  return (
    <span className={`ricetta-op ${tipo === 'risultato' ? 'ricetta-op--risultato' : ''}`} aria-hidden="true">
      {tipo === 'piu' ? '+' : (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12h15" /><path d="M13 6l6 6-6 6" />
        </svg>
      )}
    </span>
  );
}

/** Riga di ricetta; se `mostraRisultato` è false si mostrano solo gli ingredienti (elenco «per ottenere X»). */
export function RicettaRiga({ ricetta, inScorta, mostraRisultato = true }: { ricetta: RicettaFusioneDto; inScorta?: Set<number>; mostraRisultato?: boolean }) {
  const scorta = inScorta ?? new Set<number>();
  const tuttiInScorta = ricetta.ingredienti.every((i) => scorta.has(i.id));
  return (
    <li className={`ricetta-riga ${tuttiInScorta ? 'ricetta-riga--pronta' : ''}`}>
      <span className="ricetta-riga__persone">
        {ricetta.ingredienti.map((p, idx) => (
          <span key={p.id} className="ricetta-riga__gruppo">
            <PersonaChip p={p} inScorta={scorta.has(p.id)} />
            {idx < ricetta.ingredienti.length - 1 && <OperatoreRicetta tipo="piu" />}
          </span>
        ))}
        {mostraRisultato && (
          <span className="ricetta-riga__gruppo">
            <OperatoreRicetta tipo="risultato" />
            <PersonaChip p={ricetta.risultato} evidenza inScorta={scorta.has(ricetta.risultato.id)} />
          </span>
        )}
      </span>
      <span className="ricetta-riga__dati">
        <span className="ricetta-riga__tipo">{NOME_TIPO[ricetta.tipo]}</span>
        <span className="ricetta-riga__costo">{formattaYen(ricetta.costo)}</span>
        {tuttiInScorta && <span className="chip chip--attivo chip--icona text-[11px]" title="Hai tutti gli ingredienti nella scorta"><IconSpunta size={14} /> Pronta</span>}
      </span>
    </li>
  );
}
