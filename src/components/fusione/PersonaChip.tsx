// ============================================================
// PersonaChip — Persona come tassello con miniatura, nome e livello (ricette, piani, cicli, ricette speciali) — Fase 14
// ============================================================

import { Link } from 'react-router-dom';
import { AnteprimaPersona } from '../shared/AnteprimaPersona';

interface PersonaMinima { id: number; nome: string; nomeIt: string; livello?: number; arcanaNome?: string; rara?: boolean }

interface Props {
  p: PersonaMinima;
  /** Risultato o bersaglio: bordo rosso e miniatura più grande. */
  evidenza?: boolean;
  /** Nella scorta della partita. */
  inScorta?: boolean;
  dimensione?: number;
  /** Testo aggiuntivo (es. «✓»). */
  suffisso?: string;
  title?: string;
}

/** Collegamento alla scheda con miniatura (immagine dell'utente → asset → iniziali), nome italiano e livello. */
export function PersonaChip({ p, evidenza, inScorta, dimensione, suffisso, title }: Props) {
  const d = dimensione ?? (evidenza ? 44 : 32);
  return (
    <Link to={`/compendio/persona/${p.id}`} className={`persona-chip no-underline ${evidenza ? 'persona-chip--evidenza' : ''} ${inScorta ? 'persona-chip--scorta' : ''}`} title={title ?? `${p.arcanaNome ? `${p.arcanaNome} · ` : ''}${p.livello !== undefined ? `livello ${p.livello}` : ''}${inScorta ? ' · nella scorta' : ''}`}>
      <AnteprimaPersona nome={p.nome} etichetta={p.nomeIt} dimensione={d} />
      <span className="persona-chip__testo">
        <span className="persona-chip__nome">{p.nomeIt}</span>
        {(p.livello !== undefined || p.rara || suffisso) && <span className="persona-chip__livello">{p.livello !== undefined ? `L${p.livello}` : ''}{p.rara ? ' ◆' : ''}{suffisso ?? ''}</span>}
      </span>
    </Link>
  );
}
