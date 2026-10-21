import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { VideogiocoDto } from '../../types';
import { impostaProgressoVideogioco, impostaSessioneVideogioco } from '../../services/api';
import { usePartitaStore } from '../../stores/partitaStore';
import { useSuggerimentiStore } from '../../stores/suggerimentiStore';
import { notifica } from '../../stores/notificationStore';
import { avvisaDotiDaSegnare } from '../../utils/dotiDaSegnare';
import { bloccata } from '../../utils/letture';
import { ComandiProgressoLettura } from './ComandiProgressoLettura';

/** Gesti distinti, stesso blocco di scrittura per sessione e round. Il genitore usa la key partita:gioco. */
export function ComandiVideogioco({ gioco, partitaId, onSalvata }: {
  gioco: VideogiocoDto; partitaId: number | null; onSalvata: (g: VideogiocoDto) => void;
}) {
  const [occupato, setOccupato] = useState(false);
  const inVolo = useRef(false);
  const montato = useRef(true);
  useEffect(() => { montato.current = true; return () => { montato.current = false; }; }, []);
  const salva = async (scrivi: (id: number) => Promise<VideogiocoDto>) => {
    if (partitaId === null || inVolo.current) return;
    const id = partitaId;
    inVolo.current = true;
    setOccupato(true);
    try {
      const nuovo = await scrivi(id);
      useSuggerimentiStore.getState().invalida();
      avvisaDotiDaSegnare(nuovo.daSegnare, nuovo.nome);
      if (montato.current && usePartitaStore.getState().attiva?.id === id) onSalvata(nuovo);
    } catch (e) {
      if (montato.current && usePartitaStore.getState().attiva?.id === id) notifica('error', e instanceof Error ? e.message : 'Aggiornamento fallito.');
    } finally {
      inVolo.current = false;
      if (montato.current) setOccupato(false);
    }
  };
  return <>
    <ComandiProgressoLettura titolo={gioco.nome} tipo="videogioco" progresso={gioco.progresso} totale={gioco.totaleRound}
      partita={partitaId !== null} occupato={occupato} bloccaDuranteSalvataggio disponibilita={gioco.disponibilita}
      onCambia={(avanzamento) => void salva((id) => impostaProgressoVideogioco(id, gioco.chiave, avanzamento))} />
    {partitaId !== null && <label className="touch flex items-center gap-2 text-[13px]">
      <input type="checkbox" checked={gioco.sessioneDichiarata ?? false}
        disabled={occupato || (!gioco.sessioneDichiarata && bloccata(gioco.disponibilita))}
        onChange={(e) => { const dichiarata = e.target.checked; void salva((id) => impostaSessioneVideogioco(id, gioco.chiave, dichiarata)); }} />
      Ho giocato almeno una sessione
    </label>}
    <p className="m-0 text-xs text-text-secondary">La sessione si può segnare anche senza vincere un round. {gioco.progresso > 0 ? 'I round registrati attestano già una sessione: togliere la dichiarazione non li cancella.' : 'La dichiarazione non aggiunge round né Doti.'}</p>
    <Link to="/partita?scheda=progressi" className="touch inline-flex items-center self-start text-xs">Segna installazione del sistema e mansarda pulita in Progressi</Link>
  </>;
}
