// ============================================================
// EditorInvito — creare o cambiare un invito del Confidente: giorno, posto che apre, condizioni, giorno e fascia del messaggio (L13 O7-4), nota (R9-07c, R11-15/2)
// ============================================================
//
// Il giorno (mese e giorno del calendario di gioco) è la chiave dell'invito: si sceglie alla creazione e dopo non si cambia. Il posto che apre è un
// quartiere, un luogo o un'Area, scelto per nome. Le condizioni sono quelle del vocabolario unico (lo stesso editor dei requisiti dei ranghi); il
// server rifiuta quelle che citano l'invito stesso. Un invito della guida cambiato porta «Ripristina», che rimette posto, condizioni e nota.
// Rotte: POST `/api/compendio/confidenti/:chiave/inviti`, PUT `…/inviti/:data`, POST `…/inviti/:data/ripristina`.
// ============================================================

import { useState } from 'react';
import { dataLeggibile, dataValida, type Condizione } from '../../../shared/condizioniSpillo';
import { creaInvitoConfidente, getAreeCitta, getLuoghi, getQuartieri, modificaInvitoConfidente, ripristinaInvitoConfidente } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { useBozzaSporca } from '../../utils/bozzeSporche';
import type { InvitoDto } from '../../types';
import { CondizioniEditor } from '../guida/CondizioniEditor';
import { Modal } from '../shared/Modal';
import { Selettore, type OpzioneSelettore } from '../shared/Selettore';
import { SelettoreData } from '../shared/SelettoreData';
import { Segmenti } from '../shared/Segmenti';
import { Campo, CampoTesto } from '../shared/Campo';
import { conferma, CHIUDI_SENZA_SALVARE } from '../../stores/confermaStore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

type TipoPosto = 'quartiere' | 'luogo' | 'area';
const NOME_TIPO: Record<TipoPosto, string> = { quartiere: 'Un quartiere', luogo: 'Un luogo', area: 'Un’Area' };
const TIPI: TipoPosto[] = ['quartiere', 'luogo', 'area'];

/** Il posto che apre, per nome: gli elenchi si caricano tutti e tre, la scelta ne usa uno. */
function usePostiInvito() {
  return useCarica(async () => {
    const [quartieri, luoghi, aree] = await Promise.all([getQuartieri(), getLuoghi(), getAreeCitta()]);
    return {
      quartiere: quartieri.map((q): OpzioneSelettore => ({ chiave: q.chiave, nome: q.nome })),
      luogo: luoghi.map((l): OpzioneSelettore => ({ chiave: l.chiave, nome: l.nome, dettaglio: l.quartiereNome })),
      area: aree.map((a): OpzioneSelettore => ({ chiave: a.chiave, nome: a.nome, dettaglio: a.contenitore.nome })),
    } satisfies Record<TipoPosto, OpzioneSelettore[]>;
  }, []);
}

/** La finestra: `invito` assente = nuovo invito del Confidente. */
// L12 (passo 8): nel rilascio (sola lettura) l'editor non esiste; la condizione è costante di build, `EditorInvitoReale` esce dal bundle
export const EditorInvito: StrumentoDiModifica<typeof EditorInvitoReale> = IN_RILASCIO ? NienteInRilascio : EditorInvitoReale;
function EditorInvitoReale({ confidente, invito, onChiudi, onSalvato }: { confidente: { chiave: string; nome: string }; invito: InvitoDto | null; onChiudi: () => void; onSalvato: () => void | Promise<void> }) {
  const posti = usePostiInvito();
  // il giorno di un invito nuovo ('MM-GG'; '' finché non è scelto): lo dà `SelettoreData`, lo stesso di ogni data di gioco dell'app
  const [dataNuova, setDataNuova] = useState('');
  const [tipo, setTipo] = useState<TipoPosto>(invito?.apre.tipo ?? 'quartiere');
  const [posto, setPosto] = useState(invito?.apre.chiave ?? '');
  const [condizioni, setCondizioni] = useState<Condizione[]>(invito?.condizioni ?? []);
  const [nota, setNota] = useState(invito?.nota ?? '');
  // L13 (O7-4): quando arriva il messaggio dell'invito, se la guida lo dice ('' = nessun giorno)
  const [messaggioData, setMessaggioData] = useState(invito?.messaggio?.data ?? '');
  const [messaggioFascia, setMessaggioFascia] = useState<'giorno' | 'sera'>(invito?.messaggio?.fascia ?? 'sera');
  const [occupato, setOccupato] = useState(false);
  const data = invito?.data ?? dataNuova;
  const dataOk = data !== '' && dataValida(data);
  const messaggio = messaggioData !== '' && dataValida(messaggioData) ? { data: messaggioData, fascia: messaggioFascia } : null;
  const messaggioCambiato = JSON.stringify(messaggio) !== JSON.stringify(invito?.messaggio ?? null);
  const sporca = invito
    ? tipo !== invito.apre.tipo || posto !== invito.apre.chiave || nota !== invito.nota || messaggioCambiato || JSON.stringify(condizioni) !== JSON.stringify(invito.condizioni)
    : dataNuova !== '' || posto !== '' || nota !== '' || messaggio !== null || condizioni.length > 0;
  useBozzaSporca(`invito:${confidente.chiave}:${invito?.data ?? 'nuovo'}`, `l’invito di ${confidente.nome}`, sporca);

  // Il posto di un invito della guida che non sta negli elenchi (per esempio un'Area fuori dalla città) resta scelto, col suo nome.
  const elenco = posti.dati?.[tipo] ?? [];
  const opzioni = invito && invito.apre.tipo === tipo && !elenco.some((o) => o.chiave === invito.apre.chiave) ? [{ chiave: invito.apre.chiave, nome: invito.apre.nome }, ...elenco] : elenco;

  const chiudi = async () => {
    if (occupato) return;
    if (sporca && !(await conferma(CHIUDI_SENZA_SALVARE))) return;
    onChiudi();
  };
  const esegui = async (azione: () => Promise<unknown>, esito: string) => {
    setOccupato(true);
    try { await azione(); notifica('success', esito); await onSalvato(); onChiudi(); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Operazione non riuscita.'); }
    finally { setOccupato(false); }
  };
  const corpo = { apre: { tipo, chiave: posto }, condizioni, nota, messaggio };
  const salva = () => invito?.data
    ? esegui(() => modificaInvitoConfidente(confidente.chiave, invito.data!, corpo), 'Invito salvato: vale per tutte le partite.')
    : esegui(() => creaInvitoConfidente(confidente.chiave, { ...corpo, data }), 'Invito creato.');

  return (
    <Modal titolo={invito ? `Invito di ${confidente.nome}: ${invito.data ? dataLeggibile(invito.data) : ''}` : `Nuovo invito di ${confidente.nome}`} aperta larga onChiudi={chiudi} azioni={(
      <div className="flex w-full flex-wrap justify-end gap-2">
        {invito?.modificato && <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="riapri" dimensione={22} />} titolo="Ripristina" disabled={occupato} onClick={() => void esegui(() => ripristinaInvitoConfidente(confidente.chiave, invito.data!), 'Invito ripristinato come nella guida.')} />}
        <button type="button" className="btn btn-secondary touch" disabled={occupato} onClick={chiudi}>Annulla</button>
        <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="registra" dimensione={22} />} titolo={invito ? 'Salva' : 'Crea l’invito'} disabled={occupato || !sporca || !dataOk || posto === '' || condizioni.length > 20} onClick={() => void salva()} />
      </div>
    )}>
      <div className="flex flex-col gap-3 testo-13">
        <p className="m-0 text-text-muted">Le modifiche valgono per tutte le partite. L’invito si registra solo se le condizioni sono vere.</p>
        {posti.errore && <p role="alert" className="m-0 text-error-testo">{posti.errore} <PulsanteVisivo compatto icona={<IconaAzione chiave="riprova" dimensione={20} />} titolo="Riprova" onClick={() => void posti.ricarica()} /></p>}
        {invito ? <p className="m-0"><strong className="text-text">Giorno:</strong> {invito.data ? dataLeggibile(invito.data) : '—'} <span className="text-text-muted">(il giorno non si cambia)</span></p> : (
          <Campo etichetta="Giorno dell’invito" aiuto="Mese e giorno del calendario di gioco: dopo la creazione non si cambia." obbligatorio senzaGruppo>
            <SelettoreData etichetta="Giorno dell’invito" valore={dataNuova} onCambia={setDataNuova} disabilitato={occupato} />
          </Campo>
        )}
        <Selettore etichettaSopra etichetta="Che cosa apre" valore={tipo} opzioni={TIPI.map((t) => ({ chiave: t, nome: NOME_TIPO[t] }))} onCambia={(v) => { setTipo(v as TipoPosto); setPosto(''); }} disabilitato={occupato} ricerca="mai" />
        <Selettore etichettaSopra etichetta="Posto" valore={posto} vuoto="Scegli il posto" opzioni={opzioni} onCambia={setPosto} disabilitato={occupato || (!posti.dati && !posti.errore)} />
        <fieldset className="m-0 flex flex-col gap-1 border-0 p-0"><legend className="p-0 text-text-secondary">Condizioni (vuote = sempre)</legend>
          <CondizioniEditor condizioni={condizioni} onCambia={setCondizioni} disabilitato={occupato} massimo={20} />
        </fieldset>
        <Campo etichetta="Il messaggio arriva" aiuto="Il giorno in cui arriva il messaggio dell’invito, se la guida lo dice: «nessuna» se non lo dice." senzaGruppo>
          <div className="flex flex-wrap items-end gap-2">
            <SelettoreData etichetta="Giorno del messaggio" valore={messaggioData} onCambia={setMessaggioData} disabilitato={occupato} facoltativa />
            {messaggioData !== '' && <Segmenti etichetta="Fascia del messaggio" valore={messaggioFascia} opzioni={[{ chiave: 'giorno', nome: 'Di giorno' }, { chiave: 'sera', nome: 'La sera' }]} onCambia={setMessaggioFascia} />}
          </div>
        </Campo>
        <CampoTesto etichetta="Nota" tipo="lungo" valore={nota} massimo={500} disabilitato={occupato} onCambia={setNota} />
      </div>
    </Modal>
  );
}
