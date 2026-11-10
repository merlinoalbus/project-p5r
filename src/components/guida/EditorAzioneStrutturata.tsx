// ============================================================
// EditorAzioneStrutturata — tipo, «Quale» e «Spuntando succede» di una cosa da fare (finestra della voce, tavole approvate 2026-10-24)
// ============================================================
//
// Richiesta dell'utente (2026-09-30): le azioni della guida, e quelle che aggiunge lui, si devono poter classificare e collegare come
// le altre, e i punti della spunta vengono dagli effetti dichiarati, non dal testo delle note. Dal 2026-10-24:
//   - il tipo (è l'icona della voce) si sceglie da una griglia di icone e decide a che cosa si collega la voce;
//   - «Quale» si sceglie guardando (ritratti, emblemi, icone) e porta con sé l'effetto della spunta, già compilato;
//   - l'effetto si legge come frase nel riquadro «Spuntando succede» e si regola solo il necessario.
// L13 (ondata 4a, richiesta dell'utente sui due acquisti della stessa voce in due punti diversi): «Spuntando succede» è l'elenco di TUTTI
// gli effetti (`ElencoEffettiVoce`), tutti allo stesso livello e con lo stesso editor per tipo; niente più «effetto principale» con i suoi
// controlli e «Effetti aggiuntivi» ripiegati. In una voce d'acquisto collegata a un negozio, sopra l'elenco, gli «Acquisti da questo
// negozio» con articoli, copie e totale. Il formato degli effetti non cambia (`EffettoVoce`). Le due parti stanno in due colonne della
// finestra (`ModuloVoceGiornata`), quindi sono due componenti.
// ============================================================

import { useMemo, useState, type ReactNode } from 'react';
import { SelettoreIcone } from '../shared/SelettoreIcone';
import { AssetImg } from '../shared/AssetImg';
import { DialogoRango } from '../confidenti/DialogoRango';
import { useDettaglioConfidente } from '../partita/useDettaglioConfidente';
import { RigaEffettoVoceLegacy } from './RigaEffettoVoceLegacy';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { FilaScelta } from './FilaScelta';
import { SceltaQuale } from './SceltaQuale';
import { ElencoEffettiVoce } from './ElencoEffettiVoce';
import { AcquistiNegozioVoce } from './AcquistiNegozioVoce';
import { eArticoloDelNegozio } from '../../utils/effettiDellaVoce';
import type { ElenchiVoce } from '../../utils/opzioniEffetti';
import { EffettiNonConvertibili } from './EditorEffettiVoce';
import { RIFERIMENTO_DI_TIPO, TIPI_AZIONE, TIPI_RIFERIMENTO_AZIONE, type EffettoAzione, type TipoAzione } from '../../../shared/effettiAzione';
import { NOME_QUALE } from '../../utils/elencoQuale';
import { campiCompleti, effettoCompleto, type CampiStrutturati } from '../../utils/azioneStrutturata';
import { Ripiegabile } from '../shared/Ripiegabile';
import { TestoNote } from '../shared/TestoNote';
import { NOME_FAMIGLIA_EFFETTO, cambiaCollegamento, collegamentoSuggerito, contestoDa, eAltroGenere, effettoCompilatoCheSiPerde, fraseEffetto, indiceDelCollegamento, nomiEffettiDa, tipoQuale, type NomiEffetti } from '../../utils/effettoAutomatico';
import { conferma } from '../../stores/confermaStore';
import { RANGO_MASSIMO_CONFIDENTE } from '../../../shared/puntiConfidenti';
import { useIdStabili } from '../../hooks/useIdStabili';

interface Props {
  valore: CampiStrutturati;
  onCambia: (v: CampiStrutturati) => void;
  elenchi: ElenchiVoce;
}

/** Il rango atteso: Nessuno, 1…9 e MAX (il rango massimo, `RANGO_MASSIMO_CONFIDENTE`), con le cifre del rango (`ui/rango-N`) quando ci sono. */
const RANGHI = [{ chiave: '', nome: 'Nessuno' }, ...Array.from({ length: RANGO_MASSIMO_CONFIDENTE }, (_, i) => {
  const n = i + 1;
  const massimo = n === RANGO_MASSIMO_CONFIDENTE;
  return { chiave: String(n), nome: massimo ? 'Rango MAX' : `Rango ${n}`, contenuto: <AssetImg nome={massimo ? 'ui/rango-max' : `ui/rango-${n}`} alt="" decorativa className="h-7 w-7 object-contain" fallback={<span className="font-display testo-16 leading-none">{massimo ? 'MAX' : n}</span>} /> };
})];

/** Anteprima, mentre si scrive la voce, delle risposte migliori dell'evento del rango atteso: le stesse compariranno fra le note della
 *  voce (progetto dei Confidenti approvato dall'utente, 2026-10-24). Sola lettura, dal dettaglio del Confidente (in cache). */
function AnteprimaRisposte({ chiave, rango }: { chiave: string; rango: number }) {
  const { dati, caricamento, errore } = useDettaglioConfidente(chiave);
  const [chiusi, setChiusi] = useState<Record<number, boolean>>({});
  const dialoghi = (dati?.dialoghi ?? []).filter((d) => d.rango === rango);
  return (
    <div className="risposte-voce" role="group" aria-label={`Anteprima delle risposte migliori del rango ${rango}`}>
      <span className="risposte-voce__titolo">Anteprima · risposte migliori del rango {rango}</span>
      <span className="testo-12 text-text-muted">Compariranno fra le note della voce; spuntandola, la scelta delle note parte da qui.</span>
      {caricamento && <span className="testo-12 text-text-muted" role="status">Carico le risposte…</span>}
      {errore && <span className="testo-12 text-error-testo" role="alert">Risposte non disponibili: {errore}</span>}
      {dati && dialoghi.length === 0 && <span className="testo-12 text-text-muted">Nessun dialogo documentato per il rango {rango}.</span>}
      {dialoghi.length > 0 && (
        <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
          {dialoghi.map((d) => <DialogoRango key={d.id} d={d} aperto={!chiusi[d.id]} onToggle={() => setChiusi((c) => ({ ...c, [d.id]: !c[d.id] }))} />)}
        </ul>
      )}
    </div>
  );
}

/** Il nome di un elemento collegabile, dagli elenchi. */
function nomeDi(rif: NonNullable<CampiStrutturati['riferimento']>, elenchi: ElenchiVoce): string | null {
  const a = elenchi.azione;
  const lista = rif.tipo === 'confidente' ? a.confidenti : rif.tipo === 'dungeon' ? a.dungeon : rif.tipo === 'richiesta' ? a.richieste : rif.tipo === 'libro' ? a.libri : rif.tipo === 'film' ? a.film : rif.tipo === 'attivita' ? a.attivita : rif.tipo === 'negozio' ? a.negozi : a.doti;
  return lista.find((v) => v.chiave === rif.chiave)?.nome ?? null;
}
/** Il nome dell'elemento collegato, dagli elenchi. */
const nomeCollegato = (valore: CampiStrutturati, elenchi: ElenchiVoce): string | null => (valore.riferimento ? nomeDi(valore.riferimento, elenchi) : null);
const nomeGenere = (tipo: string): string => TIPI_RIFERIMENTO_AZIONE.find((g) => g.chiave === tipo)?.nome.toLowerCase() ?? tipo;

/**
 * Colonna sinistra: la griglia dei 13 tipi (le icone delle voci, con il nome sotto) e «Quale» del tipo scelto. Cambiare tipo azzera
 * il collegamento e l'effetto che il vecchio tipo aveva dato (se nato in questa finestra); scegliere «Quale» compila l'effetto. Una voce
 * salvata senza collegamento i cui effetti ne indicano uno solo lo PROPONE («Collega a…»): non si scrive da solo.
 */
export function SceltaTipoQuale({ valore, onCambia, elenchi, parte = 'tutto', qualeAperta, onQualeAperta }: Props & {
  /** L6-06: la finestra della voce mette il tipo nella colonna a sinistra e «Quale» in quella a destra, sopra gli effetti che «Quale» compila:
   *  le due parti sono lo stesso componente, con la stessa logica di cambio (`applica`), disegnate separatamente. */
  parte?: 'tutto' | 'tipo' | 'quale';
  /** La finestra della griglia di «Quale»: con le due parti disegnate separatamente la tiene chi le usa (la parte del tipo la apre, quella di
   *  «Quale» la mostra); senza, la tiene il componente. */
  qualeAperta?: boolean;
  onQualeAperta?: (aperta: boolean) => void;
}) {
  const [qualeApertaQui, setQualeApertaQui] = useState(false);
  const finestraQuale = qualeAperta ?? qualeApertaQui;
  const apriQuale = onQualeAperta ?? setQualeApertaQui;
  const ctx = useMemo(() => contestoDa(elenchi.azione), [elenchi.azione]);
  const rif = valore.riferimento;
  const tq = tipoQuale(valore.tipo, rif);
  // Collegamento salvato di altro genere (negozio su un lavoro): non si tocca finché l'utente non sceglie qui, e allora la sostituzione
  // è dichiarata prima del salvataggio. «Quale» elenca il genere del tipo e nessuna tessera risulta scelta.
  const altro = eAltroGenere(valore.tipo, rif);
  const suggerito = valore.effettiVoce ? collegamentoSuggerito(valore.tipo, rif, valore.effettiVoce) : null;
  const nomiFrasi = useMemo(() => nomiEffettiDa(elenchi.azione, elenchi.effetti, elenchi.fascia), [elenchi.azione, elenchi.effetti, elenchi.fascia]);
  /**
   * Cambia tipo o «Quale». Se il cambio toglierebbe un effetto che l'utente ha compilato in questa finestra (ritoccato o aggiunto a mano, non
   * quello che nasce da solo), prima lo dice e chiede conferma: niente si perde in silenzio.
   */
  const applica = async (tipo: TipoAzione, nuovoRif: CampiStrutturati['riferimento']) => {
    const perso = effettoCompilatoCheSiPerde(valore, tipo, nuovoRif, ctx);
    if (perso && !(await conferma({
      titolo: 'Togliere l’effetto che hai compilato?',
      testo: `Cambiando ${tipo !== valore.tipo ? 'il tipo' : '«Quale»'} l’effetto «${NOME_FAMIGLIA_EFFETTO[perso.tipo]}: ${fraseEffetto(perso, nomiFrasi)}», che hai compilato in questa finestra, verrà tolto dall’elenco.`,
      etichetta: 'Togli e cambia',
    }))) return;
    onCambia(cambiaCollegamento(valore, tipo, nuovoRif, ctx));
    // L6-06: un tipo nuovo che si collega a qualcosa apre subito la finestra di «Quale» (prima il tipo, poi l'elenco filtrato): un tocco
    // per il tipo e uno per l'elemento, come quando la griglia stava nella voce
    if (tipo !== valore.tipo && !nuovoRif && tipoQuale(tipo, null)) apriQuale(true);
  };
  const tipoGrid = (
    <div className="flex flex-col gap-1.5">
      <span className="testo-13 text-text-secondary">Tipo — è l’icona della voce</span>
      <SelettoreIcone etichetta="Tipo della voce" compatto valore={valore.tipo} opzioni={TIPI_AZIONE.map((t) => ({ chiave: t.chiave, nome: t.nome, categoria: t.chiave }))}
        onCambia={(t) => { if (t !== valore.tipo) void applica(t as TipoAzione, null); }} />
    </div>
  );
  if (parte === 'tipo') return tipoGrid;
  if (parte === 'quale' && !(altro && rif) && !suggerito && !tq) return null;
  return (
    <div className="flex flex-col gap-3 min-w-0">
      {parte === 'tutto' && tipoGrid}
      {altro && rif && (
        <p className="m-0 testo-13 break-words" role="status">
          Collegata a: {nomeCollegato(valore, elenchi) ?? rif.chiave} ({nomeGenere(rif.tipo)}). Scegliendo un elemento qui ({NOME_QUALE[tq!].toLowerCase()}) questo collegamento verrà sostituito.
        </p>
      )}
      {suggerito && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2" role="group" aria-label="Collegamento indicato dagli effetti">
          <span className="min-w-0 flex-1 basis-48 testo-13 break-words">Gli effetti di questa voce indicano: <strong>{nomeDi(suggerito, elenchi) ?? suggerito.chiave}</strong> ({nomeGenere(suggerito.tipo)}). La voce non è collegata.</span>
          <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="esegui" dimensione={20} />} titolo="Collega" aria-label={`Collega la voce a ${nomeDi(suggerito, elenchi) ?? suggerito.chiave}`}
            onClick={() => onCambia(cambiaCollegamento(valore, valore.tipo, suggerito, ctx))} />
        </div>
      )}
      {tq && (
        <SceltaQuale tipo={tq} elenchi={elenchi.azione} valore={rif && rif.tipo === tq ? rif.chiave : ''} soloTurni={valore.tipo === 'lavoro'}
          onCambia={(chiave) => void applica(valore.tipo, chiave ? { tipo: tq, chiave } : null)} finestraAperta={finestraQuale} onFinestra={apriQuale} />
      )}
    </div>
  );
}

/**
 * Colonna destra, in alto: «Spuntando succede». Sopra, quello che dice il tipo (l'incontro e il rango atteso di un Confidente, le
 * infiltrazioni di un Palazzo, «scegli Quale»); per un acquisto da un negozio gli articoli con copie e totale; poi l'elenco di TUTTI gli
 * altri effetti. Una voce di cui il formato originario degli effetti non si converte mostra l'avviso e il testo originario; una senza
 * elenco unico degli effetti (formato storico) conserva i vecchi controlli.
 */
export function SpuntandoSuccede({ valore, onCambia, elenchi, nomi, fatta, apertaDiPartenza = false }: Props & { nomi: NomiEffetti; fatta?: boolean; apertaDiPartenza?: boolean }) {
  const righe = valore.effettiVoce;
  const rif = valore.riferimento;
  const nome = nomeCollegato(valore, elenchi);
  const frase = (t: string) => <p className="m-0 testo-13 break-words">{t}</p>;
  const tq = RIFERIMENTO_DI_TIPO[valore.tipo];

  let corpo: ReactNode;
  if (righe === undefined && valore.fonteEffetti) {
    corpo = <EffettiNonConvertibili valore={valore} onRicostruisci={() => onCambia({ ...valore, effettiVoce: [] })} />;
  } else if (righe === undefined) {
    corpo = <EffettiStorici valore={valore} onCambia={onCambia} elenchi={elenchi} />;
  } else {
    const negozio = valore.tipo === 'acquisto' && rif?.tipo === 'negozio' ? rif.chiave : null;
    let contesto: ReactNode = null;
    if (valore.tipo === 'confidente') {
      const rango = valore.rangoAtteso;
      contesto = nome && rif ? (
        <>
          {frase(`Incontro con ${nome} (la Dote dell’incontro, se c’è) e le note della risposta che scegli alla spunta.`)}
          <span className="testo-13 text-text-secondary">Rango atteso</span>
          <FilaScelta etichetta="Rango atteso" valore={rango === null ? '' : String(rango)} opzioni={RANGHI} onCambia={(v) => onCambia({ ...valore, rangoAtteso: v ? Number(v) : null })} />
          {rango !== null && frase(rango === RANGO_MASSIMO_CONFIDENTE ? `Con il rango atteso MAX la spunta porta ${nome} al rango massimo.` : `Con il rango atteso ${rango} la spunta porta ${nome} al rango ${rango}.`)}
          {rango !== null && <AnteprimaRisposte chiave={rif.chiave} rango={rango} />}
        </>
      ) : frase('Scegli il Confidente in «Quale»: alla spunta si registra l’incontro e si scelgono le note.');
    } else if (valore.tipo === 'palazzo') {
      contesto = frase('Le infiltrazioni si scelgono sulla voce, come prima.');
    } else if ((valore.tipo === 'esame' && !righe.some((r) => r.effetto.tipo === 'domanda')) || (valore.tipo === 'trama' && !righe.some((r) => r.effetto.tipo === 'storia'))) {
      contesto = frase(valore.tipo === 'esame'
        ? 'La domanda del giorno si aggiunge qui sotto con «Aggiungi un effetto» → «Domanda risposta»: la spunta la segna come risposta.'
        : 'L’evento di storia si aggiunge qui sotto con «Aggiungi un effetto» → «Evento di storia»: la spunta lo segna avvenuto.');
    } else if (tq && (!rif || rif.tipo !== tq)) {
      contesto = frase(valore.tipo === 'acquisto'
        ? 'Scegli il negozio in «Quale»: qui compariranno gli articoli da segnare comprati.'
        : `Scegli ${NOME_QUALE[tq].toLowerCase()} in «Quale»: l’effetto che gli corrisponde si aggiunge da solo a questo elenco (o si riconosce fra quelli che ci sono già).`);
    } else if ((valore.tipo === 'attivita' || valore.tipo === 'lavoro') && rif && indiceDelCollegamento(righe, valore.tipo, rif) < 0) {
      contesto = frase(valore.tipo === 'lavoro' ? 'Questa attività non si conta per turni: la spunta registra che l’hai fatta, più gli effetti qui sotto.' : 'Questa attività non ha un avanzamento da segnare: la spunta registra che l’hai fatta, più gli effetti qui sotto.');
    }
    corpo = (
      <>
        {contesto}
        {negozio && <AcquistiNegozioVoce valore={valore} onCambia={onCambia} elenchi={elenchi} nomi={nomi} negozio={negozio} nomeNegozio={nome} />}
        {negozio && <h4 className="m-0 testo-13 font-semibold">Altri effetti</h4>}
        <ElencoEffettiVoce valore={valore} onCambia={onCambia} elenchi={elenchi} nomi={nomi} fatta={fatta} altrove={negozio ? (r) => eArticoloDelNegozio(r, negozio) : undefined} />
      </>
    );
  }
  // L6-06: «Spuntando succede» è ripiegato (una riga di riepilogo) per una voce che c'è già; si apre da sé con una voce nuova, con qualcosa da
  // completare o con effetti da correggere (formato storico o non convertibile), e si tiene aperto finché c'è da completare
  const quale = tq && (!rif || rif.tipo !== tq) ? NOME_QUALE[tq].toLowerCase() : null;
  const frasi = (righe ?? []).map((r) => (effettoCompleto(r.effetto) ? fraseEffetto(r.effetto, nomi) : `${NOME_FAMIGLIA_EFFETTO[r.effetto.tipo]}: da completare`));
  const rangoAtteso = valore.tipo === 'confidente' && valore.rangoAtteso !== null ? `Rango atteso ${valore.rangoAtteso === RANGO_MASSIMO_CONFIDENTE ? 'MAX' : valore.rangoAtteso}` : null;
  const riepilogo = righe === undefined
    ? 'Effetti da rivedere: apri per correggerli.'
    : quale && frasi.length === 0 ? `Scegli ${quale} in «Quale»: gli effetti compariranno qui.`
    : <TestoNote testo={[rangoAtteso, frasi.length === 0 ? 'Nessun effetto: la spunta registra solo che l’hai fatta' : `${frasi.length} ${frasi.length === 1 ? 'effetto' : 'effetti'}: ${frasi.join(' · ')}`].filter(Boolean).join(' · ')} />;
  return (
    <Ripiegabile titolo="Spuntando succede" variante="riquadro" riepilogo={riepilogo} apertaDiPartenza={apertaDiPartenza || righe === undefined} forzaAperta={!campiCompleti(valore)}>
      {corpo}
    </Ripiegabile>
  );
}

/** Voci col solo formato storico (`produce`, senza elenco unico degli effetti): i controlli di sempre, finché la voce non si converte. */
function EffettiStorici({ valore, onCambia, elenchi }: Props) {
  const imposta = (p: Partial<CampiStrutturati>) => onCambia({ ...valore, ...p });
  const nuovo: EffettoAzione = { tipo: 'dote', dote: 'fascino', note: 2 };
  // le righe hanno uno stato loro (i selettori): la chiave è un id stabile, non l'indice (`useIdStabili`)
  const chiavi = useIdStabili(valore.produce.length);
  return (
    <div className="flex flex-col gap-2">
      {valore.produce.length === 0 && <p className="m-0 testo-12 text-text-muted">Nessun effetto: la spunta segna solo che l’hai fatto.</p>}
      {/* 2026-10-27 («"Le Doti le segni tu nella scheda Doti." da togliere nelle voci del diario»): nessuna nota sulle Doti né su letture e
          turni. Le Doti della spunta si applicano dal pulsante «Applica» sulla voce, che lo dice da solo, e che la spunta segni letture e
          turni è il caso normale di ogni voce (la stessa regola di `shared/riepilogoEffetti.ts`) */}
      <ul className="flex flex-col gap-2 list-none m-0 p-0">
        {valore.produce.map((e, i) => (
          <RigaEffettoVoceLegacy key={chiavi.ids[i]} numero={i + 1} effetto={e} elenchi={elenchi.azione}
            onCambia={(n) => imposta({ produce: valore.produce.map((x, j) => (j === i ? n : x)) })}
            onTogli={() => { chiavi.togli(i); imposta({ produce: valore.produce.filter((_, j) => j !== i) }); }} />
        ))}
      </ul>
      {valore.produce.length < 20 && (
        <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi un effetto" onClick={() => imposta({ produce: [...valore.produce, nuovo] })} />
      )}
    </div>
  );
}
