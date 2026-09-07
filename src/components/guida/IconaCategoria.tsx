// ============================================================
// IconaCategoria — icona di categoria su cartiglio (tipi di negozio, categorie di oggetti, schede delle attività, tipi di azione)
// ============================================================

import type { ReactNode } from 'react';
import { IconBolt, IconBook, IconHome, IconMask, IconStar } from '../shared/icons';
import { IconBussola, IconChiave, IconCuore, IconFilm, IconGioco, IconGoccia, IconNegozio, IconScudo, IconValigetta } from '../shared/iconeGuida';
import { AssetImg } from '../shared/AssetImg';

const ICONE: Record<string, (size: number) => ReactNode> = {
  // negozi
  armi: (s) => <IconBolt size={s} />, protezioni: (s) => <IconScudo size={s} />, accessori: (s) => <IconStar size={s} />, oggetti: (s) => <IconNegozio size={s} />,
  regali: (s) => <IconCuore size={s} />, abiti: (s) => <IconMask size={s} />, cibo: (s) => <IconCuore size={s} />, online: (s) => <IconBolt size={s} />,
  distributore: (s) => <IconGoccia size={s} />, materiali: (s) => <IconNegozio size={s} />, misto: (s) => <IconNegozio size={s} />, altro: (s) => <IconStar size={s} />,
  // oggetti
  cura: (s) => <IconCuore size={s} />, sp: (s) => <IconGoccia size={s} />, stato: (s) => <IconScudo size={s} />, battaglia: (s) => <IconBolt size={s} />, esplorazione: (s) => <IconBussola size={s} />,
  'oggetti-chiave': (s) => <IconChiave size={s} />,
  // attività
  minigiochi: (s) => <IconGioco size={s} />, lavori: (s) => <IconValigetta size={s} />, studio: (s) => <IconBook size={s} />, libri: (s) => <IconBook size={s} />, film: (s) => <IconFilm size={s} />,
  // azioni del percorso
  confidente: (s) => <IconMask size={s} />, dote: (s) => <IconStar size={s} />, palazzo: (s) => <IconScudo size={s} />, richiesta: (s) => <IconBook size={s} />, acquisto: (s) => <IconNegozio size={s} />,
  lavoro: (s) => <IconValigetta size={s} />, libro: (s) => <IconBook size={s} />, dvd: (s) => <IconFilm size={s} />, attivita: (s) => <IconGioco size={s} />, esame: (s) => <IconBook size={s} />,
  trama: (s) => <IconStar size={s} />, velluto: (s) => <IconMask size={s} />, casa: (s) => <IconHome size={s} />,
};

interface Props {
  categoria: string;
  /** Lato del cartiglio in px (default 28). */
  dimensione?: number;
  /** Etichetta accessibile (altrimenti decorativa). */
  etichetta?: string;
  className?: string;
}

/** Cartiglio rosso a taglio diagonale con l'icona della categoria (stella se sconosciuta).
 *
 * **La figura disegnata a mano è la riserva, non il traguardo.** Prima qui c'era solo l'SVG in
 * codice — il libretto bianco sui libri, la pellicola sui film, il pad sui videogiochi — e non
 * c'era nessun modo di sostituirlo con la grafica vera: l'asset non veniva nemmeno cercato.
 * Adesso si cerca `ui/categoria-<chiave>` come per le icone d'azione, e finché Codex non l'ha
 * consegnata resta l'SVG. Le chiavi sono il censimento: aggiungerne una qui vuol dire aggiungere
 * una riga a `docs/grafica/fabbisogno.md`. */
export function IconaCategoria({ categoria, dimensione = 28, etichetta, className }: Props) {
  const icona = ICONE[categoria] ?? ICONE.altro;
  const lato = Math.round(dimensione * 0.6);
  return (
    <span className={`icona-categoria ${className ?? ''}`} style={{ width: dimensione, height: dimensione }} role={etichetta ? 'img' : undefined} aria-label={etichetta} aria-hidden={etichetta ? undefined : true}>
      <AssetImg nome={`ui/categoria-${categoria}`} alt="" decorativa className="object-contain"
        style={{ width: lato, height: lato }} fallback={icona(lato)} />
    </span>
  );
}
