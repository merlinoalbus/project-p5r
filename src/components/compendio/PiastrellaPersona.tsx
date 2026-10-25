// ============================================================
// PiastrellaPersona — scheda a piastrella del compendio: arte grande, livello P5, icona dell'arcano, badge, affinità
// ============================================================

import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ImmagineEntita } from '../shared/ImmagineEntita';
import { AssetImg } from '../shared/AssetImg';
import { AffinitaGriglia } from './AffinitaGriglia';
import { LivelloBadge } from './LivelloBadge';
import { slug } from '../../../shared/slug';
import type { PersonaRiassuntoDto } from '../../types';

interface Props {
  persona: PersonaRiassuntoDto;
  /** Evidenzia la piastrella (ritorno dalla scheda). */
  evidenziata?: boolean;
  /** Chiamata quando si apre la scheda (per ricordare la Persona), con l'id della Persona: una funzione stabile per tutte le piastrelle,
   *  così `memo` evita di ridisegnarle quando la pagina si ridisegna per la ricerca (R12-03). */
  onApri?: (id: number) => void;
  /** Disposizione a riga per il telefono (lotto C): arte piccola a sinistra, nome e arcano accanto, le dieci affinità
   *  compatte su una riga sotto. Le informazioni sono le stesse della piastrella; ne entrano più per schermata. */
  riga?: boolean;
}

/** Badge di stato da asset (`ui/badge-*`) con riserva sul chip testuale. */
export function BadgeStato({ nome, testo }: { nome: 'dlc' | 'tesoro' | 'speciale' | 'allarme'; testo: string }) {
  return <AssetImg nome={`ui/badge-${nome}`} alt={testo} className="h-6 w-auto object-contain" fallback={<span className="chip">{testo}</span>} />;
}

/**
 * Piastrella cliccabile verso la scheda; l'arte si ingrandisce senza seguire il collegamento (si sostituisce dalla scheda di dettaglio, per evitare caricamenti accidentali scorrendo la griglia).
 * Memoizzata (R12-03): ogni piastrella contiene un riquadro immagine con diversi stati e sottoscrizioni; ridisegnarne 233 a ogni lettera
 * digitata nella ricerca era il lavoro più pesante della pagina. Con `persona` (lo stesso oggetto della risposta), `evidenziata`, `riga` e
 * `onApri` invariati una piastrella già disegnata non si rifà.
 */
export const PiastrellaPersona = memo(function PiastrellaPersona({ persona: p, evidenziata, onApri, riga }: Props) {
  const apri = onApri ? () => onApri(p.id) : undefined;
  const badge = <>
    {p.dlc && <BadgeStato nome="dlc" testo="DLC" />}
    {p.rara && <BadgeStato nome="tesoro" testo="Tesoro" />}
    {p.speciale && <BadgeStato nome="speciale" testo="Speciale" />}
    {p.richiedeConfidenteMax && <span className="chip">Confidente max</span>}
  </>;
  if (riga) {
    return (
      <li className="min-w-0" id={`persona-${p.id}`}>
        <Link to={`/compendio/persona/${p.id}`} className={`card card--cliccabile piastrella no-underline text-text grid grid-cols-[72px_minmax(0,1fr)] items-start gap-x-3 gap-y-2 p-2.5 ${evidenziata ? 'card--evidenza' : ''}`} aria-label={`${p.nomeIt}, ${p.arcanaNome}, livello ${p.livello}`} onClick={apri}>
          <div className="relative">
            <span onClick={(e) => e.preventDefault()} className="inline-flex"><ImmagineEntita ambito="persona" chiave={p.nome} etichetta={p.nomeIt} dimensione={72} forma="quadrata" adatta="copri" /></span>
            {p.rara && <AssetImg nome={`ui/tesoro-${slug(p.nome)}`} alt="" decorativa className="absolute -right-1 -bottom-1 w-8 h-8 object-contain drop-shadow" fallback={null} />}
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex min-w-0 items-start gap-2">
              <LivelloBadge livello={p.livello} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-display uppercase testo-18 leading-[1.05] break-words" title={p.nomeIt}>{p.nomeIt}</div>
                {p.nomeIt !== p.nome && <div className="testo-12 text-text-muted break-words">{p.nome}</div>}
              </div>
              <AssetImg nome={`arcani/icona/${slug(p.arcana)}`} alt="" decorativa dimensione={28} quadrata className="w-7 h-7 shrink-0 object-contain drop-shadow" fallback={null} />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="chip">{p.arcanaNome}</span>
              {badge}
            </div>
          </div>
          <div className="col-span-2 min-w-0">
            <AffinitaGriglia affinita={p.affinita} compatta fluida />
          </div>
        </Link>
      </li>
    );
  }
  return (
    <li className="min-w-0" id={`persona-${p.id}`}>
      <Link to={`/compendio/persona/${p.id}`} className={`card card--cliccabile piastrella no-underline text-text flex flex-col gap-2 h-full ${evidenziata ? 'card--evidenza' : ''}`} aria-label={`${p.nomeIt}, ${p.arcanaNome}, livello ${p.livello}`} onClick={apri}>
        <div className="relative flex justify-center">
          <span onClick={(e) => e.preventDefault()} className="inline-flex"><ImmagineEntita ambito="persona" chiave={p.nome} etichetta={p.nomeIt} dimensione={150} forma="quadrata" adatta="copri" /></span>
          <LivelloBadge livello={p.livello} className="absolute -left-2 -top-2" />
          <AssetImg nome={`arcani/icona/${slug(p.arcana)}`} alt="" decorativa dimensione={36} quadrata className="absolute -right-1 -top-1 w-9 h-9 object-contain drop-shadow" fallback={null} />
          {p.rara && <AssetImg nome={`ui/tesoro-${slug(p.nome)}`} alt="" decorativa className="absolute right-0 bottom-0 w-12 h-12 object-contain drop-shadow" fallback={null} />}
        </div>
        <div className="min-w-0">
          {/* il nome è l'identità della piastrella: va a capo invece di finire in «…» (i nomi lunghi —
              Magatsu-Izanagi Picaro, Amuleto dell'Imperatore — sbordavano di 60 px su telefono) */}
          <div className="font-display uppercase testo-20 leading-[1.05] break-words" title={p.nomeIt}>{p.nomeIt}</div>
          {p.nomeIt !== p.nome && <div className="testo-12 text-text-muted break-words">{p.nome}</div>}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="chip">{p.arcanaNome}</span>
          {badge}
        </div>
        <div className="mt-auto">
          <AffinitaGriglia affinita={p.affinita} compatta />
        </div>
      </Link>
    </li>
  );
});
