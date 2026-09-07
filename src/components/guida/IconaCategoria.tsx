// ============================================================
// IconaCategoria — icona di categoria su cartiglio (tipi di negozio, categorie di oggetti, schede delle attività, tipi di azione)
// ============================================================

import type { ReactNode } from 'react';
import { IconBolt, IconFusion, IconHome, IconMask, IconStar } from '../shared/icons';
import { IconAltro, IconAppunti, IconBussola, IconChiave, IconCuore, IconFilm, IconGioca, IconGioco, IconGoccia, IconLibro, IconMaschera, IconMessaggio, IconNegozio, IconPersone, IconScudo, IconStella, IconValigetta } from '../shared/iconeGuida';
import { useAsset } from '../../stores/assetStore';
import { chiaveCategoria } from '../../utils/categorie';

const ICONE: Record<string, (size: number) => ReactNode> = {
  // negozi
  armi: (s) => <IconBolt size={s} />, protezioni: (s) => <IconScudo size={s} />, accessori: (s) => <IconStar size={s} />, oggetti: (s) => <IconNegozio size={s} />,
  regali: (s) => <IconCuore size={s} />, abiti: (s) => <IconMask size={s} />, cibo: (s) => <IconCuore size={s} />, online: (s) => <IconBolt size={s} />,
  distributore: (s) => <IconGoccia size={s} />, materiali: (s) => <IconNegozio size={s} />, misto: (s) => <IconNegozio size={s} />, altro: (s) => <IconAltro size={s} />,
  // oggetti
  cura: (s) => <IconCuore size={s} />, sp: (s) => <IconGoccia size={s} />, stato: (s) => <IconScudo size={s} />, battaglia: (s) => <IconBolt size={s} />, esplorazione: (s) => <IconBussola size={s} />,
  'oggetti-chiave': (s) => <IconChiave size={s} />,
  // attività
  minigiochi: (s) => <IconGioco size={s} />, lavori: (s) => <IconValigetta size={s} />, studio: (s) => <IconAppunti size={s} />, libri: (s) => <IconLibro size={s} />, film: (s) => <IconFilm size={s} />,
  // Azioni del percorso. **Riserve distinte**, in attesa delle figure della §24: la Guida del
  // giorno mostra questa icona a 40 px, e finché non arriva l'illustrazione è questo segno a dire
  // che tipo di azione è. Prima «richiesta», «esame» e «libro» avevano tutti e tre lo stesso
  // libretto, e «trama» la stessa stella di «dote»: quattro azioni diverse, due segni.
  confidente: (s) => <IconPersone size={s} />, dote: (s) => <IconStella size={s} />, palazzo: (s) => <IconScudo size={s} />,
  // Le richieste dei Mementos arrivano per messaggio da Mishima, ed è il messaggio a dirlo.
  richiesta: (s) => <IconMessaggio size={s} />, acquisto: (s) => <IconNegozio size={s} />,
  lavoro: (s) => <IconValigetta size={s} />, libro: (s) => <IconLibro size={s} />, dvd: (s) => <IconFilm size={s} />,
  attivita: (s) => <IconGioca size={s} />, esame: (s) => <IconAppunti size={s} />,
  // La maschera è la trama dei Ladri Fantasma; nella Stanza di Velluto si fondono le Persona.
  trama: (s) => <IconMaschera size={s} />, velluto: (s) => <IconFusion size={s} />, casa: (s) => <IconHome size={s} />,
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
  const chiave = chiaveCategoria(categoria);
  const icona = ICONE[chiave] ?? ICONE[categoria] ?? ICONE.altro;
  const url = useAsset(`ui/categoria-${chiave}`);
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
