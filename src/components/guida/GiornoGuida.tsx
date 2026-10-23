// ============================================================
// GiornoGuida — la guida di un giorno: scheda del giorno (data, fase, meteo, trama, vincoli, avvisi) e voci di giorno e di sera
// con spunta per partita, stato «consigliata» (oro) / «bloccata» (grigio, con motivo) e collegamenti al punto esatto (Fase 7.5b, 12.4/13.5)
// ============================================================
//
// Usato dalla pagina «Guida giorno per giorno» e dalla scheda «Oggi» della Partita (dove un'azione con un luogo collegato centra la mappa).
//
// La giornata è canone (richieste dell'utente, 2026-09-30): le voci — azioni della guida, cose da fare ed eventi aggiunti — sono
// una lista sola per fascia, nel loro ordine esatto, e ogni modifica cambia la guida per tutte le partite (e il pacchetto che si
// esporta). Ogni voce ha i suoi gesti: Modifica, Sposta su, Sposta giù, Sposta di giorno/di sera, Elimina. Le due sezioni ci sono
// sempre, anche vuote, perché è lì che si aggiunge; il posto esatto della voce nuova si sceglie nella finestra.
// Dal 2026-10-12 («copiare elementi del diario... e poterli inserire in un altro giorno o nella parte giorno o nella parte notte
// a scelta»; scelte «Una o più insieme» e «Sì, anche spostare») «Copia o sposta voci» apre la scelta: le voci di giorno e di sera
// diventano righe da spuntare, e «Copia in…» / «Sposta in…» le mandano in un altro giorno e fascia (`TrasferisciVoci`).
// ============================================================

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { aggiornaVoceGiornata, eliminaVoceGiornata, getVocePercorso, impostaAzionePercorso, spostaVoceGiornata } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { avvisoSpunta } from '../../utils/percorso';
import { dotiDaSegnareDaEffetti } from '../../utils/dotiDaSegnare';
import type { AzionePercorsoDto, FasciaGioco, GenereVoce, PercorsoGiornoDto } from '../../types';
import { DataP5 } from '../shared/DataP5';
import { MeteoIcona } from './MeteoIcona';
import { TagAllerte } from '../shared/TagAllerta';
import { FasciaGiornata, IconaFascia } from './FasciaGiornata';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { Modal } from '../shared/Modal';
import { useSuggerimentiStore } from '../../stores/suggerimentiStore';
import { GestiVoce, PulsanteMenuVoce, type GestoVoce } from './MenuVoce';
import { ModuloVoceGiornata, type SoggettoVoce } from './ModuloVoceGiornata';
import { VoceEvento } from './VociAgenda';
import { CartelliniAzione, ImmagineAzione, SceltaNote } from './PartiAzione';
import { DaRivedereVoce, InfiltrazioniVoce } from './InfiltrazioniVoce';
import { chiedeNote } from '../../utils/azioneStrutturata';
import { seGiornoAvanzato } from '../../utils/giornoAvanzato';
import { TrasferisciVoci } from './TrasferisciVoci';
import { ApertureVisitaRegistrata, SceltaApertureVisita } from './ApertureVisita';
import { PreparaAcquistiVoce } from './PreparaAcquistiVoce';
import { DaApplicare } from '../partita/DaApplicare';
import type { RichiestaRegistraAcquisto } from '../../../shared/acquisti';
import type { RichiestaRegistraSessionePesca } from '../../../shared/pesca';
import { descriviEffettoVoce } from '../../../shared/effettiVoce';
import { eseguiSpuntaAcquistiConRegistro, gestoPendenteNelloScope, segnalaMutazioneEffetti, useGestiPartita } from '../../services/gestiPartita';

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
}

/** Una riga d'azione della giornata (della guida o aggiunta): spunta, immagine dell'entità, testo, tipo, collegamento, stato, note, gesti. */
export function Azione(props: PropsAzione) {
  const { a, partitaId } = props;
  const contesto = JSON.stringify([partitaId, a.uid, a.fatta, a.giorno, a.fascia, a.genere, a.azione, a.tipo, a.riferimento, a.rangoAtteso, a.effettiVoce?.revisione]);
  return <AzioneNelContesto key={contesto} {...props} />;
}
function AzioneNelContesto({ a, partitaId, onCambiata, onSullaMappa, evidenziata, gesti, menuAperto = false, onMenu, bloccata }: PropsAzione) {
  const [occupato, setOccupato] = useState(false);
  const [chiediAcquisti, setChiediAcquisti] = useState<{ noteRisposta?: 1 | 2 | 3; senzaPunti: boolean; aperture?: string[] } | null>(null);
  const vivo = useRef(true);
  const scrittura = useRef(false);
  useLayoutEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);
  useGestiPartita();
  const pendente = partitaId !== null ? gestoPendenteNelloScope(partitaId, { voceUid: a.uid, ...(a.effettiVoce?.effetti.some(e => e.effetto.tipo === 'pesca') ? { pesca: true } : {}) }) : null;
  // Azione «tempo con un Confidente»: alla spunta l'app chiede quante note (1–3) si sono ottenute (scelta A, 2 preselezionato).
  const [chiediNote, setChiediNote] = useState(false);
  const [chiediAperture, setChiediAperture] = useState(false);
  const [noteVisita, setNoteVisita] = useState<{ note?: 1 | 2 | 3; senzaPunti: boolean }>({ senzaPunti: false });
  /**
   * Spunta o toglie l'azione nella partita. Se spuntandola servono le note e non sono ancora arrivate (né si è scelto
   * di non dare punti), apre prima la scelta delle note e si ferma. Altrimenti salva, passa al genitore l'azione
   * aggiornata, invalida i suggerimenti, notifica gli effetti della spunta e controlla se il giorno è avanzato.
   */
  const cambia = async (fatta: boolean, noteRisposta?: 1 | 2 | 3, senzaPunti = false, aperture?: string[], acquisti?: RichiestaRegistraAcquisto[], pesche?: RichiestaRegistraSessionePesca[]) => {
    if (!partitaId || scrittura.current) return;
    if (pendente) { if (acquisti || pesche) throw new Error('Questa voce ha già un’operazione da verificare nel registro.'); return; }
    if (fatta && chiedeNote(a) && noteRisposta === undefined && !senzaPunti) { setChiediNote(true); return; }
    if (fatta && !a.fatta && a.apertureDedali?.length && aperture === undefined) {
      setNoteVisita({ note: noteRisposta, senzaPunti });
      setChiediNote(false);
      setChiediAperture(true);
      return;
    }
    if (fatta && !a.fatta && a.effettiVoce?.effetti.some((e) => e.effetto.tipo === 'acquisto' || e.effetto.tipo === 'pesca') && acquisti === undefined && pesche === undefined) {
      setChiediNote(false); setChiediAperture(false); setChiediAcquisti({ noteRisposta, senzaPunti, aperture }); return;
    }
    setChiediNote(false);
    scrittura.current = true;
    setOccupato(true);
    try {
      const agg = acquisti || pesche ? await eseguiSpuntaAcquistiConRegistro(partitaId, a.uid, { fatta: true, ...(noteRisposta ? { noteRisposta } : {}), ...(aperture ? { apertureDedali: aperture } : {}), ...(acquisti?.length ? { acquisti } : {}), ...(pesche?.length ? { pesche } : {}) }, { etichetta: `Spunta Diario: ${a.azione}`, voceUid: a.uid }) : await impostaAzionePercorso(partitaId, a.uid, fatta, noteRisposta, aperture);
      segnalaMutazioneEffetti(partitaId);
      if (!vivo.current) return;
      setChiediAperture(false);
      setChiediAcquisti(null);
      onCambiata(agg);
      // spuntando (o riaprendo) un'azione cambia cosa il giorno suggerisce: l'alone dorato si aggiorna da solo
      useSuggerimentiStore.getState().invalida();
      // che cosa è successo e, a parte, le Doti da segnare a mano (la spunta non le tocca)
      if (agg.ricevuteEffetti?.length) notifica('success', fatta ? 'Spunta ed effetti registrati. Le variazioni Doti e yen sono in «Da applicare».' : 'Spunta rimossa usando le sue ricevute. Le correzioni ai saldi sono in «Da applicare».');
      else if (fatta && agg.effetti) notifica('success', avvisoSpunta(agg.effetti), dotiDaSegnareDaEffetti(agg.effetti).length ? 7000 : undefined);
      // era l'ultima attività del giorno: la partita è passata al giorno dopo
      seGiornoAvanzato(agg);
    } catch (err) {
      if (vivo.current) notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
      if (acquisti || pesche) throw err;
    } finally { scrittura.current = false; if (vivo.current) setOccupato(false); }
  };
  const stato = a.fatta ? null : a.stato;
  const classeStato = stato?.tipo === 'consigliata' ? 'azione--consigliata' : stato?.tipo === 'bloccata' ? 'azione--bloccata' : '';
  return (
    <li id={`voce-${a.uid}`} className={`azione flex flex-wrap items-start gap-2 py-1.5 ${classeStato} ${evidenziata ? 'azione--evidenziata' : ''}`} aria-current={evidenziata ? 'true' : undefined}>
      {/* il bersaglio è l'etichetta, non il quadratino: 44 px senza cambiarne l'aspetto */}
      {partitaId && <label className="touch flex items-start justify-center shrink-0 -my-1 pr-1 cursor-pointer"><input type="checkbox" className="w-5 h-5 mt-2 shrink-0" checked={a.fatta} disabled={occupato || bloccata || !!pendente || (!a.fatta && a.effettiVoce?.stato === 'legacy-da-correggere')} onChange={(e) => void cambia(e.target.checked)} aria-label={`Fatto: ${a.azione.slice(0, 60)}`} /></label>}
      <ImmagineAzione a={a} />
      <div className="flex flex-col gap-0.5 text-[13px] min-w-0 flex-1">
        <span className={a.fatta ? 'line-through' : ''}>{a.azione}{a.daRivedere && <>{' '}<DaRivedereVoce a={a} partitaId={partitaId} onCambiata={onCambiata} /></>}</span>
        <CartelliniAzione a={a} onSullaMappa={onSullaMappa && a.mappa ? () => onSullaMappa(a.mappa!, a.uid) : undefined}
          onApriMappa={onSullaMappa ? (m) => onSullaMappa(m, a.uid) : undefined} />
        {/* L3 (§4.4): il campo «Infiltrazioni» delle voci di Palazzo, accanto al cartellino del Palazzo */}
        <InfiltrazioniVoce a={a} partitaId={partitaId} onCambiata={onCambiata} />
        {a.effettiVoce?.stato === 'legacy-da-correggere' && <p role="alert" className="m-0 text-warning">Effetti da correggere: {a.effettiVoce.motivo}. Il dato originario resta visibile nell’editor.</p>}
        {pendente && <p role="status" className="m-0 text-warning">Operazione da verificare nel registro dei gesti: questa voce non viene rispuntata.</p>}
        {/* BON-01: i punti della voce che aspettano una decisione, con «Applica» sulla voce (niente pannello «Da applicare») */}
        {partitaId !== null && !!a.daApplicare && <DaApplicare partitaId={partitaId} voceUid={a.uid} onCambiato={async () => { onCambiata(await getVocePercorso(a.uid, partitaId)); }} />}
        {a.effettiVoce?.effetti.filter((e) => e.effetto.tipo === 'acquisto' || e.effetto.tipo === 'pesca').map((e) => <span key={e.uid}>{descriviEffettoVoce(e.effetto)}</span>)}
        {!!a.ricevuteEffetti?.length && <details><summary className="touch">Ricevute degli effetti della spunta</summary><ul className="m-0 pl-4">{a.ricevuteEffetti.map((r) => <li key={r.id}>{r.tipo === 'acquisto' ? 'Consumazione' : r.tipo === 'pesca' ? 'Sessione di pesca' : r.tipo === 'contesto' ? 'Incontro e contesto della spunta' : r.tipo === 'dote' ? 'Dote' : r.tipo === 'lettura' ? 'Lettura o gioco' : 'Turno'} · {new Date(r.applicatoIl).toLocaleString('it-IT')} · {r.annullatoIl ? 'annullata' : 'attiva'}</li>)}</ul></details>}
        {chiediAcquisti && partitaId !== null && <PreparaAcquistiVoce key={`${partitaId}:${a.uid}:${a.effettiVoce?.revisione}`} a={a} partitaId={partitaId} onRileggi={onCambiata} onChiudi={() => setChiediAcquisti(null)} onConferma={(richieste, pesche) => cambia(true, chiediAcquisti.noteRisposta, chiediAcquisti.senzaPunti, chiediAcquisti.aperture, richieste, pesche)} />}
        {chiediNote && <SceltaNote occupato={occupato} onScegli={(n) => void cambia(true, n ?? undefined, n === null)} onAnnulla={() => setChiediNote(false)} />}
        {chiediAperture && <SceltaApertureVisita a={a} occupato={occupato} onConferma={(c) => void cambia(true, noteVisita.note, noteVisita.senzaPunti, c)} onAnnulla={() => setChiediAperture(false)} />}
        {a.fatta && a.apertureDedali?.length && partitaId ? <ApertureVisitaRegistrata a={a} partitaId={partitaId} onCambiata={onCambiata} bloccata={bloccata || occupato} /> : null}
      </div>
      {gesti && onMenu && <PulsanteMenuVoce voce={a.azione} aperto={menuAperto} onCambia={onMenu} disabled={occupato || bloccata} />}
      {gesti && menuAperto && <GestiVoce gesti={gesti} disabled={occupato || bloccata} etichetta={`Gesti per: ${a.azione.slice(0, 60)}`} voce={a.uid} />}
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
  /** Nella scheda «Oggi»: intestazione più compatta. */
  compatto?: boolean;
  /** Momento della giornata della partita per QUESTO giorno (solo se è il giorno corrente): la sezione «Di giorno» o «Di sera» viene evidenziata con «Adesso» (15.27). */
  fasciaCorrente?: 'giorno' | 'sera' | null;
}

/** Richiesta di conferma prima di un gesto che non si disfa (eliminare una voce). */
interface Conferma { titolo: string; testo: ReactNode; scelte: Array<{ titolo: string; tono: 'primario' | 'pericolo'; icona: 'elimina' | 'annulla-ultimo'; esegui: () => Promise<unknown>; ok: string }> }

/** Scheda del giorno e voci di giorno e di sera, nel loro ordine, modificabili. */
export function GiornoGuida({ g, partitaId, onAggiorna, onGiornataModificata, onSullaMappa, azioneEvidenziata, compatto, fasciaCorrente }: Props) {
  // R10-27: tornando da una scheda (indietro, o «Esci» del Palazzo) l'indirizzo porta `#voce-<uid>`: la voce si porta in vista una volta
  // per giorno mostrato. Qui e non nella riga, che si rimonta a ogni spunta e riprenderebbe a scorrere.
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash.startsWith('#voce-')) return;
    const el = document.getElementById(hash.slice(1));
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'center' });
  }, [g.giorno, hash]);
  const [occupato, setOccupato] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [soggetto, setSoggetto] = useState<SoggettoVoce | null>(null);
  const [conferma, setConferma] = useState<Conferma | null>(null);
  // Copiare o spostare voci in un altro giorno (2026-10-12, «Una o più insieme»): le voci scelte, legate al giorno (cambiando
  // giorno la scelta non vale più), e la finestra aperta («copia» o «sposta»)
  const [scelta, setScelta] = useState<{ giorno: string; uid: ReadonlySet<string> } | null>(null);
  const [trasferimento, setTrasferimento] = useState<'copia' | 'sposta' | null>(null);
  const scelte = scelta?.giorno === g.giorno ? scelta.uid : null;
  /** Mette o toglie voci dalla scelta. */
  const scegli = (uid: string[], dentro: boolean) => setScelta((s) => {
    const n = new Set(s?.giorno === g.giorno ? s.uid : []);
    for (const u of uid) { if (dentro) n.add(u); else n.delete(u); }
    return { giorno: g.giorno, uid: n };
  });
  const partita = partitaId ?? undefined;
  // la chiave del menu porta il giorno: cambiando giorno nessun menu resta aperto su una voce che non c'è più
  const chiaveMenu = (uid: string) => `${g.giorno}/${uid}`;
  /** Le props del menu di una voce: se è quello aperto e come aprirlo o chiuderlo (uno solo aperto alla volta). */
  const menuDi = (uid: string) => ({ menuAperto: menu === chiaveMenu(uid), onMenu: (aperto: boolean) => setMenu(aperto ? chiaveMenu(uid) : null) });

  // aprire la finestra o la conferma chiude il menu della voce: tornando alla lista la riga è di nuovo com'era
  const apri = (s: SoggettoVoce) => { setMenu(null); setSoggetto(s); };
  /** Apre la richiesta di conferma, chiudendo il menu della voce. */
  const chiedi = (c: Conferma) => { setMenu(null); setConferma(c); };

  /** Dopo una modifica della giornata: la fa ricaricare al genitore e invalida i suggerimenti del giorno. */
  const aggiornata = async () => {
    segnalaMutazioneEffetti(null);
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

  /** Una sola operazione server raccoglie voce, spunte, fonti e ricevute nel Cestino prima della rimozione. */
  const elimina = (v: AzionePercorsoDto) => {
    /** L'eliminazione vera e propria della voce dalla guida. */
    const via = () => eliminaVoceGiornata(v.uid);
    const che = { azione: ['la voce', 'Voce eliminata'], evento: ['l\'evento', 'Evento eliminato'], scadenza: ['la scadenza', 'Scadenza eliminata'], promemoria: ['il promemoria', 'Promemoria eliminato'] }[v.genere];
    chiedi({
      titolo: `Eliminare ${che[0]}?`,
      testo: <>«{v.azione}» esce dalla guida per tutte le partite e finisce nel Cestino, con spunte, fonti e collegamenti da ripristinare. Le spunte e le fonti d’acquisto della voce vengono rimosse nello stesso gesto, usando le proprie ricevute; le altre fonti della consumazione rimangono. Le eventuali correzioni ai saldi Doti e yen si rivedono in «Da applicare».</>,
      scelte: [{ titolo: 'Metti nel Cestino', tono: 'pericolo', icona: 'elimina', esegui: via, ok: `${che[1]} dalla guida e conservata nel Cestino.` }],
    });
  };

  /** Un passo su o giù dal menu: il menu resta sulla voce, e il fuoco sul gesto (o sull'opposto, se al bordo il gesto sparisce). */
  const sposta = (v: AzionePercorsoDto, verso: -1 | 1) => void esegui(() => spostaVoceGiornata(v.uid, verso, partita), null, true).then(() => setTimeout(() => {
    const fila = [...document.querySelectorAll<HTMLElement>('[role="group"][data-voce]')].find((el) => el.dataset.voce === v.uid);
    const pulsanti = [...(fila?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
    (pulsanti.find((b) => b.textContent?.trim() === (verso === -1 ? 'Sposta su' : 'Sposta giù')) ?? pulsanti.find((b) => b.textContent?.trim() === (verso === -1 ? 'Sposta giù' : 'Sposta su')))?.focus();
  }));

  /** I gesti di una voce, al suo posto `i` nella fascia di `n` voci. */
  const gesti = (v: AzionePercorsoDto, i: number, n: number): GestoVoce[] => [
    { chiave: 'modifica', titolo: 'Modifica', icona: <IconaAzione chiave="modifica" dimensione={20} />, onClick: () => apri({ tipo: 'voce', voce: v }) },
    ...(i > 0 ? [{ chiave: 'su', titolo: 'Sposta su', icona: <IconaAzione chiave="su" dimensione={20} />, onClick: () => sposta(v, -1) }] : []),
    ...(i < n - 1 ? [{ chiave: 'giu', titolo: 'Sposta giù', icona: <IconaAzione chiave="giu" dimensione={20} />, onClick: () => sposta(v, 1) }] : []),
    { chiave: 'fascia', titolo: `Sposta ${nomeFascia(altraFascia(v.fascia))}`, icona: <IconaFascia fascia={altraFascia(v.fascia)} />, onClick: () => void esegui(() => aggiornaVoceGiornata(v.uid, { fascia: altraFascia(v.fascia) }, partita), `Spostata ${nomeFascia(altraFascia(v.fascia))}, in fondo, per tutte le partite.`) },
    { chiave: 'elimina', titolo: 'Elimina', tono: 'pericolo', icona: <IconaAzione chiave="elimina" dimensione={20} />, onClick: () => elimina(v) },
  ];

  const azioni = g.azioni.filter((a) => a.genere === 'azione');
  const totali = { fatte: azioni.filter((a) => a.fatta).length, tutte: azioni.length };
  const consigliate = azioni.filter((a) => !a.fatta && a.stato?.tipo === 'consigliata').length;
  const bloccate = azioni.filter((a) => !a.fatta && a.stato?.tipo === 'bloccata').length;

  /**
   * La sezione di una fascia: intestazione (evidenziata se è il momento corrente, con fatte su totali in partita),
   * «Aggiungi» e le voci nel loro ordine, eventi come `VoceEvento` e azioni come `Azione`; vuota, invita ad aggiungere.
   */
  const sezione = (f: FasciaGioco) => {
    const voci = g.azioni.filter((a) => a.fascia === f);
    const daFare = voci.filter((a) => a.genere === 'azione');
    const fatte = daFare.filter((a) => a.fatta).length;
    const tutteScelte = !!scelte && voci.length > 0 && voci.every((v) => scelte.has(v.uid));
    return (
      <section key={f} className={`card flex flex-col gap-1 ${fasciaCorrente === f ? 'card--adesso' : ''}`} aria-current={fasciaCorrente === f ? 'true' : undefined} aria-label={f === 'giorno' ? 'Di giorno' : 'Di sera'}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <FasciaGiornata fascia={f} attiva={fasciaCorrente === f} dettaglio={partitaId && daFare.length > 0 ? `${fatte} su ${daFare.length}` : undefined} />
          {scelte
            ? voci.length > 0 && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave={tutteScelte ? 'deseleziona' : 'seleziona'} dimensione={20} />} titolo={tutteScelte ? 'Nessuna' : 'Tutte'}
                aria-label={`${tutteScelte ? 'Togli dalla scelta' : 'Scegli'} tutte le voci ${nomeFascia(f)}`} onClick={() => scegli(voci.map((v) => v.uid), !tutteScelte)} />
            : <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi" disabled={occupato} onClick={() => apri({ tipo: 'nuova', fascia: f })} aria-label={`Aggiungi ${nomeFascia(f)}`} />}
        </div>
        {/* nella scelta le voci sono righe da spuntare per copiarle o spostarle: niente spunta di partita né gesti, per non confonderle */}
        {scelte && voci.length > 0 && (
          <ul className="m-0 p-0 list-none divide-y divide-border-light" aria-label={`Voci ${nomeFascia(f)} da scegliere`}>
            {voci.map((v) => (
              <li key={v.uid}>
                <label className="touch flex cursor-pointer items-start gap-2.5 py-1.5 text-[13px]">
                  <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={scelte.has(v.uid)} onChange={(e) => scegli([v.uid], e.target.checked)} />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="line-clamp-2">{v.azione}</span>
                    {(v.genere !== 'azione' || v.riferimentoTesto) && <span className="text-[11px] text-text-muted">{[v.genere !== 'azione' ? { evento: 'Evento', scadenza: 'Scadenza', promemoria: 'Promemoria' }[v.genere] : null, v.riferimentoTesto].filter(Boolean).join(' · ')}</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {scelte ? (voci.length === 0 && <p className="m-0 text-[13px] text-text-muted py-1">Niente {nomeFascia(f)} da scegliere.</p>) : voci.length === 0
          ? <p className="m-0 text-[13px] text-text-muted py-1">Niente {nomeFascia(f)} per questo giorno: con «Aggiungi» metti una cosa da fare o un evento.</p>
          : (
            <ul className="m-0 p-0 list-none divide-y divide-border-light" aria-label={f === 'giorno' ? 'Azioni di giorno' : 'Azioni di sera'}>
              {voci.map((v, i) => eEvento(v)
                ? <VoceEvento key={v.uid} e={v} gesti={gesti(v, i, voci.length)} occupato={occupato} {...menuDi(v.uid)}
                    dichiarazioni={partitaId && v.effetti?.apertureDedali?.length ? <ApertureVisitaRegistrata a={v} partitaId={partitaId} onCambiata={onAggiorna} bloccata={occupato} /> : undefined} />
                : <Azione key={`${partitaId}:${v.uid}`} a={v} partitaId={partitaId} onCambiata={onAggiorna} onSullaMappa={onSullaMappa} evidenziata={azioneEvidenziata === v.uid}
                    gesti={gesti(v, i, voci.length)} bloccata={occupato} {...menuDi(v.uid)} />)}
            </ul>
          )}
      </section>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <section className={`card flex flex-col gap-1 text-[13px] ${compatto ? 'py-3' : ''}`}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="m-0 flex items-center gap-3 flex-wrap"><DataP5 data={g.giorno} giornoSettimana={g.giornoSettimana} evidenzia={g.dataCorrente === g.giorno} /></h2>
          <span className="chip">{g.fase}</span>
          {g.meteo && <MeteoIcona meteo={g.meteo} dimensione={26} conTesto />}
          {/* le allerte meteo del gioco del giorno, come tag (2026-10-12) */}
          <TagAllerte allerte={g.allerte} />
          {partitaId && (consigliate > 0 || bloccate > 0) && (
            <span className="text-[12px] text-text-muted">{consigliate > 0 ? `${consigliate} consigliate` : ''}{consigliate > 0 && bloccate > 0 ? ' · ' : ''}{bloccate > 0 ? `${bloccate} bloccate` : ''}</span>
          )}
        </div>
        {g.trama ? <p className="m-0">{g.trama}</p> : <p className="m-0 text-text-muted">Nessun evento di trama annotato.</p>}
        {g.vincoli.length > 0 && <p className="m-0 text-text-secondary"><strong className="text-text">Vincoli:</strong> {g.vincoli.join(' · ')}</p>}
        {g.avvisi.length > 0 && <ul className="m-0 pl-4 text-primary">{g.avvisi.map((v) => <li key={v}>{v}</li>)}</ul>}
        {!g.coperto && <p className="m-0 text-text-muted">Giorno non coperto dalle fonti: nessuna azione consigliata.</p>}
        {g.fonte && <a href={g.fonte} target="_blank" rel="noreferrer" className="credito touch inline-flex items-center self-start">fonte</a>}
      </section>
      {/* copiare o spostare voci in un altro giorno (2026-10-12): fuori dalla scelta un comando solo; nella scelta la barra, che resta
          in vista scorrendo, col conto e i comandi */}
      {!scelte && g.azioni.length > 0 && (
        <PulsanteVisivo tono="fantasma" compatto className="self-end" icona={<IconaAzione chiave="copia" dimensione={20} />} titolo="Copia o sposta voci"
          aria-label="Scegli voci da copiare o spostare in un altro giorno" disabled={occupato} onClick={() => { setMenu(null); setScelta({ giorno: g.giorno, uid: new Set() }); }} />
      )}
      {scelte && (
        <section className="card sticky top-0 z-10 flex flex-wrap items-center gap-2 py-2" aria-label="Copia o sposta voci">
          {/* i comandi non si restringono mai (testo troncato); sul telefono «Fine» sta accanto al conto e «Copia in…» / «Sposta in…»
              prendono la riga sotto, così la barra fissa resta di due righe */}
          <span className="min-w-0 flex-1 text-[13px]"><strong>{scelte.size === 0 ? 'Scegli le voci' : scelte.size === 1 ? '1 voce scelta' : `${scelte.size} voci scelte`}</strong>
            <span className="text-text-muted"> · da copiare o spostare in un altro giorno</span></span>
          <div className="order-last flex basis-full gap-2 sm:order-none sm:basis-auto">
            <PulsanteVisivo tono="primario" compatto className="shrink-0" icona={<IconaAzione chiave="copia" dimensione={20} />} titolo="Copia in…" disabled={scelte.size === 0} onClick={() => setTrasferimento('copia')} />
            <PulsanteVisivo tono="secondario" compatto className="shrink-0" icona={<IconaAzione chiave="incolla" dimensione={20} />} titolo="Sposta in…" disabled={scelte.size === 0} onClick={() => setTrasferimento('sposta')} />
          </div>
          <PulsanteVisivo tono="fantasma" compatto className="shrink-0" icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Fine" aria-label="Esci dalla scelta" onClick={() => setScelta(null)} />
        </section>
      )}
      {sezione('giorno')}
      {sezione('sera')}
      {scelte && trasferimento && (
        <TrasferisciVoci modo={trasferimento} voci={g.azioni.filter((v) => scelte.has(v.uid))} giorno={g.giorno} partitaId={partitaId}
          onChiudi={() => setTrasferimento(null)} onFatto={async () => { setScelta(null); await aggiornata(); }} />
      )}
      {partitaId && totali.tutte > 0 && <p className="m-0 text-[12px] text-text-muted">{totali.fatte} azioni fatte su {totali.tutte}.</p>}
      {soggetto && <ModuloVoceGiornata soggetto={soggetto} giorno={g.giorno} voci={g.azioni} partitaId={partitaId} onChiudi={() => setSoggetto(null)} onSalvato={aggiornata} />}
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
          <p className="m-0 text-[14px]">{conferma.testo}</p>
        </Modal>
      )}
    </div>
  );
}
