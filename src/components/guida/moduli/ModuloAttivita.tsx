// ============================================================
// ModuloAttivita — tipo e fascia a tessere, sede, costo, paga (solo lavori), sessioni, conteggio, dettagli, effetti, condizioni
// ============================================================
//
// I tipi e le fasce sono quelli di `shared/attivita.ts`; la paga in yen è dei lavori (075); che
// cosa alza è l'elenco degli effetti (074), con le condizioni per voce (lo studio al Leblanc: 3
// note se piove). «Videogioco» è lo stesso modulo con il tipo fissato e il conteggio per round.
// ============================================================

import type { ReactNode } from 'react';
import { IconLuna, IconSole } from '../../shared/iconeGuida';
import { Selettore } from '../../shared/Selettore';
import { SelettoreIcone, type OpzioneIcone } from '../../shared/SelettoreIcone';
import { EditorEffetti } from '../EditorEffetti';
import { SceltaLuogo } from '../SceltaLuogo';
import { FASCE_ATTIVITA, TIPI_ATTIVITA, TRACCIAMENTI_ATTIVITA, tracciamentoPerTipo } from '../../../../shared/attivita';
import type { VoceEffetto } from '../../../../shared/effettiCatalogo';
import { testoDi, type PropsModulo } from './base';
import { Blocco, Campo, Griglia } from './campi';
import { useNomiPerEffetti } from './nomiPerEffetti';

/** La figura di ogni tipo: le illustrazioni delle categorie. */
const CATEGORIA_TIPO: Record<string, string> = { 'mini-gioco': 'minigiochi', lavoro: 'lavori', studio: 'studio', lettura: 'libri', videogioco: 'minigiochi', allenamento: 'allenamento', cibo: 'cibo', sfida: 'obiettivo', altro: 'altro' };
const OPZIONI_TIPO: OpzioneIcone[] = TIPI_ATTIVITA.map((t) => ({ chiave: t.chiave, nome: t.nome, categoria: CATEGORIA_TIPO[t.chiave] }));
const ICONA_FASCIA: Record<string, ReactNode> = {
  giorno: <span className="text-warning"><IconSole size={28} /></span>,
  sera: <span className="text-info"><IconLuna size={28} /></span>,
  entrambe: <span className="inline-flex items-center"><span className="text-warning"><IconSole size={20} /></span><span className="text-info"><IconLuna size={20} /></span></span>,
};
const OPZIONI_FASCIA: OpzioneIcone[] = FASCE_ATTIVITA.map((f) => ({ chiave: f.chiave, nome: f.nome, icona: ICONA_FASCIA[f.chiave] }));

/**
 * I campi di un'attività (o di un videogioco, col tipo fissato: niente tipo né conteggio, e le sessioni diventano
 * round): nome, tipo, fascia, sede, costo, paga e paga massima solo per i lavori, sessioni, conteggio, dettagli ed
 * effetti. Per le attività contate per volte gli effetti offrono «vale dalla seconda volta in poi» e un aiuto proprio.
 */
export function ModuloAttivita({ dati, imposta, disabilitato }: PropsModulo) {
  const nomi = useNomiPerEffetti();
  const tipo = testoDi(dati.tipo);
  const videogioco = dati._tipoFisso === 'videogioco';
  const lavoro = tipo === 'lavoro';
  /** Cambia tipo impostando il conteggio predefinito per quel tipo; uscendo dai lavori azzera le paghe. */
  const cambiaTipo = (nuovo: string) => imposta({ tipo: nuovo, tracciamento: tracciamentoPerTipo(nuovo), ...(nuovo === 'lavoro' ? {} : { paga_yen: null, paga_massima: null }) });
  return (
    <div className="flex flex-col gap-3">
      <Griglia>
        <Campo nome="nome" etichetta={videogioco ? 'Nome del videogioco' : 'Nome dell’attività'} dati={dati} imposta={imposta} disabilitato={disabilitato} max={160} largo />
        {!videogioco && (
          <Blocco largo>
            <SelettoreIcone compatto etichetta="Tipo" valore={tipo} opzioni={OPZIONI_TIPO} disabilitato={disabilitato} onCambia={cambiaTipo} />
          </Blocco>
        )}
        <Blocco largo>
          <SelettoreIcone compatto etichetta="Quando" valore={testoDi(dati.fascia)} opzioni={OPZIONI_FASCIA} disabilitato={disabilitato} onCambia={(fascia) => imposta({ fascia })} />
        </Blocco>
        <SceltaLuogo etichetta="Dove si svolge" valore={{ sede: (dati.sede_chiave as string | null) ?? null, quartiere: (dati.luogo_chiave as string | null) ?? null }} disabilitato={disabilitato}
          onCambia={(v) => imposta({ sede_chiave: v.sede, luogo_chiave: v.quartiere })} />
        <Campo nome="costo" etichetta="Costo in yen" tipo="numero" dati={dati} imposta={imposta} disabilitato={disabilitato} aiuto="Vuoto se è gratis" />
        {lavoro && <Campo nome="paga_yen" etichetta="Paga in yen" tipo="numero" dati={dati} imposta={imposta} disabilitato={disabilitato} aiuto="A turno" />}
        {lavoro && <Campo nome="paga_massima" etichetta="Paga massima in yen" tipo="numero" dati={dati} imposta={imposta} disabilitato={disabilitato} aiuto="Con i bonus, se la guida la dichiara" />}
        <Campo nome="sessioni" etichetta={videogioco ? 'Round per finirlo' : 'Sessioni'} tipo="numero" dati={dati} imposta={imposta} disabilitato={disabilitato} aiuto={videogioco ? 'Quanti round servono per completarlo' : 'Se si completa in più volte'} />
        {!videogioco && (
          <Blocco>
            <Selettore etichetta="Come si conta nella partita" valore={testoDi(dati.tracciamento)} ricerca="mai" disabilitato={disabilitato}
              opzioni={TRACCIAMENTI_ATTIVITA.map((t) => ({ chiave: t.chiave, nome: t.nome }))} onCambia={(tracciamento) => imposta({ tracciamento })} />
          </Blocco>
        )}
        <Campo nome="dettagli" etichetta="Come funziona, premi, note" tipo="testolungo" dati={dati} imposta={imposta} disabilitato={disabilitato} max={4000} />
      </Griglia>
      {/* contata per volte (un lavoro): ogni turno dice i suoi punti (da segnare a mano), il primo le voci senza la spunta, gli altri quelle «dalla seconda volta in poi» */}
      <EditorEffetti voci={dati.effetti_json as VoceEffetto[]} onCambia={(v) => imposta({ effetti_json: v })} disabilitato={disabilitato} {...nomi}
        conRipetuto={testoDi(dati.tracciamento) === 'svolta'}
        aiuto={testoDi(dati.tracciamento) === 'svolta'
          ? 'Il gioco dà questi punti a ogni turno: l\'app te li ricorda quando registri un turno (dalla spunta della giornata o dal contatore in Partita → Progressi) e li segni tu nella scheda Doti. Il primo turno le voci senza la spunta, dal secondo in poi quelle con «vale dalla seconda volta in poi». Un lavoro che dà sempre la stessa Dote ha le due voci uguali.'
          : undefined} />
    </div>
  );
}
