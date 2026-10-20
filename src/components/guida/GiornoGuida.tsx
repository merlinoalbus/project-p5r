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

import { useState, type ReactNode } from 'react';
import { aggiornaVoceGiornata, eliminaVoceGiornata, impostaAzionePercorso, spostaVoceGiornata } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { avvisoSpunta, descriviEffetti } from '../../utils/percorso';
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
export function Azione({ a, partitaId, onCambiata, onSullaMappa, evidenziata, gesti, menuAperto = false, onMenu, bloccata }: PropsAzione) {
  const [occupato, setOccupato] = useState(false);
  // Azione «tempo con un Confidente»: alla spunta l'app chiede quante note (1–3) si sono ottenute (scelta A, 2 preselezionato).
  const [chiediNote, setChiediNote] = useState(false);
  /**
   * Spunta o toglie l'azione nella partita. Se spuntandola servono le note e non sono ancora arrivate (né si è scelto
   * di non dare punti), apre prima la scelta delle note e si ferma. Altrimenti salva, passa al genitore l'azione
   * aggiornata, invalida i suggerimenti, notifica gli effetti della spunta e controlla se il giorno è avanzato.
   */
  const cambia = async (fatta: boolean, noteRisposta?: 1 | 2 | 3, senzaPunti = false) => {
    if (!partitaId) return;
    if (fatta && chiedeNote(a) && noteRisposta === undefined && !senzaPunti) { setChiediNote(true); return; }
    setChiediNote(false);
    setOccupato(true);
    try {
      const agg = await impostaAzionePercorso(partitaId, a.uid, fatta, noteRisposta);
      onCambiata(agg);
      // spuntando (o riaprendo) un'azione cambia cosa il giorno suggerisce: l'alone dorato si aggiorna da solo
      useSuggerimentiStore.getState().invalida();
      // che cosa è successo e, a parte, le Doti da segnare a mano (la spunta non le tocca)
      if (fatta && agg.effetti) notifica('success', avvisoSpunta(agg.effetti), dotiDaSegnareDaEffetti(agg.effetti).length ? 7000 : undefined);
      // era l'ultima attività del giorno: la partita è passata al giorno dopo
      seGiornoAvanzato(agg);
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.'); } finally { setOccupato(false); }
  };
  const stato = a.fatta ? null : a.stato;
  const classeStato = stato?.tipo === 'consigliata' ? 'azione--consigliata' : stato?.tipo === 'bloccata' ? 'azione--bloccata' : '';
  return (
    <li className={`azione flex flex-wrap items-start gap-2 py-1.5 ${a.fatta ? 'opacity-60' : ''} ${classeStato} ${evidenziata ? 'azione--evidenziata' : ''}`} aria-current={evidenziata ? 'true' : undefined}>
      {/* il bersaglio è l'etichetta, non il quadratino: 44 px senza cambiarne l'aspetto */}
      {partitaId && <label className="touch flex items-start justify-center shrink-0 -my-1 pr-1 cursor-pointer"><input type="checkbox" className="w-5 h-5 mt-2 shrink-0" checked={a.fatta} disabled={occupato || bloccata} onChange={(e) => void cambia(e.target.checked)} aria-label={`Fatto: ${a.azione.slice(0, 60)}`} /></label>}
      <ImmagineAzione a={a} />
      <div className="flex flex-col gap-0.5 text-[13px] min-w-0 flex-1">
        <span className={a.fatta ? 'line-through' : ''}>{a.azione}{a.daRivedere && <>{' '}<DaRivedereVoce a={a} partitaId={partitaId} onCambiata={onCambiata} /></>}</span>
        <CartelliniAzione a={a} onSullaMappa={onSullaMappa && a.mappa ? () => onSullaMappa(a.mappa!, a.uid) : undefined}
          onApriMappa={onSullaMappa ? (m) => onSullaMappa(m, a.uid) : undefined} />
        {/* L3 (§4.4): il campo «Infiltrazioni» delle voci di Palazzo, accanto al cartellino del Palazzo */}
        <InfiltrazioniVoce a={a} partitaId={partitaId} onCambiata={onCambiata} />
        {chiediNote && <SceltaNote occupato={occupato} onScegli={(n) => void cambia(true, n ?? undefined, n === null)} onAnnulla={() => setChiediNote(false)} />}
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

  /**
   * Chiede conferma per eliminare la voce dalla guida. Se nella partita è spuntata con effetti, la scelta offerta toglie
   * prima la spunta e poi elimina, con un messaggio che dice com'è andata se l'eliminazione fallisce dopo la spunta tolta;
   * altrimenti è una conferma semplice, col nome giusto per azione, evento, scadenza o promemoria.
   */
  const elimina = (v: AzionePercorsoDto) => {
    /** L'eliminazione vera e propria della voce dalla guida. */
    const via = () => eliminaVoceGiornata(v.uid);
    // spuntata con effetti in questa partita: prima si toglie la spunta (punti del Confidente e turni tornano indietro; le Doti le
    // segna l'utente), altrimenti gli effetti resterebbero senza la spunta da cui disfarli. Il server rifiuta comunque, e dice dove,
    // se la voce è spuntata con effetti in un'altra partita.
    if (partitaId && v.fatta && v.effetti) {
      chiedi({
        titolo: 'Eliminare una voce già spuntata?',
        testo: <>In questa partita «{v.azione}» è spuntata (<strong>{descriviEffetti(v.effetti)}</strong>). Eliminandola si toglie prima la spunta (punti del Confidente e turni vengono annullati; le Doti restano come le hai segnate tu, letture e visioni restano); poi la voce esce dalla guida per tutte le partite e non si può recuperare.</>,
        scelte: [{
          titolo: 'Togli la spunta ed elimina', tono: 'pericolo', icona: 'elimina', ok: 'Spunta tolta, punti annullati e voce eliminata dalla guida.',
          esegui: async () => {
            await impostaAzionePercorso(partitaId, v.uid, false);
            // la spunta è già tolta: se l'eliminazione non riesce (spuntata con effetti in un'altra partita) si dice tutto com'è
            try { await via(); } catch (err) {
              throw new Error(`Spunta tolta e punti annullati in questa partita, ma la voce non è stata eliminata: ${err instanceof Error ? err.message : 'errore del server.'}`, { cause: err });
            }
          },
        }],
      });
      return;
    }
    const che = { azione: ['la voce', 'Voce eliminata'], evento: ['l\'evento', 'Evento eliminato'], scadenza: ['la scadenza', 'Scadenza eliminata'], promemoria: ['il promemoria', 'Promemoria eliminato'] }[v.genere];
    chiedi({
      titolo: `Eliminare ${che[0]}?`,
      testo: <>«{v.azione}» esce dalla guida per tutte le partite: non si può recuperare.</>,
      scelte: [{ titolo: 'Elimina', tono: 'pericolo', icona: 'elimina', esegui: via, ok: `${che[1]} dalla guida.` }],
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
                ? <VoceEvento key={v.uid} e={v} gesti={gesti(v, i, voci.length)} occupato={occupato} {...menuDi(v.uid)} />
                : <Azione key={v.uid} a={v} partitaId={partitaId} onCambiata={onAggiorna} onSullaMappa={onSullaMappa} evidenziata={azioneEvidenziata === v.uid}
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
