// ============================================================
// CondizioniNellaPartita — i requisiti, le date e i livelli strutturati della guida, con lo stato nella partita attiva (L8-03)
// ============================================================
//
// Le pagine della guida (Aiuto in battaglia, Sfide, Trofei e finali, Covo, Oggetti) mostrano accanto ai testi le condizioni che la partita sa
// valutare (migrazione 340: `condizioniJson` degli elementi, con la frase scritta dal server). Senza partita si legge la sola frase; con la
// partita ogni condizione porta il suo esito, chiesto al valutatore unico del server in una richiesta per pagina (`useEsitiNellaPartita`):
// l'interfaccia mostra gli esiti e non rivaluta (R6-02). Il livello consigliato si confronta col livello della partita (Partita → Modifica).
// ============================================================

import { usePartitaStore } from '../../stores/partitaStore';
// niente `shared/date` qui: importato da un modulo comune a più pagine caricate a richiesta, portava nel file d'ingresso i pezzi condivisi
// (misurato sul build: da 239 a 533 kB); i giorni fino a una scadenza li calcola il server
import { dataConArticolo } from '../../../shared/condizioniSpillo';
import type { CondizioneSpilloDto, RispostaValutaCondizioniDto, ValutazioneCondizioneDto } from '../../types';
import { IconaAzione } from '../shared/IconaAzione';
import { SegnoStato } from '../shared/SegnoStato';

/** Il segno dell'esito di una condizione: spunta se vale, lucchetto se manca, avviso se non blocca o non si può dire. */
function SegnoEsito({ v }: { v: ValutazioneCondizioneDto }) {
  return (
    <span role="img" aria-label={NOME_ESITO[v.esito]} title={NOME_ESITO[v.esito]} className="mt-0.5 inline-flex shrink-0 text-text-muted">
      {v.esito === 'vero' ? <SegnoStato stato="fatto" dimensione={14} /> : <IconaAzione chiave={v.esito === 'falso' ? 'bloccato' : 'allarme'} dimensione={14} />}
    </span>
  );
}

/** La frase con la prima lettera maiuscola: le condizioni si scrivono in minuscolo per stare dentro una frase («dal 21 giugno»). */
const maiuscola = (t: string) => t.charAt(0).toLocaleUpperCase('it') + t.slice(1);

/** Il nome dell'esito, per i lettori di schermo e il suggerimento al passaggio: le stesse parole delle condizioni dei pin
 *  (`CondizioniSpillo`: soddisfatta, non soddisfatta, non verificabile), più l'avviso che non blocca. */
const NOME_ESITO: Record<ValutazioneCondizioneDto['esito'], string> = { vero: 'Nella partita: soddisfatta', falso: 'Nella partita: non soddisfatta', avviso: 'Avviso: non blocca', grigio: 'Nella partita: non verificabile' };

/**
 * Le condizioni di un elemento: con l'esito, una riga per condizione (che cosa manca, se manca); senza, la frase di ognuna. Niente se non ci
 * sono condizioni. `titolo` è l'etichetta piccola sopra («Nella partita», «Quando si sblocca»).
 */
export function CondizioniGuida({ titolo, condizioni, esito, className = '' }: { titolo: string; condizioni: readonly CondizioneSpilloDto[]; esito?: RispostaValutaCondizioniDto; className?: string }) {
  if (!condizioni.length) return null;
  return (
    <div className={`flex min-w-0 flex-col gap-0.5 testo-13 ${className}`}>
      <span className="testo-12 uppercase tracking-[0.08em] text-text-muted">{titolo}</span>
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
        {condizioni.map((c, i) => {
          const v = esito?.condizioni[i];
          return (
            <li key={`${c.tipo}-${i}`} className="flex min-w-0 items-start gap-1.5">
              {v && <SegnoEsito v={v} />}
              <span className="min-w-0 break-words">
                {maiuscola(v ? (v.esito === 'falso' && v.manca ? v.manca : v.testo) : c.testo)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Il livello consigliato a confronto col livello della partita attiva («Livello 45 nella partita: ne servono almeno 60»); niente senza
 *  partita o senza livello numerico. */
export function LivelloNellaPartita({ minimo, className = '' }: { minimo: number | null | undefined; className?: string }) {
  const attiva = usePartitaStore((s) => s.attiva);
  if (!attiva || minimo === null || minimo === undefined) return null;
  const ok = attiva.livelloProtagonista >= minimo;
  return (
    <span className={`flex min-w-0 items-start gap-1.5 testo-13 ${className}`}>
      <SegnoEsito v={{ esito: ok ? 'vero' : 'falso', testo: '' }} />
      <span className="min-w-0">Livello {attiva.livelloProtagonista} nella partita{ok ? `: almeno ${minimo} raggiunto` : `: consigliato almeno ${minimo}`}</span>
    </span>
  );
}

/**
 * La scadenza dei requisiti di un finale («Entro il 17 novembre»), con i giorni che restano nella partita (`giorni`, calcolati dal server:
 * negativo se il giorno è passato; assente senza partita). Niente senza giorno.
 */
export function ScadenzaNellaPartita({ entro, giorni }: { entro: string | null | undefined; giorni?: number | null }) {
  if (!entro) return null;
  const nellaPartita = giorni === undefined || giorni === null ? ''
    : giorni < 0 ? ' · nella partita il giorno è passato'
      : ` · ${giorni === 0 ? 'è oggi' : giorni === 1 ? 'resta 1 giorno' : `restano ${giorni} giorni`} nella partita`;
  return <span className="testo-13">Entro {dataConArticolo(entro)}{nellaPartita}</span>;
}
