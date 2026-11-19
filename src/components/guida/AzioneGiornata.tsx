// ============================================================
// AzioneGiornata — una riga d'azione della giornata (`GiornoGuida`): spunta per partita con le sue scelte (note, esiti, consumazioni e
// pesca, relazione romantica), immagine, testo, cartellini, stato, effetti registrati e gesti della voce
// ============================================================
//
// La giornata (le due fasce, i gesti sulle voci, la selezione, gli appunti) sta in `GiornoGuida`; qui ciò che succede dentro una voce
// quando la si spunta o la si toglie. Una riga si rimonta quando cambia ciò che la spunta legge (`Azione`, chiave di contesto): le scelte a
// metà (note, esiti, acquisti) non sopravvivono a una voce cambiata altrove.
// ============================================================

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEventHandler, type ReactNode, type RefObject } from 'react';
import { getConfidentiPartita, getVocePercorso, impostaAzionePercorso } from '../../services/api';
import { giocaLaSceltaRomantica } from '../../../shared/puntiConfidenti';
import { fraseRelazione } from '../../../shared/descriviEffettiSpunta';
import { notifica } from '../../stores/notificationStore';
import { avvisoSpunta, descriviEffetti } from '../../utils/percorso';
import { dotiDaSegnareDaEffetti, testoDotiDaSegnare } from '../../utils/dotiDaSegnare';
import type { AzionePercorsoDto } from '../../types';
import { SegnoStato } from '../shared/SegnoStato';
import { IconaSegno } from '../shared/IconaAzione';
import { TestoNote } from '../shared/TestoNote';
import { useSuggerimentiStore } from '../../stores/suggerimentiStore';
import { ComandiVoce, TestoSelezioneRiga, type GestoVoce, type SelezioneRiga } from './MenuVoce';
import { classeSelezioneRiga } from '../../utils/selezioneRiga';
import { CartelliniAzione, ImmagineAzione, SceltaNote } from './PartiAzione';
import { DaRivedereVoce, InfiltrazioniVoce } from './InfiltrazioniVoce';
import { RisposteVoce } from './RisposteVoce';
import { RequisitiVoce } from './RequisitiVoce';
import { idMotivoScorta } from '../../utils/requisitiVoce';
import { RicevuteVoce } from './RicevuteVoce';
import { chiedeNote } from '../../utils/azioneStrutturata';
import { seGiornoAvanzato } from '../../utils/giornoAvanzato';
import { PreparaAcquistiVoce } from './PreparaAcquistiVoce';
import { descriviOsservate, effettiDaOsservare, preparaOsservazioniVoce, richiesteOsservazioni, type OsservataSpunta, type OsservazioniVoce } from '../../services/osservazioniVoce';
import { usePartitaStore } from '../../stores/partitaStore';
import { DaApplicare } from '../partita/DaApplicare';
import type { RichiestaRegistraAcquisto } from '../../../shared/acquisti';
import type { RichiestaRegistraSessionePesca } from '../../../shared/pesca';
import type { SceltaEsitoSpunta } from '../../../shared/esitiAttivita';
import { SceltaEsitiVoce } from './SceltaEsito';
import { SegnoDaCompletare } from './ProposteDaCompletare';
import { eseguiSpuntaAcquistiConRegistro, gestoPendenteNelloScope, segnalaMutazioneEffetti, useGestiPartita } from '../../services/gestiPartita';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

/** «Sulla mappa» di una voce: la mappa (e lo spillo) e l'identità della voce da evidenziare. */
export type SullaMappa = (mappa: { chiave: string; spilloId: number | null }, voce: string | null) => void;

interface PropsAzione {
  a: AzionePercorsoDto;
  partitaId: number | null;
  onCambiata: (a: AzionePercorsoDto) => void;
  /** Azione con un luogo sulla mappa: il pulsante «Sulla mappa» la centra (scheda «Oggi») o apre la mappa (pagina della guida). */
  onSullaMappa?: SullaMappa;
  evidenziata?: boolean;
  /** Gesti della voce: assenti = riga di sola lettura. */
  gesti?: GestoVoce[];
  menuAperto?: boolean;
  onMenu?: (aperto: boolean) => void;
  /** Un'operazione della giornata è in corso: i gesti aspettano. */
  bloccata?: boolean;
  /** Riordino per trascinamento: la maniglia ⠿ (in testa alla riga), il riferimento della riga e le classi dello stato di trascinamento. */
  maniglia?: ReactNode;
  rifRiga?: (el: HTMLElement | null) => void;
  classeRiga?: string;
  /** L13 (ondata 4a, solo preparazione): le proposte «da completare» della voce, con il gesto che le apre. */
  daCompletare?: { n: number; onApri: () => void };
  /** Appunti del Diario (2026-10-26, solo preparazione): la riga selezionata o tagliata e i gestori del clic che la selezionano. */
  selezione?: SelezioneRiga;
}

/** Ciò che la spunta legge di una voce: quando cambia, la riga si rimonta (vedi l'intestazione). */
const chiaveContesto = (a: AzionePercorsoDto, partitaId: number | null): string =>
  JSON.stringify([partitaId, a.uid, a.fatta, a.giorno, a.fascia, a.genere, a.azione, a.tipo, a.riferimento, a.rangoAtteso, a.effettiVoce?.revisione]);

/** I gestori della selezione della riga, che ignorano i clic dentro l'elenco «In scorta»: un tocco mancato fra due chip o sul titolo non seleziona la voce. */
const fuoriDallaScorta = (g: MouseEventHandler<HTMLLIElement> | undefined): MouseEventHandler<HTMLLIElement> | undefined =>
  g && ((e) => { if (!(e.target instanceof Element && e.target.closest('.scorta-voce'))) g(e); });

/** Una riga d'azione della giornata (della guida o aggiunta): spunta, immagine dell'entità, testo, tipo, collegamento, stato, note, gesti. */
export function Azione(props: PropsAzione) {
  const { a, partitaId } = props;
  // la spunta o l'annullo cambiano `fatta` e quindi rimontano la riga: se il fuoco era nella riga torna nella riga nuova (sopravvive al
  // rimontaggio). `true`: sulla casella; un testo: sul controllo della riga che si chiama così (quello su cui chi gioca era passato durante la
  // richiesta), o sulla casella se nella riga nuova non c'è più
  const fuocoCasellaRef = useRef<boolean | string>(false);
  return <AzioneNelContesto key={chiaveContesto(a, partitaId)} {...props} fuocoCasellaRef={fuocoCasellaRef} />;
}
/** Il nome con cui ritrovare un controllo della riga dopo il rimontaggio: il nome accessibile scritto o, senza, il testo. */
const nomeControllo = (el: Element): string => (el.getAttribute('aria-label') ?? el.textContent ?? '').trim();
function AzioneNelContesto({ a, partitaId, onCambiata, onSullaMappa, evidenziata, gesti, menuAperto = false, onMenu, bloccata, maniglia, rifRiga, classeRiga, daCompletare, selezione, fuocoCasellaRef }: PropsAzione & { fuocoCasellaRef: RefObject<boolean | string> }) {
  const [occupato, setOccupato] = useState(false);
  const rifCasella = useRef<HTMLInputElement>(null);
  // la riga rimontata dalla spunta o dall'annullo che aveva il fuoco: lo riprende la casella, o il controllo dove chi gioca l'aveva portato
  // (senza scorrere)
  useLayoutEffect(() => {
    const dove = fuocoCasellaRef.current;
    if (!dove) return;
    fuocoCasellaRef.current = false;
    const riga = rifCasella.current?.closest('li');
    const stesso = typeof dove === 'string' && riga
      ? [...riga.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')].find((el) => nomeControllo(el) === dove)
      : undefined;
    (stesso ?? rifCasella.current)?.focus({ preventScroll: true });
  }, [fuocoCasellaRef]);
  // con la scelta romantica fatta nella scelta delle note (L13, O10-3), che arriva così fino al salvataggio
  const [chiediAcquisti, setChiediAcquisti] = useState<{ noteRisposta?: 1 | 2 | 3; senzaPunti: boolean; esiti?: SceltaEsitoSpunta[]; relazioneRomantica?: boolean } | null>(null);
  // L13: la scelta dell'esito (turno di un'attività con esiti, note di una Dote a valori possibili) prima di salvare la spunta
  const [chiediEsiti, setChiediEsiti] = useState<{ noteRisposta?: 1 | 2 | 3; senzaPunti: boolean; relazioneRomantica?: boolean } | null>(null);
  const vivo = useRef(true);
  const scrittura = useRef(false);
  useLayoutEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);
  useGestiPartita();
  const oggi = usePartitaStore((s) => (partitaId !== null && s.attiva?.id === partitaId ? s.attiva.dataGioco : null));
  const pendente = partitaId !== null ? gestoPendenteNelloScope(partitaId, { voceUid: a.uid, ...(a.effettiVoce?.effetti.some(e => e.effetto.tipo === 'pesca') ? { pesca: true } : {}) }) : null;
  // Azione «tempo con un Confidente»: alla spunta l'app chiede quante note (1–3) si sono ottenute (scelta A, 2 preselezionato).
  const [chiediNote, setChiediNote] = useState(false);
  // L13 (O10-3, risposta «a» dell'utente del 31/10): la voce che fa giocare l'evento del rango della scelta romantica di un Confidente (lo
  // stesso evento di cui la scelta mostra il dialogo e lo stesso criterio del server: `giocaLaSceltaRomantica`). Aperta la scelta delle note,
  // si legge il Confidente nella partita: se è romanzabile la scelta mostra la casella della relazione, precompilata con il valore della
  // partita. La scelta fatta lì passa alla spunta come argomento (anche attraverso esiti o acquisti); su ogni altra voce nessuna scelta nuova.
  const chiaveRomantica = chiediNote && partitaId !== null && a.riferimento?.tipo === 'confidente' && giocaLaSceltaRomantica(a.rangoAtteso, a.rangoPartita) ? a.riferimento.chiave : null;
  // azzerata a ogni apertura della scelta delle note (`apriSceltaNote`): la casella compare solo con la lettura fresca, mai col valore di prima
  const [relazionePartita, setRelazionePartita] = useState<{ chiave: string; valore: boolean } | null>(null);
  const apriSceltaNote = () => { setRelazionePartita(null); setChiediNote(true); };
  useEffect(() => {
    if (chiaveRomantica === null || partitaId === null) return;
    let attivo = true;
    // una lettura fallita lascia la scelta senza casella: la relazione non cambia (si segna anche dalla scheda del Confidente)
    getConfidentiPartita(partitaId).then((l) => {
      const c = l.find((x) => x.chiave === chiaveRomantica);
      if (attivo) setRelazionePartita(c?.romanzabile ? { chiave: c.chiave, valore: c.relazioneRomantica } : null);
    }).catch(() => { if (attivo) setRelazionePartita(null); });
    return () => { attivo = false; };
  }, [chiaveRomantica, partitaId]);
  const relazioneDaChiedere = chiaveRomantica !== null && relazionePartita?.chiave === chiaveRomantica ? { valore: relazionePartita.valore } : undefined;
  // Il fuoco della tastiera nella voce. Le scelte della spunta (note, esiti, acquisti) restano col fuoco mentre la richiesta è in corso
  // (`aria-disabled` e `aria-busy`, mai `disabled`, che lo farebbe cadere sul documento); quando una scelta sparisce col fuoco dentro, il fuoco
  // passa alla casella di completamento, che resta (anche attraverso il rimontaggio della riga: `fuocoCasellaRef`).
  // `conFinestra`: conta anche la finestra «Prima di spuntare» della voce (`PreparaAcquistiVoce`), che sta fuori dalla riga (in fondo a <body>)
  const fuocoNellaVoce = (conFinestra = false): boolean => {
    const f = document.activeElement, riga = rifCasella.current?.closest('li');
    return !!f && !!riga && (riga.contains(f) || (conFinestra && !!f.closest('[role="dialog"]')));
  };
  /** Una parte della riga sta per sparire (`dentro`, o la scelta che ha appena ricevuto il gesto): se aveva il fuoco, il fuoco va alla casella
   *  (senza scorrere). Un altro elemento della riga col fuoco (il «⋯», «Modifica») resta com'è. */
  const fuocoAllaCasella = (dentro?: Element | null) => {
    const f = document.activeElement;
    if (!f || f === rifCasella.current || !fuocoNellaVoce()) return;
    if (dentro !== undefined && !dentro?.contains(f)) return;
    rifCasella.current?.focus({ preventScroll: true });
  };
  // il riquadro dei punti da applicare: quando sparisce (decisi tutti) e aveva il fuoco, il fuoco va alla casella
  const rifPunti = useRef<HTMLDivElement>(null);
  /**
   * Spunta o toglie l'azione nella partita. Se spuntandola servono le note e non sono ancora arrivate (né si è scelto
   * di non dare punti), apre prima la scelta delle note e si ferma. Altrimenti salva, passa al genitore l'azione
   * aggiornata, invalida i suggerimenti, notifica gli effetti della spunta e controlla se il giorno è avanzato.
   */
  // `relazioneRomantica`: la scelta romantica fatta nella scelta delle note (L13, O10-3; solo spuntando; assente = la relazione non cambia)
  const cambia = async (fatta: boolean, noteRisposta?: 1 | 2 | 3, senzaPunti = false, acquisti?: RichiestaRegistraAcquisto[], pesche?: RichiestaRegistraSessionePesca[], esiti?: SceltaEsitoSpunta[], osservate: OsservataSpunta[] = [], automatica = false, relazioneRomantica?: boolean): Promise<void> => {
    if (!partitaId || scrittura.current) return;
    if (pendente) { if (acquisti || pesche) throw new Error('Questa voce ha già un’operazione da completare: chiudila dall’elenco «Operazioni da completare».'); return; }
    if (fatta && chiedeNote(a) && noteRisposta === undefined && !senzaPunti) { apriSceltaNote(); return; }
    // la conferma della finestra «Prima di spuntare» (non la spunta automatica): il fuoco è nella finestra, fuori dalla riga
    const daFinestra = (!!acquisti || !!pesche) && !automatica;
    // l'elemento che aveva il fuoco al gesto, se era nella voce: alla fine il fuoco torna sulla casella solo se è ancora lì, o se è caduto sul
    // documento o con un elemento tolto; se chi gioca l'ha portato altrove (anche nella stessa riga, «⋯» o «Modifica») resta dov'è
    const elementoAlGesto = fuocoNellaVoce(daFinestra) ? document.activeElement : null;
    // 2026-10-30: la visita ai Memento non chiede più quali Dedali hai aperto: le aperture si calcolano dai Palazzi conclusi
    // L13: l'esito ottenuto (o «senza punti») si sceglie prima di salvare: una scelta non fatta non lascia la spunta (decisione A1)
    if (fatta && !a.fatta && a.scelteEsito?.length && esiti === undefined) {
      fuocoAllaCasella(); setChiediNote(false); setChiediEsiti({ noteRisposta, senzaPunti, relazioneRomantica }); return;
    }
    // 2026-10-28: consumazioni e visite di pesca si preparano da sole dalla voce e dallo stato della partita (`preparaOsservazioniVoce`): se
    // tutto è determinato la spunta registra senza finestra; la finestra compare solo con qualcosa di davvero aperto, e chiede solo quello
    if (fatta && !a.fatta && effettiDaOsservare(a).length && acquisti === undefined && pesche === undefined) {
      fuocoAllaCasella(); setChiediNote(false); setChiediEsiti(null);
      scrittura.current = true; setOccupato(true);
      let pronte: OsservazioniVoce | null;
      // una lettura fallita apre la finestra, che mostra l'errore e lascia rileggere
      try { pronte = await preparaOsservazioniVoce(partitaId, a, oggi); } catch { pronte = null; }
      finally { scrittura.current = false; if (vivo.current) setOccupato(false); }
      if (!vivo.current) return;
      if (!pronte?.complete) { setChiediAcquisti({ noteRisposta, senzaPunti, esiti, relazioneRomantica }); return; }
      const r = richiesteOsservazioni(pronte);
      return cambia(true, noteRisposta, senzaPunti, r.acquisti, r.pesche, esiti, r.osservate, true, relazioneRomantica);
    }
    // la scelta delle note resta aperta (e col fuoco) finché la spunta non è salvata: chiusa qui, il pulsante toccato sparirebbe col fuoco
    scrittura.current = true;
    setOccupato(true);
    try {
      const relazione = fatta ? relazioneRomantica : undefined;
      const agg = acquisti || pesche ? await eseguiSpuntaAcquistiConRegistro(partitaId, a.uid, { fatta: true, ...(noteRisposta ? { noteRisposta } : {}), ...(acquisti?.length ? { acquisti } : {}), ...(pesche?.length ? { pesche } : {}), ...(esiti?.length ? { scelteEsito: esiti } : {}), ...(relazione !== undefined ? { relazioneRomantica: relazione } : {}) }, { etichetta: `Spunta Diario: ${a.azione}`, voceUid: a.uid }) : await impostaAzionePercorso(partitaId, a.uid, fatta, noteRisposta, undefined, undefined, esiti, relazione);
      segnalaMutazioneEffetti(partitaId);
      if (!vivo.current) return;
      // le scelte della spunta spariscono: se il fuoco è ancora sull'elemento del gesto (la casella, la scelta delle note, degli esiti, la
      // finestra degli acquisti) o è caduto sul documento, va sulla casella. Se chi gioca l'ha portato su un altro controllo della riga (un
      // cartellino, una casella «In scorta») resta lì: se la riga si rimonterà (è cambiato ciò che la spunta legge), la riga nuova lo rimette
      // sullo stesso controllo (`fuocoCasellaRef`); fuori dalla voce non si tocca
      const ora = document.activeElement;
      const sulGesto = !!elementoAlGesto && (ora === elementoAlGesto || !ora || ora === document.body || !ora.isConnected);
      const rimonta = chiaveContesto(agg, partitaId) !== chiaveContesto(a, partitaId);
      if (sulGesto) {
        if (rimonta) fuocoCasellaRef.current = true;
        else if (ora !== rifCasella.current) rifCasella.current?.focus({ preventScroll: true });
      } else if (rimonta && ora && ora !== rifCasella.current && rifCasella.current?.closest('li')?.contains(ora)) {
        fuocoCasellaRef.current = nomeControllo(ora) || true;
      } else if (rimonta && (ora === rifCasella.current || (daFinestra && !!ora?.closest('[role="dialog"]')))) {
        // la casella stessa, o un altro comando della finestra «Prima di spuntare», che si chiude con la riga
        fuocoCasellaRef.current = true;
      }
      setChiediNote(false);
      setChiediEsiti(null);
      setChiediAcquisti(null);
      onCambiata(agg);
      // spuntando (o riaprendo) un'azione cambia cosa il giorno suggerisce: l'alone dorato si aggiorna da solo
      useSuggerimentiStore.getState().invalida();
      // che cosa è successo e, a parte, le Doti da segnare a mano (la spunta non le tocca)
      // spuntando, le Doti registrate con le loro note e i punti («Perizia ♪♪♪ · 5 punti»): chi ha scelto le note vede subito che cosa è entrato
      // (prima l'avviso non lo diceva, e ♪♪ registrate al posto di ♪♪♪ si scoprivano solo dall'«Applica»)
      const dotiRegistrate = fatta ? testoDotiDaSegnare(dotiDaSegnareDaEffetti(agg.effetti)) : '';
      // 2026-10-27: e i turni registrati, con l'esito applicato (base o con il bonus) e gli oggetti ricevuti e usati: chi spunta vede che cosa è entrato
      const turniRegistrati = fatta && agg.effetti?.turni?.length ? descriviEffetti({ doti: [], confidente: null, turni: agg.effetti.turni }, { senzaDoti: true, senzaPaga: true }) : '';
      // 2026-10-28: e le consumazioni e le visite di pesca registrate con la spunta, con gli yen davvero mossi letti dalla risposta
      // («Succo Aojiru Perizia · ♪ · 2 punti, 3 con la Fortuna · scalati ¥5000 dal saldo»; mai sotto zero: «nessuno yen scalato: …»)
      // L13 (O10-3): e la relazione romantica, se la scelta alla spunta l'ha cambiata (la stessa frase delle ricevute)
      const relazioneRegistrata = fatta && agg.effetti?.relazione ? fraseRelazione(agg.effetti.relazione) : '';
      const registrati = [...(fatta ? descriviOsservate(osservate, a.uid, agg.yenAutomatici) : []), turniRegistrati, relazioneRegistrata, dotiRegistrate].filter(Boolean).join(' · ');
      if (agg.ricevuteEffetti?.length) notifica('success', fatta ? `Spunta ed effetti registrati${registrati ? `: ${registrati}` : ''}. I punti si applicano dal pulsante sulla voce.` :'Spunta rimossa usando le sue ricevute. Le correzioni ai punti compaiono come pulsante «Annulla» sulla voce.');
      else if (fatta && agg.effetti) notifica('success', avvisoSpunta(agg.effetti), dotiDaSegnareDaEffetti(agg.effetti).length ? 7000 : undefined);
      // 2026-10-26: ciò che chi gioca deve sapere si dice, non succede in silenzio: spuntando, la Persona entrata nella scorta oltre la capienza;
      // togliendo la spunta, l'esemplare in scorta rimasto perché modificato dopo. Un avviso resta finché chi gioca non lo chiude (la durata
      // predefinita degli avvisi)
      if (agg.avvisiSpunta?.length) notifica('warning', agg.avvisiSpunta.join(' '));
      // era l'ultima attività di giorno o di sera (senza decisioni aperte): la partita è passata alla sera o al giorno dopo
      seGiornoAvanzato(agg);
    } catch (err) {
      if (vivo.current) notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
      // la finestra tiene l'errore e decide se rileggere; la spunta automatica lo ha già notificato
      if ((acquisti || pesche) && !automatica) throw err;
    } finally { scrittura.current = false; if (vivo.current) setOccupato(false); }
  };
  const stato = a.fatta ? null : a.stato;
  // L13 (O9-3, «in tal caso viene meno la consegna»): le condizioni «Si fa solo se» della voce sono false al suo giorno (solo su una voce non spuntata)
  const nonDovuta = !a.fatta && !!a.nonDovuta;
  // la prima spunta vuole tutte le caselle «In scorta» spuntate (il server risponde comunque 409); l'annullo di una voce fatta è sempre libero
  const scortaIncompleta = !a.fatta && !!a.requisiti?.some((r) => r.fatto !== true);
  const scortaFatti = a.requisiti?.filter((r) => r.fatto === true).length ?? 0;
  const scortaTotale = a.requisiti?.length ?? 0;
  const conAnello = scortaTotale > 0 && !a.fatta;
  const scortaMancano = scortaTotale - scortaFatti;
  // il richiamo all'elenco «In scorta»: cresce a ogni tentativo di completare la voce con caselle mancanti (`RequisitiVoce` porta il fuoco alla prima)
  const [richiamoScorta, setRichiamoScorta] = useState(0);
  const richiamaScorta = () => setRichiamoScorta((n) => n + 1);
  // Due modi di fermare la casella. Le ragioni durevoli (operazione da completare, voce non dovuta, effetti da correggere) la spengono
  // (`disabled`). Le attese (la sua richiesta in corso, `aria-busy`; un'operazione della giornata in corso) e le caselle «In scorta» mancanti
  // invece no: `aria-disabled`, così il fuoco della tastiera resta sulla casella (un `disabled` lo farebbe cadere sul documento a ogni spunta e
  // annullo) e il gesto si ignora; con la scorta incompleta un tocco, Spazio o Invio portano alla prima casella mancante (la descrizione dice
  // quante ne mancano). La spunta con acquisti o pesche della voce stessa, mentre è in volo, figura fra le operazioni da completare
  // (`pendente`): finché è sua (`occupato`) è un'attesa, non una ragione durevole
  const inSospeso = !!pendente && !occupato;
  const spenta = inSospeso || nonDovuta || (!a.fatta && a.effettiVoce?.stato === 'legacy-da-correggere');
  const inAttesa = occupato || !!bloccata;
  const ferma = !spenta && (inAttesa || scortaIncompleta);
  const richiamo = scortaIncompleta && !inAttesa;
  const casella = (
    <input ref={rifCasella} type="checkbox" className={`casella-voce w-5 h-5 shrink-0 ${conAnello ? '' : 'mt-2'}`} checked={a.fatta} disabled={spenta}
      aria-disabled={ferma || undefined} aria-busy={occupato || undefined}
      onClick={ferma ? (e) => { e.preventDefault(); if (richiamo) richiamaScorta(); } : undefined}
      onKeyDown={richiamo ? (e) => { if (e.key === 'Enter') { e.preventDefault(); richiamaScorta(); } } : undefined}
      onChange={(e) => { if (!ferma) void cambia(e.target.checked); }}
      aria-label={`Fatto: ${a.azione.slice(0, 60)}`} aria-describedby={[nonDovuta ? `non-dovuta-${a.uid}` : '', scortaIncompleta ? idMotivoScorta(a.uid) : ''].filter(Boolean).join(' ') || undefined} />
  );
  const classeStato = stato?.tipo === 'consigliata' ? 'azione--consigliata' : stato?.tipo === 'bloccata' ? 'azione--bloccata' : '';
  return (
    <li id={`voce-${a.uid}`} ref={rifRiga} className={`azione flex flex-wrap items-start gap-2 py-1.5 ${classeStato} ${evidenziata ? 'azione--evidenziata' : ''} ${classeRiga ?? ''} ${classeSelezioneRiga(selezione)}`} aria-current={evidenziata ? 'true' : undefined}
      {...(selezione && { ...selezione.gestori, onMouseDown: fuoriDallaScorta(selezione.gestori.onMouseDown), onClick: fuoriDallaScorta(selezione.gestori.onClick) })}>
      {maniglia}
      {/* il bersaglio è l'etichetta, non il quadratino: 44 px senza cambiarne l'aspetto */}
      {/* L13 (O9-3): una voce non dovuta nella partita non si spunta (il server risponde 409): la casella è spenta e il motivo sta sotto il testo */}
      {/* con un elenco «In scorta» la casella ha attorno l'anello d'avanzamento (arco rosso che cresce con le caselle spuntate, verde e pieno quando si
          può spuntare) e sotto una didascalia: «Mancano n» (anche descrizione della casella) o, a N/N, «Pronta» con il suo segno */}
      {partitaId && (
        <label className={`touch flex shrink-0 -my-1 ${conAnello ? 'scorta-casella' : 'items-start justify-center pr-1'} ${nonDovuta || scortaIncompleta ? 'cursor-not-allowed' : inAttesa ? 'cursor-progress' : 'cursor-pointer'}`}
          title={scortaIncompleta ? `In scorta: ${scortaFatti}/${scortaTotale}. Spunta le caselle che mancano.` : undefined}>
          {conAnello
            ? (
              <>
                <span className={`scorta-anello ${scortaIncompleta ? '' : 'scorta-anello--pronta'}`} style={{ '--p': scortaFatti / scortaTotale } as CSSProperties}>{casella}</span>
                {scortaIncompleta
                  ? <span id={idMotivoScorta(a.uid)} className="scorta-casella__motivo">Mancano {scortaMancano}<span className="sr-only"> su {scortaTotale} Persone da spuntare in scorta</span></span>
                  : <span className="scorta-casella__pronta"><IconaSegno chiave="scorta-pronta" dimensione={14} />Pronta</span>}
              </>
            )
            : casella}
        </label>
      )}
      <ImmagineAzione a={a} />
      <div className="flex flex-col gap-0.5 testo-13 min-w-0 flex-1">
        {/* D15: voce fatta = spunta rossa a sinistra e testo barrato in grigio (il segno fuori dal testo barrato: l'icona non si taglia) */}
        <span><SegnoStato stato={a.fatta ? 'fatto' : null} dimensione={14} className="mr-1.5 align-text-bottom" /><span className={a.fatta ? 'stato-fatto' : ''}>{a.azione}<TestoSelezioneRiga s={selezione} />{a.daRivedere && <>{' '}<DaRivedereVoce a={a} partitaId={partitaId} onCambiata={onCambiata} /></>}</span></span>
        {/* a pieno contrasto: dice perché la casella è spenta e che la giornata va avanti lo stesso */}
        {nonDovuta && <span id={`non-dovuta-${a.uid}`} className="testo-12 text-text text-pretty break-words"><span className="segno-non-dovuta" aria-hidden="true"><IconaSegno chiave="non-dovuta" dimensione={14} /></span><strong>Non dovuta:</strong> manca «{a.nonDovuta!.motivo}»</span>}
        {!IN_RILASCIO && daCompletare && <span className="flex"><SegnoDaCompletare n={daCompletare.n} voce={a.azione} onApri={daCompletare.onApri} /></span>}
        <CartelliniAzione a={a} onSullaMappa={onSullaMappa && a.mappa ? () => onSullaMappa(a.mappa!, a.uid) : undefined}
          onApriMappa={onSullaMappa ? (m) => onSullaMappa(m, a.uid) : undefined}
          onCassettoChiuso={partitaId !== null ? () => {
            // nel cassetto si può salire di rango o registrare punti: la voce si rilegge (stato, rango della partita, risposte proposte)
            void getVocePercorso(a.uid, partitaId).then((agg) => { if (vivo.current) onCambiata(agg); useSuggerimentiStore.getState().invalida(); })
              .catch((err: unknown) => notifica('error', err instanceof Error ? err.message : 'Voce non aggiornata.'));
          } : undefined}
          // L3 (§4.4): il campo «Infiltrazioni» delle voci di Palazzo, subito sotto il cartellino del Palazzo e sopra «Il gioco dà» (2026-10-25)
          infiltrazioni={<InfiltrazioniVoce a={a} partitaId={partitaId} onCambiata={onCambiata} />} />
        {/* le risposte migliori dell'avanzamento della voce Confidente, fra le sue note (progetto dei Confidenti, 2026-10-24) */}
        <RisposteVoce a={a} />
        {a.effettiVoce?.stato === 'legacy-da-correggere' && <p role="alert" className="m-0 text-warning">Effetti da correggere: {a.effettiVoce.motivo}. Il dato originario resta visibile nell’editor.</p>}
        {inSospeso && <p role="status" className="m-0 text-warning">Un’operazione su questa voce non è stata confermata: completala dall’elenco «Operazioni da completare» sopra le voci, poi potrai spuntare la voce.</p>}
        {/* BON-01: i punti della voce che aspettano una decisione, con «Applica» sulla voce (nessun pannello a parte) */}
        {/* L1-08: la giornata sta in Oggi o nel Diario, che mostrano già le operazioni da completare della partita: non si ripetono qui */}
        {partitaId !== null && !!a.daApplicare && <div ref={rifPunti} className="contents"><DaApplicare partitaId={partitaId} voceUid={a.uid} gestiNellaColonna onCambiato={async () => {
          const agg = await getVocePercorso(a.uid, partitaId);
          // decisi tutti i punti, il riquadro sparisce: se aveva il fuoco, il fuoco va alla casella della voce
          if (!agg.daApplicare) fuocoAllaCasella(rifPunti.current);
          onCambiata(agg);
        }} /></div>}
        {/* la frase con i nomi la scrive il server (`produceTesto`, nell'ordine degli effetti): una sola scrittura per ogni vista (R12-01/1).
            Da fare, Aojiru, pesca e Fortuna stanno già in «Il gioco dà» (`RiepilogoEffettiVoce`, nei cartellini): qui restano a voce fatta */}
        {a.fatta && a.effettiVoce?.effetti.map((e, i) => (e.effetto.tipo === 'acquisto' || e.effetto.tipo === 'pesca' || e.effetto.tipo === 'fortuna') && a.produceTesto[i] ? <span key={e.uid}><TestoNote testo={a.produceTesto[i]} /></span> : null)}
        {chiediAcquisti && partitaId !== null && <PreparaAcquistiVoce key={`${partitaId}:${a.uid}:${a.effettiVoce?.revisione}`} a={a} partitaId={partitaId} onRileggi={onCambiata} onChiudi={() => setChiediAcquisti(null)} onModifica={gesti?.find((g) => g.chiave === 'modifica')?.onClick} onConferma={(richieste, pesche, osservate) => cambia(true, chiediAcquisti.noteRisposta, chiediAcquisti.senzaPunti, richieste, pesche, chiediAcquisti.esiti, osservate, false, chiediAcquisti.relazioneRomantica)} />}
        {/* (revisione) lo strumento da scegliere si sceglie nell'editor della voce: la scelta offre di aprirlo (il gesto «Modifica», se la riga lo ha) */}
        {chiediEsiti && a.scelteEsito && <SceltaEsitiVoce scelte={a.scelteEsito} occupato={occupato} onModifica={gesti?.find((g) => g.chiave === 'modifica')?.onClick} onConferma={(s) => void cambia(true, chiediEsiti.noteRisposta, chiediEsiti.senzaPunti, undefined, undefined, s, [], false, chiediEsiti.relazioneRomantica)} onAnnulla={() => { fuocoAllaCasella(); setChiediEsiti(null); }} />}
        {/* la scelta delle note parte dall'evento che si gioca davvero: il prossimo della partita, se diverso dal rango atteso della voce */}
        {chiediNote && <SceltaNote occupato={occupato} relazione={relazioneDaChiedere}
          onScegli={(n, relazione) => void cambia(true, n ?? undefined, n === null, undefined, undefined, undefined, [], false, relazione)} onAnnulla={() => { fuocoAllaCasella(); setChiediNote(false); }} />}
      </div>
      {/* il posto dei comandi della voce: Modifica, Elimina e il «⋯» del menu a tendina (C9, `ComandiVoce`; in una colonna a destra del testo, e
          con la voce stretta — telefono, Diario a mezza pagina — a destra nella prima fila, accanto a maniglia, casella e immagine, col testo a
          tutta larghezza sotto: `.comandi-voce__posto`) e le ricevute della spunta dietro un pulsantino (2026-10-25: «magari
          andrebbero visualizzati con un pulsantino e non restando la sotto sempre visibili»).
          2026-10-26: solo ciò che la spunta ha applicato ed è in vigore (`applicatoDallaSpunta`), non le ricevute annullate o tecniche; L13
          (decisione 19), a parte nella stessa finestra, gli effetti di stato che nella partita non valgono (`statiNonApplicati`) */}
      {((gesti && onMenu) || !!a.applicatoDallaSpunta?.length || !!a.statiNonApplicati?.length) && (
        <span className="comandi-voce__posto">
          {gesti && onMenu && <ComandiVoce voce={a.azione} uid={a.uid} gesti={gesti} aperto={menuAperto} onCambia={onMenu} disabled={occupato || bloccata} />}
          <RicevuteVoce applicato={a.applicatoDallaSpunta} nonApplicati={a.statiNonApplicati} voce={a.azione} />
        </span>
      )}
      {/* l'elenco «da avere in scorta» (caselle manuali della partita): una fila a tutta larghezza della voce, sotto casella, immagine, testo e
          comandi (`.azione > .scorta-voce`); la casella di completamento resta ferma finché ne manca una */}
      <RequisitiVoce a={a} partitaId={partitaId} onCambiata={onCambiata} richiamo={richiamoScorta} />
    </li>
  );
}
