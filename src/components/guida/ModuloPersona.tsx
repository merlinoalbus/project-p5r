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
import { Selettore } from '../shared/Selettore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { CampoCorrezione } from './CorrezioneGuida';
import { NEL_CESTINO } from '../../utils/cestino';
import type { PersonaRiassuntoDto, PuntoInteresseDto } from '../../types';

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
export function ModuloPersona(props: Props) {
  const { voce, aree, areaIniziale, onChiudi } = props;
  const persone = useCarica(() => getPersone(), []);
  const nomeArea = aree.find((a) => a.chiave === areaIniziale)?.nome ?? 'quest’area';
  return (
    <Modal titolo={voce ? `Modifica: ${voce.persona?.nomeIt ?? voce.nome}` : `Aggiungi una Persona in ${nomeArea}`} aperta onChiudi={onChiudi}>
      <PageState isLoading={persone.caricamento && !persone.dati} error={persone.errore} onRetry={() => void persone.ricarica()}>
        {persone.dati && <Campi {...props} persone={persone.dati} />}
      </PageState>
    </Modal>
  );
}

/** I campi (Persona, nome dell'Ombra, aree, descrizione), «Salva», «Annulla» e, per una voce che c'è, «Elimina» con conferma. */
function Campi({ voce, dedalo, areaIniziale, aree, persone, onChiudi, onCambiata }: Props & { persone: PersonaRiassuntoDto[] }) {
  const [persona, setPersona] = useState(voce?.persona ? String(voce.persona.id) : '');
  const [nome, setNome] = useState(voce?.nome ?? '');
  const [descrizione, setDescrizione] = useState(voce?.descrizione ?? '');
  const [scelteAree, setScelteAree] = useState<ReadonlySet<string>>(() => new Set(voce ? voce.areeDedalo : [areaIniziale]));
  const [occupato, setOccupato] = useState(false);
  const [conferma, setConferma] = useState(false);
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
  /** Elimina la voce per tutte le partite, dopo la conferma. */
  const elimina = async () => {
    if (!voce) return;
    setOccupato(true);
    try { await eliminaPunto(voce.chiave); notifica('success', `Persona «${voce.persona?.nomeIt ?? voce.nome}» eliminata.`); await onCambiata(); onChiudi(); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Eliminazione non riuscita.'); }
    finally { setOccupato(false); }
  };

  return (
    <form className="flex flex-col gap-3 text-[13px]" onSubmit={(e) => { e.preventDefault(); void salva(); }}>
      {/* in linea: in cima a una finestra breve la tendina sovrapposta restava tagliata dal corpo scorrevole */}
      <Selettore className="selettore--in-linea" etichetta="Persona del compendio" valore={persona} vuoto="— scegli —" ricerca="sempre"
        opzioni={persone.map((p) => ({ chiave: String(p.id), nome: p.nomeIt, dettaglio: `${p.arcanaNome} · liv. ${p.livello}` }))} onCambia={setPersona} />
      {cambiaPersona && voce && Object.keys(voce.dettagli).some((k) => k !== 'maschera') && (
        <p className="m-0 text-[12px] text-warning" role="status">Con un’altra Persona le resistenze, le debolezze e la personalità dell’Ombra di prima se ne vanno: erano della maschera di prima.</p>
      )}
      <CampoCorrezione etichetta="Nome dell’Ombra (vuoto = quello della Persona)" valore={nome} massimo={LIMITI_GUIDA.punto.nome} onCambia={setNome} />
      <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
        <legend className="mb-1 text-[12px]">Aree in cui si incontra · {areeScelte.length} di {aree.length}</legend>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-x-2">
          {aree.map((a) => (
            <label key={a.chiave} className="touch flex items-center gap-1.5 text-[12px]">
              <input type="checkbox" className="h-5 w-5" checked={scelteAree.has(a.chiave)} onChange={() => alternaArea(a.chiave)} />{a.nome}
            </label>
          ))}
        </div>
      </fieldset>
      <CampoCorrezione etichetta="Descrizione" valore={descrizione} multilinea massimo={LIMITI_GUIDA.punto.descrizione} onCambia={setDescrizione} />
      <div className="flex flex-wrap items-center gap-1.5">
        <PulsanteVisivo type="submit" tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo={voce ? 'Salva' : 'Aggiungi'} disabled={occupato || !scelta || areeScelte.length === 0} />
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" disabled={occupato} onClick={onChiudi} />
        <span className="flex-1" />
        {voce && !conferma && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina" disabled={occupato} onClick={() => setConferma(true)} />}
      </div>
      {voce && conferma && (
        <section className="flex flex-col gap-1.5 rounded-md border border-primary/40 px-2.5 py-2 text-[12px]" aria-label="Conferma: eliminare la Persona">
          <span>Se ne va dalla guida, da tutte le aree del dedalo e per tutte le partite. Il compendio delle partite non cambia. {NEL_CESTINO}</span>
          <div className="flex flex-wrap gap-1.5">
            <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Confermo" disabled={occupato} onClick={() => void elimina()} />
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="No" disabled={occupato} onClick={() => setConferma(false)} />
          </div>
        </section>
      )}
    </form>
  );
}
