// ============================================================
// IconaCategoria — icona di categoria su cartiglio (tipi di negozio, categorie di oggetti, schede delle attività, tipi di azione)
// ============================================================

import type { ReactNode } from 'react';
import { IconBolt, IconBook, IconHome, IconMask, IconStar } from '../shared/icons';
import { IconBussola, IconChiave, IconCuore, IconFilm, IconGioco, IconGoccia, IconNegozio, IconScudo, IconValigetta } from '../shared/iconeGuida';
import { useAsset } from '../../stores/assetStore';

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

/** L'icona di una categoria: **l'illustrazione se c'è, altrimenti il cartiglio rosso col tratto**.
 *
 * Due grafiche diverse vogliono due contenitori diversi, e infilarle nello stesso è stato un
 * errore che si vedeva a colpo d'occhio: il cartiglio è un parallelogramma **rosso pieno** nato
 * per ospitare un segno bianco a un tratto: mettendoci dentro l'illustrazione — che ha già il suo
 * nero, il suo bianco e la sua ombra rossa — si ottengono due grafiche sovrapposte, il disegno
 * schiacciato al 60% dentro un rombo e nessuna delle due leggibile.
 *
 * Quindi: quando l'asset `ui/categoria-<chiave>` c'è, **è lui l'icona**, mostrata intera e senza
 * fondo, come le piastrelle della Guida; quando non c'è, resta il cartiglio con l'SVG in codice,
 * che per un segno a un tratto è il vestito giusto. Le due misure sono uguali, quindi il giorno in
 * cui una figura arriva non si sposta niente.
 *
 * Le chiavi sono il censimento: aggiungerne una qui vuol dire aggiungere una riga a
 * `docs/grafica/fabbisogno.md`. */
export function IconaCategoria({ categoria, dimensione = 28, etichetta, className }: Props) {
  const icona = ICONE[categoria] ?? ICONE.altro;
  const url = useAsset(`ui/categoria-${categoria}`);
  const comune = { role: etichetta ? ('img' as const) : undefined, 'aria-label': etichetta, 'aria-hidden': etichetta ? undefined : true };
  if (url) {
    return (
      <span className={`inline-flex shrink-0 items-center justify-center ${className ?? ''}`} style={{ width: dimensione, height: dimensione }} {...comune}>
        <img src={url} alt="" aria-hidden draggable={false} className="h-full w-full object-contain" />
      </span>
    );
  }
  return (
    <span className={`icona-categoria ${className ?? ''}`} style={{ width: dimensione, height: dimensione }} {...comune}>
      {icona(Math.round(dimensione * 0.6))}
    </span>
  );
}
