// ============================================================
// ModuloAttivita — tipo e fascia a tessere, sede, costo, paga (solo lavori), sessioni, conteggio, dettagli, effetti, condizioni, guida del quiz
// ============================================================
//
// I tipi e le fasce sono quelli di `shared/attivita.ts`; la paga in yen è dei lavori (075); che
// cosa alza è l'elenco degli effetti (074), con le condizioni per voce (lo studio al Leblanc: 3
// note se piove). «Videogioco» è lo stesso modulo con il tipo fissato e il conteggio per round.
// ============================================================

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { IconLuna, IconSole } from '../../shared/iconeGuida';
import { Selettore } from '../../shared/Selettore';
import { SelettoreIcone, type OpzioneIcone } from '../../shared/SelettoreIcone';
import { EditorEffetti } from '../EditorEffetti';
import { EditorQuiz } from '../EditorQuiz';
import type { QuizAttivita } from '../../../../shared/quizAttivita';
import { SceltaLuogo } from '../SceltaLuogo';
import { FASCE_ATTIVITA, TIPI_ATTIVITA, TRACCIAMENTI_ATTIVITA, tracciamentoPerTipo } from '../../../../shared/attivita';
import type { VoceEffetto } from '../../../../shared/effettiCatalogo';
import { testoDi, testoOnull, type PropsModulo } from './base';
import { campiAutonomiAttivitaConfidente } from '../../../../shared/attivitaConfidente';
import type { FonteConfidenteAttivitaDto } from '../../../../shared/types';
import { FonteConfidenteAttivita } from '../../confidenti/FonteConfidenteAttivita';
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
const NOMI_CAMPI: Record<string, string> = {
  tipo: 'Tipo videogioco', fascia: 'Fascia propria', condizioni_json: 'Condizioni proprie', effetti_json: 'Effetti propri',
  doti_json: 'Doti storiche', tracciamento: 'Conteggio', sessioni: 'Sessioni', quiz_json: 'Quiz', costo: 'Costo',
  paga_yen: 'Paga in yen', paga_massima: 'Paga massima', paga: 'Paga in testo', premi: 'Premi in testo',
  altri_effetti: 'Altri effetti in testo', sblocco: 'Sblocco in testo',
};

/**
 * I campi di un'attività (o di un videogioco, col tipo fissato: niente tipo né conteggio, e le sessioni diventano
 * round): nome, tipo, fascia, sede, costo, paga e paga massima solo per i lavori, sessioni, conteggio, dettagli ed
 * effetti. Per le attività contate per volte gli effetti offrono «vale dalla seconda volta in poi» e un aiuto proprio; i lavori
 * (e un'attività che ne ha già una) hanno la guida del quiz.
 */
export function ModuloAttivita({ dati, imposta, impostaCondizioni, disabilitato }: PropsModulo) {
  const nomi = useNomiPerEffetti();
  const tipo = testoDi(dati.tipo);
  const videogioco = dati._tipoFisso === 'videogioco';
  const lavoro = tipo === 'lavoro';
  const confidente = testoDi(dati.confidente_chiave);
  const giaCollegata = !!dati._confidenteIniziale && confidente === dati._confidenteIniziale;
  const rawDaRisolvere = [
    ...(dati._effettiDaRisolvere ? ['effetti_json'] : []), ...(dati._quizDaRisolvere ? ['quiz_json'] : []),
    ...(dati._condizioniDaRisolvere ? ['condizioni_json'] : []),
  ];
  const incompatibili = confidente ? [...new Set([...campiAutonomiAttivitaConfidente({ ...dati, fascia: testoOnull(dati.fascia), doti_json: dati.doti_json ?? dati._dotiStoriche }, giaCollegata), ...rawDaRisolvere])] : [];
  const campiPropri = !confidente || incompatibili.length > 0;
  const fonte = dati._fonteConfidente as FonteConfidenteAttivitaDto | null;
  const opzioniConfidenti = nomi.confidenti.some((c) => c.chiave === confidente) || !confidente
    ? nomi.confidenti : [...nomi.confidenti, { chiave: confidente, nome: fonte?.nome ?? confidente }];
  const normalizzaFonte = () => {
    imposta({ fascia: null, tracciamento: 'nessuno', sessioni: 1, costo: null, paga_yen: null, paga_massima: null,
      effetti_json: [], quiz_json: null, _giorniQuiz: '', sblocco: null, _effettiDaRisolvere: false, _quizDaRisolvere: false,
      ...(!giaCollegata ? { doti_json: [] } : {}) });
    impostaCondizioni?.([]);
  };
  /** Cambia tipo impostando il conteggio predefinito per quel tipo; uscendo dai lavori azzera le paghe. */
  const cambiaTipo = (nuovo: string) => imposta({ tipo: nuovo, tracciamento: tracciamentoPerTipo(nuovo), ...(nuovo === 'lavoro' ? {} : { paga_yen: null, paga_massima: null }) });
  return (
    <div className="flex flex-col gap-3">
      {(!videogioco || !!confidente) && <div className="flex flex-col gap-2">
        <Selettore etichetta="Progressione del Confidente" valore={confidente} opzioni={opzioniConfidenti} vuoto="Attività autonoma"
          disabilitato={disabilitato} onCambia={(chiave) => imposta({ confidente_chiave: chiave || null })} />
        {nomi.erroreNomi && <p role="alert" className="m-0 text-error">{nomi.erroreNomi} <button type="button" className="btn btn-secondary touch" disabled={disabilitato} onClick={nomi.riprovaNomi}>Riprova</button></p>}
        {confidente && <>
          <p className="m-0 text-sm">La guida degli incontri e delle Doti viene dal Confidente. Cambiare questa scelta conserva i campi: risolvi quelli incompatibili prima di salvare. Rimuovere il collegamento conserva i valori attuali.</p>
          {fonte?.chiave === confidente ? <div className="flex flex-col gap-1"><p className="m-0 text-xs text-text-muted">Guida attualmente salvata; le modifiche del modulo non sono ancora applicate.</p><FonteConfidenteAttivita fonte={fonte} /></div> : <Link className="touch inline-flex self-start items-center text-primary" to={`/confidenti/${encodeURIComponent(confidente)}`}>Consulta la progressione del Confidente</Link>}
          {incompatibili.length > 0 && <div className="flex flex-col gap-2 rounded-md border border-warning p-3 text-sm">
            <p role="alert" className="m-0">Da risolvere: {incompatibili.map((c) => NOMI_CAMPI[c] ?? c).join(', ')}.</p>
            {incompatibili.includes('doti_json') && <p className="m-0 whitespace-pre-wrap break-words">Doti storiche: {JSON.stringify(dati.doti_json ?? dati._dotiStoriche)}</p>}
            <p className="m-0">Il comando seguente toglie fascia, condizioni, effetti e sblocco propri, quiz, costo e paghe numeriche; imposta nessun conteggio e una sessione{!giaCollegata ? ' e svuota le Doti storiche' : ''}. Comprende le parti non leggibili riportate sotto. I testi di paga, premi e altri effetti vanno risolti nei rispettivi campi. Dettagli e note personali restano.</p>
            <button type="button" className="btn btn-secondary min-h-11 self-start" disabled={disabilitato || !impostaCondizioni} onClick={normalizzaFonte}>Usa la progressione del Confidente e rimuovi i campi propri elencati</button>
          </div>}
        </>}
      </div>}
      {(['effetti', 'quiz'] as const).filter((c) => dati[`_${c}DaRisolvere`]).map((c) => <div key={c} className="flex flex-col gap-2 rounded-md border border-warning p-3 text-sm">
        <p role="alert" className="m-0">{c === 'effetti' ? 'Gli effetti salvati contengono' : 'Il quiz salvato contiene'} parti che l’editor non sa rappresentare. Il valore originale è conservato finché non scegli esplicitamente la sostituzione.</p>
        <p className="m-0 whitespace-pre-wrap break-all">{typeof dati[`_${c}Raw`] === 'string' ? String(dati[`_${c}Raw`]) : JSON.stringify(dati[`_${c}Raw`])}</p>
        <button type="button" className="btn btn-secondary min-h-11 self-start" disabled={disabilitato}
          onClick={() => imposta({ [`_${c}DaRisolvere`]: false })}>{c === 'quiz' && !dati.quiz_json ? 'Rimuovi il quiz non leggibile' : c === 'effetti' && (dati.effetti_json as VoceEffetto[]).length === 0 ? 'Sostituisci con nessun effetto' : `Usa ${c === 'effetti' ? 'gli effetti leggibili dell’editor' : 'il quiz leggibile dell’editor'} e scarta le altre parti`}</button>
      </div>)}
      <Griglia>
        <Campo nome="nome" etichetta={videogioco ? 'Nome del videogioco' : 'Nome dell’attività'} dati={dati} imposta={imposta} disabilitato={disabilitato} max={160} largo />
        {!videogioco && (
          <Blocco largo>
            <SelettoreIcone compatto etichetta="Tipo" valore={tipo} opzioni={OPZIONI_TIPO} disabilitato={disabilitato} onCambia={cambiaTipo} />
          </Blocco>
        )}
        {campiPropri && <Blocco largo>
          <SelettoreIcone compatto etichetta="Quando" valore={testoDi(dati.fascia)} opzioni={OPZIONI_FASCIA} disabilitato={disabilitato} onCambia={(fascia) => imposta({ fascia })} />
          {confidente && <button type="button" className="btn btn-ghost touch" disabled={disabilitato} onClick={() => imposta({ fascia: null })}>Usa le fasce del Confidente</button>}
        </Blocco>}
        <SceltaLuogo etichetta="Dove si svolge" valore={{ sede: (dati.sede_chiave as string | null) ?? null, quartiere: (dati.luogo_chiave as string | null) ?? null }} disabilitato={disabilitato}
          onCambia={(v) => imposta({ sede_chiave: v.sede, luogo_chiave: v.quartiere })} />
        {campiPropri && !videogioco && tipo !== 'videogioco' && <Campo nome="costo" etichetta="Costo in yen" tipo="numero" dati={dati} imposta={imposta} disabilitato={disabilitato} aiuto="Vuoto se è gratis" />}
        {campiPropri && (lavoro || incompatibili.includes('paga_yen')) && <Campo nome="paga_yen" etichetta="Paga in yen" tipo="numero" dati={dati} imposta={imposta} disabilitato={disabilitato} aiuto="A turno" />}
        {campiPropri && (lavoro || incompatibili.includes('paga_massima')) && <Campo nome="paga_massima" etichetta="Paga massima in yen" tipo="numero" dati={dati} imposta={imposta} disabilitato={disabilitato} aiuto="Con i bonus, se la guida la dichiara" />}
        {campiPropri && <Campo nome="sessioni" etichetta={videogioco ? 'Round per finirlo' : 'Sessioni'} tipo="numero" dati={dati} imposta={imposta} disabilitato={disabilitato} aiuto={videogioco ? 'Quanti round servono per completarlo' : 'Se si completa in più volte'} />}
        {campiPropri && !videogioco && (
          <Blocco>
            <Selettore etichetta="Come si conta nella partita" valore={testoDi(dati.tracciamento)} ricerca="mai" disabilitato={disabilitato}
              opzioni={TRACCIAMENTI_ATTIVITA.map((t) => ({ chiave: t.chiave, nome: t.nome }))} onCambia={(tracciamento) => imposta({ tracciamento })} />
          </Blocco>
        )}
        <Campo nome="dettagli" etichetta="Come funziona, premi, note" tipo="testolungo" dati={dati} imposta={imposta} disabilitato={disabilitato} max={4000} />
        {(['paga', 'premi', 'altri_effetti', 'sblocco'] as const).filter((c) => testoDi(dati[c]).length > 0 || incompatibili.includes(c)).map((c) => <Campo key={c} nome={c} etichetta={NOMI_CAMPI[c]} tipo="testolungo" dati={dati} imposta={imposta} disabilitato={disabilitato} max={c === 'paga' || c === 'sblocco' ? 400 : 2000} />)}
      </Griglia>
      {/* contata per volte (un lavoro): ogni turno dice i suoi punti (da segnare a mano), il primo le voci senza la spunta, gli altri quelle «dalla seconda volta in poi» */}
      {campiPropri && <EditorEffetti voci={dati.effetti_json as VoceEffetto[]} onCambia={(v) => imposta({ effetti_json: v })} disabilitato={disabilitato || !!dati._effettiDaRisolvere} {...nomi}
        conRipetuto={testoDi(dati.tracciamento) === 'svolta'}
        aiuto={testoDi(dati.tracciamento) === 'svolta'
          ? 'Il gioco dà questi punti a ogni turno: l\'app te li ricorda quando registri un turno (dalla spunta della giornata o dal contatore in Partita → Progressi) e li segni tu nella scheda Doti. Il primo turno le voci senza la spunta, dal secondo in poi quelle con «vale dalla seconda volta in poi». Un lavoro che dà sempre la stessa Dote ha le due voci uguali.'
          : undefined} />}
      {/* la guida del quiz è dei lavori (generica per tutti, scelta dell'utente 2026-10-17); un'altra attività che ne ha già una la tiene */}
      {campiPropri && (lavoro || !!dati.quiz_json) && (
        <EditorQuiz quiz={(dati.quiz_json as QuizAttivita | null) ?? null} giorni={testoDi(dati._giorniQuiz)} onCambia={imposta} disabilitato={disabilitato || !!dati._quizDaRisolvere} />
      )}
    </div>
  );
}
