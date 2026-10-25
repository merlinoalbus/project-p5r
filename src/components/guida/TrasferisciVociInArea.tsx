// ============================================================
// TrasferisciVociInArea — la finestra che copia o sposta le voci scelte della guida di un'area in un'altra area dello stesso Palazzo
// ============================================================
//
// Spostare (2026-10-14, «come faccio a spostare più voci del palazzo insieme?»): le voci arrivano in fondo all'area scelta, nel loro
// ordine, coi loro passi e le schede della guida senza mappa; la chiave resta, quindi stati delle partite e pin non cambiano.
// Copiare (2026-10-18, «non è possibile copiare gli elementi di un'area in un'altra area... ma solo spostare... attiva anche la
// modalità copia»; scelte «Voce, passi e schede» e «Le altre aree dello stesso Palazzo»): ogni voce diventa una voce nuova in fondo
// all'area, coi passi e le schede (immagini comprese), collegata agli stessi pin delle planimetrie con uno stato suo (parte da fare).
// L'una e l'altra sono canone: valgono per tutte le partite.
// ============================================================

import { useState } from 'react';
import { copiaPuntiInArea, spostaPuntiInArea } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { Modal } from '../shared/Modal';
import { Selettore } from '../shared/Selettore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

interface AreaDelPalazzo { chiave: string; nome: string; ordine: number }

interface Props {
  /** «copia» o «sposta». */
  modo: 'copia' | 'sposta';
  /** Le voci scelte, nell'ordine della guida (voci dell'area, non passi). */
  voci: ReadonlyArray<{ chiave: string }>;
  /** L'area da cui partono. */
  area: AreaDelPalazzo;
  /** Le aree del Palazzo (quella di partenza compresa). */
  aree: ReadonlyArray<AreaDelPalazzo>;
  /** Quanti passi di Enigma seguono le voci scelte (per dirlo prima e dopo). */
  passi: number;
  onChiudi: () => void;
  /** Fatto: chi apre la finestra esce dalla scelta e rilegge la scheda del Palazzo. */
  onFatto: () => void | Promise<void>;
}

/** «1 voce», «3 voci». */
const quanteVoci = (n: number) => (n === 1 ? '1 voce' : `${n} voci`);
/** «3. Sala centrale»: l'area col suo numero nella guida. */
const nomeArea = (a: AreaDelPalazzo) => `${a.ordine + 1}. ${a.nome}`;
/** «, con 1 passo di Enigma», «, con 3 passi di Enigma»; vuoto senza passi. */
const conPassi = (n: number) => (n > 0 ? (n === 1 ? ', con 1 passo di Enigma' : `, con ${n} passi di Enigma`) : '');

/** La finestra: riepilogo, area d'arrivo e comando. Parte dall'area dopo quella di partenza (o dalla prima delle altre). */
// L12 (passo 8): nel rilascio (sola lettura) il trasferimento non esiste; la condizione è costante di build, `TrasferisciVociInAreaReale` esce dal bundle
export const TrasferisciVociInArea: StrumentoDiModifica<typeof TrasferisciVociInAreaReale> = IN_RILASCIO ? NienteInRilascio : TrasferisciVociInAreaReale;
function TrasferisciVociInAreaReale({ modo, voci, area, aree, passi, onChiudi, onFatto }: Props) {
  const altre = [...aree].filter((a) => a.chiave !== area.chiave).sort((x, y) => x.ordine - y.ordine);
  const [destinazione, setDestinazione] = useState(() => (altre.find((a) => a.ordine > area.ordine) ?? altre[0])?.chiave ?? '');
  const [occupato, setOccupato] = useState(false);
  const scelta = altre.find((a) => a.chiave === destinazione) ?? null;
  const copia = modo === 'copia';
  const verbo = copia ? 'Copia' : 'Sposta';
  /** Copia o sposta, notifica com'è andata e chiude; un errore resta in notifica e la finestra resta aperta. */
  const esegui = async () => {
    if (!scelta) return;
    setOccupato(true);
    try {
      const corpo = { chiavi: voci.map((v) => v.chiave), area: scelta.chiave };
      if (copia) {
        const esito = await copiaPuntiInArea(corpo);
        const n = esito.copiate.length;
        const passiCopiati = esito.copiate.reduce((s, c) => s + c.passi, 0);
        const pinCopiati = esito.copiate.reduce((s, c) => s + c.pin, 0);
        // i pin collegati alla copia sono gli stessi dell'originale, con uno stato suo (2026-10-18)
        const conPin = pinCopiati > 0 ? `, ${pinCopiati === 1 ? 'collegata allo stesso pin' : `collegate agli stessi ${pinCopiati} pin`} (da fare)` : '';
        notifica('success', `${quanteVoci(n)} ${n === 1 ? 'copiata' : 'copiate'} in ${nomeArea(scelta)}${conPassi(passiCopiati)}${conPin}, in fondo: per tutte le partite.`);
      } else {
        const esito = await spostaPuntiInArea(corpo);
        notifica('success', `${quanteVoci(esito.spostate.length)} ${esito.spostate.length === 1 ? 'spostata' : 'spostate'} in ${nomeArea(scelta)}${conPassi(passi)}, in fondo: per tutte le partite.`);
      }
      await onFatto();
      onChiudi();
    } catch (err) { notifica('error', err instanceof Error ? err.message : `${copia ? 'Copia' : 'Spostamento'} non riuscit${copia ? 'a' : 'o'}.`); }
    finally { setOccupato(false); }
  };
  return (
    <Modal titolo={`${verbo} ${quanteVoci(voci.length)} in un’altra infiltrazione`} aperta onChiudi={onChiudi}>
      <div className="flex flex-col gap-3 testo-13">
        <p className="m-0 text-text-secondary">
          {quanteVoci(voci.length)} di {nomeArea(area)}{conPassi(passi)}.{' '}
          {copia
            ? 'Ogni voce diventa una voce nuova, con i suoi passi e le schede della guida; collegata agli stessi pin delle planimetrie, con uno stato suo: parte da fare.'
            : 'Stato nelle partite, pin e schede della guida restano con loro.'}
        </p>
        {/* in linea: dentro una finestra la tendina sovrapposta resterebbe tagliata dal corpo scorrevole */}
        <Selettore className="selettore--in-linea" compatto etichetta="Infiltrazione di destinazione" valore={destinazione}
          opzioni={altre.map((a) => ({ chiave: a.chiave, nome: nomeArea(a) }))} onCambia={setDestinazione} />
        <p className="m-0 testo-12 text-text-muted">Arrivano in fondo all’infiltrazione, nell’ordine che hanno qui. Vale per tutte le partite: la guida è la stessa per tutte.</p>
        <div className="flex flex-wrap gap-1.5">
          <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave={copia ? 'copia' : 'incolla'} dimensione={20} />} titolo={scelta ? `${verbo} in ${nomeArea(scelta)}` : verbo}
            disabled={occupato || !scelta} onClick={() => void esegui()} />
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" disabled={occupato} onClick={onChiudi} />
        </div>
      </div>
    </Modal>
  );
}
