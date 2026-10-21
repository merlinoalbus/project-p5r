import { useMemo, useState } from 'react';
import type { CatalogoOggettoDto, RegaloConfidenteDto } from '../../types';
import { impostaRegaloOggettoFatto } from '../../services/api/partite';
import { Modal } from '../shared/Modal';
import { SceltaCatalogoOggetto } from './SceltaCatalogoOggetto';

interface Props {
  partita: number; confidente: string; nomeConfidente: string; regali: RegaloConfidenteDto[];
  consegnati: readonly string[]; onChiudi: () => void; onSalvato: () => void;
}

/** Cerca nel catalogo soltanto fra i regali graditi già collegati a questo Confidente. */
export function SceltaRegalo({ partita, confidente, nomeConfidente, regali, consegnati, onChiudi, onSalvato }: Props) {
  const [oggetto, setOggetto] = useState<CatalogoOggettoDto | null>(null);
  const [occupato, setOccupato] = useState(false);
  const [errore, setErrore] = useState('');
  const ammessi = useMemo(() => [...new Set(regali.flatMap((r) => r.catalogo ? [r.catalogo.chiave] : []))], [regali]);
  const giaConsegnato = oggetto !== null && consegnati.includes(oggetto.chiave);
  const salva = async () => {
    if (!oggetto || occupato || giaConsegnato || !ammessi.includes(oggetto.chiave)) return;
    setOccupato(true); setErrore('');
    try {
      await impostaRegaloOggettoFatto(partita, confidente, oggetto.chiave, true);
      onSalvato();
    } catch (e) { setErrore(e instanceof Error ? e.message : 'Consegna non registrata.'); }
    finally { setOccupato(false); }
  };
  return <Modal aperta titolo={`Regala a ${nomeConfidente}`} onChiudi={() => { if (!occupato) onChiudi(); }}
    azioni={<><button type="button" className="btn btn-secondary touch" disabled={occupato} onClick={onChiudi}>Annulla</button>
      <button type="button" className="btn btn-primary touch" disabled={occupato || !oggetto || giaConsegnato || !ammessi.includes(oggetto.chiave)} onClick={() => void salva()}>{occupato ? 'Registrazione…' : 'Regala'}</button></>}>
    <div className="flex min-w-0 flex-col gap-3">
      <SceltaCatalogoOggetto valore={oggetto?.chiave ?? ''} onScegli={setOggetto} includi={ammessi} disabilitato={occupato} etichetta="Regalo gradito" />
      <p className="m-0 text-[13px] text-text-secondary">Registra soltanto la consegna: non cambia i punti del Confidente e non segna l’acquisto.</p>
      {giaConsegnato && <p role="status" className="m-0 text-[13px]">Questo oggetto risulta già consegnato. Puoi togliere la spunta dall’elenco dei regali.</p>}
      {errore && <p role="alert" className="m-0 text-[13px]">{errore}</p>}
    </div>
  </Modal>;
}
