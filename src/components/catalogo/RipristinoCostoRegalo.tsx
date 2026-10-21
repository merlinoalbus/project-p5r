import { useState } from 'react';
import type { RegaloConfidenteDto } from '../../types';
import { ripristinaCostoPrecedenteRegalo } from '../../services/api/auditCatalogo';
import { Modal } from '../shared/Modal';
import { notifica } from '../../stores/notificationStore';

export function RipristinoCostoRegalo({ confidente, regalo, onSalvato }: { confidente: string; regalo: RegaloConfidenteDto; onSalvato: () => void }) {
  const [aperto, setAperto] = useState(false);
  const [occupato, setOccupato] = useState(false);
  const copia = regalo.ripristinoCosto;
  if (!copia) return null;
  const salva = async () => {
    setOccupato(true);
    try {
      await ripristinaCostoPrecedenteRegalo(confidente, copia.ordine, copia.attuale);
      setAperto(false); onSalvato(); notifica('success', 'Costo precedente del regalo ripristinato.');
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Ripristino fallito.'); }
    finally { setOccupato(false); }
  };
  return <>
    <button type="button" className="btn btn-secondary btn-sm touch" onClick={() => setAperto(true)}>Ripristina costo precedente</button>
    {aperto && <Modal aperta titolo="Ripristina costo precedente" onChiudi={() => { if (!occupato) setAperto(false); }} azioni={<>
      <button type="button" className="btn btn-secondary touch" disabled={occupato} onClick={() => setAperto(false)}>Annulla</button>
      <button type="button" className="btn btn-primary touch" disabled={occupato} onClick={() => void salva()}>Ripristina costo</button>
    </>}>
      <p className="m-0">{regalo.nome}: il costo indicato nella guida passa da «{copia.attuale ?? 'non indicato'}» a «{copia.precedente}».</p>
      <p className="m-0 mt-2 text-sm">La nota conserva il motivo della rettifica. Il prezzo di vendita resta quello del listino.</p>
    </Modal>}
  </>;
}
