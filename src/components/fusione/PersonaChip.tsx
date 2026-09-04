// ============================================================
// PersonaChip — Persona come tassello: miniatura incorniciata, nome nel carattere P5, tessera del livello, arcano, spunta di scorta
// (ricette, piani, cicli, ricette speciali) — Fase 14
// ============================================================

import { Link } from 'react-router-dom';
import { AnteprimaPersona } from '../shared/AnteprimaPersona';
import { AssetImg } from '../shared/AssetImg';
import { IconMaschera, IconSpunta } from '../shared/iconeGuida';
import { slug } from '../../../shared/slug';

interface PersonaMinima { id: number; nome: string; nomeIt: string; livello?: number; arcana?: string; arcanaNome?: string; rara?: boolean }

interface Props {
  p: PersonaMinima;
  /** Risultato o bersaglio: cornice rossa piena e miniatura più grande. */
  evidenza?: boolean;
  /** Nella scorta della partita (spunta verde sull'angolo). */
  inScorta?: boolean;
  dimensione?: number;
  /** Testo aggiuntivo accanto al livello (es. «✓»). */
  suffisso?: string;
  title?: string;
}

/** Collegamento alla scheda con miniatura (immagine dell'utente → asset → iniziali), nome italiano, livello e arcano. */
export function PersonaChip({ p, evidenza, inScorta, dimensione, suffisso, title }: Props) {
  const d = dimensione ?? (evidenza ? 60 : 50);
  const descrizione = `${p.arcanaNome ? `${p.arcanaNome} · ` : ''}${p.livello !== undefined ? `livello ${p.livello}` : ''}${p.rara ? ' · rara' : ''}${inScorta ? ' · nella scorta' : ''}`;
  return (
    <Link to={`/compendio/persona/${p.id}`} className={`persona-chip no-underline ${evidenza ? 'persona-chip--evidenza' : ''} ${inScorta ? 'persona-chip--scorta' : ''}`} title={title ?? descrizione}>
      <span className="persona-chip__cornice">
        <AnteprimaPersona nome={p.nome} etichetta={p.nomeIt} dimensione={d} contieni />
      </span>
      <span className="persona-chip__testo">
        <span className="persona-chip__nome">{p.nomeIt}</span>
        <span className="persona-chip__riga">
          {p.livello !== undefined && <span className="persona-chip__livello">Lv {p.livello}</span>}
          {p.arcana && <AssetImg nome={`arcani/icona/${slug(p.arcana)}`} alt="" decorativa className="persona-chip__arcano" fallback={<IconMaschera size={16} />} />}
          {p.arcanaNome && <span className="persona-chip__arcano-nome">{p.arcanaNome}</span>}
          {p.rara && <span className="persona-chip__rara" aria-label="Persona rara">◆</span>}
          {suffisso && <span className="persona-chip__suffisso">{suffisso}</span>}
        </span>
      </span>
      {inScorta && <span className="persona-chip__spunta" aria-hidden="true"><IconSpunta size={11} /></span>}
    </Link>
  );
}
