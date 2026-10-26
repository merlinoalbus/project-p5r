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
//
// 2026-10-26 (revisione UX): il titolo della finestra conteneva tutto il testo della voce (fino a 579 caratteri) e sul telefono
// l'intestazione superava il 30% dello schermo. Ora il titolo è «Ricevute della spunta» con i primi 60 caratteri della voce («…» se
// troncata); il testo intero, solo quando il titolo lo tronca, è il primo paragrafo del corpo, che scorre, e descrive la finestra
// per i lettori di schermo (`aria-describedby`).
//
// L13 (decisione 19): nella stessa finestra, sotto le ricevute, gli effetti di stato della voce (articoli, Persona, trofei, eventi…) con il loro
// stato nella partita: «segnato nella partita», «era già vero», «da approvare» (nell'elenco della partita), «non applicato». Il titolo dice
// «Effetti di stato nella partita», non «segnati dalla spunta», perché non tutti lo sono. Il server li manda solo se almeno uno non è «era già
// vero» (con tutti già veri non c'è niente da dire). Il numero sul pulsante conta ricevute ed effetti di stato insieme; senza né le une né gli
// altri il pulsante non c'è.
// ============================================================

import { useId, useState } from 'react';
import type { ReceiptEffettoVoceDto, StatoEffettoDiStatoDto } from '../../../shared/effettiVoce';
import { Modal } from '../shared/Modal';
import { IconaAzione } from '../shared/IconaAzione';

/** Il tipo della ricevuta, a parole (le stesse dell'elenco di prima). */
const tipoRicevuta = (tipo: ReceiptEffettoVoceDto['tipo']): string =>
  tipo === 'acquisto' ? 'Consumazione' : tipo === 'pesca' ? 'Sessione di pesca' : tipo === 'contesto' ? 'Incontro e contesto della spunta'
    : tipo === 'dote' ? 'Dote' : tipo === 'lettura' ? 'Lettura o gioco' : 'Turno';

/** Quanti caratteri della voce entrano nel titolo della finestra e nel nome del pulsante. */
const CARATTERI_DELLA_VOCE = 60;

/** I primi `CARATTERI_DELLA_VOCE` caratteri della voce (per punti di codice, così una lettera composta non si spezza), con «…» se
 *  il testo è più lungo; `troncata` dice se il testo intero va mostrato altrove. */
function inizioDellaVoce(voce: string): { testo: string; troncata: boolean } {
  const pulito = voce.replace(/\s+/g, ' ').trim();
  const caratteri = Array.from(pulito);
  if (caratteri.length <= CARATTERI_DELLA_VOCE) return { testo: pulito, troncata: false };
  return { testo: `${caratteri.slice(0, CARATTERI_DELLA_VOCE).join('').trimEnd()}…`, troncata: true };
}

/** Il nome dell'elenco degli effetti di stato: segnati, già veri, da approvare o non applicati, nella partita. */
const STATI_NELLA_PARTITA = 'Effetti di stato nella partita';

/** Lo stato di un effetto di stato nella partita, a parole. */
const STATO_EFFETTO: Record<StatoEffettoDiStatoDto['esito'], { testo: string; classe: string }> = {
  segnato: { testo: 'segnato nella partita', classe: 'text-success' },
  'gia-presente': { testo: 'era già vero', classe: 'text-text-secondary' },
  'da-approvare': { testo: 'da approvare nella partita', classe: 'text-warning' },
  'non-applicato': { testo: 'non applicato', classe: 'text-text-muted' },
};

/** Il pulsante delle ricevute della voce (`voce`: il suo testo) e la loro finestra; niente senza ricevute né effetti di stato. */
export function RicevuteVoce({ ricevute = [], stati = [], voce }: { ricevute: readonly ReceiptEffettoVoceDto[] | undefined; stati?: readonly StatoEffettoDiStatoDto[] | undefined; voce: string }) {
  const [aperta, setAperta] = useState(false);
  const idVoce = useId();
  if (!ricevute.length && !stati.length) return null;
  const n = ricevute.length + stati.length;
  // con soli stati (nessuna ricevuta) la finestra si chiama come ciò che mostra
  const nome = ricevute.length ? 'Ricevute della spunta' : STATI_NELLA_PARTITA;
  const breve = `${nome} (${n})`;
  const inizio = inizioDellaVoce(voce);
  return (
    <>
      <button type="button" className="btn btn-sm btn-ghost touch shrink-0" aria-haspopup="dialog" aria-label={`${ricevute.length ? 'Ricevute degli effetti della spunta' : nome} (${n}): ${inizio.testo}`} title={breve} onClick={() => setAperta(true)}>
        <IconaAzione chiave="ricevute" dimensione={20} />
        <span className="conteggio-pulsante" aria-hidden="true">{n}</span>
      </button>
      {aperta && (
        <Modal titolo={inizio.testo ? `${nome}: ${inizio.testo}` : nome} aperta onChiudi={() => setAperta(false)}
          idDescrizione={inizio.troncata ? idVoce : undefined}>
          {inizio.troncata && <p id={idVoce} className="m-0 mb-3 testo-13 text-text-secondary break-words">{voce}</p>}
          {!!ricevute.length && <ul className="m-0 flex list-none flex-col gap-1.5 p-0 testo-13">
            {ricevute.map((r) => (
              <li key={r.id} className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                <span className="min-w-0 break-words">{tipoRicevuta(r.tipo)}</span>
                <span className="text-text-secondary tabular-nums">{new Date(r.applicatoIl).toLocaleString('it-IT')}</span>
                <span className={r.annullatoIl ? 'text-text-muted' : 'text-text-secondary'}>{r.annullatoIl ? 'annullata' : 'attiva'}</span>
              </li>
            ))}
          </ul>}
          {!!stati.length && <>
            {/* l'intestazione serve solo a separare dalle ricevute: senza ricevute lo dice già il titolo */}
            {!!ricevute.length && <h3 className="m-0 mb-1.5 mt-3 testo-13 font-semibold">{STATI_NELLA_PARTITA}</h3>}
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0 testo-13" aria-label={STATI_NELLA_PARTITA}>
              {stati.map((s) => (
                <li key={s.effettoUid} className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                  <span className="min-w-0 break-words text-pretty">{s.testo}</span>
                  <span className={STATO_EFFETTO[s.esito].classe}>{STATO_EFFETTO[s.esito].testo}</span>
                </li>
              ))}
            </ul>
          </>}
        </Modal>
      )}
    </>
  );
}
