// ============================================================
// IconaArcano — l'illustrazione di un arcano (asset `arcani/icona/<chiave>`), con la maschera come riserva
// ============================================================
//
// Un solo punto per la figura dell'arcano nelle tessere, nei chip e nei riepiloghi: la chiave è quella inglese di `arcana.chiave`
// («Chariot», «Councillor»…). Decorativa: il nome dell'arcano lo dice sempre il testo accanto (o il `title` del contenitore).
// ============================================================

import { AssetImg } from './AssetImg';
import { IconMaschera } from './iconeGuida';
import { slug } from '../../../shared/slug';

/** La figura dell'arcano `arcana` (chiave inglese) in un quadrato di `dimensione` px. */
export function IconaArcano({ arcana, dimensione = 24, className }: { arcana: string; dimensione?: number; className?: string }) {
  return (
    <AssetImg nome={`arcani/icona/${slug(arcana)}`} alt="" decorativa dimensione={dimensione} quadrata
      className={`shrink-0 object-contain ${className ?? ''}`} style={{ width: dimensione, height: dimensione }} fallback={<IconMaschera size={Math.round(dimensione * 0.8)} />} />
  );
}
