// ============================================================
// RicevuteVoce — ciò che la spunta di una voce del Diario ha applicato, dietro un pulsantino (richieste dell'utente del 2026-10-25 e 26)
// ============================================================
//
// 2026-10-25: «Ricevute degli effetti della spunta (magari andrebbero visualizzati con un pulsantino e non restando la sotto sempre
// visibili…)». Un pulsante a sola icona (44 px, nome accessibile e suggerimento col numero) nella colonna dei comandi della voce, accanto al
// menu; l'elenco si apre nella finestra dell'app (`Modal`: foglio dal basso sul telefono, fuoco dentro, Esc o X per chiudere). Solo lettura.
//
// 2026-10-26: la finestra mostrava «Incontro e contesto della spunta26/10/2026, 02:49:09annullata» e l'utente: «a che serve? … mi serve
// sapere quando è stata applicata e cosa è stato applicato per annullare in caso di decheck della casella. ma una volta annullata
// l'informazione non mi è più utile... perchè salvarla?». Le ricevute restano nel database (il server le usa per annullare e ripristinare),
// ma qui si vede solo `applicatoDallaSpunta`: ciò che togliendo la spunta si annulla davvero, in parole e col momento (Persona registrata,
// trofeo, sblocco, oggetto, turni, incontro, punti del Confidente, consumazione, pesca, Fortuna, Doti e yen confermati con «Applica», yen
// mossi con l'importo reale). Ciò che togliendo la spunta resta non c'è: le letture, le proposte ancora aperte o scartate, gli stati che
// un'altra voce spuntata tiene comunque, le consumazioni e le pesche tenute anche da un'altra fonte, le ricevute illeggibili.
// Le annullate, quelle tecniche e quelle che non hanno dato niente no; il pulsante c'è solo se c'è qualcosa, e il numero conta solo quello. Ogni riga ha la frase sopra e
// la data e l'ora sotto, separate (prima uscivano attaccate); lo stato «attiva» non si scrive più: sono tutte in vigore.
//
// Sul tocco non c'è il suggerimento al passaggio, quindi il pulsante si riconosce da solo: l'icona è uno scontrino e il numero sta in un
// distintivo. Il nome accessibile porta il testo della voce, come il menu «⋯» accanto (`PulsanteMenuVoce`). Il titolo della finestra è
// «Applicato dalla spunta» (prima «Ricevute della spunta»: il contenuto ora è ciò che la spunta ha applicato) con i primi 60 caratteri della
// voce (intestazione ≤ 30% sul telefono); il testo intero, solo se troncato, è il primo paragrafo del corpo e descrive la finestra per i
// lettori di schermo (`aria-describedby`). L'elenco ha `role="list"`: con `list-none` Safari lo toglierebbe ai lettori di schermo.
// ============================================================

import { useId, useState } from 'react';
import type { ApplicatoDallaSpuntaDto } from '../../types';
import { Modal } from '../shared/Modal';
import { IconaAzione } from '../shared/IconaAzione';

/** Quanti caratteri della voce entrano nel titolo della finestra e nel nome del pulsante. */
const CARATTERI_DELLA_VOCE = 60;

/** Il nome della finestra e del pulsante: dice che cosa c'è dentro (ciò che la spunta ha applicato), non come lo conserva il server. */
const TITOLO = 'Applicato dalla spunta';

/** I primi `CARATTERI_DELLA_VOCE` caratteri della voce (per punti di codice, così una lettera composta non si spezza), con «…» se
 *  il testo è più lungo; `troncata` dice se il testo intero va mostrato altrove. */
function inizioDellaVoce(voce: string): { testo: string; troncata: boolean } {
  const pulito = voce.replace(/\s+/g, ' ').trim();
  const caratteri = Array.from(pulito);
  if (caratteri.length <= CARATTERI_DELLA_VOCE) return { testo: pulito, troncata: false };
  return { testo: `${caratteri.slice(0, CARATTERI_DELLA_VOCE).join('').trimEnd()}…`, troncata: true };
}

/** «26/10/2026, 02:49»: giorno e ora, senza i secondi (non dicono niente a chi gioca). */
const MOMENTO = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
function momento(iso: string): string | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : MOMENTO.format(d);
}

/** Il pulsante di ciò che la spunta della voce (`voce`: il suo testo) ha applicato, e la sua finestra; niente se non ha applicato niente. */
export function RicevuteVoce({ applicato, voce }: { applicato: readonly ApplicatoDallaSpuntaDto[] | undefined; voce: string }) {
  const [aperta, setAperta] = useState(false);
  const idVoce = useId();
  if (!applicato?.length) return null;
  const n = applicato.length;
  const breve = `${TITOLO} (${n})`;
  const inizio = inizioDellaVoce(voce);
  return (
    <>
      <button type="button" className="btn btn-sm btn-ghost touch shrink-0" aria-haspopup="dialog" aria-label={`${breve}: ${inizio.testo}`} title={breve} onClick={() => setAperta(true)}>
        <IconaAzione chiave="ricevute" dimensione={20} />
        <span className="conteggio-pulsante tabular-nums" aria-hidden="true">{n}</span>
      </button>
      {aperta && (
        <Modal titolo={inizio.testo ? `${TITOLO}: ${inizio.testo}` : TITOLO} aperta onChiudi={() => setAperta(false)}
          idDescrizione={inizio.troncata ? idVoce : undefined}>
          {inizio.troncata && <p id={idVoce} className="m-0 mb-3 testo-13 text-text-secondary break-words">{voce}</p>}
          {/* role="list": con `list-none` Safari e VoiceOver (iPad) non annuncerebbero più l'elenco né il numero delle righe */}
          <ul role="list" className="m-0 flex list-none flex-col divide-y divide-border-light p-0 testo-13">
            {applicato.map((x) => {
              const quando = momento(x.applicatoIl);
              return (
                <li key={x.id} className="flex min-w-0 flex-col gap-0.5 py-2 first:pt-0 last:pb-0">
                  <span className="min-w-0 break-words text-pretty">{x.testo}</span>
                  {quando && <time dateTime={x.applicatoIl} className="testo-12 text-text-secondary tabular-nums">{quando}</time>}
                </li>
              );
            })}
          </ul>
        </Modal>
      )}
    </>
  );
}
