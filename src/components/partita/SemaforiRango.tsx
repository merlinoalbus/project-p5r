// ============================================================
// SemaforiRango — requisiti di un rango con semaforo (verde/rosso/grigio) e conferma manuale per quelli non verificabili (Fase 12.3)
// ============================================================

import type { SemaforiRangoDto, SemaforoRequisitoDto } from '../../types';
import { IconaAzione } from '../shared/IconaAzione';

interface Props {
  semafori: SemaforiRangoDto;
  /** Conferma manuale (assente = sola lettura). */
  onConferma?: (rango: number, r: SemaforoRequisitoDto, confermato: boolean) => void;
  /** Correzione di un requisito «da correggere» su una Richiesta che non c'è più (2026-10-11; assente = niente pulsante). */
  onCorreggi?: (rango: number, r: SemaforoRequisitoDto) => void;
  occupato?: boolean;
  compatto?: boolean;
}

const COLORE: Record<SemaforoRequisitoDto['stato'], string> = { verde: 'bg-success', rosso: 'bg-error', grigio: 'bg-text-muted' };
const NOME_STATO: Record<SemaforoRequisitoDto['stato'], string> = { verde: 'soddisfatto', rosso: 'non soddisfatto', grigio: 'da confermare' };
/** Il nome dello stato di un requisito: un grigio che non si conferma a mano (`manuale: false`) non è un dubbio ma un requisito
 *  rotto — cita una Richiesta che non c'è più (2026-10-11) — e si dice «da correggere». */
const nomeStato = (r: SemaforoRequisitoDto): string => (r.stato === 'grigio' && r.manuale === false ? 'da correggere' : NOME_STATO[r.stato]);

/** Elenco dei requisiti del rango con pallino colorato, spiegazione e pulsante di conferma manuale. */
export function SemaforiRango({ semafori, onConferma, onCorreggi, occupato, compatto }: Props) {
  const bloccanti = semafori.requisiti.filter((r) => r.bloccante !== false);
  return (
    <div className={`flex flex-col ${compatto ? 'gap-1' : 'gap-1.5'}`} role="group" aria-label={`Requisiti per il rango ${semafori.rango}`}>
      <div className="flex items-center gap-2">
        {/* il conto è sui requisiti che bloccano: le avvertenze da controllare nel gioco stanno sotto, ma non contano */}
        <span className={`testo-12 font-semibold uppercase tracking-[.06em] ${semafori.pronto ? 'text-success' : 'text-text-muted'}`}>Rango {semafori.rango} · {semafori.pronto ? 'requisiti soddisfatti' : `${bloccanti.filter((r) => r.stato === 'verde').length} di ${bloccanti.length} requisiti`}</span>
      </div>
      <ul className="m-0 p-0 list-none flex flex-col gap-1">
        {semafori.requisiti.map((r) => (
          <li key={r.indice} className={`flex items-start gap-2 ${compatto ? 'testo-12' : 'testo-13'}`}>
            {r.bloccante === false
              ? <span className="mt-0.5 shrink-0 text-warning" role="img" aria-label="Avvertenza: da controllare nel gioco, non blocca" title="Da controllare nel gioco: non blocca"><IconaAzione chiave="allarme" dimensione={14} /></span>
              : <span className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${COLORE[r.stato]}`} role="img" aria-label={`Semaforo ${nomeStato(r)}`} title={nomeStato(r)} />}
            <span className="min-w-0 flex-1">
              <span className="block">{r.testo}</span>
              <span className="block testo-12 text-text-muted">{r.dettaglio}</span>
            </span>
            {/* un requisito su una Richiesta che non c'è più si corregge: un'altra Richiesta, o lo si toglie («Requisito correggibile») */}
            {r.tipo === 'richiesta' && r.stato === 'grigio' && r.manuale === false && onCorreggi && (
              <button type="button" className="chip chip--icona touch shrink-0" disabled={occupato} onClick={() => onCorreggi(semafori.rango, r)} title="La Richiesta citata non c’è più: scegline un’altra o togli il requisito">
                <IconaAzione chiave="modifica" dimensione={14} />Correggi
              </button>
            )}
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
