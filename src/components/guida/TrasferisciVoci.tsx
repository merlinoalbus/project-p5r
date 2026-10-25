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
import { dataGiocoTesto, meseGioco } from '../../utils/dateGioco';
import { Modal } from '../shared/Modal';
import { PageState } from '../shared/PageState';
import { Selettore } from '../shared/Selettore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import type { AzionePercorsoDto, FasciaGioco, VociTrasferiteDto } from '../../types';

interface Props {
  /** «copia» o «sposta». */
  modo: 'copia' | 'sposta';
  /** Le voci scelte. */
  voci: AzionePercorsoDto[];
  /** Il giorno da cui partono: la finestra parte da lì. */
  giorno: string;
  partitaId: number | null;
  onChiudi: () => void;
  /** Fatto: chi apre la finestra rilegge la giornata ed esce dalla scelta. */
  onFatto: (esito: VociTrasferiteDto) => void | Promise<void>;
}

/** «1 voce», «3 voci». */
const quanteVoci = (n: number) => (n === 1 ? '1 voce' : `${n} voci`);

/** La finestra: giorno (mese e giorno), fascia, il riepilogo e il comando. */
export function TrasferisciVoci({ modo, voci, giorno, partitaId, onChiudi, onFatto }: Props) {
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
      notifica('success', `${quanteVoci(esito.uid.length)} ${modo === 'copia' ? (esito.uid.length === 1 ? 'copiata' : 'copiate') : (esito.uid.length === 1 ? 'spostata' : 'spostate')} nel ${dataGiocoTesto(destinazione)}, ${fasciaTesto}, in fondo: per tutte le partite.`);
      await onFatto(esito);
      onChiudi();
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
                <button key={f} type="button" role="radio" aria-checked={fascia === f} tabIndex={fascia === f ? 0 : -1}
                  className={`touch min-w-20 border-l border-border px-3 testo-13 first:border-l-0 ${fascia === f ? 'bg-primary/25 font-semibold text-text' : 'text-text-muted hover:text-text'}`}
                  onClick={() => setFascia(f)} onKeyDown={(e) => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) { e.preventDefault(); setFascia(fascia === 'giorno' ? 'sera' : 'giorno'); } }}>
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
