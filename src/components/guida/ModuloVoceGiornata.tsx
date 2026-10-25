// ============================================================
// ModuloVoceGiornata — finestra per aggiungere una voce alla giornata o modificarne una, con il suo posto esatto nella fascia
// ============================================================
//
// Una finestra sola per le due situazioni, così i campi restano gli stessi ovunque:
//   nuova  dal pulsante «Aggiungi» di «Di giorno» / «Di sera»
//   voce   una voce che c'è già (della guida o aggiunta): dal 2026-09-30 sono la stessa cosa, canone della guida
// Ridisegnata il 2026-10-24 (tavole approvate dall'utente): due soli generi — «Cosa da fare» (si spunta) e «Promemoria» (solo da
// leggere, senza casella, né tipo né effetti) —; il tipo si sceglie da una griglia di icone e decide il collegamento; «Quale» si sceglie
// guardando e porta con sé l'effetto della spunta, scritto come frase in «Spuntando succede»; gli effetti rari stanno in «Effetti
// aggiuntivi», ripiegati in fondo. Su desktop due colonne (a sinistra che cosa è, a destra che cosa succede spuntandola e quando);
// su tablet e telefono una colonna, nello stesso ordine, e sul telefono è il foglio dal basso di `Modal`. Scorre solo il corpo.
// Ogni voce ha anche il suo **posto** nella fascia (richiesta dell'utente: «devo fare un ordinamento esatto»), che si cambia
// trascinando o con ↑ / ↓. Ogni modifica vale per tutte le partite ed entra nel pacchetto di gioco che si esporta.
// ============================================================

import { useMemo, useRef, useState } from 'react';
import { Modal } from '../shared/Modal';
import { Segmenti } from '../shared/Segmenti';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { aggiornaVoceGiornata, creaVoceGiornata, getElenchiAzione, getElenchiEffettiVoce } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { NOME_GENERE } from '../../utils/percorso';
import { SceltaTipoQuale, SpuntandoSuccede } from './EditorAzioneStrutturata';
import { EffettiAggiuntivi } from './EffettiAggiuntivi';
import { PostoVoce } from './PostoVoce';
import type { ElenchiVoce } from '../../utils/opzioniEffetti';
import { STRUTTURA_VUOTA, campiCompleti, strutturaDi } from '../../utils/azioneStrutturata';
import { nomiEffettiDa } from '../../utils/effettoAutomatico';
import type { AzionePercorsoDto, DatiVoceGiornata, FasciaGioco, GenereVoce } from '../../types';
import { segnalaMutazioneEffetti } from '../../services/gestiPartita';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

export type SoggettoVoce =
  | { tipo: 'nuova'; fascia: FasciaGioco }
  | { tipo: 'voce'; voce: AzionePercorsoDto };

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
 * La finestra della voce: genere, testo e note (aree di testo che crescono col contenuto), tipo e «Quale» con l'effetto che portano,
 * fascia, posto esatto fra le altre voci ed effetti aggiuntivi. «Salva»/«Aggiungi» è attivo solo con un testo e, per una cosa da fare,
 * con i collegamenti e gli effetti completi.
 */
// L12 (passo 8): nel rilascio (sola lettura, voci del diario comprese) il modulo non esiste; la condizione è costante di build, `ModuloVoceGiornataReale` esce dal bundle
export const ModuloVoceGiornata: StrumentoDiModifica<typeof ModuloVoceGiornataReale> = IN_RILASCIO ? NienteInRilascio : ModuloVoceGiornataReale;
function ModuloVoceGiornataReale({ soggetto, giorno, voci, partitaId, onChiudi, onSalvato }: Props) {
  const voce = soggetto.tipo === 'voce' ? soggetto.voce : null;
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
  const [campi, setCampi] = useState(() => {
    const fascia = voce?.fascia ?? (soggetto.tipo === 'nuova' ? soggetto.fascia : 'giorno');
    return {
      genere: (voce?.genere ?? 'azione') as GenereVoce, testo: voce?.azione ?? '', note: voce?.note ?? '', fascia,
      posizione: postoIniziale(fascia), struttura: voce ? strutturaDi(voce) : STRUTTURA_VUOTA,
    };
  });
  const [occupato, setOccupato] = useState(false);
  const scrittura = useRef(false);
  /** Unisce una modifica parziale ai campi del modulo. */
  const imposta = (p: Partial<typeof campi>) => setCampi((c) => ({ ...c, ...p }));
  const azione = campi.genere === 'azione';
  const altre = altreDi(campi.fascia);
  const posto = Math.min(campi.posizione, altre.length);

  const elenchiAzione = useCarica(getElenchiAzione, []);
  const elenchiEffetti = useCarica(getElenchiEffettiVoce, []);
  const elenchi = useMemo<ElenchiVoce | null>(() => (elenchiAzione.dati && elenchiEffetti.dati ? { azione: elenchiAzione.dati, effetti: elenchiEffetti.dati, giorno } : null), [elenchiAzione.dati, elenchiEffetti.dati, giorno]);
  const nomi = useMemo(() => (elenchi ? nomiEffettiDa(elenchi.azione, elenchi.effetti) : null), [elenchi]);
  const erroreElenchi = elenchiAzione.errore ?? elenchiEffetti.errore;
  /** Una cosa da fare che diventa promemoria perde tipo, collegamento ed effetti. */
  const perdeEffetti = !!voce && voce.genere === 'azione' && !azione;

  /**
   * Compone i dati della voce (testo e note ripuliti, note vuote come assenti; tipo, collegamento, rango ed effetti
   * solo per una cosa da fare), crea o aggiorna la voce, fa ricaricare la giornata, notifica e chiude. Senza testo non fa nulla.
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
    const dati: DatiVoceGiornata = {
      genere: campi.genere, azione: testo, note: note || null, fascia: campi.fascia,
      ...(spostata ? { posizione: posto } : {}),
      // Aprendo una voce SENZA collegamento con un solo effetto del suo genere, `strutturaDi` ne ricava il collegamento dall'effetto:
      // salvando, si scrive anche questo. Un collegamento salvato di altro genere (negozio su un lavoro) resta com'è: `uidPrincipale`
      // serve solo alla finestra per trovare l'effetto principale e non entra mai nei dati. Gli effetti salvati restano intatti.
      ...(azione ? { tipo: s.tipo, riferimento: s.riferimento, rangoAtteso: s.rangoAtteso,
        ...(canoniciModificati ? { effettiVoce: { effetti: s.effettiVoce!, ...(s.fonteEffetti ? { revisioneEffettiAttesa: s.fonteEffetti.revisione } : {}) } } : {}),
        ...(produceModificato ? { produce: s.produce } : {}),
      } : perdeEffetti ? { tipo: 'altro' as const, riferimento: null, rangoAtteso: null,
        ...(effettiSalvati ? { effettiVoce: { effetti: [], revisioneEffettiAttesa: s.fonteEffetti!.revisione } } : {}),
      } : {}),
    };
    scrittura.current = true;
    setOccupato(true);
    let registrata = false;
    try {
      if (voce) await aggiornaVoceGiornata(voce.uid, dati, partitaId ?? undefined);
      else await creaVoceGiornata(giorno, dati, partitaId ?? undefined);
      registrata = true;
      segnalaMutazioneEffetti(null);
      await onSalvato();
      notifica('success', voce ? 'Voce modificata nella guida, per tutte le partite.' : 'Voce aggiunta alla guida, per tutte le partite.');
      onChiudi();
    } catch (err) {
      notifica('error', `${registrata ? 'Voce salvata; aggiornamento della pagina non riuscito: ' : ''}${err instanceof Error ? err.message : 'Salvataggio non riuscito.'}`);
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
        <textarea className="form-input" rows={righe(campi.testo, 3, 24)} maxLength={2000} value={campi.testo} autoFocus onChange={(e) => imposta({ testo: e.target.value })}
          placeholder={azione ? 'es. Comprare il Set per retrogaming' : 'es. Domani esami: ripassare la sera prima'} />
      </label>
      <label className="flex flex-col gap-1 testo-13 text-text-secondary">{azione ? 'Note' : 'Dettagli'}
        <textarea className="form-input" rows={righe(campi.note, 2, 8)} maxLength={2000} value={campi.note} onChange={(e) => imposta({ note: e.target.value })} />
      </label>
      {azione && elenchi && <SceltaTipoQuale valore={campi.struttura} onCambia={(s) => imposta({ struttura: s })} elenchi={elenchi} />}
    </div>
  );

  const colonnaDestra = (
    <div className="voce-colonna">
      {azione && elenchi && nomi && <SpuntandoSuccede valore={campi.struttura} onCambia={(s) => imposta({ struttura: s })} elenchi={elenchi} nomi={nomi} />}
      {azione && !elenchi && !erroreElenchi && <p className="m-0 testo-12 text-text-muted" role="status">Carico gli elenchi…</p>}
      {azione && erroreElenchi && <p className="m-0 testo-12 text-error" role="alert">Elenchi non disponibili: {erroreElenchi}</p>}
      <Segmenti etichetta="Quando" valore={campi.fascia} opzioni={FASCE} onCambia={(f) => imposta({ fascia: f, posizione: postoIniziale(f) })} />
      <PostoVoce altre={altre} posto={posto} testo={campi.testo.trim() || (voce ? voce.azione : 'La voce nuova')} fascia={campi.fascia} disabled={occupato}
        onPosto={(n) => imposta({ posizione: Math.max(0, Math.min(altre.length, n)) })} />
      {azione && elenchi && nomi && <EffettiAggiuntivi valore={campi.struttura} onCambia={(s) => imposta({ struttura: s })} elenchi={elenchi} nomi={nomi} />}
    </div>
  );

  return (
    <Modal
      aperta
      larga={azione}
      titolo={voce ? 'Modifica la voce della giornata' : 'Aggiungi alla giornata'}
      onChiudi={() => { if (!occupato) onChiudi(); }}
      azioni={(
        <div className="flex flex-wrap justify-end gap-1.5 w-full">
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" disabled={occupato} onClick={onChiudi} />
          <PulsanteVisivo type="submit" form="modulo-voce-giornata" tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo={voce ? 'Salva' : 'Aggiungi'}
            disabled={occupato || !campi.testo.trim() || (azione && !campiCompleti(campi.struttura))} />
        </div>
      )}
    >
      <form id="modulo-voce-giornata" className="flex flex-col gap-3" inert={occupato} onSubmit={(e) => { e.preventDefault(); void salva(); }}>
        <div className={azione ? 'voce-colonne' : 'flex flex-col gap-3'}>
          {colonnaSinistra}
          {colonnaDestra}
        </div>
        {perdeEffetti && <p className="m-0 testo-12 text-warning" role="status">Diventando un promemoria, la voce perde tipo, collegamento ed effetti della spunta.</p>}
        <p className="m-0 testo-12 text-text-muted">
          La modifica cambia la guida per tutte le partite ed entra nel pacchetto di gioco che esporti.
          {voce?.fatta ? ' Questa voce è già spuntata: le modifiche agli effetti compaiono come pulsante «Applica» sulla voce, senza rieseguire la spunta né modificare subito Doti e yen.' : ''}
        </p>
      </form>
    </Modal>
  );
}
