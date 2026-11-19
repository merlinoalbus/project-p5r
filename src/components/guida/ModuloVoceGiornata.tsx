// ============================================================
// ModuloVoceGiornata — finestra per aggiungere una voce alla giornata o modificarne una, con il suo posto esatto nella fascia
// ============================================================
//
// Una finestra sola per le due situazioni, così i campi restano gli stessi ovunque:
//   nuova  dal pulsante «Aggiungi» di «Di giorno» / «Di sera»
//   voce   una voce che c'è già (della guida o aggiunta): dal 2026-09-30 sono la stessa cosa, canone della guida
// Ridisegnata il 2026-10-24 (tavole approvate dall'utente): due soli generi — «Cosa da fare» (si spunta) e «Promemoria» (solo da
// leggere, senza casella, né tipo né effetti) —; il tipo si sceglie da una griglia di icone e decide il collegamento; «Quale» si sceglie
// guardando e porta con sé l'effetto della spunta. Su desktop due colonne (a sinistra che cosa è, a destra che cosa succede spuntandola e
// quando); su tablet e telefono una colonna, nello stesso ordine, e sul telefono è il foglio dal basso di `Modal`. Scorre solo il corpo.
// L13 (ondata 4a): «Spuntando succede» elenca TUTTI gli effetti, allo stesso livello (niente più «Effetti aggiuntivi» ripiegati); la
// finestra è la `FinestraModifica` comune (piè fisso, conferma prima di chiudere con modifiche non salvate); aperta da «Modifica» di una
// proposta da completare, parte con la proposta già applicata e salvando la proposta risulta applicata (stessa scrittura della voce).
// Ogni voce ha anche il suo **posto** nella fascia (richiesta dell'utente: «devo fare un ordinamento esatto»), che si cambia
// trascinando o con ↑ / ↓. Ogni modifica vale per tutte le partite ed entra nel pacchetto di gioco che si esporta.
// L13 (ondata 9, O9-3): «Si fa solo se», le condizioni che dicono quando la voce è dovuta (l'editor unico `CondizioniEditor`; vuoto = sempre):
// con le condizioni false al giorno della voce, nella partita la voce è «Non dovuta» (la consegna delle televendite senza nessun set comprato).
// L6-06: la griglia di «Quale» e l'editor delle condizioni stanno in due finestre sopra la voce; nella voce restano una riga ciascuno.
// ============================================================

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Segmenti } from '../shared/Segmenti';
import { FinestraModifica } from '../shared/FinestraModifica';
import { aggiornaVoceGiornata, applicaPropostaConversione, creaVoceGiornata, getElenchiAzione, getElenchiEffettiVoce } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { useMedia } from '../../hooks/useMedia';
import { notifica } from '../../stores/notificationStore';
import { NOME_GENERE } from '../../utils/percorso';
import { SceltaTipoQuale, SpuntandoSuccede } from './EditorAzioneStrutturata';
import { PostoVoce } from './PostoVoce';
import { Ripiegabile } from '../shared/Ripiegabile';
import { TIPI_AZIONE } from '../../../shared/effettiAzione';
import type { ElenchiVoce } from '../../utils/opzioniEffetti';
import { STRUTTURA_VUOTA, campiCompleti, strutturaConProposta, strutturaDi } from '../../utils/azioneStrutturata';
import { nomiEffettiDa } from '../../utils/effettoAutomatico';
import { notificaApplicazioni } from '../../utils/applicazioniEffetti';
import type { AzionePercorsoDto, DatiVoceGiornata, FasciaGioco, GenereVoce } from '../../types';
import type { PropostaConversioneDto } from '../../../shared/proposteConversione';
import { segnalaMutazioneEffetti } from '../../services/gestiPartita';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';
import { CondizioniEditor } from './CondizioniEditor';
import { IconaAzione } from '../shared/IconaAzione';
import { IconaArcano } from '../shared/IconaArcano';
import { AnteprimaPersona } from '../shared/AnteprimaPersona';
import { IconSpunta } from '../shared/iconeGuida';
import { IconChevronRight } from '../shared/icons';
import { MASSIMO_REQUISITI_VOCE } from '../../../shared/requisitiVoce';
import type { RequisitoSpillo } from '../../../shared/condizioniSpillo';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

export type SoggettoVoce =
  | { tipo: 'nuova'; fascia: FasciaGioco }
  | { tipo: 'voce'; voce: AzionePercorsoDto; proposta?: PropostaConversioneDto };

const GENERI: ReadonlyArray<{ chiave: GenereVoce; nome: string }> = (['azione', 'promemoria'] as const).map((g) => ({ chiave: g, nome: NOME_GENERE[g] }));
const FASCE: ReadonlyArray<{ chiave: FasciaGioco; nome: string }> = [{ chiave: 'giorno', nome: 'Di giorno' }, { chiave: 'sera', nome: 'Di sera' }];

/** Le righe di un'area di testo perché il testo ci stia tutto anche sul telefono (~36 caratteri per riga nella finestra a 375 px):
 *  niente scorrimento dentro il campo oltre a quello della finestra, fino a un massimo. */
const righe = (testo: string, min: number, max: number) => Math.min(max, Math.max(min, testo.split('\n').reduce((n, r) => n + Math.max(1, Math.ceil(r.length / 36)), 0)));

interface Props {
  soggetto: SoggettoVoce;
  giorno: string;
  /** Tutte le voci del giorno, nel loro ordine: servono per mostrare e scegliere il posto. */
  voci: AzionePercorsoDto[];
  partitaId: number | null;
  onChiudi: () => void;
  /** Dopo un salvataggio riuscito: la giornata va ricaricata. */
  onSalvato: () => void | Promise<void>;
}

/**
 * La finestra della voce: genere, testo e note (aree di testo che crescono col contenuto), tipo e «Quale», tutti gli effetti della spunta,
 * fascia e posto esatto fra le altre voci. «Salva»/«Aggiungi» è attivo solo con un testo e, per una cosa da fare, con i collegamenti e gli
 * effetti completi.
 */
// L12 (passo 8): nel rilascio (sola lettura, voci del diario comprese) il modulo non esiste; la condizione è costante di build, `ModuloVoceGiornataReale` esce dal bundle
export const ModuloVoceGiornata: StrumentoDiModifica<typeof ModuloVoceGiornataReale> = IN_RILASCIO ? NienteInRilascio : ModuloVoceGiornataReale;
function ModuloVoceGiornataReale({ soggetto, giorno, voci, partitaId, onChiudi, onSalvato }: Props) {
  // come nella finestra (`Modal`): il fuoco sul campo apre la tastiera, e su tablet e telefono la tastiera copre metà del foglio;
  // il campo prende il fuoco solo da desktop (≥ 1024 px, la soglia della barra laterale)
  const largo = useMedia('(min-width: 1024px)');
  // gli id dei campi di testo, per collegarli alla loro etichetta
  const idCampo = useId();
  const telefono = useMedia('(max-width: 767px)');
  const voce = soggetto.tipo === 'voce' ? soggetto.voce : null;
  const proposta = soggetto.tipo === 'voce' ? soggetto.proposta ?? null : null;
  /** Le altre voci di una fascia, nel loro ordine (senza quella che si modifica). */
  const altreDi = (f: FasciaGioco) => voci.filter((v) => v.fascia === f && v.uid !== voce?.uid);
  /** Il posto di partenza in una fascia: dov'è la voce, se è la sua; altrimenti in fondo. */
  const postoIniziale = (f: FasciaGioco) => {
    if (voce && voce.fascia === f) {
      const i = voci.filter((v) => v.fascia === f).findIndex((v) => v.uid === voce.uid);
      if (i >= 0) return i;
    }
    return altreDi(f).length;
  };
  /** I campi com'erano all'apertura (con la proposta, se c'è, già applicata): servono a sapere se ci sono modifiche da salvare. */
  const [iniziali] = useState(() => {
    const fascia = voce?.fascia ?? (soggetto.tipo === 'nuova' ? soggetto.fascia : 'giorno');
    const salvata = voce ? strutturaDi(voce) : STRUTTURA_VUOTA;
    return {
      genere: (voce?.genere ?? 'azione') as GenereVoce, testo: voce?.azione ?? '', note: voce?.note ?? '', fascia,
      posizione: postoIniziale(fascia), struttura: proposta ? strutturaConProposta(salvata, proposta) : salvata,
      // L13 (O9-3): quando la voce è dovuta («Si fa solo se»); vuoto = sempre
      condizioni: (voce?.condizioni ?? []) as RequisitoSpillo[],
      // i requisiti «da avere in scorta» (arcani o Persona specifiche, in ordine); vuoto = nessuno
      requisiti: (voce?.requisiti ?? []).map((r): RequisitoBozza => ({ arcana: r.arcana, persona: r.persona })),
    };
  });
  const [campi, setCampi] = useState(iniziali);
  const [occupato, setOccupato] = useState(false);
  // L6-06: le due finestre sopra la voce, la griglia di «Quale» (si apre anche scegliendo il tipo, nell'altra colonna) e «Si fa solo se»
  const [qualeAperta, setQualeAperta] = useState(false);
  const [condizioniAperte, setCondizioniAperte] = useState(false);
  const [scortaAperta, setScortaAperta] = useState(false);
  const scrittura = useRef(false);
  /** Unisce una modifica parziale ai campi del modulo. */
  const imposta = (p: Partial<typeof campi>) => setCampi((c) => ({ ...c, ...p }));
  const azione = campi.genere === 'azione';
  const altre = altreDi(campi.fascia);
  const posto = Math.min(campi.posizione, altre.length);
  // «sporca» = c'è qualcosa che chiudendo si perderebbe: i campi sono cambiati rispetto all'apertura. Con una proposta i campi PARTONO già con la
  // proposta applicata (`iniziali`), quindi chiudere senza aver toccato nulla non chiede conferma (la proposta resta aperta); «Salva e applica»
  // salva comunque, perché il salvataggio non dipende da `sporca`.
  const sporca = JSON.stringify(campi) !== JSON.stringify(iniziali);

  const elenchiAzione = useCarica(getElenchiAzione, []);
  const elenchiEffetti = useCarica(getElenchiEffettiVoce, []);
  // Ondata 5 (lotto E): la fascia scelta per la voce dà il prezzo degli articoli (le sfide della Big Bang Burger costano 500 ¥ di sera)
  const elenchi = useMemo<ElenchiVoce | null>(() => (elenchiAzione.dati && elenchiEffetti.dati ? { azione: elenchiAzione.dati, effetti: elenchiEffetti.dati, giorno, fascia: campi.fascia } : null), [elenchiAzione.dati, elenchiEffetti.dati, giorno, campi.fascia]);
  const nomi = useMemo(() => (elenchi ? nomiEffettiDa(elenchi.azione, elenchi.effetti, elenchi.fascia) : null), [elenchi]);
  const erroreElenchi = elenchiAzione.errore ?? elenchiEffetti.errore;
  /** Una cosa da fare che diventa promemoria perde tipo, collegamento ed effetti. */
  const perdeEffetti = !!voce && voce.genere === 'azione' && !azione;

  /**
   * Compone i dati della voce (testo e note ripuliti, note vuote come assenti; tipo, collegamento, rango ed effetti
   * solo per una cosa da fare), crea o aggiorna la voce (o applica la proposta, con gli stessi dati), fa ricaricare la giornata, notifica e
   * chiude. Senza testo non fa nulla.
   */
  const salva = async () => {
    const testo = campi.testo.trim();
    if (!testo || scrittura.current) return;
    const note = campi.note.trim();
    const s = campi.struttura;
    // il posto si manda quando la voce è nuova, cambia fascia o si sposta; altrimenti resta dov'è
    const spostata = !voce || voce.fascia !== campi.fascia || posto !== postoIniziale(campi.fascia);
    const canoniciModificati = s.effettiVoce !== undefined && (!voce || s.fonteEffetti?.stato !== 'convertita' || JSON.stringify(s.effettiVoce) !== JSON.stringify(s.fonteEffetti.effetti.map(({ uid, effetto }) => ({ uid, effetto }))));
    const produceModificato = !s.fonteEffetti && s.effettiVoce === undefined && (!voce || JSON.stringify(s.produce) !== JSON.stringify(voce.produce));
    // da cosa da fare a promemoria: il collegamento e gli effetti salvati si tolgono (il server rifiuta se una partita li ha già spuntati)
    const effettiSalvati = s.fonteEffetti?.stato === 'convertita' && s.fonteEffetti.effetti.length > 0;
    // «Si fa solo se» si manda solo se è cambiato (una voce nuova: solo se ne ha); un promemoria lo perde dal server
    const condizioniCambiate = JSON.stringify(campi.condizioni) !== JSON.stringify(iniziali.condizioni);
    // «Da avere in scorta» si manda solo se è cambiato (assente = invariato; `[]` toglie tutto); un promemoria lo perde dal server
    const requisitiCambiati = JSON.stringify(campi.requisiti) !== JSON.stringify(iniziali.requisiti);
    const dati: DatiVoceGiornata = {
      genere: campi.genere, azione: testo, note: note || null, fascia: campi.fascia,
      ...(spostata ? { posizione: posto } : {}),
      // tipo, collegamento e rango così come li mostra la finestra: L13 (ondata 4a) niente si ricava in silenzio all'apertura, un
      // collegamento nuovo è solo quello che l'utente ha scelto (in «Quale» o con «Collega»). Gli effetti salvati restano intatti.
      ...(azione ? { tipo: s.tipo, riferimento: s.riferimento, rangoAtteso: s.rangoAtteso,
        ...(condizioniCambiate ? { condizioni: campi.condizioni } : {}),
        ...(requisitiCambiati ? { requisiti: campi.requisiti } : {}),
        ...(canoniciModificati ? { effettiVoce: { effetti: s.effettiVoce!, ...(s.fonteEffetti ? { revisioneEffettiAttesa: s.fonteEffetti.revisione } : {}) } } : {}),
        ...(produceModificato ? { produce: s.produce } : {}),
      } : perdeEffetti ? { tipo: 'altro' as const, riferimento: null, rangoAtteso: null,
        ...(effettiSalvati ? { effettiVoce: { effetti: [], revisioneEffettiAttesa: s.fonteEffetti!.revisione } } : {}),
      } : {}),
    };
    scrittura.current = true;
    setOccupato(true);
    let registrata = false;
    // L13 (decisione 19): che cosa hanno fatto gli effetti di stato nelle partite che hanno già spuntato la voce, detto anche se la rilettura fallisce
    let esito: ReturnType<typeof notificaApplicazioni> = null;
    // L6-03: l'avviso del server su una coppia tipo + collegamento nuova e diversa da quella attesa dal tipo (mai un rifiuto: la voce è salvata)
    let avvisoCollegamento: string | undefined;
    try {
      let salvata: AzionePercorsoDto | null = null;
      if (voce && proposta) salvata = (await applicaPropostaConversione(proposta.id, { revisionePropostaAttesa: proposta.revisione, voce: dati }, partitaId ?? undefined)).voce;
      else if (voce) salvata = await aggiornaVoceGiornata(voce.uid, dati, partitaId ?? undefined);
      else salvata = await creaVoceGiornata(giorno, dati, partitaId ?? undefined);
      registrata = true;
      avvisoCollegamento = salvata?.avvisoCollegamento;
      esito = notificaApplicazioni(salvata?.applicazioniEffetti);
      segnalaMutazioneEffetti(null);
      await onSalvato();
      notifica('success', proposta ? 'Proposta applicata: voce modificata nella guida, per tutte le partite.' : voce ? 'Voce modificata nella guida, per tutte le partite.' : 'Voce aggiunta alla guida, per tutte le partite.');
      if (avvisoCollegamento) notifica('warning', avvisoCollegamento);
      if (esito) notifica(esito.tipo, esito.testo, esito.durata);
      onChiudi();
    } catch (err) {
      notifica('error', `${registrata ? 'Voce salvata; aggiornamento della pagina non riuscito: ' : ''}${err instanceof Error ? err.message : 'Salvataggio non riuscito.'}`);
      if (registrata && avvisoCollegamento) notifica('warning', avvisoCollegamento);
      if (registrata && esito) notifica(esito.tipo, esito.testo, esito.durata);
      if (registrata) onChiudi();
    } finally {
      scrittura.current = false;
      setOccupato(false);
    }
  };

  // l'etichetta visibile è anche il nome accessibile del campo (collegata per id e ripetuta in `aria-label`, così nessuno strumento ripiega sul
  // segnaposto, che è solo un esempio)
  const etichettaTesto = azione ? 'Che cosa fare' : 'Che cosa succede';
  const etichettaNote = azione ? 'Note' : 'Dettagli';
  const colonnaSinistra = (
    <div className="voce-colonna">
      <div className="flex flex-col gap-1">
        <Segmenti etichetta="Che cosa è" valore={campi.genere} opzioni={GENERI} onCambia={(g) => imposta({ genere: g })} />
        <span className="testo-12 text-text-muted">{azione ? 'Si spunta e può dare punti.' : 'Solo da leggere: compare in «Di giorno» o «Di sera» senza casella, e non ha tipo né effetti.'}</span>
      </div>
      <label className="flex flex-col gap-1 testo-13 text-text-secondary" htmlFor={`${idCampo}-testo`}>{etichettaTesto}
        {/* eslint-disable-next-line jsx-a11y/no-autofocus -- sullo schermo largo l'editor della voce si apre per scrivere il testo */}
        <textarea id={`${idCampo}-testo`} aria-label={etichettaTesto} className="form-input" rows={righe(campi.testo, 3, 24)} maxLength={2000} value={campi.testo} autoFocus={largo} onChange={(e) => imposta({ testo: e.target.value })}
          placeholder={azione ? 'es. Comprare il Set per retrogaming' : 'es. Domani esami: ripassare la sera prima'} />
      </label>
      <Segmenti etichetta="Quando" valore={campi.fascia} opzioni={FASCE} onCambia={(f) => imposta({ fascia: f, posizione: postoIniziale(f) })} />
      {azione && elenchi && (telefono
        // sul telefono la griglia dei 13 tipi (cinque righe di tessere) si ripiega sul tipo scelto; per una voce nuova parte aperta
        ? <Ripiegabile titolo="Tipo della voce" apertaDiPartenza={!voce} riepilogo={TIPI_AZIONE.find((t) => t.chiave === campi.struttura.tipo)?.nome ?? campi.struttura.tipo}>
            <SceltaTipoQuale parte="tipo" valore={campi.struttura} onCambia={(s) => imposta({ struttura: s })} elenchi={elenchi} qualeAperta={qualeAperta} onQualeAperta={setQualeAperta} />
          </Ripiegabile>
        : <SceltaTipoQuale parte="tipo" valore={campi.struttura} onCambia={(s) => imposta({ struttura: s })} elenchi={elenchi} qualeAperta={qualeAperta} onQualeAperta={setQualeAperta} />)}
    </div>
  );

  // L6-06: ordine dei campi — che cosa è, testo, quando, tipo (colonna sinistra); poi «Quale», gli effetti che «Quale» compila, le note, le
  // condizioni e il posto (colonna destra; sotto i 1024 px le due colonne si dispongono una sotto l'altra, nello stesso ordine). «Quale» è una
  // riga (la griglia sta nella sua finestra); effetti e posto sono ripiegati con il riepilogo; le condizioni sono una riga con il riepilogo
  // e si modificano nella loro finestra: una riga ciascuno finché non si toccano, e il corpo della voce resta sotto gli 800 px a 1280
  const nomeFascia = campi.fascia === 'giorno' ? 'di giorno' : 'di sera';
  const riepilogoCondizioni = campi.condizioni.length === 0 ? 'Nessuna condizione: la voce si fa sempre.' : `${campi.condizioni.length} ${campi.condizioni.length === 1 ? 'condizione' : 'condizioni'}: la voce è dovuta solo se valgono.`;
  // «Da avere in scorta» nella voce: le figure (il ritratto per una Persona specifica, la figura dell'arcano per «qualunque») e il conto
  const personeScorta = useMemo(() => new Map((elenchiEffetti.dati?.persone ?? []).map((p) => [p.id, p])), [elenchiEffetti.dati]);
  const nomiScorta = campi.requisiti.map((r) => {
    const arcano = elenchiEffetti.dati?.arcani.find((a) => a.chiave === r.arcana)?.nome ?? r.arcana;
    return r.persona === null ? `${arcano} (qualunque)` : `${personeScorta.get(r.persona)?.nomeIt ?? `Persona ${r.persona}`} (${arcano})`;
  }).join(', ');
  const colonnaDestra = (
    <div className="voce-colonna">
      {azione && elenchi && <SceltaTipoQuale parte="quale" valore={campi.struttura} onCambia={(s) => imposta({ struttura: s })} elenchi={elenchi} qualeAperta={qualeAperta} onQualeAperta={setQualeAperta} />}
      {azione && elenchi && nomi && <SpuntandoSuccede valore={campi.struttura} onCambia={(s) => imposta({ struttura: s })} elenchi={elenchi} nomi={nomi} fatta={!!voce?.fatta} apertaDiPartenza={!voce || !!proposta} />}
      {azione && !elenchi && !erroreElenchi && <p className="m-0 testo-12 text-text-muted" role="status">Carico gli elenchi…</p>}
      {azione && erroreElenchi && <p className="m-0 testo-12 text-error-testo" role="alert">Elenchi non disponibili: {erroreElenchi}</p>}
      <label className="flex flex-col gap-1 testo-13 text-text-secondary" htmlFor={`${idCampo}-note`}>{etichettaNote}
        <textarea id={`${idCampo}-note`} aria-label={etichettaNote} className="form-input" rows={righe(campi.note, 2, 8)} maxLength={2000} value={campi.note} onChange={(e) => imposta({ note: e.target.value })} />
      </label>
      {/* L13 (O9-3, «in tal caso viene meno la consegna»): quando la voce è dovuta, con l'editor unico delle condizioni; senza, si fa sempre.
          Con le condizioni false al giorno della voce, nella partita la voce è «Non dovuta»: non si spunta e non ferma la giornata */}
      {/* L6-06: l'editor delle condizioni (due righe di condizioni ≈ 600 px nella colonna) sta nella sua finestra, larga quanto la voce */}
      {azione && (
        <section className="ripiegabile ripiegabile--semplice" aria-label="Si fa solo se">
          <h3 className="m-0 ripiegabile__titolo">
            <button type="button" className="ripiegabile__interruttore touch" aria-haspopup="dialog" disabled={occupato} title="Modifica le condizioni" onClick={() => setCondizioniAperte(true)}>
              <span className="ripiegabile__freccia" aria-hidden="true"><IconaAzione chiave="modifica" dimensione={18} /></span>
              <span className="ripiegabile__nome">Si fa solo se</span>
              <span className="ripiegabile__riepilogo">{riepilogoCondizioni}</span>
            </button>
          </h3>
        </section>
      )}
      {/* i requisiti «da avere in scorta»: arcani o Persona specifiche, nella loro finestra; servono gli elenchi, quindi la riga aspetta che arrivino */}
      {azione && (
        <section className="ripiegabile ripiegabile--semplice" aria-label="Da avere in scorta">
          <h3 className="m-0 ripiegabile__titolo">
            <button type="button" className="ripiegabile__interruttore touch" aria-haspopup="dialog" disabled={occupato || !elenchi} title="Modifica l’elenco da avere in scorta" onClick={() => setScortaAperta(true)}>
              <span className="ripiegabile__freccia" aria-hidden="true"><IconaAzione chiave="modifica" dimensione={18} /></span>
              <span className="ripiegabile__nome">Da avere in scorta</span>
              <span className="ripiegabile__riepilogo">{campi.requisiti.length === 0 ? 'Nessuno' : (
                <span className="scorta-miniature" title={nomiScorta}>
                  <span className="scorta-miniature__conta">{contaScorta(campi.requisiti)}</span>
                  <span className="scorta-miniature__figure">
                    {campi.requisiti.slice(0, 12).map((r) => <FiguraRequisito key={`${r.arcana}#${r.persona ?? ''}`} r={r} persona={r.persona === null ? undefined : personeScorta.get(r.persona)} dimensione={22} />)}
                    {campi.requisiti.length > 12 && <span className="scorta-miniature__altre" aria-hidden="true">+{campi.requisiti.length - 12}</span>}
                  </span>
                  <span className="sr-only">: {nomiScorta}</span>
                </span>
              )}</span>
            </button>
          </h3>
        </section>
      )}
      {azione && scortaAperta && elenchi && (
        <FinestraRequisitiVoce requisiti={campi.requisiti} elenchi={elenchi} onApplica={(r) => imposta({ requisiti: r })} onChiudi={() => setScortaAperta(false)} />
      )}
      {azione && condizioniAperte && (
        <FinestraCondizioniVoce condizioni={campi.condizioni} onApplica={(c) => imposta({ condizioni: c })} onChiudi={() => setCondizioniAperte(false)} />
      )}
      <Ripiegabile titolo="Posto nella giornata" riepilogo={`Posto ${posto + 1} di ${altre.length + 1}, ${nomeFascia}.`}>
        <PostoVoce altre={altre} posto={posto} testo={campi.testo.trim() || (voce ? voce.azione : 'La voce nuova')} fascia={campi.fascia} disabled={occupato}
          onPosto={(n) => imposta({ posizione: Math.max(0, Math.min(altre.length, n)) })} />
      </Ripiegabile>
    </div>
  );

  return (
    <FinestraModifica
      stretta={!azione}
      titolo={voce ? 'Modifica la voce della giornata' : 'Aggiungi alla giornata'}
      titoloSalva={proposta ? 'Salva e applica' : voce ? 'Salva' : 'Aggiungi'}
      onChiudi={onChiudi} onSalva={salva} occupato={occupato} sporca={sporca}
      salvabile={!!campi.testo.trim() && (!azione || campiCompleti(campi.struttura))}
    >
      <div className="flex flex-col gap-3" inert={occupato}>
        {proposta && (
          <p className="m-0 rounded-md border border-primary p-2 testo-13 break-words" role="status">
            <strong>Proposta da completare</strong> ({proposta.certezza === 'certa' ? 'certa' : proposta.certezza === 'probabile' ? 'probabile' : 'da verificare'}): {proposta.motivo} È già applicata qui sotto: rivedila, completa i dati che mancano e salva.
          </p>
        )}
        {/* L6-02: una voce del Diario validato già spuntata in una partita: modificarla tocca spunte già fatte */}
        {voce?.validataConSpunte && (
          <p className="m-0 rounded-md border border-warning p-2 testo-13 text-pretty" role="note">
            <strong>Voce del Diario validato, già spuntata in una partita:</strong> modificarla tocca spunte già fatte.
          </p>
        )}
        <div className={azione ? 'voce-colonne' : 'flex flex-col gap-3'}>
          {colonnaSinistra}
          {colonnaDestra}
        </div>
        {perdeEffetti && <p className="m-0 testo-12 text-warning" role="status">Diventando un promemoria, la voce perde tipo, collegamento, effetti della spunta ed elenco da avere in scorta.</p>}
        <p className="m-0 testo-12 text-text-muted">La modifica cambia la guida per tutte le partite ed entra nel backup dei dati di gioco che scarichi.</p>
      </div>
    </FinestraModifica>
  );
}

/**
 * «Si fa solo se» in una finestra sopra la voce: l'editor unico delle condizioni su una bozza. «Applica» la mette nella voce (che la salva
 * con il suo «Salva»); «Annulla» o la X la lasciano com'era, chiedendo conferma se la bozza è cambiata.
 */
function FinestraCondizioniVoce({ condizioni, onApplica, onChiudi }: { condizioni: RequisitoSpillo[]; onApplica: (c: RequisitoSpillo[]) => void; onChiudi: () => void }) {
  const [bozza, setBozza] = useState(condizioni);
  return (
    <FinestraModifica titolo="Si fa solo se" titoloSalva="Applica" onChiudi={onChiudi} sporca={JSON.stringify(bozza) !== JSON.stringify(condizioni)}
      onSalva={() => { onApplica(bozza); onChiudi(); }}>
      <div className="flex flex-col gap-3 min-w-0">
        <p className="m-0 testo-12 text-text-muted text-pretty">Senza condizioni la voce si fa sempre. Con condizioni false al giorno della voce, nella partita è «Non dovuta» e non ferma la giornata. Le condizioni applicate si salvano con la voce.</p>
        <CondizioniEditor condizioni={bozza} onCambia={setBozza} massimo={20} apertoDiPartenza />
      </div>
    </FinestraModifica>
  );
}

/** Un requisito della bozza: l'arcano (chiave inglese) e, se specifico, l'id della Persona. */
type RequisitoBozza = { arcana: string; persona: number | null };
/** Una Persona degli elenchi della voce (quelle che si possono chiedere in scorta). */
type PersonaElenco = ElenchiVoce['effetti']['persone'][number];

/** «9 arcani · 10 da avere»: gli arcani distinti e, quando sono meno dei requisiti (più Persone dello stesso arcano), quanti sono i requisiti;
 *  se i due numeri coincidono basta il primo. */
function contaScorta(r: readonly RequisitoBozza[]): string {
  const arcani = new Set(r.map((x) => x.arcana)).size;
  const parte = `${arcani} ${arcani === 1 ? 'arcano' : 'arcani'}`;
  return r.length > arcani ? `${parte} · ${r.length} da avere` : parte;
}

/** La figura di un requisito: il ritratto della Persona se è specifica (due Persone dello stesso arcano si distinguono), altrimenti la figura dell'arcano. */
function FiguraRequisito({ r, persona, dimensione }: { r: RequisitoBozza; persona: PersonaElenco | undefined; dimensione: number }) {
  return (
    <span className="scorta-figura" aria-hidden="true">
      {persona ? <AnteprimaPersona nome={persona.nome} etichetta={persona.nomeIt} dimensione={dimensione} contieni /> : <IconaArcano arcana={r.arcana} dimensione={dimensione} />}
    </span>
  );
}

/**
 * «Da avere in scorta» in una finestra sopra la voce, ancorata in alto e di altezza fissa (`FinestraModifica ancorata`): toccando, niente si
 * sposta sotto il dito. Due viste nello stesso posto, mai una sotto l'altra (un solo corpo che scorre, quello della finestra):
 *   - la griglia dei 24 arcani: un tocco su una tessera spenta la accende («qualunque Persona» di quell'arcano), un tocco sulla parte alta di una
 *     tessera accesa la spegne; la fascia in basso della tessera accesa dice quali Persone («Qualunque», il ritratto e il nome di una, i ritratti
 *     e il numero di più) e apre il pannello dell'arcano;
 *   - il pannello dell'arcano, al posto della griglia: «Qualunque» per prima, poi le Persone dell'arcano con il ritratto, a scelta multipla.
 *     Scegliere una Persona sostituisce «Qualunque»; togliere l'ultima riporta a «Qualunque» (l'arcano resta acceso: si spegne con «Togli» o dalla
 *     griglia). «Arcani», o Esc, torna alla griglia.
 * Le regole del server (`shared/requisitiVoce.ts`) sono impedite già qui: per ogni arcano o «qualunque» o Persone diverse, mai un doppione,
 * al massimo `MASSIMO_REQUISITI_VOCE`. Niente si aggiunge da solo. «Applica» mette la bozza nella voce, che la salva con il suo «Salva».
 */
function FinestraRequisitiVoce({ requisiti, elenchi, onApplica, onChiudi }: { requisiti: RequisitoBozza[]; elenchi: ElenchiVoce; onApplica: (r: RequisitoBozza[]) => void; onChiudi: () => void }) {
  const { arcani, persone } = elenchi.effetti;
  const [bozza, setBozza] = useState<RequisitoBozza[]>(requisiti);
  /** L'arcano di cui si scelgono le Persone (il pannello al posto della griglia); null = la griglia. */
  const [aperto, setAperto] = useState<string | null>(null);
  const corpo = useRef<HTMLDivElement>(null);
  const indietro = useRef<HTMLButtonElement>(null);
  const pannello = useRef<HTMLDivElement>(null);
  /** L'arcano da cui si torna alla griglia: il fuoco va sulla sua tessera. */
  const daCuiSiTorna = useRef<string | null>(null);
  const perId = useMemo(() => new Map(persone.map((p) => [p.id, p])), [persone]);
  const personeDi = (chiave: string) => persone.filter((p) => p.arcanaChiave === chiave).sort((x, y) => x.livello - y.livello || x.nomeIt.localeCompare(y.nomeIt));
  const pieno = bozza.length >= MASSIMO_REQUISITI_VOCE;
  /** L'elenco com'è salvato: arcani nell'ordine della tabella di fusione, poi Persone per livello (l'arcano intero, che è solo, non ha Persona). */
  const normalizzate = (b: readonly RequisitoBozza[]): RequisitoBozza[] => {
    const posArcano = new Map(arcani.map((a, i) => [a.chiave, i]));
    const posPersona = new Map(persone.map((p) => [p.id, p.livello * 100000 + p.id]));
    return b.map(({ arcana, persona }) => ({ arcana, persona }))
      .sort((x, y) => (posArcano.get(x.arcana) ?? 999) - (posArcano.get(y.arcana) ?? 999) || (posPersona.get(x.persona ?? 0) ?? 0) - (posPersona.get(y.persona ?? 0) ?? 0));
  };
  const ordinata = normalizzate(bozza);

  /** Tessera dell'arcano: spenta si accende con «qualunque Persona»; accesa si spegne con tutte le sue Persone. */
  const alternaArcano = (chiave: string) => setBozza((b) => (b.some((r) => r.arcana === chiave) ? b.filter((r) => r.arcana !== chiave)
    : b.length >= MASSIMO_REQUISITI_VOCE ? b : [...b, { arcana: chiave, persona: null }]));
  /** «Qualunque»: l'arcano intero, al posto delle Persone scelte. */
  const qualunque = (chiave: string) => setBozza((b) => [...b.filter((r) => r.arcana !== chiave), { arcana: chiave, persona: null }]);
  /** Una Persona: scelta prende il posto di «qualunque» (o si aggiunge alle altre); tolta l'ultima, l'arcano torna «qualunque». */
  const alternaPersona = (chiave: string, id: number) => setBozza((b) => {
    if (b.some((r) => r.persona === id)) {
      const resto = b.filter((r) => r.persona !== id);
      return resto.some((r) => r.arcana === chiave) ? resto : [...resto, { arcana: chiave, persona: null }];
    }
    if (b.some((r) => r.arcana === chiave && r.persona === null)) return b.map((r) => (r.arcana === chiave && r.persona === null ? { arcana: chiave, persona: id } : r));
    return b.length >= MASSIMO_REQUISITI_VOCE ? b : [...b, { arcana: chiave, persona: id }];
  });
  const apri = (chiave: string) => setAperto(chiave);
  const torna = () => { daCuiSiTorna.current = aperto; setAperto(null); };
  const togliArcano = (chiave: string) => { setBozza((b) => b.filter((r) => r.arcana !== chiave)); torna(); };

  // cambiando vista il corpo riparte dall'alto e il fuoco va dove si è: nel pannello su «Arcani», tornando sulla tessera da cui lo si era aperto
  useEffect(() => {
    corpo.current?.closest('.modal-body')?.scrollTo({ top: 0 });
    if (aperto !== null) { indietro.current?.focus(); return; }
    const da = daCuiSiTorna.current;
    daCuiSiTorna.current = null;
    if (!da || !corpo.current) return;
    const tessera = corpo.current.querySelector<HTMLElement>(`[data-persone="${CSS.escape(da)}"]`) ?? corpo.current.querySelector<HTMLElement>(`[data-arcano="${CSS.escape(da)}"]`);
    tessera?.focus();
  }, [aperto]);
  // Esc nel pannello torna alla griglia e non chiude la finestra: `Modal` ignora un Esc già usato (`preventDefault`), e l'ascolto sul pannello
  // arriva prima del suo, che è sulla finestra del browser
  useEffect(() => {
    const el = pannello.current;
    if (aperto === null || !el) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      e.preventDefault();
      daCuiSiTorna.current = aperto;
      setAperto(null);
    };
    el.addEventListener('keydown', esc);
    return () => el.removeEventListener('keydown', esc);
  }, [aperto]);

  const arcanoAperto = aperto === null ? null : arcani.find((a) => a.chiave === aperto) ?? { chiave: aperto, nome: aperto };
  const conta = bozza.length === 0 ? 'Tocca un arcano: vale qualunque sua Persona. Per sceglierne una, tocca «Qualunque» sulla tessera.'
    : `${contaScorta(bozza)}${pieno ? ` · massimo ${MASSIMO_REQUISITI_VOCE}` : ''}`;
  return (
    <FinestraModifica ancorata titolo="Da avere in scorta" titoloSalva="Applica" onChiudi={onChiudi} sporca={JSON.stringify(ordinata) !== JSON.stringify(normalizzate(requisiti))}
      onSalva={() => { onApplica(ordinata); onChiudi(); }}>
      <div className="scorta-scelta" ref={corpo}>
        <p className="scorta-scelta__conta" role="status">{conta}</p>
        {arcanoAperto === null ? (
          <ul className="scorta-griglia" aria-label="Arcani da avere in scorta">
            {arcani.map((a) => {
              const sue = ordinata.filter((r) => r.arcana === a.chiave);
              const acceso = sue.length > 0;
              const specifiche = sue.filter((r) => r.persona !== null);
              const nomi = specifiche.map((r) => perId.get(r.persona!)?.nomeIt ?? `Persona ${r.persona}`);
              return (
                <li key={a.chiave} className={`scorta-tessera ${acceso ? 'scorta-tessera--accesa' : ''}`}>
                  <button type="button" className="scorta-tessera__arcano" data-arcano={a.chiave} aria-pressed={acceso} disabled={!acceso && pieno} title={a.nome}
                    onClick={() => alternaArcano(a.chiave)}>
                    <IconaArcano arcana={a.chiave} dimensione={30} />
                    <span className="scorta-tessera__nome">{a.nome}</span>
                    {acceso && <span className="scorta-tessera__spunta" aria-hidden="true"><IconSpunta size={11} /></span>}
                  </button>
                  {acceso && (
                    <button type="button" className="scorta-tessera__persone" data-persone={a.chiave} onClick={() => apri(a.chiave)}
                      aria-label={`Persone di ${a.nome}: ${nomi.length === 0 ? 'qualunque' : nomi.join(', ')}. Scegli`} title={nomi.length === 0 ? `Qualunque Persona di ${a.nome}` : nomi.join(', ')}>
                      {specifiche.length === 0 ? <span className="scorta-tessera__testo">Qualunque</span> : (
                        <>
                          {/* la prima Persona scelta con il suo ritratto, e quante altre: il nome completo di tutte è nel nome accessibile e nel titolo */}
                          <span className="scorta-tessera__ritratti">
                            <FiguraRequisito r={specifiche[0]} persona={perId.get(specifiche[0].persona!)} dimensione={18} />
                          </span>
                          {/* il nome sopra e «+N» sotto: sulla tessera stretta il nome ha tutta la larghezza che resta */}
                          <span className="scorta-tessera__nomi">
                            <span className="scorta-tessera__testo">{nomi[0]}</span>
                            {specifiche.length > 1 && <span className="scorta-tessera__altre">+{specifiche.length - 1}</span>}
                          </span>
                        </>
                      )}
                      <IconChevronRight size={12} className="scorta-tessera__freccia" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div ref={pannello} className="scorta-pannello" role="group" aria-labelledby="scorta-pannello-titolo">
            <div className="scorta-pannello__testata">
              <button ref={indietro} type="button" className="scorta-pannello__comando touch" onClick={torna} aria-label="Torna a tutti gli arcani">
                <IconaAzione chiave="indietro" dimensione={20} /><span>Arcani</span>
              </button>
              <span className="scorta-pannello__arcano">
                <IconaArcano arcana={arcanoAperto.chiave} dimensione={32} />
                <h3 id="scorta-pannello-titolo" className="scorta-pannello__titolo">{arcanoAperto.nome}</h3>
              </span>
              <button type="button" className="scorta-pannello__comando touch" onClick={() => togliArcano(arcanoAperto.chiave)} aria-label={`Togli ${arcanoAperto.nome} dall’elenco`}>
                <IconaAzione chiave="elimina" dimensione={20} /><span>Togli</span>
              </button>
            </div>
            <PersoneArcano chiave={arcanoAperto.chiave} nome={arcanoAperto.nome} sue={ordinata.filter((r) => r.arcana === arcanoAperto.chiave)} elenco={personeDi(arcanoAperto.chiave)}
              perId={perId} pieno={pieno} onQualunque={() => qualunque(arcanoAperto.chiave)} onPersona={(id) => alternaPersona(arcanoAperto.chiave, id)} />
          </div>
        )}
      </div>
    </FinestraModifica>
  );
}

/** Le tessere del pannello di un arcano: «Qualunque» e poi le sue Persone con il ritratto (una salvata e non più negli elenchi resta, per toglierla). */
function PersoneArcano({ chiave, nome, sue, elenco, perId, pieno, onQualunque, onPersona }: {
  chiave: string; nome: string; sue: RequisitoBozza[]; elenco: PersonaElenco[]; perId: Map<number, PersonaElenco>; pieno: boolean;
  onQualunque: () => void; onPersona: (id: number) => void;
}) {
  const intero = sue.some((r) => r.persona === null);
  const scelte = new Set(sue.flatMap((r) => (r.persona === null ? [] : [r.persona])));
  const sconosciute = [...scelte].filter((id) => !elenco.some((p) => p.id === id));
  const spunta = <span className="scorta-persona__spunta" aria-hidden="true"><IconSpunta size={11} /></span>;
  return (
    <ul className="scorta-persone" aria-label={`Persone di ${nome}`}>
      <li>
        <button type="button" className="scorta-persona scorta-persona--qualunque touch" aria-pressed={intero} onClick={onQualunque}>
          <span className="scorta-persona__figura" aria-hidden="true"><IconaArcano arcana={chiave} dimensione={44} /></span>
          <span className="scorta-persona__nome">Qualunque</span>
          <span className="scorta-persona__dettaglio">di {nome}</span>
          {intero && spunta}
        </button>
      </li>
      {[...elenco, ...sconosciute.map((id) => perId.get(id) ?? null)].map((p, i) => {
        const id = p?.id ?? sconosciute[i - elenco.length];
        const scelta = scelte.has(id);
        // con «qualunque» scelto la Persona ne prende il posto: il conto non cresce, quindi si può anche a elenco pieno
        const bloccata = !scelta && pieno && !intero;
        return (
          <li key={id}>
            <button type="button" className="scorta-persona touch" aria-pressed={scelta} disabled={bloccata} onClick={() => onPersona(id)}
              aria-label={p ? `${p.nomeIt}, livello ${p.livello}` : `Persona ${id}`} title={p ? `${p.nomeIt} · Liv. ${p.livello}` : `Persona ${id}`}>
              <span className="scorta-persona__figura" aria-hidden="true">
                {p ? <AnteprimaPersona nome={p.nome} etichetta={p.nomeIt} dimensione={48} contieni /> : <IconaArcano arcana={chiave} dimensione={44} />}
              </span>
              <span className="scorta-persona__nome">{p ? p.nomeIt : `Persona ${id}`}</span>
              {p && <span className="scorta-persona__dettaglio">Liv. {p.livello}</span>}
              {scelta && spunta}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
