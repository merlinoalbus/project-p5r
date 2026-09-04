// ============================================================
// PiastrellaPersona — scheda a piastrella del compendio: arte grande, livello P5, icona dell'arcano, badge, affinità
// ============================================================

import { Link } from 'react-router-dom';
import { ImmagineEntita } from '../shared/ImmagineEntita';
import { AssetImg } from '../shared/AssetImg';
import { AffinitaGriglia } from './AffinitaGriglia';
import { LivelloBadge } from './LivelloBadge';
import { slug } from '../../../shared/slug';
import type { PersonaRiassuntoDto } from '../../types';

interface Props {
  persona: PersonaRiassuntoDto;
}

/** Badge di stato da asset (`ui/badge-*`) con riserva sul chip testuale. */
export function BadgeStato({ nome, testo }: { nome: 'dlc' | 'tesoro' | 'speciale' | 'allarme'; testo: string }) {
  return <AssetImg nome={`ui/badge-${nome}`} alt={testo} className="h-6 w-auto object-contain" fallback={<span className="chip">{testo}</span>} />;
}

/** Piastrella cliccabile verso la scheda; l'arte si ingrandisce senza seguire il collegamento (si sostituisce dalla scheda di dettaglio, per evitare caricamenti accidentali scorrendo la griglia). */
export function PiastrellaPersona({ persona: p }: Props) {
  return (
    <li className="min-w-0">
      <Link to={`/compendio/persona/${p.id}`} className="card card--cliccabile piastrella no-underline text-text flex flex-col gap-2 h-full" aria-label={`${p.nomeIt}, ${p.arcanaNome}, livello ${p.livello}`}>
        <div className="relative flex justify-center">
          <span onClick={(e) => e.preventDefault()} className="inline-flex"><ImmagineEntita ambito="persona" chiave={p.nome} etichetta={p.nome} dimensione={150} forma="quadrata" adatta="copri" /></span>
          <LivelloBadge livello={p.livello} className="absolute -left-2 -top-2" />
          <AssetImg nome={`arcani/icona/${slug(p.arcana)}`} alt="" decorativa className="absolute -right-1 -top-1 w-9 h-9 object-contain drop-shadow" fallback={null} />
          {p.rara && <AssetImg nome={`ui/tesoro-${slug(p.nome)}`} alt="" decorativa className="absolute right-0 bottom-0 w-12 h-12 object-contain drop-shadow" fallback={null} />}
        </div>
        <div className="min-w-0">
          <div className="font-display uppercase text-[19px] leading-none truncate" title={p.nomeIt}>{p.nomeIt}</div>
          {p.nomeIt !== p.nome && <div className="text-[11px] text-text-muted truncate">{p.nome}</div>}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="chip">{p.arcanaNome}</span>
          {p.dlc && <BadgeStato nome="dlc" testo="DLC" />}
          {p.rara && <BadgeStato nome="tesoro" testo="Tesoro" />}
          {p.speciale && <BadgeStato nome="speciale" testo="Speciale" />}
          {p.richiedeConfidenteMax && <span className="chip">Confidente max</span>}
        </div>
        <div className="mt-auto">
          <AffinitaGriglia affinita={p.affinita} compatta />
        </div>
      </Link>
    </li>
  );
}
