// ============================================================
// FregioSezione — l'immagine decorativa che alleggerisce una sezione di solo testo
// ============================================================
//
// Alcune sezioni della guida sono, per forza, prosa: la negoziazione, gli esiti del colpo, le
// Ombre sciagura, la bottega di Jose. Una pagina fatta solo di paragrafi si legge male non perché
// il testo sia troppo, ma perché **non ha appigli**: l'occhio non trova un punto da cui ripartire.
//
// Il fregio è quell'appiglio: una figura a tema col contenuto, **decorativa e basta**. Non porta
// nessuna informazione: chi legge con uno screen reader non la incontra proprio (`aria-hidden`), e
// chi ha la grafica predefinita spenta non la vede.
//
// **Occupa il suo spazio, non sta dietro al testo.** Era un fondo al 16% di opacità, sfumato verso
// le righe per non disturbarle: così nascosto che l'utente ha creduto le immagini non fossero mai
// state consegnate. Correzione sua: «i decori li voglio non come sfondo dietro ma come immagini
// che spostano il contenuto di testo con opacità al 100%». Adesso la carta è una griglia, il testo
// sta in una colonna e la figura nell'altra — piena, senza maschera.
//
// **La chiave è il censimento.** Il fregio cerca `decori/<chiave>`: finché Codex non ha consegnato
// l'immagine, resta la riserva — una macchia di colore del tema, che alleggerisce comunque la
// carta senza fingere di essere un disegno. Ogni chiave nuova qui dentro è una riga in
// `docs/grafica/fabbisogno.md`.
// ============================================================

import type { ReactNode } from 'react';
import { AssetImg } from './AssetImg';

interface Props {
  /** Chiave dell'asset `decori/<chiave>`, in italiano e col trattino. */
  chiave: string;
  /** `angolo` (default): in alto a destra, dietro al testo. `banda`: fascia bassa a tutta larghezza. */
  forma?: 'angolo' | 'banda';
  className?: string;
}

/** Figura decorativa di una sezione: non dice niente, serve a far respirare la pagina. */
export function FregioSezione({ chiave, forma = 'angolo', className = '' }: Props) {
  return (
    <span aria-hidden className={`fregio-sezione fregio-sezione--${forma} ${className}`}>
      <AssetImg nome={`decori/${chiave}`} alt="" decorativa className="fregio-sezione__immagine"
        fallback={<span className="fregio-sezione__riserva" />} />
    </span>
  );
}

/** Una sezione di prosa con la sua illustrazione accanto.
 *
 * **Il testo sta in un contenitore suo**, e l'illustrazione gli è sorella: è la differenza fra
 * un'impaginazione e un pasticcio. Il primo tentativo metteva la figura in una colonna di griglia
 * che copriva tutte le righe (`grid-row: 1 / -1`), e la sua altezza si spalmava sulle righe del
 * testo: fra il titolo e il primo paragrafo si apriva un buco di trecento pixel. Rilievo
 * dell'utente, meritato: «non è responsive, non è ottimizzata e non è moderna».
 *
 * Ora sono due blocchi affiancati: il testo prende lo spazio che resta, la figura una colonna fra
 * 160 e 260 px. Sotto i 768 px si incolonnano e **la figura va sopra**, che su un telefono è come
 * si legge: prima l'immagine, poi il discorso. */
/** Come la figura sta nella sezione. Non c'è un valore buono per tutte: la pagina si compone
 *  scegliendo, sezione per sezione, e il movimento nasce da lì.
 *
 *  - `fascia`  in cima, larga quanto la carta: apre un capitolo;
 *  - `lato`    a fianco, un quarto della carta, e si alterna di lato scendendo (è il passo normale);
 *  - `grande`  un terzo, col testo in due colonne: per le sezioni fitte di prosa;
 *  - `alta`    a tutta altezza della carta: per i soggetti verticali. */
export type DisposizioneFregio = 'fascia' | 'lato' | 'grande' | 'alta';

export function SezioneConFregio({ chiave, forma, disposizione = 'lato', className = '', children, ...resto }: Props & { disposizione?: DisposizioneFregio; children: ReactNode } & React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={`card sezione-fregio sezione-fregio--${disposizione} ${className}`} {...resto}>
      <div className="sezione-fregio__testo">{children}</div>
      <FregioSezione chiave={chiave} forma={forma} />
    </section>
  );
}
