// ============================================================
// TrasferisciVoci — la finestra che copia o sposta le voci scelte del diario in un altro giorno e fascia (2026-10-12)
// ============================================================
//
// Richiesta dell'utente: «vorrei anche poter copiare elementi del diario (giorno/notte testi e riferimenti e poterli inserire in un
// altro giorno o nella parte giorno o nella parte notte a scelta)». Scelte: «Una o più insieme» e «Sì, anche spostare». Si sceglie
// il giorno (mese e giorno, come nella guida giorno per giorno) e la fascia; le voci arrivano in fondo, nel loro ordine. È canone:
// la copia o lo spostamento valgono per tutte le partite.
// ============================================================

import { useMemo, useState } from 'react';
import { getPercorsoIndice, trasferisciVociGiornata } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { notificaOperazioneAnnullabile, rimettiFuoco } from '../../hooks/useAppuntiDiario';
import { dataGiocoTesto, meseGioco } from '../../utils/dateGioco';
import { Modal } from '../shared/Modal';
import { PageState } from '../shared/PageState';
import { Selettore } from '../shared/Selettore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import type { AzionePercorsoDto, FasciaGioco, VociTrasferiteDto } from '../../types';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

interface Props {
  /** «copia» o «sposta» all'apertura; dal 2026-10-26 si cambia nella finestra («Altro giorno…» della barra delle voci selezionate). */
  modo: 'copia' | 'sposta';
  /** Le voci scelte. */
  voci: AzionePercorsoDto[];
  /** Il giorno da cui partono: la finestra parte da lì. */
  giorno: string;
  partitaId: number | null;
  onChiudi: () => void;
  /** Fatto: chi apre la finestra rilegge la giornata ed esce dalla scelta. */
  onFatto: (esito: VociTrasferiteDto) => void | Promise<void>;
  /** Dopo «Annulla» nella notifica: la giornata si rilegge. */
  onRicarica: () => void | Promise<void>;
  /** Dove va il fuoco dopo il gesto e dopo il suo annullo (la barra che ha aperto la finestra sparisce con la selezione): un posto del giorno. */
  fuoco?: (attendi?: boolean) => HTMLElement | null;
}

/** «1 voce», «3 voci». */
const quanteVoci = (n: number) => (n === 1 ? '1 voce' : `${n} voci`);
/** I tasti che, in un gruppo di due opzioni, passano all'altra. */
const FRECCE = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
/** Nel gruppo di opzioni il fuoco segue la scelta fatta con le frecce (schema WAI-ARIA dei gruppi di opzioni): il lettore di schermo
 *  annuncia la nuova opzione, e il Tab successivo non riparte da quella appena spenta. */
const fuocoSullOpzione = (da: HTMLElement, opzione: string) => da.parentElement?.querySelector<HTMLButtonElement>(`[data-opzione="${opzione}"]`)?.focus();

/** La finestra: giorno (mese e giorno), fascia, il riepilogo e il comando. */
// L12 (passo 8): nel rilascio (sola lettura, voci del diario comprese) il trasferimento non esiste; la condizione è costante di build, `TrasferisciVociReale` esce dal bundle
export const TrasferisciVoci: StrumentoDiModifica<typeof TrasferisciVociReale> = IN_RILASCIO ? NienteInRilascio : TrasferisciVociReale;
function TrasferisciVociReale({ modo: modoIniziale, voci, giorno, partitaId, onChiudi, onFatto, onRicarica, fuoco }: Props) {
  const [modo, setModo] = useState(modoIniziale);
  const indice = useCarica(() => getPercorsoIndice(partitaId ?? undefined), [partitaId]);
  const [destinazione, setDestinazione] = useState(giorno);
  const [fascia, setFascia] = useState<FasciaGioco>(voci.every((v) => v.fascia === 'sera') ? 'sera' : 'giorno');
  const [occupato, setOccupato] = useState(false);
  const mesi = useMemo(() => [...new Set((indice.dati?.giorni ?? []).map((x) => x.giorno.slice(0, 2)))], [indice.dati]);
  const giorniDelMese = useMemo(() => (indice.dati?.giorni ?? []).filter((x) => x.giorno.slice(0, 2) === destinazione.slice(0, 2)), [indice.dati, destinazione]);
  const verbo = modo === 'copia' ? 'Copia' : 'Sposta';
  const diGiorno = voci.filter((v) => v.fascia === 'giorno').length;
  const fasciaTesto = fascia === 'giorno' ? 'di giorno' : 'di sera';
  /** Copia o sposta, notifica com'è andata e chiude; un errore resta in notifica e la finestra resta aperta. */
  const esegui = async () => {
    setOccupato(true);
    try {
      const esito = await trasferisciVociGiornata({ uid: voci.map((v) => v.uid), giorno: destinazione, fascia, modo }, partitaId ?? undefined);
      notificaOperazioneAnnullabile(`${quanteVoci(esito.uid.length)} ${modo === 'copia' ? (esito.uid.length === 1 ? 'copiata' : 'copiate') : (esito.uid.length === 1 ? 'spostata' : 'spostate')} nel ${dataGiocoTesto(destinazione)}, ${fasciaTesto}, in fondo: per tutte le partite.`, esito.operazioneId, onRicarica,
        `${modo === 'copia' ? 'la copia' : 'lo spostamento'} di ${quanteVoci(esito.uid.length)}`, fuoco);
      await onFatto(esito);
      onChiudi();
      // chiusa la finestra, il fuoco tornerebbe al pulsante che l'ha aperta, sparito con la selezione: va nel giorno
      if (fuoco) rimettiFuoco(fuoco);
    } catch (err) { notifica('error', err instanceof Error ? err.message : `${verbo} non riuscita.`); }
    finally { setOccupato(false); }
  };
  return (
    <Modal titolo={`${verbo} ${quanteVoci(voci.length)} in un altro giorno`} aperta onChiudi={onChiudi}>
      <PageState isLoading={indice.caricamento && !indice.dati} error={indice.errore} onRetry={() => void indice.ricarica()}>
        <div className="flex flex-col gap-3 testo-13">
          <p className="m-0 text-text-secondary">
            {quanteVoci(voci.length)} {diGiorno > 0 && diGiorno < voci.length ? `(${diGiorno} di giorno, ${voci.length - diGiorno} di sera)` : diGiorno === voci.length ? 'di giorno' : 'di sera'} del {dataGiocoTesto(giorno)}.{' '}
            {modo === 'copia' ? 'Le copie nascono senza spunte; le voci di partenza restano.' : 'Le voci lasciano questo giorno e portano con sé le spunte delle partite.'}
          </p>
          {/* «Copia» / «Sposta» si dicono da sé: nessuna etichetta a schermo davanti (il gruppo ha il suo nome per il lettore di schermo) */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex overflow-hidden rounded-md border border-border" role="radiogroup" aria-label="Copia o sposta">
              {(['copia', 'sposta'] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={modo === m} tabIndex={modo === m ? 0 : -1} data-opzione={m}
                  className={`touch min-w-20 border-l border-border px-3 testo-13 first:border-l-0 ${modo === m ? 'bg-primary/25 font-semibold text-text' : 'text-text-muted hover:text-text'}`}
                  onClick={() => setModo(m)} onKeyDown={(e) => { if (FRECCE.has(e.key)) { e.preventDefault(); const altro = modo === 'copia' ? 'sposta' : 'copia'; setModo(altro); fuocoSullOpzione(e.currentTarget, altro); } }}>
                  {m === 'copia' ? 'Copia' : 'Sposta'}
                </button>
              ))}
            </span>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            {/* in linea: dentro una finestra la tendina sovrapposta resterebbe tagliata dal corpo scorrevole */}
            <Selettore className="selettore--in-linea" compatto ricerca="mai" etichetta="Mese" valore={destinazione.slice(0, 2)} opzioni={mesi.map((m) => ({ chiave: m, nome: meseGioco(`${m}-01`) }))}
              onCambia={(k) => { const primo = indice.dati?.giorni.find((x) => x.giorno.slice(0, 2) === k); if (primo) setDestinazione(primo.giorno); }} />
            <Selettore className="selettore--in-linea" compatto etichetta="Giorno" valore={destinazione} opzioni={giorniDelMese.map((x) => ({ chiave: x.giorno, nome: `${dataGiocoTesto(x.giorno)} (${x.giornoSettimana})`, dettaglio: x.giorno === giorno ? 'questo' : undefined }))}
              onCambia={setDestinazione} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="testo-12 text-text-muted">Fascia</span>
            <span className="inline-flex overflow-hidden rounded-md border border-border" role="radiogroup" aria-label="Fascia di destinazione">
              {(['giorno', 'sera'] as const).map((f) => (
                <button key={f} type="button" role="radio" aria-checked={fascia === f} tabIndex={fascia === f ? 0 : -1} data-opzione={f}
                  className={`touch min-w-20 border-l border-border px-3 testo-13 first:border-l-0 ${fascia === f ? 'bg-primary/25 font-semibold text-text' : 'text-text-muted hover:text-text'}`}
                  onClick={() => setFascia(f)} onKeyDown={(e) => { if (FRECCE.has(e.key)) { e.preventDefault(); const altra = fascia === 'giorno' ? 'sera' : 'giorno'; setFascia(altra); fuocoSullOpzione(e.currentTarget, altra); } }}>
                  {f === 'giorno' ? 'Di giorno' : 'Di sera'}
                </button>
              ))}
            </span>
          </div>
          <p className="m-0 testo-12 text-text-muted">Arrivano in fondo alla fascia, nell’ordine che hanno qui. Vale per tutte le partite: la giornata è la stessa per tutte.</p>
          <div className="flex flex-wrap gap-1.5">
            <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave={modo === 'copia' ? 'copia' : 'incolla'} dimensione={20} />} titolo={`${verbo} nel ${dataGiocoTesto(destinazione)}, ${fasciaTesto}`}
              disabled={occupato || !indice.dati} onClick={() => void esegui()} />
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" disabled={occupato} onClick={onChiudi} />
          </div>
        </div>
      </PageState>
    </Modal>
  );
}
