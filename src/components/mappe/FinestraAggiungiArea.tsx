// ============================================================
// FinestraAggiungiArea — un'Area nuova nel quartiere: nome, prima planimetria, etichetta, punto sull'illustrazione (L2, R2-23)
// ============================================================
//
// Un invio solo: il server crea in una transazione l'Area, la sua prima planimetria con l'immagine e il pin di passaggio
// sull'illustrazione del quartiere; un errore non lascia niente di scritto. Il punto è obbligatorio se il quartiere ha
// un'illustrazione da toccare; senza, si salta («potrai segnarla poi», con «Segna sull'illustrazione»).
// ============================================================

import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { creaAreaMondo } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { useImmagineMappa } from '../../hooks/useImmagineMappa';
import { SceltaImmagine } from './SceltaImmagine';
import { erroreImmagine } from '../../utils/aree';
import { SceltaPunto } from './SceltaPunto';
import type { AreaDettaglioDto, QuartiereDettaglioDto } from '../../types';

interface Props {
  quartiere: QuartiereDettaglioDto;
  aperta: boolean;
  onChiudi: () => void;
  onCreata: (area: AreaDettaglioDto) => void;
}

/** La finestra: nome e immagine obbligatori, etichetta facoltativa, punto sull'illustrazione (obbligatorio se c'è l'illustrazione). */
export function FinestraAggiungiArea({ quartiere: q, aperta, onChiudi, onCreata }: Props) {
  const [nome, setNome] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [etichetta, setEtichetta] = useState('');
  const [punto, setPunto] = useState<{ x: number; y: number } | null>(null);
  const [occupato, setOccupato] = useState(false);
  const illustrazione = useImmagineMappa(q.illustrazione);
  const pronto = !!nome.trim() && !!file && !erroreImmagine(file) && (!illustrazione || !!punto) && !occupato;
  const salva = async () => {
    if (!file || !pronto) return;
    setOccupato(true);
    try {
      const area = await creaAreaMondo(q.chiave, file, { nome: nome.trim(), etichetta: etichetta.trim() || undefined, ...(punto ?? {}) });
      notifica('success', `${area.nome} aggiunta a ${q.nome}.`);
      onCreata(area);
      onChiudi();
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Area non aggiunta.');
    } finally {
      setOccupato(false);
    }
  };
  return (
    <Modal titolo={`Aggiungi un’area a ${q.nome}`} aperta={aperta} onChiudi={onChiudi} larga
      azioni={<>
        <button type="button" className="btn btn-secondary touch" onClick={onChiudi}>Annulla</button>
        <button type="button" className="btn btn-primary touch" disabled={!pronto} onClick={() => void salva()}>{occupato ? 'Salvataggio…' : 'Aggiungi area'}</button>
      </>}>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-[13px] font-semibold">Nome
          <input className="form-input touch" value={nome} maxLength={80} placeholder="es. Central Street" onChange={(e) => setNome(e.target.value)} />
        </label>
        <SceltaImmagine file={file} onCambia={setFile} etichetta="Immagine della prima planimetria" />
        <label className="flex flex-col gap-1 text-[13px] font-semibold">Etichetta della planimetria (facoltativa)
          <input className="form-input touch" value={etichetta} maxLength={80} placeholder="es. porzione occidentale" onChange={(e) => setEtichetta(e.target.value)} />
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">Dove sta in {q.nome}</span>
          {illustrazione
            ? <><SceltaPunto src={illustrazione} alt={`Illustrazione di ${q.nome}`} punto={punto} onPunto={setPunto} disabilitato={occupato} />
              <span className="text-[12px] text-text-muted">{punto ? `Il passaggio verso l’area sta al ${punto.x}% da sinistra e al ${punto.y}% dall’alto.` : 'Tocca l’illustrazione dove si entra nell’area: lì comparirà il suo pin.'}</span></>
            : <span className="text-[12px] text-text-muted">{q.nome} non ha un’illustrazione da toccare: potrai segnarla poi.</span>}
        </div>
      </div>
    </Modal>
  );
}
