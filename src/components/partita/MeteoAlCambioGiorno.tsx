// ============================================================
// MeteoAlCambioGiorno — cambiato il giorno della partita, la scelta del meteo del giorno nuovo
// ============================================================
//
// Richiesta dell'utente (2026-09-30): «fammi impostare il meteo quando faccio il cambio giorno». Montato una volta in
// `MainLayout`: guarda la data della partita attiva nello store e, quando cambia per la stessa partita (non al primo
// caricamento né passando a un'altra partita), apre la finestra col meteo del giorno nuovo, di giorno e di sera.
// Pre-compilato dalla guida, un tocco sull'icona lo segna (come nella scheda «Oggi»); le allerte del gioco sono scritte
// sotto la fascia. «Fatto» o Esc chiudono: chi non vuole segnarlo tiene quello della guida.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { Modal } from '../shared/Modal';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { MeteoGiornata } from './MeteoGiornata';
import { getMeteoGiorno, impostaMeteoGiorno } from '../../services/api';
import { usePartitaStore } from '../../stores/partitaStore';
import { useMeteoStore } from '../../stores/meteoStore';
import { useSuggerimentiStore } from '../../stores/suggerimentiStore';
import { notifica } from '../../stores/notificationStore';
import { dataGiocoConArticolo } from '../../utils/dateGioco';
import { NOME_FASCIA_METEO } from '../../utils/meteoFascia';
import type { FasciaGioco, MeteoGiornoDto } from '../../types';
import type { MeteoPartita } from '../../../shared/meteoPartita';

export function MeteoAlCambioGiorno() {
  const attiva = usePartitaStore((s) => s.attiva);
  const { richiesta, chiedi, chiudi, cambiato } = useMeteoStore();
  const ultima = useRef<{ id: number; data: string | null } | null>(null);
  // il meteo caricato porta la richiesta a cui appartiene: di un'altra richiesta non si mostra
  const [caricato, setCaricato] = useState<{ chiave: string; meteo: MeteoGiornoDto } | null>(null);
  const [occupato, setOccupato] = useState(false);
  const chiaveRichiesta = richiesta ? `${richiesta.partitaId}/${richiesta.data}` : null;
  const meteo = caricato && caricato.chiave === chiaveRichiesta ? caricato.meteo : null;

  // la data della partita attiva cambiata (stessa partita): si chiede il meteo del giorno nuovo
  const id = attiva?.id ?? null;
  const data = attiva?.dataGioco ?? null;
  useEffect(() => {
    const prima = ultima.current;
    ultima.current = id === null ? null : { id, data };
    if (id !== null && data && prima && prima.id === id && prima.data !== data) chiedi(id, data);
  }, [id, data, chiedi]);

  useEffect(() => {
    if (!richiesta || !chiaveRichiesta) return;
    let vivo = true;
    getMeteoGiorno(richiesta.partitaId, richiesta.data)
      .then((m) => { if (vivo) setCaricato({ chiave: chiaveRichiesta, meteo: m }); })
      .catch((err: unknown) => { if (vivo) { notifica('error', err instanceof Error ? err.message : 'Meteo non disponibile.'); chiudi(); } });
    return () => { vivo = false; };
  }, [richiesta, chiaveRichiesta, chiudi]);

  const cambia = async (fascia: FasciaGioco, valore: MeteoPartita | null) => {
    if (!richiesta) return;
    setOccupato(true);
    try {
      const esito = await impostaMeteoGiorno(richiesta.partitaId, richiesta.data, { [fascia]: valore });
      setCaricato({ chiave: `${richiesta.partitaId}/${richiesta.data}`, meteo: esito.meteo });
      // il meteo cambia che cosa è disponibile ora: store della partita (mappe, negozi), suggerimenti, scheda «Oggi»
      usePartitaStore.getState().aggiornaLocale(esito.partita);
      useSuggerimentiStore.getState().invalida();
      cambiato();
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
    } finally {
      setOccupato(false);
    }
  };

  if (!richiesta) return null;
  return (
    <Modal titolo={`Che tempo fa ${dataGiocoConArticolo(richiesta.data)}?`} aperta onChiudi={chiudi}
      azioni={<PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="accettata" dimensione={20} />} titolo="Fatto" onClick={chiudi} />}>
      {!meteo ? <p className="m-0 text-[13px] text-text-muted" aria-busy="true">Carico il meteo del giorno…</p> : (
        <div className="flex flex-col gap-3">
          <p className="m-0 text-[13px] text-text-secondary">
            {meteo.testoGuida ? `La guida dice «${meteo.testoGuida}»: vale quello finché non lo cambi.` : 'La guida non dice il meteo di questo giorno: segnalo tu.'} Un tocco sull'icona lo segna; ritoccarla torna alla guida.
          </p>
          {(['giorno', 'sera'] as const).map((fascia) => (
            <div key={fascia} className="flex flex-col gap-1">
              <span className="text-[12px] font-semibold text-text-muted">{NOME_FASCIA_METEO[fascia]}</span>
              <MeteoGiornata fascia={fascia} meteo={meteo[fascia]} occupato={occupato} onCambia={(f, v) => void cambia(f, v)} />
              {meteo[fascia].allerte.map((a) => (
                <span key={a.chiave} className="flex items-start gap-1.5 text-[12px] text-text-secondary">
                  <span className="text-warning shrink-0" aria-hidden="true"><IconaAzione chiave="allarme" dimensione={14} /></span>
                  <span><strong>{a.nome}</strong>{a.effetti.length > 0 ? `: ${a.effetti.join(' ')}` : ''}</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
