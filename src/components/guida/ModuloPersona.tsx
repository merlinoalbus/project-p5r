// ============================================================
// ModuloPersona — aggiungere, modificare ed eliminare una Persona di un dedalo dei Memento (2026-10-11)
// ============================================================
//
// Le Persona dei Memento stanno in cima a ogni area come piastrelle con l'immagine (richiesta dell'utente: «le persona
// disponibili devono essere visualizzate con le loro immagini e cliccabili»; il tocco segna «catturata»). Una piastrella è
// troppo piccola per il modulo in linea della guida: correggerla, aggiungerne una o toglierla si fa qui, in una finestra.
// La Persona si sceglie dal compendio (l'immagine viene da lì) e la sua maschera diventa il nome italiano; il nome è quello
// dell'Ombra che la porta nel dedalo («Ragazza seducente»), e se lo si lascia vuoto è quello della Persona. Cambiando Persona i
// dettagli dell'Ombra di prima (resistenze, debolezze, personalità) se ne vanno: erano di un'altra maschera.
// Dal 2026-10-12 (migrazione 101) una Persona si incontra in più aree del dedalo: qui si scelgono tutte, almeno una.
// ============================================================

import { useState } from 'react';
import { aggiornaPunto, creaPunto, eliminaPunto, getPersone } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { LIMITI_GUIDA } from '../../../shared/limitiGuida';
import { Modal } from '../shared/Modal';
import { PageState } from '../shared/PageState';
import { CampoTesto, SezioneCampi } from '../shared/Campo';
import { FinestraModifica } from '../shared/FinestraModifica';
import { SceltaDaCatalogo } from '../shared/SceltaDaCatalogo';
import { conferma } from '../../stores/confermaStore';
import { NEL_CESTINO } from '../../utils/cestino';
import type { PersonaRiassuntoDto, PuntoInteresseDto } from '../../types';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

interface Props {
  /** La voce Persona da correggere, o null per aggiungerne una. */
  voce: PuntoInteresseDto | null;
  /** Il dedalo (area della guida del Memento) in cui sta la voce. */
  dedalo: string;
  /** L'area del dedalo da cui si apre il modulo: una Persona nuova nasce lì. */
  areaIniziale: string;
  /** Tutte le aree del dedalo, in ordine. */
  aree: ReadonlyArray<{ chiave: string; nome: string }>;
  onChiudi: () => void;
  /** Salvata, aggiunta o eliminata: chi apre il modulo rilegge la scheda. */
  onCambiata: () => void | Promise<void>;
}

/** La finestra: carica il compendio delle Persona, poi i campi. */
// L12 (passo 8): nel rilascio (sola lettura) il modulo non esiste; la condizione è costante di build, `ModuloPersonaReale` esce dal bundle
export const ModuloPersona: StrumentoDiModifica<typeof ModuloPersonaReale> = IN_RILASCIO ? NienteInRilascio : ModuloPersonaReale;
function ModuloPersonaReale(props: Props) {
  const { voce, aree, areaIniziale, onChiudi } = props;
  const persone = useCarica(() => getPersone(), []);
  const nomeArea = aree.find((a) => a.chiave === areaIniziale)?.nome ?? 'quest’area';
  const titolo = voce ? `Modifica: ${voce.persona?.nomeIt ?? voce.nome}` : `Aggiungi una Persona in ${nomeArea}`;
  // finché il compendio non c'è (o è in errore) la finestra è un guscio semplice con il suo stato; poi la `FinestraModifica` con il piè fisso
  if (!persone.dati) {
    return (
      <Modal titolo={titolo} aperta onChiudi={onChiudi}>
        <PageState isLoading={persone.caricamento} error={persone.errore} onRetry={() => void persone.ricarica()}>{null}</PageState>
      </Modal>
    );
  }
  return <Campi {...props} titolo={titolo} persone={persone.dati} />;
}

/** I campi (Persona, nome dell'Ombra, aree, descrizione), «Salva», «Annulla» e, per una voce che c'è, «Elimina» con conferma. */
function Campi({ titolo, voce, dedalo, areaIniziale, aree, persone, onChiudi, onCambiata }: Props & { titolo: string; persone: PersonaRiassuntoDto[] }) {
  const [persona, setPersona] = useState(voce?.persona ? String(voce.persona.id) : '');
  const [nome, setNome] = useState(voce?.nome ?? '');
  const [descrizione, setDescrizione] = useState(voce?.descrizione ?? '');
  const [scelteAree, setScelteAree] = useState<ReadonlySet<string>>(() => new Set(voce ? voce.areeDedalo : [areaIniziale]));
  const [occupato, setOccupato] = useState(false);
  // i valori di partenza sono il metro per sapere se c'è qualcosa di non salvato (chiudere con modifiche chiede conferma)
  const [partenza] = useState(() => ({ persona, nome, descrizione, aree: [...scelteAree].sort().join('|') }));
  const sporca = persona !== partenza.persona || nome !== partenza.nome || descrizione !== partenza.descrizione || [...scelteAree].sort().join('|') !== partenza.aree;
  const scelta = persone.find((p) => String(p.id) === persona) ?? null;
  const cambiaPersona = voce !== null && persona !== '' && persona !== String(voce.persona?.id ?? '');
  /** Le aree scelte, nell'ordine del dedalo. */
  const areeScelte = aree.filter((a) => scelteAree.has(a.chiave)).map((a) => a.chiave);
  /** Mette o toglie un'area fra quelle in cui si incontra la Persona. */
  const alternaArea = (k: string) => setScelteAree((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  /** Salva o aggiunge: a buon fine notifica, avvisa chi ha aperto e chiude; un errore resta in notifica. */
  const salva = async () => {
    if (!scelta) { notifica('error', 'Scegli la Persona dal compendio.'); return; }
    if (areeScelte.length === 0) { notifica('error', 'Scegli almeno un’area in cui si incontra.'); return; }
    const nomeOmbra = nome.trim() || scelta.nomeIt;
    setOccupato(true);
    try {
      if (voce) {
        const areeCambiate = areeScelte.join('|') !== aree.filter((a) => voce.areeDedalo.includes(a.chiave)).map((a) => a.chiave).join('|');
        await aggiornaPunto(voce.chiave, { nome: nomeOmbra, descrizione, persona: scelta.id, ...(areeCambiate ? { areeDedalo: areeScelte } : {}) });
        notifica('success', `Persona «${scelta.nomeIt}» salvata.`);
      } else {
        await creaPunto(dedalo, { nome: nomeOmbra, tipo: 'persona', descrizione, areeDedalo: areeScelte, persona: scelta.id });
        notifica('success', `Persona «${scelta.nomeIt}» aggiunta.`);
      }
      await onCambiata();
      onChiudi();
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Persona non salvata.'); }
    finally { setOccupato(false); }
  };
  /** Elimina la voce per tutte le partite, dopo la conferma (la domanda in primo piano, mai un riquadro in fondo al corpo che scorre). */
  const elimina = async () => {
    if (!voce) return;
    if (!(await conferma({ titolo: `Eliminare «${voce.persona?.nomeIt ?? voce.nome}»?`, testo: `Se ne va dalla guida, da tutte le aree del dedalo e per tutte le partite. Il compendio delle partite non cambia. ${NEL_CESTINO}`, etichetta: 'Elimina' }))) return;
    setOccupato(true);
    try { await eliminaPunto(voce.chiave); notifica('success', `Persona «${voce.persona?.nomeIt ?? voce.nome}» eliminata.`); await onCambiata(); onChiudi(); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Eliminazione non riuscita.'); }
    finally { setOccupato(false); }
  };

  return (
    <FinestraModifica titolo={titolo} stretta nomeModulo={voce ? `Correggi la Persona «${voce.persona?.nomeIt ?? voce.nome}»` : 'Nuova Persona'} onChiudi={onChiudi} onSalva={salva}
      titoloSalva={voce ? 'Salva' : 'Aggiungi'} salvabile={!!scelta && areeScelte.length > 0} occupato={occupato} sporca={sporca} onElimina={voce ? () => void elimina() : undefined}>
      <SezioneCampi titolo="La Persona">
        {/* in linea: in cima a una finestra breve la tendina sovrapposta restava tagliata dal corpo scorrevole */}
        <div className="campo--largo">
          <SceltaDaCatalogo tipo="persona" inLinea valore={persona} vuoto="— scegli —" persone={persone} disabilitato={occupato} onCambia={setPersona} />
        </div>
        {cambiaPersona && voce && Object.keys(voce.dettagli).some((k) => k !== 'maschera') && (
          <p className="campo--largo m-0 testo-12 text-warning" role="status">Con un’altra Persona le resistenze, le debolezze e la personalità dell’Ombra di prima se ne vanno: erano della maschera di prima.</p>
        )}
        <CampoTesto etichetta="Nome dell’Ombra" aiuto="Vuoto = quello della Persona." valore={nome} massimo={LIMITI_GUIDA.punto.nome} onCambia={setNome} disabilitato={occupato} largo />
      </SezioneCampi>
      <fieldset className="finestra-sezione">
        <legend className="finestra-sezione__titolo">Aree in cui si incontra · {areeScelte.length} di {aree.length}</legend>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-x-2">
          {aree.map((a) => (
            <label key={a.chiave} className="touch flex items-center gap-2 testo-13">
              <input type="checkbox" className="h-5 w-5" checked={scelteAree.has(a.chiave)} disabled={occupato} onChange={() => alternaArea(a.chiave)} />{a.nome}
            </label>
          ))}
        </div>
      </fieldset>
      <CampoTesto etichetta="Descrizione" tipo="lungo" righe={3} valore={descrizione} massimo={LIMITI_GUIDA.punto.descrizione} onCambia={setDescrizione} disabilitato={occupato} />
    </FinestraModifica>
  );
}
