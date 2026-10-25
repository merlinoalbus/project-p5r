import { useState } from 'react';
import type { RegaloConfidenteDto } from '../../types';
import { ripristinaCostoPrecedenteRegalo } from '../../services/api/auditCatalogo';
import { Modal } from '../shared/Modal';
import { notifica } from '../../stores/notificationStore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

// L12 (passo 8): nel rilascio (sola lettura) il comando non esiste; la condizione è costante di build, `RipristinoCostoRegaloReale` esce dal bundle
export const RipristinoCostoRegalo: StrumentoDiModifica<typeof RipristinoCostoRegaloReale> = IN_RILASCIO ? NienteInRilascio : RipristinoCostoRegaloReale;
function RipristinoCostoRegaloReale({ confidente, regalo, onSalvato }: { confidente: string; regalo: RegaloConfidenteDto; onSalvato: () => void }) {
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
    <PulsanteVisivo compatto icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Ripristina costo precedente" onClick={() => setAperto(true)} />
    {aperto && <Modal aperta titolo="Ripristina costo precedente" onChiudi={() => { if (!occupato) setAperto(false); }} azioni={<>
      <button type="button" className="btn btn-secondary touch" disabled={occupato} onClick={() => setAperto(false)}>Annulla</button>
      <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="riapri" dimensione={22} />} titolo="Ripristina costo" disabled={occupato} onClick={() => void salva()} />
    </>}>
      <p className="m-0">{regalo.nome}: il costo indicato nella guida passa da «{copia.attuale ?? 'non indicato'}» a «{copia.precedente}».</p>
      <p className="m-0 mt-2 text-sm">La nota conserva il motivo della rettifica. Il prezzo di vendita resta quello del listino.</p>
    </Modal>}
  </>;
}
