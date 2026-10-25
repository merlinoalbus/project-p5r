// ============================================================
// RicevuteVoce — le ricevute degli effetti della spunta di una voce del Diario, dietro un pulsantino (richiesta dell'utente del 2026-10-25)
// ============================================================
//
// «Ricevute degli effetti della spunta (magari andrebbero visualizzati con un pulsantino e non restando la sotto sempre visibili e
// apribile... e occupando spazio e creando confusione nel testo...». Prima erano un `<details>` sempre presente sotto il testo della voce;
// ora sono un pulsante a sola icona (44 px, nome accessibile e suggerimento col numero delle ricevute) nella colonna dei comandi della
// voce, accanto al menu, e l'elenco si apre nella finestra dell'app (`Modal`: foglio dal basso sul telefono, fuoco dentro, Esc o X per
// chiudere). Senza ricevute il pulsante non c'è. Il contenuto è quello di prima: tipo, data e ora, attiva o annullata. Solo lettura.
//
// Sul tocco non c'è il suggerimento al passaggio, quindi il pulsante si riconosce da solo: l'icona è uno scontrino (non gli appunti, che
// nell'app sono i piani e le domande) e il numero delle ricevute sta in un distintivo sull'icona. Il nome accessibile porta il testo della
// voce, come il menu «⋯» accanto (`PulsanteMenuVoce`), così in un giorno con più voci i pulsanti non si chiamano tutti uguali; il
// suggerimento resta corto. La finestra dice di quale voce sono le ricevute, perché sul telefono la copre.
// ============================================================

import { useState } from 'react';
import type { ReceiptEffettoVoceDto } from '../../../shared/effettiVoce';
import { Modal } from '../shared/Modal';
import { IconaAzione } from '../shared/IconaAzione';

/** Il tipo della ricevuta, a parole (le stesse dell'elenco di prima). */
const tipoRicevuta = (tipo: ReceiptEffettoVoceDto['tipo']): string =>
  tipo === 'acquisto' ? 'Consumazione' : tipo === 'pesca' ? 'Sessione di pesca' : tipo === 'contesto' ? 'Incontro e contesto della spunta'
    : tipo === 'dote' ? 'Dote' : tipo === 'lettura' ? 'Lettura o gioco' : 'Turno';

/** Il pulsante delle ricevute della voce (`voce`: il suo testo) e la loro finestra; niente senza ricevute. */
export function RicevuteVoce({ ricevute, voce }: { ricevute: readonly ReceiptEffettoVoceDto[] | undefined; voce: string }) {
  const [aperta, setAperta] = useState(false);
  if (!ricevute?.length) return null;
  const n = ricevute.length;
  const breve = `Ricevute della spunta (${n})`;
  return (
    <>
      <button type="button" className="btn btn-sm btn-ghost touch shrink-0" aria-haspopup="dialog" aria-label={`Ricevute degli effetti della spunta (${n}): ${voce.slice(0, 60)}`} title={breve} onClick={() => setAperta(true)}>
        <IconaAzione chiave="ricevute" dimensione={20} />
        <span className="conteggio-pulsante" aria-hidden="true">{n}</span>
      </button>
      {aperta && (
        <Modal titolo={`Ricevute della spunta: ${voce}`} aperta onChiudi={() => setAperta(false)}>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0 testo-13">
            {ricevute.map((r) => (
              <li key={r.id} className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                <span className="min-w-0 break-words">{tipoRicevuta(r.tipo)}</span>
                <span className="text-text-secondary tabular-nums">{new Date(r.applicatoIl).toLocaleString('it-IT')}</span>
                <span className={r.annullatoIl ? 'text-text-muted' : 'text-text-secondary'}>{r.annullatoIl ? 'annullata' : 'attiva'}</span>
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </>
  );
}
