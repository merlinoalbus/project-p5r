// ============================================================
// EmblemaDungeon — emblema di un Palazzo o Dedalo: asset `palazzi/<chiave>` (consegna 11.6), riserva sull'icona dell'arcano del sovrano, poi l'iniziale
// ============================================================

import { AssetImg } from '../shared/AssetImg';
import { slug } from '../../../shared/slug';

interface Props {
  chiave: string;
  nome: string;
  /** Arcano del sovrano (vuoto quando la guida non lo indica). */
  arcanaSovrano?: string | null;
  dimensione?: number;
  className?: string;
}

/** Emblema quadrato con ombra; senza asset mostra l'icona dell'arcano o l'iniziale del nome in carattere display. */
export function EmblemaDungeon({ chiave, nome, arcanaSovrano, dimensione = 72, className }: Props) {
  const iniziale = <span className="emblema emblema--riserva font-display" style={{ width: dimensione, height: dimensione, fontSize: Math.round(dimensione * 0.55) }} aria-hidden="true">{nome.replace(/^(Palazzo|Dedalo) di /i, '').charAt(0).toUpperCase()}</span>;
  const arcano = arcanaSovrano
    ? <AssetImg nome={`arcani/icona/${slug(arcanaSovrano)}`} alt="" decorativa className="emblema object-contain" style={{ width: dimensione, height: dimensione }} fallback={iniziale} />
    : iniziale;
  return (
    <span className={`inline-flex shrink-0 ${className ?? ''}`}>
      <AssetImg nome={`palazzi/${chiave}`} alt="" decorativa className="emblema object-contain" style={{ width: dimensione, height: dimensione }} fallback={arcano} />
    </span>
  );
}
