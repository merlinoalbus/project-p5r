// ============================================================
// PiastrellaPersona — scheda a piastrella del compendio: arte con il cartiglio del livello, nome, arcano, badge, segni della partita,
// affinità
// ============================================================
//
// L10-04 (schizzo approvato): la piastrella è orizzontale, alta circa 118 px — arte da 64 px a sinistra con il cartiglio rosso del
// livello, a destra nome, arcano, badge e i segni della partita («In scorta · Liv. N» in oro, «Nel Registro · Liv. N» in rosso), sotto
// le dieci affinità su una fila (due file di cinque dove la piastrella è stretta). Prima era alta 416 px con l'arte da 150: a 1280×689
// ne entravano 4 intere, ora 9. Sul telefono resta la riga (`riga`), con gli stessi segni.
//
// Accessibilità (L6): la piastrella è un collegamento con un nome proprio (che dice anche i segni); l'arte è un pulsante e non può stare
// dentro il collegamento, quindi sta sopra, sorella, alla stessa posizione di una casella vuota; il cartiglio sopra l'arte è una copia
// del collegamento nascosta ai lettori di schermo e fuori da Tab, col suggerimento «Livello N».
// ============================================================

import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ImmagineEntita } from '../shared/ImmagineEntita';
import { AssetImg } from '../shared/AssetImg';
import { AffinitaGriglia } from './AffinitaGriglia';
import { LivelloBadge } from './LivelloBadge';
import { SegniPartita } from './SegniPartita';
import { segniPerNome, type SegniPersona } from '../../hooks/useSegniPersonaPartita';
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
  /** L10-04: i segni della Persona nella partita attiva (in scorta, nel Registro); assenti senza partita o se non è né l'una né l'altra. */
  segni?: SegniPersona;
}

/** Badge di stato da asset (`ui/badge-*`) con riserva sul chip testuale. */
export function BadgeStato({ nome, testo }: { nome: 'dlc' | 'tesoro' | 'speciale' | 'allarme'; testo: string }) {
  return <AssetImg nome={`ui/badge-${nome}`} alt={testo} className="h-6 w-auto object-contain" fallback={<span className="chip">{testo}</span>} />;
}

/**
 * Piastrella cliccabile verso la scheda; l'arte si ingrandisce senza seguire il collegamento (si sostituisce dalla scheda di dettaglio, per evitare caricamenti accidentali scorrendo la griglia).
 * Memoizzata (R12-03): ogni piastrella contiene un riquadro immagine con diversi stati e sottoscrizioni; ridisegnarne 233 a ogni lettera
 * digitata nella ricerca era il lavoro più pesante della pagina. Con `persona` (lo stesso oggetto della risposta), `evidenziata`, `riga`,
 * `segni` (lo stesso oggetto finché la partita non cambia) e `onApri` invariati una piastrella già disegnata non si rifà.
 */
export const PiastrellaPersona = memo(function PiastrellaPersona({ persona: p, evidenziata, onApri, riga, segni }: Props) {
  const apri = onApri ? () => onApri(p.id) : undefined;
  const nome = `${p.nomeIt}, ${p.arcanaNome}, livello ${p.livello}${p.richiedeOggetto ? `, richiede l’oggetto ${p.richiedeOggetto.nome}` : ''}${segniPerNome(segni)}`;
  const badge = <>
    {p.dlc && <BadgeStato nome="dlc" testo="DLC" />}
    {p.rara && <BadgeStato nome="tesoro" testo="Tesoro" />}
    {p.speciale && <BadgeStato nome="speciale" testo="Speciale" />}
    {p.richiedeConfidenteMax && <span className="chip">Confidente max</span>}
    {/* Ondata 5 (lotto F-bis, decisione 22): solo l'etichetta, la fusione resta proposta */}
    {/* rilievo R5: il nome dell'oggetto si legge sulla piastrella (non solo nel suggerimento): tocco, tastiera e lettori di schermo */}
    {p.richiedeOggetto && <span className="chip">Richiede «{p.richiedeOggetto.nome}»</span>}
    <SegniPartita segni={segni} />
  </>;
  if (riga) {
    return (
      <li className="relative min-w-0 piastrella" id={`persona-${p.id}`}>
        <Link to={`/compendio/persona/${p.id}`} className={`card card--cliccabile no-underline text-text grid grid-cols-[72px_minmax(0,1fr)] items-start gap-x-3 gap-y-2 p-2.5 ${evidenziata ? 'card--evidenza' : ''}`} aria-label={nome} onClick={apri}>
          {/* la casella dell'arte: l'immagine (un pulsante) non può stare dentro il collegamento, sta sopra, fratello, alla stessa posizione */}
          <div className="h-[72px] w-[72px]" aria-hidden="true" />
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
        {/* l'arte sopra la casella vuota del collegamento: bordo 1 px + margine interno 10 px = 11 px (le stesse misure di `p-2.5` del collegamento); il riquadro lascia passare il tocco al collegamento, solo il pulsante dell'immagine lo prende */}
        <div className="pointer-events-none absolute left-[11px] top-[11px] h-[72px] w-[72px]">
          <span className="pointer-events-auto inline-flex"><ImmagineEntita ambito="persona" chiave={p.nome} etichetta={p.nomeIt} dimensione={72} forma="quadrata" /></span>
          {p.rara && <AssetImg nome={`ui/tesoro-${slug(p.nome)}`} alt="" decorativa className="absolute -right-1 -bottom-1 w-8 h-8 object-contain drop-shadow" fallback={null} />}
        </div>
      </li>
    );
  }
  return (
    <li className="relative min-w-0 piastrella" id={`persona-${p.id}`}>
      <Link to={`/compendio/persona/${p.id}`} className={`card card--cliccabile piastrella-persona no-underline text-text grid h-full min-h-[118px] grid-cols-[64px_minmax(0,1fr)] items-start gap-x-2.5 p-2.5 ${evidenziata ? 'card--evidenza' : ''}`} aria-label={nome} onClick={apri}>
        {/* la casella dell'arte: l'immagine (un pulsante) non può stare dentro il collegamento, sta sopra, fratello, alla stessa posizione */}
        <div className="h-16 w-16" aria-hidden="true" />
        <div className="flex h-full min-w-0 flex-col gap-1.5">
          <div className="flex min-w-0 items-start gap-1.5">
            {/* il nome è l'identità della piastrella: va a capo invece di finire in «…» (Magatsu-Izanagi Picaro, Amuleto dell'Imperatore) */}
            <div className="min-w-0 flex-1">
              <div className="font-display uppercase testo-17 leading-none break-words" title={p.nomeIt}>{p.nomeIt}</div>
              {p.nomeIt !== p.nome && <div className="testo-12 text-text-muted break-words">{p.nome}</div>}
            </div>
            <AssetImg nome={`arcani/icona/${slug(p.arcana)}`} alt="" decorativa dimensione={24} quadrata className="h-6 w-6 shrink-0 object-contain drop-shadow" fallback={null} />
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <span className="chip">{p.arcanaNome}</span>
            {badge}
          </div>
          <div className="mt-auto min-w-0">
            <AffinitaGriglia affinita={p.affinita} piastrella />
          </div>
        </div>
      </Link>
      {/* l'arte sopra la casella vuota del collegamento: bordo 1 px + margine interno 10 px di `p-2.5` = 11 px; il riquadro lascia passare il tocco al collegamento, solo il pulsante dell'immagine lo prende */}
      <div className="pointer-events-none absolute left-[11px] top-[11px] h-16 w-16">
        <span className="pointer-events-auto inline-flex"><ImmagineEntita ambito="persona" chiave={p.nome} etichetta={p.nomeIt} dimensione={64} forma="quadrata" /></span>
        {/* il cartiglio sta sopra l'arte, fuori dal collegamento: il livello lo dice già il nome del collegamento (qui `decorativo`, così non si legge due volte)
            e il suo suggerimento «Livello N» torna a comparire al passaggio, perché il riquadro lo prende; il clic porta alla stessa scheda (copia nascosta
            ai lettori di schermo e fuori da Tab, come l'arte è un fratello del collegamento) */}
        <Link to={`/compendio/persona/${p.id}`} tabIndex={-1} aria-hidden="true" className="pointer-events-auto absolute -left-1.5 -top-2 inline-flex" onClick={apri}><LivelloBadge livello={p.livello} decorativo /></Link>
        {p.rara && <AssetImg nome={`ui/tesoro-${slug(p.nome)}`} alt="" decorativa className="absolute -right-1 -bottom-1 w-7 h-7 object-contain drop-shadow" fallback={null} />}
      </div>
    </li>
  );
});
