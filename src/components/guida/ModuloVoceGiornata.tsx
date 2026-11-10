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

import { useMemo, useRef, useState } from 'react';
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
    };
  });
  const [campi, setCampi] = useState(iniziali);
  const [occupato, setOccupato] = useState(false);
  // L6-06: le due finestre sopra la voce, la griglia di «Quale» (si apre anche scegliendo il tipo, nell'altra colonna) e «Si fa solo se»
  const [qualeAperta, setQualeAperta] = useState(false);
  const [condizioniAperte, setCondizioniAperte] = useState(false);
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
    const dati: DatiVoceGiornata = {
      genere: campi.genere, azione: testo, note: note || null, fascia: campi.fascia,
      ...(spostata ? { posizione: posto } : {}),
      // tipo, collegamento e rango così come li mostra la finestra: L13 (ondata 4a) niente si ricava in silenzio all'apertura, un
      // collegamento nuovo è solo quello che l'utente ha scelto (in «Quale» o con «Collega»). Gli effetti salvati restano intatti.
      ...(azione ? { tipo: s.tipo, riferimento: s.riferimento, rangoAtteso: s.rangoAtteso,
        ...(condizioniCambiate ? { condizioni: campi.condizioni } : {}),
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

  const colonnaSinistra = (
    <div className="voce-colonna">
      <div className="flex flex-col gap-1">
        <Segmenti etichetta="Che cosa è" valore={campi.genere} opzioni={GENERI} onCambia={(g) => imposta({ genere: g })} />
        <span className="testo-12 text-text-muted">{azione ? 'Si spunta e può dare punti.' : 'Solo da leggere: compare in «Di giorno» o «Di sera» senza casella, e non ha tipo né effetti.'}</span>
      </div>
      <label className="flex flex-col gap-1 testo-13 text-text-secondary">{azione ? 'Che cosa fare' : 'Che cosa succede'}
        {/* eslint-disable-next-line jsx-a11y/no-autofocus -- sullo schermo largo l'editor della voce si apre per scrivere il testo */}
        <textarea className="form-input" rows={righe(campi.testo, 3, 24)} maxLength={2000} value={campi.testo} autoFocus={largo} onChange={(e) => imposta({ testo: e.target.value })}
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
  const colonnaDestra = (
    <div className="voce-colonna">
      {azione && elenchi && <SceltaTipoQuale parte="quale" valore={campi.struttura} onCambia={(s) => imposta({ struttura: s })} elenchi={elenchi} qualeAperta={qualeAperta} onQualeAperta={setQualeAperta} />}
      {azione && elenchi && nomi && <SpuntandoSuccede valore={campi.struttura} onCambia={(s) => imposta({ struttura: s })} elenchi={elenchi} nomi={nomi} fatta={!!voce?.fatta} apertaDiPartenza={!voce || !!proposta} />}
      {azione && !elenchi && !erroreElenchi && <p className="m-0 testo-12 text-text-muted" role="status">Carico gli elenchi…</p>}
      {azione && erroreElenchi && <p className="m-0 testo-12 text-error-testo" role="alert">Elenchi non disponibili: {erroreElenchi}</p>}
      <label className="flex flex-col gap-1 testo-13 text-text-secondary">{azione ? 'Note' : 'Dettagli'}
        <textarea className="form-input" rows={righe(campi.note, 2, 8)} maxLength={2000} value={campi.note} onChange={(e) => imposta({ note: e.target.value })} />
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
        {perdeEffetti && <p className="m-0 testo-12 text-warning" role="status">Diventando un promemoria, la voce perde tipo, collegamento ed effetti della spunta.</p>}
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
