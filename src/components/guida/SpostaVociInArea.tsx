// ============================================================
// SpostaVociInArea — la finestra che sposta le voci scelte della guida di un'area in un'altra area dello stesso Palazzo (2026-10-14)
// ============================================================
//
// Richiesta dell'utente: «come faccio a spostare più voci del palazzo insieme?». Si sceglie l'area d'arrivo fra le altre del
// Palazzo, in ordine di guida; le voci ci arrivano in fondo, nel loro ordine, coi loro passi e le schede della guida senza mappa.
// La chiave di ogni voce resta: stati delle partite e pin non cambiano. È canone: vale per tutte le partite.
// ============================================================

import { useState } from 'react';
import { spostaPuntiInArea } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { Modal } from '../shared/Modal';
import { Selettore } from '../shared/Selettore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import type { PuntiSpostatiDto, PuntoInteresseDto } from '../../types';

interface AreaDelPalazzo { chiave: string; nome: string; ordine: number }

interface Props {
  /** Le voci scelte, nell'ordine della guida (voci dell'area, non passi). */
  voci: PuntoInteresseDto[];
  /** L'area da cui partono. */
  area: AreaDelPalazzo;
  /** Le aree del Palazzo (quella di partenza compresa). */
  aree: ReadonlyArray<AreaDelPalazzo>;
  /** Quanti passi di Enigma seguono le voci scelte (per dirlo prima e dopo). */
  passi: number;
  onChiudi: () => void;
  /** Fatto: chi apre la finestra esce dalla scelta e rilegge la scheda del Palazzo. */
  onFatto: (esito: PuntiSpostatiDto) => void | Promise<void>;
}

/** «1 voce», «3 voci». */
const quanteVoci = (n: number) => (n === 1 ? '1 voce' : `${n} voci`);
/** «3. Sala centrale»: l'area col suo numero nella guida. */
const nomeArea = (a: AreaDelPalazzo) => `${a.ordine + 1}. ${a.nome}`;

/** La finestra: riepilogo, area d'arrivo e comando. Parte dall'area dopo quella di partenza (o dalla prima delle altre). */
export function SpostaVociInArea({ voci, area, aree, passi, onChiudi, onFatto }: Props) {
  const altre = [...aree].filter((a) => a.chiave !== area.chiave).sort((x, y) => x.ordine - y.ordine);
  const [destinazione, setDestinazione] = useState(() => (altre.find((a) => a.ordine > area.ordine) ?? altre[0])?.chiave ?? '');
  const [occupato, setOccupato] = useState(false);
  const scelta = altre.find((a) => a.chiave === destinazione) ?? null;
  const conPassi = passi > 0 ? (passi === 1 ? ', con 1 passo di Enigma' : `, con ${passi} passi di Enigma`) : '';
  /** Sposta, notifica com'è andata e chiude; un errore resta in notifica e la finestra resta aperta. */
  const esegui = async () => {
    if (!scelta) return;
    setOccupato(true);
    try {
      const esito = await spostaPuntiInArea({ chiavi: voci.map((v) => v.chiave), area: scelta.chiave });
      notifica('success', `${quanteVoci(esito.spostate.length)} ${esito.spostate.length === 1 ? 'spostata' : 'spostate'} in ${nomeArea(scelta)}${conPassi}, in fondo: per tutte le partite.`);
      await onFatto(esito);
      onChiudi();
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Spostamento non riuscito.'); }
    finally { setOccupato(false); }
  };
  return (
    <Modal titolo={`Sposta ${quanteVoci(voci.length)} in un’altra area`} aperta onChiudi={onChiudi}>
      <div className="flex flex-col gap-3 text-[13px]">
        <p className="m-0 text-text-secondary">
          {quanteVoci(voci.length)} di {nomeArea(area)}{conPassi}. Stato nelle partite, pin e schede della guida restano con loro.
        </p>
        {/* in linea: dentro una finestra la tendina sovrapposta resterebbe tagliata dal corpo scorrevole */}
        <Selettore className="selettore--in-linea" compatto etichetta="Area di destinazione" valore={destinazione}
          opzioni={altre.map((a) => ({ chiave: a.chiave, nome: nomeArea(a) }))} onCambia={setDestinazione} />
        <p className="m-0 text-[12px] text-text-muted">Arrivano in fondo all’area, nell’ordine che hanno qui. Vale per tutte le partite: la guida è la stessa per tutte.</p>
        <div className="flex flex-wrap gap-1.5">
          <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="incolla" dimensione={20} />} titolo={scelta ? `Sposta in ${nomeArea(scelta)}` : 'Sposta'}
            disabled={occupato || !scelta} onClick={() => void esegui()} />
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" disabled={occupato} onClick={onChiudi} />
        </div>
      </div>
    </Modal>
  );
}
