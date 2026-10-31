// ============================================================
// ModuloAttivita — tipo e fascia a tessere, sede, costo, paga (solo lavori), sessioni, conteggio, dettagli, effetti, condizioni, guida del quiz
// ============================================================
//
// I tipi e le fasce sono quelli di `shared/attivita.ts`; la paga in yen è dei lavori (075); che
// cosa alza è l'elenco degli effetti (074), con le condizioni per voce (lo studio al Leblanc: 3
// note se piove). «Videogioco» è lo stesso modulo con il tipo fissato e il conteggio per round.
//
// L13 (O7-5, censimento del 25/10: «ModuloAttivita sovraccarico»): i campi stanno nelle sezioni comuni delle finestre di modifica
// (`SezioneCampi`, una colonna sotto 768 px, due da lì): Attività, Confidente e Pesca (solo se collegati), Dove e quando, Costo e paga,
// Effetti ed esiti, Guida del quiz (solo per i lavori o se c'è già). Il guscio (`ModuloCatalogo`) è la `FinestraModifica` comune:
// piè fisso con Salva e Annulla, conferma alla chiusura con modifiche. Valori, regole e corpo verso l'API sono quelli di prima.
// ============================================================

import { useState, type ReactNode } from 'react';
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
import { jsonDi, testoDi, testoOnull, type PropsModulo } from './base';
import { EditorEsiti } from '../EditorEsiti';
import { normalizzaEsitiAttivita, type EsitiAttivita } from '../../../../shared/esitiAttivita';
import { campiAutonomiAttivitaConfidente } from '../../../../shared/attivitaConfidente';
import { campiAutonomiAttivitaPesca } from '../../../../shared/attivitaPesca';
import { REGOLA_PESCA, type RegolaPescaDto } from '../../../../shared/pesca';
import type { FonteConfidenteAttivitaDto } from '../../../../shared/types';
import { FonteConfidenteAttivita } from '../../confidenti/FonteConfidenteAttivita';
import { FontePescaAttivita } from '../../pesca/FontePescaAttivita';
import { Blocco, Campo } from './campi';
import { SezioneCampi } from '../../shared/Campo';
import { useNomiPerEffetti } from './nomiPerEffetti';
import { AvvisoNomiPerEffetti } from './AvvisoNomiPerEffetti';
import { PulsanteVisivo } from '../../shared/PulsanteVisivo';
import { IconaAzione } from '../../shared/IconaAzione';

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
  paga_yen: 'Paga in yen', paga_massima: 'Paga massima', esiti_json: 'Esiti scelti alla spunta',
  confidente_chiave: 'Progressione del Confidente',
};

/**
 * I campi di un'attività (o di un videogioco, col tipo fissato: niente tipo né conteggio, e le sessioni diventano
 * round): nome, tipo, fascia, sede, costo, paga e paga massima solo per i lavori, sessioni, conteggio, dettagli ed
 * effetti. Per le attività contate per volte gli effetti offrono «vale dalla seconda volta in poi» e un aiuto proprio; i lavori
 * (e un'attività che ne ha già una) hanno la guida del quiz.
 */
export function ModuloAttivita({ dati, imposta, impostaCondizioni, disabilitato }: PropsModulo) {
  const nomi = useNomiPerEffetti({ confidenti: true });
  const tipo = testoDi(dati.tipo);
  const videogioco = dati._tipoFisso === 'videogioco';
  const lavoro = tipo === 'lavoro';
  const confidente = testoDi(dati.confidente_chiave);
  const pesca = testoDi(dati.pesca_regola_chiave);
  const ruoloPesca = dati.pesca_ruolo;
  const fontePesca = dati._fontePesca as RegolaPescaDto | null;
  const [confermaPesca, setConfermaPesca] = useState<string | null>(null);
  const giaCollegata = !!dati._confidenteIniziale && confidente === dati._confidenteIniziale;
  const rawDaRisolvere = [
    ...(dati._effettiDaRisolvere ? ['effetti_json'] : []), ...(dati._quizDaRisolvere ? ['quiz_json'] : []),
    ...(dati._condizioniDaRisolvere ? ['condizioni_json'] : []),
  ];
  const incompatibiliConfidente = confidente ? [...new Set([...campiAutonomiAttivitaConfidente({ ...dati, fascia: testoOnull(dati.fascia), doti_json: dati.doti_json ?? dati._dotiStoriche }, giaCollegata), ...rawDaRisolvere])] : [];
  const incompatibiliPesca = pesca ? [...new Set([...campiAutonomiAttivitaPesca({ ...dati, fascia: testoOnull(dati.fascia), doti_json: dati.doti_json ?? dati._dotiStoriche }), ...rawDaRisolvere])] : [];
  const incompatibili = [...new Set([...incompatibiliConfidente, ...incompatibiliPesca])];
  const campiPropri = (!confidente && !pesca) || incompatibili.length > 0;
  const valoreIncompatibile = (c: string): unknown => c === 'doti_json' ? dati.doti_json ?? dati._dotiStoriche : dati[`_${c.replace('_json', '')}DaRisolvere`] ? dati[`_${c.replace('_json', '')}Raw`] : dati[c];
  const firmaPesca = JSON.stringify([pesca, ruoloPesca, incompatibiliPesca.map(c => [c, valoreIncompatibile(c)])]);
  const fonte = dati._fonteConfidente as FonteConfidenteAttivitaDto | null;
  const opzioniConfidenti = nomi.confidenti.some((c) => c.chiave === confidente) || !confidente
    ? nomi.confidenti : [...nomi.confidenti, { chiave: confidente, nome: fonte?.nome ?? confidente }];
  const normalizzaFonte = () => {
    if (pesca) return;
    imposta({ fascia: null, tracciamento: 'nessuno', sessioni: 1, costo: null, paga_yen: null, paga_massima: null,
      effetti_json: [], quiz_json: null, _effettiDaRisolvere: false, _quizDaRisolvere: false, esiti_json: null, _esitiDaRisolvere: false,
      ...(!giaCollegata ? { doti_json: [] } : {}) });
    impostaCondizioni?.([]);
  };
  const normalizzaPesca = () => {
    if (!pesca || confidente || videogioco || (ruoloPesca !== 'visita' && ruoloPesca !== 'obiettivi') || confermaPesca !== firmaPesca || !impostaCondizioni) return;
    imposta({ fascia: 'entrambe', tracciamento: ruoloPesca === 'visita' ? 'svolta' : 'nessuno', sessioni: 1,
      costo: null, paga_yen: null, paga_massima: null,
      doti_json: [], effetti_json: [], quiz_json: null, _effettiDaRisolvere: false, _quizDaRisolvere: false, esiti_json: null, _esitiDaRisolvere: false });
    impostaCondizioni([]);
    setConfermaPesca(null);
  };
  /** Cambia tipo impostando il conteggio predefinito per quel tipo; uscendo dai lavori azzera le paghe. */
  const cambiaTipo = (nuovo: string) => imposta({ tipo: nuovo, tracciamento: tracciamentoPerTipo(nuovo), ...(nuovo === 'lavoro' ? {} : { paga_yen: null, paga_massima: null }) });
  return (
    <div className="flex flex-col gap-5">
      {/* un avviso solo per i nomi che non si sono caricati (Confidenti del selettore, quartieri e attività degli effetti) */}
      <AvvisoNomiPerEffetti errore={nomi.erroreNomi} riprova={nomi.riprovaNomi} disabilitato={disabilitato} />
      {/* le parti salvate che l'editor non sa rappresentare: in testa, prima delle sezioni, perché bloccano il salvataggio */}
      {(['effetti', 'quiz'] as const).filter((c) => dati[`_${c}DaRisolvere`]).map((c) => <div key={c} className="flex flex-col gap-2 rounded-md border border-warning p-3 text-sm">
        <p role="alert" className="m-0">{c === 'effetti' ? 'Gli effetti salvati contengono' : 'Il quiz salvato contiene'} parti che l’editor non sa rappresentare. Il valore originale è conservato finché non scegli esplicitamente la sostituzione.</p>
        <p className="m-0 whitespace-pre-wrap break-all">{typeof dati[`_${c}Raw`] === 'string' ? String(dati[`_${c}Raw`]) : JSON.stringify(dati[`_${c}Raw`])}</p>
        <PulsanteVisivo icona={<IconaAzione chiave={(c === 'quiz' && !dati.quiz_json) || (c === 'effetti' && (dati.effetti_json as VoceEffetto[]).length === 0) ? 'elimina' : 'scarta'} dimensione={22} />} titolo={c === 'quiz' && !dati.quiz_json ? 'Rimuovi il quiz non leggibile' : c === 'effetti' && (dati.effetti_json as VoceEffetto[]).length === 0 ? 'Sostituisci con nessun effetto' : `Usa ${c === 'effetti' ? 'gli effetti leggibili dell’editor' : 'il quiz leggibile dell’editor'} e scarta le altre parti`} className="min-h-11 self-start" disabled={disabilitato} onClick={() => imposta({ [`_${c}DaRisolvere`]: false })} />
      </div>)}
      <SezioneCampi titolo={videogioco ? 'Videogioco' : 'Attività'}>
        <Campo nome="nome" etichetta={videogioco ? 'Nome del videogioco' : 'Nome dell’attività'} dati={dati} imposta={imposta} disabilitato={disabilitato} max={160} largo />
        {!videogioco && (
          <Blocco largo>
            <SelettoreIcone compatto etichetta="Tipo" valore={tipo} opzioni={OPZIONI_TIPO} disabilitato={disabilitato} onCambia={cambiaTipo} />
          </Blocco>
        )}
        {(!videogioco || !!confidente) && <Blocco>
          <Selettore etichetta="Progressione del Confidente" valore={confidente} opzioni={opzioniConfidenti} vuoto="Attività autonoma"
            disabilitato={disabilitato} onCambia={(chiave) => imposta({ confidente_chiave: chiave || null })} />
        </Blocco>}
        <Blocco>
          <Selettore etichetta="Fonte della pesca" valore={pesca} vuoto="Nessuna fonte pesca: rimuovi il collegamento" disabilitato={disabilitato}
            opzioni={[{ chiave: REGOLA_PESCA, nome: 'Ichigaya · Persona 5 Royal' }, ...(pesca && pesca !== REGOLA_PESCA ? [{ chiave: pesca, nome: `${pesca} · riferimento conservato` }] : [])]}
            onCambia={v => { setConfermaPesca(null); imposta(v ? { pesca_regola_chiave: v } : { pesca_regola_chiave: null, pesca_ruolo: null }); }} />
        </Blocco>
        <Campo nome="dettagli" etichetta="Come funziona, premi, note" tipo="testolungo" dati={dati} imposta={imposta} disabilitato={disabilitato} max={4000} />
      </SezioneCampi>
      {confidente && <SezioneCampi titolo="Confidente">
        <div className="campo--largo flex min-w-0 flex-col gap-2">
          <p className="m-0 text-sm">La guida degli incontri e delle Doti viene dal Confidente. Cambiare questa scelta conserva i campi: risolvi quelli incompatibili prima di salvare. Rimuovere il collegamento conserva i valori attuali.</p>
          {fonte?.chiave === confidente ? <div className="flex flex-col gap-1"><p className="m-0 text-xs text-text-muted">Guida attualmente salvata; le modifiche del modulo non sono ancora applicate.</p><FonteConfidenteAttivita fonte={fonte} /></div> : <Link className="touch inline-flex self-start items-center text-primary-testo" to={`/confidenti/${encodeURIComponent(confidente)}`}>Consulta la progressione del Confidente</Link>}
          {incompatibiliConfidente.length > 0 && <div className="flex flex-col gap-2 rounded-md border border-warning p-3 text-sm">
            <p role="alert" className="m-0">Da risolvere: {incompatibiliConfidente.map((c) => NOMI_CAMPI[c] ?? c).join(', ')}.</p>
            {incompatibiliConfidente.includes('doti_json') && <p className="m-0 whitespace-pre-wrap break-words">Doti storiche: {JSON.stringify(dati.doti_json ?? dati._dotiStoriche)}</p>}
            <p className="m-0">Il comando seguente toglie fascia, condizioni, effetti e sblocco propri, quiz, costo e paghe numeriche; imposta nessun conteggio e una sessione{!giaCollegata ? ' e svuota le Doti storiche' : ''}. Comprende le parti non leggibili riportate sotto. I testi di paga, premi e altri effetti vanno risolti nei rispettivi campi. Dettagli e note personali restano.</p>
            <PulsanteVisivo tono="secondario" compatto className="self-start" icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Usa la progressione del Confidente e rimuovi i campi propri elencati"
              disabled={disabilitato || !impostaCondizioni || !!pesca} onClick={normalizzaFonte} />
          </div>}
        </div>
      </SezioneCampi>}
      {pesca && <SezioneCampi titolo="Pesca">
        <div className="campo--largo flex min-w-0 flex-col gap-2">
          <Selettore etichetta="Ruolo nella pesca" valore={testoDi(ruoloPesca)} vuoto="Scegli il ruolo" disabilitato={disabilitato}
            opzioni={[{ chiave: 'visita', nome: 'Visita: un solo turno' }, { chiave: 'obiettivi', nome: 'Obiettivi della stessa visita: nessun turno aggiuntivo' }]}
            onCambia={v => { setConfermaPesca(null); imposta({ pesca_ruolo: v || null }); }} />
          <p className="m-0 text-sm">Condizioni, profili e quote provengono dalla fonte pesca. Cambiare la scelta conserva tutti gli altri campi; rimuovere il collegamento rimuove soltanto regola e ruolo. I contatori personali non vengono toccati.</p>
          {fontePesca?.chiave === pesca && (ruoloPesca === 'visita' || ruoloPesca === 'obiettivi') && <div className="flex min-w-0 flex-col gap-1"><p className="m-0 text-xs text-text-muted">Fonte attualmente salvata; le modifiche del modulo non sono ancora applicate.</p><FontePescaAttivita fonte={{ regola: fontePesca, ruolo: ruoloPesca }} /></div>}
          {confidente && <p role="alert" className="m-0 text-error-testo">La fonte Confidente e la fonte pesca sono incompatibili. Rimuovi esplicitamente uno dei due collegamenti: nessuna scelta viene eliminata automaticamente.</p>}
          {videogioco && <p role="alert" className="m-0 text-error-testo">Il modulo Videogioco richiede round e conteggio per sessioni; la fonte pesca richiede un turno per visita oppure nessun turno aggiuntivo per gli obiettivi. Rimuovi il collegamento pesca per conservare questa classificazione.</p>}
          {!!incompatibiliPesca.length && <div className="flex min-w-0 flex-col gap-2 rounded-md border border-warning p-3 text-sm">
            <p role="alert" className="m-0">Campi propri incompatibili con la fonte pesca: {incompatibiliPesca.map(c => NOMI_CAMPI[c] ?? c).join(', ')}.</p>
            <dl className="m-0 flex min-w-0 flex-col gap-1">{incompatibiliPesca.map(c => <div key={c}><dt>{NOMI_CAMPI[c] ?? c}</dt><dd className="m-0 whitespace-pre-wrap break-all testo-12">{typeof valoreIncompatibile(c) === 'string' ? String(valoreIncompatibile(c)) : JSON.stringify(valoreIncompatibile(c)) ?? 'null'}</dd></div>)}</dl>
            <p className="m-0">Il comando rimuove esplicitamente condizioni proprie, effetti e Doti storiche, costo, paghe, sblocco e altri effetti in prosa e quiz. Imposta giorno e sera, una sessione e {ruoloPesca === 'visita' ? 'un turno per visita' : ruoloPesca === 'obiettivi' ? 'nessun conteggio aggiuntivo' : 'il conteggio del ruolo che devi scegliere'}. Dettagli, regole, premi e note rimangono.</p>
            <label className="touch flex items-start gap-2"><input className="h-5 w-5 shrink-0" type="checkbox" checked={confermaPesca === firmaPesca} disabled={disabilitato || !!confidente || videogioco || (ruoloPesca !== 'visita' && ruoloPesca !== 'obiettivi')} onChange={e => setConfermaPesca(e.target.checked ? firmaPesca : null)} /><span>Ho riletto i valori mostrati e confermo la rimozione di questi campi propri.</span></label>
            <PulsanteVisivo tono="secondario" compatto className="self-start" icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Usa la fonte pesca e rimuovi i campi propri dichiarati"
              disabled={disabilitato || !!confidente || videogioco || !impostaCondizioni || confermaPesca !== firmaPesca || (ruoloPesca !== 'visita' && ruoloPesca !== 'obiettivi')} onClick={normalizzaPesca} />
          </div>}
        </div>
      </SezioneCampi>}
      <SezioneCampi titolo="Dove e quando">
        {campiPropri && <Blocco largo>
          <SelettoreIcone compatto etichetta="Quando" valore={testoDi(dati.fascia)} opzioni={OPZIONI_FASCIA} disabilitato={disabilitato} onCambia={(fascia) => imposta({ fascia })} />
          {confidente && <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="ricalcola" dimensione={22} />} titolo="Usa le fasce del Confidente" disabled={disabilitato} onClick={() => imposta({ fascia: null })} />}
          {pesca && <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="ricalcola" dimensione={22} />} titolo="Usa giorno e sera con i profili pesca" disabled={disabilitato} onClick={() => imposta({ fascia: 'entrambe' })} />}
        </Blocco>}
        <SceltaLuogo etichetta="Dove si svolge" valore={{ sede: (dati.sede_chiave as string | null) ?? null, quartiere: (dati.luogo_chiave as string | null) ?? null }} disabilitato={disabilitato}
          onCambia={(v) => imposta({ sede_chiave: v.sede, luogo_chiave: v.quartiere })} />
        {campiPropri && <Campo nome="sessioni" etichetta={videogioco ? 'Round per finirlo' : 'Sessioni'} tipo="numero" dati={dati} imposta={imposta} disabilitato={disabilitato} aiuto={videogioco ? 'Quanti round servono per completarlo' : 'Se si completa in più volte'} />}
        {campiPropri && !videogioco && (
          <Blocco>
            <Selettore etichetta="Come si conta nella partita" valore={testoDi(dati.tracciamento)} ricerca="mai" disabilitato={disabilitato}
              opzioni={TRACCIAMENTI_ATTIVITA.map((t) => ({ chiave: t.chiave, nome: t.nome }))} onCambia={(tracciamento) => imposta({ tracciamento })} />
          </Blocco>
        )}
      </SezioneCampi>
      {/* il costo per tutti (non per i videogiochi), la paga solo per i lavori: senza nessuno dei due la sezione non c'è */}
      {campiPropri && ((!videogioco && tipo !== 'videogioco') || lavoro || incompatibili.includes('paga_yen') || incompatibili.includes('paga_massima')) && (
        <SezioneCampi titolo={lavoro || incompatibili.includes('paga_yen') || incompatibili.includes('paga_massima') ? 'Costo e paga' : 'Costo'}>
          {!videogioco && tipo !== 'videogioco' && <Campo nome="costo" etichetta="Costo in yen" tipo="numero" dati={dati} imposta={imposta} disabilitato={disabilitato} aiuto="Vuoto se è gratis" />}
          {(lavoro || incompatibili.includes('paga_yen')) && <Campo nome="paga_yen" etichetta="Paga in yen" tipo="numero" dati={dati} imposta={imposta} disabilitato={disabilitato} aiuto="A turno" />}
          {(lavoro || incompatibili.includes('paga_massima')) && <Campo nome="paga_massima" etichetta="Paga massima in yen" tipo="numero" dati={dati} imposta={imposta} disabilitato={disabilitato} aiuto="Con i bonus, se la guida la dichiara" />}
        </SezioneCampi>
      )}
      {campiPropri && <SezioneCampi titolo="Effetti ed esiti">
        {/* contata per volte (un lavoro): ogni turno dice i suoi punti, il primo le voci senza la spunta, gli altri quelle «dalla seconda volta in
            poi». Le Doti di un turno dalla voce del Diario entrano nelle ricevute e si applicano con «Applica» (`motoreDiario.beneficiLegacy`);
            quelle del + del contatore restano un promemoria da segnare a mano (`avvisaDotiDaSegnare` in Progressi) */}
        <Blocco largo>
          <EditorEffetti voci={dati.effetti_json as VoceEffetto[]} onCambia={(v) => imposta({ effetti_json: v })} disabilitato={disabilitato || !!dati._effettiDaRisolvere} {...nomi}
            conRipetuto={testoDi(dati.tracciamento) === 'svolta'}
            aiuto={testoDi(dati.tracciamento) === 'svolta'
              ? 'Il gioco dà questi punti a ogni turno: spuntando la voce della giornata si applicano con «Applica» sulla voce; col contatore in Partita → Progressi l\'app te li ricorda e li segni tu nella scheda Doti. Il primo turno le voci senza la spunta, dal secondo in poi quelle con «vale dalla seconda volta in poi». Un lavoro che dà sempre la stessa Dote ha le due voci uguali.'
              : undefined} />
        </Blocco>
        {/* L13: gli esiti scelti alla spunta, solo per un'attività autonoma contata per volte (Confidente e pesca hanno la loro progressione) */}
        {!videogioco && !confidente && !pesca && (testoDi(dati.tracciamento) === 'svolta' || dati.esiti_json != null) && <>
          {!!dati._esitiDaRisolvere && <div className="campo--largo flex flex-col gap-2 rounded-md border border-warning p-3 text-sm">
            <p role="alert" className="m-0">Gli esiti salvati contengono parti che l’editor non sa rappresentare. Il valore originale è conservato finché non scegli esplicitamente la sostituzione.</p>
            <p className="m-0 whitespace-pre-wrap break-all">{typeof dati._esitiRaw === 'string' ? dati._esitiRaw : JSON.stringify(dati._esitiRaw)}</p>
            <PulsanteVisivo icona={<IconaAzione chiave="scarta" dimensione={22} />} titolo="Sostituisci con gli esiti dell’editor" className="min-h-11 self-start" disabled={disabilitato} onClick={() => imposta({ _esitiDaRisolvere: false })} />
          </div>}
          <EditorEsiti esiti={(dati.esiti_json as EsitiAttivita | null) ?? null} onCambia={(esiti_json) => imposta({ esiti_json })} disabilitato={disabilitato || !!dati._esitiDaRisolvere}
            chiaviSalvate={new Set((normalizzaEsitiAttivita(jsonDi<unknown>(dati._esitiRaw, null))?.esiti ?? []).map((e) => e.chiave))} />
        </>}
      </SezioneCampi>}
      {/* la guida del quiz è dei lavori (generica per tutti, scelta dell'utente 2026-10-17); un'altra attività che ne ha già una la tiene */}
      {campiPropri && (lavoro || !!dati.quiz_json) && (
        <SezioneCampi titolo="Guida del quiz">
          <EditorQuiz quiz={(dati.quiz_json as QuizAttivita | null) ?? null} onCambia={imposta} disabilitato={disabilitato || !!dati._quizDaRisolvere} />
        </SezioneCampi>
      )}
    </div>
  );
}
