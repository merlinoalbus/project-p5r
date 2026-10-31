// ============================================================
// FasciaGiornata — titolo di sezione «Di giorno» / «Di sera» con l'icona `ui/giorno` / `ui/sera` (riserva: sole / luna)
// ============================================================

import { AssetImg } from '../shared/AssetImg';
import { IconGiu, IconLuna, IconSole } from '../shared/iconeGuida';

/** Icona della fascia: asset `ui/giorno` / `ui/sera` con riserva sole / luna. Dentro un PulsanteVisivo la misura la impone il pulsante. */
export function IconaFascia({ fascia, dimensione = 24, className = 'w-7 h-7 object-contain' }: { fascia: 'giorno' | 'sera'; dimensione?: number; className?: string }) {
  const sera = fascia === 'sera';
  return <AssetImg nome={`ui/${fascia}`} alt="" decorativa className={className} fallback={<span className={`inline-flex ${sera ? 'text-info' : 'text-warning'}`}>{sera ? <IconLuna size={dimensione} /> : <IconSole size={dimensione} />}</span>} />;
}

interface Props {
  fascia: 'giorno' | 'sera';
  /** Conteggio facoltativo (es. azioni fatte su totali). */
  dettaglio?: string;
  /** È il momento della giornata corrente della partita: chip «Adesso» (15.27). */
  attiva?: boolean;
  /** C9 (2026-10-31): la fascia si chiude e si riapre dall'intestazione. Con `apertura` il titolo è un pulsante con `aria-expanded` e
   *  `aria-controls` (l'id del contenuto) e la freccia che ruota; senza, resta un titolo semplice. */
  apertura?: { aperta: boolean; controlla: string; onAlterna: () => void };
}

/** Intestazione h2 in carattere display con l'icona della fascia; con `apertura` il nome è il pulsante che apre e chiude la fascia. */
export function FasciaGiornata({ fascia, dettaglio, attiva, apertura }: Props) {
  const nome = fascia === 'sera' ? 'Di sera' : 'Di giorno';
  return (
    <h2 className="m-0 flex items-center gap-2 font-display uppercase tracking-wide testo-20 leading-none">
      {apertura ? (
        <button type="button" className="fascia-giornata__interruttore touch" aria-expanded={apertura.aperta} aria-controls={apertura.controlla}
          title={apertura.aperta ? `Chiudi le voci ${nome.toLowerCase()}` : `Mostra le voci ${nome.toLowerCase()}`} onClick={apertura.onAlterna}>
          <IconaFascia fascia={fascia} />
          {nome}
          <span className="fascia-giornata__freccia" aria-hidden="true"><IconGiu size={18} /></span>
        </button>
      ) : <><IconaFascia fascia={fascia} />{nome}</>}
      {attiva && <span className="chip chip--attivo font-sans normal-case tracking-normal testo-12" title="Momento della giornata impostato nella partita">Adesso</span>}
      {dettaglio && <span className="font-sans normal-case tracking-normal testo-12 text-text-muted">{dettaglio}</span>}
    </h2>
  );
}
