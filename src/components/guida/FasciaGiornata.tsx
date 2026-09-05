// ============================================================
// FasciaGiornata — titolo di sezione «Di giorno» / «Di sera» con l'icona `ui/giorno` / `ui/sera` (riserva: sole / luna)
// ============================================================

import { AssetImg } from '../shared/AssetImg';
import { IconLuna, IconSole } from '../shared/iconeGuida';

interface Props {
  fascia: 'giorno' | 'sera';
  /** Conteggio facoltativo (es. azioni fatte su totali). */
  dettaglio?: string;
  /** È il momento della giornata corrente della partita: chip «Adesso» (15.27). */
  attiva?: boolean;
}

/** Intestazione h2 in carattere display con l'icona della fascia. */
export function FasciaGiornata({ fascia, dettaglio, attiva }: Props) {
  const sera = fascia === 'sera';
  return (
    <h2 className="m-0 flex items-center gap-2 font-display uppercase tracking-wide text-[20px] leading-none">
      <AssetImg nome={`ui/${fascia}`} alt="" decorativa className="w-7 h-7 object-contain" fallback={<span className={`inline-flex ${sera ? 'text-info' : 'text-warning'}`}>{sera ? <IconLuna size={24} /> : <IconSole size={24} />}</span>} />
      {sera ? 'Di sera' : 'Di giorno'}
      {attiva && <span className="chip chip--attivo font-sans normal-case tracking-normal text-[11px]" title="Momento della giornata impostato nella partita">Adesso</span>}
      {dettaglio && <span className="font-sans normal-case tracking-normal text-[12px] text-text-muted">{dettaglio}</span>}
    </h2>
  );
}
