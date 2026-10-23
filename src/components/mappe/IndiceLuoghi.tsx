// ============================================================
// IndiceLuoghi — il corpo di `/guida/mappe`: i «Luoghi della guida» come albero (L11 B5)
// ============================================================
//
// Titolo, intestazione con i totali (tutti dal server: `totali` della gerarchia, nessuna somma qui) e l'albero Città › Quartieri › Aree ›
// Planimetrie e Città › Palazzi › Aree › Planimetrie. La pagina scorre da sola (una barra); l'unico scorrimento annidato è quello di un
// quartiere o Palazzo aperto con molti figli. L'intestazione resta bassa: il titolo è breve e la riga dei totali va a capo senza
// ripetere le sezioni (a ogni dispositivo l'intestazione sta entro il 30% dell'altezza della schermata).
// ============================================================

import { AlberoGerarchia } from './AlberoGerarchia';
import { PageState } from '../shared/PageState';
import { IntestazionePagina } from '../shared/IntestazionePagina';
import { useCarica } from '../../hooks/useCarica';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { getGerarchiaMappe } from '../../services/api';
import { usePartitaStore } from '../../stores/partitaStore';
import { testoConteggiPin, testoPin } from '../../utils/presentazioneMappa';
import type { GerarchiaMappeDto } from '../../types';

const parola = (n: number, uno: string, piu: string): string => `${n} ${n === 1 ? uno : piu}`;

/** La riga dei totali, con i numeri del server e le parole dei livelli (mai «mappe»). */
function testoTotali(t: GerarchiaMappeDto['totali']): string {
  return [
    parola(t.citta, 'città', 'città'),
    parola(t.quartieri, 'quartiere', 'quartieri'),
    `${parola(t.areeMondo, 'area', 'aree')} (${parola(t.planimetrieMondo, 'planimetria', 'planimetrie')})`,
    parola(t.palazzi, 'Palazzo', 'Palazzi'),
    `${parola(t.areePalazzi, 'area', 'aree')} (${parola(t.planimetriePalazzi, 'planimetria', 'planimetrie')})`,
    testoPin(t.pin.contenuto),
  ].join(' · ') + `, più ${t.pin.passaggi} ${t.pin.passaggi === 1 ? 'passaggio' : 'passaggi'} e ${t.pin.note} ${t.pin.note === 1 ? 'nota' : 'note'}.`;
}

/** Il corpo della pagina `/guida/mappe` senza chiave: l'albero dei luoghi della guida. */
export function IndiceLuoghi() {
  useDocumentTitle('Luoghi della guida');
  const attiva = usePartitaStore((s) => s.attiva);
  const gerarchia = useCarica(() => getGerarchiaMappe(attiva?.id), [attiva?.id]);
  const g = gerarchia.dati;
  return <div className="flex flex-col gap-4 lg:gap-3">
    <IntestazionePagina titolo="Luoghi della guida"
      sottotitolo={<>Città e Palazzi con le loro aree e planimetrie.{g && <span className="block text-[12px] text-text-muted" title={testoConteggiPin(g.totali.pin)}>{testoTotali(g.totali)}</span>}</>} />
    <PageState isLoading={gerarchia.caricamento} error={gerarchia.errore} onRetry={gerarchia.ricarica}>
      {g && <AlberoGerarchia radici={g.radici} totali={g.totali} onRicarica={gerarchia.ricarica} />}
    </PageState>
  </div>;
}
