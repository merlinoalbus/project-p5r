// ============================================================
// SemaforiRango — requisiti di un rango con semaforo (verde/rosso/grigio) e conferma manuale per quelli non verificabili (Fase 12.3)
// ============================================================

import type { SemaforiRangoDto, SemaforoRequisitoDto } from '../../types';
import { IconaAzione } from '../shared/IconaAzione';

interface Props {
  semafori: SemaforiRangoDto;
  /** Conferma manuale (assente = sola lettura). */
  onConferma?: (rango: number, r: SemaforoRequisitoDto, confermato: boolean) => void;
  occupato?: boolean;
  compatto?: boolean;
}

const COLORE: Record<SemaforoRequisitoDto['stato'], string> = { verde: 'bg-success', rosso: 'bg-error', grigio: 'bg-text-muted' };
const NOME_STATO: Record<SemaforoRequisitoDto['stato'], string> = { verde: 'soddisfatto', rosso: 'non soddisfatto', grigio: 'da confermare' };

/** Elenco dei requisiti del rango con pallino colorato, spiegazione e pulsante di conferma manuale. */
export function SemaforiRango({ semafori, onConferma, occupato, compatto }: Props) {
  return (
    <div className={`flex flex-col ${compatto ? 'gap-1' : 'gap-1.5'}`} role="group" aria-label={`Requisiti per il rango ${semafori.rango}`}>
      <div className="flex items-center gap-2">
        <span className={`text-[11px] font-semibold uppercase tracking-[.06em] ${semafori.pronto ? 'text-success' : 'text-text-muted'}`}>Rango {semafori.rango} · {semafori.pronto ? 'requisiti soddisfatti' : `${semafori.requisiti.filter((r) => r.stato === 'verde').length} di ${semafori.requisiti.length} requisiti`}</span>
      </div>
      <ul className="m-0 p-0 list-none flex flex-col gap-1">
        {semafori.requisiti.map((r) => (
          <li key={r.indice} className={`flex items-start gap-2 ${compatto ? 'text-[12px]' : 'text-[13px]'}`}>
            <span className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${COLORE[r.stato]}`} role="img" aria-label={`Semaforo ${NOME_STATO[r.stato]}`} title={NOME_STATO[r.stato]} />
            <span className="min-w-0 flex-1">
              <span className="block">{r.testo}</span>
              <span className="block text-[11px] text-text-muted">{r.dettaglio}</span>
            </span>
            {r.manuale && onConferma && (
              <button type="button" className={`chip chip--icona touch shrink-0 ${r.confermato ? 'chip--attivo' : ''}`} disabled={occupato} onClick={() => onConferma(semafori.rango, r, !r.confermato)} aria-pressed={r.confermato} title={r.confermato ? 'Confermato a mano: tocca per revocare' : 'L\'app non può verificarlo: conferma a mano quando è soddisfatto'}>
                <IconaAzione chiave={r.confermato ? 'raggiunto' : 'aperti'} dimensione={14} />{r.confermato ? 'Confermato' : 'Condizione soddisfatta'}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
