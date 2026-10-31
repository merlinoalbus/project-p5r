// ============================================================
// GiornoGuida — la guida di un giorno: scheda del giorno (data, fase, meteo, trama, vincoli, avvisi) e voci di giorno e di sera
// con spunta per partita, stato «consigliata» (oro) / «bloccata» (grigio, con motivo) e collegamenti al punto esatto (Fase 7.5b, 12.4/13.5)
// ============================================================
//
// Usato dalla pagina «Guida giorno per giorno» e dalla scheda «Oggi» della Partita (dove un'azione con un luogo collegato centra la mappa).
//
// La giornata è canone (richieste dell'utente, 2026-09-30): le voci — azioni della guida, cose da fare ed eventi aggiunti — sono
// una lista sola per fascia, nel loro ordine esatto, e ogni modifica cambia la guida per tutte le partite (e il pacchetto che si
// esporta). Ogni voce ha i suoi gesti: Modifica, Sposta su, Sposta giù, Sposta di giorno/di sera, Elimina (C9, 2026-10-31: Modifica
// ed Elimina a vista accanto al «⋯», gli altri nel suo menu a tendina, `ComandiVoce`). Le due sezioni ci sono sempre, anche vuote,
// perché è lì che si aggiunge; il posto esatto della voce nuova si sceglie nella finestra. Dal C9 ognuna si chiude e si riapre dal suo
// nome (aperte per impostazione, per la sessione: `fasceDiarioStore`).
// Dal 2026-10-12 («copiare elementi del diario... e poterli inserire in un altro giorno o nella parte giorno o nella parte notte
// a scelta»; scelte «Una o più insieme» e «Sì, anche spostare») «Copia o sposta voci» apre la scelta: le voci di giorno e di sera
// diventano righe da spuntare, e «Copia in…» / «Sposta in…» le mandano in un altro giorno e fascia (`TrasferisciVoci`).
// ============================================================

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { aggiornaVoceGiornata, eliminaVoceGiornata, getVocePercorso, impostaAzionePercorso, spostaVoceGiornata } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { avvisoSpunta, descriviEffetti } from '../../utils/percorso';
import { dotiDaSegnareDaEffetti, testoDotiDaSegnare } from '../../utils/dotiDaSegnare';
import type { AzionePercorsoDto, FasciaGioco, GenereVoce, PercorsoGiornoDto } from '../../types';
import { DataP5 } from '../shared/DataP5';
import { Maniglia } from '../shared/Maniglia';
import { useRiordinoCollegato } from '../../hooks/useRiordino';
import { MeteoIcona } from './MeteoIcona';
import { TagAllerte } from '../shared/TagAllerta';
import { FasciaGiornata, IconaFascia } from './FasciaGiornata';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { TestoNote } from '../shared/TestoNote';
import { Modal } from '../shared/Modal';
import { useSuggerimentiStore } from '../../stores/suggerimentiStore';
import { ComandiVoce, TestoSelezioneRiga, type GestoVoce, type SelezioneRiga } from './MenuVoce';
import { chiaveFascia, useFasceDiarioStore } from '../../stores/fasceDiarioStore';
import { classeSelezioneRiga } from '../../utils/selezioneRiga';
import { useSelezioneVoci } from '../../hooks/useSelezioneVoci';
import { useAppuntiDiario } from '../../hooks/useAppuntiDiario';
import { useAppuntiDiarioStore } from '../../stores/appuntiDiarioStore';
import { useMedia } from '../../hooks/useMedia';
import { BarraSelezioneVoci } from './BarraSelezioneVoci';
import { FinestraIncolla, FinestraIncollaManuale } from './FinestraIncolla';
import { ModuloVoceGiornata, type SoggettoVoce } from './ModuloVoceGiornata';
import { VoceEvento } from './VociAgenda';
import { CartelliniAzione, ImmagineAzione, SceltaNote } from './PartiAzione';
import { DaRivedereVoce, InfiltrazioniVoce } from './InfiltrazioniVoce';
import { RisposteVoce } from './RisposteVoce';
import { RicevuteVoce } from './RicevuteVoce';
import { chiedeNote } from '../../utils/azioneStrutturata';
import { seGiornoAvanzato } from '../../utils/giornoAvanzato';
import { TrasferisciVoci } from './TrasferisciVoci';
import { PreparaAcquistiVoce } from './PreparaAcquistiVoce';
import { descriviOsservate, effettiDaOsservare, preparaOsservazioniVoce, richiesteOsservazioni, type OsservataSpunta, type OsservazioniVoce } from '../../services/osservazioniVoce';
import { usePartitaStore } from '../../stores/partitaStore';
import { DaApplicare } from '../partita/DaApplicare';
import type { RichiestaRegistraAcquisto } from '../../../shared/acquisti';
import type { RichiestaRegistraSessionePesca } from '../../../shared/pesca';
import type { SceltaEsitoSpunta } from '../../../shared/esitiAttivita';
import { SceltaEsitiVoce } from './SceltaEsito';
import { FinestraProposteVoce, SegnoDaCompletare } from './ProposteDaCompletare';
import { useProposteDelGiorno } from '../../hooks/useProposteDaCompletare';
import { eseguiSpuntaAcquistiConRegistro, gestoPendenteNelloScope, segnalaMutazioneEffetti, useGestiPartita } from '../../services/gestiPartita';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

/** Quanto si aspetta, dopo un clic che seleziona la prima voce, il secondo clic di un doppio clic (di solito entro 200–300 ms) prima di
 *  mostrare la barra delle voci selezionate. */
const ATTESA_DOPPIO_CLIC = 400;

/** I comandi dentro una riga: il clic lì è loro, non seleziona la voce. Il menu a tendina della voce (C9) sta in un portale ma i suoi clic
 *  risalgono nell'albero di React fino alla riga: anche il suo fondo (bordo, spazi fra le voci) è un comando, non la riga. */
const INTERATTIVI = 'a, button, input, label, select, textarea, summary, details, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [role="menu"], [role="menuitem"], [role="menuitemcheckbox"], [role="dialog"], [contenteditable=""], [contenteditable="true"]';

/** La fascia opposta: giorno ↔ sera. */
const altraFascia = (f: FasciaGioco): FasciaGioco => (f === 'giorno' ? 'sera' : 'giorno');
/** La fascia come complemento di tempo, per i testi («di giorno», «di sera»). */
const nomeFascia = (f: FasciaGioco) => (f === 'giorno' ? 'di giorno' : 'di sera');
/** Vero per le voci che non sono azioni (eventi, scadenze, promemoria), che si mostrano senza spunta. */
const eEvento = (v: AzionePercorsoDto): v is AzionePercorsoDto & { genere: Exclude<GenereVoce, 'azione'> } => v.genere !== 'azione';

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

/** Una riga d'azione della giornata (della guida o aggiunta): spunta, immagine dell'entità, testo, tipo, collegamento, stato, note, gesti. */
export function Azione(props: PropsAzione) {
  const { a, partitaId } = props;
  const contesto = JSON.stringify([partitaId, a.uid, a.fatta, a.giorno, a.fascia, a.genere, a.azione, a.tipo, a.riferimento, a.rangoAtteso, a.effettiVoce?.revisione]);
  return <AzioneNelContesto key={contesto} {...props} />;
}
function AzioneNelContesto({ a, partitaId, onCambiata, onSullaMappa, evidenziata, gesti, menuAperto = false, onMenu, bloccata, maniglia, rifRiga, classeRiga, daCompletare, selezione }: PropsAzione) {
  const [occupato, setOccupato] = useState(false);
  const [chiediAcquisti, setChiediAcquisti] = useState<{ noteRisposta?: 1 | 2 | 3; senzaPunti: boolean; esiti?: SceltaEsitoSpunta[] } | null>(null);
  // L13: la scelta dell'esito (turno di un'attività con esiti, note di una Dote a valori possibili) prima di salvare la spunta
  const [chiediEsiti, setChiediEsiti] = useState<{ noteRisposta?: 1 | 2 | 3; senzaPunti: boolean } | null>(null);
  const vivo = useRef(true);
  const scrittura = useRef(false);
  useLayoutEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);
  useGestiPartita();
  const oggi = usePartitaStore((s) => (partitaId !== null && s.attiva?.id === partitaId ? s.attiva.dataGioco : null));
  const pendente = partitaId !== null ? gestoPendenteNelloScope(partitaId, { voceUid: a.uid, ...(a.effettiVoce?.effetti.some(e => e.effetto.tipo === 'pesca') ? { pesca: true } : {}) }) : null;
  // Azione «tempo con un Confidente»: alla spunta l'app chiede quante note (1–3) si sono ottenute (scelta A, 2 preselezionato).
  const [chiediNote, setChiediNote] = useState(false);
  /**
   * Spunta o toglie l'azione nella partita. Se spuntandola servono le note e non sono ancora arrivate (né si è scelto
   * di non dare punti), apre prima la scelta delle note e si ferma. Altrimenti salva, passa al genitore l'azione
   * aggiornata, invalida i suggerimenti, notifica gli effetti della spunta e controlla se il giorno è avanzato.
   */
  const cambia = async (fatta: boolean, noteRisposta?: 1 | 2 | 3, senzaPunti = false, acquisti?: RichiestaRegistraAcquisto[], pesche?: RichiestaRegistraSessionePesca[], esiti?: SceltaEsitoSpunta[], osservate: OsservataSpunta[] = [], automatica = false): Promise<void> => {
    if (!partitaId || scrittura.current) return;
    if (pendente) { if (acquisti || pesche) throw new Error('Questa voce ha già un’operazione da verificare nel registro.'); return; }
    if (fatta && chiedeNote(a) && noteRisposta === undefined && !senzaPunti) { setChiediNote(true); return; }
    // 2026-10-30: la visita ai Memento non chiede più quali Dedali hai aperto: le aperture si calcolano dai Palazzi conclusi (migrazione 305)
    // L13: l'esito ottenuto (o «senza punti») si sceglie prima di salvare: una scelta non fatta non lascia la spunta (decisione A1)
    if (fatta && !a.fatta && a.scelteEsito?.length && esiti === undefined) {
      setChiediNote(false); setChiediEsiti({ noteRisposta, senzaPunti }); return;
    }
    // 2026-10-28: consumazioni e visite di pesca si preparano da sole dalla voce e dallo stato della partita (`preparaOsservazioniVoce`): se
    // tutto è determinato la spunta registra senza finestra; la finestra compare solo con qualcosa di davvero aperto, e chiede solo quello
    if (fatta && !a.fatta && effettiDaOsservare(a).length && acquisti === undefined && pesche === undefined) {
      setChiediNote(false); setChiediEsiti(null);
      scrittura.current = true; setOccupato(true);
      let pronte: OsservazioniVoce | null;
      // una lettura fallita apre la finestra, che mostra l'errore e lascia rileggere
      try { pronte = await preparaOsservazioniVoce(partitaId, a, oggi); } catch { pronte = null; }
      finally { scrittura.current = false; if (vivo.current) setOccupato(false); }
      if (!vivo.current) return;
      if (!pronte?.complete) { setChiediAcquisti({ noteRisposta, senzaPunti, esiti }); return; }
      const r = richiesteOsservazioni(pronte);
      return cambia(true, noteRisposta, senzaPunti, r.acquisti, r.pesche, esiti, r.osservate, true);
    }
    setChiediNote(false);
    scrittura.current = true;
    setOccupato(true);
    try {
      const agg = acquisti || pesche ? await eseguiSpuntaAcquistiConRegistro(partitaId, a.uid, { fatta: true, ...(noteRisposta ? { noteRisposta } : {}), ...(acquisti?.length ? { acquisti } : {}), ...(pesche?.length ? { pesche } : {}), ...(esiti?.length ? { scelteEsito: esiti } : {}) }, { etichetta: `Spunta Diario: ${a.azione}`, voceUid: a.uid }) : await impostaAzionePercorso(partitaId, a.uid, fatta, noteRisposta, undefined, undefined, esiti);
      segnalaMutazioneEffetti(partitaId);
      if (!vivo.current) return;
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
      const registrati = [...(fatta ? descriviOsservate(osservate, a.uid, agg.yenAutomatici) : []), turniRegistrati, dotiRegistrate].filter(Boolean).join(' · ');
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
  const classeStato = stato?.tipo === 'consigliata' ? 'azione--consigliata' : stato?.tipo === 'bloccata' ? 'azione--bloccata' : '';
  return (
    <li id={`voce-${a.uid}`} ref={rifRiga} className={`azione flex flex-wrap items-start gap-2 py-1.5 ${classeStato} ${evidenziata ? 'azione--evidenziata' : ''} ${classeRiga ?? ''} ${classeSelezioneRiga(selezione)}`} aria-current={evidenziata ? 'true' : undefined}
      {...selezione?.gestori}>
      {maniglia}
      {/* il bersaglio è l'etichetta, non il quadratino: 44 px senza cambiarne l'aspetto */}
      {/* L13 (O9-3): una voce non dovuta nella partita non si spunta (il server risponde 409): la casella è spenta e il motivo sta sotto il testo */}
      {partitaId && <label className={`touch flex items-start justify-center shrink-0 -my-1 pr-1 ${nonDovuta ? 'cursor-not-allowed' : 'cursor-pointer'}`}><input type="checkbox" className="w-5 h-5 mt-2 shrink-0" checked={a.fatta} disabled={occupato || bloccata || !!pendente || nonDovuta || (!a.fatta && a.effettiVoce?.stato === 'legacy-da-correggere')} onChange={(e) => void cambia(e.target.checked)}
        aria-label={`Fatto: ${a.azione.slice(0, 60)}`} aria-describedby={nonDovuta ? `non-dovuta-${a.uid}` : undefined} /></label>}
      <ImmagineAzione a={a} />
      <div className="flex flex-col gap-0.5 testo-13 min-w-0 flex-1">
        <span className={a.fatta ? 'line-through' : ''}>{a.azione}<TestoSelezioneRiga s={selezione} />{a.daRivedere && <>{' '}<DaRivedereVoce a={a} partitaId={partitaId} onCambiata={onCambiata} /></>}</span>
        {/* a pieno contrasto: dice perché la casella è spenta e che la giornata va avanti lo stesso */}
        {nonDovuta && <span id={`non-dovuta-${a.uid}`} className="testo-12 text-text text-pretty break-words"><strong>Non dovuta:</strong> manca «{a.nonDovuta!.motivo}»</span>}
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
        {/* le risposte migliori del level up della voce Confidente, fra le sue note (progetto dei Confidenti, 2026-10-24) */}
        <RisposteVoce a={a} />
        {a.effettiVoce?.stato === 'legacy-da-correggere' && <p role="alert" className="m-0 text-warning">Effetti da correggere: {a.effettiVoce.motivo}. Il dato originario resta visibile nell’editor.</p>}
        {pendente && <p role="status" className="m-0 text-warning">Operazione da verificare nel registro dei gesti: questa voce non viene rispuntata.</p>}
        {/* BON-01: i punti della voce che aspettano una decisione, con «Applica» sulla voce (nessun pannello a parte) */}
        {partitaId !== null && !!a.daApplicare && <DaApplicare partitaId={partitaId} voceUid={a.uid} onCambiato={async () => { onCambiata(await getVocePercorso(a.uid, partitaId)); }} />}
        {/* la frase con i nomi la scrive il server (`produceTesto`, nell'ordine degli effetti): una sola scrittura per ogni vista (R12-01/1).
            Da fare, Aojiru, pesca e Fortuna stanno già in «Il gioco dà» (`RiepilogoEffettiVoce`, nei cartellini): qui restano a voce fatta */}
        {a.fatta && a.effettiVoce?.effetti.map((e, i) => (e.effetto.tipo === 'acquisto' || e.effetto.tipo === 'pesca' || e.effetto.tipo === 'fortuna') && a.produceTesto[i] ? <span key={e.uid}><TestoNote testo={a.produceTesto[i]} /></span> : null)}
        {chiediAcquisti && partitaId !== null && <PreparaAcquistiVoce key={`${partitaId}:${a.uid}:${a.effettiVoce?.revisione}`} a={a} partitaId={partitaId} onRileggi={onCambiata} onChiudi={() => setChiediAcquisti(null)} onModifica={gesti?.find((g) => g.chiave === 'modifica')?.onClick} onConferma={(richieste, pesche, osservate) => cambia(true, chiediAcquisti.noteRisposta, chiediAcquisti.senzaPunti, richieste, pesche, chiediAcquisti.esiti, osservate)} />}
        {/* (revisione) lo strumento da scegliere si sceglie nell'editor della voce: la scelta offre di aprirlo (il gesto «Modifica», se la riga lo ha) */}
        {chiediEsiti && a.scelteEsito && <SceltaEsitiVoce scelte={a.scelteEsito} occupato={occupato} onModifica={gesti?.find((g) => g.chiave === 'modifica')?.onClick} onConferma={(s) => void cambia(true, chiediEsiti.noteRisposta, chiediEsiti.senzaPunti, undefined, undefined, s)} onAnnulla={() => setChiediEsiti(null)} />}
        {/* la scelta delle note parte dall'evento che si gioca davvero: il prossimo della partita, se diverso dal rango atteso della voce */}
        {chiediNote && <SceltaNote dialogo={a.dialogoPartita ?? a.dialogo} occupato={occupato} onScegli={(n) => void cambia(true, n ?? undefined, n === null)} onAnnulla={() => setChiediNote(false)} />}
      </div>
      {/* il posto dei comandi della voce: Modifica, Elimina e il «⋯» del menu a tendina (C9, `ComandiVoce`; da 640 px in una colonna a destra
          del testo, sul telefono in una fila a sé in fondo alla voce: `.comandi-voce__posto`) e le ricevute della spunta dietro un pulsantino (2026-10-25: «magari
          andrebbero visualizzati con un pulsantino e non restando la sotto sempre visibili»).
          2026-10-26: solo ciò che la spunta ha applicato ed è in vigore (`applicatoDallaSpunta`), non le ricevute annullate o tecniche; L13
          (decisione 19), a parte nella stessa finestra, gli effetti di stato che nella partita non valgono (`statiNonApplicati`) */}
      {((gesti && onMenu) || !!a.applicatoDallaSpunta?.length || !!a.statiNonApplicati?.length) && (
        <span className="comandi-voce__posto">
          {gesti && onMenu && <ComandiVoce voce={a.azione} uid={a.uid} gesti={gesti} aperto={menuAperto} onCambia={onMenu} disabled={occupato || bloccata} />}
          <RicevuteVoce applicato={a.applicatoDallaSpunta} nonApplicati={a.statiNonApplicati} voce={a.azione} />
        </span>
      )}
    </li>
  );
}

interface Props {
  g: PercorsoGiornoDto;
  partitaId: number | null;
  onAggiorna: (a: AzionePercorsoDto) => void;
  /** Dopo una modifica della giornata (voce aggiunta, modificata, spostata, eliminata): va ricaricata. */
  onGiornataModificata?: () => void | Promise<void>;
  onSullaMappa?: SullaMappa;
  /** L'identità della voce da evidenziare (quella che ha scelto la mappa). */
  azioneEvidenziata?: string | null;
  /** Il numero della richiesta che ha evidenziato la voce (scheda «Oggi»: `StatoMappaOggi.richiesta`, cresce a ogni «Sulla mappa»): la
   *  stessa voce evidenziata di nuovo è una richiesta nuova e riapre la sua fascia anche se chi gioca l'aveva richiusa (C9). */
  richiestaEvidenziata?: number;
  /** Nella scheda «Oggi»: intestazione più compatta. */
  compatto?: boolean;
  /** Momento della giornata della partita per QUESTO giorno (solo se è il giorno corrente): la sezione «Di giorno» o «Di sera» viene evidenziata con «Adesso» (15.27). */
  fasciaCorrente?: 'giorno' | 'sera' | null;
  /** R11-15/1: se c'è, accanto alle allerte meteo del giorno compare la matita per correggerle e rimetterle com'erano nella guida; il gesto la richiama per rileggere. Assente in Partita. */
  onAllerteModificate?: () => void | Promise<void>;
  /** Appunti del Diario: il clic semplice col mouse su una riga la seleziona. Predefinito: sì nella pagina del Diario, no nella scheda «Oggi»
   *  (`compatto`), dove si gioca e un clic sul testo non deve far comparire la barra delle voci selezionate; lì restano Ctrl+clic,
   *  Maiusc+clic e «Seleziona» del menu (rilievo del revisore, 2026-10-26). */
  selezioneAlClic?: boolean;
  /** Da 768 px la giornata scorre in un'area interna (scheda «Oggi» con `riempi`): la barra delle voci selezionate si ferma sul fondo di
   *  quell'area, non 72 px più su per scavalcare la barra di navigazione, che lì sta già fuori dall'area. */
  scorreDentro?: boolean;
}

/** Richiesta di conferma prima di un gesto che non si disfa (eliminare una voce). */
interface Conferma { titolo: string; testo: ReactNode; scelte: Array<{ titolo: string; tono: 'primario' | 'pericolo'; icona: 'elimina' | 'annulla-ultimo'; esegui: () => Promise<unknown>; ok: string }> }

/** Scheda del giorno e voci di giorno e di sera, nel loro ordine, modificabili. */
export function GiornoGuida({ g, partitaId, onAggiorna, onGiornataModificata, onSullaMappa, azioneEvidenziata, richiestaEvidenziata = 0, compatto, fasciaCorrente, onAllerteModificate, selezioneAlClic = !compatto, scorreDentro = false }: Props) {
  // R10-27: tornando da una scheda (indietro, o «Esci» del Palazzo) l'indirizzo porta `#voce-<uid>`: la voce si porta in vista una volta
  // per giorno mostrato. Qui e non nella riga, che si rimonta a ogni spunta e riprenderebbe a scorrere.
  const { hash, search, key: chiaveNavigazione } = useLocation();
  // C9 (2026-10-31): «Di giorno» e «Di sera» si chiudono e si riaprono dall'intestazione, aperte per impostazione, per la sessione
  // (`fasceDiarioStore`). Una voce cercata (l'indirizzo `#voce-…` o `?voce=…` di una ricerca, di un ritorno) o evidenziata dalla mappa in
  // una fascia chiusa la riapre, una volta per richiesta: già in questo disegno (`forzate`), così chi la porta in vista (qui sotto, e
  // PercorsoPage che le dà anche il fuoco) la trova visibile; l'effetto poi la segna aperta nello store.
  const chiuse = useFasceDiarioStore((s) => s.chiuse);
  const mostrate = useFasceDiarioStore((s) => s.mostrate);
  const cercata = hash.startsWith('#voce-') ? hash.slice('#voce-'.length) : new URLSearchParams(search).get('voce');
  const daMostrare = [
    cercata ? { chiave: `indirizzo:${chiaveNavigazione}:${g.giorno}:${cercata}`, uid: cercata } : null,
    // una richiesta per ogni «Sulla mappa» (scheda «Oggi»: `richiestaEvidenziata` cresce ogni volta, anche per la stessa voce); nel Diario
    // la voce evidenziata è quella dell'indirizzo (`?voce=`), già richiesta una volta per navigazione dalla riga qui sopra
    azioneEvidenziata ? { chiave: `mappa:${richiestaEvidenziata}:${g.giorno}:${azioneEvidenziata}`, uid: azioneEvidenziata } : null,
  ].flatMap((r) => {
    const fascia = r && !mostrate[r.chiave] ? g.azioni.find((v) => v.uid === r.uid)?.fascia : undefined;
    return r && fascia ? [{ chiave: r.chiave, fascia }] : [];
  });
  const forzate = new Set(daMostrare.map((r) => r.fascia));
  /** La fascia è aperta: non chiusa da chi gioca, o con una voce da mostrare. */
  const aperta = (f: FasciaGioco) => !chiuse[chiaveFascia(g.giorno, f)] || forzate.has(f);
  const firmaDaMostrare = JSON.stringify(daMostrare);
  useEffect(() => {
    const richieste = JSON.parse(firmaDaMostrare) as Array<{ chiave: string; fascia: FasciaGioco }>;
    if (richieste.length === 0) return;
    const store = useFasceDiarioStore.getState();
    store.apri(g.giorno, richieste.map((r) => r.fascia));
    for (const r of richieste) store.segnaMostrata(r.chiave);
  }, [firmaDaMostrare, g.giorno]);
  useEffect(() => {
    if (!hash.startsWith('#voce-')) return;
    const el = document.getElementById(hash.slice(1));
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'center' });
  }, [g.giorno, hash]);
  const [occupato, setOccupato] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [soggetto, setSoggetto] = useState<SoggettoVoce | null>(null);
  const [conferma, setConferma] = useState<Conferma | null>(null);
  // Appunti del Diario (2026-10-26): le voci selezionate (clic, Ctrl+clic, Maiusc+clic col mouse; «Seleziona» nel menu della voce), legate al
  // giorno e nell'ordine visivo. La stessa selezione fa da scelta a caselle di «Copia o sposta voci» (2026-10-12, «Una o più insieme»),
  // e la finestra «Copia in…» / «Sposta in…» la manda in un altro giorno.
  const ordineVisivo = useMemo(() => [...g.azioni.filter((a) => a.fascia === 'giorno'), ...g.azioni.filter((a) => a.fascia === 'sera')].map((a) => a.uid), [g.azioni]);
  const sel = useSelezioneVoci(g.giorno, ordineVisivo);
  // C9: le voci che entrano nella selezione (Maiusc+clic che scavalca una fascia chiusa, voci incollate e selezionate, «Tutte» della
  // scelta) si vedono: la loro fascia chiusa si riapre. Solo le nuove: richiudere una fascia con voci selezionate la lascia chiusa (Copia,
  // Taglia e «Copia in…» continuano ad agire su tutta la selezione, anche nascosta). Una voce non ancora nella giornata (incollata, prima
  // che la giornata si rilegga) resta «nuova» finché non c'è.
  const selezioneVista = useRef<readonly string[]>([]);
  useEffect(() => {
    const viste = selezioneVista.current;
    const fasce = new Set<FasciaGioco>();
    const conosciute: string[] = [];
    for (const uid of sel.uid) {
      const fascia = g.azioni.find((v) => v.uid === uid)?.fascia;
      if (!fascia) continue;
      conosciute.push(uid);
      if (!viste.includes(uid)) fasce.add(fascia);
    }
    selezioneVista.current = conosciute;
    if (fasce.size) useFasceDiarioStore.getState().apri(g.giorno, [...fasce]);
  }, [sel.uid, g.azioni, g.giorno]);
  const [caselleDi, setCaselleDi] = useState<string | null>(null);
  const caselle = !IN_RILASCIO && caselleDi === g.giorno;
  const [trasferimento, setTrasferimento] = useState<'copia' | 'sposta' | null>(null);
  // L13 (ondata 4a, solo preparazione): le proposte «da completare» del giorno, rilette dopo ogni modifica della giornata; la voce di cui sono aperte
  const [versioneProposte, setVersioneProposte] = useState(0);
  const proposte = useProposteDelGiorno(g.giorno, versioneProposte);
  const [proposteDi, setProposteDi] = useState<string | null>(null);
  const scelte = caselle ? sel.insieme : null;
  /** Mette o toglie voci dalla scelta a caselle. */
  const scegli = (uid: string[], dentro: boolean) => sel.scegli(uid, dentro);
  // su tablet e telefono Copia, Taglia e Incolla qui stanno nel menu della voce (lì la tastiera non c'è)
  const tocco = useMedia('(pointer: coarse)');
  const taglio = useAppuntiDiarioStore((s) => s.taglio);
  const partita = partitaId ?? undefined;
  // la chiave del menu porta il giorno: cambiando giorno nessun menu resta aperto su una voce che non c'è più
  const chiaveMenu = (uid: string) => `${g.giorno}/${uid}`;
  /** Le props del menu di una voce: se è quello aperto e come aprirlo o chiuderlo (uno solo aperto alla volta). Aprendolo su tablet e
   *  telefono si prepara il blocco delle voci di Copia e Taglia, così si scrive negli appunti dentro il gesto. */
  const menuDi = (uid: string) => ({ menuAperto: menu === chiaveMenu(uid), onMenu: (aperto: boolean) => {
    setMenu(aperto ? chiaveMenu(uid) : null);
    if (aperto && tocco && !IN_RILASCIO) appunti.prepara(gruppoDi(uid));
  } });
  /** Rimette il fuoco sul pulsante «⋯» della voce (dopo un gesto del menu che lo chiude: chi usa un lettore di schermo resta lì). */
  const fuocoAlMenu = (uid: string) => setTimeout(() => document.getElementById(`voce-${uid}`)?.querySelector<HTMLButtonElement>('button[data-menu-voce]')?.focus());
  const radice = useRef<HTMLDivElement | null>(null);
  /** C9: la radice degli id dei contenuti delle due fasce (`aria-controls` del pulsante che le apre e chiude). */
  const idGiorno = useId();
  /** Il posto del fuoco nel giorno dopo un incolla o un annullo (WCAG 2.4.3): il «⋯» della voce `uid`, se c'è; altrimenti il primo «⋯»
   *  attivo del giorno; altrimenti il giorno stesso. Null se il giorno non è più a schermo (e nel rilascio, dove non si incolla).
   *  `attendi` (chi riprova al frame dopo, `rimettiFuoco`): finché la riga di `uid` non è ancora disegnata o dei «⋯» sono disattivati
   *  (un'operazione li tiene fermi) dà null, così si riprova invece di posare il fuoco sul giorno, che fermerebbe i tentativi (rilievo del
   *  revisore UX, giro 3); il giorno resta l'ultima riserva, all'ultimo tentativo o per chi non riprova. */
  const fuocoNelGiorno = IN_RILASCIO ? () => null : (uid: string | null, attendi = false): HTMLElement | null => {
    const r = radice.current;
    if (!r?.isConnected) return null;
    const suo = uid ? r.querySelector<HTMLButtonElement>(`[id="voce-${uid}"] button[data-menu-voce]`) : null;
    // C9: la voce sta in una fascia chiusa: la fascia si riapre (la voce va dove sta il fuoco) e chi riprova la trova al frame dopo
    const nascosto = (el: Element) => !!el.closest('[hidden]');
    const suoNascosto = !!suo && nascosto(suo);
    if (suoNascosto && uid) {
      const fascia = g.azioni.find((v) => v.uid === uid)?.fascia;
      if (fascia) useFasceDiarioStore.getState().apri(g.giorno, [fascia]);
    }
    if (suo && !suoNascosto && !suo.disabled) return suo;
    if (attendi && (suo || (uid && !r.querySelector(`[id="voce-${uid}"]`)) || r.querySelector('button[data-menu-voce]:disabled'))) return null;
    const primo = [...r.querySelectorAll<HTMLElement>('button[data-menu-voce]:not(:disabled)')].find((b) => !nascosto(b));
    if (primo) return primo;
    // il giorno stesso prende il fuoco solo per questo (un `tabIndex` fisso gli darebbe il fuoco a ogni clic sulle righe), e lo perde uscendo
    if (!r.hasAttribute('tabindex')) { r.setAttribute('tabindex', '-1'); r.addEventListener('blur', () => r.removeAttribute('tabindex'), { once: true }); }
    return r;
  };

  // aprire la finestra o la conferma chiude il menu della voce: tornando alla lista la riga è di nuovo com'era
  const apri = (s: SoggettoVoce) => { setMenu(null); setSoggetto(s); };
  /** Apre la richiesta di conferma, chiudendo il menu della voce. */
  const chiedi = (c: Conferma) => { setMenu(null); setConferma(c); };

  /** Dopo una modifica della giornata: la fa ricaricare al genitore e invalida i suggerimenti del giorno. */
  const aggiornata = async () => {
    segnalaMutazioneEffetti(null);
    setVersioneProposte((n) => n + 1);
    await onGiornataModificata?.();
    // testo, fascia, posto o presenza di una voce cambiano cosa il giorno suggerisce
    useSuggerimentiStore.getState().invalida();
  };
  /** `ok`: il messaggio, oppure una funzione che lo ricava dall'esito. `tieniMenu`: dopo uno spostamento il menu resta sulla voce, per spostarla ancora. */
  const esegui = async <T,>(op: () => Promise<T>, ok: string | ((esito: T) => string) | null, tieniMenu = false) => {
    setOccupato(true);
    try {
      const esito = await op();
      await aggiornata();
      if (!tieniMenu) setMenu(null);
      if (ok) notifica('success', typeof ok === 'string' ? ok : ok(esito));
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Operazione non riuscita.');
      // un gesto riuscito a metà (spunta tolta, eliminazione rifiutata) ha già cambiato qualcosa: la giornata si rilegge comunque
      await Promise.resolve(aggiornata()).catch(() => undefined);
    } finally {
      setOccupato(false);
    }
  };

  // Ctrl+C / Ctrl+X / Ctrl+V / Esc con gli appunti di sistema (nel rilascio niente: l'hook è vuoto e il modulo esce dal bundle)
  // Esc chiude prima il menu della voce aperto (il fuoco torna al suo «⋯»), poi annulla la selezione
  const appunti = useAppuntiDiario({ giorno: g.giorno, voci: g.azioni, selezione: sel, onModificata: async () => { await aggiornata(); },
    chiudiMenu: () => {
      if (menu === null) return false;
      const uid = menu.slice(menu.indexOf('/') + 1);
      setMenu(null);
      fuocoAlMenu(uid);
      return true;
    },
    fuoco: fuocoNelGiorno });
  const bloccata = occupato || appunti.occupato;
  /** Le voci su cui agisce il menu di una voce: la selezione, se la voce ne fa parte; altrimenti la voce sola. */
  const gruppoDi = (uid: string): readonly string[] => (sel.insieme.has(uid) ? sel.uid : [uid]);
  // il puntatore dell'ultimo gesto sulle righe: col mouse il clic seleziona, col dito no (su tablet e telefono si seleziona dal menu)
  const puntatore = useRef('mouse');
  /** La selezione prima dell'ultimo clic semplice: un doppio clic (per una parola del testo) la rimette, così non resta la barra delle voci. */
  const primaDelClic = useRef<string[] | null>(null);
  /** Vero subito dopo un clic semplice che ha selezionato la prima voce: finché non si sa se è un doppio clic (per una parola del testo) la
   *  barra delle voci e il loro annuncio non compaiono, così non lampeggiano per niente (rilievo del revisore UX, giro 3). Solo dal nulla:
   *  con una selezione già a schermo la barra resta e dice subito il numero vero, che è quello su cui agiscono i suoi comandi. */
  const [attesaDoppioClic, setAttesaDoppioClic] = useState(false);
  const timerDoppioClic = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fineAttesaDoppioClic = () => { if (timerDoppioClic.current) { clearTimeout(timerDoppioClic.current); timerDoppioClic.current = null; } setAttesaDoppioClic(false); };
  useEffect(() => () => { if (timerDoppioClic.current) clearTimeout(timerDoppioClic.current); }, []);
  /** Quante voci selezionate mostrano la barra e l'annuncio (zero durante l'attesa del doppio clic). */
  const selezionateAVista = attesaDoppioClic ? 0 : sel.uid.length;
  /** La selezione di una riga: stato, segno del taglio e gestori del clic (clic, Ctrl+clic, Maiusc+clic). */
  const selezioneDi = (uid: string): SelezioneRiga | undefined => (IN_RILASCIO || caselle ? undefined : {
    selezionata: sel.insieme.has(uid),
    inTaglio: !!taglio && taglio.giorno === g.giorno && taglio.uid.includes(uid),
    gestori: {
      onPointerDown: (e) => { puntatore.current = e.pointerType || 'mouse'; },
      // Maiusc+clic estenderebbe la selezione del testo: col mouse sulla riga (non sui suoi comandi) seleziona le voci
      onMouseDown: (e) => { if (e.shiftKey && puntatore.current === 'mouse' && !(e.target as Element).closest(INTERATTIVI)) e.preventDefault(); },
      onClick: (e) => {
        // tocco e penna: niente (il menu della voce); un clic da tastiera (detail 0) è dei comandi
        if (puntatore.current !== 'mouse' || e.button !== 0 || e.detail === 0 || (e.target as Element).closest(INTERATTIVI)) return;
        // doppio (o triplo) clic: è per selezionare una parola (o la riga) del testo; la selezione che il primo clic aveva cambiato torna com'era
        if (e.detail > 1) {
          const prima = primaDelClic.current;
          primaDelClic.current = null;
          if (prima) sel.imposta(prima);
          fineAttesaDoppioClic();
          return;
        }
        primaDelClic.current = null;
        fineAttesaDoppioClic();
        // un clic che chiude una selezione di testo resta al testo
        if (window.getSelection()?.toString()) return;
        if (e.shiftKey) sel.intervallo(uid);
        else if (e.ctrlKey || e.metaKey) sel.alterna(uid);
        else if (selezioneAlClic) {
          primaDelClic.current = [...sel.uid];
          sel.sostituisci(uid);
          if (primaDelClic.current.length === 0) {
            setAttesaDoppioClic(true);
            timerDoppioClic.current = setTimeout(() => { timerDoppioClic.current = null; setAttesaDoppioClic(false); }, ATTESA_DOPPIO_CLIC);
          }
        }
      },
    },
  });

  /** Una sola operazione server raccoglie voce, spunte, fonti e ricevute nel Cestino prima della rimozione. */
  const elimina = (v: AzionePercorsoDto) => {
    /** L'eliminazione vera e propria della voce dalla guida; ciò che resta in una partita (un esemplare in scorta modificato dopo la spunta) lo si dice. */
    const via = async () => {
      const esito = await eliminaVoceGiornata(v.uid);
      if (esito?.avvisi.length) notifica('warning', esito.avvisi.join(' '));
    };
    const che = { azione: ['la voce', 'Voce eliminata'], evento: ['l\'evento', 'Evento eliminato'], scadenza: ['la scadenza', 'Scadenza eliminata'], promemoria: ['il promemoria', 'Promemoria eliminato'] }[v.genere];
    chiedi({
      titolo: `Eliminare ${che[0]}?`,
      testo: <>«{v.azione}» esce dalla guida per tutte le partite e finisce nel Cestino, con spunte, fonti e collegamenti da ripristinare. Le spunte e le fonti d’acquisto della voce vengono rimosse nello stesso gesto, usando le proprie ricevute; le altre fonti della consumazione rimangono. Le eventuali correzioni ai saldi Doti e yen compaiono come pulsante sulla voce.</>,
      scelte: [{ titolo: 'Metti nel Cestino', tono: 'pericolo', icona: 'elimina', esegui: via, ok: `${che[1]} dalla guida e conservata nel Cestino.` }],
    });
  };

  /** Un passo su o giù dal menu: il menu resta sulla voce, e il fuoco sul gesto (o sull'opposto, se al bordo il gesto sparisce). */
  const sposta = (v: AzionePercorsoDto, verso: -1 | 1) => void esegui(() => spostaVoceGiornata(v.uid, verso, partita), null, true).then(() => setTimeout(() => {
    // il menu a tendina della voce (C9, `MenuGesti` in un portale): lo ritrova la sua identità
    const fila = [...document.querySelectorAll<HTMLElement>('[role="menu"][data-voce]')].find((el) => el.dataset.voce === v.uid);
    const pulsanti = [...(fila?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
    (pulsanti.find((b) => b.textContent?.trim() === (verso === -1 ? 'Sposta su' : 'Sposta giù')) ?? pulsanti.find((b) => b.textContent?.trim() === (verso === -1 ? 'Sposta giù' : 'Sposta su')))?.focus();
  }));

  /** I gesti di una voce, al suo posto `i` nella fascia di `n` voci. */
  const gesti = (v: AzionePercorsoDto, i: number, n: number): GestoVoce[] => [
    // appunti del Diario (2026-10-26): «Seleziona» su ogni dispositivo (anche da tastiera); Copia, Taglia e Incolla qui dove non c'è la tastiera
    { chiave: 'seleziona', titolo: 'Seleziona', premuto: sel.insieme.has(v.uid), icona: <IconaAzione chiave="seleziona" dimensione={20} />, onClick: () => sel.alterna(v.uid) },
    // con più voci selezionate, fra cui questa, Copia e Taglia agiscono su tutte: il numero si vede nel nome («Taglia (3)»), perché sul
    // tocco il suggerimento non compare. Il menu si chiude e il fuoco torna al suo «⋯»
    ...(tocco ? (() => {
      const gruppo = gruppoDi(v.uid);
      const piu = gruppo.length > 1 ? ` (${gruppo.length})` : '';
      return [
        { chiave: 'copia', titolo: `Copia${piu}`, descrizione: piu ? `Copia le ${gruppo.length} voci selezionate` : 'Copia questa voce', icona: <IconaAzione chiave="copia" dimensione={20} />, onClick: () => { setMenu(null); fuocoAlMenu(v.uid); appunti.copia(gruppo); } },
        { chiave: 'taglia', titolo: `Taglia${piu}`, descrizione: piu ? `Taglia le ${gruppo.length} voci selezionate` : 'Taglia questa voce', icona: <IconaAzione chiave="taglia" dimensione={20} />, onClick: () => { setMenu(null); fuocoAlMenu(v.uid); appunti.taglia(gruppo); } },
        { chiave: 'incolla', titolo: 'Incolla qui', descrizione: 'Incolla dopo questa voce', icona: <IconaAzione chiave="incolla" dimensione={20} />, onClick: () => { setMenu(null); fuocoAlMenu(v.uid); appunti.incollaDagliAppunti(v.uid); } },
      ];
    })() : []),
    // C7 (appunti fissi, 2026-10-31): accanto a Copia, su ogni dispositivo, il testo che Copia scriverebbe va nella finestra degli appunti
    // fissi con un titolo proposto (la finestra prende il fuoco sul titolo, per cambiarlo prima di salvare)
    (() => {
      const gruppo = gruppoDi(v.uid);
      const piu = gruppo.length > 1 ? ` (${gruppo.length})` : '';
      return { chiave: 'fisso', titolo: `Salva negli appunti fissi${piu}`, descrizione: piu ? `Salva le ${gruppo.length} voci selezionate negli appunti fissi` : 'Salva questa voce negli appunti fissi, per incollarla di nuovo',
        icona: <IconaAzione chiave="piano" dimensione={20} />, onClick: () => { setMenu(null); appunti.salvaFisso(gruppo); } };
    })(),
    { chiave: 'modifica', titolo: 'Modifica', icona: <IconaAzione chiave="modifica" dimensione={20} />, onClick: () => apri({ tipo: 'voce', voce: v }) },
    ...(i > 0 ? [{ chiave: 'su', titolo: 'Sposta su', icona: <IconaAzione chiave="su" dimensione={20} />, onClick: () => sposta(v, -1) }] : []),
    ...(i < n - 1 ? [{ chiave: 'giu', titolo: 'Sposta giù', icona: <IconaAzione chiave="giu" dimensione={20} />, onClick: () => sposta(v, 1) }] : []),
    // C9: la fascia d'arrivo, se chiusa, si riapre: la voce spostata resta a vista
    { chiave: 'fascia', titolo: `Sposta ${nomeFascia(altraFascia(v.fascia))}`, icona: <IconaFascia fascia={altraFascia(v.fascia)} />, onClick: () => { useFasceDiarioStore.getState().apri(g.giorno, [altraFascia(v.fascia)]); void esegui(() => aggiornaVoceGiornata(v.uid, { fascia: altraFascia(v.fascia) }, partita), `Spostata ${nomeFascia(altraFascia(v.fascia))}, in fondo, per tutte le partite.`); } },
    // C9: Modifica ed Elimina stanno a vista accanto al «⋯» (`ComandiVoce`), con questi stessi gesti; fuori dal menu
    { chiave: 'elimina', titolo: 'Elimina', tono: 'pericolo', icona: <IconaAzione chiave="elimina" dimensione={20} />, onClick: () => elimina(v) },
  ];

  // Riordino per trascinamento (progetto approvato, tavola «Ordinamento nel diario: trascina»): una maniglia ⠿ su ogni voce, dentro la
  // fascia e da una fascia all'altra. Salva con la stessa API del modulo (`fascia` + `posizione`); poi la giornata si ricarica.
  const riordino = useRiordinoCollegato(
    (['giorno', 'sera'] as const).map((f) => ({ nome: f, ids: g.azioni.filter((a) => a.fascia === f).map((a) => a.uid) })),
    occupato ? 'Un momento: sto salvando l’ultima modifica' : null,
    // nel rilascio (sola lettura, voci del diario comprese) il riordino non esiste: nessuna maniglia (sotto) e nessuna scrittura
    IN_RILASCIO ? () => undefined : (uid, lista, posizione) => {
      const f: FasciaGioco = lista === 'sera' ? 'sera' : 'giorno';
      const v = g.azioni.find((a) => a.uid === uid);
      if (!v) return undefined;
      // C9: rilasciata in una fascia chiusa (in fondo), la fascia si riapre e la voce si vede dov'è andata
      useFasceDiarioStore.getState().apri(g.giorno, [f]);
      return esegui(() => aggiornaVoceGiornata(uid, { fascia: f, posizione }, partita), f !== v.fascia ? `Spostata ${nomeFascia(f)}, per tutte le partite.` : null);
    },
  );
  /** Lo stato di una riga durante il trascinamento: attenuata se è la trascinata, con la linea del rilascio sopra (o, per il fondo, sotto). */
  const rigaRiordino = (fascia: FasciaGioco, voci: AzionePercorsoDto[], v: AzionePercorsoDto) => {
    const { trascinato, rilascio } = riordino;
    const trascinata = voci.find((x) => x.uid === trascinato);
    const resto = voci.filter((x) => x.uid !== trascinato);
    const dove = rilascio?.lista === fascia ? rilascio.indice : null;
    // rilasciata dov'è già: nessuna linea, nessun cambiamento
    const invariato = !!trascinata && dove !== null && dove === voci.indexOf(trascinata);
    const sopra = trascinato !== null && dove !== null && !invariato && resto[dove]?.uid === v.uid;
    const sotto = trascinato !== null && dove !== null && !invariato && dove >= resto.length && resto[resto.length - 1]?.uid === v.uid;
    return {
      maniglia: <Maniglia etichetta={`Sposta la voce «${v.azione.slice(0, 60)}»`} id={v.uid} riordino={riordino} />,
      rifRiga: riordino.riga(v.uid),
      classeRiga: `${trascinato === v.uid ? 'opacity-50' : ''} ${sopra ? 'relative [box-shadow:0_-3px_0_0_var(--color-primary)]' : sotto ? 'relative [box-shadow:0_3px_0_0_var(--color-primary)]' : ''}`,
    };
  };

  // L13 (O9-3): una voce non dovuta nella partita (non spuntata) non è una cosa da fare: non si conta, come nell'indice dei giorni
  const azioni = g.azioni.filter((a) => a.genere === 'azione' && (a.fatta || !a.nonDovuta));
  const totali = { fatte: azioni.filter((a) => a.fatta).length, tutte: azioni.length };
  const consigliate = azioni.filter((a) => !a.fatta && a.stato?.tipo === 'consigliata').length;
  const bloccate = azioni.filter((a) => !a.fatta && a.stato?.tipo === 'bloccata').length;

  /**
   * La sezione di una fascia: intestazione (evidenziata se è il momento corrente, con fatte su totali in partita),
   * «Aggiungi» e le voci nel loro ordine, eventi come `VoceEvento` e azioni come `Azione`; vuota, invita ad aggiungere.
   */
  const sezione = (f: FasciaGioco) => {
    const voci = g.azioni.filter((a) => a.fascia === f);
    const daFare = voci.filter((a) => a.genere === 'azione' && (a.fatta || !a.nonDovuta));
    const fatte = daFare.filter((a) => a.fatta).length;
    const tutteScelte = !!scelte && voci.length > 0 && voci.every((v) => scelte.has(v.uid));
    const vista = aperta(f);
    // fascia di arrivo vuota o chiusa: non ha righe su cui mostrare la linea, quindi è lei a evidenziarsi (in una chiusa la voce va in fondo)
    const bersagloVuoto = riordino.trascinato !== null && riordino.rilascio?.lista === f && (voci.length === 0 || !vista);
    const idCorpo = `${idGiorno}-${f}`;
    return (
      <section key={f} ref={riordino.lista(f)} className={`card flex flex-col gap-1 ${fasciaCorrente === f ? 'card--adesso' : ''} ${bersagloVuoto ? 'ring-2 ring-primary' : ''}`} aria-current={fasciaCorrente === f ? 'true' : undefined} aria-label={f === 'giorno' ? 'Di giorno' : 'Di sera'}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* C9: il nome della fascia apre e chiude le sue voci; il conto «fatte su tutte» e «Adesso» restano a vista anche a fascia chiusa */}
          <FasciaGiornata fascia={f} attiva={fasciaCorrente === f} dettaglio={partitaId && daFare.length > 0 ? `${fatte} su ${daFare.length}` : undefined}
            apertura={{ aperta: vista, controlla: idCorpo, onAlterna: () => {
              // chiudere una fascia aperta solo per una voce cercata la chiude davvero (la richiesta è servita)
              const store = useFasceDiarioStore.getState();
              for (const r of daMostrare) if (r.fascia === f) store.segnaMostrata(r.chiave);
              if (vista && chiuse[chiaveFascia(g.giorno, f)]) return;
              store.alterna(g.giorno, f);
            } }} />
          {scelte
            ? voci.length > 0 && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave={tutteScelte ? 'deseleziona' : 'seleziona'} dimensione={20} />} titolo={tutteScelte ? 'Nessuna' : 'Tutte'}
                aria-label={`${tutteScelte ? 'Togli dalla scelta' : 'Scegli'} tutte le voci ${nomeFascia(f)}`} onClick={() => scegli(voci.map((v) => v.uid), !tutteScelte)} />
            // C9: aggiungendo in una fascia chiusa la fascia si riapre, così la voce nuova si vede al suo posto
            : !IN_RILASCIO && <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi" disabled={occupato} onClick={() => { useFasceDiarioStore.getState().apri(g.giorno, [f]); apri({ tipo: 'nuova', fascia: f }); }} aria-label={`Aggiungi ${nomeFascia(f)}`} />}
        </div>
        {/* le voci restano montate anche a fascia chiusa (`hidden`): spunte in corso, finestre aperte dalla riga, selezione e incolla non si perdono */}
        <div id={idCorpo} hidden={!vista} className="flex flex-col gap-1">
        {/* nella scelta le voci sono righe da spuntare per copiarle o spostarle: niente spunta di partita né gesti, per non confonderle */}
        {scelte && voci.length > 0 && (
          <ul className="m-0 p-0 list-none divide-y divide-border-light" aria-label={`Voci ${nomeFascia(f)} da scegliere`}>
            {voci.map((v) => (
              <li key={v.uid}>
                <label className="touch flex cursor-pointer items-start gap-2.5 py-1.5 testo-13">
                  <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={scelte.has(v.uid)} onChange={(e) => scegli([v.uid], e.target.checked)} />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="line-clamp-2">{v.azione}</span>
                    {(v.genere !== 'azione' || v.riferimentoTesto) && <span className="testo-12 text-text-muted">{[v.genere !== 'azione' ? { evento: 'Evento', scadenza: 'Scadenza', promemoria: 'Promemoria' }[v.genere] : null, v.riferimentoTesto].filter(Boolean).join(' · ')}</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {scelte ? (voci.length === 0 && <p className="m-0 testo-13 text-text-muted py-1">Niente {nomeFascia(f)} da scegliere.</p>) : voci.length === 0
          ? <p className="m-0 testo-13 text-text-muted py-1">Niente {nomeFascia(f)} per questo giorno{IN_RILASCIO ? '.' : ': con «Aggiungi» metti una cosa da fare o un evento.'}</p>
          : (
            <ul className="m-0 p-0 list-none divide-y divide-border-light" aria-label={f === 'giorno' ? 'Azioni di giorno' : 'Azioni di sera'}>
              {voci.map((v, i) => eEvento(v)
                ? <VoceEvento key={v.uid} e={v} gesti={IN_RILASCIO ? undefined : gesti(v, i, voci.length)} occupato={bloccata} {...menuDi(v.uid)} {...(IN_RILASCIO ? {} : rigaRiordino(f, voci, v))}
                    selezione={selezioneDi(v.uid)} />
                : <Azione key={`${partitaId}:${v.uid}`} a={v} partitaId={partitaId} onCambiata={onAggiorna} onSullaMappa={onSullaMappa} evidenziata={azioneEvidenziata === v.uid}
                    gesti={IN_RILASCIO ? undefined : gesti(v, i, voci.length)} bloccata={bloccata} {...menuDi(v.uid)} {...(IN_RILASCIO ? {} : rigaRiordino(f, voci, v))}
                    selezione={selezioneDi(v.uid)}
                    daCompletare={IN_RILASCIO || !proposte.perVoce.get(v.uid)?.length ? undefined : { n: proposte.perVoce.get(v.uid)!.length, onApri: () => { setMenu(null); setProposteDi(v.uid); } }} />)}
            </ul>
          )}
        </div>
      </section>
    );
  };

  return (
    <div ref={radice} className="flex flex-col gap-3 rounded-lg outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
      <section className={`card flex flex-col gap-1 testo-13 ${compatto ? 'py-3' : ''}`}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="m-0 flex items-center gap-3 flex-wrap"><DataP5 data={g.giorno} giornoSettimana={g.giornoSettimana} evidenzia={g.dataCorrente === g.giorno} /></h2>
          <span className="chip">{g.fase}</span>
          {g.meteo && <MeteoIcona meteo={g.meteo} dimensione={26} conTesto />}
          {/* le allerte meteo del gioco del giorno, come tag (2026-10-12) */}
          <TagAllerte allerte={g.allerte} modifica={!IN_RILASCIO && onAllerteModificate ? { data: g.giorno, onSalvato: () => void onAllerteModificate() } : undefined} />
          {partitaId && (consigliate > 0 || bloccate > 0) && (
            <span className="testo-12 text-text-muted">{consigliate > 0 ? `${consigliate} consigliate` : ''}{consigliate > 0 && bloccate > 0 ? ' · ' : ''}{bloccate > 0 ? `${bloccate} bloccate` : ''}</span>
          )}
        </div>
        {g.trama ? <p className="m-0">{g.trama}</p> : <p className="m-0 text-text-muted">Nessun evento di trama annotato.</p>}
        {g.vincoli.length > 0 && <p className="m-0 text-text-secondary"><strong className="text-text">Vincoli:</strong> {g.vincoli.join(' · ')}</p>}
        {g.avvisi.length > 0 && <ul className="m-0 pl-4 text-primary-testo">{g.avvisi.map((v) => <li key={v}>{v}</li>)}</ul>}
        {!g.coperto && <p className="m-0 text-text-muted">Giorno non coperto dalle fonti: nessuna azione consigliata.</p>}
        {g.fonte && <a href={g.fonte} target="_blank" rel="noreferrer" className="credito touch inline-flex items-center self-start">fonte</a>}
      </section>
      {/* copiare o spostare voci in un altro giorno (2026-10-12): la scelta a caselle, per chi non usa il mouse; con voci già selezionate
          (clic, Ctrl+clic, Maiusc+clic, «Seleziona») la barra in fondo ha già i comandi */}
      {!IN_RILASCIO && !caselle && selezionateAVista === 0 && g.azioni.length > 0 && (
        <PulsanteVisivo tono="fantasma" compatto className="self-end" icona={<IconaAzione chiave="copia" dimensione={20} />} titolo="Copia o sposta voci"
          aria-label="Scegli voci da copiare o spostare in un altro giorno" disabled={bloccata} onClick={() => { setMenu(null); setCaselleDi(g.giorno); }} />
      )}
      {sezione('giorno')}
      {sezione('sera')}
      {/* la barra delle voci selezionate: in fondo, ferma sopra la barra di navigazione mentre si scorre (non sposta le righe in cima) */}
      {(caselle || selezionateAVista > 0) && (
        <BarraSelezioneVoci quante={sel.uid.length} caselle={caselle} occupato={bloccata} scorreDentro={scorreDentro}
          onCopia={() => appunti.copia(sel.uid)} onTaglia={() => appunti.taglia(sel.uid)} onFisso={() => appunti.salvaFisso(sel.uid)} onAltroGiorno={() => { setMenu(null); setTrasferimento('copia'); }}
          onFine={() => { setCaselleDi(null); sel.svuota(); }} />
      )}
      {/* il conteggio per il lettore di schermo, in una regione sempre presente */}
      {!IN_RILASCIO && <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{selezionateAVista === 0 ? '' : selezionateAVista === 1 ? '1 voce selezionata' : `${selezionateAVista} voci selezionate`}</p>}
      {trasferimento && sel.uid.length > 0 && (
        <TrasferisciVoci modo={trasferimento} voci={g.azioni.filter((v) => sel.insieme.has(v.uid))} giorno={g.giorno} partitaId={partitaId}
          onChiudi={() => setTrasferimento(null)} onFatto={async () => { setCaselleDi(null); sel.svuota(); await aggiornata(); }} onRicarica={aggiornata}
          fuoco={(attendi) => fuocoNelGiorno(sel.uid[0] ?? null, attendi)} />
      )}
      {appunti.inAttesa && <FinestraIncolla piano={appunti.inAttesa.piano} occupato={appunti.occupato} onConferma={appunti.conferma} onChiudi={appunti.chiudiAttesa} />}
      {appunti.manuale && <FinestraIncollaManuale onIncolla={(c) => appunti.incollaContenuto(c, appunti.manuale?.dopoUid ?? null)} onChiudi={appunti.chiudiManuale} />}
      {partitaId && totali.tutte > 0 && <p className="m-0 testo-12 text-text-muted">{totali.fatte} azioni fatte su {totali.tutte}.</p>}
      {soggetto && <ModuloVoceGiornata soggetto={soggetto} giorno={g.giorno} voci={g.azioni} partitaId={partitaId} onChiudi={() => setSoggetto(null)} onSalvato={aggiornata} />}
      {!IN_RILASCIO && proposteDi && (() => {
        const v = g.azioni.find((x) => x.uid === proposteDi);
        if (!v) return null;
        return (
          <FinestraProposteVoce testo={v.azione} giorno={g.giorno} proposte={proposte.perVoce.get(v.uid) ?? []} partitaId={partitaId} onChiudi={() => setProposteDi(null)}
            onModifica={(p) => { setProposteDi(null); apri({ tipo: 'voce', voce: v, proposta: p }); }}
            onDecisa={async () => { await aggiornata(); }} />
        );
      })()}
      {conferma && (
        <Modal aperta titolo={conferma.titolo} onChiudi={() => setConferma(null)} azioni={(
          <div className="flex flex-wrap justify-end gap-1.5 w-full">
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" disabled={occupato} onClick={() => setConferma(null)} />
            {conferma.scelte.map((s) => (
              <PulsanteVisivo key={s.titolo} tono={s.tono} compatto icona={<IconaAzione chiave={s.icona} dimensione={20} />} titolo={s.titolo} disabled={occupato}
                onClick={() => { const c = s; setConferma(null); void esegui(c.esegui, c.ok); }} />
            ))}
          </div>
        )}>
          <p className="m-0 testo-14">{conferma.testo}</p>
        </Modal>
      )}
    </div>
  );
}
