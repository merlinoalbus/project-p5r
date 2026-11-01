// ============================================================
// AzioneGiornata — una riga d'azione della giornata (`GiornoGuida`): spunta per partita con le sue scelte (note, esiti, consumazioni e
// pesca, relazione romantica), immagine, testo, cartellini, stato, effetti registrati e gesti della voce
// ============================================================
//
// La giornata (le due fasce, i gesti sulle voci, la selezione, gli appunti) sta in `GiornoGuida`; qui ciò che succede dentro una voce
// quando la si spunta o la si toglie. Una riga si rimonta quando cambia ciò che la spunta legge (`Azione`, chiave di contesto): le scelte a
// metà (note, esiti, acquisti) non sopravvivono a una voce cambiata altrove.
// ============================================================

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { getConfidentiPartita, getVocePercorso, impostaAzionePercorso } from '../../services/api';
import { giocaLaSceltaRomantica } from '../../../shared/puntiConfidenti';
import { fraseRelazione } from '../../../shared/descriviEffettiSpunta';
import { notifica } from '../../stores/notificationStore';
import { avvisoSpunta, descriviEffetti } from '../../utils/percorso';
import { dotiDaSegnareDaEffetti, testoDotiDaSegnare } from '../../utils/dotiDaSegnare';
import type { AzionePercorsoDto } from '../../types';
import { SegnoStato } from '../shared/SegnoStato';
import { TestoNote } from '../shared/TestoNote';
import { useSuggerimentiStore } from '../../stores/suggerimentiStore';
import { ComandiVoce, TestoSelezioneRiga, type GestoVoce, type SelezioneRiga } from './MenuVoce';
import { classeSelezioneRiga } from '../../utils/selezioneRiga';
import { CartelliniAzione, ImmagineAzione, SceltaNote } from './PartiAzione';
import { DaRivedereVoce, InfiltrazioniVoce } from './InfiltrazioniVoce';
import { RisposteVoce } from './RisposteVoce';
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

/** Una riga d'azione della giornata (della guida o aggiunta): spunta, immagine dell'entità, testo, tipo, collegamento, stato, note, gesti. */
export function Azione(props: PropsAzione) {
  const { a, partitaId } = props;
  const contesto = JSON.stringify([partitaId, a.uid, a.fatta, a.giorno, a.fascia, a.genere, a.azione, a.tipo, a.riferimento, a.rangoAtteso, a.effettiVoce?.revisione]);
  return <AzioneNelContesto key={contesto} {...props} />;
}
function AzioneNelContesto({ a, partitaId, onCambiata, onSullaMappa, evidenziata, gesti, menuAperto = false, onMenu, bloccata, maniglia, rifRiga, classeRiga, daCompletare, selezione }: PropsAzione) {
  const [occupato, setOccupato] = useState(false);
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
    // 2026-10-30: la visita ai Memento non chiede più quali Dedali hai aperto: le aperture si calcolano dai Palazzi conclusi (migrazione 305)
    // L13: l'esito ottenuto (o «senza punti») si sceglie prima di salvare: una scelta non fatta non lascia la spunta (decisione A1)
    if (fatta && !a.fatta && a.scelteEsito?.length && esiti === undefined) {
      setChiediNote(false); setChiediEsiti({ noteRisposta, senzaPunti, relazioneRomantica }); return;
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
      if (!pronte?.complete) { setChiediAcquisti({ noteRisposta, senzaPunti, esiti, relazioneRomantica }); return; }
      const r = richiesteOsservazioni(pronte);
      return cambia(true, noteRisposta, senzaPunti, r.acquisti, r.pesche, esiti, r.osservate, true, relazioneRomantica);
    }
    setChiediNote(false);
    scrittura.current = true;
    setOccupato(true);
    try {
      const relazione = fatta ? relazioneRomantica : undefined;
      const agg = acquisti || pesche ? await eseguiSpuntaAcquistiConRegistro(partitaId, a.uid, { fatta: true, ...(noteRisposta ? { noteRisposta } : {}), ...(acquisti?.length ? { acquisti } : {}), ...(pesche?.length ? { pesche } : {}), ...(esiti?.length ? { scelteEsito: esiti } : {}), ...(relazione !== undefined ? { relazioneRomantica: relazione } : {}) }, { etichetta: `Spunta Diario: ${a.azione}`, voceUid: a.uid }) : await impostaAzionePercorso(partitaId, a.uid, fatta, noteRisposta, undefined, undefined, esiti, relazione);
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
        {/* D15: voce fatta = spunta rossa a sinistra e testo barrato in grigio (il segno fuori dal testo barrato: l'icona non si taglia) */}
        <span><SegnoStato stato={a.fatta ? 'fatto' : null} dimensione={14} className="mr-1.5 align-text-bottom" /><span className={a.fatta ? 'stato-fatto' : ''}>{a.azione}<TestoSelezioneRiga s={selezione} />{a.daRivedere && <>{' '}<DaRivedereVoce a={a} partitaId={partitaId} onCambiata={onCambiata} /></>}</span></span>
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
        {pendente && <p role="status" className="m-0 text-warning">Un’operazione su questa voce non è stata confermata: completala dall’elenco «Operazioni da completare» sopra le voci, poi potrai spuntare la voce.</p>}
        {/* BON-01: i punti della voce che aspettano una decisione, con «Applica» sulla voce (nessun pannello a parte) */}
        {/* L1-08: la giornata sta in Oggi o nel Diario, che mostrano già le operazioni da completare della partita: non si ripetono qui */}
        {partitaId !== null && !!a.daApplicare && <DaApplicare partitaId={partitaId} voceUid={a.uid} gestiNellaColonna onCambiato={async () => { onCambiata(await getVocePercorso(a.uid, partitaId)); }} />}
        {/* la frase con i nomi la scrive il server (`produceTesto`, nell'ordine degli effetti): una sola scrittura per ogni vista (R12-01/1).
            Da fare, Aojiru, pesca e Fortuna stanno già in «Il gioco dà» (`RiepilogoEffettiVoce`, nei cartellini): qui restano a voce fatta */}
        {a.fatta && a.effettiVoce?.effetti.map((e, i) => (e.effetto.tipo === 'acquisto' || e.effetto.tipo === 'pesca' || e.effetto.tipo === 'fortuna') && a.produceTesto[i] ? <span key={e.uid}><TestoNote testo={a.produceTesto[i]} /></span> : null)}
        {chiediAcquisti && partitaId !== null && <PreparaAcquistiVoce key={`${partitaId}:${a.uid}:${a.effettiVoce?.revisione}`} a={a} partitaId={partitaId} onRileggi={onCambiata} onChiudi={() => setChiediAcquisti(null)} onModifica={gesti?.find((g) => g.chiave === 'modifica')?.onClick} onConferma={(richieste, pesche, osservate) => cambia(true, chiediAcquisti.noteRisposta, chiediAcquisti.senzaPunti, richieste, pesche, chiediAcquisti.esiti, osservate, false, chiediAcquisti.relazioneRomantica)} />}
        {/* (revisione) lo strumento da scegliere si sceglie nell'editor della voce: la scelta offre di aprirlo (il gesto «Modifica», se la riga lo ha) */}
        {chiediEsiti && a.scelteEsito && <SceltaEsitiVoce scelte={a.scelteEsito} occupato={occupato} onModifica={gesti?.find((g) => g.chiave === 'modifica')?.onClick} onConferma={(s) => void cambia(true, chiediEsiti.noteRisposta, chiediEsiti.senzaPunti, undefined, undefined, s, [], false, chiediEsiti.relazioneRomantica)} onAnnulla={() => setChiediEsiti(null)} />}
        {/* la scelta delle note parte dall'evento che si gioca davvero: il prossimo della partita, se diverso dal rango atteso della voce */}
        {chiediNote && <SceltaNote occupato={occupato} relazione={relazioneDaChiedere}
          onScegli={(n, relazione) => void cambia(true, n ?? undefined, n === null, undefined, undefined, undefined, [], false, relazione)} onAnnulla={() => setChiediNote(false)} />}
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
