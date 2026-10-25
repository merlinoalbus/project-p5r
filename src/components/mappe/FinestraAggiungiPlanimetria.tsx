// ============================================================
// FinestraAggiungiPlanimetria — una versione nuova di un'Area: immagine, etichetta, «diventa la predefinita» (L2, R2-24)
// ============================================================
//
// Una planimetria nel mondo si aggiunge sempre dentro un'Area (mai sciolta sotto il quartiere: il server lo rifiuta con
// `usa-aggiungi-area`). Il ruolo dell'immagine non si chiede: lo deduce il server dal posto nella gerarchia (L1).
// ============================================================

import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { aggiungiPlanimetriaArea } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { SceltaImmagine } from './SceltaImmagine';
import { erroreImmagine } from '../../utils/aree';
import type { AreaDettaglioDto } from '../../types';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

interface Props {
  area: AreaDettaglioDto;
  aperta: boolean;
  onChiudi: () => void;
  /** Dopo il salvataggio, con l'Area riletta dal server e la chiave della versione nuova (l'ultima). */
  onAggiunta: (area: AreaDettaglioDto, nuova: string | null) => void;
}

/** La finestra: immagine obbligatoria, etichetta facoltativa, casella «diventa la predefinita». */
export function FinestraAggiungiPlanimetria({ area, aperta, onChiudi, onAggiunta }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [etichetta, setEtichetta] = useState('');
  const [predefinita, setPredefinita] = useState(false);
  const [occupato, setOccupato] = useState(false);
  const pronto = !!file && !erroreImmagine(file) && !occupato;
  const chiudi = () => { setFile(null); setEtichetta(''); setPredefinita(false); onChiudi(); };
  const salva = async () => {
    if (!file || !pronto) return;
    setOccupato(true);
    try {
      // il contenitore com'è (quartiere, città o Palazzo, L3): la rotta prende il segmento giusto
      const aggiornata = await aggiungiPlanimetriaArea(area.contenitore, area.slug, file, { etichetta: etichetta.trim() || undefined, predefinita });
      notifica('success', `Planimetria aggiunta a ${area.nome}.`);
      onAggiunta(aggiornata, aggiornata.planimetrie.at(-1)?.chiave ?? null);
      chiudi();
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Planimetria non aggiunta.');
    } finally {
      setOccupato(false);
    }
  };
  return (
    <Modal titolo={`Aggiungi planimetria a ${area.nome}`} aperta={aperta} onChiudi={chiudi}
      azioni={<>
        <button type="button" className="btn btn-secondary touch" onClick={chiudi}>Annulla</button>
        <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="piu" dimensione={22} />} titolo={occupato ? 'Salvataggio…' : 'Aggiungi'} disabled={!pronto} onClick={() => void salva()} />
      </>}>
      <div className="flex flex-col gap-3">
        <SceltaImmagine file={file} onCambia={setFile} />
        <label className="flex flex-col gap-1 testo-13 font-semibold">Etichetta (facoltativa)
          <input className="form-input touch" value={etichetta} maxLength={80} placeholder="es. planimetria completa" onChange={(e) => setEtichetta(e.target.value)} />
        </label>
        <label className="flex items-center gap-2 testo-13 touch">
          <input type="checkbox" className="h-5 w-5" checked={predefinita} onChange={(e) => setPredefinita(e.target.checked)} />
          Diventa la planimetria che {area.nome} mostra aprendola
        </label>
      </div>
    </Modal>
  );
}
