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
