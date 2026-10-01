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
// ============================================================

import { useState, type ReactNode } from 'react';
import { aggiornaVoceGiornata, eliminaVoceGiornata, impostaAzionePercorso, spostaVoceGiornata } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { avvisoSpunta, descriviEffetti } from '../../utils/percorso';
import { dotiDaSegnareDaEffetti } from '../../utils/dotiDaSegnare';
import type { AzionePercorsoDto, FasciaGioco, GenereVoce, PercorsoGiornoDto } from '../../types';
import { DataP5 } from '../shared/DataP5';
import { MeteoIcona } from './MeteoIcona';
import { FasciaGiornata, IconaFascia } from './FasciaGiornata';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { Modal } from '../shared/Modal';
import { useSuggerimentiStore } from '../../stores/suggerimentiStore';
import { GestiVoce, PulsanteMenuVoce, type GestoVoce } from './MenuVoce';
import { ModuloVoceGiornata, type SoggettoVoce } from './ModuloVoceGiornata';
import { VoceEvento } from './VociAgenda';
import { CartelliniAzione, ImmagineAzione, SceltaNote } from './PartiAzione';
import { chiedeNote } from '../../utils/azioneStrutturata';
import { seGiornoAvanzato } from '../../utils/giornoAvanzato';

const altraFascia = (f: FasciaGioco): FasciaGioco => (f === 'giorno' ? 'sera' : 'giorno');
const nomeFascia = (f: FasciaGioco) => (f === 'giorno' ? 'di giorno' : 'di sera');
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
        <span className={a.fatta ? 'line-through' : ''}>{a.azione}</span>
        <CartelliniAzione a={a} onSullaMappa={onSullaMappa && a.mappa ? () => onSullaMappa(a.mappa!, a.uid) : undefined} />
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
  const partita = partitaId ?? undefined;
  // la chiave del menu porta il giorno: cambiando giorno nessun menu resta aperto su una voce che non c'è più
  const chiaveMenu = (uid: string) => `${g.giorno}/${uid}`;
  const menuDi = (uid: string) => ({ menuAperto: menu === chiaveMenu(uid), onMenu: (aperto: boolean) => setMenu(aperto ? chiaveMenu(uid) : null) });

  // aprire la finestra o la conferma chiude il menu della voce: tornando alla lista la riga è di nuovo com'era
  const apri = (s: SoggettoVoce) => { setMenu(null); setSoggetto(s); };
  const chiedi = (c: Conferma) => { setMenu(null); setConferma(c); };

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

  const elimina = (v: AzionePercorsoDto) => {
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

  const sezione = (f: FasciaGioco) => {
    const voci = g.azioni.filter((a) => a.fascia === f);
    const daFare = voci.filter((a) => a.genere === 'azione');
    const fatte = daFare.filter((a) => a.fatta).length;
    return (
      <section key={f} className={`card flex flex-col gap-1 ${fasciaCorrente === f ? 'card--adesso' : ''}`} aria-current={fasciaCorrente === f ? 'true' : undefined} aria-label={f === 'giorno' ? 'Di giorno' : 'Di sera'}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <FasciaGiornata fascia={f} attiva={fasciaCorrente === f} dettaglio={partitaId && daFare.length > 0 ? `${fatte} su ${daFare.length}` : undefined} />
          <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi" disabled={occupato} onClick={() => apri({ tipo: 'nuova', fascia: f })} aria-label={`Aggiungi ${nomeFascia(f)}`} />
        </div>
        {voci.length === 0
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
      {sezione('giorno')}
      {sezione('sera')}
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
